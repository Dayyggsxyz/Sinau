/**
 * Penyimpanan LOKAL di browser (localStorage), dipisah per pengguna lewat "scope".
 * Ini bukan penyimpanan permanen: data hilang jika cache dihapus dan tidak ikut
 * berpindah antar perangkat. Ganti dengan API backend saat database tersedia.
 */
let scope = 'anon'

export function setStorageScope(id: string) {
  scope = id.replace(/[^a-zA-Z0-9_-]/g, '_') || 'anon'
}

const scopedKey = (key: string) => `sinau:${scope}:${key}`
const globalKey = (key: string) => `sinau:${key}`

function read<T>(fullKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(fullKey)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function write<T>(fullKey: string, value: T): boolean {
  try {
    localStorage.setItem(fullKey, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const readJson = <T,>(key: string, fallback: T) => read(scopedKey(key), fallback)
export const writeJson = <T,>(key: string, value: T) => write(scopedKey(key), value)

/** Untuk data yang harus terbaca sebelum pengguna diketahui (sesi login). */
export const readGlobal = <T,>(key: string, fallback: T) => read(globalKey(key), fallback)
export const writeGlobal = <T,>(key: string, value: T) => write(globalKey(key), value)
export const removeGlobal = (key: string) => localStorage.removeItem(globalKey(key))

export function clearAllLocalData() {
  const prefix = `sinau:${scope}:`
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k))
}

export const STORAGE_ERROR_EVENT = 'sinau:storage-error'
