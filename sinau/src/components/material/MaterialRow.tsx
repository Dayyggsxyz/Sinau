import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Material } from '@/types'
import { FileBadge } from '@/components/ui/FileBadge'
import { SubjectBadge } from '@/components/ui/SubjectBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { subjectStyle } from '@/lib/subjects'
import { formatDate } from '@/lib/format'

export function MaterialRow({ material: m, compact = false }: { material: Material; compact?: boolean }) {
  return (
    <Link to={`/materi/${m.id}`} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2">
      <FileBadge type={m.fileType} className="w-12 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold group-hover:text-brand">{m.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <SubjectBadge subject={m.subject} />
          <span>{m.grade}</span>
          {!compact && <span>{m.readMinutes} menit baca</span>}
          <span>Diperbarui {formatDate(m.updatedAt)}</span>
        </div>
      </div>
      {!compact && (
        <div className="hidden w-32 shrink-0 sm:block">
          <div className="mb-1 text-right text-xs font-semibold">{m.progress}%</div>
          <ProgressBar value={m.progress} label={`Progres ${m.title}`} className={subjectStyle[m.subject].bar} />
        </div>
      )}
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
    </Link>
  )
}
