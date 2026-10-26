#!/usr/bin/env node
// KINEO-AFILIADO-50-2610: executes the real policy and the real route blocks.
// Offline only; --mutants changes and exactly restores files in this worktree.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.resolve(process.argv.find(x => x.startsWith('--root='))?.slice(7) ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const require = createRequire(import.meta.url)
const ts = require('typescript')
const POLICY = 'lib/affiliateDiscount.ts'
const ROUTE = 'app/api/stripe/checkout/route.ts'
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const asJson = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (value, expected, message) => { assert.deepEqual(asJson(value), asJson(expected), message); checks++ }
const compile = src => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
function load(rel, mocks = {}, replacement, env = {}) {
  const mod = { exports: {} }
  vm.runInNewContext(compile(replacement ?? read(rel)), {
    module: mod, exports: mod.exports, process: { env }, console: { log() {}, error() {}, warn() {} },
    require: id => { if (id in mocks) return mocks[id]; throw new Error(`unmocked import ${id} in ${rel}`) }, URL, Buffer, Date, Set, Map,
  }, { filename: rel })
  return mod.exports
}
const pricing = read('lib/checkoutPricing.ts')
const planText = pricing.match(/export function planAcceptsPromotions\([^]*?\n\}/)?.[0]
check(planText, 'real planAcceptsPromotions found')
const noPromotionPlans = pricing.match(/^export const NO_PROMOTION_PLAN_TIERS[^\n]+/m)?.[0]
const { planAcceptsPromotions } = load('lib/checkoutPricing.ts', {}, noPromotionPlans + '\n' + planText)
const policy = replacement => load(POLICY, { '@/lib/checkoutPricing': { planAcceptsPromotions } }, replacement)
const BASE = { tier: 'basic', isAnnual: false, affiliatePresent: true, discountApplied: false }
const partner = { id: 'aff-a', code: 'PARTNERA', partnerName: 'Partner A' }

async function offerResolverChecks() {
  const affiliateId = '11111111-1111-4111-8111-111111111111'
  const otherId = '22222222-2222-4222-8222-222222222222'
  const clickId = '33333333-3333-4333-8333-333333333333'
  const a = { id: affiliateId, code: 'ABCDEFGH', name: 'Partner A', status: 'active' }
  const b = { id: otherId, code: 'JKLMNPQR', name: 'Partner B', status: 'active' }
  const realCode = load('lib/affiliateCode.ts')
  const clickText = read('lib/affiliateAttribution.ts').match(/export function normalizeAffiliateClickId\([^]*?\n\}/)?.[0]
  const realClick = load('lib/affiliateAttribution.ts', {}, clickText)
  function resolver(state) {
    const db = { from(table) {
      const filters = {}
      return { select() { return this }, eq(key, value) { filters[key] = value; return this }, async maybeSingle() {
        if (table === 'affiliate_referrals') return { data: state.canonical ? { affiliate_id: state.canonical } : null, error: state.referralError ? {} : null }
        if (table === 'affiliates') return { data: [state.a ?? a, b].find(row => filters.id ? row.id === filters.id : row.code === filters.code) ?? null, error: null }
        if (table === 'affiliate_clicks') return { data: state.clickInvalid ? null : { id: clickId, created_at: new Date(Date.now() - (state.expired ? 91 * 86400000 : 1000)).toISOString() }, error: null }
        throw Error('unexpected table ' + table)
      } }
    } }
    return load('lib/affiliateLinkOffer.ts', {
      '@supabase/supabase-js': { createClient: () => db }, '@/lib/affiliateCode': realCode, '@/lib/affiliateAttribution': realClick,
    }, undefined, { NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'offline-fixture' })
  }
  equal(await resolver({}).resolveAffiliateDisplayOffer(null, undefined, undefined), null, 'no cookie or account means no affiliate offer')
  equal(await resolver({}).resolveAffiliateDisplayOffer(null, a.code, undefined), null, 'bare forged cookie has no protected click')
  equal(await resolver({ clickInvalid: true }).resolveAffiliateDisplayOffer(null, a.code, clickId), null, 'unknown protected click denied')
  equal(await resolver({ expired: true }).resolveAffiliateDisplayOffer(null, a.code, clickId), null, 'expired protected click denied')
  equal(await resolver({ a: { ...a, status: 'inactive' } }).resolveAffiliateDisplayOffer(null, a.code, clickId), null, 'inactive partner denied')
  equal((await resolver({}).resolveAffiliateDisplayOffer(null, a.code, clickId))?.partnerName, a.name, 'validated cookie retrieves registered name')
  equal((await resolver({ canonical: affiliateId }).resolveAffiliateDisplayOffer('user', undefined, undefined))?.code, a.code, 'canonical attributed account receives offer without cookie')
  equal((await resolver({ canonical: affiliateId }).resolveAffiliateDisplayOffer('user', b.code, clickId))?.code, a.code, 'canonical first touch wins over different cookie')
  equal(await resolver({ referralError: true }).resolveAffiliateDisplayOffer('user', b.code, clickId), null, 'failed canonical read cannot reassign partner')
  equal((await resolver({ a: { ...a, name: null } }).resolveAffiliateDisplayOffer(null, a.code, clickId))?.partnerName, null, 'missing registered name falls back without fabrication')
}

async function authenticated(input = {}, route = read(ROUTE), source = read(POLICY)) {
  const begin = route.indexOf('  let affiliateDiscountApplied = false')
  const end = route.indexOf('  let autoWelcome20Applied = false', begin)
  assert.ok(begin > 0 && end > begin, 'authenticated affiliate block exists')
  const p = policy(source)
  const sessionParams = { metadata: {}, subscription_data: { metadata: {} }, custom_text: {}, ...(input.sessionParams ?? {}) }
  let calls = 0
  const deps = {
    tier: 'basic', isAnnual: false, affiliateOffer: partner, discountApplied: false,
    wantsTrial: false, intro: false, checkoutRecovery: null, rawPromo: '',
    autoWelcome20: true, checkoutMetadata: {}, checkoutValueContext: { submitMessage: 'Clean MP4 after payment' }, failureContext: {}, appUrl: 'https://example.invalid', chargeCurrency: 'usd', chargeAmount: 2490,
    ...input, sessionParams,
    ...p, ensureAffiliateBaseCoupon: async () => { calls++; return input.couponUnavailable ? null : 'KINEO_AFFILIATE_50' },
    req: { nextUrl: new URL('https://example.invalid/api/stripe/checkout'), headers: new Headers() },
    affiliateOfferCopy: (_lang, name) => `50% off your first month — via ${name || 'your partner link'}`,
    buildSubscriptionCheckoutSuccessUrl: info => `https://example.invalid/success?amount=${info.amount}`,
  }
  const keys = Object.keys(deps)
  const wrapper = `async function run(${keys.join(',')}) { ${route.slice(begin, end)}; return { sessionParams, discountApplied, affiliateDiscountApplied, autoWelcome20, checkoutMetadata }; }`
  const result = await vm.runInNewContext(compile(wrapper) + '\nrun', { URL, Boolean, Object, Math, console })(...Object.values(deps))
  return { ...result, calls }
}
async function guest(input = {}, route = read(ROUTE)) {
  const fnAt = route.indexOf('async function buildGuestSubscriptionAndRedirect(')
  const begin = route.indexOf('  let affiliateDiscountApplied = false', fnAt)
  const end = route.indexOf('  const guestMetadata:', begin)
  assert.ok(fnAt > 0 && begin > fnAt && end > begin, 'guest affiliate block exists')
  const ctx = { tier: 'basic', isAnnual: false, affiliateOffer: partner, checkoutValueContext: { submitMessage: 'Clean MP4 after payment' }, ...input.ctx }
  const eligible = policy().affiliateDiscountEligible({ ...BASE, tier: ctx.tier, isAnnual: ctx.isAnnual, affiliatePresent: ctx.affiliateOffer !== null, ...input.policy })
  const params = { allow_promotion_codes: true, after_expiration: { recovery: { enabled: true, allow_promotion_codes: true } }, metadata: {}, subscription_data: { metadata: {} }, custom_text: {}, ...input.params }
  const deps = {
    ctx, params, partnerEligible: eligible, settlement: { chargeCurrency: 'usd', chargeAmount: 2490 },
    ensureAffiliateBaseCoupon: async () => 'KINEO_AFFILIATE_50',
    AFFILIATE_LINK_PROMO_SOURCE: policy().AFFILIATE_LINK_PROMO_SOURCE,
    affiliateOfferCopy: (_lang, name) => `50% off your first month — via ${name || 'your partner link'}`,
    req: { nextUrl: new URL('https://example.invalid/api/stripe/checkout'), headers: new Headers() },
    buildGuestCheckoutSuccessUrl: info => `https://example.invalid/guest/success?amount=${info.amount}`,
  }
  const wrapper = `async function run(${Object.keys(deps).join(',')}) { ${route.slice(begin, end)}; return { params, affiliateDiscountApplied }; }`
  return vm.runInNewContext(compile(wrapper) + '\nrun', { URL, Object, Math, console })(...Object.values(deps))
}

async function verify() {
  const p = policy()
  equal(p.AFFILIATE_LINK_PROMO_SOURCE, 'affiliate_link_50', 'source is stable')
  for (const tier of ['starter', 'basic', 'pro', 'business', 'autopilot', 'autopilot_lite']) {
    for (const isAnnual of [true, false]) {
      equal(p.affiliateDiscountEligible({ ...BASE, tier, isAnnual }), ['basic', 'pro'].includes(tier) && !isAnnual, `eligibility ${tier}/${isAnnual}`)
    }
  }
  for (const [key, value] of [['affiliatePresent', false], ['discountApplied', true], ['wantsTrial', true], ['intro', true], ['checkoutRecovery', true], ['promoRequested', true]]) {
    equal(p.affiliateDiscountEligible({ ...BASE, [key]: value }), false, `policy excludes ${key}`)
  }
  check(!planAcceptsPromotions('business'), 'Business real plan policy refuses promotions')
  await offerResolverChecks()
  const positive = await authenticated()
  equal(positive.sessionParams.discounts, [{ coupon: 'KINEO_AFFILIATE_50' }], 'real authenticated route sets one50 coupon')
  equal(positive.affiliateDiscountApplied, true, 'authenticated applied flag')
  equal(positive.autoWelcome20, false, 'affiliate beats autoWELCOME20')
  equal(positive.sessionParams.metadata, { public_promo_source: 'affiliate_link_50', affiliate_discount_applied: 'true', affiliate_code: 'PARTNERA' }, 'session metadata')
  equal(positive.sessionParams.subscription_data.metadata, positive.sessionParams.metadata, 'subscription metadata same source')
  equal(positive.checkoutMetadata.affiliate_discount_applied, true, 'event flag is boolean')
  check(positive.sessionParams.custom_text.submit.message.includes('via Partner A'), 'hosted checkout names partner')
  check(positive.sessionParams.success_url.endsWith('amount=1245'), 'success amount reflects actual discounted first charge')
  const existing = [{ promotion_code: 'EXPLICIT' }]
  for (const shape of [
    { tier: 'business' }, { isAnnual: true }, { affiliateOffer: null },
    { sessionParams: { discounts: existing } }, { discountApplied: true },
    { rawPromo: 'EXPLICIT' }, { intro: true }, { checkoutRecovery: {} }, { wantsTrial: true },
  ]) {
    const denied = await authenticated(shape)
    equal(denied.affiliateDiscountApplied, false, `route excludes ${JSON.stringify(shape)}`)
    equal(denied.calls, 0, 'ineligible route does not create coupon')
    if (shape.sessionParams) equal(denied.sessionParams.discounts, existing, 'existing discount preserved exactly')
  }
  const unavailable = await authenticated({ couponUnavailable: true })
  equal(unavailable.affiliateDiscountApplied, false, 'Stripe failure does not claim applied')
  equal(unavailable.checkoutMetadata.affiliate_discount_failure, 'coupon_unavailable', 'Stripe failure observable')
  const g = await guest()
  equal(g.params.discounts, [{ coupon: 'KINEO_AFFILIATE_50' }], 'guest route puts same coupon')
  equal(g.params.metadata.affiliate_code, 'PARTNERA', 'guest metadata identifies partner')
  equal(g.params.allow_promotion_codes, undefined, 'guest manual code disabled after discount')
  equal(g.params.after_expiration.recovery.allow_promotion_codes, false, 'guest recovered session cannot stack code')
  check(g.params.success_url.includes('/guest/success'), 'guest success keeps account-claim flow')
  for (const input of [{ ctx: { tier: 'business' } }, { ctx: { isAnnual: true } }, { ctx: { affiliateOffer: null } }, { params: { discounts: existing } }]) {
    equal((await guest(input)).affiliateDiscountApplied, false, 'guest excludes annual/Business/unattributed/already discounted')
  }
  const route = read(ROUTE)
  check(route.indexOf('const customAffiliateId = await resolveCustomAffiliateBeforeSubscription') < route.indexOf('  let affiliateDiscountApplied = false'), 'canonical first-touch resolves before discount')
  check(route.includes("affiliateOffer = await resolveAffiliateDisplayOffer(user.id, req.cookies.get('sf_aff')?.value, req.cookies.get('sf_aff_click')?.value)"), 'canonical account replaces cookie partner via read-only resolver')
  check(route.includes('affiliate_discount_applied: affiliateDiscountApplied,'), 'checkout_started reads actual result')
  check(route.includes('affiliate_code: affiliateOffer?.code ?? null,'), 'checkout_started records canonical partner code')
  check(route.indexOf('  let affiliateDiscountApplied = false') < route.indexOf('  let autoWelcome20Applied = false'), 'affiliate executes before automatic welcome')

  // The unchanged webhook pays commission on the actually paid value.
  const webhook = read('app/api/stripe/webhook/route.ts')
  check(/amountGross: session\.amount_total \?\? 0[^\n]*type: 'initial'/.test(webhook), 'initial commission receives session.amount_total after discounts')
  check(/amountGross: invoice\.amount_paid \?\? 0[^\n]*type: 'recurring'/.test(webhook), 'renewal commission receives invoice.amount_paid')
  check(webhook.includes('calculateAffiliateCommission(args.amountGross, chargeRate)'), 'webhook uses actual paid gross, not plan list price')
  const { calculateAffiliateCommission } = load('lib/affiliateLedger.ts')
  const { effectiveAffiliateCommissionRate } = load('lib/affiliateCommission.ts')
  for (const [date, rate] of [['2026-10-15T00:00:00Z', .3], ['2026-10-01T00:00:00Z', .4]]) {
    equal(effectiveAffiliateCommissionRate(.3, date), rate, '30/40 commission terms unchanged')
    equal(calculateAffiliateCommission(1245, rate), Math.round(1245 * rate), 'first charge commission uses discounted paid amount')
    equal(calculateAffiliateCommission(2490, rate), Math.round(2490 * rate), 'renewal commission uses actual amount_paid')
  }
}

await verify()
if (process.argv.includes('--mutants')) {
  const target = path.join(ROOT, POLICY)
  const original = fs.readFileSync(target)
  const src = original.toString('utf8')
  const mutants = [
    ['stack discount', '!input.discountApplied && ', ''],
    ['annual', '!input.isAnnual && ', ''],
    ['Business', "(input.tier === 'basic' || input.tier === 'pro')", "(input.tier === 'basic' || input.tier === 'pro' || input.tier === 'business')"],
    ['no cookie or account attribution', 'input.affiliatePresent &&', 'true &&'],
  ]
  try {
    for (const [name, from, to] of mutants) {
      assert.equal(src.split(from).length, 2, `unique mutant anchor ${name}`)
      let mutated = src.replace(from, to)
      if (name === 'Business') mutated = mutated.replace('planAcceptsPromotions(input.tier) &&', 'true &&')
      try {
        fs.writeFileSync(target, mutated)
        let killed = false
        try { await verify() } catch { killed = true }
        check(killed, `mutant killed: ${name}`)
        console.log(`MUTANT KILLED: ${name}`)
      } finally { fs.writeFileSync(target, original); assert.ok(fs.readFileSync(target).equals(original), `exact Buffer restore ${name}`) }
    }
  } finally { fs.writeFileSync(target, original); assert.ok(fs.readFileSync(target).equals(original), 'final exact Buffer restore') }
  await verify()
  console.log('Exact Buffer restoration and positive control passed.')
}
console.log(`OK affiliate50: ${checks} checks, offline real policy, authenticated and guest route blocks, paid commission.`)
