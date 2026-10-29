import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Chip({
  active,
  onClick,
  children,
  size = 'md',
  className,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors',
        size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
        active ? 'border-brand bg-brand text-brand-ink shadow-xs' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}
