import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AlertTriangle, Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { IconButton } from '@/components/ui/Button'
import { Sidebar } from './Sidebar'
import { useStudyTracker } from '@/hooks/useStudyTracker'
import { STORAGE_ERROR_EVENT } from '@/services/storage'

export function AppShell() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const [storageFull, setStorageFull] = useState(false)
  useStudyTracker()

  useEffect(() => {
    const on = () => setStorageFull(true)
    window.addEventListener(STORAGE_ERROR_EVENT, on)
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, on)
  }, [])

  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-ink"
      >
        Lewati ke konten utama
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface/80 backdrop-blur lg:flex">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur-md lg:hidden">
        <Logo />
        <IconButton label="Buka menu" onClick={() => setOpen(true)} aria-expanded={open}>
          <Menu className="size-5" />
        </IconButton>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Tutup menu" className="overlay-in absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <aside className="slide-in-left absolute inset-y-0 left-0 flex w-72 border-r border-line bg-surface shadow-xl">
            <IconButton label="Tutup menu" onClick={() => setOpen(false)} className="absolute right-3 top-4 z-10">
              <X className="size-5" />
            </IconButton>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {storageFull && (
        <div role="alert" className="flex items-center justify-center gap-2 border-b border-danger/25 bg-danger-soft px-4 py-2.5 text-center text-sm text-danger">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Penyimpanan browser penuh. Perubahan terbaru mungkin tidak tersimpan — hapus materi yang tidak dipakai di Materi Saya.
        </div>
      )}

      <main id="konten" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
