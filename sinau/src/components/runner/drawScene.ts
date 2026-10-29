import type { EngineState } from '@/lib/runnerEngine'

export interface Palette {
  bg: string
  tint: string
  surface: string
  surface2: string
  surface3: string
  ink: string
  muted: string
  line: string
  brand: string
  accent: string
  ok: string
  danger: string
  onColor: string
}

export function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string) => cs.getPropertyValue(n).trim()
  const dark = document.documentElement.classList.contains('dark')
  return {
    bg: v('--bg'), tint: v('--bg-tint'), surface: v('--surface'), surface2: v('--surface-2'), surface3: v('--surface-3'),
    ink: v('--ink'), muted: v('--muted'), line: v('--line-strong'), brand: v('--brand'), accent: v('--accent'), ok: v('--ok'), danger: v('--danger'),
    onColor: dark ? '#0b0b0d' : '#ffffff',
  }
}

const DOOR_LETTERS = ['A', 'B', 'C']

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function runner(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, p: Palette, moving: boolean, stumble: number) {
  const swing = moving ? Math.sin(t * 13) : 0
  const bob = moving ? Math.abs(Math.sin(t * 13)) * 3 * s : 0
  ctx.save()
  ctx.translate(x, y - bob)
  if (stumble > 0) ctx.rotate(-0.25 * Math.min(1, stumble / 0.3))
  // kaki
  ctx.strokeStyle = p.ink
  ctx.lineWidth = 6 * s
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-4 * s, -18 * s); ctx.lineTo(-4 * s + swing * 10 * s, 0)
  ctx.moveTo(6 * s, -18 * s); ctx.lineTo(6 * s - swing * 10 * s, 0)
  ctx.stroke()
  // tas
  ctx.fillStyle = p.accent
  rr(ctx, -20 * s, -52 * s, 13 * s, 26 * s, 5 * s); ctx.fill()
  // badan
  ctx.fillStyle = p.brand
  rr(ctx, -12 * s, -56 * s, 28 * s, 40 * s, 10 * s); ctx.fill()
  // kepala
  ctx.fillStyle = '#f0c8a0'
  ctx.beginPath(); ctx.arc(2 * s, -68 * s, 13 * s, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#2b2118'
  ctx.beginPath(); ctx.arc(0, -72 * s, 13 * s, Math.PI, Math.PI * 2); ctx.fill()
  // mata dan mulut
  ctx.fillStyle = '#2b2118'
  ctx.beginPath(); ctx.arc(8 * s, -68 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 1.6 * s
  ctx.beginPath(); ctx.arc(7 * s, -63 * s, 3.5 * s, 0.1, Math.PI - 0.5); ctx.stroke()
  // lengan
  ctx.strokeStyle = p.brand; ctx.lineWidth = 5 * s
  ctx.beginPath(); ctx.moveTo(4 * s, -48 * s); ctx.lineTo(4 * s - swing * 12 * s, -34 * s); ctx.stroke()
  ctx.restore()
}

function teacher(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, p: Palette, danger: number) {
  const swing = Math.sin(t * 11 + 1)
  const bob = Math.abs(Math.sin(t * 11 + 1)) * 3 * s
  const lean = danger * 0.18
  ctx.save()
  ctx.translate(x, y - bob)
  ctx.rotate(lean)
  const suit = '#3d4466'
  ctx.strokeStyle = suit; ctx.lineWidth = 8 * s; ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-5 * s, -24 * s); ctx.lineTo(-5 * s + swing * 13 * s, 0)
  ctx.moveTo(7 * s, -24 * s); ctx.lineTo(7 * s - swing * 13 * s, 0)
  ctx.stroke()
  ctx.fillStyle = suit
  rr(ctx, -17 * s, -72 * s, 38 * s, 52 * s, 13 * s); ctx.fill()
  // kemeja & dasi kupu-kupu
  ctx.fillStyle = '#f4f4f6'
  ctx.beginPath(); ctx.moveTo(-3 * s, -72 * s); ctx.lineTo(7 * s, -72 * s); ctx.lineTo(2 * s, -52 * s); ctx.fill()
  ctx.fillStyle = p.accent
  ctx.beginPath(); ctx.moveTo(2 * s, -68 * s); ctx.lineTo(-5 * s, -73 * s); ctx.lineTo(-5 * s, -63 * s); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(2 * s, -68 * s); ctx.lineTo(9 * s, -73 * s); ctx.lineTo(9 * s, -63 * s); ctx.closePath(); ctx.fill()
  // kepala
  ctx.fillStyle = '#e6b88e'
  ctx.beginPath(); ctx.arc(3 * s, -88 * s, 16 * s, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#6b6b78'
  ctx.beginPath(); ctx.arc(1 * s, -92 * s, 16 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fill()
  // kacamata bulat
  ctx.strokeStyle = '#23232b'; ctx.lineWidth = 2 * s
  ctx.beginPath(); ctx.arc(-1 * s, -88 * s, 5.5 * s, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(11 * s, -88 * s, 5.5 * s, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(4.5 * s, -88 * s); ctx.lineTo(5.5 * s, -88 * s); ctx.stroke()
  ctx.fillStyle = '#23232b'
  ctx.beginPath(); ctx.arc(0, -88 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(12 * s, -88 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill()
  // alis: makin dekat makin "pura-pura galak" (tetap lucu)
  ctx.lineWidth = 2 * s
  ctx.beginPath(); ctx.moveTo(-6 * s, -96 * s + danger * 2 * s); ctx.lineTo(3 * s, -95 * s - danger * 2 * s)
  ctx.moveTo(8 * s, -95 * s - danger * 2 * s); ctx.lineTo(17 * s, -96 * s + danger * 2 * s); ctx.stroke()
  // senyum lebar + pipi
  ctx.beginPath(); ctx.arc(6 * s, -80 * s, 5 * s, 0.15, Math.PI - 0.15); ctx.stroke()
  ctx.fillStyle = 'rgba(224,120,120,.45)'
  ctx.beginPath(); ctx.arc(-5 * s, -81 * s, 3 * s, 0, Math.PI * 2); ctx.arc(16 * s, -81 * s, 3 * s, 0, Math.PI * 2); ctx.fill()
  // penggaris di tangan
  ctx.strokeStyle = suit; ctx.lineWidth = 6 * s
  ctx.beginPath(); ctx.moveTo(14 * s, -62 * s); ctx.lineTo(30 * s, -52 * s + swing * 4 * s); ctx.stroke()
  ctx.strokeStyle = p.brand; ctx.lineWidth = 5 * s
  ctx.beginPath(); ctx.moveTo(30 * s, -52 * s + swing * 4 * s); ctx.lineTo(34 * s, -90 * s + swing * 4 * s); ctx.stroke()
  ctx.restore()
}

function door(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, letter: string, open: number, p: Palette, dim: boolean, picked: boolean) {
  const w = 54 * s
  const h = 86 * s
  ctx.save()
  ctx.globalAlpha = dim ? 0.45 : 1
  ctx.fillStyle = p.surface3
  rr(ctx, x - w / 2 - 5 * s, y - h - 5 * s, w + 10 * s, h + 5 * s, 8 * s); ctx.fill()
  ctx.fillStyle = open > 0 ? p.ink : color
  rr(ctx, x - w / 2, y - h, w, h, 6 * s); ctx.fill()
  if (open > 0) {
    // daun pintu terbuka
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x - w / 2 + w * (1 - open) * 0.9, y - h + 6 * s * open)
    ctx.lineTo(x - w / 2 + w * (1 - open) * 0.9, y - 6 * s * open); ctx.lineTo(x - w / 2, y); ctx.closePath(); ctx.fill()
  }
  ctx.fillStyle = p.onColor
  ctx.font = `700 ${26 * s}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  if (open === 0) ctx.fillText(letter, x, y - h * 0.58)
  ctx.beginPath(); ctx.arc(x + w * 0.3, y - h * 0.42, 3 * s, 0, Math.PI * 2); ctx.fill()
  if (picked) {
    ctx.strokeStyle = p.ink; ctx.lineWidth = 3 * s
    rr(ctx, x - w / 2 - 6 * s, y - h - 6 * s, w + 12 * s, h + 7 * s, 9 * s); ctx.stroke()
  }
  ctx.restore()
}

export interface SceneOpts {
  w: number
  h: number
  reduceMotion: boolean
  paused: boolean
}

/** Menggambar satu frame. Semua posisi diturunkan dari state mesin, jadi render tidak menyimpan state sendiri. */
export function drawScene(ctx: CanvasRenderingContext2D, st: EngineState, p: Palette, o: SceneOpts, laneVis: { v: number; tv: number }) {
  const { w, h } = o
  const s = h / 360
  const groundTop = h * 0.4
  const trackY = (lane: number) => groundTop + (h - groundTop) * (0.28 + lane * 0.27)
  const scroll = st.distance * 38 * s

  ctx.clearRect(0, 0, w, h)
  // langit/dinding koridor
  ctx.fillStyle = p.tint
  ctx.fillRect(0, 0, w, groundTop)
  // jendela & loker bergerak (paralaks)
  ctx.fillStyle = p.surface3
  const pw = 120 * s
  const off1 = -(scroll * 0.25) % pw
  for (let x = off1 - pw; x < w + pw; x += pw) {
    rr(ctx, x + 14 * s, groundTop * 0.22, 70 * s, groundTop * 0.5, 8 * s); ctx.fill()
  }
  ctx.fillStyle = p.surface2
  const lw = 56 * s
  const off2 = -(scroll * 0.55) % lw
  for (let x = off2 - lw; x < w + lw; x += lw) {
    rr(ctx, x + 4 * s, groundTop - 70 * s, lw - 8 * s, 70 * s, 4 * s); ctx.fill()
  }
  // lantai
  ctx.fillStyle = p.surface
  ctx.fillRect(0, groundTop, w, h - groundTop)
  ctx.fillStyle = p.surface3
  ctx.fillRect(0, groundTop, w, 3 * s)
  // garis jalur bergerak
  ctx.strokeStyle = p.line
  ctx.lineWidth = 2 * s
  ctx.setLineDash([22 * s, 22 * s])
  ctx.lineDashOffset = scroll
  for (const g of [0.415, 0.685]) {
    const y = groundTop + (h - groundTop) * g
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }
  ctx.setLineDash([])

  // posisi
  const px = w * 0.36
  const target = st.lane
  laneVis.tv = target
  laneVis.v += (laneVis.tv - laneVis.v) * (o.paused ? 0 : 0.2)
  const laneY = (v: number) => trackY(0) + (trackY(2) - trackY(0)) * (v / 2)
  const py = laneY(laneVis.v)
  const moving = st.phase !== 'over'
  const dangerNorm = 1 - st.gap / 100
  const caught = st.phase === 'over' || (st.phase === 'resolve' && st.gap <= 0)
  const gapPx = (caught ? 22 : 34 + st.gap * 1.45) * s
  const shake = !o.reduceMotion && st.hit > 0 ? Math.sin(st.t * 80) * 5 * s * (st.hit / 0.6) : 0

  ctx.save()
  ctx.translate(shake, 0)

  // pintu
  if (st.question && (st.phase === 'ask' || st.phase === 'resolve')) {
    const prog = st.phase === 'ask' ? 1 - st.decideLeft / st.decideTotal : 1
    const doorX = w + 60 * s + (px + 62 * s - (w + 60 * s)) * prog
    const colors = [p.brand, p.accent, p.ok]
    for (let i = 0; i < 3; i++) {
      const y = trackY(i)
      const resolved = st.phase === 'resolve'
      const open = resolved && i === st.correctDoor ? Math.min(1, (RESOLVE_OPEN - st.resolveLeft) / 0.4 + 0.0001) : 0
      door(ctx, doorX, y + 10 * s, s, colors[i], DOOR_LETTERS[i], Math.max(0, open), p, resolved && i !== st.correctDoor, st.chosen === i)
    }
  }

  // guru (di belakang) dan pelari
  const ty = laneY(laneVis.v)
  teacher(ctx, px - gapPx - 40 * s, ty + 10 * s, s * 1.12, st.t, p, dangerNorm)
  runner(ctx, px, py + 10 * s, s, st.t, p, moving && !caught, st.hit)
  ctx.restore()

  // kilatan merah saat salah
  if (st.hit > 0 && !o.reduceMotion) {
    ctx.fillStyle = p.danger
    ctx.globalAlpha = 0.18 * (st.hit / 0.6)
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1
  }
}

const RESOLVE_OPEN = 1.5
