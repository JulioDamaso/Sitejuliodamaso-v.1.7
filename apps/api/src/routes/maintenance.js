import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { requirePocketBaseUser } from '../middleware/pocketbase-user.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';

const router = Router();
const SKIP_IMPORT = new Set(['users', 'clients']);

function requireAdmin(req, res, next) {
  if (!['owner', 'admin'].includes(req.authUser?.role)) return res.status(403).json({ error: 'Apenas administradores podem executar manutenção.' });
  return next();
}

router.use(requirePocketBaseUser, requireAdmin);

async function applicationCollections() {
  const all = await pocketbaseClient.collections.getFullList({ sort: 'name' });
  return all.filter((collection) => !String(collection.name).startsWith('_'));
}

function cleanRecord(record) {
  const copy = { ...record };
  delete copy.collectionId;
  delete copy.collectionName;
  delete copy.expand;
  return copy;
}

router.get('/version', async (req, res, next) => {
  try {
    const root = path.resolve(process.cwd(), '../..');
    const version = (await fs.readFile(path.join(root, '.version'), 'utf8').catch(() => 'dev')).trim();
    res.json({ version: version || 'dev', backupFormat: 'jd-office-backup-v1' });
  } catch (error) { next(error); }
});

router.get('/export', async (req, res, next) => {
  try {
    const collections = [];
    for (const collection of await applicationCollections()) {
      // Auth collections such as clients can reject sorting by autodate fields;
      // the default collection order is sufficient for a portable snapshot.
      const records = await pocketbaseClient.collection(collection.name).getFullList(500);
      collections.push({ name: collection.name, type: collection.type, records: records.map(cleanRecord) });
    }
    const payload = {
      format: 'jd-office-backup-v1',
      exportedAt: new Date().toISOString(),
      includes: 'Registros das coleções da aplicação; anexos e credenciais devem ser preservados pelo backup físico de pb_data.',
      collections,
    };
    const filename = `jd-office-export-${new Date().toISOString().slice(0, 10)}.json`;
    res.attachment(filename).type('application/json').send(JSON.stringify(payload, null, 2));
  } catch (error) { next(error); }
});

router.post('/import', async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload || payload.format !== 'jd-office-backup-v1' || !Array.isArray(payload.collections)) {
      return res.status(422).json({ error: 'Arquivo de backup inválido ou incompatível.' });
    }
    const existingCollections = new Set((await applicationCollections()).map((collection) => collection.name));
    const result = { created: 0, updated: 0, skipped: 0, skippedAuth: 0, errors: [] };
    const pending = payload.collections.flatMap((group) => (group.records || []).map((record) => ({ collection: group.name, record })));
    const maxPasses = 3;
    for (let pass = 0; pass < maxPasses && pending.length; pass += 1) {
      let progress = 0;
      for (let i = pending.length - 1; i >= 0; i -= 1) {
        const item = pending[i];
        if (!existingCollections.has(item.collection)) { result.skipped += 1; pending.splice(i, 1); continue; }
        if (SKIP_IMPORT.has(item.collection)) { result.skippedAuth += 1; pending.splice(i, 1); continue; }
        const service = pocketbaseClient.collection(item.collection);
        const data = { ...item.record };
        delete data.expand;
        try {
          let current = null;
          try { current = await service.getOne(data.id); } catch (_) {}
          if (current) {
            delete data.id;
            delete data.created;
            delete data.updated;
            await service.update(current.id, data);
            result.updated += 1;
          } else {
            await service.create(data);
            result.created += 1;
          }
          pending.splice(i, 1);
          progress += 1;
        } catch (error) {
          if (pass === maxPasses - 1) {
            result.errors.push({ collection: item.collection, id: item.record?.id, message: error?.message || 'Falha ao importar' });
            pending.splice(i, 1);
          }
        }
      }
      if (!progress) break;
    }
    result.skipped += pending.length;
    res.json({ ...result, message: 'Importação concluída. Coleções de autenticação foram preservadas e devem ser migradas pelo backup físico do pb_data.' });
  } catch (error) { next(error); }
});

export default router;
