import { supabase } from '../lib/supabase'
import type { Mission, PlayerState, Priority } from '../types/database'
import { XP_BY_PRIORITY, getXpRequiredForLevel } from '../data/gameConfig'
import { applyBonus } from '../data/crew'

export type MissionDraft = {
  title: string
  description: string | null
  world_id: string | null
  priority: Priority
  due_date: string | null
  reward: number
}

export async function listMissions(userId: string): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Mission[]
}

export async function createMission(
  userId: string,
  draft: MissionDraft,
): Promise<Mission> {
  const { data, error } = await supabase
    .from('missions')
    .insert({ ...draft, user_id: userId, status: 'open' })
    .select()
    .single()

  if (error) throw error
  return data as Mission
}

export async function updateMission(
  id: string,
  draft: Partial<MissionDraft>,
): Promise<Mission> {
  const { data, error } = await supabase
    .from('missions')
    .update(draft)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Mission
}

export async function deleteMission(id: string): Promise<void> {
  const { error } = await supabase.from('missions').delete().eq('id', id)
  if (error) throw error
}

export type CompletionResult = {
  mission: Mission
  state: PlayerState
  xpGained: number
  creditsGained: number
  leveledUpTo: number | null
  /** Frase do tripulante quando o bonus dele entrou. */
  crewNote: string | null
}

/**
 * Conclui (ou reabre) uma missão e liquida a recompensa.
 *
 * Reabrir NÃO estorna XP nem créditos de propósito: desmarcar por
 * engano e perder progresso é punitivo, e o estorno abriria caminho
 * para saldo negativo. Em compensação, só paga quem estava aberta —
 * o campo `completed_at` é a trava contra farmar a mesma missão.
 */
export async function toggleMission(
  mission: Mission,
  state: PlayerState,
  allMissions: Mission[] = [],
): Promise<CompletionResult> {
  const reopening = mission.status === 'done'

  const { data: updated, error } = await supabase
    .from('missions')
    .update({
      status: reopening ? 'open' : 'done',
      completed_at: reopening ? null : new Date().toISOString(),
    })
    .eq('id', mission.id)
    .select()
    .single()

  if (error) throw error

  const alreadyPaid = mission.completed_at !== null
  if (reopening || alreadyPaid) {
    return {
      mission: updated as Mission,
      state,
      xpGained: 0,
      creditsGained: 0,
      leveledUpTo: null,
      crewNote: null,
    }
  }

  const baseXp = XP_BY_PRIORITY[mission.priority]
  const baseCredits = mission.reward
  const bonus = applyBonus(
    state.crew_id,
    mission,
    baseXp,
    baseCredits,
    allMissions,
  )

  const xpGained = baseXp + bonus.xp
  const creditsGained = baseCredits + bonus.credits

  let xp = state.xp + xpGained
  let level = state.level
  let leveledUpTo: number | null = null

  while (xp >= getXpRequiredForLevel(level)) {
    xp -= getXpRequiredForLevel(level)
    level += 1
    leveledUpTo = level
  }

  const { data: nextState, error: stateError } = await supabase
    .from('player_state')
    .update({ xp, level, currency: state.currency + creditsGained })
    .eq('user_id', state.user_id)
    .select()
    .single()

  if (stateError) throw stateError

  return {
    mission: updated as Mission,
    state: nextState as PlayerState,
    xpGained,
    creditsGained,
    leveledUpTo,
    crewNote: bonus.note,
  }
}
