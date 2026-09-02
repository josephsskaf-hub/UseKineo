import { isInternalMeasurementEmail } from './measurement-helpers.mjs'

export const SUBSCRIPTION_REVENUE_LEDGER_VERSION = 'subscription_revenue_ledger_v1'

function timestamp(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function metadataString(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function metadataMinor(row, key) {
  const value = row?.metadata?.[key]
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}

function compareRows(left, right) {
  return timestamp(left) - timestamp(right) || String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
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

function actor(row, identity) {
  const userId = typeof row?.user_id === 'string' && row.user_id.trim() ? row.user_id.trim() : null
  if (!userId) return { key: 'anonymous:(missing-user)', actorClass: 'anonymous', userId: null }
  if (identity.external.has(userId)) return { key: `external:${userId}`, actorClass: 'external', userId }
  if (identity.internal.has(userId)) return { key: `internal:${userId}`, actorClass: 'internal', userId }
  return { key: `unknown:${userId}`, actorClass: 'unknown', userId }
}

function stripeSessionId(row) {
  return metadataString(row, 'stripe_session_id')
}

function startProduct(row) {
  if (row?.name !== 'checkout_started') return null
  if (metadataString(row, 'sku')) return 'pack'
  if (metadataString(row, 'tier') && metadataString(row, 'billing')) return 'subscription'
  return 'unknown'
}

function paymentProduct(row) {
  if (row?.name !== 'payment_success') return null
  const mode = metadataString(row, 'checkout_mode')?.toLowerCase() ?? null
  if (mode === 'subscription') return 'subscription'
  if (mode === 'payment') return 'pack'
  return 'unknown'
}

function startSemantic(row, identity) {
  const who = actor(row, identity)
  return {
    actorKey: who.key,
    actorClass: who.actorClass,
    userId: who.userId,
    product: startProduct(row),
    tier: metadataString(row, 'tier'),
    billing: metadataString(row, 'billing'),
  }
}

function paymentSemantic(row, identity) {
  const who = actor(row, identity)
  return {
    actorKey: who.key,
    actorClass: who.actorClass,
    userId: who.userId,
    product: paymentProduct(row),
    amountMinor: metadataMinor(row, 'amount_total'),
    currency: metadataString(row, 'currency')?.toLowerCase() ?? null,
  }
}

function semanticKey(value) {
  return JSON.stringify(value)
}

function groupBySession(events, generatedAtMs) {
  const grouped = new Map()
  let rowsWithoutStripeSession = 0
  for (const row of events) {
    if (row?.name !== 'checkout_started' && row?.name !== 'payment_success') continue
    const at = timestamp(row)
    if (at === null || at > generatedAtMs) continue
    const sessionId = stripeSessionId(row)
    if (!sessionId) {
      rowsWithoutStripeSession += 1
      continue
    }
    const rows = grouped.get(sessionId) ?? []
    rows.push(row)
    grouped.set(sessionId, rows)
  }
  return { grouped, rowsWithoutStripeSession }
}

function resolveSession(stripeSessionIdValue, rows, identity, windowStartMs, generatedAtMs) {
  const ordered = [...rows].sort(compareRows)
  const starts = ordered.filter((row) => row.name === 'checkout_started')
  const payments = ordered.filter((row) => row.name === 'payment_success')
  const startSemantics = starts.map((row) => startSemantic(row, identity))
  const paymentSemantics = payments.map((row) => paymentSemantic(row, identity))
  const actorKeys = new Set([...startSemantics, ...paymentSemantics].map((value) => value.actorKey))
  const products = new Set([...startSemantics, ...paymentSemantics].map((value) => value.product))
  const subscriptionStarts = starts.filter((row) => startProduct(row) === 'subscription')
  const subscriptionPayments = payments.filter((row) => paymentProduct(row) === 'subscription')
  const firstStart = subscriptionStarts[0] ?? null
  const firstStartAt = firstStart ? timestamp(firstStart) : null
  const paymentRowsAfterStart = firstStartAt === null
    ? []
    : subscriptionPayments.filter((row) => timestamp(row) >= firstStartAt)
  const paymentRowsBeforeStart = firstStartAt === null
    ? []
    : subscriptionPayments.filter((row) => timestamp(row) < firstStartAt)
  const paidInWindowRows = paymentRowsAfterStart.filter((row) => {
    const at = timestamp(row)
    return at >= windowStartMs && at <= generatedAtMs
  })

  let status = 'unpaid'
  let reason = 'exact_subscription_start_without_payment'
  let owner = startSemantics.find((value) => value.product === 'subscription') ?? null
  let amountMinor = null
  let currency = null
  let paidAt = null

  if (actorKeys.size > 1) {
    status = 'conflict'
    reason = 'identity_conflict'
  } else if (products.has('unknown')) {
    status = 'conflict'
    reason = 'unknown_product_semantics'
  } else if (products.has('subscription') && products.has('pack')) {
    status = 'conflict'
    reason = 'subscription_pack_conflict'
  } else if (subscriptionStarts.length === 0 && subscriptionPayments.length > 0) {
    status = 'unlinked_payment'
    reason = 'subscription_payment_without_start'
    owner = paymentSemantics.find((value) => value.product === 'subscription') ?? null
  } else if (subscriptionStarts.length === 0) {
    status = 'non_subscription'
    reason = products.has('pack') ? 'pack_session' : 'no_subscription_rows'
  } else if (new Set(startSemantics.filter((value) => value.product === 'subscription').map(semanticKey)).size > 1) {
    status = 'conflict'
    reason = 'start_semantic_conflict'
  } else if (paymentRowsBeforeStart.length > 0) {
    status = 'conflict'
    reason = paymentRowsAfterStart.length > 0 ? 'payment_timeline_conflict' : 'payment_before_start'
  } else if (subscriptionPayments.length === 0) {
    status = 'unpaid'
    reason = 'exact_subscription_start_without_payment'
  } else {
    const semantics = paymentRowsAfterStart.map((row) => paymentSemantic(row, identity))
    if (new Set(semantics.map(semanticKey)).size > 1) {
      status = 'conflict'
      reason = 'payment_semantic_conflict'
    } else {
      const payment = semantics[0]
      owner = payment
      if (!payment || !Number.isSafeInteger(payment.amountMinor) || payment.amountMinor <= 0 || !payment.currency) {
        status = 'invalid_payment'
        reason = 'invalid_amount_or_currency'
      } else {
        status = 'paid'
        reason = paidInWindowRows.length > 0 ? 'exact_subscription_payment_in_window' : 'exact_subscription_payment_outside_window'
        amountMinor = payment.amountMinor
        currency = payment.currency
        paidAt = timestamp(paymentRowsAfterStart[0])
      }
    }
  }

  return {
    stripeSessionId: stripeSessionIdValue,
    status,
    reason,
    ownerClass: owner?.actorClass ?? null,
    ownerUserId: owner?.userId ?? null,
    startedAt: firstStartAt === null ? null : new Date(firstStartAt).toISOString(),
    paidAt: paidAt === null ? null : new Date(paidAt).toISOString(),
    amountMinor,
    currency,
    paidInWindow: status === 'paid' && paidInWindowRows.length > 0,
    duplicateStartRows: Math.max(0, subscriptionStarts.length - 1),
    duplicatePaymentRows: status === 'paid' ? Math.max(0, paymentRowsAfterStart.length - 1) : 0,
    browserSessionCount: new Set(starts.map((row) => row.session_id).filter(Boolean)).size,
  }
}

function revenueByCurrency(records) {
  const totals = new Map()
  for (const record of records) {
    if (
      record.status !== 'paid' ||
      !record.paidInWindow ||
      record.ownerClass !== 'external' ||
      !record.currency ||
      !Number.isSafeInteger(record.amountMinor)
    ) continue
    totals.set(record.currency, (totals.get(record.currency) ?? 0) + record.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

export function buildSubscriptionRevenueLedger({ generatedAt, windowStart, events, profiles }) {
  const generatedAtMs = Date.parse(generatedAt)
  const windowStartMs = Date.parse(windowStart)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  const identity = identityIndex(profiles)
  const grouped = groupBySession(events, generatedAtMs)
  const records = [...grouped.grouped.entries()]
    .map(([sessionId, rows]) => resolveSession(sessionId, rows, identity, windowStartMs, generatedAtMs))
    .sort((left, right) => String(left.startedAt ?? left.paidAt ?? '').localeCompare(String(right.startedAt ?? right.paidAt ?? '')))
  const exactExternalPaid = records.filter((record) =>
    record.status === 'paid' && record.paidInWindow && record.ownerClass === 'external',
  )

  return {
    schemaVersion: SUBSCRIPTION_REVENUE_LEDGER_VERSION,
    generatedAt,
    windowStart,
    records,
    summary: {
      exactExternalPaidPeople: new Set(exactExternalPaid.map((record) => record.ownerUserId)).size,
      exactExternalPaidStripeSessions: exactExternalPaid.length,
      externalRevenueMinorByCurrency: revenueByCurrency(records),
      conflictStripeSessions: records.filter((record) => record.status === 'conflict').length,
      unlinkedSubscriptionPaymentSessions: records.filter((record) => record.status === 'unlinked_payment').length,
      unknownOwnerPaidSessions: records.filter((record) =>
        record.status === 'paid' && record.paidInWindow && record.ownerClass !== 'external' && record.ownerClass !== 'internal',
      ).length,
      internalPaidSessions: records.filter((record) =>
        record.status === 'paid' && record.paidInWindow && record.ownerClass === 'internal',
      ).length,
      packSessions: records.filter((record) => record.status === 'non_subscription' && record.reason === 'pack_session').length,
      duplicateStartRows: records.reduce((total, record) => total + record.duplicateStartRows, 0),
      duplicatePaymentRows: records.reduce((total, record) => total + record.duplicatePaymentRows, 0),
      rowsWithoutStripeSession: grouped.rowsWithoutStripeSession,
    },
    note: 'A subscription payment is counted once per exact Stripe Session. Conflicting identity, product, amount, currency or timeline yields zero attributable external revenue. Packs never count as subscribers.',
  }
}
