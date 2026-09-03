#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  B2B_COMMERCIAL_ALLOWED_ENTRIES,
  B2B_COMMERCIAL_ALLOWED_PACKS,
  B2B_COMMERCIAL_CHECKOUT_RETURN_VARIANT,
  B2B_COMMERCIAL_EVENT_NAMES,
  B2B_COMMERCIAL_PACK_PAGE_VERSION,
  B2B_COMMERCIAL_RETURN_MINIMUM_MATURE_PEOPLE,
  buildB2bCommercialFunnelReport,
} from './b2b-commercial-funnel-report.mjs'

const GENERATED_AT = '2026-09-02T12:00:00.000Z'
const WINDOW_START = '2026-08-01T12:00:00.000Z'
let checks = 0
const agencyPacksClient = fs.readFileSync(
  new URL('../app/ai-shorts-for-agencies/AgencyPacksClient.tsx', import.meta.url),
  'utf8',
)
const agencyCheckoutReturn = fs.readFileSync(
  new URL('../lib/growth/agencyCheckoutReturn.ts', import.meta.url),
  'utf8',
)
const checkoutPricing = fs.readFileSync(
  new URL('../lib/checkoutPricing.ts', import.meta.url),
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

check(report.schemaVersion, 'b2b_commercial_funnel_report_v2', 'schema version')
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
check(
  agencyCheckoutReturn.match(/AGENCY_CHECKOUT_RETURN_VARIANT\s*=\s*'([^']+)'/)?.[1],
  B2B_COMMERCIAL_CHECKOUT_RETURN_VARIANT,
  'report return variant matches the runtime contract',
)
const canonicalBulkPackIds = [...(checkoutPricing.match(/export type BulkPackId\s*=\s*([^\r\n]+)/)?.[1] ?? '').matchAll(/'([^']+)'/g)]
  .map((match) => match[1])
check(B2B_COMMERCIAL_ALLOWED_PACKS, canonicalBulkPackIds, 'report pack allowlist matches checkoutPricing BulkPackId')

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

const returnMeta = (pack, variant = B2B_COMMERCIAL_CHECKOUT_RETURN_VARIANT) => ({ variant, pack })
const recoveryProfiles = [
  profile('return_same'),
  profile('return_new'),
  profile('return_race'),
  profile('return_orphan'),
  profile('return_fresh'),
  profile('return_internal', 'josephsskaf@gmail.com'),
]
const recoveryEvents = [
  event('same_prior', 'bulk_checkout_started', 'return_same', 'same_browser', '2026-08-10T00:00:00.000Z', { stripe_session_id: 'cs_same', sku: 'bulk10' }),
  event('same_return', 'agency_bulk_checkout_cancelled_return_viewed', 'return_same', 'same_browser', '2026-08-10T00:01:00.000Z', returnMeta('bulk10')),
  event('same_click', 'agency_bulk_checkout_resume_clicked', 'return_same', 'same_browser', '2026-08-10T00:02:00.000Z', returnMeta('bulk10')),
  event('same_restart', 'bulk_checkout_started', 'return_same', 'same_browser', '2026-08-10T00:03:00.000Z', { stripe_session_id: 'cs_same', sku: 'bulk10' }),
  event('same_paid', 'bulk_purchase_completed', 'return_same', null, '2026-08-10T00:04:00.000Z', { stripe_session_id: 'cs_same', sku: 'bulk10', amount_total: 9900, currency: 'usd' }),

  event('new_prior', 'bulk_checkout_started', 'return_new', 'new_browser', '2026-08-12T00:00:00.000Z', { stripe_session_id: 'cs_new_prior', sku: 'bulk20' }),
  event('new_return', 'agency_bulk_checkout_cancelled_return_viewed', 'return_new', 'new_browser', '2026-08-12T00:01:00.000Z', returnMeta('bulk20')),
  event('new_click', 'agency_bulk_checkout_resume_clicked', 'return_new', 'new_browser', '2026-08-12T00:02:00.000Z', returnMeta('bulk20')),
  event('new_restart', 'bulk_checkout_started', 'return_new', 'new_browser', '2026-08-12T00:03:00.000Z', { stripe_session_id: 'cs_new_recovery', sku: 'bulk20' }),
  event('new_paid', 'bulk_purchase_completed', 'return_new', null, '2026-08-12T00:04:00.000Z', { stripe_session_id: 'cs_new_recovery', sku: 'bulk20', amount_total: 19900, currency: 'usd' }),

  event('race_prior', 'bulk_checkout_started', 'return_race', 'race_browser', '2026-08-15T00:00:00.000Z', { stripe_session_id: 'cs_race_prior', sku: 'bulk30' }),
  event('race_return', 'agency_bulk_checkout_cancelled_return_viewed', 'return_race', 'race_browser', '2026-08-15T00:01:00.000Z', returnMeta('bulk30')),
  event('race_restart', 'bulk_checkout_started', 'return_race', 'race_browser', '2026-08-15T00:02:00.000Z', { stripe_session_id: 'cs_race_recovery', sku: 'bulk30' }),
  event('race_click_late', 'agency_bulk_checkout_resume_clicked', 'return_race', 'race_browser', '2026-08-15T00:02:03.000Z', returnMeta('bulk30')),

  event('orphan_return', 'agency_bulk_checkout_cancelled_return_viewed', 'return_orphan', 'orphan_browser', '2026-08-16T00:00:00.000Z', returnMeta('bulk10')),
  event('fresh_prior', 'bulk_checkout_started', 'return_fresh', 'fresh_browser', '2026-09-01T00:00:00.000Z', { stripe_session_id: 'cs_fresh', sku: 'bulk50' }),
  event('fresh_return', 'agency_bulk_checkout_cancelled_return_viewed', 'return_fresh', 'fresh_browser', '2026-09-01T00:01:00.000Z', returnMeta('bulk50')),

  event('invalid_variant', 'agency_bulk_checkout_cancelled_return_viewed', 'return_orphan', 'invalid_variant_browser', '2026-08-17T00:00:00.000Z', returnMeta('bulk10', 'legacy_variant')),
  event('invalid_pack', 'agency_bulk_checkout_resume_clicked', 'return_orphan', 'invalid_pack_browser', '2026-08-17T00:01:00.000Z', returnMeta('bulk99')),
  event('anon_return', 'agency_bulk_checkout_cancelled_return_viewed', null, 'anonymous_return_browser', '2026-08-18T00:00:00.000Z', returnMeta('bulk10')),
  event('internal_prior', 'bulk_checkout_started', 'return_internal', 'internal_return_browser', '2026-08-18T01:00:00.000Z', { stripe_session_id: 'cs_internal_return', sku: 'bulk10' }),
  event('internal_return', 'agency_bulk_checkout_cancelled_return_viewed', 'return_internal', 'internal_return_browser', '2026-08-18T01:01:00.000Z', returnMeta('bulk10')),
]
const recoveryReport = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: recoveryProfiles,
  events: recoveryEvents,
})
check(recoveryReport.checkoutRecovery.exactReturnPeople, 4, 'recovery denominator is exact external people with a prior bulk Session')
check(recoveryReport.checkoutRecovery.exactReturnJourneys, 4, 'one exact journey per valid return fixture')
check(recoveryReport.checkoutRecovery.matureReturnPeople, 3, 'return maturity is individual and seven days')
check(recoveryReport.checkoutRecovery.freshReturnPeople, 1, 'fresh return people remain separate')
check(recoveryReport.checkoutRecovery.resumeClickPeople, 3, 'resume click counts people, not events')
check(recoveryReport.checkoutRecovery.recoveryStartPeople, 2, 'server recovery starts require a preceding resume signal')
check(recoveryReport.checkoutRecovery.sameStripeSessionPeople, 1, 'same Stripe Session recovery is separated')
check(recoveryReport.checkoutRecovery.newStripeSessionPeople, 1, 'new Stripe Session recovery is separated')
check(recoveryReport.checkoutRecovery.ambiguousRecoveryStartPeople, 0, 'fixture has no ambiguous recovery Session')
check(recoveryReport.checkoutRecovery.clickPersistenceRacePeople, 1, 'post-start persistence race is separate from recovered people')
check(recoveryReport.checkoutRecovery.paidPeople, 2, 'exact recovery payments count external people')
check(recoveryReport.checkoutRecovery.paidStripeSessions, 2, 'exact recovery payments dedupe Stripe Sessions')
check(recoveryReport.checkoutRecovery.revenueMinorByCurrency, { usd: 29800 }, 'recovery revenue is exact and grouped by currency')
check(recoveryReport.checkoutRecovery.quality.anonymousReturnSessions, 1, 'anonymous returns remain a separate unit')
check(recoveryReport.checkoutRecovery.quality.invalidPublicReturnRows, 1, 'invalid return variants are rejected without echoing values')
check(recoveryReport.checkoutRecovery.quality.invalidPublicResumeRows, 1, 'invalid resume packs are rejected without echoing values')
check(recoveryReport.checkoutRecovery.quality.returnRowsWithoutExactPriorStart, 1, 'orphan return is a quality signal, not denominator')
check(recoveryReport.checkoutRecovery.quality.returnRowsWithAmbiguousPriorStart, 0, 'fixture has no ambiguous original Session')
check(recoveryReport.checkoutRecovery.quality.clickPersistenceRaceJourneys, 1, 'five-second click persistence race stays separate and visible')
check(recoveryReport.checkoutRecovery.quality.paymentOutsideOutcomeWindowJourneys, 0, 'fixture has no payment after the seven-day outcome window')
check(recoveryReport.checkoutRecovery.quality.paymentPackConflictJourneys, 0, 'fixture has no payment pack conflict')
check(recoveryReport.checkoutRecovery.gate.state, 'ready_for_reconciliation', 'first exact recovery payment opens reconciliation only')
check(JSON.stringify(recoveryReport.checkoutRecovery).includes('return_same'), false, 'recovery report emits no user IDs')
check(JSON.stringify(recoveryReport.checkoutRecovery).includes('cs_new_recovery'), false, 'recovery report emits no Stripe Session IDs')

const matureReturnEvents = []
const matureReturnProfiles = []
for (let index = 0; index < B2B_COMMERCIAL_RETURN_MINIMUM_MATURE_PEOPLE; index += 1) {
  const userId = `mature_return_${index}`
  const browser = `mature_browser_${index}`
  matureReturnProfiles.push(profile(userId))
  matureReturnEvents.push(
    event(`mature_start_${index}`, 'bulk_checkout_started', userId, browser, '2026-08-10T00:00:00.000Z', { stripe_session_id: `cs_mature_${index}`, sku: 'bulk10' }),
    event(`mature_return_${index}`, 'agency_bulk_checkout_cancelled_return_viewed', userId, browser, '2026-08-10T00:01:00.000Z', returnMeta('bulk10')),
  )
}
const matureRecoveryReport = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: matureReturnProfiles,
  events: matureReturnEvents,
})
check(matureRecoveryReport.checkoutRecovery.matureReturnPeople, 5, 'mature recovery gate counts people individually')
check(matureRecoveryReport.checkoutRecovery.paidPeople, 0, 'mature no-click sample invents no payments')
check(matureRecoveryReport.checkoutRecovery.gate.state, 'ready_for_diagnosis', 'five mature people open diagnosis without a payment')
check(empty.checkoutRecovery.gate.state, 'collecting', 'empty recovery sample stays collecting')

const recoveryBoundary = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('recovery_boundary_owner')],
  events: [
    event('recovery_boundary_start', 'bulk_checkout_started', 'recovery_boundary_owner', 'recovery_boundary_browser', '2026-08-01T11:59:00.000Z', { stripe_session_id: 'cs_recovery_boundary', sku: 'bulk10' }),
    event('recovery_boundary_return', 'agency_bulk_checkout_cancelled_return_viewed', 'recovery_boundary_owner', 'recovery_boundary_browser', '2026-08-01T12:01:00.000Z', returnMeta('bulk10')),
  ],
})
check(recoveryBoundary.checkoutRecovery.exactReturnPeople, 1, '24-hour source context preserves a return at the left window boundary')
check(recoveryBoundary.stages.find((row) => row.name === 'bulk_checkout_started').publicEventRows, 0, 'pre-window recovery context does not inflate the start stage')

const timingProfiles = ['click_ten_before', 'click_one_after', 'click_four_after', 'click_twenty_three_before']
  .map((id) => profile(id))
const timingEvents = [
  event('ten_prior', 'bulk_checkout_started', 'click_ten_before', 'ten_browser', '2026-08-20T00:00:00.000Z', { stripe_session_id: 'cs_ten_prior', sku: 'bulk10' }),
  event('ten_return', 'agency_bulk_checkout_cancelled_return_viewed', 'click_ten_before', 'ten_browser', '2026-08-20T00:01:00.000Z', returnMeta('bulk10')),
  event('ten_click', 'agency_bulk_checkout_resume_clicked', 'click_ten_before', 'ten_browser', '2026-08-20T00:02:00.000Z', returnMeta('bulk10')),
  event('ten_restart', 'bulk_checkout_started', 'click_ten_before', 'ten_browser', '2026-08-20T00:12:00.000Z', { stripe_session_id: 'cs_ten_restart', sku: 'bulk10' }),

  event('one_prior', 'bulk_checkout_started', 'click_one_after', 'one_browser', '2026-08-21T00:00:00.000Z', { stripe_session_id: 'cs_one_prior', sku: 'bulk10' }),
  event('one_return', 'agency_bulk_checkout_cancelled_return_viewed', 'click_one_after', 'one_browser', '2026-08-21T00:01:00.000Z', returnMeta('bulk10')),
  event('one_restart', 'bulk_checkout_started', 'click_one_after', 'one_browser', '2026-08-21T00:02:00.000Z', { stripe_session_id: 'cs_one_restart', sku: 'bulk10' }),
  event('one_paid_before_click', 'bulk_purchase_completed', 'click_one_after', null, '2026-08-21T00:02:30.000Z', { stripe_session_id: 'cs_one_restart', sku: 'bulk10', amount_total: 9900, currency: 'usd' }),
  event('one_click', 'agency_bulk_checkout_resume_clicked', 'click_one_after', 'one_browser', '2026-08-21T00:03:00.000Z', returnMeta('bulk10')),

  event('four_prior', 'bulk_checkout_started', 'click_four_after', 'four_browser', '2026-08-22T00:00:00.000Z', { stripe_session_id: 'cs_four_prior', sku: 'bulk10' }),
  event('four_return', 'agency_bulk_checkout_cancelled_return_viewed', 'click_four_after', 'four_browser', '2026-08-22T00:01:00.000Z', returnMeta('bulk10')),
  event('four_restart', 'bulk_checkout_started', 'click_four_after', 'four_browser', '2026-08-22T00:02:00.000Z', { stripe_session_id: 'cs_four_restart', sku: 'bulk10' }),
  event('four_click', 'agency_bulk_checkout_resume_clicked', 'click_four_after', 'four_browser', '2026-08-22T00:06:00.000Z', returnMeta('bulk10')),

  event('twenty_three_prior', 'bulk_checkout_started', 'click_twenty_three_before', 'twenty_three_browser', '2026-08-23T00:00:00.000Z', { stripe_session_id: 'cs_twenty_three_prior', sku: 'bulk10' }),
  event('twenty_three_return', 'agency_bulk_checkout_cancelled_return_viewed', 'click_twenty_three_before', 'twenty_three_browser', '2026-08-23T00:01:00.000Z', returnMeta('bulk10')),
  event('twenty_three_click', 'agency_bulk_checkout_resume_clicked', 'click_twenty_three_before', 'twenty_three_browser', '2026-08-23T00:02:00.000Z', returnMeta('bulk10')),
  event('twenty_three_restart', 'bulk_checkout_started', 'click_twenty_three_before', 'twenty_three_browser', '2026-08-23T23:02:00.000Z', { stripe_session_id: 'cs_twenty_three_restart', sku: 'bulk10' }),
]
const timingRecovery = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: timingProfiles,
  events: timingEvents,
})
check(timingRecovery.checkoutRecovery.exactReturnPeople, 4, 'adversarial timing keeps valid returns in the denominator')
check(timingRecovery.checkoutRecovery.recoveryStartPeople, 0, 'ten-minute, one-minute, four-minute and twenty-three-hour mismatches are not recovery starts')
check(timingRecovery.checkoutRecovery.clickPersistenceRacePeople, 0, 'post-start clicks beyond five seconds are not persistence races')
check(timingRecovery.checkoutRecovery.paidPeople, 0, 'a payment before a later click is never attributed to recovery')

const ambiguousRecovery = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('ambiguous_recovery_owner')],
  events: [
    event('ambiguous_prior', 'bulk_checkout_started', 'ambiguous_recovery_owner', 'ambiguous_recovery_browser', '2026-08-20T00:00:00.000Z', { stripe_session_id: 'cs_ambiguous_prior', sku: 'bulk10' }),
    event('ambiguous_return', 'agency_bulk_checkout_cancelled_return_viewed', 'ambiguous_recovery_owner', 'ambiguous_recovery_browser', '2026-08-20T00:01:00.000Z', returnMeta('bulk10')),
    event('ambiguous_click', 'agency_bulk_checkout_resume_clicked', 'ambiguous_recovery_owner', 'ambiguous_recovery_browser', '2026-08-20T00:02:00.000Z', returnMeta('bulk10')),
    event('ambiguous_restart_a', 'bulk_checkout_started', 'ambiguous_recovery_owner', 'ambiguous_recovery_browser', '2026-08-20T00:03:00.000Z', { stripe_session_id: 'cs_ambiguous_a', sku: 'bulk10' }),
    event('ambiguous_restart_b', 'bulk_checkout_started', 'ambiguous_recovery_owner', 'ambiguous_recovery_browser', '2026-08-20T00:04:00.000Z', { stripe_session_id: 'cs_ambiguous_b', sku: 'bulk10' }),
    event('ambiguous_paid_b', 'bulk_purchase_completed', 'ambiguous_recovery_owner', null, '2026-08-20T00:05:00.000Z', { stripe_session_id: 'cs_ambiguous_b', sku: 'bulk10', amount_total: 9900, currency: 'usd' }),
  ],
})
check(ambiguousRecovery.checkoutRecovery.ambiguousRecoveryStartPeople, 1, 'two recovery Stripe Sessions are explicit ambiguity')
check(ambiguousRecovery.checkoutRecovery.recoveryStartPeople, 0, 'ambiguous recovery does not choose the first Session silently')
check(ambiguousRecovery.checkoutRecovery.paidPeople, 0, 'payment on one ambiguous recovery Session is not attributed')

const latePaymentRecovery = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('late_payment_owner')],
  events: [
    event('late_prior', 'bulk_checkout_started', 'late_payment_owner', 'late_payment_browser', '2026-08-10T00:00:00.000Z', { stripe_session_id: 'cs_late_prior', sku: 'bulk10' }),
    event('late_return', 'agency_bulk_checkout_cancelled_return_viewed', 'late_payment_owner', 'late_payment_browser', '2026-08-10T00:01:00.000Z', returnMeta('bulk10')),
    event('late_click', 'agency_bulk_checkout_resume_clicked', 'late_payment_owner', 'late_payment_browser', '2026-08-10T00:02:00.000Z', returnMeta('bulk10')),
    event('late_restart', 'bulk_checkout_started', 'late_payment_owner', 'late_payment_browser', '2026-08-10T00:03:00.000Z', { stripe_session_id: 'cs_late_recovery', sku: 'bulk10' }),
    event('late_paid', 'bulk_purchase_completed', 'late_payment_owner', null, '2026-08-17T00:01:00.001Z', { stripe_session_id: 'cs_late_recovery', sku: 'bulk10', amount_total: 9900, currency: 'usd' }),
  ],
})
check(latePaymentRecovery.checkoutRecovery.paidPeople, 0, 'payment after return plus seven days is outside the recovery outcome')
check(latePaymentRecovery.checkoutRecovery.revenueMinorByCurrency, {}, 'late payment contributes zero recovery revenue')
check(latePaymentRecovery.checkoutRecovery.quality.paymentOutsideOutcomeWindowJourneys, 1, 'late payment remains visible as aggregate quality')
check(latePaymentRecovery.checkoutRecovery.gate.state, 'collecting', 'late payment does not open reconciliation')

const crossPackPayment = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('cross_pack_owner')],
  events: [
    event('cross_pack_prior', 'bulk_checkout_started', 'cross_pack_owner', 'cross_pack_browser', '2026-08-20T00:00:00.000Z', { stripe_session_id: 'cs_cross_pack_prior', sku: 'bulk10' }),
    event('cross_pack_return', 'agency_bulk_checkout_cancelled_return_viewed', 'cross_pack_owner', 'cross_pack_browser', '2026-08-20T00:01:00.000Z', returnMeta('bulk10')),
    event('cross_pack_click', 'agency_bulk_checkout_resume_clicked', 'cross_pack_owner', 'cross_pack_browser', '2026-08-20T00:02:00.000Z', returnMeta('bulk10')),
    event('cross_pack_restart', 'bulk_checkout_started', 'cross_pack_owner', 'cross_pack_browser', '2026-08-20T00:03:00.000Z', { stripe_session_id: 'cs_cross_pack_recovery', sku: 'bulk10' }),
    event('cross_pack_paid', 'bulk_purchase_completed', 'cross_pack_owner', null, '2026-08-20T00:04:00.000Z', { stripe_session_id: 'cs_cross_pack_recovery', sku: 'bulk20', amount_total: 19900, currency: 'usd' }),
  ],
})
check(crossPackPayment.checkoutRecovery.paidPeople, 0, 'same Session with a different paid pack is not attributed')
check(crossPackPayment.checkoutRecovery.revenueMinorByCurrency, {}, 'cross-pack payment contributes zero recovery revenue')
check(crossPackPayment.checkoutRecovery.quality.paymentPackConflictJourneys, 1, 'cross-pack payment conflict is explicit')

const recoveryOwnerConflict = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('recovery_owner_a'), profile('recovery_owner_b')],
  events: [
    event('owner_conflict_prior', 'bulk_checkout_started', 'recovery_owner_a', 'owner_a_browser', '2026-08-20T00:00:00.000Z', { stripe_session_id: 'cs_owner_prior', sku: 'bulk10' }),
    event('owner_conflict_return', 'agency_bulk_checkout_cancelled_return_viewed', 'recovery_owner_a', 'owner_a_browser', '2026-08-20T00:01:00.000Z', returnMeta('bulk10')),
    event('owner_conflict_click', 'agency_bulk_checkout_resume_clicked', 'recovery_owner_a', 'owner_a_browser', '2026-08-20T00:02:00.000Z', returnMeta('bulk10')),
    event('owner_conflict_start_a', 'bulk_checkout_started', 'recovery_owner_a', 'owner_a_browser', '2026-08-20T00:03:00.000Z', { stripe_session_id: 'cs_owner_conflict', sku: 'bulk10' }),
    event('owner_conflict_start_b', 'bulk_checkout_started', 'recovery_owner_b', 'owner_b_browser', '2026-08-20T00:03:01.000Z', { stripe_session_id: 'cs_owner_conflict', sku: 'bulk10' }),
    event('owner_conflict_paid', 'bulk_purchase_completed', 'recovery_owner_a', null, '2026-08-20T00:04:00.000Z', { stripe_session_id: 'cs_owner_conflict', sku: 'bulk10', amount_total: 9900, currency: 'usd' }),
  ],
})
check(recoveryOwnerConflict.checkoutRecovery.recoveryStartIdentityConflictPeople, 1, 'shared recovery Session owner conflict is explicit')
check(recoveryOwnerConflict.checkoutRecovery.recoveryStartPeople, 0, 'owner-conflicted recovery Session is not a confirmed start')
check(recoveryOwnerConflict.checkoutRecovery.paidPeople, 0, 'owner-conflicted Session cannot produce recovered buyer')
check(recoveryOwnerConflict.checkoutRecovery.revenueMinorByCurrency, {}, 'owner-conflicted Session contributes zero recovery revenue')
check(recoveryOwnerConflict.checkoutRecovery.quality.recoveryStartIdentityConflictJourneys, 1, 'owner conflict is retained as aggregate quality')

const returnPersistenceRace = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('return_race_owner')],
  events: [
    event('return_race_prior', 'bulk_checkout_started', 'return_race_owner', 'return_race_browser', '2026-08-20T00:00:00.000Z', { stripe_session_id: 'cs_return_race_prior', sku: 'bulk10' }),
    event('return_race_restart', 'bulk_checkout_started', 'return_race_owner', 'return_race_browser', '2026-08-20T00:10:00.000Z', { stripe_session_id: 'cs_return_race_recovery', sku: 'bulk10' }),
    event('return_race_return_late', 'agency_bulk_checkout_cancelled_return_viewed', 'return_race_owner', 'return_race_browser', '2026-08-20T00:10:03.000Z', returnMeta('bulk10')),
    event('return_race_click_late', 'agency_bulk_checkout_resume_clicked', 'return_race_owner', 'return_race_browser', '2026-08-20T00:10:04.000Z', returnMeta('bulk10')),
  ],
})
check(returnPersistenceRace.checkoutRecovery.exactReturnPeople, 1, 'older original Session still proves the return denominator')
check(returnPersistenceRace.checkoutRecovery.returnPersistenceRacePeople, 1, 'start persisted three seconds before return is a separate race')
check(returnPersistenceRace.checkoutRecovery.recoveryStartPeople, 0, 'return persistence race never becomes attributed recovery')
check(returnPersistenceRace.checkoutRecovery.quality.returnRowsWithAmbiguousPriorStart, 0, 'race start does not contaminate prior Session ambiguity')
check(returnPersistenceRace.checkoutRecovery.quality.returnPersistenceRaceRows, 1, 'return persistence race remains visible in quality')

const priorOwnerConflict = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('prior_owner_a'), profile('prior_owner_b')],
  events: [
    event('prior_owner_start_a', 'bulk_checkout_started', 'prior_owner_a', 'prior_owner_browser_a', '2026-08-20T00:00:00.000Z', { stripe_session_id: 'cs_prior_owner_conflict', sku: 'bulk10' }),
    event('prior_owner_start_b', 'bulk_checkout_started', 'prior_owner_b', 'prior_owner_browser_b', '2026-08-20T00:00:01.000Z', { stripe_session_id: 'cs_prior_owner_conflict', sku: 'bulk10' }),
    event('prior_owner_return_a', 'agency_bulk_checkout_cancelled_return_viewed', 'prior_owner_a', 'prior_owner_browser_a', '2026-08-20T00:01:00.000Z', returnMeta('bulk10')),
  ],
})
check(priorOwnerConflict.checkoutRecovery.exactReturnPeople, 0, 'shared original Stripe Session cannot enter the return denominator')
check(priorOwnerConflict.checkoutRecovery.quality.priorStartIdentityConflictRows, 1, 'original Session owner conflict is explicit')
check(priorOwnerConflict.checkoutRecovery.gate.state, 'collecting', 'original Session conflict cannot advance the gate')

const priorIncompleteContract = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('prior_incomplete_owner')],
  events: [
    event('prior_incomplete_valid', 'bulk_checkout_started', 'prior_incomplete_owner', 'prior_incomplete_browser', '2026-08-20T00:00:00.000Z', { stripe_session_id: 'cs_prior_incomplete', sku: 'bulk10' }),
    event('prior_incomplete_null_browser', 'bulk_checkout_started', 'prior_incomplete_owner', null, '2026-08-20T00:00:01.000Z', { stripe_session_id: 'cs_prior_incomplete', sku: 'bulk10' }),
    event('prior_incomplete_wrong_pack', 'bulk_checkout_started', 'prior_incomplete_owner', 'prior_incomplete_browser', '2026-08-20T00:00:02.000Z', { stripe_session_id: 'cs_prior_incomplete', sku: 'bulk20' }),
    event('prior_incomplete_return', 'agency_bulk_checkout_cancelled_return_viewed', 'prior_incomplete_owner', 'prior_incomplete_browser', '2026-08-20T00:01:00.000Z', returnMeta('bulk10')),
  ],
})
check(priorIncompleteContract.checkoutRecovery.exactReturnPeople, 0, 'missing browser or divergent pack fails the original Session contract')
check(priorIncompleteContract.checkoutRecovery.quality.priorStartIdentityConflictRows, 1, 'incomplete original Session contract is visible')

const allNullBrowserContract = buildB2bCommercialFunnelReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('null_browser_owner')],
  events: [
    event('null_browser_prior', 'bulk_checkout_started', 'null_browser_owner', null, '2026-08-20T00:00:00.000Z', { stripe_session_id: 'cs_null_browser_prior', sku: 'bulk10' }),
    event('null_browser_return', 'agency_bulk_checkout_cancelled_return_viewed', 'null_browser_owner', null, '2026-08-20T00:01:00.000Z', returnMeta('bulk10')),
    event('null_browser_click', 'agency_bulk_checkout_resume_clicked', 'null_browser_owner', null, '2026-08-20T00:02:00.000Z', returnMeta('bulk10')),
    event('null_browser_restart', 'bulk_checkout_started', 'null_browser_owner', null, '2026-08-20T00:03:00.000Z', { stripe_session_id: 'cs_null_browser_recovery', sku: 'bulk10' }),
    event('null_browser_paid', 'bulk_purchase_completed', 'null_browser_owner', null, '2026-08-20T00:04:00.000Z', { stripe_session_id: 'cs_null_browser_recovery', sku: 'bulk10', amount_total: 9900, currency: 'usd' }),
  ],
})
check(allNullBrowserContract.checkoutRecovery.exactReturnPeople, 0, 'all-null browser chain cannot enter the return denominator')
check(allNullBrowserContract.checkoutRecovery.recoveryStartPeople, 0, 'all-null browser chain cannot create a recovery start')
check(allNullBrowserContract.checkoutRecovery.paidPeople, 0, 'all-null browser chain cannot create a recovered buyer')
check(allNullBrowserContract.checkoutRecovery.revenueMinorByCurrency, {}, 'all-null browser chain contributes zero recovery revenue')

process.stdout.write(`B2B commercial funnel report: ${checks}/${checks} checks passed\n`)
