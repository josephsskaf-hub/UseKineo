// KINEO-FLUXO-NOVO-2026-09-25 — POST /api/admin/ads: o fundador marca a revisão humana de um anúncio do Studio Ads.
//
// POR QUÊ. A página /ads promete "um editor humano revisa o seu 1º anúncio em 24 h" e o evento ads_qa_decided
// existia na lista de eventos, mas nenhum código escrevia qa_at/qa_ok nem o evento: a revisão era um UPDATE à mão
// no banco, sem rastro. Agora é um botão no /admin/ads, com o mesmo portão de todo /api/admin/* (cookie + ADMIN_EMAILS
// ANTES do service role) e com rastro: todo veredito vira ads_qa_decided (quem, quando, ok, motivo).
//
// Idempotente: o UPDATE só pega pedido 'delivered' ainda sem qa_at; clicar duas vezes devolve 409, não duas decisões.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { parseQaAction } from '@/app/admin/ads/adsAdminData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    const parsed = parseQaAction(await req.json().catch(() => ({})))
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const now = new Date()
    const reviewer = (user.email ?? '').toLowerCase()
    const { data, error } = await admin
      .from('ads_orders')
      .update({ status: 'reviewed', qa_at: now.toISOString(), qa_by: reviewer, qa_ok: parsed.approved, updated_at: now.toISOString() })
      .eq('id', parsed.orderId)
      .eq('status', 'delivered')
      .is('qa_at', null)
      .select('id, user_id, delivered_at')
    if (error) {
      console.error('[admin/ads] qa update failed:', error.code, error.message)
      return NextResponse.json({ error: 'Não consegui gravar a revisão.' }, { status: 500 })
    }
    const row = (data ?? [])[0] as { id: string; user_id: string; delivered_at: string | null } | undefined
    if (!row) return NextResponse.json({ error: 'Pedido já revisado ou ainda não entregue.' }, { status: 409 })

    const deliveredMs = row.delivered_at ? Date.parse(row.delivered_at) : NaN
    // Servidor grava com await (regra do Studio Ads, lib/ads/events.ts); o evento leva order_id.
    await writeServerEvent({
      name: 'ads_qa_decided',
      userId: row.user_id,
      path: '/api/admin/ads',
      metadata: {
        order_id: row.id,
        ok: parsed.approved,
        note: parsed.note,
        qa_by: reviewer,
        hours_since_delivery: Number.isFinite(deliveredMs) ? Math.round(((now.getTime() - deliveredMs) / 3600_000) * 10) / 10 : null,
      },
    })
    return NextResponse.json({ ok: true, order_id: row.id, qa_ok: parsed.approved })
  } catch (e) {
    console.error('[admin/ads] unexpected:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 })
  }
}
