// Offline execution of REAL claim HMAC/CAS helpers and REAL poll GET. No network,
// environment files, database, provider submit, TTS, or financial RPC available.
import fs from 'node:fs'
import vm from 'node:vm'
import crypto from 'node:crypto'
import ts from 'typescript'
import assert from 'node:assert/strict'

let checks = 0
const eq = (a, b, label) => { assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), label); checks++ }
const ok = (value, label) => { assert.ok(value, label); checks++ }
const clone = value => JSON.parse(JSON.stringify(value))
function load(file, imports, extras = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, { exports, Buffer, URL, Date, Error, ...extras,
    require: name => { if (!(name in imports)) throw Error(`Unexpected import: ${name}`); return imports[name] },
  }, { timeout: 5000 })
  return exports
}
const compose = load('lib/composeClaim.ts', { 'node:crypto': crypto })
const claimLib = load('lib/cinematic/claim.ts', { 'node:crypto': crypto, '@/lib/composeClaim': compose })
const secret = 'offline-test-signing-only'
const userId = 'test-owner'
const generationId = 'test-terminal-generation-20260911'
const model = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const ids = ['job-a', 'job-b', null]
const identity = { secret, userId, generationId }

function signRow(row) {
  const m = row.metadata
  m.response_hash = claimLib.cinematicValueHash(m.response)
  m.authority = claimLib.signCinematicClaim(secret, {
    claimId: row.id, userId, generationId, status: m.status, fingerprint: m.fingerprint,
    creditCost: m.credit_cost, quality: m.quality, engine: m.engine,
    falRequestIds: m.fal_request_ids, falModels: m.fal_models,
    authorizedCompletedUrls: m.authorized_completed_urls, responseHash: m.response_hash,
    resolutionReason: m.resolution_reason, resolutionReference: m.resolution_reference,
  })
  return row
}
function fixture({ requestIds = ids, urls, failures } = {}) {
  return signRow({
    id: claimLib.cinematicClaimId(userId, generationId), name: claimLib.CINEMATIC_CLAIM_EVENT,
    user_id: userId, path: claimLib.CINEMATIC_CLAIM_PATH, session_id: generationId,
    created_at: '2026-09-11T10:00:00.000Z',
    metadata: {
      generation_id: generationId, status: 'settled', fingerprint: 'a'.repeat(64), credit_cost: 50,
      quality: 'cinematic_h3', engine: 'cinematic_h3', fal_request_ids: requestIds,
      fal_models: requestIds.map(() => model), authorized_completed_urls: urls ?? requestIds.map(() => null),
      resolution_reason: 'upfront_debit', resolution_reference: `cinematic-${claimLib.cinematicClaimId(userId, generationId)}`,
      response: { generationId, quality: 'cinematic_h3', fal_request_ids: requestIds, fal_models: requestIds.map(() => model), submission_uncertain: false,
        ...(failures === undefined ? {} : { terminal_failed_jobs: failures }) },
    },
  })
}
function database(row = fixture()) {
  const state = { row: clone(row), writes: 0, failWrite: false, beforeUpdate: null }
  state.db = { from(table) {
    assert.equal(table, 'events', 'Only in-memory events are available')
    const filters = []
    let update
    const q = {
      select() { return q }, eq(key, value) { filters.push([key, value]); return q },
      update(value) { update = value; return q },
      async maybeSingle() {
        if (update && state.beforeUpdate) { const hook = state.beforeUpdate; state.beforeUpdate = null; await hook() }
        if (update && state.failWrite) return { data: null, error: { message: 'offline write unavailable' } }
        const matches = state.row && filters.every(([key, value]) =>
          (key.startsWith('metadata->>') ? state.row.metadata[key.slice(11)] : state.row[key]) === value)
        if (!matches) return { data: null, error: null }
        if (update) { state.row = { ...state.row, ...clone(update) }; state.writes++ }
        return { data: clone(state.row), error: null }
      },
    }
    return q
  } }
  return state
}
async function verified(state) {
  const result = await claimLib.loadVerifiedCinematicClaim({ ...identity, db: state.db })
  ok(result.ok && result.claim, 'Real verifier accepts owned signed state')
  return result.claim
}
const proof = requestId => ({ requestId, model })
const isTerminal = state => claimLib.cinematicJobsAreTerminal(state)

const partial = database(fixture({ urls: ['https://video.invalid/a.mp4', null, null] }))
eq(isTerminal(await verified(partial)), false, 'Partial URL authorization does not imply completion')
const unsigned = clone(partial.row)
unsigned.metadata.response.terminal_failed_jobs = [proof('job-b')]
eq(claimLib.verifyCinematicClaimRow({ ...identity, row: unsigned }).ok, false, 'Mutable JSON cannot forge terminal authority')
for (const failures of [[proof('foreign-job')], [{ requestId: 'job-b', model: 'foreign/model' }], [proof('job-b'), proof('job-b')], null]) {
  const bad = fixture({ failures })
  eq(claimLib.verifyCinematicClaimRow({ ...identity, row: bad }).ok, false, 'Even signed invalid proof cannot bind wrong/duplicate jobs')
}
for (const failed of [[proof('foreign-job')], [{ requestId: 'job-b', model: 'foreign/model' }], [proof('job-b'), proof('job-b')]]) {
  const result = await claimLib.authorizeCinematicTerminalFailures({ ...identity, db: partial.db, failed })
  eq(result.ok, false, 'Writer rejects mismatched or duplicate provider proof')
  eq(partial.writes, 0, 'Rejected proof never mutates authority')
}
const before = clone(partial.row)
const bound = await claimLib.authorizeCinematicTerminalFailures({ ...identity, db: partial.db, failed: [proof('job-b')] })
ok(bound.ok, 'Real CAS persists proven failed job')
ok(bound.claim.authority !== before.metadata.authority, 'Proof changes HMAC')
ok(bound.claim.responseHash !== before.metadata.response_hash, 'Proof changes response hash')
eq(isTerminal(await verified(partial)), true, 'Ready URL + bound failure + never-submitted slot are all terminal')
for (const submissionUncertain of [undefined, null, true, 'false', 0]) {
  const legacy = clone(partial.row)
  if (submissionUncertain === undefined) delete legacy.metadata.response.submission_uncertain
  else legacy.metadata.response.submission_uncertain = submissionUncertain
  const ambiguous = database(signRow(legacy))
  eq(isTerminal(await verified(ambiguous)), false, 'Null receipt without explicit signed no-ambiguity proof remains unresolved')
}
const writesBeforeReplay = partial.writes
eq((await claimLib.authorizeCinematicTerminalFailures({ ...identity, db: partial.db, failed: [proof('job-b')] })).ok, true, 'Proof write replays idempotently')
eq(partial.writes, writesBeforeReplay, 'Replay performs no duplicate mutation')
eq((await claimLib.authorizeCinematicTerminalFailures({ ...identity, userId: 'wrong-owner', db: partial.db, failed: [proof('job-b')] })).ok, false, 'Cross-owner mutation denied')

const retargeted = await claimLib.retargetCinematicRequestId({ ...identity, db: partial.db, index: 1,
  oldRequestId: 'job-b', newRequestId: 'job-b-new', model })
ok(retargeted.ok, 'Actual retarget helper accepts a replacement')
eq(isTerminal(await verified(partial)), false, 'Replacement does not inherit old terminal proof')
eq(partial.row.metadata.response.terminal_failed_jobs, [], 'Retarget removes obsolete proof')
eq((await claimLib.authorizeCinematicTerminalFailures({ ...identity, db: partial.db, failed: [proof('job-b')] })).ok, false, 'Late old-ID poll cannot terminate replacement')
const writeFailed = database()
writeFailed.failWrite = true
eq((await claimLib.authorizeCinematicTerminalFailures({ ...identity, db: writeFailed.db, failed: [proof('job-b')] })).ok, false, 'Failed storage yields no durable terminal authority')
eq(isTerminal(await verified(writeFailed)), false, 'Failed storage preserves unresolved state')
const racing = database()
racing.beforeUpdate = async () => {
  const next = clone(racing.row)
  next.metadata.fal_request_ids[1] = 'concurrent-replacement'
  next.metadata.response.fal_request_ids[1] = 'concurrent-replacement'
  racing.row = signRow(next)
}
const race = await claimLib.authorizeCinematicTerminalFailures({ ...identity, db: racing.db, failed: [proof('job-b')] })
eq([race.ok, race.conflict], [false, true], 'Existing HMAC CAS rejects stale proof after concurrent retarget')
eq(racing.writes, 0, 'Lost CAS does not overwrite concurrent replacement')
eq(isTerminal(await verified(racing)), false, 'Concurrent replacement remains unresolved')

async function poll({ state = database(), status = 'IN_PROGRESS', mismatched = false, queueError,
  errorStage, http = 403, emptyResult = false, badResultUrl = false } = {}) {
  const calls = [], logs = []
  let refunds = 0, releases = 0
  const fail = () => { const e = new Error('SENTINEL unprocessable entity private-job https://signed.invalid');
    e.status = http; e.body = { detail: 'User is locked SENTINEL' }; throw e }
  const imports = {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: userId } } }) } }) },
    '@supabase/supabase-js': { createClient: () => state.db },
    '@fal-ai/client': { fal: { config() {}, queue: {
      async status(_model, { requestId }) {
        calls.push(['status', requestId])
        if (requestId === 'job-b' && errorStage === 'status') fail()
        return { status: requestId === 'job-b' ? status : 'COMPLETED',
          request_id: requestId === 'job-b' && mismatched ? 'another-job' : requestId,
          ...(requestId === 'job-b' ? { error: queueError } : {}) }
      },
      async result(_model, { requestId }) {
        calls.push(['result', requestId])
        if (requestId === 'job-b' && errorStage === 'result') fail()
        if (requestId === 'job-b' && emptyResult) return { data: {} }
        return { data: { video: { url: badResultUrl ? 'http://not-https.invalid' : `https://video.invalid/${requestId}.mp4` } } }
      },
    } } },
    '@/lib/cinematic/claim': { ...claimLib,
      releaseCinematicClaim: async args => { releases++; return claimLib.releaseCinematicClaim(args) },
    },
    '@/lib/credits/refund': { refundRenderCredits: async () => { refunds++; return 50 } },
  }
  const route = load('app/api/cinematic-clip-status/route.ts', imports, {
    process: { env: { FAL_KEY: 'offline-test-only', NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: secret } },
    console: { warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
  })
  const reply = await route.GET({ nextUrl: new URL(`https://offline.invalid/?generationId=${generationId}&ids=${encodeURIComponent(JSON.stringify(state.row.metadata.fal_request_ids))}`) })
  ok(!/SENTINEL|private-job|https:\/\/signed/.test(JSON.stringify(logs)), 'Poll diagnostics never expose provider content')
  return { reply, state, calls, refunds, releases }
}
for (const status of ['IN_QUEUE', 'IN_PROGRESS', 'UNKNOWN']) {
  const result = await poll({ status })
  eq(result.reply.body.allDone, false, 'Real poll keeps nonterminal queue unresolved')
  eq(isTerminal(await verified(result.state)), false, 'Partial successful URLs never terminate pending sibling')
  eq([result.refunds, result.releases], [0, 0], 'No money change for pending sibling')
}
for (const errorStage of ['status', 'result']) {
  for (const http of [400, 422, 403, 404, 429, 500, undefined]) {
    const result = await poll({ status: 'COMPLETED', errorStage, http })
    const terminal = errorStage === 'result' && [400, 422].includes(http)
    eq(result.reply.body.allDone, terminal, 'Only matching completed application-result400/422 can terminate')
    eq(isTerminal(await verified(result.state)), terminal, 'Response completion agrees with real persisted HMAC proof')
    eq([result.refunds, result.releases], [0, 0], 'Surviving completed clip is never auto-refunded by poll')
  }
}
for (const status of ['COMPLETED', 'FAILED']) {
  for (const mismatched of [false, true]) {
    const result = await poll({ status, mismatched, queueError: 'SENTINEL job execution failed' })
    eq(result.reply.body.allDone, !mismatched, 'Terminal failure requires matching request ID')
    eq(isTerminal(await verified(result.state)), !mismatched, 'Terminal status is stored only for the matching job')
    eq(result.calls.filter(([kind, id]) => kind === 'result' && id === 'job-b').length, 0, 'No result lookup for proven failure or mismatched job')
  }
}
const empty = await poll({ status: 'COMPLETED', emptyResult: true })
eq(empty.reply.body.allDone, false, 'Empty completed result is unknown, not a terminal error')
const badUrl = await poll({ status: 'COMPLETED', badResultUrl: true })
eq(badUrl.reply.status, 503, 'Invalid completed URL cannot leave server as authorized footage')
eq([badUrl.refunds, badUrl.releases], [0, 0], 'Malformed result never refunds')
const allGood = await poll({ status: 'COMPLETED' })
eq(allGood.reply.body.allDone, true, 'All valid completed results unlock composition')
eq(isTerminal(await verified(allGood.state)), true, 'All completed URL bindings suffice without failure marker')
const failedPersistence = database(fixture({ urls: ['https://video.invalid/a.mp4', null, null] }))
failedPersistence.failWrite = true
const failedPoll = await poll({ state: failedPersistence, status: 'FAILED' })
eq(failedPoll.reply.status, 503, 'Failed proof persistence cannot announce allDone')
eq([failedPoll.refunds, failedPoll.releases], [0, 0], 'Failed proof persistence cannot authorize refund')
const allFailed = await poll({ state: database(fixture({ requestIds: ['job-b'] })), status: 'FAILED' })
eq(allFailed.reply.status, 502, 'All-failed existing response remains terminal')
eq([allFailed.refunds, allFailed.releases], [1, 1], 'Refund follows persisted terminal proof')
eq(allFailed.state.row.metadata.status, 'released', 'Real release HMAC closes fully failed generation')
const allFailedStorage = database(fixture({ requestIds: ['job-b'] }))
allFailedStorage.failWrite = true
const unconfirmed = await poll({ state: allFailedStorage, status: 'FAILED' })
eq(unconfirmed.reply.status, 503, 'All-failed write error is not financial proof')
eq([unconfirmed.refunds, unconfirmed.releases], [0, 0], 'All-failed write error preserves debit')
const stored = database(fixture({ urls: ['https://video.invalid/a.mp4', null, null], failures: [proof('job-b')] }))
const replay = await poll({ state: stored, errorStage: 'status', http: 403 })
eq(replay.reply.body.allDone, true, 'Verified durable evidence survives unavailable provider status')
eq(replay.calls, [], 'Already terminal jobs require no further provider lookups')
console.log(`cinematic-terminal-proof: ${checks} passed; actual claim HMAC/CAS and route GET; no external calls`)
