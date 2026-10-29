import type { ChatMessage, Coverage, NotesMode, Flashcard, GlossaryTerm, Material, MaterialSection, Question, Subject } from '@/types'
import { SUBJECTS } from '@/types'
import { tutorTopics, tutorFallback } from '@/data/tutor'
import { materialToPlainText } from '@/lib/text'
import { chat, llmConfigured, parseJsonReply } from './llm'
import { chunkPages, pageRangeLabel, runPool, toPages, type Chunk } from '@/lib/chunking'
import { config } from './config'

export interface TutorRequest {
  question: string
  material?: Material
  history: ChatMessage[]
  style: 'ringkas' | 'rinci' | 'bertahap'
  signal?: AbortSignal
}
export interface TutorResponse {
  answer: string
  /** true = jawaban contoh dari data lokal, bukan model AI */
  isDemo: boolean
}
export interface StructuredMaterial {
  subject?: Subject
  description: string
  summary: string[]
  sections: MaterialSection[]
  glossary: GlossaryTerm[]
  coverage: Coverage
}

export type QuizDifficulty = 'mudah' | 'sedang' | 'sulit' | 'campuran'
export interface GenerateOptions {
  signal?: AbortSignal
  /** Pesan peringatan non-fatal, mis. jumlah soal kurang dari permintaan. */
  onWarn?: (message: string) => void
  onProgress?: (done: number, total: number) => void
}
export interface QuizOptions extends GenerateOptions {
  difficulty?: QuizDifficulty
}
export interface StructureOptions extends GenerateOptions {
  /** Teks per halaman/slide dari ekstraksi, jika ada. */
  pageTexts?: string[]
  textTruncated?: boolean
}

export interface NotesResult {
  markdown: string
  failedTitles: string[]
}

export const NOTES_MODES: { value: NotesMode; label: string; hint: string }[] = [
  { value: 'ringkas', label: 'Ringkasan cepat', hint: 'Poin inti tiap bagian, singkat.' },
  { value: 'lengkap', label: 'Catatan lengkap', hint: 'Penjelasan runtut dengan definisi, contoh, dan rumus.' },
  { value: 'bab', label: 'Penjelasan per bab', hint: 'Uraian langkah demi langkah dengan cek pemahaman.' },
  { value: 'ujian', label: 'Persiapan ujian', hint: 'Yang sering diuji, yang harus dihafal, kesalahan umum.' },
  { value: 'konsep', label: 'Konsep & definisi', hint: 'Daftar istilah kunci beserta artinya.' },
  { value: 'rumus', label: 'Rumus & contoh', hint: 'Kumpulan rumus, arti variabel, dan contoh soal.' },
]

const NOTES_PROMPT: Record<NotesMode, string> = {
  ringkas: 'Buat RINGKASAN CEPAT: untuk setiap bagian tulis 3-6 poin (1-2 kalimat per poin) yang memuat inti, definisi terpenting, dan rumus bila ada.',
  lengkap: 'Buat CATATAN BELAJAR LENGKAP: penjelasan runtut dengan subjudul, semua definisi, rumus, contoh, dan pengecualian. Jelaskan istilah sebelum dipakai dan jelaskan MENGAPA.',
  bab: 'Buat PENJELASAN RINCI PER BAB: gambaran umum bagian, uraian konsep langkah demi langkah, contoh sehari-hari, hubungan dengan konsep lain, lalu "Cek pemahaman" berisi 2 pertanyaan singkat (jawabannya jangan ditulis).',
  ujian: 'Buat CATATAN PERSIAPAN UJIAN: poin yang sering diuji, definisi yang wajib hafal, rumus, kesalahan umum siswa, dan tip mengingat. Pakai daftar dan tabel Markdown bila membantu.',
  konsep: 'Buat DAFTAR KONSEP KUNCI: tiap istilah ditulis **tebal** diikuti definisi sederhana dan satu contoh singkat.',
  rumus: 'Buat KOLEKSI RUMUS & CONTOH: tiap rumus ditulis di antara tanda $ (mis. $v = s / t$), jelaskan arti setiap variabel dan satuannya, lalu beri contoh soal dengan langkah penyelesaian yang bersumber dari teks. Jika bagian tidak memuat rumus, tulis "Tidak ada rumus di bagian ini."',
}

export interface AiService {
  /** true jika provider AI sudah dikonfigurasi lewat .env */
  readonly isLive: boolean
  askTutor(req: TutorRequest): Promise<TutorResponse>
  structureMaterial(text: string, opts?: StructureOptions): Promise<StructuredMaterial>
  generateFlashcards(material: Material, count?: number, opts?: GenerateOptions): Promise<Flashcard[]>
  generateQuiz(material: Material, count?: number, opts?: QuizOptions): Promise<Question[]>
  generateNotes(material: Material, mode: NotesMode, sectionIds: string[], opts?: GenerateOptions): Promise<NotesResult>
}

const SOURCE_LIMIT = 24000
const SYSTEM_JSON = 'Kamu adalah asisten pembuat bahan belajar untuk pelajar Indonesia. Balas HANYA dengan satu objek JSON valid, tanpa teks lain dan tanpa pagar kode. Gunakan bahasa Indonesia. Jangan menambahkan fakta yang tidak ada di teks sumber.'

export function materialContext(m: Material): string {
  const text = m.rawText ?? materialToPlainText(m.sections)
  return text.slice(0, SOURCE_LIMIT)
}

const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2)
/** Kemiripan Jaccard antar dua teks (0-1), untuk membuang soal/kartu kembar. */
function similarity(a: string, b: string) {
  const A = new Set(norm(a))
  const B = new Set(norm(b))
  if (A.size === 0 || B.size === 0) return 0
  let hit = 0
  A.forEach((w) => B.has(w) && hit++)
  return hit / (A.size + B.size - hit)
}
const shuffled = <T,>(a: T[]) => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/**
 * Konteks tutor untuk materi panjang: daftar semua bagian + bagian yang paling relevan
 * dengan pertanyaan (skor kata kunci), bukan hanya 24 ribu karakter pertama.
 */
function retrieveContext(m: Material, question: string, budget = 14000): string {
  const total = m.sections.reduce((n, s) => n + s.body.join(' ').length, 0)
  if (total <= budget) return materialContext(m)
  const words = new Set(norm(question))
  const scored = m.sections
    .map((s, i) => {
      const text = `${s.title} ${s.body.join(' ')} ${(s.keyPoints ?? []).join(' ')}`
      const hits = norm(text).filter((w) => words.has(w)).length
      return { s, i, score: hits / Math.sqrt(text.length + 1) + (norm(s.title).some((w) => words.has(w)) ? 0.05 : 0) }
    })
    .sort((a, b) => b.score - a.score)
  const picked: typeof scored = []
  let used = 0
  for (const x of scored) {
    const len = x.s.body.join('\n').length
    if (used + len > budget && picked.length > 0) continue
    picked.push(x)
    used += len
    if (used >= budget) break
  }
  picked.sort((a, b) => a.i - b.i)
  const outline = m.sections.map((s, i) => `${i + 1}. ${s.title}`).join('\n')
  return `Daftar seluruh bagian materi:\n${outline}\n\nBagian yang paling relevan:\n${picked.map(({ s }) => `## ${s.title}\n${s.body.join('\n')}`).join('\n\n')}`
}

const sourceChunks = (m: Material): Chunk[] => chunkPages(toPages(m.rawText ?? materialToPlainText(m.sections)), 9000, 400)

/**
 * Menghasilkan `count` item dengan menyebar permintaan ke seluruh potongan materi,
 * membuang duplikat, mengulang yang gagal, dan memilih bergiliran antar potongan agar
 * semua bagian terwakili. Mengembalikan kurang dari `count` hanya jika materi tidak cukup.
 */
async function spreadAcrossChunks<T>(
  m: Material,
  count: number,
  fetchBatch: (context: string, n: number, avoid: string[]) => Promise<T[]>,
  keyOf: (t: T) => string,
  opts: GenerateOptions,
  dupThreshold = 0.6,
): Promise<T[]> {
  const chunks = sourceChunks(m)
  if (chunks.length === 0) throw new Error('Materi tidak punya teks sumber untuk dibuatkan soal.')
  const groups: T[][] = chunks.map(() => [])
  const all: string[] = []
  const failures: string[] = []
  const tryAdd = (ci: number, item: T) => {
    const k = keyOf(item)
    if (all.some((x) => similarity(x, k) >= dupThreshold)) return
    all.push(k)
    groups[ci].push(item)
  }
  const total = () => groups.reduce((n, g) => n + g.length, 0)

  // Putaran 1: tiap potongan (atau potongan yang dipilih merata jika potongan > jumlah) dapat jatah.
  const order = chunks.length > count ? Array.from({ length: count }, (_, i) => Math.floor((i * chunks.length) / count)) : chunks.map((_, i) => i)
  const perChunk = Math.max(1, Math.ceil(count / order.length))
  let done = 0
  const jobsTotal = order.length + 2
  for (const ci of order) {
    if (opts.signal?.aborted) throw new Error('Dibatalkan.')
    const ask = Math.min(12, perChunk + 1)
    const res = await runPool([ci], () => fetchBatch(chunks[ci].text, ask, all.slice(-40)), { concurrency: 1, retries: 1, signal: opts.signal })
    if (res[0].ok) res[0].value.forEach((it) => tryAdd(ci, it))
    else failures.push(pageRangeLabel(chunks[ci].pageStart, chunks[ci].pageEnd))
    opts.onProgress?.(++done, jobsTotal)
  }

  // Putaran top-up: ambil dari potongan yang paling sedikit terwakili.
  for (let round = 0; round < 2 && total() < count; round++) {
    if (opts.signal?.aborted) throw new Error('Dibatalkan.')
    const ci = groups.map((g, i) => ({ i, n: g.length })).sort((a, b) => a.n - b.n)[0].i
    const res = await runPool([ci], () => fetchBatch(chunks[ci].text, Math.min(12, count - total() + 2), all.slice(-40)), { concurrency: 1, retries: 1, signal: opts.signal })
    if (res[0].ok) res[0].value.forEach((it) => tryAdd(ci, it))
    opts.onProgress?.(++done, jobsTotal)
  }

  // Pilih bergiliran antar potongan agar sebaran bagian merata.
  const picked: T[] = []
  for (let r = 0; picked.length < count && groups.some((g) => g.length > r); r++) {
    for (const g of groups) if (g[r] !== undefined && picked.length < count) picked.push(g[r])
  }
  if (picked.length < count) {
    opts.onWarn?.(`Hanya ${picked.length} dari ${count} yang diminta berhasil dibuat dan lolos validasi. Materi mungkin tidak cukup, atau sebagian bagian gagal diproses${failures.length ? ` (${failures.join(', ')})` : ''}.`)
  } else if (failures.length) {
    opts.onWarn?.(`Jumlah terpenuhi, tetapi bagian ${failures.join(', ')} gagal diproses sehingga tidak terwakili.`)
  }
  return picked
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const strArr = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])

const styleHint = {
  ringkas: 'Jawab singkat dan langsung ke inti.',
  rinci: 'Jawab rinci dengan penjelasan dan contoh.',
  bertahap: 'Jelaskan langkah demi langkah dengan bahasa sederhana, lalu ajukan satu pertanyaan singkat untuk menguji pemahaman.',
}

const liveAi: AiService = {
  isLive: true,

  async askTutor({ question, material, history, style, signal }) {
    const ctx = material ? `\n\nMateri yang sedang dipelajari ("${material.title}"):\n"""\n${retrieveContext(material, question)}\n"""\nUtamakan isi materi ini. Jika jawabannya tidak ada di materi, katakan itu dengan jelas sebelum menjawab dari pengetahuan umum.` : ''
    const system = `Kamu adalah AI Tutor di aplikasi Sinau untuk pelajar Indonesia. Jawab dalam bahasa Indonesia yang jelas dan ramah. ${styleHint[style]} Jika tidak yakin, akui ketidakpastianmu. Jangan mengarang fakta.\n\nFormat: gunakan Markdown (judul ###, **tebal**, daftar, tabel Markdown untuk perbandingan). Untuk proses atau alur, tulis blok kode berlabel diagram berisi satu langkah per baris dengan pola "A -> B -> C" (maksimal 8 simpul per baris). Rumus ditulis di antara tanda $ seperti $v = s / t$. Jangan menulis HTML.${ctx}`
    const turns = history.filter((m) => m.id !== 'welcome').slice(-12).map((m) => ({ role: m.role, content: m.content }))
    while (turns.length > 0 && turns[0].role !== 'user') turns.shift() // API mensyaratkan pesan pertama dari user
    if (turns.length === 0 || turns[turns.length - 1].role !== 'user') turns.push({ role: 'user', content: question })
    const answer = await chat({ system, messages: turns, maxTokens: 2000, signal })
    return { answer: answer.trim() || 'AI tidak mengembalikan jawaban. Coba ulangi pertanyaannya.', isDemo: false }
  },

  async structureMaterial(text, opts = {}) {
    const pages = toPages(text, opts.pageTexts)
    const chunks = chunkPages(pages)
    if (chunks.length === 0) throw new Error('Tidak ada teks yang bisa diproses.')
    const totalPages = pages.length

    const results = await runPool(
      chunks,
      async (c) => {
        const prompt = `Ini potongan ${c.index + 1} dari ${chunks.length} sebuah dokumen belajar (${pageRangeLabel(c.pageStart, c.pageEnd)}). Tulis ulang menjadi bahan belajar LENGKAP untuk siswa SMP/SMA Indonesia.\n\nFormat JSON:\n{"sections": [{"title": "...", "pageStart": 1, "pageEnd": 2, "body": ["paragraf penjelasan", "..."], "keyPoints": ["poin penting"]}], "glossary": [{"term": "...", "definition": "..."}]}\n\nAturan:\n- Satu potongan boleh menjadi beberapa bagian; ikuti judul/bab asli dokumen jika ada.\n- Jelaskan dengan bahasa Indonesia sederhana. Jelaskan istilah sebelum dipakai dan jelaskan MENGAPA, bukan hanya APA.\n- Pertahankan semua definisi, rumus (tulis dengan jelas, mis. v = s / t), contoh, dan pengecualian dari teks. Jangan meringkas berlebihan dan jangan melewatkan bagian.\n- Boleh memakai Markdown di dalam paragraf (**tebal**, daftar, tabel) bila membantu.\n- Bedakan isi sumber dari penjelasan tambahanmu dengan awalan "Penjelasan tambahan:".\n- Abaikan baris yang diawali "[Lanjutan dari potongan sebelumnya]", itu hanya konteks tumpang-tindih.\n- pageStart/pageEnd diambil dari penanda [Halaman N].\n- Jangan mengarang isi yang tidak ada di teks. Jika teks terlihat rusak/tidak terbaca, katakan itu pada bagian terkait.\n\nTeks:\n"""\n${c.text}\n"""`
        const raw = parseJsonReply<Record<string, unknown>>(await chat({ system: SYSTEM_JSON, messages: [{ role: 'user', content: prompt }], maxTokens: 6000, signal: opts.signal }))
        const secs = (Array.isArray(raw.sections) ? raw.sections : [])
          .map((s) => {
            const o = s as Record<string, unknown>
            return { title: str(o.title), body: strArr(o.body), keyPoints: strArr(o.keyPoints), pageStart: Number(o.pageStart) || c.pageStart, pageEnd: Number(o.pageEnd) || c.pageEnd }
          })
          .filter((s) => s.body.length > 0)
        if (secs.length === 0) throw new Error('Potongan tidak menghasilkan bagian.')
        const gloss = (Array.isArray(raw.glossary) ? raw.glossary : []).map((g) => ({ term: str((g as Record<string, unknown>).term), definition: str((g as Record<string, unknown>).definition) })).filter((g) => g.term && g.definition)
        return { secs, gloss }
      },
      { concurrency: 2, retries: 1, signal: opts.signal, onDone: opts.onProgress },
    )

    const sections: MaterialSection[] = []
    const glossary: GlossaryTerm[] = []
    const seenPara = new Set<string>()
    const seenTerm = new Set<string>()
    const failedRanges: string[] = []
    let ok = 0
    results.forEach((r, i) => {
      if (!r.ok) {
        failedRanges.push(pageRangeLabel(chunks[i].pageStart, chunks[i].pageEnd))
        return
      }
      ok++
      r.value.secs.forEach((s) => {
        const body = s.body.filter((p) => {
          const k = p.toLowerCase().replace(/\s+/g, ' ').slice(0, 90)
          if (seenPara.has(k)) return false
          seenPara.add(k)
          return true
        })
        if (body.length === 0) return
        sections.push({ id: `s${sections.length + 1}`, title: s.title || `Bagian ${sections.length + 1}`, body, ...(s.keyPoints.length ? { keyPoints: s.keyPoints } : {}), pageStart: s.pageStart, pageEnd: s.pageEnd })
      })
      r.value.gloss.forEach((g) => {
        const k = g.term.toLowerCase()
        if (!seenTerm.has(k)) {
          seenTerm.add(k)
          glossary.push(g)
        }
      })
    })
    if (sections.length === 0) {
      const firstErr = results.find((r) => !r.ok)
      throw new Error(`AI gagal memproses semua bagian dokumen${firstErr && !firstErr.ok ? `: ${firstErr.error}` : ''}. Coba lagi.`)
    }

    const coverage: Coverage = { totalChunks: chunks.length, okChunks: ok, failedRanges, totalPages, ...(opts.textTruncated ? { textTruncated: true } : {}) }

    // Rangkuman gabungan dari semua bagian yang berhasil (bukan dari 24 ribu karakter pertama).
    let subject: Subject | undefined
    let description = ''
    let summary: string[] = []
    try {
      const digest = sections.map((s) => `## ${s.title}\n${(s.keyPoints?.length ? s.keyPoints : s.body.slice(0, 1)).join('\n')}`).join('\n\n').slice(0, 16000)
      const prompt = `Dari ringkasan per bagian berikut, buat gambaran seluruh dokumen.\nFormat JSON: {"subject": salah satu dari ${JSON.stringify(SUBJECTS)}, "description": "1-2 kalimat", "summary": ["6-12 poin rangkuman yang mencakup SEMUA bagian penting, berurutan sesuai dokumen"]}\n\n${digest}`
      const raw = parseJsonReply<Record<string, unknown>>(await chat({ system: SYSTEM_JSON, messages: [{ role: 'user', content: prompt }], maxTokens: 2000, signal: opts.signal }))
      subject = SUBJECTS.find((x) => x === raw.subject)
      description = str(raw.description)
      summary = strArr(raw.summary)
    } catch {
      summary = sections.flatMap((s) => (s.keyPoints?.[0] ? [s.keyPoints[0]] : [])).slice(0, 12)
    }
    return { subject, description, summary, sections, glossary, coverage }
  },

  async generateNotes(material, mode, sectionIds, opts = {}) {
    const chosen = material.sections.filter((s) => sectionIds.includes(s.id))
    if (chosen.length === 0) throw new Error('Pilih minimal satu bagian materi.')
    // Kelompokkan bagian utuh ke dalam batch <= ~9000 karakter agar tiap permintaan muat.
    const batches: MaterialSection[][] = []
    let cur: MaterialSection[] = []
    let size = 0
    for (const sec of chosen) {
      const len = sec.body.join('\n').length
      if (cur.length && size + len > 9000) {
        batches.push(cur)
        cur = []
        size = 0
      }
      cur.push(sec)
      size += len
    }
    if (cur.length) batches.push(cur)

    const results = await runPool(
      batches,
      async (batch) => {
        const src = batch.map((s) => `## ${s.title}${s.pageStart !== undefined ? ` (hal. ${s.pageStart}${s.pageEnd && s.pageEnd !== s.pageStart ? `-${s.pageEnd}` : ''})` : ''}\n${s.body.join('\n')}`).join('\n\n')
        const prompt = `${NOTES_PROMPT[mode]}\n\nUntuk siswa SMP/SMA Indonesia, bahasa Indonesia sederhana dan natural. Pertahankan makna sumber; bedakan isi sumber dari penjelasan tambahanmu dengan awalan "Penjelasan tambahan:". Jangan mengarang. Pakai Markdown, dan setiap bagian diawali judul "## <judul bagian>" persis seperti di sumber. Boleh pakai tabel Markdown, dan untuk proses/alur tulis blok kode berlabel diagram dengan pola "A -> B -> C". Jangan menulis HTML.\n\nSumber:\n"""\n${src}\n"""`
        const out = await chat({ system: 'Kamu penulis bahan ajar yang teliti untuk pelajar Indonesia.', messages: [{ role: 'user', content: prompt }], maxTokens: 6000, signal: opts.signal })
        if (!out.trim()) throw new Error('Balasan kosong.')
        return out.trim()
      },
      { concurrency: 2, retries: 1, signal: opts.signal, onDone: opts.onProgress },
    )
    const failedTitles: string[] = []
    const parts: string[] = []
    results.forEach((r, i) => {
      if (r.ok) parts.push(r.value)
      else failedTitles.push(...batches[i].map((s) => s.title))
    })
    if (parts.length === 0) throw new Error('AI gagal membuat catatan. Coba lagi.')
    return { markdown: parts.join('\n\n'), failedTitles }
  },

  async generateFlashcards(material, count = 15, opts = {}) {
    const raw = await spreadAcrossChunks(
      material,
      count,
      async (ctx, n, avoid) => {
        const prompt = `Buat ${n} flashcard dari potongan materi berikut. Setiap kartu menguji satu konsep: "front" berupa pertanyaan atau istilah, "back" berupa jawaban akurat dan jelas (maksimal 3 kalimat; rumus dan contoh boleh disertakan). Boleh memakai Markdown ringan (**tebal**, daftar).\nJangan mengulang kartu yang mirip dengan ini:\n${avoid.map((a) => `- ${a.slice(0, 90)}`).join('\n') || '(belum ada)'}\nFormat JSON: {"cards": [{"front": "...", "back": "..."}]}\n\nMateri "${material.title}":\n"""\n${ctx}\n"""`
        const r = parseJsonReply<{ cards?: { front?: unknown; back?: unknown }[] }>(await chat({ system: SYSTEM_JSON, messages: [{ role: 'user', content: prompt }], maxTokens: 3500, signal: opts.signal }))
        return (r.cards ?? []).map((c) => ({ front: str(c.front), back: str(c.back) })).filter((c) => c.front && c.back)
      },
      (c) => c.front,
      opts,
    )
    const stamp = Date.now().toString(36)
    if (raw.length === 0) throw new Error('AI tidak menghasilkan flashcard. Coba lagi.')
    return raw.map((c, i) => ({ id: `${material.id}-fc-${stamp}-${i}`, materialId: material.id, front: c.front, back: c.back }))
  },

  async generateQuiz(material, count = 10, opts = {}) {
    const level = opts.difficulty ?? 'campuran'
    const raw = await spreadAcrossChunks<Question>(
      material,
      count,
      async (ctx, n, avoid) => {
        const prompt = `Buat ${n} soal latihan dari potongan materi berikut. Tingkat kesulitan: ${level}. Variasikan jenis soal (sekitar 60% pilihan ganda, 20% benar/salah, 20% isian singkat) dan variasikan kemampuan yang diuji (ingatan, pemahaman, penerapan, penalaran).\nFormat JSON:\n{"questions": [\n {"type": "mcq", "prompt": "...", "options": ["...", "...", "...", "..."], "answer": 0, "explanation": "..."},\n {"type": "tf", "prompt": "pernyataan", "answer": true, "explanation": "..."},\n {"type": "short", "prompt": "kalimat dengan bagian yang dikosongkan atau pertanyaan singkat", "accepted": ["jawaban", "variasi lain"], "explanation": "..."}\n]}\nAturan: mcq punya tepat 4 opsi berbeda, hanya satu benar, pengecoh masuk akal; "answer" = indeks 0-3; jawaban "short" maksimal 3 kata; setiap soal harus bisa dijawab dari potongan materi ini saja; penjelasan menjelaskan MENGAPA jawabannya benar; jangan menanyakan fakta yang sama dua kali.\nJangan membuat soal yang mirip dengan ini:\n${avoid.map((a) => `- ${a.slice(0, 100)}`).join('\n') || '(belum ada)'}\n\nMateri "${material.title}":\n"""\n${ctx}\n"""`
        const r = parseJsonReply<{ questions?: Record<string, unknown>[] }>(await chat({ system: SYSTEM_JSON, messages: [{ role: 'user', content: prompt }], maxTokens: 6000, signal: opts.signal }))
        const out: Question[] = []
        ;(r.questions ?? []).forEach((q) => {
          const base = { id: '', prompt: str(q.prompt), explanation: str(q.explanation) }
          if (!base.prompt || !base.explanation) return
          if (q.type === 'mcq') {
            const options = strArr(q.options)
            const answer = Number(q.answer)
            if (options.length !== 4 || new Set(options.map((o) => o.toLowerCase())).size !== 4 || !Number.isInteger(answer) || answer < 0 || answer > 3) return
            const order = shuffled([0, 1, 2, 3])
            out.push({ ...base, type: 'mcq', options: order.map((i) => options[i]), answer: order.indexOf(answer) })
          } else if (q.type === 'tf' && typeof q.answer === 'boolean') out.push({ ...base, type: 'tf', answer: q.answer })
          else if (q.type === 'short') {
            const accepted = strArr(q.accepted)
            if (accepted.length) out.push({ ...base, type: 'short', accepted })
          }
        })
        return out
      },
      (q) => q.prompt,
      opts,
    )
    if (raw.length < 3) throw new Error('AI menghasilkan terlalu sedikit soal yang valid. Coba lagi.')
    const stamp = Date.now().toString(36)
    return raw.map((q, i) => ({ ...q, id: `${material.id}-q-${stamp}-${i}` }))
  },
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
const notLive = () => new Error('AI belum terhubung. Isi VITE_AI_PROVIDER dan VITE_AI_API_KEY di .env.local, lalu restart server.')

/** Dipakai saat AI belum dikonfigurasi: hanya AI Tutor contoh berbasis kata kunci. */
const mockAi: AiService = {
  isLive: false,
  async askTutor({ question, material }) {
    await delay(500)
    const q = question.toLowerCase()
    const hit = tutorTopics.find((t) => t.keywords.some((k) => q.includes(k)))
    if (hit) return { answer: hit.answer, isDemo: true }
    if (material && material.summary.length) {
      return { answer: `Aku belum bisa menjawab pertanyaan itu secara spesifik karena AI belum terhubung. Ini rangkuman materi "${material.title}":\n${material.summary.map((s) => `- ${s}`).join('\n')}`, isDemo: true }
    }
    return { answer: tutorFallback, isDemo: true }
  },
  async structureMaterial() { throw notLive() },
  async generateFlashcards() { throw notLive() },
  async generateQuiz() { throw notLive() },
  async generateNotes() { throw notLive() },
}

if (!llmConfigured && config.aiProvider !== 'mock') {
  console.warn(`[Sinau] VITE_AI_PROVIDER="${config.aiProvider}" belum lengkap (cek nama provider dan API key). Memakai mode contoh.`)
}

export const aiService: AiService = llmConfigured ? liveAi : mockAi
