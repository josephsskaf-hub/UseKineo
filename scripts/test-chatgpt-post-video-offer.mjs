#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks += 1 }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1 }

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
const policy = executeTs('lib/growth/chatgptPostVideoOffer.ts', {
  '@/lib/acquisitionSource': acquisition,
})
const decide = policy.decidePostVideoOffer

for (const source of ['chatgpt', 'chatgpt.com', 'https://chatgpt.com/c/example', 'CHATGPT.COM']) {
  const result = decide(source)
  equal(result.firstTouchSource, 'chatgpt', `${source} normalizes to ChatGPT`)
  equal(result.primaryTier, 'starter', `${source} gets Starter first`)
  equal(result.secondaryTier, 'basic', `${source} keeps Creator available`)
  equal(result.variant, 'chatgpt_starter_first_v1', `${source} joins measurable variant`)
  equal(result.offerBasis, 'first_touch_source', `${source} uses source only without a delivered engine`)
}

for (const source of [null, '', 'direct', 'taaft', 'google']) {
  const result = decide(source)
  equal(result.primaryTier, 'basic', `${String(source)} keeps the default Creator first`)
  equal(result.secondaryTier, 'starter', `${String(source)} keeps Starter as escape`)
  equal(result.variant, 'default_creator_first_v1', `${String(source)} stays outside experiment`)
  equal(result.offerBasis, 'default', `${String(source)} uses the default only without a delivered engine`)
}

for (const source of ['chatgpt.com', 'taaft', 'direct', null]) {
  const result = decide(source, 'fast')
  equal(result.primaryTier, 'starter', `${String(source)} Fast result gets Starter first`)
  equal(result.secondaryTier, 'basic', `${String(source)} Fast result keeps Creator available`)
  equal(result.variant, 'engine_fit_starter_first_v1', `${String(source)} Fast result joins engine-fit variant`)
  equal(result.offerBasis, 'last_video_engine', `${String(source)} Fast result is governed by the delivered engine`)
  equal(result.lastVideoFit, 'fast', `${String(source)} Fast result is classified explicitly`)
}

for (const quality of ['cinematic_ai', 'cinematic_h3', 'cinematic_kling', 'cinematic_veo']) {
  const result = decide('chatgpt.com', quality)
  equal(result.primaryTier, 'basic', `${quality} result gets Creator first even for ChatGPT`)
  equal(result.secondaryTier, 'starter', `${quality} result keeps Starter available`)
  equal(result.variant, 'engine_fit_creator_first_v1', `${quality} joins premium engine-fit variant`)
  equal(result.offerBasis, 'last_video_engine', `${quality} outranks acquisition source`)
  equal(result.lastVideoFit, 'premium', `${quality} is classified as premium`)
  equal(result.chatgptContext, true, `${quality} preserves ChatGPT-specific copy context`)
}

const client = read('app/(dashboard)/generate/GenerateClient.tsx')
check(client.includes("import { decidePostVideoOffer } from '@/lib/growth/chatgptPostVideoOffer'"), 'production client imports the executable decision')
check(client.includes('setSignupUtmSource('), 'server-authenticated signup source is stored')
check(client.includes('data.signup_utm_source'), 'source comes from the existing plan response')
check(client.includes('const postVideoOfferDecision = decidePostVideoOffer(signupUtmSource, quality)'), 'visual decision reads persisted first touch and delivered quality')
check(client.includes('const offerDecision = decidePostVideoOffer(signupUtmSource, quality)'), 'impression decision uses the same engine-aware policy')
check(client.includes('TIER_CREDITS[ladderPrimaryTier]'), 'displayed grant follows the checkout tier')
check(client.includes("videosForCredits(TIER_CREDITS[ladderPrimaryTier], 'fast')"), 'Fast value count is derived from canonical cost')
check(client.includes("videosForCredits(TIER_CREDITS[ladderPrimaryTier], 'cinematic_ai')"), 'premium film count is derived from canonical cost')
check(client.includes('tier=${ladderPrimaryTier}'), 'primary CTA opens the selected canonical tier')
check(client.includes('postVideoOfferDecision.secondaryTier'), 'the other recurring plan stays available')
check(client.includes('first_touch_source: postVideoOfferDecision.firstTouchSource'), 'click records normalized first touch')
check(client.includes('first_touch_source: offerDecision.firstTouchSource'), 'impression records normalized first touch')
check(client.includes('offer_layout: postVideoOfferDecision.variant'), 'click records the offer variant')
check(client.includes('offer_layout: offerDecision.variant'), 'impression records the offer variant')
check(client.includes('offer_basis: postVideoOfferDecision.offerBasis'), 'click records why the tier won')
check(client.includes('offer_basis: offerDecision.offerBasis'), 'impression records why the tier won')
check(client.includes('last_video_quality: quality'), 'events preserve the delivered quality without raw content')
check(!read('lib/growth/chatgptPostVideoOffer.ts').includes('$7'), 'policy does not duplicate a price')
check(!read('lib/growth/chatgptPostVideoOffer.ts').includes('/api/'), 'policy performs no API call')

const preview = 'docs/previews/ENGINE-FIT-POST-VIDEO-OFFER-2026-08-29.html'
check(fs.existsSync(path.join(root, preview)), 'self-contained before/after preview exists')
const previewHtml = read(preview)
for (const marker of ['BEFORE', 'AFTER', 'DESKTOP', 'MOBILE', 'SEEDANCE', 'KINEO 1']) {
  check(previewHtml.includes(marker), `preview labels ${marker.toLowerCase()}`)
}
check(!/https?:\/\//i.test(previewHtml), 'preview has no external dependency')

console.log(`PASS — ${checks}/${checks} ChatGPT post-video offer checks`)
