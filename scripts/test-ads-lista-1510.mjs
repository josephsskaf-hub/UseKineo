// KINEO-ADS-LISTA-1510 — guardião da lista "Seus anúncios" com cara de ferramenta de agência (fundador 15/10/2026). Nada de rede,
// nada pago: readFileSync + o carregador offline (scripts/test-support/offline-ts-loader.mjs) com um banco FALSO em memória +
// `git show` da BASE = o pai do commit que criou lib/ads/adsList.ts (na árvore ainda sem commit: HEAD).
//
// O que prova:
//   A o título limpo: "perfume num hotel com chuva" com produto Perfume e a cena → "Perfume · num hotel com chuva"; sem produto, a
//     frase aparada; sem frase, o site; sem nada, "Anúncio sem título" (nas 16 línguas);
//   B nenhum travessão/hífen solto nas pontas do título, do produto ou da cena, em nenhuma combinação;
//   C os selos: Fazendo (gerando/montando, animado), Pronto, Não funcionou + o porquê (sem o erro cru), Cancelado e a aprovação
//     do cliente (Aguardando aprovação / Aprovado / Pediu ajustes; link revogado ou vencido não conta);
//   D a miniatura vem SÓ do pôster do vídeo entregue ou da foto do pedido (produto primeiro), só http(s); a linha que sai da rota
//     tem SÓ os campos da vista (sem fotos, brief, erro cru, crédito);
//   E a rota de verdade (banco falso): só o dono do workspace (o membro vê as do dono; outra conta nada), toda leitura extra
//     (pedido, vídeo, versões, aprovações) com .eq('user_id', dono) — pôster/versão/aprovação de outra conta nunca entram; o
//     "Carregar mais" (before=) só lê as mais antigas; tabela da pós-entrega ausente = 200 sem versões/aprovação;
//   F 16 línguas, todas preenchidas, com os mesmos {marcadores}; os nomes dos níveis em en/pt/es são OS MESMOS da escolha de
//     nível do quadro (ADS_V2_SIMPLE_COPY); o estilo vem do catálogo traduzido;
//   G a tela: miniatura, título, linha de detalhes, selo, busca ao lado dos chips de marca, "Carregar mais"; <style> só por
//     dangerouslySetInnerHTML; nenhuma frase de interface fixa em inglês na lista;
//   H dinheiro intocado (preço, débito, estorno, /start, /plan…) byte a byte; o diff só toca a tela, a rota e as libs novas; o
//     desfaz devolve a tela e a rota EXATAMENTE à base; todo bloco novo traz a marca;
//   M mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou (âncora única, texto mudou).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semLista1510, LISTA_1510_ARQUIVOS, MARCA_LISTA_1510 } from './test-support/desfaz-ads-lista-1510.mjs'
import { semFiel2_1510 } from './test-support/desfaz-ads-fiel-2-1510.mjs' // reancorado KINEO-ADS-FIEL-2-1510 — o conserto mais novo do Ads sai PRIMEIRO, em memória

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => semFiel2_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 64 << 20 })
const MARCA = MARCA_LISTA_1510
const criou = (() => { try { return git('log', '--format=%H', '--diff-filter=A', '--', 'lib/ads/adsList.ts').trim().split('\n').filter(Boolean).pop() || '' } catch { return '' } })()
const BASE = criou ? `${criou}^` : 'HEAD'
const PROPRIO = criou || null
const base = (rel) => { try { return git('show', `${BASE}:${rel}`).replace(/\r\n/g, '\n') } catch { return null } }
const diffDoConserto = (opts, paths = []) => (PROPRIO ? git('diff', ...opts, BASE, PROPRIO, '--', ...paths) + git('diff', ...opts, 'HEAD', '--', ...paths) : git('diff', ...opts, BASE, '--', ...paths)).replace(/\r\n/g, '\n')

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = async (fn) => { try { return !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); return false } }
const troca = (src, a, b) => { if (src.split(a).length !== 2) throw Error('âncora não única: ' + a.slice(0, 70)); const s = src.split(a).join(b); if (s === src) throw Error('mutante não aplicou'); return s }
const trecho = (s, a, b) => { const i = s.indexOf(a); const j = i < 0 ? -1 : s.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : s.slice(i, j + b.length) }

const F = {
  lib: 'lib/ads/adsList.ts',
  server: 'lib/ads/adsListServer.ts',
  ui: 'app/(dashboard)/ads/v2/AdsV2Brands.tsx',
  orders: 'app/api/ads/v2/orders/route.ts',
  brands: 'lib/ads/brands.ts',
  simple: 'lib/ads/v2Simple.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, read(f)]))

// ─── o banco falso: select (com apelidos col->>chave), eq/is/in/lt/order/limit; tabela { error } = falha ─────────────────────
const OWNER = '11111111-1111-4111-8111-111111111111'
const BIZ = '22222222-2222-4222-8222-222222222222'
const MEMBER = '33333333-3333-4333-8333-333333333333'
const OTHER = '44444444-4444-4444-8444-444444444444'
function fakeDb(init = {}) {
  const tables = JSON.parse(JSON.stringify(init))
  const log = []
  const from = (t) => {
    const st = { cols: '*', filters: [], order: null, asc: true, limit: null }
    const project = (r) => {
      if (st.cols === '*') return { ...r }
      const o = {}
      for (const part of st.cols.split(',').map((x) => x.trim()).filter(Boolean)) {
        const m = part.match(/^(?:(\w+):)?(\w+)(?:->>(\w+))?$/)
        if (!m) throw Error('select inválido: ' + part)
        const [, alias, col, key] = m
        o[alias || (key ?? col)] = key ? (r[col] && typeof r[col] === 'object' ? (r[col][key] ?? null) : null) : (r[col] ?? null)
      }
      return o
    }
    const run = () => {
      log.push({ t, filters: st.filters.slice(), cols: st.cols })
      const tab = tables[t]
      if (tab && !Array.isArray(tab)) return { data: null, error: tab.error }
      const rows = tab ?? []
      const match = (r) => st.filters.every(([k, op, v]) => (op === 'eq' ? String(r[k]) === String(v) : op === 'is' ? (r[k] ?? null) === v : op === 'in' ? v.includes(r[k]) : op === 'lt' ? String(r[k]) < String(v) : true))
      let out = rows.filter(match)
      if (st.order) out = out.slice().sort((a, b) => (st.asc ? 1 : -1) * String(a[st.order]).localeCompare(String(b[st.order])))
      if (st.limit) out = out.slice(0, st.limit)
      return { data: out.map(project), error: null }
    }
    const b = {
      select(c) { st.cols = c ?? '*'; return b },
      eq(k, v) { st.filters.push([k, 'eq', v]); return b },
      is(k, v) { st.filters.push([k, 'is', v]); return b },
      in(k, v) { st.filters.push([k, 'in', v]); return b },
      lt(k, v) { st.filters.push([k, 'lt', v]); return b },
      order(k, o) { st.order = k; st.asc = o?.ascending !== false; return b },
      limit(n) { st.limit = n; return b },
      insert() { throw Error('a lista não escreve') },
      update() { throw Error('a lista não escreve') },
      delete() { throw Error('a lista não escreve') },
      maybeSingle() { return Promise.resolve(run()).then((r) => ({ ...r, data: r.data?.[0] ?? null })) },
      then(res, rej) { return Promise.resolve(run()).then(res, rej) },
    }
    return b
  }
  return { from, tables, log }
}
let CTX = null
const mocks = {
  'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) } },
  '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: CTX.user } }) } }) },
  '@/lib/serverEvents': { writeServerEvent: async () => true },
  '@/lib/ads/serverAccess': {
    loadAdsAccess: async () => ({ admin: CTX.db, reason: 'subscriber', ownerId: CTX.ownerId, actorId: CTX.user.id, role: CTX.role }),
    adsGate: () => 'ok',
    adsSampleOpen: async () => false,
    adsSampleLevelOk: () => true,
    isMissingAdsTable: (c) => c === '42P01' || c === 'PGRST205',
  },
  '@/lib/ads/v2Access': { adsV2Visible: () => true },
  '@/lib/ads/v2Contract': { isUuid: (s) => /^[0-9a-f-]{36}$/i.test(String(s)), sanitizeAssetsBody: () => ({ ok: false }), sanitizeCreateOrderBody: () => ({ ok: false }), sanitizePatchBody: () => ({ ok: false }), applyAdsV2CopyEdit: () => null },
  '@/lib/ads/v2Tiers': { adsV2Credits: () => 0 },
  '@/lib/ads/v2Advance': { adsV2View: () => ({}), loadAdsV2Order: async () => ({ order: null, error: null }), loadAdsV2Shots: async () => [] },
  '@/lib/ads/v2Server': { v2Fail: (error, status, extra = {}) => ({ status, body: { error, ...extra } }), v2Json: (body, status = 200) => ({ status, body }), ownedFootage: async () => new Map() },
  '@/lib/ads/v2SceneServer': { adsV2SameKind: () => true, adsV2SceneForDraft: async () => ({ ok: true, fields: {} }) },
  '@/lib/safety/topicModeration': { moderateTopic: async () => ({ ok: true }) },
  '@/lib/ads/v2Pronounce': { sanitizeAdsV2Pronounce: () => null },
  '@/lib/ads/brandsServer': { isMissingBrandSchema: (c) => c === '42703' || c === 'PGRST204', orderBrandId: async () => null },
}
const loader = (over = {}) => createOfflineLoader({ mocks, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const mods = (S = SRC) => {
  const L = loader({ [F.lib]: S.lib, [F.server]: S.server, [F.orders]: S.orders })
  return { lib: L(F.lib), server: L(F.server), route: L(F.orders), simple: L(F.simple) }
}
const libOf = (S) => mods(S).lib
const req = (url) => ({ json: async () => null, nextUrl: new URL(url) })
const as = (who, db) => {
  const W = {
    solo: { user: { id: OWNER, email: 'solo@x' }, ownerId: OWNER, role: 'owner' },
    biz: { user: { id: BIZ, email: 'biz@x' }, ownerId: BIZ, role: 'owner' },
    member: { user: { id: MEMBER, email: 'm@x' }, ownerId: BIZ, role: 'member' },
    other: { user: { id: OTHER, email: 'o@x' }, ownerId: OTHER, role: 'owner' },
  }[who]
  CTX = { ...W, db }
}

// ═══ A. o título limpo ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nA. o título limpo')
const tituloOk = (L) => {
  const row = L.adsListRow({ id: 'o1', status: 'delivered', tier: 'commercial', seconds: 15, created_at: '2026-10-15T12:00:00.000Z', sentence: 'perfume num hotel com chuva', business: 'Perfume — fragrância importada', scene: 'num hotel com chuva' })
  const semCena = L.adsListRow({ id: 'o2', status: 'delivered', sentence: 'perfume num hotel com chuva', business: 'Perfume — fragrância' })
  const semProduto = L.adsListRow({ id: 'o3', status: 'generating', sentence: '  perfume   num hotel com chuva  ', business: null, scene: null })
  return row.product === 'Perfume' && row.scene === 'num hotel com chuva' && L.adsListTitle(row) === 'Perfume · num hotel com chuva' &&
    L.adsListTitle({ product: 'Perfume', scene: 'num hotel com chuva', sentence: 'perfume num hotel com chuva' }) === 'Perfume · num hotel com chuva' &&
    L.adsListTitle(semCena) === 'Perfume' && L.adsListTitle(semProduto) === 'perfume num hotel com chuva' &&
    L.adsListTitle({ product: 'Perfume', scene: 'perfume' }) === 'Perfume' &&
    L.adsListTitle({ sentence: null, link: 'https://www.loja-exemplo.com.br/p/123' }) === 'loja-exemplo.com.br' &&
    L.adsListTitle({}) === '' && L.adsListTitle({ sentence: 'x'.repeat(200) }).length <= 91 &&
    L.adsListCopy('pt').untitled === 'Anúncio sem título' && L.adsListCopy('xx') === L.ADS_LIST_COPY.en
}
ok(await tenta(() => tituloOk(libOf(SRC))), 'A1 "perfume num hotel com chuva" com produto Perfume e a cena → "Perfume · num hotel com chuva"; sem cena = o produto; sem produto = a frase aparada; sem frase = o site; sem nada = "" (a tela põe "Anúncio sem título")')

// ═══ B. nenhum travessão solto ═══════════════════════════════════════════════════════════════════════════════════════
console.log('\nB. nenhum travessão solto')
const travessaoOk = (L) => {
  const solto = /^[\s—–‒―\-·]|[\s—–‒―\-·]$/
  const casos = [
    { business: 'perfume —', scene: null, sentence: 'perfume —' },
    { business: '— perfume', scene: '— num hotel com chuva —', sentence: null },
    { business: 'Perfume - ', scene: ' - ', sentence: 'perfume - ' },
    { business: ' – ', scene: 'num hotel –', sentence: ' — perfume num hotel — ' },
    { business: null, scene: null, sentence: ' —— ' },
    { business: 'Gabi Perfumes — perfume — rosé', scene: 'na praia ·', sentence: 'x' },
    { business: '', scene: '', sentence: '- perfume num hotel com chuva -' },
  ]
  const titulos = casos.map((c) => L.adsListTitle(L.adsListRow({ id: 'x', status: 'delivered', ...c })))
  return titulos.every((t) => !solto.test(t)) && titulos.every((t) => !/[—–-]\s*·|·\s*[—–-]/.test(t)) &&
    L.adsListProduct('perfume —') === 'perfume' && L.adsListProduct(' — ') === null && L.adsListProduct('Gabi Perfumes — perfume') === 'Gabi Perfumes' &&
    L.adsListClean('— num hotel com chuva —') === 'num hotel com chuva' && titulos[0] === 'perfume' && titulos[1] === 'perfume · num hotel com chuva' && titulos[4] === ''
}
ok(await tenta(() => travessaoOk(libOf(SRC))), 'B1 nenhum título começa ou termina com travessão/hífen/ponto, nem "— ·" no meio, em 7 combinações tortas de produto/cena/frase')

// ═══ C. os selos ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. os selos (estado + aprovação do cliente)')
const NOW = Date.parse('2026-10-15T12:00:00.000Z')
const selosOk = (L) => {
  const fut = '2026-10-20T00:00:00.000Z'
  const pas = '2026-10-10T00:00:00.000Z'
  const ap = (rows) => L.adsListApproval(rows, NOW)
  return L.adsListPill({ status: 'generating' }) === 'making' && L.adsListPill({ status: 'assembling' }) === 'making' &&
    L.adsListPill({ status: 'delivered' }) === 'ready' && L.adsListPill({ status: 'failed' }) === 'failed' && L.adsListPill({ status: 'cancelled' }) === 'cancelled' &&
    L.adsListPill({ status: 'delivered', approval: 'pending' }) === 'needs_approval' && L.adsListPill({ status: 'delivered', approval: 'approved' }) === 'approved' &&
    L.adsListPill({ status: 'delivered', approval: 'changes_requested' }) === 'changes' && L.adsListPill({ status: 'failed', approval: 'approved' }) === 'failed' &&
    ap([]) === null && ap([{ status: 'pending', expires_at: fut, created_at: '1' }]) === 'pending' && ap([{ status: 'pending', expires_at: pas, created_at: '1' }]) === null &&
    ap([{ status: 'approved', created_at: '1' }, { status: 'pending', expires_at: fut, revoked_at: '2026-10-14', created_at: '2' }]) === 'approved' &&
    ap([{ status: 'approved', created_at: '1' }, { status: 'changes_requested', created_at: '2' }]) === 'changes_requested' &&
    ap([{ status: 'revoked', created_at: '3' }, { status: 'changes_requested', created_at: '2' }]) === 'changes_requested' &&
    L.adsListFailWhy('failed', 'charge_insufficient') === 'charge' && L.adsListFailWhy('failed', 'moderation:x') === 'rules' && L.adsListFailWhy('failed', 'creatomate_failed:boom') === 'other' &&
    L.adsListFailWhy('delivered', 'charge_x') === null &&
    L.adsListVersions([]) === 1 && L.adsListVersions([{ status: 'delivered' }, { status: 'rendering' }, { status: 'failed' }]) === 3
}
ok(await tenta(() => selosOk(libOf(SRC))), 'C1 Fazendo (gerando/montando) · Pronto · Não funcionou (+ porquê: crédito / regra / devolvido) · Cancelado · Aguardando aprovação / Aprovado / Pediu ajustes (o link mais novo que vale; revogado e pendente vencido não contam); versões = 1 + as que não falharam')
const animadoOk = (L) => /\.adl-pill\.making>i\{animation:adl-pulse/.test(L.ADS_LIST_CSS) && /@keyframes adl-pulse/.test(L.ADS_LIST_CSS) && /prefers-reduced-motion:reduce\)\{[^}]*\.adl-pill\.making>i\{animation:none\}/.test(L.ADS_LIST_CSS)
ok(await tenta(() => animadoOk(libOf(SRC))), 'C2 "Fazendo" pulsa de leve (e para com prefers-reduced-motion)')

// ═══ D. a miniatura e os campos que saem ═════════════════════════════════════════════════════════════════════════════
console.log('\nD. a miniatura só dos campos permitidos')
const CAMPOS = ['id', 'status', 'tier', 'seconds', 'video_id', 'created_at', 'sentence', 'link', 'product', 'scene', 'style', 'format', 'thumb', 'thumb_from', 'fail_why', 'versions', 'approval']
const miniOk = (L) => {
  const photos = [{ footage_id: 'f1', kind: 'place', url: 'https://cdn.x/place.jpg' }, { footage_id: 'f2', kind: 'product', url: 'https://cdn.x/product.jpg' }]
  const a = L.adsListThumb({ poster: 'https://cdn.x/poster.jpg', photos })
  const b = L.adsListThumb({ poster: null, photos })
  const c = L.adsListThumb({ poster: 'javascript:alert(1)', photos: [{ kind: 'product', url: 'renders/u/abc.png' }, { kind: 'place', url: 'data:image/png;base64,AA' }] })
  const d = L.adsListThumb({ poster: null, photos: [{ kind: 'people', url: 'https://cdn.x/p.jpg' }] })
  const row = L.adsListRow({ id: 'o', status: 'failed', tier: 'cinema', seconds: 20, video_id: null, created_at: 'x', brand_id: 'b', sentence: 's', link: null, photos, business: 'Perfume — x', scene: 'cena', style: 'giant_product', format: '4:5', error: 'creatomate_failed: http 500 renders/OWNER/abc', logo_url: 'https://cdn.x/logo.png', card_url: 'https://cdn.x/card.png', credits_charged: 90, billing_ref: 'r', brief: { a: 1 }, plan: { b: 1 } }, { poster: null })
  const row2 = L.adsListRow({ id: 'o', status: 'delivered', style: 'nao_existe', format: '16:9', logo_url: 'https://cdn.x/logo.png', card_url: 'https://cdn.x/card.png' }, {})
  return L.ADS_LIST_THUMB_FIELDS.join() === 'poster,photo' &&
    a.src === 'https://cdn.x/poster.jpg' && a.from === 'poster' && b.src === 'https://cdn.x/product.jpg' && b.from === 'photo' && c === null && d.src === 'https://cdn.x/p.jpg' &&
    Object.keys(row).sort().join() === [...CAMPOS, 'brand_id'].sort().join() && row.thumb === 'https://cdn.x/product.jpg' && row.fail_why === 'other' && row.style === 'giant_product' && row.format === '4:5' &&
    !JSON.stringify(row).includes('renders/OWNER') && !JSON.stringify(row).includes('logo') && !JSON.stringify(row).includes('card') &&
    row2.thumb === null && row2.style === null && row2.format === '9:16' && !('brand_id' in row2)
}
ok(await tenta(() => miniOk(libOf(SRC))), 'D1 miniatura = pôster do vídeo entregue, senão a foto de PRODUTO (senão a 1ª foto), só http(s) — logo, cartão final, caminho do bucket, data: e javascript: nunca; a linha sai SÓ com os campos da vista (sem fotos, brief, plano, erro cru, crédito)')

// ═══ E. a rota de verdade: só o dono ═════════════════════════════════════════════════════════════════════════════════
console.log('\nE. a rota: só o dono do workspace, toda leitura com .eq(user_id)')
const ordem = (id, user, created, extra = {}) => ({ id, user_id: user, status: 'delivered', tier: 'commercial', seconds: 15, video_id: null, created_at: created, brand_id: null, error: null, photos: null, brief: { sentence: 'perfume num hotel com chuva', business: 'Perfume — fragrância', scene: 'num hotel com chuva' }, plan: { style: 'giant_product' }, credits_charged: 90, ...extra })
const banco = (over = {}) => fakeDb({
  ads_v2_orders: [
    ordem('a1', BIZ, '2026-10-15T10:00:00.000Z', { video_id: 'v-biz', photos: [{ kind: 'product', url: 'https://cdn.x/biz-product.jpg' }] }),
    ordem('a2', BIZ, '2026-10-15T09:00:00.000Z', { status: 'generating', video_id: 'v-other', photos: [{ kind: 'product', url: 'https://cdn.x/a2.jpg' }] }),
    ordem('a3', BIZ, '2026-10-14T09:00:00.000Z', { status: 'failed', error: 'charge_insufficient' }),
    ordem('a4', BIZ, '2026-10-13T09:00:00.000Z', { status: 'draft' }),
    ordem('x1', OTHER, '2026-10-15T11:00:00.000Z', { video_id: 'v-other' }),
  ],
  videos: [{ id: 'v-biz', user_id: BIZ, thumbnail_url: 'https://cdn.x/biz-poster.jpg' }, { id: 'v-other', user_id: OTHER, thumbnail_url: 'https://cdn.x/OTHER-poster.jpg' }],
  ads_v2_versions: [{ order_id: 'a1', user_id: BIZ, status: 'delivered' }, { order_id: 'a1', user_id: BIZ, status: 'failed' }, { order_id: 'a1', user_id: OTHER, status: 'delivered' }],
  ads_v2_approvals: [{ order_id: 'a1', user_id: BIZ, status: 'pending', expires_at: '2099-01-01T00:00:00.000Z', revoked_at: null, created_at: '2026-10-15T10:30:00.000Z' }, { order_id: 'a3', user_id: OTHER, status: 'approved', expires_at: '2099-01-01T00:00:00.000Z', revoked_at: null, created_at: '2026-10-15T10:30:00.000Z' }],
  ...over,
})
const rotaOk = async (S) => {
  const { route } = mods(S)
  const db = banco()
  as('member', db)
  const g = await route.GET(req('http://x/api/ads/v2/orders?list=brands'))
  const rows = g.body.orders ?? []
  const a1 = rows.find((r) => r.id === 'a1'), a2 = rows.find((r) => r.id === 'a2'), a3 = rows.find((r) => r.id === 'a3')
  const leituras = db.log.filter((l) => ['ads_v2_orders', 'videos', 'ads_v2_versions', 'ads_v2_approvals'].includes(l.t))
  const todasDoDono = leituras.length >= 5 && leituras.every((l) => l.filters.some(([k, op, v]) => k === 'user_id' && op === 'eq' && v === BIZ))
  as('other', db)
  const go = await route.GET(req('http://x/api/ads/v2/orders?list=brands'))
  as('solo', db)
  const gs = await route.GET(req('http://x/api/ads/v2/orders?list=brands'))
  as('biz', db)
  const gb = await route.GET(req('http://x/api/ads/v2/orders?list=brands&before=2026-10-15T09:30:00.000Z'))
  const gx = await route.GET(req('http://x/api/ads/v2/orders?list=brands&before=lixo'))
  const semPos = banco({ ads_v2_versions: { error: { code: '42P01' } }, ads_v2_approvals: { error: { code: 'PGRST205' } } })
  as('biz', semPos)
  const gp = await route.GET(req('http://x/api/ads/v2/orders?list=brands'))
  return g.status === 200 && rows.map((r) => r.id).join() === 'a1,a2,a3' &&
    a1.thumb === 'https://cdn.x/biz-poster.jpg' && a1.thumb_from === 'poster' && a1.versions === 2 && a1.approval === 'pending' && a1.product === 'Perfume' && a1.scene === 'num hotel com chuva' && a1.style === 'giant_product' &&
    a2.thumb === 'https://cdn.x/a2.jpg' && a2.thumb_from === 'photo' && a3.approval === null && a3.fail_why === 'charge' &&
    rows.every((r) => Object.keys(r).every((k) => [...CAMPOS, 'brand_id'].includes(k))) && !JSON.stringify(g.body).includes('OTHER') && !JSON.stringify(g.body).includes('charge_insufficient') && !JSON.stringify(g.body).includes('credits_charged') &&
    todasDoDono && go.body.orders.map((r) => r.id).join() === 'x1' && gs.body.orders.length === 0 &&
    gb.body.orders.map((r) => r.id).join() === 'a2,a3' && gx.body.orders.map((r) => r.id).join() === 'a1,a2,a3' &&
    gp.status === 200 && gp.body.orders.length === 3 && gp.body.orders[0].versions === 1 && gp.body.orders[0].approval === null && gp.body.orders[0].thumb === 'https://cdn.x/biz-poster.jpg'
}
ok(await tenta(() => rotaOk(SRC)), 'E1 rota de verdade: o MEMBRO vê os pedidos do DONO (rascunho fora); pôster, versões e aprovação de OUTRA conta nunca entram (mesmo com o mesmo video_id/order_id); toda leitura (pedido, vídeo, versões, aprovações) com .eq(user_id, dono); outra conta vê só os dela; before= só as mais antigas (lixo = ignorado); pós-entrega sem tabela = 200 sem versões/aprovação')
const semColunaOk = async (S) => {
  const { route } = mods(S)
  // a coluna brand_id ainda não existe: a lista de sempre (sem marca), com os mesmos campos da vista e o mesmo cursor
  const db = banco()
  const orig = db.from
  db.from = (t) => {
    const b = orig(t)
    const sel = b.select
    b.select = (c) => (t === 'ads_v2_orders' && /brand_id/.test(c ?? '') ? { eq: () => ({ in: () => ({ eq: () => ({}), is: () => ({}), lt: () => ({ order: () => ({ limit: async () => ({ data: null, error: { code: '42703' } }) }) }), order: () => ({ limit: async () => ({ data: null, error: { code: '42703' } }) }) }) }) } : sel(c))
    return b
  }
  as('biz', db)
  const g = await route.GET(req('http://x/api/ads/v2/orders?list=brands&before=2026-10-15T09:30:00.000Z'))
  return g.status === 200 && g.body.brands_ready === false && g.body.orders.map((r) => r.id).join() === 'a2,a3' && g.body.orders.every((r) => !('photos' in r) && !('error' in r) && 'thumb' in r && !('brand_id' in r))
}
ok(await tenta(() => semColunaOk(SRC)), 'E2 sem a coluna brand_id (marcas não aplicadas): a lista de sempre, com os mesmos campos da vista e o mesmo "Carregar mais"')
const rotaTextoOk = (S) => {
  const l = trecho(S.orders, "if (req.nextUrl.searchParams.get('list') === 'brands') {", "\n    } // KINEO-ADS-MARCAS-1510\n")
  return l.includes(".eq('user_id', uid).in('status', [...AD_BRAND_LIST_STATUSES])") && (l.match(/await adsListEnrich\(admin, uid, /g) || []).length === 2 &&
    !/v2Json\(\{ orders: (l|o)\.data/.test(l) && S.server.includes(".eq('user_id', uid).in(key, ids)") && !/\.(insert|update|upsert|delete|rpc)\(/.test(S.server)
}
ok(await tenta(() => rotaTextoOk(SRC)), 'E3 no texto: as 2 saídas da lista passam por adsListEnrich(admin, uid, …) (nenhuma devolve a linha crua); a leitura extra é .eq(user_id, uid).in(…) e o servidor da lista não escreve nada')

// ═══ F. 16 línguas ═══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nF. 16 línguas')
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const copyOk = (M) => {
  const L = M.lib
  const flat = (o) => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? Object.entries(v).map(([k2, v2]) => [`${k}.${k2}`, v2]) : [[k, v]]))
  const en = Object.fromEntries(flat(L.ADS_LIST_COPY.en))
  const keys = Object.keys(en)
  const simples = M.simple.ADS_V2_SIMPLE_COPY
  return Object.keys(L.ADS_LIST_COPY).length === 16 && LANGS.every((l) => {
    const c = Object.fromEntries(flat(L.ADS_LIST_COPY[l]))
    const iguais = keys.filter((k) => c[k] === en[k]).length
    return keys.every((k) => typeof c[k] === 'string' && c[k].trim()) && Object.keys(c).length === keys.length &&
      ['{q}', '{n}'].every((ph) => keys.every((k) => en[k].includes(ph) === c[k].includes(ph))) && (l === 'en' || iguais <= 3)
  }) && ['en', 'pt', 'es'].every((l) => ['photo_motion', 'commercial', 'cinema'].every((t) => L.ADS_LIST_COPY[l].tier[t] === simples[l].tiers[t].name)) &&
    L.adsListStyleLabel('giant_product', 'pt') !== L.adsListStyleLabel('giant_product', 'en') && L.adsListStyleLabel('nada', 'pt') === null &&
    L.adsListTier('cinema', L.adsListCopy('pt')) === 'Premium' && L.adsListTier('photo_motion', L.adsListCopy('en')) === 'Standard'
}
ok(await tenta(() => copyOk(mods(SRC))), 'F1 16 línguas, todas preenchidas, mesmos {q}/{n}; nenhuma cai no inglês (≤ 3 iguais, ex.: "Premium"); níveis em en/pt/es = os da escolha de nível do quadro; estilo do catálogo traduzido')

// ═══ G. a tela ═══════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG. a tela')
const telaOk = (S) => {
  const lista = trecho(S.ui, 'export function AdsBrandOrders(', '\n}\n')
  return lista.includes('<style dangerouslySetInnerHTML={{ __html: ADS_LIST_CSS }} />') && !/<style>\s*\{/.test(S.ui) &&
    lista.includes('className="adl-th"') && lista.includes('{o.thumb ? <img src={o.thumb} alt=""') && (lista.match(/src=\{/g) || []).length === 1 &&
    lista.includes('const titleOf = (o: ListedOrder) => adsListTitle(o) || lc.untitled') && lista.includes('<span className="t" title={title}>{title}</span>') &&
    lista.includes('<div className="adl-meta">{metaOf(o)}</div>') && /adsListStyleLabel\(o\.style, lang\), adsListTier\(o\.tier, lc\), o\.format, `\$\{o\.seconds\}s`, when\(o\.created_at\), o\.versions > 1/.test(lista) &&
    lista.includes('const pill = adsListPill(o)') && lista.includes('{lc.pill[pill]}{why ? <small>· {lc.why[why]}</small> : null}') &&
    lista.includes('data-kineo="ads-list-search"') && lista.indexOf('data-kineo="ads-brand-filter"') < lista.indexOf('data-kineo="ads-list-search"') && lista.includes('placeholder={lc.search} aria-label={lc.searchLabel}') &&
    lista.includes('adsListMatches(') && lista.includes('data-kineo="ads-list-more"') && lista.includes('`&before=${encodeURIComponent(before)}`') && lista.includes('r.data.orders.length >= ADS_LIST_BATCH') &&
    lista.includes('`/api/ads/v2/orders?list=brands${q}`') && lista.includes('adBrandFilterOrders(r.data.orders, filter)') &&
    !/>\s*(Making|Ready|Failed|Search|Load more|Untitled)\s*</.test(lista) && !/'(Making|Ready|Failed|Load more|Search ads)'/.test(lista)
}
ok(await tenta(() => telaOk(SRC)), 'G1 a linha: miniatura (só o.thumb), título limpo, linha de detalhes (estilo, nível, formato, duração, data e hora, versões), selo com o porquê; busca ao lado dos chips de marca; "Carregar mais" com before=; <style> só por dangerouslySetInnerHTML; nada de rótulo fixo em inglês')

// ═══ H. dinheiro intocado + desfaz ═══════════════════════════════════════════════════════════════════════════════════
console.log('\nH. dinheiro intocado e o desfaz')
const INTOCADOS = ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/plan/route.ts', 'lib/ads/v2PlanCore.ts', 'app/api/ads/v2/variations/route.ts', 'app/api/ads/v2/retake/route.ts', 'lib/ads/v2Batch.ts', 'lib/credits/refund.ts', 'lib/credits/debit.ts', 'lib/ads/sample.ts', 'lib/ads/v2Advance.ts', 'lib/ads/v2PostDeliveryServer.ts', 'app/api/ads/v2/approval/route.ts', 'lib/ads/workspace.ts', 'lib/ads/serverAccess.ts', 'lib/ads/brands.ts', 'lib/ads/brandsServer.ts', 'app/(dashboard)/ads/v2/AdsV2Client.tsx', 'app/ads/AdsPaywall.tsx']
ok(INTOCADOS.every((f) => base(f) !== null && read(f) === base(f)), `H1 ${INTOCADOS.length} arquivos de dinheiro/acesso/pós-entrega/paywall byte a byte iguais à base (${BASE}): nenhum preço, débito, estorno ou porta nova`)
const PERMITIDOS = new Set([F.lib, F.server, F.ui, F.orders])
const escopoOk = () => {
  const t = [...new Set([...diffDoConserto(['--name-only']).split('\n'), ...git('ls-files', '--others', '--exclude-standard').split('\n')].map((l) => l.trim()).filter(Boolean))]
  return t.length > 0 && t.every((f) => PERMITIDOS.has(f) || f.startsWith('scripts/'))
}
ok(await tenta(escopoOk), 'H2 o diff deste conserto só toca a tela (AdsV2Brands), a rota /orders, as 2 libs novas e scripts/')
const desfeitoOk = (S) => LISTA_1510_ARQUIVOS.length === 2 && [['ui', F.ui], ['orders', F.orders]].every(([k, f]) => LISTA_1510_ARQUIVOS.includes(f) && semLista1510(f, S[k]) === base(f))
ok(await tenta(() => desfeitoOk(SRC)), 'H3 desfeito este conserto (scripts/test-support/desfaz-ads-lista-1510.mjs), AdsV2Brands e /orders são EXATAMENTE a base — POST e PATCH do /orders intocados')
const blocosMarcados = () => [F.ui, F.orders].every((f) => {
  const d = diffDoConserto(['-U0', '--no-color'], [f])
  const blocos = d.split('\n@@').slice(1).map((h) => h.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')))
  return blocos.length > 0 && blocos.every((b) => b.length === 0 || b.some((l) => l.includes(MARCA)))
})
ok(await tenta(blocosMarcados), 'H4 todo bloco novo na tela e na rota traz a marca KINEO-ADS-LISTA-1510')
const semDinheiroOk = (S) => {
  const lista = trecho(S.ui, 'export function AdsBrandOrders(', '\n}\n')
  const novos = [S.lib, S.server, lista].join('\n').split('\n')
  return !novos.some((l) => /adsV2Credits|chargeAdsV2|debit|refund|stripe|checkout\.|price_id|engineCost|video_credits|credits_charged|billing_ref/.test(l))
}
ok(await tenta(() => semDinheiroOk(SRC)), 'H5 a lib, o servidor e a tela da lista não tocam crédito, débito, estorno, checkout, cobrança nem preço')

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (todos têm de ficar vermelhos)')
const mut = async (nome, chave, de, para, checa) => {
  let S2
  try { S2 = { ...SRC, [chave]: troca(SRC[chave], de, para) } } catch (e) { fail++; console.log('  FAIL ' + nome + ' (' + e.message + ')'); return }
  const verde = await tenta(() => checa(S2))
  ok(!verde, nome + ' fica vermelho')
}
await mut('M1 o título perde o separador " · "', 'lib', '? `${product} · ${scene}` : product', '? `${product} ${scene}` : product', (S) => tituloOk(libOf(S)))
await mut('M2 o travessão solto volta', 'lib', SRC.lib.split('\n').find((l) => l.includes('const t = s.replace(')), '    const t = s.trim()', (S) => travessaoOk(libOf(S)))
await mut('M3 aprovação pendente vira "Pronto"', 'lib', "  if (o.approval === 'pending') return 'needs_approval'\n", '', (S) => selosOk(libOf(S)))
await mut('M4 link revogado ainda conta', 'lib', "    if (r.revoked_at || r.status === 'revoked') continue\n", '', (S) => selosOk(libOf(S)))
await mut('M5 a miniatura aceita qualquer texto (caminho do bucket)', 'lib', "  if (!/^https?:\\/\\//i.test(s)) return null\n", '', (S) => miniOk(libOf(S)))
await mut('M6 a linha passa o pedido cru (fotos e erro saem)', 'lib', '  if (\'brand_id\' in row) item.brand_id', '  Object.assign(item, { photos: row.photos, error: row.error })\n  if (\'brand_id\' in row) item.brand_id', (S) => miniOk(libOf(S)))
await mut('M7 a leitura extra esquece o dono', 'server', ".select(cols).eq('user_id', uid).in(key, ids)", '.select(cols).in(key, ids)', rotaOk)
await mut('M8 a rota devolve a linha crua', 'orders', 'return v2Json({ orders: await adsListEnrich(admin, uid, l.data ?? []), brands_ready: true })', 'return v2Json({ orders: l.data ?? [], brands_ready: true })', rotaOk)
await mut('M9 o "Carregar mais" ignora o cursor', 'orders', "      if (antes) q = q.lt('created_at', antes) // KINEO-ADS-LISTA-1510\n", '', rotaOk)
await mut('M10 uma língua cai no inglês', 'lib', "pt: { search: 'Buscar anúncios', searchLabel: 'Buscar nos seus anúncios', clear: 'Limpar busca'", "pt: { search: 'Search ads', searchLabel: 'Search your ads', clear: 'Clear search'", (S) => copyOk(mods(S)))
await mut('M11 o nível perde a coerência com o quadro', 'lib', "tier: T('Standard', 'Commercial', 'Premium') },", "tier: T('Photo motion', 'Commercial', 'Premium') },", (S) => copyOk(mods(S)))
await mut('M12 a busca some da tela', 'ui', '          <div className="adl-search" role="search" data-kineo="ads-list-search">', '          <div className="adl-search" role="search">', telaOk)
await mut('M13 mudança fora do conserto na rota', 'orders', "    const id = req.nextUrl.searchParams.get('id')", "    const id = req.nextUrl.searchParams.get('id') ?? null", desfeitoOk)

console.log(`\ntest-ads-lista-1510: ${pass} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
