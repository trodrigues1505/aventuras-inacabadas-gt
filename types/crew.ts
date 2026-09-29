// src/types/crew.ts
// Tipos para o sistema de tripulação — Fase 4

export type AttributeKey = 'for' | 'agi' | 'tec' | 'int' | 'inf' | 'per';

export type CrewId = 'dani' | 'aadan' | 'connor' | 'kira' | 'blanche' | 'iakop';

export type CrewStatus = 'ok' | 'injured';

/** Papel do atributo na ficha do tripulante — determina o multiplicador de XP. */
export type AttributeRole = 'principal' | 'secundario' | 'terciario';

export interface CrewMember {
  id: CrewId;
  user_id: string;
  for: number;
  agi: number;
  tec: number;
  int: number;
  inf: number;
  per: number;
  for_xp: number;
  agi_xp: number;
  tec_xp: number;
  int_xp: number;
  inf_xp: number;
  per_xp: number;
  status: CrewStatus;
  injured_until: string | null;
  created_at: string;
}

export interface CrewItem {
  id: string;
  user_id: string;
  crew_id: CrewId;
  item_key: string;
  equipped_at: string;
}

/** Metadados fixos de cada tripulante — não vêm do banco, vivem no código. */
export interface CrewMeta {
  id: CrewId;
  name: string;
  animal: string;
  role: string; // função de bordo
  mainAttribute: AttributeKey;
  passiveBonus: string; // descrição do bônus passivo (texto do GDD)
  portrait: string; // caminho do asset
}

export const CREW_META: Record<CrewId, CrewMeta> = {
  dani: {
    id: 'dani',
    name: 'Dani',
    animal: 'Lobo-guará',
    role: 'Piloto',
    mainAttribute: 'agi',
    passiveBonus: '+8 XP em missões de Emergência (Alta)',
    portrait: '/assets/crew/dani.webp',
  },
  aadan: {
    id: 'aadan',
    name: 'Aadan',
    animal: 'Hiena',
    role: 'Engenheiro',
    mainAttribute: 'for',
    passiveBonus: '+15% em Suprimentos gerados',
    portrait: '/assets/crew/aadan.webp',
  },
  connor: {
    id: 'connor',
    name: 'Connor',
    animal: 'Coelho',
    role: 'Médico',
    mainAttribute: 'tec',
    passiveBonus: '+6 XP + 2 Dados ao concluir no prazo',
    portrait: '/assets/crew/connor.webp',
  },
  kira: {
    id: 'kira',
    name: 'Kira',
    animal: 'Raposa',
    role: 'Estrategista',
    mainAttribute: 'int',
    passiveBonus: '+10% em todo XP ganho',
    portrait: '/assets/crew/kira.webp',
  },
  blanche: {
    id: 'blanche',
    name: 'Blanché',
    animal: 'Furão',
    role: 'Explorador',
    mainAttribute: 'per',
    passiveBonus: '+12 XP + 4 Pulsos na primeira missão de cada planeta',
    portrait: '/assets/crew/blanche.webp',
  },
  iakop: {
    id: 'iakop',
    name: 'Iakop',
    animal: 'Garça',
    role: 'Comunicações',
    mainAttribute: 'inf',
    passiveBonus: '+3 créditos + 2 Suprimentos por missão concluída',
    portrait: '/assets/crew/iakop.webp',
  },
};

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  for: 'Força',
  agi: 'Agilidade',
  tec: 'Técnica',
  int: 'Intelecto',
  inf: 'Influência',
  per: 'Percepção',
};

/** Multiplicador de XP por papel do atributo na ficha (GDD — Crescimento de Atributos). */
export const ATTRIBUTE_ROLE_MULTIPLIER: Record<AttributeRole, number> = {
  principal: 1.0,
  secundario: 0.6,
  terciario: 0.3,
};

/** Pontos de XP necessários para subir de nível, no multiplicador de 100% (principal). */
export const ATTRIBUTE_LEVEL_THRESHOLDS: Record<number, number> = {
  5: 10, // 5 -> 6
  6: 20, // 6 -> 7
  7: 35, // 7 -> 8
  8: 55, // 8 -> 9
  9: 80, // 9 -> 10
  10: 40, // 10 -> 11 (requer item equipado)
  11: 60, // 11 -> 12 (requer item equipado)
};

export const ATTRIBUTE_NATURAL_CAP = 10;
export const ATTRIBUTE_ITEM_CAP = 12;

/** Determina o papel de um atributo na ficha de um tripulante, dado seu valor atual. */
export function getAttributeRole(value: number): AttributeRole {
  if (value >= 5) return 'principal';
  if (value >= 3) return 'secundario';
  return 'terciario';
}
