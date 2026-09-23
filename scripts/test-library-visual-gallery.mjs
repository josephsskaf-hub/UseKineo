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
check(search.includes('Clear search') && !search.includes('Download MP4'), 'video search uses the real history filter')
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
    if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText(ast))) found.push(node.getText(ast))
    ts.forEachChild(node, walk)
  }
  walk(ast); return found
}
assert.deepEqual(handlers(read(history)), handlers(prior(history))); checks++
console.log(`${checks} library gallery checks passed; no network, DB or paid action.`)
