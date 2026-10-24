// KINEO-IDIOMAS-FORMATOS-2410 — real Unicode gates and caption payloads, offline; no SDK effects.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const BASE = 'dd0abba8cc711be4bde2faaac39f0aef29f3f90d'
const read = file => readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const base = file => execFileSync('git', ['show', `${BASE}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
const json = value => JSON.parse(JSON.stringify(value))
const SAMPLES = [
  ['zh', '清晨的阳光照进房间，小猫背着书包走进花园。它找到了一只迷路的小鸟。最后朋友们一起把小鸟送回温暖的家。', 'Noto Sans SC'],
  ['yue', '清晨嘅陽光照入房間，小貓揹住書包行入花園。佢搵到一隻迷路嘅小鳥。最後朋友一齊送小鳥返屋企。', 'Noto Sans TC'],
  ['ja', '朝の光が窓から差し込みます。小さな猫は庭で迷子の鳥を見つけました。猫は友だちと一緒に鳥を家へ送りました。', 'Noto Sans JP'],
  ['th', 'เช้าวันหนึ่งแมวน้อยเดินเข้าไปในสวน มันพบลูกนกที่หลงทาง แล้วเพื่อน ๆ ก็ช่วยกันพาลูกนกกลับบ้านอย่างปลอดภัย', 'Noto Sans Thai'],
]
const compact = text => text.replace(/\s+/gu, '')
function load(over = {}) {
  const forbidden = () => { throw Error('offline service forbidden') }
  return createOfflineLoader({ source: (file, source) => over[file] ?? source,
    mocks: { '@/lib/openai': { buildCaptionSegments: forbidden, pickHighlightWord: () => null, OPENAI_TTS_TIMEOUT_MS: 1, OPENAI_WHISPER_TIMEOUT_MS: 1 } } })
}
function choiceState(language, text) {
  const plan = { marker: 'KINEO-ADS-CENA-2110', input: { foto: 'https://offline.invalid/product.png', language, formato: 'product', oferta: '' }, product: '商品', category: 'other', audioMode: 'voiceover', voice_mode: 'narrated', setting: 'room', actor: 'same person', script: { hook: text, use: '', benefit: '', cta: '詳しく見る。', hooks: [text, text, text], narration: text }, escolha: { marker: 'KINEO-ADS-ESCOLHA-2310', captionLane: 'bottom', captionGrounding: { source: 'preview_judge', imageUrl: 'https://offline.invalid/still.png', product: [[.2, .80, .4, .90]], face: [[.2, .08, .4, .20]] } } }
  return { plan, route: 'kling3', phase: 'ready', keyframe: 'https://offline.invalid/still.png', voiceUrl: 'https://offline.invalid/voice.mp3', escolhaMedia: { voice: { status: 'done', seconds: 12 }, music: { status: 'skipped' } }, jobs: [{ kind: 'video', index: 0, status: 'done', url: 'https://offline.invalid/video.mp4', measuredSeconds: 15, seconds: 15 }] }
}
function prove(over = {}) {
  const L = load(over), T = L('lib/textLanguage.ts'), N = L('lib/narrationFit.ts'), D = L('lib/durationByEngine.ts'), P = L('lib/pastedScript.ts'), C = L('lib/compose.ts'), A = L('lib/ads/v2CenaQuality.ts'), K = L('lib/ads/cena/captions95.ts'), E = L('lib/ads/cena/escolhaMontage.ts'), B = L('lib/cinematic/verbatimBeats.ts'), V = L('lib/cinematic/klingShots.ts'), S = L('lib/broll/scene-splitter.ts')
  for (const [language, text, font] of SAMPLES) {
    const tokens = T.narrationTokens(text, language), count = tokens.length
    assert.ok(count > 10, `${language}: Unicode units replace one whitespace token`)
    assert.equal(compact(T.joinNarrationTokens(tokens, language)), compact(text), `${language}: no spoken glyph or punctuation lost`)
    assert.equal(N.speechSeconds(text), count / N.WORDS_PER_SECOND, `${language}: film narration gate uses Unicode units`)
    assert.equal(D.estimarFalaSegundos(text, language), count / D.ritmoDoFilmeCurto(language), `${language}: short-film guard shares units`)
    assert.equal(P.countSpokenWords(text), count, `${language}: pasted script keeps its real unit count`)
    assert.equal(D.palavrasFaladas(text), count, `${language}: clip duration shares units`)
    const beats = B.resolveVerbatimSegments({ narration: text, segments: [] }, 4)
    assert.equal(beats.length, 4, `${language}: verbatim gets the requested visual beats`)
    assert.equal(compact(beats.map(b => b.voiceover).join('')), compact(text), `${language}: verbatim preserves every spoken glyph`)
    const plan = V.kling25VerbatimPlan(text, { durationSeconds: 15, wordsPerSecond: 2.5 })
    assert.ok(plan.chunks.length > 1, `${language}: short clip plan follows Unicode speech units`)
    assert.equal(compact(plan.chunks.join('')), compact(text), `${language}: clip plan does not lose narration`)
    const scenes = S.splitScriptToScenes(text)
    assert.ok(scenes.length > 1, `${language}: film scene splitter separates compact narration`)
    assert.equal(compact(scenes.map(s => s.narration).join('')), compact(text), `${language}: scene splitter preserves narration`)
    const blocks = A.cenaCaptionBlocks(text)
    assert.ok(blocks.length > 1, `${language}: captions split into readable blocks`)
    assert.equal(compact(blocks.join('')), compact(text), `${language}: blocks preserve full narration`)
    const karaoke = K.cena95Captions({ text, language, speechWindows: [{ start: 0, end: 12, text }] })
    assert.equal(karaoke.words.length, count, `${language}: karaoke uses each Unicode unit`)
    assert.ok(karaoke.elements.length > 1)
    assert.ok(karaoke.elements.every(e => e.font_family === font), `${language}: script font reaches karaoke payload`)
    assert.equal(C.setActiveCaptionFont(language), font)
    const timeline = tokens.slice(0, 6).map((word, k) => ({ word, start: k * .4, end: (k + 1) * .4 }))
    const captions = C.buildCaptionsFromWhisperWords(timeline, 2.4, 0)
    assert.equal(compact(captions.map(c => c.text).join('')), compact(T.joinNarrationTokens(tokens.slice(0, 6), language)), `${language}: Whisper chunks preserve natural spacing`)
    const elements = C.buildCaptionElements({ text: text.slice(0, 12), time: 0, duration: 2.4, karaokeWords: timeline })
    assert.ok(elements.every(e => e.font_family === font), `${language}: film karaoke receives Noto font`)
    assert.ok(elements.every(e => !/\p{Script=Han} \p{Script=Han}/u.test(e.text)), `${language}: karaoke does not insert Han spaces`)
    const choice = E.buildCenaEscolhaMontage(choiceState(language, text)), choiceCaptions = choice.elements.filter(e => e.track === 40)
    assert.ok(choiceCaptions.length > 1, `${language}: actual choice montage pages captions`)
    assert.ok(choiceCaptions.every(e => e.font_family === font), `${language}: choice montage receives script font`)
    assert.ok(choiceCaptions.every(e => e.time >= 0 && e.time + e.duration <= 13 && !/\p{Script=Han} \p{Script=Han}/u.test(e.text)), `${language}: complete captions remain in their allowed window`)
  }
  for (const [language, text] of [['ja', 'これは Apple Watch です。🌿 次の朝も歩きます。'], ['th', 'กล่อง Apple Watch สีฟ้า 🌿 อยู่ข้างบ้าน']]) {
    assert.equal(T.joinNarrationTokens(T.narrationTokens(text, language), language).normalize('NFC'), text.normalize('NFC'), `${language}: mixed labels, spaces, emoji and combining marks survive exactly`)
  }
  const F = L('lib/shortFilmScript.ts')
  assert.deepEqual(json(F.truncatedSentences('HOOK: 小猫发现了小鸟。\nPAYOFF: 它们一起回到了家。')), [], 'CJK punctuation is a complete sentence')
  const script = 'HOOK: 小猫发现了小鸟。它站在高高的树下。\nMICRO REWARD 1: 朋友们一起走进花园。他们找到了安全的道路。\nPAYOFF: 最后大家一起回到了温暖的家。'
  const fitted = F.fitShortFilmScript(script, { minWords: 1, maxWords: 20, hardMaxWords: 30, countWords: s => T.narrationWordCount(s.replace(/^[A-Z 0-9]+:/gm, '')) })
  assert.equal(fitted.cut, 'sentences', 'CJK fit removes whole optional sentences')
  assert.deepEqual(json(F.truncatedSentences(fitted.script)), [], 'CJK fit never truncates a sentence')
  return true
}
prove()
console.log('ok Unicode film gates, real choice montage, script fonts and karaoke')
// Old whitespace behavior is explicitly retained on the existing scripts.
{
  const now = load(), old = load(Object.fromEntries(['lib/narrationFit.ts', 'lib/durationByEngine.ts', 'lib/pastedScript.ts', 'lib/ads/v2CenaQuality.ts', 'lib/ads/cena/captions95.ts'].map(file => [file, base(file)])))
  for (const text of ['A small bird flies home. Another friend waits by the door.', 'Um pássaro encontra o seu caminho para casa.', 'नन्ही चिड़िया अपने घर लौट आई।', 'نجمة صغيرة تضيء الطريق إلى البيت.']) {
    assert.equal(now('lib/narrationFit.ts').speechSeconds(text), old('lib/narrationFit.ts').speechSeconds(text))
    assert.equal(now('lib/pastedScript.ts').countSpokenWords(text), old('lib/pastedScript.ts').countSpokenWords(text))
    assert.deepEqual(json(now('lib/ads/v2CenaQuality.ts').cenaCaptionBlocks(text)), json(old('lib/ads/v2CenaQuality.ts').cenaCaptionBlocks(text)))
  }
  assert.ok(old('lib/narrationFit.ts').speechSeconds(SAMPLES[0][1]) < now('lib/narrationFit.ts').speechSeconds(SAMPLES[0][1]), 'baseline reproduces one-token CJK defect')
}
for (const [label, file, from, to] of [
  ['film gate regresses to spaces', 'lib/narrationFit.ts', 'narrationWordCount(limpo)', "limpo.split(/\\s+/).filter(Boolean).length"],
  ['short-film guard regresses to spaces', 'lib/durationByEngine.ts', "narrationWordCount(String(narration ?? ''), language)", "String(narration ?? '').split(/\\s+/).filter(Boolean).length"],
  ['choice captions lose font', 'lib/ads/cena/escolhaMontage.ts', "fontFamily: captionFontFor(s.plan.input.language) === DEFAULT_CAPTION_FONT ? 'Inter' : captionFontFor(s.plan.input.language)", "fontFamily: 'Inter'"],
  ['karaoke loses font', 'lib/ads/cena/captions95.ts', "captionFontFor(i.language) === DEFAULT_CAPTION_FONT ? 'Inter' : captionFontFor(i.language)", "'Inter'"],
  ['caption chunker regresses to spaces', 'lib/ads/v2CenaQuality.ts', "narrationTokens(String(text ?? '').replace(/\\s+/gu, ' ').trim())", "String(text ?? '').trim().split(/\\s+/)"],
  ['verbatim scene plan regresses to one token', 'lib/cinematic/verbatimBeats.ts', 'narrationTokens(narration)', "narration.split(' ')"],
]) {
  const source = read(file)
  assert.equal(source.split(from).length, 2, `unique mutant anchor: ${label}`)
  let failure
  try { prove({ [file]: source.replace(from, to) }) } catch (error) { failure = error }
  assert.equal(failure?.code, 'ERR_ASSERTION', `mutant must fail behavior, never syntax/import: ${label}: ${failure?.message}`)
  console.log('ok mutant detected: ' + label)
}
console.log('ok language segmentation proof and behavioral mutants')
