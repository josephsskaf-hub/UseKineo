// Offline guardian: exercises real offer arithmetic, billing handoff and fail-closed
// eligibility. Mutants must fail these same contracts, not their own special tests.
import { readFileSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = 'lib/offers/mrrConversion.ts'
const rd = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const source = rd(file)
function load(overrides = {}) {
  const cache = new Map()
  function get(p) {
    p = p.replace(/\\/g, '/')
    if (cache.has(p)) return cache.get(p)
    const exports = {}; cache.set(p, exports)
    const code = ts.transpileModule(overrides[p] ?? rd(p), { compilerOptions: { module: 1, target: 9 } }).outputText
    vm.runInNewContext(code, { exports, URL, console, process: { env: {} }, require: id => {
      if (id.startsWith('@/')) return get(id.slice(2) + '.ts')
      if (id.startsWith('.')) return get(relative(root, resolve(root, dirname(p), id)) + '.ts')
      throw new Error('unexpected import: ' + id)
    } }, { filename: p })
    return exports
  }
  return get
}
function battery(overrides = {}) {
  const get = load(overrides), offer = get(file), price = get('lib/checkoutPricing.ts')
  const cost = get('lib/credits/engineCost.ts'), clip = get('lib/clips/clipPricing.ts')
  assert.equal(offer.MRR_CONVERSION_ENABLED, true)
  assert.equal(offer.CONVERSION_CLIP_SECONDS, 5)
  for (const credits of [0, 9, 34, 35, 60, 150, 300]) {
    const result = offer.conversionCapacity(credits)
    assert.equal(result.films, Math.floor(credits / cost.creditCostForDuration('cinematic_ai', true, price.PACK_ADVERTISED_SECONDS.starter)))
    assert.equal(result.clips, Math.floor(credits / clip.clipCreditCost('seedance', 5)))
    assert.match(offer.conversionCapacityLabel(credits), / OR /)
  }
  assert.equal(offer.conversionPass().price, price.packPriceLabel())
  for (const tier of offer.CONVERSION_TIERS) {
    const annual = offer.conversionPlan(tier, 'annual', 'usd', 'standard')
    assert.equal(annual.price, price.formatCheckoutMoney('usd', price.getAnnualPrice(tier, 'usd')))
    assert.equal(annual.period, '/year')
    assert.match(annual.renewal, /Full year charged now; allowance arrives monthly/)
    assert.ok(annual.capacity.includes(offer.conversionCapacityLabel(price.TIER_CREDITS[tier])))
    const monthly = offer.conversionPlan(tier, 'monthly', 'usd', 'standard')
    const intro = tier !== 'pro' && price.hasIntroOffer(tier, 'usd', 'standard')
    assert.equal(monthly.price, price.formatCheckoutMoney('usd', intro ? price.getIntroPrice(tier, 'usd') : price.getTierPrice(tier, 'usd')))
    assert.ok(monthly.capacity.includes(offer.conversionCapacityLabel(intro ? price.INTRO_CREDITS[tier] : price.TIER_CREDITS[tier])))
    assert.ok(monthly.renewal.includes(offer.conversionCapacityLabel(price.TIER_CREDITS[tier])))
  }
  const p = { trial_status: 'region_paid_only', has_paid: false, plan: 'free' }
  assert.equal(offer.paidOnlyEntry(p), true)
  for (const row of [null, {}, { ...p, has_paid: null }, { ...p, has_paid: true }, { ...p, plan: 'basic' }, { ...p, trial_status: 'active' }]) assert.equal(offer.paidOnlyEntry(row), false)
  for (const surface of ['upgrade', 'pricing']) for (const choice of ['pass', 'starter_monthly', 'basic_annual', 'pro_annual']) {
    const path = '/api/stripe/checkout?tier=basic&billing=annual&return=studio&promo=KEPT&currency=brl'
    const href = new URL(offer.conversionCheckoutHref(path, surface, choice), 'https://www.usekineo.com')
    assert.equal(href.searchParams.get('intent_campaign'), `mrr0610_v1_${surface}_${choice}`)
    for (const [key, value] of new URL(path, href.origin).searchParams) assert.equal(href.searchParams.get(key), value)
    assert.equal(offer.conversionMetadata(surface, choice).offer_version, 'mrr0610_v1')
  }
  assert.equal(offer.conversionCheckoutHref('/api/stripe/checkout?tier=autopilot', 'pricing', 'autopilot_monthly'), '/api/stripe/checkout?tier=autopilot')
}
battery()
const mutate = (before, after) => {
  assert.ok(source.includes(before), 'mutant target missing: ' + before)
  return { [file]: source.replace(before, after) }
}
const mutants = [
  ['overpromise films', mutate('Math.floor(credits / creditCostForDuration', 'Math.ceil(credits / creditCostForDuration')],
  ['overpromise clips', mutate('Math.floor(credits / clipCreditCost', 'Math.ceil(credits / clipCreditCost')],
  ['wrong clip duration', mutate('CONVERSION_CLIP_SECONDS = 5', 'CONVERSION_CLIP_SECONDS = 12')],
  ['sum alternatives', mutate('s OR ${clips}', 's AND ${clips}')],
  ['made up pass price', mutate('price: packPriceLabel()', "price: '$3.99'")],
  ['monthly amount sold as annual', mutate('const annual = getAnnualPrice(tier, currency, region)', 'const annual = getTierPrice(tier, currency, region)')],
  ['annual labeled monthly', mutate("? '/year'", "? '/month'")],
  ['annual hides upfront charge', mutate('Full year charged now; allowance arrives monthly.', 'Pay each month.')],
  ['unknown payer accepted', mutate('profile.has_paid === false', 'profile.has_paid !== true')],
  ['subscribers accepted', mutate("profile.plan === 'free'", "typeof profile.plan === 'string'")],
  ['trial accepted', mutate("profile?.trial_status === 'region_paid_only'", 'Boolean(profile?.trial_status)')],
  ['loses offer attribution', mutate("url.searchParams.set('intent_campaign'", "url.searchParams.set('wrong_campaign'")],
  ['no offer version', mutate('offer_version: MRR_CONVERSION_VERSION', "offer_version: 'unversioned'")],
]
for (const [name, over] of mutants) {
  assert.throws(() => battery(over), undefined, 'mutant survived: ' + name)
  console.log('mutant rejected: ' + name)
}
const disabled = load(mutate('MRR_CONVERSION_ENABLED = true', 'MRR_CONVERSION_ENABLED = false'))(file)
assert.equal(disabled.conversionCheckoutHref('/api/stripe/checkout?pack=starter', 'upgrade', 'pass'), '/api/stripe/checkout?pack=starter')
const modal = rd('components/offers/ConversionUpgrade.tsx')
const generate = rd('app/(dashboard)/generate/GenerateClient.tsx')
const pricing = rd('app/pricing/PricingClient.tsx')
assert.ok(modal.indexOf('surface="upgrade" onBuy={onFilmPass}') < modal.indexOf('Making more? Choose a plan.'))
assert.ok(pricing.indexOf('<ConversionPricingEntry />') < pricing.indexOf('<div id="plans"'))
assert.ok(modal.includes("['monthly', 'annual']"))
assert.ok(modal.includes("v.status === 'completed'"))
assert.ok(modal.includes('PUBLIC_ENGINE_EXAMPLES.find'))
assert.ok(modal.includes('A short excerpt'))
assert.ok(!modal.includes('autoPlay'))
assert.ok(modal.includes(".eq('id', data.user.id)"))
assert.ok(modal.includes('if (alive && !error) setEligible(paidOnlyEntry(profile))'))
assert.ok(generate.includes('if (MRR_CONVERSION_ENABLED && notPaidProven)'))
assert.ok(generate.includes('freeAction={freeLabel && onFirstFilmFree'))
assert.ok(generate.includes("onUpgrade={(tier, billing = 'monthly')"))
assert.ok(modal.includes("trackEvent('conversion_offer_viewed'"))
assert.ok(modal.includes("trackEvent('conversion_offer_first_gesture'"))
for (const p of ['app/api/stripe/checkout/route.ts', 'app/api/stripe/webhook/route.ts']) assert.ok(rd(p).includes('intent_campaign:'))
console.log(`OK: conversion contracts, ${mutants.length} rejected mutants, OFF restores existing checkout URLs.`)
