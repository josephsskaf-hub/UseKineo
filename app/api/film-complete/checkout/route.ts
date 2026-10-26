import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'node:crypto'
import { createFilmCompleteIntent, filmCompleteAdmin, loadFilmCompleteIntent } from '@/lib/filmComplete/server'
import { FILM_COMPLETE_CAMPAIGN, FILM_COMPLETE_TARGET_SECONDS, FILM_COMPLETE_VERSION } from '@/lib/growth/filmComplete'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function noStore(response: NextResponse): NextResponse { response.headers.set('Cache-Control', 'private, no-store'); return response }

export async function GET(req: NextRequest) {
  // Browsers and mail previews must not create purchase intents speculatively.
  if ([req.headers.get('purpose'), req.headers.get('sec-purpose'), req.headers.get('x-purpose')].some(value => /prefetch|prerender/i.test(value ?? '')) || req.headers.get('next-router-prefetch') === '1') return noStore(new NextResponse(null, { status: 204 }))
  const { data: { user }, error } = await createClient().auth.getUser()
  if (error || !user) {
    const redirect = `${req.nextUrl.pathname}${req.nextUrl.search}`
    return noStore(NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(redirect)}`, req.url)))
  }
  const db = filmCompleteAdmin()
  if (!db) return noStore(NextResponse.json({ error: 'Your saved film is temporarily unavailable.' }, { status: 503 }))
  try {
    const savedId = req.nextUrl.searchParams.get('intent')
    const intent = savedId !== null
      ? await loadFilmCompleteIntent(db, user.id, savedId)
      : await createFilmCompleteIntent(db, user.id, req.nextUrl.searchParams.get('v') ?? '', req.nextUrl.searchParams.get('surface') ?? 'film_ready')
    if (!intent) return noStore(NextResponse.json({ error: 'This completed free film is unavailable in this account.' }, { status: 404 }))
    if (intent.metadata.paid_session_id) return noStore(NextResponse.redirect(new URL(`/film-complete?intent=${intent.id}`, req.url)))
    const hex = createHash('sha256').update(`film15-full-click:${intent.id}`).digest('hex').slice(0, 32)
    await db.from('events').insert({
      id: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
      name: 'film15_full_offer_clicked', user_id: user.id, path: '/api/film-complete/checkout',
      metadata: { version: FILM_COMPLETE_VERSION, intent_campaign: FILM_COMPLETE_CAMPAIGN, source_video_id: intent.sourceVideoId, video_id: intent.sourceVideoId, film_complete_id: intent.id, surface: intent.metadata.surface, target_seconds: FILM_COMPLETE_TARGET_SECONDS, source: 'server_checkout' },
    })
    const q = new URLSearchParams({ tier: 'basic', billing: 'monthly', intent_campaign: FILM_COMPLETE_CAMPAIGN, film_complete: intent.id })
    return noStore(NextResponse.redirect(new URL(`/api/stripe/checkout?${q}`, req.url)))
  } catch {
    return noStore(NextResponse.json({ error: 'We could not save this film for checkout. Please try again.' }, { status: 503 }))
  }
}
