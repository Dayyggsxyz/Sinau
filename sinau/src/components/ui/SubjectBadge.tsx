import type { Subject } from '@/types'
import { cn } from '@/lib/cn'
import { subjectStyle } from '@/lib/subjects'

export function SubjectBadge({ subject, className }: { subject: Subject; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold', subjectStyle[subject].badge, className)}>
      {subject}
    </span>
  )
}
