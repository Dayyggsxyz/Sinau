import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { parseFlow } from '@/lib/diagram'
import { latexToHtmlParts } from '@/lib/formula'

/**
 * Renderer Markdown aman tanpa dependensi: menghasilkan elemen React (bukan innerHTML),
 * jadi HTML/skrip dari AI tidak pernah dieksekusi. Link hanya http(s) dan mailto.
 * Mendukung judul, tebal/miring, daftar bertingkat, tabel, kutipan, kode, garis pemisah.
 * Rumus ($...$) tampil sebagai teks monospasi; diagram ```mermaid tampil sebagai kode.
 */

const SAFE_URL = /^(https?:\/\/|mailto:)/i

function inline(text: string, keyPrefix = 'i'): ReactNode[] {
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(\*[^*\s][^*\n]*\*|(?<![\p{L}\p{N}])_[^_\s][^_\n]*_(?![\p{L}\p{N}]))|(\[[^\]\n]+\]\([^)\s]+\))|(\$[^$\n]+\$)/gu
  const out: ReactNode[] = []
  let last = 0
  let n = 0
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    const tok = m[0]
    const key = `${keyPrefix}-${n++}`
    if (m[1]) out.push(<code key={key} className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.9em]">{tok.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={key} className="font-semibold">{inline(tok.slice(2, -2), key)}</strong>)
    else if (m[3]) out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>)
    else if (m[4]) {
      const [, label, url] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok) ?? []
      out.push(SAFE_URL.test(url ?? '') ? <a key={key} href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-brand underline underline-offset-2">{label}</a> : label)
    } else if (m[5]) out.push(<Formula key={key} src={tok.slice(1, -1)} />)
    last = at + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

interface ListItem {
  indent: number
  ordered: boolean
  text: string
}
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/

function buildList(items: ListItem[], start: number, key: string): [ReactNode, number] {
  const base = items[start].indent
  const ordered = items[start].ordered
  const lis: ReactNode[] = []
  let i = start
  while (i < items.length && items[i].indent >= base) {
    if (items[i].indent > base) break
    const item = items[i]
    i++
    let nested: ReactNode = null
    if (i < items.length && items[i].indent > base) {
      const [node, next] = buildList(items, i, `${key}-${i}`)
      nested = node
      i = next
    }
    lis.push(
      <li key={`${key}-li-${i}`} className="pl-1">
        {inline(item.text, `${key}-${i}`)}
        {nested}
      </li>,
    )
  }
  const Tag = ordered ? 'ol' : 'ul'
  return [<Tag key={key} className={cn('my-2 space-y-1 pl-6', ordered ? 'list-decimal' : 'list-disc')}>{lis}</Tag>, i]
}

const splitRow = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
const isDivider = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)

export function renderMarkdown(src: string): ReactNode[] {
  const lines = src.replace(/\r/g, '').split('\n')
  const out: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const fence = /^\s*```(\w+)?\s*$/.exec(line)
    if (fence) {
      const code: string[] = []
      i++
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++])
      i++
      if (fence[1] === 'diagram' || fence[1] === 'mermaid') {
        const flows = parseFlow(code.join('\n'))
        if (flows) {
          out.push(<Flow key={k++} rows={flows} />)
          continue
        }
      }
      if (fence[1] === 'math' || fence[1] === 'latex') {
        out.push(<div key={k++} className="my-3 overflow-x-auto text-center text-lg"><Formula src={code.join(' ')} /></div>)
        continue
      }
      out.push(
        <pre key={k++} className="my-3 overflow-x-auto rounded-xl border border-line bg-surface-2 p-3.5 text-sm leading-relaxed">
          {(fence[1] === 'mermaid' || fence[1] === 'diagram') && <span className="mb-1 block text-xs font-sans text-muted">Diagram tidak bisa digambar; ditampilkan sebagai teks</span>}
          <code className="font-mono">{code.join('\n')}</code>
        </pre>,
      )
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const cls = ['mt-5 mb-2 text-xl font-bold', 'mt-5 mb-2 text-lg font-bold', 'mt-4 mb-1.5 text-base font-semibold', 'mt-3 mb-1 text-base font-semibold'][level - 1]
      const Tag = (['h2', 'h3', 'h4', 'h5'] as const)[level - 1]
      out.push(<Tag key={k++} className={cls}>{inline(h[2], `h${k}`)}</Tag>)
      i++
      continue
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
      out.push(<hr key={k++} className="my-4 border-line" />)
      i++
      continue
    }
    if (line.includes('|') && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const head = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(splitRow(lines[i++]))
      out.push(
        <div key={k++} className="my-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-2">
              <tr>{head.map((c, ci) => <th key={ci} className="border-b border-line px-3 py-2 font-semibold">{inline(c, `th${ci}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-line last:border-0">
                  {head.map((_, ci) => <td key={ci} className="px-3 py-2 align-top">{inline(r[ci] ?? '', `td${ri}-${ci}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^\s*>/.test(line)) {
      const q: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ''))
      out.push(<blockquote key={k++} className="my-3 border-l-4 border-line-strong pl-4 text-muted">{renderMarkdown(q.join('\n'))}</blockquote>)
      continue
    }
    if (LIST_RE.test(line)) {
      const items: ListItem[] = []
      while (i < lines.length && LIST_RE.test(lines[i])) {
        const m = LIST_RE.exec(lines[i])!
        items.push({ indent: m[1].replace(/\t/g, '    ').length, ordered: /\d/.test(m[2]), text: m[3] })
        i++
      }
      let at = 0
      while (at < items.length) {
        const [node, next] = buildList(items, at, `l${k++}`)
        out.push(node)
        at = next > at ? next : at + 1
      }
      continue
    }
    const para: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^(\s*```|#{1,4}\s|\s*>|\s*([-*+]|\d+[.)])\s)/.test(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && isDivider(lines[i + 1]))) para.push(lines[i++])
    out.push(
      <p key={k++} className="my-2 leading-relaxed">
        {para.map((p, pi) => (
          <Fragment key={pi}>
            {pi > 0 && <br />}
            {inline(p.trim(), `p${k}-${pi}`)}
          </Fragment>
        ))}
      </p>,
    )
  }
  return out
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  return <div className={cn('min-w-0 break-words [&>:first-child]:mt-0 [&>:last-child]:mb-0', className)}>{renderMarkdown(children)}</div>
}

/** Hanya format sebaris (tebal, miring, kode, tautan aman); tanpa pembungkus blok. */
export function InlineMarkdown({ children }: { children: string }) {
  return <>{inline(children)}</>
}

/** Rumus: LaTeX sederhana diubah ke elemen React (pangkat, indeks, pecahan, akar, huruf Yunani). */
function Formula({ src }: { src: string }) {
  return (
    <span className="font-serif italic" role="math" aria-label={src}>
      {latexToHtmlParts(src).map((p, i) =>
        p.kind === 'sup' ? <sup key={i}>{p.text}</sup>
        : p.kind === 'sub' ? <sub key={i}>{p.text}</sub>
        : p.kind === 'frac' ? (
          <span key={i} className="mx-0.5 inline-flex flex-col items-center align-middle text-[0.85em] leading-tight not-italic">
            <span className="border-b border-current px-1">{p.num}</span>
            <span className="px-1">{p.den}</span>
          </span>
        ) : <span key={i}>{p.text}</span>,
      )}
    </span>
  )
}

/** Diagram alur: setiap baris "A -> B -> C" digambar sebagai kotak bersambung panah (SVG-free, aman). */
function Flow({ rows }: { rows: string[][] }) {
  return (
    <figure className="my-3 space-y-3 overflow-x-auto rounded-xl border border-line bg-surface-2 p-4" aria-label="Diagram alur">
      {rows.map((row, r) => (
        <ol key={r} className="flex flex-wrap items-center gap-y-2">
          {row.map((node, i) => (
            <li key={i} className="flex items-center">
              <span className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium shadow-xs">{node}</span>
              {i < row.length - 1 && <span className="px-2 text-muted" aria-hidden>→</span>}
            </li>
          ))}
        </ol>
      ))}
    </figure>
  )
}
