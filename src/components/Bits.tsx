import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'azure' | 'good' | 'ember' | 'bad'
}) {
  const tones = {
    neutral: 'bg-raised text-muted',
    azure: 'bg-azure/10 text-azure',
    good: 'bg-good/10 text-good',
    ember: 'bg-ember/10 text-ember',
    bad: 'bg-bad/10 text-bad',
  } as const

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function SectionHeader({
  title,
  note,
  action,
}: {
  title: string
  note?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="display text-[24px] text-text md:text-[27px]">{title}</h1>
        {note && <p className="mt-1 text-[13px] text-muted">{note}</p>}
      </div>
      {action}
    </header>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  note,
  action,
}: {
  icon: LucideIcon
  title: string
  note: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="mb-1 grid size-11 place-items-center rounded-full bg-raised text-faint">
        <Icon size={20} aria-hidden />
      </span>
      <p className="text-[14px] font-semibold text-text">{title}</p>
      <p className="max-w-[320px] text-[13px] text-muted">{note}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/**
 * Confirmação destrutiva. Existe em vez de window.confirm() porque
 * o diálogo nativo não obedece ao design system e, no mobile,
 * aparece deslocado do contexto que o originou.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[14px] text-muted">{message}</p>
    </Modal>
  )
}
