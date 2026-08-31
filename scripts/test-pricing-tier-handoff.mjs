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

for (const tier of ['starter', 'basic', 'pro']) {
  equal(policy.sanitizePricingTierHandoff(tier), tier, `${tier} is an allowed paid handoff`)
  equal(policy.pricingTierCardId(tier), `pricing-plan-${tier}`, `${tier} has one stable DOM target`)
}
for (const invalid of ['autopilot', 'free', 'creator', 'studio', '', null, 123]) {
  equal(policy.sanitizePricingTierHandoff(invalid), null, `${String(invalid)} fails closed`)
}

equal(
  policy.buildPricingTierHandoffAttribution({ requestedTier: 'basic', intentCampaign: 'checkout_recovery.d10' }),
  {
    version: 'pricing_tier_handoff_v1',
    requested_tier: 'basic',
    intent_campaign: 'checkout_recovery.d10',
  },
  'valid recovery context produces the minimal versioned payload',
)
equal(
  policy.buildPricingTierHandoffAttribution({ requestedTier: 'starter', intentCampaign: 'email@example.com bad' }),
  { version: 'pricing_tier_handoff_v1', requested_tier: 'starter' },
  'unsafe campaign is omitted without dropping a valid tier',
)
equal(
  policy.buildPricingTierHandoffAttribution({ requestedTier: 'autopilot', intentCampaign: null }),
  null,
  'a non-grid product can never target a paid-plan card',
)

const serializedPayload = JSON.stringify(
  policy.buildPricingTierHandoffAttribution({ requestedTier: 'starter', intentCampaign: 'returning_buyer' }),
)
for (const forbidden of ['email', 'prompt', 'script', 'topic', 'session_id', 'user_id', 'promo', 'price']) {
  ok(!new RegExp(`\\b${forbidden}\\b`).test(serializedPayload), `executed handoff payload excludes ${forbidden}`)
}

const storageKey = policy.pricingTierHandoffStorageKey({
  version: 'pricing_tier_handoff_v1',
  requested_tier: 'pro',
  intent_campaign: 'returning_buyer',
})
equal(storageKey, 'kineo:pricing_tier_handoff_v1:pro:returning_buyer', 'dedupe is scoped by version, tier and campaign')

const pricing = source('app/pricing/PricingClient.tsx')
ok(pricing.includes("setRequestedTier(sanitizePricingTierHandoff(params.get('tier')))"), 'live pricing page reads the allow-listed tier')
ok(pricing.includes("trackEvent('pricing_tier_intent_viewed', attribution)"), 'live pricing page emits one named exposure event')
ok(pricing.includes("{ threshold: [0.35] }"), 'exposure requires 35% IntersectionObserver visibility')
ok(pricing.includes("entry.intersectionRatio < 0.35"), 'sub-threshold observations never count')
ok(pricing.includes("sessionStorage.setItem(storageKey, '1')"), 'successful exposure persists session dedupe')
ok(pricing.indexOf("if (!stored) return") < pricing.indexOf("sessionStorage.setItem(storageKey, '1')"), 'failed analytics is never marked as recorded')
ok(pricing.includes("explicitHash && explicitHash !== '#plans'"), 'an explicit deep link is never overridden')
ok(pricing.includes("card.scrollIntoView({ block: 'center', behavior: 'auto' })"), 'requested card becomes the arrival target')
ok(pricing.includes('id={pricingTierCardId(p.tier as PricingTierHandoffTier)}'), 'every paid card exposes its canonical target')
ok(pricing.includes("ring-2 ring-[#62b3ff] ring-offset-4 ring-offset-black"), 'the selected card receives a visible focus without changing price or copy')

const handoffEffect = pricing.slice(
  pricing.indexOf('// KINEO-PRICING-TIER-HANDOFF-2026-08-31'),
  pricing.indexOf('// Keep the geo request for country/region diagnostics.'),
)
ok(handoffEffect.length > 0, 'handoff effect is present before geo resolution')
for (const forbidden of ['checkout.launch', 'handleBuy(', 'window.location.href', '/api/stripe/checkout']) {
  ok(!handoffEffect.includes(forbidden), `handoff never auto-starts payment via ${forbidden}`)
}
// This window checks that the browser effect does not reach for user content.
// Price is asserted against the executed payload above: matching the word in
// the explanatory comment here would test prose, not telemetry behavior.
for (const forbidden of ['email', 'prompt', 'script', 'topic', 'session_id', 'user_id', 'promo']) {
  ok(!new RegExp(`\\b${forbidden}\\b`).test(handoffEffect), `handoff exposure excludes ${forbidden}`)
}

const abandonRecovery = source('app/api/admin/send-abandon-recovery/route.ts')
const freeUpsell = source('app/api/admin/send-free-upsell/route.ts')
ok(abandonRecovery.includes('/pricing?tier=starter'), 'checkout recovery already sends a Starter intent')
ok(abandonRecovery.includes('/pricing?tier=basic'), 'checkout recovery already sends a Creator intent')
ok(freeUpsell.includes('/pricing?tier=starter'), 'free upsell already sends a Starter intent')
ok(freeUpsell.includes('/pricing?tier=basic'), 'free upsell already sends a Creator intent')

const preview = source('docs/previews/PRICING-TIER-HANDOFF-2026-08-31.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `visual comparison includes ${label}`)
}
ok(preview.includes('card target'), 'after states show the exact focus treatment')

console.log(`\n${checks}/${checks} pricing tier-handoff checks passed`)
