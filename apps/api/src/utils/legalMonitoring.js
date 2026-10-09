import crypto from 'node:crypto';

const DEFAULT_DJEN_BASE_URL = 'https://comunicaapi.pje.jus.br/api/v1';
const DEFAULT_DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br';

const STATE_BY_CODE = {
  '01': 'ac', '02': 'al', '03': 'ap', '04': 'am', '05': 'ba', '06': 'ce', '07': 'df',
  '08': 'es', '09': 'go', '10': 'ma', '11': 'mt', '12': 'ms', '13': 'mg', '14': 'pa',
  '15': 'pb', '16': 'pr', '17': 'pe', '18': 'pi', '19': 'rj', '20': 'rn', '21': 'rs',
  '22': 'ro', '23': 'rr', '24': 'sc', '25': 'se', '26': 'sp', '27': 'to',
};

export function normalizeCnj(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 20) throw new Error('Número CNJ inválido: informe os 20 dígitos.');
  return digits;
}

export function formatCnj(value = '') {
  const d = normalizeCnj(value);
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

export function datajudAliasFromCnj(value = '') {
  const d = normalizeCnj(value);
  const segment = d.slice(13, 14);
  const tribunalCode = d.slice(14, 16);
  const n = Number(tribunalCode);

  if (segment === '8' && STATE_BY_CODE[tribunalCode]) return tribunalCode === '07' ? 'tjdft' : `tj${STATE_BY_CODE[tribunalCode]}`;
  if (segment === '4' && n >= 1 && n <= 6) return `trf${n}`;
  if (segment === '5') return tribunalCode === '00' ? 'tst' : (n >= 1 && n <= 24 ? `trt${n}` : null);
  if (segment === '6') return tribunalCode === '00' ? 'tse' : (STATE_BY_CODE[tribunalCode] ? `tre-${tribunalCode === '07' ? 'dft' : STATE_BY_CODE[tribunalCode]}` : null);
  if (segment === '3') return 'stj';
  if (segment === '1') return null; // STF não está entre os aliases publicados da API Pública do DataJud
  if (segment === '7') return 'stm';
  if (segment === '9') {
    if (tribunalCode === '13') return 'tjmmg';
    if (tribunalCode === '21') return 'tjmrs';
    if (tribunalCode === '26') return 'tjmsp';
  }
  return null;
}

function safeJson(value) {
  try { return JSON.stringify(value); } catch { return '{}'; }
}

function pick(obj, keys, fallback = '') {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function cleanText(value = '') {
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function toDateOnly(value) {
  if (!value) return '';
  const s = String(value);
  const iso = s.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  const br = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

export function toPocketBaseDate(value, hour = '12:00:00') {
  const d = toDateOnly(value);
  return d ? `${d} ${hour}.000Z` : '';
}

export async function fetchDatajudProcess(cnjValue, { signal } = {}) {
  const cnj = normalizeCnj(cnjValue);
  const alias = datajudAliasFromCnj(cnj);
  if (!alias) throw new Error('Não foi possível identificar automaticamente o tribunal pelo número CNJ.');

  const key = String(process.env.DATAJUD_API_KEY || '').trim();
  if (!key) throw new Error('DATAJUD_API_KEY não configurada no servidor.');
  const authorization = /^APIKey\s/i.test(key) ? key : `APIKey ${key}`;
  const base = String(process.env.DATAJUD_BASE_URL || DEFAULT_DATAJUD_BASE_URL).replace(/\/$/, '');
  const response = await fetch(`${base}/api_publica_${alias}/_search`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({
      size: 20,
      query: { match: { numeroProcesso: cnj } },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`DataJud respondeu ${response.status}${body ? `: ${body.slice(0, 180)}` : ''}`);
  }
  const json = await response.json();
  const hits = json?.hits?.hits || [];
  if (!hits.length) return { found: false, cnj: formatCnj(cnj), alias, movements: [] };

  const sources = hits.map((h) => h?._source || {}).filter(Boolean)
    .sort((a, b) => String(b?.dataHoraUltimaAtualizacao || '').localeCompare(String(a?.dataHoraUltimaAtualizacao || '')));
  const primary = sources[0] || {};
  const movementMap = new Map();
  for (const source of sources) {
    for (const mov of Array.isArray(source.movimentos) ? source.movimentos : []) {
      const courtUnit = pick(mov?.orgaoJulgador, ['nome'], '');
      const keyMov = [mov?.dataHora || '', mov?.codigo || '', mov?.nome || '', courtUnit].join('|');
      if (!movementMap.has(keyMov)) {
        movementMap.set(keyMov, {
          externalId: crypto.createHash('sha256').update(keyMov || safeJson(mov)).digest('hex').slice(0, 32),
          code: mov?.codigo ?? '',
          name: mov?.nome || 'Movimentação processual',
          date: mov?.dataHora || '',
          courtUnit,
          complements: Array.isArray(mov?.complementosTabelados) ? mov.complementosTabelados : [],
          raw: mov,
        });
      }
    }
  }
  const movements = [...movementMap.values()]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 500);

  const courtUnit = primary?.orgaoJulgador || {};
  return {
    found: true,
    cnj: formatCnj(cnj),
    cnjDigits: cnj,
    alias,
    tribunal: primary?.tribunal || alias.toUpperCase(),
    degree: primary?.grau || '',
    secrecyLevel: primary?.nivelSigilo ?? null,
    filedAt: primary?.dataAjuizamento || '',
    lastUpdatedAt: primary?.dataHoraUltimaAtualizacao || '',
    system: primary?.sistema?.nome || primary?.sistema || '',
    format: primary?.formato?.nome || primary?.formato || '',
    class: primary?.classe?.nome || '',
    classCode: primary?.classe?.codigo ?? '',
    courtUnit: courtUnit?.nome || '',
    municipalityIbge: courtUnit?.codigoMunicipioIBGE || '',
    subjects: (Array.isArray(primary?.assuntos) ? primary.assuntos : []).map((a) => a?.nome).filter(Boolean),
    movements,
    parties: [],
    partiesSource: null,
    partiesUnavailableReason: 'A API Pública do DataJud resguarda os dados das partes; o sistema só preenche partes quando houver fonte autorizada, como publicação do DJEN já sincronizada.',
  };
}

function arrayFromDjenPayload(json) {
  if (Array.isArray(json)) return json;
  for (const key of ['items', 'content', 'comunicacoes', 'comunicacoesProcessuais', 'data', 'result']) {
    if (Array.isArray(json?.[key])) return json[key];
  }
  return [];
}

function djenTotal(json, fallback) {
  for (const key of ['total', 'totalElements', 'count', 'quantidade', 'totalRegistros']) {
    const n = Number(json?.[key]);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeLawyer(entry) {
  const advogado = entry?.advogado || entry || {};
  return {
    name: pick(advogado, ['nome', 'name'], ''),
    oab: String(pick(advogado, ['numero_oab', 'numeroOab', 'oab'], '')).replace(/\D/g, ''),
    uf: String(pick(advogado, ['uf_oab', 'ufOab', 'uf'], '')).toUpperCase(),
  };
}

function extractDeadlineDays(text) {
  const candidates = [
    /prazo(?:\s+processual)?(?:\s+de)?\s*(\d{1,3})\s*dias?\s*(?:úteis|uteis)?/i,
    /no prazo de\s*(\d{1,3})\s*dias?/i,
    /em\s*(\d{1,3})\s*dias?\s*(?:úteis|uteis)/i,
  ];
  for (const re of candidates) {
    const m = text.match(re);
    if (m) {
      const days = Number(m[1]);
      if (days >= 1 && days <= 365) return days;
    }
  }
  return null;
}

function summarizePublication(text) {
  const clean = cleanText(text);
  if (!clean) return 'Publicação recebida do DJEN.';
  const action = clean.match(/.{0,150}\b(?:intimad[oa]s?|cite-se|citação|manifest(?:e|ar)|contestar|recorrer|contrarrazões|pagar|cumprir|comparecer|apresentar|impugnar|embargos?|prazo)\b.{0,220}/i)?.[0];
  const base = action || clean;
  return base.length > 440 ? `${base.slice(0, 437).trim()}…` : base;
}

function classifyPublication(raw, { oab, uf }) {
  const text = cleanText(pick(raw, ['texto', 'text', 'conteudo', 'teor'], ''));
  const cancelled = Boolean(pick(raw, ['cancelado', 'cancelled'], false)) || /cancelad[oa]/i.test(String(pick(raw, ['status'], '')));
  const lawyersRaw = pick(raw, ['destinatarioadvogados', 'destinatarioAdvogados', 'advogados'], []);
  const lawyers = Array.isArray(lawyersRaw) ? lawyersRaw.map(normalizeLawyer) : [];
  const targetOab = String(oab || '').replace(/\D/g, '');
  const targetUf = String(uf || '').toUpperCase();
  const exactLawyerMatch = lawyers.some((l) => l.oab === targetOab && (!targetUf || !l.uf || l.uf === targetUf));
  // A consulta do endpoint já é filtrada por OAB; ausência da lista de advogados não deve virar falso negativo.
  const targeted = exactLawyerMatch || lawyers.length === 0;
  const explicitAction = /\b(intimad[oa]s?|cite-se|cita(?:ção|do|da)|manifest(?:e|ar|ação)|contestar|contestação|recorrer|recurso|contrarrazões|pagar|pagamento|cumprir|comparecer|apresentar|impugnar|impugnação|embargos?|prazo)\b/i.test(text);
  const merelyAdverse = /\b(parte\s+adversa|requerid[oa]|executad[oa]|reclamad[oa])\b.{0,80}\b(?:intimad[oa]|deverá|prazo)\b/i.test(text)
    && !/\b(seu|sua)\s+(?:advogad[oa]|procurador)|advogad[oa]\s+da\s+(?:parte\s+autora|requerente|exequente|reclamante)/i.test(text);
  let actionRequired = 'revisar';
  let actionReason = 'A publicação exige conferência humana antes de gerar prazo.';
  if (cancelled) {
    actionRequired = 'nao';
    actionReason = 'A comunicação está marcada como cancelada.';
  } else if (!targeted) {
    actionRequired = 'nao';
    actionReason = 'A OAB monitorada não foi identificada entre os advogados destinatários.';
  } else if (merelyAdverse) {
    // Conservador: não cria prazo automático, mas mantém a publicação para revisão humana.
    actionRequired = 'revisar';
    actionReason = 'O texto aparenta direcionar o comando/prazo à parte adversa; nenhum prazo é criado automaticamente.';
  } else if (explicitAction) {
    actionRequired = 'sim';
    actionReason = 'A OAB monitorada é destinatária e o texto contém linguagem típica de intimação/comando processual.';
  }

  const days = (actionRequired === 'nao' || merelyAdverse) ? null : extractDeadlineDays(text);
  const tribunal = String(pick(raw, ['siglaTribunal', 'sigla_tribunal', 'tribunal'], '')).toUpperCase();
  const regime = /^TRT|^TST/.test(tribunal) || /\b(?:justiça|justica)\s+do\s+trabalho|\bCLT\b/i.test(text) ? 'clt' : 'cpc';
  const urgency = actionRequired === 'sim' && days && days <= 2 ? 'alta' : actionRequired === 'sim' && days && days <= 5 ? 'media' : 'normal';

  return { text, lawyers, targeted, actionRequired, actionReason, days, regime, urgency, cancelled };
}

function normalizeDjenPublication(raw, ctx) {
  const cls = classifyPublication(raw, ctx);
  const recipientsRaw = pick(raw, ['destinatarios', 'recipients'], []);
  const recipients = Array.isArray(recipientsRaw)
    ? recipientsRaw.map((r) => ({ name: pick(r, ['nome', 'name'], ''), pole: pick(r, ['polo', 'pole'], '') })).filter((r) => r.name)
    : [];
  const processNumber = pick(raw, ['numeroprocessocommascara', 'numeroProcessoComMascara', 'numero_processo', 'numeroProcesso'], '');
  const id = String(pick(raw, ['id', 'hash', 'uuid'], '') || crypto.createHash('sha256').update(safeJson(raw)).digest('hex'));
  const availability = toDateOnly(pick(raw, ['data_disponibilizacao', 'dataDisponibilizacao', 'dataDisponibilizacaoInicio'], ''));
  return {
    externalId: id,
    hash: String(pick(raw, ['hash'], '')),
    processNumber,
    tribunal: String(pick(raw, ['siglaTribunal', 'sigla_tribunal', 'tribunal'], '')).toUpperCase(),
    courtUnit: pick(raw, ['nomeOrgao', 'nome_orgao', 'orgao'], ''),
    className: pick(raw, ['nomeClasse', 'nome_classe', 'classe'], ''),
    communicationType: pick(raw, ['tipoComunicacao', 'tipo_comunicacao'], ''),
    documentType: pick(raw, ['tipoDocumento', 'tipo_documento'], ''),
    availabilityDate: availability,
    link: pick(raw, ['link', 'url'], ''),
    status: pick(raw, ['status'], ''),
    cancelReason: pick(raw, ['motivo_cancelamento', 'motivoCancelamento'], ''),
    recipients,
    lawyers: cls.lawyers,
    parties: recipients.map((r) => r.pole ? `${r.name} (${r.pole})` : r.name),
    summary: summarizePublication(cls.text),
    rawText: cls.text,
    targeted: cls.targeted,
    actionRequired: cls.actionRequired,
    actionReason: cls.actionReason,
    urgency: cls.urgency,
    deadlineDays: cls.days,
    deadlineKind: 'uteis',
    regime: cls.regime,
    cancelled: cls.cancelled,
    raw,
  };
}

export async function fetchDjenProcessMetadata(cnjValue, { signal } = {}) {
  const cnj = normalizeCnj(cnjValue);
  const base = String(process.env.DJEN_BASE_URL || DEFAULT_DJEN_BASE_URL).replace(/\/$/, '');
  const endpoint = base.endsWith('/api/v1') ? `${base}/comunicacao` : `${base}/api/v1/comunicacao`;
  const qs = new URLSearchParams({
    numeroProcesso: cnj,
    pagina: '1',
    itensPorPagina: '50',
  });
  const response = await fetch(`${endpoint}?${qs.toString()}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`DJEN respondeu ${response.status}${body ? `: ${body.slice(0, 180)}` : ''}`);
  }
  const json = await response.json();
  const items = arrayFromDjenPayload(json);
  const parties = new Set();
  let tribunal = '';
  let courtUnit = '';
  let className = '';

  for (const raw of items) {
    tribunal ||= String(pick(raw, ['siglaTribunal', 'sigla_tribunal', 'tribunal'], '')).toUpperCase();
    courtUnit ||= pick(raw, ['nomeOrgao', 'nome_orgao', 'orgao'], '');
    className ||= pick(raw, ['nomeClasse', 'nome_classe', 'classe'], '');
    const recipientsRaw = pick(raw, ['destinatarios', 'recipients'], []);
    if (Array.isArray(recipientsRaw)) {
      recipientsRaw.forEach((r) => {
        const name = cleanText(pick(r, ['nome', 'name', 'nomeDestinatario'], ''));
        const pole = cleanText(pick(r, ['polo', 'pole'], ''));
        if (name) parties.add(pole ? `${name} (${pole})` : name);
      });
    }
    const singular = cleanText(pick(raw, ['nomeDestinatario', 'nome_destinatario'], ''));
    const singularPole = cleanText(pick(raw, ['poloDestinatario', 'polo_destinatario'], ''));
    if (singular) parties.add(singularPole ? `${singular} (${singularPole})` : singular);
  }

  return {
    found: items.length > 0,
    count: djenTotal(json, items.length),
    parties: [...parties],
    tribunal,
    courtUnit,
    className,
  };
}

export async function fetchDjenByOab({ oab, uf, startDate, endDate, maxItems = Number.POSITIVE_INFINITY, signal } = {}) {
  const cleanOab = String(oab || '').replace(/\D/g, '');
  const cleanUf = String(uf || '').trim().toUpperCase();
  if (!cleanOab || cleanUf.length !== 2) throw new Error('Cadastre número e UF da OAB antes de sincronizar o DJEN.');
  const base = String(process.env.DJEN_BASE_URL || DEFAULT_DJEN_BASE_URL).replace(/\/$/, '');
  const endpoint = base.endsWith('/api/v1') ? `${base}/comunicacao` : `${base}/api/v1/comunicacao`;
  const start = startDate || '2010-01-01';
  const end = endDate || saoPauloDateParts().date;
  const collected = [];
  const pageSize = 50;
  const requestedLimit = Number(maxItems);
  const maxPages = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.ceil(Math.max(1, requestedLimit) / pageSize))
    : 1000;
  const suffixes = String(process.env.DJEN_OAB_VARIANTS || 'true').toLowerCase() === 'false'
    ? ['']
    : ['', '-O', '-A', '-N', '-B', '-S', '-E'];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (const suffix of suffixes) {
    const queriedOab = `${cleanOab}${suffix}`;
    let variantAccumulated = 0;
    for (let page = 1; page <= maxPages; page += 1) {
      const qs = new URLSearchParams({
        numeroOab: queriedOab,
        ufOab: cleanUf,
        dataDisponibilizacaoInicio: start,
        dataDisponibilizacaoFim: end,
        pagina: String(page),
        itensPorPagina: String(pageSize),
      });
      const request = async () => {
        const response = await fetch(`${endpoint}?${qs.toString()}`, { signal, headers: { Accept: 'application/json' } });
        if (!response.ok) {
          const body = await response.text().catch(() => '');
          const error = new Error(`DJEN respondeu ${response.status}${body ? `: ${body.slice(0, 180)}` : ''}`);
          error.sourceStatus = response.status;
          error.code = response.status === 503 ? 'DJEN_SOURCE_UNAVAILABLE' : 'DJEN_SOURCE_ERROR';
          error.retryable = response.status === 408 || response.status === 429 || response.status >= 500;
          throw error;
        }
        return response.json();
      };
      let json = await request();
      let items = arrayFromDjenPayload(json);
      let total = djenTotal(json, variantAccumulated + items.length);
      // Uma página vazia intermediária não deve encerrar silenciosamente uma consulta que ainda anuncia resultados.
      if (!items.length && total > variantAccumulated) {
        await sleep(700);
        json = await request();
        items = arrayFromDjenPayload(json);
        total = djenTotal(json, variantAccumulated + items.length);
      }
      for (const item of items) collected.push(normalizeDjenPublication(item, { oab: cleanOab, uf: cleanUf }));
      variantAccumulated += items.length;
      if (!items.length || items.length < pageSize || variantAccumulated >= total || collected.length >= requestedLimit) break;
      await sleep(350);
    }
    if (collected.length >= requestedLimit) break;
    await sleep(350);
  }

  const deduped = [];
  const seen = new Set();
  for (const item of collected) {
    const key = item.externalId || `${item.processNumber}|${item.availabilityDate}|${item.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
    if (deduped.length >= requestedLimit) break;
  }
  return deduped;
}

function brazilFixedNationalHolidays(year) {
  return [
    `${year}-01-01`, // Confraternização Universal
    `${year}-04-21`, // Tiradentes
    `${year}-05-01`, // Dia Mundial do Trabalho
    `${year}-09-07`, // Independência do Brasil
    `${year}-10-12`, // Nossa Senhora Aparecida
    `${year}-11-02`, // Finados
    `${year}-11-15`, // Proclamação da República
    `${year}-11-20`, // Dia Nacional de Zumbi e da Consciência Negra
    `${year}-12-25`, // Natal
  ];
}

function parseLocalDate(dateLike) {
  const s = toDateOnly(dateLike);
  if (!s) throw new Error('Data inválida.');
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function isoDay(date) { return date.toISOString().slice(0, 10); }
function addDays(date, amount) { const d = new Date(date); d.setUTCDate(d.getUTCDate() + amount); return d; }
function isRecess(date, regime) {
  if (!['cpc', 'clt'].includes(String(regime).toLowerCase())) return false;
  const m = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return (m === 12 && day >= 20) || (m === 1 && day <= 20);
}
function isBusinessDay(date, holidaySet, regime, { suspendForRecess = true } = {}) {
  const dow = date.getUTCDay();
  return dow !== 0 && dow !== 6 && !holidaySet.has(isoDay(date)) && (!suspendForRecess || !isRecess(date, regime));
}
function nextBusinessDayAfter(date, holidaySet, regime, options) {
  let d = addDays(date, 1);
  while (!isBusinessDay(d, holidaySet, regime, options)) d = addDays(d, 1);
  return d;
}

export function calculateProceduralDeadline({ availabilityDate, days, regime = 'cpc', holidays = [] } = {}) {
  const n = Number(days);
  if (!Number.isInteger(n) || n < 1 || n > 365) throw new Error('Quantidade de dias deve estar entre 1 e 365.');
  const availability = parseLocalDate(availabilityDate);
  const baseYears = [availability.getUTCFullYear(), availability.getUTCFullYear() + 1];
  const holidaySet = new Set([
    ...baseYears.flatMap(brazilFixedNationalHolidays),
    ...(holidays || []).map((h) => toDateOnly(typeof h === 'string' ? h : h?.date)).filter(Boolean),
  ]);
  // O recesso suspende a contagem (CPC 220 / CLT 775-A), mas não é tratado por si só como feriado de publicação.
  // Se o tribunal também suspender expediente/publicações em determinada data, cadastre-a em court_holidays.
  const publication = nextBusinessDayAfter(availability, holidaySet, regime, { suspendForRecess: false });
  const firstCounted = nextBusinessDayAfter(publication, holidaySet, regime, { suspendForRecess: true });
  let deadline = firstCounted;
  let counted = 1;
  while (counted < n) {
    deadline = nextBusinessDayAfter(deadline, holidaySet, regime);
    counted += 1;
  }
  return {
    availabilityDate: isoDay(availability),
    publicationDate: isoDay(publication),
    countStartDate: isoDay(firstCounted),
    deadlineDate: isoDay(deadline),
    days: n,
    daysKind: 'uteis',
    regime: String(regime).toLowerCase(),
    holidaysApplied: [...holidaySet].sort(),
    recessApplied: ['cpc', 'clt'].includes(String(regime).toLowerCase()),
  };
}

export function saoPauloDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function datesForDjenDailyWindow(now = new Date()) {
  const local = saoPauloDateParts(now);
  const [y, m, d] = local.date.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d, 12));
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 2); // sobreposição deliberada; a persistência deduplica por ID externo
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}
