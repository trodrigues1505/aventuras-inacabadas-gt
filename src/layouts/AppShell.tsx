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
  Zap,
  CreditCard,
  Package,
  Database,
  Radio,
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

// Mapa de rota → slug do planeta decorativo na sidebar
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

type ResourcePipProps = {
  icon: React.ElementType
  value: number
  label: string
  iconClass: string
  valueClass: string
}

function ResourcePip({ icon: Icon, value, label, iconClass, valueClass }: ResourcePipProps) {
  return (
    <div
      title={label}
      className="flex items-center gap-1.5 rounded-[7px] border border-line bg-raised px-2.5 py-1 transition-colors duration-150 hover:bg-interactive"
    >
      <Icon size={12} className={iconClass} aria-hidden />
      <span className={`tabular-nums text-[12px] font-medium leading-none ${valueClass}`}>
        {value.toLocaleString('pt-BR')}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  )
}

function GlobalHUD() {
  const { playerState } = useAuth()
  if (!playerState) return null

  return (
    <div className="border-b border-line bg-surface px-4 py-2 md:px-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <ResourcePip icon={Zap}        value={playerState.xp}           label="XP"           iconClass="text-azure" valueClass="text-azure" />
        <ResourcePip icon={CreditCard} value={playerState.currency}     label="Créditos"     iconClass="text-ember" valueClass="text-ember" />
        <div className="mx-1 h-4 w-px bg-line" aria-hidden />
        <ResourcePip icon={Package}    value={playerState.suprimentos}  label="Suprimentos"  iconClass="text-good"  valueClass="text-muted" />
        <ResourcePip icon={Database}   value={playerState.dados}        label="Dados"        iconClass="text-azure" valueClass="text-muted" />
        <ResourcePip icon={Radio}      value={playerState.pulsos}       label="Pulsos"       iconClass="text-ember" valueClass="text-muted" />
      </div>
    </div>
  )
}

/** Planeta decorativo no rodapé da sidebar — muda por rota */
function SidebarPlanet({ slug }: { slug: string }) {
  return (
    <div
      className="pointer-events-none absolute bottom-0 left-0 w-full overflow-hidden"
      aria-hidden
      style={{ height: 220 }}
    >
      {/* glow difuso atrás do planeta */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: 280,
          height: 280,
          background: 'radial-gradient(circle, rgba(63,99,232,0.18) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }}
      />
      <img
        key={slug}
        src={`assets/planets/${slug}-esferico.webp`}
        alt=""
        className="absolute -bottom-16 left-1/2 -translate-x-1/2 opacity-40 transition-opacity duration-500"
        style={{ width: 260, height: 260, objectFit: 'cover' }}
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

  // Planeta da sidebar: se o jogador tem mundos colonizados, usa o primeiro
  // como decoração dinâmica; caso contrário usa o mapa de rota
  const sidebarSlug =
    worlds[0]?.planet_image ??
    worlds[0]?.slug ??
    ROUTE_PLANET[location.pathname] ??
    'thalassa'

  return (
    <div className="min-h-dvh md:grid md:h-dvh md:grid-cols-[248px_1fr] md:overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="relative hidden flex-col gap-8 overflow-hidden bg-hull px-5 py-7 md:flex">
        {/* Logo + nome da nave */}
        <div className="relative z-10">
          <p className="display text-[19px] leading-tight text-hull-text">
            {BRAND.appNameLines[0]}
            <br />
            {BRAND.appNameLines[1]}
          </p>
          <p className="mt-1.5 text-[12px] text-hull-faint">{BRAND.ship}</p>
        </div>

        {/* Navegação */}
        <nav className="relative z-10 flex flex-col gap-1">
          {items.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>

        {/* Perfil */}
        <div className="relative z-10 mt-auto flex items-center gap-3 rounded-[10px] px-2 py-1.5">
          <Avatar url={profile?.avatar_url} name={profile?.display_name} />
          <span className="truncate text-[13px] text-hull-muted">
            {profile?.display_name ?? 'Aventureiro'}
          </span>
        </div>

        {/* Planeta decorativo — sempre no z-0, atrás de tudo */}
        <SidebarPlanet slug={sidebarSlug} />
      </aside>

      {/* ── Área de conteúdo ────────────────────────────────── */}
      <div className="flex flex-col pb-24 md:flex-1 md:overflow-hidden md:pb-0">
        <GlobalHUD />
        <div className="flex-1 md:overflow-auto">
          <Outlet />
        </div>
      </div>

      {/* ── Nav mobile ──────────────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {mobile.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-3 text-[11px] transition-colors duration-150 ${
                    isActive ? 'text-azure' : 'text-faint hover:text-text'
                  }`
                }
              >
                <Icon size={18} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
