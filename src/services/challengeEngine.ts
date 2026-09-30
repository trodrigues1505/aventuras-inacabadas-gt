// ============================================================
// FASE 5 — motor de geração de desafios
//
// Funções PURAS: recebem missões/planetas/desafios já em memória
// e devolvem um plano do que criar. Quem grava é o challengeService
// (via RPC) — assim o motor é testável sem banco e sem relógio.
// ============================================================

import type { Mission, World } from '../types/database'
import { localDateISO } from '../lib/date'
import type {
  ApproachOption,
  BridgeMission,
  BridgeSpawn,
  FieldChallenge,
  FieldSpawn,
  ResourceKey,
  SpawnPlan,
} from '../types/challenges'
import type { ApproachKey } from '../types/challenges'
import {
  APPROACH,
  BRIDGE_APPROACH,
  CHALLENGE_CONFIG as CFG,
  FIELD_CRISES,
  INDEPENDENT_BRIDGE_CRISES,
  LINKED_BRIDGE_CRISES,
  type BridgeCrisis,
  type Crisis,
} from '../data/challenges'
import {
  MISSION_TYPE_RESOURCE,
  RESOURCE_BY_TYPE_PRIORITY,
} from '../data/gameConfig'

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

export { localDateISO }

// ─── Negligência ─────────────────────────────────────────────────

export type Negligence = {
  overdue: number
  /** Missões não concluídas COM prazo (vencidas + ainda no prazo). */
  pending: number
  pct: number
  /** Dias de atraso da missão vencida mais antiga. */
  oldestDays: number
}

export function isOverdue(m: Mission, today: string): boolean {
  return m.status !== 'done' && m.due_date != null && m.due_date < today
}

export function planetNegligence(
  missions: Mission[],
  worldId: string,
  now: Date,
): Negligence {
  const today = localDateISO(now)
  const mine = missions.filter(
    (m) => m.world_id === worldId && m.status !== 'done' && m.due_date != null,
  )
  const overdue = mine.filter((m) => isOverdue(m, today))
  const oldest = overdue.reduce((max, m) => {
    const days = Math.floor(
      (new Date(`${today}T12:00`).getTime() - new Date(`${m.due_date}T12:00`).getTime()) / DAY_MS,
    )
    return Math.max(max, days)
  }, 0)
  return {
    overdue: overdue.length,
    pending: mine.length,
    pct: mine.length ? overdue.length / mine.length : 0,
    oldestDays: oldest,
  }
}

/** GDD: quanto maior o % e mais tempo passado, maior a intensidade. */
export function intensityFor(n: Negligence): number {
  if (n.pct >= 0.8 || n.oldestDays >= 14) return 3
  if (n.pct >= 0.6 || n.oldestDays >= 7) return 2
  return 1
}

export function isChallengeTriggered(n: Negligence): boolean {
  return n.overdue >= CFG.minOverdue && n.pct >= CFG.minOverduePct
}

// ─── Custo proporcional ao ritmo ─────────────────────────────────

export type ResourceRates = Record<ResourceKey, number>

/**
 * Média diária de cada recurso gerado nas últimas 2 semanas, reconstruída
 * das missões concluídas (não existe histórico de recursos no banco; o
 * player_state só guarda o saldo). Usa a mesma tabela de toggleMission.
 */
export function resourceRates(missions: Mission[], now: Date): ResourceRates {
  const since = now.getTime() - CFG.costWindowDays * DAY_MS
  const total: ResourceRates = { suprimentos: 0, dados: 0, pulsos: 0 }
  for (const m of missions) {
    if (m.status !== 'done' || !m.completed_at) continue
    if (new Date(m.completed_at).getTime() < since) continue
    const type = m.type ?? 'operacao'
    total[MISSION_TYPE_RESOURCE[type]] += RESOURCE_BY_TYPE_PRIORITY[type][m.priority]
  }
  return {
    suprimentos: total.suprimentos / CFG.costWindowDays,
    dados: total.dados / CFG.costWindowDays,
    pulsos: total.pulsos / CFG.costWindowDays,
  }
}

/** Sem punição por volume baixo: ritmo baixo = custo baixo (com um piso). */
export function costFor(resource: ResourceKey, rates: ResourceRates, intensity: number): number {
  return Math.max(CFG.costMinAmount, Math.round(rates[resource] * (4 + intensity)))
}

function fieldApproaches(
  keys: ApproachKey[],
  rates: ResourceRates,
  intensity: number,
): ApproachOption[] {
  return keys.map((key) => {
    const meta = APPROACH[key]
    return {
      key,
      attr: meta.attr,
      resource: meta.resource,
      cost: costFor(meta.resource, rates, intensity),
    }
  })
}

function bridgeApproaches(): ApproachOption[] {
  return (Object.keys(BRIDGE_APPROACH) as (keyof typeof BRIDGE_APPROACH)[]).map((key) => ({
    key,
    attr: BRIDGE_APPROACH[key].attr,
    resource: null,
    cost: 0,
  }))
}

// ─── Planejamento ────────────────────────────────────────────────

type Rng = () => number

function pick<T>(list: T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length)]
}

function pickCrisis(slug: string, avoidKey: string | null, rng: Rng): Crisis | null {
  const all = FIELD_CRISES[slug]
  if (!all || all.length === 0) return null
  const fresh = avoidKey ? all.filter((c) => c.key !== avoidKey) : all
  return pick(fresh.length ? fresh : all, rng)
}

function bridgeSpawn(
  crisis: BridgeCrisis,
  intensity: number,
  expiresAt: Date,
): BridgeSpawn {
  return {
    crisis_key: crisis.key,
    title: crisis.title,
    description: crisis.description,
    intensity,
    approaches: bridgeApproaches(),
    expires_at: expiresAt.toISOString(),
  }
}

export type PlanInput = {
  worlds: World[]
  missions: Mission[]
  /** Desafios recentes de qualquer status (o cooldown olha os encerrados). */
  challenges: FieldChallenge[]
  bridges: BridgeMission[]
  now?: Date
  rng?: Rng
}

export function planSpawns({
  worlds,
  missions,
  challenges,
  bridges,
  now = new Date(),
  rng = Math.random,
}: PlanInput): SpawnPlan {
  const rates = resourceRates(missions, now)
  const cooldownMs = CFG.cooldownHours * HOUR_MS
  const fields: FieldSpawn[] = []

  for (const w of worlds) {
    const slug = w.slug ?? ''
    if (!FIELD_CRISES[slug]) continue

    const history = challenges.filter((c) => c.world_id === w.id)
    if (history.some((c) => c.status === 'active')) continue
    const last = history.reduce<FieldChallenge | null>(
      (best, c) => (!best || c.created_at > best.created_at ? c : best),
      null,
    )
    if (last && now.getTime() - new Date(last.created_at).getTime() < cooldownMs) continue

    const neg = planetNegligence(missions, w.id, now)
    if (!isChallengeTriggered(neg)) continue

    const intensity = intensityFor(neg)
    const crisis = pickCrisis(slug, last?.crisis_key ?? null, rng)
    if (!crisis) continue

    const expiresAt = new Date(now.getTime() + CFG.expiresHours[intensity] * HOUR_MS)
    const linked =
      intensity >= CFG.bridgeLinkedMinIntensity
        ? bridgeSpawn(pick(LINKED_BRIDGE_CRISES, rng), intensity, expiresAt)
        : null

    fields.push({
      world_id: w.id,
      crisis_key: crisis.key,
      title: crisis.title,
      description: crisis.description,
      intensity,
      approaches: fieldApproaches(crisis.approaches, rates, intensity),
      expires_at: expiresAt.toISOString(),
      bridge: linked,
    })
  }

  return { fields, independentBridge: planIndependentBridge({ worlds, missions, bridges, now, rng }) }
}

function planIndependentBridge({
  worlds,
  missions,
  bridges,
  now,
  rng,
}: {
  worlds: World[]
  missions: Mission[]
  bridges: BridgeMission[]
  now: Date
  rng: Rng
}): BridgeSpawn | null {
  const independent = bridges.filter((b) => b.origin === 'independent')
  if (independent.some((b) => b.status === 'active')) return null
  const last = independent.reduce<BridgeMission | null>(
    (best, b) => (!best || b.created_at > best.created_at ? b : best),
    null,
  )
  if (last && now.getTime() - new Date(last.created_at).getTime() < CFG.bridgeIndependentCooldownHours * HOUR_MS) {
    return null
  }

  const today = localDateISO(now)
  const ids = new Set(worlds.map((w) => w.id))
  const overdue = missions.filter((m) => m.world_id && ids.has(m.world_id) && isOverdue(m, today)).length
  if (overdue < CFG.bridgeIndependentMinOverdue) return null

  const intensity = overdue >= 15 ? 3 : overdue >= 10 ? 2 : 1
  return bridgeSpawn(
    pick(INDEPENDENT_BRIDGE_CRISES, rng),
    intensity,
    new Date(now.getTime() + CFG.bridgeIndependentExpiresHours * HOUR_MS),
  )
}
