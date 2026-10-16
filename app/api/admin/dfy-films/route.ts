// KINEO-PACOTE-3-FILMES-1610 — POST { order_id, status: 'in_production' | 'delivered' } do /admin/pedidos.
// Gate idêntico a todo /api/admin/* (sessão + isAdminEmail ANTES do service role). A troca de status é um UPDATE
// guardado pelo status de origem (dfyFilms3NextStatusAllowed): dois cliques não entregam duas vezes. Só a transição
// que DE FATO aconteceu para 'delivered' manda o e-mail ao cliente — "seus 3 filmes estão no Library", SEM link
// nenhum (o caminho vai em palavras: lib/dfyFilms3.ts deliveryEmail).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { FOUNDER_REPLY_TO } from '@/lib/filmFeedback'
import { DFY_FILMS3_EVENTS, deliveryEmail, dfyFilms3NextStatusAllowed } from '@/lib/dfyFilms3'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const FROM_EMAIL = 'Joseph at Kineo <hello@usekineo.com>'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email?.toLowerCase() ?? '')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })

    const body = (await req.json().catch(() => ({}))) as { order_id?: string; status?: string }
    const orderId = (body.order_id ?? '').trim()
    const to = (body.status ?? '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: 'order_id inválido' }, { status: 400 })
    if (to !== 'in_production' && to !== 'delivered') return NextResponse.json({ error: 'status inválido' }, { status: 400 })

    const { data: order, error: readErr } = await admin.from('done_for_you_orders').select('id, user_id, email, topic, status').eq('id', orderId).maybeSingle()
    if (readErr) return NextResponse.json({ error: `tabela indisponível (${readErr.code ?? 'erro'})` }, { status: 503 })
    if (!order) return NextResponse.json({ error: 'pedido não encontrado' }, { status: 404 })
    const from = String(order.status)
    if (from === to) return NextResponse.json({ ok: true, already: true })
    if (!dfyFilms3NextStatusAllowed(from, to)) return NextResponse.json({ error: `não dá para ir de ${from} para ${to}` }, { status: 409 })

    const nowIso = new Date().toISOString()
    const patch = to === 'delivered'
      ? { status: 'delivered', delivered_at: nowIso, delivered_by: user.email ?? null }
      : { status: 'in_production', in_production_at: nowIso }
    const { data: moved, error: updErr } = await admin.from('done_for_you_orders').update(patch).eq('id', orderId).eq('status', from).select('id')
    if (updErr) return NextResponse.json({ error: `falha ao gravar (${updErr.code ?? 'erro'})` }, { status: 500 })
    if (!moved || moved.length === 0) return NextResponse.json({ ok: true, already: true })

    await admin.from('events').insert({
      name: DFY_FILMS3_EVENTS.statusChanged,
      user_id: order.user_id ?? null,
      path: '/api/admin/dfy-films',
      metadata: { order_id: orderId, from, to, by: user.email ?? null },
    })

    if (to !== 'delivered') return NextResponse.json({ ok: true, status: to })

    // ── o e-mail de entrega: sem link, o caminho em palavras ──
    let recipient = typeof order.email === 'string' && order.email.includes('@') ? order.email : null
    if (!recipient && order.user_id) {
      const { data: prof } = await admin.from('profiles').select('email').eq('id', order.user_id).maybeSingle()
      recipient = typeof prof?.email === 'string' && prof.email.includes('@') ? prof.email : null
    }
    let emailOutcome: 'sent' | 'failed' | 'skipped' = 'skipped'
    const key = process.env.RESEND_API_KEY
    if (recipient && key) {
      const mail = deliveryEmail(String(order.topic ?? ''))
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM_EMAIL, to: [recipient], reply_to: FOUNDER_REPLY_TO, subject: mail.subject, text: mail.text, html: mail.html }),
        })
        emailOutcome = res.ok ? 'sent' : 'failed'
        if (!res.ok) console.error('[admin/dfy-films] resend rejected:', res.status)
      } catch (e) {
        emailOutcome = 'failed'
        console.error('[admin/dfy-films] resend threw:', e instanceof Error ? e.message : String(e))
      }
    }
    await admin.from('done_for_you_orders').update({ delivery_email: emailOutcome }).eq('id', orderId)
    await admin.from('events').insert({
      name: DFY_FILMS3_EVENTS.delivered,
      user_id: order.user_id ?? null,
      path: '/api/admin/dfy-films',
      metadata: { order_id: orderId, email: emailOutcome, by: user.email ?? null },
    })
    return NextResponse.json({ ok: true, status: 'delivered', email: emailOutcome })
  } catch (e) {
    console.error('[admin/dfy-films] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
