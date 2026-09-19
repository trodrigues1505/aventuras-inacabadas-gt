import { supabase } from '../lib/supabase'
import type { World, WorldAccent } from '../types/database'

export type WorldDraft = {
  name: string
  description: string | null
  icon: string
  accent: WorldAccent
}

export async function listWorlds(userId: string): Promise<World[]> {
  const { data, error } = await supabase
    .from('worlds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as World[]
}

export async function createWorld(
  userId: string,
  draft: WorldDraft,
): Promise<World> {
  const { data, error } = await supabase
    .from('worlds')
    .insert({ ...draft, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data as World
}

export async function updateWorld(
  id: string,
  draft: Partial<WorldDraft>,
): Promise<World> {
  const { data, error } = await supabase
    .from('worlds')
    .update(draft)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as World
}

/**
 * As missões do mundo não são apagadas junto: o FK usa ON DELETE
 * SET NULL, então elas sobrevivem como "sem mundo". Perder o
 * histórico de tarefas concluídas ao arquivar uma categoria seria
 * destrutivo demais para uma ação de um clique.
 */
export async function deleteWorld(id: string): Promise<void> {
  const { error } = await supabase.from('worlds').delete().eq('id', id)
  if (error) throw error
}
