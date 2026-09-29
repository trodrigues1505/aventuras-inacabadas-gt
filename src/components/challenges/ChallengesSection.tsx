import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Database, Package, Radio, Rocket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '../Bits'
import { Button } from '../Button'
import { useAuth } from '../../hooks/AuthProvider'
import { useChallenges } from '../../hooks/ChallengeProvider'
import { useGame } from '../../hooks/GameProvider'
import { useToast } from '../../hooks/ToastProvider'
import {
  APPROACH,
  BRIDGE_APPROACH,
  RESOURCE_LABEL,
} from '../../data/challenges'
import { ATTRIBUTE_LABEL, findCrew } from '../../data/crew'
import {
  applyBridgeFailure,
  applyFieldFailure,
  pickAvailableTeam,
  resolveBridgeChallenge,
  resolveFieldChallenge,
} from '../../services/challengeService'
import type {
  ApproachKey,
  BridgeApproachKey,
  BridgeMission,
  FieldChallenge,
  ResourceKey,
} from '../../types/challenges'

const HOUR = 3_600_000
const DAY = 24 * HOUR

const RESOURCE_ICON: Record<ResourceKey, LucideIcon> = {
  suprimentos: Package,
  dados: Database,
  pulsos: Radio,
}

const RISK_TONE = { baixo: 'good', médio: 'ember', alto: 'bad' } as const

/** Relógio compartilhado: atualiza o contador sem refazer requisições. */
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

/**
 * Ferramentas de teste (simular sucesso/falha). Liberadas para o admin OU
 * por um interruptor local: no console do navegador,
 *   localStorage.setItem('ai:debug', '1')   // liga
 *   localStorage.removeItem('ai:debug')     // desliga
 * O interruptor não dá poder nenhum no servidor: as RPCs só mexem nos
 * dados do próprio usuário logado.
 */
function useDebugTools(): boolean {
  const { isAdmin } = useAuth()
  let flag = false
  try {
    flag = window.localStorage.getItem('ai:debug') === '1'
  } catch {
    /* armazenamento bloqueado: vale só o isAdmin */
  }
  return isAdmin || flag
}

function formatLeft(ms: number): string {
  if (ms <= 0) return 'encerrado'
  const d = Math.floor(ms / DAY)
  const h = Math.floor((ms % DAY) / HOUR)
  const m = Math.floor((ms % HOUR) / 60_000)
  if (d >= 1) return `${d}d ${h}h`
  if (h >= 1) return `${h}h ${m}min`
  return `${Math.max(1, m)}min`
}

function bannerSlug(slug: string | null | undefined): string {
  // mesmo ajuste do GalaxyScreen: o banner de Nyx foi exportado como "nix"
  return slug === 'nyx' ? 'nix' : (slug ?? '')
}

/* ── Peças compartilhadas ────────────────────────────────────── */

/** Três barras crescentes — lê-se de relance, sem precisar de rótulo. */
function IntensityMeter({ level, onDark }: { level: number; onDark?: boolean }) {
  const label = ['Leve', 'Séria', 'Crítica'][level - 1] ?? 'Leve'
  return (
    <span
      className="flex shrink-0 items-end gap-[3px]"
      role="img"
      aria-label={`Intensidade ${label.toLowerCase()}`}
      title={`Intensidade ${label.toLowerCase()}`}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[5px] rounded-[2px] ${
            i <= level
              ? level === 3
                ? 'bg-bad'
                : 'bg-ember'
              : onDark
                ? 'bg-white/20'
                : 'bg-line'
          }`}
          style={{ height: 6 + i * 5 }}
        />
      ))}
    </span>
  )
}

function Countdown({ createdAt, expiresAt }: { createdAt: string; expiresAt: string }) {
  const now = useNow()
  const end = new Date(expiresAt).getTime()
  const start = new Date(createdAt).getTime()
  const left = end - now
  const pct = Math.max(0, Math.min(100, (left / Math.max(1, end - start)) * 100))
  const urgent = left < DAY
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className={`flex items-center gap-1.5 ${urgent ? 'font-medium text-bad' : 'text-muted'}`}>
          <Clock size={13} aria-hidden />
          {left <= 0 ? 'Encerrado' : `Encerra em ${formatLeft(left)}`}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-raised">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${urgent ? 'bg-bad' : 'bg-azure'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

type Row = {
  key: string
  label: string
  attr: string
  risk: 'baixo' | 'médio' | 'alto'
  detail: string
  cost?: { resource: ResourceKey; amount: number }
}

function ApproachList({
  name,
  rows,
  value,
  onChange,
}: {
  name: string
  rows: Row[]
  value: string
  onChange: (key: string) => void
}) {
  return (
    <fieldset className="mt-5">
      <legend className="mb-2 text-[13px] font-semibold text-text">Como abordar</legend>
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const selected = r.key === value
          const CostIcon = r.cost ? RESOURCE_ICON[r.cost.resource] : null
          return (
            <label
              key={r.key}
              className={`flex cursor-pointer items-start gap-3 rounded-[12px] border px-3.5 py-3 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-azure ${
                selected
                  ? 'border-azure bg-azure/[0.05]'
                  : 'border-line hover:bg-raised'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={r.key}
                checked={selected}
                onChange={() => onChange(r.key)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`mt-1 grid size-[14px] shrink-0 place-items-center rounded-full border ${
                  selected ? 'border-azure' : 'border-faint/60'
                }`}
              >
                {selected && <span className="size-[6px] rounded-full bg-azure" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[13.5px] font-medium text-text">{r.label}</span>
                  <span className="text-[12px] text-faint">usa {r.attr}</span>
                  <Badge tone={RISK_TONE[r.risk]}>risco {r.risk}</Badge>
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">{r.detail}</span>
              </span>
              {r.cost && CostIcon && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-[8px] bg-raised px-2 py-1 text-[12px] font-medium tabular-nums text-text"
                  title={`Custo: ${r.cost.amount} ${RESOURCE_LABEL[r.cost.resource]}`}
                >
                  <CostIcon size={12} className="text-faint" aria-hidden />
                  {r.cost.amount}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function RetryNote({ retryAt }: { retryAt: string | null }) {
  const now = useNow()
  if (!retryAt) return null
  const left = new Date(retryAt).getTime() - now
  if (left <= 0) return null
  return (
    <p className="mt-4 rounded-[10px] bg-ember/10 px-3.5 py-2.5 text-[12px] text-ember">
      A última tentativa falhou. Nova tentativa em {formatLeft(left)}.
    </p>
  )
}

/* ── Desafio de campo ────────────────────────────────────────── */

export function FieldCard({ c }: { c: FieldChallenge }) {
  const { session } = useAuth()
  const debugTools = useDebugTools()
  const { worlds } = useGame()
  const { reloadLists, bridges } = useChallenges()
  const toast = useToast()
  const [selected, setSelected] = useState(c.approaches[0]?.key ?? '')
  const [busy, setBusy] = useState<'ok' | 'fail' | null>(null)
  const now = useNow()

  const world = worlds.find((w) => w.id === c.world_id)
  const waiting = c.retry_at != null && new Date(c.retry_at).getTime() > now
  // GDD: o desafio de bordo vinculado é a porta de entrada — precisa vir antes.
  const gate = bridges.find((b) => b.challenge_id === c.id)
  const blocked = waiting || Boolean(gate) || busy !== null

  const rows: Row[] = c.approaches.map((a) => {
    const meta = APPROACH[a.key as ApproachKey]
    return {
      key: a.key,
      label: meta?.label ?? a.key,
      attr: ATTRIBUTE_LABEL[a.attr],
      risk: meta?.risk ?? 'médio',
      detail: meta
        ? `Recompensa ${meta.reward} · ${meta.injuryPct}% de ferimento se falhar`
        : '',
      cost: a.resource ? { resource: a.resource, amount: a.cost } : undefined,
    }
  })

  async function simulateSuccess() {
    setBusy('ok')
    try {
      await resolveFieldChallenge(c.id)
      toast('reward', 'Desafio resolvido. As recompensas chegam com a rolagem de dados.')
      await reloadLists()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível resolver.')
    } finally {
      setBusy(null)
    }
  }

  async function simulateFailure() {
    if (!session) return
    setBusy('fail')
    try {
      const team = await pickAvailableTeam(session.user.id)
      const r = await applyFieldFailure(c.id, selected, team)
      if (r.injuredCrewId) {
        const who = findCrew(r.injuredCrewId)
        toast('error', `${who?.name ?? r.injuredCrewId} ficou ferido por 72h.`, r.injuredCrewId)
      } else {
        toast('info', 'Falha registrada. Ninguém se feriu desta vez.')
      }
      await reloadLists()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível registrar a falha.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="overflow-hidden rounded-[16px] border border-line bg-surface">
      <header className="relative h-[104px] overflow-hidden bg-hull">
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
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[12px] text-white/70">
              {world?.name ?? 'Planeta'} · desafio de campo
            </p>
            <h3 className="display truncate text-[19px] text-white">{c.title}</h3>
          </div>
          <IntensityMeter level={c.intensity} onDark />
        </div>
      </header>

      <div className="p-5">
        <p className="text-[13.5px] leading-relaxed text-muted">{c.description}</p>
        <Countdown createdAt={c.created_at} expiresAt={c.expires_at} />
        <ApproachList name={`field-${c.id}`} rows={rows} value={selected} onChange={setSelected} />
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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[300px] text-[12px] text-faint">
            A resolução por rolagem de dados chega na próxima fase.
          </p>
          {debugTools && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={simulateSuccess}
                loading={busy === 'ok'}
                disabled={blocked}
                title="Teste (só administrador): marca o desafio como resolvido, sem recompensas"
              >
                Simular sucesso
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={simulateFailure}
                loading={busy === 'fail'}
                disabled={blocked}
                title="Teste (só administrador): força uma falha e sorteia o ferimento no servidor"
              >
                Simular falha
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

/* ── Desafio de bordo ────────────────────────────────────────── */

function HullPips({ damage }: { damage: number }) {
  return (
    <span
      className="flex items-center gap-2 text-[12px] text-muted"
      title={damage > 0 ? `Casco com ${damage} de 3 de dano` : 'Casco íntegro'}
    >
      Casco
      <span className="flex gap-1" role="img" aria-label={`Dano ao casco: ${damage} de 3`}>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-[10px] w-[14px] rounded-[3px] ${i <= damage ? 'bg-bad' : 'bg-line'}`}
          />
        ))}
      </span>
    </span>
  )
}

export function BridgeCard({ b }: { b: BridgeMission }) {
  const { session, playerState } = useAuth()
  const debugTools = useDebugTools()
  const { fields, reloadLists } = useChallenges()
  const { worlds } = useGame()
  const toast = useToast()
  const [selected, setSelected] = useState(b.approaches[0]?.key ?? '')
  const [busy, setBusy] = useState<'ok' | 'normal' | 'critical' | null>(null)
  const now = useNow()

  const linkedWorld = (() => {
    if (!b.challenge_id) return null
    const ch = fields.find((c) => c.id === b.challenge_id)
    return ch ? worlds.find((w) => w.id === ch.world_id) : null
  })()
  const waiting = b.retry_at != null && new Date(b.retry_at).getTime() > now

  const rows: Row[] = b.approaches.map((a) => {
    const meta = BRIDGE_APPROACH[a.key as BridgeApproachKey]
    return {
      key: a.key,
      label: meta?.label ?? a.key,
      attr: ATTRIBUTE_LABEL[a.attr],
      risk: meta?.risk ?? 'médio',
      detail: meta?.use ?? '',
    }
  })

  async function simulateSuccess() {
    setBusy('ok')
    try {
      await resolveBridgeChallenge(b.id)
      toast('reward', 'Travessia concluída. O caminho até o planeta está livre.')
      await reloadLists()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível resolver.')
    } finally {
      setBusy(null)
    }
  }

  async function simulateFailure(critical: boolean) {
    if (!session) return
    setBusy(critical ? 'critical' : 'normal')
    try {
      const team = critical ? await pickAvailableTeam(session.user.id) : null
      const r = await applyBridgeFailure(b.id, selected, critical, team)
      if (r.injuredCrewId) {
        const who = findCrew(r.injuredCrewId)
        toast('error', `Falha crítica: ${who?.name ?? r.injuredCrewId} ficou ferido por 72h.`, r.injuredCrewId)
      } else {
        toast('info', `Casco danificado (${r.hullDamage} de 3). O desafio de campo perdeu 12h.`)
      }
      await reloadLists()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível registrar a falha.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="overflow-hidden rounded-[16px] border border-line bg-surface">
      <header className="relative flex items-end justify-between gap-3 overflow-hidden bg-hull px-4 pb-4 pt-5">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 120% at 100% 0%, rgba(196,125,16,0.28), transparent 70%)',
          }}
        />
        <div className="relative flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/10 text-ember">
            <Rocket size={19} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] text-white/70">
              {b.origin === 'linked'
                ? linkedWorld
                  ? `Rumo a ${linkedWorld.name} · desafio de bordo`
                  : 'Desafio de bordo'
                : 'Em trânsito · desafio de bordo'}
            </p>
            <h3 className="display truncate text-[19px] text-white">{b.title}</h3>
          </div>
        </div>
        <div className="relative">
          <IntensityMeter level={b.intensity} onDark />
        </div>
      </header>

      <div className="p-5">
        <p className="text-[13.5px] leading-relaxed text-muted">{b.description}</p>
        <Countdown createdAt={b.created_at} expiresAt={b.expires_at} />
        <ApproachList name={`bridge-${b.id}`} rows={rows} value={selected} onChange={setSelected} />
        <RetryNote retryAt={b.retry_at} />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <HullPips damage={playerState?.hull_damage ?? 0} />
          {debugTools && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={simulateSuccess}
                loading={busy === 'ok'}
                disabled={waiting || busy !== null}
                title="Teste (só administrador): marca a travessia como concluída, sem recompensas"
              >
                Simular sucesso
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => simulateFailure(false)}
                loading={busy === 'normal'}
                disabled={waiting || busy !== null}
                title="Teste (só administrador): dano ao casco e atraso"
              >
                Simular falha
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => simulateFailure(true)}
                loading={busy === 'critical'}
                disabled={waiting || busy !== null}
                title="Teste (só administrador): falha crítica também fere um tripulante"
              >
                Falha crítica
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

/* ── Seção da Ponte ──────────────────────────────────────────── */

/**
 * Some sozinha quando não há nada ativo: a Ponte só ganha este bloco
 * quando existe algo que exija atenção.
 */
export function ChallengesSection() {
  const { loading, fields, bridges } = useChallenges()
  if (loading || (fields.length === 0 && bridges.length === 0)) return null

  return (
    <section
      aria-label="Ameaças em andamento"
      className="rise mb-6 grid gap-4 lg:grid-cols-2"
      style={{ animationDelay: '45ms' }}
    >
      {bridges.map((b) => (
        <BridgeCard key={b.id} b={b} />
      ))}
      {fields.map((c) => (
        <FieldCard key={c.id} c={c} />
      ))}
    </section>
  )
}
