// Offline SSR regression checks: no renders, credentials, browser or network.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { offlineModules, React, renderToStaticMarkup, source, escapeHtml } from './gpt24h-offline-support.mjs'
import { moduleAt } from './gpt-5h-test-support.mjs'

globalThis.fetch = () => { throw new Error('Network forbidden in this test') }
const mocks = {
  'lib/kineoFacts.ts': await moduleAt('lib/kineoFacts.ts'),
  // Fixed unrelated taxonomy fixtures keep sitemap checks out of DB-backed modules.
  'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: ['space'] },
  'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: ['history', 'scary-stories'] },
  'components/Footer.tsx': { __esModule: true, default: () => null },
  'components/OrganicCtaLink.tsx': { __esModule: true, default: ({ children, source, placement, ...props }) => React.createElement('a', { ...props, 'data-source': source, 'data-placement': placement }, children) },
  'components/StickyFreeShortCTA.tsx': { __esModule: true, default: ({ href, label, cta }) => React.createElement('aside', null, label, React.createElement('a', { href }, cta)) },
}
const pagePath = 'app/alternatives/[competitor]/page.tsx'
const base = '10407b89a43bb2a5800ce5c706a88be34cd9484b'
const previous = path => execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' })
const beforeSources = Object.fromEntries([pagePath, 'components/H3TurboDetails.tsx', 'app/sitemap.ts'].map(path => [path, previous(path)]))
const load = offlineModules({ mocks })
const before = offlineModules({ mocks, replacements: beforeSources })
const render = (loader, competitor) => renderToStaticMarkup(React.createElement(loader(pagePath).default, { params: { competitor } }))
const html = render(load, 'runwayml')
const oldHtml = render(before, 'runwayml')
const faq = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
assert.equal(faq['@type'], 'FAQPage')
assert.equal(faq.mainEntity.length, 5)
for (const entry of faq.mainEntity) {
  assert.ok(html.includes(entry.name), `Visible question: ${entry.name}`)
  const escaped = escapeHtml(entry.acceptedAnswer.text)
  assert.ok(html.includes(escaped), `Visible answer agrees with schema: ${entry.name}`)
}
assert.match(oldHtml, /measured median of 5\.9 minutes/)
assert.match(oldHtml, /Not on its own/)
assert.doesNotMatch(html, /measured median|in a few minutes|Not on its own|Clips only|Stock \+ AI|strongest Runway|Start free|free — keep it/)
for (const text of ['MiniMax H3 Turbo', 'Seedance 1.5 Pro remains a text-to-video fallback', 'Stitch and Add Audio', 'Generate Speech', 'Completion time varies', 'November 10, 2026']) assert.ok(html.includes(text), text)
const sources = load('lib/growth/runwayAlternativePage.ts').RUNWAY_SOURCES
for (const entry of sources) assert.ok(html.includes(`href="${entry.href}"`), entry.label)
const pricing = load('lib/marketingPrice.ts')
assert.ok(html.includes(`${pricing.creditsPerReferenceVideo('cinematic_ai')} credits for 60 seconds`))
assert.ok(html.includes(`${pricing.STARTER_MONTH} for ${pricing.STARTER_CREDITS} monthly credits`))
assert.equal((html.match(/<table /g) ?? []).length, 2)
const links = text => [...text.matchAll(/href="([^"]+)"/g)].map(m => m[1].replaceAll('&amp;', '&')).filter(url => url.startsWith('/signup?'))
assert.equal(links(html).length, 3, 'Hero, final and sticky carry the same signup destination')
for (const href of links(html)) {
  const signup = new URL(href, 'https://www.usekineo.com')
  const studio = new URL(signup.searchParams.get('redirect'), signup)
  assert.equal(signup.searchParams.get('intent_campaign'), 'push22_alternative_runwayml')
  assert.equal(studio.pathname, '/studio')
  assert.equal(studio.searchParams.get('engine'), 'seedance')
  assert.equal(studio.searchParams.get('intent_campaign'), 'push22_alternative_runwayml')
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'create_intent', 'prompt']) assert.equal(signup.searchParams.get(key), null, `${key} is not invented by the internal CTA`)
}
const metadata = load(pagePath).generateMetadata({ params: { competitor: 'runwayml' } })
assert.match(metadata.description, /MiniMax H3 Turbo/)
assert.equal(metadata.alternates.canonical, 'https://www.usekineo.com/alternatives/runwayml')
for (const competitor of load(pagePath).COMPETITOR_SLUGS.filter(slug => slug !== 'runwayml')) {
  assert.equal(render(load, competitor), render(before, competitor), `${competitor}: unchanged rendered output`)
  assert.deepEqual(JSON.parse(JSON.stringify(load(pagePath).generateMetadata({ params: { competitor } }))), JSON.parse(JSON.stringify(before(pagePath).generateMetadata({ params: { competitor } }))), `${competitor}: unchanged metadata`)
}
const launch = 'lib/engineLaunch.ts'
const rollback = offlineModules({ mocks, replacements: { [launch]: source(launch).replace('H3_TURBO_PUBLIC = true', 'H3_TURBO_PUBLIC = false') } })
assert.doesNotMatch(render(rollback, 'runwayml'), /H3 Turbo/)
assert.match(render(rollback, 'runwayml'), /Seedance 1\.5 cost per finished Kineo film/)
assert.match(rollback(pagePath).generateMetadata({ params: { competitor: 'runwayml' } }).description, /Seedance 1\.5/)
const sitemap = load('app/sitemap.ts').default()
const runwayEntries = sitemap.filter(item => item.url === metadata.alternates.canonical)
assert.equal(runwayEntries.length, 1)
assert.equal(new Date(runwayEntries[0].lastModified).toISOString(), '2026-11-10T12:00:00.000Z')
// KINEO-PAGINAS-CITAVEIS-1011 — a mudança seguinte do mapa (página do Recreate nova + data do /ai-ugc-ads e do par PT) é selada
// por scripts/test-paginas-citaveis-1011.mjs; aqui ela sai da comparação com a base fixa, como a do Runway.
const CITAVEIS_1011 = ['/ai-face-swap-video', '/ai-ugc-ads', '/anuncios-ugc-com-ia'].map(p => `https://www.usekineo.com${p}`)
const withoutRunway = entries => JSON.parse(JSON.stringify(entries.filter(item => item.url !== metadata.alternates.canonical && !CITAVEIS_1011.includes(item.url))))
assert.deepEqual(withoutRunway(sitemap), withoutRunway(before('app/sitemap.ts').default()), 'Other sitemap URLs and dates stay unchanged under identical unrelated-taxonomy fixtures')
console.log('PASS Runway comparison, derived costs, matching FAQ, attribution, H3 rollback, every other alternative and sitemap. Offline only.')
