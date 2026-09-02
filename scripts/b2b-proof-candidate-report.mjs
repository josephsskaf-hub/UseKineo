import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'
import { B2B_ATTRIBUTABLE_PATHS } from './b2b-subscription-truth-report.mjs'

export const B2B_PROOF_CANDIDATE_REPORT_VERSION = 'b2b_proof_candidate_v1'
export const B2B_PROOF_WINDOW_DAYS = 90
export const B2B_PROOF_CONTEXT_DAYS = 30
export const B2B_PROOF_EVENT_NAMES = Object.freeze([
  'checkout_started',
  'payment_success',
  'bulk_purchase_completed',
])

const B2B_CAMPAIGNS = new Set(
  Object.values(B2B_ATTRIBUTABLE_PATHS).map((path) => path.intentCampaign).filter(Boolean),
)
const BULK_PACKS = new Set(['bulk10', 'bulk20', 'bulk30', 'bulk50'])

function timestamp(value) {
  const parsed = Date.parse(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : null
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

function buildIdentity(profiles) {
  const external = new Set()
  const internal = new Set()
  for (const profile of profiles) {
    if (!profile?.id) continue
    const email = String(profile.email ?? '').trim()
    if (!email) continue
    if (isInternalMeasurementEmail(email)) internal.add(profile.id)
    else external.add(profile.id)
  }
  return { external, internal }
}

function ownerClass(userId, identity) {
  if (!userId) return 'anonymous'
  if (identity.external.has(userId)) return 'external'
  if (identity.internal.has(userId)) return 'internal'
  return 'unknown'
}

function oneTimeProduct(row) {
  if (row?.name === 'bulk_purchase_completed') return 'bulk_pack'
  if (row?.name !== 'payment_success' || metadataString(row, 'checkout_mode')?.toLowerCase() !== 'payment') return null
  const pack = metadataString(row, 'pack')?.toLowerCase()
  if (pack === 'autopilot_pilot') return 'autopilot_pilot'
  if (pack && BULK_PACKS.has(pack)) return 'bulk_pack'
  return null
}

function productEvidence(row) {
  if (row?.name === 'bulk_purchase_completed') return ['bulk_pack']
  if (row?.name === 'checkout_started') {
    const values = []
    if (metadataString(row, 'tier') && metadataString(row, 'billing')) values.push('subscription')
    const sku = metadataString(row, 'sku')?.toLowerCase()
    const pack = metadataString(row, 'pack')?.toLowerCase()
    if ((sku && BULK_PACKS.has(sku)) || (pack && BULK_PACKS.has(pack))) values.push('bulk_pack')
    if (pack === 'autopilot_pilot') values.push('autopilot_pilot')
    return values
  }
  if (row?.name !== 'payment_success') return []
  const mode = metadataString(row, 'checkout_mode')?.toLowerCase()
  if (mode === 'subscription') return ['subscription']
  if (mode !== 'payment') return ['unknown']
  return [oneTimeProduct(row) ?? 'other_one_time']
}

function productEvidenceBySession(events, generatedAtMs) {
  const products = new Map()
  for (const row of events) {
    const evidence = productEvidence(row)
    const at = timestamp(row?.created_at)
    const sessionId = metadataString(row, 'stripe_session_id')
    if (evidence.length === 0 || at === null || at > generatedAtMs || !sessionId) continue
    const values = products.get(sessionId) ?? new Set()
    for (const product of evidence) values.add(product)
    products.set(sessionId, values)
  }
  return products
}

function semantic(row, identity) {
  const userId = typeof row?.user_id === 'string' && row.user_id.trim() ? row.user_id.trim() : null
  return {
    ownerClass: ownerClass(userId, identity),
    userId,
    product: oneTimeProduct(row),
    sku: oneTimeProduct(row) === 'bulk_pack'
      ? (metadataString(row, row.name === 'bulk_purchase_completed' ? 'sku' : 'pack')?.toLowerCase() ?? null)
      : metadataString(row, 'pack')?.toLowerCase() ?? null,
    amountMinor: metadataMinor(row, 'amount_total'),
    currency: metadataString(row, 'currency')?.toLowerCase() ?? null,
  }
}

function resolveOneTimePayments(events, identity, windowStartMs, generatedAtMs, productsBySession) {
  const grouped = new Map()
  let rowsWithoutStripeSession = 0
  let invalidTimestampRows = 0

  for (const row of events) {
    if (!oneTimeProduct(row)) continue
    const at = timestamp(row?.created_at)
    if (at === null) {
      invalidTimestampRows += 1
      continue
    }
    if (at > generatedAtMs) continue
    const sessionId = metadataString(row, 'stripe_session_id')
    if (!sessionId) {
      rowsWithoutStripeSession += 1
      continue
    }
    const rows = grouped.get(sessionId) ?? []
    rows.push(row)
    grouped.set(sessionId, rows)
  }

  const records = []
  let conflictStripeSessions = 0
  let invalidPaymentStripeSessions = 0
  let duplicateRows = 0
  let incompleteBulkStripeSessions = 0
  let unknownOwnerPaidSessions = 0
  let internalPaidSessions = 0

  for (const [sessionId, rows] of grouped.entries()) {
    rows.sort((left, right) => timestamp(left.created_at) - timestamp(right.created_at))
    if ((productsBySession.get(sessionId)?.size ?? 0) !== 1) {
      conflictStripeSessions += 1
      continue
    }
    const semantics = rows.map((row) => semantic(row, identity))
    const distinct = new Set(semantics.map((value) => JSON.stringify(value)))
    duplicateRows += [...new Set(rows.map((row) => row.name))]
      .reduce((total, name) => total + Math.max(0, rows.filter((row) => row.name === name).length - 1), 0)
    if (distinct.size !== 1) {
      conflictStripeSessions += 1
      continue
    }
    const value = semantics[0]
    const paymentRows = rows.filter((row) => row.name === 'payment_success')
    if (
      value?.product === 'bulk_pack' &&
      (!rows.some((row) => row.name === 'bulk_purchase_completed') || paymentRows.length === 0)
    ) {
      incompleteBulkStripeSessions += 1
      continue
    }
    const paidAtMs = paymentRows.length > 0 ? timestamp(paymentRows[0].created_at) : null
    if (
      !value ||
      !Number.isSafeInteger(value.amountMinor) ||
      value.amountMinor <= 0 ||
      !value.currency ||
      paidAtMs === null ||
      paidAtMs < windowStartMs
    ) {
      if (paidAtMs !== null && paidAtMs >= windowStartMs) invalidPaymentStripeSessions += 1
      continue
    }
    if (value.ownerClass === 'unknown' || value.ownerClass === 'anonymous') unknownOwnerPaidSessions += 1
    if (value.ownerClass === 'internal') internalPaidSessions += 1
    records.push({ ...value, paidAtMs })
  }

  return {
    records,
    quality: {
      conflictStripeSessions,
      invalidPaymentStripeSessions,
      duplicateRows,
      incompleteBulkStripeSessions,
      unknownOwnerPaidSessions,
      internalPaidSessions,
      rowsWithoutStripeSession,
      invalidTimestampRows,
    },
  }
}

function subscriptionSignal(record, events) {
  const campaigns = new Set(events
    .filter((row) =>
      row?.name === 'checkout_started' &&
      metadataString(row, 'stripe_session_id') === record.stripeSessionId &&
      metadataString(row, 'intent_campaign'),
    )
    .map((row) => metadataString(row, 'intent_campaign')))
  if (campaigns.size === 1 && B2B_CAMPAIGNS.has([...campaigns][0])) return 'b2b_campaign_subscription'
  if (campaigns.size > 1) return 'b2b_campaign_conflict'
  return 'subscription_without_b2b_campaign'
}

function addRevenue(totals, currency, amountMinor) {
  totals.set(currency, (totals.get(currency) ?? 0) + amountMinor)
}

function peopleBy(records, key) {
  const grouped = new Map()
  for (const record of records) {
    const value = record[key]
    const people = grouped.get(value) ?? new Set()
    people.add(record.userId)
    grouped.set(value, people)
  }
  return Object.fromEntries([...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, people]) => [value, people.size]))
}

export function buildB2bProofCandidateReport({ generatedAt, windowStart, events, profiles, videos }) {
  const generatedAtMs = timestamp(generatedAt)
  const windowStartMs = timestamp(windowStart)
  if (generatedAtMs === null || windowStartMs === null || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }

  const identity = buildIdentity(profiles)
  const productsBySession = productEvidenceBySession(events, generatedAtMs)
  const ledger = buildSubscriptionRevenueLedger({ generatedAt, windowStart, events, profiles })
  const paidSubscriptions = ledger.records
    .filter((record) => record.status === 'paid' && record.paidInWindow && record.ownerClass === 'external')
    .map((record) => ({
      stripeSessionId: record.stripeSessionId,
      userId: record.ownerUserId,
      product: 'subscription',
      signal: subscriptionSignal(record, events),
      amountMinor: record.amountMinor,
      currency: record.currency,
      paidAtMs: timestamp(record.paidAt),
    }))
  const subscriptions = paidSubscriptions.filter((record) =>
    record.signal === 'b2b_campaign_subscription' &&
    (productsBySession.get(record.stripeSessionId)?.size ?? 0) === 1,
  )
  const oneTime = resolveOneTimePayments(events, identity, windowStartMs, generatedAtMs, productsBySession)
  const payments = [...subscriptions, ...oneTime.records.filter((record) => record.ownerClass === 'external')]
    .filter((record) => record.userId && record.paidAtMs !== null)
    .map((record) => ({
      ...record,
      signal: record.signal ?? record.product,
    }))
  const externalPayments = payments.filter((record) => identity.external.has(record.userId))

  const completedVideos = videos.filter((video) => {
    const createdAtMs = timestamp(video?.created_at)
    return video?.status === 'completed' && createdAtMs !== null && createdAtMs <= generatedAtMs
  })
  const candidatePayments = externalPayments.filter((payment) =>
    completedVideos.some((video) => video.user_id === payment.userId && timestamp(video.created_at) > payment.paidAtMs),
  )
  const candidatePeople = new Set(candidatePayments.map((record) => record.userId))
  const paidPeople = new Set(externalPayments.map((record) => record.userId))
  const qualifyingVideoKeys = new Set()
  for (const video of completedVideos) {
    if (!candidatePeople.has(video.user_id)) continue
    const qualifies = externalPayments.some((payment) =>
      payment.userId === video.user_id && timestamp(video.created_at) > payment.paidAtMs,
    )
    if (qualifies) qualifyingVideoKeys.add(String(video.id ?? `${video.user_id}:${video.created_at}`))
  }

  const revenue = new Map()
  for (const payment of externalPayments) addRevenue(revenue, payment.currency, payment.amountMinor)
  const signalRows = [...new Set(externalPayments.map((record) => record.signal))].sort().map((signal) => ({
    signal,
    paidPeople: new Set(externalPayments.filter((record) => record.signal === signal).map((record) => record.userId)).size,
    candidatePeople: new Set(candidatePayments.filter((record) => record.signal === signal).map((record) => record.userId)).size,
  }))

  return {
    schemaVersion: B2B_PROOF_CANDIDATE_REPORT_VERSION,
    generatedAt,
    windowStart,
    paid: {
      externalPaidPeople: paidPeople.size,
      exactPaidStripeSessions: externalPayments.length,
      peopleByProduct: peopleBy(externalPayments, 'product'),
      revenueMinorByCurrency: Object.fromEntries([...revenue.entries()].sort(([left], [right]) => left.localeCompare(right))),
    },
    postPaymentUse: {
      externalPaidPeopleWithPostPaymentCompletedVideo: candidatePeople.size,
      completedVideosAfterPayment: qualifyingVideoKeys.size,
      temporalBasis: 'videos.created_at_strictly_after_payment',
      peopleByProduct: peopleBy(candidatePayments, 'product'),
    },
    b2bIntentSignals: signalRows,
    consentGate: {
      businessUseConfirmedPeople: 0,
      consentRecordedPeople: 0,
      businessUseConfirmed: 'unknown',
      consentRecorded: 'unknown',
      state: candidatePeople.size > 0 ? 'manual_confirmation_required' : 'no_candidate',
    },
    quality: {
      subscriptionConflictStripeSessions: ledger.summary.conflictStripeSessions,
      subscriptionUnlinkedPaymentSessions: ledger.summary.unlinkedSubscriptionPaymentSessions,
      subscriptionUnknownOwnerPaidSessions: ledger.summary.unknownOwnerPaidSessions,
      excludedSubscriptionWithoutB2bCampaignPeople: new Set(paidSubscriptions
        .filter((record) => record.signal === 'subscription_without_b2b_campaign')
        .map((record) => record.userId)).size,
      excludedSubscriptionCampaignConflictSessions: paidSubscriptions
        .filter((record) => record.signal === 'b2b_campaign_conflict').length,
      crossProductConflictStripeSessions: [...productsBySession.values()]
        .filter((products) => products.size > 1).length,
      oneTime: oneTime.quality,
    },
    limitations: [
      'A paid product or campaign is only a B2B intent signal; it does not prove business use.',
      'Post-payment use means a row currently marked completed whose videos.created_at is strictly after payment; the table has no separate completion timestamp.',
      'Business use and publication consent remain unknown until a person confirms both explicitly.',
      'People by product and by signal can overlap and must not be added together.',
      'The report intentionally emits no user, email, browser-session or Stripe Session identifiers.',
    ],
  }
}
