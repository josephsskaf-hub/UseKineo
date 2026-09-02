import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'

// ═══ KINEO-TRIAL-VESPERA-2026-08-20 — O AVISO DA VÉSPERA (dia 6) ═════════
//
// Pedido do fundador ao fechar o modelo do trial pago: "no sexto dia a gente
// avisa que, caso a pessoa não cancele, ela vai ser cobrada".
//
// POR QUE UM CRON E NÃO SÓ O STRIPE: o evento `customer.subscription.
// trial_will_end` dispara SEMPRE 3 dias antes — num trial de 7 dias isso cai
// no dia 4, cedo demais para servir de véspera. Os dois avisos ficam de pé e
// são complementares: o do dia 4 dá tempo de decidir com calma; este, na
// véspera, é o que torna impossível a frase "fui cobrado sem saber".
//
// ISTO NÃO É MARKETING, É INFRAESTRUTURA. Trial que cobra de surpresa vira
// contestação de cartão, e contestação em volume derruba a conta Stripe
// inteira — ou seja, mataria o produto, não só a campanha. Duas mensagens
// honestas custam muito menos que uma contestação. Por isso o texto não tem
// venda nenhuma: data, valor, e como cancelar. Quem vai ficar não precisa ser
// convencido de novo; quem vai sair merece sair sem raiva da marca.
//
// Guard rails: CRON_SECRET fail-closed · pula quem já cancelou (não se
// incomoda quem já decidiu) · 1× por trial (marcador `trial_eve_notice_sent`,
// janela de 20 dias) · respeita opt-out · pacing de 400ms.
export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const STAMP = 'trial_eve_notice_sent'
const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // fail-closed: env sumida não abre endpoint de e-mail
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const resendKey = process.env.RESEND_API_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!resendKey || !url || !svc) return NextResponse.json({ error: 'env missing' }, { status: 503 })

  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
  const now = Math.floor(Date.now() / 1000)

  const subs = await stripe.subscriptions.list({ status: 'trialing', limit: 100 })

  let sent = 0
  const results: Array<{ email: string; outcome: string }> = []
  for (const sub of subs.data) {
    const trialEnd = sub.trial_end ?? 0
    const horasRestantes = (trialEnd - now) / 3600
    // A janela da véspera. 36h de teto para o cron diário nunca deixar
    // ninguém passar batido entre duas execuções.
    if (horasRestantes <= 0 || horasRestantes > 36) continue
    if (sub.cancel_at_period_end) continue
    const userId = sub.metadata?.supabase_user_id
    if (!userId) continue

    const { data: jaAvisado } = await admin
      .from('events')
      .select('id')
      .eq('name', STAMP)
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 20 * 24 * 3600_000).toISOString())
      .maybeSingle()
    if (jaAvisado) continue

    const { data: prof } = await admin
      .from('profiles')
      .select('email, email_opted_out, video_credits')
      .eq('id', userId)
      .maybeSingle()
    const to = (prof?.email ?? '') as string
    if (!to || prof?.email_opted_out) continue

    const valor = ((sub.items.data[0]?.price?.unit_amount ?? 1500) / 100).toFixed(2)
    const saldo = (prof?.video_credits as number) ?? 0
    const quando = new Date(trialEnd * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    const conta = `${APP}/account`

    const text = `Hey,

Your Kineo trial ends tomorrow (${quando}).

Unless you cancel before then, your card will be charged $${valor} and your Creator plan starts — your credits refresh and everything keeps working.${saldo > 0 ? `\n\nYou still have ${saldo} credits left, and they stay with you.` : ''}

Want to stop? Cancel in one click here and you will not be charged: ${conta}

No hard feelings either way. If something did not work for you, hit reply and tell me — it lands with a real person.

Kineo Team
usekineo.com`

    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>Your Kineo trial <strong>ends tomorrow (${quando})</strong>.</p>
  <p>Unless you cancel before then, your card will be charged <strong>$${valor}</strong> and your Creator plan starts — your credits refresh and everything keeps working.${saldo > 0 ? ` You still have <strong>${saldo} credits</strong> left, and they stay with you.` : ''}</p>
  <p>Want to stop? <a href="${conta}" style="color:#2997ff">Cancel in one click here</a> and you will not be charged.</p>
  <p>No hard feelings either way. If something did not work for you, hit reply and tell me — it lands with a real person.</p>
  <p style="margin:0 0 2px">Kineo Team</p>
  <p style="margin:0"><a href="https://www.usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Kineo Team <hello@usekineo.com>',
          to: [to],
          reply_to: 'hello@usekineo.com',
          subject: `Your trial ends tomorrow — $${valor} unless you cancel`,
          text: `${text}${emailFooterText(userId)}`,
          html,
          headers: unsubscribeHeaders(userId),
        }),
      })
      if (res.ok) {
        await admin.from('events').insert({
          user_id: userId,
          name: STAMP,
          metadata: { amount: valor, trial_end: trialEnd },
        })
        sent++
        results.push({ email: to, outcome: 'sent' })
      } else {
        results.push({ email: to, outcome: `failed_${res.status}` })
      }
    } catch {
      results.push({ email: to, outcome: 'threw' })
    }
    await new Promise((r) => setTimeout(r, 400))
  }

  console.log(`[trial-eve] sent=${sent} de ${subs.data.length} trials em curso`)
  return NextResponse.json({ sent, trials_checked: subs.data.length, results })
}
