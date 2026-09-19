import type { Mission } from '../types/database'

export type CrewId = 'dani' | 'aadan' | 'connor' | 'kira' | 'blanche' | 'iakop'

export type Bonus = { xp: number; credits: number; note: string | null }

export type CrewMember = {
  id: CrewId
  name: string
  role: string
  /** Fala curta, em primeira pessoa. É o que dá voz ao personagem. */
  line: string
  /** Como o bônus é descrito ao jogador, antes de escolher. */
  perk: string
  accent: string
  /** Iniciais enquanto não houver retrato. Trocar por <img> depois. */
  portrait: string
}

/**
 * ── TEXTOS PROVISÓRIOS ──
 * Nomes e funções vieram do conceito; as falas e os bônus são
 * proposta. Reescreva à vontade: nada fora deste arquivo depende
 * do texto, só dos `id`. Trocar um bônus é mexer em applyBonus().
 */
export const CREW: CrewMember[] = [
  {
    id: 'dani',
    name: 'Dani',
    role: 'Piloto',
    line: 'Me diz onde é o aperto que eu passo por dentro.',
    perk: 'Missoes de prioridade alta rendem +8 dados de exploracao.',
    accent: 'ember',
    portrait: 'DA',
  },
  {
    id: 'aadan',
    name: 'Aadan',
    role: 'Engenheiro',
    line: 'Toda peça tem lugar. O caos é só ordem que ninguém mapeou.',
    perk: 'Todo credito recebido rende 20% a mais.',
    accent: 'azure',
    portrait: 'AA',
  },
  {
    id: 'connor',
    name: 'Connor',
    role: 'Medico',
    line: 'A missao mais importante é a que te traz de volta.',
    perk: 'Concluir dentro do prazo rende +6 dados de exploracao.',
    accent: 'good',
    portrait: 'CO',
  },
  {
    id: 'kira',
    name: 'Kira',
    role: 'Estrategista',
    line: 'Três passos à frente. Sempre.',
    perk: 'Todos os dados de exploracao rendem 15% a mais.',
    accent: 'violet',
    portrait: 'KI',
  },
  {
    id: 'blanche',
    name: 'Blanché',
    role: 'Explorador',
    line: 'O horizonte é só onde a vista cansa.',
    perk: 'A primeira missao concluida em cada planeta rende +12 dados.',
    accent: 'cyan',
    portrait: 'BL',
  },
  {
    id: 'iakop',
    name: 'Iakop',
    role: 'Comunicacoes',
    line: 'Toda mensagem tem destinatario. Toda missao, um porquê.',
    perk: 'Toda missao concluida rende +3 creditos.',
    accent: 'bad',
    portrait: 'IA',
  },
]

export function findCrew(id: string | null): CrewMember | null {
  if (!id) return null
  return CREW.find((c) => c.id === id) ?? null
}

/**
 * Calcula o acréscimo do tripulante sobre uma conclusão.
 *
 * Roda sobre a lista de missões que o cliente já tem em memória — o
 * mesmo lugar onde o XP base é calculado hoje. Isso significa que é
 * falsificável por quem saiba abrir o DevTools; como só afeta o
 * próprio progresso, e a RLS impede tocar no de outra pessoa, o
 * risco fica contido. Se a economia passar a valer algo entre
 * jogadores, este cálculo precisa migrar para uma função no Postgres.
 */
export function applyBonus(
  crewId: string | null,
  mission: Mission,
  baseXp: number,
  baseCredits: number,
  allMissions: Mission[],
): Bonus {
  const none: Bonus = { xp: 0, credits: 0, note: null }
  const crew = findCrew(crewId)
  if (!crew) return none

  switch (crew.id) {
    case 'dani':
      return mission.priority === 'high'
        ? { xp: 8, credits: 0, note: 'Dani abriu caminho.' }
        : none

    case 'aadan': {
      const extra = Math.round(baseCredits * 0.2)
      return extra > 0
        ? { xp: 0, credits: extra, note: 'Aadan reaproveitou o excedente.' }
        : none
    }

    case 'connor': {
      if (!mission.due_date) return none
      const hoje = new Date().toISOString().slice(0, 10)
      return mission.due_date >= hoje
        ? { xp: 6, credits: 0, note: 'Connor registrou: dentro do prazo.' }
        : none
    }

    case 'kira': {
      const extra = Math.round(baseXp * 0.15)
      return extra > 0
        ? { xp: extra, credits: 0, note: 'Kira já tinha previsto.' }
        : none
    }

    case 'blanche': {
      if (!mission.world_id) return none
      // "Primeira do planeta" olha as outras: a missão atual ainda
      // consta como aberta na lista em memória neste instante.
      const jaConcluida = allMissions.some(
        (m) =>
          m.world_id === mission.world_id &&
          m.id !== mission.id &&
          m.status === 'done',
      )
      return jaConcluida
        ? none
        : { xp: 12, credits: 0, note: 'Blanché pisou onde ninguém tinha pisado.' }
    }

    case 'iakop':
      return { xp: 0, credits: 3, note: 'Iakop repassou o comunicado.' }

    default:
      return none
  }
}
