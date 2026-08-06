import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  buildCreatomateSource,
  CreatomateSubmitError,
  // KINEO-HOLLYWOOD-2026-07-09 — Hollywood Mode source builder + types.
  buildHollywoodCreatomateSource,
  estimateMp3DurationSeconds,
  generateTTS,
  pollCreatomateRender,
  scaleVoiceoverScript,
  submitCreatomateRender,
  targetWordCount,
  transcribeTTSWithTimestamps,
  uploadVoiceoverToSupabase,
  // Kineo-AudioCache-2026 — TTS + Whisper content-hash cache (fail-open).
  computeVoiceoverCacheKey,
  resolveTtsVoiceIdentity,
  lookupCachedVoiceover,
  storeCachedVoiceover,
  predictTtsSecondsFromWords,
  type CachedVoiceoverEntry,
  type HollywoodClipInput,
  type HollywoodNarrationBlock,
  type WhisperWord,
} from '@/lib/compose'
// Kineo-AudioCache-2026 — the model id that WILL be used for this tier keeps
// the cache key correct across the OpenAI vs ElevenLabs providers.
import { ttsModelForTier } from '@/lib/narration/elevenlabs'
import { stripScriptMarkers } from '@/lib/scriptParser'
import { fetchUserPlan } from '@/lib/plan'
import { getBackgroundMusicUrl } from '@/lib/pixabayMusic'
import { selectPersonaForScript } from '@/lib/narration/niche-mapping'
// KINEO-CREDIT-INTENT-2026-07-11 — record the authoritative engine + intended
// cost for every render, keyed by render_id, the moment it is created. This is
// the trusted source /api/compose/status bills from (instead of the client's
// ?quality / ?deducted query params). creditCostFor is the shared price table.
import { creditCostFor } from '@/lib/credits/engineCost'
import { inspectActiveComposeCreditHolds } from '@/lib/credits/composeHold'
import { loadVerifiedCinematicClaim, type CinematicClaim } from '@/lib/cinematic/claim'
import {
  loadPrepaidAvatarClaimForGeneration,
  type VerifiedAvatarBirthClaim,
} from '@/lib/avatar/reservation'
import { recordRenderIntent } from '@/lib/credits/renderIntent'
import {
  COMPOSE_CLAIM_EVENT,
  COMPOSE_CLAIM_PATH,
  composeClaimId,
  signComposeClaim,
  validComposeGenerationId,
  verifyComposeClaim,
} from '@/lib/composeClaim'
import {
  countFreeFastUsage,
  countUndeliveredReservations,
} from '@/lib/freeFastQuota'
// [KINEO-TRIAL-SWAP-2026-08-07] — o limite/janela/copy do free tier agora vêm
// da MESMA fonte que toda a copy pública (lib/freeTierOffer.ts), decididos pela
// flag KINEO_REVERSE_TRIAL_ENABLED:
//   OFF → 3 Fast/24h (idêntico a FREE_FAST_PREVIEW_LIMIT/FREE_FAST_WINDOW_MS —
//         diff de runtime zero);
//   ON  → 1 Fast por janela rolante de 30 dias, 15s máx, watermark (o watermark
//         do free Fast já existe — isFreePlanFast abaixo). 480p PENDENTE: o
//         builder Creatomate não tem knob de resolução (ver docs/SPRINT do dia).
import { getFreeTierOffer } from '@/lib/freeTierOffer'
// KINEO-TRIAL-BLOCKERS-2026-08-07 — BLOQUEADORES #1 e #2 DO QA DE 07/08.
// Esta rota decide marca d'água, clamp de duração, cota do free tier e o 402 do
// motor de AI — e até hoje NÃO SABIA que o reverse trial existe. Uma conta em
// trial ativo tem `plan='free' has_paid=false` no banco (a ativação não escreve
// plano, de propósito: escrever contaminaria MRR e coortes), então TODOS os
// predicados abaixo a liam como free. Resultado medido pelo QA: Seedance
// debitava 20 créditos e tomava 402 aqui (estorno só no sweep do dia seguinte),
// e o Fast saía com marca d'água, cortado em 15s e queimando a cota de 1/30d.
// O comentário que afirmava "contas em trial ativo não passam por aqui" era
// FALSO e foi corrigido junto com o código.
// getEffectiveEntitlement é a fonte única; `isPaidAccount` continua sendo o
// predicado LOCAL desta rota (PAID_PLANS daqui), então com a flag OFF o termo
// novo vale false e o comportamento é idêntico byte a byte.
import {
  getEffectiveEntitlement,
  isTrialActive,
  REVERSE_TRIAL_ENABLED,
  TRIAL_ENTITLEMENT_COLUMNS,
} from '@/lib/reverseTrial'
// KINEO-HOLLYWOOD-HOST-2026-07-13 — HOLLYWOOD HOST MODE v3.5: the hollywood
// narration blocks are synthesized with ONE pinned voice, resolved from the
// full voiceover_script — the SAME resolution the cinematic route ran for the
// host lines, so host speech and b-roll narration share a single narrator.
// Fail-open: any failure falls back to the per-block generateTTS below.
import { resolveHollywoodVoice, synthesizeHostSpeech, type HollywoodVoice } from '@/lib/hollywood/hostVoice'

export const maxDuration = 300

// Push #434 — FORCE-WATERMARK list. Accounts here ALWAYS get the watermark,
// regardless of plan or engine, so Joseph can post self-promo videos from his
// own paid account that advertise the site. Kept fully separate from the
// customer watermark rules below — adding/removing an email here changes
// nothing for real users. To stop watermarking his videos, delete the email.
const FORCE_WATERMARK_EMAILS = new Set<string>([
  'josephsskaf@gmail.com',
])

// Push #064 — durations bumped to 30 / 45 / 60 in lockstep with
// /api/generate-video. Legacy 10 / 50 kept here for backward
// compatibility with any in-flight requests from the old client.
// Push #234 — added 90: the client offers 45/60/90, and without 90 here a
// 90s request silently coerced to 45 → the script was sized for 45s and the
// final video came out ~half the requested length.
const SUPPORTED_DURATIONS = [10, 30, 45, 50, 60, 90] as const

// [KINEO-TRIAL-SWAP-2026-08-07] — resolvido no módulo (runtime de servidor; na
// Vercel a env é fixa por deployment, então isto nunca muda no meio da vida do
// processo). Flag OFF ⇒ { limit: 3, windowMs: 24h, maxFreeFastSeconds: null }.
const FREE_OFFER = getFreeTierOffer()

// Push #234 — how far the measured narration may stray from the requested
// duration before we re-synthesize the TTS at an adjusted speed to pull it
// back in line. ±3s matches the product tolerance.
const DURATION_TOLERANCE_SECONDS = 3

// PUSH #94 — VOICEOVER CACHE ENGINE VERSION.
//
// computeVoiceoverCacheKey() (lib/compose.ts) hashes the script text as it
// exists BEFORE the per-section TTS splicing runs. PUSH #93 changed that
// splicing — every section except the last now gets a trailing ellipsis so
// OpenAI renders natural tail silence inside the section's own mp3, killing the
// audible click at each splice point. Because the hashed input never changed,
// every previously-cached voiceover kept serving the old click-y audio forever
// and the #93 fix never reached an existing user.
//
// Salting the key with this constant invalidates the pre-#93 entries EXACTLY
// ONCE: old objects are simply never looked up again (they are not deleted, and
// no other cache — clip vault, video cache, Pixabay memo — is touched). The
// first render after deploy re-synthesizes and re-stores under the new key.
//
// ⚠️ BUMP THIS STRING whenever TTS text preprocessing changes in a way that
// alters the audio for an unchanged script: section splicing/joining, ellipsis
// or pause insertion, marker stripping, SSML, normalization, chunk boundaries.
// Anything already part of the hash (script text, voice, speed, model) does NOT
// need a bump — those invalidate themselves.
const VOICEOVER_ENGINE_VERSION = 'v2-push93-section-ellipsis'

// FREE_FAST_PREVIEW_LIMIT e FREE_FAST_WINDOW_MS moraram aqui até 06/08/2026.
// Agora vêm de lib/freeFastQuota.ts, junto da contagem que os usa — o cron
// send-credits-back lia os mesmos números de uma cópia separada.

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-REFUSAL-TELEMETRY-2026-07-30 — TORNAR VISÍVEL A RECUSA
// ═══════════════════════════════════════════════════════════════════════════
// MEDIDO em produção (cqqukkvjjrguayiyjvhh, 30 dias encerrando 30/07):
//
//   244 pessoas clicaram em analisar
//   243 pessoas dispararam Generate  ·  1367 disparos (5,6 por pessoa)
//   135 pessoas saíram com vídeo concluído
//   → 108 PESSOAS (44%) apertaram o botão e não receberam nada
//
//   E apenas ~8 dessas pessoas têm QUALQUER evento de falha registrado
//   (generation_stage_error 5 · video_generation_failed 3 · generate_failed 3).
//
// Ou seja: ~100 pessoas por mês falham em SILÊNCIO. Nada no banco sabe que
// elas falharam, nem por quê.
//
// A causa de o buraco existir é estrutural e está nesta rota: /api/compose tem
// 77 pontos de retorno de erro e, até esta linha, ZERO chamadas de telemetria.
// A rota que decide se um vídeo passa a existir era cega do lado da recusa.
//
// Um detalhe do mesmo levantamento fecha o diagnóstico: no período,
// videos_criados = videos_ok = 256. O render NUNCA falha depois que a linha de
// vídeo existe. Toda a perda é ANTES disso — exatamente aqui.
//
// A hipótese mais forte para o maior pedaço são os 5,6 disparos por pessoa
// contra um teto de 3 por 24h: gente batendo no limite do free. Mas isso é
// HIPÓTESE, e este log existe justamente para deixar de ser. Sem medir a
// recusa não se pode nem consertá-la nem vendê-la — e quem apertou Generate e
// levou "não" é o prospecto mais quente que este produto tem.
//
// Best-effort por projeto: nunca lança, nunca atrasa a resposta ao usuário.
// Uma falha de telemetria não pode virar uma falha de produto.
async function logComposeRefusal(
  reason: string,
  userId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    if (!userId) return
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return
    const db = createAdminClient(url, key, { auth: { persistSession: false } })
    await db.from('events').insert({
      user_id: userId,
      name: 'compose_refused',
      path: '/api/compose',
      metadata: { reason, ...metadata },
    })
  } catch (err) {
    console.warn(
      '[compose] refusal telemetry failed (ignorado):',
      err instanceof Error ? err.message : String(err),
    )
  }
}
// feature/ai-avatar — 'avatar' = premium talking-head render (VEED Fabric).
// Checkpoint 1: no credit cost wired yet (billing lands in checkpoint 2).
// KINEO-HOLLYWOOD-2026-07-09 — 'cinematic_hollywood' added (per-scene engines,
// native audio, block TTS).
type Quality = 'fast' | 'basic' | 'basic_ai' | 'pro' | 'cinematic_ai' | 'cinematic_kling' | 'cinematic_veo' | 'cinematic_sora' | 'cinematic_hollywood' | 'avatar' | 'presenter'

type SubmissionCacheEntry = { promise: Promise<string>; expiresAt: number }
const composeSubmissionCache = new Map<string, SubmissionCacheEntry>()

type SubmissionClaimResult =
  | { kind: 'acquired' }
  | { kind: 'existing'; response: NextResponse }
  | { kind: 'unavailable'; response: NextResponse }

// Creatomate does not document an idempotency key for render creation. Collapse
// racing/retried requests for the same authenticated generation inside a warm
// server instance, and retain the resolved render id briefly so a lost HTTP
// response can be replayed without creating another paid job.
function submitCreatomateOnce(
  source: Record<string, unknown>,
  key?: string,
): Promise<string> {
  if (!key) return submitCreatomateRender(source)
  const now = Date.now()
  for (const [cachedKey, entry] of composeSubmissionCache) {
    if (entry.expiresAt <= now) composeSubmissionCache.delete(cachedKey)
  }
  const cached = composeSubmissionCache.get(key)
  if (cached) return cached.promise

  const entry: SubmissionCacheEntry = {
    promise: Promise.resolve(''),
    expiresAt: now + 30_000,
  }
  entry.promise = submitCreatomateRender(source).then(
    (renderId) => {
      entry.expiresAt = Date.now() + 5 * 60 * 1000
      return renderId
    },
    (error) => {
      // Hold only ambiguous failures. An explicit provider rejection can be
      // retried after the durable claim is released.
      if (error instanceof CreatomateSubmitError && error.ambiguous) {
        entry.expiresAt = Date.now() + 30_000
      } else {
        composeSubmissionCache.delete(key)
      }
      throw error
    },
  )
  composeSubmissionCache.set(key, entry)
  return entry.promise
}

interface ComposeBody {
  generationId?: string
  clip_urls?: string[]
  voiceover_script?: string
  scene_captions?: string[]
  duration?: number
  topic?: string
  quality?: string
  // Push #235 — explicit TTS speed from a user-authored script ("speed: 1.05").
  // When present, compose uses the narration verbatim at this speed and skips
  // both the word-count scaling and the duration corrective re-synthesis.
  speed?: number
  // Push #316 — output language (en | pt | es). The OpenAI TTS model is
  // multilingual and auto-detects the language of the input text, so the same
  // 'onyx' voice narrates in Portuguese or Spanish when the script is in that
  // language. We accept and log the param for observability but no voice switch
  // is required.
  language?: string
  // Phase 1 Narration Engine — content vertical hint (e.g. 'mystery', 'finance',
  // 'geography'). Forwarded from analyze-idea via GenerateClient so the persona
  // selector can pick the right voice + speed profile for the niche.
  vertical?: string
  // feature/ai-avatar — avatar mode (quality === 'avatar'). The narration mp3
  // ALREADY exists (generated in /api/generate-avatar and lip-synced by VEED),
  // so compose must NOT re-synthesize TTS — a new mp3 would have different
  // timing and break lip sync. avatar_url is the VEED talking-head MP4 that
  // becomes the main video track.
  avatar_url?: string
  voiceover_url?: string
  real_audio_duration?: number
  // Face-app wave 1 (12/06) — Hook Avatar: the avatar MP4 only covers the
  // first ~N seconds; b-roll tiles the rest. Forwarded to buildCreatomateSource.
  avatar_hook_seconds?: number
  // KINEO-HOLLYWOOD-2026-07-09 — per-scene metadata, PARALLEL to clip_urls
  // (quality === 'cinematic_hollywood' only). scene_engines routes the per-clip
  // volume (dialogue 100% / cinematic 55% / support 35%); scene_narrations is
  // the TTS text per scene (null = native audio only — NEVER TTS over a
  // dialogue scene); scene_seconds is each scene's planned timeline length.
  // KINEO-HOLLYWOOD-HOST-2026-07-13 — 'host' accepted in scene_engines: an
  // anchored dialogue scene rendered on Kling AI Avatar v2 with our TTS baked
  // in (one voice for the whole video). Treated like dialogue for volume/
  // narration/captions, but its scene_seconds are the MEASURED audio length
  // and are honored exactly (no 5|10 snap).
  scene_engines?: string[]
  scene_narrations?: (string | null)[]
  scene_seconds?: number[]
  // KINEO-HOLLYWOOD-21-2026-07-10 (bug b) — the EXACT spoken line per dialogue
  // scene (null for cinematic/support), parallel to clip_urls. Captions on
  // dialogue scenes chunk THIS text so they match the actual speech.
  scene_dialogues?: (string | null)[]
  // KINEO-OWN-VOICE-2026-07-10 (Prioridade 3, cliente $200/mês) —
  // Level A: the user's OWN pre-recorded narration (our public storage URL).
  // Compose skips TTS entirely and captions come from Whisper transcription
  // of the real audio instead of the script text.
  user_voiceover_url?: string
  // Level B: narrate with the user's CLONED voice (profiles.voice_clone_id,
  // created in Avatar Studio). Falls back to default TTS on any failure.
  use_cloned_voice?: boolean
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service is not configured.' },
        { status: 500 }
      )
    }
    if (!process.env.CREATOMATE_API_KEY) {
      return NextResponse.json(
        { error: 'Render service is not configured.' },
        { status: 500 }
      )
    }
    // Push #049 — fail fast if the service-role key is missing. Without
    // it the voiceover upload cannot reach Supabase storage and we'd
    // burn an OpenAI TTS call on a job we can't finish.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[compose] SUPABASE_SERVICE_ROLE_KEY is not configured — refusing to start render.')
      return NextResponse.json(
        { error: 'Voiceover storage is not configured. Please contact support.' },
        { status: 500 }
      )
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[compose] NEXT_PUBLIC_SUPABASE_URL is not configured.')
      return NextResponse.json(
        { error: 'Storage backend is not configured.' },
        { status: 500 }
      )
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }
    const authenticatedUserId = user.id

    let body: ComposeBody
    try {
      body = (await req.json()) as ComposeBody
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    // feature/ai-avatar — avatar requests are validated below (quality parse +
    // URL allow-list); they may legitimately carry ZERO stock clips because
    // the talking head fills the whole timeline.
    // KINEO-PRESENTER-2026-07-10 — 'presenter' (Kling AI Avatar v2, 60cr) is
    // an avatar-shaped request: same payload contract, cheaper engine.
    const isAvatarReq =
      ((body.quality ?? '').toString() === 'avatar' || (body.quality ?? '').toString() === 'presenter') &&
      typeof body.avatar_url === 'string' &&
      body.avatar_url.trim().length > 0

    const clipUrls = Array.isArray(body.clip_urls)
      ? body.clip_urls.filter((u) => typeof u === 'string' && u.trim().length > 0)
      : []
    if (clipUrls.length === 0 && !isAvatarReq) {
      return NextResponse.json({ error: 'clip_urls is required.' }, { status: 400 })
    }

    // Push #236 — sanitize at the boundary so NO script marker ([Pexels: ...],
    // [Scene], [HOOK]), directive line (speed:/duration:/...), or markdown can
    // reach TTS or the on-screen captions. This is the single server-side
    // chokepoint every narration path flows through before it is both spoken
    // (generateTTS) and rendered as caption text (buildCreatomateSource).
    // Idempotent: verbatim scripts are already clean; raw-prompt fallbacks are
    // cleaned here.
    const voiceoverScript = stripScriptMarkers(body.voiceover_script ?? '')
    if (!voiceoverScript) {
      return NextResponse.json({ error: 'voiceover_script is required.' }, { status: 400 })
    }

    const sceneCaptions = Array.isArray(body.scene_captions)
      ? body.scene_captions
          .map((c) => (typeof c === 'string' ? c.trim() : ''))
          .filter((c) => c.length > 0)
      : []

    const requestedDuration = Number(body.duration) || 45
    // Avatar duration fix (02/07, TAAFT reviewer bug) — avatar renders follow
    // the REAL narration length (a 4s verbatim line is a ~4s video), so the
    // requested duration is only sanity-clamped for them instead of coerced to
    // the Shorts whitelist. The old coercion turned a short verbatim request
    // (e.g. duration=4 from AvatarStudioClient) into 45, and combined with the
    // ">4s" plausibility gate below produced a 45s render where the avatar
    // speaks for ~4s and the remaining ~40s is black screen.
    // [KINEO-TRIAL-SWAP-2026-08-07] — `let`, não `const`: o free tier com a
    // flag do reverse trial ligada limita o Fast grátis a 15s, e a decisão
    // "este request é free" só existe depois do lookup de plano (isFreePlanFast,
    // abaixo). O clamp acontece lá, ANTES de qualquer reserva/TTS. Flag OFF:
    // nenhuma reatribuição — valor idêntico ao de sempre.
    let duration = isAvatarReq
      ? Math.max(3, Math.min(90, Math.round(requestedDuration)))
      : (SUPPORTED_DURATIONS as readonly number[]).includes(requestedDuration)
        ? requestedDuration
        : 45

    let quality: Quality = ((): Quality => {
      const q = (body.quality ?? 'basic_ai').toString()
      // Push #315 — added cinematic_ai for fal.ai Wan 2.1 mode (3 credits).
      // feature/ai-avatar — 'avatar' accepted ONLY when the request actually
      // carries an avatar payload (validated above).
      if (q === 'avatar') return isAvatarReq ? 'avatar' : 'basic_ai'
      // KINEO-PRESENTER-2026-07-10 — 'presenter' accepted with the same
      // avatar-payload validation (unlisted quality would collapse to
      // basic_ai and silently undercharge — the #315 revenue-leak lesson).
      if (q === 'presenter') return isAvatarReq ? 'presenter' : 'basic_ai'
      // KINEO-HOLLYWOOD-2026-07-09 — cinematic_hollywood accepted.
      return q === 'fast' || q === 'basic' || q === 'pro' || q === 'cinematic_ai' || q === 'cinematic_kling' || q === 'cinematic_veo' || q === 'cinematic_sora' || q === 'cinematic_hollywood' ? q : 'basic_ai'
    })()

    // Push #316 — output language. OpenAI TTS auto-detects from the script text.
    const language = body.language === 'pt' ? 'pt' : body.language === 'es' ? 'es' : 'en'
    const rawGenerationId = typeof body.generationId === 'string' ? body.generationId.trim() : ''
    if (!validComposeGenerationId(rawGenerationId)) {
      return NextResponse.json(
        { error: 'This generation is missing its safety id. Please start it again.' },
        { status: 400 },
      )
    }
    const generationId = rawGenerationId
    const submissionKey = `${authenticatedUserId}:${generationId}`
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[compose] distributed submission guard unavailable: service-role env missing')
      return NextResponse.json(
        { error: 'Render safety check is temporarily unavailable. Nothing was submitted. Please retry.' },
        { status: 503 },
      )
    }
    const composeAdmin: SupabaseClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    let cinematicBirthClaim: CinematicClaim | null = null
    let avatarBirthClaim: VerifiedAvatarBirthClaim | null = null
    const cinematicClaimLoad = await loadVerifiedCinematicClaim({
      db: composeAdmin,
      secret: serviceRoleKey,
      userId: authenticatedUserId,
      generationId,
    })
    if (!cinematicClaimLoad.ok) {
      console.error('[compose] cinematic birth lookup failed:', cinematicClaimLoad.error)
      return NextResponse.json(
        { error: 'AI clip ownership could not be verified. Nothing was submitted.' },
        { status: 503 },
      )
    }
    cinematicBirthClaim = cinematicClaimLoad.claim
    const cinematicQualities = new Set<Quality>([
      'cinematic_ai', 'cinematic_kling', 'cinematic_veo',
      'cinematic_sora', 'cinematic_hollywood',
    ])
    const clientRequestedCinematic = cinematicQualities.has(quality)
    if (cinematicBirthClaim) {
      if (cinematicBirthClaim.status !== 'settled') {
        return NextResponse.json(
          { error: 'Your AI scenes are still being finalized.', pending: true, retry_after_ms: 2500 },
          { status: 409 },
        )
      }
      const trustedQuality = cinematicBirthClaim.quality as Quality
      const authorizedUrls = cinematicBirthClaim.authorizedCompletedUrls
        .filter((url): url is string => typeof url === 'string' && url.length > 0)
      const inputsMatch =
        authorizedUrls.length === clipUrls.length &&
        authorizedUrls.every((url, index) => url === clipUrls[index])
      if (
        !cinematicQualities.has(trustedQuality) || quality !== trustedQuality ||
        cinematicBirthClaim.creditCost !== creditCostFor(trustedQuality, true) ||
        !inputsMatch
      ) {
        return NextResponse.json(
          { error: 'These AI clips do not match their signed generation.' },
          { status: 400 },
        )
      }
      quality = trustedQuality
    } else if (clientRequestedCinematic) {
      return NextResponse.json(
        { error: 'These premium AI clips are missing their signed generation.' },
        { status: 400 },
      )
    } else if (
      quality === 'fast' &&
      clipUrls.some((url) => /^https:\/\/([a-z0-9-]+\.)*fal\.(media|run|ai)\//i.test(url))
    ) {
      return NextResponse.json(
        { error: 'AI-generated clips cannot be submitted as Fast footage.' },
        { status: 400 },
      )
    }
    if (isAvatarReq) {
      const loadedAvatar = await loadPrepaidAvatarClaimForGeneration({
        db: composeAdmin,
        secret: serviceRoleKey,
        userId: authenticatedUserId,
        generationId,
      })
      if (!loadedAvatar.ok) {
        console.error('[compose] avatar birth lookup failed:', loadedAvatar.error)
        return NextResponse.json(
          { error: 'Avatar ownership and billing could not be verified. Nothing was submitted.' },
          { status: 503 },
        )
      }
      avatarBirthClaim = loadedAvatar.claim
      const avatarUrl = (body.avatar_url ?? '').trim()
      const voiceoverUrl = (body.voiceover_url ?? '').trim()
      const signedVoiceoverUrl = typeof avatarBirthClaim?.response?.voiceover_url === 'string'
        ? avatarBirthClaim.response.voiceover_url.trim()
        : ''
      if (
        !avatarBirthClaim || avatarBirthClaim.quality !== quality ||
        avatarBirthClaim.creditCost !== creditCostFor(quality, true) ||
        avatarBirthClaim.completedVideoUrl !== avatarUrl ||
        !signedVoiceoverUrl || signedVoiceoverUrl !== voiceoverUrl
      ) {
        return NextResponse.json(
          { error: 'This avatar video or voiceover does not match its signed paid generation.' },
          { status: 400 },
        )
      }
    }
    const cinematicUpstreamDebited = cinematicBirthClaim?.status === 'settled'
    const avatarUpstreamDebited = avatarBirthClaim !== null
    const claimId = composeClaimId(authenticatedUserId, generationId)
    let ownsSubmissionClaim = false
    let submissionClaimIsCreditHold = false

    const replayOrPending = (renderId: string): NextResponse => {
      if (!renderId || renderId.startsWith('pending:')) {
        return NextResponse.json(
          { error: 'This render is already being submitted.', pending: true, retry_after_ms: 2500 },
          { status: 409 },
        )
      }
      console.log(`[compose] replaying existing generation_id=${generationId} render_id=${renderId}`)
      return NextResponse.json({
        render_id: renderId,
        quality,
        duration,
        voiceover_url: '',
        resumed: true,
      })
    }

    const unavailableClaimResponse = () => NextResponse.json(
      { error: 'Render safety check is temporarily unavailable. Nothing was submitted. Please retry.' },
      { status: 503 },
    )

    const responseForClaimRow = async (row: unknown): Promise<NextResponse> => {
      const claim = row as { id?: unknown; name?: unknown; user_id?: unknown; path?: unknown; session_id?: unknown; metadata?: unknown } | null
      if (
        claim?.id !== claimId || claim.name !== COMPOSE_CLAIM_EVENT ||
        claim.user_id !== authenticatedUserId || claim.path !== COMPOSE_CLAIM_PATH ||
        claim.session_id !== generationId
      ) {
        console.error(`[compose] deterministic claim collision id=${claimId}`)
        return unavailableClaimResponse()
      }
      const metadata = claim.metadata && typeof claim.metadata === 'object'
        ? claim.metadata as Record<string, unknown>
        : {}
      const renderId = typeof metadata.render_id === 'string' ? metadata.render_id.trim() : ''
      const claimStatus = metadata.status === 'done' ? 'done' : metadata.status === 'pending' ? 'pending' : null
      const claimCost = typeof metadata.cost === 'number' && Number.isFinite(metadata.cost) ? metadata.cost : null
      const claimIsCreditHold = metadata.credit_hold === true
      const claimGenerationId = typeof metadata.generation_id === 'string' ? metadata.generation_id : ''
      const claimQuality = typeof metadata.quality === 'string' ? metadata.quality : ''
      if (
        !claimStatus || claimCost === null || claimGenerationId !== generationId || claimQuality !== quality ||
        !verifyComposeClaim(serviceRoleKey, {
          claimId,
          userId: authenticatedUserId,
          generationId,
          status: claimStatus,
          ...(renderId ? { renderId } : {}),
          quality: claimQuality,
          cost: claimCost,
        }, metadata.authority)
      ) {
        console.error(`[compose] rejected unsigned/invalid claim id=${claimId}`)
        return unavailableClaimResponse()
      }
      if (!renderId) {
        // Recover a provider id that was durably linked in broll_metrics even
        // if the final claim metadata write was interrupted. This closes the
        // cold-instance replay gap without ever issuing another provider POST.
        const { data: linkedMetric, error: linkedMetricError } = await composeAdmin
          .from('broll_metrics')
          .select('render_id')
          .eq('generation_id', generationId)
          .eq('user_id', authenticatedUserId)
          .maybeSingle()
        if (!linkedMetricError) {
          const linkedRenderId = typeof linkedMetric?.render_id === 'string'
            ? linkedMetric.render_id.trim()
            : ''
          if (linkedRenderId && linkedRenderId.length <= 160) {
            const intentStored = await recordRenderIntent({
              renderId: linkedRenderId,
              userId: authenticatedUserId,
              quality,
              cost: claimCost,
            })
            const claimStored = await completeGenerationClaim(
              linkedRenderId,
              claimCost,
              true,
              claimIsCreditHold,
            )
            if (cinematicUpstreamDebited ? claimStored : (intentStored || claimStored)) {
              return replayOrPending(linkedRenderId)
            }
          }
        } else {
          console.warn('[compose] pending-claim recovery lookup failed:', linkedMetricError.message)
        }

        // If this retry lands on the same warm instance after the provider POST
        // succeeded but our DB publication failed, recover from the collapsed
        // promise and durably publish it now. Never issue another provider POST.
        const cached = composeSubmissionCache.get(submissionKey)
        const cachedCost = claimCost
        if (cached && cached.expiresAt > Date.now() && cachedCost !== null) {
          try {
            const cachedRenderId = await cached.promise
            const intentStored = await recordRenderIntent({
              renderId: cachedRenderId,
              userId: authenticatedUserId,
              quality,
              cost: cachedCost,
            })
            const claimStored = await completeGenerationClaim(cachedRenderId, cachedCost, true, claimIsCreditHold)
            if (cinematicUpstreamDebited ? claimStored : (intentStored || claimStored)) {
              return replayOrPending(cachedRenderId)
            }
          } catch {
            // Ambiguous cached failures remain pending and are never re-posted.
          }
        }
      }
      return replayOrPending(renderId)
    }

    // The events PK is our cross-instance mutex. Every mode (Fast, cinematic,
    // Avatar and Presenter) reaches this table, unlike broll_metrics. A DB error
    // fails closed before any provider POST.
    try {
      const { data: existingClaim, error: existingClaimError } = await composeAdmin
        .from('events')
        .select('id,name,user_id,path,session_id,metadata')
        .eq('id', claimId)
        .maybeSingle()
      if (existingClaimError) {
        console.error('[compose] distributed claim preflight failed:', existingClaimError.message)
        return unavailableClaimResponse()
      }
      if (existingClaim) return await responseForClaimRow(existingClaim)
    } catch (preflightError) {
      console.error('[compose] distributed claim preflight threw:', preflightError instanceof Error ? preflightError.message : String(preflightError))
      return unavailableClaimResponse()
    }

    // Backward-compatible replay for Fast generations completed before this
    // distributed guard existed. This is not the lock; events remains the
    // authoritative safety boundary for every new submission.
    try {
      const { data: legacyMetric, error: legacyMetricError } = await composeAdmin
        .from('broll_metrics')
        .select('render_id')
        .eq('generation_id', generationId)
        .eq('user_id', authenticatedUserId)
        .maybeSingle()
      if (legacyMetricError) {
        console.warn('[compose] legacy broll replay lookup failed:', legacyMetricError.message)
      } else {
        const legacyRenderId = typeof legacyMetric?.render_id === 'string' ? legacyMetric.render_id.trim() : ''
        if (legacyRenderId && legacyRenderId.length <= 160) return replayOrPending(legacyRenderId)
      }
    } catch (legacyLookupError) {
      console.warn('[compose] legacy broll replay lookup threw:', legacyLookupError instanceof Error ? legacyLookupError.message : String(legacyLookupError))
    }

    async function claimGenerationSubmission(cost: number, creditHold = false): Promise<SubmissionClaimResult> {
      const { error: claimError } = await composeAdmin.from('events').insert({
        id: claimId,
        user_id: authenticatedUserId,
        name: COMPOSE_CLAIM_EVENT,
        path: COMPOSE_CLAIM_PATH,
        session_id: generationId,
        metadata: {
          generation_id: generationId,
          status: 'pending',
           quality,
           cost,
           credit_hold: creditHold,
           duration,
          authority: signComposeClaim(serviceRoleKey, {
            claimId,
            userId: authenticatedUserId,
            generationId,
            status: 'pending',
            quality,
            cost,
          }),
        },
      })
      if (!claimError) {
        ownsSubmissionClaim = true
        submissionClaimIsCreditHold = creditHold
        return { kind: 'acquired' }
      }
      if ((claimError as { code?: string }).code !== '23505') {
        console.error('[compose] distributed submission claim failed:', claimError.message)
        return { kind: 'unavailable', response: unavailableClaimResponse() }
      }
      const { data: current, error: currentError } = await composeAdmin
        .from('events')
        .select('id,name,user_id,path,session_id,metadata')
        .eq('id', claimId)
        .maybeSingle()
      if (currentError || !current) {
        console.error('[compose] distributed claim recheck failed:', currentError?.message ?? 'claim row missing')
        return { kind: 'unavailable', response: unavailableClaimResponse() }
      }
      return { kind: 'existing', response: await responseForClaimRow(current) }
    }

    async function releaseGenerationClaim(): Promise<void> {
      if (!ownsSubmissionClaim) return
      const { error: releaseError } = await composeAdmin
        .from('events')
        .delete()
        .eq('id', claimId)
        .eq('user_id', authenticatedUserId)
        .eq('name', COMPOSE_CLAIM_EVENT)
      if (releaseError) {
        console.error('[compose] explicit-rejection claim release failed; keeping fail-closed:', releaseError.message)
        return
      }
      ownsSubmissionClaim = false
      submissionClaimIsCreditHold = false
    }

    async function completeGenerationClaim(
      renderId: string,
      cost: number,
      recoverExisting = false,
      creditHold = submissionClaimIsCreditHold,
    ): Promise<boolean> {
      if (!ownsSubmissionClaim && !recoverExisting) return false
      const metadata = {
        generation_id: generationId,
        status: 'done',
        render_id: renderId,
        quality,
        cost,
        credit_hold: creditHold,
        duration,
        completed_at: new Date().toISOString(),
        authority: signComposeClaim(serviceRoleKey, {
          claimId,
          userId: authenticatedUserId,
          generationId,
          status: 'done',
          renderId,
          quality,
          cost,
        }),
      }
      let lastError = ''
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const { data: completed, error: completeError } = await composeAdmin
          .from('events')
          .update({ metadata })
          .eq('id', claimId)
          .eq('user_id', authenticatedUserId)
          .eq('name', COMPOSE_CLAIM_EVENT)
          .select('id')
          .maybeSingle()
        if (!completeError && completed?.id === claimId) {
          ownsSubmissionClaim = false
          submissionClaimIsCreditHold = false
          return true
        }
        lastError = completeError?.message ?? 'claim row missing'
      }
      // The current response can still safely carry the accepted render id and
      // the warm-instance cache can replay it. Never release/re-POST here.
      console.error(`[compose] accepted render claim completion failed id=${claimId}: ${lastError}`)
      return false
    }

    async function rejectBeforeProviderSubmission(response: NextResponse): Promise<NextResponse> {
      // Free Fast reserves its distributed claim before any paid TTS/render work
      // so parallel generation ids cannot all pass the daily limit. Explicit
      // local validation/provider-rejection failures release that reservation.
      await releaseGenerationClaim()
      return response
    }

    async function reserveFreeFastPreviewSlot(): Promise<NextResponse | null> {
      // `videos` is written only after the client polls a successful render, so
      // it cannot serialize concurrent submissions. Reserve this generation in
      // the existing events PK mutex first, then audit the rolling window. Each
      // concurrent request commits its own unique claim before it counts; at
      // most FREE_OFFER.limit claims can observe a count within quota.
      const reservation = await claimGenerationSubmission(0)
      if (reservation.kind !== 'acquired') return reservation.response

      const since = new Date(Date.now() - FREE_OFFER.windowMs).toISOString()
      const [claimsResult, videosResult] = await Promise.all([
        composeAdmin
          .from('events')
          .select('id,metadata,created_at')
          .eq('user_id', authenticatedUserId)
          .eq('name', COMPOSE_CLAIM_EVENT)
          .eq('path', COMPOSE_CLAIM_PATH)
          .eq('metadata->>quality', 'fast')
          .eq('metadata->>cost', '0')
          .gte('created_at', since),
        composeAdmin
          .from('videos')
          .select('id,render_id,quality_mode,credits_used')
          .eq('user_id', authenticatedUserId)
          .eq('quality_mode', 'fast')
          .eq('credits_used', 0)
          .gte('created_at', since),
      ])

      if (claimsResult.error || videosResult.error) {
        console.error('[compose] free Fast quota audit failed:',
          claimsResult.error?.message ?? videosResult.error?.message ?? 'unknown database error')
        await releaseGenerationClaim()
        return NextResponse.json(
          { error: 'Free preview limit could not be verified. Nothing was submitted. Please retry.' },
          { status: 503 },
        )
      }

      // KINEO-DEAD-RESERVATION-2026-08-06 — a contagem saiu daqui e virou
      // lib/freeFastQuota.ts, fonte única compartilhada com send-credits-back.
      // A REGRA NÃO MUDOU: toda reserva na janela continua ocupando vaga, como
      // antes. A tentativa de mudá-la (devolver a vaga de reserva que não virou
      // vídeo) foi descartada na revisão adversarial — `videos` é escrito pelo
      // CLIENTE no polling, então "sem linha em videos" não prova falha nossa,
      // prova apenas que o cliente não avisou. Ver o cabeçalho daquele arquivo.
      const claimRows = Array.isArray(claimsResult.data) ? claimsResult.data : []
      const videoRows = Array.isArray(videosResult.data) ? videosResult.data : []
      const usageByUser = countFreeFastUsage({
        claims: claimRows,
        videos: videoRows,
        defaultUserId: authenticatedUserId,
      })
      const reservedOrCompleted = usageByUser.get(authenticatedUserId) ?? 0

      if (reservedOrCompleted > FREE_OFFER.limit) {
        // Calculado ANTES do release e fora do argumento de logComposeRefusal:
        // como argumento ele seria avaliado fora do try/catch que protege a
        // telemetria, e uma exceção aqui transformaria um 402 legítimo em 500.
        const undeliveredReservations = countUndeliveredReservations({
          claims: claimRows,
          videos: videoRows,
          now: Date.now(),
          defaultUserId: authenticatedUserId,
        }).get(authenticatedUserId) ?? 0

        await releaseGenerationClaim()
        // KINEO-REFUSAL-TELEMETRY-2026-07-30 — ver logComposeRefusal.
        await logComposeRefusal('free_fast_limit', authenticatedUserId, {
          used: reservedOrCompleted,
          limit: FREE_OFFER.limit,
          // INSTRUMENTO, não regra: quantas das vagas contadas acima são
          // reservas sem linha em `videos` e já fora do período de graça. Mede
          // quanto desta recusa é potencialmente indevida, para a próxima
          // sprint cruzar com o status real do render no Creatomate. Campo
          // NOVO — `reason` e `used` seguem significando o mesmo de sempre,
          // porque instrumento novo não pode inflar métrica antiga.
          undelivered_reservations: undeliveredReservations,
        })
        return NextResponse.json(
          {
            // [KINEO-TRIAL-SWAP-2026-08-07] — copy do 402 vem da mesma fonte
            // que a promessa pública (flag OFF = frase antiga byte a byte).
            error: FREE_OFFER.copy.limitHitError,
            upsell: 'credits',
            outOfCredits: true,
            upgrade: '/pricing',
          },
          { status: 402 },
        )
      }

      console.log(`[compose] free Fast quota reserved: ${reservedOrCompleted}/${FREE_OFFER.limit} in rolling window of ${Math.round(FREE_OFFER.windowMs / 3600000)}h`)
      return null
    }

    async function reservePaidCreditSlot(cost: number): Promise<NextResponse | null> {
      if (!Number.isInteger(cost) || cost <= 0 || cost > 1000) {
        return NextResponse.json(
          { error: 'This engine cost could not be verified. Nothing was submitted.' },
          { status: 503 },
        )
      }

      // The deterministic event claim is both the provider idempotency mutex and
      // the credit hold. It must exist before TTS/Whisper/Creatomate so parallel
      // generation ids cannot all spend the same balance.
      const reservation = await claimGenerationSubmission(cost, true)
      if (reservation.kind !== 'acquired') return reservation.response

      const holds = await inspectActiveComposeCreditHolds({
        db: composeAdmin,
        secret: serviceRoleKey,
        userId: authenticatedUserId,
        currentClaimId: claimId,
      })
      if (!holds.ok || !holds.currentSeen) {
        console.error('[compose-hold] admission audit failed:', holds.ok ? 'current claim missing' : holds.error)
        await releaseGenerationClaim()
        return NextResponse.json(
          { error: 'Your credit reservation could not be verified. Nothing was submitted. Please retry.' },
          { status: 503 },
        )
      }

      const { data: creditProfile, error: creditProfileError } = await composeAdmin
        .from('profiles')
        // KINEO-TRIAL-BLOCKERS-2026-08-07 — as colunas de trial entram no
        // SELECT porque o gate logo abaixo passou a consultá-las. Sem elas
        // isTrialActive() lê undefined e nega — a falha seria silenciosa e do
        // lado caro (trial pagando 402 no próprio crédito).
        .select(`video_credits, plan, has_paid, ${TRIAL_ENTITLEMENT_COLUMNS}`)
        .eq('id', authenticatedUserId)
        .single()
      if (creditProfileError || typeof creditProfile?.video_credits !== 'number') {
        console.error('[compose-hold] balance lookup failed:', creditProfileError?.message ?? 'invalid balance')
        await releaseGenerationClaim()
        return NextResponse.json(
          { error: 'Your credit balance could not be verified. Nothing was submitted. Please retry.' },
          { status: 503 },
        )
      }

      const balance = Math.max(0, creditProfile.video_credits)
      const plan = String(creditProfile.plan ?? 'free').toLowerCase()
      const paidPlans = new Set([
        'starter', 'starter_trial', 'basic', 'basic_trial',
        'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial',
      ])
      // KINEO-TRIAL-BLOCKERS-2026-08-07 — o trial ativo é entitlement PAGO
      // aqui. Sem este termo, corrigir `isFreePlanFast` abaixo (bloqueador #2)
      // TROCARIA um defeito por outro pior: o Fast do trial deixaria de ser
      // "free com marca d'água" e passaria a cair nesta reserva paga, que o
      // recusaria com 402 "Clean and premium exports require a paid plan" —
      // ou seja, o trial perderia o Fast POR COMPLETO em vez de recebê-lo sujo.
      // Flag OFF ⇒ isTrialActive() é false ⇒ predicado idêntico ao anterior.
      const hasPaidEntitlement =
        paidPlans.has(plan) || creditProfile.has_paid === true || isTrialActive(creditProfile)
      const heldByOtherJobs = Math.max(0, holds.totalHeld - cost)
      const availableBalance = Math.max(0, balance - heldByOtherJobs)
      if (!hasPaidEntitlement || holds.totalHeld > balance) {
        await releaseGenerationClaim()
        return NextResponse.json(
          {
            error: !hasPaidEntitlement
              ? 'Clean and premium exports require a paid plan.'
              : `This export needs ${cost} credit${cost === 1 ? '' : 's'}. ${heldByOtherJobs > 0 ? 'Your active renders already reserve part of your balance. ' : ''}You have ${availableBalance} available.`,
            outOfCredits: hasPaidEntitlement,
            upgrade: '/pricing',
          },
          { status: 402 },
        )
      }

      console.log(`[compose-hold] reserved ${cost} credits; active=${holds.totalHeld}/${balance}`)
      return null
    }

    // Phase 1 Narration Engine — content vertical from analyze-idea (e.g. 'mystery',
    // 'finance', 'geography'). Used by selectPersonaForScript() inside generateTTS()
    // to pick the right voice persona for the niche.
    const vertical = typeof body.vertical === 'string' && body.vertical.trim()
      ? body.vertical.trim().toLowerCase()
      : undefined
    // Map render quality → narration tier so premium/cinematic users get better personas.
    const narrationTier: 'free' | 'premium' | 'cinematic' =
      quality === 'cinematic_ai' || quality === 'cinematic_kling' || quality === 'cinematic_veo' || quality === 'cinematic_sora' || quality === 'cinematic_hollywood' ? 'cinematic' : quality === 'pro' ? 'premium' : 'free'

    // Push #235 — explicit user speed. When supplied (verbatim mode), the
    // narration is the user's exact text spoken at this rate; we don't rewrite
    // the word count and we don't slow the voice to fill the requested duration.
    // Clamped to the same natural band generateTTS() enforces.
    const explicitSpeed: number | null = (() => {
      const s = Number(body.speed)
      return Number.isFinite(s) && s > 0 ? Math.max(0.7, Math.min(1.3, s)) : null
    })()

    // Push #087 — Cinematic-tier renders (anything other than 'fast') must
    // come from a Pro user. Fast Mode renders skip the gate so Free + Basic
    // users can still produce videos via the Pexels pipeline.
    // Push #088 — Cinematic also requires a cinematic_token to have been
    // reserved upstream. /api/generate-video already does the consume on
    // the way in, so by the time we reach /api/compose the user paid for
    // the render. We do NOT decrement again here. We only verify the
    // upstream gate held (plan === pro) as defense in depth.
    // Push #315 — cinematic_ai (fal.ai mode) uses credits, not Pro plan.
    // Only the old Runway-based modes (basic, basic_ai, pro) require Pro.
    // feature/ai-avatar — 'avatar' is exempt from the Pro gate: it is paid via
    // the separate avatar-credits add-on (checkpoint 2), never the Pro plan.
    // KINEO-HOLLYWOOD-2026-07-09 — cinematic_hollywood is credit-based (Studio
    // gate enforced upstream in generate-video-cinematic), so it's exempt here
    // like the other fal engines.
    if (quality !== 'fast' && quality !== 'cinematic_ai' && quality !== 'cinematic_kling' && quality !== 'cinematic_veo' && quality !== 'cinematic_sora' && quality !== 'cinematic_hollywood' && quality !== 'avatar' && quality !== 'presenter') {
      const plan = await fetchUserPlan(supabase, user.id)
      if (!plan.isPro) {
        return NextResponse.json(
          {
            error: 'Cinematic mode requires the Pro plan.',
            currentPlan: plan.tier,
            upgrade: '/pricing',
          },
          { status: 403 }
        )
      }
    }

    // PUSH #20 — one entitlement truth, resolved server-side. Never-paid free
    // accounts get FREE_OFFER.limit watermarked Fast videos per FREE_OFFER
    // rolling window (flag OFF: 3/24h; reverse trial ON: 1/30d). Active plans
    // and prior buyers with remaining credits get clean exports and pay the
    // documented credit cost. Premium AI has no free trial.
    let isFreePlanFast = false
    let withEndCard = false
    if (quality === 'cinematic_ai' || quality === 'fast') {
      const { data: prof, error: profileAccessError } = await supabase
        .from('profiles')
        // KINEO-TRIAL-BLOCKERS-2026-08-07 — colunas de trial no SELECT: é
        // delas que sai `ent` abaixo. Constante compartilhada em vez de lista
        // redigitada, porque esquecer UMA delas falha em silêncio e do lado
        // caro (trial_ends_at ausente = relógio lido como vencido).
        .select(`video_credits, plan, has_paid, ${TRIAL_ENTITLEMENT_COLUMNS}`)
        .eq('id', user.id)
        .single()
      if (profileAccessError) {
        console.error('[compose] entitlement lookup failed:', profileAccessError.message)
        return NextResponse.json(
          { error: 'Your video access could not be verified. Nothing was submitted. Please retry.' },
          { status: 503 },
        )
      }
      const PAID_PLANS = new Set([
        'starter', 'starter_trial', 'basic', 'basic_trial',
        'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial',
      ])
      const isFreePlan = !PAID_PLANS.has((prof?.plan ?? 'free').toLowerCase())
      const hasPaid = (prof as { has_paid?: boolean } | null)?.has_paid === true
      const creditBalance = Math.max(0, Number(prof?.video_credits ?? 0))
      // KINEO-TRIAL-BLOCKERS-2026-08-07 — ENTITLEMENT EFETIVO (bloqueadores #1
      // e #2). `isPaidAccount` recebe o predicado LOCAL desta rota, o mesmo de
      // sempre; o helper só acrescenta o termo do trial. Com a flag OFF
      // `ent.isTrial` é false e `ent.treatAsPaid === !isFreePlan || hasPaid`
      // não altera nenhuma decisão abaixo.
      const ent = getEffectiveEntitlement(prof, { isPaidAccount: !isFreePlan || hasPaid })
      // BLOQUEADOR #1: `|| ent.isTrial`. Sem ele, a conta em trial já debitada
      // em 20 créditos por /api/generate-video-cinematic tomava 402 aqui e só
      // era estornada pelo cron `refund-sweep` das 09:30 do dia seguinte. O
      // saldo em si continua sendo cobrado pela checagem logo abaixo — o trial
      // nasce com 40 créditos e paga o Seedance com eles, que é como o teto de
      // 40 se aplica sozinho (ver invariante 3 em lib/reverseTrial.ts).
      //
      // ⚠️ `|| cinematicUpstreamDebited` — ACHADO DA 1ª REVISÃO ADVERSARIAL
      // DESTA PRÓPRIA CORREÇÃO, e sem ele o bloqueador #1 SOBREVIVERIA no caso
      // que mais importa: o ÚLTIMO Seedance do trial.
      //   trial com used=20, saldo 20 → /api/generate-video-cinematic aprova
      //   (isTrialActive true, 20 < 40), debita 20 → used=40 ⇒ o teto expira o
      //   trial NA MESMA request (expiração passiva, por desenho) ⇒ quando o
      //   cliente chama /api/compose logo em seguida, ent.isTrial já é FALSE,
      //   o saldo é 0 e o 402 volta — com os 20 créditos JÁ gastos.
      // O mesmo vale para o trial cujo relógio vence nos segundos entre as duas
      // rotas. A regra certa não é "trial?", é: CRÉDITO JÁ COBRADO ⇒ ENTREGA.
      // `cinematicUpstreamDebited` é `cinematicBirthClaim.status === 'settled'`,
      // uma linha de claim assinada e verificada no servidor (lib/cinematic/
      // claim.ts) — o cliente não consegue forjá-la, então isto não abre porta
      // para free nenhum: só honra um débito que o nosso próprio backend já fez.
      //
      // ⚠️ POR QUE `REVERSE_TRIAL_ENABLED &&` NA FRENTE — 2ª REVISÃO
      // ADVERSARIAL. A 1ª versão deste termo NÃO era gateada pela flag, e a
      // conferência de "flag OFF ⇒ diff zero" achou UM caso hoje alcançável em
      // que ele mudaria comportamento com a flag desligada: comprador de
      // PACOTE (`plan='free'`, `has_paid=true`) cujo saldo era exatamente 20 e
      // acabou de gastá-lo no Seedance — `creditBalance > 0` vira false depois
      // do débito e ele toma 402 num render que JÁ PAGOU, com estorno só no
      // sweep do dia seguinte. É o mesmo defeito do bloqueador #1, atingindo um
      // cliente pagante, e é ANTERIOR ao reverse trial.
      // NÃO foi corrigido aqui de propósito: esta correção fecha os
      // bloqueadores do QA e nada além disso, e a flag é a fronteira de
      // rollback do sprint inteiro — alargar um gate para contas fora do trial
      // sairia junto num rollback que deveria devolver a produção ao estado
      // exato de hoje. Registrado como dívida em
      // docs/QA-REVERSE-TRIAL-2026-08-07.md para o fundador decidir.
      const hasPaidCreditAccess =
        !isFreePlan ||
        (hasPaid && creditBalance > 0) ||
        ent.isTrial ||
        (REVERSE_TRIAL_ENABLED && cinematicUpstreamDebited)

      if (quality === 'cinematic_ai') {
        const requiredCredits = creditCostFor('cinematic_ai', true)
        if (!hasPaidCreditAccess) {
          return NextResponse.json(
            { error: 'AI Generated videos are available on paid plans. Upgrade to continue.', upgrade: '/pricing' },
            { status: 402 },
          )
        }
        if (!cinematicUpstreamDebited && creditBalance < requiredCredits) {
          // KINEO-REFUSAL-TELEMETRY-2026-07-30 — ver logComposeRefusal.
          await logComposeRefusal('insufficient_credits_ai', authenticatedUserId, {
            required: requiredCredits, balance: creditBalance, quality,
          })
          return NextResponse.json(
            {
              error: `AI Generated needs ${requiredCredits} credits. You have ${creditBalance}.`,
              outOfCredits: true,
              upgrade: '/pricing',
            },
            { status: 402 },
          )
        }
      } else {
        // quality === 'fast'
        // BLOQUEADOR #2: `&& !ent.isTrial`. Este booleano é o interruptor
        // MESTRE do free tier — dele saem, nesta ordem, a marca d'água (linha
        // ~1810), o end card, o clamp de 15s, a reserva de cota (1 Fast/30d com
        // a flag ON) e o preço 0 do render (creditCostFor(quality, !isFreePlanFast)).
        // Uma conta em trial batia nos CINCO. O trial agora segue o caminho
        // PAGO: export limpo, sem clamp, sem cota, e o Fast custa 1 crédito de
        // verdade — que é o que faz o render aparecer no teto de 40 (um Fast
        // grátis seria invisível para o próprio cap do trial).
        // Flag OFF ⇒ ent.isTrial false ⇒ predicado idêntico ao anterior.
        isFreePlanFast = isFreePlan && !hasPaid && !ent.isTrial
        if (isFreePlanFast) {
          // The downloadable watermark + end card are the organic distribution
          // loop. Paid Starter/Creator/Studio and pack-credit renders stay clean.
          withEndCard = true
          // [KINEO-TRIAL-SWAP-2026-08-07] — free tier do reverse trial: Fast
          // grátis limitado a 15s. Clamp ANTES da reserva de cota (o claim
          // grava `duration` no metadata) e antes de TTS/word-count, que
          // escalam pelo mesmo número. Flag OFF: maxFreeFastSeconds é null e
          // nada muda.
          // ⚠️ KINEO-TRIAL-BLOCKERS-2026-08-07 — este comentário AFIRMAVA
          // "contas em trial ativo não passam por aqui — trial gera com crédito
          // (caminho pago)". Era FALSO: nada no caminho de `fast` consultava o
          // trial, e o QA de 07/08 mediu a conta em trial recebendo clamp,
          // marca d'água e a cota free (bloqueador #2). Agora a afirmação é
          // VERDADE, e ela é verdade por causa do `!ent.isTrial` no
          // `isFreePlanFast` acima — não por causa desta frase. Comentário que
          // descreve uma garantia sem apontar o código que a impõe é como esta
          // linha ficou errada por um dia inteiro em produção.
          // KINEO-TRIAL-BLOCKERS-2026-08-07 — o clamp passou a vir de
          // `ent.maxDurationSeconds` em vez de `FREE_OFFER.maxFreeFastSeconds`
          // direto. Dentro deste ramo os dois são o MESMO valor por construção
          // (aqui `treatAsPaid` é necessariamente false: isFreePlanFast implica
          // plano free, sem has_paid e sem trial), então o runtime não muda —
          // o que muda é que a regra "quem sofre clamp" deixa de ser reconstruída
          // aqui e passa a ser lida de onde ela mora. Foi a divergência entre
          // "quem é free para o clamp" e "quem é free para o trial" que
          // produziu o bloqueador #2.
          const maxFreeSeconds = ent.maxDurationSeconds
          if (maxFreeSeconds !== null && duration > maxFreeSeconds) {
            duration = maxFreeSeconds
            console.log(`[compose] free tier duration clamped to ${duration}s (reverse-trial free tier)`)
          }
          const quotaResponse = await reserveFreeFastPreviewSlot()
          if (quotaResponse) return quotaResponse
        } else {
          const requiredCredits = creditCostFor('fast', true)
          if (creditBalance < requiredCredits) {
            // KINEO-REFUSAL-TELEMETRY-2026-07-30 — ver logComposeRefusal.
            await logComposeRefusal('insufficient_credits_fast', authenticatedUserId, {
              required: requiredCredits, balance: creditBalance,
            })
            return NextResponse.json(
              {
                error: `Fast needs ${requiredCredits} credit. You have ${creditBalance}. Upgrade or renew to keep creating clean exports.`,
                outOfCredits: true,
                upgrade: '/pricing',
              },
              { status: 402 },
            )
          }
        }
      }
    }

    const isCreditBilledQuality =
      quality === 'cinematic_ai' || quality === 'cinematic_kling' ||
      quality === 'cinematic_veo' || quality === 'cinematic_sora' ||
      quality === 'cinematic_hollywood' || quality === 'avatar' ||
      quality === 'presenter' || (quality === 'fast' && !isFreePlanFast)
    if (isCreditBilledQuality && !ownsSubmissionClaim) {
      if (cinematicUpstreamDebited || avatarUpstreamDebited) {
        const prepaidReservation = await claimGenerationSubmission(creditCostFor(quality, true), false)
        if (prepaidReservation.kind !== 'acquired') return prepaidReservation.response
      } else {
        const paidReservation = await reservePaidCreditSlot(creditCostFor(quality, true))
        if (paidReservation) return paidReservation
      }
    }

    // ── feature/ai-avatar — validate the avatar payload URLs ──────────────
    // voiceover_url must be OUR public storage object (it was uploaded by
    // /api/generate-avatar); avatar_url must be the fal CDN output or our
    // storage. Anything else is rejected — no arbitrary-URL render surface.
    // KINEO-PRESENTER-2026-07-10 — presenter renders through the same avatar path.
    const avatarMode = quality === 'avatar' || quality === 'presenter'
    const avatarUrlBody = (body.avatar_url ?? '').trim()
    const voiceoverUrlBody = (body.voiceover_url ?? '').trim()
    if (avatarMode) {
      const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`
      const falCdn = /^https:\/\/([a-z0-9-]+\.)*fal\.(media|run|ai)\//i
      if (!voiceoverUrlBody.startsWith(storagePrefix)) {
        return rejectBeforeProviderSubmission(
          NextResponse.json({ error: 'Invalid voiceover for avatar render.' }, { status: 400 }),
        )
      }
      if (!falCdn.test(avatarUrlBody) && !avatarUrlBody.startsWith(storagePrefix)) {
        return rejectBeforeProviderSubmission(
          NextResponse.json({ error: 'Invalid avatar video URL.' }, { status: 400 }),
        )
      }
    }

    // KINEO-OWN-VOICE-2026-07-10 — Level A: the user's OWN narration audio.
    // Must be OUR public storage (uploaded via /api/footage — no arbitrary
    // URLs). Behaves like avatar mode for every AUDIO decision: no scaling,
    // no TTS, no corrective pass, reuse the stored file, Whisper captions.
    const userVoiceUrlBody = (body.user_voiceover_url ?? '').trim()
    const hasUserVoice = !avatarMode && userVoiceUrlBody.length > 0
    if (hasUserVoice) {
      const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`
      if (!userVoiceUrlBody.startsWith(storagePrefix)) {
        return rejectBeforeProviderSubmission(
          NextResponse.json({ error: 'Invalid voiceover URL.' }, { status: 400 }),
        )
      }
    }
    // The pre-existing audio file (avatar lip-synced mp3 OR user upload).
    const externalVoiceUrl = avatarMode ? voiceoverUrlBody : hasUserVoice ? userVoiceUrlBody : ''
    const useClonedVoice = body.use_cloned_voice === true && !avatarMode && !hasUserVoice

    // ── KINEO-HOLLYWOOD-2026-07-09 — HOLLYWOOD MODE compose path ────────────
    // Dedicated pipeline: the clips carry NATIVE audio (Kling3 voice on
    // dialogue scenes, ambience on the rest), so we do NOT run the standard
    // single-mp3 TTS-over-everything flow.
    // KINEO-HOLLYWOOD-24-2026-07-10 — one TTS mp3 PER NARRATED SCENE (was: one
    // per contiguous BLOCK of narrated scenes). With block-level mp3s, a TTS
    // that came out shorter than the block dumped ALL the leftover silence at
    // the END of the block — i.e. an entire trailing support scene (~10s of
    // chart b-roll with no voice, the round-4 defect). Per-scene mp3s pin each
    // narration to ITS OWN scene offset with a hard cap at that scene's end
    // (+0.5s tolerance), so residual silence can only ever be that scene's own
    // tail (<=2-3s), never 10 accumulated seconds. Whisper captions ride the
    // same per-scene mp3 (offset = scene start). Dialogue scenes are never
    // narrated over; background music is off. Every step is best-effort — a
    // failed narration TTS degrades THAT scene to native-audio-only, never a
    // dead render.
    if (quality === 'cinematic_hollywood') {
      const rawEngines = Array.isArray(body.scene_engines) ? body.scene_engines : []
      const rawNarrations = Array.isArray(body.scene_narrations) ? body.scene_narrations : []
      const rawSeconds = Array.isArray(body.scene_seconds) ? body.scene_seconds : []
      // KINEO-HOLLYWOOD-21-2026-07-10 (bug b) — real spoken line per scene.
      const rawDialogues = Array.isArray(body.scene_dialogues) ? body.scene_dialogues : []

      // Defensive alignment: arrays are parallel to clip_urls; anything
      // missing/misaligned degrades that scene to a silent-ish support scene.
      // KINEO-HOLLYWOOD-HOST-2026-07-13 — 'host' accepted (presenter-rendered
      // dialogue scene, speech baked in, seconds = measured audio length).
      const hollywoodClips: HollywoodClipInput[] = clipUrls.map((url, i) => {
        const e = typeof rawEngines[i] === 'string' ? rawEngines[i] : 'support'
        const engine: HollywoodClipInput['engine'] =
          e === 'dialogue' || e === 'cinematic' || e === 'support' || e === 'host' ? e : 'support'
        const sec = Number(rawSeconds[i])
        // KINEO-HOLLYWOOD-21-2026-07-10 (bug b) — dialogue scenes carry their
        // real spoken line (sanitized at the boundary like every script text).
        // KINEO-HOLLYWOOD-HOST-2026-07-13 — host scenes speak a real line too.
        const dlg = (engine === 'dialogue' || engine === 'host') && typeof rawDialogues[i] === 'string'
          ? (rawDialogues[i] as string).trim()
          : ''
        return {
          url,
          engine,
          seconds: Number.isFinite(sec) && sec > 0 ? sec : engine === 'cinematic' ? 8 : 10,
          // Raw body array (NOT the filtered sceneCaptions — filtering empties
          // would shift indices and misalign captions with scenes).
          caption: (Array.isArray(body.scene_captions) && typeof body.scene_captions[i] === 'string'
            ? body.scene_captions[i]
            : '').trim(),
          ...(dlg ? { dialogueLine: dlg } : {}),
        }
      })

      // Timeline offsets (pre-trim — only the LAST scene is ever trimmed by
      // the builder, which never moves earlier offsets).
      // KINEO-HOLLYWOOD-21-2026-07-10 (bug a) — dialogue can now be 5s or 10s
      // (sized to the line); MUST mirror secondsFor in buildHollywoodCreatomateSource
      // or the narration-block offsets drift from the real timeline.
      // KINEO-HOLLYWOOD-HOST-2026-07-13 — host scenes use their MEASURED audio
      // seconds exactly (clamp 2..20, mirrors the builder — snapping would
      // re-introduce the silence/cut-speech defect the host path removes).
      const secondsOf = (c: HollywoodClipInput): number =>
        c.engine === 'host'
          ? (Number.isFinite(c.seconds) && c.seconds > 0 ? Math.min(20, Math.max(2, c.seconds)) : 10)
          : c.engine === 'dialogue' ? (c.seconds === 5 ? 5 : 10) : c.engine === 'cinematic' ? 8 : Math.min(10, Math.max(2, c.seconds))

      // KINEO-HOLLYWOOD-24-2026-07-10 — one pending TTS entry PER narrated
      // scene (no more contiguous-block grouping), placed at that scene's own
      // offset. endCap = end of the SAME scene + 0.5s tolerance: the builder
      // cuts the mp3 there, so narration can never bleed into the next scene
      // and short TTS can never pool silence onto a later scene.
      const pendingBlocks: Array<{ time: number; endCap: number; text: string }> = []
      {
        let cursor = 0
        hollywoodClips.forEach((c, i) => {
          // KINEO-HOLLYWOOD-HOST-2026-07-13 — never narrate over 'host'
          // scenes either: their clip audio IS the speech (our TTS).
          const narr =
            c.engine !== 'dialogue' && c.engine !== 'host' && typeof rawNarrations[i] === 'string'
              ? (rawNarrations[i] as string).trim()
              : ''
          const sec = secondsOf(c)
          if (narr) {
            pendingBlocks.push({
              time: cursor,
              endCap: Math.round((cursor + sec + 0.5) * 1000) / 1000,
              text: narr,
            })
          }
          cursor = Math.round((cursor + sec) * 1000) / 1000
        })
      }

      // KINEO-HOLLYWOOD-HOST-2026-07-13 — ONE NARRATOR VOICE. generateTTS
      // re-selects a persona per call by keyword-scanning the text it gets,
      // so two narration blocks could land on two different voices — and none
      // of them was guaranteed to match the HOST voice the cinematic route
      // synthesized at submit time. Resolution is pinned HERE from the full
      // voiceoverScript (the identical string the route resolved from —
      // stripScriptMarkers is idempotent and runs on both sides), with the
      // same vertical/language, so host speech and narration share one voice.
      // Fail-open: a null pin (or a pinned-synth failure per block) falls
      // back to the exact pre-v3.5 generateTTS call.
      let hollywoodPinnedVoice: HollywoodVoice | null = null
      if (pendingBlocks.length > 0) {
        try {
          hollywoodPinnedVoice = resolveHollywoodVoice(voiceoverScript, language, vertical)
          console.log(
            `[compose] hollywood pinned narration voice: persona=${hollywoodPinnedVoice.personaId} voice=${hollywoodPinnedVoice.voice}`,
          )
        } catch (e) {
          console.warn('[compose] hollywood voice pin failed — per-block persona fallback:', e instanceof Error ? e.message : String(e))
          hollywoodPinnedVoice = null
        }
      }

      // One TTS + upload + Whisper per narrated SCENE (sequential — 2-4
      // scenes typical, still cheap). If NO scene carries narration, TTS is
      // skipped entirely (native audio only).
      const narrationBlocks: HollywoodNarrationBlock[] = []
      for (const blk of pendingBlocks) {
        try {
          // KINEO-HOLLYWOOD-HOST-2026-07-13 — pinned voice first (persona
          // pace × user speed, same formula generateTTS applies internally);
          // any failure degrades to the pre-v3.5 per-block generateTTS.
          let buf: Buffer | null = null
          if (hollywoodPinnedVoice) {
            try {
              buf = await synthesizeHostSpeech({
                text: blk.text,
                voice: hollywoodPinnedVoice.voice,
                speed: hollywoodPinnedVoice.defaultSpeed * (explicitSpeed ?? 1.0),
              })
            } catch (pinErr) {
              console.warn('[compose] hollywood pinned-voice TTS failed — generateTTS fallback:', pinErr instanceof Error ? pinErr.message : String(pinErr))
              buf = null
            }
          }
          if (!buf || buf.length === 0) {
            buf = await generateTTS(blk.text, explicitSpeed ?? 1.0, vertical, narrationTier, language)
          }
          if (!buf || buf.length === 0) continue
          const dur = estimateMp3DurationSeconds(buf)
          if (!(dur > 0.3)) continue
          const [words, url] = await Promise.all([
            transcribeTTSWithTimestamps(buf).catch(() => [] as WhisperWord[]),
            uploadVoiceoverToSupabase(user.id, buf),
          ])
          narrationBlocks.push({
            time: blk.time,
            endCap: blk.endCap,
            url,
            audioDuration: dur,
            text: blk.text,
            words: Array.isArray(words) && words.length > 0 ? words : undefined,
          })
        } catch (blockErr) {
          // Best-effort: THAT scene degrades to native ambient audio + caption
          // (per-scene TTS means one failure no longer mutes neighbor scenes).
          console.warn('[compose] hollywood scene narration failed — continuing without it:',
            blockErr instanceof Error ? blockErr.message : String(blockErr))
        }
      }
      console.log(
        `[compose] hollywood: ${hollywoodClips.length} scenes (${hollywoodClips.map((c) => c.engine[0]).join('')}), ${narrationBlocks.length}/${pendingBlocks.length} per-scene narration mp3(s)`,
      )

      // Watermark / end card: hollywood users are paying Studio users, so only
      // the FORCE list (Joseph's self-promo accounts) applies — same behavior
      // as the other premium fal engines.
      const forced = FORCE_WATERMARK_EMAILS.has((user.email ?? '').toLowerCase())

      let hollywoodSource: Record<string, unknown>
      try {
        hollywoodSource = buildHollywoodCreatomateSource({
          clips: hollywoodClips,
          narrationBlocks,
          watermark: forced,
          endCard: forced,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[compose] hollywood source build failed:', msg)
        return rejectBeforeProviderSubmission(
          NextResponse.json({ error: `Could not assemble the render: ${msg}` }, { status: 500 }),
        )
      }

      // Submit once per authenticated generation. Retrying a provider POST
      // after an ambiguous response can create and charge two render jobs.
      const hollywoodCost = creditCostFor(quality)
      const hollywoodClaim: SubmissionClaimResult = ownsSubmissionClaim
        ? { kind: 'acquired' }
        : await claimGenerationSubmission(hollywoodCost)
      if (hollywoodClaim.kind !== 'acquired') return hollywoodClaim.response
      let hollywoodRenderId: string
      try {
        hollywoodRenderId = await submitCreatomateOnce(hollywoodSource, submissionKey)
      } catch (err) {
        console.error('[compose] hollywood Creatomate submit failed:',
          err instanceof Error ? err.message : String(err))
        if (err instanceof CreatomateSubmitError && err.ambiguous && ownsSubmissionClaim) {
          return NextResponse.json(
            { error: 'Render submission is still being verified.', pending: true, retry_after_ms: 3000 },
            { status: 409 },
          )
        }
        await releaseGenerationClaim()
        return NextResponse.json({ error: 'Render service rejected the job. Please try again.' }, { status: 502 })
      }

      // Same best-effort broll_metrics link as the standard path.
      if (generationId) {
        try {
          const metricsClient = composeAdmin
          let linkQuery = metricsClient
            .from('broll_metrics')
            .update({ render_id: hollywoodRenderId, vertical: vertical ?? null, submitted_at: new Date().toISOString() })
            .eq('generation_id', generationId)
            .eq('user_id', user.id)
          const { error: linkError } = await linkQuery
          if (linkError) console.warn('[broll_metrics] hollywood link failed:', linkError.message)
        } catch (linkError) {
          console.warn('[broll_metrics] hollywood link threw:', linkError instanceof Error ? linkError.message : String(linkError))
        }
      }

      // KINEO-CREDIT-INTENT-2026-07-11 — pin the engine + intended cost to this
      // render_id BEFORE the client can poll status. Hollywood = 150 credits,
      // charged on SUCCESS in /api/compose/status from THIS record (never the
      // client ?quality param). Best-effort (never throws), loud on failure.
      const hollywoodIntentStored = await recordRenderIntent({
        renderId: hollywoodRenderId,
        userId: user.id,
        quality,
        cost: hollywoodCost,
      })
      // Publish the accepted render only after its server-side billing intent
      // exists, so a cross-instance replay cannot race ahead of that record.
      const hollywoodClaimStored = await completeGenerationClaim(hollywoodRenderId, hollywoodCost)
      if (
        (!hollywoodIntentStored && !hollywoodClaimStored) ||
        (cinematicUpstreamDebited && !hollywoodClaimStored)
      ) {
        return NextResponse.json(
          { error: 'Your render was accepted and is being recovered safely.', pending: true, retry_after_ms: 5000 },
          { status: 503 },
        )
      }

      return NextResponse.json({
        render_id: hollywoodRenderId,
        quality,
        duration,
        voiceover_url: narrationBlocks[0]?.url ?? '',
      })
    }
    // ── end KINEO-HOLLYWOOD-2026-07-09 ──────────────────────────────────────

    // Step 1 — Scale the voiceover script to the right word count.
    // Push #235 — verbatim mode (explicit speed) skips scaling entirely: the
    // user wrote the exact narration, so rewriting it to a word-count target
    // would defeat the purpose. The video length then tracks the user's script
    // spoken at their chosen speed.
    // feature/ai-avatar — avatar mode also skips scaling: the script passed in
    // is EXACTLY what the already-rendered mp3 narrates (captions derive from it).
    let scaledScript: string
    if (avatarMode || hasUserVoice) {
      scaledScript = voiceoverScript
      console.log(`[compose] ${avatarMode ? 'avatar mode' : 'user voiceover'} — narration audio already exists, skipping scaling`)
    } else if (explicitSpeed != null) {
      scaledScript = voiceoverScript
      console.log(
        `[compose] verbatim narration (speed=${explicitSpeed}) — skipping word-count scaling`,
      )
    } else {
      try {
        scaledScript = await scaleVoiceoverScript(voiceoverScript, targetWordCount(duration))
        if (!scaledScript) scaledScript = voiceoverScript
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[compose] script scaling failed:', msg)
        // Non-fatal — fall back to the raw script.
        scaledScript = voiceoverScript
      }
    }

    // Step 2 — Generate TTS.
    // feature/ai-avatar — SKIPPED in avatar mode: the narration mp3 already
    // exists (made in /api/generate-avatar) and VEED lip-synced the talking
    // head to that exact file. Re-synthesizing here would produce different
    // timing and desync the lips. We re-download the mp3 only to measure its
    // duration + run Whisper for drift-free captions (both best-effort).
    let audioBuffer: Buffer | null = null
    // KINEO-OWN-VOICE — tracks whether the mp3 came from the user's CLONED
    // voice (the corrective re-synthesis pass must not overwrite it with the
    // default TTS voice).
    let clonedVoiceUsed = false
    // Kineo-AudioCache-2026 — populated ONLY for the standard default-TTS path
    // (never avatar/user-voice/cloned). On a cache hit we skip TTS + Whisper +
    // upload entirely and reuse the stored mp3, Whisper words and duration.
    let voiceoverCacheKey: string | null = null
    let cachedVoiceover: CachedVoiceoverEntry | null = null
    if (avatarMode || hasUserVoice) {
      try {
        const audioRes = await fetch(externalVoiceUrl)
        if (audioRes.ok) {
          audioBuffer = Buffer.from(await audioRes.arrayBuffer())
          console.log(`[compose] ${avatarMode ? 'avatar' : 'user'} voiceover fetched for analysis: ${audioBuffer.length} bytes`)
        } else {
          console.warn(`[compose] external voiceover fetch HTTP ${audioRes.status} — proportional captions fallback`)
        }
      } catch (err) {
        console.warn('[compose] external voiceover fetch failed — proportional captions fallback:', err instanceof Error ? err.message : String(err))
      }
      // Level A hard requirement: a USER voiceover that can't be fetched must
      // fail loudly (there is no TTS to fall back to — the audio IS the video).
      if (hasUserVoice && (!audioBuffer || audioBuffer.length === 0)) {
        return rejectBeforeProviderSubmission(
          NextResponse.json({ error: 'Could not load your voiceover file. Please re-upload it.' }, { status: 502 }),
        )
      }
    } else {
      console.log(
        `[compose] voiceover generation started: user=${user.id.slice(0, 8)} script_words=${scaledScript.split(/\s+/).filter(Boolean).length} duration=${duration}s language=${language}`,
      )
      // KINEO-OWN-VOICE — Level B: narrate with the user's cloned voice
      // (profiles.voice_clone_id, MiniMax). ANY failure falls back to the
      // default TTS so a render never dies because of the clone.
      if (useClonedVoice) {
        try {
          const { data: voiceProfile } = await supabase
            .from('profiles')
            .select('voice_clone_id')
            .eq('id', user.id)
            .single()
          const voiceId = (voiceProfile?.voice_clone_id ?? '').toString().trim()
          if (voiceId) {
            const { synthesizeWithVoice } = await import('@/lib/avatar/voice')
            audioBuffer = await synthesizeWithVoice({ voiceId, text: scaledScript, language })
            clonedVoiceUsed = !!audioBuffer && audioBuffer.length > 0
            if (clonedVoiceUsed) console.log(`[compose] cloned-voice narration: ${audioBuffer!.length} bytes voice=${voiceId.slice(0, 10)}`)
          } else {
            console.warn('[compose] use_cloned_voice=true but no voice_clone_id on profile — default TTS')
          }
        } catch (cloneErr) {
          console.warn('[compose] cloned voice failed — falling back to default TTS:', cloneErr instanceof Error ? cloneErr.message : String(cloneErr))
        }
      }
      // Kineo-AudioCache-2026 — before spending an OpenAI/ElevenLabs TTS call
      // AND a Whisper transcription, check the content-hash cache. Only the
      // default-TTS path is cacheable (cloned voice keys off a voiceId we don't
      // model). FAIL-OPEN: any error → cachedVoiceover stays null → synthesize.
      if (!clonedVoiceUsed && (!audioBuffer || audioBuffer.length === 0)) {
        try {
          const model = ttsModelForTier(narrationTier)
          const identity = resolveTtsVoiceIdentity(
            scaledScript,
            explicitSpeed ?? 1.0,
            vertical,
            narrationTier,
            language,
            model,
          )
          // PUSH #94 — mix VOICEOVER_ENGINE_VERSION into the hashed identity so
          // the #93 splice fix invalidates pre-#93 entries. Only the value fed
          // to the hash is salted — `model` itself is untouched, so the real TTS
          // call and persona resolution are unaffected. Both the lookup and the
          // store below use this same key variable, so they stay in sync.
          voiceoverCacheKey = computeVoiceoverCacheKey({
            script: scaledScript,
            voice: identity.voice,
            speed: identity.speed,
            model: `${model}|engine=${VOICEOVER_ENGINE_VERSION}`,
          })
          cachedVoiceover = await lookupCachedVoiceover(voiceoverCacheKey)
          if (cachedVoiceover) {
            console.log('[compose] reusing cached voiceover — skipping TTS + Whisper')
          }
        } catch (cacheErr) {
          console.warn('[compose] audio cache preflight failed — synthesizing fresh:', cacheErr instanceof Error ? cacheErr.message : String(cacheErr))
          cachedVoiceover = null
        }
      }

      try {
        if (!cachedVoiceover && (!audioBuffer || audioBuffer.length === 0)) {
          audioBuffer = await generateTTS(scaledScript, explicitSpeed ?? 1.0, vertical, narrationTier, language)
        }
        if (!cachedVoiceover) {
          console.log(
            `[compose] TTS response received: bytes=${audioBuffer?.length ?? 0} mime=audio/mpeg speed=${explicitSpeed ?? 1.0} cloned=${clonedVoiceUsed}`,
          )
        }
      } catch (err) {
        // Surface the FULL error object so OpenAI-side issues (rate limit,
        // quota, auth) are diagnosable without redeploying.
        console.error('[compose] TTS failed:', err instanceof Error
          ? JSON.stringify({ name: err.name, message: err.message, stack: err.stack?.split('\n').slice(0, 3).join(' | ') })
          : String(err))
        return rejectBeforeProviderSubmission(
          NextResponse.json(
            { error: 'Voiceover generation failed. Please try again.' },
            { status: 502 },
          ),
        )
      }

      if (!cachedVoiceover && (!audioBuffer || audioBuffer.length === 0)) {
        console.error('[compose] TTS produced an empty buffer — refusing to upload.')
        return rejectBeforeProviderSubmission(
          NextResponse.json(
            { error: 'Voiceover generation returned no audio. Please try again.' },
            { status: 502 },
          ),
        )
      }
    }

    // Push #158 — measure the REAL narration length so captions key to the
    // actual audio, not the requested duration (which assumed 2.5 wps).
    // Kineo-AudioCache-2026 — on a cache hit the duration was measured + stored
    // at synthesis time, so reuse it (no buffer to re-measure).
    let realAudioDuration = cachedVoiceover
      ? cachedVoiceover.audioDuration
      : audioBuffer
        ? estimateMp3DurationSeconds(audioBuffer)
        : 0
    // Avatar duration fix (02/07) — threshold dropped 4s → 0.5s: a legitimately
    // SHORT verbatim line (one sentence ≈ 3s of speech) was being treated as a
    // failed measurement and replaced with the requested duration, so the final
    // video ballooned to 45s with a black tail after the avatar stopped talking.
    // 0.5s still catches real measurement failures (estimateMp3DurationSeconds
    // returns 0 for unparseable buffers).
    if ((avatarMode || hasUserVoice) && !(realAudioDuration > 0.5)) {
      // External-audio fallback chain: measured → value sent by caller → requested.
      const sent = Number(body.real_audio_duration)
      realAudioDuration = Number.isFinite(sent) && sent > 0.5 ? sent : duration
    }
    console.log(
      `[compose] estimated TTS duration: ${realAudioDuration.toFixed(1)}s (requested ${duration}s)`,
    )

    // Push #234 — corrective pass. The final video length tracks the audio
    // length (see buildCreatomateSource), so if the first narration drifts more
    // than the tolerance from the requested duration we re-synthesize once at an
    // adjusted speed. duration scales as 1/speed, so speed = measured/requested
    // pulls the length toward the target (clamped to a natural band in
    // generateTTS). This is best-effort: any failure, or a result that isn't
    // actually closer, keeps the original audio so compose never regresses.
    // Kineo-AudioCache-2026 — predict length from the word count FIRST. When the
    // scaled script is already sized on-target (its predicted narration length is
    // within tolerance of the requested duration), a measured drift is just pace
    // variance and re-synthesizing at an adjusted speed isn't worth a 2nd full
    // TTS — skip it. This avoids firing the corrective pass unnecessarily.
    const scaledWordCount = scaledScript.split(/\s+/).filter(Boolean).length
    const predictedDuration = predictTtsSecondsFromWords(scaledWordCount)
    const scriptWellSized =
      predictedDuration > 0 && Math.abs(predictedDuration - duration) <= DURATION_TOLERANCE_SECONDS
    if (
      !cachedVoiceover && // never re-synthesize a cache hit (no buffer, already corrected)
      !avatarMode && // feature/ai-avatar — never re-synthesize the lip-synced mp3
      !hasUserVoice && // KINEO-OWN-VOICE — the user's file IS the narration
      !clonedVoiceUsed && // never replace the cloned voice with the default one
      !scriptWellSized && // word count already predicts an on-target length → don't re-synth
      explicitSpeed == null &&
      realAudioDuration > 4 &&
      Math.abs(realAudioDuration - duration) > DURATION_TOLERANCE_SECONDS
    ) {
      const correctiveSpeed = realAudioDuration / duration
      console.log(
        `[compose] duration off by ${(realAudioDuration - duration).toFixed(1)}s — re-synthesizing at speed=${correctiveSpeed.toFixed(3)}`,
      )
      try {
        const retryBuffer = await generateTTS(scaledScript, correctiveSpeed, vertical, narrationTier, language)
        if (retryBuffer && retryBuffer.length > 0) {
          const retryDuration = estimateMp3DurationSeconds(retryBuffer)
          const improved =
            retryDuration > 4 &&
            Math.abs(retryDuration - duration) < Math.abs(realAudioDuration - duration)
          if (improved) {
            audioBuffer = retryBuffer
            realAudioDuration = retryDuration
            console.log(
              `[compose] corrected TTS duration: ${retryDuration.toFixed(1)}s (requested ${duration}s)`,
            )
          } else {
            console.log(
              `[compose] corrective pass not closer (${retryDuration.toFixed(1)}s) — keeping original`,
            )
          }
        }
      } catch (retryErr) {
        const msg = retryErr instanceof Error ? retryErr.message : String(retryErr)
        console.warn('[compose] corrective TTS pass failed — keeping original:', msg)
      }
    }

    // Step 2b + Step 3 — Fix 3 (12/06): Whisper transcription and the
    // voiceover upload are INDEPENDENT (Whisper reads the in-memory buffer,
    // the upload writes the same buffer to storage), but they used to run
    // back-to-back on the hot path, adding their latencies (~2s + ~1s) to
    // every render. They now run in PARALLEL — same outputs, same fallbacks,
    // 1–3s less user-facing wait per video.
    //
    // Whisper (Push #258): word-level timestamps for DIRECT caption building
    // (no drift from number expansion). Non-fatal — proportional fallback.
    // Upload: avatar mode reuses the mp3 already in storage (zero work).
    // Kineo-AudioCache-2026 — on a cache HIT we already have the Whisper words +
    // the stored mp3 URL, so skip both the transcription and the upload.
    let whisperWords: WhisperWord[] | undefined
    let voiceoverUrl: string
    if (cachedVoiceover) {
      whisperWords = cachedVoiceover.words.length > 0 ? cachedVoiceover.words : undefined
      voiceoverUrl = cachedVoiceover.voiceoverUrl
      console.log(`[compose] cache hit — voiceover reused from ${voiceoverUrl.slice(0, 80)}`)
    } else {
      const whisperPromise: Promise<WhisperWord[] | undefined> = audioBuffer
        ? transcribeTTSWithTimestamps(audioBuffer)
            .then((words) => {
              if (words.length > 0) {
                console.log(`[compose] Whisper sync: ${words.length} words for direct caption build`)
                return words
              }
              console.warn('[compose] Whisper returned 0 words — proportional fallback')
              return undefined
            })
            .catch((whisperErr) => {
              console.warn('[compose] Whisper step threw — proportional fallback:', whisperErr)
              return undefined
            })
        : Promise.resolve(undefined)

      const uploadPromise: Promise<{ url: string } | { uploadError: unknown }> = (avatarMode || hasUserVoice)
        ? Promise.resolve({ url: externalVoiceUrl })
        : uploadVoiceoverToSupabase(user.id, audioBuffer as Buffer)
            .then((url) => {
              console.log(`[compose] voiceover stored at: ${url}`)
              return { url }
            })
            .catch((err: unknown) => ({ uploadError: err }))

      const [words, uploadResult] = await Promise.all([whisperPromise, uploadPromise])

      if ('uploadError' in uploadResult) {
        const err = uploadResult.uploadError
        // Surface FULL error object — name, message, stack head — so the
        // root cause (bucket missing, RLS, network) is visible in Vercel
        // logs. Never log the service key itself.
        console.error('[compose] voiceover upload failed:', err instanceof Error
          ? JSON.stringify({ name: err.name, message: err.message, stack: err.stack?.split('\n').slice(0, 3).join(' | ') })
          : String(err))
        return rejectBeforeProviderSubmission(
          NextResponse.json(
            { error: 'Could not store the voiceover. Please try again.' },
            { status: 502 },
          ),
        )
      }
      whisperWords = words
      voiceoverUrl = uploadResult.url

      // Kineo-AudioCache-2026 — best-effort: populate the cache for future
      // identical renders (only the default-TTS path is cacheable). Awaited so
      // the small mp3 upload completes before the function can be frozen, but
      // wrapped so it can NEVER break a render that already succeeded.
      const cacheable = !avatarMode && !hasUserVoice && !clonedVoiceUsed && !!voiceoverCacheKey
      if (cacheable && voiceoverCacheKey && audioBuffer && realAudioDuration > 0) {
        try {
          await storeCachedVoiceover(voiceoverCacheKey, audioBuffer, whisperWords ?? [], realAudioDuration)
        } catch (storeErr) {
          console.warn('[compose] audio cache store failed (non-fatal):', storeErr instanceof Error ? storeErr.message : String(storeErr))
        }
      }
    }

    // Phase 5 — Detect persona for response metadata (observability + future UI).
    const detectedPersonaId: string | undefined = vertical
      ? selectPersonaForScript(scaledScript, vertical, narrationTier, language).id
      : undefined

    // Step 4 — Build the Creatomate source.
    //
    // Push #158 (Fix #158) — captions are re-derived from the FINAL scaled
    // script (the exact text the TTS reads) by buildCreatomateSource's
    // buildCaptionSegments pipeline. This reverses Push #132, which used the
    // original per-scene `scene_captions`: whenever scaleVoiceoverScript
    // rewrote the narration, the voice said one thing while the caption
    // showed the pre-rewrite scene text. `scene_captions` is now passed only
    // as a fallback for when the scaled script can't be segmented.
    const haveSceneCaptions = sceneCaptions.length > 0
    console.log(
      '[compose] scenes:',
      JSON.stringify(
        sceneCaptions.map((caption, i) => ({
          scene: i + 1,
          voiceover: scaledScript, // shared TTS source — per-scene split not available at this layer
          caption,
        })),
      ),
    )
    console.log('[compose] captions being sent:', JSON.stringify(sceneCaptions))
    console.log(
      `[compose] caption source: re-segmented scaled script (${scaledScript.split(/\s+/).filter(Boolean).length} words); scene_captions fallback available=${haveSceneCaptions}`,
    )

    // Push #293/#488 — fetch background music. Best-effort: never block the
    // render. Seeded with the voiceover upload URL (unique per render) so the
    // track is deterministic per render but rotates across renders.
    let musicUrl: string | null = null
    try {
      musicUrl = await getBackgroundMusicUrl(voiceoverUrl)
    } catch (err) {
      console.warn('[compose] music fetch failed, continuing WITHOUT background music:', err instanceof Error ? err.message : String(err))
    }

    let source: Record<string, unknown>
    try {
      source = buildCreatomateSource({
        clipUrls,
        voiceoverUrl,
        voiceoverScript: scaledScript,
        sceneCaptions,
        duration,
        quality,
        realAudioDuration,
        whisperWords,
        musicUrl,
        avatarUrl: avatarMode ? avatarUrlBody : null,
        // Hook Avatar (12/06) — validated: only meaningful in avatar mode and
        // when plausibly inside the timeline.
        avatarHookSeconds:
          avatarMode &&
          typeof body.avatar_hook_seconds === 'number' &&
          body.avatar_hook_seconds > 2 &&
          body.avatar_hook_seconds < 30
            ? body.avatar_hook_seconds
            : null,
        watermark:
          isFreePlanFast ||
          FORCE_WATERMARK_EMAILS.has((user.email ?? '').toLowerCase()), // #434 — Joseph's self-promo accounts always watermarked
        // Free growth-loop videos and Joseph's self-promo accounts carry the
        // end card. Every paid export is clean.
        endCard:
          withEndCard ||
          FORCE_WATERMARK_EMAILS.has((user.email ?? '').toLowerCase()),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[compose] source build failed:', msg)
      return rejectBeforeProviderSubmission(
        NextResponse.json(
          { error: `Could not assemble the render: ${msg}` },
          { status: 500 },
        ),
      )
    }

    // Step 5 — Submit to Creatomate once per authenticated generation. The
    // provider has no documented idempotency key, so a blind retry after an
    // ambiguous response can create and charge two jobs.
    const intendedCost = creditCostFor(quality, quality === 'fast' ? !isFreePlanFast : false)
    const claim: SubmissionClaimResult = ownsSubmissionClaim
      ? { kind: 'acquired' }
      : await claimGenerationSubmission(intendedCost)
    if (claim.kind !== 'acquired') return claim.response
    let renderId: string
    try {
      renderId = await submitCreatomateOnce(source, submissionKey)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[compose] Creatomate submit failed:', msg)
      if (err instanceof CreatomateSubmitError && err.ambiguous && ownsSubmissionClaim) {
        return NextResponse.json(
          { error: 'Render submission is still being verified.', pending: true, retry_after_ms: 3000 },
          { status: 409 },
        )
      }
      await releaseGenerationClaim()
      return NextResponse.json(
        { error: 'Render service rejected the job. Please try again.' },
        { status: 502 }
      )
    }

    // Best-effort sanity check — confirm the render actually exists.
    try {
      await pollCreatomateRender(renderId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[compose] post-submit poll warning:', msg)
    }

    // Push #355 — Link the broll_metrics row (created in generate-video-fast)
    // to this Creatomate render so compose/status can write render_time_ms.
    // Best-effort: never blocks the render response.
    if (generationId) {
      try {
        const metricsClient = composeAdmin
        let linkQuery = metricsClient
          .from('broll_metrics')
          .update({
            render_id:    renderId,
            vertical:     vertical ?? null,
            submitted_at: new Date().toISOString(),
          })
          .eq('generation_id', generationId)
          .eq('user_id', user.id)
        const { error: metricsErr } = await linkQuery
        if (metricsErr) {
          console.warn('[broll_metrics] compose update failed:', metricsErr.message)
        } else {
          console.log(`[broll_metrics] linked generation_id=${generationId} → render_id=${renderId}`)
        }
      } catch (metricsEx) {
        console.warn('[broll_metrics] compose update threw:', metricsEx instanceof Error ? metricsEx.message : String(metricsEx))
      }
    }

    // KINEO-CREDIT-INTENT-2026-07-11 — pin the engine + intended cost to this
    // render_id BEFORE the client can poll status, so the billing decision in
    // /api/compose/status reads the ENGINE from here and ignores the client's
    // ?quality / ?deducted params. For Fast, the intended cost mirrors the
    // watermark decision's paid-user resolution (isFreePlanFast): paid → 1,
    // free → 0. Premium engines are deterministic. Best-effort, never throws.
    const intentStored = await recordRenderIntent({
      renderId,
      userId: user.id,
      quality,
      cost: intendedCost,
    })
    const claimStored = await completeGenerationClaim(renderId, intendedCost)
    if ((!intentStored && !claimStored) || (cinematicUpstreamDebited && !claimStored)) {
      return NextResponse.json(
        { error: 'Your render was accepted and is being recovered safely.', pending: true, retry_after_ms: 5000 },
        { status: 503 },
      )
    }

    return NextResponse.json({
      render_id: renderId,
      quality,
      duration,
      voiceover_url: voiceoverUrl,
      persona_id: detectedPersonaId,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[compose] unexpected error:', msg)
    return NextResponse.json(
      { error: 'Something went wrong while preparing the render.' },
      { status: 500 }
    )
  }
}
