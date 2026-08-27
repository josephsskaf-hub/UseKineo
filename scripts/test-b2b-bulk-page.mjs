#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')

function source(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function loadTs(rel, mocks = {}) {
  const filename = join(root, rel)
  const output = ts.transpileModule(source(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${rel} imported unexpected module: ${id}`)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', { '@/lib/credits/engineCost': engine })
const checkout = loadTs('lib/checkoutPricing.ts', {
  '@/lib/credits/engineCost': engine,
  '@/lib/autopilot/config': autopilot,
})

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(checkout.BULK_PACK_IDS, ['bulk10', 'bulk20', 'bulk30', 'bulk50'], 'four approved pack ids execute')
equal(checkout.BULK_PACKS.bulk10, { videos: 10, usdMinor: 9900, credits: 12 }, '10-pack contract executes')
equal(checkout.BULK_PACKS.bulk20, { videos: 20, usdMinor: 17900, credits: 24 }, '20-pack contract executes')
equal(checkout.BULK_PACKS.bulk30, { videos: 30, usdMinor: 24900, credits: 36 }, '30-pack contract executes')
equal(checkout.BULK_PACKS.bulk50, { videos: 50, usdMinor: 37900, credits: 60 }, '50-pack contract executes')

const unitPrices = checkout.BULK_PACK_IDS.map((id) => {
  const pack = checkout.BULK_PACKS[id]
  return pack.usdMinor / pack.videos
})
ok(unitPrices.every((value, index) => index === 0 || value < unitPrices[index - 1]), 'larger packs always lower unit price')
ok(checkout.BULK_PACK_IDS.every((id) => checkout.BULK_PACKS[id].credits > checkout.BULK_PACKS[id].videos), 'every pack retains operating headroom')

const page = source('app/ai-shorts-for-agencies/page.tsx')
const client = source('app/ai-shorts-for-agencies/AgencyPacksClient.tsx')
const checkoutRoute = source('app/api/stripe/checkout/route.ts')
const webhook = source('app/api/stripe/webhook/route.ts')
const sitemap = source('app/sitemap.ts')
const footer = source('components/Footer.tsx')
const llms = source('app/llms.txt/route.ts')
const funnel = source('app/api/admin/funnel/route.ts')

ok(page.includes('BULK_PACK_IDS.map'), 'server page derives every card from canonical pack ids')
ok(page.includes("formatCheckoutMoney('usd', pack.usdMinor)"), 'server page derives displayed price from canonical pack amount')
ok(!/\$\s*(99|179|249|379)(?!\d)/.test(page), 'page contains no duplicated commercial price literal')
ok(client.includes('href={`/api/stripe/checkout?pack=${pack.id}`}'), 'each CTA enters the existing safe bulk checkout')
ok(client.includes('agency_bulk_page_viewed'), 'page view has a named event')
ok(client.includes('agency_bulk_pack_clicked'), 'pack choice has a named event')
ok(client.includes('sessionStorage.getItem(VIEW_MARKER)'), 'page impression dedupes within the browser session')
ok(client.includes('premium generative engines use more credits per video'), 'credit universality cannot overpromise the Fast count')
ok(page.includes('not team seats, approval routing, a client portal or white-label software') || page.includes('team seats, separate client workspaces, approval routing or a white-label portal'), 'missing B2B features are disclosed')
ok(page.includes('Commercial use is included'), 'commercial delivery is stated')
ok(checkoutRoute.indexOf('if (isBulkPackId(packParam))') < checkoutRoute.indexOf('return await buildPackAndRedirect(req, true)'), 'bulk routing executes before the legacy pack fallback')
ok(checkoutRoute.includes("pack: bulkId"), 'checkout keeps exact pack metadata')
ok(checkoutRoute.includes("'bulk_checkout_started'"), 'server confirms bulk checkout start')
ok(webhook.includes('isBulkPackId(packMeta)'), 'webhook recognizes the canonical pack id')
ok(webhook.includes('bulkPack.credits'), 'webhook grants canonical pack credits')
ok(sitemap.includes("path: '/ai-shorts-for-agencies'"), 'B2B page is indexable in sitemap')
ok(footer.includes("href: '/ai-shorts-for-agencies'"), 'B2B page is not orphaned')
ok(llms.includes('## One-time packs for agencies, freelancers and businesses'), 'answer engines receive the B2B offer')
ok(llms.includes('BULK_PACK_IDS.map'), 'answer-engine pack list derives from canonical data')
ok(funnel.includes("agency_bulk_page_viewed: uniqueCheckoutActors('agency_bulk_page_viewed')"), 'admin counts page viewers as actors')
ok(funnel.includes("agency_bulk_pack_clicked: uniqueCheckoutActors('agency_bulk_pack_clicked')"), 'admin counts pack selectors as actors')
ok(funnel.includes("bulk_checkout_started: uniqueCheckoutActors('bulk_checkout_started')"), 'admin counts checkout starts as actors')

console.log(`b2b bulk page: ${checks}/${checks} checks passed`)
