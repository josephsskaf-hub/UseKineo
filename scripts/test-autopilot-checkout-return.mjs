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
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

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

const contract = loadTs('lib/growth/autopilotCheckoutReturn.ts')
const params = (search) => new URLSearchParams(search)

equal(contract.readAutopilotCheckoutReturn(params('tier=autopilot')).kind, 'monthly', 'monthly Autopilot is recognized')
equal(contract.readAutopilotCheckoutReturn(params('tier=autopilot')).selection, 'autopilot', 'monthly selection is preserved')
equal(
  contract.readAutopilotCheckoutReturn(params('tier=autopilot&billing=annual')).retryHref,
  '/api/stripe/checkout?tier=autopilot',
  'invalid annual input cannot change monthly-only Autopilot',
)
equal(contract.readAutopilotCheckoutReturn(params('pack=autopilot_pilot')).kind, 'pilot', 'one-time pilot is recognized')
equal(contract.readAutopilotCheckoutReturn(params('pack=autopilot_pilot')).selection, 'autopilot_pilot', 'pilot selection is preserved')
equal(
  contract.readAutopilotCheckoutReturn(params('pack=autopilot_pilot')).retryHref,
  '/api/stripe/checkout?pack=autopilot_pilot',
  'pilot retries the exact one-time SKU',
)
equal(contract.readAutopilotCheckoutReturn(params('tier=basic')), null, 'self-serve Creator stays in the existing flow')
equal(contract.readAutopilotCheckoutReturn(params('pack=bulk30')), null, 'other one-time packs stay in their own flow')
equal(contract.readAutopilotCheckoutReturn(params('tier=AUTOPILOT')), null, 'tier parsing is allowlisted, not normalized loosely')

const pilotCancel = new URL(contract.buildAutopilotPilotCancelUrl('https://www.usekineo.com'))
equal(pilotCancel.origin, 'https://www.usekineo.com', 'production origin is preserved')
equal(pilotCancel.pathname, '/checkout/cancelled', 'pilot returns to the objection handler')
equal(pilotCancel.searchParams.get('pack'), 'autopilot_pilot', 'pilot return preserves exact SKU')
equal([...pilotCancel.searchParams.keys()].length, 1, 'pilot return cannot inherit unrelated pricing state')

const route = read('app/api/stripe/checkout/route.ts')
const pilotStart = route.indexOf('async function buildAutopilotPilotAndRedirect(')
const pilotEnd = route.indexOf('// ─── KINEO-BULK', pilotStart)
const pilotBlock = route.slice(pilotStart, pilotEnd)
ok(pilotStart > 0 && pilotEnd > pilotStart, 'pilot checkout block located')
ok(pilotBlock.includes('cancel_url: buildAutopilotPilotCancelUrl(appUrl)'), 'Stripe pilot cancellation uses exact return builder')
ok(!pilotBlock.includes('cancel_url: `${appUrl}/pricing`'), 'pilot cancellation no longer loses product context')
ok(pilotBlock.includes("mode: 'payment'"), 'pilot remains a one-time payment')
ok(pilotBlock.includes("pack: 'autopilot_pilot'"), 'pilot webhook metadata remains unchanged')

const page = read('app/checkout/cancelled/page.tsx')
ok(page.includes('readAutopilotCheckoutReturn(searchParams)'), 'cancelled page reads bounded Autopilot context')
ok(page.includes("? 'Autopilot Pilot'"), 'pilot name is rendered explicitly')
ok(page.includes("? 'Autopilot'"), 'monthly Autopilot name is rendered explicitly')
ok(page.includes('monthlyPriceMinor(tier, checkoutCurrency, priceRegion)'), 'monthly price comes from canonical pricing')
ok(page.includes('AUTOPILOT_PILOT_PRICES[checkoutCurrency]'), 'pilot price comes from canonical pricing')
ok(page.includes("checkout.launch(checkoutSelection, retryHref"), 'primary CTA retries exact product')
ok(page.includes("'autopilot_cancelled_pilot_clicked'"), 'monthly price objection can step down to pilot')
ok(page.includes("'autopilot_pilot_self_serve_clicked'"), 'pilot price objection has a measurable self-serve exit')
ok(page.includes('Secure Stripe checkout · one-time payment · no auto-renew'), 'pilot never inherits subscription reassurance')
ok(page.includes("href=\"/pricing#autopilot\""), 'Autopilot comparison returns to the exact pricing section')
ok(!page.includes("const tier: 'starter' | 'basic' | 'pro'"), 'old three-tier coercion is gone')

const preview = read('docs/previews/AUTOPILOT-CHECKOUT-RECOVERY-2026-08-28.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview includes ${label}`)
}
ok(preview.includes('Creator — $15.00/month'), 'preview exposes the previous wrong-product state')
ok(preview.includes('Autopilot — $299.00/month'), 'preview shows monthly product continuity')
ok(preview.includes('Autopilot Pilot — $99.00 once'), 'preview shows pilot product continuity')

console.log(`Autopilot checkout return: ${checks}/${checks} checks passed`)
