#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)((id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${path}: unexpected import ${id}`)
  }, module, module.exports)
  return module.exports
}

const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', { '@/lib/credits/engineCost': engine })
const checkout = loadTs('lib/checkoutPricing.ts', {
  '@/lib/credits/engineCost': engine,
  '@/lib/autopilot/config': autopilot,
})
const factsContract = loadTs('lib/growth/businessOfferFacts.ts', {
  '@/lib/checkoutPricing': checkout,
})

const offer = factsContract.buildBusinessOfferFact('https://www.usekineo.com', 'Kineo 1')
equal(offer.url, 'https://www.usekineo.com/ai-shorts-for-agencies', 'canonical public offer URL')
equal(offer.purchaseType, 'one_time', 'purchase type cannot be mistaken for subscription')
equal(offer.currency, 'USD', 'single checkout currency is explicit')
equal(offer.subscriptionRequired, false, 'no subscription required')
equal(offer.salesCallRequired, false, 'no sales call required')
equal(offer.commercialDeliveryAllowed, true, 'commercial delivery boundary is explicit')
equal(offer.namedVideoCountEngine, 'Kineo 1', 'public engine name is explicit')
equal(offer.audience.join(','), 'freelancers,agencies,businesses', 'three intended audiences are explicit')
equal(offer.packs.length, checkout.BULK_PACK_IDS.length, 'every canonical pack is exposed')

for (const id of checkout.BULK_PACK_IDS) {
  const source = checkout.BULK_PACKS[id]
  const row = offer.packs.find((pack) => pack.id === id)
  ok(row, `${id}: row exists`)
  equal(row.videos, source.videos, `${id}: video count comes from checkout pricing`)
  equal(row.credits, source.credits, `${id}: credit grant comes from checkout pricing`)
  equal(row.priceUsdCents, source.usdMinor, `${id}: price cents come from checkout pricing`)
  equal(row.priceUsd, checkout.formatCheckoutMoney('usd', source.usdMinor), `${id}: display price comes from formatter`)
  const expectedPerVideo = Math.round(source.usdMinor / source.videos)
  equal(row.pricePerFastVideoUsdCents, expectedPerVideo, `${id}: per-video cents are calculated`)
  equal(row.pricePerFastVideoUsd, checkout.formatCheckoutMoney('usd', expectedPerVideo), `${id}: per-video display is calculated`)
  const details = new URL(row.detailsUrl)
  equal(details.pathname, '/ai-shorts-for-agencies', `${id}: crawler lands on public details`)
  equal(details.hash, `#pack-${id}`, `${id}: exact public card is preserved`)
  ok(!row.detailsUrl.includes('/api/stripe/checkout'), `${id}: machine fact cannot mint Stripe checkout`)
}

ok(offer.boundaries[0].includes('Kineo 1'), 'engine boundary follows the supplied public name')
ok(offer.boundaries.some((line) => line.includes('no team seats')), 'self-service boundary is explicit')
ok(offer.boundaries.some((line) => line.includes('may not be resold')), 'commercial-use boundary is explicit')

const canonical = read('lib/kineoFacts.ts')
ok(canonical.includes('buildBusinessOfferFact('), 'canonical facts execute the business-offer builder')
ok(canonical.includes('businessOffer: BUSINESS_OFFER_FACT'), '/api/facts payload exposes businessOffer')
ok(canonical.includes('ENGINE_FACTS[0].name'), 'named pack engine follows the public engine catalog')

const llms = read('app/llms.txt/route.ts')
ok(llms.includes('BUSINESS_OFFER_FACT.packs.map'), 'llms text derives pack rows from the structured fact')
ok(llms.includes('BUSINESS_OFFER_FACT.boundaries.map'), 'llms text derives boundaries from the structured fact')
ok(!llms.includes("from '@/lib/checkoutPricing'"), 'llms text no longer rebuilds the business offer separately')

const page = read('app/facts/page.tsx')
ok(page.includes('BUSINESS_PACK_LIST'), 'human fact sheet derives the four-pack sentence')
ok(page.includes("q: 'Can an agency or business buy Kineo without a subscription?'"), 'human fact sheet answers the acquisition question')
ok(page.includes("href: '/ai-shorts-for-agencies'"), 'human fact sheet links the public offer')

const api = read('app/api/facts/route.ts')
ok(api.includes('JSON.stringify(getKineoFacts(), null, 2)'), 'public JSON serializes the shared payload')

const preview = read('docs/previews/AEO-B2B-OFFER-2026-08-28.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview includes ${label}`)
}
ok(preview.includes('No business offer field'), 'preview shows the machine-readable omission')
ok(preview.includes('businessOffer'), 'preview shows the new structured field')
ok(preview.includes('Can an agency or business buy Kineo without a subscription?'), 'preview shows the human Q&A')

console.log(`AEO business offer: ${checks}/${checks} checks passed`)
