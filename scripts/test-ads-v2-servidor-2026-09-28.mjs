// KINEO-ADS-V2-2026-09-28 — guardião do SERVIDOR do anúncio v2 (etapa 2): cobrança, envio à fal, avanço, montagem,
// rotas, cron e superfícies. Roda com `node scripts/test-ads-v2-servidor-2026-09-28.mjs`, sem rede e sem banco.
//
// Duas camadas:
//   1. EXECUTADA — os módulos de servidor (v2Billing, v2Shots, v2Advance, v2Brief, refund.ts) são transpilados com o
//      typescript do repo e rodados contra um BANCO FALSO (tabelas em memória, filtros eq/in/is/like/not/lt e UPDATE
//      condicional de verdade) e fornecedores falsos (fal, Creatomate, TTS). Assim a prova é do comportamento: texto
//      nunca vai à fal, ambíguo não é reenviado, o id do Creatomate é gravado antes de qualquer outra coisa, a chave
//      de cobrança é o render_id da entrega, a varredura genérica não toca 'adsv2%'.
//   2. LEITURA (readFileSync) — a ORDEM das travas nas rotas (v2_closed e dry_run antes do débito), o cron no
//      vercel.json, eventos no sink, selo, alarme, carta genérica sem o anúncio.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const cod = (p) => semComentarios(rd(p))
let ok = 0
const falhas = []
const check = async (nome, condicao) => {
  let v = false
  try { v = typeof condicao === 'function' ? !!(await condicao()) : !!condicao } catch (e) { falhas.push(`${nome} (lançou: ${e.message})`); return }
  if (v) ok++; else falhas.push(nome)
}
/** Índices crescentes: cada trecho aparece DEPOIS do anterior no texto. */
const ordem = (src, ...marcas) => {
  let pos = -1
  for (const m of marcas) {
    const i = src.indexOf(m, pos + 1)
    if (i < 0 || i <= pos) return false
    pos = i
  }
  return true
}

// ── carregador: transpila TS → CJS e resolve '@/' e './' com stubs ─────────────────────────────────────────────────
function makeLoader(stubs, opts = {}) {
  const cache = new Map()
  const real = new Set(opts.real ?? [])
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const js = ts.transpileModule(rd(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || spec === 'crypto') return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && real.has(target)) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    const timers = opts.timers ?? { setTimeout, clearTimeout }
    new Function('exports', 'require', 'module', 'setTimeout', 'clearTimeout', js)(module.exports, req, module, timers.setTimeout, timers.clearTimeout)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
/** Relógio rápido: todo setTimeout dispara no próximo giro (a corrida de 25 s e a pausa do Kling viram 0). */
const fastTimers = { setTimeout: (fn) => setImmediate(fn), clearTimeout: (h) => clearImmediate(h) }

// ── banco falso com UPDATE condicional de verdade ───────────────────────────────────────────────────────────────────
const likeRe = (p) => new RegExp('^' + p.split('').map((c) => (c === '%' ? '.*' : c === '_' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('') + '$')
let seq = 0
function fakeDb(tables, hooks = {}) {
  const log = []
  const from = (name) => {
    tables[name] ??= []
    const ctx = { name, op: 'select', filters: [], patch: null, rows: null, opts: null }
    const api = {
      select() { return api },
      eq(k, v) { ctx.filters.push((r) => r[k] !== undefined && r[k] !== null && String(r[k]) === String(v)); return api },
      in(k, v) { ctx.filters.push((r) => v.map(String).includes(String(r[k]))); return api },
      is(k, v) { ctx.filters.push((r) => (v === null ? r[k] === null || r[k] === undefined : r[k] === v)); return api },
      like(k, p) { const re = likeRe(p); ctx.filters.push((r) => typeof r[k] === 'string' && re.test(r[k])); return api },
      not(k, _op, p) { const re = likeRe(p); ctx.filters.push((r) => !(typeof r[k] === 'string' && re.test(r[k]))); return api },
      lt(k, v) { ctx.filters.push((r) => r[k] < v); return api },
      gte(k, v) { ctx.filters.push((r) => r[k] >= v); return api },
      order() { return api },
      limit() { return api },
      update(p) { ctx.op = 'update'; ctx.patch = p; return api },
      insert(r) { ctx.op = 'insert'; ctx.rows = Array.isArray(r) ? r : [r]; return api },
      upsert(r, o) { ctx.op = 'upsert'; ctx.rows = Array.isArray(r) ? r : [r]; ctx.opts = o; return api },
      maybeSingle() { return Promise.resolve(run(ctx, true)) },
      then(a, b) { return Promise.resolve(run(ctx, false)).then(a, b) },
    }
    return api
  }
  function run(ctx, single) {
    const t = tables[ctx.name]
    hooks.before?.(ctx)
    const hit = () => t.filter((r) => ctx.filters.every((f) => f(r)))
    if (ctx.op === 'select') {
      let rows = hit()
      if (ctx.name === 'ads_v2_shots') rows = rows.slice().sort((a, b) => a.idx - b.idx || a.attempt - b.attempt)
      rows = rows.map((r) => ({ ...r }))
      return single ? { data: rows[0] ?? null, error: null } : { data: rows, error: null }
    }
    if (ctx.op === 'update') {
      const rows = hit()
      for (const r of rows) Object.assign(r, ctx.patch, { updated_at: new Date().toISOString() })
      log.push({ op: 'update', table: ctx.name, patch: ctx.patch, n: rows.length })
      return single ? { data: rows[0] ? { ...rows[0] } : null, error: null } : { data: rows.map((r) => ({ ...r })), error: null }
    }
    const out = []
    for (const row of ctx.rows) {
      if (ctx.name === 'ads_v2_shots' && t.some((x) => x.order_id === row.order_id && x.idx === row.idx && x.attempt === (row.attempt ?? 1))) {
        if (ctx.op === 'upsert' && ctx.opts?.ignoreDuplicates) continue
        return { data: null, error: { code: '23505', message: 'dup' } }
      }
      if (ctx.name === 'ads_v2_orders' && row.id && t.some((x) => x.id === row.id)) return { data: null, error: { code: '23505', message: 'dup pk' } }
      if (ctx.name === 'videos' && row.render_id && t.some((x) => x.render_id === row.render_id)) return { data: null, error: { code: '23505', message: 'dup render' } }
      const iso = new Date().toISOString()
      const base = ctx.name === 'ads_v2_shots'
        ? { attempt: 1, movement_variant: 0, status: 'pending', image_url: null, image_request_id: null, request_id: null, fal_url: null, stored_url: null, measured_seconds: null, reason: null, reason_class: null, image_submit_claimed_at: null, submit_claimed_at: null, submitted_at: null, fal_done_at: null }
        : {}
      const nr = { id: row.id ?? `${ctx.name}-${++seq}`, created_at: iso, updated_at: iso, ...base, ...row }
      t.push(nr)
      out.push({ ...nr })
    }
    log.push({ op: ctx.op, table: ctx.name, n: out.length })
    return single ? { data: out[0] ?? null, error: null } : { data: out, error: null }
  }
  return { from, rpc: (fn, args) => Promise.resolve(hooks.rpc ? hooks.rpc(fn, args) : { data: null, error: null }), log, tables }
}

const U = (n) => `${String(n).padStart(8, '0')}-2222-4333-8444-555555555555`
const ORDER = U(1)
const USER = U(9)
const GEN = U(2)

// ═══ 1. COBRANÇA (lib/ads/v2Billing.ts executado) ═════════════════════════════════════════════════════════════════
const billCalls = { intent: [], debit: [], refund: [], events: [] }
let intentResult = true
let refundHook = null
const billingStubs = {
  '@/lib/credits/renderIntent': { recordRenderIntent: async (a) => { billCalls.intent.push(a); return intentResult } },
  '@/lib/credits/debit': { debitVideoCredits: async (db, a) => { billCalls.debit.push({ ...a, at: billCalls.intent.length }); return db.__debit ? db.__debit(a) : { data: 0, error: null } } },
  '@/lib/credits/refund': { refundRenderCredits: async (ref) => { billCalls.refund.push(ref); return refundHook ? refundHook(ref) : 0 } },
  '@/lib/serverEvents': { writeServerEvent: async (e) => { billCalls.events.push(e); return true } },
}
const B = makeLoader(billingStubs)('lib/ads/v2Billing.ts')

await check('B1 chave do pedido = adsv2-<order>-<generation> (é também o videos.render_id da entrega)', B.adsV2BillingRef(ORDER, GEN) === `adsv2-${ORDER}-${GEN}` && B.ADS_V2_BILLING_PREFIX === 'adsv2-' && B.ADS_V2_QUALITY === 'ads_v2')
await check('B2 chave da refação = adsv2redo-<id>; os dois prefixos começam com adsv2 (a exclusão da varredura genérica cobre os dois)', B.adsV2RetakeRef(ORDER) === `adsv2redo-${ORDER}` && B.adsV2RetakeRef(ORDER).startsWith('adsv2') && B.adsV2BillingRef(ORDER, GEN).startsWith('adsv2'))
await check('B3 id da refação determinístico: mesma semente = mesmo uuid válido; semente diferente = outro', () => {
  const a = B.deterministicUuid('adsv2redo:x:3:y'); const b = B.deterministicUuid('adsv2redo:x:3:y'); const c = B.deterministicUuid('adsv2redo:x:4:y')
  return a === b && a !== c && /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(a)
})
const ledgerDb = (row, balance = 100) => {
  const db = fakeDb({ profiles: [{ id: USER, video_credits: balance }], credit_debits: row ? [row] : [] })
  db.__debit = () => ({ data: balance - 34, error: null })
  return db
}
const REF = B.adsV2BillingRef(ORDER, GEN)
await check('B4 débito confiável: intenção → saldo → débito(service) → releitura com o valor EXATO', async () => {
  billCalls.intent.length = 0; billCalls.debit.length = 0
  const r = await B.chargeAdsV2(ledgerDb({ render_id: REF, user_id: USER, amount: 34, refunded_at: null }), { userId: USER, billingRef: REF, cost: 34 })
  return r.ok === true && billCalls.intent.length === 1 && billCalls.intent[0].renderId === REF && billCalls.intent[0].cost === 34 && billCalls.intent[0].quality === 'ads_v2' && billCalls.debit.length === 1 && billCalls.debit[0].service === true && billCalls.debit[0].renderId === REF
})
await check('B5 saldo curto: 402 e o RPC de débito NUNCA é chamado (ele não recusa saldo curto)', async () => {
  billCalls.debit.length = 0
  const r = await B.chargeAdsV2(ledgerDb(null, 20), { userId: USER, billingRef: REF, cost: 34 })
  return r.ok === false && r.code === 'out_of_credits' && r.status === 402 && r.debitPossible === false && billCalls.debit.length === 0
})
await check('B6 intenção não gravada: nada é debitado', async () => {
  billCalls.debit.length = 0; intentResult = false
  const r = await B.chargeAdsV2(ledgerDb(null), { userId: USER, billingRef: REF, cost: 34 })
  intentResult = true
  return r.ok === false && r.code === 'intent_failed' && billCalls.debit.length === 0
})
await check('B7 ledger com valor diferente, de outro dono ou estornado NÃO conta como cobrado', async () => {
  const a = await B.chargeAdsV2(ledgerDb({ render_id: REF, user_id: USER, amount: 33, refunded_at: null }), { userId: USER, billingRef: REF, cost: 34 })
  const b = await B.chargeAdsV2(ledgerDb({ render_id: REF, user_id: U(7), amount: 34, refunded_at: null }), { userId: USER, billingRef: REF, cost: 34 })
  const c = await B.chargeAdsV2(ledgerDb({ render_id: REF, user_id: USER, amount: 34, refunded_at: '2026-09-28T00:00:00Z' }), { userId: USER, billingRef: REF, cost: 34 })
  const d = await B.chargeAdsV2(ledgerDb(null), { userId: USER, billingRef: REF, cost: 34 })
  return !a.ok && a.code === 'debit_mismatch' && !b.ok && b.code === 'debit_mismatch' && !c.ok && c.code === 'debit_refunded' && !d.ok && d.code === 'debit_unconfirmed' && d.debitPossible === true
})
await check('B8 estorno SÓ pelo vencedor do UPDATE condicional →failed (corrida perdida = nenhum estorno)', async () => {
  billCalls.refund.length = 0
  const tables = { ads_v2_orders: [{ id: ORDER, user_id: USER, status: 'generating', billing_ref: REF, video_id: null }], credit_debits: [{ render_id: REF, user_id: USER, amount: 34, refunded_at: null }] }
  const db = fakeDb(tables)
  refundHook = () => { tables.credit_debits[0].refunded_at = new Date().toISOString(); return 34 }
  const o = { id: ORDER, user_id: USER, billing_ref: REF }
  const [x, y] = await Promise.all([B.failAdsV2Order(db, o, 'teste'), B.failAdsV2Order(db, o, 'teste')])
  const z = await B.failAdsV2Order(db, o, 'de novo')
  refundHook = null
  const won = [x, y].filter((r) => r.won)
  return won.length === 1 && won[0].refund === 'refunded' && !z.won && billCalls.refund.length === 1 && tables.ads_v2_orders[0].status === 'failed'
})
await check('B9 pedido entregue (video_id) ou já failed nunca vira failed nem estorna', async () => {
  billCalls.refund.length = 0
  const db = fakeDb({ ads_v2_orders: [{ id: ORDER, user_id: USER, status: 'assembling', billing_ref: REF, video_id: U(5) }, { id: U(3), user_id: USER, status: 'delivered', billing_ref: 'adsv2-x', video_id: null }] })
  const a = await B.failAdsV2Order(db, { id: ORDER, user_id: USER, billing_ref: REF }, 'x')
  const b = await B.failAdsV2Order(db, { id: U(3), user_id: USER, billing_ref: 'adsv2-x' }, 'x')
  return !a.won && !b.won && billCalls.refund.length === 0
})

// REVISÃO 28/09 (dinheiro): a entrega grava videos ANTES do →delivered; video_id nulo não prova "não entregou".
await check('B10 linha em videos com a chave de cobrança = ENTREGUE: nunca vira failed nem estorna (mesmo com video_id nulo no pedido)', async () => {
  billCalls.refund.length = 0
  const tables = { ads_v2_orders: [{ id: ORDER, user_id: USER, status: 'assembling', billing_ref: REF, video_id: null }], videos: [{ id: U(6), render_id: REF }] }
  const r = await B.failAdsV2Order(fakeDb(tables), { id: ORDER, user_id: USER, billing_ref: REF }, 'order_timeout')
  return !r.won && billCalls.refund.length === 0 && tables.ads_v2_orders[0].status === 'assembling'
})

// ═══ 2. ENVIO À FAL (lib/ads/v2Shots.ts executado com fila falsa) ═════════════════════════════════════════════════
class FalQueueSubmitError extends Error { constructor(m, o) { super(m); this.ambiguous = o.ambiguous; this.status = o.status ?? null; this.providerBody = o.providerBody } }
let falSubmit = async () => 'req-1'
const alerts = []
const realDisposition = makeLoader({})('lib/cinematic/sceneDisposition.ts')
const shotsStubs = {
  '@fal-ai/client': { fal: { config() {}, queue: { status: async () => ({}), result: async () => ({}) } } },
  '@/lib/falQueue': { FalQueueSubmitError, submitFalQueueOnce: (...a) => falSubmit(...a) },
  '@/lib/cinematic/sceneDisposition': realDisposition,
  '@/lib/renderAssets': { persistRenderAssets: async () => ({ videoUrl: 'x', measuredSeconds: null }) },
  '@/lib/mp4Duration': { probeMp4DurationSeconds: () => null },
  '@/lib/falAlert': {
    alertFalExhausted: async (a) => { alerts.push(a); return 'sent' },
    falErrorText: (e) => `${e?.message ?? ''}`,
    looksExhausted: (e) => e?.status === 402 || (e?.status === 403 && /balance/i.test(e?.message ?? '')),
  },
}
const SH = makeLoader(shotsStubs, { timers: fastTimers })('lib/ads/v2Shots.ts')
await check('S1 corrida de 25 s: POST sem resposta no prazo = AMBÍGUO (nunca "falhou, manda de novo")', async () => {
  falSubmit = () => new Promise(() => {})
  const r = await SH.submitShotOnce('m', {}, { userId: USER, orderId: ORDER })
  return SH.ADS_V2_SUBMIT_RACE_MS === 25_000 && r.kind === 'ambiguous' && r.reasonClass === 'transport_timeout_5xx'
})
await check('S2 resposta tardia ainda na lambda devolve o request_id pela promessa `late` (o avanço grava, não reenvia)', async () => {
  let solta
  falSubmit = () => new Promise((res) => { solta = res })
  const r = await SH.submitShotOnce('m', {}, { userId: USER, orderId: ORDER })
  solta('req-tarde')
  return r.kind === 'ambiguous' && (await r.late) === 'req-tarde'
})
await check('S3 408/5xx/transporte = ambíguo; 422 = recusa invalid_payload; 429 esgotado = recusa rate_limit', async () => {
  falSubmit = async () => { throw new FalQueueSubmitError('Fal queue rejected submit (503)', { ambiguous: true, status: 503 }) }
  const a = await SH.submitShotOnce('m', {}, { userId: USER, orderId: ORDER })
  falSubmit = async () => { throw new TypeError('fetch failed') }
  const b = await SH.submitShotOnce('m', {}, { userId: USER, orderId: ORDER })
  falSubmit = async () => { throw new FalQueueSubmitError('Fal queue rejected submit (422)', { ambiguous: false, status: 422 }) }
  const c = await SH.submitShotOnce('m', {}, { userId: USER, orderId: ORDER })
  falSubmit = async () => { throw new FalQueueSubmitError('Fal queue rejected submit (429)', { ambiguous: false, status: 429 }) }
  const d = await SH.submitShotOnce('m', {}, { userId: USER, orderId: ORDER })
  return a.kind === 'ambiguous' && b.kind === 'ambiguous' && c.kind === 'rejected' && c.reasonClass === 'invalid_payload' && d.kind === 'rejected' && d.reasonClass === 'rate_limit'
})
await check('S4 recusa por saldo toca o alarme da fal com a fonte nova "ads"', async () => {
  alerts.length = 0
  falSubmit = async () => { throw new FalQueueSubmitError('Exhausted balance', { ambiguous: false, status: 402 }) }
  const r = await SH.submitShotOnce('m', {}, { userId: USER, orderId: ORDER })
  return r.kind === 'rejected' && r.reasonClass === 'balance_quota' && alerts.length === 1 && alerts[0].source === 'ads'
})
await check('S5 cópia: URL devolvida igual à da fal = cópia FALHOU (null), e o renderId do plano é adsv2-<order>-p<i>-a<n>', async () => {
  const L = makeLoader({ ...shotsStubs, '@/lib/renderAssets': { persistRenderAssets: async (a) => ({ videoUrl: a.videoUrl, measuredSeconds: 3.04, renderIdSeen: a.renderId }) } }, { timers: fastTimers })('lib/ads/v2Shots.ts')
  const r = await L.persistShotClip({ userId: USER, orderId: ORDER, idx: 2, attempt: 1, falUrl: 'https://fal.media/x.mp4' })
  return r === null && L.adsV2ShotRenderId(ORDER, 2, 1) === `adsv2-${ORDER}-p2-a1`
})
await check('S6 cópia boa devolve a URL do bucket e a duração MEDIDA (mvhd)', async () => {
  const L = makeLoader({ ...shotsStubs, '@/lib/renderAssets': { persistRenderAssets: async () => ({ videoUrl: 'https://sb/renders/x.mp4', measuredSeconds: 3.041 }) } }, { timers: fastTimers })('lib/ads/v2Shots.ts')
  const r = await L.persistShotClip({ userId: USER, orderId: ORDER, idx: 2, attempt: 1, falUrl: 'https://fal.media/x.mp4' })
  return r && r.storedUrl === 'https://sb/renders/x.mp4' && r.measuredSeconds === 3.041
})
await check('S7 poll espelha checkFalClip: COMPLETED com erro = failed; 422 no result confirmado = failed; erro de consulta = processing', async () => {
  const mk = (status, result) => makeLoader({ ...shotsStubs, '@fal-ai/client': { fal: { config() {}, queue: { status: async (_m, { requestId }) => ({ request_id: requestId, ...status }), result } } } }, { timers: fastTimers })('lib/ads/v2Shots.ts')
  process.env.FAL_KEY = process.env.FAL_KEY || 'teste-sem-rede'
  const a = await mk({ status: 'COMPLETED', error: 'boom' }, async () => ({})).pollFalJob('m', 'r', 'video', { userId: USER, orderId: ORDER })
  const b = await mk({ status: 'COMPLETED' }, async () => { const e = new Error('x'); e.status = 422; throw e }).pollFalJob('m', 'r', 'video', { userId: USER, orderId: ORDER })
  const c = await makeLoader({ ...shotsStubs, '@fal-ai/client': { fal: { config() {}, queue: { status: async () => { const e = new Error('x'); e.status = 422; throw e } } } } }, { timers: fastTimers })('lib/ads/v2Shots.ts').pollFalJob('m', 'r', 'video', { userId: USER, orderId: ORDER })
  const d = await mk({ status: 'COMPLETED' }, async () => ({ data: { video: { url: 'https://fal.media/v.mp4' } } })).pollFalJob('m', 'r', 'video', { userId: USER, orderId: ORDER })
  const e = await mk({ status: 'COMPLETED' }, async () => ({ data: { images: [{ url: 'https://fal.media/i.jpg' }] } })).pollFalJob('m', 'r', 'image', { userId: USER, orderId: ORDER })
  return a.state === 'failed' && b.state === 'failed' && c.state === 'processing' && d.state === 'done' && d.url === 'https://fal.media/v.mp4' && e.state === 'done'
})

// ═══ 3. AVANÇO (lib/ads/v2Advance.ts executado: banco falso + fornecedores falsos) ════════════════════════════════
const S = await import(new URL('../lib/ads/v2ShotLists.ts', import.meta.url).href)
const T = await import(new URL('../lib/ads/v2Tiers.ts', import.meta.url).href)
const prov = { submits: [], cmSubmits: [], cmPolls: 0, events: [], voice: 0, lyria: 0 }
let submitImpl = async (model) => ({ kind: 'accepted', requestId: `req-${prov.submits.length}`, posts: 1 })
let pollImpl = async () => ({ state: 'processing', url: null })
let cmSubmitImpl = async () => 'cm-1'
let cmPollImpl = async () => ({ status: 'rendering', url: null })
let currentTables = null
class CreatomateSubmitError extends Error { constructor(m, amb) { super(m); this.ambiguous = amb } }
const advStubs = {
  '@/lib/compose': {
    CreatomateSubmitError,
    estimateMp3DurationSeconds: () => 9.5,
    pollCreatomateRender: async (id) => { prov.cmPolls++; return cmPollImpl(id) },
    submitCreatomateRender: async (src) => { prov.cmSubmits.push({ src, orderAtPost: { ...currentTables.ads_v2_orders[0] } }); return cmSubmitImpl(src) },
    uploadVoiceoverToSupabase: async () => 'https://sb/voiceovers/v.mp3',
  },
  '@/lib/lyriaMusic': { getLyriaMusicUrl: async () => { prov.lyria++; return null } },
  '@/lib/pixabayMusic': { getBackgroundMusicUrl: async () => 'https://sb/music/m.mp3' },
  '@/lib/ttsFallback': { synthesizeTtsFallback: async () => { prov.voice++; return Buffer.alloc(2000) } },
  '@/lib/renderAssets': { persistRenderAssets: async (a) => ({ videoUrl: `https://sb/renders/${a.renderId}.mp4`, thumbnailUrl: null, measuredSeconds: 15.1, measureMethod: 'mvhd', renderIdSeen: a.renderId }) },
  '@/lib/renderProfile': { renderOutputSpecFor: () => ({ output_format: 'mp4', width: 1080, height: 1920, frame_rate: 24 }) },
  '@/lib/textLanguage': { captionFontFor: () => 'Montserrat', narrationLanguage: (x) => (typeof x === 'string' && x ? x : null) },
  '@/lib/ads/speakable': { speakableForTts: (t) => t },
  '@/lib/serverEvents': { writeServerEvent: async (e) => { prov.events.push({ ...e, orderAtEvent: currentTables ? { ...currentTables.ads_v2_orders[0] } : null }); return true } },
  '@/lib/ads/v2Billing': makeLoader(billingStubs)('lib/ads/v2Billing.ts'),
  '@/lib/ads/v2Shots': {
    ...SH,
    submitShotOnce: async (model, input, ctx) => { prov.submits.push({ model, input, rowsAtPost: currentTables.ads_v2_shots.map((r) => ({ ...r })) }); return submitImpl(model, input, ctx) },
    pollFalJob: (...a) => pollImpl(...a),
    persistShotClip: async (a) => ({ storedUrl: `https://sb/renders/${SH.adsV2ShotRenderId(a.orderId, a.idx, a.attempt)}.mp4`, measuredSeconds: 3.04 }),
  },
  '@/lib/ads/v2Images': {
    persistAudioCopy: async () => null,
    persistSceneImage: async (a) => `https://sb/renders/${a.orderId}-p${a.idx}-scene.jpg`,
    pollSceneImage: async () => ({ state: 'done', url: 'https://fal.media/img.jpg' }),
    submitSceneImage: async (scene) => { prov.submits.push({ model: T.ADS_V2_SCENE_IMAGE_SLUG, input: scene, rowsAtPost: currentTables.ads_v2_shots.map((r) => ({ ...r })) }); return { kind: 'accepted', requestId: 'img-1', posts: 1 } },
  },
}
const A = makeLoader(advStubs, { timers: fastTimers, real: ['lib/ads/v2Engines.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2ShotLists.ts', 'lib/ads/adV2Montage.ts', 'lib/ads/v2Music.ts'] })('lib/ads/v2Advance.ts')

const PH = 'https://x.supabase.co/storage/v1/object/public/user-footage/u/'
const photos = [
  { id: 'p-menu', url: `${PH}menu.jpg`, kind: 'text' },
  { id: 'p-dish', url: `${PH}dish.jpg`, kind: 'product' },
  { id: 'p-room', url: `${PH}room.jpg`, kind: 'place' },
  { id: 'p-team', url: `${PH}team.jpg`, kind: 'people' },
]
function scenario(tier = 'photo_motion', over = {}) {
  const plan = S.planShots({ sector: 'restaurant', tier, photos, seconds: 15 })
  const stored = { ...plan, overlays: plan.overlays.slice(0, 2).map((o, i) => ({ role: o.role, start: o.start, end: o.end, text: i === 0 ? 'Bella Pizza' : 'Wood-fired pizza' })), narration: 'Bella Pizza bakes wood-fired pizza every night.' }
  const order = {
    id: ORDER, user_id: USER, status: 'generating', tier, seconds: 15, sector: 'restaurant', brief: { business: 'Bella Pizza — wood-fired pizza' }, language: 'en', narration: true,
    card_url: 'https://sb/user-footage/u/card.png', plan: stored, music_url: null, voice_url: null, voice_seconds: null, billing_ref: REF, credits_charged: 34,
    generation_id: GEN, creatomate_render_id: null, video_id: null, error: null, started_at: new Date().toISOString(), assembly_lease_at: null, assembly_submit_at: null, parent_order_id: null, retake_idx: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...over,
  }
  const tables = { ads_v2_orders: [order], ads_v2_shots: [], videos: [], credit_debits: [{ render_id: REF, user_id: USER, amount: 34, refunded_at: null }], profiles: [] }
  const db = fakeDb(tables)
  currentTables = tables
  return { db, tables, plan, order }
}
const reset = () => { prov.submits.length = 0; prov.cmSubmits.length = 0; prov.cmPolls = 0; prov.events.length = 0; prov.voice = 0; prov.lyria = 0 }
const DL = () => Date.now() + 60_000

await check('A1 plano text nasce skipped_text, SEM motor e SEM prompt, com a própria foto como stored_url', () => {
  const { plan } = scenario()
  const rows = A.buildInitialShotRows(ORDER, 'cinema', plan)
  const txt = rows.filter((r) => r.kind === 'text')
  return txt.length >= 1 && txt.every((r) => r.status === 'skipped_text' && r.engine === null && r.prompt === null && r.stored_url === `${PH}menu.jpg`) && rows.filter((r) => r.kind !== 'text').every((r) => r.engine && r.status === 'pending')
})
await check('A2 TEXTO NUNCA VAI À FAL: nem uma linha text malformada (pending, com motor) é enviada; as outras vão', async () => {
  reset()
  const { db, tables, plan, order } = scenario()
  const rows = A.buildInitialShotRows(ORDER, 'photo_motion', plan).map((r) => (r.kind === 'text' ? { ...r, status: 'pending', engine: 'kling_o3', prompt: 'Slow push in. Keep everything exactly as in the photo.' } : r))
  await db.from('ads_v2_shots').upsert(rows, { onConflict: 'order_id,idx,attempt', ignoreDuplicates: true })
  await A.dispatchAdsV2Shots(db, order, DL())
  const textUrls = new Set(tables.ads_v2_shots.filter((r) => r.kind === 'text').map((r) => r.image_url))
  return prov.submits.length === rows.filter((r) => r.kind !== 'text').length && prov.submits.every((s) => !textUrls.has(s.input.image_url)) && tables.ads_v2_shots.filter((r) => r.kind === 'text').every((r) => !r.request_id && !r.submit_claimed_at)
})
await check('A3 o carimbo de envio (UPDATE condicional) é gravado ANTES do POST; tela e cron juntos mandam cada plano UMA vez', async () => {
  reset()
  const { db, tables, plan, order } = scenario()
  await db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, 'photo_motion', plan))
  await Promise.all([A.dispatchAdsV2Shots(db, order, DL()), A.dispatchAdsV2Shots(db, order, DL())])
  const ai = tables.ads_v2_shots.filter((r) => r.kind !== 'text')
  const idsPosted = prov.submits.map((s) => s.input.image_url + '|' + s.input.prompt)
  const claimedBefore = prov.submits.every((s) => s.rowsAtPost.some((r) => r.image_url === s.input.image_url && r.prompt === s.input.prompt && r.submit_claimed_at))
  return prov.submits.length === ai.length && new Set(idsPosted).size === idsPosted.length && claimedBefore && ai.every((r) => r.status === 'submitted' && r.request_id)
})
await check('A4 o input vai campo a campo pelo builder: Kling O3 com duration "3" e generate_audio false, sem end_image_url', async () => {
  const k = prov.submits.find((s) => s.model === T.ADS_V2_KLING_O3_I2V_SLUG)
  return k && k.input.duration === '3' && k.input.generate_audio === false && !('end_image_url' in k.input) && Object.keys(k.input).sort().join(',') === 'duration,generate_audio,image_url,prompt'
})
await check('A5 AMBÍGUO NÃO É REENVIADO: fica parado até 20 min; vencido, vira falha e nasce a tentativa 2 (sem cobrar)', async () => {
  reset()
  const { db, tables, plan, order } = scenario()
  await db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, 'photo_motion', plan))
  submitImpl = async () => ({ kind: 'ambiguous', reasonClass: 'transport_timeout_5xx', posts: 1, late: Promise.resolve(null) })
  await A.dispatchAdsV2Shots(db, order, DL())
  const first = prov.submits.length
  submitImpl = async () => ({ kind: 'accepted', requestId: 'req-x', posts: 1 })
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  const stillOne = prov.submits.length === first && tables.ads_v2_shots.every((r) => r.attempt === 1)
  const old = new Date(Date.now() - 21 * 60_000).toISOString()
  for (const r of tables.ads_v2_shots) if (r.status === 'ambiguous') r.updated_at = old
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  const retried = tables.ads_v2_shots.filter((r) => r.attempt === 2)
  const charged = billCalls.debit.length
  return stillOne && retried.length === first && retried.every((r) => r.engine === T.routeShot(r.kind, 'photo_motion', 2)) && prov.submits.length === first * 2 && charged === billCalls.debit.length && prov.events.some((e) => e.name === 'ads_v2_shot_retried' && e.metadata.charged === false)
})
await check('A6 3ª tentativa vai ao H3 de reserva; falhou a 3ª = pedido falha e o crédito volta (vencedor único)', async () => {
  reset(); billCalls.refund.length = 0
  const { db, tables, plan } = scenario()
  const rows = A.buildInitialShotRows(ORDER, 'photo_motion', plan)
  await db.from('ads_v2_shots').upsert(rows)
  const ai = tables.ads_v2_shots.find((r) => r.kind !== 'text')
  ai.status = 'failed'; ai.reason_class = 'unknown'; ai.reason = 'provider_failed'
  await db.from('ads_v2_shots').upsert([{ ...rows.find((r) => r.idx === ai.idx), attempt: 2, status: 'failed', reason_class: 'unknown', reason: 'provider_failed' }])
  pollImpl = async () => ({ state: 'processing', url: null })
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  const third = tables.ads_v2_shots.find((r) => r.idx === ai.idx && r.attempt === 3)
  const h3ok = third && third.engine === 'h3' && prov.submits.some((s) => s.model === T.ADS_V2_H3_I2V_SLUG && s.input.prompt_expansion_mode === 'disabled' && s.input.resolution === '768P')
  third.status = 'failed'; third.reason_class = 'unknown'
  refundHook = () => { tables.credit_debits[0].refunded_at = new Date().toISOString(); return 34 }
  await Promise.all([A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() }), A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })])
  refundHook = null
  return h3ok && tables.ads_v2_orders[0].status === 'failed' && billCalls.refund.length === 1 && !tables.ads_v2_shots.some((r) => r.idx === ai.idx && r.attempt === 4)
})
await check('A7 saldo/acesso da fal NÃO é refeito: falha terminal na hora (refazer só queima tempo)', async () => {
  reset()
  const { db, tables, plan } = scenario()
  await db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, 'photo_motion', plan))
  const ai = tables.ads_v2_shots.find((r) => r.kind !== 'text')
  ai.status = 'failed'; ai.reason_class = 'balance_quota'
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  return tables.ads_v2_orders[0].status === 'failed' && !tables.ads_v2_shots.some((r) => r.attempt === 2)
})
await check('A8 cena criada: a IMAGEM (Nano Banana) sai antes do vídeo; o vídeo parte da imagem copiada para o nosso bucket', async () => {
  reset()
  const { db, tables, plan, order } = scenario('commercial')
  await db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, 'commercial', plan))
  await A.dispatchAdsV2Shots(db, order, DL())
  const scenes = tables.ads_v2_shots.filter((r) => r.source === 'generated_scene')
  const noVideoYet = scenes.every((r) => r.status === 'image_submitted' && !r.request_id)
  const imgPosts = prov.submits.filter((s) => s.model === T.ADS_V2_SCENE_IMAGE_SLUG).length
  pollImpl = async () => ({ state: 'processing', url: null })
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  const after = tables.ads_v2_shots.filter((r) => r.source === 'generated_scene')
  const videoFromBucket = prov.submits.filter((s) => s.model === T.ADS_V2_KLING_O3_I2V_SLUG && /-scene\.jpg$/.test(s.input.image_url)).length
  return scenes.length === 3 && noVideoYet && imgPosts === 3 && after.every((r) => r.status === 'submitted' && /^https:\/\/sb\//.test(r.image_url)) && videoFromBucket === 3
})
await check('A8b cena com o envio da IMAGEM em curso noutra lambda: nada de vídeo sem imagem, e o plano não é derrubado', async () => {
  reset()
  const { db, tables, plan, order } = scenario('commercial')
  await db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, 'commercial', plan))
  for (const r of tables.ads_v2_shots) if (r.source === 'generated_scene') r.image_submit_claimed_at = new Date().toISOString()
  await A.dispatchAdsV2Shots(db, order, DL())
  const scenes = tables.ads_v2_shots.filter((r) => r.source === 'generated_scene')
  return scenes.length === 3 && scenes.every((r) => r.status === 'pending' && !r.submit_claimed_at) && !prov.submits.some((s) => s.model === T.ADS_V2_SCENE_IMAGE_SLUG || !s.input.image_url)
})
async function readyScenario() {
  reset()
  const sc = scenario()
  await sc.db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, 'photo_motion', sc.plan))
  for (const r of sc.tables.ads_v2_shots) if (r.kind !== 'text') Object.assign(r, { status: 'done', stored_url: `https://sb/renders/p${r.idx}.mp4`, measured_seconds: 3.04 })
  return sc
}
await check('A9 montagem: o id do Creatomate é gravado ANTES de qualquer outra coisa; o carimbo existe NO MOMENTO do POST', async () => {
  const { db, tables } = await readyScenario()
  cmSubmitImpl = async () => 'cm-77'
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  const o = tables.ads_v2_orders[0]
  const ev = prov.events.find((e) => e.name === 'ads_v2_assembling')
  return prov.cmSubmits.length === 1 && prov.cmSubmits[0].orderAtPost.assembly_submit_at && !prov.cmSubmits[0].orderAtPost.creatomate_render_id && o.creatomate_render_id === 'cm-77' && o.status === 'assembling' && ev && ev.orderAtEvent.creatomate_render_id === 'cm-77' && prov.voice === 1
})
await check('A10 a fonte da montagem: vídeo mudo com trim dentro do clipe medido; plano text = foto parada com zoom; voz e música', () => {
  const src = prov.cmSubmits[0]?.src
  const vids = (src?.elements ?? []).filter((e) => e.type === 'video')
  const imgs = (src?.elements ?? []).filter((e) => e.type === 'image' && e.track === 2)
  return vids.length === 5 && vids.every((v) => v.volume === '0%' && v.trim_start + v.duration <= 3.04) && imgs.length === 1 && imgs[0].source === `${PH}menu.jpg` && (src.elements ?? []).some((e) => e.type === 'audio' && e.track === 5) && (src.elements ?? []).some((e) => e.type === 'audio' && e.track === 6)
})
await check('A11 Creatomate AMBÍGUO nunca é reenviado: carimbo sem id espera; passado o prazo, falha com estorno', async () => {
  const { db, tables } = await readyScenario()
  cmSubmitImpl = async () => { throw new CreatomateSubmitError('timeout', true) }
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  cmSubmitImpl = async () => 'cm-2'
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  const o = tables.ads_v2_orders[0]
  const waited = prov.cmSubmits.length === 1 && o.status === 'assembling' && o.assembly_submit_at && !o.creatomate_render_id
  o.assembly_submit_at = new Date(Date.now() - 16 * 60_000).toISOString()
  // A trava vencida não pode reabrir o envio: o carimbo manda.
  o.assembly_lease_at = new Date(Date.now() - 10 * 60_000).toISOString()
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  return waited && prov.cmSubmits.length === 1 && tables.ads_v2_orders[0].status === 'failed'
})
await check('A12 recusa explícita do Creatomate = falha com estorno (sem reenvio)', async () => {
  const { db, tables } = await readyScenario()
  cmSubmitImpl = async () => { throw new CreatomateSubmitError('400 bad source', false) }
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  return prov.cmSubmits.length === 1 && tables.ads_v2_orders[0].status === 'failed'
})
await check('A13 entrega: render_id da linha em videos = chave de cobrança; quality_mode ads_v2; UPDATE condicional →delivered com evento UMA vez', async () => {
  const { db, tables } = await readyScenario()
  cmSubmitImpl = async () => 'cm-9'
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  cmPollImpl = async () => ({ status: 'succeeded', url: 'https://cdn.creatomate.com/r.mp4', snapshotUrl: null, durationSeconds: 15 })
  await Promise.all([A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() }), A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })])
  cmPollImpl = async () => ({ status: 'rendering', url: null })
  const v = tables.videos
  const o = tables.ads_v2_orders[0]
  return v.length === 1 && v[0].render_id === REF && v[0].quality_mode === 'ads_v2' && v[0].user_id === USER && v[0].status === 'completed' && v[0].title === 'Bella Pizza' && v[0].video_url === `https://sb/renders/${REF}.mp4` && o.status === 'delivered' && o.video_id === v[0].id && prov.events.filter((e) => e.name === 'ads_v2_delivered').length === 1
})
await check('A14 pedido parado além do teto falha e estorna (a varredura de 2 h é só a rede de trás)', async () => {
  reset(); billCalls.refund.length = 0
  const { db, tables } = scenario('photo_motion', { started_at: new Date(Date.now() - 91 * 60_000).toISOString() })
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  return tables.ads_v2_orders[0].status === 'failed' && billCalls.refund.length === 1 && prov.submits.length === 0
})

// ── REVISÃO 28/09 (dinheiro e estado) ──────────────────────────────────────────────────────────────────────────────
const antigo4min = () => new Date(Date.now() - 4 * 60_000).toISOString()
await check('A15 refação SEM linhas nunca é recriada pelo plano (mandaria o anúncio INTEIRO à fal por 5 cr): espera a folga; vencida, falha com estorno', async () => {
  reset(); billCalls.refund.length = 0
  const RR = `adsv2redo-${U(4)}`
  const { db, tables } = scenario('photo_motion', { parent_order_id: U(3), retake_idx: 1, billing_ref: RR, credits_charged: 5 })
  tables.credit_debits = [{ render_id: RR, user_id: USER, amount: 5, refunded_at: null }]
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  const waited = prov.submits.length === 0 && tables.ads_v2_shots.length === 0 && tables.ads_v2_orders[0].status === 'generating'
  tables.ads_v2_orders[0].started_at = antigo4min()
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  return waited && prov.submits.length === 0 && tables.ads_v2_shots.length === 0 && tables.ads_v2_orders[0].status === 'failed' && billCalls.refund.length === 1 && billCalls.refund[0] === RR
})
await check('A16 pedido SEM linhas: sem débito confirmado nada vai à fal (espera; vencida a folga, falha); com débito confirmado as linhas renascem', async () => {
  reset(); billCalls.refund.length = 0
  const a = scenario()
  a.tables.credit_debits = []
  await A.advanceAdsV2Order(a.db, ORDER, { deadlineMs: DL() })
  const waited = prov.submits.length === 0 && a.tables.ads_v2_shots.length === 0 && a.tables.ads_v2_orders[0].status === 'generating'
  a.tables.ads_v2_orders[0].started_at = antigo4min()
  await A.advanceAdsV2Order(a.db, ORDER, { deadlineMs: DL() })
  const failed = prov.submits.length === 0 && a.tables.ads_v2_shots.length === 0 && a.tables.ads_v2_orders[0].status === 'failed'
  reset()
  const b = scenario()
  await A.advanceAdsV2Order(b.db, ORDER, { deadlineMs: DL() })
  const reborn = b.tables.ads_v2_shots.length === b.plan.shots.length && prov.submits.length === b.plan.shots.filter((x) => x.kind !== 'text').length
  return waited && failed && reborn
})
await check('A17 envio de pedido que já não está em generating (outra lambda falhou/entregou) não manda nada à fal', async () => {
  reset()
  const { db, plan, order } = scenario()
  await db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, 'photo_motion', plan))
  const n = await A.dispatchAdsV2Shots(db, { ...order, status: 'failed' }, DL())
  const m = await A.dispatchAdsV2Shots(db, { ...order, status: 'delivered' }, DL())
  return n === 0 && m === 0 && prov.submits.length === 0
})
await check('A18 a entrega RESERVA o video_id antes da linha em videos: o prazo do pedido correndo junto NÃO estorna o filme entregue', async () => {
  const { tables } = await readyScenario()
  billCalls.refund.length = 0
  let concurrent = null
  const seen = []
  const db = fakeDb(tables, {
    before(ctx) {
      if (ctx.name === 'videos' && ctx.op === 'insert' && !concurrent) {
        seen.push({ reserved: tables.ads_v2_orders[0].video_id, id: ctx.rows[0].id })
        concurrent = advStubs['@/lib/ads/v2Billing'].failAdsV2Order(db, { ...tables.ads_v2_orders[0] }, 'order_timeout')
      }
    },
  })
  cmSubmitImpl = async () => 'cm-18'
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  cmPollImpl = async () => ({ status: 'succeeded', url: 'https://cdn.creatomate.com/r.mp4', snapshotUrl: null, durationSeconds: 15 })
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  cmPollImpl = async () => ({ status: 'rendering', url: null })
  const r = await concurrent
  const o = tables.ads_v2_orders[0]
  return seen.length === 1 && !!seen[0].reserved && seen[0].reserved === seen[0].id && r && !r.won && o.status === 'delivered' && o.video_id === tables.videos[0].id && tables.videos.length === 1 && billCalls.refund.length === 0
})

// Guardas que já existiam e nenhuma asserção segurava (mutantes vivos na revisão de 28/09).
await check('A19 clipe MEDIDO mais curto que o trecho da montagem (corte + 0,25 s) não vira done: o plano falha e ganha nova tentativa', async () => {
  reset()
  const { db, tables, plan } = scenario()
  await db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, 'photo_motion', plan))
  const ai = tables.ads_v2_shots.find((r) => r.kind !== 'text')
  Object.assign(ai, { status: 'submitted', request_id: 'req-curto', submitted_at: new Date().toISOString(), cut_start: 0, cut_seconds: 3 })
  pollImpl = async () => ({ state: 'done', url: 'https://fal.media/curto.mp4' })
  await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  pollImpl = async () => ({ state: 'processing', url: null })
  const first = tables.ads_v2_shots.find((r) => r.idx === ai.idx && r.attempt === 1)
  return first.status === 'failed' && /^clip_too_short/.test(first.reason ?? '') && !first.stored_url && tables.ads_v2_shots.some((r) => r.idx === ai.idx && r.attempt === 2)
})
await check('A20 id que chega TARDE só grava em plano ainda ambíguo: plano que já venceu (failed) não ressuscita', async () => {
  reset()
  const { db, tables, plan, order } = scenario()
  await db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, 'photo_motion', plan))
  let soltar = null
  const late = new Promise((r) => { soltar = r })
  submitImpl = async () => ({ kind: 'ambiguous', reasonClass: 'transport_timeout_5xx', posts: 1, late })
  await A.dispatchAdsV2Shots(db, order, DL())
  submitImpl = async () => ({ kind: 'accepted', requestId: `req-${prov.submits.length}`, posts: 1 })
  const ai = tables.ads_v2_shots.filter((r) => r.kind !== 'text')
  const allAmb = ai.length > 0 && ai.every((r) => r.status === 'ambiguous')
  ai[0].status = 'failed'
  soltar('req-tarde')
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r))
  return allAmb && ai[0].status === 'failed' && !ai[0].request_id && ai.slice(1).every((r) => r.status === 'submitted' && r.request_id === 'req-tarde')
})

// ═══ 4. VARREDURAS (lib/credits/refund.ts executado) ═══════════════════════════════════════════════════════════════
{
  const refunds = []
  let sweepTables = null
  const sweepDb = () => fakeDb(sweepTables, { rpc: (fn, args) => { refunds.push(args.p_render); const d = sweepTables.credit_debits.find((x) => x.render_id === args.p_render && !x.refunded_at); if (!d) return { data: 0, error: null }; d.refunded_at = 'now'; return { data: d.amount, error: null } } })
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://teste.invalid'
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'teste'
  const R = makeLoader({
    '@supabase/supabase-js': { createClient: () => sweepDb() },
    '@/lib/composeClaim': { COMPOSE_CLAIM_EVENT: 'compose_submission_claim' },
    '@/lib/cinematic/claim': { CINEMATIC_CLAIM_EVENT: 'cinematic_submission_claim', releaseCinematicClaim: async () => null },
    '@/lib/reverseTrial': { recordReverseTrialRefundForRender: async () => null },
    '@/lib/avatar/reservation': { refundAvatarBirthDebitForFailedRequest: async () => ({ ok: true, credits: 0 }) },
  })('lib/credits/refund.ts')
  const old = new Date(Date.now() - 3 * 3600_000).toISOString()
  const deb = (id, extra = {}) => ({ render_id: id, user_id: USER, amount: 34, refunded_at: null, kind: 'video', created_at: old, ...extra })
  await check('R1 varredura GENÉRICA não toca adsv2-/adsv2redo- (sem linha em videos por horas é o normal do pedido em andamento)', async () => {
    sweepTables = { credit_debits: [deb('adsv2-a-b'), deb('adsv2redo-c'), deb('creatomate-xyz')], videos: [] }
    refunds.length = 0
    await R.sweepStuckRenderDebits()
    return refunds.length === 1 && refunds[0] === 'creatomate-xyz'
  })
  await check('R2 sweepAbandonedAdsV2Debits: failed/cancelled estorna; entregue/vídeo não; em andamento < 2 h não; parado > 2 h vira failed e estorna; sem pedido = ambíguo', async () => {
    const o = (id, ref, status, extra = {}) => ({ id, user_id: USER, status, billing_ref: ref, started_at: old, video_id: null, ...extra })
    sweepTables = {
      credit_debits: [deb('adsv2-failed'), deb('adsv2-cancel'), deb('adsv2-deliv'), deb('adsv2-hasvid'), deb('adsv2-fresh'), deb('adsv2-stalled'), deb('adsv2redo-orfao'), deb('adsv2-novo', { created_at: new Date().toISOString() })],
      ads_v2_orders: [o('1', 'adsv2-failed', 'failed'), o('2', 'adsv2-cancel', 'cancelled'), o('3', 'adsv2-deliv', 'delivered'), o('4', 'adsv2-hasvid', 'assembling'), o('5', 'adsv2-fresh', 'generating', { started_at: new Date(Date.now() - 30 * 60_000).toISOString() }), o('6', 'adsv2-stalled', 'generating'), o('8', 'adsv2-novo', 'failed')],
      videos: [{ render_id: 'adsv2-hasvid' }],
      events: [],
    }
    refunds.length = 0
    const r = await R.sweepAbandonedAdsV2Debits()
    const got = refunds.slice().sort().join(',')
    return got === 'adsv2-cancel,adsv2-failed,adsv2-stalled' && r.stalledFailed === 1 && r.ambiguous === 1 && sweepTables.ads_v2_orders.find((x) => x.id === '6').status === 'failed' && sweepTables.ads_v2_orders.find((x) => x.id === '4').status === 'assembling'
  })
  await check('R4 débito adsv2 cujo pedido é de OUTRA conta não é estornado (ambíguo): a chave não prova de quem é o dinheiro', async () => {
    sweepTables = { credit_debits: [deb('adsv2-alheio')], ads_v2_orders: [{ id: '9', user_id: U(7), status: 'failed', billing_ref: 'adsv2-alheio', started_at: old, video_id: null }], videos: [], events: [] }
    refunds.length = 0
    const r = await R.sweepAbandonedAdsV2Debits()
    return refunds.length === 0 && r.ambiguous === 1 && r.refunded === 0
  })
  await check('R3 o cron refund-sweep chama a varredura nova (e as antigas continuam)', /sweepAbandonedAdsV2Debits\(\)/.test(cod('app/api/cron/refund-sweep/route.ts')) && /sweepAbandonedAvatarDebits\(\)/.test(cod('app/api/cron/refund-sweep/route.ts')) && rd('app/api/cron/refund-sweep/route.ts').includes('animatePublished, avatar, errors'))
}

// ═══ 5. BRIEF E ANTI-INVENÇÃO (lib/ads/v2Brief.ts executado com os validadores REAIS de scriptPrompt) ════════════
{
  const BR = makeLoader({ '@/lib/openai': { openai: {} } }, { real: ['lib/ads/autoBrief.ts', 'lib/ads/scriptPrompt.ts', 'lib/ads/models.ts', 'lib/ads/orderContract.ts', 'lib/ads/v2ShotLists.ts', 'lib/ads/types.ts'] })('lib/ads/v2Brief.ts')
  const brief = { business: 'Bella Pizza — wood-fired pizza', offer: '2 pizzas for $20', cta: 'call', contact: '+962 79 555 1234', language: 'en', tone: 'warm', audience: '', extra: {} }
  const opts = { maxWords: 30, narration: true }
  const good = { narration: 'Bella Pizza bakes wood-fired pizza every night, and right now you get 2 pizzas for $20.', overlays: ['Bella Pizza', '2 pizzas for $20', '+962 79 555 1234'], sector: 'restaurant' }
  await check('V1 texto bom passa: narração ≤ 30 palavras, marca na 1ª frase de tela, contato exato', () => {
    const r = BR.checkV2Copy(JSON.stringify(good), brief, opts)
    return r.ok && r.copy.overlays.length === 3 && r.copy.sectorHint === 'restaurant'
  })
  const why = (o) => { const r = BR.checkV2Copy(JSON.stringify({ ...good, ...o }), brief, opts); return r.ok ? [] : r.why }
  await check('V2 número inventado na NARRAÇÃO é recusado PELO NÚMERO (no tamanho certo)', () => why({ narration: 'Bella Pizza has served 5000 happy guests with wood-fired pizza every single night, come taste it with your family.' }).some((w) => /^narration: remove these numbers.*5000/.test(w)))
  await check('V3 número inventado numa FRASE DE TELA é recusado PELO NÚMERO', () => why({ overlays: ['Bella Pizza', '50% off today'] }).some((w) => /^overlays.1.: remove these numbers.*50/.test(w)))
  await check('V4 fama/urgência sem base ("best in town", "last chance") é recusada PELA AFIRMAÇÃO', () => why({ overlays: ['Bella Pizza', 'Best in town'] }).some((w) => /^overlays.1.: remove these claims/.test(w)) && why({ narration: 'Bella Pizza bakes wood-fired pizza every night, and this is your last chance to try it with friends.' }).some((w) => /^narration: remove these claims/.test(w)))
  await check('V5 contato diferente do brief (outro telefone, site inventado) é recusado', () => !BR.checkV2Copy(JSON.stringify({ ...good, overlays: ['Bella Pizza', 'Wood-fired', 'bellapizza.com'] }), brief, opts).ok && !BR.checkV2Copy(JSON.stringify({ ...good, overlays: ['Bella Pizza', 'Wood-fired', 'Call 0800 123 4567'] }), brief, opts).ok)
  await check('V6 narração acima de 30 palavras e marca ausente da 1ª frase de tela são recusadas', () => !BR.checkV2Copy(JSON.stringify({ ...good, narration: Array.from({ length: 31 }, () => 'pizza').join(' ') }), brief, opts).ok && !BR.checkV2Copy(JSON.stringify({ ...good, overlays: ['Wood-fired pizza', '2 pizzas for $20'] }), brief, opts).ok)
  await check('V7 os PROMPTS de movimento e de cena do molde passam pela régua (só "9:16" e o ângulo "N-degree" são permitidos, mesmo com brief sem número)', () => {
    const plan = S.planShots({ sector: 'restaurant', tier: 'cinema', photos, seconds: 15 })
    const prompts = plan.shots.flatMap((s) => [s.prompt, s.scenePrompt].filter(Boolean))
    const semNumero = { ...brief, offer: 'free dessert', contact: 'Rainbow St, Amman' }
    return prompts.length > 7 && prompts.some((x) => /[0-9]+-degree/.test(x)) && BR.checkV2Prompts(prompts, semNumero).length === 0 && BR.checkV2Prompts(['Slow push in on the 3 best dishes. Keep everything exactly as in the photo.'], brief).length === 1 && BR.checkV2Prompts(['Award-winning pasta close-up.'], brief).length === 1
  })
  await check('V8 extração usa buildAutoBriefMessages/parseAutoBrief, gpt-4o-mini e no máximo 1 correção (3 chamadas)', () => {
    const src = cod('lib/ads/v2Brief.ts')
    return /buildAutoBriefMessages\(/.test(src) && /parseAutoBrief\(/.test(src) && /ADS_V2_BRIEF_MODEL = 'gpt-4o-mini'/.test(src) && (src.match(/await callJson\(/g) || []).length === 3 && /from '@\/lib\/ads\/scriptPrompt'/.test(src)
  })
}

// ═══ 6. ROTAS — a ORDEM das travas (leitura) ═══════════════════════════════════════════════════════════════════════
const START = cod('app/api/ads/v2/start/route.ts')
await check('T1 /start: login → adsGate → adsV2Visible (v2_closed) → moderação → dry_run PARA → trava → débito → planos → envio', ordem(START,
  'auth.getUser()', 'adsGate(', 'adsV2Visible(user.email)', "'v2_closed'", 'moderateContent(', 'if (dryRun)', "update({ status: 'generating'", 'chargeAdsV2(', 'buildInitialShotRows(', 'dispatchAdsV2Shots('))
await check('T2 /start: o bloco do dry_run devolve SEM cobrar (charged:false) e não há débito cru na rota', () => {
  const i = START.indexOf('if (dryRun)'); const j = START.indexOf('chargeAdsV2(')
  const bloco = START.slice(i, j)
  return i > 0 && j > i && /return v2Json\(/.test(bloco) && /charged: false/.test(bloco) && !/debitVideoCredits|rpc\(/.test(START) && (START.match(/chargeAdsV2\(/g) || []).length === 1
})
await check('T3 /start: a trava é condicional (draft|planned) e 23505 do índice de "um ativo por conta" vira 409 another_active', /\.in\('status', \['draft', 'planned'\]\)/.test(START) && /23505' \? v2Fail\('another_active', 409\)/.test(START))
await check('T4 /start: débito sem prova de que não aconteceu → falha COM estorno; provado que não → volta a planned', /if \(!charge\.debitPossible\)/.test(START) && /failAdsV2Order\(admin, locked, `charge_/.test(START))
await check('T10 /start: a trava de início exige o DONO (id + user_id + draft|planned no mesmo UPDATE)', /\.eq\('id', orderId\)\s*\.eq\('user_id', user\.id\)\s*\.in\('status', \['draft', 'planned'\]\)/.test(START))
const RETAKE = cod('app/api/ads/v2/retake/route.ts')
await check('T5 /retake: v2_closed → text recusado → preço mostrado confere → id determinístico GRAVADO → débito → planos → envio', ordem(RETAKE,
  'adsV2Visible(user.email)', "'v2_closed'", "target.kind === 'text'", "'text_not_retakable'", "'price_changed'", 'deterministicUuid(', ".from('ads_v2_orders')", '.insert(', 'chargeAdsV2(', "from('ads_v2_shots').upsert(", 'dispatchAdsV2Shots('))
await check('T6 /retake: a chave é adsv2redo-<id determinístico> (semente com as refações FECHADAS do plano: recusa/falha não trava o plano para sempre) e o motor recomeça na tentativa 1', /deterministicUuid\(`adsv2redo:\$\{parent\.id\}:\$\{idx\}:\$\{target\.id\}:\$\{closed\}`\)/.test(RETAKE) && /\.eq\('parent_order_id', parent\.id\)\s*\.eq\('retake_idx', idx\)/.test(RETAKE) && /r\.status === 'delivered' \|\| r\.status === 'failed' \|\| r\.status === 'cancelled'/.test(RETAKE) && ordem(RETAKE, 'const closed', 'deterministicUuid(', '.insert(', 'chargeAdsV2(') && /adsV2RetakeRef\(retakeId\)/.test(RETAKE) && /routeShot\(target\.kind, parent\.tier, 1\)/.test(RETAKE))
await check('T7 rotas v2: runtime nodejs, tabela ausente = 503 not_ready, nenhum status 500; POST 60 s e status 300 s', () => {
  // REANCORADO 29/09 (KINEO-ADS-MODO-SIMPLES-2026-09-29): + a rota de pesquisa do modo simples (mesmas regras: nodejs, 60 s, 503 not_ready, nenhum 500).
  const rotas = { orders: 60, plan: 60, start: 60, retake: 60, status: 300, research: 60 }
  return Object.entries(rotas).every(([n, md]) => {
    const s = cod(`app/api/ads/v2/${n}/route.ts`)
    return /export const runtime = 'nodejs'/.test(s) && new RegExp(`export const maxDuration = ${md}\\b`).test(s) && /isMissingAdsTable\([^)]*\) \? v2Fail\('not_ready', 503\)/.test(s) && !/,\s*500\)/.test(s)
  })
})
await check('T8 /plan não cobra: nenhum débito, nenhuma chamada à fal, e a régua anti-invenção roda nos prompts ANTES de gravar', () => {
  const s = cod('app/api/ads/v2/plan/route.ts')
  return !/chargeAdsV2|debitVideoCredits|submitShotOnce|dispatchAdsV2Shots/.test(s) && ordem(s, 'adsV2Visible(user.email)', "'daily_limit'", 'moderateContent(', 'extractAdsV2Brief(', 'checkV2Prompts(', "status: 'planned'")
})
await check('T9 v2Access: adsV2Visible = ADS_V2_PUBLIC || isAdsInternalEmail(email)', () => {
  const V = makeLoader({}, { real: ['lib/ads/access.ts', 'lib/internalAccounts.ts', 'lib/ads/offer.ts', 'lib/ads/v2Tiers.ts'] })('lib/ads/v2Access.ts')
  // REANCORADO 29/09 (KINEO-ADS-V2-VIRADA-2026-09-29): com ADS_V2_PUBLIC = true, qualquer conta VÊ o v2 (o acesso ao Studio Ads
  // continua sendo conferido antes, por adsGate). A fórmula segue cravada; o resultado segue o interruptor importado.
  const T = makeLoader({}, { real: [] })('lib/ads/v2Tiers.ts')
  const aberto = T.ADS_V2_PUBLIC === true
  return /return ADS_V2_PUBLIC \|\| isAdsInternalEmail\(email\)/.test(cod('lib/ads/v2Access.ts')) && V.adsV2Visible('josephsskaf@gmail.com') === true && V.adsV2Visible('cliente@exemplo.com') === aberto && V.adsV2Visible('josephsskaf+x@gmail.com') === aberto && aberto
})

// ═══ 7. CRON, SUPERFÍCIES, TRAVA 8.2 ════════════════════════════════════════════════════════════════════════════════
const vercel = JSON.parse(rd('vercel.json'))
await check('C1 cron no vercel.json com folga de minuto (2-57/5: nunca no minuto 0/5 dos outros */5 nem no :30 do refund-sweep)', () => {
  const c = (vercel.crons ?? []).filter((x) => x.path.split('?')[0] === '/api/cron/ads-v2-advance')
  if (c.length !== 1 || c[0].schedule !== '2-57/5 * * * *') return false
  const mins = []; for (let m = 2; m <= 57; m += 5) mins.push(m)
  return mins.every((m) => m % 5 !== 0 && m !== 30)
})
await check('C2 rota do cron: CRON_SECRET falha fechada, force-no-store, maxDuration 300, não lê ?confirm, chama o motor de avanço', () => {
  const s = cod('app/api/cron/ads-v2-advance/route.ts')
  return /if \(!cronSecret\) return false/.test(s) && /`Bearer \$\{cronSecret\}`/.test(s) && /fetchCache = 'force-no-store'/.test(s) && /maxDuration = 300/.test(s) && !/get\('confirm'\)/.test(s) && /advanceAdsV2Order\(/.test(s) && /\.in\('status', \['generating', 'assembling'\]\)/.test(s)
})
await check('C3 status da tela chama o MESMO motor de avanço que o cron', /advanceAdsV2Order\(admin, order\.id/.test(cod('app/api/ads/v2/status/route.ts')))
const EV = makeLoader({})('lib/ads/events.ts')
// REANCORADO 29/09 (KINEO-ADS-MODO-SIMPLES-2026-09-29): + ads_v2_research_served (pesquisa do modo simples; conta o teto diário, então é só-servidor).
const NOVOS = ['ads_v2_order_created', 'ads_v2_plan_served', 'ads_v2_dry_run_served', 'ads_v2_started', 'ads_v2_retake_started', 'ads_v2_shot_retried', 'ads_v2_assembling', 'ads_v2_delivered', 'ads_v2_failed', 'ads_v2_research_served']
await check('E1 os 9 eventos do v2 estão em ADS_EVENTS, são só-servidor e estão no SERVER_ONLY_EVENTS do sink', () => {
  const sink = (rd('app/api/events/route.ts').match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\]\)/) || ['', ''])[1]
  return NOVOS.every((n) => EV.isAdsEvent(n) && EV.ADS_SERVER_ONLY_EVENTS.includes(n) && sink.includes(`'${n}'`))
})
await check('E2 todo evento gravado pelo código do v2 está na lista fechada (nenhum nome solto)', () => {
  // REANCORADO 29/09 (KINEO-ADS-MODO-SIMPLES-2026-09-29): + a rota de pesquisa do modo simples.
  const arquivos = ['lib/ads/v2Billing.ts', 'lib/ads/v2Advance.ts', 'app/api/ads/v2/orders/route.ts', 'app/api/ads/v2/plan/route.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/retake/route.ts', 'app/api/ads/v2/research/route.ts']
  const nomes = arquivos.flatMap((f) => [...cod(f).matchAll(/name: '([a-z0-9_]+)'/g)].map((m) => m[1]))
  return nomes.length >= 8 && nomes.every((n) => EV.isAdsEvent(n))
})
await check('E3 selo honesto: ads_v2 → Studio Ads; alarme da fal com a fonte "ads"', /ads_v2: 'Studio Ads'/.test(rd('lib/engineLabel.ts')) && /\| 'ads'\n/.test(rd('lib/falAlert.ts')))
await check('E4 carta genérica "seu vídeo ficou pronto" pula o anúncio v2 (filtro no JS; .neq derrubaria quality_mode nulo)', () => {
  const s = cod('app/api/cron/send-video-ready/route.ts')
  return /thumbnail_url, thumb_url, created_at, credits_used, duration, quality_mode'\)/.test(s) && /quality_mode === 'ads_v2'\) continue/.test(s) && !/\.neq\('quality_mode'/.test(s)
})
await check('E5 varredura genérica: a exclusão adsv2% mora DENTRO de sweepStuckRenderDebits', () => {
  const s = cod('lib/credits/refund.ts')
  const i = s.indexOf('export async function sweepStuckRenderDebits'); const j = s.indexOf('export', i + 10)
  return i > 0 && /\.not\('render_id', 'like', 'adsv2%'\)/.test(s.slice(i, j))
})
await check('E6 trava 8.2: nenhum arquivo do servidor v2 nasce em caminho travado', () => {
  const novos = ['lib/ads/v2Access.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2Shots.ts', 'lib/ads/v2Images.ts', 'lib/ads/v2Brief.ts', 'lib/ads/v2Link.ts', 'lib/ads/v2Server.ts', 'lib/ads/v2Advance.ts', 'app/api/ads/v2/orders/route.ts', 'app/api/ads/v2/plan/route.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/status/route.ts', 'app/api/ads/v2/retake/route.ts', 'app/api/cron/ads-v2-advance/route.ts',
    // REANCORADO 29/09 (KINEO-ADS-MODO-SIMPLES-2026-09-29): arquivos novos do modo simples, todos fora da trava 8.2.
    'app/api/ads/v2/research/route.ts', 'lib/ads/v2Research.ts', 'lib/ads/v2Simple.ts', 'lib/ads/v2VideoFrames.ts']
  return novos.every((p) => existsSync(join(RAIZ, p)) && !/^(lib\/compose|lib\/hollywood\/|lib\/cinematic\/|lib\/broll\/|lib\/lyriaMusic|lib\/narrationFit|app\/api\/analyze-idea\/|app\/api\/generate-script\/|app\/api\/generate-video-)/.test(p))
})
await check('E7 migration: as colunas que o servidor lê e escreve existem', () => {
  const sql = rd('migrations_pending/2026-09-29_ads_v2.sql')
  return ['photos jsonb', 'card_footage_id text', 'voice_seconds numeric', 'assembly_lease_at timestamptz', 'assembly_submit_at timestamptz', 'parent_order_id uuid', 'retake_idx integer', 'reason_class text', 'movement_variant integer', 'image_submit_claimed_at timestamptz', 'submit_claimed_at timestamptz', 'submitted_at timestamptz', 'fal_done_at timestamptz'].every((c) => sql.split(String.fromCharCode(10)).some((l) => l.trim().startsWith(c)))
})

console.log(`${ok} verdes, ${falhas.length} vermelhos`)
if (falhas.length) {
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
process.exit(0)
