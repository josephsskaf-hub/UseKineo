import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const policyPath = path.join(root, 'lib/growth/checkoutResumeHumanView.ts')
const clientPath = path.join(root, 'components/CheckoutResumeBanner.tsx')
const policySource = fs.readFileSync(policyPath, 'utf8')
const clientSource = fs.readFileSync(clientPath, 'utf8')
const transpiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: policyPath,
})
const module = { exports: {} }
vm.runInNewContext(
  '(function (module, exports) { ' + transpiled.outputText + '\n})(module, module.exports)',
  { module },
)
const policy = module.exports

let checks = 0
function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}
function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message)
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
const immediateClaim = async (_claimName, task) => await task()
function queuedExclusiveClaim() {
  let tail = Promise.resolve()
  return (_claimName, task) => {
    const run = tail.then(task)
    tail = run.then(() => undefined, () => undefined)
    return run
  }
}

const offer = {
  available: true,
  resumeUrl: '/api/stripe/checkout/resume?go=1',
  destinationKind: 'open_session',
  planName: 'Creator',
  tier: 'basic',
  billing: 'monthly',
  currency: 'USD',
  firstChargeAmount: 1500,
  renewalAmount: 1500,
  planFit: {
    engine: 'cinematic_ai',
    engineLabel: 'Seedance',
    monthlyVideos: 3,
    seconds: 60,
    selectedTierMatches: true,
  },
}

equal(policy.CHECKOUT_RESUME_HUMAN_VIEW_VERSION, 'checkout_resume_human_view_v1', 'version is stable')
equal(policy.CHECKOUT_RESUME_CHOICE_VERSION, 'resume_smaller_choice_v1', 'commercial choice version is stable')
equal(policy.CHECKOUT_RESUME_VISIBLE_RATIO, 0.5, 'threshold is 50%')
equal(policy.CHECKOUT_RESUME_DWELL_MS, 1000, 'dwell is one second')
equal(policy.CHECKOUT_RESUME_RETRY_DELAY_MS, 1500, 'retry is bounded')

const metadata = policy.checkoutResumeHumanViewMetadata(offer)
equal(metadata.surface, 'checkout_resume_banner', 'surface is explicit')
equal(metadata.placement, 'global_fixed_bottom', 'placement is explicit')
equal(metadata.actor_unit, 'authenticated_user', 'actor unit is a person')
equal(metadata.event_unit, 'resume_choice_human_view', 'event unit is explicit')
equal(metadata.resume_choice_version, 'resume_smaller_choice_v1', 'metadata joins the commercial variant')
equal(metadata.dedupe_scope, 'browser_tab', 'dedupe scope is honest')
equal(metadata.tier, 'basic', 'tier is categorical')
equal(metadata.billing, 'monthly', 'billing is categorical')
equal(metadata.currency, 'usd', 'currency is normalized')
equal(metadata.destination_kind, 'open_session', 'destination is categorical')
equal(metadata.checkout_origin, 'plan_fit_first_delivery', 'origin identifies plan fit')
equal(metadata.plan_fit_engine, 'cinematic_ai', 'plan-fit engine is retained')
equal(metadata.plan_fit_monthly_videos, 3, 'plan-fit cadence is retained')
equal(metadata.plan_fit_seconds, 60, 'plan-fit duration is retained')
equal(metadata.plan_fit_selected_tier_matches, true, 'plan-fit match is retained')
equal(metadata.visible_ratio, 0.5, 'metadata carries ratio')
equal(metadata.continuous_visible_ms, 1000, 'metadata carries dwell')
equal(metadata.document_visible_required, true, 'visible tab is required')
equal(metadata.two_choices_visible_required, true, 'both choices are the target')
for (const forbidden of ['email', 'user_id', 'session_id', 'url', 'resume_url', 'first_charge_amount', 'renewal_amount', 'price', 'topic', 'text', 'utm_source']) {
  check(!(forbidden in metadata), 'metadata excludes ' + forbidden)
}

const standardOffer = { ...offer, planFit: null }
equal(policy.checkoutResumeHumanViewMetadata(standardOffer).checkout_origin, 'standard', 'standard checkout is separate')
const marker = policy.checkoutResumeHumanViewMarker(offer)
check(marker.includes(policy.CHECKOUT_RESUME_HUMAN_VIEW_VERSION), 'marker carries version')
check(marker.includes('resume_smaller_choice_v1:basic:monthly:usd:open_session'), 'marker carries variant and offer identity')
check(marker !== policy.checkoutResumeHumanViewMarker(offer, 'resume_smaller_choice_v2'), 'new commercial variant gets a new marker')
check(marker !== policy.checkoutResumeHumanViewMarker({ ...offer, destinationKind: 'internal_retry' }), 'destination change creates a new offer key')
check(marker !== policy.checkoutResumeHumanViewMarker({ ...offer, tier: 'starter' }), 'tier change creates a new offer key')
check(!marker.includes('1500'), 'marker excludes monetary amounts')
check(!marker.includes('/api/'), 'marker excludes destination URL')

const eligible = {
  rendered: true,
  stalled: false,
  checkoutPending: false,
  isIntersecting: true,
  intersectionRatio: 0.5,
  documentVisible: true,
}
check(policy.shouldDwellOnCheckoutResume(eligible), 'visible actionable choices qualify')
check(!policy.shouldDwellOnCheckoutResume({ ...eligible, rendered: false }), 'unrendered choices do not qualify')
check(!policy.shouldDwellOnCheckoutResume({ ...eligible, stalled: true }), 'urgent stalled card blocks the denominator')
check(!policy.shouldDwellOnCheckoutResume({ ...eligible, checkoutPending: true }), 'pending checkout blocks the denominator')
check(!policy.shouldDwellOnCheckoutResume({ ...eligible, isIntersecting: false }), 'outside viewport does not qualify')
check(!policy.shouldDwellOnCheckoutResume({ ...eligible, intersectionRatio: 0.499 }), 'below threshold does not qualify')
check(!policy.shouldDwellOnCheckoutResume({ ...eligible, documentVisible: false }), 'hidden tab does not qualify')

const afterDwell = {
  expectedOfferKey: policy.checkoutResumeHumanViewOfferKey(offer),
  currentOfferKey: policy.checkoutResumeHumanViewOfferKey(offer),
  expectedPathname: '/studio',
  currentPathname: '/studio',
  currentPathHidden: false,
  targetConnected: true,
  targetStillCurrent: true,
  stalled: false,
  checkoutPending: false,
  isIntersecting: true,
  intersectionRatio: 0.5,
  documentVisible: true,
}
check(policy.shouldRecordCheckoutResumeAfterDwell(afterDwell), 'live state still qualifies at POST time')
check(!policy.shouldRecordCheckoutResumeAfterDwell({ ...afterDwell, currentOfferKey: null }), 'offer removed before passive cleanup blocks old timer')
check(!policy.shouldRecordCheckoutResumeAfterDwell({ ...afterDwell, currentPathname: '/pricing' }), 'path change before passive cleanup blocks old timer')
check(!policy.shouldRecordCheckoutResumeAfterDwell({ ...afterDwell, currentPathHidden: true }), 'hidden destination blocks old timer')
check(!policy.shouldRecordCheckoutResumeAfterDwell({ ...afterDwell, stalled: true }), 'stalled card appearing before cleanup blocks old timer')
check(!policy.shouldRecordCheckoutResumeAfterDwell({ ...afterDwell, checkoutPending: true }), 'checkout starting before cleanup blocks old timer')
check(!policy.shouldRecordCheckoutResumeAfterDwell({ ...afterDwell, targetConnected: false }), 'detached target blocks old timer')
check(!policy.shouldRecordCheckoutResumeAfterDwell({ ...afterDwell, targetStillCurrent: false }), 'replaced target blocks old timer')

{
  let nextId = 0
  const timers = new Map()
  let calls = 0
  const controller = policy.createCheckoutResumeDwellController({
    onDwell: () => { calls += 1 },
    setTimer: (callback, delayMs) => {
      const id = ++nextId
      timers.set(id, { callback, delayMs })
      return id
    },
    clearTimer: (id) => timers.delete(id),
  })
  controller.update(eligible)
  equal(timers.size, 1, 'eligible choices schedule once')
  equal([...timers.values()][0].delayMs, 1000, 'timer uses dwell contract')
  controller.update({ intersectionRatio: 0.49 })
  equal(timers.size, 0, 'leaving threshold resets dwell')
  controller.update({ intersectionRatio: 0.5 })
  controller.update({ stalled: true })
  equal(timers.size, 0, 'covering with stalled checkout resets dwell')
  controller.update({ stalled: false })
  equal(timers.size, 1, 'uncovering starts a fresh dwell')
  const [id, timer] = [...timers.entries()][0]
  timers.delete(id)
  timer.callback()
  equal(calls, 1, 'continuous dwell fires once')
  controller.update({ documentVisible: false })
  controller.update({ documentVisible: true })
  equal(timers.size, 0, 'visibility changes do not duplicate after fire')
  controller.rearm()
  equal(timers.size, 1, 'confirmed rejection can rearm')
  controller.stop()
  check(timers.size === 0 && !controller.canContinue(), 'stop clears lifecycle')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createCheckoutResumeRecorder({
    offer,
    storage,
    withExclusiveClaim: immediateClaim,
    transport: async (eventName, sentMetadata) => {
      posts += 1
      equal(eventName, 'checkout_resume_choice_viewed', 'event name is human-specific')
      equal(sentMetadata.version, policy.CHECKOUT_RESUME_HUMAN_VIEW_VERSION, 'transport receives version')
      equal(storage.getItem(marker), 'pending', 'claim precedes POST')
      return 'stored'
    },
  })
  equal(await recorder.recordOnce(), 'stored', 'stored result is returned')
  equal(storage.getItem(marker), 'stored', 'stored result closes marker')
  equal(await recorder.recordOnce(), 'duplicate', 'stored marker dedupes')
  equal(posts, 1, 'stored view posts once')
}

{
  const storage = fakeStorage()
  let release
  let signalStarted
  const started = new Promise((resolve) => { signalStarted = resolve })
  let posts = 0
  const recorder = policy.createCheckoutResumeRecorder({
    offer,
    storage,
    withExclusiveClaim: immediateClaim,
    transport: async () => {
      posts += 1
      signalStarted()
      return await new Promise((resolve) => { release = resolve })
    },
  })
  const first = recorder.recordOnce()
  await started
  equal(await recorder.recordOnce(), 'duplicate', 'same recorder rejects a concurrent duplicate')
  equal(posts, 1, 'same recorder has one in-flight POST')
  release('stored')
  equal(await first, 'stored', 'original in-flight POST can settle')
}

{
  const firstTabStorage = fakeStorage()
  const secondTabStorage = fakeStorage()
  let posts = 0
  const withExclusiveClaim = queuedExclusiveClaim()
  const makeRecorder = (storage) => policy.createCheckoutResumeRecorder({
    offer,
    storage,
    withExclusiveClaim,
    transport: async () => {
      posts += 1
      return 'stored'
    },
  })
  equal(await makeRecorder(firstTabStorage).recordOnce(), 'stored', 'first browser tab records')
  equal(await makeRecorder(secondTabStorage).recordOnce(), 'stored', 'second browser tab records independently')
  equal(posts, 2, 'sessionStorage dedupe is explicitly per browser tab')
}

{
  const recorder = policy.createCheckoutResumeRecorder({
    offer,
    storage: fakeStorage(),
    withExclusiveClaim: async () => { throw new Error('lock rejected') },
    transport: async () => 'stored',
  })
  equal(await recorder.recordOnce(), 'unavailable', 'lock rejection fails closed')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createCheckoutResumeRecorder({
    offer: { ...offer, tier: 'starter' },
    storage,
    withExclusiveClaim: immediateClaim,
    transport: async () => {
      posts += 1
      return posts === 1 ? 'not_stored' : 'stored'
    },
  })
  equal(await recorder.recordOnce(), 'not_stored', 'confirmed rejection is returned')
  equal(storage.values.size, 0, 'confirmed rejection reopens marker')
  equal(await recorder.recordOnce(), 'stored', 'bounded later retry can store')
  equal(posts, 2, 'retry posts exactly once more')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createCheckoutResumeRecorder({
    offer: { ...offer, tier: 'pro' },
    storage,
    withExclusiveClaim: immediateClaim,
    transport: async () => { posts += 1; return 'ambiguous' },
  })
  equal(await recorder.recordOnce(), 'ambiguous', 'ambiguous result is returned')
  equal(await recorder.recordOnce(), 'duplicate', 'ambiguous result is terminal')
  equal(posts, 1, 'ambiguous result never blindly reposts')
}

{
  const storage = {
    getItem() { return null },
    setItem() { throw new Error('storage blocked') },
    removeItem() {},
  }
  const recorder = policy.createCheckoutResumeRecorder({
    offer,
    storage,
    withExclusiveClaim: immediateClaim,
    transport: async () => 'stored',
  })
  equal(await recorder.recordOnce(), 'unavailable', 'blocked storage fails closed')
  check(!recorder.wasSettled(), 'blocked storage leaves no false terminal latch')
}

{
  const storage = fakeStorage()
  const withExclusiveClaim = queuedExclusiveClaim()
  let releaseFirst
  let firstStarted
  const started = new Promise((resolve) => { firstStarted = resolve })
  let posts = 0
  const first = policy.createCheckoutResumeRecorder({
    offer,
    storage,
    withExclusiveClaim,
    transport: async () => {
      posts += 1
      firstStarted()
      return await new Promise((resolve) => { releaseFirst = resolve })
    },
  })
  const second = policy.createCheckoutResumeRecorder({
    offer,
    storage,
    withExclusiveClaim,
    transport: async () => {
      posts += 1
      return 'stored'
    },
  })
  const firstResult = first.recordOnce()
  await started
  check(!second.wasSettled(), 'external pending claim is not falsely terminal')
  const secondResult = second.recordOnce()
  await Promise.resolve()
  equal(posts, 1, 'remount waits for the live writer lock')
  releaseFirst('not_stored')
  equal(await firstResult, 'not_stored', 'first mount exposes confirmed rejection')
  equal(await secondResult, 'stored', 'waiting remount retries after rejection')
  equal(posts, 2, 'remount path performs one bounded retry')
}

check(clientSource.includes('trackClosedEvent(eventName, metadata)'), 'client waits for closed ACK')
check(clientSource.includes('ref={choiceRef}'), 'observer targets the real two-choice group')
check(clientSource.includes('humanViewStateRef.current = {'), 'render updates live invalidation state')
check(clientSource.includes('target.isConnected'), 'detached target is rejected at POST time')
check(clientSource.includes('choiceRef.current === target'), 'replaced target is rejected at POST time')
check(clientSource.includes('shouldRecordCheckoutResumeAfterDwell'), 'client runs the live race guard')
check(clientSource.includes("document.visibilityState === 'visible'"), 'client requires visible tab')
check(clientSource.includes('navigator.locks'), 'client serializes remount claims')
check(clientSource.includes('typeof IntersectionObserver'), 'client requires measurable visibility')
check(clientSource.includes('CHECKOUT_RESUME_VISIBLE_RATIO'), 'observer uses policy threshold')
check(clientSource.includes('CHECKOUT_RESUME_RETRY_DELAY_MS'), 'client uses bounded retry delay')
check(clientSource.includes("trackEvent('checkout_resume_banner_viewed'"), 'technical availability denominator is preserved')
check(clientSource.includes('resume_choice_version: CHECKOUT_RESUME_CHOICE_VERSION'), 'legacy event joins the same commercial version')
check(clientSource.includes('humanViewStopRef.current?.()'), 'actions stop the dwell immediately')
check(clientSource.includes('[checkout.pending, offer, pathname, stalled]'), 'every visibility invalidator restarts the effect')
check(policySource.includes("'checkout_resume_choice_viewed'"), 'human event is declared in the policy')

console.log('checkout-resume-human-view: ' + checks + '/' + checks + ' checks passed')
