import { readAll } from '@/lib/supabase/readAll'
// KINEO-PRECO-CAIU-2026-10-09 — "o preço baixou" para quem abriu o checkout com o preço da V8-A e não comprou.
//
// Fundador, 09/10 ~03h30 BRT: "agora é a hora de ter 20, 30, 40 clientes… fica aí trabalhando a madrugada para trazer
// cliente de formas diferentes". A casa já concluiu que o vazamento do checkout é PREÇO (CLAUDE.md, 19/08); o preço caiu
// às 03:38 UTC de 09/10 e as pessoas que travaram nele não sabem. Esta é a primeira carta da casa que só diz isso.
//
// QUEM ENTRA (montado ao vivo do banco): abriu o checkout na janela da V8-A (lib/growth/priceDrop.ts PRICE_DROP_WINDOW),
// nunca pagou (has_paid falso, plano não pago, sem payment_success/subscription_invoice_paid), e-mail externo, não saiu da
// lista, nunca recebeu esta carta (stamp price_drop_1009_sent). Medido 09/10: 21 pessoas abriram o checkout na janela,
// 18 nunca pagaram, 1 é conta da casa.
//
// O QUE DIZ: "era X, agora Y" para Starter e Creator (os únicos que baixaram), o que o Creator faz por mês (imagens Nano
// Banana Pro e filmes Seedance, das funções da casa), o filme da própria pessoa se ela tiver um, e o link do /pricing já no
// mensal (?billing=monthly mostra os mesmos números da carta).
//
// GUARD RAILS: só admin logado · dry-run por padrão (?confirm=SEND envia) · lote de até 40 · 1× por pessoa para sempre ·
// recusa se o preço de hoje não for menor que o da V8-A (priceDropLines vazio → 409 price_not_lower) · rodapé e cabeçalho
// de descadastro iguais aos das outras cartas.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { IMG_NANOBANANA_CR, videosPerMonth } from '@/lib/marketingPrice'
import { PRICE_DROP_CAMPAIGN, PRICE_DROP_WINDOW, inPriceDropWindow, priceDropLines, type PriceDropLine } from '@/lib/growth/priceDrop'
import { PAID_PLANS } from '../_shared/mrr'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Rota só-GET: sem esta linha o supabase-js lia o banco do Data Cache da Vercel (KINEO-DATA-CACHE-2026-09-02).
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const APP = 'https://www.usekineo.com'
const ROUTE = '/api/admin/send-price-drop'
const PAID_EVENTS = ['payment_success', 'subscription_invoice_paid']
// O carimbo escrito por extenso: a supressão de 24 h (lib/lifecycle/emailEvents.ts) e o guardião de cobertura leem o nome
// literal. Espelho de PRICE_DROP_STAMP em lib/growth/priceDrop.ts (o guardião da carta confere a igualdade).
const STAMP = 'price_drop_1009_sent'
const TIER_NAME: Record<PriceDropLine['tier'], string> = { starter: 'Starter', basic: 'Creator' }

const usd = (cents: number) => formatCheckoutMoney('usd', cents)
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

function buildEmail(userId: string, lines: PriceDropLine[], filmTitle: string | null) {
  const url = `${APP}/pricing?billing=monthly&utm_source=lifecycle&utm_medium=email&utm_campaign=${PRICE_DROP_CAMPAIGN}`
  const creatorImages = Math.floor(TIER_CREDITS.basic / IMG_NANOBANANA_CR)
  const creatorFilms = videosPerMonth('basic', 'cinematic_ai')
  const priceText = lines.map((l) => `- ${TIER_NAME[l.tier]}: ${usd(l.nowCents)}/month (was ${usd(l.wasCents)})`).join('\n')
  const priceHtml = lines.map((l) => `<li><strong>${TIER_NAME[l.tier]}: ${usd(l.nowCents)}/month</strong> <span style="color:#6b7280">(was <s>${usd(l.wasCents)}</s>)</span></li>`).join('')
  const film = filmTitle ? filmTitle.split('\n')[0].trim().slice(0, 80) : ''
  const filmText = film ? `\nYour film "${film}" is still in your library. On a plan, the next ones come out without the watermark.\n` : ''
  const filmHtml = film ? `<p>Your film <strong>“${escapeHtml(film)}”</strong> is still in your library. On a plan, the next ones come out without the watermark.</p>` : ''
  const text = `Hey,

A few days ago you opened checkout for a Kineo plan. We just lowered the prices:

${priceText}

Same credits as before. Creator's ${TIER_CREDITS.basic} credits a month make ${creatorImages} Nano Banana Pro images or ${creatorFilms} narrated Seedance films of 60 seconds — one balance, mix them as you like.
${filmText}
See the plans: ${url}

Cancel anytime, and your first paid month has a 7-day money-back guarantee.

Joseph
usekineo.com`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>A few days ago you opened checkout for a Kineo plan. We just lowered the prices:</p>
  <ul style="padding-left:18px;margin:0 0 16px">${priceHtml}</ul>
  <p>Same credits as before. Creator's ${TIER_CREDITS.basic} credits a month make <strong>${creatorImages} Nano Banana Pro images</strong> or <strong>${creatorFilms} narrated Seedance films</strong> of 60 seconds — one balance, mix them as you like.</p>
  ${filmHtml}
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#0A5CFF;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">See the new prices →</a></p>
  <p>Cancel anytime, and your first paid month has a 7-day money-back guarantee.</p>
  <p style="margin:0 0 2px">Joseph</p>
  <p style="margin:0"><a href="${APP}" style="color:#0A5CFF">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`
  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = (user?.email ?? '').toLowerCase()
    if (!user || !ADMIN_EMAILS.has(adminEmail)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // A trava: sem queda de preço de verdade, não há carta.
    const lines = priceDropLines({ starter: TIER_PRICES.starter.usd, basic: TIER_PRICES.basic.usd })
    if (lines.length === 0) return NextResponse.json({ error: 'price_not_lower', nothing_sent: true }, { status: 409 })

    const resendKey = process.env.RESEND_API_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!resendKey || !url || !svc) return NextResponse.json({ error: 'env missing' }, { status: 500 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batch = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 40) : 40

    // 1) quem abriu o checkout na janela da V8-A (lido em páginas; regra anti-1000)
    const { data: ck, error: ckErr } = await readAll(() => admin
      .from('events')
      .select('user_id, created_at')
      .eq('name', 'checkout_started')
      .gte('created_at', PRICE_DROP_WINDOW.from)
      .lt('created_at', PRICE_DROP_WINDOW.to)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true }), { route: ROUTE, table: 'events' })
    if (ckErr) throw ckErr
    const ids = [...new Set((ck ?? []).filter((r) => inPriceDropWindow(String(r.created_at))).map((r) => String(r.user_id)))]

    // 2) perfil, pagamento, carta já enviada e o último filme da pessoa
    const perfis = new Map<string, { email: string; plan: string; has_paid: boolean; opted_out: boolean }>()
    const pagou = new Set<string>()
    const avisado = new Set<string>()
    const filme = new Map<string, string>()
    for (let i = 0; i < ids.length; i += 200) {
      const slice = ids.slice(i, i + 200)
      const [{ data: p }, { data: pg }, { data: st }, { data: v }] = await Promise.all([
        readAll(() => admin.from('profiles').select('id, email, plan, has_paid, email_opted_out').in('id', slice).order('id', { ascending: true }), { route: ROUTE, table: 'profiles' }),
        readAll(() => admin.from('events').select('user_id').in('name', PAID_EVENTS).in('user_id', slice).order('user_id', { ascending: true }), { route: ROUTE, table: 'events' }),
        readAll(() => admin.from('events').select('user_id').eq('name', STAMP).in('user_id', slice).order('user_id', { ascending: true }), { route: ROUTE, table: 'events' }),
        readAll(() => admin.from('videos').select('user_id, title, topic, created_at').eq('status', 'completed').in('user_id', slice).order('created_at', { ascending: false }), { route: ROUTE, table: 'videos' }),
      ])
      for (const r of p ?? []) perfis.set(String(r.id), { email: String(r.email ?? '').toLowerCase(), plan: String(r.plan ?? ''), has_paid: Boolean(r.has_paid), opted_out: Boolean(r.email_opted_out) })
      for (const r of pg ?? []) pagou.add(String(r.user_id))
      for (const r of st ?? []) avisado.add(String(r.user_id))
      for (const r of v ?? []) {
        const id = String(r.user_id)
        const title = String(r.title ?? r.topic ?? '').trim()
        if (!filme.has(id) && title) filme.set(id, title)
      }
    }
    const candidatos = ids
      .map((id) => ({ id, ...(perfis.get(id) ?? { email: '', plan: '', has_paid: false, opted_out: true }) }))
      .filter((a) => a.email && !a.opted_out && !a.has_paid && !PAID_PLANS.has(a.plan) && !isInternalEmail(a.email) && !pagou.has(a.id) && !avisado.has(a.id))
    // A trava de 24 h da casa (lib/lifecycle/suppression.ts): quem recebeu outra carta nossa hoje fica para o próximo lote.
    const supressao = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const alvos = candidatos.filter((c) => !supressao.isSuppressed(c.id))

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: `checkout_started entre ${PRICE_DROP_WINDOW.from} e ${PRICE_DROP_WINDOW.to} · nunca pagou · opt-in · externo · nunca recebeu ${STAMP}`,
        opened_checkout_in_window: ids.length,
        remaining_unemailed: alvos.length,
        suppressed_24h: candidatos.length - alvos.length,
        with_own_film: alvos.filter((a) => filme.has(a.id)).length,
        next_batch_size: Math.min(batch, alvos.length),
        price_lines: lines.map((l) => `${TIER_NAME[l.tier]} ${usd(l.wasCents)} → ${usd(l.nowCents)}`),
        sample: alvos.slice(0, 12).map((a) => a.email),
        hint: 'Append &confirm=SEND (optionally &limit=N, max 40) to send the next batch.',
      })
    }

    let sent = 0
    const results: Array<{ email: string; outcome: string }> = []
    for (const a of alvos.slice(0, batch)) {
      const { text, html } = buildEmail(a.id, lines, filme.get(a.id) ?? null)
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL, to: [a.email], reply_to: REPLY_TO,
            subject: `Kineo just got cheaper: Creator is now ${usd(TIER_PRICES.basic.usd)}`,
            text, html, headers: unsubscribeHeaders(a.id),
          }),
        })
        if (!res.ok) { results.push({ email: a.email, outcome: `resend ${res.status}` }); continue }
        await admin.from('events').insert({ user_id: a.id, name: STAMP, metadata: { campaign: PRICE_DROP_CAMPAIGN, sent_by: adminEmail, with_film: filme.has(a.id), lines: lines.map((l) => ({ tier: l.tier, was: l.wasCents, now: l.nowCents })) } })
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
