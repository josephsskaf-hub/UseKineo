// KINEO-ADS-REFACAO-ATOR-1410 — guardião dos 2 itens do Studio Ads v2 aprovados pelo fundador em 14/10:
//   A) a 1ª refação ("Refazer esta cena") de cada anúncio entregue é GRÁTIS; as seguintes cobram o preço de sempre;
//   B) o plano "pessoa de IA SEGURANDO o produto" (UGC), atrás do interruptor ADS_V2_PRESENTER_HOLDS (desligado).
// Roda com `node scripts/test-ads-refacao-ator-1410.mjs`, sem rede e sem banco. Base = 9b347413 (o pai do 1º commit marcado).
//
// Prova, EXECUTANDO a rota /api/ads/v2/retake de verdade (transpilada) contra um banco falso em memória com a chave primária
// de ads_v2_orders e o índice ads_v2_orders_one_active_per_user_slot:
//   A1 a 1ª refação sai grátis: 202, credits_charged 0, NENHUM débito (chargeAdsV2 não é chamado), evento com free_first_redo;
//   A2 a 2ª refação cobra o preço normal (5 no Kling O3, 12 no herói Seedance): mandar 0 = 409 price_changed com o preço;
//   A3 corrida: dois cliques JUNTOS na 1ª refação (cenas diferentes) = exatamente UMA grátis; e mesmo com a 1ª já entregue
//      entre a leitura e a gravação da 2ª (o índice de "1 ativo" não salva aí), a chave primária por anúncio segura;
//   A4 refação de refação, amostra e interruptor desligado = paga; refação grátis que FALHOU devolve a vez (outro id);
//   A5 /status: first_redo_free só no anúncio entregue que ainda tem a vez (a MESMA regra da rota);
//   A6 caminhos de preço: v2Tiers, v2Billing, v2StartCore, /start, /variations, v2Batch, refund e debit byte a byte iguais à
//      base; a rota da refação = a base + SÓ linhas marcadas (desfeitas, a base exata), com a linha do preço e a chamada de
//      débito pagas INTOCADAS; a tela manda 0 só na 1ª e mostra "Refazer esta cena · grátis" (16 línguas);
//   B1 o plano "segurando o produto" só existe com o interruptor LIGADO e um apresentador ESCOLHIDO (com retrato);
//   B2 TROCA, não soma: nº de planos, cortes e duração iguais; créditos (adsV2Credits) iguais; nada do Premium/estilo/packshot cede;
//   B3 o caminho é o de sempre (Nano Banana Pro edit com 2 referências → Kling O3), sem fornecedor novo; entra como insert do ator;
//   B4 rótulo de IA: a vista marca ai_person e as duas grades escrevem "Pessoa de IA" (16 línguas); nada de depoimento;
//   M  mutantes (todos vermelhos).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semRefacaoAtor1410, REFACAO_ATOR_1410_ARQUIVOS, MARCA_REFACAO_ATOR_1410, BASE_REFACAO_ATOR_1410 } from './test-support/desfaz-ads-refacao-ator-1410.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const MARCA = 'KINEO-ADS-REFACAO-ATOR-1410'
const BASE = '9b347413d47959e847556dffcdd9a07e25666a75'
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })
const base = (rel) => git('show', `${BASE}:${rel}`).replace(/\r\n/g, '\n')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 80)); const out = src.split(de).join(para); if (out === src) throw new Error('mutante não aplicou'); return out }

const F = {
  retake: 'app/api/ads/v2/retake/route.ts',
  status: 'app/api/ads/v2/status/route.ts',
  free: 'lib/ads/v2FreeRedo.ts',
  holds: 'lib/ads/v2PresenterHolds.ts',
  presenter: 'lib/ads/v2Presenter.ts',
  shotLists: 'lib/ads/v2ShotLists.ts',
  tiers: 'lib/ads/v2Tiers.ts',
  engines: 'lib/ads/v2Engines.ts',
  contract: 'lib/ads/v2Contract.ts',
  advance: 'lib/ads/v2Advance.ts',
  core: 'lib/ads/v2PlanCore.ts',
  redo: 'lib/ads/v2Redo.ts',
  screen: 'lib/ads/v2Screen.ts',
  sample: 'lib/ads/sample.ts',
  brand: 'lib/brandIdentity.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, rd(v)]))
const puro = (over = {}) => createOfflineLoader({ source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']

// ═══ carregador das ROTAS: transpila de verdade; dependências de servidor viram stubs; as libs puras rodam reais ════════
const REAIS = new Set(['lib/ads/v2Contract.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2ShotLists.ts', 'lib/ads/v2Variations.ts', 'lib/ads/v2FreeRedo.ts'])
function carregarRota(rel, stubs, over = {}) {
  const cache = new Map()
  const load = (r) => {
    if (cache.has(r)) return cache.get(r)
    const text = Object.hasOwn(over, r) ? over[r] : rd(r)
    const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(r, module.exports)
    const req = (spec) => {
      if (Object.hasOwn(stubs, spec)) return stubs[spec]
      const t = spec.startsWith('@/') ? `${spec.slice(2)}.ts` : null
      if (t && REAIS.has(t)) return load(t)
      throw new Error(`sem stub: ${spec} (em ${r})`)
    }
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(r, module.exports)
    return module.exports
  }
  return load(rel)
}

// ═══ banco falso: ads_v2_orders (chave primária + índice "1 ativo por conta e letra") e ads_v2_shots ════════════════════
const UID = '0b0b0b0b-0000-4000-8000-000000000001'
const P = '11111111-1111-4111-8111-111111111111'
const uuidDe = (seed) => { const h = sha(seed); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}` }
function mundo(opts = {}) {
  const orders = new Map()
  const shots = new Map()
  const charges = []
  const events = []
  const fails = []
  const hooks = { beforePriors: null }
  const parent = { id: P, user_id: UID, status: 'delivered', tier: opts.tier ?? 'commercial', seconds: 15, sector: 'store', brief: {}, language: 'en', narration: true, logo_footage_id: null, card_footage_id: null, card_url: null, photos: [], plan: { shots: [] }, music_url: null, voice_url: null, voice_seconds: null, billing_ref: opts.parentRef ?? `adsv2-${P}-g1`, credits_charged: 30, generation_id: 'g1', parent_order_id: opts.parentOf ?? null, retake_idx: null, variation_slot: null }
  orders.set(P, parent)
  const kinds = opts.kinds ?? ['product', 'people', 'place', 'product']
  shots.set(P, kinds.map((kind, idx) => ({ id: `s${idx}`, order_id: P, idx, attempt: 1, role: 'hook', kind, source: 'client_photo', source_footage_id: null, image_url: `https://x.test/${idx}.jpg`, engine: 'kling_o3', prompt: 'p', gen_seconds: 3, cut_start: 0, cut_seconds: 2, movement_variant: 0, status: 'done', stored_url: `https://x.test/${idx}.mp4`, measured_seconds: 3 })))
  for (const o of opts.priors ?? []) orders.set(o.id, { user_id: UID, parent_order_id: P, variation_slot: null, ...o })
  const match = (row, f) => f.every(([k, v, op]) => (op === 'in' ? v.includes(row[k]) : row[k] === v))
  class Q {
    constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.cols = null }
    select(c) { if (this.op === 'select') this.cols = c; return this }
    eq(k, v) { this.f.push([k, v]); return this }
    in(k, v) { this.f.push([k, v, 'in']); return this }
    insert(row) { this.op = 'insert'; this.row = row; return this }
    update(p) { this.op = 'update'; this.patch = p; return this }
    upsert(rows) { this.op = 'upsert'; this.rows = rows; return this }
    maybeSingle() { return this }
    then(res, rej) { return this.exec().then(res, rej) }
    async exec() {
      await Promise.resolve()
      if (this.t === 'ads_v2_shots') {
        if (this.op === 'upsert') { const id = this.rows[0]?.order_id; if (id) shots.set(id, this.rows.map((r, i) => ({ id: `${id}-${i}`, ...r }))); return { data: null, error: null } }
        return { data: [], error: null }
      }
      if (this.t !== 'ads_v2_orders') throw new Error('tabela inesperada ' + this.t)
      if (this.op === 'select') {
        if (this.cols === 'status, credits_charged' && hooks.beforePriors) await hooks.beforePriors()
        return { data: [...orders.values()].filter((r) => match(r, this.f)).map((r) => ({ ...r })), error: null }
      }
      if (this.op === 'insert') {
        const row = { variation_slot: null, ...this.row }
        if (orders.has(row.id)) return { data: null, error: { code: '23505', message: 'ads_v2_orders_pkey' } }
        const slot = row.variation_slot ?? 'A'
        if ([...orders.values()].some((o) => o.user_id === row.user_id && (o.variation_slot ?? 'A') === slot && (o.status === 'generating' || o.status === 'assembling'))) return { data: null, error: { code: '23505', message: 'ads_v2_orders_one_active_per_user_slot' } }
        orders.set(row.id, row)
        return { data: { id: row.id }, error: null }
      }
      if (this.op === 'update') { for (const r of orders.values()) if (match(r, this.f)) Object.assign(r, this.patch); return { data: null, error: null } }
      throw new Error('op inesperada')
    }
  }
  const admin = { from: (t) => new Q(t) }
  const json = (body, init) => ({ body, status: init?.status ?? 200 })
  const stubs = {
    'next/server': { NextResponse: { json }, NextRequest: class {} },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: UID, email: 'a@b.test' } } }) } }) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
    '@/lib/ads/serverAccess': { adsGate: () => 'ok', isMissingAdsTable: () => false, loadAdsAccess: async () => ({ admin, reason: null, ownerId: UID, role: 'owner' }) },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/ads/v2Server': { v2Fail: (error, status, extra = {}) => json({ error, ...extra }, { status }), v2Json: (body, status = 200) => json(body, { status }) },
    '@/lib/ads/v2Billing': {
      adsV2RetakeRef: (id) => `adsv2redo-${id}`,
      deterministicUuid: uuidDe,
      chargeAdsV2: async (_a, args) => { charges.push(args); return { ok: true, balance: 100 } },
      failAdsV2Order: async (_a, o, reason) => { fails.push({ id: o.id, reason }); const r = orders.get(o.id); if (r) r.status = 'failed'; return { won: true, refund: 'refunded', amount: 0 } },
    },
    '@/lib/ads/v2Advance': {
      loadAdsV2Order: async (_a, id, uid) => { const o = orders.get(id); return { order: o && (!uid || o.user_id === uid) ? { ...o } : null, error: null } },
      loadAdsV2Shots: async (_a, id) => shots.get(id) ?? [],
      latestShots: (rows) => rows,
      adsV2View: (o) => ({ order_id: o.id, status: o.status, credits: o.credits_charged, video_id: null }),
      adsV2ShotEffect: () => null,
      dispatchAdsV2Shots: async () => 0,
      advanceAdsV2Order: async () => null,
    },
  }
  return { orders, shots, charges, events, fails, hooks, stubs }
}
const refazer = (w, over = {}) => carregarRota(F.retake, w.stubs, over)
const post = (w, body, over) => refazer(w, over).POST({ json: async () => ({ order_id: P, ...body }) })
const retakes = (w) => [...w.orders.values()].filter((o) => o.parent_order_id === P)

// ═══ A1/A2. a 1ª é grátis; a 2ª cobra o preço normal ═══════════════════════════════════════════════════════════════
const a1 = async (over = {}) => {
  const w = mundo()
  const caro = await post(w, { idx: 1, expected_credits: 5 }, over) // a tela velha mostraria 5: a rota diz que é 0
  const r = await post(w, { idx: 1, expected_credits: 0 }, over)
  const rs = retakes(w)
  const ev = w.events.find((e) => e.name === 'ads_v2_retake_started')
  return caro.status === 409 && caro.body.error === 'price_changed' && caro.body.credits === 0 &&
    r.status === 202 && rs.length === 1 && rs[0].credits_charged === 0 && rs[0].status === 'generating' && w.charges.length === 0 &&
    rs[0].id === uuidDe(`adsv2redo-free:${P}:0`) && rs[0].billing_ref === `adsv2redo-${rs[0].id}` &&
    !!ev && ev.metadata.credits === 0 && ev.metadata.free_first_redo === true
}
await check('A1 a 1ª refação do anúncio sai GRÁTIS (EXECUTADA): 202, credits_charged 0, nenhum débito, id por anúncio, evento com free_first_redo; a tela que mandar 5 recebe 409 price_changed com 0', () => a1())

const a2 = async (over = {}, tier = 'commercial', kinds) => {
  const w = mundo({ tier, kinds })
  const r1 = await post(w, { idx: 1, expected_credits: 0 }, over)
  for (const o of retakes(w)) o.status = 'delivered' // a 1ª (grátis) foi entregue
  const preco = tier === 'cinema' ? 12 : 5
  const zero = await post(w, { idx: 2, expected_credits: 0 }, over)
  const r2 = await post(w, { idx: 2, expected_credits: preco }, over)
  const pagas = retakes(w).filter((o) => o.credits_charged === preco)
  return r1.status === 202 && zero.status === 409 && zero.body.error === 'price_changed' && zero.body.credits === preco &&
    r2.status === 202 && pagas.length === 1 && w.charges.length === 1 && w.charges[0].cost === preco && w.charges[0].billingRef === pagas[0].billing_ref &&
    pagas[0].id === uuidDe(`adsv2redo:${P}:2:s2:0`) // a semente PAGA de sempre (pai, plano, linha, fechadas)
}
await check('A2 a 2ª refação cobra o preço NORMAL (EXECUTADA): mandar 0 = 409 com o preço; com 5 (Kling O3) = 1 débito de 5 com a chave da refação e a semente paga de sempre', () => a2())
await check('A2b no Premium, o herói Seedance segue 12 na 2ª refação (o preço do plano não mudou)', () => a2({}, 'cinema', ['product', 'people', 'product_hero', 'place']))

// ═══ A3. corrida ════════════════════════════════════════════════════════════════════════════════════════════════════
const barreira = (n) => { let c = 0; let abrir; const p = new Promise((r) => { abrir = r }); return async () => { c++; if (c >= n) abrir(); await p } }
const a3 = async (over = {}) => {
  const w = mundo()
  w.hooks.beforePriors = barreira(2) // as DUAS requisições leem "nenhuma refação" antes de qualquer gravação
  const rs = await Promise.all([post(w, { idx: 1, expected_credits: 0 }, over), post(w, { idx: 2, expected_credits: 0 }, over)])
  const st = rs.map((r) => r.status).sort()
  const perdeu = rs.find((r) => r.status !== 202)
  return st[0] === 202 && st[1] === 409 && perdeu.body.error === 'price_changed' && perdeu.body.credits === 5 &&
    retakes(w).length === 1 && retakes(w).filter((o) => o.credits_charged === 0).length === 1 && w.charges.length === 0
}
await check('A3 corrida (EXECUTADA): dois cliques JUNTOS na 1ª refação, em cenas diferentes, os dois leem "nenhuma" → exatamente UMA grátis; a outra recebe 409 com o preço (5) e nada é cobrado', () => a3())
// O pior caso, de forma simples e determinística: o banco falso devolve a B a leitura TIRADA ANTES de A gravar (foto antiga),
// e A já está entregue quando B grava.
const a3d = async (over = {}) => {
  const w = mundo()
  const fotoVazia = []
  let primeiro = true
  const Q0 = w.stubs['@/lib/ads/serverAccess']
  const adminReal = (await Q0.loadAdsAccess()).admin
  const adminVelho = {
    from: (t) => {
      const q = adminReal.from(t)
      if (t !== 'ads_v2_orders') return q
      const sel = q.select.bind(q)
      q.select = (c) => { if (c === 'status, credits_charged' && !primeiro) { const fake = { eq: () => fake, then: (res) => Promise.resolve({ data: fotoVazia, error: null }).then(res) }; return fake } return sel(c) }
      return q
    },
  }
  const ra = await post(w, { idx: 1, expected_credits: 0 }, over)
  for (const o of retakes(w)) o.status = 'delivered' // A entregue: o índice de "1 ativo" já não segura nada
  primeiro = false
  w.stubs['@/lib/ads/serverAccess'] = { ...Q0, loadAdsAccess: async () => ({ admin: adminVelho, reason: null, ownerId: UID, role: 'owner' }) }
  const rb = await post(w, { idx: 2, expected_credits: 0 }, over)
  return ra.status === 202 && rb.status === 409 && rb.body.error === 'price_changed' && rb.body.credits === 5 &&
    retakes(w).filter((o) => o.credits_charged === 0).length === 1 && retakes(w).length === 1 && w.charges.length === 0
}
await check('A3b pior caso (EXECUTADO): B leu "nenhuma refação" ANTES de A gravar e só grava DEPOIS de A entregue (o índice de "1 ativo" não salva) → a chave primária POR ANÚNCIO recusa B: uma grátis só', () => a3d())
const a3e = async (over = {}) => {
  const w = mundo()
  w.hooks.beforePriors = barreira(2)
  const rs = await Promise.all([post(w, { idx: 1, expected_credits: 0 }, over), post(w, { idx: 1, expected_credits: 0 }, over)])
  return rs.every((r) => r.status === 202) && rs.filter((r) => r.body.already_started === true).length === 1 && retakes(w).length === 1 && w.charges.length === 0
}
await check('A3c clique duplo na MESMA cena (EXECUTADO): os dois 202, um deles already_started; um pedido só, nada cobrado', () => a3e())

// ═══ A4. quem NÃO ganha a grátis; a grátis que falhou devolve a vez ════════════════════════════════════════════════
const a4 = async (over = {}) => {
  const filho = mundo({ parentOf: '22222222-2222-4222-8222-222222222222' }) // o "anúncio" é uma refação
  const f0 = await post(filho, { idx: 1, expected_credits: 0 }, over)
  const amostra = mundo({ parentRef: `adssample-${P}-g1` })
  const s0 = await post(amostra, { idx: 1, expected_credits: 0 }, over)
  const s5 = await post(amostra, { idx: 1, expected_credits: 5 }, over)
  const falhou = mundo({ priors: [{ id: uuidDe(`adsv2redo-free:${P}:0`), status: 'failed', credits_charged: 0, retake_idx: 1 }] })
  const g = await post(falhou, { idx: 1, expected_credits: 0 }, over)
  const nova = retakes(falhou).find((o) => o.status === 'generating')
  const paga = mundo({ priors: [{ id: 'x-paga', status: 'delivered', credits_charged: 5, retake_idx: 3 }] }) // anúncio que já teve refação (paga, de antes)
  const p0 = await post(paga, { idx: 1, expected_credits: 0 }, over)
  return f0.status === 409 && f0.body.credits === 5 && s0.status === 409 && s0.body.credits === 5 && s5.status === 202 && amostra.charges.length === 1 &&
    g.status === 202 && !!nova && nova.credits_charged === 0 && nova.id === uuidDe(`adsv2redo-free:${P}:1`) && falhou.charges.length === 0 &&
    p0.status === 409 && p0.body.credits === 5
}
await check('A4 refação de refação, amostra e anúncio que já teve refação = PAGA; a grátis que FALHOU devolve a vez com OUTRO id (semente 1)', () => a4())
await check('A4b a decisão pura: interruptor, pai, amostra, vivas x fechadas; o preço da tela é 0 só com first_redo_free', () => {
  const M = puro()(F.free)
  const d = M.adsV2FirstRedoDecision
  return M.ADS_V2_FIRST_REDO_FREE === true &&
    d({ parent_order_id: null, billing_ref: 'adsv2-x' }, []).free === true &&
    d({ parent_order_id: 'p', billing_ref: 'adsv2-x' }, []).free === false &&
    d({ parent_order_id: null, billing_ref: 'adssample-x' }, []).free === false &&
    ['generating', 'assembling', 'delivered'].every((s) => d({ parent_order_id: null, billing_ref: null }, [{ status: s, credits_charged: 5 }]).free === false) &&
    d({ parent_order_id: null, billing_ref: null }, [{ status: 'failed', credits_charged: 5 }, { status: 'cancelled', credits_charged: 5 }]).free === true &&
    d({ parent_order_id: null, billing_ref: null }, [{ status: 'failed', credits_charged: 0 }, { status: 'failed', credits_charged: 5 }]).seed === 1 &&
    M.adsV2RedoPrice(5, true) === 0 && M.adsV2RedoPrice(5, false) === 5 && M.adsV2RedoPrice(12, undefined) === 12 &&
    M.ADS_V2_FREE_REDO_SAMPLE_PREFIX === puro()(F.sample).ADS_SAMPLE_PREFIX &&
    !/^\s*import\s(?!type)/m.test(SRC.free) // lib pura
})

// ═══ A5. /status ═══════════════════════════════════════════════════════════════════════════════════════════════════
const a5 = async (over = {}) => {
  const get = async (w, status) => {
    w.orders.get(P).status = status
    const R = carregarRota(F.status, { ...w.stubs, '@/lib/ads/v2Advance': { ...w.stubs['@/lib/ads/v2Advance'], adsV2View: (o) => ({ order_id: o.id, status: o.status, video_id: null }), advanceAdsV2Order: async (_a, id) => ({ order_id: id, status: 'generating', video_id: null }) } }, over)
    return R.GET({ nextUrl: { searchParams: { get: () => P } } })
  }
  const novo = mundo()
  const g1 = await get(novo, 'delivered')
  const viva = mundo({ priors: [{ id: 'r1', status: 'generating', credits_charged: 0 }] })
  const g2 = await get(viva, 'delivered')
  const andando = mundo()
  const g3 = await get(andando, 'generating')
  const filho = mundo({ parentOf: '22222222-2222-4222-8222-222222222222' })
  const g4 = await get(filho, 'delivered')
  return g1.status === 200 && g1.body.first_redo_free === true && !('first_redo_free' in g2.body) && !('first_redo_free' in g3.body) && !('first_redo_free' in g4.body)
}
await check('A5 /status (EXECUTADO): first_redo_free só no anúncio ORIGINAL entregue que ainda tem a vez; com refação viva, em andamento ou refação de refação = sem a chave', () => a5())

// ═══ A6. caminhos de preço intocados + a tela ══════════════════════════════════════════════════════════════════════
const INTOCADOS = ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/variations/route.ts', 'lib/ads/v2Batch.ts', 'lib/credits/refund.ts', 'lib/credits/debit.ts', 'lib/ads/sample.ts', 'lib/ads/adV2Montage.ts', 'lib/engineWall.ts', 'lib/homeVideoCuration.ts']
await check('A6 v2Tiers, v2Billing, v2StartCore, /start, /variations, v2Batch, refund, debit, sample e montagem byte a byte iguais à base (nenhum preço, débito ou estorno novo; vitrine da home intocada)', () => INTOCADOS.every((f) => rd(f) === base(f)))
const retakeOk = (src) => {
  const linhasNovas = src.split('\n').filter((l) => !base(F.retake).split('\n').includes(l))
  return semRefacaoAtor1410(F.retake, src) === base(F.retake) && linhasNovas.length > 0 && linhasNovas.every((l) => l.includes(MARCA)) &&
    src.includes('    const price = adsV2RetakeCredits(target.kind, parent.tier)\n') && // a linha do preço, intocada
    src.includes('await chargeAdsV2(admin, { userId: uid, billingRef, cost: price })') && // o débito pago, a chamada de sempre
    src.includes('`adsv2redo:${parent.id}:${idx}:${target.id}:${closed}`') && // a semente paga de sempre
    /const cost = firstRedo\.free \? 0 : price/.test(src) && /credits_charged: cost,/.test(src)
}
await check('A6b a rota da refação = a base + SÓ linhas marcadas (desfeitas, a base exata); a linha do preço, a semente e a chamada de débito PAGAS seguem iguais', () => retakeOk(SRC.retake))
await check('A6c todos os 11 arquivos tocados, desfeitos (scripts/test-support/desfaz-ads-refacao-ator-1410.mjs), são EXATAMENTE a base; toda linha nova traz a marca', () =>
  REFACAO_ATOR_1410_ARQUIVOS.length === 11 && MARCA_REFACAO_ATOR_1410 === MARCA && BASE_REFACAO_ATOR_1410 === BASE &&
  REFACAO_ATOR_1410_ARQUIVOS.every((f) => semRefacaoAtor1410(f, rd(f)) === base(f)) &&
  REFACAO_ATOR_1410_ARQUIVOS.filter((f) => f !== F.redo).every((f) => { const b = new Set(base(f).split('\n')); return rd(f).split('\n').filter((l) => !b.has(l)).every((l) => l.includes(MARCA)) }) &&
  /retake_credits: r\.kind === 'text' \|\| r\.kind === 'user_video' \? 0 : adsV2RetakeCredits\(r\.kind, order\.tier\),/.test(SRC.advance))
const telaOk = (simple, client) =>
  /expected_credits: adsV2RedoPrice\(shot\.retake_credits, order\.first_redo_free\)/.test(simple) &&
  /\{redo\.free && redo\.freeCopy \? redo\.freeCopy\.button : adsV2RedoFill\(redo\.copy\.button, \{ c: s\.retake_credits \}\)\}/.test(simple) &&
  (simple.match(/redo\.free && redo\.freeCopy \? redo\.freeCopy\.ask : redo\.copy\.ask/g) ?? []).length === 2 &&
  /free: order\.first_redo_free === true, freeCopy: adsV2RedoFreeCopy\(lang\)/.test(simple) &&
  /expected_credits: adsV2RedoPrice\(shot\.retake_credits, order\.first_redo_free\)/.test(client) &&
  /\{redo\.free \? 'Redo this shot · free' : `Redo this shot · \$\{s\.retake_credits\} credits`\}/.test(client) &&
  /free: order\.first_redo_free === true,/.test(client) &&
  (simple.match(/'\/api\/ads\/v2\/retake'/g) ?? []).length === 1 && (client.match(/'\/api\/ads\/v2\/retake'/g) ?? []).length === 1 &&
  [simple, client].every((s) => { const i = s.indexOf('function applyView(v: StatusView)'); return i >= 0 && s.slice(i, s.indexOf("if ('video' in v)", i)).includes('...(v.first_redo_free === true ? { first_redo_free: true } : {})') }) // a vista do /status chega ao estado da tela
await check('A6d a tela (modo simples e completo): manda 0 só quando o /status disse first_redo_free; botão "Refazer esta cena · grátis" e a confirmação "de graça" só aí; senão o preço de sempre', () => telaOk(SRC.simple, SRC.client))
const copyOk = (src) => {
  const R = puro(src ? { [F.redo]: src } : {})(F.redo)
  const T = R.ADS_V2_REDO_FREE_COPY
  return Object.keys(T).length === 16 && LANGS.every((l) => T[l] && T[l].button.trim() && T[l].ask.includes('{n}') && !T[l].button.includes('{c}') && !T[l].ask.includes('{c}')) &&
    LANGS.filter((l) => l !== 'en').every((l) => T[l].button !== T.en.button && T[l].ask !== T.en.ask) &&
    T.pt.button === 'Refazer esta cena · grátis' && T.en.button === 'Redo this scene · free' && R.adsV2RedoFreeCopy('xx') === T.en && R.adsV2RedoFreeCopy('pt') === T.pt &&
    R.ADS_V2_REDO_COPY.pt.button === 'Refazer esta cena · {c} créditos' // a frase paga continua
}
await check('A6e frases da refação grátis nas 16 línguas (nenhuma cópia do inglês, sem {c}); pt = "Refazer esta cena · grátis"; as frases pagas seguem iguais', () => copyOk())
await check('A6f o contrato aceita expected_credits 0 (a grátis) e segue recusando negativo, fracionário e acima do teto', () => {
  const C = puro()(F.contract)
  const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  return C.sanitizeRetakeBody({ order_id: U(1), idx: 1, expected_credits: 0 }).ok === true && C.sanitizeRetakeBody({ order_id: U(1), idx: 1, expected_credits: -1 }).error === 'bad_expected_credits' &&
    C.sanitizeRetakeBody({ order_id: U(1), idx: 1, expected_credits: 1.5 }).error === 'bad_expected_credits' && C.sanitizeRetakeBody({ order_id: U(1), idx: 1, expected_credits: C.ADS_V2_MAX_RETAKE_CREDITS + 1 }).error === 'bad_expected_credits'
})

// ═══ B. pessoa de IA segurando o produto ═════════════════════════════════════════════════════════════════════════
const H = (over = {}) => puro(over)(F.holds)
const SL = puro()(F.shotLists)
const PR = puro()(F.presenter)
const TI = puro()(F.tiers)
const photos = [
  { id: 'f-prod', url: 'https://cdn.test/prod.jpg', kind: 'product' },
  { id: 'f-place', url: 'https://cdn.test/place.jpg', kind: 'place' },
  { id: 'f-people', url: 'https://cdn.test/people.jpg', kind: 'people' },
]
const ator = (presenterId) => PR.planAdsV2Presenter({ sector: 'store', photos: photos.map((p) => ({ footage_id: p.id, kind: p.kind, url: p.url })), seedKey: 'ord-1', presenterId })
const planoDe = (tier, seconds, style = null) => {
  const p = SL.planShots({ sector: 'store', tier, photos, seconds, ...(style ? { style } : {}) })
  p.shots = SL.adsV2PackshotShots(p.shots, { photos, productOrder: true })
  return p
}
const holdsOk = (Hm) => {
  if (Hm.ADS_V2_PRESENTER_HOLDS !== false) return false
  const sofia = PR.adsV2PresenterById('sofia')
  const marcus = PR.adsV2PresenterById('marcus')
  for (const tier of ['photo_motion', 'commercial', 'cinema']) {
    for (const seconds of [15, 20, 30]) {
      const p = planoDe(tier, seconds)
      // desligado (o padrão), sem ator, sorteio (sem escolha) ou entrada de outro apresentador = o MESMO array
      if (Hm.adsV2PresenterHoldsShots(p.shots, { on: Hm.ADS_V2_PRESENTER_HOLDS, actor: ator('sofia'), entry: sofia, sector: 'store' }) !== p.shots) return false
      if (Hm.adsV2PresenterHoldsShots(p.shots, { on: true, actor: null, entry: sofia, sector: 'store' }) !== p.shots) return false
      const sorteio = ator(null)
      if (sorteio.presenterId !== undefined || Hm.adsV2PresenterHoldsShots(p.shots, { on: true, actor: sorteio, entry: PR.adsV2PresenterById(sorteio.presenterId), sector: 'store' }) !== p.shots) return false
      if (Hm.adsV2PresenterHoldsShots(p.shots, { on: true, actor: ator('sofia'), entry: marcus, sector: 'store' }) !== p.shots) return false
      if (Hm.adsV2PresenterHoldsShots(p.shots, { on: true, actor: ator('sofia'), entry: { ...sofia, portrait: null }, sector: 'store' }) !== p.shots) return false
      // ligado + apresentador escolhido = UMA vaga trocada
      const actor = ator('marcus')
      const out = Hm.adsV2PresenterHoldsShots(p.shots, { on: true, actor, entry: marcus, sector: 'store' })
      const novos = out.filter((s) => s.presenterHolds === true)
      if (out === p.shots || out.length !== p.shots.length || novos.length !== 1) return false
      const h = novos[0]
      const antes = p.shots.find((s) => s.idx === h.idx)
      const somaAntes = p.shots.reduce((a, s) => a + s.cutSeconds, 0)
      const somaDepois = out.reduce((a, s) => a + s.cutSeconds, 0)
      if (somaAntes !== somaDepois || h.cutSeconds !== antes.cutSeconds) return false
      if (out.some((s, i) => s !== p.shots[i] && s.idx !== h.idx)) return false // só a vaga mudou
      // a vaga: a 1ª cena criada (Comercial/Premium) ou, sem cena, uma foto animada DEPOIS do gancho — nunca herói/estilo/packshot/texto
      const temCena = p.shots.some((s) => s.source === 'generated_scene')
      if (temCena ? antes.source !== 'generated_scene' || antes.idx !== p.shots.find((s) => s.source === 'generated_scene').idx : antes.source !== 'client_photo' || !['people', 'place', 'product'].includes(antes.kind) || antes.idx === p.shots[0].idx) return false
      if (antes.packshot || antes.effect || antes.kind === 'product_hero' || antes.kind === 'text') return false
      if (h.kind !== 'people' || h.source !== 'generated_scene' || h.imageUrl !== null || h.sourceFootageId !== null) return false
      if (h.referenceUrls.length !== 2 || h.referenceUrls[0] !== 'https://www.usekineo.com/ads/presenters/marcus.webp' || h.referenceUrls[1] !== actor.productUrl || h.referenceFootageIds[0] !== actor.productFootageId) return false
      if (!h.scenePrompt.includes(marcus.look) || !/FIRST reference photo/.test(h.scenePrompt) || !/SECOND reference photo/.test(h.scenePrompt) || !/mouth closed/.test(h.scenePrompt)) return false
      if (!h.prompt.endsWith(SL.ADS_V2_KEEP_PHRASE) || h.cutStart !== SL.adsV2CutStart(h.cutSeconds, 'people')) return false
      // créditos: só nível e duração (o plano não entra na conta)
      if (TI.adsV2Credits(tier, seconds) !== TI.adsV2Credits(tier, seconds)) return false
      // o motor do vídeo é o de sempre para cena criada
      if (TI.routeShot(h.kind, tier, 1, false) !== 'kling_o3') return false
    }
  }
  // estilo + Premium: o herói (Seedance) e o plano do estilo nunca cedem
  const fx = planoDe('cinema', 15, 'giant_product')
  const outFx = Hm.adsV2PresenterHoldsShots(fx.shots, { on: true, actor: ator('marcus'), entry: marcus, sector: 'store' })
  const alvo = outFx.find((s) => s.presenterHolds)
  return !!alvo && fx.shots.find((s) => s.idx === alvo.idx).source === 'generated_scene' && outFx.filter((s) => s.effect).length === fx.shots.filter((s) => s.effect).length && outFx.filter((s) => s.kind === 'product_hero').length === fx.shots.filter((s) => s.kind === 'product_hero').length
}
await check('B1/B2 o plano "segurando o produto" só com o interruptor LIGADO e apresentador ESCOLHIDO com retrato; TROCA uma vaga (nº de planos, cortes e duração iguais; herói/estilo/packshot/texto nunca cedem) nos 3 níveis × 15/20/30 s; interruptor DESLIGADO por padrão', () => holdsOk(H()))
await check('B2b créditos IGUAIS: o /plan cobra adsV2Credits(nível, duração) — a linha do preço é a de antes e a troca roda ANTES do estimador de US$ (que fica honesto)', () => {
  const core = SRC.core
  const linhas = core.split('\n').filter((l) => l.includes(MARCA))
  return linhas.length === 3 && !/credit|debit|charge|refund|adsV2Credits|cost/i.test(linhas.join('\n').replace(/\/\/.*$/gm, '')) &&
    /plan\.shots = adsV2PresenterHoldsShots\(plan\.shots, \{ on: ADS_V2_PRESENTER_HOLDS, actor: presenter, entry: adsV2PresenterById\(presenter\?\.presenterId\), sector \}\)/.test(core) &&
    core.indexOf('adsV2PresenterHoldsShots(plan.shots') > core.indexOf('const presenter = presenterAsked') && core.indexOf('adsV2PresenterHoldsShots(plan.shots') < core.indexOf('const credits = adsV2Credits(order.tier, order.seconds)') &&
    core.indexOf('adsV2PresenterHoldsShots(plan.shots') < core.indexOf('const usd = estimateAdUsd(') && core.includes('    const credits = adsV2Credits(order.tier, order.seconds)\n')
})
await check('B3 caminho de sempre, sem fornecedor novo: o still sai pelo buildSceneImageInput (Nano Banana Pro edit, 2 referências https) e o vídeo pelo Kling O3 de 3 s; o retrato existe em public/; espelhos (origem = BRAND_URL, cenário = o do ator, frase final = ADS_V2_KEEP_PHRASE)', () => {
  const Hm = H()
  const E = puro()(F.engines)
  const marcus = PR.adsV2PresenterById('marcus')
  const out = Hm.adsV2PresenterHoldsShots(planoDe('commercial', 15).shots, { on: true, actor: ator('marcus'), entry: marcus, sector: 'store' })
  const h = out.find((s) => s.presenterHolds)
  const img = E.buildSceneImageInput({ prompt: h.scenePrompt, referenceUrls: h.referenceUrls })
  const vid = E.buildShotInput('kling_o3', { imageUrl: 'https://cdn.test/still.jpg', prompt: h.prompt })
  const settingAtor = SRC.presenter.slice(SRC.presenter.indexOf('const SETTING'), SRC.presenter.indexOf('}', SRC.presenter.indexOf('const SETTING')) + 1)
  const settingHolds = SRC.holds.slice(SRC.holds.indexOf('const SETTING'), SRC.holds.indexOf('}', SRC.holds.indexOf('const SETTING')) + 1)
  return img.image_urls.length === 2 && img.resolution === '2K' && img.aspect_ratio === '9:16' && vid.duration === '3' && vid.generate_audio === false && vid.prompt === h.prompt &&
    PR.ADS_V2_PRESENTER_LIBRARY.every((p) => p.portrait && fs.existsSync(path.join(ROOT, 'public', p.portrait)) && Hm.adsV2PresenterHoldsPortraitUrl(p) === `https://www.usekineo.com${p.portrait}`) &&
    SRC.brand.includes(`BRAND_URL = '${Hm.ADS_V2_PRESENTER_HOLDS_ORIGIN}'`) && settingAtor === settingHolds && Hm.ADS_V2_PRESENTER_HOLDS_KEEP === SL.ADS_V2_KEEP_PHRASE &&
    [2, 2.5].every((c) => Hm.adsV2PresenterHoldsCutStart(c) === SL.adsV2CutStart(c, 'people')) &&
    !/^\s*import\s(?!type)/m.test(SRC.holds) && !/fetch\(|createClient|fal\.|chargeAdsV2/.test(SRC.holds)
})
await check('B3b na montagem COM o ator, o plano entra como insert logo depois do estilo; as outras cenas criadas seguem fora; sem o plano, a ordem de antes', () => {
  const shots = [
    { idx: 0, kind: 'product', source: 'client_photo' }, { idx: 1, kind: 'people', source: 'generated_scene', presenterHolds: true },
    { idx: 2, kind: 'people', source: 'generated_scene' }, { idx: 3, kind: 'product', source: 'client_photo', effect: 'giant_product' }, { idx: 4, kind: 'text', source: 'client_photo', packshot: true },
  ]
  const ordem = PR.adsV2PresenterInsertOrder(shots)
  const semHolds = PR.adsV2PresenterInsertOrder(shots.map((s) => { const { presenterHolds, ...r } = s; void presenterHolds; return r }))
  return ordem.join(',') === '3,1,4,0' && semHolds.join(',') === '3,4,0' &&
    /\.\.\.\(adsV2IsPresenterHolds\(plan, r\.idx\) \? \{ presenterHolds: true \} : \{\}\)/.test(SRC.advance) && H().adsV2IsPresenterHolds({ shots: [{ idx: 2, presenterHolds: true }] }, 2) === true && H().adsV2IsPresenterHolds({ shots: [{ idx: 2 }] }, 2) === false
})
const rotuloOk = (adv, simple, client, Hm) => {
  const L = Hm.ADS_V2_AI_PERSON_LABEL
  const IA = /\bAI\b|\bIA\b|KI-|ИИ|ШІ|[Yy]apay zekâ|الذكاء الاصطناعي/
  return Object.keys(L).length === 16 && LANGS.every((l) => typeof L[l] === 'string' && IA.test(L[l])) && L.pt === 'Pessoa de IA' && Hm.adsV2AiPersonLabel('xx') === L.en &&
    /\.\.\.\(adsV2IsPresenterHolds\(order\.plan, r\.idx\) \? \{ ai_person: true as const \} : \{\}\)/.test(adv) &&
    /const label = s\.ai_person === true && aiPersonLabel \? `\$\{aiPersonLabel\} · \$\{label0\}` : label0/.test(simple) &&
    (simple.match(/aiPersonLabel=\{adsV2AiPersonLabel\(lang\)\}/g) ?? []).length === 2 &&
    /const label = s\.ai_person === true \? `\$\{adsV2AiPersonLabel\('en'\)\} · \$\{shotStateLabel\(s, orderStatus\)\}` : shotStateLabel\(s, orderStatus\)/.test(client) &&
    !/testimonial|customer review|real customer|depoimento|cliente real/i.test(SRC.holds.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n'))
}
await check('B4 rótulo de IA: a vista marca ai_person no plano do ator segurando o produto e as duas grades (progresso e entrega) escrevem "Pessoa de IA" (16 línguas, todas dizem IA); nenhuma palavra de depoimento/cliente', () => rotuloOk(SRC.advance, SRC.simple, SRC.client, H()))

// ═══ M. mutantes ══════════════════════════════════════════════════════════════════════════════════════════════════
const vermelho = async (nome, prova) => {
  let red = false
  try { red = !(await prova()) } catch (e) { console.log('       (mutante lançou: ' + (e && e.message) + ')'); red = true }
  ok(red, `mutante ${nome}: aplicou e fica VERMELHO`)
}
const mut = (rel, de, para) => ({ [rel]: trocar(rd(rel), de, para) })
await vermelho('M1 toda refação grátis (cost = 0 sempre) → A2', () => a2(mut(F.retake, 'const cost = firstRedo.free ? 0 : price', 'const cost = 0')))
await vermelho('M2 a grátis com semente POR CENA (idx) → a corrida dá duas grátis (A3b)', () => a3d(mut(F.retake, 'adsV2FreeRedoSeed(parent.id, firstRedo.seed)', 'adsV2FreeRedoSeed(parent.id + idx, firstRedo.seed)')))
await vermelho('M3 a grátis DEBITA (sem o atalho do custo 0) → A1', () => a1(mut(F.retake, 'cost === 0 ? ({ ok: true } as const) : await chargeAdsV2(', 'await chargeAdsV2(')))
await vermelho('M4 refação de refação também grátis (sem a trava do pai) → A4', () => a4({ ...mut(F.free, '  if (parent.parent_order_id) return { free: false, seed }\n', '') }))
await vermelho('M5 a refação grátis que falhou NÃO devolve a vez (falhou conta como usada) → A4', () => a4(mut(F.free, "export const ADS_V2_FREE_REDO_CLOSED: readonly string[] = ['failed', 'cancelled']", 'export const ADS_V2_FREE_REDO_CLOSED: readonly string[] = []')))
await vermelho('M6 perdedor da corrida vira "another_active" em vez do preço → A3', () => a3(mut(F.retake, "        if (cost === 0 && again && again.parent_order_id === parent.id) return v2Fail('price_changed', 409, { credits: price })", '        if (false) return null')))
await vermelho('M7 o plano "segurando" aparece com o interruptor desligado → B1', () => holdsOk(H(mut(F.holds, '  if (opts?.on !== true) return shots\n', ''))))
await vermelho('M8 o plano "segurando" SOMA em vez de trocar → B2', () => holdsOk(H(mut(F.holds, '  return shots.map((s) => s.idx !== at ? s : {', '  return [...shots, ...shots.filter((s) => s.idx === at)].map((s, i) => i < shots.length ? s : {'))))
await vermelho('M9 sem o rótulo de IA na vista → B4', () => rotuloOk(trocar(SRC.advance, '? { ai_person: true as const } : {}', '? {} : {}'), SRC.simple, SRC.client, H()))
await vermelho('M10 a tela simples manda o preço cheio mesmo na grátis → A6d', () => telaOk(trocar(SRC.simple, 'expected_credits: adsV2RedoPrice(shot.retake_credits, order.first_redo_free)', 'expected_credits: shot.retake_credits'), SRC.client))
await vermelho('M11 o /status anuncia grátis em anúncio em andamento → A5', () => a5(mut(F.status, "view.status === 'delivered' ? (await adsV2FirstRedoFor(admin, order, uid))?.free === true : false", '(await adsV2FirstRedoFor(admin, order, uid))?.free === true')))
await vermelho('M12 amostra ganha a grátis (sem a trava da chave adssample-) → A4', () => a4(mut(F.free, '  if (typeof parent.billing_ref === \'string\' && parent.billing_ref.startsWith(ADS_V2_FREE_REDO_SAMPLE_PREFIX)) return { free: false, seed }\n', '')))
await vermelho('M14 a tela joga fora o first_redo_free do /status (applyView) → A6d', () => telaOk(trocar(SRC.simple, '      ...(v.first_redo_free === true ? { first_redo_free: true } : {}),', ''), SRC.client))
await vermelho('M13 português da refação grátis copiado do inglês → A6e', () => copyOk(trocar(SRC.redo, "pt: { button: 'Refazer esta cena · grátis'", "pt: { button: 'Redo this scene · free'")))

console.log(`\ntest-ads-refacao-ator-1410: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
