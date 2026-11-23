// KINEO-BF-SO-STARTER-2311 [fundador 16/11: "Creator fica no anual normal de 30%; os 50% valem só no Starter. A página e a carta dizem isso."]
// Guardião sem rede, que EXECUTA os módulos reais (lib/billing/blackFriday2026.ts, lib/billing/annualWelcomeOffer.ts, lib/checkoutPricing.ts,
// a rota /api/offers/annual-welcome e a página /black-friday renderizada) em vez de só conferir texto. Prova:
//   (a) na janela, o Starter anual é elegível e cobra o preço de 50%;
//   (b) Creator e Studio anuais NÃO são elegíveis e cobram o anual normal, logado, convidado e com ?promo=BF2026;
//   (c) fora da janela ninguém é elegível;
//   (d) a página, a faixa, o selo e a carta não dizem "any annual plan" nem mostram o preço de 50% do Creator;
//   (e) a oferta de 3 h da conta nova continua dando 50% a Starter e Creator (fora e dentro da Black Friday).
// Cada mutante plantado deixa ao menos uma verificação vermelha.
import fs from 'node:fs'
import path from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { offlineModules, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const raiz = process.cwd()
const lf = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8').replace(/\r\n/g, '\n')
const F = {
  bf: 'lib/billing/blackFriday2026.ts',
  regra: 'lib/billing/annualWelcomeOffer.ts',
  rota: 'app/api/stripe/checkout/route.ts',
  api: 'app/api/offers/annual-welcome/route.ts',
  pagina: 'app/black-friday/page.tsx',
  faixa: 'components/BlackFridayBanner.tsx',
  pricing: 'app/pricing/PricingClient.tsx',
}
const SRC = Object.fromEntries(Object.values(F).map((rel) => [rel, lf(rel)]))
const T = (iso) => Date.parse(iso)
const NA_BF = T('2026-11-27T15:00:00Z')
const ANTES = T('2026-11-23T12:00:00Z')
const DEPOIS = T('2026-12-03T12:00:00Z')
const H = 3_600_000

function problemas(repl = {}) {
  const p = []
  const checa = (nome, cond) => { if (!cond) p.push(nome) }
  const src = (rel) => repl[rel] ?? SRC[rel]
  let B, O, Pr
  try {
    const carrega = createOfflineLoader({ source: (rel, t) => repl[rel] ?? t })
    B = carrega(F.bf); O = carrega(F.regra); Pr = carrega('lib/checkoutPricing.ts')
  } catch (e) { return ['carregar módulos: ' + String(e?.message)] }

  // ── O caminho de preço do checkout, com os módulos reais, na MESMA ordem da rota (as linhas da rota são conferidas abaixo). ──
  const cobra = ({ tier, isAnnual = true, nowMs, signedIn, accountCreatedAt = '2020-01-01T00:00:00Z', hasPaid = false, promo }) => {
    let pedido = promo
    if (B.isBf2026PromoCode(pedido)) pedido = undefined
    const bfAnnualOpen = B.bf2026CheckoutEligible({ tier, isAnnual, nowMs })
    let unit = isAnnual ? Pr.getAnnualPrice(tier, 'usd') : Pr.TIER_PRICES[tier].usd
    if (bfAnnualOpen && (tier === 'starter' || tier === 'basic' || tier === 'pro')) unit = Pr.ANNUAL_WELCOME_PRICES[tier].usd
    let offer = null
    if (signedIn) {
      offer = O.resolveAnnualOffer({ tier, isAnnual, signedIn: true, accountCreatedAt, hasPaid, bfOpen: bfAnnualOpen, bfEndsAtMs: Date.parse(B.BF2026_ENDS_AT), nowMs })
      if (offer && (tier === 'starter' || tier === 'basic' || tier === 'pro')) unit = Pr.ANNUAL_WELCOME_PRICES[tier].usd
    }
    return { unit, bf: bfAnnualOpen, offer: offer?.kind ?? null, promoLeft: pedido }
  }
  const rota = src(F.rota)
  checa('rota: o portão da BF é bf2026CheckoutEligible por plano', /const bfAnnualOpen = !privatePackPromo && bf2026CheckoutEligible\(\{ tier, isAnnual \}\)/.test(rota))
  checa('rota: o preço da BF entra só com o portão', rota.includes("if (bfAnnualOpen && (tier === 'starter' || tier === 'basic' || tier === 'pro')) unitAmount = ANNUAL_WELCOME_PRICES[tier].usd"))
  checa('rota: as 3 h recebem o portão por plano, não o relógio solto', rota.includes('    bfOpen: bfAnnualOpen,\n    bfEndsAtMs: Date.parse(BF2026_ENDS_AT),'))
  checa('rota: ?promo=BF2026 sai na entrada', rota.includes('if (isBf2026PromoCode(promo)) promo = undefined'))

  const anual = (t) => Pr.getAnnualPrice(t, 'usd')
  const metade = (t) => Pr.ANNUAL_WELCOME_PRICES[t].usd
  checa('premissa: 50% < anual normal em Starter e Creator', metade('starter') < anual('starter') && metade('basic') < anual('basic'))

  // (a) Starter anual na janela
  checa('(a) Starter anual elegível na janela', B.bf2026CheckoutEligible({ tier: 'starter', isAnnual: true, nowMs: NA_BF }) === true)
  checa('(a) Starter anual logado cobra 50%', cobra({ tier: 'starter', nowMs: NA_BF, signedIn: true }).unit === metade('starter'))
  checa('(a) Starter anual convidado cobra 50%', cobra({ tier: 'starter', nowMs: NA_BF, signedIn: false }).unit === metade('starter'))
  checa('(a) Starter anual com ?promo=BF2026 cobra 50%', cobra({ tier: 'starter', nowMs: NA_BF, signedIn: false, promo: 'BF2026' }).unit === metade('starter'))
  checa('(a) Starter mensal sem BF', !B.bf2026CheckoutEligible({ tier: 'starter', isAnnual: false, nowMs: NA_BF }))

  // (b) Creator e Studio anuais na janela: anual normal, de qualquer origem
  for (const tier of ['basic', 'pro']) {
    checa(`(b) ${tier} anual NÃO elegível na janela`, B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: NA_BF }) === false)
    checa(`(b) ${tier} fora de bf2026CoversTier`, B.bf2026CoversTier(tier) === false)
    for (const [origem, extra] of [['logado conta velha', { signedIn: true }], ['convidado', { signedIn: false }], ['logado com ?promo=BF2026', { signedIn: true, promo: 'BF2026' }], ['convidado com ?promo= bf2026 ', { signedIn: false, promo: ' bf2026 ' }], ['logado que já pagou', { signedIn: true, hasPaid: true }]]) {
      const r = cobra({ tier, nowMs: NA_BF, ...extra })
      checa(`(b) ${tier} ${origem}: anual normal`, r.unit === anual(tier) && r.bf === false && r.offer === null)
    }
  }
  checa('(b) a tabela da BF só tem o Starter', JSON.stringify(B.bf2026PriceRows().map((r) => r.tier)) === '["starter"]' && JSON.stringify(B.BF2026_TIERS) === '["starter"]')
  checa('(b) rótulo da oferta = "Starter"', B.BF2026_PLAN_LABEL === 'Starter')

  // (c) fora da janela
  for (const tier of ['starter', 'basic', 'pro']) {
    for (const quando of [ANTES, DEPOIS, Number.NaN]) checa(`(c) ${tier} fora da janela (${quando}) não elegível`, B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: quando }) === false)
    checa(`(c) ${tier} convidado antes da janela: anual normal`, cobra({ tier, nowMs: ANTES, signedIn: false }).unit === anual(tier))
  }

  // (e) as 3 h da conta nova, intactas: 50% no Starter e no Creator, fora e dentro da BF; o Studio fora
  const nova = (agora) => new Date(agora - 30 * 60_000).toISOString()
  for (const agora of [ANTES, NA_BF]) {
    for (const tier of ['starter', 'basic']) {
      const r = cobra({ tier, nowMs: agora, signedIn: true, accountCreatedAt: nova(agora), hasPaid: false })
      checa(`(e) ${tier} conta nova (${agora === NA_BF ? 'na BF' : 'fora da BF'}): 50%`, r.unit === metade(tier) && r.offer !== null)
    }
    checa(`(e) Creator conta nova ${agora === NA_BF ? 'na BF' : 'fora da BF'} = welcome_3h`, cobra({ tier: 'basic', nowMs: agora, signedIn: true, accountCreatedAt: nova(agora) }).offer === 'welcome_3h')
    checa(`(e) Studio conta nova: anual normal`, cobra({ tier: 'pro', nowMs: agora, signedIn: true, accountCreatedAt: nova(agora) }).unit === anual('pro'))
    checa(`(e) Creator conta de 3 h 1 min: anual normal`, cobra({ tier: 'basic', nowMs: agora, signedIn: true, accountCreatedAt: new Date(agora - 3 * H - 60_000).toISOString() }).unit === anual('basic'))
  }
  checa('(e) a regra das 3 h ainda cobre Starter e Creator', O.annualOfferCoversTier('starter') && O.annualOfferCoversTier('basic') && !O.annualOfferCoversTier('pro'))

  // (e)+(d) /api/offers/annual-welcome, executada: o que o /pricing pinta segue o checkout
  const apiOffer = (agora, createdAt, hasPaid = false) => {
    const RealDate = Date
    class FakeDate extends RealDate { static now() { return agora } }
    const carregaApi = createOfflineLoader({
      source: (rel, t) => repl[rel] ?? t,
      globals: { Date: FakeDate },
      mocks: {
        'next/server': { NextResponse: { json: (body) => ({ body }) } },
        '@/lib/supabase/server': {
          createClient: () => ({
            auth: { getUser: async () => ({ data: { user: createdAt ? { id: 'u1', created_at: createdAt } : null } }) },
            from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { has_paid: hasPaid }, error: null }) }) }) }),
          }),
        },
      },
    })
    return carregaApi(F.api).GET().then((r) => r.body)
  }
  const pricing = src(F.pricing)
  checa('/pricing: o cartão só pinta a BF nos planos da BF', pricing.includes("&& (annualOffer?.kind !== 'black_friday_2026' || bf2026CoversTier(tier))"))
  // espelho executável do ofertaNoPlano (o texto acima garante que a linha é esta)
  const ofertaNoPlano = (kind, tier) => kind !== null && O.annualOfferCoversTier(tier) && (kind !== 'black_friday_2026' || B.bf2026CoversTier(tier))
  const asyncChecks = (async () => {
    try {
      const velhaNaBf = await apiOffer(NA_BF, '2020-01-01T00:00:00Z', true)
      checa('(d) API na BF, conta velha: black_friday_2026', velhaNaBf.offer === 'black_friday_2026')
      checa('(d) /pricing na BF, conta velha: Starter 50%, Creator e Studio normal', ofertaNoPlano(velhaNaBf.offer, 'starter') && !ofertaNoPlano(velhaNaBf.offer, 'basic') && !ofertaNoPlano(velhaNaBf.offer, 'pro'))
      const visitanteNaBf = await apiOffer(NA_BF, null)
      checa('(d) API na BF, visitante: black_friday_2026 (só Starter no cartão)', visitanteNaBf.offer === 'black_friday_2026' && !ofertaNoPlano(visitanteNaBf.offer, 'basic'))
      const novaNaBf = await apiOffer(NA_BF, nova(NA_BF))
      checa('(e) API na BF, conta nova: welcome_3h com o fim das 3 h', novaNaBf.offer === 'welcome_3h' && novaNaBf.endsAtMs === Date.parse(nova(NA_BF)) + 3 * H)
      checa('(e) /pricing na BF, conta nova: Starter e Creator 50%', ofertaNoPlano(novaNaBf.offer, 'starter') && ofertaNoPlano(novaNaBf.offer, 'basic') && !ofertaNoPlano(novaNaBf.offer, 'pro'))
      const novaFora = await apiOffer(ANTES, nova(ANTES))
      checa('(e) API fora da BF, conta nova: welcome_3h', novaFora.offer === 'welcome_3h')
      const velhaFora = await apiOffer(ANTES, '2020-01-01T00:00:00Z', true)
      checa('(c) API fora da BF, conta velha: nada', velhaFora.offer === null)
    } catch (e) { p.push('API annual-welcome: ' + String(e?.message)) }
  })()

  // (d) a página renderizada, a faixa, o selo e a carta
  const precoCreator50 = B.bf2026Usd(Pr.ANNUAL_WELCOME_PRICES.basic.usd)
  const precoStudio50 = B.bf2026Usd(Pr.ANNUAL_WELCOME_PRICES.pro.usd)
  const semPromessa = (nome, texto) => {
    // "Like every Kineo annual plan, your credits refill every month" (FAQ) é verdade geral e fica; a promessa de desconto em todo anual, não.
    checa(`(d) ${nome}: sem "any annual plan"/"every annual plan is"/"% off annual plans" (a garantia "Annual plans are refundable" é geral e fica)`, !/any annual plan|every (kineo )?annual plan is|% off (kineo )?annual plans|% off every annual/i.test(texto))
    checa(`(d) ${nome}: sem o preço de 50% do Creator/Studio`, !texto.includes(precoCreator50) && !texto.includes(precoStudio50))
  }
  for (const [estado, agora] of [['open', NA_BF], ['before', ANTES], ['after', DEPOIS]]) {
    try {
      const pagina = src(F.pagina).replace('const nowMs = Date.now()', `const nowMs = ${agora}`)
      const load = offlineModules({
        replacements: { [F.pagina]: pagina, ...(repl[F.bf] ? { [F.bf]: repl[F.bf] } : {}) },
        mocks: {
          'components/Footer.tsx': { __esModule: true, default: () => null },
          'components/BlackFridayCountdown.tsx': { __esModule: true, default: () => null },
        },
      })
      const mod = load(F.pagina)
      const html = renderToStaticMarkup(React.createElement(mod.default)).replace(/<!-- -->/g, '')
      const meta = `${mod.metadata.title.absolute} ${mod.metadata.description}`
      semPromessa(`página ${estado}`, html + meta)
      checa(`(d) página ${estado}: só o cartão do Starter`, (html.match(/data-bf-tier="/g) ?? []).length === 1 && html.includes('data-bf-tier="starter"') && !html.includes('data-bf-tier="basic"'))
      checa(`(d) página ${estado}: diz que Creator e Studio ficam no anual normal`, html.includes('Creator and Studio keep their regular annual price'))
      checa(`(d) página ${estado}: título e descrição dizem Starter`, /Starter Annual Plan/.test(mod.metadata.title.absolute) && mod.metadata.description.includes('the Starter annual plan'))
      if (estado === 'open') {
        checa('(d) página no ar: botão só do Starter, no preço escrito', html.includes(`Get Starter for ${B.bf2026Usd(Pr.ANNUAL_WELCOME_PRICES.starter.usd)}`) && !html.includes('data-bf-cta="basic"') && !html.includes('tier=basic'))
        checa('(d) página no ar: h1 do Starter', html.includes('50% off the Starter annual plan</h1>'))
      }
    } catch (e) { p.push(`página ${estado}: ` + String(e?.message)) }
  }
  const faixa = src(F.faixa).split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
  semPromessa('faixa e selo', faixa)
  checa('(d) faixa: "off the {Starter} annual plan"', faixa.includes('Black Friday: {BF2026_PERCENT_OFF}% off the {BF2026_PLAN_LABEL} annual plan · ends Dec 1 →'))
  checa('(d) selo: Starter e o aviso do Creator/Studio', faixa.includes('{BF2026_PERCENT_OFF}% off the {BF2026_PLAN_LABEL} annual plan, no code needed. Creator and Studio keep their regular annual price.'))
  for (const onda of ['bf', 'cyber']) {
    const carta = B.bf2026EmailBody(onda, B.bf2026PriceRows(), { text: '', html: '' })
    const assunto = B.bf2026Subject(onda)
    semPromessa(`carta ${onda}`, `${assunto}\n${carta.text}\n${carta.html}`)
    checa(`(d) carta ${onda}: fala do Starter e não lista o Creator`, carta.text.includes('Starter annual plan') && carta.text.includes('- Starter:') && !carta.text.includes('Creator:') && !carta.html.includes('Creator:'))
    checa(`(d) assunto ${onda}: Starter e curto`, assunto.includes('Starter') && assunto.length <= 60)
  }
  const apiBf = lf('app/api/offers/bf2026/route.ts')
  checa('(d) /api/offers/bf2026 lista os planos por bf2026PriceRows', apiBf.includes('tiers: bf2026PriceRows().map('))

  return asyncChecks.then(() => p)
}

const muta = (rel, de, para) => {
  const s = SRC[rel]
  if (!s.includes(de)) throw new Error(`mutante não aplicável em ${rel}: ${de.slice(0, 60)}`)
  return { [rel]: s.replace(de, para) }
}
const MUTANTES = [
  ['Creator volta à lista da BF', muta(F.bf, "export const BF2026_TIERS: readonly CheckoutTier[] = ['starter']", "export const BF2026_TIERS: readonly CheckoutTier[] = ['starter', 'basic']")],
  ['elegibilidade ignora o plano', muta(F.bf, '    bf2026CoversTier(input.tier) &&\n', '')],
  ['?promo=BF2026 fura a regra (rota)', muta(F.rota, 'const bfAnnualOpen = !privatePackPromo && bf2026CheckoutEligible({ tier, isAnnual })', "const bfAnnualOpen = !privatePackPromo && (bf2026CheckoutEligible({ tier, isAnnual }) || isBf2026PromoCode(req.nextUrl.searchParams.get('promo')))")],
  ['?promo=BF2026 deixa de ser descartado', muta(F.rota, 'if (isBf2026PromoCode(promo)) promo = undefined', '')],
  ['faixa volta a "any annual plan"', muta(F.faixa, '{BF2026_PERCENT_OFF}% off the {BF2026_PLAN_LABEL} annual plan · ends Dec 1 →', '{BF2026_PERCENT_OFF}% off any annual plan · ends Dec 1 →')],
  ['h1 da página volta a "any annual plan"', muta(F.pagina, '{BF2026_PERCENT_OFF}% off the {BF2026_PLAN_LABEL} annual plan</h1>', '{BF2026_PERCENT_OFF}% off any annual plan</h1>')],
  ['carta volta a "every Kineo annual plan"', muta(F.bf, 'For Black Friday, the Kineo ${BF2026_PLAN_LABEL} annual plan is', 'For Black Friday, every Kineo annual plan is')],
  ['página lista o Creator a 50%', muta(F.pagina, 'const rows = bf2026PriceRows()', "const rows = [...bf2026PriceRows(), { ...bf2026PriceRows()[0], tier: 'basic' as const, name: 'Creator', bfMinor: 11400 }]")],
  ['oferta de 3 h quebra (Creator fora)', muta(F.regra, "const TIERS_COM_ANUAL: readonly string[] = ['starter', 'basic']", "const TIERS_COM_ANUAL: readonly string[] = ['starter']")],
  ['oferta de 3 h quebra (janela de 0 h)', muta(F.regra, 'ANNUAL_WELCOME_WINDOW_MS = 3 * 60 * 60 * 1000', 'ANNUAL_WELCOME_WINDOW_MS = 0')],
  ['API pinta a BF no Creator (relógio solto)', muta(F.api, "tier: 'basic', bfOpen: bf2026CheckoutEligible({ tier: 'basic', isAnnual: true, nowMs })", "tier: 'basic', bfOpen: bf2026CheckoutEligible({ tier: 'starter', isAnnual: true, nowMs })")],
  ['/pricing pinta a BF em todo plano', muta(F.pricing, "&& (annualOffer?.kind !== 'black_friday_2026' || bf2026CoversTier(tier))", '')],
  ['rota volta a dar o relógio solto às 3 h', muta(F.rota, '    bfOpen: bfAnnualOpen,\n    bfEndsAtMs: Date.parse(BF2026_ENDS_AT),', '    bfOpen: bf2026Open(),\n    bfEndsAtMs: Date.parse(BF2026_ENDS_AT),')],
]

let falhas = 0
const b0 = await problemas()
console.log(b0.length ? 'FALHA\n  ' + b0.join('\n  ') : 'PASS Black Friday só no Starter; Creator e Studio no anual normal; 3 h intactas')
if (b0.length) falhas++
for (const [nome, repl] of MUTANTES) {
  const r = await problemas(repl)
  if (r.length === 0) { console.log(`VIVO  mutante "${nome}"`); falhas++ }
  else console.log(`morto mutante "${nome}" ← ${r[0]}`)
}
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1) }
console.log(`\nOK — ${MUTANTES.length} mutantes mortos`)
