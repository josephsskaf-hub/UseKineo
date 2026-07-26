// KINEO-AUTOPILOT-UI-2026-07-26 — a porta de entrada do cliente no Autopilot.
//
// O backend do Autopilot (migration 021 + lib/autopilot/* + o cron horário)
// estava completo e INALCANÇÁVEL: sem uma linha em `autopilot_schedules` o cron
// não acha nada e faz no-op para sempre. Esta rota é o único caminho pelo qual
// essa linha nasce.
//
// CONTRATO (tudo autenticado pela sessão Supabase, mesmo padrão de
// app/api/affiliate/apply/route.ts — cookie client para IDENTIDADE, service
// role para ESCRITA, sempre com `.eq('user_id', user.id)` explícito):
//
//   GET    → { entitled, plan, credits, creditCostPerVideo, channels[], schedules[] }
//   POST   → cria a agenda   { channelId?, niche?, tone?, postHourUtc, postsPerDay?, privacyStatus? }
//   PATCH  → { id, enabled?, niche?, tone?, postHourUtc?, postsPerDay?, privacyStatus?, engine? }
//   DELETE → ?id=<uuid> (ou body { id })
//
// TRÊS INVARIANTES QUE ESTA ROTA NÃO PODE QUEBRAR:
//
//   1. next_run_at NUNCA nasce NULL nem fica desatualizado. O cron seleciona
//      `enabled = true AND (next_run_at IS NULL OR next_run_at <= now())`. Uma
//      agenda com next_run_at NULL seria disparada na PRÓXIMA hora cheia, o que
//      contradiz o horário que o cliente escolheu; por isso computeNextRunAt()
//      roda na criação e em toda mudança de post_hour_utc / posts_per_day /
//      enabled. Um next_run_at parado no passado é igualmente ruim: a agenda
//      dispararia na primeira invocação do cron, em hora aleatória.
//
//   2. engine passa por clampAutopilotEngine() em TODA escrita. O corpo do
//      request é do cliente; sem o clamp um POST forjado com
//      engine='cinematic_hollywood' agendaria 30 renders/mês a ~$9 cada.
//
//   3. O canal apontado é do CALLER. channel_id vem do body; sem a verificação
//      de posse, um usuário publicaria no canal YouTube de outro.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin, type SupabaseClient } from '@supabase/supabase-js'
import { creditCostFor } from '@/lib/credits/engineCost'
import {
  AUTOPILOT_DEFAULT_ENGINE,
  clampAutopilotEngine,
  computeNextRunAt,
  isAutopilotEntitled,
  normalizePostHour,
  normalizePostsPerDay,
} from '@/lib/autopilot/config'
import { autopilotEvent, AUTOPILOT_SCHEDULES_EVENT_PATH } from '@/lib/autopilot/events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Quantas execuções recentes a UI mostra por agenda. O suficiente para o
// cliente ver "está postando", pequeno o bastante para caber num payload.
const RECENT_RUNS_LIMIT = 8

type PrivacyStatus = 'public' | 'private' | 'unlisted'

interface ProfileRow {
  has_paid?: boolean | null
  plan?: string | null
  is_pro?: boolean | null
  video_credits?: number | null
}

interface ChannelRow {
  id: string
  title: string | null
  thumbnail_url: string | null
  external_channel_id: string | null
  connected_at: string | null
  revoked_at: string | null
  refresh_token: string | null
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
  last_run_at: string | null
  next_run_at: string | null
  created_at: string | null
}

interface RunRow {
  id: string
  schedule_id: string
  status: string
  reason: string | null
  topic: string | null
  youtube_video_id: string | null
  error: string | null
  scheduled_for_date: string | null
  started_at: string | null
  finished_at: string | null
}

const SCHEDULE_COLUMNS =
  'id, user_id, channel_id, enabled, niche, tone, language, engine, post_hour_utc, posts_per_day, privacy_status, last_run_at, next_run_at, created_at'

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseAdmin(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizePrivacy(raw: unknown): PrivacyStatus {
  const v = (raw ?? '').toString().trim().toLowerCase()
  return v === 'private' || v === 'unlisted' ? v : 'public'
}

/** Texto livre do cliente. Corta tamanho e devolve null para string vazia. */
function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim().slice(0, max)
  return v.length > 0 ? v : null
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const parsed = await req.json()
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

interface Caller {
  userId: string
  profile: ProfileRow | null
  entitled: boolean
  admin: SupabaseClient
}

type CallerResult = { ok: true; caller: Caller } | { ok: false; response: NextResponse }

/**
 * Identidade + plano. A identidade SEMPRE vem do cookie de sessão; o corpo do
 * request nunca escolhe user_id. O plano vem do mesmo `profiles` que o cron lê,
 * então UI e cron concordam sobre quem tem direito ao Autopilot.
 */
async function resolveCaller(): Promise<CallerResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Sign in to use Autopilot.', code: 'unauthenticated' },
        { status: 401 },
      ),
    }
  }

  const admin = adminClient()
  if (!admin) {
    console.error('[autopilot/schedules] service role is not configured')
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Autopilot is temporarily unavailable.', code: 'server_misconfigured' },
        { status: 500 },
      ),
    }
  }

  const { data } = await admin
    .from('profiles')
    .select('has_paid, plan, is_pro, video_credits')
    .eq('id', user.id)
    .maybeSingle()
  const profile = (data as ProfileRow | null) ?? null

  return {
    ok: true,
    caller: { userId: user.id, profile, entitled: isAutopilotEntitled(profile), admin },
  }
}

/**
 * 402 com um code que a UI entende. Nunca 500 e nunca um formulário que aceita
 * o submit e depois rejeita: quem não tem direito vê o upgrade, não um erro.
 */
function notEntitled(plan: string | null | undefined): NextResponse {
  return NextResponse.json(
    {
      error: 'Autopilot is available on paid plans.',
      code: 'not_entitled',
      plan: plan ?? null,
    },
    { status: 402 },
  )
}

/** Canais ativos do caller. `revoked_at is null` = a mesma visão do cron. */
async function listChannels(admin: SupabaseClient, userId: string): Promise<ChannelRow[]> {
  const { data, error } = await admin
    .from('channels')
    .select('id, title, thumbnail_url, external_channel_id, connected_at, revoked_at, refresh_token')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('connected_at', { ascending: true })
  if (error) {
    console.error('[autopilot/schedules] channel list failed:', error.message)
    return []
  }
  return (data ?? []) as ChannelRow[]
}

function publicChannel(row: ChannelRow) {
  return {
    id: row.id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    externalChannelId: row.external_channel_id,
    connectedAt: row.connected_at,
    // O cron pula (`channel_disconnected`) quando não há refresh_token. A UI
    // precisa saber disso ANTES para pedir a reconexão, em vez de deixar o
    // cliente esperando um vídeo que nunca vem.
    needsReconnect: !row.refresh_token,
  }
}

function youtubeUrl(videoId: string | null): string | null {
  return videoId ? `https://www.youtube.com/shorts/${videoId}` : null
}

function publicSchedule(row: ScheduleRow, channel: ChannelRow | undefined, runs: RunRow[]) {
  return {
    id: row.id,
    channelId: row.channel_id,
    channelTitle: channel?.title ?? null,
    channelThumbnailUrl: channel?.thumbnail_url ?? null,
    channelNeedsReconnect: channel ? !channel.refresh_token : true,
    enabled: !!row.enabled,
    niche: row.niche,
    tone: row.tone,
    language: row.language ?? 'en',
    engine: clampAutopilotEngine(row.engine),
    postHourUtc: normalizePostHour(row.post_hour_utc),
    postsPerDay: normalizePostsPerDay(row.posts_per_day),
    privacyStatus: normalizePrivacy(row.privacy_status),
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      topic: r.topic,
      youtubeVideoId: r.youtube_video_id,
      youtubeUrl: youtubeUrl(r.youtube_video_id),
      error: r.error,
      scheduledForDate: r.scheduled_for_date,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
    })),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET — tudo que a página precisa numa chamada só.
// ═══════════════════════════════════════════════════════════════════════════
export async function GET() {
  try {
    const resolved = await resolveCaller()
    if (!resolved.ok) return resolved.response
    const { userId, profile, entitled, admin } = resolved.caller

    const channels = await listChannels(admin, userId)

    const { data: scheduleData, error: scheduleError } = await admin
      .from('autopilot_schedules')
      .select(SCHEDULE_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (scheduleError) {
      console.error('[autopilot/schedules] list failed:', scheduleError.message)
      return NextResponse.json(
        { error: 'Could not load your Autopilot settings.', code: 'read_failed' },
        { status: 500 },
      )
    }
    const schedules = (scheduleData ?? []) as ScheduleRow[]

    // Runs por agenda. Um usuário tem 1-3 agendas na prática, então N queries
    // pequenas custam menos que trazer o ledger inteiro e cortar em memória.
    const runsBySchedule = new Map<string, RunRow[]>()
    for (const s of schedules) {
      const { data: runData } = await admin
        .from('autopilot_runs')
        .select('id, schedule_id, status, reason, topic, youtube_video_id, error, scheduled_for_date, started_at, finished_at')
        .eq('user_id', userId)
        .eq('schedule_id', s.id)
        .order('started_at', { ascending: false })
        .limit(RECENT_RUNS_LIMIT)
      runsBySchedule.set(s.id, (runData ?? []) as RunRow[])
    }

    const channelById = new Map(channels.map((c) => [c.id, c]))

    return NextResponse.json({
      entitled,
      plan: profile?.plan ?? null,
      credits: typeof profile?.video_credits === 'number' ? profile.video_credits : 0,
      // O cliente merece ver o custo real por vídeo antes de ligar a agenda.
      // Vem de creditCostFor (a fonte única), nunca de um número escrito à mão.
      creditCostPerVideo: creditCostFor(AUTOPILOT_DEFAULT_ENGINE, true),
      channels: channels.map(publicChannel),
      schedules: schedules.map((s) =>
        publicSchedule(s, channelById.get(s.channel_id), runsBySchedule.get(s.id) ?? []),
      ),
    })
  } catch (err) {
    console.error('[autopilot/schedules] GET unexpected:', err)
    return NextResponse.json(
      { error: 'Could not load your Autopilot settings.', code: 'unexpected' },
      { status: 500 },
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST — criar a agenda. É ESTA linha que faz o cron enxergar o cliente.
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveCaller()
    if (!resolved.ok) return resolved.response
    const { userId, profile, entitled, admin } = resolved.caller

    if (!entitled) {
      await autopilotEvent('autopilot_schedule_blocked', {
        userId,
        path: AUTOPILOT_SCHEDULES_EVENT_PATH,
        metadata: { reason: 'not_entitled', plan: profile?.plan ?? null },
      })
      return notEntitled(profile?.plan)
    }

    const body = await readBody(req)

    // ── CANAL: existe, é do caller, e ainda dá para publicar nele ──────────
    const channels = await listChannels(admin, userId)
    if (channels.length === 0) {
      return NextResponse.json(
        { error: 'Connect your YouTube channel first.', code: 'no_channel' },
        { status: 400 },
      )
    }
    const requestedChannelId = cleanText(body.channelId, 64)
    const channel = requestedChannelId
      ? channels.find((c) => c.id === requestedChannelId)
      : channels[0]
    if (!channel) {
      // Também é a resposta para "esse canal é de outra pessoa": listChannels já
      // filtrou por user_id, então um id alheio simplesmente não está aqui.
      return NextResponse.json(
        { error: 'That channel is not connected to your account.', code: 'channel_not_found' },
        { status: 404 },
      )
    }
    if (!channel.refresh_token) {
      return NextResponse.json(
        {
          error: 'Reconnect your YouTube channel — Kineo lost permission to post to it.',
          code: 'channel_reconnect_required',
        },
        { status: 409 },
      )
    }

    // Uma agenda por canal. Duas agendas no mesmo canal postariam duas vezes
    // por dia sem o cliente pedir (a trava anti-duplo-post é por SCHEDULE).
    const { data: existing } = await admin
      .from('autopilot_schedules')
      .select('id')
      .eq('user_id', userId)
      .eq('channel_id', channel.id)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        {
          error: 'Autopilot is already set up for this channel.',
          code: 'schedule_exists',
          id: (existing as { id: string }).id,
        },
        { status: 409 },
      )
    }

    const postHourUtc = normalizePostHour(body.postHourUtc)
    const postsPerDay = normalizePostsPerDay(body.postsPerDay ?? 1)
    // INVARIANTE 1 — a agenda nasce com o próximo horário já resolvido.
    const nextRunAt = computeNextRunAt({ from: new Date(), postHourUtc, postsPerDay })

    const insertRow = {
      user_id: userId,
      channel_id: channel.id,
      enabled: true,
      niche: cleanText(body.niche, 80),
      tone: cleanText(body.tone, 80),
      language: 'en', // KINEO: o produto é English-only.
      // INVARIANTE 2 — o motor NUNCA vem cru do cliente.
      engine: clampAutopilotEngine(cleanText(body.engine, 40)),
      post_hour_utc: postHourUtc,
      posts_per_day: postsPerDay,
      privacy_status: normalizePrivacy(body.privacyStatus),
      next_run_at: nextRunAt.toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: created, error: insertError } = await admin
      .from('autopilot_schedules')
      .insert(insertRow)
      .select(SCHEDULE_COLUMNS)
      .maybeSingle()

    if (insertError || !created) {
      console.error('[autopilot/schedules] insert failed:', insertError?.message)
      return NextResponse.json(
        { error: 'Could not turn Autopilot on. Try again.', code: 'insert_failed' },
        { status: 500 },
      )
    }

    const row = created as ScheduleRow
    await autopilotEvent('autopilot_schedule_created', {
      userId,
      scheduleId: row.id,
      channelId: channel.id,
      path: AUTOPILOT_SCHEDULES_EVENT_PATH,
      metadata: {
        niche: row.niche,
        post_hour_utc: row.post_hour_utc,
        posts_per_day: row.posts_per_day,
        privacy_status: row.privacy_status,
        engine: row.engine,
        next_run_at: row.next_run_at,
        plan: profile?.plan ?? null,
      },
    })

    return NextResponse.json(
      { ok: true, schedule: publicSchedule(row, channel, []) },
      { status: 201 },
    )
  } catch (err) {
    console.error('[autopilot/schedules] POST unexpected:', err)
    return NextResponse.json(
      { error: 'Could not turn Autopilot on. Try again.', code: 'unexpected' },
      { status: 500 },
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCH — pausar/retomar e ajustar a agenda.
// ═══════════════════════════════════════════════════════════════════════════
export async function PATCH(req: NextRequest) {
  try {
    const resolved = await resolveCaller()
    if (!resolved.ok) return resolved.response
    const { userId, profile, entitled, admin } = resolved.caller

    const body = await readBody(req)
    const id = cleanText(body.id, 64)
    if (!id) {
      return NextResponse.json(
        { error: 'Missing schedule id.', code: 'missing_id' },
        { status: 400 },
      )
    }

    const { data: currentData } = await admin
      .from('autopilot_schedules')
      .select(SCHEDULE_COLUMNS)
      .eq('id', id)
      .eq('user_id', userId) // posse: um id alheio simplesmente não retorna.
      .maybeSingle()
    const current = (currentData as ScheduleRow | null) ?? null
    if (!current) {
      return NextResponse.json(
        { error: 'Autopilot schedule not found.', code: 'not_found' },
        { status: 404 },
      )
    }

    // PAUSAR não exige plano — nunca prenda um cliente que perdeu o
    // entitlement dentro de uma agenda que ele não consegue desligar. Qualquer
    // outra edição (e RETOMAR) exige.
    const wantsEnable = typeof body.enabled === 'boolean' ? (body.enabled as boolean) : null
    const onlyPausing =
      wantsEnable === false &&
      ['niche', 'tone', 'postHourUtc', 'postsPerDay', 'privacyStatus', 'engine'].every(
        (k) => body[k] === undefined,
      )
    if (!entitled && !onlyPausing) {
      return notEntitled(profile?.plan)
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.niche !== undefined) patch.niche = cleanText(body.niche, 80)
    if (body.tone !== undefined) patch.tone = cleanText(body.tone, 80)
    if (body.privacyStatus !== undefined) patch.privacy_status = normalizePrivacy(body.privacyStatus)
    // INVARIANTE 2 novamente: mesmo num PATCH, o motor passa pelo teto.
    if (body.engine !== undefined) patch.engine = clampAutopilotEngine(cleanText(body.engine, 40))

    const nextHour =
      body.postHourUtc !== undefined
        ? normalizePostHour(body.postHourUtc)
        : normalizePostHour(current.post_hour_utc)
    const nextPerDay =
      body.postsPerDay !== undefined
        ? normalizePostsPerDay(body.postsPerDay)
        : normalizePostsPerDay(current.posts_per_day)
    if (body.postHourUtc !== undefined) patch.post_hour_utc = nextHour
    if (body.postsPerDay !== undefined) patch.posts_per_day = nextPerDay

    if (wantsEnable !== null) patch.enabled = wantsEnable

    // ── INVARIANTE 1: quando recalcular next_run_at ────────────────────────
    // • Mudou hora ou cadência → o valor antigo aponta para o horário errado.
    // • Retomando (enabled false→true) → o next_run_at guardado ficou no
    //   PASSADO enquanto a agenda estava pausada; deixá-lo assim faria o cron
    //   disparar na primeira invocação, numa hora que o cliente não escolheu.
    const cadenceChanged =
      (body.postHourUtc !== undefined && nextHour !== normalizePostHour(current.post_hour_utc)) ||
      (body.postsPerDay !== undefined && nextPerDay !== normalizePostsPerDay(current.posts_per_day))
    const resuming = wantsEnable === true && current.enabled === false
    if (cadenceChanged || resuming) {
      patch.next_run_at = computeNextRunAt({
        from: new Date(),
        postHourUtc: nextHour,
        postsPerDay: nextPerDay,
      }).toISOString()
    }

    const { data: updated, error: updateError } = await admin
      .from('autopilot_schedules')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select(SCHEDULE_COLUMNS)
      .maybeSingle()

    if (updateError || !updated) {
      console.error('[autopilot/schedules] update failed:', updateError?.message)
      return NextResponse.json(
        { error: 'Could not save that change.', code: 'update_failed' },
        { status: 500 },
      )
    }

    const row = updated as ScheduleRow
    const eventName =
      wantsEnable === false
        ? 'autopilot_schedule_paused'
        : resuming
          ? 'autopilot_schedule_resumed'
          : 'autopilot_schedule_updated'
    await autopilotEvent(eventName, {
      userId,
      scheduleId: row.id,
      channelId: row.channel_id,
      path: AUTOPILOT_SCHEDULES_EVENT_PATH,
      metadata: {
        enabled: row.enabled,
        niche: row.niche,
        post_hour_utc: row.post_hour_utc,
        posts_per_day: row.posts_per_day,
        privacy_status: row.privacy_status,
        next_run_at: row.next_run_at,
        changed: Object.keys(patch).filter((k) => k !== 'updated_at'),
      },
    })

    const channels = await listChannels(admin, userId)
    return NextResponse.json({
      ok: true,
      schedule: publicSchedule(row, channels.find((c) => c.id === row.channel_id), []),
    })
  } catch (err) {
    console.error('[autopilot/schedules] PATCH unexpected:', err)
    return NextResponse.json(
      { error: 'Could not save that change.', code: 'unexpected' },
      { status: 500 },
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE — desligar de vez.
// ═══════════════════════════════════════════════════════════════════════════
// Sem gate de entitlement de propósito: quem cancelou o plano continua podendo
// apagar a própria agenda. (As runs somem junto por ON DELETE CASCADE — é o
// histórico da agenda que morreu, não o ledger de outra pessoa.)
export async function DELETE(req: NextRequest) {
  try {
    const resolved = await resolveCaller()
    if (!resolved.ok) return resolved.response
    const { userId, admin } = resolved.caller

    const fromQuery = req.nextUrl.searchParams.get('id')
    const id = cleanText(fromQuery, 64) ?? cleanText((await readBody(req)).id, 64)
    if (!id) {
      return NextResponse.json(
        { error: 'Missing schedule id.', code: 'missing_id' },
        { status: 400 },
      )
    }

    const { data: deleted, error } = await admin
      .from('autopilot_schedules')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, channel_id')

    if (error) {
      console.error('[autopilot/schedules] delete failed:', error.message)
      return NextResponse.json(
        { error: 'Could not turn Autopilot off.', code: 'delete_failed' },
        { status: 500 },
      )
    }
    const rows = (deleted ?? []) as Array<{ id: string; channel_id: string }>
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Autopilot schedule not found.', code: 'not_found' },
        { status: 404 },
      )
    }

    await autopilotEvent('autopilot_schedule_deleted', {
      userId,
      scheduleId: rows[0].id,
      channelId: rows[0].channel_id,
      path: AUTOPILOT_SCHEDULES_EVENT_PATH,
    })

    return NextResponse.json({ ok: true, id: rows[0].id })
  } catch (err) {
    console.error('[autopilot/schedules] DELETE unexpected:', err)
    return NextResponse.json(
      { error: 'Could not turn Autopilot off.', code: 'unexpected' },
      { status: 500 },
    )
  }
}
