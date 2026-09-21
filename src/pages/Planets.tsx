// ============================================================
// Planets.tsx — vitrine dos planetas colonizados
// ============================================================

import { useMemo, useState } from 'react'
import { Globe2, Map, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGame } from '../hooks/GameProvider'
import type { World } from '../types/database'

const HAS_IMAGE = new Set(['varda','thalassa','zerion','kestrel','nyx'])

function planetBanner(slug: string): string | null {
  return HAS_IMAGE.has(slug) ? `/assets/planets/${slug}-banner.png` : null
}

export default function Planets() {
  const { worlds, missions, loading } = useGame()
  const [selected, setSelected] = useState<World | null>(null)

  const missionsByWorld = useMemo(() =>
    missions.reduce((acc: Record<string, number>, m) => {
      if (m.world_id) acc[m.world_id] = (acc[m.world_id] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  , [missions])

  const spotlight = selected ?? (worlds.length > 0 ? worlds[0] : null)

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-azure border-t-transparent" />
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-10">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Planetas</h1>
          <p className="mt-0.5 text-sm text-faint">
            {worlds.length > 0
              ? `${worlds.length} planeta${worlds.length > 1 ? 's' : ''} colonizado${worlds.length > 1 ? 's' : ''}`
              : 'Nenhum planeta colonizado ainda'}
          </p>
        </div>
        <Link
          to="/galaxia"
          className="flex items-center gap-2 rounded-xl bg-azure px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Map size={15} />
          Explorar Galáxia
        </Link>
      </div>

      {worlds.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-raised">
            <Globe2 size={24} className="text-faint" />
          </div>
          <h2 className="mb-2 text-base font-semibold text-text">Nenhum planeta mapeado</h2>
          <p className="mb-6 max-w-xs text-sm text-faint">
            Acesse o Mapa da Galáxia para explorar e colonizar planetas.
          </p>
          <Link
            to="/galaxia"
            className="flex items-center gap-2 rounded-xl bg-azure px-5 py-2.5 text-sm font-medium text-white"
          >
            <Map size={15} />
            Abrir Mapa da Galáxia
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* Lista */}
          <div className="flex flex-col gap-3">
            {worlds.map(world => {
              const banner = planetBanner(world.slug ?? '')
              const mCount = missionsByWorld[world.id] ?? 0
              const isSpotlight = spotlight?.id === world.id

              return (
                <button
                  key={world.id}
                  onClick={() => setSelected(world)}
                  className="group overflow-hidden rounded-2xl border text-left transition-all"
                  style={{
                    borderColor: isSpotlight ? 'var(--color-azure)' : 'var(--color-line)',
                    background: 'var(--color-surface)',
                    boxShadow: isSpotlight ? '0 0 0 1px var(--color-azure)' : 'none'
                  }}
                >
                  <div className="relative h-28 overflow-hidden bg-raised">
                    {banner ? (
                      <img
                        src={banner}
                        alt={world.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-raised opacity-60" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent" />
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl">{world.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text">{world.name}</p>
                      <p className="text-xs text-faint">
                        {mCount} missão{mCount !== 1 ? 'ões' : ''}
                        {world.description ? ` · ${world.description}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Painel lateral */}
          {spotlight && (
            <div className="sticky top-8 flex flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="relative h-40 overflow-hidden bg-raised">
                {planetBanner(spotlight.slug ?? '') ? (
                  <img
                    src={planetBanner(spotlight.slug ?? '')!}
                    alt={spotlight.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-5xl">{spotlight.icon}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <p className="text-lg font-bold text-text">{spotlight.name}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 px-4 pb-4">
                {spotlight.description && (
                  <p className="text-sm leading-relaxed text-faint">{spotlight.description}</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Missões', value: missionsByWorld[spotlight.id] ?? 0 },
                    { label: 'Concluídas', value: missions.filter(m => m.world_id === spotlight.id && m.status === 'done').length },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl bg-raised p-3 text-center">
                      <p className="text-lg font-bold text-text">{s.value}</p>
                      <p className="text-xs text-faint">{s.label}</p>
                    </div>
                  ))}
                </div>

                <Link
                  to="/missoes"
                  className="flex items-center justify-center gap-2 rounded-xl bg-azure py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Ver missões →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
