// KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
// Fixture offline: componente/efeito/cliques reais; só adaptadores de navegador, hooks, idioma, Link e transporte são dublês.
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const React = require('react'), ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export function renderCardArrival({ root = fixtureRoot, search = '', referrer = '', signedIn = false, kidsCard = true, server = false, language = 'en', overrides = {} } = {}) {
  const events = [], effects = [], state = [], cache = new Map()
  let slot = 0
  const hooks = {
    ...React,
    useState(initial) {
      const at = slot++
      if (!(at in state)) state[at] = typeof initial === 'function' ? initial() : initial
      return [state[at], next => { state[at] = typeof next === 'function' ? next(state[at]) : next }]
    },
    useEffect(effect) { effects.push(effect) },
    useRef() { return { current: null } },
  }
  const mocks = {
    react: hooks,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/components/InterfaceLanguage': { UiLabel: ({ children }) => children, useInterfaceLanguage: () => language, useUiCopy: () => text => text },
    '@/lib/analytics': { trackEvent: (event, metadata) => { events.push({ event, metadata }); return Promise.resolve() } },
  }
  function load(specifier, parent = root) {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier]
    let file = specifier.startsWith('@/') ? resolve(root, specifier.slice(2)) : resolve(parent, specifier)
    if (!file.startsWith(resolve(root) + sep)) throw new Error('Fixture refuses external module: ' + specifier)
    if (!existsSync(file)) file += existsSync(file + '.ts') ? '.ts' : '.tsx'
    const relative = file.slice(resolve(root).length + 1).replace(/\\/g, '/')
    if (!/\.tsx?$/.test(file)) throw new Error('Fixture refuses dependency: ' + relative)
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const source = overrides[relative] ?? readFileSync(file, 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    const browser = server ? {} : { window: { location: { search } }, document: { referrer } }
    vm.runInNewContext(code, { module, exports: module.exports, require: name => load(name, dirname(file)), URL, URLSearchParams, ...browser }, { filename: relative, timeout: 5000 })
    return module.exports
  }
  function links(node) {
    if (Array.isArray(node)) return node.flatMap(links)
    if (!React.isValidElement(node)) return []
    if (typeof node.type === 'function') return links(node.type(node.props))
    if (node.type === 'a' && node.props['data-home-card']) return [{ card: node.props['data-home-card'], href: node.props.href, click: node.props.onClick }]
    return links(node.props.children)
  }
  const Component = load('components/home/HomeThreeCards.tsx').default
  const render = () => {
    slot = 0
    const tree = Component({ signedIn, kidsCard })
    const cards = links(tree), html = renderToStaticMarkup(tree)
    return { cards, html }
  }
  const initial = render()
  if (!server) for (const effect of effects.splice(0)) effect()
  const after = server ? initial : render()
  for (const card of after.cards) card.click()
  return { initialHtml: initial.html, html: after.html, initialOrder: initial.cards.map(c => c.card), order: after.cards.map(c => c.card), hrefs: after.cards.map(c => c.href), events }
}
