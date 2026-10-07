// KINEO-PARTNERS-PACOTE-2026-10-03 — lista de parceiros com o status do pacote de demonstração (etapa 1/2, post
// aprovado, créditos usados, indicados, pagantes) e as ações de 1 clique do admin:
//   POST { action: 'grant_stage1', affiliate_id }  → etapa 1 (cortesia creator_trial, 25 créditos, 30 dias)
//   POST { action: 'approve_post' | 'reject_post', pack_id } → etapa 2 (+25) ou recusa do post
// Nada aqui é automático; a regra mora em lib/partnerPack.ts e as escritas em lib/partnerPackStore.ts.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows, isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { isInternalEmail } from '@/lib/internalAccounts'
import { buildPartnerRows, PARTNER_PACK_LIVE, type PartnerPackRow } from '@/lib/partnerPack'
import { grantPartnerPackStage1, reviewPartnerPost } from '@/lib/partnerPackStore'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

async function adminEmail(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user && isAdminEmail(user.email) ? (user.email ?? 'admin') : null
}

export async function GET() {
  try {
    if (!(await adminEmail())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    const [affiliates, referrals] = await Promise.all([
      fetchAllRows<{ id: string; code: string; name: string | null; email: string | null; status: string; user_id: string | null; created_at: string | null }>(admin, 'affiliates', 'id, code, name, email, status, user_id, created_at', undefined, '/api/admin/partners'),
      fetchAllRows<{ affiliate_id: string; status: string | null }>(admin, 'affiliate_referrals', 'affiliate_id, status', undefined, '/api/admin/partners'),
    ])
    // fetchAllRows engole erro (devolve vazio): a sonda diz se a tabela existe (migration 20261003121000 aplicada?).
    const probe = await admin.from('partner_packs').select('id').limit(1)
    const packsAvailable = !probe.error
    const packs: PartnerPackRow[] = packsAvailable
      ? await fetchAllRows<PartnerPackRow>(admin, 'partner_packs', 'id, affiliate_id, user_id, courtesy_grant_id, stage1_at, post_url, post_status, post_submitted_at, post_reviewed_at, stage2_at', undefined, '/api/admin/partners')
      : []
    const userIds = affiliates.map((a) => a.user_id).filter((v): v is string => Boolean(v))
    const grantIds = packs.map((p) => p.courtesy_grant_id).filter((v): v is string => Boolean(v))
    const [profiles, grants, debits] = await Promise.all([
      userIds.length ? fetchAllRows<{ id: string; plan: string | null }>(admin, 'profiles', 'id, plan', { column: 'id', values: userIds }, '/api/admin/partners') : Promise.resolve([]),
      grantIds.length ? fetchAllRows<{ id: string; starts_at: string | null; ends_at: string | null; status: string }>(admin, 'courtesy_grants', 'id, starts_at, ends_at, status', { column: 'id', values: grantIds }, '/api/admin/partners') : Promise.resolve([]),
      packs.length ? fetchAllRows<{ user_id: string | null; amount: number | null; created_at: string | null; refunded_at: string | null }>(admin, 'credit_debits', 'user_id, amount, created_at, refunded_at', { column: 'user_id', values: packs.map((p) => p.user_id) }, '/api/admin/partners') : Promise.resolve([]),
    ])
    const rows = buildPartnerRows({ affiliates, packs, grants, profiles, referrals, debits })
      .map((r) => ({ ...r, is_internal: isInternalEmail(r.email) }))
    return NextResponse.json({ live: PARTNER_PACK_LIVE, packs_available: packsAvailable, partners: rows })
  } catch (e) {
    console.error('[admin/partners] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Failed to load partners.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const reviewer = await adminEmail()
    if (!reviewer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    const body = (await req.json().catch(() => ({}))) as { action?: string; affiliate_id?: string; pack_id?: string }
    if (body.action === 'grant_stage1' && body.affiliate_id) {
      const r = await grantPartnerPackStage1(admin, { affiliateId: body.affiliate_id, grantedBy: reviewer })
      return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status })
    }
    if ((body.action === 'approve_post' || body.action === 'reject_post') && body.pack_id) {
      const r = await reviewPartnerPost(admin, { packId: body.pack_id, approve: body.action === 'approve_post', reviewer })
      return r.ok ? NextResponse.json({ ok: true, stage2: r.stage2 }) : NextResponse.json({ error: r.error }, { status: r.status })
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (e) {
    console.error('[admin/partners] action failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Falhou.' }, { status: 500 })
  }
}
