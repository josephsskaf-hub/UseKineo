import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeInternalRedirect } from '@/lib/authRedirect'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  AFFILIATE_ATTRIBUTION_COOKIE_NAMES,
  finalizeAffiliateSignupAttribution,
} from '@/lib/affiliateSignupFinalization'
// KINEO-TRIAL-GRANT-EMAIL-2026-09-04 — o mesmo remedio do a1fed16c, na porta
// que ele nao cobriu (cadastro por e-mail e senha). Ver o bloco no handler.
import { maybeActivateReverseTrial } from '@/lib/reverseTrial'
import { trialFingerprintFromHeaders } from '@/lib/trialFingerprint'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    // The email/password path already awaits this route before leaving
    // /signup. Use that authoritative hop to finalize affiliate first-touch
    // instead of waiting for a later dashboard mount that may never happen.
    const affiliateFinalization = await finalizeAffiliateSignupAttribution({
      rawCode: req.cookies.get('sf_aff')?.value,
      rawClickId: req.cookies.get('sf_aff_click')?.value,
      user: {
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
      },
      source: 'email_activation',
    })

    const body = await req.json().catch(() => ({}))
    const destination = normalizeInternalRedirect(
      typeof body?.destination === 'string' ? body.destination : null,
    ) ?? '/studio'
    const destinationUrl = new URL(destination, 'https://www.usekineo.com')
    const rawIntentCampaign = (destinationUrl.searchParams.get('intent_campaign') ?? '').trim()
    const intentCampaign = /^[A-Za-z0-9._~-]{1,100}$/.test(rawIntentCampaign)
      ? rawIntentCampaign
      : null
    const createdAt = Date.parse(user.created_at ?? '')
    const isRecentSignup = Number.isFinite(createdAt)
      && Date.now() - createdAt >= 0
      && Date.now() - createdAt < 5 * 60 * 1000

    // ══ KINEO-TRIAL-GRANT-EMAIL-2026-09-04 ═══════════════════════════════
    //
    // O DEFEITO. Em 28/08 o a1fed16c devolveu o crédito de cadastro ao
    // CADASTRO: `maybeActivateReverseTrial()` passou a rodar em
    // `app/auth/callback/route.ts`, "o único ponto de servidor por onde TODA
    // conta nova passa obrigatoriamente". A frase é verdadeira para OAuth e
    // link mágico — e só para eles. Quem se cadastra com E-MAIL E SENHA não
    // cruza o /auth/callback: essa conta continuou dependendo dos dois
    // caminhos frágeis que o próprio a1fed16c condenou — a VISITA a
    // `/studio/create` e o `fetch` fire-and-forget de
    // `/api/track-signup-source` (bloqueador de anúncio, navegação rápida ou
    // aba fechada e o crédito não sai).
    //
    // MEDIDO EM PRODUÇÃO (04/09, contas externas, 14 dias): dos 47 cadastros
    // que só têm `email_signup_completed` (sem `auth_callback_completed`), 4
    // nasceram com trial_status NULL e 0 crédito — 8,5%. Os quatro
    // aconteceram numa janela de 6h do dia 04/09 e têm o MESMO rastro:
    // `email_signup_completed` seguido de `homepage_view` /
    // `viral_onboarding_viewed`. Ou seja: a pessoa se cadastrou, foi parar na
    // vitrine (o pouso padrão desde 25/08), nunca abriu o /studio, e o fetch
    // do cliente não chegou. Dos 14 órfãos dos últimos 21 dias, NENHUM fez um
    // único vídeo na vida — a taxa de morte desse grupo é 100%.
    //
    // A PROVA DE QUE ESTA É A PORTA CERTA. Esta rota é o espelho exato do
    // callback para o caminho de senha: roda no SERVIDOR, devolve 401 sem
    // sessão (logo, quando ela escreve, o usuário está autenticado), e os
    // QUATRO órfãos têm `email_signup_completed` gravado — ela foi alcançada
    // em 100% dos casos que ficaram sem crédito.
    //
    // IDEMPOTENTE POR CONSTRUÇÃO: a UPDATE do grant é protegida por
    // `.is('trial_status', null)` dentro de lib/reverseTrial.ts, então
    // callback, /studio/create, track-signup-source e esta rota podem todos
    // chamar — quem chegar primeiro concede, o resto é no-op. As guardas
    // anti-abuso (conta <24h, 1 trial por conta para sempre, domínio
    // descartável, N trials por fingerprint) continuam INTEIRAS: o
    // fingerprint sai daqui, dos headers desta request.
    //
    // AWAIT, não `void`: numa função serverless a promessa solta morre com o
    // congelamento da instância — é exatamente assim que um crédito
    // "concedido" nunca chega na conta. Erro aqui só vira log: o cadastro
    // nunca quebra por causa do trial.
    let trialActivated: boolean | null = null
    let trialReason: string | null = null
    try {
      const outcome = await maybeActivateReverseTrial({
        userId: user.id,
        email: user.email ?? null,
        userCreatedAt: user.created_at ?? null,
        fingerprintHash: trialFingerprintFromHeaders(req.headers),
      })
      trialActivated = outcome.activated
      trialReason = outcome.reason.slice(0, 40)
    } catch (e) {
      console.error(
        '[activation-completed] reverse-trial non-fatal:',
        e instanceof Error ? e.message : String(e),
      )
    }

    const stored = await writeServerEvent({
      name: 'email_signup_completed',
      userId: user.id,
      path: '/signup',
      metadata: {
        destination_path: destinationUrl.pathname.slice(0, 128),
        has_prompt: destinationUrl.searchParams.has('prompt'),
        is_recent_signup: isRecentSignup,
        intent_campaign: intentCampaign,
        // KINEO-TRIAL-GRANT-EMAIL-2026-09-04 — a medição sai de graça: este
        // evento passa a dizer se o cadastro por senha saiu daqui COM saldo.
        // `false` com razão `trial_already_used` é o caso saudável (o fetch
        // do cliente ganhou a corrida); `false` com `no_profile`/`read_error`
        // é defeito de verdade.
        trial_activated: trialActivated,
        trial_reason: trialReason,
      },
    })
    const response = NextResponse.json({ ok: true, stored })
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
  } catch (error) {
    console.error('[activation-completed] unexpected failure:', error)
    return NextResponse.json({ ok: true, stored: false })
  }
}
