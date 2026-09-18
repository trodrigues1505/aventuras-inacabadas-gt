import { useState } from 'react'
import { Button } from '../components/Button'
import { GoogleMark } from '../components/GoogleMark'
import { Notice } from '../components/Notice'
import { BRAND } from '../data/brand'
import { CHARACTERS } from '../data/characters'
import { signInWithGoogle } from '../services/authService'
import { useAuth } from '../hooks/AuthProvider'

export default function Login() {
  const { error } = useAuth()
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function entrar() {
    setBusy(true)
    setLocalError(null)
    try {
      await signInWithGoogle()
      // O navegador sai da pagina para o Google; nao ha o que fazer depois.
    } catch (e) {
      setBusy(false)
      setLocalError(e instanceof Error ? e.message : 'Falha ao abrir o login do Google.')
    }
  }

  const problema = localError ?? error

  return (
    <main className="relative min-h-dvh">
      <div className="aura" aria-hidden />
      <div className="relative mx-auto w-full max-w-5xl px-6 py-12 md:py-20 grid gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="rise">
          <p className="text-[13px] text-azure mb-4">{BRAND.tagline}</p>
          <h1 className="display text-[40px] md:text-[56px] text-text mb-5">
            {BRAND.appNameLines[0]}
            <br />
            {BRAND.appNameLines[1]}
          </h1>
          <p className="text-muted max-w-[48ch] mb-8">
            Cada area da sua vida vira um mundo no registro de bordo. Cada tarefa
            concluida e uma varredura de superficie — e dano em {BRAND.faction.name},
            o enxame que apaga tudo o que ficou inacabado. Entre com a conta Google:
            o progresso da {BRAND.ship} fica salvo.
          </p>

          <Button size="lg" onClick={entrar} loading={busy}>
            {!busy && <GoogleMark />}
            Entrar com Google
          </Button>

          <p className="text-[12px] text-faint mt-4 max-w-[42ch]">
            Nao criamos senha nem guardamos a sua. A autenticacao e feita pelo
            Google.
          </p>

          {problema && (
            <div className="mt-8 max-w-[52ch]">
              <Notice title="Nao foi possivel entrar">{problema}</Notice>
            </div>
          )}
        </div>

        <aside className="rise" style={{ animationDelay: '90ms' }}>
          <p className="text-[13px] text-muted mb-4">Tripulacao da {BRAND.ship}</p>
          <ul className="rounded-[16px] border border-line/70 bg-surface/70 divide-y divide-line/60">
            {CHARACTERS.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: c.accent }}
                  aria-hidden
                />
                <span className="font-medium text-text w-20 shrink-0">{c.name}</span>
                <span className="text-[13px] text-muted truncate">
                  {c.post} · {c.species}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  )
}
