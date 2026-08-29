#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} imported unexpected module: ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

const policy = loadTs('lib/checkoutResumeSurface.ts')
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(policy.parseCheckoutResumeSurface('pricing'), 'pricing', 'pricing is the only contextual surface')
equal(policy.parseCheckoutResumeSurface('dashboard'), null, 'unknown surface is rejected')
equal(policy.parseCheckoutResumeSurface(null), null, 'missing surface stays global')
equal(policy.shouldBlockDismissedCheckoutResume({ go: false, dismissed: true, surface: null }), true, 'dismissal blocks the global passive banner')
equal(policy.shouldBlockDismissedCheckoutResume({ go: false, dismissed: true, surface: 'pricing' }), false, 'pricing can show the buyer their saved choice')
equal(policy.shouldBlockDismissedCheckoutResume({ go: true, dismissed: true, surface: null }), false, 'explicit resume remains stronger than an old dismissal')
equal(policy.shouldBlockDismissedCheckoutResume({ go: false, dismissed: false, surface: null }), false, 'no dismissal never blocks recovery')
equal(policy.formatCheckoutResumeMoney(1500, 'usd'), '$15.00', 'runtime Creator amount formats without a copied price')
equal(policy.formatCheckoutResumeMoney(700, 'bad-currency'), 'BAD-CURRENCY 7.00', 'unknown currency has a deterministic fallback')
const planFit = {
  engine: 'cinematic_ai',
  engineLabel: 'Seedance 1.5',
  monthlyVideos: 4,
  seconds: 60,
  selectedTierMatches: true,
}
equal(policy.formatCheckoutResumePlanFitGoal(planFit), '4 × 60s Seedance 1.5 videos/month', 'saved goal is formatted without copied commercial numbers')
equal(policy.formatCheckoutResumePlanFitGoal({ ...planFit, monthlyVideos: 1 }), '1 × 60s Seedance 1.5 video/month', 'saved goal uses the singular form')

const route = source('app/api/stripe/checkout/resume/route.ts')
const card = source('components/PricingSavedCheckout.tsx')
const banner = source('components/CheckoutResumeBanner.tsx')
const pricing = source('app/pricing/PricingClient.tsx')

ok(route.includes("parseCheckoutResumeSurface(req.nextUrl.searchParams.get('surface'))"), 'live route parses the allow-listed surface')
ok(route.includes('shouldBlockDismissedCheckoutResume({'), 'live route executes the dismissal policy')
ok(route.indexOf('shouldBlockDismissedCheckoutResume({') < route.indexOf(".from('profiles')"), 'dismissed global requests stop before profile and Stripe work')
ok(route.includes('readPlanFitCheckoutReturnFromMetadata(session.metadata'), 'live route rebuilds Plan Fit from the owned Stripe Session')
ok(route.includes('planFit: resolution.planFit'), 'live response transports only the bounded Plan Fit summary')
ok(card.includes("fetch('/api/stripe/checkout/resume?surface=pricing'"), 'pricing probes only the owned recovery endpoint')
ok(card.includes("credentials: 'same-origin'"), 'pricing probe carries only the same-origin session')
ok(card.includes("cache: 'no-store'"), 'pricing never caches billing state')
ok(card.includes('new AbortController()'), 'pricing aborts an obsolete probe')
ok(card.includes("useCheckoutLaunch('pricing_saved_checkout')"), 'resume uses the shared double-click and timeout guard')
ok(card.includes("trackEvent('pricing_saved_checkout_viewed'"), 'card exposure is measurable by people')
ok(card.includes("trackEvent('pricing_saved_checkout_clicked'"), 'card continuation is measurable by people')
ok(card.includes('Your saved goal is ${savedGoal}'), 'pricing card restores the concrete video goal')
ok(card.includes('Continue this video plan →'), 'pricing card CTA names the saved plan')
ok(!/\$\d/.test(card), 'card contains no literal commercial price')
ok(source('lib/checkoutResumeSurface.ts').includes("'autopilot'"), 'shared response type covers every resumable subscription tier')
ok(banner.includes("'/pricing'"), 'global banner is suppressed where the contextual card owns recovery')
ok(banner.includes('{savedGoal}'), 'global banner restores the concrete video goal')
ok(banner.includes("savedGoal ? 'Resume this goal' : 'Resume checkout'"), 'global CTA names the saved goal without changing ordinary recovery')
ok(pricing.includes("import PricingSavedCheckout from '@/components/PricingSavedCheckout'"), 'pricing imports the live card')
ok(pricing.includes('<PricingSavedCheckout />'), 'pricing renders the live card before plan selection')
ok(pricing.indexOf('<PricingSavedCheckout />') < pricing.indexOf("setBilling('monthly')"), 'saved choice is visible before a new billing choice')

console.log(`\n${checks}/${checks} pricing saved-checkout checks passed`)
