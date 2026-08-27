#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

function executeTs(file, mocks = {}, env = {}) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error(`unmocked import ${id} while executing ${file}`)
    },
    process: { env },
    console: { log() {}, warn() {}, error() {} },
    URL,
    Date,
    Promise,
    RegExp,
    Set,
  }, { filename: file })
  return moduleBox.exports
}

class Query {
  constructor(table, state) {
    this.table = table
    this.state = state
    this.operation = 'select'
    this.payload = null
    this.filters = {}
  }
  select() { return this }
  eq(field, value) { this.filters[field] = value; return this }
  limit() { return this }
  update(payload) { this.operation = 'update'; this.payload = payload; return this }
  insert(payload) { this.operation = 'insert'; this.payload = payload; return this }
  async maybeSingle() {
    const s = this.state
    if (this.table === 'affiliate_referrals' && this.operation === 'select') {
      s.referralReads++
      if (s.referralLookupError) return { data: null, error: { code: 'REF_LOOKUP' } }
      return { data: s.referral, error: null }
    }
    if (this.table === 'affiliates' && this.operation === 'select') {
      s.affiliateReads++
      if (s.affiliateLookupError) return { data: null, error: { code: 'AFF_LOOKUP' } }
      return { data: s.affiliate, error: null }
    }
    if (this.table === 'affiliate_clicks' && this.operation === 'select') {
      s.clickReads++
      if (s.clickLookupError) return { data: null, error: { code: 'CLICK_LOOKUP' } }
      const valid = s.click && s.click.id === this.filters.id && s.click.affiliate_id === this.filters.affiliate_id
      return { data: valid ? s.click : null, error: null }
    }
    if (this.table === 'events' && this.operation === 'select') {
      s.paymentReads++
      if (s.paymentLookupError) return { data: null, error: { code: 'PAY_LOOKUP' } }
      return { data: s.priorPayment ? { id: 'payment-event' } : null, error: null }
    }
    if (this.table === 'affiliate_referrals' && this.operation === 'insert') {
      s.insertPayloads.push(this.payload)
      if (s.insertMode === 'failure') return { data: null, error: { code: 'INSERT' } }
      if (s.insertMode === 'race') {
        s.referral = s.raceWinner
        return { data: null, error: { code: '23505' } }
      }
      const row = { id: 'ref-new', affiliate_id: this.payload.affiliate_id }
      s.referral = row
      return { data: row, error: null }
    }
    if (this.table === 'profiles' && this.operation === 'update') {
      s.stampPayloads.push(this.payload)
      if (s.stampFailure) return { data: null, error: { code: 'STAMP' } }
      return { data: { id: this.filters.id, affiliate_id: this.payload.affiliate_id }, error: null }
    }
    throw new Error(`unexpected query ${this.table}/${this.operation}`)
  }
}

const CLICK_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_CLICK_ID = '22222222-2222-4222-8222-222222222222'
const now = Date.now()
const iso = (delta) => new Date(now + delta).toISOString()

function makeState(overrides = {}) {
  return {
    referral: null,
    affiliate: { id: 'affiliate-new', user_id: 'affiliate-owner', status: 'active' },
    click: { id: CLICK_ID, affiliate_id: 'affiliate-new', created_at: iso(-60 * 60 * 1000) },
    authCreatedAt: iso(-30 * 60 * 1000),
    referralLookupError: false,
    affiliateLookupError: false,
    clickLookupError: false,
    paymentLookupError: false,
    priorPayment: false,
    insertMode: 'success',
    raceWinner: { id: 'ref-winner', affiliate_id: 'affiliate-first' },
    stampFailure: false,
    referralReads: 0,
    affiliateReads: 0,
    clickReads: 0,
    paymentReads: 0,
    authReads: 0,
    insertPayloads: [],
    stampPayloads: [],
    ...overrides,
  }
}

function load(state, { missingEnv = false, createThrows = false } = {}) {
  return executeTs('lib/affiliateAttribution.ts', {
    '@supabase/supabase-js': {
      createClient: () => {
        if (createThrows) throw new Error('provider unavailable')
        return {
          from: (table) => new Query(table, state),
          auth: { admin: { async getUserById() {
            state.authReads++
            if (state.authLookupError) return { data: { user: null }, error: { code: 'AUTH' } }
            return { data: { user: { created_at: state.authCreatedAt } }, error: null }
          } } },
        }
      },
    },
  }, missingEnv ? {} : {
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.test',
    SUPABASE_SERVICE_ROLE_KEY: 'test-only',
  })
}

{
  const module = load(makeState())
  equal(module.normalizeAffiliateCode(' abcd2345 '), 'ABCD2345', 'affiliate code normalizes')
  for (const bad of [null, '', 'ABC', 'ABCD1234', 'ABCDI234', 'https://evil']) {
    equal(module.normalizeAffiliateCode(bad), null, `invalid code rejected: ${bad}`)
  }
  equal(module.normalizeAffiliateClickId(CLICK_ID.toUpperCase()), CLICK_ID, 'UUID proof normalizes')
  for (const bad of [null, '', 'not-a-uuid', '11111111-1111-0111-8111-111111111111']) {
    equal(module.normalizeAffiliateClickId(bad), null, `invalid UUID rejected: ${bad}`)
  }

  const fixedNow = Date.parse('2026-08-27T18:00:00.000Z')
  const click = '2026-08-27T17:00:00.000Z'
  equal(module.isAffiliateClickEligible({ accountCreatedAt: click, clickCreatedAt: click, nowMs: fixedNow }), true, 'equal server timestamps are eligible')
  equal(module.isAffiliateClickEligible({ accountCreatedAt: '2026-08-27T16:59:59.999Z', clickCreatedAt: click, nowMs: fixedNow }), false, 'account one millisecond before click is rejected')
  equal(module.isAffiliateClickEligible({ accountCreatedAt: '2026-08-27T17:30:00.000Z', clickCreatedAt: click, nowMs: fixedNow }), true, 'account after click is eligible')
  equal(module.isAffiliateClickEligible({ accountCreatedAt: click, clickCreatedAt: '2026-08-27T19:00:00.000Z', nowMs: fixedNow }), false, 'future click is rejected')
  equal(module.isAffiliateClickEligible({ accountCreatedAt: click, clickCreatedAt: '2026-05-01T00:00:00.000Z', nowMs: fixedNow }), false, 'expired click is rejected')
}

{
  const s = makeState()
  const result = await load(s).attributeAffiliateForUser(
    'ABCD2345',
    { id: 'buyer', email: 'buyer@example.test', createdAt: s.authCreatedAt },
    { allowNewAttribution: true, clickId: CLICK_ID },
  )
  check(result.ok, 'valid click creates referral')
  equal(result.affiliateId, 'affiliate-new', 'valid click returns canonical owner')
  equal(result.already, false, 'new referral is not labeled existing')
  equal(s.insertPayloads.length, 1, 'one referral inserted')
  equal(s.insertPayloads[0].email, 'buyer@example.test', 'email preserved')
  equal(s.clickReads, 1, 'protected click ledger consulted')
}

{
  const s = makeState({ authCreatedAt: null })
  s.authCreatedAt = iso(-30 * 60 * 1000)
  const result = await load(s).attributeAffiliateForUser('ABCD2345', { id: 'buyer' }, { clickId: CLICK_ID })
  check(result.ok, 'missing caller timestamp falls back to Auth admin')
  equal(s.authReads, 1, 'Auth admin read occurs exactly once')
}

{
  const delayed = makeState({
    click: { id: CLICK_ID, affiliate_id: 'affiliate-new', created_at: iso(-3 * 24 * 60 * 60 * 1000) },
    authCreatedAt: iso(-24 * 60 * 60 * 1000),
  })
  const result = await load(delayed).attributeAffiliateForUser(
    'ABCD2345', { id: 'delayed', createdAt: delayed.authCreatedAt }, { clickId: CLICK_ID },
  )
  check(result.ok, 'delayed confirmation inside 90 days remains eligible')
}

for (const [name, overrides, options, reason] of [
  ['missing proof', {}, { clickId: null }, 'invalid_click_proof'],
  ['wrong proof id', {}, { clickId: OTHER_CLICK_ID }, 'invalid_click_proof'],
  ['proof lookup outage', { clickLookupError: true }, { clickId: CLICK_ID }, 'lookup_failed'],
  ['account predates click', { authCreatedAt: iso(-2 * 60 * 60 * 1000) }, { clickId: CLICK_ID }, 'ineligible_existing_account'],
  ['unknown code', { affiliate: null }, { clickId: CLICK_ID }, 'unknown_code'],
  ['inactive affiliate', { affiliate: { id: 'affiliate-new', user_id: 'owner', status: 'suspended' } }, { clickId: CLICK_ID }, 'inactive_affiliate'],
  ['self referral', { affiliate: { id: 'affiliate-new', user_id: 'buyer', status: 'active' } }, { clickId: CLICK_ID }, 'self_referral'],
  ['insert failure', { insertMode: 'failure' }, { clickId: CLICK_ID }, 'insert_failed'],
  ['stamp failure', { stampFailure: true }, { clickId: CLICK_ID }, 'profile_stamp_failed'],
]) {
  const s = makeState(overrides)
  const result = await load(s).attributeAffiliateForUser(
    'ABCD2345', { id: 'buyer', createdAt: s.authCreatedAt }, { allowNewAttribution: true, ...options },
  )
  equal(result.ok, false, `${name} fails closed`)
  equal(result.reason, reason, `${name} keeps useful reason`)
}

{
  const s = makeState({ referral: { id: 'ref-existing', affiliate_id: 'affiliate-first' } })
  const result = await load(s).attributeAffiliateForUser(null, { id: 'old-buyer' }, { allowNewAttribution: false })
  check(result.ok, 'canonical referral repairs without cookie or proof')
  equal(result.affiliateId, 'affiliate-first', 'canonical first-touch wins')
  equal(s.affiliateReads, 0, 'competing code is never resolved')
}

{
  const s = makeState({ insertMode: 'race', raceWinner: { id: 'ref-race', affiliate_id: 'affiliate-first' } })
  const result = await load(s).attributeAffiliateForUser(
    'ABCD2345', { id: 'buyer', createdAt: s.authCreatedAt }, { clickId: CLICK_ID },
  )
  check(result.ok, 'unique race reconciles')
  equal(result.affiliateId, 'affiliate-first', 'race winner owns first-touch')
}

function createResponse(body, status = 200) {
  const response = { body, status, cookieWrites: [] }
  response.cookies = { set: (name, value, options) => response.cookieWrites.push({ name, value, options }) }
  return response
}

async function runEndpoint({ code = 'ABCD2345', clickId = CLICK_ID, user = { id: 'buyer', email: 'b@test', created_at: iso(-1000) }, result = { ok: true, affiliateId: 'private', already: false } } = {}) {
  let captured = null
  const store = { sf_aff: code, sf_aff_click: clickId }
  const endpoint = executeTs('app/api/affiliate/attribute/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => createResponse(body, init?.status ?? 200) } },
    'next/headers': { cookies: () => ({ get: (name) => store[name] ? { value: store[name] } : undefined }) },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@/lib/affiliateAttribution': {
      normalizeAffiliateCode: (value) => /^[A-HJ-NP-Z2-9]{8}$/.test(value ?? '') ? value : null,
      normalizeAffiliateClickId: (value) => value === CLICK_ID ? value : null,
      attributeAffiliateForUser: async (...args) => { captured = args; return result },
    },
  })
  return { response: await endpoint.POST(), captured }
}

{
  const { response, captured } = await runEndpoint()
  equal(response.body.ok, true, 'endpoint exposes success')
  equal(response.body.affiliateId, undefined, 'endpoint hides internal UUID')
  equal(captured[1].createdAt !== null, true, 'endpoint forwards immutable Auth creation')
  equal(captured[2].clickId, CLICK_ID, 'endpoint forwards protected proof')
  equal(response.cookieWrites.length, 3, 'success clears code, proof and hint')
}
{
  const { response } = await runEndpoint({ result: { ok: false, reason: 'invalid_click_proof' } })
  equal(response.cookieWrites.length, 3, 'terminal proof failure clears poisoned pair and hint')
}
{
  const { response } = await runEndpoint({ result: { ok: false, reason: 'lookup_failed' } })
  equal(response.cookieWrites.length, 0, 'transient failure preserves cookies for retry')
}
{
  const { response } = await runEndpoint({ user: null })
  equal(response.status, 401, 'endpoint requires authentication')
}

const checkout = read('app/api/stripe/checkout/route.ts')
check(checkout.includes('resolveCustomAffiliateBeforeSubscription(req, user, profile)'), 'subscription checkout closes the client-effect race server-side')
check(checkout.indexOf('resolveCustomAffiliateBeforeSubscription(req, user, profile)') < checkout.indexOf('stripe.checkout.sessions.create'), 'attribution finishes before Stripe Session creation')
check(checkout.includes("const affiliateSystem = customAffiliateId ? 'custom'"), 'verified custom attribution owns the subscription')
check(!checkout.includes('custom_affiliate_recovery_code'), 'checkout does not promise unsupported webhook recovery metadata')

const webhook = read('app/api/stripe/webhook/route.ts')
check(!webhook.includes('fulfill_stripe_credit_pack'), 'growth sprint leaves credit-pack fulfillment untouched')
check(!webhook.includes('fulfill_stripe_renewal'), 'growth sprint leaves renewal fulfillment untouched')

const dashboard = read('app/(dashboard)/affiliate/page.tsx')
check(dashboard.includes('async function copyLink()'), 'link clipboard handler is async')
check(dashboard.includes('await navigator.clipboard.writeText(link)'), 'copied metric waits for real clipboard success')
check(dashboard.includes('Link visits'), 'raw event count is honestly labeled')

console.log(`PASS — ${checks}/${checks} affiliate attribution checks`)
