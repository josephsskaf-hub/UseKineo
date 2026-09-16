// Offline execution of the real route, component state and purchase handlers.
// Network, effects, analytics and payment providers are not executed.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript'), React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
export const BASE = 'd95c44b35843168e6dd029c3b52096ddb25edb8d'
const source = (file, before) => before
  ? execFileSync('git', ['show', `${BASE}:${file}`], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(path.join(root, file), 'utf8')
const entry = 'app/pricing/PricingClient.tsx'

export function fixture(before = false) {
  const ast = ts.createSourceFile(entry, source(entry, before), 99, true, ts.ScriptKind.TSX)
  const stateNames = []
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) &&
      node.initializer && ts.isCallExpression(node.initializer) &&
      node.initializer.expression.getText(ast) === 'useState') stateNames.push(node.name.elements[0].getText(ast))
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const cache = new Map(), launches = [], events = []
  let hook = 0, state = {}, previousKey = Symbol('initial'), query = ''
  const noop = () => {}
  const forbidden = () => { throw new Error('Network/DB forbidden in offline test') }
  function load(file) {
    file = file.replaceAll('\\', '/')
    if (cache.has(file)) return cache.get(file)
    const module = { exports: {} }; cache.set(file, module.exports)
    const output = ts.transpileModule(source(file, before), {
      fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    function resolve(name) {
      if (name === 'react') return { ...React, useEffect: noop, useRef: current => ({ current }),
        useState: initial => {
          const key = stateNames[hook++]
          assert.ok(key, 'every actual component state is mapped')
          if (!Object.hasOwn(state, key)) state[key] = typeof initial === 'function' ? initial() : initial
          return [state[key], value => { state[key] = typeof value === 'function' ? value(state[key]) : value }]
        } }
      if (name === 'next/link') return ({ children, prefetch, ...props }) => React.createElement('a', props, children)
      if (name === '@/lib/analytics') return { trackEvent: (name, data) => { events.push({ name, data }) }, rememberSignupCampaign: noop }
      if (name === '@/lib/trackClick') return { trackCheckoutClick: noop }
      if (name === '@/lib/supabase/client') return { createClient: forbidden }
      if (name === '@/lib/checkoutTelemetry') return { useCheckoutLaunch: () => ({ pending: null, error: null,
        setError: noop, launch: (tier, href, metadata) => { launches.push({ tier, href, metadata }); return true } }) }
      if (name === '@/components/FreeTierOfferProvider') return { useFreeTierOffer: () => load('lib/freeTierOffer.ts').buildFreeTierOffer(false) }
      if (name.startsWith('@/components/') || name === './AutopilotBreakEvenCalculator') return () => null
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? name.slice(2) : path.join(path.dirname(file), name)
        const target = ['.ts', '.tsx'].map(ext => base + ext).find(f => fs.existsSync(path.join(root, f)))
        if (!target) throw new Error(`Missing module ${name}`)
        return load(target)
      }
      if (!['react/jsx-runtime', 'node:crypto', 'crypto'].includes(name)) throw new Error(`Unexpected dependency ${name}`)
      return require(name)
    }
    new Function('require', 'module', 'exports', 'fetch', output)(resolve, module, module.exports, forbidden)
    cache.set(file, module.exports); return module.exports
  }
  const page = load('app/pricing/page.tsx').default
  function find(tree, predicate) {
    if (Array.isArray(tree)) return tree.flatMap(node => find(node, predicate))
    if (!tree || typeof tree !== 'object') return []
    return [...(predicate(tree) ? [tree] : []), ...find(tree.props?.children, predicate)]
  }
  return {
    render(search = query, { ssr = false } = {}) {
      query = search
      const params = new URLSearchParams(search), searchParams = {}
      for (const name of params.keys()) searchParams[name] = params.getAll(name).length > 1 ? params.getAll(name) : params.get(name)
      const previousWindow = globalThis.window
      if (ssr) delete globalThis.window
      else globalThis.window = { location: { search }, ttq: undefined }
      try {
        const element = page({ searchParams })
        if (element.key !== previousKey) {
          state = { showStickyCta: true, displayCurrency: 'usd', signedIn: true }
          previousKey = element.key
        }
        hook = 0
        const tree = element.type(element.props)
        const html = renderToStaticMarkup(tree)
        assert.equal(hook, stateNames.length, 'all component state executed')
        return { tree, html, billing: state.billing, key: element.key }
      } finally { globalThis.window = previousWindow }
    },
    toggle(tree, billing) {
      const matches = find(tree, node => node.type === 'button' && String(node.props?.onClick).includes(`setBilling('${billing}')`))
      assert.equal(matches.length, 1, 'real billing toggle located')
      matches[0].props.onClick()
    },
    buy(tree, tier, mobile = false) {
      const matches = find(tree, node => node.type === 'button' && node.props?.onClick &&
        (mobile ? String(node.props.onClick).includes(`handleBuy('${tier}', 'mobile_sticky')`) :
          String(node.props.onClick).includes(`handleBuy('${tier}')`)))
      let button = matches[0]
      if (!mobile && !button) {
        const card = find(tree, node => node.props?.id === `pricing-plan-${tier}`)[0]
        button = find(card, node => node.type === 'button' && String(node.props?.onClick).includes('handleBuy'))[0]
      }
      assert.ok(button, `real ${mobile ? 'mobile' : 'card'} ${tier} CTA located`)
      const previousWindow = globalThis.window
      globalThis.window = { location: { search: query }, ttq: undefined }
      try { button.props.onClick() } finally { globalThis.window = previousWindow }
      return launches.at(-1)
    },
    events,
  }
}

let checks = 0
const equal = (a, b, label) => { assert.deepEqual(a, b, label); checks++ }
const campaign = 'checkout141_completed_first50_20260916'
const cases = [
  ['', 'annual'], ['intent_campaign=' + campaign, 'annual'], ['tier=basic', 'annual'],
  ['billing=monthly', 'monthly'], ['billing=annual', 'annual'], ['billing=weekly', 'annual'],
  ['promo=FIRST50', 'monthly'], ['promo=COMEBACK50', 'monthly'],
  ['promo=first50', 'monthly'], ['promo=%20FIRST50%20', 'monthly'],
  ['promo=FIRST50&billing=annual', 'monthly'], ['promo=UNKNOWN', 'annual'],
  ['promo=UNKNOWN&billing=monthly', 'monthly'], ['promo=FIRST50FAKE', 'annual'],
  ['promo=', 'annual'], ['promo=FIRST50&promo=UNKNOWN', 'annual'],
  ['billing=monthly&billing=annual', 'annual'],
]
for (const [query, expected] of cases) {
  const app = fixture(), ssr = app.render(query, { ssr: true }), client = app.render(query)
  equal(ssr.billing, expected, `${query}: SSR uses promised/default cadence`)
  equal(client.html, ssr.html, `${query}: first client render matches server`)
  for (const tier of ['starter', 'basic', 'pro']) for (const mobile of [false, true]) {
    const launch = app.buy(client.tree, tier, mobile), url = new URL(launch.href, 'https://www.usekineo.com')
    equal(url.searchParams.get('billing'), expected, `${query}/${tier}/${mobile}: actual URL cadence`)
    equal(launch.metadata.billing, expected, 'checkout metadata matches visible state')
    equal(url.searchParams.get('promo'), new URLSearchParams(query).get('promo') || null, 'coupon forwarded without inventing validity')
  }
}
const app = fixture()
let view = app.render(`promo=FIRST50&intent_campaign=${campaign}`)
app.toggle(view.tree, 'annual'); view = app.render()
equal(view.billing, 'annual', 'manual annual selection wins after monthly campaign arrival')
view = app.render(`promo=FIRST50&intent_campaign=another_source`)
equal(view.billing, 'annual', 'unrelated campaign attribution change preserves manual choice')
let launch = app.buy(view.tree, 'basic')
equal(new URL(launch.href, 'https://www.usekineo.com').searchParams.get('billing'), 'annual', 'manual cadence reaches actual handler')
equal(new URL(launch.href, 'https://www.usekineo.com').searchParams.get('intent_campaign'), 'another_source', 'current attribution preserved')
equal(new URL(launch.href, 'https://www.usekineo.com').searchParams.get('promo'), 'FIRST50', 'manual choice does not forge or change coupon')
view = app.render('promo=COMEBACK50')
equal(view.billing, 'monthly', 'new monthly offer handoff initializes monthly')
view = app.render('')
equal(view.billing, 'annual', 'return to ordinary pricing restores annual default')
app.toggle(view.tree, 'monthly'); view = app.render()
equal(view.billing, 'monthly', 'manual monthly choice works for ordinary visitors')
view = app.render('billing=annual')
for (const tier of ['autopilot', 'autopilot_lite']) {
  launch = app.buy(view.tree, tier)
  equal(new URL(launch.href, 'https://www.usekineo.com').searchParams.get('billing'), 'monthly', `${tier} keeps monthly URL`)
  equal(launch.metadata.billing, 'monthly', `${tier} keeps monthly metadata`)
}
const old = fixture(true), broken = old.render('promo=FIRST50')
equal(broken.billing, 'annual', 'baseline reproduces monthly campaign opening annual')
equal(new URL(old.buy(broken.tree, 'basic').href, 'https://www.usekineo.com').searchParams.get('billing'), 'annual', 'baseline sends incompatible annual checkout')
console.log(`pricing monthly campaign: ${checks}/${checks} checks passed`)
