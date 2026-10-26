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
  const stateNames = [], stateCalls = []
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) &&
      node.initializer && ts.isCallExpression(node.initializer) &&
      node.initializer.expression.getText(ast) === 'useState') {
      const name = node.name.elements[0].getText(ast)
      stateNames.push(name)
      stateCalls.push([node.initializer.getStart(ast), node.initializer.end, '__pricingState(' + JSON.stringify(name) + ', ' + (node.initializer.arguments[0]?.getText(ast) ?? 'undefined') + ')'])
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword))
  assert.ok(component?.body, 'actual pricing component found')
  stateCalls.push([component.body.statements[0].getStart(ast), component.body.statements[0].getStart(ast), '__captureBuy(handleBuy);\n'])
  const cache = new Map(), launches = [], events = []
  let hook = 0, state = {}, previousKey = Symbol('initial'), query = '', legacyBuy = null
  const noop = () => {}
  const forbidden = () => { throw new Error('Network/DB forbidden in offline test') }
  function load(file) {
    file = file.replaceAll('\\', '/')
    if (cache.has(file)) return cache.get(file)
    const module = { exports: {} }; cache.set(file, module.exports)
    let code = source(file, before)
    // Only the page's own declarations receive named state. Imported hooks
    // execute their own isolated SSR defaults and cannot shift page fixtures.
    if (file === entry) for (const [start, end, replacement] of [...stateCalls].sort((a,b) => b[0] - a[0])) code = code.slice(0,start) + replacement + code.slice(end)
    const output = ts.transpileModule(code, {
      fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    function resolve(name) {
      if (name === 'react') return { ...React, useEffect: noop, useRef: current => ({ current }),
        useState: initial => [typeof initial === 'function' ? initial() : initial, noop] }
      if (name === 'next/link') return ({ children, prefetch, ...props }) => React.createElement('a', props, children)
      if (name === '@/lib/analytics') return { trackEvent: (name, data) => { events.push({ name, data }) }, rememberSignupCampaign: noop }
      if (name === '@/lib/trackClick') return { trackCheckoutClick: noop }
      if (name === '@/lib/supabase/client') return { createClient: forbidden }
      if (name === '@/lib/checkoutTelemetry') return { useCheckoutLaunch: () => ({ pending: null, error: null,
        setError: noop, launch: (tier, href, metadata) => { launches.push({ tier, href, metadata }); return true } }) }
      if (name === '@/components/FreeTierOfferProvider') return { useFreeTierOffer: () => load('lib/freeTierOffer.ts').buildFreeTierOffer(false) }
      if (name === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => 'en' } // KINEO-AFILIADO-50-2610: display language is deterministic; effects/network stay forbidden.
      if (name.startsWith('@/components/') || name === './AutopilotBreakEvenCalculator') {
        const Stub = ({children}) => children ?? null
        return new Proxy({default:Stub}, {get:(target,key) => key === '__esModule' ? true : String(key).endsWith('_CSS') ? '' : target[key] ?? Stub})
      }
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? name.slice(2) : path.join(path.dirname(file), name)
        const target = ['.ts', '.tsx'].map(ext => base + ext).find(f => {
          if (!before) return fs.existsSync(path.join(root, f))
          try { execFileSync('git', ['cat-file','-e',BASE + ':' + f.replaceAll('\\','/')], {cwd:root,stdio:'ignore'}); return true } catch { return false }
        })
        if (!target) throw new Error(`Missing module ${name}`)
        return load(target)
      }
      // KINEO-PRICING-VERDADE-2026-09-27 — app/pricing/page.tsx passou a importar lib/characters.ts (characterLimitFor,
      // a cota de personagens da tabela), que importa @supabase/supabase-js só para criar o cliente admin SOB DEMANDA
      // (nada roda no import). A lista continua fechada: qualquer outra dependência nova segue estourando aqui.
      if (!['react/jsx-runtime', 'node:crypto', 'crypto', '@supabase/supabase-js'].includes(name)) throw new Error(`Unexpected dependency ${name}`)
      return require(name)
    }
    const pricingState = (key, initial) => {
      assert.ok(stateNames.includes(key), 'every actual component state is mapped')
      hook++
      if (!Object.hasOwn(state, key)) state[key] = typeof initial === 'function' ? initial() : initial
      return [state[key], value => { state[key] = typeof value === 'function' ? value(state[key]) : value }]
    }
    new Function('require', 'module', 'exports', 'fetch', '__pricingState', '__captureBuy', output)(resolve, module, module.exports, forbidden, pricingState, handler => { legacyBuy = handler })
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
        const card = find(tree, node => node.props?.id === `pricing-plan-${tier}` || node.props?.cardId === `pricing-plan-${tier}` || (node.props?.tier === tier && typeof node.props?.onBuy === 'function'))[0]
        button = find(card, node => node.type === 'button' && String(node.props?.onClick).includes('handleBuy'))[0]
        // Current value cards receive the owner's real onBuy callback.
        if (!button) {
          const control = find(card, node => typeof node.props?.onBuy === 'function')[0]
          if (control) button = {props:{onClick:control.props.onBuy}}
        }
      }
      assert.ok(button, `real ${mobile ? 'mobile' : 'card'} ${tier} CTA located`)
      const previousWindow = globalThis.window
      globalThis.window = { location: { search: query }, ttq: undefined }
      try { button.props.onClick() } finally { globalThis.window = previousWindow }
      return launches.at(-1)
    },
    buyLegacy(tier) {
      assert.equal(typeof legacyBuy, 'function', 'legacy owner purchase handler captured')
      const previousWindow = globalThis.window
      globalThis.window = {location:{search:query},ttq:undefined}
      try { legacyBuy(tier) } finally { globalThis.window = previousWindow }
      return launches.at(-1)
    },
    events,
  }
}

let checks = 0
const equal = (a, b, label) => { assert.deepEqual(a, b, label); checks++ }
const campaign = 'checkout141_completed_first50_20260916'
// Approved 05/10 annual default follows monthly annual-plan credit refills.
// FIRST50/COMEBACK50 still promise monthly; explicit cadence wins otherwise.
// Invalid or duplicated requests fail back to the approved annual default.
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
// The approved MRR conversion layer owns the bounded checkout campaign;
// the incoming source remains explicit metadata instead of being discarded.
equal(new URL(launch.href, 'https://www.usekineo.com').searchParams.get('intent_campaign'), 'mrr0610_v1_pricing_basic_annual', 'checkout campaign describes the canonical offer')
equal(launch.metadata.previous_intent_campaign, 'another_source', 'current incoming attribution is preserved in canonical metadata')
equal(new URL(launch.href, 'https://www.usekineo.com').searchParams.get('promo'), 'FIRST50', 'manual choice does not forge or change coupon')
view = app.render('promo=COMEBACK50')
equal(view.billing, 'monthly', 'new monthly offer handoff initializes monthly')
view = app.render('')
equal(view.billing, 'annual', 'return to ordinary pricing restores the approved annual default of 05/10')
app.toggle(view.tree, 'monthly'); view = app.render()
equal(view.billing, 'monthly', 'manual monthly choice works for ordinary visitors')
view = app.render('billing=annual')
for (const tier of ['autopilot', 'autopilot_lite']) {
  // Retired public cards keep their existing legacy handler contract.
  launch = app.buyLegacy(tier)
  equal(new URL(launch.href, 'https://www.usekineo.com').searchParams.get('billing'), 'monthly', `${tier} keeps monthly URL`)
  equal(launch.metadata.billing, 'monthly', `${tier} keeps monthly metadata`)
}
const old = fixture(true), broken = old.render('promo=FIRST50')
equal(broken.billing, 'annual', 'baseline reproduces monthly campaign opening annual')
equal(new URL(old.buy(broken.tree, 'basic').href, 'https://www.usekineo.com').searchParams.get('billing'), 'annual', 'baseline sends incompatible annual checkout')
console.log(`pricing monthly campaign: ${checks}/${checks} checks passed`)
