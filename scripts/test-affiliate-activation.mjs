#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync('lib/affiliateActivation.ts', 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(compiled, {
  module: moduleBox,
  exports: moduleBox.exports,
  require(id) { throw new Error(`unexpected import ${id}`) },
  Number,
  String,
})

const activation = moduleBox.exports
let checks = 0
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(activation.normalizeAffiliateActivationState(null), null, 'null response hides growth card')
equal(activation.normalizeAffiliateActivationState({}), null, 'unknown response hides growth card')
equal(activation.normalizeAffiliateActivationState({ isAffiliate: false }), 'not_affiliate', 'non-affiliate gets activation')
equal(activation.normalizeAffiliateActivationState({ isAffiliate: true, affiliate: { status: 'ACTIVE' } }), 'active', 'active status normalizes')
equal(activation.normalizeAffiliateActivationState({ isAffiliate: true, affiliate: { status: 'pending' } }), 'pending', 'pending status stays pending')
equal(activation.normalizeAffiliateActivationState({ isAffiliate: true, affiliate: { status: 'suspended' } }), 'suspended', 'suspended status stays suspended')
equal(activation.normalizeAffiliateActivationState({ isAffiliate: true, affiliate: { status: 'mystery' } }), null, 'unknown affiliate status fails closed')

const eligibility = (overrides = {}) => activation.isAffiliateMomentumEligible({
  completedVideoCount: 2,
  isStarter: false,
  isCreator: false,
  isStudio: false,
  ...overrides,
})

equal(eligibility({ isStarter: true }), true, 'Starter repeat creator eligible')
equal(eligibility({ isCreator: true }), true, 'Creator repeat creator eligible')
equal(eligibility({ isStudio: true }), true, 'Studio repeat creator eligible')
equal(eligibility({ completedVideoCount: 1, isStarter: true }), false, 'first video stays focused on repeat activation')
equal(eligibility({ completedVideoCount: 0, isStarter: true }), false, 'subscription without delivered value is not recruited')
equal(eligibility({ completedVideoCount: 2 }), false, 'unpaid trial/free creator stays focused on subscription')
equal(eligibility({ completedVideoCount: 2.5, isCreator: true }), false, 'invalid video count fails closed')

const subscriptionOffer = (overrides = {}) => activation.isHistorySubscriptionOfferEligible({
  completedVideoCount: 1,
  isStarter: false,
  isCreator: false,
  isStudio: false,
  ...overrides,
})

equal(subscriptionOffer(), true, 'one-video unpaid creator recovers subscription decision')
equal(subscriptionOffer({ completedVideoCount: 2 }), true, 'repeat unpaid creator keeps subscription decision')
equal(subscriptionOffer({ completedVideoCount: 0 }), false, 'no delivered value is never monetized in history')
equal(subscriptionOffer({ completedVideoCount: 1.5 }), false, 'invalid completed count fails closed')
equal(subscriptionOffer({ isStarter: true }), false, 'Starter never sees a duplicate subscription offer')
equal(subscriptionOffer({ isCreator: true }), false, 'Creator never sees a duplicate subscription offer')
equal(subscriptionOffer({ isStudio: true }), false, 'Studio never sees a duplicate subscription offer')

const component = fs.readFileSync('components/AffiliateMomentumCard.tsx', 'utf8')
const history = fs.readFileSync('app/(dashboard)/history/HistoryClient.tsx', 'utf8')
ok(component.includes("fetch('/api/affiliate/me'"), 'card reads canonical affiliate state')
ok(component.includes("href=\"/affiliate\""), 'card enters existing partner kit')
ok(component.includes('affiliate_momentum_card_viewed'), 'visible card is measured')
ok(component.includes('affiliate_momentum_card_clicked'), 'activation click is measured')
ok(component.includes("state === 'pending' || state === 'suspended'"), 'non-actionable accounts are not sold another state')
ok(component.includes('40% on eligible subscription payments'), 'approved commission promise is qualified')
ok(history.includes('isAffiliateMomentumEligible({'), 'real history caller uses eligibility policy')
ok(history.includes('isHistorySubscriptionOfferEligible({'), 'real history caller uses subscription recovery policy')
ok(history.includes('history_first_video_offer_viewed'), 'one-video recovery impression is measured separately')
ok(history.includes('history_first_video_offer_clicked'), 'one-video recovery click is measured separately')
ok(history.includes("firstVideoSubscriptionRecovery ? 'history_first_video_offer' : 'history_repeat_offer'"), 'checkout origin distinguishes first-video recovery from repeat creator')
ok(history.includes('<AffiliateMomentumCard completedVideoCount={completedVideos.length} />'), 'real history page mounts the card')
ok(history.indexOf('<AffiliateMomentumCard') < history.indexOf('latestVideo && PUBLIC_VIDEO_SHARING_ENABLED'), 'affiliate action precedes generic sharing only after eligibility')

console.log(`affiliate activation: ${checks}/${checks} checks passed`)
