import type { MaterialSection } from '@/types'

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function materialToPlainText(sections: MaterialSection[]) {
  return sections.map((s) => `${s.title}\n${s.body.join('\n')}`).join('\n\n')
}

/** Pembagian sederhana tanpa AI: kelompokkan paragraf menjadi bagian-bagian berukuran sedang. */
export function splitIntoSections(raw: string): MaterialSection[] {
  const text = raw.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  let paragraphs = text.split(/\n{2,}/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)

  // Teks PDF sering menjadi satu blok panjang: pecah per kalimat ke paragraf semu.
  if (paragraphs.length < 3 && text.length > 1500) {
    const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)
    paragraphs = []
    let buf = ''
    for (const s of sentences) {
      buf = buf ? `${buf} ${s}` : s
      if (buf.length >= 600) {
        paragraphs.push(buf)
        buf = ''
      }
    }
    if (buf) paragraphs.push(buf)
  }

  const chunks: string[][] = []
  let current: string[] = []
  let size = 0
  for (const p of paragraphs) {
    if (size > 0 && size + p.length > 1800) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(p)
    size += p.length
  }
  if (current.length) chunks.push(current)

  return chunks.slice(0, 40).map((chunk, i) => {
    const first = chunk[0]
    const looksLikeHeading = chunk.length > 1 && first.length <= 80 && !/[.!?]$/.test(first)
    return {
      id: `s${i + 1}`,
      title: looksLikeHeading ? first : `Bagian ${i + 1}`,
      body: looksLikeHeading ? chunk.slice(1) : chunk,
    }
  })
}
