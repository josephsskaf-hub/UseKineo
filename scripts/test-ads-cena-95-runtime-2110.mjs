// KINEO-ADS-CENA-95-2110 — runtime real com persistência/CAS e efeitos exclusivamente em dublês offline.
// Frames e montagem/legendas são fronteiras nominais aqui; suas réguas têm guardiões próprios.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const F = { finish: 'lib/ads/cena/finish95.ts', runtime: 'lib/ads/cena/runtime95.ts', audio: 'lib/ads/cena/audio95Runtime.ts', usage: 'lib/ads/cena/usage95.ts', internal: 'lib/ads/cena/internal.ts', route: 'app/api/admin/ads-cena/route.ts', plan: 'lib/ads/cena/plan95.ts', script: 'lib/ads/cena/script95.ts', presenters: 'lib/ads/cena/presenters95.ts', catalog: 'lib/ads/cena/catalog.ts', pipe: 'lib/ads/cena/pipeline95.ts', legacyRuntime: 'lib/ads/cena/runtime.ts', advance: 'lib/ads/v2Advance.ts', earlyAudio: 'lib/ads/v2AudioCedo.ts' }
const plain = x => JSON.parse(JSON.stringify(x))
const photo = 'https://offline.example/calm-leaf.png', voice = 'https://offline.example/narration.mp3'
const house = { id: 'owner-95', email: 'josephsskaf@gmail.com' }
const input = { foto: photo, frase: 'Calm Leaf tea. Caffeine-free blend. Individually wrapped bags. Free shipping.', oferta: 'Free shipping.', beneficios: ['Caffeine-free blend', 'Individually wrapped bags'], language: 'en', formato: 'product', voice_mode: 'narrated' }
const classification = { category: 'tea', confidence: .99, product: 'Calm Leaf', offer: input.oferta, benefits: input.beneficios, photo_is_isolated_product: true }
const script = { hooks: ['Tea before scrolling?', 'Ready for tea?', 'Time for tea?'], pain: 'Make room for a short break between your busy daily tasks.', demonstration: 'Open Calm Leaf and prepare your tea in a cup.', benefit: 'Caffeine-free blend. Individually wrapped bags.', offer: input.oferta, cta: 'Choose Calm Leaf for your next tea break.' }
const server = { v2Json: (body, status = 200) => new Response(JSON.stringify(body), { status }), v2Fail: (error, status) => new Response(JSON.stringify({ error }), { status }) }
function loader(over = {}, mocks = {}, globals = {}) { return createOfflineLoader({ mocks, globals: { Response, Request, Error, ...globals }, source: (file, text) => over[file] ?? text }) }
async function makePlan(over = {}, values = {}) {
  const load = loader(over), P = load(F.plan), calls = []
  const plan = await P.planCena95({ ...input, ...values }, values.voice_mode === 'talking' ? 'veo31' : 'kling3', async call => { calls.push(plain(call)); call.onUsage?.({ prompt_tokens: 100, completion_tokens: 50 }); return call.images.length ? classification : script }, { userId: house.id, recentActors: [] })
  return { load, plan, calls }
}
function stateFor(plan, load, phase = 'videos') { const s = load(F.pipe).newCena95State(plain(plan), plan.voice_mode === 'talking' ? 'veo31' : 'kling3').score95; s.phase = phase; s.baseUrl = 'https://offline.example/base.png'; return s }

async function planProof(over = {}) {
  const { plan, load, calls } = await makePlan(over), S = load(F.script), A = load(F.presenters)
  assert.equal(plan.script.words, 39); assert.ok(plan.script.words >= 39 && plan.script.words <= 42)
  assert.ok(plan.script.hookEstimatedSeconds <= 1.5); assert.equal(plan.script.pauseSeconds, .35)
  assert.equal(plan.script.offer, input.oferta)
  for (const benefit of input.beneficios) assert.ok(plan.script.narration.includes(benefit))
  assert.equal(calls.length, 2); assert.equal(plan.quality95.planningUsage.measuredCalls, 2)
  assert.match(plan.interaction, /opens the tea package.*prepares the tea in a cup/)
  assert.match(plan.interaction, /below chest level without drinking on camera/)
  assert.ok(plan.segmentPrompts.every(p => p.includes(plan.interaction)))
  assert.equal(plan.quality95.closePhoto, photo)
  assert.throws(() => S.parseCena95Script({ ...script, offer: 'Free delivery.' }, input, 'Calm Leaf'), /cena95_script_structure/)
  assert.throws(() => S.parseCena95Script({ ...script, hooks: ['Why are you waiting today?', ...script.hooks.slice(1)] }, input, 'Calm Leaf'), /cena95_hook_too_long/)
  assert.throws(() => S.parseCena95Script({ ...script, pain: script.pain.replace('Make room', 'Game changer') }, input, 'Calm Leaf'), /cena95_cliche/)
  assert.throws(() => S.parseCena95Script({ ...script, pain: script.pain.replace('short break', 'Save 50%') }, input, 'Calm Leaf'), /cena95_unsubstantiated_script/)
  assert.throws(() => S.parseCena95Script({ ...script, benefit: 'Caffeine-free blend. Convenient tea bags.' }, input, 'Calm Leaf'), /cena95_missing_typed_benefit/)
  assert.throws(() => S.parseCena95Script({ ...script, pain: script.pain.replace('Make ', '') }, input, 'Calm Leaf'), /cena95_speech_pacing/)
  const recent = ['sofia', 'clara', 'hannah'], selected = A.chooseCena95Presenter('tea', house.id, recent)
  assert.ok(A.CENA95_ACTORS.tea.includes(selected.id)); assert.ok(!recent.includes(selected.id))
  const first = A.chooseCena95Presenter('tea', house.id, [])
  assert.throws(() => A.chooseCena95Presenter('tea', house.id, [first.id], first.portrait), /cena95_actor_recent/)
  assert.throws(() => A.chooseCena95Presenter('tea', house.id, [], 'https://offline.example/unapproved.png'), /cena95_actor_not_approved/)
}

async function voiceProof(over = {}) {
  const { plan, load } = await makePlan(over), finish = load(F.finish), s = stateFor(plan, load), saves = []; let effects = 0
  const d = { now: () => 12345, save: async current => { saves.push(plain(current)) }, event: async () => {}, music: async () => null,
    voice: async request => { effects++; const saved = saves.at(-1); assert.equal(saved.voiceClaimedAt, 12345); assert.ok(saved.reservations.some(r => r.id === 'voice' && r.component === 'narrated_voice')); assert.equal(saved.voiceUrl, undefined); assert.equal(request.endpoint, 'fal-ai/minimax/speech-2.8-hd'); assert.match(request.input.prompt, /<#0\.35#>/); return { url: voice, durationMs: 13700 } } }
  await finish.prepareCena95Voice(s, d); await finish.prepareCena95Voice(s, d)
  assert.equal(effects, 1); assert.equal(s.voiceUrl, voice); assert.equal(s.voiceSeconds, 13.7); assert.equal(saves.at(-1).voiceUrl, voice)
  const uncertain = stateFor(plan, load); let attempts = 0, durable
  const uncertainDeps = { ...d, save: async current => { durable = plain(current) }, voice: async () => { attempts++; throw new Error('transport_timeout') } }
  await assert.rejects(finish.prepareCena95Voice(uncertain, uncertainDeps), /transport_timeout/)
  await assert.rejects(finish.prepareCena95Voice(durable, uncertainDeps), /cena95_voice_submit_unconfirmed/); assert.equal(attempts, 1)
  const unsaved = stateFor(plan, load)
  await assert.rejects(finish.prepareCena95Voice(unsaved, { ...d, save: async () => { throw new Error('save_failed') }, voice: async () => { throw new Error('effect_before_save') } }), /save_failed/)
  const talking = stateFor({ ...plan, voice_mode: 'talking' }, load); let talkingCalls = 0
  await finish.prepareCena95Voice(talking, { ...d, voice: async () => { talkingCalls++; return { url: voice, durationMs: 13000 } } }); assert.equal(talkingCalls, 0)
  talking.voiceClaimedAt = 1
  await assert.rejects(finish.prepareCena95Voice(talking, d), /cena95_talking_tts_forbidden/)
}

async function musicProof(over = {}) {
  const { plan, load } = await makePlan(over), finish = load(F.finish)
  for (const failure of ['provider', 'empty', 'event']) {
    const s = stateFor(plan, load, 'ready'); let calls = 0; const saves = []
    const d = { now: () => 98765, save: async current => { saves.push(plain(current)) }, voice: async () => { throw new Error('forbidden_voice') },
      music: async () => { calls++; assert.equal(saves.at(-1).musicClaimedAt, 98765); assert.ok(saves.at(-1).reservations.some(r => r.id === 'music')); if (failure === 'provider') throw new Error('music_timeout'); return failure === 'empty' ? null : 'https://offline.example/music.mp3' },
      event: async () => { throw new Error('optional_telemetry_down') } }
    await finish.prepareCena95Music(s, d); await finish.prepareCena95Music(s, d)
    assert.equal(calls, 1); assert.equal(s.musicState, failure === 'event' ? 'done' : 'skipped')
  }
  const uncertain = stateFor(plan, load, 'ready'); uncertain.musicClaimedAt = 1; let repeats = 0
  await finish.prepareCena95Music(uncertain, { now: () => 5, save: async () => {}, voice: async () => ({}), event: async () => {}, music: async () => { repeats++; return 'https://offline.example/music.mp3' } })
  assert.equal(repeats, 0); assert.equal(uncertain.musicState, 'skipped')
  const exhausted = stateFor(plan, load, 'ready'); exhausted.reservedUsd = exhausted.budgetMaxUsd
  await finish.prepareCena95Music(exhausted, { now: () => 6, save: async () => {}, voice: async () => ({}), event: async () => {}, music: async () => { throw new Error('music_after_budget_exhausted') } })
  assert.equal(exhausted.musicState, 'skipped'); assert.equal(exhausted.reservedUsd, exhausted.budgetMaxUsd)
  const lostLease = stateFor(plan, load, 'ready')
  await assert.rejects(finish.prepareCena95Music(lostLease, { now: () => 7, save: async () => { throw new Error('cena95_lease_lost') }, voice: async () => ({}), event: async () => {}, music: async () => { throw new Error('music_without_lease') } }), /cena95_lease_lost/)
}

async function audioProof(over = {}) {
  const load = loader(over, { '@fal-ai/client': { createFalClient: () => { throw new Error('SDK_requires_explicit_double') } } }), V = load('lib/ads/cena/voice95.ts'), A = load(F.audio)
  const request = V.cena95NarratedVoiceRequest({ beforeCta: 'Calm Leaf tea.', cta: 'Choose Calm Leaf.', language: 'en', gender: 'female', age: 'adult' })
  let subscribe = 0, download = 0, upload = 0
  const deps = { subscribe: async (endpoint, args) => { subscribe++; assert.equal(endpoint, 'fal-ai/minimax/speech-2.8-hd'); assert.equal(args.timeout, 90000); return { audio: { url: 'https://offline.example/provider.mp3' }, duration_ms: 13200 } }, download: async (_, ms) => { download++; assert.equal(ms, 20000); return Buffer.from('offline-audio') }, upload: async () => { upload++; return voice } }
  const result = await A.synthesizeCena95NarratedVoice(request, deps)
  assert.equal(result.url, voice); assert.equal(result.durationMs, 13200); assert.equal(result.timingSource, 'not_returned_by_endpoint')
  assert.deepEqual([subscribe, download, upload], [1, 1, 1])
  for (const duration of [undefined, 15001]) await assert.rejects(A.synthesizeCena95NarratedVoice(request, { ...deps, subscribe: async () => ({ audio: { url: voice }, duration_ms: duration }) }), /cena95_voice_(missing_duration|does_not_fit)/)
  assert.deepEqual([download, upload], [1, 1])
  const bounded = []
  await A.synthesizeCena95NarratedVoice(request, { timeoutMs: 30000, downloadTimeoutMs: 10000, subscribe: async (_, args) => { bounded.push(args.timeout); return { audio: { url: voice }, duration_ms: 13200 } }, download: async (_, ms) => { bounded.push(ms); return Buffer.from('offline') }, upload: async () => voice })
  assert.deepEqual(bounded, [30000, 10000])
  let posts = 0
  const sdk = { createFalClient: options => ({ subscribe: async () => { let last; for (let i = 0; i < 3; i++) try { return await options.fetch('https://offline.example/paid', { method: 'POST' }) } catch (e) { last = e } throw last } }) }
  const B = loader(over, { '@fal-ai/client': sdk })(F.audio)
  await assert.rejects(B.synthesizeCena95NarratedVoice(request, { fetchImpl: async () => { posts++; throw new Error('uncertain_network') }, upload: deps.upload }), /cena95_voice_submit_unconfirmed/)
  assert.equal(posts, 1, 'o retry do SDK não repete POST pago depois de resultado incerto')
}

// SQL-like compare-and-swap double; only existing order fields are writable. No financial API exists here.
function database(row, options = {}) {
  const state = plain(row), attempts = [], patches = []; let fromCalls = 0
  const admin = { from: table => {
    fromCalls++; assert.equal(table, 'ads_v2_orders', 'runtime não cria escrita financeira paralela')
    let patch, filters = [], result
    const q = { update(value) { patch = plain(value); for (const key of Object.keys(patch)) assert.ok(['assembly_lease_at', 'plan', 'status', 'assembly_submit_at', 'creatomate_render_id'].includes(key), 'campo financeiro novo proibido: ' + key); attempts.push(patch); return q },
      eq(k, v) { filters.push(r => r[k] === v); return q }, is(k, v) { filters.push(r => v === null ? r[k] == null : r[k] === v); return q }, select() { return q },
      exec() { if (!result) { const denied = options.denyClaim && patch?.assembly_lease_at || options.denyStamp && patch?.assembly_submit_at || options.denySave && patch?.plan; const matched = !denied && filters.every(f => f(state)); if (matched && patch) { Object.assign(state, plain(patch)); patches.push(plain(patch)) } result = { error: null, data: matched ? plain(state) : null } } return result },
      maybeSingle() { return Promise.resolve(q.exec()) }, then(resolve, reject) { return Promise.resolve(q.exec()).then(resolve, reject) } }
    return q
  } }
  return { admin, state, attempts, patches, fromCalls: () => fromCalls }
}
function runtimeWorld(plan, load, over = {}, options = {}) {
  const clock = options.clock ?? { now: Date.now() }
  class OfflineDate extends Date { constructor(...args) { super(...(args.length ? args : [clock.now])) } static now() { return clock.now } }
  const state = stateFor(plan, load, options.phase ?? 'ready')
  if (state.phase === 'ready') { state.voiceUrl = voice; state.voiceSeconds = 13.5; state.musicState = 'skipped' }
  if (options.musicPending) delete state.musicState
  if (state.phase === 'failed') state.reason = 'cena95_base_rejected'
  const world = database({ id: 'offline-95', user_id: house.id, status: 'generating', plan: { cena: { plan, route: state.route, score95: state } }, billing_ref: 'adsv2-existing', credits_charged: 41, assembly_lease_at: options.busy ? new Date(clock.now).toISOString() : null, assembly_submit_at: options.stamped ? '2026-10-21T00:00:00Z' : null }, options)
  const trace = [], counts = { voice: 0, video: 0, renders: 0, refunds: 0, musicSubmit: 0, musicPoll: 0, musicFetch: 0, musicUpload: 0 }, events = [], failures = []
  const musicHandle = { requestId: 'lyria-existing-95', statusUrl: 'https://offline.example/lyria/status', responseUrl: 'https://offline.example/lyria/result' }
  let currentDeadline
  class OfflineCreatomateError extends Error { constructor(ambiguous) { super('offline_creatomate'); this.ambiguous = ambiguous } }
  const mocks = {
    './frames95': { extractCena95Frames: async () => ({ frames: [] }) },
    './captions95': { cena95DefaultWindows: () => [], cena95NarratedWindows: () => [], cena95Captions: () => ({ words: [], timingSource: 'offline_nominal_boundary' }) },
    './montage95': { buildCena95Montage: () => ({ elements: [], duration: 15 }) },
    './audio95Runtime': { synthesizeCena95NarratedVoice: async (request, transport) => { counts.voice++; trace.push('voice'); assert.equal(request.endpoint, 'fal-ai/minimax/speech-2.8-hd'); assert.equal(transport.timeoutMs, 30000); assert.equal(transport.downloadTimeoutMs, 10000); const saved = world.state.plan.cena.score95; assert.ok(saved.voiceClaimedAt); assert.ok(saved.reservations.some(r => r.id === 'voice')); return { url: voice, durationMs: options.longVoice ? 15001 : 13500 } } },
    '@/lib/lyriaMusic': { lyriaPromptFor: mood => 'offline-instrumental-' + mood, submeterLyria: async prompt => { counts.musicSubmit++; assert.equal(prompt, 'offline-instrumental-' + plan.quality95.musicMood); assert.ok(world.state.plan.cena.score95.musicClaimedAt); assert.ok(world.state.plan.cena.score95.reservations.some(r => r.id === 'music')); return options.musicPending ? musicHandle : null }, esperarLyria: async (handle, deadline) => { counts.musicPoll++; assert.deepEqual(plain(handle), musicHandle); assert.deepEqual(world.state.plan.cena.score95.musicHandle, musicHandle); assert.ok(deadline <= clock.now + 8000); assert.ok(deadline <= currentDeadline - 30000); return options.musicPollReady ? 'https://offline.example/lyria.mp3' : null } },
    '@/lib/compose': { CreatomateSubmitError: OfflineCreatomateError, estimateMp3DurationSeconds: () => 15, uploadVoiceoverToSupabase: async () => { counts.musicUpload++; return 'https://offline.example/music-stored.mp3' }, submitCreatomateRender: async () => { counts.renders++; trace.push('render'); assert.equal(world.state.status, 'assembling'); assert.ok(world.state.assembly_submit_at); if (options.renderError) throw new OfflineCreatomateError(options.renderError === 'ambiguous'); return 'creatomate-offline-95' } },
    '../v2Shots': { submitShotOnce: async () => { counts.video++; trace.push('video'); if (plan.voice_mode === 'narrated') assert.ok(world.state.plan.cena.score95.voiceUrl, 'voz validada antes do vídeo de pessoa'); return { kind: 'accepted', requestId: 'offline-job-' + counts.video } }, pollFalJob: async () => ({ state: 'pending', url: null }), persistShotClip: async () => null },
    '../v2Images': { persistSceneImage: async () => photo },
    '@/lib/serverEvents': { writeServerEvent: async event => { events.push(plain(event)) } },
  }
  const runtime = loader(over, mocks, { Date: OfflineDate, AbortSignal, fetch: async url => { counts.musicFetch++; assert.equal(url, 'https://offline.example/lyria.mp3'); return new Response(Buffer.from('offline-music'), { headers: { 'content-length': '13' } }) } })(F.runtime)
  const d = { json: async () => { throw new Error('unexpected_vision') }, fail: async reason => { failures.push(reason); if (world.state.status !== 'failed') { world.state.status = 'failed'; if (world.state.billing_ref && world.state.credits_charged) counts.refunds++ } } }
  return { ...world, counts, trace, events, failures, score95: state, clock, run: deadlineMs => { currentDeadline = deadlineMs ?? clock.now + 60000; return runtime.advanceCena95Order(world.admin, plain(world.state), { ...d, ...(deadlineMs !== undefined ? { deadlineMs } : {}) }) } }
}
async function runtimeProof(over = {}) {
  const { plan, load } = await makePlan(over)
  const live = runtimeWorld(plan, load, over); await live.run(); await live.run()
  assert.equal(live.counts.renders, 1); assert.equal(live.state.status, 'assembling'); assert.equal(live.state.creatomate_render_id, 'creatomate-offline-95'); assert.equal(live.counts.refunds, 0)
  assert.equal(live.state.credits_charged, 41); assert.equal(live.state.billing_ref, 'adsv2-existing')
  const assembling = live.events.find(e => e.name === 'ads_cena95_assembling'); assert.equal(assembling.metadata.actualTotalUsd, null)
  assert.equal(live.state.plan.cena.costObservation.actualTotalUsd, null)
  for (const options of [{ busy: true }, { denyClaim: true }]) { const w = runtimeWorld(plan, load, over, options); await w.run(); assert.equal(w.counts.renders, 0); assert.equal(w.counts.voice, 0); assert.equal(w.fromCalls(), options.busy ? 0 : 1); assert.equal(w.failures.length, 0) }
  for (const options of [{ stamped: true }, { denyStamp: true }]) { const w = runtimeWorld(plan, load, over, options); await w.run(); assert.equal(w.counts.renders, 0); assert.equal(w.failures.length, 0) }
  const lostSave = runtimeWorld(plan, load, over, { phase: 'videos', denySave: true }); await lostSave.run(); assert.equal(lostSave.counts.voice, 0); assert.equal(lostSave.counts.video, 0); assert.equal(lostSave.counts.refunds, 0); assert.equal(lostSave.failures.length, 0)
  const failed = runtimeWorld(plan, load, over, { phase: 'failed' }); await failed.run(); await failed.run()
  assert.deepEqual(failed.failures, ['cena95_base_rejected']); assert.equal(failed.counts.refunds, 1); assert.equal(failed.counts.renders, 0)
  const ambiguous = runtimeWorld(plan, load, over, { renderError: 'ambiguous' }); await ambiguous.run(); await ambiguous.run(); assert.equal(ambiguous.counts.renders, 1); assert.equal(ambiguous.counts.refunds, 0)
  const rejected = runtimeWorld(plan, load, over, { renderError: 'rejected' }); await rejected.run(); assert.deepEqual(rejected.failures, ['cena95_montage_rejected']); assert.equal(rejected.counts.refunds, 1)
}
async function beforeVideoProof(over = {}) {
  const { plan, load } = await makePlan(over)
  const good = runtimeWorld(plan, load, over, { phase: 'videos' }); await good.run()
  assert.equal(good.counts.voice, 1); assert.equal(good.counts.video, 1, 'no máximo um job pago por avanço'); assert.ok(good.trace.indexOf('voice') < good.trace.indexOf('video')); assert.equal(good.failures.length, 0)
  const long = runtimeWorld(plan, load, over, { phase: 'videos', longVoice: true }); await long.run()
  assert.equal(long.counts.voice, 1); assert.equal(long.counts.video, 0); assert.equal(long.counts.refunds, 1); assert.deepEqual(long.failures, ['cena95_voice_does_not_fit'])
  const talkingPlan = { ...plan, voice_mode: 'talking', audioMode: 'native', input: { ...plan.input, voice_mode: 'talking' } }
  const talking = runtimeWorld(talkingPlan, load, over, { phase: 'videos' }); await talking.run(); assert.equal(talking.counts.voice, 0); assert.ok(talking.counts.video > 0)
}
async function deadlineProof(over = {}) {
  const { plan, load } = await makePlan(over)
  const exhausted = runtimeWorld(plan, load, over, { phase: 'videos' }); await exhausted.run(exhausted.clock.now + 9000)
  assert.equal(exhausted.fromCalls(), 0); assert.equal(exhausted.counts.voice, 0); assert.equal(exhausted.counts.video, 0)
  const shortVoice = runtimeWorld(plan, load, over, { phase: 'videos' }); await shortVoice.run(shortVoice.clock.now + 54000)
  assert.equal(shortVoice.counts.voice, 0); assert.equal(shortVoice.counts.video, 0); assert.equal(shortVoice.failures.length, 0)
  const shortVideo = runtimeWorld(plan, load, over, { phase: 'videos' }); Object.assign(shortVideo.state.plan.cena.score95, { voiceUrl: voice, voiceSeconds: 13.5 }); await shortVideo.run(shortVideo.clock.now + 34000)
  assert.equal(shortVideo.counts.video, 0); assert.ok(shortVideo.state.plan.cena.score95.jobs.every(j => !j.claimedAt))
  const shortMusic = runtimeWorld(plan, load, over, { musicPending: true }); await shortMusic.run(shortMusic.clock.now + 49000)
  assert.equal(shortMusic.counts.musicSubmit, 0); assert.equal(shortMusic.counts.musicPoll, 0); assert.equal(shortMusic.counts.renders, 0)
  const shortAssembly = runtimeWorld(plan, load, over); await shortAssembly.run(shortAssembly.clock.now + 24000)
  assert.equal(shortAssembly.counts.renders, 0); assert.equal(shortAssembly.state.assembly_submit_at, null); assert.equal(shortAssembly.failures.length, 0)
}
async function pipelineDeadlineProof(over = {}) {
  const { plan, load } = await makePlan(over), P = load(F.pipe), s = stateFor(plan, load, 'base')
  const calls = { submit: 0, poll: 0, frames: 0, judge: 0 }; let budget = 0
  const d = { now: () => 123456, save: async () => {}, event: async () => {}, canSpend: minimum => budget >= minimum, maxJobsPerStep: 1,
    submit: async () => { calls.submit++; return { kind: 'accepted', requestId: 'offline-' + calls.submit } }, poll: async () => { calls.poll++; return { state: 'pending', url: null } }, persist: async () => photo,
    frames: async () => { calls.frames++; return [] }, json: async () => { calls.judge++; return {} } }
  await P.stepCena95(s, d); assert.equal(calls.submit, 0); assert.ok(s.jobs.every(j => j.status === 'new')); assert.equal(s.reservedUsd, 0)
  budget = 60000; await P.stepCena95(s, d); assert.equal(calls.submit, 1); await P.stepCena95(s, d); assert.equal(calls.submit, 2)
  budget = 34000; await P.stepCena95(s, d); assert.equal(calls.poll, 0)
  budget = 60000; await P.stepCena95(s, d); assert.equal(calls.poll, 1, 'um único poll por avanço')
  for (const j of s.jobs) { j.status = 'done'; j.url = photo }
  budget = 24000; await P.stepCena95(s, d); assert.equal(calls.judge, 0); assert.ok(s.jobs.every(j => !j.judgeClaims?.base))
  const video = stateFor(plan, load)
  video.jobs = load('lib/ads/cena/adapters95.ts').cena95VideoRequests(plan, 'kling3', video.baseUrl).map((j, index) => ({ ...j, index: 100 + index, round: 1, status: 'done', url: 'https://offline.example/clip-' + index }))
  budget = 49000; await P.stepCena95(video, d); assert.equal(calls.frames, 0); assert.ok(video.jobs.every(j => !j.frameClaimedAt))
  video.jobs[0].frames = [0, 1.5, 3, 5, 7, 10].map(t => ({ t, url: 'https://offline.example/frame-' + t }))
  budget = 24000; await P.stepCena95(video, d); assert.equal(calls.judge, 0); assert.ok(!video.jobs[0].judgeClaims?.hook)
}
async function musicResumeProof(over = {}) {
  const { plan, load } = await makePlan(over), options = { musicPending: true }, w = runtimeWorld(plan, load, over, options)
  await w.run(); assert.equal(w.counts.musicSubmit, 1); assert.equal(w.counts.musicPoll, 0); assert.equal(w.counts.renders, 0)
  assert.ok(w.state.plan.cena.score95.musicHandle?.requestId, 'handle precisa estar salvo antes de retomar')
  const handle = plain(w.state.plan.cena.score95.musicHandle); assert.equal(handle.requestId, 'lyria-existing-95'); assert.equal(w.state.plan.cena.score95.musicState, undefined)
  await w.run(); assert.equal(w.counts.musicSubmit, 1); assert.equal(w.counts.musicPoll, 1); assert.equal(w.counts.renders, 0); assert.deepEqual(w.state.plan.cena.score95.musicHandle, handle)
  options.musicPollReady = true; await w.run(); await w.run()
  assert.equal(w.counts.musicSubmit, 1); assert.equal(w.counts.musicPoll, 2); assert.equal(w.counts.musicFetch, 1); assert.equal(w.counts.musicUpload, 1); assert.equal(w.counts.renders, 1); assert.equal(w.counts.refunds, 0)
  assert.equal(w.state.plan.cena.score95.musicState, 'done'); assert.equal(w.state.plan.cena.score95.musicUrl, 'https://offline.example/music-stored.mp3')
  const timed = runtimeWorld(plan, load, over, { musicPending: true }); await timed.run(); timed.clock.now += 180001; await timed.run()
  assert.equal(timed.counts.musicSubmit, 1); assert.equal(timed.counts.musicPoll, 0); assert.equal(timed.counts.renders, 1); assert.equal(timed.counts.refunds, 0); assert.equal(timed.state.plan.cena.score95.musicState, 'skipped')
}
const unusedImports = file => Object.fromEntries([...readFileSync(file, 'utf8').matchAll(/\bfrom\s*['"]([^'"]+)['"]/gu)].map(m => [m[1], {}]))
async function deadlinePropagationProof(over = {}) {
  const { plan } = await makePlan(over), supplied = Date.now() + 12345; let reached
  // Só expõe a função privada no VM do teste; o corpo completo vem da fonte real.
  const runtimeMocks = { ...unusedImports(F.legacyRuntime), '../access': { isAdsInternalEmail: email => email === house.email }, './catalog': { cenaEnabled: internal => internal }, './pipeline': { cenaOf: p => p.cena }, './adapters': { cenaAssertVoiceRoute() {} }, './runtime95': { advanceCena95Order: async (_, __, deps) => { reached = deps.deadlineMs } } }
  const realRuntime = loader(over, runtimeMocks)(F.legacyRuntime)
  const advanceSource = (over[F.advance] ?? readFileSync(F.advance, 'utf8')) + '\nexport { stepGenerating as offlineStepGenerating }\n'
  const advance = loader({ ...over, [F.advance]: advanceSource }, { ...unusedImports(F.advance), '@/lib/ads/cena/runtime': { advanceCenaOrder: realRuntime.advanceCenaOrder } })(F.advance)
  await advance.offlineStepGenerating({ auth: { admin: { getUserById: async () => ({ error: null, data: { user: house } }) } } }, { id: 'offline-forward', user_id: house.id, status: 'generating', plan: { cena: { plan, route: 'kling3' } } }, supplied)
  assert.equal(reached, supplied, 'v2Advance → runtime legado → runtime95 preservam o prazo absoluto')
}
async function cronProof(over = {}) {
  const { plan } = await makePlan(over), counts = { lease: 0, tts: 0, music: 0, storage: 0, db: 0, event: 0 }
  const mocks = { ...unusedImports(F.earlyAudio), '@/lib/cronLease': { tomarVezDoCron: async () => { counts.lease++; return { ok: true } } }, '@/lib/lyriaMusic': { getLyriaMusicUrl: async () => { counts.music++; return 'https://offline.example/music.mp3' } }, '@/lib/ttsFallback': { synthesizeTtsFallback: async () => { counts.tts++; return Buffer.from('offline') } }, '@/lib/ads/v2Images': { persistAudioCopy: async () => { counts.storage++; return 'https://offline.example/music-stored.mp3' } }, '@/lib/compose': { estimateMp3DurationSeconds: () => 13.5, uploadVoiceoverToSupabase: async () => { counts.storage++; return voice } }, '@/lib/textLanguage': { narrationLanguage: () => 'en' }, '@/lib/ads/speakable': { speakableForTts: s => s }, '@/lib/ads/v2Pronounce': { adsV2NarrationForTts: s => s, adsV2PronounceOf: () => null }, '@/lib/ads/v2Advance': { adsV2PresenterPlanOf: () => null }, '@/lib/ads/v2CloseReal': { adsV2CloseRealOf: () => null }, '@/lib/serverEvents': { writeServerEvent: async () => { counts.event++ } } }
  const C = loader(over, mocks)(F.earlyAudio), order = { id: 'offline-cron', user_id: house.id, status: 'generating', sector: 'store', language: 'en', narration: true, plan: { narration: plan.script.narration, cena: { plan } }, voice_url: null, music_url: null, voice_seconds: null }
  const admin = { from: () => { counts.db++; const q = { update: () => q, eq: () => q, is: async () => ({ error: null }) }; return q } }
  assert.deepEqual(plain(C.adsV2AudioCedoFalta(order)), { musica: false, voz: false, narracao: null })
  assert.deepEqual(plain(await C.adsV2AudioCedo(admin, order)), { musica: 'pulada', voz: 'pulada' }); assert.ok(Object.values(counts).every(n => n === 0), 'nenhum efeito ou lease do cron para Cena95')
  const legacy = plain(order); delete legacy.plan.cena
  assert.deepEqual(plain(await C.adsV2AudioCedo(admin, legacy)), { musica: 'pronta', voz: 'pronta' }); assert.deepEqual(counts, { lease: 1, tts: 1, music: 1, storage: 2, db: 2, event: 1 })
}
async function usageProof(over = {}) {
  const { plan, load } = await makePlan(over), state = stateFor(plan, load)
  state.reservedUsd = 7.25; state.voiceSeconds = 13.5; state.jobs = [{ kind: 'image', status: 'done' }, { kind: 'video', family: 'person0', seconds: 10, status: 'done' }, { kind: 'video', family: 'close', seconds: 5, status: 'done' }, { kind: 'video', family: 'person1', status: 'submitting' }]
  const o = load(F.usage).cena95UsageObservation(state)
  assert.equal(o.actualTotalUsd, null); assert.equal(o.invoicedUsd, null); assert.equal(o.completedKeyframes, 1); assert.equal(o.completedPeopleRequestedSeconds, 10); assert.equal(o.completedCloseRequestedSeconds, 5); assert.equal(o.pendingOrUnknownModelIntents, 1); assert.ok(o.missing.includes('ambiguous_model_intent')); assert.equal(o.creatomateActualCredits, null)
}

async function internalProof(over = {}) {
  const trace = [], counts = { json: 0, start: 0, insert: 0, moderate: 0 }, recent = ['sofia', 'clara', 'hannah']
  const rows = [{ user_id: 'another-owner', created_at: 999, id: 'other', plan: { presenter: { id: 'robert' } } }, ...[...recent, 'rahul'].map((id, n) => ({ user_id: house.id, created_at: 40 - n, id: 'own-' + n, plan: { presenter: { id } } }))]
  let historyError = false
  const admin = { from: table => { assert.equal(table, 'ads_v2_orders'); let selection = rows, orders = []
    const q = { select: columns => { trace.push(['select', columns]); return q }, eq: (key, value) => { trace.push(['eq', key, value]); selection = selection.filter(r => r[key] === value); return q }, order: (key, options) => { trace.push(['order', key, options.ascending]); orders.push(key); return q }, limit: async limit => { trace.push(['limit', limit]); selection = [...selection].sort((a, b) => orders.reduce((cmp, key) => cmp || (a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0), 0)); return { error: historyError ? { message: 'offline_history_down' } : null, data: historyError ? null : plain(selection.slice(0, limit)) } }, insert: () => { counts.insert++; throw new Error('dry_run_insert_forbidden') } }; return q } }
  const deps = { admin, json: async call => { counts.json++; assert.ok(trace.some(x => x[0] === 'limit')); return call.images.length ? classification : script }, moderate: async () => { counts.moderate++; return true }, start: async () => { counts.start++; throw new Error('dry_run_start_forbidden') } }
  const I = loader(over, { '../v2Server': server })(F.internal)
  const response = await I.internalCenaFor(house, { ...input, dry_run: true, recentActors: ['rahul', 'robert'] }, deps), body = await response.json()
  assert.equal(response.status, 200); assert.equal(body.charged, false); assert.equal(counts.json, 2); assert.equal(counts.insert, 0); assert.equal(counts.start, 0)
  assert.ok(!recent.includes(body.plan.quality95.presenter.id)); assert.ok(['rahul', 'robert'].includes(body.plan.quality95.presenter.id))
  assert.ok(trace.some(x => x[0] === 'eq' && x[1] === 'user_id' && x[2] === house.id)); assert.ok(trace.some(x => x[0] === 'limit' && x[1] === 3))
  assert.ok(trace.some(x => x[0] === 'order' && x[1] === 'created_at' && x[2] === false)); assert.ok(trace.some(x => x[0] === 'order' && x[1] === 'id' && x[2] === false))
  historyError = true; counts.json = 0
  const failed = await I.internalCenaFor(house, { ...input, dry_run: true }, deps)
  assert.equal(failed.status, 503); assert.equal((await failed.json()).error, 'cena95_history_unavailable'); assert.equal(counts.json, 0); assert.equal(counts.insert, 0); assert.equal(counts.start, 0)
  const forbidden = { json: async () => { throw new Error('blocked_json') }, moderate: async () => { throw new Error('blocked_moderation') }, admin: { from: () => { throw new Error('blocked_db') } }, start: async () => { throw new Error('blocked_start') } }
  assert.equal((await I.internalCenaFor({ id: 'external', email: 'buyer@example.com' }, input, forbidden)).status, 403)
  const catalog = readFileSync(F.catalog, 'utf8').replace("= 'internal'", "= 'off'")
  assert.equal((await loader({ ...over, [F.catalog]: catalog }, { '../v2Server': server })(F.internal).internalCenaFor(house, input, forbidden)).status, 403)
}
async function routeGateProof(over = {}) {
  for (const external of [false, true]) {
    let jsonCalls = 0, accessCalls = 0
    const mocks = { '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: external ? { id: 'external', email: 'buyer@example.com' } : house } }) } }) }, '@/lib/ads/serverAccess': { loadAdsAccess: async () => { accessCalls++; throw new Error('gate_before_db') } }, '@/lib/ads/cena/internal': { internalCenaFor: async () => { throw new Error('gate_before_internal') } }, '@/lib/ads/cena/runtime': { cenaJson: async () => { throw new Error('gate_before_ai') } }, '@/lib/ads/v2StartCore': { adsV2StartFor: async () => { throw new Error('gate_before_start') } }, '@/lib/safety/contentModeration': { moderateContent: async () => { throw new Error('gate_before_moderation') } }, '@/lib/ads/v2Server': server, '../_shared/db': { isAdminEmail: email => email === house.email } }
    const local = external ? over : { ...over, [F.catalog]: readFileSync(F.catalog, 'utf8').replace("= 'internal'", "= 'off'") }
    const result = await loader(local, mocks)(F.route).POST({ json: async () => { jsonCalls++; return input } })
    assert.equal(result.status, 403); assert.equal(accessCalls, 0); assert.equal(jsonCalls, 0)
  }
}

const proofs = [['plano real: 39 palavras, gancho, oferta, benefícios, chá e rotação', planProof], ['voz: intenção salva, tentativa incerta e talking sem TTS', voiceProof], ['música opcional: falha/telemetria e intenção incerta sem repetição', musicProof], ['MiniMax real: transporte medido e SDK sem repetir POST', audioProof], ['runtime real: lease, CAS, stamp, montagem e d.fail existente', runtimeProof], ['voz medida antes do vídeo de pessoa e talking sem síntese', beforeVideoProof], ['runtime adia sem janela de voz/vídeo/música/montagem', deadlineProof], ['pipeline respeita prazo e um único submit/poll por avanço', pipelineDeadlineProof], ['música retoma o mesmo handle e timeout é não fatal', musicResumeProof], ['prazo absoluto propagado por v2Advance/runtime/runtime95 reais', deadlinePropagationProof], ['cron legado exclui Cena95 sem efeito e mantém caminho anterior', cronProof], ['observação de unidades nunca vira fatura inventada', usageProof], ['histórico real: dono, últimos três, falha fechada e gates', internalProof], ['rota real: off/externo antes de DB e req.json', routeGateProof]]
let good = 0, bad = 0
async function check(name, fn) { try { await fn(); good++; console.log('  ok  ' + name) } catch (e) { bad++; console.log('  FALHA ' + name + ' → ' + e.message); if (process.argv.includes('--debug')) console.error(e.stack) } }
for (const [name, proof] of proofs) await check(name, proof)
const mutations = [
  ['voz sem marca anterior ao efeito', F.finish, 's.voiceClaimedAt = d.now()', '/* intention removed */', voiceProof],
  ['voz sem reserva durável', F.finish, "await reserveCena95(s, d, 'voice', 'narrated_voice', request.billingCharacters * 0.0001)", 'void 0', voiceProof],
  ['voz incerta repetida', F.finish, "if (s.voiceClaimedAt) throw new Error('cena95_voice_submit_unconfirmed')", '', voiceProof],
  ['talking usa TTS', F.finish, "if (s.plan.voice_mode === 'talking')", 'if (false)', voiceProof],
  ['voz longa aceita antes de vídeo', F.finish, 'result.durationMs <= 15_000', 'result.durationMs <= 30_000', beforeVideoProof],
  ['falha de música derruba anúncio', F.finish, "s.musicUrl = undefined; s.musicState = 'skipped'", 'throw e', musicProof],
  ['música incerta repetida', F.finish, "if (s.musicClaimedAt && (!s.musicHandle || d.now() - s.musicClaimedAt > 3 * 60_000)) { s.musicState = 'skipped'; await d.save(s); return }", '', musicProof],
  ['telemetria de música passa a fatal', F.finish, "try { await d.event('ads_cena95_music', { state: s.musicState }) } catch { /* best effort */ }", "await d.event('ads_cena95_music', { state: s.musicState })", musicProof],
  ['vídeo de pessoa antes da voz', F.runtime, 'await prepareCena95Voice(s, audio)', 'void 0', beforeVideoProof],
  ['lease recente ignorado', F.runtime, 'if (order.assembly_lease_at && Date.now() - Date.parse(order.assembly_lease_at) < 5 * 60_000) return', '', runtimeProof],
  ['claim perdido ignorado', F.runtime, 'if (won.error || !won.data) return', '', runtimeProof],
  ['stamp de montagem anterior ignorado', F.runtime, ".is('assembly_submit_at', null)", '', runtimeProof],
  ['CAS do stamp perdido ignorado', F.runtime, 'if (stamp.error || !stamp.data) return', '', runtimeProof],
  ['falha deixa de chamar estorno existente', F.runtime, "await d.fail(s.reason ?? 'cena95_failed')", 'void 0', runtimeProof],
  ['reserva é chamada de custo real', F.usage, 'actualTotalUsd: null', 'actualTotalUsd: s.reservedUsd', usageProof],
  ['histórico perde dono', F.internal, ".eq('user_id', user.id)", '', internalProof],
  ['histórico deixa de ser os últimos três', F.internal, '.limit(3)', '.limit(4)', internalProof],
  ['histórico indisponível abre geração', F.internal, "throw new Error('cena95_history_unavailable')", 'return []', internalProof],
  ['externo entra no canário', F.internal, 'if (!cenaEnabled(isAdsInternalEmail(user.email)))', 'if (false)', internalProof],
  ['benefício digitado é cortado', F.script, "if ((input.beneficios ?? []).some(b => !fold(benefit).includes(fold(b))))", 'if (false)', planProof],
  ['clichê passa', F.script, 'if (CENA95_CLICHES.some(c => fold(all).includes(c)))', 'if (false)', planProof],
  ['ator recente reutilizado', F.presenters, 'new Set(recent.slice(0, 3))', 'new Set([])', planProof],
  ['chá recebe ação de garrafa', F.catalog, 'prepares the tea in a cup', 'opens a bottle', planProof],
  ['retry do SDK repete POST pago', F.audio, "if (posted) throw new Error('cena95_voice_submit_unconfirmed')", 'if (false) throw new Error(\'disabled\')', audioProof],
  ['rota perde gate antes de DB/JSON', F.route, "if (!isAdminEmail(user.email) || !cenaEnabled(isAdsInternalEmail(user.email)))", 'if (false)', routeGateProof],
  ['canSpend ignora o prazo real', F.runtime, 'canSpend = (ms: number) => deadlineMs - Date.now() >= ms', 'canSpend = (_ms: number) => true', deadlineProof],
  ['voz começa sem janela de 55s', F.runtime, "if (s.phase === 'videos' && s.plan.voice_mode === 'narrated' && !s.voiceUrl && !canSpend(55_000)) return", '', deadlineProof],
  ['música começa sem janela de 50s', F.runtime, 'if (!s.musicState && !canSpend(50_000)) return', '', deadlineProof],
  ['montagem começa sem janela de 25s', F.runtime, 'if (!s.musicState || !canSpend(25_000)) return', 'if (!s.musicState) return', deadlineProof],
  ['runtime permite dois jobs no mesmo avanço', F.runtime, 'maxJobsPerStep: 1', 'maxJobsPerStep: 2', beforeVideoProof],
  ['pipeline ignora limite de submits', F.pipe, 'fresh.slice(0, d.maxJobsPerStep ?? fresh.length)', 'fresh', pipelineDeadlineProof],
  ['pipeline ignora limite de polls', F.pipe, '.slice(0, d.maxJobsPerStep ?? active.length)', '', pipelineDeadlineProof],
  ['submit começa sem janela de 35s', F.pipe, 'if (d.canSpend && !d.canSpend(35_000)) return; ', '', pipelineDeadlineProof],
  ['poll começa sem janela de 35s', F.pipe, 'if (d.canSpend && !d.canSpend(35_000)) return\n    const results', 'const results', pipelineDeadlineProof],
  ['frames começam sem janela de 50s', F.pipe, 'if (d.canSpend && !d.canSpend(50_000)) return', '', pipelineDeadlineProof],
  ['juiz começa sem janela de 25s', F.pipe, 'if (d.canSpend && !d.canSpend(25_000)) return', '', pipelineDeadlineProof],
  ['música pendente é submetida de novo', F.runtime, 'if (!s.musicHandle)', 'if (true)', musicResumeProof],
  ['handle da música não é salvo', F.runtime, 's.musicHandle = handle; await save(s)', 'await save(s)', musicResumeProof],
  ['música pendente vira conclusão prematura', F.finish, "if (url && typeof url === 'object') { await d.save(s); return }", '', musicResumeProof],
  ['música aguarda além dos três minutos', F.finish, 'd.now() - s.musicClaimedAt > 3 * 60_000', 'd.now() - s.musicClaimedAt > 30 * 60_000', musicResumeProof],
  ['cron duplica áudio da Cena95', F.earlyAudio, ".cena?.plan?.quality95?.version === 'KINEO-ADS-CENA-95-2110'", ".cena?.plan?.quality95?.version === 'disabled_cena95_guard'", cronProof],
  ['v2Advance perde prazo do chamador', F.advance, 'advanceCenaOrder(admin, order, deadlineMs)', 'advanceCenaOrder(admin, order)', deadlinePropagationProof],
  ['runtime intermediário perde prazo', F.legacyRuntime, 'fail: reason => failCenaOrder(admin, order, reason), deadlineMs', 'fail: reason => failCenaOrder(admin, order, reason), deadlineMs: undefined', deadlinePropagationProof],
  ['transporte ignora timeout limitado', F.audio, 'timeout: deps.timeoutMs ?? 90_000', 'timeout: 90_000', audioProof],
  ['transporte ignora download limitado', F.audio, 'deps.downloadTimeoutMs ?? 20_000', '20_000', audioProof],
  ['runtime volta a voz de 90s', F.runtime, 'timeoutMs: 30_000, downloadTimeoutMs: 10_000', 'timeoutMs: 90_000, downloadTimeoutMs: 10_000', beforeVideoProof],
]
let killed = 0
for (const [name, file, from, to, proof] of mutations) await check('mutante real fica VERMELHO: ' + name, async () => { const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'); assert.equal(source.split(from).length, 2, 'mutante exige um alvo exato: ' + name); const changed = source.replace(from, to); assert.notEqual(changed, source); let red = false; try { await proof({ [file]: changed }) } catch (e) { assert.ok(!['SyntaxError', 'ReferenceError'].includes(e.name) && !/Unexpected import:|Offline test forbids|Module outside test workspace:/u.test(e.message), 'mutante inválido por sintaxe/import: ' + name + ' → ' + e.message); red = true } assert.ok(red, 'mutante sobreviveu: ' + name); killed++ })
console.log(`\ntest-ads-cena-95-runtime-2110: ${good} verdes, ${bad} vermelhos; ${killed}/${mutations.length} mutantes reais vermelhos esperados; nenhum serviço, env, banco ou render real`)
process.exitCode = bad ? 1 : 0
