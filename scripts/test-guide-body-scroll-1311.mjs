// Body scroll containers must be measured without moving a window or posting events.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const ts = createRequire(path.resolve('package.json'))('typescript')
const CORE = 'lib/seo/guideEngagement.ts'
const original = fs.readFileSync(CORE, 'utf8')
function load(text) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports })
  return exports
}
class Target {
  listeners = new Map()
  addEventListener(name, fn, opts) {
    const capture = opts === true || !!opts?.capture
    const items = this.listeners.get(name) || []
    if (!items.some(x => x.fn === fn && x.capture === capture)) items.push({ fn, capture })
    this.listeners.set(name, items)
  }
  removeEventListener(name, fn, opts) {
    const capture = opts === true || !!opts?.capture
    this.listeners.set(name, (this.listeners.get(name) || []).filter(x => x.fn !== fn || x.capture !== capture))
  }
  fire(name, event = {}, capturingOnly = false) {
    for (const { fn, capture } of this.listeners.get(name) || []) if (!capturingOnly || capture) fn(event)
  }
  count() { return [...this.listeners.values()].reduce((n, items) => n + items.length, 0) }
}
function world(core, bodyMode = true) {
  const win = new Target(), doc = new Target(), root = new Target(), timers = new Map(), events = []
  let ms = 0, overflow = bodyMode ? 'auto' : 'visible'
  const body = { scrollHeight: 1400, clientHeight: 400, scrollTop: 0 }
  const html = { scrollHeight: bodyMode ? 400 : 1400, clientHeight: 400, scrollTop: 0 }
  Object.assign(win, {
    location: { pathname: core.MEASURED_GUIDE_PATHS[0] }, innerHeight: 400, scrollY: 0,
    getComputedStyle: element => { assert.equal(element, body); return { overflowY: overflow } },
    performance: { now: () => ms }, crypto: { randomUUID: () => 'visit-body' },
    setInterval: fn => { timers.set(1, fn); return 1 }, clearInterval: id => timers.delete(id),
  })
  Object.assign(doc, { body, documentElement: html, scrollingElement: html,
    visibilityState: 'visible', hasFocus: () => true })
  root.querySelector = () => null
  const attach = () => core.attachGuideEngagement(root, win.location.pathname, (name, meta) => events.push({ name, meta }), win, doc)
  return {
    win, doc, root, body, html, events, timers, attach,
    overflow: value => { overflow = value },
    depths: () => events.filter(e => e.name === 'guide_scroll_depth').map(e => e.meta.depth_percent),
    bodyScroll: y => { body.scrollTop = y; ms += 100; doc.fire('scroll', { target: body }, true) },
    viewportScroll: y => { win.scrollY = y; ms += 100; win.fire('scroll', { target: doc }) },
    clean: () => win.count() + doc.count() + root.count() + timers.size,
  }
}
function prove(text) {
  const c = load(text)
  const w = world(c), stop = w.attach()
  for (const y of [250, 500, 750, 1000, 1000, 0]) w.bodyScroll(y)
  assert.equal(w.win.scrollY, 0)
  assert.deepEqual(w.depths(), [25, 50, 75, 100], 'body scroll reaches each milestone while window stays at zero')
  assert.equal(w.events.filter(e => e.name === 'guide_page_viewed').length, 1)
  for (const e of w.events.filter(e => e.name === 'guide_scroll_depth')) assert.equal(e.meta.scroll_root, 'body')
  stop(); assert.equal(w.clean(), 0, 'capturing listener and all other resources removed')

  const viewport = world(c, false), endViewport = viewport.attach()
  viewport.viewportScroll(250)
  viewport.doc.fire('scroll', { target: { scrollHeight: 9000, scrollTop: 8000 } }, true)
  assert.deepEqual(viewport.depths(), [25], 'a table or nested element is not page depth')
  viewport.viewportScroll(1000)
  assert.deepEqual(viewport.depths(), [25, 50, 75, 100])
  assert.equal(viewport.events.find(e => e.name === 'guide_scroll_depth').meta.scroll_root, 'document')
  endViewport(); assert.equal(viewport.clean(), 0)

  const resized = world(c), endResized = resized.attach()
  resized.body.scrollHeight = 1500; resized.body.clientHeight = 300
  resized.bodyScroll(275)
  assert.deepEqual(resized.depths(), [], 'use body clientHeight, not window height')
  resized.bodyScroll(300)
  assert.deepEqual(resized.depths(), [25])
  assert.equal(resized.events.find(e => e.name === 'guide_scroll_depth').meta.viewport_height, 300)
  resized.overflow('visible'); resized.body.scrollTop = 0; resized.html.scrollHeight = 1400
  resized.viewportScroll(500)
  assert.deepEqual(resized.depths(), [25, 50], 're-evaluate owner after resize/layout mode change')
  endResized()

  const restored = world(c); restored.body.scrollTop = 500
  const endRestored = restored.attach()
  assert.deepEqual(restored.depths(), [25, 50], 'restored body scroll sampled on attach')
  endRestored()

  const short = world(c); short.body.scrollHeight = short.body.clientHeight
  const endShort = short.attach(); short.bodyScroll(0)
  assert.deepEqual(short.depths(), [], 'short page gets no fake milestones')
  endShort()

  const quirks = world(c); quirks.doc.scrollingElement = quirks.body
  const endQuirks = quirks.attach(); quirks.viewportScroll(500)
  assert.deepEqual(quirks.depths(), [25, 50], 'body as document scrollingElement uses viewport path')
  endQuirks()
}
if (process.argv.includes('--expect-baseline-failure')) {
  assert.throws(() => prove(original), /body scroll reaches each milestone/, 'the exact current base must reproduce the bug')
  console.log('REPRODUCED: body scroll misses all milestones while window.scrollY remains zero. Offline only.')
} else {
  prove(original)
  assert.equal(load(original).GUIDE_MEASUREMENT_VERSION, 'guides_20261113_v2')
  for (const [from, to] of [
    ["doc.addEventListener('scroll', onElementScroll, { capture: true, passive: true })", ''],
    ["viewportHeight: body.clientHeight", 'viewportHeight: win.innerHeight'],
    ["doc.removeEventListener('scroll', onElementScroll, true)", ''],
  ]) {
    assert.ok(original.includes(from), 'mutant anchor exists')
    assert.throws(() => prove(original.replace(from, to)), 'mutant must fail: ' + from)
  }
  console.log('PASS body + viewport scroll, nested scroll exclusion, clientHeight, restoration, resize, quirks, cleanup, 3 mutants; no browser or network.')
}
