import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-azure text-white hover:bg-azure-deep active:bg-azure-deep ' +
    'disabled:bg-azure/40',
  secondary:
    'bg-surface text-text border border-line hover:bg-raised ' +
    'disabled:text-faint',
  ghost:
    'bg-transparent text-muted hover:bg-raised hover:text-text ' +
    'disabled:text-faint',
  // Destrutivo começa discreto e só "acende" no hover: o peso visual
  // de um botão vermelho sólido atrai o clique que ele deveria evitar.
  danger:
    'bg-bad/10 text-bad hover:bg-bad hover:text-white disabled:bg-bad/5',
}

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-[14px] gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={
        'inline-flex shrink-0 items-center justify-center rounded-[10px] font-medium ' +
        'transition-colors duration-150 disabled:cursor-not-allowed ' +
        `${VARIANT[variant]} ${SIZE[size]} ${className}`
      }
    >
      {loading && <Loader2 size={15} className="spin" aria-hidden />}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  icon: Icon,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  icon: (p: { size?: number }) => ReactNode
}) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className="grid size-8 shrink-0 place-items-center rounded-[8px] text-faint transition-colors duration-150 hover:bg-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon size={15} />
    </button>
  )
}
