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

const policy = loadTs('lib/growth/pricingPlanChoiceAttribution.ts')
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }
const ok = (value, message) => { assert.ok(value, message); checks += 1 }

equal(
  policy.buildPricingPlanChoiceAttribution({ tier: 'starter', billing: 'monthly', intentCampaign: 'pricing_journey_proof_v1' }),
  { version: 'pricing_plan_choice_attribution_v1', tier: 'starter', billing: 'monthly', intent_campaign: 'pricing_journey_proof_v1' },
  'Starter monthly keeps the validated campaign and stable version',
)
equal(
  policy.buildPricingPlanChoiceAttribution({ tier: 'pro', billing: 'annual', intentCampaign: ' seo.source-1~x ' }),
  { version: 'pricing_plan_choice_attribution_v1', tier: 'pro', billing: 'annual', intent_campaign: 'seo.source-1~x' },
  'annual Studio keeps an allow-listed campaign',
)
equal(
  policy.buildPricingPlanChoiceAttribution({ tier: 'autopilot', billing: 'annual', intentCampaign: null }),
  { version: 'pricing_plan_choice_attribution_v1', tier: 'autopilot', billing: 'monthly' },
  'Autopilot is always measured as monthly because it has no annual SKU',
)
equal(
  policy.buildPricingPlanChoiceAttribution({ tier: 'basic', billing: 'monthly', intentCampaign: 'bad campaign/email@example.com' }),
  { version: 'pricing_plan_choice_attribution_v1', tier: 'basic', billing: 'monthly' },
  'invalid campaign is omitted without dropping the plan click',
)
equal(policy.buildPricingPlanChoiceAttribution({ tier: 'enterprise', billing: 'monthly', intentCampaign: null }), null, 'unknown tier fails closed')
equal(policy.buildPricingPlanChoiceAttribution({ tier: 'starter', billing: 'weekly', intentCampaign: null }), null, 'unknown billing fails closed')
equal(policy.sanitizePricingIntentCampaign('a'.repeat(100)), 'a'.repeat(100), '100-character campaign is accepted')
equal(policy.sanitizePricingIntentCampaign('a'.repeat(101)), null, '101-character campaign is rejected')
equal(policy.sanitizePricingIntentCampaign(''), null, 'empty campaign is rejected')
equal(policy.sanitizePricingIntentCampaign('hello world'), null, 'space-bearing campaign is rejected')

const pricing = source('app/pricing/PricingClient.tsx')
// The integrated Windows worktree can expose CRLF even when the source commit
// used LF. Verify the imported module and symbols instead of line endings.
const policyImport = pricing.match(
  /import\s*\{([^}]*)\}\s*from ['"]@\/lib\/growth\/pricingPlanChoiceAttribution['"]/,
)
ok(policyImport, 'live pricing page imports the policy module')
ok(policyImport?.[1].includes('buildPricingPlanChoiceAttribution'), 'live pricing imports the plan-choice builder')
ok(policyImport?.[1].includes('sanitizePricingIntentCampaign'), 'live pricing imports the campaign sanitizer')
ok(pricing.includes("sanitizePricingIntentCampaign(params.get('intent_campaign'))"), 'pricing view and checkout share campaign validation')
ok(pricing.includes('const attribution = buildPricingPlanChoiceAttribution({'), 'live plan choice builds versioned attribution')
ok(pricing.includes('trackPricingEvent(eventName, attribution ?? undefined)'), 'existing click event receives attribution without a duplicate event')
ok(!pricing.includes("trackEvent('pricing_plan_choice_attribution_v1'"), 'version is metadata, never a duplicate event')

const eventWindow = pricing.slice(
  pricing.indexOf('const attribution = buildPricingPlanChoiceAttribution({'),
  pricing.indexOf('const attribution = buildPricingPlanChoiceAttribution({') + 420,
)
for (const forbidden of ['email', 'prompt', 'script', 'topic', 'session_id', 'user_id', 'promo']) {
  ok(!new RegExp(`\\b${forbidden}\\b`).test(eventWindow), `plan-choice attribution excludes ${forbidden}`)
}

ok(pricing.indexOf('const started = checkout.launch(') < pricing.indexOf('const attribution = buildPricingPlanChoiceAttribution({'), 'suppressed duplicate checkout clicks are never counted')
ok(pricing.indexOf('if (!started) return') < pricing.indexOf('trackPricingEvent(eventName, attribution ?? undefined)'), 'only a launched checkout emits the click event')

console.log(`\n${checks}/${checks} pricing plan-choice attribution checks passed`)
