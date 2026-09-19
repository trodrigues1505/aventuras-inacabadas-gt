import { supabase } from '../lib/supabase'
import type { Mission, PlayerState, Profile, World } from '../types/database'

export type AdminSnapshot = {
  profiles: Profile[]
  states: PlayerState[]
  worlds: World[]
  missions: Mission[]
}

/**
 * Uma leitura só, em paralelo. Quem autoriza é a policy is_admin()
 * no Postgres — a interface nunca decide acesso, apenas deixa de
 * desenhar o que não vai vir. Um não-admin recebe listas vazias.
 */
export async function loadAdminSnapshot(): Promise<AdminSnapshot> {
  const [profiles, states, worlds, missions] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('player_state').select('*'),
    supabase.from('worlds').select('*'),
    supabase.from('missions').select('*').order('created_at', { ascending: false }),
  ])

  const failed = [profiles, states, worlds, missions].find((r) => r.error)
  if (failed?.error) throw failed.error

  return {
    profiles: (profiles.data ?? []) as Profile[],
    states: (states.data ?? []) as PlayerState[],
    worlds: (worlds.data ?? []) as World[],
    missions: (missions.data ?? []) as Mission[],
  }
}

export async function adminUpdateState(
  userId: string,
  patch: { level?: number; xp?: number; currency?: number },
): Promise<PlayerState> {
  const { data, error } = await supabase
    .from('player_state')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as PlayerState
}

export async function adminUpdateProfile(
  userId: string,
  patch: { display_name?: string },
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}
