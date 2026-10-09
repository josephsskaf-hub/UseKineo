// KINEO-PRECOS-CARTAO-VALOR-2026-10-09 — guardião do cartão de plano que mostra o que o plano COMPRA (pedido do fundador
// 09/10, com os prints da InVideo: "quantos clipes com cada motor, quantas imagens do Nano Banana"). Prova:
//   1. EXECUTADO com o modelo real do /pricing (components/pricing/TwoProductsPricing.tsx twoProductsModelForPage →
//      clipCreditCost / creditCostForDuration): cada contagem do cartão = floor(créditos do plano ÷ custo da rota), clipe no
//      alvo de 5 s com a duração REAL do motor (Veo 6 s), filme de 60 s, imagem Nano Banana Pro ao custo da rota de imagens;
//   2. o custo da imagem: lib/marketingPrice.ts IMG_NANOBANANA_CR = app/api/images/generate MODELS.nanobanana.cost;
//   3. o cartão só mostra clipe e filme que o plano paga ≥ 1 vez; a tabela completa mostra "—" onde não paga;
//   4. RENDER offline do cartão e da tabela com os números reais (o que a pessoa lê);
//   5. o interruptor: PRICING_VALUE_CARDS_PUBLIC=false, ?preview=valor lido no efeito (nunca no render), o botão chama o
//      MESMO handleBuy, a prova do filme desce para baixo do palco só com o cartão novo;
//   6. nenhum número de preço/crédito digitado no componente (só CSS);
//   7. mutantes: cada um deixa pelo menos uma verificação vermelha.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, offlineModules, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const read = (rel) => readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n')
const VALUE = 'lib/pricingPlanValue.ts'
const STAGE = 'components/pricing/PlanValueStage.tsx'
const CLIENT = 'app/pricing/PricingClient.tsx'
const MKT = 'lib/marketingPrice.ts'
const ROUTE = 'app/api/images/generate/route.ts'
const SRC = { [VALUE]: read(VALUE), [STAGE]: read(STAGE), [CLIENT]: read(CLIENT), [MKT]: read(MKT), [ROUTE]: read(ROUTE) }

function problems(replacements = {}) {
  const p = []
  const src = (rel) => replacements[rel] ?? SRC[rel]
  let load
  try {
    load = offlineModules({ replacements })
  } catch (e) {
    return ['carregador: ' + String(e && e.message)]
  }
  let model, valueLib, stage, prices, mkt
  try {
    model = load('components/pricing/TwoProductsPricing.tsx').twoProductsModelForPage()
    valueLib = load(VALUE)
    stage = load(STAGE)
    prices = load('lib/checkoutPricing.ts')
    mkt = load(MKT)
  } catch (e) {
    return ['módulos carregam: ' + String(e && e.message)]
  }

  // 2. custo da imagem = o da rota
  const routeCost = Number((/nanobanana:\s*\{[\s\S]*?cost:\s*(\d+)/.exec(src(ROUTE)) || [])[1])
  if (!(mkt.IMG_NANOBANANA_CR > 0) || mkt.IMG_NANOBANANA_CR !== routeCost) p.push(`imagem: IMG_NANOBANANA_CR ${mkt.IMG_NANOBANANA_CR} ≠ rota ${routeCost}`)

  // 1. contagens executadas
  const image = { label: 'Nano Banana Pro', creditsEach: mkt.IMG_NANOBANANA_CR }
  const clipCol = [5, 10].indexOf(5)
  const filmCol = [15, 30, 60, 90].indexOf(60)
  const values = {}
  for (const tier of ['starter', 'basic', 'pro']) {
    const credits = prices.TIER_CREDITS[tier]
    const v = valueLib.planValueFor(credits, model, image)
    values[tier] = v
    if (v.credits !== credits) p.push(`${tier}: créditos ${v.credits} ≠ TIER_CREDITS ${credits}`)
    if (v.images.count !== Math.floor(credits / image.creditsEach)) p.push(`${tier}: imagens ${v.images.count} ≠ floor(${credits}/${image.creditsEach})`)
    const clipRows = model.clips.filter((r) => r.cells[clipCol])
    if (v.clips.length !== clipRows.length) p.push(`${tier}: ${v.clips.length} clipes ≠ ${clipRows.length} motores com clipe de 5 s`)
    for (const row of clipRows) {
      const cell = row.cells[clipCol]
      const mine = v.clips.find((c) => c.engine === row.engine)
      if (!mine) { p.push(`${tier}: faltou o clipe ${row.engine}`); continue }
      if (mine.seconds !== cell.seconds || mine.creditsEach !== cell.credits) p.push(`${tier}: clipe ${row.engine} ${mine.seconds}s/${mine.creditsEach}cr ≠ modelo ${cell.seconds}s/${cell.credits}cr`)
      if (mine.count !== Math.floor(credits / cell.credits)) p.push(`${tier}: clipe ${row.engine} conta ${mine.count} ≠ floor(${credits}/${cell.credits})`)
    }
    const filmRows = model.films.filter((r) => r.cells[filmCol])
    if (v.films.length !== filmRows.length) p.push(`${tier}: ${v.films.length} filmes ≠ ${filmRows.length} motores com 60 s`)
    for (const row of filmRows) {
      const cell = row.cells[filmCol]
      const mine = v.films.find((f) => f.engine === row.engine)
      if (!mine) { p.push(`${tier}: faltou o filme ${row.engine}`); continue }
      if (mine.count !== Math.floor(credits / cell.credits) || mine.creditsEach !== cell.credits) p.push(`${tier}: filme ${row.engine} ${mine.count}× ${mine.creditsEach}cr ≠ floor(${credits}/${cell.credits})`)
    }
    for (let i = 1; i < v.films.length; i++) if (v.films[i].creditsEach < v.films[i - 1].creditsEach) p.push(`${tier}: filmes fora da ordem do mais barato`)
    // 3. cartão: só o que paga ≥ 1
    const card = valueLib.planValueCardLines(v)
    if (card.clips.some((c) => c.count < 1)) p.push(`${tier}: cartão mostra clipe que o plano não paga`)
    if (card.clips.length > valueLib.PLAN_VALUE_CARD_CLIP_LINES) p.push(`${tier}: cartão com mais de ${valueLib.PLAN_VALUE_CARD_CLIP_LINES} linhas de clipe`)
    if (card.film && card.film.count < 1) p.push(`${tier}: cartão mostra filme que o plano não paga`)
  }
  // 3b. com a escada de hoje todo plano paga ≥ 1 de cada clipe — um plano de 5 créditos prova o filtro do cartão de verdade
  const tiny = valueLib.planValueCardLines(valueLib.planValueFor(5, model, image))
  if (tiny.clips.some((c) => c.count < 1)) p.push('cartão de 5 créditos mostra clipe que não paga (o filtro ≥ 1 sumiu)')
  if (tiny.film !== null) p.push('cartão de 5 créditos mostra filme de 60 s que não paga')
  if (!values.basic || values.basic.clips.length === 0 || values.basic.films.length === 0) return p

  // 4. render do cartão e da tabela
  try {
    const v = values.basic
    const card = valueLib.planValueCardLines(v)
    const html = renderToStaticMarkup(React.createElement(stage.PlanValueCard, {
      tier: 'basic', name: 'Creator', popular: true, requested: false, value: v, amount: '$X', per: '/month',
      ctaLabel: 'Choose Creator →', ctaDisabled: false, onBuy: () => {}, footnote: 'Cancel anytime',
    })).replace(/<!-- -->/g, '')
    if (!html.includes(`${v.credits}</span> credits / month`)) p.push('cartão: linha de créditos por mês')
    if (!html.includes(`${v.images.count}</span> Nano Banana Pro images`)) p.push('cartão: linha das imagens Nano Banana Pro')
    for (const c of card.clips) if (!html.includes(`${c.count}</span> ${c.label} clips`) || !html.includes(`· ${c.seconds} s`)) p.push(`cartão: clipe ${c.label}`)
    if (card.film && !html.includes(`${card.film.count}</span> finished ${card.film.seconds} s films`)) p.push('cartão: linha do filme de 60 s')
    if (!html.includes('Most popular') || !html.includes('data-tier="basic"')) p.push('cartão: selo do mais popular e a cor do plano')
    if (!html.includes('Choose Creator →') || !/<button[^>]*class="pv-cta"/.test(html)) p.push('cartão: botão de compra')
    // o MESMO cartão com o Starter: um número digitado no componente acertaria um plano e erraria o outro
    const s = values.starter
    const htmlS = renderToStaticMarkup(React.createElement(stage.PlanValueCard, {
      tier: 'starter', name: 'Starter', popular: false, requested: false, value: s, amount: '$X', per: '/month',
      ctaLabel: 'Choose Starter →', ctaDisabled: false, onBuy: () => {},
    })).replace(/<!-- -->/g, '')
    if (!htmlS.includes(`${s.credits}</span> credits / month`) || !htmlS.includes(`${s.images.count}</span> Nano Banana Pro images`)) p.push('cartão do Starter: créditos e imagens do próprio plano')
    if (htmlS.includes('Most popular')) p.push('cartão do Starter com selo de mais popular')
    const plans = ['starter', 'basic', 'pro'].map((t, i) => ({ tier: t, name: ['Starter', 'Creator', 'Studio'][i], value: values[t] }))
    const mat = renderToStaticMarkup(React.createElement(stage.PlanValueMatrix, { plans })).replace(/<!-- -->/g, '')
    if (!mat.includes('What each plan makes in a month')) p.push('tabela: título')
    const zero = values.starter.films.find((f) => f.count === 0)
    if (zero && !mat.includes('pv-dash')) p.push('tabela: plano que não paga um filme tem de mostrar "—"')
    for (const t of ['starter', 'basic', 'pro']) if (!mat.includes(`<td>${values[t].images.count}</td>`)) p.push(`tabela: imagens do ${t}`)
  } catch (e) {
    p.push('render: ' + String(e && e.message))
  }

  // 5. interruptor e ligação com a página
  const client = src(CLIENT)
  if (!/^export const PRICING_VALUE_CARDS_PUBLIC = false$/m.test(client)) p.push('interruptor: PRICING_VALUE_CARDS_PUBLIC tem de nascer false (o fundador aprova antes)')
  if (!client.includes("if (params.get('preview') === 'valor') setValueCards(true)")) p.push('prévia: ?preview=valor lido no efeito')
  if (!client.includes('const [valueCards, setValueCards] = useState(PRICING_VALUE_CARDS_PUBLIC)')) p.push('prévia: estado nasce do interruptor (hidratação igual ao servidor)')
  if (!client.includes('onBuy={() => handleBuy(tier)}')) p.push('botão do cartão novo chama o MESMO handleBuy')
  if (!client.includes('{valueCards ? null : <MrrPricingProof />}') || !client.includes('<div style={{ marginTop: 18 }}><MrrPricingProof /></div>')) p.push('a prova do filme desce para baixo do palco só com o cartão novo')

  // 6. nada digitado no componente fora do CSS
  const stageSrc = src(STAGE)
  const semCss = stageSrc.slice(0, stageSrc.indexOf('export const PLAN_VALUE_STAGE_CSS')) + stageSrc.slice(stageSrc.indexOf('`\n', stageSrc.indexOf('export const PLAN_VALUE_STAGE_CSS')) + 2)
  const semTags = semCss.replace(/^\s*\/\/.*$/gm, '').replace(/<[^>]+>/g, ' ')
  if (/\b\d+\s*(credits|clips|images|films|cr)\b/i.test(semTags)) p.push('componente com número de crédito/clipe/imagem digitado')
  if (/\$\s?\d/.test(semCss.replace(/^\s*\/\/.*$/gm, ''))) p.push('componente com preço digitado')
  return p
}

let pass = 0
let fail = 0
const base = problems()
const TOTAL = 1
if (base.length === 0) { pass++; console.log('  ok  página certa: contagens executadas, render, interruptor, nada digitado') } else { fail++; for (const x of base) console.log('  FAIL ' + x) }

const troca = (rel, de, para) => {
  const s = SRC[rel]
  if (s.split(de).length !== 2) throw new Error(`mutante sem alvo único em ${rel}: ${de.slice(0, 70)}`)
  return { [rel]: s.replace(de, para) }
}
const MUTANTES = [
  ['conta arredonda para cima (promete clipe que o plano não paga)', troca(VALUE, 'Math.floor(safeCredits / each)', 'Math.ceil(safeCredits / each)')],
  ['imagem Nano Banana a 4 cr no espelho (diverge da rota)', troca(MKT, 'export const IMG_NANOBANANA_CR = 5', 'export const IMG_NANOBANANA_CR = 4')],
  ['cartão mostra clipe que o plano não paga', troca(VALUE, 'clips: value.clips.filter((c) => c.count >= 1).slice(0, PLAN_VALUE_CARD_CLIP_LINES),', 'clips: value.clips.slice(0, PLAN_VALUE_CARD_CLIP_LINES),')],
  ['filmes deixam de ir do mais barato ao mais caro', troca(VALUE, '.sort((a, b) => a.creditsEach - b.creditsEach)', '.sort((a, b) => b.creditsEach - a.creditsEach)')],
  ['interruptor nasce ligado sem aprovação', troca(CLIENT, 'export const PRICING_VALUE_CARDS_PUBLIC = false', 'export const PRICING_VALUE_CARDS_PUBLIC = true')],
  ['botão do cartão novo deixa de chamar o handleBuy', troca(CLIENT, 'onBuy={() => handleBuy(tier)}', 'onBuy={() => {}}')],
  ['número digitado no cartão', troca(STAGE, '<span className="pv-count">{props.value.credits}</span> credits / month', '<span className="pv-count">150</span> credits / month')],
]
for (const [nome, rep] of MUTANTES) {
  const m = problems(rep)
  if (m.length >= 1) { pass++; console.log(`  ok  mutante "${nome}" → vermelho (${m.length})`) } else { fail++; console.log(`  FAIL mutante "${nome}" passou verde`) }
}
console.log(`\n  verificações: ${pass + fail} · falhas: ${fail}`)
if (fail) process.exit(1)
console.log('OK — o cartão conta imagens, clipes e filmes pela régua da rota, atrás do interruptor (prévia em ?preview=valor)')
void TOTAL
