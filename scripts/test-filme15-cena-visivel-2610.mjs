// KINEO-FILME15-PERFEITO-2610: the real signed builder has micro-overlapping shots.
// Run its output through the actual delivery gate; no provider/env/network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const file = 'lib/free15Gate.ts'
const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const clone = value => JSON.parse(JSON.stringify(value))
const load = createOfflineLoader({ mocks: { '@/lib/narration/niche-mapping': { selectPersonaForScript: () => null } } })
const compose = load('@/lib/compose')
const urls = [0, 1, 2].map(i => `https://fixture.invalid/clip-${i}.mp4`)
const source = compose.buildCreatomateSource({
  clipUrls: urls, clipSeconds: [6, 6, 6], voiceoverUrl: 'https://fixture.invalid/voice.mp3',
  voiceoverScript: 'A girl opens the gate. She finds the golden key. She returns home.',
  sceneCaptions: [], duration: 15, realAudioDuration: 15, quality: 'cinematic_ai', seedanceShortFilm: true,
  musicUrl: null, watermark: false, endCard: false,
})
const shots = source.elements.filter(e => e.type === 'video' && e.track === 2)
assert.equal(shots.length, 3)
const scenes = urls.map((clipUrl, index) => ({ index, clipUrl, model: 'seedance', input: {}, seconds: 6 }))
const state = { version: 'free15-gate-v1', status: 'ready', source, attempted: false, captionElements: [], captionEvidence: null, reason: '', updatedAt: 0 }
const media = { url: 'https://fixture.invalid/final.mp4', snapshotUrl: null, durationSeconds: 15 }
const verdict = t => ({ score: 85, cap_limit: 85, caps: ['invented text'], evidence_status: 'complete', identity_consistent: true,
  caption_legible: true, caption_language_ok: true, frames: [{ i: 1, t, issues: ['invented_text'], note: 'Invented sign in this shot.' }] })

function contract(gate) {
  for (let i = 1; i < shots.length; i++) {
    const cut = shots[i].time
    assert.ok(shots[i - 1].time + shots[i - 1].duration > cut, 'actual builder overlaps outgoing tail')
    for (const t of [cut, cut + 0.02, cut + 0.05]) {
      assert.equal(gate.decideFree15Gate(state, media, verdict(t), scenes).sceneIndex, i, `visible incoming scene at ${t}s`)
    }
    assert.equal(gate.decideFree15Gate(state, media, verdict(cut - 0.001), scenes).sceneIndex, i - 1, 'before the cut belongs to outgoing shot')
  }
  assert.equal(gate.decideFree15Gate(state, media, verdict(1), scenes).sceneIndex, 0)
  assert.equal(gate.decideFree15Gate(state, media, verdict(null), scenes).kind, 'fail', 'missing time cannot buy an arbitrary scene')
  assert.equal(gate.decideFree15Gate(state, media, verdict(100), scenes).kind, 'fail', 'out-of-timeline evidence cannot buy an arbitrary scene')
}
const gate = load('@/lib/free15Gate')
contract(gate)
assert.deepEqual(clone(source.elements.filter(e => e.type === 'video')), clone(shots), 'gate leaves assembled source intact')
const before = 'return hits.reduce<{ index: number; start: number } | undefined>((visible, hit) =>\n    !visible || hit.start >= visible.start ? hit : visible, undefined)?.index'
assert.equal(raw.split(before).length, 2, 'mutant replaces exactly the production visibility choice')
const mutant = raw.replace(before, 'return hits[0]?.index')
const mutatedGate = createOfflineLoader({ source: (name, text) => name === file ? mutant : text })(file)
assert.throws(() => contract(mutatedGate), assert.AssertionError, 'old first-hit policy must fail the same cut contract')

// A rounded timestamp can still select the wrong shot even after fixing overlap.
// 24fps: actual frame 135 is 5.625s; 5.6s labels it before a real 5.61s cut.
const pixel = createOfflineLoader({ globals: { AbortController, setTimeout, clearTimeout } })('@/lib/regua95/pixelScore')
const nthFixture = () => {
  const requests = []
  const fetchImpl = async (url, opts) => {
    requests.push({ url, body: JSON.parse(opts.body) })
    return { ok: true, json: async () => ({ images: Array.from({ length: 8 }, (_, i) => ({ url: `https://fixture.invalid/frame-${i}.jpg` })) }) }
  }
  return { requests, fetchImpl }
}
for (const [fps, interval, cut] of [[24, 45, 5.61], [30, 56, 5.59]]) {
  const f = nthFixture()
  const extracted = await pixel.extractFramesFal(media.url, 15, { fetchImpl: f.fetchImpl, falKey: 'offline-only', fps, exactFrameTimes: true })
  assert.equal(f.requests[0].body.frame_interval, interval)
  assert.equal(extracted.frames[3].t, 3 * interval / fps, 'sample position is unrounded and uses source frame rate')
  // The existing anchor anticipates the next word by 0.15s into its pause.
  const threeWords = [{ word: 'First.', start: 0, end: 1, sentenceEnd: true }, { word: 'Second.', start: cut + 0.15, end: cut + 1, sentenceEnd: true }, { word: 'Third.', start: 10.5, end: 12, sentenceEnd: true }]
  const timedSource = compose.buildCreatomateSource({
    clipUrls: urls, clipSeconds: [6, 6, 6], voiceoverUrl: 'https://fixture.invalid/voice.mp3', voiceoverScript: 'First. Second. Third.',
    sceneCaptions: [], duration: 15, realAudioDuration: 15, quality: 'cinematic_ai', seedanceShortFilm: true, musicUrl: null, watermark: false, endCard: false,
    clipSpeech: { narrationWords: ['First.', 'Second.', 'Third.'], wordStarts: [0, 1, 2] }, whisperWords: threeWords,
  })
  assert.equal(timedSource.elements.find(e => e.type === 'video' && e.source === urls[1]).time, cut, 'real builder follows signed speech cut')
  const timedState = { ...state, source: timedSource }
  assert.equal(gate.decideFree15Gate(timedState, media, verdict(extracted.frames[3].t), scenes).sceneIndex, 1)
  if (fps === 24) assert.equal(gate.decideFree15Gate(timedState, media, verdict(5.6), scenes).sceneIndex, 0, 'legacy rounded time reproduces the wrong culprit')
}
const legacyFixture = nthFixture()
const legacy = await pixel.extractFramesFal(media.url, 15, { fetchImpl: legacyFixture.fetchImpl, falKey: 'offline-only' })
assert.equal(legacyFixture.requests[0].body.frame_interval, 45)
assert.equal(legacy.frames[3].t, 5.6, '35/60/90 and historical callers retain legacy sampling/timing without options')
const forwardFixture = nthFixture()
await pixel.scorePixel(media.url, 15, { product: 'filme', asked: 'Offline fixture' }, { fetchImpl: forwardFixture.fetchImpl, falKey: 'offline-only', apiKey: 'offline-only', fps: 30, exactFrameTimes: true })
assert.equal(forwardFixture.requests[0].body.frame_interval, 56, 'scorePixel forwards source frame rate to extraction')
console.log('PASS actual builder overlap and exact 24/30fps culprit; defaults preserved; first-hit mutant rejected')
