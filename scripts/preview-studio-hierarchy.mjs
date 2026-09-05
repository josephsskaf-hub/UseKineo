// Offline proposal renderer: stdout only. Production baseline from origin/main;
// proposed order is a React-tree transformation, NOT a runtime patch.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const React = require('react')
const ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(import.meta.dirname, '..')
const entry = 'app/(dashboard)/studio/StudioClient.tsx'
const baseline = execFileSync('git', ['show', 'origin/main:' + entry], { cwd: root, encoding: 'utf8' })
const cache = new Map()
// Fixture state is keyed by real useState declarations, never a guessed index.
// This is an offline render only: effects and setters are not executed.
const ast = ts.createSourceFile(entry, baseline, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const stateNames = []
function collectStates(node) {
  if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(ast) === 'useState') stateNames.push(node.name.elements[0].getText(ast))
  ts.forEachChild(node, collectStates)
}
collectStates(ast)
let fixture = {}, stateIndex = 0
const react = { ...React, useEffect: () => {}, useMemo: (fn) => fn(), useRef: (value) => ({ current: value }), useState: (value) => {
  const name = stateNames[stateIndex++]
  if (!name) throw new Error('Unexpected hook order; review fixture mapping')
  return [Object.hasOwn(fixture, name) ? fixture[name] : typeof value === 'function' ? value() : value, () => {}]
} }
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const source = file === entry ? baseline : fs.readFileSync(path.join(root, file), 'utf8')
  const module = { exports: {} }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText
  const shim = (name) => {
    if (name === 'react') return react
    if (name === 'next/navigation') return { useRouter: () => ({ push: () => { throw new Error('Navigation forbidden') } }), useSearchParams: () => new URLSearchParams() }
    if (name === 'next/link') return { default: ({ children }) => React.createElement('span', null, children) }
    if (name === '@/lib/analytics') return { trackEvent: () => { throw new Error('Tracking forbidden') } }
    if (name === '@/lib/seriesDoorImpressions') return { useSeriesDoorSeen: () => ({ registrarPorta: () => () => {} }) }
    if (!name.startsWith('@/')) throw new Error('Unexpected dependency: ' + name)
    const relative = name.slice(2)
    for (const extension of ['.ts', '.tsx']) if (fs.existsSync(path.join(root, relative + extension))) return load(relative + extension)
    throw new Error('Missing local dependency: ' + name)
  }
  new Function('require', 'module', 'exports', 'React', js)(shim, module, module.exports, React)
  cache.set(file, module.exports)
  return module.exports
}
function elements(node) { return React.Children.toArray(node.props.children).filter(React.isValidElement) }
export function buildStudioHierarchyProposal(states = {}) {
fixture = states
stateIndex = 0
for (const name of Object.keys(states)) if (!stateNames.includes(name)) throw new Error('Unknown fixture state: ' + name)
const original = load(entry).default()
if (stateIndex !== stateNames.length) throw new Error('Conditional hook/declaration mismatch; review fixture mapping')
const rootChildren = elements(original)
const grid = rootChildren.find((n) => n.props.className === 'grid')
const [rail, right] = elements(grid)
const [engine, format, reference, cost] = elements(rail)
const [idea, camera, steps, ...continuation] = elements(right)
if (elements(rail).length !== 4 || !idea || !camera || !steps || steps.props.className !== 'steps' || !cost || cost.props.className !== 'cost') throw new Error('Baseline shape changed: review before rendering')
function number(node, text) {
  if (!React.isValidElement(node)) return node
  if (node.props.className === 'n') return text ? React.cloneElement(node, {}, text) : null
  return React.cloneElement(node, {}, React.Children.map(node.props.children, (child) => number(child, text)))
}
const e = React.createElement
const newGrid = e('div', { key: 'proposal-grid', className: 'grid composer-proposal-grid' },
  e('section', { className: 'composer-proposal-idea', 'aria-label': 'Your idea' }, number(idea, '1')),
  e('section', { className: 'composer-proposal-settings', 'aria-label': 'Settings and generation' },
    number(engine, '2'), number(format, '3'),
    e('details', { className: 'composer-proposal-optional' }, e('summary', null, 'Optional settings'), number(camera, ''), number(reference, '')),
    cost),
  // These blocks exist only after videos load. The initial empty-state
  // prototype dropped them by destructuring just the first three children.
  continuation.length > 0 ? e('section', { className: 'composer-proposal-continuation', 'aria-label': 'Continue your videos' }, ...continuation) : null,
)
const proposed = React.cloneElement(original, { className: 'stu composer-proposal' }, rootChildren.map((child) => {
  if (child === grid) return newGrid
  if (child.type === 'p' && child.props.className === 'sub') return React.cloneElement(child, {}, 'Your idea first. Review the settings, then generate.')
  return child
}), e('details', { key: 'how', className: 'composer-proposal-how' }, e('summary', null, 'How it works'), steps), e('style', { key: 'proposal-css' }, `
.composer-proposal .composer-proposal-grid{grid-template-columns:minmax(0,1fr)320px;gap:28px}
.composer-proposal-idea{min-width:0;padding:22px;border:1px solid #292a31;border-radius:18px;background:#101014}
.composer-proposal-settings{display:flex;flex-direction:column;gap:14px;min-width:0}
.composer-proposal-continuation{grid-column:1 / -1;min-width:0}
.composer-proposal-optional{border:1px solid #292a31;border-radius:14px;padding:0 14px;background:#101014}
.composer-proposal-optional>summary{min-height:48px;display:list-item;align-content:center;cursor:pointer;font-size:13px;color:#c9ccd3}
.composer-proposal-optional>div{margin:16px 0}.composer-proposal-optional .cams{grid-template-columns:repeat(2,1fr)}
.composer-proposal .hint{line-height:1.6}.composer-proposal textarea{min-height:230px}
.composer-proposal-how{margin-top:24px}.composer-proposal-how>summary{min-height:44px;align-content:center;cursor:pointer;color:#a1a1aa;font-size:13px}
@media(max-width:900px){.composer-proposal .composer-proposal-grid{grid-template-columns:1fr;gap:18px}.composer-proposal-idea{padding:16px}.composer-proposal textarea{min-height:160px}}
`))
return { original, proposed }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const { original, proposed } = buildStudioHierarchyProposal()
// Default preview has no media/account. Fixture tests separately check
// conditional continuation sections without loading or playing video.
const before = renderToStaticMarkup(original)
const after = renderToStaticMarkup(proposed)
for (const html of [before, after]) {
  if (/<(?:script|iframe|video|img)\b/i.test(html)) throw new Error('Unexpected active/media content')
}
const facts = { baseline: execFileSync('git', ['rev-parse', 'origin/main'], { cwd: root, encoding: 'utf8' }).trim(), beforeOrder: ['engine', 'format', 'reference', 'cost', 'idea', 'camera', 'steps'], afterOrder: ['idea', 'engine', 'format', 'optional camera/reference', 'cost', 'optional steps'], runtimeEdited: false, state: 'default initial Studio, empty input, unknown balance, external account' }
console.log(JSON.stringify({ before, after, facts }))
}
