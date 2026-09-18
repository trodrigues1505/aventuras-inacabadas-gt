import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'article' | 'div'
}) {
  return (
    <Tag
      className={`rounded-[16px] bg-surface border border-line/70 p-6 ${className}`}
    >
      {children}
    </Tag>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[15px] font-semibold text-text tracking-[-0.01em] mb-1">
      {children}
    </h2>
  )
}

export function CardNote({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-muted leading-relaxed">{children}</p>
}
