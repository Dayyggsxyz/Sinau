import type { Flashcard, Material, Question, Quiz } from '@/types'
import { normalize } from '@/lib/quiz'

/** Satu soal Sinau Runner: tepat tiga pintu, satu benar. Dibangun dari materi pengguna sendiri. */
export interface RunnerQuestion {
  id: string
  prompt: string
  doors: [string, string, string]
  correct: 0 | 1 | 2
  explanation: string
  source: 'quiz' | 'kartu' | 'istilah'
}

const MAX_DOOR = 90
const MAX_PROMPT = 220

const clean = (s: string) => s.replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim()
const shuffle = <T,>(a: T[]) => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/** Memilih dua pengecoh unik (berbeda dari jawaban dan satu sama lain) dari kandidat. */
function pickDistractors(answer: string, candidates: string[]): [string, string] | null {
  const seen = new Set([normalize(answer)])
  const out: string[] = []
  for (const c of shuffle(candidates)) {
    const n = normalize(c)
    if (!n || seen.has(n) || c.length > MAX_DOOR) continue
    seen.add(n)
    out.push(c)
    if (out.length === 2) return [out[0], out[1]]
  }
  return null
}

function assemble(id: string, prompt: string, answer: string, wrong: [string, string], explanation: string, source: RunnerQuestion['source']): RunnerQuestion {
  const doors = shuffle([answer, wrong[0], wrong[1]])
  return { id, prompt, doors: doors as RunnerQuestion['doors'], correct: doors.indexOf(answer) as 0 | 1 | 2, explanation, source }
}

function fromQuestions(questions: Question[]): RunnerQuestion[] {
  const shortAnswers = questions.flatMap((q) => (q.type === 'short' ? [clean(q.accepted[0])] : []))
  const mcqAnswers = questions.flatMap((q) => (q.type === 'mcq' ? [clean(q.options[q.answer])] : []))
  const out: RunnerQuestion[] = []
  for (const q of questions) {
    const prompt = clean(q.prompt)
    if (!prompt || prompt.length > MAX_PROMPT) continue
    if (q.type === 'mcq') {
      const answer = clean(q.options[q.answer])
      const wrong = q.options.filter((_, i) => i !== q.answer).map(clean).filter((o) => o.length <= MAX_DOOR)
      if (answer.length > MAX_DOOR) continue
      const d = pickDistractors(answer, wrong)
      if (d) out.push(assemble(q.id, prompt, answer, d, q.explanation, 'quiz'))
    } else if (q.type === 'short') {
      const answer = clean(q.accepted[0])
      const d = pickDistractors(answer, [...shortAnswers, ...mcqAnswers])
      if (d) out.push(assemble(q.id, prompt, answer, d, q.explanation, 'quiz'))
    }
    // Soal benar/salah tidak dipakai: hanya punya dua pilihan, sedangkan game memakai tiga pintu.
  }
  return out
}

function fromCards(cards: Flashcard[]): RunnerQuestion[] {
  const usable = cards.filter((c) => clean(c.back).length <= MAX_DOOR && clean(c.front).length <= MAX_PROMPT)
  const backs = usable.map((c) => clean(c.back))
  const out: RunnerQuestion[] = []
  for (const c of usable) {
    const answer = clean(c.back)
    const d = pickDistractors(answer, backs)
    if (d) out.push(assemble(c.id, clean(c.front), answer, d, `Dari kartu belajar: ${answer}`, 'kartu'))
  }
  return out
}

function fromGlossary(m: Material): RunnerQuestion[] {
  const items = m.glossary.map((g) => ({ term: clean(g.term), def: clean(g.definition) })).filter((g) => g.term && g.def.length <= MAX_DOOR)
  const defs = items.map((g) => g.def)
  const out: RunnerQuestion[] = []
  items.forEach((g, i) => {
    const d = pickDistractors(g.def, defs)
    if (d) out.push(assemble(`${m.id}-term-${i}`, `Apa yang dimaksud dengan "${g.term}"?`, g.def, d, `${g.term}: ${g.def}`, 'istilah'))
  })
  return out
}

/** Menggabungkan soal quiz, flashcard, dan istilah milik satu materi menjadi soal tiga pintu. */
export function buildRunnerPool(material: Material, quizzes: Quiz[], flashcards: Flashcard[]): RunnerQuestion[] {
  const all = [
    ...fromQuestions(quizzes.filter((q) => q.materialId === material.id).flatMap((q) => q.questions)),
    ...fromCards(flashcards.filter((c) => c.materialId === material.id)),
    ...fromGlossary(material),
  ]
  const seen = new Set<string>()
  return all.filter((q) => {
    const k = normalize(q.prompt)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export const MIN_POOL = 8
