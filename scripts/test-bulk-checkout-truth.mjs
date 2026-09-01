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
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

function executeTs(file) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const box = { exports: {} }
  vm.runInNewContext(output, { module: box, exports: box.exports }, { filename: file })
  return box.exports
}

const truth = executeTs('lib/growth/bulkCheckoutTruth.ts')
equal(truth.BULK_CHECKOUT_TRUTH_VERSION, 'bulk_checkout_entitlement_truth_v1', 'cohort version is stable')

const packs = [
  { id: 'bulk10', videos: 10, credits: 12 },
  { id: 'bulk20', videos: 20, credits: 24 },
  { id: 'bulk30', videos: 30, credits: 36 },
  { id: 'bulk50', videos: 50, credits: 60 },
]

for (const pack of packs) {
  const description = truth.bulkCheckoutDescription(pack)
  check(description.includes(`${pack.credits} universal credits`), `${pack.id}: exact entitlement is visible`)
  check(description.includes(`${pack.videos} Kineo 1 Fast Shorts`), `${pack.id}: selected outcome stays visible`)
  check(description.includes('you create and download in Kineo'), `${pack.id}: buyer action is explicit`)
  check(description.includes('One-time purchase'), `${pack.id}: purchase mode is explicit`)
  check(description.includes('No subscription'), `${pack.id}: no recurring charge is explicit`)
  check(description.includes('Credits never expire'), `${pack.id}: expiry truth is preserved`)
  check(!/ready-to-post/i.test(description), `${pack.id}: no finished-delivery claim remains`)
  check(description.length <= 500, `${pack.id}: Stripe description limit is respected`)
}

for (const pack of [
  { videos: 0, credits: 12 },
  { videos: 10.5, credits: 12 },
  { videos: 10, credits: 9 },
  { videos: 10, credits: Number.NaN },
]) {
  assert.throws(() => truth.bulkCheckoutDescription(pack))
  checks += 1
}

equal(
  truth.readBulkCheckoutTruthVersion('bulk_checkout_entitlement_truth_v1'),
  'bulk_checkout_entitlement_truth_v1',
  'webhook accepts the exact bounded version',
)
for (const value of [undefined, null, '', 'bulk_checkout_entitlement_truth_v2', 'arbitrary']) {
  equal(truth.readBulkCheckoutTruthVersion(value), null, `${String(value)}: webhook rejects unknown version`)
}

const checkout = read('app/api/stripe/checkout/route.ts')
const bulkStart = checkout.indexOf('async function buildBulkPackAndRedirect(')
const bulkEnd = checkout.indexOf('// KINEO-AVATAR-PACKS-RETIRED', bulkStart)
const bulkBlock = checkout.slice(bulkStart, bulkEnd)
check(bulkStart > 0 && bulkEnd > bulkStart, 'live bulk checkout block is located')
check(bulkBlock.includes('description: bulkCheckoutDescription(pack)'), 'live Stripe line executes the shared truth helper')
check((bulkBlock.match(/bulk_checkout_truth_version: BULK_CHECKOUT_TRUTH_VERSION/g) ?? []).length === 2, 'events and Stripe Session carry the same version')
check(bulkBlock.includes("mode: 'payment'"), 'one-time payment mode is unchanged')
check(bulkBlock.includes('unit_amount: unitAmount'), 'canonical price is unchanged')
check(bulkBlock.includes('pack_credits: String(pack.credits)'), 'canonical grant is unchanged')
check(bulkBlock.includes('contract_version: BULK_CHECKOUT_TRUTH_VERSION'), 'changed Stripe parameters rotate the bounded idempotency signature')
check(!/ready-to-post vertical Shorts/i.test(bulkBlock), 'contradictory finished-delivery copy is absent from live bulk checkout')
check(!/payment_method_types\s*:/.test(bulkBlock.replace(/\/\/.*$/gm, '')), 'dynamic payment methods remain untouched')

const webhook = read('app/api/stripe/webhook/route.ts')
check(webhook.includes("import { readBulkCheckoutTruthVersion } from '@/lib/growth/bulkCheckoutTruth'"), 'webhook imports the bounded reader')
check(webhook.includes('bulk_checkout_truth_version: readBulkCheckoutTruthVersion('), 'completed purchase preserves the bounded cohort')
check(webhook.includes('credits_granted: args.credits'), 'completed event still records the actual grant')

const previewPath = 'docs/previews/B2B-BULK-CHECKOUT-TRUTH-V1-2026-08-31.html'
check(fs.existsSync(path.join(root, previewPath)), 'before/after preview exists')
const preview = read(previewPath)
for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(marker), `preview contains ${marker}`)
}
check(preview.includes('ready-to-post vertical Shorts'), 'preview preserves the before-state contradiction')
check(preview.includes('universal credits'), 'preview displays the truthful entitlement')
check(!/https?:\/\//i.test(preview), 'preview has no external dependency')

console.log(`PASS — ${checks}/${checks} bulk checkout-truth checks`)
