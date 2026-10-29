export const SUBJECTS = ['Biologi', 'Fisika', 'Sejarah', 'Matematika', 'Bahasa Indonesia', 'Lainnya'] as const
export type Subject = (typeof SUBJECTS)[number]
export type FileType = 'pdf' | 'docx' | 'pptx' | 'txt'

export interface MaterialSection {
  id: string
  title: string
  body: string[]
  keyPoints?: string[]
  /** Rentang halaman sumber (halaman semu untuk DOCX/TXT). */
  pageStart?: number
  pageEnd?: number
}

export interface GlossaryTerm {
  term: string
  definition: string
}

export interface Material {
  id: string
  title: string
  subject: Subject
  grade: string
  fileType: FileType
  pages: number
  readMinutes: number
  /** ISO date */
  updatedAt: string
  /** 0-100, data demo */
  progress: number
  /** Kosong/tidak ada = materi contoh bawaan. 'upload' = dibuat dari file pengguna. */
  source?: 'upload'
  fileName?: string
  /** Teks hasil ekstraksi (dibatasi), dipakai sebagai konteks AI. Hanya untuk materi unggahan. */
  rawText?: string
  description: string
  summary: string[]
  sections: MaterialSection[]
  glossary: GlossaryTerm[]
  /** Peta cakupan pemrosesan AI. Tidak ada = belum pernah diproses per potongan. */
  coverage?: Coverage
  /** Catatan belajar hasil AI per mode (ringkas, lengkap, ujian, dst.). */
  notes?: Partial<Record<NotesMode, NotesDoc>>
}

export type NotesMode = 'ringkas' | 'lengkap' | 'bab' | 'ujian' | 'konsep' | 'rumus'

export interface NotesDoc {
  markdown: string
  /** Id bagian yang diminta saat dibuat. */
  sectionIds: string[]
  /** Judul bagian yang gagal diproses (kosong jika semua berhasil). */
  failedTitles: string[]
  createdAt: string
}

export interface Coverage {
  totalChunks: number
  okChunks: number
  /** Rentang halaman yang gagal diproses, mis. "hal. 20–27". */
  failedRanges: string[]
  /** true jika teks yang tersimpan dipotong karena batas penyimpanan browser. */
  textTruncated?: boolean
  totalPages: number
}

export type Understanding = 'belum' | 'ragu' | 'paham'

export interface Flashcard {
  id: string
  materialId: string
  front: string
  back: string
}

interface BaseQuestion {
  id: string
  prompt: string
  explanation: string
}
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'mcq'
  options: string[] // 4 opsi: A-D
  answer: number // index opsi benar
}
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'tf'
  answer: boolean
}
export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'short'
  accepted: string[]
  hint?: string
}
export type Question = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion

export interface Quiz {
  id: string
  materialId: string
  title: string
  description: string
  durationMin: number
  questions: Question[]
}

export type AnswerValue = number | boolean | string
export type Answers = Record<string, AnswerValue | undefined>

export interface QuizResult {
  score: number
  correct: number
  total: number
  takenAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isDemo?: boolean
}

export interface AuthUser {
  id: string
  email: string
  name: string
  givenName: string
  picture?: string
  provider: 'google' | 'guest'
}
