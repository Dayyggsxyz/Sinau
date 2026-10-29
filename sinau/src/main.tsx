import { Fragment, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LibraryProvider } from './context/LibraryContext'
import { SettingsProvider } from './context/SettingsContext'
import { ToastProvider } from './components/ui/Toast'
import { setStorageScope } from './services/storage'
import './index.css'

/** Data lokal dipisah per akun; key berganti sehingga seluruh state dimuat ulang saat akun berubah. */
function ScopedApp() {
  const { user } = useAuth()
  const scope = user?.id ?? 'anon'
  setStorageScope(scope)
  return (
    <Fragment key={scope}>
      <SettingsProvider>
        <LibraryProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </LibraryProvider>
      </SettingsProvider>
    </Fragment>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ScopedApp />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
