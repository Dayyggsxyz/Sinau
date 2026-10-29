import { useEffect } from 'react'

interface CardKeyHandlers {
  next?: () => void
  prev?: () => void
  flip?: () => void
  /** Dipanggil dengan indeks opsi saat tombol angka atau huruf ditekan. */
  option?: (index: number) => void
  optionCount?: number
  enabled?: boolean
}

const isTyping = (el: EventTarget | null) => {
  const node = el as HTMLElement | null
  if (!node) return false
  const tag = node.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable === true
}

/**
 * Pintasan papan tombol bersama untuk kartu belajar:
 * panah kiri/kanan untuk pindah, spasi untuk membalik, angka/huruf untuk memilih opsi.
 */
export function useCardKeys({ next, prev, flip, option, optionCount = 0, enabled = true }: CardKeyHandlers) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && next) {
        e.preventDefault()
        next()
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && prev) {
        e.preventDefault()
        prev()
      } else if (e.key === ' ' && flip) {
        e.preventDefault()
        flip()
      } else if (option && optionCount > 0) {
        const k = e.key.toLowerCase()
        const byNumber = /^[1-9]$/.test(k) ? Number(k) - 1 : -1
        const byLetter = /^[a-e]$/.test(k) ? k.charCodeAt(0) - 97 : -1
        const index = byNumber >= 0 ? byNumber : byLetter
        if (index >= 0 && index < optionCount) {
          e.preventDefault()
          option(index)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [next, prev, flip, option, optionCount, enabled])
}
