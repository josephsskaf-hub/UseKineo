// KINEO-RECREATE-TRAVA-1011 — guardião da trava do Recreate (catálogo só com troca aprovada, interruptores separados, trava
// "não trocou", fonte de 8 s sem preço). Offline: módulos REAIS com dublês de fornecedor (fal), visão (OpenAI) e banco.
// Nenhuma chamada paga, nenhuma credencial. Mutantes no fim provam que o teste morde.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const { NextRequest } = require(require.resolve('next/server', { paths: [ROOT] }))

const U = '11111111-2222-3333-4444-555555555555'
const SUPA = 'https://fixture.supabase.co'
const PHOTO = `${SUPA}/storage/v1/object/public/avatars/${U}/face.jpg`
const PHOTO2 = `${SUPA}/storage/v1/object/public/avatars/${U}/face2.jpg`
const HOUSE = 'josephsskaf@gmail.com'
const CUSTOMER = 'customer@example.org'
const SWAPS = ['outfit-morph', 'elevador', 'passarela', 'dinheiro', 'escolha-o-favorito', 'duelo-de-danca']
const releaseSrc = read('lib/recreate/release.ts')
const formatsSrc = read('lib/recreate/formats.ts')
const release = (page, swap) => ({ 'lib/recreate/release.ts': releaseSrc
  .replace("RECREATE_RELEASE: InternalRelease = 'internal'", `RECREATE_RELEASE: InternalRelease = '${page}'`)
  .replace("RECREATE_SWAP_RELEASE: InternalRelease = 'internal'", `RECREATE_SWAP_RELEASE: InternalRelease = '${swap}'`) })
const approve = (id) => ({ 'lib/recreate/formats.ts': formatsSrc.replace(new RegExp(`(\\{ id: '${id}',[^\\n]*?)swapApproved: false, swapInTest: true`), '$1swapApproved: true, swapInTest: false') })
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }

// ─── A. Catálogo e interruptores ──────────────────────────────────────────────────────────────────────────────────────
function catalogChecks(o = {}) {
  const L = (extra = {}) => loader({}, { ...o, ...extra })
  const m = L()
  const formats = m('lib/recreate/formats'), access = m('lib/recreate/access'), entry = m('lib/recreate/entry')
  ok(access.RECREATE_RELEASE === 'internal' && access.RECREATE_SWAP_RELEASE === 'internal', 'os dois interruptores continuam internal')
  for (const id of SWAPS) {
    const f = formats.recreateFormat(id)
    ok(f && f.type === 'swap' && f.swapApproved === false && f.swapInTest === true, `${id}: troca registrada, NÃO aprovada, em teste`)
    ok(Array.isArray(f.checkFrames) && f.checkFrames.length === 2, `${id}: quadros da trava declarados`)
  }
  ok(formats.recreateFormat('elevador').photoSlots === 2 && formats.recreateFormat('escolha-o-favorito').photoSlots === 2 && formats.recreateFormat('duelo-de-danca').photoSlots === 2, '3 formatos de 2 pessoas')
  ok(formats.recreateFormat('passarela').photoSlots === 1 && formats.recreateFormat('dinheiro').photoSlots === 1, 'passarela e dinheiro: 1 pessoa')
  ok(formats.recreateFormat('dinheiro').seconds === 8 && formats.recreateFormat('escolha-o-favorito').seconds === 8, 'fontes de 8 s registradas com 8 s')
  ok(!formats.recreateSwapPriced(formats.recreateFormat('dinheiro')) && formats.recreateSwapPriced(formats.recreateFormat('passarela')), 'sem preço de 8 s')
  const customerSwaps = access.visibleRecreateFormats(CUSTOMER).filter(f => f.type === 'swap')
  ok(customerSwaps.length === 0, 'cliente não vê nenhuma troca')
  ok(access.visibleRecreateFormats(HOUSE).filter(f => f.type === 'swap').length === SWAPS.length, 'a casa vê as 6 trocas em teste')
  ok(entry.publicRecreatePath('outfit-morph') === null, 'nenhum link público para troca')
  // Página pública + troca interna: o público vê os efeitos e NENHUMA troca; a casa vê tudo.
  const pub = L(release('public', 'internal'))('lib/recreate/access')
  const pubFormats = pub.visibleRecreateFormats(CUSTOMER)
  ok(pubFormats.length > 20 && pubFormats.every(f => f.type === 'effect'), 'página pública com troca interna: só efeitos para o cliente')
  ok(pub.visibleRecreateFormats(HOUSE).filter(f => f.type === 'swap').length === SWAPS.length, 'página pública: a casa continua vendo as trocas em teste')
  ok(L(release('public', 'internal'))('lib/recreate/entry').publicRecreatePath('outfit-morph') === null, 'link público da home nunca aponta troca com troca interna')
  ok(L(release('public', 'internal'))('lib/recreate/entry').publicRecreatePath('effect-kiss') === '/recreate/effect-kiss', 'efeito continua com link público')
  // Troca pública só mostra o aprovado E com preço.
  const both = { ...release('public', 'public'), ...approve('passarela'), ...(o['lib/recreate/formats.ts'] ? { 'lib/recreate/formats.ts': o['lib/recreate/formats.ts'] } : {}) }
  const pubSwap = L(both)('lib/recreate/access')
  ok(pubSwap.visibleRecreateFormats(CUSTOMER).filter(f => f.type === 'swap').map(f => f.id).join() === 'passarela', 'troca pública: só o formato aprovado')
  ok(L(both)('lib/recreate/entry').publicRecreatePath('passarela') === '/recreate/passarela', 'formato aprovado ganha link público')
  const unpriced = L({ ...release('public', 'public'), ...approve('dinheiro') })('lib/recreate/access')
  ok(!unpriced.visibleRecreateFormats(CUSTOMER).some(f => f.id === 'dinheiro'), 'aprovado sem preço (8 s) nunca chega ao cliente')
  ok(L(release('internal', 'off'))('lib/recreate/access').visibleRecreateFormats(HOUSE).every(f => f.type === 'effect'), "troca 'off': nem a casa vê troca")
}
catalogChecks()

// Rotas reais: GET/POST/página/arquivos com o interruptor da página público e o da troca interno.
const noIO = () => { throw new Error('Unexpected paid or database I/O') }
let user = null
const sessionStub = { '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) }, 'server-only': {}, '@/lib/clips/clipServer': {}, '@/lib/engineLaunch': { enginePaused: () => null } }
async function routeChecks(overrides) {
  const server = loader(sessionStub, overrides)('lib/recreate/server')
  const api = loader({ '@/lib/recreate/server': { ...server, recreateSubmitDeps: noIO }, '@/lib/clips/clipServer': { clipsAdmin: noIO, loadClipAccount: noIO, engineAccessFor: noIO }, '@/lib/serverEvents': { writeServerEvent: noIO }, '@/app/api/admin/_shared/mrr': { isPayingPlan: noIO } }, overrides)('app/api/recreate/route')
  const post = body => api.POST(new NextRequest('https://www.usekineo.com/api/recreate', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }))
  const real = { format: 'outfit-morph', seconds: 10, photos: [PHOTO], consent: true, mode: 'swap' }
  user = { id: U, email: CUSTOMER }
  ok((await post(real)).status === 404, 'cliente: POST de troca não aprovada = 404 antes de foto, moderação, débito ou fornecedor')
  ok((await post({ ...real, simulate: true })).status === 404, 'cliente: nem simula troca não aprovada')
  ok((await post({ ...real, format: 'dinheiro' })).status === 404, 'cliente: fonte de 8 s também some')
  user = { id: U, email: HOUSE }
  const eight = await post({ format: 'dinheiro', seconds: 8, photos: [PHOTO], consent: true, mode: 'swap' })
  const eightBody = await eight.json()
  ok(eight.status === 409 && eightBody.code === 'unpriced' && /price/.test(eightBody.error) && /Nothing was charged/.test(eightBody.error), 'casa: fonte de 8 s recusada com mensagem clara, antes de qualquer I/O')
  ok((await post({ format: 'escolha-o-favorito', simulate: true })).status === 409, 'casa: nem a simulação vende 8 s')
  const sim = await post({ format: 'passarela', simulate: true })
  ok(sim.status === 200 && (await sim.json()).credits === 40, 'casa: simula formato em teste (10 s = 40)')
  // GET do catálogo: clipsAdmin/loadClipAccount dublados só aqui (leitura).
  const getApi = loader({ '@/lib/recreate/server': { ...server, recreateEngineAccess: () => ({ ok: true }) }, '@/lib/clips/clipServer': { clipsAdmin: () => ({}), loadClipAccount: async () => ({ balance: 100 }), engineAccessFor: () => () => ({ ok: true }) } }, overrides)('app/api/recreate/route')
  user = { id: U, email: CUSTOMER }
  const customerCatalog = (await (await getApi.GET()).json()).catalog
  ok(customerCatalog.length > 20 && !customerCatalog.some(q => SWAPS.includes(q.id)), 'GET público: nenhuma troca no catálogo')
  user = { id: U, email: HOUSE }
  const houseCatalog = (await (await getApi.GET()).json()).catalog
  ok(SWAPS.every(id => houseCatalog.some(q => q.id === id)), 'GET da casa: as 6 trocas em teste')
  ok(houseCatalog.find(q => q.id === 'dinheiro').credits === null, 'GET da casa: 8 s sem preço (null), nunca inventado')
  // Páginas.
  const nav = { 'next/navigation': { redirect: href => { throw Error('redirect:' + href) }, notFound: () => { throw Error('not-found') } } }
  const pages = loader({ ...nav, '@/lib/recreate/server': server }, overrides)
  const idPage = pages('app/recreate/[id]/page').default
  user = { id: U, email: CUSTOMER }
  await assert.rejects(idPage({ params: { id: 'outfit-morph' } }), /not-found/); passed++
  const listProps = (await pages('app/recreate/page').default()).props
  ok(listProps.formatIds.length > 20 && !listProps.formatIds.some(id => SWAPS.includes(id)), 'página pública: cartões de troca fora')
  ok((await idPage({ params: { id: 'effect-kiss' } })).props.formatIds.every(id => !SWAPS.includes(id)), 'página do efeito: sem troca no catálogo')
  user = null
  await assert.rejects(idPage({ params: { id: 'outfit-morph' } }), /not-found/); passed++ // troca não aprovada nunca convida para cadastro
  await assert.rejects(idPage({ params: { id: 'effect-kiss' } }), /redirect:/); passed++
  user = { id: U, email: HOUSE }
  ok((await idPage({ params: { id: 'passarela' } })).props.formatIds.includes('passarela'), 'casa abre o formato em teste')
  // Arquivos do vídeo-base.
  const assets = loader({ '@/lib/recreate/server': server }, overrides)('app/api/recreate/assets/[name]/route')
  const asset = name => assets.GET(new NextRequest('https://www.usekineo.com/api/recreate/assets/' + name), { params: { name } })
  user = { id: U, email: CUSTOMER }
  ok((await asset('passarela.mp4')).status === 404, 'cliente não baixa vídeo-base de troca em teste')
  user = { id: U, email: HOUSE }
  const got = await asset('duelo-de-danca.jpg')
  ok(got.status === 200 && got.headers.get('content-type') === 'image/jpeg', 'casa recebe o pôster novo')
}
await routeChecks(release('public', 'internal'))

// Arquivos novos, pôsteres, quadros da trava e o rastreio do next.config.
const assetsDir = join(ROOT, 'lib/recreate/assets')
{
  const formats = loader()('lib/recreate/formats')
  let total = 0
  for (const name of readdirSync(assetsDir)) if (statSync(join(assetsDir, name)).isFile()) total += statSync(join(assetsDir, name)).size
  for (const [key, a] of Object.entries(formats.RECREATE_ASSETS)) ok(existsSync(join(assetsDir, a.file)), `arquivo do ${key} existe`)
  for (const f of formats.RECREATE_FORMATS.filter(f => f.type === 'swap')) {
    for (const url of [f.preview, f.poster]) ok(Object.hasOwn(formats.RECREATE_ASSETS, url.split('/').pop()), `${f.id}: ${url} registrado`)
    for (const n of [1, 2]) ok(statSync(join(assetsDir, 'check', `${f.id}-${n}.jpg`)).size > 20_000, `${f.id}: quadro-base ${n} da trava`)
  }
  ok(total < 45 * 1024 * 1024, `assets do Recreate < 45 MB (${(total / 1048576).toFixed(1)} MB)`)
  const config = read('next.config.js')
  for (const file of ['app/api/recreate/status/route.ts', 'app/api/clips/status/route.ts', 'app/api/cron/rapido-ads-clipes/route.ts', 'app/api/cron/refund-sweep/route.ts']) {
    const src = read(file)
    ok(/settleDepsFor|advanceActiveClipJobs|sweepClipJobs/.test(src), `${file} entrega clipes`)
    const route = '/' + file.replace(/^app\//, '').replace(/\/route\.ts$/, '')
    ok(config.includes(`'${route}': ['./lib/recreate/assets/check/*']`), `next.config rastreia os quadros-base em ${route}`)
  }
  ok(read('app/api/events/route.ts').includes("'recreate_swap_check'"), 'recreate_swap_check é evento só do servidor')
  ok(read('lib/clips/clipServer.ts').includes('recreateSwap: recreateSwapDepsFor(admin, userId)'), 'settleDepsFor liga a trava em todo caminho que entrega')
}

// ─── B. Trava "não trocou" ────────────────────────────────────────────────────────────────────────────────────────────
function flowFor(overrides = {}) { return loader({}, overrides)('lib/clips/clipFlow') }
const generation = loader()('lib/recreate/generation')
const swapCheckMod = (overrides = {}) => loader({}, overrides)('lib/recreate/swapCheck')
async function recreateRow(flow, format = 'passarela', photos = [PHOTO]) {
  const plan = generation.planRecreate({ format, seconds: 10, photos, consent: true, mode: 'swap' }, { userId: U, supabaseUrl: SUPA, paying: false })
  assert(plan.ok, JSON.stringify(plan))
  let stored = null
  const deps = { supabaseUrl: SUPA, engineAccess: () => ({ ok: true }), findByKey: async () => stored, countActive: async () => 0, verifyImage: async () => {}, moderate: async () => ({ ok: true }), getBalance: async () => 100, newId: () => U, insertPending: async row => { stored = row; return { ok: true } }, debit: async () => ({ ok: true, balance: 60 }), refund: async () => 40, submit: async () => ({ ok: true, requestId: 'req-1' }), markSubmitted: async () => true, markFailed: async () => true, event: async () => {}, now: () => Date.parse('2026-11-10T12:00:00Z') }
  assert((await flow.submitClip(deps, { userId: U, idempotencyKey: 'trava-' + format, body: plan.plan.body, recreatePlan: plan.plan })).ok)
  return { ...stored, status: 'processing', fal_request_id: 'req-1' }
}
function settleHarness(verdict, opts = {}) {
  const calls = []
  let refunded = 0
  const deps = {
    poll: async () => ({ state: 'done', url: 'https://v3.fal.media/files/result.mp4' }),
    persist: async () => { calls.push('persist'); return 'https://ours.org/renders/clips/result.mp4' },
    refund: async () => { calls.push('refund'); const amount = refunded ? 0 : 40; refunded = 40; return amount },
    markDone: async () => { calls.push('markDone'); return true },
    markFailed: async (_id, reason, back) => { calls.push(`markFailed:${reason}:${back}`); return true },
    event: async (name) => { calls.push(`event:${name}`) },
    now: () => Date.parse('2026-11-10T12:05:00Z'),
    recreateSwap: {
      applies: (row) => row.model === generation.RECREATE_MODEL,
      claim: async () => { calls.push('claim'); return opts.claim ?? true },
      check: async (_row, url) => { calls.push(`check:${url}`); if (verdict === 'throw') throw new Error('vision down'); return { result: verdict, reason: 'fixture' } },
      markDone: async () => { calls.push('swapMarkDone'); return true },
      record: async (_row, v, outcome) => { calls.push(`record:${v.result}:${outcome.delivered}:${outcome.credits_refunded}`) },
    },
  }
  return { deps, calls }
}
{
  const flow = flowFor()
  const row = await recreateRow(flow)
  // unchanged → falha + estorno UMA vez + evento; status repetido não checa nem estorna de novo.
  let h = settleHarness('unchanged')
  const failed = await flow.settleClip(h.deps, row)
  ok(failed.status === 'failed' && failed.failure_reason === 'swap_unchanged' && failed.credits_refunded === 40, 'unchanged: falha com estorno de 40')
  ok(h.calls.filter(c => c === 'refund').length === 1 && h.calls.includes('markFailed:swap_unchanged:40'), 'unchanged: um estorno, pelo caminho de sempre')
  ok(!h.calls.includes('markDone') && !h.calls.includes('swapMarkDone') && !h.calls.includes('event:clip_delivered'), 'unchanged: nunca entrega')
  ok(h.calls.includes('record:unchanged:false:40') && h.calls.includes('event:clip_failed'), 'unchanged: grava recreate_swap_check e clip_failed')
  ok(h.calls.indexOf('persist') < h.calls.indexOf('claim') && h.calls.indexOf('claim') < h.calls.findIndex(c => c.startsWith('check:')), 'ordem: persiste → reserva → checa')
  ok(h.calls.includes('check:https://v3.fal.media/files/result.mp4'), 'checa o MP4 do fornecedor')
  const before = h.calls.length
  const again = await flow.settleClip(h.deps, failed)
  ok(again === failed && h.calls.length === before, 'status repetido depois de decidido: não checa, não estorna, não troca veredito')
  // partial (2 pessoas, 1 trocou) → estorna.
  const pair = await recreateRow(flow, 'duelo-de-danca', [PHOTO, PHOTO2])
  h = settleHarness('partial')
  const partial = await flow.settleClip(h.deps, pair)
  ok(partial.status === 'failed' && partial.failure_reason === 'swap_partial' && h.calls.filter(c => c === 'refund').length === 1, 'partial: falha + estorno (pagou pelas duas)')
  // swapped → entrega sem estorno, pelo markDone que solta a trava.
  h = settleHarness('swapped')
  const done = await flow.settleClip(h.deps, row)
  ok(done.status === 'done' && done.video_url === 'https://ours.org/renders/clips/result.mp4', 'swapped: entrega a URL nossa')
  ok(!h.calls.includes('refund') && h.calls.includes('swapMarkDone') && !h.calls.includes('markDone'), 'swapped: sem estorno; markDone da trava')
  ok(h.calls.includes('record:swapped:true:0') && h.calls.includes('event:clip_delivered'), 'swapped: evento da trava + clip_delivered')
  // unverified e checagem que lança → entrega e grava.
  for (const v of ['unverified', 'throw']) {
    h = settleHarness(v)
    const out = await flow.settleClip(h.deps, row)
    ok(out.status === 'done' && !h.calls.includes('refund') && h.calls.includes('record:unverified:true:0'), `${v}: entrega e grava "não verificado"`)
  }
  // Outro ator está checando → espera, sem checar nem entregar.
  h = settleHarness('unchanged', { claim: false })
  const waiting = await flow.settleClip(h.deps, row)
  ok(waiting === row && !h.calls.some(c => c.startsWith('check:') || c === 'refund' || c.includes('arkDone')), 'checagem reservada por outro ator: espera')
  // Clipe comum com os fios da trava presentes = byte a byte o caminho de antes.
  const common = { ...row, model: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', fingerprint: '["kling"]' }
  const withSwap = settleHarness('unchanged'), without = settleHarness('unchanged')
  delete without.deps.recreateSwap
  const a = await flow.settleClip(withSwap.deps, common), b = await flow.settleClip(without.deps, common)
  ok(JSON.stringify(a) === JSON.stringify(b) && withSwap.calls.join() === without.calls.join() && withSwap.calls.includes('markDone'), 'clipe comum: mesmo resultado e mesmas chamadas, com ou sem a trava')
  ok(!withSwap.calls.some(c => c === 'claim' || c.startsWith('check:') || c.startsWith('record:')), 'clipe comum: a trava nunca age')
}

// runSwapCheck de verdade, com dublês de fal e OpenAI (os quadros-base são os arquivos reais do repo).
function fakeFetch({ fal = 'ok', vision = null, hang = false } = {}) {
  const seen = []
  const impl = async (url, init) => {
    seen.push({ url, body: JSON.parse(init.body) })
    if (hang) return new Promise(() => {})
    if (url.startsWith('https://fal.run/')) {
      if (fal !== 'ok') return new Response('{}', { status: 500 })
      return Response.json({ images: [0, 1, 2].map(i => ({ url: `https://v3.fal.media/frame-${i}.jpg` })) })
    }
    if (vision === 'error') return new Response('{}', { status: 500 })
    return Response.json({ choices: [{ message: { content: JSON.stringify(vision) } }], usage: { prompt_tokens: 6000, completion_tokens: 80 } })
  }
  return { impl, seen }
}
{
  const sc = swapCheckMod()
  const flow = flowFor()
  const single = await recreateRow(flow, 'passarela')
  const pair = await recreateRow(flow, 'elevador', [PHOTO, PHOTO2])
  ok(sc.recreateRowContext(single).format.id === 'passarela' && sc.recreateRowContext(pair).photos.join() === [PHOTO, PHOTO2].join(), 'linha → formato e fotos pela impressão digital do pedido')
  ok(sc.recreateRowContext({ ...single, model: 'other' }) === null && sc.recreateRowContext({ ...single, fingerprint: 'x' }) === null, 'linha estranha: sem contexto')
  const keys = { falKey: 'fal-fixture', apiKey: 'openai-fixture' }
  const person = (same, match) => ({ same_as_base: same, matches_photo: match })
  const run = async (row, vision, extra = {}) => { const f = fakeFetch({ vision, ...extra }); const v = await sc.runSwapCheck(row, 'https://v3.fal.media/files/result.mp4', { ...keys, fetchImpl: f.impl, ...(extra.opts ?? {}) }); return { v, seen: f.seen } }
  let r = await run(single, { persons: [{ person: 1, ...person(true, false) }] })
  ok(r.v.result === 'unchanged' && r.v.format === 'passarela', 'visão: mesma pessoa do vídeo-base → unchanged')
  const falCall = r.seen.find(s => s.url.includes('extract-nth-frame'))
  ok(falCall.body.frame_interval === 84 && falCall.body.max_frames === 3 && falCall.body.video_url === 'https://v3.fal.media/files/result.mp4', 'quadros 84 e 168 do resultado pela fal')
  const msgs = r.seen.find(s => s.url.includes('openai')).body.messages[1].content.filter(c => c.type === 'image_url').map(c => c.image_url.url)
  ok(msgs.length === 5 && msgs[0].startsWith('data:image/jpeg;base64,') && msgs[1].startsWith('data:image/jpeg;base64,') && msgs[2].endsWith('frame-1.jpg') && msgs[3].endsWith('frame-2.jpg') && msgs[4] === PHOTO, 'ordem: base A/B (do repo), resultado A/B, foto')
  ok(r.v.usd > 0 && r.v.usd < 0.05, `custo estimado em centavos (${r.v.usd})`)
  r = await run(single, { persons: [{ person: 1, ...person(false, true) }] }); ok(r.v.result === 'swapped', 'visão: trocou → swapped')
  r = await run(pair, { persons: [{ person: 1, ...person(false, true) }, { person: 2, ...person(true, false) }] }); ok(r.v.result === 'partial' && r.v.reason === '1_of_2_kept', '2 pessoas, 1 trocou → partial')
  r = await run(pair, { persons: [{ person: 1, ...person(true, false) }, { person: 2, ...person(true, null) }] }); ok(r.v.result === 'unchanged', '2 pessoas, nenhuma trocou → unchanged')
  r = await run(pair, { persons: [{ person: 1, ...person(false, true) }] }); ok(r.v.result === 'unverified', 'resposta sem a pessoa 2 → unverified')
  r = await run(single, { persons: [{ person: 1, ...person(true, true) }] }); ok(r.v.result === 'unverified', 'resposta contraditória → unverified (nunca estorno às cegas)')
  r = await run(single, 'error'); ok(r.v.result === 'unverified' && r.v.reason === 'vision_failed', 'visão fora → unverified')
  r = await run(single, { persons: [] }, { fal: 'down' }); ok(r.v.result === 'unverified' && r.v.reason === 'result_frames_unavailable', 'fal fora → unverified')
  r = await run(single, {}, { opts: { readFileImpl: async () => { throw new Error('missing') } } }); ok(r.v.result === 'unverified' && r.v.reason === 'base_frames_unavailable', 'quadro-base ausente → unverified')
  r = await run(single, {}, { hang: true, opts: { budgetMs: 50 } }); ok(r.v.result === 'unverified' && r.v.reason === 'check_timeout', 'estourou o tempo → unverified')
  const noKey = await sc.runSwapCheck(single, 'https://v3.fal.media/files/result.mp4', { falKey: '', apiKey: '', fetchImpl: fakeFetch().impl })
  ok(noKey.result === 'unverified', 'sem chave → unverified')
}

// Rota de status: o motivo que a tela precisa.
{
  const failedRow = { id: 'c1', status: 'failed', video_url: null, credits_refunded: 40, failure_reason: 'swap_unchanged' }
  const status = loader({ '@/lib/recreate/server': { recreateSession: async () => ({ user: { id: U, email: HOUSE } }), RECREATE_HEADERS: {} }, '@/lib/clips/clipServer': { clipsAdmin: () => ({}), loadClip: async () => failedRow, settleDepsFor: () => ({}) }, '@/lib/clips/clipFlow': { settleClip: async r => r } })('app/api/recreate/status/route')
  const body = await (await status.GET(new NextRequest('https://www.usekineo.com/api/recreate/status?id=c1'))).json()
  ok(body.clip.reason === 'not_swapped' && body.clip.credits_refunded === 40 && !('failure_reason' in body.clip), 'status: reason not_swapped, sem vazar o código interno')
  const client = read('app/recreate/RecreateClient.tsx')
  ok(client.includes("We couldn't put you in this video. Nothing was charged. Try a clearer, front-facing photo or another video.") && client.includes("clip.reason === 'not_swapped'"), 'tela: a frase em inglês para não trocou')
}

// ─── Mutantes ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const mutants = [
  ['lib/recreate/access.ts', "if (f.swapApproved === true && recreateSwapPriced(f) && releaseVisible(email, RECREATE_SWAP_RELEASE)) return true", 'if (releaseVisible(email, RECREATE_SWAP_RELEASE)) return true', (o) => catalogChecks(o)],
  ['lib/recreate/access.ts', "return f.swapInTest === true && RECREATE_SWAP_RELEASE !== 'off' && releaseVisible(email, 'internal')", "return f.swapInTest === true && RECREATE_SWAP_RELEASE !== 'off'", (o) => catalogChecks(o)],
  ['lib/recreate/entry.ts', "(f.type !== 'swap' || (RECREATE_SWAP_RELEASE === 'public' && f.swapApproved === true && recreateSwapPriced(f)))", 'true', (o) => catalogChecks(o)],
  ['lib/recreate/formats.ts', "seconds: 8, type: 'swap'", "seconds: 10, type: 'swap'", (o) => catalogChecks(o)],
  ['app/api/recreate/route.ts', "if (!recreateFormatVisible(format, user.email)) return json({ error: 'Not found.' }, 404)", '', (o) => routeChecks({ ...release('public', 'internal'), ...o })],
  ['app/api/recreate/route.ts', "if (!recreateSwapPriced(format)) return json({ error: RECREATE_UNPRICED_ERROR, code: 'unpriced' }, 409)", '', (o) => routeChecks({ ...release('public', 'internal'), ...o })],
]
for (const [file, before, after, check] of mutants) {
  const src = read(file); assert(src.includes(before), `mutante sem alvo: ${before}`)
  await assert.rejects(async () => { await check({ [file]: src.replace(before, after) }); throw new Error('noop') }, e => e.message !== 'noop', `mutante sobreviveu: ${file}: ${before}`)
  passed++
}
// Mutantes do fluxo e da decisão.
async function settleOutcome(flowOverride, swapOverride, verdict, format = 'passarela', photos = [PHOTO]) {
  const flow = flowFor(flowOverride)
  const row = await recreateRow(flow, format, photos)
  const h = settleHarness(verdict)
  const out = await flow.settleClip(h.deps, row)
  const sc = swapCheckMod(swapOverride)
  return { out, calls: h.calls, decide: sc.decideSwap }
}
const flowSrc = read('lib/clips/clipFlow.ts'), scSrc = read('lib/recreate/swapCheck.ts')
const flowMutants = [
  ["const swap = deps.recreateSwap?.applies(row) ? deps.recreateSwap : null", 'const swap = null as typeof deps.recreateSwap | null'],
  ["if (!(await swap.claim(row))) return row", "await swap.claim(row)"],
  ["if (swapVerdict.result === 'unchanged' || swapVerdict.result === 'partial')", "if (swapVerdict.result === 'unchanged')"],
]
for (const [before, after] of flowMutants) {
  assert(flowSrc.includes(before), 'mutante sem alvo: ' + before)
  const o = { 'lib/clips/clipFlow.ts': flowSrc.replace(before, after) }
  const u = await settleOutcome(o, {}, 'unchanged'), p = await settleOutcome(o, {}, 'partial', 'duelo-de-danca', [PHOTO, PHOTO2])
  const flow = flowFor(o), row = await recreateRow(flow), h = settleHarness('unchanged', { claim: false }); const w = await flow.settleClip(h.deps, row)
  ok(u.out.status !== 'failed' || p.out.status !== 'failed' || w.status !== 'processing', 'mutante do fluxo morto: ' + before)
}
{
  const before = 'if (kept > 0) return { result: \'partial\''
  assert(scSrc.includes(before))
  const sc = swapCheckMod({ 'lib/recreate/swapCheck.ts': scSrc.replace(before, 'if (false) return { result: \'partial\'') })
  ok(sc.decideSwap({ persons: [{ person: 1, same_as_base: false, matches_photo: true }, { person: 2, same_as_base: true, matches_photo: false }] }, 2).result !== 'partial', 'mutante da decisão (parcial vira outra coisa) morto')
  const sc2 = swapCheckMod({ 'lib/recreate/swapCheck.ts': scSrc.replace('p.same_as_base === true && p.matches_photo !== true', 'p.same_as_base === true') })
  ok(sc2.decideSwap({ persons: [{ person: 1, same_as_base: true, matches_photo: true }] }, 1).result === 'unchanged', 'mutante da contradição: sem a regra, contraditório viraria estorno (o teste acima o pega)')
}
console.log(`PASS test-recreate-trava-1011: ${passed} verificações — catálogo só com troca aprovada (página/troca separadas, casa vê "em teste"), POST recusa antes de I/O, 8 s sem preço recusa, trava unchanged/partial estorna 1×, swapped/unverified entregam, status repetido não reestorna, clipe comum byte a byte; mutantes mortos.`)
