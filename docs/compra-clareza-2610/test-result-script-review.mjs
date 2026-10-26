// Read-only product QA. The only execution is local TS/TSX in bounded VMs and
// React SSR. No network, credentials, services, browser, render or payment.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(process.argv.find(arg => arg.startsWith('--root='))?.slice(7) || process.cwd())
const require = createRequire(path.join(ROOT, 'package.json'))
const ts = require('typescript'), React = require('react'), jsx = require('react/jsx-runtime')
const { renderToStaticMarkup } = require('react-dom/server')
const FILE = 'app/(dashboard)/generate/GenerateClient.tsx'
const COMPONENT = 'components/growth/ResultScriptReview.tsx'
const BASE = '563d7f30064cb0e7ee392490d0e9e48e95c4e1bc'
const read = file => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n')
const source = read(FILE), componentSource = read(COMPONENT)
const baseSource = execFileSync('git', ['show', `${BASE}:${FILE}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replace(/\r\n/g, '\n')
const parse = (text, file = FILE) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const ast = parse(source), baseAst = parse(baseSource)
const printer = ts.createPrinter({ removeComments: true })
const denied = name => () => { throw new Error(`Offline QA forbids ${name}`) }
const find = (root, predicate) => {
  const hits = []
  function walk(node) { if (predicate(node)) hits.push(node); ts.forEachChild(node, walk) }
  walk(root); return hits
}
const named = (root, name) => {
  const result = find(root, n => ts.isFunctionDeclaration(n) && n.name?.text === name)
  assert.equal(result.length, 1, `exactly one real function ${name}`)
  return result[0]
}
const back = named(ast, 'handleBackToEdit').getText(ast)
const handler = named(ast, 'handleReviewResultScript').getText(ast)
const versionNode = find(parse(read('lib/growth/postVideoCapacity.ts')), n => ts.isVariableDeclaration(n) && n.name?.text === 'POST_VIDEO_CAPACITY_VERSION')[0]
assert.ok(versionNode)
const versionExpression = versionNode.initializer
const versionLiteral = ts.isAsExpression(versionExpression) ? versionExpression.expression : versionExpression
assert.ok(ts.isStringLiteral(versionLiteral), 'version comes from the actual exported literal')
const VERSION = versionLiteral.text
let checks = 0
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`) }

function compile(text, file = 'fixture.tsx') {
  return ts.transpileModule(text, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
}
function componentModule(text = componentSource, hooks = React) {
  const exports = {}
  vm.runInNewContext(compile(text, COMPONENT), {
    exports,
    require(name) {
      if (name === 'react') return hooks
      if (name === 'react/jsx-runtime') return jsx
      if (name === '@/components/InterfaceLanguage') return { UiLabel: ({ children }) => children, useUiCopy: () => en => en }
      // The component only consumes the actual version literal. No pricing or
      // entitlement implementation is replaced or exercised by this UI test.
      if (name === '@/lib/growth/postVideoCapacity') return { POST_VIDEO_CAPACITY_VERSION: VERSION }
      throw new Error(`Unexpected import ${name}`)
    },
    fetch: denied('fetch'), window: new Proxy({}, { get: denied('window') }),
    localStorage: new Proxy({}, { get: denied('storage') }),
    setTimeout: denied('timer'), process: Object.freeze({ env: Object.freeze({}) }),
  }, { timeout: 3000, filename: COMPONENT })
  return exports.default
}
function treeNodes(node) {
  if (!node || typeof node !== 'object') return []
  return [node, ...React.Children.toArray(node.props?.children).flatMap(treeNodes)]
}
function interactive(initialScript, onReview, text = componentSource) {
  const cells = []; let index = 0
  const hooks = { ...React, useState(initial) {
    const cell = index++
    if (!(cell in cells)) cells[cell] = typeof initial === 'function' ? initial() : initial
    return [cells[cell], next => { cells[cell] = typeof next === 'function' ? next(cells[cell]) : next }]
  } }
  const Component = componentModule(text, hooks)
  return { render() { index = 0; return treeNodes(Component({ initialScript, onReview })) } }
}

function machine({ prompt = 'Original exact script', structured = { scenes: ['original'] }, timer = 73, code = handler } = {}) {
  const fixed = { mode: 'ai', aiEngine: 'seedance', scriptMode: 'verbatim', duration: 35, cost: 25, credits: 90, finalVideoUrl: 'https://media.invalid/completed.mp4', finalVideo: 'finished-file', publicVideoId: 'finished-video-id' }
  const events = [], cancelled = []
  const context = {
    ...fixed, prompt, phase: 'done', error: 'previous-warning',
    structuredScriptRef: { current: structured }, pollTimerRef: { current: timer },
    exports: {},
    setPrompt(value) { events.push(['prompt', value]); context.prompt = value },
    setPhase(value) { events.push(['phase', value]); context.phase = value },
    setError(value) { events.push(['error', value]); context.error = value },
    clearTimeout(value) { cancelled.push(value) },
    fetch: denied('fetch'), generate: denied('generate'), handleGenerate: denied('handleGenerate'),
    handleGenerateGuarded: denied('handleGenerateGuarded'), trackEvent: denied('telemetry from editing'),
    router: { push: denied('navigation'), replace: denied('navigation') }, checkout: denied('checkout'),
    setMode: denied('mode change'), setAiEngine: denied('engine change'), setCredits: denied('credit change'),
    setScriptMode: denied('script mode change'), setDuration: denied('duration change'), setFinalVideoUrl: denied('finished file change'),
  }
  vm.runInNewContext(compile(`${back}\n${code}\nexports.review = handleReviewResultScript; exports.back = handleBackToEdit;`, 'handlers.ts'), context, { timeout: 3000 })
  const assertFixed = () => { for (const [key, value] of Object.entries(fixed)) assert.equal(context[key], value, `preserve ${key}`) }
  return { context, events, cancelled, fixed, assertFixed, review: context.exports.review, back: context.exports.back }
}

function handlerContract(code = handler) {
  for (const input of ['', ' ', '\n\t  ']) {
    const m = machine({ code }); const structured = m.context.structuredScriptRef.current
    m.review(input)
    assert.equal(m.context.phase, 'done'); assert.equal(m.context.prompt, 'Original exact script')
    assert.equal(m.context.structuredScriptRef.current, structured)
    assert.equal(m.context.pollTimerRef.current, 73); assert.equal(m.context.error, 'previous-warning')
    assert.deepEqual(m.events, []); assert.deepEqual(m.cancelled, []); m.assertFixed()
  }
  const original = '  Original exact script\n'
  const same = machine({ prompt: original, code }); const originalRef = same.context.structuredScriptRef.current
  same.review(original)
  assert.equal(same.context.prompt, original, 'preserve exact unchanged whitespace')
  assert.equal(same.context.structuredScriptRef.current, originalRef, 'identical script preserves structured ref')
  assert.equal(same.context.phase, 'idle'); assert.equal(same.context.error, null)
  assert.equal(same.context.pollTimerRef.current, null); assert.deepEqual(same.cancelled, [73]); same.assertFixed()
  for (const input of ['A different story', '  My revised words\nkeep this paragraph\t', 'Original exact script ']) {
    const m = machine({ code }); m.review(input)
    assert.equal(m.context.prompt, input, 'do not trim, translate or rewrite user text')
    assert.equal(m.context.structuredScriptRef.current, null, 'changed words discard stale structured script')
    assert.equal(m.context.phase, 'idle'); assert.equal(m.context.error, null)
    assert.deepEqual(m.events.map(event => event[0]), ['prompt', 'phase', 'error']); m.assertFixed()
  }
  const m = machine({ code, timer: null }); m.review('A revised idea')
  assert.deepEqual(m.cancelled, []); m.assertFixed()
}
function componentContract(text = componentSource) {
  const calls = [], initial = '  Original script\nsecond line\t'
  const h = interactive(initial, script => calls.push(script), text)
  let nodes = h.render(), area = nodes.find(n => n.type === 'textarea'), button = nodes.find(n => n.type === 'button')
  assert.equal(area.props.value, initial); assert.deepEqual(calls, [], 'mount must not review')
  assert.equal(button.props.type, 'button'); assert.equal(button.props.disabled, false)
  assert.equal(nodes.find(n => n.type === 'details').props.open, undefined, 'local editor starts collapsed')
  const revised = '  A draft with <angle brackets> & accents: ação\nsecond line\t'
  area.props.onChange({ target: { value: revised } })
  assert.deepEqual(calls, [], 'typing must not review or dispatch')
  nodes = h.render(); area = nodes.find(n => n.type === 'textarea'); button = nodes.find(n => n.type === 'button')
  assert.equal(area.props.value, revised)
  button.props.onClick(); assert.deepEqual(calls, [revised], 'only explicit click reviews exact text')
  for (const blank of ['', ' ', '\n\t']) {
    area.props.onChange({ target: { value: blank } }); nodes = h.render()
    area = nodes.find(n => n.type === 'textarea'); button = nodes.find(n => n.type === 'button')
    assert.equal(button.props.disabled, true)
    button.props.onClick(); assert.deepEqual(calls, [revised], 'empty click remains guarded even when invoked directly')
  }
}

check('actual SSR: markup, escaped text, version-only metadata, no callback', () => {
  const Component = componentModule()
  const html = renderToStaticMarkup(React.createElement(Component, { initialScript: '  <script>fixture</script>\n& exact text  ', onReview: denied('SSR callback') }))
  assert.ok(html.includes('&lt;script&gt;fixture&lt;/script&gt;'))
  assert.ok(!html.includes('<script>fixture'))
  assert.ok(html.includes(`data-result-script-review="${VERSION}"`))
  const empty = renderToStaticMarkup(React.createElement(Component, { initialScript: '  \n', onReview: denied('SSR callback') }))
  assert.match(empty, /<button[^>]*disabled=""/)
  assert.equal((html.match(/<textarea/g) ?? []).length, 1)
})
check('actual component interactions: draft, whitespace, empty guard, explicit click', () => componentContract())
check('actual handlers: changed/identical text, timer, idle phase, unrelated state untouched', () => handlerContract())
check('component → actual Generate handler end to end without network or billing', () => {
  const m = machine()
  const h = interactive(m.context.prompt, m.review)
  let nodes = h.render()
  nodes.find(n => n.type === 'textarea').props.onChange({ target: { value: '  My next version\n' } })
  assert.equal(m.context.phase, 'done'); assert.equal(m.context.prompt, 'Original exact script'); assert.deepEqual(m.events, [])
  nodes = h.render(); nodes.find(n => n.type === 'button').props.onClick()
  assert.equal(m.context.prompt, '  My next version\n'); assert.equal(m.context.phase, 'idle')
  assert.equal(m.context.structuredScriptRef.current, null); m.assertFixed()
})

const tag = node => ts.isJsxElement(node) ? node.openingElement.tagName.getText() : ts.isJsxSelfClosingElement(node) ? node.tagName.getText() : null
const attrs = node => ts.isJsxElement(node) ? node.openingElement.attributes.properties : node.attributes.properties
const attr = (node, name) => attrs(node).find(item => ts.isJsxAttribute(item) && item.name.text === name)
const expression = (node, name) => attr(node, name)?.initializer?.expression
check('AST placement: unique result review, outside folded result options, key per film', () => {
  const reviews = find(ast, n => tag(n) === 'ResultScriptReview')
  assert.equal(reviews.length, 1)
  const review = reviews[0]
  assert.equal(expression(review, 'initialScript').getText(ast), 'prompt')
  assert.equal(expression(review, 'onReview').getText(ast), 'handleReviewResultScript')
  let parent = review.parent
  while (parent) {
    if (tag(parent) === 'details') assert.notEqual(attr(parent, 'className')?.initializer?.text, 'done-result-options')
    parent = parent.parent
  }
  const fold = find(ast, n => tag(n) === 'details' && attr(n, 'className')?.initializer?.text === 'done-result-options')
  assert.equal(fold.length, 1); assert.ok(review.pos < fold[0].pos)
  const key = expression(review, 'key').getText(ast)
  const keyOf = (publicVideoId, finalVideoUrl) => vm.runInNewContext(key, { publicVideoId, finalVideoUrl }, { timeout: 1000 })
  assert.equal(keyOf('film-a', 'url-a'), 'film-a'); assert.equal(keyOf('film-b', 'url-a'), 'film-b')
  assert.equal(keyOf(null, 'url-a'), 'url-a'); assert.equal(keyOf(null, 'url-b'), 'url-b')
  assert.equal(keyOf(null, null), 'result')
})

function canonical(node, root, stripVersion = false) {
  const transformed = ts.transform(node, [context => {
    const visit = current => {
      if (stripVersion && ts.isObjectLiteralExpression(current)) return ts.factory.updateObjectLiteralExpression(current, current.properties.filter(p => !(ts.isPropertyAssignment(p) && p.name.getText(root) === 'value_copy_version')).map(p => ts.visitNode(p, visit)))
      return ts.visitEachChild(current, visit, context)
    }
    return visit
  }])
  const text = printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], root)
  transformed.dispose(); return text
}
check('AST telemetry: existing event bodies preserved, additions contain only version constant', () => {
  const events = root => find(root, n => ts.isCallExpression(n) && n.expression.getText(root) === 'trackEvent')
  const current = events(ast), before = events(baseAst)
  assert.equal(current.length, before.length, 'no additional event carries the edited script')
  for (let i = 0; i < current.length; i++) assert.equal(canonical(current[i], ast, true), canonical(before[i], baseAst, true), `event ${i} payload preserved`)
  const versions = find(ast, n => ts.isPropertyAssignment(n) && n.name.getText(ast) === 'value_copy_version')
  assert.ok(versions.length > 0)
  for (const p of versions) assert.equal(p.initializer.getText(ast), 'POST_VIDEO_CAPACITY_VERSION')
  const componentAst = parse(componentSource, COMPONENT)
  const dataAttrs = find(componentAst, n => ts.isJsxAttribute(n) && n.name.text.startsWith('data-'))
  assert.equal(dataAttrs.length, 1)
  assert.equal(dataAttrs[0].initializer.expression.getText(componentAst), 'POST_VIDEO_CAPACITY_VERSION')
})
check('AST checkout/dispatch callback bodies and legacy back-to-edit preserved', () => {
  const declarations = root => find(root, n => ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n))
  const before = declarations(baseAst), current = declarations(ast)
  const sensitive = n => {
    const text = n.getText(baseAst)
    // Choose callback bodies that actually call financial/dispatch paths, not their labels.
    return find(n, call => ts.isCallExpression(call) && /checkout|Checkout|handleRemoveWatermark|handleSingleExport|handleUnlock|handleGenerate|GenerateGuarded/.test(call.expression.getText(baseAst))).length > 0 && n !== named(baseAst, 'GenerateClient')
  }
  const currentSet = new Set(current.map(n => canonical(n, ast, true)))
  let protectedCount = 0
  for (const n of before.filter(sensitive)) {
    // The top-level GenerateClient is intentionally excluded above; nested
    // existing functions and JSX callbacks must still be byte-equivalent ASTs.
    assert.ok(currentSet.has(canonical(n, baseAst, true)), `sensitive callback changed at ${baseAst.getLineAndCharacterOfPosition(n.pos).line + 1}`)
    protectedCount++
  }
  assert.ok(protectedCount > 5)
  assert.equal(canonical(named(ast, 'handleBackToEdit'), ast), canonical(named(baseAst, 'handleBackToEdit'), baseAst))
  console.log(`Protected ${protectedCount} existing billing/dispatch callback bodies`)
})

check('behavioral mutants are rejected', () => {
  let killed = 0
  const handlerMutants = [
    ['if (!reviewed.trim()) return', ''],
    ['setPrompt(reviewed)', 'setPrompt(reviewed.trim())'],
    ['if (reviewed !== prompt) structuredScriptRef.current = null', ''],
    ['if (reviewed !== prompt) structuredScriptRef.current = null', 'structuredScriptRef.current = null'],
    ['handleBackToEdit()', 'handleGenerateGuarded()'],
  ]
  for (const [from, to] of handlerMutants) {
    assert.ok(handler.includes(from)); assert.throws(() => handlerContract(handler.replace(from, to)), `survived: ${from}`); killed++
  }
  const uiMutants = [
    ['setDraft(event.target.value)', 'onReview(event.target.value)'],
    ['if (draft.trim()) onReview(draft)', 'onReview(draft)'],
    ['onReview(draft)', 'onReview(draft.trim())'],
  ]
  for (const [from, to] of uiMutants) {
    assert.ok(componentSource.includes(from)); assert.throws(() => componentContract(componentSource.replace(from, to)), `survived: ${from}`); killed++
  }
  assert.equal(killed, 8); console.log(`Killed ${killed} behavioral mutants`)
})
console.log(JSON.stringify({ status: 'PASS', checks, behavioralMutantsKilled: 8, component: COMPONENT, base: BASE, scope: 'offline component + real handlers + AST integration; no production validation' }))
