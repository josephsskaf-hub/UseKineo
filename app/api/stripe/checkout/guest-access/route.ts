import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { writeServerEvent } from '@/lib/serverEvents'
import { recordEmailSend, recordResendResponse } from '@/lib/email/quota'
import {
  GUEST_ACCOUNT_SESSION_APP_METADATA_KEY,
  GUEST_CHECKOUT_EVENTS,
  GUEST_CHECKOUT_NONCE_COOKIE,
  GUEST_CHECKOUT_NONCE_HASH_KEY,
  GUEST_CHECKOUT_VERSION,
  GUEST_SIGNIN_EMAIL_MAX_PER_SESSION,
  checkoutFulfilledMarkerId,
  decideGuestAccess,
  guestConflictMarkerId,
  guestLoginClaimId,
  guestSignInEmailSlotId,
  isGuestCheckoutSession,
  isGuestStripeSessionId,
  maskGuestEmail,
  normalizeGuestEmail,
} from '@/lib/growth/guestCheckout'
import {
  GUEST_SIGNIN_EMAIL_KIND,
  GUEST_SIGNIN_EMAIL_TIMEOUT_MS,
  deterministicEventUuid,
  guestNonceMatches,
  guestSignInEmailMessage,
  guestSignInLink,
} from '@/lib/stripe/guestCheckout'

// ═══ KINEO-COMPRA-SEM-LOGIN-2026-10-06 — a porta de quem pagou sem conta ══════════════════════════════════════════
// Chamada pela página /checkout/guest (success_url da sessão de convidado). Responde UM estado por vez e só faz
// login quando decideGuestAccess() (lib/growth/guestCheckout.ts) diz 'sign_in': conta NASCIDA desta sessão Stripe,
// o cookie httpOnly deste navegador batendo com o hash gravado na sessão, dentro da janela de poucos minutos e pela
// primeira vez (marcador guest_login_used:<sessão> em stripe_events). E-mail que já tinha conta NUNCA loga por aqui:
// vai um link para a caixa do dono (quem pagou com o e-mail de outra pessoa não entra na conta dela).
//
// Não concede nada e não cria conta: quem cria é o webhook. Enquanto ele não terminou (sem dono carimbado no
// Customer da Stripe ou sem checkout_fulfilled), a resposta é 'pending' e a página pergunta de novo.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Kineo <support@usekineo.com>'

function adminClientFor(url: string, serviceKey: string) {
  return createAdminClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}
type AdminClient = ReturnType<typeof adminClientFor>

function reply(body: Record<string, unknown>, status = 200, clearNonce = false): NextResponse {
  const response = NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie' },
  })
  if (clearNonce) {
    response.cookies.set({
      name: GUEST_CHECKOUT_NONCE_COOKIE,
      value: '',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  }
  return response
}

function isResourceMissing(error: unknown): boolean {
  const e = error as { code?: string; statusCode?: number } | null
  return e?.code === 'resource_missing' || e?.statusCode === 404
}

/** Reserva um marcador em stripe_events. 'taken' = já existia; 'error' = banco falhou (nunca vira "já usado"). */
async function claimMarker(admin: AdminClient, id: string): Promise<'claimed' | 'taken' | 'error'> {
  const { error } = await admin.from('stripe_events').insert({ id })
  if (!error) return 'claimed'
  return error.code === '23505' ? 'taken' : 'error'
}

async function releaseMarker(admin: AdminClient, id: string): Promise<void> {
  try {
    await admin.from('stripe_events').delete().eq('id', id)
  } catch {
    // Sem soltar, o pior caso é a pessoa usar o link do e-mail — nunca um login a mais.
  }
}

/** Uma vaga de e-mail: 'auto' só a 1ª (o envio sozinho para conta existente); 'request' a próxima livre até o teto. */
async function claimEmailSlot(admin: AdminClient, sessionId: string, mode: 'auto' | 'request'): Promise<{ slot: string | null; alreadySent: boolean }> {
  const last = mode === 'auto' ? 1 : GUEST_SIGNIN_EMAIL_MAX_PER_SESSION
  let alreadySent = false
  for (let n = 1; n <= last; n++) {
    const id = guestSignInEmailSlotId(sessionId, n)
    const outcome = await claimMarker(admin, id)
    if (outcome === 'claimed') return { slot: id, alreadySent: alreadySent || n > 1 }
    if (outcome === 'error') return { slot: null, alreadySent }
    alreadySent = true
  }
  return { slot: null, alreadySent }
}

async function sendSignInEmail(
  admin: AdminClient,
  input: { email: string; userId: string; origin: string; sessionId: string; reason: string },
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[guest-access] sign-in email not sent: RESEND_API_KEY missing')
    return false
  }
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: input.email })
  const tokenHash = (linkData?.properties as { hashed_token?: string } | undefined)?.hashed_token
  if (linkError || !tokenHash) {
    console.error('[guest-access] generateLink failed:', input.userId.slice(0, 8), linkError?.message)
    return false
  }
  const message = guestSignInEmailMessage(guestSignInLink(input.origin, tokenHash))
  let res: Response
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(GUEST_SIGNIN_EMAIL_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: [input.email], subject: message.subject, text: message.text, html: message.html }),
    })
  } catch (sendError) {
    await recordEmailSend({
      kind: GUEST_SIGNIN_EMAIL_KIND,
      priority: 'revenue',
      userId: input.userId,
      ok: false,
      detail: (sendError instanceof Error ? sendError.message : String(sendError)).slice(0, 200),
      admin,
    })
    return false
  }
  await recordResendResponse({ kind: GUEST_SIGNIN_EMAIL_KIND, priority: 'revenue', userId: input.userId, res, admin })
  if (!res.ok) return false
  await writeServerEvent({
    name: GUEST_CHECKOUT_EVENTS.emailSent,
    userId: input.userId,
    path: '/api/stripe/checkout/guest-access',
    metadata: { version: GUEST_CHECKOUT_VERSION, stripe_session_id: input.sessionId, reason: input.reason },
  })
  return true
}

export async function POST(req: NextRequest) {
  // Só a própria página chama. Os cookies são SameSite=Lax (um POST de outro site não os carrega), e isto fecha o resto.
  const origin = req.headers.get('origin')
  if (origin && origin !== req.nextUrl.origin) return reply({ state: 'unavailable' }, 403)

  let body: { session_id?: unknown; action?: unknown } | null = null
  try {
    body = await req.json()
  } catch {
    body = null
  }
  const sessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : ''
  const action: 'status' | 'email' = body?.action === 'email' ? 'email' : 'status'
  if (!isGuestStripeSessionId(sessionId)) return reply({ state: 'unavailable' }, 400)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!process.env.STRIPE_SECRET_KEY || !url || !serviceKey) return reply({ state: 'unavailable' }, 503)
  const admin = adminClientFor(url, serviceKey)

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['customer'] }, { timeout: 8000, maxNetworkRetries: 1 })
  } catch (error) {
    // Sem corpo de erro da Stripe na resposta nem no log (pode ecoar e-mail/ids).
    return isResourceMissing(error) ? reply({ state: 'unavailable' }, 404) : reply({ state: 'pending' })
  }

  const customer = session.customer && typeof session.customer === 'object' && !('deleted' in session.customer && session.customer.deleted)
    ? session.customer as Stripe.Customer
    : null
  const ownerUserId = customer?.metadata?.supabase_user_id || session.metadata?.supabase_user_id || null
  const browserProof = guestNonceMatches(
    req.cookies.get(GUEST_CHECKOUT_NONCE_COOKIE)?.value,
    session.metadata?.[GUEST_CHECKOUT_NONCE_HASH_KEY] ?? null,
  )

  const markerIds = [checkoutFulfilledMarkerId(sessionId), guestConflictMarkerId(sessionId), guestLoginClaimId(sessionId)]
  const { data: markerRows, error: markerError } = await admin.from('stripe_events').select('id').in('id', markerIds)
  if (markerError) return reply({ state: 'pending' })
  const hasMarker = (id: string) => (markerRows ?? []).some((row: { id?: string }) => row.id === id)

  let owner: { bornFromThisSession: boolean; createdAtMs: number | null } | null = null
  let ownerEmail: string | null = null
  if (ownerUserId) {
    const { data, error } = await admin.auth.admin.getUserById(ownerUserId)
    if (!error && data?.user) {
      const createdAtMs = Date.parse(data.user.created_at ?? '')
      owner = {
        bornFromThisSession: (data.user.app_metadata as Record<string, unknown> | undefined)?.[GUEST_ACCOUNT_SESSION_APP_METADATA_KEY] === sessionId,
        createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : null,
      }
      ownerEmail = normalizeGuestEmail(data.user.email ?? null)
    }
  }

  let signedInUserId: string | null = null
  try {
    const { data } = await createClient().auth.getUser()
    signedInUserId = data.user?.id ?? null
  } catch {
    signedInUserId = null
  }

  const decision = decideGuestAccess({
    session: { isGuest: isGuestCheckoutSession(session), status: session.status ?? null, paymentStatus: session.payment_status ?? null },
    ownerUserId,
    fulfilled: hasMarker(checkoutFulfilledMarkerId(sessionId)),
    conflict: hasMarker(guestConflictMarkerId(sessionId)),
    owner,
    browserProof,
    loginAlreadyUsed: hasMarker(guestLoginClaimId(sessionId)),
    signedInUserId,
    nowMs: Date.now(),
  })
  // O e-mail mascarado só aparece para o navegador que abriu a compra.
  const emailHint = browserProof ? maskGuestEmail(ownerEmail ?? session.customer_details?.email ?? null) : null

  if (decision.state === 'unavailable') return reply({ state: 'unavailable' }, 404)
  if (decision.state === 'pending') return reply({ state: 'pending', email_hint: emailHint })
  if (decision.state === 'conflict') return reply({ state: 'conflict', email_hint: emailHint })
  if (decision.state === 'signed_in') return reply({ state: 'signed_in' }, 200, true)

  if (decision.state === 'sign_in' && ownerUserId && ownerEmail) {
    const claimId = guestLoginClaimId(sessionId)
    const claim = await claimMarker(admin, claimId)
    if (claim === 'taken') {
      return reply({ state: 'check_email', reason: 'already_used', email_hint: emailHint, email_sent: false, can_email: true })
    }
    if (claim === 'error') return reply({ state: 'pending', email_hint: emailHint })

    // Link gerado pelo admin e trocado por sessão AQUI, no servidor: o token nunca sai da função. Os cookies da
    // sessão nova saem na resposta (o mesmo cliente SSR que a /auth/callback usa).
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: ownerEmail })
    const tokenHash = (linkData?.properties as { hashed_token?: string } | undefined)?.hashed_token
    let signedIn = false
    if (!linkError && tokenHash) {
      const supabase = createClient()
      const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
      if (!otpError && otpData?.user?.id === ownerUserId && otpData.session) {
        signedIn = true
      } else if (otpData?.session) {
        // Trava: a sessão emitida tem de ser do dono desta compra. Qualquer outra é descartada na hora.
        await supabase.auth.signOut({ scope: 'local' })
      }
    }
    if (!signedIn) {
      // Falhou antes de logar: devolve a vaga (a pessoa tenta de novo ou usa o e-mail). Nunca conta como uso.
      await releaseMarker(admin, claimId)
      console.error('[guest-access] one-time sign-in failed; claim released:', sessionId.slice(0, 16), linkError?.message ?? 'verify')
      return reply({ state: 'pending', email_hint: emailHint })
    }
    await writeServerEvent({
      name: GUEST_CHECKOUT_EVENTS.loginUsed,
      userId: ownerUserId,
      path: '/api/stripe/checkout/guest-access',
      metadata: { version: GUEST_CHECKOUT_VERSION, method: 'auto', stripe_session_id: sessionId },
    })
    return reply({ state: 'signed_in' }, 200, true)
  }

  if (decision.state === 'sign_in') return reply({ state: 'pending', email_hint: emailHint })

  // check_email: conta existente (link sai sozinho, 1×) ou conta nova fora do navegador/da janela/já usada (o link sai
  // quando a pessoa pede). Outro usuário logado neste navegador: nada é enviado daqui.
  const reason = decision.reason
  let emailSent = false
  let emailLimit = false
  if (reason !== 'other_account_signed_in' && ownerUserId && ownerEmail) {
    const mode: 'auto' | 'request' | null = action === 'email'
      ? 'request'
      : reason === 'existing_account' && browserProof ? 'auto' : null
    if (mode) {
      const slot = await claimEmailSlot(admin, sessionId, mode)
      if (slot.slot) {
        emailSent = await sendSignInEmail(admin, { email: ownerEmail, userId: ownerUserId, origin: req.nextUrl.origin, sessionId, reason })
        if (!emailSent) await releaseMarker(admin, slot.slot)
      } else if (mode === 'auto') {
        emailSent = slot.alreadySent
      } else {
        emailLimit = slot.alreadySent
      }
    }
  }
  if (reason !== 'existing_account') {
    // Uma linha por (sessão, motivo): mede quantos compradores novos perdem o login automático e por quê.
    try {
      await admin.from('events').insert({
        id: deterministicEventUuid(GUEST_CHECKOUT_EVENTS.loginRefused, `${sessionId}:${reason}`),
        name: GUEST_CHECKOUT_EVENTS.loginRefused,
        user_id: ownerUserId,
        path: '/api/stripe/checkout/guest-access',
        metadata: { version: GUEST_CHECKOUT_VERSION, stripe_session_id: sessionId, reason, browser_proof: browserProof },
      })
    } catch {
      // medição; nunca derruba a resposta
    }
  }
  return reply({
    state: 'check_email',
    reason,
    email_hint: emailHint,
    email_sent: emailSent,
    email_limit: emailLimit,
    can_email: reason !== 'other_account_signed_in',
  })
}
