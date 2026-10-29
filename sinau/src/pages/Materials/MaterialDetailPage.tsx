import { NotesPanel } from '@/components/material/NotesPanel'
import { InlineMarkdown, Markdown } from '@/components/ui/Markdown'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Circle, Layers, ListChecks, MessageSquareText, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileBadge } from '@/components/ui/FileBadge'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SubjectBadge } from '@/components/ui/SubjectBadge'
import { useToast } from '@/components/ui/Toast'
import { useLibrary } from '@/context/LibraryContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { aiService } from '@/services/ai.service'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { subjectStyle } from '@/lib/subjects'
import type { Material } from '@/types'

export default function MaterialDetailPage() {
  const { id } = useParams()
  const { getMaterial } = useLibrary()
  const material = getMaterial(id)
  if (!material) {
    return (
      <EmptyState
        title="Materi tidak ditemukan"
        description="Materi ini mungkin sudah dihapus atau tautannya salah."
        action={<Button variant="primary" to="/materi">Kembali ke Materi Saya</Button>}
      />
    )
  }
  return <MaterialReader key={material.id} m={material} />
}

type Busy = null | 'summary' | 'quiz' | 'cards'

function MaterialReader({ m }: { m: Material }) {
  const navigate = useNavigate()
  const { getQuizForMaterial, updateMaterial, removeMaterial, setProgress, setCards, setQuiz, flashcards } = useLibrary()
  const quiz = getQuizForMaterial(m.id)
  const hasCards = flashcards.some((c) => c.materialId === m.id)
  const isUpload = m.source === 'upload'

  const toast = useToast()
  const [busy, setBusy] = useState<Busy>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Sebelum ada tanda manual, anggap bagian awal sudah dibaca sesuai progres tersimpan.
  const [stored, setStored] = useLocalStorage<string[] | null>(`read:${m.id}`, null)
  const derived = m.sections.slice(0, Math.round((m.progress / 100) * m.sections.length)).map((s) => s.id)
  const readIds = (stored ?? derived).filter((id) => m.sections.some((s) => s.id === id))
  const readPct = Math.round((readIds.length / Math.max(1, m.sections.length)) * 100)

  const tocItems = useMemo(
    () => [
      ...(m.summary.length ? [{ id: 'rangkuman', title: 'Rangkuman' }] : []),
      ...m.sections.map((s) => ({ id: s.id, title: s.title })),
      ...(m.glossary.length ? [{ id: 'istilah', title: 'Istilah penting' }] : []),
    ],
    [m],
  )

  const [activeId, setActiveId] = useState(tocItems[0]?.id ?? '')
  useEffect(() => {
    const els = tocItems.map((t) => document.getElementById(t.id)).filter((el): el is HTMLElement => !!el)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-90px 0px -65% 0px' },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [tocItems])

  function toggleRead(sectionId: string) {
    const next = readIds.includes(sectionId) ? readIds.filter((x) => x !== sectionId) : [...readIds, sectionId]
    setStored(next)
    setProgress(m.id, Math.round((next.length / Math.max(1, m.sections.length)) * 100))
  }

  async function run(kind: Exclude<Busy, null>, job: () => Promise<void>) {
    setBusy(kind)
    try {
      await job()
    } catch (e) {
      toast.show({
        tone: 'danger',
        title: 'Proses AI gagal',
        description: e instanceof Error ? e.message : 'Coba lagi sebentar lagi.',
      })
    } finally {
      setBusy(null)
    }
  }

  const makeSummary = () =>
    run('summary', async () => {
      const text = m.rawText ?? m.sections.map((s) => `${s.title}\n${s.body.join('\n')}`).join('\n\n')
      const s = await aiService.structureMaterial(text, { textTruncated: m.coverage?.textTruncated })
      updateMaterial(m.id, { subject: s.subject ?? m.subject, description: s.description || m.description, summary: s.summary, sections: s.sections, glossary: s.glossary, coverage: s.coverage, progress: 0 })
      setStored([])
      setProgress(m.id, 0)
      toast.show(s.coverage.failedRanges.length ? { tone: 'danger', title: 'Sebagian bagian gagal diproses', description: `Gagal: ${s.coverage.failedRanges.join(', ')}. Coba lagi untuk melengkapi.` } : { tone: 'ok', title: 'Rangkuman dibuat', description: `Seluruh ${s.coverage.totalChunks} bagian dokumen berhasil diproses.` })
    })

  const makeQuiz = () =>
    run('quiz', async () => {
      const wanted = 20
      const questions = await aiService.generateQuiz(m, wanted, { onWarn: (msg) => toast.show({ tone: 'danger', title: 'Jumlah soal kurang', description: msg }) })
      const quizId = `quiz-${m.id}-${Date.now().toString(36)}`
      setQuiz({ id: quizId, materialId: m.id, title: m.title, description: `Soal latihan dari materi ${m.title}.`, durationMin: Math.max(3, questions.length), questions })
      navigate(`/quiz/${quizId}`)
    })

  const makeCards = () =>
    run('cards', async () => {
      setCards(m.id, await aiService.generateFlashcards(m))
      navigate(`/flashcard?deck=${m.id}`)
    })

  const aiHint = aiService.isLive ? undefined : 'Hubungkan AI di .env.local untuk memakai fitur ini'

  // Materi contoh hanya bisa diganti isinya jika berupa unggahan; hindari mengubah data bawaan.
  const canRestructure = isUpload && aiService.isLive

  return (
    <div>
      <Link to="/materi" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Materi Saya
      </Link>

      <header className="mb-8 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <FileBadge type={m.fileType} />
          <SubjectBadge subject={m.subject} />
          {!isUpload && <Badge tone="warn">Materi contoh</Badge>}
        </div>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">{m.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{m.description}</p>
        <p className="mt-3 text-sm text-muted">
          {m.grade}, {m.pages} halaman, {m.readMinutes} menit baca, diperbarui {formatDate(m.updatedAt)}
        </p>
        {m.coverage && m.coverage.totalChunks > 0 && (
          <p className={cn('mt-3 max-w-2xl rounded-lg px-3 py-2 text-sm', m.coverage.failedRanges.length || m.coverage.textTruncated ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok')} role="status">
            {m.coverage.failedRanges.length === 0
              ? `Seluruh dokumen (${m.coverage.totalPages} halaman) berhasil diproses dalam ${m.coverage.totalChunks} bagian.`
              : `${m.coverage.okChunks} dari ${m.coverage.totalChunks} bagian berhasil diproses. Belum tercakup: ${m.coverage.failedRanges.join(', ')}. Gunakan "Susun ulang dengan AI" untuk melengkapi.`}
            {m.coverage.textTruncated ? ' Teks sangat panjang, sebagian akhir tidak tersimpan untuk soal dan flashcard.' : ''}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {hasCards ? (
            <Button to={`/flashcard?deck=${m.id}`}><Layers className="size-4" aria-hidden />Flashcard</Button>
          ) : (
            <Button onClick={makeCards} disabled={!aiService.isLive || busy !== null} loading={busy === 'cards'} title={aiHint}>
              {busy !== 'cards' && <Layers className="size-4" aria-hidden />}
              Buat flashcard
            </Button>
          )}
          {quiz ? (
            <Button to={`/quiz/${quiz.id}`}><ListChecks className="size-4" aria-hidden />Latihan quiz</Button>
          ) : (
            <Button onClick={makeQuiz} disabled={!aiService.isLive || busy !== null} loading={busy === 'quiz'} title={aiHint}>
              {busy !== 'quiz' && <ListChecks className="size-4" aria-hidden />}
              Buat quiz
            </Button>
          )}
          <Button variant="primary" to={`/tutor?materi=${m.id}`}>
            <MessageSquareText className="size-4" aria-hidden />
            Tanya AI Tutor
          </Button>
          {isUpload && (
            <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" aria-hidden />
              Hapus
            </Button>
          )}
        </div>
        {!aiService.isLive && (!hasCards || !quiz) && <p className="mt-3 text-xs text-muted">Pembuatan flashcard dan quiz otomatis aktif setelah AI terhubung di .env.local.</p>}
      </header>

      <div className="gap-12 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem]">
        <article className="min-w-0 max-w-[68ch] space-y-10">
          {m.summary.length > 0 ? (
            <section id="rangkuman" className="scroll-mt-24 rounded-xl bg-brand-soft p-5 sm:p-6">
              <h2 className="text-xl font-semibold">Rangkuman</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand">
                {m.summary.map((s, i) => (<li key={i}>{s}</li>))}
              </ul>
              {isUpload ? <p className="mt-4 text-xs text-muted">Dibuat oleh AI dari isi file. Periksa kembali dengan materi aslinya.</p> : <p className="mt-4 text-xs text-muted">Rangkuman contoh ditulis manual.</p>}
            </section>
          ) : isUpload ? (
            <section className="rounded-xl border border-dashed border-line p-5 sm:p-6">
              <h2 className="text-xl font-semibold">Rangkuman belum dibuat</h2>
              <p className="mt-1.5 text-sm text-muted">AI bisa merangkum isi, merapikan bagian, dan menyusun istilah penting dari teks file ini.</p>
              <Button className="mt-4" variant="primary" onClick={makeSummary} disabled={!canRestructure || busy !== null} loading={busy === 'summary'} title={aiHint}>
                {busy !== 'summary' && <Sparkles className="size-4" aria-hidden />}
                Buat rangkuman dengan AI
              </Button>
            </section>
          ) : null}

          {isUpload && <NotesPanel material={m} />}

          {m.sections.map((s, i) => {
            const isRead = readIds.includes(s.id)
            return (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-semibold leading-snug">
                    <span className="mr-2 text-muted">{i + 1}.</span>
                    {s.title}
                    {s.pageStart !== undefined && <span className="ml-2 align-middle text-xs font-medium text-muted">{s.pageEnd && s.pageEnd !== s.pageStart ? `hal. ${s.pageStart}–${s.pageEnd}` : `hal. ${s.pageStart}`}</span>}
                  </h2>
                  <button
                    type="button"
                    onClick={() => toggleRead(s.id)}
                    aria-pressed={isRead}
                    className={cn('mt-1 flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors', isRead ? 'bg-ok-soft text-ok' : 'bg-surface-2 text-muted hover:text-ink')}
                  >
                    {isRead ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                    {isRead ? 'Sudah dibaca' : 'Tandai dibaca'}
                  </button>
                </div>
                <div className="mt-4 space-y-4 text-[17px] leading-relaxed">
                  {s.body.map((p, j) => (<Markdown key={j}>{p}</Markdown>))}
                </div>
                {s.keyPoints && s.keyPoints.length > 0 && (
                  <div className="mt-5 rounded-lg border-l-4 border-accent bg-surface px-4 py-3">
                    <p className="text-sm font-semibold">Poin kunci</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm marker:text-accent">
                      {s.keyPoints.map((k, j) => (<li key={j}><InlineMarkdown>{k}</InlineMarkdown></li>))}
                    </ul>
                  </div>
                )}
              </section>
            )
          })}

          {m.glossary.length > 0 && (
            <section id="istilah" className="scroll-mt-24">
              <h2 className="text-2xl font-semibold">Istilah penting</h2>
              <dl className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
                {m.glossary.map((g) => (
                  <div key={g.term} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                    <dt className="font-semibold">{g.term}</dt>
                    <dd className="text-muted">{g.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </article>

        <aside className="mt-10 hidden lg:mt-0 lg:block">
          <div className="sticky top-10 space-y-5">
            <nav aria-label="Daftar isi">
              <p className="mb-2 text-sm font-semibold">Daftar isi</p>
              <ul className="max-h-[50vh] overflow-y-auto border-l border-line">
                {tocItems.map((t) => {
                  const active = activeId === t.id
                  const done = readIds.includes(t.id)
                  return (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        onClick={(e) => { e.preventDefault(); document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                        aria-current={active ? 'location' : undefined}
                        className={cn('-ml-px flex items-center justify-between gap-2 border-l-2 py-1.5 pl-3 text-sm transition-colors', active ? 'border-accent font-semibold text-ink' : 'border-transparent text-muted hover:text-ink')}
                      >
                        <span>{t.title}</span>
                        {done && <Check className="size-3.5 shrink-0 text-ok" aria-label="Sudah dibaca" />}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">Progres baca</span>
                <span>{readPct}%</span>
              </div>
              <ProgressBar value={readPct} label="Progres baca" className={subjectStyle[m.subject].bar} />
              <p className="mt-2 text-xs text-muted">Tersimpan di browser ini.</p>
            </Card>
          </div>
        </aside>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Hapus materi ini?"
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Batal</Button><Button variant="danger" onClick={() => { removeMaterial(m.id); navigate('/materi') }}>Hapus materi</Button></>}
      >
        <p>"{m.title}" beserta flashcard dan quiz yang dibuat darinya akan dihapus dari browser ini. Tindakan ini tidak bisa dibatalkan.</p>
      </Modal>
    </div>
  )
}
