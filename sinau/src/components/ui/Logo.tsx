import { cn } from '@/lib/cn'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--brand)" />
        <path d="M7 10.5c3-1.2 6-.9 9 1 3-1.9 6-2.2 9-1v12c-3-1.2-6-.9-9 1-3-1.9-6-2.2-9-1z" fill="none" stroke="var(--brand-ink)" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M16 11.5v12" stroke="var(--accent)" strokeWidth="1.8" />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight">Sinau</span>
    </span>
  )
}
