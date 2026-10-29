import { useCallback, useState } from 'react'
import { readJson, writeJson, STORAGE_ERROR_EVENT } from '@/services/storage'

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readJson<T>(key, initial))

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        if (!writeJson(key, resolved)) window.dispatchEvent(new Event(STORAGE_ERROR_EVENT))
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}
