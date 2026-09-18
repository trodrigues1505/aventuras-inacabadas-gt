/**
 * Dados estaticos da tripulacao. Ficam no codigo (nao no banco) porque sao
 * conteudo de jogo, iguais para todos os jogadores. O que e por jogador vive
 * em character_progress (FASE 2 em diante).
 */
export type CrewRole =
  | 'navegacao'
  | 'seguranca'
  | 'maquinas'
  | 'medicina'
  | 'ciencias'
  | 'reconhecimento'

export type GameCharacter = {
  id: string
  name: string
  species: string
  /** Funcao de bordo — o que a pessoa faz na nave. */
  post: string
  role: CrewRole
  /** Papel em combate contra os construtos. */
  combat: string
  trait: string
  gear: string
  accent: string
}

export const CHARACTERS: GameCharacter[] = [
  {
    id: 'iakop',
    name: 'Iakop',
    species: 'Ganso-havaiano',
    post: 'Navegacao',
    role: 'navegacao',
    combat: 'Precisao',
    trait: 'Racionalidade',
    gear: 'Console de rota',
    accent: '#9fb98a',
  },
  {
    id: 'dani',
    name: 'Dani',
    species: 'Lobo-guara',
    post: 'Seguranca de bordo',
    role: 'seguranca',
    combat: 'Defesa da equipe',
    trait: 'Lealdade',
    gear: 'Anteparo de campo',
    accent: '#d97a4f',
  },
  {
    id: 'aadan',
    name: 'Aadan',
    species: 'Hiena',
    post: 'Maquinas pesadas',
    role: 'maquinas',
    combat: 'Dano bruto',
    trait: 'Imaturidade',
    gear: 'Cortador de casco',
    accent: '#d0a32e',
  },
  {
    id: 'connor',
    name: 'Connor',
    species: 'Lebre-das-neves',
    post: 'Medicina',
    role: 'medicina',
    combat: 'Recuperacao',
    trait: 'Fe',
    gear: 'Tiras de sutura ativa',
    accent: '#7fd4e8',
  },
  {
    id: 'kira',
    name: 'Kira',
    species: 'Raposa-orelhuda',
    post: 'Ciencias e sinais',
    role: 'ciencias',
    combat: 'Interferencia',
    trait: 'Criatividade',
    gear: 'Estilete de sinal',
    accent: '#e07b9a',
  },
  {
    id: 'blanche',
    name: 'Blanche',
    species: 'Furao',
    post: 'Reconhecimento',
    role: 'reconhecimento',
    combat: 'Sabotagem',
    trait: 'Astucia',
    gear: 'Lamina de acesso',
    accent: '#8d9db8',
  },
]
