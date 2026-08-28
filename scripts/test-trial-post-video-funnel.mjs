#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')

function source(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function loadTs(rel) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} imported unexpected module: ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

const funnel = loadTs('lib/admin/trialPostVideoFunnel.ts')
const at = (minute) => new Date(Date.UTC(2026, 7, 27, 12, minute, 0)).toISOString()
const event = (name, minute, user, metadata = null, session = null) => ({
  name, created_at: at(minute), user_id: user, session_id: session, metadata,
})

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const sourceByUser = new Map([
  ['chat-user', 'ChatGPT'],
  ['taaft-user', 'TAAFT'],
  ['silent-user', 'ChatGPT'],
  ['other-user', 'Direct / Unknown'],
])

const result = funnel.buildTrialPostVideoFunnel([
  event('trial_post_video_offer_viewed', 0, 'chat-user', { offer_layout: 'single_primary_v1' }),
  event('trial_post_video_offer_viewed', 1, 'chat-user', { offer_layout: 'single_primary_v1' }),
  event('trial_post_video_offer_clicked', 2, 'chat-user', { offer_layout: 'single_primary_v1' }),
  event('checkout_started', 3, 'chat-user'),
  event('payment_success', 4, 'chat-user'),

  event('trial_post_video_offer_viewed', 5, 'taaft-user'),
  event('checkout_started', 6, 'taaft-user'),

  event('trial_post_video_offer_clicked', 7, 'silent-user'),
  event('trial_post_video_offer_viewed', 8, 'silent-user'),

  event('trial_post_video_offer_viewed', 10, 'other-user'),
  event('trial_post_video_offer_clicked', 11, 'other-user'),
  event('payment_success', 12, 'other-user'),
], sourceByUser)

equal(result.views, 4, 'duplicate impressions count one person')
equal(result.clicks, 2, 'only clicks after a view count')
equal(result.checkoutStarts, 1, 'checkout requires a prior offer click')
equal(result.payments, 1, 'payment requires a prior attributed checkout')
equal(result.noClickViewers, 2, 'non-clicking viewers remain visible')
equal(result.checkoutAfterViewWithoutClick, 1, 'checkout elsewhere is diagnostic, not attributed')
equal(result.singlePrimaryViews, 1, 'new layout viewers are separated')
equal(result.singlePrimaryClicks, 1, 'new layout clicks are separated')
equal(result.viewToClickRate, '50.0%', 'view-to-click rate uses people')
equal(result.clickToCheckoutRate, '50.0%', 'click-to-checkout rate is causal')
equal(result.checkoutToPaidRate, '100.0%', 'checkout-to-paid rate is causal')
equal(result.sourceBreakdown[0], { source: 'ChatGPT', views: 2, clicks: 1, checkoutStarts: 1, payments: 1 }, 'ChatGPT row aggregates people')
equal(result.sourceBreakdown[1], { source: 'Direct / Unknown', views: 1, clicks: 1, checkoutStarts: 0, payments: 0 }, 'direct row stays separate')
equal(result.sourceBreakdown[2], { source: 'TAAFT', views: 1, clicks: 0, checkoutStarts: 0, payments: 0 }, 'TAAFT row stays separate')

const race = funnel.buildTrialPostVideoFunnel([
  event('trial_post_video_offer_viewed', 20, 'chat-user'),
  event('checkout_started', 20, 'chat-user'),
  event('trial_post_video_offer_clicked', 21, 'chat-user'),
  event('payment_success', 22, 'chat-user'),
], sourceByUser)
equal(race.checkoutStarts, 1, 'two-minute checkout/click request race is tolerated')
equal(race.payments, 1, 'race-tolerated checkout can lead to a payment')

const beforeView = funnel.buildTrialPostVideoFunnel([
  event('checkout_started', 24, 'chat-user'),
  event('trial_post_video_offer_viewed', 25, 'chat-user'),
  event('trial_post_video_offer_clicked', 26, 'chat-user'),
], sourceByUser)
equal(beforeView.checkoutStarts, 0, 'request-race tolerance never reaches before the offer view')

const anonymous = funnel.buildTrialPostVideoFunnel([
  event('trial_post_video_offer_viewed', 30, null, null, 'session-a'),
  event('trial_post_video_offer_clicked', 31, null, null, 'session-a'),
  event('checkout_started', 32, null, null, 'session-a'),
], sourceByUser)
equal(anonymous.views, 1, 'session fallback preserves an otherwise anonymous actor')
equal(anonymous.sourceBreakdown[0].source, 'direct / unknown', 'session fallback does not invent a source')

const empty = funnel.buildTrialPostVideoFunnel([
  { name: 'trial_post_video_offer_viewed', created_at: 'not-a-date', user_id: 'x', session_id: null, metadata: null },
  event('checkout_started', 40, 'x'),
], sourceByUser)
equal(empty.views, 0, 'invalid timestamps fail closed')
equal(empty.viewToClickRate, '—', 'zero-denominator rate is honest')
equal(empty.clickToCheckoutRate, '—', 'zero click denominator is honest')
equal(empty.checkoutToPaidRate, '—', 'zero checkout denominator is honest')

const route = source('app/api/admin/funnel/route.ts')
const client = source('app/(dashboard)/admin/funnel/FunnelClient.tsx')
ok(route.includes("'trial_post_video_offer_viewed', 'trial_post_video_offer_clicked'"), 'API fetches both trial-offer stages')
ok(route.includes('buildTrialPostVideoFunnel(postVideoEventRows, profileSourceByUserId)'), 'API executes the causal policy on the focused event query')
ok(route.includes('externalProfiles.map((profile) => [profile.id, sourceForProfile(profile)])'), 'API uses the canonical acquisition source')
ok(route.includes('trialPostVideoOffer, planFitOffer'), 'API returns the new funnel')
ok(client.includes('Trial subscription offer · causal by person'), 'admin labels the measurement as causal and person-level')
ok(client.includes('singlePrimaryViews'), 'admin separates the newly deployed layout')
ok(client.includes('checkoutAfterViewWithoutClick'), 'admin exposes unattributed checkouts instead of stealing credit')
ok(client.includes('sourceBreakdown.map'), 'admin shows source-level conversion')
ok(!client.includes('trialPostVideoOffer.events'), 'admin never labels event rows as people')

console.log(`trial post-video funnel: ${checks}/${checks} checks passed`)
