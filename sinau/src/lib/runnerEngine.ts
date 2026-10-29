import type { RunnerQuestion } from './runnerPool'

/**
 * Mesin Sinau Runner: murni (tanpa React/DOM) supaya bisa diuji.
 * Alur: lari -> soal muncul dengan tiga pintu -> pemain memilih -> hasil -> lari lagi.
 * Jarak guru (gap) 100 = aman, 0 = tertangkap. Jawaban salah memperpendek jarak.
 */
export type Phase = 'run' | 'ask' | 'resolve' | 'over'
export type Outcome = 'correct' | 'wrong' | 'timeout'
export type RunnerEvent = 'correct' | 'wrong' | 'caught' | 'ask'

export interface MistakeRecord {
  question: RunnerQuestion
  picked: number | null
  outcome: Outcome
}

export interface EngineState {
  phase: Phase
  /** Waktu simulasi (detik), dipakai animasi. */
  t: number
  distance: number
  speed: number
  gap: number
  score: number
  streak: number
  bestStreak: number
  correct: number
  wrong: number
  lane: number
  nextIn: number
  question: RunnerQuestion | null
  /** Urutan pintu yang ditampilkan: doors[i] = teks di pintu ke-i (sudah diacak ulang). */
  doors: string[]
  correctDoor: number
  decideTotal: number
  decideLeft: number
  chosen: number | null
  outcome: Outcome | null
  resolveLeft: number
  /** Dipakai untuk kilatan/guncangan saat salah (detik tersisa). */
  hit: number
  mistakes: MistakeRecord[]
  repeats: number
}

export const RESOLVE_SECONDS = 1.5
export const CAUGHT_SECONDS = 1.3
const WRONG_PENALTY = 34
const RIGHT_BONUS = 12
const COMMIT_SECONDS = 0.7

export const answered = (s: EngineState) => s.correct + s.wrong

export function createEngine(pool: RunnerQuestion[], rng: () => number = Math.random) {
  if (pool.length < 1) throw new Error('Soal belum tersedia.')
  let order: number[] = []
  const events: RunnerEvent[] = []
  let repeats = 0

  const shuffleIdx = () => {
    const a = pool.map((_, i) => i)
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const nextQuestion = () => {
    if (order.length === 0) {
      order = shuffleIdx()
      if (state.correct + state.wrong > 0) repeats++
    }
    return pool[order.pop() as number]
  }

  const state: EngineState = {
    phase: 'run',
    t: 0,
    distance: 0,
    speed: 6,
    gap: 100,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    wrong: 0,
    lane: 1,
    nextIn: 6, // jeda awal yang cukup untuk membaca kontrol
    question: null,
    doors: [],
    correctDoor: 0,
    decideTotal: 0,
    decideLeft: 0,
    chosen: null,
    outcome: null,
    resolveLeft: 0,
    hit: 0,
    mistakes: [],
    repeats: 0,
  }

  /** Waktu membaca & memutuskan: cukup untuk teks panjang, menyusut pelan, tidak pernah di bawah 8 detik. */
  function decisionTime(q: RunnerQuestion) {
    const chars = q.prompt.length + q.doors.reduce((n, d) => n + d.length, 0)
    const base = Math.min(16, Math.max(9, 6 + chars / 22))
    const shrink = Math.min(0.25, answered(state) * 0.02)
    return Math.max(8, base * (1 - shrink))
  }

  function startQuestion() {
    const q = nextQuestion()
    const perm = [0, 1, 2]
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[perm[i], perm[j]] = [perm[j], perm[i]]
    }
    state.question = q
    state.doors = perm.map((p) => q.doors[p])
    state.correctDoor = perm.indexOf(q.correct)
    state.decideTotal = state.decideLeft = decisionTime(q)
    state.chosen = null
    state.outcome = null
    state.phase = 'ask'
    events.push('ask')
  }

  function resolve(outcome: Outcome) {
    const q = state.question as RunnerQuestion
    state.outcome = outcome
    state.phase = 'resolve'
    state.resolveLeft = RESOLVE_SECONDS
    if (outcome === 'correct') {
      const speedBonus = Math.round((state.decideLeft / state.decideTotal) * 50)
      state.score += 100 + Math.min(state.streak, 10) * 15 + speedBonus
      state.streak++
      state.bestStreak = Math.max(state.bestStreak, state.streak)
      state.correct++
      state.gap = Math.min(100, state.gap + RIGHT_BONUS)
      events.push('correct')
    } else {
      state.streak = 0
      state.wrong++
      state.gap = Math.max(0, state.gap - WRONG_PENALTY)
      state.hit = 0.6
      state.mistakes.push({ question: q, picked: state.chosen === null ? null : state.chosen, outcome })
      events.push('wrong')
      if (state.gap <= 0) {
        state.resolveLeft = CAUGHT_SECONDS
        events.push('caught')
      }
    }
  }

  function update(dtRaw: number) {
    const dt = Math.min(Math.max(dtRaw, 0), 0.05)
    if (state.phase === 'over') return
    state.t += dt
    state.hit = Math.max(0, state.hit - dt)
    state.speed = 6 + Math.min(4, answered(state) * 0.25)

    switch (state.phase) {
      case 'run':
        state.distance += state.speed * dt
        state.nextIn -= dt
        if (state.nextIn <= 0) startQuestion()
        break
      case 'ask':
        state.distance += state.speed * 0.6 * dt
        state.decideLeft -= dt
        if (state.decideLeft <= 0) {
          state.decideLeft = 0
          if (state.chosen === null) resolve('timeout')
          else resolve(state.chosen === state.correctDoor ? 'correct' : 'wrong')
        }
        break
      case 'resolve':
        state.distance += state.speed * 0.4 * dt
        state.resolveLeft -= dt
        if (state.resolveLeft <= 0) {
          if (state.gap <= 0) state.phase = 'over'
          else {
            state.phase = 'run'
            state.question = null
            state.nextIn = Math.max(8, 11 - Math.min(3, answered(state) * 0.3))
          }
        }
        break
    }
    state.repeats = repeats
  }

  /** Pindah jalur (pratinjau pilihan). Hanya berpengaruh saat soal aktif. */
  function moveLane(delta: number) {
    state.lane = Math.min(2, Math.max(0, state.lane + delta))
    if (state.phase === 'ask') state.chosen = state.lane
  }

  /** Pilih pintu dan kunci jawaban: pelari bergegas ke pintu itu. */
  function answer(door: number) {
    if (state.phase !== 'ask' || door < 0 || door > 2) return
    state.lane = door
    state.chosen = door
    state.decideLeft = Math.min(state.decideLeft, COMMIT_SECONDS)
  }

  /** Mengunci pilihan jalur saat ini (tombol Enter/Spasi). */
  function confirm() {
    if (state.phase === 'ask' && state.chosen !== null) answer(state.chosen)
  }

  function drainEvents() {
    return events.splice(0, events.length)
  }

  return { state, update, moveLane, answer, confirm, drainEvents }
}

export type Engine = ReturnType<typeof createEngine>
