import { useMemo, useState } from 'react'
import { Globe2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, IconButton } from '../components/Button'
import { ConfirmDialog, EmptyState, SectionHeader } from '../components/Bits'
import { Field, Input, Select, Textarea } from '../components/Field'
import { Modal } from '../components/Modal'
import { useAuth } from '../hooks/AuthProvider'
import { useGame } from '../hooks/GameProvider'
import { useToast } from '../hooks/ToastProvider'
import {
  createWorld,
  deleteWorld,
  updateWorld,
  type WorldDraft,
} from '../services/worldService'
import { ACCENT, ACCENT_KEYS, WORLD_ICONS } from '../data/gameConfig'
import type { World, WorldAccent } from '../types/database'

const BLANK: WorldDraft = {
  name: '',
  description: null,
  icon: '🌐',
  accent: 'azure',
}

export default function Planets() {
  const { session } = useAuth()
  const { worlds, missions, putWorld, dropWorld, loading } = useGame()
  const toast = useToast()

  const [editing, setEditing] = useState<World | null>(null)
  const [composing, setComposing] = useState(false)
  const [removing, setRemoving] = useState<World | null>(null)
  const [busy, setBusy] = useState(false)

  const open = composing || editing !== null

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
      toast('info', `"${removing.name}" foi desmapeado. As missões continuam no registro.`)
      setRemoving(null)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível excluir.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
      <SectionHeader
        title="Planetas"
        note="Mundos, recursos e oportunidades."
        action={
          <Button onClick={() => start()}>
            <Plus size={15} aria-hidden />
            Novo planeta
          </Button>
        }
      />

      {loading ? (
        <SkeletonGrid />
      ) : worlds.length === 0 ? (
        <div className="rounded-[16px] border border-line bg-surface">
          <EmptyState
            icon={Globe2}
            title="Nenhum planeta mapeado"
            note="Planetas são as categorias das suas missões — trabalho, estudo, casa, o que fizer sentido para você."
            action={
              <Button onClick={() => start()}>
                <Plus size={15} aria-hidden />
                Mapear o primeiro
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {worlds.map((world, i) => {
            const mine = missions.filter((m) => m.world_id === world.id)
            const done = mine.filter((m) => m.status === 'done').length
            const pct = mine.length ? Math.round((done / mine.length) * 100) : 0
            const accent = ACCENT[world.accent] ?? ACCENT.azure

            return (
              <PlanetCard
                key={world.id}
                world={world}
                done={done}
                total={mine.length}
                pct={pct}
                accent={accent}
                delay={i * 40}
                onEdit={() => start(world)}
                onRemove={() => setRemoving(world)}
              />
            )
          })}
        </div>
      )}

      <WorldForm
        open={open}
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

function PlanetCard({
  world,
  done,
  total,
  pct,
  accent,
  delay,
  onEdit,
  onRemove,
}: {
  world: World
  done: number
  total: number
  pct: number
  accent: (typeof ACCENT)[keyof typeof ACCENT]
  delay: number
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <article
      className="rise group relative flex flex-col overflow-hidden rounded-[16px] border border-line bg-surface transition-colors duration-150 hover:border-faint/50"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Imagem do planeta */}
      <div className="relative h-[140px] overflow-hidden bg-raised">
        <img
          src={`/assets/planets/${world.id}-banner.jpg`}
          alt={world.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        {/* Overlay gradient sempre presente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Barra de acento no topo */}
        <span className={`absolute inset-x-0 top-0 h-[3px] ${accent.bar}`} aria-hidden />

        {/* Ações no hover */}
        <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Editar ${world.name}`}
            className="grid size-7 place-items-center rounded-[8px] bg-black/40 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/60"
          >
            <Pencil size={13} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Excluir ${world.name}`}
            className="grid size-7 place-items-center rounded-[8px] bg-black/40 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-red-500/80"
          >
            <Trash2 size={13} aria-hidden />
          </button>
        </div>

        {/* Ícone e nome sobre a imagem */}
        <div className="absolute bottom-0 left-0 p-3">
          <div className="flex items-center gap-2">
            <span
              className={`grid size-7 place-items-center rounded-[8px] text-[14px] ${accent.soft}`}
              aria-hidden
            >
              {world.icon}
            </span>
            <h2 className="text-[14px] font-semibold text-white drop-shadow">
              {world.name}
            </h2>
          </div>
        </div>
      </div>

      {/* Corpo do card */}
      <div className="flex flex-1 flex-col p-4">
        {world.description && (
          <p className="mb-3 line-clamp-2 text-[12px] text-muted">{world.description}</p>
        )}

        <div className="mt-auto">
          <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
            <span className="text-faint">
              {total === 0
                ? 'Sem missões'
                : `${done} de ${total} concluídas`}
            </span>
            {total > 0 && (
              <span className={`font-semibold tabular-nums ${accent.text}`}>
                {pct}%
              </span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-raised">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${accent.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

function WorldForm({
  open,
  world,
  busy,
  onSave,
  onClose,
}: {
  open: boolean
  world: World | null
  busy: boolean
  onSave: (draft: WorldDraft) => void
  onClose: () => void
}) {
  const initial = useMemo<WorldDraft>(
    () =>
      world
        ? {
            name: world.name,
            description: world.description,
            icon: world.icon,
            accent: world.accent,
          }
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
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy}>
            {world ? 'Salvar' : 'Mapear planeta'}
          </Button>
        </>
      }
    >
      <div key={key} className="flex flex-col gap-4">
        <Field label="Nome" error={nameError}>
          {(id) => (
            <Input
              id={id}
              value={draft.name}
              placeholder="Trabalho, Estudos, Casa..."
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          )}
        </Field>

        <Field label="Descrição" hint="Opcional.">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={draft.description ?? ''}
              placeholder="O que você gerencia neste planeta?"
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value || null })
              }
            />
          )}
        </Field>

        <Field label="Ícone">
          {() => (
            <div className="flex flex-wrap gap-1.5">
              {WORLD_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setDraft({ ...draft, icon })}
                  aria-label={`Ícone ${icon}`}
                  aria-pressed={draft.icon === icon}
                  className={`grid size-9 place-items-center rounded-[10px] text-[17px] transition-colors duration-150 ${
                    draft.icon === icon
                      ? 'bg-interactive ring-2 ring-azure'
                      : 'bg-raised hover:bg-interactive'
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
            <Select
              id={id}
              value={draft.accent}
              onChange={(e) =>
                setDraft({ ...draft, accent: e.target.value as WorldAccent })
              }
            >
              {ACCENT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ACCENT[key].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </Modal>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[220px] animate-pulse rounded-[16px] border border-line bg-surface"
        />
      ))}
    </div>
  )
}
