import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DemoNotice } from '@/components/ui/DemoNotice'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'
import { useAuth } from '@/context/AuthContext'
import { useSettings, type Settings } from '@/context/SettingsContext'
import { aiService } from '@/services/ai.service'
import { clearAllLocalData } from '@/services/storage'

const grades = ['Kelas VII', 'Kelas VIII', 'Kelas IX', 'Kelas X', 'Kelas XI', 'Kelas XII', 'Mahasiswa']
const inputCls = 'h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm focus:border-brand focus:outline-none disabled:bg-surface-2 disabled:text-muted'

export default function SettingsPage() {
  const { settings, update } = useSettings()
  const { user, signOut } = useAuth()
  const [resetOpen, setResetOpen] = useState(false)

  function reset() {
    clearAllLocalData()
    window.location.reload()
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Pengaturan" description="Semua pengaturan tersimpan di browser ini saja dan belum tersinkron ke akun." />

      <div className="space-y-6">
        <Section title="Profil" description="Dipakai untuk sapaan dan tampilan di aplikasi.">
          <Field label="Nama panggilan" htmlFor="name">
            <input id="name" className={inputCls} placeholder={user?.givenName ?? 'Nama panggilan'} value={settings.name} onChange={(e) => update({ name: e.target.value })} maxLength={30} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenjang" htmlFor="grade">
              <select id="grade" className={inputCls} value={settings.grade} onChange={(e) => update({ grade: e.target.value })}>
                {grades.map((g) => (<option key={g}>{g}</option>))}
              </select>
            </Field>
            <Field label="Sekolah" htmlFor="school">
              <input id="school" className={inputCls} value={settings.school} onChange={(e) => update({ school: e.target.value })} maxLength={60} />
            </Field>
          </div>
          <Field label="Email" htmlFor="email" hint={user?.provider === 'google' ? 'Email dari akun Google, tidak bisa diubah di sini.' : 'Masuk dengan Google untuk menghubungkan akun.'}>
            <input id="email" className={inputCls} value={user?.email ?? ''} placeholder="Belum terhubung" disabled />
          </Field>
        </Section>

        <Section title="Tampilan">
          <Row label="Tema" hint="Ikuti sistem akan mengikuti mode terang atau gelap perangkatmu.">
            <Segmented<Settings['theme']> label="Tema" value={settings.theme} onChange={(theme) => update({ theme })} options={[{ value: 'light', label: 'Terang' }, { value: 'dark', label: 'Gelap' }, { value: 'system', label: 'Ikuti sistem' }]} />
          </Row>
          <Row label="Ukuran teks">
            <Segmented<Settings['textSize']> label="Ukuran teks" value={settings.textSize} onChange={(textSize) => update({ textSize })} options={[{ value: 'sm', label: 'Kecil' }, { value: 'md', label: 'Sedang' }, { value: 'lg', label: 'Besar' }]} />
          </Row>
          <Row label="Kurangi animasi" hint="Mematikan transisi dan animasi di seluruh aplikasi.">
            <Toggle label="Kurangi animasi" checked={settings.reduceMotion} onChange={(reduceMotion) => update({ reduceMotion })} />
          </Row>
        </Section>

        <Section title="Belajar">
          <Row label="Target belajar harian" hint="Dipakai di kartu target pada dashboard.">
            <div className="flex items-center gap-2">
              <input aria-label="Target belajar harian dalam menit" type="number" min={5} max={240} step={5} className={`${inputCls} w-24`} value={settings.dailyGoalMin} onChange={(e) => update({ dailyGoalMin: Math.min(240, Math.max(5, Number(e.target.value) || 5)) })} />
              <span className="text-sm text-muted">menit</span>
            </div>
          </Row>
          <Row label="Mode kartu quiz" hint="Latihan menampilkan pembahasan seketika; ujian menilai di akhir.">
            <Segmented<Settings['studyMode']> label="Mode kartu quiz" value={settings.studyMode} onChange={(studyMode) => update({ studyMode })} options={[{ value: 'latihan', label: 'Latihan' }, { value: 'ujian', label: 'Ujian' }]} />
          </Row>
          <Row label="Timer quiz aktif secara default">
            <Toggle label="Timer quiz aktif secara default" checked={settings.quizTimerDefault} onChange={(quizTimerDefault) => update({ quizTimerDefault })} />
          </Row>
          <Row label="Acak urutan flashcard">
            <Toggle label="Acak urutan flashcard" checked={settings.shuffleFlashcards} onChange={(shuffleFlashcards) => update({ shuffleFlashcards })} />
          </Row>
          <Row label="Gaya penjelasan AI Tutor" hint={aiService.isLive ? undefined : 'Berlaku setelah AI terhubung.'}>
            <Segmented<Settings['tutorStyle']> label="Gaya penjelasan AI Tutor" value={settings.tutorStyle} onChange={(tutorStyle) => update({ tutorStyle })} options={[{ value: 'ringkas', label: 'Ringkas' }, { value: 'bertahap', label: 'Bertahap' }, { value: 'rinci', label: 'Rinci' }]} />
          </Row>
        </Section>

        <Section title="Akun">
          <div className="flex items-center gap-4">
            {user?.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="size-12 rounded-full" /> : <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft font-display text-lg font-bold text-brand" aria-hidden>{(user?.givenName ?? 'S').charAt(0).toUpperCase()}</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{user?.name}</p>
              <p className="truncate text-sm text-muted">{user?.provider === 'google' ? user.email : 'Mode tanpa akun'}</p>
            </div>
            <Button onClick={signOut}>Keluar</Button>
          </div>
        </Section>

        <Section title="Data di perangkat ini">
          <DemoNotice>Pengaturan, materi unggahan, flashcard, quiz, skor, dan aktivitas disimpan di localStorage browser ini untuk akun yang sedang masuk. Data hilang jika cache dibersihkan dan tidak muncul di perangkat lain.</DemoNotice>
          <div>
            <Button variant="danger" onClick={() => setResetOpen(true)}>Hapus semua data lokal</Button>
          </div>
        </Section>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Hapus semua data lokal?"
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setResetOpen(false)}>Batal</Button><Button variant="danger" onClick={reset}>Hapus data</Button></>}
      >
        <p>Pengaturan, materi unggahan, flashcard, quiz, skor, dan progres akun ini di browser ini akan dihapus, lalu halaman dimuat ulang. Tindakan ini tidak bisa dibatalkan.</p>
      </Modal>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </Card>
  )
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
