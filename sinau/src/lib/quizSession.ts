import type { Answers, AnswerValue, Question, Quiz } from '@/types'
import { isAnswered, isCorrect } from '@/lib/quiz'

/**
 * Dua mode belajar pada sistem kartu yang sama:
 * - `latihan`: jawaban langsung dikunci, benar/salah dan pembahasan tampil seketika.
 * - `ujian`: jawaban bebas diubah, penilaian baru muncul di akhir.
 */
export type StudyMode = 'latihan' | 'ujian'

export interface SessionState {
  mode: StudyMode
  current: number
  answers: Answers
  /** id soal yang jawabannya sudah dikunci (mode latihan). */
  locked: string[]
  /** id soal yang pembahasannya sudah ditampilkan (mode latihan). */
  revealed: string[]
  /** benar berurutan saat ini. */
  streak: number
  /** benar berurutan terbanyak dalam sesi ini. */
  bestStreak: number
}

export function createSession(mode: StudyMode): SessionState {
  return { mode, current: 0, answers: {}, locked: [], revealed: [], streak: 0, bestStreak: 0 }
}

/** Di mode latihan, jawaban terkunci setelah dipilih. Di mode ujian selalu bisa diubah. */
export function canChangeAnswer(state: SessionState, questionId: string): boolean {
  return state.mode === 'ujian' || !state.locked.includes(questionId)
}

export function isRevealed(state: SessionState, questionId: string): boolean {
  return state.mode === 'latihan' && state.revealed.includes(questionId)
}

/** Menerapkan jawaban baru; mengembalikan state yang sama bila tidak diizinkan. */
export function applyAnswer(state: SessionState, quiz: Quiz, questionId: string, value: AnswerValue): SessionState {
  const question = quiz.questions.find((q) => q.id === questionId)
  if (!question || !canChangeAnswer(state, questionId)) return state
  const answers: Answers = { ...state.answers, [questionId]: value }

  if (state.mode === 'ujian') return { ...state, answers }

  // Mode latihan: jawaban langsung dikunci, pembahasan tampil, beruntun benar diperbarui.
  const streak = isCorrect(question, value) ? state.streak + 1 : 0
  return {
    ...state,
    answers,
    locked: [...state.locked, questionId],
    revealed: [...state.revealed, questionId],
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
  }
}

export function maxIndex(quiz: Quiz): number {
  return Math.max(0, quiz.questions.length - 1)
}

export function goto(state: SessionState, quiz: Quiz, index: number): SessionState {
  return { ...state, current: Math.max(0, Math.min(maxIndex(quiz), index)) }
}

export function next(state: SessionState, quiz: Quiz): SessionState {
  return goto(state, quiz, state.current + 1)
}

export function prev(state: SessionState, quiz: Quiz): SessionState {
  return goto(state, quiz, state.current - 1)
}

export function answeredCount(state: SessionState, quiz: Quiz): number {
  return quiz.questions.filter((q) => isAnswered(state.answers[q.id])).length
}

/** Apakah soal ini boleh ditinggalkan menuju soal berikutnya. */
export function canAdvance(state: SessionState, question: Question): boolean {
  return state.mode === 'ujian' || isAnswered(state.answers[question.id])
}

export function sessionResult(state: SessionState, quiz: Quiz) {
  const total = quiz.questions.length
  const correct = quiz.questions.filter((q) => isCorrect(q, state.answers[q.id])).length
  const score = total === 0 ? 0 : Math.round((correct / total) * 100)
  return { total, correct, score, bestStreak: state.bestStreak, answered: answeredCount(state, quiz) }
}

/** Pemetaan pintasan papan tombol ke indeks opsi pilihan ganda. */
export function optionShortcut(key: string, optionCount: number): number | null {
  const k = key.trim().toLowerCase()
  const byNumber = /^[1-9]$/.test(k) ? Number(k) - 1 : -1
  const byLetter = /^[a-d]$/.test(k) ? k.charCodeAt(0) - 97 : -1
  const index = byNumber >= 0 ? byNumber : byLetter
  return index >= 0 && index < optionCount ? index : null
}
