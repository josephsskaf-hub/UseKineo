#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

const source = read('lib/growth/trialDowngradeFirstValue.ts')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleBox = { exports: {} }
new Function('module', 'exports', compiled)(moduleBox, moduleBox.exports)
const policy = moduleBox.exports

equal(policy.TRIAL_DOWNGRADE_FIRST_VALUE_VERSION, 'trial_downgrade_first_value_v1', 'version is closed')
const href = new URL(policy.TRIAL_DOWNGRADE_FIRST_VALUE_HREF, 'https://www.usekineo.com')
equal(href.pathname, '/studio/create', 'primary action reaches the existing creation route')
equal(href.searchParams.get('engine'), 'fast', 'activation uses the existing Fast path')
equal(href.searchParams.get('intent_campaign'), policy.TRIAL_DOWNGRADE_FIRST_VALUE_VERSION, 'destination is attributed')
ok(!href.searchParams.has('prompt'), 'navigation never transports user content')
ok(!href.searchParams.has('autostart'), 'navigation never starts a render')

equal(policy.resolveTrialDowngradeJourney({ historyReliable: true, completedCount: 0 }), 'first_value', 'exact zero reverses the primary action')
equal(policy.resolveTrialDowngradeJourney({ historyReliable: true, completedCount: 1 }), 'delivered', 'one completed film preserves paid-first')
equal(policy.resolveTrialDowngradeJourney({ historyReliable: true, completedCount: 99 }), 'delivered', 'many completed films preserve paid-first')
for (const input of [null, undefined, {}, { historyReliable: false, completedCount: 0 }, { historyReliable: true, completedCount: null }, { historyReliable: true, completedCount: -1 }, { historyReliable: true, completedCount: 0.5 }]) {
  equal(policy.resolveTrialDowngradeJourney(input), 'unknown', 'degraded or malformed history fails to the existing paid-first path')
}

const metadata = policy.trialDowngradeFirstValueClickMetadata()
equal(metadata.journey_state, 'first_value', 'click identifies the pre-value journey')
equal(metadata.primary_action, 'make_first_film', 'click identifies the action')
equal(metadata.destination, 'studio_create', 'click identifies the finite destination')
equal(metadata.engine, 'fast', 'click identifies the finite engine')
for (const forbidden of ['email', 'url', 'prompt', 'script', 'topic', 'user_id', 'session_id', 'price', 'amount', 'credits']) {
  ok(!(forbidden in metadata), `closed click metadata excludes ${forbidden}`)
}

const component = read('components/TrialDowngradeModal.tsx')
ok(component.includes("fetch('/api/videos'"), 'real modal reads owner-scoped completed history')
ok(component.includes('resolveTrialDowngradeJourney(history)'), 'real caller applies the fail-safe policy')
ok(component.indexOf("fetch('/api/credits'") < component.indexOf("fetch('/api/videos'"), 'server eligibility is proven before the history request')
ok(component.includes("const needsFirstValue = journeyState === 'first_value'"), 'render branch is explicit')
ok(component.includes('onClick={needsFirstValue ? goToFirstFilm : goToCreator}'), 'primary button follows the exact journey state')
ok(component.includes('trialDowngradeFirstValueClickMetadata()'), 'first-film click uses closed metadata')
ok(component.indexOf("trackClosedEvent(\n      'trial_downgrade_first_film_clicked'") < component.indexOf('window.location.assign(TRIAL_DOWNGRADE_FIRST_VALUE_HREF)'), 'click is persisted before navigation')
ok(component.includes('Choose Creator now'), 'payment remains available before delivery')
ok(component.includes('Compare all plans →'), 'plan comparison remains available')
ok(component.includes('Keep creating on the free plan'), 'existing free choice remains available')
ok(!component.includes('first film free'), 'new branch does not promise unused quota')

const firstValueIndex = component.lastIndexOf('Make your first film →')
const creatorIndex = component.lastIndexOf('Choose Creator now')
const compareIndex = component.lastIndexOf('Compare all plans →')
equal(firstValueIndex > 0 && firstValueIndex < creatorIndex, true, 'first value precedes payment only in its branch')
equal(creatorIndex < compareIndex, true, 'direct payment still precedes plan comparison')

const preview = read('docs/previews/TRIAL-DOWNGRADE-FIRST-VALUE-V1-2026-09-04.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `visual comparison includes ${label}`)
}
ok(preview.includes('21 external people'), 'preview states the dated person-level baseline')
ok(preview.includes('4 opened checkout; 0 paid'), 'preview states the observed outcome without inventing causality')

console.log(`PASS — ${checks}/${checks} trial downgrade first-value checks`)
