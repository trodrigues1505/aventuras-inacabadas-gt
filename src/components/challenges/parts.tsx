import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Database, Package, Radio } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../../hooks/AuthProvider'
import { RESOURCE_LABEL } from '../../data/challenges'
import type { ResourceKey } from '../../types/challenges'

export const HOUR = 3_600_000
export const DAY = 24 * HOUR

export const RESOURCE_ICON: Record<ResourceKey, LucideIcon> = {
  suprimentos: Package,
  dados: Database,
  pulsos: Radio,
}

export const RISK_TONE = { baixo: 'good', médio: 'ember', alto: 'bad' } as const

/** Relógio compartilhado: atualiza contadores sem refazer requisições. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

/**
 * Ferramentas de teste (forçar sucesso/falha). Aparecem para o admin OU por
 * um interruptor local — no console do navegador:
 *   localStorage.setItem('ai:debug', '1')   // liga
 *   localStorage.removeItem('ai:debug')     // desliga
 * O interruptor só decide se os botões APARECEM. Quem autoriza é o
 * servidor: as RPCs recusam `force` de quem não é administrador.
 */
export function useDebugTools(): boolean {
  const { isAdmin } = useAuth()
  let flag = false
  try {
    flag = window.localStorage.getItem('ai:debug') === '1'
  } catch {
    /* armazenamento bloqueado: vale só o isAdmin */
  }
  return isAdmin || flag
}

export function formatLeft(ms: number): string {
  if (ms <= 0) return 'encerrado'
  const d = Math.floor(ms / DAY)
  const h = Math.floor((ms % DAY) / HOUR)
  const m = Math.floor((ms % HOUR) / 60_000)
  if (d >= 1) return `${d}d ${h}h`
  if (h >= 1) return `${h}h ${m}min`
  return `${Math.max(1, m)}min`
}

export function bannerSlug(slug: string | null | undefined): string {
  // mesmo ajuste do GalaxyScreen: o banner de Nyx foi exportado como "nix"
  return slug === 'nyx' ? 'nix' : (slug ?? '')
}

/** Três barras crescentes — lê-se de relance, sem precisar de rótulo. */
export function IntensityMeter({ level, onDark }: { level: number; onDark?: boolean }) {
  const label = ['Leve', 'Séria', 'Crítica'][level - 1] ?? 'Leve'
  return (
    <span
      className="flex shrink-0 items-end gap-[3px]"
      role="img"
      aria-label={`Intensidade ${label.toLowerCase()}`}
      title={`Intensidade ${label.toLowerCase()}`}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[5px] rounded-[2px] ${
            i <= level
              ? level === 3
                ? 'bg-bad'
                : 'bg-ember'
              : onDark
                ? 'bg-white/20'
                : 'bg-line'
          }`}
          style={{ height: 6 + i * 5 }}
        />
      ))}
    </span>
  )
}

export function Countdown({ createdAt, expiresAt }: { createdAt: string; expiresAt: string }) {
  const now = useNow()
  const end = new Date(expiresAt).getTime()
  const start = new Date(createdAt).getTime()
  const left = end - now
  const pct = Math.max(0, Math.min(100, (left / Math.max(1, end - start)) * 100))
  const urgent = left < DAY
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className={`flex items-center gap-1.5 ${urgent ? 'font-medium text-bad' : 'text-muted'}`}>
          <Clock size={13} aria-hidden />
          {left <= 0 ? 'Encerrado' : `Encerra em ${formatLeft(left)}`}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-raised">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${urgent ? 'bg-bad' : 'bg-azure'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function RetryNote({ retryAt }: { retryAt: string | null }) {
  const now = useNow()
  if (!retryAt) return null
  const left = new Date(retryAt).getTime() - now
  if (left <= 0) return null
  return (
    <p className="mt-4 rounded-[10px] bg-ember/10 px-3.5 py-2.5 text-[12px] text-ember">
      A última tentativa falhou. Nova tentativa em {formatLeft(left)}.
    </p>
  )
}

export function HullPips({ damage }: { damage: number }) {
  return (
    <span
      className="flex items-center gap-2 text-[12px] text-muted"
      title={damage > 0 ? `Casco com ${damage} de 3 de dano` : 'Casco íntegro'}
    >
      Casco
      <span className="flex gap-1" role="img" aria-label={`Dano ao casco: ${damage} de 3`}>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-[10px] w-[14px] rounded-[3px] ${i <= damage ? 'bg-bad' : 'bg-line'}`}
          />
        ))}
      </span>
    </span>
  )
}

/** Quantidade de um recurso, com ícone. */
export function ResourceChip({
  resource,
  amount,
  tone = 'neutral',
}: {
  resource: ResourceKey
  amount: number
  tone?: 'neutral' | 'bad'
}) {
  const Icon = RESOURCE_ICON[resource]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[12px] font-medium tabular-nums ${
        tone === 'bad' ? 'bg-bad/10 text-bad' : 'bg-raised text-text'
      }`}
      title={`${amount} ${RESOURCE_LABEL[resource]}`}
    >
      <Icon size={12} className={tone === 'bad' ? '' : 'text-faint'} aria-hidden />
      {amount}
    </span>
  )
}

/** Link com a aparência de um botão (o Button do projeto é <button>). */
export function LinkButton({
  to,
  children,
  variant = 'primary',
}: {
  to: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
}) {
  return (
    <Link
      to={to}
      className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] px-4 text-[14px] font-medium transition-colors duration-150 ${
        variant === 'primary'
          ? 'bg-azure text-white hover:bg-azure-deep'
          : 'border border-line bg-surface text-text hover:bg-raised'
      }`}
    >
      {children}
    </Link>
  )
}
