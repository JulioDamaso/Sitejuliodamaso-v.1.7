import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, ArrowRight, Search, MessageCircle, BookOpen, Instagram, Link2, Mail } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import Reveal from '@/components/Reveal';
import { SiteHeader, SiteFooter, WhatsAppFloat } from '@/components/SiteChrome';
import { SITE, waLink, AREAS, fmtDate } from '@/lib/site';
import { renderMarkdown } from '@/lib/markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const fetchPublished = () =>
  pb.collection('posts').getFullList({ filter: "status = 'publicado'", sort: '-publish_at' });

function postCover(post) {
  if (post.cover_file) {
    try { return pb.files.getURL(post, post.cover_file); } catch { /* */ }
  }
  return post.cover || '';
}

function PostCard({ post }) {
  const cover = postCover(post);
  return (
    <Link to={`/blog/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
      {cover ? (
        <img src={cover} alt="" className="h-44 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-44 items-end bg-gradient-to-br from-primary to-[hsl(161_45%_32%)] p-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">{post.category}</span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs text-muted-foreground">{fmtDate(post.publish_at)}</p>
        <h3 className="font-display mt-2 text-lg font-semibold leading-snug group-hover:text-primary">{post.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
      </div>
    </Link>
  );
}

export function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  useEffect(() => {
    fetchPublished().then(setPosts).catch(() => setPosts([]));
  }, []);

  const cats = useMemo(() => [...new Set(posts.map((p) => p.category).filter(Boolean))], [posts]);
  const filtered = posts.filter((p) => {
    const hay = `${p.title} ${p.excerpt} ${p.tags} ${p.category}`.toLowerCase();
    return (cat === 'all' || p.category === cat) && (!q || hay.includes(q.toLowerCase()));
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Blog Jurídico — Julio Damaso Advocacia</title>
        <meta name="description" content="Artigos sobre usucapião, inventário, regularização imobiliária, compra e venda, doação, divórcio e direito digital, em linguagem clara." />
      </Helmet>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Blog</p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-tight">Conteúdo jurídico em linguagem clara</h1>
        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no blog…" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={cat === 'all' ? 'default' : 'outline'} onClick={() => setCat('all')}>Todas</Button>
            {cats.map((c) => (
              <Button key={c} size="sm" variant={cat === c ? 'default' : 'outline'} onClick={() => setCat(c)}>{c}</Button>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
        {filtered.length === 0 && (
          <p className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhum artigo encontrado para essa busca.
          </p>
        )}
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    setState('loading');
    pb.collection('posts')
      .getFirstListItem(pb.filter('slug = {:slug}', { slug }))
      .then((p) => { setPost(p); setState('ok'); })
      .catch(() => setState('error'));
  }, [slug]);

  const tags = post?.tags ? post.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post ? (post.seo_title || post.title) : 'Artigo — Julio Damaso Advocacia'}</title>
        <meta name="description" content={post ? (post.seo_description || post.excerpt || '') : 'Artigo jurídico'} />
      </Helmet>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Button asChild variant="ghost" size="sm" className="mb-8">
          <Link to="/blog"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao blog</Link>
        </Button>
        {state === 'loading' && <p className="text-muted-foreground">Carregando artigo…</p>}
        {state === 'error' && (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <h1 className="font-display text-2xl font-bold">Artigo não encontrado</h1>
            <p className="mt-2 text-muted-foreground">Ele pode ter sido removido ou ainda não foi publicado.</p>
          </div>
        )}
        {state === 'ok' && post && (
          <article>
            {post.category && <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">{post.category}</Badge>}
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">Publicado em {fmtDate(post.publish_at)}</p>
            {postCover(post) && <img src={postCover(post)} alt="" className="mt-8 w-full rounded-2xl object-cover" />}
            <div className="prose-legal mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
            {tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Link key={t} to={`/busca?q=${encodeURIComponent(t)}`}>
                    <Badge variant="outline" className="hover:bg-secondary">{t}</Badge>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-12 rounded-2xl bg-primary p-8 text-primary-foreground">
              <h2 className="font-display text-xl font-bold">Precisa de ajuda com esse tema?</h2>
              <p className="mt-2 text-sm text-primary-foreground/80">Fale com o escritório e receba uma análise do seu caso.</p>
              <Button asChild variant="secondary" className="mt-4">
                <a href={waLink(`Olá! Li o artigo "${post.title}" e gostaria de conversar.`)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> Conversar no WhatsApp
                </a>
              </Button>
            </div>
          </article>
        )}
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

export function SobrePage() {
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    pb.collection('site_settings')
      .getFirstListItem('key = "about_photo"')
      .then((r) => {
        if (r.file) setPhoto(pb.files.getURL(r, r.file));
        else if (r.value) setPhoto(r.value);
      })
      .catch(() => setPhoto(''));
  }, []);

  const timeline = [
    { year: '2015', title: 'Início da Jornada', text: 'Início da carreira no 2º Ofício de Notas de Governador Valadares/MG, de office boy até a confecção de escrituras, planejamento de atos notariais e recolhimentos tributários.' },
    { year: '2019', title: 'Nova Etapa Profissional', text: 'Ingresso como colaborador no 3º Ofício de Notas de Governador Valadares/MG, ampliando conhecimentos e experiência em práticas notariais.' },
    { year: '2020', title: 'Pioneirismo em Usucapião', text: 'Projeto e confecção do primeiro modelo de ata notarial para usucapião extrajudicial do 3º Ofício de Notas de Governador Valadares/MG, com lavratura sob sua responsabilidade.' },
    { year: '2021', title: 'Inovação Digital', text: 'Planejamento e implementação do E-Notariado no 3º Ofício de Notas de Governador Valadares/MG.' },
    { year: '2021+', title: 'Serventia Digital', text: 'Fundação da Serventia Digital, consultoria para implementação do E-Notariado em cartórios de Minas Gerais e, depois, em todo o Brasil.' },
    { year: '2023', title: 'Registro de Imóveis', text: 'Atuação em cartório de registro de imóveis: registros, análise de títulos e recolhimentos como ITBI.' },
    { year: '2024', title: 'OAB e Advocacia', text: 'Aprovação no 42º Exame de Ordem e início da advocacia com especialização em Direito Imobiliário, regularização, usucapião, adjudicação e inventário.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Sobre Nós — Julio Damaso Advocacia</title>
        <meta name="description" content="Experiência em cartórios de notas e registro, Direito Imobiliário e Saúde Patrimonial. Conheça a trajetória do Dr. Julio Damaso." />
      </Helmet>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <div className="overflow-hidden rounded-3xl bg-primary text-primary-foreground">
              <div className="flex flex-col items-center p-8 text-center sm:p-10">
                {photo ? (
                  <img src={photo} alt="Dr. Julio Damaso" className="h-48 w-48 rounded-2xl object-cover shadow-lg ring-4 ring-primary-foreground/15 sm:h-56 sm:w-56" />
                ) : (
                  <img src={SITE.favicon} alt="" className="h-28 w-28 rounded-2xl object-cover shadow-lg" />
                )}
                <h1 className="font-display mt-6 text-3xl font-bold leading-tight">Dr. Julio Damaso</h1>
                <p className="mt-1 text-sm uppercase tracking-widest text-primary-foreground/60">Direito Imobiliário</p>
                <p className="mt-6 leading-relaxed text-primary-foreground/85">
                  Advocacia especializada em Direito Imobiliário com mais de 10 anos de experiência em cartórios de notas e registro.
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Sobre nós</p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight">Experiência que faz a diferença</h2>
            <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
              <p>
                O escritório Julio Damaso Advocacia nasceu da paixão pelo Direito Imobiliário e da experiência
                adquirida em mais de uma década de atuação em cartórios de notas e registro.
              </p>
              <p>
                Com profundo conhecimento dos procedimentos de lavratura de escritura e registro de imóveis,
                antecipamos obstáculos burocráticos, economizando tempo e custos. Seus documentos são preparados
                corretamente desde o início, agilizando a regularização do seu patrimônio.
              </p>
              <p>
                Sou também proprietário da <strong className="text-foreground">Serventia Digital</strong>, empresa
                focada em consultoria para cartórios, o que reforça o compromisso com excelência e atualização
                constante nas práticas cartorárias.
              </p>
            </div>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                'Mais de 10 anos em cartório de notas e registro',
                'Especialista em regularização de imóveis',
                'Atendimento personalizado e humanizado',
                'Acompanhamento completo do processo',
                'Atendimento online para todo o Brasil',
                'Proprietário da Serventia Digital',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="mt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Nossos valores</p>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight">O que nos diferencia</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Expertise', desc: 'Conhecimento profundo da legislação imobiliária e experiência prática em cartórios.' },
              { title: 'Proximidade', desc: 'Atendimento personalizado, entendendo as necessidades específicas de cada cliente.' },
              { title: 'Segurança', desc: 'Proteção jurídica do patrimônio com procedimentos seguros e transparentes.' },
              { title: 'Excelência', desc: 'Compromisso com resultados e satisfação dos nossos clientes.' },
            ].map((v, i) => (
              <Reveal key={v.title} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-border bg-card p-6">
                  <span className="font-display text-sm font-bold text-accent">0{i + 1}</span>
                  <h3 className="font-display mt-2 text-lg font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Nossa trajetória</p>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight">Uma história de conquistas</h2>
          <ol className="relative mt-10 space-y-8 border-l-2 border-border pl-8">
            {timeline.map((t, i) => (
              <Reveal key={t.year + t.title} delay={i * 0.04}>
                <li className="relative">
                  <span className="absolute -left-[39px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-accent" />
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">{t.year}</p>
                  <h3 className="font-display mt-1 text-lg font-semibold">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        <div className="mt-20 rounded-3xl border border-border bg-card p-8 sm:p-10">
          <h2 className="font-display text-2xl font-bold tracking-tight">Contato</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <p className="flex items-center gap-3 text-sm"><Mail className="h-5 w-5 text-primary" /> {SITE.email}</p>
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm transition-colors hover:text-accent">
              <Instagram className="h-5 w-5 text-primary" /> {SITE.instagramHandle}
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{SITE.city}</p>
          <Button asChild size="lg" className="mt-8 min-h-[44px]">
            <a href={waLink()} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
            </a>
          </Button>
        </div>
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

export function LinksPage() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    pb.collection('bio_links').getFullList({ sort: 'order' }).then(setLinks).catch(() => setLinks([]));
  }, []);

  const iconFor = (type) =>
    type === 'whatsapp' ? MessageCircle : type === 'ebook' ? BookOpen : type === 'social' ? Instagram : Link2;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Helmet>
        <title>Links — Julio Damaso Advocacia</title>
        <meta name="description" content="E-book gratuito, WhatsApp, redes sociais e conteúdo jurídico do escritório Julio Damaso Advocacia." />
      </Helmet>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-16">
        <img src={SITE.logoDark} alt={SITE.name} className="h-14 w-auto object-contain" />
        <p className="mt-3 text-center text-sm text-muted-foreground">{SITE.tagline}</p>
        <div className="mt-10 flex w-full flex-col gap-3">
          {links.map((link) => {
            const Icon = iconFor(link.type);
            const external = /^https?:/.test(link.url);
            const custom = link.color
              ? { backgroundColor: link.color, color: '#fff' }
              : undefined;
            const cls = custom
              ? 'hover:opacity-95'
              : link.type === 'whatsapp'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : link.type === 'ebook'
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                  : 'border border-border bg-card hover:bg-secondary';
            const inner = (
              <>
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                <span className="flex-1 text-sm font-semibold">{link.title}</span>
                <ArrowRight className="h-4 w-4 opacity-60" />
              </>
            );
            return external ? (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" style={custom} className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-5 transition-all hover:-translate-y-0.5 ${cls}`}>
                {inner}
              </a>
            ) : (
              <Link key={link.id} to={link.url} style={custom} className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-5 transition-all hover:-translate-y-0.5 ${cls}`}>
                {inner}
              </Link>
            );
          })}
          {links.length === 0 && <p className="text-center text-sm text-muted-foreground">Links em breve.</p>}
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-10">
          <Link to="/sobre">Conhecer o escritório</Link>
        </Button>
        <p className="mt-6 text-xs text-muted-foreground">© {new Date().getFullYear()} {SITE.name}</p>
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [input, setInput] = useState(q);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchPublished().then(setPosts).catch(() => setPosts([]));
  }, []);

  useEffect(() => setInput(q), [q]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    return posts.filter((p) =>
      `${p.title} ${p.excerpt} ${p.content} ${p.tags} ${p.category}`.toLowerCase().includes(needle),
    );
  }, [q, posts]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Busca — Julio Damaso Advocacia</title>
        <meta name="description" content="Busque temas jurídicos como usucapião, inventário, adjudicação, regularização imobiliária, compra e venda, doação e divórcio." />
      </Helmet>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight">Busca por temas jurídicos</h1>
        <form
          className="relative mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            setParams(input.trim() ? { q: input.trim() } : {});
          }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex.: usucapião, inventário, regularização…"
            className="h-13 min-h-[52px] rounded-2xl pl-12 text-base"
          />
        </form>
        <div className="mt-6 flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <Button key={a.q} size="sm" variant={q.toLowerCase() === a.q ? 'default' : 'outline'} onClick={() => setParams({ q: a.q })}>
              {a.label}
            </Button>
          ))}
        </div>
        <div className="mt-10 space-y-4">
          {q && <p className="text-sm text-muted-foreground">{results.length} resultado(s) para “{q}”</p>}
          {results.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="group block rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
              <p className="text-xs text-muted-foreground">{post.category} · {fmtDate(post.publish_at)}</p>
              <h2 className="font-display mt-1 text-xl font-semibold group-hover:text-primary">{post.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
            </Link>
          ))}
          {q && results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-muted-foreground">Nenhum conteúdo encontrado. Fale conosco sobre o tema:</p>
              <Button asChild className="mt-4">
                <a href={waLink(`Olá! Pesquisei sobre "${q}" no site e gostaria de saber mais.`)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> Perguntar no WhatsApp
                </a>
              </Button>
            </div>
          )}
          {!q && (
            <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Digite um tema ou escolha uma das áreas acima.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
