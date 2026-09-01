#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

const policySource = read('lib/growth/trialDowngradePlanChoice.ts')
const compiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleBox = { exports: {} }
new Function('module', 'exports', compiled)(moduleBox, moduleBox.exports)
const policy = moduleBox.exports

equal(policy.TRIAL_DOWNGRADE_PLAN_CHOICE_VERSION, 'trial_downgrade_plan_choice_v1', 'version is stable')
equal(
  policy.TRIAL_DOWNGRADE_PLAN_COMPARE_HREF,
  '/pricing?intent_campaign=trial_downgrade_plan_choice_v1#plans',
  'comparison reaches the canonical plan grid with its own campaign',
)
ok(!policy.TRIAL_DOWNGRADE_PLAN_COMPARE_HREF.includes('utm_'), 'internal comparison cannot overwrite acquisition attribution')
ok(!policy.TRIAL_DOWNGRADE_PLAN_COMPARE_HREF.includes('checkout'), 'comparison does not create a Checkout Session')

equal(policy.comparisonDeferralValue(null, 1000, 3), '1000:1', 'first comparison pauses without a permanent dismissal')
equal(policy.comparisonDeferralValue('900:1', 1000.9, 3), '1000:1', 'comparison keeps the first deferral count')
equal(policy.comparisonDeferralValue('900:2', 1000, 3), '1000:2', 'comparison preserves an existing second deferral')
equal(policy.comparisonDeferralValue('900:3', 1000, 3), '1000:2', 'comparison cannot consume the permanent-suppression threshold')
equal(policy.comparisonDeferralValue('perm', 1000, 3), '1000:1', 'malformed legacy state cannot become a permanent choice through comparison')
equal(policy.comparisonDeferralValue(null, -1, 3), '0:1', 'invalid clock fails to a deterministic nonnegative value')
equal(policy.comparisonDeferralValue(null, 1000, 1), '1000:1', 'invalid maximum still leaves one reversible deferral')

const component = read('components/TrialDowngradeModal.tsx')
ok(component.includes('TRIAL_DOWNGRADE_PLAN_CHOICE_VERSION'), 'real modal imports the version')
ok(component.includes('TRIAL_DOWNGRADE_PLAN_COMPARE_HREF'), 'real modal imports the destination')
ok(component.includes('comparisonDeferralValue(current, Date.now(), MAX_ADIAMENTOS)'), 'real modal applies the reversible deferral policy')
ok(component.includes("trackEvent('trial_downgrade_compare_plans_clicked'"), 'real modal emits a dedicated comparison event')
ok(component.includes("source: 'trial_downgrade_modal'"), 'event names the finite source')
ok(component.includes("destination: 'pricing_plans'"), 'event names the finite destination')
ok(component.includes("primary_tier: 'basic'"), 'event records the primary offer without price or free text')
ok(component.indexOf("trackEvent('trial_downgrade_compare_plans_clicked'") < component.indexOf('window.location.assign(TRIAL_DOWNGRADE_PLAN_COMPARE_HREF)'), 'event is emitted before navigation')
// These labels also appear in historical comments. `lastIndexOf` anchors the
// rendered controls instead of mistaking prose for product order.
ok(component.lastIndexOf('Continue on Creator') < component.lastIndexOf('Compare all plans →'), 'direct Creator checkout remains primary')
ok(component.lastIndexOf('Compare all plans →') < component.lastIndexOf('Keep creating on the free plan'), 'plan comparison appears before the permanent free choice')
ok(component.includes('See monthly credits and included engines before you decide.'), 'comparison explains what the plan grid resolves')
ok(component.includes('onClick={goToCreator}'), 'existing Creator checkout is preserved')
ok(component.includes("dismiss('stay_free')"), 'existing permanent free choice is preserved')

const eventBlock = component.slice(
  component.indexOf("trackEvent('trial_downgrade_compare_plans_clicked'"),
  component.indexOf("trackEvent('trial_downgrade_compare_plans_clicked'") + 420,
)
for (const forbidden of ['email', 'prompt', 'script', 'topic', 'user_id', 'session_id', 'price', 'url']) {
  ok(!eventBlock.includes(forbidden), `comparison telemetry excludes ${forbidden}`)
}

const preview = read('docs/previews/TRIAL-DOWNGRADE-PLAN-CHOICE-V1-2026-09-01.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `visual comparison includes ${label}`)
}
ok(preview.includes('19 external people saw the modal in seven days'), 'preview names the dated person-level baseline')
ok(preview.includes('0 clicked Continue on Creator'), 'preview names the current stop signal')
ok(preview.includes('Compare all plans →'), 'preview shows the new secondary decision')

console.log(`PASS — ${checks}/${checks} trial downgrade plan-choice checks`)
