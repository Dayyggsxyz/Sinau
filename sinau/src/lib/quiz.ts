import type { AnswerValue, Answers, Question, Quiz } from '@/types'

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isAnswered(value: AnswerValue | undefined) {
  if (value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

export function isCorrect(q: Question, value: AnswerValue | undefined) {
  if (!isAnswered(value)) return false
  switch (q.type) {
    case 'mcq':
      return value === q.answer
    case 'tf':
      return value === q.answer
    case 'short':
      return typeof value === 'string' && q.accepted.some((a) => normalize(a) === normalize(value))
  }
}

export function grade(quiz: Quiz, answers: Answers) {
  const total = quiz.questions.length
  const correct = quiz.questions.filter((q) => isCorrect(q, answers[q.id])).length
  const score = total === 0 ? 0 : Math.round((correct / total) * 100)
  return { total, correct, score }
}

export function formatCorrectAnswer(q: Question) {
  switch (q.type) {
    case 'mcq':
      return `${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}`
    case 'tf':
      return q.answer ? 'Benar' : 'Salah'
    case 'short':
      return q.accepted[0]
  }
}

export function formatUserAnswer(q: Question, value: AnswerValue | undefined) {
  if (!isAnswered(value)) return 'Tidak dijawab'
  switch (q.type) {
    case 'mcq':
      return typeof value === 'number' ? `${String.fromCharCode(65 + value)}. ${q.options[value]}` : '-'
    case 'tf':
      return value ? 'Benar' : 'Salah'
    case 'short':
      return String(value)
  }
}
