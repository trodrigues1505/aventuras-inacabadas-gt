import { supabase } from '../lib/supabase'
import type { PlanetImage, World, WorldAccent } from '../types/database'
import { toSlug } from '../utils/slug'

export type WorldDraft = {
  name: string
  description: string | null
  icon: string
  accent: WorldAccent
  planet_image: PlanetImage | null
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

export async function createWorld(userId: string, draft: WorldDraft): Promise<World> {
  const slug = toSlug(draft.name)
  const { data, error } = await supabase
    .from('worlds')
    .insert({ ...draft, user_id: userId, slug })
    .select()
    .single()
  if (error) throw error
  return data as World
}

export async function updateWorld(id: string, draft: Partial<WorldDraft>): Promise<World> {
  const patch = draft.name ? { ...draft, slug: toSlug(draft.name) } : draft
  const { data, error } = await supabase
    .from('worlds')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as World
}

export async function deleteWorld(id: string): Promise<void> {
  const { error } = await supabase.from('worlds').delete().eq('id', id)
  if (error) throw error
}
