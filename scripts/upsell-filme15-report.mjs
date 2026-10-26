// KINEO-UPSELL-FILME15-2610 — observational person-level funnel, never sessions as people.
import { isInternalMeasurementEmail } from './measurement-helpers.mjs'

export const FILM15_REPORT_VERSION = 'upsell_filme15_2610_report_v1'
export const FILM15_OFFER_VERSION = 'upsell_filme15_2610_v1'
export const FILM15_PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000
export const FILM15_REPORT_EVENTS = Object.freeze([
  'result_video_value_sampled',
  'film_ready_60s_upsell_shown',
  'film_ready_60s_upsell_clicked',
  'film15_free_film_watched',
  'film15_full_offer_viewed',
  'film15_full_offer_clicked',
  'checkout_started',
  'payment_success',
])
const DAY_MS = 86_400_000
const time = value => {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}
const meta = (event, key) => event.metadata?.[key]
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null
const filmId = event => text(meta(event, 'source_video_id')) ?? text(meta(event, 'video_id'))
const campaign = event => text(meta(event, 'intent_campaign'))
const session = event => text(meta(event, 'stripe_session_id'))
const oldCampaign = event => /^film_ready_60s_upsell(?:_email)?$/.test(campaign(event) ?? '')
const currentVersion = event => meta(event, 'version') === FILM15_OFFER_VERSION
const percent = (n, d) => d > 0 ? Math.round(n * 10000 / d) / 100 : null

function paid(event) {
  const amount = Number(meta(event, 'amount_total'))
  return event.name === 'payment_success' && meta(event, 'source') === 'stripe_webhook'
    && /^cs_live_[A-Za-z0-9]+$/.test(session(event) ?? '')
    && Number.isSafeInteger(amount) && amount > 0
    && meta(event, 'card_trial') !== true && meta(event, 'card_trial') !== '1'
    && meta(event, 'intro') !== true && meta(event, 'intro') !== '1'
    && (meta(event, 'checkout_mode') === 'subscription' || meta(event, 'checkout_mode') === 'payment')
}

/** The legacy sampler has no video_id. Accept only a uniquely identified free
 * film offer in the SAME authenticated browser session. Never use delivery or
 * an offer impression alone as proof that the film was watched. */
function legacyWatch(event, personEvents) {
  if (event.name !== 'result_video_value_sampled'
    || meta(event, 'version') !== 'result_video_value_sampled_v1'
    || meta(event, 'quality_bucket') !== 'cinematic'
    || meta(event, 'duration_bucket') !== 'under_35s'
    || !Number.isFinite(Number(meta(event, 'threshold_seconds'))) || Number(meta(event, 'threshold_seconds')) < 5
    || !text(event.session_id)) return null
  const offers = personEvents.filter(row => row.name === 'film_ready_60s_upsell_shown'
    && row.session_id === event.session_id
    && meta(row, 'version') === 'film_ready_60s_upsell_v1'
    && Number(meta(row, 'film_seconds')) > 0 && Number(meta(row, 'film_seconds')) < 35
    && filmId(row))
  const ids = new Set(offers.map(filmId))
  if (ids.size !== 1 || !offers.some(row => row.at <= event.at)) return null
  return { ...event, sourceVideoId: [...ids][0], evidence: 'legacy_unique_free_offer_same_session_and_5s_playback' }
}

function currentWatch(event) {
  return event.name === 'film15_free_film_watched' && currentVersion(event) && filmId(event)
    && Number.isFinite(Number(meta(event, 'threshold_seconds'))) && Number(meta(event, 'threshold_seconds')) >= 5
    ? { ...event, sourceVideoId: filmId(event), evidence: 'free_film_5s_playback_with_source_id' }
    : null
}

function matchesClick(event, watch, period) {
  if (event.at < watch.at || event.at > watch.at + FILM15_PAYMENT_WINDOW_MS) return false
  if (filmId(event) !== watch.sourceVideoId) return false
  return period === 'after'
    ? event.name === 'film15_full_offer_clicked' && currentVersion(event)
    : event.name === 'film_ready_60s_upsell_clicked' && meta(event, 'version') === 'film_ready_60s_upsell_v1'
}

function matchesCheckout(event, watch, click, period) {
  if (event.name !== 'checkout_started' || event.at < click.at
    || event.at > watch.at + FILM15_PAYMENT_WINDOW_MS || !session(event)) return false
  if (period === 'after') return campaign(event) === 'film15_full_version'
    && meta(event, 'film_complete_version') === FILM15_OFFER_VERSION
    && text(meta(event, 'film_complete_id')) !== null
    && meta(event, 'film_complete_source_video_id') === watch.sourceVideoId
  return oldCampaign(event) && Boolean(click.session_id) && event.session_id === click.session_id
}

function matchesPayment(event, watch, checkout, period) {
  if (!paid(event) || event.at < checkout.at || event.at > watch.at + FILM15_PAYMENT_WINDOW_MS
    || session(event) !== session(checkout)) return false
  if (period === 'before') return oldCampaign(event)
  return campaign(event) === 'film15_full_version'
    && meta(event, 'film_complete_version') === FILM15_OFFER_VERSION
    && meta(event, 'film_complete_id') === meta(checkout, 'film_complete_id')
    && meta(event, 'film_complete_source_video_id') === watch.sourceVideoId
}

function cohort({ name, start, end, outcomeEnd, byPerson }) {
  const people = [], immaturePeople = new Set(), missingWatchEvidence = new Set()
  for (const [userId, rows] of byPerson) {
    const watches = rows.map(row => name === 'after' ? currentWatch(row) : legacyWatch(row, rows))
      .filter(row => row && row.at >= start && row.at < end)
    if (!watches.length) {
      if (rows.some(row => row.at >= start && row.at < end && (
        row.name === (name === 'after' ? 'film15_full_offer_viewed' : 'film_ready_60s_upsell_shown')
      ))) missingWatchEvidence.add(userId)
      continue
    }
    // First watched free film per person fixes the denominator and the 48h
    // clock. Remounts, new tabs, replays and repeated checkouts cannot reset it.
    const watch = watches[0]
    if (watch.at + FILM15_PAYMENT_WINDOW_MS > outcomeEnd) {
      immaturePeople.add(userId)
      continue
    }
    const clicks = rows.filter(row => matchesClick(row, watch, name))
    let attributed = null
    for (const click of clicks) {
      const checkouts = rows.filter(row => matchesCheckout(row, watch, click, name))
      for (const checkout of checkouts) {
        const payment = rows.find(row => matchesPayment(row, watch, checkout, name))
        if (payment) { attributed = { click, checkout, payment }; break }
      }
      if (attributed) break
    }
    people.push({
      userId, sourceVideoId: watch.sourceVideoId, watchEvidence: watch.evidence,
      watchedAt: new Date(watch.at).toISOString(),
      clickedAt: clicks[0] ? new Date(clicks[0].at).toISOString() : null,
      paidAt: attributed ? new Date(attributed.payment.at).toISOString() : null,
      stripeSessionId: attributed ? session(attributed.payment) : null,
    })
  }
  const watchedPeople = people.length
  const clickedPeople = people.filter(person => person.clickedAt).length
  const paidWithin48hPeople = people.filter(person => person.paidAt).length
  return {
    watchWindow: { start: new Date(start).toISOString(), endExclusive: new Date(end).toISOString() },
    outcomeCutoff: new Date(outcomeEnd).toISOString(),
    watchedPeople, clickedPeople, paidWithin48hPeople,
    watchedToClickPercent: percent(clickedPeople, watchedPeople),
    clickedToPaid48hPercent: percent(paidWithin48hPeople, clickedPeople),
    watchedToPaid48hPercent: percent(paidWithin48hPeople, watchedPeople),
    immaturePeople: immaturePeople.size,
    offerPeopleWithoutWatchEvidence: missingWatchEvidence.size,
    people: people.sort((a, b) => a.userId.localeCompare(b.userId)),
  }
}

/** Supply the ACTUAL production deployment time. The branch commit date is
 * not exposure. Two equal watch windows, with the baseline's 48h outcome
 * fully BEFORE deployment; the after cohort matures for 48h after each watch. */
export function buildFilm15UpsellReport({ events, profiles, deployedAt, generatedAt, windowDays = 7 }) {
  const deployment = time(deployedAt), now = time(generatedAt)
  if (deployment === null || now === null || deployment > now) throw new Error('Use actual deployedAt and generatedAt ISO timestamps, deployment not in the future')
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 90) throw new Error('windowDays must be an integer from 1 to 90')
  const identities = new Map(), internal = new Set()
  for (const profile of profiles) {
    const userId = text(profile.id), email = text(profile.email)
    if (!userId) continue
    if (email && isInternalMeasurementEmail(email)) internal.add(userId)
    else if (email) identities.set(userId, email)
  }
  for (const userId of internal) identities.delete(userId)
  const byPerson = new Map(), unidentifiable = new Set(), excludedInternal = new Set()
  let excludedAnonymousEvents = 0, excludedBotOrDryRunEvents = 0
  for (const event of events) {
    if (!FILM15_REPORT_EVENTS.includes(event.name)) continue
    const at = time(event.created_at), userId = text(event.user_id)
    if (at === null || at > now) continue
    if (!userId) { excludedAnonymousEvents++; continue }
    if (internal.has(userId)) { excludedInternal.add(userId); continue }
    if (!identities.has(userId)) { unidentifiable.add(userId); continue }
    if (meta(event, 'is_bot') === true || meta(event, 'dry_run') === true) { excludedBotOrDryRunEvents++; continue }
    const rows = byPerson.get(userId) ?? []
    rows.push({ ...event, at })
    byPerson.set(userId, rows)
  }
  for (const rows of byPerson.values()) rows.sort((a, b) => a.at - b.at || String(a.id ?? '').localeCompare(String(b.id ?? '')))
  const windowMs = windowDays * DAY_MS
  const before = cohort({ name: 'before', start: deployment - FILM15_PAYMENT_WINDOW_MS - windowMs,
    end: deployment - FILM15_PAYMENT_WINDOW_MS, outcomeEnd: deployment, byPerson })
  const afterEnd = deployment + windowMs
  const after = cohort({ name: 'after', start: deployment, end: afterEnd, outcomeEnd: now, byPerson })
  const beforePeople = new Set(before.people.map(person => person.userId))
  return {
    version: FILM15_REPORT_VERSION, generatedAt: new Date(now).toISOString(), deployedAt: new Date(deployment).toISOString(),
    classification: 'OBSERVATIONAL_COMPARISON_NOT_CAUSAL',
    unit: 'authenticated_external_person', internalAccountsExcluded: true,
    windowDays, paymentWindowHours: FILM15_PAYMENT_WINDOW_MS / 3_600_000,
    before, after,
    comparisonMature: now >= afterEnd + FILM15_PAYMENT_WINDOW_MS,
    repeatPeopleAcrossPeriods: after.people.filter(person => beforePeople.has(person.userId)).length,
    paidRateChangePercentagePoints: before.watchedToPaid48hPercent !== null && after.watchedToPaid48hPercent !== null
      ? Math.round((after.watchedToPaid48hPercent - before.watchedToPaid48hPercent) * 100) / 100 : null,
    exclusions: { internalPeople: excludedInternal.size, unknownIdentityPeople: unidentifiable.size,
      anonymousEvents: excludedAnonymousEvents, botOrDryRunEvents: excludedBotOrDryRunEvents },
    limitations: [
      'No production deployment is inferred from a branch SHA. Dates are explicit input.',
      'Baseline requires 5s real playback plus one uniquely identified free film offer in the same user/session. Missing or ambiguous historical linkage stays unknown.',
      'Current watched event uses the same 5s visible playback sampler, with a source video id. Offer impressions and completed renders are not watched films.',
      '48h starts at the first qualifying watch per person per period; immature people do not enter the conversion denominator.',
      'Payments require positive amount, live Stripe session, verified webhook, ordered same-person checkout and exact Stripe session linkage. The after period additionally requires the exact film intent and source video.',
      'Equal watch windows are separated by the baseline outcome window. Traffic composition and repeated people may differ; this is not an A/B experiment.',
    ],
  }
}
