import { Loader2 } from 'lucide-react'

export function FullScreenLoader({ label = 'Carregando' }: { label?: string }) {
  return (
    <div className="min-h-dvh grid place-items-center text-muted gap-3">
      <Loader2 size={22} className="spin text-azure" aria-hidden />
      <p className="text-[13px]">{label}</p>
    </div>
  )
}
