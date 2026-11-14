// M12 revisão independente (CEO 14/11 04:24) — guardião ÚNICO do que precisa ficar de pé ANTES de ligar RECREATE_FLOW_ENABLED.
// Os testes de docs/missao12-1411 não rodam no novos-vermelhos; este roda (nome casa com 'recreate|flow').
// Offline: módulos reais transpilados, I/O injetado. Sem rede, sem banco, sem navegador, sem servidor, sem chamada paga.
// Cada mutante abaixo tem de ficar VERMELHO pela asserção exata que o protege; um mutante verde derruba o guardião.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(ROOT, 'package.json'))
const ts = require('typescript'), React = require('react'), jsx = require('react/jsx-runtime'), { renderToStaticMarkup } = require('react-dom/server')
const { loader } = require(path.join(ROOT, 'docs/recreate-0911/test-recreate.cjs'))
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n')
const ok = (value, label) => { assert.ok(value, label) }
const HOUSE = 'josephsskaf@gmail.com', ACCOUNT = '11111111-2222-4333-8444-555555555555', REF = '22222222-3333-4444-5555-666666666666'
const CLIENT = 'app/recreate/RecreateClient.tsx'

// ---------- RecreateClient com hooks reais em memória (mesmo modelo de scripts/test-recreate-current-flow-1411.mjs) ----------
const nodes = (node, p, out = []) => { if (Array.isArray(node)) { node.forEach(n => nodes(n, p, out)); return out } if (!node || typeof node !== 'object') return out; if (p(node)) out.push(node); return nodes(node.props?.children, p, out) }
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node)
const photo = name => new File(['fixture'], name + '.jpg', { type: 'image/jpeg' })
function client(over, options = {}) {
  const F = over.load('lib/recreate/formats'), E = over.load('lib/recreate/entry'), P = over.load('lib/recreate/catalogPublic'), pricing = over.load('lib/checkoutPricing')
  const quotes = F.RECREATE_FORMATS.map(f => { const credits = f.type === 'swap' ? pricing.recreateCreditCost(f.seconds) : F.recreateEffectCredits(f); return { id: f.id, credits, shortfall: 0, available: credits !== null } })
  const h = { slots: [], cursor: 0, dirty: true, pending: [], tree: null, calls: [], saves: [], navigations: [], expires: 0, intervals: [], timers: new Map(), storage: new Map(), props: { initialId: 'passarela', currentFlow: true, signedIn: false, accountKey: null, guestQuotes: quotes, ...options.props } }
  const useState = initial => { const i = h.cursor++; const slot = h.slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slot.value, value => { slot.value = typeof value === 'function' ? value(slot.value) : value; h.dirty = true }] }
  const useRef = initial => h.slots[h.cursor++] ??= { current: initial }
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
  const useEffect = (create, deps) => { const i = h.cursor++, old = h.slots[i]; if (!old || !same(old.deps, deps)) { const slot = { deps, create, cleanup: old?.cleanup }; h.slots[i] = slot; h.pending.push(slot) } }
  const stub = () => null, prepare = async file => file
  const dependencies = {
    react: { ...React, useState, useRef, useEffect }, 'react/jsx-runtime': jsx, 'next/link': { __esModule: true, default: 'a' },
    '@/components/KineoBolt': { KineoBrandIcon: stub }, '@/lib/clips/clipCatalog': over.load('lib/clips/clipCatalog'), '@/lib/recreate/formats': F, '@/lib/recreate/entry': E, '@/lib/recreate/catalogPublic': P,
    '@/lib/recreate/photos': { compressPhoto: prepare, cropFace: prepare, composePairPhoto: async () => photo('pair') },
    './RecreatePlayer': { __esModule: true, default: 'fixture-player', ExampleCover: 'fixture-cover' },
    '@/components/create/CreateTabs': { __esModule: true, default: stub }, '@/components/create/CreateNavConta': { __esModule: true, default: stub },
    '@/lib/videoDownload': { downloadVideoFile: stub }, '@/lib/downloadNosso': { downloadHref: url => '/api/download?url=' + encodeURIComponent(url) },
    '@/lib/growth/visitanteEscreveAntes': over.load('lib/growth/visitanteEscreveAntes'),
    '@/lib/recreate/flowDraft': {
      async saveRecreateFlowDraft(...args) { h.saves.push(args); return options.saveFails ? null : REF },
      async loadRecreateFlowDraft() { return options.restored ?? null },
      async clearRecreateFlowDraft() {}, async expireRecreateFlowDrafts() { h.expires++ },
    },
  }
  let uuid = 0, timerId = 0
  const window = { location: { assign: url => h.navigations.push(url) }, history: { replaceState() {} }, confirm: () => true, matchMedia: () => ({ matches: false }), addEventListener() {}, removeEventListener() {}, requestAnimationFrame: fn => fn() }
  const fetch = async (url, init = {}) => {
    h.calls.push({ url, ...init })
    if (url === '/api/avatar/upload') return Response.json({ url: 'https://fixture.invalid/storage/v1/object/public/avatars/' + (h.props.accountKey || ACCOUNT) + '/' + h.calls.length + '.jpg' })
    if (url === '/api/recreate' && init.method === 'POST') return options.hangPost ? new Promise(() => {}) : Response.json({ clip: { id: 'fixture-clip', status: 'pending' } })
    if (url === '/api/recreate') return Response.json({ catalog: quotes })
    if (url === '/api/recreate/social') return Response.json({ items: [] })
    if (url.startsWith('/api/recreate/status')) return new Promise(() => {})
    throw Error('Unexpected fixture I/O ' + url)
  }
  const code = ts.transpileModule(over.source(CLIENT), { fileName: CLIENT, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, require: name => { if (name.endsWith('.css')) return {}; if (!Object.hasOwn(dependencies, name)) throw Error('Unmocked dependency ' + name); return dependencies[name] }, window, document: { querySelector: () => null }, URL: { createObjectURL: () => 'blob:fixture-' + (++uuid), revokeObjectURL() {} }, URLSearchParams, File, Blob, FormData, Response, AbortController, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid' } }, fetch, crypto: { randomUUID: () => '11111111-2222-4333-8444-' + String(++uuid).padStart(12, '0') }, sessionStorage: { getItem: key => h.storage.get(key) || null, setItem: (key, value) => h.storage.set(key, value), removeItem: key => h.storage.delete(key) }, setInterval: (fn, delay) => { h.intervals.push(delay); return 1 }, clearInterval() {}, setTimeout: (fn, delay) => { const id = ++timerId; h.timers.set(id, { fn, delay }); return id }, clearTimeout: id => h.timers.delete(id), console }, { filename: CLIENT })
  const Component = module.exports.default
  h.render = () => { h.cursor = 0; h.dirty = false; h.tree = Component(h.props) }
  h.flush = async () => { for (let i = 0; i < 30; i++) { if (h.dirty) h.render(); for (const item of h.pending.splice(0)) { item.cleanup?.(); item.cleanup = item.create() } await Promise.resolve(); await Promise.resolve() } if (h.dirty) throw Error('Hook fixture did not settle') }
  h.click = async node => { node.props.onClick?.({ preventDefault() {} }); await h.flush() }
  h.gen = () => nodes(h.tree, n => n.type === 'button' && Object.hasOwn(n.props, 'data-recreate-generate'))[0]
  h.posts = () => h.calls.filter(c => c.url === '/api/recreate' && c.method === 'POST').length
  h.uploads = () => h.calls.filter(c => c.url === '/api/avatar/upload').length
  h.add = async () => { const target = nodes(h.tree, n => n.type === 'button' && /^(Add your photo|Change photo \d)$/.test(n.props['aria-label'] || ''))[0]; target.props.onPaste({ preventDefault() {}, clipboardData: { items: [{ kind: 'file', getAsFile: () => photo('face') }] } }); await h.flush() }
  h.render(); return h
}

// ---------- módulos reais (páginas do servidor, entrada, saída) com stubs só de sessão e navegação ----------
function world(overrides = {}, session = { user: null }) {
  const stubs = {
    '@/lib/recreate/server': { recreateSession: async () => ({ user: session.user }) },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: session.user } }) } }) },
    '@/lib/recreate/seuVideoPresentation': { seuVideoPresentation: () => ({ audio: 'original', minSeconds: 3, maxSeconds: 30, waitLabel: 'About 5 minutes', defaultPrompts: { 1: 'one', 2: 'two', 3: 'three' } }) },
    'next/navigation': { notFound() { throw Error('not-found') }, redirect(href) { throw Error('redirect:' + href) } },
    'app/recreate/RecreateClient': { __esModule: true, default: function LegacyOrFlowCatalog() {} },
    'app/recreate-preview/SeuVideoRecreateClient': { __esModule: true, default: function OwnVideo() {} },
    'app/recreate/RecreateCatalogPublic': { __esModule: true, default: function CatalogList() {} },
  }
  const files = Object.fromEntries(Object.entries(overrides).map(([file, source]) => [file, source]))
  return { load: loader(stubs, files), source: file => files[file] ?? read(file), overrides: files }
}
const notFound = async (promise, label) => { let error; try { await promise } catch (e) { error = e } ok(error?.message === 'not-found', label) }
const switchOn = over => ({ ...over, 'lib/recreate/flowRelease.ts': (over['lib/recreate/flowRelease.ts'] ?? read('lib/recreate/flowRelease.ts')).replace('RECREATE_FLOW_ENABLED = false', 'RECREATE_FLOW_ENABLED = true') })

const suites = {
  // (mutante 1) a volta do cadastro devolve as fotos e PARA: nada sobe nem gera sem o clique.
  async noAutoGenerate(over) {
    const w = world(over), h = client(w, { props: { signedIn: true, accountKey: ACCOUNT, draftRef: REF }, restored: { photos: [photo('restored')], prompt: 'restored prompt' } })
    await h.flush(); await h.flush()
    ok(h.posts() === 0 && h.uploads() === 0, 'return from signup never uploads or generates by itself')
    ok(!h.gen().props.disabled, 'restored return is ready for an explicit Generate')
    await h.click(h.gen()); ok(h.posts() === 1, 'restored return generates only after the click')
  },
  // (mutante 2) com o interruptor desligado, todo link de visitante (home, catálogo, página de efeito) passa pelo cadastro.
  async entry(over) {
    const w = world(over), E = w.load('lib/recreate/entry'), F = w.load('lib/recreate/formats')
    ok(w.load('lib/recreate/flowRelease').RECREATE_FLOW_ENABLED === false, 'public switch stays off in this delivery')
    const open = F.RECREATE_FORMATS.filter(f => E.publicRecreatePath(f.id))
    ok(open.length > 0, 'fixture has public templates')
    ok(open.every(f => E.recreateEntryHref(f.id, false).startsWith('/signup?')), 'guest home and catalog links go through signup while the switch is off')
    ok(w.load('lib/recreate/catalogPublic').publicRecreateCatalog().every(item => item.href.startsWith('/signup?')), 'public catalog cards keep signup while the switch is off')
    ok(open.every(f => E.recreateEntryHref(f.id, true) === '/recreate/' + f.id), 'signed-in links stay direct')
    const on = world(switchOn(over)).load('lib/recreate/entry')
    ok(open.every(f => on.recreateEntryHref(f.id, false) === '/recreate/' + f.id), 'after approval the guest reaches the editor before the account')
  },
  // (mutante 3) sair da conta apaga as fotos do catálogo guardadas no aparelho.
  async logout(over) {
    let cleared = 0, assigned = null
    const previous = { window: global.window, document: global.document, fetch: global.fetch, setTimeout: global.setTimeout }
    try {
      global.window = { sessionStorage: { length: 0, key: () => null, removeItem() {} }, localStorage: { length: 0, key: () => null, removeItem() {} }, location: { protocol: 'https:', hostname: 'www.usekineo.com', replace(url) { assigned = url } } }
      global.document = { cookie: '' }
      global.fetch = async () => new Response('{}')
      global.setTimeout = (fn, ms) => previous.setTimeout(fn, Math.min(ms, 5))
      const load = loader({
        '@/lib/supabase/client': { createClient: () => ({ auth: { stopAutoRefresh() {}, signOut: async () => ({}) }, removeAllChannels: async () => {} }) },
        '@/lib/recreate/flowDraft': { clearRecreateFlowDraft: async ref => { if (ref === undefined) cleared++ } },
        '@/lib/recreate/seuVideoDraft': { clearSeuVideoDraftsOnLogout: async () => {} },
      }, { 'lib/auth/sairDaContaCliente.ts': (over['lib/auth/sairDaContaCliente.ts'] ?? read('lib/auth/sairDaContaCliente.ts')).replace('process.env.NEXT_PUBLIC_SUPABASE_URL', 'undefined') })
      await load('lib/auth/sairDaContaCliente').sairDaConta()
    } finally { Object.assign(global, previous) }
    ok(assigned !== null, 'logout fixture completed')
    ok(cleared === 1, 'logout clears every catalog photo draft on this device')
  },
  // (mutante 4) prévias e a rota do próprio vídeo ficam fora do índice e do sitemap.
  async noindex(over) {
    const w = world(over)
    for (const file of ['app/recreate-flow-preview/page', 'app/recreate-flow-preview/[id]/page', 'app/recreate/your-video/page', 'app/recreate/[id]/page']) {
      const robots = w.load(file).metadata?.robots
      ok(robots && robots.index === false, 'preview and flow routes are noindex')
    }
    const sitemap = fs.existsSync(path.join(ROOT, 'app/sitemap.ts')) ? read('app/sitemap.ts') : ''
    ok(!/recreate-flow-preview|recreate\/your-video/.test(sitemap), 'preview and own-video routes stay out of the sitemap')
  },
  // (mutante 5) o fluxo novo varre o rascunho vencido ao abrir e de minuto em minuto (as fotos não ficam para sempre no aparelho).
  async sweep(over) {
    const w = world(over), h = client(w); await h.flush()
    ok(h.expires >= 1 && h.intervals.includes(60_000), 'flow sweeps expired photo drafts on open and every minute')
    const legacy = client(w, { props: { currentFlow: false, signedIn: true, accountKey: ACCOUNT } }); await legacy.flush()
    ok(legacy.expires === 0, 'legacy page never opens the draft store')
  },
  // (mutante 6) interruptor desligado: as páginas de hoje continuam no cliente de hoje, e /recreate/your-video não existe.
  async legacy(over) {
    const guest = world(over), house = world(over, { user: { id: ACCOUNT, email: HOUSE } }), customer = world(over, { user: { id: ACCOUNT, email: 'customer@example.org' } })
    ok(guest.load('lib/recreate/flowRelease').RECREATE_FLOW_ENABLED === false, 'public switch stays off in this delivery')
    const guestIndex = await guest.load('app/recreate/page').default()
    ok(guestIndex.type.name === 'CatalogList', 'guest /recreate keeps the public catalog list')
    for (const w of [house, customer]) {
      const index = await w.load('app/recreate/page').default()
      const model = await w.load('app/recreate/[id]/page').default({ params: { id: 'passarela' } })
      ok(!index.props.currentFlow && !model.props.currentFlow && !index.props.flowBasePath && !model.props.flowBasePath, 'legacy pages keep the legacy client while the switch is off')
      await notFound(w.load('app/recreate/your-video/page').default({}), 'own-video route stays closed while the switch is off')
    }
    const preview = await house.load('app/recreate-preview/page').default({})
    ok(!preview.props.currentFlow && !preview.props.flowBasePath, 'legacy own-video preview keeps the legacy client')
  },
  // (mutante 7) a prévia escura de antes (/recreate-preview) nunca recebe a classe nem o invólucro do fluxo novo.
  async darkPreview(over) {
    const stubLink = { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) }
    const load = loader({ 'next/link': stubLink, '@/components/KineoBolt': { KineoBrandIcon: () => null }, '@/components/create/CreateTabs': { __esModule: true, default: () => null }, '@/components/create/CreateNavConta': { __esModule: true, default: () => null } }, over)
    const Own = load('app/recreate-preview/SeuVideoRecreateClient').default
    const presentation = { audio: 'original', minSeconds: 3, maxSeconds: 30, waitLabel: 'About 5 minutes', defaultPrompts: { 1: 'one', 2: 'two', 3: 'three' } }
    const dark = renderToStaticMarkup(React.createElement(Own, { signedIn: false, generationAllowed: false, accountKey: null, presentation }))
    ok(dark.startsWith('<main class="sv-page"') && !dark.includes('sv-current-flow') && !dark.includes('data-seu-video-flow'), 'legacy dark preview keeps its own class without the new flow')
    const flow = renderToStaticMarkup(React.createElement(Own, { signedIn: false, generationAllowed: false, accountKey: null, presentation, currentFlow: true }))
    ok(flow.startsWith('<div class="recreate"><main class="sv-page sv-current-flow"'), 'new flow keeps its wrapper only when asked')
  },
  // Item 1: "com o seu vídeo" só aparece para quem pode gerar; ao cliente vai só o booleano.
  async ownVideo(over) {
    const on = switchOn(over)
    const customer = world(on, { user: { id: ACCOUNT, email: 'customer@example.org' } }), house = world(on, { user: { id: ACCOUNT, email: HOUSE } }), guest = world(on)
    const page = w => w.load('app/recreate/RecreateFlowPage').default
    ok((await page(customer)({ basePath: '/recreate' })).props.ownVideoVisible === false, 'customer catalog gets ownVideoVisible=false')
    ok((await page(guest)({ basePath: '/recreate' })).props.ownVideoVisible === false, 'guest catalog gets ownVideoVisible=false while own video is house-only')
    ok((await page(house)({ basePath: '/recreate' })).props.ownVideoVisible === true, 'house catalog keeps the own-video entry')
    await notFound(customer.load('app/recreate/your-video/page').default({}), 'customer cannot open /recreate/your-video after approval')
    await notFound(guest.load('app/recreate/your-video/page').default({}), 'guest cannot open /recreate/your-video after approval')
    ok((await house.load('app/recreate/your-video/page').default({})).props.generationAllowed === true, 'house opens and generates with own video')
    const props = (await page(customer)({ basePath: '/recreate' })).props
    ok(!Object.keys(props).some(key => /release|email|allow/i.test(key) && key !== 'generationAllowed'), 'only booleans reach the client, never the release rule')
    const h = client(customer, { props: { initialId: undefined, signedIn: true, accountKey: ACCOUNT, ownVideoVisible: false } }); await h.flush()
    ok(!nodes(h.tree, n => typeof n.props?.href === 'string' && n.props.href.endsWith('/your-video')).length, 'no Use your video link without server permission')
    const s = client(customer, { props: { signedIn: true, accountKey: ACCOUNT, ownVideoVisible: false } }); await s.flush()
    ok(!nodes(s.tree, n => typeof n.props?.href === 'string' && n.props.href.endsWith('/your-video')).length, 'no Use your video link beside the selected template without permission')
  },
  // Item 2: sem armazenamento no aparelho, o visitante segue ao cadastro (e põe a foto depois) em vez de ficar preso.
  async withoutSave(over) {
    const w = world(over), h = client(w, { saveFails: true }); await h.flush(); await h.add(); await h.click(h.gen())
    ok(h.navigations.length === 0, 'failed save never leaves silently')
    const button = nodes(h.tree, n => n.type === 'button' && text(n) === 'Continue without saving photos')[0]
    ok(!!button && /add your photo after/.test(text(h.tree)), 'storage failure offers to continue without saving photos')
    await h.click(button)
    const back = new URL(new URL(h.navigations[0] ?? '/', 'https://fixture.invalid').searchParams.get('redirect') ?? '/', 'https://fixture.invalid')
    ok(h.navigations.length === 1 && back.pathname === '/recreate-flow-preview/passarela' && !back.searchParams.has('draft'), 'continue goes to signup and back to the same template, without a draft')
    ok(h.posts() === 0 && h.uploads() === 0, 'continuing without saving uploads and generates nothing')
  },
  // Item 3: o POST /api/recreate tem até 60 s no servidor; o cliente espera 75 s antes de chamar de incerto.
  async postTimeout(over) {
    const w = world(over), h = client(w, { props: { signedIn: true, accountKey: ACCOUNT }, hangPost: true }); await h.flush(); await h.add()
    const before = new Set(h.timers.keys()); await h.click(h.gen())
    const delays = [...h.timers.entries()].filter(([id]) => !before.has(id)).map(([, t]) => t.delay)
    const serverMax = Number(/export const maxDuration = (\d+)/.exec(read('app/api/recreate/route.ts'))?.[1])
    ok(h.posts() === 1 && delays.length === 1 && delays[0] >= 75_000 && delays[0] > serverMax * 1000, 'POST waits 75 s, longer than the server maxDuration')
  },
  // Item 4: alvo de toque de 44 px nos botões novos do fluxo.
  async touch(over) {
    const css = (over['app/recreate/currentFlow.css'] ?? read('app/recreate/currentFlow.css'))
    const rule = css.split('\n').find(line => line.includes('min-height:44px') && line.includes('.rc-notice button'))
    ok(!!rule && ['.rc-notice button', '.rc-flow-output .rc-change', '.rc-next-note button', '.rc-next-note a'].every(s => rule.includes(s)), 'recovery buttons have a 44 px touch target')
    ok([...css.matchAll(/font-size:(\d+)px/g)].every(m => Number(m[1]) >= 12), 'flow CSS has no text below 12 px')
  },
  // Item 8: a prévia abre para qualquer um, mas só conta da casa gasta crédito nela.
  async previewLock(over) {
    const customer = world(over, { user: { id: ACCOUNT, email: 'customer@example.org' } }), house = world(over, { user: { id: ACCOUNT, email: HOUSE } }), guest = world(over)
    const preview = w => w.load('app/recreate-flow-preview/[id]/page').default({ params: { id: 'passarela' } })
    ok((await preview(customer)).props.generationAllowed === false, 'customer preview opens with Generate locked')
    ok((await preview(house)).props.generationAllowed === true, 'house preview can generate')
    ok((await preview(guest)).props.generationAllowed === true, 'guest preview still goes to signup on Generate')
    ok((await world(switchOn(over), { user: { id: ACCOUNT, email: 'customer@example.org' } }).load('app/recreate/[id]/page').default({ params: { id: 'passarela' } })).props.generationAllowed === true, 'regular route after approval is not locked')
    const h = client(customer, { props: { signedIn: true, accountKey: ACCOUNT, generationAllowed: false } }); await h.flush(); await h.add()
    ok(h.gen().props.disabled === true && /approved accounts only/.test(text(h.tree)), 'locked preview disables Generate and says why')
    await h.gen().props.onClick({ preventDefault() {} }); await h.flush()
    ok(h.posts() === 0 && h.uploads() === 0, 'locked preview never uploads or spends credits')
  },
}

const sources = {}
const src = file => sources[file] ??= read(file)
const mutate = (file, from, to) => { assert.equal(src(file).split(from).length, 2, 'unique mutant anchor: ' + from.slice(0, 60)); return { [file]: src(file).replace(from, to) } }
const mutants = [
  ['gerar sozinho no retorno do catálogo', 'noAutoGenerate', () => mutate(CLIENT, "  type StepState = 'todo' | 'active' | 'done' | 'error'", "  useEffect(() => { if (currentFlow && draftRef && !restoring && photosDone && flowQuoteReady) void generate(false) }, [restoring, photosDone, flowQuoteReady])\n  type StepState = 'todo' | 'active' | 'done' | 'error'"), 'return from signup never uploads or generates by itself'],
  ['link da home sem cadastro', 'entry', () => mutate('lib/recreate/entry.ts', 'signedIn || (RECREATE_FLOW_ENABLED && publicRecreatePath(id))', 'signedIn || publicRecreatePath(id)'), 'guest home and catalog links go through signup while the switch is off'],
  ['logout sem limpar o rascunho de fotos', 'logout', () => mutate('lib/auth/sairDaContaCliente.ts', "    import('@/lib/recreate/flowDraft').then(module => module.clearRecreateFlowDraft()),\n", ''), 'logout clears every catalog photo draft on this device'],
  ['prévia indexável', 'noindex', () => mutate('app/recreate-flow-preview/[id]/page.tsx', 'robots: { index: false, follow: false }', 'robots: { index: true, follow: true }'), 'preview and flow routes are noindex'],
  ['rascunho que nunca expira', 'sweep', () => mutate(CLIENT, '    if (!currentFlow) return\n    void expireRecreateFlowDrafts()', '    return\n    void expireRecreateFlowDrafts()'), 'flow sweeps expired photo drafts on open and every minute'],
  ['página legada usando o fluxo novo', 'legacy', () => mutate('app/recreate/page.tsx', 'return <RecreateClient internalTools=', 'return <RecreateClient currentFlow flowBasePath="/recreate" internalTools='), 'legacy pages keep the legacy client while the switch is off'],
  ['classe nova forçada na prévia escura', 'darkPreview', () => mutate('app/recreate-preview/SeuVideoRecreateClient.tsx', "className={currentFlow?'sv-page sv-current-flow':'sv-page'}", "className={'sv-page sv-current-flow'}"), 'legacy dark preview keeps its own class without the new flow'],
  ['"com o seu vídeo" para todos', 'ownVideo', () => mutate('app/recreate/RecreateFlowPage.tsx', "const ownVideoVisible = user ? releaseVisible(user.email, SEU_VIDEO_RELEASE) : SEU_VIDEO_RELEASE === 'public'", 'const ownVideoVisible = true'), 'customer catalog gets ownVideoVisible=false'],
  ['link do próprio vídeo sem permissão', 'ownVideo', () => mutate(CLIENT, '{currentFlow && ownVideoVisible && <Link className="rc-flow-own"', '{currentFlow && <Link className="rc-flow-own"'), 'no Use your video link without server permission'],
  ['visitante preso sem armazenamento', 'withoutSave', () => mutate(CLIENT, '    if (!ref) setWithoutSave(true)\n', ''), 'storage failure offers to continue without saving photos'],
  ['POST com 30 s', 'postTimeout', () => mutate(CLIENT, 'FLOW_POST_MS = 75_000', 'FLOW_POST_MS = 30_000'), 'POST waits 75 s, longer than the server maxDuration'],
  ['botões com alvo pequeno', 'touch', () => mutate('app/recreate/currentFlow.css', ',.recreate.rc-current-flow .rc-flow-output .rc-change', ''), 'recovery buttons have a 44 px touch target'],
  ['prévia gasta crédito de cliente', 'previewLock', () => mutate('app/recreate/RecreateFlowPage.tsx', "const generationAllowed = basePath === '/recreate' || !user || releaseVisible(user.email, 'internal')", 'const generationAllowed = true'), 'customer preview opens with Generate locked'],
  ['Generate da prévia sem trava no cliente', 'previewLock', () => mutate(CLIENT, '    if (previewLocked) { setMessage(PREVIEW_LOCKED_MESSAGE); return }\n', ''), 'locked preview never uploads or spends credits'],
]

let checks = 0
for (const [name, run] of Object.entries(suites)) { await run({}); checks++; console.log('ok ' + name) }
const vermelhos = []
for (const [name, suite, make, message] of mutants) {
  let error
  try { await suites[suite](make()) } catch (e) { error = e }
  assert.ok(error instanceof assert.AssertionError && error.message === message, `mutante "${name}" devia ficar VERMELHO em "${message}"; veio: ${error?.message ?? 'VERDE'}`)
  vermelhos.push(name); console.log('VERMELHO mutante: ' + name + ' -> ' + message)
}
console.log(`PASS guardas M12: ${checks} cenários verdes; ${vermelhos.length}/${mutants.length} mutantes vermelhos pela asserção exata; offline, I/O injetado.`)
