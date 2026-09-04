import fs from 'node:fs'

const landing = fs.readFileSync('app/KineoLanding.tsx', 'utf8')
const link = fs.readFileSync('components/HomePricingCheckoutLink.tsx', 'utf8')
const telemetry = fs.readFileSync('lib/checkoutTelemetry.ts', 'utf8')
const stalledCta = fs.readFileSync('components/CheckoutStalledCta.tsx', 'utf8')

let passed = 0
function check(condition, label) {
  if (!condition) throw new Error(`FAIL: ${label}`)
  passed += 1
}

check(link.includes("'use client'"), 'boundary is a Client Component')
check(link.includes("useCheckoutLaunch('home_pricing')"), 'uses the shared protected launcher')
check((link.match(/useCheckoutLaunch\('home_pricing'\)/g) ?? []).length === 1, 'one launcher owns all three plans')
check(link.includes('HomePricingCheckoutContext.Provider'), 'the shared launcher is provided to every plan')
check(link.includes('const context = useContext(HomePricingCheckoutContext)'), 'each CTA consumes the shared latch')
check(link.includes('lastSelection === tier'), 'only the selected plan renders an inline error')
check(link.includes("HOME_PRICING_CHECKOUT_VERSION = 'home_pricing_checkout_v1'"), 'version is stable')
check(link.includes("trackEvent('home_pricing_checkout_clicked'"), 'emits the requested denominator')
check(link.includes("pricing_surface: 'home_pricing'"), 'metadata names the exact surface')
check(link.includes("navigation_mode: 'protected_same_tab'"), 'protected clicks are distinguishable')
check(link.includes("navigation_mode: isSignedIn ? 'native_modified' : 'auth_bridge'"), 'native paths are distinguishable')
check(link.includes('if (!isSignedIn || isModifiedClick(event))'), 'signed-out and modified clicks stay native')
check(link.includes('event.preventDefault()'), 'ordinary signed-in click is intercepted')
check(link.indexOf('event.preventDefault()') > link.indexOf('if (!isSignedIn || isModifiedClick(event))'), 'native-path guard runs before preventDefault')
check(link.includes('checkout.launch(tier, href'), 'launcher receives the exact rendered href')
check(link.includes("'Opening secure checkout…'"), 'pending state is visible')
check(link.includes('role="alert"'), 'launch error is announced inline')
check(link.includes('href={href}'), 'real href remains in HTML')
check(link.includes('rel="nofollow"'), 'checkout link remains nofollow')
check(link.includes('event.button !== 0'), 'non-primary clicks remain native')
check(link.includes('event.metaKey') && link.includes('event.ctrlKey') && link.includes('event.shiftKey') && link.includes('event.altKey'), 'all modified clicks remain native')

for (const [tier, hrefExpression] of [
  ['starter', 'starterCheckoutHref'],
  ['basic', 'creatorCheckoutHref'],
  ['pro', 'studioCheckoutHref'],
]) {
  check(landing.includes(`href={${hrefExpression}} tier="${tier}"`), `${tier} CTA uses the boundary and existing href`)
}
check((landing.match(/<HomePricingCheckoutLink /g) ?? []).length === 3, 'exactly three home pricing CTAs are protected')
check(landing.includes('<HomePricingCheckoutGroup isSignedIn={isSignedIn}>'), 'the three CTAs share one protected group')
check(!landing.includes('These three CTAs are still plain <a> elements'), 'obsolete defect comment is gone')
check(landing.includes("pricingCheckoutHref('/api/stripe/checkout?tier=starter&intro=1', isSignedIn)"), 'Starter checkout destination is unchanged')
check(landing.includes("pricingCheckoutHref('/api/stripe/checkout?tier=basic&intro=1', isSignedIn)"), 'Creator checkout destination is unchanged')
check(landing.includes("pricingCheckoutHref('/api/stripe/checkout?tier=pro', isSignedIn)"), 'Studio checkout destination is unchanged')
check(landing.includes('return `/signup?reason=checkout&redirect=${encodeURIComponent(resumePath)}`'), 'signed-out auth bridge is unchanged')
check(landing.includes('<LandingPlanPrice tier="starter" variant="cta" ctaLabel="Start" />'), 'Starter price/copy remains canonical')
check(landing.includes('<LandingPlanPrice tier="basic" variant="cta" ctaLabel="Go Creator" />'), 'Creator price/copy remains canonical')
check(landing.includes('<LandingPlanPrice tier="pro" variant="cta" ctaLabel="Go Studio" />'), 'Studio price/copy remains canonical')
check(stalledCta.includes("trackEvent('checkout_fallback_shown'"), 'shared stalled fallback remains instrumented')
check(telemetry.includes('surface,'), 'shared checkout events retain the caller surface')

console.log(`PASS ${passed}/${passed} home pricing checkout checks`)
