import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Globe2,
  Map,
  Radar,
  Users,
  TrendingUp,
  Shield,
  Settings,
} from 'lucide-react'
import { useAuth } from '../hooks/AuthProvider'
import { useGame } from '../hooks/GameProvider'
import { BRAND } from '../data/brand'

interface Item {
  to: string
  label: string
  icon: React.ElementType
  ready: boolean
  adminOnly?: boolean
}

const ITEMS: Item[] = [
  { to: '/',              label: 'Ponte',         icon: LayoutDashboard, ready: true },
  { to: '/planetas',      label: 'Planetas',      icon: Globe2,          ready: true },
  { to: '/galaxia',       label: 'Galáxia',       icon: Map,             ready: true },
  { to: '/missoes',       label: 'Missões',        icon: Radar,           ready: true },
  { to: '/tripulacao',    label: 'Tripulação',    icon: Users,           ready: true },
  { to: '/registro',      label: 'Registro',      icon: TrendingUp,      ready: false },
  { to: '/painel',        label: 'Painel',         icon: Shield,          ready: true, adminOnly: true },
  { to: '/configuracoes', label: 'Configurações', icon: Settings,        ready: true },
]

const MOBILE_ROUTES = ['/', '/planetas', '/galaxia', '/missoes', '/configuracoes']

const ROUTE_PLANET: Record<string, string> = {
  '/':              'thalassa',
  '/planetas':      'varda',
  '/galaxia':       'nyx',
  '/missoes':       'zerion',
  '/tripulacao':    'kestrel',
  '/configuracoes': 'kestrel',
}

export function Avatar({ url, name, size = 32 }: { url?: string | null; name?: string | null; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-white/10 object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-hull-raised font-semibold text-hull-muted"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {(name ?? 'A').charAt(0).toUpperCase()}
    </span>
  )
}

function SideLink({ item }: { item: Item }) {
  if (!item.ready) {
    return (
      <span className="flex cursor-not-allowed items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] text-hull-faint opacity-40">
        <item.icon size={15} aria-hidden />
        {item.label}
      </span>
    )
  }
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] transition-colors duration-150 ${
          isActive
            ? 'bg-hull-active font-medium text-hull-text'
            : 'text-hull-muted hover:bg-hull-hover hover:text-hull-text'
        }`
      }
    >
      <item.icon size={15} aria-hidden />
      {item.label}
    </NavLink>
  )
}

/* ── HUD com emojis ────────────────────────────────────────────── */

function HudPip({ emoji, value, label, accent }: {
  emoji: string; value: number; label: string; accent?: string
}) {
  return (
    <div title={label} className="flex items-center gap-1.5 rounded-[7px] border border-line bg-raised px-2.5 py-1 transition-colors duration-150 hover:bg-interactive">
      <span className="text-[13px] leading-none" aria-hidden>{emoji}</span>
      <span className={`tabular-nums text-[12px] font-semibold leading-none ${accent ?? 'text-text'}`}>
        {value.toLocaleString('pt-BR')}
      </span>
    </div>
  )
}

function GlobalHUD() {
  const { playerState } = useAuth()
  if (!playerState) return null

  return (
    <div className="border-b border-line bg-surface px-4 py-2 md:px-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <HudPip emoji="⚡" value={playerState.xp}          label="XP"          accent="text-azure" />
        <HudPip emoji="💳" value={playerState.currency}    label="Créditos"    accent="text-ember" />
        <div className="mx-1 h-4 w-px bg-line" aria-hidden />
        <HudPip emoji="📦" value={playerState.suprimentos} label="Suprimentos" />
        <HudPip emoji="💾" value={playerState.dados}       label="Dados"       />
        <HudPip emoji="📡" value={playerState.pulsos}      label="Pulsos"      />
      </div>
    </div>
  )
}

/* ── Planeta decorativo na sidebar ─────────────────────────────── */

function SidebarPlanet({ slug }: { slug: string }) {
  return (
    <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2" aria-hidden style={{ width: 300, height: 300 }}>
      <div className="absolute inset-0 rounded-full" style={{
        background: 'radial-gradient(circle, rgba(63,99,232,0.20) 0%, transparent 65%)',
        filter: 'blur(20px)',
      }} />
      <img
        key={slug}
        src={`assets/planets/${slug}-esferico.webp`}
        alt=""
        className="absolute inset-0 h-full w-full rounded-full object-cover opacity-35 transition-opacity duration-700"
        loading="lazy"
      />
    </div>
  )
}

export default function AppShell() {
  const { profile, isAdmin } = useAuth()
  const { worlds } = useGame()
  const location = useLocation()
  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin)
  const mobile = items.filter((i) => MOBILE_ROUTES.includes(i.to))

  const sidebarSlug =
    worlds[0]?.planet_image ??
    worlds[0]?.slug ??
    ROUTE_PLANET[location.pathname] ??
    'thalassa'

  return (
    <div className="min-h-dvh md:grid md:h-dvh md:grid-cols-[248px_1fr] md:overflow-hidden">
      {/* ── Sidebar ──────────────────────────────── */}
      <aside className="relative hidden flex-col gap-8 overflow-hidden bg-hull px-5 py-7 md:flex">
        <div className="relative z-10">
          <p className="display text-[19px] leading-tight text-hull-text">
            {BRAND.appNameLines[0]}<br />{BRAND.appNameLines[1]}
          </p>
          <p className="mt-1.5 text-[12px] text-hull-faint">{BRAND.ship}</p>
        </div>

        <nav className="relative z-10 flex flex-col gap-1">
          {items.map((item) => <SideLink key={item.to} item={item} />)}
        </nav>

        <div className="relative z-10 mt-auto flex items-center gap-3 rounded-[10px] px-2 py-1.5">
          <Avatar url={profile?.avatar_url} name={profile?.display_name} />
          <span className="truncate text-[13px] text-hull-muted">
            {profile?.display_name ?? 'Aventureiro'}
          </span>
        </div>

        <SidebarPlanet slug={sidebarSlug} />
      </aside>

      {/* ── Conteúdo ─────────────────────────────── */}
      <div className="flex flex-col pb-24 md:flex-1 md:overflow-hidden md:pb-0">
        <GlobalHUD />
        <div className="flex-1 md:overflow-auto"><Outlet /></div>
      </div>

      {/* ── Nav mobile ───────────────────────────── */}
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
