// KINEO-BF-SO-STARTER-2311 [fundador 16/11: "Creator fica no anual normal de 30%; os 50% valem só no Starter. A página e a carta dizem isso."]
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
  checa('premissa: 50% < anual normal em Starter e Creator', metade('starter') < anual('starter') && metade('basic') < anual('basic'))

  // (M2) bf2026CoversTier: só o Starter, escrito como o código escreve
  checa('(M2) bf2026CoversTier: starter sim', B.bf2026CoversTier('starter') === true)
  for (const x of ['basic', 'pro', 'business', 'creator', '', 'Starter', 'STARTER', ' starter', 'BASIC', undefined, null]) checa(`(M2) bf2026CoversTier(${JSON.stringify(x)}) = false`, B.bf2026CoversTier(x) === false)

  // (a) Starter anual na janela
  checa('(a) Starter anual elegível na janela', B.bf2026CheckoutEligible({ tier: 'starter', isAnnual: true, nowMs: NA_BF }) === true)
  checa('(a) Starter anual logado cobra 50%', cobra({ tier: 'starter', nowMs: NA_BF, signedIn: true }).unit === metade('starter'))
  checa('(a) Starter anual convidado cobra 50%', cobra({ tier: 'starter', nowMs: NA_BF, signedIn: false }).unit === metade('starter'))
  checa('(a) Starter anual com ?promo=BF2026 cobra 50%', cobra({ tier: 'starter', nowMs: NA_BF, signedIn: false, promo: 'BF2026' }).unit === metade('starter'))
  checa('(a) Starter mensal sem BF', !B.bf2026CheckoutEligible({ tier: 'starter', isAnnual: false, nowMs: NA_BF }))
  for (const signedIn of [true, false]) {
    const r = cobra({ tier: 'starter', nowMs: NA_BF, signedIn, pais: 'BR' })
    checa(`(M3) Starter em reais na BF (${signedIn ? 'logado' : 'convidado'}) = tabela de boas-vindas`, r.charge.cur === 'brl' && r.charge.amount === M.BRL_ANNUAL_WELCOME_MINOR.starter)
  }

  // (b) Creator e Studio anuais na janela: anual normal, de qualquer origem, em dólar e em reais
  for (const tier of ['basic', 'pro']) {
    checa(`(b) ${tier} anual NÃO elegível na janela`, B.bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: NA_BF }) === false)
    checa(`(b) ${tier} fora de bf2026CoversTier`, B.bf2026CoversTier(tier) === false)
    for (const [origem, extra] of [['logado conta velha', { signedIn: true }], ['convidado', { signedIn: false }], ['logado com ?promo=BF2026', { signedIn: true, promo: 'BF2026' }], ['convidado com ?promo= bf2026 ', { signedIn: false, promo: ' bf2026 ' }], ['logado que já pagou', { signedIn: true, hasPaid: true }]]) {
      const r = cobra({ tier, nowMs: NA_BF, ...extra })
      checa(`(b) ${tier} ${origem}: anual normal`, r.unit === anual(tier) && r.bf === false && r.offer === null && r.charge.amount === anual(tier))
      const brl = cobra({ tier, nowMs: NA_BF, ...extra, pais: 'BR' })
      checa(`(M3) ${tier} ${origem} em REAIS na BF: anual normal da tabela`, brl.charge.cur === 'brl' && brl.charge.amount === M.BRL_PLAN_PRICES_MINOR[tier].annual && brl.charge.amount !== M.BRL_ANNUAL_WELCOME_MINOR[tier])
    }
  }
  checa('(M3) Creator em reais: 79790 (nunca 56990) na BF, conta velha e convidado', [true, false].every((signedIn) => cobra({ tier: 'basic', nowMs: NA_BF, signedIn, pais: 'BR' }).charge.amount === 79790))
  checa('(b) a tabela da BF só tem o Starter', JSON.stringify(B.bf2026PriceRows().map((r) => r.tier)) === '["starter"]' && JSON.stringify(B.BF2026_TIERS) === '["starter"]')
  checa('(b) rótulo da oferta = "Starter"', B.BF2026_PLAN_LABEL === 'Starter')
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
  checa('/pricing: o cartão pinta a BF só nos planos da BF', pricing.includes("&& (annualOffer?.kind !== 'black_friday_2026' || bf2026CoversTier(tier)))"))
  checa('/pricing: o Creator pelas 3 h na BF, com relógio próprio', pricing.includes('|| (welcomeInBfLive && annualOfferCoversTier(tier) && !bf2026CoversTier(tier))') && pricing.includes('const welcomeInBfLive = welcomeInBf !== null && !planSwitch.subscribed'))
  checa('/pricing: o relógio das 3 h na BF diz "Creator"', pricing.includes("{billing === 'annual' && welcomeInBfLive && welcomeInBf ? <AnnualOfferCountdown deadlineMs={welcomeInBf.deadlineMs} percentOff={ANNUAL_WELCOME_DISCOUNT_PERCENT} what={`Creator ${ANNUAL_WELCOME_DISCOUNT_PERCENT}%`}"))
  checa('/pricing: o relógio genérico "Your 50%" só com welcome_3h em `offer`', pricing.includes("{billing === 'annual' && annualOfferLive && annualOffer?.kind === 'welcome_3h' ? <AnnualOfferCountdown deadlineMs={annualOffer.deadlineMs}"))
  checa('hook: lê welcomeOffer e o fim dele, e some ao zerar', hook.includes("if (j.welcomeOffer === 'welcome_3h' && typeof j.nowMs === 'number' && typeof j.welcomeEndsAtMs === 'number')") && hook.includes('const welcomeLeft = j.welcomeEndsAtMs - j.nowMs') && hook.includes('welcomeInBfTimer = setTimeout(() => { if (alive) setWelcomeInBf(null) }, Math.min(welcomeLeft, SET_TIMEOUT_MAX_MS))') && hook.includes('return { annual: offer, monthly, annualWelcomeInBf: welcomeInBf }'))
  checa('hook: `offer` segue lido como antes (welcome_3h ou black_friday_2026, até endsAtMs)', hook.includes("if (j.offer !== 'welcome_3h' && j.offer !== 'black_friday_2026') return") && hook.includes('const msLeft = j.endsAtMs - j.nowMs'))
  const cartao = (api, t, tier) => {
    const annualLive = api.offer !== null && typeof api.endsAtMs === 'number' && t < api.endsAtMs
    const welcomeLive = api.welcomeOffer === 'welcome_3h' && typeof api.welcomeEndsAtMs === 'number' && t < api.welcomeEndsAtMs
    const oferta = (annualLive && O.annualOfferCoversTier(tier) && (api.offer !== 'black_friday_2026' || B.bf2026CoversTier(tier)))
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
    checa('(f) nova na BF: Starter pela BF até BF2026_ENDS_AT', nb.offer === 'black_friday_2026' && nb.endsAtMs === Date.parse(B.BF2026_ENDS_AT))
    checa('(f) nova na BF: Creator pelas 3 h, fim em created_at + 3 h', nb.welcomeOffer === 'welcome_3h' && nb.welcomeEndsAtMs === Date.parse(nova(NA_BF)) + 3 * H)
    checa('(f) velha na BF: BF até 01/12, sem as 3 h', vb.offer === 'black_friday_2026' && vb.endsAtMs === Date.parse(B.BF2026_ENDS_AT) && vb.welcomeOffer === null && vb.welcomeEndsAtMs === null)
    checa('(f) nova fora da BF: as 3 h em `offer`, campo novo vazio', nf.offer === 'welcome_3h' && nf.endsAtMs === Date.parse(nova(ANTES)) + 3 * H && nf.welcomeOffer === null)
    checa('(f) velha fora da BF: nada', vf.offer === null && vf.endsAtMs === null && vf.welcomeOffer === null)
    // conta nova na BF, 3 h 1 min depois de criada: Starter segue com a BF, Creator sem oferta
    const criada = nova(NA_BF), depois3h = Date.parse(criada) + 3 * H + 60_000
    const tarde = await apiOffer(depois3h, criada, false)
    checa('(f) nova na BF depois das 3 h: Starter segue com a BF, Creator sem oferta', tarde.offer === 'black_friday_2026' && tarde.endsAtMs === Date.parse(B.BF2026_ENDS_AT) && tarde.welcomeOffer === null)
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

  // (d) a página renderizada, a faixa, o selo e a carta
  const precoCreator50 = B.bf2026Usd(Pr.ANNUAL_WELCOME_PRICES.basic.usd)
  const precoStudio50 = B.bf2026Usd(Pr.ANNUAL_WELCOME_PRICES.pro.usd)
  const semPromessa = (nome, texto) => {
    // "Annual plans are refundable" (a garantia) é geral e fica; a promessa de desconto em todo anual, não.
    checa(`(d) ${nome}: sem "any annual plan"/"every annual plan is"/"% off annual plans"/"annual plans only"`, !/any annual plan|every (kineo )?annual plan is|% off (kineo )?annual plans|% off every annual|for annual plans only|like every kineo annual plan/i.test(texto))
    checa(`(d) ${nome}: sem o preço de 50% do Creator/Studio`, !texto.includes(precoCreator50) && !texto.includes(precoStudio50))
    checa(`(M4) ${nome}: não diz que o Creator está incluído`, !/(creator|studio)[^.<]{0,60}\b(is|are) (also )?included|includes? (the )?creator|creator (also )?(gets|at) \d+%|yes[^.<]{0,20}creator/i.test(texto))
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
      const faq = /Are Creator and Studio included\?<\/summary><p[^>]*>([^<]*)<\/p>/.exec(html)
      checa(`(M4) página ${estado}: a pergunta do Creator responde "No."`, faq !== null && faq[1].startsWith('No. ') && faq[1].includes('Starter annual plan only'))
      checa(`(d) página ${estado}: mensal e créditos falam do Starter, no singular`, html.includes('for the Starter annual plan only; monthly plans keep their regular price') && html.includes('As on the regular Starter annual plan, your credits refill'))
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
  ['Creator volta à lista da BF', muta(F.bf, "export const BF2026_TIERS: readonly CheckoutTier[] = ['starter']", "export const BF2026_TIERS: readonly CheckoutTier[] = ['starter', 'basic']")],
  ['elegibilidade ignora o plano', muta(F.bf, '    bf2026CoversTier(input.tier) &&\n', '')],
  ['(M2) bf2026CoversTier aceita maiúscula', muta(F.bf, '  return (BF2026_TIERS as readonly string[]).includes(tier)', '  return (BF2026_TIERS as readonly string[]).includes(String(tier).trim().toLowerCase())')],
  ['(M2) bf2026CoversTier aceita vazio/desconhecido', muta(F.bf, '  return (BF2026_TIERS as readonly string[]).includes(tier)', "  return (BF2026_TIERS as readonly string[]).includes(tier) || !tier || !['basic', 'pro'].includes(tier)")],
  ['?promo=BF2026 fura a regra (rota)', muta(F.rota, 'const bfAnnualOpen = !privatePackPromo && bf2026CheckoutEligible({ tier, isAnnual })', "const bfAnnualOpen = !privatePackPromo && (bf2026CheckoutEligible({ tier, isAnnual }) || isBf2026PromoCode(req.nextUrl.searchParams.get('promo')))")],
  ['?promo=BF2026 deixa de ser descartado', muta(F.rota, 'if (isBf2026PromoCode(promo)) promo = undefined', '')],
  ['(M3) Creator em reais pela tabela de boas-vindas', muta(F.moeda, "if (billing === 'annual' && annualTable === 'welcome') return BRL_ANNUAL_WELCOME_MINOR[tier]", "if (billing === 'annual' && (annualTable === 'welcome' || tier === 'basic')) return BRL_ANNUAL_WELCOME_MINOR[tier]")],
  ['(M3) convidado em reais sempre na tabela de boas-vindas', muta(F.convidado, "input.annualOffer === true ? 'welcome' : 'regular'", "'welcome'")],
  ['(M3) rota do logado em reais sempre na tabela de boas-vindas', muta(F.rota, "chargeCurrency, unitAmount, annualOffer ? 'welcome' : 'regular')", "chargeCurrency, unitAmount, isAnnual ? 'welcome' : 'regular')")],
  ['faixa volta a "any annual plan"', muta(F.faixa, '{BF2026_PERCENT_OFF}% off the {BF2026_PLAN_LABEL} annual plan · ends Dec 1 →', '{BF2026_PERCENT_OFF}% off any annual plan · ends Dec 1 →')],
  ['h1 da página volta a "any annual plan"', muta(F.pagina, '{BF2026_PERCENT_OFF}% off the {BF2026_PLAN_LABEL} annual plan</h1>', '{BF2026_PERCENT_OFF}% off any annual plan</h1>')],
  ['página volta a "for annual plans only"', muta(F.pagina, 'The Black Friday offer is for the ${BF2026_PLAN_LABEL} annual plan only;', 'The Black Friday offer is for annual plans only;')],
  ['(M4) FAQ diz que o Creator está incluído', muta(F.pagina, 'a: `No. The Black Friday price is for the ${BF2026_PLAN_LABEL} annual plan only. Creator and Studio annual plans keep their regular annual price, shown on the pricing page.`', 'a: `Yes. Creator is included at ${BF2026_PERCENT_OFF}% too; Studio keeps its regular annual price.`')],
  ['carta volta a "every Kineo annual plan"', muta(F.bf, 'For Black Friday, the Kineo ${BF2026_PLAN_LABEL} annual plan is', 'For Black Friday, every Kineo annual plan is')],
  ['página lista o Creator a 50%', muta(F.pagina, 'const rows = bf2026PriceRows()', "const rows = [...bf2026PriceRows(), { ...bf2026PriceRows()[0], tier: 'basic' as const, name: 'Creator', bfMinor: 11400 }]")],
  ['oferta de 3 h quebra (Creator fora)', muta(F.regra, "const TIERS_COM_ANUAL: readonly string[] = ['starter', 'basic']", "const TIERS_COM_ANUAL: readonly string[] = ['starter']")],
  ['oferta de 3 h quebra (janela de 0 h)', muta(F.regra, 'ANNUAL_WELCOME_WINDOW_MS = 3 * 60 * 60 * 1000', 'ANNUAL_WELCOME_WINDOW_MS = 0')],
  ['(item 1) API pergunta primeiro pelo Creator (versão de 86945d8b8)', muta(F.api, "  const offer = resolveAnnualOffer({ ...base, tier: 'starter', bfOpen: bf2026CheckoutEligible({ tier: 'starter', isAnnual: true, nowMs }) })", "  const offer = resolveAnnualOffer({ ...base, tier: 'basic', bfOpen: bf2026CheckoutEligible({ tier: 'basic', isAnnual: true, nowMs }) })\n    ?? resolveAnnualOffer({ ...base, tier: 'starter', bfOpen: bf2026CheckoutEligible({ tier: 'starter', isAnnual: true, nowMs }) })")],
  ['(item 1) API sem as 3 h do Creator na BF', muta(F.api, "  const welcomeOffer = creator?.kind === 'welcome_3h' ? creator : null", '  const welcomeOffer = null as typeof creator')],
  ['(item 1) API dá a BF ao Creator (relógio solto)', muta(F.api, "tier: 'basic', bfOpen: bf2026CheckoutEligible({ tier: 'basic', isAnnual: true, nowMs })", "tier: 'basic', bfOpen: bf2026CheckoutEligible({ tier: 'starter', isAnnual: true, nowMs })")],
  ['(item 1) campo novo também fora da BF', muta(F.api, "  const creator = offer?.kind === 'black_friday_2026'\n    ? resolveAnnualOffer", "  const creator = true\n    ? resolveAnnualOffer")],
  ['(item 1) /pricing pinta a BF em todo plano', muta(F.pricing, "&& (annualOffer?.kind !== 'black_friday_2026' || bf2026CoversTier(tier)))", ')')],
  ['(item 1) /pricing esquece as 3 h do Creator na BF', muta(F.pricing, '|| (welcomeInBfLive && annualOfferCoversTier(tier) && !bf2026CoversTier(tier))', '|| false')],
  ['(item 1) hook não zera o relógio do Creator', muta(F.hook, 'welcomeInBfTimer = setTimeout(() => { if (alive) setWelcomeInBf(null) }, Math.min(welcomeLeft, SET_TIMEOUT_MAX_MS))', 'welcomeInBfTimer = undefined')],
  ['(item 1) relógio das 3 h na BF volta a "Your 50%"', muta(F.pricing, " what={`Creator ${ANNUAL_WELCOME_DISCOUNT_PERCENT}%`}", '')],
  ['rota volta a dar o relógio solto às 3 h', muta(F.rota, '    bfOpen: bfAnnualOpen,\n    bfEndsAtMs: Date.parse(BF2026_ENDS_AT),', '    bfOpen: bf2026Open(),\n    bfEndsAtMs: Date.parse(BF2026_ENDS_AT),')],
]

let falhas = 0
const b0 = await problemas()
console.log(b0.length ? 'FALHA\n  ' + b0.join('\n  ') : 'PASS Black Friday só no Starter; Creator e Studio no anual normal (dólar e reais); 3 h intactas; cartão = checkout')
if (b0.length) falhas++
for (const [nome, repl] of MUTANTES) {
  const r = await problemas(repl)
  if (r.length === 0) { console.log(`VIVO  mutante "${nome}"`); falhas++ }
  else console.log(`morto mutante "${nome}" ← ${r[0]}`)
}
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1) }
console.log(`\nOK — ${MUTANTES.length} mutantes mortos`)
