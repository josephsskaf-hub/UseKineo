import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { React, renderToStaticMarkup, offlineModules } from './gpt24h-offline-support.mjs'

const CORE = 'lib/seo/guideEngagement.ts'
const original = fs.readFileSync(CORE, 'utf8')
function load(text = original) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports })
  return exports
}
class Target {
  listeners = new Map()
  addEventListener(name, fn) { const fns = this.listeners.get(name) || new Set(); fns.add(fn); this.listeners.set(name, fns) }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn) }
  fire(name, event = {}) { for (const fn of this.listeners.get(name) || []) fn(event) }
  count() { return [...this.listeners.values()].reduce((n, s) => n + s.size, 0) }
}
function world(core, path = core.MEASURED_GUIDE_PATHS[0], visible = true) {
  let clock = 0, focus = true, uid = 0
  const win = new Target(), doc = new Target(), root = new Target(), timers = new Map(), events = []
  const hero = { contains: node => node === 'hero' || node === 'hero-child' }
  root.querySelector = selector => selector === '.kc-hero .kc-cta' ? hero : null
  Object.assign(win, { location: { pathname: path }, innerHeight: 400, scrollY: 0,
    performance: { now: () => clock }, crypto: { randomUUID: () => 'visit-' + ++uid },
    setInterval: fn => { const id = ++uid; timers.set(id, fn); return id }, clearInterval: id => timers.delete(id) })
  Object.assign(doc, { visibilityState: visible ? 'visible' : 'hidden', hasFocus: () => focus,
    scrollingElement: { scrollHeight: 1400 } })
  const emit = (name, meta, page) => events.push({ name, meta, page })
  const attach = () => core.attachGuideEngagement(root, path, emit, win, doc)
  const advance = ms => { clock += ms; for (const fn of timers.values()) fn() }
  return { win, doc, root, events, timers, attach, advance,
    focus: f => { focus = f; win.fire(f ? 'focus' : 'blur') },
    visibility: v => { doc.visibilityState = v ? 'visible' : 'hidden'; doc.fire('visibilitychange') },
    scroll: y => { win.scrollY = y; win.fire('scroll') },
    named: n => events.filter(e => e.name === n),
  }
}
function prove(text) {
  const c = load(text), w = world(c), stop = w.attach()
  assert.equal(w.named('guide_page_viewed').length, 1)
  for (const y of [250, 500, 750, 1000, 1000, 0, 500]) w.scroll(y)
  assert.deepEqual(w.named('guide_scroll_depth').map(e => e.meta.depth_percent), [25, 50, 75, 100])
  w.root.fire('click', { isTrusted: false, target: 'hero' })
  w.root.fire('click', { isTrusted: true, target: 'closing' })
  assert.equal(w.named('guide_first_cta_clicked').length, 0)
  w.root.fire('click', { isTrusted: true, target: 'hero-child' })
  w.root.fire('click', { isTrusted: true, target: 'hero' })
  assert.equal(w.named('guide_first_cta_clicked').length, 1)
  w.advance(15000)
  w.visibility(false); w.advance(120000); w.visibility(true)
  w.advance(15000)
  w.focus(false); w.advance(120000); w.focus(true)
  w.advance(5000); stop()
  assert.equal(Math.max(...w.named('guide_visible_time').map(e => e.meta.visible_ms)), 35000, 'hidden and blurred time excluded')
  assert.equal(w.win.count() + w.doc.count() + w.root.count() + w.timers.size, 0, 'all resources cleaned')
  const restart = w.attach() // Strict Mode effect replay: same DOM root
  w.scroll(1000); w.root.fire('click', { isTrusted: true, target: 'hero' })
  assert.equal(w.named('guide_page_viewed').length, 1)
  assert.equal(w.named('guide_scroll_depth').length, 4)
  assert.equal(w.named('guide_first_cta_clicked').length, 1)
  restart()
  const h = world(c, c.MEASURED_GUIDE_PATHS[1], false), end = h.attach()
  h.advance(60000); assert.equal(h.events.length, 0, 'hidden preload is not a visit')
  h.visibility(true); h.advance(15000); h.win.fire('pagehide'); h.advance(60000); h.win.fire('pageshow'); h.advance(5000); end()
  assert.equal(h.named('guide_page_viewed').length, 1)
  assert.equal(Math.max(...h.named('guide_visible_time').map(e => e.meta.visible_ms)), 20000, 'BFCache absence excluded')
  for (const path of ['/', '/guides/unknown', '/ai-video-generator/for/urdu']) {
    const outside = world(c, path); outside.attach()(); outside.advance(10000)
    assert.equal(outside.events.length + outside.timers.size, 0, 'outside cohort untouched')
  }
  const short = world(c); short.doc.scrollingElement.scrollHeight = 400
  const endShort = short.attach(); short.scroll(0); assert.equal(short.named('guide_scroll_depth').length, 0); endShort()
  const errs = world(c); const clean = c.attachGuideEngagement(errs.root, c.MEASURED_GUIDE_PATHS[0], () => { throw Error('offline') }, errs.win, errs.doc)
  errs.advance(16000); errs.scroll(1000); clean()
  const mismatch = world(c); mismatch.win.location.pathname = '/pricing'; mismatch.attach()()
  assert.equal(mismatch.events.length, 0)
  for (const e of [...w.events, ...h.events]) {
    // 13/11: independent body scrolling fixed under a new version; v1 stays historical.
    assert.equal(e.meta.measurement_version, 'guides_20261113_v2')
    assert.ok(e.meta.visit_id && e.page.startsWith('/guides/'))
    assert.ok(!Object.hasOwn(e.meta, 'utm_source') && !Object.hasOwn(e.meta, 'href') && !Object.hasOwn(e.meta, 'text'))
  }
}
prove(original)
for (const [from, to] of [
  ["doc.visibilityState === 'visible'", 'true'],
  [' && doc.hasFocus()', ''],
  [' || state.depths.has(depth)', ''],
  ["'.kc-hero .kc-cta'", "'.kc-bottom .kc-cta'"],
]) {
  assert.ok(original.includes(from), 'mutant anchor exists')
  assert.throws(() => prove(original.replace(from, to)), 'mutant must fail: ' + from)
}

// Compare every guide's complete rendered markup + metadata against the fetched
// base, using real content and CSS. Null tracker must add zero visible markup.
const component = 'components/GuiaIaPage.tsx'
const baseSource = execFileSync('git', ['show', 'dc39b556126392a802116bb3f43f8ea65b5542a6:' + component], { encoding: 'utf8' })
const before = offlineModules({ replacements: { [component]: baseSource } })
const after = offlineModules()
const guides = after('lib/growth/guiasIa1610.ts').GUIAS_IA
const paths = after('lib/seo/guiasIa1610Paths.ts').GUIAS_IA_PATHS
assert.equal(paths.length, 8)
assert.deepEqual([...load().MEASURED_GUIDE_PATHS].sort(), [...paths].sort(), 'exact eight-page cohort')
for (const guide of Object.values(guides)) {
  const html = l => renderToStaticMarkup(React.createElement(l(component).default, { guide }))
  assert.equal(html(after), html(before), 'text, structure, CSS, FAQ, hrefs unchanged: ' + guide.slug)
  assert.equal(JSON.stringify(after(component).guiaIaMetadata(guide)), JSON.stringify(before(component).guiaIaMetadata(guide)))
}
assert.match(fs.readFileSync(component, 'utf8'), /<GuideEngagementTracker path=\{guiaIaPath\(guide.slug\)\} \/>/)
assert.match(fs.readFileSync('components/GuideEngagementTracker.tsx', 'utf8'), /attachGuideEngagement\(root, path, trackEvent, window, document\)/)
console.log('PASS: cohort, scroll, first CTA, foreground time, cleanup, replay, BFCache, errors, 4 mutants; eight guides SSR and metadata identical')
