import { CircuitBoard, Coins } from 'lucide-react'
import { Card, CardNote, CardTitle } from '../components/Card'
import { XpBar } from '../components/XpBar'
import { Avatar } from '../layouts/AppShell'
import { useAuth } from '../hooks/AuthProvider'
import { getXpRequiredForLevel } from '../data/gameConfig'
import { BRAND } from '../data/brand'

export default function Dashboard() {
  const { profile, playerState } = useAuth()
  if (!profile || !playerState) return null

  const required = getXpRequiredForLevel(playerState.level)
  const nome = profile.display_name ?? 'Aventureiro'

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 md:px-10 md:py-12">
      <header className="flex items-center gap-4 mb-8 rise">
        <Avatar url={profile.avatar_url} name={nome} size={52} />
        <div className="min-w-0">
          <h1 className="display text-[26px] md:text-[30px] text-text truncate">{nome}</h1>
          <p className="text-[13px] text-muted">
            {BRAND.ship} · autonomia {playerState.level}
          </p>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr] rise" style={{ animationDelay: '60ms' }}>
        <Card>
          <CardTitle>Registro de bordo</CardTitle>
          <CardNote>
            Cada missao concluida vira dado de exploracao — e e disso que a
            {' '}{BRAND.ship} se alimenta para alcancar o proximo setor.
          </CardNote>
          <div className="mt-6">
            <XpBar xp={playerState.xp} required={required} label="Dados de exploracao" />
          </div>
          <dl className="mt-6 flex gap-8">
            <div>
              <dt className="text-[12px] text-faint">Autonomia</dt>
              <dd className="text-[22px] font-semibold tabular-nums">{playerState.level}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-faint">Creditos</dt>
              <dd className="text-[22px] font-semibold tabular-nums flex items-center gap-2">
                <Coins size={17} className="text-ember" aria-hidden />
                {playerState.currency}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardTitle>Nave registrada</CardTitle>
          <CardNote>
            Seu perfil e seu progresso ja estao gravados no Supabase e protegidos
            por RLS. Saia e entre de novo: os numeros ao lado continuam os mesmos.
          </CardNote>
          <div className="mt-6 flex items-start gap-3 rounded-[12px] bg-raised p-4">
            <CircuitBoard size={16} className="text-azure shrink-0 mt-0.5" aria-hidden />
            <p className="text-[13px] text-muted">
              Proxima fase: avaliacao de aptidao e escolha do primeiro posto da
              tripulacao.
            </p>
          </div>
        </Card>
      </div>
    </main>
  )
}
