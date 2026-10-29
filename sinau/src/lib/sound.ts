/** Efek bunyi sederhana lewat WebAudio (tanpa file audio). Aman dipanggil di browser tanpa dukungan audio. */
let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.06) {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, ctx.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
  o.connect(g).connect(ctx.destination)
  o.start(ctx.currentTime + start)
  o.stop(ctx.currentTime + start + dur + 0.02)
}

export type Sfx = 'ask' | 'correct' | 'wrong' | 'caught'

export function playSfx(kind: Sfx) {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    if (kind === 'correct') {
      tone(660, 0, 0.12)
      tone(880, 0.09, 0.2)
    } else if (kind === 'wrong') {
      tone(220, 0, 0.22, 'sawtooth', 0.04)
      tone(165, 0.12, 0.28, 'sawtooth', 0.04)
    } else if (kind === 'caught') {
      tone(196, 0, 0.3, 'triangle')
      tone(147, 0.25, 0.5, 'triangle')
    } else tone(520, 0, 0.1, 'triangle', 0.04)
  } catch {
    /* audio tidak tersedia: abaikan */
  }
}
