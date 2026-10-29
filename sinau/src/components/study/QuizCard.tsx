import { Markdown } from '@/components/ui/Markdown'
import { CheckCircle2, Lightbulb, XCircle } from 'lucide-react'
import type { AnswerValue, Question } from '@/types'
import { formatCorrectAnswer, isCorrect } from '@/lib/quiz'
import { cn } from '@/lib/cn'
import { CardFrame } from './CardFrame'
import { Kbd } from '@/components/ui/Kbd'

const typeLabel: Record<Question['type'], string> = {
  mcq: 'Pilihan ganda',
  tf: 'Benar / salah',
  short: 'Isian singkat',
}

export function QuizCard({
  question,
  index,
  total,
  value,
  revealed,
  locked,
  onChange,
  enter,
}: {
  question: Question
  index: number
  total: number
  value: AnswerValue | undefined
  revealed: boolean
  locked: boolean
  onChange: (v: AnswerValue) => void
  enter?: 'next' | 'prev'
}) {
  const correct = revealed && isCorrect(question, value)
  const status = revealed ? (correct ? 'correct' : 'wrong') : 'neutral'

  return (
    <CardFrame status={status} enter={enter}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4 sm:px-8">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{typeLabel[question.type]}</span>
        <span className="text-xs font-semibold text-muted">
          Soal <span className="text-ink">{index + 1}</span> dari {total}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
        <p className="text-xl font-semibold leading-snug sm:text-2xl">{question.prompt}</p>

        {question.type === 'mcq' && (
          <div role="radiogroup" aria-label="Pilihan jawaban" className={cn('space-y-2.5', locked && 'pointer-events-none')}>
            {question.options.map((opt, i) => {
              const tone = revealed
                ? i === question.answer
                  ? 'border-ok bg-ok-soft'
                  : value === i
                    ? 'border-danger bg-danger-soft'
                    : 'border-line bg-surface opacity-70'
                : value === i
                  ? 'border-brand bg-brand-soft ring-2 ring-brand/20'
                  : 'border-line bg-surface hover:border-brand/50 hover:bg-surface-2'
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={value === i}
                  disabled={locked}
                  onClick={() => onChange(i)}
                  className={cn('flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-colors', tone)}
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                      revealed && i === question.answer ? 'bg-ok text-white' : revealed && value === i ? 'bg-danger text-white' : value === i ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted',
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {!revealed && <Kbd className="hidden sm:inline-flex">{i + 1}</Kbd>}
                </button>
              )
            })}
          </div>
        )}

        {question.type === 'tf' && (
          <div role="radiogroup" aria-label="Benar atau salah" className={cn('grid grid-cols-2 gap-3', locked && 'pointer-events-none')}>
            {([[true, 'Benar'], [false, 'Salah']] as const).map(([v, label]) => {
              const tone = revealed
                ? v === question.answer
                  ? 'border-ok bg-ok-soft text-ok'
                  : value === v
                    ? 'border-danger bg-danger-soft text-danger'
                    : 'border-line text-muted opacity-70'
                : value === v
                  ? 'border-brand bg-brand-soft text-brand ring-2 ring-brand/20'
                  : 'border-line text-ink hover:border-brand/50 hover:bg-surface-2'
              return (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={value === v}
                  disabled={locked}
                  onClick={() => onChange(v)}
                  className={cn('h-20 rounded-2xl border text-lg font-semibold transition-colors', tone)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {question.type === 'short' && (
          <div>
            <label className="block">
              <span className="sr-only">Jawabanmu</span>
              <input
                type="text"
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Ketik jawaban singkat"
                autoComplete="off"
                disabled={locked}
                className="h-14 w-full rounded-2xl border border-line bg-surface px-4 text-lg placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-70"
              />
            </label>
            {question.hint && !revealed && <p className="mt-2 text-sm text-muted">Petunjuk: {question.hint}</p>}
          </div>
        )}

        {revealed && (
          <div
            role="status"
            className={cn('fade-in rounded-2xl border p-4', correct ? 'border-ok/30 bg-ok-soft' : 'border-danger/30 bg-danger-soft')}
          >
            <p className={cn('flex items-center gap-2 font-semibold', correct ? 'text-ok' : 'text-danger')}>
              {correct ? <CheckCircle2 className="size-5" aria-hidden /> : <XCircle className="size-5" aria-hidden />}
              {correct ? 'Tepat!' : 'Belum tepat'}
            </p>
            {!correct && (
              <p className="mt-1.5 text-sm text-ink">
                Jawaban benar: <span className="font-semibold">{formatCorrectAnswer(question)}</span>
              </p>
            )}
            {question.explanation && (
              <p className="mt-3 flex gap-2 text-sm leading-relaxed text-ink/90">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-ink/60" aria-hidden />
                <Markdown>{question.explanation}</Markdown>
              </p>
            )}
          </div>
        )}
      </div>
    </CardFrame>
  )
}
