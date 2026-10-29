import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'

export interface Settings {
  name: string
  grade: string
  school: string
  theme: 'light' | 'dark' | 'system'
  textSize: 'sm' | 'md' | 'lg'
  reduceMotion: boolean
  dailyGoalMin: number
  quizTimerDefault: boolean
  /** Mode default kartu quiz: latihan (umpan balik seketika) atau ujian (dinilai di akhir). */
  studyMode: 'latihan' | 'ujian'
  shuffleFlashcards: boolean
  tutorStyle: 'ringkas' | 'rinci' | 'bertahap'
}

export const defaultSettings: Settings = {
  name: '',
  grade: 'Kelas XI',
  school: '',
  theme: 'system',
  textSize: 'md',
  reduceMotion: false,
  dailyGoalMin: 45,
  quizTimerDefault: false,
  studyMode: 'latihan',
  shuffleFlashcards: false,
  tutorStyle: 'bertahap',
}

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useLocalStorage<Partial<Settings>>('settings', {})
  const settings = useMemo<Settings>(() => ({ ...defaultSettings, ...stored }), [stored])
  const update = useCallback((patch: Partial<Settings>) => setStored((prev) => ({ ...prev, ...patch })), [setStored])

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings.theme])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.textSize = settings.textSize
    root.dataset.motion = settings.reduceMotion ? 'reduce' : 'full'
  }, [settings.textSize, settings.reduceMotion])

  const value = useMemo(() => ({ settings, update }), [settings, update])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings harus dipakai di dalam SettingsProvider')
  return ctx
}
