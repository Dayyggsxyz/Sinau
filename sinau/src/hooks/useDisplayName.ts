import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'

/** Nama panggilan dari Pengaturan; jika kosong, pakai nama depan akun. */
export function useDisplayName() {
  const { settings } = useSettings()
  const { user } = useAuth()
  return settings.name.trim() || user?.givenName || 'Pelajar'
}
