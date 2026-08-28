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

const contract = loadTs('lib/growth/agencyCheckoutReturn.ts')
const packIds = ['bulk10', 'bulk20', 'bulk30', 'bulk50']
for (const packId of packIds) {
  equal(contract.isAgencyCheckoutPackId(packId), true, `${packId}: allowlisted`)
  const cancelUrl = new URL(contract.buildAgencyCheckoutCancelUrl('https://www.usekineo.com', packId))
  equal(cancelUrl.origin, 'https://www.usekineo.com', `${packId}: canonical origin preserved`)
  equal(cancelUrl.pathname, '/ai-shorts-for-agencies', `${packId}: returns to B2B page`)
  equal(cancelUrl.searchParams.get('checkout'), 'cancelled', `${packId}: cancellation state preserved`)
  equal(cancelUrl.searchParams.get('pack'), packId, `${packId}: exact SKU preserved`)
  equal(cancelUrl.hash, '#agency-pack-heading', `${packId}: pack shelf is the destination`)
  equal(contract.agencyCheckoutResumeHref(packId), `/api/stripe/checkout?pack=${packId}`, `${packId}: resumes exact SKU`)
  equal(
    contract.readAgencyCheckoutReturn(`?checkout=cancelled&pack=${packId}`)?.packId,
    packId,
    `${packId}: public return parses`,
  )
}

for (const value of ['', 'bulk', 'bulk99', 'starter', 'autopilot_pilot', '../bulk30', 'bulk30%00']) {
  equal(contract.isAgencyCheckoutPackId(value), false, `${value || 'blank'}: rejected`)
  equal(contract.readAgencyCheckoutReturn(`?checkout=cancelled&pack=${encodeURIComponent(value)}`), null, `${value || 'blank'}: cannot render recovery`)
  equal(contract.agencyCheckoutResumeHref(value), '/ai-shorts-for-agencies#agency-pack-heading', `${value || 'blank'}: cannot enter checkout`)
}
assert.throws(
  () => contract.buildAgencyCheckoutCancelUrl('https://www.usekineo.com', 'bulk99'),
  /invalid_agency_checkout_pack/,
)
checks += 1
equal(contract.readAgencyCheckoutReturn('?checkout=complete&pack=bulk30'), null, 'non-cancelled state is ignored')
equal(contract.readAgencyCheckoutReturn('?pack=bulk30'), null, 'missing state is ignored')

const checkout = read('app/api/stripe/checkout/route.ts')
const bulkStart = checkout.indexOf('async function buildBulkPackAndRedirect(')
const bulkEnd = checkout.indexOf('// KINEO-AVATAR-PACKS-RETIRED', bulkStart)
const bulkBlock = checkout.slice(bulkStart, bulkEnd)
ok(bulkStart > 0 && bulkEnd > bulkStart, 'bulk checkout block located')
ok(bulkBlock.includes('cancel_url: buildAgencyCheckoutCancelUrl(appUrl, bulkId)'), 'Stripe cancellation uses the allowlisted return builder')
ok(!bulkBlock.includes('cancel_url: `${appUrl}/pricing`'), 'bulk cancellation no longer leaks into generic pricing')
ok(bulkBlock.includes("mode: 'payment'"), 'one-time payment mode is unchanged')
ok(bulkBlock.includes('unit_amount: unitAmount'), 'canonical amount is unchanged')
ok(bulkBlock.includes('pack: bulkId'), 'Stripe metadata still preserves the exact pack')
ok(bulkBlock.includes("'bulk_checkout_started'"), 'named B2B checkout event is unchanged')

const client = read('app/ai-shorts-for-agencies/AgencyPacksClient.tsx')
ok(client.includes('readAgencyCheckoutReturn(window.location.search)'), 'client reads the bounded return contract')
ok(client.includes('Checkout closed · nothing was charged'), 'return copy states the financial boundary')
ok(client.includes('agency_bulk_checkout_cancelled_return_viewed'), 'return view is measurable')
ok(client.includes('agency_bulk_checkout_resume_clicked'), 'resume click is measurable')
ok(client.includes('agencyCheckoutResumeHref(cancelledPack.id)'), 'resume CTA uses the allowlisted builder')
ok(client.includes('setCancelledPackId(null)'), 'buyer can dismiss and keep comparing')

const preview = read('docs/previews/AGENCY-CHECKOUT-RETURN-2026-08-28.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview includes ${label}`)
}
ok(preview.includes('Generic subscription pricing'), 'preview shows the old destination')
ok(preview.includes('Your 30-video pack is still selected'), 'preview shows selection continuity')

console.log(`Agency checkout return: ${checks}/${checks} checks passed`)
