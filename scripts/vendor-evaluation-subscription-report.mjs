import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const VENDOR_EVALUATION_REPORT_VERSION = 'vendor_evaluation_subscription_v1'
export const VENDOR_EVALUATION_SOURCE = 'vendor_evaluation_sheet'
export const VENDOR_EVALUATION_MEDIUM = 'referral'
export const VENDOR_EVALUATION_CAMPAIGN = 'b2b_vendor_evaluation_v1'
export const VENDOR_EVALUATION_LANDING_PATH = '/client-video-brief-generator'
export const VENDOR_EVALUATION_WINDOW_DAYS = 30
export const VENDOR_EVALUATION_MATURITY_DAYS = 7
export const VENDOR_EVALUATION_MIN_MATURE_PEOPLE = 20
export const VENDOR_EVALUATION_MIN_MATURE_BRIEF_PEOPLE = 5

const DAY_MS = 86_400_000
const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])
const ACTIVE_PLANS = new Set(['starter', 'basic', 'creator', 'pro', 'studio', 'autopilot'])
const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null
const at = (row) => {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}
const meta = (row, key) => text(row?.metadata?.[key])

export function isExactVendorEvaluationLanding(row) {
  return row?.name === 'landing_session_started' &&
    text(row?.path) === VENDOR_EVALUATION_LANDING_PATH &&
    meta(row, 'utm_source') === VENDOR_EVALUATION_SOURCE &&
    meta(row, 'utm_medium') === VENDOR_EVALUATION_MEDIUM &&
    meta(row, 'utm_campaign') === VENDOR_EVALUATION_CAMPAIGN
}

function exactProfile(profile) {
  return text(profile?.signup_utm_source) === VENDOR_EVALUATION_SOURCE &&
    text(profile?.signup_utm_medium) === VENDOR_EVALUATION_MEDIUM &&
    text(profile?.signup_utm_campaign) === VENDOR_EVALUATION_CAMPAIGN
}

function activeSubscription(profile) {
  const plan = text(profile?.plan)?.toLowerCase() ?? null
  return profile?.is_pro === true || ACTIVE_PLANS.has(plan) ||
    Boolean(text(profile?.stripe_subscription_id)) ||
    Boolean(text(profile?.paypal_subscription_id)) ||
    Boolean(text(profile?.paddle_subscription_id))
}

function validStart(row) {
  const tier = meta(row, 'tier')
  const billing = meta(row, 'billing')
  return row?.name === 'checkout_started' && Boolean(meta(row, 'stripe_session_id')) &&
    !meta(row, 'sku') && !meta(row, 'pack') &&
    RECURRING_TIERS.has(tier) && RECURRING_BILLING.has(billing) &&
    (tier !== 'autopilot' || billing === 'monthly')
}

function identityIndex(profiles) {
  const grouped = new Map()
  for (const row of profiles) {
    const id = text(row?.id)
    if (!id) continue
    grouped.set(id, [...(grouped.get(id) ?? []), row])
  }
  const external = new Map()
  const quality = { internalProfileRows: 0, missingEmailProfileRows: 0, conflictingProfilePeople: 0 }
  for (const [id, rows] of grouped) {
    const emails = new Set(rows.map((row) => text(row?.email)?.toLowerCase() ?? null))
    if (rows.length !== 1 || emails.size !== 1) quality.conflictingProfilePeople += 1
    else if (![...emails][0]) quality.missingEmailProfileRows += 1
    else if (isInternalMeasurementEmail([...emails][0])) quality.internalProfileRows += 1
    else external.set(id, rows[0])
  }
  return { external, quality }
}

function resolveOwner(sessionId, sessionEvents, identity, generatedAtMs) {
  const owned = sessionEvents.filter((row) => text(row?.session_id) === sessionId && text(row?.user_id))
  if (owned.some((row) => at(row) === null)) return { state: 'owner_clock_unknown', userId: null }
  const candidates = owned.filter((row) => at(row) <= generatedAtMs)
  const ids = new Set(candidates.map((row) => text(row?.user_id)))
  if (ids.size !== 1) return { state: ids.size > 1 ? 'owner_conflict' : 'owner_unknown', userId: null }
  const userId = [...ids][0]
  if (!identity.external.has(userId)) return { state: 'owner_not_external', userId: null }
  return { state: 'external', userId }
}

function revenue(records) {
  const totals = new Map()
  for (const row of records) {
    if (!row.currency || !Number.isSafeInteger(row.amountMinor) || row.amountMinor <= 0) continue
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

export function buildVendorEvaluationSubscriptionReport({
  generatedAt, windowStart, landingEvents, sessionEvents, financialEvents, profiles, videos,
}) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const windowStartMs = Date.parse(String(windowStart ?? ''))
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  if (![landingEvents, sessionEvents, financialEvents, profiles, videos].every(Array.isArray)) {
    throw new Error('all evidence inputs must be arrays')
  }
  const identity = identityIndex(profiles)
  const undatableExactLandingRows = landingEvents.filter((row) =>
    isExactVendorEvaluationLanding(row) && at(row) === null).length
  const undatableAttributedProfiles = [...identity.external.values()]
    .filter((profile) => exactProfile(profile) && at(profile) === null).length
  const ownerStates = new Map()
  let invalidBriefContractRows = 0
  const candidates = []
  for (const landing of landingEvents.filter(isExactVendorEvaluationLanding)) {
    const landedAt = at(landing)
    if (landedAt === null || landedAt < windowStartMs || landedAt > generatedAtMs) continue
    const sessionId = text(landing?.session_id)
    if (!sessionId) {
      ownerStates.set('missing_session_id', (ownerStates.get('missing_session_id') ?? 0) + 1)
      continue
    }
    const owner = resolveOwner(sessionId, sessionEvents, identity, generatedAtMs)
    ownerStates.set(owner.state, (ownerStates.get(owner.state) ?? 0) + 1)
    if (owner.state !== 'external') continue
    const profile = identity.external.get(owner.userId)
    const profileAt = at(profile)
    if (!exactProfile(profile) || profileAt === null || landedAt > profileAt) continue
    const sessionBriefs = sessionEvents.filter((row) =>
      row?.name === 'client_short_brief_generated' && text(row?.session_id) === sessionId)
    invalidBriefContractRows += sessionBriefs.filter((row) => {
      const rowAt = at(row)
      return rowAt !== null && rowAt >= landedAt && rowAt <= generatedAtMs && (
        meta(row, 'version') !== 'client_short_brief_v1' ||
        meta(row, 'surface') !== 'client_video_brief_generator')
    }).length
    const briefAt = sessionBriefs.filter((row) =>
      meta(row, 'version') === 'client_short_brief_v1' &&
      meta(row, 'surface') === 'client_video_brief_generator' &&
      at(row) !== null && at(row) >= landedAt && at(row) <= generatedAtMs)
      .map(at).sort((a, b) => a - b)[0] ?? null
    candidates.push({ userId: owner.userId, profile, landedAt, profileAt, briefAt, sessionId })
  }

  const byUser = new Map()
  for (const row of candidates) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row])
  const people = []
  let ambiguousFirstLandingPeople = 0
  for (const rows of byUser.values()) {
    rows.sort((a, b) => a.landedAt - b.landedAt || a.sessionId.localeCompare(b.sessionId))
    const tied = rows.filter((row) => row.landedAt === rows[0].landedAt)
    if (new Set(tied.map((row) => row.sessionId)).size !== 1) ambiguousFirstLandingPeople += 1
    else people.push(rows[0])
  }

  for (const person of people) {
    person.cutoff = Math.min(generatedAtMs, person.profileAt + VENDOR_EVALUATION_MATURITY_DAYS * DAY_MS)
    person.firstVideoAt = person.briefAt === null ? null : videos
      .filter((row) => row?.user_id === person.userId && row?.status === 'completed')
      .map(at).filter((value) => value !== null && value > person.briefAt && value <= person.cutoff)
      .sort((a, b) => a - b)[0] ?? null
  }
  const seededIds = new Set(people.flatMap((person) => {
    if (person.firstVideoAt === null) return []
    return financialEvents.filter((row) =>
      text(row?.user_id) === person.userId && validStart(row) &&
      at(row) !== null && at(row) > person.firstVideoAt && at(row) <= person.cutoff)
      .map((row) => meta(row, 'stripe_session_id'))
  }))
  const scopedFinancial = financialEvents.filter((row) => seededIds.has(meta(row, 'stripe_session_id')))
  const ledger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: '1970-01-01T00:00:00.000Z',
    events: scopedFinancial,
    profiles,
  })
  const conflicts = new Set()
  const unlinkedPayments = new Set()
  const invalidLedger = new Set()
  const invalidStarts = new Set()
  const undatableFinancial = new Set()
  const undatableValidBriefRows = sessionEvents.filter((row) =>
    row?.name === 'client_short_brief_generated' &&
    meta(row, 'version') === 'client_short_brief_v1' &&
    meta(row, 'surface') === 'client_video_brief_generator' &&
    at(row) === null &&
    candidates.some((candidate) => candidate.sessionId === text(row?.session_id))).length
  const undatableSeededFinancialRows = scopedFinancial.filter((row) => at(row) === null).length
  for (const person of people) {
    const ownFinancial = financialEvents.filter((row) => text(row?.user_id) === person.userId)
    if (ownFinancial.some((row) => at(row) === null)) undatableFinancial.add(person.userId)
    if (person.firstVideoAt !== null && ownFinancial.some((row) => {
      const rowAt = at(row)
      return row?.name === 'checkout_started' && rowAt !== null &&
        rowAt > person.firstVideoAt && rowAt <= person.cutoff &&
        !meta(row, 'sku') && !meta(row, 'pack') && !validStart(row)
    })) invalidStarts.add(person.userId)
    const starts = financialEvents.filter((row) =>
      text(row?.user_id) === person.userId && validStart(row) &&
      person.firstVideoAt !== null && at(row) !== null && at(row) > person.firstVideoAt && at(row) <= person.cutoff)
    person.checkoutSessions = new Set(starts.map((row) => meta(row, 'stripe_session_id')))
    const payments = financialEvents.filter((row) =>
      row?.name === 'payment_success' && text(row?.user_id) === person.userId &&
      meta(row, 'checkout_mode') === 'subscription' && person.firstVideoAt !== null &&
      at(row) !== null && at(row) > person.firstVideoAt && at(row) <= person.cutoff)
    if (payments.some((row) => !meta(row, 'stripe_session_id') || !person.checkoutSessions.has(meta(row, 'stripe_session_id')))) {
      unlinkedPayments.add(person.userId)
    }
    const records = ledger.records.filter((row) => person.checkoutSessions.has(row.stripeSessionId))
    if (records.some((row) => row.ownerClass !== 'external' || row.ownerUserId !== person.userId || row.status === 'conflict')) {
      conflicts.add(person.userId)
    }
    if (records.some((row) => !['paid', 'unpaid'].includes(row.status))) invalidLedger.add(person.userId)
    person.exactPaid = records.filter((row) => {
      const paidAt = Date.parse(String(row.paidAt ?? ''))
      return row.status === 'paid' && row.ownerClass === 'external' && row.ownerUserId === person.userId &&
        Number.isFinite(paidAt) && paidAt > person.firstVideoAt && paidAt <= person.cutoff &&
        Number.isSafeInteger(row.amountMinor) && row.amountMinor > 0 && Boolean(row.currency)
    })
    person.exactActiveSubscriber = activeSubscription(person.profile) && person.exactPaid.length > 0
    person.mature = generatedAtMs >= person.profileAt + VENDOR_EVALUATION_MATURITY_DAYS * DAY_MS
  }
  const mature = people.filter((row) => row.mature)
  const matureBrief = mature.filter((row) => row.briefAt !== null)
  const matureCheckout = mature.filter((row) => row.checkoutSessions.size > 0)
  const exactActive = people.filter((row) => row.exactActiveSubscriber && !conflicts.has(row.userId))
  const exactPaid = exactActive.flatMap((row) => row.exactPaid)
  const ownerQualityFailures = (ownerStates.get('owner_conflict') ?? 0) +
    (ownerStates.get('owner_clock_unknown') ?? 0) +
    (ownerStates.get('missing_session_id') ?? 0)
  const qualityMet = identity.quality.conflictingProfilePeople === 0 && undatableAttributedProfiles === 0 &&
    undatableExactLandingRows === 0 && ambiguousFirstLandingPeople === 0 &&
    ownerQualityFailures === 0 && invalidBriefContractRows === 0 && undatableValidBriefRows === 0 &&
    invalidStarts.size === 0 && undatableFinancial.size === 0 &&
    undatableSeededFinancialRows === 0 &&
    conflicts.size === 0 && unlinkedPayments.size === 0 &&
    invalidLedger.size === 0 && ledger.summary.conflictStripeSessions === 0
  let state = qualityMet ? 'collecting' : 'blocked_quality'
  if (qualityMet && exactActive.length > 0) state = 'channel_proven_not_causal'
  else if (qualityMet && mature.length >= VENDOR_EVALUATION_MIN_MATURE_PEOPLE &&
      matureBrief.length >= VENDOR_EVALUATION_MIN_MATURE_BRIEF_PEOPLE && matureCheckout.length === 0) state = 'stop_no_checkout'
  else if (qualityMet && mature.length >= VENDOR_EVALUATION_MIN_MATURE_PEOPLE) state = 'ready_for_decision'

  return {
    schemaVersion: VENDOR_EVALUATION_REPORT_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    funnel: {
      externalAttributedPeople: people.length,
      matureExternalPeople: mature.length,
      briefGeneratedPeople: people.filter((row) => row.briefAt !== null).length,
      matureBriefGeneratedPeople: matureBrief.length,
      firstVideoPeople: people.filter((row) => row.firstVideoAt !== null).length,
      recurringCheckoutPeople: people.filter((row) => row.checkoutSessions.size > 0).length,
      matureRecurringCheckoutPeople: matureCheckout.length,
      exactActiveSubscriberPeople: exactActive.length,
      exactPaidStripeSessions: exactPaid.length,
      exactRevenueMinorByCurrency: revenue(exactPaid),
    },
    quality: {
      ...identity.quality,
      undatableAttributedProfiles,
      undatableExactLandingRows,
      ambiguousFirstLandingPeople,
      ownerStateCounts: Object.fromEntries([...ownerStates.entries()].sort()),
      invalidBriefContractRows,
      undatableValidBriefRows,
      invalidRecurringStartPeople: invalidStarts.size,
      undatableFinancialPeople: undatableFinancial.size,
      undatableSeededFinancialRows,
      financialConflictPeople: conflicts.size,
      unlinkedSubscriptionPaymentPeople: unlinkedPayments.size,
      invalidLedgerPeople: invalidLedger.size,
      ledgerConflictStripeSessions: ledger.summary.conflictStripeSessions,
      qualityMet,
    },
    gate: {
      maturityDays: VENDOR_EVALUATION_MATURITY_DAYS,
      minimumMaturePeople: VENDOR_EVALUATION_MIN_MATURE_PEOPLE,
      minimumMatureBriefPeople: VENDOR_EVALUATION_MIN_MATURE_BRIEF_PEOPLE,
      state,
    },
    note: 'A CSV GET or download is never a person. The commercial chain requires an exact attributed landing and external first-touch profile, a brief generated in the resolved browser session, a later completed video, a later recurring Checkout and payment for the same canonical Stripe Session and owner, plus an active profile. Revenue is canonical ledger revenue. One exact payment proves channel revenue, not sender-to-recipient causality.',
  }
}
