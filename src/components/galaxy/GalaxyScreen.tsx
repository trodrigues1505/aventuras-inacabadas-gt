import { useState } from 'react'
import { GalaxyMap } from './GalaxyMap'
import { ColonizeModal } from './ColonizeModal'
import { useGalaxy } from '../../hooks/useGalaxy'
import type { WorldWithStatus } from '../../types/galaxy'
import { REGION_META } from '../../types/galaxy'
import { ChevronLeft, Lock, Target, CheckCircle2 } from 'lucide-react'

interface GalaxyScreenProps {
  playerXP: number
  playerLevel?: number
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
    <div className="flex h-full items-center justify-center" style={{ background: '#060a14' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent"/>
        <p className="text-xs tracking-widest text-[#4a6fa5]"
          style={{ fontFamily: "'Space Grotesk',sans-serif", letterSpacing: '2px' }}>
          CARREGANDO MAPA...
        </p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ background: '#060a14' }}>
      <p className="text-sm text-red-400">Falha na conexão</p>
      <button onClick={refreshWorlds}
        className="rounded-lg border border-[#1e3a5f] bg-[#0a1628] px-4 py-2 text-sm text-[#94a3b8]">
        Tentar novamente
      </button>
    </div>
  )

  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={{ background: '#060a14' }}>

      {/* Header */}
      <div className="relative z-10 flex shrink-0 items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,10,20,0.7)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.3)' }}>
            <span style={{ fontSize: 14 }}>🧭</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white"
              style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Mapa da Galáxia
            </h1>
            <p className="text-[11px]" style={{ color: 'rgba(148,163,184,0.7)' }}>
              {colonizedCount} colonizados · {availableCount} disponíveis
            </p>
          </div>
        </div>

        {nextRegion && (
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Próximo: {nextRegion.label}
            </span>
            <div className="h-1 w-24 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${nextRegionPct}%`,
                  background: 'linear-gradient(90deg, #2DD4BF, #6EE7B7)',
                  boxShadow: '0 0 8px rgba(45,212,191,0.5)'
                }}/>
            </div>
            <span className="text-[11px] font-medium" style={{ color: '#2DD4BF' }}>
              {(nextRegion.xp_required - playerXP).toLocaleString()} XP
            </span>
          </div>
        )}
      </div>

      {/* Corpo */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* Mapa — área principal */}
        <div className="relative flex-1 overflow-hidden">
          <GalaxyMap
            worlds={worlds}
            playerXP={playerXP}
            onSelectWorld={w => setSelectedWorld(w)}
            selectedWorldId={selectedWorld?.id}
          />
        </div>

        {/* Painel lateral — estilo da referência */}
        <div className="relative z-10 flex w-80 shrink-0 flex-col overflow-hidden"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,16,32,0.92)', backdropFilter: 'blur(16px)' }}>
          {selectedWorld
            ? <PlanetPanel
                world={selectedWorld}
                onBack={() => setSelectedWorld(null)}
                onColonize={() => setColonizeTarget(selectedWorld)}
              />
            : <EmptyPanel playerXP={playerXP} worlds={worlds}/>
          }
        </div>
      </div>

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

// ─── Painel do planeta selecionado ────────────────────────────
function PlanetPanel({ world, onBack, onColonize }: {
  world: WorldWithStatus
  onBack: () => void
  onColonize: () => void
}) {
  const isColonized = world.status === 'colonized'
  const isAvailable = world.status === 'available'
  const isLocked = world.status === 'locked'
  const displayName = isColonized ? (world.playerWorld?.custom_name ?? world.name) : world.name

  return (
    <div className="flex h-full flex-col overflow-y-auto">

      {/* Banner */}
      <div className="relative h-44 shrink-0 overflow-hidden" style={{ background: '#0a1628' }}>
        <img
          src={`/assets/planets/${world.slug}-banner.png`}
          alt={world.name}
          className="h-full w-full object-cover"
          style={{ opacity: isLocked ? 0.3 : 1 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        {/* Overlay gradiente */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(10,16,32,0.1) 0%, rgba(10,16,32,0.8) 100%)' }}/>

        {/* Botão voltar */}
        <button onClick={onBack}
          className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full transition-all"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: '#94a3b8' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          <ChevronLeft size={14}/>
        </button>

        {/* Badge de status */}
        <div className="absolute right-3 top-3">
          {isColonized && (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#F59E0B', backdropFilter: 'blur(8px)' }}>
              <CheckCircle2 size={9}/> Colonizado
            </span>
          )}
          {isAvailable && (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.35)', color: '#2DD4BF', backdropFilter: 'blur(8px)' }}>
              <Target size={9}/> Disponível
            </span>
          )}
          {isLocked && (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: 'rgba(30,42,71,0.7)', border: '1px solid rgba(30,42,71,0.9)', color: '#4a6fa5', backdropFilter: 'blur(8px)' }}>
              <Lock size={9}/> Bloqueado
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-4 p-4">

        {/* Nome + região */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold leading-tight text-white"
              style={{ fontFamily: "'Space Grotesk',sans-serif",
                textShadow: isLocked ? 'none' : `0 0 20px ${world.color_glow}60` }}>
              {isLocked ? '???' : displayName}
            </h2>
          </div>
          <p className="mt-1 text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Planeta {world.biome} · {world.region.replace(/-/g, ' ')}
          </p>
        </div>

        {/* Lore */}
        {!isLocked && (
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.8)' }}>
            {world.lore_short}
          </p>
        )}

        {/* Tags */}
        {!isLocked && (
          <div className="flex flex-wrap gap-1.5">
            {[world.biome, world.region.replace(/-/g, ' ')].map(tag => (
              <span key={tag} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize"
                style={{ background: `${world.color_primary}18`, border: `1px solid ${world.color_primary}35`, color: world.color_primary }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Traço mecânico */}
        {!isLocked && (
          <div className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: world.color_primary, opacity: 0.8 }}>
              Traço do planeta
            </p>
            <p className="text-xs leading-relaxed text-white">{world.trait_desc}</p>
            <p className="mt-1 text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>
              Ideal: {world.ideal_category}
            </p>
          </div>
        )}

        {/* Stats se colonizado */}
        {isColonized && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Missões', value: world.playerWorld?.missions_total ?? 0 },
              { label: 'Concluídas', value: world.playerWorld?.missions_won ?? 0 },
              { label: 'Explorado', value: `${Math.round(world.playerWorld?.explored_pct ?? 0)}%` },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-sm font-bold" style={{ color: world.color_primary, fontFamily: "'Space Grotesk',sans-serif" }}>
                  {s.value}
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* XP bloqueado */}
        {isLocked && (
          <div className="rounded-xl p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Lock size={18} className="mx-auto mb-2" style={{ color: 'rgba(148,163,184,0.3)' }}/>
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.4)' }}>
              Requer {world.xp_required.toLocaleString()} XP
            </p>
          </div>
        )}

        {/* Botão colonizar */}
        {isAvailable && (
          <button onClick={onColonize}
            className="mt-auto w-full rounded-xl py-3 text-sm font-bold tracking-wide transition-all"
            style={{
              background: `linear-gradient(135deg, ${world.color_primary}, ${world.color_primary}aa)`,
              color: '#060a14',
              boxShadow: `0 4px 24px ${world.color_glow}50`
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${world.color_glow}70` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 24px ${world.color_glow}50` }}
          >
            🚀 Colonizar planeta
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Painel vazio ─────────────────────────────────────────────
function EmptyPanel({ playerXP, worlds }: { playerXP: number; worlds: WorldWithStatus[] }) {
  const colonized = worlds.filter(w => w.status === 'colonized')

  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-4">
      <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.4)' }}>
        Selecione um planeta no mapa para ver detalhes e colonizá-lo.
      </p>

      {colonized.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(148,163,184,0.3)' }}>Colonizados</p>
          <div className="flex flex-col gap-1.5">
            {colonized.map(w => (
              <div key={w.id} className="flex items-center gap-2.5 rounded-lg p-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg"
                  style={{ background: `${w.color_primary}20` }}>
                  <img src={`/assets/planets/${w.slug}-esferico.png`} alt={w.name}
                    className="h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}/>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">
                    {w.playerWorld?.custom_name ?? w.name}
                  </p>
                  <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{w.name}</p>
                </div>
                <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#F59E0B', boxShadow: '0 0 4px rgba(245,158,11,0.6)' }}/>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(148,163,184,0.3)' }}>Regiões</p>
        <div className="flex flex-col gap-1.5">
          {REGION_META.map(r => {
            const unlocked = playerXP >= r.xp_required
            return (
              <div key={r.key} className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                style={{
                  background: unlocked ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: `1px solid ${unlocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
                  opacity: unlocked ? 1 : 0.4
                }}>
                <div className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: unlocked ? '#2DD4BF' : '#1e2d47',
                    boxShadow: unlocked ? '0 0 6px rgba(45,212,191,0.5)' : 'none' }}/>
                <p className="text-[11px]" style={{ color: unlocked ? '#94a3b8' : '#2a3a55' }}>
                  {r.label}
                </p>
                {unlocked
                  ? <span className="ml-auto text-[10px]" style={{ color: '#2DD4BF' }}>✓</span>
                  : <span className="ml-auto text-[10px]" style={{ color: '#1e2d47' }}>{r.xp_required.toLocaleString()}</span>
                }
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
