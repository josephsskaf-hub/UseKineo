import { createHash } from 'node:crypto'
import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const SUBSCRIPTION_SESSION_OUTCOME_VERSION = 'subscription_session_outcome_v1'
export const SUBSCRIPTION_SESSION_OUTCOME_WINDOW_DAYS = 30

export const SUBSCRIPTION_SESSION_OUTCOME_EVENTS = Object.freeze([
  'checkout_started',
  'payment_success',
  'checkout_session_expired',
  'checkout_payment_failed',
  'checkout_payment_failure_enriched',
  'checkout_cancelled',
  'checkout_resume_banner_clicked',
  'checkout_resume_choice_viewed',
])

const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])

function timestamp(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function metadataString(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function metadataNumber(row, key) {
  const value = row?.metadata?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim())) return Number(value)
  return null
}

function identityIndex(profiles) {
  const external = new Set()
  const internal = new Set()
  const unknown = new Set()
  for (const profile of profiles) {
    if (!profile?.id) continue
    const email = String(profile.email ?? '').trim()
    if (!email) unknown.add(profile.id)
    else if (isInternalMeasurementEmail(email)) internal.add(profile.id)
    else external.add(profile.id)
  }
  return { external, internal, unknown }
}

function actorClass(row, identity) {
  if (!row?.user_id) return 'anonymous'
  if (identity.external.has(row.user_id)) return 'external'
  if (identity.internal.has(row.user_id)) return 'internal'
  return 'unknown_identified'
}

function validRecurringStart(row) {
  const tier = metadataString(row, 'tier')
  const billing = metadataString(row, 'billing')
  if (row?.name !== 'checkout_started' || metadataString(row, 'sku')) return false
  if (!metadataString(row, 'stripe_session_id')) return false
  if (!RECURRING_TIERS.has(tier) || !RECURRING_BILLING.has(billing)) return false
  return tier !== 'autopilot' || billing === 'monthly'
}

function resolveExternalStarts(events, identity, generatedAtMs) {
  const grouped = new Map()
  let invalidExternalRows = 0
  for (const row of events) {
    const at = timestamp(row)
    if (row?.name !== 'checkout_started' || at === null || at > generatedAtMs) continue
    const ownerClass = actorClass(row, identity)
    if (!validRecurringStart(row)) {
      if (ownerClass === 'external' && !metadataString(row, 'sku')) invalidExternalRows += 1
      continue
    }
    const stripeSessionId = metadataString(row, 'stripe_session_id')
    const rows = grouped.get(stripeSessionId) ?? []
    rows.push({ row, ownerClass })
    grouped.set(stripeSessionId, rows)
  }

  const starts = []
  let conflicts = 0
  let duplicateRows = 0
  for (const [stripeSessionId, rows] of grouped.entries()) {
    duplicateRows += Math.max(0, rows.length - 1)
    const semantics = new Set(rows.map(({ row, ownerClass }) => JSON.stringify({
      ownerClass,
      userId: row.user_id,
      tier: metadataString(row, 'tier'),
      billing: metadataString(row, 'billing'),
    })))
    if (semantics.size !== 1) {
      conflicts += 1
      continue
    }
    const first = [...rows].sort((left, right) => timestamp(left.row) - timestamp(right.row))[0]
    if (first.ownerClass !== 'external') continue
    starts.push({ stripeSessionId, row: first.row })
  }
  return { starts, conflicts, duplicateRows, invalidExternalRows }
}

function expirationIndex(events, generatedAtMs) {
  const grouped = new Map()
  let rowsWithoutStripeSession = 0
  for (const row of events) {
    const at = timestamp(row)
    if (row?.name !== 'checkout_session_expired' || at === null || at > generatedAtMs) continue
    const stripeSessionId = metadataString(row, 'stripe_session_id')
    if (!stripeSessionId) {
      rowsWithoutStripeSession += 1
      continue
    }
    const rows = grouped.get(stripeSessionId) ?? []
    rows.push(row)
    grouped.set(stripeSessionId, rows)
  }
  return { grouped, rowsWithoutStripeSession }
}

function expirationState(rows, start, identity) {
  if (!rows?.length) return { state: 'none', duplicateRows: 0 }
  const semantics = new Set(rows.map((row) => JSON.stringify({
    userId: row.user_id ?? null,
    ownerClass: actorClass(row, identity),
    checkoutMode: metadataString(row, 'checkout_mode'),
    tier: metadataString(row, 'tier'),
    billing: metadataString(row, 'billing'),
    paymentStatus: metadataString(row, 'payment_status'),
  })))
  const foreignOwner = rows.some((row) => row.user_id && row.user_id !== start.user_id)
  const wrongProduct = rows.some((row) => {
    const mode = metadataString(row, 'checkout_mode')
    return mode && mode !== 'subscription'
  })
  if (semantics.size > 1 || foreignOwner || wrongProduct) {
    return { state: 'conflict', duplicateRows: Math.max(0, rows.length - 1) }
  }
  const paymentStatus = metadataString(rows[0], 'payment_status')
  if (paymentStatus === 'unpaid') return { state: 'expired_unpaid', duplicateRows: Math.max(0, rows.length - 1) }
  if (paymentStatus === 'no_payment_required') return { state: 'expired_no_payment_required', duplicateRows: Math.max(0, rows.length - 1) }
  return { state: 'expired_unknown_payment_status', duplicateRows: Math.max(0, rows.length - 1) }
}

function sessionReference(stripeSessionId) {
  return createHash('sha256').update(stripeSessionId).digest('hex').slice(0, 12)
}

function resolveOutcome(start, ledgerRecord, expirationRows, identity, generatedAtMs) {
  const startedAtMs = timestamp(start.row)
  const expiry = expirationState(expirationRows, start.row, identity)
  let outcome
  let reason
  if (!ledgerRecord || ledgerRecord.ownerClass !== 'external' || ledgerRecord.ownerUserId !== start.row.user_id) {
    outcome = 'conflict'
    reason = 'ledger_owner_or_product_conflict'
  } else if (ledgerRecord.status === 'conflict' || ledgerRecord.status === 'invalid_payment') {
    outcome = 'conflict'
    reason = ledgerRecord.reason
  } else if (ledgerRecord.status === 'paid' && expiry.state !== 'none') {
    outcome = 'conflict'
    reason = 'same_session_paid_and_expired'
  } else if (ledgerRecord.status === 'paid') {
    outcome = 'paid'
    reason = ledgerRecord.reason
  } else if (expiry.state === 'conflict') {
    outcome = 'conflict'
    reason = 'expiration_semantic_conflict'
  } else if (expiry.state !== 'none') {
    outcome = expiry.state
    reason = 'exact_stripe_expiration_webhook'
  } else {
    const windowHours = metadataNumber(start.row, 'checkout_session_window_hours')
    if (windowHours === null || windowHours <= 0 || windowHours > 24 * 7) {
      outcome = 'unknown_maturity'
      reason = 'start_without_valid_session_window'
    } else if (generatedAtMs < startedAtMs + windowHours * 3_600_000) {
      outcome = 'open_before_deadline'
      reason = 'no_terminal_signal_before_assigned_deadline'
    } else {
      outcome = 'missing_terminal_signal'
      reason = 'assigned_deadline_passed_without_paid_or_expired_event'
    }
  }
  return {
    sessionReference: sessionReference(start.stripeSessionId),
    userId: start.row.user_id,
    tier: metadataString(start.row, 'tier'),
    billing: metadataString(start.row, 'billing'),
    checkoutOrigin: metadataString(start.row, 'checkout_origin') ?? 'unknown',
    startedAt: new Date(startedAtMs).toISOString(),
    outcome,
    reason,
    duplicateExpirationRows: expiry.duplicateRows,
  }
}

function countBy(rows, value) {
  const counts = new Map()
  for (const row of rows) {
    const key = value(row)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function summarizeAssist(events, name, identity, windowStartMs, generatedAtMs) {
  const rows = events.filter((row) => {
    const at = timestamp(row)
    return row?.name === name && at !== null && at >= windowStartMs && at <= generatedAtMs
  })
  return {
    eventRows: rows.length,
    identifiedExternalPeople: new Set(rows
      .filter((row) => actorClass(row, identity) === 'external')
      .map((row) => row.user_id)).size,
    anonymousSessions: new Set(rows
      .filter((row) => actorClass(row, identity) === 'anonymous' && row.session_id)
      .map((row) => row.session_id)).size,
    internalEventRows: rows.filter((row) => actorClass(row, identity) === 'internal').length,
    unknownIdentifiedEventRows: rows.filter((row) => actorClass(row, identity) === 'unknown_identified').length,
  }
}

export function buildSubscriptionSessionOutcomeReport({ generatedAt, windowStart, events, profiles }) {
  const generatedAtMs = Date.parse(generatedAt)
  const windowStartMs = Date.parse(windowStart)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  const identity = identityIndex(profiles)
  const sourceEvents = events.filter((row) => {
    const at = timestamp(row)
    return at !== null && at <= generatedAtMs
  })
  const starts = resolveExternalStarts(sourceEvents, identity, generatedAtMs)
  const expirations = expirationIndex(sourceEvents, generatedAtMs)
  const ledger = buildSubscriptionRevenueLedger({ generatedAt, windowStart, events: sourceEvents, profiles })
  const ledgerBySession = new Map(ledger.records.map((record) => [record.stripeSessionId, record]))
  const sessions = starts.starts
    .filter((start) => timestamp(start.row) >= windowStartMs)
    .map((start) => resolveOutcome(
      start,
      ledgerBySession.get(start.stripeSessionId) ?? null,
      expirations.grouped.get(start.stripeSessionId) ?? [],
      identity,
      generatedAtMs,
    ))
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
  const paid = sessions.filter((session) => session.outcome === 'paid')
  const expired = sessions.filter((session) => session.outcome.startsWith('expired_'))

  return {
    schemaVersion: SUBSCRIPTION_SESSION_OUTCOME_VERSION,
    generatedAt,
    windowStart,
    totals: {
      identifiedExternalPeople: new Set(sessions.map((session) => session.userId)).size,
      stripeSessions: sessions.length,
      paidPeople: new Set(paid.map((session) => session.userId)).size,
      paidStripeSessions: paid.length,
      expiredPeople: new Set(expired.map((session) => session.userId)).size,
      expiredStripeSessions: expired.length,
      byOutcome: countBy(sessions, (session) => session.outcome),
      byTier: countBy(sessions, (session) => session.tier),
      byBilling: countBy(sessions, (session) => session.billing),
      byCheckoutOrigin: countBy(sessions, (session) => session.checkoutOrigin),
    },
    sessions,
    unlinkedAssists: {
      paymentFailed: summarizeAssist(sourceEvents, 'checkout_payment_failed', identity, windowStartMs, generatedAtMs),
      paymentFailureEnriched: summarizeAssist(sourceEvents, 'checkout_payment_failure_enriched', identity, windowStartMs, generatedAtMs),
      checkoutCancelled: summarizeAssist(sourceEvents, 'checkout_cancelled', identity, windowStartMs, generatedAtMs),
      resumeClicked: summarizeAssist(sourceEvents, 'checkout_resume_banner_clicked', identity, windowStartMs, generatedAtMs),
      resumeChoiceViewed: summarizeAssist(sourceEvents, 'checkout_resume_choice_viewed', identity, windowStartMs, generatedAtMs),
    },
    quality: {
      subscriptionStartStripeSessionConflicts: starts.conflicts,
      duplicateSubscriptionStartRows: starts.duplicateRows,
      invalidExternalRecurringStartRows: starts.invalidExternalRows,
      expirationRowsWithoutStripeSession: expirations.rowsWithoutStripeSession,
      duplicateExpirationRows: sessions.reduce((total, session) => total + session.duplicateExpirationRows, 0),
      ledgerConflictStripeSessions: ledger.summary.conflictStripeSessions,
      unlinkedSubscriptionPaymentSessions: ledger.summary.unlinkedSubscriptionPaymentSessions,
    },
    note: 'Paid and expired are exact same-Stripe-Session outcomes. Open means the server-assigned checkout window has not ended; missing_terminal_signal means that window ended without a paid or expiration event and is an instrumentation gap, not proven abandonment. Payment failures, cancellations and resume interactions currently lack an exact server-side destination Session link and remain person/session assists. People, Stripe Sessions, browser sessions and event rows are separate units.',
  }
}
