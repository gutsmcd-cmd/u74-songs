export type Lang = 'en' | 'ja'
export const STR = {
  en: {
    title: 'Study Songs', sub: 'Universe 74 · if you can sing it, you can remember it',
    notes: 'Topic or notes', ph: 'e.g. The planets in order: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune', fromSum: 'Use my latest Summarizer summary',
    style: 'Style', rap: 'Rap', pop: 'Pop', nursery: 'Nursery rhyme', chant: 'Chant', outLang: 'Lyrics in', engine: 'Brain',
    small: 'Small & quick (0.5B, ~0.5 GB, once)', better: 'Smarter (1.5B, ~1.2 GB, needs WebGPU)', gemini: 'Your own Gemini key (cloud)',
    write: 'Write the song', play: '▶ Play', stopP: '■ Stop', voice: 'Robot voice chants the lyrics on the beat', melody: 'Melody follows the words',
    copy: 'Copy lyrics', save: 'Save lyrics .txt', wav: 'Save music .wav', suno: 'Copy prompt & open Suno', copied: 'Copied',
    edit: 'You can edit the lyrics, then press Play.', loading: 'Downloading the AI model (only the first time)…', writing: 'Writing lyrics…',
    done: 'Written in {s}s.', needNotes: 'Type a topic or some notes first.', needKey: 'Save a Gemini key in the Summarizer first, or pick another brain.',
    gpu: 'Running on your graphics chip (WebGPU).', cpu: 'No WebGPU here, so it runs on the processor. Expect a minute or more.',
    honest: 'Honest note: this app writes the lyrics and plays a simple beat with a melody line, with the words lit up karaoke-style. It does not make real sung vocals; the robot voice can chant the words, but it is a reading voice, not a singer. For a fully sung version, the Suno button copies a ready prompt so you can paste it there (Suno is a separate site with its own account and limits). The AI runs in your browser; your notes are not uploaded.',
    portal: '← Universe 74 App House', sumLink: 'Summarize a book first in the Summarizer →',
  },
  ja: {
    title: '歌で覚える', sub: 'ユニバース74・歌えれば、覚えられる',
    notes: 'テーマやノート', ph: '例：太陽系の惑星の順番　水星・金星・地球・火星・木星・土星・天王星・海王星', fromSum: 'まとめ屋の最新の要約を使う',
    style: 'スタイル', rap: 'ラップ', pop: 'ポップ', nursery: '童謡', chant: '掛け声', outLang: '歌詞の言語', engine: 'AI',
    small: '小さくて速い（0.5B・約0.5GB・初回のみ）', better: 'かしこい（1.5B・約1.2GB・WebGPUが必要）', gemini: '自分のGeminiキー（クラウド）',
    write: '歌詞を作る', play: '▶ 再生', stopP: '■ 停止', voice: 'ロボット音声がビートに合わせて歌詞を読む', melody: '言葉に合わせてメロディを鳴らす',
    copy: '歌詞をコピー', save: '歌詞を.txtで保存', wav: '音楽を.wavで保存', suno: 'プロンプトをコピーしてSunoを開く', copied: 'コピーしました',
    edit: '歌詞は書き換えられます。直したら再生してください。', loading: 'AIモデルをダウンロード中（初回のみ）…', writing: '歌詞を書いています…',
    done: '{s}秒で完成。', needNotes: '先にテーマかノートを入力してください。', needKey: '先にまとめ屋でGeminiキーを保存するか、別のAIを選んでください。',
    gpu: 'グラフィックチップ（WebGPU）で動いています。', cpu: 'この端末はWebGPUに非対応なので、CPUで動きます。1分以上かかります。',
    honest: '正直なお知らせ：このアプリは歌詞を作り、シンプルなビートとメロディを鳴らしながら、カラオケのように歌詞を光らせます。本物の歌声は作れません。ロボット音声で歌詞を読み上げることはできますが、歌手ではなく読み上げの声です。ちゃんと歌った版がほしいときは、Sunoボタンでプロンプトをコピーして貼りつけてください（Sunoは別のサイトで、アカウントや利用回数の制限があります）。AIはブラウザの中で動くので、ノートがアップロードされることはありません。',
    portal: '← ユニバース74 アプリの家', sumLink: '本の要約はまとめ屋で →',
  },
} as const
export type Key = keyof typeof STR.en
export function fmt(s: string, v: Record<string, string | number>) { return s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? '')) }
