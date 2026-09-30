import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Dices, Flag, HeartPulse, LogOut, Trophy, Undo2 } from 'lucide-react'
import { Badge, ConfirmDialog } from '../Bits'
import { Button } from '../Button'
import { useAuth } from '../../hooks/AuthProvider'
import { useChallenges } from '../../hooks/ChallengeProvider'
import { useGame } from '../../hooks/GameProvider'
import { useToast } from '../../hooks/ToastProvider'
import { attrValue, isAvailable, isInjuredNow, useCrewRoster } from '../../hooks/useCrewRoster'
import { usePlayerRefresh } from '../../hooks/usePlayerRefresh'
import { APPROACH, EXPEDITION_CONFIG, RESOURCE_LABEL } from '../../data/challenges'
import { ATTRIBUTE_LABEL, findCrew, type AttributeKey } from '../../data/crew'
import { generateTrail } from '../../services/trailGenerator'
import {
  abandonExpedition,
  latestAttempt,
  rollExpeditionNode,
  setChallengeGraph,
  startExpedition,
} from '../../services/challengeService'
import {
  chanceAtLeast,
  expeditionCost,
  injuryChancePct,
  nodeStates,
  poolSize,
  requiredSuccesses,
} from '../../services/expeditionRules'
import type {
  AbandonResult,
  ApproachKey,
  ExpeditionAttempt,
  ExpeditionRewards,
  FieldChallenge,
  PathEntry,
  RollNodeResult,
  Trail,
} from '../../types/challenges'
import { DiceTray } from './DiceTray'
import { TeamPicker } from './TeamPicker'
import { APPROACH_ICON, TrailBoard } from './TrailBoard'
import {
  Countdown,
  IntensityMeter,
  LinkButton,
  ResourceChip,
  RetryNote,
  bannerSlug,
  formatLeft,
  useDebugTools,
  useNow,
} from './parts'

type Outcome =
  | { kind: 'success'; rewards: ExpeditionRewards }
  | { kind: 'abandoned'; result: AbandonResult }
  | { kind: 'expired' }

type Rolled = Extract<RollNodeResult, { status: 'in_progress' | 'succeeded' }>

const pct = (n: number) => `${Math.round(n * 100)}%`

/** Legenda do mapa: cor + palavra (nunca só cor). */
function Legend() {
  const items = [
    ['bg-azure', 'Disponível'],
    ['bg-good', 'Vencido'],
    ['bg-bad', 'Falhou'],
    ['bg-good/40', 'Já vencido antes'],
  ] as const
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted">
      {items.map(([dot, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${dot}`} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  )
}

function Panel({ children, title, aside }: { children: React.ReactNode; title?: string; aside?: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-line bg-surface p-5">
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[14px] font-semibold text-text">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </div>
  )
}

export function ExpeditionView({ c, gone }: { c: FieldChallenge; gone: boolean }) {
  const { playerState } = useAuth()
  const { worlds } = useGame()
  const { bridges, reloadLists } = useChallenges()
  const roster = useCrewRoster()
  const refreshPlayer = usePlayerRefresh()
  const debugTools = useDebugTools()
  const toast = useToast()
  const now = useNow()

  const world = worlds.find((w) => w.id === c.world_id)
  const trail: Trail | null = c.graph

  // ── trilha: traçada uma vez, na primeira abertura ────────────
  const [graphError, setGraphError] = useState<string | null>(null)
  const tried = useRef(false)
  const traceTrail = useCallback(async () => {
    setGraphError(null)
    try {
      const generated = generateTrail({
        seed: c.id,
        intensity: c.intensity,
        approaches: c.approaches.map((a) => a.key as ApproachKey),
        biome: world?.slug ?? null,
      })
      await setChallengeGraph(c.id, generated)
      await reloadLists()
    } catch (e) {
      setGraphError(e instanceof Error ? e.message : 'Não foi possível traçar a trilha.')
    }
  }, [c.id, c.intensity, c.approaches, world?.slug, reloadLists])

  useEffect(() => {
    if (trail || gone || tried.current || !world) return
    tried.current = true
    void traceTrail()
  }, [trail, gone, world, traceTrail])

  // ── tentativa em andamento ───────────────────────────────────
  const [attempt, setAttempt] = useState<ExpeditionAttempt | null | undefined>(undefined)
  const loadAttempt = useCallback(async () => {
    try {
      setAttempt(await latestAttempt(c.id))
    } catch {
      setAttempt(null)
    }
  }, [c.id])
  useEffect(() => {
    void loadAttempt()
  }, [loadAttempt])

  const running = attempt?.status === 'in_progress'
  const path: PathEntry[] = running ? attempt.path : []

  // ── estado de tela ───────────────────────────────────────────
  const [team, setTeam] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [leader, setLeader] = useState<string | null>(null)
  const [busy, setBusy] = useState<'start' | 'roll' | 'abandon' | null>(null)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [last, setLast] = useState<{ key: number; r: Rolled; done: boolean } | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  /** Chegou ao destino: segura a visão de campo até mostrar o desfecho. */
  const [finishing, setFinishing] = useState(false)
  const handled = useRef(0)

  const states = useMemo(
    () => (trail ? nodeStates(trail, path, c.won_nodes, Boolean(running)) : {}),
    [trail, path, c.won_nodes, running],
  )
  const node = trail?.nodes.find((n) => n.id === selected) ?? null
  const nodeState = node ? states[node.id] : null
  const canRollNode = Boolean(running && node && nodeState?.status === 'available')
  const required = requiredSuccesses(c.intensity)

  const crewIds = running ? attempt.crew_ids : team

  /** Dados e chance de cada tripulante como líder do nó selecionado. */
  const leaderOptions = useMemo(() => {
    if (!node || !running) return []
    const members = attempt.crew_ids.map((id) => {
      const row = roster.rows.find((r) => r.crew_id === id)
      return { id, value: attrValue(row, node.attr as AttributeKey), injured: isInjuredNow(row, now) }
    })
    return members.map((m) => {
      const pool = poolSize(
        members.map((x) => ({ value: x.value, leader: x.id === m.id, injured: x.injured })),
      )
      return { id: m.id, pool, chance: chanceAtLeast(pool, required), injured: m.injured }
    })
  }, [node, running, attempt, roster.rows, required, now])

  // líder sugerido = o de maior chance, sempre que trocar de nó
  useEffect(() => {
    if (!leaderOptions.length) return setLeader(null)
    setLeader((cur) =>
      cur && leaderOptions.some((o) => o.id === cur)
        ? cur
        : [...leaderOptions].sort((a, b) => b.chance - a.chance)[0].id,
    )
  }, [leaderOptions])

  // ao abrir/avançar, seleciona o próximo nó disponível
  useEffect(() => {
    if (!trail || !running || (last && !last.done)) return
    const next = trail.nodes.find((n) => states[n.id]?.status === 'available')
    if (next && (!selected || states[selected]?.status !== 'available')) setSelected(next.id)
  }, [trail, running, states, last, selected])

  // ── custo e pré-requisitos ───────────────────────────────────
  const cost = trail ? expeditionCost(trail, c.approaches) : null
  const balance = cost && playerState ? playerState[cost.resource] : 0
  const gate = bridges.find((b) => b.challenge_id === c.id)
  const waiting = c.retry_at != null && new Date(c.retry_at).getTime() > now
  const teamOk = team.length === 3 && team.every((id) => isAvailable(roster.rows.find((r) => r.crew_id === id)))
  const affordable = Boolean(cost && balance >= cost.amount)
  const canStart = !gone && !running && Boolean(trail) && teamOk && affordable && !waiting && !gate && busy === null

  const focusAttrs = useMemo(
    () => (trail ? ([...new Set(trail.nodes.map((n) => n.attr))] as AttributeKey[]) : []),
    [trail],
  )

  // ── ações ────────────────────────────────────────────────────
  async function onStart() {
    setBusy('start')
    try {
      const r = await startExpedition(c.id, team)
      toast('info', `Expedição iniciada. Custo pago: ${r.cost.amount} de ${RESOURCE_LABEL[r.cost.resource]}.`)
      await Promise.all([loadAttempt(), refreshPlayer(), reloadLists(), roster.reload()])
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível iniciar a expedição.')
    } finally {
      setBusy(null)
    }
  }

  async function afterRoll(r: Rolled) {
    const { status, rewards, ...entry } = r
    const final = status === 'succeeded'
    if (final) setFinishing(true)
    // o mapa já reflete o nó rolado, sem esperar a rede
    setAttempt((a) =>
      a && a.status === 'in_progress'
        ? { ...a, path: [...a.path, entry as PathEntry], current_node: entry.node }
        : a,
    )
    try {
      await Promise.all([
        final ? Promise.resolve() : loadAttempt(),
        reloadLists(),
        roster.reload(),
        refreshPlayer(),
      ])
    } catch {
      /* a próxima leitura corrige; o resultado já foi gravado pelo servidor */
    }
    if (r.injured) {
      const who = findCrew(r.injured)
      toast('error', `${who?.name ?? r.injured} ficou ferido por ${EXPEDITION_CONFIG.injuryHours}h.`, r.injured)
    }
    if (final && rewards) {
      await new Promise((resolve) => window.setTimeout(resolve, 1400)) // deixa ler o último nó
      setOutcome({ kind: 'success', rewards })
    }
    setSelected(null)
    setBusy(null)
  }

  async function onRoll(force?: 'success' | 'fail') {
    if (!attempt || !node) return
    setBusy('roll')
    try {
      const cleared = nodeState?.cleared ?? false
      const r = await rollExpeditionNode(attempt.id, node.id, cleared ? null : leader, force)
      if (r.status === 'expired') {
        setOutcome({ kind: 'expired' })
        await Promise.all([loadAttempt(), reloadLists(), refreshPlayer()])
        setBusy(null)
        return
      }
      if (cleared || !r.dice) {
        await afterRoll(r) // sem dados para mostrar: aplica direto
        return
      }
      setLast({ key: Date.now(), r, done: false })
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível rolar.')
      setBusy(null)
    }
  }

  function onDiceDone() {
    if (!last || handled.current === last.key) return
    handled.current = last.key
    setLast({ ...last, done: true })
    void afterRoll(last.r)
  }

  async function onAbandon() {
    if (!attempt) return
    setBusy('abandon')
    try {
      const r = await abandonExpedition(attempt.id)
      setConfirmAbandon(false)
      setOutcome({ kind: 'abandoned', result: r })
      await Promise.all([loadAttempt(), reloadLists(), refreshPlayer()])
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível abandonar.')
    } finally {
      setBusy(null)
    }
  }

  // ── cabeçalho ────────────────────────────────────────────────
  const header = (
    <header className="relative h-[120px] overflow-hidden rounded-[16px] bg-hull">
      <img
        src={`assets/planets/${bannerSlug(world?.slug)}-banner.webp`}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-70"
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-[12px] text-white/70">{world?.name ?? 'Planeta'} · desafio de campo · expedição</p>
          <h1 className="display truncate text-[22px] text-white md:text-[26px]">{c.title}</h1>
        </div>
        <IntensityMeter level={c.intensity} onDark />
      </div>
    </header>
  )

  // ── desfechos ────────────────────────────────────────────────
  if (outcome) {
    return (
      <div className="grid gap-5">
        {header}
        <Panel>
          {outcome.kind === 'success' && (
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-good/10 text-good">
                  <Trophy size={20} aria-hidden />
                </span>
                <div>
                  <h2 className="display text-[20px] text-text">Expedição concluída</h2>
                  <p className="text-[13px] text-muted">
                    {outcome.rewards.won} de {outcome.rewards.nodes} nós vencidos
                    {outcome.rewards.failed > 0 ? `, ${outcome.rewards.failed} com falha` : ''}.
                  </p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ['XP', `+${outcome.rewards.xp}`],
                  ['Créditos', `+${outcome.rewards.credits}`],
                  [RESOURCE_LABEL[outcome.rewards.resource], `+${outcome.rewards.resource_amount}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[12px] bg-raised px-4 py-3">
                    <dt className="text-[12px] text-muted">{k}</dt>
                    <dd className="display text-[22px] tabular-nums text-text">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[12px] text-faint">
                Nó falho paga metade da parcela. O fragmento de lore chega com a narrativa (Fase 7B).
              </p>
            </div>
          )}
          {outcome.kind === 'abandoned' && (
            <div>
              <h2 className="display text-[20px] text-text">Expedição encerrada</h2>
              <ul className="mt-3 space-y-1.5 text-[13.5px] text-muted">
                <li>
                  Voltaram <strong className="text-text">{outcome.result.refunded}</strong> de{' '}
                  {RESOURCE_LABEL[outcome.result.resource]} (metade do custo).
                </li>
                <li>O desafio ficou mais intenso (nível {outcome.result.intensity}). Os nós vencidos continuam vencidos.</li>
                <li>
                  {outcome.result.retryAt
                    ? `Nova tentativa em ${formatLeft(new Date(outcome.result.retryAt).getTime() - now)}.`
                    : 'Você pode tentar de novo.'}
                </li>
                <li>
                  O planeta fica afetado por {EXPEDITION_CONFIG.planetAffectedHours}h: −
                  {EXPEDITION_CONFIG.planetAffectedXpPenalty * 100}% de XP nas missões dele.
                </li>
              </ul>
            </div>
          )}
          {outcome.kind === 'expired' && (
            <div>
              <h2 className="display text-[20px] text-text">O prazo venceu</h2>
              <p className="mt-2 text-[13.5px] text-muted">
                A expedição não chegou ao destino a tempo. Metade do custo voltou e o planeta ficou afetado por{' '}
                {EXPEDITION_CONFIG.planetAffectedHours}h.
              </p>
            </div>
          )}
          <div className="mt-6">
            <LinkButton to="/" variant="secondary">
              Voltar à Ponte
            </LinkButton>
          </div>
        </Panel>
      </div>
    )
  }

  if (gone && !finishing) {
    return (
      <div className="grid gap-5">
        {header}
        <Panel>
          <p className="text-[14px] text-muted">Este desafio já foi encerrado.</p>
          <div className="mt-4">
            <LinkButton to="/" variant="secondary">
              Voltar à Ponte
            </LinkButton>
          </div>
        </Panel>
      </div>
    )
  }

  // ── trilha ainda sendo traçada ───────────────────────────────
  if (!trail) {
    return (
      <div className="grid gap-5">
        {header}
        {graphError ? (
          <Panel>
            <p className="flex items-start gap-2 text-[13.5px] text-bad">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
              {graphError}
            </p>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => void traceTrail()}>
                Tentar de novo
              </Button>
            </div>
          </Panel>
        ) : (
          <div className="h-72 animate-pulse rounded-[16px] bg-raised" aria-label="Traçando a trilha" />
        )}
      </div>
    )
  }

  // ── tabuleiro + painel ───────────────────────────────────────
  const NodeIcon = node ? APPROACH_ICON[node.approach] : null

  return (
    <div className="grid gap-5">
      {header}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-label="Trilha">
          <TrailBoard
            trail={trail}
            states={states}
            visitedOrder={path.map((p) => p.node)}
            selectedId={selected}
            onSelect={setSelected}
          />
          <Legend />
        </section>

        <section className="grid content-start gap-4">
          {!running && (
            <Panel title="Briefing">
              <p className="text-[13.5px] leading-relaxed text-muted">{c.description}</p>
              <Countdown createdAt={c.created_at} expiresAt={c.expires_at} />
              <RetryNote retryAt={c.retry_at} />
              {gate && (
                <p className="mt-4 rounded-[10px] bg-ember/10 px-3.5 py-2.5 text-[12px] text-ember">
                  Antes, atravesse o desafio de bordo{' '}
                  <Link to={`/desafio/${gate.id}`} className="font-semibold underline underline-offset-2">
                    {gate.title}
                  </Link>
                  : é a porta de entrada deste planeta.
                </p>
              )}
              {c.won_nodes.length > 0 && (
                <p className="mt-4 rounded-[10px] bg-good/10 px-3.5 py-2.5 text-[12px] text-good">
                  {c.won_nodes.length} nó(s) já vencido(s) numa tentativa anterior: a equipe passa por eles sem rolar.
                </p>
              )}
              {cost && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="text-muted">Custo único, pago ao iniciar</span>
                  <span className="flex items-center gap-2">
                    <ResourceChip resource={cost.resource} amount={cost.amount} tone={affordable ? 'neutral' : 'bad'} />
                    <span className="text-[12px] text-faint">você tem {balance}</span>
                  </span>
                </div>
              )}
              {!affordable && cost && (
                <p className="mt-2 text-[12px] text-bad">
                  Faltam {cost.amount - balance} de {RESOURCE_LABEL[cost.resource]}. Conclua missões para gerar mais.
                </p>
              )}
            </Panel>
          )}

          {!running && (
            <Panel>
              {roster.loading ? (
                <div className="h-40 animate-pulse rounded-[12px] bg-raised" aria-hidden />
              ) : (
                <TeamPicker roster={roster.rows} selected={team} onChange={setTeam} focus={focusAttrs} />
              )}
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-[12px] text-faint">Os atributos em azul são os que a trilha mais pede.</p>
                <Button onClick={onStart} loading={busy === 'start'} disabled={!canStart}>
                  <Flag size={16} aria-hidden /> Iniciar expedição
                </Button>
              </div>
            </Panel>
          )}

          {running && (
            <Panel
              title="Equipe em campo"
              aside={
                cost ? <span className="text-[12px] text-faint">custo pago: {attempt.cost.amount} {RESOURCE_LABEL[attempt.cost.resource]}</span> : null
              }
            >
              <ul className="flex flex-wrap gap-2">
                {crewIds.map((id) => {
                  const inj = isInjuredNow(roster.rows.find((r) => r.crew_id === id), now)
                  return (
                    <li
                      key={id}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] ${
                        inj ? 'bg-bad/10 text-bad' : 'bg-raised text-text'
                      }`}
                    >
                      {inj && <HeartPulse size={12} aria-hidden />}
                      {findCrew(id)?.name ?? id}
                      {inj && <span className="text-[11px]">metade dos dados</span>}
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}

          {running && (
            <Panel title={node ? 'Nó selecionado' : 'Escolha um nó no mapa'}>
              {!node && (
                <p className="text-[13px] text-muted">
                  Toque num nó disponível (com anel azul) para ver o dilema e escolher o líder.
                </p>
              )}
              {node && NodeIcon && (
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-[10px] bg-azure/10 text-azure">
                      <NodeIcon size={18} aria-hidden />
                    </span>
                    <span className="text-[14px] font-semibold text-text">{APPROACH[node.approach].label}</span>
                    <span className="text-[12px] text-faint">usa {ATTRIBUTE_LABEL[node.attr]}</span>
                    <Badge tone="neutral">exige {required} sucessos</Badge>
                    <Badge tone={injuryChancePct(node.approach) >= 25 ? 'bad' : 'ember'}>
                      {injuryChancePct(node.approach)}% de ferir o líder se falhar
                    </Badge>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{node.text}</p>

                  {canRollNode && nodeState?.cleared && (
                    <p className="mt-4 rounded-[10px] bg-good/10 px-3.5 py-2.5 text-[12.5px] text-good">
                      Vencido antes: a equipe passa por aqui sem rolar dados.
                    </p>
                  )}

                  {canRollNode && !nodeState?.cleared && (
                    <fieldset className="mt-4" disabled={busy !== null}>
                      <legend className="mb-2 text-[13px] font-semibold text-text">Quem lidera?</legend>
                      <div className="grid gap-2">
                        {leaderOptions.map((o) => {
                          const on = leader === o.id
                          return (
                            <label
                              key={o.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-[12px] border px-3.5 py-2.5 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-azure ${
                                on ? 'border-azure bg-azure/[0.05]' : 'border-line hover:bg-raised'
                              }`}
                            >
                              <input
                                type="radio"
                                name="leader"
                                className="sr-only"
                                checked={on}
                                onChange={() => setLeader(o.id)}
                              />
                              <span className="min-w-0 flex-1 text-[13.5px] font-medium text-text">
                                {findCrew(o.id)?.name ?? o.id}
                                {o.injured && <span className="ml-2 text-[11px] text-bad">ferido</span>}
                              </span>
                              <span className="text-[12px] tabular-nums text-muted">{o.pool} dados</span>
                              <span className="w-12 text-right text-[13px] font-semibold tabular-nums text-text">
                                {pct(o.chance)}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                      <p className="mt-2 text-[11.5px] text-faint">
                        Dados = atributo do líder + metade (para baixo) do atributo de cada ajudante. A
                        porcentagem é a chance de vencer o nó.
                      </p>
                    </fieldset>
                  )}

                  {!canRollNode && nodeState?.status === 'locked' && !nodeState.cleared && (
                    <p className="mt-4 text-[12.5px] text-faint">Este nó abre quando a equipe chegar até ele.</p>
                  )}
                  {nodeState?.status === 'won' && <p className="mt-4 text-[12.5px] text-good">Nó vencido.</p>}
                  {nodeState?.status === 'failed' && (
                    <p className="mt-4 text-[12.5px] text-bad">
                      Este nó falhou, mas a equipe seguiu adiante. Chegar ao destino conclui a expedição.
                    </p>
                  )}

                  {canRollNode && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button onClick={() => onRoll()} loading={busy === 'roll'} disabled={busy !== null || (!nodeState?.cleared && !leader)}>
                        <Dices size={16} aria-hidden /> {nodeState?.cleared ? 'Passar pelo nó' : 'Rolar dados'}
                      </Button>
                      {debugTools && !nodeState?.cleared && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRoll('success')}
                            disabled={busy !== null}
                            title="Teste (só administrador): força o resultado no servidor"
                          >
                            Forçar sucesso
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRoll('fail')}
                            disabled={busy !== null}
                            title="Teste (só administrador): força o resultado no servidor"
                          >
                            Forçar falha
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

          {running && last && last.r.dice && (
            <Panel title="Rolagem">
              <DiceTray key={last.key} dice={last.r.dice} required={last.r.required} onDone={onDiceDone} />
              {last.done && (
                <p className="mt-3 text-[13px] text-muted">
                  {last.r.result === 'won'
                    ? 'Nó vencido. A equipe avança.'
                    : last.r.injured
                      ? `Nó falho. ${findCrew(last.r.injured)?.name ?? last.r.injured} se feriu na tentativa.`
                      : 'Nó falho, mas a equipe avança mesmo assim. Ele paga menos recompensa.'}
                </p>
              )}
            </Panel>
          )}

          {running && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmAbandon(true)} disabled={busy !== null}>
                <LogOut size={15} aria-hidden /> Abandonar expedição
              </Button>
            </div>
          )}
          {!running && attempt && attempt.status !== 'in_progress' && (
            <p className="flex items-center gap-1.5 text-[12px] text-faint">
              <Undo2 size={12} aria-hidden /> Última expedição: {attempt.status === 'succeeded' ? 'concluída' : 'encerrada sem chegar ao destino'}.
            </p>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmAbandon}
        title="Abandonar a expedição?"
        message={`Metade do custo volta, o desafio fica mais intenso, você espera ${EXPEDITION_CONFIG.retryHours} h para tentar de novo e o planeta fica afetado por ${EXPEDITION_CONFIG.planetAffectedHours} h (−${EXPEDITION_CONFIG.planetAffectedXpPenalty * 100}% de XP). Os nós já vencidos continuam vencidos.`}
        confirmLabel="Abandonar"
        onConfirm={onAbandon}
        onCancel={() => setConfirmAbandon(false)}
        busy={busy === 'abandon'}
      />
    </div>
  )
}
