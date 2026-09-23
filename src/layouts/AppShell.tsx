import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Globe2, Map, Radar, Users,
  TrendingUp, Shield, Settings,
} from 'lucide-react'
import { useAuth } from '../hooks/AuthProvider'
import { useGame } from '../hooks/GameProvider'
import { BRAND } from '../data/brand'
import { getXpRequiredForLevel } from '../data/gameConfig'

/* ── tipos ──────────────────────────────────────────────────────── */

interface Item { to: string; label: string; icon: React.ElementType; ready: boolean; adminOnly?: boolean }

const ITEMS: Item[] = [
  { to: '/',              label: 'Ponte',         icon: LayoutDashboard, ready: true },
  { to: '/planetas',      label: 'Planetas',      icon: Globe2,          ready: true },
  { to: '/galaxia',       label: 'Galáxia',       icon: Map,             ready: true },
  { to: '/missoes',       label: 'Missões',        icon: Radar,           ready: true },
  { to: '/tripulacao',    label: 'Tripulação',    icon: Users,           ready: true },
  { to: '/registro',      label: 'Registro',      icon: TrendingUp,      ready: true },
  { to: '/painel',        label: 'Painel',         icon: Shield,          ready: true, adminOnly: true },
  { to: '/configuracoes', label: 'Configurações', icon: Settings,        ready: true },
]

const MOBILE_ROUTES = ['/', '/planetas', '/galaxia', '/missoes', '/configuracoes']

const PAGE_TITLE: Record<string, string> = {
  '/':              'Ponte',
  '/planetas':      'Planetas',
  '/galaxia':       'Galáxia',
  '/missoes':       'Missões',
  '/tripulacao':    'Tripulação',
  '/registro':      'Registro',
  '/configuracoes': 'Configurações',
}

/* ── componentes auxiliares ──────────────────────────────────────── */

export function Avatar({ url, name, size = 32 }: { url?: string | null; name?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full border border-white/10 object-cover" style={{ width: size, height: size }} />
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-hull-raised font-semibold text-hull-muted" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {(name ?? 'A').charAt(0).toUpperCase()}
    </span>
  )
}

function SideLink({ item }: { item: Item }) {
  if (!item.ready) return (
    <span className="flex cursor-not-allowed items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] text-hull-faint opacity-40">
      <item.icon size={15} aria-hidden />{item.label}
    </span>
  )
  return (
    <NavLink to={item.to} end={item.to === '/'} className={({ isActive }) =>
      `flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] transition-colors duration-150 ${isActive ? 'bg-hull-active font-medium text-hull-text' : 'text-hull-muted hover:bg-hull-hover hover:text-hull-text'}`
    }><item.icon size={15} aria-hidden />{item.label}</NavLink>
  )
}

function SidebarPlanet({ slug }: { slug: string }) {
  return (
    <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2" aria-hidden style={{ width: 300, height: 300 }}>
      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(63,99,232,0.20) 0%, transparent 65%)', filter: 'blur(20px)' }} />
      <img key={slug} src={`assets/planets/${slug}-esferico.webp`} alt="" className="absolute inset-0 h-full w-full rounded-full object-cover opacity-35 transition-opacity duration-700" loading="lazy" />
    </div>
  )
}

/* ── Header unificado: fundo + HUD + stats ──────────────────────── */

function UnifiedHeader() {
  const { playerState } = useAuth()
  const location = useLocation()
  if (!playerState) return null

  const required = getXpRequiredForLevel(playerState.level)
  const pct = Math.min(100, Math.round((playerState.xp / required) * 100))
  const title = PAGE_TITLE[location.pathname] ?? ''

  return (
    <div className="relative shrink-0 overflow-hidden" style={{ minHeight: 100 }}>
      {/* Fundo */}
      <img src="assets/header-bg.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-center" style={{ opacity: 0.45 }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, var(--color-ink) 0%, transparent 30%, transparent 70%, var(--color-ink) 100%), linear-gradient(to bottom, transparent 0%, var(--color-ink) 100%)' }} aria-hidden />

      {/* Conteúdo sobre o fundo */}
      <div className="relative z-10 px-5 pb-3 pt-3 md:px-8">
        {/* Linha 1: HUD de recursos */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1.5 rounded-[7px] border border-white/10 bg-black/25 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-[12px]" aria-hidden>⚡</span>
            <span className="tabular-nums text-[12px] font-semibold text-azure">{playerState.xp.toLocaleString('pt-BR')}</span>
            <span className="text-[10px] text-white/40">XP</span>
          </span>
          <span className="mr-1 flex items-center gap-1.5 rounded-[7px] border border-white/10 bg-black/25 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-[12px]" aria-hidden>💳</span>
            <span className="tabular-nums text-[12px] font-semibold text-ember">{playerState.currency.toLocaleString('pt-BR')}</span>
          </span>
          <span className="mx-0.5 h-4 w-px bg-white/10" aria-hidden />
          <span className="flex items-center gap-1.5 rounded-[7px] border border-white/10 bg-black/25 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-[12px]" aria-hidden>📦</span>
            <span className="tabular-nums text-[12px] font-medium text-white/80">{playerState.suprimentos.toLocaleString('pt-BR')}</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-[7px] border border-white/10 bg-black/25 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-[12px]" aria-hidden>💾</span>
            <span className="tabular-nums text-[12px] font-medium text-white/80">{playerState.dados.toLocaleString('pt-BR')}</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-[7px] border border-white/10 bg-black/25 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-[12px]" aria-hidden>📡</span>
            <span className="tabular-nums text-[12px] font-medium text-white/80">{playerState.pulsos.toLocaleString('pt-BR')}</span>
          </span>
        </div>

        {/* Linha 2: Título da página + stats do jogador */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[20px] text-text">{title}</h1>
            <p className="text-[12px] text-muted">{BRAND.ship} · autonomia {playerState.level}</p>
          </div>

          {/* Barra de progresso */}
          <div className="flex items-center gap-4">
            <div className="w-40">
              <div className="mb-1 flex items-baseline justify-between text-[10px]">
                <span className="text-white/50">Exploração</span>
                <span className="tabular-nums font-medium text-white/70">{playerState.xp}/{required}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-azure transition-[width] duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40">Nível</p>
              <p className="tabular-nums text-[18px] font-semibold leading-none text-white/90">{playerState.level}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── AppShell principal ──────────────────────────────────────────── */

const ROUTE_PLANET: Record<string, string> = {
  '/': 'thalassa', '/planetas': 'varda', '/galaxia': 'nyx',
  '/missoes': 'zerion', '/tripulacao': 'kestrel', '/configuracoes': 'kestrel',
  '/registro': 'nyx',
}

export default function AppShell() {
  const { profile, isAdmin } = useAuth()
  const { worlds } = useGame()
  const location = useLocation()
  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin)
  const mobile = items.filter((i) => MOBILE_ROUTES.includes(i.to))

  const sidebarSlug = worlds[0]?.planet_image ?? worlds[0]?.slug ?? ROUTE_PLANET[location.pathname] ?? 'thalassa'

  return (
    <div className="min-h-dvh md:grid md:h-dvh md:grid-cols-[248px_1fr] md:overflow-hidden">
      {/* Sidebar */}
      <aside className="relative hidden flex-col gap-8 overflow-hidden bg-hull px-5 py-7 md:flex">
        <div className="relative z-10">
          <p className="display text-[19px] leading-tight text-hull-text">{BRAND.appNameLines[0]}<br />{BRAND.appNameLines[1]}</p>
          <p className="mt-1.5 text-[12px] text-hull-faint">{BRAND.ship}</p>
        </div>
        <nav className="relative z-10 flex flex-col gap-1">{items.map((item) => <SideLink key={item.to} item={item} />)}</nav>
        <div className="relative z-10 mt-auto flex items-center gap-3 rounded-[10px] px-2 py-1.5">
          <Avatar url={profile?.avatar_url} name={profile?.display_name} />
          <span className="truncate text-[13px] text-hull-muted">{profile?.display_name ?? 'Aventureiro'}</span>
        </div>
        <SidebarPlanet slug={sidebarSlug} />
      </aside>

      {/* Conteúdo */}
      <div className="flex flex-col pb-24 md:flex-1 md:overflow-hidden md:pb-0">
        <UnifiedHeader />
        <div className="flex-1 md:overflow-auto"><Outlet /></div>
      </div>

      {/* Nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {mobile.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} end={to === '/'} className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-[11px] transition-colors duration-150 ${isActive ? 'text-azure' : 'text-faint hover:text-text'}`
              }><Icon size={18} aria-hidden />{label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
