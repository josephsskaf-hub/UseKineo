// ═══ KINEO-TROCA-ANUAL-2026-10-07 — a troca mensal → anual dos primeiros assinantes, uma pessoa por vez ═══════════
//
// A PROMESSA (e-mail "A thank-you for being one of our first subscribers", 05/10, 9 assinantes mensais na Stripe):
// "Switch to annual and save 40%… you'd pay $X once for the full year. Same plan, same credits as today, still
// released every month. No new signup: just reply YES and I'll switch your subscription myself. What you already paid
// this month is credited. Changed your mind? Full refund within 14 days." O primeiro SIM chegou em 07/10.
//
// O BURACO: POST /api/stripe/change-plan recusa anual (409 annual_needs_support) e nenhuma rota sabia trocar o
// intervalo. "Faço na mão depois" é onde promessa morre (lição de 24/08). A rota de admin
// app/api/admin/switch-to-annual faz a troca; este módulo é a parte PURA dela (sem Stripe, sem banco, sem rede).
//
// A REGRA DO VALOR (lida nos 9 e-mails reais de 05/10, correção da sessão CEO de 07/10): anual = mensal × 12 × 0,6
// ARREDONDADO AO DÓLAR MAIS PRÓXIMO (meio para cima). O mensal de referência é o unit_amount que a assinatura cobra
// HOJE na Stripe (pode já ter desconto embutido, ex.: 15,92). Os cinco valores prometidos:
//   9,90 → 71 · 12,90 → 93 · 15,92 → 115 · 19,90 → 143 · 29 → 209.
// Um dólar acima ou abaixo é recusado: a ferramenta cobra o que o e-mail prometeu, nem mais, nem menos.
//
// IGUAL A UMA ANUAL NASCIDA NO CHECKOUT: o sistema reconhece a anual por (a) item com recurring.interval 'year' e
// (b) metadata.tier + metadata.supabase_user_id — é o que o cron app/api/cron/annual-credit-refill lê para soltar os
// meses 1..11 e o que o webhook lê na renovação. A troca preserva TODA a metadata do checkout mensal original
// (afiliado, origem, marcador de intro) e carimba as chaves de sistema do checkout anual (supabase_user_id, tier,
// plan_credits, price_region) + o selo annual_switch_* desta ferramenta.
//
// CRÉDITOS (correção da sessão CEO, 07/10): o ano pago começa NA TROCA (âncora 'now') e o resto do mês mensal volta em
// dinheiro (rateio). Por isso a troca concede a cota do 1º mês do ano na hora, pela régua da renovação
// (lib/credits/renewalBalance: a cota reinicia, o comprado acima de uma cota sobrevive) — na rota, numa escrita só com
// o registro. A fatura da troca chega ao webhook como billing_reason='subscription_update' e sai ANTES do grant de
// renovação (sem dobrar); o cron da recarga anual solta os meses 1..11 (+1 a +11 meses); o 12º é a próxima fatura
// anual: 12 cotas por ano pago. Se a recarga anual daria MENOS créditos por mês do que a renovação mensal dá hoje (ex.:
// Studio a US$ 39,90 → 300 hoje, 180 pela escada legada do anual de US$ 287), a troca é BLOQUEADA: "same credits as
// today" é parte da promessa.
//
// KINEO-ANUAL-2o-MES-2026-10-08 — DUAS OFERTAS, UMA TROCA. O fundador decidiu (08/10) que o mensal fica e que a casa
// oferece o anual no 2º mês da assinatura, com 30% (MONTH2_ANNUAL_OFFER, regra mensal × 12 × 0,7 ao dólar mais próximo).
// A oferta de 40% acima continua valendo como está (rota do admin, quem recebeu o e-mail até 11/10). O registro
// ANNUAL_SWITCH_OFFER_RULES diz o valor de cada oferta; todo o resto (bloqueios, créditos, metadata, razão, Stripe) é o
// MESMO para as duas — a troca em si mora em lib/billing/annualSwitchCore.ts. A oferta do 2º mês exige, além dos
// bloqueios de sempre, UMA renovação paga e assinatura fora do teste (month2SwitchBlockers, mais abaixo).
import {
  ANNUAL_REFUND_DAYS,
  type CheckoutTier,
} from '@/lib/checkoutPricing'
import { addUtcMonths, annualRefillCredits, annualTierFromMetadata } from '@/lib/billing/annualRefill'
import { renewalCreditsForInvoice } from '@/lib/settlementCurrency'
import { isInternalEmail } from '@/lib/internalAccounts'
import { MONTH2_ANNUAL_OFFER, MONTH2_ANNUAL_PERCENT_OFF } from './month2AnnualOffer'

export const ANNUAL_SWITCH_VERSION = 'annual_switch_v1' as const
/** Razão em `events` (id determinístico por assinatura → uma troca por assinatura, para sempre). */
export const ANNUAL_SWITCH_EVENT = 'plan_switched_to_annual' as const
/** A oferta de 05/10 que esta ferramenta cumpre. */
export const ANNUAL_SWITCH_OFFER = 'first_subscribers_annual_40_2026_10_05' as const
/** O desconto da oferta de 05/10 (a conta inteira da regra mora em offerAnnualUsd: × 72 ÷ 1000). */
export const ANNUAL_SWITCH_PERCENT_OFF = 40
/** A frase da regra, como aparece no ensaio e no evento. */
export const ANNUAL_SWITCH_RULE = 'round(monthly x 12 x 0.6) to the nearest dollar, half up' as const
/** A regra da oferta do 2º mês (derivada do desconto: 30% → 0.7). */
export const MONTH2_ANNUAL_RULE = `round(monthly x 12 x ${(100 - MONTH2_ANNUAL_PERCENT_OFF) / 100}) to the nearest dollar, half up`
export { MONTH2_ANNUAL_OFFER }
/** Janela da chave de idempotência da Stripe: dois cliques na mesma janela viram UMA chamada. */
export const ANNUAL_SWITCH_IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000

/**
 * As chaves que o SISTEMA lê na assinatura anual do checkout (app/api/stripe/checkout/route.ts,
 * subscription_data.metadata; o builder lib/stripe/guestCheckout.ts escreve as mesmas três sem o dono).
 */
export const ANNUAL_SUBSCRIPTION_SYSTEM_KEYS = ['supabase_user_id', 'tier', 'plan_credits', 'price_region'] as const

/** O selo desta ferramenta na metadata da assinatura (a 2ª execução reconhece a troca já feita por ele). */
export const ANNUAL_SWITCH_STAMP_KEYS = [
  'annual_switch_version',
  'annual_switch_offer',
  'annual_switch_from_monthly_minor',
  'annual_switch_annual_minor',
] as const

// ─── a regra do valor ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Anual prometido, em dólares inteiros: mensal (centavos) × 12 × 0,6 ÷ 100 = mensal × 72 ÷ 1000, ao mais próximo com
 * meio para cima. Conta inteira (+500 antes da divisão) — sem ponto flutuante. null = mensal inválido.
 */
export function offerAnnualUsd(monthlyMinor: number | null | undefined): number | null {
  if (typeof monthlyMinor !== 'number' || !Number.isInteger(monthlyMinor) || monthlyMinor <= 0) return null
  return Math.floor((monthlyMinor * 72 + 500) / 1000)
}

/**
 * KINEO-ANUAL-2o-MES-2026-10-08 — anual da oferta do 2º mês, em dólares inteiros: mensal (centavos) × 12 × (100 − 30)
 * ÷ 10000, ao mais próximo com meio para cima (+5000 antes da divisão; conta inteira, sem ponto flutuante). Os valores
 * conferidos pelo guardião: 9,90 → 83 · 12,90 → 108 · 15,92 → 134 · 19,90 → 167 · 29 → 244 · 29,90 → 251 · 54,90 → 461.
 */
export function month2OfferAnnualUsd(monthlyMinor: number | null | undefined): number | null {
  if (typeof monthlyMinor !== 'number' || !Number.isInteger(monthlyMinor) || monthlyMinor <= 0) return null
  return Math.floor((monthlyMinor * 12 * (100 - MONTH2_ANNUAL_PERCENT_OFF) + 5000) / 10000)
}

export type AnnualSwitchOfferId = typeof ANNUAL_SWITCH_OFFER | typeof MONTH2_ANNUAL_OFFER

export type AnnualSwitchOfferRule = {
  id: AnnualSwitchOfferId
  percentOff: number
  /** A frase da regra (ensaio, evento, doc). */
  rule: string
  /** Anual em dólares inteiros para o mensal de hoje (null = mensal inválido). */
  annualUsd: (monthlyMinor: number | null | undefined) => number | null
}

/** As ofertas que a troca sabe cumprir. A troca é a mesma; só o valor muda. */
export const ANNUAL_SWITCH_OFFER_RULES: Record<AnnualSwitchOfferId, AnnualSwitchOfferRule> = {
  [ANNUAL_SWITCH_OFFER]: { id: ANNUAL_SWITCH_OFFER, percentOff: ANNUAL_SWITCH_PERCENT_OFF, rule: ANNUAL_SWITCH_RULE, annualUsd: offerAnnualUsd },
  [MONTH2_ANNUAL_OFFER]: { id: MONTH2_ANNUAL_OFFER, percentOff: MONTH2_ANNUAL_PERCENT_OFF, rule: MONTH2_ANNUAL_RULE, annualUsd: month2OfferAnnualUsd },
}

/** Anual (dólares inteiros) que `offer` promete para este mensal. */
export function annualUsdForOffer(offer: AnnualSwitchOfferId, monthlyMinor: number | null | undefined): number | null {
  const rule = ANNUAL_SWITCH_OFFER_RULES[offer]
  return rule ? rule.annualUsd(monthlyMinor) : null
}

export type AnnualAmountCheck =
  | { ok: true; annualUsd: number; annualMinor: number; expectedUsd: number }
  | { ok: false; reason: 'invalid_amount' | 'monthly_unknown' | 'mismatch'; expectedUsd: number | null; requested: unknown }

/** O valor pedido tem de ser EXATAMENTE o que a oferta promete para este mensal (o e-mail no admin; a prévia na tela). */
export function checkAnnualAmountForOffer(offer: AnnualSwitchOfferId, monthlyMinor: number | null | undefined, requested: unknown): AnnualAmountCheck {
  const expectedUsd = annualUsdForOffer(offer, monthlyMinor)
  const n = typeof requested === 'number' ? requested : typeof requested === 'string' && requested.trim() ? Number(requested) : NaN
  if (!Number.isInteger(n) || n <= 0) return { ok: false, reason: 'invalid_amount', expectedUsd, requested }
  if (expectedUsd === null) return { ok: false, reason: 'monthly_unknown', expectedUsd, requested }
  if (n !== expectedUsd) return { ok: false, reason: 'mismatch', expectedUsd, requested }
  return { ok: true, annualUsd: n, annualMinor: n * 100, expectedUsd }
}

/** O valor pedido tem de ser EXATAMENTE o que o e-mail de 05/10 prometeu para este mensal. */
export function checkAnnualAmount(monthlyMinor: number | null | undefined, requested: unknown): AnnualAmountCheck {
  return checkAnnualAmountForOffer(ANNUAL_SWITCH_OFFER, monthlyMinor, requested)
}

// ─── plano ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** profiles.plan → tier do checkout ('creator' = basic, 'studio' = pro, sufixo _trial ignorado). */
export function tierFromProfilePlan(plan: string | null | undefined): CheckoutTier | null {
  const raw = String(plan ?? '').trim().toLowerCase().replace(/_trial$/, '')
  if (raw === 'creator') return 'basic'
  if (raw === 'studio') return 'pro'
  return annualTierFromMetadata(raw)
}

/**
 * O tier da troca: o da metadata da assinatura (o que o cron e o webhook leem) e, sem ele, o do perfil. Os dois
 * existindo e discordando = ambíguo, bloqueia. Tier sem plano anual (autopilot…) também bloqueia.
 */
export function resolveSwitchTier(
  metadataTier: string | null | undefined,
  profilePlan: string | null | undefined,
): { tier: CheckoutTier | null; problem: null | 'tier_unknown' | 'tier_mismatch' | 'tier_without_annual' } {
  const fromProfile = tierFromProfilePlan(profilePlan)
  const rawMeta = typeof metadataTier === 'string' ? metadataTier.trim() : ''
  if (rawMeta) {
    const fromMeta = annualTierFromMetadata(rawMeta)
    if (!fromMeta) return { tier: null, problem: 'tier_without_annual' }
    if (fromProfile && fromProfile !== fromMeta) return { tier: null, problem: 'tier_mismatch' }
    return { tier: fromMeta, problem: null }
  }
  return fromProfile ? { tier: fromProfile, problem: null } : { tier: null, problem: 'tier_unknown' }
}

// ─── créditos: "same credits as today" ────────────────────────────────────────────────────────────────────────────

export type AnnualSwitchCredits = {
  /** O que a renovação MENSAL concede hoje (webhook: renewalCreditsForInvoice sobre o mensal). */
  perMonthToday: number
  /** O que a recarga ANUAL concederá nos meses 1..11 (cron: annualRefillCredits sobre o anual). */
  perMonthAfter: number
  /** O que a renovação anual do ano seguinte concede no mês 0 (webhook sobre o anual) — só informativo. */
  nextAnnualRenewalMonth0: number
  same: boolean
}

export function annualSwitchCredits(tier: CheckoutTier, monthlyMinor: number, annualMinor: number, currency: string): AnnualSwitchCredits {
  const perMonthToday = renewalCreditsForInvoice(tier, monthlyMinor, currency)
  const perMonthAfter = annualRefillCredits(tier, annualMinor, currency)
  const nextAnnualRenewalMonth0 = renewalCreditsForInvoice(tier, annualMinor, currency)
  return { perMonthToday, perMonthAfter, nextAnnualRenewalMonth0, same: perMonthToday === perMonthAfter }
}

// ─── metadata igual à do checkout anual ───────────────────────────────────────────────────────────────────────────

/**
 * A metadata que a assinatura passa a ter: TUDO o que o checkout mensal original gravou (afiliado, origem, intro…),
 * as chaves de sistema do checkout anual e o selo desta ferramenta. plan_credits = o que a recarga anual concede por
 * mês (= o de hoje; a troca é bloqueada quando não é).
 */
export function annualSwitchMetadata(input: {
  existing: Record<string, string> | null | undefined
  userId: string
  tier: CheckoutTier
  planCredits: number
  monthlyMinor: number
  annualMinor: number
  /** A oferta cumprida (selo `annual_switch_offer`). Sem ela, a de 05/10 (a rota do admin). */
  offer?: AnnualSwitchOfferId
}): Record<string, string> {
  const existing = input.existing ?? {}
  return {
    ...existing,
    supabase_user_id: input.userId,
    tier: input.tier,
    plan_credits: String(input.planCredits),
    price_region: existing.price_region || 'standard',
    annual_switch_version: ANNUAL_SWITCH_VERSION,
    annual_switch_offer: input.offer ?? ANNUAL_SWITCH_OFFER,
    annual_switch_from_monthly_minor: String(input.monthlyMinor),
    annual_switch_annual_minor: String(input.annualMinor),
  }
}

/** A assinatura já foi trocada por esta ferramenta (selo na metadata). */
export function hasAnnualSwitchStamp(metadata: Record<string, string> | null | undefined): boolean {
  return Boolean(metadata?.annual_switch_version)
}

// ─── o que bloqueia a troca ───────────────────────────────────────────────────────────────────────────────────────

export type AnnualSwitchFacts = {
  status: string | null
  itemCount: number
  quantity: number | null
  interval: string | null
  intervalCount: number | null
  currency: string | null
  monthlyMinor: number | null
  collectionMethod: string | null
  /** Cupom na assinatura ou no item: ele cairia por cima do anual (que já embute os 40%). */
  discountCount: number
  cancelAtPeriodEnd: boolean
  cancelAt: number | null
  hasSchedule: boolean
  paused: boolean
  /** metadata.supabase_user_id ausente ou igual ao userId, e o Customer igual ao do perfil quando o perfil tem um. */
  ownerMatches: boolean
  internalAccount: boolean
  tierProblem: null | 'tier_unknown' | 'tier_mismatch' | 'tier_without_annual'
  credits: AnnualSwitchCredits | null
}

export type AnnualSwitchBlocker = { code: string; message: string }

/** Tudo o que impede a troca. Vazio = pode trocar. O ensaio mostra a lista; o SEND recusa (409) se houver algo. */
export function annualSwitchBlockers(f: AnnualSwitchFacts): AnnualSwitchBlocker[] {
  const b: AnnualSwitchBlocker[] = []
  const add = (code: string, message: string) => b.push({ code, message })
  if (!f.ownerMatches) add('not_owner', 'A assinatura na Stripe pertence a outra conta (metadata.supabase_user_id ou Customer diferente do perfil).')
  if (f.internalAccount) add('internal_account', 'Conta interna: o cron da recarga anual pula contas internas, então a promessa mensal nunca seria cumprida.')
  if (f.status !== 'active') add('subscription_not_active', `A assinatura está "${f.status ?? 'desconhecida'}" na Stripe; a troca só vale para assinatura ativa e paga.`)
  if (f.itemCount !== 1) add('item_count', `A assinatura tem ${f.itemCount} itens; a troca sabe trocar exatamente 1.`)
  if (f.quantity !== null && f.quantity !== 1) add('quantity', `Quantidade ${f.quantity} no item; o checkout da casa usa 1.`)
  if (f.interval === 'year') add('already_annual', 'A assinatura já é anual sem o selo desta ferramenta (comprada no checkout ou trocada à mão). Nada a trocar.')
  else if (f.interval !== 'month' || f.intervalCount !== 1) add('not_monthly', `Intervalo "${f.interval ?? '?'}"×${f.intervalCount ?? '?'}: a troca parte de uma mensalidade simples.`)
  if (f.currency !== 'usd') add('currency_not_usd', `A assinatura cobra em ${String(f.currency ?? '?').toUpperCase()}; a troca para o anual é em dólar (BRL fica para depois).`)
  if (f.interval === 'month' && (f.monthlyMinor === null || f.monthlyMinor <= 0)) add('monthly_unknown', 'Sem valor mensal na Stripe para aplicar a regra.')
  if (f.collectionMethod !== 'charge_automatically') add('collection_method', 'A assinatura não cobra o cartão automaticamente; a troca precisa cobrar agora.')
  if (f.discountCount > 0) add('subscription_has_discount', 'Há cupom ativo na assinatura: ele cairia por cima do anual (que já embute o desconto da oferta). Remova o cupom na Stripe e rode o ensaio de novo.')
  if (f.cancelAtPeriodEnd || f.cancelAt !== null) add('cancel_scheduled', 'A assinatura tem cancelamento agendado; confirme com a pessoa antes de trocar.')
  if (f.hasSchedule) add('subscription_schedule', 'A assinatura está presa a um Subscription Schedule; troca manual no painel.')
  if (f.paused) add('collection_paused', 'A cobrança está pausada na Stripe.')
  if (f.tierProblem === 'tier_unknown') add('tier_unknown', 'Sem plano reconhecível (metadata.tier e profiles.plan vazios).')
  if (f.tierProblem === 'tier_mismatch') add('tier_mismatch', 'metadata.tier da assinatura e profiles.plan discordam; resolva antes de trocar.')
  if (f.tierProblem === 'tier_without_annual') add('tier_without_annual', 'Este plano não tem anual (só Starter, Creator e Studio).')
  if (f.credits && !f.credits.same) {
    add('credits_would_change', `A recarga anual daria ${f.credits.perMonthAfter} créditos/mês; a renovação mensal dá ${f.credits.perMonthToday} hoje. A promessa é "same credits as today".`)
  }
  return b
}

// ─── a oferta do 2º mês: só depois da 1ª renovação paga (KINEO-ANUAL-2o-MES-2026-10-08) ─────────────────────────────

/** Quantas renovações pagas a oferta do 2º mês exige: pagou o 1º mês E a 1ª renovação → está no 2º mês ou depois. */
export const MONTH2_REQUIRED_RENEWALS = 1

/**
 * O que o PERFIL já responde, sem Stripe: quem nunca seria elegível (sem assinatura Stripe, PayPal, conta interna, em
 * teste, plano fora da escada) não custa uma chamada à Stripe na tela nem no cron. null = segue para a Stripe, que decide
 * o resto (os mesmos bloqueios da troca + a renovação paga). É só um atalho: o núcleo confere tudo de novo na troca.
 */
export function month2ProfileBlocker(profile: {
  plan?: string | null
  email?: string | null
  stripe_subscription_id?: string | null
  paypal_subscription_id?: string | null
} | null | undefined): string | null {
  if (!profile) return 'no_profile'
  if (!profile.stripe_subscription_id) return profile.paypal_subscription_id ? 'paypal_subscription' : 'no_stripe_subscription'
  if (isInternalEmail(profile.email)) return 'internal_account'
  const plan = String(profile.plan ?? '').trim().toLowerCase()
  if (plan.endsWith('_trial')) return 'in_trial'
  if (!tierFromProfilePlan(plan)) return 'tier_without_annual'
  return null
}

/** O que stripe.invoices.list devolve, reduzido ao que a regra lê. */
export type RenewalInvoiceFacts = {
  id?: string | null
  billing_reason?: string | null
  status?: string | null
  amount_paid?: number | null
  created?: number | null
  status_transitions?: { paid_at?: number | null } | null
}

export type PaidRenewals = {
  /** Renovações pagas: faturas de ciclo pagas, sem a conversão do teste. */
  count: number
  /** Quando a 1ª renovação foi paga (ms) — a entrada no 2º mês. */
  firstPaidAtMs: number | null
  /** Quando a renovação mais recente foi paga (ms). */
  lastPaidAtMs: number | null
  /** Faturas de ciclo pagas, antes de descontar a conversão do teste. */
  cyclePaid: number
  /** A 1ª fatura de ciclo foi a conversão do teste (o 1º mês pago), não uma renovação. */
  trialConversion: boolean
}

/**
 * Renovações pagas de uma assinatura mensal. Conta só `billing_reason = 'subscription_cycle'` paga e com valor: o 1º mês
 * do checkout é 'subscription_create' e a fatura de troca de plano é 'subscription_update' — nenhuma das duas é renovação.
 * Assinatura que nasceu em teste (o de US$ 1, `trial_end` preenchido): a 1ª fatura de ciclo é a CONVERSÃO — o 1º mês
 * pago —, então ela sai da conta (o mesmo raciocínio do aviso de cobrança recusada: has_paid segura a porta do teste).
 */
export function paidRenewals(invoices: RenewalInvoiceFacts[] | null | undefined, trialEndSec: number | null | undefined): PaidRenewals {
  const paidAt = (i: RenewalInvoiceFacts): number => {
    const at = typeof i.status_transitions?.paid_at === 'number' ? i.status_transitions.paid_at : typeof i.created === 'number' ? i.created : 0
    return at * 1000
  }
  const cycles = (invoices ?? [])
    .filter((i) => Boolean(i) && i.status === 'paid' && i.billing_reason === 'subscription_cycle' && typeof i.amount_paid === 'number' && i.amount_paid > 0)
    .map(paidAt)
    .sort((a, b) => a - b)
  const trialConversion = typeof trialEndSec === 'number' && trialEndSec > 0 && cycles.length > 0
  const renewals = trialConversion ? cycles.slice(1) : cycles
  return {
    count: renewals.length,
    firstPaidAtMs: renewals.length ? renewals[0] : null,
    lastPaidAtMs: renewals.length ? renewals[renewals.length - 1] : null,
    cyclePaid: cycles.length,
    trialConversion,
  }
}

/**
 * O que a oferta do 2º mês exige ALÉM dos bloqueios de sempre (annualSwitchBlockers: ativa, mensal, USD, sem cupom, sem
 * cancelamento agendado, não interna…): fora do teste e com a 1ª renovação paga. Faturas que não deu para ler = bloqueio
 * (falha fechada: sem prova da renovação, a oferta não aparece nem cobra).
 */
export function month2SwitchBlockers(input: {
  status: string | null
  trialEndSec: number | null
  nowMs: number
  renewals: PaidRenewals | null
}): AnnualSwitchBlocker[] {
  const b: AnnualSwitchBlocker[] = []
  const trialRunning = input.status === 'trialing' || (typeof input.trialEndSec === 'number' && input.trialEndSec * 1000 > input.nowMs)
  if (trialRunning) b.push({ code: 'in_trial', message: 'A assinatura ainda está no teste; a oferta do 2º mês só vale depois da 1ª renovação paga.' })
  if (!input.renewals) {
    b.push({ code: 'renewals_unknown', message: 'Não deu para ler as faturas pagas na Stripe; sem a prova da renovação a oferta não vale (falha fechada).' })
  } else if (input.renewals.count < MONTH2_REQUIRED_RENEWALS) {
    b.push({
      code: 'no_renewal_yet',
      message: `Ainda não pagou nenhuma renovação (faturas de ciclo pagas: ${input.renewals.cyclePaid}${input.renewals.trialConversion ? ', a 1ª foi a conversão do teste' : ''}); a oferta é do 2º mês em diante.`,
    })
  }
  return b
}

// ─── a fatura (prévia ou real) ────────────────────────────────────────────────────────────────────────────────────

export type InvoiceLike = {
  id?: string | null
  billing_reason?: string | null
  status?: string | null
  amount_due?: number | null
  amount_paid?: number | null
  total?: number | null
  starting_balance?: number | null
  currency?: string | null
  lines?: { data?: Array<{ amount?: number | null; proration?: boolean | null; description?: string | null }> | null } | null
}

export type InvoiceSwitchSummary = {
  invoiceId: string | null
  billingReason: string | null
  status: string | null
  /** O mês já pago, devolvido (linhas de rateio negativas), em centavos positivos. */
  prorationCreditMinor: number
  /** O ano novo (linhas positivas). */
  annualLineMinor: number
  /** O que a fatura cobra (amount_due na prévia; amount_paid na real). */
  amountDueMinor: number
  amountPaidMinor: number
  totalMinor: number
  startingBalanceMinor: number
  lines: Array<{ amount: number; proration: boolean; description: string | null }>
}

export function invoiceSwitchSummary(invoice: InvoiceLike | null | undefined): InvoiceSwitchSummary | null {
  if (!invoice) return null
  const lines = (invoice.lines?.data ?? []).map((l) => ({
    amount: typeof l.amount === 'number' ? l.amount : 0,
    proration: l.proration === true,
    description: typeof l.description === 'string' ? l.description : null,
  }))
  const prorationCreditMinor = -lines.filter((l) => l.proration && l.amount < 0).reduce((s, l) => s + l.amount, 0)
  const annualLineMinor = lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0)
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return {
    invoiceId: typeof invoice.id === 'string' ? invoice.id : null,
    billingReason: typeof invoice.billing_reason === 'string' ? invoice.billing_reason : null,
    status: typeof invoice.status === 'string' ? invoice.status : null,
    prorationCreditMinor,
    annualLineMinor,
    amountDueMinor: num(invoice.amount_due),
    amountPaidMinor: num(invoice.amount_paid),
    totalMinor: num(invoice.total),
    startingBalanceMinor: num(invoice.starting_balance),
    lines,
  }
}

// ─── chaves, datas e a resposta ao cliente ────────────────────────────────────────────────────────────────────────

/** Chave do razão: uma troca por assinatura. A rota transforma em uuid (sha256), como o cron da recarga anual. */
export function annualSwitchEventKey(subscriptionId: string): string {
  return `${ANNUAL_SWITCH_EVENT}:${subscriptionId}`
}

/** Chave de idempotência da Stripe: mesma assinatura, mesmo item, mesmo valor, mesma janela de 10 min. */
export function annualSwitchIdempotencyKey(subscriptionId: string, itemId: string, annualMinor: number, nowMs: number): string {
  const window = Math.floor(nowMs / ANNUAL_SWITCH_IDEMPOTENCY_WINDOW_MS)
  return `kineo-annual-switch-v1:${subscriptionId}:${itemId}:${annualMinor}:${window}`
}

/** Até quando vale o reembolso integral (ANNUAL_REFUND_DAYS a partir da troca). */
export function annualSwitchRefundUntil(switchedAtMs: number): string {
  return new Date(switchedAtMs + ANNUAL_REFUND_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/** A 1ª recarga anual: um mês depois do início do período anual (o cron solta os meses 1..11). */
export function annualSwitchFirstRefillAt(periodStartMs: number): string {
  return new Date(addUtcMonths(periodStartMs, 1)).toISOString()
}

export function usdLabel(minor: number): string {
  return `$${(minor / 100).toFixed(2)}`
}

/** A resposta ao cliente depois do SEND (inglês, o valor REAL cobrado hoje). O fundador cola no rascunho da thread. */
export function annualSwitchCustomerReply(input: { chargedMinor: number }): string {
  return [
    "Done — you're now on the annual plan.",
    `We credited what you already paid this month, and your card was charged ${usdLabel(input.chargedMinor)} today.`,
    'Same plan, same credits as before, released every month.',
    `If you change your mind, you get a full refund within ${ANNUAL_REFUND_DAYS} days — just reply to this email.`,
  ].join(' ')
}
