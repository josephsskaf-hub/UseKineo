#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  buildAffiliateFunnelReport,
  fetchAllPages,
  isInternalAffiliateEmail,
} from './affiliate-funnel-report.mjs'

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

for (const email of [
  'josephsskaf@gmail.com',
  'JosephSkaf@outlook.com',
  'josephsskaf+smoke@gmail.com',
  'test-buyer@example.com',
  'person@mailinator.com',
  'reviewer@theresanaiforthat.com',
]) ok(isInternalAffiliateEmail(email), `internal account is excluded: ${email}`)
equal(isInternalAffiliateEmail('buyer@agency.example'), false, 'external agency stays in the funnel')
equal(isInternalAffiliateEmail(null), false, 'missing email is not silently internal')

const pageCalls = []
const paged = await fetchAllPages(async (from, to) => {
  pageCalls.push([from, to])
  if (from === 0) return [{ id: 1 }, { id: 2 }]
  return [{ id: 3 }]
}, 2)
equal(paged.map((row) => row.id), [1, 2, 3], 'pagination keeps every row')
equal(pageCalls, [[0, 1], [2, 3]], 'pagination requests inclusive non-overlapping ranges')
await assert.rejects(() => fetchAllPages(async () => ({}), 2), /array/); checks++
await assert.rejects(() => fetchAllPages(async () => [], 0), /positive integer/); checks++

const cutoff = '2026-08-03T00:00:00.000Z'
const report = buildAffiliateFunnelReport({
  generatedAt: '2026-09-02T06:00:00.000Z',
  days: 30,
  cutoff,
  profiles: [
    { id: 'founder', email: 'josephsskaf@gmail.com', created_at: '2026-01-01T00:00:00Z' },
    { id: 'affiliate-user', email: 'owner@agency.example', created_at: '2026-08-04T00:00:00Z' },
    { id: 'buyer', email: 'buyer@example.com', created_at: '2026-08-05T00:00:00Z', signup_utm_campaign: 'push33_partner_program' },
  ],
  affiliates: [
    { id: 'internal-aff', user_id: 'founder', email: null, status: 'active' },
    { id: 'external-aff', user_id: 'affiliate-user', email: 'owner@agency.example', status: 'active' },
  ],
  clicks: [
    { id: 'ci', affiliate_id: 'internal-aff', ip_hash: 'internal-net' },
    { id: 'c1', affiliate_id: 'external-aff', ip_hash: 'network-a' },
    { id: 'c2', affiliate_id: 'external-aff', ip_hash: 'network-a' },
    { id: 'c3', affiliate_id: 'external-aff', ip_hash: null },
  ],
  referrals: [
    { id: 'ri', affiliate_id: 'external-aff', referred_user_id: 'founder', email: null, status: 'paid', first_touch_at: '2026-08-06T00:00:00Z' },
    { id: 'r1', affiliate_id: 'external-aff', referred_user_id: 'buyer', email: 'buyer@example.com', status: 'paid', first_touch_at: '2026-08-06T00:00:00Z' },
    { id: 'r-old', affiliate_id: 'external-aff', referred_user_id: 'old-buyer', email: 'old@example.com', status: 'paid', first_touch_at: '2026-01-01T00:00:00Z' },
  ],
  commissions: [
    { id: 'ki', affiliate_id: 'internal-aff', referral_id: 'ri', status: 'paid', commission_amount: 9999, currency: 'usd' },
    { id: 'k1', affiliate_id: 'external-aff', referral_id: 'r1', status: 'pending', commission_amount: 280, currency: 'USD' },
    { id: 'k-old', affiliate_id: 'external-aff', referral_id: 'r-old', status: 'paid', commission_amount: 120, currency: 'USD' },
    { id: 'k-unknown', affiliate_id: 'external-aff', referral_id: 'r1', status: 'approved', commission_amount: 50, currency: null },
    { id: 'k-invalid-currency', affiliate_id: 'external-aff', referral_id: 'r1', status: 'pending', commission_amount: 70, currency: 'ZZZ' },
    { id: 'k2', affiliate_id: 'external-aff', referral_id: null, status: 'paid', commission_amount: 100, currency: 'usd' },
  ],
  events: [
    { name: 'landing_session_started', user_id: 'founder', session_id: 's-internal', path: '/partners', metadata: {} },
    { name: 'landing_session_started', user_id: null, session_id: 's-public', path: '/partners', metadata: {} },
    { name: 'landing_session_started', user_id: null, session_id: null, path: '/partners', metadata: {} },
    { name: 'organic_cta_clicked', user_id: 'buyer', session_id: 's-buyer', path: '/partners', metadata: { source: 'partners' } },
    { name: 'affiliate_application_submitted', user_id: 'affiliate-user', session_id: 's-aff', path: '/api/affiliate/apply', metadata: {} },
  ],
})

equal(report.exclusions.internalAffiliateRows, 1, 'internal affiliate row is excluded')
equal(report.exclusions.internalProfileRows, 1, 'old internal profile is excluded without a cutoff blind spot')
equal(report.customAffiliateSystem.affiliates, { total: 1, active: 1, pending: 0, suspended: 0 }, 'affiliate status counts external owners only')
equal(report.customAffiliateSystem.acquisitionClicks.firstTouchRows, 3, 'click output is explicitly rows, not people')
equal(report.customAffiliateSystem.acquisitionClicks.hashedNetworkKeys, 1, 'repeated network hash is one pseudonymous key')
equal(report.customAffiliateSystem.acquisitionClicks.rowsWithoutNetworkKey, 1, 'unhashed rows stay visible')
equal(report.customAffiliateSystem.acquisitionClicks.completePeopleCountAvailable, false, 'report refuses to claim a complete people count')
equal(report.customAffiliateSystem.referrals, { rows: 1, people: 1, paidPeople: 1 }, 'referrals count distinct external people')
equal(report.schemaVersion, 'affiliate_funnel_report_v2', 'breaking output contract is explicitly versioned')
equal(report.customAffiliateSystem.commissions.externallyAttributedRows, 4, 'current commission may belong to an external referral created before the window')
equal(report.customAffiliateSystem.commissions.unattributedRows, 1, 'unverifiable commission stays separate')
equal(report.customAffiliateSystem.commissions.centsByCurrency.usd, { pending: 280, approved: 0, paid: 120, total: 400 }, 'money totals use externally attributed rows only')
equal(report.customAffiliateSystem.commissions.centsByCurrency.unknown, { pending: 70, approved: 50, paid: 0, total: 120 }, 'missing or unexpected currency stays unknown instead of being inferred as USD')
equal(report.publicPartnerFunnel.landingSessions, { rawEvents: 2, identifiedPeople: 0, anonymousSessions: 1, rowsWithoutActor: 1, completePeopleCountAvailable: false }, 'anonymous sessions and unattributed rows remain separate from people')
equal(report.publicPartnerFunnel.ctaClicks, { rawEvents: 1, identifiedPeople: 1, anonymousSessions: 0, rowsWithoutActor: 0, completePeopleCountAvailable: true }, 'identified CTA people remain explicit')
equal(report.publicPartnerFunnel.applications, { rawEvents: 1, identifiedPeople: 1, anonymousSessions: 0, rowsWithoutActor: 0, completePeopleCountAvailable: true }, 'identified applicants remain explicit')
equal(report.publicPartnerFunnel.attributedSignups, 1, 'external attributed signup is counted inside the window')
ok(report.units.acquisitionClicks.includes('neither is a people count'), 'output contract states that clicks and hashes are not people')
ok(report.note.includes('never added'), 'output refuses to add anonymous sessions to people')
equal(Object.hasOwn(report.customAffiliateSystem, 'clicks'), false, 'ambiguous legacy clicks field is removed')
equal(Object.hasOwn(report.customAffiliateSystem, 'paidReferrals'), false, 'ambiguous legacy paidReferrals field is removed')

const caller = fs.readFileSync('scripts/measure-affiliate-funnel.mjs', 'utf8')
ok(caller.includes("from './affiliate-funnel-report.mjs'"), 'production measurement imports the executed report policy')
const helper = fs.readFileSync('scripts/affiliate-funnel-report.mjs', 'utf8')
const measurementHelpers = fs.readFileSync('scripts/measurement-helpers.mjs', 'utf8')
ok(helper.includes("from './measurement-helpers.mjs'"), 'affiliate report shares the canonical measurement helpers')
ok(measurementHelpers.includes("new URL('../lib/internalAccounts.ts', import.meta.url)"), 'measurement reads the canonical internal-account source')
ok(!helper.includes("'josephsskaf@gmail.com'"), 'measurement does not duplicate internal-account values')
ok(caller.includes(".select('id,user_id,email,status,created_at')"), 'affiliate owner identity is available for internal exclusion')
ok(caller.includes(".select('id,affiliate_id,ip_hash,created_at')"), 'click query carries the only safe pseudonymous dimension')
ok(caller.includes(".select('id,affiliate_id,referred_user_id,email,status,first_touch_at,converted_at')"), 'referral query can count external people')
ok(caller.includes(".select('id,affiliate_id,referral_id,status,commission_amount,currency,created_at')"), 'commission query can prove referral attribution')
equal((caller.match(/\.range\(from, to\)/g) ?? []).length, 6, 'all six datasets use explicit pagination')
ok(caller.includes(".in('name', ['landing_session_started', 'organic_cta_clicked', 'affiliate_application_submitted'])"), 'event scan is bounded to consumed stages')
ok(!caller.includes('clicks: clicks.length'), 'caller cannot restore the ambiguous click count')
ok(!/affiliate_referrals[\s\S]{0,220}\.gte\('first_touch_at'/.test(caller), 'old referrals remain available to attribute current renewals')

console.log(`affiliate funnel report: ${checks}/${checks} checks passed`)
