import {
  isInternalMeasurementEmail,
  readCanonicalNumberConstant,
  readCanonicalStringConstant,
} from './measurement-helpers.mjs'

const CONTRACT_SOURCE = new URL('../lib/growth/localBusinessBriefObservability.ts', import.meta.url)

export const LOCAL_BUSINESS_BRIEF_REPORT_VERSION = 'local_business_brief_funnel_report_v1'
export const LOCAL_BUSINESS_BRIEF_INSTRUMENTED_AT = '2026-08-31T22:32:56.000Z'
export const LOCAL_BUSINESS_BRIEF_VERSION = readCanonicalStringConstant(
  CONTRACT_SOURCE,
  'LOCAL_BUSINESS_BRIEF_OBSERVABILITY_VERSION',
)
export const LOCAL_BUSINESS_BRIEF_CAMPAIGN = readCanonicalStringConstant(
  CONTRACT_SOURCE,
  'LOCAL_BUSINESS_BRIEF_CAMPAIGN',
)
export const LOCAL_BUSINESS_BRIEF_SURFACE = readCanonicalStringConstant(
  CONTRACT_SOURCE,
  'LOCAL_BUSINESS_BRIEF_SURFACE',
)
export const LOCAL_BUSINESS_BRIEF_GATE_SESSIONS = readCanonicalNumberConstant(
  CONTRACT_SOURCE,
  'LOCAL_BUSINESS_BRIEF_GATE_SESSIONS',
)
export const LOCAL_BUSINESS_BRIEF_GATE_GENERATED_SESSIONS = 3

export const LOCAL_BUSINESS_BRIEF_EVENT_NAMES = Object.freeze([
  'local_business_brief_viewed',
  'local_business_brief_sample_loaded',
  'local_business_brief_generated',
  'local_business_brief_activation_clicked',
])
export const LOCAL_BUSINESS_BRIEF_DOWNSTREAM_EVENT_NAMES = Object.freeze([
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

function classifyIdentity(row, profilesById) {
  if (!row.user_id) return 'anonymous'
  const profile = profilesById.get(row.user_id)
  if (!profile || !String(profile.email ?? '').trim()) return 'unknown_identified'
  return isInternalMeasurementEmail(profile.email) ? 'internal' : 'external_identified'
}

function firstAt(rows, name, predicate = () => true) {
  const row = rows.find((candidate) => candidate.name === name && predicate(candidate))
  return row ? timestamp(row) : null
}

function firstAtOrAfter(rows, name, notBefore, predicate = () => true) {
  if (notBefore === null) return null
  const row = rows.find((candidate) =>
    candidate.name === name &&
    predicate(candidate) &&
    timestamp(candidate) >= notBefore,
  )
  return row ? timestamp(row) : null
}

function countDistinctPeople(rows, name) {
  return new Set(
    rows.filter((row) => row.name === name && row.user_id).map((row) => row.user_id),
  ).size
}

export function buildLocalBusinessBriefFunnelReport({
  generatedAt,
  instrumentedAt = LOCAL_BUSINESS_BRIEF_INSTRUMENTED_AT,
  events,
  profiles,
}) {
  const generatedAtMs = Date.parse(generatedAt)
  const instrumentedAtMs = Date.parse(instrumentedAt)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(instrumentedAtMs)) {
    throw new Error('generatedAt and instrumentedAt must be valid timestamps')
  }

  const profilesById = new Map(profiles.filter((profile) => profile.id).map((profile) => [profile.id, profile]))
  const localRows = events
    .filter((row) =>
      LOCAL_BUSINESS_BRIEF_EVENT_NAMES.includes(row.name) &&
      metadataString(row, 'version') === LOCAL_BUSINESS_BRIEF_VERSION &&
      metadataString(row, 'campaign') === LOCAL_BUSINESS_BRIEF_CAMPAIGN &&
      metadataString(row, 'surface') === LOCAL_BUSINESS_BRIEF_SURFACE &&
      timestamp(row) !== null &&
      timestamp(row) >= instrumentedAtMs &&
      timestamp(row) <= generatedAtMs,
    )
    .map((row) => ({ ...row, identityClass: classifyIdentity(row, profilesById) }))
  const eligibleRows = localRows.filter((row) =>
    row.identityClass === 'anonymous' || row.identityClass === 'external_identified',
  )
  const sessionRows = eligibleRows.filter((row) => row.session_id)
  const bySession = new Map()
  for (const row of sessionRows.sort((left, right) => timestamp(left) - timestamp(right))) {
    const current = bySession.get(row.session_id)
    if (current) current.push(row)
    else bySession.set(row.session_id, [row])
  }

  const journeys = []
  for (const [sessionId, rows] of bySession) {
    const viewedAt = firstAt(rows, 'local_business_brief_viewed')
    const sampleLoadedAt = firstAt(rows, 'local_business_brief_sample_loaded')
    const manualGeneratedAt = firstAt(
      rows,
      'local_business_brief_generated',
      (row) => metadataString(row, 'draft_source') === 'manual',
    )
    const sampleGeneratedAt = firstAt(
      rows,
      'local_business_brief_generated',
      (row) => metadataString(row, 'draft_source') === 'sample',
    )
    const generatedCandidates = [manualGeneratedAt, sampleGeneratedAt].filter((value) => value !== null)
    const draftGeneratedAtMs = generatedCandidates.length ? Math.min(...generatedCandidates) : null
    const sequencedManualGeneratedAt = firstAtOrAfter(
      rows,
      'local_business_brief_generated',
      viewedAt,
      (row) => metadataString(row, 'draft_source') === 'manual',
    )
    const sequencedSampleGeneratedAt = firstAtOrAfter(
      rows,
      'local_business_brief_generated',
      viewedAt,
      (row) => metadataString(row, 'draft_source') === 'sample',
    )
    const sequencedGeneratedCandidates = [
      sequencedManualGeneratedAt,
      sequencedSampleGeneratedAt,
    ].filter((value) => value !== null)
    const sequencedGeneratedAt = sequencedGeneratedCandidates.length
      ? Math.min(...sequencedGeneratedCandidates)
      : null
    const activationAt = firstAt(rows, 'local_business_brief_activation_clicked')
    const sequencedActivationAt = firstAtOrAfter(
      rows,
      'local_business_brief_activation_clicked',
      sequencedGeneratedAt,
    )
    const sequencedManualActivationAt = firstAtOrAfter(
      rows,
      'local_business_brief_activation_clicked',
      sequencedManualGeneratedAt,
      (row) => metadataString(row, 'draft_source') === 'manual',
    )
    const sequencedSampleActivationAt = firstAtOrAfter(
      rows,
      'local_business_brief_activation_clicked',
      sequencedSampleGeneratedAt,
      (row) => metadataString(row, 'draft_source') === 'sample',
    )
    journeys.push({
      sessionId,
      viewed: viewedAt !== null,
      generated: sequencedGeneratedAt !== null,
      manualGenerated: sequencedManualGeneratedAt !== null,
      sampleGenerated: sequencedSampleGeneratedAt !== null,
      sampleLoaded: sampleLoadedAt !== null,
      activationClicked:
        sequencedManualActivationAt !== null ||
        sequencedSampleActivationAt !== null,
      manualActivationClicked: sequencedManualActivationAt !== null,
      sampleActivationClicked: sequencedSampleActivationAt !== null,
      unknownSourceActivation:
        sequencedActivationAt !== null &&
        sequencedManualActivationAt === null &&
        sequencedSampleActivationAt === null,
      generatedWithoutView: draftGeneratedAtMs !== null && viewedAt === null,
      generatedBeforeView:
        draftGeneratedAtMs !== null &&
        viewedAt !== null &&
        draftGeneratedAtMs < viewedAt,
      activationWithoutGenerated:
        activationAt !== null &&
        (sequencedGeneratedAt === null || activationAt < sequencedGeneratedAt),
    })
  }

  const knownExternalProfiles = profiles.filter((profile) =>
    profile.id &&
    String(profile.email ?? '').trim() &&
    !isInternalMeasurementEmail(profile.email),
  )
  const attributedProfiles = knownExternalProfiles.filter((profile) =>
    profile.signup_utm_campaign === LOCAL_BUSINESS_BRIEF_CAMPAIGN &&
    timestamp(profile) !== null &&
    timestamp(profile) >= instrumentedAtMs &&
    timestamp(profile) <= generatedAtMs,
  )
  const downstreamRows = events.filter((row) =>
    LOCAL_BUSINESS_BRIEF_DOWNSTREAM_EVENT_NAMES.includes(row.name) &&
    timestamp(row) !== null &&
    timestamp(row) <= generatedAtMs,
  )
  const attributedJourneys = attributedProfiles.map((profile) => {
    const signedUpAt = timestamp(profile)
    const rows = downstreamRows.filter((row) =>
      row.user_id === profile.id && timestamp(row) >= signedUpAt,
    )
    const checkoutRows = rows.filter((row) => row.name === 'checkout_started')
    const paymentRows = rows.filter((row) => row.name === 'payment_success')
    const paymentSucceeded = checkoutRows.some((checkout) => {
      const checkoutSessionId = metadataString(checkout, 'stripe_session_id')
      const checkoutAt = timestamp(checkout)
      if (!checkoutSessionId || checkoutAt === null) return false
      return paymentRows.some((payment) =>
        metadataString(payment, 'stripe_session_id') === checkoutSessionId &&
        timestamp(payment) >= checkoutAt,
      )
    })
    return {
      checkoutStarted: checkoutRows.length > 0,
      paymentSucceeded,
    }
  })

  const viewedSessions = journeys.filter((journey) => journey.viewed).length
  const generatedSessions = journeys.filter((journey) => journey.generated).length
  const manualGeneratedSessions = journeys.filter((journey) => journey.manualGenerated).length
  const viewedGateMet = viewedSessions >= LOCAL_BUSINESS_BRIEF_GATE_SESSIONS
  const manualGeneratedGateMet =
    manualGeneratedSessions >= LOCAL_BUSINESS_BRIEF_GATE_GENERATED_SESSIONS

  return {
    schemaVersion: LOCAL_BUSINESS_BRIEF_REPORT_VERSION,
    generatedAt,
    boundary: {
      instrumentedAt,
      basis: 'commit timestamp of the versioned local-business brief observability caller',
    },
    identityTruth: {
      internalEventRowsExcluded: localRows.filter((row) => row.identityClass === 'internal').length,
      unknownIdentifiedEventRows: localRows.filter((row) => row.identityClass === 'unknown_identified').length,
      anonymousEventRows: localRows.filter((row) => row.identityClass === 'anonymous').length,
      externalIdentifiedEventRows: localRows.filter((row) => row.identityClass === 'external_identified').length,
      eligibleRowsWithoutSession: eligibleRows.filter((row) => !row.session_id).length,
      rowsWithoutAnyActor: eligibleRows.filter((row) => !row.session_id && !row.user_id).length,
    },
    funnelBySession: {
      viewedSessions,
      generatedSessions,
      manualGeneratedSessions,
      sampleGeneratedSessions: journeys.filter((journey) => journey.sampleGenerated).length,
      sampleLoadedSessions: journeys.filter((journey) => journey.sampleLoaded).length,
      activationClickedSessions: journeys.filter((journey) => journey.activationClicked).length,
      manualActivationClickedSessions:
        journeys.filter((journey) => journey.manualActivationClicked).length,
      sampleActivationClickedSessions:
        journeys.filter((journey) => journey.sampleActivationClicked).length,
      unknownSourceActivationSessions:
        journeys.filter((journey) => journey.unknownSourceActivation).length,
      generatedWithoutViewSessions: journeys.filter((journey) => journey.generatedWithoutView).length,
      generatedBeforeViewSessions: journeys.filter((journey) => journey.generatedBeforeView).length,
      activationWithoutGeneratedSessions: journeys.filter((journey) => journey.activationWithoutGenerated).length,
    },
    externalPeopleDiagnostics: Object.fromEntries(
      LOCAL_BUSINESS_BRIEF_EVENT_NAMES.map((name) => [
        name,
        countDistinctPeople(
          eligibleRows.filter((row) => row.identityClass === 'external_identified'),
          name,
        ),
      ]),
    ),
    attributedSignupJourney: {
      signupPeople: attributedProfiles.length,
      checkoutStartedPeople: attributedJourneys.filter((journey) => journey.checkoutStarted).length,
      paymentSucceededPeople: attributedJourneys.filter((journey) => journey.paymentSucceeded).length,
    },
    gate: {
      minimumViewedSessions: LOCAL_BUSINESS_BRIEF_GATE_SESSIONS,
      minimumManualGeneratedSessions: LOCAL_BUSINESS_BRIEF_GATE_GENERATED_SESSIONS,
      viewedSessionsMet: viewedGateMet,
      manualGeneratedSessionsMet: manualGeneratedGateMet,
      state: viewedGateMet && manualGeneratedGateMet ? 'ready_for_decision' : 'collecting',
    },
    note: 'Sessions, identified people, and event rows are separate units. Only manually generated briefs open the usage gate; samples remain diagnostic. Signup attribution uses the exact canonical campaign. Revenue requires payment_success after checkout_started for the same Stripe Session.',
  }
}
