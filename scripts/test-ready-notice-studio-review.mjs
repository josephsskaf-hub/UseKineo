// Offline: real notification handler + both JSX buttons + Studio contract.
// Does not mount/poll the notification, execute providers or access storage.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { loadLocal, roundTrip } from './diagnose-studio-continuation.mjs'
const root = path.resolve(import.meta.dirname, '..'), file = 'components/ActiveRenderPill.tsx'
const after = fs.readFileSync(path.join(root, file), 'utf8')
const snapshot = ref => execFileSync('git', ['show', ref + ':' + file], { cwd: root, encoding: 'utf8' })
const originalBefore = snapshot('2ca9a06c')
const normalized = (s) => s.replaceAll('buildStudioSeriesReviewHref', 'buildSeriesContinuationHref').replaceAll('@/lib/navigation/studioSeriesReview', '@/lib/seriesContinuation').replace(/\r\n/g, '\n')
// 0449de76 approved canonical palette tokens; 25967fcc subsequently suppressed
// this notice in Studio Ads, which owns its own progress. Freeze the complete
// reviewed source, and preserve the original destination-only proof separately.
const reviewed = snapshot('25967fcc')
assert.equal(normalized(snapshot('594c693a')), normalized(originalBefore), 'original review changed only import and destination; no state/queue/render edits')
assert.equal(normalized(after), normalized(reviewed), 'only the exact approved palette and Ads suppression may follow the original destination review')
const before = normalized(reviewed)
const deps = { ...loadLocal('lib/navigation/studioSeriesReview.ts'), ...loadLocal('lib/seriesContinuation.ts') }
function extract(text) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let handler, identity, key; const buttons = []
  function visit(n) {
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'handleNextEpisode') handler = n.getText(ast)
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'probeIdentity') identity = n.getText(ast)
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'DISMISS_KEY') key = n.initializer.getText(ast)
    if (ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === 'button') {
      const click = n.openingElement.attributes.properties.find((p) => p.name?.getText(ast) === 'onClick')
      if (click?.initializer?.expression?.getText(ast).includes('handleNextEpisode(nextSeed)')) buttons.push(n.getText(ast))
    }
    ts.forEachChild(n, visit)
  }
  visit(ast); assert.ok(handler && identity && key); assert.equal(buttons.length, 2)
  return { handler, identity, key, buttons }
}
const current = extract(after), old = extract(before), original = extract(originalBefore)
const ast = ts.createSourceFile(file, after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let suppression
const findSuppression = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'suppressed') suppression = node.initializer.getText(ast); ts.forEachChild(node, findSuppression) }
findSuppression(ast)
assert.ok(suppression, 'actual suppression gate exists')
for (const pathname of ['/generate', '/studio/create', '/ads', '/ads/v2']) assert.equal(new Function('pathname', `return (${suppression})`)(pathname), true, 'notice stays suppressed where the real render owner is present: ' + pathname)
for (const pathname of ['/history', '/library']) assert.equal(new Function('pathname', `return (${suppression})`)(pathname), false, 'ready notice remains available away from the owning screen: ' + pathname)
function click(source, index, seed, failStorage) {
  const trace = [], scope = { React, ...deps, nextSeed: seed,
    probe: { state: 'completed', videoId: 'fixture-ready', title: seed, seriesSeed: seed }, pathname: '/library',
    registrarPorta: () => () => {},
    trackEvent: (...args) => trace.push(['event', ...args]),
    localStorage: { setItem: (...args) => { trace.push(['storage', ...args]); if (failStorage) throw new Error('synthetic storage denied') } },
    setDismissedId: (value) => trace.push(['dismiss', value]),
    router: { push: (value) => trace.push(['navigate', value]) },
  }
  const text = 'const DISMISS_KEY = ' + source.key + ';\n' + source.identity + '\n' + source.handler + '\nconst button = ' + source.buttons[index]
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText
  const button = new Function(...Object.keys(scope), js + '\nreturn button;')(...Object.values(scope))
  assert.equal(trace.length, 0, 'creating button cannot spend or dismiss')
  button.props.onClick()
  return { trace, html: renderToStaticMarkup(button) }
}
let checks = 9; const preview = [] // Two immutable-source gates, one gate-presence check and six actual suppression cases above.
for (const seed of ['A signal beneath the ice.', '¿Quién llamó? 日本 & signal', '']) for (const storage of [false, true]) for (const index of [0, 1]) {
  const a = click(current, index, seed, storage), b = click(old, index, seed, storage), legacy = click(original, index, seed, storage)
  assert.deepEqual(a.trace.slice(0, -1), b.trace.slice(0, -1), 'same event/dismiss/storage semantics')
  assert.deepEqual(a.trace.slice(0, -1), legacy.trace.slice(0, -1), 'original event/dismiss/storage semantics remain after the approved later changes')
  assert.equal(a.html, b.html, 'button presentation retains the exact approved canonical palette')
  const href = a.trace.at(-1)[1], legacyHref = b.trace.at(-1)[1]
  const url = new URL(href, 'https://example.invalid'), legacyUrl = new URL(legacyHref, 'https://example.invalid')
  assert.equal(url.pathname, '/studio')
  assert.equal(url.searchParams.get('autoanalyze'), null)
  if (seed) {
    const { output } = roundTrip(href, { engine: 'h3', scriptMode: 'verbatim', duration: 90 })
    assert.equal(output.get('prompt'), legacyUrl.searchParams.get('prompt'))
    assert.equal(output.get('continuation_source'), 'render_pill')
    assert.equal(output.get('duration'), '35')
    assert.equal(output.get('engine'), 'fast')
    assert.equal(output.get('script_mode'), 'ai')
  } else assert.equal(href, '/studio')
  if (seed === 'A signal beneath the ice.' && !storage) preview.push({ html: a.html, beforeHref: legacyHref, afterHref: href })
  checks++
}
if (process.argv.includes('--preview')) console.log(JSON.stringify({ checks, preview }))
else console.log(checks + ' ready-notice checks passed; mounted/browser validation pending.')
