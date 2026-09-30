// ============================================================
// FASE 5/6 — acesso ao banco: desafios de campo e de bordo
//
// Leitura direta (RLS: só as próprias linhas). Toda ESCRITA passa
// por RPC — as tabelas não têm policy de insert/update. Os sorteios
// (dados, ferimento) acontecem no servidor: o cliente só envia a
// escolha (equipe, líder, nó) e reproduz o resultado devolvido.
//
// O cast em `.rpc` / `.from` segue o padrão de crewService.ts:
// types/database.ts não tipa Functions nem estas tabelas novas.
// ============================================================

import { supabase } from '../lib/supabase'
import type {
  AbandonResult,
  BridgeChallenge,
  BridgeRollResult,
  BridgeSpawn,
  ExpeditionAttempt,
  FieldChallenge,
  FieldSpawn,
  RepairResult,
  RollNodeResult,
  StartExpeditionResult,
  Trail,
} from '../types/challenges'
import type { PlayerState } from '../types/database'

/** Encerra o que venceu e libera ferimentos que já acabaram. */
export async function syncGameState(): Promise<void> {
  const { error } = await (supabase.rpc as any)('sync_game_state')
  if (error) throw error
}

export async function listFieldChallenges(userId: string): Promise<FieldChallenge[]> {
  const { data, error } = await (supabase.from('narrative_challenges') as any)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return (data ?? []) as FieldChallenge[]
}

export async function listBridgeChallenges(userId: string): Promise<BridgeChallenge[]> {
  const { data, error } = await (supabase.from('bridge_challenges') as any)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return (data ?? []) as BridgeChallenge[]
}

/** Devolve o id criado, ou null se já havia um desafio ativo no planeta. */
export async function spawnFieldChallenge(s: FieldSpawn): Promise<string | null> {
  const { data, error } = await (supabase.rpc as any)('spawn_field_challenge', {
    p_world_id: s.world_id,
    p_crisis_key: s.crisis_key,
    p_title: s.title,
    p_description: s.description,
    p_intensity: s.intensity,
    p_approaches: s.approaches,
    p_expires_at: s.expires_at,
  })
  if (error) throw error
  return (data as string | null) ?? null
}

/** challengeId null = desafio de bordo independente. */
export async function spawnBridgeChallenge(
  challengeId: string | null,
  s: BridgeSpawn,
): Promise<string | null> {
  const { data, error } = await (supabase.rpc as any)('spawn_bridge_challenge', {
    p_challenge_id: challengeId,
    p_crisis_key: s.crisis_key,
    p_title: s.title,
    p_description: s.description,
    p_intensity: s.intensity,
    p_approaches: s.approaches,
    p_expires_at: s.expires_at,
  })
  if (error) throw error
  return (data as string | null) ?? null
}

// ─── Fase 6 — expedição (desafio de campo) ───────────────────────

/** Grava a trilha gerada. Idempotente: se já existe, o servidor ignora. */
export async function setChallengeGraph(challengeId: string, graph: Trail): Promise<void> {
  const { error } = await (supabase.rpc as any)('set_challenge_graph', {
    p_challenge_id: challengeId,
    p_graph: graph,
  })
  if (error) throw error
}

/** Cobra o custo único e abre a expedição com os 3 enviados. */
export async function startExpedition(
  challengeId: string,
  crewIds: string[],
): Promise<StartExpeditionResult> {
  const { data, error } = await (supabase.rpc as any)('start_expedition', {
    p_challenge_id: challengeId,
    p_crew_ids: crewIds,
  })
  if (error) throw error
  return { attemptId: data.attempt_id, cost: data.cost }
}

/**
 * Rola UM nó no servidor. `force` só é aceito para administradores
 * (ferramenta de teste); para os demais o servidor recusa.
 */
export async function rollExpeditionNode(
  attemptId: string,
  nodeId: string,
  leader: string | null,
  force?: 'success' | 'fail',
): Promise<RollNodeResult> {
  const { data, error } = await (supabase.rpc as any)('roll_expedition_node', {
    p_attempt_id: attemptId,
    p_node_id: nodeId,
    p_leader: leader,
    p_force: force ?? null,
  })
  if (error) throw error
  return data as RollNodeResult
}

/** Abandonar = falhar: metade do custo volta, intensidade +1, espera de 24 h. */
export async function abandonExpedition(attemptId: string): Promise<AbandonResult> {
  const { data, error } = await (supabase.rpc as any)('abandon_expedition', {
    p_attempt_id: attemptId,
  })
  if (error) throw error
  return {
    refunded: data.refunded,
    resource: data.resource,
    intensity: data.intensity,
    retryAt: data.retry_at ?? null,
    affectedUntil: data.affected_until,
  }
}

/** Tentativa mais recente do desafio (qualquer status), ou null. */
export async function latestAttempt(challengeId: string): Promise<ExpeditionAttempt | null> {
  const { data, error } = await (supabase.from('challenge_attempts') as any)
    .select('*')
    .eq('challenge_id', challengeId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as ExpeditionAttempt | null) ?? null
}

// ─── Fase 6 — desafio de bordo e casco ───────────────────────────

export async function rollBridgeChallenge(args: {
  bridgeId: string
  approach: string
  leader: string
  crewIds: string[]
  force?: 'success' | 'fail' | 'critical'
}): Promise<BridgeRollResult> {
  const { data, error } = await (supabase.rpc as any)('roll_bridge_challenge', {
    p_bridge_id: args.bridgeId,
    p_approach: args.approach,
    p_leader: args.leader,
    p_crew_ids: args.crewIds,
    p_force: args.force ?? null,
  })
  if (error) throw error
  if (data.status === 'expired') return { status: 'expired' }
  return {
    status: data.status,
    dice: data.dice ?? [],
    pool: data.pool,
    required: data.required,
    successes: data.successes,
    success: data.success,
    critical: data.critical,
    forced: data.forced,
    hullDamage: data.hull_damage,
    injuredCrewId: data.injured_crew_id ?? null,
    injuredUntil: data.injured_until ?? null,
    intensity: data.intensity,
    retryAt: data.retry_at ?? null,
    reward: data.reward ?? null,
  }
}

/** Conserta 1 ponto do casco (3→2 = 40 · 2→1 = 25 · 1→0 = 15 créditos). */
export async function repairHull(): Promise<RepairResult> {
  const { data, error } = await (supabase.rpc as any)('repair_hull')
  if (error) throw error
  return {
    cost: data.cost,
    hullDamage: data.hull_damage,
    remainingCurrency: data.remaining_currency,
  }
}

/**
 * Relê o player_state depois de uma RPC que mexeu em XP, créditos,
 * recursos ou casco (o servidor é quem mudou; o cliente só reflete).
 */
export async function fetchPlayerState(userId: string): Promise<PlayerState> {
  const { data, error } = await supabase
    .from('player_state')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data as PlayerState
}
