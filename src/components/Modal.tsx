import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    // Trava o scroll do fundo: sem isso a página rola atrás do
    // modal no mobile e o contexto se perde ao fechar.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Foco no primeiro campo, não no painel: o usuário abriu isto
    // para digitar algo.
    const first = panel.current?.querySelector<HTMLElement>(
      'input, textarea, select',
    )
    first?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#101728]/35 px-4 backdrop-blur-[3px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rise lift-lg w-full max-w-[470px] max-h-[86dvh] overflow-y-auto rounded-[18px] border border-line bg-surface"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="display text-[17px] text-text">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-[13px] text-faint">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1.5 -mt-1 rounded-[8px] p-1.5 text-faint transition-colors duration-150 hover:bg-raised hover:text-text"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="flex flex-col gap-4 px-6 py-5">{children}</div>

        {footer && (
          <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
