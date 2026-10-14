// KINEO-ADS-MARCAS-1510 — guardião das MARCAS (clientes) do Studio Ads (fundador 15/10/2026: "Ads perfeito para agência usar
// sozinha, hoje"; Studio Ads fica fora da TRAVA 8.2). Nada de rede, nada pago: readFileSync + o carregador offline
// (scripts/test-support/offline-ts-loader.mjs) com um banco FALSO em memória + `git show` da BASE = o pai do commit que criou
// lib/ads/brands.ts (na árvore ainda sem commit: HEAD).
//
// O que prova:
//   A regras de CRUD: corpo limpo (owner_id/created_by/archived_at nunca vêm do corpo), nome obrigatório e único, cores, site,
//     pronúncia (a régua do anúncio), teto (Business/interna 50, o resto 1), arquivar só o dono, nada é apagado de verdade —
//     rodando a rota /api/ads/brands de verdade contra o banco falso, como dono sozinho, dono do Business e membro da equipe;
//   B RLS da migration: RLS ligado, anon sem nada, authenticated só SELECT, UMA policy de leitura (dono OU membro ativo da equipe
//     Business do dono), nenhuma policy/grant de escrita, função security definer com search_path fixo;
//   C sem a tabela (migration não aplicada): GET { ready:false }, escrita 503, pedido nasce sem brand_id, lista sem a coluna, e a
//     tela cai no kit único de sempre (useAdsBrands → 'legacy'; o kit único só roda em 'legacy'; sem a prop = 'legacy');
//   D trocar de marca preenche o kit: sai o que a anterior pôs (só o que a pessoa não mexeu), entra a nova (só campo vazio);
//   E a regra de conflito do KINEO-ADS-PALCO-VOLTAR-1410 continua: marca de outra empresa nunca entra calada (mesma função
//     brandKitConflict); "Trocar para X" só no clique;
//   F o pedido grava brand_id: só marca viva DO DONO (outra conta, arquivada, lixo ou sem tabela = null); tela, lote e rota;
//   G a lista filtra por marca (todas / uma / sem marca) — a regra pura e a rota;
//   H o kit antigo vira a 1ª marca: a regra pura, a migração idempotente na rota e o backfill da migration;
//   I a tela: o seletor no topo do formulário (caixa do motor do Studio), "+ Nova marca"/"Editar marca", a janela, a lista,
//     16 línguas, <style> só por dangerouslySetInnerHTML;
//   J dinheiro intocado (v2Tiers, v2Billing, v2StartCore, /start, /plan, /variations, v2Batch, refund, debit, sample, kit antigo,
//     workspace) e o desfaz deste conserto devolve os 4 arquivos tocados EXATAMENTE à base; todo bloco novo traz a marca;
//   M mutantes (12): cada regra quebrada fica vermelha, e cada mutante prova que aplicou (âncora única, texto mudou).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semMarcas1510, MARCAS_1510_ARQUIVOS, MARCA_MARCAS_1510 } from './test-support/desfaz-ads-marcas-1510.mjs'
import { desfazPosEntrega1510 } from './test-support/desfaz-ads-pos-entrega-1510.mjs' // reancorado KINEO-LEVA-ADS-AGENCIA-1510 — o painel depois da entrega (pos-entrega, outra pista da mesma leva) sai em memória DEPOIS das marcas, antes do byte a byte

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 64 << 20 })
const MARCA = MARCA_MARCAS_1510
const criou = (() => { try { return git('log', '--format=%H', '--diff-filter=A', '--', 'lib/ads/brands.ts').trim().split('\n').filter(Boolean).pop() || '' } catch { return '' } })()
const BASE = criou ? `${criou}^` : 'HEAD'
const PROPRIO = criou || null // reancorado KINEO-LEVA-ADS-AGENCIA-1510 — o commit que criou as marcas: J3 mede BASE→PROPRIO (+ o não commitado), nunca a árvore inteira contra a base
const base = (rel) => { try { return git('show', `${BASE}:${rel}`).replace(/\r\n/g, '\n') } catch { return null } }

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = async (fn) => { try { return !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); return false } }
const troca = (src, a, b) => { if (src.split(a).length !== 2) throw Error('âncora não única: ' + a.slice(0, 70)); const s = src.split(a).join(b); if (s === src) throw Error('mutante não aplicou'); return s }
const trecho = (s, a, b) => { const i = s.indexOf(a); const j = i < 0 ? -1 : s.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : s.slice(i, j + b.length) }

const F = {
  lib: 'lib/ads/brands.ts',
  server: 'lib/ads/brandsServer.ts',
  route: 'app/api/ads/brands/route.ts',
  sql: 'migrations_pending/2026-10-15_ad_brands.sql',
  ui: 'app/(dashboard)/ads/v2/AdsV2Brands.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  batch: 'app/(dashboard)/ads/v2/AdsV2Batch.tsx',
  orders: 'app/api/ads/v2/orders/route.ts',
  palco: 'lib/ads/v2PalcoVoltar.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, read(f)]))

// ─── o banco falso (só o que as rotas usam: select/insert/update + eq/is/in/order/limit/maybeSingle) ──────────────────────
const OWNER = '11111111-1111-4111-8111-111111111111'
const BIZ = '22222222-2222-4222-8222-222222222222'
const MEMBER = '33333333-3333-4333-8333-333333333333'
const OTHER = '44444444-4444-4444-8444-444444444444'
const LOGO_BIZ = 'aaaaaaaa-0000-4000-8000-000000000001'
const LOGO_OTHER = 'aaaaaaaa-0000-4000-8000-000000000002'
const norm = (s) => String(s ?? '').trim().toLowerCase()
function fakeDb(init = {}) {
  const tables = JSON.parse(JSON.stringify(init))
  const log = []
  const unique = {
    ad_brands: (rows, r) => rows.some((x) => x.owner_id === r.owner_id && ((!x.archived_at && norm(x.name) === norm(r.name)) || (x.from_legacy_kit && r.from_legacy_kit))),
  }
  const from = (t) => {
    const st = { op: 'select', filters: [], payload: null, single: false, order: null, limit: null }
    const run = () => {
      const tab = tables[t]
      if (tab && !Array.isArray(tab)) return { data: null, error: tab.error }
      const rows = tab ?? (tables[t] = [])
      const match = (r) => st.filters.every(([k, op, v]) => (op === 'eq' ? String(r[k]) === String(v) : op === 'is' ? (r[k] ?? null) === v : op === 'in' ? v.includes(r[k]) : true))
      if (st.op === 'insert') {
        const recs = Array.isArray(st.payload) ? st.payload : [st.payload]
        const out = []
        for (const rec of recs) {
          if (unique[t]?.(rows, rec)) return { data: null, error: { code: '23505' } }
          const row = { id: crypto.randomUUID(), archived_at: null, from_legacy_kit: false, created_by: null, ...rec }
          rows.push(row)
          out.push(row)
        }
        log.push(['insert', t, recs])
        return { data: st.single ? out[0] ?? null : out, error: null }
      }
      if (st.op === 'update') {
        const hit = rows.filter(match)
        hit.forEach((r) => Object.assign(r, st.payload))
        log.push(['update', t, st.payload])
        return { data: st.single ? hit[0] ?? null : hit, error: null }
      }
      if (st.op === 'delete') { log.push(['delete', t]); return { data: null, error: null } }
      let out = rows.filter(match)
      if (st.order) out = out.slice().sort((a, b) => String(a[st.order]).localeCompare(String(b[st.order])))
      if (st.limit) out = out.slice(0, st.limit)
      return { data: st.single ? out[0] ?? null : out, error: null }
    }
    const b = {
      select() { return b },
      insert(p) { st.op = 'insert'; st.payload = p; return b },
      update(p) { st.op = 'update'; st.payload = p; return b },
      delete() { st.op = 'delete'; return b },
      eq(k, v) { st.filters.push([k, 'eq', v]); return b },
      is(k, v) { st.filters.push([k, 'is', v]); return b },
      in(k, v) { st.filters.push([k, 'in', v]); return b },
      order(k) { st.order = k; return b },
      limit(n) { st.limit = n; return b },
      maybeSingle() { st.single = true; return Promise.resolve(run()) },
      then(res, rej) { return Promise.resolve(run()).then(res, rej) },
    }
    return b
  }
  return { from, tables, log }
}
const FOOT = { [BIZ]: new Set([LOGO_BIZ]), [OTHER]: new Set([LOGO_OTHER]), [OWNER]: new Set() }
let CTX = null
const mocks = {
  'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) } },
  '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: CTX.user } }) } }) },
  '@/lib/ads/serverAccess': {
    loadAdsAccess: async () => ({ admin: CTX.db, reason: CTX.reason, ownerId: CTX.ownerId, actorId: CTX.user.id, role: CTX.role, ownerPlan: CTX.ownerPlan }),
    adsGate: (r) => (r === 'none' ? 'no_access' : 'ok'),
    adsSampleOpen: async () => false,
    isMissingAdsTable: (c) => c === '42P01' || c === 'PGRST205',
  },
  '@/lib/ads/v2Access': { adsV2Visible: () => true },
  '@/lib/serverEvents': { writeServerEvent: async () => true },
  '@/lib/ads/v2Server': {
    v2Fail: (error, status, extra = {}) => ({ status, body: { error, ...extra } }),
    v2Json: (body, status = 200) => ({ status, body }),
    ownedFootage: async (_a, owner, ids) => new Map(ids.filter((i) => FOOT[owner]?.has(i)).map((i) => [i, { url: `https://x/${owner}/${i}.png`, isImage: true, isPng: true }])),
  },
}
const loader = (over = {}) => createOfflineLoader({ mocks, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const mods = (S = SRC) => {
  const L = loader({ [F.lib]: S.lib, [F.server]: S.server, [F.route]: S.route })
  return { lib: L(F.lib), server: L(F.server), route: L(F.route), kitUx: L('lib/ads/v2SimpleUx.ts'), palco: L(F.palco) }
}
const req = (body, url = 'http://x/api/ads/brands') => ({ json: async () => body, nextUrl: new URL(url) })
const as = (who, db) => {
  const W = {
    solo: { user: { id: OWNER, email: 'solo@x' }, reason: 'subscriber', ownerId: OWNER, role: 'owner', ownerPlan: 'pro' },
    biz: { user: { id: BIZ, email: 'biz@x' }, reason: 'subscriber', ownerId: BIZ, role: 'owner', ownerPlan: 'business' },
    member: { user: { id: MEMBER, email: 'm@x' }, reason: 'subscriber', ownerId: BIZ, role: 'member', ownerPlan: 'business' },
    other: { user: { id: OTHER, email: 'o@x' }, reason: 'subscriber', ownerId: OTHER, role: 'owner', ownerPlan: 'business' },
  }[who]
  CTX = { ...W, db }
}

// ═══ A. CRUD ═════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nA. regras de CRUD')
const regrasOk = (L) => {
  const s = L.sanitizeAdBrand
  const good = s({ name: '  Gabi   Perfumes ', color: '#AA3355', color2: '#111111', website: 'gabiperfumes.com.br', contact: '@gabi', price: 'R$ 99', voice_language: 'PT', pronounce_say: 'gá-bi', notes: 'cliente desde 2025' })
  return good.ok && good.value.name === 'Gabi Perfumes' && good.value.color === '#aa3355' && good.value.website === 'https://gabiperfumes.com.br' && good.value.voice_language === 'pt' &&
    !s({ name: 'X', owner_id: OTHER }).ok && !s({ name: 'X', created_by: OTHER }).ok && !s({ name: 'X', archived_at: 'now' }).ok && !s({ name: 'X', from_legacy_kit: true }).ok &&
    s({}).error === 'name_required' && s({ name: '   ' }).error === 'name_required' && s({ name: 'x'.repeat(61) }).error === 'name_required' &&
    s({ name: 'X', color: 'red' }).error === 'bad_color' && s({ name: 'X', website: 'javascript:alert(1)' }).error === 'bad_website' && s({ name: 'X', website: 'not a site' }).error === 'bad_website' &&
    s({ name: 'X', logo_footage_id: 'abc' }).error === 'bad_logo' && s({ name: 'X', voice_language: 'english' }).error === 'bad_language' &&
    s({ name: 'Atheeri', pronounce_say: 'say http://evil' }).error === 'bad_pronounce' && s({ name: 'Atheeri', pronounce_say: 'a-TÉ-ri' }).ok &&
    s({ color: '#000000' }, { partial: true }).ok && !('name' in s({ color: '#000000' }, { partial: true }).value) &&
    L.adBrandLimit('business', false) === 50 && L.adBrandLimit('Business ', false) === 50 && L.adBrandLimit('pro', true) === 50 && L.adBrandLimit('pro', false) === 1 && L.adBrandLimit(null, false) === 1 &&
    L.adBrandCanCreate(0, 1) && !L.adBrandCanCreate(1, 1) && L.adBrandCanCreate(49, 50) && !L.adBrandCanCreate(50, 50) &&
    L.adBrandCan('member', 'create') && L.adBrandCan('member', 'edit') && L.adBrandCan('member', 'use') && !L.adBrandCan('member', 'archive') && L.adBrandCan('owner', 'archive') &&
    L.adBrandNameTaken([{ id: 'a', name: 'Gabí Perfumes' }], 'gabi  perfumes') && !L.adBrandNameTaken([{ id: 'a', name: 'Gabi Perfumes' }], 'Gabi Perfumes', 'a')
}
const libOf = (S) => mods(S).lib
ok(await tenta(() => regrasOk(libOf(SRC))), 'A1 corpo limpo (owner_id/created_by/archived_at/from_legacy_kit recusados), nome obrigatório ≤60 e único sem acento/caixa, cor #rrggbb, site http(s) normalizado, pronúncia na régua do anúncio, teto Business/interna 50 e resto 1, arquivar só o dono')

const rotaCrudOk = async (S) => {
  const { route } = mods(S)
  const db = fakeDb({ ad_brands: [], ads_brand_kits: [] })
  // dono do Business cria, repete o nome, tenta trazer dono pelo corpo e logo de outra conta
  as('biz', db)
  const c1 = await route.POST(req({ name: 'Gabi Perfumes', color: '#aa3355', logo_footage_id: LOGO_BIZ, website: 'gabiperfumes.com.br' }))
  const c2 = await route.POST(req({ name: 'gabi perfumes' }))
  const c3 = await route.POST(req({ name: 'Loja X', owner_id: OTHER }))
  const c4 = await route.POST(req({ name: 'Loja Y', logo_footage_id: LOGO_OTHER }))
  const rowsBiz = db.tables.ad_brands.filter((r) => r.owner_id === BIZ)
  // o membro da equipe vê as marcas do DONO, cria nelas (created_by = ele) e não arquiva
  as('member', db)
  const g1 = await route.GET()
  const c5 = await route.POST(req({ name: 'Universo Café' }))
  const memberRow = db.tables.ad_brands.find((r) => r.name === 'Universo Café')
  const d1 = await route.DELETE(req(null, `http://x/api/ads/brands?id=${c1.body.id}`))
  // outra conta não vê nem edita marca do Business
  as('other', db)
  const g2 = await route.GET()
  const p1 = await route.PATCH(req({ id: c1.body.id, name: 'Roubada' }))
  // o dono edita, arquiva (a linha fica, só some da lista), e nada é apagado
  as('biz', db)
  const p2 = await route.PATCH(req({ id: c1.body.id, price: 'R$ 129' }))
  const p3 = await route.PATCH(req({ id: c1.body.id, owner_id: OTHER }))
  const d2 = await route.DELETE(req(null, `http://x/api/ads/brands?id=${c1.body.id}`))
  const g3 = await route.GET()
  // conta sozinha (pro): uma marca só
  const db2 = fakeDb({ ad_brands: [], ads_brand_kits: [] })
  as('solo', db2)
  const s1 = await route.POST(req({ name: 'Minha Loja' }))
  const s2 = await route.POST(req({ name: 'Segunda Loja' }))
  const gs = await route.GET()
  return c1.status === 201 && c2.status === 409 && c2.body.error === 'brand_name_taken' && c3.status === 400 && c3.body.error === 'bad_field' && c4.status === 400 && c4.body.error === 'bad_logo' &&
    rowsBiz.length === 1 && rowsBiz[0].owner_id === BIZ && rowsBiz[0].created_by === null &&
    g1.status === 200 && g1.body.ready === true && g1.body.role === 'member' && g1.body.brands.length === 1 && g1.body.brands[0].logo_url === `https://x/${BIZ}/${LOGO_BIZ}.png` && !('owner_id' in g1.body.brands[0]) &&
    c5.status === 201 && memberRow.owner_id === BIZ && memberRow.created_by === MEMBER && d1.status === 403 &&
    g2.body.brands.length === 0 && p1.status === 404 &&
    p2.status === 200 && db.tables.ad_brands.find((r) => r.id === c1.body.id).price === 'R$ 129' && p3.status === 400 &&
    d2.status === 200 && db.tables.ad_brands.find((r) => r.id === c1.body.id).archived_at && g3.body.brands.map((b) => b.name).join() === 'Universo Café' &&
    !db.log.some((l) => l[0] === 'delete') &&
    s1.status === 201 && s2.status === 409 && s2.body.error === 'brand_limit' && gs.body.can_create === false && gs.body.limit === 1
}
ok(await tenta(() => rotaCrudOk(SRC)), 'A2 a rota de verdade: dono do Business cria (nome repetido 409, owner_id do corpo 400, logo de outra conta 400); o MEMBRO vê e cria nas marcas do DONO (created_by = ele) e não arquiva (403); outra conta não vê nem edita (404); arquivar marca archived_at e NADA é apagado; conta pro = 1 marca (409 brand_limit)')

// ═══ B. RLS da migration ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nB. RLS da migration (dono ou equipe, só leitura pelo navegador)')
const sqlCode = (s) => s.split('\n').map((l) => l.replace(/--.*$/, '')).join('\n').replace(/\s+/g, ' ').toLowerCase()
const rlsOk = (S) => {
  const q = sqlCode(S.sql)
  const policies = [...q.matchAll(/create policy (\w+) on public\.ad_brands(.*?);/g)]
  const fn = trecho(q, 'create or replace function public.ad_brands_visible_to_me(p_owner uuid)', '$$;')
  return q.includes('alter table public.ad_brands enable row level security;') &&
    q.includes('revoke all on table public.ad_brands from anon, authenticated, public;') &&
    q.includes('grant select on table public.ad_brands to authenticated;') &&
    !/grant (all|insert|update|delete|[a-z, ]*(insert|update|delete))[a-z, ]* on table public\.ad_brands/.test(q) &&
    !/grant [a-z, ]+ on table public\.ad_brands to anon/.test(q) &&
    policies.length === 1 && /^ for select to authenticated using \(archived_at is null and public\.ad_brands_visible_to_me\(owner_id\)\)$/.test(policies[0][2]) &&
    !/create policy[^;]*for (all|insert|update|delete)/.test(q) &&
    fn.includes('security definer') && fn.includes('set search_path = public') &&
    fn.includes('auth.uid() is not null') && fn.includes('p_owner = auth.uid()') &&
    fn.includes("m.owner_id = p_owner and m.member_id = auth.uid() and m.status = 'active'") && fn.includes("lower(btrim(coalesce(p.plan, ''))) = 'business'") &&
    q.includes('revoke all on function public.ad_brands_visible_to_me(uuid) from public, anon;') &&
    q.includes('owner_id uuid not null references auth.users (id) on delete cascade') &&
    q.includes('alter table public.ads_v2_orders add column if not exists brand_id uuid references public.ad_brands (id) on delete set null;') &&
    q.includes('create unique index if not exists ad_brands_owner_name_live on public.ad_brands (owner_id, lower(btrim(name))) where archived_at is null;') &&
    !/\bdrop table\b|\bdelete from\b|\btruncate\b/.test(q)
}
ok(await tenta(() => rlsOk(SRC)), 'B1 RLS ligado; anon sem nada; authenticated SÓ select; UMA policy (marca viva E dono = auth.uid() OU membro ativo da equipe com dono em business); nenhuma policy/grant de escrita; função security definer com search_path; brand_id no pedido (set null); nome único vivo; nada apagado')
ok(/⚠️ NÃO APLICADA/.test(SRC.sql) && !(fs.existsSync(path.join(ROOT, 'supabase/migrations')) && fs.readdirSync(path.join(ROOT, 'supabase/migrations')).some((n) => /ad_brands/.test(n))), 'B2 a migration mora em migrations_pending/ e diz que NÃO foi aplicada (a sessão principal aplica depois da revisão)')

// ═══ C. sem a tabela ═════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. sem a migration: a tela de sempre')
const semTabelaOk = async (S) => {
  const { route, server } = mods(S)
  const db = fakeDb({ ad_brands: { error: { code: '42P01' } }, ads_brand_kits: [{ user_id: BIZ, color: '#123456' }] })
  as('biz', db)
  const g = await route.GET()
  const p = await route.POST(req({ name: 'Gabi' }))
  const pa = await route.PATCH(req({ id: LOGO_BIZ, name: 'Gabi' }))
  const o = await server.orderBrandId(db, BIZ, LOGO_BIZ)
  const col = fakeDb({ ad_brands: { error: { code: '42703' } } })
  const o2 = await server.orderBrandId(col, BIZ, LOGO_BIZ)
  return g.status === 200 && g.body.ready === false && g.body.brands.length === 0 && p.status === 503 && p.body.error === 'not_ready' && pa.status === 503 && o === null && o2 === null && server.isMissingBrandSchema('PGRST204') && server.isMissingBrandSchema('42703')
}
ok(await tenta(() => semTabelaOk(SRC)), 'C1 rota sem a tabela: GET 200 { ready:false }, POST/PATCH 503 not_ready; orderBrandId = null (o pedido nasce como sempre)')
const telaSemTabelaOk = (S) => {
  const hook = trecho(S.ui, 'export function useAdsBrands() {', '\n}\n')
  const legado = trecho(S.simple, '  useEffect(() => {\n    if (marcasMode !== \'legacy\') return', "}, [marcasMode])")
  const lista = trecho(S.orders, "if (req.nextUrl.searchParams.get('list') === 'brands') {", "} // KINEO-ADS-MARCAS-1510\n")
  return hook.includes("if (!r.ok || r.data.ready !== true) {") && hook.includes("{ status: 'legacy' }") && /window\.setTimeout\(\(\) => \{ if \(!done\) setState\(\(s\) => \(s\.status === 'loading' \? \{ status: 'legacy' \} : s\)\) \}, 4000\)/.test(hook) &&
    S.simple.includes("const marcasMode = marcas?.mode ?? 'legacy'") && legado.includes("await api<{ kit?: AdsBrandKit | null; logo_url?: string | null }>('/api/ads/brand-kit')") &&
    S.client.includes("mode: marcas.state.status === 'ready' ? (marcasOn ? 'ready' : 'legacy') : marcas.state.status") &&
    /\{marcasOn && marcas\.state\.status === 'ready' \? <AdsBrandSwitcher /.test(S.client) &&
    lista.includes("if (l.error && isMissingBrandSchema(l.error.code) && !isMissingAdsTable(l.error.code)) {") && /select\('id, status, tier, seconds, video_id, created_at, sentence:brief->>sentence, link:brief->>link'\)/.test(lista) &&
    S.orders.includes('        ...(brandId ? { brand_id: brandId } : {}), // KINEO-ADS-MARCAS-1510 — sem marca (ou sem a tabela) = o insert de sempre')
}
ok(await tenta(() => telaSemTabelaOk(SRC)), "C2 tela sem a tabela: ready:false/erro/demora 4 s = 'legacy' (sem seletor, o kit único de /api/ads/brand-kit roda só em 'legacy'; sem a prop = 'legacy'); lista relê sem a coluna; o insert do pedido só ganha brand_id com marca")

// ═══ D. trocar de marca preenche o kit ═══════════════════════════════════════════════════════════════════════════════
console.log('\nD. trocar de marca preenche o kit')
const DEF = '#2563eb'
const brandA = { id: 'a', name: 'Gabi Perfumes', logo_footage_id: null, color: '#aa3355', color2: null, price: 'R$ 99', contact: '@gabi', website: 'https://gp-store.com' }
const brandB = { id: 'b', name: 'Universo Café', logo_footage_id: null, color: '#3b2f2f', color2: null, price: null, contact: '(11) 4000-1000', website: null }
// o MESMO caminho do efeito da tela: tira o que a anterior pôs (brandKitRetract) e, sem conflito, preenche o vazio (brandKitPrefill)
const trocar = (M, st, brand, ev = {}) => {
  let form = { ...st.form }
  if (st.applied && !st.off) {
    const r = M.palco.brandKitRetract(st.filled, { business: form.business, price: form.price, contact: form.contact, color: form.color, logoFootageId: null }, { business: '', price: '', defaultColor: DEF })
    form = { business: r.business, price: r.price, contact: r.contact, color: r.color }
  }
  if (!brand) return { form, filled: {}, applied: false, off: null }
  if (M.lib.adBrandConflict(brand, ev)) return { form, filled: {}, applied: true, off: 'conflict' }
  const fill = M.kitUx.brandKitPrefill(M.lib.adBrandToKit(brand), { ...form, defaultColor: DEF, hasLogo: false }, null)
  return { form: { ...form, ...fill }, filled: fill, applied: Object.keys(fill).length > 0, off: null }
}
const trocaOk = (M) => {
  const vazio = { form: { business: '', price: '', contact: '', color: DEF }, filled: {}, applied: false, off: null }
  const a = trocar(M, vazio, brandA)
  const b = trocar(M, a, brandB)
  const editado = { ...a, form: { ...a.form, price: 'R$ 79 promo' } }
  const b2 = trocar(M, editado, brandB)
  const none = trocar(M, a, null)
  return a.form.business === 'Gabi Perfumes' && a.form.color === '#aa3355' && a.form.contact === '@gabi' && a.form.price === 'R$ 99' &&
    b.form.business === 'Universo Café' && b.form.color === '#3b2f2f' && b.form.contact === '(11) 4000-1000' && b.form.price === '' &&
    b2.form.price === 'R$ 79 promo' && b2.form.business === 'Universo Café' &&
    none.form.business === '' && none.form.color === DEF
}
ok(await tenta(() => trocaOk(mods(SRC))), 'D1 trocar A → B: sai o que A pôs (nome, cor, contato, preço) e entra B só no vazio; o que a pessoa digitou (preço promo) FICA; "Sem marca" limpa o que a marca pôs')
const efeitoOk = (S) => {
  const troca1 = trecho(S.simple, '  useEffect(() => {\n    if (!brandsOn) return\n    const f = formRef.current', '}, [brandsOn, brandSig])')
  const aplica = trecho(S.simple, '    const b = brandPendingRef.current\n    if (!brandsOn || !brandTick || !b) return', '}, [brandTick])')
  return troca1.includes('const r = brandKitRetract(kitFilledRef.current,') && troca1.indexOf('brandKitRetract(') < troca1.indexOf('brandPendingRef.current = brand') &&
    troca1.includes('if (voiceLang === was.voice) setVoiceLang(') && troca1.includes('if (pronSay === was.say) setPronSay(say)') &&
    aplica.includes('const kit = adBrandToKit(b)') && aplica.indexOf('if (adBrandConflict(b, kitEvidenceRef.current)) {') > 0 &&
    aplica.indexOf('if (adBrandConflict(b, kitEvidenceRef.current)) {') < aplica.indexOf('brandKitPrefill(kit,') &&
    aplica.includes("setKitOff('conflict')") && S.simple.includes("const brandSig = brand ? JSON.stringify(brand) : ''")
}
ok(await tenta(() => efeitoOk(SRC)), 'D2 a tela: o efeito da troca tira com brandKitRetract ANTES de pôr a nova; o kit da marca (adBrandToKit) só entra depois do teste de conflito; voz e pronúncia seguem a marca salvo escolha da pessoa; editar a marca (mesmo id) reaplica')

// ═══ E. a regra de conflito continua ════════════════════════════════════════════════════════════════════════════════
console.log('\nE. a regra do conflito (KINEO-ADS-PALCO-VOLTAR-1410) continua')
const conflitoOk = (M) => {
  const L = M.lib
  const evs = [
    { sentence: 'Perfume Atheeri 100ml com notas florais' }, { sentence: 'Gabi Perfumes lança fragrância' }, { linkHost: 'atheeri.com' },
    { sentence: '' }, {}, { sentence: 'promoção de verão', linkName: 'Gabi Perfumes' }, { linkHost: 'loja.gabiperfumes.com.br' },
  ]
  const igualAoPalco = evs.every((ev) => L.adBrandConflict({ name: 'Gabi Perfumes', website: null }, ev) === M.palco.brandKitConflict('Gabi Perfumes', ev))
  const site = L.adBrandConflict(brandA, { sentence: 'fragrância nova de verão', linkHost: 'gp-store.com' }) === false && L.adBrandConflict(brandA, { sentence: 'fragrância nova de verão', linkHost: 'loja.gp-store.com' }) === false && M.palco.brandKitConflict('Gabi Perfumes', { sentence: 'fragrância nova de verão', linkHost: 'gp-store.com' }) === true
  const outra = L.adBrandConflict(brandA, { sentence: 'Universo Café coado na hora' }) === true
  const sugere = L.adBrandForEvidence([brandA, brandB], { sentence: 'Universo Café coado na hora' }, 'a')?.id === 'b' && L.adBrandForEvidence([brandA, brandB], {}, 'a') === null
  return igualAoPalco && site && outra && sugere && L.adBrandConflict(null, { sentence: 'x' }) === false
}
ok(await tenta(() => conflitoOk(mods(SRC))), 'E1 adBrandConflict = brandKitConflict(nome, evidência) em todos os casos (frase, nome lido, domínio, vazio); única exceção: o link é do PRÓPRIO site da marca; "Trocar para X" só aponta UMA marca citada')
const fiacaoConflitoOk = (S) => {
  const legado = trecho(S.simple, "const r = await api<{ kit?: AdsBrandKit | null; logo_url?: string | null }>('/api/ads/brand-kit')", 'if (Object.keys(fillIn).length) setKitApplied(kit)')
  const efeito = /\n {2}useEffect\(\(\) => \{\n {4}if \(!kitApplied\) return\n {4}if \(kitConflict && kitOff === null && !kitForcedRef\.current\) kitRetract\('conflict'\)\n {4}else if \(!kitConflict && kitOff === 'conflict'\) kitReapply\(false\)\n/.test(S.simple)
  const off = trecho(S.simple, '<p className="adv2s-kitoff" role="status" data-kineo="ads-brand-kit-off" data-why={kitOff}>', '</p>')
  return legado.indexOf('if (brandKitConflict(kit.business, kitEvidenceRef.current)) {') > 0 && legado.indexOf('brandKitConflict(kit.business') < legado.indexOf('brandKitPrefill(kit,') && efeito &&
    S.simple.includes('const kitConflict = brandsOn && brand ? adBrandConflict(brand, kitEvidence) : brandKitConflict(kitBusiness, kitEvidence)') &&
    off.includes('data-kineo="ads-brand-switch" onClick={() => marcas?.onPick(brandSuggest.id)}') &&
    (S.simple.match(/marcas\?\.onPick\(/g) || []).length === 1 && (S.simple.match(/marcas\.onPick\(|onPick\(/g) || []).length === 1 &&
    S.palco === base(F.palco)
}
ok(await tenta(() => fiacaoConflitoOk(SRC)), 'E2 a tela: o kit único continua testando conflito antes de preencher; o efeito que tira/devolve sozinho é o mesmo; com marca o conflito é adBrandConflict; "Trocar para X" só no clique (único onPick da sessão); lib/ads/v2PalcoVoltar.ts byte a byte igual')

// ═══ F. o pedido grava brand_id ══════════════════════════════════════════════════════════════════════════════════════
console.log('\nF. cada pedido grava a marca')
const pedidoOk = async (S) => {
  const { server } = mods(S)
  const db = fakeDb({ ad_brands: [
    { id: 'bbbbbbbb-0000-4000-8000-000000000001', owner_id: BIZ, name: 'Gabi', archived_at: null },
    { id: 'bbbbbbbb-0000-4000-8000-000000000002', owner_id: OTHER, name: 'Alheia', archived_at: null },
    { id: 'bbbbbbbb-0000-4000-8000-000000000003', owner_id: BIZ, name: 'Velha', archived_at: '2026-10-01' },
  ] })
  const viva = await server.orderBrandId(db, BIZ, 'BBBBBBBB-0000-4000-8000-000000000001')
  const alheia = await server.orderBrandId(db, BIZ, 'bbbbbbbb-0000-4000-8000-000000000002')
  const arquivada = await server.orderBrandId(db, BIZ, 'bbbbbbbb-0000-4000-8000-000000000003')
  const lixo = await server.orderBrandId(db, BIZ, "x' or 1=1")
  const nada = await server.orderBrandId(db, BIZ, undefined)
  return viva === 'bbbbbbbb-0000-4000-8000-000000000001' && alheia === null && arquivada === null && lixo === null && nada === null
}
ok(await tenta(() => pedidoOk(SRC)), 'F1 orderBrandId: só marca viva DO DONO do workspace vira brand_id; de outra conta, arquivada, lixo ou ausente = null (o anúncio nunca é recusado por causa da marca)')
const fiosPedidoOk = (S) => {
  const post = trecho(S.orders, 'export async function POST(req: NextRequest) {', '\nexport async function PATCH')
  const draft = trecho(S.simple, 'async function ensureDraft(): Promise<string | null> {', '\n  }\n')
  return post.includes('const brandId = await orderBrandId(admin, uid, (body as Record<string, unknown> | null)?.brand_id)') &&
    post.indexOf('const brandId = await orderBrandId(') < post.indexOf(".from('ads_v2_orders')\n      .insert({") &&
    draft.includes('...(brand ? { brand_id: brand.id } : {}),') &&
    S.simple.includes('...(brand ? { brand: brand.id } : {}) })') &&
    S.batch.includes("link: row.linkRead, ...(brandId ? { brand_id: brandId } : {}) }") &&
    S.client.includes('brandId={marcasOn ? marcas.selectedId : null}')
}
ok(await tenta(() => fiosPedidoOk(SRC)), 'F2 a rota confere a marca pelo uid do DONO antes do insert; o rascunho do modo simples e cada linha do lote mandam brand_id; trocar de marca = rascunho novo')

// ═══ G. a lista filtra por marca ═════════════════════════════════════════════════════════════════════════════════════
console.log('\nG. "Seus anúncios" por marca')
const filtroOk = (L) => {
  const os = [{ id: 1, brand_id: 'bbbbbbbb-0000-4000-8000-000000000001' }, { id: 2, brand_id: null }, { id: 3, brand_id: 'bbbbbbbb-0000-4000-8000-000000000002' }, { id: 4 }]
  const one = L.adBrandFilter('BBBBBBBB-0000-4000-8000-000000000001')
  return L.adBrandFilter('none').kind === 'none' && L.adBrandFilter('all').kind === 'all' && L.adBrandFilter("1' or '1").kind === 'all' && L.adBrandFilter(undefined).kind === 'all' &&
    one.kind === 'one' && one.id === 'bbbbbbbb-0000-4000-8000-000000000001' &&
    L.adBrandFilterOrders(os, one).map((o) => o.id).join() === '1' && L.adBrandFilterOrders(os, { kind: 'none' }).map((o) => o.id).join() === '2,4' && L.adBrandFilterOrders(os, { kind: 'all' }).length === 4 &&
    L.AD_BRAND_LIST_STATUSES.join() === 'generating,assembling,delivered,failed,cancelled'
}
ok(await tenta(() => filtroOk(libOf(SRC))), 'G1 filtro: id de marca (minúsculo) / "none" (sem marca) / qualquer outra coisa = todas; rascunho e plano fora da lista')
const listaRotaOk = (S) => {
  const l = trecho(S.orders, "if (req.nextUrl.searchParams.get('list') === 'brands') {", "} // KINEO-ADS-MARCAS-1510\n")
  return l.includes("const f = adBrandFilter(req.nextUrl.searchParams.get('brand'))") && l.includes(".eq('user_id', uid).in('status', [...AD_BRAND_LIST_STATUSES])") &&
    l.includes("if (f.kind === 'one') q = q.eq('brand_id', f.id)") && l.includes("if (f.kind === 'none') q = q.is('brand_id', null)") &&
    S.ui.includes('`/api/ads/v2/orders?list=brands${q}`') && S.ui.includes('adBrandFilterOrders(r.data.orders, filter)') && S.ui.includes('data-kineo="ads-brand-filter"')
}
ok(await tenta(() => listaRotaOk(SRC)), 'G2 a rota lista SÓ os pedidos do dono do workspace, só os que começaram, e filtra por brand_id (ou sem marca); a tela tem os chips "Todas / cada marca / Sem marca"')

// ═══ H. o kit antigo vira a 1ª marca ═════════════════════════════════════════════════════════════════════════════════
console.log('\nH. o kit antigo vira a 1ª marca')
const legadoOk = async (S) => {
  const M = mods(S)
  const L = M.lib
  const a = L.adBrandFromLegacyKit({ business: ' Atheeri ', color: '#AA3355', price: null, contact: 'atheeri.com', logo_footage_id: null })
  const b = L.adBrandFromLegacyKit({ business: null, color: '#123456', price: null, contact: null, logo_footage_id: null })
  const c = L.adBrandFromLegacyKit({ business: '  ', color: null, price: null, contact: null, logo_footage_id: null })
  const db = fakeDb({ ad_brands: [], ads_brand_kits: [{ user_id: OWNER, color: '#123456', business: null, price: null, contact: null, logo_footage_id: null }] })
  as('solo', db)
  const g1 = await M.route.GET()
  const g2 = await M.route.GET()
  const segunda = await M.server.migrateLegacyKit(db, OWNER, OWNER)
  const db2 = fakeDb({ ad_brands: [], ads_brand_kits: [] })
  as('solo', db2)
  const g3 = await M.route.GET()
  return a.name === 'Atheeri' && a.color === '#aa3355' && a.contact === 'atheeri.com' && b.name === 'My brand' && b.color === '#123456' && c === null &&
    g1.body.brands.length === 1 && g1.body.brands[0].name === 'My brand' && g1.body.brands[0].color === '#123456' && g2.body.brands.length === 1 &&
    segunda === false && db.tables.ad_brands.length === 1 && db.tables.ad_brands[0].from_legacy_kit === true && db.tables.ads_brand_kits.length === 1 &&
    g3.body.brands.length === 0 && g3.body.can_create === true
}
ok(await tenta(() => legadoOk(SRC)), 'H1 kit antigo → 1ª marca (sem nome = "My brand", vazio = nada); na 1ª leitura da rota, UMA vez (a 2ª tentativa bate no índice e não duplica); o kit antigo fica intocado')
const backfillOk = (S) => {
  const q = sqlCode(S.sql)
  const ins = trecho(q, 'insert into public.ad_brands (owner_id, name, logo_footage_id, color, price, contact, from_legacy_kit)', 'on conflict do nothing;')
  return ins.includes("coalesce(nullif(btrim(k.business), ''), 'my brand')") && ins.includes('from public.ads_brand_kits k') &&
    ins.includes('and not exists (select 1 from public.ad_brands b where b.owner_id = k.user_id)') &&
    q.includes('create unique index if not exists ad_brands_one_legacy on public.ad_brands (owner_id) where from_legacy_kit;') &&
    S.lib.includes("export const AD_BRAND_LEGACY_NAME = 'My brand'")
}
ok(await tenta(() => backfillOk(SRC)), 'H2 a migration faz o mesmo backfill (kit com algo → 1 marca por dono, "My brand" sem nome, on conflict do nothing, 1 marca legada por dono pelo índice)')

// ═══ I. a tela ═══════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nI. a tela')
const telaOk = (S) => {
  const painel = trecho(S.client, '<div className="kps-panel">', '<AdsV2SimpleSession')
  const sw = trecho(S.ui, 'export function AdsBrandSwitcher(', '\n}\n')
  return painel.includes('<AdsBrandSwitcher lang={lang} state={marcas.state} selected={marcas.selected} onSelect={marcas.select} onNew={() => setBrandDlg({ brand: null })} onEdit={(b) => setBrandDlg({ brand: b })} />') &&
    painel.indexOf('<AdsBrandSwitcher') < painel.indexOf('<AdsV2Session') &&
    sw.includes('className="mdlbtn"') && sw.includes('<span className="lab" style={{ marginBottom: 0 }}>{c.brand}</span>') && sw.includes('<span className="mdlname">') && sw.includes('<i style={{ marginLeft: \'auto\' }}>▾</i>') &&
    sw.includes('data-kineo="ads-brand-new"') && sw.includes('data-kineo="ads-brand-edit"') && sw.includes('{c.add}') && sw.includes('{c.edit}') &&
    S.client.includes('<AdsBrandDialog lang={lang} brand={brandDlg.brand} canArchive={marcas.state.role === \'owner\'}') &&
    S.client.includes('<AdsBrandOrders lang={lang} brands={marcas.brands} brandsOn={marcasOn}') &&
    !/<style>\s*\{/.test(S.ui) && (S.ui.match(/<style dangerouslySetInnerHTML=\{\{ __html: AD_BRANDS_CSS \}\} \/>/g) || []).length === 3 &&
    !/<style>\s*\{/.test(S.client) && /html \.stu\.adv2 \.adbr-menu>button/.test(S.lib)
}
ok(await tenta(() => telaOk(SRC)), 'I1 "Marca: X ▾" no TOPO do painel, antes do formulário, na caixa do motor do Studio (.mdlbtn/.lab/.mdlname); "+ Nova marca", "Editar marca", a janela e a lista ligadas; <style> só por dangerouslySetInnerHTML')
const copyOk = (L) => {
  const langs = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
  const flat = (o) => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? Object.entries(v).map(([k2, v2]) => [`${k}.${k2}`, v2]) : [[k, v]]))
  const en = Object.fromEntries(flat(L.AD_BRAND_COPY.en))
  return Object.keys(L.AD_BRAND_COPY).length === 16 && langs.every((l) => {
    const c = Object.fromEntries(flat(L.AD_BRAND_COPY[l]))
    const keys = Object.keys(en)
    const iguais = keys.filter((k) => c[k] === en[k]).length
    return keys.every((k) => typeof c[k] === 'string' && c[k].trim()) && Object.keys(c).length === keys.length &&
      ['{name}', '{n}', '{max}'].every((ph) => keys.every((k) => en[k].includes(ph) === c[k].includes(ph))) &&
      (l === 'en' || iguais <= 2)
  }) && L.adBrandCopy('xx') === L.AD_BRAND_COPY.en && L.adBrandCopy('pt').add === '+ Nova marca'
}
ok(await tenta(() => copyOk(libOf(SRC))), 'I2 as frases em 16 línguas, todas preenchidas, com os mesmos {marcadores}; nenhuma língua cai no inglês (≤ 2 palavras iguais, ex.: "Logo")')

// ═══ J. dinheiro intocado + desfaz ═══════════════════════════════════════════════════════════════════════════════════
console.log('\nJ. dinheiro intocado e o desfaz')
const INTOCADOS = ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/plan/route.ts', 'lib/ads/v2PlanCore.ts', 'app/api/ads/v2/variations/route.ts', 'lib/ads/v2Batch.ts', 'lib/credits/refund.ts', 'lib/credits/debit.ts', 'lib/ads/sample.ts', 'app/api/ads/brand-kit/route.ts', 'lib/ads/workspace.ts', 'lib/ads/serverAccess.ts', 'lib/ads/team.ts', 'lib/engineWall.ts', 'lib/homeVideoCuration.ts']
ok(INTOCADOS.every((f) => base(f) !== null && read(f) === base(f)), `J1 ${INTOCADOS.length} arquivos de dinheiro/acesso/vitrine byte a byte iguais à base (${BASE}): nenhum preço, débito, estorno ou porta nova`)
const desfeitoOk = (S) => MARCAS_1510_ARQUIVOS.length === 4 && [['simple', F.simple], ['client', F.client], ['batch', F.batch], ['orders', F.orders]].every(([k, f]) => desfazPosEntrega1510(f, semMarcas1510(f, S[k])) === base(f)) // reancorado KINEO-LEVA-ADS-AGENCIA-1510 — marcas (a mais nova) sai primeiro, depois o painel da pos-entrega
ok(await tenta(() => desfeitoOk(SRC)), 'J2 desfeito este conserto (scripts/test-support/desfaz-ads-marcas-1510.mjs), AdsV2Simple, AdsV2Client, AdsV2Batch e /orders são EXATAMENTE a base')
const blocosMarcados = () => [F.simple, F.client, F.batch, F.orders].every((f) => {
  const d = (PROPRIO ? git('diff', '-U0', '--no-color', BASE, PROPRIO, '--', f) + git('diff', '-U0', '--no-color', 'HEAD', '--', f) : git('diff', '-U0', '--no-color', BASE, '--', f)).replace(/\r\n/g, '\n') // reancorado KINEO-LEVA-ADS-AGENCIA-1510 — o PRÓPRIO commit + o não commitado
  const blocos = d.split('\n@@').slice(1).map((h) => h.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')))
  return blocos.length > 0 && blocos.every((b) => b.length === 0 || b.some((l) => l.includes(MARCA)))
})
ok(await tenta(blocosMarcados), 'J3 todo bloco novo nos 4 arquivos tocados traz a marca KINEO-ADS-MARCAS-1510')
const semDinheiroOk = (S) => {
  const novos = [S.lib, S.server, S.route, S.ui].join('\n').split('\n')
  return !novos.some((l) => /adsV2Credits|chargeAdsV2|debit|refund|stripe|checkout\.|price_id|engineCost|video_credits/.test(l))
}
ok(await tenta(() => semDinheiroOk(SRC)), 'J4 lib, banco, rota e tela das marcas não tocam crédito, débito, estorno, checkout nem preço de motor')

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (todos têm de ficar vermelhos)')
const mut = async (nome, chave, de, para, checa) => {
  let S2
  try { S2 = { ...SRC, [chave]: troca(SRC[chave], de, para) } } catch (e) { ok(false, `${nome} — ${e.message}`); return }
  ok(!(await tenta(() => checa(S2))), `${nome} fica vermelho`)
}
await mut('M1 Business volta a 1 marca', 'lib', "=== 'business' ? AD_BRANDS_AGENCY_LIMIT : AD_BRANDS_SOLO_LIMIT", "=== 'business' ? AD_BRANDS_SOLO_LIMIT : AD_BRANDS_SOLO_LIMIT", (S) => regrasOk(libOf(S)))
await mut('M2 o corpo pode trazer owner_id', 'lib', "const ALLOWED_KEYS = ['name',", "const ALLOWED_KEYS = ['owner_id', 'created_by', 'archived_at', 'from_legacy_kit', 'name',", (S) => regrasOk(libOf(S)))
await mut('M3 membro arquiva', 'lib', "if (action === 'archive') return role === 'owner'", "if (action === 'archive') return true", (S) => rotaCrudOk(S))
await mut('M4 arquivar vira apagar', 'route', ".update({ archived_at: new Date().toISOString() })", '.delete()', (S) => rotaCrudOk(S))
await mut('M5 policy aberta para todo logado', 'sql', 'using (archived_at is null and public.ad_brands_visible_to_me(owner_id));', 'using (true);', rlsOk)
await mut('M6 a equipe vê sem o dono estar no Business', 'sql', "        and lower(btrim(coalesce(p.plan, ''))) = 'business'\n", '', rlsOk)
await mut('M7 sem tabela a rota quebra (502)', 'server', "if (q.error) return isMissingBrandSchema(q.error.code) ? { ready: false } : { error: true }\n  const rows", "if (q.error) return { error: true }\n  const rows", (S) => semTabelaOk(S))
await mut('M8 o kit único roda mesmo com marcas', 'simple', "    if (marcasMode !== 'legacy') return // KINEO-ADS-MARCAS-1510 — com marcas (ou ainda lendo as marcas) o kit único não entra\n", '', telaSemTabelaOk)
await mut('M9 trocar de marca não tira a anterior', 'simple', "      const r = brandKitRetract(kitFilledRef.current, { business: f.cardTitle, price: f.price, contact: f.contact, color: f.cardColor, logoFootageId: logo?.footageId ?? null }, { business: linkPage?.name ?? '', price: linkPage?.price ?? '', defaultColor: DEFAULT_COLOR })\n      setCardTitle(r.business)", '      const r = { business: f.cardTitle }\n      setCardTitle(r.business)', efeitoOk)
await mut('M10 a marca ignora o conflito (entra calada em anúncio de outra marca)', 'lib', '  return brandKitConflict(brand.name, ev)\n', '  return false\n', (S) => conflitoOk(mods(S)))
await mut('M11 o pedido aceita marca de outra conta', 'server', ".eq('id', brandId.toLowerCase()).eq('owner_id', ownerId)", ".eq('id', brandId.toLowerCase())", (S) => pedidoOk(S))
await mut('M12 "Sem marca" mostra todas', 'lib', "if (f.kind === 'none') return orders.filter((o) => !o.brand_id)", "if (f.kind === 'none') return orders.slice()", (S) => filtroOk(libOf(S)))
await mut('M13 a marca migrada perde o selo de legada (a 2ª migração duplica)', 'server', 'from_legacy_kit: true })', 'from_legacy_kit: false })', (S) => legadoOk(S))
await mut('M14 kit antigo nunca migra', 'lib', '  if (!business && !logo && !color && !price && !contact) return null\n', '  return null\n', (S) => legadoOk(S))
await mut('M15 o seletor sai do topo do formulário', 'client', "      {marcasOn && marcas.state.status === 'ready' ? <AdsBrandSwitcher", "      {false && marcasOn && marcas.state.status === 'ready' ? <AdsBrandSwitcher", telaSemTabelaOk)
await mut('M16 uma língua cai no inglês', 'lib', "pt: { brand: 'Marca', none: 'Sem marca', add: '+ Nova marca', edit: 'Editar marca'", "pt: { brand: 'Brand', none: 'No brand', add: '+ New brand', edit: 'Edit brand'", (S) => copyOk(libOf(S)))
await mut('M17 mudança fora do conserto na tela', 'simple', '  const closeStyles = () =>', '  const closeStyles2 = 1\n  const closeStyles = () =>', desfeitoOk)

console.log(`\ntest-ads-marcas-1510: ${pass} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
