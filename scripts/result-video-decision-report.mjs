import {
  isInternalMeasurementEmail,
  readCanonicalStringConstant,
} from './measurement-helpers.mjs'

export const RESULT_VIDEO_DECISION_REPORT_VERSION = 'result_video_decision_report_v2'
export const RESULT_VIDEO_DECISION_INSTRUMENTED_AT = '2026-09-01T18:48:08.098670+00:00'
export const RESULT_VIDEO_DECISION_MINIMUM_PEOPLE = 20
export const RESULT_VIDEO_DECISION_MINIMUM_SAMPLED = 5
export const RESULT_VIDEO_DECISION_MINIMUM_NOT_SAMPLED = 5
export const RESULT_VIDEO_DECISION_MINIMUM_DAYS = 7

const HISTORY_HUMAN_VIEW_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/historyFirstVideoOfferHumanView.ts', import.meta.url),
  'HISTORY_FIRST_VIDEO_OFFER_HUMAN_VIEW_VERSION',
)
const CHECKOUT_RESUME_HUMAN_VIEW_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/checkoutResumeHumanView.ts', import.meta.url),
  'CHECKOUT_RESUME_HUMAN_VIEW_VERSION',
)
const PLAN_FIT_OFFER_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/planFit.ts', import.meta.url),
  'PLAN_FIT_OFFER_VERSION',
)
const TRIAL_BALANCE_BRIDGE_VERSION = readCanonicalStringConstant(
  new URL('../lib/growth/trialBalanceBridge.ts', import.meta.url),
  'TRIAL_BALANCE_BRIDGE_VERSION',
)

const CLICK_EVENTS = Object.freeze([
  'plan_fit_checkout_clicked',
  'trial_balance_bridge_clicked',
  'trial_post_video_offer_clicked',
  'trial_repeat_episode_clicked',
  'trial_repeat_subscription_clicked',
  'history_first_video_offer_clicked',
  'checkout_resume_banner_clicked',
  'checkout_resume_smaller_plan_clicked',
])

export const RESULT_VIDEO_DECISION_EVENT_NAMES = Object.freeze([
  'result_video_value_sampled',
  'plan_fit_card_rendered',
  'plan_fit_checkout_cta_viewed',
  'plan_fit_impression',
  'trial_balance_bridge_viewed',
  'trial_post_video_offer_viewed',
  'history_first_video_offer_viewed',
  'checkout_resume_choice_viewed',
  ...CLICK_EVENTS,
  'pricing_view',
  'video_generation_completed',
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

function firstMatching(rows, name, predicate = () => true) {
  return rows.find((row) => row.name === name && predicate(row)) ?? null
}

function firstVideoByUser(videos) {
  const first = new Map()
  for (const video of videos) {
    if (!video.user_id || video.status !== 'completed' || timestamp(video) === null) continue
    const current = first.get(video.user_id)
    if (!current || timestamp(video) < timestamp(current)) first.set(video.user_id, video)
  }
  return first
}

function surfaceSignals(rows) {
  const strictDwell = {
    historyOffer: Boolean(firstMatching(
      rows,
      'history_first_video_offer_viewed',
      (row) => metadataString(row, 'version') === HISTORY_HUMAN_VIEW_VERSION,
    )),
    checkoutResume: Boolean(firstMatching(
      rows,
      'checkout_resume_choice_viewed',
      (row) => metadataString(row, 'version') === CHECKOUT_RESUME_HUMAN_VIEW_VERSION,
    )),
  }
  const qualifiedViewport = {
    planFitCheckoutCta: Boolean(firstMatching(
      rows,
      'plan_fit_checkout_cta_viewed',
      (row) =>
        metadataString(row, 'offer_version') === PLAN_FIT_OFFER_VERSION &&
        metadataString(row, 'event_unit') === 'first_completed_video',
    )),
    balanceBridge: Boolean(firstMatching(
      rows,
      'trial_balance_bridge_viewed',
      (row) => metadataString(row, 'bridge_version') === TRIAL_BALANCE_BRIDGE_VERSION,
    )),
    trialOffer: Boolean(firstMatching(
      rows,
      'trial_post_video_offer_viewed',
      (row) => metadataString(row, 'source') === 'result_trial_continue',
    )),
  }
  const diagnosticOnly = {
    planFitCardRendered: Boolean(firstMatching(rows, 'plan_fit_card_rendered')),
    legacyPlanFitImpression: Boolean(firstMatching(rows, 'plan_fit_impression')),
    unversionedHistoryOffer: Boolean(firstMatching(
      rows,
      'history_first_video_offer_viewed',
      (row) => metadataString(row, 'version') !== HISTORY_HUMAN_VIEW_VERSION,
    )),
  }
  return {
    strictDwell,
    qualifiedViewport,
    diagnosticOnly,
    decisionSurfaceExposed:
      Object.values(strictDwell).some(Boolean) ||
      Object.values(qualifiedViewport).some(Boolean),
  }
}

function outcomeSignals(rows, baselineAttemptId) {
  const completionAttempts = rows
    .filter((row) => row.name === 'video_generation_completed')
    .map((row) => metadataString(row, 'attempt_id'))
    .filter(Boolean)
  const inferredBaselineAttempt = baselineAttemptId ?? completionAttempts[0] ?? null
  const verifiedSecondCompletion = Boolean(
    inferredBaselineAttempt &&
    completionAttempts.some((attemptId) => attemptId !== inferredBaselineAttempt),
  )
  return {
    decisionClicked: CLICK_EVENTS.some((name) => Boolean(firstMatching(rows, name))),
    pricingViewed: Boolean(firstMatching(rows, 'pricing_view')),
    verifiedSecondCompletion,
    completionRowsWithoutAttempt: rows.filter(
      (row) => row.name === 'video_generation_completed' && !metadataString(row, 'attempt_id'),
    ).length,
    checkoutStarted: Boolean(firstMatching(rows, 'checkout_started')),
    paymentSucceeded: Boolean(firstMatching(rows, 'payment_success')),
  }
}

function countWhere(journeys, predicate) {
  return journeys.filter(predicate).length
}

function summarize(journeys) {
  return {
    people: journeys.length,
    strictDwellSurfacePeople: countWhere(
      journeys,
      (journey) => Object.values(journey.afterFirstDeliverySurfaces.strictDwell).some(Boolean),
    ),
    qualifiedViewportSurfacePeople: countWhere(
      journeys,
      (journey) => Object.values(journey.afterFirstDeliverySurfaces.qualifiedViewport).some(Boolean),
    ),
    anyDecisionSurfacePeople: countWhere(
      journeys,
      (journey) => journey.afterFirstDeliverySurfaces.decisionSurfaceExposed,
    ),
    noDecisionSurfacePeople: countWhere(
      journeys,
      (journey) => !journey.afterFirstDeliverySurfaces.decisionSurfaceExposed,
    ),
    decisionClickedPeople: countWhere(journeys, (journey) => journey.afterFirstDeliveryOutcomes.decisionClicked),
    pricingViewedPeople: countWhere(journeys, (journey) => journey.afterFirstDeliveryOutcomes.pricingViewed),
    verifiedSecondCompletionPeople: countWhere(
      journeys,
      (journey) => journey.afterFirstDeliveryOutcomes.verifiedSecondCompletion,
    ),
    checkoutStartedPeople: countWhere(journeys, (journey) => journey.afterFirstDeliveryOutcomes.checkoutStarted),
    paymentSucceededPeople: countWhere(journeys, (journey) => journey.afterFirstDeliveryOutcomes.paymentSucceeded),
    checkoutWithoutDecisionSurfacePeople: countWhere(
      journeys,
      (journey) =>
        journey.afterFirstDeliveryOutcomes.checkoutStarted &&
        !journey.afterFirstDeliverySurfaces.decisionSurfaceExposed,
    ),
  }
}

export function buildResultVideoDecisionReport({
  generatedAt,
  instrumentedAt = RESULT_VIDEO_DECISION_INSTRUMENTED_AT,
  events,
  profiles,
  videos,
}) {
  const generatedAtMs = Date.parse(generatedAt)
  const instrumentedAtMs = Date.parse(instrumentedAt)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(instrumentedAtMs)) {
    throw new Error('generatedAt and instrumentedAt must be valid timestamps')
  }

  const profileIds = new Set(profiles.map((profile) => profile.id).filter(Boolean))
  const internalUserIds = new Set(
    profiles.filter((profile) => isInternalMeasurementEmail(profile.email)).map((profile) => profile.id),
  )
  const missingEmailUserIds = new Set(
    profiles
      .filter((profile) => profile.id && !String(profile.email ?? '').trim())
      .map((profile) => profile.id),
  )
  const knownExternalUserIds = new Set(
    profiles
      .filter((profile) =>
        profile.id &&
        String(profile.email ?? '').trim() &&
        !internalUserIds.has(profile.id),
      )
      .map((profile) => profile.id),
  )

  const firstVideos = firstVideoByUser(videos)
  const unknownFirstDeliveryUserIds = new Set()
  for (const [userId, video] of firstVideos) {
    const at = timestamp(video)
    if (at < instrumentedAtMs || at > generatedAtMs) continue
    if (!profileIds.has(userId) || missingEmailUserIds.has(userId)) unknownFirstDeliveryUserIds.add(userId)
  }

  const cohort = [...firstVideos.entries()]
    .filter(([userId, video]) => {
      const at = timestamp(video)
      return knownExternalUserIds.has(userId) && at >= instrumentedAtMs && at <= generatedAtMs
    })
    .sort((left, right) => timestamp(left[1]) - timestamp(right[1]))

  const externalEvents = events.filter((row) => knownExternalUserIds.has(row.user_id) && timestamp(row) !== null)
  const journeys = cohort.map(([userId, firstVideo]) => {
    const firstDeliveryAt = timestamp(firstVideo)
    const actorRows = externalEvents
      .filter((row) => row.user_id === userId && timestamp(row) >= firstDeliveryAt && timestamp(row) <= generatedAtMs)
      .sort((left, right) => timestamp(left) - timestamp(right))
    const sample = firstMatching(
      actorRows,
      'result_video_value_sampled',
      (row) =>
        metadataString(row, 'version') === 'result_video_value_sampled_v1' &&
        metadataString(row, 'first_delivery_status') === 'confirmed',
    )
    const sampleAt = sample ? timestamp(sample) : null
    const sampleAttemptId = sample ? metadataString(sample, 'attempt_id') : null
    const firstCompletionAttemptId = metadataString(firstMatching(actorRows, 'video_generation_completed'), 'attempt_id')
    const afterSampleRows = sampleAt === null
      ? []
      : actorRows.filter((row) => timestamp(row) >= sampleAt)
    return {
      userId,
      firstDeliveryAt,
      sampleStatus: sample ? 'sampled' : 'not_sampled',
      sampledAt: sampleAt,
      afterFirstDeliverySurfaces: surfaceSignals(actorRows),
      afterFirstDeliveryOutcomes: outcomeSignals(actorRows, sampleAttemptId ?? firstCompletionAttemptId),
      afterValueSampleSurfaces: sample ? surfaceSignals(afterSampleRows) : null,
      afterValueSampleOutcomes: sample ? outcomeSignals(afterSampleRows, sampleAttemptId) : null,
    }
  })

  const sampled = journeys.filter((journey) => journey.sampleStatus === 'sampled')
  const notSampled = journeys.filter((journey) => journey.sampleStatus === 'not_sampled')
  const peopleGateMet = journeys.length >= RESULT_VIDEO_DECISION_MINIMUM_PEOPLE
  const sampledGateMet = sampled.length >= RESULT_VIDEO_DECISION_MINIMUM_SAMPLED
  const notSampledGateMet = notSampled.length >= RESULT_VIDEO_DECISION_MINIMUM_NOT_SAMPLED
  const elapsedDays = Math.max(0, (generatedAtMs - instrumentedAtMs) / 86_400_000)
  const elapsedDaysMet = elapsedDays >= RESULT_VIDEO_DECISION_MINIMUM_DAYS

  return {
    schemaVersion: RESULT_VIDEO_DECISION_REPORT_VERSION,
    generatedAt,
    cohortBoundary: {
      instrumentedAt,
      basis: 'first completed videos row created at or after the first persisted production sample',
      elapsedDays,
    },
    exclusions: {
      internalProfileRows: internalUserIds.size,
      profileRowsMissingEmail: missingEmailUserIds.size,
      firstDeliveryPeopleWithUnknownIdentity: unknownFirstDeliveryUserIds.size,
    },
    cohortTruth: {
      firstDeliveryPeople: journeys.length,
      sampledPeople: sampled.length,
      notSampledPeople: notSampled.length,
      completeExternalPeopleCountAvailable: unknownFirstDeliveryUserIds.size === 0,
    },
    associationAfterFirstDelivery: {
      sampled: summarize(sampled),
      notSampled: summarize(notSampled),
    },
    afterValueSampleOnly: {
      people: sampled.length,
      anyDecisionSurfacePeople: countWhere(
        sampled,
        (journey) => journey.afterValueSampleSurfaces.decisionSurfaceExposed,
      ),
      noDecisionSurfacePeople: countWhere(
        sampled,
        (journey) => !journey.afterValueSampleSurfaces.decisionSurfaceExposed,
      ),
      decisionClickedPeople: countWhere(
        sampled,
        (journey) => journey.afterValueSampleOutcomes.decisionClicked,
      ),
      verifiedSecondCompletionPeople: countWhere(
        sampled,
        (journey) => journey.afterValueSampleOutcomes.verifiedSecondCompletion,
      ),
      checkoutStartedPeople: countWhere(
        sampled,
        (journey) => journey.afterValueSampleOutcomes.checkoutStarted,
      ),
      paymentSucceededPeople: countWhere(
        sampled,
        (journey) => journey.afterValueSampleOutcomes.paymentSucceeded,
      ),
    },
    diagnostics: {
      technicalPlanFitRenderedPeople: countWhere(
        journeys,
        (journey) => journey.afterFirstDeliverySurfaces.diagnosticOnly.planFitCardRendered,
      ),
      planFitCardImpressionDiagnosticPeople: countWhere(
        journeys,
        (journey) => journey.afterFirstDeliverySurfaces.diagnosticOnly.legacyPlanFitImpression,
      ),
      unversionedHistoryOfferPeople: countWhere(
        journeys,
        (journey) => journey.afterFirstDeliverySurfaces.diagnosticOnly.unversionedHistoryOffer,
      ),
      completionRowsWithoutAttempt: journeys.reduce(
        (total, journey) => total + journey.afterFirstDeliveryOutcomes.completionRowsWithoutAttempt,
        0,
      ),
    },
    gate: {
      minimumFirstDeliveryPeople: RESULT_VIDEO_DECISION_MINIMUM_PEOPLE,
      minimumSampledPeople: RESULT_VIDEO_DECISION_MINIMUM_SAMPLED,
      minimumNotSampledPeople: RESULT_VIDEO_DECISION_MINIMUM_NOT_SAMPLED,
      minimumElapsedDays: RESULT_VIDEO_DECISION_MINIMUM_DAYS,
      firstDeliveryPeopleMet: peopleGateMet,
      sampledPeopleMet: sampledGateMet,
      notSampledPeopleMet: notSampledGateMet,
      elapsedDaysMet,
      state:
        peopleGateMet && sampledGateMet && notSampledGateMet && elapsedDaysMet
          ? 'ready_for_decision'
          : 'collecting',
    },
    note: 'People means a distinct authenticated user_id with a present non-internal email. Viewport exposure and strict dwell are separate. Legacy or unversioned views remain diagnostics. This report measures association, never causal lift.',
  }
}
