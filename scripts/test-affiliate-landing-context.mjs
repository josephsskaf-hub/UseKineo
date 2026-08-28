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

function loadTs(rel, imports = {}) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => {
      if (id in imports) return imports[id]
      throw new Error(`${rel} imported unexpected module: ${id}`)
    },
    module,
    module.exports,
  )
  return module.exports
}

const destinations = loadTs('lib/affiliateDestinations.ts')
const landing = loadTs('lib/growth/affiliateLandingContext.ts', {
  '@/lib/affiliateDestinations': destinations,
})
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }
const params = (campaign, overrides = {}) => ({
  utm_source: 'affiliate',
  utm_medium: 'partner',
  utm_campaign: campaign,
  ...overrides,
})

equal(landing.AFFILIATE_LANDING_CONTEXT_VARIANT, 'affiliate_landing_context_v1', 'measurement has an isolated variant')

for (const destination of destinations.AFFILIATE_DESTINATIONS) {
  const result = landing.affiliateLandingContext(params(destination.campaign), destination.key)
  equal(result?.destination, destination.key, `${destination.key}: exact affiliate campaign is accepted`)
  equal(typeof result?.heading, 'string', `${destination.key}: rendered context has a heading`)
  ok((result?.heading.length ?? 0) > 20, `${destination.key}: heading explains the recommendation`)
  ok((result?.body.length ?? 0) > 70, `${destination.key}: supporting copy explains the next step`)
  ok(!(result?.body ?? '').toLowerCase().includes('discount'), `${destination.key}: no unapproved discount is promised`)
  ok(!(result?.body ?? '').toLowerCase().includes('no card'), `${destination.key}: trial terms stay owned by the canonical page offer`)
  ok(!(result?.body ?? '').includes(destination.campaign), `${destination.key}: internal campaign is not exposed`)
}

equal(landing.affiliateLandingContext(undefined, 'script'), null, 'ordinary organic traffic sees no banner')
equal(landing.affiliateLandingContext({}, 'script'), null, 'empty search params see no banner')
equal(landing.affiliateLandingContext(params('affiliate_video'), 'script'), null, 'campaign cannot cross into another destination')
equal(landing.affiliateLandingContext(params('affiliate_script', { utm_source: 'chatgpt.com' }), 'script'), null, 'non-affiliate source is rejected')
equal(landing.affiliateLandingContext(params('affiliate_script', { utm_medium: 'organic' }), 'script'), null, 'non-partner medium is rejected')
equal(landing.affiliateLandingContext(params('affiliate_script', { utm_campaign: ['affiliate_script', 'evil'] }), 'script')?.destination, 'script', 'first canonical array value is handled')
equal(landing.affiliateLandingContext(params(' AFFILIATE_SCRIPT ', { utm_source: ' Affiliate ', utm_medium: ' Partner ' }), 'script')?.destination, 'script', 'harmless case and whitespace differences are accepted')

const component = source('components/AffiliateLandingContext.tsx')
const scriptPage = source('app/free-script-generator/page.tsx')
const scriptClient = source('app/free-script-generator/FreeScriptClient.tsx')
const videoPage = source('app/free-ai-shorts-generator/page.tsx')
const facelessPage = source('app/faceless-video-generator/page.tsx')

ok(component.includes("trackEvent('affiliate_landing_context_viewed'"), 'card measures a recommendation view')
ok(component.includes("trackEvent('affiliate_landing_context_clicked'"), 'card measures the continue click')
ok(component.includes('sessionStorage.getItem(eventKey)'), 'view is deduplicated per session and destination')
ok(!component.includes('affiliate_code'), 'telemetry does not expose an affiliate code')
ok(!component.includes('window.location'), 'telemetry does not copy the landing URL')
ok(!component.includes('prompt:'), 'telemetry does not copy user content')
ok(scriptPage.includes("affiliateLandingContext(searchParams, 'script')"), 'script page uses strict script context')
// The first draft asserted a prop name that does not exist on the shared
// component. The product contract is that the server-approved value becomes
// the component's `context` prop, so anchor the executable caller to that.
ok(scriptClient.includes('context={affiliateContext}'), 'script tool renders the server-approved context')
ok(scriptClient.includes('affiliateContext ? ('), 'ordinary script traffic gets no empty spacing from a hidden card')
ok(scriptClient.includes('id="free-script-generator-tool"'), 'script CTA has a real in-page target')
ok(videoPage.includes("affiliateLandingContext(searchParams, 'video')"), 'video page uses strict video context')
ok(videoPage.includes('targetId={FORM_ID}'), 'video CTA reuses its real form target')
ok(facelessPage.includes("affiliateLandingContext(searchParams, 'faceless')"), 'faceless page uses strict faceless context')
ok(facelessPage.includes('targetId={FORM_ID}'), 'faceless CTA reuses its real form target')

console.log(`affiliate-landing-context: ${checks}/${checks} checks passed`)
