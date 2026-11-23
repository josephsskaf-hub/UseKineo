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
// Controls follow the approved published version; bb260242a remains the historical VideoObject/CTA fixture.
const controls = offlineModules({ mocks, replacements: Object.fromEntries([pagePath, dataPath].map(path => [path, execFileSync('git', ['show', `b2c24e671:${path}`], { encoding: 'utf8' })])) })
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
const expectedQuestions = [
  'AI story video maker recurring character consistency?',
  'Can I start from my own story script?',
  'Will the same character look identical in every scene?',
  'Do the example films prove the current model?',
  'How long will my story take to generate?',
  'Which model creates the story scenes?',
  'How much does it cost?',
]
assert.equal(faq.mainEntity.length, 7)
assert.deepEqual(new Set(faq.mainEntity.map(item => item.name)), new Set(expectedQuestions), 'six original questions plus the approved buyer question')
const textOf = s => s.replace(/<[^>]+>/g,' ').replace(/&#(?:x([a-f\d]+)|(\d+));/ig,(_,h,d)=>String.fromCodePoint(parseInt(h||d,h?16:10))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()
const visible = textOf(html.replace(/<script[\s\S]*?<\/script>/g,''))
for (const item of faq.mainEntity) assert.ok(visible.includes(textOf(item.acceptedAnswer.text)), 'every structured answer is visible')
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
for (const slug of ['instagram-reels', 'urdu']) assert.equal(render(load, slug), render(controls, slug), `${slug} keeps its existing output`)
const launch = 'lib/engineLaunch.ts'
const rollback = offlineModules({ mocks, replacements: { [launch]: source(launch).replace('H3_TURBO_PUBLIC = true', 'H3_TURBO_PUBLIC = false') } })
assert.match(rollback(pagePath).generateMetadata({ params: { slug: 'story-videos' } }).description, /Seedance 1\.5/)
// The free-film fallback is a separate switch; verify the standard story offer, not that independent label.
const rolledStory = rollback('lib/growth/storyVideoPage.ts')
assert.doesNotMatch(rolledStory.STORY_VIDEO_COPY.intro, /H3 Turbo/)
assert.doesNotMatch(rolledStory.STORY_VIDEO_COPY.engineAnswer, /H3 Turbo/)
const rolledFaq = schemas(render(rollback, 'story-videos')).find(item => item['@type'] === 'FAQPage')
assert.match(rolledFaq.mainEntity.find(item => item.name === 'Which model creates the story scenes?').acceptedAnswer.text, /Seedance 1\.5/)
assert.doesNotMatch(rolledFaq.mainEntity.find(item => item.name === 'Which model creates the story scenes?').acceptedAnswer.text, /H3 Turbo/)
assert.ok(render(rollback, 'story-videos').includes(rollback('lib/freeFilmEngine.ts').FREE_FILM_ENGINE_NAME), 'free-film label follows its own policy')
assert.match(render(rollback, 'story-videos'), /Seedance 1\.5 cost per finished story/)
console.log('PASS story offer, cost, FAQ, historical schema, CTA attribution, unrelated pages and H3 rollback. Offline only.')
