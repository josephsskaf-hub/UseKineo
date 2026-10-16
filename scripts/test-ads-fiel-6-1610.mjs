// KINEO-ADS-FIEL-6-1610 — guardião do conserto da CONFERÊNCIA da trava do produto (Studio Ads v2, reteste pago de 15/10, pedido 96788559,
// REPROVADO; fora da TRAVA 8.2). Roda com `node scripts/test-ads-fiel-6-1610.mjs`, sem rede, sem banco, sem fornecedor: os módulos são
// transpilados pelo typescript do repo e rodados com stubs (o mesmo banco falso com UPDATE condicional de scripts/test-ads-fiel-5-1510.mjs).
// Números REAIS do pedido 96788559 (docs/RESULTADO-VALIDACAO-ADS-FIEL-5-2026-10-15.md e os eventos ads_v2_shot_fallback de 15/10 19:56–19:57
// UTC): T1 Comercial 9:16, cenas travadas 2, 3 e 4 (direita · esquerda · direita); as 6 conferências (3 cenas × 2 tentativas) vieram
// trusted=true, round=false, corner_surface=true e top_edge_raw 0,637 (o exemplo da pergunta); corner_person=true em 5 (a 2ª conferência da
// cena 3 disse false, mas um rosto caiu sobre o retângulo); o tampo real, medido à mão nos quadros (C:\kineo-wt\prints-1610\
// fiel5-T1-cenas-recusadas-linhas.jpg), ficava em ~0,61 · 0,66 · 0,77 · 0,66 · 0,65 · 0,74, e em 5 das 6 imagens o canto estava VAZIO. Os
// eventos não gravaram as caixas de rosto: as caixas daqui são as medidas a olho nesses quadros (decimais, como a conferência devolveu).
// BASE = o pai do PRIMEIRO commit com a marca.
//
// O que prova (1 seção por item da decisão):
//   P  a pergunta não tem NENHUM número de exemplo (só as coordenadas da região e os índices 0/1 da escala), pede 3 casas por extenso e
//      as caixas de corpo; o corpo da conferência leva essa pergunta; a leitura traz `people`;
//   C  copiado: 0,637 (o exemplo antigo) e qualquer número da própria pergunta (0,52 · 0,84) = borda não confiável ('copied'); igual à de
//      OUTRA cena do pedido = 'repeated'; caixa com coordenada copiada, redonda ou repetida não corrobora nada;
//   K  "gente no canto" sozinho NUNCA descarta: as 5 respostas corner_person=true do 96788559 mantêm a cena; só caixa CONFIÁVEL de rosto ou de
//      corpo DENTRO do retângulo descarta; a regra antiga (Fiel 4/5) descartava as 6 — reproduzido;
//   G  limite global: mais da metade das cenas do pedido (no mínimo 2) descartadas = 'conferencia_suspeita' (6 de 6 → mantém);
//   S  servidor REAL: base fixa quando a borda é copiada/repetida, o registro '-check-t<n>.json' gravado SEMPRE e lido de volta, suspeita = mantém;
//   A  avanço executado (servidor REAL, banco e fornecedores falsos) com as 6 respostas reais: antes = 3 fotos da caixa (o reteste); agora = 3
//      cenas de gente travadas; com corroboração em todas = a conferência fica suspeita e as cenas ficam;
//   V  desfaz exato + ida + marca em todo bloco + só os 4 arquivos da trava + dinheiro byte a byte + trava ainda 'internal' + encadeamento dos
//      desfaz antigos + o plano do reteste;
//   M  mutantes (todos aplicados e vermelhos).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semFiel6_1610, comFiel6_1610, FIEL_6_1610_ARQUIVOS, FIEL_6_1610_NOVOS, FIEL_6_1610_BASE, MARCA_FIEL_6_1610 } from './test-support/desfaz-ads-fiel-6-1610.mjs'
import { semFiel5_1510, desfazFiel5_1510 } from './test-support/desfaz-ads-fiel-5-1510.mjs'
import { semVolta1510, desfazVolta1510 } from './test-support/desfaz-ads-fiel-volta-1510.mjs'
import { semFielLiga1510 } from './test-support/desfaz-ads-fiel-liga-1510.mjs'
import { semFiel7_1610 } from './test-support/desfaz-ads-fiel-7-1610.mjs' // reancorado KINEO-ADS-FIEL-7-1610 — base sempre fixa + caixa-chute (reteste 96fbb38f)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-ADS-FIEL-6-1610'
const rd = (p) => semFiel7_1610(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-ADS-FIEL-7-1610 — a fiel-7 veio depois (base sempre fixa, caixa-chute): este guardião lê o texto SEM ela (semFiel7_1610 já devolve LF)
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
let BASE = 'HEAD'
let ULTIMO = null
try {
  const shas = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
  if (shas.length) { ULTIMO = shas[0]; BASE = git('rev-parse', `${shas[shas.length - 1]}~1`).trim() }
} catch { BASE = 'HEAD' }
const base = (p) => { try { return git('show', `${BASE}:${p}`).replace(/\r\n/g, '\n') } catch { return null } }
const diffDoConserto = (opts, paths = []) => (ULTIMO ? git('diff', ...opts, BASE, ULTIMO, '--', ...paths) + git('diff', ...opts, 'HEAD', '--', ...paths) : git('diff', ...opts, BASE, '--', ...paths)).replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const tenta = async (fn) => { try { return !!(await fn()) } catch { return false } }
let naoAplicou = null
const trocar = (src, de, para) => { if (src.split(de).length !== 2) { naoAplicou = 'sem âncora única: ' + de.slice(0, 80); throw new Error('mutante ' + naoAplicou) } const out = src.split(de).join(para); if (out === src || !out.includes(para)) { naoAplicou = 'texto igual'; throw new Error('mutante não aplicou') }; return out }

const F = {
  advance: 'lib/ads/v2Advance.ts', shotLists: 'lib/ads/v2ShotLists.ts', png: 'lib/ads/v2Png.ts', server: 'lib/ads/v2ProductLockServer.ts',
  vision: 'lib/ads/v2LockVision.ts', aiModels: 'lib/aiModels.ts',
}

// ── carregador: transpila TS → CJS, resolve '@/' com stubs (o resto real); `over` = fonte mutante ─────────────────────────
function makeLoader(stubs, opts = {}) {
  const cache = new Map()
  const over = opts.over ?? {}
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const text = Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel)
    const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || spec === 'crypto') return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && existsSync(join(ROOT, target))) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    const timers = opts.timers ?? { setTimeout, clearTimeout }
    new Function('exports', 'require', 'module', 'setTimeout', 'clearTimeout', js)(module.exports, req, module, timers.setTimeout, timers.clearTimeout)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
const fastTimers = { setTimeout: (fn) => setImmediate(fn), clearTimeout: (h) => clearImmediate(h) }
const pure = (over = {}) => makeLoader({}, { over })

// ── banco falso com UPDATE condicional de verdade (o mesmo de scripts/test-ads-fiel-4-1510.mjs) ─────────────────────────
let seq = 0
function fakeDb(tables) {
  const from = (name) => {
    tables[name] ??= []
    const ctx = { name, op: 'select', filters: [], patch: null, rows: null, opts: null }
    const api = {
      select() { return api },
      eq(k, v) { ctx.filters.push((r) => r[k] !== undefined && r[k] !== null && String(r[k]) === String(v)); return api },
      in(k, v) { ctx.filters.push((r) => v.map(String).includes(String(r[k]))); return api },
      is(k, v) { ctx.filters.push((r) => (v === null ? r[k] === null || r[k] === undefined : r[k] === v)); return api },
      not(k, op, v) { ctx.filters.push((r) => !(op === 'is' && v === null ? r[k] === null || r[k] === undefined : false)); return api },
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
  function run(ctx, single) {
    const t = tables[ctx.name]
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
      return single ? { data: rows[0] ? { ...rows[0] } : null, error: null } : { data: rows.map((r) => ({ ...r })), error: null }
    }
    const out = []
    for (const row of ctx.rows) {
      if (ctx.name === 'ads_v2_shots' && t.some((x) => x.order_id === row.order_id && x.idx === row.idx && x.attempt === (row.attempt ?? 1))) {
        if (ctx.op === 'upsert' && ctx.opts?.ignoreDuplicates) continue
        return { data: null, error: { code: '23505', message: 'dup' } }
      }
      const iso = new Date().toISOString()
      const b = ctx.name === 'ads_v2_shots'
        ? { attempt: 1, movement_variant: 0, status: 'pending', image_url: null, image_request_id: null, request_id: null, fal_url: null, stored_url: null, measured_seconds: null, reason: null, reason_class: null, image_submit_claimed_at: null, submit_claimed_at: null, submitted_at: null, fal_done_at: null }
        : {}
      const nr = { id: row.id ?? `${ctx.name}-${++seq}`, created_at: iso, updated_at: iso, ...b, ...row }
      t.push(nr)
      out.push({ ...nr })
    }
    return single ? { data: out[0] ?? null, error: null } : { data: out, error: null }
  }
  return { from, tables }
}

const SL = pure()(F.shotLists)
const PNG = pure()(F.png)
const PH = 'https://x.supabase.co/storage/v1/object/public/user-footage/u/'
const U = (n) => `${String(n).padStart(8, '0')}-2222-4333-8444-555555555555`
const ORDER = U(1)
const USER = U(9)
const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 })
const near = (a, b, e = 0.0015) => Math.abs(a - b) <= e
const cutout = (() => { const w = 400, h = 600, d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (x >= 120 && x < 280 && y >= 100 && y < 560) { d[o] = 220; d[o + 1] = 200; d[o + 2] = 150; d[o + 3] = 255 } } return { width: w, height: h, data: d } })()
const sceneImg = (w, h, v = [90, 80, 60]) => { const d = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = v[0]; d[i * 4 + 1] = v[1]; d[i * 4 + 2] = v[2]; d[i * 4 + 3] = 255 } return { width: w, height: h, data: d } }
const px = (img, x, y) => { const o = (y * img.width + x) * 4; return [img.data[o], img.data[o + 1], img.data[o + 2]] }
const storage = new Map()
const srvCalls = { uploads: [], json: [] }
const pub = (path) => `https://sb.co/storage/v1/object/public/renders/${path}`
const cutBytes = PNG.encodePng(cutout, { alpha: true })
const sceneBytes = PNG.encodePng(sceneImg(540, 960))
const tallBytes = PNG.encodePng(sceneImg(600, 1200)) // mais estreita que 9:16: a janela cover corta em cima e embaixo
const srvStubs = {
  '@fal-ai/client': { fal: { config() {}, subscribe: async () => ({ data: { image: { url: 'https://fal.media/cut.png' } } }), queue: { cancel: async () => {} } } },
  '@/lib/userFootage': { footageAdminClient: () => ({
    storage: { from: () => ({ upload: async (path, buf, o) => { storage.set(pub(path), new Uint8Array(buf)); srvCalls.uploads.push(path); if (o && o.contentType === 'application/json') srvCalls.json.push({ path, text: new TextDecoder().decode(buf) }); return { error: null } }, getPublicUrl: (path) => ({ data: { publicUrl: pub(path) } }) }) },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'josephsskaf@gmail.com' } } }) } },
  }) },
  '@/lib/ads/v2Shots': { adsV2ShotRenderId: (o, i, a) => `adsv2-${o}-p${i}-a${a}` },
}
const realFetch = globalThis.fetch
const fakeFetch = async (url) => {
  const u = String(url)
  const body = storage.get(u) ?? (u === 'https://fal.media/cut.png' ? cutBytes : u === 'https://fal.media/scene.png' || u === 'https://fal.media/img.png' ? sceneBytes : u === 'https://fal.media/tall.png' ? tallBytes : null)
  return body ? new Response(body, { status: 200 }) : new Response('no', { status: 404 })
}
globalThis.fetch = fakeFetch
process.env.FAL_KEY = 'test-key'
const loadSrv = (over = {}) => makeLoader(srvStubs, { over })(F.server)
const SRV = loadSrv()
const LOCK = { footageId: 'f-prod', url: `${PH}prod.jpg`, mode: 'scene' }
const TRIM = PNG.trimCutout(cutout)
const prov = { images: [], events: [], fails: [], refunds: 0, submits: [] }
const vision = { dup: async () => false, check: async () => null }
const visionStub = { adsV2SceneHasProduct: async (u) => vision.dup(u), adsV2SceneCheck: async (u, f, side) => vision.check(u, f, side) }
let curTables = null
class CreatomateSubmitError extends Error { constructor(m, amb) { super(m); this.ambiguous = amb } }
const SH = makeLoader({ '@fal-ai/client': { fal: {} }, '@/lib/falQueue': { FalQueueSubmitError: class extends Error {}, submitFalQueueOnce: async () => 'x' }, '@/lib/cinematic/sceneDisposition': { classifyProviderFailure: () => ({ disposition: 'rejected', reason_class: 'unknown' }) }, '@/lib/renderAssets': { persistRenderAssets: async () => ({}) }, '@/lib/mp4Duration': { probeMp4DurationSeconds: () => 3 }, '@/lib/falAlert': { alertFalExhausted: async () => {}, falErrorText: () => '', looksExhausted: () => false } })('lib/ads/v2Shots.ts')
const advStubs = (server) => ({
  '@/lib/compose': { CreatomateSubmitError, estimateMp3DurationSeconds: () => 9.5, pollCreatomateRender: async () => ({ status: 'rendering', url: null }), submitCreatomateRender: async () => 'cm-1', uploadVoiceoverToSupabase: async () => 'https://sb/voiceovers/v.mp3' },
  '@/lib/lyriaMusic': { getLyriaMusicUrl: async () => null },
  '@/lib/pixabayMusic': { getBackgroundMusicUrl: async () => 'https://sb/music/m.mp3' },
  '@/lib/ttsFallback': { synthesizeTtsFallback: async () => Buffer.alloc(2000), synthesizeElevenVoice: async () => Buffer.alloc(2000) },
  '@/lib/renderAssets': { persistRenderAssets: async (a) => ({ videoUrl: `https://sb/renders/${a.renderId}.mp4`, thumbnailUrl: null, measuredSeconds: 15.1 }) },
  '@/lib/renderProfile': { renderOutputSpecFor: (f) => (f === '1:1' ? { width: 1080, height: 1080 } : f === '4:5' ? { width: 1080, height: 1350 } : { width: 1080, height: 1920 }) },
  '@/lib/textLanguage': { captionFontFor: () => 'Montserrat', narrationLanguage: (x) => (typeof x === 'string' && x ? x : null) },
  '@/lib/ads/speakable': { speakableForTts: (t) => t },
  '@/lib/serverEvents': { writeServerEvent: async (e) => { prov.events.push(e); return true } },
  '@/lib/ads/v2Billing': {
    ADS_V2_QUALITY: 'ads_v2',
    confirmAdsV2Debit: async () => ({ ok: true, refunded: false, amount: 41 }),
    failAdsV2Order: async (admin, order, reason) => { const o = curTables.ads_v2_orders.find((x) => x.id === order.id); if (o && (o.status === 'generating' || o.status === 'assembling')) { o.status = 'failed'; o.error = reason; prov.fails.push(reason); prov.refunds += 1; return true } return false },
  },
  '@/lib/ads/v2Shots': { ...SH, ADS_V2_KLING_GAP_MS: 0, submitShotOnce: async (model, input) => { prov.submits.push({ model, input }); return { kind: 'accepted', requestId: `req-${prov.submits.length}`, posts: 1 } }, pollFalJob: async () => ({ state: 'processing', url: null }), persistShotClip: async (a) => ({ storedUrl: `https://sb/renders/${SH.adsV2ShotRenderId(a.orderId, a.idx, a.attempt)}.mp4`, measuredSeconds: 4.04 }) },
  '@/lib/ads/v2Images': {
    persistAudioCopy: async () => null,
    persistSceneImage: async (a) => `https://sb/renders/${a.orderId}-p${a.idx}-scene.jpg`,
    pollSceneImage: async () => ({ state: 'done', url: 'https://fal.media/img.png' }),
    submitSceneImage: async (sc) => { prov.images.push(sc); return { kind: 'accepted', requestId: `img-${prov.images.length}`, posts: 1 } },
  },
  '@/lib/ads/v2LockVision': visionStub,
  '@/lib/ads/v2ProductLockServer': server,
})
const loadAdvance = (over = {}, server = SRV) => makeLoader(advStubs(server), { timers: fastTimers, over })(F.advance)
const A = loadAdvance()
const reset = () => { prov.images.length = 0; prov.events.length = 0; prov.fails.length = 0; prov.submits.length = 0; prov.refunds = 0; vision.dup = async () => false; vision.check = async () => null; storage.clear() }
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const SPHOTOS = [{ id: 'f-prod', url: `${PH}prod.jpg`, kind: 'product' }, { id: 'f-place', url: `${PH}place.jpg`, kind: 'place' }]
function world() {
  const plan = SL.planShots({ sector: 'store', tier: 'commercial', photos: SPHOTOS, seconds: 15 })
  const stored = { ...plan, overlays: [{ role: 'brand', start: 0.3, end: 3.9, text: 'Perfume Atheeri - Fragrâncias únicas' }], narration: 'Este perfume traz uma mistura encantadora de aromas.' }
  const order = {
    id: ORDER, user_id: USER, status: 'generating', tier: 'commercial', seconds: 15, sector: 'store', brief: { business: 'Perfume Atheeri', kind: 'product' }, language: 'pt', narration: true, card_url: 'https://sb/card.png',
    photos: SPHOTOS.map((p) => ({ footage_id: p.id, kind: p.kind, url: p.url })), plan: stored, music_url: null, voice_url: null, voice_seconds: null,
    billing_ref: `adsv2-${ORDER}-g`, credits_charged: 41, generation_id: U(2), creatomate_render_id: null, video_id: null, error: null,
    started_at: ago(30_000), assembly_lease_at: null, assembly_submit_at: null, parent_order_id: null, retake_idx: null, created_at: ago(30_000), updated_at: ago(30_000),
  }
  const tables = { ads_v2_orders: [order], ads_v2_shots: [], videos: [] }
  curTables = tables
  return { db: fakeDb(tables), tables, order }
}
const DL = () => Date.now() + 60_000

// ── os números REAIS do 96788559 ─────────────────────────────────────────────────────────────────────────────────────────────
const sem6 = (p) => semFiel6_1610(p, rd(p))
const ANTES = { [F.shotLists]: sem6(F.shotLists), [F.server]: sem6(F.server), [F.advance]: sem6(F.advance), [F.vision]: sem6(F.vision) } // o texto de antes deste conserto (a Fiel 5 com o rollback)
const SL5 = pure(ANTES)(F.shotLists)
const T1 = { W: 1080, H: 1920, fmt: '9:16', idxs: [2, 3, 4] }
const Q = (side, S = SL) => S.adsV2LockCheckQuestionTop('9:16', side)
const rectOf = (side, S = SL) => { const r = S.adsV2LockReservedRect({ frameW: T1.W, frameH: T1.H, cutW: TRIM.width, cutH: TRIM.height, format: '9:16', side }); return { x0: r.x / T1.W, y0: r.y / T1.H, x1: (r.x + r.w) / T1.W, y1: (r.y + r.h) / T1.H } }
// as 6 conferências, na ordem dos eventos: (cena, lado, tentativa, corner_person, rosto); top_edge_raw 0,637 e corner_surface true em todas
const REAL = [
  { idx: 4, side: 'right', t: 1, cp: true, faces: [box(0.012, 0.284, 0.098, 0.357)], people: [box(0.0, 0.262, 0.331, 0.748)] }, // homem sentado à esquerda; o canto direito vazio
  { idx: 3, side: 'left', t: 1, cp: false, faces: [box(0.113, 0.622, 0.198, 0.701)], people: [] }, // corner_person false, mas um rosto devolvido DENTRO do retângulo (o 'person' do evento)
  { idx: 2, side: 'right', t: 1, cp: true, faces: [box(0.287, 0.204, 0.371, 0.296)], people: [box(0.143, 0.183, 0.468, 0.911)] }, // homem de pé à esquerda
  { idx: 3, side: 'left', t: 2, cp: true, faces: [box(0.538, 0.341, 0.617, 0.437), box(0.811, 0.322, 0.889, 0.418)], people: [box(0.502, 0.312, 0.997, 0.913)] }, // casal à direita; o canto esquerdo vazio
  { idx: 2, side: 'right', t: 2, cp: true, faces: [box(0.118, 0.229, 0.231, 0.341)], people: [box(0.0, 0.207, 0.412, 0.876)] }, // mulher sentada à esquerda
  { idx: 4, side: 'right', t: 2, cp: true, faces: [box(0.083, 0.098, 0.171, 0.191)], people: [box(0.0, 0.074, 0.392, 0.998)] }, // homem de pé à esquerda
]
const TOP = 0.637
const asCheck = (a) => ({ faces: a.faces, people: a.people, cornerPerson: a.cp, cornerSurface: true, topEdgeY: TOP })

// ═══ P. a pergunta ══════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nP. a pergunta da conferência não tem número de exemplo')
const p1 = (S = SL) => ['9:16', '4:5', '1:1'].every((f) => ['left', 'right'].every((side) => {
  const q = S.adsV2LockCheckQuestionTop(f, side)
  const z = S.adsV2LockReserveZone(f, side)
  const dec = S.adsV2QuestionNumbers(q).filter((n) => !Number.isInteger(n))
  const ints = S.adsV2QuestionNumbers(q).filter((n) => Number.isInteger(n))
  return !/for example|e\.g\.|such as 0/i.test(q) && !q.includes('0.637') && dec.every((n) => [z.x0, z.y0, z.x1, z.y1].includes(n)) && ints.every((n) => n >= 0 && n <= 5) &&
    /written with three digits after the decimal point, never a rounded default and never a number copied from this question/.test(q) && /"top_edge_y": number with three decimals or null/.test(q) &&
    /\(5\) List every person's whole visible body/.test(q) && /"people": \[\[x0, y0, x1, y1\], \.\.\.\]/.test(q) && q.includes(`region x ${z.x0}–${z.x1}, y ${z.y0}–${z.y1}`)
}))
await check('P1 os 3 formatos × 2 lados: sem "for example 0.637" (nem exemplo nenhum); os únicos decimais são as coordenadas da região; "three digits after the decimal point … never a number copied from this question"; pede as caixas de corpo ("people")', () => p1())
const AIM = pure()(F.aiModels)
const VIS = pure()(F.vision)
const p2 = async (V = VIS) => {
  const body = V.adsV2LockCheckBody('https://fal.media/scene.png', '9:16', 'right')
  const txt = body.messages[0].content.find((c) => c.type === 'text')
  const img = body.messages[0].content.find((c) => c.type === 'image_url')
  const resp = (content) => async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
  process.env.OPENAI_API_KEY = 'sk-test'
  const got = await V.adsV2SceneCheck('https://fal.media/scene.png', '9:16', 'right', resp('{"faces":[[0.012,0.284,0.098,0.357]],"corner_person":true,"corner_surface":true,"top_edge_y":0.637,"people":[[0.0,0.262,0.331,0.748]]}'))
  const sem = await V.adsV2SceneCheck('https://fal.media/scene.png', '9:16', 'right', resp('{"faces":[],"corner_person":false,"corner_surface":true,"top_edge_y":0.702}'))
  delete process.env.OPENAI_API_KEY
  return txt.text === Q('right') && img.image_url.detail === 'high' && body.model === AIM.AI_TEXT_MODELS.vision && got && got.people.length === 1 && got.people[0].x1 === 0.331 && got.topEdgeY === 0.637 && got.cornerPerson === true && sem && Array.isArray(sem.people) && sem.people.length === 0
}
await check('P2 o corpo da conferência leva ESSA pergunta (detalhe "high", modelo do registro); a resposta chega com people (sem a chave = [])', () => p2())
await check('P3 a leitura de people: caixa válida entra, lixo sai, até 8; sem as chaves da Fiel 4 = null', () => {
  const p = (o) => SL.adsV2ParseLockCheck6(JSON.stringify(o))
  return p({ faces: [], corner_person: false, people: [[0.1, 0.2, 0.3, 0.9], 'x', [2, 3, 4, 5], [0.1, 0.1, 0.1, 0.1]] }).people.length === 1 && p({ faces: [], corner_person: false, people: Array.from({ length: 12 }, () => [0.11, 0.21, 0.31, 0.91]) }).people.length === 8 &&
    p({ people: [[0.1, 0.2, 0.3, 0.9]] }) === null && SL.adsV2ParseLockCheck6('talvez') === null
})

// ═══ C. copiado e repetido ═══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. a borda copiada da pergunta ou repetida entre cenas não vale')
const c1 = (S = SL) => {
  const velha = SL5.adsV2LockCheckQuestionTop('9:16', 'right')
  const bug = SL5.adsV2LockTopEdgeTrust({ raw: TOP, cornerSurface: true })
  const t6 = (raw, q, others) => S.adsV2LockTopEdgeTrust6({ raw, cornerSurface: true, question: q, othersTops: others })
  return velha.includes('for example 0.637') && bug.ok === true && bug.why === null && // o reteste: a regra da Fiel 5 ACEITAVA o 0,637
    t6(TOP, velha).why === 'copied' && REAL.every((a) => t6(TOP, Q(a.side, S)).why === 'copied' && t6(TOP, Q(a.side, S)).ok === false) && S.adsV2LockEchoesQuestion(TOP, velha) && S.adsV2LockEchoesQuestion(0.6374, Q('left', S))
}
await check('C1 as 6 respostas reais (0,637): a regra da Fiel 5 aceitava; agora = "copied" (número da pergunta antiga e eco conhecido), com a pergunta velha e com a nova', () => c1())
const c2 = (S = SL) => {
  const t6 = (raw, side = 'right', others) => S.adsV2LockTopEdgeTrust6({ raw, cornerSurface: true, question: Q(side, S), othersTops: others })
  return t6(0.52).why === 'copied' && t6(0.84).why === 'copied' && t6(0.5204, 'left').why === 'copied' && t6(0.613).ok && t6(0.661).ok && t6(0.774).ok && t6(0.613).y === 0.613 &&
    t6(0.6).why === 'round' && t6(0.437).why === 'out_of_range' && S.adsV2LockTopEdgeTrust6({ raw: 0.613, cornerSurface: false, question: Q('right', S) }).why === 'no_surface' && S.adsV2LockTopEdgeTrust6({ raw: null, cornerSurface: true, question: Q('right', S) }).why === 'no_answer'
}
await check('C2 qualquer número da pergunta nova também é cópia (0,52 e 0,84 da região); 0,613 · 0,661 · 0,774 (o tampo real medido) valem; as regras da Fiel 5 (redonda, faixa, superfície) continuam', () => c2())
const c3 = (S = SL) => {
  const t6 = (raw, others) => S.adsV2LockTopEdgeTrust6({ raw, cornerSurface: true, question: Q('right', S), othersTops: others })
  return t6(0.661, [0.661]).why === 'repeated' && t6(0.661, [0.6614]).why === 'repeated' && t6(0.661, [0.662]).ok && t6(0.661, [null, undefined, Number.NaN]).ok && t6(0.661, []).ok
}
await check('C3 a mesma borda de OUTRA cena do pedido (até meia unidade da 3ª casa) = "repeated"; 0,001 de diferença vale', () => c3())
const c4 = (S = SL) => {
  const q = Q('right', S)
  const bom = box(0.703, 0.618, 0.787, 0.694)
  const keep = S.adsV2LockReliableBoxes([bom, box(0.7, 0.6, 0.8, 0.7), box(0.52, 0.611, 0.603, 0.689), box(0.0, 0.262, 0.331, 1), box(0.611, 0.84, 0.693, 0.97)], { question: q, previous: [box(0.611, 0.84, 0.693, 0.97)] })
  return keep.length === 2 && keep[0] === bom && keep[1].x0 === 0 && keep[1].y1 === 1 && S.adsV2LockBoxEchoes(box(0.52, 0.611, 0.603, 0.689), q) && !S.adsV2LockBoxEchoes(box(0.0, 0.262, 0.331, 1), q)
}
await check('C4 caixa confiável UMA A UMA: redonda, com coordenada copiada da pergunta (0,52) ou idêntica à de outra cena sai; a borda 0/1 da imagem não conta como cópia', () => c4())

// ═══ K. gente no canto só com corroboração ═══════════════════════════════════════════════════════════════════════════════════
console.log('\nK. "gente no canto" sozinho nunca descarta a cena')
const k1 = () => REAL.every((a) => SL5.adsV2LockCornerProblem({ trusted: true, cornerPerson: a.cp, cornerSurface: true, faces: a.faces, rect: rectOf(a.side) }) === 'person')
await check('K1 o reteste reproduzido: com a regra da Fiel 4/5, as 6 conferências reais descartam a cena (5 por corner_person, 1 pelo rosto)', () => k1())
const verdictOf = (a, S = SL, prev = []) => {
  const q = Q(a.side, S)
  return S.adsV2LockCornerVerdict6({ trusted: true, cornerPerson: a.cp, cornerSurface: true, faces: S.adsV2LockReliableBoxes(a.faces, { question: q, previous: prev }), people: S.adsV2LockReliableBoxes(a.people, { question: q, previous: [] }), rect: rectOf(a.side, S) })
}
const k2 = (S = SL) => {
  const v = REAL.map((a) => verdictOf(a, S))
  return v.filter((x) => x.problem === null && x.why === 'corner_person_sem_caixa').length === 5 && v[1].problem === 'person' && v[1].why === 'face_in_rect' && REAL.filter((a, i) => a.cp && v[i].problem === null).length === 5
}
await check('K2 as mesmas 6: as 5 com corner_person=true e o canto VAZIO mantêm a cena ("corner_person_sem_caixa"); só a do rosto DENTRO do retângulo descarta ("face_in_rect")', () => k2())
const k3 = (S = SL) => {
  const r = rectOf('right', S)
  const v = (people, extra = {}) => S.adsV2LockCornerVerdict6({ trusted: true, cornerPerson: true, cornerSurface: true, faces: [], people, rect: r, ...extra })
  const w = r.x1 - r.x0
  const maos = box(0.0, 0.2, r.x0 + w * 0.12, 1) // as mãos da mulher entrando 12% no retângulo
  const raspa = box(0.0, 0.2, r.x0 + w * 0.03, 1) // 3%: a caixa larga de corpo só encosta
  return v([maos]).problem === 'person' && v([maos]).why === 'body_in_rect' && v([raspa]).problem === null && v([raspa]).why === 'corner_person_sem_caixa' &&
    v([maos], { trusted: false }).why === 'untrusted' && v([], { cornerSurface: false }).problem === 'no_surface' && v([], { cornerPerson: false }).why === null && S.ADS_V2_LOCK_BODY_MIN_OVERLAP === 0.05
}
await check('K3 corpo confiável cobrindo ≥ 5% do retângulo (as mãos no canto) descarta ("body_in_rect"); 3% não; conferência não confiável não descarta; sem tampo vazio segue "no_surface"', () => k3())
const k4 = (S = SL) => {
  const dentro = { ...REAL[1], faces: [box(0.1, 0.6, 0.2, 0.7)] } // a MESMA posição, mas redonda: palpite
  const copiado = { ...REAL[1], faces: [box(0.113, 0.52, 0.198, 0.701)] } // y0 = 0,52 (o número da pergunta)
  const repetido = verdictOf(REAL[1], S, [box(0.113, 0.622, 0.198, 0.701)])
  return verdictOf(dentro, S).problem === null && verdictOf(copiado, S).problem === null && repetido.problem === null
}
await check('K4 rosto DENTRO do retângulo, mas redondo, copiado da pergunta ou repetido de outra cena = não corrobora (a cena fica)', () => k4())

// ═══ G. limite global ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG. mais da metade das cenas descartadas = a conferência é que está suspeita')
const g1 = (S = SL) => {
  const s = (thisDiscard, otherDiscards, totalScenes) => S.adsV2LockCheckSuspicious({ thisDiscard, otherDiscards, totalScenes })
  return s(true, 2, 3) && s(true, 1, 3) && !s(true, 0, 3) && !s(true, 0, 1) && s(true, 1, 2) && !s(true, 1, 4) && s(true, 2, 4) && !s(false, 5, 3) && s(true, 2, 0)
}
await check('G1 3 cenas e as 3 descartadas (o 6 de 6) = suspeita; 2 de 3 = suspeita; 1 de 3 não; 1 cena só (1 de 1) não (mínimo 2); 2 de 4 não (metade não é mais da metade); quem não descarta nunca é suspeita', () => g1())
const REC = (S = SL) => REAL.map((a) => S.adsV2LockCheckRecord({ idx: a.idx, try: a.t, check: asCheck(a), discard: true }))
const g2 = (S = SL) => {
  const h = S.adsV2LockHistoryOf(REC(S), 2)
  const lido = REC(S).map((r) => S.adsV2ParseLockCheckRecord(JSON.stringify(r)))
  return h.discardScenes === 2 && h.tops.length === 4 && h.tops.every((t) => t === TOP) && h.faces.length === 5 && h.people.length === 3 &&
    lido.every((r, i) => r && r.idx === REAL[i].idx && r.try === REAL[i].t && r.top_edge_raw === TOP && r.discard === true) && S.adsV2ParseLockCheckRecord('{"v":2,"idx":3}') === null && S.adsV2ParseLockCheckRecord('x') === null &&
    S.adsV2LockCheckTry(null) === 1 && S.adsV2LockCheckTry('lock_dup_retry:corner') === 2 && S.adsV2LockCheckTry('lock_dup_retry') === 2 && S.adsV2LockCheckTry('stuck:shot_stuck') === 1
}
await check('G2 o registro de cada conferência (gravado mesmo descartada) ida e volta; a cena 2 vê as OUTRAS duas cenas (3 e 4, 4 conferências) e não a si mesma; tentativa 1 ou 2 pelo motivo da refação', () => g2())

// ═══ S. servidor REAL ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nS. servidor: base fixa na borda copiada, registro sempre gravado, suspeita mantém a cena')
const fin = (S, extra) => S.adsV2FinishReservedScene({ userId: USER, orderId: ORDER, idx: 2, attempt: 1, lock: LOCK, format: '9:16', sceneUrl: 'https://fal.media/scene.png', side: 'right', previous: null, history: [], totalScenes: 3, tryN: 1, ...extra })
const recOf = (idx, t) => SL.adsV2ParseLockCheckRecord(new TextDecoder().decode(storage.get(pub(`${USER}/adsv2-${ORDER}-p${idx}-a1-check-t${t}.json`)) ?? new Uint8Array()))
const s1 = async (S = SRV) => {
  storage.clear()
  const out = await fin(S, { check: asCheck(REAL[0]) })
  const rec = recOf(2, 1)
  return out.busy === false && out.placement.source === 'reserved' && out.placement.base_source === 'fixed' && out.placement.base === 0.85 && out.placement.top_edge_why === 'copied' &&
    out.rect.y + out.rect.h === 1632 && out.corner === 'corner_person_sem_caixa' && out.trust.trusted === true && out.faces === 1 && rec && rec.discard === false && rec.top_edge_raw === TOP && rec.try === 1 && rec.people.length === 1
}
await check('S1 a 1ª conferência real (corner_person=true, borda 0,637): a cena FICA com o produto no canto, base FIXA (1632 px) porque a borda é "copied"; o registro check-t1 é gravado (discard=false)', () => s1())
const s2 = async (S = SRV) => {
  storage.clear()
  const ok1 = await fin(S, { check: { ...asCheck(REAL[0]), topEdgeY: 0.661 } })
  const rep = await fin(S, { check: { ...asCheck(REAL[0]), topEdgeY: 0.661 }, history: [SL.adsV2LockCheckRecord({ idx: 3, try: 1, check: { ...asCheck(REAL[1]), topEdgeY: 0.661 }, discard: false })] })
  const mesma = await fin(S, { check: { ...asCheck(REAL[0]), topEdgeY: 0.661 }, history: [SL.adsV2LockCheckRecord({ idx: 2, try: 1, check: { ...asCheck(REAL[0]), topEdgeY: 0.661 }, discard: false })] })
  return ok1.placement.base_source === 'tabletop' && ok1.placement.top_edge_why === null && ok1.rect.y + ok1.rect.h === Math.round(0.666 * 1920) &&
    rep.placement.base_source === 'fixed' && rep.placement.top_edge_why === 'repeated' && rep.rect.y + rep.rect.h === 1632 && mesma.placement.base_source === 'tabletop'
}
await check('S2 borda 0,661 (o tampo real de uma cena): base NO tampo; a MESMA borda já dita por OUTRA cena = "repeated", base fixa; o registro da própria cena não conta', () => s2())
const DENTRO = { right: box(0.703, 0.618, 0.787, 0.694), left: box(0.113, 0.622, 0.198, 0.701) }
const s3 = async (S = SRV) => {
  storage.clear(); srvCalls.uploads.length = 0
  const out = await fin(S, { check: { ...asCheck(REAL[0]), faces: [DENTRO.right] } })
  const rec = recOf(2, 1)
  return out.busy === true && out.problem === 'person' && out.corner === 'face_in_rect' && rec && rec.discard === true && !srvCalls.uploads.some((p) => /-lock\.png$/.test(p))
}
await check('S3 rosto CONFIÁVEL dentro do retângulo: a cena é descartada (busy, "face_in_rect"), nada é colado, e o registro diz discard=true', () => s3())
const s4 = async (S = SRV) => {
  storage.clear(); srvCalls.json.length = 0
  const out = await fin(S, { check: { ...asCheck(REAL[0]), faces: [box(0.091, 0.271, 0.177, 0.359)], people: [box(0.62, 0.55, 0.9, 1)], topEdgeY: 0.661 }, history: REC(), tryN: 2 }) // um corpo "confiável" sobre o retângulo inteiro; a borda 0,661 seria aceita
  const side = srvCalls.json.find((j) => /-lock\.json$/.test(j.path))
  return out.busy === false && out.trust.trusted === false && out.trust.why === 'conferencia_suspeita' && out.placement.base_source === 'fixed' && out.placement.top_edge_why === 'conferencia_suspeita' &&
    out.rect.y + out.rect.h === 1632 && out.faces === 0 && side && JSON.parse(side.text).faces.length === 0 && recOf(2, 2) && recOf(2, 2).discard === true && recOf(2, 2).try === 2
}
await check('S4 o 6 de 6: as outras 2 cenas já descartadas e esta também seria = "conferencia_suspeita": a cena FICA, base fixa, nenhum rosto da conferência vai às frases; o registro check-t2 guarda o discard', () => s4())
const s5 = async (S = SRV) => {
  storage.clear()
  await fin(S, { idx: 2, check: asCheck(REAL[2]) })
  await fin(S, { idx: 4, side: 'right', check: { ...asCheck(REAL[0]), faces: [DENTRO.right] } })
  await fin(S, { idx: 4, side: 'right', check: asCheck(REAL[5]), tryN: 2 })
  const got = await S.adsV2ReadLockChecks({ userId: USER, orderId: ORDER, rows: [{ idx: 2, attempt: 1 }, { idx: 4, attempt: 1 }, { idx: 3, attempt: 1 }] })
  const h = SL.adsV2LockHistoryOf(got, 3)
  return got.length === 3 && got.filter((r) => r.idx === 4).length === 2 && h.discardScenes === 1 && h.tops.length === 3
}
await check('S5 o servidor lê de volta os registros das outras cenas (t1 e t2 de cada linha; ausente fica de fora): a cena 3 vê 1 cena descartada (a 4) e 3 bordas', () => s5())

// ═══ A. avanço executado ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nA. avanço executado com as 6 respostas reais do 96788559')
const roda = async (Adv, answers) => {
  reset()
  const fila = { right: answers.filter((a) => a.side === 'right'), left: answers.filter((a) => a.side === 'left') }
  const usadas = { right: 0, left: 0 }
  vision.check = async (u, f, side) => { const l = fila[side]; const a = l[Math.min(usadas[side]++, l.length - 1)]; return asCheck(a) }
  const w = world()
  await w.db.from('ads_v2_shots').upsert(Adv.buildInitialShotRows(ORDER, w.order.tier, w.order.plan))
  await Adv.dispatchAdsV2Shots(w.db, w.order, DL())
  for (let k = 0; k < 4; k++) { await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() }); await Adv.dispatchAdsV2Shots(w.db, w.tables.ads_v2_orders[0], DL()) }
  const ev = (to) => prov.events.filter((e) => e.name === 'ads_v2_shot_fallback' && e.metadata.to === to)
  return { locked: prov.events.filter((e) => e.name === 'ads_v2_product_locked'), retry: ev('scene_retry'), photo: ev('product_photo'), refunds: prov.refunds }
}
const SRV5 = makeLoader(srvStubs, { over: ANTES })(F.server)
const a0 = async () => { const r = await roda(loadAdvance(ANTES, SRV5), REAL); return r.locked.length === 0 && r.photo.length === 3 && r.photo.every((e) => e.metadata.reason === 'lock_corner_busy') && r.retry.length === 3 }
await check('A0 o reteste reproduzido com o código de ANTES: 3 refações e as 3 cenas de gente viram a FOTO da caixa (lock_corner_busy)', () => a0())
const a1 = async (Adv = A) => {
  const r = await roda(Adv, REAL)
  const sides = r.locked.slice().sort((a, b) => a.metadata.idx - b.metadata.idx).map((e) => e.metadata.placement.side)
  return r.locked.length === 3 && r.photo.length === 0 && sides.join() === 'right,left,right' && r.refunds === 0 &&
    r.retry.length === 1 && r.retry[0].metadata.idx === 3 && r.retry[0].metadata.check.corner === 'face_in_rect' &&
    r.locked.every((e) => e.metadata.placement.source === 'reserved' && e.metadata.placement.base_source === 'fixed' && e.metadata.placement.top_edge_why === 'copied' && e.metadata.check.top_edge_raw === TOP && e.metadata.rect.y + e.metadata.rect.h === 1632 && e.metadata.check.corner === 'corner_person_sem_caixa' && typeof e.metadata.check.people === 'number') &&
    [2, 3, 4].every((i) => storage.has(pub(`${USER}/adsv2-${ORDER}-p${i}-a1-check-t1.json`))) && storage.has(pub(`${USER}/adsv2-${ORDER}-p3-a1-check-t2.json`))
}
await check('A1 agora, as MESMAS respostas: as 3 cenas de gente ficam com o produto no canto (direita · esquerda · direita), base fixa (a borda 0,637 é "copied"); só a cena 3 refaz uma vez (o rosto dentro do retângulo); nenhuma foto da caixa; check.corner no evento', () => a1())
const a2 = async (Adv = A) => {
  const tudo = REAL.map((a, i) => { const d = DENTRO[a.side]; return { ...a, faces: [box(d.x0 + 0.003 * i, d.y0 + 0.002 * i, d.x1 + 0.003 * i, d.y1 + 0.002 * i)] } }) // TODA conferência com um rosto confiável (cada um medido, nenhum repetido) dentro do retângulo
  const r = await roda(Adv, tudo)
  return r.photo.length === 0 && r.locked.length === 3 && r.locked.filter((e) => e.metadata.check.why === 'conferencia_suspeita').length >= 2 && r.locked.every((e) => e.metadata.placement.base_source === 'fixed')
}
await check('A2 corroboração em TODA cena (a conferência acusando todas): mais da metade descartada = "conferencia_suspeita"; nenhuma foto da caixa, as cenas ficam na base fixa', () => a2())
globalThis.fetch = realFetch

// ═══ V. desfaz, marca, dinheiro, trava, encadeamento ════════════════════════════════════════════════════════════════════════
console.log('\nV. desfaz, marca, dinheiro, trava ainda "internal", desfaz antigos encadeados')
await check('V1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-ads-fiel-6-1610.mjs), é EXATAMENTE o pai do commit; a ida devolve o vivo; a base do desfaz é esse pai; os novos existem', () =>
  FIEL_6_1610_ARQUIVOS.length === 7 && FIEL_6_1610_ARQUIVOS.every((f) => semFiel6_1610(f, rd(f)) === base(f) && comFiel6_1610(f, base(f)) === rd(f) && !semFiel6_1610(f, rd(f)).includes(MARCA)) &&
  MARCA_FIEL_6_1610 === MARCA && (BASE === 'HEAD' || FIEL_6_1610_BASE === BASE) && FIEL_6_1610_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null))
await check('V2 todo bloco novo nos arquivos de produto (lib/ e app/) traz a marca KINEO-ADS-FIEL-6-1610, e toda linha de código fora de comentário também; só os 4 arquivos da trava', () => {
  const d = diffDoConserto(['-U0', '--no-color'], ['lib', 'app'])
  let arquivo = ''
  let bloco = []
  const semMarca = []
  const fecha = () => { if (bloco.length && !bloco.some((l) => l.includes(MARCA))) semMarca.push(arquivo + ': ' + bloco[0].slice(0, 80)); bloco = [] }
  for (const l of d.split('\n')) {
    if (l.startsWith('+++ ')) { fecha(); arquivo = l.slice(6); continue }
    if (l.startsWith('@@')) { fecha(); continue }
    if (!l.startsWith('+') || l.startsWith('+++')) continue
    bloco.push(l)
    const t = l.slice(1).trim()
    const comentario = t.startsWith('//') || t.startsWith('*') || t.startsWith('/**') || t === '*/'
    if (t && !comentario && !l.includes(MARCA)) semMarca.push(arquivo + ' (linha): ' + l.slice(0, 80))
  }
  fecha()
  if (semMarca.length) console.log('       ' + semMarca.slice(0, 5).join('\n       '))
  const nomes = diffDoConserto(['--name-only'], ['lib', 'app']).split('\n').filter(Boolean)
  return semMarca.length === 0 && d.includes(MARCA) && nomes.length === 4 && nomes.every((n) => [F.advance, F.vision, F.server, F.shotLists].includes(n))
})
await check('V3 dinheiro e acesso intocados: v2Billing, v2Tiers, v2StartCore, /start, débito, estorno, acesso, PNG byte a byte iguais ao pai e fora do diff; a trava não importa crédito', () => {
  const f = ['lib/ads/v2Billing.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'lib/credits/debit.ts', 'lib/credits/refund.ts', 'lib/ads/access.ts', 'lib/ads/serverAccess.ts', F.png]
  const nomes = diffDoConserto(['--name-only']).split('\n')
  const semCobranca = (s) => !/from '@\/lib\/credits\//.test(s) && !/confirmAdsV2Debit|failAdsV2Order|debitCredits|refundCredits/.test(s)
  return f.every((p) => base(p) !== null && rd(p) === base(p) && !nomes.includes(p)) && semCobranca(rd(F.server)) && semCobranca(rd(F.vision)) && !/charged: true/.test(rd(F.advance))
})
await check('V4 a trava continua "internal" (o rollback de 15/10 noite fica): o arquivo vivo traz o modo "internal" uma vez e o módulo devolve "internal"', () => {
  const cru = rd(F.shotLists)
  return SL.ADS_V2_PRODUCT_LOCK_MODE === 'internal' && cru.split("export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'internal' // KINEO-ADS-FIEL-1510 · KINEO-ADS-FIEL-VOLTA-1510").length === 2 && !/ADS_V2_PRODUCT_LOCK_MODE[^\n]*= 'all'/.test(cru)
})
await check('V5 nenhuma string crua de modelo da OpenAI nas linhas novas (o registro central manda)', () => !/^\+.*['"`](gpt-|o[0-9]-|tts-1|whisper-)/m.test(diffDoConserto(['-U0', '--no-color'], ['lib', 'app'])))
await check('V6 os desfaz antigos desfazem esta camada PRIMEIRO (forma tolerante): semFiel5_1510/desfazFiel5_1510 e semVolta1510/desfazVolta1510 (e por eles semFielLiga1510) leem o texto de antes deste conserto', () => {
  const lib = [F.shotLists, F.server, F.advance, F.vision]
  return lib.every((f) => semFiel5_1510(f, rd(f)) === semFiel5_1510(f, sem6(f)) && desfazFiel5_1510(f, rd(f)) === desfazFiel5_1510(f, sem6(f)) && semVolta1510(f, rd(f)) === semVolta1510(f, sem6(f)) && desfazVolta1510(f, rd(f)) === desfazVolta1510(f, sem6(f)) && semFielLiga1510(f, rd(f)) === semFielLiga1510(f, sem6(f)) && !semFielLiga1510(f, rd(f)).includes(MARCA)) &&
    desfazFiel5_1510(F.shotLists, null) === null && desfazVolta1510(F.shotLists, undefined) === undefined &&
    ['scripts/test-support/desfaz-ads-fiel-5-1510.mjs', 'scripts/test-support/desfaz-ads-fiel-volta-1510.mjs'].every((f) => rd(f).includes("import { desfazFiel6_1610 } from './desfaz-ads-fiel-6-1610.mjs'"))
})
await check('V7 o plano do reteste existe: só o T1 (41 cr), dry-run antes, trava "internal" (conta da casa), com os critérios da conferência', () => {
  const p = 'docs/PLANO-VALIDACAO-ADS-FIEL-6-1610.md'
  if (!existsSync(join(ROOT, p))) return false
  const s = rd(p)
  return /Só o T1/.test(s) && /41 cr/.test(s) && /dry-run/i.test(s) && /'internal'/.test(s) && /96788559/.test(s) && /top_edge_why/.test(s) && /corner_person_sem_caixa/.test(s) && /conferencia_suspeita/.test(s) && /0,637/.test(s)
})

// ═══ M. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um tem de ficar VERMELHO)')
const mut = async (nome, fn) => { naoAplicou = null; const verde = await tenta(fn); if (naoAplicou) { ok(false, `M ${nome} — mutante NÃO aplicou (${naoAplicou})`); return } ok(!verde, `M ${nome}`) }
const SLsrc = rd(F.shotLists), SRVsrc = rd(F.server), ADVsrc = rd(F.advance), VISsrc = rd(F.vision)
const slMut = (de, para) => pure({ [F.shotLists]: trocar(SLsrc, de, para) })(F.shotLists)
const comFetch = async (fn) => { globalThis.fetch = fakeFetch; try { return await fn() } finally { globalThis.fetch = realFetch } }
const srvMut = (de, para) => loadSrv({ [F.server]: trocar(SRVsrc, de, para) })
await mut('a pergunta volta a dar o exemplo 0.637', () => p1(slMut('written with three digits after the decimal point, never a rounded default', 'with exactly 3 decimal places (for example 0.637), never a rounded default')))
await mut('a cópia da pergunta deixa de ser checada (borda 0,52 vale)', () => c2(slMut('  if (adsV2LockEchoesQuestion(raw, i.question)) return { ok: false, y: base.y, why: \'copied\' } // KINEO-ADS-FIEL-6-1610', '  // KINEO-ADS-FIEL-6-1610')))
await mut('o eco conhecido 0,637 sai da lista', () => c1(slMut('export const ADS_V2_LOCK_ECHO_NUMBERS: readonly number[] = [0.637]', 'export const ADS_V2_LOCK_ECHO_NUMBERS: readonly number[] = []')))
await mut('a borda repetida entre cenas volta a valer', () => c3(slMut("  if (others.some((n) => sameNum(raw, n))) return { ok: false, y: base.y, why: 'repeated' }", "  if (false) return { ok: false, y: base.y, why: 'repeated' }")))
await mut('caixa copiada da pergunta passa a corroborar', () => k4(slMut('!adsV2LockBoxRound(b) && !adsV2LockBoxEchoes(b, i.question) &&', '!adsV2LockBoxRound(b) &&')))
await mut('"gente no canto" sozinho volta a descartar', () => k2(slMut("  if (i.cornerSurface === false) return { problem: 'no_surface', why: 'no_surface' } // KINEO-ADS-FIEL-6-1610", "  if (i.cornerPerson === true) return { problem: 'person', why: 'face_in_rect' }\n  if (i.cornerSurface === false) return { problem: 'no_surface', why: 'no_surface' } // KINEO-ADS-FIEL-6-1610")))
await mut('o corpo deixa de corroborar (mãos no canto passam)', () => k3(slMut('export const ADS_V2_LOCK_BODY_MIN_OVERLAP = 0.05', 'export const ADS_V2_LOCK_BODY_MIN_OVERLAP = 2')))
await mut('qualquer encostada do corpo descarta (sem o piso de 5%)', () => k3(slMut('export const ADS_V2_LOCK_BODY_MIN_OVERLAP = 0.05', 'export const ADS_V2_LOCK_BODY_MIN_OVERLAP = 0.0001')))
await mut('o limite global some', () => g1(slMut('  return n >= 2 && n * 2 > total // KINEO-ADS-FIEL-6-1610', '  return false // KINEO-ADS-FIEL-6-1610')))
await mut('o limite global perde o mínimo de 2 cenas', () => g1(slMut('  return n >= 2 && n * 2 > total // KINEO-ADS-FIEL-6-1610', '  return n * 2 > total // KINEO-ADS-FIEL-6-1610')))
await mut('o histórico conta a própria cena', () => g2(slMut('!!r && r.idx !== idx)', '!!r)')))
await mut('a visão volta à leitura da Fiel 5 (perde people)', () => p2(pure({ [F.vision]: trocar(VISsrc, 'return adsV2ParseLockCheck6(j?.choices', 'return adsV2ParseLockCheckTop(j?.choices') })(F.vision)))
await mut('o servidor ignora a borda copiada', () => comFetch(() => s1(srvMut('topEdgeY: topVeto ? null : rawTop,', 'topEdgeY: rawTop,'))))
await mut('o servidor volta à regra da Fiel 4 (corner_person sozinho descarta)', () => comFetch(() => s1(srvMut('  if (discard && !suspicious && verdict.problem) return', '  if (args.check && args.check.cornerPerson) return { busy: true, problem: \'person\', trust, corner: null }\n  if (discard && !suspicious && verdict.problem) return'))))
await mut('o servidor não grava o registro da conferência', () => comFetch(() => s1(srvMut("  await uploadJson(`${args.userId}/${name}-check-t${args.tryN === 2 ? 2 : 1}.json`", "  if (false) await uploadJson(`${args.userId}/${name}-check-t${args.tryN === 2 ? 2 : 1}.json`"))))
await mut('o servidor ignora a suspeita', () => comFetch(() => s4(srvMut('  if (discard && !suspicious && verdict.problem) return', '  if (discard && verdict.problem) return'))))
await mut('a conferência suspeita ainda usa a borda/rostos dela', () => comFetch(() => s4(srvMut("  const placed = suspicious ? adsV2ReservedLayoutTop({ sceneW: scene.width, sceneH: scene.height, cutW: cut.width, cutH: cut.height, format: args.format, side: args.side, faces: [], topEdgeY: null, cornerSurface: null, trustedFaces: false }) : at", '  const placed = at'))))
await mut('o servidor não lê o histórico (repetição entre cenas some)', () => comFetch(() => s2(srvMut('  const hist = adsV2LockHistoryOf(args.history ?? [], args.idx)', '  const hist = adsV2LockHistoryOf([], args.idx)'))))
await mut('o avanço não passa o histórico das outras cenas', () => comFetch(() => a2(loadAdvance({ [F.advance]: trocar(ADVsrc, 'check, previous, history, totalScenes: lockSceneCount(order),', 'check, previous, history: [], totalScenes: lockSceneCount(order),') }))))
await mut('o avanço infla o total de cenas travadas (o limite global nunca dispara)', () => comFetch(() => a2(loadAdvance({ [F.advance]: trocar(ADVsrc, '  return shots.filter((s) => adsV2LockOf(order, { idx: s.idx, kind: s.kind })?.mode === \'scene\').length // KINEO-ADS-FIEL-6-1610', '  return 99 // KINEO-ADS-FIEL-6-1610') }))))
await mut('o evento perde check.corner', () => comFetch(() => a1(loadAdvance({ [F.advance]: trocar(ADVsrc, ', corner: out.corner ?? null,', ',') }))))
globalThis.fetch = realFetch

console.log(`\n${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
