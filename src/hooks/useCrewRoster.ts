import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'
import { ensureCrewSeeded, type CrewAttributes } from '../services/crewService'
import type { AttributeKey } from '../data/crew'

/** Ficha atual dos 6 tripulantes (atributos, ferimento). Relê sob demanda. */
export function useCrewRoster() {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  const [rows, setRows] = useState<CrewAttributes[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!userId) return
    try {
      setRows(await ensureCrewSeeded(userId))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    reload().catch(() => setLoading(false))
  }, [reload])

  return { rows, loading, reload }
}

/** Disponível = sem ferimento, ou ferimento que já venceu (o servidor libera no sync). */
export function isAvailable(row: CrewAttributes | undefined, now = Date.now()): boolean {
  if (!row) return false
  return row.status === 'ok' || (row.injured_until != null && new Date(row.injured_until).getTime() <= now)
}

export function isInjuredNow(row: CrewAttributes | undefined, now = Date.now()): boolean {
  return Boolean(row && row.status === 'injured' && row.injured_until && new Date(row.injured_until).getTime() > now)
}

export function attrValue(row: CrewAttributes | undefined, attr: AttributeKey): number {
  return row ? row[attr] : 0
}
