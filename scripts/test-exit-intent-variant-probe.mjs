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
function ok(value, label) { assert.ok(value, label); checks += 1 }
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${path}: unexpected import ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

const policy = loadTs('lib/growth/exitIntentVariantProbe.ts')
const component = read('components/ExitIntentOffer.tsx')
const pricing = read('app/pricing/PricingClient.tsx')
const home = read('app/KineoLanding.tsx')
const eventSink = read('app/api/events/route.ts')

equal(policy.EXIT_INTENT_VARIANT_PROBE_VERSION, 'exit_intent_variant_collision_probe_v1', 'probe version is stable')
equal(policy.EXIT_INTENT_SESSION_VARIANT_KEY, 'kineo_exit_offer_shown_variant', 'companion key is stable')
equal(policy.normalizePriorExitIntentVariant('free'), 'free', 'free is accepted')
equal(policy.normalizePriorExitIntentVariant('deal'), 'deal', 'deal is accepted')
for (const unknown of ['', 'starter', null, undefined, 1, {}]) {
  equal(policy.normalizePriorExitIntentVariant(unknown), 'unknown', `unsafe prior value becomes unknown: ${String(unknown)}`)
}

for (const variant of ['free', 'deal']) {
  const metadata = policy.exitIntentVariantMetadata(variant)
  equal(JSON.stringify(metadata), JSON.stringify({ version: policy.EXIT_INTENT_VARIANT_PROBE_VERSION, variant }), `${variant} exposure metadata is exact`)
  const suppressed = policy.exitIntentSuppressionMetadata(variant, 'free')
  equal(Object.keys(suppressed).sort().join(','), 'prior_variant,reason,requested_variant,version', `${variant} suppression metadata is allow-listed`)
  equal(suppressed.requested_variant, variant, `${variant} request remains categorical`)
  equal(suppressed.prior_variant, 'free', `${variant} prior remains categorical`)
  equal(suppressed.reason, 'session_key_seen', `${variant} reason is stable`)
  ok(policy.exitIntentSuppressionMarker(variant).endsWith(`:${variant}`), `${variant} has its own latch`)
}
equal(policy.exitIntentProbeSettlement(false), 'retryable', 'failed event storage stays retryable')
equal(policy.exitIntentProbeSettlement(true), 'recorded', 'stored event closes the latch')

function memoryStorage({ readThrows = false, writeThrows = false } = {}) {
  const values = new Map()
  const writes = []
  return {
    values,
    writes,
    getItem(key) {
      if (readThrows) throw new Error('storage read denied')
      return values.get(key) ?? null
    },
    setItem(key, value) {
      writes.push([key, value])
      if (writeThrows) throw new Error('storage write denied')
      values.set(key, value)
    },
  }
}

async function exerciseRecorder({ stored = true, readThrows = false, writeThrows = false, priorVariant = 'free' } = {}) {
  const storage = memoryStorage({ readThrows, writeThrows })
  const inFlight = new Set()
  const recorded = new Set()
  const calls = []
  const track = async (name, metadata) => {
    calls.push({ name, metadata })
    return stored
  }
  const result = await policy.recordExitIntentSuppressionOnce({
    requestedVariant: 'deal', priorVariant, storage, inFlight, recorded, track,
  })
  return { storage, inFlight, recorded, calls, track, result }
}

const success = await exerciseRecorder()
equal(success.result, 'recorded', 'stored event records successfully')
equal(success.calls.length, 1, 'stored event performs one POST')
equal(success.calls[0].name, 'exit_intent_suppressed', 'recorder emits only the suppression event')
equal(success.calls[0].metadata.requested_variant, 'deal', 'runtime event keeps requested variant')
equal(success.calls[0].metadata.prior_variant, 'free', 'runtime event keeps prior variant')
equal(success.storage.writes.length, 1, 'latch is written exactly once after success')
equal(success.recorded.size, 1, 'success latches in memory')
equal(success.inFlight.size, 0, 'success clears in-flight state')
const successRemount = await policy.recordExitIntentSuppressionOnce({
  requestedVariant: 'deal', priorVariant: 'free', storage: success.storage,
  inFlight: success.inFlight, recorded: success.recorded, track: success.track,
})
equal(successRemount, 'duplicate', 'remount after stored success is suppressed')
equal(success.calls.length, 1, 'remount after stored success performs no second POST')

const failed = await exerciseRecorder({ stored: false })
equal(failed.result, 'retryable', 'stored:false stays retryable')
equal(failed.storage.writes.length, 0, 'stored:false writes no latch')
equal(failed.recorded.size, 0, 'stored:false writes no memory latch')
equal(failed.inFlight.size, 0, 'stored:false clears in-flight state')
const failedRetry = await policy.recordExitIntentSuppressionOnce({
  requestedVariant: 'deal', priorVariant: 'free', storage: failed.storage,
  inFlight: failed.inFlight, recorded: failed.recorded, track: failed.track,
})
equal(failedRetry, 'retryable', 'next call retries after stored:false')
equal(failed.calls.length, 2, 'stored:false permits exactly one new POST on retry')

let releaseConcurrent
const concurrentStorage = memoryStorage()
const concurrentInFlight = new Set()
const concurrentRecorded = new Set()
const concurrentCalls = []
const concurrentTrack = (name, metadata) => {
  concurrentCalls.push({ name, metadata })
  return new Promise((resolve) => { releaseConcurrent = resolve })
}
const firstConcurrent = policy.recordExitIntentSuppressionOnce({
  requestedVariant: 'deal', priorVariant: 'free', storage: concurrentStorage,
  inFlight: concurrentInFlight, recorded: concurrentRecorded, track: concurrentTrack,
})
const secondConcurrent = await policy.recordExitIntentSuppressionOnce({
  requestedVariant: 'deal', priorVariant: 'free', storage: concurrentStorage,
  inFlight: concurrentInFlight, recorded: concurrentRecorded, track: concurrentTrack,
})
equal(secondConcurrent, 'duplicate', 'concurrent remount is suppressed while first POST is pending')
equal(concurrentCalls.length, 1, 'two concurrent calls perform one POST')
releaseConcurrent(true)
equal(await firstConcurrent, 'recorded', 'first concurrent call settles normally')
equal(concurrentStorage.writes.length, 1, 'concurrent success writes one latch')

const deniedRead = await exerciseRecorder({ readThrows: true })
equal(deniedRead.result, 'recorded', 'denied storage read fails open without breaking telemetry')
equal(deniedRead.calls.length, 1, 'denied storage read still performs one POST')
const deniedWrite = await exerciseRecorder({ writeThrows: true })
equal(deniedWrite.result, 'recorded', 'denied storage write does not undo stored event')
equal(deniedWrite.recorded.size, 1, 'denied storage write keeps memory latch')
equal(deniedWrite.inFlight.size, 0, 'denied storage write clears in-flight state')

const invalidPrior = await exerciseRecorder({ priorVariant: 'starter' })
equal(invalidPrior.calls[0].metadata.prior_variant, 'unknown', 'invalid prior value is normalized inside the real recorder')

const thrownStorage = memoryStorage()
const thrownCalls = []
const thrownResult = await policy.recordExitIntentSuppressionOnce({
  requestedVariant: 'deal', priorVariant: 'free', storage: thrownStorage,
  inFlight: new Set(), recorded: new Set(),
  track: async (...args) => { thrownCalls.push(args); throw new Error('network') },
})
equal(thrownResult, 'retryable', 'unexpected tracker rejection remains retryable')
equal(thrownStorage.writes.length, 0, 'tracker rejection writes no latch')
equal(thrownCalls.length, 1, 'tracker rejection does not loop internally')

const allPayloads = [
  policy.exitIntentVariantMetadata('free'),
  policy.exitIntentVariantMetadata('deal'),
  policy.exitIntentSuppressionMetadata('deal', 'free'),
  policy.exitIntentSuppressionMetadata('free', 'unknown'),
]
for (const payload of allPayloads) {
  const serialized = JSON.stringify(payload).toLowerCase()
  for (const forbidden of ['email', 'topic', 'prompt', 'referrer', 'url', 'price', 'session_id', 'stripe']) {
    ok(!serialized.includes(forbidden), `payload excludes ${forbidden}`)
  }
}

ok(component.includes("const SESSION_KEY = 'kineo_exit_offer_shown'"), 'legacy once-per-session key remains unchanged')
ok(component.includes('sessionStorage.setItem(SESSION_KEY, \'1\')'), 'legacy key is still written on real show')
ok(component.includes('sessionStorage.setItem(EXIT_INTENT_SESSION_VARIANT_KEY, variant)'), 'shown variant is stored beside the legacy key')
ok(component.includes("trackEvent('exit_intent_shown', variant)"), 'shown event receives variant metadata')
ok(component.includes('recordExitIntentSuppressionOnce({'), 'component calls the executable recorder')
ok(
  /normalizePriorExitIntentVariant\(\s*sessionStorage\.getItem\(EXIT_INTENT_SESSION_VARIANT_KEY\),?\s*\)/.test(component),
  'suppression reads only the companion variant',
)
ok(component.includes('inFlight: suppressionInFlight'), 'component gives the recorder its shared in-flight guard')
ok(component.includes('recorded: suppressionRecorded'), 'component gives the recorder its shared memory latch')
ok(component.includes('track: trackAnalyticsEvent'), 'component injects the real analytics writer')
ok(component.includes("trackEvent('exit_intent_free_clicked', variant)"), 'free click receives variant metadata')
ok(component.includes("trackEvent('exit_intent_intro_starter_clicked', variant)"), 'Starter click receives variant metadata')
ok(component.includes("trackEvent('exit_intent_intro_creator_clicked', variant)"), 'Creator click receives variant metadata')
ok(component.includes('const ARM_DELAY_MS = 5000'), 'trigger arm delay is unchanged')
ok(component.includes('const MOBILE_IDLE_MS = 45000'), 'mobile idle trigger is unchanged')
ok(component.includes("if (params.get('promo')) return"), 'promo suppression is unchanged')
ok(component.includes("if (params.get('already_subscribed') === '1') return"), 'subscriber suppression is unchanged')

equal((component.match(/kineo_exit_offer_shown'/g) ?? []).length, 1, 'legacy key remains a single canonical literal')
ok(pricing.includes('<ExitIntentOffer />'), 'pricing still requests the default deal variant')
ok(home.includes('<ExitIntentOffer variant="free" />'), 'home still requests the free variant')
ok(component.indexOf("sessionStorage.getItem(SESSION_KEY) === '1'") < component.indexOf('const params = new URLSearchParams'), 'collision probe runs at the existing session guard before trigger wiring')
ok(!eventSink.includes("'exit_intent_suppressed',"), 'suppression remains browser analytics, not server authority')

for (const visualToken of ['Wait — pick your', 'You haven&apos;t tried it yet', 'Start for', 'Sign up and make my first video']) {
  ok(component.includes(visualToken), `existing visual copy remains: ${visualToken}`)
}

console.log(`Exit intent variant probe: ${checks}/${checks} checks passed`)
