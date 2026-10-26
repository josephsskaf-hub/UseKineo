import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { filmCompleteAdmin, filmCompleteStatus, loadFilmCompleteIntent } from '@/lib/filmComplete/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
  try {
    const { data: { user }, error } = await createClient().auth.getUser()
    if (error || !user) return reply({ state: 'unavailable', error: 'sign_in_required' }, 401)
    const db = filmCompleteAdmin()
    if (!db) return reply({ state: 'unavailable' }, 503)
    const intent = await loadFilmCompleteIntent(db, user.id, req.nextUrl.searchParams.get('intent') ?? '')
    if (!intent) return reply({ state: 'unavailable' }, 404)
    return reply(await filmCompleteStatus(db, intent))
  } catch { return reply({ state: 'unavailable' }, 503) }
}
