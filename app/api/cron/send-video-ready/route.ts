import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { LIFECYCLE_SKIP_STAMP } from '@/lib/lifecycle/skipStamp'
import { videoReadyFooterFromRows, isSubscriberProfile, type VideoReadyFooter, type ReadyProfileRow } from '@/lib/lifecycle/videoReadyFooter'

// send-video-ready — Medida 6 do PLANO-SEMANA-2026-08-03 (Bloco B, gerar→baixar).
//
// The measured funnel (03/08): only 30% of people who generate a video ever
// download it. A big slice closes the tab during the 3-7 min render and never
// comes back — the video sits in /history and nobody tells them. This cron
// runs every 30 min and sends ONE email ("Your video is ready 🎬") with the
// thumbnail and a direct link, for videos completed 30min-24h ago that the
// user never downloaded.
//
// Guard rails (same as the other lifecycle jobs):
// - max 1 per user EVER (profiles.video_ready_sent_at). Pulo por atributo
//   IRREVERSIVEL carimba LIFECYCLE_SKIP_STAMP, que a supressao de 24h ignora.
// - 24h cross-suppression via lib/lifecycle/suppression.ts (fail-closed)
// - KINEO_LIFECYCLE_EMAILS_ENABLED gate, CRON_SECRET fail-closed
// - skips test/founder accounts and opted-out users
// - paid users ARE included: this is delivery, not a sales pitch
//
// Metric: video_ready_sent_at → video_downloaded / video_ready_viewed same day.
// Companion instrumentation: the video_ready_viewed event (MEDIDA 4) tells us
// how big the "never came back" slice really is.

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

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const LIFECYCLE_EMAILS_ENABLED = process.env.KINEO_LIFECYCLE_EMAILS_ENABLED === 'true'
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'

/** Video must be at least this old — give the in-app flow time to win first. */
const MIN_AGE_MS = 30 * 60 * 1000
/** And no older than this — never email about a stale backlog. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000
// ═══ sprint-assinaturas #26 (02/09) — ESTE ERA O 3º E-MAIL DE "VÍDEO PRONTO"
// E O ÚNICO QUE NÃO OLHAVA A PESSOA. Medido (14d, externos, 98 envios):
//   · 80 dos 98 JÁ TINHAM VISTO a tela de vídeo pronto no app
//     (`video_ready_viewed`) antes do e-mail — e liam "if you closed the tab,
//     no harm done";
//   · 8 tinham clicado em download (`video_download_clicked` /
//     `video_download_manual_link_clicked`) — o cron só olhava
//     `video_downloaded`, que o link manual não emite;
//   · 15 já tinham recebido o "Your video is ready" do cron de resgate;
//   · 69 sem saldo para o próximo vídeo, 28 trial com saldo, 1 assinante —
//     e o e-mail não pedia nada a nenhum deles;
//   · efeito: 2 downloads, 8 segundos vídeos, 2 checkouts.
// Regras novas: (1) clique em download conta como baixado; (2) se outro
// "vídeo pronto" saiu há menos de READY_EMAIL_GAP_MS, espera (não carimba —
// a janela de 24h ainda alcança); (3) quem JÁ VIU o filme recebe a copy de
// quem viu ("it's saved, here's the MP4") — nunca "closed the tab"; (4) todo
// envio leva o rodapé por situação do #24 (assinante = episódio 2 sem preço;
// trial com saldo = episódio 2 antes do plano; sem saldo = plano medido em
// filmes como este); (5) carimbo `video_ready_nudge_sent` em `events` com
// saw_ready_screen/footer/subscriber/cost/credits_remaining — antes só a
// coluna do perfil, sem como medir o que cada um leu.
/** Outro e-mail de "vídeo pronto" (rota de status / cron de resgate) mais novo
 *  que isto = ainda não é hora do 2º toque. */
const READY_EMAIL_GAP_MS = 6 * 60 * 60 * 1000
const DOWNLOAD_EVENTS = ['video_downloaded', 'video_download_clicked', 'video_download_manual_link_clicked'] as const
const SEEN_EVENT = 'video_ready_viewed'
const READY_EMAIL_EVENTS = ['video_ready_email_sent', 'stranded_ready_sent', 'stranded_fast_ready_sent'] as const
const NUDGE_EVENT = 'video_ready_nudge_sent'

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

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

interface ReadyVideo {
  id: string | null
  title: string | null
  thumb: string | null
  creditsUsed: number | null
  duration: number | null
}

interface EmailContext {
  /** A pessoa já abriu a tela de vídeo pronto no app (video_ready_viewed). */
  sawIt: boolean
  footer: VideoReadyFooter
}

function escapeHtmlText(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildEmail(userId: string, video: ReadyVideo, ctx: EmailContext) {
  const url = `${APP_URL}/history?utm_source=lifecycle&utm_medium=email&utm_campaign=video_ready${ctx.sawIt ? '_seen' : ''}`
  const title = (video.title ?? '').trim()
  const safeTitle = escapeHtmlText(title)

  // Quem JÁ VIU o filme não "fechou a aba": viu e não baixou. A frase certa é
  // onde ele está e o que vem depois — o rodapé por situação faz o pedido.
  const headlineText = ctx.sawIt
    ? title
      ? `"${title}" is saved in your library — private, and the MP4 is one click away.`
      : 'Your video is saved in your library — private, and the MP4 is one click away.'
    : title
      ? `"${title}" is done rendering and waiting for you.`
      : 'Your video is done rendering and waiting for you.'
  const headlineHtml = ctx.sawIt
    ? title
      ? `<strong>&ldquo;${safeTitle}&rdquo;</strong> is saved in your library &mdash; private, and the MP4 is one click away.`
      : '<strong>Your video is saved in your library</strong> &mdash; private, and the MP4 is one click away.'
    : title
      ? `<strong>&ldquo;${safeTitle}&rdquo;</strong> is done rendering and waiting for you.`
      : '<strong>Your video is done rendering</strong> and waiting for you.'
  const closingText = ctx.sawIt
    ? 'Everything you generate stays in your library. Ready for the next one? usekineo.com/studio'
    : 'It only took a few minutes to render, so if you closed the tab, no harm done. Everything you generate stays in your library.'
  const closingHtml = ctx.sawIt
    ? `Everything you generate stays in your library. Ready for the next one? <a href="${APP_URL}/studio" style="color:#2997ff;">usekineo.com/studio</a>`
    : 'It only took a few minutes to render, so if you closed the tab, no harm done. Everything you generate stays in your library.'

  const text = `Hey,

${headlineText}

Watch it and grab the download here: ${url}

Your video is private by default. Download the MP4 if you want to send it directly.

${closingText}

Kineo Team
usekineo.com`

  const thumbHtml = video.thumb
    ? `<p style="margin:0 0 14px;"><a href="${url}"><img src="${video.thumb}" alt="Your video" width="180" style="display:block;border-radius:12px;max-width:180px;" /></a></p>`
    : ''

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">${headlineHtml}</p>
  ${thumbHtml}
  <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">${ctx.sawIt ? 'Download the MP4' : 'Watch &amp; download'} &rarr;</a></p>
  <p style="margin:0 0 14px;color:#475569;font-size:14px;">Your video is private by default. Download the MP4 if you want to send it directly.</p>
  <!-- rodapé do #24 foi desenhado para fundo escuro (strong em #fff): cartão escuro aqui, senão o saldo some no branco -->
  <div style="background:#161618;color:#fff;padding:4px 20px 20px;border-radius:12px;margin:0 0 14px">${ctx.footer.html}</div>
  <p style="margin:0 0 14px;">${closingHtml}</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`

  const subject = ctx.sawIt
    ? title
      ? `Your film "${title.length > 48 ? `${title.slice(0, 45).trimEnd()}…` : title}" is saved — MP4 inside`
      : 'Your film is saved — MP4 inside'
    : 'Your video is ready 🎬'

  return { subject, text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!LIFECYCLE_EMAILS_ENABLED) {
    return NextResponse.json({ paused: true, sent: 0, reason: 'lifecycle_email_gate' })
  }
  if (!RESEND_API_KEY) {
    console.error('[send-video-ready] RESEND_API_KEY not set')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service env missing' }, { status: 500 })
  }
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // KINEO-LIFECYCLE-FRESH-READ-2026-08-05 — leitura de cron nunca vem de
    // cache. O reenvio triplo do send-cap-hit nasceu disso; este job lia pelo
    // mesmo caminho. Ver lib/lifecycle/freshFetch.ts.
    global: { fetch: freshFetch },
  })

  const now = Date.now()
  const newest = new Date(now - MIN_AGE_MS).toISOString()
  const oldest = new Date(now - MAX_AGE_MS).toISOString()

  // Completed videos in the 30min-24h window (small volume: dozens/day).
  const { data: readyVideos, error: videosErr } = await admin
    .from('videos')
    .select('id, user_id, title, topic, thumbnail_url, thumb_url, created_at, credits_used, duration')
    .eq('status', 'completed')
    .gte('created_at', oldest)
    .lte('created_at', newest)
    .order('created_at', { ascending: false })

  if (videosErr) {
    console.error('[send-video-ready] videos query error:', videosErr.message)
    return NextResponse.json({ error: videosErr.message }, { status: 500 })
  }

  // Newest ready video per user (for thumbnail/title) + earliest window start
  // (to check downloads AFTER the video existed).
  const perUser = new Map<string, ReadyVideo & { earliest: string }>()
  for (const row of readyVideos ?? []) {
    const id = row.user_id as string | null
    if (!id) continue
    const existing = perUser.get(id)
    if (!existing) {
      perUser.set(id, {
        id: (row.id as string | null) ?? null,
        title: (row.title as string | null) ?? (row.topic as string | null),
        thumb: (row.thumb_url as string | null) ?? (row.thumbnail_url as string | null),
        creditsUsed: typeof row.credits_used === 'number' ? (row.credits_used as number) : null,
        duration: typeof row.duration === 'number' ? (row.duration as number) : null,
        earliest: row.created_at as string,
      })
    } else if ((row.created_at as string) < existing.earliest) {
      existing.earliest = row.created_at as string
    }
  }

  if (perUser.size === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, total: 0 })
  }

  // Anyone who downloaded (or CLICKED download — the manual link never emits
  // `video_downloaded`) since their oldest ready video doesn't need this
  // nudge. The same read also tells us who already SAW the ready screen and
  // who already got another "video is ready" e-mail (status route / rescue
  // cron). One query, fail-closed: an error here means no e-mail this run.
  const candidateIds = Array.from(perUser.keys())
  const { data: signals, error: dlErr } = await admin
    .from('events')
    .select('user_id, name, created_at')
    .in('name', [...DOWNLOAD_EVENTS, SEEN_EVENT, ...READY_EMAIL_EVENTS])
    .in('user_id', candidateIds)
    .gte('created_at', oldest)

  if (dlErr) {
    console.error('[send-video-ready] signals query error:', dlErr.message)
    return NextResponse.json({ error: dlErr.message }, { status: 500 })
  }

  const sawIt = new Set<string>()
  const lastReadyEmailMs = new Map<string, number>()
  const downloadSet = new Set<string>(DOWNLOAD_EVENTS)
  const readyEmailSet = new Set<string>(READY_EMAIL_EVENTS)
  for (const row of signals ?? []) {
    const id = row.user_id as string | null
    const name = row.name as string | null
    if (!id || !name) continue
    const entry = perUser.get(id)
    if (!entry) continue
    const at = row.created_at as string
    if (downloadSet.has(name)) {
      if (at >= entry.earliest) perUser.delete(id)
      continue
    }
    if (name === SEEN_EVENT) {
      if (at >= entry.earliest) sawIt.add(id)
      continue
    }
    if (readyEmailSet.has(name)) {
      const ms = Date.parse(at)
      if (Number.isFinite(ms)) lastReadyEmailMs.set(id, Math.max(lastReadyEmailMs.get(id) ?? 0, ms))
    }
  }

  if (perUser.size === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, total: 0, all_downloaded: true })
  }

  const { data: candidates, error } = await admin
    .from('profiles')
    .select('id, email, video_ready_sent_at, has_paid, plan, video_credits')
    .in('id', Array.from(perUser.keys()))
    .is('video_ready_sent_at', null)
    .eq('email_opted_out', false)

  if (error) {
    console.error('[send-video-ready] profiles query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const suppression = await loadLifecycleSuppression(
    admin,
    (candidates ?? []).map((u) => u.id as string),
  )

  let sent = 0
  let skipped = 0
  let suppressed = 0
  let deferredRecentReady = 0

  for (const u of candidates ?? []) {
    // Suppressed = another lifecycle email in the last 24h. NOT stamped — the
    // video is still in their library on the next run.
    if (suppression.isSuppressed(u.id as string)) {
      suppressed++
      continue
    }

    const email = u.email?.trim()

    // Test accounts never get lifecycle mail. Stamp so the row is never
    // reconsidered (same pattern as the other jobs).
    if (!email || isTestEmail(email)) {
      skipped++
      // Sentinela de pulo (KINEO-SKIP-STAMP-2026-08-05): nunca reconsiderada,
      // e sem calar os outros jobs de ciclo de vida por 24h.
      await admin
        .from('profiles')
        .update({ video_ready_sent_at: LIFECYCLE_SKIP_STAMP })
        .eq('id', u.id)
      continue
    }

    const video = perUser.get(u.id as string)
    if (!video) continue

    // Outro "vídeo pronto" saiu há menos de 6h (rota de status no segundo em
    // que o filme nasceu, ou o cron de resgate): ainda não é hora do 2º toque.
    // Não carimba — a janela de 24h ainda alcança nas próximas rodadas.
    const lastReady = lastReadyEmailMs.get(u.id as string)
    if (typeof lastReady === 'number' && now - lastReady < READY_EMAIL_GAP_MS) {
      deferredRecentReady++
      continue
    }

    const prof: ReadyProfileRow = { has_paid: u.has_paid as boolean | null, plan: u.plan as string | null, video_credits: u.video_credits as number | null }
    const footer = videoReadyFooterFromRows(prof, { title: video.title, topic: null, credits_used: video.creditsUsed, duration: video.duration }, APP_URL)
    const ctx: EmailContext = { sawIt: sawIt.has(u.id as string), footer }
    const { subject, text, html } = buildEmail(u.id, video, ctx)
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
          subject,
          text,
          html,
          headers: unsubscribeHeaders(u.id),
        }),
      })

      if (res.ok) {
        sent++
        await admin
          .from('profiles')
          .update({ video_ready_sent_at: new Date().toISOString() })
          .eq('id', u.id)
        // Carimbo legível: o que ESTA pessoa leu (antes só a coluna do perfil).
        try {
          await admin.from('events').insert({
            user_id: u.id,
            name: NUDGE_EVENT,
            path: '/api/cron/send-video-ready',
            metadata: {
              video_id: video.id,
              saw_ready_screen: ctx.sawIt,
              footer: footer.kind,
              subscriber: isSubscriberProfile(prof),
              cost: video.creditsUsed,
              credits_remaining: prof.video_credits ?? null,
              second_touch: typeof lastReady === 'number',
            },
          })
        } catch (e) {
          console.warn('[send-video-ready] nudge stamp failed:', e instanceof Error ? e.message : String(e))
        }
        console.log(`[send-video-ready] sent to ${email} (saw=${ctx.sawIt} footer=${footer.kind})`)
      } else {
        console.error(`[send-video-ready] resend failed for ${email}:`, await res.text())
        // not stamped — retried on the next half-hour run
      }
    } catch (err) {
      console.error(`[send-video-ready] error for ${email}:`, err)
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    total: (candidates ?? []).length,
    suppressed_recent_lifecycle: suppressed,
    deferred_recent_ready_email: deferredRecentReady,
    suppression_degraded: suppression.degraded,
  })
}
