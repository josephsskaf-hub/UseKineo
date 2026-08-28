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
const margin = loadTs('lib/agencyMargin.ts')

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(margin.AGENCY_MARKETPLACE_FEE_OPTIONS, [0, 10, 15, 20], 'fee selector covers direct, Upwork-range and Fiverr-style scenarios')
equal(margin.DEFAULT_AGENCY_CLIENT_PRICE_MINOR, 2500, 'illustrative client rate is explicit and separate from Kineo pricing')
equal(margin.DEFAULT_AGENCY_MARKETPLACE_FEE_PCT, 20, 'illustrative marketplace fee is explicit')

const scenario = margin.calculateAgencyMargin({
  videos: checkout.BULK_PACKS.bulk30.videos,
  packCostMinor: checkout.BULK_PACKS.bulk30.usdMinor,
  clientPriceMinor: 2500,
  marketplaceFeePct: 20,
})
equal(scenario.clientRevenueMinor, 75000, '30 x $25 client revenue executes')
equal(scenario.marketplaceFeeMinor, 15000, '20% marketplace fee executes')
equal(scenario.netRevenueMinor, 60000, 'net marketplace revenue executes')
equal(scenario.cashAfterKineoMinor, 35100, 'cash left after canonical Kineo pack executes')
equal(scenario.grossCashMarginPct, 58.5, 'gross cash margin is based on net marketplace revenue')
equal(scenario.breakEvenClientPriceMinor, 1038, 'break-even client price rounds upward to the cent')

const direct = margin.calculateAgencyMargin({ videos: 10, packCostMinor: 9900, clientPriceMinor: 1500, marketplaceFeePct: 0 })
equal(direct.marketplaceFeeMinor, 0, 'direct client scenario has no marketplace fee')
equal(direct.cashAfterKineoMinor, 5100, 'direct client scenario subtracts only production')
equal(direct.breakEvenClientPriceMinor, 990, 'direct break-even equals canonical unit cost')

const loss = margin.calculateAgencyMargin({ videos: 10, packCostMinor: 9900, clientPriceMinor: 500, marketplaceFeePct: 20 })
equal(loss.cashAfterKineoMinor, -5900, 'underpriced client scenario remains negative instead of being hidden')
equal(loss.grossCashMarginPct, -147.5, 'negative cash margin remains honest')

const sanitized = margin.calculateAgencyMargin({ videos: 0, packCostMinor: -1, clientPriceMinor: Number.NaN, marketplaceFeePct: 120 })
equal(sanitized.clientRevenueMinor, 0, 'invalid client price fails closed to zero')
equal(sanitized.marketplaceFeeMinor, 0, 'invalid scenario cannot invent a fee')
equal(sanitized.breakEvenClientPriceMinor, 0, 'zero cost remains zero at clamped fee')

for (const id of checkout.BULK_PACK_IDS) {
  const pack = checkout.BULK_PACKS[id]
  const result = margin.calculateAgencyMargin({
    videos: pack.videos,
    packCostMinor: pack.usdMinor,
    clientPriceMinor: 2500,
    marketplaceFeePct: 20,
  })
  equal(result.clientRevenueMinor, pack.videos * 2500, `${id} uses canonical video count`)
  equal(result.cashAfterKineoMinor, result.netRevenueMinor - pack.usdMinor, `${id} uses canonical pack cost`)
  ok(result.breakEvenClientPriceMinor > 0, `${id} exposes a positive break-even rate`)
}

const page = source('app/ai-shorts-for-agencies/page.tsx')
const calculator = source('app/ai-shorts-for-agencies/AgencyMarginCalculator.tsx')
const packs = source('app/ai-shorts-for-agencies/AgencyPacksClient.tsx')
const funnel = source('app/api/admin/funnel/route.ts')
const admin = source('app/(dashboard)/admin/funnel/FunnelClient.tsx')

ok(page.includes('<AgencyMarginCalculator packs={PACKS} />'), 'server page calls the calculator with canonical pack views')
ok(page.indexOf('<AgencyMarginCalculator packs={PACKS} />') < page.indexOf('<AgencyPacksClient packs={PACKS} />'), 'calculator appears before the buyable pack grid')
ok(calculator.includes("from '@/lib/agencyMargin'"), 'calculator executes the pure policy module')
ok(calculator.includes('calculateAgencyMargin({'), 'calculator executes margin arithmetic')
ok(calculator.includes('before your labor, revisions, taxes and other costs'), 'calculator states the cost boundary before results')
ok(calculator.includes('This is arithmetic, not an earnings forecast'), 'calculator refuses an earnings promise')
ok(calculator.includes('agency_margin_calculator_viewed'), 'calculator impression has a named event')
ok(calculator.includes('sessionStorage.getItem(VIEW_MARKER)'), 'calculator impression dedupes per browser session')
ok(calculator.includes('agency_margin_pack_selected'), 'calculator-to-pack intent has a named event')
ok(calculator.includes('client_price_minor'), 'intent event preserves the chosen scenario without free text')
ok(calculator.includes('marketplace_fee_pct'), 'intent event preserves the fee scenario')
ok(packs.includes('id={`pack-${pack.id}`}'), 'calculator CTA lands on the exact canonical pack')
ok(funnel.includes("agency_margin_calculator_viewed: uniqueCheckoutActors('agency_margin_calculator_viewed')"), 'admin API counts calculator viewers as actors')
ok(funnel.includes("agency_margin_pack_selected: uniqueCheckoutActors('agency_margin_pack_selected')"), 'admin API counts calculator-to-pack intent as actors')
ok(admin.includes('B2B agency funnel'), 'admin UI exposes the B2B funnel')
ok(admin.includes('data.counts.agency_margin_calculator_viewed'), 'admin UI renders calculator viewers')
ok(admin.includes('data.counts.agency_margin_pack_selected'), 'admin UI renders calculator-to-pack actors')

console.log(`b2b margin calculator: ${checks}/${checks} checks passed`)
