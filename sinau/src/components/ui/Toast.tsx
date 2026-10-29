import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ToastTone = 'info' | 'ok' | 'warn' | 'danger'

interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

interface ToastValue {
  show: (t: { tone?: ToastTone; title: string; description?: string; duration?: number }) => void
}

const ToastContext = createContext<ToastValue | null>(null)

const toneStyles: Record<ToastTone, { icon: typeof Info; ring: string; iconClass: string }> = {
  info: { icon: Info, ring: 'border-brand/30', iconClass: 'text-brand' },
  ok: { icon: CheckCircle2, ring: 'border-ok/30', iconClass: 'text-ok' },
  warn: { icon: AlertTriangle, ring: 'border-warn/30', iconClass: 'text-warn' },
  danger: { icon: XCircle, ring: 'border-danger/30', iconClass: 'text-danger' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])

  const show = useCallback<ToastValue['show']>(
    ({ tone = 'info', title, description, duration = 4500 }) => {
      const id = ++counter.current
      setItems((list) => [...list.slice(-3), { id, tone, title, description }])
      if (duration > 0) setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-5" role="region" aria-label="Notifikasi">
        {items.map((t) => {
          const { icon: Icon, ring, iconClass } = toneStyles[t.tone]
          return (
            <div
              key={t.id}
              role="status"
              className={cn('toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface p-3.5 shadow-lg', ring)}
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', iconClass)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Tutup notifikasi" className="-mr-1 -mt-1 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return ctx
}
