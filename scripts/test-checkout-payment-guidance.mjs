#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

function executeTs(file, mocks = {}) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const box = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${file} imported unexpected module: ${id}`)
  }
  vm.runInNewContext(output, {
    module: box,
    exports: box.exports,
    require: localRequire,
    process: { env: { NODE_ENV: 'production' } },
  }, { filename: file })
  return box.exports
}

const engine = executeTs('lib/credits/engineCost.ts', { '@/lib/kling4PaidPolicy': executeTs('lib/kling4PaidPolicy.ts'), '@/lib/kling4PaidPricing': executeTs('lib/kling4PaidPricing.ts') })
const autopilot = executeTs('lib/autopilot/config.ts', {
  '@/lib/credits/engineCost': engine,
})
const checkout = executeTs('lib/checkoutPricing.ts', {
  '@/lib/credits/engineCost': engine,
  '@/lib/autopilot/config': autopilot,
})
const policy = executeTs('lib/growth/checkoutPaymentGuidance.ts', {
  '@/lib/checkoutPricing': checkout,
})
equal(policy.CHECKOUT_PAYMENT_GUIDANCE_VERSION, 'checkout_payment_guidance_v3', 'cohort version is stable') // KINEO-CHECKOUT-FINO-0411
check(policy.CHECKOUT_PAYMENT_GUIDANCE_COMPACT.includes('Apple Pay'), 'compact copy names Apple Pay')
check(policy.CHECKOUT_PAYMENT_GUIDANCE_COMPACT.includes('Google Pay'), 'compact copy names Google Pay')
check(policy.CHECKOUT_PAYMENT_GUIDANCE_COMPACT.includes('when available'), 'wallet copy respects device and regional eligibility')
check(policy.CHECKOUT_PAYMENT_GUIDANCE_COMPACT.includes('Link sign-in is optional'), 'compact copy removes the false mandatory-login reading')
// KINEO-CHECKOUT-FINO-0411 [fundador 04/11] — a frase saiu da descrição: "Charged in USD worldwide" era falsa para quem paga em reais.
check(!('CHECKOUT_PAYMENT_GUIDANCE_STRIPE' in policy), 'the worldwide-USD sentence no longer exists')
const guided = policy.withCheckoutPaymentGuidance('  85 credits a month · Cancel anytime ')
equal(guided, '85 credits a month · Cancel anytime', 'the description stays one short line, nothing appended')
equal(policy.withCheckoutPaymentGuidance(guided), guided, 'idempotent')
equal(policy.withCheckoutPaymentGuidance('   '), policy.CHECKOUT_LINE_ITEM_FALLBACK, 'empty input never reaches Stripe empty')

const route = read('app/api/stripe/checkout/route.ts')
check(route.includes("from '@/lib/growth/checkoutPaymentGuidance'"), 'live checkout imports the policy')
check(route.includes('description: withCheckoutPaymentGuidance('), 'live subscription line executes the policy')
check((route.match(/checkout_payment_guidance: CHECKOUT_PAYMENT_GUIDANCE_VERSION/g) ?? []).length === 3, 'attempt, Session and Subscription carry the exact version')
check(!/payment_method_types\s*:/.test(route.replace(/\/\/.*$/gm, '')), 'dynamic card and wallet methods remain untouched')

const webhook = read('app/api/stripe/webhook/route.ts')
check(webhook.includes('checkout_payment_guidance: session.metadata?.checkout_payment_guidance ?? null'), 'payment success preserves the cohort version')

const pricing = read('app/pricing/PricingClient.tsx')
const generate = read('app/(dashboard)/generate/GenerateClient.tsx')
for (const [source, label] of [[pricing, 'pricing grid'], [generate, 'post-video offer']]) {
  check(source.includes("from '@/lib/growth/checkoutPaymentGuidance'"), `${label} imports one shared copy source`)
  check(source.includes('{CHECKOUT_PAYMENT_GUIDANCE_COMPACT}'), `${label} renders the guidance`)
}
check(pricing.includes('const PAYPAL_ENABLED = false'), 'failed PayPal rail remains hidden')
check(!pricing.includes('CHECKOUT_PAYMENT_GUIDANCE_COMPACT ='), 'pricing cannot fork payment copy')
check(!generate.includes('CHECKOUT_PAYMENT_GUIDANCE_COMPACT ='), 'post-video cannot fork payment copy')

const previewPath = 'docs/previews/CHECKOUT-PAYMENT-GUIDANCE-2026-08-30.html'
check(fs.existsSync(path.join(root, previewPath)), 'before/after preview exists')
const preview = read(previewPath)
for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(marker), `preview contains ${marker}`)
}
check(!/https?:\/\//i.test(preview), 'preview has no external dependency')

const currencyPreviewPath = 'docs/previews/CHECKOUT-USD-TRUTH-2026-09-04.html'
check(fs.existsSync(path.join(root, currencyPreviewPath)), 'currency before/after preview exists')
const currencyPreview = read(currencyPreviewPath)
check(currencyPreview.includes('BEFORE') && currencyPreview.includes('AFTER'), 'currency preview contains both states')
check(!/https?:\/\//i.test(currencyPreview), 'currency preview has no external dependency')

console.log(`PASS — ${checks}/${checks} checkout payment-guidance checks`)
