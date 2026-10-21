// KINEO-ADS-CENA-2110 · KINEO-ADS-CENA-AJUSTE-2110 — intenção de voz e continuidade, provas offline e mutantes.
// Sem fal/OpenAI, credenciais, rede, banco ou render: efeitos existem somente nos dublês abaixo.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const F = { plan: 'lib/ads/cena/plan.ts', adapt: 'lib/ads/cena/adapters.ts', cat: 'lib/ads/cena/catalog.ts', internal: 'lib/ads/cena/internal.ts', pipe: 'lib/ads/cena/pipeline.ts', runtime: 'lib/ads/cena/runtime.ts' }
const plain = value => JSON.parse(JSON.stringify(value))
const same = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message)
const photo = 'https://offline.example/product.png', actor = 'https://offline.example/actor.png'
const customer = { foto: photo, frase: 'Pulse smartwatch for running. 7-day battery. Free shipping.', oferta: 'Free shipping', beneficios: ['7-day battery'], language: 'en', formato: 'ugc', actorUrl: actor }
const classification = { category: 'wearable', confidence: 0.9, product: 'Pulse smartwatch', offer: 'Free shipping', benefits: ['7-day battery'] }
const script = { hooks: ['Need a watch for your run?', 'Take Pulse on your next run.', 'A smartwatch for your daily run.'], use: 'Wear Pulse while you run.', benefit: '7-day battery. Free shipping.', cta: 'Shop Pulse now.' }
const verdict = { own_hands_attached: true, extra_hands: false, extra_people: false, product_whole: true, product_faithful: true, real_scale: true, touching_face: false, actor_identity_match: true, wardrobe_match: true, product_wrist_match: true, score: 93 }
const server = { v2Json: (body, status = 200) => new Response(JSON.stringify(body), { status }), v2Fail: (error, status) => new Response(JSON.stringify({ error }), { status }) }
function loader(over = {}, mocks = {}) { return createOfflineLoader({ mocks, globals: { Response, Request, Error }, source: (file, source) => over[file] ?? source }) }
async function makePlan(over = {}, route = 'kling3', values = {}, category = 'wearable') {
  const load = loader(over), P = load(F.plan), calls = []
  const plan = await P.planCena(P.cenaInput({ ...customer, ...values }), route, async call => { calls.push(plain(call)); return call.images.length ? { ...classification, category } : script })
  return { load, P, plan, calls }
}
const requestData = plan => ({ keyframeUrl: 'https://offline.example/opening', endKeyframeUrl: 'https://offline.example/use', productUrl: photo, prompt: plan.videoPrompt, segmentPrompts: plan.segmentPrompts, language: plan.input.language, voiceMode: plan.voice_mode })
function internalDeps(counters, inserted) {
  return {
    json: async call => { counters.json++; return call.images.length ? classification : script },
    moderate: async () => { counters.moderate++; return true },
    admin: { from: table => { counters.db++; assert.equal(table, 'ads_v2_orders'); return { insert: row => { inserted.push(plain(row)); return { select: () => ({ maybeSingle: async () => ({ error: null, data: { id: 'offline-order' } }) }) } } } } },
    start: async id => { counters.start++; assert.equal(id, 'offline-order'); return server.v2Json({ order_id: id, status: 'generating', charged: true }, 202) },
  }
}
async function defaultsProof(over = {}) {
  const load = loader(over, { '../v2Server': server }), I = load(F.internal), P = load(F.plan), A = load(F.adapt)
  assert.equal(P.cenaInput(customer).voice_mode, 'narrated')
  assert.throws(() => P.cenaInput({ ...customer, voice_mode: 'auto' }), /cena_bad_voice_mode/)
  assert.equal(A.cenaResolveRoute('narrated'), 'kling3'); assert.equal(A.cenaResolveRoute('talking'), 'veo31')
  for (const scenario of [{}, { voice_mode: 'talking' }, { rota: 'veo31' }, { rota: 'seedance2', voice_mode: 'narrated' }]) {
    const counters = { json: 0, moderate: 0, db: 0, start: 0 }, inserted = [], deps = internalDeps(counters, inserted)
    const response = await I.internalCenaFor({ id: 'owner', email: 'josephsskaf@gmail.com' }, { ...customer, ...scenario, dry_run: true }, deps)
    assert.equal(response.status, 200)
    const result = await response.json(), mode = scenario.voice_mode ?? 'narrated', route = scenario.rota ?? (mode === 'talking' ? 'veo31' : 'kling3')
    assert.equal(result.voice_mode, mode); assert.equal(result.rota, route)
    assert.equal(result.plan.voice_mode, mode); assert.equal(result.plan.input.voice_mode, mode)
    assert.equal(result.plan.audioMode, mode === 'narrated' ? 'voiceover' : 'native')
    assert.equal(result.costs[route].voice_mode, mode); assert.equal(result.charged, false)
    assert.equal(counters.json, 2); assert.equal(counters.db, 0); assert.equal(counters.start, 0)
    const live = await I.internalCenaFor({ id: 'owner', email: 'josephsskaf@gmail.com' }, { ...customer, ...scenario }, deps)
    assert.equal(live.status, 202)
    const started = await live.json(); assert.equal(started.voice_mode, mode); assert.equal(started.rota, route)
    assert.equal(started.costs[route].voice_mode, mode); assert.equal(counters.start, 1)
    assert.equal(inserted[0].brief.voice_mode, mode); assert.equal(inserted[0].plan.cena.plan.voice_mode, mode); assert.equal(inserted[0].plan.cena.route, route)
  }
}
async function narrationProof(over = {}) {
  for (const language of ['en', 'pt', 'es', 'zh']) {
    const { plan, load } = await makePlan(over, 'kling3', { language }), A = load(F.adapt)
    assert.equal(plan.voice_mode, 'narrated'); assert.equal(plan.audioMode, 'voiceover')
    for (const prompt of [plan.videoPrompt, ...plan.segmentPrompts]) {
      assert.match(prompt, /No speech, dialogue, narration or lip-sync/); assert.match(prompt, /Lips remain closed throughout every frame/)
      assert.ok(!prompt.includes(script.hooks[0]), 'roteiro do TTS não é dado como fala ao modelo de vídeo')
      assert.ok(!prompt.includes(script.benefit)); assert.ok(!prompt.includes(script.cta))
      assert.doesNotMatch(prompt, /say ONLY:|Speak only these exact words|covered|packshot|head-and-shoulders shot/i)
    }
    for (const route of ['kling3', 'seedance2', 'veo31']) for (const request of A.cenaVideoRequests(route, requestData(plan))) {
      assert.equal(request.input.generate_audio, false, route + ' narrado: áudio nativo desligado em qualquer idioma')
      assert.match(request.input.prompt, /no speech, no dialogue, no narration, no lip-sync/)
      assert.match(request.input.prompt, /Lips remain closed/)
    }
  }
}
async function talkingProof(over = {}) {
  for (const category of ['wearable', 'skincare', 'other']) {
    const { plan, load } = await makePlan(over, 'veo31', { voice_mode: 'talking', language: 'pt' }, category)
    assert.equal(plan.voice_mode, 'talking'); assert.equal(plan.audioMode, 'native'); assert.equal(plan.format, 'talking_presenter')
    assert.doesNotMatch(plan.actor, /only.*(?:forearms|arms|hands)/i)
    for (const prompt of [...plan.keyframePrompts, plan.videoPrompt, ...plan.segmentPrompts]) {
      assert.match(prompt, /face and mouth fully visible/i)
      assert.doesNotMatch(prompt, /only their own (?:forearms|arms).*visible|no talking face|covered|packshot/i)
    }
    for (const prompt of [plan.videoPrompt, ...plan.segmentPrompts]) {
      assert.match(prompt, /speaking mouth visible and unobstructed for the ENTIRE segment/)
      assert.match(prompt, /Continuous face-to-camera speech with lip-sync/)
      assert.doesNotMatch(prompt, /separate TTS|Lips remain closed/)
    }
    const requests = load(F.adapt).cenaVideoRequests('veo31', requestData(plan))
    assert.equal(requests.length, 2); same(requests.map(r => r.keepSeconds), [8, 7])
    assert.ok(requests.every(r => r.input.generate_audio === true))
    const spoken = plan.segmentPrompts.map(p => p.split('say ONLY: ')[1].split('. End mid-action.')[0].split('. Do not repeat the opening.')[0])
    const words = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()
    assert.equal(words(spoken.join(' ')), words(plan.script.narration), 'falas Veo particionam roteiro uma vez sem repetir o gancho')
    assert.ok(!plan.segmentPrompts[1].includes(plan.script.hook))
    assert.match(plan.videoPrompt, /13–15s continue the same live interaction and natural movement until the final frame/)
    assert.match(plan.videoPrompt, /medium face-to-camera frame with the product clearly visible, never a product-only closeup/)
    assert.doesNotMatch(plan.videoPrompt, /show a close clear view/)
  }
  const { plan, load } = await makePlan(over, 'kling3', { voice_mode: 'talking', language: 'en' })
  assert.equal(load(F.adapt).cenaVideoRequests('kling3', requestData(plan))[0].input.generate_audio, true)
  const seedance = await makePlan(over, 'seedance2', { voice_mode: 'talking', language: 'es' })
  assert.equal(seedance.load(F.adapt).cenaVideoRequests('seedance2', requestData(seedance.plan))[0].input.generate_audio, true)
}
async function refusalProof(over = {}) {
  const load = loader(over, { '../v2Server': server }), I = load(F.internal), P = load(F.plan), A = load(F.adapt)
  for (const language of ['pt', 'es', 'fr']) {
    let json = 0
    await assert.rejects(P.planCena(P.cenaInput({ ...customer, language, voice_mode: 'talking' }), 'kling3', async () => { json++; return classification }), /cena_kling_native_speech_unsupported/)
    assert.equal(json, 0, 'recusa antes do classificador pago')
    assert.throws(() => A.cenaVideoRequests('kling3', { keyframeUrl: photo, productUrl: photo, prompt: 'Face speaking.', language, voiceMode: 'talking' }), /cena_kling_native_speech_unsupported/)
    for (const dry_run of [true, false]) {
      const counters = { json: 0, moderate: 0, db: 0, start: 0 }, deps = internalDeps(counters, [])
      const response = await I.internalCenaFor({ id: 'owner', email: 'josephsskaf@gmail.com' }, { ...customer, language, voice_mode: 'talking', rota: 'kling3', dry_run }, deps)
      assert.equal(response.status, 400); assert.equal((await response.json()).error, 'cena_kling_native_speech_unsupported')
      same(counters, { json: 0, moderate: 0, db: 0, start: 0 }, 'nenhuma chamada, gravação ou cobrança antes da recusa')
    }
  }
}
async function continuityProof(over = {}) {
  const { plan, load } = await makePlan(over), pipe = load(F.pipe), C = load(F.cat), state = pipe.newCenaState(plan, 'kling3')
  assert.equal(plan.continuity.actorUrl, actor); assert.equal(plan.continuity.wardrobe, C.CENA_WARDROBE.wearable); assert.equal(plan.continuity.productWrist, 'left')
  const judge = load(F.plan).judgeCena
  assert.equal(judge(verdict, plan.continuity).approved, true)
  for (const key of ['wardrobe_match', 'product_wrist_match']) {
    assert.equal(judge({ ...verdict, [key]: false }, plan.continuity).approved, false)
    const missing = { ...verdict }; delete missing[key]
    assert.equal(judge(missing, plan.continuity).approved, false, 'continuidade desconhecida reprova antes do vídeo: ' + key)
    assert.equal(judge(missing).approved, true, 'juiz de pedido legado não exige novo campo: ' + key)
  }
  const images = [], videos = []; let judged = 0
  const d = {
    now: () => 1_000_000, save: async () => {}, event: async () => {},
    json: async call => { judged++; assert.ok(call.text.includes(C.CENA_WARDROBE.wearable)); assert.match(call.text, /actor LEFT wrist/); return { ...verdict, own_hands_attached: judged > 4 } },
    submit: async job => { (job.kind === 'image' ? images : videos).push(plain(job)); return { kind: 'accepted', requestId: 'offline-' + images.length + '-' + videos.length } },
    poll: async job => job.kind === 'video' && state.videoAttempt === 1 ? { state: 'failed', url: null } : { state: 'done', url: photo },
    persist: async job => 'https://offline.example/' + job.kind + '-' + state.imageRound + '-' + job.index,
  }
  for (let n = 0; n < 70 && !['ready', 'failed'].includes(state.phase); n++) await pipe.stepCena(state, d)
  assert.equal(state.phase, 'ready'); assert.equal(state.imageRound, 2); assert.equal(state.videoAttempt, 2)
  assert.equal(images.length, 8, 'dois keyframes × dois candidatos × duas rodadas'); assert.equal(videos.length, 2)
  for (const request of [...images, ...videos]) {
    const prompt = request.input.prompt
    assert.match(prompt, /CONTINUITY LOCK for every keyframe, shot and retry/)
    assert.ok(prompt.includes(actor)); assert.ok(prompt.includes(C.CENA_WARDROBE.wearable))
    assert.match(prompt, /LEFT wrist throughout; never the right wrist, never mirrored, never switching arms/)
  }
  for (const request of images) same(request.input.image_urls, [photo, actor], 'mesmo retrato exato em todos os oito candidatos')
  for (const request of videos) { assert.equal(request.input.generate_audio, false); assert.ok(request.input.start_image_url); assert.ok(request.input.end_image_url) }
  for (const key of ['wardrobe_match', 'product_wrist_match']) {
    const rejected = pipe.newCenaState(plan, 'kling3'); rejected.phase = 'judge'
    rejected.jobs = [0, 1, 2, 3].map(index => ({ kind: 'image', index, status: 'done', url: photo }))
    await pipe.stepCena(rejected, { ...d, json: async () => ({ ...verdict, [key]: false }) })
    assert.equal(rejected.phase, 'images', 'mismatch de continuidade força refação, nunca vídeo: ' + key)
    assert.equal(rejected.imageRound, 2)
  }
}
// SQL-like CAS double: runtime persiste intenção TTS antes do efeito, sem importar clientes de produção.
function database(row) {
  const state = plain(row), patches = []
  const db = { auth: { admin: { getUserById: async () => ({ error: null, data: { user: { email: 'josephsskaf@gmail.com' } } }) } }, from: table => {
    assert.equal(table, 'ads_v2_orders'); let patch, filters = [], result
    const q = { update(value) { patch = value; return q }, eq(k, v) { filters.push(r => r[k] === v); return q }, is(k, v) { filters.push(r => v === null ? r[k] == null : r[k] === v); return q }, select() { return q },
      exec() { if (!result) { const matched = filters.every(f => f(state)); if (matched && patch) { Object.assign(state, plain(patch)); patches.push(plain(patch)) } result = { error: null, data: matched ? plain(state) : null } } return result },
      maybeSingle() { return Promise.resolve(q.exec()) }, then(resolve, reject) { return Promise.resolve(q.exec()).then(resolve, reject) },
    }; return q
  } }
  return { db, state, patches }
}
function runtimeWorld(plan, over = {}, route = 'kling3', options = {}) {
  const loadState = loader(over), state = loadState(F.pipe).newCenaState(plan, route); state.phase = 'ready'; state.keyframes = [photo, photo]
  state.jobs = loadState(F.adapt).cenaVideoRequests(route, requestData(plan)).map((j, index) => ({ ...j, kind: 'video', status: 'done', index, url: 'https://offline.example/video' }))
  const world = database({ id: 'offline-order', user_id: 'owner', status: 'generating', plan: { cena: state }, billing_ref: 'adsv2-offline', credits_charged: 41, assembly_lease_at: null, assembly_submit_at: null }), counts = { tts: 0, montage: 0, refunds: 0, native: 0 }, events = []
  class OfflineCreatomateError extends Error {}
  const mocks = {
    '@/lib/openai': { openai: { chat: { completions: { create: async () => { throw new Error('ready scene cannot call OpenAI') } } } } },
    '../v2Shots': { submitShotOnce: async () => { counts.native++; throw new Error('ready scene cannot submit model') }, pollFalJob: async () => { throw new Error('ready scene cannot poll') }, persistShotClip: async () => { throw new Error('ready scene cannot persist') } },
    '../v2Images': { persistSceneImage: async () => { throw new Error('ready scene cannot persist') } },
    '../v2Billing': { failAdsV2Order: async (_db, order, reason) => { counts.refunds++; world.state.status = 'failed'; world.state.error = reason; assert.equal(order.billing_ref, 'adsv2-offline'); return { won: true, refund: 'refunded', amount: 41 } } },
    '@/lib/serverEvents': { writeServerEvent: async event => events.push(plain(event)) },
    './montage': { buildCenaMontage: s => { const mode = loadState(F.plan).cenaVoiceModeOf(s.plan); assert.equal(Boolean(s.voiceUrl), mode === 'narrated'); return { source: 'offline', voiceUrl: s.voiceUrl, mode } } },
    '@/lib/compose': { CreatomateSubmitError: OfflineCreatomateError, estimateMp3DurationSeconds: () => 12, uploadVoiceoverToSupabase: async () => 'https://offline.example/voice', submitCreatomateRender: async () => { counts.montage++; assert.equal(world.state.status, 'assembling'); return 'offline-render' } },
    '@/lib/ttsFallback': { synthesizeTtsFallback: async narration => { counts.tts++; assert.equal(narration, plan.script.narration); assert.ok(world.state.plan.cena.voiceClaimedAt, 'intenção TTS persistida ANTES de gastar'); if (options.ttsError) throw new Error('offline-tts-failed'); return Buffer.from('offline') } },
  }
  const load = loader(over, mocks)
  return { ...world, counts, events, advance: () => load(F.runtime).advanceCenaOrder(world.db, plain(world.state)) }
}
async function runtimeProof(over = {}) {
  for (const language of ['en', 'pt', 'es', 'zh']) {
    const { plan } = await makePlan(over, 'kling3', { language }), world = runtimeWorld(plan, over)
    await world.advance(); assert.equal(world.counts.tts, 1); assert.equal(world.counts.montage, 1); assert.equal(world.counts.refunds, 0)
    assert.equal(world.state.plan.cena.plan.voice_mode, 'narrated'); assert.equal(world.state.creatomate_render_id, 'offline-render')
    await world.advance(); assert.equal(world.counts.tts, 1, 'retomada não sintetiza novamente')
  }
  const { plan } = await makePlan(over, 'veo31', { voice_mode: 'talking', language: 'pt' }), talking = runtimeWorld(plan, over, 'veo31')
  await talking.advance(); assert.equal(talking.counts.tts, 0); assert.equal(talking.counts.montage, 1); assert.equal(talking.counts.refunds, 0)
  const narratedPlan = (await makePlan(over)).plan, failed = runtimeWorld(narratedPlan, over, 'kling3', { ttsError: true })
  await failed.advance(); assert.equal(failed.counts.tts, 1); assert.equal(failed.counts.montage, 0); assert.equal(failed.counts.refunds, 1)
  assert.equal(failed.state.error, 'cena_montage_or_voice_failed'); assert.equal(failed.events[0].name, 'ads_cena_failed')
  const incompatible = runtimeWorld(plan, over, 'veo31'); incompatible.state.plan.cena.route = 'kling3'
  await incompatible.advance(); assert.equal(incompatible.counts.tts, 0); assert.equal(incompatible.counts.native, 0); assert.equal(incompatible.counts.montage, 0); assert.equal(incompatible.counts.refunds, 1)
  assert.equal(incompatible.state.error, 'cena_kling_native_speech_unsupported')
}
async function legacyAndCostsProof(over = {}) {
  const { load, plan, P } = await makePlan(over), A = load(F.adapt)
  for (const [audioMode, expected] of [['voiceover', 'narrated'], ['native', 'talking']]) {
    const legacy = plain(plan); delete legacy.voice_mode; delete legacy.input.voice_mode; legacy.audioMode = audioMode
    assert.equal(P.cenaVoiceModeOf(legacy), expected, 'pedido já gravado mantém intenção audioMode antiga')
    const world = runtimeWorld(legacy, over); await world.advance()
    assert.equal(world.counts.tts, expected === 'narrated' ? 1 : 0); assert.equal(world.counts.montage, 1)
  }
  const legacyRequest = requestData(plan); delete legacyRequest.voiceMode; legacyRequest.language = 'pt'
  const legacy = A.cenaVideoRequests('kling3', legacyRequest)[0]
  assert.equal(legacy.input.generate_audio, true); assert.match(legacy.input.prompt, /ambient sound and product interaction sound only/)
  assert.equal(A.cenaCosts('kling3').knownSubtotalUsd, 3.12, 'chamada antiga continua estimativa áudio ligado')
  for (const [mode, expected] of [['narrated', [2.28, 5.136, 3.8]], ['talking', [3.12, 5.136, 7]]]) {
    const costs = A.cenaCosts(undefined, mode)
    for (const [index, route] of ['kling3', 'seedance2', 'veo31'].entries()) {
      const cost = costs[route]; assert.equal(cost.knownSubtotalUsd, expected[index]); assert.equal(cost.voice_mode, mode)
      assert.equal(cost.generateAudio, mode === 'talking'); assert.equal(cost.keyframesBestOf2Usd, 0.6); assert.equal(cost.totalUsd, null)
      assert.equal(cost.checkedAt, '2026-10-21'); assert.ok(cost.sources.every(url => url.startsWith('https://fal.ai/models/')))
      assert.equal(cost.unknowns.some(text => text.includes('TTS obrigatório')), mode === 'narrated')
      same(A.cenaCosts(route, mode), cost)
    }
  }
}
const proofs = [
  ['defaults e respostas live/dry explícitos, persistidos e coerentes', defaultsProof],
  ['narrated: TTS separado, zero áudio nativo e nenhuma fala nos prompts em quatro idiomas', narrationProof],
  ['talking: rosto fala todo segmento, dois takes Veo sem repetir texto, nenhuma narração separada', talkingProof],
  ['Kling talking sem suporte recusa antes de qualquer efeito pago ou cobrança', refusalProof],
  ['mesmo retrato, figurino determinístico e pulso esquerdo nos dois keyframes e nas refações', continuityProof],
  ['runtime sintetiza só narrated; erro de TTS e talking incompatível estornam', runtimeProof],
  ['trabalhos antigos mantêm audioMode; custos por modo com TTS desconhecido e quatro imagens', legacyAndCostsProof],
]
for (const [label, run] of proofs) { await run(); console.log('ok ' + label) }
function change(file, from, to) {
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  assert.equal(source.split(from).length - 1, 1, 'mutante aplica uma vez: ' + from)
  return { [file]: source.replace(from, to) }
}
const mutants = [
  ['default muda para talking', defaultsProof, F.plan, "voice_mode: b.voice_mode ?? 'narrated'", "voice_mode: b.voice_mode ?? 'talking'"],
  ['talking sem rota cai em Kling', defaultsProof, F.adapt, "voiceMode === 'talking' ? 'veo31' : 'kling3'", "voiceMode === 'talking' ? 'kling3' : 'kling3'"],
  ['narrated mantém áudio nativo', narrationProof, F.adapt, "const generateAudio = data.voiceMode !== 'narrated'", 'const generateAudio = true'],
  ['fala Kling traduzida silenciosamente', refusalProof, F.adapt, "if (route === 'kling3' && voiceMode === 'talking'", "if (false && route === 'kling3' && voiceMode === 'talking'"],
  ['Veo perde fala contínua', talkingProof, F.plan, 'Continuous face-to-camera speech with lip-sync', 'Optional silent product use'],
  ['troca de pulso volta ao prompt', continuityProof, F.plan, 'LEFT wrist throughout; never the right wrist, never mirrored, never switching arms', 'either wrist, change arms freely'],
  ['retrato não acompanha keyframes', continuityProof, F.pipe, 'actorUrl: s.plan.input.actorUrl', 'actorUrl: undefined'],
  ['pipeline esquece modo e religa áudio', continuityProof, F.pipe, 'voiceMode: s.plan.voice_mode', 'voiceMode: undefined'],
  ['juiz ignora roupa diferente', continuityProof, F.plan, "if (continuity && r.wardrobe_match !== true) reasons.push('wardrobe_match')", "if (false && continuity && r.wardrobe_match !== true) reasons.push('wardrobe_match')"],
  ['juiz ignora pulso errado', continuityProof, F.plan, "if (continuity?.productWrist === 'left' && r.product_wrist_match !== true) reasons.push('product_wrist_match')", "if (false && continuity?.productWrist === 'left' && r.product_wrist_match !== true) reasons.push('product_wrist_match')"],
  ['pipeline não passa continuidade ao juiz', continuityProof, F.pipe, '}), s.plan.continuity)', '}), undefined)'],
  ['runtime só narra português', runtimeProof, F.runtime, "if (cenaVoiceModeOf(state.plan) === 'narrated' && !state.voiceUrl)", "if (state.plan.input.language === 'pt' && cenaVoiceModeOf(state.plan) === 'narrated' && !state.voiceUrl)"],
  ['Kling silencioso cobra tarifa com áudio', legacyAndCostsProof, F.adapt, 'silentVideoUsdPerSecond: 0.112', 'silentVideoUsdPerSecond: 0.168'],
  ['legado sem modo vira sempre narrado', legacyAndCostsProof, F.plan, "plan.voice_mode ?? (plan.audioMode === 'voiceover' ? 'narrated' : 'talking')", "plan.voice_mode ?? 'narrated'"],
]
for (const [label, run, file, from, to] of mutants) {
  const overrides = change(file, from, to)
  let error
  try { await run(overrides) } catch (failure) { error = failure }
  assert.ok(error, 'mutante deve ficar vermelho: ' + label)
  console.log('ok mutante vermelho: ' + label)
}
console.log('KINEO-ADS-CENA-AJUSTE-2110: modos de voz e continuidade testados somente com dublês offline.')
