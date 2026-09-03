import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const FIRST_VIDEO_ENGINE_REPORT_VERSION = 'first_video_engine_to_subscription_v1'
export const FIRST_VIDEO_ENGINE_CONTRACT_BOUNDARY = '2026-09-02T04:00:53.307Z'
export const FIRST_VIDEO_ENGINE_WINDOW_DAYS = 30
export const FIRST_VIDEO_ENGINE_OBSERVATION_DAYS = 7
export const FIRST_VIDEO_ENGINE_MIN_MATURE_PEOPLE = 20
export const FIRST_VIDEO_ENGINE_MIN_PEOPLE_PER_ENGINE = 5
export const FIRST_VIDEO_ENGINE_EVENT_NAME = 'first_video_engine_decided'
export const FIRST_VIDEO_ENGINE_FINANCIAL_EVENT_NAMES = Object.freeze([
  'checkout_started',
  'payment_success',
])

const DAY_MS = 86_400_000
const ENGINES = Object.freeze(['seedance', 'fast'])
const ENGINE_SET = new Set(ENGINES)
const SELF_SERVE_TIERS = new Set(['starter', 'basic', 'pro'])
const SELF_SERVE_BILLINGS = new Set(['monthly', 'annual'])
const CURRENCY = /^[a-z]{3}$/

function timestamp(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function exactString(value) {
  return typeof value === 'string' && value.length > 0 && value === value.trim() ? value : null
}

function metadataExact(row, key) {
  return exactString(row?.metadata?.[key])
}

function compareRows(left, right) {
  return (timestamp(left) ?? Number.POSITIVE_INFINITY) - (timestamp(right) ?? Number.POSITIVE_INFINITY) ||
    String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
}

function identityIndex(profiles, generatedAtMs) {
  const rowsById = new Map()
  let malformedRows = 0
  for (const profile of profiles) {
    const id = exactString(profile?.id)
    if (!id) {
      malformedRows += 1
      continue
    }
    const rows = rowsById.get(id) ?? []
    rows.push(profile)
    rowsById.set(id, rows)
  }

  const external = new Set()
  const internal = new Set()
  const unknown = new Set()
  const duplicate = new Set()
  const conflict = new Set()
  const invalidClock = new Set()
  const futureClock = new Set()
  const createdAtById = new Map()
  for (const [id, rows] of rowsById) {
    if (rows.length !== 1) {
      duplicate.add(id)
      const emails = new Set(rows.map((row) => String(row?.email ?? '').trim().toLowerCase()))
      if (emails.size !== 1) conflict.add(id)
      continue
    }
    const email = String(rows[0]?.email ?? '').trim().toLowerCase()
    if (!email) unknown.add(id)
    else if (isInternalMeasurementEmail(email)) internal.add(id)
    else {
      const createdAt = timestamp(rows[0])
      if (createdAt === null) invalidClock.add(id)
      else if (createdAt > generatedAtMs) futureClock.add(id)
      else {
        external.add(id)
        createdAtById.set(id, createdAt)
      }
    }
  }

  return {
    external,
    internal,
    unknown,
    duplicate,
    conflict,
    invalidClock,
    futureClock,
    createdAtById,
    malformedRows,
    known: new Set(rowsById.keys()),
  }
}

function resolveFirstVideos(videos, identity, effectiveStartMs, matureBeforeMs) {
  const rowsByOwner = new Map()
  const ownersByVideoId = new Map()
  let malformedOwnerRows = 0
  let eligibleOwnerlessRows = 0
  let undatableOwnerlessRows = 0

  for (const row of videos) {
    if (row?.status !== 'completed') continue
    const userId = exactString(row?.user_id)
    if (!userId) {
      malformedOwnerRows += 1
      const at = timestamp(row)
      if (at === null) undatableOwnerlessRows += 1
      else if (at >= effectiveStartMs && at <= matureBeforeMs) eligibleOwnerlessRows += 1
      continue
    }
    const rows = rowsByOwner.get(userId) ?? []
    rows.push(row)
    rowsByOwner.set(userId, rows)
    const videoId = exactString(row?.id)
    if (videoId) {
      const owners = ownersByVideoId.get(videoId) ?? new Set()
      owners.add(userId)
      ownersByVideoId.set(videoId, owners)
    }
  }

  const firstByUser = new Map()
  const unresolved = new Map()
  const unresolvedIdentity = new Map()
  const undatableOwners = new Set()
  const missingProfileOwners = new Set()
  const profileCreatedAfterFirstVideo = new Set()
  let beforeWindowPeople = 0
  let immaturePeople = 0

  for (const [userId, rows] of rowsByOwner) {
    if (identity.internal.has(userId)) continue
    const validTimes = rows.map(timestamp).filter((value) => value !== null)
    const candidateAt = validTimes.length > 0 ? Math.min(...validTimes) : null

    if (!identity.external.has(userId)) {
      const reason = !identity.known.has(userId)
        ? 'missing_profile'
        : identity.duplicate.has(userId)
          ? (identity.conflict.has(userId) ? 'conflicting_profile' : 'duplicate_profile')
          : identity.invalidClock.has(userId)
            ? 'invalid_profile_timestamp'
            : identity.futureClock.has(userId) ? 'future_profile_timestamp' : 'profile_without_email'
      if (!identity.known.has(userId)) missingProfileOwners.add(userId)
      unresolvedIdentity.set(userId, { reason, candidateAt })
      if (validTimes.length !== rows.length) undatableOwners.add(userId)
      continue
    }

    if (validTimes.length !== rows.length) {
      unresolved.set(userId, { reason: 'invalid_video_timestamp', candidateAt })
      undatableOwners.add(userId)
      continue
    }
    const ordered = [...rows].sort(compareRows)
    const firstAt = timestamp(ordered[0])
    const tied = ordered.filter((row) => timestamp(row) === firstAt)
    if (tied.length !== 1) {
      unresolved.set(userId, { reason: 'first_video_timestamp_tie', candidateAt: firstAt })
      continue
    }
    const first = tied[0]
    const videoId = exactString(first?.id)
    if (!videoId) {
      unresolved.set(userId, { reason: 'first_video_missing_id', candidateAt: firstAt })
      continue
    }
    if ((ownersByVideoId.get(videoId)?.size ?? 0) !== 1) {
      unresolved.set(userId, { reason: 'first_video_owner_conflict', candidateAt: firstAt })
      continue
    }
    if (!exactString(first?.video_url)) {
      unresolved.set(userId, { reason: 'first_video_missing_url', candidateAt: firstAt })
      continue
    }
    if ((identity.createdAtById.get(userId) ?? Number.POSITIVE_INFINITY) > firstAt) {
      unresolved.set(userId, { reason: 'profile_created_after_first_video', candidateAt: firstAt })
      profileCreatedAfterFirstVideo.add(userId)
      continue
    }
    if (firstAt < effectiveStartMs) {
      beforeWindowPeople += 1
      continue
    }
    if (firstAt > matureBeforeMs) {
      immaturePeople += 1
      continue
    }
    firstByUser.set(userId, { userId, videoId, at: firstAt })
  }

  const eligibleUnresolved = new Set([...unresolved.entries()]
    .filter(([, value]) => value.candidateAt !== null && value.candidateAt >= effectiveStartMs && value.candidateAt <= matureBeforeMs)
    .map(([userId]) => userId))
  const eligibleUnresolvedIdentity = new Set([...unresolvedIdentity.entries()]
    .filter(([, value]) => value.candidateAt !== null && value.candidateAt >= effectiveStartMs && value.candidateAt <= matureBeforeMs)
    .map(([userId]) => userId))

  return {
    firstByUser,
    unresolved,
    unresolvedIdentity,
    eligibleUnresolved,
    eligibleUnresolvedIdentity,
    undatableOwners,
    missingProfileOwners,
    profileCreatedAfterFirstVideo,
    beforeWindowPeople,
    immaturePeople,
    malformedOwnerRows,
    eligibleOwnerlessRows,
    undatableOwnerlessRows,
  }
}

function resolveDecision(first, decisionRows, contractBoundaryMs, generatedAtMs) {
  const allForUser = decisionRows.filter((row) => row?.name === FIRST_VIDEO_ENGINE_EVENT_NAME && row?.user_id === first.userId)
  if (allForUser.some((row) => timestamp(row) === null)) return { status: 'unresolved', reason: 'invalid_decision_timestamp' }

  const inContract = allForUser
    .filter((row) => {
      const at = timestamp(row)
      return at >= contractBoundaryMs && at <= generatedAtMs
    })
    .sort(compareRows)
  const before = inContract.filter((row) => timestamp(row) < first.at)
  const equal = inContract.filter((row) => timestamp(row) === first.at)

  if (equal.length > 0) return { status: 'unresolved', reason: 'decision_equal_to_first_video' }
  if (before.length === 0) {
    return { status: 'missing', reason: inContract.length > 0 ? 'post_video_decision_only' : 'no_decision' }
  }
  if (before.some((row) =>
    metadataExact(row, 'surface') !== 'niche_onboarding' ||
    !ENGINE_SET.has(metadataExact(row, 'engine')),
  )) return { status: 'unresolved', reason: 'invalid_decision_contract' }

  const firstAt = timestamp(before[0])
  const tied = before.filter((row) => timestamp(row) === firstAt)
  if (tied.length !== 1) return { status: 'unresolved', reason: 'first_decision_timestamp_tie' }
  const engines = new Set(before.map((row) => metadataExact(row, 'engine')))
  if (engines.size !== 1) return { status: 'unresolved', reason: 'contradictory_pre_video_engines' }
  return { status: 'resolved', reason: 'exact_pre_video_decision', engine: metadataExact(before[0], 'engine'), at: firstAt }
}

function startProduct(row) {
  if (row?.name !== 'checkout_started') return null
  const sku = metadataExact(row, 'sku')
  const tier = metadataExact(row, 'tier')
  const billing = metadataExact(row, 'billing')
  if (sku) return 'pack'
  if (tier === 'autopilot') return 'autopilot'
  if (SELF_SERVE_TIERS.has(tier) && SELF_SERVE_BILLINGS.has(billing)) return 'self_serve_subscription'
  return 'unknown'
}

function priorFinancialProduct(row) {
  if (row?.name === 'checkout_started') return startProduct(row)
  if (row?.name !== 'payment_success') return 'unknown'
  const mode = metadataExact(row, 'checkout_mode')
  if (mode === 'subscription') return 'recurring_payment'
  if (mode === 'payment') return 'one_time_payment'
  return 'unknown'
}

function sessionProducts(events) {
  const startsBySession = new Map()
  let rowsWithoutSession = 0
  for (const row of events) {
    if (row?.name !== 'checkout_started') continue
    const sessionId = metadataExact(row, 'stripe_session_id')
    if (!sessionId) {
      rowsWithoutSession += 1
      continue
    }
    const rows = startsBySession.get(sessionId) ?? []
    rows.push(row)
    startsBySession.set(sessionId, rows)
  }

  const products = new Map()
  for (const [sessionId, rows] of startsBySession) {
    const semantics = new Set(rows.map((row) => JSON.stringify({
      userId: exactString(row?.user_id),
      product: startProduct(row),
      tier: metadataExact(row, 'tier'),
      billing: metadataExact(row, 'billing'),
    })))
    products.set(sessionId, semantics.size === 1 ? startProduct(rows[0]) : 'conflict')
  }
  return { products, rowsWithoutSession }
}

function revenueByCurrency(entries) {
  const totals = new Map()
  for (const entry of entries) {
    if (!CURRENCY.test(String(entry.currency ?? '')) || !Number.isSafeInteger(entry.amountMinor) || entry.amountMinor <= 0) continue
    totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + entry.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function summarizeEngine(engine, people) {
  const enginePeople = people.filter((entry) => entry.engine === engine)
  const checkout = enginePeople.filter((entry) => entry.firstSession)
  const paid = checkout.filter((entry) => entry.firstSession.paid)
  return {
    engine,
    maturePeople: enginePeople.length,
    firstRecurringCheckoutPeople: checkout.length,
    firstRecurringStripeSessions: checkout.length,
    exactPaidPeople: paid.length,
    exactPaidStripeSessions: paid.length,
    exactRevenueMinorByCurrency: revenueByCurrency(paid.map((entry) => entry.firstSession)),
  }
}

export function buildFirstVideoEngineToSubscriptionReport({
  generatedAt,
  windowStart,
  events,
  profiles,
  videos,
}) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const requestedWindowStartMs = Date.parse(String(windowStart ?? ''))
  const contractBoundaryMs = Date.parse(FIRST_VIDEO_ENGINE_CONTRACT_BOUNDARY)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(requestedWindowStartMs) || requestedWindowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  if (generatedAtMs - requestedWindowStartMs !== FIRST_VIDEO_ENGINE_WINDOW_DAYS * DAY_MS) {
    throw new Error('windowStart must define the fixed 30-day window')
  }
  if (generatedAtMs < contractBoundaryMs) throw new Error('generatedAt predates the production contract boundary')
  if (!Array.isArray(events) || !Array.isArray(profiles) || !Array.isArray(videos)) {
    throw new Error('events, profiles and videos must be arrays')
  }

  const effectiveStartMs = Math.max(requestedWindowStartMs, contractBoundaryMs)
  const matureBeforeMs = generatedAtMs - FIRST_VIDEO_ENGINE_OBSERVATION_DAYS * DAY_MS
  const identity = identityIndex(profiles, generatedAtMs)
  const firstResolution = resolveFirstVideos(videos, identity, effectiveStartMs, matureBeforeMs)
  const decisions = events.filter((row) => row?.name === FIRST_VIDEO_ENGINE_EVENT_NAME)
  const malformedDecisionRows = decisions.filter((row) => !exactString(row?.user_id))
  const eligibleMalformedDecisionRows = malformedDecisionRows.filter((row) => {
    const at = timestamp(row)
    return at !== null && at >= contractBoundaryMs && at < matureBeforeMs
  })
  const undatableMalformedDecisionRows = malformedDecisionRows.filter((row) => timestamp(row) === null)
  const financialEvents = events.filter((row) => FIRST_VIDEO_ENGINE_FINANCIAL_EVENT_NAMES.includes(row?.name))
  const sourceFinancialEvents = financialEvents.filter((row) => {
    const at = timestamp(row)
    return at !== null && at <= generatedAtMs
  })
  const ledger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: new Date(requestedWindowStartMs).toISOString(),
    events: sourceFinancialEvents,
    profiles,
  })
  const productResolution = sessionProducts(sourceFinancialEvents)
  const recordsByUser = new Map()
  for (const record of ledger.records) {
    if (!record.ownerUserId) continue
    const rows = recordsByUser.get(record.ownerUserId) ?? []
    rows.push(record)
    recordsByUser.set(record.ownerUserId, rows)
  }

  const decisionResolved = []
  const missingDecisionUsers = new Set()
  const invalidDecisionUsers = new Set()
  const decisionReasons = new Map()
  for (const first of firstResolution.firstByUser.values()) {
    const decision = resolveDecision(first, decisions, contractBoundaryMs, generatedAtMs)
    if (decision.status === 'resolved') decisionResolved.push({ ...first, decision })
    else {
      const target = decision.status === 'missing' ? missingDecisionUsers : invalidDecisionUsers
      target.add(first.userId)
      decisionReasons.set(decision.reason, (decisionReasons.get(decision.reason) ?? 0) + 1)
    }
  }

  const attributed = []
  const preexistingRecurringIntentUsers = new Set()
  const priorOneTimeCommercialIntentUsers = new Set()
  const unknownPriorCommercialIntentUsers = new Set()
  const undatableFinancialUsers = new Set()
  const ambiguousFirstSessionUsers = new Set()
  const invalidFirstSessionUsers = new Set()
  const invalidCurrencyUsers = new Set()
  const unlinkedFinancialUsers = new Set()
  const unknownPostVideoProductUsers = new Set()
  const unlinkedPostVideoRecurringPaymentUsers = new Set()
  let laterRecurringSessionsIgnored = 0
  let autopilotSessionsExcluded = 0
  let packSessionsExcluded = 0
  let unknownProductSessionsExcluded = 0

  for (const entry of decisionResolved) {
    const cutoff = entry.at + FIRST_VIDEO_ENGINE_OBSERVATION_DAYS * DAY_MS
    const candidateSessionIds = new Set((recordsByUser.get(entry.userId) ?? []).map((record) => record.stripeSessionId).filter(Boolean))
    const nullFinancial = financialEvents.some((row) =>
      timestamp(row) === null &&
      (row?.user_id === entry.userId || candidateSessionIds.has(metadataExact(row, 'stripe_session_id'))),
    )
    if (nullFinancial) {
      undatableFinancialUsers.add(entry.userId)
      continue
    }

    const missingSessionFinancial = sourceFinancialEvents.some((row) => {
      const at = timestamp(row)
      return row?.user_id === entry.userId && at > entry.at && at <= cutoff &&
        !metadataExact(row, 'stripe_session_id')
    })
    if (missingSessionFinancial) {
      unlinkedFinancialUsers.add(entry.userId)
      continue
    }

    const rawPostVideoRecurringPayments = sourceFinancialEvents.filter((row) => {
      const at = timestamp(row)
      return row?.name === 'payment_success' && row?.user_id === entry.userId &&
        at > entry.at && at <= cutoff && metadataExact(row, 'checkout_mode') === 'subscription'
    })
    const ownerRecords = recordsByUser.get(entry.userId) ?? []
    const hasUnlinkedRecurringPayment = rawPostVideoRecurringPayments.some((row) => {
      const stripeSessionId = metadataExact(row, 'stripe_session_id')
      if (!stripeSessionId) return true
      const product = productResolution.products.get(stripeSessionId)
      const exactOwnerRecord = ownerRecords.find((record) =>
        record.stripeSessionId === stripeSessionId &&
        record.ownerClass === 'external' && record.ownerUserId === entry.userId)
      if (product === 'autopilot' && exactOwnerRecord) return false
      return product !== 'self_serve_subscription' || !exactOwnerRecord
    })
    if (hasUnlinkedRecurringPayment) {
      unlinkedPostVideoRecurringPaymentUsers.add(entry.userId)
      continue
    }

    const priorProducts = new Set(sourceFinancialEvents
      .filter((row) => row?.user_id === entry.userId && timestamp(row) <= entry.at)
      .map(priorFinancialProduct))
    if (priorProducts.has('unknown')) {
      unknownPriorCommercialIntentUsers.add(entry.userId)
      continue
    }
    if ([...priorProducts].some((product) =>
      product === 'self_serve_subscription' || product === 'autopilot' || product === 'recurring_payment')) {
      preexistingRecurringIntentUsers.add(entry.userId)
      continue
    }
    if ([...priorProducts].some((product) => product === 'pack' || product === 'one_time_payment')) {
      priorOneTimeCommercialIntentUsers.add(entry.userId)
      continue
    }

    const observedPostVideoSessions = new Set(sourceFinancialEvents
      .filter((row) => row?.name === 'checkout_started' && row?.user_id === entry.userId &&
        timestamp(row) > entry.at && timestamp(row) <= cutoff)
      .map((row) => metadataExact(row, 'stripe_session_id'))
      .filter(Boolean))
    for (const stripeSessionId of observedPostVideoSessions) {
      const product = productResolution.products.get(stripeSessionId)
      if (product === 'autopilot') autopilotSessionsExcluded += 1
      else if (product === 'pack') packSessionsExcluded += 1
      else if (product === 'unknown' || product === 'conflict') {
        unknownProductSessionsExcluded += 1
        unknownPostVideoProductUsers.add(entry.userId)
      }
    }
    if (unknownPostVideoProductUsers.has(entry.userId)) continue
    const records = (recordsByUser.get(entry.userId) ?? [])
    const recurring = records.filter((record) => {
      const startedAt = Date.parse(String(record.startedAt ?? ''))
      return productResolution.products.get(record.stripeSessionId) === 'self_serve_subscription' &&
        Number.isFinite(startedAt) && startedAt > entry.at && startedAt <= cutoff
    }).sort((left, right) =>
      Date.parse(left.startedAt) - Date.parse(right.startedAt) ||
      String(left.stripeSessionId).localeCompare(String(right.stripeSessionId)),
    )
    laterRecurringSessionsIgnored += Math.max(0, recurring.length - 1)
    if (recurring.length > 1 && recurring[0].startedAt === recurring[1].startedAt) {
      ambiguousFirstSessionUsers.add(entry.userId)
      continue
    }
    const firstRecord = recurring[0] ?? null
    if (!firstRecord) {
      attributed.push({ engine: entry.decision.engine, firstSession: null })
      continue
    }
    if (firstRecord.ownerClass !== 'external' || firstRecord.ownerUserId !== entry.userId ||
      !['unpaid', 'paid'].includes(firstRecord.status)) {
      invalidFirstSessionUsers.add(entry.userId)
      continue
    }
    const paidAt = Date.parse(String(firstRecord.paidAt ?? ''))
    let paid = firstRecord.status === 'paid' && Number.isFinite(paidAt) &&
      paidAt >= Date.parse(firstRecord.startedAt) && paidAt <= cutoff
    if (paid && (!CURRENCY.test(String(firstRecord.currency ?? '')) ||
      !Number.isSafeInteger(firstRecord.amountMinor) || firstRecord.amountMinor <= 0)) {
      invalidCurrencyUsers.add(entry.userId)
      paid = false
    }
    if (invalidCurrencyUsers.has(entry.userId)) continue
    attributed.push({
      engine: entry.decision.engine,
      firstSession: {
        paid,
        amountMinor: paid ? firstRecord.amountMinor : null,
        currency: paid ? firstRecord.currency : null,
      },
    })
  }

  const byEngine = ENGINES.map((engine) => summarizeEngine(engine, attributed))
  const qualityPeople = new Set([
    ...firstResolution.eligibleUnresolved,
    ...firstResolution.eligibleUnresolvedIdentity,
    ...invalidDecisionUsers,
    ...undatableFinancialUsers,
    ...ambiguousFirstSessionUsers,
    ...invalidFirstSessionUsers,
    ...invalidCurrencyUsers,
    ...unlinkedFinancialUsers,
    ...unknownPriorCommercialIntentUsers,
    ...unknownPostVideoProductUsers,
    ...unlinkedPostVideoRecurringPaymentUsers,
  ])
  const qualityDenominator = firstResolution.firstByUser.size +
    firstResolution.eligibleUnresolved.size + firstResolution.eligibleUnresolvedIdentity.size
  const hardQualityBlock = qualityPeople.size > 0 ||
    firstResolution.undatableOwners.size > 0 ||
    firstResolution.eligibleOwnerlessRows > 0 ||
    firstResolution.undatableOwnerlessRows > 0 ||
    eligibleMalformedDecisionRows.length > 0 ||
    undatableMalformedDecisionRows.length > 0
  const sampleComplete = attributed.length >= FIRST_VIDEO_ENGINE_MIN_MATURE_PEOPLE &&
    byEngine.every((row) => row.maturePeople >= FIRST_VIDEO_ENGINE_MIN_PEOPLE_PER_ENGINE)
  const exactPaidPeople = byEngine.reduce((total, row) => total + row.exactPaidPeople, 0)
  const gateState = hardQualityBlock
    ? 'blocked_data_quality'
    : !sampleComplete
      ? 'collecting'
      : exactPaidPeople > 0 ? 'ready_for_reconciliation' : 'ready_for_diagnosis'

  return {
    schemaVersion: FIRST_VIDEO_ENGINE_REPORT_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    contract: {
      productionBoundary: FIRST_VIDEO_ENGINE_CONTRACT_BOUNDARY,
      requestedWindowStart: new Date(requestedWindowStartMs).toISOString(),
      effectiveWindowStart: new Date(effectiveStartMs).toISOString(),
      windowDays: FIRST_VIDEO_ENGINE_WINDOW_DAYS,
      observationDays: FIRST_VIDEO_ENGINE_OBSERVATION_DAYS,
      decisionEvent: FIRST_VIDEO_ENGINE_EVENT_NAME,
      decisionSurface: 'niche_onboarding',
      allowedEngines: [...ENGINES],
    },
    primaryFunnel: {
      maturedFirstPersistedCompletedVideoPeople: firstResolution.firstByUser.size,
      exactPreVideoEngineDecisionPeople: decisionResolved.length,
      cleanEngineCohortPeople: attributed.length,
      byEngine,
    },
    exclusionsAndDiagnostics: {
      internalProfileIdsExcluded: identity.internal.size,
      unknownProfileIds: identity.unknown.size,
      duplicateProfileIds: identity.duplicate.size,
      conflictingProfileIds: identity.conflict.size,
      invalidProfileClockIds: identity.invalidClock.size,
      futureProfileClockIds: identity.futureClock.size,
      malformedProfileRows: identity.malformedRows,
      unresolvedFirstVideoPeopleEligibleWindow: firstResolution.eligibleUnresolved.size,
      unresolvedIdentityVideoOwnersEligibleWindow: firstResolution.eligibleUnresolvedIdentity.size,
      undatableCompletedVideoOwnersAllHistory: firstResolution.undatableOwners.size,
      missingProfileVideoOwnersAllHistory: firstResolution.missingProfileOwners.size,
      profileCreatedAfterFirstVideoPeople: firstResolution.profileCreatedAfterFirstVideo.size,
      malformedCompletedVideoOwnerRows: firstResolution.malformedOwnerRows,
      eligibleOwnerlessCompletedVideoRows: firstResolution.eligibleOwnerlessRows,
      undatableOwnerlessCompletedVideoRows: firstResolution.undatableOwnerlessRows,
      firstVideoBeforeEffectiveWindowPeople: firstResolution.beforeWindowPeople,
      immatureFirstVideoPeople: firstResolution.immaturePeople,
      missingPreVideoDecisionPeople: missingDecisionUsers.size,
      unresolvedDecisionPeople: invalidDecisionUsers.size,
      malformedDecisionRowsAllHistory: malformedDecisionRows.length,
      eligibleMalformedDecisionRows: eligibleMalformedDecisionRows.length,
      undatableMalformedDecisionRows: undatableMalformedDecisionRows.length,
      decisionExclusionsByReason: Object.fromEntries([...decisionReasons.entries()].sort(([a], [b]) => a.localeCompare(b))),
      preexistingRecurringIntentPeople: preexistingRecurringIntentUsers.size,
      priorOneTimeCommercialIntentPeople: priorOneTimeCommercialIntentUsers.size,
      unknownPriorCommercialIntentPeople: unknownPriorCommercialIntentUsers.size,
      unknownPostVideoProductPeople: unknownPostVideoProductUsers.size,
      unlinkedPostVideoRecurringPaymentPeople: unlinkedPostVideoRecurringPaymentUsers.size,
      allPriorCommercialIntentPeople: new Set([
        ...preexistingRecurringIntentUsers,
        ...priorOneTimeCommercialIntentUsers,
        ...unknownPriorCommercialIntentUsers,
      ]).size,
      undatableFinancialClockPeople: undatableFinancialUsers.size,
      ambiguousFirstRecurringSessionPeople: ambiguousFirstSessionUsers.size,
      invalidFirstRecurringSessionPeople: invalidFirstSessionUsers.size,
      invalidCurrencyPeople: invalidCurrencyUsers.size,
      financialRowsWithoutSessionPeople: unlinkedFinancialUsers.size,
      laterRecurringSessionsIgnored,
      autopilotSessionsExcluded,
      packSessionsExcluded,
      unknownOrConflictingProductSessionsExcluded: unknownProductSessionsExcluded,
      financialRowsWithoutStripeSession: productResolution.rowsWithoutSession,
      ledgerConflictStripeSessionsAllHistory: ledger.summary.conflictStripeSessions,
      ledgerUnlinkedSubscriptionPaymentSessionsAllHistory: ledger.summary.unlinkedSubscriptionPaymentSessions,
      ledgerRowsWithoutStripeSessionAllHistory: ledger.summary.rowsWithoutStripeSession,
    },
    quality: {
      denominatorPeople: qualityDenominator,
      unresolvedPeople: qualityPeople.size,
      unresolvedPeopleRatio: qualityDenominator === 0 ? null : qualityPeople.size / qualityDenominator,
      hardQualityBlock,
      profileIdentityIsUniqueAndExternal: true,
      profileClockDoesNotPostdateFirstVideo: true,
      firstVideoIsAllHistoryPersistedCompletedWithFile: true,
      missingDecisionNeverMeansFast: true,
      firstPostVideoRecurringSessionControls: true,
      sameStripeSessionPaymentRequired: true,
      currenciesAreNeverSummed: true,
      decisionDoesNotIndependentlyProveRenderedEngine: true,
      associationIsNotCausality: true,
    },
    gate: {
      state: gateState,
      sampleComplete,
      minimumMaturePeople: FIRST_VIDEO_ENGINE_MIN_MATURE_PEOPLE,
      minimumPeoplePerEngine: FIRST_VIDEO_ENGINE_MIN_PEOPLE_PER_ENGINE,
      individualObservationDays: FIRST_VIDEO_ENGINE_OBSERVATION_DAYS,
      firstExactPaymentOnlyOpensReconciliation: true,
      neverAuthorizesOnboardingChange: true,
      neverClaimsCausality: true,
    },
    note: 'Diagnostic decision-to-subscription association only: an exact niche-onboarding router decision must strictly precede the owner\'s first all-history persisted completed video with a file; the event does not independently prove which engine rendered or was persisted. The first exact self-serve recurring Stripe Session after that video controls, and only a payment on that same Session inside the fixed seven-day observation window counts. No comparison is causal.',
  }
}
