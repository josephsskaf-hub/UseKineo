import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
// KINEO-EMAIL-AUDIT-2026-07-31 — o e-mail prometia "25 more Shorts for $4.90";
// o pack starter concede 30 créditos (lib/checkoutPricing.ts PACK_CREDITS).
// Era o ÚNICO claim falso vivo nos 4 templates de lifecycle (a auditoria
// completa está em docs/SPRINT-2026-07-30.md, sessão 31/07-B). Subestimava a
// oferta — mentira "boa", mas mentira: quem compra recebe 30 e foi induzido a
// decidir com 25. Agora o número vem da fonte única de preço e não pode
// derivar de novo. Este era o último bloqueio TÉCNICO antes do flag
// KINEO_LIFECYCLE_EMAILS_ENABLED (a supressão cruzada de 24h já está ligada
// nos 4 crons + 2 rotas admin desde 27/07) — a decisão de virar segue sendo
// exclusivamente do fundador.
import { PACK_CREDITS } from '@/lib/checkoutPricing'

// send-video-rescue — #477
//
// The warmest leak in the funnel: users who CREATED a video (felt the "wow")
// but never paid. From the 30-day funnel ~76 activate and only ~5 pay — that's
// ~71 people who proved intent and walked. This cron emails them once, a day
// after their last Short, with the founding 50%-off offer AND the $4.90 Starter
// Pack (low-commitment) so the hardest step (first payment) is easy to take.
//
// Guard rails:
//   - max 1 rescue email per user, ever (profiles.video_rescue_sent_at)
//   - must have >=1 video AND latest video >= 24h ago (don't email mid-session)
//   - skips paid plans and founder/test accounts
//   - skips users in checkout_abandoned (they're owned by send-recovery, so we
//     never double-email the same person)
//   - caps sends per run so the historical backlog drips out over a day or two

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const LIFECYCLE_EMAILS_ENABLED = process.env.KINEO_LIFECYCLE_EMAILS_ENABLED === 'true'
// Joseph's rule: lead-nurture goes out as the TEAM from hello@ (support@ = support only).
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const PAID_PLANS = new Set(['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial'])
const MAX_PER_RUN = 60
const DAY_MS = 24 * 60 * 60 * 1000

function isTestEmail(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') ||
    e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') ||
    e.startsWith('test') ||
    e.includes('mailinator') ||
    e.startsWith('smoketest')
  )
}

// KINEO-CRON-FAILCLOSED-2026-07-27 — era `if (!cronSecret) return true`.
// Endpoint que dispara e-mail não fica público porque uma env sumiu. Padrão de
// referência: app/api/cron/autopilot-generate/route.ts:78.
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

// KINEO-UNSUBSCRIBE-2026-07-26 — recebe userId para o rodapé de descadastro.
function buildEmail(userId: string) {
  const upgradeUrl = `${APP_URL}/pricing?promo=FOUNDING50`
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — never put /api/stripe/checkout in an
  // email. Corporate mail scanners follow every link, which minted Checkout
  // Sessions nobody clicked and polluted the abandoned-checkout numbers. Same
  // repoint already applied to send-abandon-recovery and send-free-upsell.
  const packUrl = `${APP_URL}/pricing?promo=FOUNDING50&intent_campaign=video_rescue_pack`
  const makeUrl = `${APP_URL}/generate`
  const text = `Hey,

This is the Kineo team.

You already did the hard part — you generated a real Short with AI: script, voiceover, captions and footage, all automatic. Nice work.

If you want to keep posting without the hassle, two easy ways to keep going:

- Founding offer: 50% off your first month. Cancel anytime, 7-day money-back: ${upgradeUrl}
- Not ready for a subscription? Grab ${PACK_CREDITS.starter} more Shorts for $4.90, one-time (no plan): ${packUrl}

Or just make another one right now: ${makeUrl}

If something got in the way — price, an idea that didn't land, anything — just reply. A real person reads every message.

Kineo Team
usekineo.com`

  const html =
    text
      .split('\n')
      .map((line) =>
        line.trim() === ''
          ? '<br/>'
          : `<p style="margin:0 0 2px;font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.55;">${line.replace(
              /(https?:\/\/[^\s]+)/g,
              (m) => `<a href="${m}" style="color:#2997ff;font-weight:bold;">${m}</a>`
            )}</p>`
      )
      .join('') + emailFooterHtml(userId)

  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // KINEO-RECOVERY-2026-07-15 — outbound is paused by default while the
  // founder-approved four-person micro-test is measured. This legacy sequence
  // still contains retired offers and had repeated a recipient across days.
  if (!LIFECYCLE_EMAILS_ENABLED) {
    return NextResponse.json({ paused: true, sent: 0, reason: 'lifecycle_email_gate' })
  }
  if (!RESEND_API_KEY) {
    console.error('[send-video-rescue] RESEND_API_KEY not set')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service env missing' }, { status: 500 })
  }
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Un-rescued profiles (dedupe via video_rescue_sent_at).
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, plan, is_pro, video_rescue_sent_at')
    .is('video_rescue_sent_at', null)
    // KINEO-UNSUBSCRIBE-2026-07-26 — quem pediu para sair NUNCA entra em coorte.
    .eq('email_opted_out', false)
    .limit(5000)
  if (error) {
    console.error('[send-video-rescue] profiles query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2) Latest video per user.
  const latestVideoByUser = new Map<string, number>()
  {
    const { data: vids } = await admin.from('videos').select('user_id, created_at').limit(10000)
    for (const v of (vids ?? []) as Array<{ user_id?: string | null; created_at?: string | null }>) {
      if (!v.user_id) continue
      const t = v.created_at ? new Date(v.created_at).getTime() : 0
      const prev = latestVideoByUser.get(v.user_id) ?? 0
      if (t > prev) latestVideoByUser.set(v.user_id, t)
    }
  }

  // 3) Users already in the abandoned-checkout recovery flow — exclude.
  const abandonedUsers = new Set<string>()
  {
    const { data: ab } = await admin.from('checkout_abandoned').select('user_id').limit(10000)
    for (const a of (ab ?? []) as Array<{ user_id?: string | null }>) {
      if (a.user_id) abandonedUsers.add(a.user_id)
    }
  }

  const now = Date.now()

  // KINEO-LIFECYCLE-SUPPRESSION-2026-07-27 — trava cruzada de 24h entre os 4
  // jobs de ciclo de vida. Falha FECHADA (ver lib/lifecycle/suppression.ts).
  //
  // A consulta de supressão é fatiada de 200 em 200, e a query acima carrega
  // até 5000 perfis. Passar os 5000 seriam ~50 consultas para descartar quase
  // todos logo depois. Este pré-passe aplica, SEM ESCREVER NADA, exatamente os
  // mesmos filtros do laço abaixo, e só quem chegaria ao envio entra na
  // consulta. Se um filtro mudar no laço, mude aqui também.
  const sendableIds = (profiles ?? [])
    .filter((u) => {
      const email = u.email?.trim()
      const plan = (u.plan ?? 'free').toLowerCase()
      if (!email || isTestEmail(email) || PAID_PLANS.has(plan) || u.is_pro === true) return false
      const latest = latestVideoByUser.get(u.id) ?? 0
      if (latest === 0 || now - latest < DAY_MS) return false
      return !abandonedUsers.has(u.id)
    })
    .map((u) => u.id as string)

  const suppression = await loadLifecycleSuppression(admin, sendableIds)

  let sent = 0
  let skipped = 0
  let suppressed = 0

  for (const u of profiles ?? []) {
    if (sent >= MAX_PER_RUN) break
    const email = u.email?.trim()
    const plan = (u.plan ?? 'free').toLowerCase()
    const paid = PAID_PLANS.has(plan) || u.is_pro === true

    // Invalid / test / already paid → mark so we never reconsider.
    if (!email || isTestEmail(email) || paid) {
      skipped++
      await admin.from('profiles').update({ video_rescue_sent_at: new Date().toISOString() }).eq('id', u.id)
      continue
    }

    const latest = latestVideoByUser.get(u.id) ?? 0
    // No video yet → not activated; leave for later (do NOT mark).
    if (latest === 0) { skipped++; continue }
    // Made a video too recently → email a day later (do NOT mark).
    if (now - latest < DAY_MS) { skipped++; continue }
    // In the abandoned-checkout flow → send-recovery owns them (do NOT mark).
    if (abandonedUsers.has(u.id)) { skipped++; continue }
    // Recebeu outro e-mail de ciclo de vida nas últimas 24h → espera a janela
    // passar. NÃO marca: a coorte deste job não tem prazo de validade, então o
    // usuário volta a ser elegível na próxima execução diária.
    if (suppression.isSuppressed(u.id)) { suppressed++; continue }

    const { text, html } = buildEmail(u.id)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          reply_to: 'hello@usekineo.com',
          subject: 'You made a Short 🎬 — here’s 50% off to make more',
          text,
          html,
          headers: unsubscribeHeaders(u.id),
        }),
      })
      if (res.ok) {
        sent++
        await admin.from('profiles').update({ video_rescue_sent_at: new Date().toISOString() }).eq('id', u.id)
        console.log(`[send-video-rescue] sent to ${email}`)
      } else {
        console.error(`[send-video-rescue] resend failed for ${email}:`, await res.text())
        // not marked — retried next run
      }
    } catch (err) {
      console.error(`[send-video-rescue] error for ${email}:`, err)
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    total: (profiles ?? []).length,
    sendable: sendableIds.length,
    suppressed_recent_lifecycle: suppressed,
    suppression_degraded: suppression.degraded,
  })
}
