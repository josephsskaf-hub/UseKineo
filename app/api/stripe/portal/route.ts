import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // KINEO-SALVA-CANCELAMENTO-3110 — { flow: 'cancel' } vem só do "Continue to cancel" da tela "Before you go"
    // (components/billing/CancelSaveFlow.tsx): o portal abre JÁ na tela de cancelar da PRÓPRIA assinatura, sem a
    // pessoa caçar o botão. Corpo vazio (todos os outros chamadores) = o portal de sempre, byte a byte.
    let wantsCancelFlow = false
    try {
      const body = (await req.json()) as { flow?: unknown } | null
      wantsCancelFlow = body?.flow === 'cancel'
    } catch { /* sem corpo = portal de sempre */ }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe first.' },
        { status: 400 }
      )
    }

    const appUrl = req.nextUrl.origin

    // KINEO-SALVA-CANCELAMENTO-3110 — o cancelamento continua sendo da Stripe (o portal confirma e aplica); aqui só se
    // escolhe a tela de entrada. Se a configuração do portal não permitir o fluxo, cai no portal de sempre.
    if (wantsCancelFlow && profile.stripe_subscription_id) {
      try {
        const cancelSession = await stripe.billingPortal.sessions.create({
          customer: profile.stripe_customer_id,
          return_url: `${appUrl}/account?tab=billing`,
          flow_data: {
            type: 'subscription_cancel',
            subscription_cancel: { subscription: String(profile.stripe_subscription_id) },
            after_completion: { type: 'redirect', redirect: { return_url: `${appUrl}/account?tab=billing` } },
          },
        })
        return NextResponse.json({ url: cancelSession.url, flow: 'cancel' })
      } catch (flowError) {
        console.warn('Portal cancel flow unavailable, opening default portal:', flowError instanceof Error ? flowError.message.slice(0, 200) : String(flowError))
      }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 })
  }
}
