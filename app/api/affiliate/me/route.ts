// Affiliate self-serve — "my dashboard" data.
// GET, auth required. Looks up the affiliate row owned by the signed-in user
// (service-role, since RLS on the affiliate_* tables is deny-all) and returns
// their share link, lifetime stats and commission earnings. Amounts are in
// CENTS straight from the DB — the client divides by 100 for display.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { mintCouponIfMissing, type AffiliateCouponAdminDb } from '@/lib/affiliateCoupon'
import { BRL_PER_USD_HOUSE } from '@/lib/settlementCurrency'
// KINEO-AFILIADOS-40-2026-10-06 — o painel mostra a taxa que o webhook paga (programa = piso), não a gravada na linha.
import { effectiveAffiliateCommissionRate } from '@/lib/affiliateCommission'
// KINEO-PARTNERS-PACOTE-2026-10-03 — estado do pacote de demonstração no painel do parceiro.
import {
  partnerPackStage,
  PARTNER_PACK_DAYS,
  PARTNER_PACK_LIVE,
  PARTNER_PACK_STAGE1_CREDITS,
  PARTNER_PACK_STAGE2_CREDITS,
  type PartnerPackRow,
} from '@/lib/partnerPack'
// KINEO-AFILIADO-POR-POST-1610 — "Your links": desempenho por post (`&p=`) e origem, 30 dias, só contagens do próprio.
import { readAffiliateLinkStats } from '@/lib/affiliatePostStats'

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

interface CommissionRow {
  created_at: string | null
  type: string | null
  amount_gross: number | null
  commission_amount: number | null
  currency: string | null
  status: string | null
}

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
    }

    const admin = createSupabaseAdmin(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Find the affiliate owned by this user.
    const { data: affiliate } = await admin
      .from('affiliates')
      .select('id, code, status, commission_rate, coupon_code, created_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!affiliate) {
      return NextResponse.json({ isAffiliate: false })
    }

    const affiliateId = affiliate.id

    // Cunha o cupom na primeira visita ao painel (ver bloco no topo do arquivo).
    const couponCode = await mintCouponIfMissing(admin as unknown as AffiliateCouponAdminDb, {
      id: affiliate.id,
      code: affiliate.code as string,
      status: affiliate.status as string,
      coupon_code: (affiliate.coupon_code as string | null) ?? null,
    })

    // Lifetime click + referral counts.
    const [{ count: clicks }, { count: signups }, { count: paid }] = await Promise.all([
      admin
        .from('affiliate_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateId),
      admin
        .from('affiliate_referrals')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateId),
      admin
        .from('affiliate_referrals')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateId)
        .eq('status', 'paid'),
    ])

    // All commissions for this affiliate — used for earnings sums + recent list.
    const { data: commissions } = await admin
      .from('affiliate_commissions')
      .select('created_at, type, amount_gross, commission_amount, currency, status')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })

    const rows = (commissions ?? []) as CommissionRow[]

    // KINEO-MOEDA-LOCAL-2026-09-09 — desde 09/09 o indicado brasileiro paga em
    // REAIS e a comissão nasce em BRL (primeira linha real: 1497 BRL). Somar
    // centavos de BRL com centavos de USD num número só mentia por 5×. O painel
    // fala em USD: BRL converte pelo câmbio da casa (a mesma tabela que cobra).
    // 'void' (teste anulado) e 'clawed_back' ficam fora de tudo.
    const toUsdMinor = (c: CommissionRow, amt: number) => (String(c.currency ?? 'usd').toLowerCase() === 'brl' ? Math.round(amt / BRL_PER_USD_HOUSE) : amt)
    const earnings = { pending: 0, approved: 0, paid: 0, total: 0 }
    for (const c of rows) {
      if (c.status === 'void' || c.status === 'clawed_back') continue
      const amt = toUsdMinor(c, c.commission_amount ?? 0)
      if (c.status === 'pending') earnings.pending += amt
      else if (c.status === 'approved') earnings.approved += amt
      else if (c.status === 'paid') earnings.paid += amt
      earnings.total += amt
    }

    const recent = rows.slice(0, 20).map((c) => ({
      created_at: c.created_at,
      type: c.type,
      amount_gross: c.amount_gross ?? 0,
      commission_amount: c.commission_amount ?? 0,
      currency: c.currency ?? 'usd',
      status: c.status,
    }))

    // KINEO-PARTNERS-PACOTE-2026-10-03 — pacote de demonstração (etapas, post, prazo). Tabela ausente = indisponível.
    let partnerPack: Record<string, unknown> = { available: false }
    try {
      const { data: pack, error: packErr } = await admin
        .from('partner_packs')
        .select('id, affiliate_id, user_id, courtesy_grant_id, stage1_at, post_url, post_status, post_submitted_at, post_reviewed_at, stage2_at')
        .eq('affiliate_id', affiliateId)
        .maybeSingle()
      if (!packErr) {
        const row = (pack as PartnerPackRow | null) ?? null
        let endsAt: string | null = null
        if (row?.courtesy_grant_id) {
          const { data: grant } = await admin.from('courtesy_grants').select('ends_at, status').eq('id', row.courtesy_grant_id).maybeSingle()
          endsAt = grant?.status === 'active' ? ((grant.ends_at as string | null) ?? null) : null
        }
        partnerPack = {
          available: true,
          live: PARTNER_PACK_LIVE,
          stage: partnerPackStage(row),
          post_status: row?.post_status ?? 'none',
          post_url: row?.post_url ?? null,
          courtesy_ends_at: endsAt,
          stage1_credits: PARTNER_PACK_STAGE1_CREDITS,
          stage2_credits: PARTNER_PACK_STAGE2_CREDITS,
          days: PARTNER_PACK_DAYS,
        }
      }
    } catch {
      partnerPack = { available: false }
    }

    // KINEO-AFILIADO-POR-POST-1610 — escopo = o affiliate_id achado pelo user_id da SESSÃO (acima), nunca parâmetro do
    // navegador. Leitura paginada; se falhar, o painel mostra "indisponível" em vez de um zero que mente.
    let links: Record<string, unknown> = { available: false }
    try {
      links = await readAffiliateLinkStats(admin, affiliateId)
    } catch (err) {
      console.warn('[affiliate/me] links unavailable:', err instanceof Error ? err.message.slice(0, 160) : 'unknown')
      links = { available: false }
    }

    return NextResponse.json({
      partner_pack: partnerPack,
      links,
      isAffiliate: true,
      affiliate: {
        code: affiliate.code,
        status: affiliate.status,
        commission_rate: effectiveAffiliateCommissionRate(affiliate.commission_rate, affiliate.created_at),
        coupon_code: couponCode,
      },
      link: 'https://www.usekineo.com/a/' + affiliate.code,
      stats: {
        clicks: clicks ?? 0,
        signups: signups ?? 0,
        paid: paid ?? 0,
      },
      earnings,
      recent,
    })
  } catch (err) {
    console.error('[affiliate/me] unexpected:', err)
    return NextResponse.json({ error: 'Failed to load affiliate' }, { status: 500 })
  }
}
