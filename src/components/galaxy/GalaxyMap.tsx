import { useState } from 'react'
import { StarField } from './StarField'
import type { WorldWithStatus } from '../../types/galaxy'
import { REGION_META } from '../../types/galaxy'

const VW = 1000
const VH = 700
const CX = VW / 2
const CY = VH / 2

// Órbitas elípticas — rx horizontal, ry vertical
const ORBITS = [
  { rx: 150, ry: 95  },   // Setor Âncora
  { rx: 265, ry: 168 },   // Corredor Vivo
  { rx: 370, ry: 235 },   // Fronteira Cinzenta
  { rx: 460, ry: 292 },   // Limiar
]

function worldToSVG(coordX: number, coordY: number): [number, number] {
  return [
    60 + coordX * (VW - 120),
    60 + coordY * (VH - 120),
  ]
}

const HAS_SPHERE = new Set(['varda', 'thalassa', 'zerion', 'kestrel', 'nyx'])

interface GalaxyMapProps {
  worlds: WorldWithStatus[]
  playerXP: number
  onSelectWorld: (world: WorldWithStatus) => void
  selectedWorldId?: string
}

export function GalaxyMap({ worlds, playerXP, onSelectWorld, selectedWorldId }: GalaxyMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="absolute inset-0">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow-lg">
            <feGaussianBlur stdDeviation="10" result="b"/>
            <feComposite in="SourceGraphic" in2="b" operator="over"/>
          </filter>
          <filter id="glow-sm">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feComposite in="SourceGraphic" in2="b" operator="over"/>
          </filter>

          {/* Gradiente do núcleo central */}
          <radialGradient id="core-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.7"/>
            <stop offset="35%"  stopColor="#4c1d95" stopOpacity="0.5"/>
            <stop offset="70%"  stopColor="#1e1b4b" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#060a14" stopOpacity="0"/>
          </radialGradient>

          {/* Gradiente do fundo estelar */}
          <radialGradient id="space-grad" cx="50%" cy="45%" r="60%">
            <stop offset="0%"   stopColor="#0f0c29" stopOpacity="1"/>
            <stop offset="50%"  stopColor="#090818" stopOpacity="1"/>
            <stop offset="100%" stopColor="#060a14" stopOpacity="1"/>
          </radialGradient>

          {/* Névoa lateral — simula profundidade da nebulosa */}
          <radialGradient id="nebula-left" cx="0%" cy="50%" r="60%">
            <stop offset="0%"   stopColor="#1e3a5f" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#060a14" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="nebula-right" cx="100%" cy="60%" r="50%">
            <stop offset="0%"   stopColor="#3b1f6e" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#060a14" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="nebula-top" cx="60%" cy="0%" r="50%">
            <stop offset="0%"   stopColor="#1a2f5e" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#060a14" stopOpacity="0"/>
          </radialGradient>

          {/* Clips para imagens esféricas */}
          {worlds.map(w => {
            const [px, py] = worldToSVG(w.coord_x, w.coord_y)
            const pr = w.id === selectedWorldId ? 30 : hoveredId === w.id ? 27 : 24
            return (
              <clipPath key={`clip-${w.id}`} id={`clip-${w.id}`}>
                <circle cx={px} cy={py} r={pr}/>
              </clipPath>
            )
          })}

          {/* Névoa das regiões bloqueadas — máscara suave */}
          {REGION_META.map((region, i) => {
            if (playerXP >= region.xp_required) return null
            const o = ORBITS[i]
            const prev = i > 0 ? ORBITS[i - 1] : { rx: 0, ry: 0 }
            return (
              <radialGradient key={`fog-grad-${i}`} id={`fog-grad-${i}`} cx="50%" cy="50%" r="50%">
                <stop offset={`${Math.round((prev.rx / (o.rx + 40)) * 90)}%`} stopColor="#060a14" stopOpacity="0"/>
                <stop offset={`${Math.round((prev.rx / (o.rx + 40)) * 90 + 12)}%`} stopColor="#060a14" stopOpacity="0.65"/>
                <stop offset="100%" stopColor="#060a14" stopOpacity="0.9"/>
              </radialGradient>
            )
          })}
        </defs>

        {/* ── Fundo ──────────────────────────────────────────── */}
        <rect width={VW} height={VH} fill="url(#space-grad)"/>

        {/* Imagem de nebulosa gerada — quando existir */}
        <image href="/assets/galaxy-bg.png" x="0" y="0" width={VW} height={VH}
          preserveAspectRatio="xMidYMid slice" opacity="0.85"/>

        {/* Névoas de cor para dar profundidade sem o PNG */}
        <rect width={VW} height={VH} fill="url(#nebula-left)"/>
        <rect width={VW} height={VH} fill="url(#nebula-right)"/>
        <rect width={VW} height={VH} fill="url(#nebula-top)"/>

        {/* Estrelas */}
        <StarField width={VW} height={VH} count={160}/>

        {/* ── Órbitas elípticas ──────────────────────────────── */}
        {REGION_META.map((region, i) => {
          const isLocked = playerXP < region.xp_required
          const o = ORBITS[i]
          return (
            <ellipse key={region.key}
              cx={CX} cy={CY} rx={o.rx} ry={o.ry}
              fill="none"
              stroke={isLocked ? 'rgba(255,255,255,0.06)' : 'rgba(45,212,191,0.18)'}
              strokeWidth={isLocked ? 0.6 : 1}
              strokeDasharray={isLocked ? '3 9' : '6 5'}
            />
          )
        })}

        {/* ── Névoa sobre regiões bloqueadas ─────────────────── */}
        {REGION_META.map((region, i) => {
          if (playerXP >= region.xp_required) return null
          const o = ORBITS[i]
          const prev = i > 0 ? ORBITS[i - 1] : { rx: 0, ry: 0 }

          return (
            <g key={`fog-${i}`}>
              <defs>
                {/* Máscara em forma de anel elíptico */}
                <mask id={`fog-mask-${i}`}>
                  <ellipse cx={CX} cy={CY} rx={o.rx + 55} ry={o.ry + 40} fill="white"/>
                  {i > 0 && (
                    <ellipse cx={CX} cy={CY} rx={prev.rx - 5} ry={prev.ry - 5} fill="black"/>
                  )}
                </mask>
              </defs>

              {/* Névoa suave — só opacidade moderada, não sólida */}
              <ellipse cx={CX} cy={CY} rx={o.rx + 55} ry={o.ry + 40}
                fill="#060a14"
                mask={`url(#fog-mask-${i})`}
                opacity="0.72"
              >
                <animate attributeName="opacity" values="0.65;0.78;0.65" dur="7s" repeatCount="indefinite"/>
              </ellipse>

              {/* Label da região bloqueada */}
              {i > 0 && (
                <text x={CX} y={CY - o.ry - 10}
                  textAnchor="middle"
                  fill="rgba(148,163,184,0.3)"
                  fontSize="9.5"
                  fontFamily="'Space Grotesk',sans-serif"
                  letterSpacing="2"
                >
                  {region.label.toUpperCase()} · {region.xp_required.toLocaleString()} XP
                </text>
              )}
            </g>
          )
        })}

        {/* ── Núcleo central ─────────────────────────────────── */}
        <ellipse cx={CX} cy={CY} rx={120} ry={76} fill="url(#core-grad)"/>
        <ellipse cx={CX} cy={CY} rx={45}  ry={28} fill="#7c3aed" opacity="0.2" filter="url(#glow-lg)"/>
        <circle  cx={CX} cy={CY} r={6}  fill="#c4b5fd" opacity="0.95" filter="url(#glow-sm)"/>

        {/* ── Planetas ───────────────────────────────────────── */}
        {worlds.map(w => {
          const [px, py] = worldToSVG(w.coord_x, w.coord_y)
          const isSelected  = w.id === selectedWorldId
          const isHovered   = w.id === hoveredId
          const isLocked    = w.status === 'locked'
          const isColonized = w.status === 'colonized'
          const isAvailable = w.status === 'available'
          const hasSphere   = HAS_SPHERE.has(w.slug) && !isLocked
          const pr          = isSelected ? 30 : isHovered ? 27 : 24
          const displayName = isLocked ? '???' : isColonized
            ? (w.playerWorld?.custom_name ?? w.name) : w.name

          return (
            <g key={w.id}
              style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
              onClick={() => !isLocked && onSelectWorld(w)}
              onMouseEnter={() => !isLocked && setHoveredId(w.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Atmosfera / halo */}
              {!isLocked && (
                <circle cx={px} cy={py}
                  r={pr + (isSelected ? 16 : isHovered ? 12 : 8)}
                  fill={w.color_glow}
                  opacity={isSelected ? 0.3 : isHovered ? 0.2 : 0.12}
                  filter="url(#glow-lg)"
                >
                  {isAvailable && (
                    <animate attributeName="opacity"
                      values="0.1;0.2;0.1" dur="2.8s" repeatCount="indefinite"/>
                  )}
                </circle>
              )}

              {/* Anel de seleção */}
              {isSelected && (
                <>
                  <circle cx={px} cy={py} r={pr + 5} fill="none"
                    stroke={w.color_primary} strokeWidth="1.5" opacity="0.75"/>
                  <circle cx={px} cy={py} r={pr + 11} fill="none"
                    stroke={w.color_primary} strokeWidth="0.5" opacity="0.3"
                    strokeDasharray="3 4"/>
                </>
              )}

              {/* Anel dourado — colonizado */}
              {isColonized && (
                <circle cx={px} cy={py} r={pr + 5} fill="none"
                  stroke="#F59E0B" strokeWidth="1.5" opacity="0.65">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${px} ${py}`} to={`360 ${px} ${py}`}
                    dur="18s" repeatCount="indefinite"/>
                </circle>
              )}

              {/* Corpo do planeta */}
              {hasSphere ? (
                <>
                  <image
                    href={`/assets/planets/${w.slug}-esferico.png`}
                    x={px - pr} y={py - pr}
                    width={pr * 2} height={pr * 2}
                    clipPath={`url(#clip-${w.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  <circle cx={px} cy={py} r={pr} fill="none"
                    stroke={w.color_primary} strokeWidth="1" opacity="0.35"/>
                </>
              ) : (
                <circle cx={px} cy={py} r={pr}
                  fill={isLocked ? '#0d1420' : w.color_primary}
                  opacity={isLocked ? 0.18 : 0.85}
                  filter={isLocked ? undefined : 'url(#glow-sm)'}
                />
              )}

              {/* Ícone de cadeado */}
              {isLocked && (
                <text x={px} y={py + 5}
                  textAnchor="middle"
                  fill="rgba(148,163,184,0.25)"
                  fontSize="14">🔒</text>
              )}

              {/* Nome */}
              <text x={px} y={py + pr + 15}
                textAnchor="middle"
                fill={isLocked ? 'rgba(148,163,184,0.22)' : isColonized ? '#f1f5f9' : '#94a3b8'}
                fontSize={isColonized ? '11' : '10'}
                fontFamily="'Space Grotesk',sans-serif"
                fontWeight={isColonized ? '600' : '400'}
              >
                {displayName}
              </text>

              {/* Dot de status */}
              {!isLocked && (
                <circle cx={px} cy={py + pr + 22} r="2.8"
                  fill={isColonized ? '#F59E0B' : '#2DD4BF'}
                  opacity="0.9"
                  filter="url(#glow-sm)"
                />
              )}
            </g>
          )
        })}

        {/* ── Labels das regiões desbloqueadas ───────────────── */}
        {REGION_META.map((region, i) => {
          if (playerXP < region.xp_required) return null
          const o = ORBITS[i]
          return (
            <text key={region.key}
              x={CX - o.rx + 8}
              y={CY - o.ry + 13}
              fill="rgba(45,212,191,0.28)"
              fontSize="8.5"
              fontFamily="'Space Grotesk',sans-serif"
              letterSpacing="1.5"
            >
              {region.label.toUpperCase()}
            </text>
          )
        })}

        {/* ── Legenda ────────────────────────────────────────── */}
        <g transform={`translate(18, ${VH - 42})`}>
          {[
            { color: '#F59E0B', label: 'Colonizado' },
            { color: '#2DD4BF', label: 'Disponível' },
            { color: 'rgba(148,163,184,0.28)', label: 'Bloqueado' },
          ].map(({ color, label }, i) => (
            <g key={label} transform={`translate(${i * 110}, 0)`}>
              <circle cx="5" cy="5" r="3.5" fill={color}/>
              <text x="13" y="9"
                fill="rgba(148,163,184,0.55)"
                fontSize="9"
                fontFamily="'Space Grotesk',sans-serif">
                {label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
