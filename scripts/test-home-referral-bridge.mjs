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

function executeTs(file, mocks = {}) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error(`unmocked import ${id}`)
    },
    URL,
    Set,
    Map,
    RegExp,
  }, { filename: file })
  return moduleBox.exports
}

const acquisition = executeTs('lib/acquisitionSource.ts')
const bridge = executeTs('lib/growth/homeReferralBridge.ts', {
  '@/lib/acquisitionSource': acquisition,
})
const resolve = bridge.homeReferralBridgeSource

equal(bridge.homeReferralCreationIntent('taaft'), 'fast', 'TAAFT first film uses the Kineo 1 rail')
equal(bridge.homeReferralCreationIntent('chatgpt'), 'trial_best', 'ChatGPT keeps its existing guarded trial rail')
equal(bridge.homeReferralCreationIntent(null), 'trial_best', 'ordinary and unknown traffic cannot receive the TAAFT override')

equal(resolve({ utm_source: 'chatgpt' }), 'chatgpt', 'canonical ChatGPT UTM activates bridge')
equal(resolve({ utm_source: 'chatgpt.com' }), 'chatgpt', 'ChatGPT hostname alias activates bridge')
equal(resolve({ utm_source: 'https://chatgpt.com/share/example' }), 'chatgpt', 'full ChatGPT URL activates bridge')
equal(resolve({ utm_source: ['ChatGPT', 'google'] }), 'chatgpt', 'first array value is authoritative')
equal(resolve({ utm_source: 'taaft' }), 'taaft', 'canonical TAAFT UTM activates bridge')
equal(resolve({ utm_source: 'theresanaiforthat.com' }), 'taaft', 'TAAFT hostname alias activates bridge')
equal(resolve({ utm_source: 'https://www.theresanaiforthat.com/ai/kineo/' }), 'taaft', 'full TAAFT URL activates bridge')
equal(resolve({ ref: 'taaft' }), 'taaft', 'legacy TAAFT ref activates bridge')
equal(resolve({ utm_source: 'chatgpt', ref: 'taaft' }), 'chatgpt', 'explicit UTM wins over legacy ref')
equal(resolve(undefined, 'https://chatgpt.com/c/abc123'), 'chatgpt', 'ordinary ChatGPT referrer activates bridge without UTM')
equal(resolve({}, 'https://www.theresanaiforthat.com/ai/kineo/'), 'taaft', 'ordinary TAAFT referrer activates bridge without UTM')
equal(resolve({ utm_source: 'google' }, 'https://chatgpt.com/c/abc123'), null, 'explicit non-target UTM remains authoritative over referrer')
equal(resolve({}, 'https://www.usekineo.com/pricing'), null, 'self-referrer never activates bridge')
equal(resolve({}, 'not a url'), null, 'malformed referrer fails closed')

for (const params of [
  undefined,
  {},
  { utm_source: 'google' },
  { utm_source: 'homepage' },
  { utm_source: 'www.usekineo.com' },
  { ref: 'producthunt' },
]) {
  equal(resolve(params), null, `non-target acquisition fails closed: ${JSON.stringify(params)}`)
}

equal(Object.keys(bridge.HOME_REFERRAL_BRIDGE_COPY).join(','), 'chatgpt,taaft', 'copy exists only for measured target channels')
for (const source of ['chatgpt', 'taaft']) {
  const copy = bridge.HOME_REFERRAL_BRIDGE_COPY[source]
  check(copy.eyebrow.length > 10, `${source} has explicit arrival context`)
  check(copy.headline.toLowerCase().includes('test'), `${source} promises a test, not a render`) 
  check(`${copy.headline} ${copy.body}`.toLowerCase().includes('script'), `${source} explains the pre-signup script value`)
  check(!/free video|finished video|render/i.test(copy.headline), `${source} does not promise free rendering`)
}

const page = read('app/page.tsx')
const landing = read('app/KineoLanding.tsx')
const form = read('app/HomeTopicForm.tsx')

check(page.includes("import { headers } from 'next/headers'"), 'server page can read the ordinary HTTP referrer')
check(page.includes("headers().get('referer')"), 'server page reads only the request referrer header')
check(/homeReferralBridgeSource\(\s*searchParams,/.test(page), 'server page resolves the bridge from query and referrer')
check(page.includes('initialAcquisitionSource={initialAcquisitionSource}'), 'server page passes canonical source to landing')
check(page.indexOf('homeReferralBridgeSource(') < page.indexOf('await supabase.auth.getUser()'), 'source resolution requires no Supabase result')

equal((landing.match(/<HomeTopicForm/g) ?? []).length, 1, 'landing has one pre-signup value form')
check(landing.includes('referralBridge ? ('), 'bridge is absent for direct and non-target traffic')
check(landing.includes('const referralBridge = !isSignedIn && initialAcquisitionSource'), 'signed-in visitors never receive pre-signup bridge copy')
check(landing.includes('data-acquisition-source={initialAcquisitionSource}'), 'bridge labels its acquisition source')
check(landing.includes('acquisitionSource={initialAcquisitionSource}'), 'form receives source for measurement')
check(landing.indexOf('{referralBridge ? (') > landing.indexOf('</header>'), 'bridge follows the founder-approved hero samples')
check(landing.indexOf('{referralBridge ? (') < landing.indexOf('{engineWall.length >= 4 && ('), 'bridge appears before the next general engine section')

const referralAnchors = landing.match(/referralBridge \? '#try-kineo' :/g) ?? []
equal(referralAnchors.length, 5, 'all five generic signed-out Start free CTAs point referral visitors to value first')
for (const originalDestination of [
  '/signup?utm_source=nav',
  '/signup?utm_source=nav-mobile',
  '/signup?utm_source=engine_bento',
  '/signup?utm_source=final_cta',
  '/signup?utm_source=home_sticky_cta',
]) {
  check(landing.includes(originalDestination), `direct homepage keeps ${originalDestination}`)
}

check(landing.includes("const order = ['cinematic_veo', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni']"), 'approved top video order is unchanged')
check(landing.includes("tileVid('cinematic_ai')"), 'Seedance middle-row video remains connected')
check(landing.includes("tileVid('cinematic_kling')"), 'Kling 2.5 middle-row video remains connected')
check(landing.includes("tileVidLast('cinematic_hollywood')"), 'distinct Kling 3 middle-row video remains connected')

check(form.includes("const trackingPlacement = acquisitionSource ? 'home_referral_bridge' : 'home_hero'"), 'channel bridge has a distinct event placement')
check(form.includes('homeReferralCreationIntent(acquisitionSource)'), 'form chooses creation intent from the canonical referral source')
check(form.includes('name="create_intent" value={creationIntent}'), 'native and JS handoffs share the selected intent')
check(form.includes("'home_referral_bridge_script_result'"), 'script result has a distinct bridge placement')
equal((form.match(/acquisition_source: acquisitionSource/g) ?? []).length, 10, 'every existing form event carries acquisition channel')
check(form.includes("fetch('/api/demo-script'"), 'bridge reuses the existing no-render demo route')
check(!form.includes('supabase'), 'form performs no direct Supabase operation')
check(!read('lib/growth/homeReferralBridge.ts').includes('supabase'), 'referral resolver performs no Supabase operation')
check(!read('lib/growth/homeReferralBridge.ts').includes('/api/'), 'referral resolver performs no API operation')

const preview = 'docs/previews/HOME-REFERRAL-BRIDGE-2026-08-28.html'
check(fs.existsSync(path.join(root, preview)), 'self-contained visual comparison exists')
const previewHtml = read(preview)
for (const marker of ['BEFORE', 'AFTER', 'DESKTOP', 'MOBILE', 'CHATGPT', 'TAAFT']) {
  check(previewHtml.includes(marker), `visual preview labels ${marker.toLowerCase()}`)
}
check(!/https?:\/\//i.test(previewHtml), 'visual preview has no external dependency')

console.log(`PASS — ${checks}/${checks} referral home bridge checks`)
