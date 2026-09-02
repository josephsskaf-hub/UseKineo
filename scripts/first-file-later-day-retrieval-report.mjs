import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const FIRST_FILE_RETRIEVAL_REPORT_VERSION = 'first_file_later_day_retrieval_to_subscription_v1'
export const FIRST_FILE_RETRIEVAL_BOUNDARY = '2026-08-05T00:22:42.000Z'
export const FIRST_FILE_RETRIEVAL_WINDOW_DAYS = 30
export const FIRST_FILE_RETRIEVAL_OBSERVATION_DAYS = 7
export const FIRST_FILE_RETRIEVAL_MIN_BLOB_PEOPLE = 20
export const FIRST_FILE_RETRIEVAL_MIN_RETRIEVAL_PEOPLE = 5
export const FIRST_FILE_RETRIEVAL_MIN_NO_RETRIEVAL_PEOPLE = 5
export const FIRST_FILE_RETRIEVAL_MIN_CHECKOUT_PEOPLE = 5
export const FIRST_FILE_RETRIEVAL_MAX_UNRESOLVED_RATIO = 0.2

export const FIRST_FILE_RETRIEVAL_DOWNLOAD_EVENT_NAMES = Object.freeze(['video_downloaded'])
export const FIRST_FILE_RETRIEVAL_FINANCIAL_EVENT_NAMES = Object.freeze(['checkout_started', 'payment_success'])
export const FIRST_FILE_RETRIEVAL_EVENT_NAMES = Object.freeze([
  ...FIRST_FILE_RETRIEVAL_DOWNLOAD_EVENT_NAMES,
  ...FIRST_FILE_RETRIEVAL_FINANCIAL_EVENT_NAMES,
])

const FIRST_BLOB_SURFACES = new Set(['done_screen', 'history', 'my_videos'])
const RETRIEVAL_SURFACES = new Set(['history', 'my_videos'])
const DAY_MS = 86_400_000

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function timestamp(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function metadataExactString(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function metadataPositiveInteger(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

function compareRows(left, right) {
  return (timestamp(left) ?? Number.POSITIVE_INFINITY) - (timestamp(right) ?? Number.POSITIVE_INFINITY) ||
    String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
}

function utcDay(ms) {
  return new Date(ms).toISOString().slice(0, 10)
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

function firstCompletedVideos(videos, identity, effectiveStartMs, matureBeforeMs) {
  const rowsByUser = new Map()
  const ownersByVideoId = new Map()
  let eligibleOwnerlessCompletedRows = 0
  let undatableOwnerlessCompletedRows = 0
  for (const row of videos) {
    if (row?.status !== 'completed') continue
    const userId = text(row?.user_id)
    if (!userId) {
      const at = timestamp(row)
      if (at === null) undatableOwnerlessCompletedRows += 1
      else if (at >= effectiveStartMs && at <= matureBeforeMs) eligibleOwnerlessCompletedRows += 1
      continue
    }
    const rows = rowsByUser.get(userId) ?? []
    rows.push(row)
    rowsByUser.set(userId, rows)
    const videoId = text(row?.id)
    if (videoId) {
      const owners = ownersByVideoId.get(videoId) ?? new Set()
      owners.add(userId)
      ownersByVideoId.set(videoId, owners)
    }
  }

  const firstByUser = new Map()
  const unresolvedEligible = new Set()
  const unresolvedIdentityEligible = new Set()
  const undatableOwners = new Set()
  for (const [userId, rows] of rowsByUser) {
    if (identity.internal.has(userId)) continue
    const validTimes = rows.map(timestamp).filter((value) => value !== null)
    const candidateAt = validTimes.length ? Math.min(...validTimes) : null
    const eligible = candidateAt !== null && candidateAt >= effectiveStartMs && candidateAt <= matureBeforeMs
    if (!identity.external.has(userId)) {
      if (eligible) unresolvedIdentityEligible.add(userId)
      if (validTimes.length !== rows.length) undatableOwners.add(userId)
      continue
    }
    if (validTimes.length !== rows.length) {
      undatableOwners.add(userId)
      if (eligible) unresolvedEligible.add(userId)
      continue
    }
    const ordered = [...rows].sort(compareRows)
    const firstAt = timestamp(ordered[0])
    const tiedIds = new Set(ordered.filter((row) => timestamp(row) === firstAt).map((row) => text(row?.id)))
    const videoId = text(ordered[0]?.id)
    if (tiedIds.size !== 1 || tiedIds.has(null) || !videoId ||
      (ownersByVideoId.get(videoId)?.size ?? 0) !== 1 || !text(ordered[0]?.video_url)) {
      if (eligible) unresolvedEligible.add(userId)
      continue
    }
    firstByUser.set(userId, { userId, videoId, at: firstAt })
  }
  return {
    firstByUser,
    unresolvedEligible,
    unresolvedIdentityEligible,
    undatableOwners,
    eligibleOwnerlessCompletedRows,
    undatableOwnerlessCompletedRows,
  }
}

function exactBlob(row, first, surfaces = FIRST_BLOB_SURFACES) {
  return row?.name === 'video_downloaded' && row?.user_id === first.userId &&
    metadataExactString(row, 'video_id') === first.videoId &&
    metadataExactString(row, 'method') === 'blob' &&
    metadataPositiveInteger(row, 'bytes') !== null &&
    surfaces.has(metadataExactString(row, 'surface'))
}

function paymentWithin(record, cutoffMs) {
  const startedAt = Date.parse(String(record?.startedAt ?? ''))
  const paidAt = Date.parse(String(record?.paidAt ?? ''))
  return record?.status === 'paid' && Number.isFinite(startedAt) && Number.isFinite(paidAt) &&
    paidAt >= startedAt && paidAt <= cutoffMs && Number.isSafeInteger(record.amountMinor) &&
    record.amountMinor > 0 && Boolean(record.currency)
}

function moneyByCurrency(rows) {
  const totals = new Map()
  for (const row of rows) {
    if (!row.paid || !row.currency || !Number.isSafeInteger(row.amountMinor) || row.amountMinor <= 0) continue
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function summarize(rows) {
  const checkout = rows.filter((row) => row.anchor)
  const paid = checkout.filter((row) => row.paid)
  return {
    people: new Set(rows.map((row) => row.userId)).size,
    exactRecurringCheckoutPeople: new Set(checkout.map((row) => row.userId)).size,
    exactRecurringStripeSessions: new Set(checkout.map((row) => row.anchor.stripeSessionId)).size,
    exactPaidPeople: new Set(paid.map((row) => row.userId)).size,
    exactPaidStripeSessions: new Set(paid.map((row) => row.anchor.stripeSessionId)).size,
    exactRevenueMinorByCurrency: moneyByCurrency(paid),
  }
}

export function buildFirstFileLaterDayRetrievalReport({ generatedAt, windowStart, events, profiles, videos }) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const requestedStartMs = Date.parse(String(windowStart ?? ''))
  const boundaryMs = Date.parse(FIRST_FILE_RETRIEVAL_BOUNDARY)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(requestedStartMs) || requestedStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  const effectiveStartMs = Math.max(requestedStartMs, boundaryMs)
  const matureBeforeMs = generatedAtMs - FIRST_FILE_RETRIEVAL_OBSERVATION_DAYS * DAY_MS
  const identity = identityIndex(profiles)
  const firstResolution = firstCompletedVideos(videos, identity, effectiveStartMs, matureBeforeMs)
  const sourceEvents = events.filter((row) => timestamp(row) !== null && timestamp(row) <= generatedAtMs).sort(compareRows)
  const ledger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: new Date(effectiveStartMs).toISOString(),
    events: sourceEvents,
    profiles,
  })
  const recordsByUser = new Map()
  for (const record of ledger.records) {
    if (record.ownerClass !== 'external' || !record.ownerUserId) continue
    const rows = recordsByUser.get(record.ownerUserId) ?? []
    rows.push(record)
    recordsByUser.set(record.ownerUserId, rows)
  }

  const matured = []
  const preexistingExactSubscribers = new Set()
  const preexistingUnknownSubscribers = new Set()
  for (const first of firstResolution.firstByUser.values()) {
    if (first.at < effectiveStartMs || first.at > matureBeforeMs) continue
    const priorExact = (recordsByUser.get(first.userId) ?? []).some((record) => {
      const paidAt = Date.parse(String(record?.paidAt ?? ''))
      return record.status === 'paid' && Number.isFinite(paidAt) && paidAt < first.at
    })
    const priorRaw = sourceEvents.some((row) => row?.name === 'payment_success' && row?.user_id === first.userId &&
      metadataExactString(row, 'checkout_mode') === 'subscription' && timestamp(row) < first.at)
    const priorUserSessionIds = new Set(sourceEvents.filter((row) =>
      row?.name === 'checkout_started' && row?.user_id === first.userId && timestamp(row) < first.at,
    ).map((row) => metadataExactString(row, 'stripe_session_id')).filter(Boolean))
    const priorSessionLinkedPayment = sourceEvents.some((row) =>
      row?.name === 'payment_success' &&
      metadataExactString(row, 'checkout_mode') === 'subscription' &&
      timestamp(row) < first.at &&
      priorUserSessionIds.has(metadataExactString(row, 'stripe_session_id')),
    )
    if (priorExact) preexistingExactSubscribers.add(first.userId)
    else if (priorRaw || priorSessionLinkedPayment) preexistingUnknownSubscribers.add(first.userId)
    else matured.push({ ...first, cutoff: first.at + FIRST_FILE_RETRIEVAL_OBSERVATION_DAYS * DAY_MS })
  }

  const confirmedRetrieval = []
  const cleanNoRetrieval = []
  const unresolvedRetrievalUsers = new Set()
  const ambiguousFirstSessionUsers = new Set()
  const invalidRecurringPaymentUsers = new Set()
  const cohortLedgerConflictSessions = new Set()
  const undatableCohortEventUsers = new Set()
  const firstBlobAfterCheckoutUsers = new Set()
  const firstBlobEqualCheckoutUsers = new Set()
  const mixedChronologyUsers = new Set()
  const totalRecurringCheckoutUsers = new Set()
  let maturedWithFirstBlob = 0
  let totalExactRecurringStripeSessions = 0
  let laterRecurringStripeSessions = 0

  for (const first of matured) {
    const allUserRecords = recordsByUser.get(first.userId) ?? []
    const knownStripeSessions = new Set([
      ...allUserRecords.map((record) => record.stripeSessionId).filter(Boolean),
      ...events.filter((row) => row?.user_id === first.userId)
        .map((row) => metadataExactString(row, 'stripe_session_id')).filter(Boolean),
    ])
    if (events.some((row) => FIRST_FILE_RETRIEVAL_EVENT_NAMES.includes(row?.name) && timestamp(row) === null &&
      (row?.user_id === first.userId || knownStripeSessions.has(metadataExactString(row, 'stripe_session_id'))))) {
      undatableCohortEventUsers.add(first.userId)
      continue
    }
    const records = allUserRecords.filter((record) => {
      const at = Date.parse(String(record?.startedAt ?? ''))
      return ['paid', 'unpaid', 'invalid_payment', 'conflict'].includes(record.status) &&
        Number.isFinite(at) && at > first.at && at <= first.cutoff
    }).sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt) ||
      String(left.stripeSessionId).localeCompare(String(right.stripeSessionId)))
    for (const record of records) if (record.status === 'conflict') cohortLedgerConflictSessions.add(record.stripeSessionId)
    const exactSessionRecords = records.filter((record) => ['paid', 'unpaid', 'invalid_payment'].includes(record.status))
    if (exactSessionRecords.some((record) => record.status === 'invalid_payment')) {
      invalidRecurringPaymentUsers.add(first.userId)
    }
    const downloads = sourceEvents.filter((row) => row?.name === 'video_downloaded' && row?.user_id === first.userId &&
      timestamp(row) >= first.at && timestamp(row) <= first.cutoff)
    const exact = downloads.filter((row) => exactBlob(row, first)).sort(compareRows)
    const firstBlob = exact[0] ?? null
    if (!firstBlob) continue
    const firstBlobAt = timestamp(firstBlob)
    maturedWithFirstBlob += 1
    totalExactRecurringStripeSessions += exactSessionRecords.length
    if (exactSessionRecords.length > 0) totalRecurringCheckoutUsers.add(first.userId)
    if (exactSessionRecords.length > 1) {
      const firstExactAt = Date.parse(exactSessionRecords[0].startedAt)
      laterRecurringStripeSessions += exactSessionRecords.filter((record) =>
        Date.parse(record.startedAt) > firstExactAt,
      ).length
    }
    if (records.length > 1 && Date.parse(records[0].startedAt) === Date.parse(records[1].startedAt)) {
      ambiguousFirstSessionUsers.add(first.userId)
      continue
    }
    const anchor = records[0] ?? null
    if (anchor && !['paid', 'unpaid', 'invalid_payment'].includes(anchor.status)) {
      continue
    }
    const stopAt = anchor ? Date.parse(anchor.startedAt) : first.cutoff
    if (anchor && stopAt <= firstBlobAt) {
      if (stopAt < firstBlobAt) firstBlobAfterCheckoutUsers.add(first.userId)
      else firstBlobEqualCheckoutUsers.add(first.userId)
      if (records.slice(1).some((record) => Date.parse(String(record.startedAt)) > firstBlobAt)) {
        mixedChronologyUsers.add(first.userId)
      }
      continue
    }
    const firstDay = utcDay(firstBlobAt)
    const laterDayRows = downloads.filter((row) => {
      const at = timestamp(row)
      return at > firstBlobAt && at < stopAt && utcDay(at) !== firstDay
    })
    const retrievals = laterDayRows.filter((row) => exactBlob(row, first, RETRIEVAL_SURFACES))
    const potentiallySameFileButInvalid = laterDayRows.some((row) => {
      const videoId = metadataExactString(row, 'video_id')
      return videoId === null || (videoId === first.videoId && !exactBlob(row, first, RETRIEVAL_SURFACES))
    })
    if (potentiallySameFileButInvalid) {
      unresolvedRetrievalUsers.add(first.userId)
      continue
    }
    const paid = anchor ? paymentWithin(anchor, first.cutoff) : false
    const row = {
      userId: first.userId,
      anchor,
      paid,
      amountMinor: paid ? anchor.amountMinor : null,
      currency: paid ? anchor.currency : null,
    }
    if (retrievals.length > 0) confirmedRetrieval.push(row)
    else cleanNoRetrieval.push(row)
  }

  const retrievalSummary = summarize(confirmedRetrieval)
  const noRetrievalSummary = summarize(cleanNoRetrieval)
  const analyzableCheckoutPeople = new Set([...confirmedRetrieval, ...cleanNoRetrieval]
    .filter((row) => row.anchor).map((row) => row.userId)).size
  const unresolvedPeople = new Set([
    ...firstResolution.unresolvedEligible,
    ...firstResolution.unresolvedIdentityEligible,
    ...unresolvedRetrievalUsers,
    ...ambiguousFirstSessionUsers,
    ...invalidRecurringPaymentUsers,
    ...undatableCohortEventUsers,
  ])
  const qualityDenominator = matured.length + firstResolution.unresolvedEligible.size +
    firstResolution.unresolvedIdentityEligible.size
  const unresolvedRatio = qualityDenominator === 0 ? null : unresolvedPeople.size / qualityDenominator
  const qualityBlocked = cohortLedgerConflictSessions.size > 0 || firstResolution.undatableOwners.size > 0 ||
    firstResolution.eligibleOwnerlessCompletedRows > 0 || firstResolution.undatableOwnerlessCompletedRows > 0 ||
    ambiguousFirstSessionUsers.size > 0 || invalidRecurringPaymentUsers.size > 0 || undatableCohortEventUsers.size > 0 ||
    (unresolvedRatio !== null && unresolvedRatio > FIRST_FILE_RETRIEVAL_MAX_UNRESOLVED_RATIO)
  const analyzableBlobPeople = retrievalSummary.people + noRetrievalSummary.people
  const completeSample = analyzableBlobPeople >= FIRST_FILE_RETRIEVAL_MIN_BLOB_PEOPLE &&
    retrievalSummary.people >= FIRST_FILE_RETRIEVAL_MIN_RETRIEVAL_PEOPLE &&
    noRetrievalSummary.people >= FIRST_FILE_RETRIEVAL_MIN_NO_RETRIEVAL_PEOPLE &&
    analyzableCheckoutPeople >= FIRST_FILE_RETRIEVAL_MIN_CHECKOUT_PEOPLE
  const exactPaidPeople = retrievalSummary.exactPaidPeople + noRetrievalSummary.exactPaidPeople
  let state = 'collecting'
  if (qualityBlocked) state = 'blocked_data_quality'
  else if (exactPaidPeople > 0) state = 'ready_for_reconciliation'
  else if (completeSample) state = 'ready_for_diagnosis'

  return {
    schemaVersion: FIRST_FILE_RETRIEVAL_REPORT_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    requestedWindowStart: new Date(requestedStartMs).toISOString(),
    effectiveWindowStart: new Date(effectiveStartMs).toISOString(),
    observationDays: FIRST_FILE_RETRIEVAL_OBSERVATION_DAYS,
    cohort: {
      matureAcquisitionPeople: matured.length,
      maturePeopleWithExactFirstBlob: maturedWithFirstBlob,
      analyzablePeopleWithExactFirstBlob: analyzableBlobPeople,
      confirmedLaterDayRetrieval: retrievalSummary,
      noConfirmedLaterDayRetrieval: noRetrievalSummary,
      totalExactRecurringCheckoutPeople: totalRecurringCheckoutUsers.size,
      totalExactRecurringStripeSessions,
      analyzableExactRecurringCheckoutPeople: analyzableCheckoutPeople,
    },
    exclusionsAndDiagnostics: {
      preexistingExactSubscriberPeople: preexistingExactSubscribers.size,
      preexistingSubscriptionUnknownPeople: preexistingUnknownSubscribers.size,
      unresolvedFirstDeliveryPeopleEligibleWindow: firstResolution.unresolvedEligible.size,
      unresolvedIdentityVideoOwnersEligibleWindow: firstResolution.unresolvedIdentityEligible.size,
      undatableUnresolvedVideoOwners: firstResolution.undatableOwners.size,
      eligibleOwnerlessCompletedRows: firstResolution.eligibleOwnerlessCompletedRows,
      undatableOwnerlessCompletedRows: firstResolution.undatableOwnerlessCompletedRows,
      unresolvedLaterDayRetrievalPeople: unresolvedRetrievalUsers.size,
      ambiguousFirstRecurringSessionPeople: ambiguousFirstSessionUsers.size,
      invalidRecurringPaymentPeople: invalidRecurringPaymentUsers.size,
      laterRecurringStripeSessions,
      firstBlobAfterFirstCheckoutPeople: firstBlobAfterCheckoutUsers.size,
      firstBlobEqualFirstCheckoutPeople: firstBlobEqualCheckoutUsers.size,
      mixedCheckoutBlobChronologyPeople: mixedChronologyUsers.size,
      undatableCohortEventPeople: undatableCohortEventUsers.size,
      cohortLedgerConflictStripeSessions: cohortLedgerConflictSessions.size,
      internalProfileIdsExcluded: identity.internal.size,
    },
    quality: {
      unresolvedPeople: unresolvedPeople.size,
      denominatorPeople: qualityDenominator,
      unresolvedPeopleRatio: unresolvedRatio,
      maximumUnresolvedPeopleRatio: FIRST_FILE_RETRIEVAL_MAX_UNRESOLVED_RATIO,
      anotherUtcDayIsNotClaimedAsAnotherVisit: true,
      confirmedClientBlobIsNotIndependentFilePossessionProof: true,
    },
    gate: {
      state,
      completeSample,
      minimumMatureBlobPeople: FIRST_FILE_RETRIEVAL_MIN_BLOB_PEOPLE,
      minimumConfirmedRetrievalPeople: FIRST_FILE_RETRIEVAL_MIN_RETRIEVAL_PEOPLE,
      minimumNoConfirmedRetrievalPeople: FIRST_FILE_RETRIEVAL_MIN_NO_RETRIEVAL_PEOPLE,
      minimumExactRecurringCheckoutPeople: FIRST_FILE_RETRIEVAL_MIN_CHECKOUT_PEOPLE,
      neverAuthorizesProductChange: true,
    },
    note: 'Association-only diagnostic. A later-day retrieval is a second exact client blob signal for the same first video, from history or my_videos, on a later UTC date and strictly before the person\'s first recurring Stripe Session. Another UTC date is not labeled another visit. The first recurring Session remains the anchor even when unpaid; a later paid Session never cleans it. People, Sessions and revenue are separate, and currencies are never summed.',
  }
}
