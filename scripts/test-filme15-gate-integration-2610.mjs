// KINEO-FILME15-PERFEITO-2610: real signed adapters and actual route slices.
// DB/providers are fakes; no environment files, network, refund or paid render.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const clone = x => JSON.parse(JSON.stringify(x))
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const forbidden = () => { throw Error('External action forbidden') }
const media = { url: 'https://fixture.invalid/final.mp4', snapshotUrl: null, durationSeconds: 15 }
const initial = () => ({ version: 'free15-gate-v1', status: 'ready', source: { duration: 15, elements: [{ type: 'video', source: 'scene-a', duration: 15, time: 0 }] },
  captionElements: [{ type: 'text', text: 'Canonical caption', track: 5, time: 0, duration: 15 }], captionEvidence: null,
  context: { asked: 'A girl finds a key', narration: 'A girl found a golden key behind the old door.', language: 'en' }, attempted: false, reason: 'awaiting_assembly', updatedAt: 1 })
const goodPixel = { score: 95, cap_limit: 100, caps: [], evidence_status: 'complete', caption_language_ok: true, caption_legible: true, identity_consistent: true, frames: [] }
function adapters({ sourceTransform = null, denyCAS = false } = {}) {
  let row = null, forcedRead = false, refundLedger = { amount: 10, refunded_at: null }
  const calls = { transitions: [], judged: [], refunds: [], failures: [] }
  const db = { from(table) {
    let operation = 'select', patch = null; const filters = []
    const q = {
      select() { return q }, eq(key, value) { filters.push([key, value]); return q },
      update(value) { operation = 'update'; patch = value; return q },
      async insert(value) { if (row) return { error: { code: '23505' } }; row = clone(value); return { error: null } },
      async upsert(value) { calls.failures.push(clone(value)); return { error: null } },
      async maybeSingle() {
        if (table === 'credit_debits') return { data: clone(refundLedger), error: null }
        const matches = row && filters.every(([key, value]) => (key === 'metadata->>authority' ? row.metadata.authority : row[key]) === value)
        if (operation === 'update') {
          if (denyCAS || !matches) return { data: null, error: null }
          calls.transitions.push({ filters: clone(filters), patch: clone(patch) }); row = { ...row, ...clone(patch) }; return { data: { id: row.id }, error: null }
        }
        return { data: row && (forcedRead || matches) ? clone(row) : null, error: null }
      },
    }; return q
  } }
  const mocks = {
    '@fal-ai/client': { fal: { config: forbidden, queue: { status: forbidden, result: forbidden } } },
    '@/lib/falQueue': { submitFalQueueOnce: forbidden },
    '@/lib/compose': { pollCreatomateRender: forbidden, submitCreatomateRender: forbidden },
    '@/lib/regua95/pixelScore': { scorePixel: async (...args) => { calls.judged.push(clone(args)); return goodPixel } },
    '@/lib/credits/refund': { refundRenderCredits: async reference => { calls.refunds.push(reference); return 0 } },
  }
  const lib = createOfflineLoader({ mocks, source: sourceTransform })('lib/free15GateServer.ts')
  const context = { db, secret: 'offline-signing-key', userId: 'owner-a', renderId: 'render-a' }
  const claim = { engine: 'seedance', generationId: 'generation-a', status: 'settled', resolutionReference: 'cinematic-debit-a' }
  return { lib, context, claim, calls, row: () => clone(row), setRow: value => { row = clone(value); forcedRead = true },
    ledger: value => { refundLedger = value }, seed: state => lib.storeFree15Gate({ ...context, state: state ?? initial() }),
    run: extra => lib.runFree15Gate({ ...context, claim, media, ...extra }) }
}
let checks = 0
const check = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name) }
await check('adapter signs the full state and reads only the owner/render event', async () => {
  const h = adapters(); assert.equal(await h.seed(), true)
  assert.match(h.row().metadata.authority, /^[a-f0-9]{64}$/)
  assert.equal(await h.seed(), true, 'signed duplicate is safe')
  const good = h.row(); const forged = clone(good); forged.metadata.state.source.duration = 1; h.setRow(forged)
  await assert.rejects(h.run(), /signature_invalid/)
  h.setRow(good); await assert.rejects(h.run({ userId: 'owner-b' }), /signature_invalid/)
  h.setRow(good); await assert.rejects(h.run({ renderId: 'render-b' }), /signature_invalid/)
  h.setRow(good); await assert.rejects(h.run({ secret: 'wrong-test-key' }), /signature_invalid/)
})
await check('CAS precedes judging; exact context survives; terminal URL waits for next poll', async () => {
  const h = adapters(); await h.seed()
  assert.deepEqual(clone(await h.run()), { status: 'pending' })
  assert.equal(h.calls.judged.length, 1)
  assert.deepEqual(h.calls.judged[0][2], { product: 'filme', engine: 'seedance', asked: initial().context.asked, narration: initial().context.narration, language: 'en' })
  assert.ok(h.calls.transitions.every(t => t.filters.some(([key]) => key === 'metadata->>authority')))
  assert.equal((await h.run()).status, 'passed'); assert.equal(h.calls.judged.length, 1)
  const lost = adapters({ denyCAS: true }); await lost.seed()
  assert.deepEqual(clone(await lost.run()), { status: 'pending' }); assert.equal(lost.calls.judged.length, 0)
})
await check('failed gate withholds URL until real ledger confirms idempotent refund and event', async () => {
  const h = adapters(); await h.seed(); const claim = clone(h.claim)
  const args = { ...h.context, claim: h.claim, reason: 'persistent_pixel_cap' }
  assert.equal(await h.lib.refundFailedFree15Gate(args), null)
  assert.deepEqual(h.calls.refunds, ['cinematic-debit-a']); assert.equal(h.calls.failures.length, 0)
  h.ledger({ amount: 10, refunded_at: '2026-10-26T12:00:00Z' })
  assert.equal(await h.lib.refundFailedFree15Gate(args), 10)
  assert.equal(h.calls.failures[0].name, 'free15_gate_failed')
  assert.equal(h.calls.failures[0].metadata.credits_refunded, 10)
  assert.deepEqual(h.claim, claim, 'settled birth remains bound to this compose; no release')
  assert.equal(await h.lib.refundFailedFree15Gate({ ...args, claim: { ...h.claim, resolutionReference: 'untrusted' } }), null)
})

function functionText(file, name) {
  const code = read(file), ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const found = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name)
  assert.ok(found, 'real named function: ' + name)
  return found.getText(ast).replace(/^export\s+/, '')
}
await check('actual provider poll preserves 13.96 seconds even while legacy display rounds to 14', async () => {
  const code = functionText('lib/compose.ts', 'pollCreatomateRender')
  const poll = vm.runInNewContext(ts.transpileModule('(' + code + ')', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    CREATOMATE_BASE: 'https://fixture.invalid', process: { env: { CREATOMATE_API_KEY: 'offline-fake' } },
    fetch: async () => ({ ok: true, json: async () => ({ status: 'succeeded', url: media.url, duration: 13.96 }) }),
  }, { timeout: 2000 })
  const result = await poll('render-a')
  assert.equal(result.durationSeconds, 14); assert.equal(result.exactDurationSeconds, 13.96)
})
const statusPath = 'app/api/compose/status/[renderId]/route.ts', statusCode = read(statusPath)
const gateStart = statusCode.indexOf('let free15GateFailure:')
const gateEnd = statusCode.indexOf('if (!state.url)', gateStart)
assert.ok(gateStart > 0 && gateEnd > gateStart)
const releaseStart = statusCode.lastIndexOf("if (prepaidCinematicClaim?.status === 'released')", gateStart)
assert.ok(releaseStart > 0 && releaseStart < gateStart)
const gateSlice = statusCode.slice(releaseStart, gateEnd)
const trialClaimReader = createOfflineLoader()('lib/kling4TrialClaim.ts')
async function statusGate(outcome, refund, extra = {}, source = gateSlice) {
  const calls = []
  const ctx = { state: { status: 'succeeded', url: media.url, snapshotUrl: null, durationSeconds: 14, exactDurationSeconds: 13.96 },
    quality: 'cinematic_ai', prepaidCinematicClaim: { response: { duration: 15, fal_model: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', free15_gate_version: 'free15-gate-v1' } },
    cinematicAdmin: {}, cinematicSecret: 'offline', user: { id: 'owner-a' }, renderId: 'render-a',
    NextResponse: { json: body => ({ body }) },
    require: id => {
      if (id === '@/lib/free15Gate') return { FREE15_GATE_VERSION: 'free15-gate-v1' }
      if (id === '@/lib/kling4TrialClaim') return trialClaimReader
      if (id === '@/lib/durationByEngine') return { isSeedanceShortClaim: response => response.duration === 15 && response.fal_model.includes('/seedance/') }
      if (id === '@/lib/free15GateServer') return { runFree15Gate: async args => { calls.push(['gate', args.media]); return outcome }, refundFailedFree15Gate: async () => { calls.push(['refund']); return refund } }
      throw Error('Unexpected dependency ' + id)
    }, ...extra }
  const code = '(async function(){' + source + '\nreturn { state, free15GateFailure };})()'
  const result = await vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, ctx, { timeout: 2000 })
  return { result: clone(result), calls }
}
await check('actual status gate emits no URL for pending/unconfirmed refunds and accepts confirmed delivery', async () => {
  const pending = await statusGate({ status: 'pending' }, null)
  assert.equal(pending.result.body.quality_review, true); assert.doesNotMatch(JSON.stringify(pending.result), /\.mp4/)
  assert.equal(pending.calls[0][1].durationSeconds, 13.96)
  const failed = { status: 'failed', reason: 'persistent_caption_cap', media: { ...media, url: 'https://fixture.invalid/repaired.mp4' } }
  const unconfirmed = await statusGate(failed, null)
  assert.equal(unconfirmed.result.body.reconcile, true); assert.doesNotMatch(JSON.stringify(unconfirmed.result), /\.mp4/)
  const confirmed = await statusGate(failed, 10)
  assert.equal(confirmed.result.free15GateFailure.creditsRefunded, 10); assert.equal(confirmed.result.state.url, failed.media.url)
  const otherEngine = await statusGate({ status: 'pending' }, null, { quality: 'cinematic_s25' })
  assert.equal(otherEngine.calls.length, 0)
  const otherDuration = await statusGate({ status: 'pending' }, null, { prepaidCinematicClaim: { response: { duration: 35 } } })
  assert.equal(otherDuration.calls.length, 0)
  const klingBirth = { response: { duration: 15, quality: 'cinematic_ai', aspect: '9:16', fal_model: 'kling/v4/image-to-video',
    free15_gate_version: 'free15-gate-v1', kling4_trial: { version: 'kling4_trial_2810', engine_used: 'kling4' } }, status: 'settled' }
  const klingPending = await statusGate({ status: 'pending' }, null, { prepaidCinematicClaim: klingBirth })
  assert.equal(klingPending.result.body.quality_review, true, 'signed trial uses the same pre-delivery gate')
  assert.equal(klingPending.calls[0][0], 'gate')
  assert.equal(klingPending.calls[0][1].durationSeconds, 13.96, 'trial output is checked without legacy rounding')
  const invalidTrial = clone(klingBirth); invalidTrial.response.kling4_trial.version = 'unknown'
  const invalid = await statusGate({ status: 'pending' }, null, { prepaidCinematicClaim: invalidTrial })
  assert.equal(invalid.calls.length, 0, 'unrecognized marker cannot enroll an unrelated model')
  const legacyBirth = { response: { duration: 15, fal_model: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video' }, status: 'settled' }
  const historic = await statusGate({ status: 'failed', reason: 'gate_context_missing', media }, 10, { prepaidCinematicClaim: legacyBirth })
  assert.equal(historic.calls.length, 0, 'old signed birth cannot trigger a retroactive refund')
  const released = await statusGate({ status: 'pending' }, null, { prepaidCinematicClaim: { ...legacyBirth, status: 'released', creditCost: 7, response: { ...legacyBirth.response, free15_gate_version: 'free15-gate-v1' } } })
  assert.equal(released.calls.length, 0, 'closed birth cannot buy judging or repair')
  assert.equal(released.result.body.failure_reason, 'cinematic_claim_released')
  const retroactive = gateSlice.replace(' && prepaidCinematicClaim.response.free15_gate_version === FREE15_GATE_VERSION', '')
  assert.notEqual(retroactive, gateSlice)
  const wronglyRefunded = await statusGate({ status: 'failed', reason: 'gate_context_missing', media }, 10, { prepaidCinematicClaim: legacyBirth }, retroactive)
  assert.ok(wronglyRefunded.calls.some(call => call[0] === 'refund'), 'mutant that refunds old films is detected')
})
await check('gate enrollment accepts Seedance15 and signed Kling4 trial, bound by the real birth HMAC', async () => {
  const route = read('app/api/generate-video-cinematic/route.ts')
  const ast = ts.createSourceFile('route.ts', route, ts.ScriptTarget.Latest, true)
  let enrollment
  const visit = node => { if (ts.isSpreadAssignment(node) && node.getText(ast).includes('free15_gate_version:')) enrollment = node.expression.getText(ast); ts.forEachChild(node, visit) }
  visit(ast); assert.ok(enrollment)
  for (const active of [false, true]) {
    const result = vm.runInNewContext(ts.transpileModule('(' + enrollment + ')', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { seedanceShortFilm: active, FREE15_GATE_VERSION: 'free15-gate-v1' })
    assert.deepEqual(clone(result), active ? { free15_gate_version: 'free15-gate-v1' } : {})
  }
  const C = createOfflineLoader()('@/lib/cinematic/claim'), secret = 'offline-key', userId = 'owner-a', generationId = 'generation-gate-hmac-2610'
  const id = C.cinematicClaimId(userId, generationId)
  const response = { generationId, quality: 'cinematic_ai', fal_request_ids: [], fal_models: [], duration: 15, free15_gate_version: 'free15-gate-v1' }
  const metadata = { generation_id: generationId, status: 'done', fingerprint: 'a'.repeat(64), credit_cost: 7, quality: 'cinematic_ai', engine: 'seedance', fal_request_ids: [], fal_models: [], authorized_completed_urls: [], response, response_hash: C.cinematicValueHash(response) }
  metadata.authority = C.signCinematicClaim(secret, { claimId: id, userId, generationId, status: metadata.status, fingerprint: metadata.fingerprint, creditCost: 7, quality: metadata.quality, engine: metadata.engine, falRequestIds: [], falModels: [], authorizedCompletedUrls: [], responseHash: metadata.response_hash })
  const row = { id, user_id: userId, session_id: generationId, path: C.CINEMATIC_CLAIM_PATH, name: C.CINEMATIC_CLAIM_EVENT, metadata }
  assert.equal(C.verifyCinematicClaimRow({ row, secret, userId, generationId }).ok, true)
  const removed = clone(row); delete removed.metadata.response.free15_gate_version
  assert.equal(C.verifyCinematicClaimRow({ row: removed, secret, userId, generationId }).ok, false, 'browser cannot remove gate enrollment')
  const forgedHash = clone(removed); forgedHash.metadata.response_hash = C.cinematicValueHash(forgedHash.metadata.response)
  assert.equal(C.verifyCinematicClaimRow({ row: forgedHash, secret, userId, generationId }).ok, false, 'recomputing a hash is not a server signature')
})
await check('gate precedes status asset persistence/settlement and compose intent/completion', async () => {
  const tail = statusCode.slice(gateStart)
  for (const consumer of ['await settleComposeCreditHoldForRender(', 'await persistRenderAssets(', "final_video_url: responseVideoUrl"]) {
    assert.ok(tail.indexOf(consumer) > tail.indexOf('await runFree15Gate('), 'gate before ' + consumer)
  }
  const compose = read('app/api/compose/route.ts'), start = compose.indexOf('let free15ContextStored = true')
  const seed = compose.indexOf('await storeFree15Gate(', start), intent = compose.indexOf('await recordRenderIntent(', start), complete = compose.indexOf('await completeGenerationClaim(', start)
  assert.ok(start > 0 && seed > start && intent > seed && complete > intent)
  assert.match(compose.slice(start, complete + 2000), /if \(!free15ContextStored \|\|/)
  assert.match(statusCode, /creditsDeducted: free15GateFailure \? false : creditsDeducted/)
  assert.match(statusCode, /free15_gate_failed: true/)
})
await check('browser cannot mint delivery locks or gate failures', async () => {
  const names = ['free15_delivery_gate', 'free15_gate_failed']
  const makeSink = removed => {
    let attempts = 0
    const unsafe = () => { attempts++; throw Error('Must not reach storage/auth') }
    const load = createOfflineLoader({ env: { VERCEL_ENV: 'production' }, mocks: {
      'next/server': { NextResponse: { json: value => value } },
      '@/lib/supabase/server': { createClient: unsafe },
      '@supabase/supabase-js': { createClient: unsafe },
      '@/lib/requestIdentity': { clientIp: unsafe, hashIp: unsafe, isLikelyBot: unsafe },
      '@/lib/growth/businessAdsAttribution': { businessAdsStamp: () => null },
    }, source: (file, text) => removed && file === 'app/api/events/route.ts' ? text.replace(`  '${removed}',\n`, '') : text })
    const api = load('app/api/events/route.ts')
    return { attempts: () => attempts, post: name => api.POST({ nextUrl: { hostname: 'www.usekineo.com' }, headers: { get: () => null }, json: async () => ({ name, metadata: { credits_refunded: 999 } }) }) }
  }
  const sink = makeSink(null)
  for (const name of names) assert.deepEqual(clone(await sink.post(name)), { ok: true, ignored: true, stored: false })
  assert.equal(sink.attempts(), 0, 'forged gate facts never reach storage/auth')
  await sink.post('ordinary_browser_event'); assert.ok(sink.attempts() > 0, 'ordinary browser sink remains active')
  for (const name of names) {
    const mutant = makeSink(name)
    await mutant.post(name)
    assert.ok(mutant.attempts() > 0, 'real removed-protection mutant is detected: ' + name)
  }
})
await check('only an exact signed editor watermark is disclosed to the pixel reviewer', async () => {
  const pixel = createOfflineLoader()('@/lib/regua95/pixelScore')
  const messages = flag => pixel.buildPixelMessages({ product: 'filme', asked: 'A document and a phone', ...(flag === undefined ? {} : { expectedKineoWatermark: flag }) }, [])
  const defaultMessages = clone(messages(undefined))
  assert.deepEqual(clone(messages(false)), defaultMessages, 'default/historical prompt remains byte-identical')
  assert.match(messages(true)[1].content[0].text, /EXPECTED EDITOR OVERLAY/)
  assert.match(messages(true)[1].content[0].text, /INSIDE objects, screens, documents and signs/)
  for (const [element, expected] of [
    [{ type: 'text', track: 9, text: 'usekineo.com/free' }, true],
    [{ type: 'text', track: 5, text: 'usekineo.com/free' }, undefined],
    [{ type: 'text', track: 9, text: 'invented screen text' }, undefined],
  ]) {
    const h = adapters(), state = initial(); state.source.elements.push(element)
    await h.seed(state); await h.run()
    assert.equal(h.calls.judged[0][2].expectedKineoWatermark, expected)
  }
  const changed = adapters({ sourceTransform: (file, text) => file === 'lib/free15GateServer.ts' ? text.replace("el.text === 'usekineo.com/free'", 'true') : text })
  const state = initial(); state.source.elements.push({ type: 'text', track: 9, text: 'invented screen text' })
  await changed.seed(state); await changed.run()
  assert.notEqual(changed.calls.judged[0][2].expectedKineoWatermark, undefined, 'mutant that exempts arbitrary text is detected')
  const noDisclosure = createOfflineLoader({ source: (file, text) => file === 'lib/regua95/pixelScore.ts' ? text.replace("ctx.expectedKineoWatermark === true", 'false') : text })('@/lib/regua95/pixelScore')
  assert.doesNotMatch(noDisclosure.buildPixelMessages({ product: 'filme', asked: '', expectedKineoWatermark: true }, [])[1].content[0].text, /EXPECTED EDITOR OVERLAY/, 'mutant that loses the measured watermark cause is detected')
})
console.log(JSON.stringify({ status: 'PASS', checks, adapters: 'real', statusSlice: 'real', paidRenders: 0, realRefunds: 0, environmentFiles: 0, network: 0 }))
