import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { normalizeAffiliateCode } from '@/lib/affiliateCode'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const INELIGIBLE = { eligible: false } as const

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(INELIGIBLE)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(INELIGIBLE, { status: 503 })
    }

    const admin = createSupabaseAdmin(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: affiliate, error } = await admin
      .from('affiliates')
      .select('code, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json(INELIGIBLE, { status: 503 })
    const code = normalizeAffiliateCode(affiliate?.code)
    if (!code || affiliate?.status !== 'active') return NextResponse.json(INELIGIBLE)

    return NextResponse.json({
      eligible: true,
      affiliate: { status: 'active' },
      link: 'https://www.usekineo.com/a/' + code,
    })
  } catch {
    return NextResponse.json(INELIGIBLE, { status: 503 })
  }
}
