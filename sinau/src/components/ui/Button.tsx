import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg'

const base =
  'relative inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink shadow-sm hover:bg-brand-strong hover:shadow-md',
  secondary: 'border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-surface-2',
  soft: 'bg-brand-soft text-brand hover:bg-brand-tint',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger-soft text-danger hover:brightness-95',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  /** Jika diisi, tombol dirender sebagai link internal. */
  to?: string
  /** Menampilkan indikator proses dan menonaktifkan tombol. */
  loading?: boolean
  fullWidth?: boolean
  children?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', to, loading = false, fullWidth, className, children, disabled, ...rest }: Props) {
  const cls = cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)

  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} aria-busy={loading || undefined} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

/** Tombol persegi tanpa label teks; wajib punya aria-label. */
export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  className,
  children,
  ...rest
}: Omit<Props, 'children'> & { label: string; children: ReactNode }) {
  const square = { sm: 'size-9', md: 'size-11', lg: 'size-12' }[size]
  return (
    <button type="button" aria-label={label} title={label} className={cn(base, variants[variant], square, 'px-0', className)} {...rest}>
      {children}
    </button>
  )
}
