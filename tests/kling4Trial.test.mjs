// Offline guards: no environment files, provider credentials, SDK calls or paid renders.
// Run: node --test tests/kling4Trial.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import * as crypto from 'node:crypto'

const root = resolve(process.env.KLING4_TEST_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..'))
const require = createRequire(import.meta.url)
const ts = require('typescript')
const read = path => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const forbidden = () => { throw new Error('Offline Kling4 guard forbids unmocked network or timers') }
const mocks = {
  'node:crypto': crypto,
  openai: { toFile: forbidden },
  '@supabase/supabase-js': { createClient: forbidden },
  '@/lib/openai': { buildCaptionSegments: () => [], pickHighlightWord: () => null, OPENAI_TTS_TIMEOUT_MS: 55000, OPENAI_WHISPER_TIMEOUT_MS: 60000 },
  '@/lib/freeRedo/core': { trocarClipe: forbidden },
}
const cache = new Map()
function load(path) {
  if (cache.has(path)) return cache.get(path)
  const exports = {}
  cache.set(path, exports)
  const source = read(path)
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, {
    exports, console, URL, AbortController, AbortSignal, Response, Request, Buffer, TextEncoder, TextDecoder,
    fetch: forbidden, setTimeout: forbidden, clearTimeout() {},
    process: { env: {} },
    require(specifier) {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier]
      if (specifier.startsWith('@/')) return load(specifier.slice(2) + '.ts')
      if (specifier.startsWith('.')) return load(join(dirname(path), specifier) + '.ts')
      throw new Error('Offline guard forbids external module: ' + specifier)
    },
  }, { filename: path, timeout: 5000 })
  return exports
}
const lib = load('lib/kling4Trial.ts')
const policy = load('lib/kling4TrialPolicy.ts')
const prompts = ['The same astronaut enters the red room.', 'The astronaut opens a blue box.', 'The astronaut holds the glowing map.']
const clip = { requestId: 'kling4-test-id', model: 'kling/v4/text-to-video', url: 'https://fal.media/test/movie.mp4' }
const job = { requestId: clip.requestId, model: clip.model, submittedAt: '2026-10-28T12:00:00.000Z' }
const json = value => JSON.parse(JSON.stringify(value))

test('one policy switch gates only the admitted first unpaid 15-second film', () => {
  assert.equal(policy.KLING4_TRIAL_LIVE, true)
  const eligible = { paid: false, admitted: true, shortFilm: true, priorFilms: 0, priorDebits: 0 }
  assert.equal(policy.kling4TrialEligible(eligible), true)
  assert.equal(policy.kling4TrialEligible({ ...eligible, live: false }), false)
  for (const change of [{ paid: true }, { admitted: false }, { shortFilm: false }, { priorFilms: 1 }, { priorDebits: 1 }, { priorFilms: null }, { priorDebits: null }]) {
    assert.equal(policy.kling4TrialEligible({ ...eligible, ...change }), false, JSON.stringify(change))
  }
})

test('Kling4 payload is always multi-shot, 15s, 720p and portrait', () => {
  assert.equal(lib.KLING4_T2V_MODEL, 'kling/v4/text-to-video')
  assert.equal(lib.KLING4_I2V_MODEL, 'kling/v4/image-to-video')
  const { model, input } = lib.buildKling4TrialInput(prompts)
  assert.equal(model, lib.KLING4_T2V_MODEL)
  assert.equal(input.duration, 15)
  assert.equal(input.resolution, '720p')
  assert.equal(input.aspect_ratio, '9:16')
  assert.equal(input.multi_prompt.length, 3)
  assert.equal(input.multi_prompt.every((shot, i) => shot.prompt.includes(prompts[i])), true)
  assert.equal(input.multi_prompt.reduce((sum, shot) => sum + shot.duration, 0), 15)
  assert.equal(input.multi_prompt.every(shot => Number.isInteger(shot.duration) && shot.duration > 0), true)
  assert.equal('prompt' in input, false, 'prompt and multi_prompt must not be sent together')
})

test('approved per-scene stills select image-to-video using only documented image fields', () => {
  const stills = ['https://fal.media/test/frame1.png', 'https://fal.media/test/frame2.png', 'https://fal.media/test/frame3.png']
  const { model, input } = lib.buildKling4TrialInput(prompts, stills)
  assert.equal(model, lib.KLING4_I2V_MODEL)
  assert.equal(input.start_image_url, stills[0])
  assert.deepEqual(json(input.middle_image_urls), stills.slice(1))
  assert.equal(input.image_url, undefined)
  assert.equal(input.resolution, '720p')
  assert.equal('aspect_ratio' in input, false, 'I2V orientation is inherited from the approved portrait frame')
})

test('missing approved stills stay text-directed without fabricated array placeholders or changed scene order', () => {
  const stills = ['https://fal.media/test/frame1.png', null, 'https://fal.media/test/frame3.png']
  const { input } = lib.buildKling4TrialInput(prompts, stills)
  assert.deepEqual(json(input.middle_image_urls), [stills[2]])
  assert.equal(input.multi_prompt.length, 3)
  assert.match(input.multi_prompt[1].prompt, /no(?: new)? keyframe/i)
  assert.match(input.multi_prompt[2].prompt, /middle keyframe\s*1/i)
  for (let i = 0; i < 3; i++) assert.equal(input.multi_prompt[i].prompt.includes(prompts[i]), true)
  const textOnly = lib.buildKling4TrialInput(prompts, [null, stills[0], stills[2]])
  assert.equal(textOnly.model, lib.KLING4_T2V_MODEL, 'without scene one there is no valid I2V start frame')
  assert.equal(textOnly.input.aspect_ratio, '9:16')
  assert.equal('start_image_url' in textOnly.input, false)
  assert.equal('middle_image_urls' in textOnly.input, false, 'T2V schema has no optional image fields')
})

test('per-shot prompts fit the official 512-character schema including keyframe direction', () => {
  const result = lib.buildKling4TrialInput(prompts.map(prompt => prompt + ' A coherent camera movement.'.repeat(80)), ['https://fal.media/test/frame1.png', null, 'https://fal.media/test/frame3.png'])
  assert.equal(result.input.multi_prompt.every(shot => shot.prompt.length > 0 && shot.prompt.length <= 512), true)
  assert.match(result.input.multi_prompt[1].prompt, /no(?: new)? keyframe/i)
  assert.match(result.input.multi_prompt[2].prompt, /middle keyframe\s*1/i)
  const unicode = lib.buildKling4TrialInput(['Astronaut ' + '🌌'.repeat(600)])
  assert.equal(Array.from(unicode.input.multi_prompt[0].prompt).length, 512)
  assert.equal(/\uD800(?![\uDC00-\uDFFF])|[\uD800-\uDBFF]$/.test(unicode.input.multi_prompt[0].prompt), false, 'truncate at Unicode code-point boundaries')
})

test('only the exact selected still with a PASS verdict can enter Kling image inputs', () => {
  const urls = ['https://fal.media/test/approved-original.png', 'https://fal.media/test/approved-remade.png', 'https://fal.media/test/unjudged.png']
  const reports = [
    { cena: 1, url_original: urls[0], url_final: urls[0], veredito: 'PASS', escolhida: 'original', escolhida_tentativa: 0,
      tentativas: [{ n: 0, url: urls[0], veredito: 'PASS' }] },
    { cena: 2, url_original: 'https://fal.media/test/bad-original.png', url_final: urls[1], veredito: 'FAIL', escolhida: 'regerada', escolhida_tentativa: 1, veredito_regerada: 'PASS',
      tentativas: [{ n: 0, url: 'https://fal.media/test/bad-original.png', veredito: 'FAIL' }, { n: 1, url: urls[1], veredito: 'PASS' }] },
    { cena: 3, url_original: urls[2], url_final: urls[2], veredito: 'ERRO', escolhida: 'original', escolhida_tentativa: 0,
      tentativas: [{ n: 0, url: urls[2], veredito: 'ERRO' }] },
  ]
  assert.deepEqual(json(lib.approvedKling4TrialStills(urls, reports)), [urls[0], urls[1], null])
  assert.deepEqual(json(lib.approvedKling4TrialStills([urls[0], 'https://fal.media/test/replaced-after-judgment.png', urls[2]], reports)), [urls[0], null, null])
  for (const veredito of ['FAIL', 'ERRO', 'PULADO', null]) {
    const bad = { ...reports[0], veredito, tentativas: [{ n: 0, url: urls[0], veredito }] }
    assert.deepEqual(json(lib.approvedKling4TrialStills([urls[0]], [bad])), [null], String(veredito))
  }
  assert.deepEqual(json(lib.approvedKling4TrialStills([urls[0]], [])), [null], 'a still URL alone does not prove approval')
  const wrongFinal = { ...reports[0], escolhida_tentativa: 1, tentativas: [{ n: 0, url: 'https://fal.media/test/earlier-pass.png', veredito: 'PASS' }, { n: 1, url: urls[0], veredito: 'FAIL' }] }
  assert.deepEqual(json(lib.approvedKling4TrialStills([urls[0]], [wrongFinal])), [null], 'an earlier PASS never approves a failed selected still')
  assert.deepEqual(json(lib.approvedKling4TrialStills([urls[0]], [], [{ cena: 1, url: urls[0], veredito: 'PASS' }])), [urls[0]], 'a separately judged no-sheet replacement carries its own URL approval')
  assert.deepEqual(json(lib.approvedKling4TrialStills([urls[0]], [], [{ cena: 2, url: urls[0], veredito: 'PASS' }])), [null], 'a different scene cannot approve this image')
})

test('daily cap sends Seedance without a single paid Kling call', async () => {
  let paidCalls = 0
  const out = await lib.orchestrateKling4Trial({
    reserve: async () => ({ allowed: false, reason: 'cap' }),
    submit: async () => { paidCalls++; return job },
  })
  assert.equal(paidCalls, 0)
  assert.equal(out.engineUsed, 'seedance15_cap')
  assert.equal(out.costUsd, 0)
})

test('unreadable or duplicate budget never authorizes a paid call', async () => {
  for (const reserve of [async () => { throw new Error('database unavailable') }, async () => ({ allowed: false, reason: 'unavailable' }), async () => ({ allowed: false, reason: 'duplicate' })]) {
    let paidCalls = 0
    const out = await lib.orchestrateKling4Trial({ reserve, submit: async () => { paidCalls++; return job } })
    assert.equal(paidCalls, 0)
    assert.equal(out.engineUsed, 'seedance15_fallback')
    assert.equal(out.costUsd, 0)
  }
})

test('queue acceptance records Kling4 immediately; failed submissions keep the reserve and select Seedance', async () => {
  const success = await lib.orchestrateKling4Trial({ reserve: async () => ({ allowed: true, reservedUsd: 2.355 }), submit: async () => job })
  assert.equal(success.engineUsed, 'kling4')
  assert.equal(success.costUsd, 2.355)
  assert.deepEqual(json(success.job), job)
  for (const reason of ['503', '422 content refusal', 'network timeout', 'missing accepted request ID']) {
    let calls = 0
    const out = await lib.orchestrateKling4Trial({ reserve: async () => ({ allowed: true, reservedUsd: 2.355 }), submit: async () => { calls++; throw new Error(reason) } })
    assert.equal(calls, 1, 'no repeated Kling submission')
    assert.equal(out.engineUsed, 'seedance15_fallback')
    assert.equal(out.costUsd, 2.355, 'ambiguous costs stay reserved')
    assert.equal(out.job, undefined)
  }
})

function world({ submitStatus = 200, status = { status: 'COMPLETED', request_id: clip.requestId }, result = { video: { url: clip.url } }, resultStatus = 200 } = {}) {
  let clock = 0
  const calls = []
  return {
    calls,
    args: { prompts },
    deps: {
      apiKey: 'offline-placeholder', now: () => clock,
      sleep: async ms => { clock += ms },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options })
        if (options.method === 'POST') return new Response(JSON.stringify({ request_id: clip.requestId, status_url: `https://queue.fal.run/kling/v4/requests/${clip.requestId}/status`, response_url: `https://queue.fal.run/kling/v4/requests/${clip.requestId}` }), { status: submitStatus })
        if (String(url).includes('/status')) return new Response(JSON.stringify(status), { status: 200 })
        return new Response(JSON.stringify(result), { status: resultStatus })
      },
    },
  }
}

test('birth performs exactly one POST and returns the accepted job without polling or waiting', async () => {
  const w = world()
  const result = await lib.submitKling4TrialVideo(w.args, w.deps)
  assert.equal(result.requestId, clip.requestId)
  assert.equal(result.model, clip.model)
  assert.ok(result.submittedAt !== undefined)
  assert.equal(result.url, undefined, 'an accepted asynchronous job does not pretend the video is already finished')
  assert.equal(w.calls.length, 1, 'birth must not make even one GET or invoke its sleep dependency')
  assert.equal(w.calls.filter(call => call.options.method === 'POST').length, 1)
  const posted = JSON.parse(w.calls[0].options.body)
  assert.equal(posted.resolution, '720p')
  assert.equal(posted.aspect_ratio, '9:16')
  assert.equal(posted.duration, 15)
})

test('503 or submit refusal reject exactly once for fallback without a repeated paid POST', async () => {
  for (const options of [{ submitStatus: 503 }, { submitStatus: 422 }]) {
    const w = world(options)
    await assert.rejects(() => lib.submitKling4TrialVideo(w.args, w.deps))
    assert.equal(w.calls.filter(call => call.options.method === 'POST').length, 1)
  }
})

test('a polling cycle performs only status GETs and a completed job fetches its video once', async () => {
  const w = world()
  const result = await lib.pollKling4TrialVideo(clip.requestId, w.deps)
  assert.equal(result.status, 'done')
  assert.equal(result.url, clip.url)
  assert.equal(w.calls.length, 2)
  assert.equal(w.calls.some(call => call.options.method === 'POST'), false)
})

test('pending queue states remain Kling while a completed provider error is terminal', async () => {
  for (const [status, expected] of [['IN_QUEUE', 'pending'], ['IN_PROGRESS', 'processing']]) {
    const w = world({ status: { status, request_id: clip.requestId } })
    const result = await lib.pollKling4TrialVideo(clip.requestId, w.deps)
    assert.equal(result.status, expected)
    assert.equal(result.url, null)
    assert.equal(w.calls.length, 1)
  }
  const w = world({ status: { status: 'COMPLETED', request_id: clip.requestId, error: 'content refused' } })
  assert.equal((await lib.pollKling4TrialVideo(clip.requestId, w.deps)).status, 'failed')
  assert.equal(w.calls.length, 1, 'a known terminal job error must not fetch or retry video')
})

test('preflight failures report zero Kling cost through the real orchestrator and never send HTTP', async () => {
  for (const failure of ['missing_key', 'empty_plan']) {
    const w = world()
    let posts = 0
    w.deps.onPost = () => { posts++ }
    if (failure === 'missing_key') w.deps.apiKey = ''
    if (failure === 'empty_plan') w.args.prompts = [' ', '']
    const out = await lib.orchestrateKling4Trial({
      reserve: async () => ({ allowed: true }),
      submit: () => lib.submitKling4TrialVideo(w.args, w.deps),
    })
    assert.equal(out.engineUsed, 'seedance15_fallback', failure)
    assert.equal(out.costUsd, 0, failure)
    assert.equal(out.reason, 'provider_not_submitted', failure)
    assert.equal(w.calls.length, 0, failure)
    assert.equal(posts, 0, failure)
  }
})

test('signed claim reader rejects fabricated rollout markers and unrelated film families', () => {
  const { kling4TrialEngineFromClaim: engineFrom, kling4TrialVideoUrlFromClaim: urlFrom } = load('lib/kling4TrialClaim.ts')
  const claim = { duration: 15, quality: 'cinematic_ai', aspect: '9:16', kling4_trial: { version: 'kling4_trial_2810', engine_used: 'kling4', cost_usd: 2.355, country: 'BR' } }
  assert.equal(engineFrom(claim), 'kling4')
  for (const engine of ['seedance15_fallback', 'seedance15_cap']) assert.equal(engineFrom({ ...claim, kling4_trial: { ...claim.kling4_trial, engine_used: engine } }), engine)
  for (const invalid of [null, {}, { ...claim, quality: 'cinematic_kling' }, { ...claim, duration: 35 }, { ...claim, aspect: '16:9' }, { ...claim, kling4_trial: { ...claim.kling4_trial, version: 'forged' } }, { ...claim, kling4_trial: { ...claim.kling4_trial, engine_used: 'kling3' } }]) assert.equal(engineFrom(invalid), null)
  assert.equal(urlFrom({ ...claim, kling4_trial: { ...claim.kling4_trial, video_url: clip.url } }), clip.url)
  for (const video_url of [undefined, '', 'http://insecure.test/video.mp4']) assert.equal(urlFrom({ ...claim, kling4_trial: { ...claim.kling4_trial, video_url } }), null)
  assert.equal(urlFrom({ ...claim, kling4_trial: { ...claim.kling4_trial, engine_used: 'seedance15_cap', video_url: clip.url } }), null)
})

test('actual montage preserves one uninterrupted Kling video, mutes its audio and keeps our voice/music', () => {
  const { buildCreatomateSource } = load('lib/compose.ts')
  const source = buildCreatomateSource({
    clipUrls: [clip.url], voiceoverUrl: 'https://storage.test/narration.mp3', voiceoverScript: '', sceneCaptions: [],
    duration: 15, quality: 'cinematic_ai', realAudioDuration: 10, aspect: '9:16',
    kling4TrialEngine: 'kling4', musicUrl: 'https://storage.test/music.mp3',
  })
  assert.ok(source.duration >= 15)
  const videos = source.elements.filter(element => element.type === 'video')
  assert.equal(videos.length, 1)
  assert.equal(videos[0].source, clip.url)
  assert.equal(videos[0].time, 0)
  assert.equal(videos[0].trim_start, 0)
  assert.equal(videos[0].duration, source.duration)
  assert.equal(videos[0].volume, '0%', 'native Kling narration and music must never be audible')
  const audio = source.elements.filter(element => element.type === 'audio')
  assert.equal(audio.find(element => element.track === 4)?.source, 'https://storage.test/narration.mp3')
  assert.equal(audio.find(element => element.track === 4)?.volume, '100%')
  assert.equal(audio.find(element => element.track === 8)?.source, 'https://storage.test/music.mp3')
})

test('all experiment outcomes reach 15 seconds without changing paid or nontrial timelines', () => {
  const { buildCreatomateSource } = load('lib/compose.ts')
  const base = { clipUrls: [clip.url], voiceoverUrl: 'https://storage.test/narration.mp3', voiceoverScript: '', sceneCaptions: [], duration: 15, quality: 'cinematic_ai', realAudioDuration: 10, aspect: '9:16' }
  for (const engine of ['kling4', 'seedance15_fallback', 'seedance15_cap']) {
    const source = buildCreatomateSource({ ...base, kling4TrialEngine: engine })
    assert.ok(source.duration >= 15, engine)
    assert.equal(source.elements.filter(element => element.type === 'video').every(element => element.volume === '0%'), true)
  }
  assert.equal(buildCreatomateSource(base).duration, 10, 'unrelated paid/nontrial behavior stays unchanged')
  assert.ok(buildCreatomateSource({ ...base, realAudioDuration: 16.3, kling4TrialEngine: 'kling4' }).duration >= 16.3, 'longer narration must stay complete')
})

test('delivery gate rejects an observed film below 15 seconds for the trial', () => {
  const { decideFree15Gate } = load('lib/free15Gate.ts')
  const state = { minimumSeconds: 15, source: { elements: [] }, captionEvidence: null }
  for (const durationSeconds of [0, 14, 14.9, 14.999]) {
    assert.deepEqual(json(decideFree15Gate(state, { durationSeconds }, null, [])), { kind: 'fail', reason: 'duration_below_15' })
  }
  assert.equal(decideFree15Gate(state, { durationSeconds: null }, null, []).reason, 'duration_unverified')
  assert.equal(decideFree15Gate(state, { durationSeconds: 15 }, null, []).reason, 'pixel_evidence_unverified', '15 seconds passes duration guard and continues visual QA')
  assert.equal(decideFree15Gate({ ...state, minimumSeconds: undefined }, { durationSeconds: 14.9 }, null, []).reason, 'pixel_evidence_unverified', 'existing unrelated 14-second contract remains unchanged')
})

test('actual compose route makes the verified trial aspect authoritative over a square browser request', async () => {
  const route = read('app/api/compose/route.ts')
  const from = route.indexOf('const cinematicClaimLoad = await loadVerifiedCinematicClaim({')
  const to = route.indexOf('{ // KINEO-FILME15-FIEL-2610', from)
  assert.ok(from >= 0 && to > from, 'verified claim-to-aspect route slice must exist')
  const slice = route.slice(from, to)
  const exports = {}
  const code = ts.transpileModule(`export async function apply(body, verified) {
    const composeAdmin = {}, serviceRoleKey = 'offline-placeholder', authenticatedUserId = 'offline-user', generationId = 'offline-film'
    let cinematicBirthClaim = null
    let aspectRequested = normalizeAspect(body.aspect)
    const recorded = []
    const loadVerifiedCinematicClaim = async () => verified
    const recordKling4TrialFilm = async (_db, input) => { recorded.push(input) }
    const NextResponse = { json: value => value }
    ${slice}
    return { aspectRequested, recorded }
  }`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, console, normalizeAspect: load('lib/aspect.ts').normalizeAspect,
    kling4TrialEngineFromClaim: load('lib/kling4TrialClaim.ts').kling4TrialEngineFromClaim }, { timeout: 5000 })
  const claim = { response: { duration: 15, quality: 'cinematic_ai', aspect: '9:16', kling4_trial: { version: 'kling4_trial_2810', engine_used: 'kling4', cost_usd: 2.355, country: 'BR' } } }
  for (const engine of ['kling4', 'seedance15_fallback', 'seedance15_cap']) {
    const current = { ...claim, response: { ...claim.response, kling4_trial: { ...claim.response.kling4_trial, engine_used: engine } } }
    for (const aspect of ['1:1', '16:9']) {
      const result = await exports.apply({ aspect }, { ok: true, claim: current })
      assert.equal(result.aspectRequested, '9:16', engine + '/' + aspect)
      assert.equal(result.recorded.length, 1, 'recovery restores the one-per-film record')
      assert.equal(result.recorded[0].engineUsed, engine)
    }
  }
  for (const response of [{}, { ...claim.response, kling4_trial: { ...claim.response.kling4_trial, version: 'forged' } }]) {
    const result = await exports.apply({ aspect: '1:1', kling4_trial: claim.response.kling4_trial }, { ok: true, claim: { response } })
    assert.equal(result.aspectRequested, '1:1', 'body markers and invalid claim markers cannot alter unrelated films')
    assert.equal(result.recorded.length, 0)
  }
  const rejected = await exports.apply({ aspect: '1:1' }, { ok: false, claim, error: 'invalid signature' })
  assert.equal(rejected.error, 'AI clip ownership could not be verified. Nothing was submitted.')
})
