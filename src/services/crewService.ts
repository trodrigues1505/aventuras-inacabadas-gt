import { supabase } from '../lib/supabase'
import type { PlayerState } from '../types/database'

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
