// Offline characterization, NOT a passing acceptance gate for the proposed UX.
// Executes the actual Studio URL reader and Generate callback extracted by AST.
// Routing, state, storage and analytics are simulated; no provider/API calls.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = path.resolve(import.meta.dirname, '..')
const text = fs.readFileSync(path.join(root, 'app/(dashboard)/studio/StudioClient.tsx'), 'utf8')
const source = ts.createSourceFile('StudioClient.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const all = []
function visit(node) { all.push(node); ts.forEachChild(node, visit) }
visit(source)
const reader = all.find((n) => ts.isCallExpression(n) && n.expression.getText(source) === 'useEffect' && n.arguments[0]?.getText(source).includes('new URLSearchParams(searchSignature)'))?.arguments[0]
const generate = all.find((n) => ts.isVariableDeclaration(n) && n.name.getText(source) === 'generate')?.initializer
const engines = all.find((n) => ts.isVariableDeclaration(n) && n.name.getText(source) === 'ENGINES')?.initializer
assert.ok(reader && generate && engines && ts.isArrayLiteralExpression(engines), 'real entry points must exist')
const engineKeys = engines.elements.map((entry) => entry.properties.find((p) => p.name?.getText(source) === 'key')?.initializer?.text)
function evaluate(node, scope) {
  const output = ts.transpileModule('const action = ' + node.getText(source), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
  return new Function(...Object.keys(scope), output + '\nreturn action();')(...Object.values(scope))
}
const seriesSource = fs.readFileSync(path.join(root, 'lib/seriesContinuation.ts'), 'utf8')
const seriesModule = { exports: {} }
new Function('exports', ts.transpileModule(seriesSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(seriesModule.exports)
const { buildSeriesContinuationHref } = seriesModule.exports
function roundTrip(href, initial = {}) {
  const query = href.slice(href.indexOf('?') + 1)
  const state = { engine: 'fast', duration: 60, prompt: '', scriptMode: 'ai', aspect: '9:16', ...initial }
  const writes = []
  const navigations = []
  const events = []
  const campaignRef = { current: 'studio_v4' }
  const onboardingGoalRef = { current: null }
  evaluate(reader, {
    searchSignature: query,
    ENGINES: engineKeys.map((key) => ({ key })),
    setEngine: (v) => { state.engine = v },
    setPrompt: (v) => { state.prompt = v },
    setScriptMode: (v) => { state.scriptMode = v },
    setDuration: (v) => { state.duration = v },
    setChatGptQuickstart: () => {},
    isChatGptQuickstartChoice: () => false,
    isOnboardingGoalId: () => false,
    campaignRef, onboardingGoalRef,
  })
  assert.equal(writes.length, 0, 'arrival must not grant spend consent')
  assert.equal(navigations.length, 0, 'arrival must not navigate to render')
  evaluate(generate, {
    ...state, limit: { over: false }, finalPrompt: state.prompt.trim(),
    campaignRef, onboardingGoalRef,
    sessionStorage: { setItem: (key, value) => writes.push({ key, value }), removeItem: () => {} },
    trialFirstDeliveryStudioIntent: () => null,
    trackEvent: (...event) => events.push(event),
    router: { push: (url) => navigations.push(url) },
  })
  assert.equal(writes.length, 1, 'only simulated Generate grants existing consent')
  assert.equal(navigations.length, 1)
  return { state, output: new URL(navigations[0], 'https://example.invalid').searchParams }
}
const href = buildSeriesContinuationHref('A submarine beneath the ice.', 'studio_milestone')
assert.ok(href.startsWith('/studio/create?'))
const title = roundTrip(href)
assert.equal(title.output.get('prompt'), new URL(href, 'https://example.invalid').searchParams.get('prompt'))
assert.equal(title.output.get('series'), null)
assert.equal(title.output.get('continuation_source'), null)
assert.equal(title.output.get('duration'), '60')
assert.equal(title.output.get('script_mode'), 'ai')
const retainedMode = roundTrip(href, { scriptMode: 'verbatim', duration: 90 })
assert.equal(retainedMode.output.get('script_mode'), 'verbatim')
assert.equal(retainedMode.output.get('duration'), '90')
const script = 'HOOK\n¿Quién dejó la señal?\nMICRO REWARD\nLa luz volvió.\nESCALATION\nNadie tocó el interruptor.\nPAYOFF\nEra un temporizador.'
const authoredQuery = new URLSearchParams({ prompt: script, script_mode: 'verbatim', engine: 'h3', duration: '35', series: '1', continuation_source: 'done_screen', language: 'es', aspect: '1:1' })
const authored = roundTrip('/studio?' + authoredQuery)
assert.equal(authored.output.get('prompt'), script)
assert.equal(authored.output.get('script_mode'), 'verbatim')
assert.equal(authored.output.get('engine'), 'h3')
assert.equal(authored.output.get('duration'), '35')
assert.equal(authored.output.get('language'), null)
assert.equal(authored.output.get('aspect'), null)
assert.equal(authored.output.get('series'), null)
console.log(JSON.stringify({
  classification: 'DIAGNOSTIC ONLY — existing reader, not an implemented fix',
  source: 'StudioClient URL useEffect + generate callback, real AST bodies; dependencies mocked',
  titleLink: { legacyPath: '/studio/create', hypotheticalStudioRoundTrip: { losesSeries: true, losesSource: true, defaultDuration: title.state.duration, staleModeSurvives: true } },
  authoredRoundTrip: { textPreserved: true, explicitVerbatimPreserved: true, explicitEngineDurationPreserved: true, losesLanguage: true, losesAspect: true },
  providerCalls: 0,
  warning: 'These assertions characterize defects of a path-only rewrite. They are not UX acceptance tests. Update to preservation gates when implementing the destination contract.',
}, null, 2))
