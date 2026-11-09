import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { offlineModules, React, renderToStaticMarkup, source } from './gpt24h-offline-support.mjs'

const plain = ({ children }) => React.createElement('div', null, children)
const mocks = {
  'components/Footer.tsx': { __esModule: true, default: plain },
  'components/OrganicCtaLink.tsx': { __esModule: true, default: ({ children, source, placement, ...props }) => React.createElement('a', { ...props, 'data-source': source, 'data-placement': placement }, children) },
  'components/seo/PaginaClara.tsx': { PaginaClaraTopo: plain, PaginaClaraCards: plain, PaginaClaraVitrine: plain },
}
const pagePath = 'app/ai-video-generator/for/[slug]/page.tsx'
const dataPath = 'lib/seo/intentPages.ts'
const beforeSources = Object.fromEntries([pagePath, dataPath].map(path => [path, execFileSync('git', ['show', `bb260242a:${path}`], { encoding: 'utf8' })]))
const load = offlineModules({ mocks })
const before = offlineModules({ mocks, replacements: beforeSources })
const render = (loader, slug) => renderToStaticMarkup(React.createElement(loader(pagePath).default, { params: { slug } }))
const html = render(load, 'story-videos')
const oldHtml = render(before, 'story-videos')
const schemas = text => [...text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
const videos = text => schemas(text).filter(Array.isArray)
assert.deepEqual(videos(html), videos(oldHtml), 'Historical VideoObjects retain their actual engine attribution')
assert.match(html, /MiniMax H3 Turbo/)
assert.match(html, /Character identity, faces, hands and small details can vary/)
assert.match(html, /Seedance 1\.5 Pro remains a text-to-video fallback/)
assert.doesNotMatch(html, /Make this film free|A written next episode|same character in every scene/)
assert.equal((html.match(/Prepare this story/g) ?? []).length, 2)
assert.match(html, /dateTime="2026-11-09"/i)
const faq = schemas(html).find(item => item['@type'] === 'FAQPage')
assert.equal(faq.mainEntity.length, 6)
for (const item of faq.mainEntity) assert.ok(html.includes(item.name), `Visible FAQ matches schema: ${item.name}`)
const cost = load('lib/marketingPrice.ts').creditsPerReferenceVideo('cinematic_ai')
assert.ok(faq.mainEntity.some(item => item.acceptedAnswer.text.includes(`${cost} credits`)))
const links = text => [...text.matchAll(/href="([^\"]+)"/g)].map(match => match[1].replaceAll('&amp;', '&')).filter(href => href.startsWith('/signup?'))
assert.deepEqual(links(html), links(oldHtml), 'Existing signup handoff destinations stay intact')
const signup = new URL(links(html)[0], 'https://www.usekineo.com')
const studio = new URL(signup.searchParams.get('redirect'), 'https://www.usekineo.com')
assert.equal(studio.searchParams.get('engine'), 'seedance')
assert.equal(studio.searchParams.get('intent_campaign'), 'intent_story-videos')
assert.equal(signup.searchParams.get('utm_source'), null)
const metadata = load(pagePath).generateMetadata({ params: { slug: 'story-videos' } })
assert.equal(metadata.alternates.canonical, 'https://www.usekineo.com/ai-video-generator/for/story-videos')
assert.match(metadata.description, /MiniMax H3 Turbo/)
for (const slug of ['instagram-reels', 'urdu']) assert.equal(render(load, slug), render(before, slug), `${slug} keeps its existing output`)
const launch = 'lib/engineLaunch.ts'
const rollback = offlineModules({ mocks, replacements: { [launch]: source(launch).replace('H3_TURBO_PUBLIC = true', 'H3_TURBO_PUBLIC = false') } })
assert.match(rollback(pagePath).generateMetadata({ params: { slug: 'story-videos' } }).description, /Seedance 1\.5/)
assert.doesNotMatch(render(rollback, 'story-videos'), /H3 Turbo/)
assert.match(render(rollback, 'story-videos'), /Seedance 1\.5 cost per finished story/)
console.log('PASS story offer, cost, FAQ, historical schema, CTA attribution, unrelated pages and H3 rollback. Offline only.')
