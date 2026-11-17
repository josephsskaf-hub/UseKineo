import assert from 'node:assert/strict'
import { offlineModules, source, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

function prove(replacements = {}) {
  const load = offlineModules({ replacements })
  const { TRAFFIC_CITATIONS: citations } = load('lib/seo/trafficCitation2310.ts')
  const { FREE_FILM_ENGINE_NAME: free } = load('lib/freeFilmEngine.ts')
  const { STANDARD_FILM_NAME: paid, CITACOES_ROTINA_PATHS: paths } = load('lib/seo/citacoesRotina1711.ts')
  const costs = load('lib/credits/engineCost.ts'), prices = load('lib/checkoutPricing.ts')
  const h3 = load('lib/growth/h3TurboPage.ts').H3_TURBO_PAGE
  assert.ok(h3.intro.includes(free))
  assert.ok(h3.faq.find(f => f.q === 'Which model renders the scenes?').a.includes('MiniMax H3 Max Turbo for text-to-video'))
  assert.ok(!h3.tradeoff.includes('Seedance 1.5'))
  const cost = costs.creditCostForDuration('cinematic_ai', true, 60)
  for (const page of ['text','horror','urdu','portuguese','seedance']) {
    const data = citations[page]
    assert.equal(data.faq.length, 5, 'keep every question')
    assert.ok(data.rows.some(r => r.some(c => c.includes(free))), 'trial follows its source')
    assert.ok(data.rows[1][1].includes(paid), 'paid row follows its switch independently of trial')
    assert.ok(data.rows.some(r => r.some(c => c.includes(`${cost} per film`) || c.includes(`${cost} por filme`))))
    const html = renderToStaticMarkup(React.createElement(load('components/seo/TrafficCitation2310.tsx').CitationDetails,{page}))
    assert.ok(html.includes('dateTime="2026-11-17"'))
    assert.ok(html.includes(String(prices.TIER_CREDITS.basic)))
  }
  const stamp = load('lib/seo/paginasCitadas0511.ts').carimbaPaginasCitadas0511
  const urls = [...paths,'/pricing','/']
  const result = stamp(urls.map(p=>({url:'https://www.usekineo.com'+p,lastModified:'2026-11-06T12:00:00.000Z'})))
  assert.ok(result.slice(0,5).every(r=>r.lastModified.startsWith('2026-11-17')))
  assert.ok(result.slice(5).every(r=>r.lastModified.startsWith('2026-11-06')), 'unreviewed paths do not get fake freshness')
}
prove()
for(const [file,from,to] of [
 ['lib/seo/trafficCitation2310.ts','${STANDARD_FILM_NAME}','Seedance 1.5'],
 ['lib/growth/h3TurboPage.ts','${FREE_FILM_ENGINE_NAME}','Seedance 1.5'],
 ['lib/seo/citacoesRotina1711.ts',"'2026-11-17'","'2026-10-23'"],
]) {
  const original=source(file), mutated=original.replaceAll(from,to)
  assert.notEqual(mutated,original)
  assert.throws(()=>prove({[file]:mutated}), 'mutant must fail: '+from)
}
console.log('PASS five answer blocks, billing contracts, free engine, real fallback, selective sitemap date; three mutants rejected')
