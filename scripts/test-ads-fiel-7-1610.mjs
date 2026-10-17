// KINEO-ADS-FIEL-7-1610 — guardião do conserto da BASE e das CAIXAS-CHUTE da trava do produto (Studio Ads v2, reteste pago de 16/10, pedido
// 96fbb38f-9b4a-450e-9567-7ff7cf096389, REPROVADO; fora da TRAVA 8.2). Roda com `node scripts/test-ads-fiel-7-1610.mjs`, sem rede, sem banco,
// sem fornecedor: os módulos são transpilados pelo typescript do repo e rodados com stubs (o mesmo arreio de scripts/test-ads-fiel-6-1610.mjs).
// Números REAIS do 96fbb38f (docs/RESULTADO-VALIDACAO-ADS-FIEL-6-2026-10-16.md e os JSONs '-check-t<n>.json' / '-lock.json' baixados para
// C:\kineo-wt\prints-1610\fiel6-raw\): T1 Comercial 9:16, cenas travadas 2, 3 e 4 (direita · esquerda · direita), cena do Nano Banana
// 1536×2752 (aqui 768×1376, a MESMA proporção: a janela cover leva 0,675 a 0,6764 no quadro), produto 367×507 px no quadro 1080×1920. Ordem
// das conferências (eventos de 11:51–11:52 UTC): cena 3 t1 (borda 0,52; rostos x 0,388–0,469 e 0,569–0,646), cena 2 t1 (0,5; rosto
// 0,388–0,487), cena 4 t1 (0,675; rosto 0,367–0,433), cena 3 t2 (0,5; DUAS caixas idênticas 0,388–0,612 × 0,388–0,612). O registro não
// guarda corner_person/corner_surface: aqui true nos dois (o evento das cenas 2 e 4 diz corner_person=true; borda aceita exige superfície).
// BASE = o pai do PRIMEIRO commit com a marca.
//
// O que prova (1 seção por item da decisão):
//   B  a base é SEMPRE a fixa (85% no 9:16): a cena 4 real (0,675) ia ao "tampo" 0,6814 com o código de antes — reproduzido — e agora pousa
//      na base fixa (1632 px); qualquer borda boa também; a borda lida fica só no registro (top_edge_y no quadro, top_edge_why);
//   R  caixa-chute (pura): duplicada na mesma resposta (0,005), simétrica em torno de 0,5 (0,01), x0/x1 igual ao de OUTRA cena (0,005); as 4
//      respostas reais classificadas; chute não corrobora "gente no canto";
//   C  o que a fiel-6 já fazia continua: eco 0,637 e número da pergunta = copiado, borda repetida, corner_person sem caixa não descarta,
//      limite global;
//   S  servidor REAL na ordem real das 4 conferências: antes = cena 3 descartada 2× e cena 4 no tampo 0,6814; agora = cena 3 fica na 2ª
//      tentativa, cena 4 na base fixa; chute não vai às frases de tela;
//   A  avanço executado (servidor REAL, banco e fornecedores falsos) com as respostas reais: antes = cena 3 vira a foto da caixa e a 4 boia;
//      agora = 3 cenas de gente travadas, todas na base fixa, check.guess no evento;
//   V  desfaz exato + ida + marca em todo bloco + só os 3 arquivos da trava + dinheiro byte a byte + trava ainda 'internal' + encadeamento
//      (fiel-6, fiel-5, rollback, liga tiram a fiel-7 primeiro) + o plano do reteste + o resultado da fiel-6 commitado;
//   M  mutantes (todos aplicados e vermelhos).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semFiel7_1610, comFiel7_1610, desfazFiel7_1610, FIEL_7_1610_ARQUIVOS, FIEL_7_1610_NOVOS, FIEL_7_1610_BASE, MARCA_FIEL_7_1610 } from './test-support/desfaz-ads-fiel-7-1610.mjs'
import { semFiel6_1610, desfazFiel6_1610 } from './test-support/desfaz-ads-fiel-6-1610.mjs'
import { semFiel5_1510, desfazFiel5_1510 } from './test-support/desfaz-ads-fiel-5-1510.mjs'
import { semVolta1510, desfazVolta1510 } from './test-support/desfaz-ads-fiel-volta-1510.mjs'
import { semFielLiga1510 } from './test-support/desfaz-ads-fiel-liga-1510.mjs'
import { semProdutoNaMao1610 } from './test-support/desfaz-ads-produto-na-mao-1610.mjs' // reancorado KINEO-ADS-PRODUTO-NA-MAO-1610 — pessoa segurando o produto real (Comercial, contas internas)
import { semFilmeRapido1710 } from './test-support/desfaz-filme-rapido-1710.mjs' // reancorado KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"]: a entrega mais nova sai antes da comparação com a base
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-ADS-FIEL-7-1610'
const rd = (p) => semProdutoNaMao1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-PRODUTO-NA-MAO-1610 — o produto-na-mão veio depois: este guardião lê o texto SEM ele (semProdutoNaMao1610 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */
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
const cutout = (() => { const w = 400, h = 560, d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (x >= 16 && x < 383 && y >= 20 && y < 527) { d[o] = 220; d[o + 1] = 200; d[o + 2] = 150; d[o + 3] = 255 } } return { width: w, height: h, data: d } })() // o recorte do Atheeri do 96fbb38f: 367×507 depois de aparado (o retângulo dos lock.json)
const sceneImg = (w, h, v = [90, 80, 60]) => { const d = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = v[0]; d[i * 4 + 1] = v[1]; d[i * 4 + 2] = v[2]; d[i * 4 + 3] = 255 } return { width: w, height: h, data: d } }
const px = (img, x, y) => { const o = (y * img.width + x) * 4; return [img.data[o], img.data[o + 1], img.data[o + 2]] }
const storage = new Map()
const srvCalls = { uploads: [], json: [] }
const pub = (path) => `https://sb.co/storage/v1/object/public/renders/${path}`
const cutBytes = PNG.encodePng(cutout, { alpha: true })
const sceneBytes = PNG.encodePng(sceneImg(768, 1376)) // a proporção REAL da cena do Nano Banana no 96fbb38f (1536×2752)
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

// ── os números REAIS do 96fbb38f ─────────────────────────────────────────────────────────────────────────────────────────────
const sem7 = (p) => semFiel7_1610(p, rd(p))
const ANTES = { [F.shotLists]: sem7(F.shotLists), [F.server]: sem7(F.server), [F.advance]: sem7(F.advance) } // o texto de antes deste conserto (a fiel-6)
const SL6 = pure(ANTES)(F.shotLists)
const SRV6 = makeLoader(srvStubs, { over: ANTES })(F.server)
const Q = (side, S = SL) => S.adsV2LockCheckQuestionTop('9:16', side)
const rectOf = (side, S = SL) => { const r = S.adsV2LockReservedRect({ frameW: 1080, frameH: 1920, cutW: TRIM.width, cutH: TRIM.height, format: '9:16', side }); return { x0: r.x / 1080, y0: r.y / 1920, x1: (r.x + r.w) / 1080, y1: (r.y + r.h) / 1920 } }
// as 4 conferências, na ordem dos eventos (p<idx>-a1-check-t<n>.json): borda crua, rostos e corpos como a conferência devolveu
const R = {
  p3t1: { idx: 3, side: 'left', t: 1, top: 0.52, faces: [box(0.388, 0.368, 0.469, 0.487), box(0.569, 0.368, 0.646, 0.487)], people: [box(0.388, 0.368, 0.469, 0.687), box(0.569, 0.368, 0.646, 0.687)] }, // canto esquerdo VAZIO; rostos reais em x ~0,64–0,82
  p2t1: { idx: 2, side: 'right', t: 1, top: 0.5, faces: [box(0.388, 0.308, 0.487, 0.426)], people: [box(0.388, 0.308, 0.487, 0.726)] }, // rosto real em x ~0,23–0,34
  p4t1: { idx: 4, side: 'right', t: 1, top: 0.675, faces: [box(0.367, 0.308, 0.433, 0.392)], people: [box(0.367, 0.308, 0.433, 0.675)] }, // tampo real ~0,715–0,78: a borda 0,675 é ALTA
  p3t2: { idx: 3, side: 'left', t: 2, top: 0.5, faces: [box(0.388, 0.388, 0.612, 0.612), box(0.388, 0.388, 0.612, 0.612)], people: [box(0.388, 0.388, 0.612, 0.812), box(0.388, 0.388, 0.612, 0.812)] }, // DUAS caixas idênticas
}
const ORDEM = [R.p3t1, R.p2t1, R.p4t1, R.p3t2]
const asCheck = (a) => ({ faces: a.faces.map((b) => ({ ...b })), people: a.people.map((b) => ({ ...b })), cornerPerson: true, cornerSurface: true, topEdgeY: a.top })
const recOf = (idx, t) => SL.adsV2ParseLockCheckRecord(new TextDecoder().decode(storage.get(pub(`${USER}/adsv2-${ORDER}-p${idx}-a1-check-t${t}.json`)) ?? new Uint8Array()))
const lockJsonOf = (idx) => { const b = storage.get(pub(`${USER}/adsv2-${ORDER}-p${idx}-a1-lock.json`)); return b ? JSON.parse(new TextDecoder().decode(b)) : null }
const fin = (S, a, extra = {}) => S.adsV2FinishReservedScene({ userId: USER, orderId: ORDER, idx: a.idx, attempt: 1, lock: LOCK, format: '9:16', sceneUrl: 'https://fal.media/scene.png', side: a.side, check: asCheck(a), previous: null, history: [], totalScenes: 3, tryN: a.t, ...extra })

// ═══ B. a base é sempre a fixa ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nB. a base do produto é SEMPRE a fixa (85% no 9:16); a borda lida só no registro')
await check('B0 o arreio reproduz o 96fbb38f: recorte 367×507, retângulo da direita = o do p2-a1-lock.json (0,5 · 0,5859 · 0,8398 · 0,85); a cena 1536×2752 (e a 768×1376 daqui) leva a borda 0,675 a 0,6764 no quadro', () => {
  const r = SL.adsV2LockReservedRect({ frameW: 1080, frameH: 1920, cutW: TRIM.width, cutH: TRIM.height, format: '9:16', side: 'right' })
  const f = (w, h) => PNG.adsV2TopEdgeToFrame(0.675, h, PNG.adsV2CoverWindow(w, h, '9:16').win)
  return TRIM.width === 367 && TRIM.height === 507 && r.x === 540 && r.y === 1125 && r.w === 367 && r.h === 507 && near((r.x + r.w) / 1080, 0.8398, 0.0001) && near(r.y / 1920, 0.5859, 0.0001) &&
    near(f(1536, 2752), 0.6764, 0.0001) && near(f(768, 1376), 0.6764, 0.0001) && SL.ADS_V2_LOCK_RESERVE_BASE['9:16'] === 0.85
})
const b1 = async (S = SRV) => {
  storage.clear()
  const out = await fin(S, R.p4t1)
  const rec = recOf(4, 1)
  return out.busy === false && out.placement.base_source === 'fixed' && out.placement.base === 0.85 && out.rect.y === 1125 && out.rect.y + out.rect.h === 1632 &&
    out.placement.top_edge_y === 0.6764 && out.placement.top_edge_why === 'tampo_desligado' && out.corner === 'corner_person_sem_caixa' && rec && rec.top_edge_raw === 0.675 && rec.discard === false
}
await check('B1 a cena 4 REAL (borda 0,675, que passou em todos os filtros): agora a base é a FIXA — 85%, 1632 px, o retângulo do p2 (y 1125); a borda fica no registro (top_edge_y 0,6764, top_edge_why "tampo_desligado", check-t1 com 0,675)', () => b1())
const b2 = async () => {
  storage.clear()
  const out = await fin(SRV6, R.p4t1)
  return out.busy === false && out.placement.base_source === 'tabletop' && out.placement.base === 0.6814 && out.rect.y + out.rect.h === 1308 && out.rect.y === 801 && out.placement.top_edge_y === 0.6764 && out.placement.top_edge_why === null
}
await check('B2 o reteste reproduzido com o código de ANTES: a mesma cena 4 ia ao "tampo" — base 0,6814 (1308 px), produto de y 0,4172 a 0,6813, como no p4-a1-lock.json: BOIANDO (tampo real ~0,715–0,78)', () => b2())
const b3 = async (S = SRV) => {
  const outs = []
  for (const top of [0.613, 0.661, 0.715, 0.774, 0.812, 0.887]) { storage.clear(); outs.push(await fin(S, { ...R.p4t1, top })) }
  storage.clear()
  const copiada = await fin(S, R.p2t1)
  return outs.every((o) => o.busy === false && o.placement.base_source === 'fixed' && o.placement.base === 0.85 && o.rect.y + o.rect.h === 1632 && o.placement.top_edge_why === 'tampo_desligado') &&
    copiada.placement.base_source === 'fixed' && copiada.placement.top_edge_why === 'copied' && copiada.rect.y + copiada.rect.h === 1632
}
await check('B3 nenhuma borda leva a base ao tampo: 0,613 · 0,661 · 0,715 · 0,774 · 0,812 · 0,887 (todas "boas" pela fiel-6) = base fixa "tampo_desligado"; a 0,5 copiada da cena 2 segue "copied"', () => b3())
const b4 = (S = SL) => {
  const w = (o) => S.adsV2LockTopEdgeWhy7(o)
  return w({ suspicious: true, veto: 'copied', top: { ok: true, why: null } }) === 'conferencia_suspeita' && w({ suspicious: false, veto: 'repeated', top: { ok: true, why: null } }) === 'repeated' &&
    w({ suspicious: false, veto: null, top: { ok: false, why: 'round' } }) === 'round' && w({ suspicious: false, veto: null, top: { ok: false, why: 'no_answer' } }) === 'no_answer' &&
    w({ suspicious: false, veto: null, top: { ok: true, why: null } }) === 'tampo_desligado' && w({ suspicious: false, veto: null, top: { ok: false, why: null } }) === 'tampo_desligado'
}
await check('B4 o porquê da base fixa no registro: suspeita > copiada/repetida > o que a fiel-5/6 recusaria (redonda, sem resposta…) > "tampo_desligado"', () => b4())

// ═══ R. caixa-chute ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nR. caixa-chute: duplicada na resposta, simétrica em torno de 0,5, x de outra cena')
const G = (b, same, others = [], S = SL) => S.adsV2LockBoxGuessWhy(b, { same, others })
const r1 = (S = SL) => {
  const a = box(0.12, 0.3, 0.21, 0.4), quase = box(0.124, 0.303, 0.214, 0.404), longe = box(0.127, 0.3, 0.21, 0.4)
  return G(a, [a, quase], [], S) === 'dup' && G(quase, [a, quase], [], S) === 'dup' && G(a, [a, a], [], S) === 'dup' && G(a, [a, longe], [], S) === null && G(a, [a], [], S) === null && S.ADS_V2_LOCK_GUESS_SAME === 0.005
}
await check('R1 duplicada na MESMA resposta (até 0,005 nas 4 coordenadas) = "dup"; 0,007 de diferença ou caixa sozinha = medida', () => r1())
const r2 = (S = SL) => {
  const g = (b) => G(b, [b], [], S)
  return g(box(0.388, 0.388, 0.612, 0.612)) === 'symmetric' && g(box(0.4, 0.3, 0.609, 0.4)) === 'symmetric' && g(box(0.4, 0.3, 0.612, 0.4)) === null && g(box(0.0, 0.1, 0.995, 0.9)) === 'symmetric' && g(box(0.12, 0.3, 0.21, 0.4)) === null && S.ADS_V2_LOCK_GUESS_SYM === 0.01
}
await check('R2 simétrica em torno de 0,5 (|0,5 − x0| ≈ |x1 − 0,5| até 0,01: 0,388–0,612 e 0,4–0,609) = "symmetric"; 0,4–0,612 (0,012) não', () => r2())
const r3 = (S = SL) => {
  const b = box(0.388, 0.368, 0.469, 0.487)
  return G(b, [b], [box(0.388, 0.308, 0.487, 0.426)], S) === 'x_repeated' && G(b, [b], [box(0.392, 0.1, 0.55, 0.2)], S) === 'x_repeated' && G(b, [b], [box(0.394, 0.1, 0.55, 0.2)], S) === null &&
    G(b, [b], [box(0.1, 0.1, 0.4685, 0.2)], S) === 'x_repeated' && G(b, [b], [box(0.1, 0.1, 0.475, 0.2)], S) === null && G(b, [b], [], S) === null
}
await check('R3 x0 ou x1 igual (até 0,005) ao de uma caixa de OUTRA cena = "x_repeated" (o 0,388 da cena 2 na cena 3); 0,006 de diferença = medida', () => r3())
const othersOf = (...as) => as.flatMap((a) => [...a.faces, ...a.people])
const r4 = (S = SL) => {
  const cls = (a, list, others) => list.map((b) => G(b, list, others, S))
  const t2f = cls(R.p3t2, R.p3t2.faces, othersOf(R.p2t1, R.p4t1)), t2p = cls(R.p3t2, R.p3t2.people, othersOf(R.p2t1, R.p4t1))
  const t1s = cls(R.p3t1, R.p3t1.faces, []), t1h = cls(R.p3t1, R.p3t1.faces, othersOf(R.p2t1))
  return t2f.join() === 'dup,dup' && t2p.join() === 'dup,dup' && G(R.p3t2.faces[0], [R.p3t2.faces[0]], [], S) === 'symmetric' && G(R.p3t2.faces[0], [R.p3t2.faces[0]], othersOf(R.p2t1), S) === 'symmetric' &&
    t1s.join() === ',' && t1h[0] === 'x_repeated' && t1h[1] === null && cls(R.p4t1, R.p4t1.faces, othersOf(R.p3t1, R.p2t1)).join() === '' && cls(R.p2t1, R.p2t1.faces, othersOf(R.p3t1)).join() === 'x_repeated' &&
    S.adsV2LockGuessCount(R.p3t2.faces) === 2 && S.adsV2LockGuessCount(R.p3t2.people) === 2 && S.adsV2LockGuessCount(R.p4t1.faces, othersOf(R.p3t1, R.p2t1)) === 0
}
await check('R4 as 4 respostas reais: a 2ª da cena 3 é chute pelas 3 regras (as duas caixas "dup", sozinha "symmetric", x0 0,388 da cena 2); a 1ª da cena 3 só tem o x0 repetido quando a cena 2 já respondeu; a cena 4 (0,367–0,433) é medida', () => r4())
const verdict = (a, S, reliable) => S.adsV2LockCornerVerdict6({ trusted: true, cornerPerson: true, cornerSurface: true, faces: reliable(a.faces), people: reliable(a.people), rect: rectOf(a.side, S) })
const r5 = (S = SL) => {
  const q = Q('left', S)
  const r6 = (l) => SL6.adsV2LockReliableBoxes(l, { question: q, previous: [] })
  const r7 = (others) => (l) => S.adsV2LockReliableBoxes7(l, { question: q, previous: [], others })
  return verdict(R.p3t2, SL6, r6).why === 'face_in_rect' && verdict(R.p3t1, SL6, r6).why === 'face_in_rect' && // o reteste: a fiel-6 descartava as duas
    verdict(R.p3t2, S, r7(othersOf(R.p2t1, R.p4t1))).problem === null && verdict(R.p3t2, S, r7(othersOf(R.p2t1, R.p4t1))).why === 'corner_person_sem_caixa' && verdict(R.p3t2, S, r7([])).why === 'corner_person_sem_caixa' &&
    verdict(R.p3t1, S, r7(othersOf(R.p2t1))).why === 'corner_person_sem_caixa' && verdict(R.p3t1, S, r7([])).why === 'face_in_rect' &&
    S.adsV2LockReliableBoxes7([box(0.1, 0.6, 0.2, 0.7), box(0.113, 0.52, 0.198, 0.701), box(0.113, 0.622, 0.198, 0.701)], { question: q, previous: [], others: [] }).length === 1 // a fiel-6 continua: redonda e copiada saem
}
await check('R5 chute não corrobora "gente no canto": a 2ª da cena 3 (descartada pela fiel-6) agora FICA ("corner_person_sem_caixa"); a 1ª, sem outra cena para comparar, ainda descarta (refaz 1 vez); as regras da fiel-6 (redonda, copiada) seguem', () => r5())

// ═══ C. o que a fiel-6 já fazia ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. a fiel-6 continua: eco 0,637, copiado/repetido, corner_person sem caixa, limite global')
const c1 = (S = SL) => {
  const t6 = (raw, others, side = 'right') => S.adsV2LockTopEdgeTrust6({ raw, cornerSurface: true, question: Q(side, S), othersTops: others })
  const v = (faces) => S.adsV2LockCornerVerdict6({ trusted: true, cornerPerson: true, cornerSurface: true, faces, people: [], rect: rectOf('right', S) })
  const s = (a, b, c) => S.adsV2LockCheckSuspicious({ thisDiscard: a, otherDiscards: b, totalScenes: c })
  return S.ADS_V2_LOCK_ECHO_NUMBERS.includes(0.637) && t6(0.637).why === 'copied' && t6(0.52, [], 'left').why === 'copied' && t6(0.661, [0.661]).why === 'repeated' && t6(0.661).ok &&
    v([]).problem === null && v([]).why === 'corner_person_sem_caixa' && v([box(0.703, 0.618, 0.787, 0.694)]).why === 'face_in_rect' && s(true, 2, 3) && s(true, 1, 3) && !s(true, 0, 3) && !s(true, 1, 4) && !s(false, 5, 3)
}
await check('C1 eco 0,637 e número da pergunta = "copied"; a mesma borda de outra cena = "repeated"; corner_person=true sem caixa não descarta; rosto medido dentro descarta; limite global igual', () => c1())
const c2 = async (S = SRV) => {
  storage.clear()
  const outra = (idx) => SL.adsV2LockCheckRecord({ idx, try: 1, check: { faces: [box(0.1 + idx / 100, 0.2, 0.2 + idx / 100, 0.3)], people: [], cornerPerson: true, cornerSurface: true, topEdgeY: 0.7 + idx / 1000 }, discard: true })
  const out = await fin(S, { idx: 2, side: 'right', t: 1, top: 0.661, faces: [box(0.703, 0.618, 0.787, 0.694)], people: [] }, { history: [outra(3), outra(4)] })
  return out.busy === false && out.trust.why === 'conferencia_suspeita' && out.placement.base_source === 'fixed' && out.placement.top_edge_why === 'conferencia_suspeita' && out.rect.y + out.rect.h === 1632 && out.faces === 0
}
await check('C2 servidor: as outras 2 cenas já descartadas e esta também seria = "conferencia_suspeita" — a cena fica, base fixa, nenhum rosto da conferência vai às frases', () => c2())

// ═══ S. servidor REAL na ordem real ═══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nS. servidor REAL com as 4 conferências na ordem do 96fbb38f')
const sequencia = async (S) => {
  storage.clear(); srvCalls.json.length = 0
  const outs = {}
  const locked = []
  for (const a of ORDEM) {
    const history = await S.adsV2ReadLockChecks({ userId: USER, orderId: ORDER, rows: [2, 3, 4].filter((i) => i !== a.idx).map((i) => ({ idx: i, attempt: 1 })) })
    const previous = locked.filter((i) => i !== a.idx).map((i) => SL.adsV2ParseLockSeen(JSON.stringify(lockJsonOf(i))))
    const out = await fin(S, a, { history, previous })
    if (!out.busy) locked.push(a.idx)
    outs[`p${a.idx}t${a.t}`] = out
  }
  return outs
}
const s1 = async () => {
  const o = await sequencia(SRV6)
  return o.p3t1.busy === true && o.p3t1.corner === 'face_in_rect' && o.p2t1.busy === false && o.p2t1.placement.base_source === 'fixed' && o.p2t1.placement.top_edge_why === 'copied' &&
    o.p4t1.busy === false && o.p4t1.placement.base_source === 'tabletop' && o.p4t1.rect.y + o.p4t1.rect.h === 1308 && o.p3t2.busy === true && o.p3t2.corner === 'face_in_rect'
}
await check('S1 o reteste reproduzido com o código de ANTES: cena 3 descartada nas 2 tentativas ("face_in_rect" com o canto vazio) e a cena 4 no "tampo" 1308 px (boiando)', () => s1())
const s2 = async (S = SRV) => {
  const o = await sequencia(S)
  const j3 = lockJsonOf(3), j2 = lockJsonOf(2)
  return o.p3t1.busy === true && o.p3t1.corner === 'face_in_rect' && o.p3t1.guess === 0 &&
    o.p2t1.busy === false && o.p2t1.placement.base_source === 'fixed' && o.p2t1.rect.y + o.p2t1.rect.h === 1632 && o.p2t1.guess === 2 && o.p2t1.faces === 0 && j2 && j2.faces.length === 0 &&
    o.p4t1.busy === false && o.p4t1.placement.base_source === 'fixed' && o.p4t1.rect.y + o.p4t1.rect.h === 1632 && o.p4t1.placement.top_edge_y === 0.6764 && o.p4t1.guess === 0 && o.p4t1.faces === 1 &&
    o.p3t2.busy === false && o.p3t2.corner === 'corner_person_sem_caixa' && o.p3t2.placement.side === 'left' && o.p3t2.placement.base_source === 'fixed' && o.p3t2.rect.y + o.p3t2.rect.h === 1632 && o.p3t2.guess === 4 && o.p3t2.faces === 0 && j3 && j3.faces.length === 0 && j3.seen.length === 2 &&
    recOf(3, 2) && recOf(3, 2).discard === false && recOf(3, 1) && recOf(3, 1).discard === true
}
await check('S2 agora, a MESMA ordem: a 1ª da cena 3 ainda refaz (sem outra cena para comparar), a 2ª FICA no canto esquerdo (as 4 caixas são chute); a cena 4 na base fixa (1632 px) com 0,6764 só no registro; chute não vai às frases (lock.json sem rostos)', () => s2())
const s3 = async (S = SRV) => {
  storage.clear()
  await fin(S, R.p2t1)
  const history = await S.adsV2ReadLockChecks({ userId: USER, orderId: ORDER, rows: [{ idx: 2, attempt: 1 }, { idx: 4, attempt: 1 }] })
  const out = await fin(S, R.p3t1, { history })
  return history.length === 1 && out.busy === false && out.corner === 'corner_person_sem_caixa' && out.guess === 2
}
await check('S3 com a cena 2 já conferida (o histórico que a fiel-6 já lê), a 1ª da cena 3 fica: o x0 0,388 repetido torna o rosto e o corpo do canto chute', () => s3())

// ═══ A. avanço executado ══════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nA. avanço executado com as respostas reais do 96fbb38f')
const roda = async (Adv) => {
  reset()
  const fila = { right: [R.p2t1, R.p4t1], left: [R.p3t1, R.p3t2] }
  const usadas = { right: 0, left: 0 }
  vision.check = async (u, f, side) => { const l = fila[side]; const a = l[Math.min(usadas[side]++, l.length - 1)]; return asCheck(a) }
  const w = world()
  await w.db.from('ads_v2_shots').upsert(Adv.buildInitialShotRows(ORDER, w.order.tier, w.order.plan))
  await Adv.dispatchAdsV2Shots(w.db, w.order, DL())
  for (let k = 0; k < 4; k++) { await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() }); await Adv.dispatchAdsV2Shots(w.db, w.tables.ads_v2_orders[0], DL()) }
  const ev = (to) => prov.events.filter((e) => e.name === 'ads_v2_shot_fallback' && e.metadata.to === to)
  return { locked: prov.events.filter((e) => e.name === 'ads_v2_product_locked').sort((a, b) => a.metadata.idx - b.metadata.idx), retry: ev('scene_retry'), photo: ev('product_photo'), refunds: prov.refunds }
}
const a0 = async () => {
  const r = await roda(loadAdvance(ANTES, SRV6))
  const l4 = r.locked.find((e) => e.metadata.idx === 4)
  return r.photo.length === 1 && r.photo[0].metadata.idx === 3 && r.photo[0].metadata.reason === 'lock_corner_busy' && r.locked.length === 2 && l4 && l4.metadata.placement.base_source === 'tabletop' && l4.metadata.rect.y + l4.metadata.rect.h === 1308
}
await check('A0 o reteste reproduzido com o código de ANTES: a cena 3 vira a FOTO da caixa (lock_corner_busy) e a cena 4 vai ao "tampo" 1308 px', () => a0())
const a1 = async (Adv = A) => {
  const r = await roda(Adv)
  const l4 = r.locked.find((e) => e.metadata.idx === 4)
  return r.locked.length === 3 && r.photo.length === 0 && r.refunds === 0 && r.locked.map((e) => e.metadata.placement.side).join() === 'right,left,right' &&
    r.locked.every((e) => e.metadata.placement.source === 'reserved' && e.metadata.placement.base_source === 'fixed' && e.metadata.placement.base === 0.85 && e.metadata.rect.y + e.metadata.rect.h === 1632 && typeof e.metadata.check.guess === 'number') &&
    r.locked.reduce((n, e) => n + e.metadata.check.guess, 0) > 0 && l4.metadata.check.top_edge_raw === 0.675 && l4.metadata.placement.top_edge_y === 0.6764 && l4.metadata.placement.top_edge_why === 'tampo_desligado' && r.retry.length === 0
}
await check('A1 agora, as MESMAS respostas: as 3 cenas de gente travadas (direita · esquerda · direita), todas na base fixa 1632 px; nenhuma foto da caixa e nenhuma refação (a cena 2 confere antes da 3: o x0 0,388 repetido); a borda 0,675 só no evento; check.guess no evento', () => a1())
globalThis.fetch = realFetch

// ═══ V. desfaz, marca, dinheiro, trava, encadeamento ════════════════════════════════════════════════════════════════════════
console.log('\nV. desfaz, marca, dinheiro, trava ainda "internal", desfaz antigos encadeados')
await check('V1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-ads-fiel-7-1610.mjs), é EXATAMENTE o pai do commit; a ida devolve o vivo; a base do desfaz é esse pai; os novos existem', () =>
  FIEL_7_1610_ARQUIVOS.length === 5 && FIEL_7_1610_ARQUIVOS.every((f) => semFiel7_1610(f, rd(f)) === base(f) && comFiel7_1610(f, base(f)) === rd(f) && !semFiel7_1610(f, rd(f)).includes(MARCA)) &&
  MARCA_FIEL_7_1610 === MARCA && (BASE === 'HEAD' || FIEL_7_1610_BASE === BASE) && FIEL_7_1610_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null))
await check('V2 todo bloco novo nos arquivos de produto (lib/ e app/) traz a marca KINEO-ADS-FIEL-7-1610, e toda linha de código fora de comentário também; só os 3 arquivos da trava', () => {
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
  return semMarca.length === 0 && d.includes(MARCA) && nomes.length === 3 && nomes.every((n) => [F.advance, F.server, F.shotLists].includes(n))
})
await check('V3 dinheiro e acesso intocados: v2Billing, v2Tiers, v2StartCore, /start, débito, estorno, acesso, PNG e visão byte a byte iguais ao pai e fora do diff; a trava não importa crédito', () => {
  const f = ['lib/ads/v2Billing.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'lib/credits/debit.ts', 'lib/credits/refund.ts', 'lib/ads/access.ts', 'lib/ads/serverAccess.ts', F.png, F.vision]
  const nomes = diffDoConserto(['--name-only']).split('\n')
  const semCobranca = (s) => !/from '@\/lib\/credits\//.test(s) && !/confirmAdsV2Debit|failAdsV2Order|debitCredits|refundCredits/.test(s)
  return f.every((p) => base(p) !== null && rd(p) === base(p) && !nomes.includes(p)) && semCobranca(rd(F.server)) && !/charged: true/.test(rd(F.advance))
})
await check('V4 a trava continua "internal": o arquivo vivo traz o modo "internal" uma vez e o módulo devolve "internal"', () => {
  const cru = rd(F.shotLists)
  return SL.ADS_V2_PRODUCT_LOCK_MODE === 'internal' && cru.split("export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'internal' // KINEO-ADS-FIEL-1510 · KINEO-ADS-FIEL-VOLTA-1510").length === 2 && !/ADS_V2_PRODUCT_LOCK_MODE[^\n]*= 'all'/.test(cru)
})
await check('V5 nenhuma string crua de modelo da OpenAI nas linhas novas (o registro central manda)', () => !/^\+.*['"`](gpt-|o[0-9]-|tts-1|whisper-)/m.test(diffDoConserto(['-U0', '--no-color'], ['lib', 'app'])))
await check('V6 os desfaz antigos tiram a fiel-7 PRIMEIRO: semFiel6_1610/desfazFiel6_1610 (e por eles a fiel-5, o rollback e o liga) leem o texto de antes deste conserto', () => {
  const lib = [F.shotLists, F.server, F.advance, F.vision]
  return lib.every((f) => semFiel6_1610(f, rd(f)) === semFiel6_1610(f, sem7(f)) && desfazFiel6_1610(f, rd(f)) === desfazFiel6_1610(f, sem7(f)) && semFiel5_1510(f, rd(f)) === semFiel5_1510(f, sem7(f)) &&
    desfazFiel5_1510(f, rd(f)) === desfazFiel5_1510(f, sem7(f)) && semVolta1510(f, rd(f)) === semVolta1510(f, sem7(f)) && desfazVolta1510(f, rd(f)) === desfazVolta1510(f, sem7(f)) &&
    semFielLiga1510(f, rd(f)) === semFielLiga1510(f, sem7(f)) && !semFiel6_1610(f, rd(f)).includes(MARCA) && !desfazFiel5_1510(f, rd(f)).includes(MARCA)) &&
    desfazFiel6_1610(F.shotLists, null) === null && desfazFiel7_1610(F.shotLists, undefined) === undefined && desfazFiel7_1610('lib/x.ts', 'a\r\nb') === 'a\nb' &&
    rd('scripts/test-support/desfaz-ads-fiel-6-1610.mjs').includes("import { desfazFiel7_1610 } from './desfaz-ads-fiel-7-1610.mjs'") && rd('scripts/test-ads-fiel-6-1610.mjs').includes("const rd = (p) => semFiel7_1610(p, readFileSync(join(ROOT, p), 'utf8'))")
})
await check('V7 o plano do reteste existe: só o T1 (41 cr), dry-run antes, trava "internal", com os critérios (3 cenas de gente, produto apoiado sem boiar, nenhum rosto coberto)', () => {
  const p = 'docs/PLANO-VALIDACAO-ADS-FIEL-7-1610.md'
  if (!existsSync(join(ROOT, p))) return false
  const s = rd(p)
  return /Só o T1/.test(s) && /41 cr/.test(s) && /dry-run/i.test(s) && /'internal'/.test(s) && /96fbb38f/.test(s) && /tampo_desligado/.test(s) && /check\.guess/.test(s) && /boiar/i.test(s) && /rosto coberto/i.test(s) && /3 cenas de gente/.test(s)
})
await check('V8 o resultado da fiel-6 (16/10) vai junto: docs/RESULTADO-VALIDACAO-ADS-FIEL-6-2026-10-16.md com o pedido 96fbb38f e o veredito', () => {
  const p = 'docs/RESULTADO-VALIDACAO-ADS-FIEL-6-2026-10-16.md'
  return existsSync(join(ROOT, p)) && /96fbb38f-9b4a-450e-9567-7ff7cf096389/.test(rd(p)) && /REPROVADO/.test(rd(p))
})

// ═══ M. mutantes ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um tem de ficar VERMELHO)')
const mut = async (nome, fn) => { naoAplicou = null; const verde = await tenta(fn); if (naoAplicou) { ok(false, `M ${nome} — mutante NÃO aplicou (${naoAplicou})`); return } ok(!verde, `M ${nome}`) }
const SLsrc = rd(F.shotLists), SRVsrc = rd(F.server), ADVsrc = rd(F.advance)
const slMut = (de, para) => pure({ [F.shotLists]: trocar(SLsrc, de, para) })(F.shotLists)
const comFetch = async (fn) => { globalThis.fetch = fakeFetch; try { return await fn() } finally { globalThis.fetch = realFetch } }
const srvMut = (de, para) => loadSrv({ [F.server]: trocar(SRVsrc, de, para) })
const srvSlMut = (de, para) => makeLoader(srvStubs, { over: { [F.shotLists]: trocar(SLsrc, de, para) } })(F.server)
await mut('o servidor volta a pôr a base no tampo lido', () => comFetch(() => b1(srvMut('faces: faces6, topEdgeY: null,', 'faces: faces6, topEdgeY: topVeto ? null : rawTop,'))))
await mut('o servidor perde a borda no registro (top_edge_y)', () => comFetch(() => b1(srvMut('top_edge_y: top6.y,', 'top_edge_y: null,'))))
await mut('o porquê da base fixa deixa de dizer "tampo_desligado"', () => b4(slMut("  return i.top.ok ? 'tampo_desligado' : i.top.why ?? 'tampo_desligado'", "  return i.top.ok ? 'tabletop' : i.top.why ?? 'tampo_desligado'")))
await mut('a duplicada na mesma resposta deixa de ser chute', () => r1(slMut("  if (same.filter(twin).length >= 2) return 'dup'", "  if (false) return 'dup'")))
await mut('a tolerância de "a mesma caixa" encolhe para 0,001', () => r1(slMut('export const ADS_V2_LOCK_GUESS_SAME = 0.005', 'export const ADS_V2_LOCK_GUESS_SAME = 0.001')))
await mut('uma caixa sozinha conta como duplicada (compara consigo)', () => r1(slMut("  if (same.filter(twin).length >= 2) return 'dup'", "  if (same.filter(twin).length >= 1) return 'dup'")))
await mut('a simetria em torno de 0,5 deixa de ser chute', () => r2(slMut("ADS_V2_LOCK_GUESS_SYM)) return 'symmetric'", "ADS_V2_LOCK_GUESS_SYM) && false) return 'symmetric'")))
await mut('a tolerância da simetria dobra (0,02)', () => r2(slMut('export const ADS_V2_LOCK_GUESS_SYM = 0.01', 'export const ADS_V2_LOCK_GUESS_SYM = 0.02')))
await mut('o x repetido de outra cena deixa de ser chute', () => r3(slMut("ADS_V2_LOCK_GUESS_SAME))) return 'x_repeated'", "ADS_V2_LOCK_GUESS_SAME)) && false) return 'x_repeated'")))
await mut('o x repetido só olha o x0', () => r3(slMut('near7(o.x0, b.x0, ADS_V2_LOCK_GUESS_SAME) || near7(o.x1, b.x1, ADS_V2_LOCK_GUESS_SAME)', 'near7(o.x0, b.x0, ADS_V2_LOCK_GUESS_SAME)')))
await mut('as caixas confiáveis deixam de tirar o chute', () => r5(slMut('.filter((b) => adsV2LockBoxGuessWhy(b, { same: list, others: i.others }) === null) // KINEO-ADS-FIEL-7-1610', '.filter(() => true) // KINEO-ADS-FIEL-7-1610')))
await mut('as caixas confiáveis perdem as regras da fiel-6 (redonda/copiada voltam)', () => r5(slMut('return adsV2LockReliableBoxes(list, { question: i.question, previous: i.previous }).filter(', 'return list.filter(')))
await mut('o servidor volta às caixas da fiel-6 (chute descarta a cena 3)', () => comFetch(() => s2(srvSlMut('.filter((b) => adsV2LockBoxGuessWhy(b, { same: list, others: i.others }) === null) // KINEO-ADS-FIEL-7-1610', '.filter(() => true) // KINEO-ADS-FIEL-7-1610'))))
await mut('o servidor não compara com as outras cenas (x repetido some)', () => comFetch(() => s3(srvMut('  const others7 = [...prevFaces.flat(), ...hist.people]', '  const others7: AdsV2Box[] = []'))))
await mut('o rosto chutado volta às frases de tela', () => comFetch(() => s2(srvMut('const faces = trustOut.trusted ? placed.faces : []', 'const faces = trustOut.trusted ? (args.check ? args.check.faces : []) : []'))))
await mut('o servidor deixa de contar o chute (guess)', () => comFetch(() => s2(srvMut('  const guess = adsV2LockGuessCount(', '  const guess = 0 * adsV2LockGuessCount('))))
await mut('o evento perde check.guess', () => comFetch(() => a1(loadAdvance({ [F.advance]: trocar(ADVsrc, ", guess: typeof out.guess === 'number' ? out.guess : null }", ' }') }))))
await mut('o avanço não passa o histórico das outras cenas', () => comFetch(() => a1(loadAdvance({ [F.advance]: trocar(ADVsrc, 'check, previous, history, totalScenes: lockSceneCount(order),', 'check, previous: [], history: [], totalScenes: lockSceneCount(order),') }))))
await mut('o eco 0,637 sai da lista (a fiel-6 perde o copiado)', () => c1(slMut('export const ADS_V2_LOCK_ECHO_NUMBERS: readonly number[] = [0.637]', 'export const ADS_V2_LOCK_ECHO_NUMBERS: readonly number[] = []')))
await mut('o limite global some', () => comFetch(() => c2(srvSlMut('  return n >= 2 && n * 2 > total // KINEO-ADS-FIEL-6-1610', '  return false // KINEO-ADS-FIEL-6-1610'))))
globalThis.fetch = realFetch

console.log(`\n${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
