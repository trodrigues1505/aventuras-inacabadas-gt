import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/Bits'
import { useAuth } from '../hooks/AuthProvider'
import { useToast } from '../hooks/ToastProvider'
import { setCrew } from '../services/crewService'
import { CREW, findCrew, type CrewMember } from '../data/crew'
import { ACCENT } from '../data/gameConfig'
import type { WorldAccent } from '../types/database'

export default function Crew() {
  const { session, playerState, applyPlayerState } = useAuth()
  const toast = useToast()

  const [confirming, setConfirming] = useState<CrewMember | null>(null)
  const [busy, setBusy] = useState(false)

  const current = findCrew(playerState?.crew_id ?? null)

  async function choose(member: CrewMember) {
    if (!session || !playerState) return
    setBusy(true)
    try {
      const next = await setCrew(session.user.id, member.id)
      applyPlayerState(next)
      toast('reward', `${member.name} assumiu o posto de ${member.role.toLowerCase()}.`)
      setConfirming(null)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível confirmar.')
    } finally {
      setBusy(false)
    }
  }

  function pick(member: CrewMember) {
    if (member.id === current?.id) return
    if (current) setConfirming(member)
    else choose(member)
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
      <div className="mb-8">
        <h1 className="display text-[22px] text-text">Tripulação</h1>
        <p className="mt-1 text-[13px] text-muted">
          {current
            ? `${current.name} está no posto. Trocar é possível a qualquer momento.`
            : 'Escolha quem vai ocupar o posto ao seu lado na ponte.'}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CREW.map((member, i) => {
          const accent = ACCENT[member.accent as WorldAccent] ?? ACCENT.azure
          const active = member.id === current?.id

          return (
            <CrewCard
              key={member.id}
              member={member}
              accent={accent}
              active={active}
              busy={busy}
              delay={i * 45}
              onPick={() => pick(member)}
            />
          )
        })}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        busy={busy}
        title={`Trocar ${current?.name} por ${confirming?.name}?`}
        message="O progresso que você já acumulou continua intacto — muda apenas o bônus aplicado daqui em diante."
        confirmLabel="Trocar"
        onConfirm={() => confirming && choose(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </main>
  )
}

function CrewCard({
  member,
  accent,
  active,
  busy,
  delay,
  onPick,
}: {
  member: CrewMember
  accent: (typeof ACCENT)[keyof typeof ACCENT]
  active: boolean
  busy: boolean
  delay: number
  onPick: () => void
}) {
  return (
    <article
      className={`rise relative flex flex-col overflow-hidden rounded-[16px] border bg-surface transition-all duration-150 ${
        active
          ? 'border-azure ring-1 ring-azure/30'
          : 'border-line hover:border-faint/60'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Badge de ativo */}
      {active && (
        <span className="absolute right-3 top-3 z-10 grid size-6 place-items-center rounded-full bg-azure text-white shadow">
          <Check size={13} aria-hidden />
        </span>
      )}

      {/* Retrato do personagem */}
      <div className={`relative h-[200px] overflow-hidden ${accent.soft}`}>
        <img
          src={`assets/crew/${member.id}.png`}
          alt={member.name}
          className="h-full w-full object-contain object-bottom transition-transform duration-300 hover:scale-[1.03]"
          onError={(e) => {
            const img = e.target as HTMLImageElement
            img.style.display = 'none'
            const fallback = img.nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.display = 'grid'
          }}
        />
        {/* Fallback: iniciais enquanto imagem não carrega */}
        <span
          className={`absolute inset-0 hidden place-items-center text-[56px] font-semibold ${accent.text}`}
          aria-hidden
        >
          {member.portrait}
        </span>
      </div>

      {/* Corpo */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-semibold text-text">{member.name}</h2>
            <p className={`text-[12px] font-medium ${accent.text}`}>{member.role}</p>
          </div>
        </div>

        <p className="mt-3 text-[13px] italic leading-relaxed text-muted">
          "{member.line}"
        </p>

        {/* Bônus passivo */}
        <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-raised px-3.5 py-3">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-ember" aria-hidden />
          <div>
            <p className="mb-0.5 text-[11px] font-medium text-faint uppercase tracking-wide">
              Bônus passivo
            </p>
            <p className="text-[12px] leading-relaxed text-muted">{member.perk}</p>
          </div>
        </div>

        <div className="mt-4">
          <Button
            variant={active ? 'secondary' : 'primary'}
            onClick={onPick}
            disabled={active || busy}
            className="w-full"
          >
            {active ? 'No posto' : 'Chamar para a ponte'}
          </Button>
        </div>
      </div>
    </article>
  )
}
