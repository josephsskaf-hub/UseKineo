import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { EVENT_SESSION_COOKIE, normalizeEventSessionId } from '@/lib/growth/checkoutAuthSessionBridge'
import { resolveHomeVariant } from '@/lib/growth/homeClipsFirstServer'
import {
  HOME_EXPOSURE_COOKIE,
  HOME_EXPOSURE_COOKIE_MAX_AGE_SECONDS,
  HOME_VARIANT_EVENT_VERSION,
  HOME_VARIANT_EXPOSED_EVENT,
  HOME_VISITOR_COOKIE,
  homeBucket,
  homeExposureDay,
  homeExposureDedupeKey,
  homeExposureSurface,
  normalizeHomeVisitorId,
} from '@/lib/growth/homeClipsFirst'

// KINEO-HOME-CLIPS-FIRST-2026-10-05 — exposição do A/B da home, gravada pelo SERVIDOR.
//
// A home monta um sinal mínimo (components/home/HomeVariantExposure.tsx) que só diz "a página apareceu num navegador".
// TUDO o que vai na linha é decidido AQUI: a variante é RECALCULADA no servidor a partir do user_id da sessão ou do
// cookie httpOnly kineo_vid (a mesma resolveHomeVariant da home) — o corpo do pedido não escolhe variante nenhuma. O nome
// está em SERVER_ONLY_EVENTS de app/api/events/route.ts: o sink público do navegador não cunha esta linha.
//
// Por que não gravar dentro do Server Component da home: seria +1 ida ao banco (dedupe + insert) no caminho crítico de
// TODA visita da página mais importante do site. Aqui o custo sai depois da pintura, e robô sem JS nem chega.
//
// DEDUPE: cookie httpOnly kineo_hve = `${dia UTC}|${variante}|${atribuição}` — uma linha por navegador, por dia, por
// variante/atribuição. Quem loga no mesmo dia ganha uma 2ª linha (atribuição 'user'): é ela que liga o kineo_vid ao
// user_id na SQL do A/B. Segunda rede (só sem id): dedupe de 24 h por (nome, session_id) do writeServerEvent.
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Só a própria página chama isto. Navegador moderno manda Sec-Fetch-Site; se mandar e não for same-origin, recusa.
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin') return NextResponse.json({ ok: false }, { status: 403 })

  let userId: string | null = null
  let email: string | null = null
  try {
    const { data } = await createClient().auth.getUser()
    userId = data.user?.id ?? null
    email = data.user?.email ?? null
  } catch {
    userId = null
  }

  const choice = resolveHomeVariant({ userId, email })
  if (!choice.expose) return NextResponse.json({ ok: true, recorded: false, reason: choice.reason })

  let body: { variant?: unknown; surface?: unknown } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    body = {}
  }

  const day = homeExposureDay()
  const dedupeKey = homeExposureDedupeKey(day, choice)
  if (req.cookies.get(HOME_EXPOSURE_COOKIE)?.value === dedupeKey) {
    return NextResponse.json({ ok: true, recorded: false, reason: 'dedupe' })
  }

  const recorded = await writeServerEvent({
    name: HOME_VARIANT_EXPOSED_EVENT,
    userId,
    path: '/',
    sessionId: normalizeEventSessionId(req.cookies.get(EVENT_SESSION_COOKIE)?.value),
    // Rede extra SÓ para quem não tem id (modo 'all' com cookie bloqueado): com id, o dedupe por sessão engoliria a
    // linha 'user' que nasce no login — e é ela que liga o kineo_vid à conta.
    dedupeMinutes: choice.assignment ? undefined : 24 * 60,
    metadata: {
      version: HOME_VARIANT_EVENT_VERSION,
      variant: choice.variant,
      assignment: choice.assignment,
      mode: choice.mode,
      surface: homeExposureSurface(body.surface),
      // id aleatório do cookie first-party (não é PII): liga a exposição anônima à conta que nasce depois.
      visitor_id: choice.assignment === 'visitor' ? choice.assignmentId : normalizeHomeVisitorId(req.cookies.get(HOME_VISITOR_COOKIE)?.value),
      bucket: choice.assignmentId ? homeBucket(choice.assignmentId) : null,
      // A página mostrou a mesma variante que o servidor recalculou? (false = cookie trocou no meio; linha fica, marcada)
      rendered_match: body.variant === choice.variant,
      day,
    },
  })

  const res = NextResponse.json({ ok: true, recorded })
  if (recorded) {
    res.cookies.set(HOME_EXPOSURE_COOKIE, dedupeKey, {
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: HOME_EXPOSURE_COOKIE_MAX_AGE_SECONDS,
    })
  }
  return res
}
