// KINEO-CHECKOUT-RESCUE-2026-08-19 — a lista mais quente que a empresa tem.
//
// O QUE OS NÚMEROS DISSERAM (funil de 7 dias, medido em 19/08):
//   247 cadastros → 135 fizeram vídeo → 44 chegaram ao checkout → 0 assinaram.
// E o dado que muda tudo: os 44 tentaram DUAS VEZES OU MAIS. Nenhum deles é
// curioso de passagem. Quem volta ao checkout duas vezes quer comprar.
//
// Duas coisas separam esta coorte de qualquer outra lista que já mandamos:
//
//   1) QUASE TODOS AINDA TÊM CRÉDITO (36, 39, 45, 50, 80...). Eles não foram
//      ao checkout por falta de saldo — foram DECIDIR. É intenção pura,
//      não necessidade. O e-mail não deve, portanto, falar de saldo.
//   2) O QUE ELES VIRAM ESTÁ REGISTRADO. As sessões expiradas guardam tier,
//      moeda e amount_total. Sabemos que 16 indianos olharam para ₹1.299 e
//      saíram antes de digitar o cartão (customer_country null). Isso permite
//      escrever um e-mail que responde à objeção REAL de cada um em vez de
//      mandar o mesmo "volta pra gente" para todo mundo.
//
// DUAS CARTAS, DIVIDIDAS POR REGIÃO — não por país:
//   · região `value` (IN, BR, NG, KE, PK, BD, NP, PH e cia): a carta anuncia
//     o degrau que eles nunca viram. Não é cupom, é o preço real que estava
//     escondido atrás de um link. Desde o push 204 o Starter é o botão
//     principal para eles — este e-mail é o aviso de que a porta mudou.
//   · região `standard` (US, CA, GB, AU, DE, FR, CH...): lá o preço não é a
//     objeção — o Starter já é $9.90. A carta oferece FIRST50 (metade do 1º
//     mês no Creator) e, principalmente, PERGUNTA o que travou. Metade do
//     valor desta lista é a resposta, não a venda.
//
// PADRÃO DA CASA (clone de send-india-price): admin-gated, DRY RUN por
// default, ?confirm=SEND&limit=N para disparar, pacing de 600ms, carimbo por
// usuário marcado SÓ no sucesso — ninguém recebe duas vezes.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { VALUE_REGION_COUNTRIES } from '@/lib/checkoutPricing'

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
const SENT_EVENT = 'checkout_rescue_emailed_v1'

// A região vem da MESMA lista que o checkout usa para resolver preço. Escrevi
// um espelho aqui primeiro e apaguei: um segundo lugar com a lista de países é
// exatamente o defeito que fez o schema de preço congelar na V3 (consertado
// hoje de manhã). Se a carta diz "no seu país existe um degrau mais barato",
// ela tem que consultar a fonte que decide se esse degrau existe.
const VALUE_COUNTRIES = VALUE_REGION_COUNTRIES

const DISPOSABLE = ['mailinator', 'yopmail', 'tempmail', 'hutdot.com', 'beiwoh.com', 'playboot.com', 'skyprofy.com', 'gouziben.com', 'lanvos.com', 'minitts.net', 'dysonc.com', 'guerrillamail', 'sharklasers', 'getnada', 'maildrop', 'trashmail', '10minutemail', 'dispostable', 'fakeinbox', 'temp-mail']

function isJunk(email: string): boolean {
  const e = email.toLowerCase()
  if (e.startsWith('josephsskaf') || e.startsWith('josephskaf') || e.endsWith('@shortsforgeai.com') || e.startsWith('test')) return true
  return DISPOSABLE.some((d) => e.includes(d))
}

// ── CARTA A — região `value` ────────────────────────────────────────────────
// Assunto sem promoção e sem urgência falsa: é literalmente o que aconteceu.
const SUBJECT_VALUE = 'You were looking at the wrong price'
const URL_VALUE = 'https://usekineo.com/pricing?utm_source=rescue_value'

function textValue(videos: number, userId: string): string {
  const made = videos > 0
    ? `You've already made ${videos === 1 ? 'a video' : `${videos} videos`} with Kineo, so you know it works.`
    : `You signed up and got as far as the payment page, so something about this caught your interest.`
  return `Hey — Joseph here, founder of Kineo.

You opened our checkout more than once in the last few days and didn't finish. I'm not going to guess why, but I did go and look at what you were actually shown — and I owe you a correction.

You were shown the Creator plan. In your country there's a cheaper first step that we were hiding behind a small link instead of putting it in front of you: Starter, with 60 credits a month, watermark-free exports and every engine unlocked. Same product, lower step.

${made}

I fixed the page today, so you'll now see the right plan first: ${URL_VALUE}

If the price still isn't the problem, tell me what is. Reply to this email and it comes straight to me — no helpdesk, no form. Honestly, a straight answer from you is worth more to me than the subscription.

— Joseph, founder
Kineo · https://usekineo.com${emailFooterText(userId)}`
}

function htmlValue(videos: number, userId: string): string {
  const made = videos > 0
    ? `You've already made ${videos === 1 ? 'a video' : `<b>${videos} videos</b>`} with Kineo, so you know it works.`
    : `You signed up and got as far as the payment page, so something about this caught your interest.`
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p>Hey — Joseph here, founder of <b>Kineo</b> 🎬</p>
  <p>You opened our checkout more than once in the last few days and didn't finish. I'm not going to guess why, but I did go and look at what you were actually shown — and I owe you a correction.</p>
  <p>You were shown the <b>Creator</b> plan. In your country there's a cheaper first step that we were hiding behind a small link instead of putting it in front of you: <b>Starter — 60 credits a month</b>, watermark-free exports, every engine unlocked. Same product, lower step.</p>
  <p>${made}</p>
  <p style="margin:26px 0">
    <a href="${URL_VALUE}" style="background:#2997ff;color:#ffffff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">See my real price &rarr;</a>
  </p>
  <p style="color:#475569;font-size:14px">If the price still isn't the problem, tell me what is. Reply to this email and it comes straight to me — no helpdesk, no form. Honestly, a straight answer from you is worth more to me than the subscription.</p>
  <p>— Joseph, founder<br/>Kineo · <a href="https://usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`
}

// ── CARTA B — região `standard` ─────────────────────────────────────────────
// Aqui o preço não é a objeção (Starter já é $9.90). A carta pergunta, e o
// cupom vem como P.S. — não como manchete. Quem tentou duas vezes não precisa
// ser convencido, precisa ser destravado.
const SUBJECT_STD = 'You tried to buy twice — what stopped you?'
const URL_STD = 'https://usekineo.com/pricing?promo=FIRST50&utm_source=rescue_std'

function textStd(videos: number, userId: string): string {
  const made = videos > 0
    ? `You've made ${videos === 1 ? 'a video' : `${videos} videos`} already, so this isn't a case of not knowing what the tool does.`
    : `You didn't get as far as making a video, which makes me even more curious what you were hoping for.`
  return `Hey — Joseph here, founder of Kineo.

You opened our checkout more than once in the last few days and didn't finish. That's the part I keep thinking about: people who aren't interested don't come back twice.

${made}

So I'd rather ask than assume. What stopped you? Price, a missing feature, the payment page itself, or you just got pulled away? Reply to this email — it comes straight to me, and one honest sentence from you is worth more to me than the subscription.

P.S. If it was the price and you want to try Creator properly: FIRST50 takes half off your first month, applied automatically here — ${URL_STD}

— Joseph, founder
Kineo · https://usekineo.com${emailFooterText(userId)}`
}

function htmlStd(videos: number, userId: string): string {
  const made = videos > 0
    ? `You've made ${videos === 1 ? 'a video' : `<b>${videos} videos</b>`} already, so this isn't a case of not knowing what the tool does.`
    : `You didn't get as far as making a video, which makes me even more curious what you were hoping for.`
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p>Hey — Joseph here, founder of <b>Kineo</b> 🎬</p>
  <p>You opened our checkout more than once in the last few days and didn't finish. That's the part I keep thinking about: <b>people who aren't interested don't come back twice.</b></p>
  <p>${made}</p>
  <p>So I'd rather ask than assume. <b>What stopped you?</b> Price, a missing feature, the payment page itself, or you just got pulled away? Reply to this email — it comes straight to me, and one honest sentence from you is worth more to me than the subscription.</p>
  <p style="color:#475569;font-size:14px"><b>P.S.</b> If it was the price and you want to try Creator properly: <b>FIRST50</b> takes half off your first month, <a href="${URL_STD}" style="color:#2997ff">applied automatically here</a>.</p>
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

    // ── Coorte: quem TENTOU o checkout 2+ vezes nos últimos 7 dias ───────────
    // O corte de 2 tentativas não é decorativo: é o que separa intenção de
    // curiosidade, e é a razão desta lista existir.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: ckRows, error: ckErr } = await admin
      .from('events')
      .select('user_id')
      .in('name', ['checkout_started', 'checkout_attempted', 'checkout_session_expired'])
      .gte('created_at', since)
      .limit(20000)
    if (ckErr) return NextResponse.json({ error: ckErr.message }, { status: 500 })

    const tries = new Map<string, number>()
    for (const r of ckRows ?? []) {
      const uid = r.user_id as string | null
      if (!uid) continue
      tries.set(uid, (tries.get(uid) ?? 0) + 1)
    }
    const candidateIds = [...tries.entries()].filter(([, n]) => n >= 2).map(([id]) => id)
    if (candidateIds.length === 0) {
      return NextResponse.json({ mode: 'DRY_RUN', remaining_unemailed: 0, note: 'no one hit checkout twice in the window' })
    }

    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, email, email_opted_out, has_paid, signup_country, last_country')
      .in('id', candidateIds.slice(0, 1000))
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 })

    const base = (profiles ?? []).filter(
      (p) => p.email && !p.email_opted_out && p.has_paid !== true && !isJunk(p.email as string),
    )
    const ids = base.map((p) => p.id as string)

    const videoCounts = new Map<string, number>()
    for (let i = 0; i < ids.length; i += 200) {
      const slice = ids.slice(i, i + 200)
      const { data: vids } = await admin.from('videos').select('user_id').in('user_id', slice).limit(10000)
      for (const v of vids ?? []) {
        const uid = v.user_id as string
        videoCounts.set(uid, (videoCounts.get(uid) ?? 0) + 1)
      }
    }

    const { data: sentRows } = await admin
      .from('events').select('user_id').eq('name', SENT_EVENT).in('user_id', ids)
    const alreadySent = new Set((sentRows ?? []).map((r) => r.user_id as string))

    const recipients = base
      .map((p) => {
        const country = ((p.signup_country ?? p.last_country) as string | null) ?? ''
        return {
          id: p.id as string,
          email: p.email as string,
          country,
          value: VALUE_COUNTRIES.has(country.toUpperCase()),
          videos: videoCounts.get(p.id as string) ?? 0,
          tries: tries.get(p.id as string) ?? 0,
        }
      })
      .filter((r) => !alreadySent.has(r.id))
      // Mais vídeos primeiro: quem mais usou é quem mais tem a dizer, e é
      // quem primeiro deve receber caso o lote seja limitado.
      .sort((a, b) => b.videos - a.videos || b.tries - a.tries)

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batchSize = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: 'opened checkout 2+ times in last 7d, unpaid, opted-in, real email',
        remaining_unemailed: recipients.length,
        value_region: recipients.filter((r) => r.value).length,
        standard_region: recipients.filter((r) => !r.value).length,
        next_batch_size: Math.min(batchSize, recipients.length),
        subjects: { value: SUBJECT_VALUE, standard: SUBJECT_STD },
        sample: recipients.slice(0, 12).map((r) => `${r.email} · ${r.country || '??'} · ${r.videos}v · ${r.tries}x · ${r.value ? 'VALUE' : 'std'}`),
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
            subject: r.value ? SUBJECT_VALUE : SUBJECT_STD,
            text: r.value ? textValue(r.videos, r.id) : textStd(r.videos, r.id),
            html: r.value ? htmlValue(r.videos, r.id) : htmlStd(r.videos, r.id),
            headers: unsubscribeHeaders(r.id),
          }),
        })
        if (!res.ok) throw new Error(`resend ${res.status}`)
        await admin.from('events').insert({
          user_id: r.id,
          name: SENT_EVENT,
          metadata: { videos: r.videos, tries: r.tries, country: r.country, variant: r.value ? 'value' : 'standard' },
        })
        sent++
        results.push({ email: r.email, outcome: `sent (${r.value ? 'value' : 'std'})` })
        await new Promise((resolve) => setTimeout(resolve, 600))
      } catch (e) {
        failed++
        results.push({ email: r.email, outcome: `failed: ${e instanceof Error ? e.message : 'error'}` })
      }
    }
    return NextResponse.json({
      mode: 'SENT', sent, failed, batch_size: batch.length,
      remaining_after_batch: recipients.length - batch.length, results,
    })
  } catch (e) {
    console.error('[send-checkout-rescue] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
