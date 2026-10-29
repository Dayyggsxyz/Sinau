import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronDown, ClipboardCheck, Clock, Flame, ListChecks, RotateCcw, Trophy, X, XCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Kbd } from '@/components/ui/Kbd'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Toggle } from '@/components/ui/Toggle'
import { QuizCard } from '@/components/study/QuizCard'
import { useCardKeys } from '@/components/study/useCardKeys'
import { useToast } from '@/components/ui/Toast'
import { useLibrary } from '@/context/LibraryContext'
import { useSettings } from '@/context/SettingsContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { formatClock } from '@/lib/format'
import { formatCorrectAnswer, formatUserAnswer, isAnswered, isCorrect } from '@/lib/quiz'
import { answeredCount, applyAnswer, createSession, goto, isRevealed, sessionResult, type StudyMode } from '@/lib/quizSession'
import { cn } from '@/lib/cn'
import type { Answers, AnswerValue, Quiz, QuizResult } from '@/types'

export default function QuizSessionPage() {
  const { quizId } = useParams()
  const { quizzes } = useLibrary()
  const quiz = quizzes.find((q) => q.id === quizId)
  if (!quiz) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Quiz tidak ditemukan"
        description="Quiz ini tidak tersedia atau tautannya salah."
        action={<Button variant="primary" to="/quiz">Kembali ke daftar quiz</Button>}
      />
    )
  }
  return <QuizSession key={quiz.id} quiz={quiz} />
}

type Phase = 'setup' | 'running' | 'result'

function QuizSession({ quiz }: { quiz: Quiz }) {
  const { settings, update } = useSettings()
  const { getMaterial } = useLibrary()
  const toast = useToast()
  const material = getMaterial(quiz.materialId)
  const [, setResults] = useLocalStorage<Record<string, QuizResult>>('quiz-results', {})

  const [phase, setPhase] = useState<Phase>('setup')
  const [mode, setMode] = useState<StudyMode>(settings.studyMode)
  const [timerOn, setTimerOn] = useState(settings.quizTimerDefault)
  const [session, setSession] = useState(() => createSession(settings.studyMode))
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [remaining, setRemaining] = useState(quiz.durationMin * 60)
  const [elapsed, setElapsed] = useState(0)
  const [exitOpen, setExitOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const startedAt = useRef(0)

  const total = quiz.questions.length
  const question = quiz.questions[session.current]
  const answered = answeredCount(session, quiz)
  const revealed = question ? isRevealed(session, question.id) : false
  const locked = revealed
  const last = session.current === total - 1
  const result = useMemo(() => (phase === 'result' ? sessionResult(session, quiz) : null), [phase, session, quiz])

  const finish = useCallback(() => {
    const r = sessionResult(session, quiz)
    setElapsed(Math.round((Date.now() - startedAt.current) / 1000))
    setResults((prev) => ({ ...prev, [quiz.id]: { score: r.score, correct: r.correct, total: r.total, takenAt: new Date().toISOString() } }))
    setSubmitOpen(false)
    setExitOpen(false)
    setPhase('result')
  }, [session, quiz, setResults])

  const start = useCallback(
    (nextMode: StudyMode) => {
      setSession(createSession(nextMode))
      setRemaining(quiz.durationMin * 60)
      setElapsed(0)
      setDirection('next')
      startedAt.current = Date.now()
      update({ studyMode: nextMode })
      setPhase('running')
    },
    [quiz.durationMin, update],
  )

  const go = useCallback(
    (delta: number) => {
      setDirection(delta > 0 ? 'next' : 'prev')
      setSession((s) => goto(s, quiz, s.current + delta))
    },
    [quiz],
  )

  const answer = useCallback(
    (value: AnswerValue) => {
      if (!question) return
      setSession((s) => applyAnswer(s, quiz, question.id, value))
    },
    [question, quiz],
  )

  // Timer berjalan saat mode ujian/latihan dengan timer aktif.
  useEffect(() => {
    if (phase !== 'running' || !timerOn) return
    const t = setInterval(() => setRemaining((r) => r - 1), 1000)
    return () => clearInterval(t)
  }, [phase, timerOn])

  useEffect(() => {
    if (phase === 'running' && timerOn && remaining <= 0) finish()
  }, [phase, timerOn, remaining, finish])

  const optionCount = question?.type === 'mcq' ? question.options.length : question?.type === 'tf' ? 2 : 0

  useCardKeys({
    enabled: phase === 'running',
    prev: session.current > 0 ? () => go(-1) : undefined,
    next: !last ? () => go(1) : undefined,
    option:
      question?.type === 'mcq'
        ? (i) => answer(i)
        : question?.type === 'tf'
          ? (i) => answer(i === 0)
          : undefined,
    optionCount,
  })

  if (phase === 'setup') {
    return <QuizSetup quiz={quiz} mode={mode} setMode={setMode} timerOn={timerOn} setTimerOn={setTimerOn} onStart={() => start(mode)} materialTitle={material?.title} />
  }

  if (phase === 'result' && result) {
    return (
      <QuizResultView
        quiz={quiz}
        result={result}
        answers={session.answers}
        mode={session.mode}
        elapsed={elapsed}
        materialId={material?.id}
        onRetry={() => start(session.mode)}
      />
    )
  }

  if (!question) return null
  const low = timerOn && remaining <= 60

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setExitOpen(true)}>
            <X className="size-4" aria-hidden />
            Keluar
          </Button>
          <span className="hidden truncate text-sm text-muted sm:inline">{quiz.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
            {session.mode === 'latihan' ? 'Mode latihan' : 'Mode ujian'}
          </span>
          {session.mode === 'latihan' && session.streak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1 text-xs font-bold text-warn" aria-label={`Beruntun benar ${session.streak}`}>
              <Flame className="size-3.5" aria-hidden />
              {session.streak}
            </span>
          )}
          {timerOn && (
            <span
              role="timer"
              aria-label={`Sisa waktu ${formatClock(remaining)}`}
              className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-sm font-bold tabular-nums', low ? 'bg-danger-soft text-danger' : 'bg-surface-2')}
            >
              <Clock className="size-3.5" aria-hidden />
              {formatClock(remaining)}
            </span>
          )}
        </div>
      </div>

      <ProgressBar value={(answered / total) * 100} label="Soal terjawab" className={cn(session.mode === 'latihan' && 'bg-ok')} />

      <div className="mt-5">
        <QuizCard
          key={question.id}
          question={question}
          index={session.current}
          total={total}
          value={session.answers[question.id]}
          revealed={revealed}
          locked={locked}
          onChange={answer}
          enter={direction}
        />
      </div>

      {session.mode === 'latihan' && !revealed && (
        <p className="mt-3 text-center text-sm text-muted">Pilih jawaban untuk melihat pembahasan langsung.</p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button onClick={() => go(-1)} disabled={session.current === 0}>
          <ArrowLeft className="size-4" aria-hidden />
          Sebelumnya
        </Button>
        {last ? (
          <Button variant="primary" onClick={() => (answered < total ? setSubmitOpen(true) : finish())}>
            Selesaikan quiz
          </Button>
        ) : (
          <Button variant="primary" onClick={() => go(1)}>
            Lanjut
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      <nav aria-label="Navigasi soal" className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Navigasi soal</p>
          <p className="hidden items-center gap-2 text-xs text-muted sm:flex">
            <Kbd>←</Kbd><Kbd>→</Kbd> pindah
            {optionCount > 0 && <><span>·</span><Kbd>1</Kbd>–<Kbd>{optionCount}</Kbd> pilih jawaban</>}
          </p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {quiz.questions.map((item, i) => {
            const answeredItem = isAnswered(session.answers[item.id])
            const correctItem = session.mode === 'latihan' && revealedFor(session.mode, session.locked, item.id) && isCorrect(item, session.answers[item.id])
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(i - session.current)}
                  aria-label={`Soal ${i + 1}${answeredItem ? ', sudah dijawab' : ', belum dijawab'}`}
                  aria-current={i === session.current ? 'step' : undefined}
                  className={cn(
                    'size-9 rounded-lg border text-sm font-semibold transition-colors',
                    i === session.current
                      ? 'border-brand bg-brand text-brand-ink'
                      : session.mode === 'latihan' && revealedFor(session.mode, session.locked, item.id)
                        ? correctItem
                          ? 'border-ok/40 bg-ok-soft text-ok'
                          : 'border-danger/40 bg-danger-soft text-danger'
                        : answeredItem
                          ? 'border-brand/40 bg-brand-soft text-brand'
                          : 'border-line bg-surface text-muted hover:text-ink',
                  )}
                >
                  {i + 1}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Keluar dari sesi?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setExitOpen(false)}>Lanjut belajar</Button>
            <Button variant="danger" onClick={() => setPhase('setup')}>Keluar</Button>
          </>
        }
      >
        <p>Progres sesi ini tidak akan disimpan dan tidak masuk ke skor terakhir.</p>
      </Modal>

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Selesaikan quiz?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubmitOpen(false)}>Lanjut mengerjakan</Button>
            <Button variant="primary" onClick={finish}>Selesaikan</Button>
          </>
        }
      >
        <p>Masih ada {total - answered} soal yang belum dijawab. Soal kosong dihitung salah.</p>
      </Modal>
    </div>
  )
}

/** Soal yang sudah dikunci sudah pasti sudah dinilai di mode latihan. */
function revealedFor(mode: StudyMode, locked: string[], questionId: string) {
  return mode === 'latihan' && locked.includes(questionId)
}

function QuizSetup({
  quiz,
  mode,
  setMode,
  timerOn,
  setTimerOn,
  onStart,
  materialTitle,
}: {
  quiz: Quiz
  mode: StudyMode
  setMode: (m: StudyMode) => void
  timerOn: boolean
  setTimerOn: (v: boolean) => void
  onStart: () => void
  materialTitle?: string
}) {
  const modes: { value: StudyMode; icon: typeof Zap; title: string; description: string; tag: string }[] = [
    { value: 'latihan', icon: Zap, title: 'Latihan', description: 'Jawaban langsung dinilai. Lihat pembahasan tiap soal dan jaga beruntun benar.', tag: 'Umpan balik instan' },
    { value: 'ujian', icon: ClipboardCheck, title: 'Ujian', description: 'Jawab bebas tanpa umpan balik. Skor muncul setelah quiz selesai.', tag: 'Dinilai di akhir' },
  ]

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/quiz" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Daftar quiz
      </Link>

      <Card elevation="floating" className="overflow-hidden">
        <div className="ruled margin-line border-b border-line px-6 py-6 sm:px-8">
          <h1 className="text-3xl font-bold leading-tight">{quiz.title}</h1>
          <p className="mt-2 text-muted">{quiz.description}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5"><ListChecks className="size-4" aria-hidden />{quiz.questions.length} soal</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden />{quiz.durationMin} menit (opsional)</span>
            {materialTitle && <span className="inline-flex items-center gap-1.5"><BookOpen className="size-4" aria-hidden />{materialTitle}</span>}
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <p className="text-sm font-semibold">Pilih mode</p>
          <div role="radiogroup" aria-label="Mode belajar" className="mt-3 grid gap-3 sm:grid-cols-2">
            {modes.map(({ value, icon: Icon, title, description, tag }) => {
              const active = mode === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(value)}
                  className={cn(
                    'flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors',
                    active ? 'border-brand bg-brand-soft ring-2 ring-brand/20' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
                  )}
                >
                  <span className={cn('flex size-9 items-center justify-center rounded-xl', active ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted')}>
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="flex items-center gap-2 font-semibold">
                    {title}
                    <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', active ? 'bg-brand/15 text-brand' : 'bg-surface-2 text-faint')}>{tag}</span>
                  </span>
                  <span className="text-sm text-muted">{description}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2/50 p-4">
            <div>
              <p className="text-sm font-semibold">Pakai timer</p>
              <p className="text-sm text-muted">Quiz berhenti otomatis saat waktu habis.</p>
            </div>
            <Toggle checked={timerOn} onChange={setTimerOn} label="Pakai timer" />
          </div>

          <Button variant="primary" size="lg" fullWidth className="mt-6" onClick={onStart}>
            Mulai {mode === 'latihan' ? 'latihan' : 'ujian'}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">
            Pintasan: angka 1–4 memilih jawaban, panah kiri/kanan berpindah soal.
          </p>
        </div>
      </Card>
    </div>
  )
}

function QuizResultView({
  quiz,
  result,
  answers,
  mode,
  elapsed,
  materialId,
  onRetry,
}: {
  quiz: Quiz
  result: { total: number; correct: number; score: number; bestStreak: number; answered: number }
  answers: Answers
  mode: StudyMode
  elapsed: number
  materialId?: string
  onRetry: () => void
}) {
  const message =
    result.score >= 90
      ? 'Luar biasa, pemahamanmu sudah kuat.'
      : result.score >= 75
        ? 'Bagus, tinggal rapikan beberapa bagian.'
        : result.score >= 50
          ? 'Sudah separuh jalan. Baca ulang bagian yang salah.'
          : 'Belum perlu khawatir. Pelajari materinya lagi lalu coba ulang.'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/quiz" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Daftar quiz
      </Link>

      <Card elevation="floating" className="overflow-hidden">
        <div className="ruled flex flex-col items-center px-6 py-8 text-center sm:px-10">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{mode === 'latihan' ? 'Hasil latihan' : 'Hasil ujian'}</p>
          <ScoreRing value={result.score} label="dari 100" className="mt-5" />
          <p className="mt-5 text-lg font-semibold">{result.correct} dari {result.total} soal benar</p>
          <p className="mt-1 text-muted">{message}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 font-semibold text-muted">
              <Clock className="size-4" aria-hidden />{formatClock(elapsed)}
            </span>
            {mode === 'latihan' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1.5 font-semibold text-warn">
                <Trophy className="size-4" aria-hidden />Beruntun terbaik {result.bestStreak}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 border-t border-line bg-surface-2/50 px-6 py-5">
          <Button variant="primary" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden />
            Ulangi quiz
          </Button>
          {materialId && (
            <Button to={`/materi/${materialId}`}>
              <BookOpen className="size-4" aria-hidden />
              Pelajari materi
            </Button>
          )}
          <Button variant="ghost" to="/quiz">Daftar quiz</Button>
        </div>
      </Card>

      <h2 className="mb-3 mt-10 text-xl font-semibold">Pembahasan</h2>
      <ol className="space-y-3">
        {quiz.questions.map((q, i) => {
          const value = answers[q.id]
          const ok = isCorrect(q, value)
          return (
            <li key={q.id}>
              <details className="group rounded-2xl border border-line bg-surface open:shadow-sm" open={!ok}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                  {ok ? (
                    <CheckCircle2 className="size-5 shrink-0 text-ok" aria-label="Benar" />
                  ) : (
                    <XCircle className="size-5 shrink-0 text-danger" aria-label="Salah" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    <span className="text-muted">{i + 1}.</span> {q.prompt}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="border-t border-line px-4 py-3.5">
                  <dl className="grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
                    <dt className="text-muted">Jawabanmu</dt>
                    <dd className={cn('font-medium', ok ? 'text-ok' : 'text-danger')}>{formatUserAnswer(q, value)}</dd>
                    {!ok && (
                      <>
                        <dt className="text-muted">Jawaban benar</dt>
                        <dd className="font-medium">{formatCorrectAnswer(q)}</dd>
                      </>
                    )}
                  </dl>
                  {q.explanation && <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">{q.explanation}</p>}
                </div>
              </details>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
