// Offline contract tests. Executes the actual components with routing, hooks
// and DOM boundaries simulated. No API, credentials, rendering jobs or writes.
// This is not a browser / accessibility certification.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(import.meta.dirname, '..')
let pathname = '/studio'
let effects = []
let focused = 0
const makeDetails = () => ({ open: true, querySelector: () => ({ focus: () => focused++ }) })
let details = [makeDetails(), makeDetails()]
const inside = {}
const nav = {
  querySelectorAll: () => details.filter((d) => d.open),
  querySelector: () => details.find((d) => d.open),
  contains: (target) => target === inside,
}
const hooks = {
  ...React,
  useRef: () => ({ current: nav }),
  useState: (initial) => [initial, () => {}],
  useEffect: (effect) => effects.push(effect),
}
const Link = ({ children, ...props }) => React.createElement('a', props, children)
const TopBar = () => null
function loadComponent(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020,
  } }).outputText
  const module = { exports: {} }
  const shim = (name) => {
    if (name === 'react') return hooks
    if (name === 'next/link') return { default: Link }
    if (name === 'next/navigation') return { usePathname: () => pathname }
    if (name === '@/components/TopBar') return { default: TopBar }
    if (name.startsWith('@/components/')) return { default: () => null }
    throw new Error('Unexpected import: ' + name)
  }
  new Function('require', 'module', 'exports', 'React', output)(shim, module, module.exports, React)
  return module.exports.default
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...nodes(tree.props?.children)]
}
const MobileNav = loadComponent('components/MobileNav.tsx')
const Shell = loadComponent('app/(dashboard)/DashboardShell.tsx')
let passed = 0
function check(name, test) { test(); passed++; console.log('OK ' + name) }
const render = (route = '/studio', signedIn = true) => {
  pathname = route
  effects = []
  return MobileNav({ isLoggedIn: signedIn })
}
const tree = render()
const links = nodes(tree).filter((n) => n.type === Link)
const expected = ['/studio', '/history', '/pricing', '/images', '/audio', '/avatar', '/animate', '/thumbnail-generator', '/library', '/viral-now', '/channel', '/autopilot', '/referral', '/affiliate', '/account']
check('all 15 destinations, no duplicates', () => assert.deepEqual(links.map((n) => n.props.href).sort(), expected.sort()))
for (const href of expected) {
  check('existing route ' + href, () => assert.ok(
    ['app', 'app/(dashboard)'].some((base) => fs.existsSync(path.join(root, base, href.slice(1), 'page.tsx'))),
  ))
}
check('five primary slots', () => {
  const row = nodes(tree).find((n) => n.props.className === 'kineo-mobile-row')
  assert.equal(row.props.children.length, 5)
})
check('guest cannot see invite, affiliate or account', () => {
  const guestLinks = nodes(render('/studio', false)).filter((n) => n.type === Link).map((n) => n.props.href)
  for (const href of ['/referral', '/affiliate', '/account']) assert.ok(!guestLinks.includes(href))
  assert.ok(guestLinks.includes('/pricing'))
})
for (const [route, active] of [['/studio', true], ['/studio/create', true], ['/studio-other', false]]) {
  check('route boundary ' + route, () => {
    const link = nodes(render(route)).find((n) => n.props.href === '/studio')
    assert.equal(Boolean(link.props['aria-current']), active)
  })
}
check('tools active on child route', () => {
  const tools = nodes(render('/images/edit')).find((n) => n.type === 'summary')
  assert.equal(tools.props['data-active'], true)
})
check('native disclosures and named navigation', () => {
  assert.equal(tree.props['aria-label'], 'Mobile navigation')
  assert.equal(nodes(tree).filter((n) => n.type === 'details').length, 2)
  assert.equal(nodes(tree).filter((n) => n.props.role === 'menu').length, 0)
})
check('opening another group closes the first', () => {
  details = [makeDetails(), makeDetails()]
  nodes(tree).find((n) => n.type === 'details').props.onToggle({ currentTarget: details[1] })
  assert.equal(details[0].open, false)
  assert.equal(details[1].open, true)
})
check('Escape closes and restores focus', () => {
  let prevented = false
  tree.props.onKeyDown({ key: 'Escape', preventDefault: () => { prevented = true } })
  assert.ok(prevented)
  assert.equal(details[1].open, false)
  assert.equal(focused, 1)
})
check('Tab inside stays open; Tab outside closes', () => {
  details = [makeDetails()]
  tree.props.onBlur({ currentTarget: nav, relatedTarget: inside })
  assert.equal(details[0].open, true)
  tree.props.onBlur({ currentTarget: nav, relatedTarget: null })
  assert.equal(details[0].open, false)
})
check('sheet link closes before client navigation', () => {
  details = [makeDetails()]
  links.find((n) => n.props.href === '/images').props.onClick()
  assert.equal(details[0].open, false)
})
check('route/auth change closes sheets, no generation invoked', () => {
  details = [makeDetails()]
  render('/pricing')
  effects[0]()
  assert.equal(details[0].open, false)
})
check('outside pointer listener cleaned up', () => {
  const listeners = new Map()
  class FakeNode {}
  globalThis.Node = FakeNode
  globalThis.document = {
    addEventListener: (key, callback) => listeners.set(key, callback),
    removeEventListener: (key, callback) => { assert.equal(listeners.get(key), callback); listeners.delete(key) },
  }
  const cleanup = effects[1]()
  details = [makeDetails()]
  listeners.get('pointerdown')({ target: new FakeNode() })
  assert.equal(details[0].open, false)
  cleanup()
  assert.equal(listeners.size, 0)
  delete globalThis.document
  delete globalThis.Node
})
for (const [route, title] of Object.entries({ '/studio': 'Studio', '/images': 'Images', '/audio': 'Audio', '/library': 'Library', '/studio/create': 'Generate New Short', '/pricing': 'Pricing', '/history': 'My Videos' })) {
  check('real shell caller title ' + route, () => {
    pathname = route
    const shell = Shell({ children: null, userEmail: '', isPro: false, generationsUsed: 0, isLoggedIn: false })
    assert.equal(nodes(shell).find((n) => n.type === TopBar).props.title, title)
  })
}
check('SSR outputs links and controls without network', () => {
  const html = renderToStaticMarkup(render())
  assert.ok(html.includes('href="/pricing"'))
  assert.ok(html.includes('aria-label="Close Tools"'))
  assert.ok(html.includes('safe-area-inset-bottom'))
  assert.ok(!html.includes('<form'))
})
console.log(passed + ' contract checks passed. Browser/visual approval remains pending.')
