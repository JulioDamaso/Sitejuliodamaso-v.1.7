import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  LayoutDashboard, Newspaper, Users, FolderOpen, Link2, LogOut, Menu, Plus,
  Pencil, Trash2, ArrowLeft, ExternalLink, PanelLeftClose, PanelLeftOpen,
  Bold, Italic, List, ListOrdered, Quote, Table as TableIcon, Image, Link as LinkIcon,
  Heading2, Heading3, Minus, Download, CheckCircle2, Circle, Scale, AlertCircle,
  Wallet, Search, Bell, Archive, Settings, X, Timer, Play, Pause,
  ScrollText, BarChart3, CalendarDays, FileText, LayoutGrid, Rows3, Columns3,
  Clock, Ban, BellOff, CheckCheck, AlertTriangle, KeyRound, Inbox,
} from 'lucide-react';
import { SITE, makeProtocol, makeProcessCode, makePassword, normalize, toPbDateOnly, pbToInputDate } from '@/lib/site';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext';
import { renderMarkdown } from '@/lib/markdown';
import {
  fmtDate, fmtDateTime, fmtBRL, toPbDate, pbToInput, slugify,
  PROCESS_STATUS, FIN_STATUS, POST_STATUS, EVENT_TYPES, FIN_TYPE, PRIORITY, APPT_CATEGORIES,
} from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/* ---------------- Login ---------------- */

export function AdminLoginPage() {
  const { loginAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAdmin) return <Navigate to="/restrito/painel" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAdmin(email, password);
      navigate('/restrito/painel');
    } catch (_) {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <Helmet>
        <title>Área Restrita — Julio Damaso Advocacia</title>
        <meta name="description" content="Acesso restrito à administração do site, blog, clientes e processos." />
      </Helmet>
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Scale className="h-6 w-6" strokeWidth={1.6} />
        </span>
        <h1 className="font-display mt-4 text-xl font-bold">Área restrita</h1>
        <p className="mt-1 text-sm text-muted-foreground">Uso interno do escritório.</p>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Senha</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          <Button type="submit" className="min-h-[44px] w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao site</Link>
        </Button>
      </form>
    </div>
  );
}

/* ---------------- Layout ---------------- */

const ALL_ROLES = ['owner', 'admin', 'financeiro', 'operacional', 'leitura'];

const ADMIN_NAV = [
  { to: '/restrito/painel', label: 'Início', icon: LayoutDashboard, end: true, roles: ALL_ROLES },
  { to: '/restrito/painel/posts', label: 'Blog', icon: Newspaper, roles: ['owner', 'admin', 'operacional'] },
  { to: '/restrito/painel/clientes', label: 'Clientes', icon: Users, roles: ['owner', 'admin', 'operacional'] },
  { to: '/restrito/painel/processos', label: 'Processos', icon: FolderOpen, roles: ALL_ROLES },
  { to: '/restrito/painel/djen', label: 'Publicações DJEN', icon: Inbox, roles: ALL_ROLES },
  { to: '/restrito/painel/agenda', label: 'Agenda & Tarefas', icon: CalendarDays, roles: ALL_ROLES },
  { to: '/restrito/painel/financeiro', label: 'Financeiro', icon: Wallet, roles: ['owner', 'admin', 'financeiro', 'leitura'] },
  { to: '/restrito/painel/dre', label: 'DRE & Relatórios', icon: BarChart3, roles: ['owner', 'admin', 'financeiro', 'leitura'] },
  { to: '/restrito/painel/arquivo', label: 'Arquivo morto', icon: Archive, roles: ['owner', 'admin', 'operacional'] },
  { to: '/restrito/painel/notificacoes', label: 'Notificações', icon: Bell, roles: ALL_ROLES },
  { to: '/restrito/painel/bio', label: 'Link da Bio', icon: Link2, roles: ['owner', 'admin'] },
  { to: '/restrito/painel/conteudo', label: 'Conteúdo do site', icon: FileText, roles: ['owner', 'admin'] },
  { to: '/restrito/painel/usuarios', label: 'Usuários', icon: Users, roles: ['owner', 'admin'] },
  { to: '/restrito/painel/auditoria', label: 'Auditoria', icon: ScrollText, roles: ['owner', 'admin', 'financeiro', 'leitura'] },
  { to: '/restrito/painel/config', label: 'Configurações', icon: Settings, roles: ['owner', 'admin'] },
];

function AdminNavItems({ collapsed = false, onNavigate, role }) {
  const items = ADMIN_NAV.filter((item) => !item.roles || !role || item.roles.includes(role));
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          title={item.label}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`
          }
        >
          <item.icon className="h-4.5 w-4.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
          {!collapsed && item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function AdminGlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState({ clients: [], processes: [], financial: [] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) {
      setResults({ clients: [], processes: [], financial: [] });
      return undefined;
    }
    const t = setTimeout(async () => {
      setBusy(true);
      const raw = q.trim();
      const digits = raw.replace(/\D/g, '');
      const esc = raw.replace(/"/g, '');
      try {
        const clientFilter = [
          `name ~ "${esc}"`,
          `protocol ~ "${esc}"`,
          `phone ~ "${esc}"`,
          `notes ~ "${esc}"`,
          `comments ~ "${esc}"`,
          digits ? `cpf ~ "${digits}"` : null,
          digits ? `phone ~ "${digits}"` : null,
        ].filter(Boolean).join(' || ');
        const [clients, processes, financial] = await Promise.all([
          pb.collection('clients').getList(1, 8, { filter: clientFilter }).then((r) => r.items).catch(() => []),
          pb.collection('processes').getList(1, 8, {
            filter: `title ~ "${esc}" || number ~ "${esc}" || summary ~ "${esc}" || stage ~ "${esc}"`,
            expand: 'client',
          }).then((r) => r.items).catch(() => []),
          pb.collection('financial').getList(1, 8, {
            filter: `description ~ "${esc}"`,
            expand: 'client',
          }).then((r) => r.items).catch(() => []),
        ]);
        setResults({ clients, processes, financial });
        setOpen(true);
      } finally {
        setBusy(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  const go = (path) => {
    setOpen(false);
    setQ('');
    navigate(path);
  };

  const mark = (text) => {
    if (!q || !text) return text;
    const parts = String(text).split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((p, i) =>
      p.toLowerCase() === q.toLowerCase()
        ? <mark key={i} className="rounded bg-accent/25 px-0.5 text-accent">{p}</mark>
        : <span key={i}>{p}</span>,
    );
  };

  const empty = !results.clients.length && !results.processes.length && !results.financial.length;

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
        placeholder="Buscar CPF, nome, protocolo, telefone…"
        className="h-10 pl-9 pr-9"
        aria-label="Busca geral do sistema"
      />
      {q && (
        <button
          type="button"
          onClick={() => { setQ(''); setOpen(false); setResults({ clients: [], processes: [], financial: [] }); }}
          aria-label="Fechar busca"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-auto rounded-2xl border border-border bg-card p-2 shadow-xl">
          {busy && <p className="p-3 text-xs text-muted-foreground">Buscando…</p>}
          {!busy && empty && <p className="p-3 text-xs text-muted-foreground">Nenhum resultado.</p>}
          {results.clients.length > 0 && (
            <div className="p-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clientes</p>
              {results.clients.map((c) => (
                <button key={c.id} type="button" onClick={() => go('/restrito/painel/clientes')} className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary">
                  <span className="font-medium">{mark(c.name)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {mark(c.protocol)}
                    {c.cpf ? <> · {mark(c.cpf)}</> : null}
                  </span>
                </button>
              ))}
            </div>
          )}
          {results.processes.length > 0 && (
            <div className="p-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Processos</p>
              {results.processes.map((p) => (
                <button key={p.id} type="button" onClick={() => go(`/restrito/painel/processos/${p.id}`)} className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary">
                  <span className="font-medium">{mark(p.title)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{p.expand?.client?.name}</span>
                </button>
              ))}
            </div>
          )}
          {results.financial.length > 0 && (
            <div className="p-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Financeiro</p>
              {results.financial.map((f) => (
                <button key={f.id} type="button" onClick={() => go('/restrito/painel/financeiro')} className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary">
                  {mark(f.description)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => {
    pb.collection('notifications').getFullList({ sort: '-created' }).then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);
  const unread = items.filter((n) => !n.read && (!n.snooze_until || new Date(String(n.snooze_until).replace(' ', 'T')) <= new Date()));
  const markRead = async (n) => { await pb.collection('notifications').update(n.id, { read: true }); load(); };
  const markAllRead = async () => {
    await Promise.all(unread.map((n, i) => pb.collection('notifications').update(n.id, { read: true }, { requestKey: `rd-${n.id}-${i}` })));
    load();
  };
  const remove = async (n) => { await pb.collection('notifications').delete(n.id); load(); };
  const snooze = async (n) => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    await pb.collection('notifications').update(n.id, { snooze_until: toPbDateOnly(d.toISOString().slice(0, 10)) });
    load();
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{unread.length}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-[28rem] overflow-auto rounded-2xl border border-border bg-card p-2 shadow-xl">
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notificações</p>
              {unread.length > 0 && (
                <button type="button" onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
                </button>
              )}
            </div>
            {items.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">Nenhuma notificação.</p>}
            {items.map((n) => {
              const isUnread = !n.read && (!n.snooze_until || new Date(String(n.snooze_until).replace(' ', 'T')) <= new Date());
              return (
                <div key={n.id} className={`rounded-lg p-2.5 ${isUnread ? 'bg-accent/5' : 'opacity-70'}`}>
                  <div className="flex items-start gap-2">
                    <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${isUnread ? 'text-accent' : 'text-muted-foreground'}`} />
                    <div className="min-w-0 flex-1">
                      {n.link ? <Link to={n.link} onClick={() => setOpen(false)} className="block text-sm font-semibold text-primary hover:underline">{n.title}</Link> : <p className="text-sm font-semibold">{n.title}</p>}
                      {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {isUnread && <button type="button" onClick={() => markRead(n)} className="text-[11px] text-primary hover:underline">Marcar lida</button>}
                        {isUnread && <button type="button" onClick={() => snooze(n)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:underline"><BellOff className="h-3 w-3" /> Adiar 1 dia</button>}
                        <button type="button" onClick={() => remove(n)} className="flex items-center gap-1 text-[11px] text-destructive hover:underline"><Trash2 className="h-3 w-3" /> Excluir</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  const doLogout = () => {
    logout();
    navigate('/restrito');
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Helmet>
        <title>Painel — Área Restrita</title>
        <meta name="description" content="Administração interna do escritório." />
        <link rel="icon" type="image/png" href={SITE.favicon} />
      </Helmet>
      <aside
        className={`sticky top-0 hidden h-screen flex-col border-r border-border bg-card p-4 transition-all md:flex ${
          collapsed ? 'w-[72px]' : 'w-60'
        }`}
      >
        <div className={`mb-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link to="/restrito/painel" className="flex items-center gap-2">
              <img src={SITE.favicon} alt="" className="h-9 w-9 rounded-xl object-cover" />
              <span className="font-display text-sm font-bold">JD Advocacia</span>
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} aria-label="Recolher menu">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AdminNavItems collapsed={collapsed} role={user?.role} />
        </div>
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-accent"
          >
            <ExternalLink className="h-5 w-5 shrink-0" strokeWidth={1.8} />
            {!collapsed && 'Ver site'}
          </Link>
          <button
            onClick={doLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-accent"
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.8} />
            {!collapsed && 'Sair'}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 overflow-y-auto">
              <div className="mt-6 flex flex-col gap-4">
                <AdminNavItems onNavigate={() => setOpen(false)} role={user?.role} />
                <Button variant="outline" onClick={doLogout}><LogOut className="mr-2 h-4 w-4" /> Sair</Button>
              </div>
            </SheetContent>
          </Sheet>
          <AdminGlobalSearch />
          <NotificationsBell />
          <span className="ml-auto hidden truncate text-xs text-muted-foreground sm:block">{user?.name || user?.email}</span>
          <button
            onClick={doLogout}
            aria-label="Sair"
            title="Sair do sistema"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */

export function AdminDashboard() {
  const [counts, setCounts] = useState({ posts: 0, clients: 0, processes: 0, pendencias: 0 });
  const [recent, setRecent] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [saldo, setSaldo] = useState(0);
  const [aReceber, setAReceber] = useState(0);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    const total = (c, extra = {}) => pb.collection(c).getList(1, 1, extra).then((r) => r.totalItems).catch(() => 0);
    Promise.all([
      total('posts'),
      total('clients'),
      total('processes', { filter: "status = 'ativo'" }),
      total('pendencias', { filter: 'done = false' }),
    ]).then(([posts, clients, processes, pendencias]) => setCounts({ posts, clients, processes, pendencias }));
    pb.collection('posts').getList(1, 5, { sort: '-updated' }).then((r) => setRecent(r.items)).catch(() => {});

    // KPI: próximos compromissos (alerta de agenda no dashboard)
    pb.collection('appointments').getList(1, 5, { sort: 'date', filter: 'date >= @now' })
      .then((r) => setUpcoming(r.items)).catch(() => setUpcoming([]));

    // KPI: saldo em caixa + a receber (financeiro)
    Promise.all([
      pb.collection('ledger').getFullList().catch(() => []),
      pb.collection('financial').getFullList().catch(() => []),
    ]).then(([ledger, financial]) => {
      let rec = 0, desp = 0, pl = 0;
      ledger.forEach((r) => {
        const a = Number(r.amount) || 0;
        if (r.status !== 'pago') return;
        if (r.type === 'receita') rec += a;
        else if (r.type === 'despesa') desp += a;
        else if (r.type === 'prolabore') pl += a;
      });
      financial.forEach((f) => {
        if (f.status === 'pago' && f.type !== 'despesa' && f.type !== 'custas') rec += Number(f.amount) || 0;
      });
      const aRec = financial.filter((f) => f.status === 'pendente' || f.status === 'vencido').reduce((s, f) => s + (Number(f.amount) || 0), 0);
      setSaldo(rec - desp - pl);
      setAReceber(aRec);
    });

    // KPI: movimentações recentes de etapa (rastreabilidade)
    pb.collection('process_movements').getList(1, 6, { sort: '-created', expand: 'process,actor' })
      .then((r) => setMovements(r.items)).catch(() => setMovements([]));
  }, []);

  const cards = [
    { label: 'Posts no blog', value: counts.posts, to: '/restrito/painel/posts', icon: Newspaper },
    { label: 'Clientes', value: counts.clients, to: '/restrito/painel/clientes', icon: Users },
    { label: 'Processos ativos', value: counts.processes, to: '/restrito/painel/processos', icon: FolderOpen },
    { label: 'Pendências abertas', value: counts.pendencias, to: '/restrito/painel/processos', icon: CheckCircle2 },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
            <c.icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
            <p className="font-display mt-3 text-3xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* KPIs financeiros em tempo real */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link to="/restrito/painel/financeiro" className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
          <Wallet className="h-5 w-5 text-primary" strokeWidth={1.8} />
          <p className={`font-display mt-3 text-2xl font-bold ${saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmtBRL(saldo)}</p>
          <p className="text-sm text-muted-foreground">Saldo em caixa</p>
        </Link>
        <Link to="/restrito/painel/financeiro" className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
          <Wallet className="h-5 w-5 text-accent" strokeWidth={1.8} />
          <p className="font-display mt-3 text-2xl font-bold text-accent">{fmtBRL(aReceber)}</p>
          <p className="text-sm text-muted-foreground">A receber (clientes)</p>
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Alerta de agenda */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Próximos compromissos</h2>
            <Link to="/restrito/painel/agenda" className="text-xs text-primary hover:underline">Ver agenda</Link>
          </div>
          <ul className="mt-4 space-y-3">
            {upcoming.length === 0 && <li className="text-sm text-muted-foreground">Nenhum compromisso futuro.</li>}
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(a.date)}{a.location ? ` · ${a.location}` : ''}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Rastreabilidade — movimentações de etapa */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Movimentações recentes</h2>
            <Link to="/restrito/painel/processos" className="text-xs text-primary hover:underline">Ver processos</Link>
          </div>
          <ul className="mt-4 space-y-3">
            {movements.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</li>}
            {movements.map((m) => (
              <li key={m.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                <Columns3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.expand?.process?.title || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.from_stage || '—'} → <strong className="text-foreground">{m.to_stage || '—'}</strong>
                    {m.expand?.actor?.name ? ` · por ${m.expand.actor.name}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{fmtDateTime(m.created)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2 className="font-display mt-10 text-lg font-bold">Posts recentes</h2>
      <div className="mt-4 rounded-2xl border border-border bg-card">
        {recent.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nenhum post ainda.</p>}
        {recent.map((p) => {
          const st = POST_STATUS[p.status] || POST_STATUS.rascunho;
          return (
            <Link key={p.id} to={`/restrito/painel/posts/${p.id}`} className="flex items-center gap-4 border-b border-border p-4 last:border-0 hover:bg-secondary/50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground">Atualizado em {fmtDate(p.updated)}</p>
              </div>
              <Badge className={`${st.cls} hover:${st.cls} border-0`}>{st.label}</Badge>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Posts ---------------- */

export function AdminPosts() {
  const [posts, setPosts] = useState(null);

  const load = useCallback(() => {
    pb.collection('posts').getFullList({ sort: '-updated' }).then(setPosts).catch(() => setPosts([]));
  }, []);
  useEffect(load, [load]);

  const remove = async (id) => {
    if (!window.confirm('Excluir este post definitivamente?')) return;
    await pb.collection('posts').delete(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Blog</h1>
        <Button asChild><Link to="/restrito/painel/posts/novo"><Plus className="mr-1 h-4 w-4" /> Novo post</Link></Button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Publicação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts === null && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Carregando…</TableCell></TableRow>}
            {posts !== null && posts.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum post. Crie o primeiro.</TableCell></TableRow>
            )}
            {(posts || []).map((p) => {
              const st = POST_STATUS[p.status] || POST_STATUS.rascunho;
              return (
                <TableRow key={p.id}>
                  <TableCell className="max-w-[280px] truncate font-medium">{p.title}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.category || '—'}</TableCell>
                  <TableCell><Badge className={`${st.cls} hover:${st.cls} border-0`}>{st.label}</Badge></TableCell>
                  <TableCell className="hidden sm:table-cell">{fmtDate(p.publish_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" aria-label="Editar">
                      <Link to={`/restrito/painel/posts/${p.id}`}><Pencil className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const EMPTY_POST = {
  title: '', slug: '', excerpt: '', content: '', category: '', tags: '',
  cover: '', coverFile: null, coverPreview: '', seo_title: '', seo_description: '', status: 'rascunho', publish_at: '',
};

export function AdminPostEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_POST);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const taRef = useRef(null);

  useEffect(() => {
    if (isNew) return;
    pb.collection('posts').getOne(id).then((p) => {
      let coverPreview = '';
      try { if (p.cover_file) coverPreview = pb.files.getURL(p, p.cover_file); } catch { /* */ }
      setForm({ ...EMPTY_POST, ...p, coverFile: null, coverPreview, publish_at: pbToInput(p.publish_at) });
      setSlugTouched(true);
    }).catch(() => setError('Post não encontrado.'));
  }, [id, isNew]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const insert = (before, after = '') => {
    const ta = taRef.current;
    if (!ta) return set('content', form.content + before + after);
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const next = form.content.slice(0, s) + before + form.content.slice(s, e) + after + form.content.slice(e);
    set('content', next);
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + before.length; });
  };

  const tools = [
    { icon: Heading2, label: 'Título 2', fn: () => insert('\n## ') },
    { icon: Heading3, label: 'Título 3', fn: () => insert('\n### ') },
    { icon: Bold, label: 'Negrito', fn: () => insert('**', '**') },
    { icon: Italic, label: 'Itálico', fn: () => insert('*', '*') },
    { icon: LinkIcon, label: 'Link', fn: () => insert('[texto](https://', ')') },
    { icon: Image, label: 'Imagem', fn: () => insert('\n![descrição](https://', ')\n') },
    { icon: Quote, label: 'Citação', fn: () => insert('\n> ') },
    { icon: List, label: 'Lista', fn: () => insert('\n- item\n- item\n') },
    { icon: ListOrdered, label: 'Lista numerada', fn: () => insert('\n1. item\n2. item\n') },
    { icon: TableIcon, label: 'Tabela', fn: () => insert('\n| Coluna 1 | Coluna 2 |\n| --- | --- |\n| valor | valor |\n') },
    { icon: Minus, label: 'Divisor', fn: () => insert('\n---\n') },
  ];

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('slug', form.slug || slugify(form.title));
    fd.append('excerpt', form.excerpt || '');
    fd.append('content', form.content || '');
    fd.append('category', form.category || '');
    fd.append('tags', form.tags || '');
    fd.append('cover', form.cover || '');
    fd.append('seo_title', form.seo_title || '');
    fd.append('seo_description', form.seo_description || '');
    fd.append('status', form.status);
    if (form.publish_at) fd.append('publish_at', toPbDate(form.publish_at));
    if (form.coverFile) fd.append('cover_file', form.coverFile);
    try {
      if (isNew) {
        fd.append('author', user.id);
        await pb.collection('posts').create(fd);
      } else {
        await pb.collection('posts').update(id, fd);
      }
      navigate('/restrito/painel/posts');
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar. Verifique os campos (slug deve ser único).');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar">
            <Link to="/restrito/painel/posts"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="font-display text-2xl font-bold tracking-tight">{isNew ? 'Novo post' : 'Editar post'}</h1>
        </div>
        <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </div>
      {error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => {
                set('title', e.target.value);
                if (isNew && !slugTouched) set('slug', slugify(e.target.value));
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Resumo (excerpt)</Label>
            <Textarea rows={2} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
          </div>
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Escrever</TabsTrigger>
              <TabsTrigger value="preview">Pré-visualizar</TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <div className="rounded-2xl border border-border bg-card">
                <div className="flex flex-wrap gap-1 border-b border-border p-2">
                  {tools.map((t) => (
                    <Button key={t.label} type="button" variant="ghost" size="icon" title={t.label} onClick={t.fn}>
                      <t.icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
                <Textarea
                  ref={taRef}
                  rows={18}
                  value={form.content}
                  onChange={(e) => set('content', e.target.value)}
                  placeholder="Escreva em markdown: ## títulos, **negrito**, - listas, > citações, | tabelas |"
                  className="rounded-t-none border-0 font-mono text-sm focus-visible:ring-0"
                />
              </div>
            </TabsContent>
            <TabsContent value="preview">
              <div className="prose-legal min-h-[300px] rounded-2xl border border-border bg-card p-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="publicado">Publicado</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data de publicação</Label>
            <Input type="datetime-local" value={form.publish_at} onChange={(e) => set('publish_at', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Slug (URL)</Label>
            <Input value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} required />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Ex.: Direito Imobiliário" />
          </div>
          <div className="space-y-2">
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="usucapião, posse" />
          </div>
          <div className="space-y-2">
            <Label>Capa — URL</Label>
            <Input value={form.cover} onChange={(e) => set('cover', e.target.value)} placeholder="https://…" />
            <Label className="mt-2 block">ou upload de imagem</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setForm((f) => ({
                  ...f,
                  coverFile: file,
                  coverPreview: file ? URL.createObjectURL(file) : f.coverPreview,
                }));
              }}
            />
            {(form.cover || form.coverPreview) && (
              <img src={form.coverPreview || form.cover} alt="" className="h-28 w-full rounded-xl object-cover" />
            )}
          </div>
          <div className="space-y-2">
            <Label>SEO title</Label>
            <Input value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Meta description</Label>
            <Textarea rows={3} value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} />
          </div>
        </div>
      </div>
    </form>
  );
}

/* ---------------- Clientes ---------------- */

const EMPTY_CLIENT = { name: '', protocol: '', email: '', phone: '', notes: '', password: '', cpf: '', comments: '' };

export function AdminClients() {
  const [clients, setClients] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [error, setError] = useState('');
  const [createdCred, setCreatedCred] = useState(null);

  const load = useCallback(() => {
    pb.collection('clients').getFullList({ sort: 'name' }).then(setClients).catch(() => setClients([]));
  }, []);
  useEffect(load, [load]);

  const openNew = async () => {
    setEditing(null);
    setError('');
    let seq = 500;
    try {
      const all = await pb.collection('clients').getFullList({ fields: 'protocol' });
      all.forEach((c) => {
        const m = String(c.protocol || '').match(/(\d{4})$/);
        if (m) seq = Math.max(seq, Number(m[1]) + 1);
      });
    } catch { /* */ }
    setForm({ ...EMPTY_CLIENT, protocol: makeProtocol(seq) });
    setOpen(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      protocol: c.protocol,
      email: c.email?.endsWith('@clientes.local') ? '' : (c.email || ''),
      phone: c.phone || '',
      notes: c.notes || '',
      password: '',
      cpf: c.cpf || '',
      comments: c.comments || '',
    });
    setError('');
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const email = form.email || `${form.protocol.toLowerCase()}@clientes.local`;
    try {
      if (editing) {
        const data = {
          name: form.name, protocol: form.protocol, email, phone: form.phone, notes: form.notes,
          cpf: form.cpf, comments: form.comments,
        };
        if (form.password) {
          data.password = form.password;
          data.passwordConfirm = form.password;
        }
        await pb.collection('clients').update(editing.id, data);
      } else {
        const pw = form.password || makePassword();
        await pb.collection('clients').create({
          name: form.name, protocol: form.protocol, email, phone: form.phone, notes: form.notes,
          cpf: form.cpf, comments: form.comments,
          password: pw, passwordConfirm: pw, verified: true,
        });
        setCreatedCred({ protocol: form.protocol, password: pw });
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar (protocolo deve ser único; senha com 10+ caracteres).');
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Excluir o cliente ${c.name}? Processos vinculados também serão removidos.`)) return;
    await pb.collection('clients').delete(c.id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Clientes</h1>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo cliente</Button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Protocolo</TableHead>
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients === null && <TableRow><TableCell colSpan={4} className="text-muted-foreground">Carregando…</TableCell></TableRow>}
            {clients !== null && clients.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-muted-foreground">Nenhum cliente cadastrado.</TableCell></TableRow>
            )}
            {(clients || []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell><Badge variant="outline">{c.protocol}</Badge></TableCell>
                <TableCell className="hidden md:table-cell">{c.phone || '—'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar cliente' : 'Novo cliente'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Protocolo (login)</Label><Input value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })} placeholder="JD265000" required /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
              <div className="space-y-2"><Label>E-mail (opcional)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>{editing ? 'Nova senha (deixe em branco para manter)' : 'Senha de acesso (deixe em branco para gerar automaticamente)'}</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={false} minLength={0} placeholder="Gerada automaticamente se vazio" />
            </div>
            <div className="space-y-2"><Label>Anotações internas</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="space-y-2"><Label>Comentários (buscáveis)</Label><Textarea rows={2} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} /></div>
            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCred} onOpenChange={(v) => !v && setCreatedCred(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Cliente criado — acesso ao portal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              <p className="font-semibold text-primary">Cliente cadastrado com sucesso.</p>
              <p className="mt-1 text-muted-foreground">Anote as credenciais e entregue ao cliente. A senha não poderá ser recuperada depois.</p>
            </div>
            <div className="space-y-2">
              <Label>Protocolo (login)</Label>
              <Input readOnly value={createdCred?.protocol || ''} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Senha gerada</Label>
              <div className="flex gap-2">
                <Input readOnly value={createdCred?.password || ''} className="font-mono" />
                <Button type="button" variant="outline" onClick={() => { navigator.clipboard?.writeText(createdCred?.password || ''); }}>Copiar</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">O cliente entra em <strong>/portal</strong>, digita o protocolo acima e esta senha.</p>
            <div className="flex justify-end">
              <Button onClick={() => setCreatedCred(null)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Processos ---------------- */

const EMPTY_PROCESS = {
  client: '', title: '', number: '', area: '', status: 'ativo', stage: '', summary: '',
  funnel: '', stage_ref: '', code: '', value_cause: '', foro: '', comarca: '', vara: '',
  services: '', responsible: '', sla_days: '', drive_link: '', tribunal: '', parties: '',
};

const VIEW_OPTS = [
  { value: 'tabela', label: 'Tabela', icon: Rows3 },
  { value: 'lista', label: 'Lista', icon: List },
  { value: 'grid', label: 'Grid', icon: LayoutGrid },
  { value: 'kanban', label: 'Kanban', icon: Columns3 },
  { value: 'dashboard', label: 'Dashboard', icon: BarChart3 },
];

export function AdminProcesses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processes, setProcesses] = useState(null);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [funnels, setFunnels] = useState([]);
  const [allStages, setAllStages] = useState([]);
  const [stages, setStages] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PROCESS);
  const [error, setError] = useState('');
  const [view, setView] = useState('tabela');
  const [funnelId, setFunnelId] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [respFilter, setRespFilter] = useState('all');
  const [dragId, setDragId] = useState(null);
  const [timerOpen, setTimerOpen] = useState(null);
  const [cnjBusy, setCnjBusy] = useState(false);
  const [cnjPreview, setCnjPreview] = useState(null);

  const recordStageChange = async ({ processId, fromStage = '', toStage = '', toStageRef = '', notes = '' }) => {
    if (String(fromStage || '') === String(toStage || '')) return;
    await pb.collection('process_movements').create({
      process: processId,
      from_stage: fromStage || '',
      to_stage: toStage || '',
      to_stage_ref: toStageRef || '',
      actor: user?.id || '',
      notes,
    });
  };

  const load = useCallback(() => {
    pb.collection('processes').getFullList({ sort: '-updated', expand: 'client,funnel,stage_ref,responsible' }).then(setProcesses).catch(() => setProcesses([]));
    pb.collection('clients').getFullList({ sort: 'name' }).then(setClients).catch(() => {});
    pb.collection('users').getFullList({ sort: 'name' }).then(setStaff).catch(() => setStaff([]));
    pb.collection('funnels').getFullList({ sort: 'order', filter: 'active != false' }).then((f) => {
      setFunnels(f);
      setFunnelId((prev) => prev || f[0]?.id || '');
    }).catch(() => setFunnels([]));
    pb.collection('funnel_stages').getFullList({ sort: 'order' }).then(setAllStages).catch(() => setAllStages([]));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (!funnelId) { setStages([]); return; }
    pb.collection('funnel_stages').getFullList({ filter: `funnel = "${funnelId}"`, sort: 'order' }).then(setStages).catch(() => setStages([]));
  }, [funnelId]);

  useEffect(() => {
    if (!form.funnel) { setStages([]); return; }
    pb.collection('funnel_stages').getFullList({ filter: `funnel = "${form.funnel}"`, sort: 'order' }).then(setStages).catch(() => setStages([]));
  }, [form.funnel]);

  const filtered = useMemo(() => {
    const nq = normalize(q);
    return (processes || []).filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (respFilter !== 'all' && p.responsible !== respFilter) return false;
      if (nq) {
        const blob = normalize([p.title, p.number, p.code, p.area, p.stage, p.summary, p.services, p.expand?.client?.name].join(' '));
        if (!blob.includes(nq)) return false;
      }
      return true;
    });
  }, [processes, q, statusFilter, respFilter]);

  const openNew = async () => {
    setEditing(null);
    let code = '';
    try {
      const all = await pb.collection('processes').getFullList({ fields: 'code' });
      let seq = 1;
      all.forEach((p) => {
        const m = String(p.code || '').match(/PRC-\d{4}-(\d{4})$/);
        if (m) seq = Math.max(seq, Number(m[1]) + 1);
      });
      code = makeProcessCode(seq);
    } catch { code = makeProcessCode(1); }
    setForm({ ...EMPTY_PROCESS, code, responsible: user?.id || '' });
    setError('');
    setCnjPreview(null);
    setOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      client: p.client, title: p.title, number: p.number || '', area: p.area || '', status: p.status,
      stage: p.stage || '', summary: p.summary || '', funnel: p.funnel || '', stage_ref: p.stage_ref || '',
      code: p.code || '', value_cause: p.value_cause || '', foro: p.foro || '', comarca: p.comarca || '',
      vara: p.vara || '', services: p.services || '', responsible: p.responsible || '', sla_days: p.sla_days || '',
      drive_link: p.drive_link || '', tribunal: p.tribunal || '', parties: p.parties || '',
    });
    setError('');
    setCnjPreview(null);
    setOpen(true);
  };

  const lookupCnj = async () => {
    const digits = String(form.number || '').replace(/\D/g, '');
    if (digits.length !== 20) { setError('Informe um número CNJ válido com 20 dígitos.'); return; }
    setCnjBusy(true); setError(''); setCnjPreview(null);
    try {
      const response = await apiServerClient.fetch(`/legal/datajud/process/${encodeURIComponent(digits)}`, {
        headers: { Authorization: pb.authStore.token || '' },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Falha HTTP ${response.status}`);
      if (!data.found) throw new Error('Processo não localizado na API Pública do DataJud.');
      setCnjPreview(data);
      setForm((current) => ({
        ...current,
        number: data.cnj || current.number,
        title: current.title || data.class || `Processo ${data.cnj}`,
        area: current.area || data.subjects?.[0] || '',
        foro: current.foro || data.tribunal || '',
        vara: current.vara || data.courtUnit || '',
        tribunal: data.tribunal || current.tribunal || '',
        parties: data.parties?.length ? data.parties.join('\n') : current.parties || '',
        summary: current.summary || [data.class, data.subjects?.length ? `Assuntos: ${data.subjects.join(', ')}` : '', data.parties?.length ? `Partes: ${data.parties.join('; ')}` : ''].filter(Boolean).join('\n'),
      }));
    } catch (err) {
      setError(err?.message || 'Não foi possível consultar o DataJud.');
    } finally { setCnjBusy(false); }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.client) { setError('Selecione o cliente antes de salvar o processo.'); return; }
    if (!form.title?.trim()) { setError('Informe o título do caso.'); return; }
    try {
      const stageObj = stages.find((s) => s.id === form.stage_ref);
      const payload = {
        ...form,
        value_cause: Number(form.value_cause) || 0,
        sla_days: Number(form.sla_days) || 0,
        stage: stageObj ? stageObj.name : form.stage,
        ...(editing && String(editing.stage || '') !== String(stageObj ? stageObj.name : form.stage || '') ? { stage_entered_at: new Date().toISOString() } : {}),
      };
      const saved = editing
        ? await pb.collection('processes').update(editing.id, payload)
        : await pb.collection('processes').create(payload);
      if (editing && String(editing.stage || '') !== String(payload.stage || '')) {
        await recordStageChange({
          processId: saved.id,
          fromStage: editing.stage,
          toStage: payload.stage,
          toStageRef: payload.stage_ref,
          notes: 'Alteração manual no cadastro do processo.',
        });
      }
      let importWarning = '';
      if (cnjPreview?.found && String(form.number || '').replace(/\D/g, '').length === 20) {
        try {
          const response = await apiServerClient.fetch('/legal/datajud/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
            body: JSON.stringify({ processId: saved.id, cnj: form.number }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data?.error || `Falha HTTP ${response.status}`);
          if (data.imported) importWarning = `${data.imported} movimentações do DataJud foram importadas.`;
        } catch (importErr) {
          importWarning = `Processo salvo, mas a importação dos andamentos falhou: ${importErr?.message || 'erro desconhecido'}`;
        }
      }
      setOpen(false);
      load();
      if (importWarning) window.alert(importWarning);
    } catch (err) {
      const details = err?.response?.data;
      const msg = details ? Object.entries(details).map(([k, v]) => `${k}: ${v?.message || v}`).join('; ') : (err?.message || 'Não foi possível salvar.');
      setError(msg);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Excluir "${p.title}" e todos os seus andamentos, documentos e pendências?`)) return;
    await pb.collection('processes').delete(p.id);
    load();
  };

  const moveToStage = async (procId, stageId, stageName) => {
    const current = (processes || []).find((p) => p.id === procId);
    if (!current || String(current.stage || '') === String(stageName || '')) return;
    await pb.collection('processes').update(procId, { stage_ref: stageId, stage: stageName, funnel: funnelId, stage_entered_at: new Date().toISOString() });
    await recordStageChange({
      processId: procId,
      fromStage: current.stage,
      toStage: stageName,
      toStageRef: stageId,
      notes: 'Movimentação realizada pelo Kanban.',
    });
    setProcesses((prev) => (prev || []).map((p) => (p.id === procId ? { ...p, stage_ref: stageId, stage: stageName, funnel: funnelId } : p)));
  };

  const onDrop = async (stageId, stageName) => {
    if (!dragId) return;
    try {
      await moveToStage(dragId, stageId, stageName);
    } catch (err) {
      setError(`Etapa alterada, mas não foi possível registrar a auditoria: ${err?.message || 'erro desconhecido'}`);
      load();
    } finally {
      setDragId(null);
    }
  };

  const startTimer = (p) => setTimerOpen(p);

  // Dashboard aggregation
  const dash = useMemo(() => {
    const list = processes || [];
    const byStatus = { ativo: 0, suspenso: 0, concluido: 0, arquivado: 0 };
    const byArea = {};
    let valorCausa = 0;
    list.forEach((p) => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      const a = p.area || 'Sem área';
      byArea[a] = (byArea[a] || 0) + 1;
      valorCausa += Number(p.value_cause) || 0;
    });
    return { total: list.length, byStatus, byArea, valorCausa };
  }, [processes]);

  const renderCardActions = (p) => (
    <div className="mt-2 flex gap-1">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/restrito/painel/processos/${p.id}`)}>Detalhes</Button>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startTimer(p)}><Timer className="mr-1 h-3.5 w-3.5" /> Cronômetro</Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Editar" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Excluir" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Processos & Casos</h1>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo processo</Button>
      </div>

      {/* Controles: alternador de visualização + filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
          {VIEW_OPTS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setView(v.value)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${view === v.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <v.icon className="h-3.5 w-3.5" /> {v.label}
            </button>
          ))}
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (título, número, cliente, área)…" className="h-9 w-full max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="suspenso">Suspenso</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="arquivado">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        {view === 'kanban' && (
          <Select value={funnelId || 'none'} onValueChange={(v) => setFunnelId(v === 'none' ? '' : v)}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Esteira" /></SelectTrigger>
            <SelectContent>
              {funnels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Loading / empty */}
      {processes === null && <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>}
      {processes !== null && filtered.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum processo encontrado.</p>
      )}

      {/* TABELA */}
      {view === 'tabela' && filtered.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden lg:table-cell">Área</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Etapa</TableHead>
                <TableHead className="hidden xl:table-cell text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const st = PROCESS_STATUS[p.status] || PROCESS_STATUS.ativo;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code || '—'}</TableCell>
                    <TableCell><Link to={`/restrito/painel/processos/${p.id}`} className="font-medium text-primary hover:underline">{p.title}</Link></TableCell>
                    <TableCell className="hidden md:table-cell">{p.expand?.client?.name || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{p.area || '—'}</TableCell>
                    <TableCell><Badge className={`${st.cls} hover:${st.cls} border-0`}>{st.label}</Badge></TableCell>
                    <TableCell className="hidden max-w-[200px] truncate lg:table-cell">{p.stage || '—'}</TableCell>
                    <TableCell className="hidden xl:table-cell text-right">{fmtBRL(p.value_cause)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" aria-label="Cronômetro" onClick={() => startTimer(p)}><Timer className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* LISTA */}
      {view === 'lista' && filtered.length > 0 && (
        <ul className="mt-6 space-y-2">
          {filtered.map((p) => {
            const st = PROCESS_STATUS[p.status] || PROCESS_STATUS.ativo;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <span className="font-mono text-xs text-muted-foreground">{p.code || '—'}</span>
                <Link to={`/restrito/painel/processos/${p.id}`} className="min-w-0 flex-1 font-medium text-primary hover:underline">{p.title}</Link>
                <span className="hidden text-sm text-muted-foreground sm:block">{p.expand?.client?.name}</span>
                <Badge className={`${st.cls} hover:${st.cls} border-0`}>{st.label}</Badge>
                <span className="hidden text-xs text-muted-foreground lg:block">{p.stage || '—'}</span>
                <div className="flex">
                  <Button variant="ghost" size="icon" aria-label="Cronômetro" onClick={() => startTimer(p)}><Timer className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* GRID */}
      {view === 'grid' && filtered.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const st = PROCESS_STATUS[p.status] || PROCESS_STATUS.ativo;
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/restrito/painel/processos/${p.id}`} className="min-w-0 font-semibold text-primary hover:underline">{p.title}</Link>
                  <Badge className={`${st.cls} hover:${st.cls} border-0`}>{st.label}</Badge>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{p.code || '—'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.expand?.client?.name || '—'}{p.area ? ` · ${p.area}` : ''}</p>
                {p.stage && <p className="mt-2 text-xs"><strong>Etapa:</strong> {p.stage}</p>}
                {p.value_cause ? <p className="mt-1 text-xs"><strong>Valor da causa:</strong> {fmtBRL(p.value_cause)}</p> : null}
                {renderCardActions(p)}
              </div>
            );
          })}
        </div>
      )}

      {/* KANBAN com arrastar e soltar */}
      {view === 'kanban' && (
        <div className="mt-6">
          {stages.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma etapa neste funil. Crie etapas em Configurações.</p>}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((st) => {
              const cards = filtered.filter((p) => p.stage_ref === st.id || (!p.stage_ref && p.stage === st.name));
              return (
                <div
                  key={st.id}
                  className="w-72 shrink-0 rounded-2xl border border-border bg-secondary/40 p-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(st.id, st.name)}
                >
                  <div className="mb-3 flex items-center gap-2">
                    {st.color && <span className="inline-block h-3 w-3 rounded-full" style={{ background: st.color }} />}
                    <p className="font-display text-sm font-bold">{st.name}</p>
                    <span className="ml-auto text-xs text-muted-foreground">{cards.length}</span>
                  </div>
                  <div className="space-y-2">
                    {cards.map((p) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDragId(p.id)}
                        onDragEnd={() => setDragId(null)}
                        className={`cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition-opacity active:cursor-grabbing ${dragId === p.id ? 'opacity-40' : ''}`}
                      >
                        <Link to={`/restrito/painel/processos/${p.id}`} className="block text-sm font-semibold text-primary hover:underline">{p.title}</Link>
                        <p className="mt-1 text-xs text-muted-foreground">{p.expand?.client?.name}</p>
                        {p.value_cause ? <p className="mt-1 text-xs text-muted-foreground">{fmtBRL(p.value_cause)}</p> : null}
                        {renderCardActions(p)}
                      </div>
                    ))}
                    {cards.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Solte aqui</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {view === 'dashboard' && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">Total de casos</p><p className="font-display mt-2 text-3xl font-bold">{dash.total}</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">Casos ativos</p><p className="font-display mt-2 text-3xl font-bold text-primary">{dash.byStatus.ativo || 0}</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">Concluídos</p><p className="font-display mt-2 text-3xl font-bold">{dash.byStatus.concluido || 0}</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">Valor total em causa</p><p className="font-display mt-2 text-2xl font-bold">{fmtBRL(dash.valorCausa)}</p></div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display font-bold">Casos por área</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {Object.entries(dash.byArea).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <li key={k} className="flex items-center gap-3">
                  <span className="w-40 truncate">{k}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${dash.total ? (v / dash.total) * 100 : 0}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground">{v}</span>
                </li>
              ))}
              {dash.total === 0 && <li className="text-muted-foreground">Sem dados.</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Modal de cronômetro */}
      <TimerDialog process={timerOpen} onClose={() => setTimerOpen(null)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar processo' : 'Novo processo'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PRC-AAAA-XXXX" /></div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.client || undefined} onValueChange={(v) => setForm({ ...form, client: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.protocol})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Título do caso</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Número (CNJ)</Label>
                <div className="flex gap-2">
                  <Input value={form.number} onChange={(e) => { setForm({ ...form, number: e.target.value }); setCnjPreview(null); }} placeholder="0000000-00.0000.0.00.0000" />
                  <Button type="button" variant="outline" onClick={lookupCnj} disabled={cnjBusy || String(form.number || '').replace(/\D/g, '').length !== 20}>
                    <Search className="mr-1 h-4 w-4" /> {cnjBusy ? 'Buscando…' : 'Buscar'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2"><Label>Área</Label><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Direito Imobiliário" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Foro</Label><Input value={form.foro} onChange={(e) => setForm({ ...form, foro: e.target.value })} /></div>
              <div className="space-y-2"><Label>Comarca</Label><Input value={form.comarca} onChange={(e) => setForm({ ...form, comarca: e.target.value })} /></div>
            </div>
            {cnjPreview?.found && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs">
                <p className="font-semibold text-primary">DataJud localizado · {cnjPreview.movements?.length || 0} andamento(s) prontos para importar</p>
                <p className="mt-1 text-muted-foreground">{[cnjPreview.tribunal, cnjPreview.courtUnit, cnjPreview.class].filter(Boolean).join(' · ')}</p>
                {cnjPreview.parties?.length ? <p className="mt-1 text-muted-foreground">Partes/destinatários recuperados do DJEN ({cnjPreview.djenPublicationsFound || 0} publicação(ões) localizada(s)).</p> : <p className="mt-1 text-muted-foreground">Partes não estão expostas pela API Pública do DataJud e não foram localizadas nas publicações consultadas do DJEN. O campo permanece editável para conferência.</p>}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Tribunal</Label><Input value={form.tribunal || ''} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} /></div>
              <div className="space-y-2"><Label>Partes / destinatários identificados</Label><Textarea rows={2} value={form.parties || ''} onChange={(e) => setForm({ ...form, parties: e.target.value })} placeholder="Preenchido pelo DJEN quando disponível" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Vara / Cartório</Label><Input value={form.vara} onChange={(e) => setForm({ ...form, vara: e.target.value })} /></div>
              <div className="space-y-2"><Label>Valor da causa (R$)</Label><Input type="number" step="0.01" value={form.value_cause} onChange={(e) => setForm({ ...form, value_cause: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Serviços / subserviços</Label><Textarea rows={2} value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="Usucapião extrajudicial, inventário…" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Funil / Esteira</Label>
                <Select value={form.funnel || 'none'} onValueChange={(v) => setForm({ ...form, funnel: v === 'none' ? '' : v, stage_ref: '' })}>
                  <SelectTrigger><SelectValue placeholder="Sem funil" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem funil</SelectItem>
                    {funnels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Etapa atual</Label>
                {form.funnel ? (
                  <Select value={form.stage_ref || 'none'} onValueChange={(v) => setForm({ ...form, stage_ref: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem etapa</SelectItem>
                      {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} placeholder="Etapa livre" />
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={form.responsible || 'none'} onValueChange={(v) => setForm({ ...form, responsible: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {staff.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>SLA (dias)</Label><Input type="number" value={form.sla_days} onChange={(e) => setForm({ ...form, sla_days: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Pasta no Drive (URL)</Label><Input value={form.drive_link} onChange={(e) => setForm({ ...form, drive_link: e.target.value })} placeholder="https://drive.google.com/…" /></div>
            <div className="space-y-2"><Label>Resumo</Label><Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Cronômetro / Time-tracking ---------------- */

function TimerDialog({ process, onClose }) {
  const { user } = useAuth();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [desc, setDesc] = useState('');
  const [billable, setBillable] = useState(true);
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (process) { setSeconds(0); setRunning(false); setDesc(''); setSaved(false); setBillable(true); }
  }, [process]);

  useEffect(() => {
    if (!running) return undefined;
    ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  if (!process) return null;
  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const save = async () => {
    try {
      await pb.collection('time_entries').create({
        process: process.id, user: user?.id || '', description: desc || `Apontamento — ${process.title}`,
        seconds, billable, date: toPbDateOnly(new Date().toISOString().slice(0, 10)),
      });
      setSaved(true);
      setRunning(false);
      setTimeout(onClose, 1200);
    } catch { window.alert('Não foi possível registrar o apontamento.'); }
  };

  return (
    <Dialog open={!!process} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Cronômetro — {process.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="font-display text-center text-4xl font-bold tabular-nums">{hh}:{mm}:{ss}</p>
          <div className="flex justify-center gap-2">
            {!running ? (
              <Button onClick={() => setRunning(true)}><Play className="mr-1 h-4 w-4" /> Iniciar</Button>
            ) : (
              <Button variant="outline" onClick={() => setRunning(false)}><Pause className="mr-1 h-4 w-4" /> Pausar</Button>
            )}
            <Button variant="outline" onClick={() => { setRunning(false); setSeconds(0); }}>Zerar</Button>
          </div>
          <div className="space-y-2"><Label>Descrição</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="O que foi feito" /></div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={billable} onCheckedChange={(v) => setBillable(!!v)} /> Hora faturável</label>
          {saved ? <p className="rounded-lg bg-primary/10 p-3 text-sm text-primary">Apontamento registrado com sucesso.</p> : (
            <Button className="w-full" onClick={save} disabled={seconds === 0}><Clock className="mr-1 h-4 w-4" /> Registrar horas</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Detalhe do processo ---------------- */

export function AdminProcessDetail() {
  const { id } = useParams();
  const [proc, setProc] = useState(null);
  const [data, setData] = useState({ events: [], documents: [], pendencias: [], appointments: [], financial: [], caseNotes: [], timeEntries: [], movements: [] });
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [finEdit, setFinEdit] = useState(null);
  const [finForm, setFinForm] = useState({ description: '', amount: '', due: '', status: 'pendente', type: 'honorario', visible: true });
  const [edit, setEdit] = useState(null); // { kind, id, form }
  const [credOpen, setCredOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [credBusy, setCredBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await pb.collection('processes').getOne(id, { expand: 'client' });
      setProc(p);
      const pf = pb.filter('process = {:pid}', { pid: id });
      const cf = pb.filter('client = {:cid}', { cid: p.client });
      const [events, documents, pendencias, appointments, financial, caseNotes, timeEntries, movements] = await Promise.all([
        pb.collection('events').getFullList({ filter: pf, sort: '-date' }),
        pb.collection('documents').getFullList({ filter: pf, sort: '-created' }),
        pb.collection('pendencias').getFullList({ filter: pf, sort: 'due' }),
        pb.collection('appointments').getFullList({ filter: cf, sort: 'date' }),
        pb.collection('financial').getFullList({ filter: cf, sort: '-due' }),
        pb.collection('case_notes').getFullList({ filter: pf, sort: '-created', expand: 'author' }).catch(() => []),
        pb.collection('time_entries').getFullList({ filter: pf, sort: '-date', expand: 'user' }).catch(() => []),
        pb.collection('process_movements').getFullList({ filter: pf, sort: '-created', expand: 'actor' }).catch(() => []),
      ]);
      setData({ events, documents, pendencias, appointments, financial, caseNotes, timeEntries, movements });
    } catch (_) {
      setProc(false);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (proc === null) return <p className="text-muted-foreground">Carregando…</p>;
  if (proc === false) return <p className="text-destructive">Processo não encontrado.</p>;

  const del = async (collection, rid) => {
    if (!window.confirm('Excluir este registro?')) return;
    await pb.collection(collection).delete(rid);
    load();
  };

  /* ---- Edição genérica de sub-registros (andamentos, pendências, compromissos, documentos, notas) ---- */
  const EDIT_FIELDS = {
    event: [
      { key: 'date', label: 'Data e hora', type: 'datetime-local' },
      { key: 'type', label: 'Tipo', type: 'select', options: Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label })) },
      { key: 'title', label: 'Título', required: true },
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'visible', label: 'Visível no portal', type: 'checkbox' },
      { key: 'cancelled', label: 'Cancelado', type: 'checkbox' },
    ],
    pendencia: [
      { key: 'title', label: 'Título', required: true },
      { key: 'due', label: 'Prazo', type: 'date' },
      { key: 'priority', label: 'Prioridade', type: 'select', options: Object.entries(PRIORITY).map(([value, v]) => ({ value, label: v.label })) },
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'for_client', label: 'Solicitado ao cliente', type: 'checkbox' },
      { key: 'visible', label: 'Visível no portal', type: 'checkbox' },
      { key: 'done', label: 'Concluída', type: 'checkbox' },
    ],
    appointment: [
      { key: 'date', label: 'Data e hora', type: 'datetime-local' },
      { key: 'title', label: 'Título', required: true },
      { key: 'category', label: 'Categoria', type: 'select', options: Object.entries(APPT_CATEGORIES).map(([value, v]) => ({ value, label: v.label })) },
      { key: 'location', label: 'Local' },
      { key: 'meet_link', label: 'Link da sala virtual' },
      { key: 'notes', label: 'Observações', type: 'textarea' },
      { key: 'authorized_client', label: 'Autorizar ao cliente', type: 'checkbox' },
      { key: 'visible', label: 'Visível no portal', type: 'checkbox' },
      { key: 'cancelled', label: 'Cancelado', type: 'checkbox' },
    ],
    document: [
      { key: 'title', label: 'Título', required: true },
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'external_url', label: 'Link externo' },
      { key: 'visible', label: 'Visível ao cliente', type: 'checkbox' },
    ],
    caseNote: [
      { key: 'kind', label: 'Tipo', type: 'select', options: [['atendimento', 'Atendimento / Reunião'], ['parecer', 'Parecer / Estudo'], ['mural', 'Mural interno']].map(([value, label]) => ({ value, label })) },
      { key: 'title', label: 'Título' },
      { key: 'body', label: 'Descrição', type: 'textarea' },
    ],
  };

  const openEdit = (kind, rec) => {
    if (kind === 'event') setEdit({ kind, id: rec.id, form: { date: pbToInput(rec.date), type: rec.type || 'andamento', title: rec.title, description: rec.description || '', visible: rec.visible !== false, cancelled: !!rec.cancelled } });
    else if (kind === 'pendencia') setEdit({ kind, id: rec.id, form: { title: rec.title, due: pbToInputDate(rec.due), priority: rec.priority || 'normal', description: rec.description || '', for_client: !!rec.for_client, visible: rec.visible !== false, done: !!rec.done } });
    else if (kind === 'appointment') setEdit({ kind, id: rec.id, form: { date: pbToInput(rec.date), title: rec.title, category: rec.category || 'audiencia', location: rec.location || '', meet_link: rec.meet_link || '', notes: rec.notes || '', authorized_client: !!rec.authorized_client, visible: rec.visible !== false, cancelled: !!rec.cancelled } });
    else if (kind === 'document') setEdit({ kind, id: rec.id, form: { title: rec.title, description: rec.description || '', external_url: rec.external_url || '', visible: !!rec.visible } });
    else if (kind === 'caseNote') setEdit({ kind, id: rec.id, form: { kind: rec.kind || 'atendimento', title: rec.title || '', body: rec.body || '' } });
  };

  const saveEdit = async (form) => {
    const e = edit;
    if (!e) return;
    if (e.kind === 'event') await pb.collection('events').update(e.id, { title: form.title, description: form.description, type: form.type, date: toPbDate(form.date), visible: form.visible !== false, cancelled: !!form.cancelled });
    else if (e.kind === 'pendencia') await pb.collection('pendencias').update(e.id, { title: form.title, description: form.description, due: toPbDateOnly(form.due) || undefined, priority: form.priority, for_client: !!form.for_client, visible: form.visible !== false, done: !!form.done });
    else if (e.kind === 'appointment') await pb.collection('appointments').update(e.id, { title: form.title, date: toPbDate(form.date), location: form.location, meet_link: form.meet_link, category: form.category, notes: form.notes, authorized_client: !!form.authorized_client, visible: form.visible !== false, cancelled: !!form.cancelled });
    else if (e.kind === 'document') await pb.collection('documents').update(e.id, { title: form.title, description: form.description, external_url: form.external_url, visible: !!form.visible });
    else if (e.kind === 'caseNote') await pb.collection('case_notes').update(e.id, { kind: form.kind, title: form.title, body: form.body });
    setEdit(null);
    load();
  };

  const cancelRecord = async (kind, rec) => {
    if (!window.confirm('Cancelar este registro? Ele permanecerá no histórico marcado como cancelado.')) return;
    const col = kind === 'event' ? 'events' : 'appointments';
    await pb.collection(col).update(rec.id, { cancelled: true });
    load();
  };
  const restoreRecord = async (kind, rec) => {
    const col = kind === 'event' ? 'events' : 'appointments';
    await pb.collection(col).update(rec.id, { cancelled: false });
    load();
  };

  const unpaid = data.financial.filter((f) => f.status !== 'pago' && f.status !== 'cancelado');
  const doArchive = async () => {
    await pb.collection('processes').update(id, { archived: true, status: 'arquivado', stage: 'Arquivo morto' });
    setArchiveOpen(false);
    load();
  };
  const doUnarchive = async () => {
    await pb.collection('processes').update(id, { archived: false, status: 'ativo', stage: '' });
    load();
  };

  const saveFin = async (e) => {
    e.preventDefault();
    const payload = {
      client: proc.client, process: id, description: finForm.description, amount: Number(finForm.amount) || 0,
      due: toPbDateOnly(finForm.due) || undefined, status: finForm.status, type: finForm.type, visible: !!finForm.visible,
    };
    if (finEdit) await pb.collection('financial').update(finEdit.id, payload);
    else await pb.collection('financial').create(payload);
    setFinEdit(null); setFinForm({ description: '', amount: '', due: '', status: 'pendente', type: 'honorario', visible: true });
    load();
  };
  const openFinEdit = (f) => { setFinEdit(f); setFinForm({ description: f.description, amount: f.amount, due: pbToInputDate(f.due), status: f.status, type: f.type || 'honorario', visible: f.visible !== false }); };
  const quitFin = async (f) => { await pb.collection('financial').update(f.id, { status: 'pago' }); load(); };

  const generateClientPassword = async () => {
    if (!proc?.client) return;
    if (!window.confirm('Gerar uma nova senha de acesso ao portal para este cliente? A senha anterior será substituída.')) return;
    setCredBusy(true);
    try {
      const pw = makePassword();
      await pb.collection('clients').update(proc.client, { password: pw, passwordConfirm: pw });
      setNewPassword(pw);
      setCredOpen(true);
    } catch (e) {
      window.alert('Não foi possível gerar a senha: ' + (e?.message || e));
    } finally {
      setCredBusy(false);
    }
  };

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/restrito/painel/processos"><ArrowLeft className="mr-1 h-4 w-4" /> Processos</Link>
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{proc.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cliente: <strong className="text-foreground">{proc.expand?.client?.name}</strong>
            {proc.number ? ` · ${proc.number}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {proc.drive_link && (
            <Button asChild variant="outline">
              <a href={proc.drive_link} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-4 w-4" /> Pasta no Drive</a>
            </Button>
          )}
          {proc.archived ? (
            <Button variant="outline" onClick={doUnarchive}><Archive className="mr-1 h-4 w-4" /> Desarquivar</Button>
          ) : (
            <Button variant="outline" onClick={() => setArchiveOpen(true)}><Archive className="mr-1 h-4 w-4" /> Arquivar</Button>
          )}
        </div>
      </div>

      {proc.expand?.client && (
        <div className="mt-4 rounded-2xl border border-border bg-secondary/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold">Acesso do cliente ao portal</p>
              <p className="mt-1 text-xs text-muted-foreground">
                O cliente acessa o portal em <strong>/portal</strong> usando o <strong>protocolo</strong> como login e uma <strong>senha</strong> gerada pelo sistema.
                A senha é criptografada e não pode ser recuperada — use o botão para gerar uma nova e entregá-la ao cliente.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                <span><span className="text-muted-foreground">Protocolo (login):</span> <strong className="font-mono">{proc.expand.client.protocol}</strong></span>
                <span><span className="text-muted-foreground">E-mail:</span> {proc.expand.client.email || '—'}</span>
                <span><span className="text-muted-foreground">Portal:</span> <Link to="/portal" className="text-primary hover:underline">/portal</Link></span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={generateClientPassword} disabled={credBusy}>
              <KeyRound className="mr-1 h-4 w-4" /> {credBusy ? 'Gerando…' : 'Gerar nova senha'}
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="andamentos" className="mt-6">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="andamentos">Andamentos</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
          <TabsTrigger value="compromissos">Compromissos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="atendimentos">Atendimentos & Notas</TabsTrigger>
          <TabsTrigger value="apontamentos">Apontamentos</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="andamentos" className="mt-6">
          <InlineForm
            onSubmit={async (f) => {
              await pb.collection('events').create({ process: id, title: f.title, description: f.description, type: f.type, date: toPbDate(f.date), visible: f.visible !== false });
              load();
            }}
            submitLabel="Adicionar andamento"
            fields={[
              { key: 'date', label: 'Data', type: 'date' },
              { key: 'type', label: 'Tipo', type: 'select', options: Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label })), initial: 'andamento' },
              { key: 'title', label: 'Título', required: true },
              { key: 'description', label: 'Descrição', type: 'textarea' },
              { key: 'visible', label: 'Visível no portal', type: 'checkbox', initial: true },
            ]}
          />
          <ul className="mt-6 space-y-3">
            {data.events.map((ev) => (
              <li key={ev.id} className={`flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 ${ev.cancelled ? 'opacity-60' : ''}`}>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{fmtDateTime(ev.date)} · {EVENT_TYPES[ev.type] || 'Andamento'} · {ev.visible === false ? 'oculto' : 'visível'}{ev.cancelled ? ' · cancelado' : ''}</p>
                  <p className={`mt-1 text-sm font-semibold ${ev.cancelled ? 'line-through' : ''}`}>{ev.title}</p>
                  {ev.description && <p className="mt-1 text-xs text-muted-foreground">{ev.description}</p>}
                </div>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="sm" onClick={async () => { await pb.collection('events').update(ev.id, { visible: ev.visible === false }); load(); }}>
                    {ev.visible === false ? 'Mostrar' : 'Ocultar'}
                  </Button>
                  {ev.cancelled
                    ? <Button variant="ghost" size="sm" onClick={() => restoreRecord('event', ev)}>Restaurar</Button>
                    : <Button variant="ghost" size="sm" onClick={() => cancelRecord('event', ev)}>Cancelar</Button>}
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit('event', ev)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => del('events', ev.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <DocumentForm processId={id} onSaved={load} />
          <ul className="mt-6 space-y-3">
            {data.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.file ? 'Arquivo enviado' : doc.external_url ? 'Link externo' : 'Sem anexo'} · {doc.visible ? 'visível ao cliente' : 'oculto'}
                  </p>
                  {doc.description && <p className="mt-1 truncate text-xs text-muted-foreground">{doc.description}</p>}
                </div>
                <div className="flex shrink-0">
                  {(doc.file || doc.external_url) && (
                    <Button variant="ghost" size="icon" aria-label="Abrir" onClick={async () => {
                      if (doc.external_url) return window.open(doc.external_url, '_blank', 'noopener');
                      const token = await pb.files.getToken();
                      window.open(`${pb.files.getURL(doc, doc.file)}?token=${token}`, '_blank', 'noopener');
                    }}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit('document', doc)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => del('documents', doc.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="pendencias" className="mt-6">
          <InlineForm
            fields={[
              { key: 'title', label: 'Título', required: true },
              { key: 'due', label: 'Prazo', type: 'date' },
              { key: 'priority', label: 'Prioridade', type: 'select', options: Object.entries(PRIORITY).map(([value, v]) => ({ value, label: v.label })), initial: 'normal' },
              { key: 'description', label: 'Descrição', type: 'textarea' },
              { key: 'for_client', label: 'Solicitado ao cliente', type: 'checkbox' },
              { key: 'visible', label: 'Visível no portal', type: 'checkbox', initial: true },
            ]}
            onSubmit={async (f) => {
              await pb.collection('pendencias').create({ process: id, title: f.title, description: f.description, due: toPbDateOnly(f.due) || undefined, priority: f.priority, for_client: !!f.for_client, done: false, visible: f.visible !== false });
              load();
            }}
            submitLabel="Adicionar pendência"
          />
          <ul className="mt-6 space-y-3">
            {data.pendencias.map((p) => {
              const pr = PRIORITY[p.priority] || PRIORITY.normal;
              return (
                <li key={p.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <button
                    aria-label="Alternar concluída"
                    onClick={async () => { await pb.collection('pendencias').update(p.id, { done: !p.done }); load(); }}
                  >
                    {p.done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-accent" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${p.done ? 'text-muted-foreground line-through' : ''}`}>{p.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.due ? `Prazo: ${fmtDate(p.due)}` : 'Sem prazo'}{p.for_client ? ' · solicitado ao cliente' : ''} · <Badge className={`${pr.cls} hover:${pr.cls} border-0`}>{pr.label}</Badge>
                    </p>
                    {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit('pendencia', p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => del('pendencias', p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </li>
              );
            })}
          </ul>
        </TabsContent>

        <TabsContent value="compromissos" className="mt-6">
          <InlineForm
            fields={[
              { key: 'date', label: 'Data e hora', type: 'datetime-local' },
              { key: 'title', label: 'Título', required: true },
              { key: 'category', label: 'Categoria', type: 'select', options: Object.entries(APPT_CATEGORIES).map(([value, v]) => ({ value, label: v.label })), initial: 'audiencia' },
              { key: 'location', label: 'Local' },
              { key: 'meet_link', label: 'Link da sala virtual' },
              { key: 'notes', label: 'Observações', type: 'textarea' },
              { key: 'authorized_client', label: 'Autorizar ao cliente', type: 'checkbox', initial: true },
              { key: 'visible', label: 'Visível no portal', type: 'checkbox', initial: true },
            ]}
            onSubmit={async (f) => {
              await pb.collection('appointments').create({ client: proc.client, title: f.title, date: toPbDate(f.date), location: f.location, meet_link: f.meet_link, category: f.category, notes: f.notes, authorized_client: !!f.authorized_client, visible: f.visible !== false });
              load();
            }}
            submitLabel="Adicionar compromisso"
          />
          <ul className="mt-6 space-y-3">
            {data.appointments.map((a) => {
              const cat = APPT_CATEGORIES[a.category] || APPT_CATEGORIES.audiencia;
              return (
                <li key={a.id} className={`flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 ${a.cancelled ? 'opacity-60' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold ${a.cancelled ? 'line-through' : ''}`}>{a.title}</p>
                      <Badge className={`${cat.cls} hover:${cat.cls} border-0`}>{cat.label}</Badge>
                      {a.cancelled && <Badge variant="outline" className="text-destructive">Cancelado</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(a.date)}{a.location ? ` · ${a.location}` : ''}</p>
                    {a.meet_link && <a href={a.meet_link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">Entrar na sala virtual →</a>}
                    {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
                  </div>
                  <div className="flex shrink-0">
                    {a.cancelled
                      ? <Button variant="ghost" size="sm" onClick={() => restoreRecord('appointment', a)}>Restaurar</Button>
                      : <Button variant="ghost" size="sm" onClick={() => cancelRecord('appointment', a)}>Cancelar</Button>}
                    <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit('appointment', a)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => del('appointments', a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-6">
          <form onSubmit={saveFin} className="rounded-2xl border border-border bg-card p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label>Descrição</Label><Input value={finForm.description} onChange={(e) => setFinForm({ ...finForm, description: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={finForm.amount} onChange={(e) => setFinForm({ ...finForm, amount: e.target.value })} /></div>
              <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={finForm.due} onChange={(e) => setFinForm({ ...finForm, due: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={finForm.type} onValueChange={(v) => setFinForm({ ...finForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIN_TYPE).map(([value, v]) => <SelectItem key={value} value={value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={finForm.status} onValueChange={(v) => setFinForm({ ...finForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIN_STATUS).map(([value, v]) => <SelectItem key={value} value={value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 pt-2 text-sm"><Checkbox checked={!!finForm.visible} onCheckedChange={(v) => setFinForm({ ...finForm, visible: !!v })} /> Visível ao cliente</label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="submit" size="sm"><Plus className="mr-1 h-4 w-4" /> {finEdit ? 'Salvar alteração' : 'Adicionar lançamento'}</Button>
              {finEdit && <Button type="button" size="sm" variant="outline" onClick={() => { setFinEdit(null); setFinForm({ description: '', amount: '', due: '', status: 'pendente', type: 'honorario', visible: true }); }}>Cancelar</Button>}
            </div>
          </form>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.financial.map((f) => {
                  const st = FIN_STATUS[f.status] || FIN_STATUS.pendente;
                  const ft = FIN_TYPE[f.type] || FIN_TYPE.honorario;
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.description}{!f.visible && <span className="ml-2 text-xs text-muted-foreground">(oculto)</span>}</TableCell>
                      <TableCell><Badge className={`${ft.cls} hover:${ft.cls} border-0`}>{ft.label}</Badge></TableCell>
                      <TableCell>{fmtDate(f.due)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(f.amount)}</TableCell>
                      <TableCell><Badge className={`${st.cls} hover:${st.cls} border-0`}>{st.label}</Badge></TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {f.status !== 'pago' && <Button variant="ghost" size="sm" onClick={() => quitFin(f)}>Quitar</Button>}
                        <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openFinEdit(f)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => del('financial', f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {data.financial.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhum lançamento.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="atendimentos" className="mt-6">
          <CaseNoteForm processId={id} onSaved={load} />
          <ul className="mt-6 space-y-3">
            {data.caseNotes.map((n) => (
              <li key={n.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{fmtDateTime(n.created)} · {n.expand?.author?.name || '—'} · {n.kind || 'atendimento'}</p>
                    {n.title && <p className="mt-1 text-sm font-semibold">{n.title}</p>}
                    {n.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>}
                  </div>
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit('caseNote', n)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => del('case_notes', n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </li>
            ))}
            {data.caseNotes.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum atendimento ou nota registrada.</p>}
          </ul>
        </TabsContent>

        <TabsContent value="apontamentos" className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead>Faturável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.timeEntries.map((t) => {
                  const hh = String(Math.floor((t.seconds || 0) / 3600)).padStart(2, '0');
                  const mm = String(Math.floor(((t.seconds || 0) % 3600) / 60)).padStart(2, '0');
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{fmtDate(t.date)}</TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell>{t.expand?.user?.name || '—'}</TableCell>
                      <TableCell className="text-right font-mono">{hh}:{mm}</TableCell>
                      <TableCell>{t.billable ? <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/10">Sim</Badge> : <Badge variant="outline">Não</Badge>}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => del('time_entries', t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  );
                })}
                {data.timeEntries.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhum apontamento. Use o cronômetro na lista de processos.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-6">
          <p className="mb-4 text-sm text-muted-foreground">Histórico de mudanças de etapa (rastreabilidade). Cada movimentação no Kanban é registrada automaticamente e espelhada na linha do tempo do Portal do Cliente.</p>
          <ol className="relative space-y-4 border-l-2 border-border pl-6">
            {data.movements.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</li>}
            {data.movements.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                <p className="text-xs text-muted-foreground">{fmtDateTime(m.created)}{m.expand?.actor?.name ? ` · por ${m.expand.actor.name}` : ''}</p>
                <p className="mt-1 text-sm font-semibold">
                  {m.from_stage || '—'} <span className="text-muted-foreground">→</span> <strong className="text-primary">{m.to_stage || '—'}</strong>
                </p>
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Archive className="h-5 w-5" /> Arquivar processo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">O processo será movido para o arquivo morto e seu status passará para <strong>Arquivado</strong>.</p>
            {unpaid.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div className="text-sm">
                  <p className="font-semibold text-accent">Atenção: {unpaid.length} lançamento(s) não pago(s)</p>
                  <p className="mt-1 text-muted-foreground">Total em aberto: <strong>{fmtBRL(unpaid.reduce((s, f) => s + (Number(f.amount) || 0), 0))}</strong></p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancelar</Button>
              <Button onClick={doArchive}><Archive className="mr-1 h-4 w-4" /> Arquivar mesmo assim</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Senha de acesso ao portal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
              <p className="font-semibold text-accent">Anote e entregue ao cliente — a senha não será exibida novamente.</p>
            </div>
            <div className="space-y-2">
              <Label>Protocolo (login)</Label>
              <Input readOnly value={proc.expand?.client?.protocol || ''} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Senha gerada</Label>
              <div className="flex gap-2">
                <Input readOnly value={newPassword} className="font-mono" />
                <Button type="button" variant="outline" onClick={() => { navigator.clipboard?.writeText(newPassword); }}>Copiar</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">O cliente entra em <strong>/portal</strong>, digita o protocolo acima e esta senha.</p>
            <div className="flex justify-end">
              <Button onClick={() => setCredOpen(false)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditRecordDialog
        open={!!edit}
        title={edit ? ({ event: 'Editar andamento', pendencia: 'Editar pendência', appointment: 'Editar compromisso', document: 'Editar documento', caseNote: 'Editar atendimento / nota' }[edit.kind]) : ''}
        fields={edit ? EDIT_FIELDS[edit.kind] : []}
        initial={edit?.form}
        onClose={() => setEdit(null)}
        onSave={saveEdit}
      />
    </div>
  );
}

function CaseNoteForm({ processId, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ kind: 'atendimento', title: '', body: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await pb.collection('case_notes').create({ process: processId, author: user?.id || '', kind: form.kind, title: form.title, body: form.body });
      setForm({ kind: 'atendimento', title: '', body: '' });
      onSaved();
    } catch { window.alert('Não foi possível salvar.'); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="atendimento">Atendimento / Reunião</SelectItem>
              <SelectItem value="parecer">Parecer / Estudo</SelectItem>
              <SelectItem value="mural">Mural interno</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      </div>
      <div className="mt-4 space-y-2"><Label>Descrição</Label><Textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
      <Button type="submit" size="sm" className="mt-4" disabled={busy}><Plus className="mr-1 h-4 w-4" /> {busy ? 'Salvando…' : 'Registrar'}</Button>
    </form>
  );
}

function FieldInput({ f, value, onChange }) {
  if (f.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 pt-2 text-sm">
        <Checkbox checked={!!value} onCheckedChange={(v) => onChange(!!v)} />
        {f.label}
      </label>
    );
  }
  if (f.type === 'select') {
    return (
      <>
        <Label>{f.label}</Label>
        <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {f.optional && <SelectItem value="none">—</SelectItem>}
            {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </>
    );
  }
  if (f.type === 'textarea') {
    return (
      <>
        <Label>{f.label}</Label>
        <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      </>
    );
  }
  return (
    <>
      <Label>{f.label}</Label>
      <Input
        type={f.type || 'text'}
        step={f.type === 'number' ? '0.01' : undefined}
        value={value}
        required={f.required}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}

function InlineForm({ fields, onSubmit, submitLabel }) {
  const initial = Object.fromEntries(fields.map((f) => [f.key, f.initial ?? (f.type === 'checkbox' ? false : '')]));
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(form);
      setForm(initial);
    } catch (_) {
      window.alert('Não foi possível salvar. Verifique os campos.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={`space-y-2 ${f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
            <FieldInput f={f} value={form[f.key]} onChange={(v) => setForm({ ...form, [f.key]: v })} />
          </div>
        ))}
      </div>
      <Button type="submit" size="sm" className="mt-4" disabled={busy}>
        <Plus className="mr-1 h-4 w-4" /> {busy ? 'Salvando…' : submitLabel}
      </Button>
    </form>
  );
}

/* Diálogo genérico de edição para andamentos, pendências, compromissos,
   documentos e atendimentos/notas. Recebe a config de campos e o callback. */
function EditRecordDialog({ open, title, fields, initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || {});
  const [busy, setBusy] = useState(false);
  useEffect(() => { setForm(initial || {}); }, [initial]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSave(form); }
    catch (_) { window.alert('Não foi possível salvar. Verifique os campos.'); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={`space-y-2 ${f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                <FieldInput f={f} value={form[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
              </div>
            ))}
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DocumentForm({ processId, onSaved }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('process', processId);
      fd.append('title', title);
      fd.append('description', description);
      fd.append('visible', visible ? 'true' : 'false');
      if (file) fd.append('file', file);
      else if (url) fd.append('external_url', url);
      await pb.collection('documents').create(fd);
      setTitle(''); setDescription(''); setUrl(''); setFile(null); setVisible(true);
      onSaved();
    } catch (_) {
      window.alert('Não foi possível salvar o documento.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="space-y-2"><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="space-y-2"><Label>Arquivo (PDF, imagem…)</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        <div className="space-y-2"><Label>ou link externo</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
        <label className="flex items-center gap-2 pt-2 text-sm">
          <Checkbox checked={visible} onCheckedChange={(v) => setVisible(!!v)} /> Visível ao cliente
        </label>
      </div>
      <Button type="submit" size="sm" className="mt-4" disabled={busy}>
        <Plus className="mr-1 h-4 w-4" /> {busy ? 'Salvando…' : 'Adicionar documento'}
      </Button>
    </form>
  );
}

/* ---------------- Link da Bio ---------------- */

const EMPTY_LINK = { title: '', url: '', type: 'link', order: 0, active: true, color: '' };

export function AdminBioLinks() {
  const [links, setLinks] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_LINK);

  const load = useCallback(() => {
    pb.collection('bio_links').getFullList({ sort: 'order' }).then(setLinks).catch(() => setLinks([]));
  }, []);
  useEffect(load, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY_LINK); setOpen(true); };
  const openEdit = (l) => { setEditing(l); setForm({ title: l.title, url: l.url, type: l.type || 'link', order: l.order || 0, active: !!l.active, color: l.color || '' }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, order: Number(form.order) || 0 };
    if (editing) await pb.collection('bio_links').update(editing.id, payload);
    else await pb.collection('bio_links').create(payload);
    setOpen(false);
    load();
  };

  const remove = async (l) => {
    if (!window.confirm(`Excluir o link "${l.title}"?`)) return;
    await pb.collection('bio_links').delete(l.id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Link da Bio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Página pública em <Link to="/links" className="text-primary underline">/links</Link>
          </p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo link</Button>
      </div>
      <ul className="mt-6 space-y-3">
        {links === null && <li className="text-sm text-muted-foreground">Carregando…</li>}
        {(links || []).map((l) => (
          <li key={l.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{l.title}</p>
              <p className="truncate text-xs text-muted-foreground">{l.url} · {l.type} · ordem {l.order}</p>
            </div>
            <Badge className={l.active ? 'bg-primary/10 text-primary border-0 hover:bg-primary/10' : 'bg-muted text-muted-foreground border-0 hover:bg-muted'}>
              {l.active ? 'Ativo' : 'Inativo'}
            </Badge>
            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove(l)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar link' : 'Novo link'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://… ou /blog" required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="ebook">E-book</SelectItem>
                    <SelectItem value="social">Rede social</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Cor do botão (opcional)</Label>
              <div className="flex gap-2">
                <Input type="color" className="h-10 w-14 p-1" value={form.color || '#1f5c45'} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#1f5c45 ou vazio" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} /> Ativo (visível publicamente)
            </label>
            <Button type="submit" className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
