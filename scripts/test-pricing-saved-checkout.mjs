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
equal(policy.shouldDeferPassiveCheckoutResumeForTrial({ go: false, firstDeliveryEligible: true }), true, 'passive recovery waits while the included first delivery is available')
equal(policy.shouldDeferPassiveCheckoutResumeForTrial({ go: true, firstDeliveryEligible: true }), false, 'an explicit resume is never intercepted by trial activation')
equal(policy.shouldDeferPassiveCheckoutResumeForTrial({ go: false, firstDeliveryEligible: false }), false, 'recovery returns after trial activation is no longer pending')
equal(policy.parseCheckoutResumeDismissalMode(null), 'none', 'missing dismissal has no effect')
equal(policy.parseCheckoutResumeDismissalMode('until_delivery'), 'until_delivery', 'pre-delivery dismissal keeps its reversible mode')
equal(policy.parseCheckoutResumeDismissalMode('1'), 'persistent', 'legacy dismissal remains persistent')
equal(policy.parseCheckoutResumeDismissalMode('unexpected'), 'persistent', 'unknown dismissal fails closed')
equal(policy.shouldResolveDismissalAgainstDelivery({ go: false, surface: null, dismissalMode: 'until_delivery' }), true, 'global passive pre-delivery dismissal checks owner history')
equal(policy.shouldResolveDismissalAgainstDelivery({ go: true, surface: null, dismissalMode: 'until_delivery' }), false, 'explicit resume never pays for the history check')
equal(policy.shouldResolveDismissalAgainstDelivery({ go: false, surface: 'pricing', dismissalMode: 'until_delivery' }), false, 'pricing keeps its explicit-choice exception')
equal(policy.shouldReleaseDismissalAfterDelivery({ dismissalMode: 'until_delivery', historyReliable: true, completedCount: 1 }), true, 'first persisted film releases pre-delivery dismissal')
equal(policy.shouldReleaseDismissalAfterDelivery({ dismissalMode: 'until_delivery', historyReliable: true, completedCount: 0 }), false, 'zero films keeps the reminder quiet')
equal(policy.shouldReleaseDismissalAfterDelivery({ dismissalMode: 'until_delivery', historyReliable: false, completedCount: 1 }), false, 'unreliable history respects dismissal')
equal(policy.checkoutResumeDismissalCookieValue({ historyReliable: true, completedCount: 0 }), 'until_delivery', 'server records pre-delivery dismissal without a timer guess')
equal(policy.checkoutResumeDismissalCookieValue({ historyReliable: true, completedCount: 1 }), '1', 'post-delivery dismissal keeps seven-day behavior')
equal(policy.checkoutResumeDismissalCookieValue({ historyReliable: false, completedCount: null }), '1', 'history failure never creates another prompt')
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
ok(route.includes('shouldDeferPassiveCheckoutResumeForTrial({'), 'live route executes the trial-coherence policy')
ok(route.includes('shouldResolveDismissalAgainstDelivery({'), 'live route resolves reversible dismissal against owner history')
ok(route.includes('shouldReleaseDismissalAfterDelivery({'), 'live route releases only after persisted delivery')
ok(route.includes('checkoutResumeDismissalCookieValue({'), 'dismissal POST chooses mode from server-owned history')
ok(route.includes(".eq('status', 'completed')"), 'history checks only persisted completed films')
ok(route.includes('reopenedAfterDeliveryDismissal'), 'response exposes the measurable post-delivery reopen')
ok(route.includes('decideTrialFirstDelivery({'), 'live route reuses the canonical first-delivery decision')
ok(route.includes("'trial_first_delivery_pending'"), 'passive recovery exposes a bounded diagnostic reason')
ok(route.indexOf('shouldDeferPassiveCheckoutResumeForTrial({') < route.indexOf('const cookieValue'), 'trial activation stops before abandoned-session and Stripe recovery work')
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
ok(banner.includes("film ? 'Finish secure checkout' : savedGoal ? 'Resume this goal' : 'Resume checkout'"), 'global CTA names delivered value, saved goal, and ordinary recovery')
ok(source('lib/growth/checkoutResumeHumanView.ts').includes("'resume_own_film_v2' as const"), 'resume choice is attributable to its canonical stable version')
ok(banner.includes("COMPARE_PLANS_HREF = '/pricing?intent_campaign=checkout_resume_smaller_v1#plans'"), 'secondary choice lands on the exact pricing-card anchor')
ok(banner.includes('aria-label="See smaller subscription plans"'), 'smaller-plan choice has an explicit accessible name')
ok(banner.includes("trackEvent('checkout_resume_smaller_plan_clicked'"), 'smaller-plan navigation is measurable')
ok(banner.indexOf("checkout.launch('resume'") < banner.indexOf('See smaller plans'), 'exact saved checkout remains visually and structurally primary')
ok(!/\$\d/.test(banner), 'banner contains no literal commercial price')
ok(pricing.includes("import PricingSavedCheckout from '@/components/PricingSavedCheckout'"), 'pricing imports the live card')
ok(pricing.includes('<PricingSavedCheckout />'), 'pricing renders the live card before plan selection')
ok(pricing.indexOf('<PricingSavedCheckout />') < pricing.indexOf("setBilling('monthly')"), 'saved choice is visible before a new billing choice')
ok(pricing.includes('id="plans" className="scroll-mt-24 grid'), 'pricing exposes a stable, offset-aware destination on the real plan cards')

console.log(`\n${checks}/${checks} pricing saved-checkout checks passed`)
