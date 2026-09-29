import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Radar } from 'lucide-react'
import { BridgeCard, FieldCard } from '../components/challenges/ChallengesSection'
import { EmptyState } from '../components/Bits'
import { useChallenges } from '../hooks/ChallengeProvider'

/**
 * Página própria de um desafio (campo ou bordo). Hoje mostra o mesmo
 * cartão da Ponte; é o lugar reservado para o tabuleiro de etapas
 * quando a resolução por rolagem chegar.
 */
export default function Challenge() {
  const { id } = useParams<{ id: string }>()
  const { loading, fields, bridges } = useChallenges()

  const field = fields.find((c) => c.id === id)
  const bridge = bridges.find((b) => b.id === id)

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 md:px-10 md:py-10">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors duration-150 hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden /> Voltar à Ponte
      </Link>

      {loading ? (
        <div className="h-72 animate-pulse rounded-[16px] bg-raised" aria-hidden />
      ) : field ? (
        <FieldCard c={field} />
      ) : bridge ? (
        <BridgeCard b={bridge} />
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
