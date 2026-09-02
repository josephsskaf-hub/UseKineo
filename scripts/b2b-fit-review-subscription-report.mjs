import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const B2B_FIT_REVIEW_SUBSCRIPTION_VERSION = 'b2b_fit_review_subscription_v1'
export const B2B_FIT_REVIEW_WINDOW_DAYS = 30
export const B2B_FIT_REVIEW_OBSERVATION_DAYS = 7
export const B2B_FIT_REVIEW_MIN_RESOLVED_PEOPLE = 5
export const B2B_FIT_REVIEW_EVENT_NAMES = Object.freeze([
  'b2b_brief_viewed',
  'b2b_brief_submitted',
])
export const B2B_FIT_REVIEW_ALLOWED_VOLUMES = Object.freeze(['10_19', '20_49', '50_99', '100_plus'])

const DAY_MS = 86_400_000
export const B2B_FIT_REVIEW_CONTRACT = Object.freeze({
  version: 'b2b_brief_v1_2026_08_28',
  surface: 'ai_shorts_for_agencies',
  entryCampaign: 'b2b_volume_fit_review_v1',
  entrySource: 'kineo_facts',
  entryMedium: 'answer_engine',
})
const CONTRACT = B2B_FIT_REVIEW_CONTRACT
const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])
const VOLUMES = new Set(B2B_FIT_REVIEW_ALLOWED_VOLUMES)

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
  return { classification, profilesWithoutClock: profiles.filter((row) => timestamp(row) === null).length }
}

function exactAttribution(row) {
  return metadataString(row, 'version') === CONTRACT.version &&
    metadataString(row, 'surface') === CONTRACT.surface &&
    metadataString(row, 'entry_campaign') === CONTRACT.entryCampaign &&
    metadataString(row, 'entry_source') === CONTRACT.entrySource &&
    metadataString(row, 'entry_medium') === CONTRACT.entryMedium
}

function exactView(row) {
  return row?.name === 'b2b_brief_viewed' && exactAttribution(row)
}

function exactSubmit(row) {
  return row?.name === 'b2b_brief_submitted' && exactAttribution(row) &&
    VOLUMES.has(metadataString(row, 'monthly_volume'))
}

function resolveSessionOwner(sessionId, sessionEvents, identity) {
  if (!sessionId) return { state: 'missing_session', userId: null }
  const ids = new Set(sessionEvents
    .filter((row) => text(row?.session_id) === sessionId)
    .map((row) => text(row?.user_id))
    .filter(Boolean))
  if (ids.size === 0) return { state: 'anonymous_unresolved', userId: null }
  if (ids.size > 1) return { state: 'identity_conflict', userId: null }
  const userId = [...ids][0]
  const actorClass = identity.classification.get(userId) ?? 'unknown'
  return { state: actorClass, userId: actorClass === 'external' ? userId : null }
}

function validRecurringStart(row) {
  const tier = metadataString(row, 'tier')
  const billing = metadataString(row, 'billing')
  return row?.name === 'checkout_started' &&
    !metadataString(row, 'sku') &&
    Boolean(metadataString(row, 'stripe_session_id')) &&
    RECURRING_TIERS.has(tier) &&
    RECURRING_BILLING.has(billing) &&
    (tier !== 'autopilot' || billing === 'monthly')
}

function recurringCandidate(row) {
  return row?.name === 'checkout_started' && !metadataString(row, 'sku') &&
    Boolean(metadataString(row, 'stripe_session_id'))
}

function add(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

function addSession(map, state, sessionId, rowId) {
  const values = map.get(state) ?? new Set()
  values.add(sessionId ?? `missing:${String(rowId ?? values.size)}`)
  map.set(state, values)
}

function sortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function emptyVolume() {
  return {
    resolvedSubmitPeople: 0,
    matureResolvedSubmitPeople: 0,
    checkoutPeople: 0,
    checkoutStripeSessions: 0,
    paidPeople: 0,
    paidStripeSessions: 0,
    revenueMinorByCurrency: {},
  }
}

export function buildB2bFitReviewSubscriptionReport({
  generatedAt,
  windowStart,
  evidenceEvents,
  sessionEvents,
  financialEvents,
  profiles,
}) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const windowStartMs = Date.parse(String(windowStart ?? ''))
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  if (![evidenceEvents, sessionEvents, financialEvents, profiles].every(Array.isArray)) {
    throw new Error('evidenceEvents, sessionEvents, financialEvents and profiles must be arrays')
  }

  const observationMs = B2B_FIT_REVIEW_OBSERVATION_DAYS * DAY_MS
  const matureBeforeMs = generatedAtMs - observationMs
  const identity = identityIndex(profiles)
  const boundedEvidence = evidenceEvents
    .filter((row) => {
      const at = timestamp(row)
      return at !== null && at >= windowStartMs && at <= generatedAtMs
    })
    .sort(compareRows)
  const rawViews = boundedEvidence.filter((row) => row?.name === 'b2b_brief_viewed')
  const rawSubmits = boundedEvidence.filter((row) => row?.name === 'b2b_brief_submitted')
  const exactViews = rawViews.filter(exactView)
  const exactSubmits = rawSubmits.filter(exactSubmit)
  const undatableEvidence = evidenceEvents.filter((row) =>
    B2B_FIT_REVIEW_EVENT_NAMES.includes(row?.name) && timestamp(row) === null,
  )

  const viewSessions = new Set(exactViews.map((row) => text(row?.session_id)).filter(Boolean))
  const ownerStateSessions = new Map()
  const anchored = []
  for (const submit of exactSubmits) {
    const sessionId = text(submit?.session_id)
    const submitAt = timestamp(submit)
    if (!sessionId || !viewSessions.has(sessionId)) {
      addSession(ownerStateSessions, 'missing_prior_view', sessionId, submit?.id)
      continue
    }
    const priorViews = exactViews.filter((row) => text(row?.session_id) === sessionId && timestamp(row) < submitAt)
    if (priorViews.length === 0) {
      addSession(ownerStateSessions, 'view_after_submit', sessionId, submit?.id)
      continue
    }
    const owner = resolveSessionOwner(sessionId, sessionEvents, identity)
    if (owner.state !== 'external') {
      addSession(ownerStateSessions, owner.state, sessionId, submit?.id)
      continue
    }
    const explicitUser = text(submit?.user_id)
    if (explicitUser && explicitUser !== owner.userId) {
      addSession(ownerStateSessions, 'submit_owner_conflict', sessionId, submit?.id)
      continue
    }
    addSession(ownerStateSessions, 'external', sessionId, submit?.id)
    anchored.push({
      userId: owner.userId,
      sessionId,
      submitAt,
      volume: metadataString(submit, 'monthly_volume'),
    })
  }

  const submissionsByUser = new Map()
  for (const row of anchored) {
    const rows = submissionsByUser.get(row.userId) ?? []
    rows.push(row)
    submissionsByUser.set(row.userId, rows)
  }

  const firstSubmissions = []
  const ambiguousFirstSubmitPeople = new Set()
  for (const [userId, rows] of submissionsByUser) {
    rows.sort((left, right) => left.submitAt - right.submitAt || left.volume.localeCompare(right.volume))
    const tied = rows.filter((row) => row.submitAt === rows[0].submitAt)
    if (tied.length !== 1) {
      ambiguousFirstSubmitPeople.add(userId)
      continue
    }
    firstSubmissions.push(rows[0])
  }

  const firstSubmissionUsers = new Set(firstSubmissions.map((row) => row.userId))
  const firstSubmissionSessions = new Set(firstSubmissions.map((row) => row.sessionId))
  const undatableFinancialPeople = new Set()
  for (const row of financialEvents) {
    if (timestamp(row) !== null || (row?.name !== 'checkout_started' && row?.name !== 'payment_success')) continue
    const userId = text(row?.user_id)
    const sessionId = text(row?.session_id)
    if (userId && firstSubmissionUsers.has(userId)) undatableFinancialPeople.add(userId)
    else if (sessionId && firstSubmissionSessions.has(sessionId)) {
      const submission = firstSubmissions.find((candidate) => candidate.sessionId === sessionId)
      if (submission) undatableFinancialPeople.add(submission.userId)
    }
  }

  const undatableExternalEvidencePeople = new Set()
  for (const row of undatableEvidence) {
    if (!exactAttribution(row)) continue
    const owner = resolveSessionOwner(text(row?.session_id), sessionEvents, identity)
    if (owner.state === 'external') undatableExternalEvidencePeople.add(owner.userId)
  }

  const allFinancial = financialEvents
    .filter((row) => timestamp(row) !== null && timestamp(row) <= generatedAtMs)
    .sort(compareRows)
  const ledger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: '1970-01-01T00:00:00.000Z',
    events: allFinancial,
    profiles,
  })
  const preexistingExactSubscribers = new Set()
  const preexistingSubscriptionStartedBeforeSubmit = new Set()
  const preexistingSubscriptionUnknown = new Set()
  const unresolvedCheckoutPeople = new Set()
  const ambiguousFirstCheckoutPeople = new Set()
  const invalidPaidPeople = new Set()
  const cohort = []

  for (const submission of firstSubmissions) {
    const priorExactPaid = ledger.records.some((record) =>
      record.status === 'paid' && record.ownerClass === 'external' &&
      record.ownerUserId === submission.userId && (
        timestamp({ created_at: record.paidAt }) < submission.submitAt ||
        timestamp({ created_at: record.startedAt }) < submission.submitAt
      ),
    )
    const priorRawPayment = allFinancial.some((row) =>
      row?.name === 'payment_success' && row?.user_id === submission.userId &&
      metadataString(row, 'checkout_mode') === 'subscription' && timestamp(row) < submission.submitAt,
    )
    if (priorExactPaid) {
      preexistingExactSubscribers.add(submission.userId)
      if (ledger.records.some((record) =>
        record.status === 'paid' && record.ownerClass === 'external' &&
        record.ownerUserId === submission.userId &&
        timestamp({ created_at: record.startedAt }) < submission.submitAt &&
        timestamp({ created_at: record.paidAt }) >= submission.submitAt,
      )) preexistingSubscriptionStartedBeforeSubmit.add(submission.userId)
      continue
    }
    if (priorRawPayment) {
      preexistingSubscriptionUnknown.add(submission.userId)
      continue
    }

    const cutoff = Math.min(generatedAtMs, submission.submitAt + observationMs)
    const rawCandidates = allFinancial.filter((row) =>
      row?.user_id === submission.userId && recurringCandidate(row) &&
      timestamp(row) > submission.submitAt && timestamp(row) <= cutoff,
    )
    const valid = rawCandidates.filter(validRecurringStart)
    if (rawCandidates.length > 0 && (valid.length === 0 ||
        (!validRecurringStart(rawCandidates[0]) && timestamp(rawCandidates[0]) <= timestamp(valid[0])))) {
      unresolvedCheckoutPeople.add(submission.userId)
      cohort.push({ ...submission, mature: submission.submitAt <= matureBeforeMs, checkout: null, paid: null })
      continue
    }
    if (valid.length === 0) {
      cohort.push({ ...submission, mature: submission.submitAt <= matureBeforeMs, checkout: null, paid: null })
      continue
    }
    valid.sort(compareRows)
    const firstAt = timestamp(valid[0])
    const tied = valid.filter((row) => timestamp(row) === firstAt)
    if (new Set(tied.map((row) => metadataString(row, 'stripe_session_id'))).size !== 1) {
      ambiguousFirstCheckoutPeople.add(submission.userId)
      cohort.push({ ...submission, mature: submission.submitAt <= matureBeforeMs, checkout: null, paid: null })
      continue
    }
    const sessionId = metadataString(valid[0], 'stripe_session_id')
    const scopedLedger = buildSubscriptionRevenueLedger({
      generatedAt: new Date(cutoff).toISOString(),
      windowStart: new Date(submission.submitAt).toISOString(),
      events: allFinancial.filter((row) => timestamp(row) <= cutoff),
      profiles,
    })
    const record = scopedLedger.records.find((row) => row.stripeSessionId === sessionId)
    let paid = null
    let exactCheckout = false
    if (!record) {
      unresolvedCheckoutPeople.add(submission.userId)
    } else if (record.status === 'paid') {
      const paidAt = Date.parse(String(record.paidAt ?? ''))
      if (record.ownerClass !== 'external' || record.ownerUserId !== submission.userId ||
          !Number.isFinite(paidAt) || paidAt < firstAt || paidAt > cutoff ||
          !Number.isSafeInteger(record.amountMinor) || record.amountMinor <= 0 || !record.currency) {
        invalidPaidPeople.add(submission.userId)
      } else {
        exactCheckout = true
        paid = { amountMinor: record.amountMinor, currency: record.currency }
      }
    } else if (record.status === 'unpaid' && record.ownerClass === 'external' && record.ownerUserId === submission.userId) {
      exactCheckout = true
    } else {
      unresolvedCheckoutPeople.add(submission.userId)
    }
    cohort.push({ ...submission, mature: submission.submitAt <= matureBeforeMs, checkout: exactCheckout, paid })
  }

  const revenue = new Map()
  const byVolume = Object.fromEntries(B2B_FIT_REVIEW_ALLOWED_VOLUMES.map((volume) => [volume, emptyVolume()]))
  for (const row of cohort) {
    const bucket = byVolume[row.volume]
    bucket.resolvedSubmitPeople += 1
    if (row.mature) bucket.matureResolvedSubmitPeople += 1
    if (row.checkout) {
      bucket.checkoutPeople += 1
      bucket.checkoutStripeSessions += 1
    }
    if (row.paid) {
      bucket.paidPeople += 1
      bucket.paidStripeSessions += 1
      bucket.revenueMinorByCurrency[row.paid.currency] =
        (bucket.revenueMinorByCurrency[row.paid.currency] ?? 0) + row.paid.amountMinor
      add(revenue, row.paid.currency, row.paid.amountMinor)
    }
  }

  const matureResolved = cohort.filter((row) => row.mature)
  const paid = cohort.filter((row) => row.paid)
  const qualityBlocked = undatableExternalEvidencePeople.size > 0 || undatableFinancialPeople.size > 0 ||
    ambiguousFirstSubmitPeople.size > 0 ||
    preexistingSubscriptionUnknown.size > 0 || unresolvedCheckoutPeople.size > 0 ||
    ambiguousFirstCheckoutPeople.size > 0 || invalidPaidPeople.size > 0
  const oldestResolvedAt = cohort.length > 0 ? Math.min(...cohort.map((row) => row.submitAt)) : null
  const hasCompleteObservation = oldestResolvedAt !== null && oldestResolvedAt <= matureBeforeMs
  const sampleReady = cohort.length >= B2B_FIT_REVIEW_MIN_RESOLVED_PEOPLE && hasCompleteObservation
  const gateState = qualityBlocked ? 'blocked_data_quality' : sampleReady ? 'ready_for_assist_review' : 'collecting'

  return {
    schemaVersion: B2B_FIT_REVIEW_SUBSCRIPTION_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    windowStart: new Date(windowStartMs).toISOString(),
    attributionLabel: 'temporal_assist_not_causal_attribution',
    funnel: {
      exactViewBrowserSessions: viewSessions.size,
      exactSubmitBrowserSessions: new Set(exactSubmits.map((row) => text(row?.session_id)).filter(Boolean)).size,
      anchoredSubmitBrowserSessions: new Set(anchored.map((row) => row.sessionId)).size,
      resolvedExternalSubmitPeople: firstSubmissions.length,
      eligibleNonSubscriberSubmitPeople: cohort.length,
      matureResolvedExternalSubmitPeople: matureResolved.length,
      recurringCheckoutPeople: cohort.filter((row) => row.checkout).length,
      recurringCheckoutStripeSessions: cohort.filter((row) => row.checkout).length,
      exactPaidPeople: paid.length,
      exactPaidStripeSessions: paid.length,
      exactRevenueMinorByCurrency: sortedObject(revenue),
      byMonthlyVolume: byVolume,
    },
    exclusionsAndDiagnostics: {
      rawViewRows: rawViews.length,
      rawSubmitRows: rawSubmits.length,
      invalidContractViewRows: rawViews.length - exactViews.length,
      invalidContractSubmitRows: rawSubmits.length - exactSubmits.length,
      undatableEvidenceRows: undatableEvidence.length,
      submitBrowserSessionsByOwnerState: sortedObject(new Map(
        [...ownerStateSessions].map(([state, sessions]) => [state, sessions.size]),
      )),
      ambiguousFirstSubmitPeople: ambiguousFirstSubmitPeople.size,
      preexistingExactSubscriberPeople: preexistingExactSubscribers.size,
      preexistingSubscriptionStartedBeforeSubmitPeople: preexistingSubscriptionStartedBeforeSubmit.size,
      preexistingSubscriptionUnknownPeople: preexistingSubscriptionUnknown.size,
      unresolvedCheckoutPeople: unresolvedCheckoutPeople.size,
      ambiguousFirstCheckoutPeople: ambiguousFirstCheckoutPeople.size,
      invalidPaidPeople: invalidPaidPeople.size,
      undatableExternalEvidencePeople: undatableExternalEvidencePeople.size,
      undatableFinancialPeople: undatableFinancialPeople.size,
      profilesWithoutClock: identity.profilesWithoutClock,
    },
    gate: {
      state: gateState,
      minimumResolvedExternalSubmitPeople: B2B_FIT_REVIEW_MIN_RESOLVED_PEOPLE,
      observationDays: B2B_FIT_REVIEW_OBSERVATION_DAYS,
      resolvedExternalSubmitPeople: firstSubmissions.length,
      eligibleNonSubscriberSubmitPeople: cohort.length,
      hasAtLeastOneCompleteObservationWindow: hasCompleteObservation,
      earlyDiagnosisAllowedAfterFirstRecurringStripeSession: true,
      neverAuthorizesProductChange: true,
    },
    note: 'Counts external people and exact recurring Stripe Sessions. Anonymous evidence resolves only when the complete browser-session inventory has exactly one external owner. Revenue requires the same owner and exact Stripe Session. No IDs, emails or raw Session references are emitted.',
  }
}
