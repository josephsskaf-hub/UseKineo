// KINEO-ADS-FIEL-3-1510 — guardião dos consertos da VALIDAÇÃO PAGA da trava do produto (Studio Ads v2, 15/10; fora da TRAVA 8.2). Roda com
// `node scripts/test-ads-fiel-3-1510.mjs`, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo typescript do repo e rodados
// com stubs (o mesmo banco falso com UPDATE condicional de scripts/test-ads-fiel-2-1510.mjs). Números REAIS da validação
// (docs/RESULTADO-VALIDACAO-ADS-FIEL-2-2026-10-16.md): T1 95a23737 (Comercial 9:16: recorte 528×730 em x 276, y 576 nas 3 cenas, caixa no
// rosto em 2 de 3), T2 f65bae05 (Premium 1:1: só o painel dourado, 213×410 em x 434, y 324; H3 inventou 2 caixas), T3 5748fdf1 (link do
// café, 4:5: as 3 fotos entraram como "lugar"). Rostos e superfícies medidos nos quadros em C:\kineo-wt\prints-1610\fiel-T*.
// BASE = o pai do PRIMEIRO commit com a marca.
//
// O que prova (1 seção por conserto):
//   R recorte da foto INTEIRA: a trava leva a original; o birefnet recebe a original (cache pela foto de origem); contrato e /plan aceitam
//     original_footage_id só do dono e só na foto 'product'; a tela sobe a inteira só quando o formato cortou (1080×1920 → 1:1 corta);
//   L onde e de que tamanho o produto pousa: teto por formato, base NA superfície lida, nunca em rosto (troca de lado, encolhe), lado
//     alternado entre cenas; sem visão = terço de baixo, num lado; leitura ilegível = regra fixa;
//   G o quadro travado usa esse lugar (PNG), sem a opção = o de ANTES pixel a pixel; o servidor grava o JSON do lugar ao lado do quadro;
//     a visão do registro central lê superfície e rostos ('low', JSON) e falha = null;
//   A avanço executado: a leitura da cena vai ao quadro travado e ao evento; sem a função = regra fixa; a montagem lê o JSON e as frases
//     desviam do produto e dos rostos;
//   W movimento: o quadro travado proíbe objeto novo em QUALQUER motor (Kling O3, H3, Seedance — o mesmo texto); não há extrator de quadro
//     no servidor (sem ffmpeg/sharp/canvas): só o pedido é reforçado;
//   K foto do link declarada do produto + "Um produto" = 'product' (a trava liga no T3); a regra de antes intacta;
//   O frases de tela: 48 px por 1080 de largura, ≤ 2 linhas, largura 80%, centralizadas, presas pela base na zona segura dos 3 formatos;
//     sobem quando embaixo cobrem produto/rosto; o ator também; o anúncio de lugar continua no centro; o cartão não muda;
//   V desfaz exato + marca em todo bloco + dinheiro byte a byte + trava 'internal' no texto deste conserto e 'all' no arquivo vivo (reancorado KINEO-ADS-FIEL-LIGA-1510 — fundador ligou para todos em 15/10);
//   M mutantes (todos aplicados e vermelhos).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semFiel3_1510, FIEL_3_1510_ARQUIVOS, FIEL_3_1510_NOVOS, MARCA_FIEL_3_1510 } from './test-support/desfaz-ads-fiel-3-1510.mjs'
import { semFiel4_1510 } from './test-support/desfaz-ads-fiel-4-1510.mjs' // reancorado KINEO-ADS-FIEL-4-1510 — o conserto mais novo do Ads (canto reservado da trava) sai PRIMEIRO, em memória
import { semFiel5_1510 } from './test-support/desfaz-ads-fiel-5-1510.mjs' // reancorado KINEO-ADS-FIEL-5-1510 — o conserto mais novo do Ads (a base do produto no tampo lido) sai PRIMEIRO, em memória
import { semFielLiga1510 } from './test-support/desfaz-ads-fiel-liga-1510.mjs' // reancorado KINEO-ADS-FIEL-LIGA-1510 — fundador ligou para todos em 15/10; o liga (o mais novo da trava) sai PRIMEIRO, colado no readFileSync, em memória
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-ADS-FIEL-3-1510'
const rd = (p) => semFiel4_1510(p, semFiel5_1510(p, semFielLiga1510(p, readFileSync(join(ROOT, p), 'utf8')))) // reancorado KINEO-ADS-FIEL-4-1510 — esta prova roda a trava da Fiel 3 (o lugar lido pela visão); o canto reservado sai antes, byte a byte (semFiel4_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
let BASE = 'HEAD'
let PROPRIO = null
let ULTIMO = null // reancorado KINEO-LEVA3-1510 — o commit MAIS NOVO com a marca: o diff do conserto termina nele, não na árvore integrada
try {
  const shas = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
  if (shas.length) { PROPRIO = shas[shas.length - 1]; ULTIMO = shas[0]; BASE = git('rev-parse', `${PROPRIO}~1`).trim() }
} catch { BASE = 'HEAD' }
const base = (p) => { try { return git('show', `${BASE}:${p}`).replace(/\r\n/g, '\n') } catch { return null } }
// reancorado KINEO-LEVA3-1510 — numa árvore integrada (leva 3) BASE → árvore trazia a leva 2 e as irmãs inteiras para o V2; agora o diff
// é BASE → último commit da marca + o que não foi commitado (o mesmo molde de scripts/test-ads-fiel-2-1510.mjs). Antes do commit, igual a antes.
const diffDoConserto = (opts, paths = []) => (ULTIMO ? git('diff', ...opts, BASE, ULTIMO, '--', ...paths) + git('diff', ...opts, 'HEAD', '--', ...paths) : git('diff', ...opts, BASE, '--', ...paths)).replace(/\r\n/g, '\n') // BASE → todos os commits da marca + o que não foi commitado
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const tenta = async (fn) => { try { return !!(await fn()) } catch { return false } }
let naoAplicou = null
const trocar = (src, de, para) => { if (src.split(de).length !== 2) { naoAplicou = 'sem âncora única: ' + de.slice(0, 80); throw new Error('mutante ' + naoAplicou) } const out = src.split(de).join(para); if (out === src || !out.includes(para)) { naoAplicou = 'texto igual'; throw new Error('mutante não aplicou') }; return out }

const F = {
  advance: 'lib/ads/v2Advance.ts', shotLists: 'lib/ads/v2ShotLists.ts', png: 'lib/ads/v2Png.ts', server: 'lib/ads/v2ProductLockServer.ts',
  vision: 'lib/ads/v2LockVision.ts', montage: 'lib/ads/adV2Montage.ts', planCore: 'lib/ads/v2PlanCore.ts', simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  aiModels: 'lib/aiModels.ts', tiers: 'lib/ads/v2Tiers.ts', fiel3: 'lib/ads/v2Fiel3.ts', contract: 'lib/ads/v2Contract.ts', engines: 'lib/ads/v2Engines.ts',
  v2Link: 'lib/ads/v2Link.ts', linkRoute: 'app/api/ads/v2/link-import/route.ts',
}

// ── carregador: transpila TS → CJS, resolve '@/' com stubs (o resto real, se existir); `over` = fonte mutante ─────────────
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

// ── banco falso com UPDATE condicional de verdade ───────────────────────────────────────────────────────────────────────
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


const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const SL = pure()(F.shotLists)
const PNG = pure()(F.png)
const MONT = pure()(F.montage)
const F3 = pure()(F.fiel3)
const CON = pure()(F.contract)
const E = pure()(F.engines)
const PH = 'https://x.supabase.co/storage/v1/object/public/user-footage/u/'
const U = (n) => `${String(n).padStart(8, '0')}-2222-4333-8444-555555555555`
const ORDER = U(1)
const USER = U(9)
const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 })
const inter = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))
const nrm = (r, W, H) => box(r.x / W, r.y / H, (r.x + r.w) / W, (r.y + r.h) / H)

// Os números REAIS da validação (eventos ads_v2_product_locked) e o que se mediu nos quadros (frações do quadro).
const T1 = { W: 1080, H: 1920, fmt: '9:16', cut: [528, 730], old: { x: 276, y: 576, w: 528, h: 730 }, scenes: [
  { idx: 2, layout: { surface: box(0, 0.63, 1, 1), faces: [box(0.74, 0.33, 0.87, 0.42)] } }, // mesa do hotel, pessoa à direita
  { idx: 3, layout: { surface: box(0, 0.58, 0.8, 1), faces: [box(0.11, 0.29, 0.2, 0.36), box(0.69, 0.24, 0.85, 0.33)] } }, // balcão, duas pessoas
  { idx: 4, layout: { surface: box(0, 0.56, 1, 0.7), faces: [box(0.56, 0.03, 0.78, 0.13)] } }, // prateleira, rosto no alto
] }
const T2 = { W: 1080, H: 1080, fmt: '1:1', cut: [1080, 1450], old: { x: 434, y: 324, w: 213, h: 410 }, scenes: [
  { idx: 2, layout: { surface: box(0, 0.6, 1, 1), faces: [box(0.57, 0.13, 0.8, 0.42)] } },
  { idx: 3, layout: { surface: box(0.12, 0.62, 0.7, 0.84), faces: [box(0.3, 0.26, 0.42, 0.42), box(0.7, 0.22, 0.84, 0.42)] } },
  { idx: 4, layout: { surface: box(0.03, 0.72, 0.97, 0.82), faces: [box(0.43, 0.17, 0.57, 0.33)] } },
  { idx: 5, layout: { surface: box(0, 0.66, 0.9, 1), faces: [box(0.7, 0.14, 0.8, 0.31)] } },
] }

// ═══ R. o recorte sai da foto INTEIRA ═══════════════════════════════════════════════════════════════════════════════════
console.log('\nR. recorte da foto inteira (T2 1:1: só o painel dourado)')
const PHOTOS_O = [{ footage_id: 'f-prod', kind: 'product', url: `${PH}prod-1x1.jpg`, original_footage_id: 'f-prod-full', original_url: `${PH}prod-full.jpg` }, { footage_id: 'f-place', kind: 'place', url: `${PH}place.jpg` }]
const SCENE_SHOT = { source: 'generated_scene', referenceFootageIds: ['f-place', 'f-prod'], referenceUrls: [`${PH}place.jpg`, `${PH}prod-1x1.jpg`] }
const r1 = (S = SL) => {
  const a = S.adsV2ProductLockFor({ shot: SCENE_SHOT, photos: PHOTOS_O, productOrder: true, sector: 'store' })
  const semOriginal = PHOTOS_O.map(({ original_footage_id, original_url, ...p }) => p)
  const b = S.adsV2ProductLockFor({ shot: SCENE_SHOT, photos: semOriginal, productOrder: true, sector: 'store' })
  const http = S.adsV2ProductLockFor({ shot: SCENE_SHOT, photos: [{ ...PHOTOS_O[0], original_url: 'http://x/prod.jpg' }, PHOTOS_O[1]], productOrder: true, sector: 'store' })
  const refs = S.adsV2LockSceneRefs({ refs: [`${PH}place.jpg`, `${PH}prod-full.jpg`], ids: ['f-place', 'x'], photos: PHOTOS_O, lockUrl: `${PH}prod-1x1.jpg` })
  return a.sourceUrl === `${PH}prod-full.jpg` && a.sourceFootageId === 'f-prod-full' && a.url === `${PH}prod-1x1.jpg` && a.mode === 'scene' &&
    JSON.stringify(b) === JSON.stringify({ footageId: 'f-prod', url: `${PH}prod-1x1.jpg`, mode: 'scene' }) && http.sourceUrl === undefined &&
    JSON.stringify(S.adsV2CutoutSource(a)) === JSON.stringify({ footageId: 'f-prod-full', url: `${PH}prod-full.jpg` }) && JSON.stringify(S.adsV2CutoutSource(b)) === JSON.stringify({ footageId: 'f-prod', url: `${PH}prod-1x1.jpg` }) &&
    refs.join() === `${PH}place.jpg`
}
await check('R1 a trava leva a foto ORIGINAL do produto (a cortada continua sendo a foto do plano e a de reserva); sem original = a trava de antes, chave por chave; a original nunca vai à cena', () => r1())
const r3 = (C = CON) => {
  const body = (photos) => ({ order_id: U(1), sector: 'store', logo_footage_id: null, mode: 'simple', photos })
  const ok1 = C.sanitizePlanBody(body([{ footage_id: U(3), kind: 'product', original_footage_id: U(4).toUpperCase() }, { footage_id: U(5), kind: 'place' }]))
  const lugar = C.sanitizePlanBody(body([{ footage_id: U(3), kind: 'place', original_footage_id: U(4) }, { footage_id: U(5), kind: 'place' }]))
  const ruim = C.sanitizePlanBody(body([{ footage_id: U(3), kind: 'product', original_footage_id: 'nao-uuid' }, { footage_id: U(5), kind: 'place' }]))
  const mesma = C.sanitizePlanBody(body([{ footage_id: U(3), kind: 'product', original_footage_id: U(3) }, { footage_id: U(5), kind: 'place' }]))
  const sem = C.sanitizePlanBody(body([{ footage_id: U(3), kind: 'product' }, { footage_id: U(5), kind: 'place' }]))
  const B = pure({ [F.contract]: base(F.contract) })(F.contract)
  const semBase = B.sanitizePlanBody(body([{ footage_id: U(3), kind: 'product' }, { footage_id: U(5), kind: 'place' }]))
  return ok1.ok && ok1.value.photos[0].original_footage_id === U(4) && !('original_footage_id' in ok1.value.photos[1]) &&
    lugar.ok && !('original_footage_id' in lugar.value.photos[0]) && !ruim.ok && ruim.error === 'bad_photo_id' && !mesma.ok && mesma.error === 'bad_photo_id' &&
    JSON.stringify(sem) === JSON.stringify(semBase)
}
await check('R2 contrato do /plan: original_footage_id só na foto "product" (uuid, nunca a própria foto); inválido = bad_photo_id; sem ela = o corpo de antes, chave por chave', () => r3())
await check('R3 o /plan confere a original no user_footage DO DONO (o mesmo ownedFootage) e só grava original_url se for imagem do dono; senão o recorte usa a foto do plano', () => {
  const s = code(rd(F.planCore))
  return /ownedFootage\(admin, uid, \[[^\n]*\.\.\.input\.photos\.flatMap\(\(p\) => \(p\.original_footage_id \? \[p\.original_footage_id\] : \[\]\)\)/.test(s) &&
    /input\.photos\.forEach\(\(p, k\) => \{ const o = p\.original_footage_id \? own\.get\(p\.original_footage_id\) : null; if \(o\?\.isImage\) Object\.assign\(photos\[k\], \{ original_footage_id: p\.original_footage_id, original_url: o\.url \}\) \}\)/.test(s) &&
    s.indexOf('input.photos.forEach((p, k) =>') > s.indexOf("if (photos.some((p) => !p.url)) return v2Fail('media_not_owned', 400)")
})
await check('R4 a tela sobe a foto inteira só quando o formato CORTOU (a foto do T2, 1080×1920: 1:1 e 4:5 cortam, 9:16 não); lado maior ≤ 2048, nunca amplia', () =>
  F3.adsV2NeedsOriginal(1080, 1920, 0.5, 0.5, '1:1') && F3.adsV2NeedsOriginal(1080, 1920, 0.5, 0.5, '4:5') && !F3.adsV2NeedsOriginal(1080, 1920, 0.5, 0.5, '9:16') &&
  F3.adsV2NeedsOriginal(4032, 3024, 0.5, 0.5, '9:16') && !F3.adsV2NeedsOriginal(0, 0, 0.5, 0.5, '1:1') &&
  JSON.stringify(F3.adsV2OriginalSize(4032, 3024)) === JSON.stringify({ width: 2048, height: 1536 }) && JSON.stringify(F3.adsV2OriginalSize(1080, 1920)) === JSON.stringify({ width: 1080, height: 1920 }) && F3.ADS_V2_ORIGINAL_MAX_SIDE === 2048)
await check('R5 a tela: a foto marcada "product" leva a inteira (a do link = o id que a leitura guardou; a enviada = a foto INTEIRA desenhada sem corte) no corpo do /plan', () => {
  const s = code(rd(F.simple))
  return s.includes("const original = kind === 'product' ? await ensureOriginal(p) : null") && s.includes("out.push({ footage_id: footageId, kind, ...(original && original !== footageId ? { original_footage_id: original } : {}) })") &&
    s.includes('if (p.fromLink && p.linkFootageId) return p.linkFootageId') && s.includes('if (!adsV2NeedsOriginal(p.w, p.h, p.fx, p.fy, format)) return null') &&
    s.includes('ctx.drawImage(img, 0, 0, size.width, size.height)') && s.includes("await uploadFootage(new File([blob], 'product-full.jpg', { type: ADS_V2_CROP.type }))") &&
    (s.match(/await push\(p, /g) ?? []).length === 2 && !/[^t] push\(p, /.test(s)
})

// ═══ L. onde e de que tamanho o produto pousa ═══════════════════════════════════════════════════════════════════════════
console.log('\nL. o produto pousa na superfície, com teto, longe dos rostos (números do T1 e do T2)')
const place = (T, sc, S = SL) => S.adsV2LockPlacement({ frameW: T.W, frameH: T.H, cutW: T.cut[0], cutH: T.cut[1], format: T.fmt, sceneIdx: sc.idx, layout: sc.layout })
const naSuperficie = (r, T, s) => { const b = (r.y + r.h) / T.H; return b >= s.y0 - 1e-6 && b <= s.y1 + 1e-6 }
const l1 = (S = SL) => {
  const T = T1
  const ps = T.scenes.map((sc) => place(T, sc, S))
  const velho = T.scenes.map((sc) => S.adsV2FaceOverlap(nrm(T.old, T.W, T.H), sc.layout.faces) > 0)
  return velho.join() === 'true,true,false' && ps.every((p, k) => p.rect.h <= S.ADS_V2_LOCK_MAX_H['9:16'] * T.H + 1 && p.rect.w <= S.ADS_V2_LOCK_MAX_W * T.W + 1 && p.faceOverlap === 0 &&
    T.scenes[k].layout.faces.every((f) => inter(nrm(p.rect, T.W, T.H), f) === 0) && naSuperficie(p.rect, T, T.scenes[k].layout.surface) && p.source === 'surface' && p.rect.x >= 0 && p.rect.x + p.rect.w <= T.W && p.rect.y >= 0) &&
    S.ADS_V2_LOCK_MAX_H['9:16'] <= 0.3 && ps[0].rect.h < T.old.h && ps.every((p, k) => k === 0 || p.rect.x !== ps[k - 1].rect.x)
}
await check('L1 T1 (9:16, recorte 528×730): a caixa velha cobria rosto em 2 de 3 cenas; agora ≤ 28% da altura, NENHUM rosto, a base NA superfície lida e o lado muda de uma cena para a outra', () => l1())
const l2 = (S = SL) => {
  const T = T2
  const ps = T.scenes.map((sc) => place(T, sc, S))
  const velho = T.scenes.map((sc) => S.adsV2FaceOverlap(nrm(T.old, T.W, T.H), sc.layout.faces) > 0)
  return velho.join() === 'true,true,true,false' && ps.every((p, k) => p.rect.h <= S.ADS_V2_LOCK_MAX_H['1:1'] * T.H + 1 && p.faceOverlap === 0 && naSuperficie(p.rect, T, T.scenes[k].layout.surface)) &&
    ps[1].side === 'gap' && ps[1].scale < 1 && S.ADS_V2_LOCK_MAX_H['1:1'] <= 0.35
}
await check('L2 T2 (1:1, recorte da foto inteira): a caixa velha cobria rosto em 3 de 4; agora ≤ 35%, NENHUM rosto, pousada na superfície (não boia); duas pessoas no balcão = o vão entre elas, encolhido', () => l2())
const l3 = (S = SL) => {
  const a = S.adsV2LockPlacement({ frameW: 1080, frameH: 1920, cutW: 528, cutH: 730, format: '9:16', sceneIdx: 2, layout: null })
  const b = S.adsV2LockPlacement({ frameW: 1080, frameH: 1920, cutW: 528, cutH: 730, format: '9:16', sceneIdx: 3, layout: null })
  const q = S.adsV2LockPlacement({ frameW: 1080, frameH: 1080, cutW: 528, cutH: 730, format: '1:1', sceneIdx: 4, layout: null })
  const meio = (p, W) => Math.abs((p.rect.x + p.rect.w / 2) / W - 0.5) > 0.15
  return a.source === 'fallback' && a.side === 'right' && b.side === 'left' && meio(a, 1080) && meio(b, 1080) && meio(q, 1080) &&
    Math.abs((a.rect.y + a.rect.h) / 1920 - S.ADS_V2_LOCK_FALLBACK_BASE['9:16']) < 0.002 && Math.abs((q.rect.y + q.rect.h) / 1080 - S.ADS_V2_LOCK_FALLBACK_BASE['1:1']) < 0.002 &&
    S.ADS_V2_LOCK_FALLBACK_BASE['9:16'] >= 2 / 3 && a.rect.h <= 0.28 * 1920 + 1 && q.rect.h <= 0.35 * 1080 + 1
}
await check('L3 sem visão (falhou, sem chave, ilegível): regra fixa — base no terço de baixo, num LADO (par à direita, ímpar à esquerda; nunca no meio), com o teto do formato', () => l3())
await check('L4 superfície no alto do quadro (o produto boiaria) não serve: base na regra fixa, mas os rostos lidos continuam evitados', () => {
  const p = SL.adsV2LockPlacement({ frameW: 1080, frameH: 1920, cutW: 528, cutH: 730, format: '9:16', sceneIdx: 2, layout: { surface: box(0, 0.2, 1, 0.4), faces: [box(0.6, 0.62, 0.8, 0.72)] } })
  return p.source === 'faces' && Math.abs((p.rect.y + p.rect.h) / 1920 - 0.86) < 0.002 && p.faceOverlap === 0 && !SL.adsV2SurfaceUsable(box(0, 0.2, 1, 0.4)) && SL.adsV2SurfaceUsable(box(0, 0.6, 1, 1))
})
await check('L5 rosto em todo canto: encolhe e fica com a MENOR invasão (nunca lança)', () => {
  const faces = [box(0.02, 0.5, 0.3, 0.75), box(0.35, 0.5, 0.65, 0.75), box(0.7, 0.5, 0.98, 0.75)]
  const p = SL.adsV2LockPlacement({ frameW: 1080, frameH: 1920, cutW: 528, cutH: 730, format: '9:16', sceneIdx: 2, layout: { surface: null, faces } })
  return p.scale === SL.ADS_V2_LOCK_SCALES[SL.ADS_V2_LOCK_SCALES.length - 1] || p.faceOverlap > 0
})
await check('L6 a leitura da visão: frações viram caixas (até 8 rostos); pixel, lixo, JSON sem as chaves = null (regra fixa)', () => {
  const okL = SL.adsV2ParseSceneLayout('{"surface":[0,0.6,1,1],"faces":[[0.5,0.2,0.6,0.3]]}')
  const px = SL.adsV2ParseSceneLayout('{"surface":[0,600,1080,1080],"faces":[[540,200,600,300]]}')
  const muitos = SL.adsV2ParseSceneLayout({ surface: null, faces: Array.from({ length: 12 }, (_, i) => [0.01 * i, 0.1, 0.01 * i + 0.05, 0.2]) })
  return okL && okL.surface.y0 === 0.6 && okL.faces.length === 1 && px && px.surface === null && px.faces.length === 0 && SL.adsV2ParseSceneLayout('talvez') === null &&
    SL.adsV2ParseSceneLayout('{}') === null && SL.adsV2ParseSceneLayout('[1,2]') === null && muitos.faces.length === 8 && SL.adsV2ParseSceneLayout('{"faces":[]}').surface === null
})

// ═══ G. o quadro travado, o servidor e a visão ══════════════════════════════════════════════════════════════════════════
console.log('\nG. o quadro travado usa o lugar; o servidor grava o JSON; a visão lê superfície e rostos')
const cutout = (() => { const w = 400, h = 600, d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (x >= 120 && x < 280 && y >= 100 && y < 560) { d[o] = 220; d[o + 1] = 200; d[o + 2] = 150; d[o + 3] = 255 } } return { width: w, height: h, data: d } })()
const sceneImg = (w, h, v = [90, 80, 60]) => { const d = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = v[0]; d[i * 4 + 1] = v[1]; d[i * 4 + 2] = v[2]; d[i * 4 + 3] = 255 } return { width: w, height: h, data: d } }
const px = (img, x, y) => { const o = (y * img.width + x) * 4; return [img.data[o], img.data[o + 1], img.data[o + 2]] }
const g1 = (P = PNG) => {
  const trimmed = P.trimCutout(cutout)
  const sc = T1.scenes[0]
  const out = P.adsV2LockedFramePng(sceneImg(1080, 1920), trimmed, '9:16', 'scene', { shade: true, place: { sceneIdx: sc.idx, layout: sc.layout } })
  const esperado = SL.adsV2LockPlacement({ frameW: 1080, frameH: 1920, cutW: trimmed.width, cutH: trimmed.height, format: '9:16', sceneIdx: sc.idx, layout: sc.layout })
  const img = P.decodePng(out.png)
  const r = out.rect
  const dentro = px(img, Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2))
  const velhoCentro = px(img, 540, 941)
  return JSON.stringify(r) === JSON.stringify(esperado.rect) && out.placement && out.placement.source === 'surface' && dentro[0] > 150 && dentro[2] < dentro[0] &&
    velhoCentro[0] === 90 && r.h <= 0.28 * 1920 + 1 && Array.isArray(out.faces) && out.faces.length === 1
}
await check('G1 o quadro travado cola o recorte NO lugar calculado (superfície/rostos), com sombra; o centro da caixa velha ficou com a cena', () => g1())
await check('G2 sem a opção place (ator, segurando, chamador antigo), o quadro travado é o de ANTES pixel a pixel (a base rodada lado a lado)', () => {
  const B = pure({ [F.png]: base(F.png) })(F.png)
  const trimmed = PNG.trimCutout(cutout)
  return ['9:16', '4:5', '1:1'].every((f) => ['scene', 'holds'].every((m) => Buffer.compare(Buffer.from(PNG.adsV2LockedFramePng(sceneImg(1080, 1920), trimmed, f, m, { shade: true }).png), Buffer.from(B.adsV2LockedFramePng(sceneImg(1080, 1920), trimmed, f, m, { shade: true }).png)) === 0)) &&
    PNG.adsV2LockedFramePng(sceneImg(1080, 1920), trimmed, '9:16', 'holds', { shade: true, place: { sceneIdx: 2, layout: T1.scenes[0].layout } }).placement === undefined
})
await check('G3 a leitura da visão (frações da IMAGEM da cena) é levada ao quadro pela MESMA janela cover do recorte', () => {
  const m = PNG.adsV2LayoutToFrame({ surface: box(0, 0.6, 1, 1), faces: [box(0.05, 0.1, 0.15, 0.2), box(0, 0.1, 0.04, 0.2)] }, 1200, 1920, { sx: 60, sy: 0, sw: 1080, sh: 1920 })
  return m.surface.x0 === 0 && m.surface.x1 === 1 && Math.abs(m.faces[0].x0 - 0) < 1e-9 && Math.abs(m.faces[0].x1 - (0.15 * 1200 - 60) / 1080) < 1e-9 && m.faces.length === 1 && PNG.adsV2LayoutToFrame(null, 1, 1, { sx: 0, sy: 0, sw: 1, sh: 1 }) === null
})
const storage = new Map()
const srvCalls = { fal: [], uploads: [], json: [] }
const pub = (path) => `https://sb.co/storage/v1/object/public/renders/${path}`
const cutBytes = PNG.encodePng(cutout, { alpha: true })
const sceneBytes = PNG.encodePng(sceneImg(540, 960))
const srvStubs = {
  '@fal-ai/client': { fal: { config() {}, subscribe: async (model, opts) => { srvCalls.fal.push({ model, input: opts.input }); return { data: { image: { url: 'https://fal.media/cut.png' } } } }, queue: { cancel: async () => {} } } },
  '@/lib/userFootage': { footageAdminClient: () => ({
    storage: { from: () => ({ upload: async (path, buf, o) => { storage.set(pub(path), new Uint8Array(buf)); srvCalls.uploads.push(path); if (o && o.contentType === 'application/json') srvCalls.json.push({ path, text: new TextDecoder().decode(buf) }); return { error: null } }, getPublicUrl: (path) => ({ data: { publicUrl: pub(path) } }) }) },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'josephsskaf@gmail.com' } } }) } },
  }) },
  '@/lib/ads/v2Shots': { adsV2ShotRenderId: (o, i, a) => `adsv2-${o}-p${i}-a${a}` },
}
const realFetch = globalThis.fetch
globalThis.fetch = async (url) => {
  const u = String(url)
  const body = storage.get(u) ?? (u === 'https://fal.media/cut.png' ? cutBytes : u === 'https://fal.media/scene.png' ? sceneBytes : null)
  return body ? new Response(body, { status: 200 }) : new Response('no', { status: 404 })
}
process.env.FAL_KEY = 'test-key'
const loadSrv = (over = {}) => makeLoader(srvStubs, { over })(F.server)
const SRV = loadSrv()
const LOCK_O = { footageId: 'f-prod', url: `${PH}prod-1x1.jpg`, mode: 'scene', sourceFootageId: 'f-prod-full', sourceUrl: `${PH}prod-full.jpg` }
const g4 = async (S = SRV) => {
  srvCalls.fal.length = 0; srvCalls.uploads.length = 0; storage.clear()
  await S.adsV2CutoutFor(USER, LOCK_O)
  const comOriginal = { input: srvCalls.fal[0] && srvCalls.fal[0].input.image_url, path: srvCalls.uploads[0] }
  await S.adsV2CutoutFor(USER, { footageId: 'f-prod', url: `${PH}prod-1x1.jpg` })
  return comOriginal.input === `${PH}prod-full.jpg` && comOriginal.path === `${USER}/adsv2-cutout-f-prod-full.png` && srvCalls.fal.length === 2 && srvCalls.fal[1].input.image_url === `${PH}prod-1x1.jpg` && srvCalls.uploads[1] === `${USER}/adsv2-cutout-f-prod.png`
}
await check('R6 servidor: o birefnet recebe a foto ORIGINAL e o recorte fica no cache dela (o da foto cortada nunca é reaproveitado); sem original = a de antes', () => g4())
const g5 = async (S = SRV) => {
  srvCalls.json.length = 0
  const sc = T1.scenes[1]
  const out = await S.adsV2FinishLockedScene({ userId: USER, orderId: ORDER, idx: 3, attempt: 1, lock: LOCK_O, format: '9:16', sceneUrl: 'https://fal.media/scene.png', layout: sc.layout })
  const j = srvCalls.json[0]
  const boxes = j ? SL.adsV2ParseLockSidecar(j.text) : null
  const prod = nrm(out.rect, 1080, 1920)
  return SL.adsV2IsLockedImage(out.url) && out.placement && out.placement.source === 'surface' && out.placement.faceOverlap === 0 && out.placement.side === 'left' &&
    j && j.path === `${USER}/adsv2-${ORDER}-p3-a1-lock.json` && SL.adsV2LockSidecarUrl(out.url) === pub(j.path) && boxes && boxes.length === 3 && Math.abs(boxes[0].x0 - prod.x0) < 1e-3 && Math.abs(boxes[0].y1 - prod.y1) < 1e-3
}
await check('G4 servidor: o quadro travado pousa pelo lugar calculado (T1, cena do balcão: lado esquerdo, sem rosto) e grava "…-lock.json" com o produto e os rostos, que a montagem acha pelo nome do quadro', () => g5())
const AIM = pure()(F.aiModels)
const VIS = pure()(F.vision)
await check('G5 a leitura da cena usa o modelo de VISÃO do registro central, imagem "low", JSON; lê superfície e rostos; sem chave, HTTP ruim, rede fora ou lixo = null (nunca lança)', async () => {
  const body = VIS.adsV2LockLayoutBody('https://fal.media/scene.png')
  const img = body.messages[0].content.find((c) => c.type === 'image_url')
  const txt = body.messages[0].content.find((c) => c.type === 'text')
  const resp = (content) => async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
  delete process.env.OPENAI_API_KEY
  const semChave = await VIS.adsV2SceneLayout('https://fal.media/scene.png', resp('{"surface":[0,0.6,1,1],"faces":[]}'))
  process.env.OPENAI_API_KEY = 'sk-test'
  const bom = await VIS.adsV2SceneLayout('https://fal.media/scene.png', resp('{"surface":[0,0.6,1,1],"faces":[[0.4,0.2,0.5,0.3]]}'))
  const ruim = await VIS.adsV2SceneLayout('https://fal.media/scene.png', async () => new Response('x', { status: 500 }))
  const rede = await VIS.adsV2SceneLayout('https://fal.media/scene.png', async () => { throw new Error('down') })
  const lixo = await VIS.adsV2SceneLayout('https://fal.media/scene.png', resp('talvez'))
  const http = await VIS.adsV2SceneLayout('http://x/scene.png', resp('{"surface":null,"faces":[]}'))
  delete process.env.OPENAI_API_KEY
  return body.model === AIM.AI_TEXT_MODELS.vision && img.image_url.detail === 'low' && body.response_format.type === 'json_object' && txt.text === SL.ADS_V2_LOCK_LAYOUT_QUESTION &&
    semChave === null && bom && bom.surface.y0 === 0.6 && bom.faces.length === 1 && ruim === null && rede === null && lixo === null && http === null
})
globalThis.fetch = realFetch

// ── o avanço com banco e fornecedores falsos (o mesmo mundo de scripts/test-ads-fiel-2-1510.mjs) ──
const prov = { submits: [], images: [], tts: [], cm: [], events: [], fails: [], refunds: 0, persisted: [], mp3: [] }
const lockSrv = { enabled: true, prepare: [], finish: [] }
const vision = { impl: async () => false, calls: 0 }
const lockStub = {
  adsV2ProductLockEnabled: async () => lockSrv.enabled,
  adsV2PrepareLockedScene: async (a) => { lockSrv.prepare.push(a); return `https://sb/renders/${a.userId}/adsv2-${a.orderId}-p${a.idx}-a${a.attempt}-layout.png` },
  adsV2FinishLockedScene: async (a) => { lockSrv.finish.push(a); return { url: `https://sb/renders/${a.userId}/adsv2-${a.orderId}-p${a.idx}-a${a.attempt}-lock.png`, rect: { x: 1, y: 2, w: 3, h: 4 }, shade: { gain: 0.9, warm: 2, contact: true, drop: true }, placement: { source: a.layout ? 'surface' : 'fallback', side: 'right', scale: 1, faceOverlap: 0 } } }, // + onde pousou (KINEO-ADS-FIEL-3-1510)
  adsV2CancelFalJob: async () => {},
}
const visionStub = { adsV2SceneHasProduct: async (u) => { vision.calls += 1; return vision.impl(u) } }
let pollImpl = async () => ({ state: 'processing', url: null })
let cmPoll = async () => ({ status: 'rendering', url: null })
let curTables = null
class CreatomateSubmitError extends Error { constructor(m, amb) { super(m); this.ambiguous = amb } }
const SH = makeLoader({ '@fal-ai/client': { fal: {} }, '@/lib/falQueue': { FalQueueSubmitError: class extends Error {}, submitFalQueueOnce: async () => 'x' }, '@/lib/cinematic/sceneDisposition': { classifyProviderFailure: () => ({ disposition: 'rejected', reason_class: 'unknown' }) }, '@/lib/renderAssets': { persistRenderAssets: async () => ({}) }, '@/lib/mp4Duration': { probeMp4DurationSeconds: () => 3 }, '@/lib/falAlert': { alertFalExhausted: async () => {}, falErrorText: () => '', looksExhausted: () => false } })('lib/ads/v2Shots.ts')
const advStubs = (withLock) => ({
  '@/lib/compose': {
    CreatomateSubmitError,
    estimateMp3DurationSeconds: () => (prov.mp3.length ? prov.mp3.shift() : 9.5),
    pollCreatomateRender: async (id) => cmPoll(id),
    submitCreatomateRender: async (src) => { prov.cm.push(src); return 'cm-1' },
    uploadVoiceoverToSupabase: async () => `https://sb/voiceovers/v${prov.tts.length}.mp3`,
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
  '@/lib/ads/v2Shots': { ...SH, ADS_V2_KLING_GAP_MS: 0, submitShotOnce: async (model, input) => { prov.submits.push({ model, input }); return { kind: 'accepted', requestId: `req-${prov.submits.length}`, posts: 1 } }, pollFalJob: (...a) => pollImpl(...a), persistShotClip: async (a) => ({ storedUrl: `https://sb/renders/${SH.adsV2ShotRenderId(a.orderId, a.idx, a.attempt)}.mp4`, measuredSeconds: 4.04 }) },
  '@/lib/ads/v2Images': {
    persistAudioCopy: async () => null,
    persistSceneImage: async (a) => { prov.persisted.push(a); return `https://sb/renders/${a.orderId}-p${a.idx}-scene.jpg` },
    pollSceneImage: async () => ({ state: 'done', url: 'https://fal.media/img.png' }),
    submitSceneImage: async (sc) => { prov.images.push(sc); return { kind: 'accepted', requestId: `img-${prov.images.length}`, posts: 1 } },
  },
  '@/lib/ads/v2LockVision': visionStub,
  ...(withLock ? { '@/lib/ads/v2ProductLockServer': lockStub } : {}),
})
const loadAdvance = (over = {}, withLock = true) => makeLoader(advStubs(withLock), { timers: fastTimers, over })(F.advance)
const A = loadAdvance()
const reset = () => { for (const k of ['submits', 'images', 'tts', 'cm', 'events', 'fails', 'persisted', 'mp3']) prov[k].length = 0; prov.refunds = 0; lockSrv.enabled = true; lockSrv.prepare.length = 0; lockSrv.finish.length = 0; vision.impl = async () => false; vision.calls = 0; pollImpl = async () => ({ state: 'processing', url: null }); cmPoll = async () => ({ status: 'rendering', url: null }) }
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const SPHOTOS = [{ id: 'f-prod', url: `${PH}prod.jpg`, kind: 'product' }, { id: 'f-place', url: `${PH}place.jpg`, kind: 'place' }]
const T1_NARRATION = 'Este perfume traz uma mistura encantadora de aromas. Sinta a sofisticação e o frescor em cada gota. Venha e descubra a sua nova essência hoje mesmo. Agora, este perfume.'
function world({ sector = 'store', tier = 'commercial', brief = { business: 'perfume —', kind: 'product' }, startedAgo = 30_000, plan: planIn = null, narration = T1_NARRATION, overlays = [{ role: 'brand', start: 0.3, end: 3.967, text: 'perfume - fragrâncias exclusivas' }, { role: 'what', start: 4.567, end: 8.133, text: 'experimente a sua nova essência' }], language = 'pt', format = null } = {}) {
  const plan = planIn ?? SL.planShots({ sector, tier, photos: SPHOTOS, seconds: 15 })
  const stored = { ...plan, overlays, narration, ...(format ? { format } : {}) }
  const order = {
    id: ORDER, user_id: USER, status: 'generating', tier, seconds: 15, sector, brief, language, narration: true, card_url: 'https://sb/card.png',
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

const T = pure()(F.tiers)
const LAYOUT_T1 = T1.scenes[0].layout
vision.layout = LAYOUT_T1
vision.layoutCalls = 0
const resetFiel3 = () => { reset(); vision.layout = LAYOUT_T1; vision.layoutCalls = 0; visionStub.adsV2SceneLayout = async () => { vision.layoutCalls += 1; return vision.layout } }
visionStub.adsV2SceneLayout = async () => { vision.layoutCalls += 1; return vision.layout }

// ═══ A. avanço executado ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nA. avanço executado (banco falso, fornecedores falsos)')
const a1 = async (Adv = A) => {
  resetFiel3()
  const w = world()
  await seed(w, Adv)
  await Adv.dispatchAdsV2Shots(w.db, w.order, DL())
  await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  const scenes = scenesOf(w.tables)
  const locked = prov.events.filter((e) => e.name === 'ads_v2_product_locked')
  return scenes.length === 3 && lockSrv.finish.length === 3 && lockSrv.finish.every((f) => f.layout === LAYOUT_T1 && f.lock.mode === 'scene') && vision.layoutCalls === 3 &&
    locked.length === 3 && locked.every((e) => e.metadata.placement && e.metadata.placement.source === 'surface' && e.metadata.faces === 1 && e.metadata.from_original === false && e.metadata.shade)
}
await check('A1 a leitura da cena (superfície + rostos) vai ao quadro travado de cada cena de gente e ao evento ads_v2_product_locked (onde pousou, quantos rostos, se veio da foto original)', () => a1())
await check('A2 sem a leitura (módulo antigo sem a função, ou visão que devolve null): o quadro travado sai pela regra fixa (layout null), sem refazer nada', async () => {
  const run = async (sem) => {
    resetFiel3()
    if (sem) delete visionStub.adsV2SceneLayout
    else vision.layout = null
    const w = world()
    await seed(w)
    await A.dispatchAdsV2Shots(w.db, w.order, DL())
    await A.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
    return lockSrv.finish.length === 3 && lockSrv.finish.every((f) => f.layout === null) && scenesOf(w.tables).every((i) => SL.adsV2IsLockedImage(latestOf(w.tables, i).image_url)) && prov.images.length === 3
  }
  const r = (await run(true)) && (await run(false))
  resetFiel3()
  return r
})
const assemble = async (w, Adv = A) => {
  for (const r of w.tables.ads_v2_shots.filter((x) => x.kind !== 'text' && !(x.status === 'skipped_text'))) Object.assign(r, { status: 'done', stored_url: `https://sb/c${r.idx}-${r.attempt}.mp4`, measured_seconds: r.kind === 'product_hero' ? 4.04 : 3.04 })
  await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  if (!prov.cm.length) await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  return prov.cm[0]
}
// O JSON ao lado de cada quadro travado: o produto pousado embaixo à direita, ocupando a faixa de baixo das frases, e o rosto no alto.
const SIDECAR = { v: 1, product: box(0.2, 0.55, 0.85, 0.84), faces: [box(0.4, 0.3, 0.55, 0.4)] }
const a3 = async (Adv = A, sidecar = SIDECAR) => {
  resetFiel3()
  const w = world({ overlays: [{ role: 'brand', start: 0.3, end: 1.6, text: 'Perfume Atheeri - Fragrâncias únicas' }, { role: 'what', start: 2.2, end: 12, text: 'Sinta a beleza de cada aroma' }] })
  await seed(w, Adv)
  await Adv.dispatchAdsV2Shots(w.db, w.order, DL())
  await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  const asked = []
  globalThis.fetch = async (url) => { const u = String(url); asked.push(u); return /-lock\.json$/.test(u) && sidecar ? new Response(JSON.stringify(sidecar), { status: 200 }) : new Response('no', { status: 404 }) }
  let src
  try { src = await assemble(w, Adv) } finally { globalThis.fetch = realFetch }
  const scenes = scenesOf(w.tables)
  const shots = src.elements.filter((e) => e.track === 2 && typeof e.source === 'string')
  const lockedWin = shots.filter((e) => scenes.some((i) => e.source === `https://sb/c${i}-1.mp4`)).map((e) => [e.time, e.time + e.duration])
  const texts = src.elements.filter((e) => e.type === 'text')
  const overLocked = (t) => lockedWin.some(([a, b]) => a < t.time + t.duration && b > t.time)
  return { src, texts, overLocked, asked, scenes }
}
await check('A3 a montagem lê o "…-lock.json" de cada cena travada: a frase que passa sobre essas cenas SOBE para a faixa de cima (longe do produto e do rosto); com o JSON fora do ar, fica embaixo (regra fixa)', async () => {
  const a = await a3()
  const b = await a3(A, null)
  const fr = (t) => Number(String(t.y).replace('%', '')) / 100
  const sobre = a.texts.filter(a.overLocked)
  return a.asked.filter((u) => /-lock\.json$/.test(u)).length === 3 && sobre.length >= 1 && sobre.every((t) => fr(t) < 0.4 && t.y_anchor === '100%') &&
    b.texts.every((t) => fr(t) > 0.7 && t.y_anchor === '100%') && a.texts.every((t) => t.font_size === 48 && t.width === '80%' && t.x_alignment === '50%')
})

// ═══ W. o vídeo da cena travada não inventa objeto ══════════════════════════════════════════════════════════════════════
console.log('\nW. movimento das cenas travadas: nenhum objeto novo, em qualquer motor')
const w1 = (S = SL) => {
  const ms = [0, 1, 2, 3].map((v) => S.adsV2ProductLockMotion('scene', v)).concat([S.adsV2ProductLockMotion('holds', 0), S.adsV2ProductLockMotion('actor', 1)])
  const engines = ['kling_o3', 'h3', 'seedance_20_fast']
  return ms.every((m) => m.includes(S.ADS_V2_LOCK_NO_NEW_OBJECT) && m.endsWith(S.ADS_V2_KEEP_PHRASE) && m.length <= E.ADS_V2_PROMPT_MAX_CHARS && engines.every((en) => E.buildShotInput(en, { imageUrl: `${PH}a-lock.png`, prompt: m }).prompt === m)) &&
    /nobody picks up, holds, hands over or shows a box, bottle/.test(S.ADS_V2_LOCK_NO_NEW_OBJECT) && /empty hands stay empty/.test(S.ADS_V2_LOCK_NO_NEW_OBJECT) &&
    ms.slice(0, 4).every((m) => /make only small natural movements/.test(m) && !/the people around move naturally/.test(m) && /no other bottle, box or product appears anywhere/.test(m))
}
await check('W1 o movimento de TODO quadro travado (cena, segurando, ator) proíbe objeto novo — ninguém pega, segura, entrega ou mostra caixa/garrafa; mão vazia segue vazia — e o MESMO texto vai a Kling O3, H3 e Seedance', () => w1())
await check('W2 executado: o vídeo da cena travada sai com a proibição no Kling O3 (1ª) e na reserva H3 (a do T2)', async () => {
  resetFiel3()
  const w = world()
  await seed(w)
  await A.dispatchAdsV2Shots(w.db, w.order, DL())
  await A.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  await A.dispatchAdsV2Shots(w.db, w.tables.ads_v2_orders[0], DL())
  const scenes = scenesOf(w.tables)
  const kling = prov.submits.filter((s) => SL.adsV2IsLockedImage(s.input.image_url) && s.model === T.ADS_V2_ENGINES.kling_o3.slug)
  for (const i of scenes) Object.assign(latestOf(w.tables, i), { status: 'image_done', engine: 'h3', request_id: null, submit_claimed_at: null, submitted_at: null })
  prov.submits.length = 0
  await A.dispatchAdsV2Shots(w.db, w.tables.ads_v2_orders[0], DL())
  const h3 = prov.submits.filter((s) => SL.adsV2IsLockedImage(s.input.image_url) && s.model === T.ADS_V2_ENGINES.h3.slug)
  return kling.length === 3 && h3.length === 3 && [...kling, ...h3].every((s) => s.input.prompt.includes(SL.ADS_V2_LOCK_NO_NEW_OBJECT))
})
await check('W3 conferir um QUADRO do vídeo pronto não é possível no servidor: nenhum extrator (sem ffmpeg, sharp, canvas, jimp) no package.json — só o pedido é reforçado (documentado)', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const deps = Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) })
  return !deps.some((d) => /ffmpeg|^sharp$|^canvas$|jimp/i.test(d)) && /extrator|ffmpeg/i.test(readFileSync(join(ROOT, 'docs/PLANO-VALIDACAO-ADS-FIEL-3-1510.md'), 'utf8'))
})

// ═══ K. a foto do link que é do produto ═════════════════════════════════════════════════════════════════════════════════
console.log('\nK. link de produto: a foto que a página declara do produto entra como produto')
const k1 = (G = F3) => {
  const seq = (items, o) => { const out = []; for (const it of items) out.push(G.adsV2SimplePhotoKindFor({ photoKind: o.photoKind, firstAsProduct: o.firstAsProduct ?? false, firstPhoto: out.length === 0, fromLink: it.fromLink, linkProduct: it.linkProduct, sector: o.sector, adKind: o.adKind, productAlready: out.includes('product') })); return out.join() }
  const T3 = [{ fromLink: true, linkProduct: true }, { fromLink: true, linkProduct: true }, { fromLink: true, linkProduct: false }]
  return seq(T3, { photoKind: 'place', sector: 'restaurant', adKind: 'product' }) === 'product,place,place' &&
    seq(T3, { photoKind: 'place', sector: 'restaurant', adKind: 'place' }) === 'place,place,place' &&
    seq(T3, { photoKind: 'text', sector: 'app_service', adKind: 'product' }) === 'text,text,text' &&
    seq([{ fromLink: false, linkProduct: false }, { fromLink: false, linkProduct: false }], { photoKind: 'place', sector: 'restaurant', adKind: 'product', firstAsProduct: true }) === 'product,place' &&
    seq(T3, { photoKind: 'place', sector: 'other', adKind: 'place' }) === 'product,product,product' &&
    seq([{ fromLink: false, linkProduct: true }], { photoKind: 'place', sector: 'restaurant', adKind: 'product' }) === 'place'
}
await check('K1 T3 (link do café, "Café…" cai em restaurante, "Um produto" marcado): a 1ª foto que a página DECLARA do produto vira "product" (as outras seguem "lugar"); a regra de antes intacta (estilo/ator, setor "other", tela de app nunca)', () => k1())
await check('K2 com a foto do link como produto, a trava LIGA nas cenas de gente do T3 (antes: zero ads_v2_product_locked)', () => {
  const shot = { source: 'generated_scene', referenceFootageIds: ['f-link1', 'f-link2'] }
  const fotos = (k) => [{ footage_id: 'f-link1', kind: k, url: `${PH}link1.jpg` }, { footage_id: 'f-link2', kind: 'place', url: `${PH}link2.jpg` }]
  return SL.adsV2ProductLockFor({ shot, photos: fotos('place'), productOrder: true, sector: 'restaurant' }) === null && SL.adsV2ProductLockFor({ shot, photos: fotos('product'), productOrder: true, sector: 'restaurant' })?.mode === 'scene'
})
await check('K3 o sinal vem do leitor de link que já existia (as fotos DECLARADAS da página: JSON-LD/og de produto, JSON do Shopify/VTEX): v2Link marca, a rota devolve product:true, a tela guarda e usa', () => {
  const l = rd(F.v2Link), r = code(rd(F.linkRoute)), s = code(rd(F.simple)) // v2Link cru: o accept "*/*" do download engana o tira-comentários
  return l.includes('await take(primary, true)') && l.includes('if (!images.length) await take(general)\n') && l.includes('images.push({ src, ext, bytes: img.body, ...(declared ? { declared: true } : {}) })') &&
    (r.match(/\.\.\.\(im\.declared \? \{ product: true as const \} : \{\}\)/g) ?? []).length === 2 &&
    s.includes("added.push({ ...it, fromLink: true, ...(im.product === true ? { linkProduct: true } : {}), linkFootageId: typeof im.footage_id === 'string' && im.footage_id ? im.footage_id : null })") &&
    s.includes('const kind = adsV2SimplePhotoKindFor({ photoKind, firstAsProduct, firstPhoto: out.length === 0, fromLink: p.fromLink === true, linkProduct: p.linkProduct === true, sector, adKind, productAlready: out.some((o) => o.kind === \'product\') })')
})

// ═══ O. frases de tela ══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nO. frases de tela menores, ≤ 2 linhas, centralizadas, na zona segura (fundador: "posicionadas erradas, muito grandes")')
const url = (n) => `https://x.test/c${n}.mp4`
const SHOTS_O = [0, 1, 2, 3, 4, 5].map((i) => ({ url: url(i), kind: i < 2 ? 'product' : 'people', cutStart: 0, cutSeconds: 2, measuredSeconds: 3 }))
const OVER_T1 = [{ text: 'Perfume Atheeri - Fragrâncias únicas', start: 0.3, end: 3.9 }, { text: 'Sinta a beleza de cada aroma', start: 4.5, end: 11.5 }]
const inO = (W, H, extra = {}) => ({ width: W, height: H, shots: SHOTS_O, overlays: OVER_T1, fontFamily: 'Montserrat', cardUrl: 'https://x.test/card.png', cardSeconds: 2.5, musicUrl: null, voiceUrl: null, voiceSeconds: null, overlayPlacement: 'lower_third', ...extra })
const textos = (s) => s.elements.filter((e) => e.type === 'text')
const frac = (p) => Number(String(p).replace('%', '')) / 100
const FMTS = [[1080, 1920, '9:16'], [1080, 1350, '4:5'], [1080, 1080, '1:1']]
// A zona segura pedida (fundador/coordenação 15/10): 9:16 fora dos 15% de cima e dos 20% de baixo; 4:5 e 1:1 na proporção da altura.
const SAFE = { '9:16': { top: 0.15, bottom: 0.8 }, '4:5': { top: 0.11, bottom: 0.86 }, '1:1': { top: 0.09, bottom: 0.89 } }
const o1 = (M = MONT) => FMTS.every(([W, H, f]) => {
  const t = textos(M.buildAdV2Source(inO(W, H)))
  const safe = SAFE[f]
  return t.length === 2 && t.every((e) => {
    const lines = M.adsV2OverlayLines(e.text, e.font_size, W)
    const blockTop = frac(e.y) - (lines.length * e.font_size * 1.1) / H
    return e.font_size === 48 && e.width === '80%' && e.x === '50%' && e.x_anchor === '50%' && e.x_alignment === '50%' && e.y_anchor === '100%' && e.height === undefined && e.line_height === '110%' &&
      lines.length <= 2 && frac(e.y) <= safe.bottom - 0.01 + 1e-9 && blockTop >= safe.top - 1e-9
  })
})
await check('O1 os 3 formatos: fonte 48 (por 1080 de largura), largura 80%, centralizada (x 50%, x_alignment 50%), presa pela base, ≤ 2 linhas e DENTRO da zona segura (9:16 fora dos 15% de cima e dos 20% de baixo; 4:5 e 1:1 na proporção)', () => o1())
await check('O2 menor que antes de verdade: a base (64 px, 84%, centro 77%) contra a de agora; 2 linhas no 9:16 = 5,5% da altura (régua de mercado 5–6%); 720 px de largura = 32 px', () => {
  const B = pure({ [F.montage]: base(F.montage) })(F.montage)
  const velho = textos(B.buildAdV2Source(inO(1080, 1920)))[0]
  const novo = textos(MONT.buildAdV2Source(inO(1080, 1920)))[0]
  const bloco = (2 * 48 * 1.1) / 1920
  return velho.font_size === 64 && velho.width === '84%' && velho.y === '77%' && novo.font_size < velho.font_size && bloco >= 0.05 && bloco <= 0.06 && MONT.adsV2OverlayFontSize('Sinta a beleza de cada aroma', 720) === 32 &&
    MONT.ADS_V2_OVERLAY_SAFE['9:16'].top === 0.15 && MONT.ADS_V2_OVERLAY_SAFE['9:16'].bottom === 0.8
})
await check('O3 frase no limite do plano (42 caracteres) cabe em 2 linhas a 48; palavra enorme encolhe a fonte (nunca abaixo de 40)', () => {
  const t42 = 'Descubra a sua nova essência todos os dias'
  const longa = 'Supercalifragilisticexpialidocious hiperextraordinariamente maravilhoso'
  return t42.length <= SL.ADS_V2_OVERLAY_MAX_CHARS && MONT.adsV2OverlayFontSize(t42, 1080) === 48 && MONT.adsV2OverlayLines(t42, 48, 1080).length <= 2 &&
    MONT.adsV2OverlayFontSize(longa, 1080) < 48 && MONT.adsV2OverlayFontSize(longa, 1080) >= 40
})
const o4 = (M = MONT) => {
  const prod = nrm(place(T1, T1.scenes[0]).rect, 1080, 1920)
  const avoid = [prod, ...T1.scenes[0].layout.faces]
  const shots = SHOTS_O.map((s, i) => (i >= 2 ? { ...s, avoid } : s))
  const t = textos(M.buildAdV2Source(inO(1080, 1920, { shots })))
  const sobe = t[1]
  const pl = M.adsV2OverlayPlace({ text: sobe.text, frameW: 1080, frameH: 1920, fontPx: sobe.font_size, avoid })
  return frac(t[0].y) > 0.7 && frac(sobe.y) < 0.35 && pl.band === 'upper' && pl.overlap === 0 && avoid.every((a) => inter(pl.box, a) === 0) &&
    textos(M.buildAdV2Source(inO(1080, 1920))).every((e) => frac(e.y) > 0.7)
}
await check('O4 com o produto pousado (T1, cena do hotel) e o rosto: a frase sobre essa cena SOBE para a faixa de cima, sem tocar nenhum dos dois; a que passa só sobre a foto do produto fica embaixo', () => o4())
const o5 = (M = MONT) => {
  const pres = M.buildAdV2Source({ ...inO(1080, 1920), overlayPlacement: null, presenter: { url: url(31), measuredSeconds: 12.25, insertOrder: [0, 1, 4, 2] } })
  return textos(pres).every((e) => e.font_size === 48 && e.width === '80%' && e.y_anchor === '100%' && e.x_alignment === '50%' && frac(e.y) <= 0.8 && frac(e.y) - (2 * 48 * 1.1) / 1920 >= 2 / 3)
}
await check('O5 com ator: a mesma régua (48 px, 80%, centralizada, presa pela base) e o bloco inteiro no terço de baixo, acima dos 20% da interface (o rosto fica acima)', () => o5())
await check('O6 anúncio de LUGAR (sem foto de produto): o centro de sempre (y 45%, caixa de 18%), só a fonte e a largura menores', () =>
  textos(MONT.buildAdV2Source(inO(1080, 1920, { overlayPlacement: null }))).every((e) => e.y === '45%' && e.y_anchor === '50%' && e.height === '18%' && e.font_size === 48 && e.width === '80%'))
await check('O7 fora as frases, o anúncio é o de ANTES (planos, cartão, véu, música, duração) nos 3 formatos, com e sem ator — o cartão não mudou', () => {
  const B = pure({ [F.montage]: base(F.montage) })(F.montage)
  const semTexto = (s) => JSON.stringify({ ...s, elements: s.elements.filter((e) => e.type !== 'text') })
  const casos = [...FMTS.map(([W, H]) => inO(W, H)), inO(1080, 1920, { overlayPlacement: null, tint: 'rgba(10,20,30,0.12)' }), { ...inO(1080, 1920), presenter: { url: url(31), measuredSeconds: 12.25, insertOrder: [0, 1, 4, 2] } }]
  return casos.every((c) => semTexto(MONT.buildAdV2Source(c)) === semTexto(B.buildAdV2Source(c)))
})

// ═══ V. desfaz, marca, dinheiro, trava ═════════════════════════════════════════════════════════════════════════════════
console.log('\nV. desfaz, marca, dinheiro e a trava ("internal" neste conserto, "all" no arquivo vivo)')
await check('V1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-ads-fiel-3-1510.mjs), é EXATAMENTE o pai do commit; os novos existem e trazem a marca', () =>
  FIEL_3_1510_ARQUIVOS.length === 11 && FIEL_3_1510_ARQUIVOS.every((f) => semFiel3_1510(f, rd(f)) === base(f)) && FIEL_3_1510_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null && rd(f).includes(MARCA)) && MARCA_FIEL_3_1510 === MARCA)
await check('V2 todo bloco novo nos arquivos de produto que já existiam (lib/ e app/) traz a marca KINEO-ADS-FIEL-3-1510, e toda linha de código fora de comentário também', () => {
  const d = diffDoConserto(['-U0', '--no-color'], ['lib', 'app'])
  let arquivo = ''
  let bloco = []
  const semMarca = []
  const fecha = () => { if (bloco.length && !FIEL_3_1510_NOVOS.includes(arquivo) && !bloco.some((l) => l.includes(MARCA))) semMarca.push(arquivo + ': ' + bloco[0].slice(0, 80)); bloco = [] }
  for (const l of d.split('\n')) {
    if (l.startsWith('+++ ')) { fecha(); arquivo = l.slice(6); continue }
    if (l.startsWith('@@')) { fecha(); continue }
    if (!l.startsWith('+') || l.startsWith('+++')) continue
    bloco.push(l)
    const t = l.slice(1).trim()
    const comentario = t.startsWith('//') || t.startsWith('*') || t.startsWith('/**') || t === '*/'
    if (!FIEL_3_1510_NOVOS.includes(arquivo) && t && !comentario && !l.includes(MARCA)) semMarca.push(arquivo + ' (linha): ' + l.slice(0, 80))
  }
  fecha()
  if (semMarca.length) console.log('       ' + semMarca.slice(0, 5).join('\n       '))
  return semMarca.length === 0 && d.includes(MARCA)
})
await check('V3 dinheiro e acesso intocados: v2Billing, v2Tiers, v2StartCore, /start, débito e estorno byte a byte iguais ao pai e fora do diff', () => {
  const f = ['lib/ads/v2Billing.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'lib/credits/debit.ts', 'lib/credits/refund.ts', 'lib/ads/access.ts', 'lib/ads/serverAccess.ts']
  const nomes = diffDoConserto(['--name-only']).split('\n')
  return f.every((p) => base(p) !== null && rd(p) === base(p) && !nomes.includes(p))
})
await check('V4 a trava (reancorado KINEO-ADS-FIEL-VOLTA-1510 — rollback 15/10 noite: reteste Fiel 5 reprovou (exemplo 0.637 copiado, corner_person falso)): o arquivo VIVO traz o modo "internal" uma vez (o "all" do liga sumiu) e o módulo vivo devolve "internal"; desfeitos rollback e liga, este conserto lê exatamente o "internal" de antes', () => {
  const cru = readFileSync(join(ROOT, F.shotLists), 'utf8').replace(/\r\n/g, '\n')
  const SLvivo = pure({ [F.shotLists]: semFiel4_1510(F.shotLists, semFiel5_1510(F.shotLists, cru)) })(F.shotLists)
  return SLvivo.ADS_V2_PRODUCT_LOCK_MODE === 'internal' && cru.split("export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'internal' // KINEO-ADS-FIEL-1510 · KINEO-ADS-FIEL-VOLTA-1510").length === 2 && !cru.includes("export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'all' // KINEO-ADS-FIEL-1510 · KINEO-ADS-FIEL-LIGA-1510") &&
    SL.ADS_V2_PRODUCT_LOCK_MODE === 'internal' && rd(F.shotLists).includes("export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'internal' // KINEO-ADS-FIEL-1510")
})
await check('V5 nenhuma string crua de modelo da OpenAI nas linhas novas (o registro central manda)', () => !/^\+.*['"`](gpt-|o[0-9]-|tts-1|whisper-)/m.test(diffDoConserto(['-U0', '--no-color'], ['lib', 'app'])))

// ═══ M. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um tem de ficar VERMELHO)')
const mut = async (nome, fn) => { naoAplicou = null; const verde = await tenta(fn); if (naoAplicou) { ok(false, `M ${nome} — mutante NÃO aplicou (${naoAplicou})`); return } ok(!verde, `M ${nome}`) }
const SLsrc = rd(F.shotLists), PNGsrc = rd(F.png), SRVsrc = rd(F.server), ADVsrc = rd(F.advance), MONTsrc = rd(F.montage), F3src = rd(F.fiel3), CONsrc = rd(F.contract)
const slMut = (de, para) => pure({ [F.shotLists]: trocar(SLsrc, de, para) })(F.shotLists)
await mut('o recorte volta a sair da foto cortada (servidor ignora a original)', () => g4(loadSrv({ [F.server]: trocar(SRVsrc, 'const falUrl = await runCutout(src.url)', 'const falUrl = await runCutout(lock.url)') })))
await mut('a trava esquece a foto original', () => r1(slMut("return { footageId: product.footage_id, url: product.url.trim(), mode: 'scene', ...original }", "return { footageId: product.footage_id, url: product.url.trim(), mode: 'scene' }")))
await mut('o contrato deixa passar original_footage_id inválido', () => r3(pure({ [F.contract]: trocar(CONsrc, "!isUuid(p.original_footage_id)) return fail('bad_photo_id')", "false) return fail('bad_photo_id')") })(F.contract)))
await mut('teto do 9:16 de volta a 38% (produto gigante)', () => l1(slMut("{ '9:16': 0.28, '4:5': 0.32, '1:1': 0.35 }", "{ '9:16': 0.38, '4:5': 0.32, '1:1': 0.35 }")))
await mut('o lugar ignora os rostos (o 1º candidato sempre)', () => l2(slMut('      if (faceOverlap <= 0) return cand', '      return cand')))
await mut('o lugar ignora a superfície lida (sempre a regra fixa)', () => l2(slMut('const surface = i.layout && adsV2SurfaceUsable(i.layout.surface) ? i.layout.surface : null', 'const surface = null as AdsV2Box | null')))
await mut('sem o vão entre os rostos (balcão com duas pessoas)', () => l2(slMut("if (gap && gap.x1 - gap.x0 >= 2 * half) cxs.push({ side: 'gap', cx: (gap.x0 + gap.x1) / 2 })", 'if (gap && false) cxs.push({ side: \'gap\', cx: 0 })')))
await mut('o lado não muda entre cenas', () => l3(slMut("n % 2 === 0 ? ['right', 'left', 'center'] : ['left', 'right', 'center']", "['right', 'left', 'center']")))
await mut('regra fixa no meio do quadro (onde a pessoa mora)', () => l3(slMut("{ left: 0.27, right: 0.73, center: 0.5 }", "{ left: 0.5, right: 0.5, center: 0.5 }")))
await mut('o PNG ignora o lugar (volta a caixa fixa)', () => g1(pure({ [F.png]: trocar(PNGsrc, "const placed = opts.place && mode === 'scene' ?", "const placed = false && mode === 'scene' ?") })(F.png)))
await mut('o servidor não grava o JSON do lugar', () => g5(loadSrv({ [F.server]: trocar(SRVsrc, '  if (out.placement) await uploadJson(', '  if (false) await uploadJson(') })))
await mut('o avanço não lê a cena (layout sempre null)', () => a1(loadAdvance({ [F.advance]: trocar(ADVsrc, "v && typeof v.adsV2SceneLayout === 'function' ? v.adsV2SceneLayout(sceneUrl) : null", 'null') })))
await mut('o movimento da cena travada sem a proibição de objeto novo', () => w1(slMut("appears anywhere. ${ADS_V2_LOCK_NO_NEW_OBJECT} ${ADS_V2_KEEP_PHRASE}`", "appears anywhere. ${ADS_V2_KEEP_PHRASE}`")))
await mut('a gente da cena volta a "mover-se naturalmente"', () => w1(slMut("'Slow gentle push-in; the people around make only small natural movements (breathing, blinking, a slight smile);", "'Slow gentle push-in; the people around move naturally;")))
await mut('a foto declarada do link não vira produto', () => k1(pure({ [F.fiel3]: trocar(F3src, "return i.adKind === 'product' && i.fromLink === true && i.linkProduct === true && !i.productAlready ? 'product' : before", 'return before') })(F.fiel3)))
await mut('a foto declarada vira produto mesmo com "Um lugar"', () => k1(pure({ [F.fiel3]: trocar(F3src, "return i.adKind === 'product' && i.fromLink", "return i.adKind !== 'nada' && i.fromLink") })(F.fiel3)))
const montMut = (de, para) => pure({ [F.montage]: trocar(MONTsrc, de, para) })(F.montage)
await mut('a fonte volta a 64', () => o1(montMut('export const ADS_V2_OVERLAY_FONT_AT_1080 = 48', 'export const ADS_V2_OVERLAY_FONT_AT_1080 = 64')))
await mut('a faixa de baixo desce para baixo dos botões (90%)', () => o1(montMut("'9:16': { top: 0.15, bottom: 0.8 }", "'9:16': { top: 0.15, bottom: 0.9 }")))
await mut('a frase não desvia do produto e do rosto', () => o4(montMut('if (Array.isArray(s.avoid) && a < end && b > start) out.push(...s.avoid)', 'if (false) out.push(...s.avoid)')))
await mut('a frase perde a centralização (x_alignment)', () => o1(montMut("      x_alignment: '50%', // KINEO-CENTRO-ADS-GANCHO-1410 [TRAVA 8.2 — vai do fundador 14/10] — a frase de tela no MEIO da caixa de 84% (o padrão do Creatomate é a esquerda)\n      width: geo.width,", '      width: geo.width,')))
await mut('a frase do ator volta ao tamanho antigo', () => o5(montMut("font_family: fontFamily, font_size: geoP.font_size, font_weight: '800'", "font_family: fontFamily, font_size: 64, font_weight: '800'")))
await mut('a montagem não lê o JSON das cenas travadas', async () => { const r = await a3(loadAdvance({ [F.advance]: trocar(ADVsrc, '  const avoid = await lockAvoidBoxes(latest)', '  const avoid = new Map<number, AdsV2Box[]>()') })); return r.texts.filter(r.overLocked).every((t) => frac(t.y) < 0.4) && r.texts.filter(r.overLocked).length >= 1 })

console.log(`\n${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
