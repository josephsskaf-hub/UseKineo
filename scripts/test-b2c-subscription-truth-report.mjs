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

console.log(`b2c-subscription-truth-report: ${checks}/${checks} checks passed`)
