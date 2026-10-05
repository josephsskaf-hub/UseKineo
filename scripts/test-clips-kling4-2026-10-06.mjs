import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const FILE = 'lib/clips/clipKling4.ts'
const raw = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
function loader(mutation, enabled = false) {
  return createOfflineLoader({ source: (file, text) => {
    if (file !== FILE) return text
    if (mutation) text = text.replace(mutation[0], mutation[1])
    return enabled ? text.replace('KLING4_CLIPS_ENABLED = false', 'KLING4_CLIPS_ENABLED = true') : text
  } })
}
// Synthetic facts ONLY inside this offline guardian. This model/cost is not a fal claim.
const fixture = {
  provider: 'fal', modelId: 'test-fixture/not-a-real-model', falUsdPerSecond: 0.08,
  falModelSource: 'https://fal.ai/models/test-fixture/not-a-real-model',
  falCostSource: 'https://fal.ai/models/test-fixture/not-a-real-model/api',
  verifiedOn: '2026-10-05', schemaReviewed: true, dispatchReviewed: true,
  marketUsdPerSecond: 0.32, marketSource: 'https://example.test/fixture',
  sameModelResolutionAndAudio: true, samePriceShelf: true,
}
function check(mutation) {
  const load = loader(mutation), k4 = load(FILE), catalog = load('lib/clips/clipCatalog.ts')
  const prices = load('lib/clips/clipPricing.ts'), market = load('lib/clips/clipPriceVsMarket.ts')
  assert.equal(k4.KLING4_CLIPS_ENABLED, false)
  assert.equal(catalog.PREPARED_CLIP_ENGINES.kling4.enabled, false)
  assert.equal(k4.KLING4_FACTS.modelId, null)
  assert.equal(k4.KLING4_FACTS.falUsdPerSecond, null)
  assert.equal(catalog.isClipEngineKey('kling4'), false)
  assert.equal(catalog.CLIP_ENGINE_ORDER.includes('kling4'), false)
  assert.equal(catalog.CLIP_ENGINES.kling4, undefined)
  assert.equal(catalog.validateClipRequest({ engine: 'kling4', seconds: 5, prompt: 'A tree', imageUrl: null }, { userId: 'fixture', supabaseUrl: 'https://example.test' }).ok, false)
  assert.throws(() => k4.assertKling4Launch(true), /real_model_id/)
  assert.throws(() => k4.quotePreparedKling4(5), /real_fal_cost/)
  assert.doesNotThrow(() => k4.assertKling4Launch(false))
  assert.doesNotThrow(() => k4.assertKling4Launch(true, fixture))
  for (const invalid of [
    { modelId: null }, { falUsdPerSecond: null }, { falUsdPerSecond: 0 }, { falUsdPerSecond: -1 },
    { falUsdPerSecond: NaN }, { falUsdPerSecond: Infinity }, { provider: 'reseller' },
    { falModelSource: 'https://fal.ai.evil.test/models/test-fixture/not-a-real-model' },
    { falCostSource: 'https://fal.ai/models/another/model' }, { falCostSource: null },
    { verifiedOn: null }, { verifiedOn: 'not-a-date' }, { schemaReviewed: false }, { dispatchReviewed: false },
    { marketUsdPerSecond: null }, { marketSource: null }, { sameModelResolutionAndAudio: false }, { samePriceShelf: false },
  ]) assert.throws(() => k4.assertKling4Launch(true, { ...fixture, ...invalid }), undefined, JSON.stringify(invalid))
  for (const seconds of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => k4.quotePreparedKling4(seconds, fixture))
  for (const falUsdPerSecond of [0.01, 0.08, 0.17, 0.4, 1.2]) {
    for (const marketUsdPerSecond of [0.05, 0.2, 0.4, 0.8, 2]) {
      for (const seconds of [1, 5, 7, 10, 15]) {
        const q = k4.quotePreparedKling4(seconds, { ...fixture, falUsdPerSecond, marketUsdPerSecond })
        assert.ok(q.credits >= prices.CLIP_MIN_CREDITS)
        assert.ok(q.marginAtStudio >= 0.4 - 1e-9, '40% margin at cheapest credit')
        if (q.status === 'below_market') {
          assert.ok(q.credits * prices.CREATOR_USD_PER_CREDIT <= marketUsdPerSecond * seconds * .9 + 1e-6, 'Market minus 10%')
        } else assert.ok(q.status === 'margin_floor' || q.status === 'house_minimum')
      }
    }
  }
  // Same pricing rule as current clips, across real existing market comparisons, without changing them.
  for (const engine of catalog.CLIP_ENGINE_ORDER) {
    const quote = market.cheapestMarketQuote(engine, prices.STUDIO_PLAN_USD_CENTS)
    if (!quote) continue
    const cost = Math.max(prices.CLIP_COSTS[engine].usdPerSecond, market.ENGINE_MARKET[engine].falUsdPerSecond)
    for (const seconds of catalog.offeredSecondsFor(engine)) {
      const planned = k4.quotePreparedKling4(seconds, { ...fixture, falUsdPerSecond: cost, marketUsdPerSecond: market.quoteUsdPerSecond(quote) })
      assert.equal(planned.credits, prices.clipMarketDecision(engine, seconds).credits, engine + ' ' + seconds)
    }
  }
  assert.equal(k4.quotePreparedKling4(5, { ...fixture, falUsdPerSecond: .4, marketUsdPerSecond: .1 }).status, 'margin_floor')
  assert.equal(k4.quotePreparedKling4(1, { ...fixture, falUsdPerSecond: .01, marketUsdPerSecond: .5 }).status, 'house_minimum')
  // A one-line activation must be stopped at module loading, before any request/debit.
  assert.throws(() => loader(mutation, true)(FILE), /Kling 4 launch blocked/)
}
check()
const mutants = [
  ['launch without evidence', 'if (blockers.length) throw', 'if (false) throw'],
  ['ignore missing model', "if (!facts.modelId || !/^[a-z0-9-]+\\/[a-z0-9/-]+$/.test(facts.modelId))", 'if (false)'],
  ['ignore missing cost', 'if (!positive(facts.falUsdPerSecond))', 'if (false)'],
  ['ignore provider', "if (facts.provider !== 'fal')", 'if (false)'],
  ['ignore schema', 'if (!facts.schemaReviewed)', 'if (false)'],
  ['ignore adapter review', 'if (!facts.dispatchReviewed)', 'if (false)'],
  ['40% floor removed', '(1 - MARKET_MARGIN_FLOOR)', '(1 - 0)'],
  ['10% discount removed', '(1 - MARKET_DISCOUNT)', '(1 - 0)'],
  ['comparison mismatch allowed', ' || !facts.sameModelResolutionAndAudio || !facts.samePriceShelf', ''],
  ['activation bypass', '\nassertKling4Launch()\n', '\n// removed assertion\n'],
]
for (const [name, from, to] of mutants) {
  assert.ok(raw.includes(from), 'Anchor: ' + name)
  assert.throws(() => check([from, to]), undefined, 'Mutant: ' + name)
  console.log('Mutant rejected: ' + name)
}
console.log('PASS: Kling 4 off, no invented model/cost, catalog rejects generation, existing clip price rule, 10 mutants.')
