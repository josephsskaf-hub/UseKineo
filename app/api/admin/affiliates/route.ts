// Admin — affiliates list.
// GET, admin-gated, service-role. Returns every affiliate with their lifetime
// click/signup/paid counts and `owed` (sum of commission_amount that's still
// pending or approved, in CENTS). Sorted newest-first by created_at.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import {
  AFFILIATE_DESTINATIONS,
  affiliateDestinationBucket,
  type AffiliateDestinationBucket,
} from '@/lib/affiliateDestinations'

export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

interface AffiliateRow {
  id: string
  user_id: string | null
  name: string | null
  email: string | null
  code: string
  status: string | null
  commission_rate: number | null
  coupon_code: string | null
  created_at: string | null
}

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const email = user?.email?.toLowerCase() ?? ''
    if (!user || !ADMIN_EMAILS.has(email)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Service role not configured', affiliates: [] }, { status: 500 })
    }

    const admin = createSupabaseAdmin(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: affiliates } = await admin
      .from('affiliates')
      .select('id, user_id, name, email, code, status, commission_rate, coupon_code, created_at')
      .order('created_at', { ascending: false })

    const list = (affiliates ?? []) as AffiliateRow[]

    // Aggregate clicks, referrals and owed commissions in three table scans,
    // then collapse per affiliate_id client-side (cheaper than N round-trips).
    const clicksByAff = new Map<string, number>()
    const signupsByAff = new Map<string, number>()
    const paidByAff = new Map<string, number>()
    const owedByAff = new Map<string, number>()
    const destinationClicks = Object.fromEntries([
      ...AFFILIATE_DESTINATIONS.map((destination) => [destination.key, 0] as const),
      ['legacy', 0] as const,
    ]) as Record<AffiliateDestinationBucket, number>

    const [{ data: clicks }, { data: referrals }, { data: commissions }] = await Promise.all([
      admin.from('affiliate_clicks').select('affiliate_id, landing_path'),
      admin.from('affiliate_referrals').select('affiliate_id, status'),
      admin.from('affiliate_commissions').select('affiliate_id, commission_amount, status'),
    ])

    for (const row of (clicks ?? []) as Array<{ affiliate_id: string | null; landing_path: string | null }>) {
      if (!row.affiliate_id) continue
      clicksByAff.set(row.affiliate_id, (clicksByAff.get(row.affiliate_id) ?? 0) + 1)
      const bucket = affiliateDestinationBucket(row.landing_path)
      destinationClicks[bucket] += 1
    }
    for (const row of (referrals ?? []) as Array<{ affiliate_id: string | null; status: string | null }>) {
      if (!row.affiliate_id) continue
      signupsByAff.set(row.affiliate_id, (signupsByAff.get(row.affiliate_id) ?? 0) + 1)
      if (row.status === 'paid') {
        paidByAff.set(row.affiliate_id, (paidByAff.get(row.affiliate_id) ?? 0) + 1)
      }
    }
    for (const row of (commissions ?? []) as Array<{
      affiliate_id: string | null
      commission_amount: number | null
      status: string | null
    }>) {
      if (!row.affiliate_id) continue
      if (row.status === 'pending' || row.status === 'approved') {
        owedByAff.set(row.affiliate_id, (owedByAff.get(row.affiliate_id) ?? 0) + (row.commission_amount ?? 0))
      }
    }

    const result = list.map((aff) => ({
      id: aff.id,
      name: aff.name,
      email: aff.email,
      code: aff.code,
      status: aff.status,
      commission_rate: aff.commission_rate,
      coupon_code: aff.coupon_code,
      clicks: clicksByAff.get(aff.id) ?? 0,
      signups: signupsByAff.get(aff.id) ?? 0,
      paid: paidByAff.get(aff.id) ?? 0,
      owed: owedByAff.get(aff.id) ?? 0,
    }))

    return NextResponse.json({ affiliates: result, destinationClicks })
  } catch (err) {
    console.error('[admin/affiliates] unexpected:', err)
    return NextResponse.json({ error: 'Failed to load affiliates', affiliates: [] }, { status: 500 })
  }
}
