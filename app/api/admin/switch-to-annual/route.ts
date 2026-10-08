// ═══ KINEO-TROCA-ANUAL-2026-10-07 — cumprir a oferta "troque para o anual" dos primeiros assinantes ═══════════════
//
// POST /api/admin/switch-to-annual { userId, annualAmountUsd, confirm }
//
// POR QUE EXISTE: em 05/10 o fundador ofereceu a 9 assinantes mensais o anual com 40% de desconto — "just reply YES
// and I'll switch your subscription myself". O primeiro SIM chegou em 07/10 e não havia como cumprir: o
// /api/stripe/change-plan recusa anual (409 annual_needs_support) e trocar à mão no painel da Stripe não carimba a
// metadata que o cron da recarga anual e o webhook leem. Regra pura, valores e porquês: lib/billing/annualSwitch.ts.
// Passo a passo e estorno: docs/TROCA-ANUAL-PRIMEIROS-ASSINANTES-2026-10-07.md.
//
// COMO FUNCIONA (uma pessoa por chamada, só admin logado):
//   · sem confirm='SEND' é ENSAIO: lê o perfil e a assinatura, aplica a regra do valor, mostra o que bloquearia, pede
//     à Stripe a PRÉVIA da fatura (crédito do mês já pago + o que seria cobrado agora) e devolve a metadata que seria
//     gravada. Nenhuma escrita: nem na Stripe, nem no banco.
//   · confirm='SEND': troca o ITEM da assinatura para price_data anual (o mesmo jeito do change-plan, sem Price de
//     painel; o Product é o do item atual), proration 'always_invoice' + billing_cycle_anchor 'now' (cobra AGORA o ano
//     novo menos o mês já pago) e payment_behavior 'error_if_incomplete' (cartão recusado = a Stripe não troca nada
//     e devolve 402). Depois grava o perfil (plano, sem tocar nos créditos) e o evento plan_switched_to_annual.
//   · idempotente: o razão tem id determinístico por assinatura (2ª execução responde "já trocada" sem chamar a
//     Stripe); se o razão faltar mas a assinatura já estiver anual com o selo desta ferramenta, o SEND só completa o
//     registro, sem cobrar; e a chamada de troca leva chave de idempotência da Stripe (janela de 10 min).
//   · falha da Stripe = nada gravado e erro claro (tipo, código, motivo da recusa).
//
// SEM CRON DE PROPÓSITO: cada execução cobra o cartão de um cliente e exige o "vai" do fundador para AQUELA pessoa.
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import type Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { isInternalEmail } from '@/lib/internalAccounts'
import { isAdminEmail, serviceClient } from '../_shared/db'
import {
  ANNUAL_SWITCH_EVENT,
  ANNUAL_SWITCH_OFFER,
  ANNUAL_SWITCH_RULE,
  ANNUAL_SWITCH_VERSION,
  annualSwitchBlockers,
  annualSwitchCredits,
  annualSwitchCustomerReply,
  annualSwitchEventKey,
  annualSwitchFirstRefillAt,
  annualSwitchIdempotencyKey,
  annualSwitchMetadata,
  annualSwitchRefundUntil,
  checkAnnualAmount,
  hasAnnualSwitchStamp,
  invoiceSwitchSummary,
  offerAnnualUsd,
  resolveSwitchTier,
  usdLabel,
  type InvoiceLike,
} from '@/lib/billing/annualSwitch'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const ROUTE_PATH = '/api/admin/switch-to-annual'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** uuid determinístico (sha256 da chave) — o mesmo desenho do cron annual-credit-refill. */
function eventIdFor(key: string): string {
  const h = createHash('sha256').update(key).digest('hex').slice(0, 32)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function stripeErrorShape(e: unknown) {
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

export async function POST(req: Request) {
  // ── 1. só admin ──────────────────────────────────────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = serviceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 })

  // ── 2. pedido ────────────────────────────────────────────────────────────────────────────────────────────────────
  const body = (await req.json().catch(() => ({}))) as { userId?: unknown; annualAmountUsd?: unknown; confirm?: unknown }
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!UUID.test(userId)) return NextResponse.json({ error: 'invalid_user_id', hint: 'userId = profiles.id (uuid).' }, { status: 400 })
  const send = body.confirm === 'SEND'
  const mode = send ? 'SEND' : 'dry_run'

  // ── 3. perfil ────────────────────────────────────────────────────────────────────────────────────────────────────
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, plan, is_pro, has_paid, video_credits, stripe_customer_id, stripe_subscription_id, paypal_subscription_id')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) return NextResponse.json({ error: 'profile_read_failed', detail: profileError.message }, { status: 500 })
  if (!profile) return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
  const subscriptionId = typeof profile.stripe_subscription_id === 'string' ? profile.stripe_subscription_id : ''
  if (!subscriptionId) {
    return NextResponse.json({ error: profile.paypal_subscription_id ? 'paypal_subscription' : 'no_stripe_subscription' }, { status: 409 })
  }

  // ── 4. idempotência (1): o razão desta assinatura já existe → já trocada, nada a cobrar ───────────────────────────
  const ledgerId = eventIdFor(annualSwitchEventKey(subscriptionId))
  const { data: ledger, error: ledgerError } = await admin.from('events').select('id, created_at, metadata').eq('id', ledgerId).maybeSingle()
  if (ledgerError) return NextResponse.json({ error: 'ledger_read_failed', detail: ledgerError.message, nothing_written: true }, { status: 500 })
  if (ledger) {
    return NextResponse.json({
      ok: true,
      mode,
      already_switched: true,
      source: 'ledger',
      switched_at: ledger.created_at ?? null,
      record: ledger.metadata ?? null,
      nothing_charged_now: true,
    })
  }

  // ── 5. a assinatura viva na Stripe ───────────────────────────────────────────────────────────────────────────────
  let sub: Stripe.Subscription
  try {
    sub = await stripe.subscriptions.retrieve(subscriptionId)
  } catch (e) {
    return NextResponse.json({ error: 'stripe_read_failed', stripe: stripeErrorShape(e), nothing_written: true }, { status: 502 })
  }
  const items = sub.items?.data ?? []
  const item = items[0] ?? null
  const price = item?.price ?? null
  const interval = price?.recurring?.interval ?? null
  const customerId = idOf(sub.customer)
  const metadata = (sub.metadata ?? {}) as Record<string, string>
  const tierPick = resolveSwitchTier(metadata.tier, profile.plan)
  const productId = idOf(price?.product)

  // ── 6. idempotência (2): já anual com o selo desta ferramenta e sem razão → só completar o registro ──────────────
  if (interval === 'year' && hasAnnualSwitchStamp(metadata)) {
    if (metadata.supabase_user_id && metadata.supabase_user_id !== userId) {
      return NextResponse.json({ error: 'not_owner', mode, detail: 'A assinatura anual tem outro dono na metadata.', nothing_written: true }, { status: 409 })
    }
    const latestId = idOf(sub.latest_invoice)
    let latest: InvoiceLike | null = typeof sub.latest_invoice === 'object' && sub.latest_invoice ? (sub.latest_invoice as unknown as InvoiceLike) : null
    if (!latest && latestId) {
      try { latest = (await stripe.invoices.retrieve(latestId)) as unknown as InvoiceLike } catch { latest = null }
    }
    const summary = invoiceSwitchSummary(latest)
    if (!send) {
      return NextResponse.json({
        ok: true, mode, already_switched: true, source: 'stripe', ledger_missing: true, invoice: summary,
        note: 'A assinatura já está anual com o selo desta ferramenta e o razão não foi gravado. O SEND só completa o perfil e o razão — não chama a troca nem cobra.',
      })
    }
    const tier = tierPick.tier
    const switchedAt = typeof sub.current_period_start === 'number' ? sub.current_period_start * 1000 : Date.now()
    const repair = await recordSwitch({
      admin, userId, ledgerId, tier, customerId, subscriptionId,
      eventMetadata: {
        source: 'admin_switch_to_annual',
        version: ANNUAL_SWITCH_VERSION,
        offer: ANNUAL_SWITCH_OFFER,
        rule: ANNUAL_SWITCH_RULE,
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
        credits_balance_untouched: Number(profile.video_credits ?? 0),
        refund_until: annualSwitchRefundUntil(switchedAt),
        switched_by: user.email ?? 'admin',
      },
    })
    return NextResponse.json({ ok: true, mode, already_switched: true, source: 'stripe', completed_record: true, nothing_charged_now: true, ...repair })
  }

  // ── 7. fatos, créditos, bloqueios ────────────────────────────────────────────────────────────────────────────────
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
  const expectedUsd = offerAnnualUsd(monthlyMinor)
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
    },
    offer: { rule: ANNUAL_SWITCH_RULE, requested_annual_usd: body.annualAmountUsd ?? null, expected_annual_usd: expectedUsd },
    credits,
  }

  if (blockers.length > 0) {
    if (send) return NextResponse.json({ error: 'blocked', mode, blockers, ...report, nothing_written: true }, { status: 409 })
    return NextResponse.json({ ok: true, mode, ready_to_send: false, blockers, ...report })
  }

  // ── 8. a regra do valor: exatamente o que o e-mail prometeu ──────────────────────────────────────────────────────
  const rule = checkAnnualAmount(monthlyMinor, body.annualAmountUsd)
  if (!rule.ok) {
    return NextResponse.json({
      error: 'annual_amount_mismatch',
      mode,
      reason: rule.reason,
      requested: rule.requested ?? null,
      expected_annual_usd: rule.expectedUsd,
      monthly_minor: monthlyMinor,
      rule: ANNUAL_SWITCH_RULE,
      ...report,
      nothing_written: true,
    }, { status: 422 })
  }
  const tier = tierPick.tier!
  const annualMinor = rule.annualMinor
  const switchCredits = credits!
  const newMetadata = annualSwitchMetadata({ existing: metadata, userId, tier, planCredits: switchCredits.perMonthAfter, monthlyMinor: monthlyMinor!, annualMinor })
  const annualItem = {
    id: item!.id,
    price_data: { currency: 'usd', product: productId!, unit_amount: annualMinor, recurring: { interval: 'year' as const } },
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
      return NextResponse.json({ error: 'stripe_preview_failed', mode, stripe: stripeErrorShape(e), ...report, nothing_written: true }, { status: 502 })
    }
    const summary = invoiceSwitchSummary(preview)
    return NextResponse.json({
      ok: true,
      mode,
      ready_to_send: true,
      blockers: [],
      ...report,
      annual: { usd: rule.annualUsd, minor: annualMinor, label: usdLabel(annualMinor) },
      preview: summary && {
        ...summary,
        proration_credit: usdLabel(summary.prorationCreditMinor),
        charged_now: usdLabel(summary.amountDueMinor),
      },
      metadata_to_write: newMetadata,
      refund_until_if_sent_now: annualSwitchRefundUntil(Date.now()),
      first_refill_if_sent_now: annualSwitchFirstRefillAt(Date.now()),
      send_with: { userId, annualAmountUsd: rule.annualUsd, confirm: 'SEND' },
    })
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
    console.error('[admin/switch-to-annual] stripe update failed:', shape.type, shape.code, shape.decline_code)
    return NextResponse.json({
      error: 'stripe_update_failed',
      mode,
      stripe: shape,
      nothing_written: true,
      hint: 'A Stripe recusou a troca; a assinatura segue mensal e nada foi gravado aqui. Cartão recusado: a pessoa atualiza o cartão e você roda o ensaio de novo (depois de 10 min). Erro de rede: rode o ENSAIO — se ela já aparecer anual, o SEND só completa o registro, sem cobrar de novo.',
    }, { status: shape.type === 'StripeCardError' ? 402 : 502 })
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
    admin, userId, ledgerId, tier, customerId, subscriptionId,
    eventMetadata: {
      source: 'admin_switch_to_annual',
      version: ANNUAL_SWITCH_VERSION,
      offer: ANNUAL_SWITCH_OFFER,
      rule: ANNUAL_SWITCH_RULE,
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
      credits_balance_untouched: Number(profile.video_credits ?? 0),
      period_start: new Date(periodStartMs).toISOString(),
      first_refill_at: annualSwitchFirstRefillAt(periodStartMs),
      refund_until: annualSwitchRefundUntil(nowMs),
      stripe_result_ok: stripeResultOk,
      switched_by: user.email ?? 'admin',
    },
  })

  return NextResponse.json({
    ok: true,
    mode,
    switched: true,
    stripe_result_ok: stripeResultOk,
    annual: { usd: rule.annualUsd, minor: annualMinor, label: usdLabel(annualMinor) },
    charged_now: { minor: chargedMinor, label: usdLabel(chargedMinor) },
    invoice: summary,
    credits: switchCredits,
    credits_balance_untouched: Number(profile.video_credits ?? 0),
    metadata_written: newMetadata,
    refund_until: annualSwitchRefundUntil(nowMs),
    first_refill_at: annualSwitchFirstRefillAt(periodStartMs),
    customer_reply_en: annualSwitchCustomerReply({ chargedMinor }),
    ...recorded,
  })
}

/**
 * Depois que a Stripe trocou: perfil (plano e ids, NUNCA os créditos) e, só com o perfil gravado, o razão com id
 * determinístico — razão presente quer dizer "tudo registrado". Falha aqui não desfaz a cobrança: volta na resposta, e o
 * próximo SEND completa pelo selo da assinatura (caminho "já anual com o selo"), sem chamar a troca de novo.
 */
async function recordSwitch(input: {
  admin: NonNullable<ReturnType<typeof serviceClient>>
  userId: string
  ledgerId: string
  tier: string | null
  customerId: string | null
  subscriptionId: string
  eventMetadata: Record<string, unknown>
}): Promise<{ profile_updated: boolean; ledger_written: boolean; warnings: string[] }> {
  const warnings: string[] = []
  const patch: Record<string, unknown> = { is_pro: true, has_paid: true, stripe_subscription_id: input.subscriptionId }
  if (input.tier) patch.plan = input.tier
  if (input.customerId) patch.stripe_customer_id = input.customerId
  const { error: profileError } = await input.admin.from('profiles').update(patch).eq('id', input.userId)
  if (profileError) {
    warnings.push(`perfil e razão não gravados (${profileError.message}); a Stripe JÁ trocou. Rode o SEND de novo: ele só completa o registro, sem cobrar outra vez.`)
    return { profile_updated: false, ledger_written: false, warnings }
  }
  const { error: ledgerError } = await input.admin.from('events').insert({
    id: input.ledgerId,
    name: ANNUAL_SWITCH_EVENT,
    user_id: input.userId,
    path: ROUTE_PATH,
    session_id: null,
    metadata: input.eventMetadata,
  })
  const ledgerWritten = !ledgerError || ledgerError.code === '23505'
  if (!ledgerWritten) warnings.push(`razão não gravado (${ledgerError?.message}); rode o SEND de novo para completar — não cobra outra vez.`)
  return { profile_updated: !profileError, ledger_written: ledgerWritten, warnings }
}
