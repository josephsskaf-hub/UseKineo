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
const check = (condition, label) => { assert.ok(condition, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

const policySource = read('lib/growth/trialDowngradeHumanView.ts')
const componentSource = read('components/TrialDowngradeModal.tsx')
const compiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleBox = { exports: {} }
const localRequire = (id) => {
  if (id === '@/lib/growth/trialDowngradePlanChoice') {
    return { TRIAL_DOWNGRADE_PLAN_CHOICE_VERSION: 'trial_downgrade_plan_choice_v1' }
  }
  throw new Error(`unexpected test import: ${id}`)
}
new Function('module', 'exports', 'require', compiled)(moduleBox, moduleBox.exports, localRequire)
const policy = moduleBox.exports

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, value) },
    removeItem(key) { values.delete(key) },
  }
}

const immediateExclusiveClaim = async (_claimName, task) => task()
function serialExclusiveClaim() {
  let tail = Promise.resolve()
  return async (_claimName, task) => {
    const previous = tail
    let release
    tail = new Promise((resolve) => { release = resolve })
    await previous
    try { return await task() } finally { release() }
  }
}

equal(policy.TRIAL_DOWNGRADE_HUMAN_VIEW_VERSION, 'trial_downgrade_offer_view_v2', 'version reflects the journey-aware primary action')
equal(policy.TRIAL_DOWNGRADE_HUMAN_VIEW_RATIO, 0.6, 'primary CTA requires 60% visibility')
equal(policy.TRIAL_DOWNGRADE_HUMAN_VIEW_DWELL_MS, 1000, 'human view requires one continuous second')
equal(policy.TRIAL_DOWNGRADE_HUMAN_VIEW_RETRY_DELAY_MS, 1500, 'confirmed rejection retry is delayed')

const metadata = policy.trialDowngradeHumanViewMetadata('first_value')
equal(metadata.version, policy.TRIAL_DOWNGRADE_HUMAN_VIEW_VERSION, 'metadata carries measurement version')
equal(metadata.offer_version, 'trial_downgrade_plan_choice_v1', 'metadata names the preserved offer variant')
equal(metadata.surface, 'trial_downgrade_modal', 'metadata names the finite surface')
equal(metadata.actor_unit, 'authenticated_user', 'event unit is an authenticated person')
equal(metadata.event_unit, 'account_primary_offer_human_view', 'event unit is one account-level primary offer view')
equal(metadata.measurement_unit, 'authenticated_user_trial_downgrade_primary_cta_human_view', 'measurement unit is explicit')
equal(metadata.visible_ratio, 0.6, 'metadata declares the CTA viewport ratio')
equal(metadata.continuous_visible_ms, 1000, 'metadata declares continuous dwell')
equal(metadata.document_visible_required, true, 'metadata declares visible-tab requirement')
equal(metadata.decision_ready, true, 'event is only valid after price decision state resolves')
equal(metadata.currency_resolved, true, 'event declares resolved currency')
equal(metadata.display_currency, 'usd', 'event matches the founder-approved USD-only journey')
equal(metadata.human_exposure_claimed, true, 'event explicitly claims human exposure')
equal(metadata.journey_state, 'first_value', 'event distinguishes the pre-value journey')
equal(metadata.primary_action, 'make_first_film', 'event names the primary action actually observed')
for (const forbidden of ['email', 'url', 'path', 'prompt', 'script', 'topic', 'user_id', 'session_id', 'price', 'amount', 'credits']) {
  check(!(forbidden in metadata), `closed metadata excludes ${forbidden}`)
}

const markerA = policy.trialDowngradeHumanViewMarker('account-a')
const markerB = policy.trialDowngradeHumanViewMarker('account-b')
check(markerA !== markerB, 'account marker cannot leak a view across accounts')
check(markerA.includes(policy.TRIAL_DOWNGRADE_HUMAN_VIEW_VERSION), 'marker carries the measurement version')

const eligible = {
  open: true,
  decisionReady: true,
  ctaActionable: true,
  isIntersecting: true,
  intersectionRatio: 0.6,
  documentVisible: true,
}
check(policy.shouldDwellOnTrialDowngradeHumanView(eligible), '60% visible decision-ready CTA qualifies')
check(!policy.shouldDwellOnTrialDowngradeHumanView({ ...eligible, open: false }), 'closed modal never qualifies')
check(!policy.shouldDwellOnTrialDowngradeHumanView({ ...eligible, decisionReady: false }), 'unresolved price never qualifies')
check(!policy.shouldDwellOnTrialDowngradeHumanView({ ...eligible, ctaActionable: false }), 'disabled or already-clicked CTA never qualifies')
check(!policy.shouldDwellOnTrialDowngradeHumanView({ ...eligible, isIntersecting: false }), 'non-intersection never qualifies')
check(!policy.shouldDwellOnTrialDowngradeHumanView({ ...eligible, intersectionRatio: 0.599 }), 'less than 60% never qualifies')
check(!policy.shouldDwellOnTrialDowngradeHumanView({ ...eligible, documentVisible: false }), 'non-visible document never qualifies')

{
  let nextTimerId = 0
  const timers = new Map()
  let dwellCalls = 0
  const controller = policy.createTrialDowngradeHumanViewDwellController({
    onDwell: () => { dwellCalls += 1 },
    setTimer: (callback, delayMs) => {
      const id = ++nextTimerId
      timers.set(id, { callback, delayMs })
      return id
    },
    clearTimer: (id) => { timers.delete(id) },
  })
  controller.update(eligible)
  equal(timers.size, 1, 'eligible offer starts one dwell timer')
  equal([...timers.values()][0].delayMs, 1000, 'scheduled dwell uses the canonical delay')
  controller.update({ decisionReady: false })
  equal(timers.size, 0, 'losing decision readiness resets dwell')
  controller.update({ decisionReady: true })
  controller.update({ documentVisible: false })
  equal(timers.size, 0, 'backgrounding resets the continuous dwell')
  controller.update({ documentVisible: true })
  equal(timers.size, 1, 'returning visible starts a fresh full dwell')
  controller.update({ intersectionRatio: 0.59 })
  equal(timers.size, 0, 'dropping below threshold cancels dwell')
  controller.update({ intersectionRatio: 0.6 })
  const [timerId, timer] = [...timers.entries()][0]
  timers.delete(timerId)
  timer.callback()
  equal(dwellCalls, 1, 'one continuous dwell fires exactly once')
  controller.update({ documentVisible: false })
  controller.update({ documentVisible: true })
  equal(timers.size, 0, 'completed controller does not duplicate')
  controller.rearm()
  equal(timers.size, 1, 'confirmed not-stored outcome may rearm')
  controller.stop()
  equal(timers.size, 0, 'unmount clears a rearmed timer')
  check(!controller.canContinue(), 'stopped controller is terminal')
}

{
  let eligibleNow = true
  let nextTimerId = 0
  const timers = new Map()
  let retryCalls = 0
  const retry = policy.createTrialDowngradeHumanViewRetryController({
    qualifies: () => eligibleNow,
    onRetry: () => { retryCalls += 1 },
    setTimer: (callback, delayMs) => {
      const id = ++nextTimerId
      timers.set(id, { callback, delayMs })
      return id
    },
    clearTimer: (id) => { timers.delete(id) },
  })
  check(retry.request(), 'first confirmed rejection requests one retry')
  equal(timers.size, 1, 'eligible rejection schedules retry')
  equal([...timers.values()][0].delayMs, 1500, 'retry uses canonical delay')
  eligibleNow = false
  retry.update()
  equal(timers.size, 0, 'hiding or scrolling CTA cancels retry timer without losing intent')
  check(retry.isPending(), 'retry remains pending while CTA is not human-visible')
  eligibleNow = true
  retry.update()
  equal(timers.size, 1, 'returning visible reschedules the same pending retry')
  const [retryTimerId, retryTimer] = [...timers.entries()][0]
  timers.delete(retryTimerId)
  retryTimer.callback()
  equal(retryCalls, 1, 'resumed retry fires once')
  check(!retry.isPending(), 'completed retry clears pending state')
  check(!retry.request(), 'one mount cannot request a second retry')
  retry.stop()
}

{
  let eligibleNow = true
  let nextTimerId = 0
  const timers = new Map()
  let retryCalls = 0
  const retry = policy.createTrialDowngradeHumanViewRetryController({
    qualifies: () => eligibleNow,
    onRetry: () => { retryCalls += 1 },
    setTimer: (callback) => {
      const id = ++nextTimerId
      timers.set(id, callback)
      return id
    },
    clearTimer: (id) => { timers.delete(id) },
  })
  check(retry.request(), 'not-stored response can arm its one retry')
  equal(timers.size, 1, 'retry is pending before a person chooses')
  retry.stop()
  equal(timers.size, 0, 'click or dismissal cancels a pending retry')
  eligibleNow = false
  retry.update()
  eligibleNow = true
  retry.update()
  equal(retryCalls, 0, 'stopped retry never resurrects after navigation state changes')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'stored-account',
    journeyState: 'first_value',
    storage,
    withExclusiveClaim: immediateExclusiveClaim,
    transport: async (eventName, sentMetadata) => {
      posts += 1
      equal(eventName, 'trial_downgrade_offer_viewed', 'recorder emits the closed event name')
      equal(sentMetadata.human_exposure_claimed, true, 'closed metadata reaches transport')
      return 'stored'
    },
  })
  equal(await recorder.recordOnce(), 'stored', 'stored outcome is returned')
  equal(storage.getItem(policy.trialDowngradeHumanViewMarker('stored-account')), 'stored', 'stored outcome closes account marker')
  equal(await recorder.recordOnce(), 'duplicate', 'same account cannot post twice')
  equal(posts, 1, 'stored view posts exactly once')
  const remount = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'stored-account', journeyState: 'first_value', storage, withExclusiveClaim: immediateExclusiveClaim, transport: async () => { throw new Error('must not run') },
  })
  check(remount.wasSettled(), 'stored account remains deduped across remounts')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'retry-account', journeyState: 'delivered', storage, withExclusiveClaim: immediateExclusiveClaim,
    transport: async () => (++posts === 1 ? 'not_stored' : 'stored'),
  })
  equal(await recorder.recordOnce(), 'not_stored', 'confirmed rejection is returned')
  equal(storage.getItem(policy.trialDowngradeHumanViewMarker('retry-account')), null, 'confirmed rejection reopens marker')
  equal(await recorder.recordOnce(), 'stored', 'one later retry may store')
  equal(posts, 2, 'retry path sends exactly two posts')
}

{
  const storage = fakeStorage()
  const recorder = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'ambiguous-account', journeyState: 'unknown', storage, withExclusiveClaim: immediateExclusiveClaim, transport: async () => 'ambiguous',
  })
  equal(await recorder.recordOnce(), 'ambiguous', 'ambiguous outcome is returned')
  equal(storage.getItem(policy.trialDowngradeHumanViewMarker('ambiguous-account')), 'pending', 'ambiguous outcome remains terminal to avoid duplicates')
  equal(await recorder.recordOnce(), 'duplicate', 'ambiguous transport cannot repost blindly')
}

{
  let resolveTransport
  const storage = fakeStorage()
  const recorder = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'concurrent-account', journeyState: 'first_value', storage, withExclusiveClaim: immediateExclusiveClaim,
    transport: () => new Promise((resolve) => { resolveTransport = resolve }),
  })
  const first = recorder.recordOnce()
  equal(await recorder.recordOnce(), 'duplicate', 'in-flight account cannot start a second POST')
  resolveTransport('stored')
  equal(await first, 'stored', 'original in-flight POST can finish')
}

{
  const recorder = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'no-storage', journeyState: 'first_value', storage: null, withExclusiveClaim: immediateExclusiveClaim, transport: async () => 'stored',
  })
  equal(await recorder.recordOnce(), 'unavailable', 'missing account storage fails measurement closed')
}

{
  const recorder = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'no-lock', journeyState: 'first_value', storage: fakeStorage(), transport: async () => 'stored',
  })
  equal(await recorder.recordOnce(), 'unavailable', 'missing cross-tab lock fails measurement closed')
}

{
  const storage = fakeStorage()
  const withExclusiveClaim = serialExclusiveClaim()
  let posts = 0
  const firstTab = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'two-tabs', journeyState: 'first_value', storage, withExclusiveClaim,
    transport: async () => { posts += 1; return 'stored' },
  })
  const secondTab = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'two-tabs', journeyState: 'first_value', storage, withExclusiveClaim,
    transport: async () => { posts += 1; return 'stored' },
  })
  const outcomes = await Promise.all([firstTab.recordOnce(), secondTab.recordOnce()])
  check(outcomes.includes('stored') && outcomes.includes('duplicate'), 'two tabs serialize to one stored view and one duplicate')
  equal(posts, 1, 'two recorder instances can emit only one POST')
}

{
  const storage = fakeStorage()
  const withExclusiveClaim = serialExclusiveClaim()
  let resolveFirst
  let posts = 0
  const firstTab = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'pending-then-rejected', journeyState: 'delivered', storage, withExclusiveClaim,
    transport: () => {
      posts += 1
      return new Promise((resolve) => { resolveFirst = resolve })
    },
  })
  const secondTab = policy.createTrialDowngradeHumanViewRecorder({
    userKey: 'pending-then-rejected', journeyState: 'delivered', storage, withExclusiveClaim,
    transport: async () => { posts += 1; return 'stored' },
  })
  const first = firstTab.recordOnce()
  await Promise.resolve()
  await Promise.resolve()
  equal(storage.getItem(policy.trialDowngradeHumanViewMarker('pending-then-rejected')), 'pending', 'first tab exposes pending while holding the lock')
  check(!secondTab.wasSettled(), 'pending from another tab is not terminal outside the lock')
  const second = secondTab.recordOnce()
  resolveFirst('not_stored')
  equal(await first, 'not_stored', 'first tab can receive a confirmed rejection')
  equal(await second, 'stored', 'waiting tab rechecks after rejection and stores the view')
  equal(posts, 2, 'second POST occurs only after the first was confirmed not stored')
}

check(componentSource.includes('createTrialDowngradeHumanViewDwellController'), 'real modal uses behavior-tested dwell controller')
check(componentSource.includes('createTrialDowngradeHumanViewRetryController'), 'real modal uses behavior-tested retry controller')
check(componentSource.includes('trackClosedEvent(eventName, metadata)'), 'view event cannot inherit free-form URL UTMs')
check(componentSource.includes('new IntersectionObserver'), 'real modal observes the primary offer CTA')
check(componentSource.includes('threshold: [TRIAL_DOWNGRADE_HUMAN_VIEW_RATIO]'), 'caller uses canonical 60% threshold')
check(componentSource.includes("document.visibilityState === 'visible'"), 'only strictly visible document can emit')
check(!componentSource.includes("document.visibilityState !== 'hidden'"), 'prerender-like states cannot count as human-visible')
check(componentSource.includes('if (!open || currency === null) return'), 'unresolved money state cannot emit offer exposure')
check(componentSource.includes('decisionReady: currency !== null'), 'policy receives explicit decision-ready state')
check(componentSource.includes('ctaActionable: !target.disabled'), 'disabled or already-clicked CTA cannot qualify')
check(componentSource.includes('navigator.locks'), 'caller requires a browser-wide exclusive claim')
check(componentSource.includes('withExclusiveClaim:'), 'cross-tab claim wraps event persistence')
check((componentSource.match(/humanViewStopRef\.current\?\.\(\)/g) ?? []).length >= 3, 'every direct choice cancels dwell before its event')
check(componentSource.indexOf('if (!dwell?.canContinue()) return') < componentSource.indexOf('retry.request()'), 'late persistence response cannot rearm after a person acts')
check(componentSource.includes('TRIAL_DOWNGRADE_HUMAN_VIEW_DWELL_MS'), 'caller enforces continuous one-second dwell')
check(/<button\s+ref=\{primaryOfferCtaRef\}\s+type="button"/.test(componentSource), 'ref is an attribute of the real primary CTA opening tag')
check(!componentSource.includes('ref={overlayRef}'), 'fixed backdrop is never the exposure target')
check(componentSource.includes("result === 'not_stored'"), 'only confirmed rejection requests retry')
check(!componentSource.includes('trial_downgrade_offer_viewed\','), 'component cannot hand-write event payload outside the policy')

console.log(`PASS — ${checks}/${checks} trial downgrade human-view checks`)
