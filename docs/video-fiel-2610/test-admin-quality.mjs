// Offline tests of real readers and rendered UI. No source projection, credentials, model, database or generation.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(path.join(ROOT, 'package.json'))
const ts = require('typescript'), React = require('react'), jsx = require('react/jsx-runtime')
const { renderToStaticMarkup } = require('react-dom/server')
const cache = new Map()
function load(spec, parent = '') {
  if (spec === 'react') return React
  if (spec === 'react/jsx-runtime') return jsx
  let rel = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? path.posix.join(path.posix.dirname(parent), spec) : spec
  assert.match(rel, /^(lib|components)\//)
  if (!/\.(tsx?|json)$/.test(rel)) rel += ['.ts', '.tsx'].find(ext => fs.existsSync(path.join(ROOT, rel + ext))) ?? '.ts'
  if (cache.has(rel)) return cache.get(rel)
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  const exports = {}; cache.set(rel, exports)
  const code = ts.transpileModule(source, { fileName: rel, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports, require: s => load(s, rel), process: { env: {} }, console, URL, setTimeout() { throw Error('No async evaluation in reader test') }, fetch() { throw Error('No network in reader test') } }, { filename: rel, timeout: 5000 })
  return exports
}
let checks = 0
function check(name, test) { test(); checks++; console.log(`PASS ${name}`) }
const { EVIDENCE_VALIDATION } = load('lib/regua95/evidence.ts')
const { readJudgeEvidence, combineQualityEvidence, readSavedTaskResult, assessmentMatchesDelivery } = load('lib/admin/qualityEvidence.ts')
const { juntarNotasRegua, placarRegua } = load('lib/admin/regua95Painel.ts')
const QualityAssessment = load('components/admin/QualityAssessment.tsx').default
const { TASK_FULFILLMENT_VERSION, normalizeTaskFulfillment } = load('lib/regua95/taskFulfillmentCanary.ts')
const { COHERENCE_V2_EVENT, COHERENCE_V2_VERSION } = load('lib/regua95/coherenceV2.ts')
const { PIXEL_SCORE_EVENT, PIXEL_SCORE_VERSION } = load('lib/regua95/pixelScore.ts')
const { UGC_SCORE_EVENT, UGC_SCORE_VERSION } = load('lib/regua95/ugcJudge.ts')
const coverage = (frames = null) => ({ expected_frames: frames, judged_frames: frames, unique_frames: frames, expected_readings: 2, valid_readings: 2, readings_identical: false, independent_readings: false, audio_evaluated: false })
const metadata = (score, frames = null, extra = {}) => ({ score, evidence_validation: EVIDENCE_VALIDATION, evidence_status: 'complete', evidence_reasons: [], coverage: coverage(frames), ...extra })
const text = readJudgeEvidence(metadata(97), 'coerencia'), pixel = readJudgeEvidence(metadata(92, 8), 'pixel'), ugc = readJudgeEvidence(metadata(99, 12, { coverage: { ...coverage(12), expected_readings: 1, valid_readings: 1 } }), 'ugc')

check('Historical100 is preserved but never validated', () => {
  const old = readJudgeEvidence({ score: 100 }); assert.equal(old.state, 'historical'); assert.equal(old.score, 100)
  assert.equal(combineQualityEvidence('filme', { coerencia: old, pixel }).score, null)
})
check('Film requires BOTH complete judges', () => {
  assert.equal(combineQualityEvidence('filme', { coerencia: text }).score, null)
  assert.equal(combineQualityEvidence('filme', { coerencia: text, pixel }).score, 92)
})
check('Ads and clips do not invent a missing textual judge', () => {
  assert.equal(combineQualityEvidence('ads', { pixel }).score, 92)
  assert.equal(combineQualityEvidence('clipe', { pixel }).score, 92)
})
check('UGC needs visual AND presenter inspection', () => {
  assert.equal(combineQualityEvidence('ugc', { ugc }).score, null)
  assert.equal(combineQualityEvidence('ugc', { pixel, ugc }).score, 92)
})
check('Claiming complete does not hide missing reading', () => {
  assert.equal(readJudgeEvidence(metadata(99, 8, { coverage: { ...coverage(8), valid_readings: 1 } })).state, 'incomplete')
})
check('Duplicated or insufficient frames prevent a final grade', () => {
  for (const fields of [{ unique_frames: 7 }, { judged_frames: 7 }]) assert.equal(readJudgeEvidence(metadata(99, 8, { coverage: { ...coverage(8), ...fields } })).state, 'incomplete')
})
check('Missing coverage and invalid numbers stay incomplete', () => {
  for (const item of [metadata(99, 8, { coverage: {} }), metadata(NaN), metadata(101), metadata(-1), metadata(null)]) assert.equal(readJudgeEvidence(item).state, 'incomplete')
})
check('Explicit evidence reasons cannot become complete', () => {
  assert.equal(readJudgeEvidence(metadata(100, 8, { evidence_reasons: ['frame_response_incomplete'] })).state, 'incomplete')
})
check('Unknown product cannot get a final grade', () => assert.equal(combineQualityEvidence('unknown', { pixel }).score, null))
function assertRequiredFrames(api) {
  assert.equal(api.readJudgeEvidence(metadata(98), 'coerencia').state, 'complete')
  for (const judge of ['pixel', 'ugc']) {
    const unobserved = api.readJudgeEvidence(metadata(98), judge)
    assert.equal(unobserved.state, 'incomplete'); assert.ok(unobserved.reasons.includes('frames_below_plan'))
    assert.equal(api.readJudgeEvidence(metadata(98, 8), judge).state, 'complete')
  }
}
check('Pixel/UGC require known frame coverage while textual reading accepts null frames', () => assertRequiredFrames({ readJudgeEvidence }))

function event(name, version, extra, at = '2026-10-26T01:00:00.000Z') {
  return { name, created_at: at, session_id: '22222222-2222-4222-8222-222222222222', user_id: '77777777-7777-4777-8777-777777777777', metadata: { version, product: 'filme', engine: 'cinematic_ai', video_id: '22222222-2222-4222-8222-222222222222', generation_id: '11111111-1111-4111-8111-111111111111', delivered_at: '2026-10-26T00:00:00.000Z', ...extra } }
}
const textualEvent = event(COHERENCE_V2_EVENT, COHERENCE_V2_VERSION, metadata(97))
const pixelEvent = event(PIXEL_SCORE_EVENT, PIXEL_SCORE_VERSION, metadata(92, 8))
check('Real persisted-event join uses validated evidence', () => {
  const rows = juntarNotasRegua([textualEvent, pixelEvent], '2026-10-25T00:00:00.000Z')
  assert.equal(rows.length, 1); assert.equal(rows[0].nota, 92); assert.equal(rows[0].quality.state, 'complete')
})
function assertJoinCoverage(api) {
  const noFrames = { ...pixelEvent, metadata: { ...pixelEvent.metadata, coverage: coverage(null) } }
  const film = api.juntarNotasRegua([textualEvent, noFrames], '2026-10-25T00:00:00.000Z')[0]
  assert.equal(film.nota, null); assert.equal(film.judges.coerencia.state, 'complete'); assert.equal(film.judges.pixel.state, 'incomplete')
  const ugcEvent = event(UGC_SCORE_EVENT, UGC_SCORE_VERSION, { ...metadata(99), product: 'ugc' })
  const adPixel = { ...pixelEvent, metadata: { ...pixelEvent.metadata, product: 'ugc' } }
  const presenter = api.juntarNotasRegua([ugcEvent, adPixel], '2026-10-25T00:00:00.000Z')[0]
  assert.equal(presenter.nota, null); assert.equal(presenter.judges.ugc.state, 'incomplete')
}
check('Real join passes judge applicability; visual null frames cannot borrow the textual exemption', () => assertJoinCoverage({ juntarNotasRegua }))
check('Latest failed reading cannot resurrect an old good score', () => {
  const failed = event(PIXEL_SCORE_EVENT, PIXEL_SCORE_VERSION, { score: null, evidence_validation: EVIDENCE_VALIDATION, evidence_status: 'incomplete', evidence_reasons: ['frames_missing'], coverage: coverage(8) }, '2026-10-26T02:00:00.000Z')
  const rows = juntarNotasRegua([pixelEvent, textualEvent, failed], '2026-10-25T00:00:00.000Z')
  assert.equal(rows[0].nota, null); assert.equal(rows[0].pixel, null); assert.equal(rows[0].quality.state, 'incomplete')
})
check('Historical scores never enter95 percent denominator as validated', () => {
  const old = juntarNotasRegua([event(COHERENCE_V2_EVENT, COHERENCE_V2_VERSION, { score: 100 }), event(PIXEL_SCORE_EVENT, PIXEL_SCORE_VERSION, { score: 100 })], '2026-10-25T00:00:00.000Z')
  const group = placarRegua(old, n => n.product)[0]
  assert.equal(old[0].nota_historica, 100); assert.equal(old[0].nota, null)
  assert.equal(group.entregas, 1); assert.equal(group.historicas, 1); assert.equal(group.nota.n, 0); assert.equal(group.nota.pct95, null)
})
check('Different generations cannot lend a grade, source event ID or canary target', () => {
  const textEvent = { ...textualEvent, id: '33333333-3333-4333-8333-333333333333', metadata: { ...textualEvent.metadata, problems: ['Wrong generation problem must not attach.'] } }
  const pixEvent = { ...pixelEvent, id: '44444444-4444-4444-8444-444444444444', created_at: '2026-10-26T02:00:00.000Z', metadata: { ...pixelEvent.metadata, generation_id: '55555555-5555-4555-8555-555555555555' } }
  const row = juntarNotasRegua([textEvent, pixEvent], '2026-10-25T00:00:00Z')[0]
  assert.equal(row.nota, null); assert.equal(row.quality.state, 'incomplete'); assert.equal(row.canary_target, null)
  assert.equal(row.coerencia, null); assert.equal(row.judge_event_ids.coerencia, undefined); assert.equal(row.coerencia_problems.length, 0)
  assert.equal(row.generation_id, pixEvent.metadata.generation_id); assert.equal(row.pixel, 92)
  assert.equal(placarRegua([row], n => n.product)[0].nota.n, 0)
})
check('Different owners cannot lend grades even when session and generation match', () => {
  const pixEvent = { ...pixelEvent, user_id: '88888888-8888-4888-8888-888888888888', created_at: '2026-10-26T02:00:00.000Z' }
  const row = juntarNotasRegua([textualEvent, pixEvent], '2026-10-25T00:00:00Z')[0]
  assert.equal(row.nota, null); assert.equal(row.quality.state, 'incomplete'); assert.equal(row.canary_target, null)
  assert.equal(row.coerencia, null); assert.equal(row.user_id, pixEvent.user_id)
})
check('Session and video identity must match before a current validated grade', () => {
  const other = '99999999-9999-4999-8999-999999999999'
  const rows = juntarNotasRegua([textualEvent, pixelEvent].map(e => ({ ...e, metadata: { ...e.metadata, video_id: other } })), '2026-10-25T00:00:00Z')
  assert.equal(rows[0].nota, null); assert.equal(rows[0].quality.state, 'incomplete'); assert.equal(rows[0].canary_target, null)
})
check('Unknown generation stays null; historical raw scores are preserved without a fabricated link', () => {
  const old = [event(COHERENCE_V2_EVENT, COHERENCE_V2_VERSION, { score: 100 }), event(PIXEL_SCORE_EVENT, PIXEL_SCORE_VERSION, { score: 100 })].map(e => { const { generation_id, ...metadata } = e.metadata; return { ...e, metadata } })
  const row = juntarNotasRegua(old, '2026-10-25T00:00:00Z')[0]
  assert.equal(row.generation_id, null); assert.equal(row.nota_historica, 100); assert.equal(row.nota, null)
  assert.equal(row.quality.state, 'historical'); assert.equal(row.canary_target, null)
  const current = [textualEvent, pixelEvent].map(e => { const { generation_id, ...metadata } = e.metadata; return { ...e, metadata } })
  const unlinked = juntarNotasRegua(current, '2026-10-25T00:00:00Z')[0]
  assert.equal(unlinked.generation_id, null); assert.equal(unlinked.quality.state, 'incomplete'); assert.equal(unlinked.nota, null)
})
check('Unknown owner cannot become a validated current delivery', () => {
  const row = juntarNotasRegua([textualEvent, pixelEvent].map(e => ({ ...e, user_id: null })), '2026-10-25T00:00:00Z')[0]
  assert.equal(row.nota, null); assert.equal(row.quality.state, 'incomplete'); assert.equal(row.canary_target, null)
})
check('UI shows limitation, original-script provenance and no invented audio review', () => {
  const historical = readJudgeEvidence({ score: 98, idea_source: 'roteiro' })
  const html = renderToStaticMarkup(React.createElement(QualityAssessment, { quality: combineQualityEvidence('filme', { coerencia: historical, pixel }), judges: { coerencia: historical, pixel }, findings: ['A ação pedida não está comprovada nos quadros.'] }))
  assert.match(html, /Nota histórica/); assert.match(html, /Sem nota final validada/); assert.match(html, /Referência: roteiro fornecido/); assert.match(html, /Áudio, ritmo e movimento contínuo não avaliados/); assert.match(html, /A ação pedida/)
  assert.doesNotMatch(html, /onclick|<script|<form|<iframe/)
})
const currentCanary = { version: TASK_FULFILLMENT_VERSION, task_fulfilled: 'no', original_request_verified: true, findings: [{ kind: 'instruction_narrated', severity: 'task_failure', scene: 1, frame: null, time: null, requested: 'Crie um filme sobre três ruínas.', observed: 'A legenda reproduz a instrução.', defect: 'Nenhuma ruína é apresentada.' }], incomplete_reasons: [], audio_evaluated: false, numerical_score: 0, calibration_status: 'not_calibrated', score_basis: 'task_failure' }
function assertCanonicalSavedVerdict(api) {
  const cosmetic = { ...currentCanary, task_fulfilled: 'yes', numerical_score: 90, score_basis: 'cosmetic', findings: [{ ...currentCanary.findings[0], severity: 'cosmetic' }] }
  assert.ok(api.readSavedTaskResult(currentCanary)); assert.ok(api.readSavedTaskResult(cosmetic))
  assert.equal(api.readSavedTaskResult({ ...cosmetic, task_fulfilled: 'no' }), null)
  assert.equal(api.readSavedTaskResult({ ...cosmetic, incomplete_reasons: ['model_unavailable'] }), null)
  assert.equal(api.readSavedTaskResult({ ...currentCanary, numerical_score: 60 }), null)
  assert.equal(api.readSavedTaskResult({ ...currentCanary, score_basis: 'cosmetic' }), null)
  assert.equal(api.readSavedTaskResult({ ...currentCanary, task_fulfilled: 'unknown' }), null)
  assert.equal(api.readSavedTaskResult({ ...currentCanary, numerical_score: 60, score_basis: 'scene_defect', findings: [{ ...currentCanary.findings[0], kind: 'wrong_prop', severity: 'scene_defect' }] }), null)
  assert.ok(api.readSavedTaskResult({ ...currentCanary, task_fulfilled: 'unknown', numerical_score: null, incomplete_reasons: ['request_provenance_unverified'] }))
}
check('Saved canary reader rejects contradictions that the canonical normalizer makes unknown', () => assertCanonicalSavedVerdict({ readSavedTaskResult }))
check('Canonical yes/no/unknown outputs remain readable; parser does not invent a different rubric', () => {
  const input = { request: 'A red fox blocks a blue fox punch.', requestBasis: 'original_request', narration: 'The red fox blocks.', confirmed: { seconds: 15, mode: 'idea' }, scenes: [{ scene: 1, spoken: 'The red fox blocks.', prompt: 'The red fox blocks the blue fox punch.' }], frames: [{ i: 1, t: 0, url: 'https://fixture.invalid/frame.jpg' }] }
  for (const parsed of [{ task_fulfilled: 'yes', findings: [] }, { task_fulfilled: 'unknown', findings: [] }, { task_fulfilled: 'no', findings: [{ kind: 'wrong_prop', severity: 'scene_defect', scene: 1, frame: 1, time: 0, requested: 'red fox', observed: 'The sampled frame shows a tank.', defect: 'The fox was replaced.' }] }]) assert.ok(readSavedTaskResult(normalizeTaskFulfillment(parsed, input)))
})
check('Saved canary stays experimental and binds to the same generation', () => {
  const generation = '11111111-1111-4111-8111-111111111111', video = '22222222-2222-4222-8222-222222222222'
  const textEvent = { ...textualEvent, id: '33333333-3333-4333-8333-333333333333', session_id: video, metadata: { ...textualEvent.metadata, video_id: video, generation_id: generation } }
  const pixEvent = { ...pixelEvent, id: '44444444-4444-4444-8444-444444444444', session_id: video, metadata: { ...pixelEvent.metadata, video_id: video, generation_id: generation } }
  const saved = { name: 'task_fulfillment_canary', created_at: '2026-10-26T03:00:00Z', session_id: video, user_id: textEvent.user_id, metadata: { version: TASK_FULFILLMENT_VERSION, video_id: video, generation_id: generation, result: currentCanary } }
  const joined = juntarNotasRegua([saved, textEvent, pixEvent], '2026-10-25T00:00:00Z')[0]
  assert.equal(joined.canary_result.numerical_score, 0); assert.equal(joined.nota, 92)
  assert.equal(joined.canary_target.coherenceEventId, textEvent.id)
  const unrelated = { ...saved, metadata: { ...saved.metadata, generation_id: '55555555-5555-4555-8555-555555555555' } }
  assert.equal(juntarNotasRegua([unrelated, textEvent, pixEvent], '2026-10-25T00:00:00Z')[0].canary_result, null)
  const wrongOwner = { ...saved, user_id: '88888888-8888-4888-8888-888888888888' }
  assert.equal(juntarNotasRegua([wrongOwner, textEvent, pixEvent], '2026-10-25T00:00:00Z')[0].canary_result, null)
  const wrongSession = { ...saved, session_id: '66666666-6666-4666-8666-666666666666' }
  assert.equal(juntarNotasRegua([wrongSession, textEvent, pixEvent], '2026-10-25T00:00:00Z')[0].canary_result, null)
})

const pageFile = 'app/admin/coerencia/page.tsx'
const pageSource = fs.readFileSync(path.join(ROOT, pageFile), 'utf8')
const qualityFile = 'lib/admin/qualityEvidence.ts'
const qualitySource = fs.readFileSync(path.join(ROOT, qualityFile), 'utf8')
function variant(file, source) {
  const exports = {}
  const code = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports, require: name => load(name, file), process: { env: {} }, console, URL, fetch() { throw Error('No network in variant test') } }, { filename: file, timeout: 5000 })
  return exports
}
function renderLine(source, r, assessment) {
  const ast = ts.createSourceFile(pageFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'Linha')
  assert.ok(node, 'Actual page row exists')
  const exports = {}, canaryProps = []
  const CanarySpy = props => { canaryProps.push(props); return null }
  const code = ts.transpileModule(node.getText(ast) + '\nexports.Linha = Linha;', { fileName: pageFile, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, {
    exports, require: name => { assert.equal(name, 'react/jsx-runtime'); return jsx },
    assessmentMatchesDelivery, combineQualityEvidence, QualityAssessment,
    TaskCanaryControl: CanarySpy, TASK_FULFILLMENT_CANARY_ENABLED: false,
    PedirFeedback: () => null, JuizDaFoto: () => null, motor: s => s, corDaNota: () => '#CBD5E1', corDoJuiz: () => '#CBD5E1', fmt: s => s, primeiraLinha: s => s,
  }, { filename: pageFile, timeout: 5000 })
  const tree = exports.Linha({ r, assessment })
  return { html: renderToStaticMarkup(tree), canaryProps, canaryKey: elements(tree).find(e => e.type === CanarySpy)?.key }
}
function assertPageContext(source) {
  const assessment = juntarNotasRegua([textualEvent, pixelEvent], '2026-10-25T00:00:00Z')[0]
  assessment.canary_result = currentCanary
  assessment.canary_target = { videoId: assessment.video_id, generationId: assessment.generation_id, coherenceEventId: '33333333-3333-4333-8333-333333333333', pixelEventId: '44444444-4444-4444-8444-444444444444' }
  const row = { video_id: assessment.video_id, generation_id: assessment.generation_id, user_id: assessment.user_id, engine: 'cinematic_ai', topic: 'Synthetic request.', created_at: '2026-10-26', seconds: 15, claim_seconds: 15, credits: 9, url: null, narration: null, coherence: null, scenes: null }
  const own = renderLine(source, row, assessment)
  assert.match(own.html, /92\/100/); assert.equal(own.canaryProps[0].savedResult, assessment.canary_result)
  assert.ok(typeof own.canaryKey === 'string' && [row.video_id, row.generation_id, row.user_id].every(value => own.canaryKey.includes(value)))
  for (const change of [{ generation_id: '55555555-5555-4555-8555-555555555555' }, { user_id: '88888888-8888-4888-8888-888888888888' }, { video_id: '99999999-9999-4999-8999-999999999999' }, { generation_id: null }]) {
    const mismatched = renderLine(source, { ...row, ...change }, assessment)
    assert.doesNotMatch(mismatched.html, /92\/100/)
    assert.equal(mismatched.canaryProps[0].target, null); assert.equal(mismatched.canaryProps[0].savedResult, null)
    assert.notEqual(mismatched.canaryKey, own.canaryKey, 'Changed row context remounts the client state; no old-generation result survives')
  }
}
check('Actual page row only displays grade, target and saved result for the same real video/generation/owner', () => assertPageContext(pageSource))

let mutantChecks = 0
function mutant(name, file, source, before, after, oracle) {
  assert.ok(source.includes(before), `${name}: mutation anchor exists`)
  let rejected = false
  try { oracle(file === pageFile ? source.replace(before, after) : variant(file, source.replace(before, after))) } catch { rejected = true }
  assert.ok(rejected, `${name}: same behavioral oracle must reject mutant`)
  mutantChecks++; console.log(`PASS mutant ${name}`)
}
mutant('page borrows another generation assessment', pageFile, pageSource, 'assessmentMatchesDelivery(assessment, r) ? assessment : undefined', 'assessment', assertPageContext)
mutant('visual judge borrows null-frame textual exemption', qualityFile, qualitySource, "const needsFrames = judge === 'pixel' || judge === 'ugc'", 'const needsFrames = false', assertRequiredFrames)
const panelFile = 'lib/admin/regua95Painel.ts', panelSource = fs.readFileSync(path.join(ROOT, panelFile), 'utf8')
mutant('real join omits judge applicability', panelFile, panelSource, 'readJudgeEvidence(m, judgeName)', 'readJudgeEvidence(m)', assertJoinCoverage)
mutant('cosmetic-only no accepted as task failure', qualityFile, qualitySource, "if (result.task_fulfilled === 'no' && !findings.some((f) => f.severity !== 'cosmetic')) return null", '', assertCanonicalSavedVerdict)
mutant('incomplete known verdict accepted', qualityFile, qualitySource, "if (result.task_fulfilled !== 'unknown' && result.incomplete_reasons.length > 0) return null", '', assertCanonicalSavedVerdict)
mutant('contradictory score and basis accepted', qualityFile, qualitySource, "if (result.score_basis !== severity || (result.task_fulfilled !== 'unknown' && result.numerical_score !== anchors[severity])) return null", '', assertCanonicalSavedVerdict)

function controlHarness(fetchMock) {
  const values = [], refs = []; let stateIndex = 0, refIndex = 0
  const hooks = { useState(initial) { const i = stateIndex++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], value => { values[i] = typeof value === 'function' ? value(values[i]) : value }] }, useRef(initial) { const i = refIndex++; return refs[i] ??= { current: initial } } }
  const exports = {}
  const file = 'components/admin/TaskCanaryControl.tsx'
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const code = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, { exports, require: name => name === 'react' ? hooks : name === 'react/jsx-runtime' ? jsx : load(name), fetch: fetchMock }, { filename: file })
  return props => { stateIndex = 0; refIndex = 0; return exports.default(props) }
}
function elements(tree) {
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...React.Children.toArray(tree.props?.children).flatMap(elements)]
}
const target = { videoId: '22222222-2222-4222-8222-222222222222', generationId: '11111111-1111-4111-8111-111111111111', coherenceEventId: '33333333-3333-4333-8333-333333333333', pixelEventId: '44444444-4444-4444-8444-444444444444' }
check('Manual control is inert when the server flag is off', () => {
  const render = controlHarness(() => { throw Error('Disabled control cannot fetch') })
  const tree = render({ enabled: false, target, seconds: 15 })
  assert.equal(elements(tree).filter(e => e.type === 'button').length, 0)
  assert.match(renderToStaticMarkup(tree), /preparado e desligado/)
})
{
  let calls = 0, sent, finish
  const render = controlHarness((url, init) => {
    calls++; assert.equal(url, '/api/admin/coerencia/canario'); sent = JSON.parse(init.body)
    return new Promise(resolve => { finish = () => resolve({ ok: true, json: async () => ({ cases: [{ video_id: target.videoId, result: currentCanary }] }) }) })
  })
  const props = { enabled: true, target, seconds: 15 }
  let tree = render(props), button = elements(tree).find(e => e.type === 'button')
  await button.props.onClick(); assert.equal(calls, 0)
  elements(tree).find(e => e.type === 'input').props.onChange({ target: { checked: true } })
  tree = render(props); button = elements(tree).find(e => e.type === 'button')
  const first = button.props.onClick(); await button.props.onClick()
  assert.equal(calls, 1); assert.equal(sent.cases.length, 1); assert.equal(sent.cases[0].confirmed.source, 'admin_manual'); assert.equal(sent.cases[0].confirmed.seconds, 15)
  finish(); await first
  const html = renderToStaticMarkup(render(props)); assert.match(html, /Pedido não atendido/); assert.match(html, /0\/100/); assert.match(html, /ainda não calibrada/); assert.match(html, /Cena 1/); assert.match(html, /Nenhuma ruína/)
  checks++; console.log('PASS Actual manual handler requires explicit confirmation, blocks concurrent requests and displays grounded experimental result')
}
console.log(`Admin quality PASS: ${checks} behavioral groups; ${mutantChecks} rejected in-memory mutants; real source and SSR, no paid calls.`)
