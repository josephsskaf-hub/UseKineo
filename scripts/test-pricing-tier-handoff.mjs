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

const output = ts.transpileModule(read('lib/growth/pricingTierHandoff.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const box = { exports: {} }
vm.runInNewContext(output, { module: box, exports: box.exports }, { filename: 'pricingTierHandoff.ts' })
const policy = box.exports

equal(policy.PRICING_TIER_HANDOFF_VERSION, 'pricing_tier_handoff_v1', 'version is stable')
equal(policy.PRICING_TIER_HANDOFF_TIERS, ['starter', 'basic', 'pro'], 'only the three self-serve tiers are accepted')

for (const tier of ['starter', 'basic', 'pro']) {
  equal(policy.sanitizePricingTierHandoff(tier), tier, `${tier} survives sanitization`)
  equal(policy.pricingTierCardId(tier), `pricing-plan-${tier}`, `${tier} has deterministic card id`)
}
for (const invalid of [null, undefined, '', 'free', 'autopilot', 'starter ', 'STARTER', 'starter<script>']) {
  equal(policy.sanitizePricingTierHandoff(invalid), null, `invalid tier ${String(invalid)} fails closed`)
}

equal(
  policy.buildPricingTierHandoffAttribution({ requestedTier: 'starter', intentCampaign: 'hotlead_stalled' }),
  { version: 'pricing_tier_handoff_v1', requested_tier: 'starter', intent_campaign: 'hotlead_stalled' },
  'valid tier and campaign produce bounded attribution',
)
equal(
  policy.buildPricingTierHandoffAttribution({ requestedTier: 'basic', intentCampaign: ' bad campaign ' }),
  { version: 'pricing_tier_handoff_v1', requested_tier: 'basic' },
  'invalid campaign is dropped without dropping the tier',
)
equal(
  policy.buildPricingTierHandoffAttribution({ requestedTier: 'autopilot', intentCampaign: 'x' }),
  null,
  'unsupported product never manufactures a handoff',
)
equal(
  policy.pricingTierHandoffStorageKey({ version: 'pricing_tier_handoff_v1', requested_tier: 'pro' }),
  'kineo:pricing_tier_handoff_v1:pro:direct',
  'direct exposure has a deterministic dedupe key',
)

const pricing = read('app/pricing/PricingClient.tsx')
for (const anchor of [
  "sanitizePricingTierHandoff(params.get('tier'))",
  "trackEvent('pricing_tier_intent_viewed', attribution)",
  'entry.intersectionRatio < 0.35',
  'sessionStorage.getItem(storageKey)',
  "explicitHash !== '#plans'",
  "card.scrollIntoView({ block: 'center', behavior: 'auto' })",
  'data-pricing-tier-requested',
  'Your choice',
]) check(pricing.includes(anchor), `live pricing contains ${anchor}`)

check(!pricing.includes("window.location.href = '/api/stripe/checkout?tier=' + requestedTier"), 'handoff never auto-opens checkout')
check(pricing.indexOf('const [requestedTier') < pricing.indexOf("trackEvent('pricing_tier_intent_viewed'"), 'state is established before telemetry')
check(pricing.indexOf('id={isPaid ? pricingTierCardId') < pricing.indexOf('Your choice'), 'caller marks the real card before labeling it')

const callers = [
  'app/api/admin/send-hotlead-blast/route.ts',
  'app/api/admin/send-abandon-recovery/route.ts',
  'app/api/admin/send-free-upsell/route.ts',
].map(read).join('\n')
for (const tier of ['starter', 'basic']) check(callers.includes(`/pricing?tier=${tier}`), `live recovery links request ${tier}`)

const previewPath = 'docs/previews/PRICING-TIER-HANDOFF-V1-2026-08-31.html'
check(fs.existsSync(path.join(root, previewPath)), 'visual comparison exists')
const preview = read(previewPath)
for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(marker), `preview contains ${marker}`)
}
check(!/https?:\/\//i.test(preview), 'preview has no external dependency')

console.log(`PASS — ${checks}/${checks} pricing tier handoff checks`)
