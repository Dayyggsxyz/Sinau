import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type CardStatus = 'neutral' | 'correct' | 'wrong'

const statusRing: Record<CardStatus, string> = {
  neutral: 'border-line',
  correct: 'border-ok/60 ring-4 ring-ok/15',
  wrong: 'border-danger/60 ring-4 ring-danger/15',
}

/**
 * Permukaan kartu bersama untuk mode flashcard dan quiz. Latar bergaris (motif buku tulis)
 * hanya dipakai di kartu ini dan panel login.
 */
export function CardFrame({
  status = 'neutral',
  className,
  children,
  ruled = false,
  enter,
}: {
  status?: CardStatus
  className?: string
  children: ReactNode
  ruled?: boolean
  /** Arah animasi masuk saat kartu berganti. */
  enter?: 'next' | 'prev'
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-3xl border bg-surface shadow-md transition-[border-color,box-shadow] duration-300',
        statusRing[status],
        ruled && 'ruled',
        enter === 'next' && 'card-in-right',
        enter === 'prev' && 'card-in-left',
        className,
      )}
    >
      {children}
    </div>
  )
}
