/** Pembagian dokumen panjang menjadi potongan tumpang-tindih dengan peta halaman. */

export interface PageText {
  page: number
  text: string
}

export interface Chunk {
  index: number
  pageStart: number
  pageEnd: number
  /** Teks potongan, dengan penanda "[Halaman N]" di awal tiap halaman. */
  text: string
}

export const CHUNK_CHARS = 12000
export const CHUNK_OVERLAP = 600
const VIRTUAL_PAGE_CHARS = 3000

/**
 * Memakai halaman asli jika ada (PDF/PPTX). Untuk DOCX/TXT dibuat halaman semu
 * per ~3000 karakter di batas paragraf, supaya rujukan bagian tetap bisa dilacak.
 */
export function toPages(text: string, pageTexts?: string[]): PageText[] {
  if (pageTexts && pageTexts.some((t) => t.trim())) return pageTexts.map((t, i) => ({ page: i + 1, text: t.trim() }))
  const paras = text.replace(/\r/g, '').split(/\n{2,}/)
  const pages: PageText[] = []
  let buf = ''
  const flush = () => {
    if (buf.trim()) pages.push({ page: pages.length + 1, text: buf.trim() })
    buf = ''
  }
  for (const p of paras) {
    if (buf && buf.length + p.length > VIRTUAL_PAGE_CHARS) flush()
    buf += (buf ? '\n\n' : '') + p
    while (buf.length > VIRTUAL_PAGE_CHARS * 1.5) {
      const cut = buf.lastIndexOf(' ', VIRTUAL_PAGE_CHARS)
      const at = cut > VIRTUAL_PAGE_CHARS / 2 ? cut : VIRTUAL_PAGE_CHARS
      pages.push({ page: pages.length + 1, text: buf.slice(0, at).trim() })
      buf = buf.slice(at)
    }
  }
  flush()
  return pages
}

/** Memecah halaman menjadi potongan <= maxChars. Tidak ada halaman yang dilewati. */
export function chunkPages(pages: PageText[], maxChars = CHUNK_CHARS, overlap = CHUNK_OVERLAP): Chunk[] {
  const chunks: Chunk[] = []
  let buf = ''
  let start = 0
  let end = 0
  let tail = ''

  const flush = () => {
    if (!buf.trim()) return
    chunks.push({ index: chunks.length, pageStart: start, pageEnd: end, text: buf })
    tail = buf.slice(-overlap)
    buf = ''
  }

  for (const p of pages) {
    let rest = p.text
    while (rest.length > 0) {
      if (!buf) {
        start = p.page
        buf = tail ? `[Lanjutan dari potongan sebelumnya] …${tail}\n\n` : ''
      }
      const header = `[Halaman ${p.page}]\n`
      const room = maxChars - buf.length - header.length
      if (room < 400 && buf.trim() && buf.length > overlap + 100) {
        flush()
        continue
      }
      const take = rest.length <= room ? rest.length : Math.max(400, rest.lastIndexOf(' ', room))
      buf += `${header}${rest.slice(0, take)}\n\n`
      end = p.page
      rest = rest.slice(take).trimStart()
      if (rest.length > 0) flush()
    }
    if (buf.length >= maxChars * 0.85) flush()
  }
  flush()
  return chunks
}

export function pageRangeLabel(a: number, b: number) {
  return a === b ? `hal. ${a}` : `hal. ${a}–${b}`
}

/** Menjalankan tugas dengan batas paralel dan satu kali percobaan ulang. */
export async function runPool<T, R>(
  items: T[],
  worker: (item: T, i: number) => Promise<R>,
  opts: { concurrency?: number; retries?: number; signal?: AbortSignal; onDone?: (done: number, total: number) => void } = {},
): Promise<({ ok: true; value: R } | { ok: false; error: string })[]> {
  const { concurrency = 2, retries = 1, signal, onDone } = opts
  const out: ({ ok: true; value: R } | { ok: false; error: string })[] = new Array(items.length)
  let next = 0
  let done = 0
  async function lane() {
    while (next < items.length) {
      const i = next++
      let lastErr = ''
      for (let attempt = 0; attempt <= retries; attempt++) {
        if (signal?.aborted) {
          out[i] = { ok: false, error: 'Dibatalkan.' }
          break
        }
        try {
          out[i] = { ok: true, value: await worker(items[i], i) }
          break
        } catch (e) {
          lastErr = e instanceof Error ? e.message : 'Kesalahan tidak diketahui'
          out[i] = { ok: false, error: lastErr }
          if (attempt < retries) await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)))
        }
      }
      onDone?.(++done, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane))
  return out
}
