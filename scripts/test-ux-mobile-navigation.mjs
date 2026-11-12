// Offline contract tests. Executes the actual components with routing, hooks
// and DOM boundaries simulated. No API, credentials, rendering jobs or writes.
// This is not a browser / accessibility certification.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

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
const loadPure = createOfflineLoader()
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
    if (name.startsWith('@/lib/')) return loadPure(name)
    if (name === '@/components/InterfaceLanguage') return { UiLabel: ({ children }) => children }
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
// Founder 09/10 menu-enxuto + 13/10 duas-portas/trending: removed menu items retain their direct routes.
// KINEO-GALERIA-HOME-2710 — reancorado 27/10 (fundador: item "Made with Kineo" no menu): /made-with-kineo entra no "More" do celular, logo depois do Trending.
// KINEO-JUNTA-TRENDING-3110 — reancorado 30/10: o Trending virou o topo do Made with Kineo (/trending redireciona), saiu do "More".
const expected = ['/studio', '/ads/new', '/library', '/pricing', '/made-with-kineo', '/images', '/clips', '/spaces', '/kids-cartoon', '/affiliate', '/account'] // KINEO-GALERIA-HOME-2710 · KINEO-CARTOON-NO-MENU-0511
// KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — Make a film · Product ads · Cartoon passam pela entrada
// única (lib/create/entry.ts): o destino ANTIGO segue sendo a identidade do item (medição e ativo); o link abre a tela nova (/create/<aba>).
const ENTRY = loadPure('@/lib/create/entry')
const entrada = (href) => ENTRY.createEntryForLegacyHref(href, true) // logado (o render padrão); KINEO-ENTRADAS-SO-LOGADO-1011: visitante fica no antigo
assert.deepEqual(['/studio', '/ads/new', '/kids-cartoon'].map(entrada), ['/create/film?intent_campaign=studio_simple', '/create/ads', '/create/cartoon'])
check('all 11 approved destinations, no duplicates', () => assert.deepEqual(links.map((n) => n.props.href).sort(), expected.map(entrada).sort()))
for (const href of expected) {
  check('existing route ' + href, () => assert.ok(
    ['app', 'app/(dashboard)'].some((base) => fs.existsSync(path.join(root, base, href.slice(1), 'page.tsx'))),
  ))
  if (entrada(href) !== href) check('existing route ' + entrada(href), () => assert.ok(/^\/create\/(film|cartoon|ads)(\?|$)/.test(entrada(href)) && fs.existsSync(path.join(root, 'app/create/[tab]/page.tsx'))))
}
check('five primary slots', () => {
  const row = nodes(tree).find((n) => n.props.className === 'kineo-mobile-row')
  assert.equal(row.props.children.length, 5)
})
check('guest cannot see invite, affiliate or account', () => {
  const guestLinks = nodes(render('/studio', false)).filter((n) => n.type === Link).map((n) => n.props.href)
  for (const href of ['/studio', '/ads/new', '/kids-cartoon']) assert.ok(guestLinks.includes(href) && !guestLinks.some((h) => h.startsWith('/create/'))) // KINEO-ENTRADAS-SO-LOGADO-1011 — visitante: o destino de hoje
  for (const href of ['/referral', '/affiliate', '/account']) assert.ok(!guestLinks.includes(href))
  assert.ok(guestLinks.includes('/pricing'))
})
for (const [route, active] of [['/studio', true], ['/studio/create', true], ['/studio-other', false]]) {
  check('route boundary ' + route, () => {
    const link = nodes(render(route)).find((n) => n.props.href === entrada('/studio') && n.props['data-nav-item'] === 'video') // KINEO-ENTRADAS-TELA-NOVA-1011 — o ativo segue o destino antigo
    assert.equal(Boolean(link.props['aria-current']), active)
  })
}
check('tools active on child route', () => {
  const tools = nodes(render('/images/edit')).find((n) => n.type === 'summary')
  assert.equal(tools.props['data-active'], true)
})
check('native disclosures and named navigation', () => {
  assert.equal(tree.props['aria-label'], 'Mobile navigation')
  assert.equal(nodes(tree).filter((n) => n.type === 'details').length, 1)
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
// KINEO-LIBRARY-MOLDURA-NOVA-1211 [fundador 12/11: "a Library volta no fluxo antigo"] — a /library saiu desta lista: ela abre na moldura da tela nova
// (sem o topo antigo e sem a lateral); a checagem logo abaixo trava isso. As outras telas seguem na casca de sempre.
for (const [route, title] of Object.entries({ '/studio': 'Studio', '/images': 'Images', '/audio': 'Audio', '/studio/create': 'Studio', '/pricing': 'Pricing', '/history': 'My Videos' })) {
  check('real shell caller title ' + route, () => {
    pathname = route
    const shell = Shell({ children: null, userEmail: '', isPro: false, generationsUsed: 0, isLoggedIn: false })
    assert.equal(nodes(shell).find((n) => n.type === TopBar).props.title, title)
  })
}
check('/library opens in the new frame: no old top bar, no sidebar', () => { // KINEO-LIBRARY-MOLDURA-NOVA-1211
  pathname = '/library'
  const shell = Shell({ children: null, userEmail: '', isPro: false, generationsUsed: 0, isLoggedIn: false })
  assert.equal(nodes(shell).filter((n) => n.type === TopBar).length, 0)
  assert.ok(nodes(shell).some((n) => n.props && n.props['data-dashboard-moldura'] === 'nova'))
})
check('SSR outputs links and controls without network', () => {
  const html = renderToStaticMarkup(render())
  assert.ok(html.includes('href="/pricing"'))
  assert.ok(html.includes('aria-label="Close More"'))
  assert.ok(html.includes('safe-area-inset-bottom'))
  assert.ok(html.includes('.kineo-mobile-nav:has(details[open]){z-index:71}'), 'open tools clear existing install/push layers; verify in browser too')
  assert.ok(!html.includes('<form'))
})
console.log(passed + ' contract checks passed. Browser/visual approval remains pending.')
