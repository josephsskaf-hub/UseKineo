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
// Values executed inside vm live in another JavaScript realm. Compare their
// serialized data shape so a correct plain object does not fail only because
// its prototype belongs to that realm.
const equal = (actual, expected, label) => {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), label)
  checks += 1
}

function executeTs(file, mocks) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const box = { exports: {} }
  vm.runInNewContext(output, {
    module: box,
    exports: box.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error(`unmocked import: ${id}`)
    },
    Number,
  }, { filename: file })
  return box.exports
}

const policy = executeTs('lib/growth/pricingJourneyProof.ts', {
  '@/lib/engineLabel': {
    engineLabelFor: (value) => ({ cinematic_ai: 'Seedance 1.5', fast: 'Kineo 1' })[value] ?? null,
  },
})

equal(policy.PRICING_JOURNEY_PROOF_VERSION, 'pricing_journey_proof_v1', 'version is stable')

const base = {
  completedCount: 0,
  hasActivePlan: false,
  historyReliable: true,
  recentVideos: [],
  reverseTrial: true,
  savedCheckoutAvailable: false,
  signedIn: true,
}

equal(policy.decidePricingJourneyProof({ ...base, signedIn: false }), { state: 'hidden', reason: 'anonymous' }, 'anonymous stays unchanged')
equal(policy.decidePricingJourneyProof({ ...base, hasActivePlan: true }), { state: 'hidden', reason: 'subscriber' }, 'subscriber is never sold a duplicate plan')
equal(policy.decidePricingJourneyProof({ ...base, savedCheckoutAvailable: true }), { state: 'hidden', reason: 'saved_checkout' }, 'saved checkout keeps priority')
equal(policy.decidePricingJourneyProof({ ...base, historyReliable: false }), { state: 'hidden', reason: 'history_unavailable' }, 'unreliable history fails closed')
equal(policy.decidePricingJourneyProof({ ...base, completedCount: null }), { state: 'hidden', reason: 'history_unavailable' }, 'missing count fails closed')
equal(policy.decidePricingJourneyProof({ ...base, completedCount: -1 }), { state: 'hidden', reason: 'history_unavailable' }, 'negative count fails closed')

const trialBefore = policy.decidePricingJourneyProof(base)
equal(trialBefore.state, 'before_first_delivery', 'zero-delivery reverse trial gets proof-first state')
equal(trialBefore.engineLabel, 'Seedance 1.5', 'reverse trial names the premium proof engine')
equal(trialBefore.duration, 35, 'proof duration is bounded')
check(trialBefore.creationHref.includes('engine=seedance'), 'reverse trial routes to Seedance')
check(trialBefore.creationHref.includes('intent_campaign=pricing_journey_proof_v1'), 'proof handoff is attributable')

const legacyBefore = policy.decidePricingJourneyProof({ ...base, reverseTrial: false })
equal(legacyBefore.engineLabel, 'Kineo 1', 'legacy free tier does not promise premium credits')
check(legacyBefore.creationHref.includes('engine=fast'), 'legacy free tier routes to Fast')

equal(
  policy.decidePricingJourneyProof({ ...base, completedCount: 1, recentVideos: [] }),
  { state: 'hidden', reason: 'history_inconsistent' },
  'count/list mismatch cannot manufacture proof',
)

const afterOne = policy.decidePricingJourneyProof({
  ...base,
  completedCount: 1,
  recentVideos: [{ id: 'private-id', status: 'completed', duration: 35, quality_mode: 'cinematic_ai' }],
})
equal(afterOne.state, 'after_delivery', 'one delivered video gets owned-proof state')
equal(afterOne.completedCountBucket, '1', 'one video uses one bucket')
equal(afterOne.engineLabel, 'Seedance 1.5', 'owned proof uses canonical engine label')
equal(afterOne.duration, 35, 'owned proof uses delivered duration')
check(!JSON.stringify(afterOne).includes('private-id'), 'decision never returns the private video id')

const afterFour = policy.decidePricingJourneyProof({
  ...base,
  completedCount: 4,
  recentVideos: [{ id: 'x', status: 'completed', duration: 60, quality_mode: 'fast' }],
})
equal(afterFour.completedCountBucket, '2_4', 'middle bucket is bounded')
const afterMany = policy.decidePricingJourneyProof({
  ...base,
  completedCount: 10,
  recentVideos: [{ id: 'x', status: 'completed', duration: null, quality_mode: 'unknown' }],
})
equal(afterMany.completedCountBucket, '5_plus', 'large libraries use a coarse bucket')
equal(afterMany.engineLabel, null, 'unknown engine is not invented')

const component = read('components/growth/PricingJourneyProof.tsx')
for (const endpoint of ['/api/videos', '/api/me/plan', '/api/stripe/checkout/resume?surface=pricing']) {
  check(component.includes(endpoint), `component reads ${endpoint}`)
}
for (const event of [
  'pricing_journey_proof_viewed',
  'pricing_journey_proof_creation_clicked',
  'pricing_journey_proof_subscribe_now_clicked',
  'pricing_journey_proof_plans_clicked',
  'pricing_journey_proof_review_clicked',
]) {
  check(component.includes(event), `component measures ${event}`)
}
check(!component.includes('video_id:'), 'telemetry contains no video id')
check(!component.includes('title:'), 'telemetry contains no customer title')
check(component.includes('Nothing renders until you press Generate.'), 'proof-first copy preserves explicit user action')
check(component.includes('I already want to subscribe'), 'high-intent buyer remains unblocked')

const pricing = read('app/pricing/PricingClient.tsx')
check(pricing.includes("import PricingJourneyProof from '@/components/growth/PricingJourneyProof'"), 'live pricing imports the bridge')
// Compare the rendered order instead of matching a literal LF. On Windows the
// checkout may contain CRLF; line-ending style is not a product invariant.
check(
  pricing.indexOf('<PricingSavedCheckout />') < pricing.indexOf('<PricingJourneyProof signedIn={signedIn} />'),
  'saved checkout remains before the new bridge',
)

const previewPath = 'docs/previews/PRICING-JOURNEY-PROOF-2026-08-30.html'
check(fs.existsSync(path.join(root, previewPath)), 'visual comparison exists')
const preview = read(previewPath)
for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(marker), `preview contains ${marker}`)
}
check(!/https?:\/\//i.test(preview), 'preview has no external dependency')

console.log(`PASS — ${checks}/${checks} pricing journey-proof checks`)
