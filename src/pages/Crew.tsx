import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { Button } from '../components/Button'
import { SectionHeader } from '../components/Bits'
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
      toast('error', e instanceof Error ? e.message : 'Nao foi possivel confirmar.')
    } finally {
      setBusy(false)
    }
  }

  function pick(member: CrewMember) {
    if (member.id === current?.id) return
    // Trocar depois de já ter escolhido merece confirmação; a
    // primeira escolha, não — pedir confirmação de quem ainda não
    // tem nada a perder é só um clique a mais.
    if (current) setConfirming(member)
    else choose(member)
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
      <SectionHeader
        title="Tripulacao"
        note={
          current
            ? `${current.name} esta no posto. Trocar é possivel a qualquer momento.`
            : 'Escolha quem vai ocupar o posto ao seu lado na ponte.'
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CREW.map((member, i) => {
          const accent = ACCENT[member.accent as WorldAccent] ?? ACCENT.azure
          const active = member.id === current?.id

          return (
            <article
              key={member.id}
              className={`rise relative flex flex-col rounded-[16px] border bg-surface p-5 transition-all duration-150 ${
                active
                  ? 'border-azure ring-1 ring-azure/30'
                  : 'border-line hover:border-faint/60'
              }`}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              {active && (
                <span className="absolute right-4 top-4 grid size-6 place-items-center rounded-full bg-azure text-white">
                  <Check size={13} aria-hidden />
                </span>
              )}

              {/* Retrato: iniciais agora, <img> quando a arte entrar.
                  O container já está no formato final (1:1, 72px). */}
              <span
                className={`mb-4 grid size-[72px] place-items-center rounded-full text-[20px] font-semibold ${accent.soft} ${accent.text}`}
                aria-hidden
              >
                {member.portrait}
              </span>

              <h2 className="text-[16px] font-semibold text-text">{member.name}</h2>
              <p className={`text-[12px] font-medium ${accent.text}`}>
                {member.role}
              </p>

              <p className="mt-3 text-[13px] italic leading-relaxed text-muted">
                “{member.line}”
              </p>

              <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-raised px-3.5 py-3">
                <Sparkles size={13} className="mt-0.5 shrink-0 text-ember" aria-hidden />
                <p className="text-[12px] leading-relaxed text-muted">{member.perk}</p>
              </div>

              <div className="mt-4 pt-1">
                <Button
                  variant={active ? 'secondary' : 'primary'}
                  onClick={() => pick(member)}
                  disabled={active || busy}
                  className="w-full"
                >
                  {active ? 'No posto' : 'Chamar para a ponte'}
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        busy={busy}
        title={`Trocar ${current?.name} por ${confirming?.name}?`}
        message="O progresso que voce ja acumulou continua intacto — muda apenas o bonus aplicado daqui em diante."
        confirmLabel="Trocar"
        onConfirm={() => confirming && choose(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </main>
  )
}
