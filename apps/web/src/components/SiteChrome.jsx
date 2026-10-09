import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, MessageCircle, Lock, Mail, Instagram, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SITE, waLink, AREAS } from '@/lib/site';

const NAV = [
  { to: '/', label: 'Início' },
  { to: '/blog', label: 'Blog' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/links', label: 'Links' },
];

export function BrandMark({ light = false, className = '' }) {
  const src = light ? SITE.logoLight : SITE.logoDark;
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <img
        src={src}
        alt={SITE.name}
        className="h-10 w-auto max-w-[200px] object-contain sm:h-11"
        width={200}
        height={44}
      />
    </Link>
  );
}

function GlobalSearch({ className = '', onDone }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  return (
    <form
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim()) return;
        navigate(`/busca?q=${encodeURIComponent(q.trim())}`);
        onDone?.();
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar tema jurídico…"
        className="pl-9"
        aria-label="Busca global"
      />
    </form>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <BrandMark />
        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch className="hidden w-52 md:block" />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/portal">Portal do Cliente</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex group">
            <Link to="/restrito">
              <Lock className="mr-1 h-3.5 w-3.5 transition-colors group-hover:text-accent" /> Área restrita
            </Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="mt-6 flex flex-col gap-2">
                <BrandMark />
                <GlobalSearch onDone={() => setOpen(false)} />
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-medium hover:bg-secondary hover:text-accent"
                  >
                    {item.label}
                  </Link>
                ))}
                <Button asChild className="mt-2">
                  <Link to="/portal" onClick={() => setOpen(false)}>Portal do Cliente</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/restrito" onClick={() => setOpen(false)}>Área restrita</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
        <div className="space-y-4">
          <BrandMark light />
          <p className="text-sm text-primary-foreground/70">
            Especialista em Direito Imobiliário. Atendimento online em todo o Brasil.
          </p>
        </div>
        <div>
          <p className="font-display mb-4 text-sm font-semibold uppercase tracking-widest text-primary-foreground/60">Navegação</p>
          <ul className="space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link className="transition-colors hover:text-accent hover:underline" to={n.to}>{n.label}</Link>
              </li>
            ))}
            <li>
              <Link className="transition-colors hover:text-accent hover:underline" to="/portal">Portal do Cliente</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-display mb-4 text-sm font-semibold uppercase tracking-widest text-primary-foreground/60">Contato</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${SITE.email}`} className="transition-colors hover:text-accent">juliodamasoadvogado@gmail.com</a>
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <a href={waLink()} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent">
                (33) 99845-7769
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent">
                @juliodamasoadv
              </a>
            </li>
            <li className="flex items-center gap-2 text-primary-foreground/70">
              <MapPin className="h-4 w-4 shrink-0" />
              {SITE.city}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {SITE.name}. Todos os direitos reservados.</span>
          <a href={SITE.website} className="transition-colors hover:text-accent" target="_blank" rel="noopener noreferrer">
            juliodamasoadvocacia.com
          </a>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFloat() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/restrito') || pathname.startsWith('/portal/painel')) return null;
  return (
    <a
      href={waLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-accent active:scale-95"
    >
      <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
    </a>
  );
}
