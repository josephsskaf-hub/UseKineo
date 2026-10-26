// PEDIDO-MCP-2610: real studioTools create/status with memory I/O only.
import assert from 'node:assert/strict'
import { createOfflineLoader } from '../../scripts/test-support/offline-ts-loader.mjs'
const unavailable = () => { throw new Error('Unexpected external dependency') }
function moduleUnderTest(source) {
  return createOfflineLoader({ source, mocks: {
    '@/lib/cinematic/claim': { CINEMATIC_CLAIM_EVENT: 'cinematic_claim', cinematicClaimId: (user, gen) => `${user}-${gen}` },
    '@/lib/composeClaim': { COMPOSE_CLAIM_EVENT: 'compose_claim' },
    '@/lib/plan': { fetchUserPlan: unavailable }, '@/lib/reverseTrial': { isTrialActive: unavailable },
    '@/lib/serverEvents': { writeServerEvent: unavailable }, '@/lib/mcp/studioSession': { mintUserSession: unavailable },
    '@/lib/mcp/studioMcp': { estimatedMinutes: () => 1, studioEngineLabel: v => v },
  }, globals: { AbortSignal: { timeout: () => undefined } } })('lib/mcp/studioTools.ts')
}
const tool = moduleUnderTest()
const input = { prompt: 'A lighthouse keeper finds a blue key.', scriptMode: 'verbatim', engine: 'seedance', duration: 15, language: 'en', aspect: '9:16', format: 'film', idempotencyKey: 'offline-request-key', title: 'Offline film' }
const answer = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data })
const review = (body, patch = {}) => ({ generationId: body.generationId, qualityCheckFailed: true, reason: 'scene_description_requires_review', review_required: true, retryable: false, refunded: false, refundConfirmed: false, claimReleased: false, ...patch })
function world(respond) {
  let time = Date.parse('2026-10-26T12:00:00Z')
  const tables = { mcp_studio_jobs: [], events: [], videos: [], credit_debits: [] }, posts = [], writes = [], reads = []
  const errors = new Set()
  const db = { from(table) {
    let op = 'select', payload, filters = [], one = false, max = Infinity
    const query = {
      select() { return query }, eq(k, v) { filters.push([k, v]); return query },
      is(k, v) { filters.push([k, v]); return query }, order() { return query }, limit(n) { max = n; return query },
      maybeSingle() { one = true; return query }, insert(v) { op = 'insert'; payload = v; return query },
      update(v) { op = 'update'; payload = v; return query },
      then(resolve, reject) { return Promise.resolve().then(() => {
        if (errors.has(table)) return { data: null, error: { message: 'offline lookup failure' } }
        const rows = tables[table]; assert.ok(rows, table)
        const matches = row => filters.every(([k, v]) => row[k] === v)
        if (op === 'insert') { const row = { id: 'row-' + rows.length, created_at: new Date(time).toISOString(), ...payload }; rows.push(row); writes.push({ table, op, row }); return { data: null, error: null } }
        if (op === 'update') { for (const row of rows.filter(matches)) Object.assign(row, payload); writes.push({ table, op, payload }); return { data: null, error: null } }
        reads.push({ table, filters }); const found = rows.filter(matches).slice(0, max)
        return { data: one ? found[0] ?? null : found, error: null }
      }).then(resolve, reject) },
    }
    return query
  } }
  const ctx = { db, userId: 'offline-user', email: 'offline@example.invalid', origin: 'https://offline.invalid', publicOrigin: 'https://offline.invalid' }
  const io = {
    now: () => time, sleep: async ms => { time += ms },
    mint: async () => ({ ok: true, session: { cookie: 'offline-only', dispose: async () => {} } }),
    fetch: async (url, init) => { const body = JSON.parse(init.body); posts.push({ url, body }); return respond(body, posts.length) },
  }
  const claim = (gen, status = 'pending') => {
    const old = tables.events.find(e => e.name === 'cinematic_claim' && e.id === `${ctx.userId}-${gen}`)
    if (old) old.metadata = { status }
    else tables.events.push({ id: `${ctx.userId}-${gen}`, user_id: ctx.userId, name: 'cinematic_claim', metadata: { status } })
  }
  const refunded = (gen, user = ctx.userId) => tables.credit_debits.push({ user_id: user, render_id: `cinematic-${ctx.userId}-${gen}`, refunded_at: new Date(time).toISOString() })
  return { ctx, io, tables, posts, writes, reads, errors, claim, refunded, advance: ms => { time += ms } }
}
let checks = 0
async function check(label, fn) { await fn(); checks++; console.log('PASS ' + label) }
async function createPending(w, impl = tool) {
  const created = await impl.studioCreateVideo(w.ctx, input, 7, w.io)
  assert.equal(created.ok, false); assert.equal(created.details.review_required, true)
  assert.equal(created.details.refund_pending, true); assert.equal(created.details.retryable, false)
  assert.equal(created.details.credits_charged, null); assert.equal(created.details.status, 'failed')
  assert.equal(w.posts.length, 1); const job = w.tables.mcp_studio_jobs[0]
  assert.equal(job.status, 'failed'); assert.equal(job.credits, null); assert.equal(job.dispatch.replay, undefined)
  return job
}
await check('503 explicit review creates stopped job without replay or invented charge', async () => {
  const w = world(body => answer(503, review(body))); await createPending(w)
  assert.deepEqual(w.writes.map(w => w.table), ['mcp_studio_jobs'])
})
await check('repeated status and same idempotency key never dispatch again', async () => {
  const w = world(body => answer(503, review(body))), job = await createPending(w)
  w.claim(job.generation_id)
  for (const elapsed of [130000, 300000, 3600000]) {
    w.advance(elapsed); const result = await tool.studioVideoStatus(w.ctx, job.generation_id, w.io)
    assert.equal(result.data.status, 'failed'); assert.equal(result.data.review_required, true)
    assert.equal(result.data.refund_pending, true); assert.equal(result.data.retryable, false)
    assert.doesNotMatch(result.summary, /still rendering|processing|nothing was charged|credits were returned/i)
  }
  const repeat = await tool.studioCreateVideo(w.ctx, input, 7, w.io)
  assert.equal(repeat.data.reused, true); assert.equal(repeat.data.review_required, true)
  assert.equal(w.posts.length, 1)
})
await check('existing stale replay cannot override an explicit saved review', async () => {
  const w = world(body => answer(503, review(body))), job = await createPending(w)
  job.dispatch.replay = w.posts[0].body; w.claim(job.generation_id, 'done'); w.advance(130000)
  assert.equal((await tool.studioVideoStatus(w.ctx, job.generation_id, w.io)).data.refund_pending, true)
  assert.equal(w.posts.length, 1)
})
await check('later refund evidence is read by exact owner and generation without dispatch', async () => {
  const w = world(body => answer(503, review(body))), job = await createPending(w)
  w.claim(job.generation_id, 'released'); w.refunded(job.generation_id); w.advance(130000)
  const result = await tool.studioVideoStatus(w.ctx, job.generation_id, w.io)
  assert.equal(result.data.status, 'refunded'); assert.equal(result.data.refund_pending, false)
  assert.equal(result.data.refund_confirmed, true); assert.equal(result.data.claim_released, true)
  assert.equal(w.posts.length, 1); assert.equal(job.status, 'refunded')
  const read = w.reads.find(r => r.table === 'credit_debits')
  assert.deepEqual(read.filters, [['user_id', 'offline-user'], ['render_id', `cinematic-offline-user-${job.generation_id}`]])
  assert.ok(w.writes.every(v => v.table === 'mcp_studio_jobs'))
  w.errors.add('credit_debits')
  assert.equal((await tool.studioVideoStatus(w.ctx, job.generation_id, w.io)).data.refund_confirmed, true)
  assert.equal(w.posts.length, 1)
})
await check('missing/foreign refund evidence and released claim alone do not prove refund', async () => {
  const w = world(body => answer(503, review(body))), job = await createPending(w)
  w.claim(job.generation_id, 'released'); w.refunded(job.generation_id, 'other-user'); w.advance(130000)
  assert.equal((await tool.studioVideoStatus(w.ctx, job.generation_id, w.io)).data.refund_pending, true)
  w.errors.add('credit_debits')
  assert.equal((await tool.studioVideoStatus(w.ctx, job.generation_id, w.io)).data.refund_confirmed, false)
  assert.equal(w.posts.length, 1)
})
await check('confirmed422 review keeps refund evidence and does not claim release without proof', async () => {
  const w = world(body => answer(422, review(body, { refunded: true, refundConfirmed: true })))
  const result = await tool.studioCreateVideo(w.ctx, input, 7, w.io), job = w.tables.mcp_studio_jobs[0]
  assert.equal(result.details.status, 'refunded'); assert.equal(result.details.refund_pending, false)
  assert.equal(result.details.claim_released, false); assert.match(result.error, /release.*not confirmed/)
  w.errors.add('credit_debits'); w.advance(130000)
  const status = await tool.studioVideoStatus(w.ctx, job.generation_id, w.io)
  assert.equal(status.data.refund_confirmed, true); assert.equal(status.data.claim_released, false)
  assert.equal(w.posts.length, 1)
})
await check('explicit review wins over contradictory pending:true without immediate replay', async () => {
  const w = world(body => answer(503, review(body, { pending: true }))); await createPending(w)
})
for (const kind of ['timeout', 'outage', 'unknown_review_reason', 'retryable_true', 'wrong_generation']) {
  await check(kind + ' retains established recovery', async () => {
    const w = world((body, count) => {
      if (count > 1) return answer(409, { pending: true })
      if (kind === 'timeout') throw Error('offline timeout')
      const payload = kind === 'outage' ? { error: 'offline outage' }
        : review(body, kind === 'unknown_review_reason' ? { reason: 'unknown_reason' } : kind === 'retryable_true' ? { retryable: true } : { generationId: 'other-generation' })
      return answer(503, payload)
    })
    const result = await tool.studioCreateVideo(w.ctx, input, 7, w.io), job = w.tables.mcp_studio_jobs[0]
    assert.equal(result.ok, false); assert.equal(job.status, 'processing'); assert.ok(job.dispatch.replay)
    w.claim(job.generation_id); w.advance(130000)
    const status = await tool.studioVideoStatus(w.ctx, job.generation_id, w.io)
    assert.equal(w.posts.length, 2); assert.equal(status.data.reconnected, true)
    assert.equal(w.posts[1].body.generationId, w.posts[0].body.generationId)
  })
}
await check('timeout recovery that reaches review discards replay before later status calls', async () => {
  const w = world((body, count) => { if (count === 1) throw Error('offline timeout'); return answer(503, review(body)) })
  await tool.studioCreateVideo(w.ctx, input, 7, w.io)
  const job = w.tables.mcp_studio_jobs[0]; w.claim(job.generation_id); w.advance(130000)
  const first = await tool.studioVideoStatus(w.ctx, job.generation_id, w.io)
  assert.equal(first.data.review_required, true); assert.equal(first.data.refund_pending, true)
  assert.equal(first.data.status, 'failed'); assert.equal(job.dispatch.replay, undefined); assert.equal(job.credits, null)
  for (let i = 0; i < 3; i++) {
    w.advance(130000); const status = await tool.studioVideoStatus(w.ctx, job.generation_id, w.io)
    assert.equal(status.data.review_required, true); assert.equal(status.data.refund_pending, true)
  }
  assert.equal(w.posts.length, 2)
})
await check('ordinary pending409 reconnects immediately using the same generation', async () => {
  const w = world((body, count) => count === 1 ? answer(409, { pending: true }) : answer(200, { cost: 7 }))
  assert.equal((await tool.studioCreateVideo(w.ctx, input, 7, w.io)).ok, true)
  assert.equal(w.posts.length, 2); assert.equal(w.posts[0].body.generationId, w.posts[1].body.generationId)
})
await check('preflight422 remains a refusal without a job or financial claim', async () => {
  const w = world(() => answer(422, { reason: 'brief_requires_review', review_required: true, retryable: false, charged: false, error: 'Review your narration.' }))
  assert.equal((await tool.studioCreateVideo(w.ctx, input, 7, w.io)).details.reason, 'brief_requires_review')
  assert.equal(w.tables.mcp_studio_jobs.length, 0); assert.equal(w.posts.length, 1)
})
await check('mutants of review classification and status early-return are rejected', async () => {
  const noClassification = moduleUnderTest((rel, src) => rel === 'lib/mcp/studioTools.ts' ? src.replace("if (status < 400 ||", "if (true || status < 400 ||") : src)
  await assert.rejects(createPending(world(body => answer(503, review(body))), noClassification))
  const noStatusStop = moduleUnderTest((rel, src) => rel === 'lib/mcp/studioTools.ts' ? src.replace('  if (review) {\n    const { data: debit', '  if (false && review) {\n    const { data: debit') : src)
  const w = world(body => answer(503, review(body))), job = await createPending(w, noStatusStop)
  job.dispatch.replay = w.posts[0].body; w.claim(job.generation_id); w.advance(130000)
  const status = await noStatusStop.studioVideoStatus(w.ctx, job.generation_id, w.io)
  assert.equal(w.posts.length, 2); assert.equal(status.data.review_required, true) // later guard recovers, but the forbidden extra POST exposes the mutant
})
console.log(`PEDIDO-MCP-2610 PASS: ${checks} groups, two behavioral mutants, no external I/O.`)
