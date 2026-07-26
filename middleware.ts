import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const LEGACY_PUBLIC_HOSTS = new Set([
  'shortsforgeai.com',
  'www.shortsforgeai.com',
  'shortsforgeai.vercel.app',
])

// Stripe treats redirects as failed webhook deliveries. Keep the old live
// endpoint executable while Stripe retries events created before the account
// endpoint was moved to www.usekineo.com. Signature verification still happens
// inside the route, so this exception does not weaken webhook authentication.
const LEGACY_HOST_DIRECT_PATHS = new Set(['/api/stripe/webhook'])

// KINEO-YTCONNECT-2026-07-26 — the Google OAuth client for this project still
// has https://shortsforgeai.vercel.app/api/youtube/callback registered as a
// redirect URI, and that host is in LEGACY_PUBLIC_HOSTS above. So a callback
// that lands there gets a cross-origin 308 carrying Google's one-time `code`
// through an extra hop; if any layer drops the query string the code is gone
// and the connect attempt dies with no error anyone can see — which is exactly
// the failure mode this whole flow just spent months in (channels = 0).
// Letting /api/youtube/* execute in place is safe: every one of those routes
// authenticates from the Supabase session cookie or from the signed OAuth
// state, so skipping the host redirect does not skip any authorization.
const LEGACY_HOST_DIRECT_PREFIXES = ['/api/youtube/']

function runsOnLegacyHost(pathname: string): boolean {
  if (LEGACY_HOST_DIRECT_PATHS.has(pathname)) return true
  return LEGACY_HOST_DIRECT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  // Keep one permanent public origin. The production Vercel hostname was
  // serving a full 200 copy of every page, while the former brand domains
  // were configured as temporary redirects. This application-level 308
  // consolidates any legacy host request that reaches Next.js and preserves
  // the original path and query string.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const rawHost = (forwardedHost ?? request.headers.get('host') ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase()
  const hostname = rawHost.split(':')[0]

  if (
    LEGACY_PUBLIC_HOSTS.has(hostname) &&
    !runsOnLegacyHost(request.nextUrl.pathname)
  ) {
    const canonicalUrl = request.nextUrl.clone()
    canonicalUrl.protocol = 'https:'
    canonicalUrl.host = 'www.usekineo.com'
    return NextResponse.redirect(canonicalUrl, 308)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
