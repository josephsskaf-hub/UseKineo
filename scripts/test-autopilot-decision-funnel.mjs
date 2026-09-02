#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const policyPath = path.join(root, 'lib', 'growth', 'autopilotDecisionFunnel.ts')
const componentPath = path.join(root, 'app', 'pricing', 'AutopilotBreakEvenCalculator.tsx')
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

equal(policy.AUTOPILOT_DECISION_FUNNEL_VERSION, 'autopilot_decision_funnel_v1', 'version is stable')
equal(policy.AUTOPILOT_DECISION_VISIBLE_RATIO, 0.5, 'human view requires 50%')
equal(policy.AUTOPILOT_DECISION_DWELL_MS, 1_000, 'human view requires one continuous second')
equal(policy.AUTOPILOT_DECISION_RETRY_MS, 650, 'confirmed rejection has one bounded retry delay')

check(policy.shouldSampleAutopilotDecision({ isIntersecting: true, intersectionRatio: 0.5, documentVisible: true, targetConnected: true }), '50% visible qualifies')
check(!policy.shouldSampleAutopilotDecision({ isIntersecting: true, intersectionRatio: 0.499, documentVisible: true, targetConnected: true }), 'less than 50% fails')
check(!policy.shouldSampleAutopilotDecision({ isIntersecting: false, intersectionRatio: 1, documentVisible: true, targetConnected: true }), 'non-intersection fails')
check(!policy.shouldSampleAutopilotDecision({ isIntersecting: true, intersectionRatio: 1, documentVisible: false, targetConnected: true }), 'hidden document fails')
check(!policy.shouldSampleAutopilotDecision({ isIntersecting: true, intersectionRatio: 1, documentVisible: true, targetConnected: false }), 'detached target fails')

for (const stage of ['rendered', 'human_viewed', 'started']) {
  const metadata = policy.autopilotDecisionMetadata(stage)
  equal(metadata.version, policy.AUTOPILOT_DECISION_FUNNEL_VERSION, `${stage} carries version`)
  equal(metadata.surface, 'pricing_autopilot', `${stage} carries closed surface`)
  equal(metadata.event_unit, 'autopilot_break_even_calculator', `${stage} carries common event unit`)
  for (const forbidden of ['email', 'url', 'amount', 'gross_profit', 'user_id', 'session_id', 'text', 'utm_source']) {
    check(!(forbidden in metadata), `${stage} excludes ${forbidden}`)
  }
}
equal(policy.autopilotDecisionMetadata('rendered').human_exposure_claimed, false, 'mount never claims human exposure')
equal(policy.autopilotDecisionMetadata('human_viewed').human_exposure_claimed, true, 'human view is explicit')
equal(policy.autopilotDecisionMetadata('started').interaction, 'gross_profit_non_empty_input', 'start means typed value, not focus')
check(policy.autopilotDecisionMarker('rendered') !== policy.autopilotDecisionMarker('human_viewed'), 'stages own separate markers')

{
  const storage = fakeStorage()
  const posts = []
  const recorder = policy.createAutopilotDecisionRecorder({
    transport: async (eventName, metadata) => { posts.push({ eventName, metadata }); return 'stored' },
  })
  equal(await recorder.recordOnce('rendered', storage), 'stored', 'stored render is recorded')
  equal(await recorder.recordOnce('rendered', storage), 'duplicate', 'same render is deduped')
  equal(await recorder.recordOnce('human_viewed', storage), 'stored', 'human view has its own stage')
  equal(await recorder.recordOnce('started', storage), 'stored', 'interaction has its own stage')
  equal(posts.map((post) => post.eventName), [
    'autopilot_break_even_viewed',
    'autopilot_break_even_human_viewed',
    'autopilot_break_even_started',
  ], 'closed stages map to the intended event names')
}

{
  const storage = fakeStorage()
  let release
  let posts = 0
  const recorder = policy.createAutopilotDecisionRecorder({
    transport: () => { posts += 1; return new Promise((resolve) => { release = resolve }) },
  })
  const pending = recorder.recordOnce('human_viewed', storage)
  const shared = recorder.recordOnce('human_viewed', storage)
  equal(posts, 1, 'one POST is in flight')
  release('stored')
  equal(await pending, 'stored', 'first POST settles')
  equal(await shared, 'stored', 'remount shares the live request outcome')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createAutopilotDecisionRecorder({
    transport: async () => { posts += 1; return posts === 1 ? 'not_stored' : 'stored' },
  })
  equal(await recorder.recordOnce('started', storage), 'not_stored', 'confirmed rejection releases the claim')
  equal(await recorder.recordOnce('started', storage), 'stored', 'a later real interaction may retry once')
  equal(posts, 2, 'not_stored permits only a later caller-driven retry')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createAutopilotDecisionRecorder({
    transport: async () => { posts += 1; return 'ambiguous' },
  })
  equal(await recorder.recordOnce('human_viewed', storage), 'ambiguous', 'ambiguous is explicit')
  equal(await recorder.recordOnce('human_viewed', storage), 'duplicate', 'ambiguous never re-posts blindly')
  equal(posts, 1, 'ambiguous creates at most one POST')
}

{
  let posts = 0
  const recorder = policy.createAutopilotDecisionRecorder({
    transport: async () => { posts += 1; return 'stored' },
  })
  equal(await recorder.recordOnce('rendered', null), 'unavailable', 'missing storage fails measurement closed')
  equal(posts, 0, 'missing storage never creates an unowned POST')
}

{
  const clock = fakeClock()
  const outcomes = ['not_stored', 'stored']
  const stages = []
  const lifecycle = policy.createAutopilotDecisionStageLifecycle({
    stage: 'rendered',
    record: async (stage) => { stages.push(stage); return outcomes.shift() },
    isActive: () => true,
    schedule: clock.schedule,
  })
  lifecycle.start()
  await clock.drain()
  equal(stages, ['rendered'], 'mount lifecycle makes the first real attempt')
  equal(clock.pending(), 1, 'not_stored schedules one bounded retry')
  await clock.advance(649)
  equal(stages.length, 1, 'retry does not run early')
  await clock.advance(1)
  equal(stages, ['rendered', 'rendered'], 'active mount retries exactly once')
  equal(clock.pending(), 0, 'stored retry closes the lifecycle')
}

{
  const clock = fakeClock()
  let posts = 0
  const lifecycle = policy.createAutopilotDecisionStageLifecycle({
    stage: 'started',
    record: async () => { posts += 1; return 'not_stored' },
    isActive: () => true,
    schedule: clock.schedule,
  })
  lifecycle.start()
  await clock.drain()
  await clock.advance(650)
  equal(posts, 2, 'repeated not_stored is capped at two POSTs')
  lifecycle.start()
  await clock.advance(5_000)
  equal(posts, 2, 'later input changes cannot create a third POST')
}

{
  const clock = fakeClock()
  let release
  let posts = 0
  const lifecycle = policy.createAutopilotDecisionStageLifecycle({
    stage: 'rendered',
    record: () => { posts += 1; return new Promise((resolve) => { release = resolve }) },
    isActive: () => true,
    schedule: clock.schedule,
  })
  lifecycle.start()
  lifecycle.stop()
  release('not_stored')
  await clock.drain()
  equal(posts, 1, 'unmounted lifecycle keeps the completed first request only')
  equal(clock.pending(), 0, 'unmount cancels every retry')
}

{
  const clock = fakeClock()
  const storage = fakeStorage()
  let release
  let posts = 0
  const recorder = policy.createAutopilotDecisionRecorder({
    transport: () => {
      posts += 1
      if (posts === 1) return new Promise((resolve) => { release = resolve })
      return Promise.resolve('stored')
    },
  })
  let firstActive = true
  let secondActive = true
  const first = policy.createAutopilotDecisionStageLifecycle({
    stage: 'rendered',
    record: (stage) => recorder.recordOnce(stage, storage),
    isActive: () => firstActive,
    schedule: clock.schedule,
  })
  const remount = policy.createAutopilotDecisionStageLifecycle({
    stage: 'rendered',
    record: (stage) => recorder.recordOnce(stage, storage),
    isActive: () => secondActive,
    schedule: clock.schedule,
  })
  first.start()
  remount.start()
  firstActive = false
  first.stop()
  equal(posts, 1, 'StrictMode remount shares the first POST')
  release('not_stored')
  await clock.drain()
  equal(clock.pending(), 1, 'active remount owns the released retry')
  await clock.advance(650)
  equal(posts, 2, 'StrictMode pair still creates at most two POSTs')
  secondActive = false
  remount.stop()
}

{
  const clock = fakeClock()
  const stages = []
  const controller = policy.createAutopilotDecisionDwellController({
    record: async (stage) => { stages.push(stage); return 'stored' },
    schedule: clock.schedule,
  })
  const visible = { isIntersecting: true, intersectionRatio: 0.5, documentVisible: true, targetConnected: true }
  controller.update({ ...visible, intersectionRatio: 0.499 })
  equal(clock.pending(), 0, '49.9% never starts dwell')
  controller.update(visible)
  equal(clock.pending(), 1, '50% starts dwell')
  await clock.advance(500)
  controller.update({ ...visible, documentVisible: false })
  equal(clock.pending(), 0, 'hidden tab cancels the partial dwell')
  controller.update(visible)
  await clock.advance(999)
  equal(stages.length, 0, 'visibility restart requires a fresh full second')
  await clock.advance(1)
  equal(stages, ['human_viewed'], 'one continuous visible second records the human view')
  controller.stop()
}

{
  const clock = fakeClock()
  const outcomes = ['not_stored', 'stored']
  let posts = 0
  const controller = policy.createAutopilotDecisionDwellController({
    record: async () => { posts += 1; return outcomes.shift() },
    schedule: clock.schedule,
  })
  const visible = { isIntersecting: true, intersectionRatio: 1, documentVisible: true, targetConnected: true }
  controller.update(visible)
  await clock.advance(1_000)
  equal(posts, 1, 'qualified dwell makes the first POST')
  equal(clock.pending(), 1, 'confirmed rejection schedules one retry while still visible')
  controller.update({ ...visible, documentVisible: false })
  equal(clock.pending(), 0, 'hidden tab cancels the pending retry')
  await clock.advance(1_000)
  equal(posts, 1, 'cancelled retry does not leak through hidden state')
  controller.update(visible)
  await clock.drain()
  equal(posts, 2, 'returning visible resumes the one remaining retry without a blind third POST')
  controller.stop()
}

{
  const clock = fakeClock()
  let posts = 0
  const controller = policy.createAutopilotDecisionDwellController({
    record: async () => { posts += 1; return 'not_stored' },
    schedule: clock.schedule,
  })
  controller.update({ isIntersecting: true, intersectionRatio: 1, documentVisible: true, targetConnected: true })
  await clock.advance(1_000)
  controller.stop()
  await clock.advance(5_000)
  equal(posts, 1, 'unmount after dwell cancels the retry')
}

check(componentSource.includes('ref={sectionRef}'), 'real calculator section owns the observed ref')
check(componentSource.includes('new IntersectionObserver'), 'real calculator uses viewport observation')
check(componentSource.includes('AUTOPILOT_DECISION_VISIBLE_RATIO'), 'observer shares the policy threshold')
check(componentSource.includes('AUTOPILOT_DECISION_DWELL_MS'), 'caller enforces continuous dwell')
check(componentSource.includes("document.visibilityState === 'visible'"), 'hidden tab cannot count')
check(componentSource.includes('target.isConnected'), 'detached calculator cannot count')
check(componentSource.includes("stage: 'rendered'"), 'legacy viewed event is explicitly owned by the mount lifecycle')
check(componentSource.includes('createAutopilotDecisionDwellController'), 'qualified dwell uses the executable lifecycle')
check(componentSource.includes('renderedLifecycle.stop()'), 'unmount cancels technical retry')
check(componentSource.includes('humanViewController.stop()'), 'unmount cancels dwell and human-view retry')
check(componentSource.includes("stage: 'started'"), 'input interaction owns a bounded stage lifecycle')
check(componentSource.includes("if (value.trim()) startedLifecycleRef.current?.start()"), 'non-empty input starts the interaction lifecycle')
check(componentSource.includes('startedLifecycle.stop()'), 'unmount cancels interaction retry')
check(componentSource.includes("trackEvent('autopilot_break_even_calculated'"), 'calculation stage remains intact')
check(componentSource.includes("trackEvent('autopilot_break_even_checkout_clicked'"), 'checkout choice stage remains intact')
check(!eventsRouteSource.includes("'autopilot_break_even_human_viewed'"), 'human view remains a browser event')
check(!eventsRouteSource.includes("'autopilot_break_even_started'"), 'interaction remains a browser event')

console.log(`autopilot decision funnel: ${checks}/${checks} checks passed`)
