// KINEO-ADS-FIEL-1510 — guardião do "Ads perfeito para agência" (fundador 15/10, Studio Ads v2; fora da TRAVA 8.2 —
// docs/ESPEC-ANUNCIO-V2-2026-09-28.md §7). Roda com `node scripts/test-ads-fiel-1510.mjs`, sem rede, sem banco, sem fornecedor:
// os módulos são transpilados pelo typescript do repo e rodados com stubs (banco falso com UPDATE condicional de verdade).
// BASE = 285ac112 (a origin/main de onde o 1º commit com a marca nasceu) — nunca a árvore contra origin/main.
//
// O que prova:
//   T trava do produto (pura): qual foto real entra em cada plano (cena de produto, "pessoa segurando", ator), o pedido do Nano
//     Banana com o ESBOÇO como 1ª referência, o movimento com o produto parado e o retângulo na mesma caixa em qualquer quadro;
//   P PNG sem dependência nova: ida e volta, recorte que não é produto recusado, o QUADRO TRAVADO tem os pixels do recorte REAL
//     (diferença 0 no miolo do produto) e o esboço põe o produto no MESMO lugar (frações iguais) nos 3 formatos;
//   S o lado servidor (recorte birefnet UMA vez por foto + cache, esboço, quadro '-lock.png', interruptor só p/ contas da casa);
//   A o avanço EXECUTADO: cena de produto sai com o esboço + PNG, volta travada, o Kling recebe o quadro travado e o movimento com o
//     produto parado; trava desligada / sem produto = o pedido de antes, byte a byte; recorte que falha = a FOTO REAL do produto
//     (nunca a cena redesenhada); ator que falha = o caminho de antes; "pessoa segurando" (desligado) usa a trava quando ligado;
//     o /start (60 s) não manda cena com trava;
//   D prazo de ~8 min: régua de antes cedo; tarde = foto parada (sem cobrar, sem estorno, evento ads_v2_shot_fallback); vídeo
//     preso vai direto à reserva H3; passados 6,5 min os planos atrasados viram foto parada só se TODOS couberem no teto de 2
//     (o job abandonado é cancelado); esgotado e teto gasto = o terminal de sempre (1 estorno); o ator desiste em 10 min;
//     prazo curto por tentativa (3,5 min) que NÃO vale para o ator; dinheiro (v2Billing, v2Tiers, v2StartCore, /start) intocado;
//   C copy e pronúncia: o aviso honesto dos estilos nas 16 línguas no fim do `hint`; a VOZ recebe a grafia fonética e a tela, o
//     cartão e o roteiro salvo ficam com o nome real (anúncio inteiro montado no código);
//   V o desfaz (scripts/test-support/desfaz-ads-fiel-1510.mjs) devolve cada arquivo tocado EXATAMENTE à base, cada trecho com a marca;
//   M mutantes (todos aplicados e vermelhos).
import { readFileSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semFiel1510, FIEL_1510_ARQUIVOS, FIEL_1510_NOVOS, BASE_FIEL_1510, MARCA_FIEL_1510 } from './test-support/desfaz-ads-fiel-1510.mjs'
import { semClareza1610 } from './test-support/desfaz-checkout-clareza-1610.mjs' // reancorado KINEO-CHECKOUT-CLAREZA-1610
import { semAfiliadoPorPost1610 } from './test-support/desfaz-afiliado-por-post-1610.mjs' // reancorado KINEO-AFILIADO-POR-POST-1610 — o nome reservado affiliate_signup_attribution_result (app/api/events/route.ts) sai antes de todos, byte a byte
import { semFiel2_1510 } from './test-support/desfaz-ads-fiel-2-1510.mjs' // reancorado KINEO-ADS-FIEL-2-1510 — o conserto mais novo do Ads sai PRIMEIRO, em memória
import { semFiel3_1510 } from './test-support/desfaz-ads-fiel-3-1510.mjs' // reancorado KINEO-ADS-FIEL-3-1510 — o conserto mais novo do Ads sai PRIMEIRO, em memória
import { semFiel4_1510 } from './test-support/desfaz-ads-fiel-4-1510.mjs' // reancorado KINEO-ADS-FIEL-4-1510 — o conserto mais novo do Ads (canto reservado da trava) sai PRIMEIRO, em memória
import { semAfiliadoDestino1610 } from './test-support/desfaz-afiliado-destino-1610.mjs' // reancorado KINEO-AFILIADO-DESTINO-1610 — o conserto mais novo (link de afiliado) sai antes de todos

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-ADS-FIEL-1510'
const BASE = '285ac112a0be9f96182ec922cb06c4896b5357b1'
const rd = (p) => semFiel2_1510(p, semAfiliadoDestino1610(p, semAfiliadoPorPost1610(p, semClareza1610(p, semFiel3_1510(p, semFiel4_1510(p, readFileSync(join(ROOT, p), 'utf8'))))))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-AFILIADO-DESTINO-1610 — o nome reservado affiliate_link_clicked (app/api/events/route.ts) sai antes de todos /* reancorado KINEO-CHECKOUT-CLAREZA-1610 (união na leva 2) · reancorado KINEO-AFILIADO-POR-POST-1610 (união na leva 2) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória · reancorado KINEO-LEVA3-1510 (união na leva 3) */ /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 })
const base = (p) => git('show', `${BASE}:${p}`).replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const tenta = async (fn) => { try { return !!(await fn()) } catch { return false } }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 80)); const out = src.split(de).join(para); if (out === src || !out.includes(para)) throw new Error('mutante não aplicou'); return out }

const F = {
  advance: 'lib/ads/v2Advance.ts', shotLists: 'lib/ads/v2ShotLists.ts', png: 'lib/ads/v2Png.ts', server: 'lib/ads/v2ProductLockServer.ts',
  engines: 'lib/ads/v2Engines.ts', images: 'lib/ads/v2Images.ts', styles: 'lib/ads/v2Styles.ts', tiers: 'lib/ads/v2Tiers.ts', holds: 'lib/ads/v2PresenterHolds.ts',
  presenter: 'lib/ads/v2Presenter.ts', pronounce: 'lib/ads/v2Pronounce.ts', events: 'lib/ads/events.ts', sink: 'app/api/events/route.ts',
}

// ── carregador: transpila TS → CJS (no MESMO reino do Node: rápido), resolve '@/' com stubs; `over` = fonte mutante ─────────
const REAIS = ['lib/ads/v2Engines.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2ShotLists.ts', 'lib/ads/adV2Montage.ts', 'lib/ads/v2Music.ts', 'lib/ads/v2Variations.ts', 'lib/ads/sample.ts', 'lib/ads/v2Presenter.ts', 'lib/ads/v2Pronounce.ts', 'lib/ads/v2PresenterHolds.ts', 'lib/ads/v2FreeRedo.ts', 'lib/ads/v2Png.ts', 'lib/ads/v2Styles.ts', 'lib/ads/access.ts', 'lib/internalAccounts.ts', 'lib/ads/offer.ts', 'lib/ads/events.ts']
function makeLoader(stubs, opts = {}) {
  const cache = new Map()
  const real = new Set([...REAIS, ...(opts.real ?? [])])
  const over = opts.over ?? {}
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const text = Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel)
    const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
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
    const timers = opts.timers ?? { setTimeout, clearTimeout }
    new Function('exports', 'require', 'module', 'setTimeout', 'clearTimeout', js)(module.exports, req, module, timers.setTimeout, timers.clearTimeout)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
const fastTimers = { setTimeout: (fn) => setImmediate(fn), clearTimeout: (h) => clearImmediate(h) }

// ── banco falso com UPDATE condicional de verdade (o mesmo contrato do guardião do servidor) ────────────────────────────
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
      if (ctx.name === 'videos' && row.render_id && t.some((x) => x.render_id === row.render_id)) return { data: null, error: { code: '23505', message: 'dup render' } }
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

// ═══ módulos puros ═══════════════════════════════════════════════════════════════════════════════════════════════════
const pure = (over = {}) => makeLoader({}, { over })
const SL = pure()(F.shotLists)
const PNG = pure()(F.png)
const E = pure()(F.engines)
const T = pure()(F.tiers)
const HOLDS = pure()(F.holds)
const PR = pure()(F.presenter)
const PRON = pure()(F.pronounce)

const PH = 'https://x.supabase.co/storage/v1/object/public/user-footage/u/'
const U = (n) => `${String(n).padStart(8, '0')}-2222-4333-8444-555555555555`
const ORDER = U(1)
const USER = U(9)

console.log('\nT. trava do produto (pura)')
const PHOTOS = [{ footage_id: 'f-prod', kind: 'product', url: `${PH}prod.jpg` }, { footage_id: 'f-place', kind: 'place', url: `${PH}place.jpg` }]
const sceneShot = { source: 'generated_scene', referenceFootageIds: ['f-place', 'f-prod'], referenceUrls: [`${PH}place.jpg`, `${PH}prod.jpg`] }
await check('T1 cena criada de produto (setor loja, ou pedido de produto) trava a foto PRODUTO; restaurante, pedido "lugar" (setor nulo), foto do cliente e cena sem foto de produto = null', () => {
  const a = SL.adsV2ProductLockFor({ shot: sceneShot, photos: PHOTOS, productOrder: false, sector: 'store' })
  const b = SL.adsV2ProductLockFor({ shot: sceneShot, photos: PHOTOS, productOrder: true, sector: 'salon' })
  return a && a.mode === 'scene' && a.footageId === 'f-prod' && a.url === `${PH}prod.jpg` && b && b.mode === 'scene' &&
    SL.adsV2ProductLockFor({ shot: sceneShot, photos: PHOTOS, productOrder: false, sector: 'restaurant' }) === null &&
    SL.adsV2ProductLockFor({ shot: sceneShot, photos: PHOTOS, productOrder: false, sector: null }) === null &&
    SL.adsV2ProductLockFor({ shot: { ...sceneShot, source: 'client_photo' }, photos: PHOTOS, productOrder: true, sector: 'store' }) === null &&
    SL.adsV2ProductLockFor({ shot: { ...sceneShot, referenceFootageIds: ['f-place'] }, photos: PHOTOS, productOrder: true, sector: 'store' }) === null
})
await check('T2 "pessoa segurando o produto" trava a 2ª referência (o produto; a 1ª é o retrato); o ator trava a foto do produto dele', () => {
  const h = SL.adsV2ProductLockFor({ shot: { ...sceneShot, presenterHolds: true, referenceFootageIds: ['f-prod'], referenceUrls: ['https://www.usekineo.com/ads/presenters/ana.webp', `${PH}prod.jpg`] }, photos: PHOTOS, productOrder: false, sector: 'restaurant' })
  const a = SL.adsV2ProductLockFor({ shot: null, photos: PHOTOS, productOrder: false, sector: 'restaurant', actor: { productFootageId: 'f-prod', productUrl: `${PH}prod.jpg` } })
  return h && h.mode === 'holds' && h.url === `${PH}prod.jpg` && a && a.mode === 'actor' && a.footageId === 'f-prod'
})
await check('T3 pedido do Nano Banana: o ESBOÇO é a 1ª referência (linha na frente, o pedido de sempre inteiro depois); no "segurando" FIRST/SECOND andam uma casa', () => {
  const p = 'Photorealistic vertical 9:16 frame from a product commercial. A person picking up the product from the photos.'
  const s = SL.adsV2ProductLockScenePrompt(p, 'scene')
  const hp = HOLDS.adsV2PresenterHoldsScenePrompt({ look: 'a woman in her 30s', pronoun: 'She' }, 'store')
  const h = SL.adsV2ProductLockScenePrompt(hp, 'holds')
  return s.startsWith('The FIRST attached image is the layout of this frame') && s.endsWith(p) && /completely unchanged: same shape, colors, label, text and proportions/.test(s) &&
    /the person from the SECOND reference photo/.test(h) && /holds the product from the THIRD reference photo/.test(h) && !/FIRST reference photo/.test(h.replace('The FIRST attached image', ''))
})
await check('T4 movimento com trava: o produto PARADO, termina em "Keep everything exactly as in the photo." e cabe no Kling O3 (≤ 2500)', () => {
  const ms = [SL.adsV2ProductLockMotion('scene', 0), SL.adsV2ProductLockMotion('scene', 1), SL.adsV2ProductLockMotion('holds', 0), SL.adsV2ProductLockMotion('actor', 3)]
  return ms.every((m) => m.endsWith(SL.ADS_V2_KEEP_PHRASE) && /product (stays still|keeps exactly)/.test(m) && m.length <= E.ADS_V2_PROMPT_MAX_CHARS && E.buildShotInput('kling_o3', { imageUrl: `${PH}a.png`, prompt: m }).prompt === m) && ms[0] !== ms[1]
})
await check('T5 retângulo do produto: dentro da caixa, proporção do recorte, base no fundo da caixa, MESMAS frações em 720×1280 e 1080×1920', () => {
  const a = SL.adsV2ProductLockRect(720, 1280, 160, 460, 'scene')
  const b = SL.adsV2ProductLockRect(1080, 1920, 160, 460, 'scene')
  const box = SL.ADS_V2_PRODUCT_LOCK_BOX.scene
  const dentro = (r, W, H) => r.x >= box.x0 * W - 1 && r.x + r.w <= box.x1 * W + 1 && r.y >= box.y0 * H - 1 && Math.abs(r.y + r.h - box.y1 * H) <= 1
  return dentro(a, 720, 1280) && dentro(b, 1080, 1920) && Math.abs(a.w / a.h - 160 / 460) < 0.01 && Math.abs(a.x / 720 - b.x / 1080) < 0.003 && Math.abs(a.h / 1280 - b.h / 1920) < 0.003
})

console.log('\nP. PNG (sem dependência nova)')
const cutout = (() => { const w = 400, h = 600, d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (x >= 120 && x < 280 && y >= 100 && y < 560) { d[o] = 200; d[o + 1] = (x * 3) & 255; d[o + 2] = (y * 2) & 255; d[o + 3] = 255 } else if (x >= 118 && x < 282 && y >= 98 && y < 562) { d[o] = 200; d[o + 1] = 10; d[o + 2] = 10; d[o + 3] = 120 } } return { width: w, height: h, data: d } })()
const scene = (w, h) => { const d = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = 30; d[i * 4 + 1] = (i / w) & 255; d[i * 4 + 2] = 90; d[i * 4 + 3] = 255 } return { width: w, height: h, data: d } }
const pngOk = async (P = PNG) => {
  const enc = P.encodePng(cutout, { alpha: true })
  const dec = P.decodePng(enc)
  const rgb = P.decodePng(P.encodePng(scene(64, 96)))
  let interlaced = false
  try { const x = new Uint8Array(enc); x[8 + 8 + 12] = 1; P.decodePng(x) } catch (e) { interlaced = /png_bad_crc|png_interlaced/.test(e.message) }
  return Buffer.compare(Buffer.from(dec.data), Buffer.from(cutout.data)) === 0 && rgb.width === 64 && rgb.data[3] === 255 && rgb.data[0] === 30 && interlaced
}
await check('P1 PNG ida e volta (RGBA e RGB) byte a byte; PNG adulterado/entrelaçado = recusa (o chamador cai na foto real)', () => pngOk())
await check('P2 recorte que não é produto: vazio, ou a foto inteira (sem fundo removido) = recusa; o recorte bom é aparado ao contorno', () => {
  const empty = { width: 50, height: 50, data: new Uint8Array(50 * 50 * 4) }
  const full = { width: 50, height: 50, data: new Uint8Array(50 * 50 * 4).fill(255) }
  const t = PNG.trimCutout(cutout)
  let e1 = '', e2 = ''
  try { PNG.trimCutout(empty) } catch (e) { e1 = e.message }
  try { PNG.trimCutout(full) } catch (e) { e2 = e.message }
  return e1 === 'cutout_empty' && /^cutout_not_a_product/.test(e2) && t.width === 164 && t.height === 464
})
const lockedOk = (P = PNG) => {
  const trimmed = P.trimCutout(cutout)
  return SL.ADS_V2_FORMATS.every((fmt) => {
    const out = P.adsV2LockedFramePng(scene(1536, 2752), trimmed, fmt, 'scene')
    const fr = P.decodePng(out.png)
    const crop = SL.ADS_V2_FORMAT_CROP[fmt]
    const r = out.rect
    const piece = P.resampleRgba(trimmed, r.w, r.h)
    let diff = 0
    for (let y = 4; y < r.h - 4; y += 5) for (let x = 4; x < r.w - 4; x += 5) { const a = ((r.y + y) * fr.width + (r.x + x)) * 4, b = (y * r.w + x) * 4; if (piece.data[b + 3] === 255) diff = Math.max(diff, Math.abs(fr.data[a] - piece.data[b]), Math.abs(fr.data[a + 1] - piece.data[b + 1]), Math.abs(fr.data[a + 2] - piece.data[b + 2])) }
    const fora = fr.data[((r.y - 20) * fr.width + 10) * 4] === 30 && fr.data[((r.y - 20) * fr.width + 10) * 4 + 2] === 90
    const lay = P.decodePng(P.adsV2LayoutPng(trimmed, fmt, 'scene'))
    const lr = SL.adsV2ProductLockRect(lay.width, lay.height, trimmed.width, trimmed.height, 'scene')
    const mesmoLugar = Math.abs(lr.x / lay.width - r.x / fr.width) < 0.004 && Math.abs((lr.y + lr.h) / lay.height - (r.y + r.h) / fr.height) < 0.004 && Math.abs(lr.h / lay.height - r.h / fr.height) < 0.004
    const cinza = lay.data[0] === P.ADS_V2_LAYOUT_GREY && lay.data[1] === P.ADS_V2_LAYOUT_GREY
    return fr.width === crop.width && fr.height === crop.height && diff === 0 && fora && mesmoLugar && cinza && Math.abs(lay.width / lay.height - crop.width / crop.height) < 0.01
  })
}
await check('P3 QUADRO TRAVADO nos 3 formatos: tamanho do formato; miolo do produto = pixels do recorte REAL (diferença 0); fora dele, a cena; o ESBOÇO (cinza) põe o produto no MESMO lugar', () => lockedOk())

console.log('\nS. lado servidor da trava (recorte, cache, esboço, quadro, interruptor)')
const storage = new Map()
const srvCalls = { fal: [], uploads: [], cancel: [] }
let falOut = 'https://fal.media/cut.png'
let authEmail = 'josephsskaf@gmail.com'
let authThrows = false
const sceneBytes = PNG.encodePng(scene(300, 533))
const cutBytes = PNG.encodePng(cutout, { alpha: true })
const pub = (path) => `https://sb.co/storage/v1/object/public/renders/${path}`
const srvStubs = {
  '@fal-ai/client': { fal: { config() {}, subscribe: async (model, opts) => { srvCalls.fal.push({ model, input: opts.input }); return { data: { image: { url: falOut } } } }, queue: { cancel: async (m, o) => { srvCalls.cancel.push([m, o.requestId]) } } } },
  '@/lib/userFootage': { footageAdminClient: () => ({
    storage: { from: () => ({ upload: async (path, buf) => { storage.set(pub(path), new Uint8Array(buf)); srvCalls.uploads.push(path); return { error: null } }, getPublicUrl: (path) => ({ data: { publicUrl: pub(path) } }) }) },
    auth: { admin: { getUserById: async () => { if (authThrows) throw new Error('auth down'); return { data: { user: { email: authEmail } } } } } },
  }) },
  '@/lib/ads/v2Shots': { adsV2ShotRenderId: (o, i, a) => `adsv2-${o}-p${i}-a${a}` },
}
const realFetch = globalThis.fetch
globalThis.fetch = async (url) => {
  const u = String(url)
  const body = storage.get(u) ?? (u === 'https://fal.media/cut.png' ? cutBytes : u === 'https://fal.media/scene.png' ? sceneBytes : u === 'https://fal.media/scene.jpg' ? new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]) : null)
  return body ? new Response(body, { status: 200 }) : new Response('no', { status: 404 })
}
process.env.FAL_KEY = 'test-key'
const SRV = makeLoader(srvStubs)(F.server)
const LOCK = { footageId: 'f-prod', url: `${PH}prod.jpg`, mode: 'scene' }
await check('S1 interruptor: modo "internal" liga só para a lista EXATA da casa; outra conta, ou o auth fora do ar = desligado', async () => {
  const casa = await SRV.adsV2ProductLockEnabled(USER)
  authEmail = 'cliente@exemplo.com'; const cliente = await SRV.adsV2ProductLockEnabled(USER)
  authThrows = true; const fora = await SRV.adsV2ProductLockEnabled(USER); authThrows = false; authEmail = 'josephsskaf@gmail.com'
  return SL.ADS_V2_PRODUCT_LOCK_MODE === 'internal' && casa === true && cliente === false && fora === false
})
await check('S2 recorte: fal-ai/birefnet/v2 em PNG UMA vez por foto (cache no bucket por foto); a 2ª cena da mesma foto não chama a fal', async () => {
  srvCalls.fal.length = 0
  const a = await SRV.adsV2PrepareLockedScene({ userId: USER, orderId: ORDER, idx: 2, attempt: 1, lock: LOCK, format: '9:16' })
  const b = await SRV.adsV2PrepareLockedScene({ userId: USER, orderId: ORDER, idx: 3, attempt: 1, lock: LOCK, format: '9:16' })
  const f = srvCalls.fal[0]
  return srvCalls.fal.length === 1 && f.model === 'fal-ai/birefnet/v2' && f.input.image_url === LOCK.url && f.input.output_format === 'png' &&
    srvCalls.uploads.includes(SL.adsV2CutoutPath(USER, 'f-prod')) && a.endsWith(`adsv2-${ORDER}-p2-a1-layout.png`) && b.endsWith(`adsv2-${ORDER}-p3-a1-layout.png`) && PNG.isPng(storage.get(a))
})
await check('S3 quadro travado: a cena PNG do Nano Banana + o recorte real → "<pedido>-p<i>-a<n>-lock.png" (reconhecido por adsV2IsLockedImage); cena que não é PNG = recusa', async () => {
  const out = await SRV.adsV2FinishLockedScene({ userId: USER, orderId: ORDER, idx: 2, attempt: 1, lock: LOCK, format: '9:16', sceneUrl: 'https://fal.media/scene.png' })
  const fr = PNG.decodePng(storage.get(out.url))
  let jpg = ''
  try { await SRV.adsV2FinishLockedScene({ userId: USER, orderId: ORDER, idx: 2, attempt: 1, lock: LOCK, format: '9:16', sceneUrl: 'https://fal.media/scene.jpg' }) } catch (e) { jpg = e.message }
  return SL.adsV2IsLockedImage(out.url) && fr.width === 1080 && fr.height === 1920 && out.rect.w > 0 && jpg === 'scene_not_png' && !SL.adsV2IsLockedImage(`${PH}prod.jpg`)
})
await check('S4 recorte que a fal não devolve (ou vazio) LANÇA — nunca segue com a cena redesenhada', async () => {
  falOut = 'https://fal.media/nada.png'
  let e = ''
  try { await SRV.adsV2PrepareLockedScene({ userId: USER, orderId: ORDER, idx: 4, attempt: 1, lock: { ...LOCK, footageId: 'f-outra' }, format: '9:16' }) } catch (x) { e = x.message }
  falOut = 'https://fal.media/cut.png'
  return e === 'cutout_download'
})

// ═══ A. avanço EXECUTADO ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nA. avanço executado (banco falso, fornecedores falsos)')
const prov = { submits: [], images: [], tts: [], cm: [], events: [], fails: [], refunds: 0, persisted: [] }
const lockSrv = { enabled: true, failPrepare: false, failFinish: false, prepare: [], finish: [], cancel: [] }
const lockStub = {
  adsV2ProductLockEnabled: async () => lockSrv.enabled,
  adsV2PrepareLockedScene: async (a) => { lockSrv.prepare.push(a); if (lockSrv.failPrepare) throw new Error('cutout_provider'); return `https://sb/renders/${a.userId}/adsv2-${a.orderId}-p${a.idx}-a${a.attempt}-layout.png` },
  adsV2FinishLockedScene: async (a) => { lockSrv.finish.push(a); if (lockSrv.failFinish) throw new Error('scene_not_png'); return { url: `https://sb/renders/${a.userId}/adsv2-${a.orderId}-p${a.idx}-a${a.attempt}-lock.png`, rect: { x: 1, y: 2, w: 3, h: 4 } } },
  adsV2CancelFalJob: async (m, id) => { lockSrv.cancel.push([m, id]) },
}
let pollImpl = async () => ({ state: 'processing', url: null })
let cmPoll = async () => ({ status: 'rendering', url: null })
let curTables = null
class CreatomateSubmitError extends Error { constructor(m, amb) { super(m); this.ambiguous = amb } }
const SH = makeLoader({ '@fal-ai/client': { fal: {} }, '@/lib/falQueue': { FalQueueSubmitError: class extends Error {}, submitFalQueueOnce: async () => 'x' }, '@/lib/cinematic/sceneDisposition': { classifyProviderFailure: () => ({ disposition: 'rejected', reason_class: 'unknown' }) }, '@/lib/renderAssets': { persistRenderAssets: async () => ({}) }, '@/lib/mp4Duration': { probeMp4DurationSeconds: () => 3 }, '@/lib/falAlert': { alertFalExhausted: async () => {}, falErrorText: () => '', looksExhausted: () => false } })('lib/ads/v2Shots.ts')
const advStubs = (withLock) => ({
  '@/lib/compose': {
    CreatomateSubmitError,
    estimateMp3DurationSeconds: () => 9.5,
    pollCreatomateRender: async (id) => cmPoll(id),
    submitCreatomateRender: async (src) => { prov.cm.push(src); return 'cm-1' },
    uploadVoiceoverToSupabase: async () => 'https://sb/voiceovers/v.mp3',
  },
  '@/lib/lyriaMusic': { getLyriaMusicUrl: async () => null },
  '@/lib/pixabayMusic': { getBackgroundMusicUrl: async () => 'https://sb/music/m.mp3' },
  '@/lib/ttsFallback': { synthesizeTtsFallback: async (text) => { prov.tts.push(text); return Buffer.alloc(2000) }, synthesizeElevenVoice: async (text) => { prov.tts.push(text); return Buffer.alloc(2000) } },
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
  '@/lib/ads/v2Shots': { ...SH, ADS_V2_KLING_GAP_MS: 0, submitShotOnce: async (model, input) => { prov.submits.push({ model, input }); return { kind: 'accepted', requestId: `req-${prov.submits.length}`, posts: 1 } }, pollFalJob: (...a) => pollImpl(...a), persistShotClip: async (a) => ({ storedUrl: `https://sb/renders/${SH.adsV2ShotRenderId(a.orderId, a.idx, a.attempt)}.mp4`, measuredSeconds: 3.04 }) },
  '@/lib/ads/v2Images': {
    persistAudioCopy: async () => null,
    persistSceneImage: async (a) => { prov.persisted.push(a); return `https://sb/renders/${a.orderId}-p${a.idx}-scene.jpg` },
    pollSceneImage: async () => ({ state: 'done', url: 'https://fal.media/img.png' }),
    submitSceneImage: async (sc) => { prov.images.push(sc); return { kind: 'accepted', requestId: `img-${prov.images.length}`, posts: 1 } },
  },
  ...(withLock ? { '@/lib/ads/v2ProductLockServer': lockStub } : {}),
})
const loadAdvance = (over = {}, withLock = true) => makeLoader(advStubs(withLock), { timers: fastTimers, over })(F.advance)
const A = loadAdvance()
const reset = () => { for (const k of ['submits', 'images', 'tts', 'cm', 'events', 'fails', 'persisted']) prov[k].length = 0; prov.refunds = 0; lockSrv.enabled = true; lockSrv.failPrepare = false; lockSrv.failFinish = false; lockSrv.prepare.length = 0; lockSrv.finish.length = 0; lockSrv.cancel.length = 0; pollImpl = async () => ({ state: 'processing', url: null }); cmPoll = async () => ({ status: 'rendering', url: null }) }
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const MIN = 60_000
const SPHOTOS = [{ id: 'f-prod', url: `${PH}prod.jpg`, kind: 'product' }, { id: 'f-place', url: `${PH}place.jpg`, kind: 'place' }]
function world({ sector = 'store', tier = 'commercial', brief = { business: 'Lume — perfume', kind: 'product' }, startedAgo = 30_000, plan: planIn = null, narration = 'Lume brings a warm amber scent to every evening.', overlays = [{ role: 'brand', start: 0.3, end: 3, text: 'Lume' }] } = {}) {
  const plan = planIn ?? SL.planShots({ sector, tier, photos: SPHOTOS, seconds: 15 })
  const stored = { ...plan, overlays, narration }
  const order = {
    id: ORDER, user_id: USER, status: 'generating', tier, seconds: 15, sector, brief, language: 'en', narration: true, card_url: 'https://sb/card.png',
    photos: SPHOTOS.map((p) => ({ footage_id: p.id, kind: p.kind, url: p.url })), plan: stored, music_url: null, voice_url: null, voice_seconds: null,
    billing_ref: `adsv2-${ORDER}-g`, credits_charged: 41, generation_id: U(2), creatomate_render_id: null, video_id: null, error: null,
    started_at: ago(startedAgo), assembly_lease_at: null, assembly_submit_at: null, parent_order_id: null, retake_idx: null, created_at: ago(startedAgo), updated_at: ago(startedAgo),
  }
  const tables = { ads_v2_orders: [order], ads_v2_shots: [], videos: [] }
  curTables = tables
  return { db: fakeDb(tables), tables, order, plan }
}
const seed = async (w, Adv = A) => { await w.db.from('ads_v2_shots').upsert(Adv.buildInitialShotRows(ORDER, w.order.tier, w.order.plan)) }
const latestOf = (tables, idx) => tables.ads_v2_shots.filter((r) => r.idx === idx).sort((a, b) => b.attempt - a.attempt)[0]
const scenesOf = (tables) => [...new Set(tables.ads_v2_shots.filter((r) => r.source === 'generated_scene').map((r) => r.idx))]
const DL = () => Date.now() + 60_000

const a1 = async (Adv = A) => {
  reset()
  const w = world()
  await seed(w, Adv)
  await Adv.dispatchAdsV2Shots(w.db, w.order, DL())
  const scenes = scenesOf(w.tables)
  const locked = prov.images.filter((s) => s.referenceUrls[0].endsWith('-layout.png'))
  return scenes.length === 3 && locked.length === 3 && locked.every((s) => s.outputFormat === 'png' && s.prompt.startsWith('The FIRST attached image is the layout') && s.referenceUrls.slice(1).join() === `${PH}place.jpg,${PH}prod.jpg`) &&
    lockSrv.prepare.every((p) => p.lock.footageId === 'f-prod' && p.lock.mode === 'scene' && p.format === '9:16')
}
await check('A1 cena de PRODUTO (loja, Comercial): o Nano Banana recebe o ESBOÇO como 1ª referência + as fotos de sempre, o pedido com a linha do esboço e saída PNG', () => a1())
const a2 = async (Adv = A) => {
  reset()
  const w = world()
  await seed(w, Adv)
  await Adv.dispatchAdsV2Shots(w.db, w.order, DL())
  await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  const sc = scenesOf(w.tables).map((i) => latestOf(w.tables, i))
  const kling = prov.submits.filter((s) => s.model === T.ADS_V2_KLING_O3_I2V_SLUG && /-lock\.png$/.test(s.input.image_url))
  return sc.every((r) => SL.adsV2IsLockedImage(r.image_url) && (r.status === 'submitted' || r.status === 'image_done')) && prov.persisted.length === 0 &&
    kling.length === 3 && kling.every((k) => k.input.prompt === SL.adsV2ProductLockMotion('scene', w.tables.ads_v2_shots.find((r) => r.image_url === k.input.image_url).movement_variant)) &&
    prov.events.filter((e) => e.name === 'ads_v2_product_locked').length === 3 && lockSrv.finish.every((f) => f.sceneUrl === 'https://fal.media/img.png')
}
await check('A2 a cena volta, o recorte REAL é colado (quadro "-lock.png"), o Kling O3 anima ESSE quadro com o movimento de produto parado; evento ads_v2_product_locked', () => a2())
const semTrava = async (w, Adv) => { await seed(w, Adv); await Adv.dispatchAdsV2Shots(w.db, w.order, DL()); await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() }); return JSON.stringify({ img: prov.images, vid: prov.submits.map((s) => s.input) }) }
await check('A3 sem trava = o pedido de ANTES, byte a byte: trava desligada para a conta, restaurante, e sem o lado servidor (import falhou) dão os MESMOS envios', async () => {
  reset(); lockSrv.enabled = false
  const off = await semTrava(world(), A)
  const offPersist = prov.persisted.length
  reset()
  const noSrv = await semTrava(world(), loadAdvance({}, false))
  reset()
  const rest = await semTrava(world({ sector: 'restaurant', brief: { business: 'Bella' } }), A)
  const restLock = lockSrv.prepare.length
  return off === noSrv && !off.includes('layout.png') && !off.includes('"outputFormat"') && offPersist === 3 && !rest.includes('layout.png') && restLock === 0
})
const a4 = async (Adv = A) => {
  reset(); lockSrv.failPrepare = true
  const w = world()
  await seed(w, Adv)
  await Adv.dispatchAdsV2Shots(w.db, w.order, DL())
  const sc = scenesOf(w.tables).map((i) => latestOf(w.tables, i))
  await Adv.dispatchAdsV2Shots(w.db, { ...w.order }, DL())
  const vids = prov.submits.filter((s) => s.input.image_url === `${PH}prod.jpg`)
  const productMoves = [0, 1, 2].map((v) => SL.motionPrompt('product', v))
  return prov.images.length === 0 && sc.every((r) => r.status === 'submitted' && r.image_url === `${PH}prod.jpg` && r.source === 'generated_scene') &&
    prov.events.filter((e) => e.name === 'ads_v2_shot_fallback' && e.metadata.to === 'product_photo' && /^lock_prepare:cutout_provider/.test(e.metadata.reason) && e.metadata.charged === false).length === 3 &&
    vids.length >= 3 && vids.every((v) => productMoves.includes(v.input.prompt))
}
await check('A4 recorte/esboço que FALHA: nenhuma cena redesenhada sai — o plano anima a FOTO REAL do produto (movimento de produto) e grava ads_v2_shot_fallback', () => a4())
const a5 = async (Adv = A) => {
  reset(); lockSrv.failFinish = true
  const w = world()
  await seed(w, Adv)
  await Adv.dispatchAdsV2Shots(w.db, w.order, DL())
  await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  const sc = scenesOf(w.tables).map((i) => latestOf(w.tables, i))
  return sc.every((r) => r.image_url === `${PH}prod.jpg`) && prov.persisted.length === 0 && prov.events.some((e) => e.name === 'ads_v2_shot_fallback' && e.metadata.to === 'product_photo' && /^lock_finish:/.test(e.metadata.reason))
}
await check('A5 colagem que FALHA depois da cena pronta: a cena (com o produto redesenhado) é descartada; vale a foto real do produto', () => a5())
await check('A6 ATOR (precisa do rosto): recorte que falha volta ao caminho de antes (foto do ator com a foto do produto de referência), nunca a foto do produto no lugar do rosto', async () => {
  reset(); lockSrv.failPrepare = true
  const plan = SL.planShots({ sector: 'store', tier: 'photo_motion', photos: SPHOTOS, seconds: 15 })
  const presenter = PR.planAdsV2Presenter({ sector: 'store', photos: SPHOTOS.map((p) => ({ footage_id: p.id, kind: p.kind, url: p.url })), seedKey: ORDER, presenterId: null })
  const w = world({ tier: 'photo_motion', plan: { ...plan, presenter } })
  w.order.plan.presenter = presenter
  await seed(w)
  await A.dispatchAdsV2Shots(w.db, w.order, DL())
  const actorImg = prov.images.find((s) => s.prompt === presenter.actorPrompt)
  const row = w.tables.ads_v2_shots.find((r) => r.kind === 'presenter')
  return !!presenter && actorImg && actorImg.referenceUrls.join() === presenter.productUrl && row.status === 'image_submitted' && lockSrv.prepare.some((p) => p.lock.mode === 'actor') && prov.events.some((e) => e.name === 'ads_v2_shot_fallback' && e.metadata.to === 'unlocked')
})
await check('A7 "pessoa de IA segurando o produto" (ADS_V2_PRESENTER_HOLDS segue false): LIGADO, a cena dela sai travada — esboço + retrato + produto, SECOND/THIRD no pedido', async () => {
  reset()
  const plan = SL.planShots({ sector: 'store', tier: 'commercial', photos: SPHOTOS, seconds: 15 })
  const entry = PR.adsV2PresenterById ? PR.adsV2PresenterById(PR.ADS_V2_PRESENTER_LIBRARY?.[0]?.id) : null
  const actor = { productFootageId: 'f-prod', productUrl: `${PH}prod.jpg`, presenterId: entry?.id }
  const shots = HOLDS.adsV2PresenterHoldsShots(plan.shots, { on: true, actor, entry, sector: 'store' })
  const h = shots.find((s) => s.presenterHolds)
  const w = world({ plan: { ...plan, shots } })
  await seed(w)
  await A.dispatchAdsV2Shots(w.db, w.order, DL())
  const sent = prov.images.find((s) => s.referenceUrls.includes(h.referenceUrls[0]))
  return HOLDS.ADS_V2_PRESENTER_HOLDS === false && !!h && sent && sent.referenceUrls.length === 3 && sent.referenceUrls[0].endsWith('-layout.png') && sent.referenceUrls[1] === h.referenceUrls[0] && sent.referenceUrls[2] === `${PH}prod.jpg` &&
    /SECOND reference photo/.test(sent.prompt) && /THIRD reference photo/.test(sent.prompt) && lockSrv.prepare.some((p) => p.lock.mode === 'holds' && p.idx === h.idx)
})
await check('A8 /start (60 s, fôlego < 45 s) NÃO manda cena com trava (fica para a tela/cron); os outros planos saem como sempre', async () => {
  reset()
  const w = world()
  await seed(w)
  await A.dispatchAdsV2Shots(w.db, w.order, Date.now() + 30_000)
  const sc = scenesOf(w.tables).map((i) => latestOf(w.tables, i))
  return prov.images.length === 0 && sc.every((r) => r.status === 'pending' && !r.image_submit_claimed_at) && prov.submits.length === w.tables.ads_v2_shots.filter((r) => r.source === 'client_photo' && r.kind !== 'text').length
})

// ═══ D. prazo ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. prazo de ~8 min por anúncio (sem cobrar duas vezes)')
const route = (a) => T.routeShot('people', 'photo_motion', a)
await check('D1 régua pura: cedo = a de antes (2ª no principal); 3,5 min = ainda cabe o principal; 5 min = foto parada; preso = direto à reserva H3 se couber; teto gasto/sem foto = a de antes; esgotado = terminal', () => {
  const st = (o) => SL.adsV2FallbackStep({ nextAttempt: 2, maxAttempts: 3, fallbackFrom: 3, elapsedMs: 0, needsImage: false, stillsUsed: 0, canStill: true, route, ...o })
  const j = (x) => JSON.stringify(x)
  return j(st({})) === j({ step: 'retry', attempt: 2, skipped: false }) && j(st({ elapsedMs: 3.5 * MIN })) === j({ step: 'retry', attempt: 2, skipped: false }) &&
    j(st({ elapsedMs: 5 * MIN })) === j({ step: 'still' }) && j(st({ elapsedMs: 3.5 * MIN, skipPrincipal: true })) === j({ step: 'retry', attempt: 3, skipped: true }) &&
    j(st({ elapsedMs: 5 * MIN, stillsUsed: 2 })) === j({ step: 'retry', attempt: 2, skipped: false }) && j(st({ elapsedMs: 5 * MIN, canStill: false })) === j({ step: 'retry', attempt: 2, skipped: false }) &&
    j(st({ nextAttempt: 4, stillsUsed: 2 })) === j({ step: 'terminal' }) && j(st({ nextAttempt: 4 })) === j({ step: 'still' }) && j(st({ elapsedMs: 4.6 * MIN, needsImage: true })) === j({ step: 'still' })
})
const failFirst = async (startedAgo, patch = {}) => {
  reset()
  const w = world({ sector: 'restaurant', tier: 'photo_motion', brief: { business: 'Bella' }, startedAgo })
  await seed(w)
  const ai = w.tables.ads_v2_shots.find((r) => r.kind !== 'text')
  Object.assign(ai, { status: 'failed', reason: 'provider_failed', reason_class: 'unknown', engine: 'kling_o3', submitted_at: ago(MIN) }, patch)
  for (const r of w.tables.ads_v2_shots.filter((x) => x !== ai && x.kind !== 'text')) Object.assign(r, { status: 'submitted', request_id: `r-${r.idx}`, submitted_at: ago(30_000), submit_claimed_at: ago(30_000) })
  await A.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  return { w, ai, next: latestOf(w.tables, ai.idx) }
}
await check('D2 falha CEDO (1 min): a régua de antes — 2ª tentativa no Kling O3, sem cobrar, SEM evento de troca de caminho', async () => {
  const { next } = await failFirst(MIN)
  return next.attempt === 2 && next.engine === 'kling_o3' && prov.events.some((e) => e.name === 'ads_v2_shot_retried' && e.metadata.charged === false) && !prov.events.some((e) => e.name === 'ads_v2_shot_fallback') && prov.refunds === 0
})
const d3 = async () => {
  const { w, ai, next } = await failFirst(5 * MIN)
  return next.attempt === 2 && next.kind === 'text' && next.status === 'skipped_text' && next.engine === null && next.stored_url === ai.image_url && /^still_fallback:failed:provider_failed/.test(next.reason) &&
    w.tables.ads_v2_orders[0].status === 'generating' && prov.refunds === 0 && !prov.submits.some((s) => s.input.image_url === ai.image_url) &&
    prov.events.some((e) => e.name === 'ads_v2_shot_fallback' && e.metadata.to === 'still' && e.metadata.charged === false && e.metadata.elapsed_s >= 299)
}
await check('D3 falha TARDE (5 min): a vaga vira a FOTO REAL parada (zoom do montador, sem fal) — pedido segue, nenhum estorno, nenhum débito novo; evento ads_v2_shot_fallback "still"', () => d3())
await check('D4 vídeo PRESO no principal aos 3,5 min: vai DIRETO à reserva H3 (pula a 2ª no principal), evento "time_budget"; a fila abandonada é cancelada', async () => {
  reset()
  const w = world({ sector: 'restaurant', tier: 'photo_motion', brief: { business: 'Bella' }, startedAgo: 3.6 * MIN })
  await seed(w)
  const ai = w.tables.ads_v2_shots.find((r) => r.kind !== 'text')
  Object.assign(ai, { status: 'submitted', request_id: 'req-slow', engine: 'kling_o3', submitted_at: ago(3.55 * MIN), submit_claimed_at: ago(3.55 * MIN) })
  for (const r of w.tables.ads_v2_shots.filter((x) => x !== ai && x.kind !== 'text')) Object.assign(r, { status: 'submitted', request_id: `r-${r.idx}`, submitted_at: ago(30_000), submit_claimed_at: ago(30_000) })
  await A.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  await new Promise((r) => setImmediate(r))
  const next = latestOf(w.tables, ai.idx)
  return next.attempt === 3 && next.engine === 'h3' && prov.events.some((e) => e.name === 'ads_v2_shot_fallback' && e.metadata.to === 'h3' && e.metadata.reason === 'time_budget') &&
    lockSrv.cancel.some(([m, id]) => m === T.ADS_V2_KLING_O3_I2V_SLUG && id === 'req-slow') && w.tables.ads_v2_shots.filter((r) => r.idx !== ai.idx && r.kind !== 'text').every((r) => r.status === 'submitted')
})
const d5 = async (Adv = A, working = 2) => {
  reset()
  const w = world({ sector: 'restaurant', tier: 'photo_motion', brief: { business: 'Bella' }, startedAgo: 7 * MIN })
  await seed(w, Adv)
  const ai = w.tables.ads_v2_shots.filter((r) => r.kind !== 'text')
  ai.forEach((r, i) => Object.assign(r, i < working ? { status: 'submitted', request_id: `slow-${r.idx}`, engine: 'kling_o3', submitted_at: ago(MIN), submit_claimed_at: ago(MIN) } : { status: 'done', stored_url: `https://sb/c${r.idx}.mp4`, measured_seconds: 3.04 }))
  await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  await new Promise((r) => setImmediate(r))
  const slow = ai.slice(0, working).map((r) => latestOf(w.tables, r.idx))
  return { w, slow, stills: slow.filter((r) => r.kind === 'text' && /^still_fallback:overdue:submitted/.test(r.reason)).length }
}
await check('D5 passados 6,5 min: 2 planos atrasados viram foto parada (os jobs da fila são cancelados) e o anúncio vai à montagem; 3 atrasados = ninguém vira (espera, como antes)', async () => {
  const two = await d5(A, 2)
  const twoOk = two.stills === 2 && lockSrv.cancel.length === 2 && two.w.tables.ads_v2_orders[0].status === 'assembling' && prov.refunds === 0
  const three = await d5(A, 3)
  return twoOk && three.stills === 0 && three.slow.every((r) => r.status === 'submitted') && three.w.tables.ads_v2_orders[0].status === 'generating'
})
await check('D6 esgotado (3ª falhou) com o teto de fotos paradas GASTO: o terminal de sempre ("shot_N_exhausted"), UM estorno mesmo com tela e cron juntos', async () => {
  reset()
  const w = world({ sector: 'restaurant', tier: 'photo_motion', brief: { business: 'Bella' } })
  await seed(w)
  const ai = w.tables.ads_v2_shots.filter((r) => r.kind !== 'text')
  w.tables.ads_v2_shots.push({ ...ai[0], id: 'a3', attempt: 3, engine: 'h3', status: 'failed', reason: 'provider_failed', reason_class: 'unknown' })
  for (const r of ai.slice(1, 3)) w.tables.ads_v2_shots.push({ ...r, id: `st-${r.idx}`, attempt: 2, kind: 'text', engine: null, status: 'skipped_text', stored_url: r.image_url, reason: 'still_fallback:x' })
  await Promise.all([A.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() }), A.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })])
  return w.tables.ads_v2_orders[0].status === 'failed' && /^shot_\d+_exhausted:provider_failed/.test(w.tables.ads_v2_orders[0].error) && prov.refunds === 1 && !w.tables.ads_v2_shots.some((r) => r.idx === ai[0].idx && r.attempt === 4)
})
const d7 = async (Adv = A) => {
  reset()
  const w = world({ sector: 'restaurant', tier: 'photo_motion', brief: { business: 'Bella' }, startedAgo: 4.5 * MIN })
  await seed(w, Adv)
  const ai = w.tables.ads_v2_shots.filter((r) => r.kind !== 'text')
  Object.assign(ai[0], { status: 'submitted', request_id: 'old', engine: 'kling_o3', submitted_at: ago(4 * MIN), submit_claimed_at: ago(4 * MIN) })
  for (const r of ai.slice(1)) Object.assign(r, { status: 'submitted', request_id: `r-${r.idx}`, engine: 'kling_o3', submitted_at: ago(2 * MIN), submit_claimed_at: ago(2 * MIN) })
  await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  const a0 = w.tables.ads_v2_shots.find((r) => r.idx === ai[0].idx && r.attempt === 1)
  return a0.status === 'stuck' && latestOf(w.tables, ai[0].idx).kind === 'text' && ai.slice(1).every((r) => latestOf(w.tables, r.idx).status === 'submitted')
}
await check('D7 prazo curto POR TENTATIVA: vídeo aceito há 4 min vira "stuck" (era 20 min) e, aos 4,5 min do pedido, foto parada; os de 2 min seguem esperando', () => d7())
await check('D8 o ATOR não usa o prazo curto (vídeo falado é lento: 20 min por tentativa) e desiste aos 10 min do pedido (era 45): o anúncio sai sem ele', async () => {
  reset()
  const plan = SL.planShots({ sector: 'store', tier: 'photo_motion', photos: SPHOTOS, seconds: 15 })
  const presenter = PR.planAdsV2Presenter({ sector: 'store', photos: SPHOTOS.map((p) => ({ footage_id: p.id, kind: p.kind, url: p.url })), seedKey: ORDER, presenterId: null })
  const mk = async (startedAgo, submittedAgo) => {
    const w = world({ tier: 'photo_motion', plan: { ...plan, presenter }, startedAgo })
    w.order.plan.presenter = presenter
    await seed(w)
    const row = w.tables.ads_v2_shots.find((r) => r.kind === 'presenter')
    Object.assign(row, { status: 'submitted', image_url: `${PH}actor.jpg`, request_id: 'av', engine: 'kling_avatar', submitted_at: ago(submittedAgo), submit_claimed_at: ago(submittedAgo) })
    w.order.voice_url = 'https://sb/v.mp3'; w.order.voice_seconds = 9.5
    for (const r of w.tables.ads_v2_shots.filter((x) => x.kind !== 'text' && x.kind !== 'presenter')) Object.assign(r, { status: 'submitted', request_id: `r-${r.idx}`, submitted_at: ago(30_000), submit_claimed_at: ago(30_000) })
    await A.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
    return w.tables.ads_v2_shots.find((r) => r.kind === 'presenter' && r.attempt === 1)
  }
  const cedo = await mk(6 * MIN, 5 * MIN)
  const tarde = await mk(11 * MIN, 5 * MIN)
  return cedo.status === 'submitted' && tarde.status === 'failed' && tarde.reason === 'presenter_deadline' && PR.ADS_V2_PRESENTER_GIVEUP_MS === 45 * MIN && SL.ADS_V2_PRESENTER_BUDGET_MS === 10 * MIN
})
await check('D9 dinheiro intocado: v2Billing, v2Tiers, v2StartCore, /start, /retake e /variations byte a byte iguais à base; nenhum deles no diff do ajuste', () => {
  const money = ['lib/ads/v2Billing.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/retake/route.ts', 'app/api/ads/v2/variations/route.ts']
  const diff = git('diff', '--name-only', BASE, 'HEAD').split('\n')
  return money.every((f) => rd(f) === base(f) && !diff.includes(f))
})
await check('D10 os 2 eventos novos (ads_v2_shot_fallback, ads_v2_product_locked) estão na lista fechada, são só-servidor e estão no SERVER_ONLY_EVENTS do sink', () => {
  const EV = pure()(F.events)
  const sink = (rd(F.sink).match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\]\)/) || ['', ''])[1]
  const nomes = [...rd(F.advance).matchAll(/name: '([a-z0-9_]+)'/g)].map((m) => m[1])
  return ['ads_v2_shot_fallback', 'ads_v2_product_locked'].every((n) => EV.isAdsEvent(n) && EV.ADS_SERVER_ONLY_EVENTS.includes(n) && sink.includes(`'${n}'`) && nomes.includes(n)) && nomes.every((n) => EV.isAdsEvent(n))
})

// ═══ C. copy e pronúncia ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. aviso honesto dos estilos e pronúncia da marca')
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const copyOk = (ST) => LANGS.every((l) => { const f = ST.ADS_V2_STYLE_FIDELITY[l]; const c = ST.ADS_V2_STYLE_COPY[l]; return typeof f === 'string' && f.length > 20 && (l === 'en' || f !== ST.ADS_V2_STYLE_FIDELITY.en) && c.fidelity === f && c.hint.endsWith(` ${f}`) && c.hint.length > f.length + 10 }) &&
  new Set(LANGS.map((l) => ST.ADS_V2_STYLE_FIDELITY[l])).size === 16 && /reinterpret/i.test(ST.ADS_V2_STYLE_FIDELITY.en) && /real photo closes the ad/.test(ST.ADS_V2_STYLE_FIDELITY.en)
await check('C1 estilos com efeito: o aviso "reinterpretam o produto — a foto real fecha o anúncio" nas 16 línguas (nenhuma copiada do inglês), no fim da linha de baixo do título da escolha', () => copyOk(pure()(F.styles)))
await check('C2 a foto real fecha mesmo com estilo: no plano de produto com estilo, há packshot (foto real, sem IA) e o efeito fica em OUTRO plano', () => {
  const fotos = [{ id: 'f-prod', url: `${PH}prod.jpg`, kind: 'product' }]
  return ['photo_motion', 'commercial', 'cinema'].every((tier) => {
    const p = SL.planShots({ sector: 'store', tier, photos: fotos, seconds: 15, style: 'giant_product' })
    const s = SL.adsV2PackshotShots(p.shots, { photos: fotos, productOrder: true })
    const fx = s.find((x) => x.effect)
    const ps = s.find((x) => x.packshot)
    return fx && ps && ps.idx !== fx.idx && ps.imageUrl === `${PH}prod.jpg` && ps.kind === 'text'
  })
})
await check('C3 pronúncia (unidade): a VOZ recebe a grafia fonética em toda ocorrência (maiúscula não importa, palavra inteira); sem pronúncia = o texto igual', () => {
  const p = PRON.sanitizeAdsV2Pronounce({ word: 'Atheeri', say: 'a-TÉ-ri' })
  const t = PRON.adsV2NarrationForTts('Atheeri brings amber. ATHEERI lasts all night. Atheerix is another word.', p)
  return t === 'a-TÉ-ri brings amber. a-TÉ-ri lasts all night. Atheerix is another word.' && PRON.adsV2NarrationForTts('Atheeri brings amber.', null) === 'Atheeri brings amber.'
})
const c4 = async (Adv = A) => {
  reset()
  const plan = SL.planShots({ sector: 'restaurant', tier: 'photo_motion', photos: SPHOTOS, seconds: 15 })
  const narration = 'Atheeri brings a warm amber scent to every evening.'
  const w = world({ sector: 'restaurant', tier: 'photo_motion', brief: { business: 'Atheeri — perfume', pronounce: { word: 'Atheeri', say: 'a-TÉ-ri' } }, plan, narration, overlays: [{ role: 'brand', start: 0.3, end: 3, text: 'Atheeri' }, { role: 'what', start: 4, end: 7, text: 'Atheeri amber, 50 ml' }] })
  await seed(w, Adv)
  for (const r of w.tables.ads_v2_shots.filter((x) => x.kind !== 'text')) Object.assign(r, { status: 'done', stored_url: `https://sb/c${r.idx}.mp4`, measured_seconds: 3.04 })
  await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  cmPoll = async () => ({ status: 'succeeded', url: 'https://cm/out.mp4', durationSeconds: 15 })
  await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  const src = JSON.stringify(prov.cm[0] ?? {})
  const texts = (prov.cm[0]?.elements ?? []).filter((e) => e.type === 'text').map((e) => String(e.text ?? ''))
  const video = w.tables.videos[0]
  return prov.tts.length === 1 && prov.tts[0].includes('a-TÉ-ri') && !prov.tts[0].includes('Atheeri') &&
    texts.some((x) => x.includes('Atheeri')) && !src.includes('TÉ') && video && video.script === narration && w.tables.ads_v2_orders[0].status === 'delivered' && w.tables.ads_v2_orders[0].plan.narration === narration
}
await check('C4 pronúncia de ponta a ponta NO CÓDIGO (anúncio montado e entregue): a TTS ouve "a-TÉ-ri"; as frases da tela, o render e o roteiro salvo ficam com "Atheeri"', () => c4())
await check('C5 as DUAS sínteses de voz do v2Advance (a do ator e a da montagem) passam a pronúncia; nenhum caminho de tela/legenda a usa', () => {
  const s = rd(F.advance)
  return (s.match(/speakableForTts\(adsV2NarrationForTts\(narration, adsV2PronounceOf\(order\.brief\)\), language\)/g) || []).length === 2 && (s.match(/adsV2NarrationForTts\(/g) || []).length === 2
})

// ═══ V. desfaz e base ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nV. desfaz (o ajuste medido contra a base, nunca contra a árvore)')
await check('V1 a base é ancestral de HEAD e é a do desfaz; os arquivos novos não existem na base', () => {
  let anc = true
  try { git('merge-base', '--is-ancestor', BASE, 'HEAD') } catch { anc = false }
  const novos = FIEL_1510_NOVOS.every((f) => { try { execFileSync('git', ['-C', ROOT, 'cat-file', '-e', `${BASE}:${f}`], { stdio: 'ignore' }); return false } catch { return true } })
  return anc && BASE_FIEL_1510 === BASE && MARCA_FIEL_1510 === MARCA && novos
})
// reancorado KINEO-ADS-FIEL-2-1510 — o pai do 1º commit KINEO-ADS-FIEL-2-1510 (sem ele no histórico, HEAD): os trechos dele levam a marca dele.
const ANTES_FIEL2 = (() => { try { const s = git('log', '--no-merges', '--format=%H', '--grep=KINEO-ADS-FIEL-2-1510', 'HEAD').trim().split('\n').filter(Boolean); return s.length ? `${s[s.length - 1]}~1` : 'HEAD' } catch { return 'HEAD' } })() // reancorado KINEO-ADS-FIEL-2-1510
await check('V2 cada arquivo tocado, desfeito, é EXATAMENTE a base; cada trecho do diff traz a marca', () => FIEL_1510_ARQUIVOS.length === 7 && FIEL_1510_ARQUIVOS.every((f) => {
  if (semFiel1510(f, rd(f)) !== base(f)) return false
  const hunks = git('diff', '-U0', '--no-color', BASE, ANTES_FIEL2, '--', f) /* reancorado KINEO-ADS-FIEL-2-1510 — o diff DESTE ajuste vai até antes do conserto mais novo (que leva a marca dele) */.replace(/\r\n/g, '\n').split(/\n(?=@@ )/).slice(1)
  // trecho SÓ de remoção não tem onde levar a marca: só o da linha velha do esgotado (a mesma frase sai agora de `step.step === 'terminal'`)
  const soRemocao = hunks.filter((h) => !h.split('\n').slice(1).some((l) => l.startsWith('+')))
  return hunks.length > 0 && hunks.filter((h) => !soRemocao.includes(h)).every((h) => h.includes(MARCA)) &&
    soRemocao.every((h) => f === F.advance && h.split('\n').slice(1).join('\n') === '-  if (row.attempt >= ADS_V2_MAX_AUTO_ATTEMPTS) return `shot_${row.idx}_exhausted:${row.reason ?? row.status}`')
}))
await check('V3 o desfaz é estrito: uma linha mudada dentro de um trecho do ajuste = lança (nada se esconde)', () => { const s = rd(F.advance).replace('const stills = { used: stillsUsedOf(rows) } // KINEO-ADS-FIEL-1510', 'const stills = { used: 0 } // KINEO-ADS-FIEL-1510'); try { semFiel1510(F.advance, s); return false } catch { return true } })

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um aplicado e vermelho)')
const src = (f) => rd(f)
const mutante = async (nome, file, de, para, prova) => {
  let aplicou = false
  let vermelho = false
  // controle: a MESMA prova com o arquivo de verdade passa (senão o vermelho do mutante não prova nada)
  const controle = await tenta(() => prova({ [file]: src(file) }))
  try {
    const m = trocar(src(file), de, para)
    aplicou = true
    vermelho = !(await tenta(() => prova({ [file]: m })))
  } catch (e) { console.log('       (mutante: ' + e.message + ')') }
  ok(controle && aplicou && vermelho, `M ${nome}`)
}
await mutante('cena de produto SEM o esboço (o Nano Banana redesenha o produto)', F.advance, '      sendRefs = [layout, ...refs] // KINEO-ADS-FIEL-1510', '      sendRefs = refs // KINEO-ADS-FIEL-1510', (o) => a1(loadAdvance(o)))
await mutante('colagem que falha cai na cena redesenhada', F.advance, "if (await markShot(admin, row, ['image_submitted'], { status: 'image_done', image_url: lock.url })) await shotFallbackEvent(order, row, { to: 'product_photo', reason: `lock_finish:", "if (await markShot(admin, row, ['image_submitted'], { status: 'image_done', image_url: sceneUrl })) await shotFallbackEvent(order, row, { to: 'product_photo', reason: `lock_finish:", (o) => a5(loadAdvance(o)))
await mutante('quadro travado sem colar o recorte', F.png, '  const { rect, piece } = placeCutout(W, H, cutTrimmed, mode)\n  pasteOver(frame, piece, rect.x, rect.y)', '  const { rect, piece } = placeCutout(W, H, cutTrimmed, mode)', (o) => lockedOk(pure(o)(F.png)))
await mutante('prazo ignorado (refaz no Kling para sempre)', F.shotLists, '  const remaining = ADS_V2_STILL_AT_MS - Math.max(0, i.elapsedMs)', '  const remaining = Infinity', (o) => { const SLm = pure(o)(F.shotLists); return SLm.adsV2FallbackStep({ nextAttempt: 2, maxAttempts: 3, fallbackFrom: 3, elapsedMs: 5 * MIN, needsImage: false, stillsUsed: 0, canStill: true, route }).step === 'still' })
await mutante('teto de fotos paradas furado (um anúncio inteiro de fotos paradas)', F.shotLists, 'export const ADS_V2_STILLS_MAX = 2 // KINEO-ADS-FIEL-1510', 'export const ADS_V2_STILLS_MAX = 99 // KINEO-ADS-FIEL-1510', async (o) => { const Adv = loadAdvance({ [F.shotLists]: o[F.shotLists] }); const r = await d5(Adv, 3); return r.stills === 0 })
await mutante('tentativa presa volta a esperar 20 min', F.advance, "(row.kind === ADS_V2_PRESENTER_KIND ? ADS_V2_SHOT_STUCK_MS : ADS_V2_FAST_VIDEO_STUCK_MS)", 'ADS_V2_SHOT_STUCK_MS', (o) => d7(loadAdvance(o)))
await mutante('voz da montagem sem a pronúncia', F.advance, 'const buf = await adsV2NarrationVoice(order, speakableForTts(adsV2NarrationForTts(narration, adsV2PronounceOf(order.brief)), language), true)', 'const buf = await adsV2NarrationVoice(order, speakableForTts(narration, language), true)', (o) => c4(loadAdvance(o)))
await mutante('aviso honesto em português copiado do inglês', F.styles, "  pt: 'Os estilos com efeito reinterpretam o produto — a foto real fecha o anúncio.',", "  pt: 'Effect styles reinterpret the product — the real photo closes the ad.',", (o) => copyOk(pure(o)(F.styles)))
await mutante('foto parada sem a foto real (vaga cai no terminal)', F.shotLists, '  if (https(i.imageUrl)) return i.imageUrl.trim()\n  if (https(i.lockUrl)) return i.lockUrl.trim()', '  return null\n  if (https(i.lockUrl)) return i.lockUrl.trim()', async (o) => { const Adv = loadAdvance({ [F.shotLists]: o[F.shotLists] }); reset(); const w = world({ sector: 'restaurant', tier: 'photo_motion', brief: { business: 'Bella' }, startedAgo: 5 * MIN }); await seed(w, Adv); const ai = w.tables.ads_v2_shots.find((r) => r.kind !== 'text'); Object.assign(ai, { status: 'failed', reason: 'provider_failed', reason_class: 'unknown' }); await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() }); const n = latestOf(w.tables, ai.idx); return n.kind === 'text' && n.stored_url === ai.image_url })

globalThis.fetch = realFetch
console.log(`\ntest-ads-fiel-1510: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
