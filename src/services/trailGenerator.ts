// ============================================================
// FASE 6 — gerador de trilha (funções PURAS, RNG semeado)
//
// Mesma semente + mesma entrada = mesma trilha (o id do desafio
// é a semente). O servidor NÃO confia neste gerador: revalida a
// forma da trilha em _validate_graph (fase6.sql). Os testes
// alimentam o validador do Postgres com trilhas geradas aqui.
//
// Regras da forma
//   • 1 nó de entrada (coluna 0) e 1 nó final (última coluna)
//   • ligações só entre colunas vizinhas; cada nó leva ao final
//   • no máximo 3 saídas por nó
//   • caminho mais curto = nº de colunas (sempre ≥ 4)
//   • nós: 5–6 (int. 1) · 7–8 (int. 2) · 8–10 (int. 3)
// Moldes: paralelo (raias lado a lado), funil (abre e converge),
// trilha longa (quase linear, com desvios).
// ============================================================

import { APPROACH, TRAIL_CROSS_LINK_CHANCE, TRAIL_NODES } from '../data/challenges'
import { NODE_TEXT, isBiomeSlug, type BiomeSlug } from '../data/trailTexts'
import type { ApproachKey, Trail, TrailMold, TrailNode } from '../types/challenges'

export type Rng = () => number

/** FNV-1a de 32 bits: transforma a semente de texto num número. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32: gerador pequeno, rápido e determinístico. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
const pick = <T,>(rng: Rng, list: T[]): T => list[Math.floor(rng() * list.length)]

function shuffle<T>(rng: Rng, list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Moldes: tamanho de cada coluna ──────────────────────────

/** Raias lado a lado: [1, L, L, …, 1] com L ∈ {2,3} raias. */
function parallelColumns(n: number, rng: Rng): number[] | null {
  const options: number[][] = []
  for (const lanes of [2, 3]) {
    const rest = n - 2
    if (rest >= lanes && rest % lanes === 0) {
      options.push([1, ...Array<number>(rest / lanes).fill(lanes), 1])
    }
  }
  return options.length ? pick(rng, options) : null
}

/** Abre em leque e converge: [1, ≥2, …não-crescente…, 1]. */
function funnelColumns(n: number, rng: Rng): number[] | null {
  const middle = n - 2
  const out: number[][] = []
  const walk = (left: number, last: number, acc: number[]) => {
    if (left === 0) {
      if (acc.length >= 2 && acc.length <= 4 && acc[0] >= 2) out.push([...acc])
      return
    }
    if (acc.length >= 4) return
    for (let part = Math.min(last, left, 3); part >= 1; part--) {
      walk(left - part, part, [...acc, part])
    }
  }
  walk(middle, 3, [])
  return out.length ? [1, ...pick(rng, out), 1] : null
}

/** Quase linear, com 1 ou 2 desvios de 2 nós. */
function longColumns(n: number, rng: Rng): number[] {
  const forks = n >= 8 && rng() < 0.5 ? 2 : 1
  const cols = n - forks
  const cells: number[] = Array<number>(cols).fill(1)
  const interior = Array.from({ length: cols - 2 }, (_, i) => i + 1)
  const first = pick(rng, interior)
  cells[first] = 2
  if (forks === 2) {
    const far = interior.filter((i) => Math.abs(i - first) > 1)
    cells[far.length ? pick(rng, far) : first] = 2
  }
  // se não achou lugar para o 2º desvio, conserta a soma no 1º
  const sum = cells.reduce((a, b) => a + b, 0)
  if (sum !== n) cells[first] += n - sum
  return cells
}

// ─── Ligações ────────────────────────────────────────────────

const MAX_OUT = 3

function linkColumns(
  prev: string[],
  next: string[],
  rng: Rng,
  edges: [string, string][],
  outDeg: Map<string, number>,
) {
  const have = new Set(edges.map((e) => `${e[0]}>${e[1]}`))
  const add = (a: string, b: string): boolean => {
    const key = `${a}>${b}`
    if (have.has(key) || (outDeg.get(a) ?? 0) >= MAX_OUT) return false
    edges.push([a, b])
    have.add(key)
    outDeg.set(a, (outDeg.get(a) ?? 0) + 1)
    return true
  }
  const p = prev.length
  const q = next.length

  // todo nó da coluna seguinte recebe pelo menos uma ligação…
  for (let j = 0; j < q; j++) {
    const i = q === 1 || p === 1 ? 0 : Math.round((j * (p - 1)) / (q - 1))
    add(prev[i], next[j])
  }
  // …e todo nó desta coluna tem pelo menos uma saída
  for (let i = 0; i < p; i++) {
    if ((outDeg.get(prev[i]) ?? 0) === 0) {
      const j = p === 1 || q === 1 ? 0 : Math.round((i * (q - 1)) / (p - 1))
      add(prev[i], next[j])
    }
  }
  // cruzamento extra: mais de um caminho possível
  if (p >= 2 && q >= 2 && rng() < TRAIL_CROSS_LINK_CHANCE) {
    add(pick(rng, prev), pick(rng, next))
  }
}

// ─── Gerador ─────────────────────────────────────────────────

export type TrailInput = {
  /** Semente de texto — use o id do desafio. */
  seed: string
  intensity: number
  /** As abordagens que o desafio oferece (2 a 3). */
  approaches: ApproachKey[]
  /** slug do planeta fixo; desconhecido cai em 'nyx'. */
  biome: string | null
}

export function generateTrail(input: TrailInput): Trail {
  const rng = mulberry32(hashSeed(input.seed))
  const [min, max] = TRAIL_NODES[Math.min(3, Math.max(1, input.intensity))]
  const n = int(rng, min, max)

  // escolhe o primeiro molde (em ordem sorteada) que consegue fechar em n nós
  const builders: Record<TrailMold, (n: number, r: Rng) => number[] | null> = {
    parallel: parallelColumns,
    funnel: funnelColumns,
    long: longColumns,
  }
  let mold: TrailMold = 'long'
  let columns: number[] | null = null
  for (const m of shuffle<TrailMold>(rng, ['parallel', 'funnel', 'long'])) {
    columns = builders[m](n, rng)
    if (columns) {
      mold = m
      break
    }
  }
  if (!columns) columns = longColumns(n, rng)

  // ids n1, n2… na ordem coluna → linha
  const cols: string[][] = []
  let serial = 0
  for (const size of columns) {
    cols.push(Array.from({ length: size }, () => `n${++serial}`))
  }

  const edges: [string, string][] = []
  const outDeg = new Map<string, number>()
  for (let c = 0; c < cols.length - 1; c++) linkColumns(cols[c], cols[c + 1], rng, edges, outDeg)

  // abordagens: ciclos embaralhados garantem que todas apareçam
  const bag: ApproachKey[] = []
  while (bag.length < serial) bag.push(...shuffle(rng, input.approaches))

  const biome: BiomeSlug = isBiomeSlug(input.biome) ? input.biome : 'nyx'
  const usedText = new Set<string>()
  const nodes: TrailNode[] = []
  let k = 0
  cols.forEach((ids, col) => {
    ids.forEach((id, row) => {
      const approach = bag[k++]
      const variants = NODE_TEXT[approach][biome]
      const fresh = variants.filter((t) => !usedText.has(t))
      const text = pick(rng, fresh.length ? fresh : variants)
      usedText.add(text)
      nodes.push({ id, col, row, approach, attr: APPROACH[approach].attr, text })
    })
  })

  return {
    version: 1,
    seed: input.seed,
    mold,
    nodes,
    edges,
    final: cols[cols.length - 1][0],
  }
}
