// KINEO-PRECOS-CARTAO-VALOR-2026-10-09 — guardião do cartão de plano que mostra o que o plano COMPRA (pedido do fundador
// 09/10, com os prints da InVideo: "quantos clipes com cada motor, quantas imagens do Nano Banana").
// KINEO-PRECOS-REFINO-2026-10-09 — e do refino da mesma madrugada ("mais refinado, menos cores… o botão de comprar abaixo do
// preço: Get Starter, Get Creator, Get Studio"; cor escolhida: "Cor 1 porcelana, precisamos manter os 2 temas"). Prova:
//   1. EXECUTADO com o modelo real do /pricing (components/pricing/TwoProductsPricing.tsx twoProductsModelForPage →
//      clipCreditCost / creditCostForDuration): cada contagem = floor(créditos do plano ÷ custo da rota), clipe no alvo de
//      5 s com a duração REAL do motor (Veo 6 s), filme de 60 s, imagem Nano Banana Pro ao custo da rota de imagens; e o
//      cartão conta com ESSE modelo (planValueForPage = planValueFor com o modelo da página);
//   2. o custo da imagem: lib/marketingPrice.ts IMG_NANOBANANA_CR = app/api/images/generate MODELS.nanobanana.cost;
//   3. o topo do cartão só mostra clipe e filme que o plano paga ≥ 1 vez; a tabela por motor mostra "—" onde não paga;
//   4. RENDER offline do cartão do Creator e do Starter com os números reais (o que a pessoa lê): créditos, imagens, clipe,
//      filme, tabela motor a motor, preço riscado, botão "Get <plano>", economia, incluso;
//   5. a página: interruptor ligado, paleta porcelana (decisão do fundador), ?preview=valor e ?tema= lidos no efeito, botão
//      no MESMO handleBuy, economia = 12 × getTierPrice − getAnnualPrice, CSS sem escape (hidratação), PricingClient sem
//      conta de modelo (os harnesses de render trocam todo import de @/components por stub), a parte de baixo limpa;
//   6. a porcelana segue os 2 temas do site: o bloco base do CSS usa os tokens de appearance.css (claro e escuro);
//   7. nenhum número de preço/crédito digitado no componente (só CSS);
//   8. a caixa "How many films do I get?" (components/growth/MrrPricingProof.tsx): pergunta como título, 3 botões, as
//      garantias de sempre, CSS sem escape;
//   9. mutantes: cada um deixa pelo menos uma verificação vermelha.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, offlineModules, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const read = (rel) => readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n')
const VALUE = 'lib/pricingPlanValue.ts'
const STAGE = 'components/pricing/PlanValueStage.tsx'
const CLIENT = 'app/pricing/PricingClient.tsx'
const MKT = 'lib/marketingPrice.ts'
const ROUTE = 'app/api/images/generate/route.ts'
const PROOF = 'components/growth/MrrPricingProof.tsx'
const APPEAR = 'app/appearance.css'
const SRC = { [VALUE]: read(VALUE), [STAGE]: read(STAGE), [CLIENT]: read(CLIENT), [MKT]: read(MKT), [ROUTE]: read(ROUTE), [PROOF]: read(PROOF), [APPEAR]: read(APPEAR) }

const strip = (html) => html.replace(/<!-- -->/g, '')

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
    // o cartão conta com o MESMO modelo da página
    let page
    try { page = stage.planValueForPage(credits) } catch (e) { p.push(`${tier}: planValueForPage quebrou: ${String(e && e.message)}`) }
    if (page && JSON.stringify(page) !== JSON.stringify(v)) p.push(`${tier}: o cartão conta com outro modelo/imagem que não o da página`)
    // 3. topo do cartão: só o que paga ≥ 1
    const card = valueLib.planValueCardLines(v)
    if (card.clips.some((c) => c.count < 1)) p.push(`${tier}: cartão mostra clipe que o plano não paga`)
    if (card.film && card.film.count < 1) p.push(`${tier}: cartão mostra filme que o plano não paga`)
  }
  // 3b. com a escada de hoje todo plano paga ≥ 1 de cada clipe — um plano de 5 créditos prova o filtro do cartão de verdade
  const tiny = valueLib.planValueCardLines(valueLib.planValueFor(5, model, image))
  if (tiny.clips.some((c) => c.count < 1)) p.push('cartão de 5 créditos mostra clipe que não paga (o filtro ≥ 1 sumiu)')
  if (tiny.film !== null) p.push('cartão de 5 créditos mostra filme de 60 s que não paga')
  if (!values.basic || values.basic.clips.length === 0 || values.basic.films.length === 0) return p

  // 4. render do cartão (Creator e Starter)
  const props = (tier, name, popular) => ({
    tier, name, popular, requested: false, credits: prices.TIER_CREDITS[tier], amount: '$A', was: '$W', per: '/month, $T billed yearly',
    ctaLabel: `Get ${name}`, ctaDisabled: false, onBuy: () => {}, save: 'SAVE-LINE', included: ['No watermark', 'Commercial use'],
  })
  try {
    const v = values.basic
    const card = valueLib.planValueCardLines(v)
    const html = strip(renderToStaticMarkup(React.createElement(stage.PlanValueCard, props('basic', 'Creator', true))))
    if (!html.includes(`${v.credits}</span> credits a month`)) p.push('cartão: linha de créditos por mês')
    if (!html.includes(`${v.images.count}</span> Nano Banana Pro images`)) p.push('cartão: linha das imagens Nano Banana Pro')
    const top = card.clips[0]
    if (!top || !html.includes(`${top.count}</span> ${top.label} clips`)) p.push('cartão: linha do clipe do topo')
    if (card.film && !html.includes(`${card.film.count}</span> narrated films`)) p.push('cartão: linha do filme de 60 s')
    for (const c of v.clips) {
      const f = v.films.find((x) => x.engine === c.engine)
      const filmCell = f && f.count >= 1 ? `<b>${f.count}</b>` : '<span class="pv-none">—</span>'
      if (!html.includes(`<tr><td>${c.label}</td><td><b>${c.count}</b></td><td>${filmCell}</td></tr>`)) p.push(`cartão: linha da tabela do ${c.label}`)
    }
    if (!html.includes('Most popular') || !html.includes('data-popular="true"')) p.push('cartão: selo do mais popular')
    if (!/<button[^>]*class="pv-cta pv-cta-pop"[^>]*>Get Creator<\/button>/.test(html)) p.push('cartão: botão "Get Creator" com a cor do plano popular')
    const iPrice = html.indexOf('class="pv-amount"'), iCta = html.indexOf('class="pv-cta'), iSave = html.indexOf('SAVE-LINE'), iTable = html.indexOf('class="pv-table"')
    if (!(iPrice > 0 && iPrice < iCta && iCta < iSave && iSave < iTable)) p.push('cartão: ordem preço → botão → economia → tabela (o botão logo abaixo do preço)')
    if (!html.includes('<span class="pv-was">$W</span>')) p.push('cartão: o mensal riscado ao lado do preço do anual')
    if (!html.includes('No watermark') || !html.includes('Commercial use')) p.push('cartão: o que vem incluso')
    // o MESMO cartão com o Starter: um número digitado no componente acertaria um plano e erraria o outro
    const s = values.starter
    const htmlS = strip(renderToStaticMarkup(React.createElement(stage.PlanValueCard, props('starter', 'Starter', false))))
    if (!htmlS.includes(`${s.credits}</span> credits a month`) || !htmlS.includes(`${s.images.count}</span> Nano Banana Pro images`)) p.push('cartão do Starter: créditos e imagens do próprio plano')
    if (htmlS.includes('Most popular')) p.push('cartão do Starter com selo de mais popular')
    if (!/<button[^>]*class="pv-cta"[^>]*>Get Starter<\/button>/.test(htmlS)) p.push('cartão do Starter: botão "Get Starter" neutro')
    const zero = s.films.find((f) => f.count === 0)
    if (zero && !htmlS.includes(`<tr><td>${zero.label}</td><td><b>`)) p.push(`cartão do Starter: linha do ${zero.label}`)
    if (zero && !new RegExp(`<tr><td>${zero.label.replace('.', '\\.')}</td><td><b>\\d+</b></td><td><span class="pv-none">—</span></td></tr>`).test(htmlS)) p.push('cartão do Starter: filme que o plano não paga tem de mostrar "—"')
  } catch (e) {
    p.push('render: ' + String(e && e.message))
  }

  // 5. a página
  const client = src(CLIENT)
  if (!/^export const PRICING_VALUE_CARDS_PUBLIC = true$/m.test(client)) p.push('interruptor: PRICING_VALUE_CARDS_PUBLIC é true desde o "1 sim" do fundador (09/10)')
  if (!/^export const PRICING_VALUE_PALETTE: PlanValuePalette = 'porcelana'$/m.test(client)) p.push('paleta: porcelana é a escolha do fundador (09/10, "Cor 1 porcelana")')
  if (!client.includes("if (params.get('preview') === 'valor') setValueCards(true)")) p.push('prévia: ?preview=valor lido no efeito')
  if (!client.includes('if (isPlanValuePalette(tema)) setValuePalette(tema)')) p.push('prévia: ?tema= lido no efeito, só paleta conhecida')
  if (!client.includes('const [valueCards, setValueCards] = useState(PRICING_VALUE_CARDS_PUBLIC)') || !client.includes('useState<PlanValuePalette>(PRICING_VALUE_PALETTE)')) p.push('estado nasce das constantes (hidratação igual ao servidor)')
  if (!client.includes('<section className="pv-stage" data-palette={valuePalette} aria-label="Plans">')) p.push('o palco recebe a paleta')
  if (!client.includes('onBuy={() => handleBuy(tier)}')) p.push('botão do cartão novo chama o MESMO handleBuy')
  if (!client.includes("(switchLabel ?? `Get ${p.name}`)")) p.push('botão: "Get <plano>" (pedido do fundador)')
  if (!client.includes('credits={TIER_CREDITS[tier]}')) p.push('cartão recebe os créditos do plano (TIER_CREDITS)')
  if (!client.includes('const annualSavingMinor = getTierPrice(tier, resolvedCurrency, resolvedRegion) * 12 - getAnnualPrice(tier, resolvedCurrency, resolvedRegion)')) p.push('economia do anual = 12 × mensal − anual, das funções do caixa')
  if (!client.includes('was={annual && displayCurrency ? p.price : undefined}')) p.push('mensal riscado só no anual')
  if (!client.includes('<style dangerouslySetInnerHTML={{ __html: PLAN_VALUE_STAGE_CSS }} />') || client.includes('<style>{PLAN_VALUE_STAGE_CSS}</style>')) p.push('CSS do cartão sem escape (o ">" escapado quebra a hidratação)')
  if (/twoProductsModelForPage|planValueFor\(|IMG_NANOBANANA_CR/.test(client.replace(/^\s*\/\/.*$/gm, ''))) p.push('PricingClient faz conta de modelo (o harness troca todo import de @/components por stub e a página quebra no teste)')
  if (!client.includes('{valueCards ? null : <MrrPricingProof />}') || !client.includes('{valueCards ? <MrrPricingProof /> : null}')) p.push('a caixa dos filmes desce para baixo dos planos só com o cartão novo')
  if (!client.includes("{valueCards ? null : (\n        <div className=\"mx-auto mt-8 max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4\">\n          <p className=\"mb-2.5 text-center text-[11px] font-extrabold uppercase tracking-[.14em] text-[var(--accent)]\">What one credit buys</p>")) p.push('"What one credit buys" sai com o cartão novo')
  if (!client.includes('{valueCards ? null : agencyPath}') || !client.includes('{valueCards ? agencyPath : null}')) p.push('o bloco das agências desce com o cartão novo')

  // 6. a porcelana segue os 2 temas do site (claro e escuro de app/appearance.css)
  const css = stage.PLAN_VALUE_STAGE_CSS
  const base = (/\.pv-stage\{([^}]*)\}/.exec(css) || [])[1] || ''
  for (const [tok, site] of [['--pv-card-bg', 'var(--card)'], ['--pv-text', 'var(--text)'], ['--pv-line', 'var(--border)'], ['--pv-accent', 'var(--indigo)'], ['--pv-cta-pop-bg', 'var(--indigo)'], ['--pv-cta-pop-text', 'var(--on-accent)']]) {
    if (!base.includes(`${tok}:${site}`)) p.push(`porcelana: ${tok} não segue ${site} do tema do site`)
  }
  const appear = src(APPEAR)
  for (const tok of ['--card', '--text', '--border', '--indigo', '--on-accent']) {
    if (!new RegExp(`:root \\{[\\s\\S]*?${tok}:`).test(appear) || !new RegExp(`html\\[data-theme='dark'\\][\\s\\S]*?${tok}:`).test(appear)) p.push(`tema do site sem ${tok} no claro ou no escuro`)
  }
  for (const pal of ['cobalto', 'ambar', 'tinta']) if (!css.includes(`.pv-stage[data-palette=${pal}]`)) p.push(`paleta ${pal} sumiu do CSS (opção do ?tema=)`)
  if (!stage.isPlanValuePalette('porcelana') || stage.isPlanValuePalette('verde') || stage.isPlanValuePalette(null)) p.push('isPlanValuePalette aceita só as 4 paletas')

  // 7. nada digitado no componente fora do CSS
  const stageSrc = src(STAGE)
  const cssAt = stageSrc.indexOf('export const PLAN_VALUE_STAGE_CSS')
  const semCss = stageSrc.slice(0, cssAt) + stageSrc.slice(stageSrc.indexOf('`\n', cssAt) + 2)
  const semTags = semCss.replace(/^\s*\/\/.*$/gm, '').replace(/<[^>]+>/g, ' ')
  if (/\b\d+\s*(credits|clips|images|films|cr)\b/i.test(semTags)) p.push('componente com número de crédito/clipe/imagem digitado')
  if (/\$\s?\d/.test(semCss.replace(/^\s*\/\/.*$/gm, ''))) p.push('componente com preço digitado')

  // 8. a caixa dos filmes
  const proof = src(PROOF)
  if (!proof.includes('How many films do I get?') || /<select/.test(proof.replace(/^\s*\/\/.*$/gm, '')) || !proof.includes('const LENGTHS = [15, 35, 60] as const')) p.push('caixa dos filmes: pergunta como título e 3 botões no lugar do select')
  for (const must of ['/v/83db8b63-b654-491e-a0aa-86ce1bc1f3d7', '7 days of the first charge', 'not an automatic refund of your subscription', 'if (!MRR_PRICING_PROOF_ENABLED) return null']) if (!proof.includes(must)) p.push(`caixa dos filmes perdeu: ${must}`)
  if (!proof.includes('<style dangerouslySetInnerHTML={{ __html: CSS }} />')) p.push('caixa dos filmes: CSS sem escape')
  return p
}

let pass = 0
let fail = 0
const base = problems()
if (base.length === 0) { pass++; console.log('  ok  página certa: contagens executadas, render, página, 2 temas, nada digitado, caixa dos filmes') } else { fail++; for (const x of base) console.log('  FAIL ' + x) }

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
  ['tabela mostra filme que o plano não paga', troca(STAGE, "typeof n === 'number' && n >= 1 ? <b>{n}</b>", "typeof n === 'number' ? <b>{n}</b>")],
  ['número digitado no cartão', troca(STAGE, '<span className="pv-n">{value.credits}</span> credits a month', '<span className="pv-n">150</span> credits a month')],
  ['botão volta para baixo da tabela', (() => {
    const btn = "        <button type=\"button\" className={props.popular ? 'pv-cta pv-cta-pop' : 'pv-cta'} disabled={props.ctaDisabled} onClick={props.onBuy}>\n          {props.ctaLabel}\n        </button>\n"
    const inc = '      <div className="pv-sec">\n        <div className="pv-label">Included</div>\n'
    const s = SRC[STAGE]
    if (s.split(btn).length !== 2 || s.split(inc).length !== 2) throw new Error('mutante do botão sem alvo único')
    return { [STAGE]: s.replace(btn, '').replace(inc, btn + inc) }
  })()],
  ['interruptor volta a desligado sem decisão', troca(CLIENT, 'export const PRICING_VALUE_CARDS_PUBLIC = true', 'export const PRICING_VALUE_CARDS_PUBLIC = false')],
  ['paleta trocada sem decisão', troca(CLIENT, "export const PRICING_VALUE_PALETTE: PlanValuePalette = 'porcelana'", "export const PRICING_VALUE_PALETTE: PlanValuePalette = 'cobalto'")],
  ['botão do cartão novo deixa de chamar o handleBuy', troca(CLIENT, 'onBuy={() => handleBuy(tier)}', 'onBuy={() => {}}')],
  ['botão volta a "Choose"', troca(CLIENT, "(switchLabel ?? `Get ${p.name}`)", "(switchLabel ?? `Choose ${p.name}`)")],
  ['economia do anual com a conta errada', troca(CLIENT, 'resolvedRegion) * 12 - getAnnualPrice', 'resolvedRegion) * 10 - getAnnualPrice')],
  ['CSS do cartão volta a ser filho de <style> (hidratação)', troca(CLIENT, '<style dangerouslySetInnerHTML={{ __html: PLAN_VALUE_STAGE_CSS }} />', '<style>{PLAN_VALUE_STAGE_CSS}</style>')],
  ['PricingClient volta a fazer a conta do modelo', troca(CLIENT, "import TwoProductsPricing from '@/components/pricing/TwoProductsPricing'", "import TwoProductsPricing, { twoProductsModelForPage } from '@/components/pricing/TwoProductsPricing'")],
  ['porcelana deixa de seguir o tema escuro', troca(STAGE, '.pv-stage{--pv-card-bg:var(--card);', '.pv-stage{--pv-card-bg:#FFFFFF;')],
  ['caixa dos filmes volta ao select', troca(PROOF, "<div className=\"mpp-seg\" role=\"group\" aria-label=\"Film length\">", "<select aria-label=\"Film length\"><div className=\"mpp-seg\" role=\"group\">")],
]
for (const [nome, rep] of MUTANTES) {
  const m = problems(rep)
  if (m.length >= 1) { pass++; console.log(`  ok  mutante "${nome}" → vermelho (${m.length})`) } else { fail++; console.log(`  FAIL mutante "${nome}" passou verde`) }
}
console.log(`\n  verificações: ${pass + fail} · falhas: ${fail}`)
if (fail) process.exit(1)
console.log('OK — o cartão conta imagens, clipes e filmes pela régua da rota, no modelo InVideo, na porcelana (claro e escuro)')
