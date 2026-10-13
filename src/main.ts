import './style.css'
import './songs.css'
import { STR, fmt, type Lang, type Key } from './i18n'
import { loadModel, hasWebGPU, isMock, GEMINI_KEY, type Engine } from './llm'
import { write, parse, toText, type Style, type Section, type OutLang } from './lyrics'
import { Band, renderWav, units } from './music'

let lang: Lang = (localStorage.getItem('u74-lang') as Lang) || (navigator.language.startsWith('ja') ? 'ja' : 'en')
let outLang: OutLang = lang
let style: Style = 'pop'
let engine: Engine = (localStorage.getItem('u74-engine') as Engine) || 'small'
let notes = ''
let secs: Section[] = []
let voice = false
let melody = true
let busy = false
let band: Band | null = null
let raf = 0
const t = (k: Key) => STR[lang][k]
const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T
const handoff = () => { try { return JSON.parse(localStorage.getItem('u74-handoff') || 'null') as { title: string; text: string; lang: OutLang } | null } catch { return null } }
;(window as unknown as { __songs: unknown }).__songs = { get secs() { return secs }, get playing() { return !!band } }

function render() {
  const ta = document.querySelector<HTMLTextAreaElement>('#notes'); if (ta) notes = ta.value
  document.documentElement.lang = lang
  document.title = `${STR.ja.title} / ${STR.en.title}`
  const h = handoff()
  $('#app').innerHTML = `<main>
  <div class="top"><a href="https://gutsmcd-cmd.github.io/universe-74/">${t('portal')}</a>
    <span><button class="chip" data-l="en" aria-pressed="${lang === 'en'}">EN</button> <button class="chip" data-l="ja" aria-pressed="${lang === 'ja'}">日本語</button></span></div>
  <h1>${t('title')}</h1><p class="sub">${t('sub')}</p>
  <section class="card">
    <label class="note" for="notes">${t('notes')}</label>
    <textarea id="notes" placeholder="${t('ph')}"></textarea>
    <div class="row">${h?.text ? `<button class="ghost" id="fromSum">${t('fromSum')}${h.title ? '：' + esc(h.title) : ''}</button>` : `<a class="note" href="https://gutsmcd-cmd.github.io/u74-summarize/">${t('sumLink')}</a>`}</div>
    <div class="row"><span>${t('style')}</span>${(['rap', 'pop', 'nursery', 'chant'] as Style[]).map(s => `<button class="chip" data-s="${s}" aria-pressed="${s === style}">${t(s)}</button>`).join('')}</div>
    <div class="row"><span>${t('outLang')}</span><button class="chip" data-o="ja" aria-pressed="${outLang === 'ja'}">日本語</button><button class="chip" data-o="en" aria-pressed="${outLang === 'en'}">English</button></div>
    <div class="row"><span>${t('engine')}</span><select id="engine">${(['small', 'better', 'gemini'] as Engine[]).map(e => `<option value="${e}" ${e === engine ? 'selected' : ''}>${t(e)}</option>`).join('')}</select></div>
    <div class="row"><button class="go" id="write">${t('write')}</button></div>
    <progress id="bar" value="0" max="1" hidden></progress>
    <p class="status" id="status"></p>
  </section>
  <section class="card" id="songCard" ${secs.length ? '' : 'hidden'}>
    <div class="row"><button class="go" id="play">${t('play')}</button>
      <label class="tog"><input type="checkbox" id="melody" ${melody ? 'checked' : ''}> ${t('melody')}</label>
      <label class="tog"><input type="checkbox" id="voice" ${voice ? 'checked' : ''}> ${t('voice')}</label></div>
    <div id="karaoke" class="karaoke"></div>
    <details><summary class="note">${t('edit')}</summary><textarea id="lyricsEdit" class="tall"></textarea></details>
    <div class="row"><button class="ghost" id="copy">${t('copy')}</button><button class="ghost" id="save">${t('save')}</button><button class="ghost" id="wav">${t('wav')}</button><button class="ghost" id="suno">${t('suno')}</button></div>
  </section>
  <p class="note">${t('honest')}</p>
  </main>`
  $<HTMLTextAreaElement>('#notes').value = notes
  if (secs.length) { drawKaraoke(); $<HTMLTextAreaElement>('#lyricsEdit').value = toText('', secs) }
  wire()
}
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
function status(s: string, err = false) { const el = $('#status'); el.textContent = s; el.className = 'status' + (err ? ' err' : '') }

function drawKaraoke() {
  $('#karaoke').innerHTML = secs.map((s, si) => `<div class="sec"><p class="secname">${esc(s.name)}</p>${s.lines.map((l, li) =>
    `<p class="line" data-k="${si}-${li}">${units(l).map((w, wi) => `<span data-w="${wi}">${esc(w)}</span>`).join(/[\u3040-\u30ff\u4e00-\u9fff]/.test(l) ? '' : ' ')}</p>`).join('')}</div>`).join('')
}

function wire() {
  document.querySelectorAll<HTMLButtonElement>('[data-l]').forEach(b => b.onclick = () => { lang = b.dataset.l as Lang; outLang = lang; localStorage.setItem('u74-lang', lang); render() })
  document.querySelectorAll<HTMLButtonElement>('[data-s]').forEach(b => b.onclick = () => { style = b.dataset.s as Style; render() })
  document.querySelectorAll<HTMLButtonElement>('[data-o]').forEach(b => b.onclick = () => { outLang = b.dataset.o as OutLang; render() })
  $<HTMLSelectElement>('#engine').onchange = e => { engine = (e.target as HTMLSelectElement).value as Engine; localStorage.setItem('u74-engine', engine) }
  const fs = document.querySelector<HTMLButtonElement>('#fromSum')
  if (fs) fs.onclick = () => { const h = handoff(); if (h) { $<HTMLTextAreaElement>('#notes').value = h.text; outLang = h.lang || outLang; render() } }
  $('#write').onclick = doWrite
  if (!secs.length) return
  $('#play').onclick = () => (band ? stop() : play())
  $<HTMLInputElement>('#melody').onchange = e => { melody = (e.target as HTMLInputElement).checked }
  $<HTMLInputElement>('#voice').onchange = e => { voice = (e.target as HTMLInputElement).checked }
  $<HTMLTextAreaElement>('#lyricsEdit').onchange = e => { const p = parse((e.target as HTMLTextAreaElement).value); if (p.length) { secs = p; stop(); drawKaraoke() } }
  $('#copy').onclick = async () => { await navigator.clipboard.writeText(toText('', secs)).catch(() => {}); $('#copy').textContent = t('copied') }
  $('#save').onclick = () => download(new Blob([toText(title(), secs)], { type: 'text/plain' }), `${title() || 'study-song'}.txt`)
  $('#wav').onclick = async () => download(await renderWav(secs, style), `${title() || 'study-song'}-${style}.wav`)
  $('#suno').onclick = async () => {
    const tags: Record<Style, string> = { rap: 'educational hip hop, clear rap vocals, catchy hook', pop: 'upbeat educational pop, clear vocals, catchy chorus', nursery: 'children\'s song, nursery rhyme, gentle and playful', chant: 'call and response chant, stomp clap, group vocals' }
    const txt = `Style: ${tags[style]}${outLang === 'ja' ? ', Japanese lyrics' : ''}\n\nLyrics:\n${toText('', secs)}`
    await navigator.clipboard.writeText(txt).catch(() => {})
    $('#suno').textContent = t('copied')
    window.open('https://suno.com/create', '_blank', 'noopener')
  }
}
const title = () => (notes.split('\n')[0] || '').slice(0, 40).replace(/[\\/:*?"<>|]/g, '').trim()
function download(b: Blob, name: string) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click() }

async function doWrite() {
  if (busy) return
  notes = $<HTMLTextAreaElement>('#notes').value.trim()
  if (!notes) { status(t('needNotes'), true); document.body.dataset.state = 'error'; return }
  let eng = engine
  if (eng === 'gemini' && !localStorage.getItem(GEMINI_KEY) && !isMock) { status(t('needKey'), true); return }
  if (eng === 'better' && !isMock && !(await hasWebGPU())) eng = 'small'
  busy = true; stop()
  const bar = $<HTMLProgressElement>('#bar'), btn = $<HTMLButtonElement>('#write')
  btn.disabled = true; bar.hidden = false; bar.removeAttribute('value')
  const t0 = performance.now()
  try {
    status(t('loading'))
    const info = await loadModel(eng, (f, l, tot) => { bar.value = f; status(`${t('loading')} ${Math.round(l)} / ${Math.round(tot)} MB`) })
    const dev = info.device === 'webgpu' ? t('gpu') : info.device === 'wasm' ? t('cpu') : ''
    status(`${t('writing')} ${dev}`); bar.removeAttribute('value')
    const got = await write(eng, notes, style, outLang, s => { status(`${t('writing')} ${s.length}…`) })
    if (!got.length) throw new Error('No lyrics came back. Try again or pick another style.')
    secs = got
    render()
    status(fmt(t('done'), { s: Math.round((performance.now() - t0) / 1000) }) + ' ' + dev)
    document.body.dataset.state = 'done'
  } catch (e) { status(String((e as Error).message), true); document.body.dataset.state = 'error' }
  finally { busy = false; const b = document.querySelector<HTMLButtonElement>('#write'); if (b) b.disabled = false; const p = document.querySelector<HTMLProgressElement>('#bar'); if (p) p.hidden = true }
}

function play() {
  band = new Band()
  const ctx = band.ctx as AudioContext
  const t0 = ctx.currentTime + 0.15
  const { cues, end } = band.schedule(t0, secs, style, melody)
  $('#play').textContent = t('stopP')
  if (voice && 'speechSynthesis' in window) {
    speechSynthesis.cancel()
    const v = speechSynthesis.getVoices().find(v => v.lang.startsWith(outLang === 'ja' ? 'ja' : 'en'))
    cues.forEach(c => {
      const line = secs[c.section].lines[c.line]
      setTimeout(() => {
        if (!band) return
        const u = new SpeechSynthesisUtterance(line); u.lang = outLang === 'ja' ? 'ja-JP' : 'en-US'; if (v) u.voice = v
        u.rate = Math.min(1.6, Math.max(0.8, units(line).length / ((c.end - c.start) * (outLang === 'ja' ? 7 : 2.6)))); u.pitch = style === 'nursery' ? 1.4 : 1
        speechSynthesis.speak(u)
      }, Math.max(0, (t0 + c.start - ctx.currentTime) * 1000))
    })
  }
  const tick = () => {
    if (!band) return
    const now = ctx.currentTime - t0
    document.querySelectorAll('.line.on').forEach(e => e.classList.remove('on'))
    const c = cues.find(c => now >= c.start && now < c.end)
    if (c) {
      const el = document.querySelector(`[data-k="${c.section}-${c.line}"]`)
      el?.classList.add('on')
      const sung = c.syl.filter(s => s.t <= now).map(s => s.i)
      const upto = sung.length ? sung[sung.length - 1] : -1
      el?.querySelectorAll<HTMLElement>('[data-w]').forEach(w => w.classList.toggle('sung', Number(w.dataset.w) <= upto))
      if (el && (el as HTMLElement).dataset.scrolled !== '1') { (el as HTMLElement).dataset.scrolled = '1'; el.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
    }
    document.body.dataset.playing = c ? `${c.section}-${c.line}` : 'beat'
    if (ctx.currentTime > end) { stop(); return }
    raf = requestAnimationFrame(tick)
  }
  tick()
}
function stop() {
  cancelAnimationFrame(raf)
  if (band) { (band.ctx as AudioContext).close?.(); band = null }
  if ('speechSynthesis' in window) speechSynthesis.cancel()
  document.querySelectorAll('.line.on,.sung').forEach(e => e.classList.remove('on', 'sung'))
  document.querySelectorAll<HTMLElement>('[data-scrolled]').forEach(e => delete e.dataset.scrolled)
  const p = document.querySelector('#play'); if (p) p.textContent = t('play')
  delete document.body.dataset.playing
}

if (location.hash === '#from-summary') { const h = handoff(); if (h?.text) { notes = h.text; outLang = h.lang || outLang } }
render()
