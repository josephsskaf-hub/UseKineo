import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = new URL('../', import.meta.url)
function load(file, imports = {}) {
  const code = ts.transpileModule(readFileSync(new URL(file, root), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)((id) => {
    if (!(id in imports)) throw Error(`Unexpected dependency: ${id}`)
    return imports[id]
  }, module, module.exports)
  return module.exports
}
const policy = load('lib/growth/originalityRecipe.ts')
const state = [], events = []
let cursor = 0, focused = false, selected = false, copied = ''
const ref = { current: { focus: () => { focused = true }, select: () => { selected = true } } }
const jsx = (type, props) => ({ type, props })
const Component = load('app/can-you-monetize-ai-videos/OriginalityRecipeBuilder.tsx', {
  react: {
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], (v) => { state[i] = v }] },
    useMemo: (fn) => fn(), useRef: () => ref,
  },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  '@/lib/analytics': { trackEvent: (name, meta) => events.push({ name, meta }), rememberSignupCampaign() {} },
  '@/lib/growth/originalityRecipe': policy,
}).default
function render() { cursor = 0; return Component() }
function all(node) {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(all)
  return [node, ...all(node.props?.children)]
}
function find(tree, predicate) { return all(tree).find(predicate) }
function byId(tree, id) { return find(tree, (n) => n.props?.id === id) }
let tree = render()
assert.equal(byId(tree, 'originality-brief-preview'), undefined)
byId(tree, 'monetization-originality-topic').props.onChange({ target: { value: '   ' } })
tree = render()
let prevented = false
find(tree, n => n.type === 'form').props.onSubmit({ preventDefault() { prevented = true } })
assert.equal(prevented, true, 'whitespace cannot submit an empty brief')
assert.equal(events.length, 0, 'invalid submission emits no conversion events')
byId(tree, 'monetization-originality-topic').props.onChange({ target: { value: 'dream memory' } })
tree = render()
for (const recipe of policy.ORIGINALITY_RECIPE_OPTIONS) {
  find(tree, n => n.props?.type === 'radio' && n.props.value === recipe.id).props.onChange()
  tree = render()
  const preview = byId(tree, 'originality-brief-preview')
  const hidden = find(tree, n => n.type === 'input' && n.props.name === 'prompt')
  assert.equal(preview.props.value, policy.buildOriginalityPrompt('dream memory', recipe.id))
  assert.equal(preview.props.value, hidden.props.value, 'preview and submitted brief match')
  assert.equal(preview.props.readOnly, true)
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => { copied = text } } } })
await find(tree, n => n.type === 'button' && n.props.type === 'button').props.onClick()
assert.equal(copied, byId(tree, 'originality-brief-preview').props.value)
assert.deepEqual(events[0], { name: 'monetization_originality_brief_copied', meta: {
  source: 'starter_monetization_originality_2026_08_28', version: 'originality_brief_preview_v1', recipe_id: 'practical_breakdown',
} }, 'copy telemetry excludes visitor text')
const eventCount = events.length
navigator.clipboard.writeText = async () => { throw Error('Clipboard denied') }
await find(tree, n => n.type === 'button' && n.props.type === 'button').props.onClick()
assert.equal(focused && selected, true, 'clipboard denial enables native manual copy')
assert.equal(events.length, eventCount, 'clipboard denial does not claim successful delivery')
tree = render()
assert.match(find(tree, n => n.props?.role === 'status').props.children, /Select and copy/)
find(tree, n => n.type === 'form').props.onSubmit({ preventDefault() { throw Error('Valid submission blocked') } })
assert.equal(events.at(-1).meta.destination, '/signup')
assert.equal(events.at(-1).meta.brief_version, 'originality_brief_preview_v1')
console.log('PASS: brief preview, four recipes, exact handoff, clipboard success/denial and whitespace guard')
