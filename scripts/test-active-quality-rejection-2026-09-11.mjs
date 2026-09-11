// Actual read-only GET + real mutex/intent/birth HMAC verification + actual
// existing consumer. All data are synthetic; no writes/providers are available.
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createHmac } from 'node:crypto'
import assert from 'node:assert/strict'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let checks = 0
const eq = (a, b, message) => { assert.deepEqual(JSON.parse(JSON.stringify(a)), b, message); checks++ }
const ok = (a, message) => { assert.ok(a, message); checks++ }
let forbiddenCalls = 0
const forbidden = () => { forbiddenCalls++; throw Error('Network/provider/write/refund forbidden in active probe') }
const clone = x => JSON.parse(JSON.stringify(x))

async function run(options = {}) {
  const secret = 'offline-signing-fixture', userId = 'fixture-owner', generationId = 'fixture-generation-111'
  const operations = [], logs = [], events = [], videos = [], debits = []
  const db = { from(table) {
    if (!['events', 'videos', 'credit_debits'].includes(table)) throw Error('Unexpected table ' + table)
    const filters = [], reads = { table, eq: [] }
    let order, limit, single = false
    const field = (row, key) => key.includes('->>') ? row[key.split('->>')[0]]?.[key.split('->>')[1]] : row[key]
    const query = {
      select() { return query },
      eq(key, value) { reads.eq.push([key, value]); filters.push(row => field(row, key) === value); return query },
      gte(key, value) { filters.push(row => field(row, key) >= value); return query },
      in(key, values) { filters.push(row => values.includes(field(row, key))); return query },
      order(key, { ascending }) { order = { key, ascending }; return query },
      limit(value) { limit = value; return query },
      maybeSingle() { single = true; return query },
      insert: forbidden, update: forbidden, delete: forbidden, upsert: forbidden,
      then(resolve, reject) {
        operations.push(reads)
        let rows = (table === 'events' ? events : table === 'videos' ? videos : debits).filter(row => filters.every(filter => filter(row)))
        if (order) rows = [...rows].sort((a, b) => String(a[order.key]).localeCompare(String(b[order.key])) * (order.ascending ? 1 : -1))
        if (limit) rows = rows.slice(0, limit)
        const result = options.ledgerError && table === 'credit_debits'
          ? { data: null, error: { message: 'SENTINEL_SECRET' } }
          : { data: clone(single ? rows[0] ?? null : rows), error: null }
        return Promise.resolve(result).then(resolve, reject)
      },
    }
    return query
  } }
  const load = createOfflineLoader({
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: secret },
    mocks: {
      'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: options.unauthenticated ? null : { id: userId } } }) } }) },
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/credits/refund': { refundRenderCredits: forbidden },
    },
    globals: { console: { warn: (...args) => logs.push(args), error: (...args) => logs.push(args) }, fetch: forbidden },
  })
  const claims = load('@/lib/cinematic/claim'), compose = load('@/lib/composeClaim')
  const quality = 'cinematic_h3', cost = 45
  const composeId = compose.composeClaimId(userId, generationId)
  const birthId = claims.cinematicClaimId(userId, generationId)
  const billingReference = `cinematic-${birthId}`
  const createdAt = new Date(Date.now() - 10000).toISOString()
  const mutex = {
    id: composeId, name: compose.COMPOSE_CLAIM_EVENT, path: compose.COMPOSE_CLAIM_PATH,
    user_id: userId, session_id: generationId, created_at: createdAt,
    metadata: { generation_id: generationId, status: 'pending', quality, cost, duration: 60,
      authority: compose.signComposeClaim(secret, { claimId: composeId, userId, generationId, status: 'pending', quality, cost }) },
  }
  const reason = 'native_dialogue_unverified'
  const intent = createHmac('sha256', secret).update(JSON.stringify([
    'kineo-quality-rejection-v1', composeId, mutex.metadata.authority, userId, generationId, reason, false,
  ])).digest('hex')
  if (!options.noMarker) mutex.metadata.quality_rejection = {
    version: 1, phase: options.pending ? 'resolving' : 'resolved', reason,
    final_provider_attempted: false, intent_authority: intent,
    // Deliberately mutable flags are true even when the ledger is NOT refunded.
    refund_confirmed: true, birth_released: true,
  }
  if (options.forgedIntent) mutex.metadata.quality_rejection.intent_authority = '0'.repeat(64)
  if (options.forgedMutex) mutex.metadata.authority = '0'.repeat(64)
  if (options.wrongSession) mutex.session_id = 'another-generation-111'
  if (options.providerJob) mutex.metadata.render_id = 'existing-render'
  const response = { generationId, quality, fal_request_ids: ['fixture-request'], fal_models: ['fixture-model'], scene_seconds: [10] }
  const authority = {
    claimId: birthId, userId, generationId, status: options.pending ? 'settled' : 'released',
    fingerprint: 'a'.repeat(64), creditCost: cost, quality, engine: 'fixture-model',
    falRequestIds: response.fal_request_ids, falModels: response.fal_models,
    authorizedCompletedUrls: ['https://fixture.invalid/clip.mp4'], responseHash: claims.cinematicValueHash(response),
    resolutionReason: options.pending ? 'provider_submitted' : 'provider_failed_refunded', resolutionReference: billingReference,
  }
  const birth = {
    id: birthId, name: claims.CINEMATIC_CLAIM_EVENT, path: claims.CINEMATIC_CLAIM_PATH,
    user_id: userId, session_id: generationId, created_at: new Date(Date.now() - 20000).toISOString(),
    metadata: {
      generation_id: generationId, status: authority.status, fingerprint: authority.fingerprint,
      credit_cost: cost, quality, engine: authority.engine, fal_request_ids: authority.falRequestIds,
      fal_models: authority.falModels, authorized_completed_urls: authority.authorizedCompletedUrls,
      response, response_hash: authority.responseHash, resolution_reason: authority.resolutionReason,
      resolution_reference: billingReference, authority: claims.signCinematicClaim(secret, authority),
    },
  }
  if (options.forgedBirth) birth.metadata.authority = '0'.repeat(64)
  events.push(mutex, birth)
  debits.push({ user_id: userId, render_id: billingReference, kind: 'video', amount: cost, refunded_at: options.pending ? null : createdAt })
  if (options.newerLive) events.unshift({ ...mutex, id: 'newer-compose', session_id: 'newer-generation-111', created_at: new Date(Date.now() - 1000).toISOString(), metadata: { status: 'pending', generation_id: 'newer-generation-111', render_id: 'newer-render', quality, duration: 60 } })
  if (options.newerVideo) videos.push({ user_id: userId, status: 'completed', id: 'video-ready', video_url: 'https://fixture.invalid/final.mp4', render_id: 'completed-render', created_at: new Date(Date.now() - 1000).toISOString() })
  const reply = await load('app/api/compose/active/route.ts').GET()
  return { reply: clone(reply), operations, logs }
}

for (const options of [{}, { pending: true }, { ledgerError: true }, { forgedBirth: true }]) {
  const r = await run(options)
  eq(r.reply.status, 200, 'Read-only active probe retains existing successful response status')
  eq(r.reply.body.state, 'failed', 'Authenticated signed quality intent is terminal, not rendering')
  eq(r.reply.body.render_id, null, 'No imaginary provider job or result id')
  eq(r.reply.body.resumable, false, 'Consumer is not offered resume/poll')
  eq(r.reply.body.retryable, false, 'Terminal quality rejection never auto-retries')
  eq(r.reply.body.qualityCheckFailed, true, 'Dedicated quality contract remains recognizable')
  eq(r.reply.body.refundConfirmed, !options.pending && !options.ledgerError && !options.forgedBirth, 'Refund copy follows real verified ledger/birth, not mutable marker flags')
  ok(r.operations.every(op => op.eq.some(([key, value]) => key === 'user_id' && value === 'fixture-owner')), 'Every query is scoped to authenticated owner')
  ok(!JSON.stringify(r.reply).includes('fixture-request') && !JSON.stringify(r.logs).includes('SENTINEL_SECRET'), 'No provider id or raw error exposed')
}
for (const options of [{ noMarker: true }, { forgedIntent: true }, { forgedMutex: true }, { wrongSession: true }, { providerJob: true }]) {
  const r = await run(options)
  eq(r.reply.body.state, 'rendering', 'Unsigned, unrelated or provider-accepted claims are not hidden as quality rejection')
  ok(!r.reply.body.qualityCheckFailed, 'No quality truth inferred from mutable JSON')
}
eq((await run({ newerLive: true })).reply.body.render_id, 'newer-render', 'Older tombstone does not hide a newer real attempt')
eq((await run({ newerVideo: true })).reply.body.state, 'completed', 'Newer completed video keeps existing precedence')
const anonymous = await run({ unauthenticated: true })
eq(anonymous.reply.status, 401, 'Existing authentication gate preserved')
eq(anonymous.operations.length, 0, 'No data access for anonymous request')

// Execute the existing consumer unchanged: failed means no rendering card,
// no resumable render and no status/provider poll. No GenerateClient edit.
const source = fs.readFileSync('app/(dashboard)/generate/GenerateClient.tsx', 'utf8')
const ast = ts.createSourceFile('GenerateClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const functions = new Map()
function visit(n) { if (ts.isFunctionDeclaration(n) && n.name) functions.set(n.name.text, n); ts.forEachChild(n, visit) }
visit(ast)
for (const pending of [false, true]) {
  const r = await run({ pending }), exports = {}, selected = []
  const refs = { serverProbeProvesIdleRef: { current: false }, serverProbeDegradedRef: { current: false }, serverActiveRenderRef: { current: { state: 'rendering', renderId: 'stale' } } }
  const code = ts.transpileModule(`export ${functions.get('refreshServerActiveRender').getText(ast)}\nexport ${functions.get('resumeServerActiveRender').getText(ast)}`, { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(code, {
    exports, ...refs, fetch: async url => { eq(url, '/api/compose/active', 'Consumer only reads active probe'); return { ok: true, json: async () => r.reply.body } },
    setServerActiveRender: value => selected.push(value), setServerActiveRenderTick() {}, trackEvent: forbidden,
  })
  eq(await exports.refreshServerActiveRender(), null, 'Actual consumer clears stale rendering probe for terminal response')
  eq(refs.serverActiveRenderRef.current, null, 'Terminal tombstone cannot offer resume')
  eq(selected, [null], 'No in-progress card from quality tombstone')
  exports.resumeServerActiveRender() // Any path beyond its first guard has no dependencies.
  checks++
}
eq(forbiddenCalls, 0, 'No forbidden write, refund, provider, network or resume attempt, including caught failures')
console.log(`active-quality-rejection: ${checks} passed; actual GET/HMAC helper/consumer; zero writes or provider calls`)
