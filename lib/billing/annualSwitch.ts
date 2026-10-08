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
// CRÉDITOS: os de hoje ficam (nada é concedido na troca; a fatura da troca chega ao webhook como
// billing_reason='subscription_update' e sai ANTES do grant de renovação). Os mensais seguem pela recarga anual a
// partir do mês seguinte à troca. Se a recarga anual daria MENOS créditos por mês do que a renovação mensal dá hoje
// (ex.: Studio a US$ 39,90 → 300 hoje, 180 pela escada legada do anual de US$ 287), a troca é BLOQUEADA: "same
// credits as today" é parte da promessa.
import {
  ANNUAL_REFUND_DAYS,
  type CheckoutTier,
} from '@/lib/checkoutPricing'
import { addUtcMonths, annualRefillCredits, annualTierFromMetadata } from '@/lib/billing/annualRefill'
import { renewalCreditsForInvoice } from '@/lib/settlementCurrency'

export const ANNUAL_SWITCH_VERSION = 'annual_switch_v1' as const
/** Razão em `events` (id determinístico por assinatura → uma troca por assinatura, para sempre). */
export const ANNUAL_SWITCH_EVENT = 'plan_switched_to_annual' as const
/** A oferta de 05/10 que esta ferramenta cumpre. */
export const ANNUAL_SWITCH_OFFER = 'first_subscribers_annual_40_2026_10_05' as const
/** A frase da regra, como aparece no ensaio e no evento. */
export const ANNUAL_SWITCH_RULE = 'round(monthly x 12 x 0.6) to the nearest dollar, half up' as const
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

export type AnnualAmountCheck =
  | { ok: true; annualUsd: number; annualMinor: number; expectedUsd: number }
  | { ok: false; reason: 'invalid_amount' | 'monthly_unknown' | 'mismatch'; expectedUsd: number | null; requested: unknown }

/** O valor pedido tem de ser EXATAMENTE o que o e-mail prometeu para este mensal. */
export function checkAnnualAmount(monthlyMinor: number | null | undefined, requested: unknown): AnnualAmountCheck {
  const expectedUsd = offerAnnualUsd(monthlyMinor)
  const n = typeof requested === 'number' ? requested : typeof requested === 'string' && requested.trim() ? Number(requested) : NaN
  if (!Number.isInteger(n) || n <= 0) return { ok: false, reason: 'invalid_amount', expectedUsd, requested }
  if (expectedUsd === null) return { ok: false, reason: 'monthly_unknown', expectedUsd, requested }
  if (n !== expectedUsd) return { ok: false, reason: 'mismatch', expectedUsd, requested }
  return { ok: true, annualUsd: n, annualMinor: n * 100, expectedUsd }
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
}): Record<string, string> {
  const existing = input.existing ?? {}
  return {
    ...existing,
    supabase_user_id: input.userId,
    tier: input.tier,
    plan_credits: String(input.planCredits),
    price_region: existing.price_region || 'standard',
    annual_switch_version: ANNUAL_SWITCH_VERSION,
    annual_switch_offer: ANNUAL_SWITCH_OFFER,
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
  if (f.currency !== 'usd') add('currency_not_usd', `A assinatura cobra em ${String(f.currency ?? '?').toUpperCase()}; a oferta de 05/10 é em dólar.`)
  if (f.interval === 'month' && (f.monthlyMinor === null || f.monthlyMinor <= 0)) add('monthly_unknown', 'Sem valor mensal na Stripe para aplicar a regra.')
  if (f.collectionMethod !== 'charge_automatically') add('collection_method', 'A assinatura não cobra o cartão automaticamente; a troca precisa cobrar agora.')
  if (f.discountCount > 0) add('subscription_has_discount', 'Há cupom ativo na assinatura: ele cairia por cima do anual (que já tem os 40%). Remova o cupom na Stripe e rode o ensaio de novo.')
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
