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

const policy = loadTs('lib/growth/checkoutFallbackTruth.ts')
const component = source('components/CheckoutStalledCta.tsx')
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(policy.CHECKOUT_FALLBACK_COPY_VERSION, 'checkout_fallback_truth_v1', 'variant has a stable version')

const direct = policy.checkoutFallbackCopy({
  kind: 'stripe_direct',
  planLabel: 'Creator',
  priceLabel: '$15.00',
})
equal(direct.confirmedCheckout, true, 'direct Stripe URL is a confirmed checkout')
equal(direct.title, 'Your checkout is ready — your browser did not open it', 'direct title remains unchanged')
equal(direct.detail, 'Creator · first charge $15.00. You have not been charged yet.', 'direct detail remains unchanged')
equal(direct.actionLabel, 'Continue to payment →', 'direct CTA remains unchanged')

const resume = policy.checkoutFallbackCopy({ kind: 'resume_endpoint' })
equal(resume.confirmedCheckout, true, 'owned resume endpoint is a confirmed checkout')
equal(resume.detail, 'Your payment page is ready. You have not been charged yet.', 'resume fallback detail remains unchanged')
equal(resume.actionLabel, direct.actionLabel, 'confirmed paths share the existing CTA')

const retry = policy.checkoutFallbackCopy({
  kind: 'idempotent_retry',
  planLabel: 'Starter',
  priceLabel: '$7.00',
})
equal(retry.confirmedCheckout, false, 'idempotent retry does not claim a confirmed checkout')
equal(retry.title, 'Checkout took too long to open', 'retry title states the observed failure')
equal(retry.detail, 'Starter · first charge $7.00. This attempt did not charge you. Try secure checkout again.', 'retry detail distinguishes a new attempt')
equal(retry.actionLabel, 'Try secure checkout again →', 'retry CTA names the operation truthfully')
equal(retry.actionAriaLabel, 'Try secure checkout again', 'retry action has an honest accessible name')
ok(!retry.title.includes('ready') && !retry.detail.includes('page is ready'), 'degraded copy never claims a ready payment page')

const retryWithoutLabels = policy.checkoutFallbackCopy({ kind: 'idempotent_retry' })
equal(retryWithoutLabels.detail, 'This attempt did not charge you. Try secure checkout again.', 'retry stays truthful without plan labels')
ok(!/\$\d/.test(source('lib/growth/checkoutFallbackTruth.ts')), 'policy has no literal commercial price')

ok(component.includes("from '@/lib/growth/checkoutFallbackTruth'"), 'live component imports the executable policy')
ok(component.includes('checkoutFallbackCopy({'), 'live component executes the policy')
ok(component.includes('kind: stalled.kind'), 'live component passes the canonical fallback kind')
ok(component.includes('{copy.title}'), 'live title comes from the policy')
ok(component.includes('{copy.detail}'), 'live detail comes from the policy')
ok(component.includes('{copy.actionLabel}'), 'live CTA comes from the policy')
ok(component.includes('aria-label={copy.actionAriaLabel}'), 'live CTA accessible name comes from the policy')
ok(component.includes('href={stalled.url}'), 'recovery remains a plain anchor to the canonical URL')
// The historical design comment intentionally names `preventDefault`; inspect
// the executable anchor instead of turning a documentation word into a false
// failure.
const anchorHrefIndex = component.indexOf('href={stalled.url}')
const anchorStart = component.lastIndexOf('<a', anchorHrefIndex)
const anchorEnd = component.indexOf('</a>', anchorHrefIndex)
const liveAnchor = anchorHrefIndex >= 0 && anchorStart >= 0 && anchorEnd > anchorHrefIndex
  ? component.slice(anchorStart, anchorEnd + 4)
  : ''
ok(liveAnchor.length > 0, 'live recovery anchor is present')
ok(!liveAnchor.includes('preventDefault'), 'recovery still never blocks native anchor navigation')
equal((component.match(/version: CHECKOUT_FALLBACK_COPY_VERSION/g) ?? []).length, 3, 'shown, clicked and dismissed share one version')
ok(component.includes("trackEvent('checkout_fallback_dismissed'"), 'dismissal is measurable')
ok(component.includes('fallback_kind: stalled.kind'), 'click/dismiss retain the current fallback kind')
ok(component.includes('shown_kind: shownKindRef.current'), 'click/dismiss retain the impression kind')
ok(component.includes('clearStalledCheckout()'), 'dismiss still clears the global recovery store')
ok(component.includes('@media (max-width: 520px)'), 'live card has a bounded mobile breakpoint')
ok(component.includes('flex-wrap: wrap'), 'mobile card gives the message and action separate rows')
ok(component.includes('width: 100%;'), 'mobile retry action receives a full-width tap target')
ok(component.includes('white-space: normal !important'), 'mobile retry label can wrap instead of crushing the message')

console.log(`\n${checks}/${checks} checkout fallback-truth checks passed`)
