// KINEO-TROCA-DE-PLANO-2026-09-09 — a pessoa troca de plano SEM cancelar.
//
// Ordem do fundador (09/09 00h, auditoria V7): "depois de sete dias ela pode
// migrar pra qualquer plano". Até aqui o $1 era amarrado ao Creator e o único
// jeito de ir para Starter ou Studio era cancelar e comprar de novo — e o
// checkout recusa uma segunda assinatura ("You already have a Kineo
// subscription"). Esta rota fecha o buraco:
//
//   · GET  → { subscribed, tier, status }  (só do perfil; zero chamada à Stripe)
//   · POST { tier } → atualiza o ITEM da assinatura na Stripe com price_data
//     inline do plano novo (a casa não tem Price no dashboard), carimba
//     metadata.tier/plan_credits (é de lá que a renovação lê o grant) e
//     atualiza o perfil na hora.
//
// Regras de dinheiro (honestas, sem mágica):
//   · trialing: troca sem proration e sem cobrança; os 80 créditos do trial
//     ficam; no dia 8 a fatura cobra o preço do plano novo e o webhook concede
//     o grant desse plano (renewalCreditsFor lê metadata.tier + amount_paid).
//   · active, upgrade: proration da Stripe entra na PRÓXIMA fatura; os
//     créditos sobem AGORA pela diferença de grant (o cliente paga a mais e
//     recebe a mais no mesmo ato).
//   · active, downgrade: proration (crédito) na próxima fatura; os créditos
//     que a pessoa já tem não são retirados; o grant menor vale na renovação.
//   · anual: fora do escopo desta rota (409) — é raro e a proration anual
//     merece decisão humana.
//
// KINEO-TROCA-BUSINESS-2026-10-10 — o Business (US$ 84) entra na troca, com regra de dinheiro PRÓPRIA (o "créditos
// agora, proration na próxima fatura" daria ~440 créditos de graça a quem subisse e descesse antes da fatura). Toda a
// regra mora em lib/billing/trocaBusiness.ts; aqui só a orquestração (businessSwitch, no fim do arquivo):
//   · subida (Starter/Creator/Studio mensal ATIVO → Business): cobra a proration AGORA ('always_invoice' +
//     'error_if_incomplete'); o saldo NÃO muda aqui — os créditos entram pelo webhook quando a fatura da troca
//     está paga (idempotente por troca). POST { tier: 'business', preview: true } = a prévia da fatura, sem escrita.
//     O Business não aceita promoção: a subida REMOVE todo desconto da assinatura e do item (discounts ''), e a
//     prévia também ignora desconto — o valor mostrado é o preço cheio.
//   · descida (Business → Studio/Creator/Starter): agendada para o fim do período pago (Subscription Schedule,
//     proration 'none'); nada devolvido, nada cobrado hoje, nenhum crédito retirado; a renovação dá a cota nova.
//   · anual → 409 business_annual_needs_support (o Business não tem anual; o suporte troca). Teste → 409.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { writeServerEvent } from '@/lib/serverEvents'
import { BUSINESS_PRICES, TIER_CREDITS, TIER_PRICES, type CheckoutTier } from '@/lib/checkoutPricing'
import { PLANS } from '@/lib/pricing'
// KINEO-TROCA-BUSINESS-2026-10-10 — a regra da troca do Business (cobrança agora, créditos só com a fatura paga).
import type Stripe from 'stripe'
import { planSettlementAmountMinor } from '@/lib/settlementCurrency'
import {
  BUSINESS_CLEAR_DISCOUNTS,
  BUSINESS_DOWNGRADE_PRORATION,
  BUSINESS_DOWNGRADE_SCHEDULED_EVENT,
  BUSINESS_SCHEDULE_SOURCE,
  BUSINESS_TIER,
  BUSINESS_UPGRADE_PAYMENT_BEHAVIOR,
  BUSINESS_UPGRADE_PRORATION,
  TROCA_BUSINESS_TAG,
  TROCA_BUSINESS_VERSION,
  businessDowngradeIdempotencyKey,
  discountRefsOf,
  businessDowngradePhaseMetadata,
  businessDowngradePhases,
  businessSwitchDirection,
  businessUpgradeCredits,
  businessUpgradeGrantKey,
  businessUpgradeIdempotencyKey,
  businessUpgradeMetadata,
  businessWindowStartMs,
  isOwnBusinessSchedule,
} from '@/lib/billing/trocaBusiness'

export const dynamic = 'force-dynamic'

const SWITCHABLE = new Set<CheckoutTier>(['starter', 'basic', 'pro'])
const PLAN_CHANGED_EVENT = 'plan_changed'

async function productIdForTier(tier: CheckoutTier | typeof BUSINESS_TIER, name: string): Promise<string> {
  const found = await stripe.products.search({ query: `active:'true' AND metadata['kineo_tier']:'${tier}'`, limit: 1 })
  const hit = found.data[0]
  if (hit) return hit.id
  const created = await stripe.products.create({ name: `Kineo ${name}`, metadata: { kineo_tier: tier, kineo_source: 'change-plan' } })
  return created.id
}

function tierOfPlan(plan: string | null | undefined): CheckoutTier | null {
  const raw = String(plan ?? '').toLowerCase().replace(/_trial$/, '')
  if (raw === 'creator') return 'basic'
  if (raw === 'studio') return 'pro'
  return SWITCHABLE.has(raw as CheckoutTier) ? (raw as CheckoutTier) : null
}

// KINEO-TROCA-BUSINESS-2026-10-10 — o Business fica FORA do SWITCHABLE (as linhas de sempre não o conhecem): é
// reconhecido à parte e desviado para businessSwitch. Não existe 'business_trial'.
function planIsBusiness(plan: string | null | undefined): boolean {
  return String(plan ?? '').toLowerCase() === BUSINESS_TIER
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ subscribed: false, tier: null, status: null })
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, stripe_subscription_id')
    .eq('id', user.id)
    .maybeSingle()
  const plan = String(profile?.plan ?? '').toLowerCase()
  const tier: CheckoutTier | typeof BUSINESS_TIER | null = tierOfPlan(plan) ?? (planIsBusiness(plan) ? BUSINESS_TIER : null) // KINEO-TROCA-BUSINESS-2026-10-10
  const subscribed = Boolean(profile?.stripe_subscription_id) && tier !== null
  return NextResponse.json({
    subscribed,
    tier: subscribed ? tier : null,
    status: subscribed ? (plan.endsWith('_trial') ? 'trialing' : 'active') : null,
  })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { tier?: unknown; preview?: unknown } = {}
  try { body = await req.json() } catch { /* vazio */ }
  const target = String(body.tier ?? '').toLowerCase() as CheckoutTier
  const wantsBusiness = (target as string) === BUSINESS_TIER // KINEO-TROCA-BUSINESS-2026-10-10
  if (!SWITCHABLE.has(target) && !wantsBusiness) return NextResponse.json({ error: 'invalid_tier' }, { status: 400 })
  const wantsPreview = body.preview === true

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, stripe_subscription_id, paypal_subscription_id, video_credits')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: profile?.paypal_subscription_id ? 'paypal_subscription' : 'no_subscription' }, { status: 409 })
  }
  const currentTier = tierOfPlan(profile.plan)
  const inTrial = String(profile.plan ?? '').toLowerCase().endsWith('_trial')
  if (currentTier === target) return NextResponse.json({ error: 'same_plan', tier: target }, { status: 409 })
  // KINEO-TROCA-BUSINESS-2026-10-10 — de/para o Business: a regra própria; prévia só existe para ela (nunca troca nada).
  const onBusiness = planIsBusiness(profile.plan)
  const businessMove = wantsBusiness || onBusiness
  if (onBusiness && wantsBusiness) return NextResponse.json({ error: 'same_plan', tier: BUSINESS_TIER }, { status: 409 })
  if (wantsPreview && !businessMove) return NextResponse.json({ error: 'preview_unsupported' }, { status: 400 })

  const subscriptionId = String(profile.stripe_subscription_id)
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  if (sub.metadata?.supabase_user_id && sub.metadata.supabase_user_id !== user.id) {
    return NextResponse.json({ error: 'not_owner' }, { status: 403 })
  }
  if (sub.status !== 'active' && sub.status !== 'trialing') {
    return NextResponse.json({ error: 'subscription_not_active', status: sub.status }, { status: 409 })
  }
  const item = sub.items?.data?.[0]
  const interval = item?.price?.recurring?.interval ?? null
  if (!item || interval !== 'month') {
    // KINEO-TROCA-BUSINESS-2026-10-10 — o Business é só mensal: quem paga anual segue pelo suporte, com o motivo certo.
    if (businessMove) return NextResponse.json({ error: 'business_annual_needs_support', interval }, { status: 409 })
    return NextResponse.json({ error: 'annual_needs_support', interval }, { status: 409 })
  }
  // KINEO-TROCA-BUSINESS-2026-10-10 — uma descida do Business deixa um Subscription Schedule pendurado na assinatura.
  //   · ainda no Business (descida pendente): o Schedule NÃO é solto aqui — a nova descida reescreve as fases DELE
  //     (se a Stripe recusar, a descida de antes continua valendo; soltar antes deixaria a pessoa pagando US$ 84);
  //   · já no plano novo (a fase final corre até a virada): o nosso é solto antes da troca (só desprende a assinatura).
  //   Schedule alheio (sem kineo_source) = a troca do Business recusa (suporte); as trocas de sempre seguem como antes.
  const scheduleRef = sub.schedule ? (typeof sub.schedule === 'string' ? sub.schedule : sub.schedule.id) : null
  let ownScheduleId: string | null = null
  if (scheduleRef && !wantsPreview) {
    let kind: 'own' | 'none' | 'foreign'
    try {
      kind = await scheduleKind(scheduleRef)
      if (kind === 'own' && !onBusiness) await stripe.subscriptionSchedules.release(scheduleRef)
    } catch (e) {
      console.error('[change-plan] schedule read/release failed:', stripeFailure(e).message)
      return NextResponse.json({ error: 'stripe_update_failed' }, { status: 502 })
    }
    if (kind === 'foreign' && businessMove) return NextResponse.json({ error: 'schedule_needs_support' }, { status: 409 })
    if (kind === 'own' && onBusiness) ownScheduleId = scheduleRef
  }
  if (businessMove) {
    return businessSwitch({
      userId: user.id,
      sub,
      item,
      target: wantsBusiness ? BUSINESS_TIER : target,
      currentTier: onBusiness ? BUSINESS_TIER : currentTier,
      inTrial,
      preview: wantsPreview,
      creditsBefore: Number(profile.video_credits ?? 0),
      planBefore: String(profile.plan ?? ''),
      ownScheduleId,
    })
  }
  const trialing = sub.status === 'trialing'
  const plan = PLANS[target]
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !svc) return NextResponse.json({ error: 'env_missing' }, { status: 500 })

  try {
    // Na ATUALIZAÇÃO de item a Stripe aceita price_data só com `product` (id),
    // não product_data — então a casa mantém um Product por plano, achado pelo
    // metadata kineo_tier e criado uma única vez se não existir.
    const productId = await productIdForTier(target, plan.name)
    await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: item.id,
        price_data: {
          currency: 'usd',
          product: productId,
          unit_amount: TIER_PRICES[target].usd,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      // trial: nada a ratear; ativo: a diferença entra na próxima fatura
      proration_behavior: trialing ? 'none' : 'create_prorations',
      metadata: {
        ...sub.metadata,
        tier: target,
        plan_credits: String(TIER_CREDITS[target]),
        plan_changed_from: currentTier ?? 'unknown',
        plan_changed_at: new Date().toISOString(),
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[change-plan] stripe update failed:', message)
    await writeServerEvent({ name: PLAN_CHANGED_EVENT, userId: user.id, metadata: { ok: false, from: currentTier, to: target, status: sub.status, error: message.slice(0, 200) } })
    return NextResponse.json({ error: 'stripe_update_failed' }, { status: 502 })
  }

  // Perfil: plano na hora; créditos sobem só no upgrade de assinatura ativa.
  const before = Number(profile.video_credits ?? 0)
  const delta = !trialing && currentTier ? Math.max(0, TIER_CREDITS[target] - TIER_CREDITS[currentTier]) : 0
  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
  const patch: Record<string, unknown> = { plan: trialing ? `${target}_trial` : target, is_pro: true }
  if (delta > 0) patch.video_credits = before + delta
  const { error: profileError } = await admin.from('profiles').update(patch).eq('id', user.id)
  if (profileError) console.error('[change-plan] profile update failed:', profileError.message)

  await writeServerEvent({
    name: PLAN_CHANGED_EVENT,
    userId: user.id,
    metadata: {
      ok: true,
      from: currentTier,
      to: target,
      status: sub.status,
      proration: trialing ? 'none' : 'create_prorations',
      credits_before: before,
      credits_delta: delta,
      profile_updated: !profileError,
    },
  })
  return NextResponse.json({ ok: true, tier: target, plan: patch.plan, credits: delta > 0 ? before + delta : before, trialing })
}

// ═══ KINEO-TROCA-BUSINESS-2026-10-10 — a troca de/para o Business ════════════════════════════════════════════════════

/** 'own' (nosso e ativo), 'none' (já não está ativo) ou 'foreign' (de outra origem — não mexe). Só leitura. */
async function scheduleKind(scheduleId: string): Promise<'own' | 'none' | 'foreign'> {
  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId)
  if (schedule.status !== 'active' && schedule.status !== 'not_started') return 'none'
  return isOwnBusinessSchedule(schedule.metadata as Record<string, string> | null) ? 'own' : 'foreign'
}

function stripeFailure(e: unknown): { cardError: boolean; message: string; code: string | null } {
  const err = (e ?? {}) as { type?: unknown; code?: unknown; message?: unknown }
  return {
    cardError: err.type === 'StripeCardError',
    message: (typeof err.message === 'string' ? err.message : String(e)).slice(0, 200),
    code: typeof err.code === 'string' ? err.code : null,
  }
}

async function recordPlanChange(eventName: string, userId: string, metadata: Record<string, unknown>) {
  await writeServerEvent({ name: eventName, userId, metadata: { tag: TROCA_BUSINESS_TAG, version: TROCA_BUSINESS_VERSION, ...metadata } })
}

async function businessSwitch(input: {
  userId: string
  sub: Stripe.Subscription
  item: Stripe.SubscriptionItem
  target: string
  currentTier: string | null
  inTrial: boolean
  preview: boolean
  creditsBefore: number
  planBefore: string
  /** Descida já agendada (Schedule nosso, ativo): a nova descida reescreve as fases dele em vez de criar outro. */
  ownScheduleId: string | null
}): Promise<NextResponse> {
  const { sub, item, userId } = input
  const direction = businessSwitchDirection(input.currentTier, input.target)
  if (!direction) return NextResponse.json({ error: 'plan_not_switchable', from: input.currentTier, to: input.target }, { status: 409 })
  // Não existe 'business_trial': a troca no teste ficaria sem regra de dinheiro honesta. Depois do 1º pagamento, troca.
  if (sub.status === 'trialing' || input.inTrial) return NextResponse.json({ error: 'business_after_trial' }, { status: 409 })
  const currency = String(item.price?.currency ?? 'usd').toLowerCase()
  if (currency !== 'usd' && currency !== 'brl') return NextResponse.json({ error: 'currency_needs_support', currency }, { status: 409 })
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null
  const nowMs = Date.now()

  if (direction === 'upgrade') {
    const from = input.currentTier as CheckoutTier
    // A cobrança é AGORA, no cartão salvo: assinatura que não cobra sozinha não tem como cumprir a regra.
    if (sub.collection_method !== 'charge_automatically') return NextResponse.json({ error: 'payment_needs_support' }, { status: 409 })
    const amountMinor = planSettlementAmountMinor(BUSINESS_TIER, 'monthly', currency, BUSINESS_PRICES.usd)
    const creditsPending = businessUpgradeCredits(from)
    const upgradeAt = new Date(businessWindowStartMs(nowMs)).toISOString()
    let productId: string
    try {
      productId = await productIdForTier(BUSINESS_TIER, PLANS.business.name)
    } catch (e) {
      return NextResponse.json({ error: 'stripe_update_failed', detail: stripeFailure(e).message }, { status: 502 })
    }
    // Business sem promoção: o item novo nasce SEM desconto ('' apaga os do item) e a assinatura perde os dela (abaixo).
    const businessItem = {
      id: item.id,
      price_data: { currency, product: productId, unit_amount: amountMinor, recurring: { interval: 'month' as const } },
      quantity: 1,
      discounts: BUSINESS_CLEAR_DISCOUNTS,
    }
    const discountsRemoved = discountRefsOf(sub, item)
    if (input.preview) {
      try {
        const pv = await stripe.invoices.createPreview({
          customer: customerId ?? undefined,
          subscription: sub.id,
          // '' = a prévia não herda desconto da assinatura nem do cliente: o "agora" é o preço cheio do Business.
          discounts: BUSINESS_CLEAR_DISCOUNTS,
          subscription_details: { items: [businessItem], proration_behavior: BUSINESS_UPGRADE_PRORATION },
        })
        return NextResponse.json({
          ok: true, preview: true, direction, from, to: BUSINESS_TIER, currency,
          charged_now_minor: Math.max(0, Number(pv.amount_due ?? 0)),
          monthly_minor: amountMinor,
          credits_after_payment: creditsPending,
          credits_now: input.creditsBefore,
        })
      } catch (e) {
        return NextResponse.json({ error: 'preview_failed', detail: stripeFailure(e).message }, { status: 502 })
      }
    }
    let updated: Stripe.Subscription
    try {
      updated = await stripe.subscriptions.update(sub.id, {
        items: [businessItem],
        proration_behavior: BUSINESS_UPGRADE_PRORATION,
        payment_behavior: BUSINESS_UPGRADE_PAYMENT_BEHAVIOR,
        discounts: BUSINESS_CLEAR_DISCOUNTS, // Business sem promoção: cupom/código da assinatura sai na subida
        metadata: businessUpgradeMetadata(sub.metadata as Record<string, string>, from, upgradeAt),
        expand: ['latest_invoice'],
      }, { idempotencyKey: businessUpgradeIdempotencyKey(sub.id, item.id, from, amountMinor, nowMs) })
    } catch (e) {
      const f = stripeFailure(e)
      console.error('[change-plan] business upgrade refused by Stripe:', f.code, f.message)
      await recordPlanChange(PLAN_CHANGED_EVENT, userId, { ok: false, from, to: BUSINESS_TIER, direction, status: sub.status, card_error: f.cardError, error: f.message })
      return NextResponse.json({ error: f.cardError ? 'payment_failed' : 'stripe_update_failed' }, { status: f.cardError ? 402 : 502 })
    }
    const invoice = typeof updated.latest_invoice === 'object' && updated.latest_invoice ? updated.latest_invoice : null
    const invoicePaid = invoice?.status === 'paid'
    // O PLANO vira business quando a fatura da troca já está paga (error_if_incomplete garante no cartão). O SALDO nunca
    // muda aqui: os créditos são do webhook, quando a Stripe confirma a fatura paga.
    let profileUpdated = false
    if (invoicePaid) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (url && svc) {
        const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
        const { error } = await admin.from('profiles').update({ plan: BUSINESS_TIER, is_pro: true }).eq('id', userId)
        if (error) console.error('[change-plan] business plan update failed (webhook repeats it):', error.message)
        profileUpdated = !error
      }
    }
    const chargedNowMinor = Number(invoice?.amount_paid ?? 0)
    await recordPlanChange(PLAN_CHANGED_EVENT, userId, {
      ok: true, from, to: BUSINESS_TIER, direction, status: sub.status,
      proration: BUSINESS_UPGRADE_PRORATION,
      discounts_removed: discountsRemoved,
      stripe_invoice_id: invoice?.id ?? null,
      invoice_status: invoice?.status ?? null,
      charged_now_minor: chargedNowMinor,
      currency,
      credits_before: input.creditsBefore,
      credits_delta: 0,
      credits_pending: creditsPending,
      grant_key: businessUpgradeGrantKey(sub.id, upgradeAt),
      profile_updated: profileUpdated,
    })
    return NextResponse.json({
      ok: true, tier: BUSINESS_TIER, direction,
      plan: invoicePaid ? BUSINESS_TIER : input.planBefore,
      credits: input.creditsBefore,
      credits_pending: creditsPending,
      charged_now_minor: chargedNowMinor,
      currency,
      invoice_paid: invoicePaid,
      trialing: false,
    })
  }

  // ── descida: Business até o fim do período pago, plano novo na renovação ────────────────────────────────────────
  const target = input.target as CheckoutTier
  if (sub.cancel_at_period_end) return NextResponse.json({ error: 'subscription_canceling' }, { status: 409 })
  const periodStart = sub.current_period_start
  const periodEnd = sub.current_period_end
  const effectiveAt = new Date(periodEnd * 1000).toISOString()
  const amountMinor = planSettlementAmountMinor(target, 'monthly', currency, TIER_PRICES[target].usd)
  if (input.preview) {
    return NextResponse.json({
      ok: true, preview: true, direction, from: BUSINESS_TIER, to: target, currency,
      charged_now_minor: 0,
      monthly_minor: amountMinor,
      credits_per_month: TIER_CREDITS[target],
      credits_now: input.creditsBefore,
      effective_at: effectiveAt,
    })
  }
  let scheduleId: string | null = input.ownScheduleId
  let createdHere = false
  try {
    const productId = await productIdForTier(target, PLANS[target].name)
    // Descida já agendada: reescreve as fases do MESMO Schedule (se a Stripe recusar, a de antes segue valendo).
    const schedule = input.ownScheduleId
      ? await stripe.subscriptionSchedules.retrieve(input.ownScheduleId)
      : await stripe.subscriptionSchedules.create(
        { from_subscription: sub.id },
        { idempotencyKey: businessDowngradeIdempotencyKey(sub.id, target, periodEnd, nowMs) },
      )
    createdHere = !input.ownScheduleId
    scheduleId = schedule.id
    const current = schedule.phases?.find((p) => p.start_date === schedule.current_phase?.start_date) ?? schedule.phases?.[0]
    const currentPrice = current?.items?.[0]?.price
    const currentPriceId = typeof currentPrice === 'string' ? currentPrice : currentPrice?.id ?? item.price.id
    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: 'release',
      proration_behavior: BUSINESS_DOWNGRADE_PRORATION,
      metadata: { kineo_source: BUSINESS_SCHEDULE_SOURCE, kineo_tag: TROCA_BUSINESS_TAG, downgrade_from: BUSINESS_TIER, downgrade_to: target },
      phases: businessDowngradePhases({
        currentPriceId,
        currentStart: current?.start_date ?? periodStart,
        currentEnd: current?.end_date ?? periodEnd,
        target,
        currency,
        productId,
        unitAmount: amountMinor,
        phaseMetadata: businessDowngradePhaseMetadata(target, effectiveAt, new Date(nowMs).toISOString()),
      }),
    })
  } catch (e) {
    const f = stripeFailure(e)
    console.error('[change-plan] business downgrade schedule failed:', f.code, f.message)
    // Schedule criado AQUI pela metade = solta, para a assinatura seguir exatamente como estava. O que já existia
    // (descida anterior) fica intocado: a Stripe recusou a reescrita, então a descida de antes continua valendo.
    if (scheduleId && createdHere) await stripe.subscriptionSchedules.release(scheduleId).catch(() => null)
    await recordPlanChange(BUSINESS_DOWNGRADE_SCHEDULED_EVENT, userId, { ok: false, from: BUSINESS_TIER, to: target, direction, error: f.message })
    return NextResponse.json({ error: 'stripe_update_failed' }, { status: 502 })
  }
  await recordPlanChange(BUSINESS_DOWNGRADE_SCHEDULED_EVENT, userId, {
    ok: true, from: BUSINESS_TIER, to: target, direction, status: sub.status,
    proration: BUSINESS_DOWNGRADE_PRORATION,
    effective_at: effectiveAt,
    schedule_id: scheduleId,
    charged_now_minor: 0,
    credits_before: input.creditsBefore,
    credits_delta: 0,
  })
  return NextResponse.json({
    ok: true, tier: BUSINESS_TIER, direction,
    plan: BUSINESS_TIER,
    scheduled_tier: target,
    effective_at: effectiveAt,
    credits: input.creditsBefore,
    charged_now_minor: 0,
    currency,
    trialing: false,
  })
}
