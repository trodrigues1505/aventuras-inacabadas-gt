// ============================================================
// GalaxyScreen — tela principal da galáxia
// Visual: fundo de nebulosa, planetas com imagem, painel lateral
// ============================================================

import { useState } from 'react'
import { GalaxyMap } from './GalaxyMap'
import { ColonizeModal } from './ColonizeModal'
import { useGalaxy } from '../../hooks/useGalaxy'
import type { WorldWithStatus } from '../../types/galaxy'
import { REGION_META } from '../../types/galaxy'
import {
  Target, Lock, CheckCircle2, ChevronLeft, Compass,
  Star
} from 'lucide-react'

interface GalaxyScreenProps {
  playerXP: number
  playerLevel?: number
}

// Slugs que têm imagem em public/assets/planets/
const PLANETS_WITH_IMAGES = new Set([
  'varda','thalassa','zerion','kestrel','nyx'
])

function planetBanner(slug: string) {
  if (PLANETS_WITH_IMAGES.has(slug)) return `/assets/planets/${slug}-banner.png`
  return null
}
function planetCard(slug: string) {
  if (PLANETS_WITH_IMAGES.has(slug)) return `/assets/planets/${slug}-card.png`
  return null
}

export function GalaxyScreen({ playerXP }: GalaxyScreenProps) {
  const { worlds, loading, error, colonize, refreshWorlds } = useGalaxy(playerXP)
  const [selectedWorld, setSelectedWorld] = useState<WorldWithStatus | null>(null)
  const [colonizeTarget, setColonizeTarget] = useState<WorldWithStatus | null>(null)

  const colonizedCount = worlds.filter(w => w.status === 'colonized').length
  const availableCount = worlds.filter(w => w.status === 'available').length

  const nextRegion = REGION_META.find(r => playerXP < r.xp_required)
  const prevXP = nextRegion
    ? (REGION_META.find(r => r.order === nextRegion.order - 1)?.xp_required ?? 0)
    : 0
  const nextRegionPct = nextRegion
    ? Math.min(((playerXP - prevXP) / (nextRegion.xp_required - prevXP)) * 100, 100)
    : 100

  if (loading) return (
    <div className="flex h-full items-center justify-center bg-[#050810]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
        <p className="text-xs tracking-widest text-[#4a6fa5]" style={{ fontFamily: "'Space Grotesk',sans-serif", letterSpacing: '2px' }}>
          CARREGANDO MAPA...
        </p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#050810] p-8 text-center">
      <p className="text-sm text-red-400">Falha na conexão</p>
      <button onClick={refreshWorlds} className="rounded-lg border border-[#1e3a5f] bg-[#0a1628] px-4 py-2 text-sm text-[#94a3b8]">
        Tentar novamente
      </button>
    </div>
  )

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#050810]">

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#0d1b2a] bg-[#050810]/90 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Compass size={16} className="text-[#2DD4BF]" />
          <div>
            <h1 className="text-sm font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Mapa da Galáxia
            </h1>
            <p className="text-[11px] text-[#4a6fa5]">
              {colonizedCount} colonizados · {availableCount} disponíveis
            </p>
          </div>
        </div>

        {/* Barra de progresso para próxima região */}
        {nextRegion && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#4a6fa5]">Próximo: {nextRegion.label}</span>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#0d1b2a]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2DD4BF] to-[#6EE7B7] transition-all duration-700"
                style={{ width: `${nextRegionPct}%`, boxShadow: '0 0 8px rgba(45,212,191,0.5)' }}
              />
            </div>
            <span className="text-[11px] text-[#2DD4BF]">
              {(nextRegion.xp_required - playerXP).toLocaleString()} XP
            </span>
          </div>
        )}
      </div>

      {/* ── Corpo ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Mapa */}
        <div className="relative flex-1 overflow-hidden">
          {/* Fundo de nebulosa via CSS — sem asset externo */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 30% 40%, rgba(88,28,135,0.35) 0%, transparent 60%),
                radial-gradient(ellipse 60% 50% at 70% 60%, rgba(30,58,138,0.4) 0%, transparent 55%),
                radial-gradient(ellipse 40% 40% at 50% 50%, rgba(109,40,217,0.2) 0%, transparent 50%),
                radial-gradient(ellipse 100% 100% at 50% 50%, rgba(15,23,42,0.95) 0%, transparent 100%),
                #050810
              `
            }}
          />
          <GalaxyMap
            worlds={worlds}
            playerXP={playerXP}
            onSelectWorld={w => setSelectedWorld(w)}
            selectedWorldId={selectedWorld?.id}
          />
        </div>

        {/* Painel lateral */}
        <div
          className="flex w-72 shrink-0 flex-col overflow-hidden"
          style={{ borderLeft: '1px solid #0d1b2a', background: 'rgba(8,12,24,0.92)' }}
        >
          {selectedWorld
            ? <PlanetPanel
                world={selectedWorld}
                onBack={() => setSelectedWorld(null)}
                onColonize={() => setColonizeTarget(selectedWorld)}
              />
            : <GalaxyLegend playerXP={playerXP} worlds={worlds} />
          }
        </div>
      </div>

      {/* Modal de colonização */}
      {colonizeTarget && (
        <ColonizeModal
          world={colonizeTarget}
          onClose={() => setColonizeTarget(null)}
          onColonize={colonize}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PlanetPanel
// ─────────────────────────────────────────────────────────────
function PlanetPanel({
  world, onBack, onColonize
}: {
  world: WorldWithStatus
  onBack: () => void
  onColonize: () => void
}) {
  const isColonized = world.status === 'colonized'
  const isAvailable = world.status === 'available'
  const isLocked = world.status === 'locked'
  const banner = planetBanner(world.slug)
  const displayName = isColonized ? (world.playerWorld?.custom_name ?? world.name) : world.name

  return (
    <div className="flex h-full flex-col overflow-y-auto">

      {/* Banner do planeta */}
      <div className="relative h-36 shrink-0 overflow-hidden bg-[#0a1628]">
        {banner && !isLocked ? (
          <img
            src={banner}
            alt={world.name}
            className="h-full w-full object-cover"
            style={{ opacity: 0.85 }}
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: isLocked
                ? 'linear-gradient(135deg, #0a1628, #0d1b2a)'
                : `linear-gradient(135deg, ${world.color_primary}22, ${world.color_glow}11)`
            }}
          />
        )}

        {/* Overlay escuro na base */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#080c18] to-transparent" />

        {/* Botão voltar */}
        <button
          onClick={onBack}
          className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-[#94a3b8] backdrop-blur-sm transition-colors hover:text-white"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Badge de status */}
        <div className="absolute right-3 top-3">
          {isColonized && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 backdrop-blur-sm">
              <CheckCircle2 size={10} /> Colonizado
            </span>
          )}
          {isAvailable && (
            <span className="flex items-center gap-1 rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-medium text-teal-400 backdrop-blur-sm">
              <Target size={10} /> Disponível
            </span>
          )}
          {isLocked && (
            <span className="flex items-center gap-1 rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-medium text-slate-500 backdrop-blur-sm">
              <Lock size={10} /> Bloqueado
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-4 p-4">

        {/* Nome + região */}
        <div>
          <h2
            className="text-base font-semibold leading-tight"
            style={{
              fontFamily: "'Space Grotesk',sans-serif",
              color: isLocked ? '#2a3a55' : '#e2e8f0',
              textShadow: !isLocked ? `0 0 20px ${world.color_glow}40` : 'none'
            }}
          >
            {isLocked ? '???' : displayName}
          </h2>
          {isColonized && world.name !== displayName && (
            <p className="mt-0.5 text-[11px] text-[#4a6fa5]">{world.name}</p>
          )}
          <p className="mt-1 text-[11px] text-[#4a6fa5]">
            {world.region.replace(/-/g, ' ')} · {world.biome}
          </p>
        </div>

        {/* Lore */}
        {!isLocked && (
          <p className="text-[12px] leading-relaxed text-[#64748b]">
            {world.lore_short}
          </p>
        )}

        {/* Traço mecânico */}
        {!isLocked && (
          <div
            className="rounded-xl p-3"
            style={{
              background: `${world.color_primary}0d`,
              border: `1px solid ${world.color_primary}25`
            }}
          >
            <p className="mb-1 text-[10px] font-medium uppercase tracking-widest" style={{ color: world.color_primary, opacity: 0.8 }}>
              Traço
            </p>
            <p className="text-[12px] leading-relaxed text-[#e2e8f0]">{world.trait_desc}</p>
            <p className="mt-1 text-[11px] text-[#64748b]">Ideal: {world.ideal_category}</p>
          </div>
        )}

        {/* Stats se colonizado */}
        {isColonized && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Target, label: 'Missões', value: world.playerWorld?.missions_total ?? 0 },
              { icon: CheckCircle2, label: 'Concluídas', value: world.playerWorld?.missions_won ?? 0 },
              { icon: Star, label: 'Explorado', value: `${Math.round(world.playerWorld?.explored_pct ?? 0)}%` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg bg-[#0a1628] p-2 text-center" style={{ border: '1px solid #1e3a5f' }}>
                <Icon size={12} className="mx-auto mb-1 text-[#4a6fa5]" />
                <p className="text-sm font-bold" style={{ color: world.color_primary, fontFamily: "'Space Grotesk',sans-serif" }}>{value}</p>
                <p className="text-[9px] text-[#4a6fa5]">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* XP necessário se bloqueado */}
        {isLocked && (
          <div className="rounded-xl p-3 text-center" style={{ background: '#0a1628', border: '1px solid #1e2d47' }}>
            <Lock size={14} className="mx-auto mb-2 text-[#2a3a55]" />
            <p className="text-[11px] text-[#2a3a55]">
              Requer {world.xp_required.toLocaleString()} XP
            </p>
          </div>
        )}

        {/* Botão */}
        {isAvailable && (
          <button
            onClick={onColonize}
            className="mt-auto w-full rounded-xl py-2.5 text-sm font-semibold tracking-wide transition-all"
            style={{
              background: `linear-gradient(135deg, ${world.color_primary}dd, ${world.color_primary}99)`,
              color: '#050810',
              boxShadow: `0 0 20px ${world.color_glow}40`
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 0 30px ${world.color_glow}60` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 20px ${world.color_glow}40` }}
          >
            🚀 Colonizar
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// GalaxyLegend
// ─────────────────────────────────────────────────────────────
function GalaxyLegend({ playerXP, worlds }: { playerXP: number; worlds: WorldWithStatus[] }) {
  const colonized = worlds.filter(w => w.status === 'colonized')

  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-4">

      <p className="text-[11px] leading-relaxed text-[#2a3a55]">
        Selecione um planeta no mapa para ver detalhes e colonizá-lo.
      </p>

      {/* Planetas colonizados */}
      {colonized.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-[#1e3a5f]">
            Colonizados
          </p>
          <div className="flex flex-col gap-1.5">
            {colonized.map(w => {
              const img = planetCard(w.slug)
              return (
                <div key={w.id} className="flex items-center gap-2.5 rounded-lg p-2" style={{ background: '#0a1628', border: '1px solid #1e3a5f' }}>
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md" style={{ background: `${w.color_primary}20` }}>
                    {img && <img src={img} alt={w.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-[#e2e8f0]">
                      {w.playerWorld?.custom_name ?? w.name}
                    </p>
                    <p className="text-[10px] text-[#4a6fa5]">{w.name}</p>
                  </div>
                  <div className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" style={{ boxShadow: '0 0 4px rgba(251,191,36,0.6)' }} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Regiões */}
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-[#1e3a5f]">
          Regiões
        </p>
        <div className="flex flex-col gap-1.5">
          {REGION_META.map(region => {
            const unlocked = playerXP >= region.xp_required
            return (
              <div
                key={region.key}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                style={{
                  background: unlocked ? '#0a1628' : 'transparent',
                  border: `1px solid ${unlocked ? '#1e3a5f' : '#0d1b2a'}`,
                  opacity: unlocked ? 1 : 0.45
                }}
              >
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: unlocked ? '#2DD4BF' : '#1e2d47',
                    boxShadow: unlocked ? '0 0 6px rgba(45,212,191,0.5)' : 'none'
                  }}
                />
                <p className="text-[11px]" style={{ color: unlocked ? '#94a3b8' : '#2a3a55' }}>
                  {region.label}
                </p>
                {unlocked
                  ? <span className="ml-auto text-[10px] text-[#2DD4BF]">✓</span>
                  : <span className="ml-auto text-[10px] text-[#1e2d47]">{region.xp_required.toLocaleString()}</span>
                }
              </div>
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-auto flex flex-col gap-1.5">
        {[
          { dot: '#F59E0B', label: 'Colonizado' },
          { dot: '#2DD4BF', label: 'Disponível' },
          { dot: '#1e2d47', label: 'Bloqueado' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
            <span className="text-[10px] text-[#2a3a55]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
