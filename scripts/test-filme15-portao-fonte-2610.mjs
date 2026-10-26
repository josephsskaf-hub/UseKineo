// KINEO-FILME15-PERFEITO-2610: repair through the REAL signed server adapter.
// Only DB/provider edges are fake. No env files, network, credits or paid render.
import assert from 'node:assert/strict'
import path from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const rootArg = process.argv.indexOf('--source-root')
if (rootArg >= 0) process.chdir(path.resolve(process.argv[rootArg + 1]))
const clone = value => JSON.parse(JSON.stringify(value))
const forbidden = () => { throw Error('External action forbidden') }
const media = { url: 'https://fixture.invalid/original.mp4', snapshotUrl: null, durationSeconds: 15 }
const oldClip = 'https://fixture.invalid/scene-1.mp4'
const newClip = 'https://fixture.invalid/scene-1-repaired.mp4'
const goodPixel = { score: 95, cap_limit: 100, caps: [], evidence_status: 'complete', caption_language_ok: true, caption_legible: true, identity_consistent: true, frames: [] }
const badPixel = { ...goodPixel, score: 85, cap_limit: 85, caps: ['invented text'], frames: [{ i: 1, t: 7, issues: ['invented_text'], note: 'An invented sign covers the subject' }] }

function fixture(transform = null) {
  let gateRow = null, sceneDone = false, renderDone = false
  const saved = new Map(), calls = { scenes: [], renders: [], judgments: 0, judgeOptions: [] }
  const db = { from(table) {
    assert.equal(table, 'events')
    let patch = null; const filters = []
    const q = {
      select() { return q }, eq(key, value) { filters.push([key, value]); return q },
      update(value) { patch = value; return q },
      async insert(value) { if (gateRow) return { error: { code: '23505' } }; gateRow = clone(value); return { error: null } },
      async upsert(value) { if (!saved.has(value.id)) saved.set(value.id, clone(value)); return { error: null } },
      async maybeSingle() {
        const matches = gateRow && filters.every(([key, value]) => (key === 'metadata->>authority' ? gateRow.metadata.authority : gateRow[key]) === value)
        if (patch) {
          if (!matches) return { data: null, error: null }
          gateRow = { ...gateRow, ...clone(patch) }; return { data: { id: gateRow.id }, error: null }
        }
        return { data: matches ? clone(gateRow) : null, error: null }
      },
    }
    return q
  } }
  const load = createOfflineLoader({ env: { FAL_KEY: 'offline-fixture-key' }, source: transform, mocks: {
    '@fal-ai/client': { fal: { config() {}, queue: {
      status: async (_model, { requestId }) => ({ status: sceneDone ? 'COMPLETED' : 'IN_PROGRESS', request_id: requestId }),
      result: async () => ({ data: { video: { url: newClip } } }),
    } } },
    '@/lib/falQueue': { submitFalQueueOnce: async (model, input) => { calls.scenes.push(clone({ model, input })); return 'repair-request-1' } },
    '@/lib/compose': {
      submitCreatomateRender: async source => { calls.renders.push(clone(source)); return 'repair-render-1' },
      pollCreatomateRender: async () => ({ status: renderDone ? 'succeeded' : 'processing', url: renderDone ? 'https://fixture.invalid/approved.mp4' : null, snapshotUrl: null, exactDurationSeconds: 15.1, durationSeconds: 15 }),
    },
    '@/lib/regua95/pixelScore': { scorePixel: async (...args) => { calls.judgeOptions.push(clone(args[3])); return clone(++calls.judgments === 1 ? badPixel : goodPixel) } },
    '@/lib/credits/refund': { refundRenderCredits: forbidden },
  } })
  const core = load('@/lib/freeRedo/core'), classic = load('@/lib/classicSceneRetry')
  const source = { duration: 15, frame_rate: 30, elements: [
    ...[0, 1, 2].map(index => ({ type: 'video', track: 2, source: `https://fixture.invalid/scene-${index}.mp4`, time: index * 5, duration: 5 })),
    { type: 'audio', track: 4, source: 'https://fixture.invalid/narration.mp3', time: 0, duration: 15 },
    { type: 'text', track: 5, text: 'The canonical spoken words.', time: 0, duration: 15 },
  ] }
  const inputs = [0, 1, 2].map(index => ({ prompt: `Scene ${index}: the same cat discovers a golden key beside the old door.`, duration: '6', image_url: 'https://fixture.invalid/scene-0-base.jpg', resolution: '720p', aspect_ratio: '9:16', generate_audio: false, seed: 100 + index }))
  const claim = { engine: 'seedance', quality: 'cinematic_ai', generationId: 'generation-source-2610', status: 'settled', userId: 'owner-source',
    falModels: Array(3).fill(classic.SEEDANCE_I2V_MODEL), authorizedCompletedUrls: [0, 1, 2].map(index => `https://fixture.invalid/scene-${index}.mp4`),
    response: { scene_fal_inputs: inputs, scene_narrations: ['It opens.', 'It finds a key.', 'It returns.'], original_source: source }, resolutionReference: 'cinematic-offline-2610' }
  const initial = { version: 'free15-gate-v1', status: 'ready', source, captionElements: [], captionEvidence: null, attempted: false, reason: 'awaiting_assembly', updatedAt: Date.now(),
    context: { asked: 'A cat finds a key.', narration: 'It opens the door, finds a key, and returns.', language: 'en' } }
  const server = load('@/lib/free15GateServer')
  const context = { db, secret: 'offline-signing-key', userId: claim.userId, renderId: 'original-render-source' }
  return { calls, core, source, claim, inputs, saved, initial, context,
    seed: () => server.storeFree15Gate({ ...context, state: initial }),
    run: () => server.runFree15Gate({ ...context, claim, media }),
    finishScene: () => { sceneDone = true }, finishRender: () => { renderDone = true },
  }
}

async function completeRepair(transform = null) {
  const h = fixture(transform); assert.equal(await h.seed(), true)
  assert.equal((await h.run()).status, 'pending') // judge -> exactly one scene submit
  await h.run(); await h.run() // provider pending: only poll, never POST again
  assert.equal(h.calls.scenes.length, 1)
  h.finishScene(); await h.run() // swap one culprit and submit one composition
  await h.run(); await h.run() // composition pending: only poll
  assert.equal(h.calls.renders.length, 1)
  h.finishRender(); assert.equal((await h.run()).status, 'pending') // judge -> next poll exposes verdict
  const outcome = await h.run()
  assert.equal(outcome.status, 'passed')
  await h.run() // replay must not reshoot or recompose
  return { h, outcome }
}

let checks = 0
const check = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name) }
function assertSignedInput(h) {
  assert.equal(h.calls.scenes[0].model, h.claim.falModels[1])
  const { prompt, ...sent } = h.calls.scenes[0].input
  const { prompt: originalPrompt, ...original } = h.inputs[1]
  assert.deepEqual(sent, original)
  assert.match(prompt, /^Repair this shot:/)
  assert.ok(prompt.includes(originalPrompt))
  assert.equal(h.calls.scenes.length, 1)
  assert.equal(h.calls.renders.length, 1)
  assert.equal(h.calls.judgments, 2)
  assert.ok(h.calls.judgeOptions.every(options => options.fps === h.source.frame_rate && options.exactFrameTimes === true), 'gate uses the signed output frame rate and unrounded sample times')
}
function assertApprovedSource(h) {
  const saved = [...h.saved.values()].filter(row => row.name === h.core.FILM_SOURCE_EVENT)
  assert.equal(saved.length, 1, 'one deterministic source even on replay')
  const verified = h.core.verifyFilmSource(h.context.secret, h.context.userId, h.context.renderId, saved[0].metadata)
  assert.equal(verified.ok, true)
  assert.ok(h.core.videoUrlsOf(verified.source).includes(newClip))
  assert.ok(!h.core.videoUrlsOf(verified.source).includes(oldClip))
  assert.deepEqual(clone(verified.source), h.calls.renders[0])
  assert.deepEqual(h.source.elements.filter(el => el.type !== 'video'), verified.source.elements.filter(el => el.type !== 'video'))
  assert.ok(h.core.videoUrlsOf(h.source).includes(oldClip), 'old source was not mutated')
}
await check('actual repair adapter preserves signed model, image, duration, resolution, seed and silent audio', async () => {
  const { h } = await completeRepair()
  assertSignedInput(h)
})
await check('approved source is signed to original render and never resurrects the rejected clip on future free redo', async () => {
  const { h, outcome } = await completeRepair()
  assert.equal(outcome.media.url, 'https://fixture.invalid/approved.mp4')
  assertApprovedSource(h)
})
await check('mutant stripping signed image/duration/audio from paid scene input is rejected', async () => {
  const transform = (file, source) => file === 'lib/free15GateServer.ts' ? source.replace('{ ...scene.input, prompt:', '{ prompt:') : source
  const { h } = await completeRepair(transform)
  assert.throws(() => assertSignedInput(h), assert.AssertionError)
})
await check('mutant saving the original failed source instead of approved source is rejected', async () => {
  const transform = (file, source) => file === 'lib/free15GateServer.ts' ? source.replace('source: outcome.source', 'source: a.claim.response.original_source') : source
  const { h } = await completeRepair(transform)
  assert.throws(() => assertApprovedSource(h), assert.AssertionError)
})
console.log(`${checks} adapter/source checks passed`)
