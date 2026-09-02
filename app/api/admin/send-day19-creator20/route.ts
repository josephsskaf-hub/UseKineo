// KINEO-DAY19-CREATOR20-2026-08-20 — a coorte do dia 19 recebe 20% no Creator.
//
// Pedido do fundador (madrugada de 20/08): "pega todas as pessoas que usaram
// ou entraram no site no dia 19, que fizeram vídeo, viram preço, todas — e
// amanhã de manhã mandamos um e-mail com cupom de 20% somente para o plano
// Creator, valendo o primeiro mês".
//
// POR QUE O DIA 19 MERECE CAMPANHA PRÓPRIA: foi o dia em que o preço virou
// V6 ($15 no Creator), o H3 entrou e a vitrine parou de falar duas moedas.
// Quem visitou dia 19 viu o produto no melhor estado que ele já teve — e
// 201 pessoas ativas produziram ZERO vendas. O cupom é o segundo toque em
// cima da memória ainda fresca.
//
// O CUPOM: CREATOR20 — 20% só na 1ª fatura, SÓ Creator mensal. O gate vive em
// código no /api/stripe/checkout (KINEO-CREATOR20-2026-08-20): Starter,
// Studio e anual são recusados lá, então nem um link adulterado fura a regra.
// Auto-provisionado na Stripe no primeiro uso — o e-mail nunca promete cupom
// que não existe. $15 − 20% = $12 no primeiro mês; margem pior-caso do
// Creator segue positiva (net $11.35 vs COGS $9.86).
//
// ⚠️ SOBREPOSIÇÃO COM AS CAMPANHAS DE ONTEM À NOITE, dita na cara: 69 pessoas
// da coorte receberam e-mail há ~12h (resgate de checkout / fez-vídeo-hoje).
// Mandar um TERCEIRO e-mail comercial em menos de um dia pra essas é o jeito
// mais rápido de virar spam pra lista mais quente que temos. Por default a
// rota EXCLUI quem foi tocado nas últimas 24h; `?include_recent=1` desliga a
// exclusão se o fundador quiser mesmo todas. O dry-run mostra os dois números
// para a decisão ser dele, com o trade-off visível.
//
// Padrão da casa: admin-gated, DRY RUN default, ?confirm=SEND&limit=N,
// pacing 600ms, carimbo day19_creator20_emailed_v1 só no sucesso.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'

export const maxDuration = 300
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

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const SENT_EVENT = 'day19_creator20_emailed_v1'
// KINEO-DAY19-V2-2026-08-20 — decisão do fundador ao revisar: "só vou mandar
// para aquelas que não receberam NADA ainda". A exclusão deixou de ser
// janela de 24h e virou HISTÓRICO COMPLETO de campanha de marketing —
// qualquer pessoa com qualquer um destes carimbos fica fora, não importa
// quando recebeu. A lista veio do BANCO (select dos eventos *emailed*/*sent*
// reais), não do código — carimbo antigo de rota já apagada continua
// valendo como "já recebeu".
// E-mails FUNCIONAIS ficam de fora da exclusão de propósito:
// trial_lifecycle_email_sent (783 envios — excluiria a base inteira),
// video_rescue/credits_back/cap_hit/stranded_rescue são notificação de
// produto, não campanha. "Não recebeu nada" = nada de MARKETING.
const MARKETING_STAMPS = [
  'checkout_rescue_emailed_v1',
  'made_video_today_emailed_v1',
  'india_price_emailed_v1',
  'hotlead_emailed_v1',
  'hotlead_emailed_v2',
  'comeback50_sent',
  'blackout_winback_sent',
  'hot_upsell_sent',
  'post_nudge_sent',
]

// Dia 19 em BRT (UTC−3): 19/08 03:00 UTC → 20/08 03:00 UTC.
const DAY19_START = '2026-08-19T03:00:00Z'
const DAY19_END = '2026-08-20T03:00:00Z'

const CTA_URL = 'https://usekineo.com/pricing?promo=CREATOR20&utm_source=day19creator20'

const DISPOSABLE = ['mailinator', 'yopmail', 'tempmail', 'hutdot.com', 'beiwoh.com', 'playboot.com', 'skyprofy.com', 'gouziben.com', 'joystill.com', 'luhupo.com', 'lanvos.com', 'minitts.net', 'dysonc.com', 'guerrillamail', 'sharklasers', 'getnada', 'maildrop', 'trashmail', '10minutemail', 'dispostable', 'fakeinbox', 'temp-mail']
function isJunk(email: string): boolean {
  const e = email.toLowerCase()
  if (e.startsWith('josephsskaf') || e.startsWith('josephskaf') || e.endsWith('@shortsforgeai.com') || e.startsWith('test')) return true
  return DISPOSABLE.some((d) => e.includes(d))
}

const creatorPrice = () => formatCheckoutMoney('usd', TIER_PRICES.basic.usd)
const creatorOff = () => formatCheckoutMoney('usd', Math.round(TIER_PRICES.basic.usd * 0.8))

const SUBJECT = 'Yesterday you tried Kineo — here is 20% off Creator'

function emailText(videos: number, userId: string): string {
  const made = videos > 0
    ? `You made ${videos === 1 ? 'a video' : `${videos} videos`} — so you already know what comes out of it.`
    : `You looked around, checked the price, and left without trying to buy. Fair enough.`
  return `Hey — Joseph here, founder of Kineo.

You were on Kineo yesterday. ${made}

So here is a simple, one-time nudge: 20% off your first month of Creator. That is ${creatorOff()} instead of ${creatorPrice()}, for ${TIER_CREDITS.basic} credits — enough for ${Math.floor(TIER_CREDITS.basic / 45)} cinematic films or ${Math.floor(TIER_CREDITS.basic / 20)} AI videos, with voice, captions and soundtrack done for you.

Code CREATOR20, applied automatically here:
${CTA_URL}

It works on the Creator monthly plan only, first invoice only. After that it renews at the normal ${creatorPrice()}/month, and you can cancel anytime.

And if something yesterday put you off — the result, the price, anything — reply and tell me. It lands with me, not a helpdesk.

— Joseph, founder
Kineo · https://usekineo.com${emailFooterText(userId)}`
}

function emailHtml(videos: number, userId: string): string {
  const made = videos > 0
    ? `You made ${videos === 1 ? 'a video' : `<b>${videos} videos</b>`} — so you already know what comes out of it.`
    : `You looked around, checked the price, and left without trying to buy. Fair enough.`
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p>Hey — Joseph here, founder of <b>Kineo</b> 🎬</p>
  <p>You were on Kineo yesterday. ${made}</p>
  <p>So here is a simple, one-time nudge: <b>20% off your first month of Creator</b>. That is <b>${creatorOff()}</b> instead of ${creatorPrice()}, for ${TIER_CREDITS.basic} credits — enough for ${Math.floor(TIER_CREDITS.basic / 45)} cinematic films or ${Math.floor(TIER_CREDITS.basic / 20)} AI videos, with voice, captions and soundtrack done for you.</p>
  <p style="margin:26px 0">
    <a href="${CTA_URL}" style="background:#2997ff;color:#ffffff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">Get Creator — ${creatorOff()} first month &rarr;</a>
  </p>
  <p style="color:#475569;font-size:14px">Code <b>CREATOR20</b>, applied automatically. Creator monthly only, first invoice only — then it renews at the normal ${creatorPrice()}/month. Cancel anytime.</p>
  <p style="color:#475569;font-size:14px">And if something yesterday put you off — the result, the price, anything — reply and tell me. It lands with me, not a helpdesk.</p>
  <p>— Joseph, founder<br/>Kineo · <a href="https://usekineo.com" style="color:#2997ff">usekineo.com</a></p>
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

    // Quem esteve no site no dia 19 (qualquer evento logado).
    const { data: dayRows, error: dayErr } = await admin
      .from('events').select('user_id')
      .gte('created_at', DAY19_START).lt('created_at', DAY19_END)
      .not('user_id', 'is', null)
      .limit(60000)
    if (dayErr) return NextResponse.json({ error: dayErr.message }, { status: 500 })
    const ids = [...new Set((dayRows ?? []).map((r) => (r as { user_id: string }).user_id))]
    if (ids.length === 0) return NextResponse.json({ mode: 'DRY_RUN', remaining_unemailed: 0 })

    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += 300) chunks.push(ids.slice(i, i + 300))

    const profiles: Array<{ id: string; email: string; email_opted_out: boolean | null; has_paid: boolean | null; plan: string | null }> = []
    const videoCounts = new Map<string, number>()
    const recentlyMailed = new Set<string>()
    const alreadySent = new Set<string>()

    for (const chunk of chunks) {
      const [p, v, m, s2] = await Promise.all([
        admin.from('profiles').select('id, email, email_opted_out, has_paid, plan').in('id', chunk),
        admin.from('videos').select('user_id').in('user_id', chunk).limit(10000),
        admin.from('events').select('user_id').in('user_id', chunk).in('name', MARKETING_STAMPS),
        admin.from('events').select('user_id').in('user_id', chunk).eq('name', SENT_EVENT),
      ])
      for (const row of p.data ?? []) profiles.push(row as (typeof profiles)[number])
      for (const row of v.data ?? []) {
        const uid = (row as { user_id: string }).user_id
        videoCounts.set(uid, (videoCounts.get(uid) ?? 0) + 1)
      }
      for (const row of m.data ?? []) recentlyMailed.add((row as { user_id: string }).user_id)
      for (const row of s2.data ?? []) alreadySent.add((row as { user_id: string }).user_id)
    }

    // include_recent continua existindo como interruptor de emergência, mas o
    // default agora reflete a ordem: quem já recebeu marketing NÃO entra.
    const includeRecent = req.nextUrl.searchParams.get('include_recent') === '1'
    const PAID = new Set(['starter', 'basic', 'pro', 'autopilot'])
    const recipients = profiles
      .filter((p) => {
        if (!p.email || p.email_opted_out || p.has_paid === true) return false
        if (PAID.has((p.plan ?? '').toLowerCase())) return false
        if (isJunk(p.email)) return false
        if (alreadySent.has(p.id)) return false
        if (!includeRecent && recentlyMailed.has(p.id)) return false
        return true
      })
      .map((p) => ({ id: p.id, email: p.email, videos: videoCounts.get(p.id) ?? 0 }))
      .sort((a, b) => b.videos - a.videos)

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batchSize = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 250) : 250

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: `esteve no site no dia 19 (BRT) · não pagou · e-mail real${includeRecent ? '' : ' · NUNCA recebeu campanha de marketing'}`,
        remaining_unemailed: recipients.length,
        excluded_for_recent_campaign: includeRecent ? 0 : [...recentlyMailed].filter((id) => !alreadySent.has(id)).length,
        note_sobreposicao: includeRecent
          ? '⚠ include_recent=1: pessoas que JÁ receberam campanha vão receber esta também.'
          : 'Só quem NUNCA recebeu campanha de marketing (decisão do fundador, 20/08).',
        fizeram_video: recipients.filter((r) => r.videos > 0).length,
        subject: SUBJECT,
        coupon: 'CREATOR20 · 20% · 1ª fatura · SÓ Creator mensal (gate em código no checkout)',
        preco: `${creatorOff()} no 1º mês (normal ${creatorPrice()})`,
        sample: recipients.slice(0, 12).map((r) => `${r.email} (${r.videos}v)`),
        from: FROM_EMAIL,
        hint: 'Append &confirm=SEND (optionally &limit=N, &include_recent=1) to send.',
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
    return NextResponse.json({ mode: 'SENT', sent, failed, remaining_after_batch: recipients.length - batch.length, results: results.slice(0, 60) })
  } catch (e) {
    console.error('[send-day19-creator20] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
