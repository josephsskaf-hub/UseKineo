// KINEO-RECREATE-TRAVA-1011 — guardião da trava do Recreate (catálogo só com troca aprovada, interruptores separados, trava
// "não trocou", 8 s = 45 ["Cobra 45", fundador 10/11], duração sem tarifa recusada). Offline: módulos REAIS com dublês de fornecedor (fal), visão (OpenAI) e banco.
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
const SWAPS = ['outfit-morph', 'elevador', 'passarela', 'escolha-o-favorito', 'duelo-de-danca']
const releaseSrc = read('lib/recreate/release.ts')
const formatsSrc = read('lib/recreate/formats.ts')
const release = (page, swap) => ({ 'lib/recreate/release.ts': releaseSrc
  .replace("RECREATE_RELEASE: InternalRelease = 'internal'", `RECREATE_RELEASE: InternalRelease = '${page}'`)
  .replace("RECREATE_SWAP_RELEASE: InternalRelease = 'internal'", `RECREATE_SWAP_RELEASE: InternalRelease = '${swap}'`) })
// Rede de segurança: uma fonte de duração SEM tarifa (9 s, só no teste) nunca é vendida.
const nineSeconds = (src = formatsSrc) => src.replace("poster: '/api/recreate/assets/duelo-de-danca.jpg', seconds: 10", "poster: '/api/recreate/assets/duelo-de-danca.jpg', seconds: 9")
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
  ok(formats.recreateFormat('passarela').photoSlots === 1 && formats.recreateFormat('outfit-morph').photoSlots === 1, 'passarela e outfit-morph: 1 pessoa')
  ok(formats.recreateFormat('dinheiro') === null && !Object.keys(formats.RECREATE_ASSETS).some(k => k.startsWith('dinheiro')), 'Money fan (dinheiro) saiu (fundador 10/11)')
  ok(formats.recreateFormat('escolha-o-favorito').seconds === 8, 'fonte de 8 s registrada com 8 s')
  ok(formats.recreateSwapPriced(formats.recreateFormat('escolha-o-favorito')) && formats.recreateSwapPriced(formats.recreateFormat('passarela')), '8 s e 10 s têm tarifa')
  ok(m('lib/checkoutPricing').recreateCreditCost(8) === 45 && m('lib/checkoutPricing').recreateCreditCost(10) === 40 && m('lib/checkoutPricing').recreateCreditCost(9) === null, 'tarifa única: 8 → 45 ("Cobra 45"), 10 → 40, sem 9')
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
  const approvedEight = L({ ...release('public', 'public'), ...approve('escolha-o-favorito') })('lib/recreate/access')
  ok(approvedEight.visibleRecreateFormats(CUSTOMER).some(f => f.id === 'escolha-o-favorito'), 'aprovado de 8 s (com tarifa) chega ao cliente')
  const approvedNine = { ...release('public', 'public'), 'lib/recreate/formats.ts': nineSeconds(approve('duelo-de-danca')['lib/recreate/formats.ts']) }
  ok(!L(approvedNine)('lib/recreate/access').visibleRecreateFormats(CUSTOMER).some(f => f.id === 'duelo-de-danca'), 'aprovado SEM tarifa (9 s) nunca chega ao cliente')
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
  ok((await post({ ...real, format: 'escolha-o-favorito' })).status === 404, 'cliente: fonte de 8 s também some')
  user = { id: U, email: HOUSE }
  const nineApi = loader({ '@/lib/recreate/server': { ...server, recreateSubmitDeps: noIO }, '@/lib/clips/clipServer': { clipsAdmin: noIO, loadClipAccount: noIO, engineAccessFor: noIO }, '@/lib/serverEvents': { writeServerEvent: noIO }, '@/app/api/admin/_shared/mrr': { isPayingPlan: noIO } }, { ...overrides, 'lib/recreate/formats.ts': nineSeconds(overrides['lib/recreate/formats.ts'] ?? formatsSrc) })('app/api/recreate/route')
  const eight = await nineApi.POST(new NextRequest('https://www.usekineo.com/api/recreate', { method: 'POST', body: JSON.stringify({ format: 'duelo-de-danca', seconds: 9, photos: [PHOTO, PHOTO2], consent: true, mode: 'swap' }), headers: { 'content-type': 'application/json' } }))
  const eightBody = await eight.json()
  ok(eight.status === 409 && eightBody.code === 'unpriced' && /price/.test(eightBody.error) && /Nothing was charged/.test(eightBody.error), 'casa: fonte sem tarifa (9 s) recusada com mensagem clara, antes de qualquer I/O')
  const sim8 = await post({ format: 'escolha-o-favorito', simulate: true })
  ok(sim8.status === 200 && (await sim8.json()).credits === 45, 'casa: simula o 8 s a 45')
  ok((await post({ format: 'dinheiro', simulate: true })).status === 400, 'Money fan não existe mais no catálogo')
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
  ok(houseCatalog.find(q => q.id === 'escolha-o-favorito').credits === 45 && houseCatalog.find(q => q.id === 'passarela').credits === 40, 'GET da casa: 8 s = 45, 10 s = 40')
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
  const seconds = loader()('lib/recreate/formats').recreateFormat(format).seconds
  const plan = generation.planRecreate({ format, seconds, photos, consent: true, mode: 'swap' }, { userId: U, supabaseUrl: SUPA, paying: false })
  assert(plan.ok, JSON.stringify(plan))
  let stored = null
  const deps = { supabaseUrl: SUPA, engineAccess: () => ({ ok: true }), findByKey: async () => stored, countActive: async () => 0, verifyImage: async () => {}, moderate: async () => ({ ok: true }), getBalance: async () => 100, newId: () => U, insertPending: async row => { stored = row; return { ok: true } }, debit: async () => ({ ok: true, balance: 60 }), refund: async () => 40, submit: async () => ({ ok: true, requestId: 'req-1' }), markSubmitted: async () => true, markFailed: async () => true, event: async () => {}, now: () => Date.parse('2026-11-10T12:00:00Z') }
  assert((await flow.submitClip(deps, { userId: U, idempotencyKey: 'trava-' + format, body: plan.plan.body, recreatePlan: plan.plan })).ok)
  return { ...stored, status: 'processing', fal_request_id: 'req-1' }
}
const NOW = Date.parse('2026-11-10T12:05:00Z')
function settleHarness(verdict, opts = {}) {
  const calls = []
  let refunded = 0
  const sc = swapCheckMod()
  const deps = {
    poll: async () => { calls.push('poll'); return { state: 'done', url: 'https://v3.fal.media/files/result.mp4' } },
    persist: async () => { calls.push('persist'); return 'https://ours.org/renders/clips/result.mp4' },
    refund: async () => { calls.push('refund'); const amount = refunded ? 0 : 40; refunded = 40; return amount },
    markDone: async () => { calls.push('markDone'); return true },
    markFailed: async (_id, reason, back) => { calls.push(`markFailed:${reason}:${back}`); return true },
    event: async (name, meta) => { calls.push(`event:${name}${meta?.swap_check ? ':' + meta.swap_check : ''}`) },
    now: () => NOW,
    recreateSwap: {
      applies: (row) => row.model === generation.RECREATE_MODEL,
      busy: (row, now) => sc.swapCheckBusy(row.failure_reason, now),
      claim: async () => { calls.push('claim'); return opts.claim === false ? null : 'swapcheck_lock_a' },
      check: async (_row, url) => { calls.push(`check:${url}`); if (verdict === 'throw') throw new Error('vision down'); return { result: verdict, reason: 'fixture' } },
      markFailed: async (_id, reason, lock) => { calls.push(`swapMarkFailed:${reason}:${lock}`); return opts.lost !== true },
      setRefunded: async (_id, amount) => { calls.push(`setRefunded:${amount}`) },
      markDone: async (_id, _url, lock) => { calls.push(`swapMarkDone:${lock}`); return opts.lost !== true },
      record: async (_row, v, outcome) => { calls.push(`record:${v.result}:${outcome.delivered}:${outcome.credits_refunded}`) },
    },
  }
  return { deps, calls }
}
{
  const flow = flowFor()
  const row = await recreateRow(flow)
  // unchanged → failed condicional PRIMEIRO, depois o estorno (só o vencedor), uma vez; status repetido não refaz nada.
  let h = settleHarness('unchanged')
  const failed = await flow.settleClip(h.deps, row)
  ok(failed.status === 'failed' && failed.failure_reason === 'swap_unchanged' && failed.credits_refunded === 40 && failed.video_url === null, 'unchanged: falha com estorno de 40, sem vídeo')
  ok(h.calls.indexOf('swapMarkFailed:swap_unchanged:swapcheck_lock_a') >= 0 && h.calls.indexOf('swapMarkFailed:swap_unchanged:swapcheck_lock_a') < h.calls.indexOf('refund'), 'unchanged: marca failed (com a reserva) ANTES de estornar')
  ok(h.calls.filter(c => c === 'refund').length === 1 && h.calls.includes('setRefunded:40'), 'unchanged: um estorno, valor gravado na linha')
  ok(!h.calls.includes('persist') && !h.calls.some(c => c.includes('arkDone')) && !h.calls.includes('event:clip_delivered'), 'unchanged: nunca copia nem entrega')
  ok(h.calls.includes('record:unchanged:false:40') && h.calls.includes('event:clip_failed:unchanged'), 'unchanged: grava recreate_swap_check e clip_failed')
  ok(h.calls.indexOf('claim') < h.calls.findIndex(c => c.startsWith('check:')), 'ordem: reserva → checa')
  ok(h.calls.includes('check:https://v3.fal.media/files/result.mp4'), 'checa o MP4 do fornecedor')
  const before = h.calls.length
  const again = await flow.settleClip(h.deps, failed)
  ok(again === failed && h.calls.length === before, 'status repetido depois de decidido: não checa, não estorna, não troca veredito')
  // Perdeu a corrida (a reserva não é mais dele): nem estorna nem entrega.
  for (const v of ['unchanged', 'swapped']) {
    h = settleHarness(v, { lost: true })
    const lost = await flow.settleClip(h.deps, row)
    ok(lost.status === 'processing' && !h.calls.includes('refund') && !h.calls.some(c => c.startsWith('record:') || c === 'event:clip_delivered' || c.startsWith('event:clip_failed')), `${v}: quem perdeu a reserva não estorna nem entrega`)
  }
  // partial (2 pessoas, 1 trocou) → estorna.
  const pair = await recreateRow(flow, 'duelo-de-danca', [PHOTO, PHOTO2])
  h = settleHarness('partial')
  const partial = await flow.settleClip(h.deps, pair)
  ok(partial.status === 'failed' && partial.failure_reason === 'swap_partial' && h.calls.filter(c => c === 'refund').length === 1, 'partial: falha + estorno (pagou pelas duas)')
  // swapped → copia DEPOIS de decidir e entrega sem estorno, pelo markDone da reserva.
  h = settleHarness('swapped')
  const done = await flow.settleClip(h.deps, row)
  ok(done.status === 'done' && done.video_url === 'https://ours.org/renders/clips/result.mp4', 'swapped: entrega a URL nossa')
  ok(h.calls.findIndex(c => c.startsWith('check:')) < h.calls.indexOf('persist') && h.calls.indexOf('persist') < h.calls.indexOf('swapMarkDone:swapcheck_lock_a'), 'swapped: checa → copia → marca pronto (com a reserva)')
  ok(!h.calls.includes('refund') && !h.calls.includes('markDone'), 'swapped: sem estorno; markDone da reserva')
  ok(h.calls.includes('record:swapped:true:0') && h.calls.includes('event:clip_delivered'), 'swapped: evento da trava + clip_delivered')
  // unverified e checagem que lança → entrega e grava.
  for (const v of ['unverified', 'throw']) {
    h = settleHarness(v)
    const out = await flow.settleClip(h.deps, row)
    ok(out.status === 'done' && !h.calls.includes('refund') && h.calls.includes('record:unverified:true:0'), `${v}: entrega e grava "não verificado"`)
  }
  // Outro ator reservou no UPDATE → espera.
  h = settleHarness('unchanged', { claim: false })
  const waiting = await flow.settleClip(h.deps, row)
  ok(waiting === row && !h.calls.some(c => c.startsWith('check:') || c === 'refund' || c === 'persist' || c.includes('arkDone')), 'checagem reservada por outro ator: espera sem copiar')
  // Reserva válida já na linha → sai ANTES de consultar o fornecedor e de copiar; reserva vencida (2 min+) → retoma.
  h = settleHarness('swapped')
  const held = { ...row, failure_reason: swapCheckMod().swapCheckLock(NOW - 30_000, 'other') }
  ok(await flow.settleClip(h.deps, held) === held && h.calls.length === 0, 'reserva válida de outro ator: sai cedo, sem poll nem cópia')
  h = settleHarness('swapped')
  const stale = await flow.settleClip(h.deps, { ...row, failure_reason: swapCheckMod().swapCheckLock(NOW - 180_000, 'other') })
  ok(stale.status === 'done' && h.calls.includes('claim'), 'reserva vencida: outro ator retoma')
  // Clipe comum com os fios da trava presentes = byte a byte o caminho de antes.
  const common = { ...row, model: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', fingerprint: '["kling"]', failure_reason: 'swapcheck_9999999999999' }
  const withSwap = settleHarness('unchanged'), without = settleHarness('unchanged')
  delete without.deps.recreateSwap
  const a = await flow.settleClip(withSwap.deps, common), b = await flow.settleClip(without.deps, common)
  ok(JSON.stringify(a) === JSON.stringify(b) && withSwap.calls.join() === without.calls.join() && withSwap.calls.includes('markDone'), 'clipe comum: mesmo resultado e mesmas chamadas, com ou sem a trava')
  ok(!withSwap.calls.some(c => c === 'claim' || c.startsWith('check:') || c.startsWith('record:')), 'clipe comum: a trava nunca age')
}

// runSwapCheck de verdade, com dublês de fal e OpenAI (os quadros-base são os arquivos reais do repo).
const ALL = (v) => Object.fromEntries(swapCheckMod().SWAP_FACE_ATTRIBUTES.map(a => [a, v]))
function fakeFetch({ fal = 'ok', vision = null, message = null, hang = false } = {}) {
  const seen = []
  const impl = async (url, init) => {
    seen.push({ url, body: JSON.parse(init.body) })
    if (hang) return new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))))
    if (url.startsWith('https://fal.run/')) {
      if (fal !== 'ok') return new Response('{}', { status: 500 })
      return Response.json({ images: [0, 1, 2].map(i => ({ url: `https://v3.fal.media/frame-${i}.jpg` })) })
    }
    if (vision === 'error') return new Response('{}', { status: 500 })
    return Response.json({ choices: [{ message: message ?? { content: JSON.stringify(vision) } }], usage: { prompt_tokens: 6000, completion_tokens: 120 } })
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
  ok(!/^import [^\n]*from 'node:/m.test(read('lib/recreate/swapCheck.ts')) && read('lib/recreate/swapCheck.ts').includes("await import('node:fs/promises')"), 'swapCheck não importa nada de Node no topo (fs só dinâmico)')
  const keys = { falKey: 'fal-fixture', apiKey: 'openai-fixture' }
  const kept = { base_vs_result: ALL('same'), same_person: 'yes', result_vs_photo: 'no' }
  const swappedP = { base_vs_result: { ...ALL('unclear'), hair_color: 'different', face_shape: 'different' }, same_person: 'no', result_vs_photo: 'yes' }
  const run = async (row, vision, extra = {}) => { const f = fakeFetch({ vision, ...extra }); const v = await sc.runSwapCheck(row, 'https://v3.fal.media/files/result.mp4', { ...keys, fetchImpl: f.impl, ...(extra.opts ?? {}) }); return { v, seen: f.seen } }
  let r = await run(single, { persons: [{ person: 1, ...kept }] })
  ok(r.v.result === 'unchanged' && r.v.format === 'passarela' && r.v.unverified_reason === null, 'visão: atributos iguais ao vídeo-base → unchanged')
  const falCall = r.seen.find(s => s.url.includes('extract-nth-frame'))
  ok(falCall.body.frame_interval === 84 && falCall.body.max_frames === 3 && falCall.body.video_url === 'https://v3.fal.media/files/result.mp4', 'quadros 84 e 168 do resultado pela fal')
  const visionBody = r.seen.find(s => s.url.includes('openai')).body
  const msgs = visionBody.messages[1].content.filter(c => c.type === 'image_url').map(c => c.image_url.url)
  ok(msgs.length === 5 && msgs[0].startsWith('data:image/jpeg;base64,') && msgs[1].startsWith('data:image/jpeg;base64,') && msgs[2].endsWith('frame-1.jpg') && msgs[3].endsWith('frame-2.jpg') && msgs[4] === PHOTO, 'ordem: base A/B (do repo), resultado A/B, foto')
  const system = visionBody.messages[0].content
  ok(/clothing[^.]*IDENTICAL[^.]*BY CONSTRUCTION/.test(system) && /NOT evidence/.test(system) && /Do not identify anyone/.test(system) && /hair colour/.test(system), 'prompt: compara atributos visíveis, roupa/cenário não contam, sem identificar ninguém')
  ok(r.v.usd > 0 && r.v.usd < 0.05, `custo estimado em centavos (${r.v.usd})`)
  r = await run(single, { persons: [{ person: 1, ...swappedP }] }); ok(r.v.result === 'swapped', 'visão: atributos diferentes → swapped')
  r = await run(pair, { persons: [{ person: 1, ...swappedP }, { person: 2, ...kept }] }); ok(r.v.result === 'partial' && r.v.reason === '1_of_2_kept', '2 pessoas, 1 trocou → partial')
  r = await run(pair, { persons: [{ person: 1, ...kept }, { person: 2, ...kept, result_vs_photo: 'uncertain' }] }); ok(r.v.result === 'unchanged', '2 pessoas, nenhuma trocou → unchanged')
  // Dublê: "mesma pessoa" sustentado só por roupa/cenário (nenhum atributo do rosto igual) nunca vira estorno.
  r = await run(single, { persons: [{ person: 1, base_vs_result: ALL('unclear'), same_person: 'yes', result_vs_photo: 'no', note: 'same outfit and same room' }] })
  ok(r.v.result === 'unverified' && r.v.unverified_reason === 'null_answer', 'roupa/cenário iguais não provam "mesma pessoa" → unverified')
  r = await run(single, { persons: [{ person: 1, base_vs_result: { ...ALL('same'), hair_color: 'different' }, same_person: 'yes', result_vs_photo: 'no' }] })
  ok(r.v.result === 'unverified', '"mesma pessoa" com atributo diferente = contradição → unverified')
  r = await run(pair, { persons: [{ person: 1, ...swappedP }] }); ok(r.v.result === 'unverified' && r.v.unverified_reason === 'null_answer', 'resposta sem a pessoa 2 → unverified (null_answer)')
  r = await run(single, { persons: [{ person: 1, ...kept, result_vs_photo: 'yes' }] }); ok(r.v.result === 'unverified', 'igual à base E igual à foto (contraditório) → unverified')
  r = await run(single, null, { message: { content: null, refusal: "I'm sorry, I can't help with that." } }); ok(r.v.result === 'unverified' && r.v.unverified_reason === 'refusal', 'recusa do modelo → refusal')
  r = await run(single, null, { message: { content: "I'm sorry, but I can't compare these people." } }); ok(r.v.unverified_reason === 'refusal', 'recusa em texto → refusal')
  r = await run(single, null, { message: { content: '{"persons": [' } }); ok(r.v.unverified_reason === 'invalid_json', 'JSON quebrado → invalid_json')
  r = await run(single, null, { message: { content: '' } }); ok(r.v.unverified_reason === 'null_answer', 'resposta vazia → null_answer')
  r = await run(single, 'error'); ok(r.v.result === 'unverified' && r.v.unverified_reason === 'http_error', 'visão fora → http_error')
  r = await run(single, {}, { fal: 'down' }); ok(r.v.result === 'unverified' && r.v.unverified_reason === 'frames_unavailable', 'fal fora → frames_unavailable')
  r = await run(single, {}, { opts: { readFileImpl: async () => { throw new Error('missing') } } }); ok(r.v.unverified_reason === 'base_frames_unavailable', 'quadro-base ausente → base_frames_unavailable')
  r = await run(single, {}, { hang: true, opts: { budgetMs: 50 } }); ok(r.v.result === 'unverified' && r.v.unverified_reason === 'timeout', 'estourou o tempo → timeout')
  const noKey = await sc.runSwapCheck(single, 'https://v3.fal.media/files/result.mp4', { falKey: '', apiKey: '', fetchImpl: fakeFetch().impl })
  ok(noKey.result === 'unverified' && noKey.unverified_reason === 'config', 'sem chave → config')
  ok(sc.swapCheckBusy(sc.swapCheckLock(NOW - 1000, 'x'), NOW) && !sc.swapCheckBusy(sc.swapCheckLock(NOW - 121_000), NOW) && !sc.swapCheckBusy('provider_failed', NOW) && !sc.swapCheckBusy(null, NOW), 'reserva: válida por 2 min, depois vence')
  ok(sc.swapCheckLock(NOW, 'abc').length <= 60 && sc.swapCheckLock(NOW - 1) < sc.swapCheckLock(NOW, 'abc'), 'reserva cabe em failure_reason e ordena pelo tempo')
}
// Fios reais do servidor (fonte): condicionais à reserva, cron com Recreate por último.
{
  const src = read('lib/clips/clipServer.ts')
  const fn = src.slice(src.indexOf('export function recreateSwapDepsFor'), src.indexOf('export function submitDepsFor'))
  ok((fn.match(/\.eq\('failure_reason', lock\)/g) ?? []).length === 2, 'markFailed e markDone da trava só para quem detém a reserva')
  ok(/credits_refunded: 0/.test(fn) && /\.eq\('credits_refunded', 0\)/.test(fn), 'failed nasce com 0 e o estorno do vencedor é gravado depois')
  ok(/unverified_reason:/.test(fn), 'evento grava o motivo normalizado')
  ok(src.includes("...rows.filter((r) => r.model === RECREATE_MODEL).slice(0, 1)]"), 'cron: Recreate por último, 1 por passada')
  ok(read('lib/admin/pessoaTela.ts').includes("c.failure_reason.startsWith('swapcheck_') ? 'em verificação"), 'painel: reserva aparece como "em verificação"')
}

// 8 s = 45 ponta a ponta no fluxo real (submitClip/settleClip), 10 s continua 40, 15 s só pago e sem fonte.
{
  const flow = flowFor()
  const ctx8 = { userId: U, supabaseUrl: SUPA, paying: false }
  const plan8 = generation.planRecreate({ format: 'escolha-o-favorito', seconds: 8, photos: [PHOTO, PHOTO2], consent: true, mode: 'swap' }, ctx8)
  ok(plan8.ok && plan8.plan.credits === 45 && Math.abs(plan8.plan.falUsd - 2.4) < 1e-9 && plan8.plan.body.seconds === 8, '8 s: 45 créditos, fal US$ 2,40')
  ok(generation.planRecreate({ format: 'escolha-o-favorito', seconds: 10, photos: [PHOTO, PHOTO2], consent: true, mode: 'swap' }, ctx8).status === 409, '8 s nunca vendido como 10 s (o Recast herda a duração)')
  ok(generation.planRecreate({ format: 'passarela', seconds: 10, photos: [PHOTO], consent: true, mode: 'swap' }, ctx8).plan.credits === 40, '10 s continua 40')
  ok(generation.planRecreate({ format: 'passarela', seconds: 15, photos: [PHOTO], consent: true, mode: 'swap' }, ctx8).status === 402 && generation.planRecreate({ format: 'passarela', seconds: 15, photos: [PHOTO], consent: true, mode: 'swap' }, { ...ctx8, paying: true }).status === 409, '15 s: só plano pago e sem fonte ativa')
  const debits = [], refunds = []
  let stored = null
  const deps = { supabaseUrl: SUPA, engineAccess: () => ({ ok: true }), findByKey: async () => stored, countActive: async () => 0, verifyImage: async () => {}, moderate: async () => ({ ok: true }), getBalance: async () => 100, newId: () => U, insertPending: async row => { stored = row; return { ok: true } }, debit: async (ref, cost) => { debits.push(cost); return { ok: true, balance: 100 - cost } }, refund: async () => { refunds.push(45); return 45 }, submit: async () => ({ ok: true, requestId: 'req-8' }), markSubmitted: async () => true, markFailed: async () => true, event: async () => {}, now: () => NOW }
  const args = { userId: U, idempotencyKey: 'trava-oito-01', body: plan8.plan.body, recreatePlan: plan8.plan }
  const first = await flow.submitClip(deps, args), replay = await flow.submitClip(deps, args)
  ok(first.ok && first.clip.credits === 45 && replay.ok && replay.replay && debits.join() === '45', '8 s: debita 45 uma vez; replay não cobra de novo')
  const h = settleHarness('unchanged')
  h.deps.refund = async () => { h.calls.push('refund'); return 45 }
  const out = await flow.settleClip(h.deps, { ...stored, status: 'processing', fal_request_id: 'req-8' })
  ok(out.status === 'failed' && out.credits_refunded === 45 && h.calls.includes('setRefunded:45'), '8 s reprovado pela trava: estorna 45')
  const failing = settleHarness('swapped')
  failing.deps.poll = async () => ({ state: 'failed', error: 'fixture' })
  failing.deps.refund = async () => 45
  ok((await flow.settleClip(failing.deps, { ...stored, status: 'processing', fal_request_id: 'req-8' })).credits_refunded === 45, '8 s com falha do fornecedor: estorna 45')
  const { render } = require('../docs/recreate-0911/test-recreate.cjs')
  const html = render('escolha-o-favorito', true, {}, 100)
  const outside = html.replace(/<button[^>]*data-recreate-generate[^>]*>[\s\S]*?<\/button>/g, '')
  ok(/data-recreate-generate[^>]*>[\s\S]*?✦ 45/.test(html) && !/✦\s*\d|45 credits/.test(outside), 'preço do 8 s só no Generate (✦ 45)')
}

// Rota de status: o motivo que a tela precisa.
{
  const failedRow = { id: 'c1', status: 'failed', video_url: 'https://ours.org/renders/clips/u/c1.mp4', credits_refunded: 40, failure_reason: 'swap_unchanged' }
  const status = loader({ '@/lib/recreate/server': { recreateSession: async () => ({ user: { id: U, email: HOUSE } }), RECREATE_HEADERS: {} }, '@/lib/clips/clipServer': { clipsAdmin: () => ({}), loadClip: async () => failedRow, settleDepsFor: () => ({}) }, '@/lib/clips/clipFlow': { settleClip: async r => r } })('app/api/recreate/status/route')
  const body = await (await status.GET(new NextRequest('https://www.usekineo.com/api/recreate/status?id=c1'))).json()
  ok(body.clip.reason === 'not_swapped' && body.clip.video_url === null && body.clip.credits_refunded === 40 && !('failure_reason' in body.clip), 'status: reason not_swapped, sem vazar o código interno')
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
// Mutantes do fluxo e da decisão: cada um tem de quebrar ao menos um cenário de dinheiro.
async function flowScenariosHold(o) {
  const flow = flowFor(o)
  const row = await recreateRow(flow), pair = await recreateRow(flow, 'duelo-de-danca', [PHOTO, PHOTO2])
  let h = settleHarness('unchanged'); const u = await flow.settleClip(h.deps, row)
  const uOk = u.status === 'failed' && h.calls.filter(c => c === 'refund').length === 1 && h.calls.findIndex(c => c.startsWith('swapMarkFailed')) < h.calls.indexOf('refund')
  h = settleHarness('partial'); const p = await flow.settleClip(h.deps, pair)
  const pOk = p.status === 'failed'
  h = settleHarness('unchanged', { claim: false }); const w = await flow.settleClip(h.deps, row)
  const wOk = w.status === 'processing' && !h.calls.some(c => c.startsWith('check:'))
  h = settleHarness('unchanged', { lost: true }); const l = await flow.settleClip(h.deps, row)
  const lOk = l.status === 'processing' && !h.calls.includes('refund')
  h = settleHarness('swapped'); const held = { ...row, failure_reason: swapCheckMod().swapCheckLock(NOW - 1000, 'x') }; await flow.settleClip(h.deps, held)
  const bOk = h.calls.length === 0
  return uOk && pOk && wOk && lOk && bOk
}
ok(await flowScenariosHold({}), 'cenários de dinheiro valem no fluxo real')
const flowSrc = read('lib/clips/clipFlow.ts'), scSrc = read('lib/recreate/swapCheck.ts')
const flowMutants = [
  ["const swap = deps.recreateSwap?.applies(row) ? deps.recreateSwap : null", 'const swap = null as typeof deps.recreateSwap | null'],
  ["if (!swapLock) return row // KINEO-RECREATE-TRAVA-1011 — outro ator", "// KINEO-RECREATE-TRAVA-1011 — outro ator"],
  ["if (swapVerdict.result === 'unchanged' || swapVerdict.result === 'partial')", "if (swapVerdict.result === 'unchanged')"],
  ["if (!(await swap.markFailed(row.id, reason, swapLock))) return row", "await swap.markFailed(row.id, reason, swapLock)"],
  ["if (deps.recreateSwap?.applies(row) && deps.recreateSwap.busy(row, deps.now())) return row", ''],
]
for (const [before, after] of flowMutants) {
  assert(flowSrc.includes(before), 'mutante sem alvo: ' + before)
  ok(!(await flowScenariosHold({ 'lib/clips/clipFlow.ts': flowSrc.replace(before, after) })), 'mutante do fluxo morto: ' + before)
}
{
  const P = (same_person, attrs, photo = 'no') => ({ base_vs_result: attrs, same_person, result_vs_photo: photo })
  const keptP = P('yes', ALL('same')), swappedP = P('no', { ...ALL('unclear'), hair_color: 'different' }, 'yes')
  const before = 'if (kept > 0) return { result: \'partial\''
  assert(scSrc.includes(before))
  const sc = swapCheckMod({ 'lib/recreate/swapCheck.ts': scSrc.replace(before, 'if (false) return { result: \'partial\'') })
  ok(sc.decideSwap({ persons: [{ person: 1, ...swappedP }, { person: 2, ...keptP }] }, 2).result !== 'partial', 'mutante da decisão (parcial vira outra coisa) morto')
  const sc2 = swapCheckMod({ 'lib/recreate/swapCheck.ts': scSrc.replace('p.same_as_base === true && p.matches_photo !== true', 'p.same_as_base === true') })
  ok(sc2.decideSwap({ persons: [{ person: 1, ...keptP, result_vs_photo: 'yes' }] }, 1).result === 'unchanged', 'mutante da contradição: contraditório viraria estorno (o teste de contradição o pega)')
  const rule = 'said === true ? (same > 0 && diff === 0 ? true : null)'
  assert(scSrc.includes(rule))
  const sc3 = swapCheckMod({ 'lib/recreate/swapCheck.ts': scSrc.replace(rule, 'said === true ? true') })
  ok(sc3.decideSwap({ persons: [{ person: 1, ...P('yes', ALL('unclear')) }] }, 1).result === 'unchanged', 'mutante "roupa basta": sem a regra dos atributos, roupa/cenário virariam estorno (o dublê o pega)')
}
console.log(`PASS test-recreate-trava-1011: ${passed} verificações — catálogo só com troca aprovada (página/troca separadas, casa vê "em teste"), Money fan fora, POST recusa antes de I/O, 8 s = 45 (cobra 1×, replay não, falha estorna 45), duração sem tarifa recusa, trava unchanged/partial: failed condicional à reserva e só o vencedor estorna, swapped/unverified entregam, reserva válida sai antes de copiar, motivo normalizado do unverified, roupa/cenário não contam, clipe comum byte a byte; mutantes mortos.`)
