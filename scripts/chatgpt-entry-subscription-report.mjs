import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const CHATGPT_ENTRY_SUBSCRIPTION_REPORT_VERSION = 'chatgpt_entry_subscription_v2'
export const CHATGPT_ENTRY_SUBSCRIPTION_WINDOW_DAYS = 30
const CHECKOUT_ORIGIN_LOOKBACK_MS = 5 * 60 * 1000

function at(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function text(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function pathOf(row) {
  const value = typeof row?.path === 'string' ? row.path.trim() : ''
  if (!value.startsWith('/')) return '(unknown)'
  return value.split(/[?#]/, 1)[0] || '/'
}

function isChatgptTouch(row) {
  if (!['landing_session_started', 'homepage_view'].includes(row?.name)) return false
  return ['referrer_host', 'utm_source', 'ref'].some((key) =>
    (text(row, key) ?? '').toLowerCase().includes('chatgpt'),
  )
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

function revenue(records) {
  const totals = new Map()
  for (const record of records) {
    if (!record.currency || !Number.isSafeInteger(record.amountMinor)) continue
    totals.set(record.currency, (totals.get(record.currency) ?? 0) + record.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

function checkoutOriginFromSurface(value) {
  const surface = String(value ?? '').trim().toLowerCase()
  if (!surface) return null
  if (surface === 'trial_active_banner') return 'trial_active_banner'
  if (surface === 'pricing' || surface === 'pricing_page') return 'pricing_page'
  if (['checkout_resume', 'checkout_resume_banner', 'pricing_saved_checkout'].includes(surface)) return 'checkout_resume'
  if (['post_video', 'post_video_paywall', 'generate_post_video_upsell', 'generate_trial_post_video'].includes(surface)) return 'post_video'
  return 'other_tracked'
}

function checkoutOriginFromEvent(row) {
  if (row?.name === 'trial_active_banner_cta') return 'trial_active_banner'
  if (row?.name === 'pricing_saved_checkout_clicked' || row?.name === 'checkout_resume_banner_clicked') {
    return 'checkout_resume'
  }
  const surface = checkoutOriginFromSurface(
    text(row, 'pricing_surface') ?? text(row, 'surface') ?? text(row, 'source'),
  )
  if (surface) return surface
  return 'other_tracked'
}

function preVideoCheckoutOrigins(records, ordered) {
  const checkoutStarts = new Map()
  for (const row of ordered) {
    if (row?.name !== 'checkout_started') continue
    const stripeSessionId = text(row, 'stripe_session_id')
    if (stripeSessionId && !checkoutStarts.has(stripeSessionId)) checkoutStarts.set(stripeSessionId, row)
  }

  const actionNames = new Set([
    'checkout_cta_clicked',
    'trial_active_banner_cta',
    'pricing_saved_checkout_clicked',
    'checkout_resume_banner_clicked',
    'starter_checkout_clicked',
    'basic_checkout_clicked',
    'pro_checkout_clicked',
    'autopilot_checkout_clicked',
  ])
  const buckets = new Map()
  for (const record of records) {
    const start = checkoutStarts.get(record.stripeSessionId)
    const startedAt = Date.parse(String(record.startedAt ?? ''))
    let origin = checkoutOriginFromSurface(text(start, 'pricing_surface') ?? text(start, 'surface'))
    if (!origin && start && Number.isFinite(startedAt)) {
      const candidates = ordered.filter((row) => {
        const rowAt = at(row)
        if (rowAt === null || rowAt > startedAt || rowAt < startedAt - CHECKOUT_ORIGIN_LOOKBACK_MS) return false
        if (row?.user_id !== record.ownerUserId || !actionNames.has(row?.name)) return false
        return Boolean(start.session_id && row.session_id && row.session_id === start.session_id)
      })
      // Several surfaces emit a canonical checkout_cta_clicked plus a legacy
      // named event, both fire-and-forget. Database created_at is therefore not
      // a causal ordering contract. Prefer canonical evidence; otherwise accept
      // a named-event origin only when every candidate agrees.
      const canonical = candidates.filter((row) => row?.name === 'checkout_cta_clicked')
      const evidence = canonical.length > 0 ? canonical : candidates
      const candidateOrigins = new Set(evidence.map(checkoutOriginFromEvent))
      if (candidateOrigins.size === 1) origin = [...candidateOrigins][0]
    }
    origin ??= 'unattributed'
    const bucket = buckets.get(origin) ?? {
      origin,
      startedPeople: new Set(),
      startedStripeSessions: 0,
      paidPeople: new Set(),
      paidStripeSessions: 0,
      paidRecords: [],
    }
    bucket.startedPeople.add(record.ownerUserId)
    bucket.startedStripeSessions += 1
    if (record.status === 'paid' && record.paidInWindow) {
      bucket.paidPeople.add(record.ownerUserId)
      bucket.paidStripeSessions += 1
      bucket.paidRecords.push(record)
    }
    buckets.set(origin, bucket)
  }

  return [...buckets.values()].map((bucket) => ({
    origin: bucket.origin,
    startedPeople: bucket.startedPeople.size,
    startedStripeSessions: bucket.startedStripeSessions,
    paidPeople: bucket.paidPeople.size,
    paidStripeSessions: bucket.paidStripeSessions,
    revenueMinorByCurrency: revenue(bucket.paidRecords),
  })).sort((left, right) =>
    right.startedPeople - left.startedPeople ||
    right.startedStripeSessions - left.startedStripeSessions ||
    left.origin.localeCompare(right.origin),
  )
}

export function buildChatgptEntrySubscriptionReport({
  generatedAt,
  windowStart,
  events,
  profiles,
  videos,
}) {
  const generatedAtMs = Date.parse(generatedAt)
  const windowStartMs = Date.parse(windowStart)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }

  const identity = identityIndex(profiles)
  const ordered = events
    .filter((row) => {
      const value = at(row)
      return value !== null && value >= windowStartMs && value <= generatedAtMs
    })
    .sort((a, b) => at(a) - at(b) || String(a?.id ?? '').localeCompare(String(b?.id ?? '')))

  const firstTouchBySession = new Map()
  for (const row of ordered) {
    if (!row?.session_id || !isChatgptTouch(row) || firstTouchBySession.has(row.session_id)) continue
    firstTouchBySession.set(row.session_id, { at: at(row), path: pathOf(row) })
  }

  const usersBySession = new Map()
  for (const row of ordered) {
    if (!row?.session_id || !row?.user_id || !firstTouchBySession.has(row.session_id)) continue
    const current = usersBySession.get(row.session_id) ?? new Set()
    current.add(row.user_id)
    usersBySession.set(row.session_id, current)
  }

  let unattributedSessions = 0
  let ambiguousIdentitySessions = 0
  let internalOnlySessions = 0
  let unknownOnlySessions = 0
  const firstTouchByUser = new Map()

  for (const [sessionId, touch] of firstTouchBySession) {
    const userIds = [...(usersBySession.get(sessionId) ?? [])]
    if (userIds.length === 0) {
      unattributedSessions += 1
      continue
    }
    if (userIds.length > 1) {
      ambiguousIdentitySessions += 1
      continue
    }
    const userId = userIds[0]
    if (identity.internal.has(userId)) {
      internalOnlySessions += 1
      continue
    }
    if (!identity.external.has(userId)) {
      unknownOnlySessions += 1
      continue
    }
    const existing = firstTouchByUser.get(userId)
    if (!existing || touch.at < existing.at) firstTouchByUser.set(userId, touch)
  }

  const firstCompletedAtByUser = new Map()
  for (const video of videos) {
    const touch = firstTouchByUser.get(video?.user_id)
    const videoAt = at(video)
    if (touch && video?.status === 'completed' && videoAt !== null && videoAt >= touch.at && videoAt <= generatedAtMs) {
      const existing = firstCompletedAtByUser.get(video.user_id)
      if (existing === undefined || videoAt < existing) firstCompletedAtByUser.set(video.user_id, videoAt)
    }
  }

  const ledger = buildSubscriptionRevenueLedger({ generatedAt, windowStart, events: ordered, profiles })
  const attributedRecords = ledger.records.filter((record) => {
    const touch = firstTouchByUser.get(record.ownerUserId)
    const startedAt = Date.parse(String(record.startedAt ?? ''))
    return touch &&
      record.ownerClass === 'external' &&
      ['unpaid', 'paid'].includes(record.status) &&
      Number.isFinite(startedAt) &&
      startedAt >= touch.at
  })
  const qualifyingRecords = attributedRecords.filter((record) => {
    const completedAt = firstCompletedAtByUser.get(record.ownerUserId)
    const startedAt = Date.parse(String(record.startedAt ?? ''))
    return completedAt !== undefined && Number.isFinite(startedAt) && startedAt >= completedAt
  })
  const preVideoRecords = attributedRecords.filter((record) => {
    const completedAt = firstCompletedAtByUser.get(record.ownerUserId)
    const startedAt = Date.parse(String(record.startedAt ?? ''))
    return completedAt === undefined || (Number.isFinite(startedAt) && startedAt < completedAt)
  })
  const paidRecords = qualifyingRecords.filter((record) => record.status === 'paid' && record.paidInWindow)
  const paidPreVideoRecords = preVideoRecords.filter((record) => record.status === 'paid' && record.paidInWindow)
  const preVideoOrigins = preVideoCheckoutOrigins(preVideoRecords, ordered)

  const rows = new Map()
  for (const [userId, touch] of firstTouchByUser) {
    const current = rows.get(touch.path) ?? {
      landingPath: touch.path,
      externalPeople: new Set(),
      completedVideoPeople: new Set(),
      postVideoSubscriptionStartedPeople: new Set(),
      postVideoSubscriptionStartedStripeSessions: 0,
      postVideoSubscriptionPaidPeople: new Set(),
      postVideoSubscriptionPaidStripeSessions: 0,
      preVideoSubscriptionStartedPeople: new Set(),
      preVideoSubscriptionStartedStripeSessions: 0,
      preVideoSubscriptionPaidPeople: new Set(),
      preVideoSubscriptionPaidStripeSessions: 0,
      paidRecords: [],
    }
    current.externalPeople.add(userId)
    if (firstCompletedAtByUser.has(userId)) current.completedVideoPeople.add(userId)
    rows.set(touch.path, current)
  }
  for (const record of qualifyingRecords) {
    const path = firstTouchByUser.get(record.ownerUserId)?.path
    const row = rows.get(path)
    if (!row) continue
    row.postVideoSubscriptionStartedPeople.add(record.ownerUserId)
    row.postVideoSubscriptionStartedStripeSessions += 1
  }
  for (const record of paidRecords) {
    const path = firstTouchByUser.get(record.ownerUserId)?.path
    const row = rows.get(path)
    if (!row) continue
    row.postVideoSubscriptionPaidPeople.add(record.ownerUserId)
    row.postVideoSubscriptionPaidStripeSessions += 1
    row.paidRecords.push(record)
  }
  for (const record of preVideoRecords) {
    const path = firstTouchByUser.get(record.ownerUserId)?.path
    const row = rows.get(path)
    if (!row) continue
    row.preVideoSubscriptionStartedPeople.add(record.ownerUserId)
    row.preVideoSubscriptionStartedStripeSessions += 1
  }
  for (const record of paidPreVideoRecords) {
    const path = firstTouchByUser.get(record.ownerUserId)?.path
    const row = rows.get(path)
    if (!row) continue
    row.preVideoSubscriptionPaidPeople.add(record.ownerUserId)
    row.preVideoSubscriptionPaidStripeSessions += 1
  }

  const paths = [...rows.values()].map((row) => ({
    landingPath: row.landingPath,
    externalPeople: row.externalPeople.size,
    completedVideoPeople: row.completedVideoPeople.size,
    postVideoSubscriptionStartedPeople: row.postVideoSubscriptionStartedPeople.size,
    postVideoSubscriptionStartedStripeSessions: row.postVideoSubscriptionStartedStripeSessions,
    postVideoSubscriptionPaidPeople: row.postVideoSubscriptionPaidPeople.size,
    postVideoSubscriptionPaidStripeSessions: row.postVideoSubscriptionPaidStripeSessions,
    preVideoSubscriptionStartedPeople: row.preVideoSubscriptionStartedPeople.size,
    preVideoSubscriptionStartedStripeSessions: row.preVideoSubscriptionStartedStripeSessions,
    preVideoSubscriptionPaidPeople: row.preVideoSubscriptionPaidPeople.size,
    preVideoSubscriptionPaidStripeSessions: row.preVideoSubscriptionPaidStripeSessions,
    subscriptionRevenueMinorByCurrency: revenue(row.paidRecords),
  })).sort((a, b) =>
    b.postVideoSubscriptionPaidPeople - a.postVideoSubscriptionPaidPeople ||
    b.postVideoSubscriptionStartedPeople - a.postVideoSubscriptionStartedPeople ||
    b.externalPeople - a.externalPeople ||
    a.landingPath.localeCompare(b.landingPath),
  )

  return {
    schemaVersion: CHATGPT_ENTRY_SUBSCRIPTION_REPORT_VERSION,
    generatedAt,
    window: { start: windowStart, days: (generatedAtMs - windowStartMs) / 86_400_000 },
    acquisitionTruth: {
      chatgptLandingSessions: firstTouchBySession.size,
      linkedExternalPeople: firstTouchByUser.size,
      unattributedSessions,
      ambiguousIdentitySessions,
      internalOnlySessions,
      unknownOnlySessions,
    },
    postVideoSubscriptionTruth: {
      startedPeople: new Set(qualifyingRecords.map((record) => record.ownerUserId)).size,
      startedStripeSessions: qualifyingRecords.length,
      paidPeople: new Set(paidRecords.map((record) => record.ownerUserId)).size,
      paidStripeSessions: paidRecords.length,
      revenueMinorByCurrency: revenue(paidRecords),
    },
    preVideoCheckoutDiagnostic: {
      startedPeople: new Set(preVideoRecords.map((record) => record.ownerUserId)).size,
      startedStripeSessions: preVideoRecords.length,
      paidPeople: new Set(paidPreVideoRecords.map((record) => record.ownerUserId)).size,
      paidStripeSessions: paidPreVideoRecords.length,
      revenueMinorByCurrency: revenue(paidPreVideoRecords),
      byOrigin: preVideoOrigins,
    },
    paths,
    limitations: [
      'Attribution is first ChatGPT landing path within the selected window, linked only when one browser session resolves to exactly one external profile.',
      'Anonymous and multi-user browser sessions remain separate diagnostic buckets and never become people.',
      'The primary funnel is chronological: the same person must first land from ChatGPT, then receive a completed video, then start the exact subscription Checkout Session, then pay.',
      'Subscription Checkouts opened before a completed video, or by people with no completed video, stay in the separate pre-video diagnostic and never inflate the post-video funnel.',
      'Pre-video Checkout origin uses an allowlisted action from the same person and browser session within five minutes; canonical checkout_cta_clicked evidence wins, while missing or conflicting evidence remains unattributed.',
      'A checkout action persisted after checkout_started is treated as a possible analytics race, not exact origin evidence, and remains unattributed.',
      'People are distinct inside each origin bucket but not allocated exclusively across origins; one person with multiple Stripe Sessions can appear in more than one origin, so by-origin people are not additive.',
      'A path is an acquisition association, not proof that its copy caused a checkout or payment.',
      'Subscription revenue uses the canonical Stripe Session ledger; packs and conflicting sessions count as zero subscription revenue.',
    ],
  }
}
