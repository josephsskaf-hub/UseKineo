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

function executeTs(file) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const box = { exports: {} }
  vm.runInNewContext(output, { module: box, exports: box.exports }, { filename: file })
  return box.exports
}

const policy = executeTs('lib/growth/checkoutPaymentGuidance.ts')
equal(policy.CHECKOUT_PAYMENT_GUIDANCE_VERSION, 'checkout_payment_guidance_v1', 'cohort version is stable')
check(policy.CHECKOUT_PAYMENT_GUIDANCE_COMPACT.includes('Apple Pay'), 'compact copy names Apple Pay')
check(policy.CHECKOUT_PAYMENT_GUIDANCE_COMPACT.includes('Google Pay'), 'compact copy names Google Pay')
check(policy.CHECKOUT_PAYMENT_GUIDANCE_COMPACT.includes('Link sign-in is optional'), 'compact copy removes the false mandatory-login reading')
check(policy.CHECKOUT_PAYMENT_GUIDANCE_STRIPE.includes('choose Pay without Link'), 'Stripe copy names the exact escape action')

const guided = policy.withCheckoutPaymentGuidance('40 credits / month')
check(guided.startsWith('40 credits / month'), 'guidance preserves the commercial description')
check(guided.endsWith(policy.CHECKOUT_PAYMENT_GUIDANCE_STRIPE), 'guidance reaches the always-visible Stripe line item')
equal(policy.withCheckoutPaymentGuidance(guided), guided, 'guidance is idempotent')
equal(policy.withCheckoutPaymentGuidance('   '), policy.CHECKOUT_PAYMENT_GUIDANCE_STRIPE, 'empty input fails to guidance, not invented product copy')
check(guided.length <= 500, 'guided line stays inside Stripe product-description limit')

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

console.log(`PASS — ${checks}/${checks} checkout payment-guidance checks`)
