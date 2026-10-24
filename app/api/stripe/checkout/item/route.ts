// KINEO-COMPRA-AVULSA-2410 — read-only confirmation. Returning from Stripe never grants credits or marks a purchase.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getOneTimeItem, isOneTimeItemId, oneTimeItemOrderId } from '@/lib/oneTimeItem'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? ''
  if (!/^cs_[A-Za-z0-9_]{1,240}$/.test(sessionId)) return NextResponse.json({ state: 'invalid' }, { status: 400, headers })
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ state: 'auth_required' }, { status: 401, headers })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ state: 'pending' }, { status: 503, headers })
  const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const receipt = await admin.from('one_time_item_purchases').select('sku,order_id').eq('stripe_session_id', sessionId).eq('user_id', user.id).maybeSingle()
  if (receipt.error) return NextResponse.json({ state: 'pending' }, { status: 503, headers })
  if (!receipt.data) return NextResponse.json({ state: 'pending' }, { status: 202, headers })
  if (!isOneTimeItemId(receipt.data.sku)) return NextResponse.json({ state: 'invalid' }, { status: 409, headers })
  const order = receipt.data.sku === 'one_time_ad' ? oneTimeItemOrderId(receipt.data.order_id) : null
  const next = order ? `/ads/v2?mode=simple&order=${order}&one_time=bought` : `${getOneTimeItem(receipt.data.sku).successPath}&one_time=bought`
  return NextResponse.json({ state: 'fulfilled', next }, { status: 200, headers })
}
