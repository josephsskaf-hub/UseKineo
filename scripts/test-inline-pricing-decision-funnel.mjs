#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const policyPath = path.join(root, 'lib', 'growth', 'inlinePricingDecision.ts')
const componentPath = path.join(root, 'components', 'PricingCards.tsx')
const eventsRoutePath = path.join(root, 'app', 'api', 'events', 'route.ts')
const policySource = fs.readFileSync(policyPath, 'utf8')
const componentSource = fs.readFileSync(componentPath, 'utf8')
const eventsRouteSource = fs.readFileSync(eventsRoutePath, 'utf8')

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
function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message)
  checks += 1
}
function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, value) },
    removeItem(key) { values.delete(key) },
  }
}
function fakeClock() {
  let now = 0
  let sequence = 0
  const tasks = []
  const schedule = (callback, delayMs) => {
    const task = { id: ++sequence, at: now + delayMs, callback, active: true }
    tasks.push(task)
    return () => { task.active = false }
  }
  const drain = async () => {
    for (let index = 0; index < 5; index += 1) await Promise.resolve()
  }
  const advance = async (milliseconds) => {
    const target = now + milliseconds
    while (true) {
      const next = tasks
        .filter((task) => task.active && task.at <= target)
        .sort((left, right) => left.at - right.at || left.id - right.id)[0]
      if (!next) break
      now = next.at
      next.active = false
      next.callback()
      await drain()
    }
    now = target
    await drain()
  }
  return {
    schedule,
    advance,
    drain,
    pending: () => tasks.filter((task) => task.active).length,
  }
}

equal(policy.INLINE_PRICING_DECISION_VERSION, 'inline_pricing_decision_v1', 'version is stable')
equal(policy.INLINE_PRICING_VISIBLE_RATIO, 0.5, 'human exposure requires 50%')
equal(policy.INLINE_PRICING_DWELL_MS, 1_000, 'human exposure requires one continuous second')
equal(policy.INLINE_PRICING_RETRY_MS, 650, 'confirmed rejection has one bounded retry delay')

const qualifying = {
  isIntersecting: true,
  intersectionRatio: 0.5,
  documentVisible: true,
  targetConnected: true,
}
check(policy.shouldSampleInlinePricingValueAnchor(qualifying), '50% visible qualifies')
for (const [override, message] of [
  [{ intersectionRatio: 0.499 }, '49.9% does not qualify'],
  [{ isIntersecting: false }, 'non-intersection does not qualify'],
  [{ documentVisible: false }, 'hidden tab does not qualify'],
  [{ targetConnected: false }, 'detached target does not qualify'],
]) {
  check(!policy.shouldSampleInlinePricingValueAnchor({ ...qualifying, ...override }), message)
}

const metadata = policy.inlinePricingDecisionMetadata()
equal(metadata.version, policy.INLINE_PRICING_DECISION_VERSION, 'metadata carries the version')
equal(metadata.surface, 'generate_step_1', 'metadata carries a closed surface')
equal(metadata.actor_unit, 'authenticated_user', 'metadata carries the actor unit')
equal(metadata.event_unit, 'value_anchor_human_view', 'event names the exact observed unit')
equal(metadata.dedupe_scope, 'browser_tab', 'dedupe scope is explicit')
equal(metadata.human_exposure_claimed, true, 'event explicitly claims human exposure')
equal(metadata.visible_ratio, 0.5, 'metadata carries the threshold')
equal(metadata.dwell_ms, 1_000, 'metadata carries the dwell')
for (const forbidden of [
  'email', 'url', 'amount', 'price', 'user_id', 'session_id', 'text',
  'utm_source', 'tier', 'credits', 'video_id',
]) {
  check(!(forbidden in metadata), `closed metadata excludes ${forbidden}`)
}
check(policy.inlinePricingDecisionMarker().includes('value_anchor_viewed'), 'marker names only the observed anchor')

{
  const storage = fakeStorage()
  const posts = []
  const recorder = policy.createInlinePricingDecisionRecorder({
    transport: async (eventName, payload) => {
      posts.push({ eventName, payload })
      return 'stored'
    },
  })
  equal(await recorder.recordOnce(storage), 'stored', 'human view stores')
  equal(await recorder.recordOnce(storage), 'duplicate', 'stored view dedupes')
  equal(posts.length, 1, 'stored view creates one POST')
  equal(posts[0].eventName, 'inline_pricing_value_anchor_viewed', 'transport uses the closed event name')
  equal(posts[0].payload.event_unit, 'value_anchor_human_view', 'transport carries the exact unit')
}

{
  const storage = fakeStorage()
  let release
  let posts = 0
  const recorder = policy.createInlinePricingDecisionRecorder({
    transport: () => {
      posts += 1
      return new Promise((resolve) => { release = resolve })
    },
  })
  const first = recorder.recordOnce(storage)
  const shared = recorder.recordOnce(storage)
  equal(posts, 1, 'concurrent remount shares one POST')
  release('stored')
  equal(await first, 'stored', 'first caller receives stored')
  equal(await shared, 'stored', 'second caller shares stored outcome')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createInlinePricingDecisionRecorder({
    transport: async () => {
      posts += 1
      return posts === 1 ? 'not_stored' : 'stored'
    },
  })
  equal(await recorder.recordOnce(storage), 'not_stored', 'confirmed rejection releases marker')
  equal(await recorder.recordOnce(storage), 'stored', 'later bounded attempt may store')
  equal(posts, 2, 'confirmed rejection permits one later POST')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createInlinePricingDecisionRecorder({
    transport: async () => {
      posts += 1
      return 'ambiguous'
    },
  })
  equal(await recorder.recordOnce(storage), 'ambiguous', 'ambiguous is explicit')
  equal(await recorder.recordOnce(storage), 'duplicate', 'ambiguous is terminal')
  equal(posts, 1, 'ambiguous never reposts blindly')
}

{
  let posts = 0
  const recorder = policy.createInlinePricingDecisionRecorder({
    transport: async () => {
      posts += 1
      return 'stored'
    },
  })
  equal(await recorder.recordOnce(null), 'unavailable', 'missing storage fails closed')
  equal(posts, 0, 'missing storage creates zero POSTs')
}

{
  const clock = fakeClock()
  const outcomes = ['not_stored', 'stored']
  let calls = 0
  const lifecycle = policy.createInlinePricingLifecycle({
    record: async () => {
      calls += 1
      return outcomes.shift()
    },
    isActive: () => true,
    schedule: clock.schedule,
  })
  lifecycle.start()
  await clock.drain()
  equal(calls, 1, 'lifecycle starts one real attempt')
  equal(clock.pending(), 1, 'not_stored schedules one retry')
  await clock.advance(649)
  equal(calls, 1, 'retry does not run early')
  await clock.advance(1)
  equal(calls, 2, 'retry runs at the declared delay')
  await clock.advance(10_000)
  equal(calls, 2, 'lifecycle never exceeds two attempts')
  equal(lifecycle.attempts(), 2, 'attempt counter reports the real budget')
}

{
  const clock = fakeClock()
  let active = true
  let calls = 0
  const lifecycle = policy.createInlinePricingLifecycle({
    record: async () => {
      calls += 1
      return 'not_stored'
    },
    isActive: () => active,
    schedule: clock.schedule,
  })
  lifecycle.start()
  await clock.drain()
  active = false
  lifecycle.pause()
  await clock.advance(10_000)
  equal(calls, 1, 'inactive target cancels the retry')
  lifecycle.stop()
  lifecycle.start()
  await clock.drain()
  equal(calls, 1, 'stopped lifecycle cannot restart')
}

{
  const clock = fakeClock()
  let calls = 0
  const dwell = policy.createInlinePricingDwellController({
    record: async () => {
      calls += 1
      return 'stored'
    },
    schedule: clock.schedule,
  })
  dwell.update(qualifying)
  await clock.advance(999)
  equal(calls, 0, '999ms does not claim a human view')
  await clock.advance(1)
  equal(calls, 1, '1000ms continuous visibility records')
  await clock.advance(10_000)
  equal(calls, 1, 'continuous visibility records once')
  dwell.stop()
}

{
  const clock = fakeClock()
  let calls = 0
  const dwell = policy.createInlinePricingDwellController({
    record: async () => {
      calls += 1
      return 'stored'
    },
    schedule: clock.schedule,
  })
  dwell.update(qualifying)
  await clock.advance(700)
  dwell.update({ ...qualifying, documentVisible: false })
  await clock.advance(500)
  equal(calls, 0, 'hidden tab breaks continuous dwell')
  dwell.update(qualifying)
  await clock.advance(999)
  equal(calls, 0, 'visible return starts a fresh second')
  await clock.advance(1)
  equal(calls, 1, 'fresh visible second records')
  dwell.stop()
}

{
  const clock = fakeClock()
  let calls = 0
  const dwell = policy.createInlinePricingDwellController({
    record: async () => {
      calls += 1
      return 'stored'
    },
    schedule: clock.schedule,
  })
  dwell.update(qualifying)
  await clock.advance(700)
  dwell.stop()
  await clock.advance(10_000)
  equal(calls, 0, 'unmount stops an unfinished dwell')
  equal(clock.pending(), 0, 'unmount leaves no timer alive')
}

check(componentSource.includes('ref={valueAnchorRef}'), 'caller observes the real value anchor')
check(componentSource.includes('trackClosedEvent(eventName, metadata)'), 'caller uses closed metadata transport')
check(componentSource.includes('threshold: [INLINE_PRICING_VISIBLE_RATIO]'), 'caller applies the policy threshold')
check(componentSource.includes("document.addEventListener('visibilitychange', handleVisibility)"), 'caller reacts to hidden tabs')
check(componentSource.includes("document.removeEventListener('visibilitychange', handleVisibility)"), 'caller removes the visibility listener')
check(componentSource.includes('dwellController.stop()'), 'caller stops dwell on unmount')
check(componentSource.includes('observer.disconnect()'), 'caller disconnects observer on unmount')
equal((componentSource.match(/onSelect=\{\(\) => setSelectedPlan\('/g) ?? []).length, 3, 'existing selection props remain byte-semantically intact')
check(!componentSource.includes('inline_pricing_plan_selected'), 'no dead plan-selection event is claimed')
check(!policySource.includes('plan_selected'), 'policy does not model a gesture the product lacks')
check(!eventsRouteSource.includes("'inline_pricing_value_anchor_viewed'"), 'human view is not accidentally server-only')

console.log(`inline-pricing-decision-funnel: ${checks}/${checks} checks passed`)
