import { createHash } from 'node:crypto'
import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'
import { buildSubscriptionSessionOutcomeReport } from './subscription-session-outcome-report.mjs'

export const POST_EXPIRY_NEW_SESSION_VERSION = 'post_expiry_new_session_v1'
export const POST_EXPIRY_NEW_SESSION_BOUNDARY = '2026-08-05T00:22:42.000Z'
export const POST_EXPIRY_NEW_SESSION_WINDOW_DAYS = 30
export const POST_EXPIRY_NEW_SESSION_OBSERVATION_DAYS = 7
export const POST_EXPIRY_NEW_SESSION_MIN_PEOPLE = 5

export const POST_EXPIRY_NEW_SESSION_EVENT_NAMES = Object.freeze([
  'video_downloaded',
  'checkout_started',
  'payment_success',
  'checkout_session_expired',
])

const DAY_MS = 86_400_000
const DOWNLOAD_SURFACES = new Set(['done_screen', 'history', 'my_videos'])
const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function timestamp(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function metadataString(row, key) {
  return text(row?.metadata?.[key])
}

function metadataPositiveInteger(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

function opaqueReference(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 12)
}

function compareRows(left, right) {
  return (timestamp(left) ?? Number.POSITIVE_INFINITY) - (timestamp(right) ?? Number.POSITIVE_INFINITY) ||
    String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
}

function identityIndex(profiles) {
  const rowsById = new Map()
  for (const profile of profiles) {
    const id = text(profile?.id)
    if (!id) continue
    const rows = rowsById.get(id) ?? []
    rows.push(profile)
    rowsById.set(id, rows)
  }

  const external = new Set()
  const internal = new Set()
  const unknown = new Set()
  const conflict = new Set()
  for (const [id, rows] of rowsById) {
    const emails = new Set(rows.map((row) => String(row?.email ?? '').trim().toLowerCase()))
    if (emails.size !== 1) conflict.add(id)
    else if (![...emails][0]) unknown.add(id)
    else if (isInternalMeasurementEmail([...emails][0])) internal.add(id)
    else external.add(id)
  }
  return { external, internal, unknown, conflict }
}

function resolveFirstCompletedVideos(videos, identity, effectiveStartMs, matureBeforeMs) {
  const rowsByUser = new Map()
  const unresolvedOwners = new Set()
  const unresolvedIdentityOwners = new Set()
  let eligibleOwnerlessRows = 0
  let undatableOwnerlessRows = 0
  let undatableExternalOwnerRows = 0

  for (const row of videos) {
    if (row?.status !== 'completed') continue
    const userId = text(row?.user_id)
    const at = timestamp(row)
    if (!userId) {
      if (at === null) undatableOwnerlessRows += 1
      else if (at >= effectiveStartMs && at <= matureBeforeMs) eligibleOwnerlessRows += 1
      continue
    }
    if (at === null) {
      if (identity.external.has(userId)) {
        unresolvedOwners.add(userId)
        undatableExternalOwnerRows += 1
      }
      continue
    }
    if (identity.unknown.has(userId) || identity.conflict.has(userId)) {
      if (at >= effectiveStartMs && at <= matureBeforeMs) unresolvedIdentityOwners.add(userId)
      continue
    }
    if (!text(row?.id)) {
      if (identity.external.has(userId) && at >= effectiveStartMs && at <= matureBeforeMs) unresolvedOwners.add(userId)
      continue
    }
    const rows = rowsByUser.get(userId) ?? []
    rows.push(row)
    rowsByUser.set(userId, rows)
  }

  const firstByUser = new Map()
  for (const [userId, rows] of rowsByUser) {
    if (!identity.external.has(userId)) continue
    rows.sort(compareRows)
    const firstAt = timestamp(rows[0])
    const tied = rows.filter((row) => timestamp(row) === firstAt)
    if (tied.length !== 1) {
      unresolvedOwners.add(userId)
      continue
    }
    firstByUser.set(userId, {
      userId,
      videoId: text(tied[0].id),
      at: firstAt,
    })
  }
  return {
    firstByUser,
    unresolvedOwners,
    unresolvedIdentityOwners,
    eligibleOwnerlessRows,
    undatableOwnerlessRows,
    undatableExternalOwnerRows,
  }
}

function isExactFirstBlob(row, first) {
  return row?.name === 'video_downloaded' &&
    row?.user_id === first.userId &&
    row?.metadata?.method === 'blob' &&
    row?.metadata?.video_id === first.videoId &&
    DOWNLOAD_SURFACES.has(row?.metadata?.surface) &&
    metadataPositiveInteger(row, 'bytes') !== null
}

function isValidRecurringStart(row) {
  const tier = metadataString(row, 'tier')
  const billing = metadataString(row, 'billing')
  return row?.name === 'checkout_started' &&
    !metadataString(row, 'sku') &&
    Boolean(metadataString(row, 'stripe_session_id')) &&
    RECURRING_TIERS.has(tier) &&
    RECURRING_BILLING.has(billing) &&
    (tier !== 'autopilot' || billing === 'monthly')
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function objectFromCounts(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function moneyByCurrency(rows) {
  const totals = new Map()
  for (const row of rows) {
    if (row.laterOutcome !== 'paid' || !row.currency || !Number.isSafeInteger(row.amountMinor) || row.amountMinor <= 0) continue
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amountMinor)
  }
  return objectFromCounts(totals)
}

export function buildPostExpiryNewSessionReport({ generatedAt, windowStart, events, profiles, videos }) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const requestedWindowStartMs = Date.parse(String(windowStart ?? ''))
  const boundaryMs = Date.parse(POST_EXPIRY_NEW_SESSION_BOUNDARY)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(requestedWindowStartMs) || requestedWindowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }

  const effectiveStartMs = Math.max(requestedWindowStartMs, boundaryMs)
  const observationMs = POST_EXPIRY_NEW_SESSION_OBSERVATION_DAYS * DAY_MS
  const matureBeforeMs = generatedAtMs - observationMs
  const sourceEvents = events
    .filter((row) => timestamp(row) !== null && timestamp(row) <= generatedAtMs)
    .sort(compareRows)
  const identity = identityIndex(profiles)
  const firstResolution = resolveFirstCompletedVideos(videos, identity, effectiveStartMs, matureBeforeMs)
  const ledger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: new Date(effectiveStartMs).toISOString(),
    events: sourceEvents,
    profiles,
  })
  const mature = []
  const preexistingExactSubscribers = new Set()
  const preexistingSubscriptionUnknown = new Set()
  for (const first of firstResolution.firstByUser.values()) {
    if (first.at < effectiveStartMs || first.at > matureBeforeMs) continue
    const priorPaid = ledger.records.some((record) =>
      record.ownerClass === 'external' && record.ownerUserId === first.userId && record.status === 'paid' &&
      Number.isFinite(Date.parse(String(record.paidAt ?? ''))) && Date.parse(record.paidAt) < first.at,
    )
    const rawPriorPayment = sourceEvents.some((row) =>
      row?.name === 'payment_success' && row?.user_id === first.userId &&
      metadataString(row, 'checkout_mode') === 'subscription' && timestamp(row) < first.at,
    )
    if (priorPaid) preexistingExactSubscribers.add(first.userId)
    else if (rawPriorPayment) preexistingSubscriptionUnknown.add(first.userId)
    else mature.push({ ...first, cutoff: first.at + observationMs })
  }

  const exactBlobByUser = new Map()
  const unresolvedBlobUsers = new Set()
  const undatableEventUsers = new Set()
  for (const first of mature) {
    if (events.some((row) => row?.user_id === first.userId && POST_EXPIRY_NEW_SESSION_EVENT_NAMES.includes(row?.name) && timestamp(row) === null)) {
      undatableEventUsers.add(first.userId)
      continue
    }
    const candidates = sourceEvents.filter((row) => {
      const at = timestamp(row)
      return isExactFirstBlob(row, first) && at >= first.at && at <= first.cutoff
    })
    if (candidates.length > 0) exactBlobByUser.set(first.userId, timestamp(candidates[0]))
    else if (sourceEvents.some((row) => row?.name === 'video_downloaded' && row?.user_id === first.userId && metadataString(row, 'video_id') === first.videoId)) {
      unresolvedBlobUsers.add(first.userId)
    }
  }

  const firstExpiredPeople = new Set()
  const distinctLaterPeople = new Set()
  const ambiguousFirstPeople = new Set()
  const ambiguousLaterPeople = new Set()
  const rawStartWithoutExactOutcomePeople = new Set()
  const invalidPaidLaterPeople = new Set()
  const unresolvedLaterOutcomePeople = new Set()
  const openLaterOutcomePeople = new Set()
  const missingAnchorExpirationClockPeople = new Set()
  const invalidAnchorExpirationChronologyPeople = new Set()
  const preExpiryDistinctSessionPeople = new Set()
  const resolvedLaterPeople = new Set()
  const transitions = []
  const laterOutcomeCounts = new Map()
  let allLaterDistinctStripeSessions = 0
  const relevantOutcomeQuality = {
    subscriptionStartStripeSessionConflicts: 0,
    ledgerConflictStripeSessions: 0,
    unlinkedSubscriptionPaymentSessions: 0,
    conflictingOutcomeSessions: 0,
  }

  for (const first of mature) {
    const blobAt = exactBlobByUser.get(first.userId)
    if (!Number.isFinite(blobAt)) continue
    const rawStartRows = sourceEvents.filter((row) => {
      const at = timestamp(row)
      return row?.user_id === first.userId && isValidRecurringStart(row) && at > blobAt && at <= first.cutoff
    })
    const rawSessionIds = new Set(rawStartRows.map((row) => metadataString(row, 'stripe_session_id')))
    const rawSessionReferences = new Set([...rawSessionIds].map(opaqueReference))
    const rawSessionIdByReference = new Map([...rawSessionIds].map((id) => [opaqueReference(id), id]))
    const scopedEvents = sourceEvents.filter((row) => {
      const at = timestamp(row)
      if (at <= blobAt || at > first.cutoff) return false
      if (row?.name === 'checkout_started') return row?.user_id === first.userId
      return rawSessionIds.has(metadataString(row, 'stripe_session_id'))
    })
    const scopedOutcome = buildSubscriptionSessionOutcomeReport({
      generatedAt: new Date(first.cutoff).toISOString(),
      windowStart: new Date(blobAt).toISOString(),
      events: scopedEvents,
      profiles,
    })
    const scopedLedger = buildSubscriptionRevenueLedger({
      generatedAt: new Date(first.cutoff).toISOString(),
      windowStart: new Date(blobAt).toISOString(),
      events: scopedEvents,
      profiles,
    })
    const scopedLedgerByReference = new Map(
      scopedLedger.records.map((record) => [opaqueReference(record.stripeSessionId), record]),
    )
    relevantOutcomeQuality.subscriptionStartStripeSessionConflicts +=
      scopedOutcome.quality.subscriptionStartStripeSessionConflicts
    relevantOutcomeQuality.ledgerConflictStripeSessions += scopedOutcome.quality.ledgerConflictStripeSessions
    relevantOutcomeQuality.unlinkedSubscriptionPaymentSessions +=
      scopedOutcome.quality.unlinkedSubscriptionPaymentSessions
    relevantOutcomeQuality.conflictingOutcomeSessions +=
      scopedOutcome.sessions.filter((session) => session.outcome === 'conflict').length
    const sessions = scopedOutcome.sessions
      .sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt) ||
        left.sessionReference.localeCompare(right.sessionReference))

    const exactReferences = new Set(sessions.map((session) => session.sessionReference))
    if ([...rawSessionReferences].some((reference) => !exactReferences.has(reference))) rawStartWithoutExactOutcomePeople.add(first.userId)
    if (sessions.length === 0) continue
    const firstStartedAt = Date.parse(sessions[0].startedAt)
    if (sessions.filter((session) => Date.parse(session.startedAt) === firstStartedAt).length !== 1) {
      ambiguousFirstPeople.add(first.userId)
      continue
    }
    const anchor = sessions[0]
    if (anchor.outcome !== 'expired_unpaid') continue

    const anchorSessionId = rawSessionIdByReference.get(anchor.sessionReference)
    const anchorExpirationRows = scopedEvents.filter((row) =>
      row?.name === 'checkout_session_expired' &&
      row?.user_id === first.userId &&
      metadataString(row, 'stripe_session_id') === anchorSessionId &&
      metadataString(row, 'checkout_mode') === 'subscription' &&
      metadataString(row, 'payment_status') === 'unpaid',
    )
    if (anchorExpirationRows.some((row) => timestamp(row) < firstStartedAt)) {
      invalidAnchorExpirationChronologyPeople.add(first.userId)
      continue
    }
    const validAnchorExpirationRows = anchorExpirationRows.filter((row) => timestamp(row) >= firstStartedAt)
    const anchorExpiredAt = validAnchorExpirationRows.length > 0 ? timestamp(validAnchorExpirationRows[0]) : null
    if (!Number.isFinite(anchorExpiredAt)) {
      missingAnchorExpirationClockPeople.add(first.userId)
      continue
    }
    firstExpiredPeople.add(first.userId)
    if (sessions.some((session) =>
      session.sessionReference !== anchor.sessionReference &&
      Date.parse(session.startedAt) > firstStartedAt &&
      Date.parse(session.startedAt) <= anchorExpiredAt,
    )) preExpiryDistinctSessionPeople.add(first.userId)
    const later = sessions.filter((session) =>
      session.sessionReference !== anchor.sessionReference && Date.parse(session.startedAt) > anchorExpiredAt,
    )
    if (later.length === 0) continue
    allLaterDistinctStripeSessions += later.length
    const laterStartedAt = Date.parse(later[0].startedAt)
    if (later.filter((session) => Date.parse(session.startedAt) === laterStartedAt).length !== 1) {
      ambiguousLaterPeople.add(first.userId)
      continue
    }
    const next = later[0]
    const record = scopedLedgerByReference.get(next.sessionReference)
    let amountMinor = null
    let currency = null
    if (next.outcome === 'paid') {
      const paidAt = Date.parse(String(record?.paidAt ?? ''))
      if (!record || record.status !== 'paid' || record.ownerUserId !== first.userId ||
          !Number.isFinite(paidAt) || paidAt < laterStartedAt || paidAt > first.cutoff ||
          !Number.isSafeInteger(record.amountMinor) || record.amountMinor <= 0 || !record.currency) {
        invalidPaidLaterPeople.add(first.userId)
        continue
      }
      amountMinor = record.amountMinor
      currency = record.currency
    }
    distinctLaterPeople.add(first.userId)
    increment(laterOutcomeCounts, next.outcome)
    if (next.outcome === 'open_before_deadline') openLaterOutcomePeople.add(first.userId)
    else if (next.outcome !== 'paid' && next.outcome !== 'expired_unpaid') {
      unresolvedLaterOutcomePeople.add(first.userId)
    } else {
      resolvedLaterPeople.add(first.userId)
    }
    transitions.push({
      actorReference: opaqueReference(first.userId),
      firstSessionReference: anchor.sessionReference,
      firstOutcome: anchor.outcome,
      laterSessionReference: next.sessionReference,
      laterOutcome: next.outcome,
      amountMinor,
      currency,
    })
  }

  const unresolvedPeople = new Set([
    ...firstResolution.unresolvedOwners,
    ...preexistingSubscriptionUnknown,
    ...unresolvedBlobUsers,
    ...undatableEventUsers,
    ...ambiguousFirstPeople,
    ...ambiguousLaterPeople,
    ...rawStartWithoutExactOutcomePeople,
    ...invalidPaidLaterPeople,
    ...unresolvedLaterOutcomePeople,
    ...missingAnchorExpirationClockPeople,
    ...invalidAnchorExpirationChronologyPeople,
    ...firstResolution.unresolvedIdentityOwners,
  ])
  const qualityBlocked = relevantOutcomeQuality.subscriptionStartStripeSessionConflicts > 0 ||
    relevantOutcomeQuality.ledgerConflictStripeSessions > 0 ||
    relevantOutcomeQuality.unlinkedSubscriptionPaymentSessions > 0 ||
    relevantOutcomeQuality.conflictingOutcomeSessions > 0 ||
    firstResolution.eligibleOwnerlessRows > 0 || firstResolution.undatableOwnerlessRows > 0 ||
    firstResolution.undatableExternalOwnerRows > 0 ||
    unresolvedPeople.size > 0
  const completeSample = resolvedLaterPeople.size >= POST_EXPIRY_NEW_SESSION_MIN_PEOPLE
  const gateState = qualityBlocked ? 'blocked_data_quality' : completeSample ? 'ready_for_diagnosis' : 'collecting'

  return {
    schemaVersion: POST_EXPIRY_NEW_SESSION_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    requestedWindowStart: new Date(requestedWindowStartMs).toISOString(),
    effectiveWindowStart: new Date(effectiveStartMs).toISOString(),
    contractBoundary: POST_EXPIRY_NEW_SESSION_BOUNDARY,
    observationDays: POST_EXPIRY_NEW_SESSION_OBSERVATION_DAYS,
    funnel: {
      matureExternalFirstVideoPeople: mature.length,
      exactFirstFileBlobPeople: exactBlobByUser.size,
      firstExactExpiredUnpaidPeople: firstExpiredPeople.size,
      firstExactExpiredUnpaidStripeSessions: firstExpiredPeople.size,
      distinctLaterSessionPeople: distinctLaterPeople.size,
      firstDistinctLaterStripeSessions: distinctLaterPeople.size,
      allLaterDistinctStripeSessions,
      resolvedLaterOutcomePeople: resolvedLaterPeople.size,
      resolvedLaterOutcomeStripeSessions: resolvedLaterPeople.size,
      laterOutcomeByStatus: objectFromCounts(laterOutcomeCounts),
      laterPaidPeople: transitions.filter((row) => row.laterOutcome === 'paid').length,
      laterPaidStripeSessions: transitions.filter((row) => row.laterOutcome === 'paid').length,
      laterRevenueMinorByCurrency: moneyByCurrency(transitions),
    },
    transitions,
    exclusionsAndDiagnostics: {
      preexistingExactSubscriberPeople: preexistingExactSubscribers.size,
      preexistingSubscriptionUnknownPeople: preexistingSubscriptionUnknown.size,
      unresolvedFirstVideoOwners: firstResolution.unresolvedOwners.size,
      unresolvedIdentityVideoOwners: firstResolution.unresolvedIdentityOwners.size,
      eligibleOwnerlessCompletedVideoRows: firstResolution.eligibleOwnerlessRows,
      undatableOwnerlessCompletedVideoRows: firstResolution.undatableOwnerlessRows,
      undatableExternalOwnerVideoRows: firstResolution.undatableExternalOwnerRows,
      profilesWithoutCreatedAt: profiles.filter((profile) => timestamp(profile) === null).length,
      unresolvedFirstBlobPeople: unresolvedBlobUsers.size,
      undatableEventPeople: undatableEventUsers.size,
      ambiguousFirstSessionPeople: ambiguousFirstPeople.size,
      ambiguousLaterSessionPeople: ambiguousLaterPeople.size,
      rawStartWithoutExactOutcomePeople: rawStartWithoutExactOutcomePeople.size,
      invalidPaidLaterPeople: invalidPaidLaterPeople.size,
      unresolvedLaterOutcomePeople: unresolvedLaterOutcomePeople.size,
      openLaterOutcomePeople: openLaterOutcomePeople.size,
      missingAnchorExpirationClockPeople: missingAnchorExpirationClockPeople.size,
      invalidAnchorExpirationChronologyPeople: invalidAnchorExpirationChronologyPeople.size,
      preExpiryDistinctSessionPeople: preExpiryDistinctSessionPeople.size,
      outcomeStartConflictsInCohort: relevantOutcomeQuality.subscriptionStartStripeSessionConflicts,
      ledgerConflictsInCohort: relevantOutcomeQuality.ledgerConflictStripeSessions,
      unlinkedSubscriptionPaymentSessionsInCohort: relevantOutcomeQuality.unlinkedSubscriptionPaymentSessions,
      conflictingOutcomeSessionsInCohort: relevantOutcomeQuality.conflictingOutcomeSessions,
    },
    gate: {
      state: gateState,
      minimumResolvedLaterSessionPeople: POST_EXPIRY_NEW_SESSION_MIN_PEOPLE,
      completeSample,
      neverAuthorizesProductChange: true,
    },
    note: 'Association-only diagnostic. The first recurring Stripe Session remains expired_unpaid even if a later distinct Session pays. Same-Session resume interactions remain unlinked assists and are never relabeled as a new Session. People, Stripe Sessions and revenue are separate units; currencies are never summed.',
  }
}
