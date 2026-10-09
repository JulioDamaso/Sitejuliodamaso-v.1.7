import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  Scale, LogOut, FileText, Download, CheckCircle2, Circle, Calendar,
  AlertCircle, FolderOpen, ArrowLeft,
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { BrandMark } from '@/components/SiteChrome';
import { fmtDate, fmtDateTime, fmtBRL, PROCESS_STATUS, FIN_STATUS, EVENT_TYPES, SITE } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';

export function PortalLoginPage() {
  const { loginClient, isClient } = useAuth();
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isClient) return <Navigate to="/portal/painel" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginClient(protocol, password);
      navigate('/portal/painel');
    } catch (_) {
      setError('Protocolo ou senha inválidos. Verifique os dados recebidos do escritório.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Helmet>
        <title>Portal do Cliente — Julio Damaso Advocacia</title>
        <meta name="description" content="Acesse o portal do cliente com seu protocolo e senha para acompanhar processos, documentos, pendências, compromissos e financeiro." />
        <link rel="icon" type="image/png" href={SITE.favicon} />
      </Helmet>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><BrandMark /></div>
        <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-xl font-bold">Portal do Cliente</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre com o protocolo e a senha fornecidos pelo escritório.</p>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="protocol">Protocolo</Label>
              <Input id="protocol" value={protocol} onChange={(e) => setProtocol(e.target.value)} placeholder="Ex.: JD-0001" required autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
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
        </form>
        <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao site</Link>
        </Button>
      </div>
    </div>
  );
}

const openDocument = async (doc) => {
  if (doc.external_url) {
    window.open(doc.external_url, '_blank', 'noopener');
    return;
  }
  if (doc.file) {
    const token = await pb.files.getToken();
    window.open(`${pb.files.getURL(doc, doc.file)}?token=${token}`, '_blank', 'noopener');
  }
};

export function PortalDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [processes, setProcesses] = useState(null);
  const [sel, setSel] = useState(null);
  const [data, setData] = useState({ events: [], documents: [], pendencias: [], appointments: [], financial: [] });

  useEffect(() => {
    pb.collection('processes')
      .getFullList({ filter: pb.filter('client = {:id}', { id: user.id }), sort: '-created' })
      .then((list) => {
        setProcesses(list);
        if (list.length > 0) setSel(list[0]);
      })
      .catch(() => setProcesses([]));
  }, [user.id]);

  useEffect(() => {
    if (!sel) return;
    const pf = pb.filter('process = {:pid}', { pid: sel.id });
    const cf = pb.filter('client = {:cid}', { cid: user.id });
    Promise.all([
      pb.collection('events').getFullList({ filter: pf, sort: '-date' }),
      pb.collection('documents').getFullList({ filter: pf, sort: '-created' }),
      pb.collection('pendencias').getFullList({ filter: pf, sort: 'due' }),
      pb.collection('appointments').getFullList({ filter: cf, sort: 'date' }),
      pb.collection('financial').getFullList({ filter: cf, sort: 'due' }),
    ])
      .then(([events, documents, pendencias, appointments, financial]) =>
        setData({ events, documents, pendencias, appointments, financial }),
      )
      .catch(() => {});
  }, [sel, user.id]);

  const doLogout = () => {
    logout();
    navigate('/portal');
  };

  const openPendencias = data.pendencias.filter((p) => !p.done);
  const status = sel ? PROCESS_STATUS[sel.status] || PROCESS_STATUS.ativo : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Meu Painel — Portal do Cliente</title>
        <meta name="description" content="Painel do cliente com processos, andamentos, documentos, pendências, compromissos e financeiro." />
      </Helmet>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <BrandMark />
          <span className="ml-auto hidden text-sm text-muted-foreground sm:block">
            Olá, <strong className="text-foreground">{user?.name}</strong>
          </span>
          <Button asChild variant="ghost" size="sm"><Link to="/">Ver site</Link></Button>
          <Button variant="outline" size="sm" onClick={doLogout}>
            <LogOut className="mr-1 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {processes === null && <p className="text-muted-foreground">Carregando seus processos…</p>}
        {processes !== null && processes.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
            <h1 className="font-display mt-4 text-xl font-bold">Nenhum processo liberado ainda</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Assim que o escritório liberar informações para o seu protocolo, elas aparecerão aqui.
            </p>
          </div>
        )}

        {processes && processes.length > 0 && sel && (
          <>
            <div className="flex flex-wrap gap-2">
              {processes.map((p) => (
                <Button key={p.id} size="sm" variant={sel.id === p.id ? 'default' : 'outline'} onClick={() => setSel(p)}>
                  {p.title}
                </Button>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">{sel.title}</h1>
                  {sel.number && <p className="mt-1 text-sm text-muted-foreground">Processo nº {sel.number}</p>}
                  {sel.area && <Badge variant="outline" className="mt-3">{sel.area}</Badge>}
                </div>
                <Badge className={`${status.cls} hover:${status.cls} border-0`}>{status.label}</Badge>
              </div>
              {sel.stage && (
                <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm">
                  <strong>Etapa atual:</strong> {sel.stage}
                </p>
              )}
              {sel.summary && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{sel.summary}</p>}
            </div>

            <Tabs defaultValue="andamentos" className="mt-8">
              <TabsList className="flex h-auto flex-wrap justify-start">
                <TabsTrigger value="andamentos">Andamentos</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
                <TabsTrigger value="pendencias">Pendências {openPendencias.length > 0 && `(${openPendencias.length})`}</TabsTrigger>
                <TabsTrigger value="compromissos">Compromissos</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              </TabsList>

              <TabsContent value="andamentos" className="mt-6">
                {data.events.length === 0 && <Empty text="Nenhum andamento registrado ainda." />}
                <ol className="relative space-y-6 border-l-2 border-border pl-6">
                  {data.events.map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-background bg-accent" />
                      <p className="text-xs text-muted-foreground">{fmtDateTime(ev.date)} · {EVENT_TYPES[ev.type] || 'Andamento'}</p>
                      <p className="font-display mt-1 font-semibold">{ev.title}</p>
                      {ev.description && <p className="mt-1 text-sm text-muted-foreground">{ev.description}</p>}
                    </li>
                  ))}
                </ol>
              </TabsContent>

              <TabsContent value="documentos" className="mt-6">
                <ClientDocUpload processes={processes || []} onSaved={() => {}} />
                {data.documents.length === 0 && <Empty text="Nenhum documento liberado ainda." />}
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{doc.title}</p>
                        {doc.description && <p className="truncate text-xs text-muted-foreground">{doc.description}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openDocument(doc)}>
                        <Download className="mr-1 h-4 w-4" /> Abrir
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="pendencias" className="mt-6">
                {data.pendencias.length === 0 && <Empty text="Nenhuma pendência no momento." />}
                <ul className="space-y-3">
                  {data.pendencias.map((p) => (
                    <li key={p.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                      {p.done ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      ) : (
                        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${p.done ? 'text-muted-foreground line-through' : ''}`}>{p.title}</p>
                        {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {p.due && <Badge variant="outline">Prazo: {fmtDate(p.due)}</Badge>}
                          {p.for_client && !p.done && <Badge className="bg-accent/15 text-accent hover:bg-accent/15 border-0">Solicitado a você</Badge>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="compromissos" className="mt-6">
                {data.appointments.length === 0 && <Empty text="Nenhum compromisso agendado." />}
                <ul className="space-y-3">
                  {data.appointments.map((a) => (
                    <li key={a.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                        <Calendar className="h-5 w-5" strokeWidth={1.8} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{a.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fmtDateTime(a.date)}{a.location ? ` · ${a.location}` : ''}
                        </p>
                        {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="financeiro" className="mt-6">
                {data.financial.length === 0 && <Empty text="Nenhum lançamento financeiro autorizado." />}
                {data.financial.length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="p-4">Descrição</th>
                          <th className="p-4">Vencimento</th>
                          <th className="p-4 text-right">Valor</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.financial.map((f) => {
                          const st = FIN_STATUS[f.status] || FIN_STATUS.pendente;
                          return (
                            <tr key={f.id} className="border-b border-border last:border-0">
                              <td className="p-4 font-medium">{f.description}</td>
                              <td className="p-4 text-muted-foreground">{fmtDate(f.due)}</td>
                              <td className="p-4 text-right font-semibold">{fmtBRL(f.amount)}</td>
                              <td className="p-4"><Badge className={`${st.cls} hover:${st.cls} border-0`}>{st.label}</Badge></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}

function Empty({ text }) {
  return (
    <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</p>
  );
}

function ClientDocUpload({ processes, onSaved }) {
  const [process, setProcess] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!file || !process) return;
    setBusy(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('process', process);
      fd.append('title', title || file.name);
      fd.append('visible', 'false');
      fd.append('file', file);
      await pb.collection('documents').create(fd);
      setMsg('Documento enviado! O escritório será notificado e revisará o arquivo.');
      setTitle(''); setFile(null);
      onSaved();
    } catch { setMsg('Não foi possível enviar. Tente novamente.'); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="mb-6 rounded-2xl border border-border bg-card p-4">
      <p className="font-display mb-3 text-sm font-bold">Enviar novo documento</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Vincular ao processo</Label>
          <Select value={process || undefined} onValueChange={setProcess}>
            <SelectTrigger><SelectValue placeholder="Selecione o processo" /></SelectTrigger>
            <SelectContent>
              {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Título (opcional)</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do documento" /></div>
      </div>
      <div className="mt-3 space-y-2"><Label>Arquivo</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></div>
      <Button type="submit" size="sm" className="mt-3" disabled={busy || !file || !process}><Upload className="mr-1 h-4 w-4" /> {busy ? 'Enviando…' : 'Enviar documento'}</Button>
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
    </form>
  );
}
