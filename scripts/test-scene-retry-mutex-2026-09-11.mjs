// Actual retry POST, Fal single-submit helper, HMAC claim/retarget helpers and
// active GET. Synthetic in-memory database with unique PK + real CAS filters.
// No SDK/network/database credentials, providers or refunds are available.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let checks = 0
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const eq = (actual, expected, label) => { assert.deepEqual(clone(actual), expected, label); checks++ }
const ok = (actual, label) => { assert.ok(actual, label); checks++ }
const blocked = () => { throw Error('Forbidden real service/refund') }
const modelH3 = 'minimax/h3/text-to-video', modelI2V = 'minimax/h3/image-to-video'
const modelKling = 'fal-ai/kling-video/v3/pro/text-to-video', modelOmni = 'google/gemini-omni-flash/image-to-video'

function fixture(options = {}) {
  const secret = 'offline-signing-fixture', userId = 'fixture-owner', generationId = 'scene-generation-111'
  const events = [], operations = [], posts = [], openaiPosts = [], logs = []
  let clockNow = Date.now()
  let birth, claims, compose, route, updateBirth, birthReads = 0, hookInsert = options.afterInsert
  const field = (row, key) => key.split(/->>?/).reduce((value, part) => value?.[part], row)
  const db = { from(table) {
    if (!['events', 'videos', 'credit_debits'].includes(table)) throw Error('Unexpected table ' + table)
    let action = 'select', value, single = false, limit, order
    const filters = [], predicates = []
    const query = {
      select() { return query },
      eq(key, expected) { filters.push([key, expected]); predicates.push(row => field(row, key) === expected); return query },
      is(key, expected) { filters.push([key, expected]); predicates.push(row => (field(row, key) ?? null) === expected); return query },
      gte(key, expected) { predicates.push(row => field(row, key) >= expected); return query },
      in(key, expected) { predicates.push(row => expected.includes(field(row, key))); return query },
      limit(count) { limit = count; return query },
      order(key, { ascending }) { order = { key, ascending }; return query },
      maybeSingle() { single = true; return query },
      insert(row) { action = 'insert'; value = row; return query },
      update(row) { action = 'update'; value = row; return query },
      delete() { action = 'delete'; return query },
      then(resolve, reject) { return Promise.resolve().then(async () => {
        operations.push({ action, table, filters: clone(filters) })
        if (table !== 'events' && action !== 'select') blocked()
        let rows = table === 'events' ? events.filter(row => predicates.every(test => test(row))) : []
        if (action === 'insert') {
          if (events.some(row => row.id === value.id)) return { data: null, error: { code: '23505' } }
          if (options.insertError) return { data: null, error: { code: 'transient' } }
          const row = clone({ ...value, created_at: new Date().toISOString() })
          events.push(row)
          if (hookInsert) { const run = hookInsert; hookInsert = null; await run(api, row) }
          if (options.insertUncertain) return { data: null, error: { code: 'transient' } }
          return { data: null, error: null }
        }
        if (action === 'select' && rows.includes(birth) && filters.some(([key]) => key === 'id')) {
          birthReads++
          if (options.birthReadErrorAt === birthReads) return { data: null, error: { message: 'SENTINEL_SECRET' } }
        }
        if (action === 'update') {
          if (rows.includes(birth) && options.retargetThrows) throw Error('SENTINEL_SECRET')
          if (rows.includes(birth) && options.retargetFails) return { data: null, error: { message: 'SENTINEL_SECRET' } }
          if (options.markerFails && !rows.includes(birth)) return { data: null, error: { message: 'SENTINEL_SECRET' } }
          for (const row of rows) Object.assign(row, clone(value))
          if (rows.includes(birth) && options.retargetUncertain) return { data: null, error: { message: 'SENTINEL_SECRET' } }
        }
        if (action === 'delete') {
          if (options.deleteFails) return { data: null, error: { message: 'SENTINEL_SECRET' } }
          for (const row of rows) events.splice(events.indexOf(row), 1)
        }
        if (order) rows = [...rows].sort((a, b) => String(a[order.key]).localeCompare(String(b[order.key])) * (order.ascending ? 1 : -1))
        if (limit) rows = rows.slice(0, limit)
        return { data: clone(single ? rows[0] ?? null : rows), error: null }
      }).then(resolve, reject) },
    }
    return query
  } }
  const load = createOfflineLoader({
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: secret, FAL_KEY: options.noKey ? '' : 'synthetic-key' },
    mocks: {
      'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: userId } } }) } }) },
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/credits/refund': { refundRenderCredits: blocked },
      '@/lib/hollywood/router': {
        HOLLYWOOD_MODELS: { dialogue: modelKling, cinematic: modelKling, support: modelKling }, KLING3_I2V_MODEL: 'fal-ai/kling-video/o3/pro/image-to-video',
        H3_MODELS: { dialogue: modelH3, cinematic: modelH3, support: modelH3 }, H3_I2V_MODEL: modelI2V, H3_RESOLUTION: '768P', OMNI_I2V_MODEL: modelOmni,
      },
      '@/lib/openai': { openai: { chat: { completions: { create: async input => {
        ok(api.mutex(), 'Mutex exists before paid OpenAI caller')
        openaiPosts.push(clone(input))
        if (options.onOpenAI) await options.onOpenAI(api)
        return { choices: [{ message: { content: 'A safe rewrite of the original signed scene prompt.' } }] }
      } } } } },
    },
    globals: {
      Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clockNow])) } static now() { return clockNow } },
      console: { log: (...x) => logs.push(x), warn: (...x) => logs.push(x), error: (...x) => logs.push(x) },
      setTimeout: fn => { fn(); return 1 }, clearTimeout() {},
      fetch: async (url, init) => {
        ok(api.mutex(), 'Mutex exists before every actual Fal POST')
        ok(url.startsWith('https://queue.fal.run/'), 'Only mocked Fal queue request is reached')
        eq(init.method, 'POST', 'Count real single-submit POST calls')
        posts.push({ url, body: JSON.parse(init.body) })
        if (options.onFetch) await options.onFetch(api)
        const outcome = (options.outcomes ?? [200])[posts.length - 1] ?? 200
        if (outcome === 'transport') throw Error('SENTINEL_SECRET')
        return { ok: outcome >= 200 && outcome < 300, status: outcome, headers: { get: () => '0' },
          text: async () => options.noRequestId ? '{}' : JSON.stringify(outcome === 200 ? { request_id: 'new-request-id' } : { detail: 'SENTINEL_SECRET' }) }
      },
    },
  })
  claims = load('@/lib/cinematic/claim'); compose = load('@/lib/composeClaim')
  const quality = 'cinematic_h3', cost = 45, model = options.model ?? modelH3
  const body = { generationId, sceneIndex: 0, oldRequestId: options.nullId ? null : 'old-request-id', model, sanitize: true, ...(options.body ?? {}) }
  for (const key of options.omit ?? []) delete body[key]
  const birthId = claims.cinematicClaimId(userId, generationId)
  const response = {
    generationId, quality, fal_request_ids: [options.nullId ? null : 'old-request-id', 'ready-request-id'], fal_models: [model, model],
    scene_prompts: ['The exact signed scene prompt with sufficient description.', 'Already completed signed scene prompt.'],
    scene_seconds: [8, 10], scene_anchor_urls: [options.noAnchor ? null : 'https://fixture.invalid/anchor.png', null],
    // A null slot cannot carry terminal proof for a provider ID it never had.
    // Integrated HMAC binding correctly rejects such an orphan proof.
    terminal_failed_jobs: options.notTerminal || options.nullId ? [] : [{ requestId: 'old-request-id', model }],
    ...(options.unknownNull ? {} : { submission_uncertain: options.uncertainNull ?? false }),
  }
  birth = { id: birthId, name: claims.CINEMATIC_CLAIM_EVENT, path: claims.CINEMATIC_CLAIM_PATH, user_id: userId,
    session_id: generationId, created_at: new Date(Date.now() - 10000).toISOString(),
    metadata: { generation_id: generationId, status: options.status ?? 'settled', fingerprint: 'a'.repeat(64), credit_cost: cost, quality, engine: model,
      fal_request_ids: response.fal_request_ids, fal_models: response.fal_models, authorized_completed_urls: [options.readyTarget ? 'https://fixture.invalid/target.mp4' : null, options.noReadyClip ? null : 'https://fixture.invalid/ready.mp4'],
      response, response_hash: '', resolution_reason: 'provider_submitted', resolution_reference: `cinematic-${birthId}` } }
  updateBirth = mutate => {
    mutate?.(birth.metadata)
    const m = birth.metadata
    m.response_hash = claims.cinematicValueHash(m.response)
    m.authority = claims.signCinematicClaim(secret, { claimId: birthId, userId, generationId, status: m.status, fingerprint: m.fingerprint,
      creditCost: m.credit_cost, quality: m.quality, engine: m.engine, falRequestIds: m.fal_request_ids, falModels: m.fal_models,
      authorizedCompletedUrls: m.authorized_completed_urls, responseHash: m.response_hash, resolutionReason: m.resolution_reason, resolutionReference: m.resolution_reference })
  }
  updateBirth()
  if (options.forged) birth.metadata.authority = '0'.repeat(64)
  events.push(birth)
  route = load('app/api/retry-hollywood-scene/route.ts')
  const args = { db, secret, userId, generationId }
  const api = { ...args, claims, compose, load, events, operations, posts, openaiPosts, logs, body, birth, updateBirth,
    advance: ms => { clockNow += ms },
    mutex: () => events.find(row => row.id === compose.composeClaimId(userId, generationId)),
    post: async override => clone(await route.POST({ json: async () => ({ ...body, ...override }) })),
    hold: () => load('@/lib/cinematic/sceneRetry').readVerifiedSceneRetryHold(args),
    active: () => load('app/api/compose/active/route.ts').GET(),
  }
  return api
}

for (const options of [
  { anonymous: true }, { noKey: true }, { omit: ['generationId'] }, { omit: ['oldRequestId'] }, { omit: ['sceneIndex'] }, { omit: ['model'] },
  { forged: true }, { status: 'released' }, { status: 'pending' }, { status: 'done' }, { notTerminal: true }, { readyTarget: true }, { noReadyClip: true },
  { body: { oldRequestId: 'foreign-id' } }, { body: { model: 'unsupported' } }, { body: { sceneIndex: 9 } },
  { nullId: true, unknownNull: true }, { nullId: true, uncertainNull: true }, { model: modelI2V, noAnchor: true },
  { model: modelOmni, noAnchor: true }, { birthReadErrorAt: 1 },
]) {
  const f = fixture(options), result = await f.post()
  ok(result.status >= 400, 'Invalid, unknown, nonterminal or unpaid identity is refused')
  eq(f.posts.length + f.openaiPosts.length, 0, 'Zero paid calls before authorization')
  eq(f.operations.filter(x => x.action === 'insert').length, 0, 'No mutex mutation for unauthorized retry')
}
for (const options of [
  { afterInsert: f => f.updateBirth(m => { m.status = 'released' }) },
  { afterInsert: f => f.updateBirth(m => { m.response.terminal_failed_jobs = [] }) },
  { birthReadErrorAt: 2 },
]) {
  const f = fixture(options), result = await f.post()
  ok(result.status >= 400, 'Birth is revalidated AFTER unique INSERT')
  eq(f.posts.length + f.openaiPosts.length, 0, 'Stale pre-lock birth cannot spend')
  eq(Boolean(f.mutex()), false, 'Safe pre-provider failure releases only own lock')
}
{
  const f = fixture({ onOpenAI: f => f.updateBirth(m => { m.status = 'released' }) })
  await f.post(); eq(f.openaiPosts.length, 1, 'Sanitize is inside mutex'); eq(f.posts.length, 0, 'Birth rechecked after OpenAI before Fal'); eq(Boolean(f.mutex()), false, 'Pre-Fal failure releases own lock')
}

// Execute actual compose lock-acquisition caller against retry-owned same PK.
const source = fs.readFileSync('app/api/compose/route.ts', 'utf8')
const ast = ts.createSourceFile('route.ts', source, ts.ScriptTarget.Latest, true)
let claimFn
function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'claimGenerationSubmission') claimFn = node; ts.forEachChild(node, visit) }
visit(ast)
async function attemptCompose(f) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(`export ${claimFn.getText(ast)}`, { compilerOptions: { module: 1, target: 9 } }).outputText, {
    exports, composeAdmin: f.db, authenticatedUserId: f.userId, generationId: f.generationId, claimId: f.compose.composeClaimId(f.userId, f.generationId),
    ...f.compose, serviceRoleKey: f.secret, quality: 'cinematic_h3', duration: 60, body: {}, voiceoverScript: '', episodeNarrationForMemory: () => '',
    ownsSubmissionClaim: false, submissionClaimIsCreditHold: false, console: { error() {} }, unavailableClaimResponse: blocked,
    submissionOwner: 'compose-fixture-owner', submissionAuthority: '', cinematicBirthClaim: null,
    responseForClaimRow: async row => { ok(row.metadata.scene_retry, 'Actual compose sees retry-owned row'); return { pending: true } },
  })
  const result = await exports.claimGenerationSubmission(45, false)
  eq(result.kind, 'existing', 'Actual compose INSERT collides on same mutex PK')
}
{
  let second
  const f = fixture({ onFetch: async f => { second = await f.post(); await attemptCompose(f) } })
  const result = await f.post({ prompt: 'Forged prompt that must not reach any model.', seconds: 15, anchorUrl: 'https://attacker.invalid/p.png' })
  eq(second.status, 409, 'Concurrent retry waits without second POST'); eq(result.status, 200, 'Owned retry succeeds')
  eq(f.posts.length, 1, 'Two retries and concurrent compose produce ONE Fal job')
  eq(f.openaiPosts.length, 1, 'Concurrent retry cannot buy another prompt rewrite')
  eq(f.posts[0].body.duration, 8, 'Duration comes from signed response, not mutable request')
  ok(!JSON.stringify(f.posts).includes('attacker.invalid'), 'Anchor not replaced from browser payload')
  eq(f.openaiPosts[0].messages[1].content, f.birth.metadata.response.scene_prompts[0], 'Sanitize receives signed source, not arbitrary browser prompt')
  eq(f.posts[0].body.generate_audio, undefined, 'No unsupported H3 audio switch')
  const verified = await f.claims.loadVerifiedCinematicClaim(f)
  ok(verified.ok && verified.claim.falRequestIds[0] === 'new-request-id', 'Successful retarget passes real HMAC and response binding')
  eq(Boolean(f.mutex()), false, 'Mutex deleted ONLY AFTER retarget')
  const writeActions = f.operations.filter(x => ['update', 'delete'].includes(x.action))
  eq(writeActions.map(x => x.action), ['update', 'delete'], 'Atomic birth retarget precedes own mutex deletion')
  ok(writeActions[1].filters.some(([key]) => key === 'metadata->scene_retry->>owner'), 'Deletion checks unique owner nonce')
}
for (const outcomes of [[408], [503], ['transport']]) {
  const f = fixture({ outcomes }), result = await f.post()
  eq(result.status, 422, 'Ambiguous paid POST is support-pending terminal response')
  eq(f.posts.length, 1, 'No retry on timeout/5xx/transport')
  eq((await f.hold()).phase, 'ambiguous', 'Signed ambiguity survives for read-only replay')
  eq((await f.post()).status, 422, 'Repeat caller reads retained hold')
  eq(f.posts.length, 1, 'Replay cannot create another billable job')
  eq(result.body.refunded, false, 'Never claim refund'); eq(result.body.retryable, false, 'Never invite automatic retry')
  ok(!JSON.stringify(f.logs).includes('SENTINEL_SECRET'), 'No raw provider error in logs')
  const active = await f.active(); eq(active.body.state, 'failed', 'Actual active reader returns terminal support state'); eq(active.body.resumable, false, 'No poll of imaginary final render')
}
for (const options of [{ noRequestId: true }, { retargetFails: true }, { retargetThrows: true }, { retargetUncertain: true }, { deleteFails: true }, { outcomes: [503], markerFails: true }]) {
  const f = fixture(options), result = await f.post()
  eq(result.status, 422, 'Accepted/uncertain bookkeeping failure never discards hold')
  ok(f.mutex(), 'Mutex retained when retarget/delete/phase write is uncertain')
  ok(await f.hold(), 'Even failed phase write leaves signed original submitting marker')
  await f.post(); eq(f.posts.length, 1, 'Replay after partial write never pays again')
}
for (const outcomes of [[400], [401], [403], [422], [429, 429]]) {
  const f = fixture({ outcomes }), result = await f.post()
  eq(result.status, 502, 'Explicit provider rejection can close this owned attempt')
  eq(Boolean(f.mutex()), false, 'Explicit rejection releases own mutex')
  eq(f.posts.length, outcomes.length, 'Only existing bounded 429 policy can retry')
}
{
  const f = fixture({ outcomes: [429, 200] })
  eq((await f.post()).status, 200, 'Confirmed 429 rejection permits existing one bounded retry')
  eq(f.posts.length, 2, 'No multiplication of shared 429 policy')
}
{
  const f = fixture({ nullId: true })
  eq((await f.post()).status, 200, 'Explicit null slot + signed no-uncertainty + another ready clip is authorized')
}
{
  const f = fixture({ insertUncertain: true })
  await f.post(); eq(f.posts.length + f.openaiPosts.length, 0, 'Unconfirmed unique INSERT never spends'); ok(await f.hold(), 'Possibly inserted mutex remains signed, never blindly deleted')
  const recent = await f.active(); eq(recent.body.state, 'rendering', 'Recent signed submitting is processing, not a false terminal failure'); eq(recent.body.resumable, false, 'No resume target during scene POST')
  f.advance(120001)
  const old = await f.active(); eq(old.body.state, 'failed', 'Old submitting marker becomes support state, not infinite rendering'); eq(old.body.supportPending, true, 'Uncertain timeout explicitly requires confirmation')
  ok(f.mutex(), 'Time never auto-deletes the paid-attempt mutex')
  eq((await f.post()).status, 422, 'Old signed submitting replay cannot silently restart'); eq(f.posts.length, 0, 'No POST after elapsed timeout')
}
// Tamper with mutable fields: neither marker nor parent authority alone proves
// this hold. No provider identity is exposed by read-only UI response.
{
  const f = fixture({ outcomes: [503] }); await f.post()
  const mutex = f.mutex(), original = clone(mutex)
  for (const mutate of [row => { row.metadata.scene_retry.phase = 'submitting' }, row => { row.metadata.scene_retry.owner = '0'.repeat(36) },
    row => { row.metadata.cost = 1 }, row => { row.session_id = 'another-generation-111' }, row => { row.metadata.render_id = 'real-final-job' },
    row => { row.metadata.scene_retry.startedAt = new Date().toISOString() }]) {
    Object.assign(mutex, clone(original)); mutate(mutex); eq(await f.hold(), null, 'Forged hold field cannot authorize support state')
  }
  Object.assign(mutex, clone(original))
  const held = await f.hold(); ok(!JSON.stringify(held).includes('request-id'), 'Read-only contract excludes raw provider IDs')
  const before = f.events.length
  const wrong = { id: mutex.id, authority: mutex.metadata.authority, metadata: mutex.metadata, marker: { ...mutex.metadata.scene_retry, owner: '0'.repeat(36) } }
  eq(await f.load('@/lib/cinematic/sceneRetry').releaseSceneRetryMutex(f, wrong), false, 'Stale owner cannot delete another mutex')
  eq(f.events.length, before, 'Failed ownership check leaves all rows intact')
}
console.log(`scene-retry-mutex: ${checks} passed; actual POST/Fal queue/HMAC/active/compose-lock callers; synthetic DB only`)
