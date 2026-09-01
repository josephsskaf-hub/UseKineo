import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const policyPath = path.join(root, 'lib/growth/checkoutCancelObjectionVisibility.ts')
const componentPath = path.join(root, 'app/checkout/cancelled/CheckoutCancelObjectionTelemetry.tsx')
const pagePath = path.join(root, 'app/checkout/cancelled/page.tsx')
const eventsRoutePath = path.join(root, 'app/api/events/route.ts')
const policySource = fs.readFileSync(policyPath, 'utf8')
const componentSource = fs.readFileSync(componentPath, 'utf8')
const pageSource = fs.readFileSync(pagePath, 'utf8')
const eventsRouteSource = fs.readFileSync(eventsRoutePath, 'utf8')

const transpiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: policyPath,
})
const module = { exports: {} }
vm.runInNewContext(`(function (module, exports) { ${transpiled.outputText}\n})(module, module.exports)`, {
  module,
})
const policy = module.exports

let checks = 0
function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, value) },
    removeItem(key) { values.delete(key) },
  }
}

const base = {
  tier: 'basic',
  billing: 'monthly',
  checkoutProduct: 'self_serve',
  downshiftAvailable: true,
}

check(policy.CHECKOUT_CANCEL_OBJECTION_VERSION === 'checkout_cancel_objection_visibility_v1', 'version is stable')
check(policy.CHECKOUT_CANCEL_OBJECTION_TARGET_ID === 'checkout-cancel-objection-box', 'target id is stable')
check(policy.CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO === 0.5, 'view threshold is 50%')

const metadata = policy.checkoutCancelObjectionMetadata(base)
check(Object.keys(metadata).length === 6, 'metadata has exactly six closed keys')
check(metadata.version === policy.CHECKOUT_CANCEL_OBJECTION_VERSION, 'metadata carries version')
check(metadata.surface === 'checkout_cancelled', 'surface is categorical')
check(metadata.tier === 'basic', 'tier is categorical')
check(metadata.billing === 'monthly', 'billing is categorical')
check(metadata.checkout_product === 'self_serve', 'product is categorical')
check(metadata.downshift_available === true, 'downshift state is boolean')
for (const forbidden of ['email', 'url', 'price', 'amount', 'session_id', 'stripe', 'reason', 'text', 'utm_source']) {
  check(!(forbidden in metadata), `metadata excludes ${forbidden}`)
}

const marker = policy.checkoutCancelObjectionMarker(base)
check(marker.includes(policy.CHECKOUT_CANCEL_OBJECTION_VERSION), 'marker includes version')
check(marker.includes(':basic:monthly:self_serve:downshift'), 'marker includes closed context')
check(
  policy.checkoutCancelObjectionMarker({ ...base, tier: 'starter', downshiftAvailable: false }) !== marker,
  'different safe context receives a different marker',
)

check(policy.shouldSampleCheckoutCancelObjection({ active: true, reasonChosen: false, isIntersecting: true, intersectionRatio: 0.5, documentVisible: true }), '50% visible qualifies')
check(!policy.shouldSampleCheckoutCancelObjection({ active: true, reasonChosen: false, isIntersecting: true, intersectionRatio: 0.499, documentVisible: true }), 'less than 50% does not qualify')
check(!policy.shouldSampleCheckoutCancelObjection({ active: false, reasonChosen: false, isIntersecting: true, intersectionRatio: 1, documentVisible: true }), 'inactive checkout state does not qualify')
check(!policy.shouldSampleCheckoutCancelObjection({ active: true, reasonChosen: true, isIntersecting: true, intersectionRatio: 1, documentVisible: true }), 'chosen reason stops sampling')
check(!policy.shouldSampleCheckoutCancelObjection({ active: true, reasonChosen: false, isIntersecting: false, intersectionRatio: 1, documentVisible: true }), 'non-intersecting box does not qualify')
check(!policy.shouldSampleCheckoutCancelObjection({ active: true, reasonChosen: false, isIntersecting: true, intersectionRatio: 1, documentVisible: false }), 'hidden document does not qualify')

{
  let resolvePending
  const lifecycle = policy.createCheckoutCancelObjectionLifecycle()
  const lateResult = new Promise((resolve) => { resolvePending = resolve })
    .then((outcome) => lifecycle.shouldRetry(outcome))
  check(lifecycle.canContinue(), 'mounted lifecycle can attempt')
  lifecycle.stop()
  resolvePending('not_stored')
  check(await lateResult === false, 'late not_stored after unmount cannot schedule retry')
  check(!lifecycle.canContinue(), 'unmounted lifecycle remains stopped')
}

{
  let resolvePending
  const lifecycle = policy.createCheckoutCancelObjectionLifecycle()
  const lateResult = new Promise((resolve) => { resolvePending = resolve })
    .then((outcome) => lifecycle.shouldRetry(outcome))
  lifecycle.stop()
  resolvePending('not_stored')
  check(await lateResult === false, 'late not_stored after reason choice cannot schedule retry')
}

{
  const lifecycle = policy.createCheckoutCancelObjectionLifecycle()
  check(lifecycle.shouldRetry('not_stored'), 'mounted confirmed rejection may retry once')
  check(!lifecycle.shouldRetry('stored'), 'stored result never retries')
  check(!lifecycle.shouldRetry('ambiguous'), 'ambiguous result never retries')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createCheckoutCancelObjectionRecorder({
    storage,
    transport: async (eventName, sentMetadata) => {
      posts += 1
      check(storage.getItem(marker) === 'pending', 'claim exists before POST')
      check(eventName === 'checkout_cancel_objection_viewed', 'event name is closed')
      check(sentMetadata.version === policy.CHECKOUT_CANCEL_OBJECTION_VERSION, 'closed metadata reaches transport')
      return 'stored'
    },
  })
  check(await recorder.recordOnce(base) === 'stored', 'stored outcome is returned')
  check(storage.getItem(marker) === 'stored', 'stored outcome finalizes marker')
  check(await recorder.recordOnce(base) === 'duplicate', 'same mount cannot duplicate')
  check(posts === 1, 'stored view posts exactly once')

  const remount = policy.createCheckoutCancelObjectionRecorder({
    storage,
    transport: async () => { posts += 1; return 'stored' },
  })
  check(await remount.recordOnce(base) === 'duplicate', 'remount respects stored marker')
  check(posts === 1, 'remount produces no second POST')
}

{
  const storage = fakeStorage()
  let release
  let posts = 0
  const first = policy.createCheckoutCancelObjectionRecorder({
    storage,
    transport: () => {
      posts += 1
      return new Promise((resolve) => { release = resolve })
    },
  })
  const second = policy.createCheckoutCancelObjectionRecorder({
    storage,
    transport: async () => { posts += 1; return 'stored' },
  })
  const pending = first.recordOnce(base)
  check(await second.recordOnce(base) === 'duplicate', 'pending storage claim suppresses another instance')
  check(posts === 1, 'concurrent instances create one POST')
  release('stored')
  check(await pending === 'stored', 'first instance settles stored')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createCheckoutCancelObjectionRecorder({
    storage,
    transport: async () => {
      posts += 1
      return posts === 1 ? 'not_stored' : 'stored'
    },
  })
  check(await recorder.recordOnce(base) === 'not_stored', 'confirmed rejection is retryable')
  check(storage.getItem(marker) === null, 'confirmed rejection releases claim')
  check(await recorder.recordOnce(base) === 'stored', 'later bounded attempt can store')
  check(posts === 2, 'retry creates exactly one later POST')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createCheckoutCancelObjectionRecorder({
    storage,
    transport: async () => { posts += 1; return 'ambiguous' },
  })
  check(await recorder.recordOnce(base) === 'ambiguous', 'ambiguous response is explicit')
  check(storage.getItem(marker) === 'pending', 'ambiguous response preserves pending claim')
  check(await recorder.recordOnce(base) === 'duplicate', 'ambiguous response cannot re-POST')
  check(posts === 1, 'ambiguous response posts at most once')
}

{
  const denied = {
    getItem() { throw new Error('denied') },
    setItem() { throw new Error('denied') },
    removeItem() { throw new Error('denied') },
  }
  let posts = 0
  const recorder = policy.createCheckoutCancelObjectionRecorder({
    storage: denied,
    transport: async () => { posts += 1; return 'stored' },
  })
  check(await recorder.recordOnce(base) === 'unavailable', 'storage denial fails closed')
  check(posts === 0, 'storage denial produces zero unowned POSTs')
}

check(pageSource.includes("import CheckoutCancelObjectionTelemetry from './CheckoutCancelObjectionTelemetry'"), 'page imports the real telemetry caller')
check(pageSource.includes('id={CHECKOUT_CANCEL_OBJECTION_TARGET_ID}'), 'real objection box owns target id')
check(pageSource.includes("active={cancelledPrimary === 'checkout' && reasonSent === null}"), 'caller requires resolved checkout state and no selected reason')
check(pageSource.includes('data-checkout-cancel-reason={value}'), 'real reason buttons expose a closed stop marker')
check((pageSource.match(/<CheckoutCancelObjectionTelemetry/g) ?? []).length === 1, 'telemetry mounts exactly once')
check(componentSource.includes("trackClosedEvent(eventName, metadata)"), 'caller uses closed metadata transport')
check(componentSource.includes('IntersectionObserver'), 'caller observes the real box')
check(componentSource.includes("document.visibilityState === 'hidden'"), 'hidden tab cannot emit')
check(componentSource.includes('intersectingAtThreshold = Boolean(entry?.isIntersecting)'), 'geometry remains available when a hidden tab becomes visible again')
check(componentSource.includes("target.addEventListener('click', handleReasonChoice, true)"), 'reason choice is intercepted in capture phase before React state')
check(componentSource.includes('stopAfterChoice()'), 'reason choice stops observation and retries')
check(componentSource.includes('if (!lifecycle.canContinue()) return'), 'late transport result checks lifecycle before any action')
check(componentSource.includes('lifecycle.stop()\n      intersectingAtThreshold = false'), 'cleanup stops lifecycle and clears geometry before timers')
check(componentSource.includes('observer?.disconnect()'), 'observer is cleaned up')
check(componentSource.includes('clearRetry()'), 'retry timer is cleaned up')
check(!componentSource.includes('preventDefault'), 'telemetry never changes navigation')
check(!componentSource.includes('checkout.launch'), 'telemetry never creates checkout')
check(!componentSource.includes('price'), 'telemetry does not introduce price')
check(!componentSource.includes('credit'), 'telemetry does not touch credits')
check(!eventsRouteSource.includes("'checkout_cancel_objection_viewed'"), 'new browser event is not accidentally declared server-only')

console.log(`PASS ${checks}/${checks} — checkout cancellation objection visibility contract`)
