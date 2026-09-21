import { Link } from 'react-router-dom'
import { ArrowRight, Coins, Globe2, Radar, Sparkles, Target, TrendingUp, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Avatar } from '../layouts/AppShell'
import { EmptyState } from '../components/Bits'
import { useAuth } from '../hooks/AuthProvider'
import { useGame } from '../hooks/GameProvider'
import { ACCENT, getXpRequiredForLevel } from '../data/gameConfig'
import { findCrew } from '../data/crew'
import { BRAND } from '../data/brand'
import type { LucideIcon } from 'lucide-react'

const PRIORITY_LABEL = { high: 'Alta', mid: 'Média', low: 'Baixa' } as const
const PRIORITY_COLOR = {
  high: 'text-bad bg-bad/10',
  mid: 'text-ember bg-ember/10',
  low: 'text-good bg-good/10',
} as const

export default function Dashboard() {
  const { profile, playerState } = useAuth()
  const { worlds, missions, loading } = useGame()

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const done = missions.filter((m) => m.status === 'done')
    return {
      open: missions.filter((m) => m.status === 'open').length,
      today: done.filter(
        (m) => m.completed_at && new Date(m.completed_at).toDateString() === today,
      ).length,
      rate: missions.length ? Math.round((done.length / missions.length) * 100) : null,
    }
  }, [missions])

  const upcoming = useMemo(
    () =>
      missions
        .filter((m) => m.status === 'open' || m.status === 'in_progress')
        .sort((a, b) => {
          if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1
          if (a.due_date) return -1
          if (b.due_date) return 1
          const order = { high: 0, mid: 1, low: 2 } as const
          return order[a.priority] - order[b.priority]
        })
        .slice(0, 5),
    [missions],
  )

  const spotlightWorld = useMemo(() => {
    if (!worlds.length) return null
    return worlds.reduce((best, w) => {
      const open = missions.filter((m) => m.world_id === w.id && m.status !== 'done').length
      const bestOpen = missions.filter((m) => m.world_id === best.id && m.status !== 'done').length
      return open > bestOpen ? w : best
    }, worlds[0])
  }, [worlds, missions])

  if (!profile || !playerState) return null

  const crew = findCrew(playerState.crew_id)
  const required = getXpRequiredForLevel(playerState.level)
  const pct = Math.min(100, Math.round((playerState.xp / required) * 100))
  const nome = profile.display_name ?? 'Aventureiro'

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-10">
      <section className="rise mb-6 rounded-[18px] border border-line bg-surface p-6 md:p-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar url={profile.avatar_url} name={nome} size={54} />
            <div className="min-w-0">
              <h1 className="display truncate text-[24px] text-text md:text-[26px]">Olá, {nome}</h1>
              <p className="text-[13px] text-muted">{BRAND.ship} · autonomia {playerState.level}</p>
            </div>
          </div>
          <div className="min-w-0 flex-1 md:max-w-[280px]">
            <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
              <span className="text-muted">Progresso de exploração</span>
              <span className="tabular-nums font-medium text-ember">{playerState.xp} / {required}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-raised">
              <div className="h-full rounded-full bg-azure transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex gap-7 md:border-l md:border-line md:pl-8">
            <div>
              <p className="text-[12px] text-faint">Autonomia</p>
              <p className="text-[22px] font-semibold tabular-nums text-text">{playerState.level}</p>
            </div>
            <div>
              <p className="text-[12px] text-faint">Créditos</p>
              <p className="flex items-center gap-1.5 text-[22px] font-semibold tabular-nums text-text">
                <Coins size={17} className="text-ember" aria-hidden />
                {playerState.currency}
              </p>
            </div>
          </div>
        </div>
      </section>

      {!crew && (
        <Link to="/tripulacao" className="rise mb-6 flex items-center gap-3 rounded-[14px] border border-azure/30 bg-azure/[0.06] px-5 py-4 transition-colors duration-150 hover:bg-azure/10" style={{ animationDelay: '30ms' }}>
          <Users size={17} className="shrink-0 text-azure" aria-hidden />
          <p className="flex-1 text-[13px] text-text">
            O posto ao seu lado na ponte está vazio.{' '}
            <span className="text-muted">Escolher um tripulante muda o que você ganha por missão.</span>
          </p>
          <ArrowRight size={15} className="shrink-0 text-azure" aria-hidden />
        </Link>
      )}

      <div className="rise mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={{ animationDelay: '60ms' }}>
        <StatCard icon={Globe2}     label="Planetas"  value={worlds.length}                                note="mapeados" />
        <StatCard icon={Radar}      label="Em aberto" value={stats.open}                                   note="missões ativas" />
        <StatCard icon={Target}     label="Hoje"      value={stats.today}                                  note="concluídas" />
        <StatCard icon={TrendingUp} label="Conclusão" value={stats.rate === null ? '—' : `${stats.rate}%`} note="do registro total" />
      </div>

      <div className="rise grid gap-5 lg:grid-cols-[1.4fr_1.1fr_0.9fr]" style={{ animationDelay: '120ms' }}>

        {/* Próximas missões */}
        <section className="overflow-hidden rounded-[16px] border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[14px] font-semibold text-text">Próximas missões</h2>
            <Link to="/missoes" className="flex items-center gap-1 text-[13px] text-azure transition-colors duration-150 hover:text-azure-deep">
              Ver todas <ArrowRight size={13} aria-hidden />
            </Link>
          </header>
          {loading ? (
            <div className="h-56 animate-pulse" aria-hidden />
          ) : upcoming.length === 0 ? (
            <EmptyState icon={Radar} title="Nada em aberto"
              note={worlds.length === 0 ? 'Mapeie um planeta e registre sua primeira missão.' : 'Tudo concluído. Registre a próxima quando quiser.'}
              action={
                <Link to={worlds.length === 0 ? '/planetas' : '/missoes'} className="inline-flex h-9 items-center rounded-[10px] border border-line bg-surface px-4 text-[13px] font-medium text-text transition-colors duration-150 hover:bg-raised">
                  {worlds.length === 0 ? 'Mapear planeta' : 'Nova missão'}
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((m) => {
                const world = worlds.find((w) => w.id === m.world_id)
                const accent = world ? (ACCENT[world.accent] ?? ACCENT.azure) : null
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className={`size-1.5 shrink-0 rounded-full ${accent?.dot ?? 'bg-faint'}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] text-text">{m.title}</p>
                      {world && <p className="mt-0.5 text-[11px] text-faint">{world.name}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLOR[m.priority]}`}>
                        {PRIORITY_LABEL[m.priority]}
                      </span>
                      {m.due_date && (
                        <span className="text-[11px] tabular-nums text-faint">
                          {new Date(`${m.due_date}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Visão dos planetas */}
        <section className="overflow-hidden rounded-[16px] border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[14px] font-semibold text-text">Visão dos planetas</h2>
            <Link to="/planetas" className="flex items-center gap-1 text-[13px] text-azure transition-colors duration-150 hover:text-azure-deep">
              Ver todos <ArrowRight size={13} aria-hidden />
            </Link>
          </header>
          {loading ? (
            <div className="h-56 animate-pulse" aria-hidden />
          ) : !spotlightWorld ? (
            <EmptyState icon={Globe2} title="Nenhum planeta" note="Planetas agrupam suas missões por contexto." />
          ) : (
            <div className="flex flex-col">
              <div className="relative h-[140px] overflow-hidden bg-raised">
                <img
                  src={`assets/planets/${spotlightWorld.planet_image ?? spotlightWorld.slug ?? spotlightWorld.id}-banner.png`}
                  alt={spotlightWorld.name}
                  className="h-full w-full object-cover"
                  onError={(e) => { ;(e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[18px]">{spotlightWorld.icon}</span>
                    <p className="text-[15px] font-semibold text-white">{spotlightWorld.name}</p>
                  </div>
                  {spotlightWorld.description && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-white/70">{spotlightWorld.description}</p>
                  )}
                </div>
              </div>
              <ul className="divide-y divide-line">
                {worlds.slice(0, 4).map((w) => {
                  const mine = missions.filter((m) => m.world_id === w.id)
                  const done = mine.filter((m) => m.status === 'done').length
                  const p = mine.length ? Math.round((done / mine.length) * 100) : 0
                  const accent = ACCENT[w.accent] ?? ACCENT.azure
                  return (
                    <li key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-[14px]" aria-hidden>{w.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 truncate text-[12px] font-medium text-text">{w.name}</p>
                        <div className="h-1 overflow-hidden rounded-full bg-raised">
                          <div className={`h-full rounded-full ${accent.bar}`} style={{ width: `${p}%` }} />
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] tabular-nums text-faint">{done}/{mine.length}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>

        {/* Membro em destaque */}
        <section className="overflow-hidden rounded-[16px] border border-line bg-surface">
          <header className="border-b border-line px-5 py-4">
            <h2 className="text-[14px] font-semibold text-text">Membro em destaque</h2>
          </header>
          {!crew ? (
            <EmptyState icon={Users} title="Sem tripulante" note="Escolha um membro para o posto."
              action={
                <Link to="/tripulacao" className="inline-flex h-9 items-center rounded-[10px] border border-line bg-surface px-4 text-[13px] font-medium text-text transition-colors duration-150 hover:bg-raised">
                  Ver tripulação
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col items-center px-5 py-6">
              <div className="relative mb-4 h-[140px] w-full overflow-hidden rounded-[12px] bg-raised">
                <img
                  src={`assets/crew/${crew.id}.png`}
                  alt={crew.name}
                  className="h-full w-full object-contain object-bottom"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement
                    el.style.display = 'none'
                    const fallback = el.nextElementSibling as HTMLElement | null
                    if (fallback) fallback.style.display = 'grid'
                  }}
                />
                <span className="absolute inset-0 hidden place-items-center text-[48px]" aria-hidden>{crew.portrait}</span>
              </div>
              <p className="text-[16px] font-semibold text-text">{crew.name}</p>
              <p className="mb-3 text-[12px] text-muted">{crew.role}</p>
              <p className="mb-4 text-center text-[13px] italic leading-relaxed text-muted">"{crew.line}"</p>
              <div className="w-full rounded-[10px] bg-raised px-3.5 py-3">
                <div className="flex items-start gap-2">
                  <Sparkles size={13} className="mt-0.5 shrink-0 text-ember" aria-hidden />
                  <p className="text-[12px] leading-relaxed text-muted">{crew.perk}</p>
                </div>
              </div>
              <Link to="/tripulacao" className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-line bg-surface px-4 py-2.5 text-[13px] font-medium text-text transition-colors duration-150 hover:bg-raised">
                Ver perfil <ArrowRight size={13} aria-hidden />
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function StatCard({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: number | string; note: string }) {
  return (
    <article className="rounded-[14px] border border-line bg-surface px-5 py-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={14} className="text-faint" aria-hidden />
        <p className="text-[12px] font-medium uppercase tracking-wide text-faint">{label}</p>
      </div>
      <p className="text-[26px] font-semibold leading-none tabular-nums text-text">{value}</p>
      <p className="mt-1.5 text-[12px] text-faint">{note}</p>
    </article>
  )
}
