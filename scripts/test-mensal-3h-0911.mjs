// KINEO-MENSAL-3H-0911 [fundador 09/11: "vai para 30% nas 3 primeiras horas. É isso daí."] — guardião sem rede dos 30% no 1º mês do mensal.
// Prova: (1) a elegibilidade nas bordas (3 h exatas, já pagou, já usou, parceiro, outro desconto, anual, Business), o relógio que não reinicia;
// (2) o preço mostrado, em dólar e em reais, igual ao que a Stripe cobra com o cupom; (3) o CRÉDITO: a lógica REAL do webhook (extraída do arquivo)
// recebe a sessão de um 1º mês com 30% nos três planos, em USD e em BRL, e concede o grant cheio; a 2ª fatura, cheia, também; (4) a rota decide no
// servidor, depois do parceiro, sem empilhar, com carimbo, sem recuperação e com o prazo da página; (5) o cupom nasce pelo código, idempotente;
// (6) /pricing, caixa de presente e a rota da oferta. Cada mutante deixa ao menos uma verificação vermelha.
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import vm from 'node:vm'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const raiz = process.cwd()
const lf = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8').replace(/\r\n/g, '\n')
const F = {
  regra: 'lib/billing/monthlyFirstMonthOffer.ts',
  relogio: 'lib/billing/annualWelcomeOffer.ts',
  cupom: 'lib/billing/monthlyFirstMonthCoupon.ts',
  precos: 'lib/checkoutPricing.ts',
  moeda: 'lib/settlementCurrency.ts',
  rota: 'app/api/stripe/checkout/route.ts',
  webhook: 'app/api/stripe/webhook/route.ts',
  api: 'app/api/offers/annual-welcome/route.ts',
  hook: 'components/pricing/AnnualOfferCountdown.tsx',
  pricing: 'app/pricing/PricingClient.tsx',
  caixa: 'lib/ui/caixaPresente0511.ts',
  parceiro: 'lib/affiliateDiscount.ts',
}
const SRC = Object.fromEntries(Object.values(F).map((rel) => [rel, lf(rel)]))
const H = 3_600_000
const T0 = Date.parse('2026-11-09T15:00:00.000Z')
const CRIADA = new Date(T0).toISOString()
const TIERS = ['starter', 'basic', 'pro']

// A lógica REAL do grant do 1º pagamento: o trecho do webhook (checkout.session.completed, assinatura) do `const userId` até `const creditsToGrant`,
// e o helper firstPaymentCreditsFromSession, executados com as constantes de verdade. Nada reescrito à mão.
function webhookGrant(src, mods) {
  const ini = src.indexOf('        const userId = session.metadata?.supabase_user_id\n        const customerId = typeof session.customer')
  const fimMarca = '        const creditsToGrant = isCardTrial ? CARD_TRIAL_GRANT_CREDITS : isTrial ? TRIAL_GRANT_CREDITS : firstMonthCredits\n'
  const fim = src.indexOf(fimMarca, ini)
  const hIni = src.indexOf('function firstPaymentCreditsFromSession(')
  const hFim = src.indexOf('\n}\n', hIni)
  if (ini < 0 || fim < 0 || hIni < 0 || hFim < 0) throw new Error('trecho do grant não encontrado no webhook')
  const corpo = src.slice(ini, fim + fimMarca.length)
  const codigo = `${src.slice(hIni, hFim + 2)}\nfunction grantNoCheckout(session) {\n  let entitlementPending = false\n${corpo}  return creditsToGrant\n}\nmodule.exports = { grantNoCheckout, firstPaymentCreditsFromSession }`
  const js = ts.transpileModule(codigo, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(js, {
    module, exports: module.exports,
    TIER_CREDITS: mods.Pr.TIER_CREDITS, CARD_TRIAL_GRANT_CREDITS: mods.Pr.CARD_TRIAL_GRANT_CREDITS, TRIAL_GRANT_CREDITS: mods.TRIAL_GRANT_CREDITS,
    renewalCreditsFor: mods.Pr.renewalCreditsFor, renewalCreditsForInvoice: mods.S.renewalCreditsForInvoice,
    RetryableEntitlementError: class extends Error {},
  })
  return module.exports
}

// Stripe falsa só para o cupom: conta o que foi pedido.
function stripeFalsa({ existente = null, criaFalha = false, depoisDaCorrida = null } = {}) {
  const log = { retrieve: 0, create: [] }
  let guardado = existente
  return {
    log,
    coupons: {
      async retrieve(id) {
        log.retrieve++
        if (guardado && guardado.id === id) return guardado
        if (depoisDaCorrida && log.create.length) return depoisDaCorrida
        throw Object.assign(new Error('No such coupon'), { code: 'resource_missing', statusCode: 404 })
      },
      async create(p) {
        log.create.push(p)
        if (criaFalha) throw new Error('already exists')
        guardado = { id: p.id, valid: true, percent_off: p.percent_off, amount_off: null, duration: p.duration, applies_to: null, name: p.name }
        return guardado
      },
    },
  }
}

async function problemas(repl = {}) {
  const p = []
  const checa = (nome, c) => { if (!c) p.push(nome) }
  const src = (rel) => repl[rel] ?? SRC[rel]
  let R, Pr, S, D, C, K, TRIAL_GRANT_CREDITS
  try {
    const carrega = createOfflineLoader({ source: (rel, t) => repl[rel] ?? t, mocks: { '@/lib/stripe': { stripe: null } } })
    R = carrega(F.regra); Pr = carrega(F.precos); S = carrega(F.moeda); D = carrega(F.parceiro); C = carrega(F.cupom); K = carrega(F.caixa)
    TRIAL_GRANT_CREDITS = carrega('lib/reverseTrial.ts').TRIAL_GRANT_CREDITS
  } catch (e) { return ['módulos carregam: ' + String(e?.message)] }

  // 1. elegibilidade
  checa('interruptor único, ligado', R.MONTHLY_FIRST_MONTH_3H_LIVE === true && (src(F.regra).match(/export const MONTHLY_FIRST_MONTH_3H_LIVE = /g) ?? []).length === 1)
  checa('30%', R.MONTHLY_FIRST_MONTH_PERCENT_OFF === 30)
  const base = { live: true, tier: 'basic', isAnnual: false, signedIn: true, accountCreatedAt: CRIADA, hasPaid: false, nowMs: T0 + H }
  const d = (o = {}) => R.monthlyFirstMonthDecision({ ...base, ...o })
  for (const tier of TIERS) checa(`${tier} mensal na janela: aplica`, d({ tier }).apply === true && d({ tier }).reason === 'applied')
  checa('2:59:59 aplica', d({ nowMs: T0 + 3 * H - 1000 }).apply)
  checa('3:00:00 exatas: fechada', !d({ nowMs: T0 + 3 * H }).apply && d({ nowMs: T0 + 3 * H }).reason === 'window_closed')
  checa('3:00:01 fechada', !d({ nowMs: T0 + 3 * H + 1000 }).apply)
  checa('no segundo 0 aplica', d({ nowMs: T0 }).apply)
  checa('já pagou: não', !d({ hasPaid: true }).apply && d({ hasPaid: true }).reason === 'already_paid')
  checa('has_paid nulo é quem nunca pagou', d({ hasPaid: null }).apply)
  checa('já usou: não', !d({ usedBefore: true }).apply && d({ usedBefore: true }).reason === 'used_before')
  checa('carimbo de uso lido da assinatura', R.monthlyFirstMonthUsedBy([{ metadata: { monthly_first_month_3h: '1' } }]) && !R.monthlyFirstMonthUsedBy([{ metadata: {} }, { metadata: null }]))
  checa('parceiro vence', !d({ affiliateOfferWins: true }).apply && d({ affiliateOfferWins: true }).reason === 'affiliate_offer')
  checa('outro desconto vence (nunca empilha)', !d({ otherDiscount: true }).apply && d({ otherDiscount: true }).reason === 'other_discount')
  for (const tier of TIERS) checa(`anual ${tier}: não`, !d({ tier, isAnnual: true }).apply && d({ tier, isAnnual: true }).reason === 'plan_shape')
  for (const tier of ['business', 'autopilot', 'autopilot_lite', 'one_time_ad']) checa(`${tier}: não`, !d({ tier }).apply && d({ tier }).reason === 'plan_shape')
  checa('convidado: não', !d({ signedIn: false }).apply && d({ signedIn: false }).reason === 'signed_out')
  checa('interruptor desligado: não', !d({ live: false }).apply && d({ live: false }).reason === 'switch_off')
  checa('teste de cartão e link privado: não', d({ wantsTrial: true }).reason === 'card_trial' && d({ privatePromo: true }).reason === 'private_promo')
  checa('created_at inválido ou no futuro: não', !d({ accountCreatedAt: 'x' }).apply && !d({ accountCreatedAt: null }).apply && !d({ accountCreatedAt: new Date(T0 + 2 * H).toISOString(), nowMs: T0 }).apply)
  // o relógio não reinicia: o fim é sempre created_at + 3 h, qualquer que seja a hora da leitura, e é o mesmo relógio do anual
  checa('relógio: fim = created_at + 3 h, sempre o mesmo', [T0, T0 + H, T0 + 2.5 * H, T0 + 9 * H].every((n) => d({ nowMs: n }).endsAtMs === T0 + 3 * H))
  checa('relógio: o mesmo da oferta do anual (sem segundo relógio)', /import \{ annualWelcomeEndsAtMs, annualWelcomeOpen \} from '@\/lib\/billing\/annualWelcomeOffer'/.test(src(F.regra)) && !/WINDOW_MS\s*=|\b3 \* 60 \* 60 \* 1000|10_?800_?000/.test(src(F.regra)))
  const janela = (o = {}) => R.monthlyFirstMonthWindow({ live: true, signedIn: true, accountCreatedAt: CRIADA, hasPaid: false, nowMs: T0 + H, ...o })
  checa('tela: janela aberta com o fim do servidor', janela()?.endsAtMs === T0 + 3 * H)
  checa('tela: pago, convidado, vencida, desligada = nada', janela({ hasPaid: true }) === null && janela({ signedIn: false }) === null && janela({ nowMs: T0 + 3 * H }) === null && janela({ live: false }) === null)
  checa('acabou há pouco: aviso só até 1 h depois, só para quem o relógio fechou', R.monthlyFirstMonthJustEnded(d({ nowMs: T0 + 3 * H + 60_000 }), T0 + 3 * H + 60_000) && R.monthlyFirstMonthJustEnded(d({ nowMs: T0 + 4 * H - 1000 }), T0 + 4 * H - 1000) && !R.monthlyFirstMonthJustEnded(d({ nowMs: T0 + 4 * H }), T0 + 4 * H) && !R.monthlyFirstMonthJustEnded(d({ nowMs: T0 + 30 * H }), T0 + 30 * H) && !R.monthlyFirstMonthJustEnded(d({ hasPaid: true, nowMs: T0 + 4 * H }), T0 + 4 * H) && !R.monthlyFirstMonthJustEnded(d(), T0 + H))

  // 2. o preço mostrado = o que a Stripe cobra com percent_off 30 (desconto arredondado ao centavo sobre o valor da sessão)
  const stripeCobra = (minor) => minor - Math.round(minor * 0.3)
  const usdEsperado = { starter: 630, basic: 1330, pro: 4130 }
  const brlEsperado = { starter: 3143, basic: 6643, pro: 20643 }
  for (const t of TIERS) {
    const usd = Pr.TIER_PRICES[t].usd, brl = S.BRL_PLAN_PRICES_MINOR[t].monthly
    checa(`${t}: 1º mês USD = ${usdEsperado[t]}`, R.monthlyFirstMonthMinor(usd) === usdEsperado[t] && R.monthlyFirstMonthMinor(usd) === stripeCobra(usd))
    checa(`${t}: 1º mês BRL = ${brlEsperado[t]}`, R.monthlyFirstMonthMinor(brl) === brlEsperado[t] && R.monthlyFirstMonthMinor(brl) === stripeCobra(brl))
    checa(`${t}: a cobrança em reais da sessão é a tabela (o cupom cai sobre ela)`, S.planSettlementAmountMinor(t, 'monthly', 'brl', usd) === brl)
  }
  checa('rótulos', Pr.formatCheckoutMoney('usd', 630) === '$6.30' && Pr.formatCheckoutMoney('usd', 1330) === '$13.30' && Pr.formatCheckoutMoney('usd', 4130) === '$41.30' && S.formatSettlementMoney('brl', 3143).includes('31,43'))
  checa('preço de lista intocado', Pr.TIER_PRICES.starter.usd === 900 && Pr.TIER_PRICES.basic.usd === 1900 && Pr.TIER_PRICES.pro.usd === 5900 && Pr.ANNUAL_PRICES.basic.usd === 16000 && Pr.ANNUAL_WELCOME_PRICES.basic.usd === 11400)
  checa('frase da Stripe com o preço depois', R.monthlyFirstMonthSubmitLine('$19') === '30% off your first month, then $19/month.')

  // 3. CRÉDITO — a lógica real do webhook com a sessão de um 1º mês a 30%
  let W
  try { W = webhookGrant(src(F.webhook), { Pr, S, TRIAL_GRANT_CREDITS }) } catch (e) { p.push('webhook: ' + String(e?.message)); W = null }
  if (W) {
    for (const t of TIERS) {
      for (const [cur, cheio] of [['usd', Pr.TIER_PRICES[t].usd], ['brl', S.BRL_PLAN_PRICES_MINOR[t].monthly]]) {
        const primeira = R.monthlyFirstMonthMinor(cheio)
        // a metadata é a que a rota grava: tier + o carimbo da oferta (e nada de intro — conferido no item 4)
        const session = {
          id: `cs_test_${t}_${cur}`, mode: 'subscription', payment_status: 'paid', currency: cur, amount_total: primeira, amount_subtotal: cheio,
          customer: 'cus_x', subscription: 'sub_x', total_details: { amount_discount: cheio - primeira },
          metadata: { supabase_user_id: 'u1', tier: t, ...R.monthlyFirstMonthStamp(T0 + 3 * H) },
        }
        checa(`crédito 1º mês ${t} ${cur} (${primeira}): grant cheio ${Pr.TIER_CREDITS[t]}`, W.grantNoCheckout(session) === Pr.TIER_CREDITS[t])
        checa(`evento payment_success ${t} ${cur}: credits_granted = grant cheio`, W.firstPaymentCreditsFromSession(session) === Pr.TIER_CREDITS[t])
        checa(`crédito 2ª fatura ${t} ${cur} (${cheio}, cheia): grant cheio`, S.renewalCreditsForInvoice(t, cheio, cur) === Pr.TIER_CREDITS[t])
      }
    }
  }
  const wh = src(F.webhook)
  checa('a 1ª fatura (subscription_create) não passa pela régua do valor', /const billingReason = invoice\.billing_reason\n\s+if \(billingReason === 'subscription_create'\) break/.test(wh))
  checa('a renovação usa o valor da fatura (2ª fatura cheia = grant cheio)', wh.includes('const renewalCredits = renewalCreditsForInvoice(renewalTier, invoice.amount_paid, invoice.currency)'))
  // por que o caminho importa: se o 1º mês fosse pela régua do valor, o desconto daria o grant legado
  checa('(controle) a régua do valor dá outro grant para o valor com desconto em pelo menos um plano', TIERS.some((t) => Pr.renewalCreditsFor(t, R.monthlyFirstMonthMinor(Pr.TIER_PRICES[t].usd)) !== Pr.TIER_CREDITS[t]))
  checa('o carimbo não tem intro', !Object.keys(R.monthlyFirstMonthStamp(T0)).some((k) => /intro|plan_credits/.test(k)))

  // 4. a rota
  const rota = src(F.rota)
  const iBloco = rota.indexOf('  let monthlyFirstMonth: MonthlyFirstMonthDecision = monthlyFirstMonthDecision({')
  const iFimBloco = rota.indexOf('  if (autoWelcome20 && !discountApplied && !promoBlocked', iBloco)
  const bloco = iBloco > 0 && iFimBloco > iBloco ? rota.slice(iBloco, iFimBloco) : ''
  checa('rota: o bloco existe', bloco.length > 0)
  checa('rota: janela da conta verificada', bloco.includes('accountCreatedAt: user.created_at,') && bloco.includes('hasPaid: (profile as { has_paid?: boolean | null }).has_paid,') && bloco.includes('signedIn: true,'))
  checa('rota: nada do pedido decide', !/searchParams\.get\('(created|ends|window|monthly|offer|first)/.test(rota) && !/req\.(nextUrl|cookies|headers)/.test(bloco.slice(0, bloco.indexOf('if (monthlyFirstMonth.apply'))))
  checa('rota: interruptor', bloco.includes('live: MONTHLY_FIRST_MONTH_3H_LIVE,'))
  checa('rota: depois do parceiro, antes do WELCOME20 automático', iBloco > rota.indexOf('  let affiliateDiscountApplied = false\n') && iBloco > rota.indexOf('      affiliateDiscountApplied = true\n') && iBloco < rota.indexOf('  if (autoWelcome20 && !discountApplied && !promoBlocked'))
  checa('rota: parceiro vence (aplicado, código de parceiro ou cupom de parceiro indisponível)', bloco.includes("affiliateOfferWins: affiliateDiscountApplied || checkoutMetadata.affiliate_discount_applied === true || checkoutMetadata.affiliate_discount_failure === 'coupon_unavailable',"))
  checa('rota: nunca empilha', bloco.includes('otherDiscount: discountApplied || Boolean(sessionParams.discounts?.length),'))
  checa('rota: teste de cartão e link privado', bloco.includes('wantsTrial,') && bloco.includes('privatePromo: privatePackPromo,'))
  checa('rota: uma vez por conta (assinaturas da Stripe com o carimbo)', bloco.includes("stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 })") && bloco.includes('usedBefore = monthlyFirstMonthUsedBy(subs.data)') && bloco.includes("reason: 'used_before'"))
  checa('rota: cupom garantido pelo código, aplicado por discounts', bloco.includes('const monthlyCoupon = await ensureMonthlyFirstMonthCoupon()') && bloco.includes('sessionParams.discounts = [{ coupon: monthlyCoupon }]') && bloco.includes('discountApplied = true'))
  checa('rota: carimbo na sessão e na assinatura', bloco.includes('Object.assign(sessionParams.metadata!, monthlyStamp)') && bloco.includes('Object.assign(sessionParams.subscription_data!.metadata!, monthlyStamp)'))
  checa('rota: o bloco não grava intro (o grant do 1º mês é o do plano)', !/intro|plan_credits/.test(bloco.replace(/\/\/[^\n]*/g, '')))
  checa('rota: o WELCOME20 automático não entra por cima', bloco.includes('autoWelcome20 = false'))
  checa('rota: cupom indisponível = preço cheio com o motivo', bloco.includes("reason: 'coupon_unavailable'") && bloco.includes("monthly_first_month_3h_failure = 'coupon_unavailable'"))
  checa('rota: página da Stripe diz o 1º mês e o preço depois', bloco.includes("monthlyFirstMonthSubmitLine(chargeCurrency === 'brl' ? formatSettlementMoney('brl', chargeAmount) : formatCheckoutMoney('usd', chargeAmount))"))
  checa('rota: volta do pagamento com o valor cobrado hoje', bloco.includes('amount: monthlyFirstMonthMinor(chargeAmount),'))
  checa('rota: janela fechada entre a tela e o clique = preço cheio e aviso na Stripe', bloco.includes('} else if (monthlyFirstMonthJustEnded(monthlyFirstMonth, Date.now()) && !discountApplied) {') && bloco.includes('MONTHLY_FIRST_MONTH_ENDED_NOTICE'))
  checa('rota: sem recuperação da Stripe com o cupom', rota.includes('const monthlyRecovery = annualOfferSessionRecovery(monthlyFirstMonthApplied)\n  if (monthlyRecovery) sessionParams.after_expiration = monthlyRecovery'))
  checa('rota: recuperação decidida depois da regra normal', rota.indexOf('if (monthlyRecovery) sessionParams.after_expiration') > rota.indexOf('  sessionParams.after_expiration = {\n    recovery: {'))
  checa('rota: a página fecha no fim da janela', /if \(monthlyFirstMonthApplied && monthlyFirstMonth\.endsAtMs !== null\) \{\n\s+sessionParams\.expires_at = monthlyFirstMonthSessionExpiresAt\(/.test(rota) && rota.indexOf('sessionParams.expires_at = monthlyFirstMonthSessionExpiresAt(') > rota.indexOf('sessionParams.expires_at = recurringCheckoutExpiresAt(checkoutWindow)') && rota.indexOf('sessionParams.expires_at = monthlyFirstMonthSessionExpiresAt(') < rota.indexOf('const checkoutIdempotencyKeyFor'))
  const balde = 1_000_000 * 300
  checa('prazo: fim da janela quando cabe', R.monthlyFirstMonthSessionExpiresAt({ defaultExpiresAtSec: balde + 86400, endsAtMs: (balde + 7200) * 1000, bucketStartSec: balde }) === balde + 7200)
  checa('prazo: nunca menos de 40 min do balde (Stripe exige 30)', R.monthlyFirstMonthSessionExpiresAt({ defaultExpiresAtSec: balde + 86400, endsAtMs: (balde + 60) * 1000, bucketStartSec: balde }) === balde + 2400)
  checa('prazo: nunca além do normal', R.monthlyFirstMonthSessionExpiresAt({ defaultExpiresAtSec: balde + 3600, endsAtMs: (balde + 7200) * 1000, bucketStartSec: balde }) === balde + 3600)
  checa('evento: checkout_started diz se aplicou, o motivo e o fim', rota.includes('      monthly_first_month_3h_applied: monthlyFirstMonthApplied,\n      monthly_first_month_3h: monthlyFirstMonth.reason,') && rota.includes('monthly_first_month_3h_ends_at:') && rota.indexOf('monthly_first_month_3h_applied: monthlyFirstMonthApplied') > rota.indexOf("    'checkout_started',\n    user.id,"))
  checa('campo manual de cupom: regra de hoje intocada', /if \(!discountApplied && subscriptionAcceptsManualPromotions\(tier, isAnnual\)\) \{\n\s+sessionParams\.allow_promotion_codes = true/.test(rota) && D.MANUAL_PROMO_FIELD_LIVE === true)
  checa('parceiro: regra de hoje intocada', D.affiliateDiscountEligible({ tier: 'basic', isAnnual: false, affiliatePresent: true, discountApplied: false }) && !D.affiliateDiscountEligible({ tier: 'starter', isAnnual: false, affiliatePresent: true, discountApplied: false }))

  // 5. o cupom nasce pelo código
  {
    const nova = stripeFalsa()
    const id = await C.ensureMonthlyFirstMonthCoupon(nova)
    const criado = nova.log.create[0]
    checa('cupom: ausente → criado com id fixo, 30%, uma vez', id === 'KINEO_MONTHLY_3H_30' && nova.log.create.length === 1 && criado.id === 'KINEO_MONTHLY_3H_30' && criado.percent_off === 30 && criado.duration === 'once' && !('amount_off' in criado) && !('currency' in criado))
    const outra = await C.ensureMonthlyFirstMonthCoupon(nova)
    checa('cupom: 2ª chamada não cria de novo', outra === id && nova.log.create.length === 1)
    const existe = stripeFalsa({ existente: { id: 'KINEO_MONTHLY_3H_30', valid: true, percent_off: 30, amount_off: null, duration: 'once', applies_to: null } })
    checa('cupom: existente e certo → usa, não cria', (await C.ensureMonthlyFirstMonthCoupon(existe)) === 'KINEO_MONTHLY_3H_30' && existe.log.create.length === 0)
    for (const [nome, ruim] of [['25%', { percent_off: 25 }], ['para sempre', { duration: 'forever' }], ['valor fixo', { amount_off: 100 }], ['restrito a produto', { applies_to: { products: ['prod_x'] } }], ['inválido', { valid: false }]]) {
      const x = stripeFalsa({ existente: { id: 'KINEO_MONTHLY_3H_30', valid: true, percent_off: 30, amount_off: null, duration: 'once', applies_to: null, ...ruim } })
      checa(`cupom ${nome} com o mesmo id: não usa (preço cheio)`, (await C.ensureMonthlyFirstMonthCoupon(x)) === null && x.log.create.length === 0)
    }
    const corrida = stripeFalsa({ criaFalha: true, depoisDaCorrida: { id: 'KINEO_MONTHLY_3H_30', valid: true, percent_off: 30, amount_off: null, duration: 'once', applies_to: null } })
    checa('cupom: corrida na criação → lê o que a outra requisição criou', (await C.ensureMonthlyFirstMonthCoupon(corrida)) === 'KINEO_MONTHLY_3H_30')
  }

  // 6. telas
  const api = src(F.api)
  checa('rota da oferta: mensal pelo mesmo relógio e a mesma leitura de has_paid', api.includes('const monthly = monthlyFirstMonthWindow({ live: MONTHLY_FIRST_MONTH_3H_LIVE, signedIn, accountCreatedAt, hasPaid, nowMs })') && api.includes('let hasPaid: boolean | null = true') && api.includes('accountCreatedAt = user.created_at'))
  checa('rota da oferta: devolve monthlyOffer e monthlyEndsAtMs', api.includes('monthlyOffer: monthly ? MONTHLY_FIRST_MONTH_OFFER_KIND : null, monthlyEndsAtMs: monthly?.endsAtMs ?? null'))
  const hook = src(F.hook)
  checa('relógio do mensal vem do servidor', hook.includes('const monthlyLeft = j.monthlyEndsAtMs - j.nowMs') && hook.includes('setMonthly({ deadlineMs: Date.now() + monthlyLeft, ended: false })') && !/localStorage|sessionStorage|WINDOW_MS/.test(hook))
  checa('relógio do mensal some ao zerar e deixa o aviso', hook.includes('if (alive) setMonthly({ deadlineMs: null, ended: true })'))
  const pr = src(F.pricing)
  checa('/pricing: uma leitura para as duas ofertas', pr.includes('const welcomeOffers = useWelcomeOffers()') && !pr.includes('useAnnualOffer()'))
  checa('/pricing: só mensal, Starter/Creator/Studio, sem assinatura, sem cupom, parceiro e WELCOME20 vencem', pr.includes("monthlyOfferDeadline !== null && billing === 'monthly' && monthlyFirstMonthCoversTier(tier) && !planSwitch.subscribed && !arrivedWithPromo && !affiliateOnCard(tier) && !welcomeOnCard(tier)"))
  checa('/pricing: preço do 1º mês da fonte de preços', pr.includes('monthlyFirstMonthMinor(getTierPrice(tier, resolvedCurrency, resolvedRegion))'))
  checa('/pricing: cheio riscado e "then $X/month"', pr.includes('(annual || welcome !== null || monthly3h !== null) && displayCurrency') && pr.includes("welcome !== null || monthly3h !== null ? `first month, then ${p.price}/month`"))
  checa('/pricing: "30% off your first month" no cartão', pr.includes('<b>{MONTHLY_FIRST_MONTH_PERCENT_OFF}% off your first month</b>'))
  checa('/pricing: reais com o mesmo cupom', pr.includes("monthlyFirstMonthMinor(planSettlementAmountMinor(tier, 'monthly', 'brl', getTierPrice(tier, 'usd')))") && pr.includes('first month, then ${formatSettlementMoney(\'brl\', planSettlementAmountMinor(tier, \'monthly\', \'brl\', getTierPrice(tier, \'usd\')))}/mo'))
  checa('/pricing: o mesmo relógio da oferta do anual', pr.includes('<AnnualOfferCountdown deadlineMs={monthlyOfferDeadline} percentOff={MONTHLY_FIRST_MONTH_PERCENT_OFF}'))
  checa('/pricing: o anual segue como estava', pr.includes("{billing === 'annual' && annualOfferLive && annualOffer?.kind === 'welcome_3h' ? <AnnualOfferCountdown deadlineMs={annualOffer.deadlineMs} percentOff={ANNUAL_WELCOME_DISCOUNT_PERCENT} /> : null}") && pr.includes('annualOffer !== null && !planSwitch.subscribed'))
  checa('/pricing: aviso de fim na tela', pr.includes('{MONTHLY_FIRST_MONTH_ENDED_NOTICE}') && pr.includes("welcomeOffers.monthly.ended && billing === 'monthly' && !planSwitch.subscribed"))
  checa('sem card de promoção (PROMO_CARDS_LIVE segue false)', /export const PROMO_CARDS_LIVE = false/.test(lf('lib/growth/promoCards.ts')))
  checa('copy honesta: sem "unlimited" nas frases novas', !/unlimited/i.test(R.monthlyFirstMonthSubmitLine('$9') + R.MONTHLY_FIRST_MONTH_ENDED_NOTICE + K.LINHA_DAS_DUAS_OFERTAS + K.LINHA_DO_MENSAL))
  // caixa de presente
  const credits = { entitlementsResolved: true, hasPaid: false }
  const corpo = (o) => ({ nowMs: T0 + H, offer: null, endsAtMs: null, monthlyOffer: null, monthlyEndsAtMs: null, ...o })
  const linha = (annual, c = credits) => K.linhasDaCaixa({ credits: c, annual, kling4: null }, 5_000).find((l) => l.id === 'anual')
  const duas = linha(corpo({ offer: 'welcome_3h', endsAtMs: T0 + 3 * H, monthlyOffer: 'first_month_3h', monthlyEndsAtMs: T0 + 3 * H }))
  checa('caixa: as duas ofertas numa linha curta, abre /pricing', duas?.titulo === '50% off annual, or 30% off your first month' && duas?.href.startsWith('/pricing') && duas?.venceEmMs === 5_000 + 2 * H)
  const soAnual = linha(corpo({ offer: 'welcome_3h', endsAtMs: T0 + 3 * H }))
  checa('caixa: só o anual, o texto de sempre', soAnual?.titulo === 'Your 50% annual offer' && soAnual?.href === '/pricing?billing=annual')
  const soMensal = linha(corpo({ offer: 'black_friday_2026', endsAtMs: T0 + 50 * H, monthlyOffer: 'first_month_3h', monthlyEndsAtMs: T0 + 3 * H }))
  checa('caixa: só o mensal (anual na Black Friday), abre o /pricing mensal', soMensal?.titulo === '30% off your first month' && soMensal?.href === '/pricing?billing=monthly')
  checa('caixa: quem pagou não vê', !linha(corpo({ offer: 'welcome_3h', endsAtMs: T0 + 3 * H, monthlyOffer: 'first_month_3h', monthlyEndsAtMs: T0 + 3 * H }), { entitlementsResolved: true, hasPaid: true }))
  checa('caixa: prazo vencido ou maior que a janela não aparece', !linha(corpo({ monthlyOffer: 'first_month_3h', monthlyEndsAtMs: T0 + H })) && !linha(corpo({ monthlyOffer: 'first_month_3h', monthlyEndsAtMs: T0 + 6 * H })))
  return p
}

let falhas = 0
const b0 = await problemas()
console.log(b0.length ? 'FALHA\n  ' + b0.join('\n  ') : 'PASS 30% no 1º mês do mensal nas 3 h: elegibilidade, preço, crédito, rota, cupom e telas')
if (b0.length) falhas++

const muta = (rel, de, para) => {
  const s = SRC[rel]
  if (!s.includes(de)) throw new Error(`mutante sem âncora em ${rel}: ${de.slice(0, 70)}`)
  return { [rel]: s.replace(de, para) }
}
const MUTANTES = [
  ['interruptor desligado no envio', muta(F.regra, 'MONTHLY_FIRST_MONTH_3H_LIVE = true as boolean', 'MONTHLY_FIRST_MONTH_3H_LIVE = false as boolean')],
  ['25% em vez de 30', muta(F.regra, 'MONTHLY_FIRST_MONTH_PERCENT_OFF = 30', 'MONTHLY_FIRST_MONTH_PERCENT_OFF = 25')],
  ['3:00:00 ainda aberta (relógio compartilhado)', muta(F.relogio, 'input.nowMs >= fim', 'input.nowMs > fim')],
  ['janela de 4 h (relógio compartilhado)', muta(F.relogio, 'ANNUAL_WELCOME_WINDOW_MS = 3 * 60 * 60 * 1000', 'ANNUAL_WELCOME_WINDOW_MS = 4 * 60 * 60 * 1000')],
  ['segundo relógio próprio', muta(F.regra, "export const MONTHLY_FIRST_MONTH_3H_LIVE", "const MEU_WINDOW_MS = 3 * 60 * 60 * 1000\nexport const MONTHLY_FIRST_MONTH_3H_LIVE")],
  ['conta paga entra', muta(F.regra, "  if (input.hasPaid === true) return nao('already_paid')\n", '')],
  ['quem já usou entra', muta(F.regra, "  if (input.usedBefore === true) return nao('used_before')\n", '')],
  ['parceiro perde para os 30%', muta(F.regra, "  if (input.affiliateOfferWins === true) return nao('affiliate_offer')\n", '')],
  ['empilha com outro desconto', muta(F.regra, "  if (input.otherDiscount === true) return nao('other_discount')\n", '')],
  ['anual ganha os 30%', muta(F.regra, 'input.isAnnual !== false || ', '')],
  ['Business ganha os 30%', muta(F.regra, "['starter', 'basic', 'pro']", "['starter', 'basic', 'pro', 'business']")],
  ['convidado ganha', muta(F.regra, "  if (input.signedIn !== true) return nao('signed_out')\n", '')],
  ['preço arredondado errado', muta(F.regra, 'return cheio - Math.round((cheio * MONTHLY_FIRST_MONTH_PERCENT_OFF) / 100)', 'return Math.floor(cheio * 0.69)')],
  ['carimbo com intro', muta(F.regra, "return { [MONTHLY_FIRST_MONTH_MARKER]: '1',", "return { intro: '1', [MONTHLY_FIRST_MONTH_MARKER]: '1',")],
  ['uso lido de outra chave', muta(F.regra, "s.metadata?.[MONTHLY_FIRST_MONTH_MARKER] === '1'", "s.metadata?.intro === '1'")],
  ['webhook dá o 1º mês pelo valor pago', muta(F.webhook, '        const firstMonthCredits = introApplied ? Math.floor(introCreditsRaw) : planCredits', '        const firstMonthCredits = introApplied ? Math.floor(introCreditsRaw) : renewalCreditsForInvoice(tier, session.amount_total, session.currency)')],
  ['payment_success conta pelo valor pago', muta(F.webhook, 'return isCardTrial ? CARD_TRIAL_GRANT_CREDITS : isTrial ? TRIAL_GRANT_CREDITS : introApplied ? Math.floor(introCreditsRaw) : planCredits', 'return isCardTrial ? CARD_TRIAL_GRANT_CREDITS : isTrial ? TRIAL_GRANT_CREDITS : introApplied ? Math.floor(introCreditsRaw) : renewalCreditsFor(tier, session.amount_total)')],
  ['1ª fatura entra na régua da renovação', muta(F.webhook, "        if (billingReason === 'subscription_create') break\n", '')],
  ['rota: janela vinda do pedido', muta(F.rota, '    accountCreatedAt: user.created_at,\n    hasPaid: (profile as { has_paid?: boolean | null }).has_paid,\n    nowMs: Date.now(),\n    wantsTrial,', "    accountCreatedAt: req.nextUrl.searchParams.get('created'),\n    hasPaid: (profile as { has_paid?: boolean | null }).has_paid,\n    nowMs: Date.now(),\n    wantsTrial,")],
  ['rota: interruptor ignorado', muta(F.rota, '    live: MONTHLY_FIRST_MONTH_3H_LIVE,\n    tier,', '    live: true,\n    tier,')],
  ['rota: parceiro ignorado', muta(F.rota, "affiliateOfferWins: affiliateDiscountApplied || checkoutMetadata.affiliate_discount_applied === true || checkoutMetadata.affiliate_discount_failure === 'coupon_unavailable',", 'affiliateOfferWins: false,')],
  ['rota: empilha', muta(F.rota, 'otherDiscount: discountApplied || Boolean(sessionParams.discounts?.length),', 'otherDiscount: false,')],
  ['rota: sem checar uso anterior', muta(F.rota, '      usedBefore = monthlyFirstMonthUsedBy(subs.data)\n', '      void subs\n')],
  ['rota: carimbo só na sessão', muta(F.rota, '      Object.assign(sessionParams.subscription_data!.metadata!, monthlyStamp)\n', '')],
  ['rota: grava intro', muta(F.rota, '      Object.assign(sessionParams.metadata!, monthlyStamp)\n', "      Object.assign(sessionParams.metadata!, monthlyStamp)\n      sessionParams.metadata!.intro = '1'\n")],
  ['rota: recuperação leva os 30%', muta(F.rota, '  if (monthlyRecovery) sessionParams.after_expiration = monthlyRecovery\n', '')],
  ['rota: página vive 24 h com os 30%', muta(F.rota, '    sessionParams.expires_at = monthlyFirstMonthSessionExpiresAt({', '    void ({')],
  ['rota: evento sem o campo', muta(F.rota, '      monthly_first_month_3h_applied: monthlyFirstMonthApplied,\n', '')],
  ['rota: janela vencida sem aviso', muta(F.rota, '    sessionParams.custom_text!.submit = { message: `${MONTHLY_FIRST_MONTH_ENDED_NOTICE} ${checkoutValueContext.submitMessage}` }', '    void checkoutValueContext')],
  ['rota: Stripe sem o preço depois', muta(F.rota, "${monthlyFirstMonthSubmitLine(chargeCurrency === 'brl' ? formatSettlementMoney('brl', chargeAmount) : formatCheckoutMoney('usd', chargeAmount))} ", '')],
  ['prazo sem piso da Stripe', muta(F.regra, 'const piso = input.bucketStartSec + 40 * 60', 'const piso = input.bucketStartSec')],
  ['cupom para sempre', muta(F.cupom, "      duration: 'once',\n", "      duration: 'forever',\n")],
  ['cupom aceita qualquer duração', muta(F.regra, "    coupon!.duration === 'once' && ", '    ')],
  ['cupom aceita valor fixo', muta(F.regra, ' && !coupon!.amount_off', '')],
  ['cupom sem corrida', muta(F.cupom, '      const corrida = await client.coupons.retrieve(MONTHLY_FIRST_MONTH_COUPON_ID)\n', '      const corrida = null\n')],
  ['API: has_paid ignorado', muta(F.api, 'monthlyFirstMonthWindow({ live: MONTHLY_FIRST_MONTH_3H_LIVE, signedIn, accountCreatedAt, hasPaid, nowMs })', 'monthlyFirstMonthWindow({ live: MONTHLY_FIRST_MONTH_3H_LIVE, signedIn, accountCreatedAt, hasPaid: false, nowMs })')],
  ['relógio inventado no /pricing', muta(F.hook, 'const monthlyLeft = j.monthlyEndsAtMs - j.nowMs', 'const monthlyLeft = 3 * 3600000')],
  ['relógio não some', muta(F.hook, 'if (alive) setMonthly({ deadlineMs: null, ended: true })', 'void alive')],
  ['assinante vê os 30%', muta(F.pricing, " && monthlyFirstMonthCoversTier(tier) && !planSwitch.subscribed && ", ' && monthlyFirstMonthCoversTier(tier) && ')],
  ['parceiro some do cartão', muta(F.pricing, ' && !affiliateOnCard(tier) && !welcomeOnCard(tier)\n', ' && !welcomeOnCard(tier)\n')],
  ['cartão sem "then $X/month"', muta(F.pricing, "welcome !== null || monthly3h !== null ? `first month, then ${p.price}/month`", "welcome !== null ? `first month, then ${p.price}/month`")],
  ['cartão sem o cheio riscado', muta(F.pricing, '(annual || welcome !== null || monthly3h !== null) && displayCurrency', '(annual || welcome !== null) && displayCurrency')],
  ['cartão sem o relógio', muta(F.pricing, '<AnnualOfferCountdown deadlineMs={monthlyOfferDeadline} percentOff={MONTHLY_FIRST_MONTH_PERCENT_OFF}', '<AnnualOfferCountdown deadlineMs={Date.now() + 10800000} percentOff={MONTHLY_FIRST_MONTH_PERCENT_OFF}')],
  ['caixa só fala do anual', muta(F.caixa, "  if (faltaAnual !== null && faltaMensal !== null) return { id: 'anual', titulo: LINHA_DAS_DUAS_OFERTAS,", "  if (faltaAnual !== null && faltaMensal !== null) return { id: 'anual', titulo: `Your ${ANNUAL_WELCOME_DISCOUNT_PERCENT}% annual offer`,")],
  ['caixa: mensal fora do /pricing', muta(F.caixa, "href: '/pricing?billing=monthly'", "href: '/studio'")],
  ['caixa: quem pagou vê', muta(F.caixa, '  if (!c || c.entitlementsResolved !== true || c.hasPaid !== false) return null\n  if (faltaAnual', '  if (faltaAnual')],
]
for (const [nome, repl] of MUTANTES) {
  const r = await problemas(repl)
  console.log(`${r.length ? 'PASS' : 'FALHA'} mutante "${nome}" ${r.length ? 'pego — ' + r[0].slice(0, 80) : 'NÃO pego'}`)
  if (!r.length) falhas++
}
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1) }
console.log(`\nOK — ${MUTANTES.length} mutantes pegos`)
