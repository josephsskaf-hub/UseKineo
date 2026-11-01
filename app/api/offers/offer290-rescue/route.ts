// KINEO-AVULSO-290-2CHECKOUT-0111 — "esta pessoa ganha a saída de US$ 2,90?" Só lê; a regra mora em lib/offers/offer290Rescue
// (a MESMA que o /api/stripe/checkout aplica antes de abrir a sessão do starter290).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { offer290RescueEligibility } from '@/lib/offers/offer290Rescue'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ eligible: false, reason: 'no_user', checkoutStarts: 0 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !svc) return NextResponse.json({ eligible: false, reason: 'no_user', checkoutStarts: 0 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
    const e = await offer290RescueEligibility(admin, user.id)
    return NextResponse.json(e, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    // fail closed: sem oferta é melhor do que oferta para quem já paga
    return NextResponse.json({ eligible: false, reason: 'no_user', checkoutStarts: 0 })
  }
}
