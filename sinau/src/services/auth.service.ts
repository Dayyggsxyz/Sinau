import type { AuthUser } from '@/types'
import { config } from './config'
import { readGlobal, removeGlobal, writeGlobal } from './storage'

/* ---------- Tipe minimal Google Identity Services ---------- */
interface GisCredentialResponse {
  credential: string
}
interface GisIdApi {
  initialize(cfg: { client_id: string; callback: (r: GisCredentialResponse) => void; auto_select?: boolean; cancel_on_tap_outside?: boolean }): void
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void
  disableAutoSelect(): void
}
declare global {
  interface Window {
    google?: { accounts: { id: GisIdApi } }
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'
let gisPromise: Promise<void> | null = null

export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gisPromise) return gisPromise
  gisPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisPromise = null
      reject(new Error('Skrip Google tidak bisa dimuat. Periksa koneksi internet atau pemblokir iklan.'))
    }
    document.head.appendChild(s)
  })
  return gisPromise
}

export async function renderGoogleButton(el: HTMLElement, onCredential: (credential: string) => void) {
  await loadGoogleScript()
  const id = window.google?.accounts.id
  if (!id) throw new Error('Google Identity Services tidak tersedia.')
  id.initialize({ client_id: config.googleClientId, callback: (r) => onCredential(r.credential), cancel_on_tap_outside: true })
  id.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left', width: 320, locale: 'id' })
}

export function disableGoogleAutoSelect() {
  window.google?.accounts?.id?.disableAutoSelect()
}

/* ---------- JWT ---------- */
interface GoogleClaims {
  sub: string
  email?: string
  name?: string
  given_name?: string
  picture?: string
  aud?: string
  exp?: number
}

function decodeJwt(token: string): GoogleClaims {
  const part = token.split('.')[1]
  if (!part) throw new Error('Token Google tidak valid.')
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as GoogleClaims
}

/**
 * Mengubah credential Google menjadi pengguna aplikasi.
 * - Dengan VITE_API_BASE_URL: dikirim ke backend untuk diverifikasi (disarankan).
 * - Tanpa itu: hanya didekode di browser. TIDAK diverifikasi tanda tangannya,
 *   jadi jangan dipakai untuk melindungi data sensitif di sisi server.
 */
export async function exchangeGoogleCredential(credential: string): Promise<AuthUser> {
  if (config.apiBaseUrl) {
    const res = await fetch(`${config.apiBaseUrl}/auth/google`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    })
    if (!res.ok) throw new Error(`Server menolak login (${res.status}).`)
    const data = (await res.json()) as { user: { id: string; email: string; name: string; picture?: string } }
    const name = data.user.name || data.user.email
    return { id: data.user.id, email: data.user.email, name, givenName: name.split(' ')[0], picture: data.user.picture, provider: 'google' }
  }

  const c = decodeJwt(credential)
  if (c.aud && c.aud !== config.googleClientId) throw new Error('Token Google bukan untuk aplikasi ini.')
  if (c.exp && c.exp * 1000 < Date.now()) throw new Error('Token Google sudah kedaluwarsa. Coba masuk lagi.')
  const name = c.name || c.email || 'Pengguna'
  return { id: c.sub, email: c.email ?? '', name, givenName: c.given_name || name.split(' ')[0], picture: c.picture, provider: 'google' }
}

export const guestUser: AuthUser = { id: 'guest', email: '', name: 'Tamu', givenName: 'Tamu', provider: 'guest' }

/* ---------- Sesi lokal ---------- */
const SESSION_KEY = 'auth'
const SESSION_DAYS = 7
interface Session {
  user: AuthUser
  expiresAt: number
}

export function loadSession(): AuthUser | null {
  const s = readGlobal<Session | null>(SESSION_KEY, null)
  if (!s || !s.user || s.expiresAt < Date.now()) return null
  return s.user
}
export function saveSession(user: AuthUser) {
  writeGlobal<Session>(SESSION_KEY, { user, expiresAt: Date.now() + SESSION_DAYS * 24 * 3600 * 1000 })
}
export function clearSession() {
  removeGlobal(SESSION_KEY)
}
