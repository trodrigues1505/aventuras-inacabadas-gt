import { NavLink, Outlet } from 'react-router-dom'
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

// Exportado para uso em Dashboard, Settings, Admin e outras páginas
export function Avatar({ url, name, size = 32 }: { url?: string | null; name?: string | null; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-interactive font-semibold text-azure"
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

export default function AppShell() {
  const { profile, isAdmin } = useAuth()
  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin)
  const mobile = items.filter((i) => MOBILE_ROUTES.includes(i.to))

  return (
    <div className="min-h-dvh md:grid md:h-dvh md:grid-cols-[248px_1fr] md:overflow-hidden">
      <aside className="hidden flex-col gap-8 bg-hull px-5 py-7 md:flex">
        <div>
          <p className="display text-[19px] leading-tight text-hull-text">
            {BRAND.appNameLines[0]}
            <br />
            {BRAND.appNameLines[1]}
          </p>
          <p className="mt-1.5 text-[12px] text-hull-faint">{BRAND.ship}</p>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-3 rounded-[10px] px-2 py-1.5">
          <Avatar url={profile?.avatar_url} name={profile?.display_name} />
          <span className="truncate text-[13px] text-hull-muted">
            {profile?.display_name ?? 'Aventureiro'}
          </span>
        </div>
      </aside>

      <div className="pb-24 md:h-dvh md:overflow-auto md:pb-0">
        <Outlet />
      </div>

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
