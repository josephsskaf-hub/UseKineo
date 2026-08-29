// Public cost-planner discovery contract.
// No network, database, credentials or production writes.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8')

const facts = read('lib/kineoFacts.ts')
const tools = read('app/tools/page.tsx')
const factsPage = read('app/facts/page.tsx')
const llms = read('app/llms.txt/route.ts')
const calculator = read('app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx')
const planFit = read('lib/growth/planFit.ts')
const sitemap = read('app/sitemap.ts')
const preview = read('docs/previews/PUBLIC-COST-PLANNER-DISCOVERY-2026-08-29.html')

let total = 0
let failed = 0
function check(name, condition) {
  total += 1
  if (condition) return
  failed += 1
  console.error(`FAIL ${name}`)
}

console.log('\nKINEO — public cost-planner discovery\n')

check('one structured cost-planner fact is exported', (facts.match(/export const PUBLIC_COST_PLANNER_FACT/g) || []).length === 1)
check('cost planner is not misclassified as a text tool', facts.includes("output: 'cost_plan'"))
check('cost planner requires no account', facts.includes('requiresAccount: false'))
check('cost planner requires no card', facts.includes('requiresCard: false'))
check('cost planner requires no email', facts.includes('requiresEmail: false'))
check('cost planner names its public pricing page', facts.includes("pricingUrl: `${BASE}/pricing`"))
check('cost planner explicitly does not estimate earnings', facts.includes('does not estimate platform earnings'))
check('cost planner explicitly does not render video', facts.includes('does not estimate platform earnings or render a video'))
check('facts payload exposes costPlanner', facts.includes('costPlanner: PUBLIC_COST_PLANNER_FACT'))

check('calculator imports canonical plan fit', calculator.includes("from '@/lib/growth/planFit'"))
check('calculator executes canonical plan fit', calculator.includes('calculatePlanFit({'))
check('plan fit imports checkout pricing', planFit.includes("from '@/lib/checkoutPricing'"))
check('calculator offers the adjacent lower-plan cadence', calculator.includes('result.lowerCostAlternative'))
check('calculator offers same-engine self-serve capacity', calculator.includes('result.maximumSameEngineFilms'))

check('/tools imports the canonical cost planner fact', tools.includes('PUBLIC_COST_PLANNER_FACT'))
check('/tools derives its public collection from both fact sets', tools.includes('[...FREE_TOOL_FACTS, PUBLIC_COST_PLANNER_FACT]'))
check('/tools has a cost-planner card contract', tools.includes("'/cheapest-ai-shorts-maker':"))
check('/tools calls the action a cheapest-plan search', tools.includes("cta: 'Find my cheapest plan'"))
check('/tools distinguishes cost output from text output', tools.includes("tool.output === 'cost_plan'"))
check('/tools does not describe all tools as text-only', tools.includes('Text, planning and cost estimates'))
check('/tools boundary says no rendered video', tools.includes('text, planning or a cost estimate — not a rendered video'))

check('/facts imports the canonical cost planner fact', factsPage.includes('PUBLIC_COST_PLANNER_FACT'))
check('/facts publishes the canonical planner URL', factsPage.includes('PUBLIC_COST_PLANNER_FACT.url'))
check('/facts publishes the canonical pricing URL', factsPage.includes('PUBLIC_COST_PLANNER_FACT.pricingUrl'))

check('/llms.txt imports the canonical cost planner fact', llms.includes('PUBLIC_COST_PLANNER_FACT'))
check('/llms.txt derives total count instead of hand-writing it', llms.includes('FREE_TOOL_FACTS.length + 1'))
check('/llms.txt emits the dedicated cost planner line', llms.includes('${costPlannerLine}'))
check('/llms.txt preserves the text-vs-plan boundary', llms.includes('cost planner stops at a PLAN FIT'))
check('/llms.txt does not claim the planner produces video', llms.includes('do not describe\nany of them as producing a video'))

check('cost planner is already in sitemap', sitemap.includes("{ path: '/cheapest-ai-shorts-maker'"))
check('tools hub is already in sitemap', sitemap.includes("{ path: '/tools'"))
check('facts page is already in sitemap', sitemap.includes("{ path: '/facts'"))

check('preview contains before desktop', preview.includes('BEFORE · DESKTOP'))
check('preview contains after desktop', preview.includes('AFTER · DESKTOP'))
check('preview contains before mobile', preview.includes('BEFORE · MOBILE'))
check('preview contains after mobile', preview.includes('AFTER · MOBILE'))
check('preview shows the new card copy', preview.includes('I need the real Kineo production cost'))

console.log(`${total - failed}/${total} checks passed`)
if (failed) process.exit(1)
