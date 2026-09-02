import {
  isInternalMeasurementEmail,
  readCanonicalStringArray,
} from './measurement-helpers.mjs'

export const B2B_COMMERCIAL_REPORT_VERSION = 'b2b_commercial_funnel_report_v1'
export const B2B_COMMERCIAL_REPORT_WINDOW_DAYS = 30
export const B2B_COMMERCIAL_PACK_PAGE_VERSION = 'agency_bulk_v2_2026_08_27'
export const B2B_COMMERCIAL_MAX_ARRIVAL_TO_CHECKOUT_MS = 24 * 60 * 60 * 1000
export const B2B_COMMERCIAL_MAX_CLICK_TO_ARRIVAL_MS = 5 * 60 * 1000
export const B2B_COMMERCIAL_ENTRY_MINIMUM_IDENTIFIED_PEOPLE = 20
export const B2B_COMMERCIAL_ENTRY_MINIMUM_ANONYMOUS_SESSIONS = 20

const AGENCY_DISTRIBUTION_SOURCE = new URL('../lib/agencyDistribution.ts', import.meta.url)
export const B2B_COMMERCIAL_ALLOWED_ENTRIES = Object.freeze([
  ...readCanonicalStringArray(AGENCY_DISTRIBUTION_SOURCE, 'AGENCY_DISTRIBUTION_ENTRIES'),
  ...readCanonicalStringArray(AGENCY_DISTRIBUTION_SOURCE, 'AGENCY_PACK_ONLY_ENTRIES'),
  'direct',
])
const B2B_COMMERCIAL_ALLOWED_ENTRY_SET = new Set(B2B_COMMERCIAL_ALLOWED_ENTRIES)

export const B2B_COMMERCIAL_EVENT_NAMES = Object.freeze([
  'agency_volume_bridge_viewed',
  'agency_volume_bridge_clicked',
  'pricing_business_path_viewed',
  'pricing_business_path_clicked',
  'footer_business_path_viewed',
  'footer_business_path_clicked',
  'examples_business_proof_bridge_viewed',
  'examples_business_proof_bridge_clicked',
  'enterprise_alternative_business_path_viewed',
  'enterprise_alternative_business_path_clicked',
  'agency_bulk_page_viewed',
  'agency_margin_calculator_viewed',
  'agency_margin_proposal_copied',
  'agency_margin_pack_selected',
  'agency_bulk_pack_clicked',
  'agency_bulk_checkout_cancelled_return_viewed',
  'agency_bulk_checkout_resume_clicked',
  'bulk_checkout_started',
  'bulk_purchase_completed',
  'agency_free_brief_clicked',
  'b2b_brief_viewed',
  'b2b_brief_submitted',
  'client_short_brief_viewed',
  'client_short_brief_generated',
  'client_short_brief_copied',
  'client_short_brief_intake_link_copied',
  'client_short_brief_activation_clicked',
  'client_short_brief_packs_clicked',
  'business_content_plan_viewed',
  'business_content_plan_generated',
  'business_content_plan_copied',
  'business_content_plan_activation_clicked',
  'business_content_plan_packs_clicked',
])

const NAVIGATION_CLICK_NAMES = new Set([
  'agency_volume_bridge_clicked',
  'pricing_business_path_clicked',
  'footer_business_path_clicked',
  'examples_business_proof_bridge_clicked',
  'enterprise_alternative_business_path_clicked',
  'client_short_brief_packs_clicked',
  'business_content_plan_packs_clicked',
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

function validPackPageEntry(row) {
  if (metadataString(row, 'version') !== B2B_COMMERCIAL_PACK_PAGE_VERSION) return null
  const entry = metadataString(row, 'entry')
  return entry && B2B_COMMERCIAL_ALLOWED_ENTRY_SET.has(entry) ? entry : null
}

function compareRows(left, right) {
  return timestamp(left) - timestamp(right) || String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
}

function setSize(rows, selector) {
  return new Set(rows.map(selector).filter(Boolean)).size
}

function externalIdentity(profiles) {
  const knownExternal = new Set()
  const internal = new Set()
  const missingEmail = new Set()
  for (const profile of profiles) {
    if (!profile?.id) continue
    const email = String(profile.email ?? '').trim()
    if (!email) missingEmail.add(profile.id)
    else if (isInternalMeasurementEmail(email)) internal.add(profile.id)
    else knownExternal.add(profile.id)
  }
  return { knownExternal, internal, missingEmail }
}

function actorClass(row, identity) {
  if (!row?.user_id) return 'anonymous'
  if (identity.knownExternal.has(row.user_id)) return 'external'
  if (identity.internal.has(row.user_id)) return 'internal'
  return 'unknown_identified'
}

function stageSummary(name, rows, identity) {
  const stageRows = rows.filter((row) => row.name === name)
  const publicRows = stageRows.filter((row) => ['external', 'anonymous'].includes(actorClass(row, identity)))
  const times = publicRows.map(timestamp).filter((value) => value !== null)
  return {
    name,
    publicEventRows: publicRows.length,
    identifiedExternalPeople: setSize(
      publicRows.filter((row) => actorClass(row, identity) === 'external'),
      (row) => row.user_id,
    ),
    anonymousSessions: setSize(
      publicRows.filter((row) => actorClass(row, identity) === 'anonymous'),
      (row) => row.session_id,
    ),
    firstSeenAt: times.length ? new Date(Math.min(...times)).toISOString() : null,
    lastSeenAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
  }
}

function summarizeByEntry(rows, identity, journeys) {
  const entries = [...new Set([
    ...rows.map(validPackPageEntry).filter(Boolean),
    ...journeys.filter((row) => row.arrival.status === 'exact').map((row) => row.arrival.entry),
  ])].sort()
  return entries.map((entry) => {
    const selected = rows.filter((row) => validPackPageEntry(row) === entry)
    const entryJourneys = journeys.filter(
      (row) => row.arrival.status === 'exact' && row.arrival.entry === entry,
    )
    const identifiedExternalPeople = setSize(
      selected.filter((row) => actorClass(row, identity) === 'external'),
      (row) => row.user_id,
    )
    const anonymousSessions = setSize(
      selected.filter((row) => actorClass(row, identity) === 'anonymous'),
      (row) => row.session_id,
    )
    const checkoutPeople = setSize(entryJourneys, (row) => row.userId)
    const paidPeople = setSize(
      entryJourneys.filter((row) => row.purchase.status === 'exact'),
      (row) => row.userId,
    )
    const sampleMet = (
      identifiedExternalPeople >= B2B_COMMERCIAL_ENTRY_MINIMUM_IDENTIFIED_PEOPLE ||
      anonymousSessions >= B2B_COMMERCIAL_ENTRY_MINIMUM_ANONYMOUS_SESSIONS
    )
    const firstServerSignalObserved = checkoutPeople > 0 || paidPeople > 0
    return {
      entry,
      identifiedExternalPeople,
      anonymousSessions,
      checkoutPeople,
      paidPeople,
      gate: {
        attributableEntry: true,
        sampleMet,
        firstServerSignalObserved,
        state: sampleMet || firstServerSignalObserved
          ? 'ready_for_entry_diagnosis'
          : 'collecting',
      },
    }
  })
}

function exactStripeSession(row) {
  return metadataString(row, 'stripe_session_id')
}

function resolveStarts(rows) {
  const grouped = new Map()
  for (const row of rows) {
    const stripeSessionId = exactStripeSession(row)
    if (!stripeSessionId) continue
    const current = grouped.get(stripeSessionId) ?? []
    current.push(row)
    grouped.set(stripeSessionId, current)
  }
  const starts = []
  let duplicateRows = 0
  const conflictingStripeSessionIds = []
  for (const [stripeSessionId, rowsForSession] of grouped.entries()) {
    const userIds = new Set(rowsForSession.map((row) => row.user_id).filter(Boolean))
    const browserSessions = new Set(rowsForSession.map((row) => row.session_id).filter(Boolean))
    if (userIds.size !== 1 || browserSessions.size > 1) {
      conflictingStripeSessionIds.push(stripeSessionId)
      continue
    }
    duplicateRows += Math.max(0, rowsForSession.length - 1)
    starts.push([...rowsForSession].sort(compareRows)[0])
  }
  return { starts: starts.sort(compareRows), duplicateRows, conflictingStripeSessionIds }
}

function classifyArrival(start, arrivals, identity) {
  const startAt = timestamp(start)
  if (!start.session_id) return { status: 'missing', entry: null, reason: 'checkout_without_browser_session' }
  const candidates = arrivals.filter((arrival) => {
    const arrivalAt = timestamp(arrival)
    return arrival.session_id === start.session_id &&
      arrivalAt !== null && arrivalAt <= startAt &&
      startAt - arrivalAt <= B2B_COMMERCIAL_MAX_ARRIVAL_TO_CHECKOUT_MS &&
      (actorClass(arrival, identity) === 'anonymous' || arrival.user_id === start.user_id)
  })
  const entries = new Set(candidates.map(validPackPageEntry).filter(Boolean))
  if (entries.size === 0) return { status: 'missing', entry: null, reason: 'no_prior_pack_page_arrival' }
  if (entries.size > 1) return { status: 'ambiguous', entry: null, reason: 'multiple_pack_page_entries' }
  const entry = [...entries][0]
  if (entry === 'scope_brief') {
    const sameExternalPerson = candidates.some((arrival) =>
      validPackPageEntry(arrival) === entry &&
      actorClass(arrival, identity) === 'external' &&
      arrival.user_id === start.user_id,
    )
    if (!sameExternalPerson) {
      return {
        status: 'missing',
        entry: null,
        reason: 'scope_brief_requires_same_external_person',
      }
    }
  }
  return {
    status: 'exact',
    entry,
    reason: entry === 'scope_brief'
      ? 'same_external_person_prior_scope_brief_arrival'
      : 'same_browser_session_prior_pack_page_arrival',
  }
}

function purchaseSemantic(row) {
  const amountMinor = metadataMinorAmount(row, 'amount_total')
  const currency = metadataString(row, 'currency')?.toLowerCase() ?? null
  return { amountMinor, currency }
}

function purchaseRowsByStripeSession(rows) {
  const result = new Map()
  for (const row of rows) {
    const stripeSessionId = exactStripeSession(row)
    if (!stripeSessionId) continue
    const current = result.get(stripeSessionId) ?? []
    current.push(row)
    result.set(stripeSessionId, current)
  }
  return result
}

function resolvePurchaseIdentity(rows, identity) {
  if (!rows?.length) return { status: 'missing', actorClass: null, userId: null }
  const actorClasses = new Set(rows.map((row) => actorClass(row, identity)))
  const actorIds = new Set(rows.map((row) => row.user_id ?? '(anonymous)'))
  if (actorClasses.size !== 1 || actorIds.size !== 1) {
    return { status: 'identity_conflict', actorClass: null, userId: null }
  }
  return {
    status: 'exact',
    actorClass: [...actorClasses][0],
    userId: rows[0].user_id ?? null,
  }
}

function resolvePurchase(rows) {
  if (!rows?.length) return { status: 'missing', amountMinor: null, currency: null }
  const semantics = new Map()
  for (const row of rows) {
    const value = purchaseSemantic(row)
    semantics.set(`${value.currency ?? 'null'}:${value.amountMinor ?? 'null'}`, value)
  }
  if (semantics.size > 1) return { status: 'ambiguous', amountMinor: null, currency: null }
  const value = [...semantics.values()][0]
  if (!value.currency || !Number.isSafeInteger(value.amountMinor) || value.amountMinor <= 0) {
    return { status: 'invalid_revenue', amountMinor: value.amountMinor, currency: value.currency }
  }
  return { status: 'exact', ...value }
}

function revenueByCurrency(rows) {
  const totals = new Map()
  for (const row of rows) {
    if (row.purchase.status !== 'exact') continue
    const { currency, amountMinor } = row.purchase
    totals.set(currency, (totals.get(currency) ?? 0) + amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function navigationPersistence(arrivals, navigationClicks) {
  const labelled = arrivals.filter((row) => {
    const entry = validPackPageEntry(row)
    return row.session_id && entry && entry !== 'direct'
  })
  const labelledSessions = new Set(labelled.map((row) => row.session_id))
  const clickSessions = new Set()
  for (const arrival of labelled) {
    const arrivalAt = timestamp(arrival)
    const hasOrderedClick = navigationClicks.some((click) => {
      const clickAt = timestamp(click)
      return click.session_id === arrival.session_id &&
        navigationDestinationEntry(click) === validPackPageEntry(arrival) &&
        clickAt !== null && clickAt <= arrivalAt &&
        arrivalAt - clickAt <= B2B_COMMERCIAL_MAX_CLICK_TO_ARRIVAL_MS
    })
    if (hasOrderedClick) clickSessions.add(arrival.session_id)
  }
  const withoutClick = [...labelledSessions].filter((sessionId) => !clickSessions.has(sessionId))
  return {
    labelledConfirmedArrivalSessions: labelledSessions.size,
    recordedNavigationClickSessions: clickSessions.size,
    labelledArrivalSessionsWithoutRecordedClick: withoutClick.length,
    state: withoutClick.length > 0 ? 'click_signal_incomplete_or_shared_link' : 'no_gap_observed',
    rule: 'A labelled destination-page arrival proves arrival, not a recorded click. A missing click can mean persistence loss or a shared first-party URL and is never treated as causal proof.',
  }
}

function navigationDestinationEntry(row) {
  if (row.name === 'agency_volume_bridge_clicked') return metadataString(row, 'entry')
  if (row.name === 'pricing_business_path_clicked') return 'pricing'
  if (row.name === 'enterprise_alternative_business_path_clicked') return 'heygen_alternative'
  if (row.name === 'client_short_brief_packs_clicked') return 'client_brief'
  if (row.name === 'business_content_plan_packs_clicked') return 'content_plan'
  return null
}

export function buildB2bCommercialFunnelReport({ generatedAt, windowStart, events, profiles }) {
  const generatedAtMs = Date.parse(generatedAt)
  const windowStartMs = Date.parse(windowStart)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }

  const identity = externalIdentity(profiles)
  const sourceWindowStartMs = windowStartMs - B2B_COMMERCIAL_MAX_ARRIVAL_TO_CHECKOUT_MS
  const sourceEvents = events.filter((row) => {
    const at = timestamp(row)
    return at !== null && at >= sourceWindowStartMs && at <= generatedAtMs
  }).sort(compareRows)
  const orderedEvents = sourceEvents.filter((row) => timestamp(row) >= windowStartMs)
  const publicEvents = orderedEvents.filter((row) => ['external', 'anonymous'].includes(actorClass(row, identity)))
  const publicSourceEvents = sourceEvents.filter((row) => ['external', 'anonymous'].includes(actorClass(row, identity)))
  const arrivals = publicEvents.filter((row) =>
    row.name === 'agency_bulk_page_viewed' && validPackPageEntry(row),
  )
  const joinArrivals = publicSourceEvents.filter((row) =>
    row.name === 'agency_bulk_page_viewed' && validPackPageEntry(row),
  )
  const navigationClicks = publicSourceEvents.filter((row) => NAVIGATION_CLICK_NAMES.has(row.name))
  const stageEvents = orderedEvents.filter((row) =>
    row.name !== 'agency_bulk_page_viewed' || Boolean(validPackPageEntry(row)),
  )

  const externalStartRows = orderedEvents.filter((row) =>
    row.name === 'bulk_checkout_started' && actorClass(row, identity) === 'external',
  )
  const allStartRowsByStripeSession = new Map()
  for (const row of orderedEvents.filter((candidate) =>
    candidate.name === 'bulk_checkout_started' && exactStripeSession(candidate),
  )) {
    const stripeSessionId = exactStripeSession(row)
    const current = allStartRowsByStripeSession.get(stripeSessionId) ?? []
    current.push(row)
    allStartRowsByStripeSession.set(stripeSessionId, current)
  }
  const startResolution = resolveStarts(externalStartRows)
  const externalStarts = startResolution.starts
  const allPurchaseRows = orderedEvents.filter((row) => row.name === 'bulk_purchase_completed')
  const purchasesByStripeSession = purchaseRowsByStripeSession(allPurchaseRows)

  const journeys = externalStarts.map((start) => {
    const stripeSessionId = exactStripeSession(start)
    const allStartIdentity = resolvePurchaseIdentity(
      allStartRowsByStripeSession.get(stripeSessionId) ?? [],
      identity,
    )
    const validStartIdentity = allStartIdentity.status === 'exact' &&
      allStartIdentity.actorClass === 'external' &&
      allStartIdentity.userId === start.user_id
    const allMatchingSessionRows = (purchasesByStripeSession.get(stripeSessionId) ?? [])
      .filter((row) => timestamp(row) >= timestamp(start))
    const purchaseIdentity = resolvePurchaseIdentity(allMatchingSessionRows, identity)
    const purchase = validStartIdentity &&
      purchaseIdentity.status === 'exact' &&
      purchaseIdentity.actorClass === 'external' &&
      purchaseIdentity.userId === start.user_id
      ? resolvePurchase(allMatchingSessionRows)
      : allMatchingSessionRows.length
        ? { status: 'identity_conflict', amountMinor: null, currency: null }
        : { status: 'missing', amountMinor: null, currency: null }
    return {
      userId: start.user_id,
      stripeSessionId,
      startAt: timestamp(start),
      arrival: classifyArrival(start, joinArrivals, identity),
      purchase,
      purchaseIdentityMismatchRows: allMatchingSessionRows.filter(
        (row) => actorClass(row, identity) !== 'external' || row.user_id !== start.user_id,
      ).length,
      startIdentityConflict: !validStartIdentity,
    }
  })

  const exactPaidJourneys = journeys.filter((row) => row.purchase.status === 'exact')
  const knownExternalPurchases = []
  const unknownActorPurchases = []
  const conflictingPurchaseStripeSessions = new Set()
  const purchaseIdentityConflictStripeSessions = new Set()
  for (const [stripeSessionId, rows] of purchasesByStripeSession.entries()) {
    const purchaseIdentity = resolvePurchaseIdentity(rows, identity)
    const startRows = allStartRowsByStripeSession.get(stripeSessionId) ?? []
    const startIdentity = resolvePurchaseIdentity(startRows, identity)
    const startContradictsPurchase = startRows.length > 0 && (
      startIdentity.status !== 'exact' ||
      purchaseIdentity.status !== 'exact' ||
      startIdentity.actorClass !== purchaseIdentity.actorClass ||
      startIdentity.userId !== purchaseIdentity.userId
    )
    const identityConflict = purchaseIdentity.status !== 'exact' || startContradictsPurchase
    const purchase = identityConflict
      ? { status: 'identity_conflict', amountMinor: null, currency: null }
      : resolvePurchase(rows)
    if (identityConflict) {
      purchaseIdentityConflictStripeSessions.add(stripeSessionId)
      conflictingPurchaseStripeSessions.add(stripeSessionId)
    }
    if (purchase.status === 'ambiguous') conflictingPurchaseStripeSessions.add(stripeSessionId)
    const record = { stripeSessionId, purchase }
    if (purchaseIdentity.status === 'exact' && purchaseIdentity.actorClass === 'external' && !identityConflict) {
      knownExternalPurchases.push(record)
    } else if (
      purchaseIdentity.status === 'exact' &&
      ['anonymous', 'unknown_identified'].includes(purchaseIdentity.actorClass) &&
      !identityConflict
    ) {
      unknownActorPurchases.push(record)
    }
  }
  for (const journey of journeys) {
    if (journey.purchase.status !== 'identity_conflict') continue
    purchaseIdentityConflictStripeSessions.add(journey.stripeSessionId)
    conflictingPurchaseStripeSessions.add(journey.stripeSessionId)
  }

  const externalRevenueRows = knownExternalPurchases.map((row) => ({ purchase: row.purchase }))
  const observationStartedAtMs = arrivals.length ? Math.min(...arrivals.map(timestamp)) : null
  const observedDays = observationStartedAtMs === null
    ? null
    : (generatedAtMs - observationStartedAtMs) / 86_400_000
  const identifiedArrivalPeople = setSize(
    arrivals.filter((row) => actorClass(row, identity) === 'external'),
    (row) => row.user_id,
  )
  const anonymousArrivalSessions = setSize(
    arrivals.filter((row) => actorClass(row, identity) === 'anonymous'),
    (row) => row.session_id,
  )
  const checkoutPeople = setSize(journeys, (row) => row.userId)
  const entryRows = summarizeByEntry(arrivals, identity, journeys)
  const readyEntries = entryRows.filter((row) => row.gate.state === 'ready_for_entry_diagnosis')

  return {
    schemaVersion: B2B_COMMERCIAL_REPORT_VERSION,
    generatedAt,
    window: {
      start: windowStart,
      packPageObservationStartedAt: observationStartedAtMs === null
        ? null
        : new Date(observationStartedAtMs).toISOString(),
      observedDays,
    },
    exclusions: {
      internalProfileRows: identity.internal.size,
      profileRowsMissingEmail: identity.missingEmail.size,
      internalEventRows: orderedEvents.filter((row) => actorClass(row, identity) === 'internal').length,
      unknownIdentifiedEventRows: orderedEvents.filter((row) => actorClass(row, identity) === 'unknown_identified').length,
    },
    stages: B2B_COMMERCIAL_EVENT_NAMES.map((name) => stageSummary(name, stageEvents, identity)),
    confirmedPackPageArrivals: {
      identifiedExternalPeople: identifiedArrivalPeople,
      anonymousSessions: anonymousArrivalSessions,
      byEntry: entryRows,
    },
    navigationPersistence: navigationPersistence(arrivals, navigationClicks),
    checkout: {
      identifiedExternalPeople: checkoutPeople,
      stripeSessions: setSize(journeys, (row) => row.stripeSessionId),
      exactArrivalPeople: setSize(
        journeys.filter((row) => row.arrival.status === 'exact'),
        (row) => row.userId,
      ),
      ambiguousArrivalPeople: setSize(
        journeys.filter((row) => row.arrival.status === 'ambiguous'),
        (row) => row.userId,
      ),
      missingArrivalPeople: setSize(
        journeys.filter((row) => row.arrival.status === 'missing'),
        (row) => row.userId,
      ),
      byExactEntry: [...new Set(
        journeys.filter((row) => row.arrival.status === 'exact').map((row) => row.arrival.entry),
      )].sort().map((entry) => ({
        entry,
        people: setSize(
          journeys.filter((row) => row.arrival.status === 'exact' && row.arrival.entry === entry),
          (row) => row.userId,
        ),
        stripeSessions: setSize(
          journeys.filter((row) => row.arrival.status === 'exact' && row.arrival.entry === entry),
          (row) => row.stripeSessionId,
        ),
      })),
    },
    payment: {
      externalBuyerPeopleLinkedToWindowStarts: setSize(exactPaidJourneys, (row) => row.userId),
      externalPaidStripeSessionsLinkedToWindowStarts: setSize(exactPaidJourneys, (row) => row.stripeSessionId),
      linkedRevenueMinorByCurrency: revenueByCurrency(exactPaidJourneys),
      allKnownExternalPaidStripeSessionsInWindow: knownExternalPurchases.filter(
        (row) => row.purchase.status === 'exact',
      ).length,
      allKnownExternalRevenueMinorByCurrency: revenueByCurrency(externalRevenueRows),
      unknownActorPaidStripeSessionsInWindow: unknownActorPurchases.filter(
        (row) => row.purchase.status === 'exact',
      ).length,
      conflictingPurchaseStripeSessions: conflictingPurchaseStripeSessions.size,
      rule: 'Revenue is counted once per exact bulk_purchase_completed Stripe Session, grouped by currency. Only a matching server-side bulk_checkout_started event links it to this window funnel.',
    },
    quality: {
      startRowsWithoutStripeSession: externalStartRows.filter((row) => !exactStripeSession(row)).length,
      duplicateStartRows: startResolution.duplicateRows,
      conflictingStartStripeSessions: new Set([
        ...startResolution.conflictingStripeSessionIds,
        ...[...allStartRowsByStripeSession.entries()]
          .filter(([, rows]) => resolvePurchaseIdentity(rows, identity).status === 'identity_conflict')
          .map(([stripeSessionId]) => stripeSessionId),
      ]).size,
      invalidPackPageArrivalRows: publicEvents.filter((row) =>
        row.name === 'agency_bulk_page_viewed' && !validPackPageEntry(row),
      ).length,
      purchaseIdentityMismatchRows: journeys.reduce(
        (total, row) => total + row.purchaseIdentityMismatchRows,
        0,
      ),
      purchaseIdentityConflictStripeSessions: purchaseIdentityConflictStripeSessions.size,
      duplicatePurchaseRows: [...purchasesByStripeSession.values()].reduce(
        (total, rows) => total + Math.max(0, rows.length - 1),
        0,
      ),
    },
    gate: {
      unit: 'entry',
      minimumIdentifiedPeoplePerEntry: B2B_COMMERCIAL_ENTRY_MINIMUM_IDENTIFIED_PEOPLE,
      minimumAnonymousSessionsPerEntry: B2B_COMMERCIAL_ENTRY_MINIMUM_ANONYMOUS_SESSIONS,
      firstServerCheckoutOrPurchaseOverridesSampleGate: true,
      readyEntries: readyEntries.map((row) => row.entry),
      state: readyEntries.length ? 'entry_specific_diagnosis_available' : 'collecting',
    },
    note: 'People are distinct authenticated external user_ids with a present non-internal email. Anonymous browser sessions remain a separate unit and are never added to people. Each entry keeps its own gate: 20 identified people, 20 anonymous sessions, or its first exact server checkout/purchase. Destination-page entry proves a first-party arrival, not acquisition source or causal lift. Click events are signals only. Shared artifacts are multi-actor handoffs and their stages are never assumed to belong to one person. Revenue requires the canonical server-side bulk purchase event and an exact Stripe Session.',
  }
}
