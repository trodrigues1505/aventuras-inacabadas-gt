import { useCallback } from 'react'
import { useAuth } from './AuthProvider'
import { fetchPlayerState } from '../services/challengeService'

/**
 * Relê player_state depois de uma RPC que mexeu em XP, créditos, recursos
 * ou casco. O servidor é quem alterou; aqui só se reflete no HUD.
 */
export function usePlayerRefresh() {
  const { session, applyPlayerState } = useAuth()
  const userId = session?.user.id ?? null
  return useCallback(async () => {
    if (!userId) return
    applyPlayerState(await fetchPlayerState(userId))
  }, [userId, applyPlayerState])
}
