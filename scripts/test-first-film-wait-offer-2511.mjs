import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { aba, React, read } = require('../docs/studio-na-moldura-1011/runtime.cjs')

const tab = aba()
const { firstFilmWaitOfferVisible, default: Offer } = tab.m('components/premiere/FirstFilmWaitOffer')
const free = { mode: 'cinematic_ai', filmsDelivered: 0, confirmedFree: true, activePlan: false }
assert.equal(firstFilmWaitOfferVisible(free), false, 'shipped switch is off')
assert.equal(firstFilmWaitOfferVisible(free, 'on'), true, 'first free film')
assert.equal(firstFilmWaitOfferVisible({ ...free, mode: 'cinematic' }, 'on'), true, 'Hollywood film')
for (const [change, scenario] of [
  [{ filmsDelivered: null }, 'history unavailable'], [{ filmsDelivered: 1 }, 'subsequent film'],
  [{ confirmedFree: false }, 'unknown or paid account'], [{ activePlan: true }, 'active plan'],
  [{ mode: 'fast' }, 'quick clip'], [{ mode: 'creator' }, 'creator short'],
]) assert.equal(firstFilmWaitOfferVisible({ ...free, ...change }, 'on'), false, scenario)

tab.mount(React.createElement(Offer, { currency: 'usd', region: 'standard' }))
const { formatCheckoutMoney, getTierPrice } = tab.m('lib/checkoutPricing')
const price = formatCheckoutMoney('usd', getTierPrice('starter', 'usd', 'standard'))
const link = tab.one(props => props.href?.startsWith('/pricing?'), 'pricing link')
assert.equal(link.props.href, '/pricing?intent_campaign=first_film_wait_2511#plans')
assert(tab.html().includes(price), 'price comes from checkoutPricing')
assert.equal(tab.log.fetches.length, 0, 'no checkout or server call on mount')
tab.click(props => props === link.props, 'See plans')
assert.deepEqual(tab.log.events, [['first_film_cta_click', { version: 'first_film_wait_2511', target: 'pricing', surface: 'film_wait' }]])
const noCurrency = aba()
noCurrency.mount(React.createElement(noCurrency.m('components/premiere/FirstFilmWaitOffer').default, { currency: null, region: 'standard' }))
assert(noCurrency.html().includes('See plans') && !noCurrency.html().includes('/month'), 'CTA persists while price is unknown')
assert(!tab.html().includes('Starts automatically'), 'checkout before delivery cannot promise an automatic extended cut')

const generate = read('app/(dashboard)/generate/GenerateClient.tsx').replace(/\r\n/g, '\n')
const wait = generate.indexOf("{(phase === 'generating' || phase === 'fal_polling' || phase === 'avatar_polling' || phase === 'clips_ready' || phase === 'composing') && (")
const progress = generate.indexOf('<PremiereStage', wait)
const offer = generate.indexOf('<FirstFilmWaitOffer ', progress)
const end = generate.indexOf('</section>', progress)
assert(wait >= 0 && progress > wait && offer > progress && end > offer, 'real wait branch only, after live progress')
assert.equal(generate.split('<FirstFilmWaitOffer ').length, 2, 'one offer location')
assert(generate.slice(progress, end).includes("confirmedFree: activationAccountStatus === 'free' && notPaidProven"), 'real entitlement evidence gates the offer')
assert(generate.slice(progress, end).includes('filmsDelivered,'), 'uses delivery count provided by the server')
console.log('first film wait: gate, native mount, canonical price, click, pending price, single wait location')
