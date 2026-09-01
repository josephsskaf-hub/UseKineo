// KINEO-WINBACK-25-2026-09-01 — ACAO 1-B do fundador ("vai pra todos, 1 a 10").
//
// QUEM ENTRA (montado ao vivo do banco, nunca lista chumbada):
//   conta ZERADA (video_credits = 0) que JA FEZ pelo menos 1 video completo,
//   nunca pagou, nao optou por sair, e-mail externo, e esta FRIA ha >= 3 dias.
//   Medido em 01/09: 482 contas zeradas com video, 313 delas frias.
//
// O QUE FAZ: concede 25 creditos (= exatamente 1 filme Seedance 1.5 — o
// presente tem forma de PRODUTO, nao de cupom) com o MESMO rastro do botao
// "+ creditos" do /admin/people (evento admin_credits_granted com motivo), e
// manda UM e-mail honesto: "voltaram 25 creditos; entraram 3 motores novos
// esta semana; faca mais um filme". Sem urgencia falsa, sem desconto.
//
// POR QUE ESTA COORTE: quem gastou tudo provou que quis; o que faltou foi
// motivo para voltar. O dado da casa diz que a assinatura vem depois do 4o
// video — este e-mail compra o proximo.
//
// GUARD RAILS: so admin logado · dry-run por padrao (?confirm=SEND envia) ·
// lote de ate 60 por chamada (pacing 700ms) · 1x por pessoa PARA SEMPRE
// (stamp winback25_sent) · credito so e dado se o e-mail for aceito pela
// Resend (nada de credito fantasma sem aviso) · teto absoluto de 25.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const STAMP = 'winback25_sent'
const GRANT = 25
const PAID_PLANS = new Set(['starter', 'basic', 'pro'])
const APP = 'https://www.usekineo.com'

function buildEmail(userId: string) {
  const url = `${APP}/studio?utm_source=lifecycle&utm_medium=email&utm_campaign=winback25`
  const text = `Hey,

You made a video with Kineo and used up your credits. I just put 25 back in your account — that's one more full AI film, on us.

Three things changed since you were last here:
- Every film now gets an AI-composed soundtrack (Google Lyria 3), not stock music.
- The narration voice moved to MiniMax 2.8 HD — the top-ranked voice model right now.
- Nano Banana Pro is in the image studio.

Same idea, better film: ${url}

If anything doesn't work, hit reply — it lands with me.

Joseph
usekineo.com`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>You made a video with Kineo and used up your credits. I just put <strong>25 back in your account</strong> — that's one more full AI film, on us.</p>
  <p>Three things changed since you were last here:</p>
  <ul style="padding-left:18px;margin:0 0 16px">
    <li>Every film now gets an <strong>AI-composed soundtrack</strong> (Google Lyria 3), not stock music.</li>
    <li>The narration voice moved to <strong>MiniMax 2.8 HD</strong> — the top-ranked voice model right now.</li>
    <li><strong>Nano Banana Pro</strong> is in the image studio.</li>
  </ul>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Make one more film →</a></p>
  <p>If anything doesn't work, hit reply — it lands with me.</p>
  <p style="margin:0 0 2px">Joseph</p>
  <p style="margin:0"><a href="${APP}" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`
  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = (user?.email ?? '').toLowerCase()
    if (!user || !ADMIN_EMAILS.has(adminEmail)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const resendKey = process.env.RESEND_API_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!resendKey || !url || !svc) return NextResponse.json({ error: 'env missing' }, { status: 500 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batch = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 60) : 60

    // 1) contas zeradas, nao pagas, opt-in — lidas em paginas (regra anti-1000).
    const zeradas: Array<{ id: string; email: string; plan: string | null }> = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, plan, has_paid, email_opted_out, video_credits')
        .eq('video_credits', 0)
        .order('created_at', { ascending: true })
        .range(from, from + 999)
      if (error) throw error
      for (const p of data ?? []) {
        const email = String(p.email ?? '').toLowerCase()
        if (!email || p.email_opted_out || p.has_paid || PAID_PLANS.has(String(p.plan ?? ''))) continue
        if (isInternalEmail(email)) continue
        zeradas.push({ id: p.id as string, email, plan: (p.plan as string | null) ?? null })
      }
      if (!data || data.length < 1000) break
    }
    const ids = zeradas.map((z) => z.id)

    // 2) ja fez video · nunca recebeu este e-mail · frio ha >= 3 dias
    const comVideo = new Set<string>()
    const jaAvisado = new Set<string>()
    const quente = new Set<string>()
    for (let i = 0; i < ids.length; i += 500) {
      const slice = ids.slice(i, i + 500)
      const [{ data: v }, { data: s }, { data: q }] = await Promise.all([
        admin.from('videos').select('user_id').eq('status', 'completed').in('user_id', slice),
        admin.from('events').select('user_id').eq('name', STAMP).in('user_id', slice),
        admin.from('events').select('user_id').gte('created_at', new Date(Date.now() - 3 * 86400_000).toISOString()).in('user_id', slice).limit(5000),
      ])
      for (const r of v ?? []) comVideo.add(r.user_id as string)
      for (const r of s ?? []) jaAvisado.add(r.user_id as string)
      for (const r of q ?? []) quente.add(r.user_id as string)
    }
    const alvos = zeradas.filter((z) => comVideo.has(z.id) && !jaAvisado.has(z.id) && !quente.has(z.id))

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: 'video_credits=0 · >=1 video completo · nunca pagou · opt-in · externo · frio >=3d · nunca recebeu winback25',
        remaining_unemailed: alvos.length,
        next_batch_size: Math.min(batch, alvos.length),
        grant_per_person: GRANT,
        sample: alvos.slice(0, 12).map((a) => a.email),
        hint: 'Append &confirm=SEND (optionally &limit=N, max 60) to grant + send the next batch.',
      })
    }

    let sent = 0
    const results: Array<{ email: string; outcome: string }> = []
    for (const a of alvos.slice(0, batch)) {
      const { text, html } = buildEmail(a.id)
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL, to: [a.email], reply_to: REPLY_TO,
            subject: '25 credits are back in your account — one more film on us',
            text, html, headers: unsubscribeHeaders(a.id),
          }),
        })
        if (!res.ok) { results.push({ email: a.email, outcome: `resend ${res.status}` }); continue }
        // credito SO depois do e-mail aceito — nunca credito fantasma sem aviso
        const { data: prof } = await admin.from('profiles').select('video_credits').eq('id', a.id).maybeSingle()
        const before = (prof?.video_credits as number) ?? 0
        await admin.from('profiles').update({ video_credits: before + GRANT }).eq('id', a.id)
        await admin.from('events').insert([
          { user_id: a.id, name: 'admin_credits_granted', metadata: { amount: GRANT, before, after: before + GRANT, reason: 'winback25: conta zerada com video, presente de 1 filme (ordem do fundador 01/09)', granted_by: adminEmail, campaign: 'winback25' } },
          { user_id: a.id, name: STAMP, metadata: { campaign: 'winback25', grant: GRANT } },
        ])
        sent += 1
        results.push({ email: a.email, outcome: 'sent+granted' })
        await new Promise((r) => setTimeout(r, 700))
      } catch (e) {
        results.push({ email: a.email, outcome: `error ${e instanceof Error ? e.message : String(e)}` })
      }
    }
    return NextResponse.json({ mode: 'SENT', sent, remaining_after: Math.max(0, alvos.length - batch), results })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
