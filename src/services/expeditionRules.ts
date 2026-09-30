// ============================================================
// FASE 6 — regras da expedição (funções PURAS)
//
// O servidor (fase6.sql) é quem sorteia e paga. Este arquivo
// espelha as mesmas contas só para mostrar a PRÉVIA ao jogador
// (dados, chance, custo, recompensa) e para os testes.
// Se mudar uma regra, mude nos dois lugares — os testes em
// testes-fase6/ comparam os números com os do SQL.
// ============================================================

import { APPROACH, BRIDGE_RESOURCE, BRIDGE_REWARD_PER_INTENSITY, EXPEDITION_CONFIG, HULL_REPAIR_COST } from '../data/challenges'
import type {
  ApproachKey,
  ApproachOption,
  BridgeApproachKey,
  NodeResult,
  PathEntry,
  ResourceKey,
  Trail,
} from '../types/challenges'

// ─── Dados ───────────────────────────────────────────────────

/** Sucessos exigidos por nó: intensidade 1 → 3 · 2 → 4 · 3 → 5. */
export function requiredSuccesses(intensity: number): number {
  return EXPEDITION_CONFIG.requiredBase + intensity
}

export type PoolMember = {
  /** Valor do atributo do tripulante. */
  value: number
  leader: boolean
  /** Ferido: metade dos dados que traria. */
  injured: boolean
}

/** Dados que um tripulante coloca na rolagem. */
export function memberDice(m: PoolMember): number {
  const base = m.leader ? m.value : Math.floor(m.value / 2)
  return m.injured ? Math.floor(base / 2) : base
}

/**
 * Dados = atributo do líder + ⌊ajudante ÷ 2⌋ + ⌊ajudante ÷ 2⌋.
 * No desafio de bordo cada ponto de dano ao casco tira 1 dado.
 */
export function poolSize(members: PoolMember[], hullDamage = 0): number {
  const total = members.reduce((n, m) => n + memberDice(m), 0)
  return Math.max(0, total - hullDamage)
}

/** Probabilidade de ter ao menos `needed` sucessos em `dice` d6 (sucesso = 4, 5 ou 6). */
export function chanceAtLeast(dice: number, needed: number): number {
  if (needed <= 0) return 1
  if (dice < needed) return 0
  // P(X = k) = C(n,k) / 2^n, com p = 1/2
  let c = 1 // C(n,0)
  let below = 0
  for (let k = 0; k < needed; k++) {
    below += c
    c = (c * (dice - k)) / (k + 1)
  }
  return 1 - below / Math.pow(2, dice)
}

export function countSuccesses(dice: number[]): number {
  return dice.filter((d) => d >= EXPEDITION_CONFIG.successFrom).length
}

// ─── Ferimento ───────────────────────────────────────────────

export function injuryChancePct(approach: ApproachKey): number {
  return APPROACH[approach]?.injuryPct ?? 0
}

// ─── Trilha ──────────────────────────────────────────────────

export function entryNode(trail: Trail): string {
  const targets = new Set(trail.edges.map((e) => e[1]))
  return trail.nodes.find((n) => !targets.has(n.id))?.id ?? trail.nodes[0].id
}

export function successors(trail: Trail, nodeId: string): string[] {
  return trail.edges.filter((e) => e[0] === nodeId).map((e) => e[1])
}

/** Recurso predominante da trilha (empate: ordem alfabética — igual ao SQL). */
export function trailResource(trail: Trail): ResourceKey {
  const count = new Map<ResourceKey, number>()
  for (const n of trail.nodes) {
    const r = APPROACH[n.approach].resource
    count.set(r, (count.get(r) ?? 0) + 1)
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
}

/** Custo único da expedição: 1 recurso; valor = maior custo das abordagens que o gastam (piso 4). */
export function expeditionCost(
  trail: Trail,
  approaches: ApproachOption[],
): { resource: ResourceKey; amount: number } {
  const resource = trailResource(trail)
  const costs = approaches
    .filter((a) => APPROACH[a.key as ApproachKey]?.resource === resource)
    .map((a) => a.cost ?? 0)
  return { resource, amount: Math.max(EXPEDITION_CONFIG.costFloor, ...costs, 0) }
}

export type NodeStatus = 'locked' | 'available' | 'won' | 'failed'

export type NodeState = {
  status: NodeStatus
  /** É onde a equipe está agora. */
  current: boolean
  /** Já vencido numa expedição anterior: passa sem rolar. */
  cleared: boolean
}

/**
 * Estado de cada nó para desenhar o tabuleiro.
 * `path` vem da tentativa; `wonBefore` de narrative_challenges.won_nodes.
 * Sem tentativa em andamento, nenhum nó fica disponível (só o mapa).
 */
export function nodeStates(
  trail: Trail,
  path: PathEntry[],
  wonBefore: string[],
  running: boolean,
): Record<string, NodeState> {
  const visited = new Map<string, NodeResult>(path.map((p) => [p.node, p.result]))
  const currentId = path.length ? path[path.length - 1].node : null
  const next = new Set(
    !running
      ? []
      : currentId
        ? successors(trail, currentId)
        : [entryNode(trail)],
  )
  const out: Record<string, NodeState> = {}
  for (const n of trail.nodes) {
    const r = visited.get(n.id)
    out[n.id] = {
      status: r ? (r === 'failed' ? 'failed' : 'won') : next.has(n.id) ? 'available' : 'locked',
      current: n.id === currentId,
      cleared: !r && wonBefore.includes(n.id),
    }
  }
  return out
}

// ─── Recompensa ──────────────────────────────────────────────

/**
 * Recompensa total = valor × intensidade, dividida entre os nós percorridos:
 * nó vencido (ou já vencido antes) paga 100% da parcela, nó falho 50%.
 */
export function expeditionReward(intensity: number, results: NodeResult[]) {
  const len = results.length
  if (len === 0) return { xp: 0, credits: 0, resource: 0 }
  const good = results.filter((r) => r !== 'failed').length
  const bad = len - good
  const share = (base: number) => Math.floor((base * intensity * (2 * good + bad)) / (2 * len))
  return {
    xp: share(EXPEDITION_CONFIG.reward.xp),
    credits: share(EXPEDITION_CONFIG.reward.credits),
    resource: share(EXPEDITION_CONFIG.reward.resource),
  }
}

/** Metade do custo volta quando a expedição falha. */
export function refundOnFailure(amount: number): number {
  return Math.floor(amount / 2)
}

// ─── Desafio de bordo ────────────────────────────────────────

/** Custo de consertar o PRÓXIMO ponto do casco (3→2 = 40 · 2→1 = 25 · 1→0 = 15). */
export function hullRepairCost(hullDamage: number): number | null {
  return HULL_REPAIR_COST[hullDamage] ?? null
}

export function bridgeReward(approach: BridgeApproachKey, intensity: number) {
  return {
    resource: BRIDGE_RESOURCE[approach],
    amount: BRIDGE_REWARD_PER_INTENSITY * intensity,
  }
}
