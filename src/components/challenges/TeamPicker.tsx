import { Check, HeartPulse } from 'lucide-react'
import { ACCENT } from '../../data/gameConfig'
import { ATTRIBUTE_LABEL, CREW, type AttributeKey } from '../../data/crew'
import { isAvailable } from '../../hooks/useCrewRoster'
import type { CrewAttributes } from '../../services/crewService'
import type { WorldAccent } from '../../types/database'
import { formatLeft } from './parts'

const ORDER: AttributeKey[] = ['for', 'agi', 'tec', 'int', 'inf', 'per']
const SHORT: Record<AttributeKey, string> = { for: 'FOR', agi: 'AGI', tec: 'TÉC', int: 'INT', inf: 'INF', per: 'PER' }

/**
 * Escolha dos 3 tripulantes. O mapa fica à vista ao lado/acima: `focus`
 * destaca os atributos que a trilha (ou a abordagem) pede.
 */
export function TeamPicker({
  roster,
  selected,
  onChange,
  focus = [],
  size = 3,
  disabled,
}: {
  roster: CrewAttributes[]
  selected: string[]
  onChange: (ids: string[]) => void
  focus?: AttributeKey[]
  size?: number
  disabled?: boolean
}) {
  const now = Date.now()

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else if (selected.length < size) onChange([...selected, id])
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[13px] font-semibold text-text">Equipe</p>
        <p className="text-[12px] text-muted" aria-live="polite">
          {selected.length} de {size} escolhidos
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="group" aria-label="Escolher tripulantes">
        {CREW.map((m) => {
          const row = roster.find((r) => r.crew_id === m.id)
          const free = isAvailable(row, now)
          const on = selected.includes(m.id)
          const full = !on && selected.length >= size
          const off = disabled || !free || full
          const acc = ACCENT[m.accent as WorldAccent]
          const back = row?.injured_until && !free ? formatLeft(new Date(row.injured_until).getTime() - now) : null
          return (
            <button
              key={m.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-disabled={off && !on}
              disabled={off && !on}
              onClick={() => toggle(m.id)}
              className={`flex items-start gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors duration-150 ${
                on ? 'border-azure bg-azure/[0.05]' : 'border-line bg-surface hover:bg-raised'
              } ${off && !on ? 'cursor-not-allowed opacity-50 hover:bg-surface' : ''}`}
            >
              <span
                className={`relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-[12px] font-semibold ${acc.soft} ${acc.text}`}
              >
                {m.portrait}
                <img
                  src={`assets/crew/${m.id}.webp`}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-text">{m.name}</span>
                  <span className="text-[12px] text-faint">{m.role}</span>
                  {on && <Check size={14} className="ml-auto text-azure" aria-hidden />}
                </span>
                {back ? (
                  <span className="mt-1 flex items-center gap-1.5 text-[12px] text-bad">
                    <HeartPulse size={12} aria-hidden /> Ferido — volta em {back}
                  </span>
                ) : (
                  <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
                    {ORDER.map((a) => (
                      <span
                        key={a}
                        title={ATTRIBUTE_LABEL[a]}
                        className={focus.includes(a) ? 'font-semibold text-azure' : 'text-faint'}
                      >
                        {SHORT[a]} {row ? row[a] : '–'}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
