import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { EXPEDITION_CONFIG } from '../../data/challenges'

const REVEAL_MS = 130
const FLICKER_MS = 70

/**
 * Reproduz uma rolagem JÁ SORTEADA pelo servidor. Nada aqui decide
 * resultado: a animação só revela, um a um, os valores recebidos.
 * Com "reduzir movimento" ativo, mostra tudo de uma vez.
 */
export function DiceTray({
  dice,
  required,
  onDone,
}: {
  dice: number[]
  required: number
  onDone?: () => void
}) {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [shown, setShown] = useState(reduced ? dice.length : 0)
  const [noise, setNoise] = useState(0)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (shown >= dice.length) {
      done.current?.()
      return
    }
    const t = window.setTimeout(() => setShown((n) => n + 1), REVEAL_MS)
    return () => window.clearTimeout(t)
  }, [shown, dice.length])

  useEffect(() => {
    if (shown >= dice.length) return
    const t = window.setInterval(() => setNoise((n) => n + 1), FLICKER_MS)
    return () => window.clearInterval(t)
  }, [shown, dice.length])

  const finished = shown >= dice.length
  const successes = dice.filter((d) => d >= EXPEDITION_CONFIG.successFrom).length
  const ok = successes >= required

  if (dice.length === 0) {
    return (
      <p className="rounded-[12px] bg-raised px-4 py-3 text-[13px] text-muted">
        Nenhum dado nesta rolagem: o atributo da equipe não bastou.
      </p>
    )
  }

  return (
    <div aria-live="polite">
      <div className="flex flex-wrap gap-2">
        {dice.map((face, i) => {
          const revealed = i < shown
          const value = revealed ? face : ((noise * 7 + i * 3) % 6) + 1
          const hit = revealed && face >= EXPEDITION_CONFIG.successFrom
          return (
            <span
              key={i}
              className={`grid size-11 place-items-center rounded-[11px] font-semibold tabular-nums transition-colors duration-150 ${
                !revealed
                  ? 'bg-raised text-faint'
                  : hit
                    ? 'bg-azure text-white'
                    : 'bg-raised text-muted'
              }`}
              aria-label={revealed ? `Dado ${i + 1}: ${face}${hit ? ', sucesso' : ''}` : `Dado ${i + 1} rolando`}
            >
              <span className="display text-[18px]">{value}</span>
            </span>
          )
        })}
      </div>
      {finished && (
        <p
          className={`mt-3 flex items-center gap-2 text-[13.5px] font-medium ${
            ok ? 'text-good' : 'text-bad'
          }`}
        >
          {ok ? <Check size={15} aria-hidden /> : <X size={15} aria-hidden />}
          {successes} de {required} sucessos — {ok ? 'passou' : 'não passou'}
        </p>
      )}
    </div>
  )
}
