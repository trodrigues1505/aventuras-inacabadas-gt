import { useState } from 'react'
import { Globe2, Map, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGalaxy } from '../hooks/useGalaxy'
import { useAuth } from '../hooks/AuthProvider'
import type { WorldWithStatus } from '../types/galaxy'

function planetBanner(slug: string): string {
  // nyx no banco → nix no arquivo de banner antigo
  const fileSlug = slug === 'nyx' ? 'nix' : slug
  return `assets/planets/${fileSlug}-banner.webp`
}

export default function Planets() {
  const { playerState } = useAuth()
  const { worlds, loading } = useGalaxy(playerState?.xp ?? 0)
  const [selected, setSelected] = useState<WorldWithStatus | null>(null)

  const explored = worlds.filter(w => w.status === 'colonized')
  const spotlight = selected ?? (explored.length > 0 ? explored[0] : null)

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-azure border-t-transparent"/>
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-10">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Planetas</h1>
          <p className="mt-0.5 text-sm text-faint">
            {explored.length > 0
              ? `${explored.length} planeta${explored.length > 1 ? 's' : ''} explorado${explored.length > 1 ? 's' : ''}`
              : 'Nenhum planeta explorado ainda'}
          </p>
        </div>
        <Link to="/galaxia"
          className="flex items-center gap-2 rounded-xl bg-azure px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
          <Map size={15}/>
          Explorar Galáxia
        </Link>
      </div>

      {explored.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-raised">
            <Globe2 size={24} className="text-faint"/>
          </div>
          <h2 className="mb-2 text-base font-semibold text-text">Nenhum planeta explorado</h2>
          <p className="mb-6 max-w-xs text-sm text-faint">
            Acesse o Mapa da Galáxia e explore planetas para criar áreas para suas missões.
          </p>
          <Link to="/galaxia"
            className="flex items-center gap-2 rounded-xl bg-azure px-5 py-2.5 text-sm font-medium text-white">
            <Map size={15}/>
            Abrir Mapa da Galáxia
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* Lista */}
          <div className="flex flex-col gap-3">
            {explored.map(world => {
              const isSpotlight = spotlight?.id === world.id
              return (
                <button key={world.id} onClick={() => setSelected(world)}
                  className="group overflow-hidden rounded-2xl border text-left transition-all"
                  style={{
                    borderColor: isSpotlight ? 'var(--color-azure)' : 'var(--color-line)',
                    background: 'var(--color-surface)',
                    boxShadow: isSpotlight ? '0 0 0 1px var(--color-azure)' : 'none'
                  }}>
                  {/* Banner */}
                  <div className="relative h-28 overflow-hidden bg-raised">
                    <img src={planetBanner(world.slug)} alt={world.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}/>
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent"/>
                  </div>
                  {/* Info */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg"
                      style={{ background: `${world.color_primary}20` }}>
                      <img src={`assets/planets/${world.slug}-esferico.webp`} alt=""
                        className="h-full w-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text">
                        {world.playerWorld?.title ?? world.name}
                      </p>
                      <p className="text-xs text-faint">{world.name} · {world.biome}</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5"/>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Painel lateral */}
          {spotlight && (
            <div className="sticky top-8 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="relative h-40 overflow-hidden bg-raised">
                <img src={planetBanner(spotlight.slug)} alt={spotlight.name}
                  className="h-full w-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}/>
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent"/>
                <div className="absolute bottom-3 left-4">
                  <p className="text-xs text-faint">{spotlight.name}</p>
                  <p className="text-lg font-bold text-text">
                    {spotlight.playerWorld?.title ?? spotlight.name}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 px-4 py-4">
                {spotlight.lore_short && (
                  <p className="text-sm leading-relaxed text-faint">{spotlight.lore_short}</p>
                )}
                <div
                  className="rounded-xl p-3 text-xs"
                  style={{ background: `${spotlight.color_primary}0d`, border: `1px solid ${spotlight.color_primary}25` }}>
                  <p className="mb-1 font-medium uppercase tracking-widest" style={{ color: spotlight.color_primary, opacity: 0.8 }}>
                    Traço
                  </p>
                  <p className="text-text">{spotlight.trait_desc}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Missões', value: spotlight.playerWorld?.missions_total ?? 0 },
                    { label: 'Concluídas', value: spotlight.playerWorld?.missions_won ?? 0 },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl bg-raised p-3 text-center">
                      <p className="text-lg font-bold text-text">{s.value}</p>
                      <p className="text-xs text-faint">{s.label}</p>
                    </div>
                  ))}
                </div>
                <Link to="/missoes"
                  className="flex items-center justify-center gap-2 rounded-xl bg-azure py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
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
