import { isInternalMeasurementEmail } from './measurement-helpers.mjs'

export const POST_DELIVERY_ORIGIN_REPORT_VERSION = 'post_delivery_checkout_origin_report_v1'
export const POST_DELIVERY_ORIGIN_REPORT_WINDOW_DAYS = 30
export const POST_DELIVERY_ORIGIN_MAX_CLICK_TO_ATTEMPT_MS = 30_000
export const POST_DELIVERY_ORIGIN_MAX_PERSISTENCE_RACE_MS = 5_000
export const POST_DELIVERY_ORIGIN_MAX_ATTEMPT_TO_START_MS = 60_000
export const POST_DELIVERY_ORIGIN_MINIMUM_CLICK_PEOPLE = 10
export const POST_DELIVERY_ORIGIN_MINIMUM_STARTED_PEOPLE = 5
export const POST_DELIVERY_ORIGIN_MINIMUM_OBSERVATION_DAYS = 7
export const POST_DELIVERY_ORIGIN_MAXIMUM_UNRESOLVED_RATIO = 0.2

export const POST_DELIVERY_ORIGIN_EVENT_NAMES = Object.freeze([
  'checkout_cta_clicked',
  'checkout_attempted',
  'checkout_started',
  'payment_success',
])

function timestamp(row) {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}

function metadataString(row, key) {
  const value = row?.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function metadataMinorAmount(row, key) {
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

function sameActorOrAnonymousSignal(row, userId) {
  return !row.user_id || row.user_id === userId
}

function sameRecurringIntent(left, right) {
  const leftTier = metadataString(left, 'tier')
  const rightTier = metadataString(right, 'tier')
  const leftBilling = metadataString(left, 'billing')
  const rightBilling = metadataString(right, 'billing')
  return (!leftTier || !rightTier || leftTier === rightTier) &&
    (!leftBilling || !rightBilling || leftBilling === rightBilling)
}

function isSubscriptionAttempt(row) {
  return row.name === 'checkout_attempted' &&
    Boolean(metadataString(row, 'tier')) &&
    Boolean(metadataString(row, 'billing')) &&
    !metadataString(row, 'sku')
}

function isSubscriptionStart(row) {
  return row.name === 'checkout_started' &&
    Boolean(metadataString(row, 'tier')) &&
    Boolean(metadataString(row, 'billing')) &&
    Boolean(metadataString(row, 'stripe_session_id')) &&
    !metadataString(row, 'sku')
}

function firstCompletedVideoByUser(videos) {
  const first = new Map()
  for (const video of [...videos].sort(compareRows)) {
    if (!video?.user_id || video.status !== 'completed' || timestamp(video) === null) continue
    if (!first.has(video.user_id)) first.set(video.user_id, video)
  }
  return first
}

function externalIdentity(profiles) {
  const knownExternal = new Set()
  const internal = new Set()
  const missingEmail = new Set()
  for (const profile of profiles) {
    if (!profile?.id) continue
    const email = String(profile.email ?? '').trim()
    if (!email) {
      missingEmail.add(profile.id)
    } else if (isInternalMeasurementEmail(email)) {
      internal.add(profile.id)
    } else {
      knownExternal.add(profile.id)
    }
  }
  return { knownExternal, internal, missingEmail }
}

export function classifySurface(attempt, clicks, options = {}) {
  if (!attempt.session_id) return { status: 'missing', surface: null, reason: 'attempt_without_browser_session' }
  const attemptAt = timestamp(attempt)
  const candidates = clicks.filter((click) => {
    const clickAt = timestamp(click)
    return click.session_id === attempt.session_id &&
      sameActorOrAnonymousSignal(click, attempt.user_id) &&
      clickAt !== null &&
      clickAt >= attemptAt - POST_DELIVERY_ORIGIN_MAX_CLICK_TO_ATTEMPT_MS &&
      clickAt <= attemptAt + POST_DELIVERY_ORIGIN_MAX_PERSISTENCE_RACE_MS
  })
  if (candidates.length === 0) return { status: 'missing', surface: null, reason: 'no_ordered_click' }

  // The browser writes the click without awaiting it, while checkout starts a
  // separate request immediately. A click persisted just after the server-side
  // attempt is evidence of that race, not evidence that no click existed.
  if (candidates.some((row) => timestamp(row) > attemptAt)) {
    return { status: 'ambiguous', surface: null, reason: 'cross_request_persistence_race' }
  }

  const surfaces = new Set(candidates.map((row) => metadataString(row, 'surface')).filter(Boolean))
  const hasUnlabelledClick = candidates.some((row) => !metadataString(row, 'surface'))
  if (surfaces.size === 0) return { status: 'missing', surface: null, reason: 'click_without_surface' }
  if (surfaces.size > 1 || hasUnlabelledClick) {
    return { status: 'ambiguous', surface: null, reason: 'conflicting_surface_candidates' }
  }
  if (options.expectedSelection) {
    const selections = new Set(candidates.map((row) => metadataString(row, 'selection')).filter(Boolean))
    const hasUnlabelledSelection = candidates.some((row) => !metadataString(row, 'selection'))
    if (hasUnlabelledSelection || selections.size !== 1 || !selections.has(options.expectedSelection)) {
      return { status: 'ambiguous', surface: null, reason: 'conflicting_or_incompatible_selection' }
    }
  }
  if (options.expectedTier) {
    const incompatibleRecurringProduct = candidates.some((row) => {
      const tier = metadataString(row, 'tier')
      const billing = metadataString(row, 'billing')
      const selection = metadataString(row, 'selection')
      const oneTimeProduct = metadataString(row, 'sku') || metadataString(row, 'pack')
      if (oneTimeProduct) return true
      if (tier !== null && tier !== options.expectedTier) return true
      if (options.expectedBilling && billing !== null && billing !== options.expectedBilling) return true

      // `selection` is the launcher's UI/latch key, not a canonical product
      // field. Most callers use the tier, but History uses its source name and
      // ExitIntent uses `creator` for the canonical `basic` tier. When a
      // caller emits `metadata.tier`, that field governs; only legacy callers
      // without it fall back to an exact selection match. Explicit pack/sku
      // markers always fail closed.
      return tier === null && selection !== options.expectedTier
    })
    if (incompatibleRecurringProduct) {
      return { status: 'ambiguous', surface: null, reason: 'conflicting_or_incompatible_selection' }
    }
  }
  if (candidates.some((row) => !row?.id)) {
    return { status: 'ambiguous', surface: null, reason: 'click_without_stable_event_id' }
  }
  return {
    status: 'exact',
    surface: [...surfaces][0],
    reason: 'same_session_ordered_click',
    evidenceClickIds: [...new Set(candidates.map((row) => String(row.id)))].sort(),
    evidenceClickAtMs: Math.max(...candidates.map((row) => timestamp(row))),
  }
}

export function classifyStart(attempt, starts) {
  if (!attempt.session_id) return { status: 'missing', stripeSessionId: null, startedAt: null, reason: 'attempt_without_browser_session' }
  const attemptAt = timestamp(attempt)
  const candidates = starts.filter((start) => {
    const startAt = timestamp(start)
    return start.user_id === attempt.user_id &&
      start.session_id === attempt.session_id &&
      startAt !== null && startAt >= attemptAt &&
      startAt - attemptAt <= POST_DELIVERY_ORIGIN_MAX_ATTEMPT_TO_START_MS &&
      sameRecurringIntent(attempt, start)
  })
  const stripeSessionIds = new Set(candidates.map((row) => metadataString(row, 'stripe_session_id')).filter(Boolean))
  if (stripeSessionIds.size === 0) return { status: 'missing', stripeSessionId: null, startedAt: null, reason: 'no_ordered_start' }
  if (stripeSessionIds.size > 1) {
    return { status: 'ambiguous', stripeSessionId: null, startedAt: null, reason: 'multiple_start_sessions' }
  }
  const stripeSessionId = [...stripeSessionIds][0]
  const firstStart = candidates.find((row) => metadataString(row, 'stripe_session_id') === stripeSessionId)
  return { status: 'exact', stripeSessionId, startedAt: timestamp(firstStart), reason: 'same_session_ordered_start' }
}

function setSize(rows, selector) {
  return new Set(rows.map(selector).filter(Boolean)).size
}

function revenueByCurrency(rows) {
  const totals = new Map()
  for (const row of rows) {
    const amount = row.payment?.amountMinor
    const currency = row.payment?.currency
    if (!Number.isSafeInteger(amount) || amount <= 0 || !currency) continue
    totals.set(currency, (totals.get(currency) ?? 0) + amount)
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function summarizeOriginSurface(surface, rows) {
  const started = rows.filter((row) => row.start.status === 'exact')
  return {
    surface,
    originAttemptPeople: setSize(rows, (row) => row.userId),
    originCheckoutStartedPeople: setSize(started, (row) => row.userId),
    originCheckoutStartedStripeSessions: setSize(started, (row) => row.start.stripeSessionId),
  }
}

export function buildPostDeliveryCheckoutOriginReport({
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

  const { knownExternal, internal, missingEmail } = externalIdentity(profiles)
  const firstVideos = firstCompletedVideoByUser(videos)
  const orderedEvents = events
    .filter((row) => {
      const at = timestamp(row)
      return at !== null && at >= windowStartMs && at <= generatedAtMs
    })
    .sort(compareRows)
  const externalEvents = orderedEvents.filter((row) => row.user_id && knownExternal.has(row.user_id))
  const clicks = orderedEvents.filter((row) => row.name === 'checkout_cta_clicked')
  const starts = externalEvents.filter(isSubscriptionStart)
  const payments = orderedEvents.filter((row) => row.name === 'payment_success')

  const journeys = externalEvents.filter(isSubscriptionAttempt).map((attempt) => {
    const firstVideo = firstVideos.get(attempt.user_id)
    const surface = classifySurface(attempt, clicks)
    const start = classifyStart(attempt, starts)
    return {
      attemptId: String(attempt.id ?? ''),
      userId: attempt.user_id,
      attemptAt: timestamp(attempt),
      postDelivery: Boolean(firstVideo && timestamp(firstVideo) <= timestamp(attempt)),
      surface,
      start,
      payment: null,
    }
  })

  // One Stripe Session cannot be awarded to two attempts. Repeated server
  // attempts that point at the same idempotent Session remain unresolved.
  const ownersByStripeSession = new Map()
  for (const [index, journey] of journeys.entries()) {
    if (journey.start.status !== 'exact') continue
    const owners = ownersByStripeSession.get(journey.start.stripeSessionId) ?? []
    owners.push(index)
    ownersByStripeSession.set(journey.start.stripeSessionId, owners)
  }
  for (const owners of ownersByStripeSession.values()) {
    if (owners.length < 2) continue
    for (const index of owners) {
      journeys[index].start = { status: 'ambiguous', stripeSessionId: null, startedAt: null, reason: 'shared_start_between_attempts' }
    }
  }

  const paymentsByStripeSession = new Map()
  for (const payment of payments) {
    const stripeSessionId = metadataString(payment, 'stripe_session_id')
    if (!stripeSessionId || metadataString(payment, 'checkout_mode') !== 'subscription') continue
    const sessionPayments = paymentsByStripeSession.get(stripeSessionId) ?? []
    sessionPayments.push(payment)
    paymentsByStripeSession.set(stripeSessionId, sessionPayments)
  }
  for (const journey of journeys) {
    if (journey.start.status !== 'exact') continue
    const payment = (paymentsByStripeSession.get(journey.start.stripeSessionId) ?? [])
      .find((row) => timestamp(row) >= journey.start.startedAt)
    if (!payment) continue
    const amountMinor = metadataMinorAmount(payment, 'amount_total')
    const currency = metadataString(payment, 'currency')?.toLowerCase() ?? null
    journey.payment = {
      status: 'exact',
      amountMinor,
      currency,
    }
  }

  const postDelivery = journeys.filter((journey) => journey.postDelivery)
  const exactSurface = postDelivery.filter((journey) => journey.surface.status === 'exact')
  const exactStarted = exactSurface.filter((journey) => journey.start.status === 'exact')
  const exactPaid = exactStarted.filter((journey) => journey.payment?.status === 'exact')
  const unresolvedPeople = new Set(
    postDelivery
      .filter((journey) => journey.surface.status !== 'exact' || journey.start.status === 'ambiguous')
      .map((journey) => journey.userId),
  )
  const postDeliveryPeople = new Set(postDelivery.map((journey) => journey.userId))
  const unresolvedPeopleRatio = postDeliveryPeople.size > 0
    ? unresolvedPeople.size / postDeliveryPeople.size
    : null

  const surfaceNames = [...new Set(exactSurface.map((journey) => journey.surface.surface))].sort()
  const observationStartedAtMs = exactSurface.length > 0
    ? Math.min(...exactSurface.map((journey) => journey.attemptAt))
    : null
  const observedDays = observationStartedAtMs === null
    ? null
    : (generatedAtMs - observationStartedAtMs) / 86_400_000
  const clickPeople = setSize(exactSurface, (journey) => journey.userId)
  const startedPeople = setSize(exactStarted, (journey) => journey.userId)
  const sampleMet = clickPeople >= POST_DELIVERY_ORIGIN_MINIMUM_CLICK_PEOPLE &&
    startedPeople >= POST_DELIVERY_ORIGIN_MINIMUM_STARTED_PEOPLE
  const durationMet = observedDays !== null && observedDays >= POST_DELIVERY_ORIGIN_MINIMUM_OBSERVATION_DAYS
  const qualityMet = unresolvedPeopleRatio !== null &&
    unresolvedPeopleRatio <= POST_DELIVERY_ORIGIN_MAXIMUM_UNRESOLVED_RATIO
  const exactStartedSessionIds = new Set(exactStarted.map((journey) => journey.start.stripeSessionId))
  const duplicatePaymentRowsInCohort = [...exactStartedSessionIds].reduce(
    (total, stripeSessionId) => total + Math.max(0, (paymentsByStripeSession.get(stripeSessionId) ?? []).length - 1),
    0,
  )
  const recoverySurfaceRows = externalEvents.filter((row) =>
    row.name === 'checkout_cta_clicked' &&
    ['checkout_resume_banner', 'pricing_saved_checkout', 'checkout_cancelled'].includes(metadataString(row, 'surface')),
  )
  const recoverySurfaceNames = [...new Set(recoverySurfaceRows.map((row) => metadataString(row, 'surface')))].sort()

  return {
    schemaVersion: POST_DELIVERY_ORIGIN_REPORT_VERSION,
    generatedAt,
    window: {
      start: windowStart,
      originObservationStartedAt: observationStartedAtMs === null
        ? null
        : new Date(observationStartedAtMs).toISOString(),
      observedDays,
    },
    exclusions: {
      internalProfileRows: internal.size,
      profileRowsMissingEmail: missingEmail.size,
      eventRowsWithUnknownOrAnonymousIdentity: orderedEvents.filter(
        (row) => !row.user_id || !knownExternal.has(row.user_id),
      ).length,
    },
    funnel: {
      externalSubscriptionAttemptPeople: setSize(journeys, (journey) => journey.userId),
      postDeliverySubscriptionAttemptPeople: postDeliveryPeople.size,
      postDeliveryExactSurfacePeople: clickPeople,
      postDeliveryCheckoutStartedPeople: startedPeople,
      postDeliveryStartedStripeSessions: setSize(exactStarted, (journey) => journey.start.stripeSessionId),
    },
    paymentAssociation: {
      paymentObservedForOriginSessionPeople: setSize(exactPaid, (journey) => journey.userId),
      paymentObservedForOriginStripeSessions: setSize(exactPaid, (journey) => journey.start.stripeSessionId),
      revenueMinorByCurrency: revenueByCurrency(exactPaid),
      conversionSurfaceState: 'unknown_without_server_side_resume_correlation',
      rule: 'A paid Stripe Session proves aggregate payment after its origin Session. It does not prove which later recovery surface closed the purchase.',
    },
    uncorrelatedRecoverySignals: {
      people: setSize(recoverySurfaceRows, (row) => row.user_id),
      surfaces: recoverySurfaceNames.map((surface) => ({
        surface,
        people: setSize(
          recoverySurfaceRows.filter((row) => metadataString(row, 'surface') === surface),
          (row) => row.user_id,
        ),
      })),
    },
    attributionQuality: {
      postDeliveryMissingSurfacePeople: setSize(
        postDelivery.filter((journey) => journey.surface.status === 'missing'),
        (journey) => journey.userId,
      ),
      postDeliveryAmbiguousSurfacePeople: setSize(
        postDelivery.filter((journey) => journey.surface.status === 'ambiguous'),
        (journey) => journey.userId,
      ),
      postDeliveryAmbiguousStartPeople: setSize(
        postDelivery.filter((journey) => journey.start.status === 'ambiguous'),
        (journey) => journey.userId,
      ),
      postDeliveryNoStartPeople: setSize(
        exactSurface.filter((journey) => journey.start.status === 'missing'),
        (journey) => journey.userId,
      ),
      unresolvedPeople: unresolvedPeople.size,
      unresolvedPeopleRatio,
      duplicatePaymentRowsInCohort,
      zeroOrUnknownRevenuePaidSessions: setSize(
        exactPaid.filter((journey) => !journey.payment.amountMinor || !journey.payment.currency),
        (journey) => journey.start.stripeSessionId,
      ),
    },
    originSurfaces: surfaceNames.map((surface) => summarizeOriginSurface(
      surface,
      exactSurface.filter((journey) => journey.surface.surface === surface),
    )),
    gate: {
      minimumPostDeliveryClickPeople: POST_DELIVERY_ORIGIN_MINIMUM_CLICK_PEOPLE,
      minimumExactCheckoutStartedPeople: POST_DELIVERY_ORIGIN_MINIMUM_STARTED_PEOPLE,
      minimumObservationDays: POST_DELIVERY_ORIGIN_MINIMUM_OBSERVATION_DAYS,
      maximumUnresolvedPeopleRatio: POST_DELIVERY_ORIGIN_MAXIMUM_UNRESOLVED_RATIO,
      sampleMet,
      durationMet,
      attributionQualityMet: qualityMet,
      state: sampleMet && durationMet && qualityMet ? 'ready_for_origin_surface_diagnosis' : 'collecting',
    },
    note: 'People are distinct authenticated external user_ids with a present non-internal email. Origin surface is linked only by a same-browser-session click that persisted before the attempt; post-attempt click races are ambiguous. Payment is aggregate truth by exact Stripe Session, never conversion-surface attribution. Missing checkout start is a real funnel outcome. Associations are not causal lift.',
  }
}
