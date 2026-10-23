// KINEO-TRAFEGO-2310 — real modules, fake Supabase/Resend, no network or env files.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import crypto from 'node:crypto'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(process.argv.find((a) => a.startsWith('--root='))?.slice(7) || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const NOW = Date.parse('2026-10-23T12:22:00Z')
let passed = 0
const check = (v, msg) => { assert.ok(v, msg); passed++ }
const quiet = { log() {}, warn() {}, error() {} }
function load(file, imports = {}, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(read(file), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports, require(n) { if (n in imports) return imports[n]; throw Error('Unmocked dependency ' + n) }, console: quiet, Date, AbortSignal, setTimeout, clearTimeout, process: { env: {} }, fetch() { throw Error('Network forbidden') }, ...globals }, { timeout: 5000, filename: file })
  return exports
}
function database(rows = [], failure = null, throws = false) {
  const calls = [], records = []
  const db = { from(table) {
    assert.equal(table, 'events')
    let op = 'read', filters = {}, item
    const q = {
      select(v) { calls.push(['select', v]); return q },
      in(k, v) { filters[k] = v; return q },
      gte(k, v) { filters.min = v; return q },
      lte(k, v) { filters.max = v; return q },
      limit(n) { filters.limit = n; return q },
      insert(v) { op = 'insert'; item = v; return q },
      abortSignal(s) { check(s instanceof AbortSignal, 'every health query/write has abort signal'); return q },
      then(resolve, reject) {
        if (throws) return Promise.reject(Error('connection failed')).then(resolve, reject)
        if (op === 'insert') { records.push(item); return Promise.resolve({ data: null, error: failure }).then(resolve, reject) }
        calls.push(['filters', filters])
        const data = rows.filter((r) => filters.name.includes(r.name) && r.created_at >= filters.min && r.created_at <= filters.max).slice(0, filters.limit)
        return Promise.resolve({ data, error: failure }).then(resolve, reject)
      },
    }
    return q
  } }
  return { db, calls, records }
}

const notices = []
let result = { email: 'sent', webhook: 'skipped', delivered: true }
const health = load('lib/trafficHealth.ts', { 'node:crypto': crypto, '@/lib/supplier/notify': { async notifyFounder(...args) { notices.push(args); return result } } })
check(health.TRAFFIC_SILENCE_MS === 15 * 60_000, 'silence threshold is exactly the requested fifteen minutes')
check(health.TRAFFIC_QUERY_TIMEOUT_MS <= 4000 && health.TRAFFIC_QUERY_TIMEOUT_MS > 0, 'DB timeout stays within four-second monitor budget')
const activity = (age, name = 'landing_session_started') => ({ name, created_at: new Date(NOW - age).toISOString() })
let d = database([activity(health.TRAFFIC_SILENCE_MS)])
let out = await health.checkTrafficHealth(d.db, NOW)
check(out.reason === 'healthy' && !notices.length && !d.records.length, '15-minute boundary inclusive, healthy check is read-only and silent')
d = database([activity(health.TRAFFIC_SILENCE_MS + 1), activity(0, 'traffic_health_alert'), activity(0, 'cron_lease'), activity(0, 'quality_radar_digest')])
out = await health.checkTrafficHealth(d.db, NOW)
check(out.reason === 'no_recent_activity' && out.recorded, 'old activity and fresh machine markers do not hide silence')
check(notices.at(-1)[1].includes('não comprova indisponibilidade'), 'silence alert explicitly distinguishes absence of activity from outage')
const notice = notices.at(-1)
check(notice[1].includes('\n\n') && !notice[1].includes('\\n'), 'real email body has readable paragraphs rather than literal escaped newlines')
check(d.records[0].metadata.first_attempt_email === 'sent', 'persistent marker labels first attempt, not an invented latest delivery state')
await health.checkTrafficHealth(d.db, NOW + 60_000)
check(JSON.stringify(notice) === JSON.stringify(notices.at(-1)), 'concurrent/cold retries use identical payload and key in hour')
check(d.records[0].id === d.records[1].id, 'record primary key also stable across retries')
await health.checkTrafficHealth(d.db, NOW + 3_600_000)
check(notice[2].idempotencyKey !== notices.at(-1)[2].idempotencyKey, 'persistent issue permits next hourly reminder')
for (const failure of [{ code: '503' }, 'throw', 'missing']) {
  d = database([], failure === 'throw' ? null : failure, failure === 'throw')
  out = await health.checkTrafficHealth(failure === 'missing' ? null : d.db, NOW)
  check(out.reason === 'database_unavailable' && out.email === 'sent', 'DB ' + failure + ': notification independent of successful DB read/write')
}
result = { email: 'failed', webhook: 'skipped', delivered: false }
out = await health.checkTrafficHealth(null, NOW)
check(out.email === 'failed', 'failed transport is not reported as sent')
result = { email: 'sent', webhook: 'skipped', delivered: true }
out = await health.checkTrafficHealth(null, NOW)
check(out.email === 'sent', 'next check retries after failed delivery, no in-memory suppression')
d = database([activity(-1)])
out = await health.checkTrafficHealth(d.db, NOW)
check(out.reason === 'no_recent_activity', 'future timestamps cannot mask silence')

const sends = []
const env = { RESEND_API_KEY: 'fixture-only', KINEO_ALERT_EMAIL: 'founder@example.invalid', KINEO_ALERT_WEBHOOK_URL: 'https://webhook.example.invalid' }
const transport = load('lib/supplier/notify.ts', {}, { process: { env }, async fetch(url, init) { sends.push({ url, init }); return { ok: true } } })
await transport.notifyFounder('test', 'body', { emailOnly: true, idempotencyKey: 'fixture/2026-10-23' })
check(sends.length === 1 && sends[0].url === 'https://api.resend.com/emails', 'traffic monitor only uses existing Resend email')
check(sends[0].init.headers['Idempotency-Key'] === 'fixture/2026-10-23', 'idempotency key reaches real Resend request')
check(JSON.parse(sends[0].init.body).to[0] === 'founder@example.invalid', 'uses existing founder recipient configuration')
sends.length = 0
await transport.notifyFounder('legacy', 'body')
check(sends.length === 2 && !('Idempotency-Key' in sends[0].init.headers), 'existing callers retain both channels and ordinary headers')

const route = read('app/api/cron/finish-orphan-jobs/route.ts')
check(route.includes('if (!cronSecret) return false') && route.indexOf('if (!isAuthorized(req))') < route.indexOf('await checkTrafficHealth(null)'), 'authentication fail-closed precedes monitor')
check(route.indexOf('const trafficHealth = await checkTrafficHealth(admin)') < route.indexOf(".select('user_id, session_id, metadata, created_at')"), 'health runs before job scans and paid work')
check(route.includes("global: { fetch: freshFetch }") && route.includes("fetchCache = 'force-no-store'"), 'health reads bypass both Next and fetch cache')
const schedule = JSON.parse(read('vercel.json')).crons.filter((c) => c.path.split('?')[0] === '/api/cron/finish-orphan-jobs')
check(schedule.length === 1 && schedule[0].schedule === '*/10 * * * *', 'reuses scheduled ten-minute cron')
check(read('app/api/events/route.ts').includes("'traffic_health_alert'"), 'public event sink reserves operational alert marker for server')

// Execute the real cron entry point up to its health gate. Paid dependencies
// are traps, so an unauthorized/down-DB invocation cannot reach job work.
let monitorCalls = 0, clientCalls = 0
let cronHealth = { reason: 'database_unavailable', email: 'sent', recorded: false }
const routeEnv = { CRON_SECRET: 'offline-cron-fixture', NEXT_PUBLIC_SUPABASE_URL: 'https://db.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'offline-db-fixture' }
const realRoute = load('app/api/cron/finish-orphan-jobs/route.ts', {
  'next/server': { NextResponse: { json(body, init) { return { body, status: init?.status ?? 200 } } } },
  '@supabase/supabase-js': { createClient() { clientCalls++; return { from() { throw Error('Paid job scan reached') } } } },
  '@/lib/lifecycle/freshFetch': { freshFetch() { throw Error('Network forbidden') } },
  '@/lib/trafficHealth': { async checkTrafficHealth() { monitorCalls++; return cronHealth } },
  '@/app/api/generate-video-fast/route': { POST() { throw Error('Paid generation reached') } },
  '@/lib/renderJobs': {},
}, { process: { env: routeEnv } })
const request = (auth) => ({ headers: { get() { return auth } } })
let response = await realRoute.GET(request('Bearer wrong'))
check(response.status === 401 && monitorCalls === 0 && clientCalls === 0, 'real cron rejects unauthorized request before any monitor or DB call')
delete routeEnv.CRON_SECRET
response = await realRoute.GET(request('Bearer undefined'))
check(response.status === 401 && monitorCalls === 0, 'real cron rejects absent CRON_SECRET even with Bearer undefined')
routeEnv.CRON_SECRET = 'offline-cron-fixture'
response = await realRoute.GET(request('Bearer offline-cron-fixture'))
check(response.status === 503 && monitorCalls === 1, 'real cron checks outage and exits before scans or paid work')
delete routeEnv.NEXT_PUBLIC_SUPABASE_URL
response = await realRoute.GET(request('Bearer offline-cron-fixture'))
check(response.status === 503 && monitorCalls === 2 && clientCalls === 1, 'real cron still alerts when DB configuration missing')
console.log(`KINEO-TRAFEGO-2310-HEALTH: ${passed} passed, 0 failed (offline).`)

if (process.argv.includes('--mutants')) {
  const files = ['lib/trafficHealth.ts', 'lib/supplier/notify.ts', 'app/api/cron/finish-orphan-jobs/route.ts', 'app/api/events/route.ts', 'vercel.json']
  const mutations = [
    ['self-heartbeat', files[0], "'landing_session_started', 'homepage_view'", "'traffic_health_alert', 'landing_session_started', 'homepage_view'"],
    ['stale-window', files[0], '15 * 60_000', '30 * 60_000'],
    ['unbounded-probe', files[0], 'TRAFFIC_QUERY_TIMEOUT_MS = 4000', 'TRAFFIC_QUERY_TIMEOUT_MS = 60_000'],
    ['db-down-silent', files[0], "let reason: HealthReason = 'database_unavailable'", "let reason: HealthReason = 'healthy'"],
    ['unstable-idempotency', files[0], '${reason}/${hour}`', '${reason}/${now}`'],
    ['no-idempotency-header', files[1], "'Idempotency-Key': idempotencyKey", "'X-Ignored-Key': idempotencyKey"],
    ['public-cron', files[2], 'if (!cronSecret) return false', 'if (!cronSecret) return true'],
    ['forged-alert', files[3], "  'traffic_health_alert',", ''],
  ]
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kineo-trafego-health-'))
  try {
    for (const [name, file, before, after] of mutations) {
      for (const f of files) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), read(f)) }
      const source = read(file)
      assert.equal(source.split(before).length - 1, 1, 'unique mutation anchor: ' + name)
      fs.writeFileSync(path.join(dir, file), source.replace(before, after))
      const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--root=' + dir], { encoding: 'utf8', windowsHide: true, timeout: 60_000 })
      assert.ok(child.status !== null && child.status !== 0, 'mutant survived or timed out: ' + name)
      assert.match(child.stderr, /AssertionError|Paid job scan reached/, 'mutant must fail a contract assertion: ' + name)
      console.log('KILLED ' + name)
    }
    console.log(`KINEO-TRAFEGO-2310-HEALTH-MUTANTS: ${mutations.length} killed, 0 survived.`)
  } finally {
    const resolved = path.resolve(dir), base = path.resolve(os.tmpdir()) + path.sep
    if (!resolved.startsWith(base) || !path.basename(resolved).startsWith('kineo-trafego-health-')) throw Error('Unsafe temporary cleanup target')
    fs.rmSync(resolved, { recursive: true, force: true })
  }
}
