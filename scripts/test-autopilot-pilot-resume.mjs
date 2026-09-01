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
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(() => {
    throw new Error(`${path}: unexpected import`)
  }, module, module.exports)
  return module.exports
}

const policy = loadTs('lib/growth/autopilotPilotResume.ts')
const eligible = {
  mode: 'payment',
  pack: 'autopilot_pilot',
  ownerUserId: 'user-a',
  expectedUserId: 'user-a',
  status: 'expired',
  paymentStatus: 'unpaid',
  alreadyEntitled: false,
  currency: 'usd',
  amountTotal: 9900,
  canonicalCurrency: 'usd',
  canonicalAmount: 9900,
}

equal(policy.decideAutopilotPilotResume(eligible), {
  eligible: true,
  reason: 'eligible',
  canCreateInternalRetry: true,
}, 'exact unpaid Pilot is eligible for safe recreation')
equal(policy.decideAutopilotPilotResume({ ...eligible, status: 'open' }).eligible, true, 'open Pilot is eligible')
equal(policy.decideAutopilotPilotResume({ ...eligible, mode: 'subscription' }).reason, 'wrong_mode', 'subscription cannot enter one-time path')
equal(policy.decideAutopilotPilotResume({ ...eligible, pack: 'bulk10' }).reason, 'wrong_product', 'bulk is excluded while its gate is frozen')
equal(policy.decideAutopilotPilotResume({ ...eligible, pack: 'starter10' }).reason, 'wrong_product', 'Starter pack is excluded')
equal(policy.decideAutopilotPilotResume({ ...eligible, ownerUserId: null }).reason, 'wrong_owner', 'owner is mandatory')
equal(policy.decideAutopilotPilotResume({ ...eligible, ownerUserId: 'user-b' }).reason, 'wrong_owner', 'cross-account Session is rejected')
equal(policy.decideAutopilotPilotResume({ ...eligible, alreadyEntitled: true }).reason, 'already_entitled', 'active Pilot or Autopilot cannot be resold')
equal(policy.decideAutopilotPilotResume({ ...eligible, status: 'complete' }).reason, 'already_settled', 'completed Session is terminal')
equal(policy.decideAutopilotPilotResume({ ...eligible, paymentStatus: 'paid' }).reason, 'already_settled', 'paid Session is terminal')
equal(policy.decideAutopilotPilotResume({ ...eligible, currency: null }).reason, 'invalid_amount', 'missing currency fails closed')
equal(policy.decideAutopilotPilotResume({ ...eligible, currency: 'US$' }).reason, 'invalid_amount', 'malformed currency fails closed')
equal(policy.decideAutopilotPilotResume({ ...eligible, amountTotal: null }).reason, 'invalid_amount', 'missing amount fails closed')
equal(policy.decideAutopilotPilotResume({ ...eligible, amountTotal: -1 }).reason, 'invalid_amount', 'negative amount fails closed')
equal(policy.decideAutopilotPilotResume({ ...eligible, amountTotal: 10000 }).reason, 'offer_drift', 'amount drift fails the entire recovery closed')
equal(policy.decideAutopilotPilotResume({ ...eligible, currency: 'eur' }).reason, 'offer_drift', 'currency drift fails the entire recovery closed')
equal(policy.isAutopilotPilotResumeMeasurementHost('www.usekineo.com'), true, 'canonical production host is measurable')
equal(policy.isAutopilotPilotResumeMeasurementHost('usekineo.com'), false, 'redirect host cannot fabricate exposure')
equal(policy.isAutopilotPilotResumeMeasurementHost('preview.vercel.app'), false, 'preview cannot fabricate exposure')
equal(policy.autopilotPilotResumeMetadata('stripe_recovery'), {
  variant: 'one_time_pilot_resume_v1',
  product: 'autopilot_pilot',
  purchase_type: 'one_time',
  surface: 'global_resume',
  destination_kind: 'stripe_recovery',
}, 'telemetry is categorical and contains no URL or identity')

const checkout = read('app/api/stripe/checkout/route.ts')
const pilotStart = checkout.indexOf('async function buildAutopilotPilotAndRedirect(')
const pilotEnd = checkout.indexOf('// ─── KINEO-BULK', pilotStart)
const pilotBlock = checkout.slice(pilotStart, pilotEnd)
ok(pilotStart > 0 && pilotEnd > pilotStart, 'live Pilot builder is located')
ok(pilotBlock.includes("mode: 'payment'"), 'Pilot remains a one-time payment')
ok(pilotBlock.includes("pack: 'autopilot_pilot'"), 'Pilot exact webhook identity remains intact')
ok(pilotBlock.includes('after_expiration: {'), 'Pilot enables Stripe abandoned-cart recovery')
ok(pilotBlock.includes('recovery: { enabled: true }'), 'Stripe recovery is explicit')
ok(pilotBlock.includes('pilot_resume_version: AUTOPILOT_PILOT_RESUME_VERSION'), 'Session metadata versions recovery')
ok(pilotBlock.includes('resume_version: AUTOPILOT_PILOT_RESUME_VERSION'), 'idempotency key changes with the new Session contract')
ok(pilotBlock.includes('rememberAutopilotPilotCheckout(response, session.id)'), 'successful Session creation stores the private Pilot handle')
ok(checkout.includes("name: AUTOPILOT_PILOT_RESUME_HINT_COOKIE,\n    value: '1'"), 'Pilot creation stores only a public boolean client hint')
ok(!pilotBlock.includes('rememberRecurringCheckout(response, session.id)'), 'Pilot never enters the recurring cookie')

const resumeRoute = read('app/api/stripe/checkout/pilot-resume/route.ts')
ok(resumeRoute.includes("req.cookies.get(AUTOPILOT_PILOT_SESSION_COOKIE)"), 'endpoint reads only the Pilot cookie')
ok(resumeRoute.includes('SESSION_ID_PATTERN.test(rawSessionId)'), 'opaque Session id is bounded')
ok(resumeRoute.includes("return unavailableResponse(req, go, 'none', { clearSession: true })"), 'stale public hint is cleared even when the private Session cookie is absent')
ok(resumeRoute.includes('decideAutopilotPilotResume({'), 'live endpoint executes the pure fail-closed policy')
ok(resumeRoute.includes('ownerUserId: session.metadata?.supabase_user_id ?? session.client_reference_id ?? null'), 'owner comes from Stripe identity')
ok(resumeRoute.includes('alreadyEntitled: isAutopilotEntitled(profile)'), 'active entitlement blocks recovery')
ok(resumeRoute.includes("destinationKind = 'open_session'"), 'open original Session can resume')
ok(resumeRoute.includes("destinationKind = 'stripe_recovery'"), 'Stripe recovery URL can resume')
ok(resumeRoute.includes("destinationKind = 'internal_retry'"), 'expired exact-price Session has explicit retry')
ok(resumeRoute.includes("pack=autopilot_pilot&recovery=1"), 'internal retry cannot change product')
ok(!resumeRoute.includes('checkout.sessions.create'), 'viewing recovery never creates a Stripe Session')
ok(!resumeRoute.includes('bulk10'), 'bulk gate is not reopened')
ok(!resumeRoute.includes('stripe_session_id:'), 'client response and telemetry do not expose the Session id')
ok(resumeRoute.includes("Cache-Control', 'private, no-store"), 'billing state is private and uncached')
ok(resumeRoute.includes("return unavailableResponse(req, go, decision.reason, { clearSession: true })"), 'terminal contract drift is cleared instead of looping on every navigation')

const banner = read('components/AutopilotPilotResumeBanner.tsx')
ok(banner.includes("fetch('/api/stripe/checkout/pilot-resume'"), 'live banner probes only the Pilot endpoint')
ok(banner.includes('!hasPilotResumeHint()'), 'visitors without a Pilot intent make no extra billing request')
ok(banner.includes('AUTOPILOT_PILOT_RESUME_HINT_COOKIE}=1'), 'client hint contains only a boolean')
ok(banner.includes('AUTOPILOT_PILOT_RESUME_VISIBLE_RATIO'), 'exposure requires the shared visibility gate')
ok(banner.includes('isAutopilotPilotResumeMeasurementHost(window.location.hostname)'), 'preview and localhost do not count')
ok(banner.includes("'autopilot_pilot_resume_viewed'"), 'qualified view is measurable')
ok(banner.includes("'autopilot_pilot_resume_clicked'"), 'resume click is measurable')
ok(banner.includes("'autopilot_pilot_resume_dismissed'"), 'dismissal is measurable')
ok(banner.includes("useCheckoutLaunch('autopilot_pilot_resume_banner')"), 'CTA reuses duplicate-click protection')
ok(banner.includes('one time · no auto-renewal'), 'copy tells one-time truth')
ok(banner.includes('Payment completes only inside Stripe.'), 'simple view never claims or causes payment')
ok(banner.includes('@media (max-width: 560px)'), 'live banner defines a real mobile breakpoint')
ok(banner.includes('flex-wrap: wrap'), 'mobile layout stacks instead of squeezing the copy')
ok(banner.includes('width: 100%;\n          text-align: center;'), 'mobile CTA spans the available width')
ok(!/\$\d/.test(banner), 'component contains no literal commercial price')
ok(!banner.includes('checkout_resume_banner_viewed'), 'subscription experiment events remain separate')

const layout = read('app/layout.tsx')
ok(layout.includes("import AutopilotPilotResumeBanner from '@/components/AutopilotPilotResumeBanner'"), 'root layout imports the one-time surface')
ok(layout.includes('<CheckoutResumeBanner /><AutopilotPilotResumeBanner /><CheckoutStalledCta />'), 'one-time surface is mounted beside, not inside, subscription recovery')

const preview = read('docs/previews/AUTOPILOT-PILOT-RESUME-V1-2026-09-01.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview contains ${label}`)
}

console.log(`Autopilot Pilot resume: ${checks}/${checks} checks passed`)
