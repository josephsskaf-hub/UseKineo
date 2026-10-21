// KINEO-ADS-CENA-AJUSTE-2110 — final sobre cena contínua e voz única, provas com JSON real e mutantes offline.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const FILE = 'lib/ads/cena/montage.ts'
const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const plain = x => JSON.parse(JSON.stringify(x))
const product = 'https://offline.example/customer-product.png'
const normalize = text => String(text).replace(/\s+/g, ' ').trim()
export function fixtureState(mode = 'narrated', route = 'kling3', legacy = false) {
  return {
    plan: { marker: 'KINEO-ADS-CENA-2110', product: 'Pulse smartwatch', input: { foto: product, frase: 'Pulse smartwatch com bateria para sete dias', oferta: 'Frete grátis nesta semana', language: 'pt', formato: 'product' }, category: 'wearable', format: 'athlete_demo', actor: 'one runner', setting: 'a running track at dawn', interaction: 'looks at own watch', keyframePrompts: ['opening', 'use'], videoPrompt: 'continuous scene', segmentPrompts: ['first', 'second'], audioMode: mode === 'narrated' ? 'voiceover' : 'native', ...(!legacy ? { voice_mode: mode } : {}), script: { hooks: ['Seu treino tem companhia', 'Olhe o tempo no pulso', 'Uma corrida com Pulse'], hook: 'Seu treino tem companhia', use: 'Veja seu tempo no relógio Pulse enquanto corre na pista.', benefit: 'Bateria para sete dias.', cta: 'Peça o seu Pulse' , narration: 'Seu treino tem companhia. Veja seu tempo no relógio Pulse enquanto corre na pista. Bateria para sete dias. Peça o seu Pulse.' } },
    route, phase: 'ready', imageRound: 1, videoAttempt: 1,
    jobs: (route === 'veo31' ? [0, 1] : [0]).map(index => ({ endpoint: 'offline', input: {}, kind: 'video', index, seconds: route === 'veo31' ? 8 : 15, keepSeconds: route === 'veo31' && index === 1 ? 7 : route === 'veo31' ? 8 : 15, status: 'done', url: `https://offline.example/scene-${index}.mp4` })),
    ...(mode === 'narrated' ? { voiceUrl: 'https://offline.example/tts.mp3' } : {}),
  }
}
function load(over = {}) { return createOfflineLoader({ source: (p, text) => over[p] ?? text })(FILE) }
function verifyFinal(source, state) {
  assert.equal(source.duration, 15); assert.equal(source.frame_rate, 24)
  const els = source.elements
  assert.ok(els.every(e => e.type !== 'image' && e.type !== 'shape'), 'nenhum packshot, card, fundo cinza/preto ou painel opaco')
  assert.ok(!els.some(e => e.source === product), 'a foto cliente só pode ser referência fora do filme')
  assert.ok(!els.some(e => e.background_color || e.fill_color && e.type !== 'text'))
  const vids = els.filter(e => e.type === 'video')
  assert.deepEqual(plain(vids.map(e => [e.time, e.duration, e.source])), state.route === 'veo31' ? [[0, 8, state.jobs[0].url], [8, 7, state.jobs[1].url]] : [[0, 15, state.jobs[0].url]])
  assert.ok(vids.every(e => e.loop === false && e.trim_start === 0 && !e.enter_transition && e.fit === 'cover'))
  assert.equal(vids.at(-1).time + vids.at(-1).duration, 15, 'último take continua ao fim, sem foto congelada')
  const end = els.filter(e => e.type === 'text' && e.time === 13)
  assert.equal(end.length, state.plan.input.oferta ? 3 : 2)
  const expected = [state.plan.product, state.plan.input.oferta, state.plan.script.cta].filter(Boolean).map(normalize)
  assert.deepEqual(plain(end.map(e => normalize(e.text))), expected, 'nome, oferta digitada e CTA completos')
  assert.equal(new Set(end.map(e => e.track)).size, end.length)
  assert.ok(end.every(e => e.duration === 2 && e.fill_color === '#ffffff' && e.stroke_color === '#000000' && e.stroke_width === 7 && !('background_color' in e)))
  assert.ok(end.every(e => e.font_size <= 64 && e.font_size >= 12 && e.width === '84%' && e.y_anchor === '50%'))
  assert.ok(end.every(e => parseFloat(e.y) >= 62 && parseFloat(e.y) <= 72))
  const ranges = end.map(e => { const height = e.text.split('\n').length * e.font_size * 1.1; return [parseFloat(e.y) * 19.2 - height / 2, parseFloat(e.y) * 19.2 + height / 2] })
  assert.ok(ranges.every(([a, b]) => a >= 1920 * .56 - .1 && b <= 1480 + .1), 'texto fora da região do rosto e acima y1480')
  ranges.slice(1).forEach(([top], i) => assert.ok(top >= ranges[i][1], 'sem colisão entre linhas de finalização'))
  const captions = els.filter(e => e.track === 40)
  assert.ok(captions.every(e => Number(e.time) + Number(e.duration) <= 13 && e.font_size === 63 && !e.background_color))
  return true
}
export async function montageFinalProof(over = {}) {
  const M = load(over)
  for (const route of ['kling3', 'seedance2', 'veo31']) for (const mode of ['narrated', 'talking']) for (const legacy of [false, true]) {
    const s = fixtureState(mode, route, legacy), source = M.buildCenaMontage(s)
    verifyFinal(source, s)
    const videos = source.elements.filter(e => e.type === 'video'), audios = source.elements.filter(e => e.type === 'audio')
    assert.ok(videos.every(e => e.volume === (mode === 'narrated' ? '0%' : '100%')))
    assert.equal(audios.length, mode === 'narrated' ? 1 : 0, 'nenhuma música/voz concorrente')
    if (mode === 'narrated') assert.ok(audios[0].source === s.voiceUrl && audios[0].volume === '100%' && audios[0].duration === 15)
  }
  const explicit = fixtureState('narrated'); explicit.plan.audioMode = 'native'; assert.ok(M.buildCenaMontage(explicit).elements.filter(e => e.type === 'video').every(e => e.volume === '0%'), 'modo explícito vence áudio legado')
  const native = fixtureState('talking'); native.plan.audioMode = 'voiceover'; assert.equal(M.buildCenaMontage(native).elements.filter(e => e.type === 'audio').length, 0)
  const reversed = fixtureState('talking', 'veo31'); reversed.jobs.reverse(); const ordered = M.buildCenaMontage(reversed).elements.filter(e => e.type === 'video'); assert.ok(ordered[0].source.endsWith('scene-0.mp4') && ordered[1].source.endsWith('scene-1.mp4'))
  const dubbed = fixtureState('talking'); dubbed.voiceUrl = 'https://offline.example/accidental-dub.mp3'
  assert.throws(() => M.buildCenaMontage(dubbed), /cena_talking_voiceover_forbidden/)
  const silent = fixtureState('narrated'); delete silent.voiceUrl
  assert.throws(() => M.buildCenaMontage(silent), /cena_voiceover_required/)
  const bad = fixtureState(); bad.jobs[0].seconds = 14
  assert.throws(() => M.buildCenaMontage(bad), /cena_video_too_short/)
  const missing = fixtureState('talking', 'veo31'); missing.jobs.pop()
  assert.throws(() => M.buildCenaMontage(missing), /cena_video_not_ready/)
  const notReady = fixtureState(); notReady.phase = 'video'
  assert.throws(() => M.buildCenaMontage(notReady), /cena_video_not_ready/)
  const words = fixtureState(); words.plan.product = 'Relógio Pulse para acompanhar seus treinos diários'; words.plan.input.oferta = 'Frete grátis para todo o Brasil em pedidos feitos nesta semana, com entrega no endereço informado no momento da compra e embalagem original do produto'; words.plan.script.cta = 'Peça o seu relógio Pulse no site da marca'
  const wrapped = M.buildCenaMontage(words); verifyFinal(wrapped, words)
  assert.ok(wrapped.elements.filter(e => e.time === 13).some(e => e.font_size < 63), 'texto longo encolhe, nunca some/corta')
  const noOffer = fixtureState(); noOffer.plan.input.oferta = ''; verifyFinal(M.buildCenaMontage(noOffer), noOffer)
  return true
}
await montageFinalProof()
console.log('ok CENA contínua15s, Veo8+7, sem packshot/card/shape, final completo e sem colisão, vozes única/legada e TTS obrigatório')
const original = read(FILE)
const baseline = execFileSync('git', ['show', 'b77f8f79:lib/ads/cena/montage.ts'], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
let baseRed = false
try { await montageFinalProof({ [FILE]: baseline }) } catch { baseRed = true }
assert.ok(baseRed, 'na base o guardião deve ficar vermelho')
console.log('ok base b77f8f79 vermelha para o contrato novo')
const mutants = [
  ['volta áudio concorrente12%', "volume: mode === 'narrated' ? '0%' : '100%'", "volume: mode === 'narrated' ? '12%' : '100%'"],
  ['talking aceita dublagem', "if (mode === 'talking' && s.voiceUrl)", 'if (false)'],
  ['narrated sem TTS', "if (mode === 'narrated') elements.push", 'if (false) elements.push'],
  ['Veo perde últimos2s', 'duration = clips.length === 1 ? 15 : k === 0 ? 8 : 7', 'duration = clips.length === 1 ? 15 : k === 0 ? 8 : 5'],
  ['foto congelada reaparece', 'elements.push(...cenaFinalTextElements(s.plan, width, height))', "elements.push({ type: 'image', track: 70, time: 13, duration: 2, source: s.plan.input.foto }); elements.push(...cenaFinalTextElements(s.plan, width, height))"],
  ['painel cinza reaparece', 'elements.push(...cenaFinalTextElements(s.plan, width, height))', "elements.push({ type: 'shape', track: 70, time: 13, duration: 2, fill_color: '#888888' }); elements.push(...cenaFinalTextElements(s.plan, width, height))"],
  ['oferta é amputada', 'offer = clean(plan.input.oferta)', 'offer = clean(plan.input.oferta).slice(0, 6)'],
  ['take vira loop', 'loop: false, trim_start: 0', 'loop: true, trim_start: 0'],
  ['final sai zona segura', 'lastCenter = height * 0.72', 'lastCenter = height * 0.85'],
]
for (const [label, before, after] of mutants) {
  assert.equal(original.split(before).length - 1, 1, 'mutação aplicada uma vez: ' + label)
  let red = false
  try { await montageFinalProof({ [FILE]: original.replace(before, after) }) } catch { red = true }
  assert.ok(red, 'mutante precisa ficar vermelho: ' + label)
  console.log('ok mutante vermelho: ' + label)
}
