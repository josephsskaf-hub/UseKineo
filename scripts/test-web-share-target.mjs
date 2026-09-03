#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }
const ok = (value, message) => { assert.ok(value, message); checks += 1 }

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
      throw new Error(`unmocked import ${id} while executing ${file}`)
    },
    URL,
    URLSearchParams,
    JSON,
    Date,
    RegExp,
    String,
    TextDecoder,
    Uint8Array,
  }, { filename: file })
  return moduleBox.exports
}

const share = executeTs('lib/growth/webShareTarget.ts')
const NOW = Date.parse('2026-09-03T12:00:00.000Z')

let payload = share.createWebSharePayload({
  title: '  The hidden city  ',
  text: 'Why it vanished https://example.com/private?q=one',
  url: 'https://example.com/private?q=one',
}, NOW)
equal(payload.topic, 'The hidden city — Why it vanished', 'title and useful text become one bounded idea')
equal(payload.inputKind, 'title_text', 'combined input uses a closed category')
equal(payload.capturedAt, NOW, 'capture clock is explicit')
ok(!JSON.stringify(payload).includes('example.com'), 'shared URL never enters the browser handoff payload')
ok(!JSON.stringify(payload).includes('private'), 'URL path and query never enter the payload')

payload = share.createWebSharePayload({ title: 'Same idea', text: 'same idea' }, NOW)
equal(payload.topic, 'Same idea', 'duplicate title and text are not repeated')
equal(payload.inputKind, 'title', 'duplicate text does not invent a second input')
equal(share.createWebSharePayload({ text: 'Only text' }, NOW).inputKind, 'text', 'text-only shares are supported')
const urlOnly = share.createWebSharePayload({ url: 'https://example.com/a' }, NOW)
equal(urlOnly.topic, '', 'URL-only share never invents page contents')
equal(urlOnly.inputKind, 'url_only', 'URL-only share keeps only a closed diagnostic category')
equal(urlOnly.capturedAt, NOW, 'URL-only share preserves the capture clock')
equal(share.createWebSharePayload({ url: 'javascript:alert(1)' }, NOW).inputKind, 'empty', 'non-http URL is rejected')
equal(share.createWebSharePayload({}, NOW).inputKind, 'empty', 'empty share fails soft')

const noisy = share.createWebSharePayload({ text: `hello\u0000\nworld ${'x'.repeat(300)}` }, NOW)
ok(!/[\u0000-\u001f\u007f]/u.test(noisy.topic), 'control characters are removed')
ok(noisy.topic.length <= 200, 'topic is bounded to the existing tool limit')
equal(share.createWebSharePayload({ text: 'Ｃａｆｅ́ mystery' }, NOW).topic, 'Café mystery', 'unicode is normalized without losing language')

const href = share.webShareTargetLandingHref('received')
const url = new URL(href, 'https://www.usekineo.com')
equal(url.pathname, '/free-script-generator', 'share opens the existing free tool')
equal(url.searchParams.get('utm_source'), 'web_share_target', 'source is exact')
equal(url.searchParams.get('utm_medium'), 'os_share', 'medium is exact')
equal(url.searchParams.get('utm_campaign'), 'web_share_target_v1', 'campaign is exact')
equal(url.searchParams.get('share_status'), 'received', 'POST handoff carries one closed status')
ok(!url.searchParams.has('topic') && !url.searchParams.has('url'), 'shared content never enters destination URL')

equal(share.isExactWebShareTargetLanding({
  utm_source: 'web_share_target', utm_medium: 'os_share', utm_campaign: 'web_share_target_v1',
  share_status: 'received',
}), true, 'exact campaign is classified')
for (const params of [
  { utm_source: ['web_share_target'], utm_medium: 'os_share', utm_campaign: 'web_share_target_v1', share_status: 'received' },
  { utm_source: 'web_share_target_v2', utm_medium: 'os_share', utm_campaign: 'web_share_target_v1', share_status: 'received' },
  { utm_source: 'web_share_target', utm_medium: 'share', utm_campaign: 'web_share_target_v1', share_status: 'received' },
  { utm_source: 'web_share_target', utm_medium: 'os_share', utm_campaign: 'web_share_target_v10', share_status: 'received' },
  { utm_source: 'web_share_target', utm_medium: 'os_share', utm_campaign: 'web_share_target_v1' },
  { utm_source: 'web_share_target', utm_medium: 'os_share', utm_campaign: 'web_share_target_v1', share_status: 'forged' },
]) equal(share.isExactWebShareTargetLanding(params), false, 'arrays and lookalikes are rejected')

const raw = JSON.stringify(share.createWebSharePayload({ title: 'Real idea' }, NOW))
equal(share.parseWebSharePayload(raw, NOW + 1_000)?.topic, 'Real idea', 'fresh payload round-trips')
equal(share.parseWebSharePayload(raw, NOW + share.WEB_SHARE_TARGET_MAX_AGE_MS + 1), null, 'stale payload is rejected')
equal(share.parseWebSharePayload(raw, NOW - 1), null, 'future payload is rejected')
equal(share.parseWebSharePayload('{broken', NOW), null, 'malformed payload is rejected')
equal(share.parseWebSharePayload(JSON.stringify({ topic: '<b>x</b>', inputKind: 'bad', capturedAt: NOW }), NOW), null, 'unknown category is rejected')

const hostile = share.createWebSharePayload({ title: '</script><script>alert(1)</script>' }, NOW)
const html = share.webShareBridgeHtml(hostile)
ok(html.startsWith('<!doctype html>'), 'bridge is a complete document')
ok(!html.includes('</script><script>alert(1)</script>'), 'hostile shared text cannot break out of the bridge script')
ok(html.includes('sessionStorage.setItem'), 'bridge uses one-tab storage rather than a URL or durable cookie')
ok(html.includes('location.replace'), 'bridge removes the POST response from back navigation')
ok(!html.includes('example.com/private'), 'bridge does not contain the shared URL')

const manifest = read('app/manifest.ts')
ok(manifest.includes("action: '/share-to-kineo'"), 'manifest registers the first-party action')
ok(manifest.includes("method: 'POST'"), 'manifest keeps text out of query strings')
ok(manifest.includes("enctype: 'application/x-www-form-urlencoded'"), 'manifest uses the supported share encoding')
ok(manifest.includes("params: { title: 'title', text: 'text', url: 'url' }"), 'manifest maps only standard fields')

const route = read('app/share-to-kineo/route.ts')
ok(route.includes("'Cache-Control': 'no-store, max-age=0'"), 'bridge is never cached')
ok(route.includes("'Referrer-Policy': 'no-referrer'"), 'bridge emits no referrer')
ok(route.includes("'X-Robots-Tag': 'noindex, nofollow'"), 'bridge cannot become an indexable landing')
ok(!route.includes('fetch('), 'share target never fetches a user-supplied URL')
ok(!route.includes('.insert(') && !route.includes('.update('), 'share target has no database mutation')

class MockResponse {
  constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; this.headers = init.headers ?? {} }
  static redirect(url, status) { return { url: String(url), status } }
}
const routeModule = executeTs('app/share-to-kineo/route.ts', {
  'next/server': { NextResponse: MockResponse },
  '@/lib/growth/webShareTarget': share,
})
const formBody = new URLSearchParams({
  title: 'A real mystery',
  text: 'What happened? https://example.com/private',
  url: 'https://example.com/private',
})
const posted = await routeModule.POST(new Request('https://www.usekineo.com/share-to-kineo', {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: formBody,
}))
equal(posted.status, 200, 'POST bridge executes successfully')
equal(posted.headers['Content-Type'], 'text/html; charset=utf-8', 'POST bridge returns explicit HTML')
ok(posted.headers['Content-Security-Policy'].includes("default-src 'none'"), 'POST bridge is isolated by CSP')
ok(posted.body.includes('A real mystery'), 'POST bridge carries sanitized useful text to the same tab')
ok(!posted.body.includes('example.com/private'), 'executed POST never carries shared URL')
const malformedPost = await routeModule.POST(new Request('https://www.usekineo.com/share-to-kineo', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
}))
equal(malformedPost.status, 200, 'malformed share fails soft into the existing tool')
ok(malformedPost.body.includes('share_status=invalid_request'), 'invalid content type uses a closed fallback status')
const oversizedPost = await routeModule.POST(new Request('https://www.usekineo.com/share-to-kineo', {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `text=${'x'.repeat(share.WEB_SHARE_TARGET_MAX_BODY_BYTES + 1)}`,
}))
equal(oversizedPost.status, 200, 'oversized share still opens the safe tool')
ok(oversizedPost.body.includes('share_status=too_large'), 'stream overflow uses the closed too-large status')
ok(!oversizedPost.body.includes('x'.repeat(200)), 'oversized shared content is discarded, not reflected')
const direct = routeModule.GET({ url: 'https://www.usekineo.com/share-to-kineo' })
equal(direct.status, 307, 'direct GET remains a safe temporary redirect')
equal(direct.url, 'https://www.usekineo.com/free-script-generator', 'direct GET is neutral and cannot forge a POST arrival')

const manifestModule = executeTs('app/manifest.ts')
const manifestObject = manifestModule.default()
equal(manifestObject.share_target.action, '/share-to-kineo', 'executed manifest exposes the first-party action')
equal(manifestObject.share_target.method, 'POST', 'executed manifest uses POST')
equal(manifestObject.share_target.params.title, 'title', 'executed manifest maps the title field')
equal(manifestObject.share_target.params.text, 'text', 'executed manifest maps the text field')
equal(manifestObject.share_target.params.url, 'url', 'executed manifest maps the URL field')

const page = read('app/free-script-generator/page.tsx')
const client = read('app/free-script-generator/FreeScriptClient.tsx')
const sticky = read('components/StickyFreeShortCTA.tsx')
ok(page.includes('isExactWebShareTargetLanding(searchParams)'), 'server page requires exact UTM tuple')
ok(page.includes('fromWebShareTarget={fromWebShareTarget}'), 'real client receives exact entry context')
ok(client.includes('sessionStorage.removeItem(WEB_SHARE_TARGET_STORAGE_KEY)'), 'shared text is consumed once')
ok(client.includes("trackClosedEvent('web_share_target_arrived'"), 'arrival uses the closed transport')
ok(client.includes("trackClosedEvent('web_share_target_script_generated'"), 'value uses the closed transport')
ok(client.includes("trackClosedEvent('web_share_target_signup_clicked'"), 'signup intent uses the closed transport')
ok(client.includes("doesn't read shared webpages automatically"), 'URL-only handoff has an honest visible fallback')
ok(client.includes("couldn't carry the shared text"), 'blocked storage has an honest visible fallback')
ok(client.includes('rememberSignupCampaign(WEB_SHARE_TARGET_CAMPAIGN)'), 'campaign survives signup without changing first-touch source')
ok(client.indexOf('if (!payload)') < client.indexOf('rememberSignupCampaign(WEB_SHARE_TARGET_CAMPAIGN)'), 'campaign attribution is impossible before a fresh payload')
ok(client.includes("trackClosedEvent('web_share_target_handoff_unavailable'"), 'missing POST payload is diagnostic only')
ok(client.includes('href={webShareAccepted ? createShortHref : undefined}'), 'sticky campaign path requires a fresh POST payload')
ok(sticky.includes('onCtaClick?: () => void'), 'shared sticky component accepts an optional non-breaking callback')
ok(sticky.includes('onClick={onCtaClick}'), 'sticky click executes the exact measurement callback')

console.log(`web-share-target: ${checks}/${checks} checks passed`)
