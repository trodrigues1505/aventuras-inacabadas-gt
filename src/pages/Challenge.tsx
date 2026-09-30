import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Radar } from 'lucide-react'
import { BridgeView } from '../components/challenges/BridgeView'
import { ExpeditionView } from '../components/challenges/ExpeditionView'
import { EmptyState } from '../components/Bits'
import { useChallenges } from '../hooks/ChallengeProvider'
import type { BridgeChallenge, FieldChallenge } from '../types/challenges'

/**
 * Página própria de um desafio.
 *  • campo  → expedição: mapa de nós, equipe, líder por nó, rolagem no servidor
 *  • bordo  → travessia em passo único + reparo do casco
 *
 * Guarda uma cópia do desafio: quando ele é resolvido, o servidor o tira da
 * lista de ativos, mas a tela precisa continuar mostrando o desfecho.
 */
export default function Challenge() {
  const { id } = useParams<{ id: string }>()
  const { loading, fields, bridges } = useChallenges()

  const field = fields.find((c) => c.id === id)
  const bridge = bridges.find((b) => b.id === id)

  const [fieldSnap, setFieldSnap] = useState<FieldChallenge | null>(null)
  const [bridgeSnap, setBridgeSnap] = useState<BridgeChallenge | null>(null)
  useEffect(() => {
    if (field) setFieldSnap(field)
  }, [field])
  useEffect(() => {
    if (bridge) setBridgeSnap(bridge)
  }, [bridge])

  const f = field ?? (fieldSnap?.id === id ? fieldSnap : null)
  const b = bridge ?? (bridgeSnap?.id === id ? bridgeSnap : null)

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-10">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors duration-150 hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden /> Voltar à Ponte
      </Link>

      {loading && !f && !b ? (
        <div className="h-72 animate-pulse rounded-[16px] bg-raised" aria-hidden />
      ) : f ? (
        <ExpeditionView key={f.id} c={f} gone={!field} />
      ) : b ? (
        <BridgeView key={b.id} b={b} gone={!bridge} />
      ) : (
        <div className="rounded-[16px] border border-line bg-surface">
          <EmptyState
            icon={Radar}
            title="Desafio não encontrado"
            note="Ele pode ter sido encerrado ou ter expirado."
          />
        </div>
      )}
    </main>
  )
}
