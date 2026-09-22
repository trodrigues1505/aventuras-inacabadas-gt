// ============================================================
// FASE 2 — tipos: galáxia e planetas
// ============================================================

export type Region =
  | 'setor-ancora'
  | 'corredor-vivo'
  | 'fronteira-cinzenta'
  | 'limiar'

export interface World {
  id: string
  slug: string
  name: string
  region: Region
  region_order: number
  planet_order: number
  biome: string
  xp_required: number
  trait_key: string
  trait_desc: string
  ideal_category: string
  lore_short: string
  lore_full: string
  coord_x: number   // 0-1, posição relativa no SVG
  coord_y: number
  color_primary: string
  color_glow: string
}

export interface PlayerWorld {
  id: string
  player_id: string
  world_id: string
  title: string
  colonized_at: string
  missions_total: number
  missions_won: number
  explored_pct: number
  // joined
  world?: World
}

export type WorldStatus = 'locked' | 'available' | 'colonized'

export interface WorldWithStatus extends World {
  status: WorldStatus
  playerWorld?: PlayerWorld
}

export interface RegionMeta {
  key: Region
  label: string
  xp_required: number
  level_required: number
  system_unlocked: string
  order: number
}

export const REGION_META: RegionMeta[] = [
  {
    key: 'setor-ancora',
    label: 'Setor Âncora',
    xp_required: 0,
    level_required: 1,
    system_unlocked: 'Core loop — missões, tripulação, recompensas',
    order: 1,
  },
  {
    key: 'corredor-vivo',
    label: 'Corredor Vivo',
    xp_required: 8000,
    level_required: 12,
    system_unlocked: 'Desafios narrativos + fragmentos de lore',
    order: 2,
  },
  {
    key: 'fronteira-cinzenta',
    label: 'Fronteira Cinzenta',
    xp_required: 25000,
    level_required: 18,
    system_unlocked: 'Sistema de combate à Malha',
    order: 3,
  },
  {
    key: 'limiar',
    label: 'Limiar',
    xp_required: 60000,
    level_required: 28,
    system_unlocked: 'Eventos galácticos + clímax narrativo',
    order: 4,
  },
]
