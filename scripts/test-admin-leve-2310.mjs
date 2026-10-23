// KINEO-ADMIN-LEVE-2310 — real TypeScript modules, fake clock/document/DB, no network or environment files.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const SELF = fileURLToPath(import.meta.url)
const ROOT = path.resolve(process.argv.find((a) => a.startsWith('--root='))?.slice(7) || path.join(path.dirname(SELF), '..'))
const MARK = 'KINEO-ADMIN-LEVE-2310'
const F = { cache: 'lib/admin/liveCache.ts', polling: 'lib/admin/visiblePolling.ts', route: 'app/api/admin/live/route.ts' }
const POLLERS = ['components/LiveNowPanel.tsx', 'app/(dashboard)/admin/users/UsersClient.tsx', 'app/(dashboard)/admin/metrics/MetricsClient.tsx', 'app/(dashboard)/admin/ceo/CeoClient.tsx', 'app/(dashboard)/admin/funnel/FunnelClient.tsx', 'app/admin/leads/LeadsClient.tsx', 'app/admin/demo/DemoClient.tsx']
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const quiet = { log() {}, warn() {}, error() {} }
const forbidden = (name) => () => { throw new Error('Offline guardian forbids ' + name) }
const clone = (v) => JSON.parse(JSON.stringify(v))
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const flush = async () => { for (let n = 0; n < 40; n++) await Promise.resolve() }
const nodes = (node, predicate) => { const found = []; const visit = (n) => { if (predicate(n)) found.push(n); ts.forEachChild(n, visit) }; visit(node); return found }
const parse = (rel, source = read(rel)) => ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

function modules({ mocks = {}, globals = {} } = {}) {
  const loaded = new Map()
  function load(specifier, parent = ROOT) {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier]
    let target = specifier.startsWith('@/') ? path.join(ROOT, specifier.slice(2)) : specifier.startsWith('.') ? path.resolve(parent, specifier) : path.resolve(ROOT, specifier)
    if (!target.startsWith(ROOT + path.sep)) throw new Error('Module outside worktree: ' + specifier)
    if (!fs.existsSync(target)) target += '.ts'
    if (!/\.tsx?$/.test(target)) throw new Error('Unmocked dependency: ' + specifier)
    if (loaded.has(target)) return loaded.get(target)
    const exports = {}; loaded.set(target, exports)
    const code = ts.transpileModule(fs.readFileSync(target, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, { exports, require: (name) => load(name, path.dirname(target)), console: quiet, URL, URLSearchParams, process: { env: { NODE_ENV: 'test' } }, fetch: forbidden('network'), setTimeout: forbidden('timer'), clearTimeout() {}, ...globals }, { timeout: 5000, filename: target })
    return exports
  }
  return load
}

function clock(start = 0) {
  const state = { now: start }
  class Clock extends Date { constructor(...a) { super(...(a.length ? a : [state.now])) } static now() { return state.now } }
  return { state, Date: Clock }
}

let passed = 0
const failures = []
function check(condition, message) { if (condition) passed++; else failures.push(message) }
async function group(label, run) { try { await run() } catch (e) { failures.push(label + ': ' + e.message) } }

async function cacheProof() {
  const time = clock(), api = modules({ globals: { Date: time.Date } })(F.cache)
  check(typeof api.createLiveCache === 'function', 'Cache module exports its actual factory')
  const cache = api.createLiveCache(), pending = deferred(); let calls = 0
  const load = () => { calls++; return pending.promise }
  const first = cache.get(load), concurrent = Array.from({ length: 12 }, () => cache.get(load))
  await flush()
  check(calls === 1, 'Thirteen concurrent misses make one loader call')
  time.state.now = 2000; pending.resolve({ value: 'first' })
  const results = await Promise.all([first, ...concurrent])
  check(results.every((r) => r.value === 'first'), 'All concurrent callers receive the same successful result')
  const next = () => { calls++; return Promise.resolve({ value: 'next' }) }
  time.state.now = 61_999
  check((await cache.get(next)).value === 'first' && calls === 1, 'TTL is sixty seconds after successful completion, including its last millisecond')
  time.state.now = 62_000
  check((await cache.get(next)).value === 'next' && calls === 2, 'Exactly sixty seconds expires the successful cached result')
  const short = api.createLiveCache(120_000); let shortCalls = 0
  await short.get(async () => ++shortCalls); time.state.now += 60_001
  await short.get(async () => ++shortCalls)
  check(shortCalls === 1, 'Explicit cache TTL is honored independently of default')

  const retry = api.createLiveCache(), boom = deferred(); let attempts = 0
  const failed = [retry.get(() => { attempts++; return boom.promise }), retry.get(() => { attempts++; return boom.promise })]
  await flush(); boom.reject(new Error('fixture failed'))
  const rejected = await Promise.allSettled(failed)
  check(attempts === 1 && rejected.every((r) => r.status === 'rejected'), 'Concurrent failed load rejects every waiter once')
  check(await retry.get(async () => { attempts++; return 7 }) === 7 && attempts === 2, 'Failure clears singleflight and does not poison subsequent cache')
  const sync = api.createLiveCache(); let threw = false
  try { await sync.get(() => { throw new Error('sync failure fixture') }) } catch { threw = true }
  check(threw && await sync.get(async () => 9) === 9, 'Synchronous loader failure permits a successful retry')
}

function pollingWorld(initial = 'visible', load = async () => {}, interval = 60_000, options = {}) {
  const time = clock(), timers = new Map(), listeners = new Set(); let seq = 0
  const state = { visible: initial, calls: 0 }
  const document = { get visibilityState() { return state.visible }, get hidden() { return state.visible !== 'visible' }, addEventListener(name, fn) { if (name !== 'visibilitychange') throw new Error('Unexpected browser event'); listeners.add(fn) }, removeEventListener(name, fn) { if (name === 'visibilitychange') listeners.delete(fn) } }
  const setTimeout = (fn, delay) => { const id = ++seq; timers.set(id, { fn, due: time.state.now + delay, delay }); return id }
  const clearTimeout = (id) => timers.delete(id)
  const api = modules({ globals: { document, window: { setTimeout, clearTimeout }, setTimeout, clearTimeout, Date: time.Date } })(F.polling)
  const stop = api.startVisiblePolling(() => { state.calls++; return load() }, interval, options)
  const visibility = async (value) => { state.visible = value; for (const listener of [...listeners]) listener(); await flush() }
  const advance = async (ms) => { time.state.now += ms; for (const [id, timer] of [...timers]) if (timer.due <= time.state.now) { timers.delete(id); timer.fn() }; await flush() }
  return { ...time, timers, listeners, state, stop, visibility, advance, api }
}

async function pollingProof() {
  const p = pollingWorld(); await flush()
  check(p.state.calls === 1 && p.timers.size === 1 && [...p.timers.values()][0].delay === 60_000, 'Visible mount loads once and schedules exactly sixty seconds')
  await p.advance(59_999); check(p.state.calls === 1, 'Visible poll never fires before sixty seconds')
  await p.advance(1); check(p.state.calls === 2 && p.timers.size === 1, 'Sixty seconds fires once and schedules one successor')
  await p.visibility('hidden'); check(p.timers.size === 0, 'Hiding the tab removes its pending polling timer')
  await p.advance(600_000); check(p.state.calls === 2, 'Hidden tab makes zero polling requests over ten fixture minutes')
  await p.visibility('prerender'); check(p.state.calls === 2 && p.timers.size === 0, 'Any state other than visible remains paused')
  await p.visibility('visible'); check(p.state.calls === 3 && p.timers.size === 1, 'Returning to visible refreshes immediately and schedules once')
  p.stop(); check(p.timers.size === 0 && p.listeners.size === 0, 'Cleanup removes timer and visibility listener')
  await p.visibility('visible'); await p.advance(120_000)
  check(p.state.calls === 3 && p.timers.size === 0, 'Unmounted poller never restarts')

  const hidden = pollingWorld('hidden'); await flush()
  check(hidden.state.calls === 0 && hidden.timers.size === 0, 'Hidden initial mount creates neither request nor timer')
  await hidden.visibility('visible'); check(hidden.state.calls === 1 && hidden.timers.size === 1, 'Hidden initial mount resumes on first visibility event'); hidden.stop()
  const pending = deferred(), busy = pollingWorld('visible', () => pending.promise); await flush()
  await busy.visibility('hidden'); await busy.visibility('visible'); await busy.visibility('visible'); await busy.advance(120_000)
  check(busy.state.calls === 1, 'Repeated visibility and elapsed time cannot overlap an in-flight request')
  busy.stop(); pending.resolve(); await flush()
  check(busy.timers.size === 0, 'Settling an in-flight request after cleanup cannot rearm its timer')
  let attempt = 0
  const recover = pollingWorld('visible', () => { if (++attempt === 1) throw new Error('synchronous load fixture'); return Promise.reject(new Error('asynchronous load fixture')) }); await flush()
  await recover.advance(60_000)
  check(recover.state.calls === 2 && recover.timers.size === 1, 'Sync throw and async rejection both preserve future polling'); recover.stop()
  const seeded = pollingWorld('visible', async () => {}, 60_000, { immediate: false }); await flush()
  check(seeded.state.calls === 0 && seeded.timers.size === 1, 'SSR-seeded panel defers initial read while retaining its timer')
  await seeded.visibility('hidden'); await seeded.visibility('visible')
  check(seeded.state.calls === 1 && seeded.timers.size === 1, 'SSR-seeded panel refreshes immediately when its tab returns'); seeded.stop()
  const minimum = pollingWorld('visible', async () => {}, 1000); await flush()
  check([...minimum.timers.values()].every((t) => t.delay >= 60_000) && minimum.timers.size === 1, 'Shared helper clamps accidentally short intervals to sixty seconds'); minimum.stop()
}

function routeWorld() {
  const counter = { visitors_7d: 17, visitors_24h: 7, signups_7d: 3, signups_24h: 2, videos_24h: 1, checkouts_24h: 4 }
  const time = clock(1_000_000), state = { user: { email: 'admin@offline.example' }, service: true, calls: [], rpc: [], reads: [], checkout: 0, rpcError: false, eventError: false, gate: null, rows: [counter] }
  const admin = {
    rpc: async (name, args) => { state.rpc.push({ name, args }); if (state.gate) await state.gate.promise; return { data: state.rows, error: state.rpcError ? { message: 'fixture counters unavailable' } : null } },
    from: (table) => { state.calls.push(table); const query = {}; for (const name of ['select', 'gte', 'order', 'in', 'eq', 'limit', 'range']) query[name] = () => query; return query },
  }
  const mocks = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ status: options.status ?? 200, body: clone(body), headers: options.headers ?? {} }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }) },
    '../_shared/db': { isAdminEmail: (email) => email === 'admin@offline.example', serviceClient: () => state.service ? admin : null },
    '@/lib/supabase/readAll': { readAll: async (query, context) => { query(); state.reads.push(context.table); if (state.eventError) throw new Error('fixture events unavailable'); return { data: [], error: null } } },
    '@/lib/internalAccounts': { INTERNAL_EXACT_EMAILS: ['internal@offline.example'], INTERNAL_LIKE_PATTERNS: ['internal+%@offline.example'], isInternalEmail: () => false },
    '../_shared/mrr': { isPayingPlan: () => false, isTrialPlan: () => false },
    '@/lib/checkoutPricing': { TIER_CREDITS: {} },
    '@/lib/admin/checkoutHonesto': { carregarCheckoutHonesto: async () => { state.checkout++; return null } },
    '@/lib/admin/ledgerGrants': { LEDGER_GRANT_EVENTS: [], summarizeLedgerGrants: () => new Map() },
    '@/lib/admin/rotuloCredito': { rotuloCredito: () => '' },
    '@/lib/admin/narrationCompletion': { isNarrationCompletionEvent: () => false },
  }
  const route = modules({ mocks, globals: { Date: time.Date } })(F.route)
  return { clockState: time.state, state, get: () => route.GET() }
}

async function routeProof() {
  const p = routeWorld(); p.state.gate = deferred()
  const all = Array.from({ length: 10 }, () => p.get()); await flush()
  check(p.state.rpc.length === 1 && p.state.reads.length === 1 && p.state.checkout === 1, 'Ten authenticated route requests coalesce RPC, online events and checkout reads')
  p.state.gate.resolve(); const responses = await Promise.all(all); p.state.gate = null
  check(responses.every((r) => r.status === 200 && r.body.visitors_7d === 17 && r.body.online_now === 0), 'Actual route preserves live response and real RPC counters')
  check(JSON.stringify(p.state.rpc[0]) === JSON.stringify({ name: 'admin_live_counters', args: { p_exact_emails: ['internal@offline.example'], p_like_patterns: ['internal+%@offline.example'] } }), 'Actual cached loader passes canonical internal account exclusions to RPC')
  const data = JSON.stringify(responses[0].body)
  p.state.user = null
  check((await p.get()).status === 403, 'Unauthenticated request cannot receive already-cached private data')
  p.state.user = { email: 'outsider@offline.example' }
  check((await p.get()).status === 403, 'Non-admin request cannot receive already-cached private data')
  p.state.user = { email: 'admin@offline.example' }; p.state.service = false
  check((await p.get()).status === 503, 'Service guard runs before cache lookup even on a warm result')
  check(p.state.rpc.length === 1 && p.state.reads.length === 1, 'Rejected cached requests perform zero privileged data queries')
  p.state.service = true
  check(JSON.stringify((await p.get()).body) === data && p.state.rpc.length === 1 && p.state.checkout === 1, 'Warm authenticated route returns exact same data without more database work')
  // `clockState` is the only wall clock used inside the real route/cache VM.
  p.clockState.now += 59_999
  check((await p.get()).status === 200 && p.state.rpc.length === 1, 'Actual route keeps its result through the last TTL millisecond')
  p.clockState.now++
  check((await p.get()).status === 200 && p.state.rpc.length === 2 && p.state.reads.length === 2 && p.state.checkout === 2, 'Actual route refreshes every expensive source once at sixty seconds')

  const failed = routeWorld(); failed.state.rpcError = true
  check((await failed.get()).status === 500, 'RPC failure returns an error rather than caching false zero counters')
  failed.state.rpcError = false
  check((await failed.get()).status === 200 && failed.state.rpc.length === 2, 'RPC failure leaves route cache retryable immediately')
  const events = routeWorld(); events.state.eventError = true
  check((await events.get()).status === 500, 'Events failure rejects the actual cached loader')
  events.state.eventError = false
  check((await events.get()).status === 200 && events.state.rpc.length === 2, 'Events failure cannot cache a partial response')
  for (const rows of [[], null, [{}], [{ visitors_7d: -1 }], [{ visitors_7d: 'not-a-number' }]]) {
    const malformed = routeWorld(); malformed.state.rows = rows
    check((await malformed.get()).status === 500, 'Missing/malformed counters never become a successful cached snapshot: ' + JSON.stringify(rows))
  }
  const stale = routeWorld(); await stale.get(); stale.clockState.now += 60_000; stale.state.rpcError = true
  check((await stale.get()).status === 500 && stale.state.rpc.length === 2, 'Expired snapshot cannot silently mask a failed refresh with stale success')
  stale.state.rpcError = false
  check((await stale.get()).status === 200 && stale.state.rpc.length === 3, 'Failed expired refresh remains immediately retryable')
}

async function wiringProof() {
  for (const file of POLLERS) {
    const sf = parse(file), imports = sf.statements.filter(ts.isImportDeclaration)
    check(imports.some((n) => n.moduleSpecifier.text === '@/lib/admin/visiblePolling' && n.importClause?.namedBindings?.elements?.some((e) => e.name.text === 'startVisiblePolling')), file + ': imports the shared tested polling helper')
    const calls = nodes(sf, (n) => ts.isCallExpression(n) && n.expression.getText(sf) === 'startVisiblePolling')
    check(calls.length === (file.includes('/metrics/') ? 2 : 1), file + ': all intended data loops call the actual shared helper')
    check(calls.every((c) => nodes(sf, (n) => ts.isCallExpression(n) && n.expression.getText(sf) === 'useEffect').some((effect) => c.pos > effect.pos && c.end < effect.end)), file + ': polling helper is mounted from an effect')
    const effects = nodes(sf, (n) => ts.isCallExpression(n) && n.expression.getText(sf) === 'useEffect').filter((effect) => calls.some((c) => c.pos > effect.pos && c.end < effect.end))
    for (const [index, effect] of effects.entries()) {
      let visible = false; const listeners = new Set(), timers = new Map(), requests = []; let sequence = 0
      const document = { get visibilityState() { return visible ? 'visible' : 'hidden' }, addEventListener: (name, fn) => { if (name === 'visibilitychange') listeners.add(fn) }, removeEventListener: (name, fn) => listeners.delete(fn) }
      const setTimeout = (fn, delay) => { const id = ++sequence; timers.set(id, { fn, delay }); return id }, clearTimeout = (id) => timers.delete(id)
      const browser = { document, window: { setTimeout, clearTimeout }, setTimeout, clearTimeout }
      const polling = modules({ globals: browser })(F.polling)
      const box = { ...browser, startVisiblePolling: polling.startVisiblePolling, denied: false, initial: null, days: '30', console: quiet, Date, Array, fetch: async (url) => { requests.push(url); return { ok: true, json: async () => ({ data: {}, users: [] }) } } }
      for (const name of new Set(nodes(effect, (n) => ts.isIdentifier(n) && /^set[A-Z]/.test(n.text)).map((n) => n.text))) box[name] = () => {}
      const declarations = sf.statements.filter((s) => ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => ['POLL_MS', 'REFRESH_MS'].includes(d.name.getText(sf))))
      const outerLoad = nodes(sf, (n) => ts.isVariableDeclaration(n) && n.name.getText(sf) === 'load' && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText(sf) === 'useCallback')[0]
      if (outerLoad) {
        for (const name of new Set(nodes(outerLoad, (n) => ts.isIdentifier(n) && /^set[A-Z]/.test(n.text)).map((n) => n.text))) box[name] = () => {}
        box.DEMO_ERRORS = {}
      }
      const source = declarations.map((s) => s.getText(sf)).join('\n') + (outerLoad ? '\nconst load = ' + outerLoad.initializer.arguments[0].getText(sf) : '') + '\nglobalThis.cleanup = (' + effect.arguments[0].getText(sf) + ')()'
      vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, box, { timeout: 5000 })
      await flush()
      check(requests.length === 0 && timers.size === 0, file + ' effect ' + index + ': real caller makes no request or timer on hidden mount')
      visible = true; for (const listener of listeners) listener(); await flush()
      check(requests.length > 0 && timers.size === 1 && [...timers.values()][0].delay >= 60_000, file + ' effect ' + index + ': actual fetch resumes through tested helper with safe interval')
      check(typeof box.cleanup === 'function', file + ' effect ' + index + ': real effect returns its cleanup')
      box.cleanup()
      check(timers.size === 0 && listeners.size === 0, file + ' effect ' + index + ': actual cleanup disposes shared browser resources')
    }
  }
  const sf = parse(F.route)
  check(nodes(sf, (n) => ts.isVariableDeclaration(n) && n.name.getText(sf) === 'fetchCache' && n.initializer?.getText(sf) === "'force-no-store'").length === 1, 'Route retains no-store protection against implicit indefinite Next data cache')
}

const mutants = [
  ['cache-default-30s', F.cache, (s) => replaceOnce(s, 'ttlMs = 60_000', 'ttlMs = 30_000')],
  ['cache-no-singleflight', F.cache, (s) => replaceOnce(s, 'if (inFlight) return inFlight', 'if (false && inFlight) return inFlight')],
  ['cache-never-expires', F.cache, (s) => replaceOnce(s, 'Date.now() < cached.expiresAt', 'true')],
  ['cache-retains-failed-flight', F.cache, (s) => replaceOnce(s, '.finally(() => { inFlight = undefined })', '.finally(() => { /* mutant: rejected flight retained */ })')],
  ['route-cache-bypassed', F.route, (s) => replaceOnce(s, 'await liveCache.get(() => loadLiveData(admin))', 'await loadLiveData(admin)')],
  ['route-auth-bypassed', F.route, (s) => replaceOnce(s, 'if (!user || !isAdminEmail(user.email))', 'if (false && (!user || !isAdminEmail(user.email)))')],
  ['route-service-bypassed', F.route, (s) => replaceOnce(s, "if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })", '/* mutant: service guard bypassed */')],
  ['route-rpc-error-as-success', F.route, (s) => replaceOnce(s, "if (counters.error) throw new Error('admin_live_counters failed: ' + counters.error.message)", '/* mutant: RPC error ignored */')],
  ['polling-hidden-active', F.polling, (s) => replaceOnce(s, "document.visibilityState === 'visible'", "document.visibilityState !== 'prerender'")],
  ['polling-30s', F.polling, (s) => replaceOnce(s, 'Number.isFinite(intervalMs) ? Math.max(60_000, intervalMs) : 60_000', '30_000')],
  ['polling-no-hidden-timer-cleanup', F.polling, (s) => replaceOnce(s, 'if (timer !== null) window.clearTimeout(timer)', 'if (false && timer !== null) window.clearTimeout(timer)')],
  ['polling-no-visible-resume', F.polling, (s) => replaceOnce(s, 'if (!stopped && visible()) void poll()', 'if (false && !stopped && visible()) void poll()')],
  ['polling-allows-overlap', F.polling, (s) => replaceOnce(s, 'stopped || !visible() || running', 'stopped || !visible()')],
  ['polling-listener-leaks', F.polling, (s) => replaceOnce(s, "document.removeEventListener('visibilitychange', onVisibility)", '/* mutant: visibility listener leaks */')],
  ['polling-pending-rearms-after-unmount', F.polling, (s) => replaceOnce(s, 'if (!stopped && visible()) timer = window.setTimeout', 'if (visible()) timer = window.setTimeout')],
  ['polling-ignores-ssr-seed', F.polling, (s) => replaceOnce(s, 'if (options.immediate === false)', 'if (false && options.immediate === false)')],
  ['live-caller-drops-load', 'components/LiveNowPanel.tsx', (s) => replaceOnce(s, 'startVisiblePolling(load, REFRESH_MS)', 'startVisiblePolling(() => Promise.resolve(), REFRESH_MS)')],
]
function replaceOnce(source, before, after) { if (source.split(before).length !== 2) throw new Error('Mutation anchor is not unique: ' + before); return source.replace(before, after) }
function diskMutants() {
  let killed = 0; const backups = new Map()
  try { for (const [name, file, mutate] of mutants) {
    const target = path.resolve(ROOT, file); if (!target.startsWith(ROOT + path.sep)) throw new Error('Mutant escaped worktree')
    const original = fs.readFileSync(target); backups.set(target, original)
    try {
      const changed = Buffer.from(mutate(original.toString('utf8'))); if (changed.equals(original)) throw new Error('Mutant changed no bytes: ' + name)
      fs.writeFileSync(target, changed)
      if (!fs.readFileSync(target).equals(changed)) throw new Error('Mutant failed to reach disk: ' + name)
      const child = spawnSync(process.execPath, [SELF, '--root=' + ROOT], { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 45_000 })
      if (child.error || child.status === 0 || !child.stdout.includes('FAIL ')) throw new Error('Mutant survived or failed without guardian assertion: ' + name + '\n' + child.stdout + child.stderr)
      killed++; console.log('mutant rejected: ' + name)
    } finally { fs.writeFileSync(target, original); if (!fs.readFileSync(target).equals(original)) throw new Error('Exact Buffer undo failed: ' + file) }
  } } finally { for (const [target, original] of backups) { if (!fs.readFileSync(target).equals(original)) fs.writeFileSync(target, original); if (!fs.readFileSync(target).equals(original)) throw new Error('Final Buffer undo audit failed: ' + target) } }
  check(killed === mutants.length && killed >= 10, 'All real disk mutants are killed with exact Buffer restoration')
  console.log('Disk mutants: ' + killed + '/' + mutants.length + ' rejected; exact Buffer undo verified.')
}

try {
  await group('Cache runtime', cacheProof)
  await group('Polling runtime', pollingProof)
  await group('Actual route runtime', routeProof)
  await group('Actual caller wiring', wiringProof)
  if (!failures.length && process.argv.includes('--mutants')) { diskMutants(); const after = spawnSync(process.execPath, [SELF, '--root=' + ROOT], { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 45_000 }); if (after.status !== 0) throw new Error('Positive control failed after mutant undo: ' + after.stdout + after.stderr); console.log('Positive control after exact undo passed.') }
} catch (e) { failures.push(e.message) }
for (const failure of failures) console.log('FAIL ' + failure)
console.log(MARK + ': ' + passed + ' passed, ' + failures.length + ' failed.')
if (failures.length) process.exitCode = 1
