import { cn } from '@/lib/cn'

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[26px] w-[46px] shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-50',
        checked ? 'border-brand bg-brand' : 'border-line-strong bg-surface-3',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(.2,.7,.2,1)]',
          checked && 'translate-x-[20px]',
        )}
      />
    </button>
  )
}
