// KINEO-CLIP-PRECO-MERCADO-2026-10-05 — guardião da régua "preço por segundo ~10% abaixo do concorrente, nunca no
// prejuízo" (lib/clips/clipPriceVsMarket.ts) e do interruptor CLIP_PRECO_MERCADO_PUBLIC em lib/clips/clipPricing.ts.
// Prova: (1) interruptor DESLIGADO e clipCreditCost devolvendo EXATAMENTE a regra de 29/09 em todo motor e duração
// oferecida (texto e foto) e em 1..30 s; (2) espelhos do Creator = TIER_PRICES.basic / TIER_CREDITS.basic; (3) a régua
// EXECUTADA com o interruptor ligado: −10% onde dá, 40% de margem no crédito do Studio sempre, "IMPOSSÍVEL A −10%" onde o
// mercado vende abaixo da fal, piso da casa, motor sem concorrente na regra de 29/09; (4) tabela com fonte/URL/data;
// (5) mutantes. Estilo readFileSync + transpile.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

// Carrega um conjunto de módulos puros com imports RELATIVOS; `over` troca o fonte de um arquivo (mutante).
function loadSet(over = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const src = over[rel] ?? read(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (p) => {
      if (p.startsWith('./') || p.startsWith('../')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(rel), p)) + '.ts')
      throw new Error(`${rel}: import inesperado ${p} (módulo precisa ser puro)`)
    }
    new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
    return mod.exports
  }
  return { price: load('lib/clips/clipPricing.ts'), mk: load('lib/clips/clipPriceVsMarket.ts'), cat: load('lib/clips/clipCatalog.ts') }
}

const PRICE_SRC = read('lib/clips/clipPricing.ts')
const MK_SRC = read('lib/clips/clipPriceVsMarket.ts')
// KINEO-LIGA-TUDO-2026-10-05 — o fundador ligou a régua; OFF/ON são forçados aqui para a prova seguir independente do valor publicado.
// REANCORADO 06/10 (KINEO-S25-CLIPES-2026-10-06): o clipe do Seedance 2.5 ganhou PREÇO DECIDIDO pelo fundador (CLIP_S25_CREDITS,
// opção C — igualar a Runway Pro, chamariz), que vence as duas réguas. Para as provas 1 e 3 continuarem medindo AS RÉGUAS, a
// constante é zerada (null) em OFF/ON — a troca é conferida abaixo; a prova 6 mede o preço decidido com a fonte REAL.
const S25_DECIDED_RE = /^export const CLIP_S25_CREDITS: ([^=]+)= \{[^}]*\}/m
if (!S25_DECIDED_RE.test(PRICE_SRC)) throw new Error('âncora CLIP_S25_CREDITS sumiu de lib/clips/clipPricing.ts')
const OFF_SRC = PRICE_SRC.replace(/^export const CLIP_PRECO_MERCADO_PUBLIC = (true|false)[^\r\n]*/m, 'export const CLIP_PRECO_MERCADO_PUBLIC = false')
  .replace(S25_DECIDED_RE, 'export const CLIP_S25_CREDITS: $1= null')
const ON = { 'lib/clips/clipPricing.ts': OFF_SRC.replace('export const CLIP_PRECO_MERCADO_PUBLIC = false', 'export const CLIP_PRECO_MERCADO_PUBLIC = true') }

// A tabela de 29/09 (a de hoje) — a mesma de scripts/test-clipes-2026-09-29.mjs. Desligado, NADA disto muda.
const TODAY = {
  seedance: { 5: 5, 7: 5, 10: 5, 12: 5 },
  kling: { 5: 5, 10: 8 },
  hollywood: { 5: 8, 7: 11, 10: 16, 15: 23 },
  veo: { 6: 7, 8: 9 },
  h3: { 5: 5, 7: 5, 10: 7, 15: 11 },
  omni: { 5: 12, 7: 17, 10: 23 },
  s25: { 5: 12, 7: 16, 10: 23, 15: 35 },
}
// A PROPOSTA (interruptor ligado) — vai para o fundador como decisão.
const PROPOSED = {
  seedance: { 5: [5, 'sem_concorrente'], 7: [5, 'sem_concorrente'], 10: [5, 'sem_concorrente'], 12: [5, 'sem_concorrente'] },
  kling: { 5: [5, 'impossivel'], 10: [7, 'impossivel'] },
  hollywood: { 5: [6, 'impossivel'], 7: [8, 'impossivel'], 10: [11, 'impossivel'], 15: [16, 'impossivel'] },
  veo: { 6: [6, 'impossivel'], 8: [8, 'impossivel'] },
  h3: { 5: [5, 'piso_da_casa'], 7: [5, 'piso_da_casa'], 10: [7, 'abaixo_do_mercado'], 15: [10, 'abaixo_do_mercado'] },
  omni: { 5: [12, 'sem_concorrente'], 7: [17, 'sem_concorrente'], 10: [23, 'sem_concorrente'] },
  s25: { 5: [11, 'impossivel'], 7: [15, 'impossivel'], 10: [21, 'impossivel'], 15: [31, 'impossivel'] },
}
// REANCORADO 06/10 (KINEO-S25-CLIPES-2026-10-06): a 480p, o mais barato OFICIAL do 2.5 passou a ser a Higgsfield Plus
// (post oficial de 19/09: "10 seconds, 480p | 30 credits", 3 cr/s no plano de US$ 49 / 1.000 cr = US$ 0,147/s), não mais a
// Runway Pro (US$ 0,311/s). O preço da régua não muda (segue IMPOSSÍVEL A −10%: o mercado vende abaixo da fal).
const CHEAPEST = { seedance: null, kling: 'kling-k25-pro', hollywood: 'hf-k3-plus-sec', veo: 'hf-veo-fast-plus-sec', h3: 'runway-h3-pro', omni: null, s25: 'hf-s25-plus' }

/** Problemas da régua com o interruptor LIGADO (lista vazia = régua certa). */
function marketProblems({ price, mk, cat }) {
  const p = []
  const E = 1e-9
  for (const engine of cat.CLIP_ENGINE_ORDER) {
    const first = price.clipMarketDecision(engine, cat.offeredSecondsFor(engine)[0])
    if ((first.cheapest ? first.cheapest.id : null) !== CHEAPEST[engine]) p.push(`${engine}: concorrente mais barato ${first.cheapest && first.cheapest.id} ≠ ${CHEAPEST[engine]}`)
    for (const q of mk.marketQuotesFor(engine, price.STUDIO_PLAN_USD_CENTS)) if (q.resolution !== mk.ENGINE_MARKET[engine].resolution) p.push(`${engine}: compara com ${q.id} em ${q.resolution}`)
    for (const seconds of cat.offeredSecondsFor(engine)) {
      for (const withImage of [false, true]) {
        const d = price.clipMarketDecision(engine, seconds, withImage)
        const got = price.clipCreditCost(engine, seconds, withImage)
        const [want, status] = PROPOSED[engine][seconds] ?? []
        if (got !== d.credits) p.push(`${engine} ${seconds}s: clipCreditCost ligado não lê a régua`)
        if (got !== want || d.status !== status) p.push(`${engine} ${seconds}s: ${got} cr/${d.status} ≠ proposta ${want}/${status}`)
        const studioRevenue = got * price.STUDIO_USD_PER_CREDIT
        const margin = 1 - d.falUsd / studioRevenue
        if (d.status !== 'sem_concorrente' && margin < mk.MARKET_MARGIN_FLOOR - E) p.push(`${engine} ${seconds}s: margem ${(margin * 100).toFixed(1)}% < 40% no Studio`)
        if (d.falUsd + E < price.clipFalUsd(engine, seconds)) p.push(`${engine} ${seconds}s: custo fal da régua abaixo do da casa`)
        if (d.status === 'abaixo_do_mercado' && got * price.CREATOR_USD_PER_CREDIT > (1 - mk.MARKET_DISCOUNT) * d.marketUsdPerSecond * seconds + E) p.push(`${engine} ${seconds}s: "−10%" acima de 90% do mercado`)
        if (d.status === 'impossivel') {
          if (d.label !== mk.MARKET_IMPOSSIBLE_LABEL) p.push(`${engine} ${seconds}s: sem o rótulo IMPOSSÍVEL A −10%`)
          const floorUsd = d.floorCredits * price.CREATOR_USD_PER_CREDIT
          if (!(d.targetUsd < floorUsd)) p.push(`${engine} ${seconds}s: marcado impossível com 90% do mercado acima do piso`)
          if (got !== Math.max(d.floorCredits, price.CLIP_MIN_CREDITS)) p.push(`${engine} ${seconds}s: impossível não cobra o MENOR preço com 40%`)
          if (d.floorCredits > 1 && 1 - d.falUsd / ((d.floorCredits - 1) * price.STUDIO_USD_PER_CREDIT) >= mk.MARKET_MARGIN_FLOOR - E) p.push(`${engine} ${seconds}s: piso não é o menor com 40%`)
        }
        if (d.status === 'piso_da_casa' && got !== price.CLIP_MIN_CREDITS) p.push(`${engine} ${seconds}s: piso da casa ≠ CLIP_MIN_CREDITS`)
        if (d.status === 'sem_concorrente' && got !== price.clipCreditCostRegra2909(engine, seconds, withImage)) p.push(`${engine} ${seconds}s: sem concorrente fugiu da regra de 29/09`)
      }
    }
  }
  return p
}

// ─── 1. Interruptor DESLIGADO = a regra de 29/09, byte a byte ──────────────────
console.log('1. desligado = hoje')
ok(/^export const CLIP_PRECO_MERCADO_PUBLIC = true\b/m.test(PRICE_SRC), 'CLIP_PRECO_MERCADO_PUBLIC = true no código (fundador ligou em 05/10)')
const OFF = loadSet({ 'lib/clips/clipPricing.ts': OFF_SRC })
let same = true
let covered = 0
for (const engine of OFF.cat.CLIP_ENGINE_ORDER) {
  const offered = OFF.cat.offeredSecondsFor(engine)
  if (JSON.stringify(offered) !== JSON.stringify(Object.keys(TODAY[engine]).map(Number))) { same = false; console.log(`     ${engine}: durações mudaram ${offered}`) }
  for (const s of offered) for (const img of [false, true]) {
    covered++
    if (OFF.price.clipCreditCost(engine, s, img) !== TODAY[engine][s]) { same = false; console.log(`     ${engine} ${s}s img=${img}: ${OFF.price.clipCreditCost(engine, s, img)} ≠ ${TODAY[engine][s]}`) }
  }
  for (let s = 1; s <= 30; s++) if (OFF.price.clipCreditCost(engine, s) !== OFF.price.clipCreditCostRegra2909(engine, s)) same = false
}
ok(same && covered === 46, `clipCreditCost desligado = tabela de 29/09 em ${covered} combinações (7 motores × durações oferecidas × texto/foto) e = regra de 29/09 em 1..30 s`)
let threw = 0
for (const bad of [0, -5, 7.5, NaN]) { try { OFF.price.clipCreditCost('kling', bad) } catch { threw++ } }
ok(threw === 4, 'desligado: segue recusando duração não inteira/≤0')
ok(PRICE_SRC.includes('const raw = Math.round((clipFalUsd(engine, seconds, withImage) / perCreditKept) * 1e6) / 1e6')
  && PRICE_SRC.includes('return Math.max(CLIP_MIN_CREDITS, Math.ceil(raw))'), 'o corpo da regra de 29/09 está intacto (clipCreditCostRegra2909)')

// ─── 2. Espelhos do Creator ───────────────────────────────────────────────────
console.log('2. espelhos')
const checkout = read('lib/checkoutPricing.ts')
const tierPrices = checkout.slice(checkout.indexOf('export const TIER_PRICES'))
ok(Number(/basic:\s*\{\s*usd:\s*(\d+)\s*\}/.exec(tierPrices)[1]) === OFF.price.CREATOR_PLAN_USD_CENTS, 'US$ do Creator = TIER_PRICES.basic.usd')
const tierCredits = checkout.slice(checkout.indexOf('export const TIER_CREDITS'))
ok(Number(/^\s*basic:\s*(\d+),?\s*$/m.exec(tierCredits.slice(0, tierCredits.indexOf('\n}')))[1]) === OFF.price.CREATOR_PLAN_CREDITS, 'créditos do Creator = TIER_CREDITS.basic')
ok(Math.abs(OFF.price.CREATOR_USD_PER_CREDIT - OFF.price.CREATOR_PLAN_USD_CENTS / 100 / OFF.price.CREATOR_PLAN_CREDITS) < 1e-12, 'US$/crédito do Creator é derivado, não digitado')
ok(OFF.price.STUDIO_USD_PER_CREDIT < OFF.price.CREATOR_USD_PER_CREDIT, 'Studio é o crédito mais barato (piso) e o Creator o de referência (alvo)')

// ─── 3. A régua, executada com o interruptor ligado ──────────────────────────
console.log('3. régua ligada')
const MARKET = loadSet(ON)
const probs = marketProblems(MARKET)
ok(probs.length === 0, 'régua ligada: −10% onde dá, 40% de margem sempre, IMPOSSÍVEL onde o mercado vende abaixo da fal' + (probs.length ? '\n       ' + probs.join('\n       ') : ''))
const k3 = MARKET.price.clipMarketDecision('hollywood', 5)
ok(k3.label === 'IMPOSSÍVEL A −10%' && k3.marketUsdPerSecond < 0.112, `Kling 3: mercado a US$ ${k3.marketUsdPerSecond.toFixed(4)}/s, abaixo da fal (0,112) → IMPOSSÍVEL A −10%`)
const h3 = MARKET.price.clipMarketDecision('h3', 10)
ok(h3.status === 'abaixo_do_mercado' && /Runway Pro/.test(h3.label), 'MiniMax H3 10 s: abaixo do Runway Pro')
ok(MARKET.price.clipCreditCost('omni', 5) === OFF.price.clipCreditCost('omni', 5) && MARKET.price.clipCreditCost('seedance', 10) === OFF.price.clipCreditCost('seedance', 10), 'motor sem concorrente (Omni, Seedance 1.5) mantém a regra de 29/09')
const allPlans = MARKET.mk.cheapestMarketQuote('hollywood', Infinity)
ok(allPlans && allPlans.id === 'kling-k3-ultra', 'sem a prateleira, o Kling 3 mais barato seria o Kling Ultra (US$ 160/mês) — a prateleira é decisão documentada')

// ─── 4. Tabela de concorrentes: fonte, URL, data ─────────────────────────────
console.log('4. tabela')
const { mk, cat } = OFF
const ids = new Set()
let tableOk = true
for (const q of mk.MARKET_QUOTES) {
  const bad = []
  if (ids.has(q.id)) bad.push('id repetido')
  ids.add(q.id)
  if (!/^https:\/\//.test(q.url) || !/^https:\/\//.test(q.plan.url)) bad.push('sem URL')
  // REANCORADO 06/10 (KINEO-S25-CLIPES-2026-10-06): as cotações do Seedance 2.5 reconferidas nas páginas oficiais abertas
  // carregam 06/10 (MARKET_CHECKED_ON_S25); as demais seguem 05/10. Data fora das duas = sem conferência.
  if (q.checkedOn !== '2026-10-05' && !(q.checkedOn === '2026-10-06' && q.model === 'seedance-2.5')) bad.push('sem data 05/10/2026 (ou 06/10 no Seedance 2.5)')
  if (!['oficial', 'secundaria'].includes(q.source) || !['oficial', 'secundaria'].includes(q.plan.source)) bad.push('fonte sem tipo')
  if (q.source === 'secundaria' && !/secundária, não conferida na página oficial/.test(q.note || '')) bad.push('secundária sem a marca')
  if (!(q.creditsPerSecond > 0 && q.plan.usdCentsMonthly > 0 && q.plan.creditsMonthly > 0)) bad.push('número vazio')
  if (q.audio === 'on') bad.push('preço com áudio contra clipe mudo')
  if (bad.length) { tableOk = false; console.log(`     ${q.id}: ${bad.join(', ')}`) }
}
ok(tableOk && mk.MARKET_QUOTES.length >= 20, `${mk.MARKET_QUOTES.length} cotações, todas com URL, data, tipo de fonte; secundárias marcadas`)
ok(['Higgsfield', 'Kling', 'Runway'].every((c) => mk.MARKET_QUOTES.some((q) => q.plan.competitor === c)), 'Higgsfield, Kling e Runway na tabela')
ok(['Starter', 'Plus', 'Ultra'].every((plan) => mk.MARKET_QUOTES.some((q) => q.plan.competitor === 'Higgsfield' && q.plan.plan === plan)), 'Higgsfield Starter, Plus e Ultra')
ok(/Pika/.test(mk.MARKET_UNKNOWN.join(' ')) && /Hailuo/.test(mk.MARKET_UNKNOWN.join(' ')) && mk.MARKET_UNKNOWN.every((l) => /DESCONHECIDO|nenhum concorrente/.test(l)), 'Pika e Hailuo documentados como DESCONHECIDO (nada inventado)')
let falOk = true
for (const engine of cat.CLIP_ENGINE_ORDER) {
  const m = mk.ENGINE_MARKET[engine]
  if (!/^https:\/\/fal\.ai\//.test(m.falUrl)) falOk = false
  if (m.falStatus === 'conferido' && Math.abs(m.falUsdPerSecond - OFF.price.CLIP_COSTS[engine].usdPerSecond) > 1e-9) { falOk = false; console.log(`     ${engine}: fal conferido ${m.falUsdPerSecond} ≠ casa ${OFF.price.CLIP_COSTS[engine].usdPerSecond}`) }
}
ok(falOk, 'custo fal conferido em 05/10 = CLIP_COSTS (Kling 3, Kling 2.5, Seedance 1.5, Veo, H3); aproximados documentados')
const falIn = (engine) => JSON.stringify(cat.buildClipFalInput({ engine, mode: 't2v', model: 'x', seconds: 5, aspect: '9:16', prompt: 'p', imageUrl: null }))
ok(falIn('seedance').includes('"720p"') && falIn('veo').includes('"1080p"') && falIn('h3').includes('"768P"') && falIn('s25').includes('"480p"')
  && mk.ENGINE_MARKET.seedance.resolution === '720p' && mk.ENGINE_MARKET.veo.resolution === '1080p' && mk.ENGINE_MARKET.h3.resolution === '768p' && mk.ENGINE_MARKET.s25.resolution === '480p',
  'a resolução comparada é a que o clipe pede à fal')
ok(!/^import (?!type)/m.test(MK_SRC), 'clipPriceVsMarket é puro (só import type)')

// ─── 5. Mutantes ─────────────────────────────────────────────────────────────
console.log('5. mutantes')
const mutate = (file, from, to) => {
  const base = file === 'lib/clips/clipPricing.ts' ? ON[file] : read(file)
  if (!base.includes(from)) throw new Error('mutante não aplicou: ' + from)
  return { ...ON, [file]: base.replace(from, to) }
}
const MUTANTS = [
  ['sem desconto (MARKET_DISCOUNT = 0)', mutate('lib/clips/clipPriceVsMarket.ts', 'export const MARKET_DISCOUNT = 0.1', 'export const MARKET_DISCOUNT = 0')],
  ['sem piso de margem', mutate('lib/clips/clipPriceVsMarket.ts', 'export const MARKET_MARGIN_FLOOR = 0.4', 'export const MARKET_MARGIN_FLOOR = 0')],
  ['alvo arredondado para cima', mutate('lib/clips/clipPriceVsMarket.ts', 'const marketCredits = Math.floor(', 'const marketCredits = Math.ceil(')],
  ['alvo no crédito do Studio', mutate('lib/clips/clipPricing.ts', 'refUsdPerCredit: CREATOR_USD_PER_CREDIT', 'refUsdPerCredit: STUDIO_USD_PER_CREDIT')],
  ['piso no crédito do Creator', mutate('lib/clips/clipPricing.ts', 'floorUsdPerCredit: STUDIO_USD_PER_CREDIT', 'floorUsdPerCredit: CREATOR_USD_PER_CREDIT')],
  ['sem prateleira (Ultra de US$ 160 entra)', mutate('lib/clips/clipPricing.ts', 'shelfMaxUsdCents: STUDIO_PLAN_USD_CENTS', 'shelfMaxUsdCents: Infinity')],
  ['ignora o custo fal conferido (S25 0,2205)', mutate('lib/clips/clipPriceVsMarket.ts', 'Math.max(ctx.houseFalUsdPerSecond, ENGINE_MARKET[engine].falUsdPerSecond)', 'ctx.houseFalUsdPerSecond')],
  ['acompanha o concorrente no prejuízo', mutate('lib/clips/clipPriceVsMarket.ts', "credits: Math.max(floorCredits, ctx.minCredits), status: 'impossivel'", "credits: Math.max(marketCredits, ctx.minCredits), status: 'impossivel'")],
  ['sem o mínimo da casa', mutate('lib/clips/clipPriceVsMarket.ts', 'if (marketCredits < ctx.minCredits) {', 'if (false) {')],
  ['compara com resolução errada (sem filtro)', mutate('lib/clips/clipPriceVsMarket.ts', 'quote.model === match.model && quote.resolution === match.resolution &&', 'quote.model === match.model &&')],
  ['ligado mas clipCreditCost ignora a régua', mutate('lib/clips/clipPricing.ts', 'return clipMarketDecision(engine, seconds, withImage).credits', 'return clipCreditCostRegra2909(engine, seconds, withImage)')],
]
for (const [name, over] of MUTANTS) {
  let caught
  try { caught = marketProblems(loadSet(over)).length > 0 } catch { caught = true }
  ok(caught, `mutante pego: ${name}`)
}
// Mutante do interruptor: ligado no código → a prova 1 tem de acusar.
const flipped = loadSet(ON)
ok(['hollywood', 'kling', 'veo', 's25'].some((e) => flipped.price.clipCreditCost(e, e === 'veo' ? 6 : 5) !== TODAY[e][e === 'veo' ? 6 : 5]), 'mutante pego: interruptor ligado muda o preço de hoje (a prova 1 acusa)')

// ─── 6. Preço decidido do 2.5 (KINEO-S25-CLIPES-2026-10-06) — fonte REAL, com a régua ligada e desligada ─────────
console.log('6. preço decidido do 2.5')
{
  const REAL = loadSet()
  const REAL_OFF = loadSet({ 'lib/clips/clipPricing.ts': PRICE_SRC.replace(/^export const CLIP_PRECO_MERCADO_PUBLIC = (true|false)[^\r\n]*/m, 'export const CLIP_PRECO_MERCADO_PUBLIC = false') })
  ok(OFF.price.CLIP_S25_CREDITS === null && MARKET.price.CLIP_S25_CREDITS === null && REAL.price.CLIP_S25_CREDITS !== null, 'provas 1 e 3 medem as RÉGUAS (constante do 2.5 zerada só em memória; a fonte real a tem)')
  const table = REAL.price.CLIP_S25_CREDITS
  let decidedOk = !!table
  for (const set of [REAL, REAL_OFF]) for (const s of set.cat.offeredSecondsFor('s25')) for (const img of [false, true]) {
    if (set.price.clipCreditCost('s25', s, img) !== table?.[s]) decidedOk = false
  }
  ok(decidedOk && table[5] === 8 && table[10] === 16, 'clipe do 2.5 = CLIP_S25_CREDITS com a régua ligada e desligada (5 s = 8, 10 s = 16: decisão do fundador 06/10)')
  let othersOk = true
  for (const engine of REAL.cat.CLIP_ENGINE_ORDER) {
    if (engine === 's25') continue
    for (const s of REAL.cat.offeredSecondsFor(engine)) {
      if (REAL.price.clipCreditCost(engine, s) !== MARKET.price.clipCreditCost(engine, s)) othersOk = false
      if (REAL_OFF.price.clipCreditCost(engine, s) !== OFF.price.clipCreditCost(engine, s)) othersOk = false
    }
  }
  ok(othersOk, 'a constante do 2.5 não mexe em nenhum outro motor (régua ligada e desligada)')
}

console.log(`\n${pass} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
