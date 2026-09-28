import { supabase } from '../lib/supabase'
import type { KanbanColumn } from '../types/database'

// Imagens de header disponíveis para colunas custom
export const KANBAN_IMGS = [
  { key: 'mapeadas',      src: 'assets/kanban/kanban-header-mapeadas.webp' },
  { key: 'em-curso',      src: 'assets/kanban/kanban-header-em-curso.webp' },
  { key: 'confirmar',     src: 'assets/kanban/kanban-header-para-confirmar.webp' },
  { key: 'arquivadas',    src: 'assets/kanban/kanban-header-arquivadas.webp' },
]

export const DOT_COLORS = [
  'bg-violet', 'bg-cyan', 'bg-azure', 'bg-ember', 'bg-good', 'bg-faint',
]

export function randomImg(): string {
  return KANBAN_IMGS[Math.floor(Math.random() * KANBAN_IMGS.length)].key
}

export function imgSrc(key: string): string {
  return KANBAN_IMGS.find(i => i.key === key)?.src ?? KANBAN_IMGS[0].src
}

export async function listKanbanColumns(userId: string): Promise<KanbanColumn[]> {
  const { data, error } = await supabase
    .from('kanban_columns')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []) as KanbanColumn[]
}

export async function createKanbanColumn(
  userId: string,
  label: string,
  position: number,
): Promise<KanbanColumn> {
  const img_key   = randomImg()
  const dot_color = DOT_COLORS[position % DOT_COLORS.length]
  const { data, error } = await (supabase.from('kanban_columns') as any)
    .insert({ user_id: userId, label, position, img_key, dot_color })
    .select()
    .single()
  if (error) throw error
  return data as KanbanColumn
}

export async function deleteKanbanColumn(id: string): Promise<void> {
  const { error } = await supabase.from('kanban_columns').delete().eq('id', id)
  if (error) throw error
}

export async function updateMissionCustomColumn(
  missionId: string,
  columnId: string | null,
): Promise<void> {
  const { error } = await (supabase.from('missions') as any)
    .update({ custom_column_id: columnId, status: columnId ? 'in_progress' : 'open' })
    .eq('id', missionId)
  if (error) throw error
}
