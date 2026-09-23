import { useMemo, useState } from 'react'
import { Archive, CalendarDays, Search, Trash2 } from 'lucide-react'
import { useGame } from '../hooks/GameProvider'
import { deleteMission } from '../services/missionService'
import { ConfirmDialog } from '../components/Bits'
import type { Mission } from '../types/database'

export default function Registro() {
  const { missions, worlds, dropMission } = useGame()
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState<Mission | null>(null)
  const [clearAll, setClearAll] = useState(false)
  const [busy, setBusy] = useState(false)

  const done = useMemo(
    () => missions
      .filter((m) => m.status === 'done')
      .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')),
    [missions],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return done
    const q = search.toLowerCase()
    return done.filter((m) =>
      m.title.toLowerCase().includes(q) ||
      worlds.find((w) => w.id === m.world_id)?.name.toLowerCase().includes(q),
    )
  }, [done, search, worlds])

  async function confirmRemove() {
    if (!removing) return
    setBusy(true)
    try {
      await deleteMission(removing.id)
      dropMission(removing.id)
    } finally {
      setBusy(false)
      setRemoving(null)
    }
  }

  async function confirmClearAll() {
    setBusy(true)
    try {
      for (const m of done) {
        await deleteMission(m.id)
        dropMission(m.id)
      }
    } finally {
      setBusy(false)
      setClearAll(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-6 md:px-8">
      {/* Barra de filtro */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="text"
            placeholder="Buscar no registro…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-[8px] border border-line bg-raised pl-9 pr-3 text-[13px] text-text outline-none transition-colors duration-150 placeholder:text-faint focus:border-azure focus:ring-1 focus:ring-azure/30"
          />
        </div>
        {done.length > 0 && (
          <button
            type="button"
            onClick={() => setClearAll(true)}
            className="flex items-center gap-1.5 rounded-[8px] border border-bad/20 px-3 py-1.5 text-[12px] text-bad transition-colors duration-150 hover:bg-bad/10"
          >
            <Trash2 size={12} aria-hidden />
            Limpar registro ({done.length})
          </button>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Archive size={32} className="text-faint" />
          <p className="text-[14px] text-muted">{search ? 'Nenhuma missão encontrada.' : 'Nenhuma missão no registro ainda.'}</p>
          <p className="text-[12px] text-faint">Missões concluídas aparecem aqui.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((m) => {
            const world = worlds.find((w) => w.id === m.world_id)
            return (
              <div
                key={m.id}
                className="group flex items-center gap-3 rounded-[10px] border border-line bg-surface px-4 py-3 transition-colors duration-150 hover:bg-raised"
              >
                {world?.planet_image && (
                  <img src={`assets/planets/${world.planet_image}-esferico.webp`} alt="" className="size-8 shrink-0 rounded-full object-cover" loading="lazy" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-text">{m.title}</p>
                  <div className="flex items-center gap-2 text-[11px] text-faint">
                    {world && <span>{world.name}</span>}
                    {m.completed_at && (
                      <>
                        <span>·</span>
                        <CalendarDays size={10} aria-hidden />
                        <span>{new Date(m.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoving(m)}
                  className="grid size-7 shrink-0 place-items-center rounded-[6px] text-faint opacity-0 transition-all duration-150 hover:bg-bad/10 hover:text-bad group-hover:opacity-100"
                  aria-label="Excluir"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={removing !== null}
        busy={busy}
        title="Excluir missão?"
        message={`"${removing?.title}" será removida permanentemente.`}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmDialog
        open={clearAll}
        busy={busy}
        title="Limpar todo o registro?"
        message={`${done.length} missões concluídas serão removidas permanentemente.`}
        onConfirm={confirmClearAll}
        onCancel={() => setClearAll(false)}
      />
    </main>
  )
}
