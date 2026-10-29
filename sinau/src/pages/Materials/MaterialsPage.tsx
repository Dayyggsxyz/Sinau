import { useMemo, useState } from 'react'
import { LayoutGrid, List, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { MaterialCard } from '@/components/material/MaterialCard'
import { MaterialRow } from '@/components/material/MaterialRow'
import { UploadDialog } from '@/components/upload/UploadDialog'
import { useLibrary } from '@/context/LibraryContext'
import { cn } from '@/lib/cn'
import type { FileType, Subject } from '@/types'

const fileTypes: ('semua' | FileType)[] = ['semua', 'pdf', 'docx', 'pptx', 'txt']
type Sort = 'terbaru' | 'judul' | 'progres'

export default function MaterialsPage() {
  const { materials } = useLibrary()
  const subjects = useMemo<('Semua' | Subject)[]>(() => ['Semua', ...Array.from(new Set(materials.map((m) => m.subject)))], [materials])
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState<'Semua' | Subject>('Semua')
  const [fileType, setFileType] = useState<'semua' | FileType>('semua')
  const [sort, setSort] = useState<Sort>('terbaru')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [uploadOpen, setUploadOpen] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = materials.filter(
      (m) =>
        (subject === 'Semua' || m.subject === subject) &&
        (fileType === 'semua' || m.fileType === fileType) &&
        (!q || `${m.title} ${m.description} ${m.subject}`.toLowerCase().includes(q)),
    )
    return filtered.sort((a, b) => {
      if (sort === 'judul') return a.title.localeCompare(b.title, 'id')
      if (sort === 'progres') return b.progress - a.progress
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [materials, query, subject, fileType, sort])

  function reset() {
    setQuery('')
    setSubject('Semua')
    setFileType('semua')
  }

  return (
    <div>
      <PageHeader
        title="Materi Saya"
        description={`${materials.length} materi. Materi tersimpan di browser ini, terpisah untuk setiap akun.`}
        actions={
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" aria-hidden />
            Unggah materi
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput value={query} onChange={setQuery} placeholder="Cari judul atau topik" label="Cari materi" className="flex-1" />
          <div className="flex gap-2">
            <label className="relative">
              <span className="sr-only">Urutkan</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-11 rounded-xl border border-line bg-surface px-3 pr-8 text-sm shadow-xs focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="terbaru">Terbaru</option>
                <option value="judul">Judul A-Z</option>
                <option value="progres">Progres tertinggi</option>
              </select>
            </label>
            <div role="radiogroup" aria-label="Tampilan" className="flex rounded-xl border border-line bg-surface p-1 shadow-xs">
              {([['grid', LayoutGrid, 'Tampilan kartu'], ['list', List, 'Tampilan daftar']] as const).map(([v, Icon, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  aria-label={label}
                  onClick={() => setView(v)}
                  className={cn('rounded-lg px-2.5 transition-colors', view === v ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink')}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter pelajaran">
            {subjects.map((s) => (
              <Chip key={s} active={subject === s} onClick={() => setSubject(s)}>
                {s}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter format">
            {fileTypes.map((t) => (
              <Chip key={t} active={fileType === t} onClick={() => setFileType(t)} size="sm">
                {t === 'semua' ? 'Semua format' : t.toUpperCase()}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {materials.length === 0 ? (
          <EmptyState
            icon={Upload}
            title="Belum ada materi"
            description="Unggah PDF, DOCX, PPTX, atau TXT untuk mulai belajar."
            action={<Button variant="primary" onClick={() => setUploadOpen(true)}>Unggah materi</Button>}
          />
        ) : results.length === 0 ? (
          <EmptyState
            title="Tidak ada materi yang cocok"
            description="Coba kata kunci lain atau hapus filter yang sedang aktif."
            action={<Button onClick={reset}>Hapus semua filter</Button>}
          />
        ) : view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((m) => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {results.map((m) => (
              <MaterialRow key={m.id} material={m} />
            ))}
          </Card>
        )}
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  )
}
