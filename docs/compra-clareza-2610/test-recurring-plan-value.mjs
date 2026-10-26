// Run from the worktree root: node docs/compra-clareza-2610/test-recurring-plan-value.mjs
// Real TS/TSX modules, in memory. No provider, database, env file, network or render API.
import assert from 'node:assert/strict'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { createOfflineLoader } from '../../scripts/test-support/offline-ts-loader.mjs'

const HELPER = 'lib/growth/postVideoCapacity.ts'
const COMPONENT = 'components/growth/RecurringPlanValue.tsx'
let checks = 0
const check = (name, run) => { run(); checks += 1; process.stdout.write(`PASS ${name}\n`) }

function fixture(mutate = (file, source) => source) {
  const load = createOfflineLoader({
    mocks: { react: React, 'react/jsx-runtime': jsxRuntime },
    source(file, source) {
      const text = mutate(file, source)
      return file.endsWith('.tsx') ? ts.transpileModule(text, {
        fileName: file,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
      }).outputText : text
    },
  })
  const capacity = load(HELPER).getPostVideoCapacity
  const Component = load(COMPONENT).default
  const pricing = load('lib/checkoutPricing.ts')
  const costs = load('lib/credits/engineCost.ts')
  const gates = load('lib/enginePlanGate.ts')
  const durations = load('lib/durationByEngine.ts')
  return { capacity, pricing, costs, gates, durations, html: props => renderToStaticMarkup(React.createElement(Component, props)) }
}

const f = fixture()
const base = { tier: 'starter', quality: 'cinematic_ai', seconds: 15 }
const fast = { ...base, quality: 'fast', seconds: 60, kineo1Allowed: true }
const beforeGate = new Date(Date.parse(f.gates.ENGINE_GATE_SINCE) - 1).toISOString()
const afterGate = new Date(Date.parse(f.gates.ENGINE_GATE_SINCE) + 1).toISOString()

check('paid cost and whole-film capacity from real grant, engine and duration', () => {
  let combinations = 0
  const engines = { fast: 'fast', cinematic_ai: 'seedance', cinematic_kling: 'kling', cinematic_veo: 'veo', cinematic_hollywood: 'hollywood', cinematic_h3: 'h3', cinematic_h3max: 'h3max', cinematic_s25: 's25' }
  for (const tier of ['starter', 'basic', 'pro']) for (const [quality, engine] of Object.entries(engines)) {
    for (const seconds of f.durations.supportedDurationsFor(engine)) {
      const result = f.capacity({ tier, quality, seconds, kineo1Allowed: true, profileCreatedAt: beforeGate })
      const monthly = f.pricing.TIER_CREDITS[tier]
      const cost = f.costs.creditCostForDuration(quality, true, seconds)
      const films = Math.floor(monthly / cost)
      assert.equal(result.monthlyCredits, monthly)
      assert.equal(result.creditsPerFilm, cost)
      if (films > 0) {
        assert.equal(result.status, 'ready')
        assert.equal(result.filmsPerMonth, films)
        assert.equal(result.seconds, seconds)
        assert.equal(result.quality, quality)
        assert.ok(films * cost <= monthly && (films + 1) * cost > monthly)
      } else {
        assert.equal(result.status, 'unavailable')
        assert.equal(result.reason, 'insufficient_monthly_credits')
        assert.equal(result.filmsPerMonth, undefined)
      }
      combinations += 1
    }
  }
  assert.ok(combinations > 90)
})

check('known canonical examples: Starter Kineo 1 60s=12; Seedance 15s=6 and 60s=1', () => {
  assert.equal(f.capacity(fast).filmsPerMonth, 12)
  assert.equal(f.capacity(base).filmsPerMonth, 6)
  assert.equal(f.capacity({ ...base, seconds: 60 }).filmsPerMonth, 1)
})

check('Kineo 1 requires resolved eligibility on every offered tier', () => {
  for (const tier of ['starter', 'basic', 'pro']) for (const kineo1Allowed of [undefined, null, false]) {
    const props = { ...fast, tier, kineo1Allowed }
    assert.equal(f.capacity(props).reason, 'engine_unavailable')
    assert.doesNotMatch(f.html(props), /Kineo 1|new films? \/ month/)
  }
})

check('premium gate: unknown/new account denied, grandfathered or Studio allowed', () => {
  for (const profileCreatedAt of [undefined, null, 'invalid', afterGate]) {
    assert.equal(f.capacity({ ...base, quality: 'cinematic_kling', profileCreatedAt }).reason, 'engine_access_unconfirmed')
  }
  assert.equal(f.capacity({ ...base, quality: 'cinematic_kling', profileCreatedAt: beforeGate }).status, 'ready')
  assert.equal(f.capacity({ ...base, tier: 'pro', quality: 'cinematic_kling' }).status, 'ready')
})

check('missing/unknown/retired quality never falls back to Seedance or invents capacity', () => {
  for (const quality of [undefined, null, '', 'unknown', 'constructor', 'toString', 'basic', 'pro', 'cinematic_omni', 'cinematic_sora', 'avatar', 'presenter']) {
    assert.equal(f.capacity({ ...base, quality }).reason, 'unknown_engine')
    assert.doesNotMatch(f.html({ ...base, quality }), /Seedance|Omni|new films? \/ month/)
  }
  assert.equal(f.capacity({ ...base, tier: 'unknown' }).reason, 'unknown_plan')
  assert.equal(f.html({ ...base, tier: 'unknown' }), '')
})

check('unknown duration never silently becomes 60s; unsupported requests have no projection', () => {
  for (const seconds of [undefined, null, NaN, Infinity, -1, 0, 15.5, '60']) {
    assert.equal(f.capacity({ ...base, seconds }).reason, 'unknown_duration')
    assert.doesNotMatch(f.html({ ...base, seconds }), /seconds each|new films? \/ month/)
  }
  for (const seconds of [1, 10, 20, 30, 91, 180, 1000]) {
    assert.equal(f.capacity({ ...base, seconds }).reason, 'duration_unavailable')
  }
})

check('real SSR: localized context, expandable math and shared balance; no extra purchase control', () => {
  const html = f.html(base)
  assert.match(html, /Up to <strong>6<\/strong> new films \/ month/)
  assert.match(html, /Seedance 1\.5 · 15 seconds each/)
  assert.match(html, /<details><summary[^>]*>60 monthly credits · see the calculation/)
  assert.match(html, /60 ÷ 9 credits per film → 6 complete films/)
  assert.match(html, /Other creations use the same balance/)
  assert.match(html, /data-capacity-version="purchase_clarity_20261026_v1"/)
  assert.doesNotMatch(html, /<(?:button|a|form|select|script)\b|unlimited|\$|fetch\(/)
  assert.match(f.html({ ...base, seconds: 60 }), /<strong>1<\/strong> new film \/ month/)
  assert.match(f.html({ ...base, locale: 'pt-BR' }), /Até <strong>6<\/strong> novos filmes \/ mês/)
  assert.match(f.html({ ...base, locale: 'es-ES' }), /Hasta <strong>6<\/strong> películas nuevas \/ mes/)
  assert.match(f.html({ ...base, locale: 'de' }), /Up to <strong>6<\/strong>/)
  assert.match(f.html({ ...base, quality: 'cinematic_s25', profileCreatedAt: beforeGate, seconds: 60 }), /more credits per film/)
})

function replaceOnce(file, find, replacement) {
  return (name, text) => {
    if (name !== file) return text
    assert.equal(text.split(find).length - 1, 1, `Mutation target must be exact: ${find}`)
    return text.replace(find, replacement)
  }
}

check('canonical changes propagate: no copied grant, cost or launch settings', () => {
  const biggerGrant = fixture((file, text) => {
    if (file !== 'lib/checkoutPricing.ts') return text
    const block = text.match(/export const TIER_CREDITS: Record<CheckoutPlanTier, number> = \{[\s\S]*?\n\}/)?.[0]
    assert.ok(block, 'Canonical monthly grant declaration found')
    const changed = replaceOnce(file, 'starter: 60,', 'starter: 63,')(file, block)
    return text.replace(block, changed)
  })
  assert.equal(biggerGrant.capacity(base).filmsPerMonth, 7)
  const doubleCost = fixture(replaceOnce('lib/credits/engineCost.ts', 'const base = creditCostFor(quality, isPaidUser)', 'const base = 2 * creditCostFor(quality, isPaidUser)'))
  assert.equal(doubleCost.capacity(fast).filmsPerMonth, 6)
  assert.equal(doubleCost.capacity(fast).creditsPerFilm, 10)
  const gateEnabled = fixture(replaceOnce('lib/enginePlanGate.ts', "ENGINE_GATE_SINCE = '2099-01-01T00:00:00.000Z'", "ENGINE_GATE_SINCE = '2020-01-01T00:00:00.000Z'"))
  assert.equal(gateEnabled.capacity({ ...base, quality: 'cinematic_kling', profileCreatedAt: '2026-01-01T00:00:00Z' }).reason, 'engine_access_unconfirmed')
  for (const [flag, props] of [
    ['SEEDANCE_15S_PUBLIC', base],
    ['DURACOES_CURTAS_PUBLIC', { ...base, tier: 'pro', quality: 'cinematic_kling' }],
    ['H3MAX_PUBLIC', { ...base, tier: 'pro', quality: 'cinematic_h3max' }],
    ['S25_PUBLIC', { ...base, tier: 'pro', quality: 'cinematic_s25' }],
  ]) {
    const hidden = fixture(replaceOnce('lib/engineLaunch.ts', `export const ${flag} = true`, `export const ${flag} = false`))
    assert.equal(hidden.capacity(props).status, 'unavailable', flag)
  }
})

const mutants = [
  ['free price', 'creditCostForDuration(quality as Quality, true, seconds)', 'creditCostForDuration(quality as Quality, false, seconds)', m => assert.equal(m.capacity(fast).filmsPerMonth, 12)],
  ['rounding up', 'Math.floor(monthlyCredits / creditsPerFilm)', 'Math.ceil(monthlyCredits / creditsPerFilm)', m => assert.equal(m.capacity(base).filmsPerMonth, 6)],
  ['fixed duration', 'creditCostForDuration(quality as Quality, true, seconds)', 'creditCostForDuration(quality as Quality, true, 60)', m => assert.equal(m.capacity(base).filmsPerMonth, 6)],
  ['unknown duration defaults', 'const seconds = input.seconds', 'const seconds = input.seconds ?? 60', m => assert.equal(m.capacity({ ...base, seconds: undefined }).status, 'unavailable')],
  ['Kineo 1 leaked', "(engine === 'fast' && input.kineo1Allowed !== true)", 'false', m => assert.equal(m.capacity({ ...fast, kineo1Allowed: false }).status, 'unavailable')],
  ['premium gate bypassed', 'if (!decideEngineGate({', 'if (false && !decideEngineGate({', m => assert.equal(m.capacity({ ...base, quality: 'cinematic_kling', profileCreatedAt: afterGate }).status, 'unavailable')],
]
for (const [name, find, replacement, invariant] of mutants) {
  check(`behavioral guard rejects mutant: ${name}`, () => {
    const mutant = fixture(replaceOnce(HELPER, find, replacement))
    assert.throws(() => invariant(mutant), assert.AssertionError)
  })
}
process.stdout.write(`PASS recurring plan value: ${checks} checks; real TS/TSX, 6 rejected in-memory mutants; no external effects.\n`)
