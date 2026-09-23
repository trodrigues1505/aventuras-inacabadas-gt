import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Coins,
  ExternalLink,
  Link2,
  Lock,
  Pencil,
  Plus,
  Radar,
  RefreshCw,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '../components/Button'
import { Badge, ConfirmDialog, EmptyState } from '../components/Bits'
import { Field, Input, Select, Textarea } from '../components/Field'
import { Modal } from '../components/Modal'
import { useAuth } from '../hooks/AuthProvider'
import { useGame } from '../hooks/GameProvider'
import { useToast } from '../hooks/ToastProvider'
import {
  createLink,
  createMission,
  createSubtask,
  createTag,
  deleteMission,
  deleteLink,
  deleteSubtask,
  listLinks,
  listMissionTags,
  listSubtasks,
  listTags,
  setMissionTags,
  toggleMission,
  toggleSubtask,
  updateMission,
  type MissionDraft,
} from '../services/missionService'
import { ACCENT, CREDITS_BY_PRIORITY, PRIORITY_LABEL, XP_BY_PRIORITY } from '../data/gameConfig'
import type { Mission, MissionLink, MissionStatus, MissionType, Priority, Recurrence, Subtask, Tag as TagType, World } from '../types/database'

type KanbanCol = { key: MissionStatus; label: string; color: string; dot: string; sub: string; img: string }

const COLUMNS: KanbanCol[] = [
  { key: 'open',        label: 'Mapeadas',      color: 'text-faint',  dot: 'bg-faint', sub: 'Missões identificadas e prontas para iniciar.', img: 'assets/kanban/kanban-header-mapeadas.webp' },
  { key: 'in_progress', label: 'Em Curso',       color: 'text-azure',  dot: 'bg-azure', sub: 'Missões em andamento.',                         img: 'assets/kanban/kanban-header-em-curso.webp' },
  { key: 'review',      label: 'Para Confirmar', color: 'text-ember',  dot: 'bg-ember', sub: 'Aguardando validação ou próximos passos.',       img: 'assets/kanban/kanban-header-para-confirmar.webp' },
  { key: 'done',        label: 'Arquivadas',     color: 'text-good',   dot: 'bg-good',  sub: 'Missões concluídas ou canceladas.',              img: 'assets/kanban/kanban-header-arquivadas.webp' },
]

const PRIORITY_TONE: Record<Priority, 'bad' | 'ember' | 'good'> = {
  high: 'bad', mid: 'ember', low: 'good',
}

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal', custom: 'Personalizada',
}

const MISSION_TYPE_ICON: Record<MissionType, string> = {
  rotina: '📦',
  operacao: '💾',
  emergencia: '📡',
}

const MISSION_TYPE_TOOLTIP: Record<MissionType, string> = {
  rotina: 'Rotina · gera Suprimentos',
  operacao: 'Operação · gera Dados',
  emergencia: 'Emergência · gera Pulsos',
}

const BLANK: MissionDraft = {
  title: '', description: null, world_id: null,
  priority: 'mid', type: 'operacao', due_date: null, estimated_minutes: null,
  recurrence: null, recurrence_days: null, depends_on: null,
}

export default function Missions() {
  const { session, playerState, applyPlayerState } = useAuth()
  const { worlds, missions, putMission, dropMission, loading } = useGame()
  const toast = useToast()

  const [worldFilter, setWorldFilter] = useState('')
  const [editing, setEditing] = useState<Mission | null>(null)
  const [composing, setComposing] = useState(false)
  const [removing, setRemoving] = useState<Mission | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  const byStatus = useMemo(() => {
    const filtered = worldFilter
      ? missions.filter((m) => m.world_id === worldFilter)
      : missions
    return Object.fromEntries(
      COLUMNS.map((col) => [col.key, filtered.filter((m) => m.status === col.key)]),
    ) as Record<MissionStatus, Mission[]>
  }, [missions, worldFilter])

  // Verifica se missão está bloqueada por dependência
  function isBlocked(mission: Mission): boolean {
    if (!mission.depends_on) return false
    const dep = missions.find((m) => m.id === mission.depends_on)
    return dep ? dep.status !== 'done' : false
  }

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

  async function advance(mission: Mission) {
    if (pending || isBlocked(mission)) return
    const cols = COLUMNS.map((c) => c.key)
    const idx = cols.indexOf(mission.status)
    if (idx === -1 || idx >= cols.length - 1) return
    const nextStatus = cols[idx + 1]

    if (nextStatus === 'done') {
      if (!playerState) return
      setPending(mission.id)
      try {
        const result = await toggleMission(mission, playerState, missions)
        putMission(result.mission)
        applyPlayerState(result.state)
        if (result.crewNote) toast('info', result.crewNote)
        if (result.planetNote) toast('info', result.planetNote)
        if (result.leveledUpTo) {
          toast('reward', `Autonomia ${result.leveledUpTo}. A Andarilha alcança mais longe.`)
        } else if (result.xpGained > 0) {
          toast('reward', `+${result.xpGained} XP · +${result.creditsGained} créditos`)
        }
      } catch (e) {
        toast('error', e instanceof Error ? e.message : 'Não foi possível concluir.')
      } finally {
        setPending(null)
      }
      return
    }

    setPending(mission.id)
    try {
      const saved = await updateMission(mission.id, { status: nextStatus })
      putMission(saved)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível mover.')
    } finally {
      setPending(null)
    }
  }

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
    <main className="flex h-full flex-col">
      {/* ── Filtros ──────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3 px-5 pt-4 md:px-8">
        {worlds.length > 0 && (
          <Select aria-label="Filtrar por planeta" value={worldFilter} onChange={(e) => setWorldFilter(e.target.value)} className="w-auto min-w-[160px]">
            <option value="">Todos os planetas</option>
            {worlds.map((w) => (
              <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
            ))}
          </Select>
        )}
        <div className="ml-auto">
          <Button onClick={() => setComposing(true)} disabled={noWorlds}>
            <Plus size={15} aria-hidden />
            Nova missão
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-5 pb-4 md:px-8">


      {noWorlds && !loading ? (
        <div className="rounded-[16px] border border-line bg-surface">
          <EmptyState
            icon={Radar}
            title="Mapeie um planeta primeiro"
            note="Toda missão pertence a um planeta. Crie um em Planetas e volte aqui."
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto">
          <div className="flex h-full gap-4" style={{ minWidth: 'max(100%, 900px)' }}>
            {COLUMNS.map((col) => {
              const cards = byStatus[col.key] ?? []
              return (
                <div
                  key={col.key}
                  className="flex w-[calc(25%-12px)] min-w-[220px] flex-1 flex-col"
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                  onDrop={async (e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('mission-id')
                    if (!id) return
                    const m = missions.find((x) => x.id === id)
                    if (!m || m.status === col.key) return
                    // Se droppou em "done", usa toggleMission para dar recompensa
                    if (col.key === 'done') {
                      if (!playerState) return
                      setPending(id)
                      try {
                        const result = await toggleMission(m, playerState, missions)
                        putMission(result.mission)
                        applyPlayerState(result.state)
                        if (result.crewNote) toast('info', result.crewNote)
                        if (result.planetNote) toast('info', result.planetNote)
                        if (result.leveledUpTo) toast('reward', `Autonomia ${result.leveledUpTo}. A Andarilha alcança mais longe.`)
                        else if (result.xpGained > 0) toast('reward', `+${result.xpGained} XP · +${result.creditsGained} créditos`)
                      } catch (err) { toast('error', err instanceof Error ? err.message : 'Erro') }
                      finally { setPending(null) }
                    } else {
                      // Apenas muda status
                      try {
                        const updated = await updateMission(id, { status: col.key })
                        putMission(updated)
                      } catch (err) { toast('error', err instanceof Error ? err.message : 'Erro') }
                    }
                  }}
                >
                  <div className="mb-3 overflow-hidden rounded-[12px] border border-line">
                    <div className="relative h-[72px] overflow-hidden">
                      <img src={col.img} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" aria-hidden />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }} />
                      <div className="absolute bottom-0 left-0 flex w-full items-end justify-between px-3 pb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`size-2 rounded-full ${col.dot}`} aria-hidden />
                            <h2 className="text-[13px] font-semibold text-white">{col.label}</h2>
                          </div>
                          <p className="text-[10px] text-white/60">{col.sub}</p>
                        </div>
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] tabular-nums text-white backdrop-blur-sm">
                          {cards.length}
                        </span>
                      </div>
                    </div>
                  </div>

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
                          blocked={isBlocked(mission)}
                          blockedBy={missions.find((m) => m.id === mission.depends_on) ?? null}
                          onAdvance={() => advance(mission)}
                          onReopen={() => reopen(mission)}
                          onEdit={() => setEditing(mission)}
                        />
                      ))
                    )}

                    {col.key !== 'done' && !loading && (
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

      </div>{/* fim da área de kanban com px */}

      <MissionForm
        key={editing?.id ?? (composing ? 'new' : 'closed')}
        open={composing || editing !== null}
        mission={editing}
        worlds={worlds}
        allMissions={missions}
        busy={busy}
        userId={session?.user.id ?? ''}
        onSave={save}
        onDelete={editing ? () => setRemoving(editing) : undefined}
        onClose={() => { setComposing(false); setEditing(null) }}
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

// ─── Kanban Card ─────────────────────────────────────────────────

function KanbanCard({
  mission, world, pending, isDone, blocked, blockedBy,
  onAdvance, onReopen, onEdit,
}: {
  mission: Mission
  world: World | null
  pending: boolean
  isDone: boolean
  blocked: boolean
  blockedBy: Mission | null
  onAdvance: () => void
  onReopen: () => void
  onEdit: () => void
}) {
  const accent = world ? (ACCENT[world.accent] ?? ACCENT.azure) : null
  const overdue = !isDone && mission.due_date &&
    mission.due_date < new Date().toISOString().slice(0, 10)

  return (
    <article
      draggable={!isDone && !blocked}
      onDragStart={(e) => {
        e.dataTransfer.setData('mission-id', mission.id)
        e.dataTransfer.effectAllowed = 'move'
        ;(e.currentTarget as HTMLElement).style.opacity = '0.4'
      }}
      onDragEnd={(e) => { (e.currentTarget as HTMLElement).style.opacity = '' }}
      className={`group relative flex flex-col gap-2 rounded-[12px] border bg-surface p-3 transition-all duration-150 hover:shadow-sm ${
        isDone ? 'opacity-60 border-line' :
        blocked ? 'border-faint/40 bg-raised/60' : 'border-line'
      } ${pending ? 'opacity-50' : ''} ${!isDone && !blocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {blocked && (
        <div className="flex items-center gap-1.5 rounded-[6px] bg-ember/10 px-2 py-1">
          <Lock size={10} className="text-ember" aria-hidden />
          <span className="text-[11px] text-ember">
            Aguarda: {blockedBy?.title ?? '…'}
          </span>
        </div>
      )}

      <div className="flex gap-2.5">
        {world?.planet_image && (
          <img
            src={`assets/planets/${world.planet_image}-esferico.webp`}
            alt=""
            className="mt-0.5 size-9 shrink-0 rounded-full object-cover"
            loading="lazy"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-medium leading-snug ${
            isDone ? 'text-faint line-through' : blocked ? 'text-muted' : 'text-text'
          }`}>
            {mission.title}
          </p>
          {world && accent && (
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${accent.dot}`} aria-hidden />
              <span className="text-[11px] text-muted">{world.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {!isDone && mission.type && (
          <span
            title={MISSION_TYPE_TOOLTIP[mission.type]}
            className="text-[13px] leading-none"
            aria-label={MISSION_TYPE_TOOLTIP[mission.type]}
          >
            {MISSION_TYPE_ICON[mission.type]}
          </span>
        )}
        {!isDone && (
          <Badge tone={PRIORITY_TONE[mission.priority]}>
            {PRIORITY_LABEL[mission.priority]}
          </Badge>
        )}
        {mission.due_date && (
          <span className={`flex items-center gap-1 text-[11px] ${
            overdue ? 'font-medium text-bad' : 'text-faint'
          }`}>
            <CalendarDays size={11} aria-hidden />
            {new Date(`${mission.due_date}T12:00`).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'short',
            })}
          </span>
        )}
        {mission.estimated_minutes && (
          <span className="flex items-center gap-1 text-[11px] text-faint">
            <Clock size={11} aria-hidden />
            {mission.estimated_minutes}min
          </span>
        )}
        {mission.recurrence && (
          <span className="flex items-center gap-1 text-[11px] text-faint">
            <RefreshCw size={10} aria-hidden />
            {RECURRENCE_LABEL[mission.recurrence]}
          </span>
        )}
      </div>

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
            disabled={pending || blocked}
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

// ─── Formulário expandido ─────────────────────────────────────────

type FormTab = 'basic' | 'subtasks' | 'extras'

function MissionForm({
  open, mission, worlds, allMissions, busy, userId,
  onSave, onDelete, onClose,
}: {
  open: boolean
  mission: Mission | null
  worlds: World[]
  allMissions: Mission[]
  busy: boolean
  userId: string
  onSave: (draft: MissionDraft) => void
  onDelete?: () => void
  onClose: () => void
}) {
  // Sempre começa zerado — a key no pai garante remontagem
  const [draft, setDraft] = useState<MissionDraft>(() =>
    mission ? {
      title: mission.title,
      description: mission.description,
      world_id: mission.world_id,
      priority: mission.priority,
      type: (mission as Mission & { type?: import('../types/database').MissionType }).type ?? 'operacao' as import('../types/database').MissionType,
      due_date: mission.due_date,
      estimated_minutes: mission.estimated_minutes,
      recurrence: mission.recurrence,
      recurrence_days: mission.recurrence_days,
      depends_on: mission.depends_on,
    } : { ...BLANK, world_id: worlds[0]?.id ?? null }
  )
  const [touched, setTouched] = useState(false)
  const [tab, setTab] = useState<FormTab>('basic')

  // Subtarefas
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [subtaskBusy, setSubtaskBusy] = useState(false)

  // Links
  const [links, setLinks] = useState<MissionLink[]>([])
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)

  // Tags
  const [allTags, setAllTags] = useState<TagType[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [tagBusy, setTagBusy] = useState(false)

  const subtaskInputRef = useRef<HTMLInputElement>(null)

  // Carrega subtarefas, links e tags quando edita missão existente
  useEffect(() => {
    if (!mission || !open) return
    listSubtasks(mission.id).then(setSubtasks).catch(() => {})
    listLinks(mission.id).then(setLinks).catch(() => {})
    listMissionTags(mission.id).then(setSelectedTags).catch(() => {})
  }, [mission, open])

  useEffect(() => {
    if (!open || !userId) return
    listTags(userId).then(setAllTags).catch(() => {})
  }, [open, userId])

  const subtaskProgress = subtasks.length > 0
    ? Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100)
    : 0

  const titleError = touched && !draft.title.trim() ? 'Descreva o que precisa ser feito.' : undefined

  function submit() {
    setTouched(true)
    if (!draft.title.trim()) return
    onSave({ ...draft, title: draft.title.trim() })
  }

  async function addSubtask() {
    if (!mission || !newSubtask.trim() || subtaskBusy) return
    setSubtaskBusy(true)
    try {
      const s = await createSubtask(userId, mission.id, newSubtask.trim(), subtasks.length)
      setSubtasks((prev) => [...prev, s])
      setNewSubtask('')
      subtaskInputRef.current?.focus()
    } catch { /* silencioso */ }
    finally { setSubtaskBusy(false) }
  }

  async function toggleSub(id: string, done: boolean) {
    const updated = await toggleSubtask(id, done)
    setSubtasks((prev) => prev.map((s) => s.id === id ? updated : s))
  }

  async function removeSub(id: string) {
    await deleteSubtask(id)
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  async function addLink() {
    if (!mission || !newLinkUrl.trim() || linkBusy) return
    setLinkBusy(true)
    try {
      const l = await createLink(userId, mission.id, newLinkLabel.trim() || newLinkUrl, newLinkUrl.trim())
      setLinks((prev) => [...prev, l])
      setNewLinkLabel('')
      setNewLinkUrl('')
    } catch { /* silencioso */ }
    finally { setLinkBusy(false) }
  }

  async function removeLink(id: string) {
    await deleteLink(id)
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  async function addTag() {
    if (!newTagName.trim() || tagBusy) return
    setTagBusy(true)
    try {
      const t = await createTag(userId, newTagName.trim(), 'azure')
      setAllTags((prev) => [...prev, t])
      setSelectedTags((prev) => [...prev, t.id])
      setNewTagName('')
      if (mission) await setMissionTags(mission.id, [...selectedTags, t.id])
    } catch { /* silencioso */ }
    finally { setTagBusy(false) }
  }

  async function toggleTag(tagId: string) {
    const next = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId]
    setSelectedTags(next)
    if (mission) await setMissionTags(mission.id, next)
  }

  const rewardPreview = CREDITS_BY_PRIORITY[draft.priority]
  const xpPreview = draft.due_date ? `${XP_BY_PRIORITY[draft.priority] + 5}` : `${XP_BY_PRIORITY[draft.priority]}`

  const TABS: { key: FormTab; label: string }[] = [
    { key: 'basic',    label: 'Missão' },
    { key: 'subtasks', label: `Subtarefas${subtasks.length > 0 ? ` (${subtasks.length})` : ''}` },
    { key: 'extras',   label: 'Extras' },
  ]

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
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} loading={busy}>
            {mission ? 'Salvar' : 'Registrar'}
          </Button>
        </>
      }
    >
      {/* Abas */}
      <div className="mb-5 flex gap-0.5 rounded-[10px] bg-raised p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 ${
              tab === t.key ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Aba: Missão */}
      {tab === 'basic' && (
        <div className="flex flex-col gap-4">
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
                onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Planeta">
              {(id) => (
                <Select
                  id={id}
                  value={draft.world_id ?? ''}
                  onChange={(e) => setDraft({ ...draft, world_id: e.target.value || null })}
                >
                  <option value="">Sem planeta</option>
                  {worlds.map((w) => (
                    <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Prioridade">
              {(id) => (
                <Select
                  id={id}
                  value={draft.priority}
                  onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
                >
                  <option value="low">Baixa</option>
                  <option value="mid">Média</option>
                  <option value="high">Alta</option>
                </Select>
              )}
            </Field>
          </div>

          <Field label="Tipo de missão" hint="Define qual recurso esta missão gera ao ser concluída.">
            {(id) => (
              <Select
                id={id}
                value={(draft as MissionDraft & { type: MissionType }).type ?? 'operacao'}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as MissionType })}
              >
                <option value="rotina">Rotina → gera Suprimentos</option>
                <option value="operacao">Operação → gera Dados</option>
                <option value="emergencia">Emergência → gera Pulsos</option>
              </Select>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3" style={{ display: 'none' }}>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prazo" hint="Opcional.">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={draft.due_date ?? ''}
                  onChange={(e) => setDraft({ ...draft, due_date: e.target.value || null })}
                />
              )}
            </Field>

            <Field label="Estimativa">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  placeholder="minutos"
                  value={draft.estimated_minutes ?? ''}
                  onChange={(e) => setDraft({
                    ...draft,
                    estimated_minutes: e.target.value ? Number(e.target.value) : null,
                  })}
                />
              )}
            </Field>
          </div>

          {/* Recorrência */}
          <Field label="Recorrência" hint="Opcional — a missão se recria ao ser concluída.">
            {(id) => (
              <Select
                id={id}
                value={draft.recurrence ?? ''}
                onChange={(e) => setDraft({
                  ...draft,
                  recurrence: (e.target.value as Recurrence) || null,
                  recurrence_days: e.target.value === 'custom' ? 1 : null,
                })}
              >
                <option value="">Não recorrente</option>
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="custom">A cada X dias</option>
              </Select>
            )}
          </Field>

          {draft.recurrence === 'custom' && (
            <Field label="A cada quantos dias?">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  value={draft.recurrence_days ?? 1}
                  onChange={(e) => setDraft({ ...draft, recurrence_days: Number(e.target.value) || 1 })}
                />
              )}
            </Field>
          )}

          {/* Dependência */}
          <Field label="Depende de" hint="Opcional — esta missão fica bloqueada até a outra ser concluída.">
            {(id) => (
              <Select
                id={id}
                value={draft.depends_on ?? ''}
                onChange={(e) => setDraft({ ...draft, depends_on: e.target.value || null })}
              >
                <option value="">Nenhuma dependência</option>
                {allMissions
                  .filter((m) => m.id !== mission?.id && m.status !== 'done')
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
              </Select>
            )}
          </Field>

          {/* Preview de recompensa */}
          <div className="flex items-center gap-4 rounded-[10px] bg-raised px-4 py-3 text-[12px]">
            <span className="text-faint">Recompensa ao concluir:</span>
            <span className="font-medium text-azure">+{xpPreview} XP</span>
            <span className="flex items-center gap-1 font-medium text-ember">
              <Coins size={12} aria-hidden />
              +{rewardPreview}{draft.due_date ? ` +5 (prazo)` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Aba: Subtarefas */}
      {tab === 'subtasks' && (
        <div className="flex flex-col gap-4">
          {!mission ? (
            <p className="rounded-[10px] bg-raised px-4 py-3 text-[13px] text-muted">
              Salve a missão primeiro para adicionar subtarefas.
            </p>
          ) : (
            <>
              {subtasks.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-[12px]">
                    <span className="text-muted">{subtasks.filter((s) => s.done).length}/{subtasks.length} concluídas</span>
                    <span className="font-medium text-azure">{subtaskProgress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                    <div
                      className="h-full rounded-full bg-azure transition-[width] duration-300"
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <ul className="flex flex-col gap-1">
                {subtasks.map((s) => (
                  <li key={s.id} className="group flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-raised">
                    <button
                      type="button"
                      onClick={() => toggleSub(s.id, !s.done)}
                      className={`grid size-4 shrink-0 place-items-center rounded-full border transition-all duration-150 ${
                        s.done
                          ? 'border-good bg-good text-white'
                          : 'border-line hover:border-azure'
                      }`}
                    >
                      {s.done && (
                        <svg viewBox="0 0 10 10" className="size-2" aria-hidden>
                          <path d="M2 5.2 4 7.2 8 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 text-[13px] ${s.done ? 'text-faint line-through' : 'text-text'}`}>
                      {s.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSub(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-faint hover:text-bad transition-all duration-150"
                    >
                      <X size={12} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                <input
                  ref={subtaskInputRef}
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                  placeholder="Nova subtarefa…"
                  className="flex-1 rounded-[8px] border border-line bg-surface px-3 py-2 text-[13px] text-text placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-azure/30"
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  disabled={!newSubtask.trim() || subtaskBusy}
                  className="grid size-9 place-items-center rounded-[8px] bg-azure text-white transition-opacity disabled:opacity-40"
                >
                  <Plus size={15} aria-hidden />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Aba: Extras (tags + links) */}
      {tab === 'extras' && (
        <div className="flex flex-col gap-5">
          {/* Tags */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-faint">
              <Tag size={12} aria-hidden />
              Tags
            </p>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {allTags.map((t) => {
                const sel = selectedTags.includes(t.id)
                const accent = ACCENT[t.color as keyof typeof ACCENT] ?? ACCENT.azure
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
                      sel
                        ? `${accent.soft} ${accent.text} ring-1 ring-current`
                        : 'bg-raised text-muted hover:text-text'
                    }`}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="Nova tag…"
                className="flex-1 rounded-[8px] border border-line bg-surface px-3 py-2 text-[13px] text-text placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-azure/30"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!newTagName.trim() || tagBusy}
                className="grid size-9 place-items-center rounded-[8px] bg-azure text-white transition-opacity disabled:opacity-40"
              >
                <Plus size={15} aria-hidden />
              </button>
            </div>
          </div>

          {/* Links */}
          {!mission ? (
            <p className="rounded-[10px] bg-raised px-4 py-3 text-[13px] text-muted">
              Salve a missão primeiro para adicionar links.
            </p>
          ) : (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-faint">
                <Link2 size={12} aria-hidden />
                Links e referências
              </p>

              <ul className="mb-3 flex flex-col gap-1.5">
                {links.map((l) => (
                  <li key={l.id} className="group flex items-center gap-2 rounded-[8px] border border-line px-3 py-2">
                    <ExternalLink size={12} className="shrink-0 text-faint" aria-hidden />
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-[13px] text-azure hover:underline"
                    >
                      {l.label}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeLink(l.id)}
                      className="opacity-0 group-hover:opacity-100 text-faint hover:text-bad transition-all duration-150"
                    >
                      <X size={12} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder="Título do link (opcional)"
                  className="rounded-[8px] border border-line bg-surface px-3 py-2 text-[13px] text-text placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-azure/30"
                />
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addLink()}
                    placeholder="https://…"
                    className="flex-1 rounded-[8px] border border-line bg-surface px-3 py-2 text-[13px] text-text placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-azure/30"
                  />
                  <button
                    type="button"
                    onClick={addLink}
                    disabled={!newLinkUrl.trim() || linkBusy}
                    className="grid size-9 place-items-center rounded-[8px] bg-azure text-white transition-opacity disabled:opacity-40"
                  >
                    <Plus size={15} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function SkeletonCards() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[88px] animate-pulse rounded-[12px] border border-line bg-surface" />
      ))}
    </>
  )
}
