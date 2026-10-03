// KINEO-PARTNERS-PACOTE-2026-10-03 — o parceiro registra o link de 1 post PÚBLICO com o link/cupom dele. Não dá
// crédito nenhum: só deixa o pacote "aguardando revisão". A etapa 2 (+25) sai quando o admin aprova em
// /admin/partners (lib/partnerPackStore.reviewPartnerPost).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/app/api/admin/_shared/db'
import { submitPartnerPost } from '@/lib/partnerPackStore'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    const body = (await req.json().catch(() => ({}))) as { url?: unknown }
    const result = await submitPartnerPost(admin, { userId: user.id, url: body.url })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ ok: true, post_url: result.url, post_status: 'pending' })
  } catch (e) {
    console.error('[affiliate/partner-post] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Failed to save the post link.' }, { status: 500 })
  }
}
