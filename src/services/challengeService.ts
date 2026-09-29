// ============================================================
// FASE 5 — acesso ao banco: desafios de campo e missões de bordo
//
// Leitura direta (RLS: só as próprias linhas). Toda ESCRITA passa
// por RPC — as tabelas não têm policy de insert/update. Os sorteios
// (chance de ferimento) acontecem no servidor.
//
// O cast em `.rpc` / `.from` segue o padrão de crewService.ts:
// types/database.ts não tipa Functions nem estas tabelas novas.
// ============================================================

import { supabase } from '../lib/supabase'
import { listCrewAttributes } from './crewService'
import type {
  BridgeFailureResult,
  BridgeMission,
  BridgeSpawn,
  FieldChallenge,
  FieldFailureResult,
  FieldSpawn,
} from '../types/challenges'

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

export async function listBridgeMissions(userId: string): Promise<BridgeMission[]> {
  const { data, error } = await (supabase.from('bridge_missions') as any)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return (data ?? []) as BridgeMission[]
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

/** challengeId null = missão de bordo independente. */
export async function spawnBridgeMission(
  challengeId: string | null,
  s: BridgeSpawn,
): Promise<string | null> {
  const { data, error } = await (supabase.rpc as any)('spawn_bridge_mission', {
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

/**
 * Falha em desafio de campo: o servidor sorteia o ferimento pela chance
 * da abordagem (GDD) e aplica 72h ao tripulante sorteado entre os 3.
 * Fase 6 chamará isto quando a rolagem de dados reprovar.
 */
export async function applyFieldFailure(
  challengeId: string,
  approach: string,
  crewIds: string[],
): Promise<FieldFailureResult> {
  const { data, error } = await (supabase.rpc as any)('apply_field_failure', {
    p_challenge_id: challengeId,
    p_approach: approach,
    p_crew_ids: crewIds,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return {
    injuredCrewId: row?.out_injured_crew_id ?? null,
    injuredUntil: row?.out_injured_until ?? null,
    intensity: row?.out_intensity ?? 1,
    retryAt: row?.out_retry_at ?? '',
  }
}

/** Falha de bordo: dano ao casco + atraso; ferimento só se `critical`. */
export async function applyBridgeFailure(
  bridgeId: string,
  approach: string,
  critical: boolean,
  crewIds: string[] | null,
): Promise<BridgeFailureResult> {
  const { data, error } = await (supabase.rpc as any)('apply_bridge_failure', {
    p_bridge_id: bridgeId,
    p_approach: approach,
    p_critical: critical,
    p_crew_ids: crewIds,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return {
    hullDamage: row?.out_hull_damage ?? 0,
    injuredCrewId: row?.out_injured_crew_id ?? null,
    injuredUntil: row?.out_injured_until ?? null,
    retryAt: row?.out_retry_at ?? '',
  }
}

/**
 * Escolhe 3 tripulantes disponíveis (ok, ou ferimento já vencido).
 * Só para as simulações de teste: a seleção de verdade é da Fase 6.
 */
export async function pickAvailableTeam(userId: string): Promise<string[]> {
  const rows = await listCrewAttributes(userId)
  const now = Date.now()
  const free = rows.filter(
    (r) =>
      r.status === 'ok' ||
      (r.injured_until != null && new Date(r.injured_until).getTime() <= now),
  )
  if (free.length < 3) {
    throw new Error('É preciso ter 3 tripulantes disponíveis para enviar.')
  }
  return free.slice(0, 3).map((r) => r.crew_id)
}
