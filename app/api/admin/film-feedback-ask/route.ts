// KINEO-FEEDBACK-DO-FILME-2026-09-16 — o botão "pedir feedback" do quadro /admin/coerencia.
// Fundador (16/09 noite): "quero um botão nesse lugar para, quando eu clicar, a gente mandar um e-mail
// para aquela pessoa daquele vídeo perguntando se ela teve um feedback positivo ou negativo".
// POST { video_id } → e-mail curto, assinado pelo fundador, com o filme e os dois botões 👍/👎 (os mesmos
// links assinados do e-mail de entrega) → evento film_feedback_asked (session_id = video_id). Um por filme
// a cada 7 dias (o segundo clique devolve `already`). Gate idêntico a todo /api/admin/*. Nunca dá crédito.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { feedbackHref, FILM_FEEDBACK_ASKED_EVENT, FILM_FEEDBACK_CREDITS, FOUNDER_REPLY_TO } from '@/lib/filmFeedback'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com').replace(/\/$/, '')
const FROM_EMAIL = 'Joseph at Kineo <hello@usekineo.com>'
const ASK_WINDOW_DAYS = 7

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function tituloDe(topic: string | null): string {
  const t = (topic ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return 'your film'
  const primeira = t.split(/(?<=[.!?…])\s+/)[0] ?? t
  const curto = primeira.length > 70 ? `${primeira.slice(0, 67).trimEnd()}…` : primeira
  return curto
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email?.toLowerCase() ?? '')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })

    const body = (await req.json().catch(() => ({}))) as { video_id?: string }
    const videoId = (body.video_id ?? '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(videoId)) return NextResponse.json({ error: 'video_id inválido' }, { status: 400 })

    const { data: video } = await admin.from('videos').select('id, user_id, topic, video_url, quality_mode').eq('id', videoId).maybeSingle()
    if (!video) return NextResponse.json({ error: 'vídeo não encontrado' }, { status: 404 })
    const { data: prof } = await admin.from('profiles').select('email').eq('id', video.user_id as string).maybeSingle()
    const to = typeof prof?.email === 'string' ? prof.email : null
    if (!to) return NextResponse.json({ error: 'pessoa sem e-mail' }, { status: 409 })

    // Um pedido por filme por semana: a pergunta repetida vira insistência.
    const desde = new Date(Date.now() - ASK_WINDOW_DAYS * 86400_000).toISOString()
    const { data: ja } = await admin.from('events').select('created_at').eq('name', FILM_FEEDBACK_ASKED_EVENT).eq('session_id', videoId).gte('created_at', desde).limit(1)
    if (ja && ja.length > 0) return NextResponse.json({ ok: true, already: true, asked_at: ja[0].created_at })

    const up = feedbackHref(videoId, 'up', APP_URL, 'founder_ask')
    const down = feedbackHref(videoId, 'down', APP_URL, 'founder_ask')
    if (!up || !down) return NextResponse.json({ error: 'sem segredo de assinatura no ambiente (VIDEO_SHARE_SECRET/CRON_SECRET)' }, { status: 503 })
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY ausente' }, { status: 503 })

    const titulo = tituloDe(typeof video.topic === 'string' ? video.topic : null)
    const url = typeof video.video_url === 'string' ? video.video_url : `${APP_URL}/history`
    const userId = video.user_id as string
    const subject = `Did your film "${titulo.length > 40 ? `${titulo.slice(0, 37).trimEnd()}…` : titulo}" turn out right?`
    const text = `Hey,

I'm Joseph, the founder of Kineo. You made a film with us about "${titulo}".

One honest question: did the film match what you asked for?

  👍 Yes: ${up}
  👎 Not really: ${down}

If it didn't, tell me what was off (the story, the footage, the voice) — one line is enough — and I add ${FILM_FEEDBACK_CREDITS} credits so you can redo it.

Watch it again: ${url}

Thank you,
Joseph
usekineo.com${emailFooterText(userId)}`
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">I'm Joseph, the founder of Kineo. You made a film with us about <strong>“${esc(titulo)}”</strong>.</p>
  <p style="margin:0 0 14px;">One honest question: <strong>did the film match what you asked for?</strong></p>
  <p style="margin:0 0 18px;"><a href="${up}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:700;">👍 Yes</a>&nbsp;&nbsp;<a href="${down}" style="display:inline-block;background:#f1f5f9;color:#111;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:700;">👎 Not really</a></p>
  <p style="margin:0 0 14px;color:#475569;font-size:14px;">If it didn't, tell me what was off (the story, the footage, the voice) — one line is enough — and I add <strong>${FILM_FEEDBACK_CREDITS} credits</strong> so you can redo it.</p>
  <p style="margin:0 0 18px;"><a href="${url}" style="color:#2997ff;">Watch it again</a></p>
  <p style="margin:0 0 2px;">Thank you,</p>
  <p style="margin:0 0 2px;">Joseph</p>
  <p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], reply_to: FOUNDER_REPLY_TO, subject, text, html, headers: unsubscribeHeaders(userId) }),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return NextResponse.json({ error: `resend ${res.status}: ${err.slice(0, 160)}` }, { status: 502 })
    }
    await admin.from('events').insert({
      name: FILM_FEEDBACK_ASKED_EVENT,
      user_id: userId,
      session_id: videoId,
      path: '/api/admin/film-feedback-ask',
      metadata: { asked: true, video_id: videoId, to, by: user.email, engine: video.quality_mode ?? null, subject },
    })
    return NextResponse.json({ ok: true, already: false, to })
  } catch (e) {
    console.error('[admin/film-feedback-ask] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
