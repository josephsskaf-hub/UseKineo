import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { root, source, offlineModules, renderToStaticMarkup, checks } from './gpt24h-offline-support.mjs'
import { engineFixture } from './gpt24h-engine-fixture.mjs'
import { edicoesIndiceHtml, semIndiceHtml } from './test-support/indice-video-ia-2026-10-06.mjs' // KINEO-INDICE-VIDEO-IA-2026-10-06
const { check, finish } = checks()
const pagePath = 'app/ai-video-generator/[engine]/page.tsx'
const proofPath = 'lib/growth/paidEngineProof.ts'
const replacements = process.argv.includes('--mutant') ? { [proofPath]: source(proofPath).replaceAll('Math.floor', 'Math.ceil') } : {}
const load = engineFixture(replacements)
const { paidEngineBudget, paidEngineExamples, PAID_ENGINE_PROOF } = load(proofPath)
const { TIER_CREDITS, getTierPrice, formatCheckoutMoney } = load('lib/checkoutPricing.ts')
const { creditCostForDuration } = load('lib/credits/engineCost.ts')
const { MARKETING_REFERENCE_SECONDS } = load('lib/marketingPrice.ts')
const { ENGINES } = load('lib/growth/enginePageCatalog.ts')
check('four existing canonical engines', Object.keys(PAID_ENGINE_PROOF).join(',') === 'seedance,veo,kling,kling-3')
for (const [slug, config] of Object.entries(PAID_ENGINE_PROOF)) {
  const budget = paidEngineBudget(slug)
  const cost = creditCostForDuration(config.quality, true, MARKETING_REFERENCE_SECONDS)
  const tier = Math.floor(TIER_CREDITS.starter / cost) >= 1 ? 'starter' : 'basic'
  check(`${slug}: canonical floor, duration and monthly price`, budget?.films === Math.floor(TIER_CREDITS[tier] / cost) && budget.seconds === MARKETING_REFERENCE_SECONDS && budget.price === formatCheckoutMoney('usd',getTierPrice(tier,'usd','standard')))
  const html = renderToStaticMarkup(await load(pagePath).default({ params: { engine: slug } }))
  check(`${slug}: budget before intro`, html.indexOf('data-kineo="paid-engine-budget"') > html.indexOf('</h1>') && html.indexOf('data-kineo="paid-engine-budget"') < html.indexOf(ENGINES[slug].intro))
  check(`${slug}: calculated quantity rendered`, html.includes(`<strong>${budget.films} ${budget.films === 1 ? 'film' : 'films'}</strong> of ${budget.seconds} s`))
  check(`${slug}: two previews, no resolution claim`, (html.match(/<video /g) ?? []).length === 2 && !html.includes('1080p') && html.includes('Kineo-owned previews'))
  const samples = paidEngineExamples(slug,ENGINES[slug].name)
  check(`${slug}: same engine, authorized sample count`, samples.length === 2 && samples.every(v => v.engine === config.quality))
  for (const v of samples) check(`${slug}: preview and poster exist ${v.id}`, existsSync(resolve(root,'public'+v.videoUrl)) && existsSync(resolve(root,'public'+v.posterUrl)))
}
const before = execFileSync('git',['show','365e663a:app/ai-video-generator/[engine]/page.tsx'],{cwd:root,encoding:'utf8'})
const after = readFileSync(resolve(root,pagePath),'utf8')
const bridge = s => s.slice(s.indexOf('{/* KINEO-PONTE-ACIMA'), s.indexOf('{/* KINEO-GALERIA-DA-CASA')).replace(/\r\n/g,'\n')
check('bridge and Kineo 1 starter untouched', bridge(before) === bridge(after))
const beforeLoad = engineFixture({[pagePath]:before})
// KINEO-INDICE-VIDEO-IA-2026-10-06 — reancorado com motivo: a página de motor ganhou UM link discreto "Real cost and render
// time" (/ai-video-index). O HTML atual desconta SÓ ele (scripts/test-support/indice-video-ia-2026-10-06.mjs) e o exige uma vez.
const kineo1Atual = renderToStaticMarkup(await load(pagePath).default({params:{engine:'kineo-1'}}))
check('Kineo 1 has the index link exactly once (the normalization has a subject)', edicoesIndiceHtml(kineo1Atual) === 1)
check('Kineo 1 renders identically', renderToStaticMarkup(await beforeLoad(pagePath).default({params:{engine:'kineo-1'}})) === semIndiceHtml(kineo1Atual))
check('unknown engine / Kineo 1 not offered paid block', paidEngineBudget('kineo-1') === null && paidEngineBudget('unknown') === null)
const jsx = source('components/PaidEngineBudget.tsx')
check('no typed commercial numbers', !/\$\d|\b\d+\s*(credits|films|seconds|USD|\/month)|1080p/.test(jsx))
const pricing = load('lib/checkoutPricing.ts')
const fallback = offlineModules({ mocks: { 'lib/checkoutPricing.ts': { ...pricing, TIER_CREDITS: { ...pricing.TIER_CREDITS, starter: 0 } } } })(proofPath)
check('insufficient Starter uses Creator', fallback.paidEngineBudget('seedance')?.tier === 'basic')
const noBudget = offlineModules({ mocks: { 'lib/checkoutPricing.ts': { ...pricing, TIER_CREDITS: { ...pricing.TIER_CREDITS, starter: 0, basic: 0 } } } })(proofPath)
check('no zero-film sales promise', noBudget.paidEngineBudget('seedance') === null)
finish()
