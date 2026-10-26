// Offline caller-contract tests. Execute the actual four JSX links and the
// real Studio reader/Generate with mocks. No full page mount or network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { loadLocal, roundTrip } from './diagnose-studio-continuation.mjs'
const root = path.resolve(import.meta.dirname, '..')
const adapter = loadLocal('lib/navigation/studioSeriesReview.ts')
const series = loadLocal('lib/seriesContinuation.ts')
const files = ['app/(dashboard)/history/HistoryClient.tsx', 'app/(dashboard)/library/LibraryClient.tsx']
const baseline = '2ca9a06c4f128f936468b117ba0a7f194cff2411'
const delivery = '9448d2ef95c39a2cb46e802f2ece5ae91dae4142'
const approved = '37cca7e2ecff13cb5e40a0d3afffc2af81706f11'
const at = (ref, file) => execFileSync('git', ['show', ref + ':' + file], {cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).replace(/\r\n/g,'\n')
function calls(text, file) {
  text = text.replace(/\r\n/g, '\n') // KINEO-LEVA-REBASE-2610: JSX caller contracts compare canonical LF on Windows too.
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const links = []; let follow
  function visit(n) {
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'followUpHref') follow = n.initializer.getText(ast)
    if (ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === 'Link') {
      const attr = n.openingElement.attributes.properties.find((p) => p.name?.getText(ast) === 'href')
      const value = attr?.initializer?.expression?.getText(ast)
      if (value === 'followUpHref' || /^build(?:StudioSeriesReview|SeriesContinuation)Href\(/.test(value ?? '')) links.push(n.getText(ast))
    }
    ts.forEachChild(n, visit)
  }
  visit(ast)
  return { links, follow }
}
const librarySource = fs.readFileSync(path.join(root, files[1]), 'utf8')
const libraryAst = ts.createSourceFile(files[1],librarySource,99,true,ts.ScriptKind.TSX)
let countExpression
function findCount(node) { if (ts.isVariableDeclaration(node) && node.name.getText(libraryAst) === 'completedCount') countExpression = node.initializer; ts.forEachChild(node,findCount) }
findCount(libraryAst)
assert.ok(countExpression, 'actual completed library count exists')
const {libraryVideoState} = loadLocal('lib/ui/libraryListing.ts')
const countCompleted = vids => new Function('vids','libraryVideoState','return ' + countExpression.getText(libraryAst))(vids,libraryVideoState)
function render(link, follow, title, count, records) {
  const events = [], refs = []
  const vids = records ?? Array.from({length:count}, () => ({id:'fixture-1',title,status:'completed',video_url:'/fixture.mp4'}))
  const scope = { React, ...adapter, ...series, firstVideoTitle: title, title,
    video: { id: 'fixture-1', title }, v: { id: 'fixture-1', title },
    vids, completedCount: countCompleted(vids),
    completedVideos: Array.from({ length: count }, () => ({ id: 'fixture-1', title })),
    registrarPorta: (metadata) => { refs.push(metadata); return () => {} },
    trackEvent: (...event) => events.push(event),
    Link: ({ prefetch, ...props }) => React.createElement('a', props),
    UiLabel: ({children}) => React.createElement('span', null, children),
  }
  const js = ts.transpileModule((follow ? 'const followUpHref = ' + follow + ';\n' : '') + 'const node = ' + link, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText
  const node = new Function(...Object.keys(scope), js + '\nreturn node;')(...Object.values(scope))
  return { node, events, refs }
}
let checks = 0
const preview = []
for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), 'utf8')
  const oldText = execFileSync('git', ['show', baseline + ':' + file], { cwd: root, encoding: 'utf8' })
  const current = calls(text, file), old = calls(oldText, file)
  assert.equal(current.links.length, file.includes('/history/') ? 3 : 1)
  assert.equal(old.links.length, current.links.length)
  // Gate against collateral edits: imports, adapter calls and prefetch only.
  const normalized = (s) => s.replaceAll('buildStudioSeriesReviewHref', 'buildSeriesContinuationHref').replaceAll('@/lib/navigation/studioSeriesReview', '@/lib/seriesContinuation').replace(/^\s*prefetch=\{false\}\r?\n/gm, '').replace(/\r\n/g, '\n')
  // Keep the complete original navigation-only delivery proof. Approved
  // organization/delivery changes are protected by an exact current-source pin.
  assert.equal(normalized(at(delivery, file)), normalized(oldText), file + ' original delivery changed more than navigation')
  checks++
  assert.equal(text.replace(/\r\n/g,'\n'), at(approved,file), file + ' retains the complete currently approved source')
  checks++
  const callContracts = value => ({...value, links:value.links.map(link => link.replaceAll('<UiLabel>', '').replaceAll('</UiLabel>', '').replaceAll('completed_video_count: completedCount', 'completed_video_count: vids.length'))})
  assert.deepEqual(callContracts(calls(at(delivery,file),file)), callContracts(current), file + ' keeps exactly the original four live navigation callers apart from approved label wrappers and the completed-only count of e39b20c7')
  checks++
  for (let i = 0; i < current.links.length; i++) {
    for (const title of ['A signal beneath the ice.', '¿Quién llamó? 日本 & "signal"', 'Untitled Short']) {
      for (const count of [1, 2]) {
        const after = render(current.links[i], current.follow, title, count)
        const before = render(old.links[i], old.follow, title, count)
        const href = new URL(after.node.props.href, 'https://example.invalid')
        const legacy = new URL(before.node.props.href, 'https://example.invalid')
        assert.equal(href.pathname, '/studio')
        assert.equal(after.node.props.prefetch, false)
        assert.deepEqual(after.refs, before.refs, 'exposure metadata preserved')
        assert.equal(after.events.length, 0)
        after.node.props.onClick(); before.node.props.onClick()
        assert.deepEqual(after.events, before.events, 'click metadata preserved')
        if (legacy.searchParams.has('prompt')) {
          assert.equal(href.searchParams.get('prompt'), legacy.searchParams.get('prompt'))
          assert.equal(href.searchParams.get('autoanalyze'), null)
          const { output } = roundTrip(href.pathname + href.search, { duration: 90, scriptMode: 'verbatim', engine: 'h3' })
          assert.equal(output.get('prompt'), legacy.searchParams.get('prompt'))
          assert.equal(output.get('continuation_source'), after.refs[0].source)
          assert.equal(output.get('duration'), '35')
          assert.equal(output.get('engine'), 'fast')
          assert.equal(output.get('script_mode'), 'ai')
        } else assert.equal(href.search, '', 'untitled milestone retains plain Studio fallback')
        if (title === 'A signal beneath the ice.' && count === 1) preview.push({ file, position: i, before: renderToStaticMarkup(before.node), after: renderToStaticMarkup(after.node) })
        checks++
      }
    }
  }
}
// e39b20c7 corrected telemetry to count ready deliveries, excluding failed/pending rows.
const currentLibrary = calls(librarySource,files[1])
const mixed = [{id:'ready',status:'completed',video_url:'/fixture.mp4'},{id:'failed',status:'failed',video_url:null},{id:'pending',status:'processing',video_url:null}]
const counted = render(currentLibrary.links[0],currentLibrary.follow,'Demo',mixed.length,mixed)
assert.equal(counted.refs[0].completed_video_count,1); checks++
counted.node.props.onClick()
assert.equal(counted.events[0][1].completed_video_count,1); checks++
const countMutant = currentLibrary.links[0].replaceAll('completed_video_count: completedCount','completed_video_count: vids.length')
assert.notEqual(countMutant,currentLibrary.links[0]); checks++
assert.notEqual(render(countMutant,currentLibrary.follow,'Demo',mixed.length,mixed).refs[0].completed_video_count,1); checks++
if (process.argv.includes('--preview')) console.log(JSON.stringify({ checks, preview }))
else console.log(checks + ' archive navigation checks passed; full browser/visual approval pending.')
