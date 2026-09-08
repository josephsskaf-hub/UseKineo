// KINEO-VERSAO-B-CONTINUE-NOW-2026-09-08 — "gastou os 80 antes do dia 7 → vira
// cliente na hora" (ordem do fundador 08/09: "se usarem ou depois de 1 semana
// viram cliente a $19").
//
// A pessoa está no trial de $1 (assinatura `trialing` na Stripe, plano
// `basic_trial`) e quer continuar antes do dia 8. Encerrar o trial AGORA
// (`trial_end: 'now'`) faz a Stripe emitir e cobrar a fatura do primeiro mês
// ($19) imediatamente; o webhook `invoice.payment_succeeded`
// (billing_reason `subscription_cycle`) — o MESMO caminho da renovação normal —
// carimba plano cheio e concede TIER_CREDITS (150). Nada aqui concede crédito:
// quem concede é o webhook, uma vez, com o dinheiro na mão.
//
// Segurança: só o próprio usuário autenticado; só assinatura em `trialing`;
// só plano `*_trial`. Idempotente por natureza (segunda chamada: não está mais
// em trialing → 409). Nunca lê chave no chat: usa o mesmo `stripe` da casa.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { writeServerEvent } from '@/lib/serverEvents'
import { TIER_CREDITS, TIER_PRICES } from '@/lib/checkoutPricing'

export const dynamic = 'force-dynamic'

// (não exportado de propósito: arquivo de rota do Next só pode exportar handlers/config)
const END_TRIAL_NOW_EVENT = 'card_trial_ended_early' as const

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan, stripe_subscription_id, video_credits')
    .eq('id', user.id)
    .maybeSingle()
  if (error || !profile) {
    return NextResponse.json({ error: 'profile_unavailable' }, { status: 503 })
  }
  const plan = String(profile.plan ?? '').toLowerCase()
  const subscriptionId = typeof profile.stripe_subscription_id === 'string' ? profile.stripe_subscription_id : null
  if (!plan.endsWith('_trial') || !subscriptionId) {
    return NextResponse.json({ error: 'not_in_trial', plan }, { status: 409 })
  }

  let subscription
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId)
  } catch (e) {
    console.error('[end-trial-now] retrieve failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'stripe_unavailable' }, { status: 502 })
  }
  if (subscription.status !== 'trialing') {
    return NextResponse.json({ error: 'not_trialing', status: subscription.status }, { status: 409 })
  }

  try {
    await stripe.subscriptions.update(subscriptionId, { trial_end: 'now', proration_behavior: 'none' })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[end-trial-now] update failed:', message)
    await writeServerEvent({
      name: END_TRIAL_NOW_EVENT,
      userId: user.id,
      metadata: { ok: false, plan, credits_before: profile.video_credits ?? null, error: message.slice(0, 200) },
    })
    return NextResponse.json({ error: 'charge_failed' }, { status: 402 })
  }

  await writeServerEvent({
    name: END_TRIAL_NOW_EVENT,
    userId: user.id,
    metadata: {
      ok: true,
      plan,
      credits_before: profile.video_credits ?? null,
      // o que a pessoa passa a ter, pela fonte única — o webhook concede
      grant_credits: TIER_CREDITS.basic,
      price_usd_minor: TIER_PRICES.basic.usd,
    },
  })
  // O crédito chega pelo webhook em segundos; o cliente re-lê /api/credits.
  return NextResponse.json({ ok: true, chargedNow: true, expectedCredits: TIER_CREDITS.basic })
}
