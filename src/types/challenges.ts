// ============================================================
// FASE 5/6 — tipos: desafios de campo (com expedição) e de bordo
// ============================================================

import type { AttributeKey } from '../data/crew'

/** Abordagens dos desafios de CAMPO (GDD, "Sistema de resolução"). */
export type ApproachKey =
  | 'combate'
  | 'captura'
  | 'furtividade'
  | 'pesquisa'
  | 'negociacao'
  | 'exploracao'

/** Abordagens dos desafios de BORDO (GDD, "Desafios de Bordo"). */
export type BridgeApproachKey = 'manobra' | 'navegacao' | 'pilotagem'

export type ResourceKey = 'suprimentos' | 'dados' | 'pulsos'

export type ChallengeStatus = 'active' | 'resolved' | 'expired'

/** Uma abordagem já materializada num desafio (é o que vai no jsonb). */
export type ApproachOption = {
  key: string
  attr: AttributeKey
  /** Recurso gasto; null em desafio de bordo (sem custo). */
  resource: ResourceKey | null
  cost: number
}

export type FieldChallenge = {
  id: string
  user_id: string
  world_id: string
  crisis_key: string
  title: string
  description: string
  intensity: number
  approaches: ApproachOption[]
  status: ChallengeStatus
  attempts: number
  retry_at: string | null
  expires_at: string
  created_at: string
  updated_at: string
  /** Fase 6 — trilha da expedição; null até a 1ª abertura do desafio. */
  graph: Trail | null
  /** Fase 6 — ids dos nós já vencidos (continuam vencidos após uma falha). */
  won_nodes: string[]
}

export type BridgeChallenge = {
  id: string
  user_id: string
  /** null = desafio de bordo independente. */
  challenge_id: string | null
  origin: 'linked' | 'independent'
  crisis_key: string
  title: string
  description: string
  intensity: number
  approaches: ApproachOption[]
  status: ChallengeStatus
  attempts: number
  retry_at: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

/** O que o motor manda criar (ainda sem id/status — o banco preenche). */
export type BridgeSpawn = {
  crisis_key: string
  title: string
  description: string
  intensity: number
  approaches: ApproachOption[]
  expires_at: string
}

export type FieldSpawn = {
  world_id: string
  crisis_key: string
  title: string
  description: string
  intensity: number
  approaches: ApproachOption[]
  expires_at: string
  /** Desafio de bordo que serve de porta de entrada (intensidade ≥ 2). */
  bridge: BridgeSpawn | null
}

export type SpawnPlan = {
  fields: FieldSpawn[]
  independentBridge: BridgeSpawn | null
}

// ─── Fase 6 — trilha e expedição ─────────────────────────────────

/** Um nó da trilha: um dilema, uma abordagem, um atributo. */
export type TrailNode = {
  id: string
  /** Coluna (0 = entrada). Só existe ligação de uma coluna para a seguinte. */
  col: number
  /** Posição dentro da coluna (só desenho). */
  row: number
  approach: ApproachKey
  attr: AttributeKey
  text: string
}

export type TrailMold = 'parallel' | 'funnel' | 'long'

/** Grafo da trilha, gravado em narrative_challenges.graph. */
export type Trail = {
  version: 1
  seed: string
  mold: TrailMold
  nodes: TrailNode[]
  /** [de, para] */
  edges: [string, string][]
  final: string
}

export type NodeResult = 'won' | 'failed' | 'cleared'

/** Uma linha do caminho percorrido (challenge_attempts.path). */
export type PathEntry = {
  node: string
  result: NodeResult
  leader: string | null
  dice: number[] | null
  pool: number | null
  required: number
  successes: number | null
  injured: string | null
  injured_until?: string | null
  forced?: boolean
}

export type AttemptStatus = 'in_progress' | 'succeeded' | 'abandoned' | 'expired'

/** Linha de challenge_attempts. */
export type ExpeditionAttempt = {
  id: string
  user_id: string
  challenge_id: string
  crew_ids: string[]
  cost: { resource: ResourceKey; amount: number }
  path: PathEntry[]
  current_node: string | null
  status: AttemptStatus
  rewards: ExpeditionRewards | null
  refunded: { resource: ResourceKey; amount: number } | null
  started_at: string
  finished_at: string | null
}

export type ExpeditionRewards = {
  xp: number
  credits: number
  resource: ResourceKey
  resource_amount: number
  level: number | null
  nodes: number
  won: number
  failed: number
}

export type StartExpeditionResult = {
  attemptId: string
  cost: { resource: ResourceKey; amount: number }
}

/** Resposta de roll_expedition_node. */
export type RollNodeResult =
  | (PathEntry & { status: 'in_progress' | 'succeeded'; rewards: ExpeditionRewards | null })
  | { status: 'expired'; refunded?: number; resource?: ResourceKey }

export type AbandonResult = {
  refunded: number
  resource: ResourceKey
  intensity: number
  retryAt: string | null
  affectedUntil: string
}

/** Resposta de roll_bridge_challenge. */
export type BridgeRollResult =
  | { status: 'expired' }
  | {
      status: 'resolved' | 'failed'
      dice: number[]
      pool: number
      required: number
      successes: number
      success: boolean
      critical: boolean
      forced: boolean
      hullDamage: number
      injuredCrewId: string | null
      injuredUntil: string | null
      intensity: number
      retryAt: string | null
      reward: { resource: ResourceKey; amount: number } | null
    }

export type RepairResult = { cost: number; hullDamage: number; remainingCurrency: number }
