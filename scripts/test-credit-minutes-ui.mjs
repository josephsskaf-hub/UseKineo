// Offline integration: real JSX and billing-backed minutes. No requests, credentials or payments.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { renderPage } from './preview-ux-complete.mjs'
import { semCompraAvulsa2410 } from './test-support/desfaz-compra-avulsa-2410.mjs'
import { semAmostraAnuncio2410 } from './test-support/desfaz-amostra-anuncio-2410.mjs'

let checks = 0
const check = (value, label) => { assert.ok(value, label); checks++ }
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
function pure(file, imports = {}) {
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: 1, target: 9 } }).outputText, {
    module, exports: module.exports, require: id => { if (id in imports) return imports[id]; throw Error(id) }, process: { env: { NODE_ENV: 'production' } },
  })
  return module.exports
}
const cost = pure('lib/credits/engineCost.ts')
const minutes = pure('lib/credits/creditMinutes.ts', { '@/lib/credits/engineCost': cost })
const offer = pure('lib/ads/offer.ts')
const autopilot = pure('lib/autopilot/config.ts', { '@/lib/credits/engineCost': cost })
const pricing = pure('lib/checkoutPricing.ts', { '@/lib/credits/engineCost': cost, '@/lib/autopilot/config': autopilot })
const copy = JSON.parse(read('lib/ui/refinementCopy.json'))
const summary = (credits, language = 'en', live = false) => renderPage('components/CreditMinutesSummary.tsx', false, { interfaceLanguage: language }, { credits, live })
for (const credits of [50, 60, 80, 150, 300, 2000]) {
  check(minutes.minutesLine(credits).split(" \u00b7 ").every(part=>summary(credits).includes(part)), `real summary uses source for ${credits}`)
}
check(summary(0) === '', 'no misleading minutes for zero balance')
check(minutes.minutesLine(offer.ADS_PASS_CREDITS).split(' · ').every(part => summary(offer.ADS_PASS_CREDITS).includes(part)), 'current pass uses its canonical grant and current engine costs')
check(!summary(offer.ADS_PASS_CREDITS).includes('Kineo 1'), 'retired public Kineo 1 is absent from the default minutes catalog')
check(!summary(60).includes('Kling 3'), 'omit engine below half a minute')
check(summary(150, 'en', true).includes('aria-live="polite"'), 'slider announces updates')
const portuguese = minutes.minutesLine(150, undefined, ({ minutes: amount, label }) => copy.pt['{minutes} min of {engine}'].replace('{minutes}', new Intl.NumberFormat('pt', { maximumFractionDigits: 1 }).format(amount)).replace('{engine}', label))
check(portuguese.split(' · ').every(part => summary(150, 'pt').includes(part)), 'Portuguese template follows current billing-backed minutes')
check(summary(80, 'pt').includes('0,5 min de Kling 3'), 'localized half-minute decimal')
for (const language of Object.keys(copy)) {
  const html = summary(150, language)
  check(html.includes(`lang="${language}"`) && html.includes('Seedance 1.5'), `${language} retains engine labels`)
  check(!html.includes('{minutes}') && !html.includes('{engine}'), `${language} replaces both placeholders`)
  check(html.includes(copy[language]['Alternative uses of the same credits, not added together.']), `${language} explains alternatives`)
}

// Exercise the actual range handler, then render its resulting controlled amount.
let nextAmount = null
const controls = []
const props = { onClose() {}, surface: 'offline_minutes_test' }
const fixture = { amount: 50, currency: 'usd', captureControls: controls, onStateChange: (name, value) => { if (name === 'amount') nextAmount = value } }
renderPage('components/CreditsTopupModal.tsx', false, fixture, props)
const range = controls.find(c => c.type === 'input' && c.props.type === 'range')
check(!!range, 'actual popup range captured')
for (const amount of [150, 300, 2000, 50]) {
  range.props.onChange({ target: { value: String(amount) } })
  check(nextAmount === amount, 'range changes amount to ' + amount)
  const html = renderPage('components/CreditsTopupModal.tsx', false, { amount: nextAmount, currency: 'usd' }, props)
  check(minutes.minutesLine(amount).split(" \u00b7 ").every(part=>html.includes(part)), 'popup rerenders minutes for ' + amount)
}

// Same plan grant for monthly/annual: minutes never multiply the credits.
for (const billing of ['monthly', 'annual']) {
  const html = renderPage('app/pricing/PricingClient.tsx', false, { billing, currency: 'usd', demoOffer: true })
  const renderedText = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ')
  const conversionOn = /export const MRR_CONVERSION_ENABLED = true/.test(read('lib/offers/mrrConversion.ts'))
  for (const tier of ['starter', 'basic', 'pro']) {
    const credits = pricing.TIER_CREDITS[tier]
    check(conversionOn ? renderedText.includes(`${credits} credits a month`) : minutes.minutesLine(credits).split(' · ').every(part => html.includes(part)), `${billing} ${tier} keeps its real monthly credit grant`)
  }
  if (conversionOn) check(!html.includes('data-kineo="credit-minutes"'), `${billing} conversion layout does not claim the retired minutes placement`)
}
check(read('app/pricing/PricingClient.tsx').includes('!MRR_CONVERSION_ENABLED && <CreditMinutesSummary credits={TIER_CREDITS[p.tier as PaidTier]} />'), 'the retained minutes layout still derives from the real tier grant')

// Evaluate the real pass description expression only, never the payment route.
const route = read('app/api/stripe/checkout/route.ts')
const pass = route.slice(route.indexOf('async function buildAdsPassAndRedirect'))
const template = pass.match(/description: (`[^`]+`)/)[1]
const description = vm.runInNewContext(template, { ADS_PASS_CREDITS: offer.ADS_PASS_CREDITS, minutesLine: minutes.minutesLine })
check(description.includes(minutes.minutesLine(offer.ADS_PASS_CREDITS)), 'Stripe pass description uses the shared conversion and actual pass grant')
check(description.includes('One-time payment, no subscription.'), 'pass keeps its payment terms')
// Freeze against immutable main after its approved price changes, reversing the new purchase then sample layers.
const billingBaseline = file => execFileSync('git', ['show', `1c078ed01:${file}`], { encoding: 'utf8', maxBuffer: 16 << 20 }).replace(/\r\n/g, '\n')
const restoredRoute = semAmostraAnuncio2410(semCompraAvulsa2410(route, 'app/api/stripe/checkout/route.ts'), 'app/api/stripe/checkout/route.ts').replace(/\r\n/g, '\n')
check(restoredRoute === billingBaseline('app/api/stripe/checkout/route.ts'), 'outside the exact approved integration layers, checkout remains byte-identical to main billing')
check(read('app/ads/page.tsx').includes('<CreditMinutesSummary credits={ADS_PASS_CREDITS} />'), 'pass review uses current grant')
check(read('components/pricing/PricingAdsBlock.tsx').includes('<CreditMinutesSummary credits={pass.credits} />'), 'pricing pass uses offer model grant')

// Approved main already includes the later price ladder, engine costs and pass changes.
// Keep exact billing freezes there rather than rejecting those approved changes.
for (const file of ['lib/credits/engineCost.ts', 'lib/credits/creditSlider.ts']) {
  check(read(file) === billingBaseline(file), 'billing source stays byte-identical to main: ' + file)
}
const pricingFile = 'lib/checkoutPricing.ts'
const pricingWithoutPurchase = semCompraAvulsa2410(read(pricingFile), pricingFile).replace(/\r\n/g, '\n')
check(createHash('sha256').update(pricingWithoutPurchase).digest('hex') === createHash('sha256').update(billingBaseline(pricingFile)).digest('hex'), 'pricing bytes stay frozen outside the exact approved one-time purchase layer')
{
  const file = 'lib/ads/offer.ts'
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(billingBaseline(file), { compilerOptions: { module: 1, target: 9 } }).outputText, {
    module, exports: module.exports, require: id => { throw Error(id) },
  })
  const frozen = module.exports
  const surface = m => JSON.stringify({
    numbers: Object.fromEntries(Object.entries(m).filter(([, value]) => typeof value === 'number')),
    id: m.ADS_PASS_ID, occupied: m.ONE_TIME_USD_MINOR_OCCUPIED, live: m.ADS_PASS_LIVE_IN_CODE,
    label: m.adsPassPriceLabel(), c35: m.adsCoveredByPass(35), c60: m.adsCoveredByPass(60),
    name: m.adsPassCopy().name, price: m.adsPassCopy().price, creditsLine: m.adsPassCopy().includes[0],
  })
  check(surface(offer) === surface(frozen), 'complete numeric billing surface and pass terms stay frozen to approved main')
  check(offer.adsCoveredByPass(35) === Math.floor(offer.ADS_PASS_CREDITS / offer.KINEO1_35S_CREDITS) && offer.adsCoveredByPass(60) === Math.floor(offer.ADS_PASS_CREDITS / offer.KINEO1_60S_CREDITS), 'pass coverage derives from its real grant and per-film costs')
  check(offer.adsPassCopy().includes[0].startsWith(`${offer.ADS_PASS_CREDITS} credits: ${offer.adsCoverageLine()}`), 'pass credits copy is computed from the same billing source')
}
console.log(`Credit minutes UI: ${checks} checks passed; offline, no payments.`)
