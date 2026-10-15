// KINEO-ADS-POS-ENTREGA-1510 — guardião das ferramentas DEPOIS da entrega do Studio Ads v2 (fundador 15/10: "perfeito para agência
// usar sozinha, hoje"). Prova EXECUTANDO o código real pelo carregador offline (sem rede, sem banco, sem fornecedor, sem render pago):
//   E1  a EDIÇÃO monta de novo com as MESMAS URLs de clipe (o bucket, nunca a fal) e NUNCA chama a fal (motor, imagem, voz): rota
//       POST /api/ads/v2/edit executada com o motor de avanço real e todo módulo da fal trocado por armadilha que registra a chamada;
//       frases, música e ordem novas entram; a narração fica a mesma (voz travada); tirar cena que deixa a voz sem caber = recusa;
//   E2  as VERSÕES ficam: cada aplicação é uma linha nova (v2, v3…), cada pronta vira uma linha NOVA em `videos`; o vídeo original,
//       o pedido e o débito dele ficam intocados; nenhuma rota apaga;
//   E3  o TOKEN da aprovação é inadivinhável e preso a UMA aprovação: 192 bits aleatórios + HMAC; assinatura/segredo errados,
//       troca de assinatura entre tokens, vencido e desligado = recusa; decidir com o token A nunca mexe na aprovação B; 1 decisão;
//   E4  a página de APROVAÇÃO não vaza dado: a vista pública tem a lista FECHADA de chaves (marca, vídeo, estado, língua); o vídeo é
//       uma CÓPIA em renders/share/<aleatório> (o caminho de sempre tem o id da conta); token no fragmento (#), sem referrer, fora
//       do índice; o nome da marca recusa e-mail/telefone/link;
//   E5  os 3 FORMATOS saem dos MESMOS clipes: 4:5 (1080×1350) e 1:1 (1080×1080) com as mesmas URLs do 9:16; o plano de efeito ganha
//       fundo suave (cover ampliado + véu + contain) só fora do 9:16; o cartão final no quadro; o ator inteiro com a voz; idempotente;
//   E6  DINHEIRO intocado: nenhum arquivo de preço/débito/estorno/avanço mudou; nada novo debita (ADS_V2_EDIT_CREDITS = 0); a
//       montagem é byte a byte a do pai (desfeitas as linhas marcadas) e o source de sempre sai IDÊNTICO sem `fill`;
//   F   o painel é cliente e só importa módulos de navegador/puros; 16 línguas completas; a migração mora em migrations_pending;
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semPosEntrega1510, ARQUIVOS_POS_ENTREGA_1510, ACRESCIMOS_POS_ENTREGA_1510, MARCA_POS_ENTREGA_1510 } from './test-support/desfaz-ads-pos-entrega-1510.mjs'
import { semLinkTela1510 } from './test-support/desfaz-ads-link-tela-1510.mjs' // reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas
import { semMarcas1510 } from './test-support/desfaz-ads-marcas-1510.mjs' // reancorado KINEO-LEVA-ADS-AGENCIA-1510 — as marcas (clientes) entraram na mesma leva DEPOIS desta pista: saem em memória antes do byte a byte
import { semFiel2_1510 } from './test-support/desfaz-ads-fiel-2-1510.mjs' // reancorado KINEO-ADS-FIEL-2-1510 — o conserto mais novo do Ads sai PRIMEIRO, em memória
import { semFiel3_1510 } from './test-support/desfaz-ads-fiel-3-1510.mjs' // reancorado KINEO-ADS-FIEL-3-1510 — o conserto mais novo do Ads sai PRIMEIRO, em memória

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória
const git = (args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = async (fn) => { try { return !!(await fn()) } catch (e) { if (process.env.DEBUG_POS) console.log('       (lançou: ' + (e && e.stack) + ')'); return false } }

// ── base = pai do PRIMEIRO commit com a marca (antes do commit existir: HEAD) ───────────────────────────────────────────
let BASE = 'HEAD'
let PROPRIO = null // reancorado KINEO-LEVA-ADS-AGENCIA-1510 — o 1º commit marcado: o diff deste ajuste é BASE→PROPRIO (+ o não commitado), nunca a árvore inteira contra a base (a leva trouxe outros ajustes)
try {
  const shas = git(['log', '--no-merges', '--format=%H', `--grep=${MARCA_POS_ENTREGA_1510}`, 'HEAD']).trim().split('\n').filter(Boolean)
  BASE = git(['rev-parse', shas.length ? `${shas[shas.length - 1]}~1` : 'HEAD']).trim()
  PROPRIO = shas.length ? shas[shas.length - 1] : null // reancorado KINEO-LEVA-ADS-AGENCIA-1510
} catch { BASE = 'HEAD' }
const rdBase = (rel) => { try { return lf(git(['show', `${BASE}:${rel}`])) } catch { return null } }
console.log(`   base de comparação: ${BASE}`)

const F = {
  montage: 'lib/ads/adV2Montage.ts',
  pure: 'lib/ads/v2PostDelivery.ts',
  server: 'lib/ads/v2PostDeliveryServer.ts',
  token: 'lib/ads/v2ApprovalToken.ts',
  copy: 'lib/ads/v2PostDeliveryCopy.ts',
  auth: 'lib/ads/v2PostDeliveryAuth.ts',
  edit: 'app/api/ads/v2/edit/route.ts',
  versions: 'app/api/ads/v2/versions/route.ts',
  formats: 'app/api/ads/v2/formats/route.ts',
  approval: 'app/api/ads/v2/approval/route.ts',
  decide: 'app/api/ads/v2/approval/decide/route.ts',
  view: 'app/api/ads/v2/approval/view/route.ts',
  page: 'app/approve/page.tsx',
  client: 'app/approve/ApproveClient.tsx',
  panel: 'app/(dashboard)/ads/v2/AdsV2AfterDelivery.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  full: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  mig: 'migrations_pending/20261015120000_ads_v2_pos_entrega.sql',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, rd(v)]))

// ── o mundo falso: banco em memória, Creatomate falso, fal = armadilha ────────────────────────────────────────────────────
const UID = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const ORDER = '33333333-3333-4333-8333-333333333333'
const ORDER2 = '44444444-4444-4444-8444-444444444444'
const V1 = '55555555-5555-4555-8555-555555555555'
const CARD2 = '66666666-6666-4666-8666-666666666666'
const FOREIGN = '77777777-7777-4777-8777-777777777777'
const SB = 'https://x.supabase.co/storage/v1/object/public'
const clipUrl = (i, o = ORDER) => `${SB}/renders/${UID}/adsv2-${o}-shot-${i}.mp4`
const MUSIC = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/music/emotional-02.mp3'
const VOICE = `${SB}/voiceovers/${UID}/v.mp3`
const CARD = `${SB}/user-footage/${UID}/card.png`
const PRESENTER = `${SB}/renders/${UID}/adsv2-${ORDER}-presenter.mp4`
const SECRET = 'segredo-de-teste-do-guardiao'

function plano(opts = {}) {
  return {
    shots: [
      { idx: 0, kind: 'product', effect: 'package_explosion' },
      { idx: 1, kind: 'people' },
      { idx: 2, kind: 'place' },
      { idx: 3, kind: 'text' },
      { idx: 4, kind: 'text', packshot: true },
    ],
    overlays: [{ role: 'hook', start: 0.3, end: 4.5, text: 'LUME eau de parfum' }, { role: 'b', start: 5, end: 9.5, text: 'Light floral' }, { role: 'c', start: 10, end: 14.5, text: 'All day' }],
    narration: 'Meet Lume. Light floral, all day. Find yours today.',
    ...(opts.format ? { format: opts.format } : {}),
  }
}
function linhas(orderId = ORDER, opts = {}) {
  const k = ['product', 'people', 'place', 'text', 'text']
  const rows = k.map((kind, idx) => ({
    id: `${orderId}-s${idx}`, order_id: orderId, idx, attempt: 1, role: 'r', kind, source: 'client_photo', source_footage_id: null, image_url: null, image_request_id: null,
    engine: kind === 'text' ? null : 'kling_o3', prompt: null, gen_seconds: 5, cut_start: kind === 'text' ? 0 : 0.2, cut_seconds: 3, request_id: kind === 'text' ? null : `req-${idx}`,
    status: kind === 'text' ? 'skipped_text' : 'done', fal_url: kind === 'text' ? null : `https://v3.fal.media/files/clip-${idx}.mp4`,
    stored_url: kind === 'text' ? `${SB}/user-footage/${UID}/photo-${idx}.jpg` : clipUrl(idx, orderId), measured_seconds: kind === 'text' ? null : 5,
    usd: 0.5, reason: null, reason_class: null, movement_variant: 0, created_at: '2026-10-15T10:00:00Z', updated_at: '2026-10-15T10:00:00Z',
  }))
  if (opts.presenter) rows.push({ ...rows[0], id: `${orderId}-actor`, idx: 31, kind: 'presenter', stored_url: PRESENTER, measured_seconds: 15.5, fal_url: 'https://v3.fal.media/files/actor.mp4' })
  return rows
}

function mundo(opts = {}) {
  const db = {
    ads_v2_orders: [
      { id: ORDER, user_id: UID, status: 'delivered', tier: 'commercial', seconds: 15, sector: 'store', brief: { business: 'Lume — perfume shop', price: '$49', contact: 'lume.test' }, language: 'en', narration: true, logo_footage_id: null, card_url: CARD, card_footage_id: null, photos: [{ footage_id: 'p', kind: 'product', url: `${SB}/user-footage/${UID}/photo-4.jpg` }], plan: plano(opts), music_url: MUSIC, voice_url: VOICE, voice_seconds: opts.voiceSeconds ?? 11.2, billing_ref: `adsv2-${ORDER}-g1`, credits_charged: 30, generation_id: 'g1', creatomate_render_id: 'r-orig', video_id: V1, error: null, created_at: '2026-10-15T09:00:00Z', updated_at: '2026-10-15T09:10:00Z', started_at: '2026-10-15T09:00:00Z', delivered_at: '2026-10-15T09:10:00Z', failed_at: null, assembly_lease_at: null, assembly_submit_at: null, parent_order_id: null, retake_idx: null },
      { id: ORDER2, user_id: OTHER, status: 'delivered', tier: 'commercial', seconds: 15, sector: 'store', brief: { business: 'Outra' }, language: 'pt', narration: false, logo_footage_id: null, card_url: CARD, card_footage_id: null, photos: [], plan: plano(), music_url: null, voice_url: null, voice_seconds: null, billing_ref: `adsv2-${ORDER2}-g1`, credits_charged: 30, generation_id: 'g1', creatomate_render_id: 'r2', video_id: '88888888-8888-4888-8888-888888888888', error: null, created_at: '2026-10-15T09:00:00Z', updated_at: '2026-10-15T09:10:00Z', started_at: null, delivered_at: null, failed_at: null, assembly_lease_at: null, assembly_submit_at: null, parent_order_id: null, retake_idx: null },
    ],
    ads_v2_shots: [...linhas(ORDER, opts), ...linhas(ORDER2)],
    videos: [
      { id: V1, user_id: UID, status: 'completed', video_url: `${SB}/renders/${UID}/adsv2-${ORDER}-g1.mp4`, render_id: `adsv2-${ORDER}-g1`, credits_used: 30, quality_mode: 'ads_v2' },
      { id: '88888888-8888-4888-8888-888888888888', user_id: OTHER, status: 'completed', video_url: `${SB}/renders/${OTHER}/adsv2-${ORDER2}-g1.mp4`, render_id: `adsv2-${ORDER2}-g1`, credits_used: 30, quality_mode: 'ads_v2' },
    ],
    ads_v2_versions: [],
    ads_v2_approvals: [],
    user_footage: [{ id: CARD2, user_id: UID, url: `${SB}/user-footage/${UID}/card2.png` }, { id: FOREIGN, user_id: OTHER, url: `${SB}/user-footage/${OTHER}/card.png` }],
  }
  const calls = { fal: [], money: [], creatomate: [], polls: [], events: [], storage: [], moderation: [], persisted: [] }
  const UNIQUE = { ads_v2_versions: [['order_id', 'version']], videos: [['render_id'], ['id']], ads_v2_approvals: [['token_hash']] }
  let seq = 0
  const match = (row, f) => f.every(([k, v, op]) => (op === 'in' ? v.includes(row[k]) : op === 'is' ? (row[k] ?? null) === v : row[k] === v))
  class Q {
    constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.ord = null; this.lim = null; this.cnt = false; this.ret = false }
    select(_c, o) { if (this.op === 'select') { if (o && o.count) this.cnt = true } else this.ret = true; return this }
    eq(k, v) { this.f.push([k, v]); return this }
    is(k, v) { this.f.push([k, v, 'is']); return this }
    in(k, v) { this.f.push([k, v, 'in']); return this }
    neq() { return this }
    gte() { return this }
    order(k, o) { this.ord = [k, o?.ascending !== false]; return this }
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
  const admin = {
    from: (t) => new Q(t),
    storage: { from: (b) => ({ copy: async (a, z) => { calls.storage.push(['copy', b, a, z]); return { data: { path: z }, error: null } }, remove: async (p) => { calls.storage.push(['remove', b, p]); return { data: null, error: null } } }) },
  }
  const trap = (name, list) => new Proxy({}, { get: (_t, k) => { if (k === '__esModule') return true; if (typeof k === 'symbol' || k === 'then') return undefined; return (...a) => { list.push(`${name}.${String(k)}`); throw new Error(`armadilha ${name}.${String(k)}`) } } })
  const json = (body, init) => ({ body: JSON.parse(JSON.stringify(body)), status: init?.status ?? 200 })
  class CreatomateSubmitError extends Error { constructor(m, amb, st) { super(m); this.ambiguous = amb; this.status = st } }
  const mocks = {
    'next/server': { NextResponse: { json }, NextRequest: class {} },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: UID, email: 'agencia@exemplo.test' } } }) } }) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { calls.events.push(e); return true } },
    '@/lib/ads/serverAccess': { adsGate: (r) => (r === 'none' ? 'no_access' : 'ok'), isMissingAdsTable: (c) => c === '42P01', loadAdsAccess: async () => ({ admin, reason: opts.reason ?? 'subscriber', ownerId: UID, role: 'owner', ownerPlan: 'studio' }) },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/userFootage': { footageAdminClient: () => admin, FOOTAGE_PUBLIC_PREFIX: () => `${SB}/user-footage` },
    '@/lib/ads/v2Server': {
      v2Fail: (error, status, extra = {}) => json({ error, ...extra }, { status }),
      v2Json: (body, status = 200) => json(body, { status }),
      ownedFootage: async (_a, uid, ids) => new Map(db.user_footage.filter((r) => r.user_id === uid && ids.includes(r.id)).map((r) => [r.id, { url: r.url, isImage: true, isPng: /\.png$/.test(r.url), isVideo: false }])),
    },
    '@/lib/safety/topicModeration': { moderateTopic: async (a) => { calls.moderation.push(a.text); return /proibido/i.test(a.text) ? { ok: false, status: 400, message: 'no', category: 'x' } : { ok: true } } },
    '@/lib/compose': {
      CreatomateSubmitError,
      submitCreatomateRender: async (source) => { calls.creatomate.push(source); return `rid-${calls.creatomate.length}` },
      pollCreatomateRender: async (id) => { calls.polls.push(id); return { status: 'succeeded', url: `https://cdn.creatomate.test/${id}.mp4`, snapshotUrl: null, durationSeconds: 17, error: null } },
      estimateMp3DurationSeconds: () => { calls.fal.push('compose.estimateMp3DurationSeconds'); throw new Error('voz') },
      uploadVoiceoverToSupabase: async () => { calls.fal.push('compose.uploadVoiceoverToSupabase'); throw new Error('voz') },
    },
    '@/lib/renderAssets': { persistRenderAssets: async (a) => { calls.persisted.push(a); return { videoUrl: `${SB}/renders/${a.userId}/${a.renderId}.mp4`, thumbnailUrl: null, measuredSeconds: 17.04, measureMethod: 'mvhd' } } },
    // TODO o que chega à fal (motor de vídeo, imagem de cena, voz, música gerada) é ARMADILHA: chamou = registrado e lança.
    '@/lib/ads/v2Shots': trap('v2Shots', calls.fal),
    '@/lib/ads/v2Images': trap('v2Images', calls.fal),
    '@/lib/ads/v2Engines': trap('v2Engines', calls.fal),
    '@/lib/ttsFallback': trap('ttsFallback', calls.fal),
    '@/lib/lyriaMusic': trap('lyriaMusic', calls.fal),
    '@/lib/pixabayMusic': trap('pixabayMusic', calls.fal),
    '@/lib/falQueue': trap('falQueue', calls.fal),
    // dinheiro também é armadilha: nada depois da entrega cobra, estorna ou confere débito.
    '@/lib/ads/v2Billing': trap('v2Billing', calls.money),
    '@/lib/credits/debit': trap('debit', calls.money),
    '@/lib/credits/refund': trap('refund', calls.money),
  }
  return { db, calls, admin, mocks }
}
const carregar = (w, over = {}) => createOfflineLoader({ mocks: w.mocks, env: { SUPABASE_SERVICE_ROLE_KEY: SECRET, NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' }, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })
const req = (body, q = '') => ({ json: async () => body, nextUrl: new URL(`https://usekineo.test/api/ads/v2/x${q}`) })
const ord = (w) => w.db.ads_v2_orders.find((o) => o.id === ORDER)
const clipes = (s) => [...new Set(s.elements.filter((e) => e.type === 'video' || (e.type === 'image' && e.source !== CARD && !/card2?\.png/.test(e.source))).map((e) => e.source))]
const BASE_CLIPS = [0, 1, 2].map((i) => clipUrl(i)).concat([`${SB}/user-footage/${UID}/photo-3.jpg`, `${SB}/user-footage/${UID}/photo-4.jpg`])

// ═══ as provas (sobre um conjunto de fontes: o de agora ou um mutante) ═══════════════════════════════════════════════════
async function provas(over = {}) {
  const out = []
  const p = async (nome, fn) => out.push([nome, await tenta(fn)])
  const fonte = (k) => (Object.hasOwn(over, F[k]) ? over[F[k]] : SRC[k])

  // E1 — editar = os mesmos clipes, nada de fal
  await p('E1 edição EXECUTADA (rota real + avanço real): 200, UMA montagem no Creatomate, as MESMAS URLs de clipe do bucket (nenhuma da fal), frases/música/ordem novas, voz igual; zero chamada à fal, zero dinheiro', async () => {
    const w = mundo()
    const L = carregar(w, over)
    const r = await L(F.edit).POST(req({ order_id: ORDER, overlays: ['New hook', 'Second line', 'Third line'], music: 'epic-01.mp3', order: [2, 0, 1, 3, 4], narration_text: 'tente mudar a voz' }))
    const s = w.calls.creatomate[0]
    if (r.status !== 200 || w.calls.creatomate.length !== 1 || !s) return false
    const urls = clipes(s)
    const textos = s.elements.filter((e) => e.type === 'text').map((e) => e.text)
    const audio = s.elements.filter((e) => e.type === 'audio')
    const vids = s.elements.filter((e) => e.type === 'video')
    return JSON.stringify([...urls].sort()) === JSON.stringify([...BASE_CLIPS].sort()) && !JSON.stringify(s).includes('fal.media') &&
      vids[0].source === clipUrl(2) && vids[0].trim_start === 0.2 && // a nova 1ª cena, com o MESMO trecho
      JSON.stringify(textos) === JSON.stringify(['New hook', 'Second line', 'Third line']) &&
      audio.some((a) => a.source === VOICE) && audio.filter((a) => a.source !== VOICE).every((a) => a.source.endsWith('/music/epic-01.mp3')) &&
      w.calls.fal.length === 0 && w.calls.money.length === 0 && r.body.credits === 0 && w.db.ads_v2_versions.length === 1 && w.db.ads_v2_versions[0].credits_charged === 0
  })
  await p('E1b cartão novo só PNG da pasta do DONO; tirar cena que deixa a voz sem caber = 400 voice_too_long; nada mudou = 400; frase proibida = moderação', async () => {
    const w = mundo({ voiceSeconds: 14.8 })
    const L = carregar(w, over)
    const alheio = await L(F.edit).POST(req({ order_id: ORDER, card_footage_id: FOREIGN }))
    const meu = await L(F.edit).POST(req({ order_id: ORDER, card_footage_id: CARD2 }))
    const curto = await L(F.edit).POST(req({ order_id: ORDER, order: [0, 1] }))
    const nada = await L(F.edit).POST(req({ order_id: ORDER }))
    const proib = await L(F.edit).POST(req({ order_id: ORDER, overlays: ['proibido', 'b', 'c'] }))
    const cardEl = w.calls.creatomate[0]?.elements.find((e) => e.track === 3 && e.type === 'image')
    return alheio.status === 400 && alheio.body.error === 'card_invalid' && meu.status === 200 && cardEl?.source === `${SB}/user-footage/${UID}/card2.png` &&
      curto.status === 400 && curto.body.error === 'voice_too_long' && nada.status === 400 && nada.body.error === 'nothing_changed' && proib.status === 400 && proib.body.error === 'moderation' && w.calls.creatomate.length === 1
  })
  await p('E1c pura: adsV2EditMontageInput devolve as MESMAS URLs e trechos (permutados), tira só as cenas pedidas, e as janelas das frases cabem no novo tempo', async () => {
    const w = mundo()
    const L = carregar(w, over)
    const P = L(F.pure)
    const S = L(F.server)
    const b = S.editBaseFromOrder(ord(w), w.db.ads_v2_shots.filter((r) => r.order_id === ORDER))
    if (!b.ok) return false
    const base = b.base
    const inp = P.adsV2EditMontageInput(base, { overlays: null, cardUrl: null, music: 'keep', order: [4, 1, 0] }, { width: 1080, height: 1920, fontFamily: 'Inter', format: '9:16' })
    const by = new Map(base.clips.map((c) => [c.idx, c.shot]))
    const total = inp.shots.reduce((s, x) => s + x.cutSeconds, 0)
    return inp.shots.length === 3 && [4, 1, 0].every((idx, i) => inp.shots[i].url === by.get(idx).url && inp.shots[i].cutStart === by.get(idx).cutStart && inp.shots[i].measuredSeconds === by.get(idx).measuredSeconds) &&
      inp.overlays.every((o) => o.end <= total + 1e-9 && o.start < o.end) && inp.voiceUrl === VOICE && inp.voiceSeconds === 11.2
  })

  // E2 — versões ficam
  await p('E2 duas edições = v2 e v3 (linhas NOVAS); prontas = 2 linhas NOVAS em videos (render_id adsv2edit-<versão>, credits_used 0); o vídeo original, o pedido e o débito dele intocados', async () => {
    const w = mundo()
    const L = carregar(w, over)
    const antes = JSON.stringify(ord(w))
    const v1 = JSON.stringify(w.db.videos[0])
    const a = await L(F.edit).POST(req({ order_id: ORDER, music: 'none' }))
    const b = await L(F.edit).POST(req({ order_id: ORDER, overlays: ['x', 'y', 'z'] }))
    const g = await L(F.versions).GET(req(null, `?order_id=${ORDER}`))
    const vs = w.db.ads_v2_versions
    const novos = w.db.videos.filter((v) => v.render_id.startsWith('adsv2edit-'))
    return a.status === 200 && b.status === 200 && g.status === 200 && vs.length === 2 && vs.map((v) => v.version).join() === '2,3' && vs.every((v) => v.status === 'delivered' && v.video_id) &&
      novos.length === 2 && new Set(novos.map((v) => v.id)).size === 2 && novos.every((v) => v.credits_used === 0 && v.user_id === UID && vs.some((x) => v.render_id === `adsv2edit-${x.id}`)) &&
      JSON.stringify(ord(w)) === antes && JSON.stringify(w.db.videos[0]) === v1 && g.body.original?.video_id === V1 && g.body.versions.length === 2 && w.calls.money.length === 0
  })
  await p('E2b nenhuma rota/lib nova apaga linha ou arquivo de vídeo (sem .delete( e sem remove fora da cópia de share que falhou)', () =>
    ['server', 'edit', 'versions', 'formats', 'approval', 'decide', 'view'].every((k) => !/\.delete\(/.test(fonte(k))) && (fonte('server').match(/\.remove\(/g) ?? []).length === 1)

  // E3 — token
  await p('E3 token: 300 tokens distintos, forma a1.<32>.<43>, nenhum id dentro; assinatura/segredo errados e troca de assinatura = recusa; o hash é sha256 do token', async () => {
    const T = carregar(mundo(), over)(F.token)
    const toks = Array.from({ length: 300 }, () => T.mintApprovalToken(SECRET))
    const uniq = new Set(toks.map((t) => t.token)).size === 300
    const forma = toks.every((t) => /^a1\.[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(t.token) && !/[0-9a-f]{8}-[0-9a-f]{4}/i.test(t.token) && t.hash === crypto.createHash('sha256').update(t.token).digest('hex'))
    const [A, B] = toks
    const [, na, sa] = A.token.split('.')
    const [, , sb] = B.token.split('.')
    const flip = A.token.slice(0, -2) + (A.token.slice(-2, -1) === 'A' ? 'B' : 'A') + A.token.slice(-1)
    return uniq && forma && T.verifyApprovalToken(A.token, SECRET).ok === true && T.verifyApprovalToken(A.token, SECRET).hash === A.hash &&
      T.verifyApprovalToken(flip, SECRET).ok === false && T.verifyApprovalToken(A.token, SECRET + 'x').ok === false && T.verifyApprovalToken(`a1.${na}.${sb}`, SECRET).ok === false &&
      T.verifyApprovalToken(`a1.${na}.${sa}x`, SECRET).ok === false && T.verifyApprovalToken(null, SECRET).ok === false && T.verifyApprovalToken(A.token, '').ok === false
  })
  await p('E3b escopo: o token A abre e decide SÓ a aprovação A (a B não muda); uma decisão por link (2ª = already_decided); vencido e desligado = link inválido', async () => {
    const w = mundo()
    const L = carregar(w, over)
    const Ar = await L(F.approval).POST(req({ order_id: ORDER, brand_name: 'Agência Norte' }))
    const Br = await L(F.approval).POST(req({ order_id: ORDER, brand_name: 'Agência Sul', lang: 'pt' }))
    const tok = (u) => decodeURIComponent(String(u).split('#')[1] ?? '')
    const ta = tok(Ar.body.url)
    const tb = tok(Br.body.url)
    const va = await L(F.view).POST(req({ token: ta }))
    const d1 = await L(F.decide).POST(req({ token: ta, decision: 'changes', comment: 'Mude a música' }))
    const d2 = await L(F.decide).POST(req({ token: ta, decision: 'approve' }))
    const [ra, rb] = w.db.ads_v2_approvals
    const vb = await L(F.view).POST(req({ token: tb }))
    rb.expires_at = '2020-01-01T00:00:00Z'
    const vencido = await L(F.view).POST(req({ token: tb }))
    rb.expires_at = '2099-01-01T00:00:00Z'
    const rev = await L(F.approval).POST(req({ action: 'revoke', approval_id: rb.id }))
    const desligado = await L(F.decide).POST(req({ token: tb, decision: 'approve' }))
    return Ar.status === 200 && va.status === 200 && va.body.brand === 'Agência Norte' && d1.status === 200 && d1.body.status === 'changes_requested' && d2.status === 409 &&
      ra.status === 'changes_requested' && ra.comment === 'Mude a música' && vb.status === 200 && vb.body.brand === 'Agência Sul' && vb.body.lang === 'pt' && vencido.status === 404 &&
      rev.status === 200 && desligado.status === 404 && rb.status === 'revoked' && w.db.ads_v2_approvals.every((r) => !('token' in r) && /^[0-9a-f]{64}$/.test(r.token_hash))
  })

  // E4 — sem PII
  await p('E4 a vista pública tem SÓ marca, vídeo, estado, língua e decidido; o vídeo é CÓPIA em renders/share/<aleatório> (sem o id da conta); nada de e-mail, pedido, brief, preço ou créditos', async () => {
    const w = mundo()
    const L = carregar(w, over)
    const r = await L(F.approval).POST(req({ order_id: ORDER, brand_name: 'Agência Norte' }))
    const t = decodeURIComponent(String(r.body.url).split('#')[1] ?? '')
    const v = await L(F.view).POST(req({ token: t }))
    const P = L(F.pure)
    const txt = JSON.stringify(v.body)
    const cp = w.calls.storage.find((c) => c[0] === 'copy')
    return v.status === 200 && JSON.stringify(Object.keys(v.body).sort()) === JSON.stringify([...P.ADS_V2_APPROVAL_PUBLIC_KEYS].sort()) &&
      ![UID, ORDER, V1, 'agencia@', 'perfume', '$49', 'lume.test', 'credit', 'billing', 'adsv2'].some((x) => txt.includes(x)) &&
      /\/renders\/share\/[A-Za-z0-9_-]{24}\.mp4$/.test(v.body.video_url) && cp && cp[2] === `${UID}/adsv2-${ORDER}-g1.mp4` && cp[3] === v.body.video_url.split('/renders/')[1] &&
      String(r.body.url).startsWith('https://usekineo.test/approve#a1.') && !String(r.body.url).includes(UID)
  })
  await p('E4b a página: token no fragmento (#), noindex + no-referrer; o cliente só fala com /approval/view e /approval/decide; nome da marca recusa e-mail, telefone e link', async () => {
    const P = carregar(mundo(), over)(F.pure)
    const cl = fonte('client')
    const rotas = [...cl.matchAll(/fetch\('([^']+)'/g)].map((m) => m[1])
    return /window\.location\.hash/.test(cl) && /referrer: 'no-referrer'/.test(fonte('page')) && /index: false/.test(fonte('page')) && /approve#\$\{made\.token\}/.test(fonte('approval')) &&
      JSON.stringify(rotas.sort()) === JSON.stringify(['/api/ads/v2/approval/decide', '/api/ads/v2/approval/view']) && !/next\/link|email|user_id|order_id/.test(cl) &&
      P.sanitizeApprovalBrand('Agência Norte') === 'Agência Norte' && P.sanitizeApprovalBrand('ana@norte.com') === null && P.sanitizeApprovalBrand('+55 (11) 99999-0000') === null &&
      P.sanitizeApprovalBrand('www.norte.com') === null && P.sanitizeApprovalBrand('https://x') === null && P.sanitizeApprovalBrand('') === null
  })

  // E5 — 3 formatos dos mesmos clipes
  await p('E5 "9:16 + 4:5 + 1:1" EXECUTADO: 2 montagens (4:5 1080×1350, 1:1 1080×1080) com as MESMAS URLs do 9:16; o plano de efeito ganha fundo suave (cover 118% mudo + véu + contain) SÓ fora do 9:16; cartão no quadro; 2º pedido não remonta', async () => {
    const w = mundo()
    const L = carregar(w, over)
    const e = await L(F.edit).POST(req({ order_id: ORDER, music: 'none' }))
    const s916 = w.calls.creatomate[0]
    const r = await L(F.formats).POST(req({ order_id: ORDER }))
    const [s45, s11] = w.calls.creatomate.slice(1)
    const de = (s) => s.elements.filter((x) => x.type === 'video' && x.source === clipUrl(0))
    const fill = (s) => { const v = de(s); return v.length === 2 && v.some((x) => x.fit === 'cover' && x.width === '118%' && x.volume === '0%') && v.some((x) => x.fit === 'contain' && x.width === '100%') && s.elements.some((x) => x.type === 'shape' && x.fill_color === 'rgba(0,0,0,0.45)' && x.time === v[0].time) }
    const card = (s) => s.elements.find((x) => x.type === 'image' && x.track === 3)
    const again = await L(F.formats).POST(req({ order_id: ORDER }))
    const outros = (s) => s.elements.filter((x) => x.type === 'video' && x.source === clipUrl(1))
    return e.status === 200 && r.status === 200 && w.calls.creatomate.length === 3 && s45.width === 1080 && s45.height === 1350 && s11.width === 1080 && s11.height === 1080 &&
      JSON.stringify(clipes(s45).sort()) === JSON.stringify(clipes(s916).sort()) && JSON.stringify(clipes(s11).sort()) === JSON.stringify(clipes(s916).sort()) &&
      de(s916).length === 1 && de(s916)[0].fit === 'cover' && fill(s45) && fill(s11) && outros(s45).length === 1 && outros(s45)[0].fit === 'cover' &&
      card(s916).height === '100%' && card(s45).height !== '100%' && card(s11).height !== '100%' &&
      w.db.ads_v2_versions.filter((v) => v.kind === 'format').map((v) => v.format).sort().join() === '1:1,4:5' && new Set(w.db.ads_v2_versions.filter((v) => v.kind === 'format').map((v) => v.batch_id)).size === 1 &&
      again.status === 200 && again.body.already === true && w.calls.fal.length === 0 && w.calls.money.length === 0
  })
  await p('E5b com ATOR: 4:5/1:1 levam o ator INTEIRO (contain, com a voz 100%) sobre fundo mudo, o insert de efeito com fundo suave e o cartão no quadro; o 9:16 é o ator de sempre', async () => {
    const w = mundo({ presenter: true })
    const L = carregar(w, over)
    const e = await L(F.edit).POST(req({ order_id: ORDER, music: 'none' }))
    const r = await L(F.formats).POST(req({ order_id: ORDER }))
    const [s916, s45] = w.calls.creatomate
    const ator = (s) => s.elements.filter((x) => x.type === 'video' && x.source === PRESENTER)
    const card = (s) => s.elements.find((x) => x.type === 'image' && x.track === 3 && x.source === CARD)
    return e.status === 200 && r.status === 200 && ator(s916).length === 1 && ator(s916)[0].volume === '100%' && ator(s916)[0].fit === 'cover' &&
      ator(s45).length === 2 && ator(s45).some((x) => x.fit === 'contain' && x.volume === '100%') && ator(s45).some((x) => x.fit === 'cover' && x.volume === '0%') &&
      card(s916).height === '100%' && card(s45).height !== '100%' && !s45.elements.some((x) => x.type === 'audio' && x.source === VOICE) && w.calls.fal.length === 0
  })

  // E6 — dinheiro intocado
  await p('E6 nada novo debita: ADS_V2_EDIT_CREDITS = 0 (proposta 1, não cobrada); nenhum arquivo novo chama débito/estorno/cobrança; a versão grava credits_charged 0', async () => {
    const P = carregar(mundo(), over)(F.pure)
    const novos = ['pure', 'server', 'auth', 'edit', 'versions', 'formats', 'approval', 'decide', 'view', 'panel', 'client']
    return P.ADS_V2_EDIT_CREDITS === 0 && P.ADS_V2_EDIT_CREDITS_PROPOSED === 1 && P.adsV2EditUsd(15) === 0.13 &&
      novos.every((k) => !/chargeAdsV2|confirmAdsV2Debit|failAdsV2Order|refundAdsV2|debitCredits|recordRenderIntent|credit_debits|from\('profiles'\)|stripe/i.test(fonte(k))) &&
      /credits_charged: ADS_V2_EDIT_CREDITS/.test(fonte('server')) && /credits_used: ADS_V2_EDIT_CREDITS/.test(fonte('server'))
  })
  await p('E6b montagem: desfeitas as linhas marcadas, adV2Montage.ts é EXATAMENTE o pai; e o source de sempre (sem fill) sai IDÊNTICO ao do pai em 9:16/4:5/1:1, terço de baixo, véu e ator', async () => {
    const mont = fonte('montage')
    const pai = rdBase(F.montage)
    if (pai === null || lf(semPosEntrega1510(F.montage, mont)) !== pai) return false
    const A = carregar(mundo(), { [F.montage]: mont })(F.montage)
    const B = carregar(mundo(), { [F.montage]: pai })(F.montage)
    const shots = [{ url: clipUrl(0), kind: 'product', cutStart: 0.2, cutSeconds: 3, measuredSeconds: 5 }, { url: clipUrl(1), kind: 'people', cutStart: 0.2, cutSeconds: 3, measuredSeconds: 5 }, { url: `${SB}/u/p.jpg`, kind: 'text', cutStart: 0, cutSeconds: 3, measuredSeconds: null }, { url: `${SB}/u/q.jpg`, kind: 'text', cutStart: 0, cutSeconds: 3, measuredSeconds: null, packshot: true }]
    const ov = [{ text: 'a', start: 0.3, end: 4 }, { text: 'b', start: 5, end: 11 }]
    const casos = [[1080, 1920], [1080, 1350], [1080, 1080]].flatMap(([width, height]) => {
      const b = { width, height, shots, overlays: ov, fontFamily: 'Inter', cardUrl: CARD, cardSeconds: 2.5, musicUrl: MUSIC, musicTrimStart: 15.01, voiceUrl: VOICE, voiceSeconds: 11.2 }
      return [b, { ...b, overlayPlacement: 'lower_third' }, { ...b, tint: 'rgba(10,20,30,0.12)' }, { ...b, presenter: { url: PRESENTER, measuredSeconds: 15.5, insertOrder: [0, 3, 1] } }]
    })
    return casos.every((c) => JSON.stringify(A.buildAdV2Source(c)) === JSON.stringify(B.buildAdV2Source(c)))
  })
  await p('E6c dinheiro e avanço intocados no diff (v2Billing, v2Tiers, v2StartCore, v2Advance, /start, /retake, /variations, v2Batch, credits/, compose, stripe, preço); fora de scripts/ e dos arquivos novos, só montagem + as 2 telas (2 linhas cada, desfeitas = o pai)', async () => {
    let tocados = []
    try { tocados = [...(PROPRIO ? [...git(['diff', '--name-only', BASE, PROPRIO]).split('\n'), ...git(['diff', '--name-only', 'HEAD']).split('\n')] : git(['diff', '--name-only', BASE]).split('\n')), ...git(['ls-files', '--others', '--exclude-standard']).split('\n')].filter(Boolean) } catch { return false } // reancorado KINEO-LEVA-ADS-AGENCIA-1510 — mede o PRÓPRIO commit (BASE→1º marcado) + o não commitado; antes do commit existir, a árvore contra a base
    const novos = new Set(Object.values(F).filter((f) => ![F.montage, F.simple, F.full].includes(f)))
    const fora = tocados.filter((f) => !f.startsWith('scripts/') && !novos.has(f))
    const telasOk = [F.simple, F.full].every((f) => { const pai = rdBase(f); return pai !== null && lf(semPosEntrega1510(f, semMarcas1510(f, semLinkTela1510(f, Object.hasOwn(over, f) ? over[f] : SRC[f === F.simple ? 'simple' : 'full'])))) === pai }) // reancorado KINEO-LEVA-ADS-AGENCIA-1510 — as marcas (mais novas na leva) saem antes · reancorado KINEO-ADS-LINK-TELA-1510
    return fora.every((f) => [F.montage, F.simple, F.full].includes(f)) && !tocados.some((f) => /v2Billing|v2Tiers|v2StartCore|v2Advance|ads\/v2\/(start|retake|variations|batch)\/|v2Batch|credits\/|lib\/compose|stripe|engineCost|pricing|v2Shots|v2Images|v2Engines/i.test(f)) && telasOk &&
      ACRESCIMOS_POS_ENTREGA_1510[F.simple].length === 2 && ACRESCIMOS_POS_ENTREGA_1510[F.full].length === 2
  })

  // F — painel, línguas, migração
  await p('F1 o painel é cliente e só importa módulos de navegador/puros; v2PostDelivery e as frases são puras (só libs sem import de servidor)', () => {
    const imps = (s) => [...s.matchAll(/^import[\s\S]*?from '([^']+)'/gm)].map((m) => m[1])
    const okPanel = ['react', '@/lib/ads/endCard', '@/lib/ads/uploadFootage', '@/lib/ads/v2PostDeliveryCopy', '@/lib/ads/v2PostDelivery', '@/lib/ui/interfaceLanguage']
    const purosDoPure = ['@/lib/ads/adV2Montage', '@/lib/ads/v2Music', '@/lib/ads/v2ShotLists']
    return /^'use client'/.test(fonte('panel')) && imps(fonte('panel')).every((m) => okPanel.includes(m)) && /^'use client'/.test(fonte('client')) &&
      imps(fonte('pure')).every((m) => purosDoPure.includes(m)) && purosDoPure.every((m) => !/^\s*import\s(?!type)/m.test(rd(m.replace('@/', '') + '.ts'))) &&
      !/^\s*import\s(?!type)/m.test(fonte('copy')) && !/fetch\(|process\.env/.test(fonte('pure'))
  })
  await p('F2 16 línguas: toda frase preenchida em todas, com os marcadores {n}/{brand}/{days} preservados', () => {
    const C = carregar(mundo(), over)(F.copy)
    const langs = Object.keys(C.ADS_V2_POS_ENTREGA_COPY)
    const keys = Object.keys(C.ADS_V2_POS_ENTREGA_COPY.en)
    const marc = { phraseN: '{n}', versionN: '{n}', shotN: '{n}', pFrom: '{brand}', linkNote: '{days}' }
    return langs.length === 16 && langs.every((l) => keys.every((k) => typeof C.ADS_V2_POS_ENTREGA_COPY[l][k] === 'string' && C.ADS_V2_POS_ENTREGA_COPY[l][k].trim().length > 0) && Object.entries(marc).every(([k, m]) => C.ADS_V2_POS_ENTREGA_COPY[l][k].includes(m)))
  })
  await p('F3 a migração mora em migrations_pending (NÃO aplicada): as 2 tabelas, RLS ligado, revoke de anon/authenticated, token só como sha256, uma decisão por estado; nada em ads_v2_orders/videos/créditos', () => {
    const m = fonte('mig')
    return /create table if not exists public\.ads_v2_versions/.test(m) && /create table if not exists public\.ads_v2_approvals/.test(m) &&
      /alter table public\.ads_v2_versions enable row level security/.test(m) && /alter table public\.ads_v2_approvals enable row level security/.test(m) &&
      /revoke all on table public\.ads_v2_approvals from anon, authenticated/.test(m) && /token_hash ~ '\^\[0-9a-f\]\{64\}\$'/.test(m) && /unique \(order_id, version\)/.test(m) &&
      !/alter table public\.(ads_v2_orders|videos|profiles|credit)/i.test(m) && !/insert into|delete from|drop table/i.test(m) && !fs.existsSync(path.join(ROOT, 'supabase/migrations/20261015120000_ads_v2_pos_entrega.sql'))
  })
  return out
}

console.log('\n── provas sobre o código de agora')
const AGORA = await provas()
for (const [n, v] of AGORA) ok(v, n)

console.log('\n── a forma do ajuste')
ok(JSON.stringify(ARQUIVOS_POS_ENTREGA_1510.sort()) === JSON.stringify([F.montage, F.simple, F.full].sort()), 'o desfaz cobre exatamente montagem + as 2 telas')
ok(ARQUIVOS_POS_ENTREGA_1510.every((f) => { const pai = rdBase(f); return pai !== null && lf(semPosEntrega1510(f, semMarcas1510(f, semLinkTela1510(f, rd(f))))) === pai }) /* reancorado KINEO-ADS-LINK-TELA-1510 */ /* reancorado KINEO-LEVA-ADS-AGENCIA-1510 — as marcas (mais novas na leva) saem antes */, 'byte a byte: desfeitas as linhas marcadas, cada arquivo é EXATAMENTE o pai do 1º commit marcado')
ok(ACRESCIMOS_POS_ENTREGA_1510[F.montage].length > 0 && ACRESCIMOS_POS_ENTREGA_1510[F.montage].every((l) => !/x_alignment|font_size|ADS_V2_OVERLAY_Y|ADS_V2_MUSIC_VOLUME|voiceUrl|musicUrl|cardSeconds|credits|watermark/i.test(l)), "na montagem, nenhuma linha acrescentada mexe em frase, fonte, voz, música, duração do cartão ou marca d'água (só o preenchimento com fill)")

console.log('\n── mutantes (cada um provado aplicado; cada um deixa ao menos uma prova vermelha)')
const trocarMuitos = (k, pares) => { let src = SRC[k]; for (const [de, para] of pares) { if (src.split(de).length !== 2) throw new Error('âncora não única: ' + de.slice(0, 70)); const o = src.split(de).join(para); if (o === src) throw new Error('não aplicou'); src = o } return { [F[k]]: src } }
const trocar = (k, de, para) => { const src = SRC[k]; if (src.split(de).length !== 2) throw new Error('âncora não única: ' + de.slice(0, 70)); const out = src.split(de).join(para); if (out === src) throw new Error('não aplicou'); return { [F[k]]: out } }
const MUTANTES = [
  ['clipe trocado pelo da fal na edição', () => trocar('server', "      url: (r.stored_url ?? '').trim(),", "      url: (r.fal_url ?? r.stored_url ?? '').trim(),")],
  ['a edição chama a fal', () => trocar('edit', '      const v = await submitAdsV2Version(', "      await (await import('@/lib/ads/v2Shots')).submitShotOnce({})\n      const v = await submitAdsV2Version(")],
  ['versão nova sobrescreve a anterior (número fixo)', () => trocar('server', "    const next = Math.max(1, Number((top.data as { version?: number } | null)?.version ?? 1)) + 1", '    const next = 2')],
  ['token sem conferir a assinatura', () => trocar('token', "  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_signature' }\n", '')],
  ['a página vaza a conta e o pedido', () => trocar('pure', "  return { brand: row.brand_name, video_url: row.share_video_url,", "  return { ...(row as object), brand: row.brand_name, video_url: row.share_video_url,")],
  ['o vídeo da aprovação é o caminho com o id da conta', () => trocar('server', "  const shareUrl = args.videoUrl.slice(0, args.videoUrl.indexOf(mark) + mark.length) + dest", '  const shareUrl = args.videoUrl')],
  ['formato corta o efeito (sem fundo suave)', () => trocar('pure', '(other && c.nineOnly ? { ...c.shot, fill: true } : { ...c.shot })', '({ ...c.shot })')],
  ['formato monta outro quadro (sempre 9:16)', () => trocar('server', '  const frame = renderOutputSpecFor(format)', "  const frame = renderOutputSpecFor('9:16')")],
  ['a edição passa a cobrar', () => trocar('pure', 'export const ADS_V2_EDIT_CREDITS = 0', 'export const ADS_V2_EDIT_CREDITS = 1')],
  ['montagem muda fora da marca (frase menor)', () => trocar('montage', "      font_family: fontFamily, font_size: 64, font_weight: '800', line_height: '110%',\n      fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.55)', stroke_width: 2,\n      // KINEO-ADS-V2-PILULA", "      font_family: fontFamily, font_size: 60, font_weight: '800', line_height: '110%',\n      fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.55)', stroke_width: 2,\n      // KINEO-ADS-V2-PILULA")],
  ['decisão sem trava (o cliente decide de novo por cima)', () => trocarMuitos('server', [["  if (row.status !== 'pending') return { ok: false, error: 'already_decided' }\n", ''], [".eq('id', row.id).eq('status', 'pending').select('id').maybeSingle()", ".eq('id', row.id).select('id').maybeSingle()"]])],
  ['token no caminho do link (vai ao servidor e ao Referer)', () => trocar('approval', 'url: `${origin}/approve#${made.token}`', 'url: `${origin}/approve/${made.token}`')],
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
