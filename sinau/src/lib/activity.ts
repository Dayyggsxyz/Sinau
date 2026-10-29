import { readJson, writeJson } from '@/services/storage'

type Log = Record<string, number> // 'YYYY-MM-DD' (waktu lokal) -> detik

const KEY = 'activity'

export function dayKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function addStudySeconds(seconds: number) {
  const log = readJson<Log>(KEY, {})
  const k = dayKey()
  log[k] = (log[k] ?? 0) + seconds
  // simpan maksimal ~120 hari terakhir
  const keys = Object.keys(log).sort()
  keys.slice(0, Math.max(0, keys.length - 120)).forEach((old) => delete log[old])
  writeJson(KEY, log)
}

/** Menit belajar untuk N hari terakhir; elemen terakhir = hari ini. */
export function getDailyMinutes(days = 7): number[] {
  const log = readJson<Log>(KEY, {})
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return Math.round((log[dayKey(d)] ?? 0) / 60)
  })
}

/** Hari beruntun dengan minimal 1 menit belajar; hari ini yang masih kosong tidak memutus streak. */
export function getStreak(): number {
  const log = readJson<Log>(KEY, {})
  const d = new Date()
  if ((log[dayKey(d)] ?? 0) < 60) d.setDate(d.getDate() - 1)
  let streak = 0
  while ((log[dayKey(d)] ?? 0) >= 60) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}
