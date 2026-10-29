import type { Understanding } from '@/types'
import { useLocalStorage } from './useLocalStorage'

export function useFlashcardProgress() {
  return useLocalStorage<Record<string, Understanding>>('flashcards', {})
}
