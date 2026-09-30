import { ArrowRight, Rocket } from 'lucide-react'
import { Badge } from '../Bits'
import { useAuth } from '../../hooks/AuthProvider'
import { useChallenges } from '../../hooks/ChallengeProvider'
import { useGame } from '../../hooks/GameProvider'
import { APPROACH, BRIDGE_APPROACH } from '../../data/challenges'
import { ATTRIBUTE_LABEL } from '../../data/crew'
import { expeditionCost } from '../../services/expeditionRules'
import type {
  ApproachKey,
  BridgeApproachKey,
  BridgeChallenge,
  FieldChallenge,
} from '../../types/challenges'
import {
  Countdown,
  HullPips,
  IntensityMeter,
  LinkButton,
  RESOURCE_ICON,
  RISK_TONE,
  RetryNote,
  bannerSlug,
  useNow,
} from './parts'

type ChipData = { key: string; label: string; attr: string; risk: 'baixo' | 'médio' | 'alto' }

/** Abordagens do desafio, só para leitura: a escolha acontece nó a nó, dentro da expedição. */
function ApproachChips({ items }: { items: ChipData[] }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-[13px] font-semibold text-text">Abordagens em jogo</p>
      <div className="flex flex-wrap gap-2">
        {items.map((r) => (
          <span
            key={r.key}
            className="inline-flex items-center gap-2 rounded-[10px] bg-raised px-2.5 py-1.5 text-[12.5px] text-text"
          >
            {r.label}
            <span className="text-faint">usa {r.attr}</span>
            <Badge tone={RISK_TONE[r.risk]}>risco {r.risk}</Badge>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Desafio de campo ────────────────────────────────────────── */

export function FieldCard({ c }: { c: FieldChallenge }) {
  const { worlds } = useGame()
  const { bridges } = useChallenges()
  useNow()

  const world = worlds.find((w) => w.id === c.world_id)
  // GDD: o desafio de bordo vinculado é a porta de entrada — precisa vir antes.
  const gate = bridges.find((b) => b.challenge_id === c.id)

  const chips: ChipData[] = c.approaches.map((a) => {
    const meta = APPROACH[a.key as ApproachKey]
    return {
      key: a.key,
      label: meta?.label ?? a.key,
      attr: ATTRIBUTE_LABEL[a.attr],
      risk: meta?.risk ?? 'médio',
    }
  })

  const cost = c.graph ? expeditionCost(c.graph, c.approaches) : null
  const CostIcon = cost ? RESOURCE_ICON[cost.resource] : null
  const resumed = c.won_nodes.length > 0

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
        <ApproachChips items={chips} />
        <RetryNote retryAt={c.retry_at} />
        {gate && (
          <p className="mt-4 rounded-[10px] bg-ember/10 px-3.5 py-2.5 text-[12px] text-ember">
            Antes, atravesse o desafio de bordo <strong className="font-semibold">{gate.title}</strong>:
            é a porta de entrada deste planeta.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[12px] text-faint">
            {cost && CostIcon ? (
              <>
                Custo único
                <span className="inline-flex items-center gap-1 rounded-[8px] bg-raised px-2 py-1 font-medium tabular-nums text-text">
                  <CostIcon size={12} className="text-faint" aria-hidden />
                  {cost.amount}
                </span>
              </>
            ) : (
              'A trilha é traçada ao abrir o desafio.'
            )}
          </p>
          {gate ? (
            <LinkButton to={`/desafio/${gate.id}`} variant="secondary">
              Ir ao desafio de bordo <ArrowRight size={15} aria-hidden />
            </LinkButton>
          ) : (
            <LinkButton to={`/desafio/${c.id}`}>
              {resumed ? 'Retomar expedição' : 'Abrir expedição'} <ArrowRight size={15} aria-hidden />
            </LinkButton>
          )}
        </div>
      </div>
    </article>
  )
}

/* ── Desafio de bordo ────────────────────────────────────────── */

export function BridgeCard({ b }: { b: BridgeChallenge }) {
  const { playerState } = useAuth()
  const { fields } = useChallenges()
  const { worlds } = useGame()

  const linkedWorld = (() => {
    if (!b.challenge_id) return null
    const ch = fields.find((c) => c.id === b.challenge_id)
    return ch ? worlds.find((w) => w.id === ch.world_id) : null
  })()

  const chips: ChipData[] = b.approaches.map((a) => {
    const meta = BRIDGE_APPROACH[a.key as BridgeApproachKey]
    return {
      key: a.key,
      label: meta?.label ?? a.key,
      attr: ATTRIBUTE_LABEL[a.attr],
      risk: meta?.risk ?? 'médio',
    }
  })

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
        <ApproachChips items={chips} />
        <RetryNote retryAt={b.retry_at} />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <HullPips damage={playerState?.hull_damage ?? 0} />
          <LinkButton to={`/desafio/${b.id}`}>
            Atravessar <ArrowRight size={15} aria-hidden />
          </LinkButton>
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
