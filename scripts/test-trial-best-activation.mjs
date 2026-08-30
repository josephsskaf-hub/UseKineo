#!/usr/bin/env node

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks += 1 }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1 }

function executeTs(file, mocks = {}) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error(`unmocked import ${id}`)
    },
    Number,
    URLSearchParams,
  }, { filename: file })
  return moduleBox.exports
}

const handoff = executeTs('lib/creationHandoff.ts')
const router = executeTs('lib/growth/trialActivationIntent.ts', {
  '@/lib/creationHandoff': handoff,
})

const carried = new URLSearchParams({ welcome: '1' })
handoff.carryCreationHandoff(new URLSearchParams({
  prompt: 'HOOK: The signal came from below the ice.',
  create_intent: 'trial_best',
}), carried)
equal(carried.get('create_intent'), 'trial_best', 'trial_best crosses signup')
equal(
  handoff.resolveActivationCreationContract(carried).createIntent,
  'trial_best',
  'Generate receives the same explicit intent',
)
equal(
  handoff.readCreationHandoff(new URLSearchParams({ create_intent: 'trial_best' })).createIntent,
  null,
  'intent without authored work cannot arm a render',
)
equal(
  handoff.readCreationHandoff(new URLSearchParams({ prompt: 'real idea', create_intent: 'unknown' })).createIntent,
  null,
  'unknown intent fails closed',
)

const resolve = (overrides = {}) => router.resolveActivationRenderEngine({
  createIntent: 'trial_best',
  trialActive: true,
  credits: 25,
  seedanceCreditCost: 25,
  ...overrides,
})

equal(resolve(), 'seedance', 'active 25-credit trial receives the premium first film')
equal(resolve({ credits: 24 }), 'fast', 'insufficient balance cannot manufacture a 402')
equal(resolve({ credits: null }), 'fast', 'unknown balance fails safely to Fast')
equal(resolve({ credits: Number.NaN }), 'fast', 'invalid balance fails safely to Fast')
equal(resolve({ trialActive: false }), 'fast', 'expired or absent trial stays on Fast')
equal(resolve({ createIntent: 'fast' }), 'fast', 'legacy explicit Fast remains Fast')
equal(resolve({ createIntent: null }), 'fast', 'missing intent cannot select Seedance')
equal(resolve({ seedanceCreditCost: 26 }), 'fast', 'engine cost is canonical input, not a hardcoded promise')
equal(
  router.activationRenderEngineIsReady({ engine: 'seedance', mode: 'cinematic_ai', aiEngine: 'seedance' }),
  true,
  'Seedance is ready only in the matching cinematic state',
)
equal(
  router.activationRenderEngineIsReady({ engine: 'seedance', mode: 'fast', aiEngine: 'seedance' }),
  false,
  'Fast mode cannot dispatch a Seedance intent',
)
equal(
  router.activationRenderEngineIsReady({ engine: 'fast', mode: 'fast', aiEngine: 'seedance' }),
  true,
  'legacy Fast ignores an unrelated AI selector',
)
equal(
  router.activationRenderEngineIsReady({ engine: null, mode: 'fast', aiEngine: 'seedance' }),
  false,
  'missing resolved engine fails closed',
)

const home = read('app/HomeTopicForm.tsx')
const generate = read('app/(dashboard)/generate/GenerateClient.tsx')
check(home.includes("create_intent: 'trial_best'"), 'anonymous post-script CTA requests trial_best')
check(home.includes('name="create_intent" value="trial_best"'), 'native no-JS referral fallback requests the guarded trial-best rail')
check(!home.includes('name="create_intent" value="fast"'), 'native referral fallback no longer silently degrades to Fast')
check(generate.includes('resolveActivationRenderEngine({'), 'real caller executes the engine policy')
check(generate.includes("seedanceCreditCost: creditCostFor('cinematic_ai')"), 'caller reads the canonical engine cost')
check(
  /setMode\('cinematic_ai'\)\s+setAiEngine\('seedance'\)/.test(generate),
  'eligible intent commits Seedance before analysis',
)
equal((generate.match(/activationRenderEngineIsReady\(\{/g) ?? []).length, 2, 'one readiness policy governs both real guards')
check(generate.includes("if (paidAccount && !isFirstWinFromCheckout)"), 'ordinary paid accounts still cannot auto-spend')
check(generate.includes("if (creditsLoading || planTier === null) return"), 'engine resolution waits for entitlement and balance')
check(generate.includes('requested_intent: activationContract.createIntent'), 'telemetry distinguishes requested intent')
check(generate.includes('TRIAL_BEST_AUTOSTART_VARIANT'), 'trial-best telemetry has a distinct variant')

console.log(`PASS — ${checks}/${checks} trial-best activation checks`)
