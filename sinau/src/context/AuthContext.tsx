import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AuthUser } from '@/types'
import { clearSession, disableGoogleAutoSelect, exchangeGoogleCredential, guestUser, loadSession, saveSession } from '@/services/auth.service'
import { config } from '@/services/config'

interface AuthValue {
  user: AuthUser | null
  googleConfigured: boolean
  guestAllowed: boolean
  signInWithGoogle: (credential: string) => Promise<void>
  signInAsGuest: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadSession())

  const signInWithGoogle = useCallback(async (credential: string) => {
    const u = await exchangeGoogleCredential(credential)
    saveSession(u)
    setUser(u)
  }, [])

  const signInAsGuest = useCallback(() => {
    saveSession(guestUser)
    setUser(guestUser)
  }, [])

  const signOut = useCallback(() => {
    disableGoogleAutoSelect()
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ user, googleConfigured: !!config.googleClientId, guestAllowed: config.allowGuest, signInWithGoogle, signInAsGuest, signOut }),
    [user, signInWithGoogle, signInAsGuest, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
