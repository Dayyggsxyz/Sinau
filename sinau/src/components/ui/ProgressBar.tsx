import { cn } from '@/lib/cn'

export function ProgressBar({
  value,
  label,
  className,
  trackClassName,
  size = 'md',
  animate = true,
}: {
  value: number
  label?: string
  className?: string
  trackClassName?: string
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}) {
  const v = Math.max(0, Math.min(100, value))
  const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' }
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full bg-line', heights[size], trackClassName)}
    >
      <div
        className={cn('h-full rounded-full bg-brand', animate && 'transition-[width] duration-700 ease-out', className)}
        style={{ width: `${v}%` }}
      />
    </div>
  )
}
