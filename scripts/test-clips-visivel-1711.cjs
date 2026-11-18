// Real component, deterministic hooks/DOM transport; never uses network or a provider.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const ts = require('typescript'), React = require('react'), jsx = require('react/jsx-runtime')
const { renderToStaticMarkup } = require('react-dom/server')
const file = 'components/clips/VisibleClipVideo.tsx'
const source = process.argv.includes('--old-candidate') ? require('node:child_process').execFileSync('git',['show','0ec1abffb:'+file],{encoding:'utf8'}) : fs.readFileSync(file, 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
function load(react, globals = {}) { const m = { exports: {} }; vm.runInNewContext(js, { module: m, exports: m.exports, require: n => { if (n === 'react') return react; if (n === 'react/jsx-runtime') return jsx; throw Error(n) }, ...globals }); return m.exports.default }
const html = renderToStaticMarkup(React.createElement(load(React), { src: '/never-before-visible.mp4', autoPlay: true }))
assert(!/<video[^>]*\ssrc=/.test(html)); assert(!html.includes('autoplay=')); assert(html.includes('preload="none"')); assert(html.includes('poster="data:image/svg+xml'))
function world(props = {}, observerAvailable = true) {
  const h = { state: [], refs: [], effects: [], pending: [], dirty: false, props: { src: '/a.mp4', autoPlay: true, ...props }, play: 0, pause: 0, load: 0, removed: [], disconnected: 0, listeners: {} }
  h.el = { play: () => { h.play++; return Promise.resolve() }, pause: () => h.pause++, load: () => h.load++, removeAttribute: k => h.removed.push(k) }
  const doc = { hidden: false, addEventListener: (n, fn) => { h.listeners[n] = fn }, removeEventListener: n => { delete h.listeners[n] } }
  class IO { constructor(fn, options) { h.intersect = fn; h.options = options } observe(el) { assert.equal(el, h.el) } disconnect() { h.disconnected++ } }
  const fakeReact = { ...React, useState: init => { const i = h.s++; if (!(i in h.state)) h.state[i] = typeof init === 'function' ? init() : init; return [h.state[i], v => { const x = typeof v === 'function' ? v(h.state[i]) : v; if (!Object.is(x, h.state[i])) { h.state[i] = x; h.dirty = true } }] }, useRef: () => { const i = h.r++; return h.refs[i] ||= { current: h.el } }, useEffect: (fn, deps) => { const i = h.e++, old = h.effects[i]; if (!old || deps.some((d, j) => !Object.is(d, old.deps[j]))) { const next = { fn, deps, cleanup: old?.cleanup }; h.effects[i] = next; h.pending.push(next) } } }
  const C = load(fakeReact, { document: doc, IntersectionObserver: observerAvailable ? IO : undefined })
  h.render = () => { h.s = h.r = h.e = 0; h.dirty = false; h.tree = C(h.props) }
  h.flush = () => { for (let i = 0; i < 20; i++) { if (h.dirty) h.render(); const pending = h.pending.splice(0); for (const e of pending) { e.cleanup?.(); e.cleanup = e.fn() } if (!h.dirty && !h.pending.length) return } throw Error('render loop') }
  h.visible = yes => { h.intersect([{ isIntersecting: yes, intersectionRatio: yes ? 0.8 : 0 }]); h.flush() }
  h.visibility = yes => { doc.hidden = !yes; h.listeners.visibilitychange(); h.flush() }
  h.event = name => { h.tree.props[name]?.({}); h.flush() }
  h.render(); h.flush(); return h
}
const a = world(), b = world()
assert.equal(a.tree.props.src, undefined); assert.equal(a.play, 0); assert.equal(a.options.rootMargin, '0px')
a.visible(true); assert.equal(a.tree.props.src, '/a.mp4'); assert.equal(a.play, 1); assert.equal(b.tree.props.src, undefined)
a.visible(false); assert.equal(a.tree.props.src, undefined); assert(a.pause > 0); assert(a.removed.includes('src'))
a.event('onPointerEnter'); assert.equal(a.tree.props.src, '/a.mp4')
a.event('onPointerLeave'); assert.equal(a.tree.props.src, undefined)
a.event('onFocus'); assert.equal(a.tree.props.src, '/a.mp4')
a.visible(false); assert.equal(a.tree.props.src, undefined, 'scrolling away clears stale focus/hover activation')
a.visible(true); a.visibility(false); assert.equal(a.tree.props.src, undefined)
a.visibility(true); assert.equal(a.tree.props.src, '/a.mp4')
a.props = { ...a.props, src: '/b.mp4' }; a.dirty = true; a.flush(); assert.equal(a.tree.props.src, '/b.mp4')
const manual = world({ autoPlay: undefined, controls: true }); assert.equal(manual.tree.props.preload, "none"); assert.equal(manual.tree.props.poster, undefined); manual.visible(true); assert.equal(manual.tree.props.preload, "metadata"); assert.equal(manual.tree.props.poster, undefined); manual.visible(false); assert.equal(manual.tree.props.src, undefined); assert.equal(manual.tree.props.preload, "none"); manual.visible(true); assert.equal(manual.play, 0); assert.equal(manual.tree.props.controls, true)
const fallback = world({}, false); assert.equal(fallback.tree.props.src, undefined); fallback.event('onFocus'); assert.equal(fallback.tree.props.src, '/a.mp4'); fallback.event('onBlur'); assert.equal(fallback.tree.props.src, undefined)
for (const e of a.effects) e.cleanup?.(); assert.equal(a.disconnected, 1); assert.equal(a.listeners.visibilitychange, undefined)
console.log('PASS: SSR without src; visibility/hover/focus; exit unload; hidden page; independent cards; manual controls; cleanup; no-observer fallback.')
