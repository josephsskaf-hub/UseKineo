// Offline SSR of the real components; effects, network and paid actions never run.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import React from 'react'
import ts from 'typescript'
import { renderPage } from './preview-ux-complete.mjs'

const base = '686fadbe32e82ada47ca0601f27ebbdfd7a58183'
const history = 'app/(dashboard)/history/HistoryClient.tsx'
const library = 'app/(dashboard)/library/LibraryClient.tsx'
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const prior = file => execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).replace(/\r\n/g, '\n')
let checks = 0
function check(value, message) { assert.ok(value, message); checks++ }
const videos = [{ id: 'fixture-private', topic: 'Demo lighthouse', video_url: '/fixture.mp4', thumbnail_url: '/fixture.svg', status: 'completed', quality_mode: 'seedance', created_at: '2026-09-23T10:00:00Z', published_at: null }]
const props = { videos, snapshotTime: Date.parse('2026-09-23T12:00:00Z'), embedded: true }
const gallery = renderPage(history, false, {}, props)
for (const label of ['Search your videos', 'Download MP4', 'Publish page', 'YouTube', 'Next episode']) check(gallery.includes(label), `embedded gallery retains ${label}`)
check(!gallery.includes('<h1') && !gallery.includes('aria-label="Create your second Short"'), 'embedded gallery has no duplicate heading or episode billboard')
check(!gallery.includes('Credits Used'), 'embedded gallery has no duplicate totals')
const standalone = renderPage(history, false, {}, { ...props, embedded: false })
check(standalone.includes('<h1') && standalone.includes('Credits Used'), 'standalone history keeps its presentation')
const empty = renderPage(history, false, {}, { ...props, videos: [] })
check(empty.includes('No videos yet') && empty.includes('href="/studio"') && !empty.includes('<h1'), 'empty gallery has a creation action without a duplicate heading')
const failed = renderPage(history, false, {}, { ...props, videos: [], loadError: true })
check(failed.includes('role="alert"') && !failed.includes('No videos yet'), 'read failure cannot become empty history')
const search = renderPage(history, false, { query: 'no match' }, props)
check(search.includes('Reset filters') && !search.includes('Download MP4'), 'video search uses the real history filter')
const slot = React.createElement('div', { 'data-test-gallery': true }, 'REAL GALLERY SLOT')
const shell = renderPage(library, false, { loaded: true, vids: videos, recentVideo: videos[0] }, { videoCollection: slot })
check(shell.includes('REAL GALLERY SLOT'), 'Library defaults to the supplied video collection')
check(!shell.includes('Video history and downloads') && !shell.includes('Shorts made'), 'Library has no competing history or milestone block')
check((shell.match(/<h1/g) || []).length === 1, 'one page title')
for (const tab of ['images', 'audio']) {
  const html = renderPage(library, false, { tab, loaded: true, imgs: [{ id: 'i', url: '/i.svg', model: 'Demo' }], auds: [{ id: 'a', url: '/a.mp3', model: 'Demo', text: 'Demo narration' }] }, { videoCollection: slot })
  check(!html.includes('REAL GALLERY SLOT') && html.includes('Download'), `${tab} tab shows its own functional cards`)
  const failedTab = renderPage(library, false, { tab, loaded: true, loadFailed: true }, { videoCollection: slot })
  check(failedTab.includes('role="alert"') && !failedTab.includes(`No ${tab} yet`), `${tab} read failure stays distinct from empty`)
}
// Extraction must preserve every authenticated query, owner filter and error decision.
const body = text => text.slice(text.indexOf('  const supabase = createClient()'), text.indexOf('  return <MyVideosClient'))
assert.equal(body(read('components/library/VideoCollection.tsx')), body(prior('app/(dashboard)/history/page.tsx'))); checks++
// Presentation composition must not change any existing video action handler.
function handlers(text) {
  const ast = ts.createSourceFile('component.tsx', text, 99, true, 4), found = []
  function walk(node) {
    if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText(ast))) {
      const handler = node.getText(ast)
        // Approved organization and delivery controls have behavioral suites.
        // Metadata still fits the player; the added measurement only labels resolution.
        if (handler.includes('setFileResolutions(')) {
          found.push('onLoadedMetadata={(e) => fitLightboxFrame(e.currentTarget)}')
        } else if (!/setFormat\(|setQuery\(''\)|setFileVersions\(|setManualCopy\(/.test(handler)) found.push(handler)
    }
    ts.forEachChild(node, walk)
  }
  walk(ast); return found
}
// Preserve the original extraction proof at its immutable delivery.
const extraction = '57c939e3938f257ef633d748a1d6997907bd13fc'
const approved = '37cca7e2ecff13cb5e40a0d3afffc2af81706f11'
const at = (ref, file) => execFileSync('git', ['show', ref + ':' + file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replace(/\r\n/g, '\n')
assert.deepEqual(handlers(at(extraction, history)), handlers(prior(history))); checks++
// Later approved delivery/organization work moved the lightbox into a shared dialog.
// Exact whole-source pins retain the barrier against unreviewed handler changes.
for (const file of [history, library, 'components/FilmPreviewDialog.tsx']) {
  assert.equal(read(file), at(approved, file), file + ' retains the complete approved source'); checks++
}
const currentHandlers = handlers(read(history))
for (const callback of ['onDownload={() => handleDownload(v)}', 'onClose={() => setLightbox(null)}', "onCopyTitle={() => { void copyToClipboard('film-title-' + v.id, extractTitle(v.topic)) }}"]) check(currentHandlers.includes(callback), 'actual History supplies ' + callback)
// Execute the current dialog's real callbacks in an isolated render world.
// Effects never run; portals, player and UI helpers are local fakes.
const dialogFile = 'components/FilmPreviewDialog.tsx'
const dialogSource = read(dialogFile)
const dialogAst = ts.createSourceFile(dialogFile, dialogSource, 99, true, 4)
const stateEdits = []
function mapState(node) {
  if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(dialogAst) === 'useState') {
    stateEdits.push([node.initializer.getStart(dialogAst), node.initializer.end, '__state(' + JSON.stringify(node.name.elements[0].getText(dialogAst)) + ', ' + (node.initializer.arguments[0]?.getText(dialogAst) ?? 'undefined') + ')'])
  }
  ts.forEachChild(node, mapState)
}
mapState(dialogAst)
let renderedSource = dialogSource
for (const [start, end, replacement] of stateEdits.sort((a,b) => b[0] - a[0])) renderedSource = renderedSource.slice(0,start) + replacement + renderedSource.slice(end)
const js = ts.transpileModule(renderedSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
const actionLog = [], stateLog = [], refs = []
const fakeReact = { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }), useEffect: () => {}, useId: () => 'fixture-title', useRef: value => { const ref = {current:value}; refs.push(ref); return ref } }
const box = {exports:{}}
const stub = id => id === 'react' ? fakeReact : id === 'react-dom' ? {createPortal: node => node} : id.endsWith('.css') ? {default: new Proxy({}, {get:(_t,k) => k})} : id === './InterfaceLanguage' ? {UiLabel:'label', useUiCopy:() => text => text} : id === './ControlIcon' ? {default:'icon'} : (() => {throw Error('unexpected dialog dependency ' + id)})()
new Function('module','exports','require','React','__state',js)(box,box.exports,stub,fakeReact,(name, initial) => [name === 'portalRoot' ? {} : initial, next => stateLog.push([name,next])])
const callbacks = Object.fromEntries(['onVersionChange','onDownload','onCopyTitle','onMetadata','onError','onClose'].map(name => [name, (...args) => actionLog.push([name,...args])]))
const tree = box.exports.default({title:'Demo',src:'/fixture.mp4',hasEnhanced:true,version:'enhanced',downloading:false,downloadLabel:'Download MP4',copied:false,...callbacks})
const nodes = []
function collect(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) {node.forEach(collect);return} nodes.push(node); node.children?.forEach(collect) }
collect(tree)
const buttons = nodes.filter(n => n.type === 'button'), player = nodes.find(n => n.type === 'video')
buttons.find(n => n.props.onClick === callbacks.onDownload).props.onClick()
check(actionLog.some(x => x[0] === 'onDownload'), 'real dialog dispatches its owner download callback')
buttons.find(n => n.props['aria-label'] === 'Close preview').props.onClick()
check(actionLog.some(x => x[0] === 'onClose'), 'real close button closes the preview')
for (const button of buttons.filter(n => 'aria-pressed' in n.props)) button.props.onClick()
check(actionLog.some(x => x[0] === 'onVersionChange' && x[1] === 'original') && actionLog.some(x => x[0] === 'onVersionChange' && x[1] === 'enhanced'), 'both real file selectors dispatch their versions')
const videoElement = {videoWidth:1280,videoHeight:720}
player.props.onLoadedMetadata({currentTarget:videoElement})
check(actionLog.some(x => x[0] === 'onMetadata' && x[1] === videoElement) && stateLog.some(x => x[0] === 'ratio' && x[1] === 1280/720), 'real metadata callback updates frame ratio and forwards the player')
player.props.onError()
check(actionLog.some(x => x[0] === 'onError') && stateLog.some(x => x[0] === 'failed' && x[1] === true), 'real player errors reach the owner and visible error state')
const beforeOverlay = actionLog.length
const overlay = tree
const same = {}; overlay.props.onClick({target:{},currentTarget:same})
check(actionLog.length === beforeOverlay, 'clicking inside the preview cannot close it')
overlay.props.onClick({target:same,currentTarget:same})
check(actionLog.length === beforeOverlay + 1 && actionLog.at(-1)[0] === 'onClose', 'clicking the real backdrop closes it')
console.log(`${checks} library gallery checks passed; no network, DB or paid action.`)
