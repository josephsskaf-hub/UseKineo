import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const policyPath = path.join(root, 'lib/growth/historyFirstVideoOfferHumanView.ts')
const clientPath = path.join(root, 'app/(dashboard)/history/HistoryClient.tsx')
const policySource = fs.readFileSync(policyPath, 'utf8')
const clientSource = fs.readFileSync(clientPath, 'utf8')
const transpiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: policyPath,
})
const module = { exports: {} }
vm.runInNewContext(`(function (module, exports) { ${transpiled.outputText}\n})(module, module.exports)`, { module })
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
const immediateClaim = async (_claimName, task) => await task()
function queuedExclusiveClaim() {
  let tail = Promise.resolve()
  return (_claimName, task) => {
    const run = tail.then(task)
    tail = run.then(() => undefined, () => undefined)
    return run
  }
}

check(policy.HISTORY_FIRST_VIDEO_OFFER_HUMAN_VIEW_VERSION === 'history_first_video_human_view_v2', 'version is stable')
check(policy.HISTORY_FIRST_VIDEO_OFFER_VISIBLE_RATIO === 0.5, 'threshold is 50%')
check(policy.HISTORY_FIRST_VIDEO_OFFER_DWELL_MS === 1000, 'dwell is one second')
check(policy.HISTORY_FIRST_VIDEO_OFFER_RETRY_DELAY_MS === 1500, 'retry is bounded')

const metadata = policy.historyFirstVideoOfferHumanViewMetadata()
check(metadata.surface === 'history_milestone', 'surface is real')
check(metadata.placement === 'secondary', 'placement is explicit')
check(metadata.actor_unit === 'authenticated_user', 'actor unit is explicit')
check(metadata.event_unit === 'first_completed_video_offer_human_view', 'event unit is explicit')
check(metadata.completed_video_count === 1, 'cohort is first video')
check(metadata.visible_ratio === 0.5, 'metadata carries ratio')
check(metadata.continuous_visible_ms === 1000, 'metadata carries dwell')
check(metadata.document_visible_required === true, 'visible tab is required')
check(metadata.cta_actionable_required === true, 'actionable CTA is required')
for (const forbidden of ['email', 'video_id', 'url', 'topic', 'text', 'price', 'amount', 'session_id', 'utm_source']) {
  check(!(forbidden in metadata), `metadata excludes ${forbidden}`)
}

const markerA = policy.historyFirstVideoOfferHumanViewMarker('video-a')
const markerB = policy.historyFirstVideoOfferHumanViewMarker('video-b')
check(markerA.includes(policy.HISTORY_FIRST_VIDEO_OFFER_HUMAN_VIEW_VERSION), 'marker carries version')
check(markerA !== markerB, 'different videos have different markers')

const eligible = {
  eligible: true,
  ctaActionable: true,
  isIntersecting: true,
  intersectionRatio: 0.5,
  documentVisible: true,
}
check(policy.shouldDwellOnHistoryFirstVideoOffer(eligible), 'eligible CTA qualifies')
check(!policy.shouldDwellOnHistoryFirstVideoOffer({ ...eligible, eligible: false }), 'ineligible does not qualify')
check(!policy.shouldDwellOnHistoryFirstVideoOffer({ ...eligible, ctaActionable: false }), 'disabled does not qualify')
check(!policy.shouldDwellOnHistoryFirstVideoOffer({ ...eligible, isIntersecting: false }), 'outside viewport does not qualify')
check(!policy.shouldDwellOnHistoryFirstVideoOffer({ ...eligible, intersectionRatio: 0.499 }), 'below threshold does not qualify')
check(!policy.shouldDwellOnHistoryFirstVideoOffer({ ...eligible, documentVisible: false }), 'hidden tab does not qualify')

{
  let nextId = 0
  const timers = new Map()
  let calls = 0
  const controller = policy.createHistoryFirstVideoOfferDwellController({
    onDwell: () => { calls += 1 },
    setTimer: (callback, delayMs) => {
      const id = ++nextId
      timers.set(id, { callback, delayMs })
      return id
    },
    clearTimer: (id) => timers.delete(id),
  })
  controller.update(eligible)
  check(timers.size === 1, 'eligible CTA schedules once')
  check([...timers.values()][0].delayMs === 1000, 'timer uses dwell contract')
  controller.update({ intersectionRatio: 0.49 })
  check(timers.size === 0, 'leaving threshold resets dwell')
  controller.update({ intersectionRatio: 0.5 })
  controller.update({ eligible: false })
  check(timers.size === 0, 'covering the CTA cancels the partial dwell')
  controller.update({ eligible: true })
  check(timers.size === 1, 'uncovering the CTA starts a full fresh dwell')
  const [id, timer] = [...timers.entries()][0]
  timers.delete(id)
  timer.callback()
  check(calls === 1, 'continuous dwell fires once')
  controller.update({ documentVisible: false })
  controller.update({ documentVisible: true })
  check(timers.size === 0, 'visibility changes do not duplicate after fire')
  controller.rearm()
  check(timers.size === 1, 'confirmed rejection can rearm')
  controller.stop()
  check(timers.size === 0 && !controller.canContinue(), 'stop clears lifecycle')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createHistoryFirstVideoOfferRecorder({
    videoKey: 'video-a',
    storage,
    withExclusiveClaim: immediateClaim,
    transport: async (eventName, sentMetadata) => {
      posts += 1
      check(eventName === 'history_first_video_offer_viewed', 'event name remains compatible')
      check(sentMetadata.version === policy.HISTORY_FIRST_VIDEO_OFFER_HUMAN_VIEW_VERSION, 'transport receives v2')
      check(storage.getItem(markerA) === 'pending', 'claim precedes POST')
      return 'stored'
    },
  })
  check(await recorder.recordOnce() === 'stored', 'stored result is returned')
  check(storage.getItem(markerA) === 'stored', 'stored result closes marker')
  check(await recorder.recordOnce() === 'duplicate', 'stored marker dedupes')
  check(posts === 1, 'stored view posts once')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createHistoryFirstVideoOfferRecorder({
    videoKey: 'video-retry',
    storage,
    withExclusiveClaim: immediateClaim,
    transport: async () => {
      posts += 1
      return posts === 1 ? 'not_stored' : 'stored'
    },
  })
  check(await recorder.recordOnce() === 'not_stored', 'confirmed rejection is returned')
  check(storage.values.size === 0, 'confirmed rejection reopens marker')
  check(await recorder.recordOnce() === 'stored', 'later retry can store')
  check(posts === 2, 'retry posts exactly once more')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createHistoryFirstVideoOfferRecorder({
    videoKey: 'video-ambiguous',
    storage,
    withExclusiveClaim: immediateClaim,
    transport: async () => { posts += 1; return 'ambiguous' },
  })
  check(await recorder.recordOnce() === 'ambiguous', 'ambiguous result is returned')
  check(storage.values.has(policy.historyFirstVideoOfferHumanViewMarker('video-ambiguous')), 'ambiguous result closes a durable marker')
  check(await recorder.recordOnce() === 'duplicate', 'ambiguous result is terminal')
  check(posts === 1, 'ambiguous result never blindly reposts')
}

{
  const storage = {
    getItem() { return null },
    setItem() { throw new Error('storage blocked') },
    removeItem() {},
  }
  const recorder = policy.createHistoryFirstVideoOfferRecorder({
    videoKey: 'video-storage-blocked',
    storage,
    withExclusiveClaim: immediateClaim,
    transport: async () => 'stored',
  })
  check(await recorder.recordOnce() === 'unavailable', 'blocked storage fails closed')
  check(!recorder.wasSettled(), 'blocked storage does not leave a false in-flight latch')
}

{
  const storage = fakeStorage()
  const withExclusiveClaim = queuedExclusiveClaim()
  let releaseFirst
  let firstStarted
  const started = new Promise((resolve) => { firstStarted = resolve })
  let posts = 0
  const first = policy.createHistoryFirstVideoOfferRecorder({
    videoKey: 'video-remount',
    storage,
    withExclusiveClaim,
    transport: async () => {
      posts += 1
      firstStarted()
      return await new Promise((resolve) => { releaseFirst = resolve })
    },
  })
  const second = policy.createHistoryFirstVideoOfferRecorder({
    videoKey: 'video-remount',
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
  check(posts === 1, 'remount waits for the live writer lock')
  releaseFirst('not_stored')
  check(await firstResult === 'not_stored', 'first mount exposes confirmed rejection')
  check(await secondResult === 'stored', 'waiting remount retries after confirmed rejection')
  check(posts === 2, 'remount path performs exactly one bounded retry')
}

check(clientSource.includes('trackClosedEvent(eventName, metadata)'), 'client waits for event ACK')
check(clientSource.includes('ref={firstVideoSubscriptionRecovery ? firstVideoOfferCtaRef : undefined}'), 'observer targets the real CTA')
check(clientSource.includes("document.visibilityState === 'visible'"), 'client requires visible tab')
check(clientSource.includes('completedVideos.length !== 1'), 'effect is first-video only')
check(clientSource.includes('checkout.pending !== null'), 'pending checkout cannot become a view denominator')
check(clientSource.includes('lightbox !== null'), 'lightbox coverage cancels the human-view effect')
check(clientSource.includes('lightbox === null'), 'qualifier requires an uncovered CTA')
check(clientSource.includes('navigator.locks'), 'client serializes remount claims')
check(clientSource.includes("trackClosedEvent('history_first_video_offer_rendered'"), 'technical render denominator remains explicit')
check(clientSource.includes("version: 'history_first_video_rendered_v1'"), 'technical denominator has a separate version')
check(!clientSource.includes("firstVideo ? 'history_first_video_offer_viewed'"), 'mount-based first-video ternary is gone')
check(clientSource.indexOf('firstVideoOfferHumanViewStopRef.current?.()') > clientSource.indexOf('if (!started) return'), 'only a launched checkout stops the dwell')

console.log(`history-first-video-offer-human-view: ${checks}/${checks} checks passed`)
