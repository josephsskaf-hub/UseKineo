#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

function executeTs(file, mocks = {}, env = {}) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error(`unmocked import ${id} while executing ${file}`)
    },
    process: { env },
    console: { log() {}, warn() {}, error() {} },
    URL,
    URLSearchParams,
    Map,
    Promise,
    RegExp,
  }, { filename: file })
  return moduleBox.exports
}

const destinations = executeTs('lib/affiliateDestinations.ts')
const attribution = executeTs('lib/affiliateAttribution.ts', {
  '@supabase/supabase-js': { createClient: () => { throw new Error('not used') } },
})
const CODE = 'ABCD2345'
const OLD_CODE = 'WXYZ2345'
const CLICK_ID = '11111111-1111-4111-8111-111111111111'
const OLD_CLICK_ID = '22222222-2222-4222-8222-222222222222'

equal(destinations.AFFILIATE_DESTINATIONS.length, 3, 'three audience-specific first-party destinations are enabled')
equal(destinations.RECOMMENDED_AFFILIATE_DESTINATION, 'script', 'free script tool is recommended')
const scriptDestination = destinations.getAffiliateDestination(' ScRiPt ')
equal(scriptDestination.path, '/free-script-generator', 'destination key normalizes')
const expectedDestinations = {
  script: { path: '/free-script-generator', campaign: 'affiliate_script' },
  video: { path: '/free-ai-shorts-generator', campaign: 'affiliate_video' },
  faceless: { path: '/faceless-video-generator', campaign: 'affiliate_faceless' },
}
for (const [key, expected] of Object.entries(expectedDestinations)) {
  const destination = destinations.getAffiliateDestination(key)
  equal(destination.path, expected.path, `${key} uses the intended acquisition page`)
  check(destination.audience.length > 20, `${key} declares its audience`)
  check(destination.sharePitch.length > 40, `${key} has ready-to-post copy`)
  check(destination.spokenPitch.length > 40, `${key} has a speaking script`)
  const destinationUrl = destinations.buildAffiliateDestinationUrl('https://www.usekineo.com', key)
  equal(destinationUrl.origin, 'https://www.usekineo.com', `${key} stays first-party`)
  equal(destinationUrl.pathname, expected.path, `${key} destination path is exact`)
  equal(destinationUrl.searchParams.get('utm_source'), 'affiliate', `${key} source UTM is fixed`)
  equal(destinationUrl.searchParams.get('utm_medium'), 'partner', `${key} medium UTM is fixed`)
  equal(destinationUrl.searchParams.get('utm_campaign'), expected.campaign, `${key} campaign UTM is fixed`)
  const campaignShare = new URL(destinations.buildAffiliateShareLink(`http://preview.invalid/a/${CODE}?old=1#x`, key))
  equal(campaignShare.origin, 'https://www.usekineo.com', `${key} share canonicalizes production host`)
  equal(campaignShare.pathname, `/a/${CODE}`, `${key} share keeps only the affiliate entry path`)
  equal(campaignShare.searchParams.toString(), `to=${key}`, `${key} share carries only its allowlisted destination`)
  equal(destinations.affiliateDestinationBucket(`/a/${CODE}?to=${key}`), key, `${key} click is measurable by destination`)
}
for (const legacyPath of [null, '', `/a/${CODE}`, `/a/${CODE}?to=unknown`, 'not a URL%%%']) {
  equal(destinations.affiliateDestinationBucket(legacyPath), 'legacy', `legacy bucket is explicit for ${legacyPath ?? 'null'}`)
}
for (const unsafe of ['', 'https://evil.example', '//evil.example', '../pricing', 'script&next=evil', 'home', 'agency']) {
  equal(destinations.getAffiliateDestination(unsafe), null, `unsafe destination rejected: ${unsafe || '(empty)'}`)
}

const target = destinations.buildAffiliateDestinationUrl('https://www.usekineo.com', 'script')
equal(target.origin, 'https://www.usekineo.com', 'destination stays first-party')
equal(target.pathname, '/free-script-generator', 'destination path is exact')
equal(target.searchParams.get('utm_source'), 'affiliate', 'source UTM is fixed')
equal(target.searchParams.get('utm_medium'), 'partner', 'medium UTM is fixed')
equal(target.searchParams.get('utm_campaign'), 'affiliate_script', 'campaign UTM is fixed')

const share = new URL(destinations.buildAffiliateShareLink(`http://preview.invalid/a/${CODE}?old=1#x`, 'script'))
equal(share.origin, 'https://www.usekineo.com', 'share link canonicalizes production host and HTTPS')
equal(share.pathname, `/a/${CODE}`, 'share link keeps only a validated affiliate entry path')
equal(share.searchParams.toString(), 'to=script', 'share link carries only allowlisted destination')
equal(destinations.buildAffiliateShareLink('https://evil.example/free-script-generator', 'script'), '', 'arbitrary path cannot become copied link')
equal(destinations.buildAffiliateShareLink('not a URL', 'script'), '', 'invalid base link fails closed')

for (const ua of ['Twitterbot/1.0', 'facebookexternalhit/1.1', 'WhatsApp/2.0', 'Slackbot-LinkExpanding 1.0', 'Googlebot']) {
  equal(destinations.isAffiliatePreviewBot(ua), true, `${ua} is excluded from acquisition visits`)
}
equal(destinations.isAffiliatePreviewBot('Mozilla/5.0 Chrome/140'), false, 'human browser remains eligible')

function responseMock() {
  return {
    redirect(target) {
      const response = { status: 307, location: String(target), cookieWrites: [] }
      response.cookies = { set: (name, value, options) => response.cookieWrites.push({ name, value, options }) }
      return response
    },
  }
}

async function runRoute({
  to = 'script',
  active = true,
  existingCode = null,
  existingClickId = null,
  existingStatus = 'active',
  existingLookupError = false,
  currentLookupThrows = false,
  clickFailure = null,
  userAgent = 'Mozilla/5.0 Chrome/140',
  proofRows = {},
} = {}) {
  const inserts = []
  let nextClick = 1
  const proofMap = new Map(Object.entries(proofRows))
  const sb = {
    from(table) {
      const query = {
        table,
        operation: 'select',
        payload: null,
        filters: {},
        select() { return this },
        eq(field, value) { this.filters[field] = value; return this },
        insert(payload) { this.operation = 'insert'; this.payload = payload; inserts.push(payload); return this },
        async single() {
          if (currentLookupThrows) throw new Error('affiliate lookup unavailable')
          return { data: active ? { id: 'affiliate-current', status: 'active' } : null, error: null }
        },
        async maybeSingle() {
          if (table === 'affiliates') {
            if (existingLookupError) return { data: null, error: { code: 'LOOKUP' } }
            if (this.filters.code === CODE) return { data: { id: 'affiliate-current', status: 'active' }, error: null }
            if (this.filters.code === OLD_CODE && existingStatus) {
              return { data: { id: 'affiliate-old', status: existingStatus }, error: null }
            }
            return { data: null, error: null }
          }
          if (table === 'affiliate_clicks' && this.operation === 'insert') {
            if (clickFailure === 'throw') throw new Error('click insert unavailable')
            if (clickFailure === 'error') return { data: null, error: { code: 'CLICK_DOWN' } }
            const id = nextClick++ === 1 ? CLICK_ID : `33333333-3333-4333-8333-33333333333${nextClick}`
            proofMap.set(id, this.payload.affiliate_id)
            return { data: { id }, error: null }
          }
          if (table === 'affiliate_clicks' && this.operation === 'select') {
            const owner = proofMap.get(this.filters.id)
            const valid = owner && owner === this.filters.affiliate_id
            return { data: valid ? { id: this.filters.id } : null, error: null }
          }
          throw new Error(`unexpected maybeSingle ${table}/${this.operation}`)
        },
      }
      return query
    },
  }
  const route = executeTs('app/a/[code]/route.ts', {
    'next/server': { NextResponse: responseMock() },
    crypto: await import('node:crypto'),
    '@supabase/supabase-js': { createClient: () => sb },
    '@/lib/affiliateDestinations': destinations,
    '@/lib/affiliateAttribution': attribution,
  }, { AFFILIATE_IP_SALT: 'private-test-salt' })
  const query = to === null ? '' : `?to=${encodeURIComponent(to)}`
  const req = {
    nextUrl: new URL(`https://www.usekineo.com/a/${CODE}${query}`),
    headers: { get(name) {
      if (name === 'user-agent') return userAgent
      if (name === 'x-forwarded-for') return '203.0.113.10'
      return ''
    } },
    cookies: { get(name) {
      if (name === 'sf_aff' && existingCode) return { value: existingCode }
      if (name === 'sf_aff_click' && existingClickId) return { value: existingClickId }
      return undefined
    } },
  }
  const response = await route.GET(req, { params: { code: CODE.toLowerCase() } })
  return { response, inserts }
}

{
  const { response, inserts } = await runRoute()
  const location = new URL(response.location)
  equal(location.pathname, '/free-script-generator', 'valid link reaches free script tool')
  equal(location.searchParams.get('utm_campaign'), 'affiliate_script', 'real route keeps campaign')
  equal(inserts.length, 1, 'first human visit creates one protected click')
  equal(inserts[0].landing_path, `/a/${CODE}?to=script`, 'click row stores normalized allowlisted path')
  equal(response.cookieWrites.length, 3, 'first visit writes code, proof and boolean hint')
  const codeCookie = response.cookieWrites.find((item) => item.name === 'sf_aff')
  const proofCookie = response.cookieWrites.find((item) => item.name === 'sf_aff_click')
  const hintCookie = response.cookieWrites.find((item) => item.name === 'sf_aff_hint')
  equal(codeCookie.value, CODE, 'code cookie normalizes')
  equal(codeCookie.options.httpOnly, true, 'code stays server-only')
  equal(proofCookie.value, CLICK_ID, 'proof cookie is server-minted click UUID')
  equal(proofCookie.options.httpOnly, true, 'proof stays server-only')
  equal(hintCookie.value, '1', 'client sees only boolean retry hint')
  equal(hintCookie.options.httpOnly, undefined, 'hint contains no owner secret')
  equal(codeCookie.options.maxAge, 90 * 24 * 60 * 60, 'first-touch window is 90 days')
}

for (const [key, expected] of Object.entries(expectedDestinations)) {
  const { response, inserts } = await runRoute({ to: key })
  const location = new URL(response.location)
  equal(location.pathname, expected.path, `${key} route reaches the matching acquisition surface`)
  equal(location.searchParams.get('utm_campaign'), expected.campaign, `${key} route preserves campaign attribution`)
  equal(inserts[0].landing_path, `/a/${CODE}?to=${key}`, `${key} click stores its normalized destination`)
}

for (const unsafe of [null, 'https://evil.example', '//evil.example', '../checkout', 'home']) {
  const { response, inserts } = await runRoute({ to: unsafe })
  const location = new URL(response.location)
  equal(location.origin, 'https://www.usekineo.com', `unsafe ${unsafe} stays first-party`)
  equal(location.pathname, '/', `unsafe ${unsafe} falls back home`)
  equal(inserts[0].landing_path, `/a/${CODE}`, `unsafe ${unsafe} cannot poison landing path`)
}

{
  const { response, inserts } = await runRoute({ active: false })
  equal(new URL(response.location).pathname, '/', 'inactive affiliate goes home')
  equal(response.cookieWrites.length, 0, 'inactive owner mints no cookies')
  equal(inserts.length, 0, 'inactive owner mints no click')
}

{
  const { response, inserts } = await runRoute({
    existingCode: CODE,
    existingClickId: OLD_CLICK_ID,
    proofRows: { [OLD_CLICK_ID]: 'affiliate-current' },
  })
  equal(inserts.length, 0, 'same proven browser refresh does not inflate visits')
  equal(response.cookieWrites.length, 1, 'same proven browser refreshes only hint')
  equal(response.cookieWrites[0].name, 'sf_aff_hint', 'refresh cannot mutate financial pair')
}

{
  const { response } = await runRoute({
    existingCode: OLD_CODE,
    existingClickId: OLD_CLICK_ID,
    proofRows: { [OLD_CLICK_ID]: 'affiliate-old' },
  })
  equal(response.cookieWrites.filter((item) => item.name === 'sf_aff').length, 0, 'valid first-touch A survives later B')
  equal(response.cookieWrites.filter((item) => item.name === 'sf_aff_click').length, 0, 'valid A proof survives later B')
  equal(response.cookieWrites.filter((item) => item.name === 'sf_aff_hint').length, 1, 'prior owner can wake post-signup attribution')
}

{
  const { response } = await runRoute({ existingCode: OLD_CODE })
  equal(response.cookieWrites.find((item) => item.name === 'sf_aff')?.value, CODE, 'unprovable legacy A yields to genuine proven B')
  equal(response.cookieWrites.find((item) => item.name === 'sf_aff_click')?.value, CLICK_ID, 'replacement is atomic code+proof')
}

{
  const { response } = await runRoute({
    existingCode: CODE,
    existingClickId: OLD_CLICK_ID,
    proofRows: { [OLD_CLICK_ID]: 'affiliate-old' },
  })
  equal(response.cookieWrites.find((item) => item.name === 'sf_aff')?.value, CODE, 'mismatched proof is repaired on genuine same-code visit')
  equal(response.cookieWrites.find((item) => item.name === 'sf_aff_click')?.value, CLICK_ID, 'poisoned proof is replaced')
}

for (const clickFailure of ['error', 'throw']) {
  const { response, inserts } = await runRoute({ clickFailure })
  equal(new URL(response.location).pathname, '/free-script-generator', `${clickFailure} preserves useful destination`)
  equal(response.cookieWrites.length, 0, `${clickFailure} cannot mint an unbacked financial cookie`)
  equal(inserts.length, 1, `${clickFailure} attempted exactly one click write`)
}

for (const userAgent of ['Twitterbot/1.0', 'WhatsApp/2.0']) {
  const { response, inserts } = await runRoute({ userAgent })
  equal(new URL(response.location).pathname, '/free-script-generator', `${userAgent} still receives preview destination`)
  equal(inserts.length, 0, `${userAgent} is not counted as a visit`)
  equal(response.cookieWrites.length, 0, `${userAgent} receives no financial proof`)
}

{
  const { response, inserts } = await runRoute({ currentLookupThrows: true })
  equal(new URL(response.location).pathname, '/', 'provider outage fails closed to home')
  equal(response.cookieWrites.length, 0, 'provider outage cannot mint cookie')
  equal(inserts.length, 0, 'provider outage cannot mint click')
}

{
  const { response } = await runRoute({ existingCode: OLD_CODE, existingLookupError: true })
  equal(response.cookieWrites.filter((item) => item.name === 'sf_aff').length, 0, 'owner lookup outage blocks takeover')
}

const dashboard = read('app/(dashboard)/affiliate/page.tsx')
check(dashboard.includes('getAffiliateDestination(selectedDestinationKey)'), 'copy and link derive from the selected allowlisted key')
check(dashboard.includes("buildAffiliateShareLink(data.link ?? '', selectedDestinationKey)"), 'dashboard uses canonical deep-link builder')
check(dashboard.includes('async function copyLink()'), 'clipboard success is awaited')
check(dashboard.includes('await navigator.clipboard.writeText(link)'), 'link copied event cannot fire before clipboard resolves')
check(dashboard.includes('Link visits'), 'raw rows are not mislabeled people or unique clicks')
check(dashboard.includes('Free value before signup'), 'visual after-state badge is in product')
check(dashboard.includes('htmlFor="affiliate-campaign-share-link"'), 'share input has programmatic label')
check(dashboard.includes('aria-live="polite"'), 'copy confirmation is announced')
check(dashboard.includes('role="group"'), 'campaign selector exposes a semantic group')
check(dashboard.includes('aria-pressed={selected}'), 'campaign selector exposes selected state')
check(dashboard.includes('affiliate_campaign_selected'), 'campaign choice is measured')
check(dashboard.includes('affiliate_campaign_asset_copied'), 'campaign asset usage is measured')
check(dashboard.includes('Ready-to-post caption'), 'dashboard supplies ready-to-post copy')
check(dashboard.includes('Short speaking script'), 'dashboard supplies a short spoken pitch without promising exact timing')

const partners = read('app/partners/page.tsx')
check(partners.includes('A campaign kit, not just a link'), 'public recruiting page promises the implemented kit')
check(partners.includes('Script-first audience'), 'public recruiting page names the script audience')
check(partners.includes('Ready to test video'), 'public recruiting page names the video audience')
check(partners.includes('Faceless creators'), 'public recruiting page names the faceless audience')

const adminRoute = read('app/api/admin/affiliates/route.ts')
check(adminRoute.includes("select('affiliate_id, landing_path')"), 'admin reads the canonical click destination field')
check(adminRoute.includes('affiliateDestinationBucket(row.landing_path)'), 'admin classifies every click through the allowlist helper')
check(adminRoute.includes('destinationClicks'), 'admin response exposes destination totals')

const adminPage = read('app/(dashboard)/admin/affiliates/page.tsx')
check(adminPage.includes('Affiliate click destinations'), 'admin UI labels the destination breakdown')
check(adminPage.includes('raw link visits'), 'admin does not mislabel raw visits as people')

const routeSource = read('app/a/[code]/route.ts')
check(routeSource.includes('isAffiliatePreviewBot'), 'real route filters preview bots')
check(routeSource.includes('same proven browser'), 'real route dedupes refresh by protected proof')
check(!routeSource.includes("searchParams.get('redirect')"), 'route accepts no arbitrary redirect parameter')
check(!routeSource.includes("'sf_aff_salt_v1'"), 'IP hashing has no public fallback salt')

const previewHtml = read('docs/previews/AFFILIATE-SCRIPT-DEEPLINK-2026-08-27.html')
const previewSvg = read('docs/previews/AFFILIATE-SCRIPT-DEEPLINK-2026-08-27.svg')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(previewHtml.includes(label), `HTML preview includes ${label}`)
  check(previewSvg.includes(label), `SVG preview includes ${label}`)
}
check(previewHtml.includes('Supabase production aggregate SELECT, measured 27 Aug 2026'), 'HTML evidence carries source/date')
check(previewSvg.includes('Supabase aggregate SELECT, 27 Aug 2026'), 'SVG evidence carries source/date')

const campaignPreview = read('docs/previews/AFFILIATE-CAMPAIGN-KIT-2026-08-27.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(campaignPreview.includes(label), `campaign-kit preview includes ${label}`)
}
check(campaignPreview.includes('11 affiliates externos, 17 cliques, 0 signup atribuído'), 'campaign preview carries dated production evidence')

console.log(`PASS — ${checks}/${checks} affiliate destination checks`)
