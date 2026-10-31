// KINEO-SALVA-CANCELAMENTO-3110 — o que a tela "Before you go" precisa saber, SÓ LEITURA.
//
// GET → plano, saldo, data da renovação, se a troca para o Starter é possível (espelho das recusas da rota
// /api/stripe/change-plan) e o último filme pronto. Nenhuma escrita: nem no banco, nem na Stripe (só
// subscriptions.retrieve da PRÓPRIA assinatura, conferindo o dono pela metadata como a change-plan faz).
// A troca em si continua sendo a rota change-plan; o cancelamento continua sendo o portal da Stripe.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { TIER_CREDITS, TIER_PRICES } from '@/lib/checkoutPricing'
import {
  CANCEL_SUPPORT_EMAIL,
  CHEAPEST_TIER,
  SALVA_CANCELAMENTO_VERSION,
  creditsStory,
  downgradeDecision,
  lastFilmHref,
  lastFilmTitle,
  saveTierOfPlan,
} from '@/lib/billing/salvaCancelamento'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, stripe_subscription_id, paypal_subscription_id, video_credits')
    .eq('id', user.id)
    .maybeSingle()

  const { tier, inTrial } = saveTierOfPlan(profile?.plan)
  const subscriptionId = profile?.stripe_subscription_id ? String(profile.stripe_subscription_id) : null

  // A assinatura viva: status, intervalo e fim do período. Falha de leitura = a troca NÃO é oferecida (a tela ainda
  // mostra o saldo e o "Continue to cancel"), nunca um botão que a rota vai recusar.
  let status: string | null = null
  let interval: string | null = null
  let periodEnd: string | null = null
  let cancelAtPeriodEnd = false
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const owner = sub.metadata?.supabase_user_id
      if (!owner || owner === user.id) {
        status = sub.status ?? null
        interval = sub.items?.data?.[0]?.price?.recurring?.interval ?? null
        periodEnd = typeof sub.current_period_end === 'number' ? new Date(sub.current_period_end * 1000).toISOString() : null
        cancelAtPeriodEnd = sub.cancel_at_period_end === true
      }
    } catch (e) {
      console.error('[cancel-save] subscription read failed:', e instanceof Error ? e.message.slice(0, 200) : String(e))
    }
  }

  const downgrade = downgradeDecision({
    tier,
    inTrial,
    hasStripeSubscription: Boolean(subscriptionId),
    interval,
    status,
    cancelAtPeriodEnd,
  })
  const planQuota = tier ? TIER_CREDITS[tier] : 0
  const credits = creditsStory(profile?.video_credits ?? 0, planQuota)

  let lastFilm: { id: string | null; title: string; createdAt: string | null; href: string } | null = null
  try {
    const { data: film } = await supabase
      .from('videos')
      .select('id, topic, status, video_url, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (film) {
      const row = film as { id?: unknown; topic?: unknown; video_url?: unknown; created_at?: unknown }
      lastFilm = {
        id: typeof row.id === 'string' ? row.id : null,
        title: lastFilmTitle(row.topic),
        createdAt: typeof row.created_at === 'string' ? row.created_at : null,
        href: lastFilmHref({ videoUrl: row.video_url }),
      }
    }
  } catch { /* sem filme a tela oferece só o e-mail */ }

  return NextResponse.json({
    ok: true,
    version: SALVA_CANCELAMENTO_VERSION,
    subscribed: Boolean(subscriptionId) && tier !== null,
    paypal: Boolean(profile?.paypal_subscription_id) && !subscriptionId,
    tier,
    inTrial,
    status,
    interval,
    periodEnd,
    cancelAtPeriodEnd,
    credits,
    downgrade,
    cheapest: {
      tier: CHEAPEST_TIER,
      priceUsdMinor: TIER_PRICES[CHEAPEST_TIER].usd,
      creditsPerMonth: TIER_CREDITS[CHEAPEST_TIER],
    },
    lastFilm,
    supportEmail: CANCEL_SUPPORT_EMAIL,
  })
}
