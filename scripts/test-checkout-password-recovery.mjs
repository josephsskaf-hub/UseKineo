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

function loadTs(rel, mocks = {}) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${rel} imported unexpected module: ${id}`)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const authRedirect = loadTs('lib/authRedirect.ts')
const recovery = loadTs('lib/growth/checkoutPasswordRecovery.ts', {
  '@/lib/authRedirect': authRedirect,
})

equal(
  recovery.CHECKOUT_PASSWORD_RECOVERY_VERSION,
  'checkout_password_recovery_handoff_v1',
  'version is stable',
)

const exactDestination = '/api/stripe/checkout?tier=basic&billing=monthly&intro=1&promo=FIRST50&intent_campaign=chatgpt_checkout'
const context = recovery.readCheckoutPasswordRecoveryContext(exactDestination)
equal(context, {
  version: 'checkout_password_recovery_handoff_v1',
  destination: exactDestination,
  provider: 'stripe',
  tier: 'basic',
  billing: 'monthly',
  campaign: 'chatgpt_checkout',
}, 'the exact same-origin checkout survives with categorical context')

for (const [provider, destination] of [
  ['stripe', '/api/stripe/checkout?pack=starter'],
  ['paypal', '/api/paypal/checkout?tier=starter&billing=annual'],
  ['mercadopago', '/api/mercadopago/checkout?tier=pro&billing=monthly'],
]) {
  equal(
    recovery.readCheckoutPasswordRecoveryContext(destination)?.provider,
    provider,
    `${provider} checkout is accepted`,
  )
}

for (const invalid of [
  null,
  '',
  'https://evil.example/api/stripe/checkout?tier=pro',
  '//evil.example/api/stripe/checkout?tier=pro',
  '/\\evil.example/api/stripe/checkout?tier=pro',
  '/api/stripe/checkout/extra?tier=pro',
  '/pricing?tier=pro',
  '/generate?redirect=/api/stripe/checkout',
  'javascript:alert(1)',
]) {
  equal(recovery.readCheckoutPasswordRecoveryContext(invalid), null, `fails closed: ${String(invalid)}`)
}

equal(
  recovery.readCheckoutPasswordRecoveryFromSearch(`?reason=checkout&redirect=${encodeURIComponent(exactDestination)}`),
  context,
  'checkout reason restores the validated destination',
)
equal(
  recovery.readCheckoutPasswordRecoveryFromSearch(`?reason=signup&redirect=${encodeURIComponent(exactDestination)}`),
  null,
  'non-checkout auth never changes password recovery behavior',
)

for (const pathname of ['/forgot-password', '/reset-password', '/login']) {
  const href = recovery.buildCheckoutPasswordRecoveryHref(pathname, context)
  const parsed = new URL(href, 'https://www.usekineo.com')
  equal(parsed.pathname, pathname, `${pathname} remains same-origin`)
  equal(parsed.searchParams.get('reason'), 'checkout', `${pathname} retains checkout reason`)
  equal(parsed.searchParams.get('redirect'), exactDestination, `${pathname} retains exact checkout destination`)
}
equal(
  recovery.buildCheckoutPasswordRecoveryHref('/forgot-password', null),
  '/forgot-password',
  'normal reset flow remains unchanged',
)

const telemetry = recovery.checkoutPasswordRecoveryTelemetry(context)
equal(telemetry, {
  version: 'checkout_password_recovery_handoff_v1',
  provider: 'stripe',
  tier: 'basic',
  billing: 'monthly',
  intent_campaign: 'chatgpt_checkout',
}, 'telemetry is categorical')
ok(!('destination' in telemetry), 'telemetry excludes the raw checkout redirect')
ok(!JSON.stringify(telemetry).includes('FIRST50'), 'telemetry excludes promo codes')

const unsafeCampaign = recovery.readCheckoutPasswordRecoveryContext(
  '/api/stripe/checkout?tier=basic&intent_campaign=<private value>',
)
equal(unsafeCampaign?.campaign, null, 'free-form campaign values fail closed')

const login = source('app/(auth)/login/page.tsx')
const signup = source('app/(auth)/signup/page.tsx')
const modal = source('components/AuthModal.tsx')
const forgot = source('app/(auth)/forgot-password/page.tsx')
const reset = source('app/(auth)/reset-password/page.tsx')
const analytics = source('lib/authAnalytics.ts')

ok(login.includes('readCheckoutPasswordRecoveryFromSearch(authSearch)'), 'login derives recovery only from its validated checkout search')
ok(login.includes('href={forgotPasswordHref}'), 'login carries the purchase into password recovery')
ok(signup.includes('readCheckoutPasswordRecoveryContext(activationRedirect)'), 'signup preserves an existing buyer destination')
ok(signup.includes('href={forgotPasswordHref}'), 'signup recovery link carries the purchase')
ok(modal.includes('readCheckoutPasswordRecoveryContext(destination)'), 'auth modal validates its resolved destination')
ok(modal.includes('href={forgotPasswordHref}'), 'auth modal recovery link carries the purchase')
ok(forgot.includes('redirectTo: `${appUrl}${resetPath}`'), 'Supabase email returns to the versioned reset handoff')
ok(forgot.includes("trackCheckoutPasswordRecoveryStep('requested', context)"), 'accepted reset request is measured')
ok(forgot.includes('href={loginHref}'), 'forgot page return keeps checkout context')
ok(reset.includes("trackCheckoutPasswordRecoveryStep('completed', context)"), 'successful password update is measured')
ok(reset.includes("trackCheckoutPasswordRecoveryStep('resumed', context)"), 'checkout resumption is measured')
ok(reset.includes('window.location.assign(context.destination)'), 'successful recovery hard-navigates to the exact checkout')
ok(reset.includes("router.push('/generate')"), 'ordinary password reset keeps its prior destination')
ok(reset.includes('href={forgotPasswordHref}'), 'expired-link retry keeps checkout context')
ok(reset.includes('href={loginHref}'), 'reset page sign-in return keeps checkout context')

ok(analytics.includes("trackEvent('checkout_password_recovery_step'"), 'one versioned event records the recovery stages')
for (const step of ['viewed', 'requested', 'completed', 'resumed']) {
  ok(analytics.includes(`'${step}'`), `${step} is an allow-listed recovery step`)
}
ok(!analytics.includes('context.destination'), 'analytics never reads the raw destination')
ok(
  !Object.keys(telemetry).some((key) => /email|password|token|code|redirect|url/i.test(key)),
  'telemetry contains no credential or raw-navigation field',
)

ok(forgot.includes('Your purchase is saved'), 'forgot page makes purchase continuity visible')
ok(reset.includes('Your purchase is still saved'), 'reset page makes purchase continuity visible')
ok(reset.includes('Returning you to secure checkout'), 'success state names the real next step')
ok(!forgot.includes('useSearchParams'), 'forgot page avoids a new CSR bailout')
ok(!reset.includes('useSearchParams'), 'reset page avoids a new CSR bailout')

console.log(`checkout password recovery: ${checks}/${checks} checks passed`)
