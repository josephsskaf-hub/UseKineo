// KINEO-OFERTA-3H-0411 · KINEO-CHECKOUT-FINO-0411 [fundador 04/11: anual normal 30%, primeiras 3 h 50%, quem pega mantém, Black Friday 50% para todos sem cupom; "limpo, sem cupom"]
// Guardião sem rede. Prova: a janela nas bordas, conta paga e convidado de fora, Black Friday aberta para todos e sem cupom, renovação e recarga para cada valor velho e novo
// em dólar e em reais, nenhum plano com o campo de cupom, o desconto de parceiro intacto, a linha única da Stripe, e a barra fina: vem do servidor no 1º desenho ou não existe.
// Cada mutante deixa ao menos uma verificação vermelha.
import fs from 'node:fs'
import path from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { offlineModules, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const raiz = process.cwd()
const lf = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8').replace(/\r\n/g, '\n')
const F = {
  regra: 'lib/billing/annualWelcomeOffer.ts',
  server: 'lib/billing/annualWelcomeBarServer.ts',
  precos: 'lib/checkoutPricing.ts',
  moeda: 'lib/settlementCurrency.ts',
  recarga: 'lib/billing/annualRefill.ts',
  bf: 'lib/billing/blackFriday2026.ts',
  parceiro: 'lib/affiliateDiscount.ts',
  convidado: 'lib/stripe/guestCheckout.ts',
  guia: 'lib/growth/checkoutPaymentGuidance.ts',
  linha: 'lib/growth/checkoutValueContext.ts',
  valor: 'lib/valorNoCheckout.ts',
  rota: 'app/api/stripe/checkout/route.ts',
  api: 'app/api/offers/annual-welcome/route.ts',
  eventos: 'app/api/events/route.ts',
  pricing: 'app/pricing/PricingClient.tsx',
  relogio: 'components/pricing/AnnualOfferCountdown.tsx',
  barra: 'components/AnnualWelcomeBar.tsx',
  shell: 'app/(dashboard)/DashboardShell.tsx',
  layout: 'app/(dashboard)/layout.tsx',
  home: 'app/page.tsx',
  pagina: 'app/black-friday/page.tsx',
  faixa: 'components/BlackFridayBanner.tsx',
  llms: 'app/llms.txt/route.ts',
  gpt: 'docs/GPT-INSTRUCOES-V3-COLAR-2026-09-24.txt',
  estudio: 'app/(dashboard)/generate/GenerateClient.tsx',
}
const SRC = Object.fromEntries(Object.values(F).map((rel) => [rel, lf(rel)]))
const T0 = Date.parse('2026-11-05T12:00:00.000Z')
const CRIADA = new Date(T0).toISOString()
const H = 3_600_000
const BF_FIM = Date.parse('2026-12-02T05:00:00.000Z')
const NA_BF = Date.parse('2026-11-27T15:00:00.000Z')
const TIERS = ['starter', 'basic', 'pro']

function problemas(repl = {}) {
  const p = []
  const checa = (nome, c) => { if (!c) p.push(nome) }
  const src = (rel) => repl[rel] ?? SRC[rel]
  let O, Pr, S, A, B, D, G, V, N
  try {
    const carrega = createOfflineLoader({ source: (rel, t) => repl[rel] ?? t, mocks: { 'next/headers': { cookies: () => ({ get: () => undefined }) } } })
    O = carrega(F.regra); Pr = carrega(F.precos); S = carrega(F.moeda); A = carrega(F.recarga); B = carrega(F.bf); D = carrega(F.parceiro); G = carrega(F.guia); V = carrega(F.linha); N = carrega(F.valor)
  } catch (e) { return ['módulos carregam: ' + String(e?.message)] }

  // 1. a janela
  const abre = (ms, hasPaid = false) => O.annualWelcomeOpen({ accountCreatedAt: CRIADA, hasPaid, nowMs: T0 + ms })
  checa('2:59:59 aberta', abre(3 * H - 1000))
  checa('2:59 aberta', abre(2 * H + 59 * 60_000))
  checa('3:00:00 fechada', !abre(3 * H))
  checa('3:00:01 fechada', !abre(3 * H + 1000))
  checa('conta paga fechada', !abre(H, true))
  checa('has_paid nulo é quem nunca pagou', abre(H, null))
  checa('created_at inválido fecha', !O.annualWelcomeOpen({ accountCreatedAt: 'x', hasPaid: false, nowMs: T0 }) && !O.annualWelcomeOpen({ accountCreatedAt: null, hasPaid: false, nowMs: T0 }))
  checa('created_at no futuro fecha', !O.annualWelcomeOpen({ accountCreatedAt: new Date(T0 + 2 * H).toISOString(), hasPaid: false, nowMs: T0 }))
  checa('o fim é created_at + 3 h, sem reiniciar', O.annualWelcomeEndsAtMs(CRIADA) === T0 + 3 * H)
  const base = { tier: 'basic', isAnnual: true, signedIn: true, accountCreatedAt: CRIADA, hasPaid: false, bfOpen: false, bfEndsAtMs: BF_FIM, nowMs: T0 + H }
  checa('logado na janela: welcome_3h', O.resolveAnnualOffer(base)?.kind === 'welcome_3h' && O.resolveAnnualOffer(base)?.endsAtMs === T0 + 3 * H)
  checa('convidado fechado', O.resolveAnnualOffer({ ...base, signedIn: false }) === null)
  checa('pago fechado', O.resolveAnnualOffer({ ...base, hasPaid: true }) === null)
  checa('mensal nunca', O.resolveAnnualOffer({ ...base, isAnnual: false }) === null && O.resolveAnnualOffer({ ...base, isAnnual: false, bfOpen: true }) === null)
  for (const tier of ['business', 'autopilot', 'autopilot_lite']) checa(`${tier} fica fora`, O.resolveAnnualOffer({ ...base, tier }) === null && O.resolveAnnualOffer({ ...base, tier, bfOpen: true }) === null)
  checa('link privado fica fora', O.resolveAnnualOffer({ ...base, privatePromo: true }) === null)
  for (const t of TIERS) checa(`${t} entra`, O.resolveAnnualOffer({ ...base, tier: t })?.kind === 'welcome_3h')

  // 2. Black Friday aberta para todos, sem cupom
  checa('BF aberta: convidado entra', O.resolveAnnualOffer({ ...base, signedIn: false, bfOpen: true })?.kind === 'black_friday_2026')
  checa('BF aberta: conta velha e já paga entram', O.resolveAnnualOffer({ ...base, accountCreatedAt: '2020-01-01T00:00:00Z', hasPaid: true, bfOpen: true })?.kind === 'black_friday_2026')
  checa('portão da BF: anual dentro, mensal e fora da janela não', B.bf2026CheckoutEligible({ tier: 'pro', isAnnual: true, nowMs: NA_BF }) && !B.bf2026CheckoutEligible({ tier: 'pro', isAnnual: false, nowMs: NA_BF }) && !B.bf2026CheckoutEligible({ tier: 'pro', isAnnual: true, nowMs: T0 }))
  checa('BF no preço de boas-vindas', B.bf2026PriceRows().every((r) => r.bfMinor === Pr.ANNUAL_WELCOME_PRICES[r.tier].usd && r.annualMinor === Pr.ANNUAL_PRICES[r.tier].usd && r.savedMinor + r.bfMinor === Pr.TIER_PRICES[r.tier].usd * 12))
  checa('BF lê o percentual da tabela', B.BF2026_PERCENT_OFF === Pr.ANNUAL_WELCOME_DISCOUNT_PERCENT)
  checa('link da BF sem ?promo=', !B.bf2026CheckoutHref('basic').includes('promo='))
  const rota = src(F.rota), biblio = src(F.bf)
  checa('cupom da BF morto na rota', !/BF2026_COUPON|KINEO_BF2026|bf2026Applied|bf2026PriceMinor/.test(rota))
  checa('cupom da BF morto no módulo', !/COUPON|percent_off|bf2026DiscountMinor/.test(biblio.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')))
  checa('?promo=BF2026 sai antes da régua do convidado', rota.indexOf('if (isBf2026PromoCode(promo)) promo = undefined') > 0 && rota.indexOf('if (isBf2026PromoCode(promo)) promo = undefined') < rota.indexOf("const rawPromo = (promo ?? '').trim()"))
  checa('convidado da BF não volta ao cadastro', !rota.includes('bf2026GuestNeedsAccount') && rota.includes('annualOfferMetadata: bfAnnualOpen ? bfAnnualStamp : null'))
  const pagina = src(F.pagina) + src(F.faixa)
  checa('copy da BF sem cupom nem "first year"', !/first year|first annual payment|40%/.test(pagina.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')))
  const corpo = B.bf2026EmailBody('bf', B.bf2026PriceRows(), { text: '', html: '' })
  checa('carta da BF diz que renova no mesmo preço', corpo.text.includes('renews at the same price') && !corpo.text.includes('regular annual price'))

  // 3. os preços
  const usd = (t, tab) => tab[t].usd
  checa('anual normal 76 / 160 / 496', usd('starter', Pr.ANNUAL_PRICES) === 7600 && usd('basic', Pr.ANNUAL_PRICES) === 16000 && usd('pro', Pr.ANNUAL_PRICES) === 49600 && Pr.ANNUAL_DISCOUNT_PERCENT === 30)
  checa('boas-vindas 54 / 114 / 354', usd('starter', Pr.ANNUAL_WELCOME_PRICES) === 5400 && usd('basic', Pr.ANNUAL_WELCOME_PRICES) === 11400 && usd('pro', Pr.ANNUAL_WELCOME_PRICES) === 35400 && Pr.ANNUAL_WELCOME_DISCOUNT_PERCENT === 50)
  checa('mensal não mudou', Pr.TIER_PRICES.starter.usd === 900 && Pr.TIER_PRICES.basic.usd === 1900 && Pr.TIER_PRICES.pro.usd === 5900)
  const brl = { starter: [37790, 26990], basic: [79790, 56990], pro: [247790, 176990] }
  for (const t of TIERS) {
    checa(`${t}: reais normais`, S.BRL_PLAN_PRICES_MINOR[t].annual === brl[t][0] && Pr.ANNUAL_BRL_CURRENT_MINOR[t] === brl[t][0])
    checa(`${t}: reais boas-vindas`, S.BRL_ANNUAL_WELCOME_MINOR[t] === brl[t][1] && Pr.ANNUAL_WELCOME_BRL_MINOR[t] === brl[t][1])
    checa(`${t}: cobrança em reais segue a tabela escolhida`, S.planSettlementAmountMinor(t, 'annual', 'brl', 1, 'welcome') === brl[t][1] && S.planSettlementAmountMinor(t, 'annual', 'brl', 1) === brl[t][0])
    checa(`${t}: em dólar cobra o valor passado`, S.planSettlementAmountMinor(t, 'annual', 'usd', Pr.ANNUAL_WELCOME_PRICES[t].usd, 'welcome') === Pr.ANNUAL_WELCOME_PRICES[t].usd)
    checa(`${t}: 'welcome' não mexe no mensal`, S.planSettlementAmountMinor(t, 'monthly', 'brl', 1, 'welcome') === S.BRL_PLAN_PRICES_MINOR[t].monthly)
  }
  checa('invariantes', Pr.checkPricingInvariants().length === 0 && S.checkSettlementInvariants({ starter: 900, basic: 1900, pro: 5900 }).length === 0)

  // 4. renovação e recarga para cada valor velho e novo
  const novo = { starter: 40, basic: 85, pro: 280 }
  for (const t of TIERS) {
    for (const v of [Pr.TIER_PRICES[t].usd, Pr.ANNUAL_PRICES[t].usd, Pr.ANNUAL_WELCOME_PRICES[t].usd]) {
      checa(`renovação USD ${t} ${v}`, Pr.renewalCreditsFor(t, v) === novo[t])
      checa(`fatura USD ${t} ${v}`, S.renewalCreditsForInvoice(t, v, 'usd') === novo[t])
    }
    for (const v of [S.BRL_PLAN_PRICES_MINOR[t].monthly, brl[t][0], brl[t][1]]) checa(`fatura BRL ${t} ${v}`, S.renewalCreditsForInvoice(t, v, 'brl') === novo[t])
    for (const v of [Pr.ANNUAL_PRICES[t].usd, Pr.ANNUAL_WELCOME_PRICES[t].usd]) checa(`recarga USD ${t} ${v}`, A.annualRefillCredits(t, v, 'usd') === novo[t])
    for (const v of brl[t]) checa(`recarga BRL ${t} ${v}`, A.annualRefillCredits(t, v, 'brl') === novo[t])
  }
  // legado: mensal e anual antigos, em dólar e em reais (quem comprou mais crédito nunca perde)
  const velhoUsd = [['starter', 990, 60], ['starter', 1290, 60], ['basic', 1990, 150], ['basic', 2990, 150], ['pro', 3990, 300], ['pro', 5490, 300], ['pro', 2900, 180], ['starter', 8300, 60], ['basic', 16700, 150], ['pro', 46000, 300]]
  for (const [t, v, c] of velhoUsd) checa(`legado USD ${t} ${v}`, Pr.renewalCreditsFor(t, v) === c && S.renewalCreditsForInvoice(t, v, 'usd') === c)
  const anualVelhoUsd = [['starter', 8300, 60], ['basic', 16700, 150], ['pro', 46000, 300], ['starter', 9290, 60], ['basic', 21500, 150], ['pro', 39500, 300], ['starter', 12900, 60], ['basic', 25000, 150], ['pro', 54900, 300], ['pro', 29000, 180]]
  for (const [t, v, c] of anualVelhoUsd) checa(`recarga legado USD ${t} ${v}`, A.annualRefillCredits(t, v, 'usd') === c)
  const velhoBrl = [['starter', 4990, 60], ['basic', 9990, 150], ['pro', 27490, 300], ['starter', 41990, 60], ['basic', 83990, 150], ['pro', 230990, 300]]
  for (const [t, v, c] of velhoBrl) checa(`legado BRL ${t} ${v}`, S.renewalCreditsForInvoice(t, v, 'brl') === c)
  for (const [t, v, c] of [['starter', 41990, 60], ['basic', 83990, 150], ['pro', 230990, 300]]) checa(`recarga legado BRL ${t} ${v}`, A.annualRefillCredits(t, v, 'brl') === c)

  // 5. a rota: quem decide é o servidor, e o preço chega à Stripe
  checa('a janela vem da conta verificada', /accountCreatedAt: user\.created_at/.test(rota) && /hasPaid: \(profile as \{ has_paid\?: boolean \| null \}\)\.has_paid/.test(rota))
  checa('nada de relógio vindo do pedido', !/searchParams\.get\('(ends|window|created|welcome|offer)/.test(rota))
  checa('preço inline: unitAmount = boas-vindas', /if \(annualOffer && \(tier === 'starter' \|\| tier === 'basic' \|\| tier === 'pro'\)\) unitAmount = ANNUAL_WELCOME_PRICES\[tier\]\.usd/.test(rota))
  checa('reais pela tabela da oferta', rota.includes("chargeCurrency, unitAmount, annualOffer ? 'welcome' : 'regular')"))
  checa('o preço é decidido antes de a sessão nascer', rota.indexOf('const annualOffer = resolveAnnualOffer({') < rota.indexOf('const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = autopilotPriceId'))
  checa('BF entra para o convidado', rota.includes("if (bfAnnualOpen && (tier === 'starter' || tier === 'basic' || tier === 'pro')) unitAmount = ANNUAL_WELCOME_PRICES[tier].usd"))
  const blocoOferta = rota.slice(rota.indexOf('  if (annualOffer) {\n    resolvedPromo = null'))
  checa('com oferta nenhum ?promo= entra (nunca empilha)', /^ {2}if \(annualOffer\) \{\n {4}resolvedPromo = null\n {4}promoBlocked = true/.test(blocoOferta) && rota.includes('if (!discountApplied && requestedPromo && !promoBlocked)'))
  checa('carimbo na sessão e na assinatura', blocoOferta.includes('Object.assign(sessionParams.metadata!, annualOfferStamp)') && blocoOferta.includes('Object.assign(sessionParams.subscription_data!.metadata!, annualOfferStamp)'))
  checa('sem recuperação com oferta', rota.includes('const annualRecovery = annualOfferSessionRecovery(annualOffer !== null)') && rota.includes('if (annualRecovery) sessionParams.after_expiration = annualRecovery'))
  checa('regra da recuperação', JSON.stringify(O.annualOfferSessionRecovery(true)) === '{"recovery":{"enabled":false}}' && O.annualOfferSessionRecovery(false) === null)
  checa('evento só depois da sessão', rota.indexOf('annualOffer.kind === \'black_friday_2026\' ? BF2026_EVENTS.checkoutStarted : ANNUAL_WELCOME_APPLIED_EVENT') > rota.indexOf("    'checkout_started',\n    user.id,"))
  checa('evento com nome pedido e servidor-apenas', O.ANNUAL_WELCOME_APPLIED_EVENT === 'annual_welcome_offer_applied' && src(F.eventos).includes("'annual_welcome_offer_applied',") && /name === 'annual_welcome_offer_applied'/.test(rota))
  const api = src(F.api)
  checa('a rota da oferta é privada e lê a conta', api.includes("'Cache-Control': 'private, no-store'") && api.includes('accountCreatedAt = user.created_at') && api.includes('resolveAnnualOffer({'))
  checa('leitura que falha fecha', api.includes('let hasPaid: boolean | null = true') && api.includes('if (!error && data) hasPaid'))

  // 6. KINEO-CUPOM-FICA-0411: o campo de cupom só no Creator/Studio mensal; desconto do servidor intacto
  for (const t of ['starter', 'basic', 'pro', 'business', 'autopilot', 'autopilot_lite']) for (const an of [true, false]) checa(`campo manual ${t} ${an}`, D.subscriptionAcceptsManualPromotions(t, an) === (!an && (t === 'basic' || t === 'pro')))
  checa('interruptores ligados nos dois lados', D.MANUAL_PROMO_FIELD_LIVE === true && /GUEST_MANUAL_PROMO_FIELD_LIVE = true/.test(src(F.convidado)))
  checa('convidado: espelho fecha o campo e a recuperação', /return GUEST_MANUAL_PROMO_FIELD_LIVE && /.test(src(F.convidado)) && /if \(!guestSubscriptionAcceptsManualPromotions\(input\.tier, isAnnual\)\) \{\n\s+delete params\.allow_promotion_codes\n\s+params\.after_expiration = \{ recovery: \{ enabled: true, allow_promotion_codes: false \} \}/.test(src(F.convidado)))
  checa('logado: o campo passa pelo interruptor', /if \(!discountApplied && subscriptionAcceptsManualPromotions\(tier, isAnnual\)\) \{\n\s+sessionParams\.allow_promotion_codes = true/.test(rota) && /allow_promotion_codes: !discountApplied && subscriptionAcceptsManualPromotions\(tier, isAnnual\)/.test(rota))
  checa('sessão recuperada do convidado sem campo', /recovery: \{ enabled: true, allow_promotion_codes: welcome === null \}/.test(src(F.convidado)))
  checa('parceiro: 50% segue elegível no Creator/Studio mensal', D.affiliateDiscountEligible({ tier: 'basic', isAnnual: false, affiliatePresent: true, discountApplied: false }) && D.affiliateDiscountEligible({ tier: 'pro', isAnnual: false, affiliatePresent: true, discountApplied: false }))
  checa('parceiro: nunca no anual', !D.affiliateDiscountEligible({ tier: 'basic', isAnnual: true, affiliatePresent: true, discountApplied: false }))
  checa('parceiro: logado aplica por discounts', /const coupon = await ensureAffiliateBaseCoupon\(\)\n\s+if \(coupon && affiliateOffer\) \{\n\s+sessionParams\.discounts = \[\{ coupon \}\]/.test(rota))
  checa('parceiro: convidado aplica por discounts', /if \(coupon\) \{\n\s+params\.discounts = \[\{ coupon \}\]/.test(rota))
  checa('?promo= já emitido segue aplicando', rota.includes('sessionParams.discounts = [{ promotion_code: pc.id }]'))

  // 7. a linha da Stripe
  checa('linha mensal', V.checkoutPlanLine(85, 'monthly') === '85 credits a month · Cancel anytime')
  checa('linha anual', V.checkoutPlanLine(85, 'annual') === '85 credits a month · Billed yearly · Cancel anytime')
  const ctxM = V.buildCheckoutValueContext({ billing: 'monthly', credits: 85, intentCampaign: undefined, tier: 'basic' })
  checa('o contexto usa a linha', ctxM.lineItemDescription === V.checkoutPlanLine(85, 'monthly') && ctxM.outputCount === Math.floor(85 / 35))
  checa('anual usa a linha', N.annualLineItemDescription({ billing: 'annual', tier: 'basic', credits: 85, kling4Paid: false }) === V.checkoutPlanLine(85, 'annual'))
  checa('frase falsa fora da descrição', G.withCheckoutPaymentGuidance('85 credits a month · Cancel anytime') === '85 credits a month · Cancel anytime' && !/Charged in/.test(src(F.guia).replace(/\/\*[\s\S]*?\*\//g, '')))
  checa('descrição vazia não mata a compra', G.withCheckoutPaymentGuidance('   ') === 'Cancel anytime')
  const ctxA = V.buildCheckoutValueContext({ billing: 'annual', credits: 85, intentCampaign: undefined, tier: 'basic' })
  checa('termos do mensal', ctxM.submitMessage.startsWith('Renews monthly at the price shown. Cancel anytime from Account. 7-day money-back guarantee.') && !/Credits are added/.test(ctxM.submitMessage))
  checa('termos do anual', ctxA.submitMessage.startsWith('Renews yearly at the price shown. Cancel anytime from Account.') && ctxA.submitMessage.includes(Pr.ANNUAL_REFUND_POLICY) && !/7-day/.test(ctxA.submitMessage))
  checa('sem branding_settings (a API fixada não tem)', !/branding_settings/.test(rota) && !/branding_settings/.test(src(F.convidado)))

  // 8. /pricing
  const pr = src(F.pricing), rl = src(F.relogio)
  checa('chip "Up to 50%"', pr.includes('Up to {ANNUAL_WELCOME_DISCOUNT_PERCENT}%') && !/SAVE \{ANNUAL_DISCOUNT_PERCENT\}%/.test(pr))
  checa('cartão no preço da oferta, normal riscado', pr.includes('annualOfferLive ? ANNUAL_WELCOME_PRICES[tier][resolvedCurrency] : getAnnualPrice(tier, resolvedCurrency, resolvedRegion)') && pr.includes('annual && annualOfferLive ? formatCheckoutMoney(resolvedCurrency, getAnnualPrice(tier, resolvedCurrency, resolvedRegion) / 12) : p.price'))
  checa('quem assina vê o anual normal', pr.includes('annualOffer !== null && !planSwitch.subscribed'))
  checa('reais do cartão na tabela da oferta', pr.includes("getTierPrice(tier, 'usd'), annualOfferLive ? 'welcome' : 'regular')"))
  checa('linha discreta só nas 3 h, só no anual', pr.includes("billing === 'annual' && annualOfferLive && annualOffer?.kind === 'welcome_3h' ? <AnnualOfferCountdown"))
  checa('relógio vem do servidor', rl.includes('j.endsAtMs - j.nowMs') && rl.includes('ANNUAL_WELCOME_API') && !/localStorage|sessionStorage|ANNUAL_WELCOME_WINDOW_MS/.test(rl))
  checa('relógio some ao zerar', rl.includes('if (msLeft <= 0) return null') && rl.includes('if (alive) setOffer(null)'))
  checa('formato do relógio', O.annualOfferClock(2 * H + 41 * 60_000 + 7000) === '2:41:07' && O.annualOfferClock(-5) === '0:00:00')

  // 9. a barra
  const b = src(F.barra), sv = src(F.server)
  const est = { signedIn: true, accountCreatedAt: CRIADA, hasPaid: false, profileRead: true, bfOpen: false, dismissed: false, nowMs: T0 + H }
  checa('barra: logado, sem pagar, na janela', JSON.stringify(O.annualWelcomeBarState(est)) === JSON.stringify({ endsAtMs: T0 + 3 * H, serverNowMs: T0 + H }))
  checa('barra: convidado não', O.annualWelcomeBarState({ ...est, signedIn: false }) === null)
  checa('barra: pago não', O.annualWelcomeBarState({ ...est, hasPaid: true }) === null)
  checa('barra: janela vencida não', O.annualWelcomeBarState({ ...est, nowMs: T0 + 3 * H }) === null && O.annualWelcomeBarState({ ...est, nowMs: T0 + 3 * H - 1000 }) !== null)
  checa('barra: leitura que falhou não', O.annualWelcomeBarState({ ...est, profileRead: false }) === null)
  checa('barra: dispensada não', O.annualWelcomeBarState({ ...est, dismissed: true }) === null)
  checa('barra: na Black Friday não', O.annualWelcomeBarState({ ...est, bfOpen: true }) === null)
  checa('barra: cala no /pricing', O.annualWelcomeBarHidden('/pricing') && !O.annualWelcomeBarHidden('/studio') && !O.annualWelcomeBarHidden('/'))
  checa('barra: link no anual', O.ANNUAL_WELCOME_BAR_HREF.startsWith('/pricing?billing=annual'))
  checa('barra: eventos', O.ANNUAL_WELCOME_BAR_SHOWN_EVENT === 'annual_welcome_bar_shown' && O.ANNUAL_WELCOME_BAR_CLICKED_EVENT === 'annual_welcome_bar_clicked' && /sessionStorage\.getItem\(SHOWN_KEY\)/.test(b) && b.includes('trackEvent(ANNUAL_WELCOME_BAR_CLICKED_EVENT'))
  checa('barra: sem preço na tela', !/\$\s?\d|\$\{|ANNUAL_WELCOME_PRICES|formatCheckoutMoney/.test(b.split('\n').filter((l) => /Your \{|aria-label/.test(l)).join('\n')) && !/ANNUAL_WELCOME_PRICES|formatCheckoutMoney/.test(b))
  checa('barra: falha de leitura some', b.includes(".catch(() => { if (alive) setGone(true) })") && /j\.offer !== 'welcome_3h'[^\n]*setGone\(true\)/.test(b))
  checa('barra: lê de novo (pagamento) a cada minuto, ao trocar de página e ao voltar à aba', b.includes('setInterval(read, REREAD_MS)') && b.includes("addEventListener('visibilitychange', onVisible)") && b.includes('[pathname, gone]'))
  checa('barra: dispensa por cookie de sessão, sem validade', b.includes('document.cookie = `${ANNUAL_WELCOME_BAR_DISMISS_COOKIE}=1; path=/; SameSite=Lax`') && !/max-age|expires/i.test(b))
  checa('barra: montada no shell e na home, fora do Studio', src(F.shell).includes('<AnnualWelcomeBar initial={annualWelcomeBar} placement="app" />') && src(F.home).includes('<AnnualWelcomeBar initial={annualWelcomeBar} placement="home" />') && !src(F.estudio).includes('AnnualWelcomeBar'))
  checa('barra: acima do TopBar', src(F.shell).indexOf('<AnnualWelcomeBar') < src(F.shell).indexOf('<TopBar'))
  // sem pulo de tela: o servidor entrega a barra; a falta dela é definitiva
  checa('sem pulo: o layout lê no servidor', src(F.layout).includes('annualWelcomeBar={await readAnnualWelcomeBar(supabase, user)') && src(F.home).includes('await readAnnualWelcomeBar(supabase, user)'))
  checa('sem pulo: conta velha nem consulta', sv.indexOf('annualWelcomeOpen({') < sv.indexOf(".from('profiles')"))
  checa('sem pulo: Black Friday e dispensa decidem no servidor', sv.includes('bfOpen: bf2026Open(nowMs)') && sv.includes('cookies().get(ANNUAL_WELCOME_BAR_DISMISS_COOKIE)'))
  checa('sem pulo: sem initial não há barra nem fetch', /if \(!initial\) return null\n\s+return <Bar initial=\{initial\}/.test(b))
  checa('sem pulo: altura fixa, em fluxo, numa linha', b.includes('h-[30px]') && b.includes('whitespace-nowrap') && b.includes('flex-shrink-0') && !/\bfixed\b|\bsticky\b/.test(b.slice(b.indexOf('data-kineo='))))
  checa('sem pulo: 1º número igual no HTML e na hidratação', b.includes('const firstMsLeft = initial.endsAtMs - initial.serverNowMs') && b.includes('useState(firstMsLeft)'))
  try {
    const load = offlineModules({
      replacements: { ...repl, [F.barra]: src(F.barra).replace("import { usePathname } from 'next/navigation'", "const usePathname = () => '/studio'") },
      mocks: { 'lib/analytics.ts': { trackEvent: async () => {} } },
    })
    const modulo = load(F.barra)
    const inicial = { endsAtMs: T0 + 3 * H, serverNowMs: T0 + 19 * 60_000 + 53_000 }
    const html = renderToStaticMarkup(React.createElement(modulo.default, { initial: inicial, placement: 'app' })).replace(/<!-- -->/g, '')
    checa('render: a barra já está no 1º desenho, com o tempo do servidor', html.includes('data-kineo="annual-welcome-bar"') && html.includes('Your 50% annual offer ends in 2:40:07'))
    checa('render: link no anual', html.includes('href="/pricing?billing=annual&amp;from=welcome_bar"'))
    checa('render: sem cifrão', !/\$|R\$/.test(html))
    checa('render: sem initial, nada', renderToStaticMarkup(React.createElement(modulo.default, { initial: null, placement: 'home' })) === '')
  } catch (e) { p.push('render: ' + String(e?.message)) }

  // 10. copy
  checa('llms: linha datada lendo as tabelas, história mantida', src(F.llms).includes('- 2026-11-04 (later the same day): the regular annual discount became ${ANNUAL_DISCOUNT_PERCENT_FACT}%') && src(F.llms).includes('Annual plans are 50% off 12 monthly payments ($54 / $114 / $354 a year)'))
  checa('GPT: anual novo', src(F.gpt).includes('Yearly: 30% off ($76 / $160 / $496)') && !src(F.gpt).includes('$83 / $167 / $460'))
  const O2 = createOfflineLoader({ source: (rel, t) => repl[rel] ?? t })('lib/billing/month2AnnualOffer.ts')
  checa('2º mês diz 30', O2.month2SavedPercent(900, Pr.ANNUAL_PRICES.starter.usd) === 30 && O2.month2SavedPercent(1900, Pr.ANNUAL_PRICES.basic.usd) === 30 && O2.month2SavedPercent(5900, Pr.ANNUAL_PRICES.pro.usd) === 30)
  return p
}

let falhas = 0
const b0 = problemas()
console.log(b0.length ? 'FALHA\n  ' + b0.join('\n  ') : 'PASS oferta de 3 h, Black Friday, renovação, checkout fino e barra')
if (b0.length) falhas++

const muta = (rel, de, para) => {
  const s = SRC[rel]
  if (!s.includes(de)) throw new Error(`mutante sem âncora em ${rel}: ${de.slice(0, 70)}`)
  return { [rel]: s.replace(de, para) }
}
const MUTANTES = [
  ['janela de 4 h', muta(F.regra, 'ANNUAL_WELCOME_WINDOW_MS = 3 * 60 * 60 * 1000', 'ANNUAL_WELCOME_WINDOW_MS = 4 * 60 * 60 * 1000')],
  ['3:00:00 ainda aberta', muta(F.regra, 'input.nowMs >= fim', 'input.nowMs > fim')],
  ['conta paga entra', muta(F.regra, 'if (input.hasPaid === true || !Number.isFinite(input.nowMs)) return false', 'if (!Number.isFinite(input.nowMs)) return false')],
  ['convidado entra', muta(F.regra, "if (input.signedIn !== true) return null\n", '\n')],
  ['Black Friday só para logado', muta(F.regra, "if (input.bfOpen === true) return { kind: 'black_friday_2026'", "if (input.bfOpen === true && input.signedIn) return { kind: 'black_friday_2026'")],
  ['mensal ganha a oferta', muta(F.regra, 'input.isAnnual !== true || ', '')],
  ['Business ganha a oferta', muta(F.regra, "['starter', 'basic', 'pro']", "['starter', 'basic', 'pro', 'business']")],
  ['cupom da BF volta', muta(F.rota, '  const annualRecovery = annualOfferSessionRecovery', "  if (annualOffer?.kind === 'black_friday_2026') sessionParams.discounts = [{ coupon: 'KINEO_BF2026' }]\n  const annualRecovery = annualOfferSessionRecovery")],
  ['?promo= empilha na oferta', muta(F.rota, '    resolvedPromo = null\n    promoBlocked = true\n    const annualOfferStamp', '    const annualOfferStamp')],
  ['recuperação leva a oferta', muta(F.rota, 'if (annualRecovery) sessionParams.after_expiration = annualRecovery', '')],
  ['preço de boas-vindas não chega à Stripe', muta(F.rota, "if (annualOffer && (tier === 'starter' || tier === 'basic' || tier === 'pro')) unitAmount = ANNUAL_WELCOME_PRICES[tier].usd", '')],
  ['reais no anual normal com a oferta', muta(F.rota, "chargeCurrency, unitAmount, annualOffer ? 'welcome' : 'regular')", 'chargeCurrency, unitAmount)')],
  ['janela confiando no pedido', muta(F.rota, 'accountCreatedAt: user.created_at', "accountCreatedAt: req.nextUrl.searchParams.get('created')")],
  ['BF2026 velho manda ao cadastro', muta(F.rota, 'if (isBf2026PromoCode(promo)) promo = undefined', '')],
  ['anual normal não muda', muta(F.precos, 'starter: { usd: 7600 }', 'starter: { usd: 5400 }')],
  ['desconto anunciado 50 no normal', muta(F.precos, 'ANNUAL_DISCOUNT_PERCENT = 30', 'ANNUAL_DISCOUNT_PERCENT = 50')],
  ['reais do normal errados', muta(F.moeda, 'pro: { monthly: 29490, annual: 247790 }', 'pro: { monthly: 29490, annual: 176990 }')],
  ['reais de boas-vindas errados', muta(F.moeda, 'pro: 176990 }\nexport const BRL_ANNUAL_WELCOME_PAID_FRACTION', 'pro: 176900 }\nexport const BRL_ANNUAL_WELCOME_PAID_FRACTION')],
  ['renovação USD trata boas-vindas como legado', muta(F.precos, ' && amountPaidMinor !== ANNUAL_WELCOME_PRICES[tier].usd', '')],
  ['renovação BRL trata boas-vindas como legado', muta(F.moeda, ' || amountPaidMinor === BRL_ANNUAL_WELCOME_MINOR[tier])', ')')],
  ['recarga USD trata boas-vindas como legado', muta(F.recarga, "cur === 'usd' && annualAmountMinor !== ANNUAL_WELCOME_PRICES[tier].usd && ", "cur === 'usd' && ")],
  ['recarga BRL trata boas-vindas como legado', muta(F.recarga, "cur === 'brl' && annualAmountMinor !== ANNUAL_WELCOME_BRL_MINOR[tier] && ", "cur === 'brl' && ")],
  ['campo de cupom some', muta(F.parceiro, 'MANUAL_PROMO_FIELD_LIVE = true', 'MANUAL_PROMO_FIELD_LIVE = false')],
  ['campo de cupom some no convidado', muta(F.convidado, 'GUEST_MANUAL_PROMO_FIELD_LIVE = true', 'GUEST_MANUAL_PROMO_FIELD_LIVE = false')],
  ['parceiro perde o desconto logado', muta(F.rota, 'if (coupon && affiliateOffer) {\n      sessionParams.discounts = [{ coupon }]', 'if (coupon && affiliateOffer) {\n      void coupon')],
  ['parceiro perde o desconto convidado', muta(F.rota, 'if (coupon) {\n      params.discounts = [{ coupon }]', 'if (coupon) {\n      void coupon')],
  ['parceiro inelegível', muta(F.parceiro, "return input.affiliatePresent &&", "return false && input.affiliatePresent &&")],
  ['frase do dólar volta', muta(F.guia, "return description.trim() || CHECKOUT_LINE_ITEM_FALLBACK", "return `${description.trim()} · Charged in USD worldwide.`")],
  ['linha longa volta', muta(F.linha, '`${credits} credits a month · Cancel anytime`', '`${credits} credits / month — up to 2 Seedance films`')],
  ['anual volta a "billed yearly, credits arrive monthly"', muta(F.valor, "checkoutPlanLine(input.credits, 'annual')", '`${monthly.lineItemDescription} · billed yearly, credits arrive monthly`')],
  ['termo de reembolso some do anual', muta(F.linha, 'Cancel anytime from Account. ${CHECKOUT_ANNUAL_REFUND_SENTENCE}`', 'Cancel anytime from Account.`')],
  ['chip volta', muta(F.pricing, 'Up to {ANNUAL_WELCOME_DISCOUNT_PERCENT}%', 'SAVE {ANNUAL_DISCOUNT_PERCENT}%')],
  ['relógio inventado no /pricing', muta(F.relogio, 'const msLeft = j.endsAtMs - j.nowMs', 'const msLeft = 3 * 3600000')],
  ['assinante vê a oferta', muta(F.pricing, 'annualOffer !== null && !planSwitch.subscribed', 'annualOffer !== null')],
  ['barra na Black Friday', muta(F.regra, 'input.profileRead !== true || input.bfOpen === true || input.dismissed', 'input.profileRead !== true || input.dismissed')],
  ['barra para convidado', muta(F.regra, 'if (input.signedIn !== true || input.profileRead', 'if (input.profileRead')],
  ['barra sem leitura confirmada', muta(F.regra, 'input.profileRead !== true || ', '')],
  ['barra dispensada volta', muta(F.regra, ' || input.dismissed === true', '')],
  ['barra com o /pricing junto', muta(F.regra, "return pathname === '/pricing' || pathname.startsWith('/pricing/')", 'return false')],
  ['barra aparece depois do 1º desenho', muta(F.barra, 'if (!initial) return null\n', "if (!initial) initial = { endsAtMs: 1, serverNowMs: 0 }\n")],
  ['barra sem altura fixa', muta(F.barra, 'flex h-[30px] w-full', 'flex w-full')],
  ['barra por cima da tela', muta(F.barra, 'className="relative z-40', 'className="fixed top-0 z-40')],
  ['barra não some com falha', muta(F.barra, '.catch(() => { if (alive) setGone(true) })', '.catch(() => undefined)')],
  ['barra não reconfere (pagou e segue lá)', muta(F.barra, 'const id = setInterval(read, REREAD_MS)', 'const id = setInterval(() => undefined, REREAD_MS)')],
  ['barra com preço', muta(F.barra, 'annual offer ends in {annualOfferClock(msLeft)} →', 'annual offer ($54) ends in {annualOfferClock(msLeft)} →')],
  ['barra sem evento de clique', muta(F.barra, 'trackEvent(ANNUAL_WELCOME_BAR_CLICKED_EVENT', 'void (ANNUAL_WELCOME_BAR_CLICKED_EVENT')],
  ['barra conta a cada render', muta(F.barra, "window.sessionStorage.getItem(SHOWN_KEY) === '1'", 'false')],
  ['layout sem a barra do servidor', muta(F.layout, 'annualWelcomeBar={await readAnnualWelcomeBar(supabase, user)', 'annualWelcomeBar={null /* readAnnualWelcomeBar */')],
  ['barra no Studio', muta(F.estudio, "'use client'", "'use client'\n// AnnualWelcomeBar")],
  ['carta da BF promete preço regular no ano 2', muta(F.bf, 'It renews at the same price each year', 'The second year renews at the regular annual price')],
  ['llms sem a linha datada', muta(F.llms, '- 2026-11-04 (later the same day):', '- 2026-11-04 again:')],
]
for (const [nome, repl] of MUTANTES) {
  const r = problemas(repl)
  console.log(`${r.length ? 'PASS' : 'FALHA'} mutante "${nome}" ${r.length ? 'pego — ' + r[0].slice(0, 80) : 'NÃO pego'}`)
  if (!r.length) falhas++
}
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1) }
console.log(`\nOK — ${MUTANTES.length} mutantes pegos`)
