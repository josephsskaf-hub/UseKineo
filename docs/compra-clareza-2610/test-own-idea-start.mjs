// Real TS/TSX in an offline VM. No service SDKs, environment files or API calls.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(path.join(ROOT, 'package.json'))
const ts = require('typescript'), React = require('react'), jsx = require('react/jsx-runtime')
const file = 'lib/growth/ownIdeaStart.ts', componentFile = 'components/growth/OwnIdeaStart.tsx'
const studioFile = 'app/(dashboard)/studio/StudioClient.tsx'
const read = p => readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const denied = () => { throw new Error('Offline test forbids side effects') }
const allowed = new Set([file, componentFile, 'lib/ui/homeThreeCards.ts', 'lib/ads/sampleEntry.ts', 'lib/ui/examplesSelectionSep24.ts', 'lib/publicExamples.ts'])
export function harness({ language = 'en', mutate = text => text } = {}) {
  let goal = 'channel'
  const cache = new Map()
  function load(name, parent = '') {
    if (name === 'react') return { ...React, useState: () => [goal, next => { goal = next }] }
    if (name === 'react/jsx-runtime') return jsx
    if (name === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => language, UiLabel: ({ children }) => children }
    let rel = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? path.posix.join(path.posix.dirname(parent), name) : name
    if (!/\.tsx?$/.test(rel)) rel += '.ts'
    assert.ok(allowed.has(rel), `Unexpected module: ${rel}`)
    if (cache.has(rel)) return cache.get(rel)
    const exports = {}; cache.set(rel, exports)
    const source = rel === file ? mutate(read(rel)) : read(rel)
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, { exports, require: spec => load(spec, rel), URLSearchParams, fetch: denied, window: new Proxy({}, { get: denied }), process: { env: {} } }, { filename: rel, timeout: 4000 })
    return exports
  }
  return { helper: load(file), component: load(componentFile).default }
}
function nodes(node) {
  if (!node || typeof node !== 'object') return []
  return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)]
}
function runContract(h) {
  const { helper: p, component: Component } = h
  const normal = { mode: 'ai', arrivalProtected: false }
  const starter = (text = '', context = normal) => p.applyOwnIdeaStarter(text, context, 'story', 'sea', 'en')
  assert.match(starter(), /fisherman/)
  assert.equal(starter('My precise script'), 'My precise script', 'never replace a draft')
  for (const context of [{ mode: 'clip', arrivalProtected: false }, { mode: 'verbatim', arrivalProtected: false }, { mode: 'ai', arrivalProtected: true }]) {
    assert.equal(starter('', context), '', 'context preserved')
    assert.equal(Component({ ...context, prompt: '', onUseStarter: denied, onReview: denied }), null)
  }
  for (const query of ['prompt=My+script', 'topic=Mars', 'chatgpt_quickstart=idea', 'script_mode=verbatim', 'script_mode=clip', 'film60=1', 'studio_continuation=topic-v1', 'resume=job', 'utm_source=ChatGPT', 'intent_campaign=assistant_link']) assert.equal(p.ownIdeaArrivalProtected(query), true, query)
  assert.equal(p.ownIdeaArrivalProtected('engine=seedance'), false)
  assert.equal(p.ownIdeaArrivalProtected(''), false)
  assert.equal(p.applyOwnIdeaStarter('', normal, 'story', 'untrusted', 'en'), '')
  assert.equal(p.applyOwnIdeaStarter('', normal, 'unknown', 'sea', 'en'), '')
  assert.equal(p.ownIdeaAdsHref(), '/ads/v2?entry=product')
  assert.equal(p.ownIdeaCopyLanguage('de'), 'en')
  assert.match(p.applyOwnIdeaStarter('', normal, 'story', 'sea', 'pt'), /pescador/)
  for (const image of p.OWN_IDEA_REFERENCES) assert.ok(existsSync(path.join(ROOT, 'public', image.poster)), image.poster)
  let called = [], reviewed = 0
  let props = { ...normal, prompt: '', onUseStarter: (...args) => called.push(args), onReview: () => { reviewed++ } }
  let tree = nodes(Component(props))
  assert.equal(tree.find(x => x.type === 'details').props.open, undefined, 'references initially collapsed')
  assert.equal(tree.find(x => x.type === 'a').props.href, '/ads/v2?entry=product')
  assert.ok(tree.filter(x => x.type === 'button').every(x => x.props.type === 'button'))
  tree.find(x => x.props?.className === 'ois-reference').props.onClick()
  assert.deepEqual(called[0], ['channel', 'sea', 'en'])
  tree.filter(x => x.props?.className === 'ois-goal')[1].props.onClick()
  assert.equal(called.length, 1, 'changing goal does not change prompt')
  tree = nodes(Component(props))
  tree.find(x => x.props?.className === 'ois-reference').props.onClick()
  assert.deepEqual(called[1], ['story', 'sea', 'en'])
  tree.find(x => x.props?.className === 'ois-review').props.onClick()
  assert.equal(reviewed, 1)
  tree = nodes(Component({ ...props, prompt: 'Do not change these words' }))
  const filled = tree.filter(x => x.props?.className === 'ois-reference')
  for (const node of filled) { assert.equal(node.props.disabled, true); node.props.onClick() }
  assert.equal(called.length, 2)
}
runContract(harness())
let killed = 0
for (const [from, to] of [['current.trim() || ', ''], ["context.mode === 'ai'", 'true'], ['!context.arrivalProtected', 'true'], ["/ads/v2?entry=${entry}", '/ads/v2?entry=${entry}&autogenerate=1']]) {
  assert.ok(read(file).includes(from))
  assert.throws(() => runContract(harness({ mutate: source => source.replace(from, to) })), `mutant survived: ${from}`)
  killed++
}

// Exercise the actual Studio callback, including a stale empty render followed
// by a user's keystroke before its queued functional state update is applied.
const studio = read(studioFile)
const ast = ts.createSourceFile(studioFile, studio, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let handler, review
function visit(node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'OwnIdeaStart') {
    for (const attr of node.attributes.properties) {
      if (attr.name?.text === 'onUseStarter') handler = attr.initializer.expression.getText(ast)
      if (attr.name?.text === 'onReview') review = attr.initializer.expression.getText(ast)
    }
  }
  ts.forEachChild(node, visit)
}
visit(ast)
assert.ok(handler && review)
const helper = harness().helper
function integration({ current = '', search = '', mode = 'ai', chat = null } = {}) {
  let prompt = current, focused = 0, queued
  const context = { exports: {}, setPrompt: update => { assert.equal(typeof update, 'function'); queued = update }, promptRef: { current: { focus: () => { focused++ } } }, scriptMode: mode, chatGptQuickstart: chat, searchSignature: search, ...helper, fetch: denied, generate: denied, router: { push: denied } }
  vm.runInNewContext(ts.transpileModule(`exports.use = ${handler}; exports.review = ${review}`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, context)
  context.exports.use('story', 'sea', 'en')
  prompt = queued(prompt)
  context.exports.review()
  return { prompt, focused }
}
assert.match(integration().prompt, /fisherman/)
assert.equal(integration({ current: 'I typed after the last render' }).prompt, 'I typed after the last render')
assert.equal(integration({ search: 'chatgpt_quickstart=finished_script' }).prompt, '')
assert.equal(integration({ mode: 'clip' }).prompt, '')
assert.equal(integration({ mode: 'verbatim' }).prompt, '')
assert.equal(integration({ chat: 'idea' }).prompt, '')
assert.equal(integration().focused, 2)

// Exact inverse proof: every other Studio byte, including boat, cost, gates,
// engine ordering and generation callback, is preserved against the approved base.
const base = execFileSync('git', ['show', `563d7f30064cb0e7ee392490d0e9e48e95c4e1bc:${studioFile}`], { cwd: ROOT, encoding: 'utf8' }).replace(/\r\n/g, '\n')
const oldStart = base.indexOf('            <div className="row" style={{ marginBottom: 8 }}>')
const oldEnd = base.indexOf('            {/* KINEO-ROTEIRO-CURTO-SEM-FALHA-', oldStart)
assert.ok(oldStart > 0 && oldEnd > oldStart)
const unwrapped = studio.replace(/\/\/ BEGIN COMPRA-CLAREZA-2610 OWN-IDEA IMPORTS\n[\s\S]*?\/\/ END COMPRA-CLAREZA-2610 OWN-IDEA IMPORTS\n/, '').replace(/            \{\/\* BEGIN COMPRA-CLAREZA-2610 OWN-IDEA START \*\/\}\n[\s\S]*?            \{\/\* END COMPRA-CLAREZA-2610 OWN-IDEA START \*\/\}\n/, base.slice(oldStart, oldEnd))
assert.equal(unwrapped, base, 'no unrelated Studio byte changed')
console.log(`Own idea PASS: real component + real Studio handlers, draft/arrival/mode guards, Ads intent, owned assets, exact inverse, ${killed} killed mutants`)
