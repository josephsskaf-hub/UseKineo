// KINEO-DEMO-SOB-MEDIDA-1510 — guardião da MÁQUINA DE DEMO SOB MEDIDA do B2B (/admin/demo; regras em lib/ads/demoSobMedida.ts).
// Prova EXECUTANDO o código real pelo carregador offline (sem rede, sem banco, sem fornecedor, sem render pago):
//   D1  só ADMIN: sem sessão = 401; e-mail fora do ADMIN_EMAILS = 403 (GET e POST), nada criado, nenhum evento;
//   D2  conta NÃO-interna recusada nas DUAS camadas: a rota (admin que não é isAdsInternalEmail = 403 not_house_account) e o
//       núcleo (acesso que não é 'internal' = 403), sem pedido nem evento;
//   D3  fluxo feliz: rascunho Comercial 15 s na conta da CASA (brief.demo, língua da voz, marca no ad_brands da casa), fotos
//       produto com a original (trava do produto), WebP de fora, cartão com o botão na língua da voz, /plan → dry-run → /start
//       NESSA ordem (ensaio de US$ 0 antes do débito); evento demo_sob_medida_created com o link SEM query (nada de e-mail de
//       terceiros); zero chamada à fal e zero dinheiro fora do /start de sempre;
//   D4  teto de 3 por semana ISO (Brasília): a 4ª = 429; exceção sem motivo = 400; com motivo = 202 e o motivo GRAVADO; demo da
//       semana passada não conta; contagem que não lê = 503 (fechado); semana vira na segunda 00:00 de Brasília;
//   D5  fal recusou por saldo nas últimas 6 h = 409 antes de qualquer leitura de link ou pedido;
//   D6  depois da ENTREGA, pelo CRON de sempre: 4:5 (1080×1350) e 1:1 (1080×1080) com as MESMAS URLs de clipe, versões entregues,
//       link de aprovação com o nome da marca (token derivado = o da tela), evento de entregue; 2ª volta não remonta, não duplica;
//       a tela lista "pronta" com o link e os textos EN/ES/DE; a página privada mostra os 3 formatos (cópias em renders/share),
//       sample:true, as chaves FECHADAS e nada da conta da casa;
//   D7  noindex: a página de aprovação e a /admin/demo fora do índice; a página SEMPRE rotula IA e o apresentador de IA;
//   D8  fora de vitrine/sitemap/llms: os arquivos da demo nunca carimbam published_at; os vídeos são 'ads_v2' (fora do ENGINE_ORDER
//       da vitrine); o sitemap só lista publicado com a superfície pública DESLIGADA; llms/sitemap não citam /approve;
//   D10 o DESFAZ (scripts/test-support/desfaz-demo-sob-medida-1510.mjs) devolve cada arquivo que já existia EXATAMENTE como o pai do 1º
//       commit com a marca (os guardiões antigos que conferem byte a byte leem por ele); estrito: trecho mexido = lança;
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semDemoSobMedida1510, ARQUIVOS_DEMO_SOB_MEDIDA_1510, MARCA_DEMO_SOB_MEDIDA_1510 } from './test-support/desfaz-demo-sob-medida-1510.mjs'
// KINEO-ADMIN-JORNADA-1510 — a aba Clientes (camada mais nova) mexeu no menu do admin: desfeita por DENTRO antes do byte a byte do D10.
import { semAdminJornada1510 } from './test-support/desfaz-admin-jornada-1510.mjs'
import { semPacote3Filmes1610 } from './test-support/desfaz-pacote-3-filmes-1610.mjs' // KINEO-PACOTE-3-FILMES-1610 — o menu do admin ganhou "Pedidos 3 filmes" depois: sai PRIMEIRO

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = async (fn) => { try { return !!(await fn()) } catch (e) { if (process.env.DEBUG_DEMO) console.log('       (lançou: ' + (e && e.stack) + ')'); return false } }

const F = {
  pure: 'lib/ads/demoSobMedida.ts',
  server: 'lib/ads/demoSobMedidaServer.ts',
  photo: 'lib/ads/demoPhoto.tsx',
  route: 'app/api/admin/demo/route.ts',
  page: 'app/admin/demo/page.tsx',
  client: 'app/admin/demo/DemoClient.tsx',
  cron: 'app/api/cron/ads-v2-advance/route.ts',
  posServer: 'lib/ads/v2PostDeliveryServer.ts',
  extras: 'lib/ads/approvalExtrasServer.ts',
  posPure: 'lib/ads/v2PostDelivery.ts',
  view: 'app/api/ads/v2/approval/view/route.ts',
  approvePage: 'app/approve/page.tsx',
  approveClient: 'app/approve/ApproveClient.tsx',
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
let PAI = null
try { const shas = git(['log', '--no-merges', '--format=%H', `--grep=${MARCA_DEMO_SOB_MEDIDA_1510}`, 'HEAD']).trim().split(String.fromCharCode(10)).filter(Boolean); PAI = shas.length ? git(['rev-parse', `${shas[shas.length - 1]}~1`]).trim() : 'HEAD' } catch { PAI = null }
const rdPai = (rel) => { try { return lf(git(['show', `${PAI}:${rel}`])) } catch { return null } }
console.log(`   pai do 1º commit da demo: ${PAI}`)
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, rd(v)]))

// ── o mundo falso ─────────────────────────────────────────────────────────────────────────────────────────────────────
const HOUSE = '11111111-1111-4111-8111-111111111111'
const HOUSE_EMAIL = 'josephsskaf@gmail.com' // ADMIN e conta da casa (lib/internalAccounts.ts)
const ADMIN_NOT_HOUSE = 'josephskaf@gmail.com' // ADMIN, mas fora do INTERNAL_EXACT_EMAILS
const ORDER = '33333333-3333-4333-8333-333333333333'
const V1 = '55555555-5555-4555-8555-555555555555'
const SB = 'https://x.supabase.co/storage/v1/object/public'
const SECRET = 'segredo-de-teste-da-demo'
const NOW = new Date('2026-10-15T15:00:00Z') // quinta, 12:00 em Brasília
const clipUrl = (i) => `${SB}/renders/${HOUSE}/adsv2-${ORDER}-shot-${i}.mp4`
const CARD = `${SB}/user-footage/${HOUSE}/card.png`
const VOICE = `${SB}/voiceovers/${HOUSE}/v.mp3`
const MUSIC = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/music/emotional-02.mp3'
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, ...new Array(2000).fill(1)])

function plano() {
  return {
    shots: [{ idx: 0, kind: 'product' }, { idx: 1, kind: 'people' }, { idx: 2, kind: 'place' }, { idx: 3, kind: 'text', packshot: true }],
    overlays: [{ role: 'hook', start: 0.3, end: 4.5, text: 'Lume eau de parfum' }, { role: 'b', start: 5, end: 9.5, text: 'Light floral' }],
    narration: 'Meet Lume. Light floral, all day.',
  }
}
function linhas() {
  const k = ['product', 'people', 'place', 'text']
  return k.map((kind, idx) => ({
    id: `${ORDER}-s${idx}`, order_id: ORDER, idx, attempt: 1, role: 'r', kind, source: 'client_photo', source_footage_id: null, image_url: null, image_request_id: null,
    engine: kind === 'text' ? null : 'kling_o3', prompt: null, gen_seconds: 5, cut_start: kind === 'text' ? 0 : 0.2, cut_seconds: 3, request_id: kind === 'text' ? null : `req-${idx}`,
    status: kind === 'text' ? 'skipped_text' : 'done', fal_url: kind === 'text' ? null : `https://v3.fal.media/files/clip-${idx}.mp4`,
    stored_url: kind === 'text' ? `${SB}/user-footage/${HOUSE}/photo-${idx}.jpg` : clipUrl(idx), measured_seconds: kind === 'text' ? null : 5,
    usd: 0.5, reason: null, reason_class: null, movement_variant: 0, created_at: '2026-10-15T10:00:00Z', updated_at: '2026-10-15T10:00:00Z',
  }))
}

function mundo(opts = {}) {
  const db = {
    events: [...(opts.events ?? [])],
    profiles: [{ id: HOUSE, video_credits: opts.balance ?? 500 }],
    ads_v2_orders: [],
    ads_v2_shots: [],
    ads_v2_versions: [],
    ads_v2_approvals: [],
    videos: [],
    ad_brands: [],
    user_footage: [],
  }
  if (opts.delivered) {
    db.ads_v2_orders.push({ id: ORDER, user_id: HOUSE, status: 'delivered', tier: 'commercial', seconds: 15, sector: 'store', brief: { business: 'Lume', sentence: 'Lume — eau de parfum', link: 'https://lume.test/p/1', demo: { kind: 'sob_medida', brand: 'Lume Parfums', voice: 'de' } }, language: 'de', narration: true, logo_footage_id: null, card_url: CARD, card_footage_id: null, photos: [], plan: plano(), music_url: MUSIC, voice_url: VOICE, voice_seconds: 11.2, billing_ref: `adsv2-${ORDER}-g1`, credits_charged: 30, generation_id: 'g1', creatomate_render_id: 'r-orig', video_id: V1, error: null, created_at: '2026-10-15T09:00:00Z', updated_at: '2026-10-15T09:10:00Z', started_at: '2026-10-15T09:00:00Z', delivered_at: '2026-10-15T09:10:00Z', failed_at: null, assembly_lease_at: null, assembly_submit_at: null, parent_order_id: null, retake_idx: null })
    db.ads_v2_shots.push(...linhas())
    db.videos.push({ id: V1, user_id: HOUSE, status: 'completed', video_url: `${SB}/renders/${HOUSE}/adsv2-${ORDER}-g1.mp4`, render_id: `adsv2-${ORDER}-g1`, credits_used: 30, quality_mode: 'ads_v2' })
    db.events.push({ id: 'ev-demo', name: 'demo_sob_medida_created', user_id: HOUSE, created_at: '2026-10-15T09:00:00.000Z', metadata: { order_id: ORDER, brand: 'Lume Parfums', voice: 'de', link: 'https://lume.test/p/1', host: 'lume.test', exception: false } })
  }
  const calls = { access: [], fal: [], money: [], creatomate: [], events: [], storage: [], plan: [], start: [], card: [], link: [], photo: [] }
  const UNIQUE = { ads_v2_versions: [['order_id', 'version']], videos: [['render_id'], ['id']], ads_v2_approvals: [['token_hash']] }
  let seq = 0
  const match = (row, f) => f.every(([k, v, op]) => (op === 'in' ? v.includes(row[k]) : op === 'is' ? (row[k] ?? null) === v : op === 'gte' ? Date.parse(row[k]) >= Date.parse(v) : row[k] === v))
  class Q {
    constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.ord = null; this.lim = null; this.cnt = false; this.ret = false }
    select(_c, o) { if (this.op === 'select') { if (o && o.count) this.cnt = true } else this.ret = true; return this }
    eq(k, v) { this.f.push([k, v]); return this }
    is(k, v) { this.f.push([k, v, 'is']); return this }
    in(k, v) { this.f.push([k, v, 'in']); return this }
    gte(k, v) { this.f.push([k, v, 'gte']); return this }
    neq() { return this }
    order(k, o) { if (!this.ord) this.ord = [k, o?.ascending !== false]; return this }
    limit(n) { this.lim = n; return this }
    insert(row) { this.op = 'insert'; this.row = row; return this }
    update(p) { this.op = 'update'; this.patch = p; return this }
    upsert() { throw new Error('upsert inesperado em ' + this.t) }
    delete() { throw new Error('DELETE em ' + this.t) }
    maybeSingle() { this.one = true; return this }
    single() { this.one = true; return this }
    then(res, rej) { return this.exec().then(res, rej) }
    async exec() {
      await Promise.resolve()
      if (opts.eventsDown && this.t === 'events') return { data: null, count: null, error: { code: '57014', message: 'timeout' } }
      const tab = db[this.t]
      if (!tab) return { data: null, error: { code: '42P01', message: 'missing ' + this.t } }
      if (this.op === 'select') {
        let rows = tab.filter((r) => match(r, this.f)).map((r) => JSON.parse(JSON.stringify(r)))
        if (this.cnt) return { data: null, count: rows.length, error: null }
        if (this.ord) { const [k, asc] = this.ord; rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)) }
        if (this.lim !== null) rows = rows.slice(0, this.lim)
        return { data: this.one ? rows[0] ?? null : rows, error: null }
      }
      if (this.op === 'insert') {
        const row = { id: this.row.id ?? `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`, created_at: new Date(Date.now() + seq).toISOString(), updated_at: new Date().toISOString(), ...this.row }
        for (const keys of UNIQUE[this.t] ?? []) if (tab.some((r) => keys.every((k) => r[k] === row[k]))) return { data: null, error: { code: '23505', message: 'unique ' + keys.join(',') } }
        tab.push(row)
        return { data: this.ret ? { ...row } : null, error: null }
      }
      if (this.op === 'update') {
        const hit = tab.filter((r) => match(r, this.f))
        for (const r of hit) Object.assign(r, this.patch)
        return { data: this.one ? (hit[0] ? { ...hit[0] } : null) : hit.map((r) => ({ ...r })), error: null }
      }
      throw new Error('op inesperada')
    }
  }
  const shares = new Set()
  const admin = {
    from: (t) => new Q(t),
    storage: { from: (b) => ({
      upload: async (p) => { calls.storage.push(['upload', b, p]); return { data: { path: p }, error: null } },
      copy: async (a, z) => { calls.storage.push(['copy', b, a, z]); if (shares.has(z)) return { data: null, error: { message: 'The resource already exists' } }; shares.add(z); return { data: { path: z }, error: null } },
      remove: async (p) => { calls.storage.push(['remove', b, p]); return { data: null, error: null } },
    }) },
  }
  const trap = (name, list) => new Proxy({}, { get: (_t, k) => { if (k === '__esModule') return true; if (typeof k === 'symbol' || k === 'then') return undefined; return (...a) => { list.push(`${name}.${String(k)}`); throw new Error(`armadilha ${name}.${String(k)}`) } } })
  const json = (body, init) => ({ body: JSON.parse(JSON.stringify(body)), status: init?.status ?? 200, json: async () => JSON.parse(JSON.stringify(body)) })
  const core = (status, body) => ({ status, json: async () => body })
  class CreatomateSubmitError extends Error { constructor(m, amb, st) { super(m); this.ambiguous = amb; this.status = st } }
  const user = opts.user === null ? null : { id: HOUSE, email: opts.email ?? HOUSE_EMAIL }
  const mocks = {
    'next/server': { NextResponse: { json }, NextRequest: class {} },
    'next/og': trap('next/og', calls.fal),
    '@supabase/supabase-js': { createClient: () => admin },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { calls.events.push(JSON.parse(JSON.stringify(e))); db.events.push({ id: `ev-${++seq}`, name: e.name, user_id: e.userId ?? null, metadata: e.metadata ?? {}, created_at: new Date().toISOString() }); return true } },
    '@/lib/ads/serverAccess': { adsGate: (r) => (r === 'none' ? 'no_access' : 'ok'), isMissingAdsTable: (c) => c === '42P01', loadAdsAccess: async (_id, email) => (calls.access.push(email), { admin, reason: opts.reason ?? (email === HOUSE_EMAIL ? 'internal' : 'subscriber'), ownerId: HOUSE, role: 'owner', ownerPlan: 'pro' }) },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/userFootage': { footageAdminClient: () => admin, FOOTAGE_PUBLIC_PREFIX: () => `${SB}/user-footage/`, ensureFootageBucket: async () => {}, FOOTAGE_QUOTA_PAID: 500 * 1024 * 1024, totalFootageBytes: async () => 0, USER_FOOTAGE_BUCKET: 'user-footage' },
    '@/lib/ads/v2Server': { v2Fail: (error, status, extra = {}) => json({ error, ...extra }, { status }), v2Json: (body, status = 200) => json(body, { status }) },
    '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
    '@/lib/safety/quarantine': { quarantineObject: async () => null },
    '@/lib/ads/v2Link': { adsV2LinkImport: async (link) => { calls.link.push(link); return opts.linkDown ? null : { link: 'https://lume.test/p/1?utm_source=mail&email=ana@lume.test', host: 'lume.test', title: 'Eau de Parfum 50 ml', price: '€49', lang: 'de', text: 'Lume Eau de Parfum 50 ml — light floral.', sentence: 'Lume Eau de Parfum 50 ml, light floral', candidates: 3, skipped: 0, images: [{ src: 'a', ext: 'jpg', bytes: new Uint8Array(5000), declared: true }, { src: 'b', ext: 'webp', bytes: new Uint8Array(5000) }, { src: 'c', ext: 'png', bytes: new Uint8Array(5000) }] } } },
    '@/lib/ads/demoPhoto': { renderDemoPhoto916: async (b, ext) => { calls.photo.push(ext); return PNG } },
    '@/lib/shopify/card': { renderShopEndCard: async (i) => { calls.card.push(i); return PNG } },
    '@/lib/ads/v2SceneServer': { adsV2SceneForDraft: async (body) => ({ ok: true, fields: { kind: body.kind, ...(body.scene ? { scene: body.scene } : {}) } }) },
    '@/lib/ads/v2PlanCore': { adsV2PlanFor: async (u, acc, readBody) => { const b = await readBody(); calls.plan.push({ u, b, reason: acc.reason }); const o = db.ads_v2_orders.find((x) => x.id === b.order_id); if (o) Object.assign(o, { status: 'planned', plan: plano() }); return core(200, { order_id: b.order_id, status: 'planned', credits: 30 }) } },
    '@/lib/ads/v2StartCore': { adsV2StartFor: async (u, acc, readBody) => { const b = await readBody(); calls.start.push(b); if (b.dry_run) return core(200, { dry_run: true, charged: false, order_id: b.order_id, credits: 30, usd_estimate: { totalUsd: 2.1 } }); if (opts.startStatus) return core(opts.startStatus, { error: 'another_active' }); const o = db.ads_v2_orders.find((x) => x.id === b.order_id); if (o) o.status = 'generating'; return core(202, { order_id: b.order_id, status: 'generating' }) } },
    '@/lib/supplier/falBalancePanel': { readFalBalancePanel: async () => (opts.falDown ? null : { mode: 'rpc', fresh: !!opts.falRefused }), falRefusalIsFresh: (p) => !!(p && p.fresh), falLastRefusalAt: (p) => (p && p.fresh ? '2026-10-15T14:00:00Z' : null) },
    '@/lib/ads/v2Batch': { drainAdsV2Batches: async () => 0 },
    '@/lib/compose': {
      CreatomateSubmitError,
      submitCreatomateRender: async (source) => { calls.creatomate.push(source); return `rid-${calls.creatomate.length}` },
      pollCreatomateRender: async (id) => ({ status: 'succeeded', url: `https://cdn.creatomate.test/${id}.mp4`, snapshotUrl: null, durationSeconds: 17, error: null }),
      estimateMp3DurationSeconds: () => { calls.fal.push('compose.estimateMp3DurationSeconds'); throw new Error('voz') },
      uploadVoiceoverToSupabase: async () => { calls.fal.push('compose.uploadVoiceoverToSupabase'); throw new Error('voz') },
    },
    '@/lib/renderAssets': { persistRenderAssets: async (a) => ({ videoUrl: `${SB}/renders/${a.userId}/${a.renderId}.mp4`, thumbnailUrl: null, measuredSeconds: 17.04, measureMethod: 'mvhd' }) },
    '@/lib/ads/v2Shots': trap('v2Shots', calls.fal),
    '@/lib/ads/v2Images': trap('v2Images', calls.fal),
    '@/lib/ads/v2Engines': trap('v2Engines', calls.fal),
    '@/lib/ttsFallback': trap('ttsFallback', calls.fal),
    '@/lib/lyriaMusic': trap('lyriaMusic', calls.fal),
    '@/lib/pixabayMusic': trap('pixabayMusic', calls.fal),
    '@/lib/falQueue': trap('falQueue', calls.fal),
    '@/lib/ads/v2Billing': trap('v2Billing', calls.money),
    '@/lib/credits/debit': trap('debit', calls.money),
    '@/lib/credits/refund': trap('refund', calls.money),
  }
  return { db, calls, admin, mocks }
}
const carregar = (w, over = {}) => createOfflineLoader({ mocks: w.mocks, env: { SUPABASE_SERVICE_ROLE_KEY: SECRET, NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', CRON_SECRET: 'cron' }, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })
const req = (body, q = '', headers = {}) => ({ json: async () => body, nextUrl: new URL(`https://usekineo.test/api/admin/demo${q}`), headers: { get: (k) => headers[k.toLowerCase()] ?? null } })
const BODY = { link: 'https://lume.test/p/1?utm_source=mail&email=ana@lume.test', brand: 'Lume Parfums', voice: 'de', scene: 'on a marble shelf in morning light' }
const evs = (w, n) => w.calls.events.filter((e) => e.name === n)
const weekEv = (i) => ({ id: `old-${i}`, name: 'demo_sob_medida_created', user_id: HOUSE, created_at: new Date(Date.now() - (i + 1) * 60_000).toISOString(), metadata: { order_id: `99999999-9999-4999-8999-00000000000${i}`, brand: 'X', voice: 'en' } })

// ═══ as provas ═══════════════════════════════════════════════════════════════════════════════════════════════════════
async function provas(over = {}) {
  const out = []
  const p = async (nome, fn) => out.push([nome, await tenta(fn)])
  const fonte = (k) => (Object.hasOwn(over, F[k]) ? over[F[k]] : SRC[k])

  await p('D1 só ADMIN: sem sessão = 401; e-mail fora do ADMIN_EMAILS = 403 no GET e no POST; nada criado, nenhum evento, nenhum link lido', async () => {
    const w1 = mundo({ user: null })
    const r1 = await carregar(w1, over)(F.route).POST(req(BODY))
    const w2 = mundo({ email: 'cliente@marca.test' })
    const L2 = carregar(w2, over)
    const r2 = await L2(F.route).POST(req(BODY))
    const g2 = await L2(F.route).GET(req(null))
    return r1.status === 401 && r2.status === 403 && r2.body.error === 'forbidden' && g2.status === 403 && [w1, w2].every((w) => w.db.ads_v2_orders.length === 0 && w.calls.events.length === 0 && w.calls.link.length === 0)
  })
  await p('D2a a ROTA recusa admin que não é conta da casa (403 not_house_account) antes de ler o link', async () => {
    const w = mundo({ email: ADMIN_NOT_HOUSE })
    const r = await carregar(w, over)(F.route).POST(req(BODY))
    return r.status === 403 && r.body.error === 'not_house_account' && w.calls.access.length === 0 && w.db.ads_v2_orders.length === 0 && w.calls.link.length === 0 && w.calls.events.length === 0
  })
  await p("D2b o NÚCLEO recusa acesso que não é 'internal' (403), mesmo chamado direto: sem pedido, sem plano, sem evento", async () => {
    const w = mundo()
    const L = carregar(w, over)
    const P = L(F.pure)
    const body = P.sanitizeDemoBody(BODY).value
    const r = await L(F.server).createDemoSobMedida({ admin: w.admin, user: { id: HOUSE, email: HOUSE_EMAIL }, access: { admin: w.admin, reason: 'subscriber', ownerId: HOUSE, role: 'owner' }, body, now: NOW, started: Date.now() })
    return r.status === 403 && r.body.error === 'not_house_account' && w.db.ads_v2_orders.length === 0 && w.calls.plan.length === 0 && w.calls.events.length === 0
  })
  await p('D3 fluxo feliz: 202; Comercial 15 s na conta da CASA com brief.demo; marca no ad_brands; fotos produto + original; WebP fora; cartão em alemão; /plan → dry-run → /start nessa ordem; evento com o link SEM query; zero fal e zero dinheiro', async () => {
    const w = mundo()
    const r = await carregar(w, over)(F.route).POST(req(BODY))
    const o = w.db.ads_v2_orders[0]
    const ev = evs(w, 'demo_sob_medida_created')
    const plan = w.calls.plan[0]?.b
    const txt = JSON.stringify(ev)
    return r.status === 202 && w.db.ads_v2_orders.length === 1 && o.user_id === HOUSE && o.tier === 'commercial' && o.seconds === 15 && o.language === 'de' && o.brief.demo?.kind === 'sob_medida' && o.brief.demo.brand === 'Lume Parfums' && o.brief.kind === 'product' && o.brief.scene === BODY.scene &&
      w.db.ad_brands.length === 1 && w.db.ad_brands[0].name === 'Lume Parfums' && w.db.ad_brands[0].owner_id === HOUSE && o.brand_id === w.db.ad_brands[0].id &&
      plan && plan.photos.length === 2 && plan.photos.every((ph) => ph.kind === 'product' && ph.original_footage_id && ph.original_footage_id !== ph.footage_id) && JSON.stringify(w.calls.photo) === '["jpg","png"]' && plan.scripts === false &&
      w.calls.card[0]?.cta === 'Jetzt kaufen' && w.calls.card[0]?.business === 'Lume Parfums' &&
      JSON.stringify(w.calls.start) === JSON.stringify([{ order_id: o.id, dry_run: true }, { order_id: o.id }]) &&
      ev.length === 1 && ev[0].metadata.order_id === o.id && ev[0].metadata.link === 'https://lume.test/p/1' && !txt.includes('@') && !txt.includes('utm_') && ev[0].metadata.exception === false &&
      w.calls.fal.length === 0 && w.calls.money.length === 0
  })
  await p('D4 teto: 3 nesta semana → a 4ª = 429 sem pedido; exceção sem motivo = 400; com motivo = 202 e o motivo GRAVADO; demo da semana passada não conta; contagem que não lê = 503', async () => {
    const w = mundo({ events: [weekEv(0), weekEv(1), weekEv(2)] })
    const L = carregar(w, over)
    const quarta = await L(F.route).POST(req(BODY))
    const semMotivo = await L(F.route).POST(req({ ...BODY, exception: true, exception_reason: 'pq' }))
    const antes = w.db.ads_v2_orders.length
    const comMotivo = await L(F.route).POST(req({ ...BODY, exception: true, exception_reason: 'Marca pediu a versão alemã antes da reunião' }))
    const ev = evs(w, 'demo_sob_medida_created')
    const velha = mundo({ events: [weekEv(0), weekEv(1), { ...weekEv(2), created_at: '2026-01-05T12:00:00Z' }] })
    const passou = await carregar(velha, over)(F.route).POST(req(BODY))
    const caida = mundo({ eventsDown: true })
    const fechada = await carregar(caida, over)(F.route).POST(req(BODY))
    return quarta.status === 429 && quarta.body.error === 'weekly_cap' && semMotivo.status === 400 && semMotivo.body.error === 'exception_reason_required' && antes === 0 &&
      comMotivo.status === 202 && ev.length === 1 && ev[0].metadata.exception === true && ev[0].metadata.exception_reason === 'Marca pediu a versão alemã antes da reunião' &&
      passou.status === 202 && fechada.status === 503 && fechada.body.error === 'counter_unavailable' && caida.db.ads_v2_orders.length === 0
  })
  await p('D4b semana ISO de Brasília: domingo 23:59 BRT ainda é a semana anterior; segunda 00:00 BRT abre a nova; rótulo ISO certo', async () => {
    const P = carregar(mundo(), over)(F.pure)
    const dom = new Date('2026-10-19T02:59:00Z') // domingo 18/10 23:59 BRT
    const seg = new Date('2026-10-19T03:00:00Z') // segunda 19/10 00:00 BRT
    return P.demoWeekStart(dom).toISOString() === '2026-10-12T03:00:00.000Z' && P.demoWeekStart(seg).toISOString() === '2026-10-19T03:00:00.000Z' && P.demoWeekStart(NOW).toISOString() === '2026-10-12T03:00:00.000Z' &&
      P.demoWeekLabel(NOW) === '2026-W42' && P.demoWeekLabel(dom) === '2026-W42' && P.demoWeekLabel(seg) === '2026-W43' && P.demoWeekLabel(new Date('2027-01-01T12:00:00Z')) === '2026-W53'
  })
  await p('D5 a fal recusou por saldo nas últimas 6 h = 409 ANTES de ler o link ou criar pedido', async () => {
    const w = mundo({ falRefused: true })
    const r = await carregar(w, over)(F.route).POST(req(BODY))
    return r.status === 409 && r.body.error === 'fal_balance_refused' && w.calls.link.length === 0 && w.db.ads_v2_orders.length === 0
  })
  await p('D6 depois da ENTREGA, pelo CRON: 4:5 e 1:1 com as MESMAS URLs de clipe, entregues; aprovação com o nome da marca (token = o da tela); evento de entregue; 2ª volta não remonta nem duplica; tela "pronta" com link + EN/ES/DE; página privada com 3 formatos em renders/share, sample:true e nada da casa', async () => {
    const w = mundo({ delivered: true })
    const L = carregar(w, over)
    const auth = { authorization: 'Bearer cron' }
    const c1 = await L(F.cron).GET(req(null, '', auth))
    const c2 = await L(F.cron).GET(req(null, '', auth))
    const fmts = [...w.calls.creatomate] // a foto DEPOIS das 2 voltas do cron (a tela, abaixo, também avança)
    const depoisDoCron = { versions: w.db.ads_v2_versions.map((x) => x.status).join(), approvals: w.db.ads_v2_approvals.length, delivered: evs(w, 'demo_sob_medida_delivered').length }
    const clipes = (s) => [...new Set(s.elements.filter((e) => e.type === 'video').map((e) => e.source))].sort()
    const tok = L(F.server).demoApprovalToken(SECRET, ORDER)
    const ap = w.db.ads_v2_approvals
    const g = await L(F.route).GET(req(null))
    const row = g.body.rows?.[0]
    const token = decodeURIComponent(String(row?.approval?.url ?? '').split('#')[1] ?? '')
    const v = await L(F.view).POST(req({ token }))
    const P = L(F.posPure)
    const txt = JSON.stringify(v.body)
    return c1.status === 200 && c2.status === 200 && fmts.length === 2 && fmts.map((s) => `${s.width}x${s.height}`).sort().join() === '1080x1080,1080x1350' &&
      fmts.every((s) => JSON.stringify(clipes(s)) === JSON.stringify([clipUrl(0), clipUrl(1), clipUrl(2)])) &&
      depoisDoCron.versions === 'delivered,delivered' && depoisDoCron.approvals === 1 && depoisDoCron.delivered === 1 && w.calls.creatomate.length === 2 &&
      w.db.ads_v2_versions.length === 2 && w.db.ads_v2_versions.every((x) => x.status === 'delivered' && x.kind === 'format') &&
      ap.length === 1 && ap[0].brand_name === 'Lume Parfums' && ap[0].token_hash === tok.hash && ap[0].lang === 'de' && ap[0].order_id === ORDER &&
      evs(w, 'demo_sob_medida_delivered').length === 1 && w.calls.fal.length === 0 && w.calls.money.length === 0 &&
      g.status === 200 && row.status === 'pronta' && token === tok.token && row.messages.en.includes(row.approval.url) && row.messages.es.includes(row.approval.url) && row.messages.de.includes(row.approval.url) &&
      v.status === 200 && JSON.stringify(Object.keys(v.body).sort()) === JSON.stringify([...P.ADS_V2_APPROVAL_PUBLIC_KEYS].sort()) && v.body.sample === true && v.body.brand === 'Lume Parfums' &&
      v.body.formats.map((f) => f.format).join() === '9:16,4:5,1:1' && v.body.formats.every((f) => /\/renders\/share\/[A-Za-z0-9_-]{24}\.mp4$/.test(f.video_url)) && ![HOUSE, ORDER, V1, 'josephsskaf', 'credit', 'adsv2'].some((x) => txt.includes(x))
  })
  await p('D7 noindex: a página de aprovação e a /admin/demo fora do índice; a página de aprovação SEMPRE rotula IA, o apresentador de IA e a amostra', () => {
    const ap = fonte('approvePage')
    const cl = fonte('approveClient')
    return /index: false/.test(ap) && /referrer: 'no-referrer'/.test(ap) && /robots: \{ index: false, follow: false \}/.test(fonte('page')) &&
      /<p className="ap-ai"[^>]*>\{view\.ai_presenter \? <><strong>\{dc\.aiPresenter\}<\/strong> <\/> : null\}\{adsV2AiLabelNotice\(lang\)\}<\/p>/.test(cl) && /view\.sample \? fillDemo\(dc\.sample/.test(cl) &&
      carregar(mundo(), over)(F.pure).demoPageCopy('de').sample === 'Beispiel von Kineo für {brand}' && carregar(mundo(), over)(F.pure).demoPageCopy('xx').sample === 'Sample made by Kineo for {brand}'
  })
  await p('D8 fora de vitrine/sitemap/llms: a demo nunca carimba published_at; vídeo é ads_v2 (fora do ENGINE_ORDER da vitrine); sitemap só lista publicado com a superfície DESLIGADA; llms/sitemap/robots não citam /approve', () => {
    const meus = ['pure', 'server', 'photo', 'route', 'page', 'client', 'extras'].map(fonte).join('\n')
    const wall = rd('lib/engineWall.ts')
    const order = wall.match(/const ENGINE_ORDER = \[([^\]]*)\]/)?.[1] ?? ''
    const pub = rd('lib/publicVideos.ts')
    return !/published_at|is_public|sitemap|llms/i.test(meus.replace(/fora de vitrine, sitemap e llms|Nunca listar/g, '')) && /quality_mode: 'ads_v2'/.test(fonte('posServer')) && order.length > 0 && !order.includes('ads_v2') &&
      /CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = false as const/.test(rd('lib/publicSurfacePolicy.ts')) && /if \(!global\) query = query\.not\('published_at', 'is', null\)/.test(pub) &&
      !/['"`]\/approve/.test(rd('app/sitemap.ts')) && !/\/approve/.test(rd('app/llms.txt/route.ts'))
  })
  await p('D9 regras puras: marca sem e-mail/telefone/link; link só http(s); voz da lista; exceção com 8+ letras; frase sempre com o nome da marca; link sem query', () => {
    const P = carregar(mundo(), over)(F.pure)
    return P.sanitizeDemoBody({ ...BODY, brand: 'ana@lume.test' }).ok === false && P.sanitizeDemoBody({ ...BODY, brand: '+49 30 1234567' }).ok === false && P.sanitizeDemoBody({ ...BODY, link: 'ftp://x' }).ok === false &&
      P.sanitizeDemoBody({ ...BODY, voice: 'ja' }).ok === false && P.sanitizeDemoBody({ ...BODY, exception: true, exception_reason: 'curto' }).ok === false && P.sanitizeDemoBody({ ...BODY, exception: 'sim' }).ok === false &&
      P.sanitizeDemoBody({ link: 'https://a.test/p', brand: 'A' }).value.voice === 'en' && P.demoSentence('Lume', 'Eau de parfum 50 ml', null) === 'Lume — Eau de parfum 50 ml' && P.demoSentence('Lume', 'Lume eau de parfum', null) === 'Lume eau de parfum' &&
      P.demoSafeLink('https://a.test/p/1?email=x@y.z#k') === 'https://a.test/p/1' && P.DEMO_WEEKLY_CAP === 3 && P.demoStatus({ orderStatus: 'delivered', formats: [{ status: 'rendering' }], approval: true }) === 'fazendo' && P.demoStatus({ orderStatus: 'failed', formats: [], approval: false }) === 'falhou'
  })
  await p('D10 o desfaz devolve o PAI byte a byte em cada arquivo que já existia (vista da aprovação, tela da aprovação, vista pública, cron, menu do admin); estrito: trecho alterado = lança; lib/ads/v2PostDeliveryServer.ts INTOCADO', () => {
    const porArquivo = { [F.view]: 'view', [F.posPure]: 'posPure', [F.approveClient]: 'approveClient', [F.cron]: 'cron' }
    const lanca = (fn) => { try { fn(); return false } catch { return true } }
    return PAI !== null && ARQUIVOS_DEMO_SOB_MEDIDA_1510.length === 5 && ARQUIVOS_DEMO_SOB_MEDIDA_1510.every((f) => { const vivo = porArquivo[f] ? fonte(porArquivo[f]) : semAdminJornada1510(f, semPacote3Filmes1610(f, rd(f))); const pai = rdPai(f); return pai !== null && vivo.includes(MARCA_DEMO_SOB_MEDIDA_1510) && lf(semDemoSobMedida1510(f, vivo)) === pai && !pai.includes(MARCA_DEMO_SOB_MEDIDA_1510) }) &&
      lanca(() => semDemoSobMedida1510(F.view, fonte('view').replace('await openApproval(admin, body?.token, secret))', 'await openApproval(admin, body?.token, secret ))'))) &&
      (fonte('posServer') === rdPai(F.posServer)) // o núcleo da aprovação (dinheiro/pós-entrega) ficou byte a byte o do pai
  })
  return out
}

console.log('\n── provas sobre o código de agora')
const AGORA = await provas()
for (const [n, v] of AGORA) ok(v, n)

console.log('\n── mutantes (cada um provado aplicado; cada um deixa ao menos uma prova vermelha)')
const trocar = (k, de, para) => { const src = SRC[k]; if (src.split(de).length !== 2) throw new Error('âncora não única: ' + de.slice(0, 70)); const o = src.split(de).join(para); if (o === src) throw new Error('não aplicou'); return { [F[k]]: o } }
const MUTANTES = [
  ['rota sem o portão do admin', () => trocar('route', "  if (!isAdminEmail(user.email)) return { ok: false, res: json({ error: 'forbidden' }, 403) }\n", '')],
  ['rota aceita admin que não é da casa', () => trocar('route', "    if (!isAdsInternalEmail(user.email)) return json({ error: 'not_house_account' }, 403)\n", '')],
  ["núcleo aceita acesso que não é 'internal'", () => trocar('server', "    if (access.reason !== 'internal' || adsGate(access.reason) !== 'ok') return out(403, { error: 'not_house_account' })", "    if (adsGate(access.reason) !== 'ok') return out(403, { error: 'not_house_account' })")],
  ['teto da semana ignorado', () => trocar('pure', '  if (count < DEMO_WEEKLY_CAP) return { ok: true, exception: false }', '  if (count < DEMO_WEEKLY_CAP + 99) return { ok: true, exception: false }')],
  ['exceção sem motivo passa', () => trocar('pure', '  if (exceptionReason && exceptionReason.length >= DEMO_REASON_MIN) return { ok: true, exception: true }', '  return { ok: true, exception: true }')],
  ['contagem que falha vira zero (porta aberta)', () => trocar('pure', "  if (count === null || !Number.isFinite(count) || count < 0) return { ok: false, error: 'counter_unavailable' }", '  if (count === null) count = 0')],
  ['fal recusada não barra', () => trocar('server', "    if (falRefusalIsFresh(panel, now.getTime())) return out(409, { error: 'fal_balance_refused' })\n", '')],
  ['dry-run pulado', () => trocar('server', '    const dry = await readCore(await adsV2StartFor(caller, access, async () => ({ order_id: orderId, dry_run: true }), Date.now()))', '    const dry: DemoResult = { status: 200, body: { dry_run: true, charged: false } }')],
  ['o link do evento leva a query (e-mail de terceiros)', () => trocar('server', 'order_id: orderId, brand: body.brand, link: demoSafeLink(read.link),', 'order_id: orderId, brand: body.brand, link: read.link,')],
  ['depois da entrega não sai formato', () => trocar('server', '    res.formats_sent = await demoFormats(admin, order, v.rows)', '    res.formats_sent = 0')],
  ['depois da entrega não sai aprovação', () => trocar('server', '    res.approval = await demoApproval(admin, order, meta, secret)', '    res.approval = false')],
  ['o cron não chama a demo', () => trocar('cron', "  const demos = await advanceDemosSobMedida(admin, { deadlineMs: started + TOTAL_BUDGET_MS + 40_000, secret: process.env.SUPABASE_SERVICE_ROLE_KEY })", '  const demos = null')],
  ['formato da página com o caminho da conta (sem cópia)', () => trocar('extras', '      out.push({ format: f, video_url: r.video_url.slice(0, r.video_url.indexOf(mark) + mark.length) + dest })', '      out.push({ format: f, video_url: r.video_url })')],
  ['página de aprovação indexável', () => trocar('approvePage', 'robots: { index: false, follow: false, nocache: true },', 'robots: { index: true, follow: false, nocache: true },')],
  ['a demo carimba published_at (vitrine/sitemap)', () => trocar('server', "        status: 'draft',\n", "        status: 'draft', published_at: new Date().toISOString(),\n")],
  ['a página não rotula IA', () => trocar('approveClient', '{adsV2AiLabelNotice(lang)}</p>', '</p>')],
]
for (const [nome, mk] of MUTANTES) {
  let over
  try { over = mk() } catch (e) { ok(false, `mutante "${nome}" aplicado — ${e.message}`); continue }
  const r = await provas(over)
  const vermelhas = r.filter(([, v]) => !v).map(([n]) => n.split(' ')[0])
  ok(vermelhas.length > 0, `mutante "${nome}" → vermelho (${vermelhas.join(' ') || 'nenhuma'})`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
