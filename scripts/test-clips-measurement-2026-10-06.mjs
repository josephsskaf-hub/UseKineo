import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const M = 'lib/clips/clipMeasurement.ts', ROUTE = 'app/api/clips/route.ts'
const plain = x => JSON.parse(JSON.stringify(x))
const originCases = [
  ['/clips?effect=melt&clip_origin=effect_page', '', [], 'effect_page', 'url_marker'],
  ['/clips?effect=melt', '', ['https://www.usekineo.com/'], 'home', 'same_site_navigation'],
  ['/clips?effect=melt', '', ['https://www.usekineo.com/signup?redirect=%2Fclips%3Feffect%3Dmelt', 'https://www.usekineo.com/'], 'home', 'same_site_navigation'],
  ['/clips?effect=melt', 'https://www.usekineo.com/effects/melt/pt', [], 'effect_page', 'same_site_referrer'],
  ['/clips?effect=melt', '', [], 'unknown', 'unknown'],
  ['/clips?effect=melt', 'https://www.usekineo.com/', ['https://www.usekineo.com/pricing'], 'unknown', 'unknown'],
  ['/clips?effect=melt', '', ['https://elsewhere.test/'], 'unknown', 'unknown'],
  ['/clips', '', [], 'clips', 'current_surface'],
  ['/clips?effect=melt&clip_origin=private-text', '', [], 'unknown', 'unknown'],
]
function source(mutation, off = false) {
  return (file, text) => {
    if (mutation && file === mutation[0]) text = text.replace(mutation[1], mutation[2])
    if (off && file === M) text = text.replace('CLIP_MEASUREMENT_ENABLED = true', 'CLIP_MEASUREMENT_ENABLED = false')
    return text
  }
}
function checkPure(mutation) {
  const load = createOfflineLoader({ source: source(mutation) }), m = load(M)
  for (const [path, ref, history, origin, evidence] of originCases) {
    assert.deepEqual(plain(m.clipOriginForEntry('https://www.usekineo.com' + path, ref, history)), { origin, evidence }, path)
  }
  assert.deepEqual(plain(m.clipOriginForEntry('invalid')), { origin: 'unknown', evidence: 'unknown' })
  for (const bad of [null, 'home', { origin: 'email', evidence: 'url_marker' }, { origin: ['home'], evidence: ['url_marker'] }, { origin: 'home', evidence: 'current_surface' }]) {
    assert.deepEqual(plain(m.clipOriginMetadata(bad)), { clip_origin: 'unknown', clip_origin_evidence: 'unknown' })
  }
  const clean = m.clipOriginMetadata({ origin: 'home', evidence: 'same_site_navigation', prompt: 'private', image: 'private', user_id: 'forged', is_bot: false })
  assert.deepEqual(plain(clean), { clip_origin: 'home', clip_origin_evidence: 'same_site_navigation' })
  assert.equal(m.clipMeasurementVersion().clip_measurement_version, 'clips_journey_20261006_v1')
  const old = createOfflineLoader({ source: source(null, true) })(M)
  assert.deepEqual(plain(old.clipMeasurementVersion()), {})
  assert.deepEqual(plain(old.clipOriginMetadata({ origin: 'home', evidence: 'url_marker' })), {})
}
async function checkDedupe(mutation) {
  const m = createOfflineLoader({ source: source(mutation) })(M)
  const map = new Map(), storage = { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) }
  const gate = m.createClipMeasurementGate()
  let calls = 0, release
  const send = () => { calls++; return new Promise(r => { release = r }) }
  const first = gate('person-page', storage, send)
  assert.equal(await gate('person-page', storage, async () => { calls++; return 'stored' }), false)
  release('stored'); await first
  await gate('person-page', storage, async () => { calls++; return 'stored' })
  assert.equal(calls, 1, 'Concurrent events and remounts do not duplicate')
  await m.createClipMeasurementGate()('person-page', storage, async () => { calls++; return 'stored' })
  assert.equal(calls, 1, 'Reload reads confirmed local storage')
  let retries = 0
  const retrySend = async () => (++retries === 1 ? 'ambiguous' : 'stored')
  assert.equal(await gate('retry', storage, retrySend), false)
  assert.equal(await gate('retry', storage, retrySend), true)
  assert.equal(retries, 2, 'Ambiguous storage must not close dedupe')
  assert.equal(await gate('blocked-storage', { getItem() { throw Error() }, setItem() { throw Error() } }, async () => 'stored'), true)
}
async function checkRoute(mutation, off = false) {
  let signedIn = true, replay = false, success = true, ua = 'Mozilla/5.0', submitCount = 0
  const events = []
  const real = createOfflineLoader({ source: source(mutation, off) })
  const fx = real('lib/clips/clipEffects.ts'), effect = fx.clipEffectByKey('melt')
  const clip = { id: 'fixture-clip', user_id: 'fixture-person', prompt: effect.prompt, engine: effect.engine, seconds: effect.seconds, credits: 5, mode: 'image',
    status: 'processing', fal_request_id: 'fixture-fal-request', created_at: new Date(Date.now() - 60000).toISOString() }
  const load = createOfflineLoader({ source: source(mutation, off), mocks: {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body: plain(body), status: init.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'fixture-person' } : null } }) } }) },
    '@/lib/growth/homeClipsFirstServer': { homeVariantStamp: () => ({ home_variant: 'B' }) },
    '@/lib/serverEvents': { writeServerEvent: async event => { events.push(event); return true } },
    '@/lib/clips/clipFlow': { submitClip: async (_, request) => {
      submitCount++
      assert.equal(request.body.prompt, effect.prompt, 'Client attribution cannot rewrite the prompt')
      return success ? { ok: true, status: 200, replay, balance: 10, clip } : { ok: false, status: 402, error: 'fixture', code: 'credits' }
    } },
    '@/lib/clips/clipServer': { clipsAdmin: () => ({}), loadClipAccount: async () => ({}), submitDepsFor: () => ({}), toPublicClip: x => x },
  } })
  const route = load(ROUTE)
  let body = { effect: 'melt', image_url: 'https://example.test/photo', clip_origin: { origin: 'home', evidence: 'same_site_navigation', secret: 'private' }, is_bot: false }
  const req = { json: async () => body, headers: { get: k => k === 'user-agent' ? ua : 'fixture-idempotency-key' } }
  assert.equal((await route.POST(req)).status, 200)
  assert.equal(events.length, 1)
  let metadata = events[0].metadata
  assert.equal(events[0].userId, 'fixture-person')
  assert.equal(metadata.effect, 'melt')
  if (off) {
    for (const key of ['clip_measurement_version', 'clip_origin', 'is_bot']) assert.equal(metadata[key], undefined)
    return
  }
  assert.equal(metadata.clip_measurement_version, 'clips_journey_20261006_v1')
  assert.equal(metadata.clip_origin, 'home')
  assert.equal(metadata.is_bot, false)
  assert.ok(!JSON.stringify(metadata).includes('private'))
  replay = true; await route.POST(req); assert.equal(events.length, 1, 'Replay is not another choice')
  replay = false; success = false; await route.POST(req); assert.equal(events.length, 1, 'Rejected generation is not chosen')
  success = true; ua = 'KnownCrawlerBot'; body = { ...body, clip_origin: null }
  await route.POST(req); metadata = events.at(-1).metadata
  assert.equal(metadata.is_bot, true, 'Server overrides client bot claim')
  assert.equal(metadata.clip_origin, 'unknown', 'Home experiment variant is not origin evidence')
  signedIn = false; const count = submitCount; assert.equal((await route.POST(req)).status, 401); assert.equal(submitCount, count)
  const ready = []
  let moved = true
  const settle = {
    now: () => Date.now(), poll: async () => ({ state: 'done', url: 'https://example.test/provider.mp4' }),
    persist: async () => 'https://example.test/ours.mp4',
    markDone: async () => { const old = moved; moved = false; return old },
    event: async (name, metadata) => ready.push({ name, metadata }),
  }
  await real('lib/clips/clipFlow.ts').settleClip(settle, clip)
  await real('lib/clips/clipFlow.ts').settleClip(settle, clip)
  const delivered = ready.filter(e => e.name === 'clip_effect_ready')
  assert.equal(delivered.length, 1)
  assert.equal(delivered[0].metadata.clip_id, metadata.clip_id)
  assert.equal(delivered[0].metadata.clip_measurement_version, 'clips_journey_20261006_v1')
}
checkPure()
await checkDedupe()
await checkRoute()
await checkRoute(null, true)
const report = createOfflineLoader()('lib/clips/clipMeasurementReport.ts')
const sql = report.clipMeasurementReportQuery('2026-10-06T03:00:00Z', '2026-10-07T03:00:00Z')
assert.ok(!/\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)\b/.test(sql), 'Report only reads')
assert.ok(sql.includes('count(DISTINCT c.user_id)') && sql.includes('count(DISTINCT r.user_id)'))
assert.ok(sql.includes("AND r.user_id = c.user_id") && sql.includes("r.metadata->>'clip_id' = c.clip_id AND r.metadata->>'effect' = c.effect"))
assert.ok(sql.includes("e.metadata->>'is_bot' = 'false'"))
assert.ok(sql.includes("e.metadata->>'clip_browser_persistent' = 'true'"))
assert.ok(sql.includes("AND e.metadata->>'clip_measurement_version' ="))
assert.throws(() => report.clipMeasurementReportQuery('bad', '2026-10-07'))
const ui = fs.readFileSync('lib/clips/ClipTelemetry.tsx', 'utf8')
assert.ok(ui.includes('trackClosedEvent') && ui.includes('!event.isTrusted') && ui.includes("document.visibilityState === 'visible'"))
assert.ok(ui.includes("surface === 'effect_page' ? effect : chosenEffect || null"), 'Related click stays on the source page denominator')
assert.ok(fs.readFileSync('app/(dashboard)/clips/ClipsClient.tsx', 'utf8').includes('clip_origin: readClipEntryOrigin()'))
const mutants = [
  ['preset falsely attributed home', M, "return current.searchParams.has('effect') ? unknownOrigin()", "return current.searchParams.has('effect') ? { origin: 'home', evidence: 'url_marker' }", checkPure],
  ['unbounded metadata', M, 'return { clip_origin: info.origin, clip_origin_evidence: info.evidence }', 'return { ...raw, clip_origin: info.origin, clip_origin_evidence: info.evidence }', checkPure],
  ['retry closes too early', M, "if (await send() !== 'stored') return false", "await send()", checkDedupe],
  ['remount duplicates', M, 'if (pending.has(key) || stored.has(key)) return false', 'if (false) return false', checkDedupe],
  ['chosen repeats on replay', ROUTE, 'effect && result.ok && !result.replay', 'effect && result.ok', checkRoute],
  ['client bot spoof', ROUTE, "isLikelyBot(req.headers.get('user-agent'))", 'false', checkRoute],
  ['lost origin', ROUTE, 'clipOriginMetadata(body.clip_origin)', 'clipOriginMetadata(null)', checkRoute],
  ['lost version', M, 'CLIP_MEASUREMENT_ENABLED ? { clip_measurement_version: CLIP_MEASUREMENT_VERSION } : {}', '{}', checkPure],
]
for (const [name, file, from, to, check] of mutants) {
  assert.ok(fs.readFileSync(file, 'utf8').includes(from), 'Anchor: ' + name)
  let failed = false
  try { await check([file, from, to]) } catch { failed = true }
  assert.ok(failed, 'Mutant must turn red: ' + name)
  console.log('Mutant rejected: ' + name)
}
console.log('PASS: real route/settlement, origin evidence, first gesture/impression dedupe, rollback, read-only person report, 8 mutants.')
