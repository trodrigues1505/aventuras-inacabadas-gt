import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { PlayerState, Profile } from '../types/database'

const UNIQUE_VIOLATION = '23505'

/**
 * Le o perfil; cria apenas se ainda nao existir.
 *
 * Nao usa upsert de proposito: um upsert a cada login sobrescreveria o
 * display_name editado pelo jogador nas configuracoes. E se duas abas abrirem
 * juntas, o UNIQUE em user_id derruba a segunda insercao — tratamos 23505
 * relendo a linha em vez de propagar erro.
 *
 * `user_id` vai no payload por conveniencia; quem decide o acesso e o
 * auth.uid() dentro das policies de RLS, nunca a interface.
 */
export async function loadPlayer(user: User): Promise<{
  profile: Profile
  state: PlayerState
}> {
  const [profile, state] = await Promise.all([
    ensureProfile(user),
    ensurePlayerState(user.id),
  ])
  return { profile, state }
}

async function ensureProfile(user: User): Promise<Profile> {
  const existing = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing.error) throw existing.error
  if (existing.data) return existing.data as Profile

  const created = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      display_name:
        (user.user_metadata?.full_name as string | undefined) ??
        user.email?.split('@')[0] ??
        'Aventureiro',
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    })
    .select()
    .single()

  if (created.error) {
    if (created.error.code === UNIQUE_VIOLATION) return reread<Profile>('profiles', user.id)
    throw created.error
  }
  return created.data as Profile
}

async function ensurePlayerState(userId: string): Promise<PlayerState> {
  const existing = await supabase
    .from('player_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing.error) throw existing.error
  if (existing.data) return existing.data as PlayerState

  const created = await supabase
    .from('player_state')
    .insert({ user_id: userId })
    .select()
    .single()

  if (created.error) {
    if (created.error.code === UNIQUE_VIOLATION) return reread<PlayerState>('player_state', userId)
    throw created.error
  }
  return created.data as PlayerState
}

async function reread<T>(table: 'profiles' | 'player_state', userId: string): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data as T
}

export async function updateDisplayName(userId: string, displayName: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('user_id', userId)
  if (error) throw error
}
