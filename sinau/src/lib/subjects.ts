import type { FileType, Subject } from '@/types'

export const subjectStyle: Record<Subject, { badge: string; bar: string }> = {
  Biologi: {
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    bar: 'bg-emerald-500',
  },
  Fisika: {
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    bar: 'bg-sky-500',
  },
  Sejarah: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
  Matematika: {
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    bar: 'bg-indigo-500',
  },
  Lainnya: {
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    bar: 'bg-slate-500',
  },
  'Bahasa Indonesia': {
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    bar: 'bg-rose-500',
  },
}

export const fileTypeStyle: Record<FileType, string> = {
  pdf: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  docx: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  pptx: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  txt: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}
