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
import { useAuth } from './AuthProvider'
import { useGame } from './GameProvider'
import { CHALLENGE_CONFIG } from '../data/challenges'
import { planSpawns } from '../services/challengeEngine'
import {
  listBridgeChallenges,
  listFieldChallenges,
  spawnBridgeChallenge,
  spawnFieldChallenge,
  syncGameState,
} from '../services/challengeService'
import type { BridgeChallenge, FieldChallenge } from '../types/challenges'

type ChallengeValue = {
  loading: boolean
  /** Desafios de campo ativos e dentro do prazo. */
  fields: FieldChallenge[]
  /** Desafios de bordo ativos e dentro do prazo. */
  bridges: BridgeChallenge[]
  /** Relê as duas listas do banco (sem reavaliar o gatilho). */
  reloadLists: () => Promise<void>
}

const ChallengeContext = createContext<ChallengeValue | null>(null)

/**
 * Roda UMA vez por carregamento do app (depois que missões e planetas
 * chegaram): encerra o que venceu, avalia a negligência por planeta e
 * cria os desafios que o gatilho pedir. Não reavalia a cada missão
 * concluída — por isso lê missões/planetas por ref e não pelo efeito.
 *
 * Se as tabelas da Fase 5 ainda não existem no banco, o erro é só
 * registrado no console: o resto do app continua funcionando.
 */
export function ChallengeProvider({ children }: { children: ReactNode }) {
  const { session, playerState } = useAuth()
  const { worlds, missions, loading: gameLoading } = useGame()
  const userId = session?.user.id ?? null

  const [loading, setLoading] = useState(true)
  const [allFields, setAllFields] = useState<FieldChallenge[]>([])
  const [allBridges, setAllBridges] = useState<BridgeChallenge[]>([])

  const live = useRef({ worlds, missions, level: playerState?.level ?? 1 })
  live.current = { worlds, missions, level: playerState?.level ?? 1 }

  const reloadLists = useCallback(async () => {
    if (!userId) return
    const [f, b] = await Promise.all([
      listFieldChallenges(userId),
      listBridgeChallenges(userId),
    ])
    setAllFields(f)
    setAllBridges(b)
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setAllFields([])
      setAllBridges([])
      setLoading(false)
      return
    }
    if (gameLoading) return

    let alive = true
    ;(async () => {
      try {
        await syncGameState()
        const [f, b] = await Promise.all([
          listFieldChallenges(userId),
          listBridgeChallenges(userId),
        ])

        const { worlds: ws, missions: ms, level } = live.current
        if (level >= CHALLENGE_CONFIG.minLevel) {
          const plan = planSpawns({ worlds: ws, missions: ms, challenges: f, bridges: b })
          for (const spawn of plan.fields) {
            const id = await spawnFieldChallenge(spawn)
            if (id && spawn.bridge) await spawnBridgeChallenge(id, spawn.bridge)
          }
          if (plan.independentBridge) await spawnBridgeChallenge(null, plan.independentBridge)
        }

        // Relê depois de criar: as RPCs devolvem só o id, e a lista tem de
        // refletir também o que outra aba/execução tenha criado.
        if (alive) await reloadLists()
      } catch (e) {
        console.error('[challenges] não foi possível sincronizar:', e)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [userId, gameLoading, reloadLists])

  const fields = useMemo(
    () =>
      allFields.filter(
        (c) => c.status === 'active' && new Date(c.expires_at).getTime() > Date.now(),
      ),
    [allFields],
  )
  const bridges = useMemo(
    () =>
      allBridges.filter(
        (b) => b.status === 'active' && new Date(b.expires_at).getTime() > Date.now(),
      ),
    [allBridges],
  )

  const value = useMemo<ChallengeValue>(
    () => ({ loading, fields, bridges, reloadLists }),
    [loading, fields, bridges, reloadLists],
  )

  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>
}

export function useChallenges() {
  const ctx = useContext(ChallengeContext)
  if (!ctx) throw new Error('useChallenges precisa estar dentro de <ChallengeProvider>')
  return ctx
}
