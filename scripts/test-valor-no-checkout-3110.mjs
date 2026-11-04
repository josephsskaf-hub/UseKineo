// KINEO-VALOR-NO-CHECKOUT-3110 — guardião do "valor na hora de pagar" (o vazamento fechado pelo fundador é percepção de preço:
// 33 pessoas abriram o checkout 155 vezes em 7 d e 1 pagou). NADA de preço, plano, crédito ou desconto muda; prova que:
//   1. EXECUTADO: "≈ N more films like this" = floor(TIER_CREDITS ÷ creditCostForDuration(motor do filme, pago, duração)),
//      nos 3 planos; qualidade que não é filme (anúncio, avatar, legado) e duração ausente → nada (sem conta inventada);
//   2. EXECUTADO: "Which plan fits me?" — para TODAS as 36 combinações (3 × 4 × 3), filmes/mês = ceil(por semana × 52/12),
//      o plano é o MAIS BARATO com créditos ≥ necessidade (ou Studio com covers=false), e o preço é o de TIER_PRICES;
//   3. EXECUTADO: a prova social só aparece com número real ≥ piso (100) e nunca arredonda para cima;
//   4. EXECUTADO: a linha da Stripe no ANUAL é a mesma régua do mensal + "credits arrive monthly" (sai "Fast videos" e
//      "priority render queue"); mensal e planos fora dos 3 → null (o mensal segue a linha de sempre);
//   5. FIAÇÃO: a rota /api/films-made pagina (readAll), tira as contas internas (isInternalEmail) e devolve a frase da régua;
//      a rota da Stripe usa a linha do anual nos DOIS caminhos (logado e convidado) antes da descrição velha; a parede de
//      pagamento (ConversionUpgrade) mostra o filme da pessoa + "films like this" + a prova social perto do botão; o
//      /pricing mostra o PlanFinder, a prova social e "films like this" no "Your latest film"; eventos com os nomes pedidos;
//   6. RENDER offline das peças com os números reais;
//   7. mutantes: cada um deixa pelo menos uma verificação vermelha.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, offlineModules, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const MARCA = 'KINEO-VALOR-NO-CHECKOUT-3110'
const LIB = 'lib/valorNoCheckout.ts'
const UI = 'components/checkout/ValorNoCheckout.tsx'
const ROUTE = 'app/api/films-made/route.ts'
// KINEO-COPIA-ORCAMENTO-CONTADOR-0211 — a contagem (readAll, contas internas fora, só concluídos) mudou para a leitura única
// de todos os contadores públicos; a rota só fatia os 30 dias e monta a frase.
const SERVER = 'lib/publicStatsServer.ts'
const STRIPE = 'app/api/stripe/checkout/route.ts'
const UPGRADE = 'components/offers/ConversionUpgrade.tsx'
const PRICING = 'app/pricing/PricingClient.tsx'
const read = (rel) => readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n')
const SRC = Object.fromEntries([LIB, UI, ROUTE, SERVER, STRIPE, UPGRADE, PRICING].map((rel) => [rel, read(rel)]))

const analyticsMock = { trackEvent: async () => {} }

function problems(replacements = {}) {
  const p = []
  const src = (rel) => replacements[rel] ?? SRC[rel]
  let lib, ec, cp, cv, ui
  try {
    const load = offlineModules({ replacements, mocks: { 'lib/analytics.ts': analyticsMock } })
    lib = load(LIB)
    ec = load('lib/credits/engineCost.ts')
    cp = load('lib/checkoutPricing.ts')
    cv = load('lib/growth/checkoutValueContext.ts')
    ui = load(UI)
  } catch (e) {
    return ['módulos carregam: ' + String(e && e.message)]
  }
  const TIERS = ['starter', 'basic', 'pro']

  // 1. films like this
  for (const [q, s] of [['cinematic_ai', 35], ['cinematic_ai', 15], ['cinematic_kling', 60], ['cinematic_hollywood', 60], ['cinematic_h3', 90], ['fast', 60]]) {
    const v = lib.filmsLikeThis(q, s)
    const each = ec.creditCostForDuration(q, true, s)
    if (!v) { p.push(`filmsLikeThis(${q}, ${s}) = null`); continue }
    if (v.creditsEach !== each) p.push(`${q} ${s}s: custo ${v.creditsEach} ≠ creditCostForDuration ${each}`)
    for (const tier of TIERS) {
      const t = v.tiers.find((x) => x.tier === tier)
      const want = Math.floor(cp.TIER_CREDITS[tier] / each)
      if (!t || t.films !== want) p.push(`${q} ${s}s ${tier}: ${t && t.films} ≠ floor(${cp.TIER_CREDITS[tier]}/${each}) = ${want}`)
    }
  }
  for (const [q, s, why] of [['ads_v2', 15, 'anúncio'], ['avatar', 30, 'avatar'], ['basic_ai', 60, 'legado'], ['cinematic_ai', null, 'sem duração'], ['cinematic_ai', 0, 'duração 0'], [null, 60, 'sem motor']]) {
    if (lib.filmsLikeThis(q, s) !== null) p.push(`filmsLikeThis sem base honesta (${why}) deveria ser null`)
  }
  const sd35 = lib.filmsLikeThis('cinematic_ai', 35)
  const line35 = lib.filmsLikeThisLine(sd35)
  const films35 = Math.floor(cp.TIER_CREDITS.starter / ec.creditCostForDuration('cinematic_ai', true, 35))
  const want35 = `≈ ${films35} more ${films35 === 1 ? 'film' : 'films'} like this a month on Starter` // KINEO-PRECO-MERCADO-0411 — 40 cr pagam 1 filme de 35 s
  if (!line35 || !line35.startsWith(want35) || !line35.includes(' on Creator') || !line35.includes(' on Studio')) p.push(`linha "films like this": ${line35}`)
  if (lib.filmsLikeThisMath(sd35) !== `Seedance 1.5 · 35 s · ${ec.creditCostForDuration('cinematic_ai', true, 35)} credits each`) p.push(`conta à vista: ${lib.filmsLikeThisMath(sd35)}`)

  // 2. plan finder — todas as combinações
  let combos = 0
  for (const pw of lib.PLAN_FINDER_PER_WEEK.map((o) => o.value)) for (const s of lib.PLAN_FINDER_LENGTHS) for (const e of lib.PLAN_FINDER_ENGINES) {
    combos++
    const r = lib.recommendPlan({ perWeek: pw, seconds: s, engine: e.key })
    const each = ec.creditCostForDuration(e.quality, true, s)
    const films = Math.ceil(pw * 52 / 12)
    const need = films * each
    const cheapest = TIERS.find((t) => cp.TIER_CREDITS[t] >= need)
    const tier = cheapest ?? 'pro'
    if (!r) { p.push(`recommendPlan(${pw}, ${s}, ${e.key}) = null`); continue }
    if (r.filmsPerMonth !== films || r.creditsEach !== each || r.creditsNeeded !== need) p.push(`finder ${pw}/${s}/${e.key}: conta ${r.filmsPerMonth}×${r.creditsEach}=${r.creditsNeeded} ≠ ${films}×${each}=${need}`)
    if (r.tier !== tier || r.covers !== Boolean(cheapest)) p.push(`finder ${pw}/${s}/${e.key}: plano ${r.tier}/${r.covers} ≠ ${tier}/${Boolean(cheapest)}`)
    if (r.monthlyUsdMinor !== cp.TIER_PRICES[tier].usd) p.push(`finder ${pw}/${s}/${e.key}: preço ${r.monthlyUsdMinor} ≠ TIER_PRICES ${cp.TIER_PRICES[tier].usd}`)
    if (r.filmsOnTier !== Math.floor(cp.TIER_CREDITS[tier] / each)) p.push(`finder ${pw}/${s}/${e.key}: filmsOnTier`)
    const math = lib.planFinderMathLine(r)
    if (!math.includes(`${films} `) || !math.includes(`× ${each} credits = ${need} credits`) || !math.includes(`includes ${cp.TIER_CREDITS[tier]}`)) p.push(`finder ${pw}/${s}/${e.key}: conta à vista "${math}"`)
  }
  if (combos !== 36) p.push(`finder: ${combos} combinações (esperado 3 × 4 × 3 = 36)`)
  if (lib.recommendPlan({ perWeek: 2, seconds: 35, engine: 'seedance' }) !== null || lib.recommendPlan({ perWeek: 1, seconds: 30, engine: 'seedance' }) !== null || lib.recommendPlan({ perWeek: 1, seconds: 35, engine: 'veo' }) !== null) p.push('finder aceita resposta fora das opções')
  const engines = lib.PLAN_FINDER_ENGINES.map((e) => e.quality).join(',')
  if (engines !== 'cinematic_ai,cinematic_kling,cinematic_hollywood') p.push(`finder: motores ${engines}`)

  // 3. prova social
  if (lib.filmsMadeLine({ films: 99, creators: 90 }) !== null) p.push('prova social abaixo do piso apareceu')
  if (lib.filmsMadeLine({ films: null }) !== null || lib.filmsMadeLine({ films: Number.NaN }) !== null) p.push('prova social sem número apareceu')
  if (lib.filmsMadeLine({ films: 474, creators: 424 }) !== '474 films made on Kineo by 424 creators in the last 30 days') p.push(`prova social: ${lib.filmsMadeLine({ films: 474, creators: 424 })}`)
  if (lib.filmsMadeLine({ films: 1234.9, creators: null }) !== '1,234 films made on Kineo in the last 30 days') p.push('prova social arredonda para cima ou formata errado')

  // 4. Stripe anual
  for (const tier of TIERS) {
    const credits = cp.TIER_CREDITS[tier]
    const a = lib.annualLineItemDescription({ billing: 'annual', tier, credits, kling4Paid: false })
    const m = cv.buildCheckoutValueContext({ billing: 'monthly', credits, intentCampaign: undefined, tier, kling4Paid: false }).lineItemDescription
    // KINEO-CHECKOUT-FINO-0411 — a linha única do anual; o mensal idem (fundador 04/11: "mais fino").
    if (!a || !m || a !== `${credits} credits a month · Billed yearly · Cancel anytime`) p.push(`anual ${tier}: "${a}"`)
    if (a && /Fast videos|priority render queue/i.test(a)) p.push(`anual ${tier} promete o que não existe: ${a}`)
    if (lib.annualLineItemDescription({ billing: 'monthly', tier, credits }) !== null) p.push(`mensal ${tier} deveria seguir a linha de sempre (null aqui)`)
  }
  if (lib.annualLineItemDescription({ billing: 'annual', tier: 'autopilot', credits: 400 }) !== null) p.push('autopilot anual ganhou linha de filmes')

  // 5. fiação
  const route = src(ROUTE)
  const server = src(SERVER)
  if (!route.includes(MARCA) || !route.includes('readPublicStats()') || !server.includes(MARCA) || !/readAll<[^>]*>\(/.test(server) || !server.includes("table: 'videos'")) p.push('rota: sem paginação readAll')
  if (!server.includes('isInternalEmail(p.email)') || !server.includes('!internal.has(r.user_id)')) p.push('rota: contas internas não saem')
  if (!server.includes("eq('status', 'completed')") || !server.includes('FILMS_MADE_WINDOW_DAYS')) p.push('rota: filtro de concluídos / janela')
  if (!route.includes('line: filmsMadeLine({ films, creators })')) p.push('rota: frase fora da régua')
  if (/\b(474|424|658)\b/.test((route + server).replace(/^\/\/.*$/gm, ''))) p.push('rota: número digitado no código')
  const stripe = src(STRIPE)
  const annualCalls = (stripe.match(/lineItemDescription \?\? annualLineItemDescription\(\{ (billing|billing: ctx\.billing), (tier|tier: ctx\.tier), credits: plan\.credits, kling4Paid: KLING4_PAID_LIVE \}\) \?\? plan\.description/g) || []).length
  if (annualCalls !== 2) p.push(`stripe: linha do anual em ${annualCalls} de 2 caminhos (logado + convidado)`)
  if (!stripe.includes("import { annualLineItemDescription } from '@/lib/valorNoCheckout'")) p.push('stripe: import da régua')
  const up = src(UPGRADE)
  if (!up.includes("from '@/components/checkout/ValorNoCheckout'")) p.push('parede: import das peças')
  if (!up.includes('<FilmsLikeThisNote qualityMode={film.quality_mode} seconds={film.duration} />')) p.push('parede: "films like this" do filme da pessoa')
  if (!up.includes('<FilmsMadeProof surface="upgrade" />')) p.push('parede: prova social perto do botão')
  if (up.indexOf('<FilmsMadeProof surface="upgrade" />') > up.indexOf('data-testid="upgrade-guarantee"') || up.indexOf('<FilmsMadeProof surface="upgrade" />') < up.indexOf('CONVERSION_TIERS.map(tier =>')) p.push('parede: prova social fora do lugar (entre os planos e a garantia)')
  if (!up.includes('poster={film && !failed ? film.thumbnail_url ?? undefined : SAMPLE?.arenaPosterPath}')) p.push('parede: miniatura do filme da pessoa')
  if (!up.includes("Your completed film — keep creating with your own ideas.")) p.push('parede: legenda de sempre sumiu')
  const pr = src(PRICING)
  if (pr.includes('<PlanFinder />') || !pr.includes('<FilmsMadeProof surface="pricing" />')) p.push('pricing: sem PlanFinder (KINEO-PRICING-SEM-VELHO-0411), com prova social')
  if (!pr.includes('<FilmsLikeThisNote qualityMode={latestFilm.quality} seconds={latestFilm.seconds} />')) p.push('pricing: "films like this" no Your latest film')
  if (pr.indexOf('<FilmsMadeProof surface="pricing" />') > pr.indexOf('<div className="pricing-secondary">')) p.push('pricing: prova social abaixo da dobra secundária')
  const uiSrc = src(UI)
  if (!uiSrc.includes('trackEvent(PLAN_FINDER_OPENED_EVENT') || !uiSrc.includes('trackEvent(PLAN_FINDER_RECOMMENDED_EVENT')) p.push('ui: eventos')
  if (lib.PLAN_FINDER_OPENED_EVENT !== 'plan_finder_opened' || lib.PLAN_FINDER_RECOMMENDED_EVENT !== 'plan_finder_recommended') p.push('eventos com nome errado')
  if (/\$\s?\d|\b\d+\s*credits\b/.test(uiSrc.replace(/^\s*\/\/.*$/gm, ''))) p.push('ui: preço/crédito digitado no componente')

  // 6. render offline
  try {
    const note = renderToStaticMarkup(React.createElement(ui.FilmsLikeThisNote, { qualityMode: 'cinematic_ai', seconds: 35 })).replace(/<!-- -->/g, '')
    if (!note.includes(line35) || !note.includes('data-valor-no-checkout="films-like-this"')) p.push('render: FilmsLikeThisNote sem a linha')
    const none = renderToStaticMarkup(React.createElement(ui.FilmsLikeThisNote, { qualityMode: 'ads_v2', seconds: 15 }))
    if (none !== '') p.push('render: FilmsLikeThisNote pintou para anúncio')
    const finder = renderToStaticMarkup(React.createElement(ui.PlanFinder)).replace(/<!-- -->/g, '')
    if (!finder.includes('Which plan fits me?') || !finder.includes('aria-expanded="false"')) p.push('render: PlanFinder fechado')
    const proof = renderToStaticMarkup(React.createElement(ui.FilmsMadeProof, { surface: 'pricing' }))
    if (proof !== '') p.push('render: prova social pintou antes de ler o servidor')
  } catch (e) {
    p.push('render: ' + String(e && e.message))
  }
  return p
}

let failed = 0
const base = problems()
console.log(base.length === 0 ? 'PASS valor no checkout (régua, finder, prova social, anual, fiação, render)' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  const s = SRC[rel]
  if (!s.includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from}`)
  return { [rel]: s.replace(from, to) }
}
const MUTANTES = [
  ['contagem arredonda para cima', muta(LIB, 'films: Math.floor(TIER_CREDITS[tier] / creditsEach) }))', 'films: Math.ceil(TIER_CREDITS[tier] / creditsEach) }))')],
  ['custo de conta free (0)', muta(LIB, 'const creditsEach = creditCostForDuration(q as Quality, true, secs)', 'const creditsEach = creditCostForDuration(q as Quality, false, secs) || 1')],
  ['anúncio vira filme', muta(LIB, "if (!FILM_QUALITIES.has(q)) return null", "if (!q) return null")],
  ['finder pega o plano maior', muta(LIB, 'const fit = VALOR_TIERS.find((t) => TIER_CREDITS[t] >= creditsNeeded)', 'const fit = [...VALOR_TIERS].reverse().find((t) => TIER_CREDITS[t] >= creditsNeeded)')],
  ['finder conta 4 semanas', muta(LIB, 'export const WEEKS_PER_MONTH = 52 / 12', 'export const WEEKS_PER_MONTH = 4')],
  ['prova social sem piso', muta(LIB, 'export const FILMS_MADE_MIN_TO_SHOW = 100', 'export const FILMS_MADE_MIN_TO_SHOW = 0')],
  ['anual volta à descrição velha', muta(LIB, "if (input.billing !== 'annual') return null", "return null")],
  ['rota conta a casa', muta(SERVER, '!internal.has(r.user_id)', 'true')],
  ['rota sem paginação', muta(SERVER, "table: 'videos'", "table: 'videos_x'")],
  ['stripe convidado sem a linha do anual', muta(STRIPE, 'ctx.checkoutValueContext.lineItemDescription ?? annualLineItemDescription({ billing: ctx.billing, tier: ctx.tier, credits: plan.credits, kling4Paid: KLING4_PAID_LIVE }) ?? plan.description', 'ctx.checkoutValueContext.lineItemDescription ?? plan.description')],
  ['parede sem prova social', muta(UPGRADE, '<FilmsMadeProof surface="upgrade" />', '')],
  ['parede sem films like this', muta(UPGRADE, '<FilmsLikeThisNote qualityMode={film.quality_mode} seconds={film.duration} />', '')],
  ['pricing com PlanFinder de volta', muta(PRICING, '<FilmsMadeProof surface="pricing" />', '<FilmsMadeProof surface="pricing" /><PlanFinder />')],
  ['ui sem evento de abertura', muta(UI, 'trackEvent(PLAN_FINDER_OPENED_EVENT', 'void (PLAN_FINDER_OPENED_EVENT')],
]
for (const [nome, repl] of MUTANTES) {
  const r = problems(repl)
  console.log(`${r.length ? 'PASS' : 'FAIL'} mutante "${nome}" ${r.length ? 'pego' : 'NÃO pego'}${r.length ? ' — ' + r[0] : ''}`)
  if (!r.length) failed++
}
if (failed) { console.log(`${failed} falha(s)`); process.exit(1) }
console.log(`OK — ${MUTANTES.length} mutantes pegos`)
