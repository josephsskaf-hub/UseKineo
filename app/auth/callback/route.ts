import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthRedirect } from '@/lib/authRedirect'
import { writeServerEvent } from '@/lib/serverEvents'
import { maybeActivateReverseTrial } from '@/lib/reverseTrial'
import { trialFingerprintFromHeaders } from '@/lib/trialFingerprint'
import { buildCheckoutOAuthFailureHandoff } from '@/lib/growth/checkoutOAuthFailureHandoff'
import type { CreationOAuthFailureTelemetry } from '@/lib/growth/creationOAuthFailureHandoff'
import {
  CHECKOUT_AUTH_SESSION_COOKIE,
  CHECKOUT_AUTH_SESSION_BRIDGE_VERSION,
  normalizeEventSessionId,
} from '@/lib/growth/checkoutAuthSessionBridge'
import {
  AFFILIATE_ATTRIBUTION_COOKIE_NAMES,
  finalizeAffiliateSignupAttribution,
} from '@/lib/affiliateSignupFinalization'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'

// Activation-first: new users go straight to /generate to make their first
// free Short (up to 3 watermarked Fast previews / 24h) — product value BEFORE
// the paywall. The Google
// Ads registration conversion still fires via ?signup=1 (handled in
// GenerateClient). Returning users go to /generate (or an explicit `next`).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next')
  const failureHandoff = buildCheckoutOAuthFailureHandoff(rawNext)
  let creationFailureTelemetry: CreationOAuthFailureTelemetry | null = null
  const requestCookies = cookies()
  const checkoutAuthSessionId = normalizeEventSessionId(
    requestCookies.get(CHECKOUT_AUTH_SESSION_COOKIE)?.value,
  )

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Push #188 — detect new signup vs returning login so the client can
      // fire the Google Ads conversion only on first-time registrations.
      // Push #281 — new users are routed to /pricing so they see plans immediately.
      let isNewUser = false
      try {
        const createdAt = data.user?.created_at
        const lastSignIn = data.user?.last_sign_in_at
        if (createdAt && lastSignIn) {
          const diffMs = Math.abs(new Date(lastSignIn).getTime() - new Date(createdAt).getTime())
          isNewUser = diffMs < 10_000 // within 10 s → brand-new account
        }
      } catch {
        /* ignore */
      }
      // KINEO-CHECKOUT-RESUME-2026-07-07 — a NEW user whose `next` points at a
      // checkout endpoint came from a buy click that bounced on auth. Resuming
      // the purchase beats the activation flow (they're about to PAY); every
      // other new user keeps the /generate?signup=1 onboarding.
      // KINEO-POUSO-VITRINE-2026-08-25 (fundador, print na mão: "gostaria que
      // entrasse sempre na tela onde estão os quatro") — o pouso padrão do
      // login vira a HOME (vitrine dos 4 motores), não mais o /generate com o
      // onboarding. `next` explícito (prompt da home, checkout, campanha)
      // continua mandando. A conversão de cadastro do Ads (?signup=1) que
      // morava no GenerateClient agora TAMBÉM dispara na home via
      // SignupConversionTracker — mover o pouso sem mover o disparo seria
      // comprar clique e não contar o cadastro.
      const safeNext = resolveAuthRedirect(rawNext, '/')
      const isCheckoutNext =
        safeNext.startsWith('/api/stripe/checkout') || safeNext.startsWith('/api/paypal/checkout')
      let destinationPath = safeNext
      if (isNewUser && !isCheckoutNext) {
        // KINEO-RECOVERY-2026-07-15 — keep the exact homepage idea through a
        // brand-new Google/Apple OAuth account. The old branch discarded every
        // non-checkout `next`, turning a high-intent prompt into a blank screen.
        const destination = new URL(safeNext, origin)
        destination.searchParams.set('signup', '1')
        destinationPath = `${destination.pathname}${destination.search}`
      }
      const destinationUrl = new URL(destinationPath, origin)
      const rawIntentCampaign = (destinationUrl.searchParams.get('intent_campaign') ?? '').trim()
      const intentCampaign = /^[A-Za-z0-9._~-]{1,100}$/.test(rawIntentCampaign)
        ? rawIntentCampaign
        : null
      // PUSH #21 — client events can disappear when a user closes the tab
      // during the OAuth return. Persist the completed callback before the
      // redirect so signup -> destination is now an authoritative server fact.
      await writeServerEvent({
        name: 'auth_callback_completed',
        userId: data.user?.id ?? null,
        path: '/auth/callback',
        sessionId: isCheckoutNext ? checkoutAuthSessionId : null,
        metadata: {
          auth_session_bridge_version: CHECKOUT_AUTH_SESSION_BRIDGE_VERSION,
          session_bridge_present: isCheckoutNext && Boolean(checkoutAuthSessionId),
          is_new_user: isNewUser,
          is_checkout_destination: isCheckoutNext,
          destination_path: destinationUrl.pathname.slice(0, 128),
          has_prompt: destinationUrl.searchParams.has('prompt'),
          intent_campaign: intentCampaign,
          provider: typeof data.user?.app_metadata?.provider === 'string'
            ? data.user.app_metadata.provider.slice(0, 32)
            : 'unknown',
        },
      })
      // ══ KINEO-TRIAL-GRANT-ORFAO-2026-08-28 ═══════════════════════════════
      //
      // O DEFEITO. Os créditos de trial NUNCA foram concedidos no cadastro.
      // Eram concedidos por VISITA A UMA PÁGINA: `/studio/create` chamava
      // maybeActivateReverseTrial() com o comentário "primeiro ponto SERVIDOR
      // que toda conta autenticada atravessa". Essa frase deixou de ser
      // verdade em 25/08, quando o pouso pós-login virou a HOME (a vitrine
      // dos quatro motores). O outro caminho — /api/track-signup-source — é
      // um `fetch` fire-and-forget do cliente (lib/analytics.ts): bloqueador
      // de anúncio, navegação rápida ou aba fechada e o crédito não sai.
      //
      // Ou seja: quem se cadastrava e ia para /pricing, para a página de
      // afiliado, ou para lugar nenhum, ficava com 0 CRÉDITOS e
      // trial_status NULL. Sem erro, sem aviso, sem nada na tela. A pessoa
      // via um produto que não podia usar.
      //
      // MEDIDO EM PRODUÇÃO (28/08): 25/08 = 0% dos cadastros afetados,
      // 26/08 = 14%, 27/08 = 17%, 28/08 = 100% (1 de 1). A curva sobe
      // exatamente a partir da mudança de pouso. O caso que revelou:
      // felixvasquez15031988 cadastrou, foi direto para os preços e disparou
      // `checkout_started` COM SALDO ZERO — alguém tentando comprar sem nunca
      // ter conseguido testar. E `talsadeh91` virou AFILIADO sem nunca ter
      // feito um vídeo.
      //
      // A CURA. Crédito de cadastro pertence ao CADASTRO, não a uma tela.
      // Este callback é o único ponto de servidor por onde TODA conta nova
      // passa obrigatoriamente — prova: `auth_callback_completed` existe nas
      // quatro contas quebradas e em todas as sadias. A ativação continua
      // idempotente (guarda `.is('trial_status', null)` dentro da função), o
      // que torna seguro ela também continuar rodando em /studio/create: quem
      // chegar primeiro concede, o segundo é no-op.
      //
      // AWAIT, não `void`: numa função serverless a promessa solta morre com
      // o congelamento da instância — é exatamente assim que um crédito
      // "concedido" nunca chega na conta. O custo é uma escrita antes do
      // redirect; o benefício é o cadastro nunca mais nascer sem saldo.
      // Nunca quebra o login: erro aqui só vira log.
      if (data.user) {
        try {
          await maybeActivateReverseTrial({
            userId: data.user.id,
            email: data.user.email ?? null,
            userCreatedAt: data.user.created_at ?? null,
            fingerprintHash: trialFingerprintFromHeaders(request.headers),
          })
        } catch (e) {
          console.error('[auth/callback] reverse-trial non-fatal:', e instanceof Error ? e.message : String(e))
        }
      }

      // A signup can legitimately land on the public homepage, whose layout
      // does not mount AffiliateAutoTrigger. Finalize the protected click here,
      // while OAuth/email-confirmation still carries the first-touch cookies;
      // the dashboard trigger remains a retry for transient failures.
      const affiliateFinalization = data.user
        ? await finalizeAffiliateSignupAttribution({
          rawCode: requestCookies.get('sf_aff')?.value,
          rawClickId: requestCookies.get('sf_aff_click')?.value,
          user: {
            id: data.user.id,
            email: data.user.email ?? null,
            createdAt: data.user.created_at ?? null,
          },
          source: 'auth_callback',
        })
        : { attempted: false, clearCookies: false, outcome: 'no_user' }

      const dest = `${origin}${destinationPath}`
      const response = NextResponse.redirect(dest)
      if (isCheckoutNext) {
        response.cookies.set(CHECKOUT_AUTH_SESSION_COOKIE, '', {
          maxAge: 0,
          path: '/',
          sameSite: 'lax',
          secure: true,
        })
      }
      if (affiliateFinalization.clearCookies) {
        for (const name of AFFILIATE_ATTRIBUTION_COOKIE_NAMES) {
          response.cookies.set(name, '', {
            maxAge: 0,
            path: '/',
            sameSite: 'lax',
            secure: true,
          })
        }
      }
      return response
    }
  }

  // Checkout owns its own exact recovery contract. Only after it declines the
  // destination may FLUXO recover the two creation handoffs already allowed on
  // the login wall. Lazy loading keeps this optional recovery fail-closed: an
  // unexpected module failure falls back to the existing generic login path.
  if (!failureHandoff.telemetry.is_checkout_destination) {
    try {
      const { buildCreationOAuthFailureHandoff } = await import('@/lib/growth/creationOAuthFailureHandoff')
      const creationFailureHandoff = buildCreationOAuthFailureHandoff(rawNext)
      creationFailureTelemetry = creationFailureHandoff.telemetry
      if (creationFailureHandoff.loginPath) {
        failureHandoff.loginPath = creationFailureHandoff.loginPath
      }
    } catch {
      creationFailureTelemetry = null
    }
  }

  // Store no OAuth code or error detail. This only proves that the callback
  // failed to establish a session, which is enough to diagnose the broken hop.
  await writeServerEvent({
    name: 'auth_callback_failed',
    path: '/auth/callback',
    sessionId: failureHandoff.telemetry.is_checkout_destination ? checkoutAuthSessionId : null,
    metadata: {
      auth_session_bridge_version: CHECKOUT_AUTH_SESSION_BRIDGE_VERSION,
      session_bridge_present:
        failureHandoff.telemetry.is_checkout_destination && Boolean(checkoutAuthSessionId),
      had_code: Boolean(code),
      ...failureHandoff.telemetry,
      ...(creationFailureTelemetry ?? {}),
    },
  })

  const response = NextResponse.redirect(new URL(failureHandoff.loginPath, origin))
  if (failureHandoff.telemetry.is_checkout_destination) {
    response.cookies.set(CHECKOUT_AUTH_SESSION_COOKIE, '', {
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: true,
    })
  }
  return response
}
