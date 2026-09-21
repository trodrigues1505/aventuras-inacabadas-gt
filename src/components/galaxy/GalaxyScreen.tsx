// ============================================================
// GalaxyScreen — tela principal da galáxia
// Layout: mapa estelar (centro) + painel lateral (seleção)
// ============================================================

import { useState } from 'react'
import { GalaxyMap } from './GalaxyMap'
import { ColonizeModal } from './ColonizeModal'
import { useGalaxy } from '../../hooks/useGalaxy'
import type { WorldWithStatus } from '../../types/galaxy'
import { REGION_META } from '../../types/galaxy'

interface GalaxyScreenProps {
  playerXP: number
  playerLevel?: number
}

export function GalaxyScreen({ playerXP, playerLevel: _playerLevel }: GalaxyScreenProps) {
  const { worlds, loading, error, colonize, refreshWorlds } = useGalaxy(playerXP)
  const [selectedWorld, setSelectedWorld] = useState<WorldWithStatus | null>(null)
  const [colonizeTarget, setColonizeTarget] = useState<WorldWithStatus | null>(null)

  // Stats de progresso
  const colonizedCount = worlds.filter((w) => w.status === 'colonized').length
  const availableCount = worlds.filter((w) => w.status === 'available').length
  const lockedCount = worlds.filter((w) => w.status === 'locked').length

  // Próxima região a desbloquear
  const nextRegion = REGION_META.find((r) => playerXP < r.xp_required)
  const xpToNext = nextRegion ? nextRegion.xp_required - playerXP : 0
  const nextRegionPct = nextRegion
    ? Math.min(
        ((playerXP - (REGION_META.find((r) => r.order === nextRegion.order - 1)?.xp_required ?? 0)) /
          (nextRegion.xp_required -
            (REGION_META.find((r) => r.order === nextRegion.order - 1)?.xp_required ?? 0))) *
          100,
        100
      )
    : 100

  const handleSelectWorld = (world: WorldWithStatus) => {
    setSelectedWorld(world)
    if (world.status === 'available') {
      // Abrir modal de colonização diretamente
      setColonizeTarget(world)
    }
  }

  const handleColonize = async (worldId: string, customName: string) => {
    await colonize(worldId, customName)
  }

  const handleModalClose = () => {
    setColonizeTarget(null)
    if (selectedWorld?.status === 'available') {
      // Atualizar o estado do selectedWorld após colonização
      setSelectedWorld(null)
    }
  }

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4"
        style={{ background: '#050810' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#2DD4BF', borderTopColor: 'transparent' }}
        />
        <p
          className="text-sm tracking-widest"
          style={{
            color: '#4a6fa5',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '2px',
          }}
        >
          CARREGANDO MAPA...
        </p>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center"
        style={{ background: '#050810' }}
      >
        <div className="text-3xl">⚠️</div>
        <p style={{ color: '#ef4444', fontFamily: "'Space Grotesk', sans-serif" }}>
          Falha na conexão com a galáxia
        </p>
        <p className="text-xs" style={{ color: '#4a6fa5' }}>
          {error}
        </p>
        <button
          onClick={refreshWorlds}
          className="px-5 py-2 rounded-lg text-sm transition-colors"
          style={{
            background: '#0a1628',
            border: '1px solid #1e3a5f',
            color: '#94a3b8',
          }}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{ background: '#050810' }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-6 py-4"
        style={{
          borderBottom: '1px solid #0d1b2a',
          background: 'rgba(5, 8, 16, 0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div>
          <h1
            className="text-base font-semibold tracking-wide"
            style={{
              color: '#e2e8f0',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Mapa da Galáxia
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#4a6fa5' }}>
            {colonizedCount} colonizados · {availableCount} disponíveis · {lockedCount} bloqueados
          </p>
        </div>

        {/* Progresso para próxima região */}
        {nextRegion && (
          <div className="text-right">
            <p className="text-xs mb-1.5" style={{ color: '#4a6fa5' }}>
              Próximo: {nextRegion.label}
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-32 h-1.5 rounded-full overflow-hidden"
                style={{ background: '#0d1b2a' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${nextRegionPct}%`,
                    background: 'linear-gradient(90deg, #2DD4BF, #6EE7B7)',
                    boxShadow: '0 0 8px rgba(45,212,191,0.5)',
                  }}
                />
              </div>
              <span className="text-xs" style={{ color: '#2DD4BF' }}>
                {xpToNext.toLocaleString()} XP
              </span>
            </div>
          </div>
        )}

        {nextRegion === undefined && (
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide"
            style={{
              background: '#7C3AED20',
              border: '1px solid #7C3AED40',
              color: '#A78BFA',
            }}
          >
            ✦ Galáxia completa
          </div>
        )}
      </div>

      {/* ── Corpo: mapa + painel lateral ───────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mapa */}
        <div className="flex-1 flex items-center justify-center p-4 min-w-0">
          <GalaxyMap
            worlds={worlds}
            playerXP={playerXP}
            onSelectWorld={handleSelectWorld}
            selectedWorldId={selectedWorld?.id}
          />
        </div>

        {/* Painel lateral — planeta selecionado */}
        <div
          className="shrink-0 w-64 flex flex-col overflow-y-auto"
          style={{
            borderLeft: '1px solid #0d1b2a',
            background: 'rgba(8, 12, 24, 0.7)',
          }}
        >
          {selectedWorld ? (
            <PlanetPanel
              world={selectedWorld}
              onColonize={() => setColonizeTarget(selectedWorld)}
              onViewDetails={() => setColonizeTarget(selectedWorld)}
            />
          ) : (
            <GalaxyLegend playerXP={playerXP} />
          )}
        </div>
      </div>

      {/* ── Modal de colonização ───────────────────────────── */}
      {colonizeTarget && (
        <ColonizeModal
          world={colonizeTarget}
          onClose={handleModalClose}
          onColonize={handleColonize}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PlanetPanel — painel de detalhes do planeta selecionado
// ─────────────────────────────────────────────────────────────
function PlanetPanel({
  world,
  onColonize,
  onViewDetails,
}: {
  world: WorldWithStatus
  onColonize: () => void
  onViewDetails: () => void
}) {
  const isColonized = world.status === 'colonized'
  const isAvailable = world.status === 'available'
  const isLocked = world.status === 'locked'

  return (
    <div className="flex flex-col h-full p-4">
      {/* Cor do planeta como indicador */}
      <div
        className="w-full h-0.5 rounded-full mb-4"
        style={{
          background: isLocked
            ? '#1e2d47'
            : `linear-gradient(90deg, transparent, ${world.color_primary}, transparent)`,
        }}
      />

      {/* Nome */}
      <h3
        className="text-base font-semibold mb-0.5"
        style={{
          color: isLocked ? '#2a3a55' : '#e2e8f0',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {isLocked
          ? '???'
          : isColonized
          ? world.playerWorld?.custom_name ?? world.name
          : world.name}
      </h3>

      {isColonized && (
        <p className="text-xs mb-3" style={{ color: '#4a6fa5' }}>
          {world.name}
        </p>
      )}

      {/* Região + bioma */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span
          className="px-2 py-0.5 rounded-full text-xs"
          style={{
            background: '#0d1b2a',
            color: isLocked ? '#1e2d47' : '#4a6fa5',
            border: '1px solid #1e3a5f',
          }}
        >
          {world.region.replace(/-/g, ' ')}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-xs"
          style={{
            background: '#0d1b2a',
            color: isLocked ? '#1e2d47' : '#4a6fa5',
            border: '1px solid #1e3a5f',
          }}
        >
          {world.biome}
        </span>
      </div>

      {/* Lore curto */}
      {!isLocked && (
        <p
          className="text-xs leading-relaxed mb-4"
          style={{ color: '#64748b' }}
        >
          {world.lore_short}
        </p>
      )}

      {/* Traço mecânico */}
      {!isLocked && (
        <div
          className="rounded-xl p-3 mb-4"
          style={{
            background: `${world.color_primary}0a`,
            border: `1px solid ${world.color_primary}20`,
          }}
        >
          <p
            className="text-xs font-medium mb-1"
            style={{ color: world.color_primary, opacity: 0.8 }}
          >
            Traço
          </p>
          <p className="text-xs" style={{ color: '#94a3b8', lineHeight: 1.5 }}>
            {world.trait_desc}
          </p>
        </div>
      )}

      {/* Status badge */}
      <div className="mb-4">
        {isColonized && (
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: '#F59E0B' }}
          >
            <span>⬡</span>
            <span>Colonizado</span>
          </div>
        )}
        {isAvailable && (
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: '#2DD4BF' }}
          >
            <span>◈</span>
            <span>Disponível para colonização</span>
          </div>
        )}
        {isLocked && (
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: '#2a3a55' }}
          >
            <span>⊘</span>
            <span>Bloqueado — {world.xp_required.toLocaleString()} XP</span>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="mt-auto flex flex-col gap-2">
        {isAvailable && (
          <button
            onClick={onColonize}
            className="w-full py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all"
            style={{
              background: `linear-gradient(135deg, ${world.color_primary}cc, ${world.color_primary}88)`,
              color: '#050810',
              boxShadow: `0 0 16px ${world.color_glow}30`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 24px ${world.color_glow}50`
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = `0 0 16px ${world.color_glow}30`
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            🚀 Colonizar
          </button>
        )}

        {isColonized && (
          <button
            onClick={onViewDetails}
            className="w-full py-2.5 rounded-xl text-xs font-medium transition-colors"
            style={{
              background: '#0a1628',
              border: '1px solid #1e3a5f',
              color: '#94a3b8',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1e2d47')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#0a1628')}
          >
            Ver detalhes
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// GalaxyLegend — estado inicial quando nenhum planeta está selecionado
// ─────────────────────────────────────────────────────────────
function GalaxyLegend({ playerXP }: { playerXP: number }) {
  return (
    <div className="p-4 flex flex-col gap-4">
      <p
        className="text-xs leading-relaxed"
        style={{ color: '#2a3a55', lineHeight: 1.7 }}
      >
        Selecione um planeta para ver seu lore e colonizá-lo.
      </p>

      <div>
        <p
          className="text-xs font-medium mb-3 tracking-widest uppercase"
          style={{ color: '#1e3a5f' }}
        >
          Regiões
        </p>

        <div className="flex flex-col gap-2">
          {REGION_META.map((region) => {
            const unlocked = playerXP >= region.xp_required
            return (
              <div
                key={region.key}
                className="flex items-center gap-2.5 py-2 px-3 rounded-lg"
                style={{
                  background: unlocked ? '#0a1628' : 'transparent',
                  border: `1px solid ${unlocked ? '#1e3a5f' : '#0d1b2a'}`,
                  opacity: unlocked ? 1 : 0.4,
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: unlocked ? '#2DD4BF' : '#1e2d47',
                    boxShadow: unlocked ? '0 0 6px rgba(45,212,191,0.5)' : 'none',
                  }}
                />
                <div>
                  <p
                    className="text-xs font-medium"
                    style={{ color: unlocked ? '#94a3b8' : '#2a3a55' }}
                  >
                    {region.label}
                  </p>
                  {!unlocked && (
                    <p
                      className="text-xs"
                      style={{ color: '#1e2d47', fontSize: '10px' }}
                    >
                      {region.xp_required.toLocaleString()} XP
                    </p>
                  )}
                </div>
                {unlocked && (
                  <span
                    className="ml-auto text-xs"
                    style={{ color: '#2DD4BF', fontSize: '10px' }}
                  >
                    ✓
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legenda de status */}
      <div className="mt-auto">
        <div className="flex flex-col gap-2">
          {[
            { icon: '⬡', color: '#F59E0B', label: 'Colonizado' },
            { icon: '◈', color: '#2DD4BF', label: 'Disponível' },
            { icon: '⊘', color: '#1e2d47', label: 'Bloqueado' },
          ].map(({ icon, color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs" style={{ color }}>
                {icon}
              </span>
              <span className="text-xs" style={{ color: '#2a3a55' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
