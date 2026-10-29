import { getExtension } from './documents.service'

export interface Extracted {
  text: string
  pages?: number
  /** Teks per halaman/slide (indeks 0 = halaman 1). Halaman tanpa teks berupa string kosong. */
  pageTexts?: string[]
  /** Nomor halaman PDF yang tidak punya teks (kemungkinan gambar/scan). */
  emptyPages?: number[]
}

const MIN_TEXT = 40

export async function extractText(file: File): Promise<Extracted> {
  const ext = getExtension(file.name)
  let result: Extracted
  if (ext === 'txt') result = { text: await file.text() }
  else if (ext === 'pdf') result = await extractPdf(file)
  else if (ext === 'docx') result = await extractDocx(file)
  else if (ext === 'pptx') result = await extractPptx(file)
  else throw new Error(`Format .${ext} tidak didukung.`)

  const text = result.text.replace(/\u0000/g, '').trim()
  if (text.length < MIN_TEXT) {
    throw new Error(
      ext === 'pdf'
        ? 'PDF ini tidak berisi teks yang bisa dibaca (kemungkinan hasil scan atau gambar). OCR belum tersedia.'
        : 'File ini hampir tidak berisi teks.',
    )
  }
  return { ...result, text }
}

async function extractPdf(file: File): Promise<Extracted> {
  const pdfjs = await import('pdfjs-dist')
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const line = content.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : '')).join('')
    pages.push(line.replace(/[ \t]+/g, ' '))
  }
  const emptyPages = pages.flatMap((t, i) => (t.trim().length < 20 ? [i + 1] : []))
  return { text: pages.join('\n\n'), pages: doc.numPages, pageTexts: pages, emptyPages }
}

type MammothFn = (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>

async function extractDocx(file: File): Promise<Extracted> {
  const mod = (await import('mammoth/mammoth.browser.js')) as unknown as { extractRawText?: MammothFn; default?: { extractRawText: MammothFn } }
  const extract = mod.extractRawText ?? mod.default?.extractRawText
  if (!extract) throw new Error('Pembaca DOCX tidak tersedia.')
  const { value } = await extract({ arrayBuffer: await file.arrayBuffer() })
  return { text: value }
}

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

async function extractPptx(file: File): Promise<Extracted> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]))

  const slides: string[] = []
  for (const name of slideNames) {
    const xml = await zip.files[name].async('string')
    const lines = xml
      .split('</a:p>')
      .map((p) => [...p.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1])).join(''))
      .map((l) => l.trim())
      .filter(Boolean)
    slides.push(lines.join('\n')) // slide kosong tetap dihitung agar nomor slide sesuai
  }
  return { text: slides.join('\n\n'), pages: slideNames.length, pageTexts: slides }
}
