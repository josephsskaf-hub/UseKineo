#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(() => {
    throw new Error(`${path}: unexpected import`)
  }, module, module.exports)
  return module.exports
}

const policy = loadTs('lib/growth/welcomeOfferFrequency.ts')
const hour = 60 * 60 * 1000
const now = 2_000_000_000_000

equal(policy.WELCOME_OFFER_FREQUENCY_VERSION, 'welcome_offer_frequency_truth_v1', 'variant is frozen')
equal(policy.WELCOME_OFFER_RESHOW_MS, 72 * hour, 'frequency remains exactly 72 hours')
equal(policy.WELCOME_OFFER_AFTER_FILM_VERSION, 'welcome_offer_after_film_v1', 'dashboard delivery gate is versioned')
equal(policy.parseWelcomeOfferSeenAt(null, now), null, 'missing marker is absent')
equal(policy.parseWelcomeOfferSeenAt('', now), null, 'empty marker is absent')
equal(policy.parseWelcomeOfferSeenAt('not-a-number', now), null, 'malformed marker is absent')
equal(policy.parseWelcomeOfferSeenAt('-1', now), null, 'negative marker is absent')
equal(policy.parseWelcomeOfferSeenAt(String(now + 6 * 60 * 1000), now), null, 'far-future marker cannot suppress forever')
equal(policy.parseWelcomeOfferSeenAt(String(now + 60_000), now), now + 60_000, 'small clock skew remains a seen marker')
equal(policy.shouldShowWelcomeOffer(null, now), true, 'first exposure remains eligible')
equal(policy.shouldShowWelcomeOffer(now - 71 * hour, now), false, '71-hour repeat is blocked')
equal(policy.shouldShowWelcomeOffer(now - 72 * hour + 1, now), false, 'window is exclusive before 72 hours')
equal(policy.shouldShowWelcomeOffer(now - 72 * hour, now), true, 'exactly 72 hours becomes eligible')
equal(policy.shouldShowWelcomeOffer(now - 73 * hour, now), true, 'older exposure becomes eligible')
equal(policy.isWelcomeOfferMeasurementHost('www.usekineo.com'), true, 'canonical production host measures')
equal(policy.isWelcomeOfferMeasurementHost('usekineo.com'), false, 'redirect host cannot fabricate view')
equal(policy.isWelcomeOfferMeasurementHost('preview.vercel.app'), false, 'preview cannot fabricate view')
equal(policy.welcomeOfferFrequencyMetadata('pricing', 'basic'), {
  version: 'welcome_offer_frequency_truth_v1',
  surface: 'pricing',
  offer: 'welcome20',
  frequency_window: '72h',
  tier: 'basic',
}, 'metadata is categorical and allow-listed')
equal(policy.shouldSuppressDashboardWelcomeOffer({ surface: 'dashboard', historyReliable: true, completedCount: 0 }), true, 'reliable zero-film dashboard is delayed')
equal(policy.shouldSuppressDashboardWelcomeOffer({ surface: 'dashboard', historyReliable: true, completedCount: 1 }), false, 'dashboard opens after first film')
equal(policy.shouldSuppressDashboardWelcomeOffer({ surface: 'pricing', historyReliable: true, completedCount: 0 }), false, 'pricing preserves pre-film buyer path')
equal(policy.shouldSuppressDashboardWelcomeOffer({ surface: 'home', historyReliable: true, completedCount: 0 }), false, 'home remains unchanged')
equal(policy.shouldSuppressDashboardWelcomeOffer({ surface: 'dashboard', historyReliable: false, completedCount: 0 }), false, 'unreliable history fails open')
equal(policy.shouldSuppressDashboardWelcomeOffer({ surface: 'dashboard', historyReliable: true, completedCount: null }), false, 'missing history fails open')

const modal = read('components/WelcomeOfferModal.tsx')
const markIndex = modal.indexOf('markWelcomeOfferSeen(Date.now())')
const openIndex = modal.indexOf('setOpen(true)', markIndex)
ok(markIndex > 0 && openIndex > markIndex, 'live caller claims frequency immediately before opening')
ok(modal.includes("document.visibilityState !== 'visible'"), 'background tab does not count an unseen exposure')
ok(modal.includes('if (cancelled || seenRecently()) return'), 'async reads recheck cross-mount frequency')
// R17 adds owner-scoped film history to the same parallel read. The assertion
// moves with the stronger contract; it must never regress into a waterfall.
ok(modal.includes('const [planInfo, userResult, history] = await Promise.all(['), 'plan, identity and film history read in parallel')
ok(modal.includes("fetch('/api/videos', { cache: 'no-store', credentials: 'same-origin' })"), 'dashboard uses owner-scoped persisted film evidence')
ok(modal.includes("trackEvent('welcome_offer_suppressed_before_first_film'"), 'suppression is measurable without counting a view')
ok(modal.includes('shouldSuppressDashboardWelcomeOffer({'), 'live caller is governed by executable policy')
ok(modal.includes('localStorage'), '72-hour marker persists across visits')
ok(modal.includes('sessionStorage'), 'session fallback survives localStorage denial')
ok(modal.includes('memorySeenAt'), 'in-memory fallback prevents same-page repeat')
ok(modal.includes("trackEvent('welcome_offer_viewed'"), 'qualified view is measurable')
ok(modal.includes("trackEvent('welcome_offer_dismissed'"), 'dismissal is measurable')
ok(modal.includes("trackEvent('welcome_offer_checkout_clicked'"), 'checkout choice is measurable')
ok(modal.includes('isWelcomeOfferMeasurementHost(window.location.hostname)'), 'all new events are production-host gated')
ok(!modal.slice(modal.indexOf('function dismiss()'), modal.indexOf('function recordCheckoutClick')).includes('setItem'), 'dismiss no longer starts a fresh 72-hour window')
ok(modal.includes('promo=WELCOME20&checkout_origin=welcome20_modal'), 'exact checkout offer and destination remain unchanged')
ok(modal.includes('Math.round(minor * 0.8)'), 'existing 20-percent calculation remains unchanged')

const home = read('app/KineoLanding.tsx')
const pricing = read('app/pricing/PricingClient.tsx')
const dashboard = read('app/(dashboard)/DashboardShell.tsx')
ok(home.includes('<WelcomeOfferModal surface="home" />'), 'home declares its allow-listed surface')
ok(pricing.includes('<WelcomeOfferModal delayMs={1500} surface="pricing" />'), 'pricing preserves its exact delay and declares surface')
ok(dashboard.includes('<WelcomeOfferModal surface="dashboard" />'), 'dashboard declares its allow-listed surface')

console.log(`Welcome offer frequency: ${checks}/${checks} checks passed`)
