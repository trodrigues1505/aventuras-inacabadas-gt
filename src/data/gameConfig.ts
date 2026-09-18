/**
 * Configuracao central do jogo. Nenhum calculo de XP deve viver dentro de
 * componente React — tudo que for regra numerica passa por aqui.
 */
export const GAME_CONFIG = {
  startingLevel: 1,
  startingXp: 0,
  startingCurrency: 0,
  xpCurve: { base: 100, growth: 1.25 },
  partyMaxActive: 4,
  xpByDifficulty: {
    easy: { min: 10, max: 20 },
    medium: { min: 20, max: 40 },
    hard: { min: 40, max: 70 },
    epic: { min: 70, max: 120 },
  },
} as const

export type Difficulty = keyof typeof GAME_CONFIG.xpByDifficulty

/** XP necessario para sair do nivel informado e chegar ao seguinte. */
export function getXpRequiredForLevel(level: number): number {
  const { base, growth } = GAME_CONFIG.xpCurve
  return Math.round(base * Math.pow(growth, Math.max(0, level - 1)))
}
