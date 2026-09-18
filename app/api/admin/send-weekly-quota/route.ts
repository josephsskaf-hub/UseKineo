// ═══ KINEO-COTA-SEMANAL-CARTA-2026-09-17 — "seu vídeo grátis voltou, e agora é toda semana" ═══════════════
//
// Fundador (17/09, tarde): "Eu quero 170 e-mails para avisar que a cota de uma semana grátis voltou. Toda semana agora
// as pessoas vão ter um vídeo." São DUAS coisas separadas, e a carta diz só a segunda: assinante renova os créditos do
// plano todo mês (não muda); conta grátis com trial encerrado ganha 1 Kineo 1 por semana (COTA-SEMANAL, no ar desde
// 17/09 — era 1 a cada 30 dias).
//
// Coorte (banco, 17/09): trial_status='downgraded' · nunca pagou · opt-in · externo · e-mail não descartável = 902
// contas, 523 com filme entregue. O "170" do fundador era o número de uma medição antiga (170 encerrados, 6 voltaram);
// a base real é maior. Padrão da casa: dry-run por padrão, envio só com &confirm=SEND clicado pelo fundador, lote
// limitado, 1 carta por conta (carimbo weekly_quota_sent), frio ≥ 3 dias (quem está ativo não precisa da carta).
// Crédito NÃO é concedido: a carta anuncia a cota, que o cobrador já libera sozinho.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { isDisposableEmail } from '@/lib/emailValidation'
import { composerUrl } from '@/lib/lifecycle/composerUrl'
import { getFreeTierOffer } from '@/lib/freeTierOffer'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
export const STAMP = 'weekly_quota_sent'
export const CAMPAIGN = 'weekly_quota_sep17'
const APP = 'https://www.usekineo.com'
const MAX_BATCH = 120
const COLD_DAYS = 3

export function weeklyQuotaSubject(): string {
  return 'Your free video is back — and now it comes back every week'
}

export function buildWeeklyQuotaEmail(userId: string): { text: string; html: string } {
  const offer = getFreeTierOffer()
  // A carta só sai se a janela for mesmo de 7 dias: promessa lida da fonte única, nunca digitada.
  const days = Math.round(offer.windowMs / 86_400_000)
  const url = composerUrl({ base: APP, campaign: CAMPAIGN })
  const seconds = offer.maxFreeFastSeconds ?? 15
  const text = `Hey,

Quick one. Your Kineo trial ended a while ago, and until today the free plan gave you one video a month.

That changed: the free plan now gives you 1 Kineo 1 video every ${days} days — script, voice, captions and footage from any idea you type, up to ${seconds} seconds, watermarked. No card, nothing to buy. It just comes back every week.

Your video for this week is already unlocked: ${url}

If you ever want longer films, every engine and clean downloads, Starter is $9.90/month and you can cancel anytime. But the weekly video is yours either way.

Joseph
usekineo.com`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>Quick one. Your Kineo trial ended a while ago, and until today the free plan gave you one video a month.</p>
  <p>That changed: the free plan now gives you <strong>1 Kineo 1 video every ${days} days</strong> — script, voice, captions and footage from any idea you type, up to ${seconds} seconds, watermarked. No card, nothing to buy. It just comes back every week.</p>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px">Make this week's free video →</a></p>
  <p>If you ever want longer films, every engine and clean downloads, Starter is $9.90/month and you can cancel anytime. But the weekly video is yours either way.</p>
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

    // Guarda de verdade: a carta promete "toda semana"; se a janela do free tier não for 7 dias, ela não sai.
    const offer = getFreeTierOffer()
    const windowDays = Math.round(offer.windowMs / 86_400_000)
    if (!offer.reverseTrial || windowDays !== 7 || offer.limit !== 1) {
      return NextResponse.json({ error: 'free tier is not 1 per 7 days — the letter would lie', window_days: windowDays, limit: offer.limit, reverse_trial: offer.reverseTrial }, { status: 409 })
    }

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const includeNoFilm = req.nextUrl.searchParams.get('all') === '1'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batch = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_BATCH) : MAX_BATCH

    const encerrados: Array<{ id: string; email: string }> = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, has_paid, email_opted_out, trial_status')
        .eq('trial_status', 'downgraded')
        .order('created_at', { ascending: true })
        .range(from, from + 999)
      if (error) throw error
      for (const p of data ?? []) {
        const email = String(p.email ?? '').toLowerCase()
        if (!email || p.email_opted_out || p.has_paid) continue
        if (isInternalEmail(email) || isDisposableEmail(email)) continue
        encerrados.push({ id: p.id as string, email })
      }
      if (!data || data.length < 1000) break
    }
    const ids = encerrados.map((z) => z.id)

    const comVideo = new Set<string>()
    const jaAvisado = new Set<string>()
    const quente = new Set<string>()
    for (let i = 0; i < ids.length; i += 500) {
      const slice = ids.slice(i, i + 500)
      const [{ data: v }, { data: s }, { data: q }] = await Promise.all([
        admin.from('videos').select('user_id').eq('status', 'completed').in('user_id', slice),
        admin.from('events').select('user_id').eq('name', STAMP).in('user_id', slice),
        // 'Frio' = sem atividade REAL no navegador (session_id). Evento de servidor (cron, e-mail automático) não é presença:
        // no 1º lote (17/09) o filtro cru deixou 156 de 523 passarem — o resto tinha só carimbo de e-mail nosso.
        admin.from('events').select('user_id').gte('created_at', new Date(Date.now() - COLD_DAYS * 86400_000).toISOString()).not('session_id', 'is', null).in('user_id', slice).limit(5000),
      ])
      for (const r of v ?? []) comVideo.add(r.user_id as string)
      for (const r of s ?? []) jaAvisado.add(r.user_id as string)
      for (const r of q ?? []) quente.add(r.user_id as string)
    }
    // Primeiro quem já viu o produto funcionar (fez filme): é quem sabe o que "um vídeo por semana" vale.
    const alvos = encerrados.filter((z) => (includeNoFilm || comVideo.has(z.id)) && !jaAvisado.has(z.id) && !quente.has(z.id))

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: `trial encerrado (downgraded) · nunca pagou · opt-in · externo · não descartável · frio >=${COLD_DAYS}d · nunca recebeu esta carta${includeNoFilm ? '' : ' · >=1 filme entregue'}`,
        free_tier: { limit: offer.limit, window_days: windowDays, max_seconds: offer.maxFreeFastSeconds },
        remaining_unemailed: alvos.length,
        with_film: encerrados.filter((z) => comVideo.has(z.id)).length,
        without_film: encerrados.filter((z) => !comVideo.has(z.id)).length,
        next_batch_size: Math.min(batch, alvos.length),
        sample: alvos.slice(0, 12).map((a) => a.email),
        subject: weeklyQuotaSubject(),
        hint: `Append &confirm=SEND (optionally &limit=N, max ${MAX_BATCH}; &all=1 includes accounts without a film) to send the next batch. No credits are granted.`,
      })
    }

    let sent = 0
    const results: Array<{ email: string; outcome: string }> = []
    for (const a of alvos.slice(0, batch)) {
      const { text, html } = buildWeeklyQuotaEmail(a.id)
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL, to: [a.email], reply_to: REPLY_TO,
            subject: weeklyQuotaSubject(),
            text, html, headers: unsubscribeHeaders(a.id),
          }),
        })
        if (!res.ok) { results.push({ email: a.email, outcome: `resend ${res.status}` }); continue }
        await admin.from('events').insert([
          { user_id: a.id, name: STAMP, metadata: { campaign: CAMPAIGN, window_days: windowDays, had_film: comVideo.has(a.id) } },
        ])
        sent += 1
        results.push({ email: a.email, outcome: 'sent' })
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
