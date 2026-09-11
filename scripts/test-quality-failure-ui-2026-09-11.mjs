// Pure parser, SSR of the real panel, and actual GenerateClient callback nodes.
// No browser account, network, database, render, automatic retry or paid call.
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let checks = 0
const eq = (a, b, label) => { assert.deepEqual(JSON.parse(JSON.stringify(a)), b, label); checks++ }
const ok = (a, label) => { assert.ok(a, label); checks++ }
const helpers = createOfflineLoader()('@/lib/cinematic/qualityFailureUi')
const id = '00000000-0000-4000-8000-000000000123'
const other = '00000000-0000-4000-8000-000000000456'
const response = { qualityCheckFailed: true, reason: 'native_speech_unverified', generationId: id, refunded: true, refundConfirmed: true, claimReleased: true, retryable: false }
const confirmed = helpers.parseVideoQualityFailure(response, id)
const pending = helpers.parseVideoQualityFailure({ ...response, refunded: false, refundConfirmed: false, claimReleased: false }, id)
eq(confirmed.canEdit, true, 'Confirmed release permits editing, not retry')
eq(pending.canEdit, false, 'Unsettled state never permits charged retry')
for (const field of ['refunded', 'refundConfirmed', 'claimReleased']) {
  eq(helpers.parseVideoQualityFailure({ ...response, [field]: false }, id).canEdit, false, 'Incomplete settlement cannot promise safe restart')
  eq(helpers.parseVideoQualityFailure({ ...response, [field]: 'true' }, id).canEdit, false, 'Truthiness is not server confirmation')
}
eq(helpers.parseVideoQualityFailure({ ...response, noDebit: true, refunded: false, refundConfirmed: false, claimReleased: false }, id).canEdit, true, 'Confirmed no-debit permits editing')
eq(helpers.parseVideoQualityFailure(response, other).canEdit, false, 'Another generation cannot authorize refund/restart')
eq(helpers.parseVideoQualityFailure({ ...response, generationId: 'provider-key?secret=SECRET' }, id).generationId, id, 'Only app generation id enters support UI')
eq(helpers.parseVideoQualityFailure({ ...response, reason: 'https://provider.invalid?secret=SECRET' }, id).reason, 'quality_check_failed', 'Raw provider content excluded')
eq(helpers.parseVideoQualityFailure({ ...response, retryable: true }, id).retryable, false, 'No automatic retry even with contradictory field')
for (const value of [null, {}, [], { qualityCheckFailed: 'true' }]) eq(helpers.parseVideoQualityFailure(value, id), null, 'Ordinary errors remain unchanged')
ok(helpers.qualityFailureOwnsSnapshot(confirmed, { composePayload: { generationId: id } }), 'Only the settled generation snapshot can be removed')
ok(!helpers.qualityFailureOwnsSnapshot(confirmed, { composePayload: { generationId: other } }), 'Concurrent newer snapshot preserved')
ok(!helpers.qualityFailureOwnsSnapshot(pending, { composePayload: { generationId: id } }), 'Uncertainty preserves replay payload')

function evaluate(source, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, { exports, ...globals }, { timeout: 5000 })
  return exports
}
const panelSource = fs.readFileSync('components/VideoQualityFailurePanel.tsx', 'utf8')
function renderPanel(language, failure) {
  const Panel = evaluate(panelSource, { require: name => {
    if (name === 'react/jsx-runtime') return jsxRuntime
    if (name === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => language }
    throw Error(`Unexpected panel import: ${name}`)
  } }).default
  return renderToStaticMarkup(React.createElement(Panel, { failure, onEdit() { throw Error('SSR must not execute action') } }))
}
for (const language of ['en', 'es', 'hi']) {
  const good = renderPanel(language, confirmed)
  const uncertain = renderPanel(language, pending)
  ok(good.includes(`lang="${language}"`), 'Existing interface language controls actual panel')
  ok(good.includes('<button'), 'Settled state offers explicit edit')
  ok(!uncertain.includes('<button'), 'Uncertain state offers no retry or edit action')
  ok(uncertain.includes('mailto:support@usekineo.com'), 'Support matches existing app contact')
  ok(uncertain.includes('href="/history"'), 'History remains reachable')
  ok(uncertain.includes(id), 'App generation reference is visible')
  ok(!/retry safely|have been returned|were returned/.test(uncertain), 'Uncertain state does not claim a refund')
}

const clientSource = fs.readFileSync('app/(dashboard)/generate/GenerateClient.tsx', 'utf8')
const ast = ts.createSourceFile('GenerateClient.tsx', clientSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const nodes = []
function visit(node) { nodes.push(node); ts.forEachChild(node, visit) }
visit(ast)
const callback = name => nodes.find(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === name).initializer.arguments[0].getText(ast)
function callbackHarness(snapshot, payload = response) {
  const calls = [], refs = {}, state = {}
  for (const name of ['qualityFailureRef', 'generationInFlightRef', 'composeStartedRef', 'resumedRenderRef', 'serverActiveRenderRef', 'generationAttemptRef']) refs[name] = { current: name === 'qualityFailureRef' ? null : 'existing' }
  let raw = JSON.stringify(snapshot)
  const scope = {
    ...helpers, ...refs, currentUserIdRef: { current: 'owner' },
    activeRenderStorageKey: user => `render:${user}`,
    localStorage: { getItem: () => raw, removeItem: key => { calls.push(['remove', key]); raw = null } },
  }
  for (const name of ['QualityFailure', 'Error', 'ScriptTooShort', 'CreditsHeld', 'RenderId', 'ServerActiveRender', 'Phase', 'GenerationId', 'ClipUrls']) scope[`set${name}`] = value => { state[name] = value; calls.push([`set${name}`, value]) }
  const accept = evaluate(`export const run = ${callback('acceptQualityFailure')}`, scope).run
  eq(accept(payload, id), true, 'Actual compose consumer recognizes quality response')
  const edit = evaluate(`export const run = ${callback('editAfterQualityFailure')}`, scope).run
  return { calls, state, refs, edit, raw: () => raw }
}
const active = { composePayload: { generationId: id }, prompt: 'Keep my prompt', duration: 60, mode: 'cinematic_ai' }
const settledUi = callbackHarness(active)
eq(settledUi.raw(), null, 'Actual callback clears settled same-generation snapshot')
eq(settledUi.state.Phase, 'failed', 'Quality response stops normal polling phase')
settledUi.edit()
eq(settledUi.state.Phase, 'idle', 'Edit returns to editing, not generation')
ok(!settledUi.calls.some(([name]) => ['setPrompt', 'setDuration', 'setMode'].includes(name)), 'Edit preserves requested creative inputs')
const uncertainUi = callbackHarness(active, { ...response, refunded: false, refundConfirmed: false, claimReleased: false })
eq(JSON.parse(uncertainUi.raw()), active, 'Actual callback preserves uncertain active snapshot')
uncertainUi.edit()
eq(uncertainUi.state.Phase, 'failed', 'Programmatic edit cannot bypass pending settlement')
const newerUi = callbackHarness({ composePayload: { generationId: other } })
ok(newerUi.raw() !== null, 'Actual callback does not remove a newer generation')
const cleanupEffect = nodes.find(n => ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect' && n.arguments[0]?.getText(ast).includes("if (phase !== 'done' && phase !== 'failed') return") && n.arguments[0]?.getText(ast).includes('localStorage.removeItem'))
ok(cleanupEffect, 'Real terminal cleanup effect located')
evaluate(`export const run = ${cleanupEffect.arguments[0].getText(ast)}`, {
  phase: 'failed', qualityFailureRef: { current: pending },
  localStorage: { removeItem() { throw Error('Uncertain snapshot erased') } },
}).run()
checks++
for (const name of ['handleGenerate', 'handleGenerateGuarded']) {
  const fn = nodes.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name)
  const exports = evaluate(`export ${fn.getText(ast)}`, { qualityFailureRef: { current: pending } })
  await exports[name]() // Any work past the guard has no dependencies and fails.
  checks++
}
const consumes = nodes.filter(n => ts.isCallExpression(n) && n.expression.getText(ast) === 'acceptQualityFailure')
// The planner's new duration floor uses the same financial/UX contract.
eq(consumes.map(n => n.arguments[1].getText(ast)).sort(), ['cinematicGenerationId', 'composeGenerationId', 'payloadGenerationId'], 'Planning, compose dispatch and reload/replay consume terminal quality response')
for (const node of consumes) {
  ok(ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken, 'Consumer is guarded by non-OK response')
  const statement = node.parent.parent
  ok(ts.isIfStatement(statement) && ts.isReturnStatement(statement.thenStatement), 'Quality response exits rather than reconnects/polls')
}
const generic = nodes.find(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === 'showGenericFailure').initializer.getText(ast)
ok(generic.includes('!qualityFailure'), 'Generic refund+retry panel is suppressed for quality state')

if (process.argv.includes('--preview')) {
  const before = '<section style="background:#20171b;border:1px solid #66343b;border-radius:16px;padding:24px;color:#fca5a5"><h2>Generation failed</h2><p>Could not assemble the render.</p><p>Your credits have been returned to your balance. You can retry safely.</p><button style="padding:12px 20px;background:#2997ff;color:white;border:0;border-radius:10px">Retry</button></section>'
  const card = (title, body) => `<article><h2 class="label">${title}</h2>${body}</article>`
  const rows = ['Desktop', 'Mobile'].map(size => `<h1>${size}</h1><div class="grid ${size.toLowerCase()}">${card('Before · generic failure', before)}${card('After · settlement confirmed', renderPanel('en', confirmed))}${card('After · settlement not confirmed', renderPanel('en', pending))}</div>`).join('')
  console.log(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quality failure — before / after</title><style>body{margin:0;padding:28px;background:#0d0f14;color:#f5f5f7;font:14px Arial,sans-serif}.grid{display:grid;gap:24px;align-items:start;margin-bottom:36px}.desktop{grid-template-columns:repeat(3,minmax(0,1fr))}.mobile{grid-template-columns:repeat(3,390px);overflow:auto}.label{font-size:13px;color:#99a1b1;font-weight:500;margin:0 0 12px}h1{font-size:18px}article{min-width:0}button,a{font:inherit}@media(max-width:900px){.desktop{grid-template-columns:1fr}}</style><h1>Video quality rejection · 11 September 2026</h1><p>Before: verified existing generic copy. After: server-rendered real new component. Desktop and 390px mobile.</p>${rows}<h1>Localized pending states</h1><div class="grid desktop">${card('Español', renderPanel('es', pending))}${card('हिन्दी', renderPanel('hi', pending))}</div></html>`)
} else console.log(`quality-failure-ui: ${checks} passed; actual panel SSR and caller callbacks; no external calls`)
