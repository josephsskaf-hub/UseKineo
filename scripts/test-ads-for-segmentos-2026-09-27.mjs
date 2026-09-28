import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, source, offlineModules, React, renderToStaticMarkup, checks } from './gpt24h-offline-support.mjs'
const { check, finish } = checks()
const dataPath = 'lib/growth/adsSegments.ts', pagePath = 'app/ads/for/[segment]/page.tsx'
const replacements = process.argv.includes('--mutant') ? { [dataPath]: source(dataPath).replace('utm_campaign=gpt24h', 'utm_campaign=wrong') } : {}
const load = offlineModules({ replacements })
const data = load(dataPath), page = load(pagePath)
const presentation = load('lib/growth/adsSegmentPresentation.ts')
const prices = load('lib/checkoutPricing.ts'), offer = load('lib/ads/offer.ts')
// REANCORADO 29/09 (KINEO-ADS-V2-VIRADA-2026-09-29): o produto principal das páginas /ads/for virou o anúncio v2 (~15 s). O
// preço da linha de oferta passou a ser o do nível mais barato do v2 (adsV2Credits), não mais o do Kineo 1 de 35 s. A
// intenção segue: preço e crédito canônicos, nunca digitados, e a mudança na fonte aparece no HTML.
const v2tiers = load('lib/ads/v2Tiers.ts'), v2screen = load('lib/ads/v2Screen.ts')
const v2Cheapest = Math.min(...v2tiers.ADS_V2_TIER_IDS.map(id => v2tiers.adsV2Credits(id, v2screen.ADS_V2_SCREEN_SECONDS)))
const expected = ['restaurants','dentists-and-clinics','real-estate','gyms-and-studios','salons-and-beauty','online-stores','local-services','courses-and-events']
check('exactly the eight approved slugs, no duplicates', JSON.stringify(data.ADS_SEGMENT_SLUGS) === JSON.stringify(expected))
check('static params cover every segment', page.generateStaticParams().map(x => x.segment).join('|') === expected.join('|'))
check('no client page, request or secret dependency', !/use client|fetch\(|process\.env|supabase|openai/i.test(source(pagePath) + source(dataPath)))
const jsx = source(pagePath)
check('no price, credit or duration digits typed into JSX text', !/>[^<{}]*\d[^<{}]*</.test(jsx) && !/["'`][^"'`\n]*\d+(?:\.\d+)?\s*(?:credits|USD|seconds|films)/i.test(jsx))
const robots = page.generateMetadata({ params: { segment: 'missing' } }).robots
check('unknown segment metadata noindex', robots.index === false)
let missing = false
try { page.default({ params: { segment: 'missing' } }) } catch (error) { missing = error.message === 'NEXT_NOT_FOUND' }
check('unknown segment is a real notFound', missing)
for (const segment of data.ADS_SEGMENTS) {
  const meta = page.generateMetadata({ params: { segment: segment.slug } })
  const html = renderToStaticMarkup(React.createElement(page.default, { params: { segment: segment.slug } }))
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  check(`${segment.slug}: metadata length and canonical`, meta.title.absolute.length <= 60 && meta.description.length <= 155 && meta.alternates.canonical === `https://www.usekineo.com/ads/for/${segment.slug}`)
  check(`${segment.slug}: OG references its own poster`, meta.openGraph.images[0].url.endsWith(data.adsSegmentPoster(segment.slug)))
  check(`${segment.slug}: FAQPage valid and matches visible FAQ`, json['@type'] === 'FAQPage' && json.mainEntity.length === 4 && json.mainEntity.every((q, i) => q.acceptedAnswer.text === presentation.adsSegmentFaq(segment)[i].answer && html.includes(q.name)))
  const cta = new URL(data.adsSegmentCta(segment.slug), 'https://www.usekineo.com')
  check(`${segment.slug}: CTA attribution`, cta.pathname === '/ads' && cta.searchParams.get('utm_source') === 'seo' && cta.searchParams.get('utm_medium') === 'ads_for' && cta.searchParams.get('utm_campaign') === 'gpt24h' && cta.searchParams.get('utm_content') === segment.slug)
  check(`${segment.slug}: single primary CTA, canonical price and credits`, (html.match(/class="cta"/g) ?? []).length === 1 && html.includes(prices.formatCheckoutMoney('usd', prices.getTierPrice('starter','usd','standard'))) && html.includes(`from ${v2Cheapest} credits per ${v2screen.ADS_V2_SCREEN_SECONDS}-second ad`))
  check(`${segment.slug}: honest placeholder or approved watch page, never invented playable sample`, !html.includes('<video') && (segment.exampleVideoUrl === null ? html.includes('placeholder, not a client result') : html.includes('Watch the example ad') && data.approvedSegmentExample(segment.exampleVideoUrl) !== null))
  const png = readFileSync(resolve(root, 'public' + data.adsSegmentPoster(segment.slug)))
  check(`${segment.slug}: static PNG 1200 x 630`, png.toString('hex', 0, 8) === '89504e470d0a1a0a' && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630)
  check(`${segment.slug}: links to all siblings`, expected.filter(x => x !== segment.slug).every(x => html.includes(`/ads/for/${x}`)))
}
// Evaluate the real sitemap export with only unrelated legacy clusters stubbed.
const sitemapMocks = {
  'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: [] }, 'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: [] },
  'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] }, 'lib/comparisons.ts': { CANONICAL_SLUGS: [] }, 'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
  'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false }, 'lib/growth/enginePageCatalog.ts': { ENGINE_SLUGS: [] },
  'lib/seo/intentPages.ts': { INTENT_HUB_PATH: '/ai-video-generator/for', INTENT_SLUGS: [], intentPagePath: x => x },
  'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: [], CITATION_REVIEW_DATE: '2026-09-27' },
  'lib/seo/freeShortsGeneratorLangs.ts': { FREE_SHORTS_LANGS: [] }, 'lib/seo/enginePageLangs.ts': { LOCALIZED_ENGINE_SLUGS: [], ENGINE_LANG_CODES: [] },
}
const sitemap = offlineModules({ mocks: sitemapMocks })('app/sitemap.ts').default()
check('all eight routes occur exactly once in sitemap, weekly priority 0.8', expected.every(slug => { const entries = sitemap.filter(x => x.url === `https://www.usekineo.com/ads/for/${slug}`); return entries.length === 1 && entries[0].priority === 0.8 && entries[0].changeFrequency === 'weekly' }))
check('existing landing measurement inherited from root layout', source('app/layout.tsx').includes('<SourceCapture />') && source('components/SourceCapture.tsx').includes('landing_session_started'))
check('mobile stacks, keyboard focus visible, media fluid', /@media \(max-width: 760px\)/.test(source('app/ads/for/[segment]/segment.module.css')) && source('app/ads/for/[segment]/segment.module.css').includes('grid-template-columns: 1fr') && source('app/ads/for/[segment]/segment.module.css').includes(':focus-visible'))
check('watch link is not treated as MP4 and rejects foreign URLs', data.approvedSegmentExample('/v/approved-demo') === '/v/approved-demo' && data.approvedSegmentExample('https://evil.example/v/id') === null && data.approvedSegmentExample('javascript:alert(1)') === null && data.approvedSegmentExample('/v/id?private=1') === null)
const changed = offlineModules({ mocks: { 'lib/checkoutPricing.ts': { ...prices, getTierPrice: () => 2345 }, 'lib/ads/v2Tiers.ts': { ...v2tiers, adsV2Credits: () => 7 } } })
const changedHtml = renderToStaticMarkup(React.createElement(changed(pagePath).default, { params: { segment: 'restaurants' } }))
check('source changes propagate to rendered price and credits', changedHtml.includes(prices.formatCheckoutMoney('usd', 2345)) && changedHtml.includes('from 7 credits per'))
finish()
