#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  B2B_COMMERCIAL_ALLOWED_ENTRIES,
  B2B_COMMERCIAL_EVENT_NAMES,
  B2B_COMMERCIAL_PACK_PAGE_VERSION,
  buildB2bCommercialFunnelReport,
} from './b2b-commercial-funnel-report.mjs'

const GENERATED_AT = '2026-09-02T12:00:00.000Z'
const WINDOW_START = '2026-08-01T12:00:00.000Z'
let checks = 0
const agencyPacksClient = fs.readFileSync(
  new URL('../app/ai-shorts-for-agencies/AgencyPacksClient.tsx', import.meta.url),
  'utf8',
)

function check(actual, expected, label) {
  assert.deepEqual(actual, expected, label)
  checks += 1
}

function profile(id, email = `${id}@customer.example`) {
  return { id, email }
}

function event(id, name, userId, sessionId, createdAt, metadata = {}) {
  return { id, name, user_id: userId, session_id: sessionId, created_at: createdAt, metadata }
}

function pageMeta(entry) {
  return { version: B2B_COMMERCIAL_PACK_PAGE_VERSION, entry }
}

const profiles = [
  profile('u1'),
  profile('u2'),
  profile('u3'),
  profile('u4'),
  profile('internal', 'josephsskaf@gmail.com'),
  profile('missing', ''),
]

const stateReportArrivals = Array.from({ length: 20 }, (_, index) =>
  event(
    `state_${index}`,
    'agency_bulk_page_viewed',
    null,
    `state_session_${index}`,
    `2026-08-${String(10 + Math.floor(index / 2)).padStart(2, '0')}T0${index % 2}:00:00.000Z`,
    pageMeta('state_report'),
  ),
)

const events = [
  event('1', 'agency_volume_bridge_viewed', 'u1', 's1', '2026-08-05T00:00:00.000Z', { entry: 'home' }),
  event('2', 'agency_volume_bridge_clicked', 'u1', 's1', '2026-08-05T00:00:01.000Z', { entry: 'home' }),
  event('3', 'agency_bulk_page_viewed', 'u1', 's1', '2026-08-05T00:00:02.000Z', pageMeta('home')),
  event('4', 'agency_margin_calculator_viewed', 'u1', 's1', '2026-08-05T00:00:03.000Z'),
  event('5', 'agency_margin_proposal_copied', 'u1', 's1', '2026-08-05T00:00:04.000Z'),
  event('6', 'agency_bulk_pack_clicked', 'u1', 's1', '2026-08-05T00:00:05.000Z', { pack: 'bulk10' }),
  event('7', 'bulk_checkout_started', 'u1', 's1', '2026-08-05T00:00:06.000Z', { stripe_session_id: 'cs_1', sku: 'bulk10' }),
  event('8', 'bulk_purchase_completed', 'u1', null, '2026-08-05T00:00:07.000Z', { stripe_session_id: 'cs_1', amount_total: 9900, currency: 'USD' }),
  event('9', 'bulk_purchase_completed', 'u1', null, '2026-08-05T00:00:08.000Z', { stripe_session_id: 'cs_1', amount_total: '9900', currency: 'usd' }),

  // Anonymous landing becomes an identified checkout in the same browser session.
  event('10', 'agency_bulk_page_viewed', null, 'anon_pricing', '2026-08-06T00:00:00.000Z', pageMeta('pricing')),
  event('11', 'bulk_checkout_started', 'u2', 'anon_pricing', '2026-08-06T00:00:10.000Z', { stripe_session_id: 'cs_2', sku: 'bulk20' }),
  event('12', 'bulk_purchase_completed', 'u2', null, '2026-08-06T00:00:20.000Z', { stripe_session_id: 'cs_2', amount_total: 19900, currency: 'usd' }),

  // Two labelled entries in one session stay ambiguous instead of inventing origin.
  event('13', 'agency_bulk_page_viewed', 'u3', 's3', '2026-08-07T00:00:00.000Z', pageMeta('home')),
  event('14', 'agency_bulk_page_viewed', 'u3', 's3', '2026-08-07T00:00:01.000Z', pageMeta('pricing')),
  event('15', 'bulk_checkout_started', 'u3', 's3', '2026-08-07T00:00:02.000Z', { stripe_session_id: 'cs_3', sku: 'bulk30' }),
  event('16', 'bulk_purchase_completed', 'u3', null, '2026-08-07T00:00:03.000Z', { stripe_session_id: 'cs_3', amount_total: 29900, currency: 'usd' }),
  event('17', 'bulk_purchase_completed', 'u3', null, '2026-08-07T00:00:04.000Z', { stripe_session_id: 'cs_3', amount_total: 39900, currency: 'usd' }),

  event('18', 'agency_bulk_page_viewed', null, 'direct_session', '2026-08-08T00:00:00.000Z', pageMeta('direct')),
  event('19', 'agency_bulk_page_viewed', null, 'product_session', '2026-08-08T01:00:00.000Z', pageMeta('product_tool')),

  // Internal and unverifiable identities never become external people or revenue.
  event('20', 'agency_bulk_page_viewed', 'internal', 'internal_session', '2026-08-09T00:00:00.000Z', pageMeta('home')),
  event('21', 'bulk_checkout_started', 'internal', 'internal_session', '2026-08-09T00:00:01.000Z', { stripe_session_id: 'cs_internal' }),
  event('22', 'bulk_purchase_completed', 'internal', null, '2026-08-09T00:00:02.000Z', { stripe_session_id: 'cs_internal', amount_total: 9900, currency: 'usd' }),
  event('23', 'agency_bulk_page_viewed', 'missing', 'missing_session', '2026-08-09T01:00:00.000Z', pageMeta('home')),
  event('24', 'bulk_checkout_started', 'missing', 'missing_session', '2026-08-09T01:00:01.000Z', { stripe_session_id: 'cs_missing' }),
  event('25', 'bulk_purchase_completed', 'missing', null, '2026-08-09T01:00:02.000Z', { stripe_session_id: 'cs_missing', amount_total: 19900, currency: 'usd' }),

  event('26', 'bulk_purchase_completed', null, null, '2026-08-09T02:00:00.000Z', { stripe_session_id: 'cs_unknown', amount_total: 49900, currency: 'usd' }),
  event('27', 'bulk_purchase_completed', 'u4', null, '2026-08-09T03:00:00.000Z', { stripe_session_id: 'cs_old_start', amount_total: 59000, currency: 'usd' }),

  // Shared artifacts are counted as stages, never joined as one person's causal path.
  event('28', 'client_short_brief_viewed', null, 'brief_recipient', '2026-08-10T00:00:00.000Z', { entry: 'client_intake_share' }),
  event('29', 'client_short_brief_generated', null, 'brief_recipient', '2026-08-10T00:00:01.000Z', { entry: 'client_intake_share' }),
  event('30', 'client_short_brief_copied', 'u1', 's1', '2026-08-10T00:00:02.000Z'),
  event('31', 'business_content_plan_viewed', null, 'plan_recipient', '2026-08-10T01:00:00.000Z', { entry: 'plan_copy_referral' }),
  event('32', 'business_content_plan_generated', null, 'plan_recipient', '2026-08-10T01:00:01.000Z', { entry: 'plan_copy_referral' }),
  event('33', 'business_content_plan_packs_clicked', null, 'plan_recipient', '2026-08-10T01:00:02.000Z', { entry: 'plan_copy_referral' }),

  ...stateReportArrivals,
  event('outside', 'agency_bulk_page_viewed', 'u4', 'outside', '2026-07-01T00:00:00.000Z', pageMeta('home')),
]

const report = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  events,
  profiles,
})

check(report.schemaVersion, 'b2b_commercial_funnel_report_v1', 'schema version')
check(report.exclusions.internalProfileRows, 1, 'internal profile excluded')
check(report.exclusions.profileRowsMissingEmail, 1, 'missing-email profile excluded')
check(report.exclusions.internalEventRows, 3, 'internal event rows excluded')
check(report.exclusions.unknownIdentifiedEventRows, 3, 'unknown identified rows separated')
check(report.confirmedPackPageArrivals.identifiedExternalPeople, 2, 'pack arrivals count external people')
check(report.confirmedPackPageArrivals.anonymousSessions, 23, 'pack arrivals count anonymous sessions separately')

const byEntry = Object.fromEntries(report.confirmedPackPageArrivals.byEntry.map((row) => [row.entry, row]))
check(byEntry.home.identifiedExternalPeople, 2, 'home arrival people')
check(byEntry.home.checkoutPeople, 1, 'home exact checkout people')
check(byEntry.home.paidPeople, 1, 'home exact paid people')
check(byEntry.home.gate.state, 'ready_for_entry_diagnosis', 'first server checkout opens home gate')
check(byEntry.pricing.identifiedExternalPeople, 1, 'pricing identified arrival')
check(byEntry.pricing.anonymousSessions, 1, 'pricing anonymous arrival')
check(byEntry.pricing.checkoutPeople, 1, 'anonymous pricing arrival links to identified checkout')
check(byEntry.pricing.gate.firstServerSignalObserved, true, 'pricing server signal opens gate')
check(byEntry.product_tool.gate.state, 'collecting', 'product entry stays collecting without sample or checkout')
check(byEntry.state_report.anonymousSessions, 20, 'state report reaches anonymous sample without becoming people')
check(byEntry.state_report.gate.sampleMet, true, 'per-entry anonymous sample gate')
check(byEntry.state_report.gate.state, 'ready_for_entry_diagnosis', 'sample opens only its entry gate')

check(report.navigationPersistence.labelledConfirmedArrivalSessions, 24, 'labelled arrivals are authoritative navigation evidence')
check(report.navigationPersistence.recordedNavigationClickSessions, 1, 'recorded upstream click sessions stay diagnostic')
check(report.navigationPersistence.labelledArrivalSessionsWithoutRecordedClick, 23, 'missing click is visible without erasing arrivals')
check(report.navigationPersistence.state, 'click_signal_incomplete_or_shared_link', 'navigation warning is explicit')

check(report.checkout.identifiedExternalPeople, 3, 'external checkout people')
check(report.checkout.stripeSessions, 3, 'checkout Stripe Sessions')
check(report.checkout.exactArrivalPeople, 2, 'exact arrivals link by browser session')
check(report.checkout.ambiguousArrivalPeople, 1, 'multiple entries remain ambiguous')
check(report.checkout.missingArrivalPeople, 0, 'no missing arrivals in fixture')
check(report.checkout.byExactEntry, [
  { entry: 'home', people: 1, stripeSessions: 1 },
  { entry: 'pricing', people: 1, stripeSessions: 1 },
], 'checkout origins stop at exact server start')

check(report.payment.externalBuyerPeopleLinkedToWindowStarts, 2, 'only exact payments link to window starts')
check(report.payment.externalPaidStripeSessionsLinkedToWindowStarts, 2, 'linked paid Sessions dedupe')
check(report.payment.linkedRevenueMinorByCurrency, { usd: 29800 }, 'linked revenue grouped by currency')
check(report.payment.allKnownExternalPaidStripeSessionsInWindow, 3, 'external revenue includes valid purchase with older start')
check(report.payment.allKnownExternalRevenueMinorByCurrency, { usd: 88800 }, 'all external bulk revenue deduped')
check(report.payment.unknownActorPaidStripeSessionsInWindow, 2, 'unknown actor revenue is separated')
check(report.payment.conflictingPurchaseStripeSessions, 1, 'conflicting purchase facts are never revenue')
check(report.quality.duplicateStartRows, 0, 'no duplicate starts')
check(report.quality.conflictingStartStripeSessions, 0, 'no conflicting start owners')
check(report.quality.purchaseIdentityMismatchRows, 0, 'linked purchases have the same external owner')
check(report.quality.purchaseIdentityConflictStripeSessions, 0, 'no purchase identity conflict in main fixture')
check(report.quality.duplicatePurchaseRows, 2, 'duplicate purchase rows are diagnosed')
check(report.gate.readyEntries, ['home', 'pricing', 'state_report'], 'gate is evaluated per entry')
check(report.gate.state, 'entry_specific_diagnosis_available', 'aggregate only says entry-specific evidence exists')

const stages = Object.fromEntries(report.stages.map((row) => [row.name, row]))
check(stages.agency_margin_proposal_copied.identifiedExternalPeople, 1, 'proposal copied is an intent stage')
check(stages.client_short_brief_generated.anonymousSessions, 1, 'shared brief recipient stays an anonymous session')
check(stages.business_content_plan_generated.anonymousSessions, 1, 'shared plan recipient stays an anonymous session')
check(stages.bulk_purchase_completed.identifiedExternalPeople, 4, 'stage people do not replace revenue dedupe')
check(stages.business_content_plan_packs_clicked.publicEventRows, 1, 'artifact-to-pack handoff is visible')
check(new Set(B2B_COMMERCIAL_EVENT_NAMES).size, B2B_COMMERCIAL_EVENT_NAMES.length, 'event contract has no duplicate names')
check(B2B_COMMERCIAL_ALLOWED_ENTRIES.includes('product_tool'), true, 'canonical product entry is allowed')
check(B2B_COMMERCIAL_ALLOWED_ENTRIES.includes('direct'), true, 'explicit direct sentinel is allowed')
check(
  agencyPacksClient.match(
    /trackEvent\('agency_bulk_page_viewed',[\s\S]{0,500}?version:\s*'([^']+)'/,
  )?.[1],
  B2B_COMMERCIAL_PACK_PAGE_VERSION,
  'report version matches the destination-page emitter',
)
check(B2B_COMMERCIAL_EVENT_NAMES.includes('payment_success'), false, 'generic payment event cannot double-count canonical bulk purchase')

const serialized = JSON.stringify(report)
for (const forbidden of ['u1', 'u2', 'cs_1', 'customer.example', 'josephsskaf@gmail.com']) {
  check(serialized.includes(forbidden), false, `report does not expose ${forbidden}`)
}

assert.throws(
  () => buildB2bCommercialFunnelReport({
    generatedAt: WINDOW_START,
    windowStart: GENERATED_AT,
    events: [],
    profiles: [],
  }),
  /valid ordered timestamps/,
)
checks += 1

const empty = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  events: [],
  profiles: [],
})
check(empty.window.packPageObservationStartedAt, null, 'empty report has no invented frontier')
check(empty.window.observedDays, null, 'empty report has no invented duration')
check(empty.gate.state, 'collecting', 'empty report stays collecting')

const missingEntry = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [],
  events: Array.from({ length: 20 }, (_, index) =>
    event(
      `missing_entry_${index}`,
      'agency_bulk_page_viewed',
      null,
      `missing_entry_session_${index}`,
      '2026-08-20T00:00:00.000Z',
      { version: B2B_COMMERCIAL_PACK_PAGE_VERSION, entry: 'private-email@example.com' },
    ),
  ),
})
check(missingEntry.confirmedPackPageArrivals.byEntry, [], 'invalid entries are aggregated without echoing their value')
check(missingEntry.quality.invalidPackPageArrivalRows, 20, 'invalid entry rows are counted without attribution')
check(JSON.stringify(missingEntry).includes('private-email@example.com'), false, 'invalid entry PII is never echoed')
check(missingEntry.gate.state, 'collecting', 'invalid entry sample keeps report collecting')

const postArrivalClick = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [],
  events: [
    event('arrival_first', 'agency_bulk_page_viewed', null, 'late_click_session', '2026-08-20T00:00:00.000Z', pageMeta('home')),
    event('click_later', 'agency_volume_bridge_clicked', null, 'late_click_session', '2026-08-20T00:00:01.000Z', { entry: 'home' }),
  ],
})
check(postArrivalClick.navigationPersistence.recordedNavigationClickSessions, 0, 'a later click cannot explain an earlier arrival')
check(postArrivalClick.navigationPersistence.labelledArrivalSessionsWithoutRecordedClick, 1, 'post-arrival click remains incomplete')

const wrongEntryClick = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [],
  events: [
    event('home_click', 'agency_volume_bridge_clicked', null, 'wrong_entry_session', '2026-08-20T00:00:00.000Z', { entry: 'home' }),
    event('pricing_arrival', 'agency_bulk_page_viewed', null, 'wrong_entry_session', '2026-08-20T00:00:01.000Z', pageMeta('pricing')),
  ],
})
check(wrongEntryClick.navigationPersistence.recordedNavigationClickSessions, 0, 'a click for another entry cannot explain the arrival')
check(wrongEntryClick.navigationPersistence.labelledArrivalSessionsWithoutRecordedClick, 1, 'entry mismatch remains an instrumentation gap')

const invalidVersion = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [],
  events: [
    event('legacy_arrival', 'agency_bulk_page_viewed', null, 'legacy_session', '2026-08-20T00:00:00.000Z', { version: 'agency_bulk_v1_2026_08_27', entry: 'home' }),
  ],
})
check(invalidVersion.confirmedPackPageArrivals.anonymousSessions, 0, 'legacy version cannot enter current denominator')
check(invalidVersion.quality.invalidPackPageArrivalRows, 1, 'legacy version is visible only as an invalid aggregate')

const leftBoundary = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('boundary_owner')],
  events: [
    event('boundary_arrival', 'agency_bulk_page_viewed', 'boundary_owner', 'boundary_session', '2026-08-01T11:59:00.000Z', pageMeta('home')),
    event('boundary_start', 'bulk_checkout_started', 'boundary_owner', 'boundary_session', '2026-08-01T12:01:00.000Z', { stripe_session_id: 'cs_boundary' }),
  ],
})
check(leftBoundary.stages.find((row) => row.name === 'agency_bulk_page_viewed').publicEventRows, 0, 'pre-window arrival does not inflate stage denominator')
check(leftBoundary.confirmedPackPageArrivals.identifiedExternalPeople, 0, 'pre-window arrival does not inflate entry sample')
check(leftBoundary.checkout.exactArrivalPeople, 1, '24h join context preserves a valid boundary arrival')
check(leftBoundary.checkout.byExactEntry, [{ entry: 'home', people: 1, stripeSessions: 1 }], 'boundary checkout keeps exact entry')

const clickBoundary = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [],
  events: [
    event('boundary_click', 'agency_volume_bridge_clicked', null, 'click_boundary_session', '2026-08-01T11:59:00.000Z', { entry: 'home' }),
    event('boundary_click_arrival', 'agency_bulk_page_viewed', null, 'click_boundary_session', '2026-08-01T12:01:00.000Z', pageMeta('home')),
  ],
})
check(clickBoundary.stages.find((row) => row.name === 'agency_volume_bridge_clicked').publicEventRows, 0, 'pre-window click does not inflate click stage')
check(clickBoundary.navigationPersistence.recordedNavigationClickSessions, 1, 'five-minute context explains a boundary arrival')
check(clickBoundary.navigationPersistence.labelledArrivalSessionsWithoutRecordedClick, 0, 'boundary context avoids a false persistence warning')

const identityConflict = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('owner_a'), profile('owner_b')],
  events: [
    event('owner_arrival', 'agency_bulk_page_viewed', 'owner_a', 'owner_session', '2026-08-20T00:00:00.000Z', pageMeta('home')),
    event('owner_start', 'bulk_checkout_started', 'owner_a', 'owner_session', '2026-08-20T00:00:01.000Z', { stripe_session_id: 'cs_cross_owner' }),
    event('wrong_owner_purchase', 'bulk_purchase_completed', 'owner_b', null, '2026-08-20T00:00:02.000Z', { stripe_session_id: 'cs_cross_owner', amount_total: 9900, currency: 'usd' }),
  ],
})
check(identityConflict.payment.externalPaidStripeSessionsLinkedToWindowStarts, 0, 'a different owner cannot close another person\'s start')
check(identityConflict.payment.allKnownExternalPaidStripeSessionsInWindow, 0, 'start-owner conflict also removes aggregate external revenue')
check(identityConflict.payment.conflictingPurchaseStripeSessions, 1, 'start-owner conflict marks the Stripe Session')
check(identityConflict.quality.purchaseIdentityMismatchRows, 1, 'cross-owner purchase is diagnosed')
check(identityConflict.quality.purchaseIdentityConflictStripeSessions, 1, 'cross-owner purchase increments identity conflict')

const duplicateExternalOwners = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('purchase_a'), profile('purchase_b')],
  events: [
    event('purchase_arrival', 'agency_bulk_page_viewed', 'purchase_a', 'purchase_session', '2026-08-20T00:00:00.000Z', pageMeta('home')),
    event('purchase_start', 'bulk_checkout_started', 'purchase_a', 'purchase_session', '2026-08-20T00:00:01.000Z', { stripe_session_id: 'cs_two_owners' }),
    event('purchase_owner_a', 'bulk_purchase_completed', 'purchase_a', null, '2026-08-20T00:00:02.000Z', { stripe_session_id: 'cs_two_owners', amount_total: 9900, currency: 'usd' }),
    event('purchase_owner_b', 'bulk_purchase_completed', 'purchase_b', null, '2026-08-20T00:00:03.000Z', { stripe_session_id: 'cs_two_owners', amount_total: 9900, currency: 'usd' }),
  ],
})
check(duplicateExternalOwners.payment.externalBuyerPeopleLinkedToWindowStarts, 0, 'two external owners cannot produce a linked buyer')
check(duplicateExternalOwners.payment.allKnownExternalPaidStripeSessionsInWindow, 0, 'two external owners cannot produce aggregate revenue')
check(duplicateExternalOwners.payment.allKnownExternalRevenueMinorByCurrency, {}, 'identity conflict contributes zero revenue')
check(duplicateExternalOwners.payment.conflictingPurchaseStripeSessions, 1, 'same financial facts with two owners still conflict')
check(duplicateExternalOwners.quality.purchaseIdentityConflictStripeSessions, 1, 'two-owner conflict is diagnosed')

const mixedStartOwners = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [
    profile('mixed_external'),
    profile('mixed_internal', 'josephsskaf@gmail.com'),
  ],
  events: [
    event('mixed_arrival', 'agency_bulk_page_viewed', 'mixed_external', 'mixed_session', '2026-08-20T00:00:00.000Z', pageMeta('home')),
    event('mixed_start_external', 'bulk_checkout_started', 'mixed_external', 'mixed_session', '2026-08-20T00:00:01.000Z', { stripe_session_id: 'cs_mixed_start' }),
    event('mixed_start_internal', 'bulk_checkout_started', 'mixed_internal', 'internal_session', '2026-08-20T00:00:02.000Z', { stripe_session_id: 'cs_mixed_start' }),
    event('mixed_purchase', 'bulk_purchase_completed', 'mixed_external', null, '2026-08-20T00:00:03.000Z', { stripe_session_id: 'cs_mixed_start', amount_total: 9900, currency: 'usd' }),
  ],
})
check(mixedStartOwners.payment.externalBuyerPeopleLinkedToWindowStarts, 0, 'mixed start owners cannot close a linked buyer')
check(mixedStartOwners.payment.linkedRevenueMinorByCurrency, {}, 'mixed start owners contribute zero linked revenue')
check(mixedStartOwners.payment.allKnownExternalRevenueMinorByCurrency, {}, 'mixed start owners contribute zero aggregate revenue')
check(mixedStartOwners.payment.conflictingPurchaseStripeSessions, 1, 'mixed start owner Session is a financial conflict')
check(mixedStartOwners.quality.conflictingStartStripeSessions, 1, 'mixed external/internal starts are diagnosed')
check(mixedStartOwners.quality.purchaseIdentityConflictStripeSessions, 1, 'mixed starts invalidate the purchase identity')

const startConflict = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('start_a'), profile('start_b')],
  events: [
    event('start_a_1', 'bulk_checkout_started', 'start_a', 'session_a', '2026-08-20T00:00:00.000Z', { stripe_session_id: 'cs_conflict' }),
    event('start_b_1', 'bulk_checkout_started', 'start_b', 'session_b', '2026-08-20T00:00:01.000Z', { stripe_session_id: 'cs_conflict' }),
    event('start_a_dupe_1', 'bulk_checkout_started', 'start_a', 'session_a', '2026-08-20T00:01:00.000Z', { stripe_session_id: 'cs_dupe' }),
    event('start_a_dupe_2', 'bulk_checkout_started', 'start_a', 'session_a', '2026-08-20T00:01:01.000Z', { stripe_session_id: 'cs_dupe' }),
  ],
})
check(startConflict.checkout.stripeSessions, 1, 'conflicting Stripe Session is excluded from checkout denominator')
check(startConflict.quality.conflictingStartStripeSessions, 1, 'cross-owner/session start conflict is explicit')
check(startConflict.quality.duplicateStartRows, 1, 'same-owner same-session retry is a deduped row')

const anonymousScopeArrival = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('scope_buyer')],
  events: [
    event('scope_anon_arrival', 'agency_bulk_page_viewed', null, 'scope_shared_browser', '2026-08-20T00:00:00.000Z', pageMeta('scope_brief')),
    event('scope_anon_start', 'bulk_checkout_started', 'scope_buyer', 'scope_shared_browser', '2026-08-20T00:00:01.000Z', { stripe_session_id: 'cs_scope_anon' }),
  ],
})
check(anonymousScopeArrival.checkout.exactArrivalPeople, 0, 'anonymous scope arrival cannot claim another person\'s pack Checkout')
check(anonymousScopeArrival.checkout.missingArrivalPeople, 1, 'scope attribution without same external owner fails closed')

const ownedScopeArrival = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('scope_owner')],
  events: [
    event('scope_owned_arrival', 'agency_bulk_page_viewed', 'scope_owner', 'scope_owned_browser', '2026-08-20T00:00:00.000Z', pageMeta('scope_brief')),
    event('scope_owned_start', 'bulk_checkout_started', 'scope_owner', 'scope_owned_browser', '2026-08-20T00:00:01.000Z', { stripe_session_id: 'cs_scope_owned' }),
  ],
})
check(ownedScopeArrival.checkout.exactArrivalPeople, 1, 'same external person preserves exact scope-to-pack attribution')
check(ownedScopeArrival.checkout.byExactEntry, [{ entry: 'scope_brief', people: 1, stripeSessions: 1 }], 'owned scope arrival keeps its exact entry')

process.stdout.write(`B2B commercial funnel report: ${checks}/${checks} checks passed\n`)
