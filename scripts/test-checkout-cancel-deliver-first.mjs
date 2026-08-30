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
    (id) => { throw new Error(rel + ' imported unexpected module: ' + id) },
    module,
    module.exports,
  )
  return module.exports
}

const policy = loadTs('lib/growth/checkoutCancelledRecovery.ts')
let checks = 0
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(
  policy.decideCheckoutCancelledPrimary({ resolved: false, resumeReason: null }),
  'checking',
  'the existing checkout CTA cannot flash before trial truth resolves',
)
equal(
  policy.decideCheckoutCancelledPrimary({ resolved: true, resumeReason: 'trial_first_delivery_pending' }),
  'first_delivery',
  'the canonical passive-resume reason returns an untouched trial to delivery',
)
equal(
  policy.decideCheckoutCancelledPrimary({ resolved: true, resumeReason: 'already_subscribed' }),
  'checkout',
  'unrelated endpoint reasons do not invent trial eligibility',
)
equal(
  policy.decideCheckoutCancelledPrimary({ resolved: true, resumeReason: null }),
  'checkout',
  'a failed or unauthenticated best-effort probe preserves checkout recovery',
)
equal(
  policy.decideCheckoutCancelledPrimary({ resolved: true, resumeReason: 'TRIAL_FIRST_DELIVERY_PENDING' }),
  'checkout',
  'reason matching is explicit rather than fuzzy',
)

const page = source('app/checkout/cancelled/page.tsx')
const resumeRoute = source('app/api/stripe/checkout/resume/route.ts')
const trialPolicy = source('lib/growth/trialBalanceBridge.ts')
const dollar = String.fromCharCode(36)

ok(page.includes("fetch('/api/stripe/checkout/resume'"), 'live cancelled page probes the owned passive-resume endpoint')
ok(page.includes("credentials: 'same-origin'"), 'probe carries only the same-origin session')
ok(page.includes("cache: 'no-store'"), 'billing and trial truth are never cached')
ok(page.includes('new AbortController()'), 'obsolete probes are aborted')
ok(page.includes("decideCheckoutCancelledPrimary({"), 'live page executes the pure recovery policy')
ok(page.includes("cancelledPrimary === 'checking'"), 'page has an honest resolving state')
ok(page.includes("cancelledPrimary === 'first_delivery'"), 'page has a bounded first-delivery state')
ok(page.includes('Build my {TRIAL_FIRST_DELIVERY_DURATION}s Seedance episode →'), 'primary CTA names the included premium episode')
ok(page.includes('No card · no automatic charge · your saved plan stays available'), 'copy states the three safety guarantees')
ok(page.includes('engine=seedance&duration=' + dollar + '{TRIAL_FIRST_DELIVERY_DURATION}'), 'CTA prepares the canonical premium engine and duration')
ok(page.includes('intent_campaign=' + dollar + '{TRIAL_FIRST_DELIVERY_VERSION}'), 'CTA carries the canonical measurement version')
ok(page.includes("trackEvent('checkout_cancelled_trial_delivery_offered'"), 'offer exposure is measurable')
ok(page.includes("trackEvent('checkout_cancelled_trial_delivery_clicked'"), 'delivery continuation is measurable')
ok(page.includes("display: cancelledPrimary === 'checkout' ? undefined : 'none'"), 'checkout objections cannot compete with trial delivery')
ok(page.includes("cancelledPrimary === 'first_delivery' ? '← Back to studio' : '← Go back to pricing'"), 'secondary navigation follows the same decision')
ok(page.includes("checkout.launch(checkoutSelection, retryHref"), 'existing explicit checkout retry remains implemented')
ok(page.includes('7-day money-back guarantee · cancel anytime in one click'), 'existing checkout reassurance remains implemented')
ok(page.includes("cancelledPrimary === 'checkout' && !isAutopilotReturn && cheaperTier !== null"), 'downshift is limited to self-serve checkout recovery after trial truth resolves')
ok(page.includes('data-checkout-downshift-primary="true"'), 'eligible cancelled checkouts render the lower recurring tier as the primary choice')
ok(page.indexOf('data-checkout-downshift-primary="true"') < page.indexOf('What stopped you?'), 'the actionable lower tier appears before the optional objection question')
ok(page.includes('`Start ${cheaperName} — ${monthlyOf(cheaperTier)}/month →`'), 'primary downshift CTA derives its visible price from canonical pricing')
ok(page.includes('Keep {planName} — {todayPrice}'), 'the originally selected plan remains available as the secondary choice')
ok(page.includes("trackEvent('checkout_downshift_offer_viewed'"), 'primary downshift exposure is measurable')
ok(page.includes("trackEvent('checkout_downshift_offer_clicked'"), 'primary downshift selection is measurable')
ok(page.includes("trackEvent('checkout_downgrade_offer_clicked'"), 'the established downgrade event series remains intact')
ok(page.includes("startDownshiftCheckout('primary')"), 'the primary placement uses the shared downshift launcher')
ok(page.includes("startDownshiftCheckout('objection')"), 'the price-objection placement uses the same downshift launcher')
ok(page.includes('startSavedCheckout()'), 'the saved-plan retry remains reachable through the shared launcher')
ok(!page.includes('Start Starter — $7/month'), 'the new CTA contains no hardcoded Starter price')
ok(resumeRoute.includes("'trial_first_delivery_pending'"), 'server still owns the explicit eligibility reason')
ok(resumeRoute.includes('decideTrialFirstDelivery({'), 'server reason still comes from the canonical trial policy')
ok(trialPolicy.includes("TRIAL_FIRST_DELIVERY_VERSION = 'trial_first_seedance_35s_v2'"), 'destination version is pinned by the shared policy')
ok(page.includes('for {TRIAL_FIRST_DELIVERY_COST} credits and keep the rest of your trial for more videos'), 'cancel recovery preserves the repetition budget truth')
ok(!/\$\d/.test(source('lib/growth/checkoutCancelledRecovery.ts')), 'new policy contains no commercial price')

console.log('\n' + checks + '/' + checks + ' checkout-cancel deliver-first checks passed')
