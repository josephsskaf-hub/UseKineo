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

const output = ts.transpileModule(read('lib/growth/checkoutVisualProof.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(output, {
  module: moduleBox,
  exports: moduleBox.exports,
  require: (id) => {
    if (id === '@/lib/brandIdentity') {
      return { BRAND_URL: 'https://www.usekineo.com' }
    }
    throw new Error(`unmocked import: ${id}`)
  },
}, { filename: 'lib/growth/checkoutVisualProof.ts' })

const proof = moduleBox.exports
equal(proof.CHECKOUT_VISUAL_PROOF_VERSION, 'checkout_visual_proof_v2', 'experiment has a stable version')
equal(proof.CHECKOUT_VISUAL_PROOF.imageUrl, 'https://www.usekineo.com/icon-512.png', 'Stripe receives the canonical square app icon')
check(proof.CHECKOUT_VISUAL_PROOF.imageUrl.startsWith('https://'), 'image is fetchable over HTTPS')
check(!/[?&](token|signature|expires)=/i.test(proof.CHECKOUT_VISUAL_PROOF.imageUrl), 'image URL has no signed secret')

const route = read('app/api/stripe/checkout/route.ts')
check(route.includes("import { CHECKOUT_VISUAL_PROOF } from '@/lib/growth/checkoutVisualProof'"), 'live checkout imports the policy')
check(route.includes('images: [CHECKOUT_VISUAL_PROOF.imageUrl]'), 'inline subscription product sends the image to Stripe')
check((route.match(/checkout_visual_proof: CHECKOUT_VISUAL_PROOF\.version/g) ?? []).length >= 3, 'version reaches event, Session and Subscription metadata')
check(route.includes('line_items: sessionParams.line_items'), 'existing idempotency signature includes the visual change')
check(!route.includes('customer_video_url: CHECKOUT_VISUAL_PROOF'), 'policy cannot confuse brand proof with customer media')

const webhook = read('app/api/stripe/webhook/route.ts')
check(webhook.includes('checkout_visual_proof: session.metadata?.checkout_visual_proof ?? null'), 'payment success retains experiment attribution')

const previewPath = 'docs/previews/CHECKOUT-VISUAL-PROOF-2026-08-29.html'
check(fs.existsSync(path.join(root, previewPath)), 'before/after preview exists')
const preview = read(previewPath)
for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(marker), `preview contains ${marker}`)
}
check(!/<script/i.test(preview), 'preview is static')
check(!/src=["']https?:/i.test(preview), 'preview has no external visual dependency')

console.log(`PASS — ${checks}/${checks} checkout visual-proof checks`)
