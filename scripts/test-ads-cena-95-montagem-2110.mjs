// KINEO-ADS-CENA-95-2110 — real modules via fail-closed offline loader; no SDK, provider, env, database or render.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const CAP = 'lib/ads/cena/captions95.ts', MONT = 'lib/ads/cena/montage95.ts'
const plain = x => JSON.parse(JSON.stringify(x))
const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const strip = s => s.replace(/\[\/?color(?: #[A-Fa-f0-9]+)?\]/g, '').replace(/\s+/g, ' ').trim()
export function fixture95(mode = 'narrated', route = 'kling3') {
  const hook = 'Seu treino merece companhia no pulso.'
  const use = 'Conheça o relógio Pulse, acompanhe cada passo na pista e consulte seu ritmo enquanto corre com conforto na rotina pela manhã.'
  const benefit = 'Bateria para sete dias e tela clara.'
  const cta = 'Peça agora o seu relógio Pulse.'
  const plan = { marker: 'KINEO-ADS-CENA-2110', input: { foto: 'https://offline.example/real-customer-photo.png', frase: 'Relógio Pulse', oferta: 'Frete grátis nesta semana', language: 'pt', formato: 'product', voice_mode: mode }, category: 'wearable', product: 'Relógio Pulse', format: 'athlete_demo', setting: 'running track', actor: 'runner', interaction: 'looks at own watch', script: { hook, hooks: [hook, 'O tempo acompanha seu ritmo.', 'Corra com seu relógio Pulse.'], use, benefit, cta, narration: [hook, use, benefit, cta].join(' ') }, keyframePrompts: ['opening', 'use'], videoPrompt: 'fixture', segmentPrompts: ['fixture1', 'fixture2'], audioMode: mode === 'narrated' ? 'voiceover' : 'native', voice_mode: mode }
  const first = 'https://offline.example/person-use-0.mp4', second = 'https://offline.example/person-use-1.mp4', close = 'https://offline.example/photo-i2v-close.mp4'
  const selectedClips = route === 'veo31' ? [
    { url: first, kind: 'hook', seconds: 8, keepSeconds: 3, start: 0, trimStart: 0, hasSpeech: mode === 'talking' },
    { url: first, kind: 'use', seconds: 8, keepSeconds: 5, start: 3, trimStart: 3, hasSpeech: mode === 'talking' },
    { url: second, kind: 'use', seconds: 8, keepSeconds: 2, start: 8, trimStart: 0, hasSpeech: mode === 'talking' },
    { url: close, kind: 'close', seconds: 6, keepSeconds: 5, start: 10, hasSpeech: false, photoReference: plan.input.foto },
  ] : [
    { url: first, kind: 'hook', seconds: mode === 'talking' ? 15 : 10, keepSeconds: 3, start: 0, hasSpeech: mode === 'talking' },
    { url: first, kind: 'use', seconds: mode === 'talking' ? 15 : 10, keepSeconds: 7, start: 3, trimStart: 3, hasSpeech: mode === 'talking' },
    { url: close, kind: 'close', seconds: 5, keepSeconds: 5, start: 10, hasSpeech: false, photoReference: plan.input.foto },
  ]
  return { plan, selectedClips, ...(mode === 'narrated' ? { voiceUrl: 'https://offline.example/tts.mp3', voiceSeconds: 15 } : { nativeAudioClips: route === 'veo31' ? [{ url: first, start: 0, seconds: 8, keepSeconds: 8, hasSpeech: true }, { url: second, start: 8, seconds: 8, keepSeconds: 7, hasSpeech: true }] : [{ url: first, start: 0, seconds: 15, keepSeconds: 15, hasSpeech: true }] }), musicUrl: 'https://offline.example/lyria-sport.mp3' }
}
function modules(over = {}) { const load = createOfflineLoader({ source: (p, s) => over[p] ?? s }); return { C: load(CAP), M: load(MONT) } }
function assertTimeline(els, end) {
  let at = 0
  for (const e of els) { assert.ok(Math.abs(e.time - at) < .00001); at += e.duration }
  assert.ok(Math.abs(at - end) < .00001)
}
export function proof95(over = {}) {
  const { C, M } = modules(over), s = fixture95()
  assert.equal(s.plan.script.narration.split(/\s+/).length, 40)
  assert.ok(s.plan.script.hook.split(/\s+/).length <= 7)
  const windows = C.cena95DefaultWindows(s.plan.script)
  assert.equal(windows[0].end, 1.5); assert.equal(windows.at(-1).start, 13.35)
  assert.ok(windows[2].end <= 13, 'pausa13–13.35 antes do CTA')
  assert.equal(C.cena95Syllables('a', 'pt'), 1)
  assert.ok(C.cena95Syllables('tecnologia', 'pt') > C.cena95Syllables('a', 'pt'))
  assert.ok(C.cena95Syllables('extraordinary', 'en') > C.cena95Syllables('the', 'en'))
  assert.notEqual(C.cena95Syllables('saudade', 'pt'), C.cena95Syllables('saudade', 'en'), 'o idioma muda o peso, não só o rótulo')
  const syllable = C.cena95Captions({ text: 'a tecnologia', language: 'pt', speechWindows: [{ text: 'a tecnologia', start: 0, end: 3 }] })
  assert.equal(syllable.timingSource, 'syllable_estimate'); assert.ok(syllable.words[1].end - syllable.words[1].start > 2)
  const estimated = C.cena95Captions({ text: s.plan.script.narration, language: 'pt', speechWindows: windows })
  assert.equal(estimated.timingSource, 'syllable_estimate'); assert.equal(estimated.words.length, 40)
  assert.ok(!estimated.words.some(w => w.start < 13.35 && w.end > 13), 'estimativa respeita silêncio CTA')
  const provided = plain(estimated.words).map(w => ({ ...w, end: Math.max(w.start + .001, w.end - .01) }))
  const measured = C.cena95Captions({ text: s.plan.script.narration, language: 'pt', words: provided })
  assert.equal(measured.timingSource, 'provided_alignment'); assert.deepEqual(plain(measured.words), provided, 'timestamps reais preservados exatamente')
  const blocks = new Map()
  for (const e of measured.elements) {
    assert.equal(e.font_size, 63); assert.equal(e.stroke_width, 7); assert.equal(e.fill_color, '#ffffff'); assert.equal(e.stroke_color, '#000000'); assert.equal(e.y, '67%')
    assert.ok(!e.background_color && !e.background); assert.ok(!e.type.includes('shape'))
    const k = strip(e.text); blocks.set(k, true)
    if (/\[color/.test(e.text)) assert.equal((e.text.match(/\[color #FFD400\]/g) ?? []).length, 1, 'só a palavra ativa amarela')
    assert.ok(e.time >= 0 && e.time + e.duration <= 15 + .00001)
  }
  for (const block of blocks.keys()) assert.ok(block.split(' ').length >= 3 && block.split(' ').length <= 6, 'blocos3–6 palavras')
  assert.equal([...blocks.keys()].join(' '), s.plan.script.narration)
  assert.ok(measured.elements.some(e => e.text.includes('[color #FFD400]Seu[/color]')))
  const naturalPauses = provided.map((w, k) => ({ ...w, start: k * .3, end: k * .3 + .1 }))
  const paused = C.cena95Captions({ text: s.plan.script.narration, language: 'pt', words: naturalPauses })
  assert.ok(paused.elements.every(e => { const count = strip(e.text).split(' ').length; return count >= 3 && count <= 6 }), 'pausas naturais não viram legenda de uma palavra')
  const reversed = plain(provided); reversed[1].start = 0
  assert.throws(() => C.cena95Captions({ text: s.plan.script.narration, language: 'pt', words: reversed }), /alignment/)
  assert.throws(() => C.cena95Captions({ text: s.plan.script.narration, language: 'pt', words: [] }), /alignment/)
  assert.throws(() => C.cena95Captions({ text: 'produto [color #ff0000]', language: 'pt', speechWindows: [{ text: 'produto [color #ff0000]', start: 0, end: 2 }] }), /bad_text/)
  assert.throws(() => C.cena95Captions({ text: 'texto real', language: 'pt', speechWindows: [{ text: 'texto inventado', start: 0, end: 2 }] }), /mismatch/)
  for (const mode of ['narrated', 'talking']) for (const route of ['kling3', 'seedance2', 'veo31']) {
    const f = fixture95(mode, route), out = M.buildCena95Montage(f), els = out.elements
    assert.equal(out.duration, 15); assert.equal(out.frame_rate, 24); assert.equal(out.height, 1920)
    assert.ok(els.every(e => ['video', 'text', 'audio'].includes(e.type)), 'sem imagem parada, cartão ou caixa')
    const videos = els.filter(e => e.type === 'video')
    assertTimeline(videos, 15)
    assert.equal(videos[0].duration, 3); assert.equal(videos.at(-1).time, 10); assert.equal(videos.at(-1).duration, 5)
    assert.ok(videos.every(e => e.volume === '0%' && e.loop === false && e.track === 2))
    assert.equal(videos.at(-1).source, f.selectedClips.at(-1).url)
    assert.ok(!els.some(e => e.source === f.plan.input.foto), 'foto só como referência do i2v, nunca foto congelada no filme')
    const voice = els.filter(e => e.type === 'audio' && e.track === 50)
    assertTimeline(voice, 15); assert.ok(voice.every(e => e.volume === '100%'))
    assert.equal(voice[0].source, mode === 'narrated' ? f.voiceUrl : f.nativeAudioClips[0].url)
    if (route === 'veo31') { assert.deepEqual(plain(videos.map(e => [e.time, e.duration, e.trim_start])), [[0, 3, 0], [3, 5, 3], [8, 2, 0], [10, 5, 0]]); if (mode === 'talking') assert.deepEqual(plain(voice.map(e => [e.time, e.duration])), [[0, 8], [8, 7]]) }
    const final = els.filter(e => e.type === 'text' && e.time === 13)
    assert.deepEqual(plain(final.map(e => strip(e.text))), [f.plan.product, f.plan.input.oferta, f.plan.script.cta])
    assert.equal(new Set(final.map(e => e.track)).size, 3); assert.ok(final.every(e => (e.track === 46 ? e.duration === .35 : e.duration === 2) && !e.background_color))
    const ctas = els.filter(e => e.type === 'text' && e.track === 46)
    assert.ok(ctas.every(e => strip(e.text) === f.plan.script.cta))
    assert.ok(ctas.some(e => e.text.includes('[color #FFD400]')), 'palavra do CTA também destaca na trilha final')
    let ctaAt = 13; for (const e of ctas) { assert.ok(Math.abs(e.time - ctaAt) < .00001); ctaAt += e.duration }; assert.ok(Math.abs(ctaAt - 15) < .00001)
    assert.ok(els.filter(e => e.track === 40).every(e => e.time + e.duration <= 13 + .00001))
    const music = els.filter(e => e.type === 'audio' && e.track === 60)
    assertTimeline(music, 15)
    assert.ok(music.every(e => e.trim_start === e.time && !e.loop), 'música contínua, nunca reinicia nem combina loop+trim')
    assert.ok(music.some(e => Math.abs(parseFloat(e.volume) - Math.pow(10, -18 / 20) * 100) < .00001))
    assert.ok(music.some(e => Math.abs(parseFloat(e.volume) - Math.pow(10, -24 / 20) * 100) < .00001), 'duck sob fala')
    assert.ok(music.some(e => e.time === 13 && e.duration === .35 && parseFloat(e.volume) > 12), 'música sobe na pausa CTA')
  }
  const wrongPhoto = fixture95(); wrongPhoto.selectedClips.at(-1).photoReference = 'https://offline.example/other.png'; assert.throws(() => M.buildCena95Montage(wrongPhoto), /real_photo/)
  const short = fixture95(); short.selectedClips.at(-1).seconds = 4; assert.throws(() => M.buildCena95Montage(short), /timeline/)
  const hand = fixture95(); hand.selectedClips.at(-1).hasSpeech = true; assert.throws(() => M.buildCena95Montage(hand), /real_photo/)
  const missing = fixture95('talking'); delete missing.nativeAudioClips; assert.throws(() => M.buildCena95Montage(missing), /native_audio/)
  const mute = fixture95('talking'); mute.nativeAudioClips[0].hasSpeech = false; assert.throws(() => M.buildCena95Montage(mute), /native_audio/, 'talking jamais pode entregar áudio marcado sem fala')
  const partlyMute = fixture95('talking', 'veo31'); partlyMute.nativeAudioClips[1].hasSpeech = false; assert.throws(() => M.buildCena95Montage(partlyMute), /native_audio/, 'a última frase/CTA nativa também precisa de fala')
  const tts = fixture95('talking'); tts.voiceUrl = 'https://offline.example/wrong-tts.mp3'; assert.throws(() => M.buildCena95Montage(tts), /tts_forbidden/)
  const silent = fixture95(); delete silent.voiceUrl; assert.throws(() => M.buildCena95Montage(silent), /narration_required/)
  const noMusic = fixture95(); delete noMusic.musicUrl; assert.ok(!M.buildCena95Montage(noMusic).elements.some(e => e.track === 60))
  noMusic.musicUrl = 'invalid'; assert.ok(!M.buildCena95Montage(noMusic).elements.some(e => e.track === 60), 'música opcional não bloqueia')
  const duplicate = fixture95(); duplicate.selectedClips.push({ ...duplicate.selectedClips[1] }); assert.throws(() => M.buildCena95Montage(duplicate), /timeline/)
  return true
}
export function run95() {
  proof95(); console.log('ok 95: 3 tomadas lógicas, close i2v real, Veo8+7, voz nativa preservada, legenda ativa real/estimada e música com duck')
  const html = read('docs/previews/ads-cena-95-montagem-2110.html')
  const preview = JSON.parse(html.match(/id="after-render-script">([\s\S]*?)<\/script>/)[1])
  assert.deepEqual(preview, plain(modules().M.buildCena95Montage(fixture95())), 'preview guarda exatamente o JSON real do módulo')
  assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)=["']https?:/i.test(html), 'preview autocontido sem asset remoto')
  assert.equal(readFileSync('docs/previews/ads-cena-95-montagem-2110.png').subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  console.log('ok preview HTML/PNG autocontido, desktop/mobile, JSON real e fixture offline')
  const mutations = [
    [CAP, 'palavra ativa perde amarelo', '[color #FFD400]', '[color #ffffff]'],
    [CAP, 'timing vira contagem de palavras', 'parts.map(s => cena95Syllables(s, i.language))', 'parts.map(() => 1)'],
    [CAP, 'CTA perde pausa', 'start: 13.35, end: 15', 'start: 13, end: 15'],
    [CAP, 'legenda ganha caixa', "fill_color: '#ffffff', stroke_color:", "background_color: '#000000', fill_color: '#ffffff', stroke_color:"],
    [CAP, 'legenda abaixo área segura', "y: '67%'", "y: '84%'"],
    [CAP, 'legenda desproporcional', 'height * 0.033', 'height * 0.07'],
    [CAP, 'alinhamento real descartado', 'word: textWords[k], start: w.start, end: w.end', 'word: textWords[k], start: w.start, end: w.end - .02'],
    [MONT, 'close aceita referência errada', 'close[0].photoReference !== s.plan.input.foto', 'false'],
    [MONT, 'áudio vídeo concorre TTS', "height: '100%', volume: '0%'", "height: '100%', volume: '100%'"],
    [MONT, 'música perde duck', 'duck ? CENA95_DUCK_DB : CENA95_MUSIC_DB', 'CENA95_MUSIC_DB'],
    [MONT, 'música reinicia a cada corte', 'trim_start: start', 'trim_start: 0'],
    [MONT, 'talking aceita TTS', "if (mode === 'talking' && s.voiceUrl)", 'if (false)'],
    [MONT, 'talking aceita trecho nativo sem fala', ' || !native.every(c => c.hasSpeech === true)', ''],
    [MONT, 'close vira imagem parada', "type: 'video', track: 2", "type: 'image', track: 2"],
    [MONT, 'CTA final perde destaque', '[color #FFD400]${part}[/color]', '[color #ffffff]${part}[/color]'],
  ]
  for (const [file, label, before, after] of mutations) {
    const original = read(file)
    assert.equal(original.split(before).length - 1, 1, 'mutação aplicada exatamente uma vez: ' + label)
    let red = false
    try { proof95({ [file]: original.replace(before, after) }) } catch { red = true }
    assert.ok(red, 'mutante real precisa ficar vermelho: ' + label)
    console.log('ok mutante vermelho: ' + label)
  }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) run95()
