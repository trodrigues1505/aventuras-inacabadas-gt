// ============================================================
// FASE 5 — tipos: desafios narrativos (campo) e missões de bordo
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

/** Abordagens das missões de BORDO (GDD, "Missões de Bordo"). */
export type BridgeApproachKey = 'manobra' | 'navegacao' | 'pilotagem'

export type ResourceKey = 'suprimentos' | 'dados' | 'pulsos'

export type ChallengeStatus = 'active' | 'resolved' | 'expired'

/** Uma abordagem já materializada num desafio (é o que vai no jsonb). */
export type ApproachOption = {
  key: string
  attr: AttributeKey
  /** Recurso gasto; null em missão de bordo (sem custo na Fase 5). */
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
}

export type BridgeMission = {
  id: string
  user_id: string
  /** null = missão de bordo independente. */
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
  /** Missão de bordo que serve de porta de entrada (intensidade ≥ 2). */
  bridge: BridgeSpawn | null
}

export type SpawnPlan = {
  fields: FieldSpawn[]
  independentBridge: BridgeSpawn | null
}

export type FieldFailureResult = {
  injuredCrewId: string | null
  injuredUntil: string | null
  intensity: number
  retryAt: string
}

export type BridgeFailureResult = {
  hullDamage: number
  injuredCrewId: string | null
  injuredUntil: string | null
  retryAt: string
}
