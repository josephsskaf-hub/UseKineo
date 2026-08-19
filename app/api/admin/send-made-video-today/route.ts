// KINEO-MADE-VIDEO-TODAY-2026-08-19 — quem fez vídeo HOJE e não comprou.
//
// Pedido do fundador, no fim do dia: "pega essas pessoas que tão fazendo vídeo
// a tarde toda, vê as que eu já mandei, vê as que fizeram vídeo e não
// compraram".
//
// POR QUE ESTA COORTE É DIFERENTE DAS OUTRAS DUAS QUE JÁ EXISTEM:
//   · send-checkout-rescue = quem ABRIU O CHECKOUT 2+ vezes (intenção de pagar)
//   · send-india-price     = campanha de preço regional (morta na V6)
//   · esta                 = quem PRODUZIU HOJE e ainda não decidiu nada
// A pessoa aqui não hesitou no preço — ela nem chegou lá. Mandar a copy de
// resgate de checkout para quem nunca viu o checkout seria responder uma
// objeção que ela não teve.
//
// ⚠️ NINGUÉM RECEBE DOIS E-MAILS. A coorte exclui quem já tem carimbo de
// qualquer campanha (inclusive o resgate de checkout, que ainda vai sair): duas
// mensagens nossas na mesma noite é o jeito mais rápido de virar spam para a
// única lista quente que temos.
//
// DUAS CARTAS, divididas pelo ÚNICO sinal que importa aqui — a pessoa LEVOU O
// ARQUIVO EMBORA ou não:
//   · BAIXOU  → o produto entregou. O e-mail não vende, pergunta o que vem
//     depois. Quem baixou já provou que o vídeo serve para alguma coisa.
//   · NÃO BAIXOU → fez e deixou lá. Isso é um sintoma, não uma venda perdida:
//     ou o vídeo saiu ruim, ou ela não achou o botão. O e-mail PERGUNTA, e não
//     oferece plano nenhum — empurrar preço para quem talvez tenha achado o
//     resultado ruim é a forma mais cara de confirmar a impressão dela.
//
// Padrão da casa (clone de send-checkout-rescue): admin-gated, DRY RUN por
// default, ?confirm=SEND&limit=N, pacing 600ms, carimbo só no sucesso.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const SENT_EVENT = 'made_video_today_emailed_v1'
/** Carimbos de TODAS as campanhas — ninguém entra em duas. */
const OTHER_CAMPAIGNS = ['checkout_rescue_emailed_v1', 'india_price_emailed_v1', 'comeback50_emailed_v1']

const DISPOSABLE = ['mailinator', 'yopmail', 'tempmail', 'hutdot.com', 'beiwoh.com', 'playboot.com', 'skyprofy.com', 'gouziben.com', 'joystill.com', 'lanvos.com', 'minitts.net', 'dysonc.com', 'guerrillamail', 'sharklasers', 'getnada', 'maildrop', 'trashmail', '10minutemail', 'dispostable', 'fakeinbox', 'temp-mail']
function isJunk(email: string): boolean {
  const e = email.toLowerCase()
  if (e.startsWith('josephsskaf') || e.startsWith('josephskaf') || e.endsWith('@shortsforgeai.com') || e.startsWith('test')) return true
  return DISPOSABLE.some((d) => e.includes(d))
}

// ── CARTA A — levou o arquivo embora ────────────────────────────────────────
const SUBJECT_DL = 'You made something today'
function textDl(videos: number, userId: string): string {
  const n = videos === 1 ? 'a video' : `${videos} videos`
  return `Hey — Joseph here, I built Kineo.

You made ${n} today and downloaded ${videos === 1 ? 'it' : 'them'}. That is the part I actually care about: the file left the site and went somewhere.

So I want to ask you one thing, and there is nothing to buy in this email.

What are you making them for? A channel you are starting, a client, testing an idea, something else? I ask because Kineo is small enough that what you answer genuinely changes what I build next week.

And if something about the video annoyed you — the voice, the pacing, a scene that did not match the script — tell me that instead. That is worth more to me than a compliment.

Just hit reply. It comes straight to me, no helpdesk.

— Joseph
Kineo · https://usekineo.com${emailFooterText(userId)}`
}
function htmlDl(videos: number, userId: string): string {
  const n = videos === 1 ? 'a video' : `<b>${videos} videos</b>`
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p>Hey — Joseph here, I built <b>Kineo</b> 🎬</p>
  <p>You made ${n} today and downloaded ${videos === 1 ? 'it' : 'them'}. That is the part I actually care about: the file left the site and went somewhere.</p>
  <p>So I want to ask you one thing, and <b>there is nothing to buy in this email.</b></p>
  <p><b>What are you making them for?</b> A channel you are starting, a client, testing an idea, something else? I ask because Kineo is small enough that what you answer genuinely changes what I build next week.</p>
  <p>And if something about the video annoyed you — the voice, the pacing, a scene that did not match the script — tell me that instead. That is worth more to me than a compliment.</p>
  <p>Just hit reply. It comes straight to me, no helpdesk.</p>
  <p>— Joseph<br/>Kineo · <a href="https://usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`
}

// ── CARTA B — fez e deixou lá ───────────────────────────────────────────────
const SUBJECT_NODL = 'Did your video come out wrong?'
function textNoDl(userId: string): string {
  return `Hey — Joseph here, I built Kineo.

You made a video today and did not download it. That could mean two very different things, and I would rather ask than guess.

Either the result was not good enough to keep — in which case I want to know exactly what was wrong with it — or the download was not obvious enough, which would be my fault to fix.

Which one was it?

There is no offer in this email and nothing to click. Just hit reply with one line. If the video came out bad, that is the single most useful sentence anyone can send me right now.

— Joseph
Kineo · https://usekineo.com${emailFooterText(userId)}`
}
function htmlNoDl(userId: string): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p>Hey — Joseph here, I built <b>Kineo</b> 🎬</p>
  <p>You made a video today and <b>did not download it</b>. That could mean two very different things, and I would rather ask than guess.</p>
  <p>Either the result was not good enough to keep — in which case I want to know exactly what was wrong with it — or the download was not obvious enough, which would be my fault to fix.</p>
  <p><b>Which one was it?</b></p>
  <p>There is no offer in this email and nothing to click. Just hit reply with one line. If the video came out bad, that is the single most useful sentence anyone can send me right now.</p>
  <p>— Joseph<br/>Kineo · <a href="https://usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !ADMIN_EMAILS.has((user.email ?? '').toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

    // Janela: as últimas 16h cobrem "a tarde toda" sem pegar ontem.
    const since = new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString()
    const { data: vids } = await admin
      .from('videos').select('user_id, created_at').gte('created_at', since).limit(5000)

    const videosBy = new Map<string, number>()
    for (const v of vids ?? []) {
      const uid = (v as { user_id: string }).user_id
      if (uid) videosBy.set(uid, (videosBy.get(uid) ?? 0) + 1)
    }
    const ids = [...videosBy.keys()]
    if (ids.length === 0) return NextResponse.json({ mode: 'DRY_RUN', remaining_unemailed: 0 })

    const [profRes, evtRes] = await Promise.all([
      admin.from('profiles').select('id, email, email_opted_out, has_paid, plan, signup_country, last_country, signup_utm_source').in('id', ids),
      admin.from('events').select('user_id, name')
        .in('user_id', ids)
        .in('name', ['video_downloaded', SENT_EVENT, ...OTHER_CAMPAIGNS, 'checkout_started', 'checkout_attempted']),
    ])

    const downloaded = new Set<string>()
    const alreadyMailed = new Set<string>()
    const touchedCheckout = new Set<string>()
    for (const e of evtRes.data ?? []) {
      const uid = (e as { user_id: string }).user_id
      const n = (e as { name: string }).name
      if (n === 'video_downloaded') downloaded.add(uid)
      else if (n === 'checkout_started' || n === 'checkout_attempted') touchedCheckout.add(uid)
      else alreadyMailed.add(uid)
    }

    const PAID = new Set(['starter', 'basic', 'pro', 'autopilot'])
    const recipients = (profRes.data ?? [])
      .filter((p) => {
        const email = p.email as string | null
        if (!email || p.email_opted_out || p.has_paid === true) return false
        if (PAID.has(((p.plan as string) ?? '').toLowerCase())) return false
        if (isJunk(email)) return false
        if (alreadyMailed.has(p.id as string)) return false
        // Quem tocou o checkout pertence ao resgate de checkout, que é uma
        // conversa diferente e mais avançada. Não disputar a pessoa entre
        // duas campanhas.
        if (touchedCheckout.has(p.id as string)) return false
        return true
      })
      .map((p) => ({
        id: p.id as string,
        email: p.email as string,
        videos: videosBy.get(p.id as string) ?? 0,
        dl: downloaded.has(p.id as string),
        country: ((p.signup_country ?? p.last_country) as string | null) ?? '',
        source: (p.signup_utm_source as string | null) ?? '',
      }))
      .sort((a, b) => Number(b.dl) - Number(a.dl) || b.videos - a.videos)

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batchSize = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 60

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: 'fez vídeo nas últimas 16h · não pagou · sem campanha anterior · fora do resgate de checkout',
        remaining_unemailed: recipients.length,
        split: {
          baixou_o_arquivo: recipients.filter((r) => r.dl).length,
          fez_e_nao_baixou: recipients.filter((r) => !r.dl).length,
        },
        subjects: { baixou: SUBJECT_DL, nao_baixou: SUBJECT_NODL },
        sample: recipients.slice(0, 15).map((r) => `${r.email} · ${r.country} · ${r.videos}v · ${r.dl ? 'BAIXOU' : 'não baixou'} · ${r.source}`),
        from: FROM_EMAIL,
        hint: 'Append &confirm=SEND (optionally &limit=N) to send.',
      })
    }

    const batch = recipients.slice(0, batchSize)
    let sent = 0, failed = 0
    const results: Array<{ email: string; outcome: string }> = []
    for (const r of batch) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL, to: r.email, reply_to: REPLY_TO,
            subject: r.dl ? SUBJECT_DL : SUBJECT_NODL,
            text: r.dl ? textDl(r.videos, r.id) : textNoDl(r.id),
            html: r.dl ? htmlDl(r.videos, r.id) : htmlNoDl(r.id),
            headers: unsubscribeHeaders(r.id),
          }),
        })
        if (!res.ok) throw new Error(`resend ${res.status}`)
        await admin.from('events').insert({
          user_id: r.id, name: SENT_EVENT,
          metadata: { videos: r.videos, downloaded: r.dl, country: r.country, variant: r.dl ? 'downloaded' : 'no_download' },
        })
        sent++
        results.push({ email: r.email, outcome: `sent (${r.dl ? 'baixou' : 'não baixou'})` })
        await new Promise((resolve) => setTimeout(resolve, 600))
      } catch (e) {
        failed++
        results.push({ email: r.email, outcome: `failed: ${e instanceof Error ? e.message : 'error'}` })
      }
    }
    return NextResponse.json({ mode: 'SENT', sent, failed, remaining_after_batch: recipients.length - batch.length, results })
  } catch (e) {
    console.error('[send-made-video-today] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
