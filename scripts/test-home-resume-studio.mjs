// Offline: real ResumeStrip component + existing Studio AST round trip.
// Hooks/Link/analytics are simulated. No browser, network or production data.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { loadLocal, roundTrip } from './diagnose-studio-continuation.mjs'
const root = path.resolve(import.meta.dirname, '..')
const file = 'components/ResumeStrip.tsx'
const series = loadLocal('lib/seriesContinuation.ts')
const adapter = loadLocal('lib/navigation/studioSeriesReview.ts')
function component(source, events) {
  const box = { exports: {} }
  const deps = {
    react: { ...React, useEffect: () => {}, useRef: (current) => ({ current }) },
    'react/jsx-runtime': jsx,
    'next/link': ({ prefetch, ...props }) => React.createElement('a', props),
    '@/lib/analytics': { trackEvent: (...args) => events.push(args) },
    '@/lib/seriesContinuation': series,
    '@/lib/navigation/studioSeriesReview': adapter,
  }
  const js = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  vm.runInNewContext(js, { module: box, exports: box.exports, require: (id) => {
    if (!(id in deps)) throw new Error('Unexpected dependency: ' + id)
    return deps[id]
  } }, { filename: file })
  return box.exports.default
}
function descendants(node, out = []) {
  if (React.isValidElement(node)) { out.push(node); React.Children.forEach(node.props.children, (child) => descendants(child, out)) }
  return out
}
const events = []
const source = fs.readFileSync(path.join(root, file), 'utf8')
const Resume = component(source, events)
let checks = 0
const check = (label, fn) => { fn(); checks++; if (!process.argv.includes('--preview')) console.log('OK ' + label) }
for (const title of ['The signal beneath the ice', '¿Quién llamó? 日本 & "señal"', '<script>alert(1)</script> The ship']) {
  check('real home link preserves topic and attribution: ' + title, () => {
    const tree = Resume({ title, episode: 343, videoId: 'fixture-only' })
    const links = descendants(tree).filter((node) => typeof node.props.href === 'string')
    assert.equal(links.length, 1)
    const url = new URL(links[0].props.href, 'https://example.invalid')
    assert.equal(url.pathname, '/studio')
    assert.equal(url.searchParams.get('continuation_source'), 'landing_resume_strip')
    assert.equal(url.searchParams.get('autoanalyze'), null)
    assert.equal(links[0].props.prefetch, false)
    const legacy = new URL(series.buildSeriesContinuationHref(title, 'landing_resume_strip'), 'https://example.invalid')
    assert.equal(url.searchParams.get('prompt'), legacy.searchParams.get('prompt'))
    const { arrived, output } = roundTrip(url.pathname + url.search, { engine: 'h3', duration: 90, scriptMode: 'verbatim' })
    assert.equal(arrived.duration, 35)
    assert.equal(arrived.engine, 'fast')
    assert.equal(arrived.scriptMode, 'ai')
    assert.equal(output.get('prompt'), legacy.searchParams.get('prompt'))
    assert.equal(output.get('continuation_source'), 'landing_resume_strip')
    const html = renderToStaticMarkup(tree)
    assert.ok(html.includes('Continue this story'))
    assert.ok(!html.includes('Make episode 343'))
    assert.ok(!html.includes('<script>'))
    assert.equal(events.length, 0, 'SSR/mount simulation does not imply a click')
    links[0].props.onClick()
    assert.equal(events.length, 1)
    assert.equal(events[0][0], 'resume_strip_clicked')
    assert.equal(events[0][1].video_id, 'fixture-only')
    assert.equal(events[0][1].episode, 343, 'legacy analytics value is not silently redefined')
    events.length = 0
  })
}
for (const title of ['', '   ', null, undefined]) check('empty title remains hidden: ' + title, () => assert.equal(Resume({ title, episode: 2 }), null))
check('manual review overrides survive home entry', () => {
  const href = adapter.buildStudioSeriesReviewHref('The signal beneath the ice', 'landing_resume_strip')
  const { output } = roundTrip(href, {}, { prompt: 'My own exact script.', scriptMode: 'verbatim', duration: 90, engine: 'h3' })
  assert.equal(output.get('prompt'), 'My own exact script.')
  assert.equal(output.get('script_mode'), 'verbatim')
  assert.equal(output.get('duration'), '90')
  assert.equal(output.get('engine'), 'h3')
})
for (const episode of [NaN, -1, 1, 2, 343]) check('CTA makes no ordinal claim for ' + episode, () => {
  const html = renderToStaticMarkup(Resume({ title: 'The signal beneath the ice', episode }))
  assert.ok(html.includes('Continue this story'))
  assert.ok(!html.includes('Make episode'))
})
if (process.argv.includes('--preview')) {
  const before = execFileSync('git', ['show', '2ca9a06c4f128f936468b117ba0a7f194cff2411:' + file], { cwd: root, encoding: 'utf8' })
  const props = { title: 'The signal beneath the ice', episode: 343, videoId: 'fixture-only' }
  console.log(JSON.stringify({ before: renderToStaticMarkup(component(before, [])(props)), after: renderToStaticMarkup(Resume(props)), checks }))
} else console.log(checks + ' home resume checks passed; browser and visual approval still pending.')
