#!/usr/bin/env node
// KINEO-CURRENCY-TRUTH-2026-09-01
// Contrato sem rede/credencial: a moeda real do checkout governa a copy e
// nenhuma superfície de venda volta a prometer conversão automática.

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')
const sourceFiles = (rel) =>
  readdirSync(join(root, rel), { recursive: true })
    .filter((entry) => /\.(?:ts|tsx)$/.test(String(entry)))
    .map((entry) => join(rel, String(entry)))

function loadTs(rel, mocks = {}) {
  const filename = join(root, rel)
  const output = ts.transpileModule(source(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(rel + ' imported unexpected module: ' + id)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', {
  '@/lib/credits/engineCost': engine,
})
const checkout = loadTs('lib/checkoutPricing.ts', {
  '@/lib/credits/engineCost': engine,
  '@/lib/autopilot/config': autopilot,
})
const marketing = loadTs('lib/marketingPrice.ts', {
  '@/lib/checkoutPricing': checkout,
  '@/lib/credits/engineCost': engine,
})

let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks += 1 }
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }

const disclosure =
  'Kineo lists and charges plan prices in USD worldwide. Your bank may convert the charge to your local currency and may add conversion or cross-border fees.'

equal(Object.keys(checkout.CURRENCY_DISPLAY), ['usd'], 'checkout exposes only USD')
for (const country of [null, 'US', 'BR', 'IN', 'DE', 'PK']) {
  equal(checkout.resolveCheckoutCurrency(country), 'usd', String(country || 'unknown') + ' resolves to USD')
}
equal(marketing.CHECKOUT_CURRENCY_DISCLOSURE, disclosure, 'canonical disclosure states the real currency and bank caveat')
ok(marketing.CHECKOUT_CURRENCY_DISCLOSURE.includes(checkout.CURRENCY_DISPLAY.usd.label), 'disclosure derives the canonical USD label')
ok(!marketing.CHECKOUT_CURRENCY_DISCLOSURE.includes('automatically'), 'disclosure does not promise automatic conversion')

const requiredUses = {
  'app/KineoLanding.tsx': 2,
  'components/StructuredData.tsx': 2,
  'app/pricing/PricingClient.tsx': 3,
  'components/PricingCards.tsx': 2,
  'app/cheapest-ai-shorts-maker/page.tsx': 2,
  'app/(dashboard)/generate/GenerateClient.tsx': 3,
}
for (const [file, minimum] of Object.entries(requiredUses)) {
  const matches = source(file).match(/CHECKOUT_CURRENCY_DISCLOSURE/g) ?? []
  ok(matches.length >= minimum, file + ' imports and renders the canonical disclosure')
}

const home = source('app/KineoLanding.tsx')
const structured = source('components/StructuredData.tsx')
ok(home.includes('{CHECKOUT_CURRENCY_DISCLOSURE} New accounts get free credits'), 'visible home FAQ uses canonical disclosure')
ok(structured.includes('${CHECKOUT_CURRENCY_DISCLOSURE} New accounts get free credits'), 'FAQ JSON-LD uses the same canonical disclosure')
ok(!home.includes(disclosure), 'visible FAQ does not duplicate the disclosure literal')
ok(!structured.includes(disclosure), 'JSON-LD does not duplicate the disclosure literal')

const pricing = source('app/pricing/PricingClient.tsx')
ok(pricing.includes('{CHECKOUT_CURRENCY_DISCLOSURE}'), 'pricing header renders the canonical disclosure')
ok(pricing.includes('${CHECKOUT_CURRENCY_DISCLOSURE}'), 'pricing FAQ renders the canonical disclosure')

const runtimeFiles = [
  'app/KineoLanding.tsx',
  'components/StructuredData.tsx',
  'app/pricing/PricingClient.tsx',
  'components/PricingCards.tsx',
  'app/cheapest-ai-shorts-maker/page.tsx',
  'app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx',
  'app/(dashboard)/generate/GenerateClient.tsx',
]
const forbidden = [
  /show it in your local currency/i,
  /shown in your local checkout currency/i,
  /switches to your local currency/i,
  /current local subscription prices/i,
  /local first-month and renewal price/i,
  /local prices matched to checkout/i,
  /checking local price/i,
  /local price loads before checkout/i,
]
for (const file of runtimeFiles) {
  const text = source(file)
  for (const pattern of forbidden) {
    ok(!pattern.test(text), file + ' excludes stale promise ' + String(pattern))
  }
}

for (const file of ['app', 'components', 'lib'].flatMap(sourceFiles)) {
  ok(!/same price worldwide/i.test(source(file)), file + ' does not make the stale worldwide-price promise')
}

ok(source('app/cheapest-ai-shorts-maker/page.tsx').includes('USD prices matched to Checkout'), 'calculator landing names USD before checkout')
ok(source('app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx').includes('Checking USD price…'), 'calculator loading state names USD')

const factsSource = source('lib/kineoFacts.ts')
ok(factsSource.includes('currencies: Object.values(CURRENCY_DISPLAY).map(({ label }) => label)'), 'AEO currency list derives from canonical checkout display')
ok(!factsSource.includes("currencies: ['USD', 'BRL', 'INR']"), 'AEO source does not retain the retired multi-currency list')
ok(source('app/facts/page.tsx').includes('Checkout currency: ${PRODUCT.currencies.join'), 'human facts page publishes the singular canonical checkout currency')
ok(source('app/llms.txt/route.ts').includes('Checkout currency: ${PRODUCT.currencies.join'), 'llms.txt publishes the singular canonical checkout currency')
equal(checkout.checkPricingInvariants(), [], 'canonical pricing invariants remain green')

console.log('\n' + checks + '/' + checks + ' checkout currency-truth checks passed')
