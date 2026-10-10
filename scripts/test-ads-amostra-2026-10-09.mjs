// KINEO-ADS-AMOSTRA-2026-10-09 — guardião da AMOSTRA GRÁTIS do Studio Ads (decisão do fundador, 09/10: "tudo sim").
// Toda conta free/trial ganha UM anúncio grátis: nível photo_motion, 15 s, sem variações nem refação, sem cobrar crédito,
// com teto GLOBAL de 10 por dia UTC (o custo, ~US$ 2,20 de fal, é nosso). Assinante, passe e interna não mudam.
// Prova, EXECUTANDO o código real pelo carregador offline da casa (scripts/test-support/offline-ts-loader.mjs) contra um
// banco falso com filtros de verdade:
//   (1) o interruptor, o teto, o nível, o prefixo e a chave (mesma validação de UUID de adsV2BillingRef);
//   (2) quem ganha: só 'none' com o Studio Ads aberto e sem amostra começada/entregue; pago/passe/interna nunca; amostra que
//       FALHOU não conta; pedido pago 'adsv2-…' não conta; erro de leitura = fechado;
//   (3) o teto do dia: conta 'adssample-%' desde 00:00 UTC; erro ou contagem ilegível = teto atingido (fechado);
//   (4) a rota /api/ads/v2/start EXECUTADA: amostra trava com 'adssample-…', credits_charged 0, sem intenção/débito/saldo,
//       evento ads_sample_started; nível errado = 403 sample_level_only; teto = 429 sample_cap ANTES da trava; dry_run igual;
//       quem já usou = 403 no_access com rastro; assinante segue cobrado exatamente como antes; Studio Ads fechado = 403;
//   (5) failAdsV2Order EXECUTADO: chave de amostra vira failed SEM chamar o estorno; chave paga continua estornando;
//   (6) retake, variations, v1 e Produção continuam fechados (nenhum fala de amostra; a negação 'gate !== ok' intacta);
//   (7) as 5 frases nas 16 línguas da interface (as mesmas de INTERFACE_LANGUAGE_OPTIONS), não vazias e diferentes do inglês;
//   (8) a tela, a porta /ads e os eventos (lista fechada + sink só-servidor) — leitura;
//   (9) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Estilo readFileSync + ts.transpileModule (via offline-ts-loader). Nenhum import com alias @/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT) // o carregador offline resolve a partir do cwd
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
/** Comentários fora (linha // e bloco), sem varrer posição. */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
/** Índices crescentes: cada trecho aparece depois do anterior. */
const ordem = (src, ...marcas) => { let pos = -1; for (const m of marcas) { const i = src.indexOf(m, pos + 1); if (i < 0 || i <= pos) return false; pos = i } return true }
/** Troca com âncora única (split/join, nunca "$1"). */
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 70)); return src.split(de).join(para) }

const F = {
  sample: 'lib/ads/sample.ts',
  access: 'lib/ads/serverAccess.ts',
  billing: 'lib/ads/v2Billing.ts',
  advance: 'lib/ads/v2Advance.ts',
  start: 'app/api/ads/v2/start/route.ts',
  orders: 'app/api/ads/v2/orders/route.ts',
  plan: 'app/api/ads/v2/plan/route.ts',
  research: 'app/api/ads/v2/research/route.ts',
  retake: 'app/api/ads/v2/retake/route.ts',
  variations: 'app/api/ads/v2/variations/route.ts',
  page: 'app/(dashboard)/ads/v2/page.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  door: 'app/ads/page.tsx',
  events: 'lib/ads/events.ts',
  sink: 'app/api/events/route.ts',
  iface: 'lib/ui/interfaceLanguage.ts',
  newPage: 'app/(dashboard)/ads/new/page.tsx',
  producao: 'app/(dashboard)/ads/producao/page.tsx',
}

// ── banco falso: filtros de verdade (eq/like/in/is/gte), UPDATE condicional, contagem, falhas injetáveis ───────────────
const likeRe = (p) => new RegExp('^' + p.split('').map((c) => (c === '%' ? '.*' : c === '_' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('') + '$')
function fakeDb(tables, { failWhen = null } = {}) {
  const log = []
  const from = (name) => {
    tables[name] ??= []
    const st = { op: 'select', filters: [], desc: [], patch: null, rows: null, count: false, head: false, limit: null }
    const exec = (single) => {
      log.push({ name, op: st.op, desc: st.desc.join(' ') })
      if (failWhen && failWhen(name, st)) return Promise.resolve({ data: null, count: null, error: { code: 'XX000', message: 'falha injetada' } })
      if (st.op === 'insert' || st.op === 'upsert') {
        const rows = (Array.isArray(st.rows) ? st.rows : [st.rows]).map((r) => ({ id: r.id ?? `id-${tables[name].length + 1}`, ...r }))
        tables[name].push(...rows)
        return Promise.resolve({ data: single ? rows[0] : rows, error: null })
      }
      let rows = tables[name].filter((r) => st.filters.every((f) => f(r)))
      if (st.op === 'update') {
        for (const r of rows) Object.assign(r, st.patch)
      }
      if (st.limit !== null) rows = rows.slice(0, st.limit)
      if (st.count && st.head) return Promise.resolve({ data: null, count: rows.length, error: null })
      if (single) {
        if (rows.length > 1) return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'many' } })
        return Promise.resolve({ data: rows[0] ? { ...rows[0] } : null, error: null })
      }
      return Promise.resolve({ data: rows.map((r) => ({ ...r })), error: null })
    }
    const b = {
      select(_cols, o) { if (o && o.count) st.count = true; if (o && o.head) st.head = true; return b },
      eq(c, v) { st.desc.push(`eq:${c}`); st.filters.push((r) => r[c] === v); return b },
      like(c, p) { st.desc.push(`like:${c}:${p}`); st.filters.push((r) => typeof r[c] === 'string' && likeRe(p).test(r[c])); return b },
      in(c, vs) { st.desc.push(`in:${c}:${vs.join('|')}`); st.filters.push((r) => vs.includes(r[c])); return b },
      is(c, v) { st.desc.push(`is:${c}`); st.filters.push((r) => (r[c] ?? null) === v); return b },
      gte(c, v) { st.desc.push(`gte:${c}:${v}`); st.filters.push((r) => r[c] != null && String(r[c]) >= String(v)); return b },
      order() { return b },
      limit(n) { st.limit = n; return b },
      update(p) { st.op = 'update'; st.patch = p; return b },
      insert(rows) { st.op = 'insert'; st.rows = rows; return b },
      upsert(rows) { st.op = 'upsert'; st.rows = rows; return b },
      maybeSingle() { return exec(true) },
      then(res, rej) { return exec(false).then(res, rej) },
    }
    return b
  }
  return { from, __log: log }
}

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const USER = U(1)
const ORDER = U(2)
const GEN = U(3)
const FREE_EMAIL = 'dona.padaria@example.com'
const TODAY = new Date().toISOString()

// ── carregadores (fontes reais; `over` = mutantes por arquivo) ───────────────────────────────────────────────────────
function loaderWith({ db = null, over = {}, env = { NEXT_PUBLIC_ADS_PASS_LIVE: '1' }, mocks = {} } = {}) {
  return createOfflineLoader({
    env,
    mocks: { '@/lib/userFootage': { footageAdminClient: () => db }, ...mocks },
    source: (rel, text) => (over[rel] !== undefined ? over[rel] : text),
  })
}

// ═══ 1. o interruptor, o teto, o nível, a chave ══════════════════════════════════════════════════════════════════════
const S = loaderWith()(F.sample)
ok(S.ADS_SAMPLE_LIVE === true && S.ADS_SAMPLE_DAILY_CAP === 10 && S.ADS_SAMPLE_TIER === 'photo_motion' && S.ADS_SAMPLE_PREFIX === 'adssample-', '1a interruptor ligado, teto 10/dia, nível photo_motion, prefixo adssample-')
ok(S.adsSampleRef(ORDER.toUpperCase(), GEN) === `adssample-${ORDER}-${GEN}` && S.isAdsSampleRef(S.adsSampleRef(ORDER, GEN)), '1b chave = adssample-<order>-<generation> (minúscula) e é reconhecida')
ok((() => { try { S.adsSampleRef('x', GEN); return false } catch { return true } })() && (() => { try { S.adsSampleRef(ORDER, 'nao-uuid'); return false } catch { return true } })(), '1c ids que não são UUID: a chave recusa (mesma régua de adsV2BillingRef)')
ok(!S.isAdsSampleRef(`adsv2-${ORDER}-${GEN}`) && !S.isAdsSampleRef(null) && !S.isAdsSampleRef(undefined) && !S.isAdsSampleRef(`adsv2redo-${ORDER}`), '1d chave paga (adsv2-/adsv2redo-) e vazia NÃO são amostra')
ok(!S.ADS_SAMPLE_PREFIX.startsWith('adsv2') && /^\s*'adsv2%',/m.test(read('lib/credits/sweepScope.ts')), '1e o prefixo da amostra não começa com adsv2 (não há débito: nenhuma rede de estorno tem o que olhar)')
ok(!/^\s*import\s(?!type)/m.test(read(F.sample)) && !/\brequire\(/.test(code(read(F.sample))), '1f lib/ads/sample.ts é PURA (só import type) — pode ir ao cliente')

// ═══ 2-3. quem ganha e o teto (serverAccess EXECUTADO) ═══════════════════════════════════════════════════════════════
const sampleRow = (status, extra = {}) => ({ id: U(50 + Math.floor(Math.random() * 1000)), user_id: USER, billing_ref: `adssample-${U(9)}-${U(8)}`, status, started_at: TODAY, ...extra })
async function eligible(reason, rows = [], opts = {}) {
  const db = fakeDb({ ads_v2_orders: rows }, opts)
  const A = loaderWith({ db, over: opts.over, env: opts.env })(F.access)
  return { v: await A.adsSampleOpen(db, USER, reason), reads: db.__log.length }
}
await check('2a free/trial (reason none) sem amostra → ganha', async () => (await eligible('none')).v === true)
await check('2b assinante, passe e interna NUNCA entram pela amostra (e nem leem o banco)', async () => {
  for (const r of ['subscriber', 'pass', 'internal']) { const e = await eligible(r); if (e.v !== false || e.reads !== 0) return false }
  return true
})
await check('2c amostra começada (generating/assembling) ou entregue → não ganha outra', async () => {
  for (const st of ['generating', 'assembling', 'delivered']) if ((await eligible('none', [sampleRow(st)])).v !== false) return false
  return true
})
await check('2d amostra que FALHOU (culpa nossa) ou rascunho → ainda ganha', async () => (await eligible('none', [sampleRow('failed'), sampleRow('planned', { billing_ref: null })])).v === true)
await check('2e pedido PAGO entregue (adsv2-…) e amostra de OUTRA pessoa não contam', async () => (await eligible('none', [sampleRow('delivered', { billing_ref: `adsv2-${U(9)}-${U(8)}` }), sampleRow('delivered', { user_id: U(77) })])).v === true)
await check('2f leitura que falha = fechado', async () => (await eligible('none', [], { failWhen: (n) => n === 'ads_v2_orders' })).v === false)
await check('2g Studio Ads desligado (NEXT_PUBLIC_ADS_PASS_LIVE=0) = sem amostra (o desligado não é furado)', async () => (await eligible('none', [], { env: { NEXT_PUBLIC_ADS_PASS_LIVE: '0' } })).v === false)

async function capReached(rows, opts = {}) {
  const db = fakeDb({ ads_v2_orders: rows }, opts)
  const A = loaderWith({ db, over: opts.over })(F.access)
  return A.adsSampleCapReached(db)
}
const sampleStarted = (n, when = TODAY) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, user_id: U(100 + i), billing_ref: `adssample-${U(200 + i)}-${U(300 + i)}`, status: 'delivered', started_at: when }))
const yesterday = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) - 3600_000).toISOString()
await check('3a 9 amostras hoje → abre; 10 → teto', async () => (await capReached(sampleStarted(9))) === false && (await capReached(sampleStarted(10))) === true)
await check('3b só conta amostra (adssample-%) de HOJE (UTC): pagos e as de ontem não entram', async () => (await capReached([...sampleStarted(9), ...sampleStarted(5, yesterday), { id: 'p', billing_ref: `adsv2-${U(1)}-${U(2)}`, status: 'delivered', started_at: TODAY }])) === false)
await check('3c leitura que falha = teto atingido (fechado)', async () => (await capReached([], { failWhen: (n) => n === 'ads_v2_orders' })) === true)
await check('3d o dia começa 00:00 UTC', () => { const A = loaderWith()(F.access); return A.adsSampleDayStartIso(new Date('2026-10-09T23:59:00-03:00')) === '2026-10-10T00:00:00.000Z' && A.adsSampleDayStartIso(new Date('2026-10-09T12:00:00Z')) === '2026-10-09T00:00:00.000Z' })
await check('3e nível da amostra = photo_motion + 15 s, nada mais', () => { const A = loaderWith()(F.access); return A.adsSampleLevelOk('photo_motion', 15) && !A.adsSampleLevelOk('commercial', 15) && !A.adsSampleLevelOk('cinema', 15) && !A.adsSampleLevelOk('photo_motion', 30) && !A.adsSampleLevelOk(undefined, undefined) })

// ═══ 4. a rota /start EXECUTADA ══════════════════════════════════════════════════════════════════════════════════════
const PLAN = {
  shots: [
    { idx: 0, role: 'hook', kind: 'place', source: 'client_photo', cutSeconds: 3, prompt: 'slow push in', scenePrompt: null },
    { idx: 1, role: 'proof', kind: 'product', source: 'client_photo', cutSeconds: 3, prompt: 'orbit', scenePrompt: null },
    { idx: 2, role: 'text', kind: 'text', source: 'client_photo', cutSeconds: 2, prompt: '', scenePrompt: null },
  ],
  narration: 'Fresh bread every morning.',
  overlays: [{ role: 'hook', text: 'Fresh bread', start: 0 }],
  totalSeconds: 15,
}
function world({ plan = 'free', balance = 0, tier = 'photo_motion', seconds = 15, extraOrders = [], failWhen = null } = {}) {
  return {
    profiles: [{ id: USER, plan, ads_access_until: null, video_credits: balance }],
    ads_v2_orders: [{ id: ORDER, user_id: USER, status: 'planned', tier, seconds, plan: JSON.parse(JSON.stringify(PLAN)), card_url: 'https://sb/card.png', billing_ref: null, credits_charged: 0, started_at: null }, ...extraOrders],
    ads_v2_shots: [],
    credit_debits: [],
    videos: [],
    __failWhen: failWhen,
  }
}
async function runStart(tables, { body = { order_id: ORDER }, email = FREE_EMAIL, over = {}, env } = {}) {
  const failWhen = tables.__failWhen
  delete tables.__failWhen
  const db = fakeDb(tables, { failWhen })
  const events = []
  const money = { intent: [], debit: [], refund: [] }
  const dispatched = []
  const load = loaderWith({
    db,
    over,
    env,
    mocks: {
      'next/server': {},
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: USER, email } } }) } }) },
      '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
      '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
      '@/lib/ads/v2Access': { adsV2Visible: () => true },
      '@/lib/credits/renderIntent': { recordRenderIntent: async (a) => { money.intent.push(a); return true } },
      '@/lib/credits/debit': { debitVideoCredits: async (_db, a) => { money.debit.push(a); tables.credit_debits.push({ render_id: a.renderId, user_id: a.userId, amount: a.cost, refunded_at: null }); tables.profiles[0].video_credits -= a.cost; return { data: tables.profiles[0].video_credits, error: null } } },
      '@/lib/credits/refund': { refundRenderCredits: async (ref) => { money.refund.push(ref); return 0 } },
      '@/lib/ads/v2Advance': {
        loadAdsV2Order: async (_a, id, uid) => { const o = tables.ads_v2_orders.find((x) => x.id === id && (!uid || x.user_id === uid)); return { order: o ? JSON.parse(JSON.stringify(o)) : null, error: null } },
        loadAdsV2Shots: async (_a, id) => tables.ads_v2_shots.filter((s) => s.order_id === id),
        buildInitialShotRows: (orderId, _tier, plan) => plan.shots.map((s) => ({ order_id: orderId, idx: s.idx, attempt: 1, kind: s.kind, status: s.kind === 'text' ? 'skipped_text' : 'pending' })),
        dispatchAdsV2Shots: async (_a, order) => { dispatched.push({ id: order.id, status: order.status, billing_ref: order.billing_ref }); return 0 },
        adsV2View: (o, shots) => ({ order_id: o.id, status: o.status, credits: o.credits_charged, shots }),
      },
      '@/lib/ads/v2Server': { v2Json: (body, status = 200) => ({ status, body }), v2Fail: (error, status, extra = {}) => ({ status, body: { error, ...extra } }) },
    },
  })
  const route = load(F.start)
  const res = await route.POST({ json: async () => body })
  return { res, events, money, dispatched, order: tables.ads_v2_orders.find((o) => o.id === ORDER), tables }
}
const evNames = (r) => r.events.map((e) => e.name)

const amostraOk = (r) => r.res.status === 202 && r.order.status === 'generating' && typeof r.order.billing_ref === 'string' && r.order.billing_ref.startsWith('adssample-') &&
  r.order.billing_ref.endsWith(r.order.generation_id) && r.order.credits_charged === 0 && r.money.intent.length === 0 && r.money.debit.length === 0 &&
  r.tables.profiles[0].video_credits === 0 && r.tables.ads_v2_shots.length === PLAN.shots.length && r.dispatched.length === 1 && r.dispatched[0].billing_ref === r.order.billing_ref &&
  evNames(r).includes('ads_sample_started') && !evNames(r).includes('ads_access_denied') &&
  r.events.find((e) => e.name === 'ads_v2_started')?.metadata?.credits === 0 && r.events.find((e) => e.name === 'ads_v2_started')?.metadata?.sample === true
await check('4a conta free com 0 crédito: a amostra trava com adssample-…, credits_charged 0, sem intenção/débito/saldo, planos e envio como o pago, evento ads_sample_started', async () => amostraOk(await runStart(world())))
await check('4b nível errado (commercial) ou duração errada → 403 sample_level_only, pedido intocado', async () => {
  const a = await runStart(world({ tier: 'commercial' }))
  const b = await runStart(world({ seconds: 30 }))
  return [a, b].every((r) => r.res.status === 403 && r.res.body.error === 'sample_level_only' && r.order.status === 'planned' && r.order.billing_ref === null && r.dispatched.length === 0)
})
await check('4c teto do dia atingido → 429 sample_cap ANTES da trava (pedido segue planned, nada enviado)', async () => {
  const r = await runStart(world({ extraOrders: sampleStarted(10) }))
  return r.res.status === 429 && r.res.body.error === 'sample_cap' && r.order.status === 'planned' && r.dispatched.length === 0 && !evNames(r).includes('ads_sample_started')
})
await check('4d leitura do teto falha → 429 (fechado), nada enviado', async () => {
  const r = await runStart(world({ failWhen: (n, st) => n === 'ads_v2_orders' && st.count }))
  return r.res.status === 429 && r.order.status === 'planned' && r.dispatched.length === 0
})
await check('4e dry_run da amostra: plano e custo de lista, charged:false, sem trava, sem teto lido', async () => {
  const r = await runStart(world({ extraOrders: sampleStarted(10) }), { body: { order_id: ORDER, dry_run: true } })
  return r.res.status === 200 && r.res.body.dry_run === true && r.res.body.charged === false && r.order.status === 'planned' && r.dispatched.length === 0
})
await check('4f quem já usou a amostra → 403 no_access com rastro ads_access_denied (como antes)', async () => {
  const r = await runStart(world({ extraOrders: [sampleRow('delivered', { id: U(60) })] }))
  return r.res.status === 403 && r.res.body.error === 'no_access' && evNames(r).includes('ads_access_denied') && r.order.status === 'planned'
})
await check('4g assinante: o caminho pago é o de antes (chave adsv2-…, débito confirmado, credits_charged = custo), nenhum evento de amostra', async () => {
  const r = await runStart(world({ plan: 'starter', balance: 200, tier: 'commercial' }))
  return r.res.status === 202 && r.order.billing_ref.startsWith('adsv2-') && r.order.credits_charged === 41 && r.money.intent.length === 1 && r.money.debit.length === 1 &&
    r.tables.profiles[0].video_credits === 159 && !evNames(r).includes('ads_sample_started') && r.events.find((e) => e.name === 'ads_v2_started')?.metadata?.credits === 41
})
await check('4h assinante sem saldo → 402 out_of_credits (o saldo segue conferido para quem paga)', async () => {
  const r = await runStart(world({ plan: 'starter', balance: 0 }))
  return r.res.status === 402 && r.res.body.error === 'out_of_credits' && r.order.status === 'planned'
})
await check('4i Studio Ads desligado → a conta free não ganha amostra (403)', async () => {
  const r = await runStart(world(), { env: { NEXT_PUBLIC_ADS_PASS_LIVE: '0' } })
  return r.res.status === 403 && r.order.status === 'planned'
})
const START = code(read(F.start))
ok(ordem(START, 'auth.getUser()', 'adsGate(', 'adsSampleOpen(', "'v2_closed'", "'sample_level_only'", 'moderateContent(', 'if (dryRun)', 'adsSampleCapReached(', "update({ status: 'generating'", 'chargeAdsV2(', "'ads_sample_started'", 'buildInitialShotRows(', 'dispatchAdsV2Shots('),
  '4j ordem no arquivo: gate → amostra → v2 → nível → moderação → dry_run → TETO → trava → (sem) débito → evento → planos → envio')
ok((START.match(/chargeAdsV2\(/g) || []).length === 1 && /sampleRun \? \{ ok: true, balance: null \} : await chargeAdsV2\(/.test(START) && /credits_charged: sampleRun \? 0 : cost/.test(START) && /sampleRun \? adsSampleRef\(orderId, generationId\) : adsV2BillingRef\(orderId, generationId\)/.test(START),
  '4k um só chargeAdsV2 no arquivo; a amostra não o chama, trava com credits_charged 0 e chave adssample-')

// ═══ 5. failAdsV2Order EXECUTADO ═════════════════════════════════════════════════════════════════════════════════════
async function runFail(ref, over = {}) {
  const tables = { ads_v2_orders: [{ id: ORDER, user_id: USER, status: 'generating', billing_ref: ref, video_id: null }], videos: [], credit_debits: ref.startsWith('adsv2-') ? [{ render_id: ref, user_id: USER, amount: 34, refunded_at: null }] : [] }
  const db = fakeDb(tables)
  const events = []
  const refunds = []
  const B = loaderWith({ db, over, mocks: {
    '@/lib/credits/renderIntent': { recordRenderIntent: async () => true },
    '@/lib/credits/debit': { debitVideoCredits: async () => ({ data: 0, error: null }) },
    '@/lib/credits/refund': { refundRenderCredits: async (r) => { refunds.push(r); const d = tables.credit_debits.find((x) => x.render_id === r); if (d) d.refunded_at = TODAY; return d ? d.amount : 0 } },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
  } })(F.billing)
  const out = await B.failAdsV2Order(db, { id: ORDER, user_id: USER, billing_ref: ref, credits_charged: ref.startsWith('adsv2-') ? 34 : 0 }, 'order_timeout')
  return { out, refunds, events, order: tables.ads_v2_orders[0] }
}
await check('5a amostra que falha: vira failed, evento ads_v2_failed {refund:skipped, sample:true}, e o estorno NUNCA é chamado', async () => {
  const r = await runFail(`adssample-${ORDER}-${GEN}`)
  const ev = r.events.find((e) => e.name === 'ads_v2_failed')
  return r.out.won === true && r.out.refund === 'skipped' && r.out.amount === 0 && r.refunds.length === 0 && r.order.status === 'failed' && ev && ev.metadata.refund === 'skipped' && ev.metadata.sample === true
})
await check('5b pedido pago que falha: continua estornando (refunded, 34)', async () => {
  const r = await runFail(`adsv2-${ORDER}-${GEN}`)
  return r.out.won === true && r.out.refund === 'refunded' && r.out.amount === 34 && r.refunds.length === 1 && r.events.find((e) => e.name === 'ads_v2_failed')?.metadata?.sample === false
})
const ADV = code(read(F.advance))
ok(/isAdsSampleRef\(order\.billing_ref\) && order\.credits_charged === 0\s*\?\s*\(\{ ok: true, refunded: false, amount: 0 \} as const\)/.test(ADV) && ordem(ADV, 'isAdsSampleRef(order.billing_ref) && order.credits_charged === 0', 'confirmAdsV2Debit(admin', "'rows_missing_debit_unconfirmed'"),
  '5c avanço: linhas faltando de uma amostra (sem débito para conferir) são recriadas como no pago, sem falhar o pedido')
ok(/render_id: order\.billing_ref/.test(ADV) && /quality_mode: ADS_V2_QUALITY/.test(ADV), '5d entrega: videos.render_id = billing_ref (adssample-… também) e quality_mode ads_v2 (selo Studio Ads, cartas genéricas puladas)')

// ═══ 6. o que continua FECHADO ═══════════════════════════════════════════════════════════════════════════════════════
const fechado = (src) => !/adsSample|ADS_SAMPLE|sample/i.test(code(src)) && /if \(gate !== 'ok'\) \{/.test(code(src))
ok(fechado(read(F.retake)), '6a /api/ads/v2/retake: nenhuma amostra, a negação gate !== ok intacta')
ok(fechado(read(F.variations)), '6b /api/ads/v2/variations: nenhuma amostra, a negação gate !== ok intacta')
ok(!/adsSample|ADS_SAMPLE/.test(code(read(F.newPage))) && (!fs.existsSync(path.join(ROOT, F.producao)) || !/adsSample|ADS_SAMPLE/.test(code(read(F.producao)))), '6c v1 (/ads/new) e Produção não abrem pela amostra')
for (const [nome, rel] of [['orders', F.orders], ['plan', F.plan], ['research', F.research]]) {
  const s = code(read(rel))
  // KINEO-EQUIPE-BUSINESS-2026-10-10 — re-ancorado: a amostra pergunta pela elegibilidade do DONO do workspace (uid = ws.ownerId; sem equipe, o próprio user.id).
  ok(/const sample = gate === 'no_access' && await adsSampleOpen\(admin, uid, reason\)/.test(s) && /const uid: string = ws\.ownerId \?\? user\.id/.test(s) && /if \(gate !== 'ok' && !sample\) \{/.test(s), `6d /api/ads/v2/${nome}: abre só pela amostra (gate no_access + adsSampleOpen); o resto nega como antes`)
}
ok(/if \(gate !== 'ok' && sample && !adsSampleLevelOk\(o\.tier, o\.seconds\)\) return v2Fail\('sample_level_only', 403\)/.test(code(read(F.orders))) && /if \(gate !== 'ok' && sample && !adsSampleLevelOk\(order\.tier, order\.seconds\)\) return v2Fail\('sample_level_only', 403\)/.test(code(read(F.plan))),
  '6e rascunho e plano da amostra só no nível/duração dela (403 sample_level_only)')
const PAGE = code(read(F.page))
// KINEO-EQUIPE-BUSINESS-2026-10-10 — re-ancorado: a página pergunta pela amostra do DONO do workspace (uid).
ok(/const sample = gate === 'no_access' && \(await adsSampleOpen\(admin, uid, reason\)\)/.test(PAGE) && /const uid: string = ws\.ownerId \?\? user\.id/.test(PAGE) && ordem(PAGE, "if (gate !== 'ok') {", 'if (!sample) {', "name: 'ads_access_denied'", "redirect('/ads?from=v2')") &&
  /variations=\{sample \? false : adsVariationsVisible\(user\.email\)\}/.test(PAGE) && /producao=\{!sample && producaoVisibleFor\(/.test(PAGE) && /sample=\{sample\}/.test(PAGE),
  '6f página /ads/v2: amostra entra sem rastro de negação, sem 3 variações e sem Produção; quem não tem amostra é negado como antes')

// ═══ 7. as frases nas 16 línguas ═════════════════════════════════════════════════════════════════════════════════════
const IFACE = loaderWith()(F.iface)
const LANGS = IFACE.INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code)
const KEYS = ['badge', 'make', 'note', 'paidOnly', 'cap']
const copyOk = (C) => LANGS.length === 16 && Object.keys(C).length === 16 && LANGS.every((l) => C[l] && KEYS.every((k) => typeof C[l][k] === 'string' && C[l][k].trim().length > 0)) &&
  LANGS.filter((l) => l !== 'en').every((l) => KEYS.filter((k) => C[l][k] === C.en[k]).length === 0)
ok(copyOk(S.ADS_SAMPLE_COPY), '7a as 5 frases existem nas 16 línguas da interface, escritas (nenhuma cópia do inglês)')
ok(S.ADS_SAMPLE_COPY.en.badge === 'Your first ad is free' && S.ADS_SAMPLE_COPY.en.make === 'Make my free ad' && /1 per account, Photo motion level, 15 s/.test(S.ADS_SAMPLE_COPY.en.note) && S.adsSampleCopy('xx') === S.ADS_SAMPLE_COPY.en && S.adsSampleCopy('pt') === S.ADS_SAMPLE_COPY.pt,
  '7b o inglês é o da decisão; língua desconhecida cai no inglês')

// ═══ 8. tela, porta e eventos (leitura) ══════════════════════════════════════════════════════════════════════════════
const SIMPLE = code(read(F.simple))
const CLIENT = code(read(F.client))
const telaOk = (src, nome) => /const sampleOff = !!scopy && t !== ADS_SAMPLE_TIER/.test(src) && /disabled=\{locked \|\| sampleOff\}/.test(src) && /scopy \? \(sampleOff \? scopy\.paidOnly : scopy\.badge\)/.test(src) &&
  /r\.code === 'sample_cap'/.test(src) && /scopy && sampleCap \?/.test(src) && /href="\/pricing"/.test(src) && /sample \? sample\.make :/.test(src) && (nome === 'client' ? /const short = scopy \? 0 :/.test(src) : /const need = scopy \? 0 :/.test(src) && /const short = scopy \? 0 :/.test(src))
ok(telaOk(SIMPLE, 'simple') && /sample=\{scopy\}/.test(SIMPLE) && /useState<AdsV2Tier \| null>\(sample \? ADS_SAMPLE_TIER : null\)/.test(SIMPLE) && /\{scopy \? null : <a className="adsw-btn ghost small" href=/.test(SIMPLE),
  '8a modo simples: só o nível da amostra, selo no lugar do preço, nada de "faltam créditos", botão grátis, aviso do teto com /pricing, sem refação')
ok(telaOk(CLIENT, 'client') && /redo=\{scopy \? undefined :/.test(CLIENT) && /sample=\{sample\}/.test(CLIENT) && /!sample && classicCredits !== null && mode === 'full' \?/.test(CLIENT),
  '8b modo completo: as mesmas regras, sem refação e sem o atalho do clássico pago')
const DOOR = code(read(F.door))
ok(/const SAMPLE_SIGNUP_HREF = `\/signup\?redirect=\$\{encodeURIComponent\('\/ads\/v2'\)\}`/.test(DOOR) && /!ADS_SAMPLE_LIVE \|\| !live \|\| !ADS_V2_PUBLIC/.test(DOOR) &&
  /viewer\.signedIn && viewer\.gate === 'no_access' && viewer\.userId/.test(DOOR) && /withTimeout\(adsSampleOpen\(footageAdminClient\(\), viewer\.userId, 'none'\), false\)/.test(DOOR) && /!viewer\.signedIn && viewer\.noSession/.test(DOOR) &&
  ordem(DOOR, '{sampleHref ? (', 'Make your first ad free', '{paywallOffer ? (', '<header className="ads-hero">'),
  '8c porta /ads: o botão "Make your first ad free" vem ANTES da oferta paga; logado elegível → /ads/v2, anônimo confirmado → cadastro que volta ao /ads/v2; timeout = sem botão')
// As fotos da amostra: /api/footage abre SÓ para purpose 'ads' + amostra aberta, só imagem (pedido e bytes), com teto próprio.
const footageOk = (raw) => {
  const s = code(raw)
  // KINEO-EQUIPE-BUSINESS-2026-10-10 — re-ancorado: o membro da equipe Business (teamOwnerId) nunca passa pela amostra e usa o plano/cota/pasta do dono (folderId).
  return /if \(!teamOwnerId && !entitlement\.treatAsPaid && body\.purpose === 'ads' && \(body\.action === 'upload-url' \|\| body\.action === 'confirm'\)\) \{/.test(s) &&
    /sampleUpload = adsGate\(acc\.reason\) === 'no_access' && \(await adsSampleOpen\(acc\.admin, user\.id, acc\.reason\)\)/.test(s) &&
    /\} catch \{\n\s*sampleUpload = false\n\s*\}/.test(s) &&
    /if \(!entitlement\.treatAsPaid && !sampleUpload && !teamOwnerId\) \{/.test(s) &&
    /if \(sampleUpload && !contentType\.startsWith\('image\/'\)\) \{/.test(s) &&
    /if \(sampleUpload && used \+ sizeBytes > ADS_SAMPLE_FOOTAGE_MAX_BYTES\) \{/.test(s) &&
    /if \(sampleUpload && kind !== 'image'\) return NextResponse\.json\(/.test(s) &&
    ordem(s, "body.purpose === 'ads'", 'if (!entitlement.treatAsPaid && !sampleUpload && !teamOwnerId) {', "if (body.action === 'upload-url') {", "if (sampleUpload && !contentType.startsWith('image/'))", 'const used = await totalFootageBytes(folderId)', 'if (sampleUpload && used + sizeBytes > ADS_SAMPLE_FOOTAGE_MAX_BYTES)', "if (body.action === 'confirm') {", "if (sampleUpload && kind !== 'image')", 'moderateContent(')
}
const FOOT = read('app/api/footage/route.ts')
ok(footageOk(FOOT) && S.ADS_SAMPLE_FOOTAGE_MAX_BYTES === 60 * 1024 * 1024, '8e /api/footage: free com amostra aberta sobe FOTO pelo montador (purpose ads), teto de 60 MB; vídeo/áudio e o resto seguem pagos; erro = fechado; a moderação continua')
ok((read('lib/ads/uploadFootage.ts').match(/purpose: 'ads'/g) || []).length === 2, '8f o upload do montador marca purpose ads nos dois passos (upload-url e confirm)')
{
  const m = trocar(FOOT, "      if (sampleUpload && !contentType.startsWith('image/')) {", '      if (false) {')
  ok(m.includes('if (false) {') && !footageOk(m), '9 mutante: amostra subindo vídeo fica vermelho')
  const m2 = trocar(FOOT, '    if (!entitlement.treatAsPaid && !sampleUpload && !teamOwnerId) {', '    if (false) {') // KINEO-EQUIPE-BUSINESS-2026-10-10 — re-ancorado: + !teamOwnerId
  ok(m2.includes('if (false) {') && !footageOk(m2), '9 mutante: /api/footage sem a parede do pago fica vermelho')
}
const EV = loaderWith()(F.events)
const sinkSet = (read(F.sink).match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\]\)/) || ['', ''])[1]
ok(EV.isAdsEvent('ads_sample_started') && EV.ADS_SERVER_ONLY_EVENTS.includes('ads_sample_started') && sinkSet.includes("'ads_sample_started'"), '8d ads_sample_started: lista fechada, só-servidor, e o sink do navegador recusa')

// ═══ 9. mutantes (cada um prova que aplicou e fica vermelho) ═════════════════════════════════════════════════════════
const SRC = { sample: read(F.sample), access: read(F.access), start: read(F.start), billing: read(F.billing) }
async function mutante(nome, rel, de, para, ficaVermelho) {
  const src = SRC[rel] ?? read(rel)
  const m = trocar(src, de, para)
  const aplicou = m !== src && m.includes(para)
  const fileRel = F[rel] ?? rel
  let vermelho = false
  try { vermelho = !(await ficaVermelho({ [fileRel]: m })) } catch { vermelho = true }
  ok(aplicou && vermelho, `9 mutante: ${nome} fica vermelho`)
}
await mutante('interruptor desligado (ADS_SAMPLE_LIVE = false) some com a amostra', 'sample', 'export const ADS_SAMPLE_LIVE = true', 'export const ADS_SAMPLE_LIVE = false',
  async (over) => amostraOk(await runStart(world(), { over })))
await mutante('leitura que falha virando "pode"', 'access', '    if (error) return false\n    return Array.isArray(data) && data.length === 0', '    if (error) return true\n    return Array.isArray(data) && data.length === 0',
  async (over) => (await eligible('none', [], { failWhen: (n) => n === 'ads_v2_orders', over })).v === false)
await mutante('amostra usada sem o filtro de status (falhou = usou)', 'access', "      .in('status', ['generating', 'assembling', 'delivered'])\n      .limit(1)", '      .limit(1)',
  async (over) => (await eligible('none', [sampleRow('failed')], { over })).v === true)
await mutante('teto que falha virando "aberto"', 'access', "    if (error || typeof count !== 'number') return true", "    if (error || typeof count !== 'number') return false",
  async (over) => (await capReached([], { failWhen: (n) => n === 'ads_v2_orders', over })) === true)
await mutante('/start sem a checagem do teto', 'start', "      if (await adsSampleCapReached(admin)) return v2Fail('sample_cap', 429)\n", '',
  async (over) => (await runStart(world({ extraOrders: sampleStarted(10) }), { over })).res.status === 429)
await mutante('/start cobrando a amostra (credits_charged = custo)', 'start', 'credits_charged: sampleRun ? 0 : cost', 'credits_charged: cost',
  async (over) => amostraOk(await runStart(world(), { over })))
await mutante('/start chamando o débito na amostra', 'start', 'sampleRun ? { ok: true, balance: null } : await chargeAdsV2(', 'await chargeAdsV2(',
  async (over) => amostraOk(await runStart(world(), { over })))
await mutante('/start sem forçar o nível da amostra', 'start', "    if (sampleRun && !adsSampleLevelOk(order.tier, order.seconds)) return v2Fail('sample_level_only', 403)\n", '',
  async (over) => (await runStart(world({ tier: 'cinema' }), { over })).res.status === 403)
await mutante('failAdsV2Order estornando chave de amostra', 'billing', 'if (order.billing_ref && !isAdsSampleRef(order.billing_ref)) {', 'if (order.billing_ref) {',
  async (over) => { const r = await runFail(`adssample-${ORDER}-${GEN}`, over); return r.refunds.length === 0 && r.out.refund === 'skipped' })
await mutante('frase faltando numa língua', 'sample', "    cap: 'Contoh gratis hari ini sudah habis. Kembali besok atau pilih paket.',\n", '',
  async (over) => copyOk(loaderWith({ over })(F.sample).ADS_SAMPLE_COPY))
await mutante('língua copiada do inglês', 'sample', "    make: 'Buat iklan gratisku',", "    make: 'Make my free ad',",
  async (over) => copyOk(loaderWith({ over })(F.sample).ADS_SAMPLE_COPY))
{
  const m = trocar(read(F.retake), "    if (gate !== 'ok') {", "    const sample = gate === 'no_access' && await adsSampleOpen(admin, user.id, reason)\n    if (gate !== 'ok' && !sample) {")
  ok(m.includes('adsSampleOpen') && !fechado(m), '9 mutante: /retake abrindo pela amostra fica vermelho')
}
{
  const m = trocar(read(F.door), "{sampleHref ? (", '{false ? (')
  ok(m.includes('{false ? (') && !ordem(code(m), '{sampleHref ? (', 'Make your first ad free', '{paywallOffer ? ('), '9 mutante: porta sem o botão da amostra fica vermelho')
}

console.log(`\ntest-ads-amostra-2026-10-09: ${pass} ok · ${fail} falhas`)
if (fail) process.exit(1)
