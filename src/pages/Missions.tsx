import { useMemo, useState } from 'react'
import { CalendarDays, Coins, Pencil, Plus, Radar, Trash2 } from 'lucide-react'
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
import type { Mission, Priority, World } from '../types/database'

type Tab = 'open' | 'done' | 'all'

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

  const [tab, setTab] = useState<Tab>('open')
  const [worldFilter, setWorldFilter] = useState<string>('')
  const [editing, setEditing] = useState<Mission | null>(null)
  const [composing, setComposing] = useState(false)
  const [removing, setRemoving] = useState<Mission | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  const visible = useMemo(
    () =>
      missions.filter((m) => {
        const byTab =
          tab === 'all' ? true : tab === 'done' ? m.status === 'done' : m.status === 'open'
        const byWorld = !worldFilter || m.world_id === worldFilter
        return byTab && byWorld
      }),
    [missions, tab, worldFilter],
  )

  const counts = useMemo(
    () => ({
      open: missions.filter((m) => m.status === 'open').length,
      done: missions.filter((m) => m.status === 'done').length,
      all: missions.length,
    }),
    [missions],
  )

  async function save(draft: MissionDraft) {
    if (!session) return
    setBusy(true)
    try {
      const saved = editing
        ? await updateMission(editing.id, draft)
        : await createMission(session.user.id, draft)
      putMission(saved)
      toast('success', editing ? 'Missao atualizada.' : 'Missao registrada.')
      setComposing(false)
      setEditing(null)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Nao foi possivel salvar.')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(mission: Mission) {
    if (!playerState || pending) return
    setPending(mission.id)
    try {
      const result = await toggleMission(mission, playerState, missions)
      putMission(result.mission)
      applyPlayerState(result.state)

      if (result.crewNote) toast('info', result.crewNote)

      if (result.leveledUpTo) {
        toast('reward', `Autonomia ${result.leveledUpTo}. A Andarilha alcanca mais longe.`)
      } else if (result.xpGained > 0) {
        toast(
          'reward',
          `+${result.xpGained} dados de exploracao · +${result.creditsGained} creditos`,
        )
      } else if (result.mission.status === 'open') {
        toast('info', 'Missao reaberta.')
      }
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Nao foi possivel concluir.')
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
      toast('info', 'Missao excluida.')
      setRemoving(null)
      setEditing(null)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Nao foi possivel excluir.')
    } finally {
      setBusy(false)
    }
  }

  const noWorlds = worlds.length === 0

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 md:px-10 md:py-12">
      <SectionHeader
        title="Missoes"
        note="Tudo que a tripulacao ainda tem para fazer."
        action={
          <Button onClick={() => setComposing(true)} disabled={noWorlds}>
            <Plus size={15} aria-hidden />
            Nova missao
          </Button>
        }
      />

      {noWorlds && !loading ? (
        <div className="rounded-[16px] border border-line bg-surface">
          <EmptyState
            icon={Radar}
            title="Mapeie um planeta primeiro"
            note="Toda missao pertence a um planeta. Crie um em Planetas e volte aqui."
          />
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="Filtrar por estado"
              className="flex gap-0.5 rounded-[10px] bg-raised p-1"
            >
              {(
                [
                  ['open', 'Abertas', counts.open],
                  ['done', 'Concluidas', counts.done],
                  ['all', 'Todas', counts.all],
                ] as const
              ).map(([key, label, n]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                    tab === key
                      ? 'bg-surface text-text lift'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {label}
                  <span className="ml-1.5 tabular-nums text-faint">{n}</span>
                </button>
              ))}
            </div>

            <Select
              aria-label="Filtrar por planeta"
              value={worldFilter}
              onChange={(e) => setWorldFilter(e.target.value)}
              className="ml-auto w-auto min-w-[168px]"
            >
              <option value="">Todos os planetas</option>
              {worlds.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.icon} {w.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="overflow-hidden rounded-[16px] border border-line bg-surface">
            {loading ? (
              <div className="h-48 animate-pulse bg-surface" aria-hidden />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Radar}
                title={
                  tab === 'done' ? 'Nada concluido ainda' : 'Nenhuma missao aqui'
                }
                note={
                  tab === 'done'
                    ? 'Conclua uma missao e ela aparece neste registro.'
                    : 'Registre uma missao ou troque o filtro.'
                }
                action={
                  tab !== 'done' ? (
                    <Button variant="secondary" onClick={() => setComposing(true)}>
                      <Plus size={15} aria-hidden />
                      Nova missao
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {visible.map((mission) => (
                  <MissionRow
                    key={mission.id}
                    mission={mission}
                    world={worlds.find((w) => w.id === mission.world_id) ?? null}
                    pending={pending === mission.id}
                    onToggle={() => toggle(mission)}
                    onEdit={() => setEditing(mission)}
                  />
                ))}
              </ul>
            )}
          </div>
        </>
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
        title="Excluir missao?"
        message={`"${removing?.title}" sera removida do registro. Isso nao pode ser desfeito.`}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </main>
  )
}

function MissionRow({
  mission,
  world,
  pending,
  onToggle,
  onEdit,
}: {
  mission: Mission
  world: World | null
  pending: boolean
  onToggle: () => void
  onEdit: () => void
}) {
  const done = mission.status === 'done'
  const accent = world ? (ACCENT[world.accent] ?? ACCENT.azure) : null
  const overdue =
    !done && mission.due_date && mission.due_date < new Date().toISOString().slice(0, 10)

  return (
    <li className="group flex items-start gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-raised/60">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Reabrir ${mission.title}` : `Concluir ${mission.title}`}
        className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-2 transition-all duration-150 disabled:opacity-50 ${
          done
            ? 'border-good bg-good text-white'
            : 'border-line hover:border-azure hover:bg-azure/10'
        }`}
      >
        {done && (
          <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
            <path
              d="M2 6.2 4.6 8.8 10 3.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[14px] leading-snug ${
            done ? 'text-faint line-through' : 'text-text'
          }`}
        >
          {mission.title}
        </p>
        {mission.description && !done && (
          <p className="mt-0.5 line-clamp-1 text-[12px] text-faint">
            {mission.description}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {world && accent && (
            <span className="flex items-center gap-1.5 text-[12px] text-muted">
              <span className={`size-1.5 rounded-full ${accent.dot}`} aria-hidden />
              {world.name}
            </span>
          )}
          {!done && (
            <Badge tone={PRIORITY_TONE[mission.priority]}>
              {PRIORITY_LABEL[mission.priority]}
            </Badge>
          )}
          {mission.due_date && (
            <span
              className={`flex items-center gap-1 text-[12px] ${
                overdue ? 'font-medium text-bad' : 'text-faint'
              }`}
            >
              <CalendarDays size={12} aria-hidden />
              {formatDate(mission.due_date)}
            </span>
          )}
          {!done && mission.reward > 0 && (
            <span className="flex items-center gap-1 text-[12px] text-faint">
              <Coins size={12} aria-hidden />
              {mission.reward}
            </span>
          )}
        </div>
      </div>

      <div className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
        <IconButton label={`Editar ${mission.title}`} icon={Pencil} onClick={onEdit} />
      </div>
    </li>
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
      title={mission ? 'Editar missao' : 'Nova missao'}
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
        <Field label="Missao" error={titleError}>
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
                <option value="mid">Media</option>
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

          <Field label="Creditos" hint="Recompensa ao concluir.">
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

function formatDate(iso: string): string {
  // 'T12:00' evita que o fuso empurre a data um dia para trás: uma
  // data pura interpretada como UTC vira "ontem" a oeste de Greenwich.
  return new Date(`${iso}T12:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}
