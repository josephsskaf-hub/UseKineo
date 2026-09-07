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
const { trending } = JSON.parse(execFileSync(process.execPath, ['scripts/test-home-curation.mjs', '--data'], { encoding: 'utf8' }))
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const exports = {}; cache.set(file, exports)
  const require = id => {
    if (id === 'react' || id === 'react/jsx-runtime') return requireNode(id)
    if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
    if (id === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => locale }
    if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) }
    if (id === '@/lib/ui/showcaseGallery') return load('lib/ui/showcaseGallery.ts')
    throw Error('Unexpected dependency: ' + id)
  }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, require, console }, { filename: file })
  return exports
}
const policy = load('lib/ui/showcaseGallery.ts')
const Gallery = load('components/TrendingRow.tsx').default
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
