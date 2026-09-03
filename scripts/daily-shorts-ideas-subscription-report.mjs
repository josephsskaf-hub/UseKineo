import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'
import {
  buildSubscriptionSessionOutcomeReport,
  subscriptionSessionReference,
} from './subscription-session-outcome-report.mjs'

export const DAILY_SHORT_IDEAS_REPORT_VERSION = 'daily_shorts_ideas_subscription_v1'
export const DAILY_SHORT_IDEAS_WINDOW_DAYS = 30
export const DAILY_SHORT_IDEAS_OBSERVATION_DAYS = 7
export const DAILY_SHORT_IDEAS_MIN_EXTERNAL_PEOPLE = 20
export const DAILY_SHORT_IDEAS_MIN_TERMINAL_CHECKOUT_PEOPLE = 5
export const DAILY_SHORT_IDEAS_SOURCE = 'kineo_daily_feed'
export const DAILY_SHORT_IDEAS_MEDIUM = 'rss'
export const DAILY_SHORT_IDEAS_CAMPAIGN = 'daily_shorts_ideas_v1'
export const DAILY_SHORT_IDEAS_LANDING_PATH = '/free-script-generator'
export const DAILY_SHORT_IDEAS_EVENT_NAMES = Object.freeze([
  'landing_session_started',
  'checkout_started',
  'payment_success',
  'checkout_session_expired',
])

const DAY_MS = 86_400_000
const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])
const PAID_PLANS = new Set(['starter', 'basic', 'creator', 'pro', 'studio', 'autopilot'])

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

function compareRows(left, right) {
  return (timestamp(left) ?? Number.POSITIVE_INFINITY) - (timestamp(right) ?? Number.POSITIVE_INFINITY) ||
    String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
}

function add(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

function sortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)))
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

  const classification = new Map()
  for (const [id, rows] of rowsById) {
    const emails = new Set(rows.map((row) => String(row?.email ?? '').trim().toLowerCase()))
    if (emails.size !== 1) classification.set(id, 'conflict')
    else if (![...emails][0]) classification.set(id, 'unknown')
    else classification.set(id, isInternalMeasurementEmail([...emails][0]) ? 'internal' : 'external')
  }
  return { classification, rowsById }
}

function profileFirstTouchState(userId, landedAt, identity, generatedAtMs) {
  const rows = identity.rowsById.get(userId) ?? []
  if (rows.length !== 1) return 'profile_conflict'
  const profile = rows[0]
  const createdAt = timestamp(profile)
  if (createdAt === null) return 'profile_clock_unknown'
  if (createdAt > generatedAtMs) return 'profile_future'
  const exactSource = text(profile?.signup_utm_source) === DAILY_SHORT_IDEAS_SOURCE &&
    text(profile?.signup_utm_medium) === DAILY_SHORT_IDEAS_MEDIUM &&
    text(profile?.signup_utm_campaign) === DAILY_SHORT_IDEAS_CAMPAIGN
  if (!exactSource) return 'returning_or_other_source'
  return landedAt <= createdAt ? 'exact_new_acquisition' : 'returning_same_source'
}

function profileHasSubscriptionState(userId, identity) {
  return (identity.rowsById.get(userId) ?? []).some((profile) => {
    const plan = text(profile?.plan)?.toLowerCase() ?? null
    return profile?.is_pro === true || PAID_PLANS.has(plan) ||
      Boolean(text(profile?.stripe_subscription_id)) || Boolean(text(profile?.paypal_subscription_id)) ||
      Boolean(text(profile?.paddle_subscription_id))
  })
}

function profileHasPaidOnlyState(userId, identity) {
  return (identity.rowsById.get(userId) ?? []).some((profile) => profile?.has_paid === true) &&
    !profileHasSubscriptionState(userId, identity)
}

export function isExactDailyShortIdeasLanding(row) {
  return row?.name === 'landing_session_started' &&
    text(row?.path) === DAILY_SHORT_IDEAS_LANDING_PATH &&
    metadataString(row, 'utm_source') === DAILY_SHORT_IDEAS_SOURCE &&
    metadataString(row, 'utm_medium') === DAILY_SHORT_IDEAS_MEDIUM &&
    metadataString(row, 'utm_campaign') === DAILY_SHORT_IDEAS_CAMPAIGN &&
    /^\d{4}-\d{2}-\d{2}$/.test(metadataString(row, 'utm_content') ?? '')
}

function resolveBrowserSessionOwner(sessionId, sessionEvents, identity, generatedAtMs) {
  if (!sessionId) return { state: 'missing_session', userId: null }
  const identityRows = sessionEvents
    .filter((row) => text(row?.session_id) === sessionId)
    .filter((row) => text(row?.user_id))
  if (identityRows.some((row) => timestamp(row) === null)) {
    return { state: 'owner_clock_unknown', userId: null }
  }
  const ids = new Set(identityRows
    .filter((row) => timestamp(row) <= generatedAtMs)
    .map((row) => text(row?.user_id)))
  if (ids.size === 0) return { state: 'anonymous_unresolved', userId: null }
  if (ids.size > 1) return { state: 'identity_conflict', userId: null }
  const userId = [...ids][0]
  const state = identity.classification.get(userId) ?? 'unknown'
  return { state, userId: state === 'external' ? userId : null }
}

function validRecurringStart(row) {
  const tier = metadataString(row, 'tier')
  const billing = metadataString(row, 'billing')
  return row?.name === 'checkout_started' &&
    Boolean(metadataString(row, 'stripe_session_id')) &&
    !metadataString(row, 'sku') &&
    !metadataString(row, 'pack') &&
    RECURRING_TIERS.has(tier) &&
    RECURRING_BILLING.has(billing) &&
    (tier !== 'autopilot' || billing === 'monthly')
}

function recurringCandidate(row) {
  return row?.name === 'checkout_started' && !metadataString(row, 'sku') && !metadataString(row, 'pack')
}

export function buildDailyShortIdeasSubscriptionReport({
  generatedAt,
  windowStart,
  landingEvents,
  sessionEvents,
  financialEvents,
  profiles,
}) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const windowStartMs = Date.parse(String(windowStart ?? ''))
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  if (![landingEvents, sessionEvents, financialEvents, profiles].every(Array.isArray)) {
    throw new Error('landingEvents, sessionEvents, financialEvents and profiles must be arrays')
  }

  const matureBeforeMs = generatedAtMs - DAILY_SHORT_IDEAS_OBSERVATION_DAYS * DAY_MS
  const identity = identityIndex(profiles)
  const exactBoundedLandings = landingEvents
    .filter((row) => {
      const at = timestamp(row)
      return isExactDailyShortIdeasLanding(row) && at !== null && at >= windowStartMs && at <= generatedAtMs
    })
    .sort(compareRows)
  const exactUndatableLandings = landingEvents.filter((row) => isExactDailyShortIdeasLanding(row) && timestamp(row) === null)
  const ownerStates = new Map()
  const resolvedLandings = []

  for (const landing of exactBoundedLandings) {
    const sessionId = text(landing?.session_id)
    const owner = resolveBrowserSessionOwner(sessionId, sessionEvents, identity, generatedAtMs)
    add(ownerStates, owner.state)
    if (owner.state !== 'external') continue
    const explicitUserId = text(landing?.user_id)
    if (explicitUserId && explicitUserId !== owner.userId) {
      add(ownerStates, 'landing_owner_conflict')
      continue
    }
    resolvedLandings.push({
      userId: owner.userId,
      sessionId,
      landedAt: timestamp(landing),
      contentDate: metadataString(landing, 'utm_content'),
    })
  }

  const byUser = new Map()
  for (const landing of resolvedLandings) {
    const rows = byUser.get(landing.userId) ?? []
    rows.push(landing)
    byUser.set(landing.userId, rows)
  }

  const firstLandings = []
  let ambiguousFirstLandingPeople = 0
  for (const rows of byUser.values()) {
    rows.sort((left, right) => left.landedAt - right.landedAt || left.sessionId.localeCompare(right.sessionId))
    const tied = rows.filter((row) => row.landedAt === rows[0].landedAt)
    if (new Set(tied.map((row) => row.sessionId)).size !== 1) {
      ambiguousFirstLandingPeople += 1
      continue
    }
    firstLandings.push(rows[0])
  }

  const firstTouchStates = new Map()
  const acquisitionLandings = []
  for (const landing of firstLandings) {
    const state = profileFirstTouchState(landing.userId, landing.landedAt, identity, generatedAtMs)
    add(firstTouchStates, state)
    if (state === 'exact_new_acquisition') acquisitionLandings.push(landing)
  }

  const allFinancial = financialEvents
    .filter((row) => timestamp(row) !== null && timestamp(row) <= generatedAtMs)
    .sort(compareRows)
  const ledger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: '1970-01-01T00:00:00.000Z',
    events: allFinancial.filter((row) => row?.name === 'checkout_started' || row?.name === 'payment_success'),
    profiles,
  })

  const cohort = []
  let preexistingSubscribersExcluded = 0
  let preexistingSubscriptionUnknownPeople = 0
  let financialConflictPeople = 0
  let financialRowsWithoutStripeSessionPeople = 0
  let invalidRecurringStartPeople = 0
  let nonOrderedFinancialPeople = 0
  let undatableFinancialPeople = 0
  let paidProfileWithoutExactSessionPeople = 0
  let paidOnlyProfilePeople = 0

  for (const landing of acquisitionLandings) {
    const priorExactPaid = ledger.records.some((record) =>
      record.status === 'paid' && record.ownerClass === 'external' && record.ownerUserId === landing.userId &&
      Date.parse(String(record.paidAt ?? '')) < landing.landedAt,
    )
    const priorRawPayment = allFinancial.some((row) =>
      row?.name === 'payment_success' && text(row?.user_id) === landing.userId &&
      metadataString(row, 'checkout_mode') === 'subscription' && timestamp(row) < landing.landedAt,
    )
    if (priorExactPaid) {
      preexistingSubscribersExcluded += 1
      continue
    }
    if (priorRawPayment) {
      preexistingSubscriptionUnknownPeople += 1
      continue
    }

    const exactPaidAfterLanding = ledger.records.some((record) =>
      record.status === 'paid' && record.ownerClass === 'external' && record.ownerUserId === landing.userId &&
      Date.parse(String(record.paidAt ?? '')) >= landing.landedAt,
    )
    if (profileHasPaidOnlyState(landing.userId, identity)) paidOnlyProfilePeople += 1
    if (profileHasSubscriptionState(landing.userId, identity) && !exactPaidAfterLanding) {
      paidProfileWithoutExactSessionPeople += 1
      continue
    }

    const cutoff = Math.min(generatedAtMs, landing.landedAt + DAILY_SHORT_IDEAS_OBSERVATION_DAYS * DAY_MS)
    const rawUserFinancial = financialEvents.filter((row) => text(row?.user_id) === landing.userId)
    if (rawUserFinancial.some((row) => timestamp(row) === null && (
      recurringCandidate(row) ||
      (row?.name === 'payment_success' && metadataString(row, 'checkout_mode') === 'subscription') ||
      row?.name === 'checkout_session_expired'
    ))) undatableFinancialPeople += 1
    const userRows = allFinancial.filter((row) =>
      text(row?.user_id) === landing.userId && timestamp(row) > landing.landedAt && timestamp(row) <= cutoff,
    )
    if (allFinancial.some((row) => text(row?.user_id) === landing.userId &&
        recurringCandidate(row) && timestamp(row) === landing.landedAt)) {
      nonOrderedFinancialPeople += 1
    }
    if (userRows.some((row) => recurringCandidate(row) && !metadataString(row, 'stripe_session_id'))) {
      financialRowsWithoutStripeSessionPeople += 1
    }
    if (userRows.some((row) => recurringCandidate(row) && metadataString(row, 'stripe_session_id') && !validRecurringStart(row))) {
      invalidRecurringStartPeople += 1
    }
    const starts = userRows.filter(validRecurringStart)
    const candidateSessionIds = [...new Set(starts.map((row) => metadataString(row, 'stripe_session_id')))].sort()
    const sessionIds = candidateSessionIds.filter((sessionId) => {
      const record = ledger.records.find((row) => row.stripeSessionId === sessionId)
      const canonicalStartAt = Date.parse(String(record?.startedAt ?? ''))
      return !Number.isFinite(canonicalStartAt) || canonicalStartAt > landing.landedAt
    })
    const outcomeWindowStart = new Date(landing.landedAt + 1).toISOString()
    const scopedOutcome = buildSubscriptionSessionOutcomeReport({
      generatedAt: new Date(cutoff).toISOString(),
      windowStart: outcomeWindowStart,
      events: financialEvents,
      profiles,
    })
    const fullOutcome = buildSubscriptionSessionOutcomeReport({
      generatedAt: new Date(generatedAtMs).toISOString(),
      windowStart: outcomeWindowStart,
      events: financialEvents,
      profiles,
    })
    const rawIdsByReference = new Map()
    for (const sessionId of sessionIds) {
      const reference = subscriptionSessionReference(sessionId)
      const ids = rawIdsByReference.get(reference) ?? []
      ids.push(sessionId)
      rawIdsByReference.set(reference, ids)
    }
    let checkoutSessions = 0
    let paidSessions = 0
    let expiredSessions = 0
    let openSessions = 0
    let latePaidSessions = 0
    let lateExpiredSessions = 0
    let personConflict = false
    const payments = []

    const scopedSessions = scopedOutcome.sessions.filter((session) => session.userId === landing.userId)
    const scopedReferences = new Set(scopedSessions.map((session) => session.sessionReference))
    if (sessionIds.some((sessionId) => !scopedReferences.has(subscriptionSessionReference(sessionId)))) {
      personConflict = true
    }
    for (const session of scopedSessions) {
      const rawIds = rawIdsByReference.get(session.sessionReference) ?? []
      if (rawIds.length !== 1) {
        personConflict = true
        continue
      }
      const sessionId = rawIds[0]
      const record = ledger.records.find((row) => row.stripeSessionId === sessionId)
      if (session.outcome === 'conflict' || !record || record.ownerClass !== 'external' ||
          record.ownerUserId !== landing.userId) {
        personConflict = true
        continue
      }
      checkoutSessions += 1
      if (session.outcome === 'paid') {
        const paidAt = Date.parse(String(record.paidAt ?? ''))
        const startAt = Date.parse(session.startedAt)
        if (!Number.isFinite(paidAt) || paidAt < startAt || paidAt > cutoff ||
            !Number.isSafeInteger(record.amountMinor) || record.amountMinor <= 0 || !record.currency) {
          personConflict = true
          continue
        }
        paidSessions += 1
        payments.push({ currency: record.currency, amountMinor: record.amountMinor })
      } else if (session.outcome === 'expired_unpaid') {
        expiredSessions += 1
      } else if (session.outcome === 'open_before_deadline') {
        openSessions += 1
      } else {
        personConflict = true
      }
    }

    const scopedTerminalReferences = new Set(scopedSessions
      .filter((session) => session.outcome === 'paid' || session.outcome === 'expired_unpaid')
      .map((session) => session.sessionReference))
    for (const session of fullOutcome.sessions.filter((row) => row.userId === landing.userId)) {
      if (scopedTerminalReferences.has(session.sessionReference)) continue
      const startedAt = Date.parse(session.startedAt)
      if (!Number.isFinite(startedAt) || startedAt > cutoff) continue
      if (session.outcome === 'paid') latePaidSessions += 1
      if (session.outcome === 'expired_unpaid') lateExpiredSessions += 1
    }

    if (personConflict) financialConflictPeople += 1
    cohort.push({
      mature: landing.landedAt <= matureBeforeMs,
      checkoutSessions,
      terminalSessions: paidSessions + expiredSessions,
      paidSessions,
      expiredSessions,
      openSessions,
      latePaidSessions,
      lateExpiredSessions,
      payments,
      conflict: personConflict,
    })
  }

  const validCohort = cohort.filter((row) => !row.conflict)
  const matureCohort = validCohort.filter((row) => row.mature)
  const revenue = new Map()
  for (const row of validCohort) {
    for (const payment of row.payments) add(revenue, payment.currency, payment.amountMinor)
  }
  const qualityBlocked = exactUndatableLandings.length > 0 || ambiguousFirstLandingPeople > 0 ||
    preexistingSubscriptionUnknownPeople > 0 || financialConflictPeople > 0 ||
    financialRowsWithoutStripeSessionPeople > 0 || invalidRecurringStartPeople > 0 ||
    nonOrderedFinancialPeople > 0 || undatableFinancialPeople > 0 || paidProfileWithoutExactSessionPeople > 0 ||
    (firstTouchStates.get('profile_conflict') ?? 0) > 0 ||
    (firstTouchStates.get('profile_clock_unknown') ?? 0) > 0 ||
    (firstTouchStates.get('profile_future') ?? 0) > 0 ||
    (ownerStates.get('identity_conflict') ?? 0) > 0 ||
    (ownerStates.get('landing_owner_conflict') ?? 0) > 0 ||
    (ownerStates.get('conflict') ?? 0) > 0 ||
    (ownerStates.get('owner_clock_unknown') ?? 0) > 0
  const sampleMet = matureCohort.length >= DAILY_SHORT_IDEAS_MIN_EXTERNAL_PEOPLE
  const matureTerminalCheckoutPeople = matureCohort.filter((row) => row.terminalSessions > 0).length
  const terminalMet = matureTerminalCheckoutPeople >= DAILY_SHORT_IDEAS_MIN_TERMINAL_CHECKOUT_PEOPLE

  return {
    schemaVersion: DAILY_SHORT_IDEAS_REPORT_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    contract: {
      source: DAILY_SHORT_IDEAS_SOURCE,
      medium: DAILY_SHORT_IDEAS_MEDIUM,
      campaign: DAILY_SHORT_IDEAS_CAMPAIGN,
      landingPath: DAILY_SHORT_IDEAS_LANDING_PATH,
      attribution: 'exact_feed_first_touch_signup_then_first_landing_per_external_person',
      payment: 'same_canonical_stripe_session_as_checkout_started',
    },
    window: {
      start: new Date(windowStartMs).toISOString(),
      observationDaysPerPerson: DAILY_SHORT_IDEAS_OBSERVATION_DAYS,
    },
    discovery: {
      exactLandingSessions: new Set(exactBoundedLandings.map((row) => text(row?.session_id)).filter(Boolean)).size,
      exactLandingRows: exactBoundedLandings.length,
      resolvedExternalVisitorPeople: firstLandings.length,
      returningOrOtherSourcePeople: (firstTouchStates.get('returning_or_other_source') ?? 0) +
        (firstTouchStates.get('returning_same_source') ?? 0),
      returningSameSourcePeople: firstTouchStates.get('returning_same_source') ?? 0,
    },
    cohort: {
      resolvedExternalPeople: validCohort.length,
      matureExternalPeople: matureCohort.length,
      preexistingSubscribersExcluded,
      paidOnlyProfilePeople,
      checkoutPeople: validCohort.filter((row) => row.checkoutSessions > 0).length,
      checkoutStripeSessions: validCohort.reduce((total, row) => total + row.checkoutSessions, 0),
      terminalCheckoutPeople: validCohort.filter((row) => row.terminalSessions > 0).length,
      terminalCheckoutStripeSessions: validCohort.reduce((total, row) => total + row.terminalSessions, 0),
      matureTerminalCheckoutPeople,
      paidPeople: validCohort.filter((row) => row.paidSessions > 0).length,
      paidStripeSessions: validCohort.reduce((total, row) => total + row.paidSessions, 0),
      expiredUnpaidPeople: validCohort.filter((row) => row.expiredSessions > 0).length,
      expiredUnpaidStripeSessions: validCohort.reduce((total, row) => total + row.expiredSessions, 0),
      openStripeSessions: validCohort.reduce((total, row) => total + row.openSessions, 0),
      paidAfterObservationStripeSessions: validCohort.reduce((total, row) => total + row.latePaidSessions, 0),
      expiredUnpaidAfterObservationStripeSessions: validCohort.reduce((total, row) => total + row.lateExpiredSessions, 0),
      revenueMinorByCurrency: sortedObject(revenue),
    },
    quality: {
      undatableExactLandingRows: exactUndatableLandings.length,
      anonymousLandingSessions: ownerStates.get('anonymous_unresolved') ?? 0,
      internalLandingSessions: ownerStates.get('internal') ?? 0,
      unknownIdentityLandingSessions: ownerStates.get('unknown') ?? 0,
      ownerClockUnknownLandingSessions: ownerStates.get('owner_clock_unknown') ?? 0,
      conflictingIdentityLandingSessions: (ownerStates.get('identity_conflict') ?? 0) +
        (ownerStates.get('landing_owner_conflict') ?? 0) + (ownerStates.get('conflict') ?? 0),
      ambiguousFirstLandingPeople,
      profileConflictPeople: firstTouchStates.get('profile_conflict') ?? 0,
      profileClockUnknownPeople: firstTouchStates.get('profile_clock_unknown') ?? 0,
      profileFuturePeople: firstTouchStates.get('profile_future') ?? 0,
      preexistingSubscriptionUnknownPeople,
      paidProfileWithoutExactSessionPeople,
      financialConflictPeople,
      financialRowsWithoutStripeSessionPeople,
      invalidRecurringStartPeople,
      nonOrderedFinancialPeople,
      undatableFinancialPeople,
      attributionQualityMet: !qualityBlocked,
    },
    gate: {
      minimumExternalPeople: DAILY_SHORT_IDEAS_MIN_EXTERNAL_PEOPLE,
      minimumTerminalCheckoutPeople: DAILY_SHORT_IDEAS_MIN_TERMINAL_CHECKOUT_PEOPLE,
      observationDays: DAILY_SHORT_IDEAS_OBSERVATION_DAYS,
      sampleMet,
      terminalMet,
      state: qualityBlocked
        ? 'blocked_data_quality'
        : sampleMet && terminalMet
          ? 'ready_for_subscription_diagnosis'
          : 'collecting',
    },
    note: 'Feed downloads and landing rows are sessions, not people. New acquisition requires an exact first-touch source, medium and campaign on a newly created external profile; returning visitors remain a separate diagnostic. Existing or financially ambiguous paid profiles are excluded or fail closed. Checkout and payment are observational outcomes after the first exact feed landing; they do not prove causal lift. Revenue is deduplicated by exact Stripe Session and never mixes currencies.',
  }
}
