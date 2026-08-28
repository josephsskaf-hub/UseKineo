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

const compiled = ts.transpileModule(read('lib/growth/engineLandingIntent.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(compiled, {
  module: moduleBox,
  exports: moduleBox.exports,
  URLSearchParams,
}, { filename: 'lib/growth/engineLandingIntent.ts' })
const intent = moduleBox.exports

const expectedEngines = ['fast', 'seedance', 'kling', 'veo', 'hollywood', 'h3', 'omni']
equal(intent.ENGINE_LANDING_PARAMS.join(','), expectedEngines.join(','), 'all seven live engine params are allowlisted')

for (const engine of expectedEngines) {
  const campaign = `seo_engine_${engine}`
  const destination = new URL(intent.buildEngineLandingDestination({ engine, campaign }), 'https://www.usekineo.com')
  equal(destination.pathname, '/studio', `${engine} lands in the Studio cockpit`)
  equal(destination.searchParams.get('engine'), engine, `${engine} survives into Studio`)
  equal(destination.searchParams.get('intent_campaign'), campaign, `${engine} keeps intent attribution`)
  equal(destination.searchParams.has('create_intent'), false, `${engine} does not auto-render`)
  equal(destination.searchParams.has('autoanalyze'), false, `${engine} waits for a human action`)

  const signup = new URL(intent.buildEngineLandingSignupHref({ engine, campaign }), 'https://www.usekineo.com')
  equal(signup.pathname, '/signup', `${engine} still begins at signup`)
  equal(signup.searchParams.get('utm_source'), 'seo', `${engine} keeps SEO source`)
  equal(signup.searchParams.get('utm_medium'), 'organic', `${engine} keeps organic medium`)
  equal(signup.searchParams.get('utm_campaign'), campaign, `${engine} keeps the exact campaign`)
  equal(signup.searchParams.get('intent_campaign'), campaign, `${engine} exposes signup intent`)
  equal(signup.searchParams.get('redirect'), `${destination.pathname}${destination.search}`, `${engine} carries an explicit safe redirect`)
  equal(signup.searchParams.has('engine'), false, `${engine} is not left as a discarded top-level signup field`)
}

const invalid = new URL(intent.buildEngineLandingDestination({ engine: 'external-model', campaign: 'bad campaign' }), 'https://www.usekineo.com')
equal(invalid.pathname, '/studio', 'invalid input remains on an internal product path')
equal(invalid.searchParams.get('engine'), 'fast', 'invalid engine fails closed to the free engine')
equal(invalid.searchParams.get('intent_campaign'), 'seo_engine', 'invalid campaign fails closed to a bounded label')

const page = read('app/ai-video-generator/[engine]/page.tsx')
check(page.includes("from '@/lib/growth/engineLandingIntent'"), 'real engine page imports the contract')
check(page.includes('buildEngineLandingSignupHref({ engine: e.param, campaign })'), 'primary CTA uses the signup contract')
check(page.includes('buildEngineLandingDestination({ engine: e.param, campaign })'), 'member CTA uses the same destination contract')
equal((page.match(/href=\{signupUrl\}/g) ?? []).length, 3, 'hero, final and sticky CTAs share the corrected signup href')
check(page.includes('href={studioUrl}'), 'existing member goes directly to the selected engine')
check(!page.includes('&engine=${e.param}'), 'discarded top-level engine query is gone')
check(!page.includes('const generateUrl ='), 'legacy generate hop is gone')

const paramsInPage = [...page.matchAll(/param:\s*'(fast|seedance|kling|veo|hollywood|h3|omni)'/g)].map((match) => match[1])
equal([...new Set(paramsInPage)].sort().join(','), [...expectedEngines].sort().join(','), 'page data and handoff allowlist cover the same engines')

const signupPage = read('app/(auth)/signup/page.tsx')
check(signupPage.includes("const explicitRedirect = normalizeInternalRedirect(params.get('redirect'))"), 'signup gives the explicit internal redirect priority')
check(signupPage.includes('if (explicitRedirect) return explicitRedirect'), 'signup returns the selected engine destination intact')
const middleware = read('lib/supabase/middleware.ts')
check(middleware.includes("const rawRedirect = request.nextUrl.searchParams.get('redirect')"), 'logged-in visitors use the same redirect')
check(middleware.includes("resolveAuthRedirect(rawRedirect, '/dashboard')"), 'logged-in redirect is same-origin validated')
const studio = read('app/(dashboard)/studio/StudioClient.tsx')
check(studio.includes("const e = sp.get('engine')"), 'Studio reads the carried engine')
check(studio.includes('setEngine(e as EngineKey)'), 'Studio applies the carried engine')
check(studio.includes("const ic = sp.get('intent_campaign')"), 'Studio reads the carried campaign')

const preview = read('docs/previews/ENGINE-LANDING-INTENT-2026-08-28.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(preview.includes('No automatic render'), 'preview states the spend boundary')
check(preview.includes('Supabase incident boundary'), 'preview records the capacity boundary')

console.log(`PASS — ${checks}/${checks} engine landing intent checks`)
