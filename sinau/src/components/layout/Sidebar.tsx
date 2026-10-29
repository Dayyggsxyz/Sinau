import { NavLink } from 'react-router-dom'
import { Footprints, Layers, LayoutDashboard, Library, ListChecks, LogOut, MessageSquareText, Settings as SettingsIcon } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { useDisplayName } from '@/hooks/useDisplayName'
import { cn } from '@/lib/cn'

const groups = [
  {
    label: 'Belajar',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/materi', label: 'Materi Saya', icon: Library },
      { to: '/flashcard', label: 'Flashcard', icon: Layers },
      { to: '/quiz', label: 'Quiz', icon: ListChecks },
      { to: '/tutor', label: 'AI Tutor', icon: MessageSquareText },
      { to: '/runner', label: 'Sinau Runner', icon: Footprints },
    ],
  },
  {
    label: 'Lainnya',
    items: [{ to: '/pengaturan', label: 'Pengaturan', icon: SettingsIcon }],
  },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { settings } = useSettings()
  const { user, signOut } = useAuth()
  const name = useDisplayName()

  return (
    <div className="flex h-full w-full flex-col gap-6 px-3.5 py-5">
      <div className="px-2.5 pt-1">
        <Logo />
      </div>

      <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-faint">{group.label}</p>
            <div className="flex flex-col gap-1">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      isActive ? 'bg-brand-soft text-brand shadow-xs' : 'text-muted hover:bg-surface-2 hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors', isActive ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted group-hover:text-ink')}>
                        <Icon className="size-[17px]" aria-hidden />
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="rounded-2xl border border-line bg-surface-2/60 p-3">
        <div className="flex items-center gap-3">
          {user?.picture ? (
            <img src={user.picture} alt="" referrerPolicy="no-referrer" className="size-9 shrink-0 rounded-full ring-2 ring-surface" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand" aria-hidden>
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted">{user?.email || settings.grade}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onNavigate?.()
              signOut()
            }}
            aria-label="Keluar dari akun"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
        {user?.provider === 'guest' && <Badge tone="warn" className="mt-2.5">Mode tanpa akun</Badge>}
      </div>
    </div>
  )
}
