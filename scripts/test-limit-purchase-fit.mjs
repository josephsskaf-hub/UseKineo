// limit_purchase_fit_v1 — deterministic contract tests.
// No network, database, credentials or production writes.

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function findTsc(base) {
  let dir = base
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('TypeScript compiler not found')
}

const temp = mkdtempSync(join(tmpdir(), 'kineo-limit-purchase-fit-'))
const sourceDir = join(temp, 'src')
const outDir = join(temp, 'out')
mkdirSync(sourceDir, { recursive: true })

for (const [source, destination] of [
  ['lib/growth/limitPurchaseFit.ts', 'limitPurchaseFit.ts'],
  ['lib/checkoutPricing.ts', 'checkoutPricing.ts'],
  ['lib/credits/engineCost.ts', 'engineCost.ts'],
  ['lib/autopilot/config.ts', 'autopilotConfig.ts'],
]) {
  const content = readFileSync(join(root, source), 'utf8')
    .replace(/from '@\/lib\/checkoutPricing'/g, "from './checkoutPricing'")
    .replace(/from '@\/lib\/credits\/engineCost'/g, "from './engineCost'")
    .replace(/from '@\/lib\/autopilot\/config'/g, "from './autopilotConfig'")
  writeFileSync(join(sourceDir, destination), content)
}

execFileSync(process.execPath, [
  findTsc(root),
  join(sourceDir, 'limitPurchaseFit.ts'),
  join(sourceDir, 'checkoutPricing.ts'),
  join(sourceDir, 'engineCost.ts'),
  join(sourceDir, 'autopilotConfig.ts'),
  '--outDir', outDir,
  '--rootDir', sourceDir,
  '--module', 'commonjs',
  '--target', 'es2022',
  '--moduleResolution', 'node',
  '--skipLibCheck',
], { stdio: 'pipe' })
writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))

const requireFromTemp = createRequire(join(outDir, 'runner.cjs'))
const fit = requireFromTemp(join(outDir, 'limitPurchaseFit.js'))
const pricing = requireFromTemp(join(outDir, 'checkoutPricing.js'))

let total = 0
let failed = 0
function check(name, condition, detail = '') {
  total += 1
  if (condition) return
  failed += 1
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log('\nKINEO — limit_purchase_fit_v1\n')

const zeroToKling = fit.calculateLimitPurchaseFit({ balance: 0, requiredCredits: 150, isSubscriber: false })
check('known shortage produces a fit contract', zeroToKling !== null)
check('exact shortfall is preserved', zeroToKling?.shortfall === 150)
check('Starter does not falsely cover 150', !zeroToKling?.fittingPlanIds.includes('starter'))
check('Creator does not falsely cover 150', !zeroToKling?.fittingPlanIds.includes('basic'))
check('Studio covers 150 using canonical grant', zeroToKling?.fittingPlanIds[0] === 'pro')
check('Studio is the subscription recommendation', zeroToKling?.recommended?.type === 'plan' && zeroToKling?.recommended?.id === 'pro')
check('300-credit top-up is a truthful alternative', zeroToKling?.fittingTopupIds[0] === 'topup300')

const partialToSeedance = fit.calculateLimitPurchaseFit({ balance: 21, requiredCredits: 25, isSubscriber: false })
check('partial balance shortfall is exact', partialToSeedance?.shortfall === 4)
check('Starter is the smallest fitting plan', partialToSeedance?.recommended?.type === 'plan' && partialToSeedance?.recommended?.id === 'starter')
check('smallest fitting top-up comes from canonical credits', partialToSeedance?.fittingTopupIds[0] === 'topup40')

const subscriber = fit.calculateLimitPurchaseFit({ balance: 51, requiredCredits: 150, isSubscriber: true })
check('subscriber receives no second-plan recommendation', subscriber?.fittingPlanIds.length === 0)
check('subscriber gets the smallest fitting top-up', subscriber?.recommended?.type === 'topup' && subscriber?.recommended?.id === 'topup300')
check('subscriber recommendation covers exact request', fit.limitPurchaseChoiceFits(subscriber, subscriber.recommended))

const hugeRequest = fit.calculateLimitPurchaseFit({ balance: 0, requiredCredits: 500, isSubscriber: false })
check('no option is represented honestly', hugeRequest?.recommended === null)
check('no fitting option counts remain zero', hugeRequest?.fittingPlanIds.length === 0 && hugeRequest?.fittingTopupIds.length === 0)

check('no shortage returns null', fit.calculateLimitPurchaseFit({ balance: 30, requiredCredits: 25, isSubscriber: false }) === null)
check('unknown balance returns null', fit.calculateLimitPurchaseFit({ balance: null, requiredCredits: 25, isSubscriber: false }) === null)
check('invalid requirement returns null', fit.calculateLimitPurchaseFit({ balance: 0, requiredCredits: 0, isSubscriber: false }) === null)

check('balance buckets are bounded', fit.creditAmountBucket(0) === 'zero' && fit.creditAmountBucket(24) === '1_24' && fit.creditAmountBucket(200) === '200_plus')
const telemetry = fit.limitPurchaseFitTelemetry(zeroToKling)
check('telemetry carries no exact credit values', !Object.keys(telemetry).some((key) => ['balance', 'required_credits', 'shortfall'].includes(key)))
check('telemetry uses versioned categorical contract', telemetry.version === 'limit_purchase_fit_v1' && telemetry.required_bucket === '100_199')

check('first-purchase grant never exceeds recurring grant', ['starter', 'basic', 'pro'].every((tier) => fit.firstPurchaseCredits(tier) <= pricing.TIER_CREDITS[tier]))
check('starter first-purchase grant is canonical', fit.firstPurchaseCredits('starter') === Math.min(pricing.TIER_CREDITS.starter, pricing.INTRO_CREDITS.starter))
check('creator first-purchase grant is canonical', fit.firstPurchaseCredits('basic') === Math.min(pricing.TIER_CREDITS.basic, pricing.INTRO_CREDITS.basic))
check('Studio first-purchase grant is canonical', fit.firstPurchaseCredits('pro') === pricing.TIER_CREDITS.pro)

const client = readFileSync(join(root, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
check('GenerateClient imports the executed fit helper', client.includes("from '@/lib/growth/limitPurchaseFit'"))
check('modal receives current balance', /<UpgradeModal[\s\S]*?balance=\{credits\}/.test(client))
check('modal receives selected request cost', /<UpgradeModal[\s\S]*?requiredCredits=\{selectedCost\}/.test(client))
check('view event is versioned', client.includes("trackEvent('limit_purchase_fit_viewed'"))
check('click event is versioned', client.includes("trackEvent('limit_purchase_fit_clicked'"))
check('plans and top-ups both report fits_request', (client.match(/fits_request:/g) ?? []).length >= 2)
check('existing checkout launchers remain connected', client.includes("upgradeModalCheckout.launch(") && client.includes("topupCheckout.launch("))

console.log(`\n${total - failed}/${total} checks passed`)
if (failed > 0) process.exit(1)
