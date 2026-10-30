// OBRA 1: real recovery/claim/retry/finalizer, synthetic DB and providers. $0, no network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { fixture } from './test-support/retry-budget-fixture-3010.mjs'
import { execFileSync } from 'node:child_process'
import { CENA_RECOVERY_3010, semCenaRecovery3010, deltaCenaRecovery3010Exato } from './test-support/desfaz-cena-recovery-3010.mjs'
let checks = 0
const check = (value, label) => { assert.ok(value, label); checks++; console.log('ok ' + label) }
const clone = x => JSON.parse(JSON.stringify(x))
class NextRequest {
  constructor(url, init = {}) { this.nextUrl = new URL(url); this.body = init.body; this.headers = new Headers(init.headers) }
  async json() { return JSON.parse(this.body) }
}
const model = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
function world(opts = {}) {
  const refunds = [], config = { ...opts, model, body: { sanitize: false }, mocks: {
    'next/server': { NextRequest, NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200, json: async () => body }) } },
    '@/lib/credits/refund': { refundRenderCredits: async ref => {
      refunds.push(ref)
      if (opts.refund) return opts.refund(ref, config)
      config.debits = [{ render_id: ref, refunded_at: new Date().toISOString() }]
      return refunds.length === 1 ? 45 : 0
    } },
    ...(opts.mocks ?? {}),
  } }
  const f = fixture(config)
  const exact = i => ({ prompt: `  Exact signed prompt for scene ${i} with sufficient description.  `, seed: 7319 + i, duration: '5', aspect_ratio: '9:16', generate_audio: false })
  f.updateBirth(md => { md.response.scene_fal_inputs = [exact(0), exact(1)] })
  f.advance(600_000)
  const recovery = f.load('@/lib/cinematic/sceneRecovery'), finalizer = f.load('@/lib/cinematic/sceneFailureFinalizer')
  const args = { db: f.db, secret: f.secret, userId: f.userId, generationId: f.generationId }
  const current = async () => (await f.claims.loadVerifiedCinematicClaim(args)).claim
  const failed = async () => (await current()).falRequestIds.map((id, index) => ({ index, requestId: id, model, http: 503, message: 'Service at capacity' }))
  const completed = async () => { const c = await current(); return c.authorizedCompletedUrls.flatMap((url, i) => url ? [{ requestId: c.falRequestIds[i], model, url }] : []) }
  return { ...f, config, refunds, args, current, failed, completed, recovery,
    recover: async (failures) => recovery.recoverSceneFailures({ ...args, failures: failures ?? (await failed()).filter(x => !f.birth.metadata.authorized_completed_urls[x.index]), completed: await completed(), via: 'cron' }),
    finalize: async allFailed => { const c = await current(); return finalizer.finalizeSceneFailure({ ...args, ids: c.falRequestIds, models: c.falModels, allFailed }) },
  }
}
{
  const jobs = new Map([['old-request-id', false], ['ready-request-id', false]])
  const f = world({ noReadyClip: true, mocks: {
    '@fal-ai/client': { fal: { config() {}, queue: {
      status: async (_m, { requestId }) => ({ status: 'COMPLETED', request_id: requestId,
        ...(jobs.get(requestId) === false ? { error: 'Service at capacity' } : {}) }),
      result: async (_m, { requestId }) => ({ data: { video: { url: `https://fixture.invalid/${requestId}.mp4` } } }),
    } } },
    '@/lib/kling4Trial': { KLING4_T2V_MODEL: 'k4-t2v', KLING4_I2V_MODEL: 'k4-i2v' },
    '@/lib/kling4TrialAsyncStatus': { kling4TrialPollIdsMatch: (ids, c) => JSON.stringify(ids) === JSON.stringify(c.falRequestIds), advanceKling4TrialStatus: async a => ({ kind: 'ordinary', claim: a.claim }) },
    '@/lib/kling4PaidAsyncStatus': { kling4PaidMarker: () => null, kling4PaidPollIdsMatch: () => false },
  } })
  const status = f.load('app/api/cinematic-clip-status/route.ts')
  const ids = ['old-request-id', 'ready-request-id']
  const poll = () => status.GET(new NextRequest(`https://fixture.invalid/api/cinematic-clip-status?generationId=${f.generationId}&ids=${encodeURIComponent(JSON.stringify(ids))}`))
  const first = await poll()
  check(first.status === 200 && !first.body.allDone && first.body.sceneRetryIds[0] === 'new-request-id-1' && f.refunds.length === 0, 'actual authenticated GET recovers 0/N before all-failed refund')
  const second = await poll()
  check(second.status === 200 && second.body.sceneRetryIds[1] === 'new-request-id-2' && f.posts.length === 2, 'old browser ids follow signed server replacement and recover next scene')
  const done = await poll()
  check(done.status === 200 && done.body.allDone && done.body.done === 2 && f.refunds.length === 0, 'actual status flow delivers every recovered scene without another debit')
}
{
  const f = world(), original = clone(f.birth.metadata.response.scene_fal_inputs[0]), sibling = f.birth.metadata.authorized_completed_urls[1]
  const r = await f.recover()
  check(r.reenviadas === 1 && r.segurar && f.posts.length === 1, '503 replaces only the failed scene and waits, no refund')
  check(JSON.stringify(f.posts[0].body) === JSON.stringify(original), 'technical retry preserves exact prompt, seed and payload')
  check(r.claim.authorizedCompletedUrls[1] === sibling && r.claim.falRequestIds[1] === 'ready-request-id', 'approved sibling remains unchanged')
  check(f.refunds.length === 0 && !f.operations.some(o => o.table === 'credit_debits' && o.action !== 'select'), 'no new customer debit or refund during recovery')
  check(f.recovery.sceneRetryPollIdsMatch(['old-request-id', 'ready-request-id'], r.claim) && !f.recovery.sceneRetryPollIdsMatch(['foreign', 'ready-request-id'], r.claim), 'old owner poll follows signed lineage; arbitrary job does not')
  f.events.splice(f.events.findIndex(e => e.name === 'hollywood_scene_retried'), 1)
  f.advance(120_000)
  check((await f.recover()).reenviadas === 0 && f.posts.length === 1, 'durable budget enforces backoff even with missing success analytics')
  f.advance(181_000)
  check((await f.recover()).reenviadas === 1 && f.posts.length === 2, 'second retry opens after backoff')
  f.advance(301_000)
  check(!(await f.recover()).segurar && f.posts.length === 2, 'finite budget ends recovery after repeated terminal failures')
}
{
  const f = world({ noReadyClip: true })
  f.updateBirth(md => { md.response.terminal_failed_jobs.push({ requestId: 'ready-request-id', model }) })
  const first = await f.recover()
  check(first.reenviadas === 1 && first.segurar && f.posts.length === 1, '0/N terminal transient batch recovers one slot before refund')
  check(!f.events.some(e => e.name === 'cinematic_scene_retry' && e.metadata.fase === 'tentativa' && e.metadata.scene_index === 1), '0/N deferral never consumes remaining scene attempt markers')
  const c = await f.current()
  await f.claims.authorizeCinematicCompletedUrls({ ...f.args, completed: [{ requestId: c.falRequestIds[0], model, url: 'https://fixture.invalid/recovered-0.mp4' }] })
  const next = await f.recover()
  check(next.reenviadas === 1 && next.claim.authorizedCompletedUrls[0] === 'https://fixture.invalid/recovered-0.mp4', 'after first recovery the remaining failed scene can still retry')
}
{
  let enter, resume
  const entered = new Promise(r => { enter = r }), held = new Promise(r => { resume = r })
  const f = world({ onFetch: async () => { enter(); await held } })
  const first = f.recover(); await entered
  const second = await f.recover(), closed = await f.finalize(false)
  check(second.segurar && !closed.closed && f.refunds.length === 0 && f.posts.length === 1, 'overlapping recovery/finalizer cannot refund beneath an in-flight paid POST')
  resume(); await first
}
{
  const f = world({ noReadyClip: true })
  f.updateBirth(md => { md.response.terminal_failed_jobs.push({ requestId: 'ready-request-id', model }) })
  const r = await f.finalize(true)
  check(r.closed && f.refunds.length === 1 && (await f.current()).status === 'released', 'terminal failure uses existing refund and closes signed claim')
  const again = await f.finalize(true)
  check(again.closed && f.refunds.length === 1, 'finalization replay never calls refund again')
}
{
  const f = world({ noReadyClip: true })
  f.updateBirth(md => { md.response.terminal_failed_jobs.push({ requestId: 'ready-request-id', model }) })
  f.config.retargetFails = true
  check(!(await f.finalize(true)).closed && f.mutex() && f.refunds.length === 1, 'refund succeeded but claim release failed: lock retained')
  check((await f.post()).status === 409 && f.posts.length === 0, 'retained finalizer lock forbids another paid retry after refund')
  f.config.retargetFails = false
  check(!(await f.finalize(false)).closed, 'a second finalizer cannot take a still-live lease, even with the same intent')
  f.advance(360_001)
  check((await f.finalize(false)).closed && (await f.current()).status === 'released' && !f.mutex(), 'cron resumes status finalizer after bounded lease, confirms previous refund and unlocks')
}
{
  const f = world({ noReadyClip: true, outcomes: [422, 200] })
  f.updateBirth(md => { md.response.terminal_failed_jobs.push({ requestId: 'ready-request-id', model }) })
  check((await f.recover()).reenviadas === 0 && f.posts.length === 1, 'zero-ready first replacement can be explicitly rejected without creating a new job')
  f.advance(301_000)
  const next = await f.recover()
  check(next.reenviadas === 1 && f.posts[1].body.seed === 7320, 'finished attempt is skipped before round limit; next untouched scene still recovers')
}
{
  let enter, resume
  const entered = new Promise(r => { enter = r }), held = new Promise(r => { resume = r })
  const f = world({ noReadyClip: true, refund: async () => { enter(); await held; return 45 } })
  f.updateBirth(md => { md.response.terminal_failed_jobs.push({ requestId: 'ready-request-id', model }) })
  const first = f.finalize(true); await entered
  const second = await f.finalize(false)
  check(!second.closed && f.mutex() && f.refunds.length === 1, 'two finalizers cannot share ownership or unlock the live refund invocation')
  check((await f.post()).status === 409 && f.posts.length === 0, 'retry remains excluded while live finalizer owns lease')
  resume(); check((await first).closed, 'original finalizer alone completes refund and release')
}
{
  const f = world(), ids = clone(f.birth.metadata.fal_request_ids)
  await f.post()
  const r = await f.load('@/lib/cinematic/sceneFailureFinalizer').finalizeSceneFailure({ ...f.args, ids, models: [model, model], allFailed: true })
  check(!r.closed && f.refunds.length === 0, 'stale snapshot cannot refund a retargeted generation')
}
{
  const f = world()
  f.updateBirth(md => {
    md.fal_request_ids = ['ready-a', 'ready-b', 'failed-c', null]; md.response.fal_request_ids = md.fal_request_ids
    md.fal_models = [model, model, model, model]; md.response.fal_models = md.fal_models
    md.authorized_completed_urls = ['https://fixture.invalid/a.mp4', 'https://fixture.invalid/b.mp4', null, null]
    md.response.terminal_failed_jobs = [{ requestId: 'failed-c', model }]
  })
  check(!(await f.finalize(false)).closed && f.refunds.length === 0, 'partial recovery threshold counts accepted jobs, excluding null slots, exactly like the collector')
}
{
  const src = fs.readFileSync('app/api/cron/finish-stranded-renders/route.ts', 'utf8')
  const node = ts.createSourceFile('cron.ts', src, ts.ScriptTarget.Latest, true).statements.find(n => n.name?.text === 'collectFinishedClips')
  const source = node.getText() + '\nglobalThis.collect = collectFinishedClips;'
  let gets = 0
  const sandbox = { console: { warn() {} }, process: { env: { FAL_KEY: 'offline' } }, STALE_SCENE_MINUTES: 120,
    fal: { config() {}, queue: { status: async (_m, { requestId }) => { gets++; return { status: 'COMPLETED', request_id: requestId } }, result: async () => { throw Object.assign(Error('lookup unavailable'), { status: 503 }) } } } }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: 9, module: 1 } }).outputText, sandbox)
  const trace = { falhas: [], prontas: [] }
  const r = await sandbox.collect(['approved', 'unreadable'], [model, model], 10, trace, false, ['https://fixture.invalid/good.mp4', null])
  check(r.state === 'pending' && r.dead === 0 && trace.falhas.length === 0, 'result GET 503 is pending, never a dead job or refund proof')
  check(gets === 1 && trace.prontas[0].requestId === 'approved', 'authorized scene survives provider outage without another GET')
  sandbox.fal.queue.status = async () => ({ status: 'COMPLETED', request_id: 'failed', error: 'Service at capacity' })
  const failed = { falhas: [], prontas: [] }
  await sandbox.collect(['failed'], [model], 10, failed)
  check(failed.falhas.length === 1 && failed.falhas[0].requestId === 'failed', 'identity-confirmed job error feeds scene recovery directly')
}
{
  for (const file of [...Object.keys(CENA_RECOVERY_3010.scope), ...Object.keys(CENA_RECOVERY_3010.addedSources)]) {
    const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
    const before = CENA_RECOVERY_3010.scope[file] ? execFileSync('git', ['show', `${CENA_RECOVERY_3010.base}:${file}`], { encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n') : null
    assert.equal(deltaCenaRecovery3010Exato(source, before, file), true)
    assert.equal(deltaCenaRecovery3010Exato(source + '\n// unknown\n', before, file), false)
    if (before !== null) assert.equal(semCenaRecovery3010(source, file).replace(/\r\n/g, '\n'), before)
  }
  check(true, 'exact receipt restores every changed source and rejects unknown edits, including new sources')
}
console.log(`cena-recovery-3010: ${checks} passed; real HMAC/POST/retarget/refund coordinator, synthetic providers; cost $0`)
