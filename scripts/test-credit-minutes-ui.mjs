// Offline integration: real JSX and billing-backed minutes. No requests, credentials or payments.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'
import { renderPage } from './preview-ux-complete.mjs'

let checks = 0
const check = (value, label) => { assert.ok(value, label); checks++ }
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
function pure(file, imports = {}) {
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: 1, target: 9 } }).outputText, {
    module, exports: module.exports, require: id => { if (id in imports) return imports[id]; throw Error(id) },
  })
  return module.exports
}
const cost = pure('lib/credits/engineCost.ts')
const minutes = pure('lib/credits/creditMinutes.ts', { '@/lib/credits/engineCost': cost })
const summary = (credits, language = 'en', live = false) => renderPage('components/CreditMinutesSummary.tsx', false, { interfaceLanguage: language }, { credits, live })
for (const credits of [50, 60, 80, 150, 300, 2000]) {
  check(summary(credits).includes(minutes.minutesLine(credits)), `real summary uses source for ${credits}`)
}
check(summary(0) === '', 'no misleading minutes for zero balance')
check(summary(60).includes('12 min of Kineo 1 · 2 min of Seedance 1.5'), 'current pass is 60 credits')
check(!summary(60).includes('Kling 3'), 'omit engine below half a minute')
check(summary(150, 'en', true).includes('aria-live="polite"'), 'slider announces updates')
check(summary(150, 'pt').includes('30 min de Kineo 1 · 6 min de Seedance 1.5 · 1 min de Kling 3'), 'Portuguese template')
check(summary(80, 'pt').includes('0,5 min de Kling 3'), 'localized half-minute decimal')
const copy = JSON.parse(read('lib/ui/refinementCopy.json'))
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
  check(html.includes(minutes.minutesLine(amount)), 'popup rerenders minutes for ' + amount)
}

// Same plan grant for monthly/annual: minutes never multiply the credits.
for (const billing of ['monthly', 'annual']) {
  const html = renderPage('app/pricing/PricingClient.tsx', false, { billing, currency: 'usd', demoOffer: true })
  for (const credits of [60, 150, 300]) check(html.includes(minutes.minutesLine(credits)), `${billing} plan ${credits}`)
}

// Evaluate the real pass description expression only, never the payment route.
const route = read('app/api/stripe/checkout/route.ts')
const pass = route.slice(route.indexOf('async function buildAdsPassAndRedirect'))
const template = pass.match(/description: (`[^`]+`)/)[1]
const description = vm.runInNewContext(template, { ADS_PASS_CREDITS: 60, minutesLine: minutes.minutesLine })
check(description.includes(minutes.minutesLine(60)), 'Stripe pass description uses the shared conversion')
check(description.includes('One-time payment, no subscription.'), 'pass keeps its payment terms')
const baseRoute = execFileSync('git', ['show', 'd3c21742:app/api/stripe/checkout/route.ts'], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
const restoredRoute = route
  .replace("import { minutesLine } from '@/lib/credits/creditMinutes'\n", '')
  .replace(' ${minutesLine(ADS_PASS_CREDITS)} (alternative uses of the same credits).', '')
  .replace('    // A copy-only deploy must not reuse a Stripe key with different product parameters.\n    description: sessionParams.line_items?.[0]?.price_data?.product_data?.description,\n', '')
check(restoredRoute === baseRoute, 'checkout change is only display copy and its idempotency signature')
check(read('app/ads/page.tsx').includes('<CreditMinutesSummary credits={ADS_PASS_CREDITS} />'), 'pass review uses current grant')
check(read('components/pricing/PricingAdsBlock.tsx').includes('<CreditMinutesSummary credits={pass.credits} />'), 'pricing pass uses offer model grant')

// Pin the founder freeze, checking real source files rather than a second price table.
for (const file of ['lib/checkoutPricing.ts', 'lib/ads/offer.ts', 'lib/credits/engineCost.ts', 'lib/credits/creditSlider.ts']) {
  const base = execFileSync('git', ['show', `d3c21742:${file}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
  check(read(file) === base, 'unchanged billing source: ' + file)
}
console.log(`Credit minutes UI: ${checks} checks passed; offline, no payments.`)
