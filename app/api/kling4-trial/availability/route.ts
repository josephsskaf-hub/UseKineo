import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { paisDoRequest } from '@/lib/freeFilmPolicy'
import { readKling4TrialAvailability } from '@/lib/kling4TrialAvailability'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

/** Read-only, public display state. Never returns balances, credentials, account data or provider details. */
export async function GET(req: NextRequest) {
  const country = paisDoRequest(req.headers)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  let admin = null
  try {
    if (url && key) admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  } catch { /* Bad/missing server configuration hides the announcement. */ }
  const state = await readKling4TrialAvailability(admin, { country })
  return NextResponse.json(state, {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store',
      Pragma: 'no-cache', Expires: '0', Vary: 'x-vercel-ip-country',
    },
  })
}
