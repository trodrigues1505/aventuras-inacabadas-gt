import { Link } from 'react-router-dom'
import { ArrowRight, Coins, Globe2, Radar, Target, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { Avatar } from '../layouts/AppShell'
import { EmptyState } from '../components/Bits'
import { useAuth } from '../hooks/AuthProvider'
import { useGame } from '../hooks/GameProvider'
import { ACCENT, getXpRequiredForLevel } from '../data/gameConfig'
import { BRAND } from '../data/brand'

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
      rate: missions.length
        ? Math.round((done.length / missions.length) * 100)
        : null,
    }
  }, [missions])

  const upcoming = useMemo(
    () =>
      missions
        .filter((m) => m.status === 'open')
        .sort((a, b) => {
          // Sem prazo vai para o fim: uma missão datada é sempre mais
          // urgente que uma sem data, independente da prioridade.
          if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1
          if (a.due_date) return -1
          if (b.due_date) return 1
          const order = { high: 0, mid: 1, low: 2 } as const
          return order[a.priority] - order[b.priority]
        })
        .slice(0, 5),
    [missions],
  )

  if (!profile || !playerState) return null

  const required = getXpRequiredForLevel(playerState.level)
  const pct = Math.min(100, Math.round((playerState.xp / required) * 100))
  const nome = profile.display_name ?? 'Aventureiro'

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
      {/* Perfil e progresso num bloco só: são a mesma informação —
          quem você é a bordo e o quanto já avançou. */}
      <section className="rise mb-6 rounded-[18px] border border-line bg-surface p-6 md:p-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar url={profile.avatar_url} name={nome} size={54} />
            <div className="min-w-0">
              <h1 className="display truncate text-[24px] text-text md:text-[28px]">
                {nome}
              </h1>
              <p className="text-[13px] text-muted">
                {BRAND.ship} · autonomia {playerState.level}
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1 md:max-w-[300px]">
            <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
              <span className="text-muted">Dados de exploracao</span>
              <span className="tabular-nums font-medium text-ember">
                {playerState.xp} / {required}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full bg-azure transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex gap-7 md:border-l md:border-line md:pl-8">
            <div>
              <p className="text-[12px] text-faint">Autonomia</p>
              <p className="text-[22px] font-semibold tabular-nums text-text">
                {playerState.level}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-faint">Creditos</p>
              <p className="flex items-center gap-1.5 text-[22px] font-semibold tabular-nums text-text">
                <Coins size={17} className="text-ember" aria-hidden />
                {playerState.currency}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div
        className="rise mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        style={{ animationDelay: '60ms' }}
      >
        <Stat icon={Globe2} label="Mundos" value={worlds.length} note="mapeados" />
        <Stat icon={Radar} label="Em aberto" value={stats.open} note="missoes ativas" />
        <Stat icon={Target} label="Hoje" value={stats.today} note="concluidas" />
        <Stat
          icon={TrendingUp}
          label="Conclusao"
          value={stats.rate === null ? '—' : `${stats.rate}%`}
          note="do registro total"
        />
      </div>

      <div
        className="rise grid gap-5 lg:grid-cols-[1.3fr_1fr]"
        style={{ animationDelay: '120ms' }}
      >
        <section className="overflow-hidden rounded-[16px] border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[14px] font-semibold text-text">Proximas missoes</h2>
            <Link
              to="/missoes"
              className="flex items-center gap-1 text-[13px] text-azure transition-colors duration-150 hover:text-azure-deep"
            >
              Ver todas
              <ArrowRight size={13} aria-hidden />
            </Link>
          </header>

          {loading ? (
            <div className="h-44 animate-pulse" aria-hidden />
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={Radar}
              title="Nada em aberto"
              note={
                worlds.length === 0
                  ? 'Mapeie um mundo e registre sua primeira missao.'
                  : 'Tudo concluido por aqui. Registre a proxima quando quiser.'
              }
              action={
                <Link
                  to={worlds.length === 0 ? '/mundos' : '/missoes'}
                  className="inline-flex h-10 items-center rounded-[10px] border border-line bg-surface px-4 text-[14px] font-medium text-text transition-colors duration-150 hover:bg-raised"
                >
                  {worlds.length === 0 ? 'Mapear mundo' : 'Nova missao'}
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((m) => {
                const world = worlds.find((w) => w.id === m.world_id)
                const accent = world ? (ACCENT[world.accent] ?? ACCENT.azure) : null
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${accent?.dot ?? 'bg-faint'}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">
                      {m.title}
                    </span>
                    {m.due_date && (
                      <span className="shrink-0 text-[12px] tabular-nums text-faint">
                        {new Date(`${m.due_date}T12:00`).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-[16px] border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[14px] font-semibold text-text">Mundos</h2>
            <Link
              to="/mundos"
              className="flex items-center gap-1 text-[13px] text-azure transition-colors duration-150 hover:text-azure-deep"
            >
              Ver todos
              <ArrowRight size={13} aria-hidden />
            </Link>
          </header>

          {loading ? (
            <div className="h-44 animate-pulse" aria-hidden />
          ) : worlds.length === 0 ? (
            <EmptyState
              icon={Globe2}
              title="Nenhum mundo"
              note="Mundos agrupam suas missoes por contexto."
            />
          ) : (
            <ul className="divide-y divide-line">
              {worlds.slice(0, 5).map((w) => {
                const mine = missions.filter((m) => m.world_id === w.id)
                const done = mine.filter((m) => m.status === 'done').length
                const p = mine.length ? Math.round((done / mine.length) * 100) : 0
                const accent = ACCENT[w.accent] ?? ACCENT.azure
                return (
                  <li key={w.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-[15px]" aria-hidden>
                      {w.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 truncate text-[13px] font-medium text-text">
                        {w.name}
                      </p>
                      <div className="h-1 overflow-hidden rounded-full bg-raised">
                        <div
                          className={`h-full rounded-full ${accent.bar}`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-[12px] tabular-nums text-faint">
                      {done}/{mine.length}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Globe2
  label: string
  value: number | string
  note: string
}) {
  return (
    <article className="rounded-[14px] border border-line bg-surface px-5 py-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={14} className="text-faint" aria-hidden />
        <p className="text-[12px] font-medium uppercase tracking-wide text-faint">
          {label}
        </p>
      </div>
      <p className="text-[26px] font-semibold leading-none tabular-nums text-text">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] text-faint">{note}</p>
    </article>
  )
}
