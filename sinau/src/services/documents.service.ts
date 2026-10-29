import type { FileType, Material } from '@/types'
import { aiService } from './ai.service'
import { config } from './config'
import { extractText } from './extract'
import { countWords, splitIntoSections } from '@/lib/text'

export const ACCEPTED_EXTENSIONS: FileType[] = ['pdf', 'docx', 'pptx', 'txt']
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',')

export type ProcessingStage = 'baca' | 'ekstraksi' | 'rangkuman'

export function getExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i + 1).toLowerCase()
}

/** Validasi tipe dan ukuran file. Mengembalikan pesan error atau null. */
export function validateFile(file: File): string | null {
  const ext = getExtension(file.name)
  if (!ACCEPTED_EXTENSIONS.includes(ext as FileType)) return `Format .${ext || '?'} tidak didukung. Gunakan PDF, DOCX, PPTX, atau TXT.`
  if (file.size === 0) return 'File kosong.'
  if (file.size > config.maxUploadMb * 1024 * 1024) return `Ukuran file melebihi ${config.maxUploadMb} MB.`
  return null
}

/** Batas teks sumber yang disimpan di localStorage. Jika terlewati, materi ditandai terpotong. */
const STORED_TEXT_LIMIT = 400000

export interface ProcessResult {
  material: Material
  /** Pesan jika sebagian proses gagal tetapi materi tetap dibuat. */
  warning?: string
}

/**
 * Memproses file sepenuhnya di browser: ekstraksi teks, lalu (jika AI terhubung) penyusunan
 * materi terstruktur. File tidak dikirim ke server mana pun oleh fungsi ini; teks yang
 * diekstrak dikirim ke provider AI hanya jika VITE_AI_PROVIDER dikonfigurasi.
 */
export async function processDocument(file: File, opts: { grade: string; onStage: (s: ProcessingStage) => void; onProgress?: (done: number, total: number) => void; signal?: AbortSignal }): Promise<ProcessResult> {
  opts.onStage('baca')
  opts.onStage('ekstraksi')
  const { text, pages, pageTexts, emptyPages } = await extractText(file)
  const textTruncated = text.length > STORED_TEXT_LIMIT

  const words = countWords(text)
  const ext = getExtension(file.name) as FileType
  const base: Material = {
    id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    source: 'upload',
    fileName: file.name,
    title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Materi tanpa judul',
    subject: 'Lainnya',
    grade: opts.grade,
    fileType: ext,
    pages: pages ?? Math.max(1, Math.ceil(words / 300)),
    readMinutes: Math.max(1, Math.ceil(words / 200)),
    updatedAt: new Date().toISOString(),
    progress: 0,
    rawText: text.slice(0, STORED_TEXT_LIMIT),
    description: `${words.toLocaleString('id-ID')} kata dari ${file.name}.`,
    summary: [],
    sections: splitIntoSections(text),
    glossary: [],
  }

  const emptyNote = emptyPages && emptyPages.length ? `${emptyPages.length} halaman tidak punya teks yang terbaca (kemungkinan gambar atau scan, OCR belum tersedia): hal. ${emptyPages.slice(0, 15).join(', ')}${emptyPages.length > 15 ? ', ...' : ''}.` : ''
  const truncNote = textTruncated ? `Teks sangat panjang; hanya ${STORED_TEXT_LIMIT.toLocaleString('id-ID')} karakter pertama yang disimpan untuk soal dan flashcard.` : ''
  if (!aiService.isLive) return { material: { ...base, coverage: { totalChunks: 0, okChunks: 0, failedRanges: [], totalPages: base.pages, textTruncated } }, warning: [emptyNote, truncNote].filter(Boolean).join(' ') || undefined }

  opts.onStage('rangkuman')
  try {
    const s = await aiService.structureMaterial(text, { pageTexts, textTruncated, onProgress: opts.onProgress, signal: opts.signal })
    return {
      material: {
        ...base,
        subject: s.subject ?? base.subject,
        description: s.description || base.description,
        summary: s.summary,
        sections: s.sections,
        glossary: s.glossary,
        coverage: s.coverage,
      },
      warning:
        [
          s.coverage.failedRanges.length ? `Bagian ${s.coverage.failedRanges.join(', ')} gagal diproses AI dan belum masuk ke materi. Coba "Susun ulang dengan AI".` : '',
          emptyNote,
          truncNote,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
    }
  } catch (err) {
    return { material: base, warning: `Materi disimpan, tetapi rangkuman AI gagal: ${err instanceof Error ? err.message : 'kesalahan tidak diketahui'}` }
  }
}
