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
      toast('error', e instanceof Error ? e.message : 'Nao foi possivel salvar.')
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
      toast('info', `"${removing.name}" foi desmapeado. As missoes continuam no registro.`)
      setRemoving(null)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Nao foi possivel excluir.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
      <SectionHeader
        title="Planetas"
        note="Cada planeta agrupa um tipo de missao."
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
            note="Planetas sao as categorias das suas missoes — trabalho, estudo, casa, o que fizer sentido para voce."
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
              <article
                key={world.id}
                className="rise group relative flex flex-col overflow-hidden rounded-[16px] border border-line bg-surface p-5 transition-colors duration-150 hover:border-faint/50"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span
                  className={`absolute inset-x-0 top-0 h-[3px] ${accent.bar}`}
                  aria-hidden
                />

                <div className="mb-3 flex items-start justify-between">
                  <span
                    className={`grid size-10 place-items-center rounded-[12px] text-[19px] ${accent.soft}`}
                    aria-hidden
                  >
                    {world.icon}
                  </span>
                  {/* Ações aparecem no hover mas continuam alcançáveis
                      por teclado e sempre visíveis no toque. */}
                  <div className="flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
                    <IconButton
                      label={`Editar ${world.name}`}
                      icon={Pencil}
                      onClick={() => start(world)}
                    />
                    <IconButton
                      label={`Excluir ${world.name}`}
                      icon={Trash2}
                      onClick={() => setRemoving(world)}
                    />
                  </div>
                </div>

                <h2 className="text-[15px] font-semibold text-text">{world.name}</h2>
                {world.description && (
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted">
                    {world.description}
                  </p>
                )}

                <div className="mt-auto pt-5">
                  <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
                    <span className="text-faint">
                      {mine.length === 0
                        ? 'Sem missoes'
                        : `${done} de ${mine.length} concluidas`}
                    </span>
                    {mine.length > 0 && (
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
              </article>
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
        message="As missoes deste planeta nao serao apagadas — elas ficam no registro sem planeta, e voce pode reatribui-las depois."
        confirmLabel="Desmapear"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </main>
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
  // Remonta o formulário quando o alvo muda: sem isto, abrir "editar"
  // logo após "criar" mostraria o rascunho anterior.
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
      subtitle={
        world ? undefined : 'Planetas agrupam missoes por contexto.'
      }
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

        <Field label="Descricao" hint="Opcional.">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={draft.description ?? ''}
              placeholder="O que voce gerencia neste planeta?"
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value || null })
              }
            />
          )}
        </Field>

        <Field label="Icone">
          {() => (
            <div className="flex flex-wrap gap-1.5">
              {WORLD_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setDraft({ ...draft, icon })}
                  aria-label={`Icone ${icon}`}
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
          className="h-[168px] animate-pulse rounded-[16px] border border-line bg-surface"
        />
      ))}
    </div>
  )
}
