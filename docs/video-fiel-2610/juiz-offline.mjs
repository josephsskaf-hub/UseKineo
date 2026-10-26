// Offline behavioral tests of the real TS modules. No .env, network, database, rendering or credentials.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const rootArg = process.argv.find((x) => x.startsWith('--root='))
const root = path.resolve(rootArg ? rootArg.slice(7) : process.cwd())
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript')
const files = ['evidence', 'coherenceV2', 'pixelScore', 'ugcJudge', 'contexto', 'coletar', 'taskFulfillmentCanary']
const allowed = new Set([...files.map((x) => `lib/regua95/${x}.ts`), 'lib/aiModels.ts', 'lib/fastCoherence.ts', 'lib/promptGuard.ts', 'lib/modelRefusal.ts'])
function loadAll(mutations = {}) {
  const cache = new Map()
  function load(rel) {
    assert(allowed.has(rel), `unexpected import: ${rel}`)
    if (cache.has(rel)) return cache.get(rel).exports
    let source = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
    if (mutations[rel]) source = mutations[rel](source)
    const module = { exports: {} }; cache.set(rel, module)
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    vm.runInNewContext(compiled, {
      module, exports: module.exports,
      require(spec) { assert(spec.startsWith('@/'), `external import prohibited: ${spec}`); return load(spec.slice(2) + '.ts') },
      process: { env: new Proxy({}, { get() { throw new Error('environment access prohibited') } }) },
      fetch() { throw new Error('network prohibited') },
      AbortController, setTimeout: () => 0, clearTimeout() {}, URL, console,
    }, { filename: rel, timeout: 10000 })
    return module.exports
  }
  return Object.fromEntries(files.map((x) => [x, load(`lib/regua95/${x}.ts`)]))
}
const clone = (x) => JSON.parse(JSON.stringify(x))
const frames = (n) => Array.from({ length: n }, (_, i) => ({ url: `https://fixture.invalid/frame-${i}.jpg`, t: i, bytes: 50000, zone: i < 6 ? 'gancho' : 'fala' }))
const base = { via: 'local', model: 'offline-fixture', usdFrames: 0, usdVision: 0, ms: 0 }
const ugcCtx = { ...base, frames: frames(12), hasReference: true, hasPauses: false, speechSeconds: 12 }
const ugcBody = () => ({ frames: frames(12).map((_, i) => ({ i: i + 1, eyes: 'open', grin: false, hand: 'ok', dup: false, label: 'match', caption: 'ok', note: '' })) })
const pixCtx = { ...base, product: 'filme', frames: frames(8) }
const pixBody = () => ({ frames: frames(8).map((_, i) => ({ i: i + 1, subject: 'person holding a cup', score: 100, issues: [], note: '' })), identity_consistent: true, caption_present: false, summary: 'Sem defeito observado nos quadros.' })
const textBody = { idea_fidelity: 100, narration_vs_scenes: 80, problems: ['Cena 1 mostra outro objeto.'], worst_scene: 1, summary: 'Cena 1 não corresponde ao objeto pedido.' }
const textCtx = { ideaSource: 'pedido_direto', narration: 'A person picks up a cup.', model: 'offline-fixture', usd: 0, ms: 0 }
const input = { request: 'Create a story about three ancient cities.', requestBasis: 'original_request', narration: 'Create a story about three ancient cities.', confirmed: { seconds: 15, mode: 'idea', language: 'en' }, scenes: [{ scene: 1, spoken: 'Create a story about three ancient cities.', prompt: 'Three ancient cities in an establishing shot.' }], frames: [{ i: 1, t: 0, url: 'https://fixture.invalid/frame.jpg' }] }
const noTask = { task_fulfilled: 'no', findings: [{ kind: 'instruction_narrated', severity: 'task_failure', scene: 1, frame: null, time: null, requested: 'three ancient cities', observed: 'The narration repeats production instructions without naming any city.', defect: 'The requested story was not written.' }] }
const fakeResponse = (body) => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(body) } }], usage: { prompt_tokens: 0, completion_tokens: 0 } }) })

async function suite(L) {
  const done = []
  const test = async (name, f) => { await f(); done.push(name) }
  const U = L.ugcJudge, P = L.pixelScore, C = L.coherenceV2, X = L.contexto, T = L.taskFulfillmentCanary
  await test('UGC empty/null/missing frames are incomplete, never 100', () => {
    for (const body of [{}, null, { frames: [] }, { frames: ugcBody().frames.slice(0, 11) }]) {
      const r = U.normalizeUgc(body, ugcCtx); assert.equal(r.score, null); assert.equal(r.evidence_status, 'incomplete')
    }
  })
  await test('UGC duplicate indexes, repeated images and unobservable defaults are incomplete', () => {
    const body = ugcBody(); body.frames[1].i = 1
    assert.equal(U.normalizeUgc(body, ugcCtx).score, null)
    assert.equal(U.normalizeUgc(ugcBody(), { ...ugcCtx, frames: frames(12).map((f) => ({ ...f, url: 'https://fixture.invalid/repeated.jpg' })) }).score, null)
    assert.equal(U.normalizeUgc({ frames: frames(12).map((_, i) => ({ i: i + 1 })) }, ugcCtx).score, null)
  })
  await test('UGC complete normal response and explained hard defects retain their meaning', () => {
    assert.equal(U.normalizeUgc(ugcBody(), ugcCtx).score, 100)
    const body = ugcBody(); body.frames[0].dup = true; body.frames[0].note = 'Corpo duplicado.'
    const bad = U.normalizeUgc(body, ugcCtx); assert.equal(bad.score, 60); assert(bad.motivos.some((x) => x.includes('0 s')))
    const short = ugcBody(); short.frames = short.frames.slice(0, 6)
    assert.equal(U.normalizeUgc(short, { ...ugcCtx, frames: frames(6), expectedFrames: 6 }).score, 100)
  })
  await test('Pixel empty or partial/fallback evidence cannot acquire a full-film score', () => {
    assert.equal(P.normalizePixel({}, pixCtx).score, null)
    const body = pixBody(); body.frames = body.frames.slice(0, 3)
    assert.equal(P.normalizePixel(body, { ...pixCtx, frames: frames(3), via: 'extract_frame' }).score, null)
    const malformed = pixBody(); malformed.frames[0].score = '100'
    assert.equal(P.normalizePixel(malformed, pixCtx).score, null)
  })
  await test('Pixel one reading incomplete; identical valid reads explicitly marked, not rejected', () => {
    const r = P.normalizePixel(pixBody(), pixCtx)
    assert.equal(P.combinePixelReadings([r], base).score, null)
    const two = P.combinePixelReadings([r, clone(r)], base)
    assert.equal(two.score, 100); assert.equal(two.coverage.readings_identical, true); assert.equal(two.coverage.independent_readings, false); assert.equal(two.coverage.audio_evaluated, false)
  })
  await test('Pixel hard cap survives averaging and two labels on one frame do not count as two frames', () => {
    const body = pixBody(); body.identity_consistent = false; body.identity_changes = [{ from: 1, to: 2, what: 'Pessoa troca por criança.' }]
    const hard = P.normalizePixel(body, pixCtx), clean = P.normalizePixel(pixBody(), pixCtx)
    assert.equal(P.combinePixelReadings([hard, clean], base).score, 70)
    const oneFrame = pixBody(); oneFrame.frames[0].issues = ['off_topic', 'subject_missing']; oneFrame.frames[0].note = 'Sujeito ausente.'
    assert(!P.normalizePixel(oneFrame, pixCtx).caps.some((c) => c.includes('2 quadros')))
    const noLocation = pixBody(); noLocation.identity_consistent = false
    assert.equal(P.normalizePixel(noLocation, pixCtx).score, null)
  })
  await test('Pixel defect caps remain effective with complete evidence and UGC caption exception is preserved', () => {
    const cases = [['deformed_face_or_hand', 2, 75], ['subject_missing', 2, 80], ['invented_text', 1, 85], ['caption_broken', 2, 88]]
    for (const [issue, n, expected] of cases) {
      const body = pixBody(); body.frames.slice(0, n).forEach((f) => { f.issues = [issue]; f.note = `Defeito concreto ${issue} neste quadro.` })
      assert.equal(P.normalizePixel(body, pixCtx).score, expected)
      if (issue === 'caption_broken') assert.equal(P.normalizePixel(body, { ...pixCtx, product: 'ugc' }).score, 100)
    }
    const product = pixBody(); product.product_faithful = false; product.frames[0].issues = ['product_unfaithful']; product.frames[0].note = 'A embalagem difere da referência.'
    assert.equal(P.normalizePixel(product, { ...pixCtx, product: 'ads' }).score, 70)
    const caption = pixBody(); caption.caption_present = true; caption.caption_legible = false; caption.frames[0].issues = ['caption_illegible']; caption.frames[0].note = 'Legenda sobreposta ilegível.'
    assert.equal(P.normalizePixel(caption, pixCtx).score, 85)
    const blackFrames = frames(8); blackFrames[0].bytes = 3000
    assert.equal(P.normalizePixel(pixBody(), { ...pixCtx, frames: blackFrames }).score, 60)
  })
  await test('Text empty response, absent scenes, one reading and unlocated defect are incomplete', () => {
    assert.equal(C.normalizeReadingV2({}, true).score, null)
    assert.equal(C.normalizeReadingV2({ ...textBody, narration_vs_scenes: null }, false).score, null)
    const r = C.normalizeReadingV2(textBody, true, [1]); assert.equal(C.combineReadingsV2([r], textCtx).score, null)
    assert.equal(C.normalizeReadingV2({ ...textBody, worst_scene: 99 }, true, [1]).score, null)
  })
  await test('Legitimate supplied script stays assessable without pretending the earlier idea is known', () => {
    const r = C.normalizeReadingV2(textBody, true, [1])
    const supplied = C.combineReadingsV2([r, clone(r)], { ...textCtx, ideaSource: 'roteiro' })
    assert.equal(supplied.score, 80); assert.equal(supplied.idea_fidelity, null); assert.equal(supplied.fidelity_basis, 'supplied_script')
    const window = C.combineReadingsV2([r, clone(r)], { ...textCtx, ideaSource: 'script_written_janela' })
    assert.equal(window.score, 80); assert.equal(window.idea_fidelity, null); assert.equal(window.fidelity_basis, 'unverified_window')
    assert.equal(C.combineReadingsV2([r, clone(r)], textCtx).score, 90)
  })
  await test('Existing narration-cut and deterministic refusal checks remain effective', async () => {
    const reading = C.normalizeReadingV2({ idea_fidelity: 100, narration_vs_scenes: 100, problems: [], worst_scene: null, summary: 'Texto e cenas coerentes.' }, true, [1])
    const cut = C.combineReadingsV2([reading, clone(reading)], { ...textCtx, narration: Array(120).fill('word').join(' '), filmSeconds: 15 })
    assert.equal(cut.score, 40); assert.equal(cut.narration_cut, true)
    let calls = 0
    const refusal = await C.scoreCoherenceV2({ idea: 'A story about a cup.', ideaSource: 'pedido_direto', narration: "I'm sorry, but I can't assist with that request.", scenes: [] }, { apiKey: 'fixture', fetchImpl: async () => { calls++; return fakeResponse({}) } })
    assert.equal(refusal.score, 0); assert.equal(calls, 0)
  })
  await test('Applicability is explicit; missing required judge does not become passing grade', () => {
    assert.equal(X.combinarNotaPorProduto('filme', { coerencia: 99 }), null)
    assert.equal(X.combinarNotaPorProduto('filme', { pixel: 99 }), null)
    assert.equal(X.combinarNotaPorProduto('ugc', { pixel: 99 }), null)
    assert.equal(X.combinarNotaPorProduto('ugc', { pixel: 98, ugc: 92 }), 92)
    assert.equal(X.combinarNotaPorProduto('ads', { pixel: 99 }), 99)
    assert.equal(X.combinarNotaPorProduto('clipe', { pixel: 99 }), 99)
    assert.equal(X.combinarNotaPorProduto('filme', { pixel: 101, coerencia: 99 }), null)
  })
  await test('Real judge wrappers with mocked HTTP preserve incomplete outcome and exact call count', async () => {
    let calls = 0
    const fetchImpl = async () => { calls++; return fakeResponse({}) }
    const u = await U.judgeUgcFrames({ asked: 'a cup', speechSeconds: 12 }, ugcCtx.frames, { apiKey: 'fixture', model: 'offline-fixture', fetchImpl })
    assert.equal(u.score, null); assert.equal(calls, 1)
    const p = await P.judgeFrames({ product: 'filme', asked: 'a cup' }, pixCtx.frames, { apiKey: 'fixture', model: 'offline-fixture', fetchImpl })
    assert.equal(p.score, null); assert.equal(calls, 3)
    const c = await C.scoreCoherenceV2({ idea: 'A person picks up a cup.', ideaSource: 'pedido_direto', narration: 'A person picks up a cup.', scenes: [{ scene: 1, spoken: 'A person picks up a cup.', prompt: 'A person with a cup.' }] }, { apiKey: 'fixture', fetchImpl })
    assert.equal(c.score, null); assert.equal(calls, 5)
  })
  await test('Historical and new incomplete attempts do not create new paid retries', async () => {
    const events = [
      { session_id: 'synthetic-old', metadata: { version: C.COHERENCE_V2_VERSION, score: 95 }, created_at: '2026-10-19T00:00:00Z' },
      { session_id: 'synthetic-incomplete', metadata: { version: U.UGC_SCORE_VERSION, score: null, evidence_validation: '2026-10-26' }, created_at: '2026-10-19T00:00:00Z' },
    ]
    const admin = { from() { throw new Error('No database allowed') } }
    const doneSet = await L.coletar.notasExistentes(admin, ['synthetic-old', 'synthetic-incomplete'], async () => ({ data: events }), 'offline', Date.parse('2026-10-26T00:00:00Z'))
    assert(doneSet.has('coherence_v2:synthetic-old')); assert(doneSet.has('ugc_score:synthetic-incomplete'))
    assert.equal(C.COHERENCE_V2_VERSION, 'regua95_coerencia_v2'); assert.equal(P.PIXEL_SCORE_VERSION, 'regua95_pixel_v1'); assert.equal(U.UGC_SCORE_VERSION, 'regua95_ugc_v1')
  })
  await test('Canary task failure needs a grounded defect; missing/contradictory evidence yields unknown', () => {
    assert.equal(T.normalizeTaskFulfillment(noTask, input).numerical_score, 0)
    assert.equal(T.normalizeTaskFulfillment(noTask, input).calibration_status, 'not_calibrated')
    for (const bad of [{}, { task_fulfilled: 'no', findings: [] }, { ...noTask, task_fulfilled: 'yes' }, { ...noTask, findings: [{ ...noTask.findings[0], requested: 'not in the request' }] }]) assert.equal(T.normalizeTaskFulfillment(bad, input).numerical_score, null)
    assert.equal(T.normalizeTaskFulfillment(noTask, { ...input, requestBasis: 'unverified_window' }).numerical_score, null)
    assert.equal(T.normalizeTaskFulfillment(noTask, { ...input, confirmed: null }).numerical_score, null)
  })
  await test('Canary visual defect is tied to a provided frame/time; legitimate script does not auto-fail', () => {
    const finding = { ...noTask.findings[0], kind: 'wrong_prop', severity: 'scene_defect', frame: 1, time: 0, observed: 'The requested cup is shown as a bottle.' }
    assert.equal(T.normalizeTaskFulfillment({ task_fulfilled: 'no', findings: [finding] }, input).numerical_score, 60)
    assert.equal(T.normalizeTaskFulfillment({ task_fulfilled: 'no', findings: [{ ...finding, time: 99 }] }, input).numerical_score, null)
    assert.equal(T.normalizeTaskFulfillment({ task_fulfilled: 'yes', findings: [] }, { ...input, requestBasis: 'supplied_script' }).numerical_score, 100)
    const prompt = T.buildTaskFulfillmentMessages(input)
    assert(prompt[0].content.includes('do not demand 60 seconds, five scenes'))
    assert.equal(JSON.parse(prompt[1].content[0].text).confirmed.seconds, 15)
  })
  await test('Canary flag false prevents model calls, claims and writes before all other work', async () => {
    let calls = 0
    const fetchImpl = async () => { calls++; return fakeResponse(noTask) }
    assert.equal(await T.scoreTaskFulfillmentCanary(input, { apiKey: 'fixture', fetchImpl }), null)
    const output = await T.runTaskFulfillmentCanaryBatch([{ key: 'synthetic', input }], { apiKey: 'fixture', fetchImpl, claimCase: async () => { calls++; return true }, save: async () => { calls++ } })
    assert.equal(output.length, 0); assert.equal(calls, 0)
  })
  return done
}
const checks = await suite(loadAll())
const mutants = [
  ['empty UGC becomes100', 'ugcJudge', "score: evidence.evidence_status === 'complete' ? score : null,", 'score,'],
  ['single pixel reading accepted', 'pixelScore', 'const expectedReadings = ctx.expectedReadings ?? PIXEL_READINGS', 'const expectedReadings = 1'],
  ['hard cap diluted', 'pixelScore', 'Math.min(capLimit, Math.round(validas.reduce((a, r) => a + r.score, 0) / validas.length))', 'Math.round(validas.reduce((a, r) => a + r.score, 0) / validas.length)'],
  ['missing judge passes', 'contexto', 'required.every(isScore)', 'required.some(isScore)'],
  ['self-script claims original request', 'coherenceV2', "const originalKnown = ctx.ideaSource === 'pedido_direto' || ctx.ideaSource === 'script_written'", 'const originalKnown = true'],
  ['new incomplete creates paid retry', 'coletar', "if (e.metadata?.evidence_validation === '2026-10-26') { done.add(marca); continue }", ''],
  ['canary accidentally enabled', 'taskFulfillmentCanary', 'export const TASK_FULFILLMENT_CANARY_ENABLED = false', 'export const TASK_FULFILLMENT_CANARY_ENABLED = true'],
]
const killed = []
for (const [name, file, before, after] of mutants) {
  let applied = false, failed = false
  try { await suite(loadAll({ [`lib/regua95/${file}.ts`]: (s) => { assert(s.includes(before), name); applied = true; return s.replace(before, after) } })) } catch { failed = true }
  assert(applied && failed, `mutant survived: ${name}`); killed.push(name)
}
// Exercise the disabled manual adapter with ONLY a locally transformed flag and mocked HTTP/storage.
const canaryTest = loadAll({ 'lib/regua95/taskFulfillmentCanary.ts': (s) => s.replace('export const TASK_FULFILLMENT_CANARY_ENABLED = false', 'export const TASK_FULFILLMENT_CANARY_ENABLED = true') }).taskFulfillmentCanary
let calls = 0
const claimed = new Set(), saved = []
const cases = Array.from({ length: 6 }, (_, i) => ({ key: `synthetic-${i}`, input }))
const deps = { apiKey: 'fixture', fetchImpl: async () => { calls++; return fakeResponse(noTask) }, claimCase: async (key, version) => { const k = `${key}:${version}`; if (claimed.has(k)) return false; claimed.add(k); return true }, save: async (key, result) => saved.push({ key, result }) }
await canaryTest.runTaskFulfillmentCanaryBatch(cases, deps)
await canaryTest.runTaskFulfillmentCanaryBatch(cases, deps)
assert.equal(calls, 3); assert.equal(saved.length, 3)
const report = { mode: 'offline_synthetic_only', actual_network_calls: 0, production_occurrences_proved: false, checks, bounded_canary: { cases: 3, calls: 3, duplicate_run_additional_calls: 0 }, mutants_killed: killed }
const out = process.argv.find((x) => x.startsWith('--out='))
if (out) { fs.mkdirSync(path.dirname(path.resolve(out.slice(6))), { recursive: true }); fs.writeFileSync(path.resolve(out.slice(6)), JSON.stringify(report, null, 2) + '\n') }
console.log(JSON.stringify(report, null, 2))
