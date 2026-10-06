import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthRedirect } from '@/lib/authRedirect'
import { writeServerEvent } from '@/lib/serverEvents'
import { revokeGuestSessionsOnce, verifyGuestReadyToken } from '@/lib/auth/guestAccess'
import {
  GUEST_ACCOUNT_SESSION_APP_METADATA_KEY,
  GUEST_CHECKOUT_EVENTS,
  GUEST_CHECKOUT_VERSION,
  guestReadyLinkClaimId,
} from '@/lib/growth/guestCheckout'

// ═══ KINEO-COMPRA-SEM-LOGIN-2026-10-06 — os links de entrada que vão por e-mail depois de uma compra sem login ═════
// Dois formatos, os dois viram sessão AQUI, no servidor (verifyOtp + cookies do cliente SSR, o mesmo da /auth/callback):
//   · ?token_hash=… — o token do Auth gerado pelo admin (e-mail de /api/stripe/checkout/guest-access);
//   · ?ready=…      — o token NOSSO do e-mail "sua conta está pronta" (webhook): assinado, com dono, sessão Stripe e
//                     validade (lib/auth/guestAccess.ts), uso único (guest_ready_link_used:<sessão>). Na hora do clique
//                     o admin gera o link do Auth e troca na mesma requisição — o token do Auth nunca sai do servidor.
// Sem PKCE de propósito: o dono pode abrir o e-mail em OUTRO aparelho; o PKCE exigiria o verificador guardado no
// navegador que pediu o link (que pode ser justamente o de quem pagou com o e-mail de outra pessoa).
// Toda entrada por aqui PROVA o e-mail: numa conta nascida de compra sem login, a 1ª derruba as outras sessões.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const TOKEN_HASH_PATTERN = /^[A-Za-z0-9_-]{16,200}$/

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = resolveAuthRedirect(searchParams.get('next'), '/studio')
  const failure = NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(next)}`, origin))
  const supabase = createClient()

  let tokenHash = (searchParams.get('token_hash') ?? '').trim()
  let method: 'email_link' | 'ready_email_link' = 'email_link'
  let readyClaim: string | null = null
  const admin = adminClient()
  const ready = searchParams.get('ready')
  if (ready) {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret || !admin) return failure
    const check = verifyGuestReadyToken(ready, { secret, nowSeconds: Math.floor(Date.now() / 1000) })
    if (!check.ok) return failure
    readyClaim = guestReadyLinkClaimId(check.stripeSessionId)
    const { error: claimError } = await admin.from('stripe_events').insert({ id: readyClaim })
    if (claimError) return failure // 23505 = já usado; outro erro = não arrisca um 2º uso
    const { data: owner } = await admin.auth.admin.getUserById(check.userId)
    const email = owner?.user?.email ?? null
    const { data: linkData, error: linkError } = email
      ? await admin.auth.admin.generateLink({ type: 'magiclink', email })
      : { data: null, error: { message: 'owner email missing' } }
    tokenHash = (linkData?.properties as { hashed_token?: string } | undefined)?.hashed_token ?? ''
    if (linkError || !tokenHash) {
      await admin.from('stripe_events').delete().eq('id', readyClaim)
      return failure
    }
    method = 'ready_email_link'
  }
  if (!TOKEN_HASH_PATTERN.test(tokenHash)) return failure

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
  if (error || !data?.user || !data.session) {
    if (readyClaim && admin) await admin.from('stripe_events').delete().eq('id', readyClaim)
    return failure
  }

  // Conta nascida de compra sem login: esta entrada provou o e-mail → as OUTRAS sessões caem (uma vez por conta).
  await revokeGuestSessionsOnce({ supabase, user: data.user, session: data.session, method, path: '/auth/guest-link' })

  await writeServerEvent({
    name: GUEST_CHECKOUT_EVENTS.loginUsed,
    userId: data.user.id,
    path: '/auth/guest-link',
    metadata: {
      version: GUEST_CHECKOUT_VERSION,
      method,
      guest_account: Boolean((data.user.app_metadata as Record<string, unknown> | undefined)?.[GUEST_ACCOUNT_SESSION_APP_METADATA_KEY]),
    },
  })
  return NextResponse.redirect(new URL(next, origin))
}
