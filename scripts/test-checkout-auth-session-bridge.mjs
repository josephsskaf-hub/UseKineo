#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')

function source(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function loadTs(rel, mocks = {}) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => {
      if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
      throw new Error(`${rel} imported unexpected module: ${id}`)
    },
    module,
    module.exports,
  )
  return module.exports
}

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

function storageFor(map) {
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
  }
}

function cookieJar() {
  const values = new Map()
  const writes = []
  const document = { referrer: '' }
  Object.defineProperty(document, 'cookie', {
    get: () => [...values].map(([key, value]) => `${key}=${value}`).join('; '),
    set: (raw) => {
      writes.push(String(raw))
      const [pair, ...attributes] = String(raw).split(';').map((part) => part.trim())
      const split = pair.indexOf('=')
      const name = pair.slice(0, split)
      const value = pair.slice(split + 1)
      const expires = attributes.some((item) => item.toLowerCase() === 'max-age=0')
      if (expires) values.delete(name)
      else values.set(name, value)
    },
  })
  return { document, values, writes }
}

const bridge = loadTs('lib/growth/checkoutAuthSessionBridge.ts')
equal(bridge.CHECKOUT_AUTH_SESSION_BRIDGE_VERSION, 'checkout_auth_session_bridge_v1', 'version is stable')
equal(bridge.EVENT_SESSION_COOKIE, 'kineo_event_session_id', 'existing event-session cookie is reused')
equal(bridge.CHECKOUT_AUTH_SESSION_COOKIE, 'kineo_checkout_auth_session_id', 'checkout auth has a companion cookie')
equal(bridge.CHECKOUT_AUTH_SESSION_MAX_AGE_SECONDS, 1800, 'companion expires after 30 minutes')

for (const valid of [
  '550e8400-e29b-41d4-a716-446655440000',
  'm4f8w2ab-k9q1j4z7',
  'A2345678_opaque-session',
]) {
  equal(bridge.normalizeEventSessionId(valid), valid, `accepts opaque generated id: ${valid}`)
}
for (const invalid of [null, undefined, '', 'short', 'contains space', 'person@example.com', 'https://example.com/session', '../checkout', 'a'.repeat(65)]) {
  equal(bridge.normalizeEventSessionId(invalid), null, `rejects free-form cookie: ${String(invalid)}`)
}
equal(bridge.normalizeEventSessionId(' 550e8400-e29b-41d4-a716-446655440000 '), '550e8400-e29b-41d4-a716-446655440000', 'trims a valid cookie')

// Execute the real analytics module. This proves that the ID in the POST body,
// ordinary cookie and pinned checkout cookie is the same opaque value.
const jar = cookieJar()
const tabA = new Map()
const tabB = new Map()
let nextUuid = '550e8400-e29b-41d4-a716-446655440000'
const fetchBodies = []
globalThis.document = jar.document
globalThis.window = {
  location: { protocol: 'https:', search: '', hostname: 'www.usekineo.com', pathname: '/signup' },
  crypto: { randomUUID: () => nextUuid },
}
globalThis.sessionStorage = storageFor(tabA)
globalThis.fetch = async (_url, options) => {
  fetchBodies.push(JSON.parse(options.body))
  return { ok: true, json: async () => ({ stored: true }) }
}
const analyticsModule = loadTs('lib/analytics.ts', {
  '@/lib/acquisitionSource': {
    internalSurfaceLabel: () => null,
    sanitizeAcquisitionReferrer: () => null,
    sanitizeAcquisitionUtmSource: () => null,
  },
  '@/lib/growth/checkoutAuthSessionBridge': bridge,
})
const pinnedA = analyticsModule.pinCheckoutAuthSession()
equal(pinnedA, nextUuid, 'pin returns this tab session')
equal(jar.values.get(bridge.EVENT_SESSION_COOKIE), nextUuid, 'ordinary event cookie receives tab A')
equal(jar.values.get(bridge.CHECKOUT_AUTH_SESSION_COOKIE), nextUuid, 'companion receives the same tab A id')
const companionWrite = jar.writes.find((row) => row.startsWith(`${bridge.CHECKOUT_AUTH_SESSION_COOKIE}=`))
ok(companionWrite.includes('Path=/'), 'companion is host-wide for the callback path')
ok(companionWrite.includes('SameSite=Lax'), 'companion survives a top-level OAuth GET')
ok(companionWrite.includes('Secure'), 'companion is secure in production')
ok(companionWrite.includes('Max-Age=1800'), 'companion has a short TTL')
await analyticsModule.trackEvent('checkout_auth_page_view', { test: true })
equal(fetchBodies.at(-1).session_id, pinnedA, 'browser event body carries the pinned id')

// Simulate a generic event in another tab. It may replace the global cookie,
// but must never replace the pinned checkout-auth companion.
nextUuid = '660e8400-e29b-41d4-a716-446655440000'
globalThis.sessionStorage = storageFor(tabB)
await analyticsModule.trackEvent('unrelated_event', {})
equal(fetchBodies.at(-1).session_id, nextUuid, 'tab B gets its own browser session')
equal(jar.values.get(bridge.EVENT_SESSION_COOKIE), nextUuid, 'tab B replaces only the generic event cookie')
equal(jar.values.get(bridge.CHECKOUT_AUTH_SESSION_COOKIE), pinnedA, 'tab A checkout companion survives tab B activity')

// Execute the real auth analytics classifier with a mocked writer/pinner.
const recorded = []
let pins = 0
const markerStorage = new Map()
globalThis.window = {}
globalThis.performance = { timeOrigin: 1_725_000_000_000 }
globalThis.sessionStorage = storageFor(markerStorage)
const authModule = loadTs('lib/authAnalytics.ts', {
  '@/lib/analytics': {
    pinCheckoutAuthSession: () => { pins++; return pinnedA },
    trackEvent: (name, metadata) => { recorded.push({ name, metadata }); return Promise.resolve(true) },
  },
  '@/lib/authRedirect': { normalizeInternalRedirect: (value) => typeof value === 'string' && value.startsWith('/') ? value : null },
  '@/lib/growth/bulkCheckoutAuthContext': { readBulkCheckoutAuthContext: () => null },
  '@/lib/growth/checkoutPasswordRecovery': { checkoutPasswordRecoveryTelemetry: () => ({}) },
  '@/lib/growth/checkoutSignupResolution': { CHECKOUT_SIGNUP_RESOLUTION_VERSION: 'checkout_signup_resolution_v1' },
  '@/lib/growth/checkoutAuthSessionBridge': bridge,
})
authModule.trackCheckoutAuthStep('method_selected', 'signup_page', '/api/stripe/checkout?tier=starter&billing=monthly', 'google', 'automatic')
authModule.trackCheckoutAuthStep('method_selected', 'login_page', '/api/stripe/checkout?tier=basic&billing=annual', 'email')
authModule.trackCheckoutAuthStep('fallback_presented', 'auth_modal', '/api/stripe/checkout?tier=pro&billing=monthly', 'email')
authModule.trackCheckoutAuthStep('page_view', 'signup_page', '/api/stripe/checkout?tier=starter&billing=monthly')
authModule.trackCheckoutAuthStep('page_view', 'login_page', 'https://evil.example/checkout')
equal(recorded.length, 4, 'only valid checkout destinations emit')
equal(pins, 4, 'every real checkout entry pins its tab before navigation')
equal(recorded[0].name, 'checkout_auth_method_selected', 'automatic path keeps the canonical selection event')
equal(recorded[0].metadata.selection_kind, 'automatic', 'automatic OAuth is classified explicitly')
equal(recorded[1].metadata.selection_kind, 'explicit', 'ordinary method clicks default to explicit')
equal(recorded[2].name, 'checkout_auth_fallback_presented', 'presented fallback is not counted as method selected')
equal(Object.hasOwn(recorded[2].metadata, 'selection_kind'), false, 'fallback cannot masquerade as a selection')
equal(recorded[3].name, 'checkout_auth_page_view', 'page view keeps its canonical event')
for (const row of recorded) {
  equal(row.metadata.auth_session_bridge_version, bridge.CHECKOUT_AUTH_SESSION_BRIDGE_VERSION, `${row.name} carries the bridge version`)
  ok(!JSON.stringify(row.metadata).includes('evil.example'), 'raw rejected destination never enters telemetry')
}

// Execute the real callback GET with boundary mocks. This proves cookie →
// writeServerEvent for both outcomes, invalid-cookie fail-closed, no raw token
// in metadata, and one-shot clearing of the companion.
const callbackEvents = []
const responseCookieWrites = []
let checkoutCookieValue = pinnedA
let exchangeSucceeds = true
const user = {
  id: 'external-user-id',
  email: 'external@example.com',
  created_at: '2026-09-01T10:00:00.000Z',
  last_sign_in_at: '2026-09-01T10:10:00.000Z',
  app_metadata: { provider: 'google' },
}
const callbackModule = loadTs('app/auth/callback/route.ts', {
  'next/server': {
    NextResponse: {
      redirect: (url) => ({
        url: String(url),
        cookies: { set: (name, value, options) => responseCookieWrites.push({ name, value, options }) },
      }),
    },
  },
  'next/headers': {
    cookies: () => ({
      get: (name) => name === bridge.CHECKOUT_AUTH_SESSION_COOKIE && checkoutCookieValue !== null
        ? { value: checkoutCookieValue }
        : undefined,
    }),
  },
  '@/lib/supabase/server': {
    createClient: () => ({
      auth: {
        exchangeCodeForSession: async () => exchangeSucceeds
          ? { data: { user }, error: null }
          : { data: { user: null }, error: new Error('mock exchange failure') },
      },
    }),
  },
  '@/lib/authRedirect': { resolveAuthRedirect: (value, fallback) => typeof value === 'string' && value.startsWith('/') ? value : fallback },
  '@/lib/serverEvents': { writeServerEvent: async (event) => { callbackEvents.push(event); return true } },
  '@/lib/reverseTrial': { maybeActivateReverseTrial: async () => ({}) },
  '@/lib/trialFingerprint': { trialFingerprintFromHeaders: () => null },
  '@/lib/growth/checkoutOAuthFailureHandoff': {
    buildCheckoutOAuthFailureHandoff: (value) => {
      const isCheckout = typeof value === 'string' && /^\/api\/(?:stripe|paypal|mercadopago)\/checkout(?:\?|$)/.test(value)
      return {
        loginPath: isCheckout
          ? `/login?error=oauth_failed&reason=checkout&redirect=${encodeURIComponent(value)}`
          : '/login?error=oauth_failed',
        telemetry: {
          version: 'checkout_oauth_failure_handoff_v1',
          is_checkout_destination: isCheckout,
          checkout_provider: isCheckout ? value.split('/')[2] : null,
        },
      }
    },
  },
  '@/lib/growth/checkoutAuthSessionBridge': bridge,
  '@/lib/affiliateSignupFinalization': {
    AFFILIATE_ATTRIBUTION_COOKIE_NAMES: ['sf_aff', 'sf_aff_click', 'sf_aff_hint'],
    finalizeAffiliateSignupAttribution: async () => ({ attempted: false, clearCookies: false, outcome: 'none' }),
  },
})

async function invokeCallback(next, withCode = true) {
  const url = new URL('https://www.usekineo.com/auth/callback')
  if (withCode) url.searchParams.set('code', 'opaque-code')
  if (next !== null) url.searchParams.set('next', next)
  return callbackModule.GET(new Request(url, { headers: { 'user-agent': 'test' } }))
}

callbackEvents.length = 0
responseCookieWrites.length = 0
exchangeSucceeds = true
checkoutCookieValue = pinnedA
await invokeCallback('/api/stripe/checkout?tier=starter&billing=monthly')
equal(callbackEvents[0].name, 'auth_callback_completed', 'successful OAuth records completion')
equal(callbackEvents[0].sessionId, pinnedA, 'successful checkout callback receives the pinned tab')
equal(callbackEvents[0].metadata.session_bridge_present, true, 'success declares bridge coverage')
ok(!JSON.stringify(callbackEvents[0].metadata).includes(pinnedA), 'success metadata never duplicates the raw token')
equal(responseCookieWrites.at(-1), {
  name: bridge.CHECKOUT_AUTH_SESSION_COOKIE,
  value: '',
  options: { maxAge: 0, path: '/', sameSite: 'lax', secure: true },
}, 'success clears the one-shot companion')

callbackEvents.length = 0
responseCookieWrites.length = 0
exchangeSucceeds = false
checkoutCookieValue = pinnedA
await invokeCallback('/api/stripe/checkout?tier=starter&billing=monthly')
equal(callbackEvents[0].name, 'auth_callback_failed', 'failed OAuth records failure')
equal(callbackEvents[0].sessionId, pinnedA, 'failed checkout callback receives the pinned tab')
equal(callbackEvents[0].metadata.session_bridge_present, true, 'failure declares bridge coverage')
ok(!JSON.stringify(callbackEvents[0].metadata).includes(pinnedA), 'failure metadata never duplicates the raw token')
equal(responseCookieWrites.at(-1).options.maxAge, 0, 'failure clears the one-shot companion')

callbackEvents.length = 0
responseCookieWrites.length = 0
exchangeSucceeds = true
checkoutCookieValue = 'person@example.com'
await invokeCallback('/api/stripe/checkout?tier=starter&billing=monthly')
equal(callbackEvents[0].sessionId, null, 'invalid companion cookie fails closed')
equal(callbackEvents[0].metadata.session_bridge_present, false, 'invalid companion is not reported as bridged')

callbackEvents.length = 0
responseCookieWrites.length = 0
exchangeSucceeds = true
checkoutCookieValue = pinnedA
await invokeCallback('/')
equal(callbackEvents[0].sessionId, null, 'non-checkout callback cannot consume checkout attribution')
equal(callbackEvents[0].metadata.session_bridge_present, false, 'non-checkout callback is not bridged')
equal(responseCookieWrites.length, 0, 'unrelated auth cannot clear another tab checkout pin')

callbackEvents.length = 0
responseCookieWrites.length = 0
exchangeSucceeds = true
checkoutCookieValue = pinnedA
await invokeCallback('/api/stripe/checkout?tier=starter&billing=monthly')
equal(callbackEvents[0].sessionId, pinnedA, 'checkout tab remains attributable after unrelated auth')
equal(responseCookieWrites.at(-1).options.maxAge, 0, 'the checkout callback consumes and clears its own pin')

console.log(`checkout auth session bridge: ${checks}/${checks} checks passed`)
