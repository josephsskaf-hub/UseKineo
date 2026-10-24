// KINEO-COMPRA-AVULSA-2410 — isolated UI/receipt guardian. No env, server, providers, database or real checkout.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const root = process.cwd(), req = createRequire(path.join(root, 'package.json'))
const React = req('react'), ts = req('typescript'), { renderToStaticMarkup } = req('react-dom/server')
const offerFile = 'components/OneTimeItemOffer.tsx', confirmationFile = 'components/OneTimeItemConfirmation.tsx', adsFile = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx'
const noNetwork = () => { throw new Error('Unexpected network/provider access in the UI guardian') }
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
let checks = 0
function ok(value, message) { assert.ok(value, message); checks++ }
function equal(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++ }

function environment({ state = {}, effects = [], track = async () => true, storage = new Map(), fetcher = noNetwork, sources = {}, disabled = false, visible = false, checkoutLauncher = null } = {}) {
  let index = 0
  const cache = new Map(), states = { ...state }
  const hooks = { ...React, useState(initial) { const at = index++; if (!(at in states)) states[at] = typeof initial === 'function' ? initial() : initial; return [states[at], value => { states[at] = typeof value === 'function' ? value(states[at]) : value }] }, useRef: initial => ({ current: visible && initial === null ? {} : initial }), useEffect: effect => { effects.push(effect) } }
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const box = { exports: {} }; cache.set(file, box.exports)
    let source = sources[file] ?? fs.readFileSync(path.join(root, file), 'utf8')
    if (disabled && file === 'lib/oneTimeItem.ts') source = source.replace('export const ONE_TIME_ITEMS_LIVE = true', 'export const ONE_TIME_ITEMS_LIVE = false')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, { module: box, exports: box.exports, URL, URLSearchParams, AbortController, console, Date, Map, Set, Promise, setTimeout, clearTimeout, fetch: fetcher, process: { env: { NODE_ENV: 'production' } }, sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, IntersectionObserver: class { constructor(callback) { this.callback = callback } observe() { this.callback([{ isIntersecting: true }]) } disconnect() {} }, require: id => {
      if (id === 'react') return hooks
      if (id === 'react/jsx-runtime') return req(id)
      if (id === 'react-dom') return { createPortal: node => node }
      if (id === '@/lib/analytics') return { trackEvent: track }
      if (id.includes('checkoutTelemetry')) return { useCheckoutLaunch: () => checkoutLauncher ?? ({ pending: null, error: null, launch: noNetwork, setError() {} }) }
      if (id.includes('uploadFootage')) return { AdsUploadError: class extends Error {}, uploadFootage: noNetwork }
      let next = id.startsWith('@/') ? id.slice(2) : path.posix.join(path.posix.dirname(file), id)
      if (!fs.existsSync(path.join(root, next))) next += fs.existsSync(path.join(root, `${next}.tsx`)) ? '.tsx' : '.ts'
      return load(next)
    } }, { filename: file })
    return box.exports
  }
  const expand = node => {
    if (Array.isArray(node)) return node.flatMap(expand)
    if (!node || typeof node !== 'object') return node
    if (typeof node.type === 'function') return expand(node.type(node.props))
    return { ...node, props: { ...node.props, children: expand(node.props?.children) } }
  }
  const all = (node, predicate) => {
    if (Array.isArray(node)) return node.flatMap(child => all(child, predicate))
    if (!node || typeof node !== 'object') return []
    return [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)]
  }
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : ''
  return { load, states, effects, expand, all, text, reset() { index = 0 }, render(file, props) { index = 0; return renderToStaticMarkup(React.createElement(load(file).default, props)) } }
}

function offerContract(sources = {}) {
  for (const surface of ['pricing', 'generate_paywall']) {
    const e = environment({ sources }), calls = [], launcher = { pending: null, error: null, launch: (...args) => { calls.push(args); return true } }
    const rootNode = e.expand(React.createElement(e.load(offerFile).default, { surface, checkout: launcher }))
    const buttons = e.all(rootNode, n => n.type === 'button')
    equal(buttons.length, 2, `${surface}: both one-off SKUs are offered`)
    const html = e.render(offerFile, { surface, checkout: launcher }), contract = e.load('lib/oneTimeItem.ts')
    for (const [i, sku] of ['one_time_ad', 'one_time_film35'].entries()) {
      ok(html.includes(contract.oneTimeItemPriceLabel(sku)), `${sku}: displayed amount comes from canonical price helper`)
      buttons[i].props.onClick({ preventDefault() {} })
      equal(calls[i][0], sku)
      equal(calls[i][1], contract.oneTimeItemCheckoutHref(sku, surface), 'CTA keeps GET checkout pack and surface')
      equal(calls[i][2].sku, sku)
    }
    ok(!/(#ff6b6b|text-red-|#bd6c64)/i.test(html), 'one-off card introduces no red failure styling')
  }
  const e = environment(), orderId = '00000000-0000-4000-8000-000000000001'
  const html = e.render(offerFile, { surface: 'ads_choice', orderId, newTab: true })
  ok(html.includes('data-sku="one_time_ad"') && !html.includes('data-sku="one_time_film35"'), 'Ads offers only the ad SKU')
  ok(html.includes('target="_blank"') && html.includes('rel="noopener noreferrer"'), 'Ads retains the original creation tab')
  ok(html.includes(`order=${orderId}`), 'Ads checkout carries the existing order')
  const nativeClicks = [], native = environment({ track: async (name, metadata) => { nativeClicks.push({ name, metadata }); return true } })
  const nativeTree = native.expand(React.createElement(native.load(offerFile).default, { surface: 'ads_choice', orderId, newTab: true }))
  const link = native.all(nativeTree, node => node.type === 'a' && node.props.className === 'oti-buy')[0]
  let prevented = 0
  link.props.onClick({ preventDefault() { prevented++ } }); link.props.onClick({ preventDefault() { prevented++ } })
  equal(prevented, 1, 'native new-tab checkout suppresses an immediate duplicate click')
  equal(nativeClicks.length, 1, 'native checkout emits one click per accepted gesture')
  equal(nativeClicks[0].metadata.order_id, orderId, 'native click telemetry retains the order')
  const off = environment({ disabled: true, visible: true })
  equal(off.render(offerFile, { surface: 'pricing' }), '', 'OFF renders no offer')
  equal(off.effects.length, 0, 'OFF starts no view effect or checkout launcher')
}
offerContract()
for (const [file, surface] of [['app/pricing/PricingClient.tsx', 'pricing'], ['components/PricingCards.tsx', 'generate_paywall']]) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  ok(source.includes(`<OneTimeItemOffer surface="${surface}" checkout={checkout}`), `${surface}: the actual screen mounts the shared offer with its existing checkout latch`)
}

{
  const generateFile = 'app/(dashboard)/generate/GenerateClient.tsx', source = fs.readFileSync(path.join(root, generateFile), 'utf8')
  const ast = ts.createSourceFile(generateFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), nodes = []
  const visit = node => { nodes.push(node); ts.forEachChild(node, visit) }; visit(ast)
  ok(nodes.some(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === '@/components/PricingCards' && node.importClause?.name?.text === 'PricingCards'), 'GenerateClient imports the live PricingCards component')
  const mounts = nodes.filter(node => (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(ast) === 'PricingCards')
  equal(mounts.length, 1, 'GenerateClient mounts PricingCards exactly once')
  ok(ts.isBinaryExpression(mounts[0].parent) && mounts[0].parent.left.getText(ast) === 'showStep1' && mounts[0].parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken, 'the actual PricingCards mount is gated by showStep1')
  const gate = nodes.find(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === 'showStep1')
  ok(gate?.initializer, 'the actual phase gate exists')
  for (const phase of ['idle', 'analyzing', 'scripting', 'options', 'generating', 'done']) equal(vm.runInNewContext(gate.initializer.getText(ast), { phase }), ['idle', 'analyzing', 'scripting'].includes(phase), `pre-video offer visibility follows phase ${phase}`)
  ok(!nodes.some(node => (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(ast) === 'PostVideoPaywall'), 'the orphan PostVideoPaywall has no active GenerateClient mount')
  const orphan = fs.readFileSync(path.join(root, 'components/PostVideoPaywall.tsx'))
  equal(execFileSync('git', ['hash-object', '--path=components/PostVideoPaywall.tsx', '--stdin'], { cwd: root, input: orphan }).toString().trim(), execFileSync('git', ['rev-parse', '7950e411:components/PostVideoPaywall.tsx'], { cwd: root }).toString().trim(), 'orphan PostVideoPaywall has the exact canonical versioned bytes from 7950e411')
}
function activePaywall(sources = {}) {
  const calls = [], launcher = { pending: null, error: null, launch: (...args) => { calls.push(args); return true }, setError() {} }
  const e = environment({ sources, state: { 0: 'usd' }, checkoutLauncher: launcher }), file = 'components/PricingCards.tsx'
  const html = e.render(file, {})
  ok(html.includes('data-sku="one_time_ad"') && html.includes('data-sku="one_time_film35"'), 'real PricingCards SSR exposes both one-off SKUs')
  const tree = e.expand(React.createElement(e.load(file).default, {}))
  const planButtons = e.all(tree, node => node.type === 'button' && String(node.props.className).includes('py-3.5'))
  equal(planButtons.length, 3, 'real PricingCards preserves all three plan purchase buttons')
  const oneOffButtons = e.all(tree, node => node.type === 'button' && node.props.className === 'oti-buy')
  equal(oneOffButtons.length, 2, 'real PricingCards includes both one-off purchase actions')
  oneOffButtons[0].props.onClick({ preventDefault() {} })
  equal(calls.length, 1, 'one real paywall click creates exactly one launcher call')
  equal(calls[0][1], '/api/stripe/checkout?pack=one_time_ad&surface=generate_paywall', 'active paywall carries its faithful pre-video surface into the GET checkout')
}
activePaywall()

async function viewDedupe({ sources = {}, pending = false } = {}) {
  const calls = [], effects = [], storage = new Map(); let accept
  const delayed = new Promise(resolve => { accept = resolve })
  const e = environment({ sources, visible: true, effects, storage, track: (name, metadata) => { calls.push({ name, metadata }); return pending ? delayed : Promise.resolve(calls.length > 1) } })
  const mount = () => { effects.length = 0; e.render(offerFile, { surface: 'ads_choice', newTab: true }); const cleanups = effects.map(effect => effect()); return () => cleanups.forEach(cleanup => cleanup?.()) }
  mount()()
  if (pending) {
    mount()()
    equal(calls.length, 1, 'Strict/remount while the view is pending creates one event')
    accept(true); await flush(); mount()()
    equal(calls.length, 1, 'accepted view stays deduplicated across later mounts')
  } else {
    await flush(); mount()(); await flush()
    equal(calls.length, 2, 'rejected view may retry on the next exposure')
    mount()(); await flush()
    equal(calls.length, 2, 'accepted retry is not inflated by remounts')
  }
  equal(calls[0].name, 'one_time_item_viewed')
  equal(calls[0].metadata.sku, 'one_time_ad')
  equal(calls[0].metadata.surface, 'ads_choice')
  ok([...storage.keys()].some(key => key.includes('ads_choice:one_time_ad')), 'accepted views persist in sessionStorage')
}
await viewDedupe()
await viewDedupe({ pending: true })

const adsForm = { foto: '', frase: 'Produto', oferta: '', beneficios: '', cta: '', language: 'pt', formato: 'product', voice_mode: 'narrated', rota: '', presenter_id: '', category: '', scenario_id: '' }
async function adsCreditFailure(code, stage, sources = {}) {
  const stills = stage === 'choose' ? [{ id: 'still-1', url: 'https://offline.invalid/still.jpg' }] : []
  const orderId = '00000000-0000-4000-8000-000000000001'
  const e = environment({ sources, state: { 0: adsForm, 1: stage, 2: orderId, 3: stills, 4: 'still-1', 7: 41, 11: true }, fetcher: async () => ({ status: 402, ok: false, json: async () => ({ error: code, ...(stage === 'choose' ? { stage: 'chosen', selected_still_id: 'still-1' } : {}) }) }) })
  const props = { lang: 'pt', ownerKey: 'offline', resume: false, balance: 0, onBalance: async () => {} }
  const tree = e.expand(React.createElement(e.load(adsFile).default, props))
  const button = e.all(tree, n => n.type === 'button' && e.text(n).includes(stage === 'choose' ? 'Gerar vídeo com esta foto' : 'Preparar quatro fotos'))[0]
  ok(button, 'the real creation action is available in the fixture')
  button.props.onClick(); await flush()
  equal(e.states[1], stage, 'insufficient credit preserves the creation stage')
  equal(e.states[2], orderId, 'insufficient credit preserves the existing order')
  equal(e.states[3], stills, 'insufficient credit preserves all stills')
  equal(e.states[4], 'still-1', 'insufficient credit preserves the selected still')
  equal(e.states[9], '', 'insufficient credit does not add a red error')
  equal(e.states[19], true, 'server credit refusal opens the neutral one-off choice')
  if (stage === 'choose') equal(e.states[18], true, 'the server-selected photo remains locked across payment')
}
await adsCreditFailure('insufficient_credits', 'choose')
await adsCreditFailure('cena_photo_credits_required', 'planned')
for (const [balance, member, expected] of [[0, false, true], [41, false, false], [0, true, false]]) {
  const e = environment({ state: { 0: adsForm, 1: 'planned', 2: '00000000-0000-4000-8000-000000000001', 7: 41, 11: true } })
  const html = e.render(adsFile, { lang: 'pt', ownerKey: 'offline', balance, oneTimeMember: member })
  equal(html.includes('data-kineo="one-time-item-offer"'), expected, 'offer follows real balance and workspace membership')
  if (member) ok(html.includes('Peça ao dono do espaço'), 'member receives an owner-credit instruction without checkout')
}

function clock() {
  let now = 0, id = 0; const tasks = new Map()
  return { tasks, schedule: (callback, delay) => { const handle = ++id; tasks.set(handle, { at: now + delay, callback }); return handle }, cancel: handle => tasks.delete(handle), async advance(ms) { const end = now + ms; for (;;) { const first = [...tasks.entries()].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!first) break; now = first[1].at; tasks.delete(first[0]); first[1].callback(); await flush() } now = end; await flush() } }
}
async function confirmation({ responses = [{ status: 202 }], sources = {}, advance = 0 } = {}) {
  const e = environment({ sources }), mod = e.load(confirmationFile), time = clock(), calls = [], states = [], redirects = []
  const stop = mod.startOneTimeItemConfirmation({ sessionId: 'cs_test_offline2410', origin: 'https://www.usekineo.com', onState: state => states.push(state), onFulfilled: next => redirects.push(next), schedule: time.schedule, cancel: time.cancel, fetcher: async (url, init) => { calls.push({ url, init }); const r = responses[Math.min(calls.length - 1, responses.length - 1)]; return { status: r.status, json: async () => r.body ?? {} } } })
  await flush(); if (advance) await time.advance(advance)
  return { e, mod, time, calls, states, redirects, stop }
}
const happy = await confirmation({ responses: [{ status: 202 }, { status: 200, body: { state: 'fulfilled', next: '/ads/v2?order=00000000-0000-4000-8000-000000000001' } }], advance: 1500 })
equal(happy.redirects, ['/ads/v2?order=00000000-0000-4000-8000-000000000001'], 'only fulfilled receipt returns to the purchased creation')
equal(happy.time.tasks.size, 0, 'fulfillment clears all confirmation timers')
const pending = await confirmation({ responses: [{ status: 200, body: { state: 'pending', next: '/studio' } }], advance: 30000 })
equal(pending.redirects, [], 'pending body never redirects even when it includes a next URL')
equal(pending.states.at(-1), 'pending', 'bounded polling becomes the neutral pending state')
equal(pending.time.tasks.size, 0, 'timeout clears timers')
ok(pending.calls.every(call => call.url.startsWith('/api/stripe/checkout/item?session_id=') && call.init.method === 'GET'), 'checking a receipt never creates another checkout')
ok(pending.calls.every(call => call.init.signal.aborted), 'timeout aborts any in-flight confirmation')
const auth = await confirmation({ responses: [{ status: 401 }] })
equal(auth.states.at(-1), 'auth'); equal(auth.redirects, [])
const login = new URL(auth.mod.oneTimeItemConfirmationLoginHref('cs_test_offline2410'), 'https://www.usekineo.com')
equal(login.pathname, '/login'); equal(login.searchParams.get('redirect'), '/checkout/item?session_id=cs_test_offline2410', 'login returns to the exact same receipt, never checkout')
for (const next of ['https://evil.invalid/studio', '//evil.invalid/studio', '/pricing', '/studio/../api/stripe/checkout', '/ads/v2/other', '/\\evil.invalid/studio']) equal(auth.mod.oneTimeItemConfirmedDestination(next, 'https://www.usekineo.com'), null, 'invalid destination is rejected')
equal(auth.mod.oneTimeItemConfirmedDestination('/studio?engine=seedance&duration=35&script_mode=ai', 'https://www.usekineo.com'), '/studio?engine=seedance&duration=35&script_mode=ai')
const premature = await confirmation({ responses: [{ status: 202, body: { state: 'fulfilled', next: '/studio' } }] })
equal(premature.redirects, [], 'HTTP pending is never treated as fulfillment'); premature.stop()
const cancelled = await confirmation(); cancelled.stop(); await cancelled.time.advance(30000)
equal(cancelled.calls.length, 1, 'unmount cancels all future polls'); equal(cancelled.time.tasks.size, 0)
{
  const mod = environment().load(confirmationFile), time = clock(), redirects = []; let resolveRequest, signal
  const response = new Promise(resolve => { resolveRequest = resolve })
  const stop = mod.startOneTimeItemConfirmation({ sessionId: 'cs_test_offline2410', origin: 'https://www.usekineo.com', onState() {}, onFulfilled: next => redirects.push(next), schedule: time.schedule, cancel: time.cancel, fetcher: (_url, init) => { signal = init.signal; return response } })
  stop(); ok(signal.aborted, 'unmount aborts a currently pending network request')
  resolveRequest({ status: 200, json: async () => ({ state: 'fulfilled', next: '/studio' }) }); await flush()
  equal(redirects, [], 'a fulfilled response arriving after unmount cannot navigate')
  equal(time.tasks.size, 0, 'in-flight cleanup leaves no deadline timer')
}
for (const state of ['confirming', 'pending', 'auth', 'unavailable']) {
  const mod = environment().load(confirmationFile), html = renderToStaticMarkup(React.createElement(mod.OneTimeItemConfirmationView, { state, loginHref: '/login?redirect=receipt' }))
  ok(!html.includes('/api/stripe/checkout?'), 'confirmation screen never offers a new payment')
  ok(!/(#ff6b6b|text-red-|#bd6c64)/i.test(html), 'all confirmation states use neutral feedback')
}

// Principal mutants prove the checks protect financial/telemetry behavior rather than just executing the happy path.
let killed = 0
async function kills(name, task) { try { await task() } catch (error) { if (error instanceof assert.AssertionError) { killed++; return } throw error } throw new Error(`Surviving mutant: ${name}`) }
const offerSource = fs.readFileSync(path.join(root, offerFile), 'utf8'), confirmSource = fs.readFileSync(path.join(root, confirmationFile), 'utf8')
const adsSource = fs.readFileSync(path.join(root, adsFile), 'utf8')
const paywallSource = fs.readFileSync(path.join(root, 'components/PricingCards.tsx'), 'utf8')
await kills('live paywall drops the one-off option', () => activePaywall({ 'components/PricingCards.tsx': paywallSource.replace('<OneTimeItemOffer surface="generate_paywall" checkout={checkout} />', '') }))
await kills('payment offer bypasses server-selected photo lock', () => adsCreditFailure('out_of_credits', 'choose', { [adsFile]: adsSource.replace("if (action === 'render') absorb(data); setCreditBlocked(true)", 'setCreditBlocked(true)') }))
await kills('displayed price drifts from canonical source', () => offerContract({ [offerFile]: offerSource.replace('label = oneTimeItemPriceLabel(sku)', "label = 'WRONG_PRICE'") }))
await kills('rejected view closes dedupe', () => viewDedupe({ sources: { [offerFile]: offerSource.replace('if (!accepted) return', 'if (false) return') } }))
await kills('Strict remount inflates pending view', () => viewDedupe({ pending: true, sources: { [offerFile]: offerSource.replace('viewed.has(key) || pendingViews.has(key)', 'viewed.has(key)') } }))
await kills('HTTP pending redirects before receipt', async () => { const r = await confirmation({ sources: { [confirmationFile]: confirmSource.replace('response.status === 200', 'response.status === 202') }, responses: [{ status: 202, body: { state: 'fulfilled', next: '/studio' } }] }); equal(r.redirects, []) })
await kills('pending body unlocks creation', async () => { const r = await confirmation({ sources: { [confirmationFile]: confirmSource.replace("body.state === 'fulfilled'", "body.state === 'pending'") }, responses: [{ status: 200, body: { state: 'pending', next: '/studio' } }] }); equal(r.redirects, []) })
await kills('arbitrary internal destinations accepted', () => { const e = environment({ sources: { [confirmationFile]: confirmSource.replace("!['/ads/v2', '/studio'].includes(url.pathname)", 'false') } }); equal(e.load(confirmationFile).oneTimeItemConfirmedDestination('/pricing', 'https://www.usekineo.com'), null) })
console.log(JSON.stringify({ status: 'PASS', checks, mutantsKilled: killed, network: 'offline mocks only', providers: 0, database: 0, realCheckout: 0 }))
