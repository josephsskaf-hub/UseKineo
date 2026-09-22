// KINEO-STUDIO50-2026-09-22 — carta "Studio a 50%" para quem chegou ao checkout e não pagou.
//
// POR QUE A CARTA É SECUNDÁRIA (medido 22/09): 4 cartas anteriores para esta coorte (checkout_rescue 19/08 com
// FIRST50, comeback50, checkout_recovery, second_try_1usd) = 196 envios, 2 voltaram ao site, 0 pagaram — duas
// delas já davam 50%. Por isso: (1) o banner em /pricing e /checkout/cancelled é a peça principal (a coorte volta
// sozinha: 155 de 162 tentaram 2+ vezes); (2) esta carta vai SÓ para quem tentou nos últimos STUDIO50_WARM_DAYS
// dias e nunca recebeu nada da casa em 24h (regra: 1 e-mail por pessoa por dia); (3) assunto sem "50% off" no
// início — a promessa é o PLANO (300 créditos) pelo preço do de baixo.
//
// GUARD RAILS: só admin logado · dry-run por padrão (?confirm=SEND envia) · ?days=N (default 14, teto 60) ·
// lote ≤ 60 (pacing 700ms) · 1× por pessoa PARA SEMPRE (stamp studio50_sent) · cupom conferido/provisionado na
// Stripe ANTES de qualquer envio (a carta nunca promete desconto que não existe) · sem número de preço aqui.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { LIFECYCLE_EMAIL_EVENT_NAMES } from '@/lib/lifecycle/emailEvents'
import {
  STUDIO50_CHECKOUT_EVENTS, STUDIO50_CODE, STUDIO50_COUPON_ID, STUDIO50_DURATION, STUDIO50_PERCENT,
  STUDIO50_REPEATING_MONTHS, STUDIO50_SENT_STAMP, STUDIO50_WARM_DAYS, offerCheckoutHref, studio50Copy, studio50Eligibility, studio50OfferFor,
} from '@/lib/offers/studio50'
type Offer = ReturnType<typeof studio50OfferFor>
// O literal existe de propósito: o inventário de cobertura (test-cobertura-supressao) reconhece uma rota que envia
// pelo NOME do carimbo em events; o tipo garante que ele não pode divergir da fonte única.
const STAMP = 'studio50_sent' satisfies typeof STUDIO50_SENT_STAMP

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Rota SÓ-GET no Next 14.2: sem isto o supabase-js cairia no Data Cache da Vercel (KINEO-DATA-CACHE-2026-09-02).
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const APP = 'https://www.usekineo.com'

function buildEmail(userId: string, offer: Offer) {
  const url = `${APP}${offerCheckoutHref(offer, 'email')}`
  const copy = studio50Copy(offer)
  const who = offer.planName === 'Studio' ? 'the one built for people posting several Shorts a week' : 'the one most people here end up on'
  const text = `Hey — Joseph here, founder of Kineo.

You went as far as the checkout and stopped. Fair enough — so here's a different door.

${offer.planName} is our ${offer.credits}-credit plan, ${who}. For your first month it's half price, applied automatically when you open this link (no code to type):

${url}

Month to month. Cancel any time, no email to me required.

If it wasn't the price — reply and tell me what it was. It lands with me, not a helpdesk.

— Joseph, founder
Kineo · ${APP}${emailFooterText(userId)}`
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p>Hey — Joseph here, founder of <b>Kineo</b> 🎬</p>
  <p>You went as far as the checkout and stopped. Fair enough — so here's a different door.</p>
  <p style="font-size:17px;margin:18px 0"><b>${offer.planName}</b> is our ${offer.credits}-credit plan, ${who}. For your first month it's <b>half price</b>, applied automatically when you open this link (no code to type):</p>
  <p style="margin:26px 0"><a href="${url}" style="background:#30d158;color:#04120a;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">${copy.cta}</a></p>
  <p style="color:#475569;font-size:14px">Month to month. Cancel any time, no email to me required.</p>
  <p style="color:#475569;font-size:14px">If it wasn't the price — reply and tell me what it was. It lands with me, not a helpdesk.</p>
  <p>— Joseph, founder<br/>Kineo · <a href="${APP}" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`
  return { text, html, subject: copy.subject }
}

/** O cupom tem de existir ANTES de a carta prometer. Mesmo padrão auto-provisionado do checkout. */
async function ensureCoupon(): Promise<{ live: boolean; detail: string }> {
  try {
    try { await stripe.coupons.retrieve(STUDIO50_COUPON_ID) } catch {
      await stripe.coupons.create({
        id: STUDIO50_COUPON_ID, percent_off: STUDIO50_PERCENT, name: `${STUDIO50_PERCENT}% off Studio (first month)`,
        ...(STUDIO50_DURATION === 'repeating' ? { duration: 'repeating' as const, duration_in_months: STUDIO50_REPEATING_MONTHS } : { duration: 'once' as const }),
      })
    }
    try { await stripe.promotionCodes.create({ coupon: STUDIO50_COUPON_ID, code: STUDIO50_CODE }) } catch { /* já existe */ }
    const list = await stripe.promotionCodes.list({ code: STUDIO50_CODE, active: true, limit: 1 })
    const pc = list.data[0]
    return pc ? { live: true, detail: `promotion_code ${pc.id} active` } : { live: false, detail: `no active promotion code ${STUDIO50_CODE}` }
  } catch (e) {
    return { live: false, detail: e instanceof Error ? e.message : String(e) }
  }
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
    const daysParam = Number(req.nextUrl.searchParams.get('days'))
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 60) : STUDIO50_WARM_DAYS
    const since = new Date(Date.now() - days * 86400_000).toISOString()

    // 1) quem tentou o checkout na janela (paginado — PostgREST corta em 1000)
    const lastHit = new Map<string, string>()
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from('events').select('user_id, created_at')
        .in('name', [...STUDIO50_CHECKOUT_EVENTS]).gte('created_at', since).not('user_id', 'is', null)
        .order('created_at', { ascending: false }).range(from, from + 999)
      if (error) throw error
      for (const r of data ?? []) { const id = r.user_id as string; if (!lastHit.has(id)) lastHit.set(id, r.created_at as string) }
      if (!data || data.length < 1000) break
    }
    const ids = [...lastHit.keys()]

    // 2) e-mail externo, opt-in, nunca recebeu esta carta, nada da casa nas últimas 24h, e elegível (nunca pagou)
    const dayAgo = new Date(Date.now() - 86400_000).toISOString()
    const profiles = new Map<string, { email: string; opted: boolean }>()
    const stamped = new Set<string>()
    const emailedToday = new Set<string>()
    for (let i = 0; i < ids.length; i += 300) {
      const slice = ids.slice(i, i + 300)
      const [{ data: p }, { data: s }, { data: t }] = await Promise.all([
        admin.from('profiles').select('id, email, email_opted_out').in('id', slice),
        admin.from('events').select('user_id').eq('name', STAMP).in('user_id', slice),
        admin.from('events').select('user_id').in('name', [...LIFECYCLE_EMAIL_EVENT_NAMES, STAMP]).gte('created_at', dayAgo).in('user_id', slice),
      ])
      for (const r of p ?? []) profiles.set(r.id as string, { email: String(r.email ?? '').toLowerCase(), opted: !!r.email_opted_out })
      for (const r of s ?? []) stamped.add(r.user_id as string)
      for (const r of t ?? []) emailedToday.add(r.user_id as string)
    }
    const skipped = { internal_or_invalid: 0, opted_out: 0, already_stamped: 0, emailed_today: 0, paid: 0 }
    const alvos: Array<{ id: string; email: string; lastHit: string; attempts: number; offer: Offer }> = []
    for (const id of ids) {
      const prof = profiles.get(id)
      if (!prof || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(prof.email) || isInternalEmail(prof.email)) { skipped.internal_or_invalid += 1; continue }
      if (prof.opted) { skipped.opted_out += 1; continue }
      if (stamped.has(id)) { skipped.already_stamped += 1; continue }
      if (emailedToday.has(id)) { skipped.emailed_today += 1; continue }
      const e = await studio50Eligibility(admin, id)
      if (!e.eligible) { skipped.paid += 1; continue }
      alvos.push({ id, email: prof.email, lastHit: lastHit.get(id) as string, attempts: e.attempts, offer: studio50OfferFor(e.lastTier) })
    }
    alvos.sort((a, b) => (a.lastHit < b.lastHit ? 1 : -1)) // intenção mais recente primeiro

    const coupon = await ensureCoupon()
    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: `checkout_attempted/started nos últimos ${days} dias · nunca pagou · opt-in · externo · nunca recebeu studio50 · nada da casa em 24h`,
        offer: { code: STUDIO50_CODE, tier: 'pro (Studio, mensal)', percent: STUDIO50_PERCENT, duration: STUDIO50_DURATION, coupon },
        remaining_unemailed: alvos.length, next_batch_size: Math.min(batch, alvos.length), skipped,
        intent_age_days: alvos.slice(0, batch).map((a) => Math.round((Date.now() - new Date(a.lastHit).getTime()) / 86400_000)),
        by_offer: { STUDIO50: alvos.filter((a) => a.offer.code === 'STUDIO50').length, CREATOR50: alvos.filter((a) => a.offer.code === 'CREATOR50').length },
        sample: alvos.slice(0, 12).map((a) => `${a.email} · ${a.attempts}× · last ${a.lastHit.slice(0, 10)} · ${a.offer.code}`),
        hint: 'Append &confirm=SEND (optionally &limit=N ≤ 60, &days=N ≤ 60) to send the next batch.',
      })
    }
    if (!coupon.live) return NextResponse.json({ error: 'Refusing to send: coupon not live on Stripe', coupon }, { status: 409 })

    let sent = 0
    const results: Array<{ email: string; outcome: string }> = []
    for (const a of alvos.slice(0, batch)) {
      const { text, html, subject } = buildEmail(a.id, a.offer)
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM_EMAIL, to: [a.email], reply_to: REPLY_TO, subject, text, html, headers: unsubscribeHeaders(a.id) }),
        })
        if (!res.ok) { results.push({ email: a.email, outcome: `resend ${res.status}` }); continue }
        await admin.from('events').insert({ user_id: a.id, name: STAMP, metadata: { campaign: 'studio50', code: a.offer.code, attempts: a.attempts, last_checkout_at: a.lastHit, days } })
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
