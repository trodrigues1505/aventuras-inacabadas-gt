// ============================================================
// GalaxyMap — mapa SVG interativo
// SVG 100% responsivo via CSS — sem JS de resize
// ============================================================

import { useState } from 'react'
import { StarField } from './StarField'
import type { WorldWithStatus } from '../../types/galaxy'
import { REGION_META } from '../../types/galaxy'

const VW = 800
const VH = 800
const CX = VW / 2
const CY = VH / 2
const REGION_RADII = [140, 240, 340, 380]

function worldToSVG(coordX: number, coordY: number): [number, number] {
  return [
    CX - VW * 0.45 + coordX * VW * 0.9,
    CY - VH * 0.45 + coordY * VH * 0.9,
  ]
}

const HAS_IMAGE = new Set(['varda', 'thalassa', 'zerion', 'kestrel', 'nyx'])

interface GalaxyMapProps {
  worlds: WorldWithStatus[]
  playerXP: number
  onSelectWorld: (world: WorldWithStatus) => void
  selectedWorldId?: string
}

export function GalaxyMap({ worlds, playerXP, onSelectWorld, selectedWorldId }: GalaxyMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    // Container absoluto que preenche o pai — o SVG se adapta via CSS
    <div className="absolute inset-0 flex items-center justify-center">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{
          // Preenche o menor lado do container mantendo aspecto quadrado
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow-sm"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
          <filter id="glow-md"><feGaussianBlur stdDeviation="7" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>

          {/* Clip circular para imagens dos planetas */}
          {worlds.map(w => {
            const [px, py] = worldToSVG(w.coord_x, w.coord_y)
            const r = w.id === selectedWorldId ? 13 : hoveredId === w.id ? 12 : 10
            return (
              <clipPath key={`clip-${w.id}`} id={`clip-planet-${w.id}`}>
                <circle cx={px} cy={py} r={r} />
              </clipPath>
            )
          })}

          {/* Gradiente central */}
          <radialGradient id="core-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.5"/>
            <stop offset="40%" stopColor="#1e1b4b" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#050810" stopOpacity="0"/>
          </radialGradient>

          {/* Névoas */}
          {REGION_META.map((region, i) => {
            if (playerXP >= region.xp_required) return null
            const innerR = i === 0 ? 0 : REGION_RADII[i - 1]
            const outerR = REGION_RADII[i] + 50
            return (
              <radialGradient key={`fog-grad-${region.key}`} id={`fog-grad-${region.key}`} cx="50%" cy="50%" r="50%">
                <stop offset={`${Math.max(0, (innerR / outerR) * 100 - 5)}%`} stopColor="#080c18" stopOpacity="0" />
                <stop offset={`${Math.min((innerR / outerR) * 100 + 20, 82)}%`} stopColor="#080c18" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#050810" stopOpacity="0.97" />
              </radialGradient>
            )
          })}
        </defs>

        {/* Fundo */}
        <rect width={VW} height={VH} fill="#050810" />

        {/* Estrelas */}
        <StarField width={VW} height={VH} count={200} />

        {/* Núcleo */}
        <circle cx={CX} cy={CY} r={170} fill="url(#core-grad)" />

        {/* Anéis */}
        {REGION_META.map((region, i) => {
          const r = REGION_RADII[i]
          const isLocked = playerXP < region.xp_required
          return (
            <g key={region.key}>
              <circle cx={CX} cy={CY} r={r} fill="none"
                stroke={isLocked ? 'rgba(30,45,71,0.6)' : 'rgba(45,212,191,0.2)'}
                strokeWidth={isLocked ? 0.5 : 0.8}
                strokeDasharray={isLocked ? '3 7' : '6 4'}
              />
              {!isLocked && (
                <text x={CX} y={CY - r + 13} textAnchor="middle"
                  fill="rgba(45,212,191,0.35)" fontSize="8"
                  fontFamily="'Space Grotesk',sans-serif" letterSpacing="2"
                >
                  {region.label.toUpperCase()}
                </text>
              )}
            </g>
          )
        })}

        {/* Névoas das regiões bloqueadas */}
        {REGION_META.map((region, i) => {
          if (playerXP >= region.xp_required) return null
          const innerR = i === 0 ? 0 : REGION_RADII[i - 1]
          const outerR = REGION_RADII[i] + 50
          return (
            <g key={`fog-${region.key}`}>
              <defs>
                <mask id={`fog-mask-${region.key}`}>
                  <circle cx={CX} cy={CY} r={outerR} fill="white" />
                  {i > 0 && <circle cx={CX} cy={CY} r={Math.max(0, innerR - 8)} fill="black" />}
                </mask>
              </defs>
              <circle cx={CX} cy={CY} r={outerR}
                fill={`url(#fog-grad-${region.key})`}
                mask={`url(#fog-mask-${region.key})`}
              >
                <animate attributeName="opacity" values="0.9;0.97;0.9" dur="7s" repeatCount="indefinite" />
              </circle>
              {i > 0 && (
                <text x={CX} y={CY - (innerR + (REGION_RADII[i] - innerR) * 0.45)}
                  textAnchor="middle" fill="rgba(42,58,85,0.8)" fontSize="9.5"
                  fontFamily="'Space Grotesk',sans-serif" letterSpacing="1"
                >
                  {region.label.toUpperCase()} — {region.xp_required.toLocaleString()} XP
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
          const hasImg = HAS_IMAGE.has(w.slug) && !isLocked
          const pr = isSelected ? 13 : isHovered ? 12 : 10
          const displayName = isLocked ? '???' : isColonized
            ? (w.playerWorld?.custom_name ?? w.name) : w.name

          return (
            <g key={w.id}
              style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
              onClick={() => !isLocked && onSelectWorld(w)}
              onMouseEnter={() => !isLocked && setHoveredId(w.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Halo */}
              {!isLocked && (
                <circle cx={px} cy={py} r={pr + (isSelected ? 14 : 8)}
                  fill={w.color_glow}
                  opacity={isSelected ? 0.3 : isHovered ? 0.2 : 0.1}
                  filter="url(#glow-md)"
                >
                  {isAvailable && (
                    <animate attributeName="r" values={`${pr+7};${pr+13};${pr+7}`} dur="2.5s" repeatCount="indefinite" />
                  )}
                </circle>
              )}

              {/* Anel de seleção */}
              {isSelected && (
                <circle cx={px} cy={py} r={pr + 5} fill="none"
                  stroke={w.color_primary} strokeWidth="1" opacity="0.7" />
              )}

              {/* Anel dourado — colonizado */}
              {isColonized && (
                <circle cx={px} cy={py} r={pr + 4} fill="none" stroke="#F59E0B" strokeWidth="1.2" opacity="0.65">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${px} ${py}`} to={`360 ${px} ${py}`} dur="20s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Corpo */}
              {hasImg ? (
                <>
                  <image
                    href={`/assets/planets/${w.slug}-card.png`}
                    x={px - pr} y={py - pr} width={pr * 2} height={pr * 2}
                    clipPath={`url(#clip-planet-${w.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  <circle cx={px} cy={py} r={pr} fill="none" stroke={w.color_primary} strokeWidth="1" opacity="0.5" />
                </>
              ) : (
                <circle cx={px} cy={py} r={pr}
                  fill={isLocked ? '#1a2740' : w.color_primary}
                  opacity={isLocked ? 0.25 : 1}
                  filter={isLocked ? undefined : 'url(#glow-sm)'}
                >
                  {isAvailable && (
                    <animate attributeName="r" values={`${pr};${pr*1.12};${pr}`} dur="2s" repeatCount="indefinite" />
                  )}
                </circle>
              )}

              {/* Label */}
              <text x={px} y={py + pr + 14} textAnchor="middle"
                fill={isLocked ? '#2a3a55' : isColonized ? '#e2e8f0' : '#94a3b8'}
                fontSize={isColonized ? '9.5' : '8.5'}
                fontFamily="'Space Grotesk',sans-serif"
                fontWeight={isColonized ? '600' : '400'}
                opacity={isLocked ? 0.35 : 1}
              >
                {displayName}
              </text>

              {/* Dot de status */}
              {!isLocked && (
                <circle cx={px} cy={py + pr + 21} r="2.5"
                  fill={isColonized ? '#F59E0B' : '#2DD4BF'} opacity="0.8" />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
