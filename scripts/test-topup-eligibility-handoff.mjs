#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

function executeTs(file) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => { throw new Error(`unmocked import ${id}`) },
  }, { filename: file })
  return moduleBox.exports
}

const policy = executeTs('lib/growth/topupEligibility.ts')

equal(policy.TOPUP_ELIGIBILITY_HANDOFF_VERSION, 'topup_eligibility_handoff_v1', 'experiment has an immutable version')
equal(policy.TOPUP_ELIGIBILITY_VISIBLE_RATIO, 0.6, 'view requires sixty percent visibility')
equal(policy.TOPUP_ELIGIBILITY_MEASUREMENT_HOST, 'www.usekineo.com', 'measurement host is canonical production')

for (const plan of ['basic', 'basic_trial', 'pro', 'pro_trial', ' BASIC ', 'Pro_Trial']) {
  equal(policy.canPurchaseCreditTopup(plan), true, `top-up remains available for ${plan}`)
  equal(policy.topupEligibilityState(plan), 'eligible', `eligible state is explicit for ${plan}`)
}
for (const plan of ['free', 'starter', 'starter_trial', 'autopilot', 'autopilot_trial', 'unknown', '', null, undefined, 42]) {
  equal(policy.canPurchaseCreditTopup(plan), false, `top-up is unavailable for ${plan}`)
  equal(policy.topupEligibilityState(plan), 'ineligible', `ineligible state is explicit for ${plan}`)
}

equal(policy.isTopupEligibilityMeasurementHost('www.usekineo.com'), true, 'canonical production is measurable')
equal(policy.isTopupEligibilityMeasurementHost(' WWW.USEKINEO.COM '), true, 'canonical host normalizes case and whitespace')
for (const host of ['usekineo.com', 'localhost', '127.0.0.1', 'preview.vercel.app', 'www.usekineo.com.evil.example', null]) {
  equal(policy.isTopupEligibilityMeasurementHost(host), false, `non-production host is not measurable: ${host}`)
}

const metadata = policy.topupEligibilityMetadata('sidebar_chip')
equal(metadata.version, 'topup_eligibility_handoff_v1', 'metadata carries the immutable version')
equal(metadata.surface, 'sidebar_chip', 'metadata identifies the measured surface')
equal(metadata.eligibility_state, 'ineligible', 'metadata counts only people in the corrected path')
equal(metadata.destination, 'pricing', 'metadata records a categorical destination')
equal(Object.keys(metadata).length, 4, 'metadata contains only four allow-listed fields')
for (const forbidden of ['email', 'plan', 'price', 'credits', 'url', 'href', 'utm_']) {
  check(!JSON.stringify(metadata).toLowerCase().includes(forbidden), `metadata excludes ${forbidden}`)
}

const sidebar = read('components/Sidebar.tsx')
check(sidebar.includes("import { trackEvent } from '@/lib/analytics'"), 'sidebar uses the canonical analytics client')
check(sidebar.includes('canPurchaseCreditTopup(plan)'), 'sidebar uses the shared eligibility policy')
check(sidebar.includes('const [planResolved, setPlanResolved]'), 'sidebar distinguishes unknown plan from ineligible plan')
check(sidebar.includes('disabled={!planResolved}'), 'unknown plan cannot open the wrong purchase flow')
check(sidebar.includes('if (topupEligible)'), 'eligible and ineligible clicks have separate branches')
check(sidebar.includes('setShowTopup(true)'), 'eligible Creator and Studio still open the top-up modal')
check(sidebar.includes("router.push('/pricing')"), 'ineligible Free and Starter go directly to pricing')
check(sidebar.includes("'topup_eligibility_handoff_viewed'"), 'real exposure event exists')
check(sidebar.includes("'topup_eligibility_handoff_clicked'"), 'click event exists')
check(sidebar.includes('IntersectionObserver'), 'view requires real viewport exposure')
check(sidebar.includes('intersectionRatio < TOPUP_ELIGIBILITY_VISIBLE_RATIO'), 'view enforces the policy-owned threshold')
check(sidebar.includes('if (!stored) return false'), 'failed analytics writes do not poison dedupe')
check(sidebar.includes('window.sessionStorage.setItem(marker'), 'successful events dedupe per browser session')
check(sidebar.includes('isTopupEligibilityMeasurementHost(window.location.hostname)'), 'local and preview traffic cannot enter the production gate')
check(sidebar.includes("topupEligible ? '+' : '→'"), 'visible affordance matches the action')
check(sidebar.includes("topupEligible\n                        ? (creditsZero ? 'Buy more with +' : 'Top up anytime')\n                        : 'See plans'"), 'chip copy states the real next step')
check(sidebar.includes('{showTopup && <CreditsTopupModal'), 'existing top-up modal remains mounted only after an eligible click')

const account = read('components/AccountPanel.tsx')
const creditsCardStart = account.indexOf('{/* CRÉDITOS')
const creditsCardEnd = account.indexOf('{/* PLANO E RENOVAÇÃO', creditsCardStart)
const creditsCard = account.slice(creditsCardStart, creditsCardEnd)
check(creditsCardStart >= 0 && creditsCardEnd > creditsCardStart, 'real credits card is located')
check(account.includes('canPurchaseCreditTopup(planKey)'), 'account panel uses the shared policy')
check(creditsCard.includes('{topupEligible ? ('), 'credits card branches on actual top-up eligibility')
check(creditsCard.includes('Buy more credits'), 'eligible account path keeps the existing top-up CTA')
check(creditsCard.includes('href="/pricing"'), 'ineligible account path links to pricing')
check(creditsCard.includes('data-topup-eligibility="ineligible"'), 'ineligible account CTA is testable in the DOM')
check(creditsCard.includes('Choose a plan to keep creating.'), 'low-balance Starter copy no longer promises an unavailable top-up')
check(!creditsCard.includes('!isPaid && ('), 'credits CTA no longer uses the paid-plan shortcut that misclassifies Starter')

const route = read('app/api/stripe/checkout/route.ts')
const topupStart = route.indexOf('async function buildTopupAndRedirect')
const topupEnd = route.indexOf('// ─── KINEO-PILOT-99', topupStart)
check(topupStart >= 0 && topupEnd > topupStart, 'real top-up route is located')
const topupRoute = route.slice(topupStart, topupEnd)
check(topupRoute.includes('canPurchaseCreditTopup(profile?.plan)'), 'server uses the same policy as both clients')
check(topupRoute.includes("destination: '/generate' | '/pricing' = '/generate'"), 'error helper supports an honest pricing destination')
check(topupRoute.includes("reasonOverride ?? checkoutFailureReason(msg)"), 'server can record the explicit eligibility reason')
check(topupRoute.includes("'topup_requires_creator_plus'"), 'ineligible attempts have a categorical diagnostic')
check(topupRoute.includes("'/pricing',"), 'ineligible GET redirects to pricing through the measured helper')
check(topupRoute.includes("jsonError('Credit top-ups require a Creator or Studio plan.', 403, 'topup_requires_creator_plus')"), 'ineligible POST remains an explicit 403')
check(!topupRoute.includes("planVal === 'basic'"), 'server has no second hand-written eligibility list')
check(topupRoute.indexOf('canPurchaseCreditTopup(profile?.plan)') < topupRoute.indexOf('stripe.checkout.sessions.create'), 'eligibility is checked before any Stripe session is created')

const starterStart = route.indexOf('async function buildStarter290AndRedirect')
const starterEnd = route.indexOf('// ─── KINEO-TOPUP', starterStart)
const starterRoute = route.slice(starterStart, starterEnd)
check(!starterRoute.includes('canPurchaseCreditTopup'), 'unrelated first-purchase offer is untouched')
check(starterRoute.includes('return NextResponse.redirect(`${appUrl}/generate?checkout_error='), 'unrelated offer keeps its original failure destination')

const mobileNav = read('components/MobileNav.tsx')
check(!mobileNav.includes('CreditsTopupModal'), 'MobileNav has no conflicting top-up entry point')
check(!mobileNav.includes('Buy more credits'), 'MobileNav does not duplicate the corrected chip')

const pricing = read('lib/checkoutPricing.ts')
for (const identifier of ['TOPUP_PRICES', 'TOPUP_CREDITS', 'TIER_PRICES', 'TIER_CREDITS']) {
  check(pricing.includes(identifier), `canonical pricing source remains present: ${identifier}`)
}

const preview = read('docs/previews/TOPUP-ELIGIBILITY-HANDOFF-V1-2026-09-01.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(preview.includes('Free / Starter'), 'preview identifies the corrected audience')
check(preview.includes('Creator / Studio'), 'preview shows the preserved subscriber path')
check(preview.includes('3 external people'), 'preview carries the dated production evidence')
check(!/https?:\/\//i.test(preview), 'preview has no external dependency')

console.log(`PASS — ${checks}/${checks} top-up eligibility handoff checks`)
