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
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

function executeTs(file, mocks = {}) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(output, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error(`unmocked import: ${id}`)
    },
  }, { filename: file })
  return moduleBox.exports
}

const guidance = executeTs('lib/growth/autopilotCheckoutGuidance.ts', {
  '@/lib/autopilot/config': { AUTOPILOT_PILOT_DAYS: 7 },
})

equal(guidance.AUTOPILOT_CHECKOUT_GUIDANCE_ENABLED, true, 'one switch enables the reversible experiment')
equal(guidance.AUTOPILOT_CHECKOUT_GUIDANCE_VERSION, 'autopilot_checkout_guidance_v1', 'version is stable')
equal(guidance.buildAutopilotCheckoutGuidance(null), null, 'non-Autopilot checkout keeps its existing copy')
equal(guidance.buildAutopilotCheckoutGuidance('monthly_plus'), null, 'runtime offer kind is allow-listed')

const monthly = guidance.buildAutopilotCheckoutGuidance('monthly')
const pilot = guidance.buildAutopilotCheckoutGuidance('pilot')
equal(monthly.offerKind, 'monthly', 'monthly offer is allow-listed')
equal(pilot.offerKind, 'pilot', 'pilot offer is allow-listed')
for (const [contract, label] of [[monthly, 'monthly'], [pilot, 'pilot']]) {
  equal(contract.version, guidance.AUTOPILOT_CHECKOUT_GUIDANCE_VERSION, `${label} carries the experiment version`)
  check(contract.submitMessage.includes('connect your YouTube channel'), `${label} explains the channel handoff`)
  check(contract.submitMessage.includes('choose its topic and posting time'), `${label} explains the two setup choices`)
  check(contract.submitMessage.includes('Publishing starts only after setup.'), `${label} does not imply automatic activation at payment`)
  check(contract.submitMessage.length <= 500, `${label} remains within Stripe custom-text limit`)
}
check(monthly.submitMessage.includes('Renews monthly at the price shown; cancel from Account.'), 'monthly names renewal and cancellation')
check(!monthly.submitMessage.includes('One-time payment'), 'monthly cannot inherit one-time terms')
check(pilot.submitMessage.includes('One-time payment; no renewal.'), 'pilot explicitly has no renewal')
check(pilot.submitMessage.includes('ends after 7 days'), 'pilot duration comes from the canonical runtime constant')
check(!pilot.submitMessage.includes('Renews monthly'), 'pilot cannot inherit subscription terms')

const policySource = read('lib/growth/autopilotCheckoutGuidance.ts')
check(!/\$\d/.test(policySource), 'guidance contains no copied price')
check(policySource.includes('AUTOPILOT_PILOT_DAYS'), 'pilot duration is imported, not retyped')
check(policySource.includes('AUTOPILOT_CHECKOUT_GUIDANCE_ENABLED'), 'rollback has one explicit switch')

const route = read('app/api/stripe/checkout/route.ts')
check(route.includes("import { buildAutopilotCheckoutGuidance } from '@/lib/growth/autopilotCheckoutGuidance'"), 'live checkout imports the policy')
check(route.includes("tier === 'autopilot' ? 'monthly' : null"), 'only monthly Autopilot receives monthly guidance')
check(route.includes('message: autopilotCheckoutGuidance?.submitMessage ?? checkoutValueContext.submitMessage'), 'monthly guidance reaches hosted Stripe with safe fallback')
check(route.includes("const autopilotPilotGuidance = buildAutopilotCheckoutGuidance('pilot')"), 'pilot executes its distinct policy')
check(route.includes('submit: { message: autopilotPilotGuidance.submitMessage }'), 'pilot guidance reaches hosted Stripe')
// The named pair is built once per offer and spread into each destination. An
// occurrence count of four incorrectly assumes the source must duplicate a
// field name in order to transport it four times; assert the three real owners
// (monthly policy, pilot policy, pilot idempotency) plus their spread sites.
check((route.match(/autopilot_checkout_guidance_version/g) ?? []).length >= 3, 'guidance version has monthly, pilot and idempotency owners')
check((route.match(/autopilot_offer_kind/g) ?? []).length >= 3, 'offer kind has monthly, pilot and idempotency owners')
check((route.match(/\.\.\.autopilotCheckoutGuidanceMetadata/g) ?? []).length >= 3, 'monthly metadata reaches event, Session and Subscription')
check((route.match(/\.\.\.autopilotPilotGuidanceMetadata/g) ?? []).length >= 2, 'pilot metadata reaches event context and Session')
// Rebase/checkouts on Windows may normalize this file to CRLF. Assert the
// object contract instead of coupling the gate to a line-ending convention.
check(/autopilot_checkout_guidance_version:\s*autopilotPilotGuidance\?\.version \?\? null/.test(route), 'pilot idempotency changes with displayed guidance')
check(route.includes('custom_text: sessionParams.custom_text'), 'monthly idempotency still covers displayed custom text')

const webhook = read('app/api/stripe/webhook/route.ts')
for (const field of ['autopilot_checkout_guidance_version', 'autopilot_offer_kind']) {
  const copiedField = new RegExp(`${field}:\\s*session\\.metadata\\?\\.${field} \\?\\? null`)
  check(copiedField.test(webhook), `payment_success copies ${field}`)
}
check(webhook.includes(".contains('metadata', { stripe_session_id: session.id })"), 'payment_success dedupe stays bound to Stripe Session')

const previewPath = 'docs/previews/AUTOPILOT-CHECKOUT-GUIDANCE-2026-08-31.html'
check(fs.existsSync(path.join(root, previewPath)), 'before/after preview exists')
const preview = read(previewPath)
for (const marker of [
  'BEFORE · MONTHLY · DESKTOP',
  'AFTER · MONTHLY · DESKTOP',
  'BEFORE · PILOT · DESKTOP',
  'AFTER · PILOT · DESKTOP',
  'BEFORE · MONTHLY · MOBILE',
  'AFTER · MONTHLY · MOBILE',
  'BEFORE · PILOT · MOBILE',
  'AFTER · PILOT · MOBILE',
  'GATE: 5 external people total, at least 2 per offer kind',
]) {
  check(preview.includes(marker), `preview contains ${marker}`)
}
check(!/https?:\/\//i.test(preview), 'preview has no external dependency')

console.log(`PASS — ${checks}/${checks} Autopilot checkout-guidance checks`)
