import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, source, offlineModules, React, renderToStaticMarkup, checks } from './gpt24h-offline-support.mjs'
const { check, finish } = checks()
const dataPath = 'lib/growth/adsComparisons.ts'
const load = offlineModules({ replacements: process.argv.includes('--mutant') ? { [dataPath]: source(dataPath).replace('✗ Not included in Studio Ads.', '✓ Included in Studio Ads.') } : {} })
const { ADS_COMPARISONS, ADS_COMPARISON_ACCESS, adsComparisonRows, adsComparisonCta } = load(dataPath)
const snapshot = JSON.parse(readFileSync(resolve(root,'lib/growth/adsCompetitorSnapshot.json'),'utf8'))
const approvedDoc = source(snapshot.sourceDocument)
const slugs = ['creatify-alternative','topview-alternative','zeely-alternative']
check('three approved comparison slugs', JSON.stringify(ADS_COMPARISONS.map(c => c.slug)) === JSON.stringify(slugs))
check('date window comes from the source, not invented per-page access', approvedDoc.includes(`acesso em ${snapshot.accessWindow}`) && ADS_COMPARISON_ACCESS === `${snapshot.accessWindow}/${snapshot.year}`)
const prices = load('lib/checkoutPricing.ts')
for (const c of ADS_COMPARISONS) {
  const file = `app/vs/${c.slug}/page.tsx`, mod = load(file)
  const html = renderToStaticMarkup(React.createElement(mod.default))
  const rows = adsComparisonRows(c)
  const cells = c.sourceRow.split('|').slice(1,-1).map(s => s.trim())
  check(`${c.id}: snapshot cells match approved document`, approvedDoc.includes(c.sourceRow) && JSON.stringify([c.name,c.linkToAd,c.avatar,c.variations,c.formats,c.brandKit,c.publishing,c.analytics,c.translation,c.price]) === JSON.stringify(cells))
  check(`${c.id}: official source recorded, linked and dated`, approvedDoc.includes(c.officialUrl.replace('https://','')) && html.includes(c.officialUrl) && html.includes(ADS_COMPARISON_ACCESS) && html.includes('according to the official page'))
  check(`${c.id}: eight factual comparison rows rendered`, rows.length === 8 && (html.match(/data-comparison-row=/g) ?? []).length === 8)
  check(`${c.id}: Kineo lacks avatar, publishing and analytics explicitly`, rows.find(r=>r.id==='avatar').kineo.startsWith('✗') && rows.find(r=>r.id==='publishing-analytics').kineo.includes('✗ Direct publishing') && rows.find(r=>r.id==='publishing-analytics').kineo.includes('✗ Ad-performance analytics'))
  check(`${c.id}: captions unknown rather than invented`, rows.find(r=>r.id==='captions').competitor === 'Not confirmed in this snapshot.')
  check(`${c.id}: third-party and unknown translation not promoted to verified`, c.translation === '✓' ? rows.find(r=>r.id==='translation').competitor.startsWith('✓') : rows.find(r=>r.id==='translation').competitor.startsWith('Not confirmed'))
  const url = new URL(adsComparisonCta(c.id),'https://www.usekineo.com')
  check(`${c.id}: CTA gpt24h and per-comparison content`, url.pathname === '/ads' && url.searchParams.get('utm_campaign') === 'gpt24h' && url.searchParams.get('utm_content') === `vs-${c.id}` && html.includes('utm_campaign=gpt24h'))
  check(`${c.id}: source-derived Kineo price and source-derived competitor price`, html.includes(prices.formatCheckoutMoney('usd',prices.getTierPrice('starter','usd','standard'))) && html.includes(c.price.replace('(anual)','(annual billing)')))
  check(`${c.id}: metadata limits, canonical, own OG`, mod.metadata.title.absolute.length <= 60 && mod.metadata.description.length <= 155 && mod.metadata.alternates.canonical.endsWith(`/vs/${c.slug}`) && mod.metadata.openGraph.images[0].endsWith(`/og/vs-${c.id}.png`))
  const png = readFileSync(resolve(root,`public/og/vs-${c.id}.png`))
  check(`${c.id}: PNG 1200 x 630`, png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630)
  check(`${c.id}: no handwritten commercial digits in page wrapper`, !/\d/.test(source(file)))
}
const component = source('components/AdsComparisonPage.tsx')
check('no handwritten commercial digits in shared JSX', !/>[^<{}]*\d[^<{}]*</.test(component))
check('sitemap maps comparison catalog with canonical path', source('app/sitemap.ts').includes('...ADS_COMPARISONS.map(({ slug })') && source('app/sitemap.ts').includes('url: `${BASE}${adsComparisonPath(slug)}`'))
check('no old comparison route rewrite required', !source('app/vs/[pair]/page.tsx').includes('adsComparisons'))
check('mobile table scroll and visible focus', source('components/AdsComparisonPage.module.css').includes('overflow-x: auto') && source('components/AdsComparisonPage.module.css').includes(':focus-visible'))
finish()
