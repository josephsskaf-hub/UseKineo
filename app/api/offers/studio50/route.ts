// KINEO-STUDIO50-2026-09-22 — "esta pessoa tem a oferta Studio 50%?" Só lê; a regra mora em lib/offers/studio50.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { studio50Eligibility } from '@/lib/offers/studio50'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ eligible: false, reason: 'no_user' })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !svc) return NextResponse.json({ eligible: false, reason: 'no_user' })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
    const e = await studio50Eligibility(admin, user.id)
    return NextResponse.json(e, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    // fail closed: sem oferta é melhor do que oferta para quem já paga
    return NextResponse.json({ eligible: false, reason: 'no_user' })
  }
}
