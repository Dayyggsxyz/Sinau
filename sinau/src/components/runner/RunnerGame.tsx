import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Pause, Play, RotateCcw, Volume2, VolumeX, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { createEngine, type Engine, type EngineState, type MistakeRecord } from '@/lib/runnerEngine'
import type { RunnerQuestion } from '@/lib/runnerPool'
import { playSfx } from '@/lib/sound'
import { drawScene, readPalette, type Palette } from './drawScene'

export interface RunnerResult {
  score: number
  distance: number
  correct: number
  wrong: number
  bestStreak: number
  mistakes: MistakeRecord[]
  repeats: number
}

const DOOR_STYLE = ['bg-brand text-brand-ink', 'bg-accent text-brand-ink', 'bg-ok text-brand-ink']
const LETTERS = ['A', 'B', 'C']

interface Hud {
  phase: EngineState['phase']
  score: number
  distance: number
  gap: number
  streak: number
  question: RunnerQuestion | null
  doors: string[]
  decideLeft: number
  decideTotal: number
  nextIn: number
  chosen: number | null
  outcome: EngineState['outcome']
  correctDoor: number
}

const snapshot = (s: EngineState): Hud => ({
  phase: s.phase, score: s.score, distance: s.distance, gap: s.gap, streak: s.streak, question: s.question, doors: s.doors,
  decideLeft: s.decideLeft, decideTotal: s.decideTotal, nextIn: s.nextIn, chosen: s.chosen, outcome: s.outcome, correctDoor: s.correctDoor,
})

export function RunnerGame({
  pool, sound, onToggleSound, onFinish, onExit,
}: {
  pool: RunnerQuestion[]
  sound: boolean
  onToggleSound: () => void
  onFinish: (r: RunnerResult) => void
  onExit: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine>(null as unknown as Engine)
  const pausedRef = useRef(false)
  const soundRef = useRef(sound)
  const finishedRef = useRef(false)
  const [hud, setHud] = useState<Hud | null>(null)
  const [paused, setPaused] = useState(false)
  const [runId, setRunId] = useState(0)
  const [live, setLive] = useState('')

  soundRef.current = sound
  const setPause = useCallback((v: boolean) => {
    pausedRef.current = v
    setPaused(v)
  }, [])

  // Mesin baru setiap kali main (atau main ulang).
  useEffect(() => {
    engineRef.current = createEngine(pool)
    finishedRef.current = false
    setHud(snapshot(engineRef.current.state))
    setPause(false)
  }, [pool, runId, setPause])

  // Loop gambar + simulasi.
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    let frame = 0
    let palette: Palette = readPalette()
    const size = { w: 0, h: 0 }
    const lane = { v: 1, tv: 1 }

    const resize = () => {
      const w = wrap.clientWidth
      const h = Math.round(Math.min(440, Math.max(230, w * 0.56)))
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      size.w = w
      size.h = h
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = (now - last) / 1000
      last = now
      const engine = engineRef.current
      if (!engine) return
      const active = !pausedRef.current && !document.hidden
      if (active) {
        engine.update(dt)
        for (const ev of engine.drainEvents()) {
          if (soundRef.current) playSfx(ev)
          if (ev === 'correct') setLive('Benar!')
          else if (ev === 'wrong') setLive('Salah. Guru makin dekat.')
          else if (ev === 'caught') setLive('Kamu tertangkap guru.')
        }
        if (engine.state.phase === 'over' && !finishedRef.current) {
          finishedRef.current = true
          const s = engine.state
          setHud(snapshot(s))
          onFinishRef.current({ score: s.score, distance: s.distance, correct: s.correct, wrong: s.wrong, bestStreak: s.bestStreak, mistakes: s.mistakes, repeats: s.repeats })
        }
      } else if (document.hidden && !pausedRef.current) {
        pausedRef.current = true
        setPaused(true)
      }
      if (++frame % 60 === 0) palette = readPalette()
      const reduce = document.documentElement.dataset.motion === 'reduce' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
      drawScene(ctx, engine.state, palette, { w: size.w, h: size.h, reduceMotion: reduce, paused: pausedRef.current }, lane)
      acc += dt
      if (acc > 0.1) {
        acc = 0
        setHud(snapshot(engine.state))
      }
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [runId])

  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const act = useCallback((fn: (e: Engine) => void) => {
    if (pausedRef.current || !engineRef.current) return
    fn(engineRef.current)
  }, [])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'p' || k === 'escape') {
        e.preventDefault()
        setPause(!pausedRef.current)
      } else if (k === 'arrowup' || k === 'w') { e.preventDefault(); act((g) => g.moveLane(-1)) }
      else if (k === 'arrowdown' || k === 's') { e.preventDefault(); act((g) => g.moveLane(1)) }
      else if (k === '1' || k === 'a') act((g) => g.answer(0))
      else if (k === '2' || k === 'b') act((g) => g.answer(1))
      else if (k === '3' || k === 'c') act((g) => g.answer(2))
      else if (k === 'enter' || k === ' ') {
        if ((e.target as HTMLElement)?.tagName === 'BUTTON') return
        e.preventDefault()
        act((g) => g.confirm())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act, setPause])

  // Swipe vertikal di canvas
  const touch = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touch.current = e.touches[0].clientY }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touch.current === null) return
    const dy = e.changedTouches[0].clientY - touch.current
    touch.current = null
    if (Math.abs(dy) > 24) act((g) => g.moveLane(dy > 0 ? 1 : -1))
  }

  const restart = () => { finishedRef.current = false; setRunId((n) => n + 1) }

  const asking = hud?.phase === 'ask' || hud?.phase === 'resolve'
  const q = hud?.question
  const timeLeft = hud ? Math.ceil(hud.decideLeft) : 0
  const locked = hud?.phase === 'resolve'

  return (
    <div className="mx-auto max-w-3xl">
      {/* HUD */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="font-semibold tabular-nums">Skor {hud?.score ?? 0}</span>
        <span className="text-muted tabular-nums">{Math.round(hud?.distance ?? 0)} m</span>
        {!!hud?.streak && <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-semibold text-ok">Beruntun {hud.streak}x</span>}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={onToggleSound} aria-label={sound ? 'Matikan suara' : 'Nyalakan suara'} aria-pressed={sound} className="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">
            {sound ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
          </button>
          <button type="button" onClick={() => setPause(true)} aria-label="Jeda permainan" className="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">
            <Pause className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
          <span id="danger-label">Jarak dari guru</span>
          <span>{hud && hud.gap <= 34 ? 'Bahaya!' : hud && hud.gap <= 68 ? 'Waspada' : 'Aman'}</span>
        </div>
        <div role="progressbar" aria-labelledby="danger-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hud?.gap ?? 100)} className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div className={cn('h-full rounded-full transition-[width,background-color] duration-300', (hud?.gap ?? 100) > 68 ? 'bg-ok' : (hud?.gap ?? 100) > 34 ? 'bg-warn' : 'bg-danger')} style={{ width: `${hud?.gap ?? 100}%` }} />
        </div>
      </div>

      {/* Adegan */}
      <div ref={wrapRef} className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <canvas ref={canvasRef} className="runner-canvas block w-full" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} role="img" aria-label="Adegan permainan: pelari dikejar guru menuju tiga pintu jawaban" />
        {paused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/85 p-4 text-center backdrop-blur-sm" role="dialog" aria-label="Permainan dijeda">
            <p className="text-lg font-semibold">Dijeda</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" autoFocus onClick={() => setPause(false)}><Play className="size-4" aria-hidden />Lanjutkan</Button>
              <Button onClick={restart}><RotateCcw className="size-4" aria-hidden />Ulang dari awal</Button>
              <Button variant="ghost" onClick={onExit}><LogOut className="size-4" aria-hidden />Keluar</Button>
            </div>
          </div>
        )}
      </div>

      {/* Soal + pintu */}
      <div className="mt-4 min-h-44" aria-live="off">
        {asking && q ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-muted">
              <span>Pilih pintu sebelum waktu habis</span>
              <span className="tabular-nums" aria-hidden>{timeLeft} dtk</span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-label="Sisa waktu menjawab" aria-valuemin={0} aria-valuemax={Math.round(hud!.decideTotal)} aria-valuenow={timeLeft}>
              <div className="h-full rounded-full bg-brand" style={{ width: `${(hud!.decideLeft / hud!.decideTotal) * 100}%` }} />
            </div>
            <p className="mb-3 text-lg font-semibold leading-snug">{q.prompt}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {hud!.doors.map((d, i) => {
                const reveal = locked
                const right = reveal && i === hud!.correctDoor
                const wrong = reveal && hud!.chosen === i && i !== hud!.correctDoor
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={locked}
                    onClick={() => act((g) => g.answer(i))}
                    className={cn(
                      'flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left text-sm font-medium transition-colors active:translate-y-px',
                      right ? 'border-ok bg-ok-soft' : wrong ? 'border-danger bg-danger-soft' : hud!.chosen === i ? 'border-brand bg-brand-tint' : 'border-line bg-surface hover:bg-surface-2',
                    )}
                  >
                    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold', DOOR_STYLE[i])} aria-hidden>{LETTERS[i]}</span>
                    <span className="min-w-0 break-words">{d}</span>
                    <span className="sr-only">Pintu {LETTERS[i]}</span>
                  </button>
                )
              })}
            </div>
            {locked && hud!.outcome && (
              <p className={cn('mt-3 text-sm font-semibold', hud!.outcome === 'correct' ? 'text-ok' : 'text-danger')} role="status">
                {hud!.outcome === 'correct' ? 'Benar! Pintu terbuka.' : hud!.outcome === 'timeout' ? 'Waktu habis. Guru makin dekat.' : 'Salah. Guru makin dekat.'}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line py-8 text-center text-muted">
            <p className="font-semibold text-ink">Terus lari!</p>
            <p className="text-sm">Soal berikutnya muncul dalam {Math.max(0, Math.ceil(hud?.nextIn ?? 0))} detik.</p>
            <p className="flex items-center gap-1 text-xs"><ArrowUp className="size-3.5" aria-hidden /><ArrowDown className="size-3.5" aria-hidden /> pindah jalur, tombol 1–3 atau A–C memilih pintu</p>
          </div>
        )}
      </div>
      <div className="sr-only" role="status" aria-live="polite">{live}{asking && q ? ` Soal: ${q.prompt}` : ''}</div>
    </div>
  )
}
