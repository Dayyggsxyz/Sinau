import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Flashcard, Material, Quiz } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface Stored {
  materials: Material[]
  flashcards: Flashcard[]
  quizzes: Quiz[]
  /** override progres baca (0-100) per id materi, termasuk materi contoh */
  progress: Record<string, number>
}
const empty: Stored = { materials: [], flashcards: [], quizzes: [], progress: {} }

interface LibraryValue {
  materials: Material[]
  flashcards: Flashcard[]
  quizzes: Quiz[]
  /** materi yang punya minimal satu flashcard */
  decks: Material[]
  isSample: (m: Material) => boolean
  getMaterial: (id: string | undefined) => Material | undefined
  getQuizForMaterial: (materialId: string) => Quiz | undefined
  addMaterial: (m: Material) => void
  updateMaterial: (id: string, patch: Partial<Material>) => void
  removeMaterial: (id: string) => void
  setCards: (materialId: string, cards: Flashcard[]) => void
  setQuiz: (quiz: Quiz) => void
  setProgress: (id: string, pct: number) => void
}

const LibraryContext = createContext<LibraryValue | null>(null)

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useLocalStorage<Stored>('library', empty)

  const value = useMemo<LibraryValue>(() => {
    const withProgress = (m: Material): Material => (stored.progress[m.id] !== undefined ? { ...m, progress: stored.progress[m.id] } : m)
    const materials = stored.materials.map(withProgress)
    const ids = new Set(materials.map((m) => m.id))
    const flashcards = stored.flashcards.filter((c) => ids.has(c.materialId))
    const quizzes = stored.quizzes.filter((q) => ids.has(q.materialId))
    const decks = materials.filter((m) => flashcards.some((c) => c.materialId === m.id))

    return {
      materials,
      flashcards,
      quizzes,
      decks,
      isSample: () => false,
      getMaterial: (id) => materials.find((m) => m.id === id),
      getQuizForMaterial: (materialId) => quizzes.find((q) => q.materialId === materialId),
      addMaterial: (m) => setStored((s) => ({ ...s, materials: [m, ...s.materials] })),
      updateMaterial: (id, patch) => setStored((s) => ({ ...s, materials: s.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMaterial: (id) =>
        setStored((s) => {
          const progress = { ...s.progress }
          delete progress[id]
          return { materials: s.materials.filter((m) => m.id !== id), flashcards: s.flashcards.filter((c) => c.materialId !== id), quizzes: s.quizzes.filter((q) => q.materialId !== id), progress }
        }),
      setCards: (materialId, cards) => setStored((s) => ({ ...s, flashcards: [...s.flashcards.filter((c) => c.materialId !== materialId), ...cards] })),
      setQuiz: (quiz) => setStored((s) => ({ ...s, quizzes: [...s.quizzes.filter((q) => q.materialId !== quiz.materialId), quiz] })),
      setProgress: (id, pct) => setStored((s) => ({ ...s, progress: { ...s.progress, [id]: pct } })),
    }
  }, [stored, setStored])

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary harus dipakai di dalam LibraryProvider')
  return ctx
}
