import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Halaman tidak ditemukan"
      description="Alamat yang kamu buka tidak ada di Sinau. Kembali ke dashboard untuk melanjutkan belajar."
      action={<Button variant="primary" to="/">Ke dashboard</Button>}
    />
  )
}
