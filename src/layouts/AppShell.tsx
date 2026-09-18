import { NavLink, Outlet } from 'react-router-dom'
import {
  Globe2,
  LayoutDashboard,
  Lock,
  Radar,
  Route,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../hooks/AuthProvider'
import { BRAND } from '../data/brand'

type Item = { to: string; label: string; icon: LucideIcon; ready: boolean }

const ITEMS: Item[] = [
  { to: '/', label: 'Ponte', icon: LayoutDashboard, ready: true },
  { to: '/mundos', label: 'Mundos', icon: Globe2, ready: false },
  { to: '/missoes', label: 'Missoes', icon: Radar, ready: false },
  { to: '/tripulacao', label: 'Tripulacao', icon: Users, ready: false },
  { to: '/setores', label: 'Setores', icon: Route, ready: false },
  { to: '/registro', label: 'Registro', icon: TrendingUp, ready: false },
  { to: '/configuracoes', label: 'Configuracoes', icon: Settings, ready: true },
]

const MOBILE = ITEMS.filter((i) =>
  ['/', '/mundos', '/missoes', '/configuracoes'].includes(i.to),
)

export default function AppShell() {
  const { profile } = useAuth()

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      <aside className="hidden md:flex flex-col gap-8 border-r border-line/60 bg-surface/50 px-5 py-7">
        <div>
          <p className="display text-[19px] leading-tight text-text">
            {BRAND.appNameLines[0]}
            <br />
            {BRAND.appNameLines[1]}
          </p>
          <p className="text-[12px] text-faint mt-1.5">{BRAND.ship}</p>
        </div>

        <nav className="flex flex-col gap-1">
          {ITEMS.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-3 px-2">
          <Avatar url={profile?.avatar_url} name={profile?.display_name} />
          <span className="text-[13px] text-muted truncate">
            {profile?.display_name ?? 'Aventureiro'}
          </span>
        </div>
      </aside>

      <div className="pb-24 md:pb-0">
        <Outlet />
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-line/70 bg-surface/95 backdrop-blur px-2 pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
          {MOBILE.map(({ to, label, icon: Icon, ready }) => (
            <li key={to}>
              <NavLink
                to={to}
                aria-disabled={!ready || undefined}
                onClick={(e) => !ready && e.preventDefault()}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-3 text-[11px] transition-colors duration-150 ${
                    isActive && ready ? 'text-azure' : ready ? 'text-muted' : 'text-faint'
                  }`
                }
              >
                <Icon size={19} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function SideLink({ item }: { item: Item }) {
  const { to, label, icon: Icon, ready } = item

  if (!ready) {
    return (
      <span
        className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] text-faint cursor-default select-none"
        title="Disponivel nas proximas fases"
      >
        <Icon size={17} aria-hidden />
        {label}
        <Lock size={13} className="ml-auto" aria-hidden />
      </span>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] transition-colors duration-150 ${
          isActive
            ? 'bg-interactive text-text'
            : 'text-muted hover:text-text hover:bg-raised'
        }`
      }
    >
      <Icon size={17} aria-hidden />
      {label}
    </NavLink>
  )
}

export function Avatar({
  url,
  name,
  size = 32,
}: {
  url?: string | null
  name?: string | null
  size?: number
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0 border border-line"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="rounded-full grid place-items-center bg-interactive text-azure font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {(name ?? 'A').charAt(0).toUpperCase()}
    </span>
  )
}
