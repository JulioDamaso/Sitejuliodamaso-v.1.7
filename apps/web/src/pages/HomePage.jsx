import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, MessageCircle, Home, BookOpen, Gavel, Landmark,
  KeyRound, HeartHandshake, FileSignature, Globe, ShieldCheck, Clock, FileText, Search,
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import { SiteHeader, SiteFooter, WhatsAppFloat } from '@/components/SiteChrome';
import { waLink, AREAS, fmtDate, HERO_QUOTES, SITE } from '@/lib/site';
import { Button } from '@/components/ui/button';

const AREA_ICONS = [Home, BookOpen, Gavel, Landmark, KeyRound, HeartHandshake, FileSignature, Globe];

function coverUrl(post) {
  if (post.cover_file) {
    try {
      return pb.files.getURL(post, post.cover_file);
    } catch {
      /* fallthrough */
    }
  }
  return post.cover || '';
}

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState('');
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [cms, setCms] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    pb.collection('posts')
      .getList(1, 3, { filter: "status = 'publicado'", sort: '-publish_at' })
      .then((r) => setPosts(r.items))
      .catch(() => setPosts([]));
    pb.collection('site_settings').getFullList().then((rows) => {
      const map = {};
      rows.forEach((r) => { map[r.key] = r.value; });
      setCms(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx((i) => (i + 1) % HERO_QUOTES.length), 7000);
    return () => clearInterval(t);
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/busca?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Julio Damaso Advocacia — Direito Imobiliário e Saúde Patrimonial</title>
        <meta
          name="description"
          content="Advocacia imobiliária e saúde patrimonial: usucapião, inventário, regularização de imóveis, compra e venda, doação e divórcio. Portal do cliente com acompanhamento processual."
        />
        <link rel="icon" type="image/png" href={SITE.favicon} />
      </Helmet>
      <SiteHeader />

      {/* Hero editorial com busca destacada */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="pointer-events-none absolute -right-20 top-0 h-[120%] w-[50%] rounded-full bg-primary-foreground/5" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-accent/10" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <Reveal>
            <p className="mb-6 inline-flex items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary-foreground/90">
              Especialista em Direito Imobiliário
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {cms.hero_title || 'Como podemos ajudar você hoje?'}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/80 sm:text-lg">
              {cms.hero_subtitle || 'Busque por informações sobre direito imobiliário, usucapião, inventário, adjudicação compulsória e regularização de imóveis.'}
            </p>
            <form
              onSubmit={onSearch}
              className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl bg-[hsl(44_36%_96%)] p-2 shadow-xl sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Pesquisar artigos, dúvidas, serviços…"
                  className="h-12 w-full rounded-xl bg-transparent pl-12 pr-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
                  aria-label="Buscar no site"
                />
              </div>
              <Button type="submit" size="lg" className="min-h-[48px] rounded-xl bg-accent px-8 text-accent-foreground hover:bg-accent/90">
                Buscar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="min-h-[44px]">
                <a href={waLink()} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-[44px] border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/sobre">Conhecer o escritório <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Frases Saúde Patrimonial com motion */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Saúde Patrimonial</p>
          <div className="relative mt-4 min-h-[7.5rem] sm:min-h-[6rem]">
            <AnimatePresence mode="wait">
              <motion.p
                key={quoteIdx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="font-display text-lg font-medium leading-relaxed text-foreground sm:text-xl"
              >
                {HERO_QUOTES[quoteIdx]}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            {HERO_QUOTES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Frase ${i + 1}`}
                onClick={() => setQuoteIdx(i)}
                className={`h-2 w-2 rounded-full transition-all ${i === quoteIdx ? 'w-6 bg-accent' : 'bg-border hover:bg-accent/50'}`}
              />
            ))}
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-8">
            <div>
              <p className="font-display text-2xl font-bold text-primary"><CountUp value={10} suffix="+" /></p>
              <p className="text-xs text-muted-foreground">anos em cartórios</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-primary"><CountUp value={8} /></p>
              <p className="text-xs text-muted-foreground">áreas de atuação</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-primary">BR</p>
              <p className="text-xs text-muted-foreground">atendimento online</p>
            </div>
          </div>
        </div>
      </section>

      {/* Letreiro */}
      <div className="overflow-hidden bg-primary py-3 text-primary-foreground">
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
          {[...AREAS, ...AREAS].map((a, i) => (
            <span key={i} className="flex items-center gap-10 text-xs font-semibold uppercase tracking-[0.25em]">
              {a.label} <span className="text-accent">●</span>
            </span>
          ))}
        </div>
      </div>

      {/* Áreas */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Áreas de atuação</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            {cms.areas_intro || 'Do registro do imóvel à partilha da herança'}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AREAS.map((area, i) => {
            const Icon = AREA_ICONS[i % AREA_ICONS.length];
            return (
              <Reveal key={area.q} delay={i * 0.05}>
                <Link
                  to={`/busca?q=${encodeURIComponent(area.q)}`}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <h3 className="font-display text-lg font-semibold">{area.label}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{area.desc}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary group-hover:text-accent">
                    Ler sobre o tema <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Blog */}
      <section className="bg-secondary/60">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Conteúdo jurídico</p>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{cms.blog_intro || 'Entenda antes de decidir'}</h2>
            </div>
            <Button asChild variant="outline"><Link to="/blog">Todos os artigos <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {posts.map((post, i) => {
              const cover = coverUrl(post);
              return (
                <Reveal key={post.id} delay={i * 0.08}>
                  <Link to={`/blog/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
                    {cover ? (
                      <img src={cover} alt="" className="h-40 w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-40 items-end bg-gradient-to-br from-primary to-[hsl(161_45%_32%)] p-4">
                        <span className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">{post.category}</span>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-xs text-muted-foreground">{fmtDate(post.publish_at)}</p>
                      <h3 className="font-display mt-2 text-lg font-semibold leading-snug group-hover:text-primary">{post.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
            {posts.length === 0 && (
              <p className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                Novos artigos em breve.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Sobre teaser */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">
              <img src={SITE.favicon} alt="" className="h-12 w-12 rounded-2xl object-cover shadow-sm" />
              <h2 className="font-display mt-6 text-3xl font-bold tracking-tight">Advocacia de proximidade, com método</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {cms.about_teaser || 'O escritório nasceu da paixão pelo Direito Imobiliário e da experiência em mais de uma década de atuação em cartórios de notas e registro. Cada etapa é registrada, explicada em linguagem clara e disponibilizada no portal do cliente.'}
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link to="/sobre">Nossa história <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="space-y-4">
              {[
                { icon: FileText, title: 'Comunicação clara', desc: 'Nada de juridiquês: você entende cada decisão antes de ela ser tomada.' },
                { icon: Clock, title: 'Prazos visíveis', desc: 'Timeline do caso, com andamentos, documentos e pendências no portal.' },
                { icon: ShieldCheck, title: 'Saúde patrimonial', desc: 'Prevenção, regularização e segurança jurídica para o que você construiu.' },
              ].map((f) => (
                <li key={f.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <f.icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="font-display font-semibold">{f.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <Reveal>
          <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
            <h2 className="font-display text-3xl font-bold tracking-tight">Já é cliente?</h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
              Acesse o portal com seu protocolo e senha para ver andamentos, documentos, pendências,
              compromissos e o financeiro do seu caso.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-6 min-h-[44px]">
              <Link to="/portal">Entrar no portal <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
