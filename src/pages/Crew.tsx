import { useEffect, useState } from 'react'
import { Check, Heart, Sparkles, Star } from 'lucide-react'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/Bits'
import { useAuth } from '../hooks/AuthProvider'
import { useToast } from '../hooks/ToastProvider'
import { setCrew, ensureCrewSeeded, healCrewMember, type CrewAttributes } from '../services/crewService'
import { CREW, findCrew, ATTRIBUTE_LABEL, type CrewMember, type AttributeKey } from '../data/crew'
import { ACCENT } from '../data/gameConfig'
import type { WorldAccent } from '../types/database'

const ATTRIBUTE_ORDER: AttributeKey[] = ['for', 'agi', 'tec', 'int', 'inf', 'per']

// Pontos de XP para o próximo nível, no multiplicador de 100% —
// mesma tabela usada na RPC grow_crew_attribute (SQL). Só para
// desenhar a barra de progresso; o cálculo que vale é o do banco.
const LEVEL_THRESHOLDS: Record<number, number> = { 5: 10, 6: 20, 7: 35, 8: 55, 9: 80 }
const NATURAL_CAP = 10

function attributeProgress(value: number, xp: number): number {
  const threshold = LEVEL_THRESHOLDS[value]
  if (value >= NATURAL_CAP || !threshold) return 100
  return Math.min(100, Math.round((xp / threshold) * 100))
}

function timeRemaining(isoDate: string): string {
  const ms = new Date(isoDate).getTime() - Date.now()
  if (ms <= 0) return 'pronto'
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  return hours >= 1 ? `${hours}h ${minutes}min` : `${minutes}min`
}

// Espelha a RPC heal_crew_member: horas arredondadas para cima; abaixo de
// 6h o ferimento "recupera sozinho" e a cura é recusada; senão ceil(2·√h)
// (72h→17 · 48h→14 · 24h→10 · 12h→7 · 6h→5). Só para exibir — o custo
// real e definitivo é sempre calculado no servidor.
const MIN_HEAL_HOURS = 6

function hoursRemaining(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 3_600_000)
}

function healCostEstimate(hours: number): number {
  return Math.ceil(2 * Math.sqrt(hours))
}

export default function Crew() {
  const { session, playerState, applyPlayerState } = useAuth()
  const toast = useToast()

  const [confirming, setConfirming] = useState<CrewMember | null>(null)
  const [busy, setBusy] = useState(false)
  const [healingId, setHealingId] = useState<string | null>(null)
  const [attributes, setAttributes] = useState<CrewAttributes[]>([])

  const current = findCrew(playerState?.crew_id ?? null)

  useEffect(() => {
    if (!session) return
    let alive = true
    ensureCrewSeeded(session.user.id)
      .then((rows) => {
        if (alive) setAttributes(rows)
      })
      .catch(() => {
        // Fichas de atributo são um complemento visual desta tela — se
        // a leitura falhar, a seleção de posto (funcionalidade principal
        // desta página) continua funcionando normalmente sem elas.
      })
    return () => {
      alive = false
    }
  }, [session])

  function attributesFor(id: string): CrewAttributes | undefined {
    return attributes.find((a) => a.crew_id === id)
  }

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

  async function heal(member: CrewMember) {
    if (!session || !playerState) return
    setHealingId(member.id)
    try {
      const { cost, remainingCurrency } = await healCrewMember(session.user.id, member.id)
      setAttributes((list) =>
        list.map((a) =>
          a.crew_id === member.id ? { ...a, status: 'ok', injured_until: null } : a,
        ),
      )
      applyPlayerState({ ...playerState, currency: remainingCurrency })
      toast('reward', `${member.name} recuperado por ${cost} créditos.`)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Não foi possível curar.')
    } finally {
      setHealingId(null)
    }
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
              attrs={attributesFor(member.id)}
              healing={healingId === member.id}
              onPick={() => pick(member)}
              onHeal={() => heal(member)}
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
  attrs,
  healing,
  onPick,
  onHeal,
}: {
  member: CrewMember
  accent: (typeof ACCENT)[keyof typeof ACCENT]
  active: boolean
  busy: boolean
  delay: number
  attrs: CrewAttributes | undefined
  healing: boolean
  onPick: () => void
  onHeal: () => void
}) {
  // Ferimento já vencido não conta: o banco só limpa o status no próximo sync.
  const isInjured =
    attrs?.status === 'injured' &&
    attrs.injured_until != null &&
    new Date(attrs.injured_until).getTime() > Date.now()
  const healHours = isInjured && attrs?.injured_until ? hoursRemaining(attrs.injured_until) : 0
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
          src={`assets/crew/${member.id}.webp`}
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
          {isInjured && attrs?.injured_until && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-bad/10 px-2 py-0.5 text-[11px] font-medium text-bad">
              <Heart size={10} aria-hidden />
              {timeRemaining(attrs.injured_until)}
            </span>
          )}
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

        {/* Atributos — Fase 4. Se a ficha ainda não carregou, o card
            continua funcional sem esta seção (ver comentário no fetch). */}
        {attrs && (
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {ATTRIBUTE_ORDER.map((key) => {
              const value = attrs[key]
              const xp = attrs[`${key}_xp` as const]
              const isMain = key === member.mainAttribute
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        isMain ? accent.text : 'text-faint'
                      }`}
                    >
                      {isMain && <Star size={9} className="fill-current" aria-hidden />}
                      {ATTRIBUTE_LABEL[key]}
                    </span>
                    <span className="tabular-nums text-faint">{value}</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-raised">
                    <div
                      className={`h-full rounded-full ${isMain ? accent.bar : 'bg-faint/40'}`}
                      style={{ width: `${attributeProgress(value, xp)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant={active ? 'secondary' : 'primary'}
            onClick={onPick}
            disabled={active || busy}
            className="flex-1"
          >
            {active ? 'No posto' : 'Chamar para a ponte'}
          </Button>
          {isInjured &&
            (healHours >= MIN_HEAL_HOURS ? (
              <Button
                variant="secondary"
                onClick={onHeal}
                disabled={healing}
                className="shrink-0"
              >
                Curar · {healCostEstimate(healHours)}💳
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled
                className="shrink-0"
                title="Recupera sozinho em breve — a cura só compensa acima de 6h"
              >
                Recupera em {healHours}h
              </Button>
            ))}
        </div>
      </div>
    </article>
  )
}
