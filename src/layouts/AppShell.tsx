import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Globe2, Map, Radar, Users,
  TrendingUp, Shield, Settings,
} from 'lucide-react'
import { useAuth } from '../hooks/AuthProvider'
import { useGame } from '../hooks/GameProvider'
import { BRAND } from '../data/brand'
import { getXpRequiredForLevel } from '../data/gameConfig'

/* ── Nav items ───────────────────────────────────────────────── */

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

/* Título por rota — galáxia não usa o PageHeader (tem próprio visual dark) */
const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/':              { title: 'Ponte',         sub: 'Seu centro de comando.' },
  '/planetas':      { title: 'Planetas',      sub: 'Mundos colonizados e disponíveis.' },
  '/missoes':       { title: 'Missões',        sub: 'Organize, acompanhe e conclua suas missões.' },
  '/tripulacao':    { title: 'Tripulação',    sub: 'Sua equipe a bordo da Andarilha.' },
  '/registro':      { title: 'Registro',      sub: 'Histórico de missões concluídas.' },
  '/configuracoes': { title: 'Configurações', sub: 'Perfil e preferências.' },
}

/* Planeta da sidebar por rota */
const ROUTE_PLANET: Record<string, string> = {
  '/':              'thalassa',
  '/planetas':      'varda',
  '/galaxia':       'nyx',
  '/missoes':       'zerion',
  '/tripulacao':    'kestrel',
  '/registro':      'nyx',
  '/configuracoes': 'kestrel',
}

/* ── Avatar ──────────────────────────────────────────────────── */

export function Avatar({ url, name, size = 32 }: { url?: string | null; name?: string | null; size?: number }) {
  if (url) return (
    <img src={url} alt="" width={size} height={size}
      className="shrink-0 rounded-full border border-white/10 object-cover"
      style={{ width: size, height: size }} />
  )
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-hull-raised font-semibold text-hull-muted"
      style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {(name ?? 'A').charAt(0).toUpperCase()}
    </span>
  )
}

/* ── SideLink ────────────────────────────────────────────────── */

function SideLink({ item }: { item: Item }) {
  if (!item.ready) return (
    <span className="flex cursor-not-allowed items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] text-hull-faint opacity-40">
      <item.icon size={15} aria-hidden />{item.label}
    </span>
  )
  return (
    <NavLink to={item.to} end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] transition-colors duration-150 ${
          isActive ? 'bg-hull-active font-medium text-hull-text' : 'text-hull-muted hover:bg-hull-hover hover:text-hull-text'
        }`
      }>
      <item.icon size={15} aria-hidden />{item.label}
    </NavLink>
  )
}

/* ── Planeta na sidebar ──────────────────────────────────────── */
/*
  Objetivo: planeta ocupa a metade inferior da sidebar, cortado pelas bordas
  esquerda/direita/inferior — aparece como se emergisse de baixo.
  Sem container quadrado visível.
*/
function SidebarPlanet({ slug }: { slug: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0 left-0 w-full"
      /* altura suficiente para o planeta emergir ~40% do fundo */
      style={{ height: 200 }}
    >
      {/* glow difuso por baixo */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 280, height: 200,
        background: 'radial-gradient(ellipse at 50% 100%, rgba(63,99,232,0.22) 0%, transparent 70%)',
        filter: 'blur(18px)',
      }} />
      {/* planeta — cortado pela borda inferior via overflow:hidden do aside */}
      <img
        key={slug}
        src={`assets/planets/${slug}-esferico.webp`}
        alt=""
        loading="lazy"
        style={{
          position: 'absolute',
          bottom: -90,          /* metade superior visível, metade oculta */
          left: '50%',
          transform: 'translateX(-50%)',
          width: 220,
          height: 220,
          borderRadius: '50%',
          objectFit: 'cover',
          opacity: 0.45,
          transition: 'opacity 0.6s',
        }}
      />
    </div>
  )
}

/* ── HUD sobreposto ao header ────────────────────────────────── */

function HudPip({ emoji, value, label, accent }: {
  emoji: string; value: number; label: string; accent?: string
}) {
  return (
    <span title={label}
      className="flex items-center gap-1.5 rounded-[7px] border border-white/10 bg-black/30 px-2.5 py-1 backdrop-blur-sm">
      <span className="text-[12px] leading-none" aria-hidden>{emoji}</span>
      <span className={`tabular-nums text-[12px] font-semibold leading-none ${accent ?? 'text-white/85'}`}>
        {value.toLocaleString('pt-BR')}
      </span>
    </span>
  )
}

/* ── PageHeader — fundo + HUD + título (todas as telas exceto galáxia) ── */

function PageHeader({ pathname }: { pathname: string }) {
  const { playerState } = useAuth()
  const meta = PAGE_META[pathname]
  if (!meta || !playerState) return null

  const required = getXpRequiredForLevel(playerState.level)
  const pct = Math.min(100, Math.round((playerState.xp / required) * 100))

  return (
    <div className="relative shrink-0 overflow-hidden" style={{ height: 112 }}>
      {/* fundo nebulosa */}
      <img src="assets/header-bg.webp" alt="" aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-center"
        style={{ opacity: 0.55 }} />
      {/* gradientes laterais + inferior para integrar com o conteúdo */}
      <div aria-hidden className="absolute inset-0" style={{
        background: [
          'linear-gradient(to right, rgba(10,14,26,0.92) 0%, rgba(10,14,26,0.3) 28%, rgba(10,14,26,0) 55%, rgba(10,14,26,0) 75%, rgba(10,14,26,0.7) 100%)',
          'linear-gradient(to bottom, rgba(10,14,26,0) 0%, rgba(10,14,26,0.85) 100%)',
        ].join(', '),
      }} />

      {/* Conteúdo */}
      <div className="relative z-10 flex h-full flex-col justify-between px-5 py-3 md:px-8">
        {/* Linha 1: HUD */}
        <div className="flex flex-wrap items-center gap-1.5">
          <HudPip emoji="⚡" value={playerState.xp}          label="XP de Exploração — pontos acumulados no nível atual"          accent="text-azure" />
          <HudPip emoji="💳" value={playerState.currency}    label="Créditos — moeda do jogo, gasta na loja"    accent="text-ember" />
          <span className="mx-0.5 h-4 w-px bg-white/10" aria-hidden />
          <HudPip emoji="📦" value={playerState.suprimentos} label="Suprimentos — gerados por missões de Rotina" />
          <HudPip emoji="💾" value={playerState.dados}       label="Dados — gerados por missões de Operação"       />
          <HudPip emoji="📡" value={playerState.pulsos}      label="Pulsos — gerados por missões de Emergência"      />
        </div>

        {/* Linha 2: título + progresso */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="display text-[20px] leading-tight text-white">{meta.title}</h1>
            <p className="text-[11px] text-white/55">{BRAND.ship} · nível {playerState.level}</p>
          </div>
          {/* progresso XP — com tooltip explicativo */}
          <div
            className="mb-0.5 hidden w-44 sm:block"
            title={`Nível ${playerState.level} · ${playerState.xp} XP de ${required} para subir ao nível ${playerState.level + 1}`}
          >
            <div className="mb-1 flex items-baseline justify-between text-[10px]">
              <span className="text-white/50">Nível {playerState.level} → {playerState.level + 1}</span>
              <span className="tabular-nums text-white/65">{playerState.xp}/{required} XP</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-azure transition-[width] duration-700"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── AppShell ────────────────────────────────────────────────── */

export default function AppShell() {
  const { profile, isAdmin } = useAuth()
  const { worlds } = useGame()
  const location = useLocation()
  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin)
  const mobile = items.filter((i) => MOBILE_ROUTES.includes(i.to))

  /* Planeta da sidebar: primeiro colonizado, senão padrão por rota */
  const sidebarSlug =
    worlds[0]?.planet_image ??
    worlds[0]?.slug ??
    ROUTE_PLANET[location.pathname] ??
    'thalassa'

  /* Galáxia tem visual dark próprio — não recebe PageHeader */
  const isGalaxy = location.pathname === '/galaxia'

  return (
    <div className="min-h-dvh md:grid md:h-dvh md:grid-cols-[248px_1fr] md:overflow-hidden">

      {/* ── Sidebar ─────────────────────────────── */}
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

        <div className="relative z-10 mt-auto flex items-center gap-3 px-2 py-1.5">
          <Avatar url={profile?.avatar_url} name={profile?.display_name} />
          <span className="truncate text-[13px] text-hull-muted">
            {profile?.display_name ?? 'Aventureiro'}
          </span>
        </div>

        {/* Planeta emergindo da base — z-0, atrás de tudo */}
        <SidebarPlanet slug={sidebarSlug} />
      </aside>

      {/* ── Área de conteúdo ────────────────────── */}
      <div className="flex flex-col pb-24 md:flex-1 md:overflow-hidden md:pb-0">
        {!isGalaxy && <PageHeader pathname={location.pathname} />}
        <div className="flex-1 md:overflow-auto">
          <Outlet />
        </div>
      </div>

      {/* ── Nav mobile ──────────────────────────── */}
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
