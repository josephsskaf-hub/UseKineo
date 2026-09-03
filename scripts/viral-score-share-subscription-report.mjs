import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const VIRAL_SCORE_SHARE_REPORT_VERSION = 'viral_score_share_subscription_v2'
export const VIRAL_SCORE_SHARE_SOURCE = 'viral_score_result'
export const VIRAL_SCORE_SHARE_MEDIUM = 'referral'
export const VIRAL_SCORE_SHARE_CAMPAIGN = 'viral_score_scorecard_share_v1'
export const VIRAL_SCORE_SHARE_LANDING_PATH = '/viral-score'
export const VIRAL_SCORE_SHARE_WINDOW_DAYS = 30
export const VIRAL_SCORE_SHARE_MATURITY_DAYS = 7
export const VIRAL_SCORE_SHARE_MIN_MATURE_PEOPLE = 20
export const VIRAL_SCORE_SHARE_MIN_FIRST_VIDEO_PEOPLE = 5
export const VIRAL_SCORE_SHARE_MIN_EXTERNAL_SHARERS = 3

const DAY_MS = 86_400_000
const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])
const ACTIVE_PLANS = new Set(['starter', 'basic', 'creator', 'pro', 'studio', 'autopilot'])
const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null
const timestamp = (row) => {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}
const metadataString = (row, key) => text(row?.metadata?.[key])
const metadataInteger = (row, key) => {
  const value = row?.metadata?.[key]
  return Number.isSafeInteger(value) ? value : null
}
const increment = (map, key) => map.set(key, (map.get(key) ?? 0) + 1)

function exactAcquisition(profile) {
  return text(profile?.signup_utm_source) === VIRAL_SCORE_SHARE_SOURCE &&
    text(profile?.signup_utm_medium) === VIRAL_SCORE_SHARE_MEDIUM &&
    text(profile?.signup_utm_campaign) === VIRAL_SCORE_SHARE_CAMPAIGN
}

function exactCampaignMetadata(row) {
  return metadataString(row, 'utm_source') === VIRAL_SCORE_SHARE_SOURCE &&
    metadataString(row, 'utm_medium') === VIRAL_SCORE_SHARE_MEDIUM &&
    metadataString(row, 'utm_campaign') === VIRAL_SCORE_SHARE_CAMPAIGN
}

export function isExactViralScoreShareLanding(row) {
  return row?.name === 'landing_session_started' &&
    text(row?.path) === VIRAL_SCORE_SHARE_LANDING_PATH &&
    exactCampaignMetadata(row)
}

export function isExactViralScoreShareResult(row) {
  const band = metadataInteger(row, 'score_band')
  return row?.name === 'viral_score_completed' &&
    text(row?.path) === VIRAL_SCORE_SHARE_LANDING_PATH &&
    exactCampaignMetadata(row) &&
    band !== null && band >= 0 && band <= 100 && band % 10 === 0
}

export function isExactViralScoreShareRequest(row) {
  const band = metadataInteger(row, 'score_band')
  const keys = row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? Object.keys(row.metadata).sort().join(',')
    : ''
  return row?.name === 'viral_score_scorecard_share_requested' &&
    text(row?.path) === VIRAL_SCORE_SHARE_LANDING_PATH &&
    keys === 'method,score_band,variant' &&
    metadataString(row, 'variant') === VIRAL_SCORE_SHARE_CAMPAIGN &&
    ['native', 'clipboard'].includes(metadataString(row, 'method')) &&
    band !== null && band >= 0 && band <= 100 && band % 10 === 0
}

function activeSubscription(profile) {
  const plan = text(profile?.plan)?.toLowerCase() ?? null
  return profile?.is_pro === true || ACTIVE_PLANS.has(plan) ||
    Boolean(text(profile?.stripe_subscription_id)) ||
    Boolean(text(profile?.paypal_subscription_id)) ||
    Boolean(text(profile?.paddle_subscription_id))
}

function validRecurringStart(row) {
  const tier = metadataString(row, 'tier')
  const billing = metadataString(row, 'billing')
  return row?.name === 'checkout_started' &&
    Boolean(metadataString(row, 'stripe_session_id')) &&
    !metadataString(row, 'sku') && !metadataString(row, 'pack') &&
    RECURRING_TIERS.has(tier) && RECURRING_BILLING.has(billing) &&
    (tier !== 'autopilot' || billing === 'monthly')
}

function identityIndex(profiles) {
  const grouped = new Map()
  for (const profile of profiles) {
    const id = text(profile?.id)
    if (!id) continue
    grouped.set(id, [...(grouped.get(id) ?? []), profile])
  }
  const external = new Map()
  const internal = new Set()
  const unknown = new Set()
  const quality = { internalProfileRows: 0, missingEmailProfileRows: 0, conflictingProfilePeople: 0 }
  for (const [id, rows] of grouped) {
    const emails = new Set(rows.map((row) => text(row?.email)?.toLowerCase() ?? null))
    if (rows.length !== 1 || emails.size !== 1) {
      quality.conflictingProfilePeople += 1
      unknown.add(id)
      continue
    }
    const email = [...emails][0]
    if (!email) {
      quality.missingEmailProfileRows += 1
      unknown.add(id)
    } else if (isInternalMeasurementEmail(email)) {
      quality.internalProfileRows += 1
      internal.add(id)
    } else {
      external.set(id, rows[0])
    }
  }
  return { external, internal, unknown, quality }
}

function resolveOwner(sessionId, sessionEvents, identity, landedAt, generatedAtMs) {
  const owned = sessionEvents.filter((row) =>
    text(row?.session_id) === sessionId && text(row?.user_id))
  if (owned.some((row) => timestamp(row) === null)) {
    return { state: 'owner_clock_unknown', userId: null }
  }
  const ids = new Set(owned
    .filter((row) => timestamp(row) >= landedAt && timestamp(row) <= generatedAtMs)
    .map((row) => text(row?.user_id)))
  if (ids.size !== 1) {
    return { state: ids.size > 1 ? 'owner_conflict' : 'owner_unknown', userId: null }
  }
  const userId = [...ids][0]
  if (identity.internal.has(userId)) return { state: 'owner_internal', userId: null }
  if (identity.unknown.has(userId) || !identity.external.has(userId)) {
    return { state: 'owner_identity_unknown', userId: null }
  }
  return { state: 'external', userId }
}

function revenueByCurrency(records) {
  const totals = new Map()
  for (const row of records) {
    if (!row.currency || !Number.isSafeInteger(row.amountMinor) || row.amountMinor <= 0) continue
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

export function buildViralScoreShareSubscriptionReport({
  generatedAt, windowStart, landingEvents, sessionEvents, shareEvents,
  financialEvents, profiles, videos,
}) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const windowStartMs = Date.parse(String(windowStart ?? ''))
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  if (![landingEvents, sessionEvents, shareEvents, financialEvents, profiles, videos].every(Array.isArray)) {
    throw new Error('all evidence inputs must be arrays')
  }

  const exactLandings = landingEvents.filter(isExactViralScoreShareLanding)
  const landingSessionIds = new Set(exactLandings.map((row) => text(row?.session_id)).filter(Boolean))
  const relevantIds = new Set([
    ...sessionEvents.filter((row) => landingSessionIds.has(text(row?.session_id)))
      .map((row) => text(row?.user_id)).filter(Boolean),
    ...shareEvents.map((row) => text(row?.user_id)).filter(Boolean),
  ])
  const relevantProfiles = profiles.filter((profile) =>
    exactAcquisition(profile) || relevantIds.has(text(profile?.id)))
  const identity = identityIndex(relevantProfiles)
  const ownerStates = new Map()
  const undatableExactLandingRows = exactLandings.filter((row) => timestamp(row) === null).length
  const unknownAttributedProfilePeople = new Set(relevantProfiles
    .filter((profile) => {
      const id = text(profile?.id)
      return exactAcquisition(profile) && !identity.external.has(id) && !identity.internal.has(id)
    })
    .map((profile) => text(profile?.id)).filter(Boolean)).size
  const undatableAttributedProfilePeople = [...identity.external.values()]
    .filter((profile) => exactAcquisition(profile) && timestamp(profile) === null).length
  let undatableExactResultRows = 0
  let invalidResultContractRows = 0
  let lateExactResultRows = 0
  const candidates = []

  for (const landing of exactLandings) {
    const landedAt = timestamp(landing)
    if (landedAt === null || landedAt < windowStartMs || landedAt > generatedAtMs) continue
    const sessionId = text(landing?.session_id)
    if (!sessionId) {
      increment(ownerStates, 'missing_session_id')
      continue
    }
    const owner = resolveOwner(sessionId, sessionEvents, identity, landedAt, generatedAtMs)
    increment(ownerStates, owner.state)
    if (owner.state !== 'external') continue
    const profile = identity.external.get(owner.userId)
    const profileAt = timestamp(profile)
    if (!exactAcquisition(profile)) {
      increment(ownerStates, 'profile_attribution_mismatch')
      continue
    }
    if (profileAt === null) continue
    if (landedAt >= profileAt) {
      increment(ownerStates, 'landing_profile_chronology_invalid')
      continue
    }

    const resultRows = sessionEvents.filter((row) =>
      row?.name === 'viral_score_completed' && text(row?.session_id) === sessionId)
    for (const row of resultRows) {
      const rowAt = timestamp(row)
      if (isExactViralScoreShareResult(row) && rowAt === null) undatableExactResultRows += 1
      else if (isExactViralScoreShareResult(row) && rowAt >= profileAt) lateExactResultRows += 1
      else if (rowAt !== null && rowAt > landedAt && rowAt < profileAt && !isExactViralScoreShareResult(row)) {
        invalidResultContractRows += 1
      }
    }
    const resultTimes = resultRows.filter(isExactViralScoreShareResult)
      .map(timestamp).filter((value) => value !== null && value > landedAt && value < profileAt)
      .sort((a, b) => a - b)
    if (resultTimes.length === 0) {
      increment(ownerStates, 'result_missing')
      continue
    }
    candidates.push({ userId: owner.userId, profile, landedAt, resultAt: resultTimes[0], profileAt, sessionId })
  }

  const byUser = new Map()
  for (const row of candidates) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row])
  const people = []
  let ambiguousFirstLandingPeople = 0
  for (const rows of byUser.values()) {
    rows.sort((a, b) => a.landedAt - b.landedAt || a.sessionId.localeCompare(b.sessionId))
    const tied = rows.filter((row) => row.landedAt === rows[0].landedAt)
    if (new Set(tied.map((row) => row.sessionId)).size !== 1) ambiguousFirstLandingPeople += 1
    else people.push({ ...rows[0], cutoff: Math.min(generatedAtMs, rows[0].profileAt + VIRAL_SCORE_SHARE_MATURITY_DAYS * DAY_MS) })
  }

  const exactShares = shareEvents.filter((row) => {
    const rowAt = timestamp(row)
    return isExactViralScoreShareRequest(row) && rowAt !== null &&
      rowAt >= windowStartMs && rowAt <= generatedAtMs
  })
  const undatableExactShareRows = shareEvents
    .filter((row) => isExactViralScoreShareRequest(row) && timestamp(row) === null).length
  const invalidShareContractRows = shareEvents.filter((row) =>
    row?.name === 'viral_score_scorecard_share_requested' &&
    text(row?.path) === VIRAL_SCORE_SHARE_LANDING_PATH &&
    timestamp(row) !== null && timestamp(row) >= windowStartMs && timestamp(row) <= generatedAtMs &&
    !isExactViralScoreShareRequest(row)).length
  const externalSharers = new Set(exactShares
    .map((row) => text(row?.user_id))
    .filter((userId) => userId && identity.external.has(userId)))
  const internalShareRows = exactShares.filter((row) => identity.internal.has(text(row?.user_id))).length
  const unknownShareActorRows = exactShares.filter((row) => {
    const userId = text(row?.user_id)
    return userId && !identity.external.has(userId) && !identity.internal.has(userId)
  }).length
  const anonymousShareSessions = new Set(exactShares
    .filter((row) => !text(row?.user_id))
    .map((row) => text(row?.session_id)).filter(Boolean))
  const shareLoopObserved = externalSharers.size >= VIRAL_SCORE_SHARE_MIN_EXTERNAL_SHARERS

  const linkedPeople = new Set(people.map((row) => row.userId))
  const unlinkedAttributedProfilePeople = [...identity.external.entries()].filter(([id, profile]) => {
    const profileAt = timestamp(profile)
    return exactAcquisition(profile) && profileAt !== null &&
      profileAt >= windowStartMs && profileAt <= generatedAtMs && !linkedPeople.has(id)
  }).length

  const undatableVideoPeople = new Set()
  const prepared = people.map((person) => {
    const ownCompleted = videos.filter((row) =>
      text(row?.user_id) === person.userId && row?.status === 'completed')
    if (ownCompleted.some((row) => timestamp(row) === null)) undatableVideoPeople.add(person.userId)
    const firstVideoAt = ownCompleted
      .map(timestamp)
      .filter((at) => at !== null && at > person.profileAt && at <= person.cutoff)
      .sort((a, b) => a - b)[0] ?? null
    return { ...person, firstVideoAt }
  })

  const financial = financialEvents.filter((row) =>
    row?.name === 'checkout_started' || row?.name === 'payment_success')
  const seededSessionIds = new Set(prepared.flatMap((person) => {
    if (person.firstVideoAt === null) return []
    return financial.filter((row) => {
      const rowAt = timestamp(row)
      return text(row?.user_id) === person.userId && validRecurringStart(row) &&
        rowAt !== null && rowAt > person.firstVideoAt && rowAt <= person.cutoff
    }).map((row) => metadataString(row, 'stripe_session_id'))
  }))
  const scopedFinancial = financial.filter((row) =>
    seededSessionIds.has(metadataString(row, 'stripe_session_id')))
  const ledger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: '1970-01-01T00:00:00.000Z',
    events: scopedFinancial,
    profiles,
  })

  const undatableFinancialPeople = new Set()
  const invalidStarts = new Set()
  const conflicts = new Set()
  const unlinkedPaymentPeople = new Set()
  const unlinkedPaymentSessions = new Set()
  const invalidLedgerPeople = new Set()
  let unlinkedPaymentRows = 0
  const evaluated = prepared.map((person) => {
    const own = financial.filter((row) => text(row?.user_id) === person.userId)
    if (own.some((row) => timestamp(row) === null)) undatableFinancialPeople.add(person.userId)
    const inWindow = own.filter((row) => {
      const rowAt = timestamp(row)
      return person.firstVideoAt !== null && rowAt !== null &&
        rowAt > person.firstVideoAt && rowAt <= person.cutoff
    })
    if (inWindow.some((row) => row.name === 'checkout_started' &&
        !metadataString(row, 'sku') && !metadataString(row, 'pack') && !validRecurringStart(row))) {
      invalidStarts.add(person.userId)
    }
    const sessionIds = new Set(inWindow.filter(validRecurringStart)
      .map((row) => metadataString(row, 'stripe_session_id')))
    const subscriptionPayments = own.filter((row) => {
      const rowAt = timestamp(row)
      return row?.name === 'payment_success' &&
        metadataString(row, 'checkout_mode') === 'subscription' &&
        person.firstVideoAt !== null && rowAt !== null &&
        rowAt > person.firstVideoAt && rowAt <= person.cutoff
    })
    for (const payment of subscriptionPayments) {
      const sessionId = metadataString(payment, 'stripe_session_id')
      if (sessionId && sessionIds.has(sessionId)) continue
      unlinkedPaymentPeople.add(person.userId)
      if (sessionId) unlinkedPaymentSessions.add(sessionId)
      unlinkedPaymentRows += 1
    }
    const records = ledger.records.filter((record) => sessionIds.has(record.stripeSessionId))
    if (records.some((record) => record.status === 'conflict' ||
        record.ownerClass !== 'external' || record.ownerUserId !== person.userId)) {
      conflicts.add(person.userId)
    }
    if (records.some((record) => !['paid', 'unpaid'].includes(record.status))) {
      invalidLedgerPeople.add(person.userId)
    }
    const exactPaid = records.filter((record) => {
      const paidAt = Date.parse(String(record.paidAt ?? ''))
      return record.status === 'paid' && record.ownerClass === 'external' &&
        record.ownerUserId === person.userId && Number.isFinite(paidAt) &&
        person.firstVideoAt !== null && paidAt > person.firstVideoAt &&
        paidAt <= person.cutoff && Number.isSafeInteger(record.amountMinor) &&
        record.amountMinor > 0 && Boolean(record.currency)
    })
    return {
      ...person,
      mature: generatedAtMs >= person.profileAt + VIRAL_SCORE_SHARE_MATURITY_DAYS * DAY_MS,
      checkoutSessions: sessionIds.size,
      exactPaid,
      exactActiveSubscriber: activeSubscription(person.profile) && exactPaid.length > 0,
    }
  })

  const mature = evaluated.filter((row) => row.mature)
  const matureFirstVideoPeople = mature.filter((row) => row.firstVideoAt !== null).length
  const matureCheckoutPeople = mature.filter((row) => row.checkoutSessions > 0).length
  const exactActive = evaluated.filter((row) =>
    row.exactActiveSubscriber && !conflicts.has(row.userId))
  const exactPaid = exactActive.flatMap((row) => row.exactPaid)
  const blockingOwnerStates = ['missing_session_id', 'owner_clock_unknown', 'owner_conflict']
    .reduce((total, state) => total + (ownerStates.get(state) ?? 0), 0)
  const qualityMet = identity.quality.conflictingProfilePeople === 0 &&
    unknownAttributedProfilePeople === 0 &&
    undatableAttributedProfilePeople === 0 &&
    undatableExactLandingRows === 0 &&
    undatableExactResultRows === 0 &&
    undatableExactShareRows === 0 &&
    undatableVideoPeople.size === 0 &&
    undatableFinancialPeople.size === 0 &&
    ambiguousFirstLandingPeople === 0 &&
    unlinkedAttributedProfilePeople === 0 &&
    blockingOwnerStates === 0 &&
    invalidStarts.size === 0 &&
    conflicts.size === 0 &&
    unlinkedPaymentPeople.size === 0 &&
    invalidLedgerPeople.size === 0 &&
    ledger.summary.conflictStripeSessions === 0

  let state = qualityMet ? 'collecting' : 'blocked_quality'
  if (qualityMet && exactActive.length > 0) state = 'channel_proven_not_causal'
  else if (qualityMet && mature.length >= VIRAL_SCORE_SHARE_MIN_MATURE_PEOPLE &&
      matureFirstVideoPeople >= VIRAL_SCORE_SHARE_MIN_FIRST_VIDEO_PEOPLE &&
      matureCheckoutPeople === 0) state = 'stop_no_checkout'
  else if (qualityMet && mature.length >= VIRAL_SCORE_SHARE_MIN_MATURE_PEOPLE) {
    state = shareLoopObserved ? 'ready_for_decision' : 'ready_channel_not_loop'
  }

  return {
    schemaVersion: VIRAL_SCORE_SHARE_REPORT_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: new Date(windowStartMs).toISOString(),
    sharing: {
      exactShareRows: exactShares.length,
      distinctExternalSharers: externalSharers.size,
      anonymousShareSessions: anonymousShareSessions.size,
      internalShareRows,
      unknownShareActorRows,
      minimumExternalSharers: VIRAL_SCORE_SHARE_MIN_EXTERNAL_SHARERS,
      loopObserved: shareLoopObserved,
    },
    acquisition: {
      source: VIRAL_SCORE_SHARE_SOURCE,
      medium: VIRAL_SCORE_SHARE_MEDIUM,
      campaign: VIRAL_SCORE_SHARE_CAMPAIGN,
      exactLandingSessions: landingSessionIds.size,
      externalPeople: evaluated.length,
      matureExternalPeople: mature.length,
      firstVideoPeople: evaluated.filter((row) => row.firstVideoAt !== null).length,
      matureFirstVideoPeople,
      recurringCheckoutPeople: evaluated.filter((row) => row.checkoutSessions > 0).length,
      matureRecurringCheckoutPeople: matureCheckoutPeople,
      exactActiveSubscriberPeople: exactActive.length,
      exactPaidStripeSessions: exactPaid.length,
      exactRevenueMinorByCurrency: revenueByCurrency(exactPaid),
    },
    quality: {
      ...identity.quality,
      unknownAttributedProfilePeople,
      undatableAttributedProfilePeople,
      undatableExactLandingRows,
      undatableExactResultRows,
      undatableExactShareRows,
      undatableVideoPeople: undatableVideoPeople.size,
      undatableFinancialPeople: undatableFinancialPeople.size,
      invalidResultContractRows,
      lateExactResultRows,
      invalidShareContractRows,
      ambiguousFirstLandingPeople,
      unlinkedAttributedProfilePeople,
      ownerStateCounts: Object.fromEntries([...ownerStates.entries()].sort(([a], [b]) => a.localeCompare(b))),
      invalidRecurringStartPeople: invalidStarts.size,
      financialConflictPeople: conflicts.size,
      unlinkedSubscriptionPaymentPeople: unlinkedPaymentPeople.size,
      unlinkedSubscriptionPaymentSessions: unlinkedPaymentSessions.size,
      unlinkedSubscriptionPaymentRows: unlinkedPaymentRows,
      invalidLedgerPeople: invalidLedgerPeople.size,
      ledgerConflictStripeSessions: ledger.summary.conflictStripeSessions,
      qualityMet,
    },
    gate: {
      maturityDays: VIRAL_SCORE_SHARE_MATURITY_DAYS,
      minimumMatureExternalPeople: VIRAL_SCORE_SHARE_MIN_MATURE_PEOPLE,
      minimumMatureFirstVideoPeople: VIRAL_SCORE_SHARE_MIN_FIRST_VIDEO_PEOPLE,
      minimumExternalSharers: VIRAL_SCORE_SHARE_MIN_EXTERNAL_SHARERS,
      shareLoopObserved,
      state,
      exactPaymentShortcut: true,
    },
    note: 'People require an exact attributed /viral-score landing, a valid score result in the same uniquely owned browser session, a later first-touch profile, a later completed video, a later recurring Checkout, payment for the same canonical Stripe Session and owner, and an active subscription. External sharers are distinct authenticated people; anonymous share sessions remain diagnostics. Three external sharers prove only observed use of the button, never sender-to-recipient attribution. One exact payment proves channel revenue, not causality. Revenue comes only from the canonical subscription ledger.',
  }
}
