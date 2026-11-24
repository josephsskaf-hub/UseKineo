// Review of the unified account menu. Real mounted components and routes, with DOM and service doubles.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(import.meta.url)
const rendererPath = require.resolve('react-test-renderer')
const rendererRequire = createRequire(rendererPath)
const React = rendererRequire('react')
const jsx = rendererRequire('react/jsx-runtime')
const { create, act } = require(rendererPath)
const ts = require('typescript')

const releaseFile = 'lib/ui/unifiedAccountMenu.ts'
const settingsFile = 'components/SiteSettingsMenu.tsx'
const contentFile = 'components/AccountMenuContent.tsx'
const pricesFile = 'components/pricing/PricingAccountCredits.tsx'
const balanceFile = 'components/NavCreditsBadge.tsx'
const observerFile = 'components/billing/useVisibleAccountOffer.ts'
const api = '/api/billing/recarga-assinante'
const offerRouteFile = 'app/api/billing/recarga-assinante/route.ts'
const transpiled = new Map()
const sourceOf = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const mutation = (file, before, after) => {
  const source = sourceOf(file)
  assert.equal(source.split(before).length, 2, 'Âncora única em ' + file)
  return { [file]: source.replace(before, () => after) }
}
const actorFor = (email) => email ? { id: email, email, user_metadata: { full_name: 'Conta de prova' } } : null

function world({ release = 'public', email = 'member@example.test', paid = false, changes = {}, waitForUser = false, firstOfferResponse, failFirstProfileRead = false } = {}) {
  const actor = actorFor(email)
  const requests = []
  const events = []
  const observers = new Set()
  const modules = new Map()
  let profileReads = 0
  let resolveUser
  const pendingUser = waitForUser ? new Promise(resolve => { resolveUser = resolve }) : null
  const userReply = { data: { user: actor } }
  const client = { auth: {
    getUser: () => pendingUser ?? Promise.resolve(userReply),
    onAuthStateChange: callback => {
      callback('INITIAL_SESSION', actor ? { user: actor } : null)
      return { data: { subscription: { unsubscribe() {} } } }
    },
  }, channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel() {} }
  const box = { x: 10, left: 10, right: 54, top: 15, bottom: 59, height: 44, width: 44 }
  class NodeDouble {
    constructor(props = {}) { this.props = props; this.isConnected = true }
    focus() { documentDouble.activeElement = this }
    querySelector() { return new NodeDouble() }
    getBoundingClientRect() { return box }
  }
  const body = new NodeDouble()
  const documentDouble = Object.assign(new EventTarget(), { body, activeElement: body, documentElement: { clientWidth: 390 }, querySelector: () => null })
  const windowDouble = Object.assign(new EventTarget(), { innerHeight: 844, location: { pathname: '/pricing', search: '' } })
  class Observer {
    constructor(callback) { this.callback = callback; observers.add(this) }
    observe(element) { this.element = element }
    disconnect() { observers.delete(this) }
  }
  const show = target => act(async () => {
    for (const observer of [...observers]) {
      if (observer.element && target(observer.element.props)) {
        observer.callback([{ isIntersecting: true, intersectionRatio: 1, boundingClientRect: box }])
      }
    }
  })
  const asDefault = component => ({ __esModule: true, default: component })
  const injections = {
    react: React,
    'react/jsx-runtime': jsx,
    'react-dom': { createPortal: node => node },
    'next/link': asDefault(({ children, ...props }) => React.createElement('a', props, children)),
    'next/navigation': { usePathname: () => '/pricing' },
    '@/lib/supabase/client': { createClient: () => client },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => userReply } }) },
    '@supabase/supabase-js': { createClient: () => ({
      from(table) {
        assert.equal(table, 'profiles')
        return { select: () => ({ eq: () => ({ maybeSingle: async () => {
          profileReads++
          if (failFirstProfileRead && profileReads === 1) return { data: null, error: { message: 'fixture profile lookup unavailable' } }
          return { data: paid ? { plan: 'basic', video_credits: 137, stripe_subscription_id: 'sub_fixture' } :
            { plan: 'free', video_credits: 137 }, error: null }
        } }) }) }
      },
    }) },
    '@/lib/serverEvents': { writeServerEvent: async (event) => { events.push(event); return true } },
    '@/lib/internalAccounts': { INTERNAL_EXACT_EMAILS: ['house@example.test'] },
    '@/lib/checkoutPricing': {
      TIER_CREDITS: { starter: 40, basic: 150, pro: 470, business: 800, autopilot: 1000 },
      recargaAssinanteMinFilmCredits: () => 9,
    },
    '@/lib/billing/loadCreditBalanceNotice': { loadCreditBalanceNotice: async () => null },
    '@/lib/analytics': { trackEvent: async (name, metadata) => { events.push({ name, metadata }); return true } },
    '@/lib/auth/sairDaContaCliente': { sairDaConta: async () => {} },
    '@/components/KineoBolt': asDefault(() => null),
    '@/components/InterfaceLanguage': { InterfaceLanguageSelect: () => React.createElement('select'), useInterfaceLanguage: () => 'en', useUiCopy: () => value => value },
    '@/components/AppearanceSettings': { AppearanceSettingsButton: () => React.createElement('button', null, 'Appearance') },
    '@/components/billing/BuyCreditsEntry': {
      BUY_CREDITS_LABEL: 'Buy credits', BUY_CREDITS_OPENED_EVENT: 'buy_credits_entry_opened',
      BuyCreditsModal: ({ surface }) => React.createElement('div', { 'data-test-modal': surface }),
    },
  }
  const fetchDouble = async (input, options = {}) => {
    const url = new URL(input, 'http://proof.invalid')
    requests.push({ path: url.pathname, surface: url.searchParams.get('surface'), method: options.method ?? 'GET' })
    if (url.pathname === '/api/account/menu-visibility') return load('app/api/account/menu-visibility/route.ts').GET()
    if (url.pathname === api) {
      if (firstOfferResponse && (options.method ?? 'GET') === 'GET') {
        const respond = firstOfferResponse
        firstOfferResponse = undefined
        return respond()
      }
      const route = load(offerRouteFile)
      const req = Object.assign(new Request(url, options), { nextUrl: url })
      return options.method === 'POST' ? route.POST(req) : route.GET(req)
    }
    if (url.pathname === '/api/credits') return Response.json({ credits: 137, plan: paid ? 'basic' : 'free' })
    if (url.pathname === '/api/me/subscription') return Response.json({ provider: 'stripe', status: paid ? 'active' : null })
    throw Error('Rede proibida na prova: ' + url.pathname)
  }
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports
    const mod = { exports: {} }
    modules.set(file, mod)
    let source = changes[file] ?? sourceOf(file)
    if (file === releaseFile) source = source.replace(/'(?:off|internal|public)' as InternalRelease/, "'" + release + "' as InternalRelease")
    const cacheKey = file + '\0' + source
    if (!transpiled.has(cacheKey)) {
      transpiled.set(cacheKey, ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      } }).outputText)
    }
    const req = id => {
      if (Object.hasOwn(injections, id)) return injections[id]
      if (!id.startsWith('@/') && !id.startsWith('.')) return require(id)
      const bare = id.startsWith('@/') ? id.slice(2) : path.posix.join(path.posix.dirname(file), id)
      const target = [bare + '.ts', bare + '.tsx', bare + '.json', bare + '/index.ts'].find(candidate => fs.existsSync(path.join(root, candidate)))
      if (!target) throw Error('Importação sem dublê: ' + id)
      return target.endsWith('.json') ? JSON.parse(sourceOf(target)) : load(target)
    }
    const getStyle = () => ({ visibility: 'visible' })
    const fakeEnv = { env: { NEXT_PUBLIC_SUPABASE_URL: 'http://proof.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fake-proof-key' } }
    new Function('module', 'exports', 'require', 'fetch', 'window', 'document', 'HTMLElement', 'IntersectionObserver', 'getComputedStyle', 'process', transpiled.get(cacheKey))(
      mod, mod.exports, req, fetchDouble, windowDouble, documentDouble, NodeDouble, Observer, getStyle, fakeEnv,
    )
    return mod.exports
  }
  let mounted
  return {
    load, requests, events, show, document: documentDouble,
    get profileReads() { return profileReads },
    resolveUser: () => resolveUser?.(userReply),
    async mount(children) {
      const { AccountMenuScopeProvider } = load('components/AccountMenuScope.tsx')
      await act(async () => { mounted = create(React.createElement(AccountMenuScopeProvider, null, children), { createNodeMock: el => new NodeDouble(el.props) }) })
      return mounted.root
    },
    async cleanup() { if (mounted) await act(async () => mounted.unmount()) },
  }
}

const h = React.createElement
const textOf = node => typeof node === 'string' ? node : node.children.map(textOf).join('')
const labeled = (tree, label) => tree.findAll(node => node.type === 'button' && textOf(node).trim() === label)
const trigger = (tree, label) => tree.find(node => node.type === 'button' && node.props['aria-label'] === label)
const gets = caseWorld => caseWorld.requests.filter(x => x.path === api && x.method === 'GET').length
const shown = caseWorld => caseWorld.events.filter(x => x.name === 'recarga_assinante_shown')
const pricingRegion = props => Object.hasOwn(props, 'data-pricing-account-credits')

async function freeDoesNotBuy(changes) {
  const w = world({ changes })
  try {
    const tree = await w.mount(h(w.load(pricesFile).default, { signedIn: true }))
    await w.show(pricingRegion)
    assert.equal(labeled(tree, 'Buy credits').length, 0, 'M1 · conta grátis não ganha oferta')
    assert.equal(tree.findByType('a').children.join(''), 'Upgrade')
  } finally { await w.cleanup() }
}

async function offUsesLegacy(changes) {
  const w = world({ release: 'off', changes })
  try {
    const tree = await w.mount(h(w.load(settingsFile).default))
    assert.equal(trigger(tree, 'Settings').props['data-unified-account-trigger'], undefined, 'M2 · off usa a engrenagem legada')
    assert.equal(gets(w), 0)
  } finally { await w.cleanup() }
}

async function unknownAuthGetsAccount(changes) {
  const w = world({ waitForUser: true, changes })
  try {
    const tree = await w.mount(h(w.load(settingsFile).default))
    await act(async () => trigger(tree, 'Settings').props.onClick())
    const doc = w.document
    doc.activeElement = doc.body
    await act(async () => w.resolveUser())
    assert.equal(labeled(tree, 'Sign out').length, 1, 'M3 · usuário confirmado sem prop tem saída')
    assert.notEqual(doc.activeElement, doc.body, 'foco volta para o painel após verificar a sessão')
  } finally { await w.cleanup() }
}

async function balanceComesFromServer(changes, release = 'public') {
  const w = world({ paid: true, changes, release, email: 'house@example.test' })
  try {
    const tree = await w.mount(h(React.Fragment, null, h(w.load(balanceFile).default, { opensAccount: true }), h(w.load(settingsFile).default)))
    const badge = trigger(tree, 'Credits and account')
    assert.match(badge.children.filter(x => typeof x === 'string').join(''), /137 credits?/, 'M4 · saldo vem da leitura real')
    await act(async () => trigger(tree, 'Settings').props.onClick())
    assert.equal(w.requests.filter(x => x.path === '/api/credits').length, 1, 'saldo da home é compartilhado com o menu')
  } finally { await w.cleanup() }
}

async function offscreenDoesNotRead(changes) {
  const w = world({ paid: true, changes })
  try {
    await w.mount(h(React.Fragment, null, h(w.load(pricesFile).default, { signedIn: true }), h(w.load(settingsFile).default)))
    assert.equal(gets(w), 0, 'M6 · nenhum GET da oferta enquanto fechado ou fora da tela')
  } finally { await w.cleanup() }
}

async function offerAcrossSurfaces({ changes, paid, respond, failFirstProfileRead, concurrent = false, name }) {
  const w = world({ changes, paid, firstOfferResponse: respond, failFirstProfileRead })
  try {
    const tree = await w.mount(h(React.Fragment, null, h(w.load(pricesFile).default, { signedIn: true }), h(w.load(settingsFile).default)))
    const openSettings = () => act(async () => trigger(tree, 'Settings').props.onClick())
    const menuRegion = props => Object.hasOwn(props, 'data-unified-account')

    if (concurrent) {
      await openSettings()
      await w.show(props => pricingRegion(props) || menuRegion(props))
      assert.equal(gets(w), 1, name)
      assert.equal(labeled(tree, 'Buy credits').length, 2, name)
      return
    }

    await w.show(pricingRegion)
    assert.equal(labeled(tree, 'Buy credits').length, 0, 'a primeira leitura sem oferta não mostra recarga')
    await openSettings()
    await w.show(menuRegion)
    assert.equal(gets(w), paid ? 2 : 1, name)
    assert.equal(labeled(tree, 'Buy credits').length, paid ? 1 : 0, name)
    if (failFirstProfileRead) assert.equal(w.profileReads, 2, name)
    assert.equal(labeled(tree, 'Sign out').length, 1)
  } finally { await w.cleanup() }
}

const retry503 = changes => offerAcrossSurfaces({
  changes, paid: true, respond: () => new Response(null, { status: 503 }), name: 'M7 · reconsulta ao abrir depois de 503',
})
const cacheIneligible = changes => offerAcrossSurfaces({
  changes, paid: false, name: 'M8 · resposta inelegível segue em cache',
})
const deduplicate = changes => offerAcrossSurfaces({
  changes, paid: true, concurrent: true, name: 'M9 · superfícies simultâneas fazem uma única leitura',
})

function requestOffer(w, params = {}) {
  const { ACCOUNT_CREDITS_OFFER_SURFACE: surface } = w.load(releaseFile)
  const url = new URL(api, 'http://proof.invalid')
  url.search = new URLSearchParams({ surface, ...params }).toString()
  return w.load(offerRouteFile).GET(Object.assign(new Request(url), { nextUrl: url }))
}

async function databaseErrorIsRetryable(changes) {
  const w = world({ paid: true, failFirstProfileRead: true, changes })
  const failed = await requestOffer(w)
  assert.equal(failed.status, 503, 'M10 · erro de perfil é indisponibilidade temporária')
  assert.equal(failed.headers.get('cache-control'), 'no-store')
  assert.equal(await failed.text(), '', 'a rota não expõe o erro do banco')
  const recovered = await requestOffer(w)
  assert.equal(recovered.status, 200)
  assert.equal((await recovered.json()).show, true, 'a leitura seguinte confirma a oferta')
  assert.equal(shown(w).length, 0, 'a consulta de elegibilidade não conta impressão')
}

async function confirmedFreeIsIneligible(changes) {
  const response = await requestOffer(world({ changes }))
  assert.equal(response.status, 200, 'M11 · perfil grátis válido recebe resposta definitiva')
  assert.deepEqual(await response.json(), { show: false })
}

async function profileErrorOnPurchaseGoesBack(changes) {
  const w = world({ paid: true, failFirstProfileRead: true, changes })
  const failed = await requestOffer(w, { go: '1' })
  assert.equal(failed.status, 303, 'M12 · falha no clique mantém o retorno ao site')
  assert.equal(new URL(failed.headers.get('location')).pathname, '/studio')
  assert.equal(w.events.length, 0, 'sem perfil confirmado, o clique não inicia compra')
  const recovered = await requestOffer(w, { go: '1' })
  assert.equal(recovered.status, 303)
  assert.equal(new URL(recovered.headers.get('location')).pathname, '/api/stripe/checkout')
}

await offerAcrossSurfaces({ paid: true, respond: () => Promise.reject(new TypeError('offline')), name: 'recupera erro de rede' })
await offerAcrossSurfaces({ paid: true, respond: () => Response.json({}), name: 'recupera resposta inválida' })

for (const [id, verify, file, before, after, check] of [
  ['M1', freeDoesNotBuy, pricesFile, 'signedIn === true, region)', "signedIn === true, region) ?? { show: true, qa: false, go: '/invented' }", /M1 ·/],
  ['M2', offUsesLegacy, settingsFile, 'if (menuScope) return', 'if (true) return', /M2 ·/],
  ['M3', unknownAuthGetsAccount, contentFile, 'if (signedIn === false || account) return', 'if (signedIn !== true || account) return', /M3 ·/],
  ['M4', balanceComesFromServer, balanceFile, "{credits === null ? 'Credits' : `${credits} credit${credits === 1 ? '' : 's'}`}", "{'60 credits'}", /M4 ·/],
  ['M7', retry503, observerFile, '        scope.offer = undefined', '        // keep the failed promise', /M7 ·/],
  ['M8', cacheIneligible, observerFile, "        if (offer?.show === false) return null", "        if (offer?.show === false) throw new Error('ineligible')", /M8 ·/],
  ['M9', deduplicate, observerFile, 'if (!scope.offer)', 'if (true)', /M9 ·/],
  ['M10', databaseErrorIsRetryable, offerRouteFile, 'if (eligibilityOnly && error) return new NextResponse(null, { status: 503, headers: NO_STORE })', 'if (eligibilityOnly && error) return HIDE()', /M10 ·/],
  ['M11', confirmedFreeIsIneligible, offerRouteFile, 'eligibilityOnly && error', "eligibilityOnly && (error || row?.plan === 'free')", /M11 ·/],
  ['M12', profileErrorOnPurchaseGoesBack, offerRouteFile, 'eligibilityOnly && error', 'error', /M12 ·/],
  ['M6', offscreenDoesNotRead, observerFile, 'const stop = whenVisible(region.current, () => {', 'const stop = ((_el: HTMLElement, run: () => void) => { run(); return () => {} })(region.current, () => {', /M6 ·/],
]) {
  await verify({})
  await assert.rejects(verify(mutation(file, before, after)), { name: 'AssertionError', message: check })
  console.log(id + ' morto pela asserção esperada')
}

await offerAcrossSurfaces({
  paid: true,
  failFirstProfileRead: true,
  name: 'erro de perfil na rota real libera nova consulta no menu',
})

for (const [email, expected] of [[null, false], ['outsider@example.test', false], ['house@example.test.fake', false], ['house@example.test', true]]) {
  const w = world({ release: 'internal', email })
  try {
    const tree = await w.mount(h(w.load(settingsFile).default))
    assert.equal(Object.hasOwn(trigger(tree, 'Settings').props, 'data-unified-account-trigger'), expected, 'internal só abre para o e-mail exato')
  } finally { await w.cleanup() }
}
await balanceComesFromServer({}, 'internal')
console.log('internal passa pela lista exata e não repete o saldo ao terminar a verificação')

const w = world({ paid: true })
try {
  const { useVisibleAccountOffer, useAccountOfferImpression } = w.load(observerFile)
  function SidebarChip() {
    const chip = React.useRef(null)
    const offer = useVisibleAccountOffer('sidebar_chip', true, chip)
    useAccountOfferImpression('sidebar_chip', offer, chip)
    return h('button', { ref: chip, 'data-fixture-chip': true }, offer ? 'Buy credits' : 'Credits')
  }
  const tree = await w.mount(h(React.Fragment, null,
    h(w.load(pricesFile).default, { signedIn: true }),
    h(w.load(settingsFile).default),
    h(SidebarChip),
  ))
  await w.show(pricingRegion)
  await w.show(props => props['data-fixture-chip'] === true)
  await w.show(props => props['data-fixture-chip'] === true)
  await act(async () => trigger(tree, 'Settings').props.onClick())
  await w.show(props => Object.hasOwn(props, 'data-unified-account'))
  assert.equal(gets(w), 1, 'menu, preços e chip compartilham o GET')
  assert.equal(shown(w).length, 1, 'só o chip que entrou visível depois da elegibilidade foi medido')
  const pricingButton = tree.findByProps({ 'data-pricing-account-credits': '' }).findByType('button')
  await w.show(props => props.onClick === pricingButton.props.onClick)
  await w.show(props => props['data-kineo'] === 'buy-credits-account')
  await w.show(props => props['data-kineo'] === 'buy-credits-account')
  assert.deepEqual(shown(w).map(event => event.metadata.surface).sort(), ['account_pricing', 'pricing_credits', 'sidebar_chip'])
  assert(shown(w).every(event => event.metadata.balance === 137))
  assert.equal(w.profileReads, 1, 'o POST prova a oferta emitida sem ler o perfil uma segunda vez')
  await act(async () => pricingButton.props.onClick())
  assert.equal(tree.findAllByProps({ 'data-test-modal': 'pricing_credits' }).length, 1, 'a barra só abre pelo clique do assinante')
  assert(w.requests.every(request => !request.path.includes('/checkout')))
} finally { await w.cleanup() }
console.log('visibilidade, uma leitura por página, três origens, foco e abertura sem checkout verificados')
