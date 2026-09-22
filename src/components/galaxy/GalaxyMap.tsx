import { useState } from 'react'
import { StarField } from './StarField'
import type { WorldWithStatus } from '../../types/galaxy'
import { REGION_META } from '../../types/galaxy'

const VW = 1200
const VH = 760
const CX = VW / 2
const CY = VH / 2

// Raios das órbitas elípticas (rx, ry) por região
const ORBIT_RADII = [
  { rx: 160, ry: 100 },  // Setor Âncora
  { rx: 290, ry: 175 },  // Corredor Vivo
  { rx: 410, ry: 250 },  // Fronteira Cinzenta
  { rx: 510, ry: 310 },  // Limiar
]

function worldToSVG(coordX: number, coordY: number): [number, number] {
  return [
    50 + coordX * (VW - 100),
    50 + coordY * (VH - 100),
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
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="glow-planet">
            <feGaussianBlur stdDeviation="8" result="b"/>
            <feComposite in="SourceGraphic" in2="b" operator="over"/>
          </filter>
          <filter id="glow-soft">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feComposite in="SourceGraphic" in2="b" operator="over"/>
          </filter>
          <filter id="blur-fog">
            <feGaussianBlur stdDeviation="20"/>
          </filter>

          {/* Gradiente central — núcleo quente */}
          <radialGradient id="core-hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6"/>
            <stop offset="30%" stopColor="#4c1d95" stopOpacity="0.4"/>
            <stop offset="70%" stopColor="#1e1b4b" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#050810" stopOpacity="0"/>
          </radialGradient>

          {/* Clips circulares para imagens esféricas */}
          {worlds.map(w => {
            const [px, py] = worldToSVG(w.coord_x, w.coord_y)
            const pr = w.id === selectedWorldId ? 32 : hoveredId === w.id ? 29 : 26
            return (
              <clipPath key={`clip-${w.id}`} id={`clip-${w.id}`}>
                <circle cx={px} cy={py} r={pr}/>
              </clipPath>
            )
          })}

          {/* Névoa por região bloqueada */}
          {REGION_META.map((region) => {
            if (playerXP >= region.xp_required) return null
            return (
              <radialGradient key={`fg-${region.key}`} id={`fg-${region.key}`} cx="50%" cy="50%" r="50%">
                <stop offset="55%" stopColor="#060a14" stopOpacity="0"/>
                <stop offset="75%" stopColor="#060a14" stopOpacity="0.7"/>
                <stop offset="100%" stopColor="#060a14" stopOpacity="0.95"/>
              </radialGradient>
            )
          })}
        </defs>

        {/* Fundo: imagem de nebulosa gerada */}
        <image
          href="/assets/galaxy-bg.png"
          x="0" y="0" width={VW} height={VH}
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Fallback de fundo caso a imagem não exista ainda */}
        <rect width={VW} height={VH} fill="#060a14" opacity="0.3"/>

        {/* Estrelas */}
        <StarField width={VW} height={VH} count={180}/>

        {/* Núcleo central quente */}
        <ellipse cx={CX} cy={CY} rx={140} ry={90} fill="url(#core-hot)"/>
        <ellipse cx={CX} cy={CY} rx={60} ry={38} fill="#7c3aed" opacity="0.15" filter="url(#glow-planet)"/>
        <circle cx={CX} cy={CY} r={8} fill="#a78bfa" opacity="0.9" filter="url(#glow-planet)"/>

        {/* Órbitas elípticas por região */}
        {REGION_META.map((region, i) => {
          const isLocked = playerXP < region.xp_required
          const o = ORBIT_RADII[i]
          return (
            <ellipse
              key={region.key}
              cx={CX} cy={CY}
              rx={o.rx} ry={o.ry}
              fill="none"
              stroke={isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(45,212,191,0.15)'}
              strokeWidth={isLocked ? 0.5 : 0.8}
              strokeDasharray={isLocked ? '4 8' : '8 5'}
            />
          )
        })}

        {/* Névoa sobre regiões bloqueadas */}
        {REGION_META.map((region, i) => {
          if (playerXP >= region.xp_required) return null
          const o = ORBIT_RADII[i]
          const prev = i > 0 ? ORBIT_RADII[i-1] : { rx: 0, ry: 0 }
          return (
            <g key={`fog-${region.key}`}>
              <defs>
                <mask id={`fog-mask-${i}`}>
                  <ellipse cx={CX} cy={CY} rx={o.rx + 60} ry={o.ry + 40} fill="white"/>
                  {i > 0 && <ellipse cx={CX} cy={CY} rx={prev.rx - 10} ry={prev.ry - 10} fill="black"/>}
                </mask>
              </defs>
              <rect
                x={CX - o.rx - 70} y={CY - o.ry - 50}
                width={(o.rx + 70) * 2} height={(o.ry + 50) * 2}
                fill="#060a14"
                mask={`url(#fog-mask-${i})`}
                opacity="0.82"
              >
                <animate attributeName="opacity" values="0.78;0.88;0.78" dur="8s" repeatCount="indefinite"/>
              </rect>
              {/* Label da região bloqueada */}
              {i > 0 && (
                <text
                  x={CX}
                  y={CY - o.ry - 12}
                  textAnchor="middle"
                  fill="rgba(148,163,184,0.35)"
                  fontSize="10"
                  fontFamily="'Space Grotesk',sans-serif"
                  letterSpacing="2"
                >
                  {region.label.toUpperCase()} · {region.xp_required.toLocaleString()} XP
                </text>
              )}
            </g>
          )
        })}

        {/* Planetas */}
        {worlds.map(w => {
          const [px, py] = worldToSVG(w.coord_x, w.coord_y)
          const isSelected = w.id === selectedWorldId
          const isHovered = w.id === hoveredId
          const isLocked = w.status === 'locked'
          const isColonized = w.status === 'colonized'
          const isAvailable = w.status === 'available'
          const hasSphere = HAS_SPHERE.has(w.slug) && !isLocked
          const pr = isSelected ? 32 : isHovered ? 29 : 26
          const displayName = isLocked ? '???' : isColonized
            ? (w.playerWorld?.custom_name ?? w.name) : w.name

          return (
            <g
              key={w.id}
              style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
              onClick={() => !isLocked && onSelectWorld(w)}
              onMouseEnter={() => !isLocked && setHoveredId(w.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Halo de atmosfera */}
              {!isLocked && (
                <circle
                  cx={px} cy={py}
                  r={pr + (isSelected ? 18 : isHovered ? 14 : 10)}
                  fill={w.color_glow}
                  opacity={isSelected ? 0.35 : isHovered ? 0.25 : 0.15}
                  filter="url(#glow-planet)"
                >
                  {isAvailable && (
                    <animate attributeName="opacity"
                      values="0.12;0.22;0.12" dur="3s" repeatCount="indefinite"/>
                  )}
                </circle>
              )}

              {/* Anel de seleção */}
              {isSelected && (
                <>
                  <circle cx={px} cy={py} r={pr + 6} fill="none"
                    stroke={w.color_primary} strokeWidth="1.5" opacity="0.8"/>
                  <circle cx={px} cy={py} r={pr + 12} fill="none"
                    stroke={w.color_primary} strokeWidth="0.5" opacity="0.3"
                    strokeDasharray="4 3"/>
                </>
              )}

              {/* Anel dourado — colonizado */}
              {isColonized && (
                <circle cx={px} cy={py} r={pr + 5} fill="none"
                  stroke="#F59E0B" strokeWidth="1.5" opacity="0.7">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${px} ${py}`} to={`360 ${px} ${py}`}
                    dur="18s" repeatCount="indefinite"/>
                </circle>
              )}

              {/* Corpo do planeta */}
              {hasSphere ? (
                <>
                  {/* Sombra sob o planeta */}
                  <ellipse cx={px} cy={py + pr + 4} rx={pr * 0.7} ry={pr * 0.2}
                    fill="rgba(0,0,0,0.4)" filter="url(#blur-fog)"/>
                  <image
                    href={`/assets/planets/${w.slug}-esferico.png`}
                    x={px - pr} y={py - pr}
                    width={pr * 2} height={pr * 2}
                    clipPath={`url(#clip-${w.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  {/* Brilho de borda colorida */}
                  <circle cx={px} cy={py} r={pr} fill="none"
                    stroke={w.color_primary} strokeWidth="1.2" opacity="0.4"/>
                </>
              ) : (
                <>
                  <circle cx={px} cy={py} r={pr}
                    fill={isLocked ? '#0d1b2a' : w.color_primary}
                    opacity={isLocked ? 0.2 : 0.9}
                    filter={isLocked ? undefined : 'url(#glow-soft)'}
                  />
                  {isAvailable && (
                    <circle cx={px} cy={py} r={pr * 0.4}
                      fill="white" opacity="0.15"/>
                  )}
                </>
              )}

              {/* Cadeado em planetas bloqueados */}
              {isLocked && (
                <text x={px} y={py + 5} textAnchor="middle"
                  fill="rgba(148,163,184,0.3)" fontSize="16">🔒</text>
              )}

              {/* Nome */}
              <text
                x={px} y={py + pr + 16}
                textAnchor="middle"
                fill={isLocked ? 'rgba(148,163,184,0.25)' : isColonized ? '#f1f5f9' : '#94a3b8'}
                fontSize={isColonized ? '11' : '10'}
                fontFamily="'Space Grotesk',sans-serif"
                fontWeight={isColonized ? '600' : '400'}
              >
                {displayName}
              </text>

              {/* Dot de status */}
              {!isLocked && (
                <circle cx={px} cy={py + pr + 23} r="3"
                  fill={isColonized ? '#F59E0B' : '#2DD4BF'}
                  opacity="0.9"
                  filter="url(#glow-soft)"
                />
              )}
            </g>
          )
        })}

        {/* Labels das regiões desbloqueadas */}
        {REGION_META.map((region, i) => {
          if (playerXP < region.xp_required) return null
          const o = ORBIT_RADII[i]
          return (
            <text key={region.key}
              x={CX - o.rx + 10}
              y={CY - o.ry + 14}
              fill="rgba(45,212,191,0.3)"
              fontSize="9"
              fontFamily="'Space Grotesk',sans-serif"
              letterSpacing="1.5"
            >
              {region.label.toUpperCase()}
            </text>
          )
        })}

        {/* Legenda inferior esquerda */}
        <g transform={`translate(20, ${VH - 50})`}>
          {[
            { color: '#F59E0B', label: 'Colonizado' },
            { color: '#2DD4BF', label: 'Disponível' },
            { color: 'rgba(148,163,184,0.3)', label: 'Bloqueado' },
          ].map(({ color, label }, i) => (
            <g key={label} transform={`translate(${i * 110}, 0)`}>
              <circle cx="5" cy="5" r="4" fill={color}/>
              <text x="14" y="9" fill="rgba(148,163,184,0.6)"
                fontSize="9" fontFamily="'Space Grotesk',sans-serif">
                {label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
