// KINEO-FILME15-PERFEITO-2610: execute the current gate, including failures and races.
// All providers are injected fakes. No credentials, env files, network or paid render.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const FILE = 'lib/free15Gate.ts'
const raw = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
const clone = value => JSON.parse(JSON.stringify(value))
const load = source => createOfflineLoader({ source: (file, text) => file === FILE ? source : text })(FILE)
const original = { url: 'https://fixture.invalid/original.mp4', snapshotUrl: null, durationSeconds: 15 }
const repaired = { url: 'https://fixture.invalid/repaired.mp4', snapshotUrl: 'https://fixture.invalid/poster.jpg', durationSeconds: 15.5 }
const source = { width: 1080, height: 1920, duration: 15, elements: [
  ...[0, 1, 2].map(i => ({ type: 'video', source: `clip-${i}`, time: i * 5, duration: 5, trim_start: .1, track: 1 })),
  { type: 'audio', source: 'same-approved-voice', track: 4, time: 0, duration: 15 },
  { type: 'audio', source: 'same-music', track: 3, time: 0, duration: 15 },
  { type: 'text', text: 'original caption', track: 5, time: 0, duration: 4 },
  { type: 'text', text: 'brand watermark', track: 9, time: 0, duration: 15 },
] }
const canonical = [{ type: 'text', text: 'A personagem abriu a porta e encontrou a chave dourada.', track: 5, time: 0, duration: 15 }]
const frame = (i, t, issues = []) => ({ i, t, score: issues.length ? 40 : 95, issues })
const pixel = extra => ({ score: 95, cap_limit: 100, caps: [], evidence_status: 'complete',
  caption_language_ok: true, caption_legible: true, identity_consistent: true,
  frames: [frame(0, 1), frame(1, 7), frame(2, 12)], ...extra })
const captionBad = () => pixel({ score: 60, cap_limit: 60, caps: ['caption_broken'], caption_legible: false,
  frames: [frame(0, 1), frame(1, 7, ['caption_broken']), frame(2, 12)] })
const sceneBad = issue => pixel({ score: 55, cap_limit: 55, caps: [issue],
  frames: [frame(0, 1), frame(1, 7, [issue]), frame(2, 12)] })
const mismatch = { version: 'own-tts-caption-evidence-v1', status: 'mismatch', reason: 'broad_text_disagreement', expectedTokens: 30, observedTokens: 25,
  expectedCoverage: .2, observedCoverage: .25, longestExpectedGap: 12, longestObservedGap: 9 }
function state(extra = {}) { return { version: 'free15-gate-v1', status: 'ready', source: clone(source), captionElements: clone(canonical),
  captionEvidence: null, attempted: false, reason: 'awaiting_delivery', updatedAt: 1000, ...extra } }
function harness(gate, { initial = state(), judgments = [pixel()], denyMove = false, sceneResult, renderResult, submitSceneError, submitRenderError } = {}) {
  let current = clone(initial), now = 2000
  const calls = { judge: [], scene: [], render: [], polls: [], transitions: [] }
  const deps = {
    now: () => now,
    read: async () => clone(current),
    move: async (before, after) => {
      if (denyMove || JSON.stringify(before) !== JSON.stringify(current)) return false
      current = clone(after); calls.transitions.push(clone(after)); return true
    },
    judge: async media => { calls.judge.push(clone(media)); const p = judgments[Math.min(calls.judge.length - 1, judgments.length - 1)]; if (p instanceof Error) throw p; return clone(p) },
    scenes: src => src.elements.filter(e => e.type === 'video').map((e, i) => ({ index: i, clipUrl: e.source, model: 'seedance15', input: { image_url: 'same-face', prompt: `scene ${i}` }, seconds: 6 })),
    submitScene: async scene => { calls.scene.push(clone(scene)); if (submitSceneError) throw Error('ambiguous supplier submission'); return 'one-scene-job' },
    pollScene: async (scene, requestId) => { calls.polls.push({ scene: clone(scene), requestId }); return sceneResult ?? { status: 'done', url: 'new-culprit-clip' } },
    submitRender: async src => { calls.render.push(clone(src)); if (submitRenderError) throw Error('ambiguous render submission'); return 'one-repair-render' },
    pollRender: async id => { assert.equal(id, 'one-repair-render'); return renderResult ?? { status: 'succeeded', ...repaired } },
  }
  return { deps, calls, get: () => clone(current), now: value => { now = value }, advance: () => gate.advanceFree15Gate(deps, original) }
}

async function contract(gate) {
  const assess = (s = state(), media = original, p = pixel(), scenes) => gate.decideFree15Gate(s, media, p, scenes ?? harness(gate).deps.scenes(s.source))
  assert.equal(assess().kind, 'pass')
  for (const seconds of [10.3, 13.9, 13.999]) assert.equal(assess(state(), { ...original, durationSeconds: seconds }).reason, 'duration_below_14')
  for (const seconds of [14, 15, 18, 24]) assert.equal(assess(state(), { ...original, durationSeconds: seconds }).kind, 'pass')
  for (const seconds of [null, NaN, Infinity]) assert.equal(assess(state(), { ...original, durationSeconds: seconds }).kind, 'fail')
  for (const p of [null, pixel({ evidence_status: 'partial' }), pixel({ score: null })]) assert.equal(assess(state(), original, p).kind, 'fail')
  assert.equal(assess(state(), original, captionBad()).kind, 'caption')
  assert.equal(assess(state({ captionEvidence: mismatch })).kind, 'caption')
  assert.equal(assess(state({ captionEvidence: mismatch }), original, null).kind, 'caption', 'known caption mismatch still gets repaired when vision is unavailable')
  for (const issue of ['invented_text', 'subject_missing', 'off_topic']) assert.deepEqual(clone(assess(state(), original, sceneBad(issue))), { kind: 'scene', reason: 'pixel_scene_cap', sceneIndex: 1 })
  const identity = pixel({ score: 50, cap_limit: 50, caps: ['identity_changed'], identity_consistent: false, identity_changes: [{ from: 0, to: 1 }] })
  assert.equal(assess(state(), original, identity).sceneIndex, 1)
  const unknown = sceneBad('invented_text'); unknown.frames[1].t = null
  assert.equal(assess(state(), original, unknown).kind, 'fail', 'unlocated defect cannot buy a random scene')
  const before = clone(source), fixed = gate.repairGateCaptions(source, canonical)
  assert.deepEqual(clone(source), before, 'input source is immutable')
  assert.deepEqual(clone(fixed.elements.filter(e => !gate.isCaptionElement(e))), source.elements.filter(e => !gate.isCaptionElement(e)), 'voice, cuts, music and watermark survive byte-equivalent')
  assert.deepEqual(clone(fixed.elements.filter(gate.isCaptionElement)), canonical)
  assert.equal(gate.repairGateCaptions(source, []), null)
  assert.equal(gate.repairGateCaptions(source, [{ type: 'audio', track: 4 }]), null)

  const clean = harness(gate)
  assert.equal((await clean.advance()).status, 'passed')
  assert.equal(clean.calls.scene.length + clean.calls.render.length, 0)
  assert.equal((await clean.advance()).status, 'passed'); assert.equal(clean.calls.judge.length, 1, 'terminal replay cannot judge/spend again')
  const locked = harness(gate, { denyMove: true })
  assert.deepEqual(clone(await locked.advance()), { status: 'pending' }); assert.equal(locked.calls.judge.length, 0)
  const race = harness(gate, { judgments: [captionBad(), pixel()] })
  const raced = await Promise.all([race.advance(), race.advance()])
  assert.ok(raced.every(r => r.status === 'pending' && !Object.hasOwn(r, 'media')))
  assert.equal(race.calls.render.length, 1, 'CAS wins before the only paid repair')
  assert.equal(race.calls.scene.length, 0)

  const caps = harness(gate, { initial: state({ captionEvidence: mismatch }), judgments: [pixel(), pixel()] })
  assert.deepEqual(clone(await caps.advance()), { status: 'pending' }, 'no original URL before repair')
  assert.equal(caps.calls.scene.length, 0, 'caption disagreement never regenerates approved voice or scene')
  assert.equal(caps.calls.render.length, 1)
  assert.deepEqual(caps.calls.render[0].elements.filter(e => e.type === 'audio'), source.elements.filter(e => e.type === 'audio'))
  assert.deepEqual(caps.get().captionEvidence, mismatch, 'raw evidence is retained after repair')
  const delivered = await caps.advance(); assert.equal(delivered.status, 'failed'); assert.equal(delivered.reason, 'caption_evidence_unresolved_after_repair'); assert.equal(delivered.media.url, repaired.url)
  assert.equal(caps.calls.render.length, 1)

  const failed = harness(gate, { judgments: [captionBad(), captionBad()] })
  await failed.advance(); assert.equal((await failed.advance()).status, 'failed')
  await failed.advance(); assert.equal(failed.calls.render.length, 1, 'persistent defect has one retry total')
  const visual = harness(gate, { judgments: [sceneBad('subject_missing'), pixel()] })
  assert.equal((await visual.advance()).status, 'pending'); assert.equal(visual.calls.scene.length, 1)
  assert.equal(visual.calls.scene[0].index, 1)
  assert.equal(visual.calls.scene[0].input.image_url, 'same-face')
  assert.equal((await visual.advance()).status, 'pending')
  assert.equal(visual.calls.render.length, 1)
  const render = visual.calls.render[0]
  assert.deepEqual(render.elements.filter(e => e.type !== 'video'), source.elements.filter(e => e.type !== 'video'))
  assert.deepEqual(render.elements.filter(e => e.type === 'video').map(e => e.source), ['clip-0', 'new-culprit-clip', 'clip-2'])
  assert.equal((await visual.advance()).status, 'passed')
  assert.equal(visual.calls.scene.length, 1)
  const error = harness(gate, { judgments: [sceneBad('invented_text')], submitSceneError: true })
  assert.equal((await error.advance()).status, 'failed'); await error.advance(); assert.equal(error.calls.scene.length, 1)
  const renderError = harness(gate, { judgments: [captionBad()], submitRenderError: true })
  const rejectedRender = await renderError.advance()
  assert.equal(rejectedRender.status, 'failed'); assert.equal(rejectedRender.media.url, original.url)
  assert.deepEqual(clone(rejectedRender.source), source, 'failed repair returns the source of the actual original media')
  assert.deepEqual(renderError.get().pixel, captionBad(), 'terminal evidence retains the actual ceiling')
  const blind = harness(gate, { judgments: [null] }); assert.equal((await blind.advance()).status, 'failed'); assert.equal(blind.calls.render.length, 0)
  const blindMismatch = harness(gate, { initial: state({ captionEvidence: mismatch }), judgments: [null] })
  assert.equal((await blindMismatch.advance()).status, 'pending'); assert.equal(blindMismatch.calls.render.length, 1)
  assert.equal((await blindMismatch.advance()).status, 'failed', 'canonical captions cannot certify unavailable pixel evidence')
  for (const status of ['checking', 'scene_submitting', 'render_submitting']) {
    const stuck = harness(gate, { initial: state({ status, attempted: true }) })
    assert.equal((await stuck.advance()).status, 'pending'); stuck.now(400000)
    assert.equal((await stuck.advance()).status, 'failed'); assert.equal(stuck.calls.scene.length + stuck.calls.render.length, 0)
  }
  const slow = harness(gate, { initial: state({ status: 'render', attempted: true, repairRenderId: 'one-repair-render' }), renderResult: { status: 'rendering', url: null, snapshotUrl: null } })
  assert.equal((await slow.advance()).status, 'pending'); slow.now(2000000); assert.equal((await slow.advance()).status, 'failed')
}

await contract(load(raw))
const mutants = [
  ['visual repair cannot erase unresolved audio evidence', "if (state.captionEvidence?.status === 'mismatch' && state.captionsRepaired) return", 'if (false) return'],
  ['duration floor drops below 14', 'media.durationSeconds < 14', 'media.durationSeconds < 13'],
  ['incomplete pixel evidence passes', "pixel.evidence_status !== 'complete'", 'false'],
  ['caption repair erases approved audio', 'source.elements.filter(el => !isCaptionElement(el))', 'source.elements.filter(el => isCaptionElement(el))'],
  ['second repair is allowed', 'if (state.attempted || decision.kind', 'if (false || decision.kind'],
  ['wrong scene is repaired', 'sceneIndex: scene.index, reason: decision.reason', 'sceneIndex: 0, reason: decision.reason'],
  ['CAS failure spends anyway', "if (!await move({ status: 'checking', media, mediaSource: state.source })) return pending", "await move({ status: 'checking', media, mediaSource: state.source })"],
  ['cap is accepted before repair', "if (decision.kind === 'pass') return finish", "if (true) return finish"],
]
let rejected = 0
for (const [name, before, after] of mutants) {
  assert.equal(raw.split(before).length - 1, 1, 'mutant applies exactly once: ' + name)
  const changed = raw.replace(before, after); assert.notEqual(changed, raw)
  await assert.rejects(() => contract(load(changed)), undefined, 'mutant survived: ' + name); rejected++
}
console.log(JSON.stringify({ status: 'PASS', behavioralContracts: true, rejectedMutants: rejected, network: 0, paidRenders: 0, environmentFiles: 0 }))
