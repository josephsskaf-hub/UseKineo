// Offline React/VM pricing contract. Real prices/counts/cards, injected unrelated widgets; no browser/API/credentials.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
const root = process.cwd(), require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const CLIENT = 'app/pricing/PricingClient.tsx', CARD = 'components/pricing/PlanValueStage.tsx', INCLUDES = 'components/pricing/PricingIncludes0511.tsx', FLAG = 'lib/pricingWatch.ts'
const BASE = '56e24d47a', read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
let checks = 0
const check = (id, value, message) => { assert(value, '[' + id + '] ' + message); checks++ }
const Null = () => null
function world(changes = {}, brl = false) {
  const cache = new Map()
  function load(file) {
    if (!/\.(tsx?|json)$/.test(file)) file += fs.existsSync(path.join(root, file + '.ts')) ? '.ts' : '.tsx'
    if (cache.has(file)) return cache.get(file)
    if (file === 'components/InterfaceLanguage.tsx') return { UiLabel: ({ children }) => children, useInterfaceLanguage: () => 'en' }
    if (file === 'components/FreeTierOfferProvider.tsx') return { useFreeTierOffer: () => load('lib/freeTierOffer.ts').getFreeTierOffer() }
    if (file === 'components/pricing/AnnualOfferCountdown.tsx') return { AnnualOfferCountdown: Null, useWelcomeOffers: () => ({ annual: null, monthly: { deadlineMs: null, ended: false } }) }
    if (file === 'lib/growth/useWelcome20Deadline.ts') return { useWelcome20Deadline: () => ({ deadline: null, label: null }) }
    if (file === 'lib/checkoutTelemetry.ts') return { useCheckoutLaunch: () => ({ pending: null, error: null, launch: () => { throw Error('No checkout may run during SSR') } }) }
    if (file === 'lib/supabase/client.ts') return { createClient() { throw Error('No backend may run during SSR') } }
    if (file === 'components/pricing/PricingAudience.tsx') return { PricingAudienceTabs: () => React.createElement('div', { 'data-testid': 'pricing-audience-tabs' }), PricingTeamsBlock: Null }
    if (file.startsWith('components/') && ![CARD, INCLUDES, 'components/pricing/TwoProductsPricing.tsx'].includes(file)) return new Proxy({ __esModule: true, default: Null, useKling4PaidAvailability: () => null }, { get(target, key) { return target[key] ?? Null } })
    if (file.endsWith('.json')) return JSON.parse(read(file))
    const exports = {}; cache.set(file, exports)
    let source = changes[file] ?? read(file)
    if (file === CLIENT) source = source.replace("useState<DisplayCurrency | null>(null)", "useState<DisplayCurrency | null>('usd')").replace("useState<SettlementCurrency>('usd')", `useState<SettlementCurrency>('${brl ? 'brl' : 'usd'}')`)
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    assert.equal(ast.parseDiagnostics.length, 0, 'Source must parse: ' + file)
    const code = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, { exports, require(name) {
      if (name === 'react' || name.startsWith('react/')) return require(name)
      if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
      if (name.startsWith('@/')) return load(name.slice(2))
      if (name.startsWith('.')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(file), name)))
      throw Error('External dependency forbidden: ' + name)
    }, process: { env: Object.freeze({ NODE_ENV: 'production' }) }, URL, URLSearchParams, Intl, Date, console, fetch() { throw Error('Network forbidden') } }, { filename: file, timeout: 30_000 })
    return exports
  }
  return { load, render(preview, billing = 'monthly') { return renderToStaticMarkup(React.createElement(load(CLIENT).default, { watchPreview: preview, initialBilling: billing })) } }
}
const decode = text => text.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
function dom(html) {
  const root = { tag: 'root', attrs: {}, children: [] }, stack = [root]
  html = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
  for (const match of html.matchAll(/<\/?([a-z][\w:-]*)\b[^>]*>|[^<]+/gi)) {
    const token = match[0], parent = stack.at(-1)
    if (token.startsWith('</')) { if (stack.at(-1).tag === match[1]) stack.pop(); continue }
    if (!token.startsWith('<')) { parent.children.push({ tag: '#text', text: decode(token), children: [], parent }); continue }
    const attrs = {}; for (const attr of token.matchAll(/\s([^\s=/>]+)(?:="([^"]*)")?/g)) attrs[attr[1]] = decode(attr[2] ?? '')
    const node = { tag: match[1], attrs, children: [], parent }; parent.children.push(node)
    if (!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(node.tag) && !token.endsWith('/>')) stack.push(node)
  }
  return root
}
const nodes = (tree, predicate) => { const found = []; const visit = node => { if (predicate(node)) found.push(node); node.children.forEach(visit) }; visit(tree); return found }
const hasClass = (node, name) => node.attrs?.class?.split(/\s+/).includes(name)
const rawText = node => node.tag === '#text' ? node.text : node.children.map(rawText).join('')
const text = node => rawText(node).replace(/\s+/g, ' ').trim()
const hidden = node => { for (let p = node; p; p = p.parent) if (p.attrs && Object.hasOwn(p.attrs, 'hidden') || p.tag === 'details' && !Object.hasOwn(p.attrs, 'open') && p !== node) return true; return false }
function verify(changes = {}) {
  const w = world(changes), prices = w.load('lib/checkoutPricing.ts'), count = w.load('lib/contaDeFilmes.ts')
  check('flag', w.load(FLAG).WATCH_PRICING_PUBLIC === false, 'public pricing flag stays closed')
  for (const billing of ['monthly', 'annual']) for (const brl of [false, true]) {
    const view = world(changes, brl), html = view.render(true, billing), tree = dom(html)
    const cards = nodes(tree, n => hasClass(n, 'pv-compact'))
    check('order', cards.length === 3 && cards.map(n => n.attrs['data-tier']).join() === 'basic,starter,pro', 'Creator leads, all three plans remain')
    check('toggle', nodes(tree, n => n.tag === 'button' && text(n) === 'Monthly').length === 1 && nodes(tree, n => n.tag === 'button' && text(n).startsWith('Annual')).length === 1 && !nodes(tree, n => n.attrs?.['data-testid'] === 'pricing-audience-tabs').length, 'one billing choice, business moved below')
    for (const card of cards) {
      const tier = card.attrs['data-tier'], details = nodes(card, n => n.tag === 'details')[0], button = nodes(card, n => hasClass(n, 'pv-cta'))[0]
      check('structure', card.children.filter(n => n.tag !== '#text').length === 6, tier + ': six visible structural rows')
      check('details', details && !Object.hasOwn(details.attrs, 'open') && text(details.children.find(n => n.tag === 'summary')) === "See what's included", tier + ': inclusion disclosure starts closed')
      check('cta', button?.parent === card && !hidden(button) && !Object.hasOwn(button.attrs, 'disabled'), tier + ': purchase/selection button remains outside disclosure')
      check('html', nodes(details, n => n.tag === 'table').length === 1 && /Each month, by engine/.test(text(details)) && /images/.test(text(details)) && /Or use your credits for/.test(text(details)), tier + ': hidden details retain real calculations and engine table in HTML')
      const monthly = billing === 'annual' ? prices.getAnnualPrice(tier, 'usd', 'standard') / 12 : prices.getTierPrice(tier, 'usd', 'standard')
      check('price', text(nodes(card, n => hasClass(n, 'pv-amount'))[0]) === prices.formatCheckoutMoney('usd', monthly), tier + ': price derives from canonical checkout table')
      check('capacity', text(nodes(card, n => hasClass(n, 'pv-credits'))[0]).includes(prices.TIER_CREDITS[tier] + ' credits a month') && text(nodes(card, n => hasClass(n, 'pv-films-main'))[0]).startsWith(String(count.contaDeFilmes(prices.TIER_CREDITS[tier]).padrao60)), tier + ': credits and standard films derive from canonical costs')
      if (brl) check('settlement', nodes(card, n => hasClass(n, 'pv-note')).some(n => !hidden(n) && /Charged in BRL/.test(text(n))), tier + ': local settlement disclosed before purchase')
    }
    const faqButtons = nodes(tree, n => n.tag === 'button' && Object.hasOwn(n.attrs, 'aria-expanded'))
    check('faq', faqButtons.length >= 6 && faqButtons.every(n => n.attrs['aria-expanded'] === 'false' && n.parent.children.some(x => x.tag === 'div' && Object.hasOwn(x.attrs, 'hidden') && text(x).length > 10)), 'FAQ starts closed with every full answer still in HTML')
    const visibleGuarantees = nodes(tree, n => n.tag === 'span' && text(n) === prices.MONEY_BACK_GUARANTEE && !hidden(n))
    check('guarantee', visibleGuarantees.length === 1 && !/Not happy with your first film/.test(text(tree)), 'one canonical guarantee, FAQ preserves policy without repeating a visible sales block')
    check('renewal', /Monthly plans renew monthly; annual plans renew yearly/.test(text(tree)), 'FAQ explains both renewal periods accurately')
    check('business', nodes(tree, n => n.attrs?.id === 'teams').length === 1 && text(tree).includes('For teams & business'), 'Business has an explicit section')
    const proof = nodes(tree, n => hasClass(n, 'pricing-watch-proof'))[0]
    check('proof', proof && nodes(proof, n => n.tag === 'blockquote').length === 1 && /creators/.test(text(proof)) && html.indexOf('pricing-watch-proof') < html.indexOf('id="teams"'), 'existing counter and subscriber quote form one block before Business')
    const connector = nodes(tree, n => n.tag === 'a' && n.attrs?.href?.startsWith('/claude-connector?src=pricing_badge'))
    check('connector', connector.length === 1 && connector[0].attrs.target === '_blank' && connector[0].attrs.rel === 'noopener' && nodes(tree, n => n.tag === 'footer').some(n => nodes(n, child => child === connector[0]).length === 1), 'one truthful connector link lives in the footer with its original safe destination')
  }
  const card = w.load(CARD).PlanValueCard, props = { tier: 'basic', name: 'Creator', popular: true, requested: false, selected: true, credits: prices.TIER_CREDITS.basic, amount: prices.formatCheckoutMoney('usd', prices.getTierPrice('basic', 'usd')), per: '/month', ctaLabel: 'Get Creator', ctaDisabled: false, included: [], compact: true }
  for (const selected of [false, true]) { let bought = 0, chosen = 0; const element = card({ ...props, selected, onBuy: () => bought++, onSelect: () => chosen++ }); const button = element.props.children.find(n => n?.type === 'button'); button.props.onClick({ stopPropagation() {} }); check('handler', selected ? bought === 1 && chosen === 0 : bought === 0 && chosen === 1, 'first click selects; selected button alone buys') }
  check('preview', /index:\s*false/.test(read('app/pricing-preview/page.tsx')) && /initialBilling=\{handoff.initialBilling\}/.test(read('app/pricing-preview/page.tsx')) && !read('app/sitemap.ts').includes('/pricing-preview'), 'preview is demonstrable, noindex and uses canonical billing handoff')
}
verify(); const baseline = checks
const originals = Object.fromEntries([CLIENT, CARD, INCLUDES].map(file => [file, execFileSync('git', ['show', BASE + ':' + file], { encoding: 'utf8' }).replace(/\r\n/g, '\n')]))
for (const billing of ['monthly', 'annual']) for (const brl of [false, true]) check('rollback', world({}, brl).render(false, billing) === world(originals, brl).render(false, billing), 'closed flag preserves exact legacy SSR HTML for ' + billing + (brl ? '/BRL' : '/USD'))
const mutations = [
  ['public rollout opened', 'flag', FLAG, 'WATCH_PRICING_PUBLIC = false', 'WATCH_PRICING_PUBLIC = true'],
  ['Creator no longer first', 'order', CLIENT, 'if (watchPricing) valuePlans.sort', 'if (false) valuePlans.sort'],
  ['disclosure open by default', 'details', CARD, '<details className="pv-compact-details"', '<details open className="pv-compact-details"'],
  ['button disabled', 'cta', CARD, 'disabled={props.ctaDisabled}', 'disabled={true}'],
  ['FAQ text absent from HTML', 'faq', CLIENT, '(isOpen || watchPricing) &&', 'isOpen &&'],
  ['FAQ initially open', 'faq', CLIENT, 'watchPricing ? null : 0', '0'],
  ['full refund repeated', 'guarantee', CLIENT, '{!watchPricing && <p className="mx-auto mt-5 max-w-2xl text-center text-[12.5px] leading-relaxed text-[var(--muted)]" data-testid="pricing-first-film-guarantee">', '{true && <p className="mx-auto mt-5 max-w-2xl text-center text-[12.5px] leading-relaxed text-[var(--muted)]" data-testid="pricing-first-film-guarantee">'],
  ['button buys without selection', 'handler', CARD, 'if (props.selected) props.onBuy(); else props.onSelect()', 'props.onBuy()'],
  ['annual renewal described as monthly', 'renewal', CLIENT, 'Monthly plans renew monthly; annual plans renew yearly. Cancel anytime.', 'Plans renew monthly — cancel anytime.'],
]
for (const [name, id, file, before, after] of mutations) {
  const source = read(file), changed = source.replace(before, after); assert.notEqual(changed, source, 'Mutant must apply: ' + name)
  let error; try { verify({ [file]: changed }) } catch (caught) { error = caught }
  assert(error instanceof assert.AssertionError && error.message.startsWith('[' + id + ']'), name + ': intended AssertionError required, never execution error: ' + error?.stack)
  console.log('MUTANT REJECTED [' + id + '] ' + name)
}
console.log('WATCH pricing: ' + baseline + ' offline assertions, legacy SSR parity, ' + mutations.length + '/' + mutations.length + ' targeted mutants; no API/checkout/browser.')
