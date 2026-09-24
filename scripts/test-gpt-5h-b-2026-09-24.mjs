import { source, moduleAt, checks } from './gpt-5h-test-support.mjs'
const { check, finish } = checks()
const { SORA_REPLACEMENTS, SORA_API_SOURCE, SORA_API_SHUTDOWN } = await moduleAt('lib/growth/soraMigrationFacts.ts')
const { PLANS } = await moduleAt('lib/pricing.ts')
const { creditCostForDuration, DURATION_REFERENCE_SECONDS } = await moduleAt('lib/credits/engineCost.ts')
const { enginePaused } = await moduleAt('lib/engineLaunch.ts')
let table = source('components/SoraReplacementTable.tsx')
if (process.argv.includes('--mutant')) table = table.replace('Paused — unavailable','Available today')
check('official API source and exact dated statement', SORA_API_SOURCE === 'https://developers.openai.com/api/docs/deprecations' && SORA_API_SHUTDOWN === 'Sora 2 shut down on September 24, 2026')
check('four named replacement rows', SORA_REPLACEMENTS.length === 4 && ['Seedance 1.5','Kling 3','Veo 3.1','Omni Flash'].every(n => SORA_REPLACEMENTS.some(r => r.name === n)))
for (const engine of SORA_REPLACEMENTS) {
  check(`${engine.name} cost derives from engine and plan source`, engine.credits === creditCostForDuration(engine.quality,true,DURATION_REFERENCE_SECONDS) && engine.allocatedUsd === engine.credits * PLANS.pro.price / PLANS.pro.credits)
  check(`${engine.name} pause derives from shared gate`, Boolean(engine.paused) === Boolean(enginePaused(engine.key)))
}
check('paused row is not advertised as purchasable', table.includes('Paused — unavailable') && table.includes('Not for sale while paused') && table.includes("engine.paused ? '—' : engine.credits"))
check('cost allocation is not a new per-film offer', table.includes('Not a standalone film purchase') && table.includes('PLANS.pro.priceLabel'))
for (const route of ['sora-alternative','omni-flash-vs-sora']) {
  const page = source(`app/${route}/page.tsx`)
  check(`${route}: dated sourced API statement and shared Studio bridge`, page.includes('{SORA_API_SHUTDOWN} in the OpenAI API') && page.includes('SORA_API_SOURCE') && page.includes('<SoraReplacementTable />'))
  check(`${route}: no expired trial/ranking promise`, !page.includes('$1 Creator trial') && !page.includes('Free — 10 credits, every engine') && !page.includes('#1-ranked'))
  check(`${route}: discoverable`, source('app/sitemap.ts').includes(`'/${route}'`) && source('app/llms.txt/route.ts').includes(`/${route}`))
}
check('Studio link, not generate/payment action', table.includes('href="/studio?') && !table.includes('/api/generate') && !table.includes('/api/stripe/checkout'))
finish()
