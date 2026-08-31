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
const equal = (actual, expected, label) => {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), label)
  checks += 1
}

function executeTs(file) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const box = { exports: {} }
  vm.runInNewContext(output, {
    module: box,
    exports: box.exports,
    require: (id) => { throw new Error(`unexpected runtime import: ${id}`) },
    Number,
  }, { filename: file })
  return box.exports
}

const policy = executeTs('lib/growth/trialDowngradeChoice.ts')

equal(policy.TRIAL_DOWNGRADE_CHOICE_VERSION, 'trial_downgrade_choice_v1', 'version is stable')
equal(Object.keys(policy.TRIAL_DOWNGRADE_PLAN_CHOICES), ['starter', 'creator'], 'only two direct plan choices exist')
equal(policy.TRIAL_DOWNGRADE_PLAN_CHOICES.starter.tier, 'starter', 'Starter maps to the Starter Stripe tier')
equal(policy.TRIAL_DOWNGRADE_PLAN_CHOICES.creator.tier, 'basic', 'Creator preserves the Basic Stripe tier')
equal(policy.TRIAL_DOWNGRADE_CHOICES, ['starter', 'creator', 'compare'], 'choice allowlist is bounded')

for (const choice of policy.TRIAL_DOWNGRADE_CHOICES) {
  check(policy.isTrialDowngradeChoice(choice), `${choice} is accepted`)
}
for (const invalid of ['', 'pro', 'basic', 'starter<script>', null, 1]) {
  check(!policy.isTrialDowngradeChoice(invalid), `${String(invalid)} is rejected`)
}

for (const [input, expected] of [
  [null, 'unknown'], [-1, 'unknown'], [0, '0'], [1, '1'], [2, '2_3'], [3, '2_3'], [4, '4_plus'], [99, '4_plus'],
]) {
  equal(policy.completedCountBucket(input), expected, `completed count ${String(input)} → ${expected}`)
}
for (const [input, expected] of [
  [null, 'unknown'], [-1, 'unknown'], [0, '0'], [1, '1_9'], [9, '1_9'], [10, '10_19'], [19, '10_19'], [20, '20_plus'], [99, '20_plus'],
]) {
  equal(policy.creditsUsedBucket(input), expected, `credits used ${String(input)} → ${expected}`)
}

const metadata = policy.trialDowngradeChoiceMetadata({ choice: 'starter', completedCount: 1, creditsUsed: 20 })
equal(metadata, {
  version: 'trial_downgrade_choice_v1',
  choice: 'starter',
  completed_count_bucket: '1',
  credits_used_bucket: '20_plus',
}, 'metadata is bounded and versioned')
equal(Object.keys(metadata).sort(), ['choice', 'completed_count_bucket', 'credits_used_bucket', 'version'], 'metadata has no PII field')
equal(policy.trialDowngradeChoiceMetadata({ choice: 'enterprise', completedCount: 1, creditsUsed: 20 }), null, 'unknown choice fails closed')

const component = read('components/TrialDowngradeModal.tsx')
for (const needle of [
  "trackEvent('trial_downgrade_choice_clicked'",
  "kineo_trial_downgrade_shown_choice_v1",
  "trackEvent('trial_downgrade_modal_cta'",
  "choice_version: TRIAL_DOWNGRADE_CHOICE_VERSION",
  "getTierPrice('starter', currency, region)",
  "getTierPrice('basic', currency, region)",
  'TIER_CREDITS.starter',
  'TIER_CREDITS.basic',
  "recordChoice('starter')",
  "recordChoice('creator')",
  "recordChoice('compare')",
  'Choose Starter →',
  'Continue on Creator →',
  'Compare all plans →',
  "fetch('/api/videos'",
]) {
  check(component.includes(needle), `live component contains ${needle}`)
}
check(component.includes('tier=starter&intro=1&intent_campaign=${TRIAL_DOWNGRADE_CHOICE_VERSION}'), 'Starter checkout carries experiment attribution')
check(component.includes('tier=basic&intro=1&intent_campaign=${TRIAL_DOWNGRADE_CHOICE_VERSION}'), 'Creator checkout preserves its route and carries attribution')
check(!component.includes("checkout.launch('pro'"), 'experiment does not add an unrequested plan checkout')
check(!component.includes('video_id:'), 'choice telemetry contains no video id')
check(!component.includes('email:'), 'choice telemetry contains no email')

const previewPath = 'docs/previews/TRIAL-DOWNGRADE-CHOICE-2026-08-31.html'
check(fs.existsSync(path.join(root, previewPath)), 'visual comparison exists')
const preview = read(previewPath)
for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(marker), `preview contains ${marker}`)
}
check(!/https?:\/\//i.test(preview), 'preview has no external dependency')

const helper = read('lib/growth/trialDowngradeChoice.ts')
check(helper.includes('10 external people'), 'measurement gate is documented')
check(helper.includes('selected tier') && helper.includes('displayed price'), 'stop condition is documented')

console.log(`PASS — ${checks}/${checks} trial downgrade-choice checks`)
