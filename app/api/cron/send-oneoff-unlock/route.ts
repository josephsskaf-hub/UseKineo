import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { packPriceLabel, PACK_CREDITS } from '@/lib/checkoutPricing'

// ═══ KINEO-AVULSO-PARA-QUEM-RECUSOU-2026-08-21 ═════════════════════════════
//
// A LISTA: quem chegou no CHECKOUT nos últimos 7 dias, viu o preço e não
// comprou. Medido hoje: 11 pessoas em 72h, duas delas tentaram DUAS vezes, e
// quase todas ainda têm crédito parado na conta. É a lista com a intenção mais
// provada que existe neste banco — não é gente que "talvez se interesse", é
// gente que abriu a carteira e fechou.
//
// POR QUE ISTO NÃO É O CREATOR20 DE NOVO:
// O CREATOR20 mandou 20% de desconto para 34 pessoas frias e deu ZERO — 2
// visitas, 0 vídeos, 0 checkouts, 0 vendas. A lição não foi "e-mail não
// funciona"; foi que DESCONTO não responde a objeção de COMPROMISSO. Quem não
// quis assinar não estava dizendo "$15 é caro", estava dizendo "não sei se vou
// usar isso todo mês".
//
// Aqui a oferta é OUTRO PRODUTO, não outro preço: $4.90, uma vez, sem
// assinatura, e o vídeo que a pessoa JÁ FEZ sai limpo. Isso responde
// exatamente a objeção que ela teve. E o produto não existia quando ela
// desistiu — então não é insistir, é trazer novidade real.
//
// E POR QUE ISSO AJUDA A VENDER ASSINATURA, não atrapalha: quem paga uma vez
// vira cliente com cartão registrado, e cliente que já pagou converte para
// recorrente muito melhor do que quem nunca pagou nada. O $4.90 é a porta,
// não o teto.
//
// ⚠ COMO ISTO É DISPARADO SEM NINGUÉM DIGITAR SEGREDO: o cron da Vercel chama
// esta rota com o CRON_SECRET que a própria plataforma injeta. Mas ela só
// ENVIA se existir a linha de armação no banco (ver ARM_EVENT) — que é
// gravada pelo service_role depois do fundador aprovar. Sem a armação, toda
// passada é DRY-RUN e não sai um único e-mail. Segredo nunca circula, e o
// fundador continua sendo quem dá o ok.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STAMP = 'oneoff_unlock_emailed'
/** A linha que ARMA o disparo. Sem ela, a rota só relata. */
const ARM_EVENT = 'campaign_armed_oneoff_unlock'
const MAX_PER_RUN = 25
const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function isInternalOrJunk(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') || e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') || e.startsWith('test') ||
    e.includes('mailinator') || e.startsWith('smoketest')
  )
}

function buildEmail(userId: string, credits: number, videos: number) {
  const preco = packPriceLabel()
  // Vai direto para o checkout do pacote avulso. `return=wm` faz a volta cair
  // no /generate com o unlock, que é o comportamento verificado do SKU.
  const url = `${APP}/api/stripe/checkout?pack=starter&return=wm&utm_source=lifecycle&utm_medium=email&utm_campaign=oneoff_unlock`
  const verVideos = `${APP}/history?utm_source=lifecycle&utm_medium=email&utm_campaign=oneoff_unlock`

  const text = `Hey,

You looked at Kineo's plans and decided not to subscribe. That is fair — a monthly plan is a commitment, and you had made ${videos === 1 ? 'one video' : `${videos} videos`}, not a habit yet.

So here is something that did not exist when you looked: you can now pay for ONE video instead of a month.

${preco}, one time, no subscription. Your video gets rebuilt without the watermark and you keep ${PACK_CREDITS.starter} credits on top.

Buy just this one: ${url}

Your videos are still here: ${verVideos}
${credits > 0 ? `You also still have ${credits} credits sitting in the account.` : ''}

If a monthly plan makes more sense later, it will be there. No pressure either way.

Joseph
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>You looked at Kineo's plans and decided not to subscribe. That is fair — a monthly plan is a commitment, and you had made ${videos === 1 ? 'one video' : `${videos} videos`}, not a habit yet.</p>
  <p><strong>So here is something that did not exist when you looked:</strong> you can now pay for ONE video instead of a month.</p>
  <p><strong>${preco}, one time, no subscription.</strong> Your video gets rebuilt without the watermark and you keep ${PACK_CREDITS.starter} credits on top.</p>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Buy just this one video — ${preco} →</a></p>
  <p style="font-size:13px;color:#555">Your videos are still <a href="${verVideos}" style="color:#2997ff">right here</a>.${credits > 0 ? ` You also still have <strong>${credits} credits</strong> in the account.` : ''}</p>
  <p>If a monthly plan makes more sense later, it will be there. No pressure either way.</p>
  <p style="margin:0 0 2px">Joseph</p>
  <p style="margin:0"><a href="https://www.usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const resendKey = process.env.RESEND_API_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!resendKey || !url || !svc) return NextResponse.json({ error: 'env missing' }, { status: 503 })

  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

  // Quem viu o preço nos últimos 7 dias. Janela curta de propósito: "você
  // olhou e não assinou" só tem sentido enquanto a memória é fresca.
  const { data: checkouts } = await admin
    .from('events')
    .select('user_id')
    .eq('name', 'checkout_started')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 3600_000).toISOString())
    .limit(500)

  const ids = [...new Set((checkouts ?? []).map((c) => c.user_id as string).filter(Boolean))]
  if (ids.length === 0) return NextResponse.json({ mode: 'DRY_RUN', eligible: 0, note: 'ninguem no checkout em 7d' })

  const [{ data: profs }, { data: stamps }, { data: vids }] = await Promise.all([
    admin.from('profiles').select('id, email, email_opted_out, video_credits, is_pro').in('id', ids),
    admin.from('events').select('user_id').eq('name', STAMP).in('user_id', ids),
    admin.from('videos').select('user_id').eq('status', 'completed').in('user_id', ids),
  ])
  const jaRecebeu = new Set((stamps ?? []).map((s) => s.user_id as string))
  const contagem = new Map<string, number>()
  for (const v of vids ?? []) {
    const u = v.user_id as string
    contagem.set(u, (contagem.get(u) ?? 0) + 1)
  }

  const alvos: Array<{ id: string; email: string; credits: number; videos: number }> = []
  for (const p of profs ?? []) {
    const id = p.id as string
    if (jaRecebeu.has(id)) continue
    // Quem JÁ assinou não recebe: seria oferecer um avulso a quem já tem tudo.
    if (p.is_pro === true) continue
    const email = (p.email ?? '') as string
    if (!email || p.email_opted_out || isInternalOrJunk(email)) continue
    const nVideos = contagem.get(id) ?? 0
    // Sem vídeo feito não há o que desbloquear — a oferta seria sem sentido e a
    // frase "seu vídeo sai limpo" viraria mentira.
    if (nVideos === 0) continue
    alvos.push({ id, email, credits: (p.video_credits as number) ?? 0, videos: nVideos })
  }

  // A ARMAÇÃO. `confirm=SEND` na URL NÃO basta: exige também a linha no banco,
  // gravada só depois da aprovação do fundador. Duas chaves para uma porta que
  // manda e-mail para cliente de verdade.
  const { data: armado } = await admin
    .from('events')
    .select('id')
    .eq('name', ARM_EVENT)
    .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString())
    .limit(1)
  const podeEnviar = req.nextUrl.searchParams.get('confirm') === 'SEND' && (armado?.length ?? 0) > 0

  if (!podeEnviar) {
    return NextResponse.json({
      mode: 'DRY_RUN',
      cohort: 'viu o preco em 7d · nunca assinou · tem pelo menos 1 video · nunca recebeu esta campanha',
      eligible: alvos.length,
      armed: (armado?.length ?? 0) > 0,
      sample: alvos.slice(0, 20).map((a) => `${a.email} (${a.videos} video(s) · ${a.credits}cr)`),
      hint: 'precisa de confirm=SEND E da linha de armacao no banco',
    })
  }

  let sent = 0
  const results: Array<{ email: string; outcome: string }> = []
  for (const a of alvos.slice(0, MAX_PER_RUN)) {
    const { text, html } = buildEmail(a.id, a.credits, a.videos)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Joseph at Kineo <joseph@usekineo.com>',
          to: [a.email],
          reply_to: 'joseph@usekineo.com',
          subject: `Pay for one video instead of a month (${packPriceLabel()})`,
          text,
          html,
          headers: unsubscribeHeaders(a.id),
        }),
      })
      if (res.ok) {
        await admin.from('events').insert({
          user_id: a.id,
          name: STAMP,
          metadata: { credits: a.credits, videos: a.videos },
        })
        sent++
        results.push({ email: a.email, outcome: 'sent' })
      } else results.push({ email: a.email, outcome: `failed_${res.status}` })
    } catch {
      results.push({ email: a.email, outcome: 'threw' })
    }
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`[oneoff-unlock] sent=${sent} of ${alvos.length}`)
  return NextResponse.json({ mode: 'SENT', sent, eligible: alvos.length, results })
}
