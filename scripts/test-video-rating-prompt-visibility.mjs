import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const policyPath = path.join(root, 'lib/growth/videoRatingPromptVisibility.ts')
const componentPath = path.join(root, 'components/VideoRatingAsk.tsx')
const eventsRoutePath = path.join(root, 'app/api/events/route.ts')
const policySource = fs.readFileSync(policyPath, 'utf8')
const componentSource = fs.readFileSync(componentPath, 'utf8')
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

check(policy.VIDEO_RATING_PROMPT_VISIBILITY_VERSION === 'video_rating_prompt_visibility_v1', 'version is stable')
check(policy.VIDEO_RATING_PROMPT_VISIBLE_RATIO === 0.5, 'view threshold is 50%')
check(policy.VIDEO_RATING_PROMPT_DWELL_MS === 1000, 'continuous dwell is one second')
check(policy.videoRatingPromptRenderBucket(1) === 'first', 'first render is bucketed as first')
check(policy.videoRatingPromptRenderBucket(2) === 'repeat', 'later render is bucketed as repeat')

const metadata = policy.videoRatingPromptMetadata('first')
check(Object.keys(metadata).length === 3, 'metadata has exactly three closed keys')
check(metadata.version === policy.VIDEO_RATING_PROMPT_VISIBILITY_VERSION, 'metadata carries version')
check(metadata.surface === 'post_download_rating', 'surface is categorical')
check(metadata.render_count_bucket === 'first', 'render count is bucketed')
for (const forbidden of ['email', 'url', 'price', 'amount', 'session_id', 'video_id', 'video_title', 'rating', 'text', 'utm_source']) {
  check(!(forbidden in metadata), `metadata excludes ${forbidden}`)
}

const marker = policy.videoRatingPromptMarker()
check(marker.includes(policy.VIDEO_RATING_PROMPT_VISIBILITY_VERSION), 'session marker includes version')
check(!marker.includes('first') && !marker.includes('repeat'), 'one marker protects the entire session')

const eligible = {
  downloaded: true,
  answered: false,
  isIntersecting: true,
  intersectionRatio: 0.5,
  documentVisible: true,
}
check(policy.shouldDwellOnVideoRatingPrompt(eligible), '50% visible after download qualifies')
check(!policy.shouldDwellOnVideoRatingPrompt({ ...eligible, downloaded: false }), 'no download never qualifies')
check(!policy.shouldDwellOnVideoRatingPrompt({ ...eligible, answered: true }), 'answer stops the dwell')
check(!policy.shouldDwellOnVideoRatingPrompt({ ...eligible, isIntersecting: false }), 'non-intersection never qualifies')
check(!policy.shouldDwellOnVideoRatingPrompt({ ...eligible, intersectionRatio: 0.499 }), 'less than 50% never qualifies')
check(!policy.shouldDwellOnVideoRatingPrompt({ ...eligible, documentVisible: false }), 'hidden tab never qualifies')

{
  let nextTimerId = 0
  const timers = new Map()
  let dwellCalls = 0
  const controller = policy.createVideoRatingPromptDwellController({
    onDwell: () => { dwellCalls += 1 },
    setTimer: (callback, delayMs) => {
      const id = ++nextTimerId
      timers.set(id, { callback, delayMs })
      return id
    },
    clearTimer: (id) => { timers.delete(id) },
  })
  controller.update(eligible)
  check(timers.size === 1, 'eligible prompt schedules one dwell timer')
  check([...timers.values()][0].delayMs === 1000, 'scheduled dwell uses the one-second contract')
  controller.update({ intersectionRatio: 0.49 })
  check(timers.size === 0, 'dropping below 50% resets continuous dwell')
  controller.update({ intersectionRatio: 0.5 })
  check(timers.size === 1, 're-entering at 50% starts a fresh dwell')
  const [firstTimerId, firstTimer] = [...timers.entries()][0]
  timers.delete(firstTimerId)
  firstTimer.callback()
  check(dwellCalls === 1, 'completed continuous dwell fires once')
  controller.update({ documentVisible: false })
  controller.update({ documentVisible: true })
  check(timers.size === 0, 'fired controller does not duplicate on visibility changes')
  controller.rearm()
  check(timers.size === 1, 'confirmed rejection may explicitly rearm a full dwell')
  controller.update({ answered: true })
  check(timers.size === 0, 'answer cancels a rearmed dwell')
  controller.stop()
  controller.update({ answered: false })
  check(timers.size === 0, 'stopped controller never schedules again')
}

{
  let nextTimerId = 0
  const timers = new Map()
  let dwellCalls = 0
  const controller = policy.createVideoRatingPromptDwellController({
    onDwell: () => { dwellCalls += 1 },
    setTimer: (callback) => {
      const id = ++nextTimerId
      timers.set(id, callback)
      return id
    },
    clearTimer: (id) => { timers.delete(id) },
  })
  controller.update(eligible)
  controller.update({ documentVisible: false })
  check(timers.size === 0, 'backgrounding resets the dwell')
  controller.update({ documentVisible: true })
  check(timers.size === 1, 'returning visible starts a new full dwell')
  controller.stop()
  check(timers.size === 0 && dwellCalls === 0, 'unmount clears pending dwell without emitting')
}

{
  let resolvePending
  const lifecycle = policy.createVideoRatingPromptLifecycle()
  const late = new Promise((resolve) => { resolvePending = resolve })
    .then((outcome) => lifecycle.shouldRetry(outcome, false))
  lifecycle.stop()
  resolvePending('not_stored')
  check(await late === false, 'late rejection after unmount cannot retry')
  check(!lifecycle.canContinue(), 'stopped lifecycle remains terminal')
}

{
  const lifecycle = policy.createVideoRatingPromptLifecycle()
  check(lifecycle.shouldRetry('not_stored', false), 'one confirmed rejection may retry')
  check(!lifecycle.shouldRetry('not_stored', true), 'second confirmed rejection cannot retry')
  check(!lifecycle.shouldRetry('stored', false), 'stored result never retries')
  check(!lifecycle.shouldRetry('ambiguous', false), 'ambiguous result never retries')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createVideoRatingPromptRecorder({
    storage,
    transport: async (eventName, sentMetadata) => {
      posts += 1
      check(storage.getItem(marker) === 'pending', 'claim exists before POST')
      check(eventName === 'video_rating_prompt_viewed', 'event name is closed')
      check(sentMetadata.render_count_bucket === 'first', 'closed metadata reaches transport')
      return 'stored'
    },
  })
  check(await recorder.recordOnce('first') === 'stored', 'stored outcome is returned')
  check(storage.getItem(marker) === 'stored', 'stored outcome finalizes marker')
  check(await recorder.recordOnce('repeat') === 'duplicate', 'same session cannot emit a repeat bucket')
  check(posts === 1, 'stored view posts exactly once')

  const remount = policy.createVideoRatingPromptRecorder({
    storage,
    transport: async () => { posts += 1; return 'stored' },
  })
  check(await remount.recordOnce('repeat') === 'duplicate', 'remount respects stored marker')
  check(posts === 1, 'remount produces no second POST')
}

{
  const storage = fakeStorage()
  let release
  let posts = 0
  const first = policy.createVideoRatingPromptRecorder({
    storage,
    transport: () => {
      posts += 1
      return new Promise((resolve) => { release = resolve })
    },
  })
  const second = policy.createVideoRatingPromptRecorder({
    storage,
    transport: async () => { posts += 1; return 'stored' },
  })
  const pending = first.recordOnce('first')
  check(await second.recordOnce('first') === 'duplicate', 'pending claim suppresses a concurrent instance')
  check(posts === 1, 'concurrent instances create one POST')
  release('stored')
  check(await pending === 'stored', 'first instance settles stored')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createVideoRatingPromptRecorder({
    storage,
    transport: async () => {
      posts += 1
      return posts === 1 ? 'not_stored' : 'stored'
    },
  })
  check(await recorder.recordOnce('first') === 'not_stored', 'confirmed rejection is retryable')
  check(storage.getItem(marker) === null, 'confirmed rejection releases claim')
  check(await recorder.recordOnce('first') === 'stored', 'bounded later attempt can store')
  check(posts === 2, 'retry creates exactly one later POST')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createVideoRatingPromptRecorder({
    storage,
    transport: async () => { posts += 1; return 'ambiguous' },
  })
  check(await recorder.recordOnce('first') === 'ambiguous', 'ambiguous response is explicit')
  check(storage.getItem(marker) === 'pending', 'ambiguous response preserves pending claim')
  check(await recorder.recordOnce('first') === 'duplicate', 'ambiguous response cannot re-POST')
  check(posts === 1, 'ambiguous response posts at most once')
}

{
  const denied = {
    getItem() { throw new Error('denied') },
    setItem() { throw new Error('denied') },
    removeItem() { throw new Error('denied') },
  }
  let posts = 0
  const recorder = policy.createVideoRatingPromptRecorder({
    storage: denied,
    transport: async () => { posts += 1; return 'stored' },
  })
  check(await recorder.recordOnce('first') === 'unavailable', 'storage denial fails closed')
  check(posts === 0, 'storage denial produces zero unowned POSTs')
}

check(componentSource.includes('ref={promptRef}'), 'the real rating box owns the observer ref')
check(componentSource.includes('trackClosedEvent(eventName, metadata)'), 'caller uses closed metadata transport')
check(componentSource.includes('VIDEO_RATING_PROMPT_DWELL_MS'), 'caller enforces the one-second dwell')
check(componentSource.includes('createVideoRatingPromptDwellController'), 'caller uses the behavior-tested dwell controller')
check(componentSource.includes('IntersectionObserver'), 'caller observes the real box')
check(componentSource.includes("document.visibilityState !== 'hidden'"), 'caller derives explicit visible-tab state')
check(componentSource.includes("target.addEventListener('click', handleAnswer, true)"), 'answer is intercepted in capture phase')
check(componentSource.includes('data-video-rating-response="rating"'), 'real star buttons expose the stop marker')
check(componentSource.includes('data-video-rating-response="dismiss"'), 'real dismiss button exposes the stop marker')
check(componentSource.includes('promptAnsweredRef.current = true'), 'answer state is synchronous')
check(componentSource.includes('lifecycle.stop()'), 'unmount and answer stop the lifecycle')
check(componentSource.includes('dwell.stop()'), 'dwell timer is cleaned up')
check(componentSource.includes('clearRetry()'), 'retry timer is cleaned up')
check(componentSource.includes("track('video_rating_shown'"), 'legacy shown series remains intact')
check(componentSource.includes("track('video_rated'"), 'legacy rating series remains intact')
check(!componentSource.includes('checkout.launch'), 'telemetry never creates checkout')
check(!eventsRouteSource.includes("'video_rating_prompt_viewed'"), 'browser event is not declared server-only')

console.log(`PASS ${checks}/${checks} — post-download rating prompt visibility contract`)
