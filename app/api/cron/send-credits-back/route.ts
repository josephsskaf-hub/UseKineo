import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH } from '@/lib/composeClaim'
import {
  FREE_FAST_PREVIEW_LIMIT,
  FREE_FAST_WINDOW_MS,
  countFreeFastUsage,
  countUndeliveredReservations,
} from '@/lib/freeFastQuota'
import { getViralNowTopics } from '@/lib/viralTopics'
import { getFreeTierOffer } from '@/lib/freeTierOffer'

// send-credits-back — KINEO-DAILY-NUDGE-2026-08-04.
//
// O PROBLEMA MEDIDO (04/08/2026)
// ──────────────────────────────
// Retenção D7 = 0,4%. Dos 205 usuários que geraram vídeo nos últimos 30 dias,
// 200 geraram SÓ no dia do cadastro e nunca voltaram. O free tier NÃO é "3
// vídeos e acabou": ele renova 3 Fast previews a cada 24h numa janela rolante
// (lib/freeFastQuota.ts — FREE_FAST_PREVIEW_LIMIT = 3, FREE_FAST_WINDOW_MS
// = 24h). Ninguém sabe disso. O produto tem um loop diário embutido e nunca
// contou para o usuário.
//
// A TESE (aprovada pelo fundador)
// ───────────────────────────────
// Quem cria hábito diário bate no teto de créditos, e o teto é o momento
// natural de compra — é exatamente o público de cron/send-cap-hit. Este job é o
// degrau ANTERIOR: traz a pessoa de volta para o dia 2. Por isso a venda aqui é
// uma linha discreta, não a chamada principal. Vender para quem ainda não criou
// hábito é queimar o único e-mail que essa pessoa vai abrir.
//
// DIFERENÇA ESTRUTURAL PARA OS OUTROS JOBS DE LIFECYCLE
// ────────────────────────────────────────────────────
// Os outros cinco são "1 por usuário PARA SEMPRE". Este é recorrente por
// desenho — hábito não se constrói com um e-mail só. O carimbo
// `profiles.credits_back_sent_at` é lido como JANELA (cooldown de 3 dias), nunca
// como boolean, e entra em lib/lifecycle/suppression.ts para os outros jobs
// enxergarem este envio dentro da janela cruzada de 24h.
//
// PÚBLICO (conservador — e-mail errado queima domínio)
// ───────────────────────────────────────────────────
//   - plano free, não optou por sair, não é conta de teste/fundador
//   - JÁ COMPLETOU >= 1 vídeo (interesse provado, não é cold outreach)
//   - último vídeo entre 24h e 7 dias atrás:
//       < 24h  = está no meio da sessão, o e-mail seria ruído
//       > 7 d  = morto; quem some por uma semana é público de win-back, não de
//                lembrete de crédito, e mandar "seus créditos voltaram" para
//                quem esqueceu do produto é spam
//   - TEM crédito free disponível AGORA, medido pela MESMA fonte de verdade do
//     compose (claims em `events` + Fast previews de custo 0 em `videos` na
//     janela rolante de 24h). Prometer crédito para quem não tem é a única
//     forma garantida de perder a pessoa de vez
//   - não recebeu NENHUM e-mail de lifecycle nas últimas 24h (supressão cruzada,
//     fail-closed) nem ESTE e-mail nos últimos 3 dias
//   - CAP de 150 envios por execução, os mais recentes primeiro (quem parou
//     ontem tem muito mais chance de voltar que quem parou há 6 dias)
//
// AGENDAMENTO: "25 15 * * *" (vercel.json). JSON não aceita comentário, então a
// justificativa mora aqui.
//   - 15h UTC é o pico medido de cadastro/atividade: é a hora em que a caixa de
//     entrada deste público tem mais chance de estar aberta.
//   - minuto 25 é o único slot livre da hora. Os jobs de meia-hora ocupam
//     :05/:35 (blackout-winback), :10/:40 (video-ready), :15/:45 (cap-hit); o
//     activation-nudge ocupa :40, o autopilot-generate ocupa :00 e o
//     send-recovery roda de 2 em 2 horas no :20 — ou seja 14:20 e 16:20, nunca
//     15:xx. Nenhuma colisão com os crons existentes.
//   - 1x por dia. Este e-mail é sobre uma janela de 24h; rodar mais de uma vez
//     por dia só multiplicaria a chance de irritar a mesma pessoa.
//
// Instrumentação: evento `credits_back_sent` em `events`. O link carrega
// `intent_campaign=credits_back` (contrato que GenerateClient já propaga para os
// eventos in-app) + utm_campaign=credits_back, então o retorno é atribuível de
// ponta a ponta: credits_back_sent → generate_arrived_server → compose.
//
// ?dry=1 conta e loga o público SEM enviar nada e SEM carimbar.

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
const PAID_PLANS = new Set(['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial', 'autopilot', 'autopilot_trial'])

// A regra do free tier vinha daqui, numa "cópia fiel" do compose mantida à mão
// — e o aviso de não reimplementar não impediu que fossem duas implementações.
// Desde 06/08/2026 os dois valores e o algoritmo de contagem vêm de
// lib/freeFastQuota.ts, então o compose e este e-mail não podem mais divergir.
// O número continua aparecendo no corpo do e-mail interpolado da constante.

/** Último vídeo tem de ter pelo menos isto de idade (não interromper sessão). */
const MIN_IDLE_MS = 24 * 60 * 60 * 1000
/** E no máximo isto (mais que isso é win-back, não lembrete). */
const MAX_IDLE_MS = 7 * 24 * 60 * 60 * 1000
/** Cooldown do próprio e-mail. Recorrente, mas nunca mais de 1 a cada 3 dias. */
const CREDITS_BACK_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000
/** Teto duro de envios por execução. */
const MAX_PER_RUN = 150
/** PostgREST manda `in.(...)` na query string — fatiar para não estourar a URL. */
const CHUNK_SIZE = 200

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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function parseTime(raw: unknown): number {
  if (!raw) return 0
  const t = Date.parse(String(raw))
  return Number.isNaN(t) ? 0 : t
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface TopicPick {
  id: string
  title: string
  hook: string
  duration: number
  vertical: string
}

/**
 * O tema em alta de hoje. getViralNowTopics() é determinístico por bloco de 4h,
 * então todo mundo do mesmo lote recebe o mesmo tema — e o mesmo tema que está
 * no topo de /viral-now e do dashboard naquele momento. O e-mail não inventa
 * conteúdo próprio: ele espelha o produto.
 */
function pickTopic(): TopicPick | null {
  const topics = getViralNowTopics()
  const top = topics[0]
  if (!top) return null
  return { id: top.id, title: top.title, hook: top.hook, duration: top.duration, vertical: top.vertical }
}

/**
 * Contrato de querystring que JÁ EXISTE no repo (ViralNowClient →
 * app/(dashboard)/generate/page.tsx): só o id do tema atravessa a URL e o
 * catálogo server-side restaura o prompt completo. Isso mantém o link curto o
 * bastante para sobreviver a scanner de e-mail e evita colar um prompt de 1,5 KB
 * na query string. Se o usuário estiver deslogado, /generate preserva o destino
 * e devolve a pessoa exatamente aqui depois do login.
 */
function generateUrl(topic: TopicPick): string {
  const params = new URLSearchParams({
    viral_topic: topic.id,
    autoanalyze: '1',
    duration: String(topic.duration),
    intent_campaign: 'credits_back',
    utm_source: 'lifecycle',
    utm_medium: 'email',
    utm_campaign: 'credits_back',
    utm_content: topic.id,
  })
  return `${APP_URL}/generate?${params.toString()}`
}

function buildEmail(userId: string, topic: TopicPick) {
  const makeUrl = generateUrl(topic)
  const pricingUrl = `${APP_URL}/pricing?utm_source=lifecycle&utm_medium=email&utm_campaign=credits_back`
  const cap = FREE_FAST_PREVIEW_LIMIT

  const text = `Hey,

Quick one: your free Shorts reset. You have ${cap} again.

Most people don't know this — the free plan isn't ${cap} videos total. It's ${cap} every 24 hours. They come back on their own, every day, forever.

Trending right now: ${topic.title}
${topic.hook}

Make it in one click (topic pre-filled): ${makeUrl}

If you ever want more than ${cap} in a day, Starter lifts the cap: ${pricingUrl}. No pressure — the free ${cap} keep coming either way.

Kineo Team
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">Quick one: <strong>your free Shorts reset. You have ${cap} again.</strong></p>
  <p style="margin:0 0 14px;">Most people don't know this — the free plan isn't ${cap} videos total. It's ${cap} <strong>every 24 hours</strong>. They come back on their own, every day, forever.</p>
  <p style="margin:0 0 6px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">Trending right now</p>
  <p style="margin:0 0 6px;font-size:16px;font-weight:bold;">${escapeHtml(topic.title)}</p>
  <p style="margin:0 0 20px;color:#475569;">${escapeHtml(topic.hook)}</p>
  <p style="margin:0 0 10px;"><a href="${makeUrl}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Make this Short &rarr;</a></p>
  <p style="margin:0 0 20px;font-size:13px;color:#64748b;">The topic is already filled in — you just hit generate.</p>
  <p style="margin:0 0 14px;font-size:13px;color:#64748b;">Want more than ${cap} in a day? <a href="${pricingUrl}" style="color:#2997ff;">Starter lifts the cap</a>. No pressure — the free ${cap} keep coming either way.</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // [KINEO-TRIAL-SWAP-2026-08-07] — com o reverse trial ligado o free tier é
  // 1 Fast/mês: a premissa deste e-mail ("suas 3 grátis voltaram, é 3 a cada
  // 24h, para sempre") deixa de existir. Nenhuma copy daqui precisa de troca —
  // a rota inteira só roda com a flag OFF, onde ela continua 100% verdadeira.
  if (getFreeTierOffer().reverseTrial) {
    return NextResponse.json({ sent: 0, reason: 'reverse_trial_free_tier' })
  }

  // ?dry=1 — mede o público sem tocar em nada. O gate de lifecycle e a chave da
  // Resend não bloqueiam o dry-run, senão não dá para dimensionar antes de ligar.
  const dryRun = req.nextUrl.searchParams.get('dry') === '1'

  if (!dryRun && !LIFECYCLE_EMAILS_ENABLED) {
    return NextResponse.json({ paused: true, sent: 0, reason: 'lifecycle_email_gate' })
  }
  if (!dryRun && !RESEND_API_KEY) {
    console.error('[send-credits-back] RESEND_API_KEY not set')
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

  const topic = pickTopic()
  if (!topic) {
    console.error('[send-credits-back] viral topic pool empty — nothing to recommend')
    return NextResponse.json({ sent: 0, reason: 'no_topic' })
  }

  const now = Date.now()

  // ── 1) Quem gerou vídeo nos últimos 7 dias ────────────────────────────────
  // Uma consulta só: o vídeo mais recente (qualquer status) fixa a recência, e
  // pelo menos um `completed` prova o interesse. Volume de 7 dias é pequeno.
  const { data: recentVideos, error: videosErr } = await admin
    .from('videos')
    .select('user_id, status, created_at')
    .gte('created_at', new Date(now - MAX_IDLE_MS).toISOString())
    .limit(5000)

  if (videosErr) {
    console.error('[send-credits-back] videos query error:', videosErr.message)
    return NextResponse.json({ error: videosErr.message }, { status: 500 })
  }

  const lastVideoAt = new Map<string, number>()
  const completedIds = new Set<string>()
  for (const row of (recentVideos ?? []) as Array<Record<string, unknown>>) {
    const id = typeof row.user_id === 'string' ? row.user_id : ''
    if (!id) continue
    const at = parseTime(row.created_at)
    if ((lastVideoAt.get(id) ?? 0) < at) lastVideoAt.set(id, at)
    if (row.status === 'completed') completedIds.add(id)
  }

  const idleIds = Array.from(lastVideoAt.entries())
    .filter(([id, at]) => completedIds.has(id) && now - at >= MIN_IDLE_MS && now - at <= MAX_IDLE_MS)
    .map(([id]) => id)

  if (idleIds.length === 0) {
    return NextResponse.json({ sent: 0, eligible: 0, reason: 'nobody_in_idle_window' })
  }

  // ── 2) Tem crédito free AGORA? ────────────────────────────────────────────
  // Mesma fonte de verdade do compose — agora literalmente a mesma função,
  // lib/freeFastQuota.countFreeFastUsage, e não mais uma segunda cópia deste
  // cálculo (KINEO-DEAD-RESERVATION-2026-08-06). Quem chegou aqui não gera há
  // 24h+, então na prática o consumo é 0.
  //
  // Uma reserva que nunca virou vídeo CONTINUA ocupando vaga aqui, exatamente
  // como antes — a correção disso não está neste commit. O que se sabe hoje é
  // que 8 das 13 pessoas recusadas pelo teto tinham uma reserva nessa condição,
  // mas 9 das 35 reservas assim tiveram download logo depois, ou seja, ausência
  // de linha em `videos` não prova falha nossa: prova que o cliente não avisou.
  // Enquanto a entrega não for registrada pelo servidor, devolver a vaga por
  // ausência de sinal abriria a cota. `blocked_by_undelivered`, abaixo, mede o
  // tamanho da coorte que a correção certa alcançaria.
  const windowStart = new Date(now - FREE_FAST_WINDOW_MS).toISOString()
  const [claimsResult, freeVideosResult] = await Promise.all([
    admin
      .from('events')
      .select('user_id, metadata, created_at')
      .eq('name', COMPOSE_CLAIM_EVENT)
      .eq('path', COMPOSE_CLAIM_PATH)
      .eq('metadata->>quality', 'fast')
      .eq('metadata->>cost', '0')
      .gte('created_at', windowStart)
      .limit(5000),
    admin
      .from('videos')
      .select('id, user_id, render_id')
      .eq('quality_mode', 'fast')
      .eq('credits_used', 0)
      .gte('created_at', windowStart)
      .limit(5000),
  ])

  if (claimsResult.error || freeVideosResult.error) {
    // Falha fechada: sem saber o saldo, o e-mail não pode ser enviado.
    console.error(
      '[send-credits-back] free quota audit failed:',
      claimsResult.error?.message ?? freeVideosResult.error?.message ?? 'unknown database error',
    )
    return NextResponse.json({ error: 'free_quota_audit_failed' }, { status: 503 })
  }

  const usedPerUser = countFreeFastUsage({
    claims: claimsResult.data ?? [],
    videos: freeVideosResult.data ?? [],
    // Varredura global: reserva órfã de conta deletada (`user_id` NULL, porque
    // events.user_id é ON DELETE SET NULL) é pulada, não fatal. Ver o docstring.
    onUnknownUser: 'skip',
  })

  const withCreditsIds = idleIds.filter((id) => (usedPerUser.get(id) ?? 0) < FREE_FAST_PREVIEW_LIMIT)

  // INSTRUMENTO, não regra (KINEO-DEAD-RESERVATION-2026-08-06): quantas pessoas
  // desta fila estão sendo consideradas sem crédito por causa de uma reserva
  // que nunca virou vídeo. Não altera quem recebe o e-mail — mede o tamanho da
  // coorte que uma correção server-side de entrega passaria a alcançar.
  const undeliveredByUser = countUndeliveredReservations({
    claims: claimsResult.data ?? [],
    videos: freeVideosResult.data ?? [],
    now,
  })
  const blockedByUndelivered = idleIds.filter(
    (id) => (usedPerUser.get(id) ?? 0) >= FREE_FAST_PREVIEW_LIMIT && (undeliveredByUser.get(id) ?? 0) > 0,
  ).length
  if (withCreditsIds.length === 0) {
    // O campo do instrumento vai TAMBÉM aqui: este é justamente o run em que
    // todo mundo da fila está sem crédito, ou seja, a amostra mais informativa
    // para saber quanto disso é reserva sem entrega.
    return NextResponse.json({
      sent: 0,
      eligible: 0,
      reason: 'nobody_with_free_credits',
      blocked_by_undelivered: blockedByUndelivered,
    })
  }

  // ── 3) Perfis: free, não opt-out, fora do cooldown deste e-mail ───────────
  interface Candidate {
    id: string
    email: string
    lastVideoAt: number
  }
  const candidates: Candidate[] = []
  let skippedPlanOrTest = 0

  for (const part of chunk(withCreditsIds, CHUNK_SIZE)) {
    const { data: profiles, error: profilesErr } = await admin
      .from('profiles')
      .select('id, email, plan, has_paid, credits_back_sent_at')
      .in('id', part)
      .eq('email_opted_out', false)

    if (profilesErr) {
      console.error('[send-credits-back] profiles query error:', profilesErr.message)
      return NextResponse.json({ error: profilesErr.message }, { status: 500 })
    }

    for (const p of (profiles ?? []) as Array<Record<string, unknown>>) {
      const id = typeof p.id === 'string' ? p.id : ''
      if (!id) continue
      const email = typeof p.email === 'string' ? p.email.trim() : ''
      const plan = String(p.plan ?? 'free').toLowerCase()

      // Sem carimbo de pulo aqui: este job é recorrente, então "não elegível
      // hoje" nunca pode virar "excluído para sempre". Um free que vira pago e
      // depois volta a free precisa continuar elegível.
      if (!email || isTestEmail(email) || plan !== 'free' || p.has_paid === true) {
        skippedPlanOrTest++
        continue
      }

      const lastSent = parseTime(p.credits_back_sent_at)
      if (lastSent > 0 && now - lastSent < CREDITS_BACK_COOLDOWN_MS) continue

      candidates.push({ id, email, lastVideoAt: lastVideoAt.get(id) ?? 0 })
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({ sent: 0, eligible: 0, skipped: skippedPlanOrTest, reason: 'nobody_after_profile_filters' })
  }

  // ── 4) Supressão cruzada de 24h (fail-closed) ─────────────────────────────
  const suppression = await loadLifecycleSuppression(admin, candidates.map((c) => c.id))
  const eligible = candidates.filter((c) => !suppression.isSuppressed(c.id))

  // Mais recentes primeiro: quem parou ontem volta muito mais que quem parou há
  // seis dias. Se o cap cortar alguém, corta quem tem menos chance.
  eligible.sort((a, b) => b.lastVideoAt - a.lastVideoAt)
  const batch = eligible.slice(0, MAX_PER_RUN)

  if (dryRun) {
    console.log(
      `[send-credits-back] DRY RUN — idle=${idleIds.length} with_credits=${withCreditsIds.length} ` +
      `candidates=${candidates.length} eligible=${eligible.length} would_send=${batch.length} topic=${topic.id}`,
    )
    return NextResponse.json({
      dry_run: true,
      sent: 0,
      would_send: batch.length,
      idle_window: idleIds.length,
      with_free_credits: withCreditsIds.length,
      after_profile_filters: candidates.length,
      eligible: eligible.length,
      capped_out: Math.max(0, eligible.length - batch.length),
      skipped_plan_or_test: skippedPlanOrTest,
      suppressed_recent_lifecycle: suppression.suppressedCount,
      suppression_degraded: suppression.degraded,
      topic: { id: topic.id, title: topic.title, vertical: topic.vertical },
    })
  }

  let sent = 0
  let failed = 0

  for (const u of batch) {
    const body = buildEmail(u.id, topic)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [u.email],
          reply_to: 'hello@usekineo.com',
          subject: `Your ${FREE_FAST_PREVIEW_LIMIT} free Shorts are back`,
          text: body.text,
          html: body.html,
          headers: unsubscribeHeaders(u.id),
        }),
      })

      if (res.ok) {
        sent++
        const stampedAt = new Date().toISOString()
        await admin.from('profiles').update({ credits_back_sent_at: stampedAt }).eq('id', u.id)
        // Instrumentação do retorno: este evento é o denominador de
        // credits_back_sent → generate_arrived_server → compose.
        await admin.from('events').insert({
          user_id: u.id,
          name: 'credits_back_sent',
          path: '/api/cron/send-credits-back',
          metadata: {
            campaign: 'credits_back',
            topic_id: topic.id,
            vertical: topic.vertical,
            idle_hours: Math.round((now - u.lastVideoAt) / (60 * 60 * 1000)),
          },
        })
        console.log(`[send-credits-back] sent to ${u.email}`)
      } else {
        failed++
        console.error(`[send-credits-back] resend failed for ${u.email}:`, await res.text())
        // Sem carimbo — reentra na próxima execução.
      }
    } catch (err) {
      failed++
      console.error(`[send-credits-back] error for ${u.email}:`, err)
    }
  }

  return NextResponse.json({
    sent,
    failed,
    eligible: eligible.length,
    capped_out: Math.max(0, eligible.length - batch.length),
    idle_window: idleIds.length,
    with_free_credits: withCreditsIds.length,
    // KINEO-DEAD-RESERVATION-2026-08-06 — quantos desta fila tinham uma reserva
    // morta escondendo a vaga. Campo novo; nenhum campo existente mudou de
    // significado.
    blocked_by_undelivered: blockedByUndelivered,
    skipped_plan_or_test: skippedPlanOrTest,
    suppressed_recent_lifecycle: suppression.suppressedCount,
    suppression_degraded: suppression.degraded,
    topic_id: topic.id,
  })
}
