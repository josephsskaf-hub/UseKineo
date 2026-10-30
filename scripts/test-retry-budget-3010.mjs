// Actual signed retry POST with synthetic DB/providers. No network or paid render.
import assert from 'node:assert/strict'
import { fixture } from './test-support/retry-budget-fixture-3010.mjs'

let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const classic = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const make = (options = {}) => {
  const f = fixture({ model: classic, body: { sanitize: false }, ...options })
  f.updateBirth(md => { md.response.scene_fal_inputs = [
    { prompt: 'The original signed coast storm scene with ample detail.', seed: 4242, duration: '8', generate_audio: false },
    { prompt: 'The approved signed scene beside the coast.', seed: 4242, duration: '8', generate_audio: false },
  ] })
  return f
}
const retryAgain = f => {
  const id = f.birth.metadata.fal_request_ids[0]
  f.updateBirth(md => { md.response.terminal_failed_jobs.push({ requestId: id, model: f.body.model }) })
  return f.post({ oldRequestId: id })
}

{
  const f = make(), first = await f.post()
  check(first.status === 200 && f.posts.length === 1, 'First retry uses the real route and one Fal POST')
  check(f.posts[0].body.seed === 4242 && f.posts[0].body.prompt === f.birth.metadata.response.scene_fal_inputs[0].prompt,
    'Technical retry preserves original prompt and seed')
  const before = JSON.stringify(f.birth.metadata.authorized_completed_urls)
  const second = await retryAgain(f), third = await retryAgain(f)
  check(second.status === 200 && third.status === 409 && third.body.reason === 'scene_retry_exhausted',
    'Changed provider IDs and fresh requests still share a maximum of two retries')
  check(f.posts.length === 2 && f.openaiPosts.length === 0, 'Exhaustion cannot issue a third provider POST or rewrite')
  check(JSON.stringify(f.birth.metadata.authorized_completed_urls) === before, 'Approved sibling remains unchanged')
  check(f.events.filter(e => e.name === 'cinematic_scene_retry_budget').length === 2, 'Two durable PK slots enforce the cap')
}
{
  const f = fixture({ body: { sanitize: false } })
  const exact = { prompt: '  Original signed cinematic scene with exact whitespace.  ', seed: 7319, duration: 8, resolution: '768P', aspect_ratio: '1:1' }
  f.updateBirth(md => { md.response.scene_fal_inputs = [exact, null] })
  check((await f.post()).status === 200 && JSON.stringify(f.posts[0].body) === JSON.stringify(exact), 'Hollywood replays newly signed payload byte for byte, including seed and whitespace')
}
{
  const f = make({ noReadyClip: true })
  f.updateBirth(md => md.response.terminal_failed_jobs.push({ requestId: 'ready-request-id', model: classic }))
  check((await f.post()).status === 200 && f.posts.length === 1, 'All-dead batch can retry a proven terminal scene before refund')
  const unproven = make({ noReadyClip: true })
  check((await unproven.post()).status === 409 && unproven.posts.length === 0, 'Zero approved scenes does not authorize unresolved siblings')
  const empty = make({ noReadyClip: true, nullId: true })
  check((await empty.post()).status === 409 && empty.posts.length === 0, 'Empty/ambiguous slots never gain all-dead permission')
}
{
  const f = make(); f.advance(70 * 60_000)
  check((await f.post()).body.reason === 'scene_retry_expired' && f.posts.length === 0, 'Time cap applies to cookie callers before spend')
  const s = make(); s.advance(70 * 60_000)
  const reply = await s.route.POST({ headers: { get: key => key === 'authorization' ? 'Bearer offline-cron-secret' : key === 'x-kineo-service-user' ? s.userId : null }, json: async () => s.body })
  check(reply.status === 409 && s.posts.length === 0, 'Service callers share the same signed time cap')
}
{
  const f = make({ budgetInsertError: true }), r = await f.post()
  check(r.status === 503 && r.body.reason === 'scene_retry_unavailable' && f.posts.length === 0, 'Unavailable reservation fails closed before provider')
  check(!f.mutex(), 'Reservation failure releases the compose mutex')
}
{
  const f = make()
  const legacy = n => ({ id: `legacy-${n}`, name: 'hollywood_scene_retried', path: '/api/retry-hollywood-scene', user_id: f.userId,
    session_id: f.generationId, metadata: { scene_index: 0, new_request_id: `legacy-job-${n}` } })
  f.events.push(legacy(1), { ...legacy(1), id: 'duplicate-legacy' })
  check((await f.post()).status === 200 && f.posts.length === 1, 'Duplicate legacy analytics count as one prior replacement')
  check((await retryAgain(f)).body.reason === 'scene_retry_exhausted' && f.posts.length === 1, 'Legacy plus new reservation cannot exceed two')
}
{
  let resume, entered
  const gate = new Promise(r => { entered = r }), hold = new Promise(r => { resume = r })
  const f = make({ onFetch: async () => { entered(); await hold } })
  const a = f.post(); await gate
  const b = await f.post(); resume(); const done = await a
  check(b.status === 409 && done.status === 200 && f.posts.length === 1, 'Overlapping callers cannot buy a second provider job')
  check(f.events.filter(e => e.name === 'cinematic_scene_retry_budget').length === 1, 'Mutex collision cannot consume another budget slot')
}
{
  const f = make({ outcomes: [422, 422] })
  await f.post(); await f.post(); const third = await f.post()
  check(f.posts.length === 2 && third.body.reason === 'scene_retry_exhausted', 'Explicit rejected POSTs also consume the finite attempt budget')
}
console.log(`retry-budget-3010: ${checks} passed; actual POST, HMAC, CAS, synthetic providers; cost $0`)
