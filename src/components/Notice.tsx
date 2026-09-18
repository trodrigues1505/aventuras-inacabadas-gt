import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

/** Estado de erro: diz o que aconteceu e o que fazer, sem pedir desculpas. */
export function Notice({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-[14px] border border-[#4a2733] bg-[#1f1220] p-5 flex gap-4 rise">
      <TriangleAlert size={18} className="text-bad shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium text-text mb-1">{title}</p>
        {children && <div className="text-[13px] text-muted break-words">{children}</div>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}
