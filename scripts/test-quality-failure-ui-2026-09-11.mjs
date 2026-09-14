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
// lib/qualityFailureExit.ts fica FORA de lib/cinematic/ (trava 8.2 do fundador).
const exitHelpers = createOfflineLoader()('@/lib/qualityFailureExit')
const id = '00000000-0000-4000-8000-000000000123'
const other = '00000000-0000-4000-8000-000000000456'
const response = { qualityCheckFailed: true, reason: 'native_speech_unverified', generationId: id, refunded: true, refundConfirmed: true, claimReleased: true, retryable: false }
const confirmed = helpers.parseVideoQualityFailure(response, id)
const pending = helpers.parseVideoQualityFailure({ ...response, refunded: false, refundConfirmed: false, claimReleased: false }, id)
eq(confirmed.canEdit, true, 'Confirmed release permits editing, not retry')
eq(pending.canEdit, false, 'Unsettled state never permits charged retry')
const sceneHold=helpers.parseVideoQualityFailure({ ...response, qualityCheckFailed: false, sceneRetryPending: true, noDebit: true }, id)
eq(sceneHold.canEdit, false, 'Uncertain scene retry cannot claim refund or permit editing even with conflicting fields')
eq(sceneHold.refundConfirmed, false, 'Scene retry has no refund authority')
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
function renderPanel(language, failure, exit = null) {
  const Panel = evaluate(panelSource, { require: name => {
    if (name === 'react/jsx-runtime') return jsxRuntime
    if (name === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => language }
    throw Error(`Unexpected panel import: ${name}`)
  } }).default
  return renderToStaticMarkup(React.createElement(Panel, { failure, exit, onEdit() { throw Error('SSR must not execute action') } }))
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
    ...helpers, ...exitHelpers, ...refs, currentUserIdRef: { current: 'owner' },
    activeRenderStorageKey: user => `render:${user}`,
    localStorage: { getItem: () => raw, removeItem: key => { calls.push(['remove', key]); raw = null } },
  }
  for (const name of ['QualityFailure', 'QualityFailureExit', 'Error', 'ScriptTooShort', 'CreditsHeld', 'RenderId', 'ServerActiveRender', 'Phase', 'GenerationId', 'ClipUrls']) scope[`set${name}`] = value => { state[name] = value; calls.push([`set${name}`, value]) }
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

// ═══ KINEO-S25-RECUSA-NA-TELA-2026-09-14 (Board, MOTORES-ESPECIFICOS-R6) ═══
// Da função REAL de recusa do servidor (rejectS25DialogueWithoutHost, com
// cinco cenas aceitas) até a tela: parser real, consumidor cinematic real,
// guarda de repetição inalterada real, painel real. Nenhuma geração é
// disparada em nenhum passo (fetch proibido em todo escopo).
const routeSource = fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8')
const routeAst = ts.createSourceFile('route.ts', routeSource, ts.ScriptTarget.Latest, true)
const routeNodes = []
{ const visit = n => { routeNodes.push(n); ts.forEachChild(n, visit) }; visit(routeAst) }
const routeDecl = name => routeNodes.find(n => ts.isVariableStatement(n) && n.declarationList.declarations[0].name.getText(routeAst) === name)
const s25Pre = routeDecl('s25DialogueScenes'), s25Reject = routeDecl('rejectS25DialogueWithoutHost')
ok(s25Pre && s25Reject, 'Real server rejection function located')
const acceptedIds = ['req-a1', 'req-b2', 'req-c3', 'req-d4', 'req-e5']
async function realRejection({ refunded, released }) {
  const scope = {
    family: 's25', plan: { scenes: [1, 2, 3, 4, 5, 6].map(i => ({ type: i === 6 ? 'dialogue' : 'support' })) }, user: { id: 'u' }, generationId: id, formatoVisual: { modo: 'presenter' },
    confirmCinematicRefund: async () => refunded, releaseBirthClaim: async () => released, writeServerEvent: async () => {}, ctxDespacho: () => ({}),
    NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) }, console: { warn() {}, log() {} }, fetch() { throw Error('network forbidden') },
  }
  const run = evaluate(`export const run = (async () => { ${s25Pre.getText(routeAst)}\n${s25Reject.getText(routeAst)}\nreturn rejectS25DialogueWithoutHost('the presenter voice provider rejected the scene (HTTP 400)', true, { heldScenes: [5], hostAttempts: [{ scene_index: 5, host_model: 'host', host_post: true, host_status: 400 }], acceptedScenes: ${JSON.stringify(acceptedIds.map((request_id, scene_index) => ({ scene_index, request_id, model: 'native' })))}, scenePosts: 6, stoppedAfterScene: 5 }) })`, scope).run
  return run()
}
const plain = value => JSON.parse(JSON.stringify(value))
const settledResponse = await realRejection({ refunded: true, released: true })
const unsettledResponse = await realRejection({ refunded: false, released: false })
eq([settledResponse.status, settledResponse.body.reason, settledResponse.body.retryable], [422, 's25_dialogue_without_host', false], 'Real server rejection: 422, named reason, retryable:false')
const s25Settled = helpers.parseVideoQualityFailure(settledResponse.body, id)
const s25Pending = helpers.parseVideoQualityFailure(unsettledResponse.body, id)
const s25Exit = exitHelpers.parseQualityFailureExit(settledResponse.body, s25Settled)
const s25PendingExit = exitHelpers.parseQualityFailureExit(unsettledResponse.body, s25Pending)
eq([s25Settled.canEdit, s25Settled.reason, s25Settled.retryable], [true, 's25_dialogue_without_host', false], 'Real response + refund true: the untouched financial parser (lib/cinematic) accepts it as terminal and editable')
eq([s25Exit.reason, s25Exit.guidance, s25Exit.acceptedScenes, s25Exit.acceptedRequestIds, s25Exit.heldScenes, s25Exit.scenePosts], ['s25_dialogue_without_host', 'engine_or_format', 5, acceptedIds, [5], 6], 'Real response with five accepted IDs: the exit keeps the IDs, held scene, POST count and names the engine/format exit')
eq([s25Pending.canEdit, s25PendingExit.guidance, s25PendingExit.acceptedRequestIds, s25Pending.refundConfirmed], [false, 'engine_or_format', acceptedIds, false], 'Refund false: no edit, no free-balance promise, IDs still preserved for support')
eq(exitHelpers.parseQualityFailureExit({ ...settledResponse.body, acceptedScenes: [{ request_id: 'https://provider.invalid/x?k=SECRET' }, { request_id: 'ok_1' }, 'junk', null], heldScenes: [-1, 2.5, 'x', 3], scenePosts: -4 }, s25Settled), { ...s25Exit, acceptedScenes: 1, acceptedRequestIds: ['ok_1'], heldScenes: [3], scenePosts: 0 }, 'Only app-shaped scene references enter the UI state')
eq(exitHelpers.parseQualityFailureExit(response, helpers.parseVideoQualityFailure(response, id)).guidance, null, 'Other quality reasons keep the generic exit')
eq(exitHelpers.parseQualityFailureExit(settledResponse.body, null), null, 'No validated terminal failure → no exit (the financial parser decides first)')
ok(!fs.readFileSync('lib/cinematic/qualityFailureUi.ts', 'utf8').includes('engine_or_format'), 'lib/cinematic/ (founder lock 8.2) is not where the exit lives')
eq(helpers.parseVideoQualityFailure({ error: 'boom' }, id), null, 'Transient 500 body is not a terminal quality response (generic retry path unchanged)')

// Consumidor cinematic REAL: a linha de diagnóstico e a memória da repetição
// nascem do bloco que antecede o `acceptQualityFailure` do cinematic.
const consumerBlock = nodes.find(n => ts.isBlock(n) && n.parent && ts.isBlock(n.parent) && n.getText(ast).includes('const recusaTerminal') && n.getText(ast).includes('unchangedRepeatRef.current ='))
ok(consumerBlock, 'Real cinematic consumer diagnostic block located')
const cinematicConsume = consumes.find(n => n.arguments[1].getText(ast) === 'cinematicGenerationId')
ok(consumerBlock.parent.statements.indexOf(consumerBlock) === consumerBlock.parent.statements.indexOf(cinematicConsume.parent.parent) - 1, 'Diagnostic block runs immediately before the real cinematic consumer')
function runConsumer(res, data, engine = 's25') {
  const tracked = [], unchangedRepeatRef = { current: null }
  evaluate(`export const run = () => ${consumerBlock.getText(ast)}`, {
    ...helpers, ...exitHelpers, res, data, cinematicGenerationId: id, trimmed: 'The captain speaks to camera', aiEngine: engine, unchangedRepeatRef,
    trackGenerationFailure: (stage, reason, extra) => tracked.push({ stage, reason, ...extra }), fetch() { throw Error('generation forbidden') },
  }).run()
  return { tracked, memory: unchangedRepeatRef.current }
}
const consumed = runConsumer({ ok: false, status: 422 }, settledResponse.body)
eq(consumed.tracked.length, 1, 'One diagnostic line per terminal rejection')
eq([consumed.tracked[0].stage, consumed.tracked[0].reason, consumed.tracked[0].httpStatus, consumed.tracked[0].responded], ['generating', 's25_dialogue_without_host', 422, true], 'Diagnostic line carries the named reason and the real HTTP status')
ok(consumed.tracked[0].detail.includes('accepted=5') && consumed.tracked[0].detail.includes('held=[5]') && consumed.tracked[0].detail.includes('posts=6') && consumed.tracked[0].detail.includes('refund=confirmed'), 'Diagnostic detail states what the server had already bought and the settlement')
eq(consumed.tracked[0].message, `accepted_ids=${acceptedIds.join('|')}`, 'Accepted scene references are preserved in the diagnostic line')
eq(consumed.memory, { prompt: 'The captain speaks to camera', engine: 's25', failure: plain(s25Settled), exit: plain(s25Exit) }, 'The exact rejected request (sent text + engine) is remembered for the unchanged-repeat guard')
const consumedOther = runConsumer({ ok: false, status: 422 }, response)
eq([consumedOther.tracked[0]?.reason, consumedOther.memory], ['native_speech_unverified', null], 'Other quality reasons get the diagnostic line but no engine/format memory')
const consumedTransient = runConsumer({ ok: false, status: 500 }, { error: 'boom' })
eq([consumedTransient.tracked, consumedTransient.memory], [[], null], 'Transient error: no diagnostic here, no memory — the existing generic retry stays')
eq(runConsumer({ ok: true, status: 200 }, settledResponse.body).tracked, [], 'OK response never enters the rejection path')

// Guarda REAL de handleGenerate: a repetição inalterada não viaja.
const handleGenerateFn = nodes.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'handleGenerate')
const guardIf = handleGenerateFn.body.statements.find(s => ts.isIfStatement(s) && s.expression.getText(ast).startsWith('repeticaoInalterada &&'))
ok(guardIf, 'Real unchanged-repeat guard located inside handleGenerate')
const guardIndex = handleGenerateFn.body.statements.indexOf(guardIf)
const guardSlice = handleGenerateFn.body.statements.slice(guardIndex - 1, guardIndex + 2).map(s => s.getText(ast)).join('\n')
ok(guardSlice.startsWith('const repeticaoInalterada = unchangedRepeatRef.current') && guardSlice.endsWith('unchangedRepeatRef.current = null'), 'Guard reads the memory, blocks, and otherwise clears it')
ok(handleGenerateFn.body.statements.slice(0, guardIndex).some(s => s.getText(ast).includes('const trimmed =')), 'Guard runs after the sent text is known and before any dispatch')
ok(!handleGenerateFn.body.statements.slice(0, guardIndex).some(s => /fetch\(/.test(s.getText(ast))), 'No fetch precedes the guard')
function runGuard({ memory, mode = 'cinematic_ai', aiEngine = 's25', trimmed = 'The captain speaks to camera' }) {
  const calls = [], qualityFailureRef = { current: null }, generationInFlightRef = { current: true }, unchangedRepeatRef = { current: memory }
  const passed = evaluate(`export const run = () => { ${guardSlice}\nreturn 'dispatch-continues' }`, {
    unchangedRepeatRef, qualityFailureRef, generationInFlightRef, mode, aiEngine, trimmed, phase: 'options',
    setQualityFailure: v => calls.push(['setQualityFailure', v]), setQualityFailureExit: v => calls.push(['setQualityFailureExit', v]), setError: v => calls.push(['setError', v]), setPhase: v => calls.push(['setPhase', v]),
    trackGenerationFailure: (stage, reason, extra) => calls.push(['track', stage, reason, extra?.detail]), fetch() { throw Error('generation forbidden') },
  }).run()
  return { passed, calls, qualityFailure: qualityFailureRef.current, inFlight: generationInFlightRef.current, memory: unchangedRepeatRef.current }
}
const memory = { prompt: 'The captain speaks to camera', engine: 's25', failure: s25Settled, exit: s25Exit }
const blocked = runGuard({ memory })
eq([blocked.passed ?? 'blocked', blocked.qualityFailure, blocked.inFlight, blocked.memory], ['blocked', plain(s25Settled), false, plain(memory)], 'Unchanged repeat (same sent text, same engine): no dispatch, same settled card restored, in-flight claim released, memory kept')
eq(blocked.calls, [['setQualityFailure', plain(s25Settled)], ['setQualityFailureExit', plain(s25Exit)], ['setError', null], ['track', 'options', 'cinematic_unchanged_repeat_blocked', 'reason=s25_dialogue_without_host engine=s25'], ['setPhase', 'failed']], 'Blocked repeat is recorded as its own reason and returns to the failed card')
for (const change of [{ trimmed: 'The captain speaks to camera. A narrator tells the story.' }, { aiEngine: 'hollywood' }, { mode: 'fast' }]) {
  const changed = runGuard({ memory, ...change })
  eq([changed.passed, changed.calls, changed.memory], ['dispatch-continues', [], null], `Changed request (${Object.keys(change)[0]}) is a new generation: guard clears the memory and dispatch continues`)
}
eq(runGuard({ memory: null }).passed, 'dispatch-continues', 'No memory: guard is inert for every other failure and engine')

// Edição explícita a partir da recusa S25: volta ao formulário sem tocar em
// texto, duração, modo ou motor. Repetição depois disso é decisão da pessoa.
const s25Ui = callbackHarness({ composePayload: { generationId: id } }, settledResponse.body)
eq([s25Ui.state.QualityFailure.reason, s25Ui.state.QualityFailureExit.guidance, s25Ui.state.QualityFailureExit.acceptedRequestIds], ['s25_dialogue_without_host', 'engine_or_format', acceptedIds], 'Real consumer callback accepts the S25 rejection and derives its exit from the same response')
s25Ui.edit()
eq([s25Ui.state.Phase, s25Ui.state.QualityFailureExit], ['idle', null], 'Explicit "Change engine or format" returns to editing, not to a dispatch, and clears the exit with the failure')
ok(!s25Ui.calls.some(([name]) => ['setPrompt', 'setDuration', 'setMode', 'setAiEngine', 'setQuality'].includes(name)), 'Engine and format are never changed automatically')
const s25PendingUi = callbackHarness({ composePayload: { generationId: id } }, unsettledResponse.body)
s25PendingUi.edit()
eq(s25PendingUi.state.Phase, 'failed', 'Unconfirmed refund on S25 keeps the card closed (no edit, no dispatch)')

// Painel REAL: nomeia motor/formato, conta as cenas postas de lado, promete
// nada de reaproveitamento; outras razões ficam como eram.
for (const language of ['en', 'es', 'hi']) {
  const settled = renderPanel(language, s25Settled, s25Exit), pending = renderPanel(language, s25Pending, s25PendingExit)
  const title = { en: 'Seedance 2.5 cannot voice an on-camera presenter', es: 'Seedance 2.5 no puede dar voz a un presentador en cámara', hi: 'Seedance 2.5 कैमरे पर बोलने वाले प्रस्तुतकर्ता को आवाज़ नहीं दे सकता' }[language]
  const button = { en: 'Change engine or format', es: 'Cambiar motor o formato', hi: 'इंजन या फ़ॉर्मैट बदलें' }[language]
  ok(settled.includes(title) && pending.includes(title), `${language}: the card names the engine and the presenter format`)
  ok(settled.includes('Kling 3') && settled.includes('MiniMax H3') && settled.includes('Omni Flash'), `${language}: the exit names the engines that voice a presenter`)
  ok(settled.includes(`>${button}<`), `${language}: settled S25 offers the explicit engine/format exit`)
  ok(!pending.includes('<button'), `${language}: unconfirmed refund offers no button`)
  const setAside = settled.match(/data-quality-set-aside=""[^>]*>([^<]+)</)?.[1] ?? ''
  ok(/(^|\D)5(\D|$)/.test(setAside), `${language}: five scenes set aside are stated`)
  const noReuse = { en: 'those scenes are not reused', es: 'esas escenas no se reutilizan', hi: 'दोबारा उपयोग नहीं होते' }[language]
  ok(setAside.includes(noReuse) && !/will be reused|se reutilizar[áa]n|दोबारा उपयोग होंगे/.test(settled), `${language}: the card says the accepted scenes are NOT reused`)
  ok(!pending.includes('data-quality-set-aside') || pending.includes(noReuse), `${language}: unconfirmed refund never promises reuse either`)
  const other = renderPanel(language, confirmed)
  ok(!other.includes(title) && !other.includes(button) && !other.includes('data-quality-set-aside'), `${language}: other quality reasons render without the engine exit or scene line`)
}
ok(renderPanel('en', confirmed).includes('>Edit my idea<') && renderPanel('en', confirmed).includes('This video needs a review'), 'Generic quality card keeps its title and edit label')

if (process.argv.includes('--preview')) {
  const before = '<section style="background:#20171b;border:1px solid #66343b;border-radius:16px;padding:24px;color:#fca5a5"><h2>Generation failed</h2><p>Could not assemble the render.</p><p>Your credits have been returned to your balance. You can retry safely.</p><button style="padding:12px 20px;background:#2997ff;color:white;border:0;border-radius:10px">Retry</button></section>'
  const card = (title, body) => `<article><h2 class="label">${title}</h2>${body}</article>`
  const rows = ['Desktop', 'Mobile'].map(size => `<h1>${size}</h1><div class="grid ${size.toLowerCase()}">${card('Before · generic failure', before)}${card('After · settlement confirmed', renderPanel('en', confirmed))}${card('After · settlement not confirmed', renderPanel('en', pending))}</div>`).join('')
  // KINEO-S25-RECUSA-NA-TELA-2026-09-14 — antes = o que 5d8d695b mostrava para
  // a recusa do S25 (cartão genérico de qualidade, sem causa nem cenas);
  // depois = o mesmo componente real com a saída de motor/formato.
  const s25Before = renderPanel('en', s25Settled)
  const s25Rows = ['Desktop', 'Mobile'].map(size => `<h1>${size} · Seedance 2.5 presenter refusal</h1><div class="grid ${size.toLowerCase()}">${card('Before · 5d8d695b (generic quality card)', s25Before)}${card('After · refund confirmed, 5 scenes set aside', renderPanel('en', s25Settled, s25Exit))}${card('After · refund not confirmed', renderPanel('en', s25Pending, s25PendingExit))}</div>`).join('')
  const s25Localized = `<h1>Seedance 2.5 refusal · localized</h1><div class="grid desktop">${card('Español', renderPanel('es', s25Settled, s25Exit))}${card('हिन्दी', renderPanel('hi', s25Settled, s25Exit))}</div>`
  console.log(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quality failure — before / after</title><style>body{margin:0;padding:28px;background:#0d0f14;color:#f5f5f7;font:14px Arial,sans-serif}.grid{display:grid;gap:24px;align-items:start;margin-bottom:36px}.desktop{grid-template-columns:repeat(3,minmax(0,1fr))}.mobile{grid-template-columns:repeat(3,390px);overflow:auto}.label{font-size:13px;color:#99a1b1;font-weight:500;margin:0 0 12px}h1{font-size:18px}article{min-width:0}button,a{font:inherit}@media(max-width:900px){.desktop{grid-template-columns:1fr}}</style><h1>Video quality rejection · 11 September 2026</h1><p>Before: verified existing generic copy. After: server-rendered real new component. Desktop and 390px mobile.</p>${rows}${s25Rows}${s25Localized}<h1>Localized pending states</h1><div class="grid desktop">${card('Español', renderPanel('es', pending))}${card('हिन्दी', renderPanel('hi', pending))}</div></html>`)
} else console.log(`quality-failure-ui: ${checks} passed; actual panel SSR and caller callbacks; no external calls`)
