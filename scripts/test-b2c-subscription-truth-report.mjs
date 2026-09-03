#!/usr/bin/env node
import assert from 'node:assert/strict'
import { buildB2cSubscriptionTruthReport } from './b2c-subscription-truth-report.mjs'

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }
const ok = (value, message) => { assert.ok(value, message); checks += 1 }
const at = (day, minute = 0, second = 0) => `2026-09-${String(day).padStart(2, '0')}T10:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000Z`
const event = (name, user_id, day, minute, metadata = {}, session_id = `browser-${user_id ?? 'anon'}`) => ({
  id: `${name}-${user_id ?? 'anon'}-${day}-${minute}-${Math.random()}`,
  name,
  user_id,
  session_id,
  created_at: at(day, minute),
  metadata,
})
const video = (id, user, day, minute = 0) => ({ id, user_id: user, status: 'completed', created_at: at(day, minute) })
const start = (user, day, minute, stripeSessionId, browser, extra = {}) => event('checkout_started', user, day, minute, {
  tier: 'basic', billing: 'monthly', stripe_session_id: stripeSessionId, ...extra,
}, browser)
const paid = (user, day, minute, stripeSessionId, extra = {}) => event('payment_success', user, day, minute, {
  checkout_mode: 'subscription', stripe_session_id: stripeSessionId, amount_total: 1500, currency: 'usd', ...extra,
})
const v1Start = (user, day, minute, stripeSessionId, browser, tier = 'basic', extra = {}) => start(
  user, day, minute, stripeSessionId, browser, {
    tier,
    billing: 'monthly',
    checkout_session_window_version: 'recurring_checkout_24h_v1',
    checkout_session_window_hours: 24,
    ...extra,
  },
)
const attempt = (user, day, minute, browser, tier = 'basic') => event(
  'checkout_attempted', user, day, minute, { tier, billing: 'monthly' }, browser,
)
const expired = (user, day, minute, stripeSessionId, tier = 'basic') => event(
  'checkout_session_expired', user, day, minute, {
    stripe_session_id: stripeSessionId,
    checkout_mode: 'subscription',
    tier,
    billing: 'monthly',
    payment_status: 'unpaid',
  },
)
const profiles = [
  { id: 'u1', email: 'buyer@example.com' },
  { id: 'u2', email: 'other@example.com' },
  { id: 'internal', email: 'josephsskaf@gmail.com' },
]
const build = (events, videos = [video('v1', 'u1', 1)]) => buildB2cSubscriptionTruthReport({
  generatedAt: at(9, 59),
  windowStart: at(1),
  events,
  profiles,
  videos,
})
const resultExposure = event('result_video_value_sampled', 'u1', 1, 2, {
  version: 'result_video_value_sampled_v1', first_delivery_status: 'confirmed',
})
const historyExposure = event('history_first_video_offer_viewed', 'u1', 1, 3, {
  version: 'history_first_video_human_view_v2',
})
const inlineExposure = event('inline_pricing_value_anchor_viewed', 'u1', 1, 4, {
  version: 'inline_pricing_decision_v1',
})
const trialActiveViewMetadata = {
  offer_version: 'trial_active_subscription_cta_human_view_v1',
  offer_mode: 'trial_active_subscription',
  surface: 'trial_active_banner',
  delivery_evidence: 'api_videos_completed_count_gte_1',
  human_exposure_claimed: true,
  return_ladder_rendered: true,
}
const trialActiveClickMetadata = {
  surface: 'trial_active_banner',
  offer_version: 'trial_active_subscription_cta_human_view_v1',
  offer_mode: 'trial_active_subscription',
  return_ladder_rendered: true,
}

let report = build([
  resultExposure,
  historyExposure,
  inlineExposure,
  event('checkout_cta_clicked', 'u1', 1, 10, { surface: 'generate_step_1' }, 'browser-pay'),
  start('u1', 1, 11, 'cs_one', 'browser-pay'),
  paid('u1', 1, 12, 'cs_one'),
])
equal(report.financialTruth.exactExternalPaidPeople, 1, 'one payer is counted')
equal(report.financialTruth.exactExternalPaidStripeSessions, 1, 'one paid Session is counted')
equal(report.financialTruth.externalRevenueMinorByCurrency, { usd: 1500 }, 'revenue is counted once')
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 1, 'only one origin owns the paid Session')
equal(report.experiments.find((row) => row.experiment === 'inline_pricing').exactOriginPaidStripeSessions, 1, 'inline is the exclusive origin')
equal(report.experiments.find((row) => row.experiment === 'history_offer').exactOriginPaidStripeSessions, 0, 'history does not double-claim origin')
equal(report.experiments.find((row) => row.experiment === 'result_value_sample').exactOriginPaidStripeSessions, 0, 'value sample is never an origin')
equal(report.assistanceTruth.paidStripeSessionsWithMultiplePriorExposures, 1, 'the same payment can have several assists')
equal(report.experiments.find((row) => row.experiment === 'history_offer').assistedPaidStripeSessions, 1, 'history remains an assist')

report = build([
  historyExposure,
  event('checkout_started', 'u1', 1, 11, { sku: 'pack_100', stripe_session_id: 'cs_pack' }, 'browser-pack'),
  event('payment_success', 'u1', 1, 12, { checkout_mode: 'payment', stripe_session_id: 'cs_pack', amount_total: 900, currency: 'usd' }),
])
equal(report.financialTruth.exactExternalPaidStripeSessions, 0, 'a pack never becomes a subscriber')
equal(report.financialTruth.packSessions, 1, 'pack remains visible as pack')

report = build([
  inlineExposure,
  event('checkout_cta_clicked', 'u1', 1, 10, { surface: 'generate_step_1' }, 'browser-conflict'),
  start('u1', 1, 11, 'cs_conflict', 'browser-conflict'),
  paid('u2', 1, 12, 'cs_conflict'),
])
equal(report.financialTruth.exactExternalPaidStripeSessions, 0, 'same Session with two owners yields zero external revenue')
equal(report.financialTruth.conflictStripeSessions, 1, 'owner conflict is diagnosed')

report = build([
  event('checkout_resume_choice_viewed', 'u1', 1, 2, { version: 'checkout_resume_human_view_v1' }),
  event('checkout_cta_clicked', 'u1', 1, 10, { surface: 'checkout_resume_banner' }, 'browser-resume'),
  start('u1', 1, 11, 'cs_resume', 'browser-resume'),
  paid('u1', 1, 12, 'cs_resume'),
])
equal(report.financialTruth.exactExternalPaidStripeSessions, 1, 'resume payment remains financial truth')
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'resume gap receives no exact origin credit')
equal(report.checkoutOriginTruth.unknownResumeGapStripeSessions, 1, 'resume gap is explicit')

report = build([
  event('welcome_offer_viewed', 'u1', 1, 2, { version: 'welcome_offer_frequency_truth_v1' }, 'browser-welcome'),
  event('welcome_offer_checkout_clicked', 'u1', 1, 10, { version: 'welcome_offer_frequency_truth_v1' }, 'other-browser'),
  start('u1', 1, 11, 'cs_welcome_wrong_browser', 'browser-welcome', {
    checkout_origin: 'welcome20_modal',
    public_promo_truth_version: 'public_promo_truth_v1',
    public_promo_kind: 'welcome_first_month_20',
    public_promo_state: 'applied',
  }),
  paid('u1', 1, 12, 'cs_welcome_wrong_browser'),
])
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'welcome click from another browser is not exact')

report = build([
  event('welcome_offer_viewed', 'u1', 1, 2, { version: 'welcome_offer_frequency_truth_v1' }, 'browser-welcome'),
  event('welcome_offer_checkout_clicked', 'u1', 1, 10, { version: 'welcome_offer_frequency_truth_v1' }, 'browser-welcome'),
  start('u1', 1, 11, 'cs_welcome_no_promo', 'browser-welcome', { checkout_origin: 'welcome20_modal' }),
  paid('u1', 1, 12, 'cs_welcome_no_promo'),
])
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'welcome without applied promo truth is ineligible')

report = build([
  event('welcome_offer_viewed', 'u1', 1, 2, { version: 'welcome_offer_frequency_truth_v1' }, 'browser-welcome'),
  event('welcome_offer_checkout_clicked', 'u1', 1, 10, { version: 'welcome_offer_frequency_truth_v1' }, 'browser-welcome'),
  start('u1', 1, 11, 'cs_welcome', 'browser-welcome', {
    checkout_origin: 'welcome20_modal',
    public_promo_truth_version: 'public_promo_truth_v1',
    public_promo_kind: 'welcome_first_month_20',
    public_promo_state: 'applied',
  }),
  paid('u1', 1, 12, 'cs_welcome'),
])
equal(report.experiments.find((row) => row.experiment === 'welcome_offer').exactOriginPaidStripeSessions, 1, 'welcome requires click, browser and applied promo truth')

report = build([
  event('plan_fit_checkout_cta_viewed', 'u1', 1, 2, { offer_version: 'plan_fit_direct_win_v3', event_unit: 'first_completed_video' }, 'browser-plan'),
  event('checkout_cta_clicked', 'u1', 1, 10, { surface: 'generate_plan_fit' }, 'browser-plan'),
  start('u1', 1, 11, 'cs_plan', 'browser-plan'),
  paid('u1', 1, 12, 'cs_plan'),
])
equal(report.experiments.find((row) => row.experiment === 'plan_fit').exactOriginPaidStripeSessions, 1, 'Plan Fit can own one exact origin')

report = build([
  event('trial_post_video_offer_viewed', 'u1', 1, 2, {
    source: 'result_trial_continue',
    offer_layout: 'engine_fit_creator_first_v1',
  }, 'browser-trial-offer'),
  event('checkout_cta_clicked', 'u1', 1, 10, { surface: 'generate_trial_post_video' }, 'browser-trial-offer'),
  start('u1', 1, 11, 'cs_trial_offer', 'browser-trial-offer'),
  paid('u1', 1, 12, 'cs_trial_offer'),
])
const validTrialOffer = report.experiments.find((row) => row.experiment === 'trial_post_video')
equal(validTrialOffer.role, 'offer', 'current trial post-video variant is a governed offer')
equal(validTrialOffer.exposurePeople, 1, 'current trial post-video variant counts one person')
equal(validTrialOffer.exactOriginPaidStripeSessions, 1, 'current trial post-video variant can own one exact paid Session')
equal(validTrialOffer.gate.state, 'ready_for_reconciliation', 'an exact payment opens the trial post-video reconciliation shortcut')

for (const offerLayout of [undefined, 'future_unknown_variant']) {
  const metadata = { source: 'result_trial_continue' }
  if (offerLayout) metadata.offer_layout = offerLayout
  const suffix = offerLayout || 'missing'
  report = build([
    event('trial_post_video_offer_viewed', 'u1', 1, 2, metadata, 'browser-trial-invalid'),
    event('checkout_cta_clicked', 'u1', 1, 10, { surface: 'generate_trial_post_video' }, 'browser-trial-invalid'),
    start('u1', 1, 11, 'cs_trial_' + suffix, 'browser-trial-invalid'),
    paid('u1', 1, 12, 'cs_trial_' + suffix),
  ])
  const invalidTrialOffer = report.experiments.find((row) => row.experiment === 'trial_post_video')
  equal(invalidTrialOffer.exposurePeople, 0, suffix + ' offer_layout is not an eligible exposure')
  equal(invalidTrialOffer.exactOriginPaidStripeSessions, 0, suffix + ' offer_layout cannot claim payment origin')
  equal(report.financialTruth.exactExternalPaidStripeSessions, 1, suffix + ' variant does not erase financial truth')
}

report = buildB2cSubscriptionTruthReport({
  generatedAt: '2026-09-09T10:00:00.000Z',
  windowStart: '2026-08-29T18:00:00.000Z',
  profiles,
  videos: [{ id: 'v-pre-boundary', user_id: 'u1', status: 'completed', created_at: '2026-08-29T18:01:00.000Z' }],
  events: [
    {
      id: 'pre-boundary-exposure',
      name: 'trial_post_video_offer_viewed',
      user_id: 'u1',
      session_id: 'browser-pre-boundary',
      created_at: '2026-08-29T18:20:00.000Z',
      metadata: { source: 'result_trial_continue', offer_layout: 'engine_fit_creator_first_v1' },
    },
    {
      id: 'pre-boundary-click',
      name: 'checkout_cta_clicked',
      user_id: 'u1',
      session_id: 'browser-pre-boundary',
      created_at: '2026-08-29T18:30:00.000Z',
      metadata: { surface: 'generate_trial_post_video' },
    },
    {
      id: 'pre-boundary-start',
      name: 'checkout_started',
      user_id: 'u1',
      session_id: 'browser-pre-boundary',
      created_at: '2026-08-29T18:30:01.000Z',
      metadata: { tier: 'basic', billing: 'monthly', stripe_session_id: 'cs_pre_boundary' },
    },
    {
      id: 'pre-boundary-paid',
      name: 'payment_success',
      user_id: 'u1',
      created_at: '2026-08-29T18:31:00.000Z',
      metadata: { checkout_mode: 'subscription', stripe_session_id: 'cs_pre_boundary', amount_total: 1500, currency: 'usd' },
    },
  ],
})
equal(report.experiments.find((row) => row.experiment === 'trial_post_video').exposurePeople, 0, 'pre-boundary trial offer is not an eligible exposure')
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'pre-boundary trial offer cannot claim exact origin')
equal(report.financialTruth.exactExternalPaidStripeSessions, 1, 'pre-boundary rejection preserves financial truth')

report = build([
  event('trial_post_video_offer_viewed', 'u1', 1, 2, {
    source: 'result_trial_continue',
    offer_layout: 'engine_fit_creator_first_v1',
  }, 'browser-trial-before-video'),
  event('checkout_cta_clicked', 'u1', 2, 10, { surface: 'generate_trial_post_video' }, 'browser-trial-before-video'),
  start('u1', 2, 11, 'cs_trial_before_video', 'browser-trial-before-video'),
  paid('u1', 2, 12, 'cs_trial_before_video'),
], [video('v-after-exposure', 'u1', 2, 1)])
equal(report.experiments.find((row) => row.experiment === 'trial_post_video').exposurePeople, 0, 'trial offer before first delivery is not an eligible post-video exposure')
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'trial offer before first delivery cannot claim exact origin')
equal(report.financialTruth.exactExternalPaidStripeSessions, 1, 'pre-delivery rejection preserves financial truth')

report = build([paid('u1', 1, 12, 'cs_unlinked')])
equal(report.financialTruth.unlinkedSubscriptionPaymentSessions, 1, 'payment without start remains explicit')
equal(report.financialTruth.exactExternalPaidStripeSessions, 0, 'unlinked payment does not become revenue attribution')

report = build([
  event('trial_active_subscription_cta_viewed', 'u1', 1, 2, trialActiveViewMetadata, 'browser-trial-active'),
  event('checkout_cta_clicked', 'u1', 1, 10, trialActiveClickMetadata, 'browser-trial-active'),
  start('u1', 1, 11, 'cs_trial_active', 'browser-trial-active'),
  paid('u1', 1, 12, 'cs_trial_active'),
])
const trialActive = report.experiments.find((row) => row.experiment === 'trial_active_subscription')
equal(trialActive.exposurePeople, 1, 'human-visible post-delivery banner CTA counts one person')
equal(trialActive.ctaClickPeople, 1, 'versioned CTA click counts one person')
equal(trialActive.exactOriginPaidStripeSessions, 1, 'same-session versioned CTA can own one exact payment')
equal(trialActive.gate.state, 'ready_for_reconciliation', 'one exact payment opens reconciliation without declaring causality')

report = build([
  event('checkout_cta_clicked', 'u1', 1, 10, trialActiveClickMetadata, 'browser-fast-buyer'),
  start('u1', 1, 11, 'cs_fast_trial_active', 'browser-fast-buyer'),
  paid('u1', 1, 12, 'cs_fast_trial_active'),
])
const fastTrialActive = report.experiments.find((row) => row.experiment === 'trial_active_subscription')
equal(fastTrialActive.exposurePeople, 0, 'fast click does not contaminate the strict view denominator')
equal(fastTrialActive.ctaClickPeople, 1, 'fast versioned post-delivery click remains visible in the click numerator')
equal(fastTrialActive.exactOriginPaidStripeSessions, 1, 'versioned same-session post-delivery click can own payment without waiting for dwell')
equal(fastTrialActive.gate.state, 'ready_for_reconciliation', 'fast exact payment opens reconciliation')

report = build([
  {
    ...event('checkout_cta_clicked', 'u1', 1, 11, trialActiveClickMetadata, 'browser-click-race'),
    created_at: at(1, 11, 1),
  },
  start('u1', 1, 11, 'cs_click_race', 'browser-click-race'),
  paid('u1', 1, 13, 'cs_click_race'),
])
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'click persisted after checkout start remains ambiguous rather than claiming origin')
equal(report.financialTruth.exactExternalPaidStripeSessions, 1, 'click persistence race preserves financial truth')
equal(report.checkoutOriginTruth.unresolvedReasonCounts.click_persistence_race, 1, 'one-second persistence race is named in the unresolved histogram')

for (const [label, viewMetadata, clickMetadata, expectedOrigin] of [
  ['wrong view version', { ...trialActiveViewMetadata, offer_version: 'legacy' }, trialActiveClickMetadata, 1],
  ['wrong click version', trialActiveViewMetadata, { ...trialActiveClickMetadata, offer_version: 'legacy' }, 0],
  ['mount without human view', { ...trialActiveViewMetadata, human_exposure_claimed: false }, trialActiveClickMetadata, 1],
]) {
  report = build([
    event('trial_active_subscription_cta_viewed', 'u1', 1, 2, viewMetadata, 'browser-invalid-trial-active'),
    event('checkout_cta_clicked', 'u1', 1, 10, clickMetadata, 'browser-invalid-trial-active'),
    start('u1', 1, 11, `cs_${label.replaceAll(' ', '_')}`, 'browser-invalid-trial-active'),
    paid('u1', 1, 12, `cs_${label.replaceAll(' ', '_')}`),
  ])
  const invalid = report.experiments.find((row) => row.experiment === 'trial_active_subscription')
  equal(invalid.exposurePeople, label === 'wrong click version' ? 1 : 0, `${label} keeps the strict view denominator honest`)
  equal(invalid.exactOriginPaidStripeSessions, expectedOrigin, `${label} applies the independent versioned-click origin rule`)
  equal(report.financialTruth.exactExternalPaidStripeSessions, 1, `${label} does not erase financial truth`)
}

report = build([
  event('trial_active_subscription_cta_viewed', 'u1', 1, 2, trialActiveViewMetadata, 'browser-pre-video'),
  event('checkout_cta_clicked', 'u1', 1, 10, trialActiveClickMetadata, 'browser-pre-video'),
  start('u1', 1, 11, 'cs_trial_active_pre_video', 'browser-pre-video'),
  paid('u1', 1, 12, 'cs_trial_active_pre_video'),
], [video('v-after-trial-active', 'u1', 2, 0)])
equal(report.experiments.find((row) => row.experiment === 'trial_active_subscription').exposurePeople, 0, 'pre-delivery banner CTA view is not eligible')
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'pre-delivery banner CTA cannot own payment')
equal(report.financialTruth.exactExternalPaidStripeSessions, 1, 'pre-delivery rejection preserves financial truth')

{
  const gateProfiles = Array.from({ length: 20 }, (_, index) => ({
    id: `gate-${index + 1}`,
    email: `gate-${index + 1}@example.com`,
  }))
  const gateVideos = gateProfiles.map((profile, index) => video(`gate-video-${index + 1}`, profile.id, 1, 0))
  const gateEvents = gateProfiles.flatMap((profile, index) => [
    event('trial_active_subscription_cta_viewed', profile.id, 1, 1, trialActiveViewMetadata, `browser-${profile.id}`),
    ...(index < 5 ? [event('checkout_cta_clicked', profile.id, 2, 1, trialActiveClickMetadata, `browser-${profile.id}`)] : []),
  ])
  report = buildB2cSubscriptionTruthReport({
    generatedAt: at(9, 59),
    windowStart: at(1),
    events: gateEvents,
    profiles: gateProfiles,
    videos: gateVideos,
  })
  const mature = report.experiments.find((row) => row.experiment === 'trial_active_subscription')
  equal(mature.exposurePeople, 20, 'gate counts 20 external people, not events')
  equal(mature.ctaClickPeople, 5, 'gate counts five versioned click people')
  equal(mature.matureExposurePeople, 20, 'all 20 people mature on their own clock')
  equal(mature.matureCtaClickPeople, 5, 'five clicks mature on their own clock')
  equal(mature.gate.state, 'ready_for_decision', '20 mature people open a decision without pretending there was payment')
  equal(mature.gate.clickPathState, 'ready_for_estimate', 'five mature clicks separately open click-path estimation')
}

{
  const noClickProfiles = Array.from({ length: 20 }, (_, index) => ({
    id: `no-click-${index + 1}`,
    email: `no-click-${index + 1}@example.com`,
  }))
  report = buildB2cSubscriptionTruthReport({
    generatedAt: at(9, 59),
    windowStart: at(1),
    profiles: noClickProfiles,
    videos: noClickProfiles.map((profile, index) => video(`no-click-video-${index + 1}`, profile.id, 1, 0)),
    events: noClickProfiles.map((profile) => event(
      'trial_active_subscription_cta_viewed', profile.id, 1, 1,
      trialActiveViewMetadata, `browser-${profile.id}`,
    )),
  })
  const matureNoClick = report.experiments.find((row) => row.experiment === 'trial_active_subscription')
  equal(matureNoClick.matureExposurePeople, 20, 'negative result still reaches its exposure denominator')
  equal(matureNoClick.ctaClickPeople, 0, 'negative result invents no click')
  equal(matureNoClick.gate.state, 'ready_for_decision', '20 mature views and zero clicks can conclude the CTA was ignored')
  equal(matureNoClick.gate.clickPathState, 'collecting', 'zero clicks keeps only the click-path estimate open')
}

{
  const staggeredProfiles = Array.from({ length: 20 }, (_, index) => ({
    id: `staggered-${index + 1}`,
    email: `staggered-${index + 1}@example.com`,
  }))
  const staggeredEvents = staggeredProfiles.map((profile, index) => event(
    'trial_active_subscription_cta_viewed', profile.id, index === 0 ? 1 : 8, 1,
    trialActiveViewMetadata, `browser-${profile.id}`,
  ))
  report = buildB2cSubscriptionTruthReport({
    generatedAt: at(9, 59),
    windowStart: at(1),
    profiles: staggeredProfiles,
    videos: staggeredProfiles.map((profile, index) => video(`staggered-video-${index + 1}`, profile.id, 1, 0)),
    events: staggeredEvents,
  })
  const staggered = report.experiments.find((row) => row.experiment === 'trial_active_subscription')
  equal(staggered.exposurePeople, 20, 'all staggered people remain visible as raw exposure')
  equal(staggered.matureExposurePeople, 1, 'only the individually seven-day-old person is mature')
  equal(staggered.gate.state, 'collecting', 'one old person plus 19 recent people cannot open the gate')
}

report = build([
  event('trial_active_subscription_cta_viewed', 'u1', 1, 2, {
    ...trialActiveViewMetadata,
    return_ladder_rendered: true,
  }, 'browser-ladder-visible'),
  event('checkout_cta_clicked', 'u1', 1, 3, {
    ...trialActiveClickMetadata,
    return_ladder_rendered: true,
  }, 'browser-ladder-visible'),
  start('u1', 1, 4, 'cs_ladder_rendered', 'browser-ladder-visible'),
  paid('u1', 1, 5, 'cs_ladder_rendered'),
  event('trial_active_subscription_cta_viewed', 'u2', 1, 2, {
    ...trialActiveViewMetadata,
    return_ladder_rendered: false,
  }, 'browser-ladder-hidden'),
  event('checkout_cta_clicked', 'u2', 1, 3, {
    ...trialActiveClickMetadata,
    return_ladder_rendered: false,
  }, 'browser-ladder-hidden'),
  start('u2', 1, 4, 'cs_ladder_not_rendered', 'browser-ladder-hidden'),
  paid('u2', 1, 5, 'cs_ladder_not_rendered'),
], [video('v-context-u1', 'u1', 1, 0), video('v-context-u2', 'u2', 1, 0)])
const contextSplit = report.experiments.find((row) => row.experiment === 'trial_active_subscription').returnLadderRenderedContext
equal(contextSplit.rendered.exposurePeople, 1, 'report preserves one person whose banner also rendered the return ladder')
equal(contextSplit.rendered.ctaClickPeople, 1, 'report preserves rendered-ladder context on its click')
equal(contextSplit.rendered.exactOriginStartedPeople, 1, 'rendered-ladder context survives into one exact checkout person')
equal(contextSplit.rendered.exactOriginStartedStripeSessions, 1, 'rendered-ladder context survives into one exact checkout Session')
equal(contextSplit.rendered.exactOriginPaidPeople, 1, 'rendered-ladder context survives into one exact payer')
equal(contextSplit.rendered.exactOriginPaidStripeSessions, 1, 'rendered-ladder context survives into one exact paid Session')
equal(contextSplit.notRendered.exposurePeople, 1, 'report preserves one person whose banner did not render the return ladder')
equal(contextSplit.notRendered.ctaClickPeople, 1, 'report preserves the no-ladder click')
equal(contextSplit.notRendered.exactOriginStartedPeople, 1, 'no-ladder context survives into one exact checkout person')
equal(contextSplit.notRendered.exactOriginStartedStripeSessions, 1, 'no-ladder context survives into one exact checkout Session')
equal(contextSplit.notRendered.exactOriginPaidPeople, 1, 'no-ladder context survives into one exact payer')
equal(contextSplit.notRendered.exactOriginPaidStripeSessions, 1, 'no-ladder context survives into one exact paid Session')

report = buildB2cSubscriptionTruthReport({
  generatedAt: '2026-09-30T10:00:00.000Z',
  windowStart: '2026-09-01T10:00:00.000Z',
  profiles,
  videos: [video('v-before-window', 'u1', 1, 0)],
  events: [{
    ...event('checkout_cta_clicked', 'u1', 1, 0, trialActiveClickMetadata, 'browser-before-window'),
    created_at: '2026-08-31T10:00:00.000Z',
  }],
})
const outsideWindow = report.experiments.find((row) => row.experiment === 'trial_active_subscription')
equal(outsideWindow.ctaClickPeople, 0, 'versioned click in lookback but before the report window cannot enter the click numerator')
equal(outsideWindow.matureCtaClickPeople, 0, 'pre-window click cannot mature inside the report window')

report = build([
  event('checkout_cta_clicked', 'u1', 1, 3, {
    ...trialActiveClickMetadata,
    return_ladder_rendered: true,
  }, 'browser-ladder-conflict'),
  {
    ...event('checkout_cta_clicked', 'u1', 1, 3, {
      ...trialActiveClickMetadata,
      return_ladder_rendered: false,
    }, 'browser-ladder-conflict'),
    created_at: at(1, 3, 30),
  },
  start('u1', 1, 4, 'cs_ladder_conflict', 'browser-ladder-conflict'),
  paid('u1', 1, 5, 'cs_ladder_conflict'),
])
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'conflicting rendered context cannot be assigned to either segment')
equal(report.checkoutOriginTruth.unresolvedReasonCounts.trial_active_return_ladder_context_conflict, 1, 'conflicting rendered context is named explicitly')
equal(report.financialTruth.exactExternalPaidStripeSessions, 1, 'context conflict never erases payment truth')

report = build([])
equal(report.financialTruth.exactExternalPaidPeople, 0, 'empty input invents no payer')
equal(report.checkoutOriginTruth.unresolvedStartedRatio, null, 'empty input invents no unresolved ratio')
equal(report.gate.state, 'collecting', 'empty gate keeps collecting')
ok(report.limitations.some((line) => line.includes('legacy admin')), 'legacy admin limitation is explicit')
ok(report.assistanceTruth.rule.includes('never add revenue'), 'assists cannot inflate revenue')

report = build([
  event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'pricing_page', selection: 'starter' }, 'browser-terminal-paid'),
  attempt('u1', 1, 5, 'browser-terminal-paid', 'starter'),
  v1Start('u1', 1, 6, 'cs_terminal_paid', 'browser-terminal-paid', 'starter'),
  paid('u1', 1, 7, 'cs_terminal_paid'),
  event('checkout_cta_clicked', 'u2', 1, 15, { surface: 'generate_upgrade_modal', selection: 'pro' }, 'browser-terminal-expired'),
  attempt('u2', 1, 15, 'browser-terminal-expired', 'pro'),
  v1Start('u2', 1, 16, 'cs_terminal_expired', 'browser-terminal-expired', 'pro'),
  expired('u2', 2, 16, 'cs_terminal_expired', 'pro'),
])
equal(report.terminalSurfaceTruth.candidateExternalPeople, 2, 'terminal surface cohort counts external people')
equal(report.terminalSurfaceTruth.candidateStripeSessions, 2, 'terminal surface cohort counts exact v1 Sessions')
equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 2, 'two exact click-attempt-start chains survive')
const pricingTerminal = report.terminalSurfaceTruth.surfaces.find((row) => row.surface === 'pricing_page')
const upgradeTerminal = report.terminalSurfaceTruth.surfaces.find((row) => row.surface === 'generate_upgrade_modal')
equal(pricingTerminal.paidPeople, 1, 'pricing surface owns one exact paid person')
equal(pricingTerminal.expiredUnpaidPeople, 0, 'pricing surface invents no expiry')
equal(pricingTerminal.exactRevenueMinorByCurrency, { usd: 1500 }, 'paid surface owns exact revenue once')
equal(upgradeTerminal.paidPeople, 0, 'upgrade surface invents no payer')
equal(upgradeTerminal.expiredUnpaidPeople, 1, 'upgrade surface owns one exact unpaid expiration')
equal(report.terminalSurfaceTruth.gate.state, 'collecting', 'one terminal person per surface cannot open comparison gate')
ok(report.terminalSurfaceTruth.gate.neverDeclaresCausalityOrWinner, 'surface report never declares lift or a winner')

report = build([
  event('checkout_cta_clicked', null, 1, 5, { surface: 'pricing_page', selection: 'basic' }, 'browser-anonymous-click'),
  attempt('u1', 1, 5, 'browser-anonymous-click'),
  v1Start('u1', 1, 6, 'cs_anonymous_click', 'browser-anonymous-click'),
  paid('u1', 1, 7, 'cs_anonymous_click'),
])
equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 0, 'anonymous click cannot become same-person terminal attribution')
equal(report.terminalSurfaceTruth.attributionQuality.unresolvedReasonCounts.no_ordered_click, 1, 'anonymous click exclusion stays diagnosable')

report = build([
  event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'attacker_free_text', selection: 'basic' }, 'browser-unknown-surface'),
  attempt('u1', 1, 5, 'browser-unknown-surface'),
  v1Start('u1', 1, 6, 'cs_unknown_surface', 'browser-unknown-surface'),
  paid('u1', 1, 7, 'cs_unknown_surface'),
])
equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 0, 'surface outside allowlist cannot own a terminal Session')
equal(report.terminalSurfaceTruth.attributionQuality.unresolvedReasonCounts.surface_outside_allowlist, 1, 'unknown surface is counted by safe enum')
ok(!JSON.stringify(report.terminalSurfaceTruth).includes('attacker_free_text'), 'unknown surface text is never echoed')
ok(!JSON.stringify(report.terminalSurfaceTruth).includes('cs_unknown_surface'), 'terminal surface output emits no Stripe Session id')
ok(!JSON.stringify(report.terminalSurfaceTruth).includes('u1'), 'terminal surface output emits no user id')

for (const [label, selection] of [
  ['missing selection', undefined],
  ['tier mismatch', 'starter'],
  ['pack selection', 'starter_pack'],
]) {
  const metadata = { surface: 'post_video_paywall' }
  if (selection) metadata.selection = selection
  report = build([
    event('checkout_cta_clicked', 'u1', 1, 5, metadata, `browser-${label}`),
    attempt('u1', 1, 5, `browser-${label}`, 'basic'),
    v1Start('u1', 1, 6, `cs-${label}`, `browser-${label}`, 'basic'),
    paid('u1', 1, 7, `cs-${label}`),
  ])
  equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 0, `${label} cannot own recurring revenue`)
  equal(report.terminalSurfaceTruth.attributionQuality.unresolvedReasonCounts.conflicting_or_incompatible_selection, 1, `${label} fails closed with one safe reason`)
}

for (const [label, surface, selection, tier] of [
  ['history source key', 'history_starter_upgrade', 'history_first_video_offer', 'starter'],
  ['exit intent creator key', 'exit_intent_offer', 'creator', 'basic'],
]) {
  report = build([
    event('checkout_cta_clicked', 'u1', 1, 5, { surface, selection, tier, billing: 'monthly' }, `browser-${label}`),
    attempt('u1', 1, 5, `browser-${label}`, tier),
    v1Start('u1', 1, 6, `cs-${label}`, `browser-${label}`, tier),
    paid('u1', 1, 7, `cs-${label}`),
  ])
  equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 1, `${label} uses canonical tier instead of the UI latch key`)
}

report = build([
  event('checkout_cta_clicked', 'u1', 1, 5, {
    surface: 'post_video_paywall', selection: 'starter_pack', tier: 'basic', sku: 'starter10',
  }, 'browser-explicit-pack'),
  attempt('u1', 1, 5, 'browser-explicit-pack', 'basic'),
  v1Start('u1', 1, 6, 'cs_explicit_pack', 'browser-explicit-pack'),
  paid('u1', 1, 7, 'cs_explicit_pack'),
])
equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 0, 'explicit pack marker fails closed even when a tier is also present')
equal(report.terminalSurfaceTruth.attributionQuality.unresolvedReasonCounts.conflicting_or_incompatible_selection, 1, 'explicit pack mismatch remains diagnosable')

report = build([
  event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'post_video_paywall', selection: 'starter_pack' }, 'browser-mixed-selection'),
  {
    ...event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'post_video_paywall', selection: 'basic' }, 'browser-mixed-selection'),
    id: 'recurring-click-after-pack-click',
    created_at: at(1, 5, 10),
  },
  {
    ...attempt('u1', 1, 5, 'browser-mixed-selection', 'basic'),
    created_at: at(1, 5, 20),
  },
  v1Start('u1', 1, 6, 'cs_mixed_selection', 'browser-mixed-selection'),
  paid('u1', 1, 7, 'cs_mixed_selection'),
])
equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 0, 'mixed pack and recurring clicks remain ambiguous')
equal(report.terminalSurfaceTruth.attributionQuality.unresolvedReasonCounts.conflicting_or_incompatible_selection, 1, 'mixed selection has a closed diagnostic')

report = build([
  event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'pricing_page', selection: 'basic' }, 'browser-start-conflict'),
  attempt('u1', 1, 5, 'browser-start-conflict'),
  v1Start('u1', 1, 6, 'cs_start_conflict', 'browser-start-conflict'),
  v1Start('u1', 1, 7, 'cs_start_conflict', 'other-browser'),
  paid('u1', 1, 8, 'cs_start_conflict'),
])
equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 0, 'same Stripe Session across browsers fails closed')
equal(report.terminalSurfaceTruth.attributionQuality.unresolvedReasonCounts.start_contract_conflict, 1, 'browser conflict is named')

report = build([
  event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'pricing_page', selection: 'basic' }, 'browser-repeat-surface'),
  attempt('u1', 1, 5, 'browser-repeat-surface'),
  v1Start('u1', 1, 6, 'cs_repeat_one', 'browser-repeat-surface'),
  paid('u1', 1, 7, 'cs_repeat_one'),
  event('checkout_cta_clicked', 'u1', 1, 15, { surface: 'pricing_page', selection: 'basic' }, 'browser-repeat-surface-two'),
  attempt('u1', 1, 15, 'browser-repeat-surface-two'),
  v1Start('u1', 1, 16, 'cs_repeat_two', 'browser-repeat-surface-two'),
  paid('u1', 1, 17, 'cs_repeat_two'),
])
equal(report.terminalSurfaceTruth.canonicalExactSurfacePeople, 1, 'same person on one surface remains one person')
equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 1, 'only first Session per person and surface is canonical')
equal(report.terminalSurfaceTruth.attributionQuality.laterSamePersonSurfaceSessionsExcluded, 1, 'later same-surface Session is disclosed')
equal(report.terminalSurfaceTruth.surfaces[0].exactRevenueMinorByCurrency, { usd: 1500 }, 'repeat cannot double-count revenue')

report = build([
  event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'pricing_page', selection: 'starter' }, 'browser-shared-click'),
  attempt('u1', 1, 5, 'browser-shared-click', 'starter'),
  {
    ...attempt('u1', 1, 5, 'browser-shared-click', 'starter'),
    id: 'second-attempt-after-shared-click',
    created_at: at(1, 5, 20),
    metadata: { tier: 'starter', billing: 'annual' },
  },
  v1Start('u1', 1, 6, 'cs_shared_click_starter', 'browser-shared-click', 'starter'),
  v1Start('u1', 1, 6, 'cs_shared_click_annual', 'browser-shared-click', 'starter', { billing: 'annual' }),
  paid('u1', 1, 7, 'cs_shared_click_starter'),
  paid('u1', 1, 8, 'cs_shared_click_annual'),
])
equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 0, 'one click cannot own two Stripe Sessions')
equal(report.terminalSurfaceTruth.attributionQuality.unresolvedReasonCounts.one_click_linked_to_multiple_sessions, 2, 'both Sessions sharing one click become ambiguous')

report = build([
  attempt('u1', 1, 5, 'browser-click-race-terminal'),
  {
    ...event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'pricing_page', selection: 'basic' }, 'browser-click-race-terminal'),
    created_at: at(1, 5, 1),
  },
  v1Start('u1', 1, 6, 'cs_terminal_click_race', 'browser-click-race-terminal'),
  paid('u1', 1, 7, 'cs_terminal_click_race'),
])
equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, 0, 'click persisted after server attempt is never exact terminal attribution')
equal(report.terminalSurfaceTruth.attributionQuality.unresolvedReasonCounts.cross_request_persistence_race, 1, 'terminal report names click persistence race')

for (const [label, startAt, expected, reason] of [
  ['60 seconds', at(1, 6, 0), 1, null],
  ['60 seconds plus 1 ms', '2026-09-01T10:06:00.001Z', 0, 'click_to_start_window_exceeded'],
]) {
  report = build([
    event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'pricing_page', selection: 'basic' }, `browser-${label}`),
    {
      ...attempt('u1', 1, 5, `browser-${label}`),
      created_at: at(1, 5, 30),
    },
    {
      ...v1Start('u1', 1, 6, `cs-${label}`, `browser-${label}`),
      created_at: startAt,
    },
    paid('u1', 1, 7, `cs-${label}`),
  ])
  equal(report.terminalSurfaceTruth.canonicalExactSurfaceStripeSessions, expected, `${label} applies the end-to-end limit exactly`)
  if (reason) equal(report.terminalSurfaceTruth.attributionQuality.unresolvedReasonCounts[reason], 1, `${label} has an explicit rejection reason`)
}

report = buildB2cSubscriptionTruthReport({
  generatedAt: at(9, 59),
  windowStart: at(1),
  profiles,
  videos: [],
  events: [
    event('checkout_cta_clicked', 'u1', 9, 5, { surface: 'pricing_page', selection: 'basic' }, 'browser-open-terminal'),
    attempt('u1', 9, 5, 'browser-open-terminal'),
    v1Start('u1', 9, 6, 'cs_still_open', 'browser-open-terminal'),
    event('checkout_cta_clicked', 'u2', 1, 5, { surface: 'generate_upgrade_modal', selection: 'basic' }, 'browser-missing-terminal'),
    attempt('u2', 1, 5, 'browser-missing-terminal'),
    v1Start('u2', 1, 6, 'cs_missing_terminal', 'browser-missing-terminal'),
  ],
})
equal(report.terminalSurfaceTruth.surfaces.find((row) => row.surface === 'pricing_page').terminalExactPeople, 0, 'open Session never enters terminal denominator')
equal(report.terminalSurfaceTruth.surfaces.find((row) => row.surface === 'pricing_page').nonTerminalOutcomeCounts.open_before_deadline, 1, 'open Session remains named')
equal(report.terminalSurfaceTruth.surfaces.find((row) => row.surface === 'generate_upgrade_modal').terminalExactPeople, 0, 'missing terminal signal never becomes expiry')
equal(report.terminalSurfaceTruth.surfaces.find((row) => row.surface === 'generate_upgrade_modal').nonTerminalOutcomeCounts.missing_terminal_signal, 1, 'instrumentation gap remains named')

report = build([
  event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'pricing_page', selection: 'basic' }, 'browser-wrong-contract'),
  attempt('u1', 1, 5, 'browser-wrong-contract'),
  v1Start('u1', 1, 6, 'cs_wrong_contract', 'browser-wrong-contract', 'basic', {
    checkout_session_window_version: 'legacy_two_hour_v0',
  }),
  paid('u1', 1, 7, 'cs_wrong_contract'),
])
equal(report.terminalSurfaceTruth.candidateStripeSessions, 0, 'wrong checkout window contract is outside the v1 cohort')

report = build([
  event('checkout_cta_clicked', 'u1', 1, 5, { surface: 'pricing_page', selection: 'basic' }, 'browser-ledger-conflict'),
  attempt('u1', 1, 5, 'browser-ledger-conflict'),
  v1Start('u1', 1, 6, 'cs_ledger_conflict_v1', 'browser-ledger-conflict'),
  paid('u2', 1, 7, 'cs_ledger_conflict_v1'),
])
equal(report.terminalSurfaceTruth.attributionQuality.qualityMet, false, 'v1 financial identity conflict blocks quality gate')
equal(report.terminalSurfaceTruth.attributionQuality.exactOutcomeConflictStripeSessions, 1, 'v1 outcome conflict remains visible even when ledger omits it from external starts')

{
  const terminalProfiles = Array.from({ length: 10 }, (_, index) => ({
    id: `terminal-${index + 1}`,
    email: `terminal-${index + 1}@example.com`,
  }))
  const terminalEvents = terminalProfiles.flatMap((profile, index) => {
    const paidSurface = index < 5
    const surface = paidSurface ? 'pricing_page' : 'generate_upgrade_modal'
    const browser = `browser-${profile.id}`
    const stripe = `cs-${profile.id}`
    return [
      event('checkout_cta_clicked', profile.id, 1, index, { surface, selection: paidSurface ? 'starter' : 'pro' }, browser),
      attempt(profile.id, 1, index, browser, paidSurface ? 'starter' : 'pro'),
      v1Start(profile.id, 1, index + 1, stripe, browser, paidSurface ? 'starter' : 'pro'),
      paidSurface ? paid(profile.id, 1, index + 2, stripe) : expired(profile.id, 2, index + 1, stripe, 'pro'),
    ]
  })
  report = buildB2cSubscriptionTruthReport({
    generatedAt: at(9, 59),
    windowStart: at(1),
    events: terminalEvents,
    profiles: terminalProfiles,
    videos: [],
  })
  equal(report.terminalSurfaceTruth.surfaces.find((row) => row.surface === 'pricing_page').terminalExactPeople, 5, 'five terminal pricing people meet per-surface sample')
  equal(report.terminalSurfaceTruth.surfaces.find((row) => row.surface === 'generate_upgrade_modal').terminalExactPeople, 5, 'five terminal upgrade people meet per-surface sample')
  equal(report.terminalSurfaceTruth.gate.eligibleSurfaceCount, 2, 'two surfaces meet sample and duration')
  equal(report.terminalSurfaceTruth.gate.state, 'ready_for_diagnosis', 'complete sample opens diagnosis only')

  const conflictProfile = { id: 'terminal-conflict', email: 'terminal-conflict@example.com' }
  const conflictClick = event(
    'checkout_cta_clicked', conflictProfile.id, 1, 20,
    { surface: 'pricing_page', selection: 'basic' }, 'browser-terminal-conflict',
  )
  const conflictAttempt = attempt(conflictProfile.id, 1, 20, 'browser-terminal-conflict')
  const conflictV1Start = v1Start(
    conflictProfile.id, 1, 21, 'cs_terminal_contract_conflict', 'browser-terminal-conflict',
  )

  report = buildB2cSubscriptionTruthReport({
    generatedAt: at(9, 59),
    windowStart: at(1),
    events: [
      ...terminalEvents,
      conflictClick,
      conflictAttempt,
      conflictV1Start,
      {
        ...conflictV1Start,
        id: 'same-session-pack-start',
        created_at: at(1, 21, 1),
        metadata: {
          ...conflictV1Start.metadata,
          sku: 'starter10',
        },
      },
    ],
    profiles: [...terminalProfiles, conflictProfile],
    videos: [],
  })
  equal(report.terminalSurfaceTruth.attributionQuality.strictV1StartContractConflictStripeSessions, 1, 'v1 plus pack start on the same Session is a contract conflict')
  equal(report.terminalSurfaceTruth.attributionQuality.ledgerConflictStripeSessions, 1, 'v1 plus pack start remains visible to the scoped ledger')
  equal(report.terminalSurfaceTruth.attributionQuality.qualityMet, false, 'v1 plus pack conflict blocks terminal surface quality')
  equal(report.terminalSurfaceTruth.gate.state, 'collecting', 'v1 plus pack conflict cannot open the diagnostic gate')

  report = buildB2cSubscriptionTruthReport({
    generatedAt: at(9, 59),
    windowStart: at(1),
    events: [
      ...terminalEvents,
      conflictClick,
      conflictAttempt,
      conflictV1Start,
      {
        ...conflictV1Start,
        id: 'same-session-browser-contract-start',
        created_at: at(1, 21, 1),
        session_id: 'other-browser-terminal-conflict',
        metadata: {
          ...conflictV1Start.metadata,
          checkout_session_window_version: 'legacy_two_hour_v0',
        },
      },
    ],
    profiles: [...terminalProfiles, conflictProfile],
    videos: [],
  })
  equal(report.terminalSurfaceTruth.attributionQuality.strictV1StartContractConflictStripeSessions, 1, 'browser or window drift on a candidate v1 Session is a contract conflict')
  equal(report.terminalSurfaceTruth.attributionQuality.qualityMet, false, 'browser or window contract conflict blocks quality even when the generic ledger cannot see it')
  equal(report.terminalSurfaceTruth.gate.state, 'collecting', 'browser or window conflict cannot open the diagnostic gate')

  const oldExternalProfile = { id: 'old-external', email: 'old-external@example.com' }
  const oldStart = {
    ...v1Start(oldExternalProfile.id, 1, 21, 'cs_old_contract_conflict', 'browser-old-contract-conflict'),
    created_at: '2026-08-31T10:00:00.000Z',
  }
  const internalProfile = { id: 'internal-only', email: 'josephsskaf@gmail.com' }
  const internalStart = v1Start(
    internalProfile.id, 1, 21, 'cs_internal_contract_conflict', 'browser-internal-contract-conflict',
  )
  report = buildB2cSubscriptionTruthReport({
    generatedAt: at(9, 59),
    windowStart: at(1),
    events: [
      ...terminalEvents,
      oldStart,
      {
        ...oldStart,
        id: 'old-same-session-pack-start',
        metadata: { ...oldStart.metadata, sku: 'starter10' },
      },
      internalStart,
      {
        ...internalStart,
        id: 'internal-same-session-pack-start',
        metadata: { ...internalStart.metadata, sku: 'starter10' },
      },
    ],
    profiles: [...terminalProfiles, oldExternalProfile, internalProfile],
    videos: [],
  })
  equal(report.terminalSurfaceTruth.attributionQuality.strictV1StartContractConflictStripeSessions, 0, 'pre-window and internal-only conflicts cannot contaminate the external v1 gate')
  equal(report.terminalSurfaceTruth.gate.state, 'ready_for_diagnosis', 'valid current cohort stays diagnosable despite old or internal-only conflicts')

  report = buildB2cSubscriptionTruthReport({
    generatedAt: at(9, 59),
    windowStart: at(1),
    events: [
      ...terminalEvents,
      conflictClick,
      conflictAttempt,
      conflictV1Start,
      {
        ...conflictV1Start,
        id: 'same-session-internal-start',
        created_at: at(1, 21, 1),
        user_id: internalProfile.id,
        session_id: 'browser-internal-on-external-session',
      },
    ],
    profiles: [...terminalProfiles, conflictProfile, internalProfile],
    videos: [],
  })
  equal(report.terminalSurfaceTruth.attributionQuality.strictV1StartContractConflictStripeSessions, 1, 'internal row sharing an external candidate Session remains a contract conflict')
  equal(report.terminalSurfaceTruth.attributionQuality.ledgerConflictStripeSessions, 1, 'foreign owner on an external candidate Session remains visible to the scoped ledger')
  equal(report.terminalSurfaceTruth.gate.state, 'collecting', 'foreign owner on an external candidate Session blocks diagnosis')

  report = buildB2cSubscriptionTruthReport({
    generatedAt: at(9, 59),
    windowStart: at(1),
    events: [
      ...terminalEvents,
      paid('u1', 1, 20, 'cs_legacy_without_v1_start'),
    ],
    profiles: terminalProfiles,
    videos: [],
  })
  equal(report.financialTruth.unlinkedSubscriptionPaymentSessions, 1, 'legacy unlinked payment remains visible in global financial truth')
  equal(report.terminalSurfaceTruth.attributionQuality.unlinkedSubscriptionPaymentSessions, 0, 'legacy unlinked payment cannot block the v1 surface gate')
  equal(report.terminalSurfaceTruth.gate.state, 'ready_for_diagnosis', 'legacy payment outside v1 leaves the complete v1 gate open')
}

console.log(`b2c-subscription-truth-report: ${checks}/${checks} checks passed`)
