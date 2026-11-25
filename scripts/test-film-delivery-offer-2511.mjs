import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { aba, React, read } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const fixture = aba()
const { decideFilmDeliveryOffer, default: Offer } = fixture.m('components/premiere/FilmDeliveryPlanOffer')
const { FILM_COMPLETE_TARGET_SECONDS: cutoff } = fixture.m('lib/growth/filmComplete')
const eligible = { delivered: true, confirmedFree: true, activePlan: false, finishedSeconds: cutoff - 1, fullVersionEligible: true }
assert.equal(decideFilmDeliveryOffer(eligible), 'legacy', 'default switch is off')
assert.equal(decideFilmDeliveryOffer(eligible, 'on'), 'full_version')
for (const patch of [{ finishedSeconds: cutoff }, { finishedSeconds: cutoff + 1 }, { finishedSeconds: null },
  { finishedSeconds: 0 }, { finishedSeconds: Infinity }, { fullVersionEligible: false }]) {
  assert.equal(decideFilmDeliveryOffer({ ...eligible, ...patch }, 'on'), 'next_film', JSON.stringify(patch))
}
for (const patch of [{ delivered: false }, { confirmedFree: false }, { activePlan: true }]) {
  assert.equal(decideFilmDeliveryOffer({ ...eligible, ...patch }, 'on'), 'no_new_offer', JSON.stringify(patch))
}
fixture.mount(React.createElement(Offer, { currency: 'usd', region: 'standard', canContinue: true }))
const { formatCheckoutMoney, getTierPrice } = fixture.m('lib/checkoutPricing')
const price = formatCheckoutMoney('usd', getTierPrice('starter', 'usd', 'standard'))
assert(fixture.html().includes('Make the next episode') && fixture.html().includes(price))
const isPricing = props => props.href === '/pricing?intent_campaign=film_delivery_next_2511#plans'
fixture.one(isPricing, 'one purchase link')
assert.equal(fixture.log.fetches.length, 0, 'no server request at mount')
fixture.click(isPricing, 'pricing on click')
assert.deepEqual(fixture.log.events, [['film_delivery_next_offer_clicked', { version: 'film_delivery_next_2511', target: 'pricing', surface: 'film_ready' }]])
fixture.mount(React.createElement(Offer, { currency: null, region: 'standard', canContinue: false }))
assert(fixture.html().includes('Make another film') && !fixture.html().includes('/month'))
fixture.one(isPricing, 'CTA remains while currency is unknown')

const source = read('app/(dashboard)/generate/GenerateClient.tsx')
const download = source.indexOf('data-testid="done-download-top"')
const paidCard = source.indexOf('<FilmDeliveryPlanOffer ')
assert(download > 0 && paidCard > download, 'delivery is before the purchase CTA')
assert.equal(source.split('<FilmDeliveryPlanOffer ').length, 2, 'one commercial slot')
assert(source.includes('showPurchaseLinks={!useUnifiedDeliveryOffer}'), 'the commercial card replaces duplicate purchase exits')
assert(source.includes('seconds: Math.round(d)'), 'duration uses the existing rounded metadata')
assert(source.includes('finalVideoTiming.url === finalVideoUrl'), 'stale metadata cannot authorize a different film')
const toSeconds = (videoUrl, timing) => timing && timing.url === videoUrl ? timing.seconds : null
for (const [raw, expected] of [[34.49, 'full_version'], [34.6, 'next_film'], [35, 'next_film']]) {
  const timing = { url: 'current', seconds: Math.round(raw) }
  assert.equal(decideFilmDeliveryOffer({ ...eligible, finishedSeconds: toSeconds('current', timing) }, 'on'), expected)
  assert.equal(decideFilmDeliveryOffer({ ...eligible, finishedSeconds: toSeconds('next', timing) }, 'on'), 'next_film')
}

const freeExits = aba()
window.location = { search: '?engine=seedance&duration=35&prompt=private&autoanalyze=1' }
const Exits = freeExits.m('components/FilmReadyExits').default
freeExits.mount(React.createElement(Exits, { videoId: 'video', plan: 'free', showPurchaseLinks: false }))
assert(freeExits.html().includes('Next film') && !freeExits.html().includes('More credits') && !freeExits.html().includes('Subscribe'))
assert.equal(freeExits.log.fetches.length, 0, 'compact exits do not start a purchase lookup')
freeExits.one(props => props.href === '/studio?engine=seedance&duration=35&focus=idea', 'Next film keeps the editor choices without a private script or auto start')
const paidExits = aba()
window.location = { search: '' }
paidExits.mount(React.createElement(paidExits.m('components/FilmReadyExits').default, { videoId: 'video', plan: 'basic' }))
for (const label of ['Next film', 'More credits', 'Change plan']) assert(paidExits.html().includes(label), label)
const readDecision = name => source.match(new RegExp('const ' + name + ' = ([^\\r\\n]+)'))?.[1]
const fullCode = readDecision('fullVersionOfferEligible')
const unifiedCode = readDecision('useUnifiedDeliveryOffer')
assert(fullCode && unifiedCode, 'production offer wiring is present')
const readFull = code => new Function('deliveryOfferSlot', 'legacyFullVersionOfferEligible', 'return ' + code)
const actualFull = readFull(fullCode)
const actualUnified = new Function('deliveryOfferSlot', 'return ' + unifiedCode)
const cases = [
  ['off', {}, true, true, false],
  ['off', {}, false, false, false],
  ['on', { confirmedFree: false, finishedSeconds: null }, true, false, false],
  ['on', { confirmedFree: false, finishedSeconds: cutoff }, true, false, false],
  ['on', { confirmedFree: false, finishedSeconds: cutoff - 1 }, true, false, false],
  ['on', { activePlan: true, finishedSeconds: cutoff - 1 }, true, false, false],
  ['on', { activePlan: true, finishedSeconds: null }, true, false, false],
  ['on', { finishedSeconds: null }, true, false, true],
  ['on', { finishedSeconds: cutoff }, true, false, true],
  ['on', { finishedSeconds: cutoff + 1 }, true, false, true],
  ['on', {}, true, true, true],
  ['on', { fullVersionEligible: false }, false, false, true],
]
function violations(resolveFull) {
  return cases.filter(([release, patch, legacy, full, unified]) => {
    const slot = decideFilmDeliveryOffer({ ...eligible, ...patch }, release)
    return resolveFull(slot, legacy) !== full || actualUnified(slot) !== unified
  })
}
assert.deepEqual(violations(actualFull), [], 'profile pending, paid, trial eligibility and final duration use the actual render guard')
const oldFallback = readFull("deliveryOfferSlot === 'full_version' || (deliveryOfferSlot === 'no_new_offer' && legacyFullVersionOfferEligible) || (deliveryOfferSlot === 'legacy' && legacyFullVersionOfferEligible)")
assert(violations(oldFallback).length >= 5, 'the old fallback leaks a full-version CTA before entitlement or final length is known')
assert(source.includes('!useUnifiedDeliveryOffer && planFitOfferEligible'))
assert(source.includes('!useUnifiedDeliveryOffer && (REGION_PASS_OFFER_LIVE'))
assert(source.includes('!useUnifiedDeliveryOffer && trialPostVideoPhase !== null'))
assert(source.includes("!useUnifiedDeliveryOffer && !planFitOwnsRecurringSlot && planTier === 'free'"), 'legacy footer does not stack another offer')
assert(source.includes('askShown: useUnifiedDeliveryOffer || showTrialPostVideoOffer'), 'silence audit sees the slot')
assert(source.includes('onClick={() => handleContinueSeries(episode2Seed'), 'existing episode continuation retains its context')
console.log('delivery: one slot, 35 s boundary, existing checkout, actual next-film link, pricing and entitlement controls')
