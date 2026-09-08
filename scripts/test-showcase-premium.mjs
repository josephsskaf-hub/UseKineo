// Executes production helpers and renders the actual React component offline.
// Browser interaction/focus/media playback remains a separate deployment gate.
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const requireNode = createRequire(import.meta.url)
let checks = 0, locale = 'en'
const ok = (value, label) => { assert.ok(value, label); checks++ }
const { hero, trending } = JSON.parse(execFileSync(process.execPath, ['scripts/test-home-curation.mjs', '--data'], { encoding: 'utf8' }))
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const exports = {}; cache.set(file, exports)
  const require = id => {
    if (id === 'react' || id === 'react/jsx-runtime') return requireNode(id)
    if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
    if (id === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => locale, UiLabel: ({ children }) => children }
    if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) }
    if (id === '@/lib/ui/showcaseGallery') return load('lib/ui/showcaseGallery.ts')
    if (id === '@/lib/ui/previewFacts') return load('lib/ui/previewFacts.ts')
    if (id === '@/lib/ui/heroFrame') return load('lib/ui/heroFrame.ts')
    if (id === './showcaseGallery') return load('lib/ui/showcaseGallery.ts')
    if (id === './heroOpening') return load('lib/ui/heroOpening.ts')
    throw Error('Unexpected dependency: ' + id)
  }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, require, console }, { filename: file })
  return exports
}
const policy = load('lib/ui/showcaseGallery.ts')
const facts = load('lib/ui/previewFacts.ts')
const validFacts = facts.decodedPreviewFacts(540, 960, 6.04)
ok(validFacts.resolution === '540 × 960' && validFacts.seconds === 6, 'metadata describes decoded preview, not advertised engine resolution')
for (const values of [[0,960,6],[540,0,6],[540,960,0],[-1,960,6],[540,960,-1],[Infinity,960,6],[540,960,Infinity],[NaN,960,6],[540,960,NaN],[540.5,960,6]]) {
  ok(facts.decodedPreviewFacts(...values) === null, 'invalid/unloaded metadata produces no claimed dimensions/duration')
}
for (const language of ['en','es','hi']) for (const key of Object.keys(facts.PREVIEW_FACTS_COPY.en)) {
  ok(Boolean(facts.PREVIEW_FACTS_COPY[language][key]), 'preview facts translation ' + language + '/' + key)
}
const Gallery = load('components/TrendingRow.tsx').default
const framePolicy = load('lib/ui/heroFrame.ts')
const EngineCard = load('components/EngineCycleCard.tsx').default
const opening = load('lib/ui/heroOpening.ts')
for (const [engine, id] of Object.entries(opening.HERO_OPENING)) {
  const source = hero.filter(v => v.engine === engine)
  const originalOrder = JSON.stringify(source)
  const ordered = opening.orderHeroVideos(source)
  ok(ordered[0].id === id, 'founder screenshot opens ' + engine)
  ok(JSON.stringify(source) === originalOrder, 'hero order does not mutate catalogue ' + engine)
  // Latest founder constraint: wide hero cannot show portrait fill/cropped faces.
  // Only Omni changes membership; portrait originals remain in trending/catalogue.
  // Founder 08/09: previews -h are now true crops; Omni presenters return to the wide hero.
  const eligible = source
  ok(JSON.stringify(ordered.slice(1)) === JSON.stringify(eligible.filter(v => v.id !== id)), 'eligible clips retain relative order ' + engine)
  ok(new Set(ordered.map(v => v.id)).size === eligible.length, 'no missing or duplicate eligible clip ' + engine)
  ok(fs.existsSync(path.join('public', framePolicy.heroFrame(ordered[0]).poster)), 'matching opening poster exists ' + engine)
}
ok(opening.orderHeroVideos([]).length === 0, 'empty hero stays empty')
ok(opening.heroOpeningPoster({id:'unknown',engine:'unknown'}) === undefined, 'unknown engine never gets invented poster')
for (const video of trending) {
  const frame = framePolicy.heroFrame(video)
  ok(frame.src === (video.previewUrl ?? video.videoUrl), 'actual source is the true wide crop for every engine ' + video.id)
  const html = renderToStaticMarkup(React.createElement(EngineCard, { videos: [video] }))
  // Founder correction: only the source changes; every engine keeps the same wide card.
  ok(html.includes('data-frame="wide"'), 'all actual cards share wide layout ' + video.id)
  ok(html.includes('data-frame'), 'card renders for ' + video.id)
}
const original = JSON.stringify(trending)
const engines = policy.showcaseEngines(trending)
ok(engines.reduce((sum, e) => sum + e.count, 0) === trending.length, 'counts reconcile to real curated examples')
ok(policy.filterShowcase(trending, 'all').length === trending.length, 'all retains every approved example')
ok(policy.filterShowcase(trending, 'missing').length === 0, 'unknown filter never leaks other engines')
for (const engine of engines) {
  const result = policy.filterShowcase(trending, engine.engine)
  ok(result.length === engine.count && result.every(v => v.engine === engine.engine), 'actual engine filter ' + engine.engine)
}
ok(JSON.stringify(trending) === original, 'filter/count do not mutate approved data')
for (const visible of [false, true]) for (const paused of [false, true])
  for (const limited of [false, true]) for (const failed of [false, true]) {
    ok(policy.shouldPlayShowcase(visible, paused, limited, failed) === (visible && !paused && !limited && !failed), 'all sixteen autoplay policy combinations')
  }
for (const [left, width, total, back, next] of [[0, 390, 2200, false, true], [1810, 390, 2200, true, false], [0, 390, 390, false, false], [100, 390, 2200, true, true], [-1, 390, 390, false, false]]) {
  const result = policy.showcaseScrollState(left, width, total)
  ok(result.back === back && result.next === next, 'scroll bounds including no-overflow')
}
ok(policy.showcasePoster({ id: 'future', posterUrl: '/fallback.webp' }) === '/fallback.webp', 'future examples use declared fallback')
ok(policy.showcasePoster({ id: 'future' }) === undefined, 'unknown poster never fabricates an asset')
for (const video of trending) {
  const poster = policy.showcasePoster(video)
  ok(poster.startsWith('/posters/showcase-sep07/'), 'versioned poster for ' + video.id)
  const file = path.join('public', poster)
  ok(fs.existsSync(file), 'poster exists')
  ok(fs.statSync(file).size > 500 && fs.statSync(file).size < 80000, 'poster byte budget')
  if (process.argv.includes('--media')) {
    const data = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', file], { encoding: 'utf8' }))
    ok(data.streams[0].width === 360 && data.streams[0].height === 640, 'portrait poster dimensions')
  }
}
for (locale of ['en', 'es', 'hi']) {
  const copy = policy.SHOWCASE_COPY[locale]
  for (const key of Object.keys(policy.SHOWCASE_COPY.en)) ok(typeof copy[key] === 'string' && copy[key].length > 0, locale + ' authored UI copy ' + key)
  const html = renderToStaticMarkup(React.createElement(Gallery, { videos: trending }))
  ok(html.includes(copy.filter), locale + ' real rendered filter')
  ok(html.includes(copy.preview), locale + ' real rendered preview control')
  ok((html.match(/<img /g) || []).length === trending.length, locale + ' SSR paints every poster')
  ok(!html.includes('<video'), locale + ' no video fetch before device policy and intersection')
  ok((html.match(/<option /g) || []).length === engines.length + 1, locale + ' actual options all engines')
  ok(html.includes('aria-controls=') && html.includes('aria-pressed='), locale + ' explicit control relationships')
  ok(!html.includes('/v/'), locale + ' no guessed public customer-video URL')
  ok(renderToStaticMarkup(React.createElement(Gallery, { videos: [] })) === '', locale + ' empty gallery remains hidden')
}
console.log('Showcase premium: ' + checks + ' checks passed. Offline helpers + actual React SSR; browser is a separate gate.')
