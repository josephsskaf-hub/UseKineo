// Current BF landing contract. Real TSX rendered offline; no server, credentials or network.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { React, offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'
const COMPONENT = 'components/ads/BlackFridayCampaignPage.tsx'
const mocks = { 'lib/analytics.ts': { trackEvent() {} }, 'components/Footer.tsx': { __esModule: true, default: () => null }, 'lib/supabase/client.ts': { createClient: () => ({ auth: { getSession: async () => ({ data: {} }) } }) } }
const normal = offlineModules({ mocks })
const S = normal('lib/seo/paginasUgc2010.ts'), C = normal('lib/ads/bfCampaign.ts'), K = normal('lib/ads/kitBfSale.ts')
const credits = normal('lib/ads/v2Tiers.ts').adsV2Credits('commercial', 15)
const seconds = normal('lib/ads/cena/escolhaSamplePolicy.ts').ADS_ESCOLHA_SAMPLE_SECONDS
const paths = { en: S.BF_EN_PATH, pt: S.BF_PT_PATH, es: S.BF_ES_PATH }
const clean = s => s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
function check(replacements = {}) {
  const load = offlineModules({ replacements, mocks })
  for (const [lang, path] of Object.entries(paths)) {
    const route = load(`app${path}/page.tsx`)
    assert.equal(route.dynamic, 'force-static')
    const html = renderToStaticMarkup(React.createElement(route.default))
    const visible = clean(html.replace(/<(style|script)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')
    const meta = route.metadata
    assert.ok(meta.title.absolute.length <= 60 && meta.description.length >= 70 && meta.description.length <= 155)
    assert.equal(meta.alternates.canonical, `https://www.usekineo.com${path}`)
    assert.deepEqual(JSON.parse(JSON.stringify(meta.alternates.languages)), {
      en: `https://www.usekineo.com${paths.en}`, 'pt-BR': `https://www.usekineo.com${paths.pt}`,
      es: `https://www.usekineo.com${paths.es}`, 'x-default': `https://www.usekineo.com${paths.en}`,
    })
    assert.ok(html.includes(`lang="${lang === 'pt' ? 'pt-BR' : lang}"`))
    const models = [...html.matchAll(/data-bf-template="([^"]+)"/g)].map(m => m[1])
    assert.deepEqual(models, [...C.BF_TEMPLATE_IDS])
    for (const id of C.BF_TEMPLATE_IDS) {
      const destination = C.bfTemplateHref(lang, id)
      assert.equal(clean(html).split(`href="${destination}"`).length - 1, 1, `one direct handoff for ${lang}/${id}`)
      assert.ok(visible.includes(C.bfTemplate(lang, id).title))
    }
    const cost = clean(html.match(/<p data-bf-cost="true">([\s\S]*?)<\/p>/)?.[1] ?? '')
    assert.ok(cost.includes(`${credits} ${lang === 'en' ? 'credits' : 'créditos'}`), 'full ad price paragraph derives from actual debit')
    assert.ok(visible.includes(`${seconds} s`))
    assert.ok(visible.includes('27') && visible.includes('2026'))
    assert.ok(/selected countries|países selecionados|países seleccionados/.test(visible))
    assert.ok(!/3 or 5 variations|3 a 5 variações|10 .*ads|34 credits|creatives close on October 31/.test(visible))
    if (K.kitBfSaleOpen()) {
      assert.ok(visible.includes(K.kitBfPriceLabel()))
      assert.ok(clean(html.match(/data-bf-pack="true">[\s\S]*?<strong>([\s\S]*?)<\/strong>/)?.[1] ?? '').includes(K.kitBfPriceLabel()), 'pack heading price matches checkout')
      assert.ok(visible.includes(String(K.KIT_BF_CREDITS)))
      assert.ok(visible.includes(String(K.KIT_BF_REMAINING_CREDITS)))
      assert.equal(clean(html).split(`href="${K.KIT_BF_CHECKOUT_HREF}"`).length - 1, 1)
    }
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]))
    assert.deepEqual(ld.map(x => x['@type']).sort(), ['BreadcrumbList', 'FAQPage'])
    const shown = [...html.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map(m => ({ q: clean(m[1]), a: clean(m[2]) }))
    assert.equal(shown.length, 3)
    assert.deepEqual(ld.find(x => x['@type'] === 'FAQPage').mainEntity.map(x => ({ q: x.name, a: x.acceptedAnswer.text })), shown)
    for (const p of Object.values(paths)) assert.ok(S.PAGINAS_UGC_PATHS.includes(p))
  }
}
check()
const raw = readFileSync(COMPONENT, 'utf8')
for (const [before, after] of [
  ['href={bfTemplateHref(lang, id)}', 'href="/pricing"'],
  ["c.paid(adsV2Credits('commercial', 15))", 'c.paid(999)'],
  ['c.sample(ADS_ESCOLHA_SAMPLE_SECONDS)', 'c.sample(15)'],
  ['c.faqs.map(({ q, a }) => <details', 'c.faqs.slice(1).map(({ q, a }) => <details'],
  ['pack.priceLine', "'US$ 1'"],
]) {
  assert.ok(raw.includes(before), `applicable mutant ${before}`)
  assert.throws(() => check({ [COMPONENT]: raw.replace(before, after) }), undefined, `mutant killed: ${before}`)
}
console.log('PASS — BF EN/PT/ES: real pages, three direct templates, price/credits/sample sources, regional copy, reciprocal metadata, FAQ/schema and five mutants')
