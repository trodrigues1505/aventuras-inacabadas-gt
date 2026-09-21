// ============================================================
// GalaxyMap — mapa estelar SVG interativo
// Regiões concêntricas, névoa por XP, planetas clicáveis
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { StarField } from './StarField'
import type { WorldWithStatus } from '../../types/galaxy'
import { REGION_META } from '../../types/galaxy'

// Dimensões internas do SVG (viewBox)
const VW = 800
const VH = 800
const CX = VW / 2
const CY = VH / 2

// Raios das 4 regiões concêntricas
const REGION_RADII = [140, 240, 340, 380]

// Mapa de região → índice para calcular o raio
const REGION_IDX: Record<string, number> = {
  'setor-ancora': 0,
  'corredor-vivo': 1,
  'fronteira-cinzenta': 2,
  'limiar': 3,
}

// Converter coord_x / coord_y (0–1) para posição no SVG
// O mapa usa um layout polar suavizado para dar sensação de galáxia
function worldToSVG(coordX: number, coordY: number): [number, number] {
  return [
    CX - VW * 0.45 + coordX * VW * 0.9,
    CY - VH * 0.45 + coordY * VH * 0.9,
  ]
}

interface GalaxyMapProps {
  worlds: WorldWithStatus[]
  playerXP: number
  onSelectWorld: (world: WorldWithStatus) => void
  selectedWorldId?: string
}

export function GalaxyMap({
  worlds,
  playerXP,
  onSelectWorld,
  selectedWorldId,
}: GalaxyMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Escala para garantir que o SVG não exceda a altura disponível
  const [svgSize, setSvgSize] = useState({ w: VW, h: VH })

  useEffect(() => {
    const updateSize = () => {
      if (!svgRef.current) return
      const container = svgRef.current.parentElement
      if (!container) return
      const available = Math.min(container.clientWidth, container.clientHeight, 680)
      setSvgSize({ w: available, h: available })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        width={svgSize.w}
        height={svgSize.h}
        style={{ overflow: 'visible' }}
        aria-label="Mapa da galáxia"
      >
        <defs>
          {/* Filtro de glow para planetas */}
          <filter id="glow-sm">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-md">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-lg">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Névoas por região — radial gradients */}
          {REGION_META.map((region, i) => {
            const isLocked = playerXP < region.xp_required
            if (!isLocked) return null
            const r = REGION_RADII[i]
            return (
              <radialGradient
                key={region.key}
                id={`fog-${region.key}`}
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor="#050810" stopOpacity="0" />
                <stop offset="60%" stopColor="#0D1121" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#0A0E1A" stopOpacity="0.97" />
              </radialGradient>
            )
          })}

          {/* Gradiente do centro da galáxia */}
          <radialGradient id="galaxy-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e1065" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#0f0a2e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#050810" stopOpacity="0" />
          </radialGradient>

          {/* Clip para a névoa de cada região */}
          {REGION_META.map((region, i) => (
            <clipPath key={`clip-${region.key}`} id={`clip-outer-${region.key}`}>
              <circle cx={CX} cy={CY} r={REGION_RADII[i] + 40} />
            </clipPath>
          ))}
        </defs>

        {/* ── Fundo: espaço profundo ──────────────────────────── */}
        <rect width={VW} height={VH} fill="#050810" />

        {/* ── Estrelas animadas ───────────────────────────────── */}
        <StarField width={VW} height={VH} count={220} />

        {/* ── Núcleo da galáxia (brilho central) ─────────────── */}
        <circle cx={CX} cy={CY} r={160} fill="url(#galaxy-core)" />

        {/* ── Anéis das regiões ───────────────────────────────── */}
        {REGION_META.map((region, i) => {
          const r = REGION_RADII[i]
          const isLocked = playerXP < region.xp_required
          return (
            <g key={region.key}>
              {/* Linha do anel */}
              <circle
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke={isLocked ? '#1e2d47' : '#1e3a5f'}
                strokeWidth={isLocked ? 0.5 : 1}
                strokeDasharray={isLocked ? '4 6' : '8 4'}
                opacity={isLocked ? 0.4 : 0.6}
              />
              {/* Label da região — posição no topo */}
              {!isLocked && (
                <text
                  x={CX}
                  y={CY - r + 14}
                  textAnchor="middle"
                  fill="#4a6fa5"
                  fontSize="9"
                  fontFamily="'Space Grotesk', sans-serif"
                  letterSpacing="2"
                  opacity="0.7"
                >
                  {region.label.toUpperCase()}
                </text>
              )}
            </g>
          )
        })}

        {/* ── Névoas das regiões bloqueadas ───────────────────── */}
        {REGION_META.map((region, i) => {
          const isLocked = playerXP < region.xp_required
          if (!isLocked) return null

          // Raio interno: a região anterior (ou 0 para a primeira)
          const innerR = i === 0 ? 0 : REGION_RADII[i - 1]
          const outerR = REGION_RADII[i] + 50

          return (
            <g key={`fog-${region.key}`}>
              {/* Anel de névoa entre o raio interno e externo */}
              <defs>
                <radialGradient
                  id={`fog-ring-${region.key}`}
                  cx="50%"
                  cy="50%"
                  r="50%"
                >
                  <stop
                    offset={(innerR / outerR) * 100 + '%'}
                    stopColor="#0A0E1A"
                    stopOpacity="0"
                  />
                  <stop
                    offset={Math.min((innerR / outerR) * 100 + 15, 85) + '%'}
                    stopColor="#0A0E1A"
                    stopOpacity="0.85"
                  />
                  <stop offset="100%" stopColor="#080C18" stopOpacity="0.97" />
                </radialGradient>
                <mask id={`mask-fog-${region.key}`}>
                  <circle cx={CX} cy={CY} r={outerR} fill="white" />
                  {i > 0 && (
                    <circle
                      cx={CX}
                      cy={CY}
                      r={innerR - 10}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>

              <circle
                cx={CX}
                cy={CY}
                r={outerR}
                fill={`url(#fog-ring-${region.key})`}
                mask={`url(#mask-fog-${region.key})`}
                opacity="0.95"
              >
                {/* Animação suave de pulso na névoa */}
                <animate
                  attributeName="opacity"
                  values="0.92;0.98;0.92"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Texto "bloqueado" com XP necessário */}
              {i > 0 && (
                <text
                  x={CX}
                  y={CY - (innerR + (REGION_RADII[i] - innerR) * 0.5)}
                  textAnchor="middle"
                  fill="#2a3a55"
                  fontSize="10"
                  fontFamily="'Space Grotesk', sans-serif"
                  letterSpacing="1.5"
                >
                  {region.label.toUpperCase()} — {region.xp_required.toLocaleString()} XP
                </text>
              )}
            </g>
          )
        })}

        {/* ── Planetas ────────────────────────────────────────── */}
        {worlds.map((world) => {
          const [px, py] = worldToSVG(world.coord_x, world.coord_y)
          const isSelected = world.id === selectedWorldId
          const isHovered = world.id === hoveredId
          const isLocked = world.status === 'locked'
          const isColonized = world.status === 'colonized'
          const isAvailable = world.status === 'available'

          const displayName = isColonized
            ? world.playerWorld?.custom_name ?? world.name
            : isLocked
            ? '???'
            : world.name

          const planetR = isSelected ? 7 : isHovered ? 6.5 : 5.5
          const glowColor = isLocked ? '#1e2d47' : world.color_glow

          return (
            <g
              key={world.id}
              style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
              onClick={() => !isLocked && onSelectWorld(world)}
              onMouseEnter={() => !isLocked && setHoveredId(world.id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-label={displayName}
            >
              {/* Halo externo (glow) */}
              {!isLocked && (
                <circle
                  cx={px}
                  cy={py}
                  r={planetR + 8}
                  fill={glowColor}
                  opacity={isSelected ? 0.35 : isHovered ? 0.25 : 0.12}
                  filter="url(#glow-md)"
                >
                  {isAvailable && (
                    <animate
                      attributeName="r"
                      values={`${planetR + 6};${planetR + 12};${planetR + 6}`}
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              )}

              {/* Anel dourado para planetas colonizados */}
              {isColonized && (
                <circle
                  cx={px}
                  cy={py}
                  r={planetR + 5}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                  opacity="0.7"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${px} ${py}`}
                    to={`360 ${px} ${py}`}
                    dur="20s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Corpo do planeta */}
              <circle
                cx={px}
                cy={py}
                r={planetR}
                fill={isLocked ? '#1a2740' : world.color_primary}
                opacity={isLocked ? 0.3 : 1}
                filter={isLocked ? undefined : 'url(#glow-sm)'}
              >
                {/* Pulso suave em planetas disponíveis */}
                {isAvailable && (
                  <animate
                    attributeName="r"
                    values={`${planetR};${planetR * 1.15};${planetR}`}
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>

              {/* Indicador de seleção */}
              {isSelected && (
                <circle
                  cx={px}
                  cy={py}
                  r={planetR + 4}
                  fill="none"
                  stroke={world.color_primary}
                  strokeWidth="1"
                  opacity="0.8"
                />
              )}

              {/* Label do planeta */}
              <text
                x={px}
                y={py + planetR + 14}
                textAnchor="middle"
                fill={
                  isLocked
                    ? '#2a3a55'
                    : isColonized
                    ? '#e2e8f0'
                    : '#94a3b8'
                }
                fontSize={isColonized ? '9.5' : '8.5'}
                fontFamily="'Space Grotesk', sans-serif"
                fontWeight={isColonized ? '600' : '400'}
                letterSpacing="0.5"
                opacity={isLocked ? 0.4 : 1}
              >
                {displayName}
              </text>

              {/* Ícone de cadeado em planetas bloqueados */}
              {isLocked && (
                <text
                  x={px}
                  y={py + 4}
                  textAnchor="middle"
                  fill="#2a3a55"
                  fontSize="8"
                  opacity="0.5"
                >
                  ⬡
                </text>
              )}
            </g>
          )
        })}

        {/* ── Indicador de XP atual do jogador ───────────────── */}
        <text
          x={16}
          y={VH - 12}
          fill="#4a6fa5"
          fontSize="9"
          fontFamily="'Space Grotesk', sans-serif"
          letterSpacing="1"
          opacity="0.6"
        >
          ⚡ {playerXP.toLocaleString()} XP
        </text>
      </svg>
    </div>
  )
}
