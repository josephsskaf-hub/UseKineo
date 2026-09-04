#!/usr/bin/env node
// Offline contract tests: actual policy, route, observer, pixel dispatcher and
// success-page effect. All Auth/Stripe/fetch/SDK boundaries are injected fakes.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(join(root, 'package.json'))('typescript')
const read = rel => readFileSync(join(root, rel), 'utf8')
let checks = 0
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++ }
function load(rel, imports = {}, globals = {}) {
  const output = ts.transpileModule(read(rel), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  }, fileName: rel }).outputText
  const box = { exports: {} }
  new Function('require', 'module', 'exports', ...Object.keys(globals), output)(id => {
    if (!(id in imports)) throw new Error(`Unexpected import: ${rel}: ${id}`)
    return imports[id]
  }, box, box.exports, ...Object.values(globals))
  return box.exports
}
const policy = load('lib/growth/verifiedCheckoutPurchase.ts')
const internal = load('lib/internalAccounts.ts')
const sessionId = 'cs_live_abcdefghijklmnopqrstuvwxyz'
const userId = 'real-user'
const session = {
  id: sessionId, metadata: { supabase_user_id: userId }, status: 'complete',
  payment_status: 'paid', mode: 'subscription', livemode: true, amount_total: 1500, currency: 'usd',
}
const inspect = overrides => policy.inspectCheckoutPurchase({ ...session, ...overrides }, sessionId, userId)
const purchase = inspect({}).purchase
eq(purchase, { sessionId, mode: 'subscription', amountMinor: 1500, currency: 'USD', value: 15 }, 'real amount from Stripe')
eq(inspect({ mode: 'payment', amount_total: 490 }).purchase.mode, 'payment', 'pack does not require subscription')
eq(inspect({ currency: 'brl', amount_total: 1290 }).purchase.value, 12.9, 'legacy BRL minor units')
for (const overrides of [
  { metadata: null }, { metadata: { supabase_user_id: 'another-user' } }, { id: 'another-session' },
  { metadata: {}, client_reference_id: userId },
]) eq(inspect(overrides).state, 'unavailable', 'ownership cannot come from URL/email/referral')
eq(inspect({ client_reference_id: 'rewardful-referral' }).state, 'verified', 'affiliate reference does not override canonical owner')
for (const overrides of [
  { payment_status: 'unpaid' }, { status: 'open' }, { status: null },
]) eq(inspect(overrides).state, 'pending', 'no conversion before this session settles')
for (const overrides of [
  { status: 'expired' }, { livemode: false }, { mode: 'setup' },
  { payment_status: 'no_payment_required' }, { amount_total: 0 }, { amount_total: null },
  { amount_total: -1 }, { amount_total: 1.5 }, { amount_total: NaN },
  { amount_total: Infinity }, { amount_total: Number.MAX_SAFE_INTEGER + 1 },
  { currency: null }, { currency: 'jpy' }, { currency: 'invalid' },
]) eq(inspect(overrides).state, 'ineligible', 'test/free/invalid purchases do not count')

// Actual GET, with external services replaced, never a real key/network call.
let authCalls = 0, stripeCalls = 0, authUser = { id: userId, email: 'buyer@example.net' }
let authError = null, stripeError = null, returnedSession = session
const env = { STRIPE_SECRET_KEY: 'offline-test-placeholder' }
const route = load('app/api/stripe/checkout/verify/route.ts', {
  'next/server': { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
  '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => {
    authCalls++; return { data: { user: authUser }, error: authError }
  } } }) },
  '@/lib/stripe': { stripe: { checkout: { sessions: { retrieve: async (id, params, options) => {
    stripeCalls++
    eq(id, sessionId, 'only requested session is retrieved')
    eq(options, { timeout: 5000, maxNetworkRetries: 0 }, 'bounded read-only Stripe request')
    if (stripeError) throw stripeError
    return returnedSession
  } } } } },
  '@/lib/internalAccounts': internal,
  '@/lib/growth/verifiedCheckoutPurchase': policy,
}, { process: { env } })
const get = (id = sessionId) => route.GET({ nextUrl: new URL(`https://www.usekineo.com/api/stripe/checkout/verify?session_id=${id}`) })
eq((await get('made-up')).status, 400, 'invalid ID rejected')
eq([authCalls, stripeCalls], [0, 0], 'no providers for malformed ID')
authUser = null
eq((await get()).status, 401, 'anonymous caller denied')
eq(stripeCalls, 0, 'no Stripe access without trusted user')
authUser = { id: userId, email: 'buyer@example.net' }; authError = { message: 'expired' }
eq((await get()).status, 401, 'auth error never trusts returned user')
authError = null
authUser.email = 'josephsskaf@gmail.com'
eq(await (await get()).json(), { state: 'ineligible' }, 'internal account excluded')
eq(stripeCalls, 0, 'internal test never hits Stripe')
authUser.email = 'buyer@example.net'
delete env.STRIPE_SECRET_KEY
eq((await get()).status, 503, 'missing config does not emit purchase')
env.STRIPE_SECRET_KEY = 'offline-test-placeholder'
returnedSession = { ...session, metadata: { supabase_user_id: 'someone-else' }, customer_email: authUser.email }
const foreign = await get()
eq(foreign.status, 404, 'foreign session masked')
eq(await foreign.json(), { state: 'unavailable' }, 'foreign payment details not leaked')
returnedSession = { ...session, payment_status: 'unpaid' }
eq(await (await get()).json(), { state: 'pending' }, 'pending session returns no money')
for (const mode of ['subscription', 'payment']) {
  returnedSession = { ...session, mode }
  const res = await get()
  eq(res.status, 200, 'paid session retrieved')
  eq(res.headers.get('cache-control'), 'private, no-store, max-age=0', 'never CDN cache identity response')
  eq(res.headers.get('vary'), 'Cookie', 'response is owner-scoped')
  eq((await res.json()).purchase.mode, mode, 'paid subscription and one-time supported')
}
stripeError = Object.assign(new Error('sensitive Stripe body'), { code: 'resource_missing' })
eq((await get()).status, 404, 'nonexistent session masked like foreign')
stripeError = new Error('secret or provider body')
const failed = await get()
eq(failed.status, 503, 'provider error retryable')
eq(await failed.json(), { state: 'unavailable' }, 'no provider message leaks')

function pixelModule() {
  return load('lib/growth/checkoutPurchasePixels.ts', { './verifiedCheckoutPurchase': policy })
}
let pixels = pixelModule(), google = [], tiktok = []
const stored = new Map()
const storage = { getItem: k => stored.get(k), setItem: (k,v) => stored.set(k,v) }
const targets = { gtag: (...args) => google.push(args), ttq: { track: (...args) => tiktok.push(args) } }
pixels.dispatchCheckoutPurchasePixels(purchase, {}, storage)
eq(stored.size, 0, 'missing SDK not marked dispatched')
pixels.dispatchCheckoutPurchasePixels(purchase, targets, storage)
pixels.dispatchCheckoutPurchasePixels(purchase, targets, storage)
eq([google.length, tiktok.length], [1, 1], 'remount deduped per provider')
eq(google[0][2].value, 15, 'Google uses verified value')
eq(tiktok[0][2].event_id, sessionId, 'TikTok dedupe ID')
pixels = pixelModule() // reload: module memory gone, storage retained
pixels.dispatchCheckoutPurchasePixels(purchase, targets, storage)
eq([google.length, tiktok.length], [1, 1], 'refresh deduped by session storage')
const pack = { ...purchase, sessionId: sessionId + 'pack', mode: 'payment' }
pixels.dispatchCheckoutPurchasePixels(pack, targets, storage)
eq(tiktok.at(-1)[1].content_name, 'Kineo one-time purchase', 'packs not mislabeled subscription')
const retry = { ...purchase, sessionId: sessionId + 'retry' }
pixels.dispatchCheckoutPurchasePixels(retry, { gtag: () => { throw new Error('SDK not ready') } }, storage)
pixels.dispatchCheckoutPurchasePixels(retry, targets, storage)
eq(google.length, 3, 'SDK throw can retry independently')
const deniedStorage = { getItem: () => { throw Error() }, setItem: () => { throw Error() } }
const privatePurchase = { ...purchase, sessionId: sessionId + 'private' }
pixels.dispatchCheckoutPurchasePixels(privatePurchase, targets, deniedStorage)
pixels.dispatchCheckoutPurchasePixels(privatePurchase, targets, deniedStorage)
eq(google.length, 4, 'storage denial preserves module dedupe')
for (const invalid of [
  { ...purchase, sessionId: 'fake' }, { ...purchase, value: 999999 },
  { ...purchase, amountMinor: 0 }, { ...purchase, currency: 'JPY' },
  { ...purchase, mode: 'setup' },
]) pixels.dispatchCheckoutPurchasePixels(invalid, targets, storage)
eq(google.length, 4, 'malformed verified response fails closed at SDK boundary')

// Virtual clock runs the production observer; no real delay or HTTP calls.
function clock() {
  let id = 0, now = 0
  const tasks = new Map()
  return {
    setTimeout: (fn, delay) => { const key = ++id; tasks.set(key, { fn, at: now + delay }); return key },
    clearTimeout: key => tasks.delete(key),
    async advance(to) {
      while (true) {
        const next = [...tasks].filter(([, t]) => t.at <= to).sort((a,b) => a[1].at - b[1].at)[0]
        if (!next) break
        now = next[1].at; tasks.delete(next[0]); await next[1].fn()
      }
      now = to
    },
  }
}
async function observerCase(results, expectedCalls, expectedPixels, label) {
  const timer = clock(), sent = [], requests = []
  const observer = load('lib/growth/observeCheckoutPurchase.ts', {
    './verifiedCheckoutPurchase': policy,
    './checkoutPurchasePixels': { dispatchCheckoutPurchasePixels: p => sent.push(p) },
  }, timer)
  const stop = observer.observeCheckoutPurchase({ sessionId,
    fetch: async (url, init) => {
      requests.push({url,init})
      const result = results[Math.min(requests.length - 1, results.length - 1)]
      return { status: result.status ?? 200, ok: (result.status ?? 200) === 200, json: async () => result.body }
    }, targets: () => ({}), storage: () => undefined,
  })
  await timer.advance(30_000)
  eq(requests.length, expectedCalls, label + ': bounded verification')
  eq(sent.length > 0, expectedPixels, label + ': purchase gate')
  if (requests.length) eq(requests[0].init.cache, 'no-store', 'browser never caches verification')
  stop(); const count = sent.length; await timer.advance(60_000)
  eq(sent.length, count, 'nothing after cleanup')
}
await observerCase([{ body: { state: 'verified', purchase } }], 1, true, 'valid')
await observerCase([{ body: { state: 'pending' } }, { body: { state: 'verified', purchase } }], 2, true, 'delayed settlement')
await observerCase([{ body: { state: 'pending' } }], 5, false, 'unpaid forever')
await observerCase([{ status: 401 }], 1, false, 'logged out')
await observerCase([{ status: 404 }], 1, false, 'foreign or nonexistent')
await observerCase([{ status: 503 }], 5, false, 'provider unavailable')
await observerCase([{ body: { state: 'ineligible' } }], 1, false, 'free or internal')
await observerCase([{ body: { state: 'verified', purchase: { ...purchase, sessionId: 'wrong' } } }], 5, false, 'response session mismatch')

const cancelClock = clock()
let releaseResponse, cancelledPixels = 0, activeSignal
const cancelObserver = load('lib/growth/observeCheckoutPurchase.ts', {
  './verifiedCheckoutPurchase': policy,
  './checkoutPurchasePixels': { dispatchCheckoutPurchasePixels: () => cancelledPixels++ },
}, cancelClock)
const cancel = cancelObserver.observeCheckoutPurchase({ sessionId,
  fetch: async (_url, init) => { activeSignal = init.signal; return new Promise(resolve => { releaseResponse = resolve }) },
  targets: () => ({}), storage: () => undefined,
})
const pendingAdvance = cancelClock.advance(0)
await Promise.resolve()
cancel()
eq(activeSignal.aborted, true, 'unmount aborts in-flight HTTP')
releaseResponse({ status: 200, ok: true, json: async () => ({ state: 'verified', purchase }) })
await pendingAdvance; await cancelClock.advance(30_000)
eq(cancelledPixels, 0, 'late response after unmount never dispatches')

// Execute the real page and its second effect, not a regex that guesses wiring.
const effects = [], pageViews = [], observed = []
let cleanupCalled = false
const page = load('app/checkout/success/page.tsx', {
  'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
  react: { useEffect: fn => effects.push(fn), useRef: value => ({current:value}), useState: value => [value, () => {}] },
  'next/link': {}, 'next/navigation': { useRouter: () => ({ push: () => { throw Error('no navigation in pixel effect') } }) },
  '@/lib/analytics': { trackEvent: (...args) => pageViews.push(args) },
  '@/lib/viralTopics': {}, '@/lib/firstWinHandshake': {},
  '@/lib/growth/checkoutSuccessFlow': load('lib/growth/checkoutSuccessFlow.ts'),
  '@/lib/growth/checkoutSuccessEntitlement': load('lib/growth/checkoutSuccessEntitlement.ts'),
  '@/lib/growth/verifiedCheckoutPurchase': policy,
  '@/lib/growth/observeCheckoutPurchase': { observeCheckoutPurchase: input => {
    observed.push(input); return () => { cleanupCalled = true }
  } },
}, { window: { location: { search: `?session_id=${sessionId}&amount=99999999&currency=FAKE` }, fetch: async () => {} } })
page.default()
const cleanup = effects[1]()
eq(observed.length, 1, 'actual page mounts verified observer')
eq(observed[0].sessionId, sessionId, 'only ID comes from URL')
eq(Object.keys(pageViews[0][1]).sort(), ['payment_evidence','stripe_session_id','version'], 'page view contains no forged money')
eq(pageViews[0][0], 'checkout_success_viewed', 'view remains a view, not payment_success')
cleanup(); eq(cleanupCalled, true, 'page unmount cancels observer')
console.log(`Verified checkout purchase: ${checks}/${checks} assertions passed (offline, zero external calls).`)
