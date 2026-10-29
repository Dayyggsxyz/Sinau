/**
 * Diagram alur terstruktur: tiap baris "A -> B -> C". Jika bentuknya tidak valid
 * (terlalu besar, bukan alur, atau sintaks Mermaid kompleks), mengembalikan null
 * sehingga tampilan jatuh ke teks yang tetap terbaca.
 */
export function parseFlow(src: string): string[][] | null {
  const isMermaid = /^\s*(graph|flowchart)\b/i.test(src)
  const lines = src
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^(graph|flowchart)\b/i.test(l))
  if (lines.length === 0 || lines.length > 12) return null
  const rows: string[][] = []
  for (const line of lines) {
    // Hanya untuk sintaks Mermaid "A[Label]": ambil label, buang id simpul. Teks biasa dibiarkan.
    const unwrapped = isMermaid ? line.replace(/[A-Za-z0-9_]*(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})/g, (_, a, b, c) => a ?? b ?? c) : line
    const clean = unwrapped.replace(/-->|==>|→/g, '->')
    const nodes = clean.split('->').map((n) => n.replace(/^[A-Za-z0-9_]+\s*\|[^|]*\|\s*/, '').trim()).filter(Boolean)
    if (nodes.length < 2 && lines.length > 1) return null
    if (nodes.length > 8 || nodes.some((n) => n.length > 60 || /[<>]/.test(n))) return null
    rows.push(nodes)
  }
  return rows.every((r) => r.length >= 1) ? rows : null
}
