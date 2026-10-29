import { Link } from 'react-router-dom'
import { Clock, ListChecks, Play, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DemoNotice } from '@/components/ui/DemoNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SubjectBadge } from '@/components/ui/SubjectBadge'
import { GeneratePanel } from '@/components/material/GeneratePanel'
import { useLibrary } from '@/context/LibraryContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { formatDate } from '@/lib/format'
import type { QuizResult } from '@/types'

export default function QuizListPage() {
  const { quizzes, getMaterial } = useLibrary()
  const [results] = useLocalStorage<Record<string, QuizResult>>('quiz-results', {})

  return (
    <div>
      <PageHeader
        title="Quiz"
        description="Kartu soal interaktif dengan dua mode: latihan (pembahasan seketika) atau ujian (dinilai di akhir)."
      />
      <DemoNotice className="mb-6">
        Quiz bawaan adalah contoh yang dibuat manual. Quiz dari materimu dibuat AI dan perlu kamu periksa. Skor terakhir hanya tersimpan di browser ini.
      </DemoNotice>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Belum ada quiz"
          description="Buat quiz dari salah satu materimu dengan bantuan AI."
          action={<Button variant="primary" to="/materi">Buka Materi Saya</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quizzes.map((q) => {
            const material = getMaterial(q.materialId)
            const last = results[q.id]
            const types = new Set(q.questions.map((x) => x.type))
            return (
              <Card key={q.id} className="flex flex-col p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  {material ? <SubjectBadge subject={material.subject} /> : <span />}
                  {last && (
                    <Badge tone={last.score >= 75 ? 'ok' : last.score >= 50 ? 'warn' : 'danger'}>
                      Skor terakhir {last.score}
                    </Badge>
                  )}
                </div>
                <h2 className="mt-3 text-xl font-semibold leading-snug">{q.title}</h2>
                <p className="mt-1.5 text-sm text-muted">{q.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
                  <span className="flex items-center gap-1.5"><ListChecks className="size-4" aria-hidden />{q.questions.length} soal</span>
                  <span className="flex items-center gap-1.5"><Clock className="size-4" aria-hidden />{q.durationMin} menit (opsional)</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Jenis soal: {[types.has('mcq') && 'pilihan ganda', types.has('tf') && 'benar/salah', types.has('short') && 'isian singkat'].filter(Boolean).join(', ')}
                </p>
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-tint px-3 py-2 text-xs font-semibold text-brand">
                  <Zap className="size-3.5" aria-hidden />
                  Tersedia mode Latihan dan Ujian
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="text-xs text-muted">{last ? `Dikerjakan ${formatDate(last.takenAt)}` : 'Belum pernah dikerjakan'}</span>
                  <Button variant="primary" to={`/quiz/${q.id}`}>
                    <Play className="size-4" aria-hidden />
                    {last ? 'Kerjakan lagi' : 'Mulai quiz'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <GeneratePanel kind="quiz" />
      <p className="mt-6 text-sm text-muted">
        Belum punya materi? <Link to="/materi" className="font-semibold text-brand hover:underline">Buka Materi Saya</Link> untuk mengunggah.
      </p>
    </div>
  )
}
