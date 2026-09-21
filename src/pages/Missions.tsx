import { useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronRight,
  Coins,
  Pencil,
  Plus,
  Radar,
  Trash2,
} from 'lucide-react'
import { Button, IconButton } from '../components/Button'
import { Badge, ConfirmDialog, EmptyState, SectionHeader } from '../components/Bits'
import { Field, Input, Select, Textarea } from '../components/Field'
import { Modal } from '../components/Modal'
import { useAuth } from '../hooks/AuthProvider'
import { useGame } from '../hooks/GameProvider'
import { useToast } from '../hooks/ToastProvider'
import {
  createMission,
  deleteMission,
  toggleMission,
  updateMission,
  type MissionDraft,
} from '../services/missionService'
import { ACCENT, PRIORITY_LABEL } from '../data/gameConfig'
import type { Mission, MissionStatus, Priority, World } from '../types/database'

type KanbanCol = {
  key: MissionStatus
  label: string
  color: string
  dot: string
}

const COLUMNS: KanbanCol[] = [
  { key: 'open',        label: 'A fazer',      color: 'text-faint',  dot: 'bg-faint' },
  { key: 'in_progress', label: 'Em andamento',  color: 'text-azure',  dot: 'bg-azure' },
  { key: 'review',      label: 'Em revisão',    color: 'text-ember',  dot: 'bg-ember' },
  { key: 'done',        label: 'Concluídas',    color: 'text-good',   dot: 'bg-good'  },
]

const BLANK: MissionDraft = {
  title: '',
  description: null,
  world_id: null,
  priority: 'mid',
  due_date: null,
  reward: 10,
}

const PRIORITY_TONE: Record<Priority, 'bad' | 'ember' | 'good'> = {
  high: 'bad',
  mid: 'ember',
  low: 'good',
}

export default function Missions() {
  const { session, playerState, applyPlayerState } = useAuth()
  const { worlds, missions, putMission, dropMission, loading } = useGame()
  const toast = useToast()

  const [worldFilter, setWorldFilter] = useState<string>('')
  const [editing, setEditing] = useState<Mission | null>(null)
  const [composing, setComposing] = useState(false)
  const [removing, setRemoving] = useState<Mission | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  // Missões agrupadas por coluna, com filtro de planeta aplicado
  const byStatus = useMemo(() => {
    const filtered = worldFilter
      ? missions.filter((m) => m.world_id === worldFilter)
      : missions

    return Object.fromEntries(
      COLUMNS.map((col) => [
        col.key,
        filtered.filter((m) => m.status === col.key),
      ]),
    ) as Record<MissionStatus, Mission[]>
  }, [missions, worldFilter])

  async function save(draft: MissionDraft) {
    if (!session) return
    setBusy(true)
    try {
      const saved = editing
        ? await updateMission(editing.id, draft)
        : await createMission(session.user.id, draft)
      putMission(saved)
      toast('success', editing ? 'Missão atualizada.' : 'Missão registrada.')
      setComposing(false)
      setEditing(null)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  // Move missão para o próximo status na sequência do Kanban
  async function advance(mission: Mission) {
    if (pending) return
    const cols = COLUMNS.map((c) => c.key)
    const idx = cols.indexOf(mission.status)
    if (idx === -1 || idx >= cols.length - 1) return

    const nextStatus = cols[idx + 1]

    // Quando avança para 'done', usa o fluxo existente de recompensa
    if (nextStatus === 'done') {
      if (!playerState) return
      setPending(mission.id)
      try {
        const result = await toggleMission(mission, playerState, missions)
        putMission(result.mission)
        applyPlayerState(result.state)
        if (result.crewNote) toast('info', result.crewNote)
        if (result.leveledUpTo) {
          toast('reward', `Autonomia ${result.leveledUpTo}. A Andarilha alcança mais longe.`)
        } else if (result.xpGained > 0) {
          toast('reward', `+${result.xpGained} dados de exploração · +${result.creditsGained} créditos`)
        }
      } catch (e) {
        toast('error', e instanceof Error ? e.message : 'Não foi possível concluir.')
      } finally {
        setPending(null)
      }
      return
    }

    // Para os outros status, atualiza só o campo status
    setPending(mission.id)
    try {
      const saved = await updateMission(mission.id, {
        title: mission.title,
        description: mission.description,
        world_id: mission.world_id,
        priority: mission.priority,
        due_date: mission.due_date,
        reward: mission.reward,
        status: nextStatus,
      })
      putMission(saved)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível mover.')
    } finally {
      setPending(null)
    }
  }

  // Reabrir missão concluída (done → open)
  async function reopen(mission: Mission) {
    if (!playerState || pending) return
    setPending(mission.id)
    try {
      const result = await toggleMission(mission, playerState, missions)
      putMission(result.mission)
      applyPlayerState(result.state)
      toast('info', 'Missão reaberta.')
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível reabrir.')
    } finally {
      setPending(null)
    }
  }

  async function confirmRemove() {
    if (!removing) return
    setBusy(true)
    try {
      await deleteMission(removing.id)
      dropMission(removing.id)
      toast('info', 'Missão excluída.')
      setRemoving(null)
      setEditing(null)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível excluir.')
    } finally {
      setBusy(false)
    }
  }

  const noWorlds = worlds.length === 0

  return (
    <main className="flex h-full flex-col px-5 py-8 md:px-10 md:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="display text-[22px] text-text">Missões</h1>
          <p className="mt-1 text-[13px] text-muted">
            Organize, acompanhe e conclua suas missões.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {worlds.length > 0 && (
            <Select
              aria-label="Filtrar por planeta"
              value={worldFilter}
              onChange={(e) => setWorldFilter(e.target.value)}
              className="w-auto min-w-[160px]"
            >
              <option value="">Todos os planetas</option>
              {worlds.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.icon} {w.name}
                </option>
              ))}
            </Select>
          )}
          <Button onClick={() => setComposing(true)} disabled={noWorlds}>
            <Plus size={15} aria-hidden />
            Nova missão
          </Button>
        </div>
      </div>

      {noWorlds && !loading ? (
        <div className="rounded-[16px] border border-line bg-surface">
          <EmptyState
            icon={Radar}
            title="Mapeie um planeta primeiro"
            note="Toda missão pertence a um planeta. Crie um em Planetas e volte aqui."
          />
        </div>
      ) : (
        /* Kanban — scroll horizontal em mobile */
        <div className="min-h-0 flex-1 overflow-x-auto">
          <div className="flex h-full gap-4" style={{ minWidth: 'max(100%, 900px)' }}>
            {COLUMNS.map((col) => {
              const cards = byStatus[col.key] ?? []
              return (
                <div
                  key={col.key}
                  className="flex w-[calc(25%-12px)] min-w-[220px] flex-1 flex-col"
                >
                  {/* Cabeçalho da coluna */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`size-2 rounded-full ${col.dot}`} aria-hidden />
                    <h2 className={`text-[13px] font-semibold ${col.color}`}>
                      {col.label}
                    </h2>
                    <span className="ml-auto rounded-full bg-raised px-2 py-0.5 text-[11px] tabular-nums text-faint">
                      {cards.length}
                    </span>
                  </div>

                  {/* Coluna com scroll independente */}
                  <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-[14px] bg-raised/50 p-2">
                    {loading ? (
                      <SkeletonCards />
                    ) : cards.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center py-8">
                        <p className="text-[12px] text-faint">Vazio</p>
                      </div>
                    ) : (
                      cards.map((mission) => (
                        <KanbanCard
                          key={mission.id}
                          mission={mission}
                          world={worlds.find((w) => w.id === mission.world_id) ?? null}
                          pending={pending === mission.id}
                          isDone={col.key === 'done'}
                          onAdvance={() => advance(mission)}
                          onReopen={() => reopen(mission)}
                          onEdit={() => setEditing(mission)}
                        />
                      ))
                    )}

                    {/* Botão rápido de nova missão na coluna "A fazer" */}
                    {col.key === 'open' && !loading && (
                      <button
                        type="button"
                        onClick={() => setComposing(true)}
                        disabled={noWorlds}
                        className="mt-1 flex w-full items-center gap-2 rounded-[10px] border border-dashed border-line px-3 py-2 text-[12px] text-faint transition-colors duration-150 hover:border-azure/40 hover:text-azure disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={13} aria-hidden />
                        Nova missão
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <MissionForm
        open={composing || editing !== null}
        mission={editing}
        worlds={worlds}
        busy={busy}
        onSave={save}
        onDelete={editing ? () => setRemoving(editing) : undefined}
        onClose={() => {
          setComposing(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        busy={busy}
        title="Excluir missão?"
        message={`"${removing?.title}" será removida do registro. Isso não pode ser desfeito.`}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </main>
  )
}

function KanbanCard({
  mission,
  world,
  pending,
  isDone,
  onAdvance,
  onReopen,
  onEdit,
}: {
  mission: Mission
  world: World | null
  pending: boolean
  isDone: boolean
  onAdvance: () => void
  onReopen: () => void
  onEdit: () => void
}) {
  const accent = world ? (ACCENT[world.accent] ?? ACCENT.azure) : null
  const overdue =
    !isDone &&
    mission.due_date &&
    mission.due_date < new Date().toISOString().slice(0, 10)

  return (
    <article
      className={`group relative flex flex-col gap-2 rounded-[12px] border bg-surface p-3 transition-all duration-150 hover:shadow-sm ${
        isDone ? 'opacity-70' : 'border-line'
      } ${pending ? 'opacity-50' : ''}`}
    >
      {/* Título */}
      <p
        className={`text-[13px] font-medium leading-snug ${
          isDone ? 'text-faint line-through' : 'text-text'
        }`}
      >
        {mission.title}
      </p>

      {/* Planeta */}
      {world && accent && (
        <div className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${accent.dot}`} aria-hidden />
          <span className="text-[11px] text-muted">{world.name}</span>
        </div>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {!isDone && (
          <Badge tone={PRIORITY_TONE[mission.priority]}>
            {PRIORITY_LABEL[mission.priority]}
          </Badge>
        )}
        {mission.due_date && (
          <span
            className={`flex items-center gap-1 text-[11px] ${
              overdue ? 'font-medium text-bad' : 'text-faint'
            }`}
          >
            <CalendarDays size={11} aria-hidden />
            {new Date(`${mission.due_date}T12:00`).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}
          </span>
        )}
        {!isDone && mission.reward > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-faint">
            <Coins size={11} aria-hidden />
            {mission.reward}
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${mission.title}`}
          className="grid size-6 place-items-center rounded-[6px] text-faint opacity-0 transition-all duration-150 hover:bg-raised hover:text-text group-hover:opacity-100 focus:opacity-100"
        >
          <Pencil size={12} aria-hidden />
        </button>

        {isDone ? (
          <button
            type="button"
            onClick={onReopen}
            disabled={pending}
            className="text-[11px] text-faint transition-colors duration-150 hover:text-azure disabled:opacity-40"
          >
            Reabrir
          </button>
        ) : (
          <button
            type="button"
            onClick={onAdvance}
            disabled={pending}
            className="flex items-center gap-1 rounded-[6px] bg-raised px-2 py-1 text-[11px] font-medium text-muted transition-colors duration-150 hover:bg-interactive hover:text-text disabled:opacity-40"
          >
            Avançar
            <ChevronRight size={11} aria-hidden />
          </button>
        )}
      </div>
    </article>
  )
}

function MissionForm({
  open,
  mission,
  worlds,
  busy,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean
  mission: Mission | null
  worlds: World[]
  busy: boolean
  onSave: (draft: MissionDraft) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const initial = useMemo<MissionDraft>(
    () =>
      mission
        ? {
            title: mission.title,
            description: mission.description,
            world_id: mission.world_id,
            priority: mission.priority,
            due_date: mission.due_date,
            reward: mission.reward,
          }
        : { ...BLANK, world_id: worlds[0]?.id ?? null },
    [mission, worlds],
  )

  const [draft, setDraft] = useState<MissionDraft>(initial)
  const [touched, setTouched] = useState(false)
  const [key, setKey] = useState(0)
  useMemo(() => {
    setDraft(initial)
    setTouched(false)
    setKey((n) => n + 1)
  }, [initial])

  const titleError =
    touched && !draft.title.trim() ? 'Descreva o que precisa ser feito.' : undefined

  function submit() {
    setTouched(true)
    if (!draft.title.trim()) return
    onSave({ ...draft, title: draft.title.trim() })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mission ? 'Editar missão' : 'Nova missão'}
      footer={
        <>
          {onDelete && (
            <Button variant="danger" onClick={onDelete} disabled={busy} className="mr-auto">
              <Trash2 size={14} aria-hidden />
              Excluir
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy}>
            {mission ? 'Salvar' : 'Registrar'}
          </Button>
        </>
      }
    >
      <div key={key} className="flex flex-col gap-4">
        <Field label="Missão" error={titleError}>
          {(id) => (
            <Input
              id={id}
              value={draft.title}
              placeholder="O que precisa ser feito?"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          )}
        </Field>

        <Field label="Detalhes" hint="Opcional.">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={draft.description ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value || null })
              }
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Planeta">
            {(id) => (
              <Select
                id={id}
                value={draft.world_id ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, world_id: e.target.value || null })
                }
              >
                <option value="">Sem planeta</option>
                {worlds.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon} {w.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Prioridade">
            {(id) => (
              <Select
                id={id}
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: e.target.value as Priority })
                }
              >
                <option value="low">Baixa</option>
                <option value="mid">Média</option>
                <option value="high">Alta</option>
              </Select>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Prazo" hint="Opcional.">
            {(id) => (
              <Input
                id={id}
                type="date"
                value={draft.due_date ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, due_date: e.target.value || null })
                }
              />
            )}
          </Field>

          <Field label="Créditos" hint="Recompensa ao concluir.">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                max={200}
                value={draft.reward}
                onChange={(e) =>
                  setDraft({ ...draft, reward: Number(e.target.value) || 0 })
                }
              />
            )}
          </Field>
        </div>
      </div>
    </Modal>
  )
}

function SkeletonCards() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[88px] animate-pulse rounded-[12px] border border-line bg-surface"
        />
      ))}
    </>
  )
}
