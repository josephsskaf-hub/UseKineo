import { NextRequest, NextResponse } from 'next/server'
import { resolveAffiliateDisplayOffer } from '@/lib/affiliateLinkOffer'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

/** Cookie-scoped public display data only. Never caches one partner's name for another visitor. */
export async function GET(req: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  const offer = await resolveAffiliateDisplayOffer(user?.id ?? null, req.cookies.get('sf_aff')?.value, req.cookies.get('sf_aff_click')?.value)
  return NextResponse.json({ offer: offer ? { code: offer.code, partnerName: offer.partnerName } : null }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  })
}
