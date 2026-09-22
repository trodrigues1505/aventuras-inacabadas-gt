import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthProvider'
import { listExploredWorlds } from '../services/worldService'
import { listMissions } from '../services/missionService'
import type { Mission, World } from '../types/database'

type GameValue = {
  loading: boolean
  worlds: World[]
  missions: Mission[]
  error: string | null
  /** Aplica uma mudança já confirmada pelo servidor, sem refetch. */
  putWorld: (w: World) => void
  dropWorld: (id: string) => void
  putMission: (m: Mission) => void
  dropMission: (id: string) => void
  reload: () => void
}

const GameContext = createContext<GameValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null

  const [loading, setLoading] = useState(true)
  const [worlds, setWorlds] = useState<World[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    if (!userId) {
      setWorlds([])
      setMissions([])
      setLoading(false)
      return
    }

    let alive = true
    setLoading(true)

    Promise.all([listExploredWorlds(userId), listMissions(userId)])
      .then(([w, m]) => {
        if (!alive) return
        setWorlds(w)
        setMissions(m)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(
          e instanceof Error ? e.message : 'Nao foi possivel carregar seus dados.',
        )
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [userId, attempt])

  /* Atualização local em vez de refetch: o servidor já devolveu a
     linha gravada, então buscar de novo só adiciona latência e um
     piscar de lista. Se a escrita falhar, nada disto roda. */
  const putWorld = useCallback((w: World) => {
    setWorlds((list) => {
      const i = list.findIndex((x) => x.id === w.id)
      if (i === -1) return [...list, w]
      const next = [...list]
      next[i] = w
      return next
    })
  }, [])

  const dropWorld = useCallback((id: string) => {
    setWorlds((list) => list.filter((w) => w.id !== id))
    // Espelha o ON DELETE SET NULL do banco, senão a missão ficaria
    // apontando para um mundo que a interface já não conhece.
    setMissions((list) =>
      list.map((m) => (m.world_id === id ? { ...m, world_id: null } : m)),
    )
  }, [])

  const putMission = useCallback((m: Mission) => {
    setMissions((list) => {
      const i = list.findIndex((x) => x.id === m.id)
      if (i === -1) return [m, ...list]
      const next = [...list]
      next[i] = m
      return next
    })
  }, [])

  const dropMission = useCallback((id: string) => {
    setMissions((list) => list.filter((m) => m.id !== id))
  }, [])

  const value = useMemo<GameValue>(
    () => ({
      loading,
      worlds,
      missions,
      error,
      putWorld,
      dropWorld,
      putMission,
      dropMission,
      reload,
    }),
    [
      loading,
      worlds,
      missions,
      error,
      putWorld,
      dropWorld,
      putMission,
      dropMission,
      reload,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame precisa estar dentro de <GameProvider>')
  return ctx
}
