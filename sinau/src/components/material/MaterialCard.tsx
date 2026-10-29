import { Link } from 'react-router-dom'
import type { Material } from '@/types'
import { FileBadge } from '@/components/ui/FileBadge'
import { SubjectBadge } from '@/components/ui/SubjectBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { subjectStyle } from '@/lib/subjects'
import { formatDate } from '@/lib/format'

const lines = ['w-4/5', 'w-full', 'w-11/12', 'w-3/5', 'w-full', 'w-2/3']

export function MaterialCard({ material: m }: { material: Material }) {
  return (
    <Link
      to={`/materi/${m.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md"
    >
      <div className="relative h-36 overflow-hidden bg-surface-2 px-8 pt-6" aria-hidden>
        <div className="mx-auto h-full max-w-40 rounded-t-md border border-b-0 border-line bg-surface p-3">
          <div className="mb-2.5 h-2 w-3/5 rounded bg-ink/80" />
          <div className="space-y-1.5">
            {lines.map((w, i) => (
              <div key={i} className={`h-1 rounded bg-line ${w}`} />
            ))}
          </div>
        </div>
        <FileBadge type={m.fileType} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <SubjectBadge subject={m.subject} className="self-start" />
        <h3 className="text-lg font-semibold leading-snug group-hover:text-brand">{m.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{m.description}</p>
        <div className="mt-auto pt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
            <span>{m.grade}, {m.pages} halaman</span>
            <span className="font-semibold text-ink">{m.progress}%</span>
          </div>
          <ProgressBar value={m.progress} label={`Progres ${m.title}`} className={subjectStyle[m.subject].bar} />
          <p className="mt-2 text-xs text-muted">Diperbarui {formatDate(m.updatedAt)}</p>
        </div>
      </div>
    </Link>
  )
}
