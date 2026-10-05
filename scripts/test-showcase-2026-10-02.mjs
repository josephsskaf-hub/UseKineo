import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript')
const read = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')
function load(file, overrides = {}) {
  const mod = { exports: {} }
  const src = overrides[file] ?? read(file)
  const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  new Function('exports', 'require', 'module', js)(mod.exports, id => {
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts', overrides)
    throw Error('External import forbidden: ' + id)
  }, mod)
  return mod.exports
}
let count = 0
function check(name, fn) { fn(); count++; console.log('PASS ' + name) }
function mutate(file, from, to, checkFn) {
  const src = read(file)
  assert.ok(src.includes(from), 'Mutation must actually apply')
  assert.throws(() => checkFn({ [file]: src.replace(from, to) }), 'Mutant must turn the SAME assertion red')
}
function catalog(overrides = {}) {
  const data = load('lib/showcase.ts', overrides)
  const approved = load('lib/publicExamples.ts')
  const names = { cinematic_ai: 'Seedance 1.5', cinematic_kling: 'Kling 2.5', cinematic_veo: 'Veo 3.1', cinematic_hollywood: 'Kling 3', cinematic_h3: 'MiniMax H3' }
  assert.equal(data.SHOWCASE_FILMS.length, 6)
  for (const item of data.SHOWCASE_FILMS) {
    const source = [...approved.ENGINE_PAGE_LEAD, ...approved.FOUNDER_SHOWCASE].find(x => x.id === item.id)
    assert.ok(source)
    assert.equal(item.video, source.previewPath)
    assert.equal(item.poster, source.posterPath)
    assert.equal(item.badge, names[source.engine])
  }
  for (const [section, items] of Object.entries(data.SHOWCASE_MEDIA)) {
    assert.equal(items.length, section === 'films' ? 6 : 3)
    for (const [i, item] of items.entries()) {
      for (const value of [item.video, item.poster, item.before, item.after].filter(Boolean)) {
        assert.match(value, /^\/(previews|posters)\/[\w/.-]+\.(mp4|webp)$/)
        assert.ok(fs.existsSync(path.join(root, 'public', value)))
      }
      if (section !== 'films') assert.equal(item.badge, section === 'ads' ? 'Nano Banana Pro + Kling 2.5' : 'Nano Banana Pro')
      if (section === 'spaces') {
        assert.equal(item.before, `/posters/spaces-demo-${i + 1}-antes.webp`)
        assert.equal(item.after, `/posters/spaces-demo-${i + 1}-depois.webp`)
      }
      if (item.video) assert.ok(fs.statSync(path.join(root, 'public', item.video)).size < 15_000_000, 'preview only')
    }
  }
  assert.deepEqual(data.SHOWCASE_DESTINATIONS, { films: '/studio', images: '/images', spaces: '/spaces', ads: '/ads' })
}
function copy(overrides = {}) {
  const { SHOWCASE_COPY: table, SHOWCASE_CAPTIONS: captions } = load('lib/showcaseCopy.ts', overrides)
  const { INTERFACE_LANGUAGE_OPTIONS: options } = load('lib/ui/interfaceLanguage.ts')
  assert.equal(Object.keys(table).length, options.length)
  for (const { code } of options) {
    assert.deepEqual(Object.keys(table[code]), Object.keys(table.en))
    assert.ok(Object.values(table[code]).every(x => typeof x === 'string' && x.trim()))
    for (const key of ['headline', 'start', 'filmsDesc', 'reveal']) if (code !== 'en') assert.notEqual(table[code][key], table.en[key])
    for (const list of Object.values(captions)) for (const key of list) assert.ok(table[code][key])
  }
  assert.equal(table.en.headline, 'Everything here was made on Kineo — from one sentence or a few photos')
}
function playback(overrides = {}) {
  const { shouldPlayShowcasePreview: play } = load('lib/showcasePlayback.ts', overrides)
  const base = { visible: true, documentVisible: true, reducedMotion: false, saveData: false, intent: 'auto' }
  assert.equal(play(base), true)
  for (const patch of [{ visible: false }, { documentVisible: false }, { reducedMotion: true }, { saveData: true }, { intent: 'pause' }]) assert.equal(play({ ...base, ...patch }), false)
  assert.equal(play({ ...base, reducedMotion: true, intent: 'play' }), true)
  assert.equal(play({ ...base, visible: false, intent: 'play' }), false)
}
function wiring(overrides = {}) {
  const get = p => overrides[p] ?? read(p)
  const client = get('app/showcase/ShowcaseClient.tsx'), media = get('components/showcase/ShowcaseMedia.tsx')
  assert.ok(client.includes('<ProductStageStyles />') && client.includes('PRODUCT_TINT'))
  assert.ok(client.includes('<ShowcaseTelemetry />'))
  assert.ok(client.includes('href="/signup"') && client.includes('href="/pricing"') && client.includes('SHOWCASE_DESTINATIONS[section]'))
  assert.ok(client.includes('aria-pressed={selected === i}') && client.includes('onClick={() => setSelected(i)}'))
  assert.ok(media.includes('src={play ? item.video : undefined}') && media.includes('preload="none"'))
  assert.ok(media.includes('new IntersectionObserver') && media.includes("document.addEventListener('visibilitychange'"))
  assert.ok(media.includes('element.pause()') && media.includes('observer.disconnect()'))
  assert.ok(media.includes('type="range"') && media.includes('copy.reveal'))
  assert.ok(get('app/showcase/showcase.css').includes('prefers-reduced-motion:reduce'))
  assert.ok(get('components/Footer.tsx').includes("...(SHOWCASE_PUBLIC ? [{ href: '/showcase'"))
  assert.ok(get('app/showcase/page.tsx').includes('if (!SHOWCASE_PUBLIC) notFound()'))
  assert.ok(get('app/showcase/page.tsx').includes("canonical: 'https://www.usekineo.com/showcase'"))
  assert.ok(get('app/showcase/page.tsx').includes('/showcase-og.jpg'))
  assert.ok(fs.statSync(path.join(root, 'public/showcase-og.jpg')).size > 10_000)
}
function telemetry(overrides = {}) {
  const data = load('lib/showcaseTelemetry.ts', overrides)
  const latch = data.createShowcaseLatch()
  assert.equal(latch('v1:actor:impression'), true)
  assert.equal(latch('v1:actor:impression'), false)
  assert.equal(latch('v1:actor:gesture'), true)
  assert.equal(latch('v2:actor:impression'), true)
  assert.equal(data.showcaseAction('signup'), 'signup')
  for (const x of ['email@private.com', '/arbitrary', undefined, 'https://evil.test']) assert.equal(data.showcaseAction(x), null)
  assert.equal(data.SHOWCASE_VERSION, 'showcase_v1')
  assert.equal(data.SHOWCASE_DISCOVERY_VERSION, 'showcase_sitemap_20261001_v1')
  const src = overrides['components/showcase/ShowcaseTelemetry.tsx'] ?? read('components/showcase/ShowcaseTelemetry.tsx')
  for (const fragment of ['if (!SHOWCASE_TELEMETRY_ENABLED) return', 'showcase_version: SHOWCASE_VERSION', 'showcase_browser: actor', 'rememberSignupCampaign(SHOWCASE_CAMPAIGN)', "if (result === 'stored')", 'event.isTrusted', 'trackClosedEvent']) assert.ok(src.includes(fragment), fragment)
  assert.ok(!/utm_source=|user_id:|email:/.test(src))
  assert.ok(src.includes('showcase_discovery_version: SHOWCASE_DISCOVERY_VERSION'))
}
function discovery(overrides = {}) {
  const src = overrides['app/sitemap.ts'] ?? read('app/sitemap.ts')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  // Execute the actual sitemap with inert catalog fixtures: no Next server or network.
  const run = enabled => {
    const mod = { exports: {} }
    const fixtures = {
      SHOWCASE_PUBLIC: enabled, AVATAR_PUBLIC: false, CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false,
      NICHE_SLUGS: [], COMPETITOR_SLUGS: [], PUBLIC_EXAMPLES: [], CANONICAL_SLUGS: [],
      SCRIPT_VERTICAL_SLUGS: [], ENGINE_SLUGS: [], INTENT_SLUGS: [],
      INTENT_HUB_PATH: '/ai-video-generator/for', intentPagePath: s => `/ai-video-generator/for/${s}`,
      CITATION_ANSWER_LINKS: [], CITATION_REVIEW_DATE: '2026-09-01', FREE_SHORTS_LANGS: [],
      LOCALIZED_ENGINE_SLUGS: [], ENGINE_LANG_CODES: [], adsPassLive: () => false,
      ADS_SEGMENT_SLUGS: [], ADS_SEGMENTS_UPDATED: '2026-09-01', ADS_COMPARISONS: [],
      adsSegmentPath: s => `/ads/${s}`, adsComparisonPath: s => `/ads/compare/${s}`,
      // New independent cluster; its real entries are exercised by test-clips-effect-pages-2026-10-06.
      effectSitemapEntries: () => [{ url: 'https://www.usekineo.com/effects/melt' }],
    }
    new Function('exports', 'require', 'module', js)(mod.exports, () => fixtures, mod)
    return mod.exports.default()
  }
  const on = run(true), off = run(false), url = 'https://www.usekineo.com/showcase'
  const entry = on.filter(item => item.url === url)
  assert.equal(entry.length, 1, 'Public showcase must have one canonical discovery entry')
  assert.equal(entry[0].lastModified.toISOString(), '2026-10-01T00:00:00.000Z')
  assert.equal(off.some(item => item.url === url), false, 'Disabled page must leave the sitemap')
  assert.deepEqual(on.filter(item => item.url !== url), off, 'Showcase switch must not alter other routes')
}
check('approved assets, honest badges, local previews and product destinations', () => catalog())
check('all authored copy in the 16 site languages', () => copy())
check('visibility, background tab, reduced motion, data saving and pause', () => playback())
check('public page, stage, interactions, footer, switch and metadata wired', () => wiring())
check('versioned deduplication, bounded payload and acquisition preserved', () => telemetry())
check('M1 wrong engine badge turns red', () => mutate('lib/showcase.ts', "cinematic_ai: 'Seedance 1.5'", "cinematic_ai: 'Kling 3'", catalog))
check('M2 unknown/customer asset turns red', () => mutate('lib/showcase.ts', '90bd8367-60c6-4811-8fdd-3a5b0200eec6', 'private-customer', catalog))
check('M3 master instead of preview turns red', () => mutate('lib/showcase.ts', 'video: example.previewPath', "video: 'https://storage.test/master.mp4'", catalog))
check('M4 missing locale turns red', () => mutate('lib/showcaseCopy.ts', "  pt: 'Portfólio|", "  xx: 'Portfólio|", copy))
check('M5 offscreen playback turns red', () => mutate('lib/showcasePlayback.ts', 'state.visible && ', '', playback))
check('M6 hidden tab playback turns red', () => mutate('lib/showcasePlayback.ts', 'state.documentVisible && ', '', playback))
check('M7 eager video source turns red', () => mutate('components/showcase/ShowcaseMedia.tsx', 'src={play ? item.video : undefined}', 'src={item.video}', wiring))
check('M8 footer missing turns red', () => mutate('components/Footer.tsx', "href: '/showcase'", "href: '/examples'", wiring))
check('M9 kill switch disconnected turns red', () => mutate('app/showcase/page.tsx', 'if (!SHOWCASE_PUBLIC) notFound()', '', wiring))
check('M10 duplicate first gesture turns red', () => mutate('lib/showcaseTelemetry.ts', 'if (sent.has(key)) return false;', '', telemetry))
check('M11 unversioned cohort turns red', () => mutate('components/showcase/ShowcaseTelemetry.tsx', 'showcase_version: SHOWCASE_VERSION', "release_time: 'today'", telemetry))
check('M12 false acknowledgement turns red', () => mutate('components/showcase/ShowcaseTelemetry.tsx', "if (result === 'stored')", 'if (result)', telemetry))
check('sitemap discovers the public portfolio and removes it when disabled', () => discovery())
check('M13 missing sitemap entry turns red', () => mutate('app/sitemap.ts', 'url: `${BASE}/showcase`', 'url: `${BASE}/missing-showcase`', discovery))
check('M14 sitemap ignores kill switch turns red', () => mutate('app/sitemap.ts', '...(SHOWCASE_PUBLIC ? [{', '...(true ? [{', discovery))
check('M15 wrong canonical host turns red', () => mutate('app/sitemap.ts', 'url: `${BASE}/showcase`', "url: 'https://usekineo.com/showcase'", discovery))
check('M16 stale portfolio review date turns red', () => mutate('app/sitemap.ts', "new Date('2026-10-01T00:00:00.000Z')", "new Date('2026-07-01T00:00:00.000Z')", discovery))
check('M17 discovery marker missing turns red', () => mutate('components/showcase/ShowcaseTelemetry.tsx', 'showcase_discovery_version: SHOWCASE_DISCOVERY_VERSION,', '', telemetry))
console.log(`${count} checks passed, including 17 live mutations. Offline: no keys, database or renders.`)
