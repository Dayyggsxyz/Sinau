import { Markdown } from '@/components/ui/Markdown'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowUp, RotateCcw, Sparkles, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DemoNotice } from '@/components/ui/DemoNotice'
import { suggestedPrompts } from '@/data'
import { useLibrary } from '@/context/LibraryContext'
import { useDisplayName } from '@/hooks/useDisplayName'
import { aiService } from '@/services/ai.service'
import { useSettings } from '@/context/SettingsContext'
import { cn } from '@/lib/cn'
import type { ChatMessage } from '@/types'

const welcome = (name: string): ChatMessage => ({
  id: 'welcome',
  role: 'assistant',
  content: `Halo ${name || 'kamu'}, aku AI Tutor Sinau. Pilih materi atau langsung tanyakan konsep yang ingin kamu pahami.`,
})

const materialPrompts = [
  'Jelaskan konsep utama materi ini dengan bahasa sederhana',
  'Buat 3 pertanyaan latihan dari materi ini',
  'Bagian mana yang paling sering salah dipahami?',
]

let counter = 0
const nextId = () => `m-${Date.now()}-${counter++}`

export default function TutorPage() {
  const { settings } = useSettings()
  const name = useDisplayName()
  const { materials, getMaterial } = useLibrary()
  const [params] = useSearchParams()
  const initialMaterial = materials.some((m) => m.id === params.get('materi')) ? (params.get('materi') as string) : ''

  const [materialId, setMaterialId] = useState(initialMaterial)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcome(name)])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  async function send(text: string, base: ChatMessage[] = messages) {
    const question = text.trim()
    if (!question || loading) return
    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: question }
    const history = [...base, userMsg]
    setMessages(history)
    setInput('')
    setFailed(null)
    setLoading(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await aiService.askTutor({ question, material: getMaterial(materialId || undefined), history, style: settings.tutorStyle, signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', content: res.answer, isDemo: res.isDemo }])
    } catch (err) {
      if (ctrl.signal.aborted) return
      const reason = err instanceof Error ? err.message : 'Terjadi kesalahan.'
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', content: `Maaf, pertanyaanmu belum bisa diproses. ${reason}` }])
      setFailed(question)
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  function stop() {
    abortRef.current?.abort()
    setLoading(false)
    setMessages((m) => [...m, { id: nextId(), role: 'assistant', content: 'Jawaban dihentikan.' }])
    setFailed(messages.filter((x) => x.role === 'user').at(-1)?.content ?? null)
  }

  function retry() {
    if (!failed) return
    // Buang pesan error terakhir dan pertanyaan yang gagal, lalu kirim ulang.
    void send(failed, messages.slice(0, -2))
  }

  const showSuggestions = messages.length === 1
  const prompts = materialId && aiService.isLive ? materialPrompts : suggestedPrompts

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">AI Tutor</h1>
          <p className="mt-1 text-muted">Tanya konsep, minta contoh, atau uji pemahamanmu.</p>
        </div>
        <div className="flex items-center gap-2">
          <label>
            <span className="sr-only">Konteks materi</span>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="h-10 max-w-56 rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none">
              <option value="">Semua materi</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </label>
          <Button variant="ghost" size="sm" onClick={() => setMessages([welcome(name)])} disabled={messages.length === 1 || loading}>
            <RotateCcw className="size-4" aria-hidden />
            Percakapan baru
          </Button>
        </div>
      </div>

      {aiService.isLive ? (
        <p className="mb-4 text-sm text-muted">Jawaban dibuat oleh AI dan bisa keliru. Periksa kembali dengan materimu, terutama untuk angka dan istilah.</p>
      ) : (
        <DemoNotice className="mb-4">
          AI belum terhubung (isi VITE_AI_PROVIDER dan VITE_AI_API_KEY di .env.local). Sementara ini jawabannya teks contoh yang dicocokkan dari kata kunci, jadi jangan dipakai sebagai sumber belajar yang pasti.
        </DemoNotice>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" role="log" aria-live="polite" aria-label="Percakapan dengan AI Tutor">
          {messages.map((m) => (
            <div key={m.id} className={cn('flex gap-3', m.role === 'user' && 'justify-end')}>
              {m.role === 'assistant' && (
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
                  <Sparkles className="size-4" />
                </span>
              )}
              <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 shadow-xs sm:max-w-[75%]', m.role === 'user' ? 'rounded-br-md bg-brand text-brand-ink' : 'rounded-bl-md bg-surface-2')}>
                {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : <p className="whitespace-pre-line leading-relaxed">{m.content}</p>}
                {m.isDemo && <p className="mt-2 text-xs text-muted">Jawaban contoh, bukan hasil AI</p>}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3" aria-label="AI Tutor sedang mengetik">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
                <Sparkles className="size-4" />
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-surface-2 px-4 py-4" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="dot-blink size-2 rounded-full bg-muted" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          {failed && !loading && (
            <div className="flex justify-center">
              <Button size="sm" onClick={retry}><RotateCcw className="size-4" aria-hidden />Coba lagi</Button>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line p-3 sm:p-4">
          {showSuggestions && (
            <div className="mb-3 flex flex-wrap gap-2">
              {prompts.map((p) => (
                <button key={p} type="button" onClick={() => send(p)} className="rounded-full border border-line px-3 py-1.5 text-left text-sm text-muted transition-colors hover:border-brand hover:text-ink">
                  {p}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="sr-only">Pertanyaanmu</span>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(input)
                  }
                }}
                rows={1}
                placeholder="Tulis pertanyaan. Enter untuk kirim, Shift+Enter untuk baris baru"
                className="max-h-36 min-h-11 w-full resize-none rounded-xl border border-line bg-bg px-4 py-2.5 placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </label>
            {loading ? (
              <button type="button" onClick={stop} aria-label="Hentikan jawaban" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink transition-colors hover:bg-line-strong">
                <Square className="size-4 fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => send(input)}
                disabled={!input.trim()}
                aria-label="Kirim pertanyaan"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink transition-colors hover:bg-brand-strong disabled:opacity-40"
              >
                <ArrowUp className="size-5" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
