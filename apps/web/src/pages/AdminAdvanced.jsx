import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext';
import { fmtDate, fmtDateTime, fmtBRL, toPbDate, toPbDateOnly, APPT_CATEGORIES } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Trash2, Pencil, CalendarDays, LayoutDashboard,
  CheckCircle2, Circle, KeyRound, CalendarPlus, Download,
  ChevronLeft, ChevronRight, Loader2, RefreshCw, Eye,
} from 'lucide-react';

const ROLES = [
  { value: 'owner', label: 'Owner (proprietário)' },
  { value: 'admin', label: 'Administrador' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'leitura', label: 'Somente leitura' },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

/* ============================ Usuários ============================ */

const EMPTY_USER = { name: '', email: '', role: 'operacional', password: '', active: true, oab_number: '', oab_uf: '' };

export function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_USER);
  const [error, setError] = useState('');
  const [pwOpen, setPwOpen] = useState(null);
  const [newPw, setNewPw] = useState('');

  const load = useCallback(() => {
    pb.collection('users').getFullList({ sort: 'name' }).then(setUsers).catch(() => setUsers([]));
  }, []);
  useEffect(load, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY_USER); setError(''); setOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name || '', email: u.email || '', role: u.role || 'leitura', password: '', active: u.active !== false, oab_number: u.oab_number || '', oab_uf: u.oab_uf || '' });
    setError('');
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        const data = { name: form.name, role: form.role, active: !!form.active, oab_number: form.oab_number, oab_uf: form.oab_uf.toUpperCase().slice(0, 2) };
        if (form.password) { data.password = form.password; data.passwordConfirm = form.password; }
        await pb.collection('users').update(editing.id, data);
      } else {
        await pb.collection('users').create({
          name: form.name, email: form.email, role: form.role, active: !!form.active,
          oab_number: form.oab_number, oab_uf: form.oab_uf.toUpperCase().slice(0, 2),
          password: form.password, passwordConfirm: form.password, verified: true,
        });
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar (e-mail único; senha 10+ caracteres).');
    }
  };

  const toggleActive = async (u) => {
    await pb.collection('users').update(u.id, { active: u.active === false });
    load();
  };

  const resetPw = async () => {
    if (!pwOpen || newPw.length < 10) { setError('A senha precisa de 10+ caracteres.'); return; }
    try {
      await pb.collection('users').update(pwOpen.id, { password: newPw, passwordConfirm: newPw });
      setPwOpen(null); setNewPw(''); setError('');
    } catch (err) {
      setError(err?.message || 'Não foi possível redefinir a senha.');
    }
  };

  const remove = async (u) => {
    if (u.id === me?.id) { window.alert('Você não pode excluir sua própria conta.'); return; }
    if (!window.confirm(`Excluir o usuário ${u.name || u.email}?`)) return;
    await pb.collection('users').delete(u.id);
    load();
  };

  return (
    <div>
      <Helmet><title>Usuários — Área Restrita</title><meta name="description" content="Gestão de usuários e permissões." /></Helmet>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Usuários e permissões</h1>
          <p className="mt-1 text-sm text-muted-foreground">Equipe interna com acesso à área restrita.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo usuário</Button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="hidden md:table-cell">OAB</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users === null && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Carregando…</TableCell></TableRow>}
            {users !== null && users.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhum usuário.</TableCell></TableRow>}
            {(users || []).map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name || '—'}{u.id === me?.id && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}</TableCell>
                <TableCell className="hidden sm:table-cell">{u.email}</TableCell>
                <TableCell><Badge variant="outline">{ROLE_LABEL[u.role] || u.role || '—'}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{u.oab_number ? `${u.oab_number}/${u.oab_uf || ''}` : '—'}</TableCell>
                <TableCell>
                  <Badge className={u.active !== false ? 'bg-primary/10 text-primary border-0 hover:bg-primary/10' : 'bg-muted text-muted-foreground border-0 hover:bg-muted'}>
                    {u.active !== false ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Redefinir senha" onClick={() => { setPwOpen(u); setNewPw(''); setError(''); }}><KeyRound className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Ativar/desativar" onClick={() => toggleActive(u)}><CheckCircle2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar usuário' : 'Novo usuário'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} /></div>
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label>OAB (número)</Label>
                <Input value={form.oab_number} onChange={(e) => setForm({ ...form, oab_number: e.target.value })} placeholder="123456" />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input value={form.oab_uf} onChange={(e) => setForm({ ...form, oab_uf: e.target.value.toUpperCase().slice(0, 2) })} placeholder="MG" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">A OAB identifica o advogado responsável pelos processos.</p>
            <div className="space-y-2">
              <Label>{editing ? 'Nova senha (deixe em branco para manter)' : 'Senha (mín. 10 caracteres)'}</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} minLength={editing ? 0 : 10} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} /> Ativo
            </label>
            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwOpen} onOpenChange={(v) => !v && setPwOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redefinir senha — {pwOpen?.name || pwOpen?.email}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nova senha (mín. 10 caracteres)</Label><Input type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={resetPw}>Redefinir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissões e visibilidade de dados */}
      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Permissões e visibilidade de dados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada usuário enxerga somente os processos, lançamentos financeiros, pendências, compromissos e
          apontamentos dos quais é responsável. Somente o <strong>administrador master (Owner)</strong> vê
          todos os registros do escritório. O isolamento é enforced pelas regras de acesso do banco de dados.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perfil</TableHead>
                <TableHead>Processos</TableHead>
                <TableHead>Financeiro / Livros</TableHead>
                <TableHead>Auditoria / LGPD</TableHead>
                <TableHead>Criar registros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Owner (master)</TableCell>
                <TableCell>Todos</TableCell>
                <TableCell>Todos</TableCell>
                <TableCell>Sim</TableCell>
                <TableCell>Sim</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Administrador</TableCell>
                <TableCell>Somente os seus</TableCell>
                <TableCell>Somente os seus</TableCell>
                <TableCell>—</TableCell>
                <TableCell>Sim</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Financeiro</TableCell>
                <TableCell>Somente os seus</TableCell>
                <TableCell>Somente os seus</TableCell>
                <TableCell>—</TableCell>
                <TableCell>Sim</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Operacional</TableCell>
                <TableCell>Somente os seus</TableCell>
                <TableCell>Somente os seus</TableCell>
                <TableCell>—</TableCell>
                <TableCell>Sim</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Somente leitura</TableCell>
                <TableCell>Somente os seus</TableCell>
                <TableCell>Somente os seus</TableCell>
                <TableCell>—</TableCell>
                <TableCell>—</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Todas as criações, edições e exclusões continuam registradas no log de auditoria imutável.
        </p>
      </div>
    </div>
  );
}

/* ============================ Auditoria ============================ */

export function AdminAudit() {
  const [rows, setRows] = useState(null);
  const [lgpd, setLgpd] = useState([]);
  const [col, setCol] = useState('all');
  const [action, setAction] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    let filter = '';
    const parts = [];
    if (col !== 'all') parts.push(`collection = "${col}"`);
    if (action !== 'all') parts.push(`action = "${action}"`);
    if (parts.length) filter = parts.join(' && ');
    pb.collection('audit_logs').getList(1, 100, { sort: '-created', filter, expand: 'actor' })
      .then((r) => setRows(r.items)).catch(() => setRows([]));
    pb.collection('lgpd_logs').getList(1, 50, { sort: '-created' })
      .then((r) => setLgpd(r.items)).catch(() => setLgpd([]));
  }, [col, action]);
  useEffect(load, [load]);

  const cols = ['posts', 'clients', 'processes', 'events', 'documents', 'pendencias', 'appointments', 'financial', 'ledger', 'funnels', 'funnel_stages', 'bio_links', 'users', 'notifications', 'site_settings', 'subtasks'];

  const pretty = (s) => {
    if (!s) return '—';
    try { return JSON.stringify(JSON.parse(s), null, 2); } catch (_) { return s; }
  };

  return (
    <div>
      <Helmet><title>Auditoria — Área Restrita</title><meta name="description" content="Histórico de alterações no sistema." /></Helmet>
      <h1 className="font-display text-2xl font-bold tracking-tight">Auditoria</h1>
      <p className="mt-1 text-sm text-muted-foreground">Histórico imutável de criações, edições e exclusões (antes/depois).</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Select value={col} onValueChange={setCol}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Coleção" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as coleções</SelectItem>
            {cols.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            <SelectItem value="create">Criação</SelectItem>
            <SelectItem value="update">Edição</SelectItem>
            <SelectItem value="delete">Exclusão</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="hidden sm:table-cell">Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Coleção</TableHead>
              <TableHead>Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Carregando…</TableCell></TableRow>}
            {rows !== null && rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum registro.</TableCell></TableRow>}
            {(rows || []).map((r) => (
              <React.Fragment key={r.id}>
                <TableRow className="cursor-pointer hover:bg-secondary/50" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(r.created)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{r.expand?.actor?.name || r.expand?.actor?.email || '—'}</TableCell>
                  <TableCell>
                    <Badge className={
                      r.action === 'create' ? 'bg-primary/10 text-primary border-0 hover:bg-primary/10'
                      : r.action === 'delete' ? 'bg-destructive/10 text-destructive border-0 hover:bg-destructive/10'
                      : 'bg-accent/15 text-accent border-0 hover:bg-accent/15'
                    }>{r.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.collection}</TableCell>
                  <TableCell className="font-mono text-xs">{r.record_id}</TableCell>
                </TableRow>
                {expanded === r.id && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-secondary/30">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Antes</p>
                          <pre className="max-h-72 overflow-auto rounded-lg bg-background p-3 text-xs">{pretty(r.before)}</pre>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Depois</p>
                          <pre className="max-h-72 overflow-auto rounded-lg bg-background p-3 text-xs">{pretty(r.after)}</pre>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Registro LGPD</h2>
        <p className="mt-1 text-sm text-muted-foreground">Operações com dados pessoais realizadas pelo cliente via portal (ex.: upload de documentos).</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Quem</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Coleção</TableHead>
                <TableHead>Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lgpd.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum registro LGPD.</TableCell></TableRow>}
              {lgpd.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(l.created)}</TableCell>
                  <TableCell className="text-sm">{l.actor || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                  <TableCell className="text-xs">{l.collection_name || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.detail || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function AdminDRE() {
  const [ledger, setLedger] = useState([]);
  const [financial, setFinancial] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [book, setBook] = useState('all');

  useEffect(() => {
    pb.collection('ledger').getFullList({ sort: '-date' }).then(setLedger).catch(() => setLedger([]));
    pb.collection('financial').getFullList({ expand: 'client' }).then(setFinancial).catch(() => setFinancial([]));
  }, []);

  const filtered = useMemo(() => {
    const within = (date) => {
      if (from && date && date < toPbDate(from)) return false;
      if (to && date && date > toPbDate(to)) return false;
      return true;
    };
    const ledgerRows = ledger.filter((r) => (book !== 'all' && r.book !== book ? false : within(r.date)));
    // Inclui honorários/despesas dos casos (financial) no DRE do escritório
    const finRows = financial
      .filter((f) => within(f.due || f.created))
      .map((f) => ({ ...f, date: f.due || f.created, type: f.type === 'despesa' || f.type === 'custas' ? 'despesa' : 'receita', category: 'Honorários do caso', book: 'escritorio' }));
    return [...ledgerRows, ...finRows];
  }, [ledger, financial, from, to, book]);

  const dre = useMemo(() => {
    const byCat = {};
    let receita = 0, despesa = 0, prolabore = 0, transferencia = 0;
    filtered.forEach((r) => {
      const a = Number(r.amount) || 0;
      if (r.status !== 'pago') return;
      const cat = r.category || 'Sem categoria';
      byCat[cat] = (byCat[cat] || 0) + a;
      if (r.type === 'receita') receita += a;
      else if (r.type === 'despesa') despesa += a;
      else if (r.type === 'prolabore') prolabore += a;
      else if (r.type === 'transferencia') transferencia += a;
    });
    return { byCat, receita, despesa, prolabore, transferencia, resultado: receita - despesa - prolabore };
  }, [filtered]);

  const monthly = useMemo(() => {
    const m = {};
    filtered.forEach((r) => {
      if (!r.date) return;
      const key = String(r.date).slice(0, 7);
      if (!m[key]) m[key] = { receita: 0, despesa: 0, prolabore: 0, transferencia: 0 };
      const a = Number(r.amount) || 0;
      if (r.status !== 'pago') return;
      if (r.type === 'receita') m[key].receita += a;
      else if (r.type === 'despesa') m[key].despesa += a;
      else if (r.type === 'prolabore') m[key].prolabore += a;
      else if (r.type === 'transferencia') m[key].transferencia += a;
    });
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const receivables = useMemo(() => {
    let aReceber = 0, recebido = 0, vencido = 0;
    financial.forEach((f) => {
      const a = Number(f.amount) || 0;
      if (f.status === 'pago') recebido += a;
      else if (f.status === 'vencido') { vencido += a; aReceber += a; }
      else if (f.status === 'pendente') aReceber += a;
    });
    return { aReceber, recebido, vencido };
  }, [financial]);

  const exportDRE = () => {
    const rows = [['DRE — Demonstrativo', ''], ['Período', `${from || 'início'} a ${to || 'hoje'}`], ['Livro', book === 'all' ? 'Todos' : book], []];
    rows.push(['Receitas pagas', dre.receita], ['Despesas pagas', dre.despesa], ['Pró-labore', dre.prolabore], ['Transferências', dre.transferencia], ['Resultado', dre.resultado], []);
    rows.push(['Por categoria', '']);
    Object.entries(dre.byCat).forEach(([k, v]) => rows.push([k, v]));
    rows.push([], ['Mês', 'Receita', 'Despesa', 'Pró-labore', 'Transferência']);
    monthly.forEach(([k, v]) => rows.push([k, v.receita, v.despesa, v.prolabore, v.transferencia]));
    downloadCSV(`dre-${Date.now()}.csv`, rows);
  };

  return (
    <div>
      <Helmet><title>DRE & Relatórios — Área Restrita</title><meta name="description" content="Demonstrativo financeiro e relatórios." /></Helmet>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">DRE & Relatórios</h1>
        <Button variant="outline" onClick={exportDRE}><Download className="mr-1 h-4 w-4" /> Exportar CSV</Button>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-2"><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-2"><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Livro</Label>
          <Select value={book} onValueChange={setBook}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="escritorio">Escritório</SelectItem>
              <SelectItem value="pessoal">Pessoal / Pró-labore</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Receitas pagas', value: dre.receita, cls: 'text-primary' },
          { label: 'Despesas pagas', value: dre.despesa, cls: 'text-destructive' },
          { label: 'Pró-labore', value: dre.prolabore, cls: 'text-accent' },
          { label: 'Resultado', value: dre.resultado, cls: dre.resultado >= 0 ? 'text-primary' : 'text-destructive' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className={`font-display mt-2 text-2xl font-bold ${m.cls}`}>{fmtBRL(m.value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display font-bold">Despesas por categoria</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.entries(dre.byCat).filter(([, v]) => v).length === 0 && <li className="text-muted-foreground">Sem dados no período.</li>}
            {Object.entries(dre.byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between border-b border-border pb-2">
                <span>{k}</span><span className="font-medium">{fmtBRL(v)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display font-bold">Contas a receber (clientes)</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center justify-between border-b border-border pb-2"><span>Total a receber</span><span className="font-medium text-accent">{fmtBRL(receivables.aReceber)}</span></li>
            <li className="flex items-center justify-between border-b border-border pb-2"><span>Vencido</span><span className="font-medium text-destructive">{fmtBRL(receivables.vencido)}</span></li>
            <li className="flex items-center justify-between"><span>Recebido</span><span className="font-medium text-primary">{fmtBRL(receivables.recebido)}</span></li>
          </ul>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Mês</TableHead><TableHead className="text-right">Receita</TableHead><TableHead className="text-right">Despesa</TableHead><TableHead className="text-right">Pró-labore</TableHead><TableHead className="text-right">Transferência</TableHead><TableHead className="text-right">Resultado</TableHead></TableRow></TableHeader>
          <TableBody>
            {monthly.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Sem lançamentos no período.</TableCell></TableRow>}
            {monthly.map(([k, v]) => (
              <TableRow key={k}>
                <TableCell className="font-medium">{k}</TableCell>
                <TableCell className="text-right">{fmtBRL(v.receita)}</TableCell>
                <TableCell className="text-right">{fmtBRL(v.despesa)}</TableCell>
                <TableCell className="text-right">{fmtBRL(v.prolabore)}</TableCell>
                <TableCell className="text-right">{fmtBRL(v.transferencia)}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(v.receita - v.despesa - v.prolabore)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ============================ Agenda + Tarefas ============================ */

function gcalLink(title, startISO, durationMin, description, location) {
  if (!startISO) return '';
  const dt = new Date(String(startISO).replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return '';
  const end = new Date(dt.getTime() + (durationMin || 60) * 60000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const p = (s) => encodeURIComponent(s || '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${p(title)}&dates=${fmt(dt)}/${fmt(end)}&details=${p(description)}&location=${p(location)}`;
}

async function pushAppointmentToGoogle(appointment) {
  const token = window.sessionStorage.getItem('jd_google_access_token');
  const calendarId = window.sessionStorage.getItem('jd_google_calendar_id');
  if (!token || !calendarId || !appointment?.date) return null;
  const response = await apiServerClient.fetch('/gcal/events/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, calendarId, appointment }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || data?.message || 'Não foi possível publicar no Google Agenda.');
  return data;
}

function GoogleCalendarSync({ onSynced }) {
  const [status, setStatus] = useState(null);
  const [token, setToken] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [selectedCal, setSelectedCal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [synced, setSynced] = useState(null);

  useEffect(() => {
    apiServerClient.fetch('/gcal/status').then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);

  const loadGis = () => new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });

  const connect = async () => {
    const clientId = status?.clientId || import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';
    if (!clientId) {
      setErr('O login oficial do Google precisa de um OAuth Client ID público configurado para este sistema.');
      return;
    }
    setBusy(true); setErr('');
    try {
      await loadGis();
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly',
        callback: async (resp) => {
          if (resp.error) { setErr(String(resp.error)); setBusy(false); return; }
          setToken(resp.access_token);
          try {
            const r = await apiServerClient.fetch('/gcal/calendars', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: resp.access_token }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error?.message || 'Erro ao listar agendas');
            setCalendars(data.items || []);
            if (data.items?.[0]) {
              setSelectedCal(data.items[0].id);
              window.sessionStorage.setItem('jd_google_calendar_id', data.items[0].id);
            }
            window.sessionStorage.setItem('jd_google_access_token', resp.access_token);
            if (status.webhookConfigured) {
              await apiServerClient.fetch('/gcal/events/watch', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resp.access_token, calendarId: data.items?.[0]?.id || 'primary', address: status.webhookUrl, channelId: `jd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }),
              });
            }
          } catch (e) { setErr(e.message || 'Erro ao listar agendas'); }
          setBusy(false);
        },
      });
      tokenClient.requestAccessToken();
    } catch (e) {
      setErr(e.message || 'Erro ao conectar');
      setBusy(false);
    }
  };

  const sync = async () => {
    if (!token || !selectedCal) return;
    setBusy(true); setErr('');
    try {
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 90 * 86400000).toISOString();
      const r = await apiServerClient.fetch('/gcal/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, calendarId: selectedCal, timeMin, timeMax }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || 'Erro ao buscar eventos');
      const events = data.items || [];
      let added = 0;
      let updated = 0;
      for (const ev of events) {
        const start = ev.start?.dateTime || ev.start?.date;
        if (!start) continue;
        const dateStr = String(start).replace('T', ' ').slice(0, 19);
        const title = ev.summary || '(sem título)';
        let existing = null;
        try {
          const found = await pb.collection('appointments').getList(1, 1, {
            filter: pb.filter('google_event_id = {:id}', { id: ev.id }),
          });
          existing = found.items?.[0] || null;
        } catch (_) {}
        if (!existing) {
          try {
            const found = await pb.collection('appointments').getList(1, 1, {
              filter: pb.filter('title = {:t} && date = {:d}', { t: title, d: dateStr }),
            });
            existing = found.items?.[0] || null;
          } catch (_) {}
        }
        const googleFields = {
          title, date: dateStr, location: ev.location || '',
          notes: ev.description || '', category: existing?.category || 'reuniao',
          priority: existing?.priority || 'normal',
          meet_link: ev.hangoutLink || '', visible: false,
          google_calendar_id: selectedCal, google_event_id: ev.id, google_etag: ev.etag || '', google_sync_status: 'sincronizado',
          google_updated_at: ev.updated || '', sync_gcal: true,
        };
        if (existing) {
          try { await pb.collection('appointments').update(existing.id, googleFields, { requestKey: `gcal-update-${ev.id}` }); updated++; } catch (_) {}
          continue;
        }
        try {
          await pb.collection('appointments').create(googleFields, { requestKey: `gcal-${ev.id}` });
          added++;
        } catch (_) {}
      }
      setSynced({ total: events.length, added, updated });
      if (onSynced) onSynced();
    } catch (e) {
      setErr(e.message || 'Erro ao sincronizar');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!token || !selectedCal) return undefined;
    const timer = window.setInterval(() => { sync(); }, 120000);
    return () => window.clearInterval(timer);
    // A conexão fica ativa enquanto a tela estiver aberta; o webhook passa a
    // ser usado quando o servidor tiver uma URL HTTPS pública configurada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCal]);

  const disconnect = () => {
    if (window.google?.accounts?.oauth2 && token) {
      try { window.google.accounts.oauth2.revoke(token, () => {}); } catch (_) {}
    }
    window.sessionStorage.removeItem('jd_google_access_token');
    window.sessionStorage.removeItem('jd_google_calendar_id');
    setToken(null); setCalendars([]); setSelectedCal(''); setSynced(null);
  };

  if (!status) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-muted-foreground"><CalendarPlus className="h-4 w-4" /> Google Agenda</span>
        {token ? (
          <Badge className="border-0 bg-primary/10 text-primary hover:bg-primary/10">Conectado</Badge>
        ) : (
          <Button size="sm" variant="outline" onClick={connect} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-1 h-4 w-4" />} Entrar com Google
          </Button>
        )}
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {!token && !err && <p className="text-xs text-muted-foreground">O botão abre o consentimento oficial do Google. A senha é digitada somente no Google.</p>}
      {token && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Agenda</Label>
            <Select value={selectedCal} onValueChange={setSelectedCal}>
              <SelectTrigger><SelectValue placeholder="Selecionar agenda" /></SelectTrigger>
              <SelectContent>
                {calendars.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.summary || c.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={sync} disabled={busy || !selectedCal}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Importar próximos 90 dias
            </Button>
            <Button size="sm" variant="ghost" onClick={disconnect}>Desconectar</Button>
          </div>
          {synced && <p className="text-xs text-muted-foreground">{synced.total} evento(s) encontrado(s) · {synced.added} importado(s) · {synced.updated || 0} atualizado(s).</p>}
        </div>
      )}
    </div>
  );
}

export function AdminAgenda() {
  const { user: me } = useAuth();
  const [appts, setAppts] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendencias, setPendencias] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [djenDrafts, setDjenDrafts] = useState([]);
  const [subMap, setSubMap] = useState({});
  const [newSub, setNewSub] = useState({});
  const [tab, setTab] = useState('agenda');
  const [calView, setCalView] = useState('mes'); // mes | semana | dia
  const [cursor, setCursor] = useState(new Date());
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');
  const [agendaMsg, setAgendaMsg] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState('');
  const [manualForm, setManualForm] = useState({ kind: 'event', title: '', date: localDateTimeValue(), processId: 'none', category: 'reuniao', priority: 'normal', notes: '' });

  const load = useCallback(() => {
    pb.collection('appointments').getFullList({ sort: 'date', expand: 'client,process' }).then(setAppts).catch(() => setAppts([]));
    pb.collection('events').getFullList({ sort: 'date', expand: 'process,process.client' }).then(setEvents).catch(() => setEvents([]));
    pb.collection('pendencias').getFullList({ sort: 'due', expand: 'process,process.client' }).then(setPendencias).catch(() => setPendencias([]));
    pb.collection('processes').getFullList({ sort: 'title,number', expand: 'client' }).then(setProcesses).catch(() => setProcesses([]));
    pb.collection('djen_publications').getFullList({ sort: 'deadline', filter: 'deadline_status = \"rascunho\" && deadline != \"\"', expand: 'process' }).then(setDjenDrafts).catch(() => setDjenDrafts([]));
    pb.collection('subtasks').getFullList({ sort: 'order' }).then((subs) => {
      const map = {};
      subs.forEach((s) => { (map[s.pendencia] = map[s.pendencia] || []).push(s); });
      setSubMap(map);
    }).catch(() => setSubMap({}));
  }, []);
  useEffect(load, [load]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const items = [
      ...appts.map((a) => ({ source: 'appointment', id: `appointment-${a.id}`, refId: a.id, kind: 'Compromisso', date: a.date, title: a.title, priority: a.priority, where: a.location, desc: a.notes, processId: a.process, processTitle: a.expand?.process?.title, clientName: a.expand?.client?.name, ref: a, editable: true, gcal: gcalLink(a.title, a.date, 60, a.notes, a.location) })),
      ...events.map((e) => ({ source: 'event', id: `event-${e.id}`, refId: e.id, kind: EVENT_LABEL[e.type] || 'Andamento', date: e.date, title: e.title, priority: e.priority, where: '', desc: e.description, processId: e.process, processTitle: e.expand?.process?.title, clientName: e.expand?.process?.expand?.client?.name, ref: e, editable: true, gcal: gcalLink(e.title, e.date, 60, e.description, '') })),
      ...pendencias.filter((p) => p.due).map((p) => ({ source: 'task', id: `task-${p.id}`, refId: p.id, kind: 'Pendência', date: p.due, title: p.title, priority: p.priority, where: '', desc: p.description, processId: p.process, processTitle: p.expand?.process?.title, clientName: p.expand?.process?.expand?.client?.name, ref: p, editable: true, gcal: gcalLink(p.title, p.due, 60, p.description, '') })),
      ...djenDrafts.map((p) => ({ source: 'djen', id: `djen-${p.id}`, refId: p.id, kind: 'Prazo DJEN · rascunho', date: p.deadline, title: `Prazo — ${p.number || p.process_number || 'DJEN'}`, priority: p.priority, where: '', desc: p.summary, processId: p.process, processTitle: p.expand?.process?.title, clientName: p.expand?.process?.expand?.client?.name, ref: p, editable: false, gcal: null })),
    ];
    return items.filter((i) => i.date).sort((a, b) => (a.date < b.date ? -1 : 1)).filter((i) => new Date(String(i.date).replace(' ', 'T')).getTime() >= now - 86400000).slice(0, 30);
  }, [appts, events, pendencias, djenDrafts]);

  const addSub = async (pid) => {
    const title = (newSub[pid] || '').trim();
    if (!title) return;
    await pb.collection('subtasks').create({ pendencia: pid, title, done: false, order: (subMap[pid]?.length || 0) + 1 }, { requestKey: `sub-${pid}-${Date.now()}` });
    setNewSub({ ...newSub, [pid]: '' });
    load();
  };
  const toggleSub = async (s) => { await pb.collection('subtasks').update(s.id, { done: !s.done }); load(); };
  const delSub = async (s) => { await pb.collection('subtasks').delete(s.id); load(); };

  const openTasks = pendencias.filter((p) => !p.done);

  const openManual = (date = cursor) => {
    setManualError('');
    setManualForm({ kind: 'event', title: '', date: localDateTimeValue(date), processId: 'none', category: 'reuniao', priority: 'normal', notes: '' });
    setManualOpen(true);
  };

  const saveManual = async (e) => {
    e.preventDefault();
    const title = manualForm.title.trim();
    const process = processes.find((p) => p.id === manualForm.processId);
    if (!title || !manualForm.date) { setManualError('Informe o título e a data.'); return; }
    if (manualForm.kind === 'task' && !process) { setManualError('Toda tarefa precisa estar vinculada a um processo.'); return; }
    const processNumber = process?.number || 'Não vinculado';
    const clientName = process?.expand?.client?.name || 'Não vinculado';
    const markdown = [
      `# ${title}`,
      '',
      `- **Processo:** ${processNumber}`,
      `- **Cliente:** ${clientName}`,
      `- **Ação principal:** ${title}`,
      `- **Prioridade:** ${PRIORITY_LABEL[manualForm.priority] || PRIORITY_LABEL.normal}`,
      manualForm.notes.trim() ? '' : null,
      manualForm.notes.trim() ? manualForm.notes.trim() : null,
    ].filter((line) => line !== null).join('\n');
    setManualSaving(true); setManualError('');
    try {
      if (manualForm.kind === 'task') {
        await pb.collection('pendencias').create({ process: process.id, title, description: markdown, due: toPbDate(manualForm.date), done: false, for_client: false, priority: manualForm.priority });
      } else {
        const appointment = await pb.collection('appointments').create({
          client: process?.client || '',
          process: process?.id || '',
          responsible: me?.id || '',
          date: toPbDate(manualForm.date),
          title,
          notes: markdown,
          category: manualForm.category,
          priority: manualForm.priority,
          sync_gcal: true,
          google_sync_status: 'local',
          authorized_client: false,
          visible: false,
        });
        try {
          const googleEvent = await pushAppointmentToGoogle(appointment);
          if (googleEvent?.id) {
            await pb.collection('appointments').update(appointment.id, {
              google_calendar_id: window.sessionStorage.getItem('jd_google_calendar_id') || '',
              google_event_id: googleEvent.id,
              google_etag: googleEvent.etag || '',
              google_updated_at: googleEvent.updated || '',
              google_sync_status: 'sincronizado',
            });
            setAgendaMsg('Evento criado no sistema e publicado no Google Agenda.');
          }
        } catch (googleError) {
          setAgendaMsg(`Evento salvo no sistema. Google Agenda: ${googleError.message}`);
        }
      }
      setManualOpen(false);
      await load();
    } catch (err) {
      setManualError(err?.message || 'Não foi possível criar o registro.');
    } finally { setManualSaving(false); }
  };

  const itemFromRecord = (source, record) => {
    if (!record) return null;
    if (source === 'appointment') return { source, id: `appointment-${record.id}`, refId: record.id, kind: 'Compromisso', date: record.date, title: record.title, priority: record.priority, where: record.location, meet_link: record.meet_link, desc: record.notes, processId: record.process, processTitle: record.expand?.process?.title, clientName: record.expand?.client?.name, ref: record, editable: true, gcal: gcalLink(record.title, record.date, 60, record.notes, record.location) };
    if (source === 'event') return { source, id: `event-${record.id}`, refId: record.id, kind: EVENT_LABEL[record.type] || 'Andamento', date: record.date, title: record.title, priority: record.priority, where: '', desc: record.description, processId: record.process, processTitle: record.expand?.process?.title, clientName: record.expand?.process?.expand?.client?.name, ref: record, editable: true, gcal: gcalLink(record.title, record.date, 60, record.description, '') };
    if (source === 'task') return { source, id: `task-${record.id}`, refId: record.id, kind: 'Pendência', date: record.due, title: record.title, priority: record.priority, where: '', desc: record.description, processId: record.process, processTitle: record.expand?.process?.title, clientName: record.expand?.process?.expand?.client?.name, ref: record, editable: true, gcal: gcalLink(record.title, record.due, 60, record.description, '') };
    return { source: 'djen', id: `djen-${record.id}`, refId: record.id, kind: 'Prazo DJEN · rascunho', date: record.deadline, title: `Prazo — ${record.number || record.process_number || 'DJEN'}`, priority: record.priority, where: '', desc: record.summary, processId: record.process, processTitle: record.expand?.process?.title, clientName: record.expand?.process?.expand?.client?.name, ref: record, editable: false, gcal: null };
  };

  const closeDetail = () => {
    if (itemSaving) return;
    setDetailItem(null);
    setItemError('');
  };

  const closeEdit = () => {
    if (itemSaving) return;
    setEditItem(null);
    setEditForm(null);
    setItemError('');
  };

  const openItem = (item) => { setItemError(''); setDetailItem(item); };
  const openEdit = (item) => {
    if (!item?.editable) return;
    const r = item.ref;
    setItemError('');
    setDetailItem(null);
    setEditItem(null);
    setEditForm(null);
    const nextForm = {
      title: r.title || '', date: localDateTimeValue(r.date || r.due), processId: r.process || 'none',
      category: r.category || 'reuniao', type: r.type || 'andamento', priority: r.priority || 'normal',
      notes: r.notes || r.description || '', location: r.location || '', meet_link: r.meet_link || '',
      visible: r.visible !== false, cancelled: !!r.cancelled, done: !!r.done,
    };
    // Let the details dialog finish its close transition before mounting the
    // edit dialog. This prevents Radix portals from briefly leaving a blank
    // document when the user clicks Editar.
    window.setTimeout(() => {
      setEditForm(nextForm);
      setEditItem(item);
    }, 0);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editItem || !editForm?.title?.trim() || !editForm.date) { setItemError('Informe o título e a data.'); return; }
    if (['event', 'task'].includes(editItem.source) && editForm.processId === 'none') { setItemError('Eventos processuais e tarefas precisam estar vinculados a um processo.'); return; }
    setItemSaving(true); setItemError('');
    try {
      const process = processes.find((p) => p.id === editForm.processId);
      if (editItem.source === 'appointment') {
        const updated = await pb.collection('appointments').update(editItem.refId, {
          title: editForm.title.trim(), date: toPbDate(editForm.date), process: editForm.processId === 'none' ? '' : editForm.processId,
          client: process?.client || '', category: editForm.category, priority: editForm.priority, notes: editForm.notes,
          location: editForm.location, meet_link: editForm.meet_link, visible: !!editForm.visible, cancelled: !!editForm.cancelled,
        });
        const token = window.sessionStorage.getItem('jd_google_access_token');
        const calendarId = window.sessionStorage.getItem('jd_google_calendar_id');
        if (updated.google_event_id && token && calendarId) {
          try {
            await apiServerClient.fetch('/gcal/events/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, calendarId, eventId: updated.google_event_id, appointment: updated }) });
            await pb.collection('appointments').update(updated.id, { google_sync_status: 'sincronizado', google_updated_at: new Date().toISOString() });
          } catch (googleError) {
            setAgendaMsg(`Evento atualizado localmente. Google Agenda: ${googleError.message}`);
          }
        }
      } else if (editItem.source === 'event') {
        await pb.collection('events').update(editItem.refId, { title: editForm.title.trim(), date: toPbDate(editForm.date), process: editForm.processId, type: editForm.type, description: editForm.notes, visible: !!editForm.visible, cancelled: !!editForm.cancelled });
      } else if (editItem.source === 'task') {
        await pb.collection('pendencias').update(editItem.refId, { title: editForm.title.trim(), due: toPbDate(editForm.date), process: editForm.processId === 'none' ? '' : editForm.processId, priority: editForm.priority, description: editForm.notes, visible: !!editForm.visible, done: !!editForm.done });
      }
      setEditItem(null); setEditForm(null); setItemError(''); setAgendaMsg('Registro atualizado com sucesso.'); await load();
    } catch (err) { setItemError(err?.message || 'Não foi possível atualizar o registro.'); } finally { setItemSaving(false); }
  };

  const deleteItem = async (item) => {
    if (!item?.editable || !window.confirm(`Excluir “${item.title}”? Esta ação não pode ser desfeita.`)) return;
    setItemSaving(true); setItemError('');
    try {
      if (item.source === 'appointment') {
        const r = item.ref;
        const token = window.sessionStorage.getItem('jd_google_access_token');
        const calendarId = window.sessionStorage.getItem('jd_google_calendar_id');
        if (r.google_event_id && token && calendarId) {
          const response = await apiServerClient.fetch('/gcal/events/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, calendarId, eventId: r.google_event_id }) });
          if (!response.ok && response.status !== 404) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Não foi possível excluir o evento no Google Agenda.'); }
        }
        await pb.collection('appointments').delete(item.refId);
      } else if (item.source === 'event') await pb.collection('events').delete(item.refId);
      else if (item.source === 'task') await pb.collection('pendencias').delete(item.refId);
      setDetailItem(null); setEditItem(null); setEditForm(null); setItemError(''); setAgendaMsg('Registro excluído com sucesso.'); await load();
    } catch (err) { setItemError(err?.message || 'Não foi possível excluir o registro.'); } finally { setItemSaving(false); }
  };

  // Itens de calendário unificados (compromissos + eventos + prazos)
  const calItems = useMemo(() => {
    const items = [];
    appts.forEach((a) => items.push({ ...itemFromRecord('appointment', a), category: a.category }));
    events.forEach((e) => items.push({ ...itemFromRecord('event', e), category: e.type === 'audiencia' ? 'audiencia' : e.type === 'prazo' ? 'prazo' : null }));
    pendencias.filter((p) => p.due).forEach((p) => items.push({ ...itemFromRecord('task', p), category: 'prazo' }));
    djenDrafts.filter((p) => p.deadline).forEach((p) => items.push({ ...itemFromRecord('djen', p), category: 'prazo' }));
    return items;
  }, [appts, events, pendencias, djenDrafts]);

  const shiftCursor = (dir) => {
    const d = new Date(cursor);
    if (calView === 'mes') d.setMonth(d.getMonth() + dir);
    else if (calView === 'semana') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };
  const cursorLabel = () => {
    const d = cursor;
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    if (calView === 'mes') return `${meses[d.getMonth()]} ${d.getFullYear()}`;
    if (calView === 'semana') { const ini = startOfWeek(d); const fim = new Date(ini); fim.setDate(fim.getDate() + 6); return `${ini.getDate()}/${ini.getMonth() + 1} – ${fim.getDate()}/${fim.getMonth() + 1}/${fim.getFullYear()}`; }
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div>
      <Helmet><title>Agenda & Tarefas — Área Restrita</title><meta name="description" content="Agenda, compromissos e quadro de tarefas." /></Helmet>
      <h1 className="font-display text-2xl font-bold tracking-tight">Agenda & Tarefas</h1>
      {agendaMsg && <p className="mt-2 rounded-xl border border-border bg-secondary/40 p-3 text-sm">{agendaMsg}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant={tab === 'agenda' ? 'default' : 'outline'} onClick={() => setTab('agenda')}><CalendarDays className="mr-1 h-4 w-4" /> Agenda</Button>
        <Button size="sm" variant={tab === 'tarefas' ? 'default' : 'outline'} onClick={() => setTab('tarefas')}><LayoutDashboard className="mr-1 h-4 w-4" /> Tarefas</Button>
        <Button size="sm" variant="outline" onClick={() => openManual()}><Plus className="mr-1 h-4 w-4" /> Novo evento/tarefa</Button>
      </div>

      {tab === 'agenda' && (
        <div className="mt-6 space-y-4">
          {/* Barra de visualização do calendário */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => shiftCursor(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="font-display min-w-[140px] text-center text-sm font-bold">{cursorLabel()}</span>
              <Button size="sm" variant="ghost" onClick={() => shiftCursor(1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Hoje</Button>
            </div>
            <div className="flex gap-1">
              {[['mes', 'Mês'], ['semana', 'Semana'], ['dia', 'Dia'], ['lista', 'Lista']].map(([v, l]) => (
                <Button key={v} size="sm" variant={calView === v ? 'default' : 'outline'} onClick={() => setCalView(v)}>{l}</Button>
              ))}
            </div>
          </div>

          {/* Integração Google Agenda */}
          <GoogleCalendarSync onSynced={load} />

          {calView === 'mes' && <MonthGrid cursor={cursor} items={calItems} onDay={(d) => { setCursor(d); setCalView('dia'); }} onItem={openItem} />}
          {calView === 'semana' && <WeekGrid cursor={cursor} items={calItems} onItem={openItem} />}
          {calView === 'dia' && <DayGrid cursor={cursor} items={calItems} onItem={openItem} />}

          {calView === 'lista' && (
            <div className="space-y-3">
              {upcoming.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum compromisso ou prazo futuro.</p>}
              {upcoming.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openItem(i)}>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(i.date)} · <Badge variant="outline" className="ml-1">{i.kind}</Badge></p>
                    <p className="mt-1 text-sm font-semibold">{i.title}</p>
                    {priorityBadge(i.priority)}
                    {i.where && <p className="text-xs text-muted-foreground">{i.where}</p>}
                    {i.desc && <p className="mt-1 text-xs text-muted-foreground">{i.desc}</p>}
                  </button>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openItem(i)}><Eye className="mr-1 h-4 w-4" /> Detalhes</Button>
                    {i.editable && <Button size="sm" variant="outline" onClick={() => openEdit(i)}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>}
                    {i.gcal && <Button asChild size="sm" variant="outline"><a href={i.gcal} target="_blank" rel="noopener noreferrer"><CalendarPlus className="mr-1 h-4 w-4" /> Google Agenda</a></Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tarefas' && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {openTasks.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma pendência em aberto.</p>}
          {openTasks.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button type="button" className="text-left text-sm font-semibold hover:text-primary" onClick={() => openItem(itemFromRecord('task', p))}>{p.title}</button>
                  <p className="text-xs text-muted-foreground">
                    {p.expand?.process?.title ? <Link to={`/restrito/painel/processos/${p.expand.process.id}`} className="text-primary hover:underline">{p.expand.process.title}</Link> : '—'}
                    {p.due ? ` · prazo ${fmtDate(p.due)}` : ''}
                  </p>
                  {priorityBadge(p.priority)}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(itemFromRecord('task', p))}><Pencil className="h-4 w-4" /></Button>
                  <button aria-label="Concluir" onClick={async () => { await pb.collection('pendencias').update(p.id, { done: true }); load(); }}><Circle className="h-5 w-5 text-accent" /></button>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                {(subMap[p.id] || []).map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <button aria-label="Alternar" onClick={() => toggleSub(s)}>
                      {s.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <span className={s.done ? 'text-muted-foreground line-through' : ''}>{s.title}</span>
                    <button aria-label="Excluir subtarefa" className="ml-auto" onClick={() => delSub(s)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Input
                  value={newSub[p.id] || ''}
                  onChange={(e) => setNewSub({ ...newSub, [p.id]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(p.id); } }}
                  placeholder="Adicionar subtarefa…"
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={() => addSub(p.id)}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>Novo evento ou tarefa</DialogTitle></DialogHeader>
          <form onSubmit={saveManual} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Tipo</Label><Select value={manualForm.kind} onValueChange={(value) => setManualForm({ ...manualForm, kind: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="event">Evento na agenda</SelectItem><SelectItem value="task">Tarefa processual</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Data e hora</Label><Input type="datetime-local" value={manualForm.date} onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })} required /></div>
            </div>
            <div className="space-y-2"><Label>Ação principal / título</Label><Input value={manualForm.title} onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })} placeholder="Ex.: protocolar manifestação" required /></div>
            <div className="space-y-2"><Label>Processo e cliente</Label><Select value={manualForm.processId} onValueChange={(value) => setManualForm({ ...manualForm, processId: value })}><SelectTrigger><SelectValue placeholder="Selecione o processo" /></SelectTrigger><SelectContent><SelectItem value="none">Sem processo vinculado</SelectItem>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.title || 'Processo'}{p.number ? ` · ${p.number}` : ''}{p.expand?.client?.name ? ` · ${p.expand.client.name}` : ''}</SelectItem>)}</SelectContent></Select>{manualForm.kind === 'task' && <p className="text-xs text-muted-foreground">Tarefas exigem um processo vinculado; eventos podem ser gerais ou vinculados.</p>}</div>
            {manualForm.kind === 'event' && <div className="space-y-2"><Label>Categoria</Label><Select value={manualForm.category} onValueChange={(value) => setManualForm({ ...manualForm, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(APPT_CATEGORIES).map(([value, category]) => <SelectItem key={value} value={value}>{category.label}</SelectItem>)}</SelectContent></Select></div>}
            <div className="space-y-2"><Label>Prioridade</Label><Select value={manualForm.priority} onValueChange={(value) => setManualForm({ ...manualForm, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PRIORITY_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Detalhes</Label><Textarea rows={5} value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} placeholder="Observações, documentos, instruções ou contexto…" /></div>
            <p className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">A descrição será estruturada em Markdown e poderá ser enviada ao Google Agenda com processo, cliente e ação principal.</p>
            {manualError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{manualError}</p>}
            <Button type="submit" className="w-full" disabled={manualSaving}>{manualSaving ? 'Salvando…' : 'Criar na agenda'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailItem} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>{detailItem?.title || 'Detalhes do registro'}</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{detailItem.kind}</Badge>{priorityBadge(detailItem.priority)}{detailItem.ref?.done && <Badge>Concluída</Badge>}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">Data e hora</p><p className="font-medium">{detailItem.date ? fmtDateTime(detailItem.date) : '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Processo</p>{detailItem.processId ? <Link className="font-medium text-primary hover:underline" to={`/restrito/painel/processos/${detailItem.processId}`} onClick={() => setDetailItem(null)}>{detailItem.processTitle || detailItem.processId}</Link> : <p className="font-medium">Não vinculado</p>}</div>
                <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{detailItem.clientName || '—'}</p></div>
                {detailItem.where && <div><p className="text-xs text-muted-foreground">Local</p><p className="font-medium">{detailItem.where}</p></div>}
              </div>
              {detailItem.meet_link && <a className="block text-primary hover:underline" href={detailItem.meet_link} target="_blank" rel="noopener noreferrer">Entrar na sala virtual →</a>}
              {detailItem.desc && <div><p className="text-xs text-muted-foreground">Descrição</p><div className="whitespace-pre-wrap rounded-xl bg-secondary/40 p-3">{detailItem.desc}</div></div>}
              {detailItem.source === 'djen' && <p className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">Este prazo é um rascunho originado do DJEN. Confirme a publicação na tela de Publicações DJEN para transformá-lo em compromisso.</p>}
              {itemError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{itemError}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                {detailItem.editable && <Button variant="outline" onClick={() => openEdit(detailItem)}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>}
                {detailItem.editable && <Button variant="destructive" onClick={() => deleteItem(detailItem)} disabled={itemSaving}><Trash2 className="mr-1 h-4 w-4" /> Excluir</Button>}
                <Button variant="ghost" onClick={closeDetail}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editItem && editForm)} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent key={editItem?.id || 'agenda-edit-dialog'} className="max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>Editar {editItem?.kind || 'registro'}</DialogTitle></DialogHeader>
          {editForm && (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="space-y-2"><Label>Título / ação principal</Label><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required /></div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Data e hora</Label><Input type="datetime-local" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required /></div><div className="space-y-2"><Label>Prioridade</Label><Select value={editForm.priority} onValueChange={(value) => setEditForm({ ...editForm, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PRIORITY_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></div>
              <div className="space-y-2"><Label>Processo e cliente</Label><Select value={editForm.processId} onValueChange={(value) => setEditForm({ ...editForm, processId: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem processo vinculado</SelectItem>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.title || 'Processo'}{p.number ? ` · ${p.number}` : ''}{p.expand?.client?.name ? ` · ${p.expand.client.name}` : ''}</SelectItem>)}</SelectContent></Select></div>
              {editItem.source === 'appointment' && <><div className="space-y-2"><Label>Categoria</Label><Select value={editForm.category} onValueChange={(value) => setEditForm({ ...editForm, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(APPT_CATEGORIES).map(([value, category]) => <SelectItem key={value} value={value}>{category.label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Local</Label><Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></div><div className="space-y-2"><Label>Link da reunião</Label><Input type="url" value={editForm.meet_link} onChange={(e) => setEditForm({ ...editForm, meet_link: e.target.value })} /></div></div></>}
              {editItem.source === 'event' && <div className="space-y-2"><Label>Tipo</Label><Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EVENT_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>}
              <div className="space-y-2"><Label>Detalhes</Label><Textarea rows={5} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
              {editItem.source === 'task' && <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!editForm.done} onCheckedChange={(value) => setEditForm({ ...editForm, done: !!value })} /> Concluída</label>}
              {itemError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{itemError}</p>}
              <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={closeEdit}>Cancelar</Button><Button type="submit" disabled={itemSaving}>{itemSaving ? 'Salvando…' : 'Salvar alterações'}</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const EVENT_LABEL = { andamento: 'Andamento', audiencia: 'Audiência', prazo: 'Prazo', documento: 'Documento', outro: 'Outro' };
const PRIORITY_LABEL = { urgente: 'Urgente', alta: 'Alta', normal: 'Normal', baixa: 'Baixa' };

function priorityBadge(value) {
  const key = PRIORITY_LABEL[value] ? value : 'normal';
  const color = { urgente: 'bg-red-100 text-red-800', alta: 'bg-orange-100 text-orange-800', normal: 'bg-blue-100 text-blue-800', baixa: 'bg-slate-100 text-slate-700' }[key];
  return <Badge className={`mt-1 border-0 ${color}`}>{PRIORITY_LABEL[key]}</Badge>;
}

function localDateTimeValue(value = new Date()) {
  const d = new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function itemDot(item) { const c = APPT_CATEGORIES[item.category]; return c ? c.dot : 'bg-muted-foreground'; }
function itemBadge(item) { const c = APPT_CATEGORIES[item.category]; return c ? c.cls : 'bg-muted text-muted-foreground'; }

function MonthGrid({ cursor, items, onDay, onItem }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first); start.setDate(start.getDate() - first.getDay());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  return (
    <div className="rounded-2xl border border-border bg-card p-2">
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => <div key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{d}</div>)}
        {cells.map((d, i) => {
          const dayItems = items.filter((it) => it.date && sameDay(new Date(String(it.date).replace(' ', 'T')), d));
          const inMonth = d.getMonth() === month;
          return (
            <button key={i} type="button" onClick={() => onDay(d)} className={`min-h-[84px] rounded-lg border p-1.5 text-left transition-colors ${inMonth ? 'border-border bg-background hover:border-primary/40' : 'border-transparent bg-secondary/30 text-muted-foreground'} ${sameDay(d, today) ? 'ring-1 ring-primary' : ''}`}>
              <span className={`text-xs font-semibold ${sameDay(d, today) ? 'text-primary' : ''}`}>{d.getDate()}</span>
              <div className="mt-1 space-y-0.5">
                {dayItems.slice(0, 3).map((it) => (
                  <span key={it.id} role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onItem(it); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onItem(it); } }} className="flex cursor-pointer items-center gap-1 truncate text-[10px] hover:text-primary" aria-label={`Abrir detalhes de ${it.title}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${itemDot(it)}`} />
                    <span className="truncate">{it.title}</span>
                  </span>
                ))}
                {dayItems.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayItems.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ cursor, items, onItem }) {
  const ini = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ini); d.setDate(ini.getDate() + i); return d; });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((d, i) => {
        const dayItems = items.filter((it) => it.date && sameDay(new Date(String(it.date).replace(' ', 'T')), d)).sort((a, b) => (a.date < b.date ? -1 : 1));
        return (
          <div key={i} className={`min-h-[180px] rounded-xl border p-2 ${sameDay(d, today) ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{DOW[d.getDay()]} {d.getDate()}</p>
            <div className="space-y-1.5">
              {dayItems.map((it) => (
                <button type="button" key={it.id} onClick={() => onItem(it)} className="block w-full rounded-lg bg-secondary/60 p-1.5 text-left text-xs hover:bg-primary/10" aria-label={`Abrir detalhes de ${it.title}`}>
                  <div className="flex items-center gap-1">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${itemDot(it)}`} />
                    <span className="truncate font-semibold">{it.title}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtDateTime(it.date).split(' ')[1] || ''} · {it.kind}</p>
                  {priorityBadge(it.priority)}
                </button>
              ))}
              {dayItems.length === 0 && <p className="text-[10px] text-muted-foreground">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayGrid({ cursor, items, onItem }) {
  const d = new Date(cursor); d.setHours(0, 0, 0, 0);
  const dayItems = items.filter((it) => it.date && sameDay(new Date(String(it.date).replace(' ', 'T')), d)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i); // 08:00 – 19:00
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-3 text-sm font-semibold">{cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
      <div className="divide-y divide-border">
        {hours.map((h) => {
          const slot = dayItems.filter((it) => { const dt = new Date(String(it.date).replace(' ', 'T')); return dt.getHours() === h; });
          return (
            <div key={h} className="flex gap-3 p-3">
              <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{String(h).padStart(2, '0')}:00</span>
              <div className="flex-1 space-y-1.5">
                {slot.map((it) => (
                  <button type="button" key={it.id} onClick={() => onItem(it)} className="block w-full rounded-lg border border-border bg-secondary/40 p-2 text-left text-sm hover:border-primary/50" aria-label={`Abrir detalhes de ${it.title}`}>
                    <div className="flex items-center gap-2">
                      <Badge className={`${itemBadge(it)} hover:${itemBadge(it)} border-0`}>{it.kind}</Badge>
                      <span className="font-semibold">{it.title}</span>
                      {priorityBadge(it.priority)}
                    </div>
                    {it.where && <p className="mt-1 text-xs text-muted-foreground">{it.where}</p>}
                    {it.meet_link && <span className="mt-1 inline-block text-xs text-primary">Entrar na sala virtual →</span>}
                    {it.desc && <p className="mt-1 text-xs text-muted-foreground">{it.desc}</p>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {dayItems.filter((it) => { const dt = new Date(String(it.date).replace(' ', 'T')); return dt.getHours() < 8 || dt.getHours() > 19; }).map((it) => (
          <div key={it.id} className="flex gap-3 p-3">
            <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">—</span>
            <button type="button" onClick={() => onItem(it)} className="flex-1 rounded-lg border border-border bg-secondary/40 p-2 text-left text-sm hover:border-primary/50" aria-label={`Abrir detalhes de ${it.title}`}>
              <span className="font-semibold">{it.title}</span> <span className="text-xs text-muted-foreground">{fmtDateTime(it.date)}</span>
              {priorityBadge(it.priority)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ CMS — conteúdo do site ============================ */

const CMS_FIELDS = [
  { key: 'hero_title', label: 'Título do hero (home)', type: 'text' },
  { key: 'hero_subtitle', label: 'Subtítulo do hero (home)', type: 'textarea' },
  { key: 'about_teaser', label: 'Texto de apresentação (home)', type: 'textarea' },
  { key: 'areas_intro', label: 'Título da seção de áreas', type: 'text' },
  { key: 'blog_intro', label: 'Título da seção do blog', type: 'text' },
  { key: 'footer_about', label: 'Texto do rodapé', type: 'textarea' },
  { key: 'contact_whatsapp', label: 'WhatsApp (somente dígitos, com DDI)', type: 'text' },
  { key: 'contact_email', label: 'E-mail de contato', type: 'text' },
  { key: 'contact_instagram', label: 'Instagram (URL)', type: 'text' },
];

export function AdminCMS() {
  const [values, setValues] = useState({});
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    pb.collection('site_settings').getFullList().then((rows) => {
      const map = {};
      rows.forEach((r) => { map[r.key] = r; });
      setValues(map);
    }).catch(() => setValues({}));
  }, []);

  const val = (key) => values[key]?.value || '';
  const set = (key, v) => setValues((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), value: v } }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await Promise.all(CMS_FIELDS.map((f, i) => {
        const existing = values[f.key];
        const v = val(f.key);
        if (existing?.id) {
          return pb.collection('site_settings').update(existing.id, { value: v }, { requestKey: `cms-${f.key}-${i}` });
        }
        return pb.collection('site_settings').create({ key: f.key, value: v }, { requestKey: `cms-${f.key}-${i}` });
      }));
      setMsg('Conteúdo salvo. As alterações aparecem no site público.');
    } catch (err) {
      setMsg(err?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Helmet><title>Conteúdo do site — Área Restrita</title><meta name="description" content="Editor de conteúdo do site." /></Helmet>
      <h1 className="font-display text-2xl font-bold tracking-tight">Conteúdo do site</h1>
      <p className="mt-1 text-sm text-muted-foreground">Edite textos exibidos no site público. As mudanças são aplicadas imediatamente.</p>
      <form onSubmit={save} className="mt-6 max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6">
        {CMS_FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label>{f.label}</Label>
            {f.type === 'textarea'
              ? <Textarea rows={3} value={val(f.key)} onChange={(e) => set(f.key, e.target.value)} />
              : <Input value={val(f.key)} onChange={(e) => set(f.key, e.target.value)} />}
          </div>
        ))}
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar conteúdo'}</Button>
      </form>
    </div>
  );
}


