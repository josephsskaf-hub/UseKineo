#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  FIRST_VIDEO_FILE_VALUE_CONTRACT_BOUNDARY,
  FIRST_VIDEO_FILE_VALUE_REPORT_VERSION,
  buildFirstVideoFileValueToSubscriptionReport,
} from './first-video-file-value-to-subscription-report.mjs'
import { unwrapFirstVideoFileValueResult } from './measure-first-video-file-value-to-subscription.mjs'

let checks = 0
function equal(actual, expected, message) { checks += 1; assert.deepEqual(actual, expected, message) }
function check(actual, message) { checks += 1; assert.ok(actual, message) }

const boundaryMs = Date.parse(FIRST_VIDEO_FILE_VALUE_CONTRACT_BOUNDARY)
const at = (day, minute = 0) => new Date(boundaryMs + day * 86_400_000 + minute * 60_000).toISOString()
const profile = (id, email) => ({ id, email, created_at: at(-100) })
const video = (id, user, day, minute = 0, extra = {}) => ({
  id, user_id: user, status: 'completed', video_url: 'https://cdn.example/' + id + '.mp4', created_at: at(day, minute), ...extra,
})
const event = (id, name, user, day, minute, metadata = {}, session = null) => ({
  id, name, user_id: user, session_id: session, created_at: at(day, minute), metadata,
})
const blob = (id, user, videoId, day, minute, extra = {}) => event(id, 'video_downloaded', user, day, minute, {
  method: 'blob', bytes: 1234, video_id: videoId, surface: 'done_screen', ...extra,
})
const start = (id, user, stripe, day, minute, extra = {}) => event(id, 'checkout_started', user, day, minute, {
  stripe_session_id: stripe, tier: 'starter', billing: 'monthly', ...extra,
}, 'browser-' + user)
const paid = (id, user, stripe, day, minute, amount = 1500, currency = 'usd', extra = {}) => event(id, 'payment_success', user, day, minute, {
  checkout_mode: 'subscription', stripe_session_id: stripe, amount_total: amount, currency, ...extra,
})

function report({ generatedDay = 30, windowStartDay = 0, profiles = [], videos = [], events = [] }) {
  return buildFirstVideoFileValueToSubscriptionReport({
    generatedAt: at(generatedDay),
    windowStart: at(windowStartDay),
    profiles,
    videos,
    events,
  })
}

const baseProfiles = [
  profile('blob-user', 'blob@example.com'),
  profile('no-signal', 'no-signal@example.com'),
  profile('before-user', 'before@example.com'),
  profile('equal-user', 'equal@example.com'),
  profile('missing-id', 'missing@example.com'),
  profile('second-only', 'second@example.com'),
  profile('preexisting', 'preexisting@example.com'),
  profile('internal', 'josephsskaf@gmail.com'),
  profile('unknown', ''),
]
const baseVideos = [
  video('v-blob', 'blob-user', 1),
  video('v-no', 'no-signal', 2),
  video('v-before', 'before-user', 3),
  video('v-equal', 'equal-user', 4),
  video('v-missing', 'missing-id', 5),
  video('v-second-first', 'second-only', 6),
  video('v-second-two', 'second-only', 7),
  video('v-pre', 'preexisting', 8),
  video('v-internal', 'internal', 1),
  video('v-unknown', 'unknown', 1),
]
const baseEvents = [
  blob('d-blob', 'blob-user', 'v-blob', 1, 10),
  start('s-blob', 'blob-user', 'cs-blob', 1, 20),
  paid('p-blob', 'blob-user', 'cs-blob', 1, 30, 1500, 'usd'),
  start('s-no', 'no-signal', 'cs-no', 2, 20),
  paid('p-no', 'no-signal', 'cs-no', 2, 30, 900, 'eur'),
  start('s-before', 'before-user', 'cs-before', 3, 10),
  blob('d-before', 'before-user', 'v-before', 3, 20),
  paid('p-before', 'before-user', 'cs-before', 3, 30, 700, 'usd'),
  blob('d-equal', 'equal-user', 'v-equal', 4, 10),
  start('s-equal', 'equal-user', 'cs-equal', 4, 10),
  paid('p-equal', 'equal-user', 'cs-equal', 4, 20, 500, 'usd'),
  event('d-missing', 'video_downloaded', 'missing-id', 5, 10, { method: 'blob', bytes: 10, surface: 'history' }),
  blob('d-second', 'second-only', 'v-second-two', 7, 10),
  start('pre-s', 'preexisting', 'cs-pre', -1, 10),
  paid('pre-p', 'preexisting', 'cs-pre', -1, 20),
]

const base = report({ profiles: baseProfiles, videos: baseVideos, events: baseEvents })
equal(base.schemaVersion, FIRST_VIDEO_FILE_VALUE_REPORT_VERSION, 'schema version is explicit')
equal(base.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 6, 'preexisting, internal and unknown profiles do not enter mature acquisition cohort')
equal(base.primaryFunnel.confirmedClientBlobSignalPeople, 3, 'exact blob signals include after, before and equal-timestamp people')
equal(base.primaryFunnel.exactRecurringCheckoutAfterBlob.identifiedExternalPeople, 1, 'only strict blob-before-checkout enters primary chain')
equal(base.primaryFunnel.exactRecurringCheckoutAfterBlob.stripeSessions, 1, 'primary sessions are exact and not duplicated')
equal(base.primaryFunnel.exactRecurringCheckoutAfterBlob.exactPaidPeople, 1, 'same-session exact payment counts once')
equal(base.primaryFunnel.exactRecurringCheckoutAfterBlob.exactRevenueMinorByCurrency, { usd: 1500 }, 'primary revenue stays in minor units by currency')
equal(base.comparison.noConfirmedBlobSignalPeople, 2, 'absence is labeled no confirmed signal, excluding unresolved')
equal(base.comparison.unresolvedBlobSignalPeople, 1, 'missing video id is unresolved')
equal(base.comparison.exactRecurringCheckoutWithoutConfirmedBlob.identifiedExternalPeople, 1, 'checkout without confirmed signal is a separate comparator')
equal(base.comparison.exactRecurringCheckoutWithoutConfirmedBlob.exactRevenueMinorByCurrency, { eur: 900 }, 'comparison currency is never mixed with USD')
equal(base.comparison.exactRecurringCheckoutBeforeBlob.identifiedExternalPeople, 1, 'checkout before blob is separated')
equal(base.comparison.exactRecurringCheckoutBeforeBlob.exactPaidPeople, 1, 'payment may be exact while sequence remains before blob')
equal(base.comparison.exactRecurringCheckoutAtBlobTimestamp.identifiedExternalPeople, 1, 'equal persisted timestamps remain ambiguous')
equal(base.comparison.blobPersistedAfterEarlierCheckoutPeople, 1, 'reverse order is visible')
equal(base.exclusionsAndDiagnostics.preexistingExactSubscriberPeople, 1, 'preexisting exact payer is excluded from acquisition')
equal(base.exclusionsAndDiagnostics.missingDownloadVideoIdPeople, 1, 'missing video id is explicit')
equal(base.exclusionsAndDiagnostics.onlySecondOrForeignVideoSignalsPeople, 1, 'second-video-only signal never becomes first-video value')
equal(base.exclusionsAndDiagnostics.internalProfileIdsExcluded, 1, 'internal profile is excluded')
equal(base.exclusionsAndDiagnostics.unknownProfileIds, 1, 'blank email is unknown, not external')
equal(base.quality.clientSignalIsNotCausalOrFinancialProof, true, 'report disclaims causal proof')
equal(base.quality.createdAtMeansPersistedCompletedRowNotPhysicalDelivery, true, 'report names the actual clock')
equal(base.quality.equalDownloadAndCheckoutTimestampsAreAmbiguous, true, 'no timestamp tolerance is invented')
equal(base.gate.neverAuthorizesProductChange, true, 'diagnosis never authorizes product changes')

const boundary = report({
  profiles: [profile('exact', 'exact@example.com'), profile('old', 'old@example.com'), profile('second', 'second-window@example.com')],
  videos: [video('exact-v', 'exact', 0), video('old-v', 'old', -1), video('old-first', 'second', -1), video('second-v', 'second', 2)],
})
equal(boundary.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 1, 'contract boundary is inclusive')

const badFirst = report({
  profiles: [profile('tie', 'tie@example.com'), profile('no-url', 'url@example.com'), profile('bad-time', 'time@example.com'), profile('owner-a', 'a@example.com'), profile('owner-b', 'b@example.com')],
  videos: [
    video('tie-a', 'tie', 1), video('tie-b', 'tie', 1),
    video('url-first', 'no-url', 2, 0, { video_url: '' }), video('url-second', 'no-url', 3),
    video('bad-time-v', 'bad-time', 2, 0, { created_at: 'not-a-date' }), video('bad-time-two', 'bad-time', 3),
    video('shared-v', 'owner-a', 4), video('shared-v', 'owner-b', 4),
  ],
})
equal(badFirst.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 0, 'ambiguous first rows never promote a later video')
equal(badFirst.exclusionsAndDiagnostics.unresolvedFirstDeliveryPeopleAllHistory, 5, 'tie, empty URL, invalid time and both conflicting owners are unresolved')
equal(badFirst.exclusionsAndDiagnostics.unresolvedFirstDeliveryPeopleEligibleWindow, 5, 'resolvable candidate dates expose eligible quality loss')
equal(badFirst.gate.state, 'blocked_data_quality', 'unresolved ratio over threshold blocks diagnosis')

const invalidDownloadsProfiles = [
  profile('method', 'method@example.com'), profile('zero', 'zero@example.com'), profile('surface', 'surface@example.com'),
  profile('spaced', 'spaced@example.com'), profile('foreign-owner', 'foreign@example.com'), profile('right-owner', 'right@example.com'),
]
const invalidDownloads = report({
  profiles: invalidDownloadsProfiles,
  videos: invalidDownloadsProfiles.map((row, index) => video('iv-' + index, row.id, index + 1)),
  events: [
    blob('bad-method', 'method', 'iv-0', 1, 10, { method: ' blob ' }),
    blob('bad-zero', 'zero', 'iv-1', 2, 10, { bytes: 0 }),
    blob('bad-surface', 'surface', 'iv-2', 3, 10, { surface: ' history ' }),
    blob('bad-spaces', 'spaced', ' iv-3 ', 4, 10),
    blob('wrong-owner', 'foreign-owner', 'iv-5', 5, 10),
    blob('future', 'right-owner', 'iv-5', 40, 10),
  ],
})
equal(invalidDownloads.primaryFunnel.confirmedClientBlobSignalPeople, 0, 'invalid method, bytes, surface, spaced id, foreign id and future rows fail closed')
equal(invalidDownloads.comparison.unresolvedBlobSignalPeople, 3, 'matching first id with invalid contract is unresolved')
equal(invalidDownloads.exclusionsAndDiagnostics.invalidDownloadContractPeople, 3, 'invalid contracts are explicit')
equal(invalidDownloads.exclusionsAndDiagnostics.onlySecondOrForeignVideoSignalsPeople, 2, 'spaced or foreign ids remain mismatches without coercion')

const financeProfiles = [
  profile('other-session', 'other-session@example.com'), profile('late', 'late@example.com'), profile('pack', 'pack@example.com'),
  profile('unknown-product', 'unknown-product@example.com'), profile('identity', 'identity@example.com'), profile('invalid-money', 'money@example.com'),
  profile('duplicate', 'duplicate@example.com'), profile('usd', 'usd@example.com'), profile('eur', 'eur@example.com'), profile('other-owner', 'other@example.com'),
]
const financeVideos = financeProfiles.map((row, index) => video('fv-' + index, row.id, 1))
const financeEvents = []
for (let index = 0; index < financeProfiles.length; index += 1) {
  financeEvents.push(blob('fd-' + index, financeProfiles[index].id, 'fv-' + index, 1, 10))
}
financeEvents.push(
  start('os-start', 'other-session', 'cs-os', 1, 20), paid('os-paid-other', 'other-session', 'cs-different', 1, 30),
  start('late-start', 'late', 'cs-late', 1, 20), paid('late-paid', 'late', 'cs-late', 9, 0),
  start('pack-start', 'pack', 'cs-pack', 1, 20, { sku: 'bulk10', tier: undefined, billing: undefined }),
  event('pack-paid', 'payment_success', 'pack', 1, 30, { checkout_mode: 'payment', stripe_session_id: 'cs-pack', amount_total: 9900, currency: 'usd' }),
  event('unknown-start', 'checkout_started', 'unknown-product', 1, 20, { stripe_session_id: 'cs-unknown' }, 'unknown-browser'),
  start('identity-start', 'identity', 'cs-identity', 1, 20), paid('identity-paid', 'other-owner', 'cs-identity', 1, 30),
  start('money-start', 'invalid-money', 'cs-money', 1, 20), paid('money-paid', 'invalid-money', 'cs-money', 1, 30, 0, ''),
  start('dup-start-a', 'duplicate', 'cs-dup', 1, 20), start('dup-start-b', 'duplicate', 'cs-dup', 1, 21),
  paid('dup-paid-a', 'duplicate', 'cs-dup', 1, 30), paid('dup-paid-b', 'duplicate', 'cs-dup', 1, 31),
  start('usd-start', 'usd', 'cs-usd', 1, 20), paid('usd-paid', 'usd', 'cs-usd', 1, 30, 1200, 'usd'),
  start('eur-start', 'eur', 'cs-eur', 1, 20), paid('eur-paid', 'eur', 'cs-eur', 1, 30, 1100, 'eur'),
)
const finance = report({ profiles: financeProfiles, videos: financeVideos, events: financeEvents })
equal(finance.primaryFunnel.exactRecurringCheckoutAfterBlob.exactPaidPeople, 3, 'only duplicate, USD and EUR exact same-session payments count')
equal(finance.primaryFunnel.exactRecurringCheckoutAfterBlob.exactPaidStripeSessions, 3, 'duplicate event rows do not duplicate Stripe Sessions')
equal(finance.primaryFunnel.exactRecurringCheckoutAfterBlob.exactRevenueMinorByCurrency, { eur: 1100, usd: 2700 }, 'currencies remain separate and duplicate payment is counted once')
equal(finance.primaryFunnel.exactRecurringCheckoutAfterBlob.identifiedExternalPeople, 6, 'invalid payment preserves its exact checkout while payment stays unresolved')
equal(finance.exclusionsAndDiagnostics.ledgerInvalidPaymentPeopleInCohort, 1, 'invalid payment enters quality diagnostics')
equal(finance.exclusionsAndDiagnostics.ledgerInvalidPaymentStripeSessionsInCohort, 1, 'invalid payment Session is visible without becoming revenue')
equal(finance.exclusionsAndDiagnostics.ledgerPackSessionsExcludedAllHistory, 1, 'pack is excluded')
equal(finance.exclusionsAndDiagnostics.ledgerUnlinkedSubscriptionPaymentSessionsAllHistory, 1, 'payment on another Session is unlinked')

const gateProfiles = Array.from({ length: 20 }, (_, index) => profile('gate-' + index, 'gate-' + index + '@example.com'))
const gateVideos = gateProfiles.map((row, index) => video('gate-video-' + index, row.id, 1 + index / 100))
const gateEvents = []
for (let index = 0; index < 5; index += 1) {
  gateEvents.push(blob('gate-download-' + index, 'gate-' + index, 'gate-video-' + index, 1 + index / 100, 10))
  gateEvents.push(start('gate-start-' + index, 'gate-' + index, 'gate-session-' + index, 1 + index / 100, 20))
}
const diagnosis = report({ profiles: gateProfiles, videos: gateVideos, events: gateEvents })
equal(diagnosis.gate.completeSample, true, '20 mature, 5 blob, 5 no-signal and 5 checkout people complete the sample')
equal(diagnosis.gate.state, 'ready_for_diagnosis', 'complete sample without payment is diagnostic only')
gateEvents.push(paid('gate-payment', 'gate-0', 'gate-session-0', 1, 30))
const reconciliation = report({ profiles: gateProfiles, videos: gateVideos, events: gateEvents })
equal(reconciliation.gate.state, 'ready_for_reconciliation', 'first exact chain payment opens reconciliation, not product change')

const conflictingProfile = report({
  profiles: [profile('same-id', 'one@example.com'), profile('same-id', 'two@example.com')],
  videos: [video('conflict-profile-video', 'same-id', 1)],
})
equal(conflictingProfile.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 0, 'conflicting profile id is excluded')
equal(conflictingProfile.exclusionsAndDiagnostics.conflictingProfileIds, 1, 'profile conflict is diagnosed')
equal(conflictingProfile.exclusionsAndDiagnostics.unresolvedIdentityVideoOwnersEligibleWindow, 1, 'conflicting identity with an eligible video enters quality denominator')
equal(conflictingProfile.quality.denominatorPeople, 1, 'identity conflict cannot disappear from denominator')
equal(conflictingProfile.gate.state, 'blocked_data_quality', 'identity conflict cannot release gate')

const missingProfile = report({
  profiles: [],
  videos: [video('orphan-video', 'missing-profile-user', 1)],
})
equal(missingProfile.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 0, 'missing profile never becomes external cohort')
equal(missingProfile.exclusionsAndDiagnostics.missingProfileVideoOwnersAllHistory, 1, 'video owner without profile is diagnosed')
equal(missingProfile.exclusionsAndDiagnostics.unresolvedIdentityVideoOwnersEligibleWindow, 1, 'dated missing identity enters unresolved denominator')
equal(missingProfile.quality.unresolvedPeopleRatio, 1, 'missing identity produces 100% unresolved quality, not zero')

const undatable = report({
  profiles: [profile('undatable', 'undatable@example.com')],
  videos: [video('undatable-video', 'undatable', 1, 0, { created_at: 'invalid' })],
})
equal(undatable.exclusionsAndDiagnostics.undatableUnresolvedVideoOwners, 1, 'undatable completed owner is explicit')
equal(undatable.gate.state, 'blocked_data_quality', 'undatable first delivery blocks the report')

const nullPlusFuture = report({
  profiles: [profile('null-plus-future', 'null-plus-future@example.com')],
  videos: [
    video('null-clock-video', 'null-plus-future', 1, 0, { created_at: null }),
    video('future-clock-video', 'null-plus-future', 29),
  ],
})
equal(nullPlusFuture.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 0, 'null clock plus an immature valid row never becomes clean exclusion')
equal(nullPlusFuture.exclusionsAndDiagnostics.undatableUnresolvedVideoOwners, 1, 'any null first-video clock remains undatable even with another valid row')
equal(nullPlusFuture.gate.state, 'blocked_data_quality', 'undatable row blocks regardless of candidate maturity')

const mixed = report({
  profiles: [profile('mixed', 'mixed@example.com')],
  videos: [video('mixed-video', 'mixed', 1)],
  events: [
    start('mixed-first', 'mixed', 'cs-mixed-first', 1, 10),
    blob('mixed-blob', 'mixed', 'mixed-video', 1, 20),
    start('mixed-second', 'mixed', 'cs-mixed-paid', 1, 30),
    paid('mixed-paid', 'mixed', 'cs-mixed-paid', 1, 40),
  ],
})
equal(mixed.primaryFunnel.exactRecurringCheckoutAfterBlob.identifiedExternalPeople, 0, 'later paid Session cannot erase an earlier pre-blob checkout')
equal(mixed.primaryFunnel.exactRecurringCheckoutAfterBlob.exactPaidPeople, 0, 'mixed chronology never opens primary payment reconciliation')
equal(mixed.comparison.exactRecurringCheckoutBeforeBlob.identifiedExternalPeople, 1, 'first post-delivery Session anchors the person in reverse chronology')
equal(mixed.comparison.mixedChronologyPeopleExcludedFromPrimary, 1, 'mixed chronology is disclosed')
equal(mixed.comparison.laterRecurringStripeSessionsNotUsedAsPersonAnchor, 1, 'later Session remains diagnostic but not primary')
equal(mixed.gate.state, 'collecting', 'later payment cannot shortcut the gate')

const tiedSessions = report({
  profiles: [profile('tied-sessions', 'tied-sessions@example.com')],
  videos: [video('tied-video', 'tied-sessions', 1)],
  events: [
    blob('tied-blob', 'tied-sessions', 'tied-video', 1, 10),
    start('tied-start-a', 'tied-sessions', 'cs-tied-a', 1, 20),
    start('tied-start-b', 'tied-sessions', 'cs-tied-b', 1, 20),
    paid('tied-paid-b', 'tied-sessions', 'cs-tied-b', 1, 30),
  ],
})
equal(tiedSessions.primaryFunnel.exactRecurringCheckoutAfterBlob.identifiedExternalPeople, 0, 'two first Sessions at one timestamp have no arbitrary anchor')
equal(tiedSessions.primaryFunnel.exactRecurringCheckoutAfterBlob.exactPaidPeople, 0, 'paid tied Session never enters primary')
equal(tiedSessions.comparison.ambiguousFirstRecurringSessionPeople, 1, 'tied first Session is explicit')
equal(tiedSessions.gate.state, 'blocked_data_quality', 'tied first Session blocks gate')

const malformedEventClocks = report({
  profiles: [profile('null-download-clock', 'null-download@example.com'), profile('null-finance-clock', 'null-finance@example.com')],
  videos: [video('null-download-video', 'null-download-clock', 1), video('null-finance-video', 'null-finance-clock', 1)],
  events: [
    { ...blob('null-download', 'null-download-clock', 'null-download-video', 1, 10), created_at: null },
    { ...start('null-finance', 'null-finance-clock', 'cs-null-finance', 1, 10), created_at: null },
  ],
})
equal(malformedEventClocks.comparison.unresolvedBlobSignalPeople, 1, 'null download clock is unresolved rather than clean no-signal')
equal(malformedEventClocks.exclusionsAndDiagnostics.undatableDownloadClockPeople, 1, 'null download clock is diagnosed')
equal(malformedEventClocks.exclusionsAndDiagnostics.undatableFinancialClockPeople, 1, 'null financial clock is diagnosed')
equal(malformedEventClocks.gate.state, 'blocked_data_quality', 'malformed event clocks block report')

const nullWebhookClock = report({
  profiles: [profile('webhook-owner', 'webhook-owner@example.com')],
  videos: [video('webhook-video', 'webhook-owner', 1)],
  events: [
    blob('webhook-blob', 'webhook-owner', 'webhook-video', 1, 10),
    start('webhook-start', 'webhook-owner', 'cs-webhook-null', 1, 20),
    { ...paid('webhook-payment', null, 'cs-webhook-null', 1, 30), created_at: null },
  ],
})
equal(nullWebhookClock.primaryFunnel.exactRecurringCheckoutAfterBlob.identifiedExternalPeople, 1, 'valid start remains a known checkout')
equal(nullWebhookClock.primaryFunnel.exactRecurringCheckoutAfterBlob.exactPaidPeople, 0, 'null-clock webhook never becomes paid')
equal(nullWebhookClock.exclusionsAndDiagnostics.undatableFinancialClockPeople, 1, 'null-clock webhook is linked through its exact Stripe Session')
equal(nullWebhookClock.gate.state, 'blocked_data_quality', 'linked null-clock webhook blocks financial reconciliation')

const ownerlessCompleted = report({
  profiles: [],
  videos: [
    video('ownerless-eligible', null, 1),
    video('ownerless-undatable', null, 1, 0, { created_at: null }),
  ],
})
equal(ownerlessCompleted.exclusionsAndDiagnostics.malformedCompletedVideoRows, 2, 'ownerless completed rows remain visible')
equal(ownerlessCompleted.exclusionsAndDiagnostics.eligibleOwnerlessCompletedRows, 1, 'eligible ownerless completed row is separated')
equal(ownerlessCompleted.exclusionsAndDiagnostics.undatableOwnerlessCompletedRows, 1, 'undatable ownerless completed row is separated')
equal(ownerlessCompleted.gate.state, 'blocked_data_quality', 'ownerless completed rows prevent a selective gate')

const unlinkedPrior = report({
  profiles: [profile('prior-unknown', 'prior-unknown@example.com')],
  videos: [video('prior-unknown-video', 'prior-unknown', 2)],
  events: [paid('prior-unlinked-payment', 'prior-unknown', 'cs-prior-unlinked', 1, 10)],
})
equal(unlinkedPrior.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 0, 'unlinked subscription payment before first video is excluded from acquisition')
equal(unlinkedPrior.exclusionsAndDiagnostics.preexistingExactSubscriberPeople, 0, 'unlinked payment is not promoted to exact subscriber')
equal(unlinkedPrior.exclusionsAndDiagnostics.preexistingSubscriptionUnknownPeople, 1, 'unlinked prior payment gets honest unknown status')
equal(unlinkedPrior.exclusionsAndDiagnostics.ledgerUnlinkedSubscriptionPaymentSessionsAllHistory, 1, 'canonical ledger diagnostic is preserved')

const rawJson = JSON.stringify(base)
for (const forbidden of ['blob@example.com', 'blob-user', 'cs-blob', 'v-blob', 'browser-blob-user']) {
  check(!rawJson.includes(forbidden), 'aggregate JSON excludes raw identifier ' + forbidden)
}

equal(unwrapFirstVideoFileValueResult({ data: [] }, 'ok'), [], 'runner unwrap accepts arrays')
assert.throws(() => unwrapFirstVideoFileValueResult({ error: { code: '42501', message: 'denied' } }, 'events'), /events: 42501 denied/)
checks += 1
assert.throws(() => unwrapFirstVideoFileValueResult({ data: null }, 'events'), /expected an array/)
checks += 1

const many = Array.from({ length: 1005 }, (_, index) => index)
let pageCalls = 0
const paged = await fetchAllPages(async (from, to) => {
  pageCalls += 1
  return many.slice(from, to + 1)
})
equal(paged.length, 1005, 'pagination does not truncate above 1000 rows')
equal(pageCalls, 2, 'pagination stops after the short final page')

const here = dirname(fileURLToPath(import.meta.url))
const runnerSource = readFileSync(join(here, 'measure-first-video-file-value-to-subscription.mjs'), 'utf8')
check(runnerSource.includes(".eq('status', 'completed')"), 'runner asks only persisted completed rows')
check(runnerSource.includes(".lte('created_at', generatedAtIso)"), 'runner caps every timestamped source at generatedAt')
equal((runnerSource.match(/\.is\('created_at', null\)/g) ?? []).length, 2, 'runner separately paginates null video and event clocks')
check(runnerSource.includes('fetchAllPages'), 'runner paginates every source')
check(runnerSource.includes('buildFirstVideoFileValueToSubscriptionReport'), 'runner executes the pure contract')

console.log('first-video-file-value-to-subscription: ' + checks + '/' + checks + ' checks passed')
