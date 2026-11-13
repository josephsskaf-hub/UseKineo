// Offline server-component contracts: I/O is injected and unlisted imports fail closed.
// Optional extraction audit: KINEO_TEST_BASELINE_REF=1c736d3a6 compares the previous page's
// executed props and reads with the shared Workspace. Ordinary runs need no Git history.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const ROOT = path.resolve(process.env.KINEO_TEST_ROOT || path.join(__dirname, '..'))
const ts = require(path.join(ROOT, 'node_modules/typescript'))
const React = require(path.join(ROOT, 'node_modules/react'))
globalThis.fetch = () => { throw Error('Network forbidden in this offline contract test') }
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8')
const PAGE = 'app/(dashboard)/ads/v2/page.tsx'
const WORKSPACE = 'app/(dashboard)/ads/v2/AdsV2Workspace.tsx'
const ROUTE = 'app/create/[tab]/page.tsx'
const USER = { id: 'fixture-user', email: 'customer@example.org' }
const ORDER = '11111111-2222-3333-4444-555555555555'
let checks = 0
function check(condition, label) { assert.ok(condition, label); checks++ }
const marker = name => Object.assign(function FixtureComponent() {}, { fixtureName: name })
const Client = marker('AdsV2Client'), Provider = marker('PresenterProvider'), Notice = marker('EligibilityNotice')
const Shared = marker('AdsV2Workspace'), Arrival = marker('StudioIdeaArrival'), Shell = marker('CreateShell')
function redirect(href) { throw Object.assign(new Error('redirect'), { redirect: href }) }
function loader(stubs, overrides = {}) {
  const cache = new Map()
  const pure = new Set(['lib/ads/sampleEntry.ts', 'lib/ads/bfCampaign.ts', 'lib/ads/entradaDoMenu.ts', 'lib/growth/visitanteEscreveAntes.ts', 'lib/ads/v2Contract.ts', 'lib/create/entry.ts'])
  function load(p) {
    if (Object.hasOwn(stubs, p)) return stubs[p]
    if (Object.hasOwn(stubs, '@/' + p)) return stubs['@/' + p]
    if (!/\.tsx?$/.test(p)) p += fs.existsSync(path.join(ROOT, p + '.ts')) ? '.ts' : '.tsx'
    if (Object.hasOwn(stubs, p)) return stubs[p]
    if (cache.has(p)) return cache.get(p).exports
    if (![PAGE, WORKSPACE, ROUTE].includes(p) && !pure.has(p)) throw Error('Unmocked module: ' + p)
    const mod = { exports: {} }; cache.set(p, mod)
    const req = name => {
      if (Object.hasOwn(stubs, name)) return stubs[name]
      if (name === 'react/jsx-runtime') return require(path.join(ROOT, 'node_modules/react/jsx-runtime'))
      if (name.startsWith('@/')) return load(name.slice(2))
      if (name.startsWith('.')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(p), name)))
      throw Error('Unmocked import: ' + name)
    }
    const js = ts.transpileModule(overrides[p] ?? read(p), { fileName: p, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
    return mod.exports
  }
  return load
}
function elements(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap(child => elements(child, type))
  if (!React.isValidElement(tree)) return []
  return [...(tree.type === type ? [tree.props] : []), ...elements(tree.props.children, type)]
}
function serial(tree) {
  if (Array.isArray(tree)) return tree.map(serial)
  if (!React.isValidElement(tree)) return tree
  const { children, moldura, showClip, showRecreate, ...props } = tree.props
  return { type: tree.type.fixtureName || String(tree.type), props, children: serial(children) }
}
function fixture(opts = {}) {
  const calls = []
  const user = opts.user === undefined ? USER : opts.user
  const reason = opts.reason || 'paid'
  const eligibility = { state: 'paid', reason: null, country: 'US', resetAt: null, sampleOrderId: null, ...opts.eligibility }
  const db = { from(table) {
    assert.equal(table, 'profiles', 'the page may only read the profile balance')
    calls.push(['from', table])
    return { select(fields) { calls.push(['select', fields]); return this }, eq(key, value) { calls.push(['eq', key, value]); return this }, async maybeSingle() {
      calls.push(['maybeSingle'])
      if (opts.balanceThrows) throw Error('offline read failed')
      return { data: opts.balanceData === undefined ? { video_credits: 120 } : opts.balanceData, error: opts.balanceError || null }
    } }
  } }
  const stubs = {
    'next/navigation': { redirect, notFound() { throw Object.assign(new Error('notFound'), { notFound: true }) } },
    'next/headers': { headers: () => ({ get: key => key === 'x-vercel-ip-country' ? 'US' : null }) },
    '@/lib/supabase/server': { createClient: () => ({ auth: { async getUser() { calls.push(['getUser']); return { data: { user } } } } }) },
    '@/lib/ads/serverAccess': { adsGate: value => value === 'paid' || value === 'internal' ? 'ok' : 'no_access', async loadAdsAccess(...args) { calls.push(['loadAdsAccess', ...args]); return { admin: db, reason, ownerId: opts.ownerId, role: opts.role, ownerPlan: opts.ownerPlan } }, adsSampleOpen: () => { throw Error('unexpected sample read') } },
    '@/lib/ads/v2Access': { adsV2Visible: () => opts.v2Visible !== false },
    '@/lib/ads/v2VariationsAccess': { adsVariationsVisible: () => true },
    '@/lib/serverEvents': { async writeServerEvent(event) { calls.push(['event', event]) } },
    '@/lib/ads/offer': { KINEO1_35S_CREDITS: 777 },
    '@/lib/ads/access': { isAdsInternalEmail: email => email === 'internal@example.org' },
    '@/lib/ads/producao': { PRODUCAO_PUBLIC: true, producaoVisibleFor: () => true },
    '@/lib/ads/workspace': { async loadAdsWorkspaceLabel(admin, uid) { assert.equal(admin, db); calls.push(['workspaceLabel', uid]); return 'Fixture owner' } },
    '@/lib/ads/team': { isTeamOwnerPlan: plan => plan === 'business' },
    '@/lib/businessPlan': { businessAdsOffer: () => ({ fixture: 'unchanged-business-offer' }) },
    '@/components/ads/AdsPresenterPicker': { AdsPresenterAllProvider: Provider },
    'app/(dashboard)/ads/v2/AdsV2Client': { default: Client, __esModule: true },
    '@/lib/ads/cena/catalog': { cenaEnabled: internal => internal },
    '@/lib/ads/cena/escolhaSamplePolicy': { ADS_ESCOLHA_SAMPLE_LIVE: opts.live !== false },
    '@/lib/ads/cena/escolhaPersonalAccess': { async isEscolhaPersonalOrder(admin, uid, id) { assert.equal(admin, db); calls.push(['personalOrder', uid, id]); return (opts.ownedOrders || []).includes(id) } },
    '@/lib/freeFilmPolicy': { paisDoRequest: headers => headers.get('x-vercel-ip-country') },
    '@/lib/ads/eligibility': { async loadAdsEligibility(admin, who, why, context) { assert.equal(admin, db); calls.push(['eligibility', who, why, context]); return eligibility } },
    '@/components/ads/AdsEligibilityNotice': { default: Notice, __esModule: true },
    '@/lib/ads/v2Tiers': { ADS_V2_PUBLIC: true, adsV2Credits: () => 999 },
    '@/lib/recreate/access': { recreateVisible: () => true },
    '@/lib/create/clipNaMoldura': { clipNaMolduraVisivel: () => false },
  }
  return { stubs, calls }
}
async function execute(which, options, query, moldura = false, source) {
  const f = fixture(options)
  try {
    const component = loader(f.stubs, source ? { [which]: source } : {})(which).default
    const tree = await component({ searchParams: query, moldura })
    return { tree, calls: f.calls }
  } catch (error) {
    if (!error.redirect) throw error
    return { redirect: error.redirect, calls: f.calls }
  }
}
const scenarios = [
  { name: 'signed out', options: { user: null }, query: {}, redirect: '/login?redirect=%2Fads%2Fv2' },
  { name: 'signed out owned resume and upgrade', options: { user: null }, query: { entry: ['ugc', 'product'], order: ORDER.toUpperCase(), upgrade: '1' }, redirect: '/login?redirect=' + encodeURIComponent('/ads/v2?entry=ugc&order=' + ORDER + '&upgrade=1') },
  { name: 'guest product', options: { user: null }, query: { entry: 'product', utm_source: 'home_card' }, guest: true },
  { name: 'guest UGC', options: { user: null }, query: { entry: 'ugc', utm_source: 'ads_door' }, guest: true },
  { name: 'subscriber', options: {}, query: {}, balance: 120, sample: false },
  { name: 'workspace member balance belongs to owner', options: { ownerId: 'workspace-owner', role: 'member' }, query: {}, balance: 120, sample: false },
  { name: 'business owner', options: { ownerPlan: 'business' }, query: {}, balance: 120, sample: false },
  { name: 'invalid balance', options: { balanceData: { video_credits: 'not a number' } }, query: {}, balance: null, sample: false },
  { name: 'balance read throws', options: { balanceThrows: true }, query: {}, balance: null, sample: false },
  { name: 'sample available', options: { reason: 'none', eligibility: { state: 'free_sample_available' } }, query: { entry: 'product' }, sample: true, available: true },
  { name: 'sample used and owned', options: { reason: 'none', eligibility: { state: 'free_sample_used', sampleOrderId: ORDER }, ownedOrders: [ORDER] }, query: {}, redirect: '/ads/v2?order=' + ORDER + '&entry=product' },
  { name: 'sample id not owned', options: { reason: 'none', eligibility: { state: 'free_sample_used', sampleOrderId: ORDER } }, query: {}, sample: true, available: false, notice: true },
  { name: 'ineligible country', options: { reason: 'none', eligibility: { state: 'not_eligible', reason: 'country' } }, query: {}, sample: true, available: false, notice: true },
  { name: 'personal resume keeps result', options: { reason: 'none', eligibility: { state: 'free_sample_used', sampleOrderId: ORDER }, ownedOrders: [ORDER] }, query: { order: ORDER }, sample: true, available: false, notice: false },
  { name: 'BF template does not replace with old sample', options: { reason: 'none', eligibility: { state: 'free_sample_used', sampleOrderId: ORDER }, ownedOrders: [ORDER] }, query: { bf_template: 'flash-sale', bf_lang: 'pt' }, sample: true, available: false, notice: true },
  { name: 'internal sample probe loses internal privileges', options: { user: { ...USER, email: 'internal@example.org' }, reason: 'internal', eligibility: { state: 'free_sample_available' } }, query: { sample_probe: '1' }, sample: true, available: true, probe: true },
  { name: 'old rollout fallback', options: { v2Visible: false, live: false }, query: {}, redirect: '/ads/new' },
]
async function main() {
  const baselineRef = process.env.KINEO_TEST_BASELINE_REF
  const baseline = baselineRef ? execFileSync('git', ['show', baselineRef + ':' + PAGE], { cwd: ROOT, encoding: 'utf8' }) : null
  for (const s of scenarios) {
    const legacy = await execute(WORKSPACE, s.options, s.query)
    const framed = await execute(WORKSPACE, s.options, s.query, true)
    assert.deepEqual(framed.calls, legacy.calls, s.name + ': presentation adds no server reads or writes'); checks++
    if (s.redirect) {
      assert.equal(legacy.redirect, s.redirect, s.name); checks++
      assert.equal(framed.redirect, s.redirect.replaceAll('%2Fads%2Fv2', '%2Fcreate%2Fads').replace(/^\/ads\/v2(?=\?)/, '/create/ads'), s.name + ': stays in its shell'); checks++
    } else {
      const props = elements(legacy.tree, Client)[0], newProps = elements(framed.tree, Client)[0]
      check(!!props && !!newProps && newProps.moldura === true, s.name + ': the same real client is framed')
      if (s.guest) {
        check(props.guest === true && props.escolhaOwnerKey === 'visitante', s.name + ': guest identity')
        assert.deepEqual(legacy.calls, [['getUser']], s.name + ': guest cannot read another account'); checks++
      } else {
        assert.equal(props.sample, s.sample, s.name + ': paid/sample gate'); checks++
        if ('balance' in s) { assert.equal(props.initialBalance, s.balance, s.name + ': balance'); checks++ }
        if ('available' in s) { assert.equal(props.escolhaSampleAvailable, s.available, s.name + ': sample entitlement'); checks++ }
        if ('notice' in s) { assert.equal(elements(legacy.tree, Notice).length > 0, s.notice, s.name + ': eligibility notice'); checks++ }
        check(props.escolhaOwnerKey === USER.id + ':' + (s.options.ownerId || USER.id), s.name + ': user/workspace scoped draft')
        if (s.sample) check(!props.variations && !props.producao, s.name + ': no paid modes granted')
        if (s.probe) check(props.sampleProbe && !props.advancedModes && !props.escolhaInternal && !props.escolhaTestControls, s.name + ': probe has no internal privilege')
      }
      assert.deepEqual(serial(framed.tree), serial(legacy.tree), s.name + ': only presentation props differ'); checks++
      if (s.options.role === 'member') {
        assert.deepEqual(props.workspace, { role: 'member', ownerLabel: 'Fixture owner', teamOwner: false }); checks++
        check(legacy.calls.some(c => c[0] === 'eq' && c[2] === 'workspace-owner'), 'member balance uses owner')
      }
      if (s.options.ownerPlan === 'business') check(props.workspace.teamOwner, 'business owner retains team link')
    }
    if (baseline) {
      const previous = await execute(PAGE, s.options, s.query, false, baseline)
      assert.deepEqual(previous.calls, legacy.calls, s.name + ': original server I/O unchanged'); checks++
      assert.equal(previous.redirect, legacy.redirect, s.name + ': original redirect unchanged'); checks++
      assert.deepEqual(serial(previous.tree), serial(legacy.tree), s.name + ': original client props unchanged'); checks++
    }
  }

  // The old route still renders the shared server component without enabling the new frame.
  const wrapper = loader({ 'app/(dashboard)/ads/v2/AdsV2Workspace': { default: Shared, __esModule: true } })(PAGE).default
  const oldQuery = { order: ORDER, mode: 'full' }
  const oldTree = wrapper({ searchParams: oldQuery })
  check(oldTree.type === Shared && oldTree.props.searchParams === oldQuery && !oldTree.props.moldura, 'legacy /ads/v2 remains the unframed workspace')

  // Execute the new route, not a regex over its source. No form, navigation or API is mounted.
  for (const decision of ['show', 'signup', 'not_found']) {
    const f = fixture()
    const query = { entry: 'ugc', order: ORDER, upgrade: '1', bf_template: 'flash-sale', bf_lang: 'pt', utm_source: ['one', 'two'], signup: '1' }
    f.stubs['@/lib/create/access'] = { createShellDecision(tab, user, release, queryString) { f.calls.push(['shellDecision', tab, user?.id, queryString]); return decision === 'signup' ? { kind: 'signup', href: '/signup?fixture=1' } : { kind: decision, showRecreate: true } }, filmNaMoldura: () => false }
    f.stubs['@/lib/create/tabs'] = { CREATE_FILM_CAMPAIGN: 'create_film' }
    f.stubs['@/lib/create/release'] = { CREATE_ENTRY_RELEASE: 'public', CREATE_FILM_INPLACE: 'public', CREATE_SHELL_RELEASE: 'public' }
    f.stubs['lib/create/release'] = f.stubs['@/lib/create/release']
    f.stubs['@/components/create/CreateShell'] = { default: Shell, __esModule: true }
    f.stubs['@/app/(dashboard)/ads/v2/AdsV2Workspace'] = { default: Shared, __esModule: true }
    for (const name of ['@/components/ads/PessoaFalandoPainel', '@/components/create/StudioNaMoldura', '@/components/create/ClipNaMoldura', 'app/create/[tab]/AbaComChegada']) f.stubs[name] = { default: marker(name), __esModule: true }
    f.stubs['@/lib/ads/pessoaFalando/formatos'] = { KINEO_ADS_PESSOA_FALANDO: 'internal', pessoaFalandoLigado: () => false }
    f.stubs['@/lib/growth/studioSimples'] = { campanhaDaCaixa: () => 'unused', motorDaCaixa: () => 'unused' }
    f.stubs['@/lib/growth/ideiaDaPagina'] = { ideiaDoLink: () => '' }
    f.stubs['@/lib/recreate/formats'] = { recreateFormat: () => null }
    f.stubs['@/components/StudioIdeaArrival'] = { default: Arrival, __esModule: true }
    let tree, failure
    try { tree = await loader(f.stubs)(ROUTE).default({ params: { tab: 'ads' }, searchParams: query }) } catch (error) { failure = error }
    if (failure && !failure.redirect && !failure.notFound) throw failure
    const gateCall = f.calls.find(c => c[0] === 'shellDecision')
    check(!!gateCall && gateCall[1] === 'ads', decision + ': shell gate runs before render')
    const encoded = new URLSearchParams(gateCall[3])
    check(encoded.get('order') === ORDER && encoded.get('bf_template') === 'flash-sale' && encoded.getAll('utm_source').join() === 'one,two', decision + ': gate receives complete query')
    if (decision === 'show') {
      if (failure) throw failure
      const props = elements(tree, Shared)[0]
      check(props?.moldura === true && props.searchParams === query, 'Ads receives original query by identity inside new shell')
      check(elements(tree, Arrival).length === 1 && elements(tree, Shell).length === 0, 'conversion arrival preserved; no corridor CreateShell')
    } else check(decision === 'signup' ? failure?.redirect === '/signup?fixture=1' : failure?.notFound, decision + ': gate is honored')
  }
  console.log(`OK: ${checks} offline Ads extraction/route contracts; ${scenarios.length} scenarios${baseline ? '; baseline ' + baselineRef + ' matched' : ''}. No network, generation or billing call.`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
