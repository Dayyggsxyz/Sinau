import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Footprints, Loader2, Play, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Markdown } from '@/components/ui/Markdown'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { RunnerGame, type RunnerResult } from '@/components/runner/RunnerGame'
import { useLibrary } from '@/context/LibraryContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { buildRunnerPool, MIN_POOL } from '@/lib/runnerPool'
import { cn } from '@/lib/cn'
import { aiService } from '@/services/ai.service'

type Stage = 'setup' | 'tutorial' | 'play' | 'result'

export default function RunnerPage() {
  const { materials, quizzes, flashcards, setQuiz } = useLibrary()
  const toast = useToast()
  const [stage, setStage] = useState<Stage>('setup')
  const [materialId, setMaterialId] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RunnerResult | null>(null)
  const [best, setBest] = useLocalStorage<Record<string, number>>('runner-best', {})
  const [sound, setSound] = useLocalStorage<boolean>('runner-sound', true)
  const [tutorialSeen, setTutorialSeen] = useLocalStorage<boolean>('runner-tutorial', false)
  const [isNewBest, setIsNewBest] = useState(false)

  const material = materials.find((m) => m.id === materialId) ?? materials[0]
  const pool = useMemo(() => (material ? buildRunnerPool(material, quizzes, flashcards) : []), [material, quizzes, flashcards])
  const ready = pool.length >= MIN_POOL

  if (materials.length === 0) {
    return (
      <div>
        <PageHeader title="Sinau Runner" description="Lari dari guru sambil menjawab soal dari materimu." />
        <EmptyState icon={Footprints} title="Belum ada materi" description="Unggah materi dulu. Soal permainan dibuat dari materi milikmu sendiri." action={<Button variant="primary" to="/materi">Ke Materi Saya</Button>} />
      </div>
    )
  }

  async function prepare() {
    if (!material || busy) return
    setBusy(true)
    setError(null)
    try {
      const questions = await aiService.generateQuiz(material, 30, { onProgress: (done, total) => setProgress({ done, total }), onWarn: (m) => toast.show({ tone: 'danger', title: 'Soal kurang dari target', description: m }) })
      setQuiz({ id: `quiz-${material.id}-${Date.now().toString(36)}`, materialId: material.id, title: material.title, description: `Soal latihan dari materi ${material.title}.`, durationMin: Math.max(3, questions.length), questions })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyiapkan soal. Coba lagi.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  function start() {
    setStage(tutorialSeen ? 'play' : 'tutorial')
  }

  function finish(r: RunnerResult) {
    if (material) {
      const prev = best[material.id] ?? 0
      setIsNewBest(r.score > prev)
      if (r.score > prev) setBest((b) => ({ ...b, [material.id]: r.score }))
    }
    setResult(r)
    setStage('result')
  }

  if (stage === 'play' && material) {
    return (
      <div>
        <PageHeader title="Sinau Runner" description={material.title} />
        <RunnerGame pool={pool} sound={sound} onToggleSound={() => setSound((v) => !v)} onFinish={finish} onExit={() => setStage('setup')} />
      </div>
    )
  }

  if (stage === 'tutorial') {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="Cara bermain" />
        <Card className="p-6">
          <ol className="list-decimal space-y-3 pl-5 text-[15px] leading-relaxed">
            <li>Kamu berlari, dan guru mengejar dari belakang. Jarak ke guru ditampilkan di bar atas.</li>
            <li>Setiap 10–15 detik muncul satu soal dan tiga pintu: <strong>A</strong>, <strong>B</strong>, <strong>C</strong>. Hanya satu pintu yang benar.</li>
            <li>Pilih pintu sebelum pintu sampai. Di HP: ketuk tombol jawaban. Di komputer: tombol <kbd className="rounded border border-line px-1">1</kbd> <kbd className="rounded border border-line px-1">2</kbd> <kbd className="rounded border border-line px-1">3</kbd> atau <kbd className="rounded border border-line px-1">A</kbd> <kbd className="rounded border border-line px-1">B</kbd> <kbd className="rounded border border-line px-1">C</kbd>. Panah atas/bawah memindahkan jalur, Enter mengunci.</li>
            <li>Jawaban benar menambah skor dan menjauhkan guru. Jawaban salah atau waktu habis membuat guru mendekat. Tiga kesalahan beruntun tanpa jawaban benar di antaranya membuatmu tertangkap.</li>
            <li>Tekan <kbd className="rounded border border-line px-1">P</kbd> atau tombol jeda kapan saja. Semakin banyak soal terjawab, semakin cepat kamu berlari.</li>
          </ol>
          <div className="mt-6 flex gap-2">
            <Button variant="primary" onClick={() => { setTutorialSeen(true); setStage('play') }}><Play className="size-4" aria-hidden />Mengerti, mulai</Button>
            <Button variant="ghost" onClick={() => setStage('setup')}>Kembali</Button>
          </div>
        </Card>
      </div>
    )
  }

  if (stage === 'result' && result && material) {
    const total = result.correct + result.wrong
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={result.wrong > 0 ? 'Kamu tertangkap guru' : 'Permainan selesai'} description={material.title} />
        <Card className="p-6">
          {isNewBest && <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-sm font-semibold text-ok"><Trophy className="size-4" aria-hidden />Skor terbaik baru</p>}
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[['Skor', result.score], ['Jarak', `${Math.round(result.distance)} m`], ['Benar', result.correct], ['Salah', result.wrong]].map(([k, v]) => (
              <div key={k as string}><dt className="text-xs font-semibold text-muted">{k}</dt><dd className="text-2xl font-bold tabular-nums">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-muted">
            {total > 0 ? `Akurasi ${Math.round((result.correct / total) * 100)}%` : 'Belum ada soal yang dijawab'} · beruntun terbaik {result.bestStreak}x{result.repeats > 0 ? ' · soal sempat diulang karena materi terbatas' : ''}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setStage('play')}><RotateCcw className="size-4" aria-hidden />Main lagi</Button>
            <Button to={`/materi/${material.id}`}>Pelajari materi</Button>
            <Button variant="ghost" onClick={() => setStage('setup')}>Pilih materi lain</Button>
          </div>
        </Card>

        <h2 className="mb-3 mt-8 text-xl font-semibold">Pembahasan jawaban salah</h2>
        {result.mistakes.length === 0 ? (
          <p className="text-muted">Tidak ada jawaban salah. Mantap.</p>
        ) : (
          <ul className="space-y-3">
            {result.mistakes.map((m, i) => (
              <li key={i}>
                <Card className="p-4">
                  <p className="font-semibold">{m.question.prompt}</p>
                  <p className="mt-2 text-sm"><span className="font-semibold text-ok">Jawaban benar:</span> {m.question.doors[m.question.correct]}</p>
                  <p className="text-sm text-muted">{m.outcome === 'timeout' || m.picked === null ? 'Kamu tidak sempat memilih.' : 'Kamu memilih pintu lain.'}</p>
                  {m.question.explanation && <div className="mt-2 text-sm"><Markdown>{m.question.explanation}</Markdown></div>}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // setup
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Sinau Runner" description="Lari dari guru, pilih pintu jawaban yang benar. Semua soal berasal dari materimu." />
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Pilih materi</h2>
        <div className="mt-3 grid gap-2" role="radiogroup" aria-label="Materi sumber soal">
          {materials.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={m.id === material?.id}
              onClick={() => { setMaterialId(m.id); setError(null) }}
              className={cn('flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors', m.id === material?.id ? 'border-brand bg-brand-tint' : 'border-line hover:bg-surface-2')}
            >
              <span className="min-w-0 truncate font-semibold">{m.title}</span>
              {best[m.id] ? <span className="shrink-0 text-xs text-muted">Terbaik {best[m.id]}</span> : null}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl bg-surface-2 p-4 text-sm" role="status">
          {ready ? (
            <p><strong>{pool.length} soal siap</strong> dari quiz, flashcard, dan istilah materi ini.</p>
          ) : (
            <p>
              Baru <strong>{pool.length}</strong> soal tiga-pintu yang bisa dibuat dari materi ini; minimal {MIN_POOL} agar permainan tidak membosankan.{' '}
              {aiService.isLive ? 'AI bisa membuatkan soal baru dari seluruh isi materi.' : 'Buat quiz atau flashcard dulu di halaman materi (butuh AI terhubung).'}
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
        {busy && progress && <p className="mt-3 text-sm text-muted" role="status">Menyiapkan soal dari bagian {progress.done} dari {progress.total}...</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {ready ? (
            <Button variant="primary" size="lg" onClick={start}><Play className="size-4" aria-hidden />Mulai berlari</Button>
          ) : (
            <Button variant="primary" size="lg" onClick={prepare} disabled={!aiService.isLive || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              {busy ? 'Menyiapkan soal...' : 'Siapkan soal dengan AI'}
            </Button>
          )}
          {material && <Button variant="ghost" size="lg" to={`/materi/${material.id}`}>Lihat materi</Button>}
        </div>
        {!ready && aiService.isLive && <p className="mt-3 text-xs text-muted">Ini membuat quiz baru untuk materi ini dan menggantikan quiz lamanya (bila ada). Soal disiapkan sebelum permainan, bukan saat bermain.</p>}
      </Card>
      <p className="mt-4 text-xs text-muted">Soal benar/salah tidak dipakai karena permainan memakai tiga pintu. <Link to="/quiz" className="text-brand underline">Latihan quiz biasa</Link></p>
    </div>
  )
}
