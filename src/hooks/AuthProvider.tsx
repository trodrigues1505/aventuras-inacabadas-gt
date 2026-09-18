import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { loadPlayer } from '../services/playerService'
import { signOut as doSignOut } from '../services/authService'
import type { PlayerState, Profile } from '../types/database'

type AuthValue = {
  ready: boolean
  session: Session | null
  profile: Profile | null
  playerState: PlayerState | null
  error: string | null
  retry: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Evita recarregar o jogador a cada TOKEN_REFRESHED (que dispara a cada ~1h)
  // e a cada foco de aba: so recarrega quando o usuario muda de fato.
  const loadedFor = useRef<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    loadedFor.current = null
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!supabaseConfigured) {
      setError(
        'Variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ausentes. Copie .env.example para .env.local.',
      )
      setReady(true)
      return
    }

    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!alive) return
      setSession(next)
      if (!next) {
        loadedFor.current = null
        setProfile(null)
        setPlayerState(null)
      }
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabaseConfigured) return

    const user = session?.user
    if (!user) {
      setReady(true)
      return
    }
    if (loadedFor.current === user.id) return

    let alive = true
    setReady(false)
    loadedFor.current = user.id

    loadPlayer(user)
      .then(({ profile: p, state }) => {
        if (!alive) return
        setProfile(p)
        setPlayerState(state)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!alive) return
        loadedFor.current = null
        setError(
          e instanceof Error
            ? e.message
            : 'Nao foi possivel carregar seu progresso.',
        )
      })
      .finally(() => {
        if (alive) setReady(true)
      })

    return () => {
      alive = false
    }
  }, [session, attempt])

  const signOut = useCallback(async () => {
    await doSignOut()
    loadedFor.current = null
    setProfile(null)
    setPlayerState(null)
    setSession(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ ready, session, profile, playerState, error, retry, signOut }),
    [ready, session, profile, playerState, error, retry, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
