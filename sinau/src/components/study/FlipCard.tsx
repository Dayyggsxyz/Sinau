import { cn } from '@/lib/cn'
import { Markdown } from '@/components/ui/Markdown'

/** Ukuran teks menyesuaikan panjang isi supaya definisi panjang tetap nyaman dibaca. */
const sizeFor = (t: string, big: boolean) => {
  const n = t.length
  if (n > 420) return 'text-base sm:text-lg'
  if (n > 220) return 'text-lg sm:text-xl'
  return big ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
}

/**
 * Kartu balik. Kedua sisi ditumpuk di satu sel grid, jadi tinggi kartu mengikuti sisi
 * yang paling panjang (tidak ada teks terpotong dan tidak ada ruang kosong berlebihan).
 */
export function FlipCard({
  front,
  back,
  flipped,
  onFlip,
  frontLabel = 'Pertanyaan',
  backLabel = 'Jawaban',
}: {
  front: string
  back: string
  flipped: boolean
  onFlip: () => void
  frontLabel?: string
  backLabel?: string
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={flipped ? 'Balik ke pertanyaan' : 'Balik untuk melihat jawaban'}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onFlip()
        }
      }}
      className="flip-scene block w-full cursor-pointer select-none rounded-3xl text-left outline-offset-4"
    >
      <div className={cn('flip-inner grid min-h-72 sm:min-h-80', flipped && '[transform:rotateY(180deg)]')}>
        <div aria-hidden={flipped} className="flip-face [grid-area:1/1] flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-md sm:p-9">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">{frontLabel}</span>
          <div className={cn('my-auto py-5 font-display font-semibold leading-snug', sizeFor(front, true))}>
            <Markdown>{front}</Markdown>
          </div>
          <span className="text-xs text-faint">Ketuk, klik, atau tekan spasi untuk membalik</span>
        </div>
        <div aria-hidden={!flipped} className="flip-face [grid-area:1/1] flex flex-col rounded-3xl border border-brand/30 bg-brand-tint p-6 shadow-md [transform:rotateY(180deg)] sm:p-9">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">{backLabel}</span>
          <div className={cn('my-auto py-5 leading-relaxed', sizeFor(back, false))}>
            <Markdown>{back}</Markdown>
          </div>
          <span className="text-xs text-faint">Seberapa paham kamu? Tandai di bawah.</span>
        </div>
      </div>
    </div>
  )
}
