import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, HelpCircle, Layers, RotateCcw, Shuffle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { Kbd } from '@/components/ui/Kbd'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Segmented } from '@/components/ui/Segmented'
import { FlipCard } from '@/components/study/FlipCard'
import { useCardKeys } from '@/components/study/useCardKeys'
import { GeneratePanel } from '@/components/material/GeneratePanel'
import { useLibrary } from '@/context/LibraryContext'
import { useSettings } from '@/context/SettingsContext'
import { useFlashcardProgress } from '@/hooks/useFlashcardProgress'
import { shuffle } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Understanding } from '@/types'

const statusLabel: Record<Understanding, string> = { belum: 'Belum paham', ragu: 'Ragu-ragu', paham: 'Paham' }
const gradeOrder: Understanding[] = ['belum', 'ragu', 'paham']

export default function FlashcardsPage() {
  const { decks } = useLibrary()
  if (decks.length === 0) {
    return (
      <div>
        <PageHeader title="Flashcard" description="Balik kartu, jawab dari ingatan, lalu tandai seberapa paham kamu." />
        <EmptyState
          icon={Layers}
          title="Belum ada flashcard"
          description="Buat flashcard dari salah satu materimu dengan bantuan AI, lalu ulas di sini."
        />
        <GeneratePanel kind="cards" />
      </div>
    )
  }
  return <FlashcardsView />
}

function FlashcardsView() {
  const { decks, flashcards } = useLibrary()
  const [params, setParams] = useSearchParams()
  const { settings } = useSettings()
  const [progress, setProgress] = useFlashcardProgress()

  const requested = params.get('deck')
  const deck = decks.find((d) => d.id === requested) ?? decks[0]
  const [filter, setFilter] = useState<'all' | 'review'>('all')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const ordered = (() => {
    const cards = flashcards.filter((c) => c.materialId === deck.id)
    return settings.shuffleFlashcards ? shuffle(cards) : cards
  })()

  // Antrean "perlu diulang" dibekukan saat filter/deck berubah supaya kartu tidak melompat setelah ditandai.
  const [queue, setQueue] = useState(ordered)
  useEffect(() => {
    setQueue(filter === 'review' ? ordered.filter((c) => progress[c.id] !== 'paham') : ordered)
    setIndex(0)
    setFlipped(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id, filter, settings.shuffleFlashcards, flashcards.length])

  const safeIndex = Math.min(index, Math.max(queue.length - 1, 0))
  const card = queue[safeIndex]

  const counts = (() => {
    const all = flashcards.filter((c) => c.materialId === deck.id)
    const total = Math.max(1, all.length)
    return {
      total,
      paham: all.filter((c) => progress[c.id] === 'paham').length,
      ragu: all.filter((c) => progress[c.id] === 'ragu').length,
      belum: all.filter((c) => progress[c.id] === 'belum').length,
    }
  })()

  const go = useCallback(
    (delta: number) => {
      if (queue.length === 0) return
      setFlipped(false)
      setIndex((i) => (Math.min(i, queue.length - 1) + delta + queue.length) % queue.length)
    },
    [queue.length],
  )

  const mark = useCallback(
    (status: Understanding) => {
      if (!card) return
      setProgress((p) => ({ ...p, [card.id]: status }))
      if (queue.length > 1) go(1)
      else setFlipped(false)
    },
    [card, queue.length, setProgress, go],
  )

  useCardKeys({
    next: () => go(1),
    prev: () => go(-1),
    flip: () => setFlipped((f) => !f),
    option: flipped ? (i) => mark(gradeOrder[i]) : undefined,
    optionCount: flipped ? gradeOrder.length : 0,
  })

  function chooseDeck(id: string) {
    setParams({ deck: id })
    setIndex(0)
    setFlipped(false)
  }

  function shuffleNow() {
    setQueue((q) => shuffle(q))
    setIndex(0)
    setFlipped(false)
  }

  function restart() {
    setIndex(0)
    setFlipped(false)
  }

  // Geser jari di layar sentuh: kiri = berikutnya, kanan = sebelumnya.
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current
    touch.current = null
    if (!t) return
    const dx = e.changedTouches[0].clientX - t.x
    const dy = e.changedTouches[0].clientY - t.y
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }

  function resetDeck() {
    setProgress((p) => {
      const next = { ...p }
      flashcards.filter((c) => c.materialId === deck.id).forEach((c) => delete next[c.id])
      return next
    })
    setIndex(0)
    setFlipped(false)
  }

  const current = card ? progress[card.id] : undefined
  const masteredPct = Math.round((counts.paham / counts.total) * 100)

  return (
    <div>
      <PageHeader
        title="Flashcard"
        description="Balik kartu, jawab dari ingatan, lalu tandai seberapa paham kamu. Penandaan tersimpan di browser ini."
        actions={
          <Button variant="ghost" size="sm" onClick={resetDeck}>
            <RotateCcw className="size-4" aria-hidden />
            Reset status deck
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Pilih deck">
        {decks.map((d) => (
          <Chip key={d.id} active={d.id === deck.id} onClick={() => chooseDeck(d.id)}>
            {d.title}
          </Chip>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Kartu yang ditampilkan"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Semua kartu' },
                { value: 'review', label: 'Perlu diulang' },
              ]}
            />
            {card && <span className="text-sm font-semibold text-muted" aria-live="polite">Kartu {safeIndex + 1} dari {queue.length} · sisa {queue.length - safeIndex - 1}</span>}
          </div>
          {card && (
            <div className="mb-4 flex gap-2">
              <Button variant="ghost" size="sm" onClick={shuffleNow}><Shuffle className="size-4" aria-hidden />Acak</Button>
              <Button variant="ghost" size="sm" onClick={restart}><RotateCcw className="size-4" aria-hidden />Mulai dari awal</Button>
            </div>
          )}

          {card && <ProgressBar value={((safeIndex + 1) / queue.length) * 100} label="Posisi kartu" className="mb-5" size="sm" />}

          {!card ? (
            <Card elevation="floating" className="flex h-80 flex-col items-center justify-center px-6 text-center">
              <Check className="size-9 text-ok" aria-hidden />
              <h2 className="mt-3 text-xl font-semibold">Semua kartu di deck ini sudah kamu pahami</h2>
              <p className="mt-1 text-muted">Ganti ke semua kartu untuk mengulang, atau pilih deck lain.</p>
              <Button className="mt-4" onClick={() => setFilter('all')}>Tampilkan semua kartu</Button>
            </Card>
          ) : (
            <>
              <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                <FlipCard key={card.id} front={card.front} back={card.back} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button onClick={() => go(-1)} aria-label="Kartu sebelumnya" disabled={queue.length < 2}>
                    <ArrowLeft className="size-4" aria-hidden />
                    Sebelumnya
                  </Button>
                  <Button onClick={() => go(1)} aria-label="Kartu berikutnya" disabled={queue.length < 2}>
                    Berikutnya
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Tandai pemahaman">
                  <StatusButton active={current === 'belum'} tone="danger" onClick={() => mark('belum')} icon={X} label="Belum paham" shortcut="1" />
                  <StatusButton active={current === 'ragu'} tone="warn" onClick={() => mark('ragu')} icon={HelpCircle} label="Ragu-ragu" shortcut="2" />
                  <StatusButton active={current === 'paham'} tone="ok" onClick={() => mark('paham')} icon={Check} label="Paham" shortcut="3" />
                </div>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                Pintasan: <Kbd>←</Kbd><Kbd>→</Kbd> pindah kartu, <Kbd>Spasi</Kbd> membalik, <Kbd>1</Kbd>–<Kbd>3</Kbd> menandai setelah dibalik. Di layar sentuh, geser kiri atau kanan untuk pindah kartu.
              </p>
            </>
          )}
        </div>

        <aside>
          <Card className="p-5">
            <h2 className="text-xl font-semibold">Progres deck</h2>
            <p className="mt-1 truncate text-sm text-muted">{deck.title}</p>
            <p className="mt-4 font-display text-4xl font-bold">
              {masteredPct}%
              <span className="text-base font-medium text-muted"> dikuasai</span>
            </p>
            <ProgressBar value={masteredPct} label="Kartu dikuasai" className="mt-3 bg-ok" />
            <dl className="mt-5 space-y-2.5 text-sm">
              {gradeOrder.map((k) => (
                <div key={k} className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-muted">
                    <span className={cn('size-2 rounded-full', k === 'paham' ? 'bg-ok' : k === 'ragu' ? 'bg-warn' : 'bg-danger')} aria-hidden />
                    {statusLabel[k]}
                  </dt>
                  <dd className="font-semibold">{counts[k]}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <dt className="text-muted">Belum ditandai</dt>
                <dd className="font-semibold">{counts.total - counts.paham - counts.ragu - counts.belum}</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
      <GeneratePanel kind="cards" />
    </div>
  )
}

function StatusButton({
  active,
  tone,
  onClick,
  icon: Icon,
  label,
  shortcut,
}: {
  active: boolean
  tone: 'ok' | 'warn' | 'danger'
  onClick: () => void
  icon: typeof Check
  label: string
  shortcut?: string
}) {
  const tones = {
    ok: active ? 'bg-ok text-white' : 'bg-ok-soft text-ok hover:brightness-95',
    warn: active ? 'bg-warn text-white' : 'bg-warn-soft text-warn hover:brightness-95',
    danger: active ? 'bg-danger text-white' : 'bg-danger-soft text-danger hover:brightness-95',
  }
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('inline-flex h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition-colors active:translate-y-px', tones[tone])}
    >
      <Icon className="size-4" aria-hidden />
      {label}
      {shortcut && <Kbd className="hidden sm:inline-flex">{shortcut}</Kbd>}
    </button>
  )
}
