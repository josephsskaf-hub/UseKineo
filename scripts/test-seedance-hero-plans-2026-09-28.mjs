import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { engineFixture } from './gpt24h-engine-fixture.mjs'
import { offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'
// KINEO-MOTORES-GEO-2026-10-06 — reancorado com motivo: os dois blocos novos e os 6 textos reescritos pela camada citável
// (TAREFA 12) são descontados dos DOIS lados pela normalização única; a hierarquia do hero e o resto da página seguem
// travados. O conteúdo novo é provado por scripts/test-motores-geo-2026-10-06.mjs.
import { semMotoresGeoHtml } from './test-support/motores-geo-2026-10-06.mjs'

// Actual server-page rendering, offline boundaries; no visits or analytics writes.
const path = 'app/ai-video-generator/[engine]/page.tsx'
const base = execFileSync('git', ['show', 'a94638f8:' + path], { encoding: 'utf8' })
const before = engineFixture({ [path]: base }), after = engineFixture()
const { ENGINE_SLUGS } = after('lib/growth/enginePageCatalog.ts')
const hero = html => html.match(/<section\b[\s\S]*?<\/section>/)?.[0]
let tested = 0
for (const engine of ENGINE_SLUGS) {
  const old = semMotoresGeoHtml(renderToStaticMarkup(await before(path).default({ params: { engine } })))
  const current = semMotoresGeoHtml(renderToStaticMarkup(await after(path).default({ params: { engine } })))
  //30/09: founder increased acquisition work; Veo adopts the same actions.
  // Its entire non-action content remains byte-locked, as do all other pages.
  if (engine !== 'seedance' && engine !== 'veo') assert.equal(current, old, engine + ': entire rendered page unchanged')
  else {
    assert.ok(hero(old) && hero(current), 'both heroes exist')
    assert.equal(current.replace(hero(current), ''), old.replace(hero(old), ''), 'all content outside hero unchanged')
    const actionRow = /<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:22px">[\s\S]*?<\/div>/
    assert.ok(actionRow.test(hero(old)) && actionRow.test(hero(current)))
    assert.equal(hero(current).replace(actionRow, ''), hero(old).replace(actionRow, ''), 'hero headings, budget, description and trial note unchanged')
    const links = [...hero(current).matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    const plan = links.findIndex(link => link[2] === 'See plans &amp; credits →')
    const account = links.findIndex(link => link[2] === 'Create your account')
    assert.ok(plan >= 0 && account === plan + 1, 'plans immediately precedes account')
    assert.equal(links[plan][1], '/pricing')
    const signup = `/signup?intent_campaign=seo_engine_${engine}&amp;redirect=%2Fstudio%3Fengine%3D${engine}%26intent_campaign%3Dseo_engine_${engine}`
    assert.equal(links[account][1], signup, 'original engine and intent survive signup')
    assert.ok(hero(old).includes('href="' + signup + '"'), 'signup destination existed in base')
    assert.match(links[plan][0], /background:#f5f5f7/)
    assert.match(links[account][0], /border:1px solid #48484a/)
  }
  tested++
}

// Execute real OrganicCtaLink click handlers, replacing only the network boundary.
const events = []
const local = offlineModules({ mocks: { 'lib/analytics.ts': { trackEvent: (...args) => events.push(args) } } })
const signupHref = local('lib/growth/engineLandingIntent.ts').buildEngineLandingSignupHref({ engine: 'seedance', campaign: 'seo_engine_seedance' })
const actions = local('components/SeedanceHeroActions.tsx').default({ signupHref, campaign: 'seo_engine_seedance' })
for (const action of actions.props.children) {
  const link = action.type(action.props)
  let prevented = false
  link.props.onClick({ preventDefault() { prevented = true } })
  assert.equal(prevented, false, 'native navigation is preserved')
  assert.ok(!link.props.href.includes('utm_'), 'no fabricated external acquisition')
}
assert.deepEqual(JSON.parse(JSON.stringify(events)), [
  ['organic_cta_clicked', { source: 'seo_engine_seedance', placement: 'hero', destination: '/pricing' }],
  ['organic_cta_clicked', { source: 'seo_engine_seedance', placement: 'hero_account', destination: '/signup' }],
])
console.log(`PASS: ${tested} actual engine pages; Seedance hero-only hierarchy, exact signup intent and two existing click events`)
