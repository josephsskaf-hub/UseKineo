// KINEO-ADS-MAO-AJUSTE-1610 — guardião do AJUSTE do plano "pessoa segurando o produto real" (Studio Ads v2, Comercial, só contas internas;
// fora da TRAVA 8.2). Roda com `node scripts/test-ads-produto-na-mao-ajuste-1610.mjs`, sem rede, sem banco, sem fornecedor: os módulos são
// transpilados pelo typescript do repo e rodados com stubs (o mesmo arreio de scripts/test-ads-produto-na-mao-1610.mjs; readFileSync, sem alias @/).
// Base: docs/RESULTADO-T1-PRODUTO-NA-MAO-2026-10-16.md (pessoa viva nota 3; Kling com quadro final congelou e estourou o prazo; juiz aprovou um
// frasco preto; "hotel" virou janela genérica) e docs/RESULTADO-COMPARA-MOVIMENTO-2026-10-16.md (Kling O3 SEM end_image_url: 9/10 em 97 s;
// H3 vivo mas o produto cresce depois de 2,5 s; a boca mexia como se falasse). Nota 8/10 do fundador: "o movimento ainda precisa ser mais natural".
//
// O que prova (1 seção por item):
//   K  o Kling do modo in_hand vai SEM end_image_url (só image_url, prompt, '3', generate_audio false) — puro e no avanço executado;
//   L  o movimento pede "lips closed, not speaking", rosto vivo, dedos na pegada, a regra do produto e "subtle handheld camera… real-time speed";
//   AC UMA ação com propósito por plano, pela categoria do produto (perfume/cosmético/bebida/bolsa/genérico), determinística; a régua anti-invenção aprova;
//   P  prazo do Kling no in_hand ≥ 5 min (os outros modos intocados); ANTES do "travado" consulta a fal (COMPLETED = usa o clipe); o prazo do anúncio;
//   H  plano B no MiniMax H3 (mesmo prompt, direto, sem 2º Kling) cortado em ≤ 2,5 s;
//   J  o juiz compara também cor, MATERIAL e QUANTIDADE; o fluxo refaz → sem rótulo → foto real continua;
//   S  "single product" quando o pedido tem um produto só; os sinais do lugar (hotel = cama, cortina, luminária de cabeceira);
//   D  desfaz exato + ida + marca em todo bloco + encadeamento (o desfaz do produto na mão tira este ajuste primeiro) + travas 'internal';
//   M  mutantes (todos aplicados e vermelhos).
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs' // reancorado KINEO-CLOSE-REAL-1910 — a entrega de 19/10 sai primeiro, em memória
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semMaoAjuste1610, comMaoAjuste1610, desfazMaoAjuste1610, MAO_AJUSTE_1610_ARQUIVOS, MAO_AJUSTE_1610_NOVOS, MAO_AJUSTE_1610_BASE, MARCA_MAO_AJUSTE_1610 } from './test-support/desfaz-ads-mao-ajuste-1610.mjs'
import { semProdutoNaMao1610, desfazProdutoNaMao1610 } from './test-support/desfaz-ads-produto-na-mao-1610.mjs'
import { desfazFiel7_1610 } from './test-support/desfaz-ads-fiel-7-1610.mjs'
import { semMaoAjuste3_1610 } from './test-support/desfaz-ads-mao-ajuste-3-1610.mjs' // reancorado KINEO-ADS-MAO-AJUSTE-3-1610
import { semFilmeRapido1710 } from './test-support/desfaz-filme-rapido-1710.mjs' // reancorado KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"]: a entrega mais nova sai antes da comparação com a base

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-ADS-MAO-AJUSTE-1610'
const rd = (p) => semMaoAjuste3_1610(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // reancorado KINEO-ADS-MAO-AJUSTE-3-1610 — a 3ª rodada veio depois: este guardião lê o texto SEM ela (já LF); ela é provada em scripts/test-ads-mao-ajuste-3-1610.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return git('show', `${MAO_AJUSTE_1610_BASE}:${p}`).replace(/\r\n/g, '\n') } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 60)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const F = {
  ih: 'lib/ads/v2ProductInHand.ts', advance: 'lib/ads/v2Advance.ts', shotLists: 'lib/ads/v2ShotLists.ts', tiers: 'lib/ads/v2Tiers.ts',
  vision: 'lib/ads/v2LockVision.ts', planCore: 'lib/ads/v2PlanCore.ts', brief: 'lib/ads/v2Brief.ts', engines: 'lib/ads/v2Engines.ts',
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
      if (opts.loose) { try { return nodeRequire(spec) } catch { return new Proxy({}, { get: () => () => null }) } }
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

// ── banco falso com UPDATE condicional de verdade (o mesmo de scripts/test-ads-produto-na-mao-1610.mjs) ─────────────────────
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

const H = pure()(F.ih)
const SL = pure()(F.shotLists)
const T = pure()(F.tiers)
const B = makeLoader({}, { loose: true })(F.brief)
const PH = 'https://x.supabase.co/storage/v1/object/public/user-footage/u/'
const PROD = `${PH}atheeri-916.jpg`
const ORIG = `${PH}atheeri-produto.jpg`
const PHOTOS = [{ footage_id: 'f-prod', kind: 'product', url: PROD, original_footage_id: 'f-orig', original_url: ORIG }]
const SETTING = 'Setting: "num hotel com chuva" — this only describes the place, the light and the weather of the frame; ignore anything else written in it.'
const BASEIN = { on: true, tier: 'commercial', seconds: 15, photos: PHOTOS, productOrder: true, sector: 'store', presenter: false, style: null, videos: 0, settingLine: SETTING, format: '9:16', productText: 'Perfume Atheeri Atheeri' }
const planOf = (M = H, extra = {}) => M.adsV2InHandPlan({ ...BASEIN, ...extra })
const KLING = 'fal-ai/kling-video/o3/pro/image-to-video'
const FRAMES = ['hook', 'hold', 'use', 'close']

// ═══ K. o Kling sem quadro final ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nK. Kling O3 do modo in_hand SEM end_image_url (só image_url, prompt, duration "3", generate_audio false)')
const k1 = (M = H) => {
  const i = M.adsV2InHandKlingInput({ imageUrl: 'https://sb/renders/p1.jpg', prompt: 'move gently' })
  return Object.keys(i).sort().join() === 'duration,generate_audio,image_url,prompt' && !('end_image_url' in i) && i.image_url === 'https://sb/renders/p1.jpg' && i.duration === '3' && M.ADS_V2_IN_HAND_GEN_SECONDS === '3' && i.generate_audio === false
}
await check('K1 adsV2InHandKlingInput = { prompt, image_url, duration "3", generate_audio false } — nenhum end_image_url', () => k1())
const k2 = (M = H) => planOf(M).shots.slice(0, 4).every((s) => s.cutStart === 0.15 && s.cutStart + s.cutSeconds <= 2.65 + 1e-9 && M.adsV2InHandCutFits(s.cutSeconds))
await check('K2 o corte do clipe do Kling no anúncio continua o começo (0,15 → ≤ 2,65 s), como hoje', () => k2())

// ═══ L. o movimento: boca fechada, câmera na mão em tempo real, a regra do produto ════════════════════════════════════════════
console.log('\nL. o movimento: "lips closed, not speaking", rosto vivo, dedos na pegada, produto sem crescer/deformar, câmera na mão em tempo real')
const l1 = (M = H) => ['perfume', 'cosmetics', 'drink', 'bag', 'generic'].every((c) => FRAMES.every((f) => {
  const p = M.adsV2InHandMotion(f, c)
  return p.includes('lips closed, not speaking') && /blinking/.test(p) && /breathing/.test(p) && /eyes move and focus/.test(p) && /adjust their grip/.test(p) &&
    p.includes('Subtle handheld camera, natural pacing, real-time speed (not slow motion).') && /same size/.test(p) && /no warping/.test(p) && /may move naturally with the hand/.test(p) && /never grows, morphs/.test(p) &&
    !/Camera almost static|very slow push-in/.test(p) && !/Keep everything exactly as in the photo/.test(p)
})) && planOf(M).shots.slice(0, 4).every((s) => s.prompt.includes('lips closed, not speaking'))
await check('L1 todo plano (5 categorias × 4 enquadramentos) pede "lips closed, not speaking", piscar, respirar, olhar, dedos ajustando a pegada; o produto do mesmo tamanho, sem deformar, pode acompanhar a mão mas nunca cresce; "Subtle handheld camera, natural pacing, real-time speed (not slow motion)"; sem "câmera quase parada" nem "Keep everything"', () => l1())

// ═══ AC. uma ação com propósito por plano ══════════════════════════════════════════════════════════════════════════════════════
console.log('\nAC. UMA ação com propósito por plano, pela categoria do produto (determinística)')
const ESPERA = {
  perfume: { hook: /lifts the perfume toward their face, smells it softly and smiles/, hold: /turns the product slightly to look at the label, then glances back up/, use: /sprays the perfume once on their wrist/, close: /fingers slowly trace the edge of the product/ },
  cosmetics: { hook: /lifts the product toward their face/, hold: /turns the product slightly to look at the label/, use: /applies a small amount on the back of their hand/, close: /trace the edge of the product/ },
  drink: { hook: /takes a small sip/, hold: /turns the drink slightly/, use: /takes a slow sip/, close: /around the drink/ },
  bag: { hook: /swings the bag up onto their shoulder/, hold: /adjusts the bag strap/, use: /walks a few natural steps carrying the bag/, close: /stitching of the bag/ },
  generic: { hook: /brings the product up beside their face/, hold: /turns the product slightly to look at the label/, use: /opens or tries the product/, close: /fingertips slowly trace the edge of the product/ },
}
const ac1 = (M = H) => Object.entries(ESPERA).every(([c, byF]) => FRAMES.every((f) => { const p = M.adsV2InHandMotion(f, c); return byF[f].test(p) && p.includes('One clear, purposeful action in this shot: ') && p === M.adsV2InHandMotion(f, c) })) &&
  Object.keys(ESPERA).every((c) => new Set(FRAMES.map((f) => M.adsV2InHandMotion(f, c))).size === 4)
await check('AC1 cada enquadramento × categoria tem a SUA ação (perfume: cheira / gira o rótulo / borrifa no pulso / dedos no contorno; bebida: gole; bolsa: carrega; cosmético: aplica; genérico) — a mesma entrada dá sempre o mesmo texto; 4 planos, 4 ações', () => ac1())
const CATS = [['Perfume Atheeri', 'perfume'], ['Lattafa fragrância oriental', 'perfume'], ['عطر أثيري', 'perfume'], ['Eau de parfum floral', 'perfume'], ['Hidratante facial com vitamina C', 'cosmetics'], ['Batom matte vermelho', 'cosmetics'], ['Sérum anti-idade', 'cosmetics'],
  ['Cerveja artesanal IPA', 'drink'], ['Suco natural de laranja', 'drink'], ['Café especial em grãos', 'drink'], ['Bolsa de couro feminina', 'bag'], ['Leather backpack', 'bag'], ['Caneca de cerâmica', 'generic'], ['Fone bluetooth', 'generic'], ['', 'generic'], [null, 'generic']]
const ac2 = (M = H) => CATS.every(([t, c]) => M.adsV2InHandCategory(t) === c)
await check('AC2 a categoria sai do texto do produto (pt/en/es/ar, sem acento): perfume, cosmético, bebida, bolsa; o resto é genérico', () => ac2())
const ac3 = (M = H) => {
  const p = planOf(M).shots.slice(0, 4).map((s) => s.prompt)
  const g = planOf(M, { productText: 'Caneca de cerâmica' }).shots.slice(0, 4).map((s) => s.prompt)
  return /smells it softly/.test(p[0]) && /turns the product slightly/.test(p[1]) && /sprays the perfume once on their wrist/.test(p[2]) && /trace the edge/.test(p[3]) && /brings the product up beside their face/.test(g[0]) && /opens or tries the product/.test(g[2]) &&
    JSON.stringify(planOf(M)) === JSON.stringify(planOf(M))
}
await check('AC3 o plano gravado: pedido de perfume = cheira (gancho), gira o rótulo, borrifa no pulso, dedos no contorno; pedido sem categoria = a ação genérica; o mesmo pedido gera o mesmo plano', () => ac3())
const pc = rd(F.planCore)
const ac4 = (src = pc) => { const linha = src.split('\n').find((l) => l.includes('const inHand = ') && l.includes('adsV2InHandPlan(')) ?? ''; return linha.includes("productText: `${sentenceCopy} ${extracted.brief.business ?? ''}`") && linha.includes("on: inHandLib.adsV2InHandOn(reason === 'internal')") }
await check('AC4 o /plan passa o texto do produto (a frase SEM a cena + o negócio) — a cena ("num café") não vira categoria; o interruptor interno intocado', () => ac4())
const ac5 = (M = H) => {
  const all = ['9:16', '4:5', '1:1'].flatMap((f) => CATS.slice(0, 13).flatMap(([t]) => planOf(M, { format: f, productText: t }).shots.flatMap((s) => [s.prompt, s.scenePrompt].filter(Boolean))))
  all.push(M.adsV2InHandScenePrompt({ frame: 'no_label', settingLine: SETTING, singleProduct: true }))
  const issues = B.checkV2Prompts(all, { business: 'Atheeri', product: 'perfume', offer: null, contact: null, facts: [] })
  return issues.length === 0 && all.every((t) => !/\d/.test(t.replace(/\b9:16\b/g, '')))
}
await check('AC5 a régua anti-invenção do /plan (checkV2Prompts) aprova todos os prompts novos (categorias × formatos, "single product", lugar): nenhum número, nenhuma urgência ("only this" não aparece)', () => ac5())

// ═══ H. o plano B no H3 cortado em ≤ 2,5 s ═════════════════════════════════════════════════════════════════════════════════════
console.log('\nH. plano B no MiniMax H3: o MESMO prompt, só os primeiros 2,5 s')
const h1 = (M = H) => M.ADS_V2_IN_HAND_H3_MAX_END <= 2.5 && M.adsV2InHandH3CutStart(2.5) === 0 && M.adsV2InHandH3CutStart(2.0) === 0.15 &&
  M.ADS_V2_IN_HAND_SLOTS.every((s) => { const st = M.adsV2InHandH3CutStart(s.cut); return st >= 0 && st + s.cut <= 2.5 + 1e-9 })
await check('H1 adsV2InHandH3CutStart: o trecho [início, início + corte] termina em ≤ 2,5 s em todo plano (2,5 → 0; 2,0 → 0,15)', () => h1())

// ═══ J. o juiz mais rígido ══════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nJ. o juiz: também COR (corpo e líquido), MATERIAL e QUANTIDADE')
const OK7 = { name: true, colors: true, material: true, shape: true, count: true, hands: true, one_product: true }
const j1 = (M = H) => {
  const q = M.ADS_V2_IN_HAND_JUDGE_QUESTION
  const keys = M.ADS_V2_IN_HAND_JUDGE_KEYS
  const mat = M.adsV2ParseInHandVerdict(JSON.stringify({ ...OK7, material: false }))
  const cnt = M.adsV2ParseInHandVerdict(JSON.stringify({ ...OK7, count: false }))
  const old5 = M.adsV2ParseInHandVerdict(JSON.stringify({ name: true, colors: true, shape: true, hands: true, one_product: true }))
  const st = (v, r) => M.adsV2InHandJudgeStep({ verdict: v, previousReason: r })
  return ['name', 'colors', 'material', 'shape', 'count', 'hands', 'one_product'].every((k) => keys.includes(k) && q.includes(`"${k}"`)) &&
    /\"material\": every part keeps the same material and finish/.test(q) && /clear glass stays clear/.test(q) && /black, opaque or painted body/.test(q) && /color of any liquid inside/.test(q) && /body of the bottle or the package/.test(q) &&
    /\"count\": the SECOND image shows no more product items than the FIRST image/.test(q) && /when in doubt, answer false/.test(q) && !/"name": true,/.test(q) &&
    mat && mat.ok === false && mat.fails.join() === 'material' && cnt && cnt.ok === false && cnt.fails.join() === 'count' && old5 === null && M.adsV2ParseInHandVerdict(JSON.stringify(OK7)).ok === true &&
    st(mat, null) === 'retry' && st(mat, M.ADS_V2_IN_HAND_RETRY_REASON) === 'no_label' && st(mat, M.ADS_V2_IN_HAND_NO_LABEL_REASON) === 'product_photo'
}
await check('J1 a pergunta compara cor do corpo e do líquido, MATERIAL (vidro transparente não vira corpo preto/opaco) e QUANTIDADE (nada a mais); 7 chaves; "na dúvida, false"; material ou quantidade divergente → refaz → sem rótulo → foto real', () => j1())
const VIS = makeLoader({ '@/lib/aiModels': { AI_TEXT_MODELS: { vision: 'modelo-do-registro' } } })(F.vision)
await check('J2 a chamada do juiz: a pergunta nova, 2 imagens em "high" (a 1ª é a foto real), JSON, e espaço para as 7 chaves (max_tokens ≥ 120)', () => {
  const b = VIS.adsV2InHandLabelBody('https://a/real.jpg', 'https://a/gen.jpg')
  const c = b.messages[0].content
  return b.max_tokens >= 120 && c[0].text === H.ADS_V2_IN_HAND_JUDGE_QUESTION && c[1].image_url.url === 'https://a/real.jpg' && c[2].image_url.url === 'https://a/gen.jpg' && c.slice(1).every((x) => x.image_url.detail === 'high') && b.response_format.type === 'json_object'
})

// ═══ S. um produto só e os sinais do lugar ═════════════════════════════════════════════════════════════════════════════════════
console.log('\nS. a foto da cena: "single product" com um produto; os sinais do lugar pedido')
const SINGLE = 'This single product only, with no extra bottles or boxes: it appears exactly once in the frame.'
const s1 = (M = H) => {
  const one = planOf(M).shots.slice(0, 4)
  const two = planOf(M, { photos: [...PHOTOS, { footage_id: 'f-prod2', kind: 'product', url: `${PH}lado.jpg` }] }).shots.slice(0, 4)
  return M.ADS_V2_IN_HAND_SINGLE_PRODUCT === SINGLE && /single product/.test(SINGLE) && /no extra bottles or boxes/.test(SINGLE) && one.every((s) => s.scenePrompt.includes(SINGLE)) && two.every((s) => !s.scenePrompt.includes(SINGLE)) &&
    M.adsV2InHandScenePrompt({ frame: 'no_label', singleProduct: true }).includes(SINGLE) && !M.adsV2InHandScenePrompt({ frame: 'no_label' }).includes(SINGLE)
}
await check('S1 uma foto de produto = "single product, no extra bottles or boxes" nos 4 pedidos de foto (e no enquadramento sem rótulo); duas fotos de produto = sem a frase', () => s1())
const s2 = (M = H) => {
  const hotel = planOf(M).shots[0].scenePrompt
  const set = (x) => M.adsV2InHandSettingLine(x)
  const qualquer = M.adsV2InHandScenePrompt({ frame: 'hold', settingLine: set('um lugar bonito ao entardecer') })
  const sem = M.adsV2InHandScenePrompt({ frame: 'hold' })
  return /neatly made bed/.test(hotel) && /heavy curtains/.test(hotel) && /bedside lamp/.test(hotel) && /never a generic room with only a window/.test(hotel) && hotel.includes(SETTING) &&
    /home kitchen/.test(M.adsV2InHandScenePrompt({ frame: 'hold', settingLine: set('na cozinha de manhã') })) && /a beach: sand/.test(M.adsV2InHandScenePrompt({ frame: 'hold', settingLine: set('praia ao pôr do sol') })) &&
    /a gym/.test(M.adsV2InHandScenePrompt({ frame: 'hold', settingLine: set('academia lotada') })) && /typical objects in view/.test(qualquer) && !/read at a glance/.test(sem) &&
    hotel.indexOf(SETTING) < hotel.indexOf('neatly made bed')
}
await check('S2 "hotel" vira cama arrumada + cortina pesada + luminária de cabeceira (nunca uma janela genérica), logo depois da frase da cena do cliente; cozinha/praia/academia com os objetos delas; lugar sem palavra conhecida = "objetos típicos"; sem lugar = nada', () => s2())

// ═══ P. o prazo do Kling no modo in_hand + a consulta à fal antes do travado (avanço EXECUTADO) ════════════════════════════════
console.log('\nP. prazo: Kling in_hand ≥ 5 min; antes do "travado" a fal de novo; os outros modos intocados')
const p1 = (S = SL) => S.ADS_V2_IN_HAND_VIDEO_STUCK_MS >= 5 * 60 * 1000 && S.ADS_V2_FAST_VIDEO_STUCK_MS === 3.5 * 60 * 1000 && S.ADS_V2_STILL_AT_MS === 6.5 * 60 * 1000 && S.ADS_V2_FAST_IMAGE_STUCK_MS === 2.5 * 60 * 1000 &&
  JSON.stringify(S.ADS_V2_ENGINE_TYPICAL_MS) === JSON.stringify({ kling_o3: 120_000, seedance_20_fast: 120_000, h3: 150_000, pixverse_effect: 90_000, image: 60_000 }) &&
  S.ADS_V2_IN_HAND_ENGINE_TYPICAL_MS.kling_o3 >= 100_000 && S.ADS_V2_IN_HAND_ENGINE_TYPICAL_MS.kling_o3 <= 120_000 && S.ADS_V2_IN_HAND_STILL_AT_MS > S.ADS_V2_IN_HAND_VIDEO_STUCK_MS
await check('P1 o Kling do modo in_hand tem prazo de ≥ 5 min por tentativa (típico 100–120 s); os outros modos ficam com 3,5 min, a foto com 2,5 min, o anúncio com 6,5 min e os típicos de sempre', () => p1())
await check('P1b adsV2FallbackStepTimed com os números de sempre = adsV2FallbackStep (a régua é a mesma; só os números mudam no modo novo)', () => {
  const routes = [(a) => (a >= 3 ? 'h3' : 'kling_o3'), (a) => (a >= 3 ? 'h3' : 'seedance_20_fast'), () => null]
  for (const nextAttempt of [2, 3, 4]) for (const elapsedMs of [0, 60_000, 200_000, 300_000, 380_000, 500_000]) for (const needsImage of [false, true]) for (const stillsUsed of [0, 2]) for (const canStill of [false, true]) for (const skipPrincipal of [false, true]) for (const route of routes) {
    const i = { nextAttempt, maxAttempts: 3, fallbackFrom: 3, elapsedMs, needsImage, stillsUsed, canStill, skipPrincipal, route }
    if (JSON.stringify(SL.adsV2FallbackStep(i)) !== JSON.stringify(SL.adsV2FallbackStepTimed({ ...i, typical: SL.ADS_V2_ENGINE_TYPICAL_MS, stillAtMs: SL.ADS_V2_STILL_AT_MS }))) return false
  }
  return true
})

const U = (n) => `${String(n).padStart(8, '0')}-2222-4333-8444-555555555555`
const ORDER = U(1)
const USER = U(9)
const prov = { events: [], fails: [], submits: [], polls: [], images: [] }
let pollImpl = async () => ({ state: 'processing', url: null })
let curTables = null
class CreatomateSubmitError extends Error { constructor(m, amb) { super(m); this.ambiguous = amb } }
const SH = makeLoader({ '@fal-ai/client': { fal: {} }, '@/lib/falQueue': { FalQueueSubmitError: class extends Error {}, submitFalQueueOnce: async () => 'x' }, '@/lib/cinematic/sceneDisposition': { classifyProviderFailure: () => ({ disposition: 'rejected', reason_class: 'unknown' }) }, '@/lib/renderAssets': { persistRenderAssets: async () => ({}) }, '@/lib/mp4Duration': { probeMp4DurationSeconds: () => 3 }, '@/lib/falAlert': { alertFalExhausted: async () => {}, falErrorText: () => '', looksExhausted: () => false } })('lib/ads/v2Shots.ts')
const lockSrvStub = new Proxy({}, { get: (_, k) => (k === 'then' ? undefined : () => (k === 'adsV2ProductLockEnabled' ? Promise.resolve(true) : Promise.resolve(null))) })
const advStubs = () => ({
  '@/lib/compose': { CreatomateSubmitError, estimateMp3DurationSeconds: () => 9.5, pollCreatomateRender: async () => ({ status: 'rendering', url: null }), submitCreatomateRender: async () => 'cm-1', uploadVoiceoverToSupabase: async () => 'https://sb/voiceovers/v.mp3' },
  '@/lib/lyriaMusic': { getLyriaMusicUrl: async () => null },
  '@/lib/pixabayMusic': { getBackgroundMusicUrl: async () => 'https://sb/music/m.mp3' },
  '@/lib/ttsFallback': { synthesizeTtsFallback: async () => Buffer.alloc(2000), synthesizeElevenVoice: async () => Buffer.alloc(2000) },
  '@/lib/renderAssets': { persistRenderAssets: async (a) => ({ videoUrl: `https://sb/renders/${a.renderId}.mp4`, thumbnailUrl: null, measuredSeconds: 15.1 }) },
  '@/lib/renderProfile': { renderOutputSpecFor: () => ({ width: 1080, height: 1920 }) },
  '@/lib/textLanguage': { captionFontFor: () => 'Montserrat', narrationLanguage: (x) => (typeof x === 'string' && x ? x : null) },
  '@/lib/ads/speakable': { speakableForTts: (t) => t },
  '@/lib/serverEvents': { writeServerEvent: async (e) => { prov.events.push(e); return true } },
  '@/lib/ads/v2Billing': {
    ADS_V2_QUALITY: 'ads_v2',
    confirmAdsV2Debit: async () => ({ ok: true, refunded: false, amount: 41 }),
    failAdsV2Order: async (admin, order, reason) => { const o = curTables.ads_v2_orders.find((x) => x.id === order.id); if (o && (o.status === 'generating' || o.status === 'assembling')) { o.status = 'failed'; o.error = reason; prov.fails.push(reason); return true } return false },
  },
  '@/lib/ads/v2Shots': { ...SH, ADS_V2_KLING_GAP_MS: 0, submitShotOnce: async (model, input) => { prov.submits.push({ model, input }); return { kind: 'accepted', requestId: `req-${prov.submits.length}`, posts: 1 } }, pollFalJob: async (model, id) => { prov.polls.push({ model, id }); return pollImpl(model, id, prov.polls.length) }, persistShotClip: async (a) => ({ storedUrl: `https://sb/renders/${SH.adsV2ShotRenderId(a.orderId, a.idx, a.attempt)}.mp4`, measuredSeconds: 3.04 }), adsV2CancelFalJob: async () => null },
  '@/lib/ads/v2Images': {
    persistAudioCopy: async () => null,
    persistSceneImage: async (a) => `https://sb/renders/${a.orderId}-p${a.idx}-a${a.attempt}-n${prov.images.length}.jpg`,
    pollSceneImage: async () => ({ state: 'done', url: 'https://fal.media/img.jpg' }),
    submitSceneImage: async (sc) => { prov.images.push(sc); return { kind: 'accepted', requestId: `img-${prov.images.length}`, posts: 1 } },
  },
  '@/lib/ads/v2LockVision': { adsV2SceneHasProduct: async () => false, adsV2SceneCheck: async () => null, adsV2InHandLabelJudge: async () => judgeImpl() },
  '@/lib/ads/v2ProductLockServer': lockSrvStub,
  '@/lib/ads/v2ProductInHandServer': { adsV2InHandEnabled: async () => true },
})
let judgeImpl = () => ({ ok: true, fails: [] })
const loadAdvance = (over = {}) => makeLoader(advStubs(), { timers: fastTimers, over })(F.advance)
const A = loadAdvance()
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const DL = () => Date.now() + 60_000
const MIN = 60 * 1000
const reset = () => { prov.events.length = 0; prov.fails.length = 0; prov.submits.length = 0; prov.polls.length = 0; prov.images.length = 0; pollImpl = async () => ({ state: 'processing', url: null }); judgeImpl = () => ({ ok: true, fails: [] }) }
const oldPlan = () => { const p = SL.planShots({ sector: 'store', tier: 'commercial', photos: PHOTOS.map((p) => ({ id: p.footage_id, url: p.url, kind: p.kind })), seconds: 15 }); p.shots = SL.adsV2PackshotShots(p.shots, { photos: PHOTOS.map((p) => ({ id: p.footage_id, url: p.url, kind: p.kind })), productOrder: true }); return p }
const newPlan = (M = H) => { const o = oldPlan(); return { ...o, shots: planOf(M).shots } }
/**
 * Um pedido no meio do caminho: todos os planos prontos, MENOS o idx 1 (o 'hold', corte de 2,5 s) — o Kling dele aceito há `klingAgoMs`. inHand = o plano novo
 * (a marca productInHand); senão, o plano de antes com o idx 0 trocado por um Kling comum (o modo de sempre).
 */
const KIDX = 1 // o plano 'hold' (corte de 2,5 s): o corte do H3 só cabe em 2,5 s se começar no 0
async function meio(Adv, { inHand = true, klingAgoMs, startedAgoMs }) {
  const plan = inHand ? newPlan() : oldPlan()
  const stored = { ...plan, overlays: [{ role: 'brand', start: 0.3, end: 3.9, text: 'Perfume Atheeri' }], narration: 'Atheeri: o perfume que acompanha a sua noite.', ...(inHand ? { productInHand: true } : {}) }
  const order = {
    id: ORDER, user_id: USER, status: 'generating', tier: 'commercial', seconds: 15, sector: 'store', brief: { business: 'Atheeri', kind: 'product' }, language: 'pt', narration: true, card_url: 'https://sb/card.png',
    photos: PHOTOS.map((p) => ({ ...p })), plan: stored, music_url: null, voice_url: null, voice_seconds: null,
    billing_ref: `adsv2-${ORDER}-g`, credits_charged: 41, generation_id: U(2), creatomate_render_id: null, video_id: null, error: null,
    started_at: ago(startedAgoMs), assembly_lease_at: null, assembly_submit_at: null, parent_order_id: null, retake_idx: null, created_at: ago(startedAgoMs), updated_at: ago(startedAgoMs),
  }
  const tables = { ads_v2_orders: [order], ads_v2_shots: [], videos: [] }
  curTables = tables
  const db = fakeDb(tables)
  await db.from('ads_v2_shots').upsert(Adv.buildInitialShotRows(ORDER, 'commercial', stored))
  for (const r of tables.ads_v2_shots) {
    if (r.status === 'skipped_text' || r.status === 'done') continue
    if (r.idx === KIDX) Object.assign(r, { status: 'submitted', engine: 'kling_o3', image_url: 'https://sb/renders/p1-a1-scene.jpg', request_id: 'req-k0', submitted_at: ago(klingAgoMs), updated_at: ago(klingAgoMs) })
    else Object.assign(r, { status: 'done', image_url: r.image_url ?? `https://sb/renders/p${r.idx}.jpg`, stored_url: `https://sb/renders/clip-${r.idx}.mp4`, measured_seconds: 3.04 })
  }
  await Adv.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  await Adv.dispatchAdsV2Shots(db, tables.ads_v2_orders[0], DL())
  const rows0 = tables.ads_v2_shots.filter((r) => r.idx === KIDX).sort((a, b) => a.attempt - b.attempt)
  return { tables, rows0, plan: stored }
}
const p2 = async (Adv = A) => {
  reset()
  const n = await meio(Adv, { inHand: true, klingAgoMs: 4 * MIN, startedAgoMs: 5 * MIN })
  reset()
  const o = await meio(Adv, { inHand: false, klingAgoMs: 4 * MIN, startedAgoMs: 5 * MIN })
  return n.rows0.length === 1 && n.rows0[0].status === 'submitted' && o.rows0[0].status === 'stuck' && o.rows0[0].reason === 'shot_stuck'
}
await check('P2 executado: Kling do produto na mão com 4 min ainda trabalhando NÃO vira "travado" (prazo 5 min); o mesmo Kling no modo de sempre vira "stuck" (3,5 min, intocado)', () => p2())
const p3 = async (Adv = A) => {
  reset()
  pollImpl = async (model, id, n) => (n === 1 ? { state: 'processing', url: null } : { state: 'done', url: 'https://fal.media/kling-pronto.mp4' })
  const r = await meio(Adv, { inHand: true, klingAgoMs: 5.5 * MIN, startedAgoMs: 6.5 * MIN })
  const r0 = r.rows0
  return prov.polls.length === 2 && prov.polls.every((p) => p.model === KLING && p.id === 'req-k0') && r0.length === 1 && r0[0].status === 'done' && r0[0].fal_url === 'https://fal.media/kling-pronto.mp4' &&
    !prov.events.some((e) => e.name === 'ads_v2_shot_fallback') && !prov.submits.some((s) => s.model !== KLING && s.model !== undefined && /h3/i.test(s.model))
}
await check('P3 executado: passado o prazo, o avanço consulta a fal DE NOVO antes do "travado"; COMPLETED = usa o clipe (fica "done" com o clipe, sem foto parada nem reserva)', () => p3())
const H3SLUG = T.ADS_V2_ENGINES.h3.slug
const p4 = async (Adv = A) => {
  reset()
  const r = await meio(Adv, { inHand: true, klingAgoMs: 5.5 * MIN, startedAgoMs: 6.5 * MIN })
  const [a1, nx] = r.rows0
  const h3 = prov.submits.filter((s) => s.model === H3SLUG)
  const planned = r.plan.shots.find((s) => s.idx === KIDX)
  return prov.polls.length === 2 && a1.status === 'stuck' && a1.reason === 'shot_stuck' && nx && nx.attempt === 3 && nx.engine === 'h3' && nx.image_url === a1.image_url &&
    Number(nx.cut_start) + Number(nx.cut_seconds) <= 2.5 + 1e-9 && Number(nx.cut_start) >= 0 && nx.prompt === planned.prompt &&
    h3.length === 1 && h3[0].input.prompt === planned.prompt && !r.rows0.some((x) => x.attempt === 2) && prov.events.some((e) => e.name === 'ads_v2_shot_fallback' && e.metadata.to === 'h3')
}
await check('P4/H2 executado: Kling travado (as duas consultas sem o clipe) → plano B DIRETO no H3 (tentativa 3, sem 2º Kling), a MESMA foto e o MESMO prompt, corte ≤ 2,5 s', () => p4())
const p5 = async (Adv = A) => {
  reset()
  pollImpl = async () => ({ state: 'failed', url: null })
  const r = await meio(Adv, { inHand: true, klingAgoMs: 1 * MIN, startedAgoMs: 2 * MIN })
  const nx = r.rows0[1]
  return r.rows0[0].status === 'failed' && nx && nx.engine === 'h3' && nx.attempt === 3 && Number(nx.cut_start) + Number(nx.cut_seconds) <= 2.5 + 1e-9
}
await check('P5 executado: Kling que FALHOU no produto na mão também vai direto ao H3 (sem 2º Kling), corte ≤ 2,5 s', () => p5())
const p6 = async (Adv = A) => {
  reset()
  const n = await meio(Adv, { inHand: true, klingAgoMs: 2 * MIN, startedAgoMs: 7 * MIN })
  reset()
  const o = await meio(Adv, { inHand: false, klingAgoMs: 2 * MIN, startedAgoMs: 7 * MIN })
  return n.rows0.length === 1 && n.rows0[0].status === 'submitted' && o.rows0.some((x) => x.status === 'skipped_text' && String(x.reason).startsWith('still_fallback'))
}
await check('P6 executado: o prazo do anúncio no produto na mão é 8 min — aos 7 min o Kling segue trabalhando; no modo de sempre, aos 7 min a vaga vira foto parada (6,5 min, intocado)', () => p6())
const k3 = async (Adv = A) => {
  reset()
  const plan = newPlan()
  const stored = { ...plan, overlays: [], narration: 'x', productInHand: true }
  const order = { id: ORDER, user_id: USER, status: 'generating', tier: 'commercial', seconds: 15, sector: 'store', brief: { business: 'Atheeri', kind: 'product' }, language: 'pt', narration: true, card_url: 'https://sb/card.png', photos: PHOTOS, plan: stored, music_url: null, voice_url: null, voice_seconds: null, billing_ref: 'b', credits_charged: 41, generation_id: U(2), creatomate_render_id: null, video_id: null, error: null, started_at: ago(30_000), assembly_lease_at: null, assembly_submit_at: null, parent_order_id: null, retake_idx: null, created_at: ago(30_000), updated_at: ago(30_000) }
  const tables = { ads_v2_orders: [order], ads_v2_shots: [], videos: [] }
  curTables = tables
  const db = fakeDb(tables)
  await db.from('ads_v2_shots').upsert(Adv.buildInitialShotRows(ORDER, 'commercial', stored))
  for (let k = 0; k < 4; k++) { await Adv.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() }); await Adv.dispatchAdsV2Shots(db, tables.ads_v2_orders[0], DL()) }
  const kl = prov.submits.filter((s) => s.model === KLING)
  return kl.length === 4 && kl.every((s) => Object.keys(s.input).sort().join() === 'duration,generate_audio,image_url,prompt' && s.input.duration === '3' && s.input.generate_audio === false && s.input.prompt.includes('lips closed, not speaking')) &&
    prov.images.length === 4 && prov.images.every((i) => i.prompt.includes(SINGLE) && /bedside lamp/.test(i.prompt))
}
await check('K3/S3 executado: o avanço manda os 4 Kling SEM end_image_url (só duration, generate_audio, image_url, prompt) com a boca fechada; as 4 fotos pedem "single product" e os sinais do hotel', () => k3())

// ═══ D. desfaz, marca, encadeamento, travas ═════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, marca, encadeamento, travas "internal"')
await check('D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-ads-mao-ajuste-1610.mjs), é EXATAMENTE a origin/main 5ab986eed; a ida devolve o vivo; os novos existem e não existiam', () =>
  MAO_AJUSTE_1610_ARQUIVOS.length === 7 && MAO_AJUSTE_1610_ARQUIVOS.every((f) => semMaoAjuste1610(f, rd(f)) === base(f) && comMaoAjuste1610(f, base(f)) === rd(f) && !semMaoAjuste1610(f, rd(f)).includes(MARCA)) &&
  MARCA_MAO_AJUSTE_1610 === MARCA && MAO_AJUSTE_1610_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null))
await check('D2 todo bloco do desfaz traz a marca; o diff contra a base só toca os arquivos da lista e os novos (nada de v2Tiers, v2Engines, /start, cobrança, trava)', () => {
  const src = rd('scripts/test-support/desfaz-ads-mao-ajuste-1610.mjs')
  const D = JSON.parse(src.split('\n').find((l) => l.startsWith('const DESFAZ = ')).slice('const DESFAZ = '.length))
  const blocos = Object.values(D).flat()
  const shas = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
  const TOPO = shas[0] || 'HEAD'
  const tocados = git('diff', '--name-only', MAO_AJUSTE_1610_BASE, TOPO).trim().split('\n').filter(Boolean).concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean))
  const permitidos = new Set([...MAO_AJUSTE_1610_ARQUIVOS, ...MAO_AJUSTE_1610_NOVOS])
  return blocos.length > 0 && blocos.every((h) => h.now.join('\n').includes(MARCA)) && tocados.every((f) => permitidos.has(f)) &&
    [F.tiers, F.engines, 'lib/ads/v2StartCore.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2ProductInHandServer.ts', 'lib/ads/v2ProductLockServer.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/plan/route.ts'].every((f) => base(f) === rd(f))
})
await check('D3 encadeamento: o desfaz do produto na mão (sem/desfaz) tira este ajuste PRIMEIRO — e a fiel-7, que já chama o dele, também; null passa igual', () => {
  const adv = rd(F.advance)
  const semEste = semMaoAjuste1610(F.advance, adv)
  return semProdutoNaMao1610(F.advance, adv) === semProdutoNaMao1610(F.advance, semEste) && desfazProdutoNaMao1610(F.advance, adv) === desfazProdutoNaMao1610(F.advance, semEste) &&
    desfazFiel7_1610(F.advance, adv) === desfazFiel7_1610(F.advance, semEste) && desfazProdutoNaMao1610(F.shotLists, rd(F.shotLists)) === base(F.shotLists) &&
    desfazMaoAjuste1610(F.tiers, rd(F.tiers)) === rd(F.tiers) && desfazMaoAjuste1610(F.advance, null) === null && !desfazProdutoNaMao1610(F.ih, rd(F.ih)).includes(MARCA)
})
await check('D4 travas: ADS_V2_IN_HAND_MODE e ADS_V2_PRODUCT_LOCK_MODE continuam "internal"', () => H.ADS_V2_IN_HAND_MODE === 'internal' && SL.ADS_V2_PRODUCT_LOCK_MODE === 'internal')
await check('D5 a lib do plano novo continua SEM import de valor e o avanço a carrega por import dinâmico (os guardiões antigos usam listas fechadas)', () =>
  rd(F.ih).split('\n').filter((l) => /^import /.test(l)).every((l) => /^import type /.test(l)) && !/^import .*v2ProductInHand/m.test(rd(F.advance)) && !/^import .*v2ProductInHand/m.test(rd(F.planCore)))

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const IHsrc = rd(F.ih)
const ADVsrc = rd(F.advance)
const SLsrc = rd(F.shotLists)
const mutIH = (a, b) => pure({ [F.ih]: trocar(IHsrc, a, b) })(F.ih)
const mutSL = (a, b) => pure({ [F.shotLists]: trocar(SLsrc, a, b) })(F.shotLists)
const advIH = (a, b) => loadAdvance({ [F.ih]: trocar(IHsrc, a, b) })
const advSL = (a, b) => loadAdvance({ [F.shotLists]: trocar(SLsrc, a, b) })
const advM = (a, b) => loadAdvance({ [F.advance]: trocar(ADVsrc, a, b) })
const mut = async (m, fn) => { let vermelho = false; try { vermelho = !(await fn()) } catch (e) { vermelho = !/mutante (não aplicou|sem efeito)/.test(String(e && e.message)) } ok(vermelho, 'mutante vermelho: ' + m) }
await mut('o Kling volta a levar o quadro final (end_image_url)', () => k1(mutIH('return { prompt, image_url: image, duration: ADS_V2_IN_HAND_GEN_SECONDS, generate_audio: false }', 'return { prompt, image_url: image, end_image_url: image, duration: ADS_V2_IN_HAND_GEN_SECONDS, generate_audio: false }')))
await mut('o avanço manda o quadro final no Kling', () => k3(advIH('return { prompt, image_url: image, duration: ADS_V2_IN_HAND_GEN_SECONDS, generate_audio: false }', 'return { prompt, image_url: image, end_image_url: image, duration: ADS_V2_IN_HAND_GEN_SECONDS, generate_audio: false }')))
await mut('a boca volta a falar (sem "lips closed")', () => l1(mutIH("export const ADS_V2_IN_HAND_LIPS = 'lips closed, not speaking'", "export const ADS_V2_IN_HAND_LIPS = 'a relaxed mouth'")))
await mut('a câmera volta a ser quase parada / câmera lenta', () => l1(mutIH("export const ADS_V2_IN_HAND_CAMERA = 'Subtle handheld camera, natural pacing, real-time speed (not slow motion).'", "export const ADS_V2_IN_HAND_CAMERA = 'Camera almost static, very slow push-in.'")))
await mut('o produto pode crescer', () => l1(mutIH('it may move naturally with the hand, but it never grows, morphs or turns into another object', 'it may move naturally with the hand')))
await mut('a ação ignora a categoria (todo mundo genérico)', () => ac1(mutIH('const table = ADS_V2_IN_HAND_MOTION_ACTIONS[category] ?? ADS_V2_IN_HAND_MOTION_ACTIONS.generic', 'const table = ADS_V2_IN_HAND_MOTION_ACTIONS.generic')))
await mut('o perfume deixa de borrifar no pulso', () => ac1(mutIH("use: 'the person sprays the perfume once on their wrist and brings the wrist close to smell it'", "use: 'the person holds the perfume'")))
await mut('perfume não é reconhecido (vira genérico)', () => ac2(mutIH("{ category: 'perfume', re:", "{ category: 'generic', re:")))
await mut('o plano não passa a categoria para a ação', () => ac3(mutIH('prompt: adsV2InHandMotion(slot.frame, category),', 'prompt: adsV2InHandMotion(slot.frame),')))
await mut('o /plan não passa o texto do produto', () => ac4(trocar(pc, "productText: `${sentenceCopy} ${extracted.brief.business ?? ''}`", "productText: ''")))
await mut('a frase de um produto só vira "only this…" (a régua anti-invenção recusa o plano)', () => ac5(mutIH("export const ADS_V2_IN_HAND_SINGLE_PRODUCT = 'This single product only, with no extra bottles or boxes: it appears exactly once in the frame.'", "export const ADS_V2_IN_HAND_SINGLE_PRODUCT = 'Only this single product, no extra bottles or boxes.'")))
await mut('o H3 pode usar até 3 s (o produto já cresceu)', () => h1(mutIH('export const ADS_V2_IN_HAND_H3_MAX_END = 2.5', 'export const ADS_V2_IN_HAND_H3_MAX_END = 3.0')))
await mut('o juiz esquece o MATERIAL', () => j1(mutIH("['name', 'colors', 'material', 'shape', 'count', 'hands', 'one_product']", "['name', 'colors', 'shape', 'count', 'hands', 'one_product']")))
await mut('o juiz esquece a QUANTIDADE', () => j1(mutIH("['name', 'colors', 'material', 'shape', 'count', 'hands', 'one_product']", "['name', 'colors', 'material', 'shape', 'hands', 'one_product']")))
await mut('a pergunta do juiz aceita corpo preto no lugar do vidro', () => j1(mutIH('clear glass stays clear and see-through, matte cardboard stays matte cardboard); a black, opaque or painted body where the FIRST image shows clear glass is false.', 'the material may change.')))
await mut('o juiz fica sem espaço para as 7 chaves', () => { const v = makeLoader({ '@/lib/aiModels': { AI_TEXT_MODELS: { vision: 'm' } } }, { over: { [F.vision]: trocar(rd(F.vision), '    max_tokens: 140,', '    max_tokens: 80,') } })(F.vision); return v.adsV2InHandLabelBody('https://a/r.jpg', 'https://a/g.jpg').max_tokens >= 120 })
await mut('a foto esquece o "single product"', () => s1(mutIH("i.singleProduct === true ? ADS_V2_IN_HAND_SINGLE_PRODUCT : ''", "''")))
await mut('o plano não detecta o produto único', () => s1(mutIH("const singleProduct = photos.filter((p) => p && p.kind === 'product').length === 1", 'const singleProduct = false')))
await mut('o "hotel" volta a ser uma janela genérica', () => s2(mutIH("cue: 'a hotel room: a neatly made bed with crisp white sheets, heavy curtains and a bedside lamp'", "cue: 'a room with a window'")))
await mut('a foto esquece os sinais do lugar', () => s2(mutIH("    adsV2InHandPlaceLine(setting) ?? '',", "    '',")))
await mut('o prazo do Kling in_hand volta a 3,5 min', () => p1(mutSL('export const ADS_V2_IN_HAND_VIDEO_STUCK_MS = 5 * 60 * 1000', 'export const ADS_V2_IN_HAND_VIDEO_STUCK_MS = 3.5 * 60 * 1000')))
await mut('o prazo do Kling in_hand volta a 3,5 min (executado)', () => p2(advSL('export const ADS_V2_IN_HAND_VIDEO_STUCK_MS = 5 * 60 * 1000', 'export const ADS_V2_IN_HAND_VIDEO_STUCK_MS = 3.5 * 60 * 1000')))
await mut('o avanço ignora o prazo do modo in_hand', () => p2(advM("ihLate && row.engine === 'kling_o3' ? ADS_V2_IN_HAND_VIDEO_STUCK_MS : ", '')))
await mut('o prazo novo vaza para os outros modos', () => p2(advM("ihLate && row.engine === 'kling_o3' ? ADS_V2_IN_HAND_VIDEO_STUCK_MS : ADS_V2_FAST_VIDEO_STUCK_MS", 'ADS_V2_IN_HAND_VIDEO_STUCK_MS')))
await mut('o avanço não consulta a fal antes do "travado"', () => p3(advM('const again = late && ihLate ? await pollFalJob(', 'const again = false && ihLate ? await pollFalJob(')))
await mut('o avanço consulta a fal mas joga o clipe pronto fora', () => p3(advM('          falUrl = again.url // KINEO-ADS-MAO-AJUSTE-1610', '          return // KINEO-ADS-MAO-AJUSTE-1610')))
await mut('o plano B não corta o H3 em 2,5 s', () => p4(advM("cut_start: inHandVideo && engine === 'h3' ?", "cut_start: false && engine === 'h3' ?")))
await mut('o Kling que falhou tenta o Kling de novo', () => p5(advM('|| inHandVideo, route', ', route')))
await mut('o plano B usa o prazo antigo (vira foto parada em vez do H3)', () => p4(advM('const step = inHandVideo ? adsV2FallbackStepTimed(', 'const step = false ? adsV2FallbackStepTimed(')))
await mut('o anúncio do produto na mão vira foto parada aos 6,5 min', () => p6(advM('(inHandPlan ? adsV2OverdueToStillsAt(', '(false ? adsV2OverdueToStillsAt(')))
await mut('a régua com tempo próprio diverge da de sempre', () => SL.adsV2FallbackStep && (() => { const S = mutSL('const remaining = i.stillAtMs - Math.max(0, i.elapsedMs) // KINEO-ADS-MAO-AJUSTE-1610', 'const remaining = i.stillAtMs // KINEO-ADS-MAO-AJUSTE-1610'); const i = { nextAttempt: 2, maxAttempts: 3, fallbackFrom: 3, elapsedMs: 380_000, needsImage: false, stillsUsed: 0, canStill: true, route: (a) => (a >= 3 ? 'h3' : 'kling_o3') }; return JSON.stringify(S.adsV2FallbackStep(i)) === JSON.stringify(S.adsV2FallbackStepTimed({ ...i, typical: S.ADS_V2_ENGINE_TYPICAL_MS, stillAtMs: S.ADS_V2_STILL_AT_MS })) })())

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
