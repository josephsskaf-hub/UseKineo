import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildFilm15UpsellReport, FILM15_OFFER_VERSION, FILM15_PAYMENT_WINDOW_MS } from './upsell-filme15-report.mjs'

const deployment = Date.parse('2026-10-26T12:00:00Z'), hour = 3_600_000, day = 24 * hour
const iso = at => new Date(at).toISOString()
const profile = id => ({ id, email: `${id}@external.example` })
let sequence = 0
const event = (name, user, at, metadata = {}, sessionId = 'browser-A') => ({
  id: `event-${++sequence}`, name, user_id: user, session_id: sessionId, created_at: iso(at), metadata,
})
const stamp = (film = 'film-A') => ({ version: FILM15_OFFER_VERSION, source_video_id: film, threshold_seconds: 5 })
const checkoutStamp = (id = 'intent-A', film = 'film-A', stripe = 'cs_live_fixtureA') => ({
  intent_campaign: 'film15_full_version', film_complete_version: FILM15_OFFER_VERSION,
  film_complete_source_video_id: film, film_complete_id: id, stripe_session_id: stripe,
})
function journey(user = 'outside', watchedAt = deployment + hour) {
  const m = checkoutStamp()
  return [
    event('film15_free_film_watched', user, watchedAt, stamp()),
    event('film15_full_offer_clicked', user, watchedAt + hour, stamp()),
    event('checkout_started', user, watchedAt + 2 * hour, m),
    event('payment_success', user, watchedAt + 3 * hour, {
      ...m, source: 'stripe_webhook', checkout_mode: 'subscription', amount_total: 1990, card_trial: false, intro: false,
    }),
  ]
}
const report = (events, opts = {}, build = buildFilm15UpsellReport) => build({
  events, profiles: [profile('outside'), profile('second'), profile('repeat')], deployedAt: iso(deployment),
  generatedAt: iso(deployment + 10 * day), ...opts,
})
function checks(build = buildFilm15UpsellReport) {
  const r = (events, opts) => report(events, opts, build)
  const j = journey()
  let out = r(j)
  assert.equal(out.after.watchedPeople, 1)
  assert.equal(out.after.clickedPeople, 1)
  assert.equal(out.after.paidWithin48hPeople, 1)
  assert.equal(out.after.watchedToPaid48hPercent, 100)
  assert.equal(out.comparisonMature, true)
  assert.equal(r([...j, ...j, ...journey('outside', deployment + day)]).after.watchedPeople, 1, 'people, not remounts/replays')
  assert.equal(r([...j, ...j]).after.paidWithin48hPeople, 1, 'duplicate webhook/session counts once')
  const internal = journey('inside')
  out = r([...j, ...internal, ...journey('missing')], { profiles: [profile('outside'), { id: 'inside', email: 'Josephsskaf+task@gmail.com' }] })
  assert.equal(out.after.watchedPeople, 1)
  assert.equal(out.exclusions.internalPeople, 1)
  assert.equal(out.exclusions.unknownIdentityPeople, 1)
  out = r(j, { generatedAt: iso(deployment + 2 * hour) })
  assert.equal(out.after.watchedPeople, 0)
  assert.equal(out.after.immaturePeople, 1, 'open 48h windows stay outside denominator')
  assert.equal(out.comparisonMature, false)
  const noWatch = j.filter(e => e.name !== 'film15_free_film_watched')
  noWatch.push(event('film15_full_offer_viewed', 'outside', deployment + hour, stamp()))
  assert.equal(r(noWatch).after.watchedPeople, 0, 'offer impression is not a watched film')
  assert.equal(r(noWatch).after.offerPeopleWithoutWatchEvidence, 1)
  const change = (index, fn) => j.map((e, i) => i === index ? fn(structuredClone(e)) : e)
  for (const [label, index, rewrite] of [
    ['other film click', 1, e => { e.metadata.source_video_id = 'other-film'; return e }],
    ['click before watch', 1, e => { e.created_at = iso(deployment); return e }],
    ['other person payment', 3, e => { e.user_id = 'second'; return e }],
    ['other Stripe session', 3, e => { e.metadata.stripe_session_id = 'cs_live_other'; return e }],
    ['other intent', 3, e => { e.metadata.film_complete_id = 'intent-other'; return e }],
    ['other source video payment', 3, e => { e.metadata.film_complete_source_video_id = 'film-other'; return e }],
    ['unrelated campaign', 3, e => { e.metadata.intent_campaign = 'pricing'; return e }],
    ['zero amount', 3, e => { e.metadata.amount_total = 0; return e }],
    ['trial', 3, e => { e.metadata.card_trial = true; return e }],
    ['test Stripe session', 3, e => { e.metadata.stripe_session_id = 'cs_test_fixtureA'; return e }],
    ['browser payment', 3, e => { e.metadata.source = 'browser'; return e }],
    ['late payment', 3, e => { e.created_at = iso(deployment + hour + FILM15_PAYMENT_WINDOW_MS + 1); return e }],
    ['payment before checkout', 3, e => { e.created_at = iso(deployment + 2 * hour); return e }],
    ['missing source id', 0, e => { delete e.metadata.source_video_id; return e }],
    ['missing watched seconds', 0, e => { delete e.metadata.threshold_seconds; return e }],
    ['insufficient watched seconds', 0, e => { e.metadata.threshold_seconds = 0; return e }],
  ]) assert.equal(r(change(index, rewrite)).after.paidWithin48hPeople, 0, label)
  const exact48 = change(3, e => { e.created_at = iso(deployment + hour + FILM15_PAYMENT_WINDOW_MS); return e })
  assert.equal(r(exact48).after.paidWithin48hPeople, 1, 'inclusive 48h deadline')
  const notReset = [...j.filter(e => e.name !== 'payment_success'), ...journey('outside', deployment + 2 * day)]
  assert.equal(r(notReset).after.paidWithin48hPeople, 0, 'repeated watch cannot reset first-person 48h clock')
  assert.equal(r(j.map(e => ({ ...e, metadata: { ...e.metadata, dry_run: true } }))).after.watchedPeople, 0)
  assert.equal(r(j.map(e => ({ ...e, user_id: null }))).after.watchedPeople, 0, 'anonymous session is not a person')
  assert.throws(() => r(j, { deployedAt: 'not-a-date' }))
  assert.throws(() => r(j, { windowDays: 0 }))
  assert.throws(() => r(j, { generatedAt: iso(deployment - day) }))

  const beforeAt = deployment - 3 * day
  const oldMeta = { version: 'film_ready_60s_upsell_v1', video_id: 'old-film', film_seconds: 15 }
  const oldCheckout = { intent_campaign: 'film_ready_60s_upsell', stripe_session_id: 'cs_live_oldfixture' }
  const old = [
    event('film_ready_60s_upsell_shown', 'outside', beforeAt, oldMeta),
    event('result_video_value_sampled', 'outside', beforeAt + hour, {
      version: 'result_video_value_sampled_v1', threshold_seconds: 5, quality_bucket: 'cinematic', duration_bucket: 'under_35s',
    }),
    event('film_ready_60s_upsell_clicked', 'outside', beforeAt + 2 * hour, oldMeta),
    event('checkout_started', 'outside', beforeAt + 3 * hour, oldCheckout),
    event('payment_success', 'outside', beforeAt + 4 * hour, {
      ...oldCheckout, source: 'stripe_webhook', amount_total: 1990, checkout_mode: 'subscription',
    }),
  ]
  out = r([...old, ...j])
  assert.equal(out.before.watchedPeople, 1)
  assert.equal(out.before.clickedPeople, 1)
  assert.equal(out.before.paidWithin48hPeople, 1)
  assert.equal(out.repeatPeopleAcrossPeriods, 1)
  const partial = r([...old, ...j], { generatedAt: iso(deployment + 3 * day) })
  assert.equal(partial.after.watchedPeople, 1, 'partial mature people remain visible')
  assert.equal(partial.comparisonMature, false)
  assert.equal(partial.paidRateChangePercentagePoints, null, 'do not compare a complete baseline with a partial after period')
  assert.equal(Date.parse(out.before.watchWindow.endExclusive) + FILM15_PAYMENT_WINDOW_MS, deployment)
  assert.equal(Date.parse(out.before.watchWindow.endExclusive) - Date.parse(out.before.watchWindow.start), 7 * day)
  assert.equal(r(old.filter(e => e.name !== 'result_video_value_sampled')).before.watchedPeople, 0, 'no fabricated historical watch')
  assert.equal(r(old.map(e => e.name === 'result_video_value_sampled' ? { ...e, session_id: 'other-tab' } : e)).before.watchedPeople, 0, 'legacy exact same session evidence')
  assert.equal(r([...old, event('film_ready_60s_upsell_shown', 'outside', beforeAt, { ...oldMeta, video_id: 'ambiguous-film' })]).before.watchedPeople, 0, 'ambiguous historical film stays unknown')
  assert.equal(r(old.map(e => e.name === 'result_video_value_sampled' ? { ...e, metadata: {} } : e)).before.watchedPeople, 0)
  const unknown = r([])
  assert.equal(unknown.after.watchedToPaid48hPercent, null, 'no denominator is unknown, never zero percent')
}
checks()
// Mutants run in memory. No production file is modified, no network or keys.
const filename = fileURLToPath(new URL('./upsell-filme15-report.mjs', import.meta.url))
const canonicalUrl = pathToFileURL(path.join(path.dirname(filename), 'measurement-helpers.mjs')).href
const source = fs.readFileSync(filename, 'utf8').replace("'./measurement-helpers.mjs'", JSON.stringify(canonicalUrl))
const mutants = [
  ['counts session as person', 'const at = time(event.created_at), userId = text(event.user_id)', 'const at = time(event.created_at), userId = text(event.session_id)'],
  ['includes household', 'if (internal.has(userId))', 'if (false && internal.has(userId))'],
  ['72h window', '48 * 60 * 60 * 1000', '72 * 60 * 60 * 1000'],
  ['includes immature cohort', 'if (watch.at + FILM15_PAYMENT_WINDOW_MS > outcomeEnd)', 'if (false && watch.at + FILM15_PAYMENT_WINDOW_MS > outcomeEnd)'],
  ['payment from another session', '|| session(event) !== session(checkout)', '|| false'],
  ['zero as revenue', 'Number.isSafeInteger(amount) && amount > 0', 'Number.isSafeInteger(amount) && amount >= 0'],
  ['historical impression as watch', "if (event.name !== 'result_video_value_sampled'", "if (event.name !== 'film_ready_60s_upsell_shown'"],
  ['compares partial after period', 'paidRateChangePercentagePoints: comparisonMature &&', 'paidRateChangePercentagePoints:'],
]
for (const [label, before, after] of mutants) {
  assert.equal(source.split(before).length, 2, `unique mutation anchor: ${label}`)
  const modified = source.replace(before, after)
  const module = await import('data:text/javascript;base64,' + Buffer.from(modified).toString('base64'))
  assert.throws(() => checks(module.buildFilm15UpsellReport), undefined, `guardian kills: ${label}`)
}
console.log(`upsell-filme15 funnel: cases pass, ${mutants.length} mutants killed; no source writes`)
