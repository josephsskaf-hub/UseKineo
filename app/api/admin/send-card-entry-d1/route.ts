// KINEO-CARTA-D1-PORTA-2026-09-08 — TAREFA 5 (fundador, 08/09): "carta D+1 para
// quem viu a porta de $1 e não pagou. Hoje essa pessoa não recebe nada."
//
// A COORTE: conta nascida na versão B (trial_status='card_required'), sem
// nunca ter pago, com 0 crédito, criada entre 20 horas e 7 dias atrás. É a
// pessoa que veio, viu "$1 por 7 dias" e foi embora. Os e-mails de lifecycle
// do trial (TRIAL_OPEN_STATUSES = active/expired) NÃO alcançam este status.
//
// GUARD RAILS (mesmo contrato de send-second-try-1usd): só admin logado ou o
// cron com CRON_SECRET · DRY-RUN por padrão (?confirm=SEND envia) · 1× por
// pessoa (carimbo `card_entry_d1_sent`, registrado em LIFECYCLE_EMAIL_EVENT_NAMES
// no mesmo commit) · supressão de 24h da casa · descadastro no rodapé e nos
// cabeçalhos · contas internas e os 4 contatos proibidos fora · lote máx. 30.
//
// A CARTA: seis linhas, voz do fundador, o link direto do $1 e UMA pergunta.
// Sem desconto, sem crédito, sem urgência falsa. Preço nunca digitado: sai de
// lib/lifecycle/trialEntryFee (fonte única).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { trialEntryFeeLabel, trialEntryFullPromise, trialMonthlyAfterLabel } from '@/lib/lifecycle/trialEntryFee'
import { trialReachClause } from '@/lib/lifecycle/trialReachLine'
import { CARD_TRIAL_DAYS, CARD_TRIAL_GRANT_CREDITS } from '@/lib/checkoutPricing'
import { CARD_ENTRY_ONLY, CARD_ENTRY_TRIAL_STATUS } from '@/lib/entryPolicy'
import { PAID_PLANS } from '../_shared/mrr'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const STAMP = 'card_entry_d1_sent'
const CAMPAIGN = 'card_entry_d1'
const APP = 'https://www.usekineo.com'
const MAX_BATCH = 30
const MIN_AGE_MS = 20 * 60 * 60 * 1000
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const CONTATOS_PROIBIDOS = ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']
function proibido(email: string): boolean {
  const e = email.toLowerCase()
  return CONTATOS_PROIBIDOS.some((c) => e.includes(c))
}

function autorizadoPorCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export interface CardEntryD1Person {
  id: string
  email: string
  createdAt: string
  sawDoor: boolean
  hitPaywall: boolean
}

/** Elegível = nasceu na porta, nunca pagou, 0 crédito, 20h–7d de idade. Pura, para o guardião. */
export function isCardEntryD1Eligible(
  p: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null; video_credits?: number | null; created_at?: string | null; email_opted_out?: boolean | null },
  now: number = Date.now(),
): boolean {
  if (p.trial_status !== CARD_ENTRY_TRIAL_STATUS) return false
  if (p.has_paid === true) return false
  if (PAID_PLANS.has(String(p.plan ?? '').toLowerCase())) return false
  if ((p.video_credits ?? 0) > 0) return false
  if (p.email_opted_out) return false
  const t = typeof p.created_at === 'string' ? Date.parse(p.created_at) : NaN
  if (!Number.isFinite(t)) return false
  const age = now - t
  return age >= MIN_AGE_MS && age <= MAX_AGE_MS
}

export function buildCardEntryD1Email(p: CardEntryD1Person): { subject: string; text: string; html: string } {
  const fee = trialEntryFeeLabel({ compact: true })
  const promise = trialEntryFullPromise(CARD_TRIAL_DAYS)
  const after = trialMonthlyAfterLabel({ compact: true })
  const reach = trialReachClause(CARD_TRIAL_GRANT_CREDITS)
  const url = `${APP}/api/stripe/checkout?tier=basic&billing=monthly&trial=1`
    + `&intent_campaign=${CAMPAIGN}`
    + `&utm_source=email&utm_medium=lifecycle&utm_campaign=${CAMPAIGN}`
  const reachSentence = reach
    ? `${CARD_TRIAL_GRANT_CREDITS} credits up front — ${reach}.`
    : `${CARD_TRIAL_GRANT_CREDITS} credits up front.`
  const opening = p.hitPaywall
    ? 'You typed an idea into Kineo yesterday, pressed Generate, and hit the door instead of a film.'
    : 'You opened a Kineo account yesterday, saw the door, and didn\'t come in.'
  const subject = p.hitPaywall
    ? `Your film is still waiting — ${fee} opens the door`
    : `The ${fee} door — and one honest question`
  const text = `Hey,

${opening} I'd rather ask than guess.

Kineo has no free tier any more. The way in is ${promise}: ${reachSentence} After the ${CARD_TRIAL_DAYS} days it's ${after}, and cancelling inside the week costs you ${fee} total.

${url}

If it wasn't the price — the card, the country, the engines, something on the page — hit reply and tell me. It comes to me, not a helpdesk, and I fix things the same day.

Joseph
usekineo.com`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>${opening} I'd rather ask than guess.</p>
  <p>Kineo has no free tier any more. The way in is <strong>${promise}</strong>: ${reachSentence} After the ${CARD_TRIAL_DAYS} days it's ${after}, and cancelling inside the week costs you ${fee} total.</p>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:8px">Start for ${fee} &rarr;</a></p>
  <p>If it wasn't the price &mdash; the card, the country, the engines, something on the page &mdash; hit reply and tell me. It comes to me, not a helpdesk, and I fix things the same day.</p>
  <p style="margin:0 0 2px">Joseph</p>
  <p style="margin:0"><a href="${APP}" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(p.id)}`
  return { subject, text: `${text}${emailFooterText(p.id)}`, html }
}

export async function GET(req: NextRequest) {
  try {
    if (!CARD_ENTRY_ONLY) return NextResponse.json({ error: 'card_entry_off', hint: 'Esta carta só existe sob a versão B.' }, { status: 409 })
    const porCron = autorizadoPorCron(req)
    if (!porCron) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const adminEmail = (user?.email ?? '').toLowerCase()
      if (!user || !ADMIN_EMAILS.has(adminEmail)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const resendKey = process.env.RESEND_API_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!resendKey || !url || !svc) return NextResponse.json({ error: 'env missing' }, { status: 500 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batch = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_BATCH) : MAX_BATCH
    const now = Date.now()

    const elegiveis: Array<{ id: string; email: string; createdAt: string }> = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, plan, has_paid, email_opted_out, video_credits, trial_status, created_at')
        .eq('trial_status', CARD_ENTRY_TRIAL_STATUS)
        .gte('created_at', new Date(now - MAX_AGE_MS).toISOString())
        .order('created_at', { ascending: true })
        .range(from, from + 999)
      if (error) throw error
      for (const p of data ?? []) {
        const email = String(p.email ?? '').toLowerCase()
        if (!email || isInternalEmail(email) || proibido(email)) continue
        if (!isCardEntryD1Eligible(p as Parameters<typeof isCardEntryD1Eligible>[0], now)) continue
        elegiveis.push({ id: p.id as string, email, createdAt: String(p.created_at) })
      }
      if (!data || data.length < 1000) break
    }

    const ids = elegiveis.map((e) => e.id)
    const jaAvisado = new Set<string>()
    const viuPorta = new Set<string>()
    const bateuPorta = new Set<string>()
    for (let i = 0; i < ids.length; i += 500) {
      const slice = ids.slice(i, i + 500)
      const { data: ev } = await admin
        .from('events')
        .select('user_id, name')
        .in('name', [STAMP, 'card_entry_banner_shown', 'paywall_hit'])
        .in('user_id', slice)
        .limit(20000)
      for (const r of ev ?? []) {
        const uid = r.user_id as string
        if (r.name === STAMP) jaAvisado.add(uid)
        else if (r.name === 'card_entry_banner_shown') viuPorta.add(uid)
        else if (r.name === 'paywall_hit') bateuPorta.add(uid)
      }
    }

    const candidatos: CardEntryD1Person[] = elegiveis
      .filter((e) => !jaAvisado.has(e.id))
      .map((e) => ({ id: e.id, email: e.email, createdAt: e.createdAt, sawDoor: viuPorta.has(e.id), hitPaywall: bateuPorta.has(e.id) }))
    const supressao = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    // quem bateu na porta ao gerar vem primeiro: intenção mais quente
    const alvos = candidatos
      .filter((c) => !supressao.isSuppressed(c.id))
      .sort((a, b) => Number(b.hitPaywall) - Number(a.hitPaywall) || b.createdAt.localeCompare(a.createdAt))

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: 'trial_status=card_required · nunca pagou · 0 crédito · 20h–7d · opt-in · externo · fora dos proibidos · não suprimido 24h · nunca recebeu esta carta',
        candidates: candidatos.length,
        suppressed_24h: supressao.suppressedCount,
        suppression_degraded: supressao.degraded,
        remaining_unemailed: alvos.length,
        next_batch_size: Math.min(batch, alvos.length),
        hit_paywall: alvos.filter((a) => a.hitPaywall).length,
        saw_door: alvos.filter((a) => a.sawDoor).length,
        sample: alvos.slice(0, 12).map((a) => ({ email: a.email, created_at: a.createdAt, saw_door: a.sawDoor, hit_paywall: a.hitPaywall })),
        subject_preview: alvos.length > 0 ? buildCardEntryD1Email(alvos[0]).subject : null,
        hint: `Append &confirm=SEND (optionally &limit=N, max ${MAX_BATCH}) to send the next batch.`,
      })
    }

    let sent = 0
    const results: Array<{ email: string; outcome: string }> = []
    for (const a of alvos.slice(0, batch)) {
      const { subject, text, html } = buildCardEntryD1Email(a)
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM_EMAIL, to: [a.email], reply_to: REPLY_TO, subject, text, html, headers: unsubscribeHeaders(a.id) }),
        })
        if (!res.ok) { results.push({ email: a.email, outcome: `resend ${res.status}` }); continue }
        await admin.from('events').insert({
          user_id: a.id,
          name: STAMP,
          metadata: { campaign: CAMPAIGN, saw_door: a.sawDoor, hit_paywall: a.hitPaywall, fee: trialEntryFeeLabel({ compact: true }) },
        })
        sent += 1
        results.push({ email: a.email, outcome: 'sent' })
        await new Promise((r) => setTimeout(r, 600))
      } catch (e) {
        results.push({ email: a.email, outcome: `error ${e instanceof Error ? e.message : String(e)}` })
      }
    }
    return NextResponse.json({ mode: 'SENT', sent, remaining_after: Math.max(0, alvos.length - batch), results })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
