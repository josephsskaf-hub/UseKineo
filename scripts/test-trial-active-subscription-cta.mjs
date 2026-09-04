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

const policySource = read('lib/growth/trialActiveSubscriptionCta.ts')
const componentSource = read('components/TrialActiveBanner.tsx')
const reportSource = read('scripts/b2c-subscription-truth-report.mjs')
const compiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleBox = { exports: {} }
new Function('module', 'exports', 'require', compiled)(moduleBox, moduleBox.exports, () => {
  throw new Error('policy must not import runtime dependencies')
})
const policy = moduleBox.exports

equal(policy.TRIAL_ACTIVE_SUBSCRIPTION_CTA_VERSION, 'trial_active_subscription_cta_fresh_state_v2', 'version identifies the fresh-state denominator')
equal(policy.TRIAL_ACTIVE_SUBSCRIPTION_CTA_VIEW_EVENT, 'trial_active_subscription_cta_viewed', 'view event is closed')
equal(policy.TRIAL_ACTIVE_SUBSCRIPTION_CTA_MODE, 'trial_active_subscription', 'mode is closed and does not claim delivery')
equal(policy.TRIAL_ACTIVE_SUBSCRIPTION_CTA_VIEW_RATIO, 0.5, 'half of the real CTA must be visible')
equal(policy.TRIAL_ACTIVE_SUBSCRIPTION_CTA_DWELL_MS, 1000, 'view requires one continuous second')

const metadata = policy.trialActiveSubscriptionCtaViewMetadata({ returnLadderRendered: true })
equal(metadata.offer_version, policy.TRIAL_ACTIVE_SUBSCRIPTION_CTA_VERSION, 'view metadata carries the offer version')
equal(metadata.offer_mode, policy.TRIAL_ACTIVE_SUBSCRIPTION_CTA_MODE, 'view metadata carries the offer mode')
equal(metadata.surface, 'trial_active_banner', 'view names the checkout surface')
equal(metadata.tier, 'basic', 'view names the preserved subscription tier')
equal(metadata.actor_unit, 'authenticated_user', 'view counts authenticated people')
equal(metadata.event_unit, 'subscription_cta_human_view', 'view declares the finite event unit')
equal(metadata.human_exposure_claimed, true, 'view explicitly claims human exposure')
equal(metadata.delivery_evidence, 'api_videos_completed_count_gte_1', 'view declares server-owned completion evidence')
equal(metadata.return_ladder_rendered, true, 'view records the competing activation action as rendered, not viewed')
equal(metadata.visible_ratio, 0.5, 'view metadata declares its threshold')
equal(metadata.continuous_visible_ms, 1000, 'view metadata declares its dwell')
equal(metadata.document_visible_required, true, 'view requires a visible tab')
for (const forbidden of ['email', 'url', 'prompt', 'script', 'topic', 'user_id', 'session_id', 'amount', 'price']) {
  check(!(forbidden in metadata), `view metadata excludes ${forbidden}`)
}

const eligible = {
  open: true,
  subscriptionCtaEligible: true,
  completedVideoConfirmed: true,
  isIntersecting: true,
  intersectionRatio: 0.5,
  documentVisible: true,
}
check(policy.shouldCountTrialActiveSubscriptionCtaView(eligible), '50% visible eligible CTA qualifies')
check(!policy.shouldCountTrialActiveSubscriptionCtaView({ ...eligible, open: false }), 'closed banner cannot qualify')
check(!policy.shouldCountTrialActiveSubscriptionCtaView({ ...eligible, subscriptionCtaEligible: false }), 'other banner modes cannot qualify')
check(!policy.shouldCountTrialActiveSubscriptionCtaView({ ...eligible, completedVideoConfirmed: false }), 'credit use without a completed video cannot qualify')
check(!policy.shouldCountTrialActiveSubscriptionCtaView({ ...eligible, isIntersecting: false }), 'offscreen CTA cannot qualify')
check(!policy.shouldCountTrialActiveSubscriptionCtaView({ ...eligible, intersectionRatio: 0.499 }), 'less than half cannot qualify')
check(!policy.shouldCountTrialActiveSubscriptionCtaView({ ...eligible, documentVisible: false }), 'background tab cannot qualify')
check(policy.trialActiveSubscriptionCtaMarker('account-a') !== policy.trialActiveSubscriptionCtaMarker('account-b'), 'marker is account-scoped')
check(policy.trialActiveSubscriptionCtaMarker('account-a').includes(policy.TRIAL_ACTIVE_SUBSCRIPTION_CTA_VERSION), 'marker is version-scoped')

const click = policy.trialActiveSubscriptionCtaClickMetadata({ returnLadderRendered: false })
equal(click.offer_version, metadata.offer_version, 'view and click share one version')
equal(click.offer_mode, metadata.offer_mode, 'view and click share one mode')
equal(click.surface, metadata.surface, 'view and click share one surface')
equal(click.event_unit, 'subscription_cta_click', 'click declares its own event unit without claiming delivery')
equal(click.return_ladder_rendered, false, 'click records the competing rendered state independently')

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, value) },
    removeItem(key) { values.delete(key) },
  }
}

{
  let completedVideoConfirmed = false
  let intersectionRatio = 0.5
  let documentVisible = true
  let nextTimer = 0
  const timers = new Map()
  let dwellCalls = 0
  const controller = policy.createTrialActiveSubscriptionCtaDwellController({
    qualifies: () => policy.shouldCountTrialActiveSubscriptionCtaView({
      ...eligible,
      completedVideoConfirmed,
      intersectionRatio,
      documentVisible,
    }),
    onDwell: () => { dwellCalls += 1 },
    setTimer: (callback, delayMs) => {
      const id = ++nextTimer
      timers.set(id, { callback, delayMs })
      return id
    },
    clearTimer: (id) => { timers.delete(id) },
  })
  controller.update()
  equal(timers.size, 0, 'debit or unknown usage cannot arm dwell before completed-video evidence')
  completedVideoConfirmed = true
  controller.update()
  equal(timers.size, 1, 'server completion evidence arms one dwell')
  equal([...timers.values()][0].delayMs, 1000, 'dwell uses the canonical one second')
  intersectionRatio = 0.499
  controller.update()
  equal(timers.size, 0, 'dropping below half cancels dwell')
  intersectionRatio = 0.5
  controller.update()
  documentVisible = false
  controller.update()
  equal(timers.size, 0, 'backgrounding before one second cancels dwell')
  documentVisible = true
  controller.update()
  const [timerId, timer] = [...timers.entries()][0]
  timers.delete(timerId)
  timer.callback()
  equal(dwellCalls, 1, 'returning visible and completing a fresh second records once')
  controller.update()
  equal(timers.size, 0, 'completed dwell cannot duplicate')
  controller.reopen()
  controller.update()
  equal(timers.size, 1, 'confirmed not-stored outcome can reopen on a later signal')
  controller.stop()
  equal(timers.size, 0, 'unmount clears a pending timer')
  check(!controller.canContinue(), 'stopped controller is terminal')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createTrialActiveSubscriptionCtaViewRecorder({
    userKey: 'stored-account',
    storage,
    metadata,
    transport: async (eventName, sentMetadata) => {
      posts += 1
      equal(eventName, policy.TRIAL_ACTIVE_SUBSCRIPTION_CTA_VIEW_EVENT, 'recorder emits the closed event')
      equal(sentMetadata.delivery_evidence, metadata.delivery_evidence, 'recorder carries server evidence metadata')
      return 'stored'
    },
  })
  equal(await recorder.recordOnce(), 'stored', 'stored transport settles the view')
  equal(await recorder.recordOnce(), 'duplicate', 'stored view cannot post twice')
  equal(posts, 1, 'stored view performs one POST')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createTrialActiveSubscriptionCtaViewRecorder({
    userKey: 'retry-account', storage, metadata,
    transport: async () => (++posts === 1 ? 'not_stored' : 'stored'),
  })
  equal(await recorder.recordOnce(), 'not_stored', 'confirmed rejection is explicit')
  equal(storage.getItem(policy.trialActiveSubscriptionCtaMarker('retry-account')), null, 'confirmed rejection reopens the marker')
  equal(await recorder.recordOnce(), 'stored', 'later human signal may retry once')
  equal(posts, 2, 'retry occurs only after confirmed non-persistence')
}

{
  const storage = fakeStorage()
  const recorder = policy.createTrialActiveSubscriptionCtaViewRecorder({
    userKey: 'ambiguous-account', storage, metadata, transport: async () => 'ambiguous',
  })
  equal(await recorder.recordOnce(), 'ambiguous', 'ambiguous persistence is explicit')
  equal(await recorder.recordOnce(), 'duplicate', 'ambiguous result is terminal against blind repost')
}

{
  const storage = fakeStorage()
  let resolveTransport
  let posts = 0
  const first = policy.createTrialActiveSubscriptionCtaViewRecorder({
    userKey: 'two-mounts', storage, metadata,
    transport: () => {
      posts += 1
      return new Promise((resolve) => { resolveTransport = resolve })
    },
  })
  const second = policy.createTrialActiveSubscriptionCtaViewRecorder({
    userKey: 'two-mounts', storage, metadata,
    transport: async () => { posts += 1; return 'stored' },
  })
  const pending = first.recordOnce()
  equal(await second.recordOnce(), 'duplicate', 'second mount sees the synchronous pending marker')
  resolveTransport('stored')
  equal(await pending, 'stored', 'original mount can settle')
  equal(posts, 1, 'two concurrent mounts issue one POST')
}

check(componentSource.includes('subscriptionCtaRef'), 'real banner targets the subscription CTA')
check(componentSource.includes('new IntersectionObserver'), 'real banner observes viewport visibility')
check(componentSource.includes('TRIAL_ACTIVE_SUBSCRIPTION_CTA_VIEW_RATIO'), 'caller uses the canonical visibility ratio')
check(componentSource.includes('createTrialActiveSubscriptionCtaDwellController'), 'caller uses the behavior-tested dwell controller')
check(componentSource.includes('createTrialActiveSubscriptionCtaViewRecorder'), 'caller uses the behavior-tested recorder')
check(componentSource.includes("document.visibilityState === 'visible'"), 'caller requires a strictly visible document')
check(componentSource.includes("fetch('/api/videos'"), 'caller asks the existing server authority for completed-video evidence')
check(componentSource.includes('payload?.historyReliable === true'), 'unreliable history fails the measurement closed')
check(componentSource.includes('payload.completedCount >= 1'), 'at least one persisted completion is required')
check(componentSource.includes('trialActiveSubscriptionCtaViewMetadata({'), 'caller cannot hand-write view metadata')
check(componentSource.includes('trialActiveSubscriptionCtaClickMetadata({'), 'caller cannot hand-write click contract')
check(/<button\s+ref=\{subscriptionCtaRef\}\s+type="button"/.test(componentSource), 'ref belongs to the real checkout button')
check(!componentSource.includes("trial_active_subscription_cta_viewed', {"), 'component cannot hand-write the closed view payload')
check(componentSource.includes("window.addEventListener('creditsChanged', refreshBanner)"), 'persistent banner refreshes from the existing credit authority signal')
check(componentSource.includes("window.removeEventListener('creditsChanged', refreshBanner)"), 'banner removes its credit signal listener on unmount')
check(componentSource.includes('setRefreshToken((current) => current + 1)'), 'credit signal invalidates the cached eligibility response')
check(componentSource.includes('[dismissKey, refreshToken, returnLadderShownKey, shownKey]'), 'eligibility fetch reruns after the credit signal')
check(/returnLadder\.eligible,\s+refreshToken,\s+userKey,/.test(componentSource), 'completed-video evidence rechecks after the credit signal')
check(componentSource.includes('const timeout = window.setTimeout(refreshBanner, delay)'), 'server deadline schedules a fresh eligibility check')
check(componentSource.includes('return () => window.clearTimeout(timeout)'), 'deadline refresh cannot survive unmount')
equal((componentSource.match(/setOpen\(false\)/g) ?? []).length >= 5, true, 'successful ineligible refresh closes a previously open banner')
check(reportSource.includes("'trial_active_subscription'"), 'canonical B2C report governs the experiment')
check(reportSource.includes("'trial_active_banner', 'trial_active_subscription'"), 'canonical report maps the exact checkout surface')
check(reportSource.includes("experiment === 'trial_active_subscription' && stage !== 'post_delivery'"), 'pre-delivery exposure is rejected independently')

console.log(`trial-active-subscription-cta: ${checks}/${checks} checks passed`)
