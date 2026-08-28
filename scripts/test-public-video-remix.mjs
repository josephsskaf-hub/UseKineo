#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`unexpected import ${id}`) }, module, module.exports,
  )
  return module.exports
}

let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

const remix = loadTs('lib/publicVideoRemix.ts')
equal(remix.sanitizePublicVideoRemixTopic('  a   strange   island  '), 'a strange island', 'topic whitespace normalizes')
equal(remix.sanitizePublicVideoRemixTopic('x'.repeat(200)).length, 160, 'topic is URL-bounded')
equal(remix.sanitizePublicVideoId('abc-123'), 'abc-123', 'safe public id survives')
equal(remix.sanitizePublicVideoId('../signup?x=1'), '', 'path-like public id is rejected')

const href = remix.publicVideoRemixHref('The island nobody found', 'abc-123')
const url = new URL(href, 'https://www.usekineo.com')
equal(url.pathname, '/free-script-generator', 'CTA enters existing no-signup tool')
equal(url.searchParams.get('topic'), 'The island nobody found', 'visible topic is carried')
equal(url.searchParams.get('utm_source'), 'public_video', 'public-video attribution survives')
equal(url.searchParams.get('utm_medium'), 'share', 'share medium survives')
equal(url.searchParams.get('utm_campaign'), 'public_video_remix', 'remix campaign is explicit')
equal(url.searchParams.get('source_video_id'), 'abc-123', 'source video is correlatable')
ok(!href.includes('redirect='), 'CTA does not hide an arbitrary redirect')

const publicPage = source('app/v/[id]/page.tsx')
const cta = source('components/PublicVideoCtaLink.tsx')
const toolPage = source('app/free-script-generator/page.tsx')
const tool = source('app/free-script-generator/FreeScriptClient.tsx')
const funnel = source('app/api/admin/funnel/route.ts')
const dashboard = source('app/(dashboard)/admin/funnel/FunnelClient.tsx')
const preview = source('docs/previews/PUBLIC-VIDEO-REMIX-2026-08-27.html')

ok(publicPage.includes('publicVideoRemixHref'), 'public video uses the executed helper')
ok(publicPage.includes('Remix this topic — no signup'), 'under-player CTA names the no-signup value')
ok(publicPage.includes('destination="/free-script-generator"'), 'tracking records the real destination')
ok(!publicPage.includes('placement="sticky_mobile"'), 'duplicate mobile fixed bar is removed')
ok(publicPage.includes('placement="sticky_bar"'), 'one reachable fixed CTA remains')
ok(cta.includes('destination = \'/signup\''), 'legacy signup CTAs keep their truthful default')
ok(cta.includes('destination,'), 'CTA events carry the discriminated destination')

ok(toolPage.includes('sanitizePublicVideoRemixTopic'), 'query topic is server-sanitized')
ok(toolPage.includes('sanitizePublicVideoId'), 'source id is server-sanitized')
ok(toolPage.includes('fromPublicVideo={fromPublicVideo}'), 'server passes verified origin to client')
ok(tool.includes('useState(initialTopic)'), 'script tool opens prefilled')
ok(tool.includes("trackEvent('public_video_remix_arrived'"), 'remix arrival is measured')
ok(tool.includes("trackEvent('public_video_remix_script_generated'"), 'delivered script is measured')
ok(tool.includes("trackEvent('public_video_remix_signup_clicked'"), 'post-value signup intent is measured')
ok(tool.includes("utm_source: source"), 'signup inherits public-video source')
ok(tool.includes('sessionStorage.getItem(marker)'), 'arrival event is session-deduped')

ok(funnel.includes("'public_video_remix_arrived'"), 'admin query includes remix arrivals')
ok(funnel.includes('uniqueOrganicActorCount(publicVideoLandingRows)'), 'public landings count actors, not rows')
ok(funnel.includes('uniqueOrganicActorCount(publicVideoCtaRows)'), 'public CTA counts actors, not rows')
ok(funnel.includes('uniqueOrganicActorCount(publicVideoRemixScriptRows)'), 'scripts count actors, not rows')
ok(dashboard.includes('CTA → Remix'), 'admin displays the first new conversion edge')
ok(dashboard.includes('Remix → Script'), 'admin displays useful-result conversion')
ok(dashboard.includes('Script → Signup click'), 'admin displays post-value signup intent')
ok(preview.includes('Before · account wall first') && preview.includes('After · value before signup'), 'visual comparison contains both states')
ok(preview.includes('Two fixed mobile bars') && preview.includes('One reachable CTA'), 'mobile duplicate removal is visible')

console.log(`public video remix: ${checks}/${checks} checks passed`)
