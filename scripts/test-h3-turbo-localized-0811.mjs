import assert from 'node:assert/strict'
import { React, offlineModules, renderToStaticMarkup, source } from './gpt24h-offline-support.mjs'

const plain = ({ children }) => React.createElement('div', null, children)
const mocks = {
  'components/Footer.tsx': { __esModule: true, default: plain },
  'components/Kineo1RetiredNotice.tsx': { __esModule: true, default: () => React.createElement('p', null, 'LEGACY_TRIAL_NOTICE') },
  'components/WallMedia.tsx': { __esModule: true, default: plain },
  'app/youtube-shorts-from-topic/TopicGeneratorForm.tsx': { __esModule: true, default: props => React.createElement('form', { 'data-campaign': props.campaign, 'data-language': props.language }) },
  'lib/engineWall.ts': {
    getEngineRenders: async () => [],
    getHouseEngineExamples: () => [{ id: 'historical', title: 'Historical example', videoUrl: '/historical.mp4', posterUrl: '/historical.jpg', badge: 'SEEDANCE 1.5' }],
  },
}
const path = 'app/ai-video-generator/[engine]/[lang]/page.tsx'
const load = offlineModules({ mocks })
const page = load(path)
for (const lang of ['fr', 'de']) {
  const params = { engine: 'seedance', lang }
  const html = renderToStaticMarkup(await page.default({ params }))
  const metadata = page.generateMetadata({ params })
  assert.match(metadata.title, /MiniMax H3 Turbo/)
  assert.equal(metadata.alternates.canonical, `https://www.usekineo.com/ai-video-generator/seedance/${lang}`)
  assert.match(html, /<h1[^>]*>MiniMax H3 Turbo/)
  assert.ok(html.includes(`data-campaign="seo_engine_seedance_${lang}"`))
  assert.ok(html.includes(`data-language="${lang}"`))
  assert.match(html, />SEEDANCE 1\.5<\/span>/, 'Historical sample retains its original model badge')
  assert.doesNotMatch(html, /LEGACY_TRIAL_NOTICE|Seedance 1\.5 Pro \(ByteDance\)|temps médian mesuré|gemessener Median|\/month USD/)
  assert.match(html, /data-kineo="h3-turbo-cost"/)
  assert.match(html, /dateTime="2026-11-08"/i)
  const faq = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1])).find(item => item['@type'] === 'FAQPage')
  assert.equal(faq.mainEntity.length, 4)
  assert.ok(faq.mainEntity.some(item => item.acceptedAnswer.text.includes('Seedance 1.5 Pro')))
  assert.ok(faq.mainEntity.some(item => item.acceptedAnswer.text.includes('35')))
}
const it = renderToStaticMarkup(await page.default({ params: { engine: 'seedance', lang: 'it' } }))
assert.match(it, /<h1[^>]*>Seedance 1\.5/)
const launch = 'lib/engineLaunch.ts'
const rollback = offlineModules({ mocks, replacements: { [launch]: source(launch).replace('H3_TURBO_PUBLIC = true', 'H3_TURBO_PUBLIC = false') } })
assert.match(renderToStaticMarkup(await rollback(path).default({ params: { engine: 'seedance', lang: 'fr' } })), /<h1[^>]*>Seedance 1\.5/)
const stamp = load('lib/seo/paginasCitadas0511.ts').carimbaPaginasCitadas0511
const entries = ['seedance/fr', 'seedance/de', 'seedance/it'].map(slug => ({ url: `https://www.usekineo.com/ai-video-generator/${slug}`, lastModified: '2026-11-05T12:00:00.000Z' }))
const result = stamp(entries)
assert.equal(result[0].lastModified, '2026-11-08T12:00:00.000Z')
assert.equal(result[1].lastModified, '2026-11-08T12:00:00.000Z')
assert.equal(result[2].lastModified, entries[2].lastModified)
console.log('PASS localized H3 offer, metadata, FAQ, historical labels, cost table, campaign, rollback and selective sitemap. Offline only.')
