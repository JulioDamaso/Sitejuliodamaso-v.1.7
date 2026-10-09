import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { fmtDate, fmtBRL, toPbDate, toPbDateOnly, pbToInputDate, PROCESS_STATUS, FIN_STATUS, FIN_TYPE, LEDGER_TYPE, LEDGER_STATUS } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, CheckCircle2, Bell, Pencil, ArrowUp, ArrowDown, FolderOpen, Download, Upload, Wallet, TrendingUp, TrendingDown, PiggyBank, Percent, Banknote, LineChart, CalendarRange, Archive } from 'lucide-react';

export function AdminFinanceiro() {
  const [ledger, setLedger] = useState([]);
  const [financial, setFinancial] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [book, setBook] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    description: '', amount: '', type: 'receita', book: 'escritorio', category: '', date: '', status: 'pago', recurring: false, notes: '',
  });

  const load = useCallback(() => {
    pb.collection('ledger').getFullList({ sort: '-date', expand: 'client,process' }).then(setLedger).catch(() => setLedger([]));
    pb.collection('financial').getFullList({ sort: '-due', expand: 'client,process' }).then(setFinancial).catch(() => setFinancial([]));
    pb.collection('processes').getFullList({ expand: 'client' }).then(setProcesses).catch(() => setProcesses([]));
  }, []);
  useEffect(load, [load]);

  // Unifica ledger + financial em uma única lista de extrato.
  // financial (honorários/despesas do caso) → tratado como receita/despesa do escritório.
  const unified = useMemo(() => {
    const items = [];
    ledger.forEach((r) => {
      items.push({
        id: r.id, col: 'ledger', date: r.date, description: r.description,
        amount: Number(r.amount) || 0, type: r.type, status: r.status,
        category: r.category, book: r.book, process: r.process || '',
        origin: r.expand?.process?.title ? `Caso: ${r.expand.process.title}` : (r.expand?.client?.name || 'Escritório'),
        raw: r,
      });
    });
    financial.forEach((r) => {
      const mappedType = r.type === 'despesa' || r.type === 'custas' ? 'despesa' : 'receita';
      items.push({
        id: r.id, col: 'financial', date: r.due || r.created, description: r.description,
        amount: Number(r.amount) || 0, type: mappedType, status: r.status,
        category: FIN_TYPE[r.type]?.label || r.type, book: 'escritorio', process: r.process || '',
        origin: r.expand?.process?.title ? `Caso: ${r.expand.process.title}` : (r.expand?.client?.name || 'Cliente'),
        raw: r,
      });
    });
    return items;
  }, [ledger, financial]);

  const inPeriod = (date) => {
    if (!date) return true;
    const d = String(date).slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  // Itens dentro do período + livro selecionado (base de todos os relatórios).
  const periodItems = useMemo(
    () => unified.filter((r) => inPeriod(r.date) && (book === 'all' || r.book === book)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unified, from, to, book],
  );

  // ---- Visão de gestor sênior: resultado, receitas, custos, investimentos, capital, fluxo ----
  const metrics = useMemo(() => {
    let receita = 0, despesa = 0, prolabore = 0, investimento = 0, transferencia = 0;
    let aReceber = 0, vencido = 0, aPagar = 0;
    periodItems.forEach((r) => {
      const a = r.amount;
      if (r.status === 'pago') {
        if (r.type === 'receita') receita += a;
        else if (r.type === 'despesa') despesa += a;
        else if (r.type === 'prolabore') prolabore += a;
        else if (r.type === 'investimento') investimento += a;
        else if (r.type === 'transferencia') transferencia += a;
      } else if (r.status === 'pendente' || r.status === 'vencido') {
        if (r.type === 'receita') { aReceber += a; if (r.status === 'vencido') vencido += a; }
        else if (r.type === 'despesa') aPagar += a;
      }
    });
    const resultado = receita - despesa - prolabore;
    const fluxoCaixa = receita - despesa - prolabore - investimento;
    const inadimpl = aReceber > 0 ? (vencido / aReceber) * 100 : 0;
    const margem = receita > 0 ? (resultado / receita) * 100 : 0;
    return { receita, despesa, prolabore, investimento, transferencia, aReceber, vencido, aPagar, resultado, fluxoCaixa, inadimpl, margem };
  }, [periodItems]);

  // Despesas e investimentos por processo (controle de custo por caso).
  const byProcess = useMemo(() => {
    const map = {};
    periodItems.forEach((r) => {
      if (!r.process) return;
      if (!map[r.process]) {
        const p = processes.find((x) => x.id === r.process);
        map[r.process] = { id: r.process, title: p?.title || 'Processo', client: p?.expand?.client?.name || '—', receita: 0, despesa: 0, investimento: 0, count: 0 };
      }
      const a = r.amount;
      if (r.status !== 'pago' && r.status !== 'pendente' && r.status !== 'vencido') return;
      if (r.type === 'receita' && r.status === 'pago') map[r.process].receita += a;
      if (r.type === 'despesa') map[r.process].despesa += a;
      if (r.type === 'investimento') map[r.process].investimento += a;
      map[r.process].count += 1;
    });
    return Object.values(map)
      .map((p) => ({ ...p, custo: p.despesa + p.investimento, resultado: p.receita - p.despesa - p.investimento }))
      .sort((a, b) => b.custo - a.custo);
  }, [periodItems, processes]);

  // Fluxo de caixa mensal: realizado (entradas/saídas pagas) e previsto (a receber/a pagar).
  const monthly = useMemo(() => {
    const m = {};
    periodItems.forEach((r) => {
      if (!r.date) return;
      const key = String(r.date).slice(0, 7);
      if (!m[key]) m[key] = { entradas: 0, saidas: 0, previstoIn: 0, previstoOut: 0 };
      const a = r.amount;
      if (r.status === 'pago') {
        if (r.type === 'receita') m[key].entradas += a;
        else m[key].saidas += a;
      } else if (r.status === 'pendente' || r.status === 'vencido') {
        if (r.type === 'receita') m[key].previstoIn += a;
        else m[key].previstoOut += a;
      }
    });
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [periodItems]);

  const filtered = useMemo(() => {
    return periodItems
      .filter((r) => {
        if (kindFilter !== 'all' && r.type !== kindFilter) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [periodItems, kindFilter, statusFilter]);

  const setPreset = (p) => {
    const today = new Date();
    if (p === 'month') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      setFrom(s.toISOString().slice(0, 10));
      setTo(today.toISOString().slice(0, 10));
    } else if (p === 'year') {
      setFrom(`${today.getFullYear()}-01-01`);
      setTo(today.toISOString().slice(0, 10));
    } else {
      setFrom('');
      setTo('');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    await pb.collection('ledger').create({
      ...form,
      amount: Number(form.amount) || 0,
      date: toPbDateOnly(form.date) || undefined,
      recurring: !!form.recurring,
      book: form.book,
    });
    setForm({ description: '', amount: '', type: 'receita', book: form.book, category: '', date: '', status: 'pago', recurring: false, notes: '' });
    load();
  };

  const remove = async (col, id) => {
    if (!window.confirm('Excluir este lançamento? A ação é registrada na auditoria.')) return;
    try { await pb.collection(col).delete(id); } catch (_) { window.alert('Não foi possível excluir.'); }
    load();
  };

  const quit = async (item) => {
    try { await pb.collection(item.col).update(item.id, { status: 'pago' }); } catch (_) { window.alert('Não foi possível quitar.'); }
    load();
  };

  const openEdit = (item) => setEditItem({
    ...item,
    editForm: {
      description: item.description, amount: item.amount, type: item.raw.type,
      status: item.status, category: item.category, date: pbToInputDate(item.date), book: item.book,
    },
  });
  const saveEdit = async (e) => {
    e.preventDefault();
    const it = editItem;
    const f = it.editForm;
    try {
      if (it.col === 'ledger') {
        await pb.collection('ledger').update(it.id, { description: f.description, amount: Number(f.amount) || 0, type: f.type, status: f.status, category: f.category, date: toPbDateOnly(f.date) || undefined, book: f.book });
      } else {
        await pb.collection('financial').update(it.id, { description: f.description, amount: Number(f.amount) || 0, status: f.status, type: f.type, due: toPbDateOnly(f.date) || undefined });
      }
      setEditItem(null);
    } catch (_) { window.alert('Não foi possível salvar.'); }
    load();
  };

  const exportCSV = () => {
    const rows = [
      ['Painel Financeiro — Visão Gerencial', ''],
      ['Período', `${from || 'início'} a ${to || 'hoje'}`],
      ['Livro', book === 'all' ? 'Todos' : book],
      [],
      ['Receita realizada', metrics.receita],
      ['Receita prevista (a receber)', metrics.aReceber],
      ['Custos operacionais (pagos)', metrics.despesa],
      ['Investimentos (pagos)', metrics.investimento],
      ['Pró-labore', metrics.prolabore],
      ['A pagar', metrics.aPagar],
      ['Vencido', metrics.vencido],
      ['Resultado (lucro)', metrics.resultado],
      ['Fluxo de caixa realizado', metrics.fluxoCaixa],
      ['Margem (%)', metrics.margem.toFixed(1)],
      ['Inadimplência (%)', metrics.inadimpl.toFixed(1)],
      [],
      ['Mês', 'Entradas', 'Saídas', 'Previsto a receber', 'Previsto a pagar', 'Saldo do mês'],
      ...monthly.map(([k, v]) => [k, v.entradas, v.saidas, v.previstoIn, v.previstoOut, v.entradas - v.saidas]),
      [],
      ['Despesas por processo', '', '', '', ''],
      ['Processo', 'Cliente', 'Receita', 'Custos operacionais', 'Investimento', 'Resultado do caso'],
      ...byProcess.map((p) => [p.title, p.client, p.receita, p.despesa, p.investimento, p.resultado]),
      [],
      ['Extrato', '', '', '', '', ''],
      ['Data', 'Descrição', 'Origem', 'Tipo', 'Valor', 'Status'],
      ...filtered.map((r) => [fmtDate(r.date), r.description, r.origin, r.type, r.amount, r.status]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `financeiro-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const KPI = ({ icon: Icon, label, value, sub, cls }) => (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className={`font-display mt-2 text-2xl font-bold ${cls || ''}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Financeiro & Gestão</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visão de gestor: lucro, custos, investimentos, capital, fluxo de caixa e despesas por processo — em linguagem clara.</p>
        </div>
        <Button variant="outline" onClick={exportCSV}><Download className="mr-1 h-4 w-4" /> Exportar relatório</Button>
      </div>

      {/* Filtro de período (apenas data, sem hora) + livro */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground"><CalendarRange className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-widest">Período</span></div>
        <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" /></div>
        <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" /></div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => setPreset('month')}>Este mês</Button>
          <Button size="sm" variant="outline" onClick={() => setPreset('year')}>Este ano</Button>
          <Button size="sm" variant="ghost" onClick={() => setPreset('all')}>Tudo</Button>
        </div>
        <div className="ml-auto space-y-1">
          <Label className="text-xs">Livro</Label>
          <Select value={book} onValueChange={setBook}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os livros</SelectItem>
              <SelectItem value="escritorio">Escritório</SelectItem>
              <SelectItem value="pessoal">Pessoal / Pró-labore</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs principais — resultado, receitas, custos, investimentos */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={TrendingUp} label="Resultado (lucro)" value={fmtBRL(metrics.resultado)} sub="Receita − custos − pró-labore" cls={metrics.resultado >= 0 ? 'text-primary' : 'text-destructive'} />
        <KPI icon={Banknote} label="Receita realizada" value={fmtBRL(metrics.receita)} sub="Entradas efetivamente recebidas" cls="text-primary" />
        <KPI icon={Wallet} label="Receita prevista (a receber)" value={fmtBRL(metrics.aReceber)} sub={`${fmtBRL(metrics.vencido)} em atraso`} cls="text-accent" />
        <KPI icon={TrendingDown} label="Custos operacionais" value={fmtBRL(metrics.despesa)} sub="Despesas pagas no período" cls="text-destructive" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={PiggyBank} label="Investimentos" value={fmtBRL(metrics.investimento)} sub="Aplicado em ativos/crescimento" cls="text-blue-600" />
        <KPI icon={Banknote} label="Pró-labore / Capital" value={fmtBRL(metrics.prolabore + metrics.transferencia)} sub="Retiradas e movimentação de capital" cls="text-accent" />
        <KPI icon={LineChart} label="Fluxo de caixa realizado" value={fmtBRL(metrics.fluxoCaixa)} sub="Caixa após investimentos" cls={metrics.fluxoCaixa >= 0 ? 'text-primary' : 'text-destructive'} />
        <KPI icon={Percent} label="Margem & Inadimplência" value={`${metrics.margem.toFixed(1)}%`} sub={`Inadimplência: ${metrics.inadimpl.toFixed(1)}% · A pagar: ${fmtBRL(metrics.aPagar)}`} cls="text-primary" />
      </div>

      {/* Fluxo de caixa mensal + visão gerencial */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display font-bold">Fluxo de caixa mensal</h2>
          <p className="mt-1 text-xs text-muted-foreground">Entradas e saídas realizadas (pagas) e previstas (a receber / a pagar).</p>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Saídas</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">A receber</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">A pagar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Sem dados no período.</TableCell></TableRow>}
                {monthly.map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell className="font-medium">{k}</TableCell>
                    <TableCell className="text-right text-primary">{fmtBRL(v.entradas)}</TableCell>
                    <TableCell className="text-right text-destructive">{fmtBRL(v.saidas)}</TableCell>
                    <TableCell className={`text-right font-semibold ${v.entradas - v.saidas >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmtBRL(v.entradas - v.saidas)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell text-accent">{fmtBRL(v.previstoIn)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell text-muted-foreground">{fmtBRL(v.previstoOut)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display font-bold">Visão gerencial</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between border-b border-border pb-2"><span>Receita realizada</span><span className="font-medium text-primary">{fmtBRL(metrics.receita)}</span></li>
            <li className="flex items-center justify-between border-b border-border pb-2"><span>Custos operacionais</span><span className="font-medium text-destructive">{fmtBRL(metrics.despesa)}</span></li>
            <li className="flex items-center justify-between border-b border-border pb-2"><span>Investimentos</span><span className="font-medium text-blue-600">{fmtBRL(metrics.investimento)}</span></li>
            <li className="flex items-center justify-between border-b border-border pb-2"><span>Pró-labore</span><span className="font-medium text-accent">{fmtBRL(metrics.prolabore)}</span></li>
            <li className="flex items-center justify-between border-b border-border pb-2"><span>Resultado (lucro)</span><span className={`font-semibold ${metrics.resultado >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmtBRL(metrics.resultado)}</span></li>
            <li className="flex items-center justify-between border-b border-border pb-2"><span>A receber</span><span className="font-medium text-accent">{fmtBRL(metrics.aReceber)}</span></li>
            <li className="flex items-center justify-between border-b border-border pb-2"><span>A pagar</span><span className="font-medium text-muted-foreground">{fmtBRL(metrics.aPagar)}</span></li>
            <li className="flex items-center justify-between"><span>Inadimplência</span><span className="font-medium text-destructive">{metrics.inadimpl.toFixed(1)}%</span></li>
          </ul>
        </div>
      </div>

      {/* Despesas por processo */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display font-bold">Custos e resultado por processo</h2>
        <p className="mt-1 text-xs text-muted-foreground">Quanto cada caso custa (despesas + investimentos) e quanto já rendeu.</p>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Processo</TableHead>
                <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Custos</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Investimento</TableHead>
                <TableHead className="text-right">Resultado do caso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byProcess.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhum lançamento vinculado a processos no período.</TableCell></TableRow>}
              {byProcess.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium"><Link to={`/restrito/painel/processos/${p.id}`} className="text-primary hover:underline">{p.title}</Link></TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{p.client}</TableCell>
                  <TableCell className="text-right text-primary">{fmtBRL(p.receita)}</TableCell>
                  <TableCell className="text-right text-destructive">{fmtBRL(p.despesa)}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell text-blue-600">{fmtBRL(p.investimento)}</TableCell>
                  <TableCell className={`text-right font-semibold ${p.resultado >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmtBRL(p.resultado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Formulário de novo lançamento (ledger) */}
      <form onSubmit={save} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 sm:col-span-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(LEDGER_TYPE).map(([value, v]) => <SelectItem key={value} value={value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Honorários, aluguel, software…" /></div>
        <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div className="space-y-2">
          <Label>Livro</Label>
          <Select value={form.book} onValueChange={(v) => setForm({ ...form, book: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="escritorio">Escritório</SelectItem>
              <SelectItem value="pessoal">Pessoal / Pró-labore</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(LEDGER_STATUS).map(([value, v]) => <SelectItem key={value} value={value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end"><Button type="submit"><Plus className="mr-1 h-4 w-4" /> Lançar</Button></div>
      </form>

      {/* Filtros do extrato */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(LEDGER_TYPE).map(([value, v]) => <SelectItem key={value} value={value}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden md:table-cell">Origem</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const st = (r.col === 'ledger' ? LEDGER_STATUS[r.status] : FIN_STATUS[r.status]) || LEDGER_STATUS.pendente;
              const tp = LEDGER_TYPE[r.type] || { label: r.type, cls: 'bg-muted text-muted-foreground' };
              return (
                <TableRow key={r.col + r.id}>
                  <TableCell className="whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                  <TableCell className="font-medium">{r.description}{r.category && <span className="ml-2 text-xs text-muted-foreground">· {r.category}</span>}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{r.origin}</TableCell>
                  <TableCell><Badge className={`${tp.cls} hover:${tp.cls} border-0`}>{tp.label}</Badge></TableCell>
                  <TableCell className="text-right">{fmtBRL(r.amount)}</TableCell>
                  <TableCell><Badge className={`${st.cls} hover:${st.cls} border-0`}>{st.label}</Badge></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {r.status !== 'pago' && r.status !== 'cancelado' && <Button variant="ghost" size="sm" onClick={() => quit(r)}>Quitar</Button>}
                    <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove(r.col, r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-muted-foreground">Sem lançamentos para este filtro.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar lançamento</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="space-y-2"><Label>Descrição</Label><Input value={editItem.editForm.description} onChange={(e) => setEditItem({ ...editItem, editForm: { ...editItem.editForm, description: e.target.value } })} required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={editItem.editForm.amount} onChange={(e) => setEditItem({ ...editItem, editForm: { ...editItem.editForm, amount: e.target.value } })} /></div>
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={editItem.editForm.date} onChange={(e) => setEditItem({ ...editItem, editForm: { ...editItem.editForm, date: e.target.value } })} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={editItem.editForm.type} onValueChange={(v) => setEditItem({ ...editItem, editForm: { ...editItem.editForm, type: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {editItem.col === 'ledger'
                        ? Object.entries(LEDGER_TYPE).map(([value, v]) => <SelectItem key={value} value={value}>{v.label}</SelectItem>)
                        : Object.entries(FIN_TYPE).map(([value, v]) => <SelectItem key={value} value={value}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editItem.editForm.status || 'none'} onValueChange={(v) => setEditItem({ ...editItem, editForm: { ...editItem.editForm, status: v === 'none' ? '' : v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {editItem.col === 'ledger'
                        ? Object.entries(LEDGER_STATUS).map(([value, v]) => <SelectItem key={value} value={value}>{v.label}</SelectItem>)
                        : Object.entries(FIN_STATUS).map(([value, v]) => <SelectItem key={value} value={value}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editItem.col === 'ledger' && (
                <div className="space-y-2">
                  <Label>Livro</Label>
                  <Select value={editItem.editForm.book} onValueChange={(v) => setEditItem({ ...editItem, editForm: { ...editItem.editForm, book: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="escritorio">Escritório</SelectItem>
                      <SelectItem value="pessoal">Pessoal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editItem.col === 'ledger' && (
                <div className="space-y-2"><Label>Categoria</Label><Input value={editItem.editForm.category || ''} onChange={(e) => setEditItem({ ...editItem, editForm: { ...editItem.editForm, category: e.target.value } })} /></div>
              )}
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminKanban() {
  const [funnels, setFunnels] = useState([]);
  const [stages, setStages] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [funnelId, setFunnelId] = useState('');

  useEffect(() => {
    pb.collection('funnels').getFullList({ sort: 'order' }).then((f) => {
      setFunnels(f);
      if (f[0]) setFunnelId(f[0].id);
    }).catch(() => setFunnels([]));
  }, []);

  useEffect(() => {
    if (!funnelId) return;
    pb.collection('funnel_stages').getFullList({ filter: `funnel = "${funnelId}"`, sort: 'order' }).then(setStages).catch(() => setStages([]));
    pb.collection('processes').getFullList({
      filter: `archived != true && (funnel = "${funnelId}" || funnel = "")`,
      expand: 'client',
      sort: '-updated',
    }).then(setProcesses).catch(() => setProcesses([]));
  }, [funnelId]);

  const move = async (procId, stageId, stageName) => {
    await pb.collection('processes').update(procId, { stage_ref: stageId, stage: stageName, funnel: funnelId });
    setProcesses((prev) => prev.map((p) => (p.id === procId ? { ...p, stage_ref: stageId, stage: stageName, funnel: funnelId } : p)));
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight">Kanban de processos</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {funnels.map((f) => (
          <Button key={f.id} size="sm" variant={funnelId === f.id ? 'default' : 'outline'} onClick={() => setFunnelId(f.id)}>{f.name}</Button>
        ))}
      </div>
      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {stages.map((st) => {
          const cards = processes.filter((p) => p.stage_ref === st.id || (!p.stage_ref && p.stage === st.name));
          return (
            <div key={st.id} className="w-72 shrink-0 rounded-2xl border border-border bg-secondary/40 p-3">
              <p className="font-display mb-3 text-sm font-bold">{st.name} <span className="text-muted-foreground">({cards.length})</span></p>
              <div className="space-y-2">
                {cards.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <Link to={`/restrito/painel/processos/${p.id}`} className="text-sm font-semibold text-primary hover:underline">{p.title}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">{p.expand?.client?.name}</p>
                    <Select onValueChange={(sid) => {
                      const s = stages.find((x) => x.id === sid);
                      if (s) move(p.id, s.id, s.name);
                    }}>
                      <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue placeholder="Mover etapa" /></SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {stages.length === 0 && <p className="text-sm text-muted-foreground">Nenhum funil/etapa. Rode a migração ou crie em Configurações.</p>}
      </div>
    </div>
  );
}

export function AdminArquivo() {
  const [list, setList] = useState([]);
  const load = useCallback(() => {
    pb.collection('processes').getFullList({ filter: 'archived = true || status = "arquivado"', expand: 'client', sort: '-updated' })
      .then(setList).catch(() => setList([]));
  }, []);
  useEffect(load, [load]);
  const unarchive = async (p) => {
    if (!window.confirm(`Desarquivar "${p.title}"? O status voltará para Ativo.`)) return;
    await pb.collection('processes').update(p.id, { archived: false, status: 'ativo', stage: '' });
    load();
  };
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight">Arquivo morto</h1>
      <p className="mt-1 text-sm text-muted-foreground">Processos arquivados. É possível desarquivar a qualquer momento.</p>
      <ul className="mt-6 space-y-3">
        {list.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0">
              <Link to={`/restrito/painel/processos/${p.id}`} className="font-semibold text-primary hover:underline">{p.title}</Link>
              <p className="text-xs text-muted-foreground">{p.expand?.client?.name} · {p.stage || '—'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => unarchive(p)}><Archive className="mr-1 h-4 w-4" /> Desarquivar</Button>
          </li>
        ))}
        {list.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum processo arquivado.</p>}
      </ul>
    </div>
  );
}

export function AdminNotificacoes() {
  const [items, setItems] = useState([]);
  const load = useCallback(() => {
    pb.collection('notifications').getFullList({ sort: '-created' }).then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    // generate cobranca hints from financial pendente
    pb.collection('financial').getFullList({ filter: 'status = "pendente"', expand: 'client' }).then(async (fins) => {
      for (const f of fins.slice(0, 20)) {
        const title = `Lembrar de cobrar: ${f.description}`;
        try {
          const exists = await pb.collection('notifications').getList(1, 1, { filter: `title = "${title.replace(/"/g, '')}"` });
          if (exists.totalItems === 0) {
            await pb.collection('notifications').create({
              title,
              body: `${f.expand?.client?.name || 'Cliente'} · ${fmtBRL(f.amount)} · venc. ${fmtDate(f.due)}`,
              kind: 'cobranca',
              link: '/restrito/painel/financeiro',
              read: false,
              due: f.due,
            });
          }
        } catch { /* */ }
      }
      load();
    }).catch(() => {});
  }, [load]);

  const markRead = async (n) => { await pb.collection('notifications').update(n.id, { read: true }); load(); };
  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read);
    await Promise.all(unread.map((n, i) => pb.collection('notifications').update(n.id, { read: true }, { requestKey: `nrd-${n.id}-${i}` })));
    load();
  };
  const remove = async (n) => { await pb.collection('notifications').delete(n.id); load(); };
  const snooze = async (n) => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    await pb.collection('notifications').update(n.id, { snooze_until: toPbDateOnly(d.toISOString().slice(0, 10)) });
    load();
  };
  const [filter, setFilter] = useState('all');
  const isSnoozed = (n) => n.snooze_until && new Date(String(n.snooze_until).replace(' ', 'T')) > new Date();
  const visible = items.filter((n) => {
    if (filter === 'unread') return !n.read && !isSnoozed(n);
    if (filter === 'prazo') return n.kind === 'prazo' || n.kind === 'dnj';
    if (filter === 'cobranca') return n.kind === 'cobranca';
    return true;
  });
  const unreadCount = items.filter((n) => !n.read && !isSnoozed(n)).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Notificações</h1>
        {unreadCount > 0 && <Button size="sm" variant="outline" onClick={markAllRead}><CheckCircle2 className="mr-1 h-4 w-4" /> Marcar todas como lidas ({unreadCount})</Button>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[['all', 'Todas'], ['unread', 'Não lidas'], ['prazo', 'Prazos'], ['cobranca', 'Financeiro']].map(([v, l]) => (
          <Button key={v} size="sm" variant={filter === v ? 'default' : 'outline'} onClick={() => setFilter(v)}>{l}</Button>
        ))}
      </div>
      <ul className="mt-6 space-y-3">
        {visible.map((n) => {
          const snoozed = isSnoozed(n);
          return (
            <li key={n.id} className={`flex items-start gap-3 rounded-2xl border border-border p-4 ${n.read ? 'bg-card opacity-70' : 'bg-accent/5'}`}>
              <Bell className="mt-0.5 h-5 w-5 text-accent" />
              <div className="min-w-0 flex-1">
                {n.link ? <Link to={n.link} className="font-semibold text-primary hover:underline">{n.title}</Link> : <p className="font-semibold">{n.title}</p>}
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                {snoozed && <p className="mt-1 text-xs text-muted-foreground">Adiada até {fmtDate(n.snooze_until)}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {!n.read && !snoozed && <button type="button" onClick={() => markRead(n)} className="text-xs text-primary hover:underline">Marcar lida</button>}
                  {!n.read && !snoozed && <button type="button" onClick={() => snooze(n)} className="text-xs text-muted-foreground hover:underline">Adiar 1 dia</button>}
                  <button type="button" onClick={() => remove(n)} className="text-xs text-destructive hover:underline">Excluir</button>
                </div>
              </div>
            </li>
          );
        })}
        {visible.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma notificação.</p>}
      </ul>
    </div>
  );
}

const FUNNEL_TYPES = [
  { value: 'judicial', label: 'Judicial' },
  { value: 'extrajudicial', label: 'Extrajudicial' },
  { value: 'custom', label: 'Personalizado' },
];

const EMPTY_FUNNEL = { name: '', type: 'custom', color: '#1f5c45', active: true, order: 0 };
const EMPTY_STAGE = { name: '', order: 0, color: '#1f5c45', is_archive: false };

export function AdminConfig() {
  const [photoUrl, setPhotoUrl] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [funnels, setFunnels] = useState([]);
  const [stagesByFunnel, setStagesByFunnel] = useState({});
  const [expanded, setExpanded] = useState({});
  const [funnelDialog, setFunnelDialog] = useState({ open: false, editing: null, form: EMPTY_FUNNEL, error: '' });
  const [stageDialog, setStageDialog] = useState({ open: false, editing: null, funnelId: '', form: EMPTY_STAGE, error: '' });
  const [googleSettings, setGoogleSettings] = useState({ clientId: '', webhookUrl: '', webhookToken: '' });
  const [googleStatus, setGoogleStatus] = useState(null);
  const [googleMsg, setGoogleMsg] = useState('');
  const [googleSaving, setGoogleSaving] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [version, setVersion] = useState(null);

  const authHeaders = () => ({ Authorization: `Bearer ${pb.authStore.token}` });

  const loadMaintenance = useCallback(async () => {
    try {
      const [googleResponse, versionResponse] = await Promise.all([
        apiServerClient.fetch('/integrations/google', { headers: authHeaders() }),
        apiServerClient.fetch('/maintenance/version', { headers: authHeaders() }),
      ]);
      if (googleResponse.ok) {
        const data = await googleResponse.json();
        setGoogleStatus(data);
        setGoogleSettings((prev) => ({ ...prev, clientId: data.clientId || '', webhookUrl: data.webhookUrl || '' }));
      }
      if (versionResponse.ok) setVersion(await versionResponse.json());
    } catch (error) {
      setGoogleMsg(error?.message || 'Não foi possível carregar as configurações do servidor.');
    }
  }, []);

  useEffect(() => { loadMaintenance(); }, [loadMaintenance]);

  const saveGoogleSettings = async (e) => {
    e.preventDefault();
    setGoogleSaving(true); setGoogleMsg('');
    try {
      const response = await apiServerClient.fetch('/integrations/google', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: googleSettings.clientId,
          webhookUrl: googleSettings.webhookUrl,
          ...(googleSettings.webhookToken ? { webhookToken: googleSettings.webhookToken } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a integração.');
      setGoogleStatus(data);
      setGoogleSettings((prev) => ({ ...prev, clientId: data.clientId || '', webhookUrl: data.webhookUrl || '', webhookToken: '' }));
      setGoogleMsg('Configuração Google salva. Reabra a Agenda para atualizar o botão de conexão.');
    } catch (error) {
      setGoogleMsg(error?.message || 'Não foi possível salvar.');
    } finally { setGoogleSaving(false); }
  };

  const exportBackup = async () => {
    setBackupBusy(true); setBackupMsg('');
    try {
      const response = await apiServerClient.fetch('/maintenance/export', { headers: authHeaders() });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Não foi possível exportar os dados.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jd-office-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setBackupMsg('Exportação concluída. Guarde o arquivo em local seguro.');
    } catch (error) {
      setBackupMsg(error?.message || 'Não foi possível exportar.');
    } finally { setBackupBusy(false); }
  };

  const importBackup = async (e) => {
    const fileToImport = e.target.files?.[0];
    e.target.value = '';
    if (!fileToImport) return;
    if (!window.confirm('A importação atualizará registros com o mesmo ID e criará os ausentes. Deseja continuar?')) return;
    setBackupBusy(true); setBackupMsg('Importando…');
    try {
      const payload = JSON.parse(await fileToImport.text());
      const response = await apiServerClient.fetch('/maintenance/import', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível importar o backup.');
      setBackupMsg(`Importação concluída: ${data.created} criados, ${data.updated} atualizados, ${data.errors?.length || 0} erros. Usuários/clientes: ${data.skippedAuth} preservados para migração física.`);
    } catch (error) {
      setBackupMsg(error?.message || 'Arquivo inválido ou importação não concluída.');
    } finally { setBackupBusy(false); }
  };

  const loadFunnels = useCallback(() => {
    pb.collection('funnels').getFullList({ sort: 'order' }).then(setFunnels).catch(() => setFunnels([]));
  }, []);

  const loadStages = useCallback((funnelId) => {
    pb.collection('funnel_stages').getFullList({ filter: `funnel = "${funnelId}"`, sort: 'order' })
      .then((rows) => setStagesByFunnel((prev) => ({ ...prev, [funnelId]: rows })))
      .catch(() => setStagesByFunnel((prev) => ({ ...prev, [funnelId]: [] })));
  }, []);

  useEffect(() => {
    pb.collection('site_settings').getFirstListItem('key = "about_photo"')
      .then((r) => { if (r.file) setPhotoUrl(pb.files.getURL(r, r.file)); else setPhotoUrl(r.value || ''); })
      .catch(() => {});
    loadFunnels();
  }, [loadFunnels]);

  const toggleExpand = (fid) => {
    setExpanded((prev) => {
      const next = { ...prev, [fid]: !prev[fid] };
      if (next[fid] && !stagesByFunnel[fid]) loadStages(fid);
      return next;
    });
  };

  const savePhoto = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      let rec;
      try { rec = await pb.collection('site_settings').getFirstListItem('key = "about_photo"'); } catch { rec = null; }
      const fd = new FormData();
      fd.append('key', 'about_photo');
      if (file) fd.append('file', file);
      if (photoUrl && !file) fd.append('value', photoUrl);
      if (rec) await pb.collection('site_settings').update(rec.id, fd);
      else await pb.collection('site_settings').create(fd);
      setMsg('Foto salva. Aparece na página Sobre.');
      loadFunnels();
    } catch (err) {
      setMsg(err?.message || 'Erro ao salvar.');
    }
  };

  /* ---- Funil CRUD ---- */
  const openNewFunnel = () => setFunnelDialog({ open: true, editing: null, form: { ...EMPTY_FUNNEL, order: funnels.length + 1 }, error: '' });
  const openEditFunnel = (f) => setFunnelDialog({ open: true, editing: f, form: { name: f.name, type: f.type, color: f.color || '#1f5c45', active: f.active !== false, order: f.order || 0 }, error: '' });

  const saveFunnel = async (e) => {
    e.preventDefault();
    const d = funnelDialog;
    if (!d.form.name.trim()) { setFunnelDialog({ ...d, error: 'Informe o nome.' }); return; }
    try {
      const payload = { ...d.form, order: Number(d.form.order) || 0, active: !!d.form.active };
      if (d.editing) await pb.collection('funnels').update(d.editing.id, payload);
      else await pb.collection('funnels').create(payload);
      setFunnelDialog({ open: false, editing: null, form: EMPTY_FUNNEL, error: '' });
      loadFunnels();
    } catch (err) {
      setFunnelDialog({ ...d, error: err?.message || 'Não foi possível salvar.' });
    }
  };

  const deleteFunnel = async (f) => {
    if (!window.confirm(`Excluir o funil "${f.name}" e todas as suas etapas? Processos vinculados não serão excluídos, mas perderão a referência de etapa.`)) return;
    try {
      const sts = await pb.collection('funnel_stages').getFullList({ filter: `funnel = "${f.id}"` });
      await Promise.all(sts.map((s, i) => pb.collection('funnel_stages').delete(s.id, { requestKey: `del-stage-${s.id}-${i}` })));
    } catch { /* */ }
    await pb.collection('funnels').delete(f.id);
    loadFunnels();
  };

  /* ---- Etapa CRUD ---- */
  const openNewStage = (funnelId) => {
    const existing = stagesByFunnel[funnelId] || [];
    setStageDialog({ open: true, editing: null, funnelId, form: { ...EMPTY_STAGE, order: existing.length + 1 }, error: '' });
  };
  const openEditStage = (funnelId, s) => setStageDialog({ open: true, editing: s, funnelId, form: { name: s.name, order: s.order || 0, color: s.color || '#1f5c45', is_archive: !!s.is_archive }, error: '' });

  const saveStage = async (e) => {
    e.preventDefault();
    const d = stageDialog;
    if (!d.form.name.trim()) { setStageDialog({ ...d, error: 'Informe o nome.' }); return; }
    try {
      const payload = { funnel: d.funnelId, name: d.form.name, order: Number(d.form.order) || 0, color: d.form.color, is_archive: !!d.form.is_archive };
      if (d.editing) await pb.collection('funnel_stages').update(d.editing.id, payload);
      else await pb.collection('funnel_stages').create(payload);
      setStageDialog({ open: false, editing: null, funnelId: '', form: EMPTY_STAGE, error: '' });
      loadStages(d.funnelId);
    } catch (err) {
      setStageDialog({ ...d, error: err?.message || 'Não foi possível salvar.' });
    }
  };

  const deleteStage = async (funnelId, s) => {
    if (!window.confirm(`Excluir a etapa "${s.name}"? Processos nela ficarão sem etapa definida.`)) return;
    await pb.collection('funnel_stages').delete(s.id);
    loadStages(funnelId);
  };

  const moveStage = async (funnelId, s, dir) => {
    const list = [...(stagesByFunnel[funnelId] || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = list.findIndex((x) => x.id === s.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx];
    const b = list[swapIdx];
    const ao = a.order || idx;
    const bo = b.order || swapIdx;
    try {
      await Promise.all([
        pb.collection('funnel_stages').update(a.id, { order: bo }, { requestKey: `mv-a-${a.id}` }),
        pb.collection('funnel_stages').update(b.id, { order: ao }, { requestKey: `mv-b-${b.id}` }),
      ]);
      loadStages(funnelId);
    } catch { /* */ }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Integrações, segurança operacional, foto da página Sobre, funis e etapas editáveis.</p>
      </div>

      <form onSubmit={saveGoogleSettings} className="max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="font-display font-bold">Google Agenda</h2>
          <p className="mt-1 text-sm text-muted-foreground">Configure pelo sistema o Client ID público e o webhook. A senha da conta Google continua sendo digitada somente na tela oficial do Google.</p>
        </div>
        <div className="space-y-2"><Label>OAuth Client ID — Aplicativo da Web</Label><Input type="text" name="google-oauth-client-id" autoComplete="off" value={googleSettings.clientId} onChange={(e) => setGoogleSettings({ ...googleSettings, clientId: e.target.value })} placeholder="123...apps.googleusercontent.com" /></div>
        <div className="space-y-2"><Label>URL pública HTTPS do webhook</Label><Input type="url" name="google-webhook-url" autoComplete="off" value={googleSettings.webhookUrl} onChange={(e) => setGoogleSettings({ ...googleSettings, webhookUrl: e.target.value })} placeholder="https://seu-dominio.com/hcgi/api/gcal/webhook" /></div>
        <div className="space-y-2"><Label>Token de validação do webhook (opcional)</Label><Input type="password" name="google-webhook-token" autoComplete="new-password" value={googleSettings.webhookToken} onChange={(e) => setGoogleSettings({ ...googleSettings, webhookToken: e.target.value })} placeholder={googleStatus?.webhookTokenConfigured ? 'Já configurado — deixe vazio para manter' : 'Crie um token aleatório'} /></div>
        <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={googleSaving}>{googleSaving ? 'Salvando…' : 'Salvar Google Agenda'}</Button>{googleStatus && <Badge variant="outline">{googleStatus.configured ? 'OAuth configurado' : 'OAuth pendente'}</Badge>}{googleStatus?.webhookConfigured && <Badge variant="outline">Webhook HTTPS configurado</Badge>}</div>
        {googleMsg && <p className="text-sm text-muted-foreground">{googleMsg}</p>}
      </form>

      <section className="max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="font-display font-bold">Backup, exportação e importação</h2>
          <p className="mt-1 text-sm text-muted-foreground">O exportador gera um JSON dos registros da aplicação. Para preservar arquivos anexos, senhas e usuários exatamente como estão, use também o backup físico descrito no manual.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button type="button" onClick={exportBackup} disabled={backupBusy}><Download className="mr-1 h-4 w-4" /> Exportar dados JSON</Button><label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"><Upload className="mr-1 h-4 w-4" /> Importar JSON<input type="file" accept="application/json,.json" className="sr-only" onChange={importBackup} disabled={backupBusy} /></label></div>
        {backupMsg && <p className="text-sm text-muted-foreground">{backupMsg}</p>}
        <p className="text-xs text-muted-foreground">A importação é incremental: registros com o mesmo ID são atualizados e registros ausentes são criados. Faça um backup antes de importar.</p>
      </section>

      <section className="max-w-2xl space-y-3 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display font-bold">Atualização segura</h2>{version && <Badge variant="outline">Versão {version.version}</Badge>}</div>
        <p className="text-sm text-muted-foreground">Use o arquivo <code>update-system.bat</code> na pasta do projeto. Ele cria um backup antes de atualizar, preserva <code>pb_data</code>, <code>.env</code> e a chave de criptografia, instala dependências e reinicia o sistema. As migrações do PocketBase são executadas automaticamente na inicialização.</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground"><li>Coloque a nova versão em um arquivo <code>app.tar.gz</code> ou passe o caminho como parâmetro.</li><li>Feche as janelas antigas do sistema.</li><li>Execute <code>update-system.bat</code>.</li><li>Confira a mensagem de backup e acesse novamente o sistema.</li></ol>
        <p className="text-xs text-muted-foreground">Nunca apague a pasta <code>apps/pocketbase/pb_data</code>; ela contém o banco e os anexos.</p>
      </section>
      <form onSubmit={savePhoto} className="max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display font-bold">Foto — página Sobre</h2>
        {photoUrl && <img src={photoUrl} alt="" className="h-40 w-40 rounded-2xl object-cover" />}
        <div className="space-y-2"><Label>URL da foto</Label><Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" /></div>
        <div className="space-y-2"><Label>ou upload</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        <Button type="submit">Salvar foto</Button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </form>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display font-bold">Funis de processo</h2>
          <Button size="sm" onClick={openNewFunnel}><Plus className="mr-1 h-4 w-4" /> Novo funil</Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Clique em um funil para expandir e gerenciar suas etapas. Todas as alterações são registradas na auditoria.</p>

        <ul className="mt-4 space-y-3">
          {funnels.length === 0 && <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum funil. Crie o primeiro acima.</li>}
          {funnels.map((f) => {
            const stages = stagesByFunnel[f.id] || [];
            const isOpen = !!expanded[f.id];
            return (
              <li key={f.id} className="rounded-xl border border-border">
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <button type="button" onClick={() => toggleExpand(f.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate font-semibold">{f.name}</span>
                    <Badge variant="outline" className="ml-1">{FUNNEL_TYPES.find((t) => t.value === f.type)?.label || f.type}</Badge>
                    {f.color && <span className="inline-block h-3 w-3 rounded-full" style={{ background: f.color }} />}
                    <Badge className={f.active !== false ? 'bg-primary/10 text-primary border-0 hover:bg-primary/10' : 'bg-muted text-muted-foreground border-0 hover:bg-muted'}>{f.active !== false ? 'Ativo' : 'Inativo'}</Badge>
                  </button>
                  <Button variant="ghost" size="icon" aria-label="Editar funil" onClick={() => openEditFunnel(f)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir funil" onClick={() => deleteFunnel(f)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>

                {isOpen && (
                  <div className="border-t border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Etapas ({stages.length})</p>
                      <Button size="sm" variant="outline" onClick={() => openNewStage(f.id)}><Plus className="mr-1 h-3.5 w-3.5" /> Nova etapa</Button>
                    </div>
                    {stages.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">Nenhuma etapa. Adicione a primeira.</p>}
                    <ol className="space-y-2">
                      {stages.map((s, i) => (
                        <li key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5">
                          <span className="flex w-6 shrink-0 justify-center text-xs font-mono text-muted-foreground">{i + 1}</span>
                          {s.color && <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{s.name}</p>
                            {s.is_archive && <Badge className="ml-0 bg-accent/15 text-accent border-0 hover:bg-accent/15">Arquivo morto</Badge>}
                          </div>
                          <Button variant="ghost" size="icon" aria-label="Mover para cima" disabled={i === 0} onClick={() => moveStage(f.id, s, 'up')}><ArrowUp className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" aria-label="Mover para baixo" disabled={i === stages.length - 1} onClick={() => moveStage(f.id, s, 'down')}><ArrowDown className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" aria-label="Editar etapa" onClick={() => openEditStage(f.id, s)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" aria-label="Excluir etapa" onClick={() => deleteStage(f.id, s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Dialog Funil */}
      <Dialog open={funnelDialog.open} onOpenChange={(v) => setFunnelDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{funnelDialog.editing ? 'Editar funil' : 'Novo funil'}</DialogTitle></DialogHeader>
          <form onSubmit={saveFunnel} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={funnelDialog.form.name} onChange={(e) => setFunnelDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))} required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={funnelDialog.form.type} onValueChange={(v) => setFunnelDialog((d) => ({ ...d, form: { ...d.form, type: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FUNNEL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={funnelDialog.form.order} onChange={(e) => setFunnelDialog((d) => ({ ...d, form: { ...d.form, order: e.target.value } }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                <Input type="color" className="h-10 w-14 p-1" value={funnelDialog.form.color || '#1f5c45'} onChange={(e) => setFunnelDialog((d) => ({ ...d, form: { ...d.form, color: e.target.value } }))} />
                <Input value={funnelDialog.form.color || ''} onChange={(e) => setFunnelDialog((d) => ({ ...d, form: { ...d.form, color: e.target.value } }))} placeholder="#1f5c45" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!funnelDialog.form.active} onCheckedChange={(v) => setFunnelDialog((d) => ({ ...d, form: { ...d.form, active: !!v } }))} /> Ativo
            </label>
            {funnelDialog.error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{funnelDialog.error}</p>}
            <Button type="submit" className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Etapa */}
      <Dialog open={stageDialog.open} onOpenChange={(v) => setStageDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{stageDialog.editing ? 'Editar etapa' : 'Nova etapa'}</DialogTitle></DialogHeader>
          <form onSubmit={saveStage} className="space-y-4">
            <div className="space-y-2"><Label>Nome da etapa</Label><Input value={stageDialog.form.name} onChange={(e) => setStageDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))} required /></div>
            <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={stageDialog.form.order} onChange={(e) => setStageDialog((d) => ({ ...d, form: { ...d.form, order: e.target.value } }))} /></div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                <Input type="color" className="h-10 w-14 p-1" value={stageDialog.form.color || '#1f5c45'} onChange={(e) => setStageDialog((d) => ({ ...d, form: { ...d.form, color: e.target.value } }))} />
                <Input value={stageDialog.form.color || ''} onChange={(e) => setStageDialog((d) => ({ ...d, form: { ...d.form, color: e.target.value } }))} placeholder="#1f5c45" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!stageDialog.form.is_archive} onCheckedChange={(v) => setStageDialog((d) => ({ ...d, form: { ...d.form, is_archive: !!v } }))} /> Etapa de arquivo morto (encerra o fluxo)
            </label>
            {stageDialog.error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{stageDialog.error}</p>}
            <Button type="submit" className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
