import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import {
  calculateProceduralDeadline,
  datesForDjenDailyWindow,
  fetchDjenByOab,
  saoPauloDateParts,
  toPocketBaseDate,
} from '../utils/legalMonitoring.js';

let lastCompletedDate = '';
let running = false;
let interval = null;

function canSeeProcess(process, user) {
  return user?.role === 'owner' || process?.responsible === user?.id;
}

async function matchProcess(user, number) {
  const target = String(number || '').replace(/\D/g, '');
  if (!target) return null;
  const rows = await pb.collection('processes').getFullList({ fields: 'id,number,responsible,client,comarca,tribunal' }).catch(() => []);
  return rows.find((p) => canSeeProcess(p, user) && String(p.number || '').replace(/\D/g, '') === target) || null;
}

async function getHolidays(userId, tribunal, comarca) {
  const rows = await pb.collection('court_holidays').getFullList({ fields: 'date,scope,tribunal,comarca,active,responsible_user' }).catch(() => []);
  return rows.filter((h) => {
    if (h.active === false) return false;
    if (h.responsible_user && h.responsible_user !== userId) return false;
    if (h.scope === 'tribunal' && h.tribunal && String(h.tribunal).toUpperCase() !== String(tribunal || '').toUpperCase()) return false;
    if (h.scope === 'comarca' && h.comarca && String(h.comarca).toLowerCase() !== String(comarca || '').toLowerCase()) return false;
    return true;
  }).map((h) => h.date);
}

async function persistForUser(user, item) {
  const process = await matchProcess(user, item.processNumber);
  let calc = null;
  if (item.actionRequired !== 'nao' && item.deadlineDays && item.availabilityDate) {
    const holidays = await getHolidays(user.id, item.tribunal, process?.comarca || '');
    calc = calculateProceduralDeadline({ availabilityDate: item.availabilityDate, days: item.deadlineDays, regime: item.regime, holidays });
  }
  const payload = {
    process: process?.id || '', number: item.processNumber || '', parties: item.parties.join('\n'), court: item.tribunal || '',
    published_at: calc?.publicationDate ? toPocketBaseDate(calc.publicationDate) : toPocketBaseDate(item.availabilityDate),
    summary: item.summary, raw: String(item.rawText || '').slice(0, 5000), status: item.actionRequired === 'nao' ? 'ignorado' : (process ? 'associado' : 'pendente'),
    deadline: calc?.deadlineDate ? toPocketBaseDate(calc.deadlineDate, '18:00:00') : '', external_id: item.externalId,
    source_hash: item.hash, tribunal: item.tribunal, orgao: item.courtUnit, process_number: item.processNumber,
    availability_date: toPocketBaseDate(item.availabilityDate), publication_date: calc?.publicationDate ? toPocketBaseDate(calc.publicationDate) : '',
    action_required: item.actionRequired, action_reason: item.actionReason, urgency: item.urgency, deadline_days: item.deadlineDays || 0, deadline_kind: item.deadlineKind,
    regime: item.regime, deadline_status: calc ? 'rascunho' : 'sem_prazo', responsible_user: user.id, link: item.link,
    cancelled: item.cancelled, cancel_reason: item.cancelReason,
  };
  const escaped = String(item.externalId).replace(/"/g, '\\"');
  const existing = await pb.collection('djen_publications').getList(1, 1, { filter: `responsible_user = "${user.id}" && external_id = "${escaped}"` }).then((r) => r.items[0]).catch(() => null);
  if (existing) return pb.collection('djen_publications').update(existing.id, payload);
  return pb.collection('djen_publications').create(payload);
}

export async function runDjenDailySync() {
  if (running) return;
  running = true;
  const today = saoPauloDateParts().date;
  try {
    const users = await pb.collection('users').getFullList({ fields: 'id,name,email,role,active,oab_number,oab_uf' });
    const eligible = users.filter((u) => u.active !== false && u.oab_number && u.oab_uf);
    const window = datesForDjenDailyWindow();
    let total = 0;
    for (const user of eligible) {
      try {
        const items = await fetchDjenByOab({ oab: user.oab_number, uf: user.oab_uf, ...window, maxItems: 500 });
        for (const item of items) await persistForUser(user, item);
        total += items.length;
      } catch (error) {
        logger.error(`DJEN daily sync failed for user ${user.id}:`, error);
      }
    }
    lastCompletedDate = today;
    logger.info(`DJEN daily sync completed: ${eligible.length} OAB(s), ${total} publication(s).`);
  } catch (error) {
    logger.error('DJEN daily sync failed:', error);
  } finally {
    running = false;
  }
}

async function checkSchedule() {
  if (String(process.env.DJEN_DAILY_SYNC || 'true').toLowerCase() === 'false') return;
  const local = saoPauloDateParts();
  const hour = Number(process.env.DJEN_SYNC_HOUR || 6);
  if (local.hour >= hour && lastCompletedDate !== local.date) await runDjenDailySync();
}

export function startDjenDailyScheduler() {
  if (String(process.env.DJEN_DAILY_SYNC || 'true').toLowerCase() === 'false') {
    logger.info('DJEN daily sync disabled by DJEN_DAILY_SYNC=false');
    return () => {};
  }
  setTimeout(() => { void checkSchedule(); }, 10000);
  interval = setInterval(() => { void checkSchedule(); }, 15 * 60 * 1000);
  interval.unref?.();
  logger.info(`DJEN daily sync enabled (after ${process.env.DJEN_SYNC_HOUR || 6}:00 America/Sao_Paulo).`);
  return () => { if (interval) clearInterval(interval); interval = null; };
}
