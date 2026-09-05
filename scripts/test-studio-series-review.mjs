// Local, no network: real href builders plus Studio URL reader/Generate bodies.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { loadLocal, roundTrip } from './diagnose-studio-continuation.mjs'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = path.resolve(import.meta.dirname, '..')
const { buildStudioSeriesReviewHref, isStudioSeriesReview, carryStudioSeriesReview } = loadLocal('lib/navigation/studioSeriesReview.ts')
const { buildSeriesContinuationHref } = loadLocal('lib/seriesContinuation.ts')
let checks = 0
function check(name, fn) { fn(); checks++; console.log('OK ' + name) }
const parse = (href) => new URL(href, 'https://example.invalid')
for (const source of ['studio_milestone', 'studio_video_tile']) {
  for (const topic of ['A submarine beneath the ice.', '¿Quién dejó la señal? Un misterio en Japón.', 'A ship & a signal = an unanswered question.']) {
    check(source + ' preserves canonical topic through review and Generate', () => {
      const legacy = parse(buildSeriesContinuationHref(topic, source))
      const url = parse(buildStudioSeriesReviewHref(topic, source))
      assert.equal(url.pathname, '/studio')
      assert.equal(url.searchParams.get('prompt'), legacy.searchParams.get('prompt'))
      for (const flag of ['autoanalyze', 'studio', 'create_intent', 'renderId', 'generationId']) assert.equal(url.searchParams.get(flag), null)
      const { arrived, output, reviewFocus } = roundTrip(url.pathname + url.search, { scriptMode: 'verbatim', duration: 90, engine: 'h3', preset: 'dolly', aspect: '1:1' })
      assert.equal(reviewFocus, 1)
      assert.equal(arrived.scriptMode, 'ai')
      assert.equal(arrived.duration, 35)
      assert.equal(arrived.engine, 'fast')
      assert.equal(arrived.preset, null)
      assert.equal(arrived.aspect, '9:16')
      assert.equal(output.get('prompt'), legacy.searchParams.get('prompt'))
      assert.equal(output.get('series'), '1')
      assert.equal(output.get('continuation_source'), source)
      assert.equal(output.get('duration'), '35')
      assert.equal(output.get('script_mode'), 'ai')
      assert.equal(output.get('intent_campaign'), 'studio_series_review_v1')
    })
  }
}
check('manual edits after arrival win', () => {
  const href = buildStudioSeriesReviewHref('A submarine beneath the ice.', 'studio_video_tile')
  const script = 'HOOK\n¿Quién llamó?\nPAYOFF\nEra el capitán.'
  const { output } = roundTrip(href, {}, { prompt: script, scriptMode: 'verbatim', duration: 90, engine: 'h3', aspect: '1:1' })
  assert.equal(output.get('prompt'), script)
  assert.equal(output.get('script_mode'), 'verbatim')
  assert.equal(output.get('duration'), '90')
  assert.equal(output.get('engine'), 'h3')
  assert.equal(output.get('aspect'), '1:1')
  assert.equal(output.get('series'), '1')
})
for (const topic of [null, undefined, '', '   ']) {
  check('empty topic falls back without phantom series: ' + String(topic), () => assert.equal(buildStudioSeriesReviewHref(topic, 'studio_milestone'), '/studio'))
}
for (const params of [new URLSearchParams(), new URLSearchParams('series=1&continuation_source=done_screen&prompt=Ready'), new URLSearchParams('studio_continuation=topic-v1&series=1&continuation_source=evil&prompt=Ready')]) {
  check('unrelated/authored/invalid links are not this adapter', () => {
    assert.equal(isStudioSeriesReview(params), false)
    const target = new URLSearchParams('prompt=untouched&duration=90&script_mode=verbatim')
    carryStudioSeriesReview(params, target)
    assert.equal(target.toString(), 'prompt=untouched&duration=90&script_mode=verbatim')
  })
}
check('both real JSX href callers execute the adapter', () => {
  const source = ts.createSourceFile('StudioClient.tsx', fs.readFileSync(path.join(root, 'app/(dashboard)/studio/StudioClient.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const calls = []
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(source) === 'href' && node.initializer && ts.isJsxExpression(node.initializer)) {
      const call = node.initializer.expression
      if (call && ts.isCallExpression(call) && call.expression.getText(source) === 'buildStudioSeriesReviewHref') calls.push(call)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.equal(calls.length, 2)
  for (const call of calls) {
    const expression = ts.transpileModule('const href = ' + call.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
    const video = { title: 'A submarine beneath the ice.' }
    const href = new Function('buildStudioSeriesReviewHref', 'myVids', 'v', expression + '\nreturn href;')(buildStudioSeriesReviewHref, [video], video)
    assert.equal(parse(href).pathname, '/studio')
    assert.equal(parse(href).searchParams.get('duration'), '35')
  }
})
check('35s preservation matches real compositor default option', () => {
  const text = fs.readFileSync(path.join(root, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
  const source = ts.createSourceFile('GenerateClient.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let first
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'DURATION_OPTIONS') first = node.initializer.elements[0].properties.find((p) => p.name.getText(source) === 'value').initializer.text
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.equal(parse(buildStudioSeriesReviewHref('A submarine beneath the ice.', 'studio_milestone')).searchParams.get('duration'), first)
})
console.log(checks + ' acceptance checks passed; browser, preview approval and deployment still pending.')
