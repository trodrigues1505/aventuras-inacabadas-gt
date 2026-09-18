import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium ' +
  'transition-[background-color,border-color,color,transform] duration-150 ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-45'

const variants: Record<Variant, string> = {
  primary:
    'bg-azure text-white hover:bg-[#6fb8ff] shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]',
  secondary:
    'bg-raised text-text border border-line hover:bg-interactive hover:border-[#3d2f63]',
  ghost: 'text-muted hover:text-text hover:bg-raised',
  destructive: 'bg-transparent text-bad border border-[#4a2733] hover:bg-[#2a1620]',
}

const sizes: Record<Size, string> = {
  md: 'h-10 px-4 text-[14px]',
  lg: 'h-12 px-6 text-[15px]',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 size={16} className="spin" aria-hidden />}
      {children}
    </button>
  )
}
