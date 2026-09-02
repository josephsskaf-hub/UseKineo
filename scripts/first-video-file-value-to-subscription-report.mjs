import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const FIRST_VIDEO_FILE_VALUE_REPORT_VERSION = 'first_video_file_value_to_subscription_v1'
export const FIRST_VIDEO_FILE_VALUE_CONTRACT_BOUNDARY = '2026-08-05T00:22:42.000Z'
export const FIRST_VIDEO_FILE_VALUE_WINDOW_DAYS = 30
export const FIRST_VIDEO_FILE_VALUE_OBSERVATION_DAYS = 7
export const FIRST_VIDEO_FILE_VALUE_MIN_MATURE_PEOPLE = 20
export const FIRST_VIDEO_FILE_VALUE_MIN_CONFIRMED_BLOB_PEOPLE = 5
export const FIRST_VIDEO_FILE_VALUE_MIN_NO_SIGNAL_PEOPLE = 5
export const FIRST_VIDEO_FILE_VALUE_MIN_CHECKOUT_PEOPLE = 5
export const FIRST_VIDEO_FILE_VALUE_MAX_UNRESOLVED_RATIO = 0.2

export const FIRST_VIDEO_FILE_VALUE_DOWNLOAD_EVENT_NAMES = Object.freeze([
  'video_downloaded',
  'video_download_clicked',
  'video_download_fallback_opened',
  'video_download_manual_link_clicked',
])
export const FIRST_VIDEO_FILE_VALUE_FINANCIAL_EVENT_NAMES = Object.freeze([
  'checkout_started',
  'payment_success',
])
export const FIRST_VIDEO_FILE_VALUE_EVENT_NAMES = Object.freeze([
  ...FIRST_VIDEO_FILE_VALUE_DOWNLOAD_EVENT_NAMES,
  ...FIRST_VIDEO_FILE_VALUE_FINANCIAL_EVENT_NAMES,
])

const DOWNLOAD_SURFACES = new Set(['done_screen', 'history', 'my_videos'])
const DAY_MS = 86_400_000

function timestamp(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function metadataString(row, key) {
  return text(row?.metadata?.[key])
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
    if (emails.size !== 1) {
      conflict.add(id)
      continue
    }
    const email = [...emails][0]
    if (!email) unknown.add(id)
    else if (isInternalMeasurementEmail(email)) internal.add(id)
    else external.add(id)
  }
  return { external, internal, unknown, conflict }
}

function firstPersistedCompletedVideos(videos, identity, effectiveStartMs, matureBeforeMs) {
  const rowsByUser = new Map()
  const ownersByVideoId = new Map()
  let malformedRows = 0
  let eligibleOwnerlessCompletedRows = 0
  let undatableOwnerlessCompletedRows = 0

  for (const row of videos) {
    if (row?.status !== 'completed') continue
    const userId = text(row?.user_id)
    if (!userId) {
      malformedRows += 1
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
  const unresolved = new Map()
  const unresolvedIdentity = new Map()
  const undatableUnresolvedOwners = new Set()
  const missingProfileVideoOwners = new Set()
  const knownProfileIds = new Set([...identity.external, ...identity.internal, ...identity.unknown, ...identity.conflict])

  for (const [userId, rows] of rowsByUser) {
    if (identity.internal.has(userId)) continue
    if (!identity.external.has(userId)) {
      const validTimes = rows.map(timestamp).filter((value) => value !== null)
      const candidateAt = validTimes.length ? Math.min(...validTimes) : null
      const reason = !knownProfileIds.has(userId)
        ? 'missing_profile'
        : identity.conflict.has(userId) ? 'conflicting_profile' : 'profile_without_email'
      if (!knownProfileIds.has(userId)) missingProfileVideoOwners.add(userId)
      unresolvedIdentity.set(userId, { reason, candidateAt })
      if (validTimes.length !== rows.length) undatableUnresolvedOwners.add(userId)
      continue
    }
    const validTimes = rows.map(timestamp).filter((value) => value !== null)
    const candidateAt = validTimes.length ? Math.min(...validTimes) : null
    if (validTimes.length !== rows.length) {
      unresolved.set(userId, { reason: 'invalid_timestamp', candidateAt })
      undatableUnresolvedOwners.add(userId)
      continue
    }
    const ordered = [...rows].sort(compareRows)
    const firstAt = timestamp(ordered[0])
    const tiedIds = new Set(ordered.filter((row) => timestamp(row) === firstAt).map((row) => text(row?.id)))
    if (tiedIds.size !== 1 || tiedIds.has(null)) {
      unresolved.set(userId, { reason: 'first_timestamp_tie_or_missing_id', candidateAt: firstAt })
      continue
    }
    const first = ordered[0]
    const videoId = text(first?.id)
    if (!videoId || (ownersByVideoId.get(videoId)?.size ?? 0) !== 1) {
      unresolved.set(userId, { reason: 'video_owner_conflict', candidateAt: firstAt })
      continue
    }
    if (!text(first?.video_url)) {
      unresolved.set(userId, { reason: 'first_video_without_url', candidateAt: firstAt })
      continue
    }
    firstByUser.set(userId, { userId, videoId, at: firstAt })
  }

  const unresolvedEligible = new Set([...unresolved.entries()]
    .filter(([, value]) => value.candidateAt !== null && value.candidateAt >= effectiveStartMs && value.candidateAt <= matureBeforeMs)
    .map(([userId]) => userId))
  const unresolvedIdentityEligible = new Set([...unresolvedIdentity.entries()]
    .filter(([, value]) => value.candidateAt !== null && value.candidateAt >= effectiveStartMs && value.candidateAt <= matureBeforeMs)
    .map(([userId]) => userId))

  return {
    firstByUser,
    unresolved,
    unresolvedEligible,
    unresolvedIdentity,
    unresolvedIdentityEligible,
    undatableUnresolvedOwners,
    missingProfileVideoOwners,
    malformedRows,
    eligibleOwnerlessCompletedRows,
    undatableOwnerlessCompletedRows,
  }
}

function exactBlobSignal(row, first) {
  return row?.name === 'video_downloaded' &&
    row?.user_id === first.userId &&
    metadataExactString(row, 'video_id') === first.videoId &&
    metadataExactString(row, 'method') === 'blob' &&
    metadataPositiveInteger(row, 'bytes') !== null &&
    DOWNLOAD_SURFACES.has(metadataExactString(row, 'surface'))
}

function moneyByCurrency(records) {
  const totals = new Map()
  for (const record of records) {
    if (!record.currency || !Number.isSafeInteger(record.amountMinor) || record.amountMinor <= 0) continue
    totals.set(record.currency, (totals.get(record.currency) ?? 0) + record.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function paidWithinObservation(record, cutoffMs) {
  const startedAt = Date.parse(String(record?.startedAt ?? ''))
  const paidAt = Date.parse(String(record?.paidAt ?? ''))
  return record?.status === 'paid' &&
    Number.isFinite(startedAt) && Number.isFinite(paidAt) &&
    paidAt >= startedAt && paidAt <= cutoffMs &&
    Number.isSafeInteger(record.amountMinor) && record.amountMinor > 0 &&
    Boolean(record.currency)
}

function summarizeSessions(sessions) {
  const paid = sessions.filter((entry) => entry.paid)
  return {
    identifiedExternalPeople: new Set(sessions.map((entry) => entry.userId)).size,
    stripeSessions: sessions.length,
    exactPaidPeople: new Set(paid.map((entry) => entry.userId)).size,
    exactPaidStripeSessions: paid.length,
    exactRevenueMinorByCurrency: moneyByCurrency(paid),
  }
}

export function buildFirstVideoFileValueToSubscriptionReport({
  generatedAt,
  windowStart,
  events,
  profiles,
  videos,
}) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const requestedWindowStartMs = Date.parse(String(windowStart ?? ''))
  const contractBoundaryMs = Date.parse(FIRST_VIDEO_FILE_VALUE_CONTRACT_BOUNDARY)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(requestedWindowStartMs) || requestedWindowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }

  const effectiveStartMs = Math.max(requestedWindowStartMs, contractBoundaryMs)
  const observationMs = FIRST_VIDEO_FILE_VALUE_OBSERVATION_DAYS * DAY_MS
  const matureBeforeMs = generatedAtMs - observationMs
  const identity = identityIndex(profiles)
  const firstResolution = firstPersistedCompletedVideos(videos, identity, effectiveStartMs, matureBeforeMs)
  const sourceEvents = events
    .filter((row) => timestamp(row) !== null && timestamp(row) <= generatedAtMs)
    .sort(compareRows)
  const ledger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: new Date(effectiveStartMs).toISOString(),
    events: sourceEvents,
    profiles,
  })
  const financialRecordsByUser = new Map()
  for (const record of ledger.records) {
    if (record.ownerClass !== 'external' || !record.ownerUserId) continue
    const records = financialRecordsByUser.get(record.ownerUserId) ?? []
    records.push(record)
    financialRecordsByUser.set(record.ownerUserId, records)
  }

  const matured = []
  const preexistingSubscriberUsers = new Set()
  const preexistingSubscriptionUnknownUsers = new Set()
  for (const first of firstResolution.firstByUser.values()) {
    if (first.at < effectiveStartMs || first.at > matureBeforeMs) continue
    const priorPaid = (financialRecordsByUser.get(first.userId) ?? []).some((record) => {
      const paidAt = Date.parse(String(record.paidAt ?? ''))
      return record.status === 'paid' && Number.isFinite(paidAt) && paidAt < first.at
    })
    const rawPriorSubscriptionPayment = sourceEvents.some((row) =>
      row?.name === 'payment_success' &&
      row?.user_id === first.userId &&
      metadataExactString(row, 'checkout_mode') === 'subscription' &&
      timestamp(row) < first.at,
    )
    if (priorPaid) {
      preexistingSubscriberUsers.add(first.userId)
      continue
    }
    if (rawPriorSubscriptionPayment) {
      preexistingSubscriptionUnknownUsers.add(first.userId)
      continue
    }
    matured.push({ ...first, cutoff: first.at + observationMs })
  }

  const confirmedBlobUsers = new Set()
  const unresolvedBlobUsers = new Set()
  const missingVideoIdUsers = new Set()
  const invalidContractUsers = new Set()
  const secondOrForeignVideoOnlyUsers = new Set()
  const blobByUser = new Map()

  for (const first of matured) {
    const rows = sourceEvents.filter((row) => row?.name === 'video_downloaded' && row?.user_id === first.userId)
      .filter((row) => {
        const at = timestamp(row)
        return at >= first.at && at <= first.cutoff
      })
    const exact = rows.filter((row) => exactBlobSignal(row, first))
    if (exact.length > 0) {
      const firstExact = exact[0]
      confirmedBlobUsers.add(first.userId)
      blobByUser.set(first.userId, timestamp(firstExact))
      continue
    }
    let unresolved = false
    let mismatched = false
    for (const row of rows) {
      const videoId = metadataExactString(row, 'video_id')
      if (!videoId) {
        missingVideoIdUsers.add(first.userId)
        unresolved = true
      } else if (videoId === first.videoId) {
        invalidContractUsers.add(first.userId)
        unresolved = true
      } else {
        mismatched = true
      }
    }
    if (unresolved) unresolvedBlobUsers.add(first.userId)
    else if (mismatched) secondOrForeignVideoOnlyUsers.add(first.userId)
  }

  const afterBlobSessions = []
  const beforeBlobSessions = []
  const equalBlobSessions = []
  const withoutBlobSessions = []
  const allPostDeliverySessions = []
  const noCheckoutUsers = new Set()
  const blobAfterCheckoutUsers = new Set()
  const mixedChronologyUsers = new Set()
  const ambiguousFirstSessionUsers = new Set()
  const invalidPaymentUsers = new Set()
  const invalidPaymentSessions = new Set()
  const undatableDownloadClockUsers = new Set()
  const undatableFinancialClockUsers = new Set()
  const cohortLedgerConflictSessions = new Set()
  let laterRecurringStripeSessions = 0

  for (const first of matured) {
    const malformedDownloadClock = events.some((row) =>
      row?.name === 'video_downloaded' && row?.user_id === first.userId && timestamp(row) === null,
    )
    if (malformedDownloadClock) {
      unresolvedBlobUsers.add(first.userId)
      undatableDownloadClockUsers.add(first.userId)
    }
    const blobAt = blobByUser.get(first.userId) ?? null
    const records = financialRecordsByUser.get(first.userId) ?? []
    const knownStripeSessions = new Set(records.map((record) => record.stripeSessionId).filter(Boolean))
    if (events.some((row) =>
      (row?.name === 'checkout_started' || row?.name === 'payment_success') &&
      timestamp(row) === null &&
      (row?.user_id === first.userId || knownStripeSessions.has(metadataExactString(row, 'stripe_session_id'))),
    )) undatableFinancialClockUsers.add(first.userId)
    const sessions = []
    for (const record of records) {
      const startedAt = Date.parse(String(record.startedAt ?? ''))
      if (record.status === 'conflict' && Number.isFinite(startedAt) && startedAt > first.at && startedAt <= first.cutoff) {
        cohortLedgerConflictSessions.add(record.stripeSessionId)
      }
      if (!['unpaid', 'paid', 'invalid_payment'].includes(record.status) || !Number.isFinite(startedAt)) continue
      if (startedAt <= first.at || startedAt > first.cutoff) continue
      const paymentUnresolved = record.status === 'invalid_payment'
      if (paymentUnresolved) {
        invalidPaymentUsers.add(first.userId)
        invalidPaymentSessions.add(record.stripeSessionId)
      }
      sessions.push({
        userId: first.userId,
        stripeSessionId: record.stripeSessionId,
        startedAt,
        paid: paidWithinObservation(record, first.cutoff),
        amountMinor: record.amountMinor,
        currency: record.currency,
        paymentUnresolved,
      })
    }
    sessions.sort((left, right) => left.startedAt - right.startedAt)
    allPostDeliverySessions.push(...sessions)
    laterRecurringStripeSessions += Math.max(0, sessions.length - 1)
    if (sessions.length === 0) noCheckoutUsers.add(first.userId)
    if (sessions.length > 1 && sessions[0].startedAt === sessions[1].startedAt) {
      ambiguousFirstSessionUsers.add(first.userId)
      continue
    }
    const anchor = sessions[0] ?? null
    if (!anchor) continue
    if (blobAt === null) {
      if (!unresolvedBlobUsers.has(first.userId)) withoutBlobSessions.push(anchor)
      continue
    }
    const laterAfterBlob = sessions.slice(1).some((entry) => entry.startedAt > blobAt)
    if (anchor.startedAt < blobAt) {
      beforeBlobSessions.push(anchor)
      blobAfterCheckoutUsers.add(first.userId)
      if (laterAfterBlob) mixedChronologyUsers.add(first.userId)
    } else if (anchor.startedAt === blobAt) {
      equalBlobSessions.push(anchor)
      if (laterAfterBlob) mixedChronologyUsers.add(first.userId)
    } else {
      afterBlobSessions.push(anchor)
    }
  }

  const cleanNoSignalPeople = matured.filter((first) =>
    !confirmedBlobUsers.has(first.userId) && !unresolvedBlobUsers.has(first.userId),
  ).length
  const unresolvedPeople = new Set([
    ...firstResolution.unresolvedEligible,
    ...firstResolution.unresolvedIdentityEligible,
    ...unresolvedBlobUsers,
    ...invalidPaymentUsers,
    ...ambiguousFirstSessionUsers,
    ...undatableDownloadClockUsers,
    ...undatableFinancialClockUsers,
  ])
  const qualityDenominator = matured.length + firstResolution.unresolvedEligible.size + firstResolution.unresolvedIdentityEligible.size
  const unresolvedRatio = qualityDenominator === 0 ? null : unresolvedPeople.size / qualityDenominator
  const totalCheckoutPeople = new Set(allPostDeliverySessions.map((entry) => entry.userId)).size
  const qualityBlocked = cohortLedgerConflictSessions.size > 0 ||
    firstResolution.undatableUnresolvedOwners.size > 0 ||
    firstResolution.eligibleOwnerlessCompletedRows > 0 ||
    firstResolution.undatableOwnerlessCompletedRows > 0 ||
    ambiguousFirstSessionUsers.size > 0 ||
    undatableDownloadClockUsers.size > 0 ||
    undatableFinancialClockUsers.size > 0 ||
    (unresolvedRatio !== null && unresolvedRatio > FIRST_VIDEO_FILE_VALUE_MAX_UNRESOLVED_RATIO)
  const primary = summarizeSessions(afterBlobSessions)
  const completeSample = matured.length >= FIRST_VIDEO_FILE_VALUE_MIN_MATURE_PEOPLE &&
    confirmedBlobUsers.size >= FIRST_VIDEO_FILE_VALUE_MIN_CONFIRMED_BLOB_PEOPLE &&
    cleanNoSignalPeople >= FIRST_VIDEO_FILE_VALUE_MIN_NO_SIGNAL_PEOPLE &&
    totalCheckoutPeople >= FIRST_VIDEO_FILE_VALUE_MIN_CHECKOUT_PEOPLE

  let gateState = 'collecting'
  if (qualityBlocked) gateState = 'blocked_data_quality'
  else if (primary.exactPaidPeople > 0) gateState = 'ready_for_reconciliation'
  else if (completeSample) gateState = 'ready_for_diagnosis'

  return {
    schemaVersion: FIRST_VIDEO_FILE_VALUE_REPORT_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    requestedWindowStart: new Date(requestedWindowStartMs).toISOString(),
    effectiveWindowStart: new Date(effectiveStartMs).toISOString(),
    contractBoundary: FIRST_VIDEO_FILE_VALUE_CONTRACT_BOUNDARY,
    observationDays: FIRST_VIDEO_FILE_VALUE_OBSERVATION_DAYS,
    primaryFunnel: {
      maturedFirstPersistedCompletedVideoPeople: matured.length,
      confirmedClientBlobSignalPeople: confirmedBlobUsers.size,
      exactRecurringCheckoutAfterBlob: primary,
    },
    comparison: {
      noConfirmedBlobSignalPeople: cleanNoSignalPeople,
      unresolvedBlobSignalPeople: unresolvedBlobUsers.size,
      exactRecurringCheckoutWithoutConfirmedBlob: summarizeSessions(withoutBlobSessions),
      exactRecurringCheckoutBeforeBlob: summarizeSessions(beforeBlobSessions),
      exactRecurringCheckoutAtBlobTimestamp: summarizeSessions(equalBlobSessions),
      blobPersistedAfterEarlierCheckoutPeople: blobAfterCheckoutUsers.size,
      mixedChronologyPeopleExcludedFromPrimary: mixedChronologyUsers.size,
      ambiguousFirstRecurringSessionPeople: ambiguousFirstSessionUsers.size,
      noExactRecurringCheckoutPeople: noCheckoutUsers.size,
      totalPostDeliveryExactRecurringCheckoutPeople: totalCheckoutPeople,
      totalPostDeliveryExactRecurringStripeSessions: allPostDeliverySessions.length,
      laterRecurringStripeSessionsNotUsedAsPersonAnchor: laterRecurringStripeSessions,
    },
    exclusionsAndDiagnostics: {
      preexistingExactSubscriberPeople: preexistingSubscriberUsers.size,
      preexistingSubscriptionUnknownPeople: preexistingSubscriptionUnknownUsers.size,
      unresolvedFirstDeliveryPeopleAllHistory: firstResolution.unresolved.size,
      unresolvedFirstDeliveryPeopleEligibleWindow: firstResolution.unresolvedEligible.size,
      unresolvedIdentityVideoOwnersAllHistory: firstResolution.unresolvedIdentity.size,
      unresolvedIdentityVideoOwnersEligibleWindow: firstResolution.unresolvedIdentityEligible.size,
      undatableUnresolvedVideoOwners: firstResolution.undatableUnresolvedOwners.size,
      undatableDownloadClockPeople: undatableDownloadClockUsers.size,
      undatableFinancialClockPeople: undatableFinancialClockUsers.size,
      missingProfileVideoOwnersAllHistory: firstResolution.missingProfileVideoOwners.size,
      missingDownloadVideoIdPeople: missingVideoIdUsers.size,
      invalidDownloadContractPeople: invalidContractUsers.size,
      onlySecondOrForeignVideoSignalsPeople: secondOrForeignVideoOnlyUsers.size,
      malformedCompletedVideoRows: firstResolution.malformedRows,
      eligibleOwnerlessCompletedRows: firstResolution.eligibleOwnerlessCompletedRows,
      undatableOwnerlessCompletedRows: firstResolution.undatableOwnerlessCompletedRows,
      unknownProfileIds: identity.unknown.size,
      conflictingProfileIds: identity.conflict.size,
      internalProfileIdsExcluded: identity.internal.size,
      ledgerConflictStripeSessionsInCohort: cohortLedgerConflictSessions.size,
      ledgerInvalidPaymentPeopleInCohort: invalidPaymentUsers.size,
      ledgerInvalidPaymentStripeSessionsInCohort: invalidPaymentSessions.size,
      ledgerUnlinkedSubscriptionPaymentSessionsAllHistory: ledger.summary.unlinkedSubscriptionPaymentSessions,
      ledgerPackSessionsExcludedAllHistory: ledger.summary.packSessions,
    },
    quality: {
      unresolvedPeople: unresolvedPeople.size,
      denominatorPeople: qualityDenominator,
      unresolvedPeopleRatio: unresolvedRatio,
      maximumUnresolvedPeopleRatio: FIRST_VIDEO_FILE_VALUE_MAX_UNRESOLVED_RATIO,
      clientSignalIsNotCausalOrFinancialProof: true,
      createdAtMeansPersistedCompletedRowNotPhysicalDelivery: true,
      equalDownloadAndCheckoutTimestampsAreAmbiguous: true,
    },
    gate: {
      state: gateState,
      minimumMaturePeople: FIRST_VIDEO_FILE_VALUE_MIN_MATURE_PEOPLE,
      minimumConfirmedBlobPeople: FIRST_VIDEO_FILE_VALUE_MIN_CONFIRMED_BLOB_PEOPLE,
      minimumNoConfirmedSignalPeople: FIRST_VIDEO_FILE_VALUE_MIN_NO_SIGNAL_PEOPLE,
      minimumExactRecurringCheckoutPeople: FIRST_VIDEO_FILE_VALUE_MIN_CHECKOUT_PEOPLE,
      completeSample,
      neverAuthorizesProductChange: true,
    },
    note: 'Association-only diagnostic. A confirmed client blob signal means the authenticated client reported method=blob with positive bytes for the exact first persisted completed video. It is not causal, financial, or independent proof that a file remained saved. Absence of this signal is never labeled as absence of download. Checkout and payment are accepted only through the canonical recurring-subscription ledger, by the same external owner, inside that person\'s fixed seven-day observation window. People, Stripe Sessions and revenue are separate units; currencies are never summed.',
  }
}
