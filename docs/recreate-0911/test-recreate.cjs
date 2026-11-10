// Offline only: real modules and SQL with injected I/O. No credentials, network or provider calls.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ROOT = path.resolve(__dirname, '../..')
const ts = require(path.join(ROOT, 'node_modules/typescript'))
const React = require(path.join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(path.join(ROOT, 'node_modules/react-dom/server'))
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8')
function loader(stubs = {}, overrides = {}) {
  const cache = new Map()
  function load(p) {
    if (Object.hasOwn(stubs, p)) return stubs[p]
    if (p.endsWith('.css') || p === 'server-only') return {}
    if (!p.match(/\.(tsx?|json)$/)) p += fs.existsSync(path.join(ROOT, p + '.ts')) ? '.ts' : '.tsx'
    if (cache.has(p)) return cache.get(p).exports
    if (p.endsWith('.json')) return JSON.parse(read(p))
    const mod = { exports: {} }; cache.set(p, mod)
    const req = name => {
      if (Object.hasOwn(stubs, name)) return stubs[name]
      if (name.startsWith('@/')) return load(name.slice(2))
      if (name.startsWith('.')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(p), name)))
      return require(require.resolve(name, { paths: [ROOT] }))
    }
    const src = overrides[p] ?? read(p)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: p }).outputText
    new Function('require', 'module', 'exports', 'process', js)(req, mod, mod.exports, process)
    return mod.exports
  }
  return load
}
const U = '11111111-2222-3333-4444-555555555555'
const URL = 'https://fixture.supabase.co'
const PHOTO = `${URL}/storage/v1/object/public/avatars/${U}/face.jpg`
const load = loader()
const formats = load('lib/recreate/formats')
const generation = load('lib/recreate/generation')
const access = load('lib/recreate/access')
function render(id, quotes = true, opts = {}, balance = 40, swapCredits) {
  let state = 0
  const react = { ...React, useEffect: () => {}, useRef: value => ({ current: value }), useState: init => {
    const i = state++
    let value = typeof init === 'function' ? init() : init
    if (i === 4 && quotes) value = formats.RECREATE_FORMATS.map(f => { const credits = f.type === 'swap' ? (swapCredits ?? generation.RECREATE_PRICING[f.seconds]) : formats.recreateEffectCredits(f); return { id: f.id, credits, shortfall: Math.max(0, credits - balance), available: true } })
    if (i === 5) value = Object.fromEntries(formats.RECREATE_FORMATS.map(f => [f.id, { count: 0, liked: false }]))
    return [value, () => {}]
  } }
  const local = loader({ react, 'next/link': { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) } }, opts)
  const component = local('app/recreate/RecreateClient').default
  return renderToStaticMarkup(React.createElement(component, { initialId: id }))
}
async function main() {
  for (const release of ['off', 'internal']) for (const email of [null, 'test-hacker@example.org', 'mailinator@example.org', 'customer@example.org']) assert.equal(access.releaseVisible(email, release), false)
  assert.equal(access.recreateVisible('josephsskaf@gmail.com'), true)
  assert.equal(access.releaseVisible('josephsskaf@gmail.com', 'off'), false)
  assert.equal(access.RECREATE_RELEASE, 'internal'); assert.equal(access.RECREATE_MOTION_ENABLED, false)
  assert.equal(formats.recreateFormat('futebol'), null)
  assert(formats.recreateFormat('effect-kiss').photoSlots === 2)
  const request = { format: 'outfit-morph', seconds: 10, photos: [PHOTO], consent: true, mode: 'swap' }
  const ctx = { userId: U, supabaseUrl: URL, paying: false }
  const plan = generation.planRecreate(request, ctx)
  assert(plan.ok); assert.equal(plan.plan.credits, 40); assert.equal(plan.plan.input.resolution, '768P')
  assert.deepEqual(generation.RECREATE_PRICING, { 10: 40, 15: 60 })
  const future = loader({}, { 'lib/recreate/formats.ts': read('lib/recreate/formats.ts').replace("seconds: 10, type: 'swap'", "seconds: 15, type: 'swap'") })('lib/recreate/generation')
  assert.equal(future.planRecreate({ ...request, seconds: 15 }, { ...ctx, paying: true }).plan.credits, 60)
  assert.equal(future.planRecreate({ ...request, seconds: 15 }, ctx).status, 402)
  assert.equal(future.planRecreate(request, ctx).status, 409, 'cannot buy a future 15 s source at the 10 s rate')
  for (const raw of [{ ...request, photos: ['https://elsewhere.org/a.png'] }, { ...request, photos: [PHOTO.replace(U, U.replace('1111', '9999'))] }, { ...request, consent: false }, { ...request, mode: 'motion' }, { ...request, seconds: 15 }]) assert.equal(generation.planRecreate(raw, ctx).ok, false)
  assert.equal(generation.planRecreate({ ...request, seconds: 15 }, { ...ctx, paying: true }).status, 409)
  assert.equal(generation.planRecreate({ ...request, credits: 0, engine: 'other', video_url: 'https://elsewhere.org/source.mp4' }, ctx).plan.credits, 40)
  const flow = load('lib/clips/clipFlow')
  // Actual server adapter: only the catalog's house asset is uploaded, and the provider gets our durable URL.
  const wired = []
  const server = loader({
    'server-only': {},
    '@/lib/supabase/server': {},
    '@/lib/engineLaunch': { enginePaused: () => null },
    '@/lib/clips/clipServer': { submitDepsFor: () => ({ engineAccess: () => ({ ok: false, reason: 'plan', status: 402 }), submit: async (model, input) => { wired.push({ model, input }); return { ok: true, requestId: 'wired-fixture' } } }) },
  })('lib/recreate/server')
  const admin = { storage: { from: () => ({ upload: async (key, bytes) => { assert(bytes.byteLength > 0); wired.push({ key }); return { error: null } }, getPublicUrl: key => ({ data: { publicUrl: `https://ours.org/${key}` } }) }) } }
  const adapter = server.recreateSubmitDeps(admin, {}, {}, formats.recreateFormat('outfit-morph'))
  assert(adapter.engineAccess('h3').ok, 'Recreate uses its own credit tariff rather than the old H3 film plan gate')
  assert((await adapter.submit(generation.RECREATE_MODEL, { ...plan.plan.input, video_url: 'https://attacker.org/source.mp4' })).ok)
  assert.equal(wired[1].input.video_url, 'https://ours.org/recreate-sources/v1/outfit-morph-v6.mp4')
  const calls = []
  let stored = null
  const deps = {
    supabaseUrl: URL, engineAccess: () => ({ ok: true }), findByKey: async () => stored,
    countActive: async () => 0, verifyImage: async () => calls.push('photo'), moderate: async () => { calls.push('moderate'); return { ok: true } },
    getBalance: async () => 40, newId: () => U,
    insertPending: async row => { stored = row; calls.push('insert'); return { ok: true } },
    debit: async (_, cost) => { calls.push(['debit', cost]); return { ok: true, balance: 40 - cost } },
    refund: async () => { calls.push('refund'); return 40 }, submit: async (model, input) => { calls.push(['submit', model, input]); return { ok: true, requestId: 'fixture-request' } },
    markSubmitted: async () => true, markFailed: async () => true, event: async () => {}, now: () => Date.parse('2026-11-09T12:00:00Z'),
  }
  const args = { userId: U, idempotencyKey: 'recreate-fixture-01', body: plan.plan.body, recreatePlan: plan.plan }
  assert((await flow.submitClip(deps, args)).ok)
  assert.deepEqual(calls.find(c => Array.isArray(c) && c[0] === 'debit'), ['debit', 40])
  assert.equal(stored.credits, 40)
  assert.equal(calls.filter(c => Array.isArray(c) && c[0] === 'submit').length, 1)
  assert(calls.indexOf('moderate') < calls.indexOf('insert'))
  assert(calls.findIndex(c => Array.isArray(c) && c[0] === 'debit') < calls.findIndex(c => Array.isArray(c) && c[0] === 'submit'))
  assert((await flow.submitClip(deps, args)).replay)
  assert.equal(calls.filter(c => Array.isArray(c) && c[0] === 'submit').length, 1)
  assert.equal(calls.filter(c => Array.isArray(c) && c[0] === 'debit').length, 1)
  const row = { ...stored, status: 'processing', fal_request_id: 'fixture-request', credits: 40 }
  const settle = { poll: async () => ({ state: 'failed', error: 'fixture' }), persist: async () => { throw new Error('must not persist failed output') }, refund: async () => { calls.push('settle-refund'); return 40 }, markFailed: async () => true, markDone: async () => true, event: async () => {}, now: deps.now }
  assert.equal((await flow.settleClip(settle, row)).credits_refunded, 40)
  const success = { ...settle, poll: async () => ({ state: 'done', url: 'https://provider.org/output.mp4' }), persist: async () => { calls.push('persist'); return 'https://ours.org/output.mp4' }, markDone: async () => { calls.push('done'); return true } }
  assert.equal((await flow.settleClip(success, row)).video_url, 'https://ours.org/output.mp4')
  assert(calls.indexOf('persist') < calls.indexOf('done'))
  stored = null; calls.length = 0
  const second = await flow.submitClip({ ...deps, getBalance: async () => 0 }, { ...args, idempotencyKey: 'recreate-second-01' })
  assert(!second.ok); assert.equal(second.code, 'credits'); assert.equal(second.balance, 0)
  assert(!calls.some(c => c === 'insert' || (Array.isArray(c) && ['debit','submit'].includes(c[0]))))
  const fifteen = future.planRecreate({ ...request, seconds: 15 }, { ...ctx, paying: true }).plan
  const starter15 = await flow.submitClip(deps, { ...args, body: fifteen.body, recreatePlan: fifteen })
  assert(!starter15.ok); assert.equal(starter15.code, 'credits'); assert.equal(starter15.balance, 40)
  // Existing effects still use their exact original server recipe/tariff.
  const fx = load('lib/clips/clipEffects')
  for (const f of formats.RECREATE_FORMATS.filter(f => f.type === 'effect')) {
    stored = null; calls.length = 0
    const resolved = fx.resolveClipEffectRequest(f.effectKey, { visible: true, imageUrl: PHOTO })
    assert(resolved.ok)
    const result = await flow.submitClip({ ...deps, getBalance: async () => 1000 }, { userId: U, idempotencyKey: 'effect-fixture-01', body: resolved.body })
    assert(result.ok); assert.equal(result.clip.credits, fx.clipEffectCredits(resolved.effect))
    assert.deepEqual(calls.find(c => Array.isArray(c) && c[0] === 'debit'), ['debit', fx.clipEffectCredits(resolved.effect)])
  }
  // Auth and simulation execute the real API before all I/O.
  const never = () => { throw new Error('Unexpected I/O') }
  const routeStubs = {
    '@/lib/recreate/server': { recreateSession: async () => ({ user: { id: U }, supabase: {} }), RECREATE_HEADERS: {}, recreateSubmitDeps: never },
    '@/lib/clips/clipServer': { clipsAdmin: never, loadClipAccount: never, engineAccessFor: never },
    '@/app/api/admin/_shared/mrr': { isPayingPlan: never }, '@/lib/serverEvents': { writeServerEvent: never },
  }
  const api = loader(routeStubs)('app/api/recreate/route')
  const { NextRequest } = require(require.resolve('next/server', { paths: [ROOT] }))
  const req = body => new NextRequest('https://www.usekineo.com/api/recreate', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
  const sim = await api.POST(req({ format: 'outfit-morph', simulate: true }))
  assert.equal(sim.status, 200); const simulated = await sim.json(); assert.equal(simulated.charged, false); assert.equal(simulated.credits, 40)
  // Real quote/POST response, with only external I/O injected. Credit race also reports the fresh shortfall.
  let accountBalance = 40
  let failure = { ok: false, code: 'credits', status: 402, balance: 2 }
  const creditApi = loader({ ...routeStubs,
    '@/lib/recreate/server': { ...routeStubs['@/lib/recreate/server'], recreateEngineAccess: () => ({ ok: true }), recreateSubmitDeps: () => ({}) },
    '@/lib/clips/clipServer': { clipsAdmin: () => ({}), loadClipAccount: async () => ({ balance: accountBalance }), engineAccessFor: () => () => ({ ok: true }) },
    '@/lib/clips/clipFlow': { submitClip: async () => failure },
  })('app/api/recreate/route')
  const catalog = (await (await creditApi.GET()).json()).catalog
  assert.deepEqual(catalog.find(q => q.id === 'outfit-morph'), { id: 'outfit-morph', credits: 40, shortfall: 0, available: true })
  for (const f of formats.RECREATE_FORMATS.filter(f => f.type === 'effect')) assert.equal(catalog.find(q => q.id === f.id).credits, fx.clipEffectCredits(fx.clipEffectByKey(f.effectKey)))
  const effectRequest = { format: 'effect-kiss', consent: true, image_url: PHOTO }
  const poor = await creditApi.POST(req(effectRequest)); assert.equal(poor.status, 402)
  const short = await poor.json(); assert.equal(short.shortfall, formats.recreateEffectCredits(formats.recreateFormat('effect-kiss')) - 2); assert.equal(short.plans, '/pricing')
  failure = { ok: false, code: 'debit_failed', status: 402 }; accountBalance = 0
  assert.equal((await (await creditApi.POST(req(effectRequest))).json()).shortfall, formats.recreateEffectCredits(formats.recreateFormat('effect-kiss')))
  routeStubs['@/lib/recreate/server'].recreateSession = async () => ({ user: null })
  assert.equal((await loader(routeStubs)('app/api/recreate/route').POST(req(request))).status, 404)
  for (const id of [undefined, ...formats.RECREATE_FORMATS.map(f => f.id)]) {
    const html = render(id)
    assert(!/Kling|MiniMax|PixVerse|Seedance|Nano Banana|Genjutsu|Objects swap|Community trending|Model/.test(html))
    assert(!/♡\s*0/.test(html))
    const withoutGenerate = html.replace(/<button[^>]*data-recreate-generate[^>]*>[\s\S]*?<\/button>/g, '')
    assert(!/✦\s*\d|\$\d/.test(withoutGenerate), 'price outside Generate')
    assert(!/\d+ credits/.test(withoutGenerate.replace(/You need \d+ more credits\./g, '')), 'only shortfall may appear outside Generate')
  }
  const starter = render('outfit-morph')
  assert(/✦ 40/.test(starter)); assert(!/You need/.test(starter))
  const insufficient = render('outfit-morph', true, {}, 20)
  assert(/You need 20 more credits/.test(insufficient)); assert(/href="\/pricing"/.test(insufficient))
  assert(/<button[^>]*data-recreate-generate[^>]*disabled/.test(insufficient))
  assert(!read('app/recreate/RecreateClient.tsx').includes('type="video"'))
  function contracts(overrides = {}) {
    const modules = loader({}, overrides)
    const a = modules('lib/recreate/access')
    assert.equal(a.recreateVisible('test-hacker@example.org'), false)
    assert.equal(a.RECREATE_MOTION_ENABLED, false)
    const g = modules('lib/recreate/generation')
    assert.equal(g.planRecreate({ ...request, seconds: 15 }, { ...ctx, paying: true }).ok, false)
    const html = render('outfit-morph', true, overrides)
    assert(!/MiniMax|Kling|Seedance|PixVerse/.test(html))
    const other = html.replace(/<button[^>]*data-recreate-generate[^>]*>[\s\S]*?<\/button>/g, '')
    assert(!/✦\s*\d/.test(other))
  }
  contracts()
  const mutants = [
    ['lib/recreate/access.ts', "RECREATE_RELEASE: InternalRelease = 'internal'", "RECREATE_RELEASE: InternalRelease = 'public'"],
    ['lib/recreate/access.ts', 'RECREATE_MOTION_ENABLED = false', 'RECREATE_MOTION_ENABLED = true'],
    ['lib/recreate/generation.ts', 'if (seconds !== f.seconds)', 'if (false)'],
    ['app/recreate/RecreateClient.tsx', '<div className="rc-generate-area">', '<div className="rc-generate-area"><p>✦ {quote?.credits}</p>'],
    ['app/recreate/RecreateClient.tsx', '<span>Recreate</span>', '<span>MiniMax Recreate</span>'],
  ]
  for (const [file, before, after] of mutants) {
    const source = read(file); assert(source.includes(before))
    assert.throws(() => contracts({ [file]: source.replace(before, after) }), `mutant survived: ${before}`)
  }
  for (const entry of ['app/api/recreate/social/route', 'app/api/recreate/status/route', 'app/api/recreate/assets/[name]/route']) {
    const api = loader(routeStubs)(entry)
    assert.equal((await api.GET(new NextRequest('https://www.usekineo.com/api/recreate?name=outfit-morph.mp4'), { params: { name: 'outfit-morph.mp4' } })).status, 404)
  }
  assert(read('app/effects/EffectPageClient.tsx').includes('recreateEnabled ? `/recreate/'))
  console.log('PASS: access on all APIs, spoofed inputs, house source server adapter, photos, consent, duration, simulation, replay, moderation/debit order, refunds, persistence, every photo-effect tariff, rendered names/prices/counts; five security/UI mutants killed.')
}
module.exports = { loader, render, formats, read, ROOT }
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1 })
