// KINEO-ADS-3-VARIACOES-2026-09-30 — guardião das "3 variações" do anúncio v2 (Studio Ads).
// Roda com `node scripts/test-ads-3-variacoes-2026-09-30.mjs`, sem rede e sem banco. Nenhum import com alias '@/' é
// executado pelo Node: a lib pura (lib/ads/v2Variations.ts) é importada crua; a ROTA /api/ads/v2/variations e a cobrança
// REAL (lib/ads/v2Billing.ts) são transpiladas com o typescript do repo e rodadas contra um BANCO FALSO com ledger de
// verdade (débito idempotente pela chave, estorno uma vez só) — o padrão de scripts/test-ads-v2-servidor-2026-09-28.mjs.
//
// O que fica provado:
//   1. interruptor: ADS_VARIACOES_PUBLIC = true (decisão do fundador 30/09, "preço aprovado"); desligado, conta de fora
//      recebe 404 da rota e NADA é cobrado nem gravado;
//   2. preço = 2,5 × o nível arredondado para cima (85/103/128), a MESMA função na tela e no servidor;
//   3. débito ÚNICO antes de qualquer envio: 3 linhas no ledger somando o preço do grupo, uma por variação;
//   4. estorno PROPORCIONAL (só a parte da variação que falhou) e idempotente (a 2ª falha não devolve de novo);
//   5. 3 pedidos no grupo, looks distintos e determinísticos (e sem número/promessa inventada);
//   6. a mesma pessoa nas 3 (still da A como última referência de B/C) — decisão pura + ordem no v2Advance;
//   7. sem variações = comportamento de hoje (o plano de planShots bate com a base 57c9ee90; /start e /plan intocados).
// MUTANTES (aplicados e revertidos à mão no relatório): débito ×3, estorno total quando só 1 falha, mesmo look nas 3.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const cod = (p) => semComentarios(rd(p))
const imp = (p) => import(pathToFileURL(join(RAIZ, p)).href)
let ok = 0
const falhas = []
const check = async (nome, condicao) => {
  let v = false
  try { v = typeof condicao === 'function' ? !!(await condicao()) : !!condicao } catch (e) { falhas.push(`${nome} (lançou: ${e.message})`); return }
  if (v) ok++; else falhas.push(nome)
}
const ordem = (src, ...marcas) => {
  let pos = -1
  for (const m of marcas) {
    const i = src.indexOf(m, pos + 1)
    if (i < 0 || i <= pos) return false
    pos = i
  }
  return true
}
const sha = (s) => createHash('sha256').update(s).digest('hex')

const P = {
  lib: 'lib/ads/v2Variations.ts',
  access: 'lib/ads/v2VariationsAccess.ts',
  route: 'app/api/ads/v2/variations/route.ts',
  advance: 'lib/ads/v2Advance.ts',
  billing: 'lib/ads/v2Billing.ts',
  retake: 'app/api/ads/v2/retake/route.ts',
  start: 'app/api/ads/v2/start/route.ts',
  plan: 'app/api/ads/v2/plan/route.ts',
  board: 'app/(dashboard)/ads/v2/AdsV2Variations.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  page: 'app/(dashboard)/ads/v2/page.tsx',
  sql: 'migrations_pending/2026-09-30_ads_v2_variacoes.sql',
  decisions: 'docs/DECISIONS.md',
}
const V = await imp(P.lib)
const T = await imp('lib/ads/v2Tiers.ts')
const S = await imp('lib/ads/v2ShotLists.ts')

// ═══ 0. pureza e trava 8.2 ═══════════════════════════════════════════════════════════════════════════════════════════
const TRAVA = /^(lib\/compose|lib\/hollywood\/|lib\/cinematic\/|lib\/broll\/|lib\/lyriaMusic|lib\/narrationFit|app\/api\/analyze-idea\/|app\/api\/generate-script\/|app\/api\/generate-video-)/
await check('0a lib/ads/v2Variations.ts é pura (nenhum import/require)', !/^\s*import\s/m.test(rd(P.lib)) && !/\brequire\(/.test(cod(P.lib)))
await check('0b nenhum arquivo desta entrega mora na trava 8.2', Object.values(P).every((p) => !TRAVA.test(p)))
await check('0c espelhos: ADS_V2_VARIATION_KEEP_PHRASE = ADS_V2_KEEP_PHRASE (v2ShotLists) e ADS_V2_VARIATION_IDENTITY = IDENTITY_INSTRUCTION (imageReference)', () => {
  const idm = rd('lib/imageReference.ts').match(/export const IDENTITY_INSTRUCTION = '([^']+)'/)
  return V.ADS_V2_VARIATION_KEEP_PHRASE === S.ADS_V2_KEEP_PHRASE && !!idm && idm[1] === V.ADS_V2_VARIATION_IDENTITY && V.ADS_V2_SAME_PERSON_LINE.includes(V.ADS_V2_VARIATION_IDENTITY)
})

// ═══ 1. interruptor ══════════════════════════════════════════════════════════════════════════════════════════════════
// Decisão do fundador (30/09, "preço aprovado"): nasce ABERTO. Voltar a false = só contas da casa (o resto deste guardião
// prova que desligado a conta de fora recebe 404 sem cobrança).
await check('I1 ADS_VARIACOES_PUBLIC = true (decisão do fundador 30/09: "preço aprovado") — um literal só', V.ADS_VARIACOES_PUBLIC === true && (rd(P.lib).match(/export const ADS_VARIACOES_PUBLIC\b/g) || []).length === 1 && /export const ADS_VARIACOES_PUBLIC = true\b/.test(rd(P.lib)))
await check('I2 adsVariationsVisibleFor: desligado + conta de fora = false; desligado + casa = true; ligado = true', !V.adsVariationsVisibleFor(false, false) && V.adsVariationsVisibleFor(false, true) && V.adsVariationsVisibleFor(true, false))
await check('I3 v2VariationsAccess compõe o interruptor com a lista EXATA da casa (isAdsInternalEmail)', /return adsVariationsVisibleFor\(ADS_VARIACOES_PUBLIC, isAdsInternalEmail\(email\)\)/.test(cod(P.access)))
// KINEO-ADS-AMOSTRA-2026-10-09 — re-ancorado: quem entra pela amostra grátis (sample) NUNCA vê "3 variações"; o resto segue
// decidido por adsVariationsVisible com o e-mail verificado.
await check('I4 a página só liga a opção para quem passa em adsVariationsVisible (e-mail verificado do getUser)', /variations=\{sample \? false : adsVariationsVisible\(user\.email\)\}/.test(cod(P.page)))
await check('I5 rota: interruptor ANTES de qualquer leitura de saldo, grupo ou débito (404 not_found)', () => {
  const src = cod(P.route)
  const post = src.slice(src.indexOf('export async function POST'))
  return ordem(post, "if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)", "if (!adsVariationsVisible(user.email)) return v2Fail('not_found', 404)", "from('profiles')", "from('ads_v2_variation_groups')", 'chargeVariationGroup(') &&
    /if \(!adsVariationsVisible\(user\.email\)\) return v2Fail\('not_found', 404\)/.test(src.slice(src.indexOf('export async function GET'), src.indexOf('export async function POST')))
})
await check('I6 DECISIONS.md registra a decisão com a frase literal do fundador', /2026-09-30 — Studio Ads: "3 variações"/.test(rd(P.decisions)) && /"preço aprovado"/.test(rd(P.decisions)))

// ═══ 2. preço ════════════════════════════════════════════════════════════════════════════════════════════════════════
const TIERS = ['photo_motion', 'commercial', 'cinema']
await check('P1 2,5 × o nível: 34→85 · 41→103 · 51→128 (15 s)', V.adsV2VariationCredits(34) === 85 && V.adsV2VariationCredits(41) === 103 && V.adsV2VariationCredits(51) === 128)
await check('P2 para todo nível e duração: = ceil(preço × 2,5) sobre adsV2Credits (a função que o /start cobra)', TIERS.every((t) => T.ADS_V2_SECONDS.every((s) => { const one = T.adsV2Credits(t, s); return V.adsV2VariationCredits(one) === Math.ceil(one * 2.5) && V.adsV2VariationCredits(one) >= one * 2.5 })))
await check('P3 recusa preço inválido (0, negativo, fração)', [0, -3, 3.5].every((x) => { try { V.adsV2VariationCredits(x); return false } catch { return true } }))
await check('P4 partes: somam EXATAMENTE o preço do grupo, diferem no máximo 1, todas positivas (85=29+28+28 · 103=35+34+34 · 128=43+43+42)', () => {
  const okFix = JSON.stringify(V.adsV2VariationShares(85)) === '[29,28,28]' && JSON.stringify(V.adsV2VariationShares(103)) === '[35,34,34]' && JSON.stringify(V.adsV2VariationShares(128)) === '[43,43,42]'
  const all = TIERS.flatMap((t) => T.ADS_V2_SECONDS.map((s) => V.adsV2VariationCredits(T.adsV2Credits(t, s))))
  return okFix && all.every((tot) => { const sh = V.adsV2VariationShares(tot); return sh.length === 3 && sh.reduce((a, b) => a + b, 0) === tot && Math.max(...sh) - Math.min(...sh) <= 1 && sh.every((x) => x > 0) })
})
await check('P5 tela e servidor usam a MESMA função: a tela mostra variationsPrice(cost) = adsV2VariationCredits; a rota cobra adsV2VariationCredits(adsV2Credits(tier, seconds)) e recusa preço diferente do mostrado', () => {
  const board = cod(P.board), route = cod(P.route), client = cod(P.client), simple = cod(P.simple)
  return /return single === null \? null : adsV2VariationCredits\(single\)/.test(board) &&
    /const one = adsV2Credits\(a\.tier, a\.seconds\)\n\s*const total = adsV2VariationCredits\(one\)/.test(route) &&
    /if \(!dryRun && expected !== total\) return v2Fail\('price_changed', 409, \{ credits: total \}\)/.test(route) &&
    [client, simple].every((s) => /const group = variationsPrice\(cost\)/.test(s) && /body: \{ order_id: plan\.order_id, expected_credits: group \}/.test(s)) &&
    [client, simple].every((s) => /const cost = three\?\.on \? variationsPrice\(single\) : single/.test(s))
})
await check('P6 o corpo exige o preço mostrado para começar de verdade (o ensaio de US$ 0 não precisa)', () => {
  const U1 = '00000001-2222-4333-8444-555555555555'
  const a = V.sanitizeVariationsBody({ order_id: U1 })
  const b = V.sanitizeVariationsBody({ order_id: U1, dry_run: true })
  const c = V.sanitizeVariationsBody({ order_id: U1, expected_credits: 85 })
  const d = V.sanitizeVariationsBody({ order_id: U1, action: 'choose' })
  return !a.ok && a.error === 'expected_credits_required' && b.ok && c.ok && c.value.expected_credits === 85 && d.ok && d.value.action === 'choose' && !V.sanitizeVariationsBody({ order_id: 'x' }).ok
})

// ═══ 3-4. a ROTA e a cobrança REAL executadas contra um banco falso com ledger ═══════════════════════════════════════
function makeLoader(stubs, opts = {}) {
  const cache = new Map()
  const real = new Set(opts.real ?? [])
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const js = ts.transpileModule(rd(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
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
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}

const ACTIVE = ['generating', 'assembling']
/** Banco falso: filtros eq/in/is/not, UPDATE condicional, upsert com ignoreDuplicates, índice "um ativo por conta E por
 *  letra" (coalesce(variation_slot,'A')), tabelas ausentes = 42P01, e o ledger (credit_debits) com o RPC de estorno. */
function fakeDb(tables, opts = {}) {
  const missing = new Set(opts.missing ?? [])
  const from = (name) => {
    tables[name] ??= []
    const ctx = { name, op: 'select', filters: [], patch: null, rows: null, opts: null }
    const api = {
      select() { return api },
      eq(k, v) { ctx.filters.push((r) => r[k] !== undefined && r[k] !== null && String(r[k]) === String(v)); return api },
      in(k, v) { ctx.filters.push((r) => v.map(String).includes(String(r[k]))); return api },
      is(k, v) { ctx.filters.push((r) => (v === null ? r[k] === null || r[k] === undefined : r[k] === v)); return api },
      not(k, op, v) { ctx.filters.push((r) => (op === 'is' && v === null ? r[k] !== null && r[k] !== undefined : true)); return api },
      gte() { return api },
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
  const slotOf = (r) => r.variation_slot ?? 'A'
  function run(ctx, single) {
    if (missing.has(ctx.name)) return { data: null, error: { code: '42P01', message: 'missing' } }
    const t = tables[ctx.name]
    const hit = () => t.filter((r) => ctx.filters.every((f) => f(r)))
    if (ctx.op === 'select') {
      const rows = hit().map((r) => ({ ...r }))
      return single ? { data: rows[0] ?? null, error: null } : { data: rows, error: null }
    }
    if (ctx.op === 'update') {
      const rows = hit()
      if (ctx.name === 'ads_v2_orders' && ACTIVE.includes(ctx.patch.status)) {
        for (const r of rows) {
          const next = { ...r, ...ctx.patch }
          if (t.some((x) => x !== r && x.user_id === next.user_id && ACTIVE.includes(x.status) && slotOf(x) === slotOf(next))) return { data: null, error: { code: '23505', message: 'one active per slot' } }
        }
      }
      for (const r of rows) Object.assign(r, ctx.patch)
      return single ? { data: rows[0] ? { ...rows[0] } : null, error: null } : { data: rows.map((r) => ({ ...r })), error: null }
    }
    const out = []
    for (const row of ctx.rows) {
      const dup = ctx.name === 'ads_v2_shots'
        ? t.some((x) => x.order_id === row.order_id && x.idx === row.idx && x.attempt === (row.attempt ?? 1))
        : row.id !== undefined && t.some((x) => x.id === row.id)
      if (dup) {
        if (ctx.op === 'upsert' && ctx.opts?.ignoreDuplicates) continue
        return { data: null, error: { code: '23505', message: 'dup' } }
      }
      const nr = { id: row.id ?? `${ctx.name}-${t.length + 1}`, ...row }
      t.push(nr)
      out.push({ ...nr })
    }
    return single ? { data: out[0] ?? null, error: null } : { data: out, error: null }
  }
  return { from, tables }
}

/** O ledger de verdade: débito idempotente pela chave (debit_video_credits_service) e estorno uma vez só
 *  (refund_render_credits: UPDATE ... WHERE refunded_at IS NULL RETURNING). */
function ledgerOps(tables, fail = () => false) {
  const prof = (u) => tables.profiles.find((p) => p.id === u)
  return {
    debit(a) {
      if (fail(a.renderId)) return { data: null, error: { message: 'insufficient balance' } }
      const ex = tables.credit_debits.find((d) => d.render_id === a.renderId)
      if (!ex) {
        tables.credit_debits.push({ render_id: a.renderId, user_id: a.userId, amount: a.cost, refunded_at: null, kind: 'video' })
        prof(a.userId).video_credits -= a.cost
      }
      return { data: prof(a.userId).video_credits, error: null }
    },
    refund(ref) {
      const d = tables.credit_debits.find((x) => x.render_id === ref && !x.refunded_at)
      if (!d) return 0
      d.refunded_at = new Date().toISOString()
      prof(d.user_id).video_credits += d.amount
      return d.amount
    },
  }
}

const U = (n) => `${String(n).padStart(8, '0')}-2222-4333-8444-555555555555`
const USER = U(9)
const ORDER_A = U(1)
const CASA = 'casa@kineo.test'
const photos = [
  { id: 'p1', url: 'https://x.test/p1.jpg', kind: 'product' },
  { id: 'p2', url: 'https://x.test/p2.jpg', kind: 'place' },
  { id: 'p3', url: 'https://x.test/p3.jpg', kind: 'people' },
]
const basePlan = { ...S.planShots({ sector: 'store', tier: 'commercial', photos, seconds: 15 }), narration: 'A frase de sempre.', overlays: [{ role: 'brand', start: 0.3, end: 3.9, text: 'Loja X' }] }

function scenario({ credits = 200, missing = [], failDebit = () => false, extraOrders = [], email = 'fora@cliente.test', flag = true } = {}) {
  const tables = {
    profiles: [{ id: USER, video_credits: credits }],
    ads_v2_orders: [{
      id: ORDER_A, user_id: USER, status: 'planned', tier: 'commercial', seconds: 15, sector: 'store', brief: { sentence: 'Loja X vende sabonete' }, language: 'pt',
      narration: true, logo_footage_id: null, card_url: 'https://x.test/card.png', card_footage_id: 'c1', photos, plan: JSON.parse(JSON.stringify(basePlan)),
      billing_ref: null, credits_charged: 0, generation_id: null, video_id: null, parent_order_id: null, retake_idx: null, started_at: null,
    }, ...extraOrders],
    ads_v2_shots: [],
    ads_v2_variation_groups: [],
    credit_debits: [],
    videos: [],
  }
  const db = fakeDb(tables, { missing })
  const L = ledgerOps(tables, failDebit)
  const events = []
  const dispatched = []
  const billing = makeLoader({
    '@/lib/credits/renderIntent': { recordRenderIntent: async () => true },
    '@/lib/credits/debit': { debitVideoCredits: async (_db, a) => L.debit(a) },
    '@/lib/credits/refund': { refundRenderCredits: async (ref) => L.refund(ref) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
  }, { real: ['lib/ads/sample.ts'] })('lib/ads/v2Billing.ts') // KINEO-ADS-AMOSTRA-2026-10-09 — re-ancorado: v2Billing importa a lib PURA lib/ads/sample.ts (isAdsSampleRef)
  const Vreal = makeLoader({})('lib/ads/v2Variations.ts')
  const Vmod = flag ? Vreal : { ...Vreal, ADS_VARIACOES_PUBLIC: false }
  const access = makeLoader({ '@/lib/ads/access': { isAdsInternalEmail: (e) => e === CASA }, '@/lib/ads/v2Variations': Vmod })('lib/ads/v2VariationsAccess.ts')
  const load = (id) => tables.ads_v2_orders.find((o) => o.id === id) ?? null
  const route = makeLoader({
    'next/server': {},
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: USER, email } } }) } }) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
    '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
    '@/lib/ads/serverAccess': { loadAdsAccess: async () => ({ admin: db, reason: 'ok' }), adsGate: () => 'ok', isMissingAdsTable: (c) => c === '42P01' || c === 'PGRST205' },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/ads/v2VariationsAccess': access,
    '@/lib/ads/v2Billing': billing,
    '@/lib/ads/v2Variations': Vmod,
    '@/lib/ads/v2Advance': {
      loadAdsV2Order: async (_a, id, uid) => { const o = load(id); return { order: o && (!uid || o.user_id === uid) ? JSON.parse(JSON.stringify(o)) : null, error: null } },
      loadAdsV2Shots: async (_a, id) => tables.ads_v2_shots.filter((s) => s.order_id === id),
      buildInitialShotRows: (orderId, _tier, plan) => plan.shots.map((s) => ({ order_id: orderId, idx: s.idx, attempt: 1, kind: s.kind, prompt: s.prompt, status: 'pending' })),
      dispatchAdsV2Shots: async (_a, order) => { dispatched.push({ id: order.id, status: order.status, ledgerRows: tables.credit_debits.length }); return 0 },
      adsV2View: (o, shots) => ({ order_id: o.id, status: o.status, credits: o.credits_charged, shots: shots.length }),
    },
    '@/lib/ads/v2Server': { v2Json: (body, status = 200) => ({ status, body }), v2Fail: (error, status, extra = {}) => ({ status, body: { error, ...extra } }) },
  }, { real: ['lib/ads/v2Contract.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2ShotLists.ts'] })('app/api/ads/v2/variations/route.ts')
  const post = (body) => route.POST({ json: async () => body })
  const get = (qs) => route.GET({ nextUrl: new URL(`https://x.test/api/ads/v2/variations?${qs}`) })
  return { tables, db, events, dispatched, billing, route, post, get, balance: () => tables.profiles[0].video_credits }
}

const PRICE = V.adsV2VariationCredits(T.adsV2Credits('commercial', 15))
const SHARES = V.adsV2VariationShares(PRICE)

// ── 3. débito único ─────────────────────────────────────────────────────────────────────────────────────────────────
const ok1 = scenario()
const r1 = await ok1.post({ order_id: ORDER_A, expected_credits: PRICE })
const members = ok1.tables.ads_v2_orders.filter((o) => o.variation_group_id)
await check('G1 começar: 202, 3 pedidos no grupo (A = o pedido planejado, B e C novos), letras A/B/C, um grupo gravado com o preço e as partes', () =>
  r1.status === 202 && members.length === 3 && members.map((m) => m.variation_slot).sort().join('') === 'ABC' && members.find((m) => m.variation_slot === 'A').id === ORDER_A &&
  new Set(members.map((m) => m.id)).size === 3 && ok1.tables.ads_v2_variation_groups.length === 1 && ok1.tables.ads_v2_variation_groups[0].credits_total === PRICE && JSON.stringify(ok1.tables.ads_v2_variation_groups[0].shares) === JSON.stringify(SHARES))
await check('D1 débito ÚNICO: 3 linhas no ledger (uma por variação, chave própria), somando EXATAMENTE o preço do grupo; saldo cai o preço do grupo, nem um crédito a mais', () => {
  const rows = ok1.tables.credit_debits
  const sum = rows.reduce((s, d) => s + d.amount, 0)
  return rows.length === 3 && sum === PRICE && ok1.balance() === 200 - PRICE && new Set(rows.map((d) => d.render_id)).size === 3 &&
    members.every((m) => rows.some((d) => d.render_id === m.billing_ref && d.amount === m.credits_charged)) &&
    JSON.stringify(members.sort((a, b) => a.variation_slot.localeCompare(b.variation_slot)).map((m) => m.credits_charged)) === JSON.stringify(SHARES)
})
await check('D2 nada vai à fal antes do débito: todo envio viu as 3 linhas do ledger já gravadas, e o envio começa pela A (o still da A é a referência de B/C)', () =>
  ok1.dispatched.length === 3 && ok1.dispatched.every((d) => d.ledgerRows === 3 && d.status === 'generating') && ok1.dispatched[0].id === ORDER_A)
await check('D3 cada variação é um pedido v2 normal: generating, com o plano do SEU look e os planos gravados', () =>
  members.every((m) => m.status === 'generating' && m.brief?.variation?.slot === m.variation_slot && ok1.tables.ads_v2_shots.filter((s) => s.order_id === m.id).length === basePlan.shots.length))
await check('D4 clique repetido não cobra de novo (A já começou → 409, ledger igual)', async () => {
  const again = await ok1.post({ order_id: ORDER_A, expected_credits: PRICE })
  return again.status === 409 && ok1.tables.credit_debits.length === 3 && ok1.balance() === 200 - PRICE
})
await check('D5 preço diferente do mostrado = 409 price_changed, nada gravado nem cobrado', async () => {
  const s = scenario()
  const r = await s.post({ order_id: ORDER_A, expected_credits: PRICE - 1 })
  return r.status === 409 && r.body.error === 'price_changed' && r.body.credits === PRICE && s.tables.credit_debits.length === 0 && s.tables.ads_v2_variation_groups.length === 0
})
await check('D6 saldo curto = 402 ANTES de gravar grupo ou pedido (nada cobrado)', async () => {
  const s = scenario({ credits: PRICE - 1 })
  const r = await s.post({ order_id: ORDER_A, expected_credits: PRICE })
  return r.status === 402 && s.tables.credit_debits.length === 0 && s.tables.ads_v2_orders.length === 1 && s.tables.ads_v2_variation_groups.length === 0
})
await check('D7 tudo ou nada: a 3ª parte recusada → as 2 já cobradas voltam (estorno confirmado) e as 3 voltam a planned; saldo intacto', async () => {
  const holder = {}
  const t = scenario({ failDebit: (ref) => holder.t.tables.ads_v2_orders.find((x) => x.billing_ref === ref)?.variation_slot === 'C' })
  holder.t = t
  const r = await t.post({ order_id: ORDER_A, expected_credits: PRICE })
  const m = t.tables.ads_v2_orders.filter((o) => o.variation_group_id)
  return r.status === 402 && t.balance() === 200 && t.tables.credit_debits.length === 2 && t.tables.credit_debits.every((d) => d.refunded_at) && m.length === 3 && m.every((o) => o.status === 'planned' && o.billing_ref === null && o.credits_charged === 0) && t.dispatched.length === 0
})
await check('D8 outro anúncio ativo na letra A → 409 another_active, nada cobrado (as travas já feitas são desfeitas)', async () => {
  const other = { id: U(5), user_id: USER, status: 'generating', tier: 'commercial', seconds: 15, variation_slot: null }
  const s = scenario({ extraOrders: [other] })
  const r = await s.post({ order_id: ORDER_A, expected_credits: PRICE })
  return r.status === 409 && r.body.error === 'another_active' && s.tables.credit_debits.length === 0 && s.tables.ads_v2_orders.filter((o) => o.variation_group_id).every((o) => o.status === 'planned')
})
await check('D9 tabela/coluna nova ausente (migration não aplicada) = 503 not_ready, nada cobrado', async () => {
  const s = scenario({ missing: ['ads_v2_variation_groups'] })
  const r = await s.post({ order_id: ORDER_A, expected_credits: PRICE })
  return r.status === 503 && r.body.error === 'not_ready' && s.tables.credit_debits.length === 0 && s.balance() === 200
})
await check('D10 ensaio de US$ 0 (dry_run): preço, partes e as 3 listas de prompts, sem débito, sem grupo', async () => {
  const s = scenario()
  const r = await s.post({ order_id: ORDER_A, dry_run: true })
  return r.status === 200 && r.body.charged === false && r.body.credits === PRICE && JSON.stringify(r.body.shares) === JSON.stringify(SHARES) && r.body.variations.length === 3 && s.tables.credit_debits.length === 0 && s.tables.ads_v2_variation_groups.length === 0
})
await check('D11 interruptor DESLIGADO: conta de fora recebe 404 not_found e NADA é gravado nem cobrado; a conta da casa passa', async () => {
  const fora = scenario({ flag: false })
  const r = await fora.post({ order_id: ORDER_A, expected_credits: PRICE })
  const g = await fora.get('latest=1')
  const casa = scenario({ flag: false, email: CASA })
  const rc = await casa.post({ order_id: ORDER_A, expected_credits: PRICE })
  return r.status === 404 && r.body.error === 'not_found' && g.status === 404 && fora.tables.credit_debits.length === 0 && fora.tables.ads_v2_variation_groups.length === 0 && fora.balance() === 200 && rc.status === 202
})

// ── 4. estorno proporcional e idempotente (failAdsV2Order REAL, o caminho de falha de toda variação) ────────────────
await check('E1 variação B falha → volta SÓ a parte dela; A e C continuam cobradas; a conta da tela (adsV2VariationRefund) bate com o ledger', async () => {
  const s = scenario()
  await s.post({ order_id: ORDER_A, expected_credits: PRICE })
  const before = s.balance()
  const b = s.tables.ads_v2_orders.find((o) => o.variation_slot === 'B')
  const r = await s.billing.failAdsV2Order(s.db, { id: b.id, user_id: USER, billing_ref: b.billing_ref, credits_charged: b.credits_charged }, 'teste', '/guardiao')
  const back = s.balance() - before
  const ms = s.tables.ads_v2_orders.filter((o) => o.variation_group_id).map((o) => ({ credits: o.credits_charged, failed: o.status === 'failed' }))
  const stillCharged = s.tables.credit_debits.filter((d) => !d.refunded_at).map((d) => d.amount).reduce((a, x) => a + x, 0)
  return r.won && back === SHARES[1] && back === V.adsV2VariationRefund(ms) && stillCharged === PRICE - SHARES[1] && back < PRICE
})
await check('E2 idempotente: a mesma falha de novo (tela + cron) não devolve outra vez', async () => {
  const s = scenario()
  await s.post({ order_id: ORDER_A, expected_credits: PRICE })
  const c = s.tables.ads_v2_orders.find((o) => o.variation_slot === 'C')
  const ord = { id: c.id, user_id: USER, billing_ref: c.billing_ref, credits_charged: c.credits_charged }
  const before = s.balance()
  const r1x = await s.billing.failAdsV2Order(s.db, ord, 'x', '/g')
  const r2x = await s.billing.failAdsV2Order(s.db, ord, 'x', '/g')
  const direct = await s.billing.refundAdsV2Confirmed(s.db, { userId: USER, billingRef: c.billing_ref })
  return r1x.won && !r2x.won && s.balance() - before === SHARES[2] && direct.state === 'refunded' && s.balance() - before === SHARES[2]
})
await check('E3 adsV2VariationRefund: nenhuma falha = 0; 1 falha = a parte dela; 2 falhas = a soma das 2; as 3 = o preço do grupo', () => {
  const m = SHARES.map((c) => ({ credits: c, failed: false }))
  const f = (idx) => m.map((x, i) => ({ ...x, failed: idx.includes(i) }))
  return V.adsV2VariationRefund(m) === 0 && V.adsV2VariationRefund(f([1])) === SHARES[1] && V.adsV2VariationRefund(f([0, 2])) === SHARES[0] + SHARES[2] && V.adsV2VariationRefund(f([0, 1, 2])) === PRICE
})
await check('E4 failAdsV2Order estorna UMA chave (a do próprio pedido) — nada de varrer o grupo', () => {
  const b = cod(P.billing)
  const fn = b.slice(b.indexOf('export async function failAdsV2Order'))
  return (fn.match(/refundAdsV2Confirmed\(/g) || []).length === 1 && /refundAdsV2Confirmed\(admin, \{ userId: order\.user_id, billingRef: order\.billing_ref \}\)/.test(fn) && !/variation/i.test(fn)
})
await check('E5 GET do grupo: mostra o estorno das que falharam (a mesma adsV2VariationRefund) e as 3 letras', async () => {
  const s = scenario()
  const r = await s.post({ order_id: ORDER_A, expected_credits: PRICE })
  const b = s.tables.ads_v2_orders.find((o) => o.variation_slot === 'B')
  await s.billing.failAdsV2Order(s.db, { id: b.id, user_id: USER, billing_ref: b.billing_ref, credits_charged: b.credits_charged }, 'x', '/g')
  const g = await s.get(`group=${r.body.group_id}`)
  return g.status === 200 && g.body.group.members.length === 3 && g.body.group.refunded === SHARES[1] && g.body.group.members.map((x) => x.slot).join('') === 'ABC'
})
await check('E6 "Escolher esta" grava no grupo (sem cobrar) e só aceita variação entregue', async () => {
  const s = scenario()
  const r = await s.post({ order_id: ORDER_A, expected_credits: PRICE })
  const c = s.tables.ads_v2_orders.find((o) => o.variation_slot === 'C')
  const notYet = await s.post({ action: 'choose', order_id: c.id })
  c.status = 'delivered'
  const yes = await s.post({ action: 'choose', order_id: c.id })
  return notYet.status === 409 && yes.status === 200 && s.tables.ads_v2_variation_groups[0].chosen_order_id === c.id && s.tables.credit_debits.length === 3 && r.status === 202
})

await check('E7 todo evento que a rota e o v2Advance gravam está na lista fechada, é só-servidor e está no SERVER_ONLY_EVENTS do sink', async () => {
  const EV = makeLoader({})('lib/ads/events.ts')
  const sink = (rd('app/api/events/route.ts').match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\]\)/) || ['', ''])[1]
  const nomes = [P.route, P.advance].flatMap((f) => [...cod(f).matchAll(/name: '([a-z0-9_]+)'/g)].map((m) => m[1]))
  const novos = ['ads_v2_variations_started', 'ads_v2_variations_dry_run_served', 'ads_v2_variation_chosen', 'ads_v2_variation_anchor']
  return novos.every((n) => nomes.includes(n)) && nomes.every((n) => EV.isAdsEvent(n) && EV.ADS_SERVER_ONLY_EVENTS.includes(n) && sink.includes(`'${n}'`))
})

// ═══ 5. looks ════════════════════════════════════════════════════════════════════════════════════════════════════════
const LOOKS = V.ADS_V2_VARIATION_SLOTS.map((s) => V.ADS_V2_LOOKS[s])
const lookText = (l) => [l.light, l.palette, l.camera, l.wardrobe, l.setting, l.grade, l.opening, l.heroOpening, l.name.en, l.name.pt, l.name.es]
await check('L1 3 looks distintos em TODO campo (id, nome nas 3 línguas, luz, paleta, câmera, roupa, cenário, grade, abertura, deslocamento 0/1/2)', () => {
  const fields = ['id', 'light', 'palette', 'camera', 'wardrobe', 'setting', 'grade', 'opening', 'heroOpening', 'movementOffset']
  return LOOKS.length === 3 && fields.every((f) => new Set(LOOKS.map((l) => l[f])).size === 3) && ['en', 'pt', 'es'].every((k) => new Set(LOOKS.map((l) => l.name[k])).size === 3) &&
    LOOKS.map((l) => l.movementOffset).join(',') === '0,1,2' && LOOKS.map((l) => l.slot).join('') === 'ABC'
})
await check('L2 A = claro/azul ao ar livre · B = quente/laranja interior · C = pôr do sol rosa', /blue/.test(LOOKS[0].palette) && /outdoor/.test(LOOKS[0].setting) && /orange/.test(LOOKS[1].palette) && /indoor/.test(LOOKS[1].light) && /pink/.test(LOOKS[2].palette) && /sunset/.test(LOOKS[2].light))
// A régua anti-invenção do v2 (lib/ads/scriptPrompt.ts CLAIMS) avaliada de verdade sobre o texto dos looks.
const claimsSrc = rd('lib/ads/scriptPrompt.ts').match(/const CLAIMS: ReadonlyArray<\[RegExp, string\]> = (\[[\s\S]*?\n\])/)
const CLAIMS = claimsSrc ? new Function(`return ${claimsSrc[1]}`)() : null
await check('L3 texto dos looks sem número, contato, link nem promessa (CLAIMS real de scriptPrompt) — a régua anti-invenção passaria', () =>
  Array.isArray(CLAIMS) && CLAIMS.length >= 4 && LOOKS.flatMap(lookText).concat([V.ADS_V2_SAME_PERSON_LINE]).every((t) => !/\d/.test(t) && !/@|https?:|www\.|\.com\b/.test(t) && CLAIMS.every(([re]) => !re.test(t))))
const SECTORS = ['restaurant', 'clinic', 'real_estate', 'gym', 'salon', 'store', 'app_service', 'other']
const photoSets = [photos, [{ id: 't1', url: 'https://x.test/t.jpg', kind: 'text' }, ...photos]]
const fixtures = []
for (const sector of SECTORS) for (const tier of TIERS) for (const ph of photoSets) fixtures.push({ sector, plan: S.planShots({ sector, tier, photos: ph, seconds: 15 }) })
const applyAll = (f) => V.ADS_V2_VARIATION_SLOTS.map((slot) => V.applyAdsV2Look(f.plan, slot, { sector: f.sector, motion: S.motionPrompt }))
await check('L4 em TODO setor × nível: cada plano com IA sai com prompt diferente nas 3 variações (e a cena criada também)', () => fixtures.every((f) => {
  const [a, b, c] = applyAll(f)
  return f.plan.shots.every((s, i) => {
    if (s.kind === 'text' || s.kind === 'user_video') return true
    const ps = [a.shots[i].prompt, b.shots[i].prompt, c.shots[i].prompt]
    const sc = [a.shots[i].scenePrompt, b.shots[i].scenePrompt, c.shots[i].scenePrompt]
    return new Set(ps).size === 3 && (s.source !== 'generated_scene' || new Set(sc).size === 3)
  })
}))
await check('L5 determinístico: o mesmo plano com o mesmo look dá o MESMO resultado byte a byte; e o plano-base não é alterado', () => fixtures.every((f) => {
  const before = JSON.stringify(f.plan)
  const x = JSON.stringify(applyAll(f)), y = JSON.stringify(applyAll(f))
  return x === y && JSON.stringify(f.plan) === before
}))
await check('L6 honestidade: todo prompt com IA ainda termina em "Keep everything exactly as in the photo."; herói mantém as travas; texto nunca ganha prompt', () => fixtures.every((f) => applyAll(f).every((p) => p.shots.every((s, i) => {
  if (s.kind === 'text') return s.prompt === null && f.plan.shots[i].prompt === null
  return s.prompt.endsWith(S.ADS_V2_KEEP_PHRASE) && (s.kind !== 'product_hero' || s.prompt.includes(S.ADS_V2_HERO_STATE_LOCKS))
}))))
await check('L7 cenário novo só em loja/app; nos setores com lugar real a cena mantém o lugar das fotos (só luz e cor mudam)', () => fixtures.every((f) => applyAll(f).every((p, k) => p.shots.filter((s) => s.source === 'generated_scene').every((s) => {
  const free = f.sector === 'store' || f.sector === 'app_service'
  return free ? s.scenePrompt.includes(LOOKS[k].setting) : !s.scenePrompt.includes(LOOKS[k].setting) && s.scenePrompt.includes('Keep the real place from the photos exactly as it is')
}))))
await check('L8 a abertura (1º plano com IA) muda de movimento em cada variação', () => fixtures.every((f) => {
  const first = f.plan.shots.findIndex((s) => s.kind !== 'text' && s.kind !== 'user_video')
  if (first < 0) return true
  const ps = applyAll(f).map((p) => p.shots[first].prompt.split('. ')[0])
  return new Set(ps).size === 3 && ps.every((m, k) => m === (f.plan.shots[first].kind === 'product_hero' ? LOOKS[k].heroOpening : LOOKS[k].opening))
}))
await check('L9 a rota monta as 3 com applyAdsV2Look sobre o MESMO plano-base e grava a marca no brief (coluna que já existe)', () => {
  const r = cod(P.route)
  return /const plans = ADS_V2_VARIATION_SLOTS\.map\(\(slot\) => applyAdsV2Look\(base, slot, \{ sector, motion: lookMotion \}\)\)/.test(r) && /variation: tag\('A'\)/.test(r) && /variation: tag\(slot\)/.test(r)
})
await check('L10 os pedidos gravados no teste da rota têm prompts diferentes entre si e iguais aos da lib', () => {
  const byslot = Object.fromEntries(members.map((m) => [m.variation_slot, m]))
  const want = V.ADS_V2_VARIATION_SLOTS.map((slot) => V.applyAdsV2Look(basePlan, slot, { sector: 'store', motion: S.motionPrompt }))
  return V.ADS_V2_VARIATION_SLOTS.every((slot, i) => JSON.stringify(byslot[slot].plan.shots) === JSON.stringify(want[i].shots)) && new Set(members.map((m) => JSON.stringify(m.plan.shots))).size === 3
})

// ═══ 6. a mesma pessoa nas 3 ═════════════════════════════════════════════════════════════════════════════════════════
const dec = (o) => V.adsV2AnchorDecision({ slot: 'B', shotKind: 'people', shotSource: 'generated_scene', anchorOrderStatus: 'generating', anchorImageUrl: null, waitedMs: 0, ...o })
await check('M1 decisão: A e pedido comum nunca esperam; foto do cliente não usa âncora; B usa o still da A quando existe; espera enquanto a A trabalha; segue sem ele se a A morreu ou o prazo passou', () =>
  dec({ slot: null }).kind === 'skip' && dec({ slot: 'A' }).kind === 'skip' && dec({ shotSource: 'client_photo' }).kind === 'skip' &&
  dec({ anchorImageUrl: 'https://sb.test/a-scene.jpg' }).kind === 'use' && dec({}).kind === 'wait' &&
  dec({ anchorOrderStatus: 'failed' }).reason === 'anchor_gone' && dec({ waitedMs: V.ADS_V2_VARIATION_ANCHOR_WAIT_MS }).reason === 'anchor_timeout' && dec({ anchorImageUrl: 'http://inseguro' }).kind !== 'use')
await check('M2 v2Advance: a decisão vem ANTES do carimbo de envio (esperar não gasta nada); o still entra como ÚLTIMA referência com a frase da mesma pessoa; sem marca = caminho de sempre', () => {
  const a = cod(P.advance)
  const fn = a.slice(a.indexOf('async function submitImageFor'), a.indexOf('async function submitVideoFor'))
  return ordem(fn, 'const tag = variationTagOf(order.brief)', "if (tag && tag.slot !== 'A' && row.kind === 'people' && row.source === 'generated_scene')", 'adsV2AnchorDecision(', "if (d.kind === 'wait') return", 'const claimed = await markShot(') &&
    /const refs = anchorUrl && baseRefs\.length > 0 \? \[\.\.\.baseRefs, anchorUrl\] : baseRefs/.test(fn) && /basePrompt && anchorUrl \? `\$\{basePrompt\} \$\{ADS_V2_SAME_PERSON_LINE\}` : basePrompt/.test(fn)
})
await check('M3 variationTagOf: brief comum = null; marca válida lida; marca torta = null', () =>
  V.variationTagOf({ sentence: 'x' }) === null && V.variationTagOf(null) === null &&
  V.variationTagOf({ variation: { group_id: U(3), slot: 'B', anchor_order_id: U(1) } })?.slot === 'B' &&
  V.variationTagOf({ variation: { group_id: 'x', slot: 'B', anchor_order_id: U(1) } }) === null && V.variationTagOf({ variation: { group_id: U(3), slot: 'D', anchor_order_id: U(1) } }) === null)

// ═══ 7. sem variações = comportamento de hoje ════════════════════════════════════════════════════════════════════════
// sha256 de 27 planos de planShots (3 setores × 3 níveis × 15/20/30 s, 4 fotos) calculado na base limpa 57c9ee90.
const PLAN_BASE_SHA = 'cc2513b1cf74841a9eaba9523a327e918dd844ba2fa60e552f6b43f149195b09'
await check('S1 o plano de hoje não mudou: planShots dá o mesmo resultado da base 57c9ee90 (sha dos 27 planos)', () => {
  const ph = [
    { id: 'p1', url: 'https://x.test/p1.jpg', kind: 'product' },
    { id: 'p2', url: 'https://x.test/p2.jpg', kind: 'place' },
    { id: 'p3', url: 'https://x.test/p3.jpg', kind: 'people' },
    { id: 'p4', url: 'https://x.test/p4.jpg', kind: 'text' },
  ]
  const out = []
  for (const sector of ['restaurant', 'store', 'real_estate']) for (const tier of TIERS) for (const seconds of [15, 20, 30]) out.push(S.planShots({ sector, tier, photos: ph, seconds }))
  return sha(JSON.stringify(out)) === PLAN_BASE_SHA
})
await check('S2 sem variação o look não toca o plano (mesmo objeto) e a refação usa o prompt de sempre, byte a byte', () =>
  fixtures.every((f) => V.applyAdsV2Look(f.plan, null, { sector: f.sector, motion: S.motionPrompt }) === f.plan) && V.adsV2RetakePrompt('Slow push. ' + S.ADS_V2_KEEP_PHRASE, null) === 'Slow push. ' + S.ADS_V2_KEEP_PHRASE &&
  /prompt: adsV2RetakePrompt\(motionPrompt\(r\.kind as AdsV2MotionKind, variant\), look\)/.test(cod(P.retake)) && /const look = variationTagOf\(parent\.brief\)\?\.slot \?\? null/.test(cod(P.retake)))
await check('S3 /start e /plan não sabem que variações existem (o anúncio comum segue o caminho de hoje)', !/variation/i.test(rd(P.start)) && !/variation/i.test(rd(P.plan)))
await check('S4 a tela sem a opção: toggle escondido, "Make my ad" de sempre, nenhum fetch novo no invólucro', () => {
  const c = cod(P.client), s = cod(P.simple)
  return /three=\{variations \? \{ on: three, onChange: setThree \} : null\}/.test(c) && /three=\{variations \? \{ on: three, onChange: setThree, copy: vcopy \} : null\}/.test(s) &&
    /if \(variations && three && onVariationsStarted\) \{/.test(c) && /if \(variations && three && onVariationsStarted\) \{/.test(s) &&
    /const \[groupChecked, setGroupChecked\] = useState\(!variations\)/.test(c) && /useEffect\(\(\) => \{\n\s*if \(!variations\) return/.test(c) && /variations = false/.test(c)
})

// ═══ 8. tela de resultado e migration ════════════════════════════════════════════════════════════════════════════════
await check('T1 painel: as 3 lado a lado, carrossel no celular (scroll-snap), rótulo "A · look", baixar / refazer / escolher', () => {
  const b = rd(P.board)
  return /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(b) && /@media\(max-width:760px\)\{[\s\S]*scroll-snap-type:x mandatory/.test(b) && /variationLabel\(m\.slot, lang\)/.test(b) &&
    /copy\.download/.test(b) && /copy\.redo/.test(b) && /\/ads\/v2\?mode=full&order=/.test(b) && /action: 'choose'/.test(b) && V.variationLabel('B', 'pt') === 'B · Interior quente' && V.variationLabel('C', 'es') === 'C · Atardecer' && V.variationLabel('A', 'en') === 'A · Fresh daylight'
})
await check('T2 textos em pt/en/es com as mesmas chaves (e preço vindo da função, nunca digitado)', () => {
  const C = V.ADS_V2_VARIATIONS_COPY
  const k = (o) => Object.keys(o).sort().join(',')
  return k(C.en) === k(C.pt) && k(C.en) === k(C.es) && ['make', 'price'].every((x) => ['en', 'pt', 'es'].every((l) => C[l][x].includes('{c}') && !/\d/.test(C[l][x].replace(/\b3\b/g, ''))))
})
await check('T3 migration pendente: tabela do grupo, colunas variation_group_id/variation_slot (A|B|C), uma letra por grupo, "um ativo por conta" vira por letra (pedido comum = A), NÃO aplicada', () => {
  const q = rd(P.sql)
  return existsSync(join(RAIZ, P.sql)) && /NÃO APLICADA/.test(q) && /create table if not exists public\.ads_v2_variation_groups/.test(q) &&
    /add column if not exists variation_group_id uuid/.test(q) && /variation_slot in \('A', 'B', 'C'\)/.test(q) &&
    /on public\.ads_v2_orders \(variation_group_id, variation_slot\)/.test(q) && /\(user_id, \(coalesce\(variation_slot, 'A'\)\)\)\s*\n\s*where status in \('generating', 'assembling'\)/.test(q) &&
    /drop index if exists public\.ads_v2_orders_one_active_per_user;/.test(q) && /^begin;$/m.test(q) && /^commit;$/m.test(q) && /enable row level security/.test(q)
})
await check('T4 o grupo tem sempre 3 pedidos: chargeVariationGroup recusa outro tamanho sem cobrar nada', async () => {
  let calls = 0
  const deps = { lock: async () => { calls++; return { ok: true, billingRef: 'k' } }, charge: async () => { calls++; return { ok: true } }, refund: async () => 'refunded', unlock: async () => {}, fail: async () => {} }
  const r = await V.chargeVariationGroup([{ slot: 'A', orderId: 'a', credits: 1 }], deps)
  return !r.ok && r.code === 'bad_group' && calls === 0
})

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log(`${ok} ok · ${falhas.length} falha(s)`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
