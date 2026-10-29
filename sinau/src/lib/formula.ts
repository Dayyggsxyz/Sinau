export type FormulaPart =
  | { kind: 'text'; text: string }
  | { kind: 'sup'; text: string }
  | { kind: 'sub'; text: string }
  | { kind: 'frac'; num: string; den: string }

const SYMBOLS: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', Sigma: 'Σ', omega: 'ω', Omega: 'Ω', phi: 'φ', epsilon: 'ε',
  times: '×', cdot: '·', div: '÷', pm: '±', leq: '≤', geq: '≥', neq: '≠', approx: '≈', to: '→', rightarrow: '→', infty: '∞', degree: '°', circ: '°', sum: 'Σ', int: '∫',
}

const plain = (s: string) => s.replace(/\\([A-Za-z]+)/g, (_, w) => SYMBOLS[w] ?? w).replace(/[{}]/g, '')

/** Mengubah LaTeX sederhana menjadi bagian-bagian yang bisa dirender sebagai elemen aman. */
export function latexToHtmlParts(src: string): FormulaPart[] {
  const parts: FormulaPart[] = []
  let s = src.trim()
  // akar kuadrat: \sqrt{x} -> √(x)
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
  const re = /\\frac\{([^{}]*)\}\{([^{}]*)\}|\^\{([^{}]*)\}|\^([A-Za-z0-9+-])|_\{([^{}]*)\}|_([A-Za-z0-9])/g
  let last = 0
  for (const m of s.matchAll(re)) {
    const at = m.index ?? 0
    if (at > last) parts.push({ kind: 'text', text: plain(s.slice(last, at)) })
    if (m[1] !== undefined) parts.push({ kind: 'frac', num: plain(m[1]), den: plain(m[2]) })
    else if (m[3] !== undefined || m[4] !== undefined) parts.push({ kind: 'sup', text: plain(m[3] ?? m[4]) })
    else parts.push({ kind: 'sub', text: plain(m[5] ?? m[6]) })
    last = at + m[0].length
  }
  if (last < s.length) parts.push({ kind: 'text', text: plain(s.slice(last)) })
  return parts
}
