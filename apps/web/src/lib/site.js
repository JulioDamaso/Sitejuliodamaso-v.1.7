export const SITE = {
  name: 'Julio Damaso Advocacia',
  shortName: 'Julio Damaso',
  tagline: 'Especialista em Direito Imobiliário',
  whatsapp: '5533998457769',
  email: 'juliodamaso.advogado@gmail.com',
  city: 'Governador Valadares/MG — Atendimento online em todo o Brasil',
  instagram: 'https://instagram.com/juliodamaso.adv',
  instagramHandle: '@juliodamaso.adv',
  website: 'https://juliodamasoadvocacia.com',
  logoDark:
    'https://horizons-cdn.hostinger.com/8b1eb089-a6ee-4e8d-811c-005f60f167b5/4c864815b15a9b81405f67bc5bca0fd4.png',
  logoLight:
    'https://horizons-cdn.hostinger.com/8b1eb089-a6ee-4e8d-811c-005f60f167b5/59bbbfd8c1d233af4300bd5444778cfc.png',
  favicon:
    'https://horizons-cdn.hostinger.com/8b1eb089-a6ee-4e8d-811c-005f60f167b5/0b2cdbe8caa4252a60a62cb4d9f1ba2f.png',
  defaultPhoto: '',
};

export const HERO_QUOTES = [
  'Ter patrimônio é importante. Ter um patrimônio juridicamente seguro é essencial. Saúde Patrimonial é justamente cuidar dessa segurança.',
  'Seu patrimônio precisa de cuidado assim como sua saúde. Saúde Patrimonial é prevenção, regularização e segurança jurídica para proteger o que você construiu.',
  'Saúde Patrimonial é mais do que cuidar do que você tem. É garantir que o seu patrimônio esteja regularizado, protegido e juridicamente seguro.',
];

export const waLink = (msg) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    msg || 'Olá! Gostaria de falar com o escritório Julio Damaso Advocacia.',
  )}`;

export const AREAS = [
  {
    q: 'usucapião',
    label: 'Usucapião',
    desc: 'Transforme posse em propriedade registrada, na via judicial ou extrajudicial.',
  },
  {
    q: 'inventário',
    label: 'Inventário',
    desc: 'Partilha em cartório ou judicial, com orientação clara em cada etapa.',
  },
  {
    q: 'adjudicação',
    label: 'Adjudicação compulsória',
    desc: 'Escritura definitiva mesmo quando o vendedor se recusa a outorgar.',
  },
  {
    q: 'regularização',
    label: 'Regularização imobiliária',
    desc: 'Registro, averbação, georreferenciamento, retificação de área, dentre outros.',
  },
  {
    q: 'compra e venda',
    label: 'Compra e venda',
    desc: 'Contratos, due diligence e segurança na aquisição do imóvel.',
  },
  {
    q: 'doação',
    label: 'Doação',
    desc: 'Planejamento sucessório com reserva de usufruto e cláusulas protetivas.',
  },
  {
    q: 'divórcio',
    label: 'Divórcio',
    desc: 'Consensual ou litigioso, com partilha de bens equilibrada.',
  },
  {
    q: 'direito digital',
    label: 'Direito digital',
    desc: 'LGPD, contratos digitais e proteção do patrimônio online.',
  },
];

export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(String(d).replace(' ', 'T'));
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-BR');
};

export const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(String(d).replace(' ', 'T'));
  return Number.isNaN(dt.getTime())
    ? '—'
    : dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export const fmtBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export const toPbDate = (v) => (v ? v.replace('T', ' ') + (v.length === 16 ? ':00' : '') : '');

export const pbToInput = (d) => (d ? String(d).slice(0, 16).replace(' ', 'T') : '');

/** Date-only helpers (sem hora) — input type="date" já está em YYYY-MM-DD */
export const toPbDateOnly = (v) => (v ? String(v).slice(0, 10) : '');
export const pbToInputDate = (d) => (d ? String(d).slice(0, 10) : '');

export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Protocolo: JD + ano (2 dígitos) + sequência a partir de 500 */
export const makeProtocol = (seq = 500) => {
  const yy = String(new Date().getFullYear()).slice(-2);
  return `JD${yy}${String(seq).padStart(4, '0')}`;
};

export const makePassword = () => {
  const yy = String(new Date().getFullYear()).slice(-2);
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `Cliente@${yy}#${rnd}`;
};

export const PROCESS_STATUS = {
  ativo: { label: 'Ativo', cls: 'bg-primary/10 text-primary' },
  suspenso: { label: 'Suspenso', cls: 'bg-accent/15 text-accent' },
  concluido: { label: 'Concluído', cls: 'bg-secondary text-secondary-foreground' },
  arquivado: { label: 'Arquivado', cls: 'bg-muted text-muted-foreground' },
};

export const FIN_STATUS = {
  pendente: { label: 'Pendente', cls: 'bg-accent/15 text-accent' },
  pago: { label: 'Pago', cls: 'bg-primary/10 text-primary' },
  vencido: { label: 'Vencido', cls: 'bg-destructive/10 text-destructive' },
};

export const POST_STATUS = {
  rascunho: { label: 'Rascunho', cls: 'bg-muted text-muted-foreground' },
  publicado: { label: 'Publicado', cls: 'bg-primary/10 text-primary' },
  agendado: { label: 'Agendado', cls: 'bg-accent/15 text-accent' },
};

export const EVENT_TYPES = {
  andamento: 'Andamento',
  audiencia: 'Audiência',
  prazo: 'Prazo',
  documento: 'Documento',
  outro: 'Outro',
};

export const APPT_CATEGORIES = {
  audiencia: { label: 'Audiência', cls: 'bg-blue-600 text-white', dot: 'bg-blue-700' },
  reuniao: { label: 'Reunião com cliente', cls: 'bg-emerald-600 text-white', dot: 'bg-emerald-700' },
  diligencia: { label: 'Diligência cartorária', cls: 'bg-amber-500 text-white', dot: 'bg-amber-600' },
  prazo: { label: 'Prazo fatal', cls: 'bg-red-600 text-white', dot: 'bg-red-700' },
  pericia: { label: 'Perícia técnica', cls: 'bg-purple-600 text-white', dot: 'bg-purple-700' },
};

export const PRIORITY = {
  urgente: { label: 'Urgente', cls: 'bg-red-600 text-white' },
  alta: { label: 'Alta', cls: 'bg-accent text-accent-foreground' },
  normal: { label: 'Normal', cls: 'bg-primary/10 text-primary' },
  baixa: { label: 'Baixa', cls: 'bg-muted text-muted-foreground' },
};

export const FIN_TYPE = {
  honorario: { label: 'Honorários', cls: 'bg-primary/10 text-primary' },
  despesa: { label: 'Despesa', cls: 'bg-destructive/10 text-destructive' },
  custas: { label: 'Custas', cls: 'bg-accent/15 text-accent' },
};

export const LEDGER_TYPE = {
  receita: { label: 'Receita', cls: 'bg-primary/10 text-primary' },
  despesa: { label: 'Despesa operacional', cls: 'bg-destructive/10 text-destructive' },
  prolabore: { label: 'Pró-labore', cls: 'bg-accent/15 text-accent' },
  investimento: { label: 'Investimento', cls: 'bg-blue-600 text-white' },
  transferencia: { label: 'Transferência / Capital', cls: 'bg-muted text-muted-foreground' },
};

export const LEDGER_STATUS = {
  pendente: { label: 'Pendente', cls: 'bg-accent/15 text-accent' },
  pago: { label: 'Pago', cls: 'bg-primary/10 text-primary' },
  vencido: { label: 'Vencido', cls: 'bg-destructive/10 text-destructive' },
  cancelado: { label: 'Cancelado', cls: 'bg-muted text-muted-foreground' },
};

/** Gera código de processo PRC-AAAA-XXXX */
export const makeProcessCode = (seq = 1) => {
  const year = new Date().getFullYear();
  return `PRC-${year}-${String(seq).padStart(4, '0')}`;
};

/** Normaliza texto para busca (sem acentos, sem pontuação, minúsculo) */
export const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const highlightMatch = (text, q) => {
  if (!q || !text) return String(text || '');
  const safe = String(text);
  const needle = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    return safe.replace(new RegExp(`(${needle})`, 'gi'), '⟪$1⟫');
  } catch {
    return safe;
  }
};
