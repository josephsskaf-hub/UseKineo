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
  assert.equal(decideFilmDeliveryOffer({ ...eligible, ...patch }, 'on'), 'legacy', JSON.stringify(patch))
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
assert(source.includes("useUnifiedDeliveryOffer ? deliveryOfferSlot === 'full_version' : legacyFullVersionOfferEligible"))
assert(source.includes('!useUnifiedDeliveryOffer && planFitOfferEligible'))
assert(source.includes('!useUnifiedDeliveryOffer && (REGION_PASS_OFFER_LIVE'))
assert(source.includes('!useUnifiedDeliveryOffer && trialPostVideoPhase !== null'))
assert(source.includes("!useUnifiedDeliveryOffer && !planFitOwnsRecurringSlot && planTier === 'free'"), 'legacy footer does not stack another offer')
assert(source.includes('askShown: useUnifiedDeliveryOffer || showTrialPostVideoOffer'), 'silence audit sees the slot')
assert(source.includes('onClick={() => handleContinueSeries(episode2Seed'), 'existing episode continuation retains its context')
console.log('delivery: one slot, 35 s boundary, existing checkout, actual next-film link, pricing and entitlement controls')
