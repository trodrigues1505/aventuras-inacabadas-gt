import { supabase } from '../lib/supabase'
import type {
  Mission,
  MissionLink,
  MissionStatus,
  MissionType,
  PlayerState,
  Priority,
  Recurrence,
  Subtask,
  Tag,
} from '../types/database'
import {
  CREDITS_BY_PRIORITY,
  CREDITS_ON_TIME_BONUS,
  XP_BY_PRIORITY,
  XP_ON_TIME_BONUS,
  RESOURCE_BY_TYPE_PRIORITY,
  MISSION_TYPE_RESOURCE,
  getXpRequiredForLevel,
} from '../data/gameConfig'
import { applyBonus } from '../data/crew'

// ─── Tipos de rascunho ────────────────────────────────────────────

export type MissionDraft = {
  title: string
  description: string | null
  world_id: string | null
  priority: Priority
  type: import('../types/database').MissionType
  due_date: string | null
  estimated_minutes: number | null
  recurrence: Recurrence | null
  recurrence_days: number | null
  depends_on: string | null
}

type MissionUpdate = Partial<MissionDraft> & { status?: MissionStatus }

export type SubtaskDraft = { title: string }

// ─── Missões ─────────────────────────────────────────────────────

export async function listMissions(userId: string): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Mission[]
}

export async function createMission(
  userId: string,
  draft: MissionDraft,
): Promise<Mission> {
  // Créditos calculados automaticamente — usuário não edita
  const reward = CREDITS_BY_PRIORITY[draft.priority]
  const { data, error } = await supabase
    .from('missions')
    .insert({ ...draft, user_id: userId, status: 'open', reward, type: draft.type ?? 'operacao' })
    .select()
    .single()
  if (error) throw error
  return data as Mission
}

export async function updateMission(
  id: string,
  update: MissionUpdate,
): Promise<Mission> {
  // Se prioridade mudou, recalcula recompensa
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: any = update.priority
    ? { ...update, reward: CREDITS_BY_PRIORITY[update.priority] }
    : update
  const { data, error } = await supabase
    .from('missions')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Mission
}

export async function deleteMission(id: string): Promise<void> {
  const { error } = await supabase.from('missions').delete().eq('id', id)
  if (error) throw error
}

// ─── Conclusão / reabertura ───────────────────────────────────────

export type CompletionResult = {
  mission: Mission
  state: PlayerState
  xpGained: number
  creditsGained: number
  leveledUpTo: number | null
  crewNote: string | null
}

export async function toggleMission(
  mission: Mission,
  state: PlayerState,
  allMissions: Mission[],
): Promise<CompletionResult> {
  const completing = mission.status !== 'done'

  if (!completing) {
    const { data, error } = await supabase
      .from('missions')
      .update({ status: 'open', completed_at: null })
      .eq('id', mission.id)
      .select()
      .single()
    if (error) throw error
    return {
      mission: data as Mission,
      state,
      xpGained: 0,
      creditsGained: 0,
      leveledUpTo: null,
      crewNote: null,
    }
  }

  // Recompensa base
  const baseXp = XP_BY_PRIORITY[mission.priority] ?? 10
  const baseCredits = CREDITS_BY_PRIORITY[mission.priority] ?? 10

  // Bônus por prazo
  const hoje = new Date().toISOString().slice(0, 10)
  const onTime = mission.due_date ? mission.due_date >= hoje : false
  const onTimeXp = onTime ? XP_ON_TIME_BONUS : 0
  const onTimeCredits = onTime ? CREDITS_ON_TIME_BONUS : 0

  // Bônus do tripulante
  const bonus = applyBonus(
    state.crew_id,
    mission,
    baseXp + onTimeXp,
    baseCredits + onTimeCredits,
    allMissions,
  )

  const xpGained = baseXp + onTimeXp + bonus.xp
  const creditsGained = baseCredits + onTimeCredits + bonus.credits

  // Recursos gerados pelo tipo de missão
  const missionType: MissionType = (mission as Mission & { type?: MissionType }).type ?? 'operacao'
  const resourceKey = MISSION_TYPE_RESOURCE[missionType]
  const baseResource = RESOURCE_BY_TYPE_PRIORITY[missionType][mission.priority]
  const resourceBonus = onTime ? 2 : 0
  const resourceGained = baseResource + resourceBonus

  // Level up
  let newXp = state.xp + xpGained
  let newLevel = state.level
  let leveledUpTo: number | null = null
  const required = getXpRequiredForLevel(newLevel)
  if (newXp >= required) {
    newXp -= required
    newLevel += 1
    leveledUpTo = newLevel
  }

  const [missionResult, stateResult] = await Promise.all([
    supabase
      .from('missions')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', mission.id)
      .select()
      .single(),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('player_state') as any)
      .update({
        xp: newXp,
        level: newLevel,
        currency: state.currency + creditsGained,
        [resourceKey]: ((state as unknown as Record<string, number>)[resourceKey] ?? 0) + resourceGained,
      })
      .eq('user_id', state.user_id)
      .select()
      .single(),
  ])

  if (missionResult.error) throw missionResult.error
  if (stateResult.error) throw stateResult.error

  // Se missão é recorrente, cria a próxima automaticamente
  if (mission.recurrence) {
    await spawnNextRecurrence(mission)
  }

  return {
    mission: missionResult.data as Mission,
    state: stateResult.data as PlayerState,
    xpGained,
    creditsGained,
    leveledUpTo,
    crewNote: bonus.note,
  }
}

function nextDueDate(current: string | null, recurrence: Recurrence, days: number | null): string {
  const base = current ? new Date(`${current}T12:00`) : new Date()
  switch (recurrence) {
    case 'daily':   base.setDate(base.getDate() + 1); break
    case 'weekly':  base.setDate(base.getDate() + 7); break
    case 'monthly': base.setMonth(base.getMonth() + 1); break
    case 'custom':  base.setDate(base.getDate() + (days ?? 1)); break
  }
  return base.toISOString().slice(0, 10)
}

async function spawnNextRecurrence(mission: Mission): Promise<void> {
  const next = nextDueDate(mission.due_date, mission.recurrence!, mission.recurrence_days)
  const reward = CREDITS_BY_PRIORITY[mission.priority]
  await supabase.from('missions').insert({
    user_id: mission.user_id,
    world_id: mission.world_id,
    title: mission.title,
    description: mission.description,
    priority: mission.priority,
    status: 'open',
    due_date: next,
    reward,
    estimated_minutes: mission.estimated_minutes,
    recurrence: mission.recurrence,
    recurrence_days: mission.recurrence_days,
    depends_on: null,
  })
}

// ─── Subtarefas ───────────────────────────────────────────────────

export async function listSubtasks(missionId: string): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('mission_id', missionId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []) as Subtask[]
}

export async function createSubtask(
  userId: string,
  missionId: string,
  title: string,
  position: number,
): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({ user_id: userId, mission_id: missionId, title, position })
    .select()
    .single()
  if (error) throw error
  return data as Subtask
}

export async function toggleSubtask(id: string, done: boolean): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .update({ done })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Subtask
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await supabase.from('subtasks').delete().eq('id', id)
  if (error) throw error
}

// ─── Tags ─────────────────────────────────────────────────────────

export async function listTags(userId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as Tag[]
}

export async function createTag(userId: string, name: string, color: string): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({ user_id: userId, name, color: color as import('../types/database').WorldAccent })
    .select()
    .single()
  if (error) throw error
  return data as Tag
}

export async function listMissionTags(missionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('mission_tags')
    .select('tag_id')
    .eq('mission_id', missionId)
  if (error) throw error
  return (data ?? []).map((r: { tag_id: string }) => r.tag_id)
}

export async function setMissionTags(missionId: string, tagIds: string[]): Promise<void> {
  await supabase.from('mission_tags').delete().eq('mission_id', missionId)
  if (tagIds.length === 0) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('mission_tags') as any).insert(
    tagIds.map((tag_id) => ({ mission_id: missionId, tag_id })),
  )
}

// ─── Links ────────────────────────────────────────────────────────

export async function listLinks(missionId: string): Promise<MissionLink[]> {
  const { data, error } = await supabase
    .from('mission_links')
    .select('*')
    .eq('mission_id', missionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as MissionLink[]
}

export async function createLink(
  userId: string,
  missionId: string,
  label: string,
  url: string,
): Promise<MissionLink> {
  const { data, error } = await supabase
    .from('mission_links')
    .insert({ user_id: userId, mission_id: missionId, label, url })
    .select()
    .single()
  if (error) throw error
  return data as MissionLink
}

export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase.from('mission_links').delete().eq('id', id)
  if (error) throw error
}
