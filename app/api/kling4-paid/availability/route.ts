import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { readKling4PaidAvailability } from '@/lib/kling4PromoServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

/** Public offer + optional authenticated entitlement. Never accept client plan/status/cost fields. */
export async function GET() {
  let admin = null, userId: string | null = null
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && key) admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const auth = await createClient().auth.getUser()
    if (!auth.error) userId = auth.data.user?.id ?? null
  } catch { /* Anonymous/invalid configuration never grants an entitlement. */ }
  return NextResponse.json(await readKling4PaidAvailability(admin, { userId }), { headers: {
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store',
    Pragma: 'no-cache', Expires: '0', Vary: 'Cookie, Authorization',
  } })
}
