// Offline: executes the real topic builder and TSX with a minimal hook renderer.
// No .env, credentials, network, production database, or paid generation.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const CARD = 'app/trending/TrendingCard.tsx'
const LIB = 'lib/trending/trendingNow.ts'
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
let passed = 0
function check(name, fn) { fn(); passed++; console.log('ok', name) }

function runtime(overrides = {}) {
  const state = new Map()
  const cache = new Map()
  let active = null
  const element = (type, props, key) => ({ type, props: props || {}, key })
  const fragment = Symbol('fragment')
  const react = {
    useEffect() {},
    useRef: (value) => ({ current: value }),
    useState(initial) {
      const { slots, index } = active
      active.index++
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
  }
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const source = overrides[rel] ?? read(rel)
    const mod = { exports: {} }
    cache.set(rel, mod)
    if (rel.endsWith('.json')) { mod.exports = JSON.parse(source); return mod.exports }
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    const resolve = (spec) => {
      if (spec === 'react') return react
      if (spec === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: fragment }
      if (spec === 'next/link') return { __esModule: true, default: ({ children, prefetch, ...props }) => element('a', { ...props, children }) }
      if (spec === '@/components/InterfaceLanguage') return { UiLabel: ({ children }) => children, useInterfaceLanguage: () => 'en' }
      assert(spec.startsWith('.') || spec.startsWith('@/'), 'unexpected dependency: ' + spec)
      const base = spec.startsWith('@/') ? spec.slice(2) : path.posix.join(path.posix.dirname(rel), spec)
      const file = [base, base + '.ts', base + '.tsx', base + '/index.ts'].find((p) => fs.existsSync(path.join(ROOT, p)) && fs.statSync(path.join(ROOT, p)).isFile())
      assert(file, 'missing module: ' + spec)
      return load(file)
    }
    new Function('module', 'exports', 'require', 'process', js)(mod, mod.exports, resolve, { env: {} })
    return mod.exports
  }
  const visit = (node, route = 'root') => {
    if (Array.isArray(node)) return node.flatMap((item, i) => visit(item, route + '/' + i))
    if (node == null || typeof node === 'boolean') return []
    if (typeof node !== 'object') return [node]
    if (typeof node.type === 'function') {
      const identity = route + '/' + node.type.name + '/' + (node.key ?? '')
      const previous = active
      const slots = state.get(identity) ?? []
      state.set(identity, slots)
      active = { slots, index: 0 }
      const result = node.type(node.props)
      active = previous
      return visit(result, identity)
    }
    const children = visit(node.props.children, route + '/children')
    return node.type === fragment ? children : [{ ...node, children }]
  }
  const Component = load(CARD).default
  return { load, render: (card) => visit(element(Component, { block: 'film-topics', card })) }
}
const flatten = (tree) => tree.flatMap((node) => typeof node === 'object' ? [node, ...flatten(node.children)] : [])
const nodes = (tree, type) => flatten(tree).filter((n) => n.type === type)
const text = (tree) => tree.map((n) => typeof n === 'object' ? text(n.children) : String(n)).join(' ')
const hasClass = (node, name) => (node.props.className || '').split(' ').includes(name)

function coverage(R) {
  const pool = R.load('lib/viralTopics.ts').VIRAL_TOPICS_POOL
  const T = R.load(LIB)
  const files = new Set()
  for (const topic of pool) {
    const card = T.filmTopicCards([topic.id])[0]
    assert.equal(card.key, topic.id)
    assert.equal(card.title, topic.title)
    assert.equal(card.sub, topic.hook)
    assert.equal(card.href, T.trendingTopicHref(topic))
    const tree = R.render(card)
    if (card.video) {
      assert.equal(card.key, 'mys-02')
      assert.equal(card.houseFilm, true)
      assert.equal(card.illustration, undefined)
      assert.equal(nodes(tree, 'video').length, 1)
      assert.equal(nodes(tree, 'img').length, 0)
      assert(text(tree).includes('Made on Kineo'))
    } else {
      assert.equal(card.engine, null)
      assert.equal(card.poster, null)
      assert.equal(card.scriptReady, true)
      assert.match(card.illustration || '', /^\/trending\/topics\/[a-z]+\.svg$/)
      const asset = path.join(ROOT, 'public', card.illustration)
      assert(fs.existsSync(asset), 'cover missing: ' + asset)
      assert(fs.statSync(asset).size < 20 * 1024, 'cover over 20 KiB')
      const svg = fs.readFileSync(asset, 'utf8')
      assert.match(svg, /viewBox="0 0 360 640"/)
      assert(!/<script\b|<foreignObject\b|<image\b|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)/i.test(svg), 'cover has active/external content')
      files.add(card.illustration)
      assert.equal(nodes(tree, 'video').length, 0)
      assert.equal(nodes(tree, 'img').length, 1)
      assert(text(tree).includes('Illustrative image'))
      assert(text(tree).includes('Script ready'))
      assert(!text(tree).includes('Made on Kineo'))
    }
    assert.equal(nodes(tree, 'a')[0].props.href, card.href)
  }
  return { topics: pool.length, covers: files.size }
}

function errorFallback(R) {
  const card = R.load(LIB).filmTopicCards(['bill-02'])[0]
  let tree = R.render(card)
  assert.equal(nodes(tree, 'img').length, 1)
  assert.equal(typeof nodes(tree, 'img')[0].props.onError, 'function')
  nodes(tree, 'img')[0].props.onError()
  tree = R.render(card)
  assert.equal(nodes(tree, 'img').length, 0, 'broken image must be removed')
  assert(text(tree).includes(card.sub), 'readable hook must survive failure')
  assert(text(tree).includes('Script ready'))
  assert(text(tree).includes('Today’s pick'))
  assert(!text(tree).includes('Illustrative image'), 'do not label failed image as displayed')
  assert.equal(nodes(tree, 'a')[0].props.href, card.href)
  const changed = { ...card, illustration: R.load('lib/trending/topicCovers.ts').topicCoverFor('money') }
  assert.equal(nodes(R.render(changed), 'img').length, 1, 'new cover must retry after previous failure')
}

const R = runtime()
let totals
check('all rotating topics have real film or local illustrative cover, with original destination', () => { totals = coverage(R) })
check('unknown and inherited keys resolve to local default cover', () => {
  const cover = R.load('lib/trending/topicCovers.ts').topicCoverFor
  for (const key of ['new-vertical', '../file', '__proto__', 'constructor', 'toString']) assert.equal(cover(key), '/trending/topics/default.svg')
  assert(fs.existsSync(path.join(ROOT, 'public', cover('new-vertical'))))
})
check('image error removes broken media, preserves hook/CTA and retries a new cover', () => errorFallback(runtime()))
check('pick and illustration share a wrapping badge group, each rendered once', () => {
  const card = R.load(LIB).filmTopicCards(['bill-02'])[0]
  const tree = R.render(card)
  const group = flatten(tree).find((n) => hasClass(n, 'tr-topic-badges'))
  assert(group && text(group.children).includes('Illustrative image') && text(group.children).includes('Today’s pick'))
  assert.equal(flatten(tree).filter((n) => hasClass(n, 'tr-badge-pick')).length, 1)
})

// In-memory fault injection: proves the assertions reject the original missing-cover bug and broken fallback.
check('mutant: removing cover assignment is rejected', () => {
  const source = read(LIB).replace('illustration: topicCoverFor(t.vertical)', 'illustration: undefined')
  assert.notEqual(source, read(LIB))
  assert.throws(() => coverage(runtime({ [LIB]: source })))
})
check('mutant: disabling error transition is rejected', () => {
  const source = read(CARD).replace('onError={() => setFailed(true)}', 'onError={() => {}}')
  assert.notEqual(source, read(CARD))
  assert.throws(() => errorFallback(runtime({ [CARD]: source })))
})
console.log(JSON.stringify({ passed, ...totals, mode: 'offline / real builder and TSX / hook shim, not browser hydration' }))
