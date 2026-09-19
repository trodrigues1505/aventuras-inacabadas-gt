import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Coins, Globe2, Radar, ShieldAlert, Users } from 'lucide-react'
import { Button } from '../components/Button'
import { Badge, EmptyState, SectionHeader } from '../components/Bits'
import { Field, Input } from '../components/Field'
import { Modal } from '../components/Modal'
import { Avatar } from '../layouts/AppShell'
import { useAuth } from '../hooks/AuthProvider'
import { useToast } from '../hooks/ToastProvider'
import {
  adminUpdateProfile,
  adminUpdateState,
  loadAdminSnapshot,
  type AdminSnapshot,
} from '../services/adminService'
import { PRIORITY_LABEL } from '../data/gameConfig'
import type { PlayerState, Profile } from '../types/database'

const EMPTY: AdminSnapshot = { profiles: [], states: [], worlds: [], missions: [] }

type Editing = { profile: Profile; state: PlayerState | null }

export default function Admin() {
  const { isAdmin } = useAuth()
  const toast = useToast()

  const [snap, setSnap] = useState<AdminSnapshot>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'missions'>('users')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    loadAdminSnapshot()
      .then((data) => alive && setSnap(data))
      .catch((e: unknown) =>
        toast('error', e instanceof Error ? e.message : 'Falha ao carregar.'),
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [isAdmin, toast])

  // A rota é fechada aqui e pelas policies no banco. Esta linha só
  // evita desenhar uma tela vazia para quem não deveria vê-la.
  if (!isAdmin) return <Navigate to="/" replace />

  const byUser = useMemo(() => {
    const states = new Map(snap.states.map((s) => [s.user_id, s]))
    return snap.profiles.map((p) => {
      const mine = snap.missions.filter((m) => m.user_id === p.user_id)
      return {
        profile: p,
        state: states.get(p.user_id) ?? null,
        worlds: snap.worlds.filter((w) => w.user_id === p.user_id).length,
        total: mine.length,
        done: mine.filter((m) => m.status === 'done').length,
      }
    })
  }, [snap])

  const names = useMemo(
    () => new Map(snap.profiles.map((p) => [p.user_id, p.display_name ?? '—'])),
    [snap.profiles],
  )
  const worldNames = useMemo(
    () => new Map(snap.worlds.map((w) => [w.id, `${w.icon} ${w.name}`])),
    [snap.worlds],
  )

  async function saveUser(displayName: string, patch: {
    level: number
    xp: number
    currency: number
  }) {
    if (!editing) return
    setBusy(true)
    try {
      const uid = editing.profile.user_id
      const [profile, state] = await Promise.all([
        adminUpdateProfile(uid, { display_name: displayName }),
        editing.state ? adminUpdateState(uid, patch) : Promise.resolve(null),
      ])
      setSnap((s) => ({
        ...s,
        profiles: s.profiles.map((p) => (p.user_id === uid ? profile : p)),
        states: state
          ? s.states.map((x) => (x.user_id === uid ? state : x))
          : s.states,
      }))
      toast('success', 'Usuario atualizado.')
      setEditing(null)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Nao foi possivel salvar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
      <SectionHeader
        title="Painel"
        note="Visao geral de todos os tripulantes registrados."
      />

      <div className="rise mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={Users} label="Tripulantes" value={snap.profiles.length} />
        <Tile icon={Globe2} label="Mundos" value={snap.worlds.length} />
        <Tile icon={Radar} label="Missoes" value={snap.missions.length} />
        <Tile
          icon={Coins}
          label="Concluidas"
          value={snap.missions.filter((m) => m.status === 'done').length}
        />
      </div>

      <div
        role="tablist"
        aria-label="Secao do painel"
        className="mb-5 flex gap-0.5 rounded-[10px] bg-raised p-1"
      >
        {(
          [
            ['users', 'Tripulantes'],
            ['missions', 'Missoes globais'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              tab === key ? 'bg-surface text-text lift' : 'text-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[16px] border border-line bg-surface">
        {loading ? (
          <div className="h-52 animate-pulse" aria-hidden />
        ) : tab === 'users' ? (
          byUser.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="Nenhum tripulante"
              note="Assim que alguem entrar pela primeira vez, aparece aqui."
            />
          ) : (
            <ul className="divide-y divide-line">
              {byUser.map(({ profile, state, worlds, total, done }) => (
                <li key={profile.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Avatar
                    url={profile.avatar_url}
                    name={profile.display_name}
                    size={34}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-text">
                      {profile.display_name ?? '—'}
                    </p>
                    <p className="text-[12px] text-faint">
                      autonomia {state?.level ?? 1} · {worlds}{' '}
                      {worlds === 1 ? 'mundo' : 'mundos'} · {done}/{total} missoes
                    </p>
                  </div>
                  <Badge tone="ember">
                    <Coins size={11} aria-hidden />
                    {state?.currency ?? 0}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing({ profile, state })}
                  >
                    Editar
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : snap.missions.length === 0 ? (
          <EmptyState
            icon={Radar}
            title="Nenhuma missao registrada"
            note="As missoes de todos os tripulantes aparecem nesta lista."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr className="border-b border-line bg-raised">
                  {['Missao', 'Tripulante', 'Mundo', 'Prioridade', 'Estado'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {snap.missions.slice(0, 120).map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-line last:border-0 hover:bg-raised/60"
                  >
                    <td className="max-w-[220px] truncate px-4 py-2.5 text-[13px] text-text">
                      {m.title}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-muted">
                      {names.get(m.user_id) ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-muted">
                      {m.world_id ? (worldNames.get(m.world_id) ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-muted">
                      {PRIORITY_LABEL[m.priority]}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={m.status === 'done' ? 'good' : 'neutral'}>
                        {m.status === 'done' ? 'Concluida' : 'Aberta'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <UserForm
          editing={editing}
          busy={busy}
          onSave={saveUser}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  )
}

function UserForm({
  editing,
  busy,
  onSave,
  onClose,
}: {
  editing: Editing
  busy: boolean
  onSave: (
    displayName: string,
    patch: { level: number; xp: number; currency: number },
  ) => void
  onClose: () => void
}) {
  const [name, setName] = useState(editing.profile.display_name ?? '')
  const [level, setLevel] = useState(editing.state?.level ?? 1)
  const [xp, setXp] = useState(editing.state?.xp ?? 0)
  const [currency, setCurrency] = useState(editing.state?.currency ?? 0)

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar tripulante"
      subtitle={editing.profile.display_name ?? undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSave(name.trim(), { level, xp, currency })}
            loading={busy}
          >
            Salvar
          </Button>
        </>
      }
    >
      <Field label="Nome">
        {(id) => (
          <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />
        )}
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Autonomia">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={1}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value) || 1)}
            />
          )}
        </Field>
        <Field label="Dados">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={0}
              value={xp}
              onChange={(e) => setXp(Number(e.target.value) || 0)}
            />
          )}
        </Field>
        <Field label="Creditos">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={0}
              value={currency}
              onChange={(e) => setCurrency(Number(e.target.value) || 0)}
            />
          )}
        </Field>
      </div>
    </Modal>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number
}) {
  return (
    <article className="rounded-[14px] border border-line bg-surface px-5 py-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={14} className="text-faint" aria-hidden />
        <p className="text-[12px] font-medium uppercase tracking-wide text-faint">
          {label}
        </p>
      </div>
      <p className="text-[26px] font-semibold leading-none tabular-nums text-text">
        {value}
      </p>
    </article>
  )
}
