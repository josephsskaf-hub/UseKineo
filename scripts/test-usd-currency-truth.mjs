// USD-only currency truth — deterministic contract checks.
// No network, database, credentials or production writes.

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

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

const temp = mkdtempSync(join(tmpdir(), 'kineo-usd-truth-'))
const sourceDir = join(temp, 'src')
const outDir = join(temp, 'out')
mkdirSync(sourceDir, { recursive: true })

const compileFiles = [
  ['lib/checkoutPricing.ts', 'checkoutPricing.ts'],
  ['lib/credits/engineCost.ts', 'engineCost.ts'],
  ['lib/autopilot/config.ts', 'autopilotConfig.ts'],
]

for (const [source, destination] of compileFiles) {
  const content = read(source)
    .replace(/from '@\/lib\/credits\/engineCost'/g, "from './engineCost'")
    .replace(/from '@\/lib\/autopilot\/config'/g, "from './autopilotConfig'")
  writeFileSync(join(sourceDir, destination), content)
}

execFileSync(process.execPath, [
  findTsc(root),
  ...compileFiles.map(([, file]) => join(sourceDir, file)),
  '--outDir', outDir,
  '--rootDir', sourceDir,
  '--module', 'commonjs',
  '--target', 'es2022',
  '--moduleResolution', 'node',
  '--skipLibCheck',
], { stdio: 'pipe' })
writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))

const requireFromTemp = createRequire(join(outDir, 'runner.cjs'))
const pricing = requireFromTemp(join(outDir, 'checkoutPricing.js'))

let total = 0
let failed = 0
function check(condition, message) {
  total += 1
  if (condition) return
  failed += 1
  console.error(`FAIL — ${message}`)
}

check(pricing.CHECKOUT_CURRENCY_TRUTH_VERSION === 'usd_only_currency_truth_v1', 'truth has a stable cohort version')
check(Object.keys(pricing.CURRENCY_DISPLAY).join(',') === 'usd', 'currency allowlist contains only USD')
check(pricing.resolveCheckoutCurrency('BR') === 'usd', 'Brazil resolves to USD')
check(pricing.resolveCheckoutCurrency('IN') === 'usd', 'India resolves to USD')
check(pricing.resolveCheckoutCurrency(null) === 'usd', 'unknown country resolves to USD')
check(pricing.CHECKOUT_CURRENCY_TRUTH.includes('charged in USD worldwide'), 'canonical copy names worldwide USD charging')
check(pricing.CHECKOUT_CURRENCY_TRUTH.includes('bank may convert'), 'canonical copy names bank conversion')
check(pricing.CHECKOUT_CURRENCY_TRUTH.includes('exchange fees'), 'canonical copy names possible exchange fees')
check(pricing.CHECKOUT_CURRENCY_LOADING === 'Loading the USD price…', 'loading copy cannot imply local currency')

const files = {
  pricing: read('app/pricing/PricingClient.tsx'),
  cards: read('components/PricingCards.tsx'),
  home: read('app/KineoLanding.tsx'),
  schema: read('components/StructuredData.tsx'),
  costPage: read('app/cheapest-ai-shorts-maker/page.tsx'),
  costCalculator: read('app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx'),
}

for (const [surface, source] of Object.entries(files)) {
  check(!/show(?:n)? in your local|local (?:checkout )?currency|switch(?:es)? to your local|checking (?:your )?local price|local first-month|local subscription prices|local prices matched/i.test(source), `${surface} has no local-currency promise`)
}

check(files.pricing.includes('CHECKOUT_CURRENCY_TRUTH}'), 'pricing strip renders canonical truth')
check(files.pricing.includes('currency_truth_version: CHECKOUT_CURRENCY_TRUTH_VERSION'), 'pricing view carries the cohort version')
check(files.pricing.includes("trackEvent('pricing_view', {"), 'pricing view always receives metadata')
check(files.cards.includes('CHECKOUT_CURRENCY_LOADING'), 'inline cards use canonical USD loading copy')
check(files.cards.includes('CHECKOUT_CURRENCY_TRUTH}'), 'inline cards render canonical currency truth')
check(files.home.includes('{CHECKOUT_CURRENCY_TRUTH} New accounts'), 'visible home FAQ uses canonical truth')
check(files.schema.includes('${CHECKOUT_CURRENCY_TRUTH} New accounts'), 'FAQ JSON-LD uses canonical truth')
check(files.costPage.includes('Calculate the USD cost per AI Short'), 'SEO description names USD')
check(files.costPage.includes('Charged in USD worldwide'), 'cost-page chip names USD')
check(files.costPage.includes('${CHECKOUT_CURRENCY_TRUTH}'), 'cost-page FAQ uses canonical truth')
check(files.costCalculator.includes('{CHECKOUT_CURRENCY_LOADING}'), 'cost calculator uses canonical USD loading copy')
check(files.costCalculator.includes('currency_truth_version: CHECKOUT_CURRENCY_TRUTH_VERSION'), 'cost calculator carries the version')

const homeAnswer = files.home.match(/How much does Kineo cost\?<\/h3><p>([\s\S]*?)<\/p><\/div>/)?.[1] ?? ''
const schemaAnswer = files.schema.match(/name: 'How much does Kineo cost\?'[\s\S]*?text: `([\s\S]*?)`,/)?.[1] ?? ''
check(homeAnswer.includes('{CHECKOUT_CURRENCY_TRUTH}'), 'home pricing answer contains canonical interpolation')
check(schemaAnswer.includes('${CHECKOUT_CURRENCY_TRUTH}'), 'schema pricing answer contains canonical interpolation')
// The price prefix uses JSX helpers on the visible page and template-string
// helpers in JSON-LD, so raw source equality would test syntax, not output.
// Compare the shared prose from the first literal sentence onward.
const homeProse = homeAnswer
  .slice(homeAnswer.indexOf('Credits are spent'))
  .replace('{CHECKOUT_CURRENCY_TRUTH}', '${CHECKOUT_CURRENCY_TRUTH}')
const schemaProse = schemaAnswer.slice(schemaAnswer.indexOf('Credits are spent'))
check(homeProse === schemaProse, 'visible FAQ and JSON-LD retain identical shared prose')

const eventWindow = files.pricing.slice(
  files.pricing.indexOf("trackEvent('pricing_view'"),
  files.pricing.indexOf("trackEvent('pricing_view'") + 360,
)
for (const forbidden of ['email', 'prompt', 'script', 'topic', 'session_id', 'user_id']) {
  check(!new RegExp(`\\b${forbidden}\\b`).test(eventWindow), `pricing view excludes ${forbidden}`)
}

if (failed) {
  console.error(`FAIL — ${failed}/${total} USD currency-truth checks failed`)
  process.exit(1)
}
console.log(`PASS — ${total}/${total} USD currency-truth checks`)
