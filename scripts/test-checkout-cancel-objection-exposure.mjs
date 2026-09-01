#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(rel + ' imported unexpected runtime module: ' + id) },
    module,
    module.exports,
  )
  return module.exports
}

const exposure = loadTs('lib/growth/checkoutCancelObjectionExposure.ts')
let checks = 0
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(exposure.CHECKOUT_CANCEL_OBJECTION_VIEW_EVENT, 'checkout_cancel_objection_viewed', 'event name is stable')
equal(exposure.CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO, 0.5, 'actual-view denominator requires 50% visibility')
equal(exposure.isCheckoutCancelObjectionVisible(null), false, 'missing observer entry is not a view')
equal(exposure.isCheckoutCancelObjectionVisible({ isIntersecting: false, intersectionRatio: 1 }), false, 'non-intersecting element is not a view')
equal(exposure.isCheckoutCancelObjectionVisible({ isIntersecting: true, intersectionRatio: 0.49 }), false, '49% visibility is below the gate')
equal(exposure.isCheckoutCancelObjectionVisible({ isIntersecting: true, intersectionRatio: 0.5 }), true, '50% visibility reaches the gate')

for (const primary of ['checking', 'first_delivery', 'checkout']) {
  for (const answered of [false, true]) {
    for (const [label, entry, visible] of [
      ['hidden', { isIntersecting: false, intersectionRatio: 0 }, false],
      ['49%', { isIntersecting: true, intersectionRatio: 0.49 }, false],
      ['50%', { isIntersecting: true, intersectionRatio: 0.5 }, true],
    ]) {
      const expected = primary === 'checkout' && !answered && visible
      equal(
        exposure.shouldRecordCheckoutCancelObjectionView({ primary, answered, entry }),
        expected,
        `${primary} / answered=${answered} / ${label} follows the combined caller policy`,
      )
    }
  }
}
equal(exposure.shouldObserveCheckoutCancelObjection({ primary: 'checking', answered: false }), false, 'checking state does not create an observer')
equal(exposure.shouldObserveCheckoutCancelObjection({ primary: 'first_delivery', answered: false }), false, 'trial delivery does not create an observer')
equal(exposure.shouldObserveCheckoutCancelObjection({ primary: 'checkout', answered: true }), false, 'answered surface does not create an observer')
equal(exposure.shouldObserveCheckoutCancelObjection({ primary: 'checkout', answered: false }), true, 'unanswered checkout surface creates an observer')

const selfServe = {
  tier: 'basic', billing: 'monthly', checkoutProduct: 'self_serve',
  hasDownshift: true, hasPlanFitContext: true, returnToWatermark: false,
}
const metadata = exposure.buildCheckoutCancelObjectionMetadata(selfServe)
equal(metadata.event_unit, 'checkout_cancel_objection_surface', 'event names the measured surface')
equal(metadata.identity_resolution, 'user_id_else_session_id', 'identity rule keeps people and anonymous sessions separate')
equal(metadata.visible_ratio, 0.5, 'metadata carries the same visibility contract')
equal(metadata.checkout_product, 'self_serve', 'metadata keeps product categorical')
equal(metadata.has_downshift, true, 'metadata distinguishes whether an actionable lower tier exists')
equal(metadata.has_plan_fit_context, true, 'metadata distinguishes saved Plan Fit context')
equal(metadata.return_to_watermark, false, 'metadata keeps the bounded return context')
ok(!('price' in metadata), 'metadata does not copy commercial price')
ok(!('url' in metadata), 'metadata does not copy URLs')
ok(!('user_id' in metadata), 'browser cannot choose identity')
const reasonMetadata = exposure.buildCheckoutCancelReasonMetadata(selfServe, 'too_expensive')
equal(reasonMetadata.version, exposure.CHECKOUT_CANCEL_OBJECTION_VERSION, 'reason joins the same versioned cohort')
equal(reasonMetadata.checkout_product, 'self_serve', 'reason keeps the product context')
equal(reasonMetadata.reason, 'too_expensive', 'reason remains categorical')
ok(!('visible_ratio' in reasonMetadata), 'reason does not pretend to be a viewport impression')

const monthlyKey = exposure.checkoutCancelObjectionStorageKey(selfServe)
const annualKey = exposure.checkoutCancelObjectionStorageKey({ ...selfServe, billing: 'annual' })
const pilotKey = exposure.checkoutCancelObjectionStorageKey({ tier: 'autopilot', billing: 'monthly', checkoutProduct: 'pilot' })
ok(monthlyKey.includes(exposure.CHECKOUT_CANCEL_OBJECTION_VERSION), 'session key is versioned')
ok(monthlyKey !== annualKey, 'different billing selections receive separate context keys')
ok(monthlyKey !== pilotKey, 'different products receive separate context keys')

const calls = []
let storedMarker = false
let releaseView
const heldView = new Promise((resolve) => { releaseView = resolve })
const recorder = exposure.createCheckoutCancelObjectionRecorder({
  hasStoredView: () => storedMarker,
  markViewStored: () => { storedMarker = true },
  recordView: async () => { calls.push('view:start'); await heldView; calls.push('view:end'); return true },
  recordReason: async (reason) => { calls.push('reason:' + reason); return true },
})
const firstView = recorder.recordView()
const duplicateView = recorder.recordView()
equal(firstView, duplicateView, 'simultaneous observer callbacks share one view request')
const orderedReason = recorder.recordReason('too_expensive')
equal(recorder.isViewTerminal(), true, 'reason selection immediately terminates later view attempts')
equal(await recorder.recordView(), false, 'no late view starts after a reason click')
equal(calls.join('|'), 'view:start', 'reason waits while the view request is in flight')
releaseView(true)
equal(await firstView, true, 'successful view resolves true')
equal(await orderedReason, true, 'reason is stored after the view settles')
equal(calls.join('|'), 'view:start|view:end|reason:too_expensive', 'view is stored before the reason event')
equal(storedMarker, true, 'session marker is written only after a stored view')
equal(await recorder.recordReason('which_plan'), false, 'one interaction cannot emit two reasons')

let retryCalls = 0
let retryMarker = false
const retryRecorder = exposure.createCheckoutCancelObjectionRecorder({
  hasStoredView: () => retryMarker,
  markViewStored: () => { retryMarker = true },
  recordView: async () => { retryCalls++; return retryCalls > 1 },
  recordReason: async () => true,
})
equal(await retryRecorder.recordView(), false, 'failed analytics view remains retryable')
equal(retryMarker, false, 'failed analytics does not poison session dedupe')
equal(await retryRecorder.recordView(), true, 'a later real viewport callback can retry')
equal(retryCalls, 2, 'retry makes exactly one new analytics request')
equal(retryMarker, true, 'successful retry writes the session marker')

const page = source('app/checkout/cancelled/page.tsx')
const effectPolicy = page.indexOf('if (\n      !shouldObserveCheckoutCancelObjection({')
const observerCallback = page.indexOf('const observer = new IntersectionObserver(async (entries) => {', effectPolicy)
const viewPolicy = page.indexOf('if (!shouldRecordCheckoutCancelObjectionView({', observerCallback)
const viewRecorder = page.indexOf('await objectionRecorder.recordView()', observerCallback)
ok(page.includes('ref={objectionRef}'), 'live objection container owns the observer ref without a wrapper')
ok(effectPolicy >= 0 && effectPolicy < observerCallback, 'live effect negates the tested state policy before creating the observer')
ok(observerCallback >= 0 && viewPolicy > observerCallback, 'live observer negates the tested combined caller policy')
ok(page.includes('entry: entries[0]'), 'live observer passes the real viewport entry to the combined policy')
ok(page.includes('createCheckoutCancelObjectionRecorder({'), 'live page executes the tested causal recorder')
ok(page.includes("sessionStorage.setItem(objectionStorageKey, '1')"), 'successful views are deduplicated per session and context')
ok(viewPolicy < viewRecorder, 'visibility policy runs before the observer delegates view single-flight')
ok(page.includes('void objectionRecorder.recordReason(reason)'), 'all reason events use the tested ordered recorder')
ok(page.includes('buildCheckoutCancelReasonMetadata(objectionExposureContext, reason)'), 'legacy reason event joins the versioned product cohort')
ok(page.includes('recordCancelReason(value)'), 'all four live chips use the ordered recorder')
ok(!page.includes("setReasonSent(value)\n                      trackEvent('checkout_cancel_reason'"), 'legacy unordered click path is gone')

console.log('\n' + checks + '/' + checks + ' checkout-cancel objection exposure checks passed')
