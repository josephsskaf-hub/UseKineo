import assert from 'node:assert/strict'
import { React, offlineModules, renderToStaticMarkup, source } from './gpt24h-offline-support.mjs'

// Client boundaries are inert. The real page, metadata, cost table and FAQ execute offline.
const plain = ({ children }) => React.createElement('div', null, children)
const mocks = Object.fromEntries(['Footer', 'AgencyVolumeBridge', 'StickyFreeShortCTA', 'Kineo1RetiredNotice', 'ScriptToSeedanceBridge', 'BuyCreatorCta'].map(name => [`components/${name}.tsx`, { __esModule: true, default: plain }]))
mocks['components/OrganicCtaLink.tsx'] = { __esModule: true, default: ({ children, source, placement, ...props }) => React.createElement('a', props, children) }
mocks['app/youtube-shorts-from-topic/TopicGeneratorForm.tsx'] = { __esModule: true, default: plain }
mocks['components/seo/PaginaClara.tsx'] = { PaginaClaraCards: plain, PaginaClaraTopo: plain, PaginaClaraVitrine: plain }

const path = 'app/ai-video-generator/[engine]/page.tsx'
const load = offlineModules({ mocks })
const page = load(path)
const html = renderToStaticMarkup(await page.default({ params: { engine: 'seedance' } }))
const metadata = await page.generateMetadata({ params: { engine: 'seedance' } })
assert.equal(metadata.alternates.canonical, 'https://www.usekineo.com/ai-video-generator/seedance')
assert.match(metadata.title, /MiniMax H3 Turbo/)
assert.match(html, /<h1[^>]*>MiniMax H3 Turbo/)
assert.match(html, /text-to-video fallback/)
assert.doesNotMatch(html, /Kineo uses Seedance 1\.5 Pro to build narrated films|60 s requested; Seedance|Seedance 1\.5: formats|3–7 minutes/)
assert.match(html, /intent_campaign=seo_engine_seedance/)
assert.match(html, /engine=seedance/)
const schema = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
const faq = schema.find(item => item['@type'] === 'FAQPage')
assert.ok(faq.mainEntity.some(item => item.acceptedAnswer.text.includes('A film can contain scenes from the fallback')))
assert.ok(faq.mainEntity.some(item => item.acceptedAnswer.text.includes('does not guarantee lip-synced dialogue')))
const pricing = load('lib/checkoutPricing.ts')
const { creditCostForDuration } = load('lib/credits/engineCost.ts')
for (const seconds of [15, 35, 60, 90]) {
  const credits = creditCostForDuration('cinematic_ai', true, seconds)
  assert.ok(html.includes(`${seconds} seconds</td><td style="padding:12px">${credits}</td>`))
  assert.ok(html.includes(pricing.formatCheckoutMoney('usd', Math.round(credits * pricing.TIER_PRICES.starter.usd / pricing.TIER_CREDITS.starter))))
}
const { buyCreatorCopy } = load('lib/growth/buyCreatorOffer.ts')
for (const language of ['en', 'pt', 'es']) assert.doesNotMatch(buyCreatorCopy(language).note, /cancel anytime|cancele quando|cancela cuando/i)
const { carimbaPaginasCitadas0511 } = load('lib/seo/paginasCitadas0511.ts')
const stamped = carimbaPaginasCitadas0511([
  { url: metadata.alternates.canonical, lastModified: '2026-11-05T12:00:00.000Z' },
  { url: 'https://www.usekineo.com/', lastModified: '2026-11-05T12:00:00.000Z' },
])
assert.equal(stamped[0].lastModified, '2026-11-07T12:00:00.000Z')
assert.equal(stamped[1].lastModified, '2026-11-05T12:00:00.000Z')
assert.equal(load('lib/growth/enginePageCatalog.ts').ENGINES.seedance.name, 'Seedance 1.5', 'Historical gallery catalog keeps its model label')

const launchPath = 'lib/engineLaunch.ts'
const rollback = offlineModules({ mocks, replacements: { [launchPath]: source(launchPath).replace('H3_TURBO_PUBLIC = true', 'H3_TURBO_PUBLIC = false') } })
const oldHtml = renderToStaticMarkup(await rollback(path).default({ params: { engine: 'seedance' } }))
assert.match(oldHtml, /<h1[^>]*>Seedance 1\.5/)
assert.doesNotMatch(oldHtml, /data-kineo="h3-turbo-cost"/)
assert.match((await page.generateMetadata({ params: { engine: 'minimax-h3' } })).title, /MiniMax H3 AI/)
console.log('PASS H3 Turbo page, canonical attribution, real costs, fallback FAQ, purchase notes and switch rollback. No network or rendering provider.')
