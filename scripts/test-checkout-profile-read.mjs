import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = process.cwd()
const output = mkdtempSync(path.join(tmpdir(), 'kineo-checkout-profile-'))
const localTsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')
const sharedTsc = path.resolve(root, '..', '..', '..', 'node_modules', 'typescript', 'bin', 'tsc')
const tsc = existsSync(localTsc) ? localTsc : sharedTsc
const requireFromOutput = createRequire(path.join(output, 'test.cjs'))
let checks = 0

function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}

try {
  execFileSync(process.execPath, [
    tsc,
    'lib/stripe/checkoutProfileRead.ts',
    '--target', 'ES2022',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--outDir', output,
    '--skipLibCheck',
  ], { cwd: root, stdio: 'pipe' })
  writeFileSync(path.join(output, 'package.json'), JSON.stringify({ type: 'commonjs' }))

  const policy = requireFromOutput(path.join(output, 'checkoutProfileRead.js'))
  const route = readFileSync(path.join(root, 'app/api/stripe/checkout/route.ts'), 'utf8')

  check(JSON.stringify(policy.CHECKOUT_PROFILE_RETRY_DELAYS_MS) === '[0,200,600,1200]', 'retry budget is fixed at four reads and 2s total wait')

  let reads = 0
  const successWaits = []
  const immediate = await policy.readCheckoutProfileWithRetry(
    async () => { reads += 1; return { data: { plan: 'free' }, error: null } },
    async (ms) => { successWaits.push(ms) },
  )
  check(reads === 1, 'successful profiles are read once')
  check(successWaits.length === 0, 'successful profiles never wait')
  check(immediate.attempts === 1 && immediate.recovered === false, 'first-read success is not labeled recovered')
  check(immediate.data?.plan === 'free' && immediate.error === null, 'first-read data is preserved')

  reads = 0
  const missingWaits = []
  const missingThenReady = await policy.readCheckoutProfileWithRetry(
    async () => {
      reads += 1
      return reads === 1
        ? { data: null, error: { code: 'PGRST116' } }
        : { data: { plan: 'free' }, error: null }
    },
    async (ms) => { missingWaits.push(ms) },
  )
  check(reads === 2, 'fresh missing row is retried once before recovery')
  check(JSON.stringify(missingWaits) === '[200]', 'first retry uses the 200ms delay')
  check(missingThenReady.attempts === 2 && missingThenReady.recovered, 'missing-row recovery is explicit')

  reads = 0
  const transientWaits = []
  const transientThenReady = await policy.readCheckoutProfileWithRetry(
    async () => {
      reads += 1
      return reads < 3
        ? { data: null, error: { code: 'PGRST_TRANSIENT' } }
        : { data: { plan: 'free' }, error: null }
    },
    async (ms) => { transientWaits.push(ms) },
  )
  check(reads === 3, 'transient read recovers on the third attempt')
  check(JSON.stringify(transientWaits) === '[200,600]', 'transient retries follow the fixed schedule')
  check(transientThenReady.attempts === 3 && transientThenReady.recovered, 'transient recovery is explicit')

  reads = 0
  const thrown = await policy.readCheckoutProfileWithRetry(
    async () => { reads += 1; throw new Error('sensitive upstream body') },
    async () => {},
  )
  check(reads === 4, 'thrown reads stop at the fixed ceiling')
  check(thrown.error?.code === 'CHECKOUT_PROFILE_READ_THROWN', 'thrown read is classified without the raw message')
  check(JSON.stringify(thrown).includes('sensitive upstream body') === false, 'raw thrown message is never returned')

  reads = 0
  const persistent = await policy.readCheckoutProfileWithRetry(
    async () => { reads += 1; return { data: null, error: { code: 'PGRST503' } } },
    async () => {},
  )
  check(reads === 4 && persistent.attempts === 4, 'persistent failure is bounded')
  check(persistent.recovered === false && persistent.error?.code === 'PGRST503', 'persistent failure remains blocked')

  await assert.rejects(
    () => policy.readCheckoutProfileWithRetry(async () => ({ data: null, error: null }), async () => {}, [100]),
    /must start at 0ms/,
  )
  checks += 1

  check(route.includes("import { readCheckoutProfileWithRetry } from '@/lib/stripe/checkoutProfileRead'"), 'production route imports the policy')
  check(route.includes('const profileLookup = await readCheckoutProfileWithRetry'), 'production route executes the policy')
  check(route.indexOf('const profileLookup = await readCheckoutProfileWithRetry') < route.indexOf("if (profileError && profileError.code !== 'PGRST116')"), 'retry happens before the blocking profile branch')
  check(route.includes('checkoutMetadata.profile_lookup_attempts = profileLookup.attempts'), 'attempt count reaches checkout metadata')
  check(route.includes('checkoutMetadata.profile_lookup_recovered = profileLookup.recovered'), 'recovery outcome reaches checkout metadata')
  check(route.includes('failureContext = { ...checkoutMetadata }'), 'failure telemetry receives the retry outcome')
  check(route.includes(".select('email, stripe_customer_id, is_pro, plan, stripe_subscription_id, paypal_subscription_id, affiliate_id')"), 'profile permission fields stay unchanged')
  check(!route.includes('upsertProfileForCheckout'), 'checkout does not create or overwrite profiles')

  console.log(`checkout-profile-read: ${checks}/${checks} checks passed`)
} finally {
  rmSync(output, { recursive: true, force: true })
}
