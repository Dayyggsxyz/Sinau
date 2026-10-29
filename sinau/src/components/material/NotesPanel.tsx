import { useMemo, useRef, useState } from 'react'
import { BookOpenCheck, Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Markdown } from '@/components/ui/Markdown'
import { useToast } from '@/components/ui/Toast'
import { useLibrary } from '@/context/LibraryContext'
import { aiService, NOTES_MODES } from '@/services/ai.service'
import { cn } from '@/lib/cn'
import type { Material, NotesMode } from '@/types'

/** Catatan belajar sesuai mode, dengan pilihan bab/bagian dan laporan bagian yang gagal. */
export function NotesPanel({ material }: { material: Material }) {
  const { updateMaterial } = useLibrary()
  const toast = useToast()
  const [mode, setMode] = useState<NotesMode>('lengkap')
  const [selected, setSelected] = useState<string[]>(() => material.sections.map((s) => s.id))
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  const doc = material.notes?.[mode]
  const allSelected = selected.length === material.sections.length
  const modeInfo = useMemo(() => NOTES_MODES.find((m) => m.value === mode)!, [mode])
  if (material.sections.length === 0) return null

  async function generate() {
    if (busy || selected.length === 0) return
    setBusy(true)
    setError(null)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const r = await aiService.generateNotes(material, mode, selected, { signal: ctrl.signal, onProgress: (done, total) => setProgress({ done, total }) })
      updateMaterial(material.id, { notes: { ...material.notes, [mode]: { markdown: r.markdown, sectionIds: selected, failedTitles: r.failedTitles, createdAt: new Date().toISOString() } } })
      if (r.failedTitles.length) toast.show({ tone: 'danger', title: 'Sebagian bagian gagal', description: `Belum tercakup: ${r.failedTitles.join(', ')}.` })
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : 'Gagal membuat catatan.')
    } finally {
      setBusy(false)
      setProgress(null)
      abort.current = null
    }
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <section id="catatan" className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><BookOpenCheck className="size-5 text-brand" aria-hidden />Catatan belajar</h2>
      <p className="mt-1 text-sm text-muted">Pilih jenis catatan dan bagian yang ingin dipelajari. Setiap mode menghasilkan isi yang berbeda.</p>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Jenis catatan">
        {NOTES_MODES.map((m) => (
          <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => setMode(m.value)} className={cn('rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors', mode === m.value ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted hover:text-ink')}>
            {m.label}{material.notes?.[m.value] ? ' •' : ''}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{modeInfo.hint}</p>

      <details className="mt-4 rounded-xl border border-line">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">Bagian yang dicakup ({selected.length} dari {material.sections.length})</summary>
        <div className="border-t border-line p-3">
          <button type="button" onClick={() => setSelected(allSelected ? [] : material.sections.map((s) => s.id))} className="mb-2 text-xs font-semibold text-brand underline">{allSelected ? 'Kosongkan pilihan' : 'Pilih semua'}</button>
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {material.sections.map((s, i) => (
              <li key={s.id}>
                <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-surface-2">
                  <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
                  <span className="min-w-0 flex-1 truncate">{i + 1}. {s.title}</span>
                  {s.pageStart !== undefined && <span className="shrink-0 text-xs text-muted">hal. {s.pageStart}{s.pageEnd && s.pageEnd !== s.pageStart ? `–${s.pageEnd}` : ''}</span>}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={generate} disabled={!aiService.isLive || busy || selected.length === 0}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : doc ? <RefreshCw className="size-4" aria-hidden /> : null}
          {busy ? 'Menyusun catatan...' : doc ? 'Buat ulang' : 'Buat catatan'}
        </Button>
        {busy && <Button variant="ghost" onClick={() => abort.current?.abort()}><X className="size-4" aria-hidden />Batalkan</Button>}
        {busy && progress && <span className="text-sm text-muted" role="status">Bagian {progress.done} dari {progress.total} selesai</span>}
      </div>
      {!aiService.isLive && <p className="mt-2 text-xs text-muted">Membuat catatan butuh AI terhubung di .env.local.</p>}
      {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}

      {doc && (
        <div className="mt-5 border-t border-line pt-5">
          {doc.failedTitles.length > 0 && (
            <p className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">Belum tercakup karena gagal diproses: {doc.failedTitles.join(', ')}. Tekan "Buat ulang" untuk mencoba lagi.</p>
          )}
          <p className="mb-3 text-xs text-muted">Mencakup {doc.sectionIds.length - doc.failedTitles.length} dari {doc.sectionIds.length} bagian terpilih. Dibuat oleh AI; periksa dengan materi asli.</p>
          <Markdown>{doc.markdown}</Markdown>
        </div>
      )}
    </section>
  )
}
