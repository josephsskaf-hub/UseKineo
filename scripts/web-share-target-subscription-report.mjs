import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const WEB_SHARE_REPORT_VERSION = 'web_share_target_subscription_v2'
export const WEB_SHARE_CAMPAIGN = 'web_share_target_v1'
export const WEB_SHARE_SOURCE = 'web_share_target'
export const WEB_SHARE_MEDIUM = 'os_share'
export const WEB_SHARE_WINDOW_DAYS = 30
export const WEB_SHARE_MATURITY_DAYS = 7
export const WEB_SHARE_MIN_MATURE_SESSIONS = 5
export const WEB_SHARE_MIN_MATURE_PEOPLE = 5

const DAY_MS = 86_400_000
const INPUT_KINDS = new Set(['title_text', 'title', 'text', 'url_only', 'empty'])
const HANDOFF_STATUSES = new Set(['received', 'url_only', 'empty', 'storage_unavailable', 'invalid_request', 'too_large'])
const SIGNUP_PLACEMENTS = new Set(['result', 'explainer', 'sticky'])
const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])
const ACTIVE_PLANS = new Set(['starter', 'basic', 'creator', 'pro', 'studio', 'autopilot'])
const CONTRACT_KEYS = {
  web_share_target_arrived: ['handoff_status', 'input_kind', 'surface', 'topic_prefilled', 'version'],
  web_share_target_script_generated: ['input_kind', 'surface', 'version'],
  web_share_target_signup_clicked: ['placement', 'surface', 'version'],
}

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null
const clock = (row) => {
  const value = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(value) ? value : null
}
const meta = (row, key) => text(row?.metadata?.[key])
const sortedKeys = (value) => Object.keys(value && typeof value === 'object' && !Array.isArray(value) ? value : {}).sort()

function exactEvent(row, name) {
  if (row?.name !== name || text(row?.path) !== '/free-script-generator') return false
  if (JSON.stringify(sortedKeys(row?.metadata)) !== JSON.stringify([...CONTRACT_KEYS[name]].sort())) return false
  if (meta(row, 'surface') !== 'free_script_generator' || meta(row, 'version') !== WEB_SHARE_CAMPAIGN) return false
  if (name === 'web_share_target_arrived') {
    return INPUT_KINDS.has(meta(row, 'input_kind')) && HANDOFF_STATUSES.has(meta(row, 'handoff_status')) &&
      typeof row.metadata.topic_prefilled === 'boolean'
  }
  if (name === 'web_share_target_signup_clicked') return SIGNUP_PLACEMENTS.has(meta(row, 'placement'))
  return INPUT_KINDS.has(meta(row, 'input_kind'))
}

function inWindow(row, start, end) {
  const value = clock(row)
  return value !== null && value >= start && value <= end
}

function activeSubscription(profile) {
  const plan = text(profile?.plan)?.toLowerCase() ?? null
  return profile?.is_pro === true || ACTIVE_PLANS.has(plan) || Boolean(text(profile?.stripe_subscription_id)) ||
    Boolean(text(profile?.paypal_subscription_id)) || Boolean(text(profile?.paddle_subscription_id))
}

function recurringStart(row) {
  const tier = meta(row, 'tier')
  const billing = meta(row, 'billing')
  return row?.name === 'checkout_started' && Boolean(meta(row, 'stripe_session_id')) &&
    !meta(row, 'sku') && !meta(row, 'pack') && RECURRING_TIERS.has(tier) &&
    RECURRING_BILLING.has(billing) && (tier !== 'autopilot' || billing === 'monthly')
}

function profileIndex(profiles) {
  const grouped = new Map()
  for (const row of profiles) {
    const id = text(row?.id)
    if (id) grouped.set(id, [...(grouped.get(id) ?? []), row])
  }
  return grouped
}

function earliest(rows, predicate, after = -Infinity) {
  return rows.filter(predicate).map(clock).filter((value) => value !== null && value > after).sort((a, b) => a - b)[0] ?? null
}

function revenue(records) {
  const totals = new Map()
  for (const row of records) {
    if (!row.currency || !Number.isSafeInteger(row.amountMinor) || row.amountMinor <= 0) continue
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

export function buildWebShareTargetSubscriptionReport({ generatedAt, windowStart, events, profiles, videos }) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const windowStartMs = Date.parse(String(windowStart ?? ''))
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(windowStartMs) || windowStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  if (![events, profiles, videos].every(Array.isArray)) throw new Error('events, profiles and videos must be arrays')

  const maturityBoundary = generatedAtMs - WEB_SHARE_MATURITY_DAYS * DAY_MS
  const customNames = new Set(Object.keys(CONTRACT_KEYS))
  const customRows = events.filter((row) => customNames.has(row?.name))
  const quality = {
    customRowsMissingSession: customRows.filter((row) => !text(row?.session_id)).length,
    customRowsMissingClock: customRows.filter((row) => clock(row) === null).length,
    rejectedContractRows: customRows.filter((row) => !Object.keys(CONTRACT_KEYS).some((name) => exactEvent(row, name))).length,
    undatableOwnerSessionRows: 0,
    impossibleIdentityTimelinePeople: 0,
    conflictingOwnerSessions: 0,
    missingProfilePeople: 0,
    conflictingProfilePeople: 0,
    missingEmailProfilePeople: 0,
    undatableProfilePeople: 0,
    internalAttributedPeople: 0,
    undatableVideoRows: 0,
    undatableFinancialRows: 0,
    malformedFinancialRows: 0,
    unlinkedSubscriptionPaymentPeople: 0,
  }

  const sessionRows = new Map()
  for (const row of events) {
    const session = text(row?.session_id)
    if (session) sessionRows.set(session, [...(sessionRows.get(session) ?? []), row])
  }
  const arrivals = new Map()
  for (const row of events.filter((candidate) => exactEvent(candidate, 'web_share_target_arrived') && inWindow(candidate, windowStartMs, generatedAtMs))) {
    const session = text(row.session_id)
    if (!session) continue
    if (!arrivals.has(session) || clock(row) < arrivals.get(session).arrivalAt) arrivals.set(session, { session, arrivalAt: clock(row), row })
  }
  quality.undatableOwnerSessionRows = events.filter((row) => arrivals.has(text(row?.session_id)) &&
    text(row?.user_id) && clock(row) === null).length

  const profilesById = profileIndex(profiles)
  const attributedByUser = new Map()
  let scriptGeneratedSessions = 0
  let signupClickedSessions = 0
  for (const arrival of arrivals.values()) {
    const rows = sessionRows.get(arrival.session) ?? []
    arrival.scriptAt = earliest(rows, (row) => exactEvent(row, 'web_share_target_script_generated'), arrival.arrivalAt)
    arrival.signupAt = arrival.scriptAt === null ? null : earliest(rows, (row) => exactEvent(row, 'web_share_target_signup_clicked'), arrival.scriptAt)
    if (arrival.scriptAt !== null) scriptGeneratedSessions += 1
    if (arrival.signupAt !== null) signupClickedSessions += 1
    const ownerRows = rows.filter((row) => {
      const value = clock(row)
      return value !== null && value >= arrival.arrivalAt && value <= generatedAtMs && text(row?.user_id)
    })
    const owners = new Set(ownerRows.map((row) => text(row.user_id)))
    if (owners.size > 1) { quality.conflictingOwnerSessions += 1; continue }
    if (owners.size === 0) continue
    const userId = [...owners][0]
    const profileRows = profilesById.get(userId) ?? []
    if (profileRows.length === 0) { quality.missingProfilePeople += 1; continue }
    if (profileRows.length > 1) { quality.conflictingProfilePeople += 1; continue }
    const profile = profileRows[0]
    if (!text(profile.email)) { quality.missingEmailProfilePeople += 1; continue }
    if (isInternalMeasurementEmail(profile.email)) { quality.internalAttributedPeople += 1; continue }
    const profileAt = clock(profile)
    if (profileAt === null) { quality.undatableProfilePeople += 1; continue }
    const ownerWitnessAt = earliest(ownerRows, (row) => text(row?.user_id) === userId, arrival.arrivalAt - 1)
    if (profileAt > generatedAtMs || ownerWitnessAt === null || profileAt > ownerWitnessAt) {
      quality.impossibleIdentityTimelinePeople += 1
      continue
    }
    const existing = attributedByUser.get(userId)
    if (!existing || arrival.arrivalAt < existing.arrivalAt) attributedByUser.set(userId, { ...arrival, userId, profile, profileAt, ownerWitnessAt })
  }

  const people = [...attributedByUser.values()]
  const financialNames = new Set(['checkout_started', 'payment_success'])
  for (const person of people) {
    const after = Math.max(person.arrivalAt, person.profileAt)
    const ownVideos = videos.filter((row) => row?.user_id === person.userId && row?.status === 'completed')
    if (ownVideos.some((row) => clock(row) === null)) quality.undatableVideoRows += 1
    person.firstVideoAt = ownVideos.map(clock).filter((value) => value !== null && value > after && value <= generatedAtMs).sort((a, b) => a - b)[0] ?? null
    person.mature = person.arrivalAt <= maturityBoundary
    person.kind = person.profileAt > person.arrivalAt ? 'new_acquisition' : 'returning_activation'
    const ownFinancial = events.filter((row) => row?.user_id === person.userId && financialNames.has(row?.name))
    if (ownFinancial.some((row) => clock(row) === null)) quality.undatableFinancialRows += 1
    const afterVideoFinancial = ownFinancial.filter((row) => person.firstVideoAt !== null && clock(row) > person.firstVideoAt)
    quality.malformedFinancialRows += afterVideoFinancial.filter((row) => {
      if (row?.name === 'checkout_started') return !meta(row, 'sku') && !meta(row, 'pack') && !recurringStart(row)
      return row?.name === 'payment_success' && meta(row, 'checkout_mode')?.toLowerCase() === 'subscription' &&
        !meta(row, 'stripe_session_id')
    }).length
    person.checkoutSessions = new Set(ownFinancial.filter((row) => recurringStart(row) && person.firstVideoAt !== null &&
      clock(row) > person.firstVideoAt && clock(row) <= generatedAtMs).map((row) => meta(row, 'stripe_session_id')))
    const unlinked = ownFinancial.some((row) => row?.name === 'payment_success' && meta(row, 'checkout_mode') === 'subscription' &&
      person.firstVideoAt !== null && clock(row) > person.firstVideoAt && !person.checkoutSessions.has(meta(row, 'stripe_session_id')))
    if (unlinked) quality.unlinkedSubscriptionPaymentPeople += 1
  }

  const seededSessions = new Set(people.flatMap((person) => [...person.checkoutSessions]))
  const ledgerEvents = events.filter((row) => financialNames.has(row?.name) && seededSessions.has(meta(row, 'stripe_session_id')))
  quality.undatableFinancialRows += ledgerEvents.filter((row) => clock(row) === null &&
    row?.user_id !== people.find((person) => person.checkoutSessions.has(meta(row, 'stripe_session_id')))?.userId).length
  const ledger = buildSubscriptionRevenueLedger({
    generatedAt: new Date(generatedAtMs).toISOString(), windowStart: new Date(windowStartMs).toISOString(),
    events: ledgerEvents, profiles,
  })
  const paid = []
  for (const person of people) {
    person.paidRecords = ledger.records.filter((row) => person.checkoutSessions.has(row.stripeSessionId) && row.status === 'paid' &&
      row.ownerClass === 'external' && row.ownerUserId === person.userId)
    person.activePaid = activeSubscription(person.profile) && person.paidRecords.length > 0
    if (person.activePaid) paid.push(...person.paidRecords)
  }

  const matureArrivals = [...arrivals.values()].filter((row) => row.arrivalAt <= maturityBoundary).length
  const matureScripts = [...arrivals.values()].filter((row) => row.arrivalAt <= maturityBoundary && row.scriptAt !== null).length
  const maturePeople = people.filter((row) => row.mature)
  const matureVideoPeople = maturePeople.filter((row) => row.firstVideoAt !== null)
  const matureCheckoutPeople = maturePeople.filter((row) => row.checkoutSessions.size > 0)
  const qualityMet = quality.customRowsMissingSession === 0 && quality.customRowsMissingClock === 0 &&
    quality.rejectedContractRows === 0 && quality.undatableOwnerSessionRows === 0 &&
    quality.conflictingOwnerSessions === 0 && quality.missingProfilePeople === 0 && quality.conflictingProfilePeople === 0 &&
    quality.missingEmailProfilePeople === 0 && quality.undatableProfilePeople === 0 && quality.undatableVideoRows === 0 &&
    quality.impossibleIdentityTimelinePeople === 0 && quality.undatableFinancialRows === 0 && quality.malformedFinancialRows === 0 &&
    quality.unlinkedSubscriptionPaymentPeople === 0 && ledger.summary.conflictStripeSessions === 0 &&
    ledger.summary.unlinkedSubscriptionPaymentSessions === 0 && !ledger.records.some((row) => row.status === 'invalid_payment')
  let state = qualityMet ? 'collecting' : 'blocked_quality'
  if (qualityMet && paid.length > 0) state = 'channel_revenue_observed'
  else if (qualityMet && matureArrivals >= WEB_SHARE_MIN_MATURE_SESSIONS && matureScripts === 0) state = 'stop_no_value'
  else if (qualityMet && matureScripts >= WEB_SHARE_MIN_MATURE_SESSIONS && maturePeople.length === 0) state = 'stop_no_identified_user'
  else if (qualityMet && maturePeople.length >= WEB_SHARE_MIN_MATURE_PEOPLE && matureVideoPeople.length === 0) state = 'stop_no_activation'
  else if (qualityMet && matureVideoPeople.length >= WEB_SHARE_MIN_MATURE_PEOPLE && matureCheckoutPeople.length === 0) state = 'stop_no_checkout'
  else if (qualityMet && maturePeople.length >= WEB_SHARE_MIN_MATURE_PEOPLE) state = 'ready_for_decision'

  return {
    schemaVersion: WEB_SHARE_REPORT_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    funnel: {
      arrivalSessions: arrivals.size,
      matureArrivalSessions: matureArrivals,
      scriptGeneratedSessions,
      matureScriptGeneratedSessions: matureScripts,
      signupClickedSessions,
      externalAttributedPeople: people.length,
      newAcquisitionPeople: people.filter((row) => row.kind === 'new_acquisition').length,
      returningActivationPeople: people.filter((row) => row.kind === 'returning_activation').length,
      completedVideoPeople: people.filter((row) => row.firstVideoAt !== null).length,
      recurringCheckoutPeople: people.filter((row) => row.checkoutSessions.size > 0).length,
      exactActiveSubscriberPeople: people.filter((row) => row.activePaid).length,
      exactPaidStripeSessions: paid.length,
      exactRevenueMinorByCurrency: revenue(paid),
    },
    segments: Object.fromEntries(['new_acquisition', 'returning_activation'].map((kind) => {
      const segmentPeople = people.filter((row) => row.kind === kind)
      const segmentPaid = segmentPeople.flatMap((row) => row.activePaid ? row.paidRecords : [])
      return [kind, {
        people: segmentPeople.length,
        completedVideoPeople: segmentPeople.filter((row) => row.firstVideoAt !== null).length,
        recurringCheckoutPeople: segmentPeople.filter((row) => row.checkoutSessions.size > 0).length,
        activeSubscriberPeople: segmentPeople.filter((row) => row.activePaid).length,
        paidStripeSessions: segmentPaid.length,
        revenueMinorByCurrency: revenue(segmentPaid),
      }]
    })),
    quality: { ...quality, ledgerConflictStripeSessions: ledger.summary.conflictStripeSessions,
      ledgerUnlinkedPaymentSessions: ledger.summary.unlinkedSubscriptionPaymentSessions,
      ledgerInvalidPaymentSessions: ledger.records.filter((row) => row.status === 'invalid_payment').length, qualityMet },
    gate: { maturityDays: WEB_SHARE_MATURITY_DAYS, minimumMatureSessions: WEB_SHARE_MIN_MATURE_SESSIONS,
      minimumMaturePeople: WEB_SHARE_MIN_MATURE_PEOPLE, state },
    note: 'Sessions are never people. A person requires one external owner resolved from the same browser session after an exact POST-backed arrival. New acquisition and returning activation are separate. Subscription requires a new completed video, later recurring Checkout, canonical same-Stripe-Session payment and active profile.',
  }
}
