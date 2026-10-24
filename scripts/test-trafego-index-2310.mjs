// KINEO-TRAFEGO-2310 — real sitemap + serialized llms response; offline, no env/database/network.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { offlineModules } from './gpt24h-offline-support.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import vm from 'node:vm'

// The shared loader's 5s VM deadline includes synchronous nested TS compilation. On Windows/OneDrive
// the real catalogue can exceed that deadline. Increase only the local guard deadline, never its mocks/assertions.
const runVm = vm.runInNewContext
vm.runInNewContext = (code, context, options = {}) => runVm(code, context, { ...options, timeout: Math.max(options.timeout || 0, 60_000) })

function objectKeys(file, variable) {
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let keys
  const visit = n => {
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === variable && ts.isObjectLiteralExpression(n.initializer)) {
      keys = n.initializer.properties.map(p => p.name.text)
    }
    ts.forEachChild(n, visit)
  }
  visit(ast)
  assert.ok(keys?.length, `${file}: real ${variable} keys`)
  return keys
}
const pure = offlineModules()
const llmsLoad = createOfflineLoader({ globals: { Response } })
const niches = [...objectKeys('app/free-ai-shorts/[niche]/page.tsx', 'NICHES'), ...pure('lib/seo/paginasLote1Paths.ts').LOTE1_NICHE_SLUG_LIST]
const mocks = {
  'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: [...new Set(niches)] },
  'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: objectKeys('app/alternatives/[competitor]/page.tsx', 'COMPETITORS') },
  'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
  'lib/publicExamples.ts': llmsLoad('lib/publicExamples.ts'),
  'lib/kineoFacts.ts': llmsLoad('lib/kineoFacts.ts'),
}
const load = offlineModules({ mocks })
const sitemap = load('app/sitemap.ts').default()
const refresh = load('lib/seo/trafego2310.ts')
const { INTENT_SLUGS, intentPagePath } = load('lib/seo/intentPages.ts')
const { ENGINE_SLUGS, isIndexableEngineSlug } = load('lib/growth/enginePageCatalog.ts')
const expected = [
  '/', '/text-to-video-shorts', '/gerador-de-shorts-gratis', '/state-of-ai-shorts-2026',
  '/best-ai-shorts-generators', '/free-ai-shorts-generator', '/chatgpt',
  ...mocks['app/free-ai-shorts/[niche]/page.tsx'].NICHE_SLUGS.map(s => `/free-ai-shorts/${s}`),
  ...INTENT_SLUGS.map(intentPagePath),
  ...ENGINE_SLUGS.filter(isIndexableEngineSlug).map(s => `/ai-video-generator/${s}`),
]
const byPath = new Map(sitemap.map(e => [new URL(e.url).pathname, e]))
assert.equal(sitemap.length, new Set(sitemap.map(e => e.url)).size, 'canonical deduplication')
for (const path of [...expected, '/ai-kids-cartoon-videos', '/desenho-infantil-3d-com-ia', '/pricing']) {
  assert.ok(byPath.has(path), `mapped: ${path}`)
  assert.equal(new Date(byPath.get(path).lastModified).toISOString().slice(0, 10), '2026-10-23', `review date: ${path}`)
}
for (const entry of sitemap) {
  assert.equal(new URL(entry.url).origin, 'https://www.usekineo.com')
  assert.doesNotMatch(new URL(entry.url).pathname, /^\/(?:api|signup|login|studio|kids-cartoon|history|dashboard)(?:\/|$)/)
}
const off = offlineModules({ mocks, replacements: { 'lib/kidsCartoon/kidsCartoon.ts': readFileSync('lib/kidsCartoon/kidsCartoon.ts', 'utf8').replace('export const KIDS_CARTOON_PAGES_LIVE = true', 'export const KIDS_CARTOON_PAGES_LIVE = false') } })('app/sitemap.ts').default()
assert.ok(!off.some(e => /\/(ai-kids-cartoon-videos|desenho-infantil-3d-com-ia)$/.test(e.url)), 'Cartoon pages remain gated')
assert.equal(refresh.trafego2310Sitemap([{ url: 'https://www.usekineo.com/pricing', lastModified: '2026-10-24' }], [])[0].lastModified, '2026-10-24', 'newer dates survive')
assert.throws(() => refresh.trafego2310Sitemap([{ url: 'https://shortsforgeai.com/pricing' }], []), /Non-canonical/)

const response = llmsLoad('app/llms.txt/route.ts').GET()
const body = await response.text()
assert.equal(response.status, 200)
assert.ok(body.indexOf('## Make a Film') < body.indexOf('## Does Kineo make videos and ads'), 'Film leads the catalogue')
assert.equal(body.split('## Videos from an idea or a script').length - 1, 1, 'one detailed film section, without duplicate intro headings')
const intro = body.slice(0, body.indexOf('## Videos from an idea or a script'))
const facts = llmsLoad('lib/kineoFacts.ts').getKineoFacts()
assert.ok(intro.includes(facts.studioAds.url) && intro.includes(facts.businessVideoService.url), 'current intro preserves both public Ads paths after Film first')
assert.ok(intro.includes('free and trial accounts can make their first ad free (one per account, within a daily limit)') && intro.includes('guaranteed sales') && !intro.includes('free trial does not include it'), 'current intro preserves the actual first-ad sample limits and excludes a sales guarantee')
for (const text of ['Product information reviewed: 2026-10-23', 'Customers in Brazil pay in BRL', '/text-to-video-shorts', '/ai-video-generator/for/urdu', 'AI UGC', 'Cartoon subscription and pack', 'Small visual details may vary']) assert.ok(body.includes(text), `llms: ${text}`)
assert.doesNotMatch(body, /charges? (?:plan prices )?in USD worldwide|All prices in USD\./i)
const cost = llmsLoad('lib/credits/engineCost.ts').creditCostForDuration
assert.ok(body.includes(`${cost('cinematic_ai', true, 15)} credits at 15 seconds or ${cost('cinematic_ai', true, 60)} credits at 60 seconds`))
const kids = llmsLoad('lib/kidsVenda/kidsVenda.ts')
const money = llmsLoad('lib/checkoutPricing.ts').formatCheckoutMoney
assert.ok(body.includes(`${money('usd', kids.KIDS_PRICES.autopilot.usdMinor)}/month for ${kids.KIDS_VIDEOS.autopilot} cartoons`), 'Cartoon source of price/count')
const withoutSales = createOfflineLoader({ globals: { Response }, mocks: { '@/lib/kineoFacts': llmsLoad('lib/kineoFacts.ts') }, source: (file, text) => file === 'lib/kidsVenda/kidsVenda.ts' ? text.replace('export const KIDS_SALES_LIVE = true', 'export const KIDS_SALES_LIVE = false') : text })
assert.ok(!(await withoutSales('app/llms.txt/route.ts').GET().text()).includes('Cartoon subscription and pack'), 'closed sales are absent')
console.log(JSON.stringify({ classification: 'FATO CONFIRMADO / TESTADO LOCALMENTE', date: '2026-10-23', sitemapUrls: sitemap.length, clearPages: expected.length, cartoonPages: 2, missing: [], duplicates: 0, llms: 'Film first; current Cartoon offers; Brazil BRL; real GET' }))
