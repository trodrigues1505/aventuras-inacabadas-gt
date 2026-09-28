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
type Toast = {
  id: number
  tone: Tone
  message: string
  portrait?: string   // ex: 'dani', 'kira' — mapeia para assets/crew/{id}.webp
}

// Função pública: toast(tone, message) ou toast(tone, message, crewId)
type PushFn = (tone: Tone, message: string, portrait?: string) => void

const ToastContext = createContext<PushFn | null>(null)

const ICON = {
  success: Check,
  error:   AlertTriangle,
  info:    Info,
  reward:  Sparkles,
} as const

const TONE = {
  success: 'text-good',
  error:   'text-bad',
  info:    'text-azure',
  reward:  'text-ember',
} as const

const RING = {
  success: 'ring-good/30',
  error:   'ring-bad/30',
  info:    'ring-azure/30',
  reward:  'ring-ember/30',
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const push = useCallback<PushFn>((tone, message, portrait) => {
    const id = Date.now() + Math.random()
    setItems((list) => [...list, { id, tone, message, portrait }])
    window.setTimeout(
      () => setItems((list) => list.filter((t) => t.id !== id)),
      3800,
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
        {items.map(({ id, tone, message, portrait }) => {
          const Icon = ICON[tone]
          return (
            <div
              key={id}
              className="rise lift-lg flex min-w-[240px] max-w-[340px] items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-3"
            >
              {portrait ? (
                /* Rosto do personagem */
                <img
                  src={`assets/crew/${portrait}.webp`}
                  alt={portrait}
                  className={`size-9 shrink-0 rounded-full object-cover ring-2 ${RING[tone]}`}
                  loading="lazy"
                />
              ) : (
                /* Ícone padrão */
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-raised ${TONE[tone]}`}>
                  <Icon size={15} aria-hidden />
                </span>
              )}
              <p className="text-[13px] leading-snug text-text">{message}</p>
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
