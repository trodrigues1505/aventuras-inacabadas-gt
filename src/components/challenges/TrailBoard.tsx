import { useEffect, useMemo, useState } from 'react'
import { Check, Compass, Crosshair, EyeOff, Handshake, Microscope, Swords, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { APPROACH } from '../../data/challenges'
import { ATTRIBUTE_LABEL } from '../../data/crew'
import type { NodeState } from '../../services/expeditionRules'
import type { ApproachKey, Trail, TrailNode } from '../../types/challenges'

export const APPROACH_ICON: Record<ApproachKey, LucideIcon> = {
  combate: Swords,
  captura: Crosshair,
  furtividade: EyeOff,
  exploracao: Compass,
  pesquisa: Microscope,
  negociacao: Handshake,
}

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

const R = 26 // raio do nó
const PAD = 52
const GAP_ALONG = 132 // entre colunas (desktop) / entre linhas do caminho (celular)
const GAP_ACROSS = 92 // entre nós da mesma coluna

type Pt = { x: number; y: number }

function statusText(s: NodeState): string {
  if (s.status === 'won') return 'vencido'
  if (s.status === 'failed') return 'falhou'
  if (s.status === 'available') return 'disponível'
  return s.cleared ? 'já vencido antes' : 'bloqueado'
}

/**
 * Tabuleiro da trilha. Desktop: colunas da esquerda para a direita.
 * Celular: uma coluna por linha, de cima para baixo (sem rolagem lateral).
 * Todo nó é selecionável para leitura; só os "disponíveis" podem ser rolados
 * (isso é decidido por quem usa o tabuleiro, não por ele).
 */
export function TrailBoard({
  trail,
  states,
  visitedOrder,
  selectedId,
  onSelect,
}: {
  trail: Trail
  states: Record<string, NodeState>
  /** ids na ordem em que a equipe passou. */
  visitedOrder: string[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const horizontal = useMedia('(min-width: 768px)')
  const reduced = useMedia('(prefers-reduced-motion: reduce)')

  const layout = useMemo(() => {
    const cols = Math.max(...trail.nodes.map((n) => n.col)) + 1
    const size: number[] = Array(cols).fill(0)
    trail.nodes.forEach((n) => (size[n.col] += 1))
    const across = Math.max(...size)
    const along = (cols - 1) * GAP_ALONG
    const span = (across - 1) * GAP_ACROSS
    const W = PAD * 2 + (horizontal ? along : span)
    const H = PAD * 2 + (horizontal ? span : along) + 14
    const pos = new Map<string, Pt>()
    for (const n of trail.nodes) {
      const off = (n.row - (size[n.col] - 1) / 2) * GAP_ACROSS
      pos.set(
        n.id,
        horizontal
          ? { x: PAD + n.col * GAP_ALONG, y: (H - 14) / 2 + off }
          : { x: W / 2 + off, y: PAD + n.col * GAP_ALONG },
      )
    }
    return { W, H, pos }
  }, [trail, horizontal])

  const entry = trail.nodes.find((n) => n.col === 0)?.id
  const walked = new Set<string>()
  for (let i = 0; i + 1 < visitedOrder.length; i++) walked.add(`${visitedOrder[i]}>${visitedOrder[i + 1]}`)
  const currentId = visitedOrder[visitedOrder.length - 1]

  function edgePath(a: Pt, b: Pt): string {
    return horizontal
      ? `M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`
      : `M ${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`
  }

  function nodeClasses(s: NodeState): { circle: string; icon: string; dash?: string } {
    if (s.status === 'won') return { circle: 'fill-good/10 stroke-good', icon: 'text-good' }
    if (s.status === 'failed') return { circle: 'fill-bad/10 stroke-bad', icon: 'text-bad' }
    if (s.status === 'available') return { circle: 'fill-surface stroke-azure', icon: 'text-azure' }
    if (s.cleared) return { circle: 'fill-good/5 stroke-good/60', icon: 'text-good/70', dash: '4 3' }
    return { circle: 'fill-raised stroke-line', icon: 'text-faint' }
  }

  return (
    <div className="rounded-[14px] bg-raised/60 p-2 md:p-4">
      <svg
        viewBox={`0 0 ${layout.W} ${layout.H}`}
        role="group"
        aria-label="Mapa da trilha da expedição"
        className="mx-auto block h-auto w-full"
        style={{ maxWidth: layout.W * 1.15 }}
      >
        {/* ligações */}
        {trail.edges.map(([a, b]) => {
          const pa = layout.pos.get(a)!
          const pb = layout.pos.get(b)!
          const done = walked.has(`${a}>${b}`)
          const open = a === currentId && states[b]?.status === 'available'
          const first = !currentId && a === entry && states[b]?.status === 'available'
          return (
            <path
              key={`${a}>${b}`}
              d={edgePath(pa, pb)}
              fill="none"
              strokeLinecap="round"
              className={done ? 'stroke-azure' : open || first ? 'stroke-azure/60' : 'stroke-line'}
              strokeWidth={done ? 3 : 2}
              strokeDasharray={open || first ? '5 5' : undefined}
            />
          )
        })}

        {/* nós */}
        {trail.nodes.map((n: TrailNode) => {
          const p = layout.pos.get(n.id)!
          const s = states[n.id]
          const cls = nodeClasses(s)
          const Icon = APPROACH_ICON[n.approach]
          const selected = selectedId === n.id
          const isFinal = n.id === trail.final
          const isEntry = n.id === entry
          const label = `${APPROACH[n.approach].label}, usa ${ATTRIBUTE_LABEL[n.attr]}${
            isFinal ? ', destino' : isEntry ? ', entrada' : ''
          }, ${statusText(s)}`
          return (
            <g
              key={n.id}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={selected}
              className="cursor-pointer outline-none [&:focus-visible>circle:first-of-type]:stroke-azure-deep"
              onClick={() => onSelect(n.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(n.id)
                }
              }}
            >
              {/* área de toque generosa */}
              <circle cx={p.x} cy={p.y} r={R + 14} fill="transparent" />
              {s.status === 'available' && !reduced && (
                <circle cx={p.x} cy={p.y} r={R + 5} fill="none" className="stroke-azure" strokeWidth={2}>
                  <animate attributeName="r" values={`${R + 3};${R + 9};${R + 3}`} dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0;0.55" dur="2.2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={R}
                strokeWidth={s.current ? 3.5 : 2}
                strokeDasharray={cls.dash}
                className={`${cls.circle} transition-colors duration-150`}
              />
              {selected && (
                <circle cx={p.x} cy={p.y} r={R + 6} fill="none" className="stroke-azure-deep" strokeWidth={2} />
              )}
              <Icon x={p.x - 11} y={p.y - 11} width={22} height={22} className={cls.icon} aria-hidden />

              {/* selo de resultado */}
              {(s.status === 'won' || s.status === 'failed') && (
                <g>
                  <circle cx={p.x + 19} cy={p.y - 19} r={9} className={s.status === 'won' ? 'fill-good' : 'fill-bad'} />
                  {s.status === 'won' ? (
                    <Check x={p.x + 14} y={p.y - 24} width={10} height={10} className="text-white" strokeWidth={3} aria-hidden />
                  ) : (
                    <X x={p.x + 14} y={p.y - 24} width={10} height={10} className="text-white" strokeWidth={3} aria-hidden />
                  )}
                </g>
              )}

              <text
                x={p.x}
                y={p.y + R + 16}
                textAnchor="middle"
                className="fill-muted"
                style={{ fontSize: 11, fontWeight: 500 }}
              >
                {ATTRIBUTE_LABEL[n.attr]}
              </text>
              {(isFinal || isEntry) && (
                <text
                  x={p.x}
                  y={p.y - R - 9}
                  textAnchor="middle"
                  className={isFinal ? 'fill-azure-deep' : 'fill-faint'}
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}
                >
                  {isFinal ? 'DESTINO' : 'ENTRADA'}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
