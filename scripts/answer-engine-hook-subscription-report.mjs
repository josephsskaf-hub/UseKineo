import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const AEO_HOOK_REPORT_VERSION = 'answer_engine_hook_subscription_v1'
export const AEO_HOOK_SOURCE = 'answer_engine'
export const AEO_HOOK_MEDIUM = 'organic'
export const AEO_HOOK_CAMPAIGN = 'aeo_hook_workbench_v1'
export const AEO_HOOK_LANDING_PATH = '/free-hook-generator'
export const AEO_HOOK_WINDOW_DAYS = 30
export const AEO_HOOK_MATURITY_DAYS = 7
export const AEO_HOOK_MIN_MATURE_PEOPLE = 20
export const AEO_HOOK_MIN_RESULT_PEOPLE = 5
export const AEO_HOOK_MIN_VIDEO_PEOPLE = 5

const DAY_MS = 86_400_000
const AEO_HOOK_RESULT_WRITE_TOLERANCE_MS = 5_000
const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])
const ACTIVE_PLANS = new Set(['starter', 'basic', 'creator', 'pro', 'studio', 'autopilot'])
const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null
const at = (row) => {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}
const meta = (row, key) => text(row?.metadata?.[key])

function metaInteger(row, key) {
  const value = row?.metadata?.[key]
  if (Number.isSafeInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value)
  return null
}

export function isExactAeoHookLanding(row) {
  return row?.name === 'landing_session_started' &&
    text(row?.path) === AEO_HOOK_LANDING_PATH &&
    meta(row, 'utm_source') === AEO_HOOK_SOURCE &&
    meta(row, 'utm_medium') === AEO_HOOK_MEDIUM &&
    meta(row, 'utm_campaign') === AEO_HOOK_CAMPAIGN
}

export function isExactAeoHookResult(row) {
  const count = metaInteger(row, 'hook_count')
  return row?.name === 'free_hook_result_generated' &&
    text(row?.path) === AEO_HOOK_LANDING_PATH &&
    meta(row, 'version') === AEO_HOOK_CAMPAIGN &&
    meta(row, 'entry') === 'answer_engine' &&
    count !== null && count >= 1 && count <= 20
}

function exactProfile(profile) {
  return text(profile?.signup_utm_source) === AEO_HOOK_SOURCE &&
    text(profile?.signup_utm_medium) === AEO_HOOK_MEDIUM &&
    text(profile?.signup_utm_campaign) === AEO_HOOK_CAMPAIGN
}

function activeSubscription(profile) {
  const plan = text(profile?.plan)?.toLowerCase() ?? null
  return profile?.is_pro === true || ACTIVE_PLANS.has(plan) ||
    Boolean(text(profile?.stripe_subscription_id)) ||
    Boolean(text(profile?.paypal_subscription_id)) ||
    Boolean(text(profile?.paddle_subscription_id))
}

function validRecurringStart(row) {
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
  const internal = new Set()
  const quality = { internalProfileRows: 0, missingEmailProfileRows: 0, conflictingProfilePeople: 0 }
  for (const [id, rows] of grouped) {
    const emails = new Set(rows.map((row) => text(row?.email)?.toLowerCase() ?? null))
    if (rows.length !== 1 || emails.size !== 1) quality.conflictingProfilePeople += 1
    else if (![...emails][0]) quality.missingEmailProfileRows += 1
    else if (isInternalMeasurementEmail([...emails][0])) {
      quality.internalProfileRows += 1
      internal.add(id)
    }
    else external.set(id, rows[0])
  }
  return { external, internal, quality }
}

function resolveOwner(sessionId, sessionEvents, identity, landedAt, generatedAt) {
  const owned = sessionEvents.filter((row) => text(row?.session_id) === sessionId && text(row?.user_id))
  if (owned.some((row) => at(row) === null)) return { state: 'owner_clock_unknown', userId: null }
  const ids = new Set(owned
    .filter((row) => at(row) >= landedAt && at(row) <= generatedAt)
    .map((row) => text(row?.user_id)))
  if (ids.size !== 1) return { state: ids.size > 1 ? 'owner_conflict' : 'owner_unknown', userId: null }
  const userId = [...ids][0]
  if (identity.internal.has(userId)) return { state: 'owner_internal', userId: null }
  if (!identity.external.has(userId)) return { state: 'owner_identity_unknown', userId: null }
  return { state: 'external', userId }
}

function referrerHost(profile) {
  const value = text(profile?.signup_referrer)
  if (!value) return 'unreported'
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    const known = [
      ['chatgpt.com', 'chatgpt.com'],
      ['chat.openai.com', 'chatgpt.com'],
      ['perplexity.ai', 'perplexity.ai'],
      ['claude.ai', 'claude.ai'],
      ['gemini.google.com', 'gemini.google.com'],
      ['copilot.microsoft.com', 'copilot.microsoft.com'],
      ['google.com', 'google.com'],
      ['bing.com', 'bing.com'],
    ]
    return known.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? 'other'
  } catch {
    return 'invalid'
  }
}

function revenue(records) {
  const totals = new Map()
  for (const row of records) {
    if (!row.currency || !Number.isSafeInteger(row.amountMinor) || row.amountMinor <= 0) continue
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

export function buildAnswerEngineHookSubscriptionReport({
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

  const exactLandings = landingEvents.filter(isExactAeoHookLanding)
  const exactLandingSessionIds = new Set(exactLandings.map((row) => text(row?.session_id)).filter(Boolean))
  const relevantOwnerIds = new Set(sessionEvents
    .filter((row) => exactLandingSessionIds.has(text(row?.session_id)))
    .map((row) => text(row?.user_id)).filter(Boolean))
  const relevantProfiles = profiles.filter((profile) =>
    exactProfile(profile) || relevantOwnerIds.has(text(profile?.id)))
  const identity = identityIndex(relevantProfiles)
  const ownerStates = new Map()
  const undatableExactLandingRows = exactLandings.filter((row) => at(row) === null).length
  const undatableAttributedProfiles = [...identity.external.values()]
    .filter((profile) => exactProfile(profile) && at(profile) === null).length
  let invalidResultContractRows = 0
  let undatableExactResultRows = 0
  let lateExactResultRows = 0
  const candidates = []

  for (const landing of exactLandings) {
    const landedAt = at(landing)
    if (landedAt === null || landedAt < windowStartMs || landedAt > generatedAtMs) continue
    const sessionId = text(landing?.session_id)
    if (!sessionId) {
      ownerStates.set('missing_session_id', (ownerStates.get('missing_session_id') ?? 0) + 1)
      continue
    }
    const owner = resolveOwner(sessionId, sessionEvents, identity, landedAt, generatedAtMs)
    ownerStates.set(owner.state, (ownerStates.get(owner.state) ?? 0) + 1)
    if (owner.state !== 'external') continue
    const profile = identity.external.get(owner.userId)
    const profileAt = at(profile)
    if (!exactProfile(profile)) {
      ownerStates.set('profile_attribution_mismatch',
        (ownerStates.get('profile_attribution_mismatch') ?? 0) + 1)
      continue
    }
    if (profileAt === null) continue
    if (landedAt >= profileAt) {
      ownerStates.set('landing_profile_chronology_invalid',
        (ownerStates.get('landing_profile_chronology_invalid') ?? 0) + 1)
      continue
    }

    const resultRows = sessionEvents.filter((row) =>
      row?.name === 'free_hook_result_generated' && text(row?.session_id) === sessionId)
    const latestResultAt = Math.min(generatedAtMs, profileAt + AEO_HOOK_RESULT_WRITE_TOLERANCE_MS)
    for (const row of resultRows) {
      const rowAt = at(row)
      if (rowAt === null) {
        if (isExactAeoHookResult(row)) undatableExactResultRows += 1
      } else if (isExactAeoHookResult(row) && rowAt > latestResultAt) {
        lateExactResultRows += 1
      } else if (meta(row, 'entry') === 'answer_engine' &&
        rowAt > landedAt && rowAt <= latestResultAt && !isExactAeoHookResult(row)) {
        invalidResultContractRows += 1
      }
    }
    const exactResultTimes = resultRows.filter(isExactAeoHookResult)
      .map(at).filter((value) => value !== null && value > landedAt && value <= latestResultAt)
      .sort((a, b) => a - b)
    candidates.push({ userId: owner.userId, profile, profileAt, landedAt, exactResultTimes, sessionId })
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

  const linkedPeople = new Set(people.map((row) => row.userId))
  const unlinkedAttributedProfilePeople = [...identity.external.entries()].filter(([id, profile]) => {
    const profileAt = at(profile)
    return exactProfile(profile) && profileAt !== null &&
      profileAt >= windowStartMs && profileAt <= generatedAtMs && !linkedPeople.has(id)
  }).length

  for (const person of people) {
    person.cutoff = Math.min(generatedAtMs, person.profileAt + AEO_HOOK_MATURITY_DAYS * DAY_MS)
    person.resultAt = person.exactResultTimes.find((value) => value <= person.cutoff) ?? null
    person.firstVideoAt = person.resultAt === null ? null : videos
      .filter((row) => row?.user_id === person.userId && row?.status === 'completed')
      .map(at).filter((value) => value !== null &&
        value > Math.max(person.profileAt, person.resultAt) && value <= person.cutoff)
      .sort((a, b) => a - b)[0] ?? null
  }

  const seededSessionIds = new Set(people.flatMap((person) => {
    if (person.firstVideoAt === null) return []
    return financialEvents.filter((row) => text(row?.user_id) === person.userId &&
      validRecurringStart(row) && at(row) !== null && at(row) > person.firstVideoAt && at(row) <= person.cutoff)
      .map((row) => meta(row, 'stripe_session_id'))
  }))
  const scopedFinancial = financialEvents.filter((row) => seededSessionIds.has(meta(row, 'stripe_session_id')))
  const ledger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: '1970-01-01T00:00:00.000Z',
    events: scopedFinancial,
    profiles,
  })

  const invalidStarts = new Set()
  const undatableFinancial = new Set()
  const unlinkedPayments = new Set()
  const financialConflicts = new Set()
  const invalidLedger = new Set()
  const invalidPaymentChronology = new Set()
  const undatableSeededFinancialRows = scopedFinancial.filter((row) => at(row) === null).length
  for (const person of people) {
    const ownFinancial = financialEvents.filter((row) => text(row?.user_id) === person.userId)
    if (ownFinancial.some((row) => at(row) === null)) undatableFinancial.add(person.userId)
    if (person.firstVideoAt !== null && ownFinancial.some((row) => {
      const rowAt = at(row)
      return row?.name === 'checkout_started' && rowAt !== null &&
        rowAt > person.firstVideoAt && rowAt <= person.cutoff &&
        !meta(row, 'sku') && !meta(row, 'pack') && !validRecurringStart(row)
    })) invalidStarts.add(person.userId)

    const starts = ownFinancial.filter((row) => validRecurringStart(row) &&
      person.firstVideoAt !== null && at(row) !== null && at(row) > person.firstVideoAt && at(row) <= person.cutoff)
    person.checkoutSessions = new Set(starts.map((row) => meta(row, 'stripe_session_id')))
    const payments = ownFinancial.filter((row) => row?.name === 'payment_success' &&
      meta(row, 'checkout_mode') === 'subscription' && person.firstVideoAt !== null &&
      at(row) !== null && at(row) > person.firstVideoAt && at(row) <= person.cutoff)
    if (payments.some((row) => !meta(row, 'stripe_session_id') ||
      !person.checkoutSessions.has(meta(row, 'stripe_session_id')))) unlinkedPayments.add(person.userId)

    const records = ledger.records.filter((row) => person.checkoutSessions.has(row.stripeSessionId))
    if (records.some((row) => row.ownerClass !== 'external' ||
      row.ownerUserId !== person.userId || row.status === 'conflict')) financialConflicts.add(person.userId)
    if (records.some((row) => !['paid', 'unpaid'].includes(row.status))) invalidLedger.add(person.userId)
    person.exactPaid = records.filter((row) => {
      const startedAt = Date.parse(String(row.startedAt ?? ''))
      const paidAt = Date.parse(String(row.paidAt ?? ''))
      if (row.status === 'paid' && (!Number.isFinite(startedAt) ||
        !Number.isFinite(paidAt) || paidAt <= startedAt)) {
        invalidPaymentChronology.add(person.userId)
        return false
      }
      return row.status === 'paid' && row.ownerClass === 'external' &&
        row.ownerUserId === person.userId && Number.isFinite(paidAt) &&
        paidAt > person.firstVideoAt && paidAt <= person.cutoff &&
        Number.isSafeInteger(row.amountMinor) && row.amountMinor > 0 && Boolean(row.currency)
    })
    person.exactActiveSubscriber = activeSubscription(person.profile) && person.exactPaid.length > 0
    person.mature = generatedAtMs >= person.profileAt + AEO_HOOK_MATURITY_DAYS * DAY_MS
  }

  const mature = people.filter((row) => row.mature)
  const matureResults = mature.filter((row) => row.resultAt !== null)
  const matureVideos = mature.filter((row) => row.firstVideoAt !== null)
  const matureCheckouts = mature.filter((row) => row.checkoutSessions.size > 0)
  const exactActive = people.filter((row) => row.exactActiveSubscriber && !financialConflicts.has(row.userId))
  const exactPaid = exactActive.flatMap((row) => row.exactPaid)
  const referrers = new Map()
  for (const person of people) {
    const host = referrerHost(person.profile)
    referrers.set(host, (referrers.get(host) ?? 0) + 1)
  }

  const ownerQualityFailures = (ownerStates.get('owner_conflict') ?? 0) +
    (ownerStates.get('owner_clock_unknown') ?? 0) +
    (ownerStates.get('owner_identity_unknown') ?? 0) +
    (ownerStates.get('profile_attribution_mismatch') ?? 0) +
    (ownerStates.get('landing_profile_chronology_invalid') ?? 0) +
    (ownerStates.get('missing_session_id') ?? 0)
  const qualityMet = identity.quality.conflictingProfilePeople === 0 &&
    identity.quality.missingEmailProfileRows === 0 &&
    unlinkedAttributedProfilePeople === 0 &&
    undatableAttributedProfiles === 0 && undatableExactLandingRows === 0 &&
    undatableExactResultRows === 0 && invalidResultContractRows === 0 &&
    ambiguousFirstLandingPeople === 0 && ownerQualityFailures === 0 &&
    invalidStarts.size === 0 && undatableFinancial.size === 0 &&
    undatableSeededFinancialRows === 0 && unlinkedPayments.size === 0 &&
    financialConflicts.size === 0 && invalidLedger.size === 0 &&
    invalidPaymentChronology.size === 0 &&
    ledger.summary.conflictStripeSessions === 0

  let state = qualityMet ? 'collecting' : 'blocked_quality'
  if (qualityMet && exactActive.length > 0) state = 'channel_proven_not_causal'
  else if (qualityMet && mature.length >= AEO_HOOK_MIN_MATURE_PEOPLE &&
    matureResults.length >= AEO_HOOK_MIN_RESULT_PEOPLE && matureVideos.length === 0) state = 'stop_no_activation'
  else if (qualityMet && mature.length >= AEO_HOOK_MIN_MATURE_PEOPLE &&
    matureVideos.length >= AEO_HOOK_MIN_VIDEO_PEOPLE && matureCheckouts.length === 0) state = 'stop_no_checkout'
  else if (qualityMet && mature.length >= AEO_HOOK_MIN_MATURE_PEOPLE) state = 'ready_for_decision'

  return {
    schemaVersion: AEO_HOOK_REPORT_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    funnel: {
      externalAttributedPeople: people.length,
      matureExternalPeople: mature.length,
      resultGeneratedPeople: people.filter((row) => row.resultAt !== null).length,
      matureResultGeneratedPeople: matureResults.length,
      firstVideoPeople: people.filter((row) => row.firstVideoAt !== null).length,
      matureFirstVideoPeople: matureVideos.length,
      recurringCheckoutPeople: people.filter((row) => row.checkoutSessions.size > 0).length,
      matureRecurringCheckoutPeople: matureCheckouts.length,
      exactActiveSubscriberPeople: exactActive.length,
      exactPaidStripeSessions: exactPaid.length,
      exactRevenueMinorByCurrency: revenue(exactPaid),
      signupReferrerHostCounts: Object.fromEntries([...referrers.entries()].sort()),
    },
    quality: {
      ...identity.quality,
      undatableAttributedProfiles,
      undatableExactLandingRows,
      undatableExactResultRows,
      lateExactResultRows,
      invalidResultContractRows,
      unlinkedAttributedProfilePeople,
      ambiguousFirstLandingPeople,
      ownerStateCounts: Object.fromEntries([...ownerStates.entries()].sort()),
      invalidRecurringStartPeople: invalidStarts.size,
      undatableFinancialPeople: undatableFinancial.size,
      undatableSeededFinancialRows,
      unlinkedSubscriptionPaymentPeople: unlinkedPayments.size,
      financialConflictPeople: financialConflicts.size,
      invalidLedgerPeople: invalidLedger.size,
      invalidPaymentChronologyPeople: invalidPaymentChronology.size,
      ledgerConflictStripeSessions: ledger.summary.conflictStripeSessions,
      qualityMet,
    },
    gate: {
      maturityDays: AEO_HOOK_MATURITY_DAYS,
      minimumMaturePeople: AEO_HOOK_MIN_MATURE_PEOPLE,
      minimumMatureResultPeople: AEO_HOOK_MIN_RESULT_PEOPLE,
      minimumMatureVideoPeople: AEO_HOOK_MIN_VIDEO_PEOPLE,
      state,
    },
    note: 'The measured unit is an external person with the exact action-link campaign, a valid hook result in the same resolved browser session, a later completed video, a later recurring Checkout and payment for the same canonical Stripe Session and owner, plus an active profile. The UTM proves use of the action link, not which answer engine displayed it; signup_referrer is reported only in allowlisted host categories. Revenue is canonical ledger revenue.',
  }
}
