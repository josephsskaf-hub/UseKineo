// KINEO-PRECOS-DOIS-PRODUTOS-2026-10-05 — guardião do /pricing com dois produtos (Clips — per second · Narrated films —
// per film · quanto cada plano faz). Prova: (1) interruptor PRECOS_DOIS_PRODUTOS_PUBLIC=false e a página de hoje intacta
// (só 3 linhas acrescentadas no PricingClient); (2) cada célula EXECUTADA sai de clipCreditCost / creditCostForDuration,
// nas durações reais/aceitas, com o ≈ US$ no crédito do Creator (TIER_PRICES.basic / TIER_CREDITS.basic) e as contagens
// por plano arredondadas para baixo; (3) só motores que o público pode apertar; (4) acompanha sozinho o Seedance a 35 cr
// (branch do CEO) e a régua de mercado do clipe; (5) render offline da marcação; (6) mutantes.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, offlineModules, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const read = (rel) => readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const MODEL = 'lib/pricingTwoProducts.ts'
const COMP = 'components/pricing/TwoProductsPricing.tsx'
const CLIENT = 'app/pricing/PricingClient.tsx'
const MODEL_SRC = read(MODEL)
const COMP_SRC = read(COMP)
const CLIENT_SRC = read(CLIENT)

/** Problemas do modelo e da marcação (lista vazia = página certa). */
function problems(replacements = {}) {
  const p = []
  const load = offlineModules({ replacements })
  const comp = load(COMP)
  const prices = load('lib/checkoutPricing.ts')
  const clipPricing = load('lib/clips/clipPricing.ts')
  const cat = load('lib/clips/clipCatalog.ts')
  const cost = load('lib/credits/engineCost.ts')
  const dur = load('lib/durationByEngine.ts')
  const launch = load('lib/engineLaunch.ts')
  const m = comp.twoProductsModelForPage()
  const rate = prices.TIER_PRICES.basic.usd / 100 / prices.TIER_CREDITS.basic
  if (Math.abs(m.usdPerCredit - rate) > 1e-12) p.push(`US$/crédito ${m.usdPerCredit} ≠ Creator ${rate}`)
  const listed = cat.CLIP_ENGINE_ORDER.filter((e) => !launch.enginePaused(e) && (e !== 's25' || launch.S25_PUBLIC))
  if (JSON.stringify(m.clips.map((r) => r.engine)) !== JSON.stringify(listed)) p.push(`motores dos clipes ${m.clips.map((r) => r.engine)} ≠ públicos ${listed}`)
  if (JSON.stringify(m.films.map((r) => r.engine)) !== JSON.stringify(listed)) p.push('motores dos filmes ≠ públicos')
  const usdCents = (credits) => Math.round(credits * rate * 100)
  for (const row of m.clips) {
    row.cells.forEach((c, i) => {
      const target = [5, 10][i]
      const real = cat.nearestAcceptedSeconds(cat.CLIP_ENGINES[row.engine].falSeconds, target)
      if (real === null) { if (c !== null) p.push(`${row.engine} clipe ~${target}s inventado`); return }
      if (!c || c.seconds !== real || !cat.offeredSecondsFor(row.engine).includes(real)) { p.push(`${row.engine} clipe ~${target}s: duração ${c && c.seconds} ≠ real ${real}`); return }
      if (c.credits !== clipPricing.clipCreditCost(row.engine, real, false)) p.push(`${row.engine} clipe ${real}s: ${c.credits} ≠ clipCreditCost`)
      if (c.usdCents !== usdCents(c.credits)) p.push(`${row.engine} clipe ${real}s: ≈US$ errado`)
    })
  }
  const shown = (engine, s) => {
    if (!dur.supportedDurationsFor(engine).includes(s)) return false
    if (dur.isSeedance15(engine)) return s >= 35 || launch.SEEDANCE_15S_PUBLIC
    return ![15, 30].includes(s) || launch.DURACOES_CURTAS_PUBLIC
  }
  for (const row of m.films) {
    const quality = clipPricing.CLIP_COSTS[row.engine].filmQuality
    if (row.quality !== quality) p.push(`${row.engine}: qualidade do filme ${row.quality} ≠ ${quality}`)
    row.cells.forEach((c, i) => {
      const s = [15, 30, 60, 90][i]
      if (!shown(row.engine, s)) { if (c !== null) p.push(`${row.engine} filme ${s}s: mostra duração que o motor não aceita`); return }
      if (!c) { p.push(`${row.engine} filme ${s}s: faltou`); return }
      if (c.credits !== cost.creditCostForDuration(quality, true, s)) p.push(`${row.engine} filme ${s}s: ${c.credits} ≠ creditCostForDuration`)
      if (c.usdCents !== usdCents(c.credits)) p.push(`${row.engine} filme ${s}s: ≈US$ errado`)
    })
  }
  const clip5 = m.clips.map((r) => r.cells[0]).filter(Boolean).map((c) => c.credits)
  const film60 = m.films.map((r) => r.cells[2]).filter(Boolean).map((c) => c.credits)
  for (const plan of m.plans) {
    const credits = prices.TIER_CREDITS[plan.tier]
    if (plan.credits !== credits) p.push(`${plan.label}: créditos ${plan.credits} ≠ TIER_CREDITS`)
    const want = [Math.floor(credits / Math.min(...clip5)), Math.floor(credits / Math.max(...clip5)), Math.floor(credits / Math.min(...film60)), Math.floor(credits / Math.max(...film60))]
    const got = [plan.clips.cheapest?.count, plan.clips.priciest?.count, plan.films.cheapest?.count, plan.films.priciest?.count]
    if (JSON.stringify(want) !== JSON.stringify(got)) p.push(`${plan.label}: contagens ${got} ≠ ${want} (créditos ÷ custo, para baixo)`)
  }
  if (JSON.stringify(m.plans.map((x) => x.label)) !== JSON.stringify(['Starter', 'Creator', 'Studio'])) p.push('planos fora de ordem/nome')
  // Marcação
  const html = renderToStaticMarkup(React.createElement(comp.default))
  for (const h of ['Clips — per second', 'Narrated films — per film', 'What each plan makes per month']) if (!html.includes(h)) p.push(`marcação sem "${h}"`)
  for (const row of m.films) for (const c of row.cells) if (c && !html.includes(`${c.credits} cr`)) p.push(`marcação sem ${c.credits} cr`)
  if (!html.includes(prices.formatCheckoutMoney('usd', m.films[0].cells.find(Boolean).usdCents))) p.push('marcação sem o ≈ US$')
  if (/Omni|Seedance 2\.5/.test(html) !== (listed.includes('omni') || listed.includes('s25'))) p.push('marcação mostra motor pausado/interno')
  return { p, m, html }
}

// ─── 1. Interruptor e a página de hoje ───────────────────────────────────────
console.log('1. interruptor')
ok(/^export const PRECOS_DOIS_PRODUTOS_PUBLIC = false$/m.test(MODEL_SRC), 'PRECOS_DOIS_PRODUTOS_PUBLIC = false (decisão do fundador)')
ok((CLIENT_SRC.match(/<TwoProductsPricing \/>/g) || []).length === 1
  && CLIENT_SRC.includes('        <PricingCreditsBlock />\n        {PRECOS_DOIS_PRODUTOS_PUBLIC ? <TwoProductsPricing /> : null}\n'), 'o /pricing só monta as tabelas atrás do interruptor, logo abaixo de "One-time credits"')
ok((CLIENT_SRC.match(/TwoProductsPricing|PRECOS_DOIS_PRODUTOS_PUBLIC/g) || []).length === 5, 'PricingClient: só o import, o interruptor e a linha do bloco (mudança mínima)')
ok(!/checkoutPricing|app\/api\/stripe/.test(MODEL_SRC.replace(/^\/\/.*$/gm, '')), 'o modelo não toca lib/checkoutPricing.ts nem app/api/stripe (planos chegam de fora)')
ok(/TIER_PRICES\.basic\.usd, credits: TIER_CREDITS\.basic/.test(COMP_SRC) && /creator: PLANS\[1\]/.test(COMP_SRC), 'componente deriva o Creator de TIER_PRICES.basic / TIER_CREDITS.basic')
ok(!/\b\d+\s*cr\b|\$\s?\d/.test(COMP_SRC.replace(/^\s*\/\/.*$/gm, '')), 'nenhum preço digitado no componente')

// ─── 2-5. Modelo executado e marcação ───────────────────────────────────────
console.log('2. células derivadas')
const real = problems()
ok(real.p.length === 0, 'cada célula = clipCreditCost / creditCostForDuration, ≈US$ no Creator, contagens para baixo, só motores públicos' + (real.p.length ? '\n       ' + real.p.join('\n       ') : ''))
const row = (list, e) => list.find((r) => r.engine === e)
ok(row(real.m.films, 'seedance').cells[1] === null && row(real.m.films, 'hollywood').cells[1] !== null, 'filme de 30 s só na estrada hollywood (Seedance 1.5 não aceita 30)')
ok(JSON.stringify(row(real.m.clips, 'veo').cells.map((c) => c.seconds)) === '[6,8]', 'Veo mostra 6 s e 8 s (o que entrega), nunca "5 s"')
ok(row(real.m.clips, 'kling').cells.every((c) => c && [5, 10].includes(c.seconds)), 'Kling 2.5: 5 s e 10 s')
ok(!real.m.clips.some((r) => r.engine === 'omni' || r.engine === 's25'), 'Omni e Seedance 2.5 (pausados) fora das tabelas')

console.log('3. acompanha as fontes')
const s35 = problems({ 'lib/credits/engineCost.ts': read('lib/credits/engineCost.ts').replace(/(case 'cinematic_ai':[\s\S]*?)return 25\n/, '$1return 35\n') })
ok(s35.p.length === 0 && row(s35.m.films, 'seedance').cells[2].credits === 35 && row(s35.m.films, 'seedance').cells[0].credits === 9, 'Seedance a 35 cr/60 s (branch do CEO): a tabela segue sozinha (60 s = 35, 15 s = 9)')
const mkt = problems({ 'lib/clips/clipPricing.ts': read('lib/clips/clipPricing.ts').replace('export const CLIP_PRECO_MERCADO_PUBLIC = false', 'export const CLIP_PRECO_MERCADO_PUBLIC = true') })
ok(mkt.p.length === 0 && row(mkt.m.clips, 'hollywood').cells[0].credits === 6 && row(real.m.clips, 'hollywood').cells[0].credits === 8, 'régua de mercado ligada: o clipe Kling 3 de 5 s vai de 8 para 6 cr na tabela sem tocar nela')

console.log('4. marcação')
ok(real.html.includes('data-kineo="two-products-pricing"') && real.html.includes('Clips — per second') && real.html.includes('Narrated films — per film'), 'render offline das duas seções')
ok(!/<button|href="\/api/.test(real.html), 'só leitura: nenhum botão de compra novo (checkout segue nos cards de plano)')

// ─── 6. Mutantes ─────────────────────────────────────────────────────────────
console.log('5. mutantes')
const mut = (file, from, to) => {
  const base = read(file)
  if (!base.includes(from)) throw new Error('mutante não aplicou: ' + from)
  return { [file]: base.replace(from, to) }
}
const MUTANTS = [
  ['filme com preço fixo de 60 s', mut(MODEL, 'cell(seconds, creditCostForDuration(quality, true, seconds), usdPerCredit)', 'cell(seconds, creditCostForDuration(quality, true, 60), usdPerCredit)')],
  ['filme mostra 30 s em todo motor', mut(MODEL, 'offered.includes(seconds) ? cell(', 'true ? cell(')],
  ['sem filtro de motor público', mut(COMP, "engineListed: (engine) => !enginePaused(engine) && (engine !== 's25' || S25_PUBLIC)", 'engineListed: () => true')],
  ['contagem arredondada para cima', mut(MODEL, 'count: Math.floor(plan.credits / clipHigh.credits)', 'count: Math.ceil(plan.credits / clipHigh.credits)')],
  ['≈US$ no crédito do Studio', mut(COMP, 'creator: PLANS[1],', 'creator: PLANS[2],')],
  ['clipe na duração do alvo, não na real', mut(MODEL, 'return real !== null && offeredSecondsFor(engine).includes(real) ? real : null', 'return target')],
  ['clipe com foto cobrado diferente', mut(MODEL, 'cell(seconds, clipCreditCost(engine, seconds, false), usdPerCredit)', 'cell(seconds, clipCreditCost(engine, seconds, false) - 1, usdPerCredit)')],
]
for (const [name, over] of MUTANTS) {
  let caught
  try { caught = problems(over).p.length > 0 } catch { caught = true }
  ok(caught, `mutante pego: ${name}`)
}
ok(/^export const PRECOS_DOIS_PRODUTOS_PUBLIC = false$/m.test(MODEL_SRC.replace('= false', '= false')) && !/^export const PRECOS_DOIS_PRODUTOS_PUBLIC = false$/m.test(MODEL_SRC.replace('PRECOS_DOIS_PRODUTOS_PUBLIC = false', 'PRECOS_DOIS_PRODUTOS_PUBLIC = true')), 'mutante pego: interruptor ligado no código')

console.log(`\n${pass} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
