import { generate, type Engine, type Msg } from './llm'

export type Style = 'rap' | 'pop' | 'nursery' | 'chant'
export type OutLang = 'en' | 'ja'
export interface Section { name: string; lines: string[] }

const STYLE_EN: Record<Style, string> = {
  rap: 'a rap with punchy rhymes and strong rhythm',
  pop: 'a catchy upbeat pop song',
  nursery: 'a simple nursery rhyme for young children',
  chant: 'a short call-and-response chant, like a cheer or a playground chant',
}
const STYLE_JA: Record<Style, string> = {
  rap: '韻をふんだ、リズムの強いラップ',
  pop: '明るくて覚えやすいポップソング',
  nursery: '小さな子ども向けのやさしい童謡',
  chant: '掛け声のように言い合える、短いコール＆レスポンス',
}

export function prompt(notes: string, style: Style, lang: OutLang): Msg[] {
  if (lang === 'ja') return [
    { role: 'system', content: 'あなたは勉強用の覚え歌を作る作詞家です。与えられた内容の事実だけを使い、自然な日本語で書きます。' },
    { role: 'user', content: `次の内容を覚えるための${STYLE_JA[style]}の歌詞を書いてください。\n\n内容：\n${notes}\n\n決まり：\n- 形式は [Verse 1]、[Chorus]、[Verse 2]、[Chorus] の順\n- 各パート4行、1行は短く（15文字くらいまで）\n- サビ（Chorus）には一番大事なポイントを入れて、くり返しやすく\n- 語尾の音をそろえて、リズムよく\n- 歌詞だけを書き、説明は書かない` },
  ]
  return [
    { role: 'system', content: 'You are a songwriter who writes study songs. Only use facts from the notes. Lyrics must be accurate and easy to sing.' },
    { role: 'user', content: `Write ${STYLE_EN[style]} that helps someone memorize these notes.\n\nNotes:\n${notes}\n\nRules:\n- Use exactly these parts in order: [Verse 1], [Chorus], [Verse 2], [Chorus]\n- 4 lines per part, each line short (6 to 10 syllables)\n- Lines rhyme in pairs\n- The chorus holds the single most important fact and is easy to repeat\n- Output only the lyrics, no explanations` },
  ]
}

export function parse(text: string): Section[] {
  const out: Section[] = []
  let cur: Section | null = null
  for (let raw of text.split('\n')) {
    raw = raw.replace(/^\s*[*#>-]+\s*/, '').replace(/\*\*/g, '').trim()
    if (!raw) continue
    if ((raw.match(/\[[^\]]*\]/g) || []).length > 1 || /^\[.*(repeat|繰り返し|くり返し).*\]$/i.test(raw)) continue // stray structure notes
    if (/^(here('s| is)|sure|okay|これは|以下)/i.test(raw) && /[:：]$/.test(raw)) continue // chatty preamble
    const h = raw.match(/^[[(（【]?\s*(verse\s*\d*|chorus|bridge|intro|outro|hook|サビ|[A-Ａ-]メロ|コーラス|ヴァース\s*\d*|バース\s*\d*)\s*[\])）】:：]?\s*$/i)
    if (h) { cur = { name: h[1].replace(/^(サビ|コーラス)$/, 'Chorus'), lines: [] }; out.push(cur); continue }
    if (!cur) { cur = { name: 'Verse', lines: [] }; out.push(cur) }
    cur.lines.push(raw)
  }
  // A chorus written once but meant to repeat: if the model put "[Chorus]" with no lines, copy the first chorus.
  const first = out.find(s => /chorus/i.test(s.name) && s.lines.length)
  for (const s of out) if (/chorus/i.test(s.name) && !s.lines.length && first) s.lines = [...first.lines]
  // Small models sometimes ramble on; keep the first full song (max 6 parts, 6 lines each).
  return out.filter(s => s.lines.length).slice(0, 6).map(s => ({ ...s, lines: s.lines.slice(0, 6) }))
}

export function toText(title: string, secs: Section[]): string {
  return (title ? title + '\n\n' : '') + secs.map(s => `[${s.name}]\n${s.lines.join('\n')}`).join('\n\n') + '\n'
}

export async function write(engine: Engine, notes: string, style: Style, lang: OutLang, onStream: (s: string) => void): Promise<Section[]> {
  let acc = ''
  const raw = await generate(engine, prompt(notes.slice(0, engine === 'gemini' ? 20000 : 3000), style, lang), 380, t => { acc += t; onStream(acc) })
  return parse(raw)
}
