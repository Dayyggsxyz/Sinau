import { useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, UploadCloud, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DemoNotice } from '@/components/ui/DemoNotice'
import { FileBadge } from '@/components/ui/FileBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ProcessingStatus } from './ProcessingStatus'
import { ACCEPT_ATTR, getExtension, processDocument, validateFile, type ProcessingStage } from '@/services/documents.service'
import { aiService } from '@/services/ai.service'
import { config } from '@/services/config'
import { useLibrary } from '@/context/LibraryContext'
import { useSettings } from '@/context/SettingsContext'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { FileType } from '@/types'

interface Entry {
  id: string
  file: File
  status: 'processing' | 'done' | 'error'
  stage: ProcessingStage
  error?: string
  warning?: string
  /** Kemajuan nyata pemrosesan AI per bagian dokumen (tidak ada = belum diketahui). */
  chunks?: { done: number; total: number }
  materialId?: string
}


export function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addMaterial } = useLibrary()
  const { settings } = useSettings()
  const [entries, setEntries] = useState<Entry[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const removed = useRef(new Set<string>())

  const patch = (id: string, p: Partial<Entry>) => setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...p } : e)))

  function addFiles(list: FileList | null) {
    if (!list) return
    Array.from(list).forEach((file) => {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      const error = validateFile(file)
      setEntries((es) => [...es, { id, file, status: error ? 'error' : 'processing', stage: 'baca', error: error ?? undefined }])
      if (error) return
      processDocument(file, { grade: settings.grade, onStage: (stage) => patch(id, { stage }), onProgress: (done, total) => patch(id, { chunks: { done, total } }) })
        .then(({ material, warning }) => {
          if (removed.current.has(id)) return
          addMaterial(material)
          patch(id, { status: 'done', materialId: material.id, warning })
        })
        .catch((e: unknown) => patch(id, { status: 'error', error: e instanceof Error ? e.message : 'File gagal diproses.' }))
    })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Unggah materi"
      size="lg"
      footer={
        <>
          {entries.length > 0 && <Button variant="ghost" onClick={() => setEntries([])}>Bersihkan daftar</Button>}
          <Button variant="primary" onClick={onClose}>Selesai</Button>
        </>
      }
    >
      {aiService.isLive ? (
        <p className="mb-4 text-sm text-muted">File dibaca di browser. Teks hasil ekstraksi dikirim ke penyedia AI yang kamu konfigurasi untuk disusun menjadi materi. File aslinya tidak diunggah ke server.</p>
      ) : (
        <DemoNotice className="mb-4">AI belum terhubung. File tetap dibaca di browser dan masuk ke Materi Saya, tetapi tanpa rangkuman, istilah, dan struktur otomatis.</DemoNotice>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn('flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors', dragging ? 'border-brand bg-brand-soft' : 'border-line')}
      >
        <UploadCloud className="size-8 text-brand" aria-hidden />
        <p className="mt-3 font-semibold">Tarik file ke sini atau pilih dari perangkat</p>
        <p className="mt-1 text-sm text-muted">PDF, DOCX, PPTX, atau TXT, maksimal {config.maxUploadMb} MB per file</p>
        <Button className="mt-4" onClick={() => inputRef.current?.click()}>Pilih file</Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="sr-only"
          aria-label="Pilih file materi"
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {entries.length > 0 && (
        <ul className="mt-5 space-y-3">
          {entries.map((entry) => (
            <UploadRow
              key={entry.id}
              entry={entry}
              onOpen={onClose}
              onRemove={() => {
                removed.current.add(entry.id)
                setEntries((es) => es.filter((x) => x.id !== entry.id))
              }}
            />
          ))}
        </ul>
      )}
    </Modal>
  )
}

function UploadRow({ entry, onRemove, onOpen }: { entry: Entry; onRemove: () => void; onOpen: () => void }) {
  const ext = getExtension(entry.file.name) as FileType
  const ftype: FileType = ['pdf', 'docx', 'pptx', 'txt'].includes(ext) ? ext : 'txt'
  const done = entry.status === 'done'
  return (
    <li className="rounded-lg border border-line p-3.5">
      <div className="flex items-center gap-3">
        <FileBadge type={ftype} className="w-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{entry.file.name}</p>
          <p className="text-xs text-muted">{formatBytes(entry.file.size)}</p>
        </div>
        <button type="button" onClick={onRemove} aria-label={`Hapus ${entry.file.name} dari daftar`} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {entry.status === 'error' ? (
          <p className="flex items-start gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {entry.error}
          </p>
        ) : (
          <>
            {(done || entry.chunks) && <ProgressBar value={done ? 100 : (entry.chunks!.done / entry.chunks!.total) * 100} label={`Pemrosesan ${entry.file.name}`} className={done ? 'bg-ok' : undefined} />}
            {!done && entry.chunks && <p className="text-xs text-muted" role="status">Menyusun bagian {entry.chunks.done} dari {entry.chunks.total} dokumen</p>}
            <ProcessingStatus stage={entry.stage} status={entry.status} aiSkipped={!aiService.isLive} />
          </>
        )}
        {done && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs text-muted">
              <CheckCircle2 className="size-4 text-ok" aria-hidden />
              Ditambahkan ke Materi Saya.
            </p>
            {entry.materialId && (
              <Link to={`/materi/${entry.materialId}`} onClick={onOpen} className="text-sm font-semibold text-brand hover:underline">
                Buka materi
              </Link>
            )}
          </div>
        )}
        {entry.warning && <p className="text-xs text-warn">{entry.warning}</p>}
      </div>
    </li>
  )
}
