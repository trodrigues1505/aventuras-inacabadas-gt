// ============================================================
// FASE 5 — catálogo e parâmetros dos desafios
//
// Tudo que é "número de balanceamento" mora em CHALLENGE_CONFIG:
// mexer no ritmo do jogo é mexer num objeto só.
// Crises vêm da seção "Desafios por bioma" do GDD; a chave do
// catálogo é o slug do planeta fixo (tabela `worlds`).
// ============================================================

import type { AttributeKey } from './crew'
import type { ApproachKey, BridgeApproachKey, ResourceKey } from '../types/challenges'

export const CHALLENGE_CONFIG = {
  /**
   * Nível mínimo de autonomia para os desafios aparecerem.
   * O GDD liga "Desafios narrativos" ao Corredor Vivo (nível 12),
   * mas o roadmap da Fase 5 não pede esse bloqueio — fica em 1 para
   * poder testar já. Para seguir o GDD à risca, troque por 12.
   */
  minLevel: 1,

  /** Gatilho de campo: precisa de N missões vencidas E esse % do que está pendente. */
  minOverdue: 2,
  minOverduePct: 0.4,

  /** Depois de um desafio num planeta (de qualquer status), espera isto antes de outro. */
  cooldownHours: 48,

  /** Prazo para resolver (GDD: ~5–7 dias em qualquer ritmo). */
  expiresHours: { 1: 168, 2: 144, 3: 120 } as Record<number, number>,

  /** Custo = ritmo diário médio do recurso × (4 + intensidade) dias, nunca menos que o piso. */
  costWindowDays: 14,
  costMinAmount: 4,

  /** Missão de bordo vinculada nasce quando o desafio de campo tem esta intensidade ou mais. */
  bridgeLinkedMinIntensity: 2,

  /** Missão de bordo independente: total de vencidas (todos os planetas) para disparar. */
  bridgeIndependentMinOverdue: 5,
  bridgeIndependentCooldownHours: 72,
  bridgeIndependentExpiresHours: 96,
} as const

// ─── Abordagens de campo ─────────────────────────────────────────

export type ApproachMeta = {
  label: string
  attr: AttributeKey
  /** Chance de ferimento grave na falha (GDD). */
  injuryPct: number
  risk: 'baixo' | 'médio' | 'alto'
  reward: 'baixa' | 'média' | 'alta'
  /** Ação física → Suprimentos, intelectual → Dados, tática → Pulsos (GDD). */
  resource: ResourceKey
}

export const APPROACH: Record<ApproachKey, ApproachMeta> = {
  combate:     { label: 'Combate',     attr: 'for', injuryPct: 35, risk: 'alto',  reward: 'alta',  resource: 'suprimentos' },
  captura:     { label: 'Captura',     attr: 'agi', injuryPct: 25, risk: 'médio', reward: 'média', resource: 'suprimentos' },
  furtividade: { label: 'Furtividade', attr: 'agi', injuryPct: 20, risk: 'médio', reward: 'média', resource: 'pulsos' },
  exploracao:  { label: 'Exploração',  attr: 'per', injuryPct: 15, risk: 'baixo', reward: 'baixa', resource: 'pulsos' },
  pesquisa:    { label: 'Pesquisa',    attr: 'int', injuryPct: 10, risk: 'baixo', reward: 'baixa', resource: 'dados' },
  negociacao:  { label: 'Negociação',  attr: 'inf', injuryPct: 10, risk: 'baixo', reward: 'baixa', resource: 'pulsos' },
}

export const BRIDGE_APPROACH: Record<
  BridgeApproachKey,
  { label: string; attr: AttributeKey; risk: 'baixo' | 'médio' | 'alto'; use: string }
> = {
  manobra:   { label: 'Manobra Evasiva',       attr: 'agi', risk: 'alto',  use: 'Fugir do perigo imediato.' },
  navegacao: { label: 'Navegação',             attr: 'per', risk: 'médio', use: 'Achar uma rota segura ou mais rápida.' },
  pilotagem: { label: 'Pilotagem de Sistemas', attr: 'tec', risk: 'baixo', use: 'Estabilizar a nave e redistribuir energia.' },
}

export const RESOURCE_LABEL: Record<ResourceKey, string> = {
  suprimentos: 'Suprimentos',
  dados: 'Dados',
  pulsos: 'Pulsos',
}

// ─── Crises de campo, por planeta ────────────────────────────────

export type Crisis = {
  key: string
  title: string
  description: string
  /** De 2 a 3 abordagens oferecidas. */
  approaches: ApproachKey[]
}

export const FIELD_CRISES: Record<string, Crisis[]> = {
  varda: [
    {
      key: 'praga-fungica',
      title: 'Praga fúngica',
      description: 'Um micélio de brilho pálido avança pelas plantações da colônia e já alcançou os reservatórios.',
      approaches: ['pesquisa', 'combate', 'exploracao'],
    },
    {
      key: 'predador-territorial',
      title: 'Predador territorial',
      description: 'Um animal do tamanho de um transporte reivindicou a clareira do posto avançado e não aceita visitas.',
      approaches: ['combate', 'captura', 'furtividade'],
    },
    {
      key: 'enxame-eletrico',
      title: 'Enxame elétrico',
      description: 'Nuvens de insetos carregados derrubam a rede de sensores a cada anoitecer.',
      approaches: ['captura', 'pesquisa', 'exploracao'],
    },
    {
      key: 'primatas-inteligentes',
      title: 'Primatas inteligentes',
      description: 'Um bando montou barricadas na trilha de acesso e faz exigências em gestos que ninguém entendeu ainda.',
      approaches: ['negociacao', 'furtividade', 'captura'],
    },
  ],
  thalassa: [
    {
      key: 'corrente-anomala',
      title: 'Corrente anômala',
      description: 'Uma corrente que não consta nos mapas arrasta as boias de monitoramento para longe da costa.',
      approaches: ['exploracao', 'pesquisa', 'furtividade'],
    },
    {
      key: 'contaminacao-quimica',
      title: 'Contaminação química',
      description: 'A água ao redor das plataformas mudou de cor durante a noite e os filtros já não dão conta.',
      approaches: ['pesquisa', 'exploracao'],
    },
    {
      key: 'leviata-abissal',
      title: 'Leviatã abissal',
      description: 'Algo enorme subiu das profundezas e passou a rondar as turbinas submersas.',
      approaches: ['combate', 'furtividade', 'captura'],
    },
    {
      key: 'criatura-das-profundezas',
      title: 'Criatura das profundezas',
      description: 'Uma inteligência que nunca vimos respondeu ao sonar com um padrão que parece uma pergunta.',
      approaches: ['negociacao', 'pesquisa', 'exploracao'],
    },
  ],
  zerion: [
    {
      key: 'tempestade-de-areia',
      title: 'Tempestade de areia',
      description: 'Uma parede de poeira fechou a rota de suprimentos e os sensores estão cegos.',
      approaches: ['exploracao', 'pesquisa'],
    },
    {
      key: 'verme-do-subsolo',
      title: 'Verme do subsolo',
      description: 'O solo abaixo do acampamento vibra em intervalos regulares, e cada vez mais perto.',
      approaches: ['combate', 'captura', 'furtividade'],
    },
    {
      key: 'oasis-artificial',
      title: 'Oásis artificial',
      description: 'Uma fonte de água limpa surgiu no meio do nada, de origem desconhecida e com dono, talvez.',
      approaches: ['pesquisa', 'furtividade', 'negociacao'],
    },
    {
      key: 'predador-invisivel',
      title: 'Predador noturno',
      description: 'Algo ataca depois do pôr do sol e os sensores não registram nada além do rastro.',
      approaches: ['captura', 'furtividade', 'exploracao'],
    },
  ],
  kestrel: [
    {
      key: 'fissura-no-gelo',
      title: 'Fissura no gelo',
      description: 'Uma rachadura nova corta a planície ao lado da base e cresce a cada tremor.',
      approaches: ['exploracao', 'pesquisa'],
    },
    {
      key: 'criatura-criogenica',
      title: 'Criatura criogênica',
      description: 'O degelo de um bloco antigo deixou à mostra algo que está começando a se mexer.',
      approaches: ['captura', 'pesquisa', 'furtividade'],
    },
    {
      key: 'predador-branco',
      title: 'Predador branco',
      description: 'Um caçador camuflado na neve já levou dois drones de patrulha antes de ser visto.',
      approaches: ['combate', 'furtividade', 'captura'],
    },
    {
      key: 'estrutura-no-gelo',
      title: 'Estrutura preservada',
      description: 'Uma construção intacta apareceu sob o gelo, e o ar dentro dela está aquecido.',
      approaches: ['pesquisa', 'exploracao', 'furtividade'],
    },
  ],
  nyx: [
    {
      key: 'frequencia-desconhecida',
      title: 'Frequência desconhecida',
      description: 'Um sinal sem origem interrompe as comunicações e repete a mesma sequência de três tons.',
      approaches: ['pesquisa', 'exploracao', 'furtividade'],
    },
    {
      key: 'ia-abandonada',
      title: 'IA abandonada',
      description: 'Sistemas velhos foram reativados nas ruínas e alguém, ou algo, está respondendo aos comandos.',
      approaches: ['negociacao', 'pesquisa', 'furtividade'],
    },
    {
      key: 'ruina-ativa',
      title: 'Ruína ativa',
      description: 'As paredes de uma ruína estão se reorganizando e o caminho de ontem já não existe.',
      approaches: ['pesquisa', 'exploracao', 'combate'],
    },
    {
      key: 'entidade-residual',
      title: 'Entidade residual',
      description: 'Uma presença sem corpo acompanha as equipes de campo e repete frases que elas ainda não disseram.',
      approaches: ['negociacao', 'furtividade', 'pesquisa'],
    },
  ],
}

// ─── Crises de bordo ─────────────────────────────────────────────

export type BridgeCrisis = { key: string; title: string; description: string }

/** Porta de entrada de um desafio de campo (GDD: zona de risco no caminho). */
export const LINKED_BRIDGE_CRISES: BridgeCrisis[] = [
  {
    key: 'campo-de-detritos',
    title: 'Campo de detritos',
    description: 'A rota até o planeta atravessa restos de casco a alta velocidade. É preciso passar antes que o desafio no solo expire.',
  },
  {
    key: 'tempestade-ionica',
    title: 'Tempestade iônica',
    description: 'Uma frente de plasma fecha o corredor de aproximação e derruba a telemetria da Andarilha.',
  },
  {
    key: 'interceptacao-da-malha',
    title: 'Interceptação da Malha',
    description: 'Um agente da Malha aguarda em órbita e avalia cada nave que tenta descer.',
  },
]

/** Sem planeta de destino: evento de trânsito. */
export const INDEPENDENT_BRIDGE_CRISES: BridgeCrisis[] = [
  {
    key: 'perseguicao-da-malha',
    title: 'Perseguição da Malha',
    description: 'Drones da Malha entraram na sua esteira. Cada missão vencida a bordo alimenta a perseguição.',
  },
  {
    key: 'falha-de-sistema-em-rota',
    title: 'Falha de sistema em rota',
    description: 'A redistribuição de energia da Andarilha oscila, e a nave está em trânsito sem porto por perto.',
  },
]
