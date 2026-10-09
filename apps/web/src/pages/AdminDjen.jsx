import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock3, ExternalLink, List, LayoutGrid, RefreshCw, Search, Scale, SlidersHorizontal, Trash2, XCircle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function authHeaders(json = true) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: pb.authStore.token || '',
  };
}

async function apiPost(path, body = {}) {
  const response = await apiServerClient.fetch(path, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.message === 'string'
        ? payload.message
        : `Falha HTTP ${response.status}`;
    const error = new Error(message);
    error.code = payload?.code || '';
    error.retryable = payload?.retryable === true;
    error.sourceStatus = payload?.sourceStatus || response.status;
    error.httpStatus = response.status;
    throw error;
  }
  return payload;
}

function onlyDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

function brDate(value) {
  const d = onlyDate(value);
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function inputDate(value) {
  const d = new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateDaysAgo(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return inputDate(d);
}

function actionBadge(value) {
  if (value === 'sim') return <Badge className="bg-amber-600 hover:bg-amber-600">Ação necessária</Badge>;
  if (value === 'nao') return <Badge variant="secondary">Sem ação</Badge>;
  return <Badge variant="outline" className="border-amber-400 text-amber-700">Revisar</Badge>;
}

function urgencyBadge(value) {
  if (value === 'alta') return <Badge variant="destructive">Urgência alta</Badge>;
  if (value === 'media') return <Badge className="bg-amber-600 hover:bg-amber-600">Urgência média</Badge>;
  return <Badge variant="outline">Normal</Badge>;
}

function triageStage(publication) {
  if (publication.action_required === 'nao') return 'sem_acao';
  if (!publication.process) return 'vincular';
  if (publication.movement_status === 'aprovado' && publication.deadline_status === 'confirmado') return 'concluido';
  if (publication.deadline_status === 'rascunho' || publication.deadline) return 'revisar_prazo';
  return 'classificar';
}

function stageLabel(stage) {
  return {
    vincular: 'Vincular processo',
    classificar: 'Classificar providência',
    revisar_prazo: 'Revisar prazo',
    concluido: 'Concluído',
    sem_acao: 'Sem ação',
  }[stage] || 'Revisar';
}

function nextStepText(publication) {
  const stage = triageStage(publication);
  if (stage === 'vincular') return 'Localize e vincule o processo cadastrado antes de aprovar qualquer providência.';
  if (stage === 'classificar') return 'Escolha se a publicação será lançada como movimentação, prazo ou ambos.';
  if (stage === 'revisar_prazo' && publication.deadline_status !== 'confirmado') return 'Confira a data de publicação, dias úteis, feriados e vencimento antes de confirmar.';
  if (stage === 'concluido') return 'Movimentação e prazo já foram lançados; a chave DJEN continua apenas para deduplicação.';
  if (stage === 'sem_acao') return 'Registro arquivado como publicação sem providência.';
  return 'Faça a revisão humana do teor e aprove a providência necessária.';
}

function formatSyncTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function AdminDjen() {
  const { user } = useAuth();
  const [publications, setPublications] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState({});
  const [filter, setFilter] = useState('acao');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');
  const [period, setPeriod] = useState('30');
  const [startDate, setStartDate] = useState(dateDaysAgo(30));
  const [endDate, setEndDate] = useState(inputDate(new Date()));
  const [editDays, setEditDays] = useState({});
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', scope: 'comarca', tribunal: '', comarca: '' });
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [sortBy, setSortBy] = useState('recent');
  const [syncState, setSyncState] = useState('idle');
  const [lastSyncAt, setLastSyncAt] = useState('');

  const load = useCallback(async () => {
    const [pubs, hs] = await Promise.all([
      pb.collection('djen_publications').getFullList({ sort: '-availability_date,-created', expand: 'process' }).catch(() => []),
      pb.collection('court_holidays').getFullList({ sort: 'date' }).catch(() => []),
    ]);
    const processRows = await pb.collection('processes').getFullList({ sort: 'title,number', fields: 'id,title,number,client,status' }).catch(() => []);
    setPublications(pubs);
    setHolidays(hs);
    setProcesses(processRows);
    setSelectedProcess((prev) => {
      const next = { ...prev };
      pubs.forEach((p) => { if (next[p.id] == null) next[p.id] = p.process || 'none'; });
      return next;
    });
    setEditDays((prev) => {
      const next = { ...prev };
      pubs.forEach((p) => { if (next[p.id] == null) next[p.id] = p.deadline_days || ''; });
      return next;
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setLastSyncAt(window.localStorage.getItem('djen:last-sync-at') || '');
  }, []);

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = publications.filter((p) => {
      if (filter === 'acao' && p.action_required !== 'sim' && p.action_required !== 'revisar') return false;
      if (filter === 'revisar' && p.action_required !== 'revisar') return false;
      if (filter === 'rascunho' && p.deadline_status !== 'rascunho') return false;
      if (filter === 'confirmado' && p.deadline_status !== 'confirmado') return false;
      if (filter === 'semacao' && p.action_required !== 'nao') return false;
      if (!normalizedQuery) return true;
      return [p.number, p.process_number, p.summary, p.raw, p.tribunal, p.court, p.orgao, p.action_reason]
        .filter(Boolean).join(' ').toLocaleLowerCase().includes(normalizedQuery);
    });
    return filtered.sort((a, b) => {
      if (sortBy === 'urgency') return ({ alta: 0, media: 1, normal: 2 }[a.urgency] || 3) - ({ alta: 0, media: 1, normal: 2 }[b.urgency] || 3);
      if (sortBy === 'deadline') return String(a.deadline || '9999').localeCompare(String(b.deadline || '9999'));
      return String(b.availability_date || b.created || '').localeCompare(String(a.availability_date || a.created || ''));
    });
  }, [publications, filter, query, sortBy]);

  const stats = useMemo(() => ({
    total: publications.length,
    acao: publications.filter((p) => p.action_required === 'sim').length,
    revisar: publications.filter((p) => p.action_required === 'revisar').length,
    rascunho: publications.filter((p) => p.deadline_status === 'rascunho').length,
  }), [publications]);

  const workflowStats = useMemo(() => publications.reduce((acc, publication) => {
    const stage = triageStage(publication);
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {}), [publications]);

  const sync = async () => {
    const selectedStart = period === 'custom' ? startDate : dateDaysAgo(Number(period));
    const selectedEnd = endDate || inputDate(new Date());
    if (!selectedStart || !selectedEnd || selectedStart > selectedEnd) {
      setMsg('Informe um período válido: a data inicial deve ser anterior ou igual à data final.');
      return;
    }
    setBusy(true); setSyncState('loading'); setMsg('');
    try {
      const r = await apiPost('/legal/djen/sync', { startDate: selectedStart, endDate: selectedEnd });
      const syncedAt = new Date().toISOString();
      setSyncState('success');
      setLastSyncAt(syncedAt);
      window.localStorage.setItem('djen:last-sync-at', syncedAt);
      setMsg(`DJEN sincronizado de ${brDate(r.startDate)} até ${brDate(r.endDate)}: ${r.found} publicação(ões) localizada(s).`);
      await load();
    } catch (e) {
      const sourceUnavailable = e.code === 'DJEN_SOURCE_UNAVAILABLE' || e.sourceStatus === 503 || /DJEN respondeu 503/i.test(e.message || '');
      setSyncState(sourceUnavailable ? 'unavailable' : 'error');
      setMsg(e.message);
    } finally { setBusy(false); }
  };

  const recalc = async (p) => {
    const days = Number(editDays[p.id]);
    if (!days) { setMsg('Informe a quantidade de dias para recalcular o prazo.'); return; }
    setBusyId(p.id); setMsg('');
    try {
      await apiPost(`/legal/djen/${p.id}/recalculate`, { days, regime: p.regime || 'cpc' });
      await load();
      setMsg('Prazo recalculado e mantido como rascunho.');
    } catch (e) { setMsg(e.message); }
    finally { setBusyId(''); }
  };

  const confirm = async (p) => {
    if (!window.confirm(`Confirmar o prazo em ${brDate(p.deadline)} e inserir na agenda?`)) return;
    setBusyId(p.id); setMsg('');
    try {
      await apiPost(`/legal/djen/${p.id}/confirm`);
      await load();
      setMsg('Prazo confirmado e inserido na agenda.');
    } catch (e) { setMsg(e.message); }
    finally { setBusyId(''); }
  };

  const approve = async (p, options) => {
    const processId = selectedProcess[p.id] && selectedProcess[p.id] !== 'none' ? selectedProcess[p.id] : p.process;
    if ((options.movement || options.deadline) && !processId) {
      setMsg('Selecione um processo cadastrado antes de aprovar a publicação.');
      return;
    }
    if (options.deadline && !p.deadline && !Number(editDays[p.id])) {
      setMsg('Informe a quantidade de dias ou recalcule o prazo antes de aprovar.');
      return;
    }
    const label = options.movement && options.deadline ? 'movimentação e prazo' : options.movement ? 'movimentação' : 'prazo';
    if (!window.confirm(`Aprovar ${label} para este processo?`)) return;
    setBusyId(p.id); setMsg('');
    try {
      await apiPost(`/legal/djen/${p.id}/approve`, {
        processId,
        movement: Boolean(options.movement),
        deadline: Boolean(options.deadline),
        days: Number(editDays[p.id]) || p.deadline_days || undefined,
        regime: p.regime || 'cpc',
      });
      await load();
      setMsg(`${label[0].toUpperCase()}${label.slice(1)} aprovad${options.movement && options.deadline ? 'as' : 'a'} e registrada sem duplicidade.`);
    } catch (e) { setMsg(e.message); }
    finally { setBusyId(''); }
  };

  const linkProcess = async (p) => {
    const processId = selectedProcess[p.id] && selectedProcess[p.id] !== 'none' ? selectedProcess[p.id] : '';
    if (!processId) { setMsg('Selecione o processo que corresponde à publicação.'); return; }
    setBusyId(p.id); setMsg('');
    try {
      await apiPost(`/legal/djen/${p.id}/approve`, { processId });
      await load();
      setMsg('Processo vinculado. A publicação está disponível para revisão.');
    } catch (e) { setMsg(e.message); }
    finally { setBusyId(''); }
  };

  const ignore = async (p) => {
    if (!window.confirm('Marcar esta publicação como sem ação e remover qualquer rascunho de prazo?')) return;
    setBusyId(p.id); setMsg('');
    try {
      await apiPost(`/legal/djen/${p.id}/ignore`);
      await load();
    } catch (e) { setMsg(e.message); }
    finally { setBusyId(''); }
  };

  const saveHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.date || !holidayForm.name.trim()) return;
    setMsg('');
    try {
      await pb.collection('court_holidays').create({
        date: `${holidayForm.date} 12:00:00.000Z`,
        name: holidayForm.name.trim(),
        scope: holidayForm.scope,
        tribunal: holidayForm.tribunal.trim().toUpperCase(),
        comarca: holidayForm.comarca.trim(),
        source: 'Cadastro interno',
        active: true,
        responsible_user: user?.id || '',
      });
      setHolidayForm({ date: '', name: '', scope: 'comarca', tribunal: '', comarca: '' });
      await load();
      setMsg('Feriado/indisponibilidade cadastrado. Novos cálculos passarão a considerá-lo.');
    } catch (e2) { setMsg(e2?.message || 'Não foi possível cadastrar.'); }
  };

  const removeHoliday = async (id) => {
    await pb.collection('court_holidays').delete(id);
    await load();
  };

  const compactPublication = (p) => (
    <article key={p.id} className="rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">{actionBadge(p.action_required)} {urgencyBadge(p.urgency)}</div>
          <h3 className="mt-2 truncate text-sm font-bold">{p.number || p.process_number || 'Processo não identificado'}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Disponibilização {brDate(p.availability_date)}{p.deadline ? ` · vence ${brDate(p.deadline)}` : ''}</p>
        </div>
        {p.link && <Button asChild size="icon" variant="ghost" title="Abrir publicação"><a href={p.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>}
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.summary || 'Sem resumo.'}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.process && <Button size="sm" className="h-8 text-xs" onClick={() => approve(p, { movement: true, deadline: false })} disabled={busyId === p.id || p.movement_status === 'aprovado'}>Movimentação</Button>}
        {p.process && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => approve(p, { movement: false, deadline: true })} disabled={busyId === p.id || p.deadline_status === 'confirmado'}>Prazo</Button>}
        {!p.process && <div className="flex w-full flex-col gap-1.5 sm:flex-row"><Select value={selectedProcess[p.id] || 'none'} onValueChange={(value) => setSelectedProcess({ ...selectedProcess, [p.id]: value })}><SelectTrigger className="h-8 min-w-0 flex-1 text-xs"><SelectValue placeholder="Selecionar processo" /></SelectTrigger><SelectContent><SelectItem value="none">Selecionar processo</SelectItem>{processes.map((process) => <SelectItem key={process.id} value={process.id}>{process.title || process.number || process.id}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => linkProcess(p)} disabled={busyId === p.id || !selectedProcess[p.id] || selectedProcess[p.id] === 'none'}>Vincular</Button></div>}
        {p.action_required === 'nao' && <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => ignore(p)} disabled={busyId === p.id}>Arquivar</Button>}
      </div>
    </article>
  );

  const kanbanColumns = [
    ['acao', 'Ação necessária', 'border-amber-300 bg-amber-50/40'],
    ['revisar', 'Revisar', 'border-blue-300 bg-blue-50/40'],
    ['rascunho', 'Prazo em rascunho', 'border-violet-300 bg-violet-50/40'],
    ['confirmado', 'Confirmados', 'border-emerald-300 bg-emerald-50/40'],
    ['semacao', 'Sem ação', 'border-slate-300 bg-slate-50/50'],
  ];

  return (
    <div className="space-y-6">
      <Helmet><title>Publicações DJEN — Área Restrita</title></Helmet>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Publicações DJEN</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Inbox da sua OAB com triagem, prazo em rascunho e confirmação para a agenda.</p>
          <p className="mt-1 text-xs text-muted-foreground">OAB ativa: {user?.oab_number ? `${user.oab_number}/${user?.oab_uf || ''}` : 'não cadastrada'}</p>
        </div>
        <div className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end lg:w-auto">
          <div className="min-w-0 flex-1 space-y-1 sm:min-w-[150px]"><Label className="text-xs">Período da consulta</Label><Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="15">Últimos 15 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="custom">Período específico</SelectItem></SelectContent></Select></div>
          {period === 'custom' && <>
            <div className="min-w-0 flex-1 space-y-1 sm:min-w-[140px]"><Label className="text-xs">De</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="min-w-0 flex-1 space-y-1 sm:min-w-[140px]"><Label className="text-xs">Até</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </>}
          <Button className="w-full sm:w-auto" onClick={sync} disabled={busy || !user?.oab_number || !user?.oab_uf}>
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Sincronizando…' : 'Sincronizar agora'}
          </Button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl border p-3 text-sm ${syncState === 'unavailable' ? 'border-amber-300 bg-amber-50 text-amber-950' : syncState === 'error' ? 'border-red-300 bg-red-50 text-red-950' : 'border-border bg-card'}`} role="status">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              {syncState === 'unavailable' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : syncState === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
              <span>{syncState === 'unavailable' ? 'A fonte do DJEN está temporariamente indisponível. As publicações já salvas continuam disponíveis para triagem. ' : ''}{msg}</span>
            </div>
            {syncState === 'unavailable' && <Button size="sm" variant="outline" onClick={sync} disabled={busy} className="shrink-0 border-amber-400 bg-background"><RefreshCw className={`mr-1 h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Tentar novamente</Button>}
          </div>
          {syncState === 'unavailable' && <p className="mt-2 text-xs text-amber-800">A consulta não foi descartada: quando o serviço voltar, repita a sincronização usando o mesmo período. O sistema não duplica itens porque mantém o identificador externo apenas como chave técnica.</p>}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="Fluxo operacional da publicação">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Procedimento operacional padrão</p>
            <h2 className="mt-1 font-display text-lg font-bold">Da publicação à agenda, com revisão humana</h2>
          </div>
          <p className="text-xs text-muted-foreground">A chave DJEN evita duplicidade; ela não substitui o número do processo.</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ['captura', '1', 'Capturar', publications.length],
            ['vincular', '2', 'Vincular processo', workflowStats.vincular || 0],
            ['classificar', '3', 'Classificar', workflowStats.classificar || 0],
            ['revisar_prazo', '4', 'Revisar prazo', workflowStats.revisar_prazo || 0],
            ['concluido', '5', 'Aprovado', workflowStats.concluido || 0],
            ['sem_acao', '6', 'Sem ação', workflowStats.sem_acao || 0],
          ].map(([key, number, label, count], index) => (
            <button type="button" key={key} onClick={() => { if (key === 'vincular') setFilter('todos'); else if (key === 'revisar_prazo') setFilter('rascunho'); else if (key === 'sem_acao') setFilter('semacao'); else if (key === 'concluido') setFilter('confirmado'); }} className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/50 hover:bg-primary/5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{number}</span>
              <span className="min-w-0"><span className="block truncate text-xs font-semibold">{label}</span><span className="text-[11px] text-muted-foreground">{count} item(ns)</span></span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Regra de conferência: processo → natureza da providência → prazo legal → prazo interno → aprovação.</span>
          {lastSyncAt && <span>Última sincronização concluída: {formatSyncTime(lastSyncAt)}</span>}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['todos', 'Publicações', stats.total], ['acao', 'Ação necessária', stats.acao], ['revisar', 'Revisar', stats.revisar], ['rascunho', 'Prazos em rascunho', stats.rascunho]].map(([target, label, value]) => <button type="button" key={label} onClick={() => setFilter(target)} className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${filter === target ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card'}`}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">Ver publicações →</p></button>)}
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
          ['acao', 'Para agir/revisar'], ['rascunho', 'Prazos em rascunho'], ['confirmado', 'Confirmados'], ['semacao', 'Sem ação'], ['todos', 'Todos'],
          ].map(([v, label]) => <Button className="shrink-0" key={v} size="sm" variant={filter === v ? 'default' : 'outline'} onClick={() => setFilter(v)}>{label}</Button>)}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar processo, tribunal, resumo ou teor…" /></div>
          <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="sm:w-[190px]"><SlidersHorizontal className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">Mais recentes</SelectItem><SelectItem value="deadline">Prazo mais próximo</SelectItem><SelectItem value="urgency">Maior urgência</SelectItem></SelectContent></Select>
          <div className="flex gap-1 rounded-lg border border-border p-1"><Button type="button" size="sm" variant={viewMode === 'cards' ? 'default' : 'ghost'} onClick={() => setViewMode('cards')} title="Cartões detalhados"><LayoutGrid className="h-4 w-4" /><span className="sr-only">Cartões</span></Button><Button type="button" size="sm" variant={viewMode === 'compact' ? 'default' : 'ghost'} onClick={() => setViewMode('compact')} title="Lista compacta"><List className="h-4 w-4" /><span className="sr-only">Lista</span></Button><Button type="button" size="sm" variant={viewMode === 'kanban' ? 'default' : 'ghost'} onClick={() => setViewMode('kanban')} title="Quadro por status"><span className="text-xs font-bold">▦</span><span className="sr-only">Quadro</span></Button></div>
        </div>
        <p className="text-xs text-muted-foreground">{visible.length} de {publications.length} publicação(ões) visível(is)</p>
      </div>

      <div className="space-y-3">
        {visible.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nenhuma publicação neste filtro.</div>}
        {viewMode === 'compact' && visible.map(compactPublication)}
        {viewMode === 'kanban' && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{kanbanColumns.map(([key, title, color]) => { const items = visible.filter((p) => key === 'acao' ? p.action_required === 'sim' : key === 'revisar' ? p.action_required === 'revisar' : key === 'rascunho' ? p.deadline_status === 'rascunho' : key === 'confirmado' ? p.deadline_status === 'confirmado' : p.action_required === 'nao'); return <section key={key} className={`min-w-0 rounded-2xl border p-3 ${color}`}><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-bold">{title}</h2><Badge variant="outline">{items.length}</Badge></div><div className="space-y-2">{items.length ? items.map(compactPublication) : <p className="rounded-xl border border-dashed border-border/70 bg-background/50 p-4 text-center text-xs text-muted-foreground">Nenhum item</p>}</div></section>; })}</div>}
        {viewMode === 'cards' && visible.map((p) => (
          <article key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {actionBadge(p.action_required)} {urgencyBadge(p.urgency)}
                  {p.deadline_status === 'confirmado' && <Badge className="bg-emerald-700 hover:bg-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Confirmado</Badge>}
                  {p.cancelled && <Badge variant="destructive">Cancelada</Badge>}
                </div>
                <h2 className="mt-3 text-sm font-bold">{p.number || p.process_number || 'Processo não identificado'}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{[p.tribunal || p.court, p.orgao, `Disponibilização ${brDate(p.availability_date)}`].filter(Boolean).join(' · ')}</p>
                {p.expand?.process?.title ? <p className="mt-1 text-xs text-primary">Processo localizado: {p.expand.process.title}{p.expand.process.number ? ` · ${p.expand.process.number}` : ''}</p> : <p className="mt-1 text-xs text-amber-700">Pendente de vinculação a processo cadastrado</p>}
              </div>
              {p.link && <Button asChild size="sm" variant="outline"><a href={p.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-4 w-4" /> Original</a></Button>}
            </div>

            <div className="mt-4 rounded-xl bg-secondary/45 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Scale className="h-4 w-4" /> Resumo da publicação</p>
              <p className="mt-2 text-sm leading-relaxed">{p.summary || 'Sem resumo.'}</p>
              {p.action_reason && <p className="mt-2 text-xs text-muted-foreground"><strong>É para agir?</strong> {p.action_reason}</p>}
              {p.parties && <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground"><strong>Destinatários/partes identificadas no DJEN:</strong> {p.parties}</p>}
            </div>

            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Próxima etapa · {stageLabel(triageStage(p))}</p>
                <p className="mt-1 text-sm text-muted-foreground">{nextStepText(p)}</p>
              </div>
              <Badge variant="outline" className="w-fit shrink-0 border-primary/30">SOP DJEN</Badge>
            </div>

            <div className="mt-4 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold">Destino da revisão</p>
                  <p className="mt-1 text-xs text-muted-foreground">O número da publicação é apenas a chave da consulta; o registro só entra no processo após sua aprovação.</p>
                </div>
                <Badge variant="outline">{p.action_required === 'nao' ? 'Sem ação' : p.movement_status === 'aprovado' ? 'Movimentação lançada' : p.triage_status === 'concluido' ? 'Concluído' : p.process ? 'Disponível para revisão' : 'Pendente de processo'}</Badge>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div className="space-y-1"><Label className="text-xs">Processo cadastrado</Label><Select value={selectedProcess[p.id] || (p.process || 'none')} onValueChange={(value) => setSelectedProcess({ ...selectedProcess, [p.id]: value })}><SelectTrigger><SelectValue placeholder="Selecione o processo" /></SelectTrigger><SelectContent><SelectItem value="none">Selecionar depois</SelectItem>{processes.map((process) => <SelectItem key={process.id} value={process.id}>{process.title || process.number || process.id}{process.number && process.title ? ` · ${process.number}` : ''}</SelectItem>)}</SelectContent></Select></div>
                <Button variant="outline" onClick={() => linkProcess(p)} disabled={busyId === p.id || !selectedProcess[p.id] || selectedProcess[p.id] === 'none'}>Vincular para revisão</Button>
              </div>
              {p.process && <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap"><Button size="sm" onClick={() => approve(p, { movement: true, deadline: false })} disabled={busyId === p.id || p.movement_status === 'aprovado'}>Aprovar somente movimentação</Button><Button size="sm" variant="outline" onClick={() => approve(p, { movement: false, deadline: true })} disabled={busyId === p.id || p.deadline_status === 'confirmado'}><CalendarCheck className="mr-1 h-4 w-4" /> Aprovar somente prazo</Button><Button size="sm" variant="secondary" onClick={() => approve(p, { movement: true, deadline: true })} disabled={busyId === p.id || (p.movement_status === 'aprovado' && p.deadline_status === 'confirmado')}>Aprovar movimentação + prazo</Button></div>}
            </div>

            {p.action_required !== 'nao' ? (
              <div className="mt-4 grid gap-3 rounded-xl border border-border p-4 lg:grid-cols-[1fr_150px_170px_auto] lg:items-end">
                <div>
                  <p className="text-xs font-semibold">Rascunho do prazo</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.deadline ? `Publicação: ${brDate(p.publication_date || p.published_at)} · Vencimento calculado: ${brDate(p.deadline)} · ${String(p.regime || 'cpc').toUpperCase()}` : 'O texto não permitiu identificar automaticamente a quantidade de dias.'}
                  </p>
                  {!p.process && <p className="mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" /> Processo ainda não cadastrado/vinculado. O prazo pode ir à agenda, mas o cadastro processual deve ser associado.</p>}
                </div>
                <div className="space-y-1"><Label className="text-xs">Dias úteis</Label><Input type="number" min="1" max="365" value={editDays[p.id] ?? ''} onChange={(e) => setEditDays({ ...editDays, [p.id]: e.target.value })} /></div>
                <Button variant="outline" onClick={() => recalc(p)} disabled={busyId === p.id}><Clock3 className="mr-1 h-4 w-4" /> Recalcular</Button>
                <div className="flex gap-2">
                  <Button onClick={() => confirm(p)} disabled={!p.deadline || p.deadline_status === 'confirmado' || busyId === p.id}><CalendarCheck className="mr-1 h-4 w-4" /> Confirmar</Button>
                  <Button variant="ghost" onClick={() => ignore(p)} disabled={busyId === p.id} title="Não é para agir"><XCircle className="h-4 w-4" /></Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> Esta publicação não gerou prazo na agenda.</div>
            )}

            <details className="mt-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium">Ver teor recebido do DJEN</summary>
              <p className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-secondary/40 p-3 leading-relaxed">{p.raw || 'Sem teor armazenado.'}</p>
            </details>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Feriados e indisponibilidades</h2>
        <p className="mt-1 text-xs text-muted-foreground">Os feriados nacionais fixos e o recesso de 20/12 a 20/01 já são tratados pelo motor. Cadastre aqui feriados específicos do tribunal, da comarca e suspensões locais.</p>
        <form onSubmit={saveHoliday} className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-6 md:items-end">
          <div className="space-y-1"><Label>Data</Label><Input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} required /></div>
          <div className="space-y-1 md:col-span-2"><Label>Descrição</Label><Input value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="Feriado municipal / suspensão" required /></div>
          <div className="space-y-1"><Label>Abrangência</Label><Select value={holidayForm.scope} onValueChange={(v) => setHolidayForm({ ...holidayForm, scope: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nacional">Nacional</SelectItem><SelectItem value="tribunal">Tribunal</SelectItem><SelectItem value="comarca">Comarca</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label>{holidayForm.scope === 'comarca' ? 'Comarca' : 'Tribunal'}</Label><Input value={holidayForm.scope === 'comarca' ? holidayForm.comarca : holidayForm.tribunal} onChange={(e) => holidayForm.scope === 'comarca' ? setHolidayForm({ ...holidayForm, comarca: e.target.value }) : setHolidayForm({ ...holidayForm, tribunal: e.target.value })} placeholder={holidayForm.scope === 'comarca' ? 'Governador Valadares' : 'TJMG'} /></div>
          <Button type="submit">Adicionar</Button>
        </form>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border">
          {holidays.length === 0 && <p className="p-4 text-xs text-muted-foreground">Nenhum feriado local cadastrado.</p>}
          {holidays.map((h) => <div key={h.id} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span><strong>{brDate(h.date)}</strong> — {h.name} <span className="text-xs text-muted-foreground">({h.scope}{h.comarca ? ` · ${h.comarca}` : ''}{h.tribunal ? ` · ${h.tribunal}` : ''})</span></span><Button size="icon" variant="ghost" onClick={() => removeHoliday(h.id)}><Trash2 className="h-4 w-4" /></Button></div>)}
        </div>
      </section>
    </div>
  );
}
