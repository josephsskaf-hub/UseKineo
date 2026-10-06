import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthRedirect } from '@/lib/authRedirect'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  GUEST_ACCOUNT_SESSION_APP_METADATA_KEY,
  GUEST_CHECKOUT_EVENTS,
  GUEST_CHECKOUT_VERSION,
} from '@/lib/growth/guestCheckout'

// ═══ KINEO-COMPRA-SEM-LOGIN-2026-10-06 — o link de entrada que vai por e-mail depois de uma compra sem login ═══════
// O e-mail (app/api/stripe/checkout/guest-access) traz o token_hash que o admin do Auth gerou (generateLink
// 'magiclink'). Aqui ele vira sessão no servidor (verifyOtp + cookies do cliente SSR, o mesmo da /auth/callback).
// Sem PKCE de propósito: o dono pode abrir o e-mail em OUTRO aparelho — o PKCE exigiria o verificador guardado no
// navegador que pediu o link, que pode ser justamente o de quem pagou com o e-mail de outra pessoa. O Auth garante
// uso único e validade curta do token.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const TOKEN_HASH_PATTERN = /^[A-Za-z0-9_-]{16,200}$/

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = (searchParams.get('token_hash') ?? '').trim()
  const next = resolveAuthRedirect(searchParams.get('next'), '/studio')
  const failure = NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(next)}`, origin))
  if (!TOKEN_HASH_PATTERN.test(tokenHash)) return failure

  const supabase = createClient()
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
  if (error || !data?.user || !data.session) return failure

  await writeServerEvent({
    name: GUEST_CHECKOUT_EVENTS.loginUsed,
    userId: data.user.id,
    path: '/auth/guest-link',
    metadata: {
      version: GUEST_CHECKOUT_VERSION,
      method: 'email_link',
      guest_account: Boolean((data.user.app_metadata as Record<string, unknown> | undefined)?.[GUEST_ACCOUNT_SESSION_APP_METADATA_KEY]),
    },
  })
  return NextResponse.redirect(new URL(next, origin))
}
