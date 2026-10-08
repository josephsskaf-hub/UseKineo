// ═══ KINEO-ANUAL-NUCLEO-2026-10-08 — o núcleo ÚNICO da troca mensal → anual (Stripe, créditos, razão, idempotência) ═══
//
// POR QUE EXISTE: até 08/10 a troca morava inteira em app/api/admin/switch-to-annual/route.ts (a oferta de 40% dos
// primeiros assinantes, uma pessoa por chamada, só admin). Em 08/10 o fundador decidiu oferecer o anual a TODO assinante
// no 2º mês, com 30%, por autoatendimento (app/api/stripe/switch-to-annual). Duas rotas cobrando o cartão de um cliente
// com duas cópias do update da Stripe é como uma regra de dinheiro diverge em silêncio ("regra vive em vários
// arquivos"). Então a troca virou ESTE módulo, e as duas rotas só fazem o que é delas: quem pode chamar (admin × a
// própria pessoa), de onde vem o valor confirmado (o e-mail × a prévia) e o formato da resposta.
//
// O QUE É IGUAL PARA AS DUAS OFERTAS (e o guardião scripts/test-troca-anual-2026-10-07.mjs muta AQUI):
//   · o anual nasce no Product DA CASA (kineo_plan_<tier>, id fixo; o do checkout é inativo — KINEO-TROCA-ANUAL-
//     PRODUTO-DA-CASA-2026-10-08), com price_data anual, proration 'always_invoice' + billing_cycle_anchor 'now' (cobra
//     AGORA o ano menos o mês já pago) e payment_behavior 'error_if_incomplete' (cartão recusado = nada muda, 402);
//   · chave de idempotência da Stripe (janela de 10 min) + razão `plan_switched_to_annual` com id fixo por assinatura,
//     gravado ANTES da concessão: uma troca e UMA cota do mês por assinatura, para sempre;
//   · a cota do 1º mês do ano pago sai na troca pela régua da renovação (renewalBalance);
//   · a metadata fica igual à de uma anual do checkout (o cron da recarga e o webhook a reconhecem).
// O QUE MUDA POR OFERTA: o valor (ANNUAL_SWITCH_OFFER_RULES em lib/billing/annualSwitch.ts), o selo `annual_switch_offer`
// e, na do 2º mês, a exigência de uma renovação paga fora do teste (month2SwitchBlockers, lendo as faturas pagas).
//
// SERVIDOR APENAS: importa node:crypto e a Stripe. Nenhum componente 'use client' pode importar este arquivo (o guardião
// scripts/test-anual-2mes-2026-10-08.mjs confere).
import { createHash } from 'node:crypto'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { isInternalEmail } from '@/lib/internalAccounts'
import { renewalBalance } from '@/lib/credits/renewalBalance'
import type { CheckoutTier } from '@/lib/checkoutPricing'
import {
  ANNUAL_SWITCH_EVENT,
  ANNUAL_SWITCH_OFFER_RULES,
  ANNUAL_SWITCH_VERSION,
  annualSwitchBlockers,
  annualSwitchCredits,
  annualSwitchCustomerReply,
  annualSwitchEventKey,
  annualSwitchFirstRefillAt,
  annualSwitchIdempotencyKey,
  annualSwitchMetadata,
  annualSwitchRefundUntil,
  annualUsdForOffer,
  checkAnnualAmountForOffer,
  hasAnnualSwitchStamp,
  invoiceSwitchSummary,
  month2SwitchBlockers,
  paidRenewals,
  resolveSwitchTier,
  usdLabel,
  type AnnualSwitchBlocker,
  type AnnualSwitchCredits,
  type AnnualSwitchOfferId,
  type InvoiceLike,
  type PaidRenewals,
  type RenewalInvoiceFacts,
} from '@/lib/billing/annualSwitch'

/** As colunas do perfil que a troca lê (as duas rotas selecionam exatamente estas). */
export const ANNUAL_SWITCH_PROFILE_COLUMNS =
  'id, email, plan, is_pro, has_paid, video_credits, stripe_customer_id, stripe_subscription_id, paypal_subscription_id'

export type AnnualSwitchProfile = {
  id: string
  email?: string | null
  plan?: string | null
  is_pro?: boolean | null
  has_paid?: boolean | null
  video_credits?: number | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  paypal_subscription_id?: string | null
}

type Admin = SupabaseClient

/** uuid determinístico (sha256 da chave) — o mesmo desenho do cron annual-credit-refill. */
export function eventIdFor(key: string): string {
  const h = createHash('sha256').update(key).digest('hex').slice(0, 32)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function stripeErrorShape(e: unknown) {
  const err = (e ?? {}) as { type?: unknown; code?: unknown; decline_code?: unknown; statusCode?: unknown; message?: unknown; raw?: { message?: unknown } }
  const text = typeof err.message === 'string' ? err.message : typeof err.raw?.message === 'string' ? err.raw.message : String(e)
  return {
    type: typeof err.type === 'string' ? err.type : null,
    code: typeof err.code === 'string' ? err.code : null,
    decline_code: typeof err.decline_code === 'string' ? err.decline_code : null,
    status: typeof err.statusCode === 'number' ? err.statusCode : null,
    message: text.slice(0, 300),
  }
}

const idOf = (v: unknown): string | null =>
  typeof v === 'string' ? v : v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string' ? (v as { id: string }).id : null

// ── KINEO-TROCA-ANUAL-PRODUTO-DA-CASA-2026-10-08 ─────────────────────────────────────────────────────────────────────
// 1ª troca real (Rick, 08/10 ~00h30 BRT): a prévia da Stripe recusou com "The product prod_… is marked as inactive, and
// thus no new subscriptions can be created to any plans of this product". O checkout cria o Product do item mensal com
// product_data e esse Product não aceita preço novo. Na atualização de item a Stripe só aceita price_data com `product`
// (id), então o anual nasce no Product DA CASA para o plano, com id FIXO (kineo_plan_<tier>, metadata kineo_tier — o
// mesmo que o change-plan acha pela busca). Busca por id (sem o atraso do índice de busca da Stripe); criado UMA vez se
// faltar (id fixo + chave de idempotência). O ensaio pode criá-lo: é catálogo, sem preço e sem cobrança. Product da casa
// arquivado = recusa (409): reativar é decisão de quem cuida do catálogo, não desta rota.
const HOUSE_PRODUCT_PREFIX = 'kineo_plan_'
const HOUSE_PRODUCT_NAMES: Record<string, string> = { starter: 'Kineo Starter', basic: 'Kineo Creator', pro: 'Kineo Studio' }
type HouseProduct = { id: string; created: boolean }

async function houseProductFor(tier: string): Promise<HouseProduct | { inactive: true; id: string }> {
  const id = `${HOUSE_PRODUCT_PREFIX}${tier}`
  try {
    const found = await stripe.products.retrieve(id)
    if (found.active) return { id, created: false }
    return { inactive: true, id }
  } catch (e) {
    if ((e as { code?: unknown })?.code !== 'resource_missing') throw e
  }
  try {
    await stripe.products.create(
      { id, name: HOUSE_PRODUCT_NAMES[tier] ?? `Kineo ${tier}`, metadata: { kineo_tier: tier, kineo_source: 'switch-to-annual' } },
      { idempotencyKey: `kineo-house-product-v1:${id}` },
    )
  } catch (e) {
    // Dois cliques juntos: o outro pedido criou primeiro (mesmo id fixo) — reler e usar o que já existe.
    const again = await stripe.products.retrieve(id).catch(() => null)
    if (again?.active) return { id, created: false }
    throw e
  }
  return { id, created: true }
}

// ─── as faturas pagas (só a oferta do 2º mês lê) ──────────────────────────────────────────────────────────────────

/** Renovações pagas da assinatura (Stripe = fonte da verdade). null = não deu para ler → o bloqueio falha fechado. */
async function readPaidRenewals(sub: Stripe.Subscription): Promise<PaidRenewals | null> {
  try {
    const list = await stripe.invoices.list({ subscription: sub.id, status: 'paid', limit: 100 })
    const rows = ((list as unknown as { data?: unknown[] })?.data ?? []) as RenewalInvoiceFacts[]
    return paidRenewals(rows, typeof sub.trial_end === 'number' ? sub.trial_end : null)
  } catch (e) {
    const shape = stripeErrorShape(e)
    console.warn('[annual-switch] invoices.list failed (month-2 offer stays closed):', shape.type, shape.code)
    return null
  }
}

function renewalsReport(r: PaidRenewals | null) {
  return r
    ? {
        count: r.count,
        cycle_paid: r.cyclePaid,
        trial_conversion: r.trialConversion,
        first_paid_at: r.firstPaidAtMs ? new Date(r.firstPaidAtMs).toISOString() : null,
        last_paid_at: r.lastPaidAtMs ? new Date(r.lastPaidAtMs).toISOString() : null,
      }
    : null
}

// ─── os fatos da assinatura viva → créditos e bloqueios (iguais para as duas ofertas) ─────────────────────────────

type SwitchFacts = {
  items: Stripe.SubscriptionItem[]
  item: Stripe.SubscriptionItem | null
  price: Stripe.Price | null
  interval: string | null
  customerId: string | null
  metadata: Record<string, string>
  tier: CheckoutTier | null
  tierProblem: null | 'tier_unknown' | 'tier_mismatch' | 'tier_without_annual'
  productId: string | null
  priceMinor: number | null
  monthlyMinor: number | null
  currency: string | null
  discountCount: number
  expectedUsd: number | null
  credits: AnnualSwitchCredits | null
  blockers: AnnualSwitchBlocker[]
}

function switchFacts(profile: AnnualSwitchProfile, sub: Stripe.Subscription, offer: AnnualSwitchOfferId): SwitchFacts {
  const userId = profile.id
  const items = sub.items?.data ?? []
  const item = items[0] ?? null
  const price = item?.price ?? null
  const interval = price?.recurring?.interval ?? null
  const customerId = idOf(sub.customer)
  const metadata = (sub.metadata ?? {}) as Record<string, string>
  const tierPick = resolveSwitchTier(metadata.tier, profile.plan)
  const productId = idOf(price?.product)
  const priceMinor = typeof price?.unit_amount === 'number' ? price.unit_amount : null
  // A regra parte da MENSALIDADE: preço de item anual (ou semanal…) nunca vira "mensal" no relatório nem na conta.
  const monthlyMinor = interval === 'month' ? priceMinor : null
  const currency = typeof price?.currency === 'string' ? price.currency.toLowerCase() : null
  // `discount` (legado) também aparece em `discounts`: conta por id, sem dobrar.
  const discountIds = new Set([idOf(sub.discount), ...(sub.discounts ?? []).map(idOf), ...(item?.discounts ?? []).map(idOf)].filter((x): x is string => Boolean(x)))
  const discountCount = discountIds.size + (sub.discount && !idOf(sub.discount) ? 1 : 0)
  const ownerFromMeta = typeof metadata.supabase_user_id === 'string' ? metadata.supabase_user_id.trim() : ''
  const ownerMatches = (ownerFromMeta === '' || ownerFromMeta === userId) &&
    (!profile.stripe_customer_id || !customerId || profile.stripe_customer_id === customerId)
  const expectedUsd = annualUsdForOffer(offer, monthlyMinor)
  const credits = tierPick.tier && monthlyMinor && expectedUsd && currency
    ? annualSwitchCredits(tierPick.tier, monthlyMinor, expectedUsd * 100, currency)
    : null
  const blockers = annualSwitchBlockers({
    status: sub.status ?? null,
    itemCount: items.length,
    quantity: typeof item?.quantity === 'number' ? item.quantity : null,
    interval,
    intervalCount: price?.recurring?.interval_count ?? null,
    currency,
    monthlyMinor,
    collectionMethod: sub.collection_method ?? null,
    discountCount,
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    cancelAt: typeof sub.cancel_at === 'number' ? sub.cancel_at : null,
    hasSchedule: Boolean(sub.schedule),
    paused: Boolean(sub.pause_collection),
    ownerMatches,
    internalAccount: isInternalEmail(profile.email),
    tierProblem: tierPick.problem,
    credits,
  })
  if (!productId) blockers.push({ code: 'product_unknown', message: 'O item não tem Product na Stripe para o preço anual.' })
  return {
    items, item, price, interval, customerId, metadata,
    tier: tierPick.tier, tierProblem: tierPick.problem,
    productId, priceMinor, monthlyMinor, currency, discountCount, expectedUsd, credits, blockers,
  }
}

// ─── leitura sem escrita: o estado da oferta para a tela e para o cron ────────────────────────────────────────────

export type AnnualSwitchEvaluation =
  | { state: 'no_subscription'; reason: 'no_stripe_subscription' | 'paypal_subscription' }
  | { state: 'unavailable'; reason: 'ledger_read_failed' | 'stripe_read_failed' }
  | { state: 'already_switched'; source: 'ledger' | 'stripe' }
  | {
      state: 'evaluated'
      eligible: boolean
      blockers: AnnualSwitchBlocker[]
      subscriptionId: string
      subscriptionStatus: string | null
      tier: CheckoutTier | null
      monthlyMinor: number | null
      currency: string | null
      annualUsd: number | null
      annualMinor: number | null
      credits: AnnualSwitchCredits | null
      renewals: PaidRenewals | null
      currentPeriodEndMs: number | null
    }

/**
 * O que a troca DIRIA, sem trocar: razão, assinatura viva, regra do valor, créditos e bloqueios (e, com
 * requirePaidRenewal, as faturas pagas). Só leitura — nem Product da casa, nem prévia de fatura, nem banco. É o que o
 * GET do autoatendimento mostra e o que o cron do e-mail confere antes de oferecer.
 */
export async function evaluateAnnualSwitch(input: {
  admin: Admin
  profile: AnnualSwitchProfile
  offer: AnnualSwitchOfferId
  requirePaidRenewal: boolean
  nowMs?: number
}): Promise<AnnualSwitchEvaluation> {
  const { admin, profile } = input
  const subscriptionId = typeof profile.stripe_subscription_id === 'string' ? profile.stripe_subscription_id : ''
  if (!subscriptionId) return { state: 'no_subscription', reason: profile.paypal_subscription_id ? 'paypal_subscription' : 'no_stripe_subscription' }
  const ledgerRead = await admin.from('events').select('id').eq('id', eventIdFor(annualSwitchEventKey(subscriptionId))).maybeSingle()
  if (ledgerRead.error) return { state: 'unavailable', reason: 'ledger_read_failed' }
  if (ledgerRead.data) return { state: 'already_switched', source: 'ledger' }
  let liveSub: Stripe.Subscription
  try {
    liveSub = await stripe.subscriptions.retrieve(subscriptionId)
  } catch {
    return { state: 'unavailable', reason: 'stripe_read_failed' }
  }
  const facts = switchFacts(profile, liveSub, input.offer)
  if (facts.interval === 'year' && hasAnnualSwitchStamp(facts.metadata)) return { state: 'already_switched', source: 'stripe' }
  const blockers = [...facts.blockers]
  let renewals: PaidRenewals | null = null
  if (input.requirePaidRenewal) {
    renewals = await readPaidRenewals(liveSub)
    blockers.push(...month2SwitchBlockers({
      status: liveSub.status ?? null,
      trialEndSec: typeof liveSub.trial_end === 'number' ? liveSub.trial_end : null,
      nowMs: input.nowMs ?? Date.now(),
      renewals,
    }))
  }
  return {
    state: 'evaluated',
    eligible: blockers.length === 0,
    blockers,
    subscriptionId,
    subscriptionStatus: liveSub.status ?? null,
    tier: facts.tier,
    monthlyMinor: facts.monthlyMinor,
    currency: facts.currency,
    annualUsd: facts.expectedUsd,
    annualMinor: facts.expectedUsd !== null ? facts.expectedUsd * 100 : null,
    credits: facts.credits,
    renewals,
    currentPeriodEndMs: typeof liveSub.current_period_end === 'number' ? liveSub.current_period_end * 1000 : null,
  }
}

// ─── a troca (ensaio ou SEND) ─────────────────────────────────────────────────────────────────────────────────────

export type AnnualSwitchOutcomeKind =
  | 'no_subscription'
  | 'ledger_read_failed'
  | 'already_switched'
  | 'stripe_read_failed'
  | 'not_owner'
  | 'not_ready'
  | 'blocked'
  | 'amount_mismatch'
  | 'product_inactive'
  | 'product_failed'
  | 'preview'
  | 'preview_failed'
  | 'update_failed'
  | 'switched'

/** Os números que a tela do autoatendimento mostra (prévia e troca feita). */
export type AnnualSwitchSummary = {
  annualUsd: number
  annualMinor: number
  monthlyMinor: number
  prorationCreditMinor: number | null
  chargedNowMinor: number | null
  creditsPerMonth: number
  creditsBefore: number | null
  creditsAfter: number | null
  creditsGranted: boolean | null
  refundUntil: string
  firstRefillAt: string
}

export type AnnualSwitchOutcome = {
  kind: AnnualSwitchOutcomeKind
  status: number
  /** O corpo da rota do admin, exatamente (o autoatendimento monta o dele a partir de `kind`/`summary`). */
  body: Record<string, unknown>
  summary?: AnnualSwitchSummary
  blockers?: AnnualSwitchBlocker[]
  expectedUsd?: number | null
  stripeError?: ReturnType<typeof stripeErrorShape>
}

export type AnnualSwitchRunInput = {
  admin: Admin
  profile: AnnualSwitchProfile
  offer: AnnualSwitchOfferId
  send: boolean
  /** O anual que quem chama confirma: o do e-mail (admin) ou o da prévia que a pessoa viu (autoatendimento). */
  requestedAnnualUsd: unknown
  /** true: no ENSAIO sem valor pedido, vale o da regra (a pessoa ainda não viu o número). No SEND o valor é sempre exigido. */
  amountOptionalOnDryRun?: boolean
  /** Oferta do 2º mês: exige 1 renovação paga e assinatura fora do teste (lê as faturas pagas na Stripe). */
  requirePaidRenewal?: boolean
  /** `source` no razão (ex.: 'admin_switch_to_annual', 'self_service_switch_to_annual'). */
  source: string
  /** `path` da linha do razão em `events` (a rota que chamou). */
  path: string
  /** `switched_by` no razão: o e-mail do admin, ou 'self' no autoatendimento (sem PII). */
  switchedBy: string
  /** Campos a mais no razão (ex.: a superfície da tela). */
  ledgerExtra?: Record<string, unknown>
}

export async function runAnnualSwitch(input: AnnualSwitchRunInput): Promise<AnnualSwitchOutcome> {
  const { admin, profile } = input
  const userId = profile.id
  const send = input.send
  const mode = send ? 'SEND' : 'dry_run'
  const offerRule = ANNUAL_SWITCH_OFFER_RULES[input.offer]
  const subscriptionId = typeof profile.stripe_subscription_id === 'string' ? profile.stripe_subscription_id : ''
  if (!subscriptionId) {
    return { kind: 'no_subscription', status: 409, body: { error: profile.paypal_subscription_id ? 'paypal_subscription' : 'no_stripe_subscription' } }
  }

  // ── 4. idempotência (1): o razão desta assinatura já existe → já trocada, nada a cobrar ───────────────────────────
  const ledgerId = eventIdFor(annualSwitchEventKey(subscriptionId))
  const { data: ledger, error: ledgerError } = await admin.from('events').select('id, created_at, metadata').eq('id', ledgerId).maybeSingle()
  if (ledgerError) return { kind: 'ledger_read_failed', status: 500, body: { error: 'ledger_read_failed', detail: ledgerError.message, nothing_written: true } }
  if (ledger) {
    const record = (ledger.metadata ?? {}) as Record<string, unknown>
    // A concessão do mês da troca ficou pendente (o perfil não gravou, ou a marca não gravou): o SEND termina — e só
    // concede se o saldo ainda for o de antes. O ensaio só conta.
    const pending = record.credits_granted === false
    const finished = pending && send
      ? await finishPendingGrant({ admin, userId, ledgerId, record, customerId: profile.stripe_customer_id ?? null, subscriptionId })
      : null
    return {
      kind: 'already_switched',
      status: 200,
      body: {
        ok: true,
        mode,
        already_switched: true,
        source: 'ledger',
        switched_at: ledger.created_at ?? null,
        record,
        nothing_charged_now: true,
        credits_grant_pending: pending && !finished?.credits_granted,
        ...(finished ?? {}),
      },
    }
  }

  // ── 5. a assinatura viva na Stripe ───────────────────────────────────────────────────────────────────────────────
  let sub: Stripe.Subscription
  try {
    sub = await stripe.subscriptions.retrieve(subscriptionId)
  } catch (e) {
    return { kind: 'stripe_read_failed', status: 502, body: { error: 'stripe_read_failed', stripe: stripeErrorShape(e), nothing_written: true } }
  }
  const facts = switchFacts(profile, sub, input.offer)
  const { item, price, interval, customerId, metadata, productId, priceMinor, monthlyMinor, currency, discountCount, expectedUsd, credits } = facts
  const tierPick = { tier: facts.tier }

  // ── 6. idempotência (2): já anual com o selo desta ferramenta e sem razão → só completar o registro ──────────────
  if (interval === 'year' && hasAnnualSwitchStamp(metadata)) {
    if (metadata.supabase_user_id && metadata.supabase_user_id !== userId) {
      return { kind: 'not_owner', status: 409, body: { error: 'not_owner', mode, detail: 'A assinatura anual tem outro dono na metadata.', nothing_written: true } }
    }
    const latestId = idOf(sub.latest_invoice)
    let latest: InvoiceLike | null = typeof sub.latest_invoice === 'object' && sub.latest_invoice ? (sub.latest_invoice as unknown as InvoiceLike) : null
    if (!latest && latestId) {
      try { latest = (await stripe.invoices.retrieve(latestId)) as unknown as InvoiceLike } catch { latest = null }
    }
    const summary = invoiceSwitchSummary(latest)
    if (!send) {
      return {
        kind: 'already_switched',
        status: 200,
        body: {
          ok: true, mode, already_switched: true, source: 'stripe', ledger_missing: true, invoice: summary,
          note: 'A assinatura já está anual com o selo desta ferramenta e o razão não foi gravado. O SEND só completa o perfil e o razão — não chama a troca nem cobra.',
        },
      }
    }
    const tier = tierPick.tier
    const switchedAt = typeof sub.current_period_start === 'number' ? sub.current_period_start * 1000 : Date.now()
    // A cota decidida na troca está no selo (plan_credits = recarga anual por mês). Razão ausente quer dizer que a
    // concessão NÃO aconteceu (ela só roda depois do razão gravado), então completar concede — uma vez.
    const stampedQuota = Number(metadata.plan_credits)
    const repair = await recordSwitch({
      admin, userId, ledgerId, tier, customerId, subscriptionId, path: input.path,
      quota: Number.isInteger(stampedQuota) && stampedQuota > 0 ? stampedQuota : null,
      eventMetadata: {
        source: input.source,
        version: ANNUAL_SWITCH_VERSION,
        offer: metadata.annual_switch_offer || input.offer,
        rule: offerRule.rule,
        completed_after_partial_failure: true,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        tier,
        monthly_minor: Number(metadata.annual_switch_from_monthly_minor) || null,
        annual_minor: Number(metadata.annual_switch_annual_minor) || null,
        currency: price?.currency ?? null,
        stripe_invoice_id: summary?.invoiceId ?? latestId,
        invoice_billing_reason: summary?.billingReason ?? null,
        invoice_status: summary?.status ?? null,
        proration_credit_minor: summary?.prorationCreditMinor ?? null,
        amount_charged_minor: summary ? summary.amountPaidMinor : null,
        refund_until: annualSwitchRefundUntil(switchedAt),
        switched_by: input.switchedBy,
        ...(input.ledgerExtra ?? {}),
      },
    })
    return { kind: 'already_switched', status: 200, body: { ok: true, mode, already_switched: true, source: 'stripe', completed_record: true, nothing_charged_now: true, ...repair } }
  }

  // ── 7. fatos, créditos, bloqueios (+ a renovação paga, na oferta do 2º mês) ──────────────────────────────────────
  const blockers = facts.blockers
  let renewals: PaidRenewals | null = null
  if (input.requirePaidRenewal) {
    renewals = await readPaidRenewals(sub)
    blockers.push(...month2SwitchBlockers({
      status: sub.status ?? null,
      trialEndSec: typeof sub.trial_end === 'number' ? sub.trial_end : null,
      nowMs: Date.now(),
      renewals,
    }))
  }
  // O que a troca faz com o saldo (regra da renovação): o ensaio mostra; o SEND relê o saldo na hora de conceder.
  const balanceNow = Number(profile.video_credits ?? 0)
  const grantPreview = credits ? renewalBalance(balanceNow, credits.perMonthAfter) : null
  const creditsReport = credits && grantPreview
    ? { ...credits, balanceBefore: balanceNow, balanceAfter: grantPreview.balance, balanceCarried: grantPreview.carried }
    : credits

  const report = {
    person: { user_id: userId, plan: profile.plan ?? null, credits_now: Number(profile.video_credits ?? 0) },
    subscription: {
      id: subscriptionId,
      status: sub.status ?? null,
      tier: tierPick.tier,
      interval,
      currency,
      price_minor: priceMinor,
      monthly_minor: monthlyMinor,
      monthly_usd: monthlyMinor !== null ? usdLabel(monthlyMinor) : null,
      current_period_end: typeof sub.current_period_end === 'number' ? new Date(sub.current_period_end * 1000).toISOString() : null,
      discounts: discountCount,
      cancel_at_period_end: sub.cancel_at_period_end === true,
      ...(input.requirePaidRenewal ? { paid_renewals: renewalsReport(renewals) } : {}),
    },
    offer: { id: input.offer, rule: offerRule.rule, requested_annual_usd: input.requestedAnnualUsd ?? null, expected_annual_usd: expectedUsd },
    credits: creditsReport,
  }

  if (blockers.length > 0) {
    if (send) return { kind: 'blocked', status: 409, blockers, body: { error: 'blocked', mode, blockers, ...report, nothing_written: true } }
    return { kind: 'not_ready', status: 200, blockers, body: { ok: true, mode, ready_to_send: false, blockers, ...report } }
  }

  // ── 8. a regra do valor: exatamente o que a oferta promete (o e-mail no admin; a prévia no autoatendimento) ───────
  const requested = input.amountOptionalOnDryRun && !send && (input.requestedAnnualUsd === undefined || input.requestedAnnualUsd === null)
    ? expectedUsd
    : input.requestedAnnualUsd
  const rule = checkAnnualAmountForOffer(input.offer, monthlyMinor, requested)
  if (!rule.ok) {
    return {
      kind: 'amount_mismatch',
      status: 422,
      expectedUsd: rule.expectedUsd,
      body: {
        error: 'annual_amount_mismatch',
        mode,
        reason: rule.reason,
        requested: rule.requested ?? null,
        expected_annual_usd: rule.expectedUsd,
        monthly_minor: monthlyMinor,
        rule: offerRule.rule,
        ...report,
        nothing_written: true,
      },
    }
  }
  const tier = tierPick.tier!
  const annualMinor = rule.annualMinor
  const switchCredits = credits!
  const newMetadata = annualSwitchMetadata({ existing: metadata, userId, tier, planCredits: switchCredits.perMonthAfter, monthlyMinor: monthlyMinor!, annualMinor, offer: input.offer })
  // O anual nasce no Product da casa (KINEO-TROCA-ANUAL-PRODUTO-DA-CASA-2026-10-08), nunca no Product do item mensal.
  let houseProduct: HouseProduct
  try {
    const hp = await houseProductFor(tier)
    if ('inactive' in hp) {
      return {
        kind: 'product_inactive',
        status: 409,
        body: {
          error: 'house_product_inactive',
          mode,
          product: hp.id,
          hint: 'O Product da casa deste plano está arquivado na Stripe. Reative-o no catálogo de produtos e rode o ensaio de novo.',
          ...report,
          nothing_written: true,
        },
      }
    }
    houseProduct = hp
  } catch (e) {
    return { kind: 'product_failed', status: 502, body: { error: 'stripe_product_failed', mode, stripe: stripeErrorShape(e), ...report, nothing_written: true } }
  }
  const annualItem = {
    id: item!.id,
    price_data: { currency: 'usd', product: houseProduct.id, unit_amount: annualMinor, recurring: { interval: 'year' as const } },
    quantity: 1,
  }
  const PRORATION = 'always_invoice' as const

  // ── 9. ENSAIO: prévia da fatura, nenhuma escrita ─────────────────────────────────────────────────────────────────
  if (!send) {
    let preview: InvoiceLike
    try {
      preview = (await stripe.invoices.createPreview({
        customer: customerId ?? undefined,
        subscription: subscriptionId,
        subscription_details: { items: [annualItem], proration_behavior: PRORATION, billing_cycle_anchor: 'now' },
      })) as unknown as InvoiceLike
    } catch (e) {
      return { kind: 'preview_failed', status: 502, body: { error: 'stripe_preview_failed', mode, stripe: stripeErrorShape(e), ...report, nothing_written: true } }
    }
    const summary = invoiceSwitchSummary(preview)
    const previewAtMs = Date.now()
    return {
      kind: 'preview',
      status: 200,
      summary: {
        annualUsd: rule.annualUsd,
        annualMinor,
        monthlyMinor: monthlyMinor!,
        prorationCreditMinor: summary ? summary.prorationCreditMinor : null,
        chargedNowMinor: summary ? summary.amountDueMinor : null,
        creditsPerMonth: switchCredits.perMonthAfter,
        creditsBefore: grantPreview ? balanceNow : null,
        creditsAfter: grantPreview ? grantPreview.balance : null,
        creditsGranted: null,
        refundUntil: annualSwitchRefundUntil(previewAtMs),
        firstRefillAt: annualSwitchFirstRefillAt(previewAtMs),
      },
      body: {
        ok: true,
        mode,
        ready_to_send: true,
        blockers: [],
        ...report,
        annual: { usd: rule.annualUsd, minor: annualMinor, label: usdLabel(annualMinor) },
        product: { id: houseProduct.id, created_now: houseProduct.created, monthly_item_product: productId },
        preview: summary && {
          ...summary,
          proration_credit: usdLabel(summary.prorationCreditMinor),
          charged_now: usdLabel(summary.amountDueMinor),
        },
        metadata_to_write: newMetadata,
        refund_until_if_sent_now: annualSwitchRefundUntil(previewAtMs),
        first_refill_if_sent_now: annualSwitchFirstRefillAt(previewAtMs),
        send_with: { userId, annualAmountUsd: rule.annualUsd, confirm: 'SEND' },
      },
    }
  }

  // ── 10. SEND: a troca na Stripe (falha = nada gravado) ───────────────────────────────────────────────────────────
  const nowMs = Date.now()
  let updated: Stripe.Subscription
  try {
    updated = await stripe.subscriptions.update(subscriptionId, {
      items: [annualItem],
      proration_behavior: PRORATION,
      billing_cycle_anchor: 'now',
      payment_behavior: 'error_if_incomplete',
      metadata: newMetadata,
      expand: ['latest_invoice'],
    }, { idempotencyKey: annualSwitchIdempotencyKey(subscriptionId, item!.id, annualMinor, nowMs) })
  } catch (e) {
    const shape = stripeErrorShape(e)
    console.error('[annual-switch] stripe update failed:', input.source, shape.type, shape.code, shape.decline_code)
    return {
      kind: 'update_failed',
      status: shape.type === 'StripeCardError' ? 402 : 502,
      stripeError: shape,
      body: {
        error: 'stripe_update_failed',
        mode,
        stripe: shape,
        nothing_written: true,
        hint: 'A Stripe recusou a troca; a assinatura segue mensal e nada foi gravado aqui. Cartão recusado: a pessoa atualiza o cartão e você roda o ensaio de novo (depois de 10 min). Erro de rede: rode o ENSAIO — se ela já aparecer anual, o SEND só completa o registro, sem cobrar de novo.',
      },
    }
  }

  let invoice: InvoiceLike | null = typeof updated.latest_invoice === 'object' && updated.latest_invoice ? (updated.latest_invoice as unknown as InvoiceLike) : null
  const invoiceId = idOf(updated.latest_invoice)
  if (!invoice && invoiceId) {
    try { invoice = (await stripe.invoices.retrieve(invoiceId)) as unknown as InvoiceLike } catch { invoice = null }
  }
  const summary = invoiceSwitchSummary(invoice)
  const updatedPrice = updated.items?.data?.[0]?.price ?? null
  const stripeResultOk = updatedPrice?.recurring?.interval === 'year' && updatedPrice?.unit_amount === annualMinor
  const periodStartMs = typeof updated.current_period_start === 'number' ? updated.current_period_start * 1000 : nowMs
  const chargedMinor = summary ? summary.amountPaidMinor : 0
  const recorded = await recordSwitch({
    admin, userId, ledgerId, tier, customerId, subscriptionId, path: input.path,
    quota: switchCredits.perMonthAfter,
    eventMetadata: {
      source: input.source,
      version: ANNUAL_SWITCH_VERSION,
      offer: input.offer,
      rule: offerRule.rule,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      tier,
      monthly_minor: monthlyMinor,
      annual_minor: annualMinor,
      currency: 'usd',
      stripe_invoice_id: summary?.invoiceId ?? invoiceId,
      invoice_billing_reason: summary?.billingReason ?? null,
      invoice_status: summary?.status ?? null,
      proration_credit_minor: summary?.prorationCreditMinor ?? null,
      amount_charged_minor: chargedMinor,
      credits_per_month: switchCredits.perMonthAfter,
      period_start: new Date(periodStartMs).toISOString(),
      first_refill_at: annualSwitchFirstRefillAt(periodStartMs),
      refund_until: annualSwitchRefundUntil(nowMs),
      stripe_result_ok: stripeResultOk,
      switched_by: input.switchedBy,
      ...(input.requirePaidRenewal ? { paid_renewals: renewalsReport(renewals) } : {}),
      ...(input.ledgerExtra ?? {}),
    },
  })
  if (recorded.warnings.length) console.error('[annual-switch] switched with warnings:', input.source, subscriptionId, recorded.warnings.join(' | '))

  return {
    kind: 'switched',
    status: 200,
    summary: {
      annualUsd: rule.annualUsd,
      annualMinor,
      monthlyMinor: monthlyMinor!,
      prorationCreditMinor: summary ? summary.prorationCreditMinor : null,
      chargedNowMinor: chargedMinor,
      creditsPerMonth: switchCredits.perMonthAfter,
      creditsBefore: recorded.credits_before,
      creditsAfter: recorded.credits_after,
      creditsGranted: recorded.credits_granted,
      refundUntil: annualSwitchRefundUntil(nowMs),
      firstRefillAt: annualSwitchFirstRefillAt(periodStartMs),
    },
    body: {
      ok: true,
      mode,
      switched: true,
      stripe_result_ok: stripeResultOk,
      annual: { usd: rule.annualUsd, minor: annualMinor, label: usdLabel(annualMinor) },
      charged_now: { minor: chargedMinor, label: usdLabel(chargedMinor) },
      invoice: summary,
      credits: switchCredits,
      metadata_written: newMetadata,
      refund_until: annualSwitchRefundUntil(nowMs),
      first_refill_at: annualSwitchFirstRefillAt(periodStartMs),
      customer_reply_en: annualSwitchCustomerReply({ chargedMinor }),
      ...recorded,
    },
  }
}

type SwitchRecordResult = {
  ledger_written: boolean
  profile_updated: boolean
  credits_granted: boolean
  credits_before: number | null
  credits_after: number | null
  credits_carried: number | null
  warnings: string[]
}

/** Plano e ids da assinatura anual no perfil (o mesmo que o checkout grava), sem os créditos. */
function profilePatchFor(input: { tier: string | null; customerId: string | null; subscriptionId: string }): Record<string, unknown> {
  const patch: Record<string, unknown> = { is_pro: true, has_paid: true, stripe_subscription_id: input.subscriptionId }
  if (input.tier) patch.plan = input.tier
  if (input.customerId) patch.stripe_customer_id = input.customerId
  return patch
}

/**
 * Depois que a Stripe trocou, nesta ordem: (1) o saldo lido na hora; (2) o RAZÃO (id determinístico, a "reserva" da
 * concessão: se outro pedido já o gravou, este não concede nada); (3) UMA escrita no perfil com plano, ids e a cota do
 * mês da troca pela régua da renovação; (4) a marca credits_granted no razão. Sem razão gravado não há concessão —
 * é isso que deixa o caminho "completar o registro" conceder sem risco de dobrar. Falha aqui não desfaz a cobrança:
 * volta na resposta, e o próximo SEND termina o que faltou, sem chamar a troca de novo.
 */
async function recordSwitch(input: {
  admin: Admin
  userId: string
  ledgerId: string
  tier: string | null
  customerId: string | null
  subscriptionId: string
  /** A rota que chamou (a linha do razão em `events`). */
  path: string
  /** Créditos por mês do plano anual (a recarga do cron); null = não dá para conceder (o razão diz). */
  quota: number | null
  eventMetadata: Record<string, unknown>
}): Promise<SwitchRecordResult> {
  const warnings: string[] = []
  const none = { credits_before: null, credits_after: null, credits_carried: null }
  const { data: fresh, error: readError } = await input.admin.from('profiles').select('video_credits').eq('id', input.userId).maybeSingle()
  if (readError || !fresh) {
    warnings.push(`saldo não lido (${readError?.message ?? 'perfil sumiu'}); a Stripe JÁ trocou. Rode o SEND de novo: ele só completa o registro, sem cobrar outra vez.`)
    return { ledger_written: false, profile_updated: false, credits_granted: false, ...none, warnings }
  }
  const before = Number(fresh.video_credits ?? 0)
  const grant = input.quota !== null ? renewalBalance(before, input.quota) : null
  const ledgerMetadata: Record<string, unknown> = {
    ...input.eventMetadata,
    credits_quota: input.quota,
    credits_before: before,
    credits_after: grant ? grant.balance : before,
    credits_carried: grant ? grant.carried : 0,
    credits_granted: false,
  }
  const { error: ledgerError } = await input.admin.from('events').insert({
    id: input.ledgerId,
    name: ANNUAL_SWITCH_EVENT,
    user_id: input.userId,
    path: input.path,
    session_id: null,
    metadata: ledgerMetadata,
  })
  if (ledgerError) {
    if (ledgerError.code === '23505') {
      warnings.push('outro pedido gravou o razão desta troca primeiro; a concessão do mês é dele (nada concedido aqui).')
      return { ledger_written: true, profile_updated: false, credits_granted: false, ...none, warnings }
    }
    warnings.push(`razão não gravado (${ledgerError.message}); nada foi concedido. A Stripe JÁ trocou: rode o SEND de novo — ele completa o registro e a cota do mês, sem cobrar outra vez.`)
    return { ledger_written: false, profile_updated: false, credits_granted: false, ...none, warnings }
  }
  const patch = profilePatchFor(input)
  if (grant) patch.video_credits = grant.balance
  const { data: updated, error: profileError } = await input.admin.from('profiles').update(patch).eq('id', input.userId).select('id').maybeSingle()
  if (profileError || !updated) {
    warnings.push(`perfil não gravado (${profileError?.message ?? 'perfil sumiu'}); a cota do mês ficou pendente no razão. Rode o SEND de novo: ele concede só se o saldo ainda for ${before}.`)
    return { ledger_written: true, profile_updated: false, credits_granted: false, credits_before: before, credits_after: grant ? grant.balance : before, credits_carried: grant ? grant.carried : 0, warnings }
  }
  const granted = grant !== null
  if (!granted) warnings.push('sem a cota do plano no selo da assinatura: o saldo não foi tocado; confira em /admin/people.')
  const { error: markError } = await input.admin.from('events').update({ metadata: { ...ledgerMetadata, credits_granted: granted, credits_granted_at: new Date().toISOString() } }).eq('id', input.ledgerId)
  if (markError) warnings.push(`a cota foi concedida, mas a marca no razão não gravou (${markError.message}); o próximo SEND confere pelo saldo e não concede de novo.`)
  return { ledger_written: true, profile_updated: true, credits_granted: granted, credits_before: before, credits_after: grant ? grant.balance : before, credits_carried: grant ? grant.carried : 0, warnings }
}

/**
 * Razão com credits_granted=false: a escrita do perfil falhou (nada concedido) OU a marca falhou depois de conceder.
 * Compare-and-set no saldo de ANTES: só concede se ninguém concedeu; se o saldo já é o de depois, só marca. Saldo
 * diferente dos dois = ambíguo (concedeu e a pessoa gastou, ou o saldo mudou por outro motivo) → não concede, avisa.
 */
async function finishPendingGrant(input: {
  admin: Admin
  userId: string
  ledgerId: string
  record: Record<string, unknown>
  customerId: string | null
  subscriptionId: string
}): Promise<{ credits_granted: boolean; warnings: string[] }> {
  const before = input.record.credits_before
  const after = input.record.credits_after
  if (typeof before !== 'number' || typeof after !== 'number' || input.record.credits_quota === null) {
    return { credits_granted: false, warnings: ['o razão não tem os números da concessão; confira o saldo em /admin/people.'] }
  }
  const patch = profilePatchFor({ tier: typeof input.record.tier === 'string' ? input.record.tier : null, customerId: input.customerId, subscriptionId: input.subscriptionId })
  patch.video_credits = after
  const { data: rows, error } = await input.admin.from('profiles').update(patch).eq('id', input.userId).eq('video_credits', before).select('id')
  if (error) return { credits_granted: false, warnings: [`perfil não gravado (${error.message}); rode o SEND de novo.`] }
  let granted = Array.isArray(rows) && rows.length > 0
  if (!granted) {
    const { data: now } = await input.admin.from('profiles').select('video_credits').eq('id', input.userId).maybeSingle()
    granted = Number(now?.video_credits) === after
    if (!granted) {
      return {
        credits_granted: false,
        warnings: [`a cota do mês da troca está pendente e o saldo mudou (era ${before}, a troca levaria a ${after}, hoje ${now?.video_credits ?? '?'}): nada concedido para não dobrar — confira e conceda à mão em /admin/people se faltou.`],
      }
    }
  }
  await input.admin.from('events').update({ metadata: { ...input.record, credits_granted: true, credits_granted_at: new Date().toISOString(), credits_granted_on_retry: true } }).eq('id', input.ledgerId)
  return { credits_granted: true, warnings: [] }
}
