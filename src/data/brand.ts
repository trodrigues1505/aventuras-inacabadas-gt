/**
 * Identidade do jogo em um lugar so. Nome, nave e faccao ainda estao sendo
 * decididos — nenhum componente escreve esses textos direto, para que trocar
 * qualquer um deles seja uma edicao aqui e nada mais.
 */
export const BRAND = {
  appName: 'Aventuras Inacabadas',
  appNameLines: ['Aventuras', 'Inacabadas'],
  tagline: 'Um RPG de exploracao sobre a sua rotina',
  ship: 'Andarilha',
  faction: {
    name: 'a Malha',
    nameCapitalized: 'A Malha',
    /** Usado em telas de contexto e, depois, na abertura dos setores. */
    blurb:
      'Enxame de maquinas auto-replicantes que padroniza mundos: apaga o improvisado, o feito a mao, o inacabado.',
  },
  /** Vocabulario do jogo. Trocar aqui muda a interface inteira. */
  terms: {
    area: 'mundo',
    areaPlural: 'mundos',
    task: 'missao',
    taskPlural: 'missoes',
    xp: 'dados de exploracao',
    currency: 'creditos',
    enemy: 'construto',
    chapter: 'setor',
  },
} as const
