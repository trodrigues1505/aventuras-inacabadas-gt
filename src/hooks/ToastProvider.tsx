import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, Check, Info, Sparkles } from 'lucide-react'

type Tone = 'success' | 'error' | 'info' | 'reward'
type Toast = { id: number; tone: Tone; message: string }

const ToastContext = createContext<((tone: Tone, message: string) => void) | null>(
  null,
)

const ICON = {
  success: Check,
  error: AlertTriangle,
  info: Info,
  reward: Sparkles,
} as const

const TONE = {
  success: 'text-good',
  error: 'text-bad',
  info: 'text-azure',
  reward: 'text-ember',
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const push = useCallback((tone: Tone, message: string) => {
    const id = Date.now() + Math.random()
    setItems((list) => [...list, { id, tone, message }])
    window.setTimeout(
      () => setItems((list) => list.filter((t) => t.id !== id)),
      3600,
    )
  }, [])

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-24 right-4 z-[60] flex flex-col gap-2 md:bottom-6 md:right-6"
      >
        {items.map(({ id, tone, message }) => {
          const Icon = ICON[tone]
          return (
            <div
              key={id}
              className="rise lift-lg flex min-w-[240px] max-w-[330px] items-start gap-2.5 rounded-[12px] border border-line bg-surface px-4 py-3"
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${TONE[tone]}`} aria-hidden />
              <p className="text-[13px] text-text">{message}</p>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}
