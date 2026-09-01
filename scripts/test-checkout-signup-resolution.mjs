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
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
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

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const policy = loadTs('lib/growth/checkoutSignupResolution.ts')
equal(
  policy.CHECKOUT_SIGNUP_RESOLUTION_VERSION,
  'checkout_signup_resolution_v1',
  'experiment version is stable',
)
equal(policy.checkoutSignupResolutionCopy(false), null, 'ordinary signup keeps its existing success state')

const copy = policy.checkoutSignupResolutionCopy(true)
equal(copy.heading, 'Finish your purchase', 'checkout state names the unfinished job')
ok(copy.body.includes('already use Kineo'), 'existing buyers receive a sign-in path')
ok(copy.body.includes('new account'), 'new buyers still receive confirmation guidance')
ok(copy.continuity.includes('same secure checkout'), 'both paths promise only checkout continuity')
equal(copy.signInCta, 'Continue to Sign In →', 'the recovery action is explicit')
ok(!JSON.stringify(copy).includes('registered'), 'neutral copy does not reveal registration state')

const signup = source('app/(auth)/signup/page.tsx')
const analytics = source('lib/authAnalytics.ts')

ok(signup.includes('checkoutSignupResolutionCopy(isCheckoutResume)'), 'checkout-only caller derives neutral copy')
ok(signup.includes("trackCheckoutSignupResolution('viewed', activationRedirect)"), 'resolution view is measured')
ok(signup.includes("trackCheckoutSignupResolution('sign_in', activationRedirect)"), 'sign-in choice is measured')
ok(signup.includes('href={loginHref}'), 'CTA reuses the checkout-preserving login destination')
ok(signup.includes("checkoutResolution?.heading ?? 'Check your email!'"), 'ordinary signup keeps its original heading')
ok(signup.includes("checkoutResolution?.signInCta ?? 'Back to Sign In'"), 'ordinary signup keeps its original sign-in link')
ok(signup.includes('We sent a confirmation link to'), 'ordinary signup keeps confirmation guidance')
ok(signup.includes('identities.length === 0'), 'the Supabase existing-account signal remains handled')
ok(signup.includes("trackCheckoutAuthStep('confirmation_required'"), 'new email confirmation remains measured')

ok(analytics.includes("'checkout_signup_resolution_viewed'"), 'view event is named')
ok(analytics.includes("'checkout_signup_resolution_clicked'"), 'click event is named')
ok(analytics.includes('CHECKOUT_SIGNUP_RESOLUTION_VERSION'), 'events carry the stable version')
ok(analytics.includes("surface: 'signup_page'"), 'events identify the bounded surface')
ok(analytics.includes('const intent = checkoutIntentMetadata(destination)'), 'telemetry reuses checkout allow-listing')
ok(!analytics.includes('identities:'), 'telemetry never records identity state')
ok(!analytics.includes('email:'), 'telemetry never records email')
ok(!analytics.includes('password:'), 'telemetry never records password')
ok(!analytics.includes('existing_account'), 'telemetry never creates an account-enumeration flag')

const successBlock = signup.slice(signup.indexOf('{success ? ('), signup.indexOf(') : (', signup.indexOf('{success ? (')))
ok(!successBlock.includes('<strong style={{ color: \'var(--text2)\' }}>{email}</strong>') || successBlock.includes('checkoutResolution ?'), 'checkout branch does not need to echo the submitted email')

console.log(`checkout signup resolution: ${checks}/${checks} checks passed`)
