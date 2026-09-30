import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Dices, Rocket, Wrench } from 'lucide-react'
import { Badge } from '../Bits'
import { Button } from '../Button'
import { useAuth } from '../../hooks/AuthProvider'
import { useChallenges } from '../../hooks/ChallengeProvider'
import { useGame } from '../../hooks/GameProvider'
import { useToast } from '../../hooks/ToastProvider'
import { attrValue, useCrewRoster } from '../../hooks/useCrewRoster'
import { usePlayerRefresh } from '../../hooks/usePlayerRefresh'
import { BRIDGE_APPROACH, EXPEDITION_CONFIG, RESOURCE_LABEL } from '../../data/challenges'
import { ATTRIBUTE_LABEL, findCrew, type AttributeKey } from '../../data/crew'
import { repairHull, rollBridgeChallenge } from '../../services/challengeService'
import {
  bridgeReward,
  chanceAtLeast,
  hullRepairCost,
  poolSize,
  requiredSuccesses,
} from '../../services/expeditionRules'
import type { BridgeApproachKey, BridgeChallenge, BridgeRollResult } from '../../types/challenges'
import { DiceTray } from './DiceTray'
import { TeamPicker } from './TeamPicker'
import { Countdown, HullPips, IntensityMeter, LinkButton, RISK_TONE, RetryNote, useDebugTools, useNow } from './parts'

type Rolled = Exclude<BridgeRollResult, { status: 'expired' }>

const pct = (n: number) => `${Math.round(n * 100)}%`

export function BridgeView({ b, gone }: { b: BridgeChallenge; gone: boolean }) {
  const { playerState } = useAuth()
  const { fields, reloadLists } = useChallenges()
  const { worlds } = useGame()
  const roster = useCrewRoster()
  const refreshPlayer = usePlayerRefresh()
  const debugTools = useDebugTools()
  const toast = useToast()
  const now = useNow()

  const [approach, setApproach] = useState<BridgeApproachKey>((b.approaches[0]?.key as BridgeApproachKey) ?? 'manobra')
  const [team, setTeam] = useState<string[]>([])
  const [leader, setLeader] = useState<string | null>(null)
  const [busy, setBusy] = useState<'roll' | 'repair' | null>(null)
  const [last, setLast] = useState<{ key: number; r: Rolled; done: boolean } | null>(null)
  const [expired, setExpired] = useState(false)
  const handled = useRef(0)

  const meta = BRIDGE_APPROACH[approach]
  const attr = meta.attr as AttributeKey
  const hull = playerState?.hull_damage ?? 0
  const required = requiredSuccesses(b.intensity)
  const waiting = b.retry_at != null && new Date(b.retry_at).getTime() > now

  const linkedWorld = (() => {
    if (!b.challenge_id) return null
    const ch = fields.find((c) => c.id === b.challenge_id)
    return ch ? worlds.find((w) => w.id === ch.world_id) : null
  })()

  const options = useMemo(() => {
    if (team.length !== 3) return []
    const members = team.map((id) => ({
      id,
      value: attrValue(roster.rows.find((r) => r.crew_id === id), attr),
    }))
    return members.map((m) => {
      const pool = poolSize(
        members.map((x) => ({ value: x.value, leader: x.id === m.id, injured: false })),
        hull,
      )
      return { id: m.id, pool, chance: chanceAtLeast(pool, required) }
    })
  }, [team, roster.rows, attr, hull, required])

  useEffect(() => {
    if (!options.length) return setLeader(null)
    setLeader((cur) =>
      cur && options.some((o) => o.id === cur) ? cur : [...options].sort((a, x) => x.chance - a.chance)[0].id,
    )
  }, [options])

  const reward = bridgeReward(approach, b.intensity)
  const canRoll = !gone && !waiting && team.length === 3 && Boolean(leader) && busy === null && !expired
  const repairCost = hullRepairCost(hull)
  const canRepair = repairCost !== null && (playerState?.currency ?? 0) >= repairCost && busy === null

  async function onRoll(force?: 'success' | 'fail' | 'critical') {
    if (!leader) return
    setBusy('roll')
    try {
      const r = await rollBridgeChallenge({ bridgeId: b.id, approach, leader, crewIds: team, force })
      if (r.status === 'expired') {
        setExpired(true)
        await Promise.all([reloadLists(), refreshPlayer()])
        setBusy(null)
        return
      }
      setLast({ key: Date.now(), r, done: false })
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível rolar.')
      setBusy(null)
    }
  }

  async function afterRoll(r: Rolled) {
    try {
      await Promise.all([reloadLists(), roster.reload(), refreshPlayer()])
    } catch {
      /* o resultado já foi gravado; a próxima leitura corrige */
    }
    if (r.injuredCrewId) {
      const who = findCrew(r.injuredCrewId)
      toast('error', `Falha crítica: ${who?.name ?? r.injuredCrewId} ficou ferido por ${EXPEDITION_CONFIG.injuryHours}h.`, r.injuredCrewId)
    }
    if (r.success && r.reward) {
      toast('reward', `Travessia concluída. +${r.reward.amount} de ${RESOURCE_LABEL[r.reward.resource]}.`)
    }
    setTeam([])
    setBusy(null)
  }

  function onDiceDone() {
    if (!last || handled.current === last.key) return
    handled.current = last.key
    setLast({ ...last, done: true })
    void afterRoll(last.r)
  }

  async function onRepair() {
    setBusy('repair')
    try {
      const r = await repairHull()
      toast('success', `Casco consertado: ${r.hullDamage} de 3 de dano. Custo: ${r.cost} créditos.`)
      await refreshPlayer()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível consertar.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-5">
      <header className="relative flex items-end justify-between gap-3 overflow-hidden rounded-[16px] bg-hull px-5 pb-5 pt-7">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'radial-gradient(60% 120% at 100% 0%, rgba(196,125,16,0.28), transparent 70%)' }}
        />
        <div className="relative flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-white/10 text-ember">
            <Rocket size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] text-white/70">
              {b.origin === 'linked'
                ? linkedWorld
                  ? `Rumo a ${linkedWorld.name} · desafio de bordo`
                  : 'Desafio de bordo'
                : 'Em trânsito · desafio de bordo'}
            </p>
            <h1 className="display truncate text-[22px] text-white md:text-[26px]">{b.title}</h1>
          </div>
        </div>
        <div className="relative">
          <IntensityMeter level={b.intensity} onDark />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="grid content-start gap-4">
          <div className="rounded-[16px] border border-line bg-surface p-5">
            <p className="text-[13.5px] leading-relaxed text-muted">{b.description}</p>
            <Countdown createdAt={b.created_at} expiresAt={b.expires_at} />
            <RetryNote retryAt={b.retry_at} />
          </div>

          <div className="rounded-[16px] border border-line bg-surface p-5">
            <fieldset disabled={busy !== null || gone}>
              <legend className="mb-2 text-[14px] font-semibold text-text">Como atravessar</legend>
              <div className="grid gap-2">
                {b.approaches.map((a) => {
                  const m = BRIDGE_APPROACH[a.key as BridgeApproachKey]
                  const on = approach === a.key
                  return (
                    <label
                      key={a.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-[12px] border px-3.5 py-3 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-azure ${
                        on ? 'border-azure bg-azure/[0.05]' : 'border-line hover:bg-raised'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bridge-approach"
                        className="sr-only"
                        checked={on}
                        onChange={() => setApproach(a.key as BridgeApproachKey)}
                      />
                      <span
                        aria-hidden
                        className={`mt-1 grid size-[14px] shrink-0 place-items-center rounded-full border ${
                          on ? 'border-azure' : 'border-faint/60'
                        }`}
                      >
                        {on && <span className="size-[6px] rounded-full bg-azure" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[13.5px] font-medium text-text">{m?.label ?? a.key}</span>
                          <span className="text-[12px] text-faint">usa {ATTRIBUTE_LABEL[a.attr]}</span>
                          <Badge tone={RISK_TONE[m?.risk ?? 'médio']}>risco {m?.risk ?? 'médio'}</Badge>
                        </span>
                        <span className="mt-0.5 block text-[12px] text-muted">{m?.use}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </div>

          <div className="rounded-[16px] border border-line bg-surface p-5">
            {roster.loading ? (
              <div className="h-40 animate-pulse rounded-[12px] bg-raised" aria-hidden />
            ) : (
              <TeamPicker roster={roster.rows} selected={team} onChange={setTeam} focus={[attr]} disabled={gone || busy !== null} />
            )}
          </div>
        </section>

        <section className="grid content-start gap-4">
          <div className="rounded-[16px] border border-line bg-surface p-5">
            <h2 className="mb-3 text-[14px] font-semibold text-text">Rolagem</h2>

            {options.length === 3 ? (
              <fieldset disabled={busy !== null}>
                <legend className="mb-2 text-[13px] text-muted">Quem lidera a travessia?</legend>
                <div className="grid gap-2">
                  {options.map((o) => {
                    const on = leader === o.id
                    return (
                      <label
                        key={o.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-[12px] border px-3.5 py-2.5 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-azure ${
                          on ? 'border-azure bg-azure/[0.05]' : 'border-line hover:bg-raised'
                        }`}
                      >
                        <input type="radio" name="bridge-leader" className="sr-only" checked={on} onChange={() => setLeader(o.id)} />
                        <span className="min-w-0 flex-1 text-[13.5px] font-medium text-text">{findCrew(o.id)?.name ?? o.id}</span>
                        <span className="text-[12px] tabular-nums text-muted">{o.pool} dados</span>
                        <span className="w-12 text-right text-[13px] font-semibold tabular-nums text-text">{pct(o.chance)}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="mt-2 text-[11.5px] text-faint">
                  Exige {required} sucessos. {hull > 0 ? `O casco danificado já tirou ${hull} dado(s). ` : ''}
                  Sem custo em recursos.
                </p>
              </fieldset>
            ) : (
              <p className="text-[13px] text-muted">Escolha 3 tripulantes para ver os dados e a chance de cada líder.</p>
            )}

            <p className="mt-4 text-[12px] text-faint">
              Vencer paga <strong className="font-semibold text-text">{reward.amount}</strong> de {RESOURCE_LABEL[reward.resource]} e
              {b.challenge_id ? ' libera o desafio de campo do planeta' : ' encerra a ameaça em trânsito'}.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={() => onRoll()} loading={busy === 'roll'} disabled={!canRoll}>
                <Dices size={16} aria-hidden /> Rolar dados
              </Button>
              {debugTools && (
                <>
                  {(['success', 'fail', 'critical'] as const).map((f) => (
                    <Button
                      key={f}
                      variant="ghost"
                      size="sm"
                      onClick={() => onRoll(f)}
                      disabled={!canRoll}
                      title="Teste (só administrador): força o resultado no servidor"
                    >
                      Forçar {f === 'success' ? 'sucesso' : f === 'fail' ? 'falha' : 'falha crítica'}
                    </Button>
                  ))}
                </>
              )}
            </div>
            {waiting && <p className="mt-3 text-[12px] text-ember">Nova tentativa só depois do prazo de espera.</p>}
            {expired && (
              <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-bad">
                <AlertTriangle size={14} aria-hidden /> O prazo deste desafio venceu.
              </p>
            )}
          </div>

          {last && (
            <div className="rounded-[16px] border border-line bg-surface p-5">
              <h2 className="mb-3 text-[14px] font-semibold text-text">Resultado</h2>
              <DiceTray key={last.key} dice={last.r.dice} required={last.r.required} onDone={onDiceDone} />
              {last.done && (
                <div className="mt-3 space-y-1.5 text-[13px] text-muted">
                  {last.r.success ? (
                    <p>
                      Travessia concluída.{' '}
                      {last.r.reward && `+${last.r.reward.amount} de ${RESOURCE_LABEL[last.r.reward.resource]}. `}
                      {b.challenge_id && 'O caminho até o planeta está livre.'}
                    </p>
                  ) : (
                    <>
                      <p>
                        A travessia falhou. Casco com {last.r.hullDamage} de 3 de dano
                        {last.r.hullDamage > 0 ? ': cada ponto tira 1 dado das próximas rolagens de bordo.' : '.'}
                      </p>
                      {b.challenge_id && <p>O prazo do desafio de campo vinculado perdeu 12h.</p>}
                      {last.r.critical && last.r.injuredCrewId && (
                        <p className="text-bad">
                          Falha crítica: {findCrew(last.r.injuredCrewId)?.name ?? last.r.injuredCrewId} ficou fora por{' '}
                          {EXPEDITION_CONFIG.injuryHours}h.
                        </p>
                      )}
                      <p>O desafio ficou mais intenso e uma nova tentativa só depois de {EXPEDITION_CONFIG.retryHours}h.</p>
                    </>
                  )}
                </div>
              )}
              {last.done && last.r.success && (
                <div className="mt-4">
                  <LinkButton to="/" variant="secondary">
                    Voltar à Ponte
                  </LinkButton>
                </div>
              )}
            </div>
          )}

          <div className="rounded-[16px] border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-semibold text-text">Casco da Andarilha</h2>
              <HullPips damage={hull} />
            </div>
            <p className="mt-2 text-[12.5px] text-muted">
              Cada ponto de dano tira 1 dado das rolagens de bordo até o reparo. O conserto é um ponto por vez, do
              mais grave para o mais leve.
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[12px] text-faint">
                {repairCost === null ? 'Casco íntegro.' : `Próximo ponto: ${repairCost} créditos (você tem ${playerState?.currency ?? 0}).`}
              </span>
              <Button variant="secondary" size="sm" onClick={onRepair} loading={busy === 'repair'} disabled={!canRepair}>
                <Wrench size={14} aria-hidden /> Consertar 1 ponto
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
