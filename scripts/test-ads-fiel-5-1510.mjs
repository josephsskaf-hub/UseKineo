// KINEO-ADS-FIEL-5-1510 — guardião do conserto da BASE do produto da trava (Studio Ads v2, reteste pago de 15/10, pedido 08ef80e5; fora da
// TRAVA 8.2). Roda com `node scripts/test-ads-fiel-5-1510.mjs`, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo
// typescript do repo e rodados com stubs (o mesmo banco falso com UPDATE condicional de scripts/test-ads-fiel-4-1510.mjs). Números REAIS do
// reteste (docs/RESULTADO-VALIDACAO-ADS-FIEL-4-2026-10-15.md, quadros em C:\kineo-wt\prints-1610\fiel4-*): T1 (Comercial 9:16, cenas 2-4,
// lados direita · esquerda · direita). O canto reservado funcionou; o que faltou: o Nano Banana pôs o TAMPO do móvel em ~0,59 (cena 2),
// ~0,59 (cena 3) e ~0,71 (cena 4) da altura, e a base colada FIXA em 0,85 deixou o frasco na FRENTE do móvel, não em cima. A conferência
// 'high' ainda devolveu caixas "redondas" (round_boxes 3/3). BASE = o pai do PRIMEIRO commit com a marca.
//
// O que prova (1 seção por item da decisão):
//   T  base NO TAMPO com os números reais (0,59 / 0,59 / 0,71): base = borda + 0,005, mesmo lado e margem, teto de altura, nunca no terço de
//      cima; sem leitura = a base fixa da Fiel 4 (85%) intacta;
//   R  só borda CONFIÁVEL: "redonda" (0,60 · 0,650 · "0.700"), fora de [0,50; 0,93] ou sem corner_surface=true = base fixa;
//   E  teto: não cabe acima do tampo = encolhe até 70%; nem assim = base fixa; subir tocando rosto CONFIÁVEL = base fixa;
//   Q  o pedido da imagem diz a geometria em proporção (tampo nos 15–25% de baixo, borda de cima em ~78%) e aceita o chão/tapete do canto;
//   K  a conferência ('high') pede top_edge_y com 3 casas; a leitura aceita número (ou texto numérico) e nada mais;
//   D  a sombra de contato nasce na NOVA base (no tampo), não mais em 85%;
//   G  servidor: a borda vai ao quadro pela MESMA janela cover; rosto de palpite não derruba o tampo; o mesmo retângulo é conferido e colado;
//   A  avanço executado (servidor REAL, banco e fornecedores falsos): evento com placement.base_source, top_edge_y e check.round;
//   V  desfaz exato + marca em todo bloco + só linhas da Fiel 4 trocadas + dinheiro byte a byte + trava 'internal' no texto deste conserto e 'all' no arquivo vivo (reancorado KINEO-ADS-FIEL-LIGA-1510 — fundador ligou para todos em 15/10) + guardiões antigos
//      encadeados + o plano do reteste;
//   M  mutantes (todos aplicados e vermelhos).
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs' // reancorado KINEO-CLOSE-REAL-1910 — a entrega de 19/10 sai primeiro, em memória
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semFiel5_1510, FIEL_5_1510_ARQUIVOS, FIEL_5_1510_NOVOS, FIEL_5_1510_BASE, MARCA_FIEL_5_1510 } from './test-support/desfaz-ads-fiel-5-1510.mjs'
import { semFielLiga1510 } from './test-support/desfaz-ads-fiel-liga-1510.mjs' // reancorado KINEO-ADS-FIEL-LIGA-1510 — fundador ligou para todos em 15/10; o liga (o mais novo da trava) sai PRIMEIRO, colado no readFileSync, em memória
import { semFilmeRapido1710 } from './test-support/desfaz-filme-rapido-1710.mjs' // reancorado KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"]: a entrega mais nova sai antes da comparação com a base
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-ADS-FIEL-5-1510'
const rd = (p) => semFielLiga1510(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // reancorado KINEO-ADS-FIEL-LIGA-1510 — fundador ligou para todos em 15/10: este guardião lê o texto SEM o liga (semFielLiga1510 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */
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

// Os números REAIS do reteste: o recorte do T1 tem a proporção 273×376; cenas 2, 3 e 4 = direita, esquerda, direita; o tampo desenhado ficou
// em ~0,59, ~0,59 e ~0,71 da altura; os eventos gravaram a base em 1632 px (0,85) nas 3 cenas e o lado direito terminando em 907 px (0,84).
const T1 = { W: 1080, H: 1920, fmt: '9:16', cut: [273, 376], idxs: [2, 3, 4], tops: [0.59, 0.59, 0.71] }
const ladoDe = (k, S = SL) => S.adsV2LockSideFor(S.adsV2LockSceneOrdinal(T1.idxs, T1.idxs[k]))
const lugar = (k, top, S = SL, faces = null) => S.adsV2LockReservedPlace({ frameW: T1.W, frameH: T1.H, cutW: T1.cut[0], cutH: T1.cut[1], format: T1.fmt, side: ladoDe(k, S), topEdgeY: top, faces })
const fixoDe = (k, S = SL) => S.adsV2LockReservedRect({ frameW: T1.W, frameH: T1.H, cutW: T1.cut[0], cutH: T1.cut[1], format: T1.fmt, side: ladoDe(k, S) })
const PALPITE = [box(0.4, 0.3, 0.6, 0.5)] // o rosto "redondo" que a conferência devolveu (round_boxes 3/3 no reteste)

// ═══ T. a base pousa no tampo ════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nT. a base do produto pousa NO tampo lido (números reais do reteste)')
const t1 = (S = SL) => T1.tops.every((top, k) => {
  const p = lugar(k, top, S)
  const r = p.rect
  const fx = fixoDe(k, S)
  const side = ladoDe(k, S)
  const b = (r.y + r.h) / T1.H
  return p.baseSource === 'tabletop' && near(b, top + S.ADS_V2_LOCK_TOP_GAP) && near(p.base, top + 0.005, 1e-4) && (fx.y + fx.h) / T1.H - top > 0.1 &&
    r.h <= S.ADS_V2_LOCK_MAX_H['9:16'] * T1.H + 1 && r.y / T1.H >= 1 / 3 - 1e-9 && r.h <= fx.h && r.w <= fx.w &&
    (side === 'right' ? r.x + r.w === fx.x + fx.w && near((r.x + r.w) / T1.W, 0.84) : r.x === fx.x && near(r.x / T1.W, 0.06))
})
await check('T1 cenas 2, 3 e 4 (tampo em 0,59 · 0,59 · 0,71): a base vai ao tampo + 0,005 (era 0,85, de 14 a 26 pontos ABAIXO dele: na frente do móvel); teto de 28%, nunca no terço de cima; o lado direito segue terminando em 0,84 e o esquerdo começando em 0,06', () => t1())
const t2 = (S = SL) => {
  const p = [lugar(0, 0.59, S), lugar(1, 0.59, S), lugar(2, 0.71, S)]
  return p[0].scale < 1 && p[0].scale >= 0.7 && p[1].scale < p[0].scale && p[2].scale === 1 && p.map((x) => ladoDe(p.indexOf(x), S)).join() === 'right,left,right' &&
    p.every((x) => x.why === null) && (p[2].rect.y + p[2].rect.h) === Math.round(0.715 * T1.H) && p[2].rect.h === fixoDe(2, S).h
}
await check('T2 o tamanho: em 0,71 cabe inteiro (o mesmo de antes); em 0,59 encolhe um pouco (direita 0,99, esquerda 0,93: o alto pararia no terço de cima) e continua ≥ 70%', () => t2())
const t3 = (S = SL) => [null, undefined, Number.NaN].every((v) => { const p = lugar(0, v, S); return p.baseSource === 'fixed' && p.why === 'no_top' && JSON.stringify(p.rect) === JSON.stringify(fixoDe(0, S)) && (p.rect.y + p.rect.h) === 1632 })
await check('T3 sem borda confiável: o retângulo da Fiel 4, intacto (base fixa em 1632 px = 0,85)', () => t3())

// ═══ R. só borda confiável ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nR. a borda só vale se não for "redonda", estiver na faixa e vier com a superfície confirmada')
const r1 = (S = SL) => {
  const tr = (raw, cs = true, frameY) => S.adsV2LockTopEdgeTrust({ raw, frameY, cornerSurface: cs })
  const reais = T1.tops.map((v) => tr(v))
  return reais.every((v) => v.ok && v.why === null) && tr(0.6).why === 'round' && tr(0.65).why === 'round' && tr(0.7).why === 'round' && tr(0.75).why === 'round' && tr(0.601).ok === true && tr(0.6004).why === 'round' &&
    tr(0.437).why === 'out_of_range' && tr(0.957).why === 'out_of_range' && tr(0.499).why === 'out_of_range' && tr(0.931).why === 'out_of_range' && tr(0.501).ok && tr(0.929).ok &&
    tr(0.593, false).why === 'no_surface' && tr(0.593, null).why === 'no_surface' && tr(null).why === 'no_answer' && tr(Number.NaN).why === 'no_answer' &&
    tr(0.587, true, 0.4613).why === 'out_of_range' && tr(0.587, true, 0.6123).ok && tr(0.587, true, 0.6123).y === 0.6123 && tr(0.6, true, 0.6123).why === 'round' && tr(0.587, true, 0.65).ok === true
}
await check('R1 0,59/0,59/0,71 valem; 0,60 · 0,65 · 0,70 · 0,75 ("redondas") não; fora de [0,50; 0,93] não; sem corner_surface=true não; sem resposta não; a faixa vale no QUADRO e o "redondo" na resposta crua', () => r1())
const r2 = (S = SL) => {
  const viaPng = (raw, cs) => PNGof(S).adsV2ReservedLayoutTop({ sceneW: 1080, sceneH: 1920, cutW: 273, cutH: 376, format: '9:16', side: 'right', faces: [], topEdgeY: raw, cornerSurface: cs, trustedFaces: false })
  const red = viaPng(0.6, true), fora = viaPng(0.437, true), semSup = viaPng(0.593, false), bom = viaPng(0.593, true)
  const fx = fixoDe(0, S)
  return [red, fora, semSup].every((x) => x.place.baseSource === 'fixed' && JSON.stringify(x.rect) === JSON.stringify(fx)) && red.top.why === 'round' && fora.top.why === 'out_of_range' && semSup.top.why === 'no_surface' &&
    bom.place.baseSource === 'tabletop' && bom.rect.y + bom.rect.h === Math.round(0.598 * 1920)
}
const PNGof = (S) => (S === SL ? PNG : pure({ [F.shotLists]: S.__src })(F.png))
await check('R2 o valor redondo 0,60 do reteste = base FIXA (1632 px); 0,437 (fora) e corner_surface=false também; 0,593 confiável = base no tampo (1148 px)', () => r2())

// ═══ E. teto ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE. teto de altura, terço de cima e rosto conferido')
const e1 = (S = SL) => {
  const enc = lugar(0, 0.523, S) // direita: cheio = 0,264 da altura; acima do tampo cabem 0,195 → 0,74
  const nao = lugar(0, 0.503, S) // cabem 0,175 → 0,66 < 0,70 → base fixa
  const esq = lugar(1, 0.523, S) // esquerda: cheio = 0,28 → 0,70 por um fio abaixo → base fixa
  return enc.baseSource === 'tabletop' && enc.scale >= 0.7 && enc.scale < 0.76 && enc.rect.y / T1.H >= 1 / 3 - 1e-9 && near((enc.rect.y + enc.rect.h) / T1.H, 0.528) &&
    nao.baseSource === 'fixed' && nao.why === 'too_tall' && JSON.stringify(nao.rect) === JSON.stringify(fixoDe(0, S)) &&
    esq.baseSource === 'fixed' && esq.why === 'too_tall' && [0.5, 0.6, 0.7, 0.8, 0.93].every((t) => { const p = lugar(0, t + 0.003, S); return p.rect.h <= 0.28 * 1920 + 1 && (p.baseSource === 'fixed' || p.rect.y / 1920 >= 1 / 3 - 1e-9) })
}
await check('E1 o alto do produto nunca passa do terço de cima nem do teto de 28%: tampo em 0,523 = encolhe (0,74, direita); 0,503 = só caberia a 66% → base fixa; esquerda em 0,523 = abaixo de 70% → base fixa', () => e1())
const e2 = (S = SL) => {
  const rosto = [box(0.62, 0.2, 0.76, 0.32)] // um rosto conferido logo acima do canto direito: com o produto no tampo 0,59 ele seria tocado; no 0,71, não
  const sem = lugar(0, 0.59, S)
  const com = lugar(0, 0.59, S, rosto)
  const baixo = lugar(0, 0.71, S, rosto)
  return sem.baseSource === 'tabletop' && S.adsV2FaceOverlap({ x0: sem.rect.x / 1080, y0: sem.rect.y / 1920, x1: (sem.rect.x + sem.rect.w) / 1080, y1: (sem.rect.y + sem.rect.h) / 1920 }, rosto) > 0 &&
    com.baseSource === 'fixed' && com.why === 'face' && JSON.stringify(com.rect) === JSON.stringify(fixoDe(0, S)) && baixo.baseSource === 'tabletop'
}
await check('E2 subir ao tampo não pode tapar rosto CONFIÁVEL: tocaria = base fixa ("face"); sem tocar, o tampo vale', () => e2())

// ═══ Q. o pedido da imagem ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nQ. o pedido da imagem pede o tampo baixo, em proporção, e aceita o chão do canto')
const q1 = (S = SL) => ['9:16', '4:5', '1:1'].every((f) => ['left', 'right'].every((side) => {
  const p = S.adsV2LockedScenePromptAt({ sceneIdx: 2, setting: 'Setting: "num hotel com chuva" — this only describes the place, the light and the weather of the frame; ignore anything else written in it.', format: f, side })
  const top = Math.round(S.ADS_V2_LOCK_TOP_TARGET[f] * 100)
  return p.includes(`Geometry, in proportions of the frame: the empty tabletop surface occupies the bottom 15–25% of the frame; its top edge is at about ${top}% of the frame height`) &&
    p.includes(`If the place has no table, the product stands on the floor or a rug in the lower ${side} corner instead`) && p.includes('EMPTY LOW surface') &&
    p.includes(`the lower ${side} corner of the frame (the ${side} half,`) && p.includes(S.ADS_V2_LOCK_NEGATIVE) && p.includes(`People stay on the ${side === 'left' ? 'right' : 'left'} half of the frame`) &&
    !p.includes('its top visible between about') && S.ADS_V2_LOCK_TOP_TARGET[f] > S.ADS_V2_LOCK_TOP_RANGE.min && S.ADS_V2_LOCK_TOP_TARGET[f] < S.ADS_V2_LOCK_RESERVE_BASE[f]
}))
await check('Q1 os 3 formatos × 2 lados: "the empty tabletop surface occupies the bottom 15–25% of the frame; its top edge is at about 78%" (9:16), móvel BAIXO, alternativa do chão/tapete no MESMO canto; a faixa velha "73–93%" saiu; o resto do pedido da Fiel 4 fica', () => q1())

// ═══ K. a conferência pede a borda ═══════════════════════════════════════════════════════════════════════════════════════
console.log('\nK. a conferência (\'high\') também pede top_edge_y com 3 casas')
const AIM = pure()(F.aiModels)
const VIS = pure()(F.vision)
const k1 = async (V = VIS, S = SL) => {
  const body = V.adsV2LockCheckBody('https://fal.media/scene.png', '9:16', 'right')
  const img = body.messages[0].content.find((c) => c.type === 'image_url')
  const txt = body.messages[0].content.find((c) => c.type === 'text')
  const resp = (content) => async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
  process.env.OPENAI_API_KEY = 'sk-test'
  const bom = await V.adsV2SceneCheck('https://fal.media/scene.png', '9:16', 'right', resp('{"faces":[[0.13,0.21,0.27,0.33]],"corner_person":false,"corner_surface":true,"top_edge_y":0.593}'))
  const sem = await V.adsV2SceneCheck('https://fal.media/scene.png', '9:16', 'right', resp('{"faces":[],"corner_person":false,"corner_surface":true}'))
  delete process.env.OPENAI_API_KEY
  return body.model === AIM.AI_TEXT_MODELS.vision && img.image_url.detail === 'high' && body.response_format.type === 'json_object' && txt.text === S.adsV2LockCheckQuestionTop('9:16', 'right') &&
    /TOP EDGE of that empty flat top/.test(txt.text) && /exactly 3 decimal places/.test(txt.text) && /"top_edge_y": number with 3 decimals or null/.test(txt.text) && /region x 0\.5–0\.84, y 0\.52–1/.test(txt.text) &&
    bom && bom.topEdgeY === 0.593 && bom.faces.length === 1 && bom.cornerSurface === true && sem && sem.topEdgeY === null
}
await check('K1 o corpo da conferência leva a pergunta da borda (TOP EDGE, 3 casas, "top_edge_y") em detalhe "high" com o modelo de visão do registro; a resposta chega com topEdgeY', () => k1())
await check('K2 a leitura: número ou texto numérico vale; lixo, lista, booleano = null; sem as chaves da Fiel 4 = null', () => {
  const p = (o) => SL.adsV2ParseLockCheckTop(typeof o === 'string' ? o : JSON.stringify(o))
  return p({ faces: [], corner_person: false, top_edge_y: 0.613 }).topEdgeY === 0.613 && p({ faces: [], corner_person: false, top_edge_y: '0.613' }).topEdgeY === 0.613 &&
    p({ faces: [], corner_person: false, top_edge_y: 'alto' }).topEdgeY === null && p({ faces: [], corner_person: false, top_edge_y: [0.6] }).topEdgeY === null && p({ faces: [], corner_person: false, top_edge_y: true }).topEdgeY === null &&
    p({ faces: [], corner_person: false }).topEdgeY === null && p({ top_edge_y: 0.6 }) === null && p('talvez') === null && p({ faces: [[0.1, 0.2, 0.3, 0.4]], corner_person: true, corner_surface: true, top_edge_y: 0.7 }).faces.length === 1
})

// ═══ D. a sombra encosta na nova base ═══════════════════════════════════════════════════════════════════════════════════
console.log('\nD. a sombra de contato nasce na NOVA base (no tampo)')
const cutout = (() => { const w = 400, h = 600, d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (x >= 120 && x < 280 && y >= 100 && y < 560) { d[o] = 220; d[o + 1] = 200; d[o + 2] = 150; d[o + 3] = 255 } } return { width: w, height: h, data: d } })()
const sceneImg = (w, h, v = [90, 80, 60]) => { const d = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = v[0]; d[i * 4 + 1] = v[1]; d[i * 4 + 2] = v[2]; d[i * 4 + 3] = 255 } return { width: w, height: h, data: d } }
const px = (img, x, y) => { const o = (y * img.width + x) * 4; return [img.data[o], img.data[o + 1], img.data[o + 2]] }
const d1 = (P = PNG) => {
  const trimmed = P.trimCutout(cutout)
  return [['right', 0.59], ['left', 0.71]].every(([side, top]) => {
    const pl = SL.adsV2LockReservedPlace({ frameW: 1080, frameH: 1920, cutW: trimmed.width, cutH: trimmed.height, format: '9:16', side, topEdgeY: top })
    const out = P.adsV2PlacedFramePng(sceneImg(1080, 1920), trimmed, '9:16', pl.rect)
    const img = P.decodePng(out.png)
    const r = out.rect
    const cx = Math.round(r.x + r.w / 2), bottom = r.y + r.h
    const rente = px(img, cx, bottom + 1), velha = px(img, cx, 1633), meio = px(img, cx, Math.round(r.y + r.h / 2))
    return pl.baseSource === 'tabletop' && JSON.stringify(r) === JSON.stringify(pl.rect) && out.shade && out.shade.contact === true && rente[0] < 90 && velha[0] === 90 && meio[0] > 150 && bottom < 1500
  })
}
await check('D1 o quadro travado com a base no tampo: a sombra de contato escurece RENTE à nova base (0,595 / 0,715) e não toca mais a linha velha de 85% (1633 px); o recorte REAL no retângulo decidido', () => d1())

// ═══ G. servidor ═════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG. servidor: a borda vai ao quadro pela janela cover; palpite de rosto não derruba o tampo')
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
const fin = (S, extra) => S.adsV2FinishReservedScene({ userId: USER, orderId: ORDER, idx: 2, attempt: 1, lock: LOCK, format: '9:16', sceneUrl: 'https://fal.media/scene.png', side: 'right', previous: null, ...extra })
const esperado = (top, side = 'right') => SL.adsV2LockReservedPlace({ frameW: 1080, frameH: 1920, cutW: TRIM.width, cutH: TRIM.height, format: '9:16', side, topEdgeY: top }).rect
const g1 = async (S = SRV) => {
  const tampo = await fin(S, { check: { faces: PALPITE, cornerPerson: false, cornerSurface: true, topEdgeY: 0.59 } })
  const redondo = await fin(S, { check: { faces: PALPITE, cornerPerson: false, cornerSurface: true, topEdgeY: 0.6 } })
  const semBorda = await fin(S, { check: { faces: PALPITE, cornerPerson: false, cornerSurface: true } })
  const img = PNG.decodePng(storage.get(pub(`${USER}/adsv2-${ORDER}-p2-a1-lock.png`)))
  const fx = SL.adsV2LockReservedRect({ frameW: 1080, frameH: 1920, cutW: TRIM.width, cutH: TRIM.height, format: '9:16', side: 'right' })
  return tampo.busy === false && JSON.stringify(tampo.rect) === JSON.stringify(esperado(0.59)) && tampo.placement.base_source === 'tabletop' && tampo.placement.top_edge_y === 0.59 && tampo.placement.top_edge_why === null &&
    tampo.trust.why === 'round_boxes' && tampo.placement.source === 'reserved' && tampo.placement.side === 'right' && tampo.shade.contact === true &&
    redondo.placement.base_source === 'fixed' && redondo.placement.top_edge_why === 'round' && JSON.stringify(redondo.rect) === JSON.stringify(fx) && redondo.placement.base === 0.85 &&
    semBorda.placement.base_source === 'fixed' && semBorda.placement.top_edge_why === 'no_answer' && semBorda.placement.top_edge_y === null && img.width === 1080
}
await check('G1 servidor: tampo 0,59 confiável = base no tampo (placement.base_source "tabletop", top_edge_y 0,59) mesmo com rosto de palpite ("round_boxes"); 0,60 redondo e sem borda = base fixa 0,85 com o porquê', () => g1())
const g2 = async (S = SRV) => {
  srvCalls.uploads.length = 0
  const out = await fin(S, { sceneUrl: 'https://fal.media/tall.png', check: { faces: [], cornerPerson: false, cornerSurface: true, topEdgeY: 0.587 } })
  const yQ = (0.587 * 1200 - (1200 - 600 / (1080 / 1920)) / 2) / (600 / (1080 / 1920)) // a MESMA janela cover do quadro
  const img = PNG.decodePng(storage.get(pub(`${USER}/adsv2-${ORDER}-p2-a1-lock.png`)))
  const r = out.rect
  const cx = Math.round(r.x + r.w / 2)
  return out.busy === false && near(out.placement.top_edge_y, yQ, 1e-4) && Math.abs(out.placement.top_edge_y - 0.587) > 0.01 && JSON.stringify(r) === JSON.stringify(esperado(Math.round(yQ * 10000) / 10000)) &&
    px(img, cx, r.y + r.h + 1)[0] < 90 && px(img, cx, 1633)[0] === 90 && srvCalls.uploads.some((p) => /-lock\.png$/.test(p))
}
await check('G2 cena 600×1200 (mais estreita que 9:16): a borda 0,587 da IMAGEM vai ao QUADRO pela mesma janela cover (0,598); o retângulo conferido é o colado e a sombra encosta na base dele', () => g2())
const g3 = async (S = SRV) => {
  const sobre = [box(0.62, 0.36, 0.76, 0.46)] // um rosto que cairia sobre o produto no tampo
  const palpite = await fin(S, { check: { faces: [box(0.6, 0.35, 0.75, 0.45)], cornerPerson: false, cornerSurface: true, topEdgeY: 0.59 } }) // redondo: não confiável
  const medido = await fin(S, { check: { faces: [box(0.618, 0.362, 0.757, 0.457)], cornerPerson: false, cornerSurface: true, topEdgeY: 0.59 } }) // confiável: tocaria
  return SL.adsV2LockBoxRound(box(0.6, 0.35, 0.75, 0.45)) && sobre && palpite.busy === false && palpite.placement.base_source === 'tabletop' && palpite.trust.trusted === false &&
    medido.trust.trusted === true && (medido.busy === true ? medido.problem === 'person' : medido.placement.base_source === 'fixed' && medido.placement.top_edge_why === 'face')
}
await check('G3 rosto de PALPITE (redondo) sobre o tampo não derruba o tampo; rosto MEDIDO que o produto no tampo tocaria = base fixa ("face") — ou, se tocar até na fixa, o canto ocupado de sempre', () => g3())

// ═══ A. avanço executado (servidor REAL) ═════════════════════════════════════════════════════════════════════════════════
console.log('\nA. avanço executado: evento com placement.base_source, top_edge_y e check.round')
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
const a1 = async (Adv = A) => {
  reset()
  const tops = { right: 0.593, left: 0.6 } // direita: tampo confiável; esquerda: "redondo" (o palpite)
  vision.check = async (u, f, side) => ({ faces: PALPITE, cornerPerson: false, cornerSurface: true, topEdgeY: tops[side] })
  const w = world()
  await w.db.from('ads_v2_shots').upsert(Adv.buildInitialShotRows(ORDER, w.order.tier, w.order.plan))
  await Adv.dispatchAdsV2Shots(w.db, w.order, DL())
  const prompts = prov.images.map((im) => im.prompt)
  await Adv.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  const locked = prov.events.filter((e) => e.name === 'ads_v2_product_locked').sort((a, b) => a.metadata.idx - b.metadata.idx)
  const sides = locked.map((e) => e.metadata.placement.side)
  return locked.length === 3 && sides.join() === 'right,left,right' &&
    locked.every((e) => e.metadata.check.round === true && e.metadata.check.why === 'round_boxes' && e.metadata.placement.source === 'reserved' && e.metadata.shade.contact === true) &&
    locked.every((e) => (e.metadata.placement.side === 'right' ? e.metadata.placement.base_source === 'tabletop' && e.metadata.placement.top_edge_y === 0.593 && e.metadata.check.top_edge_raw === 0.593 && e.metadata.rect.y + e.metadata.rect.h === Math.round(0.598 * 1920)
      : e.metadata.placement.base_source === 'fixed' && e.metadata.placement.top_edge_why === 'round' && e.metadata.rect.y + e.metadata.rect.h === 1632)) &&
    prompts.length === 3 && prompts.every((p) => /the empty tabletop surface occupies the bottom 15–25% of the frame; its top edge is at about 78% of the frame height/.test(p)) && prov.refunds === 0
}
await check('A1 T1 (Comercial 9:16) com o palpite de rosto do reteste: o evento ads_v2_product_locked grava placement.base_source ("tabletop" na direita, 0,593; "fixed" na esquerda, 0,60 redondo), top_edge_y e check.round=true; o pedido de cada cena traz a geometria', () => a1())
await check('A2 conferência que cai (null): base fixa em toda cena, check.round=false e top_edge_why "no_answer"', async () => {
  reset()
  const w = world()
  await w.db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, w.order.tier, w.order.plan))
  await A.dispatchAdsV2Shots(w.db, w.order, DL())
  await A.advanceAdsV2Order(w.db, ORDER, { deadlineMs: DL() })
  const locked = prov.events.filter((e) => e.name === 'ads_v2_product_locked')
  return locked.length === 3 && locked.every((e) => e.metadata.placement.base_source === 'fixed' && e.metadata.placement.top_edge_why === 'no_answer' && e.metadata.check.round === false && e.metadata.rect.y + e.metadata.rect.h === 1632)
})
globalThis.fetch = realFetch

// ═══ V. desfaz, marca, dinheiro, trava, guardiões antigos ══════════════════════════════════════════════════════════════
console.log('\nV. desfaz, marca, dinheiro, trava ainda "internal", guardiões antigos encadeados')
await check('V1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-ads-fiel-5-1510.mjs), é EXATAMENTE o pai do commit; a base do desfaz é esse pai', () =>
  FIEL_5_1510_ARQUIVOS.length === 12 && FIEL_5_1510_ARQUIVOS.every((f) => semFiel5_1510(f, rd(f)) === base(f)) && FIEL_5_1510_NOVOS.length === 0 && MARCA_FIEL_5_1510 === MARCA && (BASE === 'HEAD' || FIEL_5_1510_BASE === BASE))
await check('V2 todo bloco novo nos arquivos de produto (lib/ e app/) traz a marca KINEO-ADS-FIEL-5-1510 (e toda linha de código fora de comentário também); só linhas da Fiel 4 foram trocadas', () => {
  const d = diffDoConserto(['-U0', '--no-color'], ['lib', 'app'])
  let arquivo = ''
  let bloco = []
  const semMarca = []
  const removidasAlheias = []
  const fecha = () => { if (bloco.length && !bloco.some((l) => l.includes(MARCA))) semMarca.push(arquivo + ': ' + bloco[0].slice(0, 80)); bloco = [] }
  for (const l of d.split('\n')) {
    if (l.startsWith('+++ ')) { fecha(); arquivo = l.slice(6); continue }
    if (l.startsWith('@@')) { fecha(); continue }
    if (l.startsWith('-') && !l.startsWith('---')) { if (!l.includes('KINEO-ADS-FIEL-4-1510')) removidasAlheias.push(arquivo + ': ' + l.slice(0, 80)); continue }
    if (!l.startsWith('+') || l.startsWith('+++')) continue
    bloco.push(l)
    const t = l.slice(1).trim()
    const comentario = t.startsWith('//') || t.startsWith('*') || t.startsWith('/**') || t === '*/'
    if (t && !comentario && !l.includes(MARCA)) semMarca.push(arquivo + ' (linha): ' + l.slice(0, 80))
  }
  fecha()
  if (semMarca.length) console.log('       ' + semMarca.slice(0, 5).join('\n       '))
  if (removidasAlheias.length) console.log('       ' + removidasAlheias.slice(0, 5).join('\n       '))
  const nomes = diffDoConserto(['--name-only'], ['lib', 'app']).split('\n').filter(Boolean)
  return semMarca.length === 0 && removidasAlheias.length === 0 && d.includes(MARCA) && nomes.every((n) => ['lib/ads/v2Advance.ts', 'lib/ads/v2LockVision.ts', 'lib/ads/v2Png.ts', 'lib/ads/v2ProductLockServer.ts', 'lib/ads/v2ShotLists.ts'].includes(n))
})
await check('V3 dinheiro e acesso intocados: v2Billing, v2Tiers, v2StartCore, /start, débito e estorno byte a byte iguais ao pai e fora do diff', () => {
  const f = ['lib/ads/v2Billing.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'lib/credits/debit.ts', 'lib/credits/refund.ts', 'lib/ads/access.ts', 'lib/ads/serverAccess.ts']
  const nomes = diffDoConserto(['--name-only']).split('\n')
  return f.every((p) => base(p) !== null && rd(p) === base(p) && !nomes.includes(p))
})
await check('V4 a trava (reancorado KINEO-ADS-FIEL-VOLTA-1510 — rollback 15/10 noite: reteste Fiel 5 reprovou (exemplo 0.637 copiado, corner_person falso)): o arquivo VIVO traz o modo "internal" uma vez (o "all" do liga sumiu) e o módulo vivo devolve "internal"; desfeitos rollback e liga, este conserto lê exatamente o "internal" de antes', () => {
  const cru = readFileSync(join(ROOT, F.shotLists), 'utf8').replace(/\r\n/g, '\n')
  const SLvivo = pure({ [F.shotLists]: cru })(F.shotLists)
  return SLvivo.ADS_V2_PRODUCT_LOCK_MODE === 'internal' && cru.split("export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'internal' // KINEO-ADS-FIEL-1510 · KINEO-ADS-FIEL-VOLTA-1510").length === 2 && !cru.includes("export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'all' // KINEO-ADS-FIEL-1510 · KINEO-ADS-FIEL-LIGA-1510") &&
    SL.ADS_V2_PRODUCT_LOCK_MODE === 'internal' && rd(F.shotLists).includes("export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'internal' // KINEO-ADS-FIEL-1510")
})
await check('V5 nenhuma string crua de modelo da OpenAI nas linhas novas (o registro central manda)', () => !/^\+.*['"`](gpt-|o[0-9]-|tts-1|whisper-)/m.test(diffDoConserto(['-U0', '--no-color'], ['lib', 'app'])))
await check('V6 os guardiões antigos da trava leem os arquivos SEM este conserto (desfaz encadeado): fiel-1510, fiel-2, fiel-3, fiel-4, lista, refação do ator, demo Universo', () =>
  ['scripts/test-ads-fiel-1510.mjs', 'scripts/test-ads-fiel-2-1510.mjs', 'scripts/test-ads-fiel-3-1510.mjs', 'scripts/test-ads-fiel-4-1510.mjs', 'scripts/test-ads-lista-1510.mjs', 'scripts/test-ads-refacao-ator-1410.mjs', 'scripts/test-ads-demo-universo-1410.mjs']
    .every((f) => { const s = rd(f); return s.includes("import { semFiel5_1510 } from './test-support/desfaz-ads-fiel-5-1510.mjs'") && /semFiel5_1510\((p|rel), (fs\.)?readFileSync\(/.test(s) }))
await check('V7 o plano do reteste existe: só o T1 (41 cr), dry-run antes, sem virar para "all", com o critério do tampo', () => {
  const p = 'docs/PLANO-VALIDACAO-ADS-FIEL-5-1510.md'
  if (!existsSync(join(ROOT, p))) return false
  const s = rd(p)
  return /Só o T1/.test(s) && /41 cr/.test(s) && /dry-run/i.test(s) && /'internal'/.test(s) && /08ef80e5/.test(s) && /base_source/.test(s) && /top_edge_y/.test(s) && /check\.round/.test(s)
})

// ═══ M. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um tem de ficar VERMELHO)')
const mut = async (nome, fn) => { naoAplicou = null; const verde = await tenta(fn); if (naoAplicou) { ok(false, `M ${nome} — mutante NÃO aplicou (${naoAplicou})`); return } ok(!verde, `M ${nome}`) }
const SLsrc = rd(F.shotLists), PNGsrc = rd(F.png), SRVsrc = rd(F.server), ADVsrc = rd(F.advance), VISsrc = rd(F.vision)
const slMut = (de, para) => { const src = trocar(SLsrc, de, para); const m = pure({ [F.shotLists]: src })(F.shotLists); m.__src = src; return m }
const pngMut = (de, para) => pure({ [F.png]: trocar(PNGsrc, de, para) })(F.png)
await mut('o valor "redondo" volta a ser aceito', () => r1(slMut("  if (adsV2LockTopRound(raw)) return { ok: false, y: y4, why: 'round' } // KINEO-ADS-FIEL-5-1510", '  // KINEO-ADS-FIEL-5-1510')))
await mut('a faixa [0,50; 0,93] some', () => r1(slMut('  if (y < ADS_V2_LOCK_TOP_RANGE.min || y > ADS_V2_LOCK_TOP_RANGE.max) return { ok: false', '  if (false) return { ok: false')))
await mut('a borda vale sem corner_surface=true', () => r1(slMut("  if (i.cornerSurface !== true) return { ok: false, y: y4, why: 'no_surface' }", "  if (false) return { ok: false, y: y4, why: 'no_surface' }")))
await mut('o "redondo" passa a ser julgado no quadro (não na resposta crua)', () => r1(slMut('  if (adsV2LockTopRound(raw)) return', '  if (adsV2LockTopRound(y)) return')))
await mut('a base ignora o tampo (sempre fixa)', () => t1(slMut('  if (top === null || top < ADS_V2_LOCK_TOP_RANGE.min', '  if (true || top < ADS_V2_LOCK_TOP_RANGE.min')))
await mut('sem a folga: a base fica NA linha da borda', () => t1(slMut('export const ADS_V2_LOCK_TOP_GAP = 0.005', 'export const ADS_V2_LOCK_TOP_GAP = 0.03')))
await mut('o lado direito não fica preso à margem (sai da coluna livre dos botões)', () => t1(slMut("const x = i.side === 'left' ? fixed.x : fixed.x + fixed.w - w", 'const x = fixed.x')))
await mut('o terço de cima deixa de ser teto', () => e1(slMut('export const ADS_V2_LOCK_TOP_CEIL = 1 / 3', 'export const ADS_V2_LOCK_TOP_CEIL = 0')))
await mut('o piso de 70% some (encolhe sem limite)', () => e1(slMut('export const ADS_V2_LOCK_TOP_MIN_SCALE = 0.7', 'export const ADS_V2_LOCK_TOP_MIN_SCALE = 0')))
await mut('subir ao tampo pode tapar rosto conferido', () => e2(slMut("  if (adsV2FaceOverlap({ x0: x / W, y0: y / H, x1: (x + w) / W, y1: (y + h) / H }, faces) > 0) return keep('face')", "  if (false) return keep('face')")))
await mut('o pedido da imagem perde a geometria em proporção', () => q1(slMut('    `Geometry, in proportions of the frame: the empty tabletop surface', '    `Geometry: the tabletop surface')))
await mut('o pedido da imagem perde a alternativa do chão/tapete', () => q1(slMut('    `If the place has no table, the product stands on the floor or a rug in the lower ${side} corner instead:', '    `If the place has no table:')))
await mut('a conferência volta à pergunta da Fiel 4 (sem a borda)', () => k1(pure({ [F.vision]: trocar(VISsrc, "text: adsV2LockCheckQuestionTop(format, side) }", "text: adsV2LockCheckQuestion(format, side) }") })(F.vision)))
await mut('a conferência volta à leitura da Fiel 4 (perde topEdgeY)', () => k1(pure({ [F.vision]: trocar(VISsrc, 'return adsV2ParseLockCheckTop(j?.choices', 'return adsV2ParseLockCheck(j?.choices') })(F.vision)))
await mut('a sombra de contato some do quadro com base no tampo', () => d1(pngMut("const shade = adsV2ShadeAndMatch(frame, piece, rect, 'scene') // KINEO-ADS-FIEL-5-1510", "const shade = adsV2ShadeAndMatch(frame, piece, rect, 'holds') // KINEO-ADS-FIEL-5-1510")))
await mut('a borda não passa pela janela cover', () => (async () => { globalThis.fetch = fakeFetch; const S = makeLoader(srvStubs, { over: { [F.png]: trocar(PNGsrc, 'frameY: adsV2TopEdgeToFrame(raw, i.sceneH, win)', 'frameY: raw') } })(F.server); const r = await g2(S); globalThis.fetch = realFetch; return r })())
await mut('rosto de palpite derruba o tampo (trustedFaces sempre)', () => (async () => { globalThis.fetch = fakeFetch; const r = await g3(loadSrv({ [F.server]: trocar(SRVsrc, 'trustedFaces: trust.trusted })', 'trustedFaces: true })') })); globalThis.fetch = realFetch; return r })())
await mut('o servidor cola na base fixa (o retângulo velho)', () => (async () => { globalThis.fetch = fakeFetch; const r = await g1(loadSrv({ [F.server]: trocar(SRVsrc, 'const out = adsV2PlacedFramePng(scene, cut, args.format, at.rect)', 'const out = adsV2ReservedFramePng(scene, cut, args.format, args.side)') })); globalThis.fetch = realFetch; return r })())
await mut('o servidor ignora a borda lida', () => (async () => { globalThis.fetch = fakeFetch; const r = await g1(loadSrv({ [F.server]: trocar(SRVsrc, 'topEdgeY: args.check ? args.check.topEdgeY ?? null : null,', 'topEdgeY: null,') })); globalThis.fetch = realFetch; return r })())
await mut('o evento perde placement.base_source', () => (async () => { globalThis.fetch = fakeFetch; const S = loadSrv({ [F.server]: trocar(SRVsrc, 'faceOverlap, base_source: at.place.baseSource,', 'faceOverlap,') }); const r = await a1(loadAdvance({}, S)); globalThis.fetch = realFetch; return r })())
await mut('o evento perde check.round', () => (async () => { globalThis.fetch = fakeFetch; const r = await a1(loadAdvance({ [F.advance]: trocar(ADVsrc, ', round: !!check && Array.isArray(check.faces) && check.faces.some(adsV2LockBoxRound),', ',') })); globalThis.fetch = realFetch; return r })())
globalThis.fetch = realFetch

console.log(`\n${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
