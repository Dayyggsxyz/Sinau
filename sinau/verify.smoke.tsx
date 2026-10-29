/**
 * Temporary verification harness (not part of the app bundle).
 * Run with esbuild + node. Covers pure card-engine logic and an SSR render smoke test.
 */
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from '@/App'
import { AuthProvider } from '@/context/AuthContext'
import { SettingsProvider } from '@/context/SettingsContext'
import { LibraryProvider } from '@/context/LibraryContext'
import { ToastProvider } from '@/components/ui/Toast'
import { applyAnswer, createSession, goto, isRevealed, optionShortcut, sessionResult } from '@/lib/quizSession'
import { grade, isCorrect } from '@/lib/quiz'
import { quizzes } from '@/data'

/* ------------------------------- tiny assert ------------------------------- */
let passed = 0
const failures: string[] = []
function check(name: string, condition: boolean, detail = '') {
  if (condition) passed++
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
}

/* --------------------------- 1. card engine logic --------------------------- */
const quiz = quizzes[0]

const latihan = createSession('latihan')
check('latihan starts at first card', latihan.current === 0 && latihan.streak === 0)

// Correct answer: locks, reveals and grows the streak.
const q0 = quiz.questions[0]
const afterCorrect = applyAnswer(latihan, quiz, q0.id, q0.type === 'mcq' ? q0.answer : true)
check('latihan reveals feedback on answer', isRevealed(afterCorrect, q0.id))
check('latihan locks the answered question', afterCorrect.locked.includes(q0.id))
check('correct answer grows streak', afterCorrect.streak === 1)

// Same question cannot be answered twice (answers stay locked).
const retry = applyAnswer(afterCorrect, quiz, q0.id, q0.type === 'mcq' ? (q0.answer + 1) % 4 : false)
check('latihan cannot change a locked answer', JSON.stringify(retry.answers) === JSON.stringify(afterCorrect.answers))
check('latihan streak unchanged after retry', retry.streak === afterCorrect.streak)

// Wrong answer resets streak but still reveals + locks.
const wrongId = quiz.questions[1]
const wrongValue = wrongId.type === 'mcq' ? (wrongId.answer + 1) % 4 : wrongId.type === 'tf' ? !wrongId.answer : 'zzz'
const afterWrong = applyAnswer(afterCorrect, quiz, wrongId.id, wrongValue)
check('wrong answer resets streak', afterWrong.streak === 0)
check('wrong answer still reveals feedback', isRevealed(afterWrong, wrongId.id))

// Ujian mode: free editing, no reveal, graded at end.
const ujian = createSession('ujian')
const u1 = applyAnswer(ujian, quiz, q0.id, q0.type === 'mcq' ? q0.answer : true)
check('ujian never reveals feedback', !isRevealed(u1, q0.id))
const u2 = applyAnswer(u1, quiz, q0.id, q0.type === 'mcq' ? (q0.answer + 1) % 4 : false)
check('ujian allows changing answers', u2.answers[q0.id] !== u1.answers[q0.id])

// Navigation clamps.
check('goto clamps above range', goto(latihan, quiz, 999).current === quiz.questions.length - 1)
check('goto clamps below range', goto(latihan, quiz, -5).current === 0)

// Shortcut mapping.
check('shortcut 1 maps to option 0', optionShortcut('1', 4) === 0)
check('shortcut d maps to option 3', optionShortcut('d', 4) === 3)
check('shortcut out of range is ignored', optionShortcut('9', 4) === null)
check('shortcut applies to 2-option tf', optionShortcut('2', 2) === 1)

// Grading agrees with the shared grade() helper.
const finished = applyAnswer(ujian, quiz, q0.id, q0.type === 'mcq' ? q0.answer : true)
const r = sessionResult(finished, quiz)
const g = grade(quiz, finished.answers)
check('sessionResult matches grade()', r.score === g.score && r.correct === g.correct)
check('score is a whole percentage', r.score === Math.round((g.correct / g.total) * 100))
check('isCorrect false for unanswered', isCorrect(q0, undefined) === false)

/* ------------------------- 2. SSR render smoke test ------------------------- */
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string) { return this.map.has(k) ? (this.map.get(k) as string) : null }
  setItem(k: string, v: string) { this.map.set(k, String(v)) }
  removeItem(k: string) { this.map.delete(k) }
  clear() { this.map.clear() }
  key(i: number) { return [...this.map.keys()][i] ?? null }
  get length() { return this.map.size }
}

const storage = new MemoryStorage()
const session = { user: { id: 'test-user', email: 'a@b.c', name: 'Uji Coba', givenName: 'Uji', provider: 'guest' }, expiresAt: Date.now() + 86400000 }
storage.setItem('sinau:auth', JSON.stringify(session))

const globals = globalThis as unknown as Record<string, unknown>
globals.localStorage = storage
globals.window = {
  localStorage: storage,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  addEventListener() {},
  removeEventListener() {},
  scrollTo() {},
  location: { pathname: '/', search: '', hash: '' },
}

function render(path: string, authed = true) {
  if (!authed) storage.removeItem('sinau:auth')
  else storage.setItem('sinau:auth', JSON.stringify(session))
  return renderToString(
    <StrictMode>
      <StaticRouter location={path}>
        <AuthProvider>
          <SettingsProvider>
            <LibraryProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </LibraryProvider>
          </SettingsProvider>
        </AuthProvider>
      </StaticRouter>
    </StrictMode>,
  )
}

const screens: [string, string][] = [
  ['/', 'Target hari ini'],
  ['/', 'Aktivitas 7 hari terakhir'],
  ['/materi', 'Materi Saya'],
  ['/flashcard', 'Flashcard'],
  ['/quiz', 'Quiz'],
  ['/quiz', 'Tersedia mode Latihan dan Ujian'],
  ['/pengaturan', 'Pengaturan'],
  ['/tutor', 'AI Tutor'],
  ['/materi/fotosintesis-respirasi', 'Fotosintesis dan Respirasi Seluler'],
  ['/tidak-ada', 'Halaman tidak ditemukan'],
]

for (const [path, needle] of screens) {
  let html = ''
  try {
    html = render(path)
  } catch (e) {
    failures.push(`render ${path} threw — ${(e as Error).message}`)
    continue
  }
  check(`render ${path} contains "${needle}"`, html.includes(needle))
  check(`render ${path} produced non-trivial HTML`, html.length > 2000, `length=${html.length}`)
}

// Interactive quiz setup screen must expose both modes.
const setupHtml = render(`/quiz/${quizzes[0].id}`)
check('quiz setup offers Latihan mode', setupHtml.includes('Latihan'))
check('quiz setup offers Ujian mode', setupHtml.includes('Ujian'))
check('quiz setup shows mode picker', setupHtml.includes('Pilih mode'))
check('quiz setup shows start button', setupHtml.includes('Mulai'))

// Unauthenticated visitors land on the login screen.
const loginHtml = render('/masuk', false)
check('login page renders for guests', loginHtml.includes('Masuk ke Sinau'))

/* --------------------------------- report --------------------------------- */
if (failures.length) {
  console.error(`\n✗ ${failures.length} check(s) failed:\n - ${failures.join('\n - ')}\n`)
  process.exit(1)
}
console.log(`\n✓ all ${passed} checks passed\n`)
