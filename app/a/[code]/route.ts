// #479 — Affiliate link handler: /a/{CODE}
// Logs the click, sets a 90-day FIRST-TOUCH cookie (only if not already set),
// then redirects to one allowlisted first-party acquisition surface (or the
// homepage for legacy/invalid links). Attribution is finalized at signup by
// /api/affiliate/attribute reading this cookie. Service-role only (RLS deny-all).
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient as createAdmin } from '@supabase/supabase-js'
import {
  affiliateClickLandingPath,
  buildAffiliateDestinationUrl,
  getAffiliateDestination,
  isAffiliatePreviewBot,
} from '@/lib/affiliateDestinations'
import { normalizeAffiliateClickId, normalizeAffiliateCode } from '@/lib/affiliateAttribution'

export const dynamic = 'force-dynamic'
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

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const appUrl = req.nextUrl.origin
  const code = normalizeAffiliateCode(params.code)
  if (!code) return NextResponse.redirect(appUrl)

  // `to` is an enum, never a path or URL. Invalid/malicious values preserve
  // the legacy homepage behavior and can never become an open redirect.
  const destination = getAffiliateDestination(req.nextUrl.searchParams.get('to'))
  const destinationUrl = destination
    ? buildAffiliateDestinationUrl(appUrl, destination.key)
    : new URL('/', appUrl)

  try {
    const sb = admin()
    const { data: aff } = await sb
      .from('affiliates')
      .select('id, status')
      .eq('code', code)
      .single()

    // Unknown or inactive code → just send them home, no cookie, no click row.
    if (!aff || aff.status !== 'active') {
      return NextResponse.redirect(appUrl)
    }

    const res = NextResponse.redirect(destinationUrl)
    const userAgent = (req.headers.get('user-agent') ?? '').slice(0, 300)
    if (isAffiliatePreviewBot(userAgent)) return res
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
      if (sameProofError) return res
      if (sameProof?.id === existingClickId) {
        res.cookies.set(COOKIE_HINT, '1', {
          maxAge: COOKIE_MAX_AGE,
          sameSite: 'lax',
          secure: true,
          path: '/',
        })
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
          landing_path: affiliateClickLandingPath(code, destination),
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
    return res
  } catch (err) {
    console.error('[affiliate /a] error:', err)
    return NextResponse.redirect(appUrl)
  }
}
