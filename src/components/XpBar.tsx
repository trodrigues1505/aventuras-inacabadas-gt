export function XpBar({
  xp,
  required,
  label,
}: {
  xp: number
  required: number
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round((xp / required) * 100)))
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] text-muted">{label ?? 'Experiencia'}</span>
        <span className="text-[13px] text-ember tabular-nums">
          {xp} / {required}
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-raised overflow-hidden"
        role="progressbar"
        aria-valuenow={xp}
        aria-valuemin={0}
        aria-valuemax={required}
        aria-label={label ?? 'Experiencia'}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2563c9] to-[#f0b429] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
