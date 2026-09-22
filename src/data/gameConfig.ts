import type { Priority, WorldAccent } from '../types/database'

export function getXpRequiredForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.35, Math.max(0, level - 1)))
}

export const XP_BY_PRIORITY: Record<Priority, number> = {
  low: 8,
  mid: 15,
  high: 25,
}

/**
 * Créditos base por prioridade — não editável pelo usuário.
 * Concluir dentro do prazo adiciona CREDITS_ON_TIME_BONUS.
 */
export const CREDITS_BY_PRIORITY: Record<Priority, number> = {
  low: 8,
  mid: 15,
  high: 30,
}

export const XP_ON_TIME_BONUS = 5
export const CREDITS_ON_TIME_BONUS = 5

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Baixa',
  mid: 'Média',
  high: 'Alta',
}

export type MissionType = 'rotina' | 'operacao' | 'emergencia'

export const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  rotina: 'Rotina',
  operacao: 'Operação',
  emergencia: 'Emergência',
}

export const MISSION_TYPE_RESOURCE: Record<MissionType, 'suprimentos' | 'dados' | 'pulsos'> = {
  rotina: 'suprimentos',
  operacao: 'dados',
  emergencia: 'pulsos',
}

// Recursos gerados: type × priority
export const RESOURCE_BY_TYPE_PRIORITY: Record<MissionType, Record<Priority, number>> = {
  rotina:     { low: 4, mid: 8, high: 14 },
  operacao:   { low: 4, mid: 8, high: 14 },
  emergencia: { low: 4, mid: 8, high: 14 },
}

export const ACCENT: Record<
  WorldAccent,
  { dot: string; text: string; soft: string; bar: string; label: string }
> = {
  azure: {
    dot: 'bg-azure',
    text: 'text-azure',
    soft: 'bg-azure/10',
    bar: 'bg-azure',
    label: 'Azul',
  },
  good: {
    dot: 'bg-good',
    text: 'text-good',
    soft: 'bg-good/10',
    bar: 'bg-good',
    label: 'Verde',
  },
  ember: {
    dot: 'bg-ember',
    text: 'text-ember',
    soft: 'bg-ember/10',
    bar: 'bg-ember',
    label: 'Âmbar',
  },
  bad: {
    dot: 'bg-bad',
    text: 'text-bad',
    soft: 'bg-bad/10',
    bar: 'bg-bad',
    label: 'Vermelho',
  },
  violet: {
    dot: 'bg-[#7c5cef]',
    text: 'text-[#7c5cef]',
    soft: 'bg-[#7c5cef]/10',
    bar: 'bg-[#7c5cef]',
    label: 'Violeta',
  },
  cyan: {
    dot: 'bg-[#0d93ad]',
    text: 'text-[#0d93ad]',
    soft: 'bg-[#0d93ad]/10',
    bar: 'bg-[#0d93ad]',
    label: 'Ciano',
  },
}

export const ACCENT_KEYS = Object.keys(ACCENT) as WorldAccent[]

export const WORLD_ICONS = [
  '🌐', '🚀', '🛰', '⚙️', '📡', '🧭', '🔭', '⭐️',
  '🌱', '📚', '💼', '🏠', '💪', '🎯', '✍️', '🎨',
]
