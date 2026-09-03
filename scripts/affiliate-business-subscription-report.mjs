import { isInternalMeasurementEmail, readCanonicalStringConstant } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const AFFILIATE_BUSINESS_SUBSCRIPTION_VERSION = 'affiliate_business_subscription_v1'
export const AFFILIATE_BUSINESS_WINDOW_DAYS = 30
export const AFFILIATE_BUSINESS_OBSERVATION_DAYS = 7
export const AFFILIATE_BUSINESS_MIN_MATURE_PEOPLE = 5
export const AFFILIATE_BUSINESS_EVIDENCE_NAMES = Object.freeze([
  'affiliate_landing_context_viewed',
  'business_content_plan_generated',
])
export const AFFILIATE_BUSINESS_FINANCIAL_NAMES = Object.freeze([
  'checkout_started',
  'payment_success',
  'bulk_checkout_started',
  'bulk_purchase_completed',
])

const DAY_MS = 86_400_000
const PLAN_SOURCE = new URL('../lib/growth/businessContentPlan.ts', import.meta.url)
const LANDING_SOURCE = new URL('../lib/growth/affiliateLandingContext.ts', import.meta.url)
export const AFFILIATE_BUSINESS_CONTRACT = Object.freeze({
  attributionVersion: readCanonicalStringConstant(PLAN_SOURCE, 'BUSINESS_PLAN_ATTRIBUTION_VERSION'),
  entry: readCanonicalStringConstant(PLAN_SOURCE, 'BUSINESS_PLAN_AFFILIATE_ENTRY'),
  source: readCanonicalStringConstant(PLAN_SOURCE, 'BUSINESS_PLAN_AFFILIATE_SOURCE'),
  medium: readCanonicalStringConstant(PLAN_SOURCE, 'BUSINESS_PLAN_AFFILIATE_MEDIUM'),
  campaign: readCanonicalStringConstant(PLAN_SOURCE, 'BUSINESS_PLAN_AFFILIATE_CAMPAIGN'),
  planVersion: readCanonicalStringConstant(PLAN_SOURCE, 'BUSINESS_PLAN_SHARE_CAMPAIGN'),
  planSurface: 'business_video_content_plan',
  landingVariant: readCanonicalStringConstant(LANDING_SOURCE, 'AFFILIATE_LANDING_CONTEXT_VARIANT'),
  landingDestination: 'business',
})
const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLINGS = new Set(['monthly', 'annual'])

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function lower(value) {
  return text(value)?.toLowerCase() ?? null
}

function at(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function meta(row, key) {
  return text(row?.metadata?.[key])
}

function minor(row, key = 'amount_total') {
  const value = row?.metadata?.[key]
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}

function compare(left, right) {
  return (at(left) ?? Number.POSITIVE_INFINITY) - (at(right) ?? Number.POSITIVE_INFINITY) ||
    String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
}

function exactLanding(row, contract) {
  return row?.name === 'affiliate_landing_context_viewed' &&
    meta(row, 'variant') === contract.landingVariant &&
    meta(row, 'destination') === contract.landingDestination
}

function exactPlan(row, contract) {
  return row?.name === 'business_content_plan_generated' &&
    meta(row, 'version') === contract.planVersion &&
    meta(row, 'surface') === contract.planSurface &&
    meta(row, 'attribution_version') === contract.attributionVersion &&
    meta(row, 'entry') === contract.entry &&
    meta(row, 'referral_campaign') === contract.campaign
}

function profileIndex(profiles, contract) {
  const grouped = new Map()
  for (const profile of profiles) {
    const id = text(profile?.id)
    if (!id) continue
    const rows = grouped.get(id) ?? []
    rows.push(profile)
    grouped.set(id, rows)
  }
  const result = new Map()
  for (const [id, rows] of grouped) {
    if (rows.length !== 1) {
      result.set(id, { state: 'conflict', createdAt: null })
      continue
    }
    const profile = rows[0]
    const email = lower(profile?.email)
    const createdAt = at(profile)
    if (!email || createdAt === null) {
      result.set(id, { state: 'unknown', createdAt: null })
    } else if (isInternalMeasurementEmail(email)) {
      result.set(id, { state: 'internal', createdAt })
    } else if (
      lower(profile?.signup_utm_source) !== contract.source ||
      lower(profile?.signup_utm_medium) !== contract.medium ||
      lower(profile?.signup_utm_campaign) !== contract.campaign
    ) {
      result.set(id, { state: 'wrong_profile_attribution', createdAt })
    } else {
      result.set(id, { state: 'external_exact', createdAt })
    }
  }
  return result
}

function sessionOwner(sessionId, sessionEvents, profiles, generatedAtMs) {
  if (!sessionId) return { state: 'missing_session', userId: null }
  const rows = sessionEvents.filter((row) => text(row?.session_id) === sessionId)
  if (rows.some((row) => text(row?.user_id) && at(row) === null)) {
    return { state: 'identity_clock_unknown', userId: null }
  }
  const datedOwners = rows.filter((row) =>
    text(row?.user_id) && at(row) !== null && at(row) <= generatedAtMs).sort(compare)
  if (datedOwners.length === 0) return { state: 'anonymous_unresolved', userId: null }
  const firstAt = at(datedOwners[0])
  const firstOwners = new Set(datedOwners.filter((row) => at(row) === firstAt).map((row) => text(row?.user_id)))
  if (firstOwners.size !== 1) return { state: 'identity_conflict', userId: null }
  const userId = [...firstOwners][0]
  const profile = profiles.get(userId)
  if (profile?.state !== 'external_exact' || profile.createdAt > generatedAtMs) {
    return {
      state: profile?.state === 'external_exact' ? 'profile_clock_future' : profile?.state ?? 'unknown',
      userId: null,
    }
  }
  if (firstAt < profile.createdAt) return { state: 'owner_before_profile', userId: null }
  const cutoff = Math.min(generatedAtMs, profile.createdAt + AFFILIATE_BUSINESS_OBSERVATION_DAYS * DAY_MS)
  const ownersAsOfCutoff = new Set(datedOwners
    .filter((row) => at(row) <= cutoff)
    .map((row) => text(row?.user_id)))
  if (ownersAsOfCutoff.size !== 1 || !ownersAsOfCutoff.has(userId)) {
    return { state: 'identity_conflict', userId: null }
  }
  return { state: 'external_exact', userId }
}

function affiliateIndex(affiliates, profiles, generatedAtMs) {
  const genericProfiles = new Map()
  for (const profile of profiles) {
    const id = text(profile?.id)
    if (!id) continue
    const rows = genericProfiles.get(id) ?? []
    rows.push(profile)
    genericProfiles.set(id, rows)
  }
  const grouped = new Map()
  for (const affiliate of affiliates) {
    const id = text(affiliate?.id)
    if (!id) continue
    const rows = grouped.get(id) ?? []
    rows.push(affiliate)
    grouped.set(id, rows)
  }
  const valid = new Map()
  for (const [id, rows] of grouped) {
    if (rows.length !== 1) continue
    const row = rows[0]
    const ownerId = text(row?.user_id)
    const ownerRows = ownerId ? (genericProfiles.get(ownerId) ?? []) : []
    const affiliateEmail = lower(row?.email)
    const ownerEmail = ownerRows.length === 1 ? lower(ownerRows[0]?.email) : null
    const ownerCreatedAt = ownerRows.length === 1 ? at(ownerRows[0]) : null
    const createdAt = at(row)
    if (lower(row?.status) === 'active' && affiliateEmail && ownerId && ownerEmail &&
        affiliateEmail === ownerEmail &&
        ownerCreatedAt !== null && ownerCreatedAt <= createdAt &&
        createdAt !== null && createdAt <= generatedAtMs &&
        !isInternalMeasurementEmail(affiliateEmail) && !isInternalMeasurementEmail(ownerEmail)) {
      valid.set(id, { ownerId, createdAt })
    }
  }
  return valid
}

function canonicalReferral(userId, referrals, validAffiliateIds, landingAt, profileAt, cutoff) {
  const rows = referrals.filter((row) => text(row?.referred_user_id) === userId)
  if (rows.length !== 1) return { state: rows.length === 0 ? 'missing_referral' : 'referral_conflict', at: null }
  const row = rows[0]
  const firstTouchAt = Date.parse(String(row?.first_touch_at ?? ''))
  const affiliate = validAffiliateIds.get(text(row?.affiliate_id))
  if (!affiliate || affiliate.ownerId === userId || !['signup', 'paid'].includes(lower(row?.status)) ||
      !Number.isFinite(firstTouchAt) || affiliate.createdAt > firstTouchAt ||
      firstTouchAt < landingAt || firstTouchAt < profileAt || firstTouchAt > cutoff) {
    return { state: 'invalid_referral', at: null }
  }
  return { state: 'exact', at: firstTouchAt }
}

function recurringCandidate(row) {
  return row?.name === 'checkout_started' &&
    (!meta(row, 'sku') || Boolean(meta(row, 'tier')) || Boolean(meta(row, 'billing')))
}

function validRecurring(row) {
  const tier = lower(row?.metadata?.tier)
  const billing = lower(row?.metadata?.billing)
  return recurringCandidate(row) && !meta(row, 'sku') && Boolean(meta(row, 'stripe_session_id')) &&
    RECURRING_TIERS.has(tier) && RECURRING_BILLINGS.has(billing) &&
    (tier !== 'autopilot' || billing === 'monthly')
}

function add(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

function sortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function firstOnOrAfter(rows, boundary, cutoff) {
  const candidates = rows.filter((row) => {
    const when = at(row)
    return when !== null && when >= boundary && when <= cutoff
  }).sort(compare)
  if (candidates.length === 0) return { state: 'missing', row: null }
  const firstAt = at(candidates[0])
  if (candidates.filter((row) => at(row) === firstAt).length !== 1) return { state: 'ambiguous_first', row: null }
  return { state: 'exact', row: candidates[0] }
}

function resolvePackSessions(userId, financial, after, cutoff) {
  const starts = financial.filter((row) =>
    row?.name === 'bulk_checkout_started' && text(row?.user_id) === userId &&
    at(row) !== null && at(row) > after && at(row) <= cutoff)
  const bySession = new Map()
  let invalid = 0
  for (const start of starts) {
    const sessionId = meta(start, 'stripe_session_id')
    if (!sessionId) {
      invalid += 1
      continue
    }
    const rows = bySession.get(sessionId) ?? []
    rows.push(start)
    bySession.set(sessionId, rows)
  }
  const paid = []
  let exactCheckoutSessions = 0
  for (const [sessionId, sessionStarts] of bySession) {
    const allSessionStarts = financial.filter((row) =>
      row?.name === 'bulk_checkout_started' &&
      meta(row, 'stripe_session_id') === sessionId &&
      at(row) !== null && at(row) <= cutoff)
    if (sessionStarts.length !== 1 || allSessionStarts.length !== 1 ||
        text(allSessionStarts[0]?.user_id) !== userId || at(allSessionStarts[0]) <= after) {
      invalid += 1
      continue
    }
    exactCheckoutSessions += 1
    const startAt = at(sessionStarts[0])
    const purchases = financial.filter((row) =>
      row?.name === 'bulk_purchase_completed' &&
      meta(row, 'stripe_session_id') === sessionId &&
      at(row) !== null && at(row) > startAt && at(row) <= cutoff)
    if (purchases.length === 0) continue
    const semantics = new Map()
    for (const row of purchases) {
      semantics.set(JSON.stringify({
        user: text(row?.user_id),
        amount: minor(row),
        currency: lower(row?.metadata?.currency),
      }), row)
    }
    if (semantics.size !== 1) {
      invalid += 1
      continue
    }
    const row = [...semantics.values()][0]
    const amountMinor = minor(row)
    const currency = lower(row?.metadata?.currency)
    if (text(row?.user_id) !== userId || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 ||
        !currency || !/^[a-z]{3}$/.test(currency)) {
      invalid += 1
      continue
    }
    paid.push({ currency, amountMinor })
  }
  return { exactCheckoutSessions, paid, invalid }
}

export function buildAffiliateBusinessSubscriptionReport({
  generatedAt,
  windowStart,
  evidenceEvents,
  sessionEvents,
  financialEvents,
  profiles,
  referrals,
  affiliates,
  contract = AFFILIATE_BUSINESS_CONTRACT,
}) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const windowStartMs = Date.parse(String(windowStart ?? ''))
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  if (![evidenceEvents, sessionEvents, financialEvents, profiles, referrals, affiliates].every(Array.isArray)) {
    throw new Error('all report inputs must be arrays')
  }

  const identity = profileIndex(profiles, contract)
  const validAffiliateIds = affiliateIndex(affiliates, profiles, generatedAtMs)
  const bounded = evidenceEvents.filter((row) => {
    const when = at(row)
    return when !== null && when >= windowStartMs && when <= generatedAtMs
  }).sort(compare)
  const rawLandings = bounded.filter((row) => row?.name === 'affiliate_landing_context_viewed')
  const rawPlans = bounded.filter((row) => row?.name === 'business_content_plan_generated')
  const exactLandings = rawLandings.filter((row) => exactLanding(row, contract))
  const landingSessions = new Set(exactLandings.map((row) => text(row?.session_id)).filter(Boolean))
  const resolutionStates = new Map()
  const anchored = []

  for (const sessionId of landingSessions) {
    const landings = exactLandings.filter((row) => text(row?.session_id) === sessionId).sort(compare)
    const landing = landings[0]
    const landingAt = at(landing)
    if (evidenceEvents.some((row) =>
      AFFILIATE_BUSINESS_EVIDENCE_NAMES.includes(row?.name) &&
      text(row?.session_id) === sessionId && at(row) === null)) {
      add(resolutionStates, 'undatable_session_evidence')
      continue
    }
    const followingPlans = rawPlans.filter((row) =>
      text(row?.session_id) === sessionId && at(row) !== null && at(row) >= landingAt).sort(compare)
    if (followingPlans.length === 0) {
      add(resolutionStates, 'missing_plan')
      continue
    }
    const firstAt = at(followingPlans[0])
    const firstRows = followingPlans.filter((row) => at(row) === firstAt)
    if (firstRows.length !== 1) {
      add(resolutionStates, 'ambiguous_first_plan')
      continue
    }
    if (firstAt === landingAt) {
      add(resolutionStates, 'plan_not_after_landing')
      continue
    }
    const plan = firstRows[0]
    if (!exactPlan(plan, contract)) {
      add(resolutionStates, 'first_plan_contract_invalid')
      continue
    }
    const owner = sessionOwner(sessionId, sessionEvents, identity, generatedAtMs)
    if (owner.state !== 'external_exact') {
      add(resolutionStates, owner.state)
      continue
    }
    const explicitOwner = text(plan?.user_id)
    if (explicitOwner && explicitOwner !== owner.userId) {
      add(resolutionStates, 'plan_owner_conflict')
      continue
    }
    const profileAt = identity.get(owner.userId).createdAt
    const cutoff = profileAt + AFFILIATE_BUSINESS_OBSERVATION_DAYS * DAY_MS
    if (profileAt < landingAt || profileAt > generatedAtMs || firstAt > cutoff ||
        (explicitOwner && firstAt <= profileAt) || (!explicitOwner && firstAt === profileAt)) {
      add(resolutionStates, 'profile_plan_timeline_invalid')
      continue
    }
    const referral = canonicalReferral(
      owner.userId,
      referrals,
      validAffiliateIds,
      landingAt,
      profileAt,
      Math.min(cutoff, generatedAtMs),
    )
    if (referral.state !== 'exact') {
      add(resolutionStates, referral.state)
      continue
    }
    add(resolutionStates, 'external_exact')
    anchored.push({
      userId: owner.userId,
      planAt: firstAt,
      profileAt,
      referralAt: referral.at,
      cutoff,
    })
  }

  const byUser = new Map()
  for (const row of anchored) {
    const rows = byUser.get(row.userId) ?? []
    rows.push(row)
    byUser.set(row.userId, rows)
  }
  const qualified = []
  let ambiguousFirstPlanPeople = 0
  for (const rows of byUser.values()) {
    rows.sort((left, right) => left.planAt - right.planAt)
    if (rows.filter((row) => row.planAt === rows[0].planAt).length !== 1) {
      ambiguousFirstPlanPeople += 1
      continue
    }
    qualified.push(rows[0])
  }

  const financial = financialEvents.filter((row) => at(row) !== null && at(row) <= generatedAtMs).sort(compare)
  const globalLedger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: '1970-01-01T00:00:00.000Z',
    events: financial.filter((row) => row?.name === 'checkout_started' || row?.name === 'payment_success'),
    profiles,
  })
  const subscriptionRevenue = new Map()
  const packRevenue = new Map()
  const outcomes = []
  const diagnostics = {
    preexistingSubscriberPeople: 0,
    preexistingRecurringIntentPeople: 0,
    preexistingSubscriptionUnknownPeople: 0,
    firstRecurringInvalidPeople: 0,
    ambiguousFirstRecurringPeople: 0,
    unresolvedRecurringLedgerPeople: 0,
    invalidRecurringPaymentPeople: 0,
    packDataQualityPeople: 0,
    undatableRelevantRows: 0,
    linkedUndatableFinancialPeople: 0,
  }

  for (const row of evidenceEvents.concat(financialEvents)) {
    if ((AFFILIATE_BUSINESS_EVIDENCE_NAMES.includes(row?.name) ||
        AFFILIATE_BUSINESS_FINANCIAL_NAMES.includes(row?.name)) && at(row) === null) {
      diagnostics.undatableRelevantRows += 1
    }
  }

  for (const person of qualified) {
    const anchor = Math.max(person.planAt, person.profileAt, person.referralAt)
    const mature = person.cutoff <= generatedAtMs
    const preexisting = globalLedger.records.some((record) =>
      record.status === 'paid' && record.ownerClass === 'external' &&
      record.ownerUserId === person.userId &&
      Date.parse(String(record.startedAt ?? '')) < person.planAt)
    if (preexisting) {
      diagnostics.preexistingSubscriberPeople += 1
      continue
    }
    const preexistingRecurringIntent = financial.some((candidate) =>
      text(candidate?.user_id) === person.userId &&
      recurringCandidate(candidate) &&
      at(candidate) <= anchor)
    if (preexistingRecurringIntent) {
      diagnostics.preexistingRecurringIntentPeople += 1
      continue
    }
    const priorRawSubscriptionPayment = financial.some((candidate) =>
      candidate?.name === 'payment_success' &&
      text(candidate?.user_id) === person.userId &&
      lower(candidate?.metadata?.checkout_mode) === 'subscription' &&
      at(candidate) <= anchor)
    if (priorRawSubscriptionPayment) {
      diagnostics.preexistingSubscriptionUnknownPeople += 1
      continue
    }
    const linkedNullFinancial = financialEvents.some((candidate) =>
      AFFILIATE_BUSINESS_FINANCIAL_NAMES.includes(candidate?.name) &&
      at(candidate) === null && text(candidate?.user_id) === person.userId)
    if (linkedNullFinancial) {
      diagnostics.linkedUndatableFinancialPeople += 1
      continue
    }
    const rawRecurring = financial.filter((candidate) =>
      text(candidate?.user_id) === person.userId && recurringCandidate(candidate))
    const first = firstOnOrAfter(rawRecurring, person.planAt, person.cutoff)
    const firstCandidateAt = first.state === 'exact' ? at(first.row) : (() => {
      const dated = rawRecurring
        .map((candidate) => at(candidate))
        .filter((candidateAt) => candidateAt !== null && candidateAt >= person.planAt && candidateAt <= person.cutoff)
      return dated.length > 0 ? Math.min(...dated) : null
    })()
    const rawPaymentBeforeCanonicalStart = financial.some((candidate) => {
      const candidateAt = at(candidate)
      return candidate?.name === 'payment_success' &&
        text(candidate?.user_id) === person.userId &&
        lower(candidate?.metadata?.checkout_mode) === 'subscription' &&
        candidateAt > anchor && candidateAt <= person.cutoff &&
        (firstCandidateAt === null || candidateAt <= firstCandidateAt)
    })
    if (rawPaymentBeforeCanonicalStart) {
      diagnostics.preexistingSubscriptionUnknownPeople += 1
      continue
    }
    let recurringCheckout = false
    let paid = null
    if (first.state === 'ambiguous_first') {
      diagnostics.ambiguousFirstRecurringPeople += 1
    } else if (first.state === 'exact') {
      if (at(first.row) <= anchor || !validRecurring(first.row)) {
        diagnostics.firstRecurringInvalidPeople += 1
      } else {
        const sessionId = meta(first.row, 'stripe_session_id')
        const undatableSameStripeSession = financialEvents.some((candidate) =>
          AFFILIATE_BUSINESS_FINANCIAL_NAMES.includes(candidate?.name) &&
          at(candidate) === null && meta(candidate, 'stripe_session_id') === sessionId)
        if (undatableSameStripeSession) {
          diagnostics.linkedUndatableFinancialPeople += 1
          outcomes.push({
            mature,
            recurringCheckout: false,
            paid: null,
            packCheckoutSessions: 0,
            packPaidSessions: 0,
          })
          continue
        }
        const scopedLedger = buildSubscriptionRevenueLedger({
          generatedAt: new Date(person.cutoff).toISOString(),
          windowStart: new Date(anchor).toISOString(),
          events: financial.filter((candidate) =>
            (candidate?.name === 'checkout_started' || candidate?.name === 'payment_success') &&
            at(candidate) <= person.cutoff),
          profiles,
        })
        const record = scopedLedger.records.find((candidate) => candidate.stripeSessionId === sessionId)
        if (!record || !['paid', 'unpaid'].includes(record.status) ||
            record.ownerClass !== 'external' || record.ownerUserId !== person.userId) {
          diagnostics.unresolvedRecurringLedgerPeople += 1
        } else {
          recurringCheckout = true
          if (record.status === 'paid') {
            const paidAt = Date.parse(String(record.paidAt ?? ''))
            if (!Number.isFinite(paidAt) || paidAt <= at(first.row) || paidAt > person.cutoff ||
                !Number.isSafeInteger(record.amountMinor) || record.amountMinor <= 0 ||
                !record.currency || !/^[a-z]{3}$/.test(record.currency)) {
              diagnostics.invalidRecurringPaymentPeople += 1
              recurringCheckout = false
            } else {
              paid = { amountMinor: record.amountMinor, currency: record.currency }
              add(subscriptionRevenue, record.currency, record.amountMinor)
            }
          }
        }
      }
    }
    const packs = resolvePackSessions(person.userId, financial, anchor, person.cutoff)
    if (packs.invalid > 0) diagnostics.packDataQualityPeople += 1
    for (const purchase of packs.paid) add(packRevenue, purchase.currency, purchase.amountMinor)
    outcomes.push({
      mature,
      recurringCheckout,
      paid,
      packCheckoutSessions: packs.exactCheckoutSessions,
      packPaidSessions: packs.paid.length,
    })
  }

  const maturePeople = outcomes.filter((row) => row.mature).length
  const candidateQualityBlocked = ambiguousFirstPlanPeople > 0 ||
    ['ambiguous_first_plan', 'identity_conflict', 'identity_clock_unknown',
      'owner_before_profile', 'profile_clock_future', 'plan_not_after_landing',
      'plan_owner_conflict', 'undatable_session_evidence', 'profile_plan_timeline_invalid',
      'referral_conflict'].some((state) => (resolutionStates.get(state) ?? 0) > 0) ||
    diagnostics.preexistingSubscriptionUnknownPeople > 0 ||
    diagnostics.linkedUndatableFinancialPeople > 0 ||
    diagnostics.firstRecurringInvalidPeople > 0 ||
    diagnostics.ambiguousFirstRecurringPeople > 0 ||
    diagnostics.unresolvedRecurringLedgerPeople > 0 ||
    diagnostics.invalidRecurringPaymentPeople > 0 ||
    diagnostics.packDataQualityPeople > 0
  const sampleReady = maturePeople >= AFFILIATE_BUSINESS_MIN_MATURE_PEOPLE
  const firstExactRecurringStripeSessionObserved = outcomes.some((row) => row.recurringCheckout)
  return {
    schemaVersion: AFFILIATE_BUSINESS_SUBSCRIPTION_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: new Date(windowStartMs).toISOString(),
    attributionLabel: 'campaign_assist_not_protected_click_attribution',
    contract: {
      source: contract.source,
      medium: contract.medium,
      campaign: contract.campaign,
      entry: contract.entry,
    },
    funnel: {
      exactLandingBrowserSessions: landingSessions.size,
      qualifiedExternalPeople: qualified.length,
      eligibleNonSubscriberPeople: outcomes.length,
      matureQualifiedExternalPeople: maturePeople,
      recurringCheckoutPeople: outcomes.filter((row) => row.recurringCheckout).length,
      recurringCheckoutStripeSessions: outcomes.filter((row) => row.recurringCheckout).length,
      exactSubscriptionPaidPeople: outcomes.filter((row) => row.paid).length,
      exactSubscriptionPaidStripeSessions: outcomes.filter((row) => row.paid).length,
      subscriptionRevenueMinorByCurrency: sortedObject(subscriptionRevenue),
      oneTimePackCheckoutPeople: outcomes.filter((row) => row.packCheckoutSessions > 0).length,
      oneTimePackCheckoutStripeSessions: outcomes.reduce((sum, row) => sum + row.packCheckoutSessions, 0),
      oneTimePackPaidPeople: outcomes.filter((row) => row.packPaidSessions > 0).length,
      oneTimePackPaidStripeSessions: outcomes.reduce((sum, row) => sum + row.packPaidSessions, 0),
      oneTimePackRevenueMinorByCurrency: sortedObject(packRevenue),
    },
    exclusionsAndDiagnostics: {
      rawLandingRows: rawLandings.length,
      rawPlanRows: rawPlans.length,
      invalidLandingRows: rawLandings.length - exactLandings.length,
      browserSessionsByResolutionState: sortedObject(resolutionStates),
      ambiguousFirstPlanPeople,
      ...diagnostics,
    },
    gate: {
      state: candidateQualityBlocked
        ? 'blocked_data_quality'
        : firstExactRecurringStripeSessionObserved
          ? 'ready_for_reconciliation'
          : sampleReady
            ? 'ready_for_hypothesis_review'
            : 'collecting',
      minimumMatureQualifiedExternalPeople: AFFILIATE_BUSINESS_MIN_MATURE_PEOPLE,
      observationDays: AFFILIATE_BUSINESS_OBSERVATION_DAYS,
      matureQualifiedExternalPeople: maturePeople,
      eachPersonUsesImmutableProfileCreatedAtCutoff: true,
      firstExactRecurringStripeSessionObserved,
      neverAuthorizesCausalClaimOrProductChange: true,
    },
    note: 'This is a conservative temporal campaign assist, never causal attribution. A canonical referral row proves referral linkage, not payment. Anonymous continuation resolves only from a complete browser-session inventory with exactly one external owner. Recurring and one-time Stripe Sessions remain separate. No IDs, emails or raw Session references are emitted.',
  }
}
