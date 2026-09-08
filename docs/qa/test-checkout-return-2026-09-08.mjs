// Offline regression: execute the real JSX with synthetic state, blocked network,
// and the real pricing/eligibility helpers. No session, payment or render is made.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'
import { sandbox, ROOT } from './pista3-fixtures.mjs'

const BASE = '3eeae0d1'
const CANCEL = 'app/checkout/cancelled/page.tsx'
const SUCCESS = 'app/checkout/success/page.tsx'
const BANNER = 'components/CardEntryBanner.tsx'
const ROUTE = 'app/api/stripe/checkout/route.ts'
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks++ }
const eq = (a, b, label) => { assert.deepEqual(a, b, label); checks++ }
const read = (file, before) => before
  ? execFileSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8' })
  : fs.readFileSync(path.join(ROOT, file), 'utf8')
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = find(child, predicate)
    if (found) return found
  }
  return null
}
const textOf = node => renderToStaticMarkup(node).replace(/<[^>]+>/g, '')

function fixture(entry, { query = '', state = {}, before = false, error = null, pending = null, mutatePricing = false } = {}) {
  const navigations = []
  const s = sandbox({
    globals: {
      __params: new URLSearchParams(query),
      __router: { push: url => navigations.push(url) },
      __state: name => [state[name], () => {}],
      __offer: sandbox().load('lib/freeTierOffer.ts').buildFreeTierOffer(true),
    },
    transform: (file, current) => {
      if (file === 'lib/trackClick.ts') return 'export const trackCheckoutClick = () => {}'
      if (file === 'lib/growth/observeCheckoutPurchase.ts') return 'export const observeCheckoutPurchase = () => {}'
      if (file === 'app/checkout/cancelled/CheckoutCancelObjectionTelemetry.tsx') return 'export default function Telemetry() { return null }'
      if (file === 'lib/checkoutPricing.ts' && mutatePricing) return current.replace('CARD_TRIAL_ENTRY_FEE_MINOR = 100', 'CARD_TRIAL_ENTRY_FEE_MINOR = 137')
      if (file !== entry) return current
      let code = read(file, before)
        .replace('useSearchParams()', '__params')
        .replace('useRouter()', '__router')
        .replace('useFreeTierOffer()', '__offer')
      const sf = ts.createSourceFile(file, code, 99, true, 4), edits = []
      const walk = n => {
        if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText(sf) === 'useState') {
          const name = n.name.elements[0].getText(sf)
          if (Object.hasOwn(state, name)) edits.push([n.initializer.getStart(sf), n.initializer.end, `__state(${JSON.stringify(name)})`])
        }
        ts.forEachChild(n, walk)
      }
      walk(sf)
      for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0])) code = code.slice(0, start) + replacement + code.slice(end)
      if (entry === CANCEL) code += '\nexport { CheckoutCancelledContent }\n'
      return code
    },
  })
  s.checkout.error = error
  s.checkout.pending = pending
  const exports = s.load(entry)
  const node = entry === CANCEL ? exports.CheckoutCancelledContent() : exports.default({ status: 'card_required', hasPaid: false, credits: 0 })
  return { ...s, node, navigations, html: renderToStaticMarkup(node) }
}

const readyProbe = { resolved: true, reason: null }
const trialQuery = 'tier=basic&billing=monthly&trial=1&intent_campaign=card_entry&return=wm'
const price = sandbox().load('lib/checkoutPricing.ts')
const fee = price.formatCheckoutMoney('usd', price.CARD_TRIAL_ENTRY_FEE_MINOR)
const monthly = price.formatCheckoutMoney('usd', price.getTierPrice('basic', 'usd'))
const cancelled = (query = trialQuery, options = {}) => fixture(CANCEL, { ...options, query, state: { trialResumeProbe: readyProbe, ...options.state } })
const clickRetry = result => {
  const retry = find(result.node, n => n.type === 'a' && /Try secure checkout again|Keep Creator/.test(textOf(n)))
  ok(retry, 'retry action is visible')
  retry.props.onClick({ preventDefault() {} })
  return new URL(result.launches.at(-1)[1], 'https://example.invalid')
}

// Execute the actual cancel_url expression; do not duplicate its construction.
const route = read(ROUTE)
const routeAst = ts.createSourceFile(ROUTE, route, 99, true)
let cancelExpression
const walkRoute = n => {
  if (ts.isPropertyAssignment(n) && n.name.getText(routeAst) === 'cancel_url' && n.initializer.getText(routeAst).includes('/checkout/cancelled?tier=${tier}')) cancelExpression = n.initializer.getText(routeAst)
  ts.forEachChild(n, walkRoute)
}
walkRoute(routeAst)
ok(cancelExpression, 'real subscription cancel URL found')
for (const [wantsTrial, isAnnual, expected] of [[true, false, '1'], [false, false, null], [true, true, null]]) {
  const url = vm.runInNewContext(cancelExpression, { appUrl: 'https://example.invalid', tier: 'basic', billing: isAnnual ? 'annual' : 'monthly', currency: 'usd', region: 'standard', wantsTrial, isAnnual, intro: false, requestedPromo: null, returnToWatermark: false, intentCampaignParam: '&intent_campaign=card_entry', planFitRetryParam: '' })
  eq(new URL(url).searchParams.get('trial'), expected, 'only server-accepted monthly trial preserves marker')
}
const trial = cancelled()
ok(trial.html.includes(`${fee} for ${price.CARD_TRIAL_DAYS} days`), 'trial entry fee and duration displayed')
ok(trial.html.includes(`${price.CARD_TRIAL_GRANT_CREDITS} credits. Then ${monthly}/month`), 'credits and renewal disclosed')
ok(trial.html.includes('First purchase only'), 'return does not assert present eligibility')
ok(!trial.html.includes('data-checkout-downshift-primary'), 'trial does not promote a more expensive entry as cheaper')
const retry = clickRetry(trial)
eq(retry.searchParams.get('trial'), '1', 'actual retry keeps trial')
eq(retry.searchParams.get('intent_campaign'), 'card_entry', 'campaign preserved')
eq(retry.searchParams.get('return'), 'wm', 'watermark return preserved')
for (const query of ['tier=basic', 'tier=basic&trial=0', 'trial=1', 'tier=garbage&trial=1', 'tier=basic&billing=annual&trial=1', 'tier=starter&trial=1', 'tier=pro&trial=1']) {
  const result = cancelled(query)
  ok(!result.html.includes(`${fee} for ${price.CARD_TRIAL_DAYS} days`), 'missing/invalid/ineligible trial is not advertised: ' + query)
}
const normal = cancelled('tier=basic&intro=1&promo=VALID_CODE&intent_campaign=prior_offer')
const normalRetry = clickRetry(normal)
eq(normalRetry.searchParams.get('trial'), null, 'ordinary offer does not acquire trial')
eq(normalRetry.searchParams.get('intro'), '1', 'intro retained')
eq(normalRetry.searchParams.get('promo'), 'VALID_CODE', 'promotion retained')
const priceObjection = cancelled(trialQuery, { state: { reasonSent: 'too_expensive' } })
ok(!priceObjection.html.includes('Start Starter instead'), 'price objection does not replace trial with Starter')
ok(!priceObjection.html.includes('Make a free Short'), 'price objection does not invent a free path')
const looking = cancelled(trialQuery, { state: { reasonSent: 'just_looking' } })
ok(looking.html.includes('Starting this Creator trial requires payment.'), 'browse path explains payment requirement')
ok(!looking.html.includes('Make a free Short'), 'browse action does not promise free rendering')
ok(cancelled(trialQuery, { mutatePricing: true }).html.includes('$1.37 for'), 'render follows canonical pricing mutation')
const before = cancelled(trialQuery, { before: true })
eq(clickRetry(before).searchParams.get('trial'), null, 'reproduces original loss of trial marker')

for (const error of [null, 'Checkout did not open. Please try again.']) {
  const banner = fixture(BANNER, { error })
  const alert = find(banner.node, n => n.props?.role === 'alert')
  eq(Boolean(alert), Boolean(error), 'banner exposes actual launcher error only')
  if (alert) eq(textOf(alert), error, 'error message remains intact')
}
const pendingBanner = fixture(BANNER, { pending: 'basic' })
ok(find(pendingBanner.node, n => n.type === 'button').props.disabled, 'pending latch is preserved')

const paidState = { flow: { kind: 'self_serve', destination: '/studio' }, accountPlan: 'basic_trial', accountHasPaid: true, entitlementsResolved: true, countdown: 0, syncing: false, credits: 80 }
for (const hasSavedDraft of [false, true]) {
  const result = fixture(SUCCESS, { state: { ...paidState, hasSavedDraft } })
  const link = find(result.node, n => n.props?.children === 'Go to Generate Video')
  const expected = hasSavedDraft ? '/studio/create?resume=card_entry' : '/studio'
  eq(link.props.href, expected, 'manual CTA uses saved draft if present')
  const timerEffect = result.effects.find(fn => fn.toString().includes('countdown <= 0'))
  ok(timerEffect, 'actual countdown effect found')
  timerEffect()
  eq(result.navigations, [expected], 'timer and manual action share destination')
}
for (const state of [{ accountHasPaid: false }, { entitlementsResolved: false }, { accountPlan: 'free' }]) {
  const result = fixture(SUCCESS, { state: { ...paidState, hasSavedDraft: true, ...state } })
  ok(!find(result.node, n => n.props?.children === 'Go to Generate Video'), 'no access CTA before entitlement confirmed')
  result.effects.find(fn => fn.toString().includes('countdown <= 0'))()
  eq(result.navigations.length, 0, 'no redirect before entitlement confirmed')
}
const autopilot = fixture(SUCCESS, { state: { ...paidState, flow: { kind: 'autopilot', destination: '/autopilot?success=true&tier=autopilot' }, accountPlan: 'autopilot', hasSavedDraft: true } })
eq(find(autopilot.node, n => n.props?.children === 'Open Autopilot setup').props.href, '/autopilot?success=true&tier=autopilot', 'Autopilot is not diverted to draft')

if (process.argv.includes('--checkout-preview')) {
  const esc = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
  const css = '*{box-sizing:border-box}body{margin:0;background:#080b10;color:#f5f5f7;font:14px Arial;--bg:#080b10;--text:#f5f5f7;--muted2:#abb5c2;--border:#303641}a,button{font:inherit}a{color:#62b3ff}'
  const examples = [
    ['Volta do checkout', () => cancelled(trialQuery, { before: true }), () => cancelled()],
    ['Objeção ao preço', () => cancelled(trialQuery, { before: true, state: { reasonSent: 'too_expensive' } }), () => priceObjection],
    ['Revisar a ideia', () => cancelled(trialQuery, { before: true, state: { reasonSent: 'just_looking' } }), () => looking],
    ['Erro ao abrir pagamento', () => fixture(BANNER, { before: true, error: 'Checkout did not open. Please try again.' }), () => fixture(BANNER, { error: 'Checkout did not open. Please try again.' })],
    ['Compra confirmada com ideia salva', () => fixture(SUCCESS, { before: true, state: { ...paidState, countdown: 10, hasSavedDraft: true } }), () => fixture(SUCCESS, { state: { ...paidState, countdown: 10, hasSavedDraft: true } })],
  ]
  const sections = []
  for (const [label, old, current] of examples) {
    const variants = [old(), current()]
    for (const width of [960, 390]) {
      const height = label.includes('Erro') ? 260 : label.includes('Compra') ? 950 : 1100
      sections.push(`<section><h2>${label} · ${width === 390 ? 'mobile' : 'desktop'}</h2><div class="pair">${variants.map((result, index) => {
        const destination = label.includes('Compra') ? `<p class="note">Destino do botão: <code>${index ? '/studio/create?resume=card_entry' : '/studio'}</code></p>` : ''
        return `<article><h3>${index ? 'DEPOIS' : 'ANTES · ' + BASE}</h3>${destination}<iframe title="${esc(label)} ${index ? 'depois' : 'antes'} ${width}" width="${width}" height="${height}" sandbox="allow-same-origin" srcdoc="${esc('<!doctype html><html lang="en"><meta charset="utf-8"><style>' + css + '</style><body>' + result.html + '</body></html>')}"></iframe></article>`
      }).join('')}</div></section>`)
    }
  }
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Pagamento · retorno e erros</title><style>body{margin:24px;background:#080b10;color:#eef3fa;font:15px Arial}p{max-width:1000px;line-height:1.6}section{margin:36px 0}.pair{display:flex;gap:20px;overflow:auto}article{flex-shrink:0}iframe{border:1px solid #39495d;border-radius:12px}.note{font-size:13px}</style><h1>A compra mantém a oferta e a ideia</h1><p>Antes/depois do JSX real com estados sintéticos. Nenhuma cobrança, conta, geração, requisição de rede ou telemetria. A volta corrigida preserva a intenção do trial; o servidor continua verificando a elegibilidade. Sessões antigas sem o marcador não são reinterpretadas.</p>${sections.join('')}</html>`
  fs.writeFileSync(path.join(ROOT, 'docs/previews/PAGAMENTO-RETORNO-2026-09-08.html'), html)
}
console.log(`Checkout return: ${checks} checks passed. Offline; no network, database or payments.`)
