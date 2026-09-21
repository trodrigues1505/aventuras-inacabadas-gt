import { useMemo, useState } from 'react'
import { Globe2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '../components/Button'
import { ConfirmDialog, EmptyState } from '../components/Bits'
import { Field, Input, Select, Textarea } from '../components/Field'
import { Modal } from '../components/Modal'
import { useAuth } from '../hooks/AuthProvider'
import { useGame } from '../hooks/GameProvider'
import { useToast } from '../hooks/ToastProvider'
import {
  createWorld, deleteWorld, updateWorld, type WorldDraft,
} from '../services/worldService'
import { ACCENT, ACCENT_KEYS, WORLD_ICONS } from '../data/gameConfig'
import type { PlanetImage, World, WorldAccent } from '../types/database'

const PLANET_IMAGES: { key: PlanetImage; label: string; description: string }[] = [
  { key: 'varda',    label: 'Varda',    description: 'Habitável · oceanos e florestas' },
  { key: 'thalassa', label: 'Thalassa', description: 'Aquático · profundidade e névoa' },
  { key: 'zerion',   label: 'Zerion',   description: 'Desértico · árido e resistente' },
  { key: 'kestrel',  label: 'Kestrel',  description: 'Gelado · silêncio e constância' },
  { key: 'nyx',      label: 'Nyx',      description: 'Baldio · escuro e misterioso' },
]

const BLANK: WorldDraft = {
  name: '', description: null, icon: '🌐', accent: 'azure', planet_image: null,
}

export default function Planets() {
  const { session } = useAuth()
  const { worlds, missions, putWorld, dropWorld, loading } = useGame()
  const toast = useToast()

  const [selected, setSelected] = useState<World | null>(null)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<World | null>(null)
  const [composing, setComposing] = useState(false)
  const [removing, setRemoving] = useState<World | null>(null)
  const [busy, setBusy] = useState(false)

  // Planeta em destaque: o selecionado ou o primeiro
  const spotlight = selected ?? worlds[0] ?? null

  const filtered = useMemo(() =>
    worlds.filter((w) => w.name.toLowerCase().includes(search.toLowerCase())),
    [worlds, search],
  )

  function start(world?: World) {
    if (world) setEditing(world)
    else setComposing(true)
  }

  function close() {
    setComposing(false)
    setEditing(null)
  }

  async function save(draft: WorldDraft) {
    if (!session) return
    setBusy(true)
    try {
      const saved = editing
        ? await updateWorld(editing.id, draft)
        : await createWorld(session.user.id, draft)
      putWorld(saved)
      if (saved.id === spotlight?.id || !spotlight) setSelected(saved)
      toast('success', editing ? 'Planeta atualizado.' : `Planeta "${saved.name}" mapeado.`)
      close()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmRemove() {
    if (!removing) return
    setBusy(true)
    try {
      await deleteWorld(removing.id)
      dropWorld(removing.id)
      if (selected?.id === removing.id) setSelected(null)
      toast('info', `"${removing.name}" foi desmapeado.`)
      setRemoving(null)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível excluir.')
    } finally {
      setBusy(false)
    }
  }

  const spotlightMissions = spotlight
    ? missions.filter((m) => m.world_id === spotlight.id)
    : []
  const spotlightDone = spotlightMissions.filter((m) => m.status === 'done').length
  const spotlightPct = spotlightMissions.length
    ? Math.round((spotlightDone / spotlightMissions.length) * 100)
    : 0
  const spotlightAccent = spotlight ? (ACCENT[spotlight.accent] ?? ACCENT.azure) : ACCENT.azure

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="display text-[22px] text-text">Planetas</h1>
          <p className="mt-1 text-[13px] text-muted">Mundos, recursos e oportunidades.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar planeta..."
              className="h-9 rounded-[10px] border border-line bg-surface pl-8 pr-3 text-[13px] text-text placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-azure/30"
            />
          </div>
          <Button onClick={() => start()}>
            <Plus size={15} aria-hidden />
            Novo planeta
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonPage />
      ) : worlds.length === 0 ? (
        <div className="rounded-[16px] border border-line bg-surface">
          <EmptyState
            icon={Globe2}
            title="Nenhum planeta mapeado"
            note="Planetas são as categorias das suas missões — trabalho, estudo, casa, o que fizer sentido para você."
            action={<Button onClick={() => start()}><Plus size={15} aria-hidden />Mapear o primeiro</Button>}
          />
        </div>
      ) : (
        <>
          {/* Banner do planeta em destaque */}
          {spotlight && (
            <div className="rise mb-6 overflow-hidden rounded-[18px] border border-line">
              <div className="relative h-[220px] md:h-[280px]">
                <img
                  src={`assets/planets/${spotlight.planet_image ?? 'varda'}-banner.png`}
                  alt={spotlight.name}
                  className="h-full w-full object-cover"
                  onError={(e) => { ;(e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Conteúdo sobre a imagem */}
                <div className="absolute bottom-0 left-0 p-6 md:p-8">
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${spotlightAccent.soft} ${spotlightAccent.text}`}>
                      {PLANET_IMAGES.find((p) => p.key === spotlight.planet_image)?.description ?? 'Desconhecido'}
                    </span>
                  </div>
                  <h2 className="mb-1 text-[28px] font-bold text-white drop-shadow">
                    {spotlight.icon} {spotlight.name}
                  </h2>
                  {spotlight.description && (
                    <p className="mb-4 max-w-[400px] text-[13px] text-white/70">{spotlight.description}</p>
                  )}

                  {/* Métricas */}
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2 text-white/80">
                      <span className="text-[12px]">Missões</span>
                      <span className="font-semibold tabular-nums">{spotlightDone}/{spotlightMissions.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <span className="text-[12px]">Concluídas</span>
                      <span className="font-semibold tabular-nums">{spotlightPct}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <span className="text-[12px]">Em aberto</span>
                      <span className="font-semibold tabular-nums">
                        {spotlightMissions.filter((m) => m.status !== 'done').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progresso circular */}
                <div className="absolute bottom-6 right-6 hidden md:flex flex-col items-center gap-1">
                  <svg viewBox="0 0 48 48" className="size-16">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="4" />
                    <circle
                      cx="24" cy="24" r="20" fill="none"
                      stroke="white" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - spotlightPct / 100)}`}
                      transform="rotate(-90 24 24)"
                    />
                  </svg>
                  <span className="text-[11px] font-semibold text-white">{spotlightPct}%</span>
                  <span className="text-[10px] text-white/60">Explorado</span>
                </div>

                {/* Ações */}
                <div className="absolute right-4 top-4 flex gap-1.5">
                  <button type="button" onClick={() => start(spotlight)}
                    className="grid size-8 place-items-center rounded-[8px] bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60">
                    <Pencil size={13} aria-hidden />
                  </button>
                  <button type="button" onClick={() => setRemoving(spotlight)}
                    className="grid size-8 place-items-center rounded-[8px] bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-red-500/70">
                    <Trash2 size={13} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grid de planetas */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-text">Planetas descobertos</h2>
              <span className="text-[12px] text-faint">{filtered.length} planeta{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((world, i) => {
                const mine = missions.filter((m) => m.world_id === world.id)
                const done = mine.filter((m) => m.status === 'done').length
                const pct = mine.length ? Math.round((done / mine.length) * 100) : 0
                const accent = ACCENT[world.accent] ?? ACCENT.azure
                const isActive = world.id === spotlight?.id

                return (
                  <article
                    key={world.id}
                    onClick={() => setSelected(world)}
                    className={`rise group relative cursor-pointer overflow-hidden rounded-[14px] border transition-all duration-150 ${
                      isActive ? 'border-azure ring-1 ring-azure/30' : 'border-line hover:border-faint/50'
                    }`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-[100px] overflow-hidden bg-raised">
                      <img
                        src={`assets/planets/${world.planet_image ?? 'varda'}-card.png`}
                        alt={world.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                        onError={(e) => { ;(e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <span className={`absolute inset-x-0 top-0 h-[3px] ${accent.bar}`} aria-hidden />

                      {/* Badge do tipo de planeta */}
                      {world.planet_image && (
                        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${accent.soft} ${accent.text}`}>
                          {PLANET_IMAGES.find((p) => p.key === world.planet_image)?.label}
                        </span>
                      )}

                      {/* Ações no hover */}
                      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button type="button" onClick={(e) => { e.stopPropagation(); start(world) }}
                          className="grid size-6 place-items-center rounded-[6px] bg-black/50 text-white hover:bg-black/70">
                          <Pencil size={11} aria-hidden />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setRemoving(world) }}
                          className="grid size-6 place-items-center rounded-[6px] bg-black/50 text-white hover:bg-red-500/80">
                          <Trash2 size={11} aria-hidden />
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="text-[13px]" aria-hidden>{world.icon}</span>
                        <p className="truncate text-[13px] font-medium text-text">{world.name}</p>
                      </div>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="text-faint">{done}/{mine.length} missões</span>
                        <span className={`font-semibold ${accent.text}`}>{pct}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-raised">
                        <div className={`h-full rounded-full ${accent.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </>
      )}

      <WorldForm
        open={composing || editing !== null}
        world={editing}
        busy={busy}
        onSave={save}
        onClose={close}
      />

      <ConfirmDialog
        open={removing !== null}
        busy={busy}
        title={`Desmapear "${removing?.name}"?`}
        message="As missões deste planeta não serão apagadas — elas ficam no registro sem planeta, e você pode reatribuí-las depois."
        confirmLabel="Desmapear"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </main>
  )
}

function WorldForm({
  open, world, busy, onSave, onClose,
}: {
  open: boolean
  world: World | null
  busy: boolean
  onSave: (draft: WorldDraft) => void
  onClose: () => void
}) {
  const initial = useMemo<WorldDraft>(
    () => world
      ? { name: world.name, description: world.description, icon: world.icon, accent: world.accent, planet_image: world.planet_image }
      : BLANK,
    [world],
  )

  const [draft, setDraft] = useState<WorldDraft>(initial)
  const [touched, setTouched] = useState(false)
  const [key, setKey] = useState(0)
  useMemo(() => {
    setDraft(initial)
    setTouched(false)
    setKey((n) => n + 1)
  }, [initial])

  const nameError = touched && !draft.name.trim() ? 'Dê um nome ao planeta.' : undefined

  function submit() {
    setTouched(true)
    if (!draft.name.trim()) return
    onSave({ ...draft, name: draft.name.trim() })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={world ? 'Editar planeta' : 'Novo planeta'}
      subtitle={world ? undefined : 'Planetas agrupam missões por contexto.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} loading={busy}>{world ? 'Salvar' : 'Mapear planeta'}</Button>
        </>
      }
    >
      <div key={key} className="flex flex-col gap-4">
        <Field label="Nome" error={nameError}>
          {(id) => (
            <Input id={id} value={draft.name} placeholder="Trabalho, Estudos, Casa..."
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          )}
        </Field>

        <Field label="Descrição" hint="Opcional.">
          {(id) => (
            <Textarea id={id} rows={2} value={draft.description ?? ''}
              placeholder="O que você gerencia neste planeta?"
              onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
            />
          )}
        </Field>

        {/* Seletor de imagem do planeta */}
        <Field label="Imagem do planeta" hint="Escolha qual mundo do universo representa esta categoria.">
          {() => (
            <div className="grid grid-cols-5 gap-2">
              {PLANET_IMAGES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setDraft({ ...draft, planet_image: p.key })}
                  aria-label={p.label}
                  aria-pressed={draft.planet_image === p.key}
                  className={`group relative overflow-hidden rounded-[10px] border-2 transition-all duration-150 ${
                    draft.planet_image === p.key
                      ? 'border-azure ring-2 ring-azure/30'
                      : 'border-transparent hover:border-faint/40'
                  }`}
                >
                  <div className="aspect-square overflow-hidden bg-raised">
                    <img
                      src={`assets/planets/${p.key}-card.png`}
                      alt={p.label}
                      className="h-full w-full object-cover"
                      onError={(e) => { ;(e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                  <p className="py-1 text-center text-[10px] font-medium text-muted">{p.label}</p>
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Ícone">
          {() => (
            <div className="flex flex-wrap gap-1.5">
              {WORLD_ICONS.map((icon) => (
                <button key={icon} type="button" onClick={() => setDraft({ ...draft, icon })}
                  aria-label={`Ícone ${icon}`} aria-pressed={draft.icon === icon}
                  className={`grid size-9 place-items-center rounded-[10px] text-[17px] transition-colors duration-150 ${
                    draft.icon === icon ? 'bg-interactive ring-2 ring-azure' : 'bg-raised hover:bg-interactive'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Cor">
          {(id) => (
            <Select id={id} value={draft.accent}
              onChange={(e) => setDraft({ ...draft, accent: e.target.value as WorldAccent })}>
              {ACCENT_KEYS.map((key) => (
                <option key={key} value={key}>{ACCENT[key].label}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </Modal>
  )
}

function SkeletonPage() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-[220px] animate-pulse rounded-[18px] bg-raised" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0,1,2].map((i) => <div key={i} className="h-[180px] animate-pulse rounded-[14px] bg-raised" />)}
      </div>
    </div>
  )
}
