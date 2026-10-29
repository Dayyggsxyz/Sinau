import type { FileType } from '@/types'
import { cn } from '@/lib/cn'
import { fileTypeStyle } from '@/lib/subjects'

export function FileBadge({ type, className }: { type: FileType; className?: string }) {
  return (
    <span
      className={cn('inline-flex h-6 items-center justify-center rounded-md px-1.5 text-[11px] font-bold', fileTypeStyle[type], className)}
      aria-label={`Berkas ${type.toUpperCase()}`}
    >
      {type.toUpperCase()}
    </span>
  )
}
