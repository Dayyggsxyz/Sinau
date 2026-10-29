import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useLibrary } from '@/context/LibraryContext'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { aiService, type QuizDifficulty } from '@/services/ai.service'

const COUNTS = ['10', '20', '30', '40'] as const

/** Membuat flashcard atau quiz dari materi yang belum punya, memakai AI. */
export function GeneratePanel({ kind }: { kind: 'cards' | 'quiz' }) {
  const navigate = useNavigate()
  const { materials, flashcards, quizzes, setCards, setQuiz } = useLibrary()
  const candidates = useMemo(
    () => materials.filter((m) => (kind === 'cards' ? !flashcards.some((c) => c.materialId === m.id) : !quizzes.some((q) => q.materialId === m.id))),
    [materials, flashcards, quizzes, kind],
  )
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState<(typeof COUNTS)[number]>('20')
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('campuran')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const toast = useToast()

  if (candidates.length === 0) return null
  const label = kind === 'cards' ? 'flashcard' : 'quiz'
  const materialId = candidates.some((m) => m.id === selected) ? selected : candidates[0].id

  async function generate() {
    const material = candidates.find((m) => m.id === materialId)
    if (!material) return
    setBusy(true)
    setError(null)
    try {
      if (kind === 'cards') {
        setCards(material.id, await aiService.generateFlashcards(material))
        navigate(`/flashcard?deck=${material.id}`)
      } else {
        const wanted = Number(count)
        const questions = await aiService.generateQuiz(material, wanted, { difficulty, onProgress: (done, total) => setProgress({ done, total }), onWarn: (msg) => toast.show({ tone: 'danger', title: 'Jumlah soal kurang dari permintaan', description: msg }) })
        const id = `quiz-${material.id}-${Date.now().toString(36)}`
        setQuiz({ id, materialId: material.id, title: material.title, description: `Soal latihan dari materi ${material.title}.`, durationMin: Math.max(3, questions.length), questions })
        navigate(`/quiz/${id}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Proses AI gagal. Coba lagi.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <Card className="mt-8 p-5">
      <h2 className="text-xl font-semibold">Buat {label} dengan AI</h2>
      <p className="mt-1 text-sm text-muted">
        {aiService.isLive ? `Pilih materi yang belum punya ${label}. Isi materi dikirim ke penyedia AI yang kamu konfigurasi.` : `Fitur ini aktif setelah AI terhubung. Isi VITE_AI_PROVIDER dan VITE_AI_API_KEY di .env.local, lalu restart server.`}
      </p>
      {kind === 'quiz' && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted">Jumlah soal</p>
            <Segmented label="Jumlah soal" size="sm" value={count} onChange={setCount} options={COUNTS.map((c) => ({ value: c, label: c }))} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted">Tingkat kesulitan</p>
            <Segmented label="Tingkat kesulitan" size="sm" value={difficulty} onChange={setDifficulty} options={[{ value: 'campuran', label: 'Campuran' }, { value: 'mudah', label: 'Mudah' }, { value: 'sedang', label: 'Sedang' }, { value: 'sulit', label: 'Sulit' }]} />
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Materi sumber</span>
          <select value={materialId} onChange={(e) => setSelected(e.target.value)} disabled={busy} className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none">
            {candidates.map((m) => (<option key={m.id} value={m.id}>{m.title}</option>))}
          </select>
        </label>
        <Button variant="primary" size="lg" className="h-11" onClick={generate} disabled={!aiService.isLive} loading={busy}>
          {!busy && <Sparkles className="size-4" aria-hidden />}
          {busy ? 'Membuat...' : `Buat ${label}`}
        </Button>
      </div>
      {busy && progress && <p className="mt-3 text-sm text-muted" role="status">Memproses bagian materi {progress.done} dari {progress.total}...</p>}
      {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
    </Card>
  )
}
