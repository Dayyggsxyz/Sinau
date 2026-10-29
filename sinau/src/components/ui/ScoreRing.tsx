import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

export function ScoreRing({
  value,
  size = 176,
  stroke = 14,
  label,
  className,
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
  className?: string
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(v))
    return () => cancelAnimationFrame(id)
  }, [v])

  const offset = circumference * (1 - shown / 100)
  const tone = v >= 75 ? 'text-ok' : v >= 50 ? 'text-warn' : 'text-danger'

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }} role="img" aria-label={`Skor ${v} dari 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-[stroke-dashoffset] duration-1000 ease-out', tone)}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-display text-5xl font-bold leading-none tabular-nums', tone)}>{v}</span>
        {label && <span className="mt-1 text-xs font-semibold text-muted">{label}</span>}
      </div>
    </div>
  )
}
