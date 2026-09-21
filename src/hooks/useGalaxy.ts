// ============================================================
// FASE 2 — hook: useGalaxy
// Responsável por:
//   - carregar worlds + player_worlds do Supabase
//   - calcular status (locked | available | colonized) por XP
//   - expor função de colonização
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { World, PlayerWorld, WorldWithStatus } from '../types/galaxy'

interface UseGalaxyReturn {
  worlds: WorldWithStatus[]
  loading: boolean
  error: string | null
  colonize: (worldId: string, customName: string) => Promise<void>
  refreshWorlds: () => Promise<void>
}

export function useGalaxy(playerXP: number): UseGalaxyReturn {
  const [worlds, setWorlds] = useState<WorldWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorlds = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Buscar todos os planetas fixos
      const { data: worldsData, error: worldsErr } = await supabase
        .from('worlds')
        .select('*')
        .order('region_order', { ascending: true })
        .order('planet_order', { ascending: true })

      if (worldsErr) throw worldsErr

      // 2. Buscar colonizações do jogador atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: playerWorlds, error: pwErr } = await supabase
        .from('player_worlds')
        .select('*')
        .eq('player_id', user.id)

      if (pwErr) throw pwErr

      // 3. Mapear status por XP do jogador
      const playerWorldMap = new Map<string, PlayerWorld>(
        (playerWorlds ?? []).map((pw) => [pw.world_id, pw])
      )

      const withStatus: WorldWithStatus[] = (worldsData ?? []).map((w: World) => {
        const pw = playerWorldMap.get(w.id)
        const status =
          pw
            ? 'colonized'
            : playerXP >= w.xp_required
            ? 'available'
            : 'locked'

        return {
          ...w,
          status,
          playerWorld: pw,
        }
      })

      setWorlds(withStatus)
    } catch (err) {
      console.error('[useGalaxy] erro ao carregar planetas:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [playerXP])

  useEffect(() => {
    fetchWorlds()
  }, [fetchWorlds])

  const colonize = useCallback(
    async (worldId: string, customName: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const trimmed = customName.trim()
      if (!trimmed) throw new Error('Nome do planeta não pode ser vazio')
      if (trimmed.length > 40) throw new Error('Nome muito longo (máx. 40 caracteres)')

      // Verificar se o planeta já foi colonizado por este jogador
      const already = worlds.find((w) => w.id === worldId && w.status === 'colonized')
      if (already) throw new Error('Planeta já colonizado')

      // Verificar se o jogador tem XP suficiente
      const planet = worlds.find((w) => w.id === worldId)
      if (!planet) throw new Error('Planeta não encontrado')
      if (playerXP < planet.xp_required) throw new Error('XP insuficiente para colonizar este planeta')

      const { error } = await supabase.from('player_worlds').insert({
        player_id: user.id,
        world_id: worldId,
        custom_name: trimmed,
      })

      if (error) throw error

      // Atualizar estado local imediatamente (otimistic update)
      setWorlds((prev) =>
        prev.map((w) =>
          w.id === worldId
            ? {
                ...w,
                status: 'colonized',
                playerWorld: {
                  id: crypto.randomUUID(),
                  player_id: user.id,
                  world_id: worldId,
                  custom_name: trimmed,
                  colonized_at: new Date().toISOString(),
                  missions_total: 0,
                  missions_won: 0,
                  explored_pct: 0,
                },
              }
            : w
        )
      )
    },
    [worlds, playerXP]
  )

  return {
    worlds,
    loading,
    error,
    colonize,
    refreshWorlds: fetchWorlds,
  }
}
