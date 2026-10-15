// #479 — Affiliate link handler: /a/{CODE}
// Logs the click, sets a 90-day FIRST-TOUCH cookie (only if not already set),
// then redirects to one allowlisted first-party acquisition surface (since
// KINEO-AFILIADO-DESTINO-1610 legacy/invalid links go to the tagged default
// destination, never to an untagged homepage). Attribution is finalized at
// signup by /auth/callback + /api/auth/activation-completed (and again before
// the Stripe session) reading this cookie. Service-role only (RLS deny-all).
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient as createAdmin } from '@supabase/supabase-js'
import {
  affiliateBotReason,
  affiliateClickLandingPath,
  buildAffiliateRouteDestinationUrl,
  defaultAffiliateRouteDestination,
  getAffiliateRouteDestination,
  isAffiliatePreviewBot,
} from '@/lib/affiliateDestinations'
import { normalizeAffiliateClickId, normalizeAffiliateCode } from '@/lib/affiliateAttribution'
import { writeServerEvent } from '@/lib/serverEvents'

export const dynamic = 'force-dynamic'
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
export const runtime = 'nodejs'

const COOKIE = 'sf_aff'
const CLICK_COOKIE = 'sf_aff_click'
const COOKIE_HINT = 'sf_aff_hint'
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60 // 90 days, in seconds
const SALT = process.env.AFFILIATE_IP_SALT ?? null

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// KINEO-AFILIADO-DESTINO-1610 — evento de clique que separa robô de gente. `affiliate_clicks` só recebe humano
// (é a prova financeira e o "Link visits" do parceiro); este evento recebe TODO clique de código ativo, com
// is_bot + motivo, para o placar contar gente sem inflar e ainda enxergar quanto robô cada link atrai.
// Sem código nem UUID de prova: affiliate_id (interno) e o caminho público que a pessoa usou bastam.
// Nome reservado ao servidor em app/api/events/route.ts (SERVER_ONLY_EVENTS) — o navegador não forja clique.
type AffiliateClickOutcome = 'bot' | 'same_browser_refresh' | 'counted' | 'click_log_failed' | 'proof_lookup_failed'

function referrerHost(raw: string | null): string | null {
  if (!raw) return null
  try {
    return new URL(raw).hostname.replace(/^www\./, '').slice(0, 120) || null
  } catch {
    return null
  }
}

async function recordAffiliateClickEvent(input: {
  affiliateId: string
  landingPath: string
  destinationKey: string
  explicitDestination: boolean
  botReason: string | null
  outcome: AffiliateClickOutcome
  referrer: string | null
}): Promise<void> {
  try {
    await writeServerEvent({
      name: 'affiliate_link_clicked',
      path: input.landingPath,
      metadata: {
        affiliate_id: input.affiliateId,
        destination: input.destinationKey,
        explicit_to: input.explicitDestination,
        is_bot: input.botReason !== null,
        bot_reason: input.botReason,
        outcome: input.outcome,
        counted: input.outcome === 'counted',
        referrer_host: referrerHost(input.referrer),
      },
    })
  } catch {
    // Medição nunca segura o redirecionamento.
  }
}

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const appUrl = req.nextUrl.origin
  const code = normalizeAffiliateCode(params.code)

  // KINEO-AFILIADO-DESTINO-1610 — TODO redirecionamento sai com etiqueta de afiliado para a página que mais
  // cadastra. `to` é uma chave de lista branca, nunca caminho ou URL: valor ausente, desconhecido ou malicioso cai
  // no destino padrão (video), jamais em outro host. Antes: sem `?to=` (ou código inválido/inativo, ou banco fora)
  // a pessoa caía na home SEM utm e virava "direto" no placar.
  const requested = getAffiliateRouteDestination(req.nextUrl.searchParams.get('to'))
  const destination = requested ?? defaultAffiliateRouteDestination()
  const explicit = requested !== null
  const destinationUrl = buildAffiliateRouteDestinationUrl(appUrl, destination.key, code)
  if (!code) return NextResponse.redirect(destinationUrl)

  try {
    const sb = admin()
    const { data: aff } = await sb
      .from('affiliates')
      .select('id, status')
      .eq('code', code)
      .single()

    // Unknown or inactive code → useful tagged destination, but no cookie and no click row.
    if (!aff || aff.status !== 'active') {
      return NextResponse.redirect(destinationUrl)
    }

    const res = NextResponse.redirect(destinationUrl)
    const userAgent = (req.headers.get('user-agent') ?? '').slice(0, 300)
    const referrer = req.headers.get('referer')
    const landingPath = affiliateClickLandingPath(code, explicit ? destination : null)
    // Decide com o filtro de sempre; o motivo (token casado ou UA vazio) só alimenta o evento robô x gente.
    const botReason = isAffiliatePreviewBot(userAgent) ? affiliateBotReason(userAgent) : null
    const clickEvent = (outcome: AffiliateClickOutcome) => recordAffiliateClickEvent({
      affiliateId: aff.id,
      landingPath,
      destinationKey: destination.key,
      explicitDestination: explicit,
      botReason,
      outcome,
      referrer,
    })
    if (botReason) {
      await clickEvent('bot')
      return res
    }
    const existingRaw = req.cookies.get(COOKIE)?.value
    const existingCode = normalizeAffiliateCode(existingRaw)
    const existingClickId = normalizeAffiliateClickId(req.cookies.get(CLICK_COOKIE)?.value)

    // Refresh/reopen in the same proven browser is not another acquisition
    // visit. Reuse the protected proof and refresh only the client hint. This
    // also caps accidental write amplification without weakening first-touch.
    if (existingCode === code && existingClickId) {
      const { data: sameProof, error: sameProofError } = await sb
        .from('affiliate_clicks')
        .select('id')
        .eq('id', existingClickId)
        .eq('affiliate_id', aff.id)
        .maybeSingle()
      if (sameProofError) {
        await clickEvent('proof_lookup_failed')
        return res
      }
      if (sameProof?.id === existingClickId) {
        res.cookies.set(COOKIE_HINT, '1', {
          maxAge: COOKIE_MAX_AGE,
          sameSite: 'lax',
          secure: true,
          path: '/',
        })
        await clickEvent('same_browser_refresh')
        return res
      }
    }

    // Awaiting keeps serverless delivery reliable. A write failure never blocks
    // the useful destination, but attribution fails closed: no protected click
    // proof means no financial cookie is issued.
    const ipRaw =
      (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      ''
    // Without a private production salt, omit the pseudonymous IP dimension;
    // a public fallback would make the hash reversible for small IP ranges.
    const ipHash = ipRaw && SALT ? createHash('sha256').update(ipRaw + SALT).digest('hex') : null
    let clickProofId: string | null = null
    try {
      const { data: clickRow, error: clickError } = await sb
        .from('affiliate_clicks')
        .insert({
          affiliate_id: aff.id,
          ip_hash: ipHash,
          user_agent: userAgent,
          landing_path: landingPath,
          referrer: (req.headers.get('referer') ?? '').slice(0, 300),
        })
        .select('id')
        .maybeSingle()
      if (clickError) console.warn('[affiliate /a] click log unavailable:', clickError.code ?? 'unknown')
      else clickProofId = normalizeAffiliateClickId(clickRow?.id)
    } catch {
      // Analytics may fail; the destination and attribution cookie may not.
      console.warn('[affiliate /a] click log unavailable: exception')
    }

    // FIRST-TOUCH: preserve a valid active owner, but do not let a malformed,
    // deleted or suspended legacy cookie poison every later valid partner link.
    // A lookup outage preserves the old cookie (fail closed against takeover).
    let existingOwnerActive = false
    let existingProofValid = false
    let existingLookupAvailable = true
    if (existingCode) {
      const existingAffiliateResult = existingCode === code
        ? { data: aff, error: null }
        : await sb
          .from('affiliates')
          .select('id, status')
          .eq('code', existingCode)
          .maybeSingle()
      existingLookupAvailable = !existingAffiliateResult.error
      existingOwnerActive = Boolean(
        existingLookupAvailable &&
        existingAffiliateResult.data?.id &&
        existingAffiliateResult.data?.status === 'active',
      )
      if (existingOwnerActive && existingClickId) {
        const { data: existingProof, error: existingProofError } = await sb
          .from('affiliate_clicks')
          .select('id')
          .eq('id', existingClickId)
          .eq('affiliate_id', existingAffiliateResult.data!.id)
          .maybeSingle()
        existingLookupAvailable = !existingProofError
        existingProofValid = Boolean(!existingProofError && existingProof?.id === existingClickId)
      }
    }
    // A valid server-backed owner is immutable first-touch. A legacy or stale
    // code-only cookie has no financial proof; a new genuine click may replace
    // it, while a database outage preserves it (fail closed against takeover).
    const replaceExisting = existingLookupAvailable && (!existingOwnerActive || !existingProofValid)
    let effectiveClickId = existingProofValid ? existingClickId : null
    if (replaceExisting && clickProofId) {
      res.cookies.set(COOKIE, code, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
      })
      res.cookies.set(CLICK_COOKIE, clickProofId, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
      })
      effectiveClickId = clickProofId
    }
    // Readable boolean only — never the affiliate code. It lets the client
    // retry attribution if this link is followed after an earlier no-cookie
    // dashboard visit, without POSTing on every route change for everyone.
    if (effectiveClickId) {
      res.cookies.set(COOKIE_HINT, '1', {
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure: true,
        path: '/',
      })
    }
    await clickEvent(clickProofId ? 'counted' : 'click_log_failed')
    return res
  } catch (err) {
    console.error('[affiliate /a] error:', err)
    // Banco fora: destino útil e etiquetado, mas sem cookie nem clique (fail closed para o dinheiro).
    return NextResponse.redirect(destinationUrl)
  }
}
