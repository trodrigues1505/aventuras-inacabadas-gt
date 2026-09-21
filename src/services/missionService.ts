import { supabase } from '../lib/supabase'
import type { Mission, MissionStatus, PlayerState, Priority } from '../types/database'
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

/** Campos que podem ser atualizados no banco — inclui status para mover no Kanban. */
type MissionUpdate = Partial<MissionDraft> & { status?: MissionStatus }

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
  update: MissionUpdate,
): Promise<Mission> {
  const { data, error } = await supabase
    .from('missions')
    .update(update)
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
  crewNote: string | null
}

/**
 * Conclui (done) ou reabre (open) uma missão e liquida a recompensa.
 * Única função que toca XP e créditos — o Kanban chama updateMission
 * diretamente para os status intermediários (in_progress, review).
 */
export async function toggleMission(
  mission: Mission,
  state: PlayerState,
  allMissions: Mission[],
): Promise<CompletionResult> {
  const completing = mission.status !== 'done'

  if (!completing) {
    // Reabre: volta para 'open' sem mexer em XP/créditos
    const { data, error } = await supabase
      .from('missions')
      .update({ status: 'open', completed_at: null })
      .eq('id', mission.id)
      .select()
      .single()

    if (error) throw error

    return {
      mission: data as Mission,
      state,
      xpGained: 0,
      creditsGained: 0,
      leveledUpTo: null,
      crewNote: null,
    }
  }

  // Calcula recompensa base
  const baseXp = XP_BY_PRIORITY[mission.priority] ?? 10
  const baseCredits = mission.reward ?? 0

  // Aplica bônus do tripulante
  const bonus = applyBonus(state.crew_id, mission, allMissions)
  const xpGained = Math.round(baseXp * (bonus.xpMultiplier ?? 1)) + (bonus.xpFlat ?? 0)
  const creditsGained = Math.round(baseCredits * (bonus.creditsMultiplier ?? 1)) + (bonus.creditsFlat ?? 0)

  // Calcula level up
  let newXp = state.xp + xpGained
  let newLevel = state.level
  let leveledUpTo: number | null = null

  const required = getXpRequiredForLevel(newLevel)
  if (newXp >= required) {
    newXp -= required
    newLevel += 1
    leveledUpTo = newLevel
  }

  // Persiste missão e player_state atomicamente via duas chamadas
  const [missionResult, stateResult] = await Promise.all([
    supabase
      .from('missions')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', mission.id)
      .select()
      .single(),
    supabase
      .from('player_state')
      .update({
        xp: newXp,
        level: newLevel,
        currency: state.currency + creditsGained,
      })
      .eq('user_id', state.user_id)
      .select()
      .single(),
  ])

  if (missionResult.error) throw missionResult.error
  if (stateResult.error) throw stateResult.error

  return {
    mission: missionResult.data as Mission,
    state: stateResult.data as PlayerState,
    xpGained,
    creditsGained,
    leveledUpTo,
    crewNote: bonus.note ?? null,
  }
}
