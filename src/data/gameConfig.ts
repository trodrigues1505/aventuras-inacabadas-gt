import type { Priority, WorldAccent } from '../types/database'

/**
 * Curva de progressão. Mantida como função (e não tabela) para que
 * níveis altos não exijam editar dados — o custo sobe 35% por nível.
 */
export function getXpRequiredForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.35, Math.max(0, level - 1)))
}

/** XP concedido ao concluir, por prioridade. A recompensa em créditos
 *  é definida por missão; o XP não, para que o jogador não consiga
 *  inflacionar o próprio nível. */
export const XP_BY_PRIORITY: Record<Priority, number> = {
  low: 8,
  mid: 15,
  high: 25,
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Baixa',
  mid: 'Media',
  high: 'Alta',
}

/**
 * Classes Tailwind por acento. Mapa explícito em vez de
 * interpolação (`bg-${accent}`) porque o Tailwind faz varredura
 * estática: classe montada em runtime não entra no CSS final.
 */
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
    label: 'Ambar',
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

/** Ícones sugeridos para mundos, como texto curto. */
export const WORLD_ICONS = [
  '🌐', '🚀', '🛰', '⚙️', '📡', '🧭', '🔭', '⭐️',
  '🌱', '📚', '💼', '🏠', '💪', '🎯', '✍️', '🎨',
]
