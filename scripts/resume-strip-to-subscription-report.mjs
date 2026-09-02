import { isInternalMeasurementEmail } from './measurement-helpers.mjs'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

export const RESUME_STRIP_REPORT_VERSION = 'resume_strip_to_subscription_v1'
export const RESUME_STRIP_CONTRACT_BOUNDARY = '2026-09-01T12:05:00.000Z'
export const RESUME_STRIP_WINDOW_DAYS = 30
export const RESUME_STRIP_OBSERVATION_DAYS = 7
export const RESUME_STRIP_MIN_MATURE_EXPOSED_PEOPLE = 20
export const RESUME_STRIP_MAX_UNRESOLVED_RATIO = 0.2
export const RESUME_STRIP_EVENT_NAMES = Object.freeze([
  'resume_strip_seen',
  'resume_strip_clicked',
  'series_continuation_landed',
])
export const RESUME_STRIP_FINANCIAL_EVENT_NAMES = Object.freeze([
  'checkout_started',
  'payment_success',
])

const DAY_MS = 86_400_000
const EXACT_SESSION_STATUSES = new Set(['paid', 'unpaid', 'invalid_payment'])
const RECURRING_TIERS = new Set(['starter', 'basic', 'pro', 'autopilot'])
const RECURRING_BILLING = new Set(['monthly', 'annual'])

function timestamp(row) {
  const parsed = Date.parse(String(row?.created_at ?? ''))
  return Number.isFinite(parsed) ? parsed : null
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function exactString(value) {
  return typeof value === 'string' && value.length > 0 && value === value.trim() ? value : null
}

function exactPositiveInteger(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

function compareRows(left, right) {
  return (timestamp(left) ?? Number.POSITIVE_INFINITY) - (timestamp(right) ?? Number.POSITIVE_INFINITY) ||
    String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
}

function identityIndex(profiles, generatedAtMs) {
  const byId = new Map()
  for (const profile of profiles) {
    const id = text(profile?.id)
    if (!id) continue
    const rows = byId.get(id) ?? []
    rows.push(profile)
    byId.set(id, rows)
  }
  const external = new Set()
  const internal = new Set()
  const unknown = new Set()
  const conflict = new Set()
  const invalidClock = new Set()
  const createdAtById = new Map()
  for (const [id, rows] of byId) {
    const emails = new Set(rows.map((row) => String(row?.email ?? '').trim().toLowerCase()))
    const clocks = rows.map(timestamp)
    if (emails.size !== 1) conflict.add(id)
    else {
      const email = [...emails][0]
      if (!email) unknown.add(id)
      else if (isInternalMeasurementEmail(email)) internal.add(id)
      else external.add(id)
    }
    if (clocks.some((at) => at === null || at > generatedAtMs)) invalidClock.add(id)
    else createdAtById.set(id, Math.min(...clocks))
  }
  return { external, internal, unknown, conflict, invalidClock, createdAtById }
}

function videoIndex(videos, effectiveStartMs, matureBeforeMs) {
  const byUser = new Map()
  const ownersByVideo = new Map()
  let ownerlessEligibleRows = 0
  let ownerlessUndatableRows = 0
  for (const row of videos) {
    if (row?.status !== 'completed') continue
    const owner = text(row?.user_id)
    const at = timestamp(row)
    if (!owner) {
      if (at === null) ownerlessUndatableRows += 1
      else if (at >= effectiveStartMs && at <= matureBeforeMs) ownerlessEligibleRows += 1
      continue
    }
    const rows = byUser.get(owner) ?? []
    rows.push(row)
    byUser.set(owner, rows)
    const id = text(row?.id)
    if (id) {
      const owners = ownersByVideo.get(id) ?? new Set()
      owners.add(owner)
      ownersByVideo.set(id, owners)
    }
  }
  for (const rows of byUser.values()) rows.sort(compareRows)
  return { byUser, ownersByVideo, ownerlessEligibleRows, ownerlessUndatableRows }
}

function resolveVideosForUser(userId, videos) {
  const rows = videos.byUser.get(userId) ?? []
  if (!rows.length) return { ok: false, reason: 'no_completed_video' }
  if (rows.some((row) => timestamp(row) === null)) return { ok: false, reason: 'completed_video_without_clock' }
  const firstAt = timestamp(rows[0])
  const firstAtRows = rows.filter((row) => timestamp(row) === firstAt)
  const firstIds = new Set(firstAtRows.map((row) => text(row?.id)))
  if (firstIds.size !== 1 || firstIds.has(null)) return { ok: false, reason: 'first_video_tie_or_missing_id' }
  const first = rows[0]
  const firstId = text(first?.id)
  if ((videos.ownersByVideo.get(firstId)?.size ?? 0) !== 1) return { ok: false, reason: 'first_video_owner_conflict' }
  if (!text(first?.video_url)) return { ok: false, reason: 'first_video_without_url' }
  return { ok: true, rows, first, firstId, firstAt }
}

function stripeSessionId(row) {
  return exactString(row?.metadata?.stripe_session_id)
}

function isRecurringStart(row) {
  const tier = exactString(row?.metadata?.tier)
  const billing = exactString(row?.metadata?.billing)
  return row?.name === 'checkout_started' && stripeSessionId(row) !== null &&
    RECURRING_TIERS.has(tier) && RECURRING_BILLING.has(billing) &&
    (tier !== 'autopilot' || billing === 'monthly') && exactString(row?.metadata?.sku) === null
}

function isUnambiguousPackStart(row) {
  return row?.name === 'checkout_started' && stripeSessionId(row) !== null &&
    exactString(row?.metadata?.sku) !== null && exactString(row?.metadata?.tier) === null &&
    exactString(row?.metadata?.billing) === null
}

function isInvalidCheckoutStart(row) {
  return row?.name === 'checkout_started' && !isRecurringStart(row) && !isUnambiguousPackStart(row)
}

// The checkout start is authoritative for the owner. A payment webhook with a
// null user may inherit that one owner only inside the exact same Stripe Session.
function linkNullPaymentOwners(events) {
  const starts = new Map()
  for (const row of events) {
    if (row?.name !== 'checkout_started') continue
    const session = stripeSessionId(row)
    const userId = text(row?.user_id)
    const at = timestamp(row)
    if (!session || !userId || at === null) continue
    const rows = starts.get(session) ?? []
    rows.push({ userId, at })
    starts.set(session, rows)
  }
  return events.map((row) => {
    if (row?.name !== 'payment_success' || text(row?.user_id)) return row
    const session = stripeSessionId(row)
    const paidAt = timestamp(row)
    if (!session || paidAt === null) return row
    const eligibleStarts = (starts.get(session) ?? []).filter((entry) => entry.at <= paidAt)
    const owners = new Set(eligibleStarts.map((entry) => entry.userId))
    return owners.size === 1 ? { ...row, user_id: [...owners][0] } : row
  })
}

function moneyByCurrency(entries) {
  const totals = new Map()
  for (const entry of entries) {
    if (!entry.currency || !Number.isSafeInteger(entry.amountMinor) || entry.amountMinor <= 0) continue
    totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + entry.amountMinor)
  }
  return Object.fromEntries([...totals.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

function summarize(entries) {
  const paid = entries.filter((entry) => entry.paid)
  return {
    people: new Set(entries.map((entry) => entry.userId)).size,
    stripeSessions: new Set(entries.map((entry) => entry.stripeSessionId)).size,
    paidPeople: new Set(paid.map((entry) => entry.userId)).size,
    paidStripeSessions: new Set(paid.map((entry) => entry.stripeSessionId)).size,
    revenueMinorByCurrency: moneyByCurrency(paid),
  }
}

function sameFirstSemantics(rows) {
  return new Set(rows.map((row) => JSON.stringify({
    path: row?.path,
    session_id: row?.session_id,
    episode: row?.metadata?.episode,
    video_id: row?.metadata?.video_id,
  }))).size === 1
}

function sameFirstLandingSemantics(rows) {
  return new Set(rows.map((row) => JSON.stringify({
    path: row?.path,
    session_id: row?.session_id,
    source: row?.metadata?.source,
    prompt_length: row?.metadata?.prompt_length,
  }))).size === 1
}

function firstAtTimestamp(rows) {
  if (!rows.length) return []
  const firstAt = timestamp(rows[0])
  return rows.filter((row) => timestamp(row) === firstAt)
}

export function buildResumeStripToSubscriptionReport({ generatedAt, windowStart, events, profiles, videos }) {
  const generatedAtMs = Date.parse(String(generatedAt ?? ''))
  const requestedStartMs = Date.parse(String(windowStart ?? ''))
  const boundaryMs = Date.parse(RESUME_STRIP_CONTRACT_BOUNDARY)
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(requestedStartMs) || requestedStartMs > generatedAtMs) {
    throw new Error('generatedAt and windowStart must be valid ordered timestamps')
  }
  const effectiveStartMs = Math.max(requestedStartMs, boundaryMs)
  const observationMs = RESUME_STRIP_OBSERVATION_DAYS * DAY_MS
  const matureBeforeMs = generatedAtMs - observationMs
  const identity = identityIndex(profiles, generatedAtMs)
  const videoData = videoIndex(videos, effectiveStartMs, matureBeforeMs)
  const normalizedEvents = linkNullPaymentOwners(events)
  const validEvents = normalizedEvents.filter((row) => timestamp(row) !== null && timestamp(row) <= generatedAtMs).sort(compareRows)

  const seenByUser = new Map()
  let anonymousSeenRows = 0
  let internalSeenRows = 0
  for (const row of validEvents) {
    if (row?.name !== 'resume_strip_seen') continue
    const at = timestamp(row)
    if (at < effectiveStartMs) continue
    const userId = text(row?.user_id)
    if (!userId) { anonymousSeenRows += 1; continue }
    if (identity.internal.has(userId)) { internalSeenRows += 1; continue }
    const rows = seenByUser.get(userId) ?? []
    rows.push(row)
    seenByUser.set(userId, rows)
  }

  const immatureSeenPeople = new Set()
  const unresolvedExposurePeople = new Set()
  const matureContractSeen = []
  for (const [userId, rows] of seenByUser) {
    rows.sort(compareRows)
    const tied = firstAtTimestamp(rows)
    const seen = rows[0]
    const seenAt = timestamp(seen)
    if (seenAt > matureBeforeMs) { immatureSeenPeople.add(userId); continue }
    if (!identity.external.has(userId) || identity.invalidClock.has(userId) ||
        identity.createdAtById.get(userId) > seenAt || !sameFirstSemantics(tied)) {
      unresolvedExposurePeople.add(userId)
      continue
    }
    const resolved = resolveVideosForUser(userId, videoData)
    const eventSession = exactString(seen?.session_id)
    if (!resolved.ok || !eventSession || seen?.path !== '/' || seen?.metadata?.episode !== 2 ||
        exactString(seen?.metadata?.video_id) !== resolved.firstId || resolved.firstAt >= seenAt ||
        resolved.rows.filter((row) => timestamp(row) <= seenAt).length !== 1) {
      unresolvedExposurePeople.add(userId)
      continue
    }
    matureContractSeen.push({ userId, seen, seenAt, sessionId: eventSession, cutoff: seenAt + observationMs, videos: resolved })
  }

  const preexistingSubscriberPeople = new Set()
  const preexistingRecurringCheckoutPeople = new Set()
  const preexistingSubscriptionUnknownPeople = new Set()
  const acquisition = []
  for (const person of matureContractSeen) {
    const priorEvents = validEvents.filter((row) => timestamp(row) <= person.seenAt)
    const priorLedger = buildSubscriptionRevenueLedger({
      generatedAt: new Date(person.seenAt).toISOString(),
      windowStart: new Date(requestedStartMs).toISOString(),
      events: priorEvents,
      profiles,
    })
    const priorRecords = priorLedger.records.filter((record) => record.ownerUserId === person.userId)
    const hasPriorStart = priorEvents.some((row) => row?.user_id === person.userId && isRecurringStart(row))
    const hasInvalidPriorStart = priorEvents.some((row) => row?.user_id === person.userId && isInvalidCheckoutStart(row))
    const hasPriorPaid = priorRecords.some((record) => record.status === 'paid' &&
      Number.isFinite(Date.parse(String(record.paidAt ?? ''))) && Date.parse(record.paidAt) < person.seenAt)
    const hasRawPriorPayment = priorEvents.some((row) => row?.name === 'payment_success' && row?.user_id === person.userId &&
      text(row?.metadata?.checkout_mode)?.toLowerCase() === 'subscription' && timestamp(row) <= person.seenAt)
    if (hasPriorPaid) { preexistingSubscriberPeople.add(person.userId); continue }
    if (hasPriorStart) { preexistingRecurringCheckoutPeople.add(person.userId); continue }
    if (hasRawPriorPayment || hasInvalidPriorStart) { preexistingSubscriptionUnknownPeople.add(person.userId); continue }
    acquisition.push(person)
  }

  const clickedPeople = new Set()
  const landedPeople = new Set()
  const secondVideoPeople = new Set()
  const seenNoClickPeople = new Set()
  const clickNoLandingPeople = new Set()
  const landingNoSecondVideoPeople = new Set()
  const landedWithoutRecordedClickPeople = new Set()
  const unresolvedJourneyPeople = new Set()
  const undatableJourneyClockPeople = new Set()
  const undatableFinancialClockPeople = new Set()
  const ambiguousFirstSessionPeople = new Set()
  const invalidPaymentPeople = new Set()
  const invalidRecurringStartPeople = new Set()
  const unlinkedPaymentPeople = new Set()
  const ledgerConflictSessions = new Set()
  const sessionsBeforeClick = []
  const sessionsAtStageTimestamp = []
  const sessionsBetweenClickAndLanding = []
  const sessionsBetweenLandingAndSecondVideo = []
  const sessionsAfterSecondVideo = []
  const allExactSessions = []
  const laterExactSessions = []

  for (const person of acquisition) {
    const rawUserEvents = events.filter((row) => text(row?.user_id) === person.userId)
    if (rawUserEvents.some((row) => RESUME_STRIP_EVENT_NAMES.includes(row?.name) && timestamp(row) === null)) {
      undatableJourneyClockPeople.add(person.userId)
      unresolvedJourneyPeople.add(person.userId)
    }
    const clicks = validEvents.filter((row) => row?.name === 'resume_strip_clicked' && row?.user_id === person.userId &&
      timestamp(row) >= person.seenAt && timestamp(row) <= person.cutoff).sort(compareRows)
    const click = clicks[0] ?? null
    const clickAt = click ? timestamp(click) : null
    const clickValid = Boolean(click && clickAt > person.seenAt && click?.path === '/' &&
      exactString(click?.session_id) === person.sessionId && click?.metadata?.episode === 2 &&
      exactString(click?.metadata?.video_id) === person.videos.firstId && sameFirstSemantics(firstAtTimestamp(clicks)))
    if (click && !clickValid) unresolvedJourneyPeople.add(person.userId)
    if (clickValid) clickedPeople.add(person.userId)
    else seenNoClickPeople.add(person.userId)

    const journeyLandings = validEvents.filter((row) => row?.name === 'series_continuation_landed' &&
      row?.user_id === person.userId && exactString(row?.session_id) === person.sessionId &&
      timestamp(row) >= person.seenAt && timestamp(row) <= person.cutoff).sort(compareRows)
    if (!clickValid && journeyLandings.some((row) => row?.metadata?.source === 'landing_resume_strip')) {
      landedWithoutRecordedClickPeople.add(person.userId)
    }
    const landing = clickValid ? journeyLandings[0] ?? null : null
    const landingAt = landing ? timestamp(landing) : null
    const landingValid = Boolean(landing && landingAt > clickAt && landing?.path === '/studio/create' &&
      landing?.metadata?.source === 'landing_resume_strip' &&
      exactString(landing?.session_id) === person.sessionId && exactPositiveInteger(landing?.metadata?.prompt_length) !== null &&
      sameFirstLandingSemantics(firstAtTimestamp(journeyLandings)))
    if (landing && !landingValid) unresolvedJourneyPeople.add(person.userId)
    if (landingValid) landedPeople.add(person.userId)
    else if (clickValid) clickNoLandingPeople.add(person.userId)

    const second = person.videos.rows[1] ?? null
    const secondAt = second ? timestamp(second) : null
    let secondValid = false
    if (landingValid && second) {
      const tiedSecond = person.videos.rows.filter((row) => timestamp(row) === secondAt)
      const tiedIds = new Set(tiedSecond.map((row) => text(row?.id)))
      secondValid = secondAt > landingAt && secondAt <= person.cutoff && tiedIds.size === 1 &&
        text(second?.id) !== person.videos.firstId && text(second?.video_url) !== null &&
        (videoData.ownersByVideo.get(text(second?.id))?.size ?? 0) === 1
      if (!secondValid && secondAt === landingAt) unresolvedJourneyPeople.add(person.userId)
    }
    if (secondValid) secondVideoPeople.add(person.userId)
    else if (landingValid) landingNoSecondVideoPeople.add(person.userId)

    const personCutoffEvents = validEvents.filter((row) => timestamp(row) <= person.cutoff)
    const personLedger = buildSubscriptionRevenueLedger({
      generatedAt: new Date(person.cutoff).toISOString(),
      windowStart: new Date(requestedStartMs).toISOString(),
      events: personCutoffEvents,
      profiles,
    })
    const recurringStarts = personCutoffEvents.filter((row) => row?.user_id === person.userId &&
      isRecurringStart(row) && timestamp(row) > person.seenAt && timestamp(row) <= person.cutoff)
    const invalidStarts = personCutoffEvents.filter((row) => row?.user_id === person.userId &&
      isInvalidCheckoutStart(row) && timestamp(row) > person.seenAt && timestamp(row) <= person.cutoff)
      .sort(compareRows)
    if (invalidStarts.length) {
      invalidRecurringStartPeople.add(person.userId)
    }
    const startAtBySession = new Map()
    for (const row of recurringStarts) {
      const session = stripeSessionId(row)
      const at = timestamp(row)
      const previous = startAtBySession.get(session)
      if (previous === undefined || at < previous) startAtBySession.set(session, at)
    }
    const knownSessions = new Set(startAtBySession.keys())
    const ownedCheckoutSessions = new Set(personCutoffEvents.filter((row) => row?.name === 'checkout_started' &&
      text(row?.user_id) === person.userId && timestamp(row) <= person.cutoff)
      .map((row) => stripeSessionId(row)).filter(Boolean))
    const records = personLedger.records.filter((record) => knownSessions.has(record.stripeSessionId))
    const relatedConflictEntries = personLedger.records.flatMap((record) => {
      if (record.status !== 'conflict') return []
      const relatedRows = personCutoffEvents.filter((row) => stripeSessionId(row) === record.stripeSessionId &&
        text(row?.user_id) === person.userId && timestamp(row) > person.seenAt && timestamp(row) <= person.cutoff)
      if (!relatedRows.length) return []
      ledgerConflictSessions.add(record.stripeSessionId)
      return [{ record, firstAt: Math.min(...relatedRows.map((row) => timestamp(row))) }]
    })
    const hasUndatableFinancialEvidence = events.some((row) => RESUME_STRIP_FINANCIAL_EVENT_NAMES.includes(row?.name) &&
      timestamp(row) === null && (text(row?.user_id) === person.userId || ownedCheckoutSessions.has(stripeSessionId(row))))
    if (hasUndatableFinancialEvidence) {
      undatableFinancialClockPeople.add(person.userId)
    }
    const relatedUnlinked = personLedger.records.filter((record) => record.status === 'unlinked_payment' &&
      record.ownerUserId === person.userId && personCutoffEvents.some((row) => row?.name === 'payment_success' &&
        stripeSessionId(row) === record.stripeSessionId && timestamp(row) > person.seenAt && timestamp(row) <= person.cutoff))
    if (relatedUnlinked.length) unlinkedPaymentPeople.add(person.userId)
    for (const record of records) {
      const startedAt = startAtBySession.get(record.stripeSessionId)
      if (record.status === 'conflict') {
        ledgerConflictSessions.add(record.stripeSessionId)
      }
      if (record.status === 'invalid_payment' && Number.isFinite(startedAt)) {
        invalidPaymentPeople.add(person.userId)
      }
    }
    const candidates = records
      .map((record) => ({ record, startedAt: startAtBySession.get(record.stripeSessionId) }))
      .filter((entry) => Number.isFinite(entry.startedAt))
      .sort((a, b) => a.startedAt - b.startedAt || String(a.record.stripeSessionId).localeCompare(String(b.record.stripeSessionId)))
    const exact = candidates.filter((entry) => EXACT_SESSION_STATUSES.has(entry.record.status))
    for (const entry of exact) {
      const paidAt = Date.parse(String(entry.record.paidAt ?? ''))
      allExactSessions.push({
        userId: person.userId,
        stripeSessionId: entry.record.stripeSessionId,
        paid: entry.record.status === 'paid' && Number.isFinite(paidAt) && paidAt >= entry.startedAt && paidAt <= person.cutoff,
        amountMinor: entry.record.amountMinor,
        currency: entry.record.currency,
      })
    }
    const firstInvalidAt = invalidStarts.length ? timestamp(invalidStarts[0]) : null
    const firstRelatedConflictAt = relatedConflictEntries.length
      ? Math.min(...relatedConflictEntries.map((entry) => entry.firstAt))
      : null
    const firstBlockingAt = [firstInvalidAt, firstRelatedConflictAt]
      .filter((value) => value !== null)
      .reduce((minimum, value) => Math.min(minimum, value), Infinity)
    if (hasUndatableFinancialEvidence || (Number.isFinite(firstBlockingAt) &&
      (!candidates.length || firstBlockingAt <= candidates[0].startedAt))) {
      laterExactSessions.push(...exact.filter((entry) => hasUndatableFinancialEvidence || entry.startedAt >= firstBlockingAt).map((entry) => ({
        userId: person.userId,
        stripeSessionId: entry.record.stripeSessionId,
        paid: entry.record.status === 'paid' && Number.isFinite(Date.parse(String(entry.record.paidAt ?? ''))) &&
          Date.parse(entry.record.paidAt) <= person.cutoff,
        amountMinor: entry.record.amountMinor,
        currency: entry.record.currency,
      })))
      continue
    }
    if (candidates.length > 1 && candidates[0].startedAt === candidates[1].startedAt) {
      ambiguousFirstSessionPeople.add(person.userId)
      continue
    }
    const anchor = candidates[0] ?? null
    if (!anchor) continue
    laterExactSessions.push(...exact.filter((entry) => entry.startedAt > anchor.startedAt).map((entry) => ({
      userId: person.userId,
      stripeSessionId: entry.record.stripeSessionId,
      paid: entry.record.status === 'paid' && Number.isFinite(Date.parse(String(entry.record.paidAt ?? ''))) &&
        Date.parse(entry.record.paidAt) <= person.cutoff,
      amountMinor: entry.record.amountMinor,
      currency: entry.record.currency,
    })))
    if (anchor.record.status === 'conflict') continue
    const primary = {
      userId: person.userId,
      stripeSessionId: anchor.record.stripeSessionId,
      paid: anchor.record.status === 'paid' && Number.isFinite(Date.parse(String(anchor.record.paidAt ?? ''))) &&
        Date.parse(anchor.record.paidAt) >= anchor.startedAt && Date.parse(anchor.record.paidAt) <= person.cutoff,
      amountMinor: anchor.record.amountMinor,
      currency: anchor.record.currency,
    }
    if (!clickValid || anchor.startedAt < clickAt) sessionsBeforeClick.push(primary)
    else if (anchor.startedAt === clickAt || (landingValid && anchor.startedAt === landingAt) || (second && anchor.startedAt === secondAt)) {
      sessionsAtStageTimestamp.push(primary)
    } else if (!landingValid || anchor.startedAt < landingAt) sessionsBetweenClickAndLanding.push(primary)
    else if (!secondValid || anchor.startedAt < secondAt) sessionsBetweenLandingAndSecondVideo.push(primary)
    else sessionsAfterSecondVideo.push(primary)
  }

  const unresolvedPeople = new Set([
    ...unresolvedExposurePeople,
    ...unresolvedJourneyPeople,
    ...undatableJourneyClockPeople,
    ...undatableFinancialClockPeople,
    ...ambiguousFirstSessionPeople,
    ...invalidPaymentPeople,
    ...invalidRecurringStartPeople,
    ...unlinkedPaymentPeople,
  ])
  const qualityDenominator = acquisition.length + unresolvedExposurePeople.size
  const unresolvedRatio = qualityDenominator ? unresolvedPeople.size / qualityDenominator : null
  const qualityBlocked = videoData.ownerlessEligibleRows > 0 || videoData.ownerlessUndatableRows > 0 ||
    ledgerConflictSessions.size > 0 || undatableJourneyClockPeople.size > 0 || undatableFinancialClockPeople.size > 0 ||
    ambiguousFirstSessionPeople.size > 0 || invalidPaymentPeople.size > 0 ||
    invalidRecurringStartPeople.size > 0 ||
    unlinkedPaymentPeople.size > 0 ||
    (unresolvedRatio !== null && unresolvedRatio > RESUME_STRIP_MAX_UNRESOLVED_RATIO)
  const primary = summarize(sessionsAfterSecondVideo)
  let gateState = 'collecting'
  if (qualityBlocked) gateState = 'blocked_data_quality'
  else if (primary.paidPeople > 0) gateState = 'ready_for_reconciliation'
  else if (acquisition.length >= RESUME_STRIP_MIN_MATURE_EXPOSED_PEOPLE) gateState = 'ready_for_diagnosis'

  return {
    schemaVersion: RESUME_STRIP_REPORT_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),
    requestedWindowStart: new Date(requestedStartMs).toISOString(),
    effectiveWindowStart: new Date(effectiveStartMs).toISOString(),
    contractBoundary: RESUME_STRIP_CONTRACT_BOUNDARY,
    observationDays: RESUME_STRIP_OBSERVATION_DAYS,
    classification: 'temporal_assist_not_causal_attribution',
    primaryFunnel: {
      matureExternalFirstVideoExposedPeople: acquisition.length,
      resumeStripClickedPeople: clickedPeople.size,
      exactContinuationLandedPeople: landedPeople.size,
      secondPersistedCompletedVideoAfterLandingPeople: secondVideoPeople.size,
      firstExactRecurringSessionAfterSecondVideo: primary,
    },
    chronology: {
      seenWithoutRecordedClickPeople: seenNoClickPeople.size,
      clickWithoutExactLandingPeople: clickNoLandingPeople.size,
      exactLandingWithoutSecondPersistedVideoPeople: landingNoSecondVideoPeople.size,
      exactLandingWithoutRecordedClickPeople: landedWithoutRecordedClickPeople.size,
      firstSessionBeforeClick: summarize(sessionsBeforeClick),
      firstSessionAtStageTimestamp: summarize(sessionsAtStageTimestamp),
      firstSessionBetweenClickAndLanding: summarize(sessionsBetweenClickAndLanding),
      firstSessionBetweenLandingAndSecondVideo: summarize(sessionsBetweenLandingAndSecondVideo),
      totalPostExposureExactRecurring: summarize(allExactSessions),
      laterExactRecurringNotUsedAsPersonAnchor: summarize(laterExactSessions),
    },
    exclusionsAndQuality: {
      immatureFirstExposurePeople: immatureSeenPeople.size,
      preexistingSubscriberPeople: preexistingSubscriberPeople.size,
      preexistingRecurringCheckoutPeople: preexistingRecurringCheckoutPeople.size,
      preexistingSubscriptionUnknownPeople: preexistingSubscriptionUnknownPeople.size,
      unresolvedExposurePeople: unresolvedExposurePeople.size,
      unresolvedJourneyPeople: unresolvedJourneyPeople.size,
      anonymousSeenRows,
      internalSeenRows,
      ownerlessEligibleCompletedVideoRows: videoData.ownerlessEligibleRows,
      ownerlessUndatableCompletedVideoRows: videoData.ownerlessUndatableRows,
      undatableJourneyClockPeople: undatableJourneyClockPeople.size,
      undatableFinancialClockPeople: undatableFinancialClockPeople.size,
      ambiguousFirstSessionPeople: ambiguousFirstSessionPeople.size,
      invalidRecurringPaymentPeople: invalidPaymentPeople.size,
      invalidRecurringStartPeople: invalidRecurringStartPeople.size,
      unlinkedRecurringPaymentPeople: unlinkedPaymentPeople.size,
      cohortLedgerConflictStripeSessions: ledgerConflictSessions.size,
      unresolvedPeople: unresolvedPeople.size,
      unresolvedRatio,
      qualityBlocked,
    },
    gate: {
      state: gateState,
      minimumMatureExposedPeople: RESUME_STRIP_MIN_MATURE_EXPOSED_PEOPLE,
      matureExposedPeople: acquisition.length,
      uiChangeAuthorized: false,
    },
    note: 'Client exposure and landing signals are temporal assistance, not causal proof. The first exact recurring Stripe Session after exposure anchors the person; a later paid Session never replaces it. Output is aggregate and contains no person, video, browser-session, or Stripe-Session identifiers.',
  }
}
