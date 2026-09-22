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

// ─── Novos métodos Fase 2/3 ───────────────────────────────────────

export type ExploredWorldEntry = {
  id: string           // id do player_worlds
  world_id: string
  title: string        // categoria do jogador
  slug: string
  name: string
  icon: string
  accent: WorldAccent
  planet_image: PlanetImage | null
  description: string | null
  color_primary: string
  trait_desc: string
  missions_total: number
  missions_won: number
}

/** Busca os mundos explorados pelo jogador (join player_worlds × worlds fixos). */
export async function listExploredWorlds(userId: string): Promise<World[]> {
  // Busca player_worlds do jogador
  const { data: pw, error: pwErr } = await supabase
    .from('player_worlds')
    .select('*')
    .eq('player_id', userId)
  if (pwErr) throw pwErr
  if (!pw || pw.length === 0) return []

  // Busca os worlds fixos correspondentes
  const worldIds = pw.map((p: { world_id: string }) => p.world_id)
  const { data: worlds, error: wErr } = await supabase
    .from('worlds')
    .select('*')
    .in('id', worldIds)
  if (wErr) throw wErr

  // Adapta para o formato World esperado pelo GameProvider
  // Usa o título do jogador como name e o slug como identificador
  return (worlds ?? []).map((w: Record<string, unknown>) => {
    const playerWorld = pw.find((p: { world_id: string; title?: string; colonized_at?: string }) => p.world_id === w.id) as { world_id: string; title?: string; colonized_at?: string } | undefined
    return {
      id: w.id as string,
      user_id: userId,
      name: (playerWorld?.title as string) ?? (w.name as string),
      description: w.lore_short as string | null,
      icon: '🪐',
      accent: 'azure' as WorldAccent,
      slug: w.slug as string,
      planet_image: (w.slug as string) as PlanetImage,
      created_at: (playerWorld?.colonized_at as string) ?? '',
      updated_at: (playerWorld?.colonized_at as string) ?? '',
    } as World
  })
}
