import { useEffect } from 'react'
import { addStudySeconds } from '@/lib/activity'

const TICK_SECONDS = 15

/** Mencatat waktu belajar aktif: hanya saat tab terlihat dan jendela fokus. */
export function useStudyTracker() {
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden && document.hasFocus()) addStudySeconds(TICK_SECONDS)
    }, TICK_SECONDS * 1000)
    return () => clearInterval(id)
  }, [])
}
