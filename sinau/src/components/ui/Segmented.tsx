import { cn } from '@/lib/cn'

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  fullWidth = false,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: React.ComponentType<{ className?: string }> }[]
  label: string
  fullWidth?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-xl border border-line bg-surface-2 p-1', fullWidth && 'flex w-full')}>
      {options.map((o) => {
        const Icon = o.icon
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              fullWidth && 'flex-1',
              active ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink',
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
