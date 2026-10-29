import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, FileText, Layers, ListChecks, MessageSquareText } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { renderGoogleButton } from '@/services/auth.service'

const points = [
  { icon: FileText, text: 'Unggah catatan, slide, atau PDF pelajaranmu' },
  { icon: Layers, text: 'Ulas dengan flashcard' },
  { icon: ListChecks, text: 'Uji dengan quiz' },
  { icon: MessageSquareText, text: 'Tanya AI Tutor soal isi materimu' },
]

export default function LoginPage() {
  const { user, googleConfigured, guestAllowed, signInWithGoogle, signInAsGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!googleConfigured || !buttonRef.current) return
    let cancelled = false
    renderGoogleButton(buttonRef.current, (credential) => {
      setError(null)
      signInWithGoogle(credential)
        .then(() => !cancelled && navigate(from, { replace: true }))
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Gagal masuk. Coba lagi.'))
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Tombol Google gagal dimuat.'))
    return () => {
      cancelled = true
    }
  }, [googleConfigured, signInWithGoogle, navigate, from])

  if (user) return <Navigate to={from} replace />

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="ruled margin-line relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface px-14 py-12 lg:flex">
        <div className="pointer-events-none absolute -right-24 top-1/4 size-72 rounded-full bg-brand/5 blur-3xl" aria-hidden />
        <Logo />
        <div className="max-w-md">
          <h1 className="text-5xl font-bold leading-[1.08]">Belajar dari materimu sendiri</h1>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted">Sinau, belajar dengan bantuan AI untuk pelajar Indonesia.</p>
      </section>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <h2 className="text-3xl font-bold">Masuk ke Sinau</h2>
          <p className="mt-2 text-muted">Gunakan akun Google untuk menyimpan materi dan progres belajarmu.</p>

          <div className="mt-8">
            {googleConfigured ? (
              <div ref={buttonRef} className="flex min-h-11 justify-center" aria-label="Masuk dengan Google" />
            ) : (
              <div className="rounded-lg border border-warn/30 bg-warn-soft p-4 text-sm" role="note">
                <p className="font-semibold">Login Google belum dikonfigurasi</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Buat OAuth client ID (Web application) di Google Cloud Console.</li>
                  <li>Tambahkan <code className="rounded bg-surface px-1">http://localhost:5173</code> ke Authorized JavaScript origins.</li>
                  <li>Isi <code className="rounded bg-surface px-1">VITE_GOOGLE_CLIENT_ID</code> di <code className="rounded bg-surface px-1">.env.local</code>, lalu restart <code className="rounded bg-surface px-1">npm run dev</code>.</li>
                </ol>
              </div>
            )}
            {error && (
              <p className="mt-4 flex items-start gap-2 text-sm text-danger" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
          </div>

          {guestAllowed && (
            <div className="mt-6 border-t border-line pt-6">
              <Button className="w-full" onClick={() => { signInAsGuest(); navigate(from, { replace: true }) }}>
                Lanjutkan tanpa akun
              </Button>
              <p className="mt-2 text-center text-xs text-muted">Data belajar hanya tersimpan di browser ini.</p>
            </div>
          )}

          <p className="mt-8 text-xs text-muted">
            Sinau hanya menerima nama, email, dan foto profil dari Google. Data belajarmu tersimpan di browser ini dan belum disinkronkan ke server.
          </p>
        </div>
      </main>
    </div>
  )
}
