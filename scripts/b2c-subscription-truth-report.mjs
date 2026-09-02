import {
  isInternalMeasurementEmail,
  readCanonicalStringArray,
  readCanonicalStringConstant,
} from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const B2C_SUBSCRIPTION_TRUTH_VERSION = 'b2c_subscription_truth_v1'
export const B2C_SUBSCRIPTION_TRUTH_WINDOW_DAYS = 30
export const B2C_SUBSCRIPTION_TRUTH_LOOKBACK_DAYS = 30
export const B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_TO_START_MS = 60_000
export const B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_RACE_MS = 5_000
export const B2C_SUBSCRIPTION_TRUTH_MIN_POST_DELIVERY_PEOPLE = 20
export const B2C_SUBSCRIPTION_TRUTH_MIN_EXACT_STARTED_PEOPLE = 5
export const B2C_SUBSCRIPTION_TRUTH_MIN_DAYS = 7
export const B2C_SUBSCRIPTION_TRUTH_MAX_UNRESOLVED_RATIO = 0.2
export const RESULT_VALUE_COHORT_BOUNDARY = '2026-09-01T18:48:08.098670+00:00'
export const TRIAL_POST_VIDEO_VARIANT_BOUNDARY = '2026-08-29T18:21:09.000Z'

const POST_VIDEO_OFFER_VARIANTS = new Set(readCanonicalStringArray(
  new URL('../lib/growth/chatgptPostVideoOffer.ts', import.meta.url),
  'POST_VIDEO_OFFER_VARIANTS',
))
const TRIAL_POST_VIDEO_VARIANT_BOUNDARY_MS = Date.parse(TRIAL_POST_VIDEO_VARIANT_BOUNDARY)

const HISTORY_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/historyFirstVideoOfferHumanView.ts', import.meta.url),
  'HISTORY_FIRST_VIDEO_OFFER_HUMAN_VIEW_VERSION',
)
const RESUME_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/checkoutResumeHumanView.ts', import.meta.url),
  'CHECKOUT_RESUME_HUMAN_VIEW_VERSION',
)
const INLINE_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/inlinePricingDecision.ts', import.meta.url),
  'INLINE_PRICING_DECISION_VERSION',
)
const RESULT_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/resultVideoValueSample.ts', import.meta.url),
  'RESULT_VIDEO_VALUE_SAMPLED_VERSION',
)
const WELCOME_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/welcomeOfferFrequency.ts', import.meta.url),
  'WELCOME_OFFER_FREQUENCY_VERSION',
)
const PLAN_FIT_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/planFit.ts', import.meta.url),
  'PLAN_FIT_OFFER_VERSION',
)
const BALANCE_BRIDGE_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/trialBalanceBridge.ts', import.meta.url),
  'TRIAL_BALANCE_BRIDGE_VERSION',
)
const DOWNGRADE_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/trialDowngradeHumanView.ts', import.meta.url),
  'TRIAL_DOWNGRADE_HUMAN_VIEW_VERSION',
)
const QUICKSTART_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/chatgptQuickstart.ts', import.meta.url),
  'CHATGPT_QUICKSTART_VARIANT',
)
const PUBLIC_PROMO_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/publicPromoTruth.ts', import.meta.url),
  'PUBLIC_PROMO_TRUTH_VERSION',
)

const EXPERIMENTS = Object.freeze({
  result_value_sample: Object.freeze({ role: 'value_mediator', gate: { firstDeliveryPeople: 20, sampledPeople: 5, notSampledPeople: 5, days: 7 } }),
  history_offer: Object.freeze({ role: 'offer', gate: { people: 10, days: 0, exactPaymentShortcut: true } }),
  checkout_resume: Object.freeze({ role: 'recovery_assist', gate: { people: 5, days: 7, exactPaymentShortcut: false } }),
  inline_pricing: Object.freeze({ role: 'offer', gate: { people: 20, days: 7, exactPaymentShortcut: true } }),
  welcome_offer: Object.freeze({ role: 'offer', gate: { people: 5, days: 7, exactPaymentShortcut: false } }),
  plan_fit: Object.freeze({ role: 'offer', gate: { people: 10, days: 0, exactPaymentShortcut: true } }),
  trial_post_video: Object.freeze({ role: 'offer', gate: { people: 10, days: 7, exactPaymentShortcut: true } }),
  trial_downgrade: Object.freeze({ role: 'offer', gate: { people: 20, days: 0, exactPaymentShortcut: true } }),
  trial_balance_result: Object.freeze({ role: 'activation_mediator', gate: null }),
  trial_balance_return: Object.freeze({ role: 'return_mediator', gate: null }),
  chatgpt_quickstart: Object.freeze({ role: 'acquisition_assist', gate: null }),
})

export const B2C_SUBSCRIPTION_TRUTH_EVENT_NAMES = Object.freeze([
  'result_video_value_sampled',
  'history_first_video_offer_viewed',
  'checkout_resume_choice_viewed',
  'inline_pricing_value_anchor_viewed',
  'welcome_offer_viewed',
  'plan_fit_checkout_cta_viewed',
  'trial_post_video_offer_viewed',
  'trial_downgrade_offer_viewed',
  'trial_balance_bridge_viewed',
  'chatgpt_welcome_banner_shown',
  'welcome_offer_checkout_clicked',
  'checkout_cta_clicked',
  'checkout_started',
  'payment_success',
])

function timestamp(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function metadataString(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function compareRows(left, right) {
  return timestamp(left) - timestamp(right) || String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
}

function identityIndex(profiles) {
  const external = new Set()
  const internal = new Set()
  const unknown = new Set()
  for (const profile of profiles) {
    if (!profile?.id) continue
    const email = String(profile.email ?? '').trim()
    if (!email) unknown.add(profile.id)
    else if (isInternalMeasurementEmail(email)) internal.add(profile.id)
    else external.add(profile.id)
  }
  return { external, internal, unknown }
}

function firstCompletedVideoByUser(videos) {
  const first = new Map()
  for (const video of [...videos].sort(compareRows)) {
    if (!video?.user_id || video.status !== 'completed' || timestamp(video) === null) continue
    if (!first.has(video.user_id)) first.set(video.user_id, video)
  }
  return first
}

function exposureDefinition(row) {
  const version = metadataString(row, 'version')
  if (
    row.name === 'result_video_value_sampled' &&
    version === RESULT_VERSION &&
    metadataString(row, 'first_delivery_status') === 'confirmed'
  ) return 'result_value_sample'
  if (row.name === 'history_first_video_offer_viewed' && version === HISTORY_VERSION) return 'history_offer'
  if (row.name === 'checkout_resume_choice_viewed' && version === RESUME_VERSION) return 'checkout_resume'
  if (row.name === 'inline_pricing_value_anchor_viewed' && version === INLINE_VERSION) return 'inline_pricing'
  if (row.name === 'welcome_offer_viewed' && version === WELCOME_VERSION) return 'welcome_offer'
  if (
    row.name === 'plan_fit_checkout_cta_viewed' &&
    metadataString(row, 'offer_version') === PLAN_FIT_VERSION &&
    metadataString(row, 'event_unit') === 'first_completed_video'
  ) return 'plan_fit'
  if (
    row.name === 'trial_post_video_offer_viewed' &&
    metadataString(row, 'source') === 'result_trial_continue' &&
    timestamp(row) >= TRIAL_POST_VIDEO_VARIANT_BOUNDARY_MS &&
    POST_VIDEO_OFFER_VARIANTS.has(metadataString(row, 'offer_layout'))
  ) {
    return 'trial_post_video'
  }
  if (row.name === 'trial_downgrade_offer_viewed' && version === DOWNGRADE_VERSION) return 'trial_downgrade'
  if (row.name === 'trial_balance_bridge_viewed' && metadataString(row, 'bridge_version') === BALANCE_BRIDGE_VERSION) {
    if (metadataString(row, 'source') === 'result_trial_balance_bridge') return 'trial_balance_result'
    if (metadataString(row, 'source') === 'trial_active_banner_return') return 'trial_balance_return'
  }
  if (row.name === 'chatgpt_welcome_banner_shown' && metadataString(row, 'variant') === QUICKSTART_VERSION) {
    return 'chatgpt_quickstart'
  }
  return null
}

const SURFACE_EXPERIMENT = new Map([
  ['generate_step_1', 'inline_pricing'],
  ['history_starter_upgrade', 'history_offer'],
  ['generate_plan_fit', 'plan_fit'],
  ['generate_trial_post_video', 'trial_post_video'],
  ['trial_downgrade_modal', 'trial_downgrade'],
])

function hasPriorExposure(exposuresByUser, userId, experiment, at) {
  return (exposuresByUser.get(userId) ?? []).some((row) => row.experiment === experiment && row.at <= at)
}

function exactStartRow(record, startsByStripeSession) {
  const rows = startsByStripeSession.get(record.stripeSessionId) ?? []
  const matching = rows.filter((row) => row.user_id === record.ownerUserId).sort(compareRows)
  if (matching.length === 0) return null
  const semantics = new Set(matching.map((row) => JSON.stringify({
    tier: metadataString(row, 'tier'),
    billing: metadataString(row, 'billing'),
    sku: metadataString(row, 'sku'),
  })))
  return semantics.size === 1 ? matching[0] : null
}

function classifyOrigin(record, startsByStripeSession, clicks, welcomeClicks, exposuresByUser) {
  const start = exactStartRow(record, startsByStripeSession)
  if (!start) return { status: 'unknown', experiment: null, reason: 'no_unique_matching_start' }
  const startAt = timestamp(start)
  const browserSession = start.session_id
  if (!browserSession) return { status: 'unknown', experiment: null, reason: 'start_without_browser_session' }

  const standard = clicks.filter((click) => {
    const clickAt = timestamp(click)
    return click.session_id === browserSession &&
      (!click.user_id || click.user_id === record.ownerUserId) &&
      clickAt !== null &&
      clickAt >= startAt - B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_TO_START_MS &&
      clickAt <= startAt + B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_RACE_MS
  })
  if (standard.some((row) => timestamp(row) > startAt)) {
    return { status: 'ambiguous', experiment: null, reason: 'click_persistence_race' }
  }
  const surfaces = new Set(standard.map((row) => metadataString(row, 'surface')).filter(Boolean))
  if (surfaces.size > 1) return { status: 'ambiguous', experiment: null, reason: 'multiple_checkout_surfaces' }
  if (surfaces.size === 1) {
    const surface = [...surfaces][0]
    if (surface === 'checkout_resume_banner') {
      return { status: 'unknown_resume_gap', experiment: null, reason: 'resume_has_no_server_side_origin_destination_link' }
    }
    const experiment = SURFACE_EXPERIMENT.get(surface) ?? null
    if (!experiment) return { status: 'other', experiment: null, reason: 'known_non_experiment_surface' }
    if (!hasPriorExposure(exposuresByUser, record.ownerUserId, experiment, startAt)) {
      return { status: 'ineligible', experiment: null, reason: 'surface_without_prior_valid_exposure' }
    }
    return { status: 'exact', experiment, reason: 'same_browser_session_click_and_start' }
  }

  const serverOrigin = metadataString(start, 'checkout_origin')
  if (serverOrigin === 'welcome20_modal') {
    const matchingWelcome = welcomeClicks.filter((click) => {
      const clickAt = timestamp(click)
      return click.user_id === record.ownerUserId &&
        click.session_id === browserSession &&
        clickAt !== null && clickAt <= startAt &&
        startAt - clickAt <= B2C_SUBSCRIPTION_TRUTH_MAX_CLICK_TO_START_MS &&
        metadataString(click, 'version') === WELCOME_VERSION
    })
    const promoApplied = metadataString(start, 'public_promo_truth_version') === PUBLIC_PROMO_VERSION &&
      metadataString(start, 'public_promo_kind') === 'welcome_first_month_20' &&
      metadataString(start, 'public_promo_state') === 'applied'
    if (!promoApplied) return { status: 'ineligible', experiment: null, reason: 'welcome_promise_not_proven_applied' }
    if (matchingWelcome.length === 0) return { status: 'unknown', experiment: null, reason: 'welcome_click_not_same_browser_session' }
    if (!hasPriorExposure(exposuresByUser, record.ownerUserId, 'welcome_offer', startAt)) {
      return { status: 'ineligible', experiment: null, reason: 'welcome_without_prior_valid_exposure' }
    }
    return { status: 'exact', experiment: 'welcome_offer', reason: 'welcome_click_start_and_promo_truth_match' }
  }
  return { status: 'unknown', experiment: null, reason: 'no_exact_checkout_origin' }
}

function setSize(rows, selector) {
  return new Set(rows.map(selector).filter(Boolean)).size
}

function revenueByCurrency(records) {
  const totals = new Map()
  for (const record of records) {
    if (!record.currency || !Number.isSafeInteger(record.amountMinor)) continue
    totals.set(record.currency, (totals.get(record.currency) ?? 0) + record.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function observedDays(firstAt, generatedAtMs) {
  return firstAt === null ? null : Math.max(0, (generatedAtMs - firstAt) / 86_400_000)
}

export function buildB2cSubscriptionTruthReport({ generatedAt, windowStart, events, profiles, videos }) {
  const generatedAtMs = Date.parse(generatedAt)
  const windowStartMs = Date.parse(windowStart)
  const resultBoundaryMs = Date.parse(RESULT_VALUE_COHORT_BOUNDARY)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  const identity = identityIndex(profiles)
  const firstVideos = firstCompletedVideoByUser(videos)
  const ordered = events
    .filter((row) => timestamp(row) !== null && timestamp(row) <= generatedAtMs)
    .sort(compareRows)
  const windowRows = ordered.filter((row) => timestamp(row) >= windowStartMs)
  const externalRows = windowRows.filter((row) => identity.external.has(row.user_id))
  const exposures = externalRows.flatMap((row) => {
    const experiment = exposureDefinition(row)
    if (!experiment) return []
    const at = timestamp(row)
    const firstVideoAt = timestamp(firstVideos.get(row.user_id))
    const stage = firstVideoAt === null ? 'without_delivery' : firstVideoAt <= at ? 'post_delivery' : 'pre_delivery'
    if (experiment === 'trial_post_video' && stage !== 'post_delivery') return []
    return [{
      experiment,
      userId: row.user_id,
      at,
      stage,
    }]
  })
  const exposuresByUser = new Map()
  for (const exposure of exposures) {
    const current = exposuresByUser.get(exposure.userId) ?? []
    current.push(exposure)
    exposuresByUser.set(exposure.userId, current)
  }

  const ledger = buildSubscriptionRevenueLedger({ generatedAt, windowStart, events: ordered, profiles })
  const startsByStripeSession = new Map()
  for (const row of ordered.filter((candidate) => candidate.name === 'checkout_started')) {
    const sessionId = metadataString(row, 'stripe_session_id')
    if (!sessionId) continue
    const current = startsByStripeSession.get(sessionId) ?? []
    current.push(row)
    startsByStripeSession.set(sessionId, current)
  }
  const clicks = ordered.filter((row) => row.name === 'checkout_cta_clicked')
  const welcomeClicks = ordered.filter((row) => row.name === 'welcome_offer_checkout_clicked')
  const externalStarts = ledger.records.filter((record) =>
    ['unpaid', 'paid'].includes(record.status) &&
    record.ownerClass === 'external' &&
    record.startedAt &&
    Date.parse(record.startedAt) >= windowStartMs,
  ).map((record) => ({
    ...record,
    origin: classifyOrigin(record, startsByStripeSession, clicks, welcomeClicks, exposuresByUser),
  }))
  const externalPaid = externalStarts.filter((record) => record.status === 'paid' && record.paidInWindow)
  const exactOriginStarts = externalStarts.filter((record) => record.origin.status === 'exact')
  const exactOriginPaid = externalPaid.filter((record) => record.origin.status === 'exact')

  const assistRows = externalPaid.map((record) => {
    const paidAt = Date.parse(record.paidAt)
    const prior = [...new Set((exposuresByUser.get(record.ownerUserId) ?? [])
      .filter((row) => row.at <= paidAt)
      .map((row) => row.experiment))].sort()
    return { userId: record.ownerUserId, stripeSessionId: record.stripeSessionId, experiments: prior }
  })

  const firstDeliveryPeople = [...firstVideos.entries()].filter(([userId, row]) =>
    identity.external.has(userId) && timestamp(row) >= resultBoundaryMs && timestamp(row) <= generatedAtMs,
  )
  const firstDeliveryIds = new Set(firstDeliveryPeople.map(([userId]) => userId))
  const sampledPeople = new Set(
    exposures.filter((row) => row.experiment === 'result_value_sample' && row.at >= resultBoundaryMs).map((row) => row.userId),
  )
  const notSampledPeople = [...firstDeliveryIds].filter((userId) => !sampledPeople.has(userId)).length

  const experimentRows = Object.entries(EXPERIMENTS).map(([name, config]) => {
    const selected = exposures.filter((row) => row.experiment === name)
    const people = new Set(selected.map((row) => row.userId))
    const firstAt = selected.length ? Math.min(...selected.map((row) => row.at)) : null
    const days = name === 'result_value_sample'
      ? Math.max(0, (generatedAtMs - resultBoundaryMs) / 86_400_000)
      : observedDays(firstAt, generatedAtMs)
    const attributedStarts = exactOriginStarts.filter((row) => row.origin.experiment === name)
    const attributedPaid = exactOriginPaid.filter((row) => row.origin.experiment === name)
    const assistedPaid = assistRows.filter((row) => row.experiments.includes(name))
    let gateState = config.gate ? 'collecting' : 'diagnostic_only'
    if (name === 'result_value_sample') {
      if (assistedPaid.length > 0) gateState = 'ready_for_reconciliation'
      else if (
        firstDeliveryPeople.length >= config.gate.firstDeliveryPeople &&
        sampledPeople.size >= config.gate.sampledPeople &&
        notSampledPeople >= config.gate.notSampledPeople &&
        days >= config.gate.days
      ) gateState = 'ready_for_decision'
    } else if (config.gate && (
      (config.gate.exactPaymentShortcut && attributedPaid.length > 0) ||
      (people.size >= config.gate.people && days !== null && days >= config.gate.days)
    )) gateState = 'ready_for_reconciliation'
    return {
      experiment: name,
      role: config.role,
      exposurePeople: people.size,
      firstExposurePostDeliveryPeople: setSize(
        [...people].map((userId) => selected.filter((row) => row.userId === userId).sort((a, b) => a.at - b.at)[0]),
        (row) => row?.stage === 'post_delivery' ? row.userId : null,
      ),
      everPostDeliveryPeople: setSize(selected.filter((row) => row.stage === 'post_delivery'), (row) => row.userId),
      firstValidExposureAt: firstAt === null ? null : new Date(firstAt).toISOString(),
      observedDays: days,
      exactOriginStartedPeople: setSize(attributedStarts, (row) => row.ownerUserId),
      exactOriginPaidPeople: setSize(attributedPaid, (row) => row.ownerUserId),
      exactOriginPaidStripeSessions: attributedPaid.length,
      exactOriginRevenueMinorByCurrency: revenueByCurrency(attributedPaid),
      assistedPaidPeople: setSize(assistedPaid, (row) => row.userId),
      assistedPaidStripeSessions: assistedPaid.length,
      gate: config.gate ? { ...config.gate, state: gateState } : { state: gateState },
    }
  })

  const unresolvedStarts = externalStarts.filter((record) => record.origin.status !== 'exact')
  const unresolvedRatio = externalStarts.length > 0 ? unresolvedStarts.length / externalStarts.length : null
  const postDeliveryPeople = new Set(
    exposures.filter((row) => row.stage === 'post_delivery').map((row) => row.userId),
  ).size
  const firstExposureAt = exposures.length ? Math.min(...exposures.map((row) => row.at)) : null
  const days = observedDays(firstExposureAt, generatedAtMs)
  const sampleMet = postDeliveryPeople >= B2C_SUBSCRIPTION_TRUTH_MIN_POST_DELIVERY_PEOPLE &&
    new Set(externalStarts.map((row) => row.ownerUserId)).size >= B2C_SUBSCRIPTION_TRUTH_MIN_EXACT_STARTED_PEOPLE
  const qualityMet = unresolvedRatio !== null && unresolvedRatio <= B2C_SUBSCRIPTION_TRUTH_MAX_UNRESOLVED_RATIO
  const durationMet = days !== null && days >= B2C_SUBSCRIPTION_TRUTH_MIN_DAYS

  return {
    schemaVersion: B2C_SUBSCRIPTION_TRUTH_VERSION,
    generatedAt,
    window: { start: windowStart, observedDays: days, sourceLookbackRequiredDays: B2C_SUBSCRIPTION_TRUTH_LOOKBACK_DAYS },
    exclusions: {
      internalProfileRows: identity.internal.size,
      profileRowsMissingEmail: identity.unknown.size,
    },
    financialTruth: {
      ...ledger.summary,
      rule: 'One exact subscription Stripe Session contributes revenue once. All intermediary exposures are assists unless one exact checkout origin is proven.',
    },
    firstVideoTruth: {
      firstDeliveryPeopleSinceResultBoundary: firstDeliveryPeople.length,
      sampledPeople: sampledPeople.size,
      notSampledPeople,
      postDeliveryExposurePeople: postDeliveryPeople,
    },
    checkoutOriginTruth: {
      exactExternalSubscriptionStartedPeople: new Set(externalStarts.map((row) => row.ownerUserId)).size,
      exactExternalSubscriptionStartedStripeSessions: externalStarts.length,
      exactOriginStartedPeople: setSize(exactOriginStarts, (row) => row.ownerUserId),
      exactOriginStartedStripeSessions: exactOriginStarts.length,
      exactOriginPaidPeople: setSize(exactOriginPaid, (row) => row.ownerUserId),
      exactOriginPaidStripeSessions: exactOriginPaid.length,
      unresolvedStartedPeople: setSize(unresolvedStarts, (row) => row.ownerUserId),
      unresolvedStartedStripeSessions: unresolvedStarts.length,
      unresolvedStartedRatio: unresolvedRatio,
      unknownResumeGapStripeSessions: unresolvedStarts.filter((row) => row.origin.status === 'unknown_resume_gap').length,
    },
    assistanceTruth: {
      paidPeopleWithAnyPriorExposure: setSize(assistRows.filter((row) => row.experiments.length > 0), (row) => row.userId),
      paidStripeSessionsWithAnyPriorExposure: assistRows.filter((row) => row.experiments.length > 0).length,
      paidPeopleWithMultiplePriorExposures: setSize(assistRows.filter((row) => row.experiments.length > 1), (row) => row.userId),
      paidStripeSessionsWithMultiplePriorExposures: assistRows.filter((row) => row.experiments.length > 1).length,
      rule: 'Assists are non-exclusive and non-causal. They never add revenue or subscribers to an experiment.',
    },
    experiments: experimentRows,
    gate: {
      minimumPostDeliveryExposurePeople: B2C_SUBSCRIPTION_TRUTH_MIN_POST_DELIVERY_PEOPLE,
      minimumExactStartedPeople: B2C_SUBSCRIPTION_TRUTH_MIN_EXACT_STARTED_PEOPLE,
      minimumObservationDays: B2C_SUBSCRIPTION_TRUTH_MIN_DAYS,
      maximumUnresolvedStartedRatio: B2C_SUBSCRIPTION_TRUTH_MAX_UNRESOLVED_RATIO,
      sampleMet,
      durationMet,
      attributionQualityMet: qualityMet,
      state: sampleMet && durationMet && qualityMet ? 'ready_for_cross_experiment_decision' : 'collecting',
    },
    limitations: [
      'Checkout resume lacks a server-side origin-to-destination Session link and remains unknown_resume_gap.',
      'Trial post-video exposure is eligible only at or after ' + TRIAL_POST_VIDEO_VARIANT_BOUNDARY + ' with one canonical offer_layout variant.',
      'Observed first-event clocks for most surfaces are window-dependent; result-value and trial post-video have fixed code boundaries.',
      'This report does not repair legacy admin cards; it provides the finance contract they must adopt.',
    ],
  }
}
