#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import {
  buildAffiliateClientBriefRelayReport,
} from './affiliate-client-brief-relay-report.mjs'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

function executeTs(file, mocks = {}) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error('unmocked import ' + id + ' while executing ' + file)
    },
    URL,
    URLSearchParams,
    Map,
    Promise,
    RegExp,
    String,
    process: {
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      },
    },
  }, { filename: file })
  return moduleBox.exports
}

const destinations = executeTs('lib/affiliateDestinations.ts')
const relay = executeTs('lib/growth/affiliateClientBriefRelay.ts', {
  '@/lib/affiliateDestinations': destinations,
})
const CODE = 'ABCD2345'

equal(destinations.AFFILIATE_DESTINATIONS.length, 4, 'route-only relay does not add a dashboard campaign card')
equal(destinations.getAffiliateDestination('client_brief'), null, 'public campaign selector cannot see hidden destination')
equal(destinations.getAffiliateRouteDestination(' CLIENT_BRIEF ').key, 'client_brief', 'route parser accepts only the hidden enum')
const target = destinations.buildAffiliateRouteDestinationUrl('https://www.usekineo.com', 'client_brief')
equal(target.pathname, '/client-video-brief-generator', 'relay lands on the existing free client tool')
equal(target.searchParams.get('utm_source'), 'affiliate', 'relay carries canonical affiliate source')
equal(target.searchParams.get('utm_medium'), 'partner', 'relay carries canonical affiliate medium')
equal(target.searchParams.get('utm_campaign'), 'affiliate_client_brief', 'relay campaign is isolated')
equal(destinations.affiliateDestinationBucket('/a/' + CODE + '?to=client_brief'), 'legacy', 'hidden relay does not change the Claude-owned admin contract')

const attributed = relay.affiliateClientBriefRelayHref({
  eligible: true,
  affiliate: { status: 'ACTIVE' },
  link: 'https://preview.invalid/a/' + CODE + '?old=1#fragment',
})
const attributedUrl = new URL(attributed)
equal(attributedUrl.origin, 'https://www.usekineo.com', 'API host is never trusted for copied links')
equal(attributedUrl.pathname, '/a/' + CODE, 'valid owner code survives canonicalization')
equal(attributedUrl.searchParams.toString(), 'to=client_brief', 'copied link carries only the hidden enum')
for (const payload of [
  null,
  {},
  { eligible: false, affiliate: { status: 'active' }, link: 'https://www.usekineo.com/a/' + CODE },
  { eligible: true, affiliate: { status: 'pending' }, link: 'https://www.usekineo.com/a/' + CODE },
  { eligible: true, affiliate: { status: 'active' }, link: 'https://www.usekineo.com/not-affiliate' },
  { eligible: true, affiliate: { status: 'active' }, link: 'javascript:alert(1)' },
]) {
  equal(relay.affiliateClientBriefRelayHref(payload), null, 'invalid or ineligible payload fails to generic fallback')
}

const metadata = relay.affiliateClientBriefRelayCopiedMetadata()
equal(
  Object.keys(metadata).sort().join(','),
  'distribution_mode,surface,version',
  'closed event has only three categorical fields',
)
equal(metadata.distribution_mode, 'affiliate_attributed', 'event distinguishes successful attributed copy')
ok(!JSON.stringify(metadata).includes(CODE), 'closed event carries no affiliate code')

{
  let release
  let loads = 0
  const pendingPayload = new Promise((resolve) => { release = resolve })
  const resolver = relay.createAffiliateClientBriefRelayResolver(async () => {
    loads += 1
    return pendingPayload
  })
  const preload = resolver.preload()
  const doublePreload = resolver.preload()
  equal(resolver.current(), null, 'click before lookup completion gets an immediate generic snapshot')
  equal(loads, 0, 'loader starts in one microtask instead of during render')
  release({ eligible: true, affiliate: { status: 'active' }, link: 'https://www.usekineo.com/a/' + CODE })
  const [preloadedHref, doubleHref] = await Promise.all([preload, doublePreload])
  equal(loads, 1, 'preload and repeated reads share exactly one lookup')
  equal(preloadedHref, attributed, 'preload resolves the attributed relay')
  equal(doubleHref, attributed, 'double preload cannot create a second lookup')
  equal(resolver.current(), attributed, 'click after preload receives attributed snapshot')
}
{
  let loads = 0
  const resolver = relay.createAffiliateClientBriefRelayResolver(async () => {
    loads += 1
    throw new Error('503')
  })
  equal(await resolver.preload(), null, 'lookup failure resolves to generic fallback')
  equal(resolver.current(), null, 'failed lookup leaves an immediate generic snapshot')
  equal(await resolver.preload(), null, 'failure result is reused for the page lifecycle')
  equal(loads, 1, 'failure cannot create a lookup loop')
}
{
  let loads = 0
  const resolver = relay.createAffiliateClientBriefRelayResolver(async () => {
    loads += 1
    return new Promise(() => {})
  })
  void resolver.preload()
  await Promise.resolve()
  equal(loads, 1, 'hanging lookup starts once')
  equal(resolver.current(), null, 'hanging lookup cannot block the immediate generic snapshot')
}

const client = read('app/client-video-brief-generator/ClientVideoBriefGenerator.tsx')
ok(client.includes("fetch('/api/affiliate/client-brief-link'"), 'real tool preloads the side-effect-free owner lookup')
ok(client.includes('const affiliateIntakeHref = affiliateIntakeResolver.current()'), 'click reads a synchronous snapshot and never waits for network')
ok(client.includes('affiliateIntakeHref\n      ?? new URL') || client.includes('affiliateIntakeHref\r\n      ?? new URL'), 'generic share remains the null fallback after lookup')
ok(client.includes('void affiliateIntakeResolver.preload()'), 'page preloads the same resolver read by click')
ok(!client.includes('await affiliateIntakeResolver'), 'clipboard path cannot hang on affiliate lookup')
ok(client.indexOf('await navigator.clipboard.writeText(shareUrl)') < client.indexOf("'affiliate_client_brief_relay_copied'"), 'copy event occurs only after clipboard success')
ok(client.includes('trackClosedEvent('), 'attributed action uses privacy-closed transport')
ok(client.includes("trackEvent('client_short_brief_intake_link_copied'"), 'legacy intake event remains intact')
ok(!/affiliate_client_brief_relay_copied[\s\S]{0,240}\b(?:code|email|link|url|offer|audience|proof|cta)\s*:/.test(client), 'relay event includes no owner or client data')

const endpoint = read('app/api/affiliate/client-brief-link/route.ts')
ok(endpoint.includes(".select('code, status')"), 'endpoint reads only the two required affiliate fields')
ok(endpoint.includes("affiliate?.status !== 'active'"), 'inactive affiliate fails closed')
ok(endpoint.includes('normalizeAffiliateCode(affiliate?.code)'), 'owner code is validated before exposure')
ok(endpoint.includes("fetchCache = 'force-no-store'"), 'owner eligibility is never served from stale cache')
ok(!endpoint.includes("from '@/lib/stripe'"), 'lookup cannot mint coupons or call Stripe')
ok(!endpoint.includes('.insert(') && !endpoint.includes('.update(') && !endpoint.includes('.delete('), 'lookup has no database write')

const route = read('app/a/[code]/route.ts')
ok(route.includes('getAffiliateRouteDestination('), 'real redirect route executes the route-only allowlist')
ok(route.includes('buildAffiliateRouteDestinationUrl('), 'real redirect uses the fixed first-party URL builder')

async function runOwnerEndpoint({ user = { id: 'owner-1' }, affiliate = { code: CODE, status: 'active' }, queryError = null, queryThrows = false } = {}) {
  const reads = []
  const authClient = {
    auth: {
      async getUser() {
        return { data: { user } }
      },
    },
  }
  const adminClient = {
    from(table) {
      equal(table, 'affiliates', 'owner endpoint reads only the affiliate table')
      const query = {
        select(fields) { reads.push(fields); return this },
        eq(field, value) {
          equal(field, 'user_id', 'owner lookup is keyed by authenticated user')
          equal(value, 'owner-1', 'owner lookup never accepts a client-supplied user id')
          return this
        },
        async maybeSingle() {
          if (queryThrows) throw new Error('database unavailable')
          return { data: affiliate, error: queryError }
        },
      }
      return query
    },
  }
  const routeModule = executeTs('app/api/affiliate/client-brief-link/route.ts', {
    'next/server': {
      NextResponse: {
        json(body, init = {}) {
          return { body, status: init.status ?? 200 }
        },
      },
    },
    '@/lib/supabase/server': { createClient: () => authClient },
    '@supabase/supabase-js': { createClient: () => adminClient },
    '@/lib/affiliateCode': executeTs('lib/affiliateCode.ts'),
  })
  return { response: await routeModule.GET(), reads }
}

{
  const { response, reads } = await runOwnerEndpoint()
  equal(response.status, 200, 'active owner lookup succeeds')
  equal(response.body.eligible, true, 'active affiliate is eligible')
  equal(response.body.affiliate.status, 'active', 'response exposes only active status')
  equal(response.body.link, 'https://www.usekineo.com/a/' + CODE, 'response returns canonical owner link')
  equal(reads.join(','), 'code, status', 'active lookup reads only code and status')
}
{
  const { response, reads } = await runOwnerEndpoint({ user: null })
  equal(response.body.eligible, false, 'anonymous visitor keeps generic sharing')
  equal(reads.length, 0, 'anonymous visitor causes no admin database query')
}
for (const scenario of [
  { affiliate: null },
  { affiliate: { code: CODE, status: 'pending' } },
  { affiliate: { code: 'bad-code', status: 'active' } },
]) {
  const { response } = await runOwnerEndpoint(scenario)
  equal(response.body.eligible, false, 'missing, inactive or malformed affiliate keeps generic sharing')
}
for (const scenario of [
  { queryError: { code: 'DB_DOWN' } },
  { queryThrows: true },
]) {
  const { response } = await runOwnerEndpoint(scenario)
  equal(response.status, 503, 'lookup outage is explicit to the caller')
  equal(response.body.eligible, false, 'lookup outage cannot create an attributed link')
}

const generatedAt = '2026-09-10T00:00:00.000Z'
const windowStart = '2026-08-11T00:00:00.000Z'
const ownerProfile = (index, email = 'owner' + index + '@example.com') => ({
  id: 'owner-' + index,
  email,
})
const ownerAffiliate = (index, overrides = {}) => ({
  id: 'affiliate-' + index,
  user_id: 'owner-' + index,
  email: 'owner' + index + '@example.com',
  code: 'ABCD23' + String(44 + index),
  status: 'active',
  ...overrides,
})
const relayCopy = (index, createdAt = '2026-09-01T00:00:00.000Z', overrides = {}) => ({
  id: 'copy-' + index,
  name: 'affiliate_client_brief_relay_copied',
  user_id: 'owner-' + index,
  created_at: createdAt,
  metadata: {
    version: 'affiliate_client_brief_relay_v1',
    surface: 'client_video_brief_generator',
    distribution_mode: 'affiliate_attributed',
  },
  ...overrides,
})
const relayClick = (index, createdAt = '2026-09-02T00:00:00.000Z', overrides = {}) => ({
  id: 'click-' + index,
  affiliate_id: 'affiliate-' + index,
  landing_path: '/a/ABCD23' + String(44 + index) + '?to=client_brief',
  created_at: createdAt,
  ...overrides,
})
const reportFor = (overrides = {}) => buildAffiliateClientBriefRelayReport({
  generatedAt,
  windowStart,
  copyEvents: [relayCopy(1)],
  profiles: [ownerProfile(1)],
  affiliates: [ownerAffiliate(1)],
  clickProofs: [],
  ...overrides,
})

{
  const report = reportFor()
  equal(report.gate, 'collecting', 'one external owner without a click remains collecting')
  equal(report.counts.externalOwnersCopied, 1, 'copy denominator counts owners, not events')
  equal(report.counts.eligibleClickProofs, 0, 'no click proof is not invented')
  equal(report.contract.paymentAttribution, 'unknown_for_this_relay', 'report cannot claim this relay caused payment')
}
{
  const profiles = []
  const affiliates = []
  const copies = []
  for (let index = 1; index <= 5; index += 1) {
    profiles.push(ownerProfile(index))
    affiliates.push(ownerAffiliate(index))
    copies.push(relayCopy(index))
  }
  const success = reportFor({ profiles, affiliates, copyEvents: copies, clickProofs: [relayClick(1)] })
  equal(success.gate, 'success_click_proof', 'one eligible server click proof succeeds after five mature owners')
  equal(success.counts.externalOwnersCopied, 5, 'five mature owners are deduped')
  equal(success.counts.ownersWithClickProof, 1, 'owner numerator is distinct')
  equal(success.counts.eligibleClickProofs, 1, 'click numerator counts exact proof ids')
  const stopped = reportFor({ profiles, affiliates, copyEvents: copies, clickProofs: [] })
  equal(stopped.gate, 'stop_no_click_proof', 'five mature owners and zero proof stops the path')
}
{
  const duplicatedCopy = relayCopy(1, '2026-09-03T00:00:00.000Z', { id: 'copy-duplicate' })
  const report = reportFor({ copyEvents: [relayCopy(1), duplicatedCopy], clickProofs: [relayClick(1)] })
  equal(report.counts.externalOwnersCopied, 1, 'repeat copy cannot inflate owner denominator')
  equal(report.counts.eligibleClickProofs, 1, 'one proof id remains one numerator')
}
{
  const report = reportFor({
    profiles: [ownerProfile(1, 'josephsskaf@gmail.com')],
    affiliates: [ownerAffiliate(1, { email: 'josephsskaf@gmail.com' })],
  })
  equal(report.counts.externalOwnersCopied, 0, 'founder account is excluded from external denominator')
  equal(report.excluded.internalOwners, 1, 'internal exclusion is visible')
}
{
  const report = reportFor({ clickProofs: [relayClick(1)], copyEvents: [] })
  equal(report.gate, 'blocked_quality', 'client brief click without an eligible prior copy blocks quality')
  equal(report.qualityBlockers.click_without_eligible_owner_copy, 1, 'orphan click proof is named')
}
{
  const report = reportFor({ copyEvents: [relayCopy(1, null)] })
  equal(report.gate, 'blocked_quality', 'undated exact copy blocks quality')
  equal(report.qualityBlockers.copy_clock_missing, 1, 'missing copy clock is named')
}
{
  const report = reportFor({ affiliates: [ownerAffiliate(1), ownerAffiliate(1, { id: 'affiliate-other' })] })
  equal(report.gate, 'blocked_quality', 'duplicate affiliate owner blocks quality')
  equal(report.qualityBlockers.owner_affiliate_conflict, 1, 'affiliate owner conflict is named')
}
{
  const boundary = reportFor({
    copyEvents: [relayCopy(1, '2026-08-10T00:00:00.000Z')],
    clickProofs: [relayClick(1, '2026-08-12T00:00:00.000Z')],
  })
  equal(boundary.gate, 'collecting', 'pre-window seed explains a boundary click without blocking quality')
  equal(boundary.counts.externalOwnersCopied, 0, 'pre-window copy does not enter cohort denominator')
  equal(boundary.counts.eligibleClickProofs, 0, 'click explained only by seed does not enter cohort numerator')
  equal(boundary.diagnostics.pre_window_copy_click_proof, 1, 'boundary click is visible as a diagnostic')
  equal(Object.keys(boundary.qualityBlockers).length, 0, 'valid boundary sequence is not mislabeled orphan')
}

const collector = read('scripts/measure-affiliate-client-brief-relay.mjs')
ok(collector.includes('fetchAllPages'), 'collector paginates every SELECT')
ok(collector.includes(".eq('name', AFFILIATE_CLIENT_BRIEF_RELAY_EVENT)"), 'collector reads only the closed copy event')
ok(collector.includes(".like('landing_path', '%?to=client_brief')"), 'collector reads only client brief click proofs')
ok(collector.includes(".is('created_at', null)"), 'collector exposes missing clocks')
ok(collector.includes('copySeedStart'), 'collector gives copies one observation window of boundary lookback')
ok(!collector.includes('.insert(') && !collector.includes('.update(') && !collector.includes('.delete('), 'collector is SELECT-only')

console.log('PASS — ' + checks + '/' + checks + ' affiliate client brief relay checks')
