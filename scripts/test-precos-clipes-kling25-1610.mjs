// KINEO-PRECOS-CLIPES-KLING25-1610 — guardião da decisão de preço do fundador (15/10, "Sim para as 3"),
// docs/CONTA-STUDIO-E-MARGEM-CLIPES-2026-10-16.md:
//   1. CLIPES: o piso de 40% da régua de mercado passa a ser medido no crédito do Creator MENSAL (o plano que compra),
//      LIDO de lib/checkoutPricing.ts (CHEAPEST_PLAN_USD_PER_CREDIT, derivado de TIER_PRICES/TIER_CREDITS) — nunca digitado.
//      Kling 3 6/8/11/16 → 8/10/15/22 · Veo 6/8 → 8/11 · Kling 2.5 10 s 7 → 9 · H3 7/10/15 s 5/7/10 → 6/8/12 ·
//      Seedance 2.5 8/11/16/24 → 14/20/28/42. O resto não muda.
//   2. STUDIO: intocado (US$ 54,90 / 300 cr; anual US$ 460).
//   3. FILME DO KLING 2.5: 60 → 75 créditos em todos os espelhos.
// Provas (EXECUTANDO os módulos, estilo readFileSync + transpile): (P1) tabela nova e o que não muda; (P2) margem ≥ 40% no
// Creator mensal em TODA combinação motor × duração × (texto, foto), nos efeitos e no Modo Clipe; (P3) o piso é LIDO de
// checkoutPricing (sem número digitado); (P4) Kling 2.5 = 75 em engineCost, clipPricing, rota cinematográfica e na régua
// por duração; pior caso de checkoutPricing reconferido; (P5) Studio intocado; (P6) quem já tem render em andamento é
// liquidado pelo custo gravado no nascimento e o estorno devolve o DEBITADO; (P7) mutantes — cada um tem de ficar vermelho.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

process.env.NODE_ENV = 'production' // checkoutPricing roda os invariantes no import fora de produção; aqui eles são chamados à mão.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const PRICE = 'lib/clips/clipPricing.ts'
const MARKET = 'lib/clips/clipPriceVsMarket.ts'
const CHECKOUT = 'lib/checkoutPricing.ts'
const COST = 'lib/credits/engineCost.ts'
const ROUTE = 'app/api/generate-video-cinematic/route.ts'
const STATUS = 'app/api/compose/status/[renderId]/route.ts'
const MARKETING = 'lib/marketingPrice.ts'
const SHOT = 'lib/cinematic/shotSpec.ts'

// Carrega módulos com imports '@/…' e relativos; `over` troca o fonte de um arquivo (mutante).
function loadSet(over = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const src = over[rel] ?? read(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (p) => {
      if (p.startsWith('@/')) return load(p.slice(2) + '.ts')
      if (p.startsWith('./') || p.startsWith('../')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(rel), p)) + '.ts')
      throw new Error(`${rel}: import inesperado ${p}`)
    }
    new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
    return mod.exports
  }
  return {
    price: load(PRICE), mk: load(MARKET), cat: load('lib/clips/clipCatalog.ts'), fx: load('lib/clips/clipEffects.ts'),
    cp: load(CHECKOUT), cost: load(COST),
  }
}
const src = (over, rel) => over[rel] ?? read(rel)

// ─── A decisão (15/10) ───────────────────────────────────────────────────────
const NEW_TABLE = {
  hollywood: { 5: 8, 7: 10, 10: 15, 15: 22 },
  veo: { 6: 8, 8: 11 },
  kling: { 5: 5, 10: 9 },
  h3: { 5: 5, 7: 6, 10: 8, 15: 12 },
  s25: { 5: 14, 7: 20, 10: 28, 15: 42 },
  seedance: { 5: 5, 7: 5, 10: 5, 12: 5 },
  omni: { 5: 12, 7: 17, 10: 23 },
}
const OLD_TABLE = { // origin/main c9199975 — para o relatório e para provar que só as 14 combinações aprovadas mexeram
  hollywood: { 5: 6, 7: 8, 10: 11, 15: 16 },
  veo: { 6: 6, 8: 8 },
  kling: { 5: 5, 10: 7 },
  h3: { 5: 5, 7: 5, 10: 7, 15: 10 },
  s25: { 5: 8, 7: 11, 10: 16, 15: 24 },
  seedance: { 5: 5, 7: 5, 10: 5, 12: 5 },
  omni: { 5: 12, 7: 17, 10: 23 },
}
const FLOOR = 0.4
const KLING25_FILM = 75
const STUDIO = { usd: 5490, credits: 300, annualUsd: 46000 }

function creatorMonthly(cp) { return cp.TIER_PRICES.basic.usd / 100 / cp.TIER_CREDITS.basic }
function creatorAnnual(cp) { return cp.ANNUAL_PRICES.basic.usd / 100 / 12 / cp.TIER_CREDITS.basic }
function falOf(price, mk, engine, s) {
  return Math.max(price.CLIP_COSTS[engine].usdPerSecond, mk.ENGINE_MARKET[engine].falUsdPerSecond) * s
}

// P1 — a tabela nova, combinação a combinação, e nada além das 13 aprovadas muda.
function tableProblems({ price, cat }) {
  const p = []
  for (const engine of cat.CLIP_ENGINE_ORDER) {
    const want = NEW_TABLE[engine]
    const offered = cat.offeredSecondsFor(engine)
    if (offered.join(',') !== Object.keys(want).join(',')) p.push(`${engine}: durações oferecidas ${offered} ≠ tabela ${Object.keys(want)}`)
    for (const s of offered) {
      for (const withImage of [false, true]) {
        const got = price.clipCreditCost(engine, s, withImage)
        if (got !== want[s]) p.push(`${engine} ${s}s${withImage ? ' (foto)' : ''}: ${got} cr ≠ ${want[s]} decidido`)
      }
    }
  }
  return p
}

// P2 — margem ≥ 40% no crédito do Creator mensal em toda combinação, efeito e Modo Clipe.
function floorProblems({ price, mk, cat, fx, cp }, shotSrc) {
  const p = []
  const cm = creatorMonthly(cp)
  for (const engine of cat.CLIP_ENGINE_ORDER) {
    for (const s of cat.offeredSecondsFor(engine)) {
      for (const withImage of [false, true]) {
        const cr = price.clipCreditCost(engine, s, withImage)
        const m = 1 - falOf(price, mk, engine, s) / (cr * cm)
        if (!(m >= FLOOR - 1e-9)) p.push(`${engine} ${s}s${withImage ? ' (foto)' : ''}: ${cr} cr dá ${(m * 100).toFixed(1)}% no Creator mensal (< 40%)`)
      }
    }
  }
  for (const effect of fx.CLIP_EFFECTS) {
    const cr = fx.clipEffectCredits(effect)
    const usd = effect.template ? effect.template.usd : falOf(price, mk, effect.engine, effect.seconds)
    const m = 1 - usd / (cr * cm)
    if (!(m >= FLOOR - 1e-9)) p.push(`efeito ${effect.key}: ${cr} cr dá ${(m * 100).toFixed(1)}% no Creator mensal (< 40%)`)
  }
  // Modo Clipe do /studio: CLIP_CREDITS (shotSpec.ts) = Seedance 1.5 de até 12 s.
  const mClip = /export const CLIP_CREDITS\s*=\s*(\d+)/.exec(shotSrc)
  if (!mClip) p.push('shotSpec.ts: CLIP_CREDITS sumiu')
  else {
    const m = 1 - falOf(price, mk, 'seedance', 12) / (Number(mClip[1]) * cm)
    if (!(m >= FLOOR - 1e-9)) p.push(`Modo Clipe (${mClip[1]} cr, Seedance 12 s): ${(m * 100).toFixed(1)}% no Creator mensal (< 40%)`)
  }
  return p
}

// P3 — o piso é LIDO de checkoutPricing (Creator mensal hoje), nunca digitado.
function readsPlanProblems({ price, cp }, priceSrc) {
  const p = []
  if (price.CLIP_FLOOR_USD_PER_CREDIT !== cp.CHEAPEST_PLAN_USD_PER_CREDIT) p.push('CLIP_FLOOR_USD_PER_CREDIT ≠ CHEAPEST_PLAN_USD_PER_CREDIT')
  if (Math.abs(price.CLIP_FLOOR_USD_PER_CREDIT - creatorMonthly(cp)) > 1e-12) p.push(`piso ${price.CLIP_FLOOR_USD_PER_CREDIT} ≠ Creator mensal ${creatorMonthly(cp)}`)
  if (!/^import \{ CHEAPEST_PLAN_USD_PER_CREDIT \} from '@\/lib\/checkoutPricing'$/m.test(priceSrc)) p.push('clipPricing não importa CHEAPEST_PLAN_USD_PER_CREDIT de @/lib/checkoutPricing')
  if (!/^export const CLIP_FLOOR_USD_PER_CREDIT: number = CHEAPEST_PLAN_USD_PER_CREDIT$/m.test(priceSrc)) p.push('CLIP_FLOOR_USD_PER_CREDIT não é CHEAPEST_PLAN_USD_PER_CREDIT (número digitado?)')
  const call = /export function clipMarketDecision[\s\S]*?\n\}/.exec(priceSrc)?.[0] ?? ''
  if (!/floorUsdPerCredit: CLIP_FLOOR_USD_PER_CREDIT,/.test(call)) p.push('clipMarketDecision não passa CLIP_FLOOR_USD_PER_CREDIT como piso')
  // A régua EXECUTADA (sem o preço decidido do 2.5) cai no mesmo número: o 14/20/28/42 é o piso, não um chute.
  for (const s of [5, 7, 10, 15]) {
    const d = price.clipMarketDecision('s25', s)
    if (d.credits !== NEW_TABLE.s25[s]) p.push(`régua do 2.5 a ${s}s dá ${d.credits} ≠ ${NEW_TABLE.s25[s]} decidido`)
  }
  return p
}

// P4 — Kling 2.5 = 75 em todos os espelhos e o pior caso de checkoutPricing reconferido.
function klingProblems({ price, cost, cp }, over) {
  const p = []
  if (cost.creditCostFor('cinematic_kling', true) !== KLING25_FILM) p.push(`creditCostFor(cinematic_kling) = ${cost.creditCostFor('cinematic_kling', true)} ≠ 75`)
  const dur = { 15: 19, 35: 44, 60: 75, 90: 113 }
  for (const [s, want] of Object.entries(dur)) {
    const got = cost.creditCostForDuration('cinematic_kling', true, Number(s))
    if (got !== want) p.push(`creditCostForDuration(kling, ${s}s) = ${got} ≠ ${want}`)
  }
  if (price.CLIP_COSTS.kling.filmCredits !== cost.creditCostFor('cinematic_kling', true)) p.push(`clipPricing CLIP_COSTS.kling.filmCredits ${price.CLIP_COSTS.kling.filmCredits} ≠ creditCostFor`)
  for (const [k, c] of Object.entries(price.CLIP_COSTS)) {
    if (c.filmCredits !== cost.creditCostFor(c.filmQuality, true)) p.push(`clipPricing CLIP_COSTS.${k}.filmCredits ${c.filmCredits} ≠ creditCostFor(${c.filmQuality})`)
  }
  const route = src(over, ROUTE)
  // O literal KLING_CREDIT_COST = 50 da rota é MORTO (só alimenta `baseCost`, anulado por `void baseCost`, e uma linha de log);
  // ficou intocado porque uma dúzia de guardiões confere a rota byte a byte. A prova é que ele não cobra nada.
  const usos = (route.match(/\bKLING_CREDIT_COST\b/g) ?? []).length
  if (usos !== 3 || !/^\s*void baseCost\b/m.test(route) || (route.match(/\bbaseCost\b/g) ?? []).length !== 2) p.push(`rota cinematográfica: KLING_CREDIT_COST/baseCost passaram a ser usados (${usos} usos) — o espelho digitado pode estar cobrando`)
  if (!/const cost = creditCostForDuration\(costQuality, true, duration\)/.test(route)) p.push('rota cinematográfica: o débito não sai de creditCostForDuration no pedido')
  if (/Kling 2\.5 \(60 cr desde/.test(src(over, MARKETING))) p.push('marketingPrice.ts ainda documenta o Kling 2.5 a 60 cr')
  // Pior caso: nenhum filme passa de WORST_CASE_USD_PER_CREDIT, e o pior é o motor de WORST_ENGINE_CREDITS.
  let worst = { q: null, rate: 0 }
  for (const [q, usd] of Object.entries(cp.WORST_CASE_FILM_COSTS)) {
    const rate = usd / cost.creditCostFor(q, true)
    if (rate > cp.WORST_CASE_USD_PER_CREDIT + 1e-9) p.push(`${q}: US$ ${usd} ÷ ${cost.creditCostFor(q, true)} cr = ${rate.toFixed(4)}/cr > WORST_CASE_USD_PER_CREDIT ${cp.WORST_CASE_USD_PER_CREDIT}`)
    if (rate > worst.rate) worst = { q, rate }
  }
  const we = /const WORST_ENGINE_CREDITS = (\d+)/.exec(src(over, CHECKOUT))
  if (!we || Number(we[1]) !== cost.creditCostFor(worst.q, true)) p.push(`WORST_ENGINE_CREDITS ${we?.[1]} ≠ créditos do pior motor (${worst.q}, ${worst.q && cost.creditCostFor(worst.q, true)})`)
  if (!(cp.WORST_CASE_FILM_COSTS.cinematic_kling >= 8.4)) p.push('custo do filme do Kling 2.5 caiu abaixo dos US$ 8,40 documentados')
  // Zero a zero do Kling 2.5 no Creator mensal (o pior caso que motivou os 75): 8,40 ÷ 0,1327 ≈ 63,3 cr; o relatório diz ~71
  // com o líquido da Stripe. Os 75 têm de ficar acima dos dois.
  const be = Math.ceil(cp.WORST_CASE_FILM_COSTS.cinematic_kling / (cp.netAfterStripeUsd(cp.TIER_PRICES.basic.usd / 100) / cp.TIER_CREDITS.basic))
  if (cost.creditCostFor('cinematic_kling', true) < be) p.push(`Kling 2.5 a ${cost.creditCostFor('cinematic_kling', true)} cr fica abaixo do zero a zero líquido (${be} cr)`)
  const inv = cp.checkPricingInvariants()
  if (inv.length) p.push('checkPricingInvariants: ' + inv.join(' | '))
  return p
}

// P5 — Studio intocado (fundador: "fica como está").
function studioProblems({ price, cp }) {
  const p = []
  if (cp.TIER_PRICES.pro.usd !== STUDIO.usd) p.push(`TIER_PRICES.pro ${cp.TIER_PRICES.pro.usd} ≠ ${STUDIO.usd}`)
  if (cp.TIER_CREDITS.pro !== STUDIO.credits) p.push(`TIER_CREDITS.pro ${cp.TIER_CREDITS.pro} ≠ ${STUDIO.credits}`)
  if (cp.ANNUAL_PRICES.pro.usd !== STUDIO.annualUsd) p.push(`ANNUAL_PRICES.pro ${cp.ANNUAL_PRICES.pro.usd} ≠ ${STUDIO.annualUsd}`)
  if (price.STUDIO_PLAN_USD_CENTS !== cp.TIER_PRICES.pro.usd || price.STUDIO_PLAN_CREDITS !== cp.TIER_CREDITS.pro) p.push('espelho do Studio em clipPricing divergiu de checkoutPricing')
  return p
}

// P6 — render em andamento: liquidação pelo custo gravado; estorno pelo débito.
function inFlightProblems(over) {
  const p = []
  const status = src(over, STATUS)
  if (!/const cost = intentCost \?\? creditCostForDuration\(quality, fastIsPaidUser, duration\)/.test(status)) p.push('compose/status: a liquidação não prioriza o custo gravado no nascimento (intentCost)')
  const clipServer = src(over, 'lib/clips/clipServer.ts')
  if (!/refund: \(ref\) => refundRenderCredits\(ref\)/.test(clipServer)) p.push('clipServer: o estorno não é por referência do débito (refundRenderCredits)')
  return p
}

const BASE = loadSet()
const PRICE_SRC = read(PRICE)
const SHOT_SRC = read(SHOT)
const run = (set, over = {}) => ({
  table: tableProblems(set),
  floor: floorProblems(set, src(over, SHOT)),
  reads: readsPlanProblems(set, src(over, PRICE)),
  kling: klingProblems(set, over),
  studio: studioProblems(set),
  inflight: inFlightProblems(over),
})

console.log('\nP1–P6 — a fonte real')
const real = run(BASE)
for (const [k, list] of Object.entries(real)) ok(list.length === 0, `${k}: ${list.length ? list.join(' · ') : 'limpo'}`)

// Relatório: antes/depois com margem no Creator mensal e anual.
console.log('\nTabela (créditos antes → depois · margem Creator mensal / anual):')
const cm = creatorMonthly(BASE.cp), ca = creatorAnnual(BASE.cp)
let changed = 0
for (const engine of BASE.cat.CLIP_ENGINE_ORDER) {
  for (const s of BASE.cat.offeredSecondsFor(engine)) {
    const before = OLD_TABLE[engine][s], after = BASE.price.clipCreditCost(engine, s)
    if (before !== after) changed++
    const fal = falOf(BASE.price, BASE.mk, engine, s)
    console.log(`    ${engine.padEnd(9)} ${String(s).padStart(2)}s  ${String(before).padStart(2)} → ${String(after).padStart(2)}  ${((1 - fal / (after * cm)) * 100).toFixed(1)}% / ${((1 - fal / (after * ca)) * 100).toFixed(1)}%`)
  }
}
ok(changed === 14, `exatamente as 14 combinações aprovadas mudaram de preço — o relatório diz "13", mas a lista dele tem 4+2+1+3+4 = 14 (mudaram ${changed})`)

// ─── P7 — mutantes (cada um precisa ficar VERMELHO) ──────────────────────────
console.log('\nP7 — mutantes')
const mut = (rel, from, to) => {
  const s = read(rel)
  if (!s.includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from}`)
  return { [rel]: s.replace(from, to) }
}
const MUTANTS = [
  ['piso volta para o Studio', mut(PRICE, 'floorUsdPerCredit: CLIP_FLOOR_USD_PER_CREDIT,', 'floorUsdPerCredit: STUDIO_USD_PER_CREDIT,'), ['table', 'floor', 'reads']],
  ['piso digitado (0.1327) em vez de lido', mut(PRICE, 'export const CLIP_FLOOR_USD_PER_CREDIT: number = CHEAPEST_PLAN_USD_PER_CREDIT', 'export const CLIP_FLOOR_USD_PER_CREDIT: number = 0.1327'), ['reads']],
  ['Seedance 2.5 volta ao chamariz 8/11/16/24', mut(PRICE, '{ 5: 14, 7: 20, 10: 28, 15: 42 }', '{ 5: 8, 7: 11, 10: 16, 15: 24 }'), ['table', 'floor']],
  ['Seedance 2.5 de 7 s um crédito abaixo (19)', mut(PRICE, '{ 5: 14, 7: 20, 10: 28, 15: 42 }', '{ 5: 14, 7: 19, 10: 28, 15: 42 }'), ['table']],
  ['filme do Kling 2.5 volta a 60', mut(COST, '      return 75', '      return 60'), ['kling']],
  ['espelho do Kling 2.5 em clipPricing fica em 60', mut(PRICE, "filmCredits: 75, filmFalUsd: 8.4 }", "filmCredits: 60, filmFalUsd: 8.4 }"), ['kling']],
  ['rota cobra pelo espelho digitado (baseCost)', mut(ROUTE, 'const cost = creditCostForDuration(costQuality, true, duration)', 'const cost = baseCost + 0 * creditCostForDuration(costQuality, true, duration)'), ['kling']],
  ['pior caso: Kling 2.5 custando US$ 9,00 (acima de 0,116/cr)', mut(CHECKOUT, 'cinematic_kling: 8.4,', 'cinematic_kling: 9.0,'), ['kling']],
  ['Studio muda de preço (5490 → 5491)', mut(CHECKOUT, 'pro: { usd: 5490 },', 'pro: { usd: 5491 },'), ['studio']],
  ['liquidação recalcula pela tabela (sem intentCost)', mut(STATUS, 'const cost = intentCost ?? creditCostForDuration(quality, fastIsPaidUser, duration)', 'const cost = creditCostForDuration(quality, fastIsPaidUser, duration)'), ['inflight']],
]
for (const [name, over, expect] of MUTANTS) {
  let res
  try { res = run(loadSet(over), over) } catch (e) { res = { crash: [String(e.message || e)] } }
  const red = Object.entries(res).filter(([, l]) => l.length).map(([k]) => k)
  ok(expect.every((k) => red.includes(k)) || red.includes('crash'), `mutante "${name}" fica vermelho em ${expect.join('+')} (vermelho: ${red.join(', ') || 'nada'})`)
}

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
