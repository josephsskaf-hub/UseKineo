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

function loadTs(rel) {
  const filename = join(root, rel)
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', `${output}\n//# sourceURL=${filename}`)(
    () => { throw new Error('helper puro tentou importar dependência') },
    module,
    module.exports,
  )
  return module.exports
}

let passed = 0
const failures = []
function check(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`✓ ${name}`)
  } catch (error) {
    failures.push({ name, error })
    console.error(`✗ ${name}`)
    console.error(`  ${error instanceof Error ? error.message : String(error)}`)
  }
}

const policy = loadTs('lib/growth/inlinePricingReturningFocus.ts')
const component = source('components/PricingCards.tsx')
const preview = source('docs/previews/inline-pricing-returning-focus-v1.html')

for (const [label, input] of [
  ['histórico indisponível', { historyReliable: false, completedCount: 4 }],
  ['contagem ausente', { historyReliable: true, completedCount: null }],
  ['zero concluídos', { historyReliable: true, completedCount: 0 }],
  ['contagem negativa', { historyReliable: true, completedCount: -1 }],
  ['contagem fracionária', { historyReliable: true, completedCount: 1.5 }],
]) {
  check(`${label} preserva layout legacy`, () => {
    assert.deepEqual(policy.decideInlinePricingLayout(input), {
      eligible: false,
      layout: 'legacy',
      completedCountBucket: 'unknown',
    })
  })
}

for (const [count, bucket] of [[1, '1'], [2, '2_3'], [3, '2_3'], [4, '4_plus'], [99, '4_plus']]) {
  check(`${count} concluído(s) confiável(is) foca Creator no bucket ${bucket}`, () => {
    assert.deepEqual(policy.decideInlinePricingLayout({ historyReliable: true, completedCount: count }), {
      eligible: true,
      layout: 'focused',
      completedCountBucket: bucket,
    })
  })
}

check('metadata contém somente campos allow-listed', () => {
  const metadata = policy.buildInlinePricingDecisionMetadata({
    layout: 'focused',
    completedCountBucket: '2_3',
  })
  assert.deepEqual(Object.keys(metadata).sort(), [
    'completed_count_bucket',
    'decision_layout',
    'decision_version',
    'pricing_surface',
  ])
  assert.deepEqual(metadata, {
    decision_version: 'inline_pricing_returning_focus_v1',
    decision_layout: 'focused',
    completed_count_bucket: '2_3',
    pricing_surface: 'generate_step_1',
  })
})

for (const [layout, bucket] of [['invented', '1'], ['focused', 'raw_count']]) {
  check(`metadata inválida falha fechada (${layout}/${bucket})`, () => {
    assert.equal(policy.buildInlinePricingDecisionMetadata({ layout, completedCountBucket: bucket }), null)
  })
}

check('gate exige 10 pessoas externas e viewport de 35%', () => {
  assert.deepEqual(policy.INLINE_PRICING_RETURNING_FOCUS_GATE, {
    minimumExternalVisiblePeople: 10,
    viewportRatio: 0.35,
    stopOnCheckoutDivergence: true,
  })
})

check('caller consulta histórico autenticado e mantém fallback fail-closed', () => {
  assert.match(component, /fetch\('\/api\/videos'/)
  assert.match(component, /historyReliable\?: unknown/)
  assert.match(component, /decideInlinePricingLayout\(\{ historyReliable: false, completedCount: null \}\)/)
  assert.match(component, /Fail closed:/)
})

check('view só é emitida pelo IntersectionObserver com limiar canônico', () => {
  const eventIndex = component.indexOf("trackEvent('inline_pricing_decision_viewed'")
  const observerIndex = component.indexOf('new IntersectionObserver')
  assert.ok(observerIndex >= 0)
  assert.ok(eventIndex > observerIndex)
  assert.match(component, /intersectionRatio >= INLINE_PRICING_RETURNING_FOCUS_GATE\.viewportRatio/)
  assert.match(component, /threshold: \[INLINE_PRICING_RETURNING_FOCUS_GATE\.viewportRatio\]/)
})

check('comparação é explícita, acessível e medida', () => {
  assert.match(component, /Compare Starter &amp; Studio/)
  assert.match(component, /aria-expanded=\{compareExpanded\}/)
  assert.match(component, /aria-controls="inline-pricing-plan-grid"/)
  assert.match(component, /trackEvent\('inline_pricing_compare_clicked'/)
})

check('cards originais existem uma vez e comparação só controla Starter/Studio', () => {
  assert.equal((component.match(/tier="starter"/g) ?? []).length, 1)
  assert.equal((component.match(/tier="basic"/g) ?? []).length, 1)
  assert.equal((component.match(/tier="pro"/g) ?? []).length, 1)
  assert.equal((component.match(/\(!returningDecision\.eligible \|\| compareExpanded\)/g) ?? []).length, 2)
})

check('Autopilot integral continua visível e com os dois caminhos de compra', () => {
  assert.match(component, /Autopilot — we publish to your YouTube channel for you/)
  assert.match(component, /handleBuyAutopilot\('autopilot_pilot'\)/)
  assert.match(component, /handleBuyAutopilot\('autopilot'\)/)
  assert.match(component, /Go monthly instead/)
})

check('eventos de checkout existentes são preservados e recebem versão/layout', () => {
  assert.equal((component.match(/trackEvent\('inline_pricing_checkout_clicked'/g) ?? []).length, 2)
  assert.ok((component.match(/\.\.\.\(decisionMetadata \?\? \{\}\)/g) ?? []).length >= 4)
})

check('preview autocontido contém antes/depois em desktop e mobile', () => {
  assert.match(preview, /<style>/)
  assert.doesNotMatch(preview, /<link|<script[^>]+src=/)
  for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
    assert.match(preview, new RegExp(marker.replace(' · ', ' \\· ')))
  }
})

console.log(`\n${passed}/${passed + failures.length} verificações passaram.`)
if (failures.length > 0) process.exit(1)
