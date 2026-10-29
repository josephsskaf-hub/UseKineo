// Offline: node --test tests/kling4TrialAvailability.test.mjs. No env files, credentials, writes or network.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const forbidden = () => { throw new Error('Offline availability test forbids network/unsupported module') }
function load(path, mocks = {}, cache = new Map(), env = {}) {
  if (cache.has(path)) return cache.get(path)
  const exports = {}
  cache.set(path, exports)
  const code = ts.transpileModule(readFileSync(join(root, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, {
    exports, Date, console, Response, Request, URL, Headers,
    AbortSignal: { timeout: () => new AbortController().signal },
    process: { env }, fetch: forbidden,
    require(specifier) {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier]
      if (specifier.startsWith('@/')) return load(specifier.slice(2) + '.ts', mocks, cache, env)
      return forbidden()
    },
  }, { filename: path, timeout: 5000 })
  return exports
}
const lib = load('lib/kling4TrialAvailability.ts')
const now = new Date('2026-10-28T17:00:00.000Z')
function database(result, shouldThrow = false) {
  const calls = []
  const query = {
    select(name) { calls.push(['select', name]); return this },
    eq(name, value) { calls.push(['eq', name, value]); return this },
    abortSignal() { calls.push(['abortSignal']); return this },
    async maybeSingle() { if (shouldThrow) throw new Error('offline'); return result },
  }
  return { calls, from(name) { calls.push(['from', name]); return query } }
}
const opts = { now, country: 'US' }

test('announcement uses the exact current daily ledger and next-film allowance', async () => {
  for (const reserved of [0, 2355, 57645]) {
    const db = database({ data: { reserved_milliusd: reserved }, error: null })
    const state = await lib.readKling4TrialAvailability(db, opts)
    assert.equal(state.available, true)
    assert.equal(state.utcDay, '2026-10-28')
    assert.deepEqual(db.calls.slice(0, 3), [['from', 'kling4_trial_days'], ['select', 'reserved_milliusd'], ['eq', 'request_day', '2026-10-28']])
    assert.deepEqual(Object.keys(state).sort(), ['available', 'checkedAt', 'utcDay', 'validUntil'])
  }
  for (const reserved of [57646, 58875, 60000]) {
    assert.equal((await lib.readKling4TrialAvailability(database({ data: { reserved_milliusd: reserved } }), opts)).available, false)
  }
  assert.equal((await lib.readKling4TrialAvailability(database({ data: null, error: null }), opts)).available, true, 'known-empty UTC day has capacity')
})

test('the same policy switch disables display without a database read', async () => {
  const disabled = load('lib/kling4TrialAvailability.ts', { '@/lib/kling4TrialPolicy': { KLING4_TRIAL_LIVE: false } })
  const db = database({ data: null })
  assert.equal((await disabled.readKling4TrialAvailability(db, opts)).available, false)
  assert.equal(db.calls.length, 0)
})

test('known blocked countries hide it; unknown country follows the existing grant policy', async () => {
  for (const country of ['MX', 'IN', 'NG']) {
    const db = database({ data: null })
    assert.equal((await lib.readKling4TrialAvailability(db, { now, country })).available, false)
    assert.equal(db.calls.length, 0)
  }
  for (const country of ['BR', 'US', 'PT', null, undefined, 'XX', 'T1']) {
    assert.equal((await lib.readKling4TrialAvailability(database({ data: null }), { now, country })).available, true)
  }
})

test('missing config, errors, malformed data and missing migration fail closed', async () => {
  assert.equal((await lib.readKling4TrialAvailability(null, opts)).available, false)
  const failures = [
    { error: { message: 'relation does not exist' }, data: null },
    { data: undefined }, { data: {} }, { data: { reserved_milliusd: '0' } },
    { data: { reserved_milliusd: -1 } }, { data: { reserved_milliusd: 0.5 } },
    { data: { reserved_milliusd: 60001 } }, { data: { reserved_milliusd: NaN } },
  ]
  for (const result of failures) assert.equal((await lib.readKling4TrialAvailability(database(result), opts)).available, false)
  assert.equal((await lib.readKling4TrialAvailability(database({}, true), opts)).available, false)
})

test('positive state expires after fifteen seconds and never crosses UTC rollover', async () => {
  const fresh = await lib.readKling4TrialAvailability(database({ data: null }), opts)
  assert.equal(fresh.checkedAt, now.toISOString())
  assert.equal(fresh.validUntil, '2026-10-28T17:00:15.000Z')
  const rollover = await lib.readKling4TrialAvailability(database({ data: null }), { now: new Date('2026-10-28T23:59:59.000Z'), country: 'US' })
  assert.equal(rollover.validUntil, '2026-10-29T00:00:00.000Z')
  const next = await lib.readKling4TrialAvailability(database({ data: null }), { now: new Date('2026-10-29T00:00:00.000Z'), country: 'US' })
  assert.equal(next.utcDay, '2026-10-29')
})

test('public route never caches, ignores query overrides and exposes only display state', async () => {
  const db = database({ data: { reserved_milliusd: 58875 } })
  let created = 0
  const route = load('app/api/kling4-trial/availability/route.ts', {
    'next/server': { NextResponse: { json: (value, init) => new Response(JSON.stringify(value), init) } },
    '@supabase/supabase-js': { createClient() { created++; return db } },
  }, new Map(), { NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'offline-placeholder' })
  assert.equal(route.dynamic, 'force-dynamic')
  assert.equal(route.revalidate, 0)
  assert.equal(route.fetchCache, 'force-no-store')
  const response = await route.GET(new Request('https://offline.invalid/api/kling4-trial/availability?live=true&country=US', { headers: { 'x-vercel-ip-country': 'MX' } }))
  const body = await response.json()
  assert.equal(body.available, false)
  assert.equal(created, 1)
  assert.equal(db.calls.length, 0, 'country comes only from the trusted request header')
  assert.deepEqual(Object.keys(body).sort(), ['available', 'checkedAt', 'utcDay', 'validUntil'])
  for (const name of ['Cache-Control', 'CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) assert.match(response.headers.get(name), /no-store/)
  assert.equal(response.headers.get('Vary'), 'x-vercel-ip-country')
  assert.doesNotMatch(JSON.stringify(body), /placeholder|offline.invalid|reserved|60000|58875/)
})

test('public route hides for missing or invalid server configuration', async () => {
  for (const env of [{}, { NEXT_PUBLIC_SUPABASE_URL: 'invalid', SUPABASE_SERVICE_ROLE_KEY: 'offline-placeholder' }]) {
    const route = load('app/api/kling4-trial/availability/route.ts', {
      'next/server': { NextResponse: { json: (value, init) => new Response(JSON.stringify(value), init) } },
      '@supabase/supabase-js': { createClient: forbidden },
    }, new Map(), env)
    const response = await route.GET(new Request('https://offline.invalid/api/kling4-trial/availability', { headers: { 'x-vercel-ip-country': 'US' } }))
    assert.equal((await response.json()).available, false)
    assert.match(response.headers.get('Cache-Control'), /no-store/)
  }
})
