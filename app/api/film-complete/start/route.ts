import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { filmCompleteAdmin, loadFilmCompleteIntent, startFilmComplete } from '@/lib/filmComplete/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
  try {
    const origin = req.headers.get('origin')
    if (origin && origin !== req.nextUrl.origin) return reply({ state: 'unavailable' }, 403)
    const { data: { user }, error } = await createClient().auth.getUser()
    if (error || !user) return reply({ state: 'unavailable', error: 'sign_in_required' }, 401)
    const body = await req.json().catch(() => null)
    if (!body || typeof body.intentId !== 'string') return reply({ state: 'unavailable' }, 400)
    const db = filmCompleteAdmin()
    if (!db) return reply({ state: 'unavailable' }, 503)
    const intent = await loadFilmCompleteIntent(db, user.id, body.intentId)
    if (!intent) return reply({ state: 'unavailable' }, 404)
    const result = await startFilmComplete(db, intent, req.nextUrl.origin)
    return reply(result, result.state === 'awaiting_payment' ? 402 : ['starting', 'waiting_entitlement', 'processing'].includes(String(result.state)) ? 202 : 200)
  } catch { return reply({ state: 'unavailable' }, 503) }
}
