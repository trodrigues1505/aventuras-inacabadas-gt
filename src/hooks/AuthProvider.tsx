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

// trim(): um secret colado com quebra de linha no fim nunca bateria com o e-mail do login.
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '').trim()

type AuthValue = {
  ready: boolean
  session: Session | null
  profile: Profile | null
  playerState: PlayerState | null
  isAdmin: boolean
  /** false enquanto o banco ainda não respondeu se este usuário é admin. */
  adminReady: boolean
  error: string | null
  retry: () => void
  signOut: () => Promise<void>
  /** Substitui o estado após uma escrita já confirmada pelo servidor. */
  applyPlayerState: (state: PlayerState) => void
  applyProfile: (profile: Profile) => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Confirmação pelo próprio banco (função is_admin()), para não depender só
  // do e-mail embutido no build. Guarda de QUEM é a resposta: ao trocar de
  // usuário, a resposta antiga nunca vale para o novo.
  const [adminProbe, setAdminProbe] = useState<{ uid: string; admin: boolean } | null>(null)
  const uid = session?.user.id ?? null

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

  useEffect(() => {
    if (!supabaseConfigured || !uid) return
    let alive = true
    ;(async () => {
      let admin = false
      try {
        const { data, error: rpcError } = await (supabase.rpc as any)('is_admin')
        admin = !rpcError && data === true
      } catch {
        admin = false // sem resposta: vale só o e-mail do build
      }
      if (alive) setAdminProbe({ uid, admin })
    })()
    return () => {
      alive = false
    }
  }, [uid])

  const dbAdmin = adminProbe !== null && adminProbe.uid === uid && adminProbe.admin
  const adminReady = !supabaseConfigured || !uid || adminProbe?.uid === uid

  const signOut = useCallback(async () => {
    await doSignOut()
    loadedFor.current = null
    setProfile(null)
    setPlayerState(null)
    setSession(null)
  }, [])

  const applyPlayerState = useCallback((state: PlayerState) => {
    setPlayerState(state)
  }, [])

  const applyProfile = useCallback((next: Profile) => {
    setProfile(next)
  }, [])

  /**
   * isAdmin é conveniência de interface: decide o que desenhar, nunca
   * o que pode ser lido. Quem autoriza de fato é a policy is_admin()
   * no Postgres — forjar isto no cliente não revela dado nenhum.
   */
  const isAdmin = useMemo(
    () =>
      dbAdmin ||
      Boolean(
        ADMIN_EMAIL &&
          session?.user.email &&
          session.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      ),
    [session, dbAdmin],
  )

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      profile,
      playerState,
      isAdmin,
      adminReady,
      error,
      retry,
      signOut,
      applyPlayerState,
      applyProfile,
    }),
    [
      ready,
      session,
      profile,
      playerState,
      isAdmin,
      adminReady,
      error,
      retry,
      signOut,
      applyPlayerState,
      applyProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
