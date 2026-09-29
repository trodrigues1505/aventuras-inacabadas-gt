import { supabase } from '../lib/supabase'
import type { PlayerState } from '../types/database'
import type { AttributeKey, CrewId } from '../data/crew'

export async function setCrew(
  userId: string,
  crewId: string,
): Promise<PlayerState> {
  const { data, error } = await supabase
    .from('player_state')
    .update({ crew_id: crewId })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as PlayerState
}

// ─── Fase 4 — Atributos ─────────────────────────────────────────

/**
 * Ficha de atributos persistida de um tripulante (tabela `crew`,
 * uma linha por user_id + crew_id). Não confundir com CrewMember
 * (data/crew.ts), que é o dado estático de nome/role/perk/etc.
 */
export type CrewAttributes = {
  user_id: string
  crew_id: CrewId
  for: number
  agi: number
  tec: number
  int: number
  inf: number
  per: number
  for_xp: number
  agi_xp: number
  tec_xp: number
  int_xp: number
  inf_xp: number
  per_xp: number
  status: 'ok' | 'injured'
  injured_until: string | null
}

export async function listCrewAttributes(userId: string): Promise<CrewAttributes[]> {
  const { data, error } = await supabase
    .from('crew')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as CrewAttributes[]
}

/**
 * Garante que a ficha dos 6 tripulantes existe para o usuário.
 * Chama a RPC seed_crew_for_user (idempotente — on conflict do nothing),
 * então relê. Usar no login / primeiro carregamento da tela de Tripulação.
 */
export async function ensureCrewSeeded(userId: string): Promise<CrewAttributes[]> {
  const existing = await listCrewAttributes(userId)
  if (existing.length > 0) return existing

  // Cast necessário: types/database.ts declara Functions como
  // Record<string, never> (nenhuma função tipada), então o TS
  // infere os parâmetros de .rpc() como `undefined`. Isso não afeta
  // a chamada em runtime — supabase.rpc só usa o nome e o objeto de
  // parâmetros, que aqui estão corretos.
  const { error } = await (supabase.rpc as any)('seed_crew_for_user', {
    p_user_id: userId,
  })
  if (error) throw error

  return listCrewAttributes(userId)
}

/**
 * Aplica XP a um atributo específico via RPC (grow_crew_attribute),
 * que faz a leitura + cálculo de nível + escrita atomicamente no
 * Postgres — evita a corrida de duas conclusões de missão quase
 * simultâneas lendo o mesmo XP em memória no client.
 *
 * role: 'principal' (100%) é o único caminho usado hoje, disparado
 * pelo Kanban comum via toggleMission. 'secundario' (60%) e
 * 'terciario' (30%) ficam prontos para desafios narrativos e missões
 * de bordo (Fases 5/6).
 *
 * Retorna o novo valor do atributo e se houve level-up nesta
 * chamada — usado para dar feedback ao jogador (ver toggleMission).
 */
export type GrowResult = { newValue: number; leveledUp: boolean }

export async function growCrewAttribute(
  userId: string,
  crewId: CrewId,
  attribute: AttributeKey,
  role: 'principal' | 'secundario' | 'terciario',
  basePoints = 1,
): Promise<GrowResult> {
  // Cast necessário: types/database.ts declara Functions como
  // Record<string, never> (nenhuma função tipada), então o TS
  // infere os parâmetros/retorno de .rpc() incorretamente. Isso não
  // afeta a chamada em runtime.
  const { data, error } = await (supabase.rpc as any)('grow_crew_attribute', {
    p_user_id: userId,
    p_crew_id: crewId,
    p_attribute: attribute,
    p_role: role,
    p_base_points: basePoints,
  })
  if (error) throw error
  // A RPC retorna table(new_value int, leveled_up boolean) — o
  // client do Supabase entrega isso como array de 1 linha.
  const row = Array.isArray(data) ? data[0] : data
  return {
    newValue: row?.new_value ?? 0,
    leveledUp: Boolean(row?.leveled_up),
  }
}

/**
 * Cura um tripulante ferido via RPC (heal_crew_member), que debita
 * créditos de player_state e limpa o ferimento atomicamente.
 * Lança erro se o tripulante não estiver ferido ou se não houver
 * créditos suficientes — nesses casos nada é alterado no banco.
 */
export async function healCrewMember(
  userId: string,
  crewId: CrewId,
): Promise<{ cost: number; remainingCurrency: number }> {
  const { data, error } = await (supabase.rpc as any)('heal_crew_member', {
    p_user_id: userId,
    p_crew_id: crewId,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return {
    cost: row?.cost ?? 0,
    remainingCurrency: row?.remaining_currency ?? 0,
  }
}
