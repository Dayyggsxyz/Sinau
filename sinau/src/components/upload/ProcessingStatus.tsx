import { AlertCircle, Check, Loader2, Minus } from 'lucide-react'
import type { ProcessingStage } from '@/services/documents.service'
import { cn } from '@/lib/cn'

const steps: { id: ProcessingStage; label: string }[] = [
  { id: 'baca', label: 'Baca file' },
  { id: 'ekstraksi', label: 'Ekstraksi teks' },
  { id: 'rangkuman', label: 'Susun dengan AI' },
]

export function ProcessingStatus({
  stage,
  status,
  aiSkipped,
}: {
  stage: ProcessingStage
  status: 'processing' | 'done' | 'error'
  aiSkipped: boolean
}) {
  const current = steps.findIndex((s) => s.id === stage)
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {steps.map((s, i) => {
        const skipped = s.id === 'rangkuman' && aiSkipped
        const done = !skipped && (status === 'done' || i < current)
        const active = status === 'processing' && i === current && !skipped
        const failed = status === 'error' && i === current
        return (
          <li key={s.id} className={cn('flex items-center gap-1.5', failed ? 'text-danger' : done ? 'text-ok' : active ? 'font-semibold text-ink' : 'text-muted')}>
            {failed ? <AlertCircle className="size-3.5" aria-hidden /> : skipped ? <Minus className="size-3.5" aria-hidden /> : done ? <Check className="size-3.5" aria-hidden /> : active ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <span className="size-1.5 rounded-full bg-line" aria-hidden />}
            {s.label}
            {skipped && ' (dilewati)'}
          </li>
        )
      })}
    </ol>
  )
}
