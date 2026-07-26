// PUSH #100 — Attributed watermark landing: /free
//
// Every free "Fast" render burns `usekineo.com/free` into the top of the frame
// (lib/compose.ts, WATERMARK_TEXT). That burn is Kineo's only owned
// distribution surface: it rides along on every Short a free user publishes to
// YouTube / TikTok, and a viewer can only act on it by TYPING it. So the path
// has to be short, real, and attributable.
//
// This handler is the landing side of that contract:
//   1. stamps a 90-day FIRST-TOUCH httpOnly cookie (`kineo_wm_src=watermark`)
//      so the attribution survives even if the visitor strips the query string,
//      bounces through Google OAuth, or lands again days later;
//   2. 307-redirects to `/` WITH utm_source/medium/campaign, so the existing
//      client-side first-touch capture (captureUtmsOnce / captureSourceOnce in
//      lib/analytics.ts) records it through the normal path — no new pipeline.
//
// Why the value is `watermark` and not `usekineo.com`: lib/acquisitionSource.ts
// nulls any source whose token is one of OWN_HOSTS (usekineo.com is in that
// set), so burning the bare domain as a utm_source would be discarded as a
// self-referral and land in the `direct` bucket. `watermark` is not a host, so
// sanitizeAcquisitionUtmSource() falls through to its final `return token` and
// the source is preserved verbatim.
//
// Modelled on app/a/[code]/route.ts (the affiliate first-touch handler), minus
// the Supabase click log — there is no verified table for watermark clicks and
// this route must never depend on one. It performs NO database writes.
import { NextRequest, NextResponse } from 'next/server'

// Must never be statically cached: it sets a Set-Cookie header per visitor.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COOKIE = 'kineo_wm_src'
const COOKIE_VALUE = 'watermark'
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60 // 90 days, in seconds — matches /a/[code]

// Kept in one place so the burned frame, this redirect and any future report
// can never drift apart.
const TARGET = '/?utm_source=watermark&utm_medium=video&utm_campaign=free_fast'

export async function GET(req: NextRequest) {
  try {
    const res = NextResponse.redirect(new URL(TARGET, req.nextUrl.origin), 307)

    // FIRST-TOUCH: never overwrite an existing stamp. A viewer who arrived from
    // an affiliate link or an SEO page weeks ago and only now types the
    // watermark URL was not acquired by the watermark.
    if (!req.cookies.get(COOKIE)?.value) {
      res.cookies.set(COOKIE, COOKIE_VALUE, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
      })
    }
    return res
  } catch (err) {
    // The redirect matters more than the attribution: a visitor who typed the
    // burned URL must ALWAYS reach the product. A relative Location is valid
    // per RFC 7231 and needs no URL parsing, so this branch cannot itself fail.
    console.error('[watermark /free] error:', err)
    return new NextResponse(null, { status: 307, headers: { Location: TARGET } })
  }
}
