// KINEO-SUBSCRIBER-IDLE-2026-09-02 — sprint-assinaturas #10.
// Contexto e copy em lib/lifecycle/subscriberIdle.ts.
//
// QUEM ENTRA (montado ao vivo do banco): has_paid · plano pago (starter/
// basic/pro) com id de assinatura em algum provedor · opt-in · e-mail
// externo · credito para >= 1 filme Seedance · SEM video completo ha >= 10
// dias (ou nunca) · sem atividade nas ultimas 24h (pode estar num render)
// · nao recebeu este e-mail nos ultimos 30 dias.
//
// GUARD RAILS: so admin logado · dry-run por padrao (?confirm=SEND envia) ·
// lote de ate 20 (pacing 700ms) · stamp subscriber_idle_sent com plan/
// credits/days_idle · NAO mexe em credito, plano nem assinatura.
//
// Link de 1 clique do fundador:
//   /api/admin/send-subscriber-idle                  (dry-run: ve a lista)
//   /api/admin/send-subscriber-idle?confirm=SEND     (envia o lote)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { creditCostFor } from '@/lib/credits/engineCost'
import {
  STAMP, IDLE_DAYS, RESEND_DAYS, HOT_HOURS, MAX_BATCH, PAID_PLANS,
  buildEmail, cleanTitle, ideasFor, type IdleTarget,
} from '@/lib/lifecycle/subscriberIdle'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'

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
    const batch = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_BATCH) : MAX_BATCH
    const minCredits = Math.max(1, creditCostFor('cinematic_ai', true))

    // 1) assinantes pagantes ativos, opt-in, externos — em paginas (regra anti-1000)
    const subs: Array<{ id: string; email: string; plan: string; credits: number }> = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, plan, has_paid, email_opted_out, video_credits, stripe_subscription_id, paypal_subscription_id, paddle_subscription_id')
        .eq('has_paid', true)
        .order('created_at', { ascending: true })
        .range(from, from + 999)
      if (error) throw error
      for (const p of data ?? []) {
        const email = String(p.email ?? '').toLowerCase()
        const plan = String(p.plan ?? '')
        const hasSub = Boolean(p.stripe_subscription_id || p.paypal_subscription_id || p.paddle_subscription_id)
        if (!email || p.email_opted_out || !PAID_PLANS.has(plan) || !hasSub) continue
        if (isInternalEmail(email)) continue
        const credits = Number(p.video_credits ?? 0)
        if (!Number.isFinite(credits) || credits < minCredits) continue
        subs.push({ id: p.id as string, email, plan, credits })
      }
      if (!data || data.length < 1000) break
    }
    const ids = subs.map((s) => s.id)

    // 2) ultimo video completo · stamp nos ultimos 30d · atividade nas ultimas 24h
    const lastVideo = new Map<string, { at: number; title: string | null }>()
    const jaAvisado = new Set<string>()
    const quente = new Set<string>()
    for (let i = 0; i < ids.length; i += 500) {
      const slice = ids.slice(i, i + 500)
      const [{ data: v }, { data: s }, { data: q }] = await Promise.all([
        admin.from('videos').select('user_id, created_at, title, topic').eq('status', 'completed').in('user_id', slice).order('created_at', { ascending: false }).limit(5000),
        admin.from('events').select('user_id').eq('name', STAMP).gte('created_at', new Date(Date.now() - RESEND_DAYS * 86400_000).toISOString()).in('user_id', slice),
        admin.from('events').select('user_id').gte('created_at', new Date(Date.now() - HOT_HOURS * 3600_000).toISOString()).in('user_id', slice).limit(5000),
      ])
      for (const r of v ?? []) {
        const uid = r.user_id as string
        const at = Date.parse(String(r.created_at))
        const prev = lastVideo.get(uid)
        if (!prev || at > prev.at) lastVideo.set(uid, { at, title: cleanTitle((r.title as string | null) ?? (r.topic as string | null)) })
      }
      for (const r of s ?? []) jaAvisado.add(r.user_id as string)
      for (const r of q ?? []) quente.add(r.user_id as string)
    }
    const alvos: IdleTarget[] = subs
      .filter((s) => !jaAvisado.has(s.id) && !quente.has(s.id))
      .map((s) => {
        const lv = lastVideo.get(s.id)
        const daysIdle = lv ? Math.floor((Date.now() - lv.at) / 86400_000) : null
        return { id: s.id, email: s.email, plan: s.plan, credits: s.credits, daysIdle, lastTitle: lv?.title ?? null }
      })
      .filter((t) => t.daysIdle == null || t.daysIdle >= IDLE_DAYS)
      .sort((a, b) => b.credits - a.credits)

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: `has_paid · plano pago com assinatura · opt-in · externo · >=${minCredits}cr · sem video completo ha >=${IDLE_DAYS}d (ou nunca) · sem atividade ${HOT_HOURS}h · sem ${STAMP} em ${RESEND_DAYS}d`,
        subscribers_scanned: subs.length,
        targets: alvos.length,
        next_batch_size: Math.min(batch, alvos.length),
        sample: alvos.slice(0, 20).map((a) => ({ email: a.email, plan: a.plan, credits: a.credits, days_idle: a.daysIdle, last_title: a.lastTitle, ideas: ideasFor(a).map((i) => i.label) })),
        hint: `Append &confirm=SEND (optionally &limit=N, max ${MAX_BATCH}) to send the next batch. No credits, plans or subscriptions are touched.`,
      })
    }

    let sent = 0
    const results: Array<{ email: string; outcome: string }> = []
    for (const a of alvos.slice(0, batch)) {
      const { subject, text, html } = buildEmail(a)
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM_EMAIL, to: [a.email], reply_to: REPLY_TO, subject, text, html, headers: unsubscribeHeaders(a.id) }),
        })
        if (!res.ok) { results.push({ email: a.email, outcome: `resend ${res.status}` }); continue }
        await admin.from('events').insert({
          user_id: a.id, name: STAMP,
          metadata: { campaign: 'subscriber_idle', plan: a.plan, credits: a.credits, days_idle: a.daysIdle, sequel: Boolean(a.lastTitle), sent_by: adminEmail },
        })
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
