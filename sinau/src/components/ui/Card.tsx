import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Elevation = 'flat' | 'raised' | 'floating'

const elevations: Record<Elevation, string> = {
  flat: 'border border-line bg-surface',
  raised: 'border border-line bg-surface shadow-sm',
  floating: 'border border-line bg-surface shadow-md',
}

export function Card({
  elevation = 'raised',
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { elevation?: Elevation }) {
  return <div className={cn('rounded-2xl', elevations[elevation], className)} {...rest} />
}
