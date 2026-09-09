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
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { writeServerEvent } from '@/lib/serverEvents'
import { TIER_CREDITS, TIER_PRICES, type CheckoutTier } from '@/lib/checkoutPricing'
import { PLANS } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

const SWITCHABLE = new Set<CheckoutTier>(['starter', 'basic', 'pro'])
const PLAN_CHANGED_EVENT = 'plan_changed'

async function productIdForTier(tier: CheckoutTier, name: string): Promise<string> {
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
  const tier = tierOfPlan(plan)
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

  let body: { tier?: unknown } = {}
  try { body = await req.json() } catch { /* vazio */ }
  const target = String(body.tier ?? '').toLowerCase() as CheckoutTier
  if (!SWITCHABLE.has(target)) return NextResponse.json({ error: 'invalid_tier' }, { status: 400 })

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
    return NextResponse.json({ error: 'annual_needs_support', interval }, { status: 409 })
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
