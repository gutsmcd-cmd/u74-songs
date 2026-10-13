// Tiny WebAudio band: drums, bass, chords and a lead melody that follows the lyrics.
import type { Section, Style } from './lyrics'

export const TEMPO: Record<Style, number> = { rap: 90, pop: 112, nursery: 100, chant: 84 }
// I–V–vi–IV in C, one chord per bar
const PROG = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]]
const PENTA = [0, 2, 4, 7, 9, 12]
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

export interface Cue { section: number; line: number; start: number; end: number; syl: { t: number; i: number }[] }

// Rough syllables: English vowel groups per word; Japanese counts each kana/kanji as a beat-ish unit.
export function units(line: string): string[] {
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(line)) return Array.from(line.replace(/[\s、。！？!?,.・「」]/g, '')).filter(Boolean)
  return line.split(/\s+/).filter(Boolean)
}
function sylCount(word: string) {
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(word)) return 1
  return Math.max(1, (word.toLowerCase().match(/[aeiouy]+/g) || []).length)
}
function seed(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296) }

export function plan(secs: Section[], style: Style): { cues: Cue[]; bars: number; beat: number } {
  const beat = 60 / TEMPO[style]
  const cues: Cue[] = []
  let bar = 1 // one bar count-in
  secs.forEach((s, si) => s.lines.forEach((line, li) => {
    const u = units(line)
    const n = u.reduce((a, w) => a + sylCount(w), 0)
    const barsForLine = n > 12 ? 2 : 1
    const start = bar * 4 * beat, len = barsForLine * 4 * beat * 0.9
    const syl: Cue['syl'] = []
    let k = 0
    u.forEach((w, i) => { for (let j = 0; j < sylCount(w); j++) syl.push({ t: start + (k++ / Math.max(n, 1)) * len, i }) })
    cues.push({ section: si, line: li, start, end: start + barsForLine * 4 * beat, syl })
    bar += barsForLine
  }))
  return { cues, bars: bar + 1, beat }
}

export class Band {
  ctx: AudioContext | OfflineAudioContext
  out: GainNode
  constructor(ctx?: AudioContext | OfflineAudioContext) { this.ctx = ctx ?? new AudioContext(); this.out = this.ctx.createGain(); this.out.gain.value = 0.8; this.out.connect(this.ctx.destination) }
  private env(t: number, dur: number, peak: number) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(this.out); return g }
  kick(t: number) { const o = this.ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15); o.connect(this.env(t, 0.25, 0.9)); o.start(t); o.stop(t + 0.3) }
  noise(t: number, dur: number, peak: number, hp: number) {
    const b = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const s = this.ctx.createBufferSource(); s.buffer = b; const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.connect(f); f.connect(this.env(t, dur, peak)); s.start(t)
  }
  tone(t: number, dur: number, freq: number, type: OscillatorType, peak: number) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.connect(this.env(t, dur, peak)); o.start(t); o.stop(t + dur + 0.05) }

  schedule(t0: number, secs: Section[], style: Style, melody: boolean) {
    const { cues, bars, beat } = plan(secs, style)
    for (let b = 0; b < bars; b++) {
      const chord = PROG[b % 4]
      for (let q = 0; q < 4; q++) {
        const t = t0 + (b * 4 + q) * beat
        if (style !== 'nursery' && (q === 0 || q === 2 || (style === 'rap' && q === 3 && b % 2))) this.kick(t)
        if (style === 'nursery' && q === 0) this.kick(t)
        if (q === 1 || q === 3) this.noise(t, style === 'chant' ? 0.2 : 0.12, style === 'chant' ? 0.5 : 0.35, 1500) // snare / clap
        this.noise(t, 0.04, 0.12, 7000); this.noise(t + beat / 2, 0.04, 0.08, 7000) // hats
        this.tone(t, beat * 0.9, hz(chord[0] - 12), style === 'rap' ? 'sawtooth' : 'triangle', style === 'rap' ? 0.18 : 0.3) // bass
      }
      if (style !== 'chant') chord.forEach(n => this.tone(t0 + b * 4 * beat, 4 * beat * 0.95, hz(n + 12), 'sine', 0.06)) // pad
    }
    if (melody) for (const c of cues) {
      const rnd = seed(secs[c.section].lines[c.line] + c.section)
      const root = PROG[Math.round(c.start / beat / 4) % 4][0] + 24
      let idx = 2
      c.syl.forEach((s, k) => {
        idx = Math.max(0, Math.min(PENTA.length - 1, idx + Math.round(rnd() * 2 - 1)))
        const last = k === c.syl.length - 1
        const note = last ? root + 12 : root + 12 + PENTA[idx] - 12 + (style === 'nursery' ? 0 : 0)
        const next = c.syl[k + 1]?.t ?? c.start + 4 * beat * 0.9
        this.tone(t0 + s.t, Math.max(0.1, (next - s.t) * 0.9), hz(style === 'rap' ? root + 12 : note), style === 'rap' ? 'square' : 'triangle', style === 'rap' ? 0.05 : 0.14)
      })
    }
    return { cues, end: t0 + bars * 4 * beat, beat }
  }
}

// Render to a WAV file (instrumental + melody) for saving.
export async function renderWav(secs: Section[], style: Style): Promise<Blob> {
  const { bars, beat } = plan(secs, style)
  const sr = 22050
  const ctx = new OfflineAudioContext(1, Math.ceil(sr * (bars * 4 * beat + 1)), sr)
  new Band(ctx).schedule(0, secs, style, true)
  const buf = await ctx.startRendering()
  const d = buf.getChannelData(0), n = d.length
  const v = new DataView(new ArrayBuffer(44 + n * 2))
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true)
  return new Blob([v], { type: 'audio/wav' })
}
