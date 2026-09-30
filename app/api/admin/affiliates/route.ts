// Admin — affiliates dashboard.
// GET, admin-gated, service-role. KINEO-ADMIN-AFILIADOS-2026-09-30 (fundador: "reconstruir a página dos afiliados…
// pra eu conseguir enxergar os dados melhor"): além da lista de antes (clicks/signups/paid/owed, que a tela e o CSV
// continuam lendo), devolve janelas de 7/30 dias, visitantes únicos, série diária de 30 dias, receita e comissão por
// moeda, últimos cliques e indicações de cada afiliado. A conta mora em lib/admin/affiliateDashboard.ts (pura).
// Leitura PAGINADA (fetchAllRows): o select simples de antes cortava em 1000 linhas sem erro.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS, fetchAllRows, isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import {
  AFFILIATE_DESTINATIONS,
  affiliateDestinationBucket,
} from '@/lib/affiliateDestinations'
import {
  buildAffiliateDashboard,
  type DashAffiliateRow,
  type DashClickRow,
  type DashCommissionRow,
  type DashReferralRow,
} from '@/lib/admin/affiliateDashboard'

export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso. Todo GET do
// supabase-js com URL estavel ia para o Data Cache da Vercel PARA SEMPRE.
// Esta linha e o unico interruptor que zera o revalidate ANTES do primeiro
// fetch. Nao remover.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const admin = serviceClient()
    if (!admin) {
      return NextResponse.json({ error: 'Service role not configured', affiliates: [] }, { status: 500 })
    }

    const [affiliates, clicks, referrals, commissions] = await Promise.all([
      fetchAllRows<DashAffiliateRow>(admin, 'affiliates', 'id, name, email, code, status, commission_rate, coupon_code, created_at'),
      // landing_path é o campo canônico do destino (affiliateDestinationBucket(row.landing_path) na conta pura).
      fetchAllRows<DashClickRow>(admin, 'affiliate_clicks', 'affiliate_id, landing_path, referrer, ip_hash, created_at'),
      fetchAllRows<DashReferralRow>(admin, 'affiliate_referrals', 'affiliate_id, email, status, first_touch_at, converted_at'),
      fetchAllRows<DashCommissionRow>(admin, 'affiliate_commissions', 'affiliate_id, amount_gross, commission_amount, currency, status, created_at'),
    ])

    const dashboard = buildAffiliateDashboard({
      affiliates,
      clicks,
      referrals,
      commissions,
      bucketOf: (landingPath) => affiliateDestinationBucket(landingPath),
      buckets: [...AFFILIATE_DESTINATIONS.map((d) => d.key), 'legacy'],
      // A conta de afiliado do próprio fundador (testes de compra) fica fora dos totais.
      internalEmails: [...ADMIN_EMAILS],
      nowMs: Date.now(),
    })

    const destinationLabels: Record<string, string> = Object.fromEntries([
      ...AFFILIATE_DESTINATIONS.map((d) => [d.key, d.label] as const),
      ['legacy', 'Home (link simples)'] as const,
    ])

    // Campos antigos (clicks/signups/paid/owed em centavos USD) seguem na mesma forma para quem já lê a rota.
    const legacy = dashboard.affiliates.map((a) => ({ ...a, owed: a.owed.usd ?? 0, owedByCurrency: a.owed }))
    return NextResponse.json({ ...dashboard, affiliates: legacy, destinationClicks: dashboard.destinationClicks, destinationLabels })
  } catch (err) {
    console.error('[admin/affiliates] unexpected:', err)
    return NextResponse.json({ error: 'Failed to load affiliates', affiliates: [] }, { status: 500 })
  }
}
