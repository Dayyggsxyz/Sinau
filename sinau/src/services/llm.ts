import { config } from './config'

export interface LlmMessage {
  role: 'user' | 'assistant'
  content: string
}

export const llmConfigured = config.aiProvider !== 'mock' && (config.aiProvider === 'anthropic' || config.aiProvider === 'openai') && (!!config.aiApiKey || !!config.aiBaseUrl)

async function readError(res: Response) {
  let detail = ''
  try {
    const j = (await res.json()) as { error?: { message?: string } | string }
    detail = typeof j.error === 'string' ? j.error : (j.error?.message ?? '')
  } catch {
    /* abaikan */
  }
  const hint = res.status === 401 || res.status === 403 ? ' Periksa VITE_AI_API_KEY.' : res.status === 429 ? ' Batas pemakaian tercapai, coba lagi nanti.' : ''
  return new Error(`AI menolak permintaan (${res.status}). ${detail}${hint}`.trim())
}

/** Satu panggilan chat ke provider AI yang dikonfigurasi lewat .env. */
const TIMEOUT_MS = 120_000

/** fetch dengan batas waktu, pembatalan dari pemanggil, dan percobaan ulang untuk 429/5xx sementara. */
async function request(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController()
    const onAbort = () => ctrl.abort()
    signal?.addEventListener('abort', onAbort)
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError')
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      if ((res.status === 429 || res.status === 502 || res.status === 503 || res.status === 529) && attempt < 2) {
        const wait = Number(res.headers.get('retry-after')) * 1000 || 1500 * (attempt + 1) ** 2
        await new Promise((r) => setTimeout(r, Math.min(wait, 10_000)))
        continue
      }
      return res
    } catch (e) {
      if (signal?.aborted) throw new Error('Dibatalkan.')
      lastErr = e
      if (ctrl.signal.aborted) throw new Error('AI terlalu lama merespons (lebih dari 2 menit). Coba lagi.')
      if (attempt === 2) break
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }
  throw new Error(`Tidak bisa menghubungi layanan AI. Periksa koneksi internetmu.${lastErr instanceof Error ? ` (${lastErr.message})` : ''}`)
}

export async function chat(opts: { system: string; messages: LlmMessage[]; maxTokens?: number; signal?: AbortSignal }): Promise<string> {
  const maxTokens = opts.maxTokens ?? 1500

  if (config.aiProvider === 'anthropic') {
    const res = await request(`${config.aiBaseUrl || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.aiApiKey ? { 'x-api-key': config.aiApiKey } : {}),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: config.aiModel || 'claude-sonnet-5-5', max_tokens: maxTokens, system: opts.system, messages: opts.messages }),
    }, opts.signal)
    if (!res.ok) throw await readError(res)
    const data = (await res.json()) as { content: { type: string; text?: string }[] }
    return data.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('')
  }

  if (config.aiProvider === 'openai') {
    const res = await request(`${config.aiBaseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(config.aiApiKey ? { Authorization: `Bearer ${config.aiApiKey}` } : {}) },
      body: JSON.stringify({ model: config.aiModel || 'gpt-4o-mini', max_tokens: maxTokens, messages: [{ role: 'system', content: opts.system }, ...opts.messages] }),
    }, opts.signal)
    if (!res.ok) throw await readError(res)
    const data = (await res.json()) as { choices: { message: { content: string } }[] }
    return data.choices[0]?.message?.content ?? ''
  }

  throw new Error('Provider AI belum dikonfigurasi. Isi VITE_AI_PROVIDER dan VITE_AI_API_KEY di .env.local.')
}

/** Mengambil objek JSON dari balasan model (menoleransi pagar kode dan teks pembuka). */
export function parseJsonReply<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('Balasan AI bukan JSON yang valid. Coba lagi.')
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  } catch {
    throw new Error('Balasan AI terpotong atau tidak valid. Coba lagi atau gunakan materi yang lebih pendek.')
  }
}
