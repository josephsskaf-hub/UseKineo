// KINEO-AMOSTRA-ANUNCIO-2410 — production media builders/state machines with offline injected effects; no env/network/providers.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './offline-ts-loader.mjs'
const root = 'lib/ads/cena/', plain = value => JSON.parse(JSON.stringify(value))
export async function proveEscolhaSampleMedia(over = {}) {
  const load = createOfflineLoader({ source: (p, s) => over[p] ?? s }), policy = load(root + 'escolhaSamplePolicy.ts')
  const planner = load(root + 'escolhaPlan.ts'), stills = load(root + 'escolhaStills.ts'), video = load(root + 'escolhaVideo.ts')
  const media = load(root + 'escolhaMedia.ts'), montage = load(root + 'escolhaMontage.ts'), pipe = load(root + 'pipeline.ts')
  const categories = Object.keys(load(root + 'catalog.ts').CENA_CATALOG), catalog = load(root + 'escolhaCatalog.ts')
  assert.equal(policy.ADS_ESCOLHA_SAMPLE_MARK, 'KINEO-AMOSTRA-ANUNCIO-2410'); assert.equal(policy.ADS_ESCOLHA_SAMPLE_LIVE, true)
  assert.equal(policy.ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS, 150); assert.ok(policy.ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS >= policy.ADS_ESCOLHA_SAMPLE_KNOWN_MEDIA_CENTS)
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
  const longDraft = { ...script, use: 'Conheça GLOW e veja cada detalhe original da embalagem, das cores e da forma deste produto na sua rotina.' }
  const longPlan = await planner.planCenaEscolha(input, 'kling3', async call => call.images.length ? { category: 'skincare', confidence: .99, product: 'GLOW', benefits: [], offer: '' } : longDraft, { presenter_id: 'sofia', scenario_id: sample.escolha.scenarioId, category: 'skincare', sample: true })
  assert.ok(load('lib/textLanguage.ts').narrationWordCount(longPlan.script.narration, 'pt') <= 18, 'long draft must be fitted to 18 complete spoken words')
  const oversized = plain(sample); oversized.script.use = 'Este produto aparece aqui com todos os detalhes originais para você conhecer a embalagem e observar suas cores.'; oversized.script.narration = [oversized.script.hook, oversized.script.use, oversized.script.benefit, oversized.script.cta].filter(Boolean).join(' ')
  assert.throws(() => planner.preflightCenaEscolha(oversized, 'kling3'), /spoken_core_exceeds_8s/, 'runtime must independently reject a saved oversized sample script')
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
  for (let i = 0; i < 4; i++) { await stills.stepEscolhaStills(sample, failFlow, { ...deps, submit: async () => { rejects++; return { kind: 'rejected' } } }); assert.ok(rejects <= 2, 'failed sample stills must never buy replacement images') }
  assert.equal(rejects, 2); assert.equal(failFlow.stage, 'failed'); assert.ok(failFlow.stills.every(j => j.attempt === 1))
  const voices = [], music = [], uploads = []
  const audioDeps = { now: () => 10, save: async () => {}, synthesize: async text => { voices.push(text); return { audio: 'offline-mp3', seconds: 7.1 } }, upload: async audio => { uploads.push(audio); return 'https://offline.example/voice.mp3' }, submitMusic: async () => { music.push('paid'); throw Error('sample must not generate music') }, pollMusic: async () => { throw Error('sample must not poll Lyria') } }
  state.phase = 'ready' // Exercise the paid music dispatch stage too: a sample must still choose a library track.
  assert.equal(await media.stepCenaEscolhaMedia(state, audioDeps), 'ready'); assert.equal(voices.length, 1); assert.equal(uploads.length, 1); assert.equal(music.length, 0); assert.equal(state.escolhaMedia.music.status, 'done')
  assert.match(state.escolhaMedia.music.url, /\/music\/[^/]+\.mp3$/)
  const tooLong = pipe.newCenaState(sample, 'kling3'); let longCalls = 0, longUploads = 0
  const longDeps = { ...audioDeps, synthesize: async () => { longCalls++; return { audio: 'long', seconds: 8.01 } }, upload: async () => { longUploads++; assert.fail('oversized complete sample TTS may never be uploaded or trimmed') } }
  assert.equal(await media.stepCenaEscolhaMedia(tooLong, longDeps), 'failed'); assert.equal(await media.stepCenaEscolhaMedia(tooLong, longDeps), 'failed'); assert.equal(longCalls, 1); assert.equal(longUploads, 0)
  const retryVoice = pipe.newCenaState(sample, 'kling3'); let retryVoices = 0
  const retryVoiceDeps = { ...audioDeps, synthesize: async () => { retryVoices++; return { audio: 'too-long', seconds: 16 } } }
  assert.equal(await media.stepCenaEscolhaMedia(retryVoice, retryVoiceDeps), 'failed', 'an oversized TTS may not enter the paid shortening retry'); assert.equal(await media.stepCenaEscolhaMedia(retryVoice, retryVoiceDeps), 'failed'); assert.equal(retryVoices, 1)
  state.phase = 'ready'; state.jobs = [{ kind: 'video', index: 0, status: 'done', url: 'https://offline.example/video.mp4', seconds: 8, keepSeconds: 8, measuredSeconds: 8 }]
  const result = montage.buildCenaEscolhaMontage(state); assert.equal(result.duration, 8)
  const watermark = result.elements.filter(e => e.text === 'usekineo.com'); assert.equal(watermark.length, 1); assert.equal(watermark[0].time, 0); assert.equal(watermark[0].duration, 8); assert.ok(watermark[0].font_size >= 36); assert.equal(watermark[0].opacity, '100%')
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
/** Each mutant changes the actual production source only in the loader; a failed assertion is mandatory.
 * Syntax errors, missing imports and incidental production exceptions do not count as a killed mutant. */
export async function proveEscolhaSampleMediaMutants() {
  const cases = [
    ['four sample photos', 'escolhaSamplePolicy.ts', 'ADS_ESCOLHA_SAMPLE_PHOTOS = 2', 'ADS_ESCOLHA_SAMPLE_PHOTOS = 4'],
    ['paid still retry', 'escolhaStills.ts', 'maxRounds = sample ? 1 : ESCOLHA_PHOTO_ROUNDS, count', 'maxRounds = sample ? 2 : ESCOLHA_PHOTO_ROUNDS, count'],
    ['15-second provider request', 'escolhaVideo.ts', "duration: '8', generate_audio: false", "duration: '15', generate_audio: false"],
    ['native audio enabled', 'escolhaVideo.ts', "duration: '8', generate_audio: false", "duration: '8', generate_audio: true"],
    ['15-second delivered montage', 'escolhaMontage.ts', 'duration: seconds, snapshot_time: 1, elements', 'duration: 15, snapshot_time: 1, elements'],
    ['narration budget expanded', 'escolhaSamplePolicy.ts', 'ADS_ESCOLHA_SAMPLE_WORDS = 18', 'ADS_ESCOLHA_SAMPLE_WORDS = 30'],
    ['8-second TTS check bypassed', 'escolhaMedia.ts', 'if (seconds > outputSeconds)', 'if (seconds > 15)'],
    ['second paid TTS', 'escolhaMedia.ts', "if (sample) { voice.status = 'failed'; voice.reason = 'escolha_voice_core_does_not_fit_8s'; await d.save(s); return 'failed' }", 'if (false) { /* paid retry incorrectly allowed */ }'],
    ['missing watermark', 'escolhaMontage.ts', "text: 'usekineo.com'", "text: 'invisible.invalid'"],
    ['watermark lasts only two seconds', 'escolhaMontage.ts', "duration: seconds, text: 'usekineo.com'", "duration: 2, text: 'usekineo.com'"],
    ['transparent watermark', 'escolhaMontage.ts', "opacity: '100%'", "opacity: '0%'"],
    ['final copy runs past sample end', 'escolhaMontage.ts', 'r6(Number(e.time) - 7)', 'r6(Number(e.time) - 5)'],
    ['upgrade uses different product photo', 'escolhaPlan.ts', 'delete plan.escolha.sample', "delete plan.escolha.sample; plan.input.foto = 'https://offline.example/swapped.png'"],
    ['upgrade uses different presenter', 'escolhaPlan.ts', 'delete plan.escolha.sample', "delete plan.escolha.sample; plan.escolha.presenterId = 'amara'; plan.escolha.actorUrl = 'https://www.usekineo.com/ads/presenters/amara.webp'; plan.input.actorUrl = plan.escolha.actorUrl; plan.continuity!.actorUrl = plan.escolha.actorUrl"],
    ['upgrade uses different scenario', 'escolhaPlan.ts', 'delete plan.escolha.sample', "delete plan.escolha.sample; plan.escolha.scenarioId = 'skincare_vanity'; plan.escolha.captionLane = escolhaScenario('skincare_vanity')!.captionLane"],
    ['chosen preview replaced by product source', 'escolhaStills.ts', 'stored.cena.keyframe = j.url;', 'stored.cena.keyframe = stored.cena.plan.input.foto;'],
    ['paid Lyria reached', 'escolhaMedia.ts', 'if (sample) { // KINEO-AMOSTRA-ANUNCIO-2410 — an explicit mood', 'if (false) { // KINEO-AMOSTRA-ANUNCIO-2410 — an explicit mood'],
    ['video retry restored', 'pipeline.ts', "if (isEscolhaSamplePlan(s.plan)) { s.phase = 'failed'; s.reason = reason; await d.save(s); return }", 'if (false) { /* paid sample video retry incorrectly allowed */ }'],
    ['native ambience leaked into sample', 'escolhaMontage.ts', "mode === 'narrated' && !sample ? ESCOLHA_AMBIENT_VOLUME", "mode === 'narrated' ? ESCOLHA_AMBIENT_VOLUME"],
  ]
  const killed = []
  for (const [name, file, from, to] of cases) {
    const path = root + file, source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
    assert.equal(source.split(from).length - 1, 1, `mutant must apply exactly once: ${name}`)
    const mutated = source.replace(from, to); assert.notEqual(mutated, source, `mutant actually applied: ${name}`)
    let failure
    try { await proveEscolhaSampleMedia({ [path]: mutated }) } catch (error) { failure = error }
    assert.ok(failure, `survived media mutant: ${name}`)
    assert.equal(failure.code, 'ERR_ASSERTION', `mutant must fail behavior, not syntax/import/runtime: ${name}: ${failure.stack}`)
    killed.push(name)
  }
  return { killed: killed.length, mutants: killed, diskMutations: 0 }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { await proveEscolhaSampleMedia(); const mutants = await proveEscolhaSampleMediaMutants(); console.log(`VERDE: KINEO-AMOSTRA-ANUNCIO-2410 media + ${mutants.killed} behavioral mutants (offline, no disk mutation)`) }
