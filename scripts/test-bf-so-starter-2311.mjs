// KINEO-BF-SO-STARTER-2311 [fundador 16/11: "Creator fica no anual normal de 30%; os 50% valem só no Starter. A página e a carta dizem isso."]
// KINEO-BF-TODOS-ANUAIS-2611 [dono 26/11: "Eu quero que você coloque todos os planos no Black Friday com 50% de margem de desconto. Independentemente
// da margem. Então, todos os planos estão com 50% de desconto. No plano anual"] — REANCORADO (sem afrouxar): o mesmo guardião agora fixa os TRÊS anuais
// (Starter, Creator e Studio) na oferta, e o resto da regra igual: só anual, só na janela, nunca no teste com cartão, nunca em plano sem promoção.
// O nome do arquivo fica (história); as provas abaixo são as de 26/11. O que era "(b) Creator e Studio no anual normal" virou "(b) os 3 na oferta".
// Guardião sem rede, que EXECUTA os módulos reais (lib/billing/blackFriday2026.ts, lib/billing/annualWelcomeOffer.ts, lib/checkoutPricing.ts,
// lib/settlementCurrency.ts, lib/stripe/guestCheckout.ts, a rota /api/offers/annual-welcome e a página /black-friday renderizada). Prova:
//   (a) na janela, o Starter anual é elegível e cobra o preço de 50% (em dólar e em reais);
//   (b) Creator e Studio anuais NÃO são elegíveis e cobram o anual normal, logado, convidado e com ?promo=BF2026 — em dólar e em REAIS;
//   (c) fora da janela ninguém é elegível;
//   (d) a página, a faixa, o selo e a carta não dizem "any annual plan", não dizem que o Creator está incluído e não mostram o 50% dele;
//   (e) a oferta de 3 h da conta nova continua dando 50% a Starter e Creator (fora e dentro da Black Friday);
//   (f) o /pricing (API + regra do cartão) mostra, em cada instante, o MESMO preço que o checkout cobra: na BF, o Starter vai até 01/12 e o
//       Creator da conta nova tem o relógio das 3 h dele; fora da BF a API responde o mesmo que a origin/main.
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
  moeda: 'lib/settlementCurrency.ts',
  convidado: 'lib/stripe/guestCheckout.ts',
  rota: 'app/api/stripe/checkout/route.ts',
  api: 'app/api/offers/annual-welcome/route.ts',
  pagina: 'app/black-friday/page.tsx',
  faixa: 'components/BlackFridayBanner.tsx',
  pricing: 'app/pricing/PricingClient.tsx',
  hook: 'components/pricing/AnnualOfferCountdown.tsx',
  emailRoute: 'app/api/admin/send-black-friday-2026/route.ts',
  cartaBase: 'lib/lifecycle/bfBase2311.ts',
}
const SRC = Object.fromEntries(Object.values(F).map((rel) => [rel, lf(rel)]))
const T = (iso) => Date.parse(iso)
const NA_BF = T('2026-11-27T15:00:00Z')
const ANTES = T('2026-11-23T12:00:00Z')
const DEPOIS = T('2026-12-03T12:00:00Z')
const H = 3_600_000
const VELHA = '2020-01-01T00:00:00Z'

async function problemas(repl = {}) {
  const p = []
  const checa = (nome, cond) => { if (!cond) p.push(nome) }
  const src = (rel) => repl[rel] ?? SRC[rel]
  let B, O, Pr, M, G
  try {
    const carrega = createOfflineLoader({ source: (rel, t) => repl[rel] ?? t })
    B = carrega(F.bf); O = carrega(F.regra); Pr = carrega('lib/checkoutPricing.ts'); M = carrega(F.moeda); G = carrega(F.convidado)
  } catch (e) { return ['carregar módulos: ' + String(e?.message)] }

  // ── O caminho de preço do checkout, com os módulos reais, na MESMA ordem da rota (as linhas da rota são conferidas abaixo). ──
  // Logado: unitAmount → resolveAnnualOffer(bfOpen: portão por plano) → planSettlementAmountMinor(..., annualOffer ? 'welcome' : 'regular').
  // Convidado: unitAmount → guestSettlement({ annualOffer: bfAnnualOpen }) (annualOfferMetadata só existe com o portão aberto).
  const cobra = ({ tier, isAnnual = true, nowMs, signedIn, accountCreatedAt = VELHA, hasPaid = false, promo, pais = 'US' }) => {
    let pedido = promo
    if (B.isBf2026PromoCode(pedido)) pedido = undefined
    const bfAnnualOpen = B.bf2026CheckoutEligible({ tier, isAnnual, nowMs })
    let unit = isAnnual ? Pr.getAnnualPrice(tier, 'usd') : Pr.TIER_PRICES[tier].usd
    if (bfAnnualOpen && (tier === 'starter' || tier === 'basic' || tier === 'pro')) unit = Pr.ANNUAL_WELCOME_PRICES[tier].usd
    let offer = null
    let charge
    if (signedIn) {
      offer = O.resolveAnnualOffer({ tier, isAnnual, signedIn: true, accountCreatedAt, hasPaid, bfOpen: bfAnnualOpen, bfEndsAtMs: Date.parse(B.BF2026_ENDS_AT), nowMs })
      if (offer && (tier === 'starter' || tier === 'basic' || tier === 'pro')) unit = Pr.ANNUAL_WELCOME_PRICES[tier].usd
      const cur = M.resolveSettlementCurrency({ ipCountry: pais, acceptLanguage: pais === 'BR' ? 'pt-BR' : 'en-US', forced: null, priorBrazilianCardFailure: false }).currency
      charge = { cur, amount: M.planSettlementAmountMinor(tier, isAnnual ? 'annual' : 'monthly', cur, unit, offer ? 'welcome' : 'regular') }
    } else {
      const s = G.guestSettlement({ tier, isAnnual, unitAmount: unit, ipCountry: pais, acceptLanguage: pais === 'BR' ? 'pt-BR' : 'en-US', forcedCurrency: null, annualOffer: bfAnnualOpen })
      charge = { cur: s.chargeCurrency, amount: s.chargeAmount }
    }
    return { unit, bf: bfAnnualOpen, offer: offer?.kind ?? null, promoLeft: pedido, charge }
  }
  const rota = src(F.rota)
  checa('rota: o portão da BF é bf2026CheckoutEligible por plano', /const bfAnnualOpen = !privatePackPromo && bf2026CheckoutEligible\(\{ tier, isAnnual \}\)/.test(rota))
  checa('rota: o preço da BF entra só com o portão', rota.includes("if (bfAnnualOpen && (tier === 'starter' || tier === 'basic' || tier === 'pro')) unitAmount = ANNUAL_WELCOME_PRICES[tier].usd"))
  checa('rota: as 3 h recebem o portão por plano, não o relógio solto', rota.includes('    bfOpen: bfAnnualOpen,\n    bfEndsAtMs: Date.parse(BF2026_ENDS_AT),'))
  checa('rota: ?promo=BF2026 sai na entrada', rota.includes('if (isBf2026PromoCode(promo)) promo = undefined'))
  checa('rota: reais do logado pela tabela de boas-vindas só com a oferta', rota.includes("planSettlementAmountMinor(tier, isAnnual ? 'annual' : 'monthly', chargeCurrency, unitAmount, annualOffer ? 'welcome' : 'regular')"))
  checa('rota: reais do convidado com a oferta só pelo portão', rota.includes('annualOfferMetadata: bfAnnualOpen ? bfAnnualStamp : null') && rota.includes('annualOffer: ctx.annualOfferMetadata !== null'))

  const anual = (t) => Pr.getAnnualPrice(t, 'usd')
  const metade = (t) => Pr.ANNUAL_WELCOME_PRICES[t].usd
  const TRES = ['starter', 'basic', 'pro']
  checa('premissa: 50% < anual normal nos 3 planos', TRES.every((t) => metade(t) < anual(t)))

  // (M2) bf2026CoversTier: os 3 anuais, escritos como o código escreve (KINEO-BF-TODOS-ANUAIS-2611)
  for (const t of TRES) checa(`(M2) bf2026CoversTier: ${t} sim`, B.bf2026CoversTier(t) === true)
  for (const x of ['business', 'autopilot', 'autopilot_lite', 'creator', 'studio', '', 'Starter', 'STARTER', ' starter', 'BASIC', 'Pro', undefined, null]) checa(`(M2) bf2026CoversTier(${JSON.stringify(x)}) = false`, B.bf2026CoversTier(x) === false)
  // o portão fecha para quem não é um dos 3 anuais, mesmo na janela
  for (const x of ['business', 'autopilot', 'autopilot_lite', '', 'Starter', 'creator']) checa(`(M2) portão fechado para ${JSON.stringify(x)} na janela`, B.bf2026CheckoutEligible({ tier: x, isAnnual: true, nowMs: NA_BF }) === false)
  checa('(M2) Business não aceita promoção e fica fora', !Pr.planAcceptsPromotions('business') && !B.bf2026CheckoutEligible({ tier: 'business', isAnnual: true, nowMs: NA_BF }))

  // (a)+(b) os 3 anuais na janela: preço da oferta, de qualquer origem, em dólar e em reais; o mensal e o teste com cartão, não
  for (const tier of TRES) {
    checa(`(a) ${tier} anual elegível na janela`, B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: NA_BF }) === true)
    checa(`(a) ${tier} MENSAL na janela: sem BF`, B.bf2026CheckoutEligible({ tier, isAnnual: false, nowMs: NA_BF }) === false)
    checa(`(a) ${tier} mensal na janela cobra o mensal de tabela`, [true, false].every((signedIn) => { const r = cobra({ tier, isAnnual: false, nowMs: NA_BF, signedIn }); return r.unit === Pr.TIER_PRICES[tier].usd && r.bf === false && r.offer === null }))
    checa(`(a) ${tier} anual com teste de cartão: sem BF`, B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: NA_BF, wantsTrial: true }) === false)
    for (const [origem, extra] of [['logado conta velha', { signedIn: true }], ['convidado', { signedIn: false }], ['logado com ?promo=BF2026', { signedIn: true, promo: 'BF2026' }], ['convidado com ?promo= bf2026 ', { signedIn: false, promo: ' bf2026 ' }], ['logado que já pagou', { signedIn: true, hasPaid: true }]]) {
      const r = cobra({ tier, nowMs: NA_BF, ...extra })
      checa(`(b) ${tier} ${origem}: preço da oferta`, r.unit === metade(tier) && r.bf === true && (extra.signedIn ? r.offer === 'black_friday_2026' : r.offer === null) && r.charge.amount === metade(tier) && r.promoLeft === undefined)
      const brl = cobra({ tier, nowMs: NA_BF, ...extra, pais: 'BR' })
      checa(`(M3) ${tier} ${origem} em REAIS na BF: tabela de boas-vindas`, brl.charge.cur === 'brl' && brl.charge.amount === M.BRL_ANNUAL_WELCOME_MINOR[tier] && brl.charge.amount !== M.BRL_PLAN_PRICES_MINOR[tier].annual)
    }
  }
  checa('(M3) em reais na BF: 26990 / 56990 / 176990, logado e convidado', [true, false].every((signedIn) => cobra({ tier: 'starter', nowMs: NA_BF, signedIn, pais: 'BR' }).charge.amount === 26990 && cobra({ tier: 'basic', nowMs: NA_BF, signedIn, pais: 'BR' }).charge.amount === 56990 && cobra({ tier: 'pro', nowMs: NA_BF, signedIn, pais: 'BR' }).charge.amount === 176990))
  checa('(b) a tabela da BF tem os 3 anuais', JSON.stringify(B.bf2026PriceRows().map((r) => r.tier)) === '["starter","basic","pro"]' && JSON.stringify(B.BF2026_TIERS) === '["starter","basic","pro"]')
  checa('(b) rótulo = "Starter, Creator and Studio"; frase = "every annual plan"', B.BF2026_PLAN_LABEL === 'Starter, Creator and Studio' && B.BF2026_COVERS_EVERY_ANNUAL_PLAN === true && B.BF2026_OFFER_SCOPE === 'every annual plan' && B.BF2026_OFFER_SCOPE_KINEO === 'every Kineo annual plan (Starter, Creator and Studio)')
  // a frase "every annual plan" só pode existir enquanto a lista cobrir os 3: as duas constantes NASCEM de BF2026_TIERS (tirar um plano desliga a frase)
  checa('(b) "every annual plan" deriva de BF2026_TIERS (os 3 CheckoutTier), nunca fixo', src(F.bf).includes("export const BF2026_COVERS_EVERY_ANNUAL_PLAN: boolean = (['starter', 'basic', 'pro'] as const).every((t) => BF2026_TIERS.includes(t))")
    && src(F.bf).includes("export const BF2026_OFFER_SCOPE: string = BF2026_COVERS_EVERY_ANNUAL_PLAN ? 'every annual plan' : `the ${BF2026_PLAN_LABEL} annual plan`")
    && src(F.bf).includes('export const BF2026_OFFER_SCOPE_KINEO: string = BF2026_COVERS_EVERY_ANNUAL_PLAN ?'))
  checa('(b) a regra das 3 h aceita a BF nos 3 (o portão por plano decide) e nunca no Business', TRES.every((tier) => O.resolveAnnualOffer({ tier, isAnnual: true, signedIn: false, bfOpen: true, bfEndsAtMs: 1, nowMs: NA_BF })?.kind === 'black_friday_2026') && O.resolveAnnualOffer({ tier: 'business', isAnnual: true, signedIn: false, bfOpen: true, bfEndsAtMs: 1, nowMs: NA_BF }) === null)
  const janelaBase = 240 * H
  checa('(b) janela configurada = 240 horas (cobre a campanha inteira)', B.BF2026_BASE_LETTER_SUPPRESSION_HOURS === 240)
  const within = (profileRows, eventRows) => {
    const suppression = B.bf2026BaseLetterSuppression(profileRows, eventRows, NA_BF)
    return profileRows.filter((profile) => !B.bf2026ProfileMatchesBaseLetterSuppression(profile, suppression)).map((profile) => String(profile.id)).sort()
  }
  const aliases = [
    { id: 'a', email: ' Maker@Example.invalid ', plan: 'free', email_opted_out: false },
    { id: 'b', email: 'maker@example.invalid', plan: 'free', email_opted_out: false },
    { id: 'c', email: 'other@example.invalid', plan: 'free', email_opted_out: false },
  ]
  const baseSent24h = { user_id: 'a', created_at: new Date(NA_BF - 24 * H).toISOString() }
  const baseExpired168h = { user_id: 'c', created_at: new Date(NA_BF - janelaBase).toISOString() }
  for (const [name, profiles] of [['A antes de B', aliases], ['B antes de A', [aliases[1], aliases[0], aliases[2]]]]) {
    for (const events of [[baseSent24h, baseExpired168h], [baseExpired168h, baseSent24h]]) {
      checa(`(b) mesma caixa normalizada suprimida na ordem ${name}, independente da ordem dos eventos`, JSON.stringify(within(profiles, events)) === '["c"]')
    }
  }
  checa('(b) 239h59 ainda suprime perfis da mesma caixa', JSON.stringify(within(aliases, [{ user_id: 'a', created_at: new Date(NA_BF - janelaBase + 60_000).toISOString() }])) === '["c"]')
  checa('(b) em 240h exatas libera os dois aliases e mantém o destinatário distinto', JSON.stringify(within(aliases, [{ user_id: 'a', created_at: new Date(NA_BF - janelaBase).toISOString() }])) === '["a","b","c"]')
  checa('(b) data inválida ou futura não suprime caixa nem destinatário distinto',
    JSON.stringify(within(aliases, [{ user_id: 'a', created_at: 'invalid' }])) === '["a","b","c"]' &&
    JSON.stringify(within(aliases, [{ user_id: 'a', created_at: new Date(NA_BF + 1).toISOString() }])) === '["a","b","c"]')
  // KINEO-BF-TRAVA-CAMPANHA-2411 — as datas REAIS: 1º selo da metade B (23/11 20:30:47Z) e da metade A (24/11 10:23Z) contra o fim de cada rodada do cron e o fim da oferta.
  for (const selo of ['2026-11-23T20:30:47Z', '2026-11-24T10:23:00Z']) {
    for (const [rodada, fim] of [['bf-day', '2026-11-27T23:30:00Z'], ['bf-night', '2026-11-28T04:30:00Z'], ['cyber-day', '2026-11-30T23:30:00Z'], ['cyber-night', '2026-12-01T04:30:00Z'], ['fim da oferta', B.BF2026_ENDS_AT]]) {
      checa(`(b) selo de ${selo} ainda segura a conta em ${rodada}`, B.bf2026BaseLetterWithinSuppressionWindow(selo, T(fim)) === true)
    }
  }
  checa('(b) o evento consultado é o que a carta da base grava', B.BF2026_BASE_LETTER_SENT_EVENT === 'bf_base_2311_sent' && src(F.cartaBase).includes("export const BF_BASE_2311_SENT = 'bf_base_2311_sent' as const"))
  // KINEO-BF-CYBER-BASE-50-2411 — as duas cartas dizem a base dos 50% (12 mensalidades); a cyber mantém o prazo.
  {
    const base = `${B.BF2026_PERCENT_OFF}% off 12 monthly payments`
    const rodape = { text: '', html: '' }
    const cartaBf = B.bf2026EmailBody('bf', B.bf2026PriceRows(), rodape)
    const cartaCyber = B.bf2026EmailBody('cyber', B.bf2026PriceRows(), rodape)
    checa('(b) carta bf diz a base dos 50% no texto e no html', cartaBf.text.includes(base) && cartaBf.html.includes(base))
    checa('(b) carta cyber diz a base dos 50% no texto e no html', cartaCyber.text.includes(base) && cartaCyber.html.includes(base))
    checa('(b) carta cyber mantém o prazo de terça 1º/12 em Nova York', cartaCyber.text.includes('Last call: ') && cartaCyber.text.includes('ends Tuesday, Dec 1 at 11:59 PM (New York time)'))
    checa('(b) carta cyber não digita preço à mão: a abertura não tem cifrão e a linha de preço vem da tabela', B.bf2026PriceRows().every((r) => cartaCyber.text.includes('- ' + r.name + ': ')) && !cartaCyber.text.split('- ')[0].includes('$'))
  }
  const emailRoute = src(F.emailRoute)
  checa('(b) rota lê os selos para TRÁS (nowMs menos a janela) e passa a lista lida à supressão',
    emailRoute.includes('new Date(nowMs - BF2026_BASE_LETTER_SUPPRESSION_HOURS * 60 * 60 * 1000)') &&
    emailRoute.includes('bf2026BaseLetterSuppression(perfis ?? [], cartasBase ?? [], nowMs)'))
  checa('(b) rota consulta eventos de carta-base e falha fechada sem leitura',
    emailRoute.includes(".eq('name', BF2026_BASE_LETTER_SENT_EVENT)") &&
    emailRoute.includes('BF2026_BASE_LETTER_SUPPRESSION_HOURS * 60 * 60 * 1000') &&
    emailRoute.includes('if (cartasBaseErr) throw cartasBaseErr'))
  // KINEO-BF-ONDAS-PUBLICO-2411 — a leitura dos selos é para TRÁS: .gte a partir de (nowMs − janela). Um .lte leria só selos velhos e a trava sumiria.
  checa('(b) rota filtra os selos com .gte(created_at, nowMs − janela)',
    emailRoute.includes(".eq('name', BF2026_BASE_LETTER_SENT_EVENT).gte('created_at', new Date(nowMs - "))
  checa('(b) coorte aplica supressão por ID e caixa normalizada antes de deduplicar',
    emailRoute.includes('supressaoCartaBase.userIds.has(id)') &&
    emailRoute.includes('bf2026ProfileMatchesBaseLetterSuppression({ id, email: p.email }, supressaoCartaBase)') &&
    emailRoute.indexOf('if (motivo)') < emailRoute.indexOf('bf2026ProfileMatchesBaseLetterSuppression({ id, email: p.email }, supressaoCartaBase)'))

  // (c) fora da janela
  for (const tier of ['starter', 'basic', 'pro']) {
    for (const quando of [ANTES, DEPOIS, Number.NaN]) checa(`(c) ${tier} fora da janela (${quando}) não elegível`, B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: quando }) === false)
    checa(`(c) ${tier} convidado antes da janela: anual normal`, cobra({ tier, nowMs: ANTES, signedIn: false }).unit === anual(tier))
    // KINEO-BF-TODOS-ANUAIS-2611 — fora da janela, conta velha e convidado, em dólar e em reais: anual normal (antes de 24/11 05:00Z e a partir de 02/12 05:00Z)
    for (const quando of [ANTES, DEPOIS, Date.parse(B.BF2026_ENDS_AT), Date.parse(B.BF2026_STARTS_AT) - 1]) for (const signedIn of [true, false]) {
      const r = cobra({ tier, nowMs: quando, signedIn }), brl = cobra({ tier, nowMs: quando, signedIn, pais: 'BR' })
      checa(`(c) ${tier} ${signedIn ? 'logado' : 'convidado'} em ${new Date(quando).toISOString()}: anual normal (dólar e reais)`, r.unit === anual(tier) && r.bf === false && r.offer === null && brl.charge.amount === M.BRL_PLAN_PRICES_MINOR[tier].annual)
    }
    checa(`(c) ${tier} na 1ª e na última fração da janela: oferta`, B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: Date.parse(B.BF2026_STARTS_AT) }) && B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: Date.parse(B.BF2026_ENDS_AT) - 1 }))
  }

  // KINEO-BF-TODOS-ANUAIS-2611 — as bordas escritas por extenso (um mutante que mexa em BF2026_STARTS_AT/ENDS_AT não leva a prova junto)
  checa('(c) janela fixa: 24/11 05:00Z abre, 24/11 04:59:59.999Z não, 02/12 05:00Z fecha, 02/12 04:59:59.999Z ainda aberta',
    TRES.every((tier) => !B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: T('2026-11-24T04:59:59.999Z') }) && B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: T('2026-11-24T05:00:00.000Z') })
      && B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: T('2026-12-02T04:59:59.999Z') }) && !B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: T('2026-12-02T05:00:00.000Z') })))

  // (e) as 3 h da conta nova, intactas FORA da BF: 50% no Starter e no Creator, o Studio fora. NA BF a BF vence nos 3 (mesmo preço, relógio até 01/12).
  const nova = (agora) => new Date(agora - 30 * 60_000).toISOString()
  for (const agora of [ANTES, NA_BF]) {
    for (const tier of ['starter', 'basic']) {
      const r = cobra({ tier, nowMs: agora, signedIn: true, accountCreatedAt: nova(agora), hasPaid: false })
      checa(`(e) ${tier} conta nova (${agora === NA_BF ? 'na BF' : 'fora da BF'}): 50%`, r.unit === metade(tier) && r.offer !== null)
    }
    const naBf = agora === NA_BF
    checa(`(e) Creator conta nova ${naBf ? 'na BF = black_friday_2026' : 'fora da BF = welcome_3h'}`, cobra({ tier: 'basic', nowMs: agora, signedIn: true, accountCreatedAt: nova(agora) }).offer === (naBf ? 'black_friday_2026' : 'welcome_3h'))
    checa(`(e) Studio conta nova ${naBf ? 'na BF: 50% (KINEO-BF-TODOS-ANUAIS-2611)' : 'fora da BF: anual normal'}`, cobra({ tier: 'pro', nowMs: agora, signedIn: true, accountCreatedAt: nova(agora) }).unit === (naBf ? metade('pro') : anual('pro')))
    checa(`(e) Creator conta de 3 h 1 min ${naBf ? 'na BF: 50%' : 'fora da BF: anual normal'}`, cobra({ tier: 'basic', nowMs: agora, signedIn: true, accountCreatedAt: new Date(agora - 3 * H - 60_000).toISOString() }).unit === (naBf ? metade('basic') : anual('basic')))
  }
  checa('(e) a regra das 3 h ainda cobre Starter e Creator', O.annualOfferCoversTier('starter') && O.annualOfferCoversTier('basic') && !O.annualOfferCoversTier('pro'))

  // (f) /api/offers/annual-welcome, EXECUTADA com relógio e conta falsos
  const apiOffer = async (agora, createdAt, hasPaid = false) => {
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
    return (await carregaApi(F.api).GET()).body
  }
  // O que a origin/main respondia em `offer` (Creator como representante e o relógio solto da BF) — fora da BF tem de ser igual.
  const respostaMain = (agora, createdAt, hasPaid) => {
    const o = O.resolveAnnualOffer({ tier: 'basic', isAnnual: true, signedIn: createdAt !== null, accountCreatedAt: createdAt, hasPaid: createdAt !== null ? hasPaid : true, bfOpen: B.bf2026Open(agora), bfEndsAtMs: Date.parse(B.BF2026_ENDS_AT), nowMs: agora })
    return { offer: o?.kind ?? null, endsAtMs: o?.endsAtMs ?? null }
  }

  // A regra do cartão do /pricing (texto conferido abaixo), executada contra a resposta da API num instante `t` do navegador:
  // o hook guarda cada oferta até o próprio fim (setTimeout → null) e o cartão mostra 50% onde ofertaNoPlano, o anual normal fora dela.
  const pricing = src(F.pricing), hook = src(F.hook)
  checa('/pricing: na BF o cartão segue bf2026CoversTier; fora, as 3 h (annualOfferCoversTier)', pricing.includes("    && (annualOffer?.kind === 'black_friday_2026' ? bf2026CoversTier(tier) : annualOfferCoversTier(tier)))"))
  checa('/pricing: o Creator pelas 3 h na BF, com relógio próprio', pricing.includes('|| (welcomeInBfLive && annualOfferCoversTier(tier) && !bf2026CoversTier(tier))') && pricing.includes('const welcomeInBfLive = welcomeInBf !== null && !planSwitch.subscribed'))
  checa('/pricing: o relógio das 3 h na BF diz "Creator"', pricing.includes("{billing === 'annual' && welcomeInBfLive && welcomeInBf ? <AnnualOfferCountdown deadlineMs={welcomeInBf.deadlineMs} percentOff={ANNUAL_WELCOME_DISCOUNT_PERCENT} what={`Creator ${ANNUAL_WELCOME_DISCOUNT_PERCENT}%`}"))
  checa('/pricing: o relógio genérico "Your 50%" só com welcome_3h em `offer`', pricing.includes("{billing === 'annual' && annualOfferLive && annualOffer?.kind === 'welcome_3h' ? <AnnualOfferCountdown deadlineMs={annualOffer.deadlineMs}"))
  checa('hook: lê welcomeOffer e o fim dele, e some ao zerar', hook.includes("if (j.welcomeOffer === 'welcome_3h' && typeof j.nowMs === 'number' && typeof j.welcomeEndsAtMs === 'number')") && hook.includes('const welcomeLeft = j.welcomeEndsAtMs - j.nowMs') && hook.includes('welcomeInBfTimer = setTimeout(() => { if (alive) setWelcomeInBf(null) }, Math.min(welcomeLeft, SET_TIMEOUT_MAX_MS))') && hook.includes('return { annual: offer, monthly, annualWelcomeInBf: welcomeInBf }'))
  checa('hook: `offer` segue lido como antes (welcome_3h ou black_friday_2026, até endsAtMs)', hook.includes("if (j.offer !== 'welcome_3h' && j.offer !== 'black_friday_2026') return") && hook.includes('const msLeft = j.endsAtMs - j.nowMs'))
  const cartao = (api, t, tier) => {
    const annualLive = api.offer !== null && typeof api.endsAtMs === 'number' && t < api.endsAtMs
    const welcomeLive = api.welcomeOffer === 'welcome_3h' && typeof api.welcomeEndsAtMs === 'number' && t < api.welcomeEndsAtMs
    const oferta = (annualLive && (api.offer === 'black_friday_2026' ? B.bf2026CoversTier(tier) : O.annualOfferCoversTier(tier)))
      || (welcomeLive && O.annualOfferCoversTier(tier) && !B.bf2026CoversTier(tier))
    return oferta ? metade(tier) : anual(tier)
  }

  try {
    const casos = [
      ['conta nova, dentro da BF', NA_BF, nova(NA_BF), false],
      ['conta velha, dentro da BF', NA_BF, VELHA, true],
      ['conta nova, fora da BF', ANTES, nova(ANTES), false],
      ['conta velha, fora da BF', ANTES, VELHA, true],
      ['visitante, dentro da BF', NA_BF, null, false],
      ['visitante, fora da BF', ANTES, null, false],
    ]
    const r = {}
    for (const [nome, agora, criada, pagou] of casos) r[nome] = await apiOffer(agora, criada, pagou)
    const nb = r['conta nova, dentro da BF'], vb = r['conta velha, dentro da BF'], nf = r['conta nova, fora da BF'], vf = r['conta velha, fora da BF']
    checa('(f) nova na BF: a BF até BF2026_ENDS_AT', nb.offer === 'black_friday_2026' && nb.endsAtMs === Date.parse(B.BF2026_ENDS_AT))
    checa('(f) nova na BF: o Creator também está na BF, então o campo das 3 h fica vazio (KINEO-BF-TODOS-ANUAIS-2611)', nb.welcomeOffer === null && nb.welcomeEndsAtMs === null)
    checa('(f) velha na BF: BF até 01/12, sem as 3 h', vb.offer === 'black_friday_2026' && vb.endsAtMs === Date.parse(B.BF2026_ENDS_AT) && vb.welcomeOffer === null && vb.welcomeEndsAtMs === null)
    checa('(f) nova fora da BF: as 3 h em `offer`, campo novo vazio', nf.offer === 'welcome_3h' && nf.endsAtMs === Date.parse(nova(ANTES)) + 3 * H && nf.welcomeOffer === null)
    checa('(f) velha fora da BF: nada', vf.offer === null && vf.endsAtMs === null && vf.welcomeOffer === null)
    // conta nova na BF, 3 h 1 min depois de criada: Starter segue com a BF, Creator sem oferta
    const criada = nova(NA_BF), depois3h = Date.parse(criada) + 3 * H + 60_000
    const tarde = await apiOffer(depois3h, criada, false)
    checa('(f) nova na BF depois das 3 h: segue com a BF (os 3 planos), sem campo das 3 h', tarde.offer === 'black_friday_2026' && tarde.endsAtMs === Date.parse(B.BF2026_ENDS_AT) && tarde.welcomeOffer === null)
    // fora da BF: `offer`/`endsAtMs` idênticos à origin/main; na BF, `offer` idêntico também (o campo novo é o único acréscimo)
    for (const [nome, agora, criada2, pagou] of casos) {
      const m = respostaMain(agora, criada2, pagou)
      checa(`(f) ${nome}: offer/endsAtMs iguais à origin/main`, r[nome].offer === m.offer && r[nome].endsAtMs === m.endsAtMs)
      if (agora === ANTES) checa(`(f) ${nome}: fora da BF o campo novo é null`, r[nome].welcomeOffer === null && r[nome].welcomeEndsAtMs === null)
    }
    // O CARTÃO = O CHECKOUT em cada instante: a aba aberta no momento da leitura e ao longo do tempo (relógios zerando sozinhos)
    const linhas = [
      ['conta nova, dentro da BF', NA_BF, criada, true],
      ['conta velha, dentro da BF', NA_BF, VELHA, true],
      ['conta nova, fora da BF', ANTES, nova(ANTES), true],
      ['conta velha, fora da BF', ANTES, VELHA, true],
      ['visitante, dentro da BF', NA_BF, null, false],
    ]
    for (const [nome, lida, conta, signedIn] of linhas) {
      for (const passa of [0, 2 * H, 3 * H + 60_000, 5 * 24 * H]) {
        const t = lida + passa
        // aba aberta que CRUZA o início ou o fim da BF: o /pricing não relê a API nessa virada (igual à origin/main); fica fora desta prova.
        if ((t >= Date.parse(B.BF2026_ENDS_AT) && lida < Date.parse(B.BF2026_ENDS_AT)) || (t >= Date.parse(B.BF2026_STARTS_AT) && lida < Date.parse(B.BF2026_STARTS_AT))) continue
        for (const tier of ['starter', 'basic', 'pro']) {
          const tela = cartao(r[nome], t, tier)
          const cobrado = cobra({ tier, nowMs: t, signedIn, accountCreatedAt: conta ?? VELHA, hasPaid: conta === VELHA }).unit
          checa(`(f) ${nome} +${passa / H} h, ${tier}: cartão ${tela} = checkout ${cobrado}`, tela === cobrado)
        }
      }
    }
  } catch (e) { p.push('API annual-welcome: ' + String(e?.message)) }

  // (d) a página renderizada, a faixa, o selo e a carta — KINEO-BF-TODOS-ANUAIS-2611: dizem os 3 anuais e nunca o mensal; nenhuma frase de "só o Starter"
  const preco50 = (t) => B.bf2026Usd(Pr.ANNUAL_WELCOME_PRICES[t].usd)
  const NOMES = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }
  const semPromessa = (nome, texto) => {
    // a verdade nova: todo ANUAL. A frase velha ("só o Starter", "Creator e Studio no anual normal") e qualquer promessa no mensal ficam vermelhas.
    checa(`(d) ${nome}: sem a frase velha de "só o Starter"`, !/keep their regular annual price|starter annual plan only|only the starter|is for the starter annual plan|creator and studio (annual plans )?(are not|aren't) included/i.test(texto))
    checa(`(d) ${nome}: não promete desconto no mensal`, !/% off (all|every) (kineo )?plans?\b|% off (the )?monthly|monthly plans? (are|is) (also )?(included|discounted)|every plan is \d+%/i.test(texto))
    checa(`(M4) ${nome}: não diz que o Creator ou o Studio ficam fora`, !/(creator|studio)( and (creator|studio))?( annual plans?)? (is|are) (not|n't) (included|part of)|(creator|studio) (is|are) excluded|no\. the black friday price is for the starter/i.test(texto))
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
      checa(`(d) página ${estado}: os 3 cartões (Starter, Creator e Studio)`, (html.match(/data-bf-tier="/g) ?? []).length === 3 && TRES.every((t) => html.includes(`data-bf-tier="${t}"`)))
      checa(`(d) página ${estado}: título e descrição dizem todo anual e os 3 nomes`, mod.metadata.title.absolute.includes('Every Annual Plan') && mod.metadata.description.includes('every annual plan (Starter, Creator and Studio)') && mod.metadata.description.includes('Monthly plans keep their regular price'))
      const faq = /Are Creator and Studio included\?<\/summary><p[^>]*>([^<]*)<\/p>/.exec(html)
      checa(`(M4) página ${estado}: a pergunta do Creator responde "Yes."`, faq !== null && faq[1].startsWith('Yes. ') && faq[1].includes('Starter, Creator and Studio annual plans'))
      checa(`(d) página ${estado}: mensal fora e créditos no plural`, html.includes('for the Starter, Creator and Studio annual plans only; monthly plans keep their regular price') && html.includes('As on the regular annual plans, your credits refill') && html.includes('The Starter, Creator and Studio annual plans are included; monthly plans are not included.'))
      checa(`(d) página ${estado}: nenhum link para o mensal`, !html.includes('billing=monthly'))
      if (estado !== 'after') checa(`(d) página ${estado}: h1 "every annual plan" e os 3 preços de 50% lidos do código`, html.includes('50% off every annual plan</h1>') && TRES.every((t) => html.includes(preco50(t))))
      if (estado === 'open') {
        for (const t of TRES) checa(`(d) página no ar: botão do ${NOMES[t]} no preço escrito, para o checkout ANUAL`, html.includes(`Get ${NOMES[t]} for ${preco50(t)}`) && html.includes(`data-bf-cta="${t}"`) && html.includes(`tier=${t}&amp;billing=annual`))
      } else {
        checa(`(d) página ${estado}: nenhum botão de compra`, !html.includes('data-bf-cta='))
      }
    } catch (e) { p.push(`página ${estado}: ` + String(e?.message)) }
  }
  const faixa = src(F.faixa).split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
  semPromessa('faixa e selo', faixa)
  checa('(d) faixa: "off {every annual plan}"', faixa.includes('Black Friday: {BF2026_PERCENT_OFF}% off {BF2026_OFFER_SCOPE} · ends Dec 1 →'))
  checa('(d) selo: todo anual, os 3 nomes e o mensal fora', faixa.includes('{BF2026_PERCENT_OFF}% off {BF2026_OFFER_SCOPE} ({BF2026_PLAN_LABEL}), no code needed. Monthly plans keep their regular price.'))
  for (const onda of ['bf', 'cyber']) {
    const carta = B.bf2026EmailBody(onda, B.bf2026PriceRows(), { text: '', html: '' })
    const assunto = B.bf2026Subject(onda)
    semPromessa(`carta ${onda}`, `${assunto}\n${carta.text}\n${carta.html}`)
    checa(`(d) carta ${onda}: todo anual Kineo e os 3 planos, cada um no preço de 50% do código`, carta.text.includes('every Kineo annual plan (Starter, Creator and Studio)') && TRES.every((t) => carta.text.includes(`- ${NOMES[t]}: ${preco50(t)} a year`) && carta.html.includes(`${NOMES[t]}: ${preco50(t)}</strong>`)))
    checa(`(d) assunto ${onda}: "every annual plan" e curto`, assunto.includes('every annual plan') && assunto.length <= 60)
  }
  const apiBf = lf('app/api/offers/bf2026/route.ts')
  checa('(d) /api/offers/bf2026 lista os planos por bf2026PriceRows', apiBf.includes('tiers: bf2026PriceRows().map('))

  return p
}

const muta = (rel, de, para) => {
  const s = SRC[rel]
  if (!s.includes(de)) throw new Error(`mutante não aplicável em ${rel}: ${de.slice(0, 60)}`)
  return { [rel]: s.replace(de, para) }
}
const MUTANTES = [
    ['carta recente da base não suprime a onda BF', muta(F.emailRoute, 'if (bf2026ProfileMatchesBaseLetterSuppression({ id, email: p.email }, supressaoCartaBase)) { fora.recent_bf_base_2311++; continue }', 'if (false) { fora.recent_bf_base_2311++; continue }')],
  ['alias de e-mail não herda a supressão recente', muta(F.bf, "return (id !== '' && suppression.userIds.has(id)) || (email !== '' && suppression.normalizedEmails.has(email))", "return id !== '' && suppression.userIds.has(id)")],
  ['caixa de alias deixa de normalizar maiúsculas e espaços', muta(F.bf, "const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : ''", "const email = typeof profile.email === 'string' ? profile.email.trim() : ''")],
  ['carta cyber sem a base dos 50%', muta(F.bf, ' It is ${BF2026_PERCENT_OFF}% off 12 monthly payments.`', '`')],
  ['janela da carta da base cai uma hora', muta(F.bf, 'export const BF2026_BASE_LETTER_SUPPRESSION_HOURS = 240', 'export const BF2026_BASE_LETTER_SUPPRESSION_HOURS = 239')],
  ['janela volta a sete dias (a metade B escapa na Cyber da noite)', muta(F.bf, 'export const BF2026_BASE_LETTER_SUPPRESSION_HOURS = 240', 'export const BF2026_BASE_LETTER_SUPPRESSION_HOURS = 168')],
  ['nome do evento da carta da base errado', muta(F.bf, "export const BF2026_BASE_LETTER_SENT_EVENT = 'bf_base_2311_sent' as const", "export const BF2026_BASE_LETTER_SENT_EVENT = 'bf_base_sent' as const")],
  ['carta da base renomeia o selo e a trava fica cega', muta(F.cartaBase, "export const BF_BASE_2311_SENT = 'bf_base_2311_sent' as const", "export const BF_BASE_2311_SENT = 'bf_base_2411_sent' as const")],
  ['rota lê os selos para a FRENTE (nowMs mais a janela)', muta(F.emailRoute, 'new Date(nowMs - BF2026_BASE_LETTER_SUPPRESSION_HOURS * 60 * 60 * 1000)', 'new Date(nowMs + BF2026_BASE_LETTER_SUPPRESSION_HOURS * 60 * 60 * 1000)')],
  ['rota lê os selos com .lte em vez de .gte (a trava some)', muta(F.emailRoute, ".eq('name', BF2026_BASE_LETTER_SENT_EVENT).gte('created_at'", ".eq('name', BF2026_BASE_LETTER_SENT_EVENT).lte('created_at'")],
  ['supressão recebe lista vazia em vez dos selos lidos', muta(F.emailRoute, 'bf2026BaseLetterSuppression(perfis ?? [], cartasBase ?? [], nowMs)', 'bf2026BaseLetterSuppression(perfis ?? [], [], nowMs)')],
  // KINEO-BF-TODOS-ANUAIS-2611 — tirar QUALQUER um dos 3 da lista, ou voltar ao só-Starter, fica vermelho
  ['Creator sai da lista da BF', muta(F.bf, "export const BF2026_TIERS: readonly CheckoutTier[] = ['starter', 'basic', 'pro']", "export const BF2026_TIERS: readonly CheckoutTier[] = ['starter', 'pro']")],
  ['Studio sai da lista da BF', muta(F.bf, "export const BF2026_TIERS: readonly CheckoutTier[] = ['starter', 'basic', 'pro']", "export const BF2026_TIERS: readonly CheckoutTier[] = ['starter', 'basic']")],
  ['BF volta a só o Starter', muta(F.bf, "export const BF2026_TIERS: readonly CheckoutTier[] = ['starter', 'basic', 'pro']", "export const BF2026_TIERS: readonly CheckoutTier[] = ['starter']")],
  ['BF dá 50% no mensal', muta(F.bf, '  return input.isAnnual === true &&\n', '  return ')],
  ['BF fora da janela (relógio ignorado)', muta(F.bf, '    bf2026Open(input.nowMs ?? Date.now())', '    true')],
  ['BF no teste com cartão', muta(F.bf, '    input.wantsTrial !== true &&\n', '')],
  ['janela começa um dia antes', muta(F.bf, "export const BF2026_STARTS_AT = '2026-11-24T05:00:00.000Z'", "export const BF2026_STARTS_AT = '2026-11-23T05:00:00.000Z'")],
  ['janela termina um dia depois', muta(F.bf, "export const BF2026_ENDS_AT = '2026-12-02T05:00:00.000Z'", "export const BF2026_ENDS_AT = '2026-12-03T05:00:00.000Z'")],
  ['regra tira o Studio da BF (reais do logado no anual normal)', muta(F.regra, "const TIERS_DA_BF: readonly string[] = ['starter', 'basic', 'pro']", "const TIERS_DA_BF: readonly string[] = ['starter', 'basic']")],
  ['regra volta a pedir as 3 h para a BF', muta(F.regra, ' && TIERS_DA_BF.includes(input.tier)) return', ' && TIERS_COM_ANUAL.includes(input.tier)) return')],
  ['regra dá a BF ao Business', muta(F.regra, "const TIERS_DA_BF: readonly string[] = ['starter', 'basic', 'pro']", "const TIERS_DA_BF: readonly string[] = ['starter', 'basic', 'pro', 'business']")],
  ['frase "every annual plan" fixa, sem olhar a lista', muta(F.bf, "export const BF2026_OFFER_SCOPE: string = BF2026_COVERS_EVERY_ANNUAL_PLAN ?", "export const BF2026_OFFER_SCOPE: string = true ?")],
  ['rótulo da copy perde o Studio', muta(F.bf, "export const BF2026_COVERS_EVERY_ANNUAL_PLAN: boolean = (['starter', 'basic', 'pro'] as const)", "export const BF2026_COVERS_EVERY_ANNUAL_PLAN: boolean = (['starter', 'basic'] as const)")],
  ['elegibilidade ignora o plano', muta(F.bf, '    bf2026CoversTier(input.tier) &&\n', '')],
  ['(M2) bf2026CoversTier aceita maiúscula', muta(F.bf, '  return (BF2026_TIERS as readonly string[]).includes(tier)', '  return (BF2026_TIERS as readonly string[]).includes(String(tier).trim().toLowerCase())')],
  ['(M2) bf2026CoversTier aceita vazio/desconhecido', muta(F.bf, '  return (BF2026_TIERS as readonly string[]).includes(tier)', "  return (BF2026_TIERS as readonly string[]).includes(tier) || !tier || !['basic', 'pro'].includes(tier)")],
  ['?promo=BF2026 fura a regra (rota)', muta(F.rota, 'const bfAnnualOpen = !privatePackPromo && bf2026CheckoutEligible({ tier, isAnnual })', "const bfAnnualOpen = !privatePackPromo && (bf2026CheckoutEligible({ tier, isAnnual }) || isBf2026PromoCode(req.nextUrl.searchParams.get('promo')))")],
  ['?promo=BF2026 deixa de ser descartado', muta(F.rota, 'if (isBf2026PromoCode(promo)) promo = undefined', '')],
  ['(M3) Creator em reais pela tabela de boas-vindas', muta(F.moeda, "if (billing === 'annual' && annualTable === 'welcome') return BRL_ANNUAL_WELCOME_MINOR[tier]", "if (billing === 'annual' && (annualTable === 'welcome' || tier === 'basic')) return BRL_ANNUAL_WELCOME_MINOR[tier]")],
  ['(M3) convidado em reais sempre na tabela de boas-vindas', muta(F.convidado, "input.annualOffer === true ? 'welcome' : 'regular'", "'welcome'")],
  ['(M3) rota do logado em reais sempre na tabela de boas-vindas', muta(F.rota, "chargeCurrency, unitAmount, annualOffer ? 'welcome' : 'regular')", "chargeCurrency, unitAmount, isAnnual ? 'welcome' : 'regular')")],
  ['faixa volta a "só o Starter"', muta(F.faixa, 'Black Friday: {BF2026_PERCENT_OFF}% off {BF2026_OFFER_SCOPE} · ends Dec 1 →', 'Black Friday: {BF2026_PERCENT_OFF}% off the Starter annual plan · ends Dec 1 →')],
  ['faixa promete todo plano (mensal junto)', muta(F.faixa, 'Black Friday: {BF2026_PERCENT_OFF}% off {BF2026_OFFER_SCOPE} · ends Dec 1 →', 'Black Friday: {BF2026_PERCENT_OFF}% off every plan · ends Dec 1 →')],
  ['selo volta a "Creator and Studio keep their regular annual price"', muta(F.faixa, ', no code needed. Monthly plans keep their regular price.', ', no code needed. Creator and Studio keep their regular annual price.')],
  ['h1 da página volta ao Starter', muta(F.pagina, '{BF2026_PERCENT_OFF}% off {BF2026_OFFER_SCOPE}</h1>', '{BF2026_PERCENT_OFF}% off the Starter annual plan</h1>')],
  ['página diz que o mensal entra', muta(F.pagina, 'annual plans only; monthly plans keep their regular price.`', 'annual plans; monthly plans are included too.`')],
  ['(M4) FAQ volta a dizer "No." ao Creator', muta(F.pagina, 'a: `Yes. The Black Friday price covers the ${BF2026_PLAN_LABEL} annual plans, at ${BF2026_PERCENT_OFF}% off 12 monthly payments each.`', 'a: `No. The Black Friday price is for the Starter annual plan only. Creator and Studio annual plans keep their regular annual price, shown on the pricing page.`')],
  ['carta volta ao "Kineo Starter annual plan"', muta(F.bf, 'For Black Friday, ${BF2026_OFFER_SCOPE_KINEO} is', 'For Black Friday, the Kineo Starter annual plan is')],
  ['assunto volta ao Starter', muta(F.bf, '? `Black Friday: ${BF2026_PERCENT_OFF}% off ${BF2026_OFFER_SCOPE}`', '? `Black Friday: ${BF2026_PERCENT_OFF}% off the Kineo Starter annual plan`')],
  ['página esconde o Studio', muta(F.pagina, 'const rows = bf2026PriceRows()', "const rows = bf2026PriceRows().filter((r) => r.tier !== 'pro')")],
  ['página mostra o Creator no anual normal', muta(F.pagina, 'const rows = bf2026PriceRows()', "const rows = bf2026PriceRows().map((r) => r.tier === 'basic' ? { ...r, bfMinor: r.annualMinor } : r)")],
  ['oferta de 3 h quebra (Creator fora)', muta(F.regra, "const TIERS_COM_ANUAL: readonly string[] = ['starter', 'basic']", "const TIERS_COM_ANUAL: readonly string[] = ['starter']")],
  ['oferta de 3 h quebra (janela de 0 h)', muta(F.regra, 'ANNUAL_WELCOME_WINDOW_MS = 3 * 60 * 60 * 1000', 'ANNUAL_WELCOME_WINDOW_MS = 0')],
  // KINEO-BF-TODOS-ANUAIS-2611 — "(item 1) API pergunta primeiro pelo Creator", "API sem as 3 h do Creator na BF" e "API dá a BF ao Creator (relógio
  // solto)" saíram: com o Creator dentro da BF eles viraram EQUIVALENTES (mesma resposta em todo instante), e mutante equivalente não prova nada.
  ['(item 1) API pergunta pelo Studio (as 3 h não o cobrem: conta nova fora da BF sem oferta)', muta(F.api, "  const offer = resolveAnnualOffer({ ...base, tier: 'starter', bfOpen: bf2026CheckoutEligible({ tier: 'starter', isAnnual: true, nowMs }) })", "  const offer = resolveAnnualOffer({ ...base, tier: 'pro', bfOpen: bf2026CheckoutEligible({ tier: 'pro', isAnnual: true, nowMs }) })")],
  ['(item 1) campo novo também fora da BF', muta(F.api, "  const creator = offer?.kind === 'black_friday_2026'\n    ? resolveAnnualOffer", "  const creator = true\n    ? resolveAnnualOffer")],
  ['/pricing pinta 50% em todo plano, fora da BF também', muta(F.pricing, "annualOffer?.kind === 'black_friday_2026' ? bf2026CoversTier(tier) : annualOfferCoversTier(tier)", 'true')],
  ['/pricing volta a tirar o Studio na BF (cartão ≠ checkout)', muta(F.pricing, "annualOffer?.kind === 'black_friday_2026' ? bf2026CoversTier(tier) : annualOfferCoversTier(tier)", 'annualOfferCoversTier(tier) && (annualOffer?.kind !== \'black_friday_2026\' || bf2026CoversTier(tier))')],
  ['/pricing dá o Studio nas 3 h fora da BF', muta(F.pricing, "annualOffer?.kind === 'black_friday_2026' ? bf2026CoversTier(tier) : annualOfferCoversTier(tier)", 'bf2026CoversTier(tier)')],
  // KINEO-BF-TODOS-ANUAIS-2611 — "(item 1) /pricing esquece as 3 h do Creator na BF" saiu: equivalente (na BF o Creator já está coberto; fora dela o campo é null).
  ['(item 1) hook não zera o relógio do Creator', muta(F.hook, 'welcomeInBfTimer = setTimeout(() => { if (alive) setWelcomeInBf(null) }, Math.min(welcomeLeft, SET_TIMEOUT_MAX_MS))', 'welcomeInBfTimer = undefined')],
  ['(item 1) relógio das 3 h na BF volta a "Your 50%"', muta(F.pricing, " what={`Creator ${ANNUAL_WELCOME_DISCOUNT_PERCENT}%`}", '')],
  ['rota volta a dar o relógio solto às 3 h', muta(F.rota, '    bfOpen: bfAnnualOpen,\n    bfEndsAtMs: Date.parse(BF2026_ENDS_AT),', '    bfOpen: bf2026Open(),\n    bfEndsAtMs: Date.parse(BF2026_ENDS_AT),')],
]

let falhas = 0
const b0 = await problemas()
console.log(b0.length ? 'FALHA\n  ' + b0.join('\n  ') : 'PASS Black Friday nos 3 anuais (Starter, Creator e Studio), dólar e reais; mensal, teste com cartão, Business e fora da janela no preço normal; 3 h intactas fora da BF; cartão = checkout (KINEO-BF-TODOS-ANUAIS-2611)')
if (b0.length) falhas++
for (const [nome, repl] of MUTANTES) {
  const r = await problemas(repl)
  if (r.length === 0) { console.log(`VIVO  mutante "${nome}"`); falhas++ }
  else console.log(`morto mutante "${nome}" ← ${r[0]}`)
}
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1) }
console.log(`\nOK — ${MUTANTES.length} mutantes mortos`)
