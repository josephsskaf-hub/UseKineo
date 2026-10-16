// KINEO-PACOTE-3-FILMES-1610 — POST { topic, language, style? } → salva o briefing do pacote "3 filmes" ANTES do pagamento
// e devolve o endereço do checkout. O tema nunca viaja na URL: o checkout recebe só o id do pedido (dono conferido lá).
//
// Regras: só conta logada; só quem NÃO assina (dfyFilms3Eligible); um pedido "aguardando pagamento" das últimas 24 h é
// REAPROVEITADO (o briefing novo sobrescreve) — clicar Pay duas vezes não cria dois pedidos. Nada é cobrado aqui.
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { DFY_FILMS3_EVENTS, DFY_FILMS3_PACK_ID, DFY_FILMS3_PRICE_USD_MINOR, DFY_FILMS3_VERSION, dfyFilms3Eligible, parseDfyFilms3Brief } from '@/lib/dfyFilms3'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const PENDING_REUSE_MS = 24 * 3600_000

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please sign in first.', signin: '/signup?redirect=%2Fdone-for-you' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { topic?: unknown; language?: unknown; style?: unknown }
    const parsed = parseDfyFilms3Brief(body)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'This offer is temporarily unavailable.' }, { status: 503 })
    const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

    const { data: profile } = await admin.from('profiles').select('plan, email').eq('id', user.id).maybeSingle()
    if (!dfyFilms3Eligible(profile)) {
      return NextResponse.json({ error: 'You already have a plan: your credits make these films in the Studio.' }, { status: 409 })
    }
    const email = (typeof profile?.email === 'string' && profile.email) || user.email || null
    const { topic, language, style } = parsed.brief

    const since = new Date(Date.now() - PENDING_REUSE_MS).toISOString()
    const { data: pending, error: pendingErr } = await admin
      .from('done_for_you_orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending_payment')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
    if (pendingErr) {
      console.error('[dfy-films/order] table read failed:', pendingErr.code, pendingErr.message)
      return NextResponse.json({ error: 'This offer is temporarily unavailable.' }, { status: 503 })
    }

    let orderId: string | null = pending?.[0]?.id ?? null
    if (orderId) {
      const { error } = await admin.from('done_for_you_orders').update({ topic, language, style, email }).eq('id', orderId).eq('status', 'pending_payment')
      if (error) {
        console.error('[dfy-films/order] update failed:', error.code, error.message)
        return NextResponse.json({ error: 'This offer is temporarily unavailable.' }, { status: 503 })
      }
    } else {
      const { data: created, error } = await admin
        .from('done_for_you_orders')
        .insert({ user_id: user.id, email, topic, language, style, status: 'pending_payment', price_usd_minor: DFY_FILMS3_PRICE_USD_MINOR })
        .select('id')
        .single()
      if (error || !created) {
        console.error('[dfy-films/order] insert failed:', error?.code, error?.message)
        return NextResponse.json({ error: 'This offer is temporarily unavailable.' }, { status: 503 })
      }
      orderId = created.id as string
    }

    try {
      await admin.from('events').insert({
        name: DFY_FILMS3_EVENTS.briefSaved,
        user_id: user.id,
        path: '/api/dfy-films/order',
        metadata: { order_id: orderId, language, has_style: Boolean(style), topic_chars: topic.length, version: DFY_FILMS3_VERSION },
      })
    } catch { /* telemetria; o pedido já está salvo */ }

    return NextResponse.json({ ok: true, order_id: orderId, checkout: `/api/stripe/checkout?pack=${DFY_FILMS3_PACK_ID}&order=${orderId}` })
  } catch (e) {
    console.error('[dfy-films/order] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
