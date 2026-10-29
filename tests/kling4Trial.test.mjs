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
  assert.deepEqual(json(input.multi_prompt.map(shot => shot.prompt)), prompts)
  assert.equal(input.multi_prompt.reduce((sum, shot) => sum + shot.duration, 0), 15)
  assert.equal(input.multi_prompt.every(shot => Number.isInteger(shot.duration) && shot.duration > 0), true)
  assert.equal('prompt' in input, false, 'prompt and multi_prompt must not be sent together')
})

test('an existing first-frame still selects image-to-video using the real required field', () => {
  const { model, input } = lib.buildKling4TrialInput(prompts, 'https://fal.media/test/frame.png')
  assert.equal(model, lib.KLING4_I2V_MODEL)
  assert.equal(input.start_image_url, 'https://fal.media/test/frame.png')
  assert.equal(input.image_url, undefined)
  assert.equal(input.resolution, '720p')
  assert.equal(input.aspect_ratio, '9:16')
})

test('daily cap sends Seedance without a single paid Kling call', async () => {
  let paidCalls = 0
  const out = await lib.orchestrateKling4Trial({
    reserve: async () => ({ allowed: false, reason: 'cap' }),
    generate: async () => { paidCalls++; return clip },
  })
  assert.equal(paidCalls, 0)
  assert.equal(out.engineUsed, 'seedance15_cap')
  assert.equal(out.costUsd, 0)
})

test('unreadable or duplicate budget never authorizes a paid call', async () => {
  for (const reserve of [async () => { throw new Error('database unavailable') }, async () => ({ allowed: false, reason: 'unavailable' }), async () => ({ allowed: false, reason: 'duplicate' })]) {
    let paidCalls = 0
    const out = await lib.orchestrateKling4Trial({ reserve, generate: async () => { paidCalls++; return clip } })
    assert.equal(paidCalls, 0)
    assert.equal(out.engineUsed, 'seedance15_fallback')
    assert.equal(out.costUsd, 0)
  }
})

test('reserved success records Kling4; all provider failures keep the reserve and select Seedance', async () => {
  const success = await lib.orchestrateKling4Trial({ reserve: async () => ({ allowed: true, reservedUsd: 2.355 }), generate: async () => clip })
  assert.equal(success.engineUsed, 'kling4')
  assert.equal(success.costUsd, 2.355)
  assert.deepEqual(json(success.video), clip)
  for (const reason of ['503', '422 content refusal', 'network timeout', 'completed without video']) {
    let calls = 0
    const out = await lib.orchestrateKling4Trial({ reserve: async () => ({ allowed: true, reservedUsd: 2.355 }), generate: async () => { calls++; throw new Error(reason) } })
    assert.equal(calls, 1, 'no repeated Kling submission')
    assert.equal(out.engineUsed, 'seedance15_fallback')
    assert.equal(out.costUsd, 2.355, 'ambiguous costs stay reserved')
    assert.equal(out.video, undefined)
  }
})

function world({ submitStatus = 200, status = { status: 'COMPLETED', request_id: clip.requestId }, result = { video: { url: clip.url } }, resultStatus = 200 } = {}) {
  let clock = 0
  const calls = []
  return {
    calls,
    args: { prompts, deadline: 1000 },
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

test('paid generator validates successful queue completion and video result', async () => {
  const w = world()
  const result = await lib.generateKling4TrialVideo(w.args, w.deps)
  assert.equal(result.requestId, clip.requestId)
  assert.equal(result.model, clip.model)
  assert.equal(result.url, clip.url)
  assert.equal(w.calls.filter(call => call.options.method === 'POST').length, 1)
  const posted = JSON.parse(w.calls[0].options.body)
  assert.equal(posted.resolution, '720p')
  assert.equal(posted.aspect_ratio, '9:16')
  assert.equal(posted.duration, 15)
})

test('503, refusal, terminal queue error and malformed result all reject once for fallback', async () => {
  for (const options of [{ submitStatus: 503 }, { submitStatus: 422 }, { status: { status: 'COMPLETED', request_id: clip.requestId, error: 'content rejected' } }, { result: {} }, { resultStatus: 503 }]) {
    const w = world(options)
    await assert.rejects(() => lib.generateKling4TrialVideo(w.args, w.deps))
    assert.equal(w.calls.filter(call => call.options.method === 'POST').length, 1)
  }
})

test('queue wait has a hard deadline and never submits Kling twice', async () => {
  const w = world({ status: { status: 'IN_PROGRESS', request_id: clip.requestId } })
  await assert.rejects(() => lib.generateKling4TrialVideo(w.args, w.deps))
  assert.equal(w.calls.filter(call => call.options.method === 'POST').length, 1)
})

test('an exhausted route deadline skips provider submission', async () => {
  const w = world()
  w.args.deadline = 0
  await assert.rejects(() => lib.generateKling4TrialVideo(w.args, w.deps))
  assert.equal(w.calls.length, 0)
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
