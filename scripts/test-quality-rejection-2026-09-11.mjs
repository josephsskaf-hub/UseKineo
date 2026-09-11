// Offline: real quality helper + real claim verification/CAS/release. Fake DB and
// idempotent refund boundary only. No credentials, env files, network or writes.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
let checks = 0
const eq = (a, b, label) => { assert.deepEqual(a, b, label); checks++ }
const ok = (value, label) => { assert.ok(value, label); checks++ }
const clone = value => JSON.parse(JSON.stringify(value))
const forbidden = () => { throw Error('Network/provider/real DB forbidden') }

function runtime(options = {}) {
  const state = { options, events: [], debit: null, legacy: null, operations: [], refundCalls: 0, creditsReturned: 0, composeReads: 0 }
  const cache = new Map()
  function load(relative) {
    const file = path.resolve(root, relative)
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 1, target: 9 } }).outputText
    vm.runInNewContext(code, {
      module, exports: module.exports, Buffer, URL,
      process: { env: {} }, fetch: forbidden, console: { log: forbidden, warn: forbidden, error: forbidden },
      require(id) {
        if (id === 'node:crypto') return nativeRequire(id)
        if (id === '@/lib/credits/refund') return { refundRenderCredits: async billing => {
          state.operations.push('refund'); state.refundCalls++
          eq(billing, state.billing, 'Refund key derived from signed generation, not client data')
          if (options.refund === 'throw') throw Error('RAW_SECRET_BODY')
          if (options.refund === 'fail') return 0
          if (options.refund === 'amount_only') return 45
          if (!state.debit.refunded_at) { state.debit.refunded_at = '2026-09-11T12:00:00Z'; state.creditsReturned += state.debit.amount }
          if (options.refund === 'lost_response') throw Error('RAW_SECRET_BODY')
          return 45
        } }
        if (id.startsWith('@/')) return load(`${id.slice(2)}.ts`)
        throw Error('Unexpected import ' + id)
      },
    }, { filename: relative })
    return module.exports
  }
  const claims = load('lib/cinematic/claim.ts'), compose = load('lib/composeClaim.ts')
  const secret = 'offline-fixture-signature', userId = 'fixture-user', generationId = 'fixture-generation-111'
  const claimId = claims.cinematicClaimId(userId, generationId)
  state.billing = `cinematic-${claimId}`
  const quality = 'h3', cost = 45
  const response = { generationId, quality, fal_request_ids: ['request-fixture'], fal_models: ['fal-ai/fixture'], scene_seconds: [10] }
  const authority = {
    claimId, userId, generationId, status: 'settled', fingerprint: 'a'.repeat(64), creditCost: cost,
    quality, engine: 'fal-ai/fixture', falRequestIds: response.fal_request_ids, falModels: response.fal_models,
    authorizedCompletedUrls: ['https://fixture.invalid/video.mp4'], responseHash: claims.cinematicValueHash(response),
    resolutionReason: 'provider_submitted', resolutionReference: state.billing,
  }
  state.birth = {
    id: claimId, name: claims.CINEMATIC_CLAIM_EVENT, path: claims.CINEMATIC_CLAIM_PATH, user_id: userId, session_id: generationId,
    metadata: {
      generation_id: generationId, status: authority.status, fingerprint: authority.fingerprint, credit_cost: cost, quality, engine: authority.engine,
      fal_request_ids: authority.falRequestIds, fal_models: authority.falModels, authorized_completed_urls: authority.authorizedCompletedUrls,
      response, response_hash: authority.responseHash, resolution_reason: authority.resolutionReason, resolution_reference: state.billing,
      authority: claims.signCinematicClaim(secret, authority),
    },
  }
  const mutexId = compose.composeClaimId(userId, generationId)
  state.mutex = {
    id: mutexId, name: compose.COMPOSE_CLAIM_EVENT, path: compose.COMPOSE_CLAIM_PATH, user_id: userId, session_id: generationId,
    metadata: { generation_id: generationId, status: 'pending', quality, cost,
      authority: compose.signComposeClaim(secret, { claimId: mutexId, userId, generationId, status: 'pending', quality, cost }),
    },
  }
  state.events.push(state.birth, state.mutex)
  state.debit = { render_id: state.billing, user_id: userId, kind: 'video', amount: cost, refunded_at: null }
  const db = { from(table) {
    let update, filters = []
    const field = (row, column) => column.includes('->>') ? row[column.split('->>')[0]]?.[column.split('->>')[1]] : row[column]
    const query = {
      select() { return query },
      eq(key, value) { filters.push(row => field(row, key) === value); return query },
      is(key, value) { filters.push(row => value === null ? field(row, key) == null : field(row, key) === value); return query },
      update(value) { update = value; return query },
      delete: forbidden,
      async maybeSingle() {
        let rows = table === 'events' ? state.events : table === 'credit_debits' ? [state.debit].filter(Boolean) : table === 'broll_metrics' ? [state.legacy].filter(Boolean) : forbidden()
        let matches = rows.filter(row => filters.every(filter => filter(row)))
        if (matches.length > 1) return { data: null, error: { message: 'multiple' } }
        const row = matches[0]
        const category = table === 'credit_debits' ? 'debit' : table === 'broll_metrics' ? 'legacy' : row === state.birth ? 'birth' : 'compose'
        state.operations.push((update ? 'write:' : 'read:') + category)
        if (category === 'compose' && !update) {
          state.composeReads++
          if (options.changeBeforeRefund && state.composeReads === 2) state.mutex.metadata.render_id = 'existing-final-render'
          if (options.changeAfterRefund && state.refundCalls) state.mutex.metadata.render_id = 'existing-final-render'
        }
        if (options.failRead === category && !update) return { data: null, error: { message: 'RAW_SECRET_BODY' } }
        if (update && category === 'birth' && options.releaseFail) return { data: null, error: { message: 'RAW_SECRET_BODY' } }
        if (update && category === 'birth' && options.releaseConflict) return { data: null, error: null }
        if (update && category === 'compose' && options.intentFail) return { data: null, error: { message: 'RAW_SECRET_BODY' } }
        if (update && category === 'compose' && update.metadata?.quality_rejection?.phase === 'resolved' && options.markerFail) return { data: null, error: { message: 'RAW_SECRET_BODY' } }
        if (update && category === 'compose' && update.metadata?.quality_rejection?.phase === 'resolved' && options.markerConflict) return { data: null, error: null }
        if (row && update) Object.assign(row, clone(update))
        return { data: row ? clone(row) : null, error: null }
      },
    }
    return query
  } }
  const input = { db, secret, userId, generationId, ownsComposeClaim: true, composeProviderAttempted: false, reason: 'cinematic_timeline_too_short' }
  const helper = load('lib/cinematic/qualityRejection.ts')
  return { state, input, helper, claims, compose }
}

const happy = runtime()
const initial = await happy.helper.rejectCinematicQuality(happy.input)
eq(initial.outcome, 'quality_rejected_refunded', 'Terminal refund resolved')
eq(initial.refundConfirmed, true, 'Refund confirmed from ledger')
eq(initial.claimReleased, true, 'Signed birth released')
eq(initial.retryable, false, 'Same deterministic attempt never automatically retried')
eq(happy.state.mutex.metadata.status, 'pending', 'Unique compose mutex retained, not deleted')
eq(happy.state.mutex.metadata.quality_rejection.reason, happy.input.reason, 'Quality class recorded separately from compatible release reason')
eq(happy.state.birth.metadata.resolution_reason, 'provider_failed_refunded', 'Existing allowed financial release vocabulary')
eq(happy.state.creditsReturned, 45, 'Only authoritative debit refunded')
const ops = happy.state.operations
ok(ops.indexOf('write:compose') < ops.indexOf('refund') && ops.indexOf('refund') < ops.indexOf('write:birth') && ops.indexOf('write:birth') < ops.lastIndexOf('write:compose'), 'Signed intent before refund before signed release before terminal annotation')
const replay = await happy.helper.readVerifiedQualityRejection(happy.input)
eq(replay?.outcome, 'quality_rejected_refunded', 'Read-only replay re-verifies ledger and released birth')
eq(happy.state.refundCalls, 1, 'Replay has zero refund calls')
await happy.helper.rejectCinematicQuality(happy.input)
eq(happy.state.refundCalls, 1, 'Already-refunded invocation does not refund again')
eq(happy.state.creditsReturned, 45, 'Duplicate terminal resolution cannot double refund')
ok(!JSON.stringify(initial).includes('fixture-user') && !JSON.stringify(initial).includes(happy.state.billing), 'Response contains no raw identity or ledger key')

for (const [label, patch] of [
  ['not owner', { ownsComposeClaim: false }], ['provider attempted', { composeProviderAttempted: true }],
  ['unknown provider boundary', { composeProviderAttempted: undefined }], ['wrong generation', { generationId: 'different-generation' }],
  ['wrong user', { userId: 'foreign-user' }], ['no signature key', { secret: '' }], ['invalid reason', { reason: 'RAW_SECRET_BODY' }],
]) {
  const r = runtime(); const result = await r.helper.rejectCinematicQuality({ ...r.input, ...patch })
  eq(result.outcome, 'quality_rejection_support_pending', label + ': fail closed')
  eq(result.refunded, false, label + ': no false refund')
  eq(r.state.refundCalls, 0, label + ': no money mutation')
}
for (const [label, mutate] of [
  ['invalid compose HMAC', r => { r.state.mutex.metadata.authority = 'b'.repeat(64) }],
  ['render already possible', r => { r.state.mutex.metadata.render_id = 'final-render' }],
  ['done compose', r => { r.state.mutex.metadata.status = 'done' }],
  ['wrong mutex generation', r => { r.state.mutex.metadata.generation_id = 'different-generation' }],
  ['invalid birth HMAC', r => { r.state.birth.metadata.authority = 'b'.repeat(64) }],
  ['wrong debit owner', r => { r.state.debit.user_id = 'foreign-user' }],
  ['missing debit', r => { r.state.debit = null }],
  ['wrong debit amount', r => { r.state.debit.amount = 999 }],
  ['wrong debit kind', r => { r.state.debit.kind = 'avatar' }],
  ['past render', r => { r.state.legacy = { user_id: r.input.userId, generation_id: r.input.generationId, render_id: 'past-render' } }],
]) {
  const r = runtime(); mutate(r); const result = await r.helper.rejectCinematicQuality(r.input)
  eq(result.outcome, 'quality_rejection_support_pending', label + ': no refund permission')
  eq(result.refunded, false, label + ': financial truth')
  eq(r.state.refundCalls, 0, label + ': zero refund call')
}
for (const failRead of ['birth', 'compose', 'debit', 'legacy']) {
  const r = runtime({ failRead }); const result = await r.helper.rejectCinematicQuality(r.input)
  eq(result.refunded, false, failRead + ': failed read not treated as absence')
  eq(r.state.refundCalls, 0, failRead + ': no refund on unavailable evidence')
}
for (const refund of ['fail', 'throw', 'amount_only']) {
  const r = runtime({ refund }); const result = await r.helper.rejectCinematicQuality(r.input)
  eq(result.refunded, false, refund + ': ledger confirmation required, RPC amount insufficient')
  eq(r.state.birth.metadata.status, 'settled', refund + ': original debit claim retained')
  eq(r.state.mutex.metadata.status, 'pending', refund + ': mutex retained')
  eq(result.retryable, false, refund + ': no retry invitation')
  ok(!JSON.stringify(result).includes('RAW_SECRET_BODY'), refund + ': safe error class')
  const replay = await r.helper.readVerifiedQualityRejection(r.input)
  eq(replay?.outcome, 'quality_rejection_support_pending', refund + ': reload is terminal support, not pending render')
  eq(replay?.refundConfirmed, false, refund + ': intent never substitutes financial proof')
  eq(replay?.retryable, false, refund + ': reload never auto-submits the rejected attempt')
}
const lost = runtime({ refund: 'lost_response' })
eq((await lost.helper.rejectCinematicQuality(lost.input)).outcome, 'quality_rejected_refunded', 'Lost RPC response reconciles by authoritative ledger')
for (const option of ['releaseFail', 'releaseConflict', 'markerFail', 'markerConflict']) {
  const r = runtime({ [option]: true }); const result = await r.helper.rejectCinematicQuality(r.input)
  eq(result.outcome, 'quality_rejection_support_pending', option + ': partial resolution not success')
  eq(result.refunded, true, option + ': confirmed money returned remains true')
  eq(result.claimReleased, option.startsWith('marker'), option + ': release truth not inferred')
  eq(r.state.events.length, 2, option + ': never delete mutex or birth')
  eq(result.retryable, false, option + ': no duplicate final render attempt')
  const replay = await r.helper.readVerifiedQualityRejection(r.input)
  eq(replay?.outcome, option.startsWith('marker') ? 'quality_rejected_refunded' : 'quality_rejection_support_pending', option + ': persisted intent reconciles actual ledger/release on reload')
  eq(replay?.refundConfirmed, true, option + ': reload preserves confirmed ledger fact')
}
const failedIntent = runtime({ intentFail: true })
eq((await failedIntent.helper.rejectCinematicQuality(failedIntent.input)).supportReason, 'rejection_intent_unconfirmed', 'Intent must be durable before money')
eq(failedIntent.state.refundCalls, 0, 'Failed intent persistence performs no refund')
eq(await failedIntent.helper.readVerifiedQualityRejection(failedIntent.input), null, 'Ordinary pending mutex not mislabeled quality rejection')
const forgedFacts = runtime({ refund: 'fail' })
await forgedFacts.helper.rejectCinematicQuality(forgedFacts.input)
Object.assign(forgedFacts.state.mutex.metadata.quality_rejection, { phase: 'resolved', refund_confirmed: true, birth_released: true })
eq((await forgedFacts.helper.readVerifiedQualityRejection(forgedFacts.input))?.refundConfirmed, false, 'Mutable confirmed flags cannot invent a ledger refund')
forgedFacts.state.mutex.metadata.quality_rejection.intent_authority = 'b'.repeat(64)
eq(await forgedFacts.helper.readVerifiedQualityRejection(forgedFacts.input), null, 'Forged quality intent cannot stop an unrelated render')
const before = runtime({ changeBeforeRefund: true })
eq((await before.helper.rejectCinematicQuality(before.input)).supportReason, 'compose_changed_before_refund', 'Changed mutex rechecked before refund')
eq(before.state.refundCalls, 0, 'Concurrent possible final render stops money mutation')
const after = runtime({ changeAfterRefund: true })
const changed = await after.helper.rejectCinematicQuality(after.input)
eq(changed.supportReason, 'compose_changed_after_refund', 'Post-confirmation conflict stays explicit')
eq(changed.refunded, true, 'Already confirmed financial outcome not hidden by later conflict')
eq(changed.claimReleased, false, 'No signed release through conflicting compose state')

for (const tamper of ['marker', 'signature', 'birth', 'ledger', 'render']) {
  const r = runtime(); await r.helper.rejectCinematicQuality(r.input)
  if (tamper === 'marker') r.state.mutex.metadata.quality_rejection.reason = 'made_up'
  if (tamper === 'signature') r.state.mutex.metadata.authority = 'b'.repeat(64)
  if (tamper === 'birth') r.state.birth.metadata.status = 'settled'
  if (tamper === 'ledger') r.state.debit.refunded_at = null
  if (tamper === 'render') r.state.mutex.metadata.render_id = 'final-render'
  const replay = await r.helper.readVerifiedQualityRejection(r.input)
  if (tamper === 'birth' || tamper === 'ledger') {
    eq(replay?.outcome, 'quality_rejection_support_pending', tamper + ': valid intent survives missing financial proof')
    eq(replay?.refundConfirmed, false, tamper + ': JSON alone cannot prove financial resolution')
  } else eq(replay, null, tamper + ': altered intent or mutex never becomes authoritative')
}
for (const reason of ['scene_speech_exceeds_footage', 'cinematic_scene_metadata_invalid', 'cinematic_timeline_too_long', 'native_dialogue_unverified', 'scene_narration_missing', 'scene_narration_failed']) {
  const r = runtime(); const result = await r.helper.rejectCinematicQuality({ ...r.input, reason })
  eq(result.outcome, 'quality_rejected_refunded', reason + ': exact reason supported')
  eq((await r.helper.readVerifiedQualityRejection(r.input))?.reason, reason, reason + ': verified terminal replay')
}
// Defensive duplicate invocation: real release uses a compare-and-swap and the
// refund boundary models the existing atomic/idempotent RPC, not two balances.
const concurrent = runtime()
const resolutions = await Promise.all([
  concurrent.helper.rejectCinematicQuality(concurrent.input),
  concurrent.helper.rejectCinematicQuality(concurrent.input),
])
eq(concurrent.state.creditsReturned, 45, 'Concurrent duplicate resolution cannot return credits twice')
eq(concurrent.state.events.length, 2, 'Concurrent resolution preserves both authority records')
ok(resolutions.every(r => r.retryable === false), 'No concurrent caller invites another render')
ok(resolutions.every(r => !r.claimReleased || r.refundConfirmed), 'Every released claim has confirmed financial predecessor')
eq((await concurrent.helper.readVerifiedQualityRejection(concurrent.input))?.refundConfirmed, true, 'Terminal replay converges after concurrent resolution')
console.log(`${checks} quality-rejection checks passed; real claim HMAC/release, fake DB/refund only; zero external calls.`)
