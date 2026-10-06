// ═══ KINEO-DUNNING-EMAIL-2026-10-06 — o botão "Update card" do aviso de renovação recusada ═══════════════════════════
// O portal da Stripe só abria por POST com sessão (app/api/stripe/portal, o "Manage billing" da conta) — e link de
// e-mail não faz POST. Esta é a rota GET para onde o botão do e-mail aponta (RENEWAL_FAILED_UPDATE_CARD_URL):
//   · sem sessão → /login?redirect=<esta rota com a mesma query>. O login (window.location) e o /auth/callback (Google)
//     honram ?redirect=; depois de entrar a pessoa volta AQUI e segue direto para o portal, sem procurar botão nenhum;
//   · com sessão → portal da Stripe já na tela de trocar o cartão (fluxo payment_method_update). Se a configuração do
//     portal não aceitar esse fluxo, abre o portal normal — o mesmo do "Manage billing". Volta para /account;
//   · conta sem cliente Stripe, ou qualquer erro → /account (onde mora o "Manage billing"), nunca uma tela de erro.
// Scanner de e-mail (Safe Links, Proofpoint) faz GET sem cookie e só chega ao login: sem sessão nada é criado.
// Cada abertura vira BILLING_UPDATE_CARD_OPENED_EVENT (desfecho + campanha): o clique cai numa rota de API, que nenhum
// rastreador de página vê — sem este evento o botão do e-mail seria invisível para a medição.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { writeServerEvent } from '@/lib/serverEvents'
import { BILLING_UPDATE_CARD_OPENED_EVENT, RENEWAL_FAILED_UPDATE_CARD_PATH } from '@/lib/billing/renewalFailedEmail'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

async function recordOpened(req: NextRequest, outcome: string, userId: string | null): Promise<void> {
  const campaign = (req.nextUrl.searchParams.get('utm_campaign') ?? '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || null
  await writeServerEvent({
    name: BILLING_UPDATE_CARD_OPENED_EVENT,
    userId,
    path: RENEWAL_FAILED_UPDATE_CARD_PATH,
    metadata: { outcome, campaign, logged_in: userId !== null },
  })
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const account = new URL('/account', origin)
  let userId: string | null = null
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      const login = new URL('/login', origin)
      login.searchParams.set('redirect', `${RENEWAL_FAILED_UPDATE_CARD_PATH}${req.nextUrl.search}`)
      await recordOpened(req, 'login', null)
      return NextResponse.redirect(login, 303)
    }
    userId = user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()
    const customer = typeof profile?.stripe_customer_id === 'string' && profile.stripe_customer_id ? profile.stripe_customer_id : null
    if (!customer) {
      await recordOpened(req, 'no_billing_account', userId)
      return NextResponse.redirect(account, 303)
    }

    const returnUrl = account.toString()
    let portalUrl: string
    let outcome = 'portal_card_update'
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer,
        return_url: returnUrl,
        flow_data: {
          type: 'payment_method_update',
          after_completion: { type: 'redirect', redirect: { return_url: returnUrl } },
        },
      })
      portalUrl = session.url
    } catch (flowErr) {
      console.warn('[stripe/portal/update-card] card-update flow unavailable, opening the portal home:', flowErr instanceof Error ? flowErr.message : String(flowErr))
      const session = await stripe.billingPortal.sessions.create({ customer, return_url: returnUrl })
      portalUrl = session.url
      outcome = 'portal_home'
    }
    await recordOpened(req, outcome, userId)
    return NextResponse.redirect(portalUrl, 303)
  } catch (err) {
    console.error('[stripe/portal/update-card] failed, sending to /account:', err instanceof Error ? err.message : String(err))
    await recordOpened(req, 'error', userId)
    return NextResponse.redirect(account, 303)
  }
}
