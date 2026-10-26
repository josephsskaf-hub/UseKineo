// Real route/helper/batch, fake Supabase and OpenAI only. No env, DB or network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createOfflineLoader } from '../../scripts/test-support/offline-ts-loader.mjs'
let checks = 0
const ok = (v, why) => { assert.ok(v, why); checks++ }
const eq = (a, b, why) => { assert.deepEqual(JSON.parse(JSON.stringify(a)), b, why); checks++ }
const clone = v => JSON.parse(JSON.stringify(v))
const ID = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const actor = ID(999)
const flagPath = 'lib/regua95/taskFulfillmentCanary.ts'
const helperPath = 'lib/admin/taskFulfillmentCanary.ts'
const routePath = 'app/api/admin/coerencia/canario/route.ts'
const read = p => fs.readFileSync(path.join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n')

function fixture(n) {
  const videoId = ID(n), generationId = ID(n + 100), owner = ID(n + 200)
  const selected = { videoId, generationId, coherenceEventId: ID(n + 300), pixelEventId: ID(n + 400), confirmed: { source: 'admin_manual', seconds: 15, mode: 'idea', language: 'pt' } }
  const base = { video_id: videoId, generation_id: generationId, render_id: `render-${n}`, product: 'filme' }
  return {
    selected,
    video: { id: videoId, user_id: owner, status: 'completed', render_id: `render-${n}` },
    coherence: { id: selected.coherenceEventId, name: 'coherence_v2', user_id: owner, session_id: videoId, metadata: { ...base, version: 'stored-coherence', evidence: { idea: 'A red fox blocks a blue fox punch.', idea_source: 'pedido_direto', narration: 'The red fox blocks. The blue fox dodges.', scenes: [{ scene: 1, spoken: 'The red fox blocks.', prompt: 'The red fox blocks the blue fox punch.' }, { scene: 2, spoken: 'The blue fox dodges.', prompt: 'The blue fox ducks the red fox strike.' }] } } },
    pixel: { id: selected.pixelEventId, name: 'pixel_score', user_id: owner, session_id: videoId, metadata: { ...base, version: 'stored-pixel', frame_count: 3, frame_urls: [1, 2, 3].map(i => `https://frames.fixture.invalid/${n}/${i}.jpg`), frames: [0, 5, 10].map((t, i) => ({ i: i + 1, t, subject: 'fox', score: 90 })) } },
  }
}
function fakeDb(fixtures, opts = {}) {
  const videos = new Map(fixtures.map(f => [f.video.id, clone(f.video)]))
  const events = new Map(fixtures.flatMap(f => [f.coherence, f.pixel]).map(e => [e.id, clone(e)]))
  const log = [], writes = []
  const value = (row, key) => key.startsWith('metadata->>') ? row.metadata?.[key.slice(11)] : row[key]
  const db = { from(table) {
    let row, filters = [], execution
    const builder = {
      select(columns) { log.push(['select', table, columns]); return builder },
      eq(key, v) { filters.push([key, v]); return builder },
      insert(v) { row = clone(v); return builder },
      upsert() { throw Error('upsert forbidden') }, update() { throw Error('update forbidden') }, delete() { throw Error('delete forbidden') },
      then(resolve, reject) { return execute().then(resolve, reject) },
      single() { return execute() }, maybeSingle() { return execute() },
    }
    function execute() {
      if (execution) return execution
      if (row) {
        log.push(['insert', row.name, row.id])
        if (opts.failName === row.name) return execution = Promise.resolve({ data: null, error: { code: 'XX000', message: 'simulated failure' } })
        // Atomic before the Promise yields: concurrent inserts of one PK have one winner.
        if (events.has(row.id)) return execution = Promise.resolve({ data: null, error: { code: '23505' } })
        events.set(row.id, clone(row)); writes.push(clone(row))
        return execution = Promise.resolve({ data: opts.noInsertedId ? {} : { id: row.id }, error: null })
      }
      log.push(['read', table, clone(filters)])
      const rows = [...(table === 'videos' ? videos : events).values()].filter(r => filters.every(([key, v]) => value(r, key) === v))
      return execution = Promise.resolve({ data: rows.length === 1 ? clone(rows[0]) : null, error: rows.length > 1 ? { code: 'multiple' } : null })
    }
    return builder
  } }
  return { db, events, videos, writes, log }
}
function runtime({ enabled = true, state = fakeDb([fixture(1)]), admin = true, signedIn = true, fetchImpl, transform } = {}) {
  let calls = 0, keys = 0, sessions = 0, clients = 0
  const fakeFetch = async (...args) => {
    calls++; state.log.push(['model'])
    if (fetchImpl) return fetchImpl(...args)
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{"task_fulfilled":"yes","findings":[]}' } }] }) }
  }
  const load = createOfflineLoader({
    env: { OPENAI_API_KEY: 'offline-fixture-not-a-key' }, globals: { AbortController, setTimeout, clearTimeout, fetch: fakeFetch },
    source: (p, text) => {
      const flagged = enabled && p === flagPath ? text.replace('TASK_FULFILLMENT_CANARY_ENABLED = false', 'TASK_FULFILLMENT_CANARY_ENABLED = true') : text
      return transform ? transform(p, flagged) : flagged
    },
    mocks: {
      'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => { sessions++; return { auth: { getUser: async () => ({ data: { user: signedIn ? { id: actor, email: 'admin@fixture.invalid' } : null } }) } } } },
      '../../_shared/db': { isAdminEmail: () => admin, serviceClient: () => { clients++; return state.db } },
    },
  })
  return { load, state, stats: () => ({ calls, keys, sessions, clients }), deps: { admin: state.db, adminId: actor, getApiKey: () => { keys++; state.log.push(['key']); return 'offline-fixture-not-a-key' }, fetchImpl: fakeFetch } }
}
const req = body => ({ url: 'https://www.usekineo.com/api/admin/coerencia/canario', headers: new Headers({ origin: 'https://www.usekineo.com' }), text: async () => typeof body === 'string' ? body : JSON.stringify(body) })

// Real disabled flag: not even an injected dependency getter may be touched.
{
  const rt = runtime({ enabled: false })
  const poison = new Proxy({}, { get() { throw Error('disabled touched dependency') } })
  const h = rt.load('@/lib/admin/taskFulfillmentCanary')
  eq(await h.runStoredTaskFulfillmentCanary(poison, poison), { status: 'disabled', evaluated: 0 }, 'Disabled helper returns before body/dependencies/key lookup')
  const route = rt.load('@/app/api/admin/coerencia/canario/route')
  const r = await route.POST(new Proxy({}, { get() { throw Error('disabled read request/auth') } }))
  ok(r.status === 409 && r.body.status === 'disabled', 'Disabled route does not import/start auth or clients')
  eq(rt.stats(), { calls: 0, keys: 0, sessions: 0, clients: 0 }, 'Disabled means zero model/key/session/DB activity')
  eq(rt.state.writes, [], 'Disabled means zero writes')
}
const base = fixture(1), request = { cases: [base.selected] }
{
  const rt = runtime(), h = rt.load('@/lib/admin/taskFulfillmentCanary')
  ok(h.parseStoredCanaryRequest(request).ok, 'Exact case and explicit admin configuration accepted')
  for (const mutate of [
    b => { b.cases = [] }, b => { b.cases = new Array(4).fill(base.selected) }, b => { b.cases.push(clone(base.selected)) },
    b => { b.cases[0].videoId = 'not-uuid' }, b => { delete b.cases[0].generationId }, b => { b.cases[0].confirmed.source = 'customer_confirmed' },
    b => { delete b.cases[0].confirmed.mode }, b => { b.cases[0].confirmed.seconds = 300 }, b => { b.cases[0].frames = ['https://untrusted.invalid'] },
    b => { b.apiKey = 'body-key' }, b => { b.cases[0].confirmed.historical_customer_acceptance_verified = true },
  ]) { const b = clone(request); mutate(b); ok(!h.parseStoredCanaryRequest(b).ok, 'Invalid/oversized/untrusted body rejected') }
  const id = h.canaryEventId(base.selected.videoId, 'version-a', 'claim')
  ok(/^[a-f0-9-]{14}5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id), 'Claim key is an RFC UUIDv5')
  ok(id === h.canaryEventId(base.selected.videoId.toUpperCase(), 'version-a', 'claim') && id !== h.canaryEventId(base.selected.videoId, 'version-b', 'claim') && id !== h.canaryEventId(base.selected.videoId, 'version-a', 'result'), 'Claim key stable per video/version, result isolated')
}
{
  const rt = runtime(), h = rt.load('@/lib/admin/taskFulfillmentCanary')
  const r = await h.runStoredTaskFulfillmentCanary(request, rt.deps)
  ok(r.status === 'recorded' && r.evaluated === 1 && rt.stats().calls === 1, 'One complete stored case makes one simulated model call')
  const result = rt.state.writes.find(e => e.name === 'task_fulfillment_canary')
  eq(r.cases[0].result, result.metadata.result, 'Full saved finding/experimental score/reasons returned without a second evaluation')
  ok(result.metadata.result.calibration_status === 'not_calibrated' && result.metadata.result.audio_evaluated === false, 'Experimental result preserves uncertainty/audio limits')
  eq(result.metadata.confirmed_configuration, { ...base.selected.confirmed, confirmed_by_admin_id: actor, historical_customer_acceptance_verified: false }, 'Configuration is admin-confirmed, never fictional historical customer acceptance')
  ok(result.metadata.idea_source === 'pedido_direto' && result.metadata.request_basis === 'original_request' && result.metadata.coherence_event_id === base.selected.coherenceEventId && result.metadata.pixel_event_id === base.selected.pixelEventId, 'Request and frame provenance retained by exact source IDs')
  ok(rt.state.writes.every(e => !['coherence_v2', 'pixel_score', 'fast_coherence'].includes(e.name)), 'No existing rubric score is overwritten')
  eq(rt.state.events.get(base.coherence.id), base.coherence, 'Old coherence event unchanged')
  eq(rt.state.events.get(base.pixel.id), base.pixel, 'Old pixel event unchanged')
  const modelAt = rt.state.log.findIndex(e => e[0] === 'model')
  ok(rt.state.log.findIndex(e => e[0] === 'key') < modelAt && rt.state.log.findIndex(e => e[1] === 'task_fulfillment_canary_claim') < modelAt && rt.state.log.findIndex(e => e[1] === 'task_fulfillment_canary_budget') < modelAt, 'Case and global budget reservations precede paid call')
  ok(rt.state.log.filter(e => e[0] === 'read' && e[1] === 'events').every(e => ['id', 'name', 'user_id', 'session_id', 'metadata->>video_id', 'metadata->>generation_id'].every(key => e[2].some(([k]) => k === key))), 'Evidence reads require all exact ownership/video/generation keys')
  const again = await h.runStoredTaskFulfillmentCanary(request, rt.deps)
  ok(again.evaluated === 0 && rt.stats().calls === 1, 'Repeated POST/case cannot repurchase an evaluation')
}
// Unknown evidence must stop before key lookup, claim and model.
for (const mutate of [
  f => { f.pixel.user_id = ID(800) }, f => { f.pixel.metadata.generation_id = ID(801) }, f => { f.coherence.metadata.video_id = ID(802) },
  f => { f.pixel.metadata.render_id = 'different-render' }, f => { f.coherence.metadata.evidence.idea_source = 'script_written_janela' },
  f => { f.coherence.metadata.evidence.scenes[0].spoken = '' }, f => { f.coherence.metadata.evidence.scenes[0].scene = 2 },
  f => { delete f.pixel.metadata.frame_urls }, f => { f.pixel.metadata.frames[1].t = null }, f => { f.pixel.metadata.frame_urls[1] = f.pixel.metadata.frame_urls[0] },
  f => { f.pixel.metadata.frame_urls[1] = 'http://localhost/private' }, f => { f.video.status = 'processing' },
]) {
  const f = fixture(1); mutate(f)
  const rt = runtime({ state: fakeDb([f]) })
  const r = await rt.load('@/lib/admin/taskFulfillmentCanary').runStoredTaskFulfillmentCanary(request, rt.deps)
  ok(r.status === 'unknown' && r.evaluated === 0, 'Missing/mismatched evidence returns unknown, not a made-up grade')
  ok(rt.stats().calls === 0 && rt.stats().keys === 0 && rt.state.writes.length === 0, 'Incomplete evidence never spends or writes')
}
{
  const rt = runtime({ fetchImpl: async () => { throw Error('simulated timeout') } }), h = rt.load('@/lib/admin/taskFulfillmentCanary')
  await h.runStoredTaskFulfillmentCanary(request, rt.deps)
  await h.runStoredTaskFulfillmentCanary(request, rt.deps)
  ok(rt.stats().calls === 1 && rt.state.writes.filter(e => e.name === 'task_fulfillment_canary_claim').length === 1, 'Model failure keeps reservation and does not retry')
  const saved = rt.state.writes.find(e => e.name === 'task_fulfillment_canary')
  ok(saved.metadata.result.task_fulfilled === 'unknown' && saved.metadata.result.numerical_score === null, 'Unavailable model produces unknown/null, never zero or passing score')
}
{
  const rt = runtime({ state: fakeDb([fixture(1)], { noInsertedId: true }) }), h = rt.load('@/lib/admin/taskFulfillmentCanary')
  await assert.rejects(() => h.runStoredTaskFulfillmentCanary(request, rt.deps), /reservation_unavailable/); checks++
  ok(rt.stats().calls === 0, 'Ambiguous INSERT response cannot authorize a model call')
}
{
  const rt = runtime({ state: fakeDb([fixture(1)], { failName: 'task_fulfillment_canary' }) }), h = rt.load('@/lib/admin/taskFulfillmentCanary')
  await assert.rejects(() => h.runStoredTaskFulfillmentCanary(request, rt.deps), /result_save_failed/); checks++
  await h.runStoredTaskFulfillmentCanary(request, rt.deps)
  ok(rt.stats().calls === 1, 'Save failure leaves consumed claim; retry cannot spend twice')
}
{
  const state = fakeDb([fixture(1)]), a = runtime({ state }), b = runtime({ state })
  const out = await Promise.all([a.load('@/lib/admin/taskFulfillmentCanary').runStoredTaskFulfillmentCanary(request, a.deps), b.load('@/lib/admin/taskFulfillmentCanary').runStoredTaskFulfillmentCanary(request, b.deps)])
  ok(out.reduce((n, r) => n + r.evaluated, 0) === 1 && a.stats().calls + b.stats().calls === 1, 'Concurrent same video has exactly one atomic winner')
}
{
  const fixtures = [1, 2, 3, 4].map(fixture), state = fakeDb(fixtures)
  const runners = fixtures.map(() => runtime({ state }))
  await Promise.all(runners.map((rt, i) => rt.load('@/lib/admin/taskFulfillmentCanary').runStoredTaskFulfillmentCanary({ cases: [fixtures[i].selected] }, rt.deps)))
  ok(runners.reduce((n, rt) => n + rt.stats().calls, 0) === 3, 'Three GLOBAL slots cap calls across concurrent POSTs with different videos')
  ok(state.writes.filter(e => e.name === 'task_fulfillment_canary_budget').length === 3 && state.writes.filter(e => e.name === 'task_fulfillment_canary').length === 3, 'Only three budget reservations and experimental results exist')
}
for (const [signedIn, admin] of [[false, false], [true, false]]) {
  const rt = runtime({ signedIn, admin })
  const r = await rt.load('@/app/api/admin/coerencia/canario/route').POST(req(request))
  ok(r.status === 403 && rt.stats().clients === 0 && rt.stats().calls === 0 && rt.state.writes.length === 0, 'Anonymous/non-admin blocked before privileged client or spending')
}
{
  const rt = runtime(), route = rt.load('@/app/api/admin/coerencia/canario/route')
  const result = await route.POST(req(request))
  ok(result.status === 200 && result.body.cases[0].result.calibration_status === 'not_calibrated' && Array.isArray(result.body.cases[0].result.findings) && Array.isArray(result.body.cases[0].result.incomplete_reasons), 'Manual admin route returns full experimental verdict immediately')
  ok(rt.stats().calls === 1, 'Immediate full verdict does not buy a second model call')
}
{
  const rt = runtime(), route = rt.load('@/app/api/admin/coerencia/canario/route')
  ok((await route.POST(req({ cases: new Array(4).fill(base.selected) }))).status === 400 && rt.stats().clients === 0, 'Invalid batch blocked before service-role client')
  const cross = req(request); cross.headers = new Headers({ origin: 'https://foreign.fixture.invalid' })
  ok((await route.POST(cross)).status === 403, 'Cross-origin manual POST blocked')
  ok((await route.POST(req(' '.repeat(8193)))).status === 413, 'Body byte budget enforced')
  ok((await route.POST(req('not json'))).status === 400, 'Invalid JSON rejected')
}

// Deliberate mutations of real source: each same contract must turn red.
let mutants = 0
async function rejectsMutation(name, file, before, after, proof) {
  ok(read(file).includes(before), `${name}: exact mutation anchor exists`)
  const transform = (p, text) => p === file ? text.replace(before, after) : text
  let rejected = false
  try { await proof(transform) } catch { rejected = true }
  ok(rejected, `${name}: rejected by execution`); mutants++
}
await rejectsMutation('Remove route disable gate', routePath, 'if (!TASK_FULFILLMENT_CANARY_ENABLED) return NextResponse.json', 'if (false) return NextResponse.json', async transform => {
  const rt = runtime({ enabled: false, transform })
  const r = await rt.load('@/app/api/admin/coerencia/canario/route').POST(req(request))
  assert.equal(r.status, 409); assert.equal(rt.stats().sessions, 0)
})
await rejectsMutation('Omit owner recheck', helperPath, "e.user_id === ownerId && e.session_id", "true && e.session_id", async transform => {
  // A malformed DB row is returned even when the server sent owner filters.
  const f = fixture(1), rt = runtime({ transform })
  const proxy = { from(table) { const q = rt.state.db.from(table); if (table === 'events') { const original = q.maybeSingle; q.maybeSingle = async () => { const r = await original(); if (r.data?.name === 'pixel_score') r.data.user_id = ID(800); return r } } return q } }
  const r = await rt.load('@/lib/admin/taskFulfillmentCanary').runStoredTaskFulfillmentCanary(request, { ...rt.deps, admin: proxy })
  assert.equal(r.status, 'unknown'); assert.equal(rt.stats().calls, 0)
})
await rejectsMutation('Pay despite duplicate claim', helperPath, "if (r.error?.code === '23505') return false", "if (r.error?.code === '23505') return true", async transform => {
  const rt = runtime({ transform }), h = rt.load('@/lib/admin/taskFulfillmentCanary')
  await h.runStoredTaskFulfillmentCanary(request, rt.deps)
  await h.runStoredTaskFulfillmentCanary(request, rt.deps).catch(() => {})
  assert.equal(rt.stats().calls, 1)
})
await rejectsMutation('Unbounded global budget', helperPath, 'slot <= TASK_FULFILLMENT_MAX_CASES', 'slot <= TASK_FULFILLMENT_MAX_CASES + 1', async transform => {
  const fixtures = [1, 2, 3, 4].map(fixture), rt = runtime({ state: fakeDb(fixtures), transform }), h = rt.load('@/lib/admin/taskFulfillmentCanary')
  for (const f of fixtures) await h.runStoredTaskFulfillmentCanary({ cases: [f.selected] }, rt.deps)
  assert.equal(rt.stats().calls, 3)
})
await rejectsMutation('Fabricate historical customer acceptance', helperPath, 'historical_customer_acceptance_verified: false', 'historical_customer_acceptance_verified: true', async transform => {
  const rt = runtime({ transform }), h = rt.load('@/lib/admin/taskFulfillmentCanary')
  await h.runStoredTaskFulfillmentCanary(request, rt.deps)
  const saved = rt.state.writes.find(e => e.name === 'task_fulfillment_canary')
  assert.equal(saved.metadata.confirmed_configuration.historical_customer_acceptance_verified, false)
})
console.log(JSON.stringify({ status: 'PASS', checks, rejectedMutants: mutants, realNetworkCalls: 0, realDatabaseWrites: 0, flagInProduct: false }))
