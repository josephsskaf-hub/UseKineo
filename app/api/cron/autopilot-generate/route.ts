// KINEO-AUTOPILOT-2026-07-26 — o loop do Autopilot.
//
// UMA invocação por hora faz DOIS passes:
//
//   PASSE 1 (publicar): pega runs cujo render já está em voo, consulta
//     /api/compose/status (que LIQUIDA o crédito e grava em `videos`) e, se
//     terminou, publica no YouTube.
//   PASSE 2 (gerar): pega schedules devidas, CLAIMA a run e dispara o render.
//
// POR QUE OS DOIS PASSES NO MESMO CRON (e não uma segunda rota):
//   • Um render é assíncrono e a função tem wall-clock limitado — bloquear
//     esperando o render é garantia de timeout. Então gerar e publicar TÊM que
//     ser invocações separadas no tempo.
//   • Mas elas não precisam ser ROTAS separadas: rodando de hora em hora, o
//     render disparado às 14:00 é publicado às 15:00 pelo passe 1 da invocação
//     seguinte. Uma rota só significa um segredo só, um ponto de log só e —
//     decisivo — UMA entrada de cron. O repo já registra (em
//     app/api/cron/send-reminders/route.ts) que a Vercel rejeita deploy
//     silenciosamente quando o limite de crons do plano é estourado; gastar
//     duas entradas para o mesmo produto seria desperdício com risco de deploy.
//   • O passe 1 roda ANTES do passe 2 de propósito: publicar o vídeo de ontem
//     é receita já paga; começar o de hoje pode esperar alguns segundos.
//
// IDEMPOTÊNCIA (duas travas, porque são dois riscos diferentes):
//   1. Passe 2 INSERE a linha de run ANTES de gastar qualquer coisa. A unique
//      (schedule_id, scheduled_for_date, slot) da migration 021 faz um segundo
//      disparo na mesma hora bater 23505 e virar no-op → nunca dois RENDERS.
//   2. Passe 1 toma um lease (publish_lock_at) com UPDATE condicional antes de
//      chamar o YouTube → nunca duas PUBLICAÇÕES do mesmo render. A unique do
//      item 1 não cobre isso: a run já existe, o risco é dois passes de
//      publicação concorrentes lendo a MESMA linha.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { creditCostFor, type Quality } from '@/lib/credits/engineCost'
import {
  AUTOPILOT_MAX_PUBLISHES_PER_RUN,
  AUTOPILOT_ENTITLEMENT_COLUMNS,
  AUTOPILOT_MAX_STARTS_PER_RUN,
  AUTOPILOT_MAX_PAGES,
  AUTOPILOT_PAGE_SIZE,
  AUTOPILOT_RENDER_TIMEOUT_MS,
  AUTOPILOT_TOPIC_MEMORY,
  clampAutopilotEngine,
  computeNextRunAt,
  isAutopilotEntitled,
  normalizePostHour,
  normalizePostsPerDay,
  scheduledDateUtc,
  scheduledSlot,
} from '@/lib/autopilot/config'
import { autopilotEvent } from '@/lib/autopilot/events'
import {
  buildPublishMetadata,
  checkRender,
  publishToYouTube,
  startRender,
} from '@/lib/autopilot/pipeline'
import { mintUserSession, type UserSession } from '@/lib/autopilot/session'
import { buildAutopilotPrompt, pickTopic, recentTopicsForSchedule } from '@/lib/autopilot/topics'

export const dynamic = 'force-dynamic'
// Mesmo teto do send-reminders (conta Vercel Pro). Os dois passes respeitam um
// deadline interno menor para sempre devolver um JSON de resumo.
export const maxDuration = 300

const WALL_CLOCK_BUDGET_MS = 240_000

// Duração do lease de publicação. Tem que ser MAIOR que o pior caso de um
// upload (maxDuration de /api/youtube/upload) e MENOR que o intervalo do cron
// (1h), para que uma invocação que morra no meio libere a run na hora seguinte.
const PUBLISH_LEASE_MS = 15 * 60 * 1000

// Guard idêntico ao dos crons existentes (refresh-niche-trends,
// refresh-viral-now): Bearer CRON_SECRET.
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

interface ScheduleRow {
  id: string
  user_id: string
  channel_id: string
  enabled: boolean
  niche: string | null
  tone: string | null
  language: string | null
  engine: string | null
  post_hour_utc: number | null
  posts_per_day: number | null
  privacy_status: string | null
  next_run_at: string | null
}

interface RunRow {
  id: string
  schedule_id: string
  channel_id: string | null
  user_id: string
  status: string
  topic: string | null
  render_id: string | null
  started_at: string
}

/**
 * .range() SEMPRE. O PostgREST corta silenciosamente em 1000 linhas e esse bug
 * já mordeu este codebase — um select sem paginação simplesmente para de ver
 * clientes quando a base cresce, sem erro nenhum.
 */
async function selectAllPaged<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = []
  for (let page = 0; page < AUTOPILOT_MAX_PAGES; page++) {
    const from = page * AUTOPILOT_PAGE_SIZE
    const { data, error } = await build(from, from + AUTOPILOT_PAGE_SIZE - 1)
    if (error) {
      console.error('[autopilot] paged select failed:', error.message)
      break
    }
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < AUTOPILOT_PAGE_SIZE) break
  }
  return out
}

async function patchRun(
  db: SupabaseClient,
  runId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await db.from('autopilot_runs').update(patch).eq('id', runId)
  if (error) console.error('[autopilot] run update failed:', runId, error.message)
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSE 1 — publicar o que já renderizou.
// ═══════════════════════════════════════════════════════════════════════════
async function publishPass(args: {
  db: SupabaseClient
  baseUrl: string
  deadline: number
  sessions: Map<string, UserSession | null>
}): Promise<{ checked: number; published: number; failed: number; stillPending: number }> {
  const { db, baseUrl } = args
  let checked = 0
  let published = 0
  let failed = 0
  let stillPending = 0

  const runs = await selectAllPaged<RunRow>((from, to) =>
    db
      .from('autopilot_runs')
      .select('id, schedule_id, channel_id, user_id, status, topic, render_id, started_at')
      .in('status', ['generating', 'uploading'])
      .not('render_id', 'is', null)
      .order('started_at', { ascending: true })
      .range(from, to),
  )

  for (const run of runs) {
    if (published + failed >= AUTOPILOT_MAX_PUBLISHES_PER_RUN) break
    if (Date.now() > args.deadline) break
    checked++

    const startedMs = Date.parse(run.started_at)
    const expired = Number.isFinite(startedMs) && Date.now() - startedMs > AUTOPILOT_RENDER_TIMEOUT_MS

    const { data: scheduleData } = await db
      .from('autopilot_schedules')
      .select('id, user_id, channel_id, niche, tone, language, engine, privacy_status')
      .eq('id', run.schedule_id)
      .maybeSingle()
    const schedule = scheduleData as Partial<ScheduleRow> | null

    if (!args.sessions.has(run.user_id)) {
      args.sessions.set(run.user_id, await mintUserSession(run.user_id))
    }
    const session = args.sessions.get(run.user_id) ?? null
    if (!session) {
      // Sem sessão não dá nem para liquidar o crédito. Se já estourou o prazo,
      // encerra; senão deixa para a próxima hora.
      if (expired) {
        failed++
        await patchRun(db, run.id, {
          status: 'failed', error: 'could not act as user to finish this render',
          finished_at: new Date().toISOString(),
        })
        await autopilotEvent('autopilot_run_failed', {
          userId: run.user_id, scheduleId: run.schedule_id, runId: run.id,
          channelId: run.channel_id, metadata: { stage: 'publish', reason: 'session_unavailable' },
        })
      } else {
        stillPending++
      }
      continue
    }

    const engine = clampAutopilotEngine(schedule?.engine)
    const topic = run.topic ?? ''

    const status = await checkRender({
      baseUrl, session, renderId: run.render_id as string, engine, topic,
    })

    if (status.state === 'pending') {
      if (!expired) { stillPending++; continue }
      failed++
      await patchRun(db, run.id, {
        status: 'failed',
        error: `render still not finished after ${Math.round(AUTOPILOT_RENDER_TIMEOUT_MS / 3600000)}h`,
        finished_at: new Date().toISOString(),
      })
      await autopilotEvent('autopilot_run_failed', {
        userId: run.user_id, scheduleId: run.schedule_id, runId: run.id,
        channelId: run.channel_id, metadata: { stage: 'render', reason: 'render_timeout', render_id: run.render_id },
      })
      continue
    }

    if (status.state === 'failed') {
      failed++
      await patchRun(db, run.id, {
        status: 'failed', error: status.error, finished_at: new Date().toISOString(),
      })
      await autopilotEvent('autopilot_run_failed', {
        userId: run.user_id, scheduleId: run.schedule_id, runId: run.id,
        channelId: run.channel_id, metadata: { stage: 'render', reason: 'render_failed', render_id: run.render_id, error: status.error },
      })
      continue
    }

    // ── TRAVA DE PUBLICAÇÃO ───────────────────────────────────────────────
    // A unique (schedule_id, scheduled_for_date, slot) impede um SEGUNDO
    // render, mas NÃO impediria duas publicações do MESMO render: dois
    // disparos paralelos do cron enxergariam a mesma run em 'generating' e os
    // dois chamariam o YouTube — dois vídeos idênticos no canal do cliente.
    // Este UPDATE condicional é o desempate. No Postgres os dois UPDATEs na
    // mesma linha serializam; o perdedor reavalia o WHERE já com o lock
    // gravado e recebe 0 linhas. checkRender acima pode rodar em paralelo sem
    // risco: /api/compose/status é o mesmo endpoint que o browser faz poll,
    // então liquidar crédito ali já é idempotente por construção.
    const leaseCutoff = new Date(Date.now() - PUBLISH_LEASE_MS).toISOString()
    const { data: leased, error: leaseError } = await db
      .from('autopilot_runs')
      .update({ publish_lock_at: new Date().toISOString() })
      .eq('id', run.id)
      .or(`publish_lock_at.is.null,publish_lock_at.lt.${leaseCutoff}`)
      .select('id')
    if (leaseError) {
      console.error('[autopilot] publish lease failed:', run.id, leaseError.message)
      stillPending++
      continue
    }
    if (!leased || leased.length === 0) {
      // Outra invocação está publicando esta run agora. Não é erro.
      stillPending++
      continue
    }

    // Render pronto: o crédito JÁ foi liquidado pela chamada de status acima.
    // Registramos isso antes de tentar o YouTube, para que uma falha de upload
    // não apague o fato de que o vídeo existe e foi cobrado.
    await patchRun(db, run.id, {
      status: 'uploading',
      video_id: status.videoId,
      credits_charged: status.creditsDeducted,
    })

    const meta = buildPublishMetadata(topic || 'Daily Short', schedule?.niche ?? null)
    const privacyRaw = (schedule?.privacy_status ?? 'public').toString()
    const privacy: 'public' | 'private' | 'unlisted' =
      privacyRaw === 'private' || privacyRaw === 'unlisted' ? privacyRaw : 'public'

    const result = await publishToYouTube({
      baseUrl,
      session,
      channelId: run.channel_id ?? schedule?.channel_id ?? null,
      videoUrl: status.videoUrl,
      title: meta.title,
      description: meta.description,
      tags: meta.tags,
      privacyStatus: privacy,
    })

    if (result.ok) {
      published++
      await patchRun(db, run.id, {
        status: 'succeeded',
        youtube_video_id: result.youtubeVideoId,
        error: null,
        finished_at: new Date().toISOString(),
      })
      await autopilotEvent('autopilot_run_published', {
        userId: run.user_id, scheduleId: run.schedule_id, runId: run.id,
        channelId: run.channel_id,
        metadata: {
          render_id: run.render_id, youtube_video_id: result.youtubeVideoId,
          engine, credits_charged: status.creditsDeducted, topic: topic.slice(0, 200),
        },
      })
      continue
    }

    // Upload falhou. Se for transitório, a run FICA em 'uploading' e o passe da
    // próxima hora tenta de novo — o render já está pago, jogar fora seria
    // queimar dinheiro do cliente. Se for definitivo, encerra.
    if (result.retryable && !expired) {
      stillPending++
      // Libera o lease explicitamente: a run continua elegível e a próxima hora
      // não precisa esperar os 15 min expirarem.
      await patchRun(db, run.id, { error: result.error, publish_lock_at: null })
      continue
    }
    failed++
    await patchRun(db, run.id, {
      status: 'failed', error: result.error, finished_at: new Date().toISOString(),
    })
    await autopilotEvent('autopilot_run_failed', {
      userId: run.user_id, scheduleId: run.schedule_id, runId: run.id,
      channelId: run.channel_id,
      metadata: { stage: 'publish', reason: 'youtube_upload_failed', error: result.error, render_id: run.render_id },
    })
  }

  return { checked, published, failed, stillPending }
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSE 2 — começar os renders devidos.
// ═══════════════════════════════════════════════════════════════════════════
async function generatePass(args: {
  db: SupabaseClient
  baseUrl: string
  deadline: number
  sessions: Map<string, UserSession | null>
}): Promise<{ due: number; claimed: number; started: number; skipped: number; failed: number }> {
  const { db, baseUrl } = args
  const nowIso = new Date().toISOString()
  let claimed = 0
  let started = 0
  let skipped = 0
  let failed = 0

  const due = await selectAllPaged<ScheduleRow>((from, to) =>
    db
      .from('autopilot_schedules')
      .select('id, user_id, channel_id, enabled, niche, tone, language, engine, post_hour_utc, posts_per_day, privacy_status, next_run_at')
      .eq('enabled', true)
      // next_run_at NULL = agenda recém-criada que nunca rodou: é devida agora.
      .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
      .order('next_run_at', { ascending: true, nullsFirst: true })
      .range(from, to),
  )

  for (const schedule of due) {
    if (started + failed >= AUTOPILOT_MAX_STARTS_PER_RUN) break
    if (Date.now() > args.deadline) break

    const postsPerDay = normalizePostsPerDay(schedule.posts_per_day)
    const postHour = normalizePostHour(schedule.post_hour_utc)
    const scheduledAt = schedule.next_run_at ? new Date(schedule.next_run_at) : new Date()
    const forDate = scheduledDateUtc(scheduledAt)
    const slot = scheduledSlot(scheduledAt, postsPerDay)

    // ── CLAIM ANTES DO TRABALHO ────────────────────────────────────────────
    const { data: claimData, error: claimError } = await db
      .from('autopilot_runs')
      .insert({
        schedule_id: schedule.id,
        channel_id: schedule.channel_id,
        user_id: schedule.user_id,
        scheduled_for_date: forDate,
        slot,
        status: 'pending',
      })
      .select('id')
      .maybeSingle()

    if (claimError) {
      // 23505 = outra invocação já claimou este (schedule, dia, slot). No-op:
      // é EXATAMENTE a trava anti-duplo-post funcionando.
      if ((claimError as { code?: string }).code === '23505') continue
      console.error('[autopilot] claim failed:', schedule.id, claimError.message)
      continue
    }
    const runId = (claimData as { id: string } | null)?.id
    if (!runId) continue
    claimed++

    // ── AVANÇA A AGENDA IMEDIATAMENTE ──────────────────────────────────────
    // Antes de qualquer trabalho que possa falhar/estourar tempo. Uma agenda
    // travada, tentando para sempre, é pior que um dia pulado: ela repete o
    // erro de hora em hora, queima quota e nunca se recupera sozinha.
    const nextRunAt = computeNextRunAt({
      from: new Date(Math.max(Date.now(), scheduledAt.getTime())),
      postHourUtc: postHour,
      postsPerDay,
    })
    await db
      .from('autopilot_schedules')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRunAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule.id)

    const skip = async (reason: string, metadata?: Record<string, unknown>) => {
      skipped++
      await patchRun(db, runId, { status: 'skipped', reason, finished_at: new Date().toISOString() })
      await autopilotEvent('autopilot_run_skipped', {
        userId: schedule.user_id, scheduleId: schedule.id, runId,
        channelId: schedule.channel_id, metadata: { reason, ...(metadata ?? {}) },
      })
    }

    // ── ENTITLEMENT + CRÉDITO, pelo ledger existente ───────────────────────
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      // KINEO-PILOT-99-2026-07-26 — constante única, porque isAutopilotEntitled
      // falha FECHADO em plano com prazo: se plan_expires_at não vier no select,
      // todo piloto de $99 vira 'not_entitled' e o cliente não recebe nada.
      .select(AUTOPILOT_ENTITLEMENT_COLUMNS)
      .eq('id', schedule.user_id)
      .maybeSingle()
    if (profileError) {
      await skip('profile_lookup_failed', { error: profileError.message })
      continue
    }
    const profile = profileData as {
      has_paid?: boolean | null; plan?: string | null
      is_pro?: boolean | null; video_credits?: number | null
      plan_expires_at?: string | null
    } | null

    // Free NUNCA recebe auto-publicação. O gate vive aqui porque
    // /api/youtube/upload usa o plano só para decidir a marca d'água da
    // descrição — ele não é, e não virou, um portão de plano.
    if (!isAutopilotEntitled(profile)) {
      await skip('not_entitled', { plan: profile?.plan ?? null })
      continue
    }

    const engine: Quality = clampAutopilotEngine(schedule.engine)
    const cost = creditCostFor(engine, true) // schedule só roda em conta paga
    const balance = typeof profile?.video_credits === 'number' ? profile.video_credits : 0
    if (balance < cost) {
      await skip('insufficient_credits', { balance, required: cost, engine })
      continue
    }

    // ── CANAL ──────────────────────────────────────────────────────────────
    const { data: channelData } = await db
      .from('channels')
      .select('id, revoked_at, refresh_token')
      .eq('id', schedule.channel_id)
      .maybeSingle()
    const channel = channelData as { id: string; revoked_at: string | null; refresh_token: string | null } | null
    if (!channel || channel.revoked_at || !channel.refresh_token) {
      await skip('channel_disconnected')
      continue
    }

    // ── TEMA ───────────────────────────────────────────────────────────────
    const recent = await recentTopicsForSchedule(db, schedule.id, AUTOPILOT_TOPIC_MEMORY)
    const pick = await pickTopic({
      db, scheduleId: schedule.id, niche: schedule.niche, tone: schedule.tone,
      language: schedule.language, avoid: recent,
    })
    await patchRun(db, runId, { topic: pick.topic })

    // ── SESSÃO + RENDER ────────────────────────────────────────────────────
    if (!args.sessions.has(schedule.user_id)) {
      args.sessions.set(schedule.user_id, await mintUserSession(schedule.user_id))
    }
    const session = args.sessions.get(schedule.user_id) ?? null
    if (!session) {
      await skip('session_unavailable')
      continue
    }

    const prompt = buildAutopilotPrompt({
      topic: pick.topic,
      tone: schedule.tone,
      language: schedule.language,
      previousTopic: recent[0] ?? null,
    })

    const render = await startRender({
      baseUrl, session, prompt, topic: pick.topic, engine,
      language: (schedule.language ?? 'en').toString(),
    })

    if (!render.ok) {
      failed++
      await patchRun(db, runId, {
        status: 'failed', error: render.error, finished_at: new Date().toISOString(),
      })
      await autopilotEvent('autopilot_run_failed', {
        userId: schedule.user_id, scheduleId: schedule.id, runId,
        channelId: schedule.channel_id,
        metadata: { stage: render.stage, error: render.error, engine, topic: pick.topic.slice(0, 200) },
      })
      continue
    }

    started++
    await patchRun(db, runId, { status: 'generating', render_id: render.renderId, error: null })
    await autopilotEvent('autopilot_run_started', {
      userId: schedule.user_id, scheduleId: schedule.id, runId,
      channelId: schedule.channel_id,
      metadata: {
        render_id: render.renderId, engine, cost, topic: pick.topic.slice(0, 200),
        topic_source: pick.source, scheduled_for: forDate, slot,
      },
    })
  }

  return { due: due.length, claimed, started, skipped, failed }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service role is not configured' }, { status: 500 })
  }
  const db = createAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // A origem da própria request: mantém preview deploys funcionando e evita
  // depender de NEXT_PUBLIC_APP_URL estar certo em cada ambiente.
  const baseUrl = req.nextUrl.origin
  const deadline = Date.now() + WALL_CLOCK_BUDGET_MS
  // Uma sessão por usuário por invocação, compartilhada pelos dois passes.
  const sessions = new Map<string, UserSession | null>()

  let publish = { checked: 0, published: 0, failed: 0, stillPending: 0 }
  try {
    publish = await publishPass({ db, baseUrl, deadline, sessions })
  } catch (e) {
    console.error('[autopilot] publish pass threw:', e instanceof Error ? e.message : String(e))
  }

  let generate = { due: 0, claimed: 0, started: 0, skipped: 0, failed: 0 }
  try {
    generate = await generatePass({ db, baseUrl, deadline, sessions })
  } catch (e) {
    console.error('[autopilot] generate pass threw:', e instanceof Error ? e.message : String(e))
  }

  const summary = {
    ok: true,
    due: generate.due,
    claimed: generate.claimed,
    started: generate.started,
    skipped: generate.skipped,
    failed: generate.failed + publish.failed,
    publish: publish,
    ran_at: new Date().toISOString(),
  }
  console.log('[autopilot]', JSON.stringify(summary))
  return NextResponse.json(summary)
}
