// KINEO-COMEBACK50-2026-08-04 — ORDEM I do fundador (04/08): trazer de volta a
// coorte mais QUALIFICADA do banco que nunca pagou.
//
// QUEM ENTRA (montado ao vivo do banco, nunca lista chumbada):
//   não pagante, não opt-out, e-mail externo válido, e
//     (a) >= 3 downloads de vídeo  — provou valor repetidas vezes, OU
//     (b) tem stripe_customer_id E >= 1 vídeo concluído — chegou ao cartão.
//   Em 04/08 isso dá 19 pessoas reais (21 menos 2 domínios descartáveis).
//
// POR QUE ESTA COORTE E NÃO A OUTRA (medição de 04/08, REGRA ZERO):
//   A Ordem I também citava "39 com stripe_customer_id e ZERO vídeos" para um
//   e-mail de ativação SEM preço. Medido: são 35, e 18 deles JÁ receberam o
//   activation nudge e 5 o video-rescue. Mandar um terceiro e-mail de ativação
//   genérico para quem ignorou os dois anteriores é volume, não resultado —
//   fica registrado no doc da sprint em vez de virar disparo.
//
// GATE DO FUNDADOR, IMPOSTO EM CÓDIGO: o e-mail promete 50% off com o código
// COMEBACK50. Se o promotion code não existir/estiver inativo na Stripe, o
// checkout simplesmente IGNORA o promo (app/api/stripe/checkout/route.ts:1042
// só faz console.warn) — ou seja, a pessoa chegaria no preço cheio depois de
// ler uma promessa de desconto. Por isso o preflight abaixo devolve 409 com o
// passo a passo e NÃO manda nada enquanto o cupom não existir.
//
// PREÇO: nenhum número de preço vive neste arquivo (regra permanente do repo —
// fonte única é lib/checkoutPricing.ts). O e-mail aponta para /pricing com o
// promo aplicado e deixa a página dizer os valores.
//
// MODOS (GET, admin-gated):
//   (sem params)           → DRY RUN: coorte, contagem, amostra, estado do cupom.
//   ?confirm=SEND&limit=N  → envia o próximo lote (default 25), pacing 700ms,
//                            marcando a flag só no sucesso.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'

const PROMO_CODE = 'COMEBACK50'
const CTA_URL = `https://usekineo.com/pricing?promo=${PROMO_CODE}&utm_source=comeback50`

// Passo a passo exato pedido pelo fundador na Ordem I — devolvido pelo preflight
// quando o cupom ainda não existe, para o clique ser de 2 minutos.
const COUPON_SETUP_STEPS = [
  'Stripe Dashboard → Product catalogue → Coupons → "+ New"',
  'Percentage discount = 50% · Duration = "Multiple months" → 3 months',
  'Apply to specific products: SÓ Creator e Studio (NUNCA o Starter — o preço de entrada não cobre inferência)',
  'Save → abrir o cupom → "Promotion codes" → "+ New" → Code: COMEBACK50 → Create',
  'Voltar aqui e rodar de novo: /api/admin/send-comeback50 (dry run) e depois &confirm=SEND',
]

const SUBJECT = "You made real videos with Kineo — here's 50% off to keep going"

const DISPOSABLE_DOMAINS = new Set([
  'yopmail.com', 'gmeenramy.com', 'kinws.com', 'doefy.com', 'x-box.in',
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', 'tempmail.com',
  '10minutemail.com', 'trashmail.com', 'getnada.com', 'dispostable.com',
  'maildrop.cc', 'mohmal.com', 'temp-mail.org', 'fakeinbox.com',
  'minitts.net', 'dysonc.com',
])

const RAMON = 'ramonwilliamson@gmail.com'

function isInternal(email: string): boolean {
  if (email === RAMON) return true
  if (ADMIN_EMAILS.has(email)) return true
  if (email.startsWith('josephsskaf') || email.startsWith('josephskaf')) return true
  if (email.startsWith('joseph+') || email.startsWith('joseph-')) return true
  if (email === 'victoriaskaf96@gmail.com') return true
  const dom = email.split('@')[1] ?? ''
  if (dom === 'shortsforgeai.com' || dom === 'usekineo.com' || dom === 'theresanaiforthat.com') return true
  return false
}

const PAID_PLANS = new Set(['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial'])

function isValidExternalEmail(email: string): boolean {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return false
  if (email.includes('example.com') || email.startsWith('test@') || email.startsWith('smoketest')) return false
  const dom = email.split('@')[1] ?? ''
  if (DISPOSABLE_DOMAINS.has(dom)) return false
  if (isInternal(email)) return false
  return true
}

const FLAG_COLUMN = 'comeback50_emailed'
const FLAG_MIGRATION_SQL =
  'alter table public.profiles add column if not exists comeback50_emailed boolean not null default false;'

/** Fala do que a PESSOA fez, não do que o sistema registrou. */
function evidenceLine(videos: number, downloads: number): string {
  if (downloads >= 3 && videos >= 2) {
    return `You've finished ${videos} videos with Kineo and downloaded ${downloads} of them.`
  }
  if (downloads >= 3) return `You've downloaded ${downloads} videos you made with Kineo.`
  if (videos >= 2) return `You've finished ${videos} videos with Kineo.`
  return 'You got a finished video out of Kineo and went as far as the checkout.'
}

function emailText(videos: number, downloads: number, userId: string): string {
  return `Hey — Joseph here, founder of Kineo.

${evidenceLine(videos, downloads)} That puts you in the small group of people who actually got the thing to work — and you're still on the free plan, which means the watermark is still on your exports.

So here's a straight offer: 50% off Creator or Studio for 3 months, code COMEBACK50, applied automatically here:

${CTA_URL}

If you're posting more than a couple of Shorts a week, Studio is the one — it's the plan built for volume, and at half price for three months it's the cheapest it will ever be.

Month to month. Cancel any time, no email to me required.

Reply to this and you get me, not a helpdesk.

— Joseph, founder
Kineo · https://usekineo.com${emailFooterText(userId)}`
}

function emailHtml(videos: number, downloads: number, userId: string): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p>Hey — Joseph here, founder of <b>Kineo</b> 🎬</p>
  <p>${evidenceLine(videos, downloads)} That puts you in the small group of people who actually got the thing to work — and you're still on the free plan, which means the watermark is still on your exports.</p>
  <p style="font-size:18px;margin:18px 0"><b>So here's a straight offer: 50% off Creator or Studio for 3 months.</b> Code <b>COMEBACK50</b>, applied automatically:</p>
  <p style="margin:26px 0">
    <a href="${CTA_URL}" style="background:#2997ff;color:#ffffff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">Claim 50% off &rarr;</a>
  </p>
  <p style="color:#475569;font-size:14px">If you're posting more than a couple of Shorts a week, <b>Studio</b> is the one — it's the plan built for volume, and at half price for three months it's the cheapest it will ever be.</p>
  <p style="color:#475569;font-size:14px">Month to month. Cancel any time, no email to me required.</p>
  <p style="color:#475569;font-size:14px">Reply to this and you get me, not a helpdesk.</p>
  <p>— Joseph, founder<br/>Kineo · <a href="https://usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

type AdminDb = ReturnType<typeof adminClient>

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** downloads por usuário (paginado — PostgREST corta em 1000 linhas). */
async function downloadCounts(admin: AdminDb): Promise<{ counts: Map<string, number>; error?: string }> {
  const counts = new Map<string, number>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('events')
      .select('user_id')
      .eq('name', 'video_downloaded')
      .not('user_id', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) return { counts, error: error.message }
    const rows = (data ?? []) as Array<{ user_id: string | null }>
    for (const r of rows) if (r.user_id) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1)
    if (rows.length < PAGE) break
    if (from > 200_000) break
  }
  return { counts }
}

/** vídeos concluídos por usuário (paginado). */
async function completedVideoCounts(admin: AdminDb): Promise<{ counts: Map<string, number>; error?: string }> {
  const counts = new Map<string, number>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('videos')
      .select('user_id')
      .eq('status', 'completed')
      .not('user_id', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) return { counts, error: error.message }
    const rows = (data ?? []) as Array<{ user_id: string | null }>
    for (const r of rows) if (r.user_id) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1)
    if (rows.length < PAGE) break
    if (from > 200_000) break
  }
  return { counts }
}

/** O cupom existe e está ativo? Sem isso o e-mail promete o que o checkout não entrega. */
async function promoIsLive(): Promise<{ live: boolean; detail: string }> {
  if (!process.env.STRIPE_SECRET_KEY) return { live: false, detail: 'STRIPE_SECRET_KEY not configured' }
  try {
    const list = await stripe.promotionCodes.list({ code: PROMO_CODE, active: true, limit: 1 })
    const pc = list.data[0]
    if (!pc) return { live: false, detail: `no active promotion code named ${PROMO_CODE}` }
    return { live: true, detail: `promotion_code ${pc.id} active` }
  } catch (e) {
    return { live: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = (user?.email ?? '').toLowerCase()
    if (!user || !ADMIN_EMAILS.has(email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Service credentials not configured' }, { status: 500 })
    }

    const admin = adminClient()

    // 0) Preflight da coluna de idempotência.
    {
      const { error: flagErr } = await admin.from('profiles').select(`id, ${FLAG_COLUMN}`).limit(1)
      if (flagErr) {
        return NextResponse.json(
          {
            error: `Idempotency column profiles.${FLAG_COLUMN} is missing — refusing to send.`,
            detail: flagErr.message,
            fix_sql: FLAG_MIGRATION_SQL,
          },
          { status: 500 },
        )
      }
    }

    const dl = await downloadCounts(admin)
    if (dl.error) return NextResponse.json({ error: `download events query failed: ${dl.error}` }, { status: 500 })
    const vids = await completedVideoCounts(admin)
    if (vids.error) return NextResponse.json({ error: `videos query failed: ${vids.error}` }, { status: 500 })

    // Candidatos: quem tem >=3 downloads OU >=1 vídeo concluído. O filtro de
    // stripe_customer_id entra depois, com o perfil na mão.
    const candidateIds = new Set<string>()
    for (const [id, n] of dl.counts) if (n >= 3) candidateIds.add(id)
    for (const [id, n] of vids.counts) if (n >= 1) candidateIds.add(id)

    type Row = {
      id: string
      email: string | null
      plan: string | null
      is_pro: boolean | null
      has_paid: boolean | null
      stripe_customer_id: string | null
    }

    const rows: Row[] = []
    for (const ids of chunk(Array.from(candidateIds), 200)) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, plan, is_pro, has_paid, stripe_customer_id')
        .in('id', ids)
        .eq('has_paid', false)
        .eq(FLAG_COLUMN, false)
        .eq('email_opted_out', false)
      if (error) return NextResponse.json({ error: `profiles query failed: ${error.message}` }, { status: 500 })
      rows.push(...((data ?? []) as Row[]))
    }

    const seen = new Set<string>()
    const recipients = rows
      .map((row) => ({
        id: row.id,
        email: (row.email ?? '').trim().toLowerCase(),
        plan: (row.plan ?? '').toLowerCase(),
        is_pro: !!row.is_pro,
        has_paid: !!row.has_paid,
        hasStripe: !!row.stripe_customer_id,
        videos: vids.counts.get(row.id) ?? 0,
        downloads: dl.counts.get(row.id) ?? 0,
      }))
      .filter((r) => !r.has_paid && !r.is_pro && !PAID_PLANS.has(r.plan))
      // A regra da Ordem I: 3+ downloads, OU cartão iniciado com pelo menos 1 vídeo.
      .filter((r) => r.downloads >= 3 || (r.hasStripe && r.videos >= 1))
      .filter((r) => isValidExternalEmail(r.email))
      .filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)))
      // Mais provas primeiro — se um lote for cortado, corta pelo fim.
      .sort((a, b) => b.downloads - a.downloads || b.videos - a.videos)

    const promo = await promoIsLive()
    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batchSize = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 25

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: '>=3 downloads OR (stripe_customer_id AND >=1 completed video), unpaid, opted-in, external',
        remaining_unemailed: recipients.length,
        next_batch_size: Math.min(batchSize, recipients.length),
        promo_code: PROMO_CODE,
        promo_live: promo.live,
        promo_detail: promo.detail,
        coupon_setup_steps: promo.live ? undefined : COUPON_SETUP_STEPS,
        sample: recipients.slice(0, 10).map((r) => `${r.email} (${r.videos}v/${r.downloads}d)`),
        subject: SUBJECT,
        from: FROM_EMAIL,
        hint: promo.live
          ? 'Append &confirm=SEND (optionally &limit=N) to send.'
          : 'Create the COMEBACK50 promotion code in Stripe first — sending is blocked until it is live.',
      })
    }

    // GATE DURO: sem cupom vivo, nenhum e-mail sai. O texto promete 50% off e a
    // rota de checkout ignora promo inexistente em silêncio — a pessoa cairia no
    // preço cheio depois de ler a promessa. Isso queima a lista inteira de uma vez.
    if (!promo.live) {
      return NextResponse.json(
        {
          error: `Refusing to send: ${PROMO_CODE} is not a live Stripe promotion code.`,
          detail: promo.detail,
          why: 'The email promises 50% off. app/api/stripe/checkout ignores an unknown promo silently, so recipients would land on full price after reading the promise.',
          coupon_setup_steps: COUPON_SETUP_STEPS,
        },
        { status: 409 },
      )
    }

    const batch = recipients.slice(0, batchSize)
    const results: Array<{ email: string; outcome: string }> = []
    let sent = 0
    let failed = 0
    for (const r of batch) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [r.email],
            reply_to: REPLY_TO,
            subject: SUBJECT,
            text: emailText(r.videos, r.downloads, r.id),
            html: emailHtml(r.videos, r.downloads, r.id),
            headers: unsubscribeHeaders(r.id),
          }),
        })
        if (res.ok) {
          sent += 1
          results.push({ email: r.email, outcome: 'sent' })
          await admin.from('profiles').update({ [FLAG_COLUMN]: true }).eq('id', r.id)
          await admin.from('events').insert({ user_id: r.id, name: 'comeback50_sent', metadata: { videos: r.videos, downloads: r.downloads } })
        } else {
          failed += 1
          results.push({ email: r.email, outcome: 'failed' })
          console.error(`[comeback50] resend failed for ${r.email}:`, await res.text())
        }
      } catch (e) {
        failed += 1
        results.push({ email: r.email, outcome: 'failed' })
        console.error(`[comeback50] send threw for ${r.email}:`, e instanceof Error ? e.message : String(e))
      }
      await new Promise((res) => setTimeout(res, 700))
    }

    console.log(`[comeback50] batch done: sent=${sent} failed=${failed}`)
    return NextResponse.json({
      mode: 'SENT',
      sent,
      failed,
      batch_size: batch.length,
      remaining_after_batch: Math.max(0, recipients.length - batch.length),
      results,
    })
  } catch (err) {
    console.error('[comeback50] unexpected:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
