import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { pollCreatomateRender } from '@/lib/compose'
import { persistRenderAssets } from '@/lib/renderAssets'
import { refundRenderCredits } from '@/lib/credits/refund'
import { buildBrandedYouTubeDescription } from '@/lib/videoDescription'
// KINEO-TRIAL-BLOCKERS-2026-08-07 — trial ativo é entitlement pago (ver
// lib/reverseTrial.ts). Flag OFF ⇒ isTrialActive() é sempre false.
import { isTrialActive, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'
// KINEO-CREDIT-INTENT-2026-07-11 — the billing decision now reads the engine
// (and price) from the server-side render_jobs intent row, NEVER from the
// client's ?quality / ?deducted query params. creditCostFor is the single
// shared price table (was a local copy here).
import { creditCostFor, normalizeQuality, creditCostForDuration } from '@/lib/credits/engineCost'
// KINEO-REVERSE-TRIAL-P1-2026-08-06 — todo débito passa pelo wrapper único
// (mesmo RPC; com a flag OFF é byte-idêntico ao rpc direto).
import { debitVideoCredits } from '@/lib/credits/debit'
import { releaseFailedFreeFastClaim, settleComposeCreditHoldForRender } from '@/lib/credits/composeHold'
import { getRenderIntent } from '@/lib/credits/renderIntent'
// KINEO-TITULO-SOBREVIVE-2026-08-22 — o claim de submissao guarda o TEMA para
// quando a URL nao trouxer (cron de resgate, worker de demo). Só o tema: a
// descricao do YouTube nunca passa pelo /api/compose (o tsc me mostrou isso ao
// recusar `body.youtubeDescription`), entao nao ha o que guardar la.
import { COMPOSE_CLAIM_EVENT } from '@/lib/composeClaim'
import {
  loadPrepaidAvatarClaimForRender,
  settleAvatarCreditHoldForRender,
  type VerifiedAvatarBirthClaim,
} from '@/lib/avatar/reservation'
import {
  loadSettledCinematicClaimForRender,
  // KINEO-CREDIT-STUCK-2026-08-08 — o estorno ao vivo precisa LANDAR o claim em
  // `released`, senão a próxima leitura ainda o vê `settled` (débito vivo) e um
  // render futuro seria tratado como pré-pago sem que ninguém tenha pago.
  releaseCinematicClaim,
  type CinematicClaim,
} from '@/lib/cinematic/claim'

// Push #230 — bumped 30→60 to give the post-render asset migration
// (download Creatomate video + thumbnail, re-upload to Supabase Storage)
// headroom on the single "done" poll. Matches /api/generate-video-fast.
export const maxDuration = 60
// Push #050 — this route reads auth cookies and writes to the videos
// table; explicit dynamic so Next never tries to prerender it.
export const dynamic = 'force-dynamic'

// feature/ai-avatar — 'avatar' added.
// KINEO-AVATAR-120-2026-07-06 — avatar is now billed like every other engine:
// 120 UNIVERSAL video_credits, deducted on SUCCESS only through the standard
// debit_video_credits path (avatar is in the shouldDeductCredits whitelist).
// The old separate avatar_credits / debit_avatar_credit billing was retired.
// Protection rule intact: a failed render never charges (debit is success-only,
// idempotent by render_id).
// KINEO-HOLLYWOOD-2026-07-09 — 'cinematic_hollywood' added (260 cr, provisional).
type Quality = 'fast' | 'basic' | 'basic_ai' | 'pro' | 'cinematic_ai' | 'cinematic_kling' | 'cinematic_veo' | 'cinematic_sora' | 'cinematic_hollywood' | 'cinematic_h3' | 'avatar' | 'presenter'

// KINEO-CREDIT-INTENT-2026-07-11 — creditCostFor moved to
// lib/credits/engineCost.ts so the render-BIRTH route (/api/compose) and this
// render-SETTLE route price every engine from the SAME table (no drift). The
// isPaidUser arg still lets Fast cost 1 credit for paying accounts / 0 for free.

// Push #050 — persist the finished video to `videos` so it appears in
// Visual History on the Generate page and on /history. Writes through
// the service-role admin client so RLS doesn't block us.
//
// Push #357 — rewritten as a SINGLE canonical INSERT against the real
// production schema (was a staging/legacy/minimal fallback chain that masked
// the `video_url`/`quality_mode` vs `final_video_url`/`quality` mismatch and
// silently dropped render_id, leaving the anti-duplicate index inactive).
//
// Still best-effort: a failure logs (console.error) but never throws — Visual
// History must never block returning the video URL to the client. The one
// hard guarantee now is that a SUCCESS row always carries render_id.
async function persistCompletedVideo(args: {
  userId: string
  renderId: string
  videoUrl: string
  snapshotUrl: string | null
  quality: Quality
  duration: number
  topic: string
  creditsUsed: number
  // PUSH #100 — descrição já BRANDED (helper aplicado pelo caller). Vazio =
  // não escreve a coluna, deixando o /api/video-summary preencher depois.
  youtubeDescription?: string
}): Promise<{ ok: boolean; id?: string; error?: string; duplicate?: boolean }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.warn('[history] persist skipped — NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
    return { ok: false, error: 'service-role env missing' }
  }
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Push #357 — SINGLE canonical INSERT against the real production `videos`
  // schema. The old staging/legacy/minimal fallback chain masked the schema
  // mismatch (prod has `video_url`/`quality_mode`, not `final_video_url`/
  // `quality`) and silently fell through to a minimal row that DROPPED
  // render_id — which left videos_render_id_unique inactive (NULL render_id is
  // excluded by the partial index) and let duplicates back in. We now write
  // render_id ALWAYS, plus every other relevant column, in one shot.
  //
  // Real prod columns: user_id, title, video_url, thumbnail_url, platform,
  // duration, quality_mode, credits_used, niche, topic, script, hashtags,
  // youtube_description, status, render_id.

  // Derive a short, human-readable title from the topic/script: first
  // non-empty line, with any [Pexels: ...] / bracketed directives stripped.
  const derivedTitle =
    (args.topic.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? args.topic)
      .replace(/\[[^\]]*\]/g, '')
      .trim()
      .slice(0, 120) || null

  // PUSH #100 — a página pública /v/[id] mostra o bloco "Video description"
  // lendo videos.youtube_description, mas o insert nunca gravava essa coluna:
  // todo vídeo novo nascia com o bloco vazio e sem link do Kineo. A coluna
  // existe em produção (public.videos.youtube_description, text, nullable).
  const row: Record<string, unknown> = {
    user_id: args.userId,
    status: 'completed',
    video_url: args.videoUrl,
    thumbnail_url: args.snapshotUrl ?? null,
    render_id: args.renderId, // never null for a success row → keeps unique index ACTIVE
    topic: args.topic,
    title: derivedTitle,
    platform: 'YouTube Shorts',
    duration: args.duration,
    quality_mode: args.quality,
    credits_used: args.creditsUsed,
  }
  const brandedDescription = (args.youtubeDescription ?? '').trim()
  if (brandedDescription) row.youtube_description = brandedDescription

  console.log('[history] insert (canonical schema #357):', JSON.stringify({
    user_id_prefix: args.userId.slice(0, 8),
    render_id: args.renderId,
    video_url_host: safeUrlHost(args.videoUrl),
    duration: args.duration,
    quality_mode: args.quality,
    credits_used: args.creditsUsed,
    has_thumbnail: !!args.snapshotUrl,
  }))

  const { data, error } = await admin
    .from('videos')
    .insert(row)
    .select('id')
    .maybeSingle()

  if (!error) {
    const id = data?.id ?? '?'
    console.log(`[history] insert OK id=${id} render_id=${args.renderId}`)
    return { ok: true, id: String(id) }
  }

  // Idempotency: 23505 on videos_render_id_unique means this render was already
  // persisted (refresh / multi-tab / multi-session re-poll). Not a failure —
  // log explicitly for tracing and skip the re-insert.
  if ((error as { code?: string }).code === '23505') {
    console.log(`[history] DUPLICATE render_id=${args.renderId} — already persisted (videos_render_id_unique); skipping re-insert`)
    const { data: existing } = await admin
      .from('videos')
      .select('id')
      .eq('render_id', args.renderId)
      .eq('user_id', args.userId)
      .maybeSingle()
    return { ok: true, duplicate: true, id: existing?.id ? String(existing.id) : undefined }
  }

  // Real failure — never swallow silently. Surface the full PostgREST error.
  console.error('[history] insert FAILED:', JSON.stringify({
    code: (error as { code?: string }).code,
    message: error.message,
    details: (error as { details?: string }).details,
    hint: (error as { hint?: string }).hint,
    render_id: args.renderId,
  }))
  return { ok: false, error: error.message }
}

async function findCompletedVideoId(userId: string, renderId: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  try {
    const admin = createAdminClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await admin
      .from('videos')
      .select('id')
      .eq('render_id', renderId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.warn('[history] share-id lookup failed:', error.message)
      return null
    }
    return data?.id ? String(data.id) : null
  } catch (error) {
    console.warn('[history] share-id lookup threw:', error instanceof Error ? error.message : String(error))
    return null
  }
}

function safeUrlHost(u: string): string {
  try {
    return new URL(u).host
  } catch {
    return 'invalid-url'
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { renderId: string } }
) {
  try {
    // KINEO-SERVICE-FINISH-2026-08-19 — espelho do modo serviço do /api/compose
    // (ver comentário lá): o finisher de renders órfãos consulta o status em
    // nome do dono. Fail-closed; validação de posse do render continua igual.
    const svcSecret = process.env.CRON_SECRET
    const svcUserHeader = (req.headers.get('x-kineo-service-user') ?? '').trim()
    const isServiceFinish =
      !!svcSecret &&
      req.headers.get('authorization') === `Bearer ${svcSecret}` &&
      /^[0-9a-f-]{36}$/i.test(svcUserHeader)
    // Mesma auditoria do /api/compose (19/08): usos downstream de `supabase`
    // são operações já escopadas pelo fluxo (push endpoints do próprio fetch,
    // etc.) — client admin preserva o comportamento no modo serviço.
    let supabase: SupabaseClient
    let user: { id: string; email?: string | null } | null = null
    if (isServiceFinish) {
      const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!svcUrl || !svcKey) {
        return NextResponse.json({ error: 'Service mode unavailable.' }, { status: 503 })
      }
      supabase = createAdminClient(svcUrl, svcKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: svcProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', svcUserHeader)
        .maybeSingle()
      user = { id: svcUserHeader, email: svcProfile?.email ?? null }
    } else {
      supabase = createServerSupabase()
      const auth = await supabase.auth.getUser()
      user = auth.data.user
    }
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }

    const renderId = (params.renderId ?? '').trim()
    if (!renderId) {
      return NextResponse.json({ error: 'renderId is required.' }, { status: 400 })
    }

    // ── KINEO-CREDIT-INTENT-2026-07-11 — AUTHORITATIVE ENGINE FROM THE SERVER ──
    // The billing decision must NEVER trust the client. /api/compose recorded
    // the real engine + intended cost in render_jobs, keyed by render_id, at
    // render BIRTH. We read it here and it WINS over the ?quality query param.
    // Forging ?quality=fast (to make a 110-credit Avatar settle as a free Fast
    // video) no longer works — the recurrence of "avatar nunca debitava por
    // quality ausente" is closed.
    const resumeRequested = req.nextUrl.searchParams.get('resume') === '1'
    const intent = await getRenderIntent(renderId)
    if (intent === undefined) {
      return NextResponse.json(
        { error: 'Render ownership is temporarily unavailable. Please retry.' },
        { status: 503 },
      )
    }
    // A restored client snapshot is not an authority boundary. Resume is
    // allowed only when the server-side render intent exists and belongs to the
    // authenticated user; missing/mismatched ids fail closed without revealing
    // whether another user's render exists.
    if (intent && intent.userId !== user.id) {
      return NextResponse.json({ error: 'Render not found.' }, { status: 404 })
    }
    if (resumeRequested && !intent) {
      return NextResponse.json({ error: 'No resumable render found.' }, { status: 404 })
    }
    // A provider render id by itself is not authorization. All current render
    // paths publish a signed/server-side intent before returning the id; fail
    // closed for legacy or orphan ids instead of polling and exposing a URL to
    // whichever authenticated user guessed it.
    if (!intent) {
      return NextResponse.json({ error: 'Render not found.' }, { status: 404 })
    }
    const hasServerIntent = !!intent && intent.userId === user.id

    // Legacy fallback (no intent row = a render created before this deploy, or a
    // path that didn't record intent): keep the historical client-param parse.
    const qParam = (req.nextUrl.searchParams.get('quality') ?? 'basic_ai').toString()
    // Push #361 — REVENUE-LEAK FIX: an unlisted quality silently collapses to
    // 'basic_ai' (which charges nothing). normalizeQuality applies that same
    // defensive default to BOTH the intent value and the legacy query param.
    const clientQuality: Quality = normalizeQuality(qParam)
    const quality: Quality = hasServerIntent ? normalizeQuality(intent!.quality) : clientQuality
    const isFreeFastIntent =
      hasServerIntent && quality === 'fast' && intent!.cost === 0
    const isCinematicQuality =
      quality === 'cinematic_ai' || quality === 'cinematic_kling' ||
      quality === 'cinematic_veo' || quality === 'cinematic_sora' ||
      quality === 'cinematic_hollywood' || quality === 'cinematic_h3'
    let prepaidCinematicClaim: CinematicClaim | null = null
    let prepaidAvatarClaim: VerifiedAvatarBirthClaim | null = null
    // KINEO-CREDIT-STUCK-2026-08-08 — era `ReturnType<typeof createAdminClient>`.
    // Esse tipo instancia os genéricos do supabase-js com `unknown`, e aí toda
    // tabela vira `never` (um `.insert({...})` não compila). `SupabaseClient` é o
    // MESMO valor em runtime, com o default `any` do schema — é o tipo que
    // lib/credits/refund.ts e lib/cinematic/claim.ts já usam.
    let cinematicAdmin: SupabaseClient | null = null
    let cinematicSecret = ''
    if (hasServerIntent && isCinematicQuality) {
      const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      cinematicSecret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
      if (!adminUrl || !cinematicSecret) {
        return NextResponse.json(
          { error: 'Cinematic billing verification is temporarily unavailable.' },
          { status: 503 },
        )
      }
      cinematicAdmin = createAdminClient(adminUrl, cinematicSecret, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const prepaid = await loadSettledCinematicClaimForRender({
        db: cinematicAdmin,
        secret: cinematicSecret,
        userId: user.id,
        renderId,
      })
      if (!prepaid.ok) {
        console.error('[compose/status] cinematic billing verification failed:', prepaid.error)
        return NextResponse.json(
          { error: 'Cinematic billing verification is temporarily unavailable.' },
          { status: 503 },
        )
      }
      prepaidCinematicClaim = prepaid.claim
    }
    if (hasServerIntent && (quality === 'avatar' || quality === 'presenter')) {
      const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
      if (!adminUrl || !secret) {
        return NextResponse.json(
          { error: 'Avatar billing verification is temporarily unavailable.' },
          { status: 503 },
        )
      }
      const admin = createAdminClient(adminUrl, secret, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const prepaid = await loadPrepaidAvatarClaimForRender({
        db: admin,
        secret,
        userId: user.id,
        renderId,
      })
      if (!prepaid.ok || !prepaid.claim) {
        console.error('[compose/status] avatar billing verification failed:', prepaid.ok ? 'claim missing' : prepaid.error)
        return NextResponse.json(
          { error: 'Avatar billing verification is temporarily unavailable.' },
          { status: 503 },
        )
      }
      prepaidAvatarClaim = prepaid.claim
    }

    const deductedParam = req.nextUrl.searchParams.get('deducted') === '1'
    // KINEO-CREDIT-INTENT — when we have server-side intent, the client's
    // "deducted=1" claim is IGNORED. Double-charge is still prevented server-side
    // by (a) debit_video_credits idempotency (PK render_id) and (b) the
    // videos-row guard below. The client bypass only survives for legacy
    // (no-intent) renders, where behavior is unchanged.
    const skipClientDeducted = hasServerIntent ? false : deductedParam
    if (hasServerIntent && quality !== clientQuality) {
      console.log(`[compose/status] intent override render=${renderId}: client sent '${clientQuality}', charging as '${quality}'`)
    }

    // Push #050 — topic + duration travel as query params so we can record
    // them in the videos history row on success. Both are optional: the
    // route still works without them, the history row just has nulls.
    // ⚠️ KINEO-DURACAO-REAL-2026-08-20 — este fallback cravado de 30 é o que
    // gravou "30 segundos" num vídeo de 65. Quem chama sem `?duration=` (o cron
    // de resgate, que hoje monta boa parte dos filmes) caía direto nele.
    // A duração pedida NUNCA foi a entregue: a narração é o trilho mestre e o
    // vídeo fecha onde a fala termina. Guardar o pedido no lugar do entregue
    // fez o painel mentir e me fez tirar conclusão errada sobre monetização.
    // A verdade agora vem de quem montou o arquivo (Creatomate), e o parâmetro
    // vira só o palpite inicial enquanto o render não terminou.
    const durationParam = Number(req.nextUrl.searchParams.get('duration') ?? '')
    const requestedDuration = Number.isFinite(durationParam) && durationParam > 0 ? Math.floor(durationParam) : 60
    let duration = requestedDuration
    const topic = (req.nextUrl.searchParams.get('topic') ?? '').toString().slice(0, 1000)
    // PUSH #100 — ready-to-paste YouTube description from /api/analyze-idea,
    // forwarded by the composer so the history row (and the public /v/[id]
    // page) is born with the same branded text the user copies. Same 600-char
    // cap analyze-idea applies to youtube_description.
    const ytDescriptionParam = (req.nextUrl.searchParams.get('ytdesc') ?? '').toString().slice(0, 600)

    // ═══ KINEO-TITULO-SOBREVIVE-2026-08-22 — FALLBACK PELO CLAIM ═══════════
    // Se o tema/descrição não vieram na URL, busca no claim de submissão, que
    // o /api/compose grava com os dois campos. Ver o bloco de mesmo nome lá
    // para a medição (44% dos vídeos de 21/08 nasceram "Untitled Short").
    //
    // Por que só quando falta: o parâmetro da URL é o caminho normal e o mais
    // fresco — a aba do usuário tem o texto que ele acabou de ver na tela. O
    // claim é a rede embaixo, para quando quem persiste o vídeo é o cron de
    // resgate ou o worker de demo, que não têm requisição de cliente nenhuma.
    //
    // Uma leitura a mais no banco só no caminho degradado; zero custo no
    // caminho feliz. E nunca lança: falhar aqui devolveria o comportamento
    // atual (campo vazio), nunca algo pior que ele.
    let topicFromClaim = ''
    if (!topic) {
      try {
        const claimUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const claimKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const claimDb = claimUrl && claimKey
          ? createAdminClient(claimUrl, claimKey, { auth: { persistSession: false, autoRefreshToken: false } })
          : null
        const { data: claimRow } = !claimDb ? { data: null } : await claimDb
          .from('events')
          .select('metadata')
          .eq('name', COMPOSE_CLAIM_EVENT)
          .eq('metadata->>render_id', renderId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const md = (claimRow?.metadata ?? {}) as Record<string, unknown>
        if (typeof md.topic === 'string') topicFromClaim = md.topic.slice(0, 1000)
      } catch (e) {
        console.warn('[compose/status] claim lookup for topic failed:', e instanceof Error ? e.message : String(e))
      }
    }
    const topicFinal = topic || topicFromClaim

    if (!process.env.CREATOMATE_API_KEY) {
      return NextResponse.json(
        { error: 'Render service is not configured.' },
        { status: 500 }
      )
    }

    let state
    try {
      state = await pollCreatomateRender(renderId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[compose/status] poll failed:', msg)
      return NextResponse.json(
        { error: 'Render service unreachable.' },
        { status: 502 }
      )
    }

    if (state.status === 'succeeded' && state.url) {
      // KINEO-DURACAO-REAL-2026-08-20 — a partir daqui, `duration` é a duração
      // do ARQUIVO (o Creatomate acabou de montá-lo e sabe o número exato). O
      // valor pedido só sobrevive se o fornecedor não devolver a medida.
      if (typeof state.durationSeconds === 'number' && state.durationSeconds > 0) {
        duration = Math.round(state.durationSeconds)
      }
      if (prepaidCinematicClaim?.status === 'released') {
        return NextResponse.json({
          phase: 'failed',
          // KINEO-FAILURE-REASON-2026-07-30 — see the note on the client's
          // failure tracking: `phase:'failed'` has three unrelated causes and
          // they used to be indistinguishable in the events table.
          failure_reason: 'cinematic_claim_released',
          error: 'This cinematic generation was closed and its credits were refunded.',
          creditsRefunded: prepaidCinematicClaim.creditCost,
          progress: 0,
        })
      }
      let creditsDeducted = prepaidCinematicClaim !== null || prepaidAvatarClaim !== null
      let creditsRemaining: number | null = null

      // KINEO-PRICING-V3C-2026-07-10 — Fast costs 1 credit for PAYING accounts
      // only. New renders use their signed server intent; this profile lookup is
      // retained solely for legacy renders that predate intent storage.
      let fastIsPaidUser = false
      if (quality === 'fast' && !skipClientDeducted) {
        try {
          const { data: payerProf } = await supabase
            .from('profiles')
            .select(`has_paid, plan, ${TRIAL_ENTITLEMENT_COLUMNS}`)
            .eq('id', user.id)
            .maybeSingle()
          const PAID_PLANS = new Set([
            'starter', 'starter_trial', 'basic', 'basic_trial',
            'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial',
          ])
          const planName = ((payerProf as { plan?: string } | null)?.plan ?? 'free').toLowerCase()
          // KINEO-TRIAL-BLOCKERS-2026-08-07 — só o caminho LEGADO (render sem
          // intent assinado) chega aqui; todo render novo é liquidado pelo
          // `intentCost`, que /api/compose já grava com o custo do trial (1
          // crédito para o Fast). O termo entra mesmo assim para os dois
          // caminhos não divergirem: um render legado de uma conta em trial
          // seria liquidado a 0 e depois classificado como asset com marca
          // d'água pelo `credits_used === 0` do histórico.
          fastIsPaidUser =
            (payerProf as { has_paid?: boolean } | null)?.has_paid === true ||
            PAID_PLANS.has(planName) ||
            isTrialActive(payerProf)
        } catch (e) {
          console.warn('[fast-credit] legacy paid-status lookup failed:',
            e instanceof Error ? e.message : String(e))
        }
      }
      // The render-birth route signed and stored the exact cost. Pin settlement
      // to that value so an upgrade/downgrade while the provider is rendering
      // cannot turn a free Fast preview into a debit (or a paid Fast render into
      // a free one). Legacy renders without a valid intent keep the old lookup.
      const intentCost =
        hasServerIntent && typeof intent!.cost === 'number' &&
        Number.isFinite(intent!.cost) && Number.isInteger(intent!.cost) &&
        intent!.cost >= 0 && intent!.cost <= 1000
          ? intent!.cost
          : null
      // KINEO-DURACAO-FIX2-2026-08-21 — o SETTLE é a cobrança final. Se ele
      // usar o preço de 60s enquanto o claim nasceu proporcional, o débito
      // diverge da reserva e o render é recusado depois de pago. O `intentCost`
      // (gravado no nascimento) continua tendo prioridade — o fallback é que
      // precisava escalar junto. `duration` aqui já é a REAL do arquivo quando
      // o render terminou; para o cálculo de custo isso é conservador e certo.
      const cost = intentCost ?? creditCostForDuration(quality, fastIsPaidUser, duration)

      // Push #230 — URL returned to the client. Defaults to the Creatomate
      // output; upgraded to the permanent Supabase URL after the asset
      // migration runs on the first "done" poll.
      let responseVideoUrl = state.url
      let persistedVideoId: string | null = null

      // Push #088 — Cinematic renders (any non-'fast' quality) no longer
      // deduct from `video_credits`. They were already paid for by a
      // cinematic_token consumed upstream in /api/generate-video. Only
      // Fast Mode still draws from the regular credit pool.
      // Push #315 — cinematic_ai also deducts from video_credits (3 credits).
      // KINEO-AVATAR-120-2026-07-06 — 'avatar' added to the standard
      // video_credits deduction whitelist. Avatar now charges 120 universal
      // credits (creditCostFor('avatar')=120) through the SAME atomic
      // debit_video_credits RPC as the cinematic engines — success-only,
      // idempotent by render_id. The separate avatar_credits debit block was
      // deleted below, so there is exactly one debit path (no double-charge).
      // KINEO-ZERO-SIGNUP-2026-07-09 — 'fast' removed from the whitelist: Fast
      // renders are free (creditCostFor('fast')=0), so there is nothing to debit.
      // KINEO-HOLLYWOOD-2026-07-09 — cinematic_hollywood debits like the other
      // fal engines (success-only, idempotent by render_id; the existing
      // auto-refund on failure covers it too).
      // KINEO-PRICING-V3C-2026-07-10 — 'fast' is back in the whitelist ONLY for
      // paying accounts (fastIsPaidUser). Free Fast stays out (nothing to debit).
      const shouldDeductCredits =
        (!prepaidCinematicClaim && isCinematicQuality) ||
        (!prepaidAvatarClaim && (quality === 'avatar' || quality === 'presenter')) ||
        (quality === 'fast' && (intentCost !== null ? intentCost > 0 : fastIsPaidUser))

      // Server-side idempotency guard (push #fix-double-deduction):
      // Check whether this render_id has already been persisted in `videos`.
      // The client-side `deducted=1` param only works within a single browser
      // session — a page refresh, mobile browser, or second tab resets the
      // client ref to false, causing a second deduction for the same render.
      // By checking the DB here we prevent double-charging regardless of
      // how many sessions are polling this render concurrently.
      // KINEO-AVATAR-120-2026-07-06 — avatar is now inside shouldDeductCredits,
      // so this guard covers it (no separate isAvatarRender term needed).
      let serverAlreadyDeducted = false
      if (shouldDeductCredits && !skipClientDeducted) {
        try {
          // The videos table is readable by the owner via RLS (SELECT policy).
          // We use render_id + user_id to confirm this exact render was already
          // persisted (and therefore already charged) for THIS user.
          const { data: existingRow } = await supabase
            .from('videos')
            .select('id')
            .eq('render_id', renderId)
            .eq('user_id', user.id)
            .maybeSingle()
          if (existingRow) {
            serverAlreadyDeducted = true
            creditsDeducted = true // Tell client this render is settled
            console.log(`[compose/status] render ${renderId} already in videos — skipping credit deduction`)
          }
        } catch (e) {
          // Non-fatal: if the check fails we fall through to the normal path.
          console.warn('[compose/status] idempotency check failed:', e instanceof Error ? e.message : String(e))
        }
      }

      if ((quality === 'avatar' || quality === 'presenter') && serverAlreadyDeducted) {
        const holdSettled = await settleAvatarCreditHoldForRender({
          userId: user.id,
          renderId,
        })
        if (!holdSettled) {
          console.warn(`[avatar-hold] retry could not settle hold for render=${renderId}`)
          return NextResponse.json(
            { phase: 'processing', reconcile: true, error: 'Finalizing your credit settlement. Please retry.', progress: 99 },
            { status: 503 },
          )
        }
      }

      if (serverAlreadyDeducted) {
        const composeHoldSettled = await settleComposeCreditHoldForRender({
          userId: user.id,
          renderId,
          reason: 'debited',
        })
        if (!composeHoldSettled) {
          console.warn(`[compose-hold] retry could not settle hold for render=${renderId}`)
          return NextResponse.json(
            { phase: 'processing', reconcile: true, error: 'Finalizing your credit settlement. Please retry.', progress: 99 },
            { status: 503 },
          )
        }
      }

      // Idempotency: the server guard above (videos row) + debit_video_credits
      // idempotency (PK render_id) prevent double-charging across refresh /
      // multi-tab / multi-session polls. The client's "deducted=1" is honored
      // ONLY as a legacy fallback (no intent row); with intent it is ignored.
      // KINEO-CREDIT-INTENT — deductionAttempted marks that we entered the
      // paid-debit path, so a FAILED premium debit is caught below (clean
      // premium video withheld) without mis-firing on the free / legacy paths.
      let deductionAttempted = false
      let debitFailureCause: string | null = null
      if (!skipClientDeducted && !serverAlreadyDeducted) {
        if (shouldDeductCredits) {
            // ── KINEO-PAID-DELIVERY-2026-07-30 ────────────────────────────────
            // INCIDENT that produced this block: the only ACTIVE paying customer
            // (plan='basic', has_paid=true, 75 credits on the balance) had SEVEN
            // clean renders refused between 29/07 09:33Z and 30/07 12:44Z. Every
            // one told him "please check your balance and try again". His balance
            // was never the problem: `public.credit_debits` holds ZERO rows for
            // him, so the charge was never even attempted, and his last delivered
            // video is 10/07 — the day he started paying is the day delivery
            // stopped. 0 recurring subscriptions in company history is at least
            // partly THIS.
            //
            // Two things were wrong and both are fixed here.
            //
            // (1) `deductionAttempted` used to be set BEFORE the balance read.
            //     A failed READ therefore fell into the permanent-withhold
            //     branch below and destroyed a finished, paid-for video. A read
            //     fault carries NO information about the customer's funds. It is
            //     now treated exactly like the neighbouring hold-settlement
            //     faults in this file: 503 + phase:'processing' + reconcile,
            //     which makes the client poll again instead of losing the video.
            //     The "never deliver an unpaid premium render" invariant is
            //     untouched — we still do not return a clean URL.
            //
            // (2) The message blamed the customer's balance for something that
            //     CANNOT be caused by a low balance. `debit_video_credits`
            //     clamps with `greatest(balance - cost, 0)` and returns
            //     `coalesce(balance, 0)`; it has no insufficient-funds branch and
            //     raises only on 'not authenticated' / 'invalid cost'. So every
            //     occurrence of this error is an infrastructure fault on OUR
            //     side. Telling the buyer to go check his balance sent him to
            //     look at a number that was already correct — seven times.
            //
            // `debitFailureCause` is carried out of this block so the withhold
            // path below can log WHICH fault happened. Before today both causes
            // produced the same message, no `videos` row and no `credit_debits`
            // row, i.e. a paid delivery could fail on loop and be invisible to
            // every metric the company tracks.
            const { error: fetchError } = await supabase
              .from('profiles')
              .select('video_credits')
              .eq('id', user.id)
              .single()
            if (!fetchError) {
              deductionAttempted = true
              // Every clean export settles its full signed intent cost. There is
              // no premium free trial and no zero-balance Fast exception.
              const { data: newBalance, error: rpcErr } = await debitVideoCredits(supabase, {
                userId: user.id,
                renderId,
                cost,
              })
              if (!rpcErr && typeof newBalance === 'number') {
                creditsDeducted = true
                creditsRemaining = newBalance
              } else {
                debitFailureCause = rpcErr?.message
                  ? `debit_rpc_error: ${rpcErr.message}`
                  : 'debit_rpc_returned_no_balance'
                console.error('[compose/status] credit deduct RPC error:', rpcErr?.message ?? 'no balance returned')
              }
          } else {
            // Transient read fault — NOT evidence about the customer's funds.
            console.error('[compose/status] credit balance read failed, retrying instead of withholding:', JSON.stringify({
              render_id: renderId,
              user_id_prefix: user.id.slice(0, 8),
              quality,
              cost,
              cause: fetchError.message,
            }))
            return NextResponse.json(
              { phase: 'processing', reconcile: true, error: 'Confirming your credits. Please retry.', progress: 99 },
              { status: 503 },
            )
          }
        } else {
          // KINEO-AVATAR-120-2026-07-06 — the dedicated avatar debit block
          // (debit_avatar_credit) was REMOVED here. Avatar now flows through
          // the shouldDeductCredits branch above (120 universal video_credits
          // via debit_video_credits), so this else only handles the legacy
          // cinematic-token engines whose token was consumed at job start.
          // Cinematic — token was consumed at job start. Surface this in
          // the response so the client can still update its "credits left"
          // chip from the regular endpoint without double-decrementing.
          creditsDeducted = true
          creditsRemaining = null
        }

        // ── KINEO-CREDIT-INTENT-2026-07-11 — NEVER hand out a PAID premium
        // render for free. If we ATTEMPTED to charge a premium engine and the
        // debit did NOT settle (RPC error / insufficient balance), STOP here:
        // do not migrate assets, persist Visual History, email, or return a
        // clean final_video_url. The user is told they were NOT charged and can
        // retry (the idempotent RPC self-heals a transient blip on the next
        // poll). This includes paid Fast: a clean export never bypasses its
        // signed one-credit intent.
        if (shouldDeductCredits && deductionAttempted && !creditsDeducted) {
          // KINEO-PAID-DELIVERY-2026-07-30 — `cause` is the whole point of this
          // log line. Reaching here means the debit RPC itself faulted, which is
          // always an infrastructure fault (see the long note above: the function
          // has no insufficient-funds branch). Without the cause recorded, the
          // seven refusals of 29–30/07 were undiagnosable after the fact.
          console.error('[compose/status] PREMIUM-DEBIT-FAILED — refusing to deliver clean premium video (no charge settled):', JSON.stringify({
            render_id: renderId,
            user_id_prefix: user.id.slice(0, 8),
            quality,
            cost,
            cause: debitFailureCause ?? 'unknown',
          }))
          return NextResponse.json({
            phase: 'failed',
            // KINEO-FAILURE-REASON-2026-07-30 — this is the branch that refused
            // the paying customer's seven videos on 29–30/07. It reported itself
            // to the events table as `compose_render_reported_failed`, i.e. as a
            // Creatomate fault, which it never was. Naming it is what makes the
            // next occurrence diagnosable from `events` alone — the only surface
            // that survives, since the Vercel log aggregator times out.
            failure_reason: 'premium_debit_failed',
            reconcile: true,
            // Do NOT send the buyer to check a balance that cannot be the cause.
            // This wording keeps the two facts he needs — he was not charged, and
            // the video is recoverable — without accusing his account.
            error:
              "Your clean video was held back because our billing check failed on our side, not yours. " +
              'You have NOT been charged. Press Generate again — if it happens twice, reply to this ' +
              'and we will deliver it manually.',
            creditsDeducted: false,
            creditsRemaining,
            progress: 0,
          })
        }

        if (shouldDeductCredits && creditsDeducted) {
          const composeHoldSettled = await settleComposeCreditHoldForRender({
            userId: user.id,
            renderId,
            reason: 'debited',
          })
          if (!composeHoldSettled) {
            console.warn(`[compose-hold] could not settle hold for render=${renderId}`)
            return NextResponse.json(
              { phase: 'processing', reconcile: true, error: 'Finalizing your credit settlement. Please retry.', progress: 99 },
              { status: 503 },
            )
          }
        }

        // Release the signed provider-cost hold immediately after the debit is
        // confirmed, before asset migration, history, email or push work. If a
        // serverless timeout happens later, a retry sees both an idempotent debit
        // and an already-settled hold instead of blocking the buyer for two hours.
        if ((quality === 'avatar' || quality === 'presenter') && creditsDeducted) {
          const holdSettled = await settleAvatarCreditHoldForRender({
            userId: user.id,
            renderId,
          })
          if (!holdSettled) {
            console.warn(`[avatar-hold] could not settle hold for render=${renderId}`)
            return NextResponse.json(
              { phase: 'processing', reconcile: true, error: 'Finalizing your credit settlement. Please retry.', progress: 99 },
              { status: 503 },
            )
          }
        }

        // Push #050 — persist the completed video for Visual History.
        // Only on the first "done" response (deductedParam=false) so a
        // refresh-driven status re-poll doesn't insert duplicates. Errors
        // are swallowed inside the helper — history is non-blocking.
        //
        // Push #052 (QA fix A) — wrap with explicit before/after logs at
        // the call site too, so we can confirm in Vercel logs that the
        // helper is reached AND see its result without having to dig
        // through the internal log lines.
        // Push #230 — copy the Creatomate output + thumbnail into permanent
        // Supabase Storage URLs BEFORE persisting, so the history row never
        // stores a Creatomate CDN URL that later expires. Best-effort and
        // bounded: on any failure persistRenderAssets returns the original
        // Creatomate URLs, so this can never block the user's video.
        let finalVideoUrl = state.url
        let finalThumbUrl = state.snapshotUrl
        try {
          const migrated = await persistRenderAssets({
            userId: user.id,
            renderId,
            videoUrl: state.url,
            snapshotUrl: state.snapshotUrl,
          })
          finalVideoUrl = migrated.videoUrl
          finalThumbUrl = migrated.thumbnailUrl
          responseVideoUrl = migrated.videoUrl
          console.log('[history] asset migration result:', JSON.stringify({
            video_migrated: migrated.videoUrl !== state.url,
            thumb_migrated: !!migrated.thumbnailUrl && migrated.thumbnailUrl !== state.snapshotUrl,
          }))
        } catch (e) {
          console.warn('[history] asset migration threw — keeping Creatomate URLs:',
            e instanceof Error ? e.message : String(e))
        }

        // Push #355 — record render_time_ms in broll_metrics.
        // Best-effort: never blocks the video response.
        try {
          const { data: metricsRow } = await supabase
            .from('broll_metrics')
            .select('submitted_at')
            .eq('render_id', renderId)
            .maybeSingle()
          if (metricsRow?.submitted_at) {
            const renderTimeMs = Date.now() - new Date(metricsRow.submitted_at).getTime()
            await supabase
              .from('broll_metrics')
              .update({ render_time_ms: renderTimeMs })
              .eq('render_id', renderId)
            console.log(`[broll_metrics] render_time_ms=${renderTimeMs} for render_id=${renderId}`)
          }
        } catch (metricsEx) {
          console.warn('[broll_metrics] render_time_ms update failed:', metricsEx instanceof Error ? metricsEx.message : String(metricsEx))
        }

        console.log('[history] attempting persist…', JSON.stringify({
          render_id: renderId,
          user_id_prefix: user.id.slice(0, 8),
          duration,
          quality,
          has_topic: topicFinal.length > 0,
        }))
        // PUSH #100 — brand the stored description exactly like video-summary
        // does (free plan only). Best-effort: a failed profile read just stores
        // the clean description, never blocks the video.
        let historyDescription = ''
        try {
          const { data: planRow } = await supabase
            .from('profiles')
            // KINEO-TRIAL-BLOCKERS-2026-08-07 — colunas de trial: esta é a
            // descrição PERSISTIDA no histórico, e ela tem que concordar com o
            // que /api/youtube/upload publica de fato.
            .select(`has_paid, plan, ${TRIAL_ENTITLEMENT_COLUMNS}`)
            .eq('id', user.id)
            .maybeSingle()
          const PAID_PLANS = new Set([
            'starter', 'starter_trial', 'basic', 'basic_trial',
            'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial',
          ])
          const planName = ((planRow as { plan?: string } | null)?.plan ?? 'free').toLowerCase()
          const isPaid =
            (planRow as { has_paid?: boolean } | null)?.has_paid === true ||
            PAID_PLANS.has(planName) ||
            isTrialActive(planRow)
          historyDescription = buildBrandedYouTubeDescription(ytDescriptionParam, {
            isFreePlan: !isPaid,
          })
        } catch (e) {
          console.warn('[history] description branding skipped:',
            e instanceof Error ? e.message : String(e))
          historyDescription = ytDescriptionParam.trim()
        }

        try {
          const result = await persistCompletedVideo({
            userId: user.id,
            renderId,
            videoUrl: finalVideoUrl,
            snapshotUrl: finalThumbUrl,
            quality,
            duration,
            // KINEO-TITULO-SOBREVIVE-2026-08-22 — `topicFinal`, não `topic`.
            // É desta linha que sai o `title` do card no My Videos (o helper
            // deriva o título da primeira linha do tema). Com `topic` cru, todo
            // vídeo persistido por um caminho SEM query param — cron de resgate
            // e worker de demo — nascia "Untitled Short": 44% dos vídeos de
            // 21/08. `topicFinal` cai no claim quando a URL não traz nada.
            topic: topicFinal,
            creditsUsed: cost,
            youtubeDescription: historyDescription,
          })
          if (result.id) persistedVideoId = result.id
          console.log('[history] persist result:', JSON.stringify(result))
        } catch (e) {
          // persistCompletedVideo is meant to never throw, but if it
          // somehow does we still want to know about it without
          // failing the user response.
          console.error('[history] persist threw unexpectedly:', e instanceof Error
            ? JSON.stringify({ name: e.name, message: e.message, stack: e.stack?.split('\n').slice(0, 3).join(' | ') })
            : String(e))
        }

        // Push #104 — fire-and-forget "your Short is ready" email via
        // Resend. Inlined here (rather than calling /api/notify-video-ready
        // over HTTP) so we don't have to forward auth cookies on a
        // server-to-server hop and so we don't pay a cold-start tax on the
        // user's polling response. Mirrors the env conventions of
        // /api/send-welcome.
        try {
          const RESEND_API_KEY = process.env.RESEND_API_KEY
          const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Kineo <support@usekineo.com>'
          if (RESEND_API_KEY && user.email) {
            const safeTopic = (topic || 'your topic').replace(/[<>]/g, '')
            const safeVideoUrl = finalVideoUrl.replace(/"/g, '')
            const html = `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#161618;color:#fff;padding:32px;border-radius:16px;">
                <h1 style="color:#2997ff;font-size:24px;margin:0 0 8px">Your Short is ready! ⚡</h1>
                <p style="color:#94a3b8;margin:0 0 24px">Your AI-generated YouTube Short about "<strong style="color:#fff">${safeTopic}</strong>" is ready to download.</p>
                <a href="${safeVideoUrl}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
                  ⬇ Download Your Short
                </a>
                <p style="color:#64748b;font-size:12px;margin:24px 0 0">Want a clean export and 24 more Fast Shorts this month? <a href="https://www.usekineo.com/pricing" style="color:#2997ff;">Starter is $7.00/month →</a></p>
                <!-- KINEO-REVIEW-NO-EMAIL-2026-08-24 (pacote noturno 2, AQ) — o
                     e-mail de entrega vai para TODO render pronto: é o maior
                     canal de pedido-no-pico que a casa tem, e estava mudo.
                     Mesma oferta da tela de sucesso (#311), mesma promessa
                     cumprível (botão #297 + SLA diário varrendo respostas). -->
                <p style="color:#34d399;font-size:12px;margin:14px 0 0;border-top:1px solid #26262a;padding-top:14px">Loved the result? An honest 30-second review on <a href="https://theresanaiforthat.com/ai/kineo/" style="color:#34d399;font-weight:700">There's An AI For That</a> gets you <strong style="color:#fff">+25 credits</strong> — just reply to this email after posting it.</p>
                <p style="color:#475569;font-size:11px;margin:16px 0 0">Kineo · <a href="https://www.usekineo.com" style="color:#475569;">usekineo.com</a></p>
              </div>
            `
            const emailRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: [user.email],
                subject: '⚡ Your Short is ready to download!',
                html,
              }),
            })
            if (!emailRes.ok) {
              const errText = await emailRes.text()
              console.warn('[notify-video-ready] resend non-2xx:', emailRes.status, errText.slice(0, 200))
            }
          }
        } catch (emailErr) {
          console.warn('[notify-video-ready] send failed:', emailErr instanceof Error ? emailErr.message : String(emailErr))
        }

        // Push #427 — Web Push "your video is ready" to every device the
        // user opted in on. Payload-less (text lives in public/sw.js).
        // Best-effort: failures never affect the polling response.
        try {
          const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('endpoint')
            .eq('user_id', user.id)
          if (subs && subs.length > 0) {
            const { sendPushToSubscriptions } = await import('@/lib/push')
            const { sent, gone } = await sendPushToSubscriptions(subs)
            if (gone.length > 0) {
              await supabase.from('push_subscriptions').delete().in('endpoint', gone)
            }
            if (sent > 0) console.log(`[push] video-ready sent to ${sent} device(s)`)
          }
        } catch (pushErr) {
          console.warn('[push] video-ready failed:', pushErr instanceof Error ? pushErr.message : String(pushErr))
        }
      }

      // PUSH #23 — the public share id is a growth-critical output, not a
      // best-effort RLS read. Reuse the insert result when available and fall
      // back to a service-role lookup scoped to this owner + render.
      const videoId = persistedVideoId ?? await findCompletedVideoId(user.id, renderId)

      // ═══ KINEO-SHARP-HOUSE-2026-08-20 — ENHANCE AUTOMÁTICO NOS VÍDEOS DA CASA
      // Decisão do fundador (feedback de nitidez do Joyita): todo render
      // cinematográfico das contas da casa passa no Topaz (Proteus, factor 1 =
      // tier $0.02/s ≈ $1.30/filme) SEM ele precisar clicar em ✨HD Enhance.
      // Mesmo submit do /api/enhance, sem débito de créditos (conta da casa) e
      // sem bloquear a resposta do polling. O GET self-heal do /api/enhance já
      // completa o job e troca a URL quando ele abre a Library — zero fluxo
      // novo. Idempotente: só submete se enhance_request_id ainda é null.
      // Cliente NÃO entra aqui: pra ele o Enhance é produto pago (10cr).
      try {
        const HOUSE_ENHANCE_EMAILS = new Set(['josephsskaf@gmail.com'])
        if (
          isCinematicQuality &&
          videoId &&
          user.email &&
          HOUSE_ENHANCE_EMAILS.has(user.email.toLowerCase())
        ) {
          const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
          const falKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY
          if (adminUrl && secret && falKey) {
            const houseAdmin = createAdminClient(adminUrl, secret, {
              auth: { autoRefreshToken: false, persistSession: false },
            })
            const { data: vrow } = await houseAdmin
              .from('videos')
              .select('enhance_request_id, video_url')
              .eq('id', videoId)
              .maybeSingle()
            if (vrow && !vrow.enhance_request_id && vrow.video_url) {
              const { fal } = await import('@fal-ai/client')
              fal.config({ credentials: falKey })
              const { request_id } = await fal.queue.submit('fal-ai/topaz/upscale/video', {
                input: {
                  video_url: vrow.video_url,
                  model: 'Proteus',
                  upscale_factor: 1, // 1 = nitidez sem mudar resolução (tier barato); 2 quadruplica o custo
                  compression: 0.6,
                  recover_detail: 0.6,
                  grain: 0.02,
                  H264_output: true,
                },
              })
              await houseAdmin.from('videos').update({ enhance_request_id: request_id }).eq('id', videoId)
              console.log(`[house-enhance] video=${videoId} auto-submitted req=${request_id}`)
            }
          }
        }
      } catch (e) {
        // best-effort: nunca derruba a resposta do render pronto
        console.warn('[house-enhance] failed:', e instanceof Error ? e.message : String(e))
      }

      return NextResponse.json({
        phase: 'done',
        final_video_url: responseVideoUrl,
        video_id: videoId,
        progress: 100,
        creditsDeducted,
        creditsRemaining,
      })
    }

    if (state.status === 'failed' || state.status === 'cancelled') {
      // AUTO-REFUND (TAAFT feedback) — if anything was debited for this render
      // (credit_debits ledger row), give it back. Idempotent + race-safe: the
      // refund_render_credits RPC only claims rows WHERE refunded_at IS NULL,
      // so repeated polls of a failed render can never refund twice. On this
      // pipeline the debit normally only happens on SUCCESS, so this is a
      // safety net for debit-then-fail edge cases (timeouts, races).
      const composeHoldReleased = await settleComposeCreditHoldForRender({
        userId: user.id,
        renderId,
        reason: 'provider_failed',
      })
      if (!composeHoldReleased) {
        return NextResponse.json(
          { phase: 'processing', reconcile: true, error: 'Finalizing the failed render safely. Please retry.', progress: 0 },
          { status: 503 },
        )
      }
      if (isFreeFastIntent) {
        const freeClaimReleased = await releaseFailedFreeFastClaim({ userId: user.id, renderId })
        if (!freeClaimReleased) {
          return NextResponse.json(
            { phase: 'processing', reconcile: true, error: 'Restoring your free preview slot. Please retry.', progress: 0 },
            { status: 503 },
          )
        }
      }
      if (quality === 'avatar' || quality === 'presenter') {
        const avatarHoldReleased = await settleAvatarCreditHoldForRender({
          userId: user.id,
          renderId,
          reason: prepaidAvatarClaim ? 'compose_failed_after_asset_delivered' : 'provider_failed',
        })
        if (!avatarHoldReleased) {
          console.warn(`[avatar-hold] failed compose could not release hold for render=${renderId}`)
          return NextResponse.json(
            { phase: 'processing', reconcile: true, error: 'Finalizing the failed avatar safely. Please retry.', progress: 0 },
            { status: 503 },
          )
        }
      }
      // ── KINEO-CREDIT-STUCK-2026-08-08 — O ESTORNO SAI DO VARREDOR ─────────
      //
      // O QUE ESTAVA AQUI, E POR QUE ERA UM BURACO:
      //   const prepaidProviderAsset = prepaidCinematicClaim !== null || ...
      //   const creditsRefunded = prepaidProviderAsset ? 0 : await refund(...)
      // com a justificativa de que "os clipes do fal já foram entregues ao dono
      // autenticado, então uma falha do Creatomate não pode estorná-los" e a tela
      // dizia "Your AI scenes remain paid and protected; no second AI-scene
      // charge is needed to reassemble them."
      //
      // A PROMESSA ERA VAZIA. Não existe caminho de "remontar sem cobrar de novo":
      //   · o compose claim (`compose_submission_claim`) já está em `status:'done'`
      //     amarrado a ESTE render_id (app/api/compose/route.ts
      //     completeGenerationClaim) — uma nova chamada a /api/compose com o mesmo
      //     generationId cai em `responseForClaimRow` → replay do MESMO render id
      //     morto. Não há segunda composição possível.
      //   · um generationId NOVO nasce com um birth claim NOVO → submissão nova ao
      //     fal → cobrança nova.
      // Resultado real: sem vídeo E sem crédito. Num trial de 40 créditos, um
      // Seedance de 20 é METADE da experiência que a empresa comprou.
      //
      // E O SISTEMA JÁ SE CONTRADIZIA: sweepAbandonedCinematicDebits()
      // (lib/credits/refund.ts, KINEO-CREDIT-INTEGRITY-2026-08-05) faz EXATAMENTE
      // este estorno — mesma chave, mesmo release — quando não encontra linha em
      // `videos` para o render de compose. Ou seja, o dinheiro voltava de qualquer
      // jeito; só voltava até 24h depois (cron diário), depois de a pessoa já ter
      // pedido reembolso ou ido embora. Aqui só antecipamos o que já era a decisão
      // da casa, no instante em que a falha é conhecida.
      //
      // ORDEM OBRIGATÓRIA — dinheiro primeiro, estado depois:
      //   1) refundRenderCredits(<chave do débito>)  ← idempotente por UPDATE
      //      condicional (WHERE refunded_at IS NULL) no RPC refund_render_credits;
      //      passa por recordReverseTrialRefundForRender, então o teto do trial
      //      volta e o trial ressuscita quando foi o teto que o matou.
      //   2) releaseCinematicClaim(...'provider_failed_refunded')  ← só é ACEITO
      //      pelo claim quando a referência bate; e o próprio claim.ts documenta
      //      que o release de um claim `settled` exige que o débito já tenha sido
      //      estornado. Invertendo a ordem, a tela prometeria estorno sem estorno.
      // Se (1) falhar, nada muda de estado e o cron (agora de hora em hora, não
      // 1×/dia) devolve o dinheiro como sempre devolveu. Se só (2) falhar, o
      // dinheiro JÁ voltou — ver a nota no `console.error` do release.
      //
      // AVATAR/PRESENTER FICAM COMO ESTAVAM, DE PROPÓSITO: são inalcançáveis no
      // trial (110/70 créditos contra teto de 40), tiveram 3 renders em 30 dias, e
      // o ativo do VEED é entregue e reaproveitável por outro caminho. Mexer neles
      // horas antes do lançamento é risco sem cliente do outro lado.
      let creditsRefunded = 0
      let cinematicRefundNote = ''
      if (prepaidCinematicClaim) {
        const billingReference = prepaidCinematicClaim.resolutionReference
        if (prepaidCinematicClaim.status === 'released') {
          // O cron (ou um poll anterior) já devolveu. Dizer "protegido e pago"
          // aqui seria mentir sobre crédito que a pessoa JÁ tem de volta.
          creditsRefunded = prepaidCinematicClaim.creditCost
        } else if (billingReference.startsWith('cinematic-')) {
          creditsRefunded = await refundRenderCredits(billingReference)
          if (creditsRefunded > 0 && cinematicAdmin && cinematicSecret) {
            const released = await releaseCinematicClaim({
              db: cinematicAdmin,
              secret: cinematicSecret,
              userId: user.id,
              generationId: prepaidCinematicClaim.generationId,
              reason: 'provider_failed_refunded',
              reference: billingReference,
            })
            if (!released.ok) {
              // Uma segunda tentativa: o update é condicionado à assinatura
              // anterior (updateClaim), então um conflito concorrente (outro
              // poll da mesma aba) se resolve na releitura.
              const retry = await releaseCinematicClaim({
                db: cinematicAdmin,
                secret: cinematicSecret,
                userId: user.id,
                generationId: prepaidCinematicClaim.generationId,
                reason: 'provider_failed_refunded',
                reference: billingReference,
              })
              if (!retry.ok) {
                // ⚠️ ACHADO DA 2ª REVISÃO ADVERSARIAL — não escrever aqui que
                // "o cron reconcilia". ELE NÃO RECONCILIA: em
                // sweepAbandonedCinematicDebits() o release só roda depois de um
                // `refundRenderCredits` com amount > 0, e o débito já está
                // estornado, então a varredura devolve 0 e faz `continue`.
                // O estado residual é um claim `settled` cujo débito já voltou.
                // CONSEQUÊNCIA REAL: nenhuma para o cliente — o dinheiro está na
                // conta dele, e o claim é preso a ESTE generationId, que morreu
                // com este render; uma geração nova nasce com claim novo. Fica
                // registrado como dívida técnica, não como risco de cobrança.
                console.error(
                  `[compose/status] estorno OK mas release do claim cinematografico falhou gen=${prepaidCinematicClaim.generationId}: ${retry.error}` +
                  ' — o credito JA voltou ao usuario; o claim fica settled (residuo inofensivo, ver comentario)',
                )
              }
            }
            // Auditoria — MESMO shape do evento que o cron já escreve
            // (`credits_refunded`), para que uma consulta única enxergue os
            // estornos ao vivo e os do varredor. Nunca fatal: o dinheiro já
            // voltou, e uma falha de log não pode virar erro na tela.
            // supabase-js NÃO lança em erro de banco (devolve `{ error }`), daí
            // o try/catch E a checagem do retorno.
            try {
              const { error: auditError } = await cinematicAdmin.from('events').insert({
                user_id: user.id,
                name: 'credits_refunded',
                path: '/api/compose/status',
                session_id: prepaidCinematicClaim.generationId,
                metadata: {
                  render_id: billingReference,
                  compose_render_id: renderId,
                  amount: creditsRefunded,
                  reason: 'compose_failed_after_provider_assets',
                  quality: prepaidCinematicClaim.quality,
                  engine: prepaidCinematicClaim.engine,
                  refunded_at: new Date().toISOString(),
                },
              })
              if (auditError) {
                console.error(`[compose/status] auditoria do estorno falhou (nao fatal): ${auditError.message}`)
              }
            } catch (auditErr) {
              console.error('[compose/status] auditoria do estorno lancou (nao fatal):', auditErr instanceof Error ? auditErr.message : String(auditErr))
            }
          }
        }
        cinematicRefundNote = creditsRefunded > 0
          ? ` Your ${creditsRefunded} credits were automatically refunded.`
          : ' You were not charged for this video.'
      } else if (!prepaidAvatarClaim) {
        creditsRefunded = await refundRenderCredits(renderId)
      }
      return NextResponse.json({
        phase: 'failed',
        // KINEO-FAILURE-REASON-2026-07-30 — the ONLY branch where the render
        // provider genuinely reported failure. Everything else that reaches the
        // client as `phase:'failed'` is ours.
        failure_reason: state.status === 'cancelled' ? 'provider_render_cancelled' : 'provider_render_failed',
        error:
          (state.error ?? 'Render failed.') +
          (prepaidCinematicClaim
            ? cinematicRefundNote
            : prepaidAvatarClaim
            ? ' Your completed avatar remains paid and protected; no second avatar charge is needed to reassemble it.'
            : creditsRefunded > 0
            ? ` Your ${creditsRefunded} credits were automatically refunded.`
            : ' You were not charged for this video.'),
        creditsRefunded,
        progress: 0,
      })
    }

    return NextResponse.json({
      phase: 'composing',
      progress: state.progress,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[compose/status] unexpected error:', msg)
    return NextResponse.json(
      { error: 'Status lookup failed. Please retry.' },
      { status: 500 }
    )
  }
}
