import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const modal = readFileSync(new URL('../components/WelcomeOfferModal.tsx', import.meta.url), 'utf8')
const telemetry = readFileSync(new URL('../lib/checkoutTelemetry.ts', import.meta.url), 'utf8')
const rootLayout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')

let passed = 0
function ok(value, message) {
  assert.ok(value, message)
  passed += 1
}

ok(modal.includes("import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'"), 'modal uses canonical checkout launcher')
ok(modal.includes('useCheckoutLaunch(`welcome_offer_${surface}`)'), 'launcher identifies the exact welcome surface')
ok(modal.includes('surface !== \'home\''), 'enhancement is isolated to the home surface')
ok(modal.includes('event.preventDefault()'), 'ordinary home click is enhanced instead of navigating twice')
ok(modal.includes('event.button !== 0'), 'non-primary clicks keep native anchor behavior')
ok(modal.includes('event.metaKey'), 'macOS modified click keeps native behavior')
ok(modal.includes('event.ctrlKey'), 'control-click keeps native behavior')
ok(modal.includes('event.shiftKey'), 'shift-click keeps native behavior')
ok(modal.includes('event.altKey'), 'alt-click keeps native behavior')
ok(modal.includes('checkout.launch(p.tier, checkoutHref'), 'home click reaches canonical recovery launcher')
ok(modal.includes("checkout_origin: 'welcome20_modal'"), 'server attribution remains explicit')
ok(modal.includes("rescue_version: 'welcome_offer_home_rescue_v1'"), 'new path has a versioned measurement key')
ok(modal.includes('href={checkoutHref}'), 'progressive-enhancement anchor remains present')
ok(modal.includes('promo=WELCOME20&checkout_origin=welcome20_modal'), 'offer and checkout destination remain unchanged')
ok(modal.includes('const pending = checkout.pending ?? nativePending'), 'existing pending feedback survives on every surface')
ok(modal.includes('setNativePending(tier)'), 'native pricing and dashboard clicks retain immediate feedback')
ok(telemetry.includes("window.location.href = url"), 'launcher retains the normal same-tab checkout navigation')
ok(telemetry.includes("setTimeout(() =>"), 'launcher retains its timeout watchdog')
ok(telemetry.includes("publishStalledCheckout({"), 'watchdog publishes an actionable recovery')
ok(rootLayout.includes('<CheckoutStalledCta />'), 'one global recovery CTA is mounted for the home')
ok(rootLayout.includes('<CheckoutResumeBanner />'), 'longer-lived saved checkout recovery remains mounted')

console.log(`welcome-offer-checkout-rescue: ${passed}/${passed}`)
