#!/usr/bin/env node
// KINEO-AFILIADO-POR-POST-1610 — guardião do "de onde veio" do afiliado (aprovado pelo fundador em 15/10).
//
// O que este guardião EXECUTA (código real transpilado, Supabase em memória, sem rede nem credencial):
//   A. `p` / `post` no link /a/CODIGO: só [a-z0-9-], até 24, com letra ou número; maiúscula vira minúscula; qualquer outra
//      forma é DESCARTADA (nunca cortada). Vai no clique (landing_path + evento affiliate_link_clicked) e no destino como
//      utm_term; o destino segue na lista branca, com a etiqueta de sempre.
//   B. Atribuição: a indicação NOVA devolve o post e o host do clique-prova; o evento server-only
//      affiliate_signup_attribution_result leva affiliate_id/post/referrer_host SÓ nela (nunca em "already").
//   C. Conta pura "Your links": por post × origem, 30 dias, gente (robô fora), cadastro/1º filme/pago, linha "untracked";
//      só o PRÓPRIO afiliado (clique, indicação e evento de outro parceiro não entram) e só contagens (nenhum id/e-mail).
//   D. Leitura: PAGINADA (2.480 cliques em 3 páginas, nada cortado em 1000), toda consulta filtrada pelo affiliate_id,
//      `.in()` em lotes de no máximo 100.
//   E. /api/affiliate/me: o escopo vem do affiliate do usuário da SESSÃO; leitura que falha = "indisponível", não zero.
//   F. Painel: tabela "Your links", gerador "name this post" com Copiar, rodapé honesto.
//   G. Mutantes: cada conserto desfeito tem de ser APLICADO e derrubar alguma prova.
//   H. Desfaz (scripts/test-support/desfaz-afiliado-por-post-1610.mjs): byte a byte à base 8daa6ab8; mudança alheia lança.
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import {
  semAfiliadoPorPost1610,
  AFILIADO_POR_POST_1610_ARQUIVOS,
  AFILIADO_POR_POST_1610_BASE,
  MARCA_AFILIADO_POR_POST_1610,
} from './test-support/desfaz-afiliado-por-post-1610.mjs'
// reancorado KINEO-LEVA2-1510 — na leva 2 o KINEO-CHECKOUT-CLAREZA-1610 também pôs um nome reservado (welcome20_deadline_started)
// em app/api/events/route.ts, num trecho disjunto: sai em memória (desfaz exato dele) SÓ na prova byte a byte (H); o
// comportamento continua lendo o arquivo de verdade. Sem a camada (árvore sem a marca), semClareza1610 devolve o texto igual.
import { semClareza1610 } from './test-support/desfaz-checkout-clareza-1610.mjs'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

function compile(source, imports = {}, env = {}) {
  const box = { exports: {} }
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(js, {
    module: box, exports: box.exports, URL, URLSearchParams, Map, Set, Promise, RegExp, Error, JSON, Object, Array,
    String, Number, Boolean, Math, Date,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-only', ...env } },
    console: { log() {}, warn() {}, error() {} },
    require: (id) => { if (Object.hasOwn(imports, id)) return imports[id]; throw Error(`import sem dublê: ${id}`) },
  })
  return box.exports
}

const CODE = 'ABCD2345'
const ORIGIN = 'https://www.usekineo.com'
const HUMAN = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1'
const ALLOWED_PATHS = new Set(['/free-script-generator', '/free-ai-shorts-generator', '/faceless-video-generator', '/business-video-content-plan', '/client-video-brief-generator'])
const INVALID_POSTS = ['tik tok', 'x'.repeat(25), '<script>', 'https://evil.com', '../a', 'ação', 'a_b', '---', '', 'a@b.com']
const NOW = Date.parse('2026-10-16T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000
const iso = (ms) => new Date(ms).toISOString()

const REAL = {
  destinations: read('lib/affiliateDestinations.ts'),
  route: read('app/a/[code]/route.ts'),
  attribution: read('lib/affiliateAttribution.ts'),
  finalizer: read('lib/affiliateSignupFinalization.ts'),
  stats: read('lib/affiliatePostStats.ts'),
  me: read('app/api/affiliate/me/route.ts'),
  events: read('app/api/events/route.ts'),
  page: read('app/(dashboard)/affiliate/page.tsx'),
}
const affiliateCode = compile(read('lib/affiliateCode.ts'))

// ── /a/[code] com Supabase em memória (o subconjunto que a rota usa) ──
class RouteQuery {
  constructor(db, table) { Object.assign(this, { db, table, filters: [], op: 'select' }) }
  select() { return this }
  eq(k, v) { this.filters.push((r) => r[k] === v); return this }
  insert(v) { this.op = 'insert'; this.value = v; return this }
  async run() {
    const list = this.db.tables[this.table]
    if (!list) throw Error(`tabela inesperada ${this.table}`)
    if (this.op === 'insert') {
      const row = { id: crypto.randomUUID(), ...this.value }
      list.push(row)
      return { data: [{ id: row.id }], error: null }
    }
    return { data: list.filter((r) => this.filters.every((f) => f(r))).map((r) => ({ ...r })), error: null }
  }
  async maybeSingle() { const r = await this.run(); return { ...r, data: r.data[0] ?? null } }
  async single() { return this.maybeSingle() }
  then(res, rej) { return this.run().then(res, rej) }
}

// ── Supabase em memória para a LEITURA do painel: select/eq/gte/in/order/range, com registro de cada filtro ──
function readerDb(tables) {
  const log = []
  const field = (row, k) => (k.startsWith('metadata->>') ? row.metadata?.[k.slice('metadata->>'.length)] : row[k])
  const db = {
    log,
    maxIn: 0,
    from(table) {
      const q = { table, eqs: [], gtes: [], ins: [], orders: [], range: null }
      log.push(q)
      const api = {
        select() { return api },
        eq(k, v) { q.eqs.push([k, v]); return api },
        gte(k, v) { q.gtes.push([k, v]); return api },
        in(k, vals) { q.ins.push([k, vals]); db.maxIn = Math.max(db.maxIn, vals.length); return api },
        order(k) { q.orders.push(k); return api },
        range(a, b) { q.range = [a, b]; return api },
        then(ok, bad) {
          return Promise.resolve().then(() => {
            const list = tables[table]
            if (!list) throw Error(`tabela inesperada ${table}`)
            let rows = list.filter((r) =>
              q.eqs.every(([k, v]) => field(r, k) === v) &&
              q.gtes.every(([k, v]) => String(field(r, k) ?? '') >= v) &&
              q.ins.every(([k, vals]) => vals.includes(field(r, k))))
            rows = rows.slice().sort((x, y) => String(x.id).localeCompare(String(y.id)))
            if (q.range) rows = rows.slice(q.range[0], q.range[1] + 1)
            else if (rows.length > 1000) rows = rows.slice(0, 1000) // o PostgREST real corta em silêncio
            return { data: rows.map((r) => ({ ...r })), error: null }
          }).then(ok, bad)
        },
      }
      return api
    },
  }
  return db
}

// Cenário sintético: o MEU afiliado (aff-me) e outro (aff-other) no mesmo banco.
function scenario() {
  const clicks = []
  let n = 0
  const click = (aff, landing, referrer, ua, at) => clicks.push({ id: `c${String(n++).padStart(6, '0')}`, affiliate_id: aff, landing_path: landing, referrer, user_agent: ua, created_at: iso(at), ip_hash: 'h' })
  for (let i = 0; i < 2400; i++) click('aff-me', `/a/${CODE}?to=video&p=tiktok-1`, 'https://www.tiktok.com/', HUMAN, NOW - (i % 20) * DAY)
  for (let i = 0; i < 50; i++) click('aff-me', `/a/${CODE}?to=video&p=yt-short`, 'https://m.youtube.com/watch?v=1', HUMAN, NOW - DAY)
  for (let i = 0; i < 30; i++) click('aff-me', `/a/${CODE}`, '', HUMAN, NOW - 2 * DAY)
  for (let i = 0; i < 20; i++) click('aff-me', `/a/${CODE}?to=video&p=tiktok-1`, 'https://www.tiktok.com/', 'curl/8.5.0', NOW - DAY)
  for (let i = 0; i < 5; i++) click('aff-me', `/a/${CODE}?to=video&p=velho`, 'https://www.tiktok.com/', HUMAN, NOW - 40 * DAY)
  for (let i = 0; i < 7; i++) click('aff-other', `/a/ZZZZ2345?to=video&p=tiktok-1`, 'https://www.tiktok.com/', HUMAN, NOW - DAY)
  const referrals = [
    { id: 'r1', affiliate_id: 'aff-me', referred_user_id: 'u1', status: 'paid', first_touch_at: iso(NOW - 3 * DAY), email: 'secret1@example.test' },
    { id: 'r2', affiliate_id: 'aff-me', referred_user_id: 'u2', status: 'signup', first_touch_at: iso(NOW - 3 * DAY), email: 'secret2@example.test' },
    { id: 'r3', affiliate_id: 'aff-me', referred_user_id: 'u3', status: 'signup', first_touch_at: iso(NOW - 3 * DAY), email: 'secret3@example.test' },
    { id: 'r4', affiliate_id: 'aff-me', referred_user_id: 'u4', status: 'signup', first_touch_at: iso(NOW - 3 * DAY), email: 'secret4@example.test' },
    { id: 'r5', affiliate_id: 'aff-me', referred_user_id: 'u5', status: 'paid', first_touch_at: iso(NOW - 40 * DAY), email: 'secret5@example.test' },
    { id: 'r9', affiliate_id: 'aff-other', referred_user_id: 'u9', status: 'paid', first_touch_at: iso(NOW - 3 * DAY), email: 'secret9@example.test' },
  ]
  for (let i = 0; i < 250; i++) referrals.push({ id: `rx${String(i).padStart(3, '0')}`, affiliate_id: 'aff-me', referred_user_id: `x${String(i).padStart(3, '0')}`, status: 'signup', first_touch_at: iso(NOW - 5 * DAY), email: 'x@example.test' })
  const ev = (id, user, meta, at = NOW - 3 * DAY) => ({ id, name: 'affiliate_signup_attribution_result', user_id: user, metadata: { source: 'auth_callback', ...meta }, created_at: iso(at) })
  const events = [
    ev('e1', 'u1', { outcome: 'attributed', affiliate_id: 'aff-me', post: 'tiktok-1', referrer_host: 'tiktok.com' }),
    ev('e2', 'u2', { outcome: 'attributed', affiliate_id: 'aff-me', post: 'yt-short', referrer_host: 'youtube.com' }),
    ev('e3', 'u3', { outcome: 'attributed', affiliate_id: 'aff-me', post: null, referrer_host: null }),
    // u4: o evento é de OUTRO afiliado → u4 fica "untracked", nunca herda o post de outro parceiro.
    ev('e4', 'u4', { outcome: 'attributed', affiliate_id: 'aff-other', post: 'tiktok-1', referrer_host: 'tiktok.com' }),
    // u9 é indicação de outro parceiro: um evento forjado com aff-me não o transforma em cadastro meu.
    ev('e9', 'u9', { outcome: 'attributed', affiliate_id: 'aff-me', post: 'tiktok-1', referrer_host: 'tiktok.com' }),
    ev('e10', 'u2', { outcome: 'already_attributed', affiliate_id: 'aff-me', post: 'tiktok-1', referrer_host: 'tiktok.com' }),
  ]
  const videos = [
    { id: 'v1', user_id: 'u1', status: 'completed' },
    { id: 'v1b', user_id: 'u1', status: 'completed' },
    { id: 'v2', user_id: 'u2', status: 'failed' },
    { id: 'v3', user_id: 'u3', status: 'completed' },
    { id: 'v4', user_id: 'u4', status: 'completed' },
    { id: 'v9', user_id: 'u9', status: 'completed' },
    { id: 'vx', user_id: 'x249', status: 'completed' },
  ]
  return { affiliate_clicks: clicks, affiliate_referrals: referrals, events, videos }
}
const EXPECTED = {
  rows: [
    { post: 'tiktok-1', origin: 'tiktok', clicks: 2400, signups: 1, first_film: 1, paid: 1 },
    { post: 'yt-short', origin: 'youtube', clicks: 50, signups: 1, first_film: 0, paid: 0 },
    { post: null, origin: 'other', clicks: 30, signups: 1, first_film: 1, paid: 0 },
  ],
  untracked: { clicks: 0, signups: 251, first_film: 2, paid: 0 },
  totals: { clicks: 2480, signups: 254, first_film: 4, paid: 1 },
  robots_excluded: 20,
}

async function problems(S) {
  const p = []
  const fail = (cond, msg) => { if (!cond) p.push(msg) }
  let destinations, attribution, stats, finalizer, route, db, events
  const readAllMod = compile(read('lib/supabase/readAll.ts'), { '../serverEvents': { writeServerEvent: async () => true } })
  try {
    destinations = compile(S.destinations)
    stats = compile(S.stats, { '@/lib/supabase/readAll': readAllMod, '@/lib/affiliateDestinations': destinations })
  } catch (e) {
    return ['montagem quebrou: ' + e.message]
  }

  // ── A. forma do post ──
  for (const ok of ['tiktok-1', 'a', '1', 'yt-short-2026', 'x'.repeat(24), 'a-']) fail(destinations.normalizeAffiliatePostTag(ok) === ok, `post válido recusado: ${ok}`)
  fail(destinations.normalizeAffiliatePostTag(' TikTok-1 ') === 'tiktok-1', 'maiúscula/espaço nas pontas não normalizou')
  for (const bad of [...INVALID_POSTS, null, undefined]) fail(destinations.normalizeAffiliatePostTag(bad) === null, `post inválido aceito: ${JSON.stringify(bad)}`)
  fail(destinations.readAffiliatePostTag(new URLSearchParams('post=ig-2')) === 'ig-2', '?post= (apelido) não lido')
  fail(destinations.readAffiliatePostTag(new URLSearchParams('p=bad tag&post=ig-2')) === 'ig-2', 'p inválido escondeu um post válido')
  fail(destinations.slugifyAffiliatePostName('TikTok #1 — Outubro') === 'tiktok-1-outubro', `gerador: ${destinations.slugifyAffiliatePostName('TikTok #1 — Outubro')}`)
  fail(destinations.slugifyAffiliatePostName('Ação Instagram') === 'acao-instagram', 'gerador não tirou acento')
  {
    const long = destinations.slugifyAffiliatePostName('my very long youtube short about money 2026')
    fail(long && long.length <= 24 && !long.endsWith('-') && destinations.normalizeAffiliatePostTag(long) === long, `gerador longo: ${long}`)
  }
  fail(destinations.slugifyAffiliatePostName('!!!') === null, 'gerador aceitou nome sem letra/número')
  fail(destinations.buildAffiliatePostShareLink(`${ORIGIN}/a/${CODE}`, 'video', 'tiktok-1') === `${ORIGIN}/a/${CODE}?to=video&p=tiktok-1`, 'link do post não é o do Copiar + &p=')
  fail(destinations.buildAffiliatePostShareLink(`${ORIGIN}/a/${CODE}`, 'video', 'bad tag') === `${ORIGIN}/a/${CODE}?to=video`, 'post inválido entrou no link copiado')
  fail(destinations.buildAffiliatePostShareLink('https://evil.com/x', 'video', 'tiktok-1') === '', 'gerador aceitou link fora do /a/CODE')
  for (const [ref, want] of [['https://www.tiktok.com/', 'tiktok'], ['vm.tiktok.com', 'tiktok'], ['https://m.youtube.com/watch', 'youtube'], ['youtu.be', 'youtube'], ['https://l.instagram.com/?u=x', 'instagram'], ['https://t.co/abc', 'x'], ['twitter.com', 'x'], ['x.com', 'x'], ['https://www.colormango.com/p', 'other'], ['', 'other'], [null, 'other'], ['https://nottiktok.com/', 'other'], ['https://tiktok.com.evil.io/', 'other']]) {
    fail(destinations.affiliateTrafficOrigin(ref) === want, `origem de ${ref} ≠ ${want} (${destinations.affiliateTrafficOrigin(ref)})`)
  }

  // ── A. rota /a/[code] real ──
  try {
    attribution = compile(S.attribution, { '@supabase/supabase-js': { createClient: () => { throw Error('não usado') } }, '@/lib/affiliateCode': affiliateCode })
    const mkRedirect = (url) => { const r = { location: String(url), writes: [] }; r.cookies = { set: (name, value, options) => r.writes.push({ name, value, options }) }; return r }
    db = { tables: { affiliates: [{ id: 'aff-me', code: CODE, status: 'active' }], affiliate_clicks: [] }, from(t) { return new RouteQuery(this, t) } }
    events = []
    route = compile(S.route, {
      'next/server': { NextResponse: { redirect: mkRedirect } },
      crypto,
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/affiliateDestinations': destinations,
      '@/lib/affiliateAttribution': attribution,
      '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
    }, { AFFILIATE_IP_SALT: 'sal-de-teste' })
  } catch (e) {
    return [...p, 'montagem da rota quebrou: ' + e.message]
  }
  const hit = async (query, { ua = HUMAN, code = CODE } = {}) => {
    events.length = 0
    const before = db.tables.affiliate_clicks.length
    const res = await route.GET({
      nextUrl: new URL(`${ORIGIN}/a/${code}${query}`),
      headers: { get: (k) => (k === 'user-agent' ? ua : k === 'referer' ? 'https://www.tiktok.com/' : k === 'x-forwarded-for' ? '203.0.113.7' : null) },
      cookies: { get: () => undefined },
    }, { params: { code } })
    const url = new URL(res.location)
    return { url, newClicks: db.tables.affiliate_clicks.slice(before), events: [...events] }
  }
  {
    const r = await hit('?to=video&p=TikTok-1')
    fail(r.url.pathname === '/free-ai-shorts-generator' && r.url.searchParams.get('utm_campaign') === 'affiliate_video', '&p= mudou o destino')
    fail(r.url.searchParams.get('utm_term') === 'tiktok-1', `utm_term não é o post (${r.url.searchParams.get('utm_term')})`)
    fail(r.url.searchParams.get('utm_content') === CODE && r.url.searchParams.get('utm_source') === 'affiliate', 'etiqueta do afiliado sumiu com o post')
    fail(r.newClicks.length === 1 && r.newClicks[0].landing_path === `/a/${CODE}?to=video&p=tiktok-1`, `clique não gravou o post no landing_path (${r.newClicks[0]?.landing_path})`)
    fail(r.events.some((e) => e.name === 'affiliate_link_clicked' && e.metadata?.post === 'tiktok-1' && e.metadata?.counted === true), 'evento de clique sem o post')
  }
  {
    const r = await hit('?post=ig-2')
    fail(r.url.searchParams.get('utm_term') === 'ig-2' && r.newClicks[0]?.landing_path === `/a/${CODE}?p=ig-2`, `?post= sem ?to= não virou p (${r.newClicks[0]?.landing_path})`)
  }
  {
    const r = await hit('?to=video')
    fail(!r.url.searchParams.has('utm_term') && r.newClicks[0]?.landing_path === `/a/${CODE}?to=video`, 'link sem post ganhou utm_term/p')
    fail(r.events.some((e) => e.metadata?.post === null), 'link sem post: evento sem post=null')
  }
  for (const bad of INVALID_POSTS.filter(Boolean)) {
    const r = await hit(`?to=video&p=${encodeURIComponent(bad)}`)
    fail(ALLOWED_PATHS.has(r.url.pathname) && r.url.origin === ORIGIN, `p inválido (${bad}) tirou o destino da lista branca`)
    fail(!r.url.searchParams.has('utm_term'), `p inválido (${bad}) virou utm_term`)
    fail(r.newClicks[0]?.landing_path === `/a/${CODE}?to=video`, `p inválido (${bad}) gravado no clique (${r.newClicks[0]?.landing_path})`)
    fail(r.events.every((e) => e.metadata?.post === null), `p inválido (${bad}) foi para o evento`)
  }
  {
    const r = await hit('?to=video&p=tiktok-1', { ua: 'curl/8.5.0' })
    fail(r.newClicks.length === 0 && r.events.some((e) => e.metadata?.is_bot === true && e.metadata?.post === 'tiktok-1'), 'robô com post: gravou clique ou perdeu o post no evento')
  }

  // ── B. atribuição devolve a origem só na indicação nova; o evento a leva só nela ──
  {
    const CLICK_ID = '11111111-1111-4111-8111-111111111111'
    const run = async ({ landing = `/a/${CODE}?to=video&p=tiktok-1`, referrer = 'https://www.tiktok.com/@x', insert = 'ok', existing = null } = {}) => {
      const st = { inserted: 0 }
      const mockDb = {
        from(table) {
          const q = { table, op: 'select', filters: {} }
          const api = {
            select() { return api }, eq(k, v) { q.filters[k] = v; return api },
            insert(v) { q.op = 'insert'; q.value = v; return api }, update(v) { q.op = 'update'; q.value = v; return api },
            async maybeSingle() {
              if (table === 'affiliate_referrals' && q.op === 'select') return { data: st.inserted && insert === 'race' ? { affiliate_id: 'aff-first' } : existing, error: null }
              if (table === 'affiliates') return { data: { id: 'aff-me', user_id: 'owner', status: 'active' }, error: null }
              if (table === 'affiliate_clicks') return { data: { id: CLICK_ID, affiliate_id: 'aff-me', created_at: iso(Date.now() - 3600e3), landing_path: landing, referrer }, error: null }
              if (table === 'affiliate_referrals' && q.op === 'insert') { st.inserted++; return insert === 'race' ? { data: null, error: { code: '23505' } } : { data: { id: 'r-new', affiliate_id: 'aff-me' }, error: null } }
              if (table === 'profiles') return { data: { id: 'buyer', affiliate_id: q.value.affiliate_id }, error: null }
              throw Error(`consulta inesperada ${table}/${q.op}`)
            },
          }
          return api
        },
      }
      const mod = compile(S.attribution, { '@supabase/supabase-js': { createClient: () => mockDb }, '@/lib/affiliateCode': affiliateCode })
      return mod.attributeAffiliateForUser(CODE, { id: 'buyer', createdAt: iso(Date.now() - 60e3) }, { clickId: CLICK_ID })
    }
    const fresh = await run()
    fail(fresh.ok && fresh.already === false && fresh.source?.post === 'tiktok-1' && fresh.source?.referrerHost === 'tiktok.com', `indicação nova sem origem: ${JSON.stringify(fresh)}`)
    const badPost = await run({ landing: `/a/${CODE}?to=video&p=Bad%20Tag`, referrer: '' })
    fail(badPost.ok && badPost.source?.post === null && badPost.source?.referrerHost === null, `post fora da forma virou origem: ${JSON.stringify(badPost)}`)
    const race = await run({ insert: 'race' })
    fail(race.ok && race.already === true && race.source === undefined, `perdedor da corrida levou origem: ${JSON.stringify(race)}`)
    const already = await run({ existing: { id: 'r-old', affiliate_id: 'aff-me' } })
    fail(already.ok && already.already === true && already.source === undefined, 'indicação existente levou origem')
    // espelho: a forma do post na atribuição é a MESMA de normalizeAffiliatePostTag
    const attr = compile(S.attribution, { '@supabase/supabase-js': { createClient: () => ({}) }, '@/lib/affiliateCode': affiliateCode })
    for (const sample of ['tiktok-1', 'x'.repeat(24), 'x'.repeat(25), '---', 'a_b', 'ig-2', '9']) {
      const got = attr.affiliateReferralClickSource({ landing_path: `/a/${CODE}?p=${encodeURIComponent(sample)}`, referrer: '' }).post
      fail(got === destinations.normalizeAffiliatePostTag(sample), `espelho do post divergiu em ${sample}: ${got}`)
    }
  }
  {
    const evs = []
    const fin = (result) => compile(S.finalizer, {
      'server-only': {},
      '@/lib/affiliateAttribution': { attributeAffiliateForUser: async () => result, normalizeAffiliateClickId: (v) => v },
      '@/lib/serverEvents': { writeServerEvent: async (e) => { evs.push(e); return true } },
    })
    const input = { rawCode: CODE, rawClickId: 'x', user: { id: 'buyer' }, source: 'auth_callback' }
    await fin({ ok: true, affiliateId: 'aff-me', already: false, source: { post: 'tiktok-1', referrerHost: 'tiktok.com' } }).finalizeAffiliateSignupAttribution(input)
    const m = evs[0]?.metadata ?? {}
    fail(evs[0]?.name === 'affiliate_signup_attribution_result' && m.outcome === 'attributed' && m.affiliate_id === 'aff-me' && m.post === 'tiktok-1' && m.referrer_host === 'tiktok.com', `evento de atribuição sem a origem: ${JSON.stringify(m)}`)
    fail(!('code' in m) && !JSON.stringify(m).includes(CODE), 'evento de atribuição levou o código')
    evs.length = 0
    await fin({ ok: true, affiliateId: 'aff-me', already: true, source: { post: 'tiktok-1', referrerHost: 'tiktok.com' } }).finalizeAffiliateSignupAttribution(input)
    fail(evs[0] && !('affiliate_id' in evs[0].metadata) && !('post' in evs[0].metadata), 'indicação já existente levou origem no evento (cadastro contado 2x)')
    evs.length = 0
    await fin({ ok: false, reason: 'invalid_click_proof' }).finalizeAffiliateSignupAttribution(input)
    fail(evs[0] && !('affiliate_id' in evs[0].metadata), 'falha de atribuição levou dono no evento')
  }
  fail(/\n\s*'affiliate_signup_attribution_result',/.test(S.events), 'affiliate_signup_attribution_result não está em SERVER_ONLY_EVENTS (o navegador inventaria cadastro por post)')

  // ── C. conta pura ──
  {
    const T = scenario()
    const rep = stats.buildAffiliateLinkStats({
      affiliateId: 'aff-me', clicks: T.affiliate_clicks, referrals: T.affiliate_referrals, sources: T.events,
      filmUserIds: new Set(T.videos.filter((v) => v.status === 'completed').map((v) => v.user_id)), nowMs: NOW,
    })
    fail(JSON.stringify(rep.rows) === JSON.stringify(EXPECTED.rows), `linhas erradas: ${JSON.stringify(rep.rows)}`)
    fail(JSON.stringify(rep.untracked) === JSON.stringify(EXPECTED.untracked), `untracked errado: ${JSON.stringify(rep.untracked)}`)
    fail(JSON.stringify(rep.totals) === JSON.stringify(EXPECTED.totals), `totais errados: ${JSON.stringify(rep.totals)}`)
    fail(rep.robots_excluded === EXPECTED.robots_excluded, `robôs: ${rep.robots_excluded}`)
    fail(rep.window_days === 30 && rep.others === null, 'janela/others')
    const txt = JSON.stringify(rep)
    fail(!/secret|example\.test|"u1"|"u4"|"x249"|aff-other|ZZZZ2345/.test(txt), 'saída com dado de pessoa ou de outro parceiro')
    // muitos posts: corta em 30 linhas e soma o resto em `others`, sem perder total
    const many = []
    for (let i = 0; i < 45; i++) for (let j = 0; j <= i % 3; j++) many.push({ affiliate_id: 'aff-me', landing_path: `/a/${CODE}?p=post-${i}`, referrer: '', user_agent: HUMAN, created_at: iso(NOW - DAY) })
    const capped = stats.buildAffiliateLinkStats({ affiliateId: 'aff-me', clicks: many, referrals: [], sources: [], filmUserIds: [], nowMs: NOW })
    fail(capped.rows.length === 30 && capped.others && capped.others.clicks + capped.rows.reduce((s, r) => s + r.clicks, 0) === many.length && capped.totals.clicks === many.length, 'corte de linhas perdeu clique')
  }

  // ── D. leitura paginada e escopada ──
  {
    const T = scenario()
    const rdb = readerDb(T)
    let rep = null
    try { rep = await stats.readAffiliateLinkStats(rdb, 'aff-me', NOW) } catch (e) { p.push('leitura lançou: ' + e.message) }
    if (rep) {
      fail(JSON.stringify(rep.rows) === JSON.stringify(EXPECTED.rows) && JSON.stringify(rep.totals) === JSON.stringify(EXPECTED.totals), `leitura ≠ conta (paginação?): ${JSON.stringify(rep.totals)}`)
      fail(JSON.stringify(rep.untracked) === JSON.stringify(EXPECTED.untracked), `leitura: untracked ${JSON.stringify(rep.untracked)}`)
    }
    const clickPages = rdb.log.filter((q) => q.table === 'affiliate_clicks')
    fail(clickPages.length >= 3 && clickPages.every((q) => q.range), `cliques não paginados (${clickPages.length} consultas)`)
    const scoped = rdb.log.every((q) => {
      if (q.table === 'affiliate_clicks' || q.table === 'affiliate_referrals') return q.eqs.some(([k, v]) => k === 'affiliate_id' && v === 'aff-me')
      if (q.table === 'events') return q.eqs.some(([k, v]) => k === 'metadata->>affiliate_id' && v === 'aff-me') && q.eqs.some(([k, v]) => k === 'name' && v === 'affiliate_signup_attribution_result')
      if (q.table === 'videos') return q.ins.length === 1 && q.ins[0][0] === 'user_id' && q.eqs.some(([k, v]) => k === 'status' && v === 'completed')
      return false
    })
    fail(scoped, 'consulta sem o affiliate_id do dono (ou tabela inesperada)')
    fail(rdb.maxIn > 0 && rdb.maxIn <= 100, `.in() com ${rdb.maxIn} ids (lote > 100)`)
    const vids = rdb.log.filter((q) => q.table === 'videos')
    fail(vids.every((q) => q.ins[0][1].every((id) => T.affiliate_referrals.some((r) => r.affiliate_id === 'aff-me' && r.referred_user_id === id))), 'vídeos lidos de quem não é indicação do dono')
    // leitura que falha não vira número parcial
    const broken = readerDb(T)
    const origFrom = broken.from.bind(broken)
    broken.from = (t) => { const q = origFrom(t); if (t === 'events') { q.then = (ok, bad) => Promise.resolve({ data: null, error: { message: 'boom' } }).then(ok, bad) } return q }
    let threw = false
    try { await stats.readAffiliateLinkStats(broken, 'aff-me', NOW) } catch { threw = true }
    fail(threw, 'leitura com erro devolveu número em vez de lançar')
  }

  // ── E. /api/affiliate/me ──
  {
    const calls = []
    const runMe = async (statsImpl) => {
      const meDb = {
        from(table) {
          const api = {
            select() { return api }, eq() { return api }, order() { return api },
            maybeSingle: async () => (table === 'affiliates'
              ? { data: { id: 'fixture-affiliate', code: 'FIXTURE1', status: 'active', commission_rate: 0.4, coupon_code: 'EXISTING', created_at: '2026-10-01T00:00:00Z' } }
              : { data: null, error: { message: 'sem tabela' } }),
            then(ok, bad) { return Promise.resolve(table === 'affiliate_commissions' ? { data: [] } : { count: 0 }).then(ok, bad) },
          }
          return api
        },
      }
      const mod = compile(S.me, {
        'next/server': { NextResponse: { json: (body, opts) => ({ body, status: opts?.status ?? 200 }) } },
        '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'session-user' } } }) } }) },
        '@supabase/supabase-js': { createClient: () => meDb },
        '@/lib/stripe': { stripe: {} },
        '@/lib/settlementCurrency': { BRL_PER_USD_HOUSE: 5 },
        '@/lib/partnerPack': compile(read('lib/partnerPack.ts'), {}),
        '@/lib/affiliateCommission': compile(read('lib/affiliateCommission.ts'), {}),
        '@/lib/affiliatePostStats': { readAffiliateLinkStats: statsImpl },
      })
      return mod.GET()
    }
    const ok = await runMe(async (_db, affiliateId) => { calls.push(affiliateId); return { available: true, rows: [], marker: 'from-stats' } })
    fail(ok.status === 200 && ok.body.links?.marker === 'from-stats', '/me não devolve links')
    fail(calls.length === 1 && calls[0] === 'fixture-affiliate', `/me leu links de outro escopo: ${JSON.stringify(calls)}`)
    const down = await runMe(async () => { throw Error('banco fora') })
    fail(down.status === 200 && down.body.links?.available === false && down.body.stats, '/me caiu (ou mentiu zero) quando a leitura falhou')
  }

  // ── F. painel ──
  {
    const pg = S.page
    fail(pg.includes('<YourLinksTable links={data.links} />'), 'painel não mostra "Your links"')
    fail(pg.includes('<PostLinkGenerator') && pg.includes('Name this post') && pg.includes('Copy post link') && pg.includes('buildAffiliatePostShareLink(baseLink, destinationKey, tag)'), 'gerador "name this post" ausente')
    fail(/robots and link previews are excluded/.test(pg) && /first partner link the person clicked, for 90 days/.test(pg) && /Visits are people, not page loads/.test(pg), 'rodapé honesto ausente')
    fail(/Never who signed up|never who signed up/.test(pg), 'rodapé não diz que só há contagens')
    for (const col of ['>Visits<', '>Signups<', '>Made a 1st film<', '>Paid<', '>From<', '>Post<', '>1st film<']) fail(pg.includes(col), `coluna ${col} ausente`)
  }
  return p
}

let ok = 0
const verdict = await problems(REAL)
if (verdict.length) {
  console.error('FALHA no código real:\n  - ' + verdict.join('\n  - '))
  process.exit(1)
}
ok++
console.log('  ok  código real: p validado → clique + utm_term; origem na indicação nova; Your links escopado, sem robô, paginado')

const mutants = [
  ['p aceita qualquer texto', 'destinations', 'const AFFILIATE_POST_TAG_SHAPE = /^(?=[a-z0-9-]*[a-z0-9])[a-z0-9-]{1,24}$/', 'const AFFILIATE_POST_TAG_SHAPE = /^.{0,200}$/'],
  ['p perde o limite de 24', 'destinations', 'const AFFILIATE_POST_TAG_SHAPE = /^(?=[a-z0-9-]*[a-z0-9])[a-z0-9-]{1,24}$/', 'const AFFILIATE_POST_TAG_SHAPE = /^(?=[a-z0-9-]*[a-z0-9])[a-z0-9-]{1,99}$/'],
  ['destino sem utm_term', 'route', 'buildAffiliateRouteDestinationUrl(appUrl, destination.key, code, post)', 'buildAffiliateRouteDestinationUrl(appUrl, destination.key, code)'],
  ['clique sem o post', 'route', 'affiliateClickLandingPath(code, asked, post)', 'affiliateClickLandingPath(code, asked)'],
  ['evento de clique sem o post', 'route', '        post: input.post,\n', ''],
  ['atribuição sem origem', 'attribution', "...(already ? {} : { source: affiliateReferralClickSource(click) })", '...{}'],
  ['perdedor da corrida leva origem', 'attribution', "...(already ? {} : { source: affiliateReferralClickSource(click) })", 'source: affiliateReferralClickSource(click)'],
  ['evento de atribuição leva origem em "already"', 'finalizer', 'result.ok && !result.already && result.source', 'result.ok && result.source'],
  ['evento de atribuição sem dono', 'finalizer', '            affiliate_id: result.affiliateId,\n', ''],
  ['evento de atribuição forjável pelo navegador', 'events', "  'affiliate_signup_attribution_result',\n", ''],
  ['clique de outro afiliado conta', 'stats', '    if (click.affiliate_id !== input.affiliateId) continue\n', ''],
  ['indicação de outro afiliado conta', 'stats', '    if (r.affiliate_id !== input.affiliateId || !r.referred_user_id) continue', '    if (!r.referred_user_id) continue'],
  ['origem de outro afiliado vale', 'stats', "    if (meta.affiliate_id !== input.affiliateId || meta.outcome !== 'attributed') continue", "    if (meta.outcome !== 'attributed') continue"],
  ['robô volta a contar', 'stats', '    if (isAffiliatePreviewBot(click.user_agent)) {', '    if (false) {'],
  ['janela de 30 dias some', 'stats', '    if (!inWindow(click.created_at, sinceMs, input.nowMs)) continue\n', ''],
  ['sem origem vira "other" em vez de untracked', 'stats', 'const counts: AffiliateLinkCounts = src ? rowFor(src.post, src.origin) : untracked', "const counts: AffiliateLinkCounts = src ? rowFor(src.post, src.origin) : rowFor(null, 'other')"],
  ['leitura de cliques sem escopo', 'stats', "        .select('id, affiliate_id, landing_path, referrer, user_agent, created_at')\n        .eq('affiliate_id', affiliateId)", "        .select('id, affiliate_id, landing_path, referrer, user_agent, created_at')"],
  ['leitura de cliques só da 1ª página', 'stats', 'readAll<PostStatsClick>(', '((b: () => any) => b())('],
  ['.in() sem lote', 'stats', 'export const AFFILIATE_LINKS_IN_CHUNK = 100', 'export const AFFILIATE_LINKS_IN_CHUNK = 100000'],
  ['/me lê links pelo id da sessão em vez do afiliado', 'me', 'readAffiliateLinkStats(admin, affiliateId)', 'readAffiliateLinkStats(admin, user.id)'],
  ['/me cai junto com a leitura', 'me', "      links = await readAffiliateLinkStats(admin, affiliateId)\n    } catch (err) {", "      links = await readAffiliateLinkStats(admin, affiliateId)\n    } finally {} if (false) { const err = null"],
  ['painel sem a tabela', 'page', '      <YourLinksTable links={data.links} />\n', ''],
  ['rodapé sem robôs', 'page', 'Visits are people, not page loads: robots and link previews are excluded', 'Visits'],
]
let failed = 0
for (const [name, key, from, to] of mutants) {
  const S = { ...REAL }
  if (S[key].split(from).length !== 2) { console.error(`  FALHA mutante "${name}" não se aplica (âncora sumiu ou repetida)`); failed++; continue }
  S[key] = S[key].replace(from, to)
  if (S[key] === REAL[key]) { console.error(`  FALHA mutante "${name}" não mudou o texto`); failed++; continue }
  const found = await problems(S)
  if (found.length === 0) { console.error(`  FALHA mutante sobreviveu: ${name}`); failed++; continue }
  ok++
  console.log(`  ok  mutante derrubado: ${name} (${found[0].slice(0, 90)})`)
}
assert.equal(failed, 0, `${failed} mutante(s) sobreviveram ou não se aplicaram`)

// ── H. desfaz: byte a byte à base; mudança alheia dentro de um trecho lança ──
{
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 })
  let anc = true
  try { git('merge-base', '--is-ancestor', AFILIADO_POR_POST_1610_BASE, 'HEAD') } catch { anc = false }
  assert.ok(anc, 'a base do desfaz não é ancestral de HEAD')
  assert.equal(MARCA_AFILIADO_POR_POST_1610, 'KINEO-AFILIADO-POR-POST-1610')
  for (const f of AFILIADO_POR_POST_1610_ARQUIVOS) {
    const base = git('show', `${AFILIADO_POR_POST_1610_BASE}:${f}`).replace(/\r\n/g, '\n')
    assert.equal(semAfiliadoPorPost1610(f, semClareza1610(f, read(f))), base, `desfeito, ${f} não é EXATAMENTE a base`) // reancorado KINEO-LEVA2-1510
  }
  const probe = read('app/api/events/route.ts').replace("  'affiliate_signup_attribution_result',\n", "  'affiliate_signup_attribution_result' ,\n")
  assert.notEqual(probe, read('app/api/events/route.ts'), 'a sonda do desfaz não se aplicou')
  assert.throws(() => semAfiliadoPorPost1610('app/api/events/route.ts', probe), /mudou fora deste conserto/, 'o desfaz engoliu uma mudança dentro do trecho')
  ok++
  console.log(`  ok  desfaz: ${AFILIADO_POR_POST_1610_ARQUIVOS.length} arquivos voltam byte a byte à base ${AFILIADO_POR_POST_1610_BASE.slice(0, 8)}; mudança alheia no trecho lança`)
}
console.log(`\nPASS — test-afiliado-por-post-1610: ${ok} ok (1 código real + ${mutants.length} mutantes + desfaz)`)
