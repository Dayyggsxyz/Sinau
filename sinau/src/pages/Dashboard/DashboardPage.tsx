import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpen, Footprints, ChevronRight, Clock, Flame, Layers, ListChecks, MessageSquareText, Target, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SubjectBadge } from '@/components/ui/SubjectBadge'
import { MaterialRow } from '@/components/material/MaterialRow'
import { UploadDialog } from '@/components/upload/UploadDialog'
import { useLibrary } from '@/context/LibraryContext'
import { useSettings } from '@/context/SettingsContext'
import { useDisplayName } from '@/hooks/useDisplayName'
import { useFlashcardProgress } from '@/hooks/useFlashcardProgress'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { getDailyMinutes, getStreak } from '@/lib/activity'
import { formatLongDate, greeting } from '@/lib/format'
import { subjectStyle } from '@/lib/subjects'
import { cn } from '@/lib/cn'
import type { QuizResult, Subject } from '@/types'

export default function DashboardPage() {
  const { settings } = useSettings()
  const name = useDisplayName()
  const { materials, flashcards } = useLibrary()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [cardProgress] = useFlashcardProgress()
  const [quizResults] = useLocalStorage<Record<string, QuizResult>>('quiz-results', {})

  const mastered = flashcards.filter((c) => cardProgress[c.id] === 'paham').length
  const inProgress = [...materials].filter((m) => m.progress > 0 && m.progress < 100).sort((a, b) => b.progress - a.progress)[0]
  const latest = [...materials].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)

  const scores = Object.values(quizResults).map((r) => r.score)
  const quizAvg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const streak = getStreak()

  const week = useMemo(() => {
    const minutes = getDailyMinutes(7)
    return minutes.map((value, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (minutes.length - 1 - i))
      return { value, label: d.toLocaleDateString('id-ID', { weekday: 'short' }), today: i === minutes.length - 1 }
    })
  }, [])
  const maxMinutes = Math.max(...week.map((d) => d.value), 1)
  const todayMinutes = week[week.length - 1].value
  const weekTotal = week.reduce((a, d) => a + d.value, 0)
  const goalPct = Math.min(100, Math.round((todayMinutes / settings.dailyGoalMin) * 100))

  const bySubject = useMemo(() => {
    const map = new Map<Subject, number[]>()
    materials.forEach((m) => map.set(m.subject, [...(map.get(m.subject) ?? []), m.progress]))
    return [...map.entries()].map(([subject, values]) => ({ subject, avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length) }))
  }, [materials])

  const quickActions = [
    { label: 'Tanya AI Tutor', hint: 'Pahami konsep yang masih membingungkan', to: '/tutor', icon: MessageSquareText },
    { label: 'Latihan quiz', hint: 'Uji pemahaman dengan kartu soal', to: '/quiz', icon: ListChecks },
    { label: 'Ulas flashcard', hint: 'Ulang kartu yang belum kamu kuasai', to: '/flashcard', icon: Layers },
    { label: 'Main Sinau Runner', hint: 'Lari dari guru sambil menjawab soal', to: '/runner', icon: Footprints },
  ]

  return (
    <div className="space-y-6">
      <section className="ruled margin-line relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-7 shadow-sm sm:px-10 sm:py-9">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted">{formatLongDate()}</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              {greeting()}{name ? `, ${name}` : ''}
            </h1>
            <p className="mt-1 text-lg text-muted">Mau belajar apa hari ini?</p>
            <p className="mt-2 max-w-lg text-muted">
              {inProgress
                ? `Kamu sudah ${inProgress.progress}% membaca ${inProgress.title}. Lanjutkan dari bagian terakhir.`
                : materials.length === 0
                  ? 'Unggah materi pertamamu untuk mulai belajar.'
                  : 'Pilih materi untuk mulai membaca, atau unggah materi baru.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {inProgress && (
              <Button variant="primary" to={`/materi/${inProgress.id}`}>
                <BookOpen className="size-4" aria-hidden />
                Lanjutkan membaca
              </Button>
            )}
            <Button variant={inProgress ? 'secondary' : 'primary'} onClick={() => setUploadOpen(true)}>
              <Upload className="size-4" aria-hidden />
              Unggah materi
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="Ringkasan belajar" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Flame} tone="warn" label="Hari beruntun" value={`${streak}`} suffix="hari" />
        <Stat icon={Clock} tone="brand" label="Menit minggu ini" value={`${weekTotal}`} suffix="menit" />
        <Stat icon={Layers} tone="ok" label="Kartu dikuasai" value={`${mastered}`} suffix={`dari ${flashcards.length}`} />
        <Stat icon={Target} tone="accent" label="Rata-rata skor quiz" value={quizAvg === null ? '—' : `${quizAvg}`} suffix={quizAvg === null ? 'belum ada' : 'dari 100'} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl font-semibold">Aktivitas 7 hari terakhir</h2>
              <span className="text-sm text-muted">Menit per hari</span>
            </div>
            <div
              className="mt-6 flex h-40 items-end gap-2 sm:gap-4"
              role="img"
              aria-label={`Menit belajar per hari: ${week.map((d) => `${d.label} ${d.value}`).join(', ')}`}
            >
              {week.map((d, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-xs font-semibold tabular-nums text-muted">{d.value}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn('bar-grow w-full rounded-t-lg', d.today ? 'bg-brand' : 'bg-brand/25')}
                      style={{ height: `${Math.max(4, (d.value / maxMinutes) * 100)}%`, animationDelay: `${i * 60}ms` }}
                    />
                  </div>
                  <span className={cn('text-xs capitalize', d.today ? 'font-bold text-ink' : 'text-muted')}>{d.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">Dihitung dari waktu kamu membuka Sinau dengan tab aktif, tersimpan di browser ini.</p>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
              <h2 className="text-xl font-semibold">Materi terbaru</h2>
              <Link to="/materi" className="flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                Lihat semua
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-3 divide-y divide-line border-t border-line">
              {latest.length === 0 ? (
                <p className="px-6 py-8 text-center text-muted">Belum ada materi. Unggah file pertamamu untuk memulai.</p>
              ) : (
                latest.map((m) => <MaterialRow key={m.id} material={m} compact />)
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-xl font-semibold">Target hari ini</h2>
            <p className="mt-3 font-display text-4xl font-bold">
              {todayMinutes}
              <span className="text-base font-medium text-muted"> dari {settings.dailyGoalMin} menit</span>
            </p>
            <ProgressBar value={goalPct} label="Progres target harian" className="mt-3" />
            <p className="mt-2 text-sm text-muted">{goalPct >= 100 ? 'Target tercapai. Kerja bagus!' : `Sisa ${Math.max(0, settings.dailyGoalMin - todayMinutes)} menit lagi.`}</p>
          </Card>

          <Card className="p-2">
            <h2 className="px-3 pb-1 pt-3 text-xl font-semibold">Mulai cepat</h2>
            <ul>
              {quickActions.map(({ label, hint, to, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block truncate text-xs text-muted">{hint}</span>
                    </span>
                    <ArrowUpRight className="size-4 text-muted transition-colors group-hover:text-brand" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {bySubject.length > 0 && (
            <Card className="p-5">
              <h2 className="text-xl font-semibold">Progres per pelajaran</h2>
              <ul className="mt-4 space-y-4">
                {bySubject.map(({ subject, avg }) => (
                  <li key={subject}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <SubjectBadge subject={subject} />
                      <span className="text-sm font-semibold">{avg}%</span>
                    </div>
                    <ProgressBar value={avg} label={`Progres ${subject}`} className={subjectStyle[subject].bar} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: typeof Flame
  label: string
  value: string
  suffix?: string
  tone: 'brand' | 'ok' | 'warn' | 'accent'
}) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    accent: 'bg-accent-soft text-accent',
  }
  return (
    <Card className="p-4">
      <span className={cn('flex size-9 items-center justify-center rounded-xl', tones[tone])}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <p className="mt-3 font-display text-3xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-sm text-muted">
        {label}
        {suffix && <span className="text-muted/80"> · {suffix}</span>}
      </p>
    </Card>
  )
}
