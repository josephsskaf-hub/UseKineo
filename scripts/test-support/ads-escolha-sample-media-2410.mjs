// KINEO-AMOSTRA-ANUNCIO-2410 — production media builders/state machines with offline injected effects; no env/network/providers.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { createOfflineLoader } from './offline-ts-loader.mjs'
const root = 'lib/ads/cena/', plain = value => JSON.parse(JSON.stringify(value))
export async function proveEscolhaSampleMedia(over = {}) {
  const load = createOfflineLoader({ source: (p, s) => over[p] ?? s }), policy = load(root + 'escolhaSamplePolicy.ts')
  const planner = load(root + 'escolhaPlan.ts'), stills = load(root + 'escolhaStills.ts'), video = load(root + 'escolhaVideo.ts')
  const media = load(root + 'escolhaMedia.ts'), montage = load(root + 'escolhaMontage.ts'), pipe = load(root + 'pipeline.ts')
  const categories = Object.keys(load(root + 'catalog.ts').CENA_CATALOG), catalog = load(root + 'escolhaCatalog.ts')
  assert.equal(policy.ADS_ESCOLHA_SAMPLE_MARK, 'KINEO-AMOSTRA-ANUNCIO-2410'); assert.equal(policy.ADS_ESCOLHA_SAMPLE_LIVE, true)
  assert.equal(policy.ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS, 150); assert.ok(policy.ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS > policy.ADS_ESCOLHA_SAMPLE_KNOWN_MEDIA_CENTS)
  const script = { hooks: ['Conhece GLOW?', 'Já viu GLOW?', 'Vamos conhecer GLOW?'], use: 'Conheça GLOW.', benefit: 'Veja os detalhes.', cta: 'Saiba mais.' }
  const input = { foto: 'https://offline.example/product.png', frase: 'GLOW.', language: 'pt', formato: 'ugc', voice_mode: 'talking', cta: 'Saiba mais.', beneficios: [], oferta: '' }
  let sample
  for (const category of categories) for (const formato of ['ugc', 'product', 'product_in_hand', 'unboxing']) {
    const scene = catalog.CENA_ESCOLHA_SCENARIOS.find(s => s.category === category)
    const json = async call => call.images.length ? { category, confidence: .99, product: 'GLOW', benefits: [], offer: '' } : script
    const plan = await planner.planCenaEscolha({ ...input, formato }, 'kling3', json, { presenter_id: 'sofia', scenario_id: scene.id, category, sample: true })
    assert.equal(policy.isEscolhaSamplePlan(plan), true); assert.equal(policy.escolhaSeconds(plan), 8)
    assert.equal(plan.voice_mode, 'narrated'); assert.equal(plan.input.voice_mode, 'narrated')
    assert.ok(load('lib/textLanguage.ts').narrationWordCount(plan.script.narration, 'pt') <= 18)
    const requests = video.escolhaVideoRequests(plan, 'kling3', 'https://offline.example/chosen.png')
    assert.equal(requests.length, 1); const request = requests[0]
    assert.equal(request.seconds, 8); assert.equal(request.keepSeconds, 8); assert.equal(request.input.duration, '8'); assert.equal(request.input.generate_audio, false)
    assert.equal('end_image_url' in request.input, false); assert.equal('prompt' in request.input, false)
    assert.deepEqual(plain(request.input.multi_prompt.map(p => p.duration)), ['3', '3', '2'])
    for (const [index, p] of request.input.multi_prompt.entries()) { assert.ok(p.prompt.length <= 500); assert.match(p.prompt, /Product in frame/); assert.match(p.prompt, /Lips closed; silent/); assert.match(p.prompt, new RegExp(`Absolute${[0, 3, 6][index]}–${[3, 6, 8][index]}s`)) }
    assert.match(request.input.multi_prompt[2].prompt, /Label faces camera, no reveal turn/); assert.match(request.input.multi_prompt[2].prompt, /live movement to8s; no card/)
    assert.throws(() => video.escolhaVideoRequests(plan, 'veo31', input.foto), /sample_requires/)
    if (category === 'skincare' && formato === 'ugc') sample = plan
  }
  assert.ok(sample)
  const before = JSON.stringify(sample), full = planner.fullEscolhaPlan(sample)
  assert.equal(JSON.stringify(sample), before); assert.equal(policy.isEscolhaSamplePlan(full), false); assert.equal(policy.escolhaSeconds(full), 15)
  assert.equal(full.escolha.presenterId, sample.escolha.presenterId); assert.equal(full.escolha.scenarioId, sample.escolha.scenarioId); assert.equal(full.input.foto, sample.input.foto); assert.equal(full.script.narration, sample.script.narration)
  const paid = video.escolhaVideoRequests(full, 'kling3', 'https://offline.example/chosen.png')[0]
  assert.equal(paid.seconds, 15); assert.equal(paid.input.duration, '15'); assert.equal(paid.input.generate_audio, true); assert.deepEqual(plain(paid.input.multi_prompt.map(s => s.duration)), ['5', '5', '5'])
  assert.throws(() => planner.fullEscolhaPlan(full), /sample_plan_required/)
  const state = pipe.newCenaState(sample, 'kling3'), flow = stills.newEscolhaFlow(), stored = { cena: state, escolhaFlow: flow }
  let submissions = 0
  const deps = { now: () => 10, save: async () => {}, json: async () => ({ score: 88, product_boxes: [[.1, .35, .5, .5]], face_boxes: [[.2, .12, .4, .3]] }), submit: async () => ({ kind: 'accepted', requestId: `image-${++submissions}` }), poll: async () => ({ state: 'done', url: 'https://offline.example/generated.png' }), persist: async job => `https://offline.example/stored-${job.index}.png` }
  for (let i = 0; i < 4; i++) await stills.stepEscolhaStills(sample, flow, deps)
  assert.equal(submissions, 2); assert.equal(flow.stills.length, 2); assert.equal(flow.stage, 'choose')
  const view = stills.escolhaView(stored); assert.equal(view.sample, true); assert.equal(view.seconds, 8); assert.equal(view.max_photo_rounds, 1); assert.equal(view.can_regenerate, false)
  assert.throws(() => stills.restartEscolhaStills(sample, flow), /photo_round_limit/)
  stills.chooseEscolhaStill(stored, flow.stills[1].id); assert.equal(state.keyframe, flow.stills[1].url); assert.deepEqual(plain(state.keyframes), [flow.stills[1].url, flow.stills[1].url])
  const failFlow = stills.newEscolhaFlow(); let rejects = 0
  for (let i = 0; i < 4; i++) await stills.stepEscolhaStills(sample, failFlow, { ...deps, submit: async () => { rejects++; return { kind: 'rejected' } } })
  assert.equal(rejects, 2); assert.equal(failFlow.stage, 'failed'); assert.ok(failFlow.stills.every(j => j.attempt === 1))
  const voices = [], music = [], uploads = []
  const audioDeps = { now: () => 10, save: async () => {}, synthesize: async text => { voices.push(text); return { audio: 'offline-mp3', seconds: 7.1 } }, upload: async audio => { uploads.push(audio); return 'https://offline.example/voice.mp3' }, submitMusic: async () => { music.push('paid'); throw Error('sample must not generate music') }, pollMusic: async () => { throw Error('sample must not poll Lyria') } }
  assert.equal(await media.stepCenaEscolhaMedia(state, audioDeps), 'ready'); assert.equal(voices.length, 1); assert.equal(uploads.length, 1); assert.equal(music.length, 0); assert.equal(state.escolhaMedia.music.status, 'done')
  assert.match(state.escolhaMedia.music.url, /\/music\/[^/]+\.mp3$/)
  const tooLong = pipe.newCenaState(sample, 'kling3'); let longCalls = 0, longUploads = 0
  const longDeps = { ...audioDeps, synthesize: async () => { longCalls++; return { audio: 'long', seconds: 8.01 } }, upload: async () => { longUploads++; return 'https://offline.example/bad.mp3' } }
  assert.equal(await media.stepCenaEscolhaMedia(tooLong, longDeps), 'failed'); assert.equal(await media.stepCenaEscolhaMedia(tooLong, longDeps), 'failed'); assert.equal(longCalls, 1); assert.equal(longUploads, 0)
  state.phase = 'ready'; state.jobs = [{ kind: 'video', index: 0, status: 'done', url: 'https://offline.example/video.mp4', seconds: 8, keepSeconds: 8, measuredSeconds: 8 }]
  const result = montage.buildCenaEscolhaMontage(state); assert.equal(result.duration, 8)
  const watermark = result.elements.filter(e => e.text === 'usekineo.com'); assert.equal(watermark.length, 1); assert.equal(watermark[0].time, 0); assert.equal(watermark[0].duration, 8); assert.ok(watermark[0].font_size >= 36)
  assert.ok(result.elements.filter(e => e.type === 'video').every(e => e.volume === '0%' && e.duration === 8))
  assert.ok(result.elements.some(e => e.type === 'audio' && e.track === 60)); assert.ok(result.elements.some(e => e.type === 'audio' && e.track === 50 && e.duration === 7.1))
  assert.ok(result.elements.filter(e => [44, 45, 46].includes(e.track)).every(e => e.time >= 6 && e.time + e.duration <= 8))
  assert.ok(result.elements.every(e => e.time >= 0 && e.time + e.duration <= 8.00001))
  const failedVideo = pipe.newCenaState(sample, 'kling3'); failedVideo.phase = 'video'; failedVideo.jobs = [{ kind: 'video', status: 'failed', index: 0 }]
  let videoSubmits = 0
  await pipe.stepCena(failedVideo, { now: () => 10, save: async () => {}, event: async () => {}, submit: async () => { videoSubmits++; throw Error('must not resubmit') } })
  assert.equal(failedVideo.phase, 'failed'); assert.equal(failedVideo.videoAttempt, 1); assert.equal(videoSubmits, 0)
  const paidFailure = pipe.newCenaState(full, 'kling3'); paidFailure.phase = 'video'; paidFailure.jobs = [{ kind: 'video', status: 'failed', index: 0 }]
  await pipe.stepCena(paidFailure, { now: () => 10, save: async () => {}, event: async () => {} }); assert.equal(paidFailure.videoAttempt, 2); assert.equal(paidFailure.phase, 'video')
  return { categories: categories.length, formats: 4, offline: true }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { await proveEscolhaSampleMedia(); console.log('VERDE: KINEO-AMOSTRA-ANUNCIO-2410 media (offline)') }
