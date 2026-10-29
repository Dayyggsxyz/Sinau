import type { ReactNode } from 'react'
import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Penanda fitur yang belum terhubung ke backend. Pakai di setiap tempat yang memakai data/aksi demo. */
export function DemoNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border border-warn/30 bg-warn-soft px-3.5 py-3 text-sm text-ink', className)} role="note">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
      <p>{children}</p>
    </div>
  )
}
