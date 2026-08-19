// KINEO-INDIA-399-2026-08-19 — o experimento do muro de preço (fundador:
// "vamos entender se realmente esse era um muro").
//
// CONTEXTO MEDIDO (14 dias): Índia = maior país do funil (70 signups — mais
// que os EUA), 17 chegaram ao checkout, ZERO pagaram. E TODOS os 280
// cadastros indianos históricos viram "$9.90/₹799" na vitrine, porque o
// preço regional (₹399, vivo no checkout desde 04/08) ficou invisível na
// home até o push 192 de hoje.
//
// O EXPERIMENTO: e-mail para os 130 indianos que JÁ GERARAM ≥1 vídeo (os
// engajados; os 150 que nunca geraram são frios — mandar pra eles suja
// entregabilidade e resultado) anunciando a notícia: "Kineo is now
// ₹399/month in India". Não é cupom — é o preço real que eles nunca viram.
// P.S. com FIRST50 pro Creator (₹799 no 1º mês). utm separado por link para
// medir o muro: se a Índia sair de 0% de conversão, era preço; se continuar
// 0%, o muro é outro (confiança/cartão internacional/UPI — próxima hipótese).
//
// PADRÃO DA CASA (clone do send-comeback50): admin-gated, DRY RUN por
// default, ?confirm=SEND&limit=N para disparar, pacing, carimbo por usuário
// (evento india_price_emailed_v1) marcado SÓ no sucesso, nunca 2×.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const SENT_EVENT = 'india_price_emailed_v1'
const CTA_URL = 'https://usekineo.com/pricing?utm_source=india399'
const CREATOR_URL = 'https://usekineo.com/pricing?promo=FIRST50&utm_source=india399creator'
const SUBJECT = 'Kineo is now ₹399/month in India'

const DISPOSABLE = ['mailinator', 'yopmail', 'tempmail', 'hutdot.com', 'beiwoh.com', 'playboot.com', 'lanvos.com', 'minitts.net', 'dysonc.com', 'guerrillamail', 'sharklasers', 'getnada', 'maildrop', 'trashmail', '10minutemail', 'dispostable', 'fakeinbox', 'temp-mail']

function isJunk(email: string): boolean {
  const e = email.toLowerCase()
  if (e.startsWith('josephsskaf') || e.startsWith('josephskaf') || e.endsWith('@shortsforgeai.com') || e.startsWith('test')) return true
  return DISPOSABLE.some((d) => e.includes(d))
}

function emailText(videos: number, userId: string): string {
  return `Hey — Joseph here, founder of Kineo.

Quick news that matters if you're creating from India: Kineo now has Indian pricing. The Starter plan is ₹399/month — 60 credits, watermark-free exports, every engine included.

You've already made ${videos === 1 ? 'a video' : `${videos} videos`} with us, so you know what the tool does. What you saw on the pricing page back then was the international price — that's fixed now.

See your price: ${CTA_URL}

P.S. If you're posting regularly, the Creator plan (140 credits ≈ 7 cinematic films/month) is half price for your first month with code FIRST50 — applied automatically here: ${CREATOR_URL}

Reply to this and you get me, not a helpdesk.

— Joseph, founder
Kineo · https://usekineo.com${emailFooterText(userId)}`
}

function emailHtml(videos: number, userId: string): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p>Hey — Joseph here, founder of <b>Kineo</b> 🎬</p>
  <p>Quick news that matters if you're creating from India: <b>Kineo now has Indian pricing.</b> The Starter plan is <b>₹399/month</b> — 60 credits, watermark-free exports, every engine included.</p>
  <p>You've already made ${videos === 1 ? 'a video' : `<b>${videos} videos</b>`} with us, so you know what the tool does. What you saw on the pricing page back then was the international price — that's fixed now.</p>
  <p style="margin:26px 0">
    <a href="${CTA_URL}" style="background:#2997ff;color:#ffffff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">See my price — ₹399/mo &rarr;</a>
  </p>
  <p style="color:#475569;font-size:14px"><b>P.S.</b> Posting regularly? The <b>Creator</b> plan (140 credits ≈ 7 cinematic films/month) is <b>half price for your first month</b> with code FIRST50 — <a href="${CREATOR_URL}" style="color:#2997ff">applied automatically here</a>.</p>
  <p style="color:#475569;font-size:14px">Reply to this and you get me, not a helpdesk.</p>
  <p>— Joseph, founder<br/>Kineo · <a href="https://usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = (user?.email ?? '').toLowerCase()
    if (!user || !ADMIN_EMAILS.has(email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

    // Coorte: Índia, não pagou, opt-in, e-mail real, ≥1 vídeo gerado.
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, email, email_opted_out, has_paid, signup_country')
      .eq('signup_country', 'IN')
      .limit(2000)
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 })

    const base = (profiles ?? []).filter(
      (p) => p.email && !p.email_opted_out && p.has_paid !== true && !isJunk(p.email as string),
    )
    const ids = base.map((p) => p.id as string)

    // vídeos por usuário (conta engajamento) — em lotes de 200 ids
    const videoCounts = new Map<string, number>()
    for (let i = 0; i < ids.length; i += 200) {
      const slice = ids.slice(i, i + 200)
      const { data: vids } = await admin.from('videos').select('user_id').in('user_id', slice).limit(10000)
      for (const v of vids ?? []) {
        const uid = v.user_id as string
        videoCounts.set(uid, (videoCounts.get(uid) ?? 0) + 1)
      }
    }

    // já enviados
    const { data: sentRows } = await admin
      .from('events')
      .select('user_id')
      .eq('name', SENT_EVENT)
      .in('user_id', ids.slice(0, 1000))
    const alreadySent = new Set((sentRows ?? []).map((r) => r.user_id as string))

    const recipients = base
      .map((p) => ({ id: p.id as string, email: p.email as string, videos: videoCounts.get(p.id as string) ?? 0 }))
      .filter((r) => r.videos >= 1 && !alreadySent.has(r.id))
      .sort((a, b) => b.videos - a.videos)

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batchSize = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: 'signup_country=IN, unpaid, opted-in, real email, >=1 video generated',
        remaining_unemailed: recipients.length,
        next_batch_size: Math.min(batchSize, recipients.length),
        sample: recipients.slice(0, 10).map((r) => `${r.email} (${r.videos}v)`),
        subject: SUBJECT,
        from: FROM_EMAIL,
        hint: 'Append &confirm=SEND (optionally &limit=N) to send.',
      })
    }

    const batch = recipients.slice(0, batchSize)
    let sent = 0
    let failed = 0
    const results: Array<{ email: string; outcome: string }> = []
    for (const r of batch) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: r.email,
            reply_to: REPLY_TO,
            subject: SUBJECT,
            text: emailText(r.videos, r.id),
            html: emailHtml(r.videos, r.id),
            headers: unsubscribeHeaders(r.id),
          }),
        })
        if (!res.ok) throw new Error(`resend ${res.status}`)
        await admin.from('events').insert({ user_id: r.id, name: SENT_EVENT, metadata: { videos: r.videos } })
        sent++
        results.push({ email: r.email, outcome: 'sent' })
        await new Promise((resolve) => setTimeout(resolve, 600))
      } catch (e) {
        failed++
        results.push({ email: r.email, outcome: `failed: ${e instanceof Error ? e.message : 'error'}` })
      }
    }
    return NextResponse.json({ mode: 'SENT', sent, failed, batch_size: batch.length, remaining_after_batch: recipients.length - batch.length, results })
  } catch (e) {
    console.error('[send-india-price] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
