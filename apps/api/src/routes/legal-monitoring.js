import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import { requirePocketBaseUser } from '../middleware/pocketbase-user.js';
import {
  calculateProceduralDeadline,
  datesForDjenDailyWindow,
  fetchDatajudProcess,
  fetchDjenByOab,
  fetchDjenProcessMetadata,
  normalizeCnj,
  toPocketBaseDate,
} from '../utils/legalMonitoring.js';

const router = Router();
router.use(requirePocketBaseUser);

function userCanAccess(record, user) {
  return user?.role === 'owner' || record?.responsible === user?.id || record?.responsible_user === user?.id;
}

function filterValue(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function publicationTriage(process) {
  return process ? 'revisao' : 'pendente_vinculo';
}

async function holidaysFor({ userId, tribunal = '', comarca = '' }) {
  try {
    const rows = await pb.collection('court_holidays').getFullList({ sort: 'date' });
    return rows.filter((h) => {
      if (h.active === false) return false;
      if (h.responsible_user && h.responsible_user !== userId) return false;
      if (h.scope === 'tribunal' && h.tribunal && String(h.tribunal).toUpperCase() !== String(tribunal).toUpperCase()) return false;
      if (h.scope === 'comarca' && h.comarca && String(h.comarca).toLowerCase() !== String(comarca).toLowerCase()) return false;
      return true;
    }).map((h) => h.date);
  } catch {
    return [];
  }
}

async function matchProcess(user, processNumber) {
  if (!processNumber) return null;
  const target = String(processNumber).replace(/\D/g, '');
  if (!target) return null;
  try {
    const rows = await pb.collection('processes').getFullList({ fields: 'id,number,responsible,client,comarca,vara,tribunal' });
    return rows.find((p) => String(p.number || '').replace(/\D/g, '') === target && userCanAccess(p, user)) || null;
  } catch {
    return null;
  }
}

router.get('/datajud/process/:cnj', async (req, res, next) => {
  try {
    const [result, djenMeta] = await Promise.all([
      fetchDatajudProcess(req.params.cnj),
      fetchDjenProcessMetadata(req.params.cnj).catch(() => null),
    ]);
    if (result.found) {
      const pubs = await pb.collection('djen_publications').getFullList({ fields: 'number,process_number,parties,responsible_user' }).catch(() => []);
      const digits = result.cnjDigits;
      const partySet = new Set(djenMeta?.parties || []);
      pubs.filter((p) => (!p.responsible_user || p.responsible_user === req.authUser.id) && String(p.process_number || p.number || '').replace(/\D/g, '') === digits)
        .forEach((p) => String(p.parties || '').split('\n').map((s) => s.trim()).filter(Boolean).forEach((s) => partySet.add(s)));
      if (partySet.size) {
        result.parties = [...partySet];
        result.partiesSource = 'djen';
        result.partiesUnavailableReason = '';
      }
      if (!result.tribunal && djenMeta?.tribunal) result.tribunal = djenMeta.tribunal;
      if (!result.courtUnit && djenMeta?.courtUnit) result.courtUnit = djenMeta.courtUnit;
      if (!result.class && djenMeta?.className) result.class = djenMeta.className;
      result.djenPublicationsFound = Number(djenMeta?.count || 0);
    }
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/datajud/import', async (req, res, next) => {
  try {
    const { processId, cnj } = req.body || {};
    if (!processId || !cnj) return res.status(400).json({ error: 'processId e cnj são obrigatórios.' });
    const process = await pb.collection('processes').getOne(processId);
    if (!userCanAccess(process, req.authUser)) return res.status(403).json({ error: 'Sem acesso a este processo.' });
    const result = await fetchDatajudProcess(cnj);
    if (!result.found) return res.status(404).json({ error: 'Processo não localizado no DataJud.', result });

    const summaryParts = [result.class, result.subjects?.length ? `Assuntos: ${result.subjects.join(', ')}` : '', result.parties?.length ? `Partes: ${result.parties.join('; ')}` : ''].filter(Boolean);
    await pb.collection('processes').update(process.id, {
      number: result.cnj,
      tribunal: result.tribunal || process.tribunal || '',
      vara: result.courtUnit || process.vara || '',
      parties: result.parties?.join('\n') || process.parties || '',
      datajud_synced_at: new Date().toISOString(),
      summary: process.summary || summaryParts.join('\n'),
    });

    const existing = await pb.collection('events').getFullList({ filter: `process = "${process.id}"`, fields: 'external_id' }).catch(() => []);
    const seen = new Set(existing.map((e) => e.external_id).filter(Boolean));
    const pendingMovements = result.movements.slice(0, 500).filter((mov) => !seen.has(mov.externalId));
    let imported = 0;
    let cursor = 0;
    const concurrency = Math.min(12, Math.max(1, pendingMovements.length));
    const workers = Array.from({ length: concurrency }, async () => {
      while (cursor < pendingMovements.length) {
        const index = cursor;
        cursor += 1;
        const mov = pendingMovements[index];
        const descriptionBits = [mov.code ? `Código CNJ ${mov.code}` : '', mov.courtUnit || '', mov.complements?.length ? JSON.stringify(mov.complements) : ''].filter(Boolean);
        try {
          await pb.collection('events').create({
            process: process.id,
            date: mov.date || new Date().toISOString(),
            title: mov.name || 'Movimentação processual',
            description: descriptionBits.join(' · '),
            type: 'andamento',
            source: 'datajud',
            external_id: mov.externalId,
          });
          imported += 1;
        } catch (error) {
          // Corrida ou reimportação simultânea: o índice único é a última barreira contra duplicidade.
          if (!String(error?.message || '').toLowerCase().includes('unique')) throw error;
        }
      }
    });
    await Promise.all(workers);
    res.json({ ok: true, imported, totalAvailable: result.movements.length, process: result });
  } catch (error) { next(error); }
});

router.post('/deadline/calculate', async (req, res, next) => {
  try {
    const { availabilityDate, days, regime = 'cpc', tribunal = '', comarca = '' } = req.body || {};
    const holidays = await holidaysFor({ userId: req.authUser.id, tribunal, comarca });
    res.json(calculateProceduralDeadline({ availabilityDate, days: Number(days), regime, holidays }));
  } catch (error) { next(error); }
});

router.post('/djen/sync', async (req, res, next) => {
  try {
    const user = req.authUser;
    const oab = String(user?.oab_number || '').trim();
    const uf = String(user?.oab_uf || '').trim().toUpperCase();
    if (!oab || !uf) return res.status(400).json({ error: 'Cadastre sua OAB e UF no usuário antes da sincronização.' });
    const window = datesForDjenDailyWindow();
    const startDate = req.body?.startDate || '2010-01-01';
    const endDate = req.body?.endDate || window.endDate;
    const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value));
    if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) {
      return res.status(400).json({ error: 'Informe um período válido entre duas datas no formato AAAA-MM-DD.' });
    }
    let items;
    try {
      items = await fetchDjenByOab({ oab, uf, startDate, endDate, maxItems: req.body?.maxItems });
    } catch (error) {
      const upstream = new Error(
        String(error?.message || '').startsWith('DJEN respondeu')
          ? error.message
          : 'Não foi possível acessar o serviço do DJEN/CNJ. Verifique a conexão do servidor e tente novamente.',
        { cause: error },
      );
      const sourceStatus = Number(error?.sourceStatus || error?.statusCode || 0);
      upstream.statusCode = sourceStatus === 503 ? 503 : 502;
      upstream.code = error?.code || 'DJEN_SOURCE_UNREACHABLE';
      upstream.retryable = error?.retryable !== false;
      upstream.sourceStatus = sourceStatus || null;
      throw upstream;
    }
    const saved = [];
    for (const item of items) {
      const process = await matchProcess(user, item.processNumber);
      let calc = null;
      if (item.actionRequired !== 'nao' && item.deadlineDays && item.availabilityDate) {
        const holidays = await holidaysFor({ userId: user.id, tribunal: item.tribunal, comarca: process?.comarca || '' });
        calc = calculateProceduralDeadline({ availabilityDate: item.availabilityDate, days: item.deadlineDays, regime: item.regime, holidays });
      }
      const payload = {
        process: process?.id || '',
        number: item.processNumber || '',
        parties: item.parties.join('\n'),
        court: item.tribunal || '',
        published_at: calc?.publicationDate ? toPocketBaseDate(calc.publicationDate) : toPocketBaseDate(item.availabilityDate),
        summary: item.summary,
        raw: String(item.rawText || '').slice(0, 5000),
        status: item.actionRequired === 'nao' ? 'ignorado' : (process ? 'associado' : 'pendente'),
        deadline: calc?.deadlineDate ? toPocketBaseDate(calc.deadlineDate, '18:00:00') : '',
        external_id: item.externalId,
        source_hash: item.hash,
        tribunal: item.tribunal,
        orgao: item.courtUnit,
        process_number: item.processNumber,
        availability_date: toPocketBaseDate(item.availabilityDate),
        publication_date: calc?.publicationDate ? toPocketBaseDate(calc.publicationDate) : '',
        action_required: item.actionRequired,
        action_reason: item.actionReason,
        urgency: item.urgency,
        deadline_days: item.deadlineDays || 0,
        deadline_kind: item.deadlineKind,
        regime: item.regime,
        deadline_status: calc ? 'rascunho' : 'sem_prazo',
        responsible_user: user.id,
        link: item.link,
        cancelled: item.cancelled,
        cancel_reason: item.cancelReason,
        process_match_status: process ? 'encontrado' : 'nao_encontrado',
        triage_status: publicationTriage(process),
        movement_status: process ? 'pendente' : 'nao_aplicavel',
      };
      let record = null;
      const escapedId = filterValue(item.externalId);
      const existing = await pb.collection('djen_publications').getList(1, 1, { filter: `responsible_user = "${user.id}" && external_id = "${escapedId}"` }).then((r) => r.items[0]).catch(() => null);
      if (existing) {
        // Uma nova consulta atualiza o teor, mas nunca desfaz uma decisão já aprovada.
        if (['aprovado', 'concluido', 'ignorado'].includes(existing.triage_status)) payload.triage_status = existing.triage_status;
        if (existing.movement_status === 'aprovado') payload.movement_status = existing.movement_status;
        if (existing.movement_event_id) payload.movement_event_id = existing.movement_event_id;
        if (existing.deadline_id) payload.deadline_id = existing.deadline_id;
        if (existing.appointment_id) payload.appointment_id = existing.appointment_id;
      }
      try {
        if (existing) record = await pb.collection('djen_publications').update(existing.id, payload);
        else record = await pb.collection('djen_publications').create(payload);
      } catch (error) {
        const data = error?.response?.data || error?.data || error?.response;
        const fields = data && typeof data === 'object'
          ? Object.entries(data).map(([field, detail]) => `${field}: ${detail?.message || detail}`).join('; ')
          : '';
        const rawDetail = fields || (data ? JSON.stringify(data) : '');
        const wrapped = new Error(rawDetail ? `Falha ao salvar publicação DJEN — ${rawDetail}` : error.message, { cause: error });
        wrapped.statusCode = 400;
        throw wrapped;
      }
      saved.push(record);
    }
    res.json({ ok: true, startDate, endDate, found: items.length, saved: saved.length });
  } catch (error) { next(error); }
});

router.post('/djen/:id/recalculate', async (req, res, next) => {
  try {
    const pub = await pb.collection('djen_publications').getOne(req.params.id, { expand: 'process' });
    if (!userCanAccess(pub, req.authUser)) return res.status(403).json({ error: 'Sem acesso a esta publicação.' });
    const days = Number(req.body?.days || pub.deadline_days);
    const regime = req.body?.regime || pub.regime || 'cpc';
    const availabilityDate = req.body?.availabilityDate || pub.availability_date;
    const process = pub.expand?.process || null;
    const holidays = await holidaysFor({ userId: req.authUser.id, tribunal: pub.tribunal, comarca: process?.comarca || '' });
    const calc = calculateProceduralDeadline({ availabilityDate, days, regime, holidays });
    const updated = await pb.collection('djen_publications').update(pub.id, {
      deadline_days: days,
      regime,
      publication_date: toPocketBaseDate(calc.publicationDate),
      deadline: toPocketBaseDate(calc.deadlineDate, '18:00:00'),
      deadline_status: 'rascunho',
      action_required: 'sim',
      status: pub.process ? 'associado' : 'pendente',
      triage_status: pub.process ? 'revisao' : 'pendente_vinculo',
      process_match_status: pub.process ? 'encontrado' : 'nao_encontrado',
      movement_status: pub.process ? (pub.movement_status || 'pendente') : 'nao_aplicavel',
    });
    res.json({ ok: true, calculation: calc, publication: updated });
  } catch (error) { next(error); }
});

async function processForPublication(pub, user, requestedProcessId = '') {
  const processId = requestedProcessId || pub.process;
  if (!processId) return null;
  const process = pub.expand?.process?.id === processId
    ? pub.expand.process
    : await pb.collection('processes').getOne(processId);
  if (!userCanAccess(process, user)) {
    const error = new Error('Sem acesso ao processo selecionado.');
    error.statusCode = 403;
    throw error;
  }
  return process;
}

async function findDjenEvent(processId, externalId) {
  if (!processId || !externalId) return null;
  return pb.collection('events').getList(1, 1, {
    filter: `process = "${filterValue(processId)}" && source = "djen" && external_id = "${filterValue(externalId)}"`,
  }).then((r) => r.items[0] || null).catch(() => null);
}

async function findDjenDeadline(publicationId) {
  if (!publicationId) return null;
  return pb.collection('deadlines').getList(1, 1, {
    filter: `djen_publication = "${filterValue(publicationId)}"`,
  }).then((r) => r.items[0] || null).catch(() => null);
}

async function approveDjenPublication({ pub, user, processId = '', movement = false, deadline = false, days, regime }) {
  if (!movement && !deadline && !processId) {
    const error = new Error('Selecione movimentação, prazo ou um processo para vincular.');
    error.statusCode = 400;
    throw error;
  }
  const process = await processForPublication(pub, user, processId);
  if ((movement || deadline) && !process) {
    const error = new Error('Associe esta publicação a um processo cadastrado antes de aprovar a ação.');
    error.statusCode = 400;
    throw error;
  }

  let current = pub;
  if (process && pub.process !== process.id) {
    current = await pb.collection('djen_publications').update(pub.id, {
      process: process.id,
      status: 'associado',
      process_match_status: 'manual',
      triage_status: 'revisao',
      movement_status: pub.movement_status || 'pendente',
    });
  }

  let movementRecord = null;
  if (movement) {
    movementRecord = await findDjenEvent(process.id, current.external_id);
    if (!movementRecord) {
      movementRecord = await pb.collection('events').create({
        process: process.id,
        date: current.publication_date || current.published_at || current.availability_date,
        title: `Publicação DJEN — ${current.process_number || current.number || 'Movimentação processual'}`,
        description: [current.summary || 'Publicação recebida do DJEN.', current.raw ? `Teor: ${current.raw}` : '', `Identificador DJEN: ${current.external_id || current.id}`].filter(Boolean).join('\n'),
        type: 'andamento',
        source: 'djen',
        external_id: current.external_id || current.id,
      });
    }
  }

  let calculation = null;
  let deadlineRecord = null;
  let appointment = null;
  if (deadline) {
    const deadlineDays = Number(days || current.deadline_days);
    if (!current.deadline) {
      if (!deadlineDays) {
        const error = new Error('Informe a quantidade de dias ou recalcule o prazo antes de aprovar.');
        error.statusCode = 400;
        throw error;
      }
      const holidays = await holidaysFor({ userId: user.id, tribunal: current.tribunal, comarca: process.comarca || '' });
      calculation = calculateProceduralDeadline({
        availabilityDate: current.availability_date || current.published_at,
        days: deadlineDays,
        regime: regime || current.regime || 'cpc',
        holidays,
      });
      current = await pb.collection('djen_publications').update(current.id, {
        deadline_days: deadlineDays,
        regime: regime || current.regime || 'cpc',
        publication_date: toPocketBaseDate(calculation.publicationDate),
        deadline: toPocketBaseDate(calculation.deadlineDate, '18:00:00'),
        deadline_status: 'rascunho',
      });
    }

    deadlineRecord = await findDjenDeadline(current.id);
    if (!deadlineRecord) {
      deadlineRecord = await pb.collection('deadlines').create({
        process: process.id,
        djen_publication: current.id,
        type: current.regime === 'clt' ? 'Prazo processual (CLT)' : 'Prazo processual (CPC)',
        days_kind: current.deadline_kind || 'uteis',
        days: Number(current.deadline_days) || deadlineDays || 0,
        initial_date: current.publication_date || current.published_at || current.availability_date,
        calculated_date: current.deadline,
        confirmed_date: current.deadline,
        suspended: false,
        responsible_user: current.responsible_user || user.id,
        status: 'confirmado',
        notes: `Origem: DJEN ${current.external_id || current.id}`,
      });
    }

    const client = process.client || '';
    appointment = current.appointment_id
      ? await pb.collection('appointments').getOne(current.appointment_id).catch(() => null)
      : null;
    if (!appointment) {
      appointment = await pb.collection('appointments').getList(1, 1, {
        filter: `djen_publication = "${filterValue(current.id)}"`,
      }).then((r) => r.items[0] || null).catch(() => null);
    }
    if (!appointment) {
      appointment = await pb.collection('appointments').create({
        client,
        process: process.id,
        responsible: current.responsible_user || user.id,
        date: current.deadline,
        title: `Prazo — ${current.number || current.process_number || 'DJEN'}`,
        notes: `${current.summary || 'Prazo confirmado a partir de publicação do DJEN.'}\nPublicação DJEN: ${current.id}`,
        category: 'prazo',
        sync_gcal: false,
        authorized_client: false,
        djen_publication: current.id,
      });
    }
  }

  const update = {
    ...(process ? { process: process.id, status: 'associado', process_match_status: processId ? 'manual' : 'encontrado' } : {}),
    ...(movement ? { movement_status: 'aprovado', movement_event_id: movementRecord.id } : {}),
    ...(deadline ? { deadline_status: 'confirmado', deadline_id: deadlineRecord.id, appointment_id: appointment.id } : {}),
  };
  const movementDone = movement ? true : current.movement_status === 'aprovado';
  const deadlineDone = deadline ? true : current.deadline_status === 'confirmado';
  update.triage_status = movementDone || deadlineDone ? (movementDone && deadlineDone ? 'concluido' : 'aprovado') : 'revisao';
  const publication = await pb.collection('djen_publications').update(current.id, update);
  return { publication, process, movement: movementRecord, deadline: deadlineRecord, appointment, calculation };
}

router.post('/djen/:id/approve', async (req, res, next) => {
  try {
    const pub = await pb.collection('djen_publications').getOne(req.params.id, { expand: 'process' });
    if (!userCanAccess(pub, req.authUser)) return res.status(403).json({ error: 'Sem acesso a esta publicação.' });
    const result = await approveDjenPublication({
      pub,
      user: req.authUser,
      processId: req.body?.processId || '',
      movement: req.body?.movement === true,
      deadline: req.body?.deadline === true,
      days: req.body?.days,
      regime: req.body?.regime,
    });
    res.json({ ok: true, ...result });
  } catch (error) { next(error); }
});

router.post('/djen/:id/confirm', async (req, res, next) => {
  try {
    const pub = await pb.collection('djen_publications').getOne(req.params.id, { expand: 'process' });
    if (!userCanAccess(pub, req.authUser)) return res.status(403).json({ error: 'Sem acesso a esta publicação.' });
    const result = await approveDjenPublication({ pub, user: req.authUser, deadline: true });
    res.json({ ok: true, appointment: result.appointment, deadline: result.deadline, publication: result.publication });
  } catch (error) { next(error); }
});

router.post('/djen/:id/ignore', async (req, res, next) => {
  try {
    const pub = await pb.collection('djen_publications').getOne(req.params.id);
    if (!userCanAccess(pub, req.authUser)) return res.status(403).json({ error: 'Sem acesso a esta publicação.' });
    const updated = await pb.collection('djen_publications').update(pub.id, { action_required: 'nao', deadline_status: 'sem_prazo', deadline: '', status: 'ignorado' });
    res.json({ ok: true, publication: updated });
  } catch (error) { next(error); }
});

export default router;
