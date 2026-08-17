// Push #315 — Cinematic Mode: fal.ai Wan 2.1 AI video generation.
// Submits each scene to fal.ai queue (async), returns request IDs immediately.
// Client polls /api/cinematic-clip-status until all clips are ready, then
// hands off to /api/compose exactly like Fast Mode. Cost: 3 credits.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
// KINEO-SALVAGE-2026-08-17 — fingerprint da retomada + status-check das cenas
// guardadas (mesmo padrão do cinematic-clip-status).
import { createHash } from 'crypto'
import { fal } from '@fal-ai/client'
import { generateScenes, shortCaptionFromVoiceover } from '@/lib/runway'
// KINEO-CAPACITY-2026-08-08 — teto GLOBAL diário de renders de IA (disjuntor).
import { checkAiRenderDailyCap, AI_RENDER_CAP_MESSAGE } from '@/lib/aiRenderCircuitBreaker'
import { parseUserScript } from '@/lib/scriptParser'
import { openai } from '@/lib/openai'
// KINEO-HOLLYWOOD-2026-07-09 — Hollywood Mode 2.0: per-scene engine routing
// with native audio. KINEO-HOLLYWOOD-22-2026-07-10: Kling3 dialogue+support /
// Veo3.1 cinematic (1-2 epic shots max) — Seedance is OUT (visual coherence).
// KINEO-HOLLYWOOD-30-2026-07-10 — HOLLYWOOD 3.0 "UM MUNDO": two image anchors
// (canonical presenter portrait + empty environment still) generated BEFORE
// the scenes; every scene then runs Kling O3 Pro IMAGE-to-video seeded with
// its anchor → same face + same world across every cut. Fail-open: no anchors
// → the v2.4 t2v path below runs unchanged.
import {
  HOLLYWOOD_MODELS,
  KLING3_I2V_MODEL,
  mentionsRealPerson,
  planHollywoodScenes,
  logHollywoodCost,
  type HollywoodPlan,
} from '@/lib/hollywood/router'
import { generateHollywoodAnchors, generateCinematicSceneStill, ANCHORS_USD, type HollywoodAnchors } from '@/lib/hollywood/anchors'
// KINEO-CINEMATIC-ANCHOR-2026-07-24 — flag that gates the classic-Kling anchor
// (FLUX still) + image-to-video path. OFF by default → pure t2v, byte-identical.
import { CINEMATIC_ANCHOR_ENABLED } from '@/lib/flags'
// KINEO-REVERSE-TRIAL-P1-2026-08-06 — reverse trial: entitlement Creator
// durante o trial (Studio NUNCA) + débito pelo wrapper único que soma no hard
// cap de 40 (ADENDO A1 de 06/08). Com KINEO_REVERSE_TRIAL_ENABLED OFF,
// isTrialActive() é sempre
// false e debitVideoCredits é byte-idêntico ao rpc direto.
import { isTrialActive, trialUiState, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'
import { debitVideoCredits } from '@/lib/credits/debit'
// KINEO-HOLLYWOOD-HOST-2026-07-13 — HOLLYWOOD HOST MODE v3.5: anchored
// dialogue scenes get ONE voice. The scene's line is synthesized with OUR TTS
// (same persona the compose narration resolves — see lib/hollywood/hostVoice)
// and lip-synced onto the canonical portrait via Kling AI Avatar v2 (the AI
// Presenter engine, $0.0562/s vs O3's $0.168/s). ANY failure on this path
// falls back per-scene to the O3 i2v native-audio submit below (v3.0).
import {
  buildHostPerformancePrompt,
  resolveHollywoodVoice,
  synthesizeHostSpeech,
  type HollywoodVoice,
} from '@/lib/hollywood/hostVoice'
import {
  AvatarSubmitError,
  PRESENTER_MODEL as HOST_PRESENTER_MODEL,
  submitAvatarJob,
} from '@/lib/avatar/veed'
import { estimateMp3DurationSeconds, uploadVoiceoverToSupabase } from '@/lib/compose'
import {
  ACTIVE_COMPOSE_CREDIT_HOLD_TTL_MS,
  inspectActiveComposeCreditHolds,
} from '@/lib/credits/composeHold'
import { refundRenderCredits } from '@/lib/credits/refund'
import { FalQueueSubmitError, submitFalQueueOnce } from '@/lib/falQueue'
import {
  acquireCinematicClaim,
  cinematicClaimId,
  cinematicRequestFingerprint,
  completeCinematicClaim,
  releaseCinematicClaim,
  settleCinematicClaim,
  validCinematicGenerationId,
  type CinematicClaim,
  type CinematicRequestId,
} from '@/lib/cinematic/claim'

// KINEO-POLL-FATAL-2026-08-17 — era 60. Na noite do fal travado a rota morreu
// em "Task timed out after 60 seconds" DEPOIS do débito e ANTES do estorno
// (cobrança presa até o cron). O caminho Hollywood (planner + até 2 replans +
// âncoras + host TTS + 7 submits) pode passar de 60s legitimamente; compose já
// roda com 300. Mesmo teto aqui: timeout deixa de ser modo de falha realista.
export const maxDuration = 300

type CachedCinematicSubmission = {
  fingerprint: string
  creditCost: number
  quality: string
  engine: string
  response: Record<string, unknown>
  requestIds: CinematicRequestId[]
  models: string[]
  expiresAt: number
}

// Recovers the narrow case where Fal accepted a job but publishing the signed
// response to events briefly failed on the same warm serverless instance.
const cinematicSubmissionCache = new Map<string, CachedCinematicSubmission>()

// Push #402 — two user-selectable engines with different credit costs.
// KINEO-REBASE-2026-07-10 — CREDIT REBASE 2:1: every engine cost divided by 2
// (Seedance 40→20, Kling 90→45, Veo 180→90, Sora 200→100). USD value per video
// is unchanged because plan credits halved in lockstep (lib/pricing.ts).
// Free trial only ever uses Seedance.
const SEEDANCE_CREDIT_COST = 20
const KLING_CREDIT_COST = 50 // KINEO-PRICING-V3B-2026-07-10 — 45 → 50 cr (margin bump). Keep in sync with creditCostFor('cinematic_kling') in compose/status.
// Push #489/#491 — premium cinematic engines (Veo 3.1 Fast, Sora 2) via fal.
// KINEO-REBASE-2026-07-10 — 90/100 new credits = 180/200 old (same USD value).
const VEO_CREDIT_COST = 90
const SORA_CREDIT_COST = 100 // Sora segue BLOQUEADO (KINEO-SORA-REMOVED) — valor só por consistência.
// KINEO-HOLLYWOOD-22-2026-07-10 — custo real: support saiu do Seedance
// ($0.052/s) e foi pro Kling 3 ($0.168/s) pela coerência visual. Típico 55s
// ≈ $8.90-10.20 (Hollywood 3.0 i2v).
// KINEO-REBASE-2026-07-10 — HOLLYWOOD = 150 créditos: preço FINAL aprovado 10/07
// (equivale a 300 old-credits ≈ $28 de crédito → margem saudável sobre ~$10 de fal).
const HOLLYWOOD_CREDIT_COST = 150

// fal.ai model — Wan 2.5 text-to-video (commercial, supports 9:16, $0.05/s).
// #368 — Seedance 1.5 Pro. The earlier 'submit error' (#366) was fal EXHAUSTED
// BALANCE (403 'User is locked'), NOT a param/access bug — confirmed via the
// detailed error log. With balance topped up, re-enabling Seedance: better
// visual quality, ~48% cheaper than Wan ($0.13 vs $0.25/clip @720p no audio),
// faster (~30-45s/clip). Same { video: { url } } output. Fallback = Wan.
// KINEO-SEEDANCE-SLUG-2026-08-17 — alavanca de upgrade sem deploy de codigo:
// o Seedance 2.5 (rei do i2v na arena de ago/2026, clipes nativos de 30s) ja
// esta no fal. Pra testar em stage/preview: setar KINEO_SEEDANCE_SLUG no env
// do Vercel (ex.: 'fal-ai/bytedance/seedance-2.5/text-to-video' — validar o
// slug exato e o schema ANTES no llms.txt do modelo; docs/MOTOR-MAX.md).
// Sem a env, producao segue byte-identica no 1.5.
const SEEDANCE_MODEL = process.env.KINEO_SEEDANCE_SLUG || 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
// Push #401 — premium engine for the Pro plan. Kling 2.5 Turbo Pro is more
// cinematic (motion/physics/prompt adherence) than Seedance. Same { video: { url } }
// output shape. Kling has no `resolution`/`generate_audio` params and is silent
// by default, so our TTS narration (added in compose) stays the only audio.
const KLING_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video'
// KINEO-CINEMATIC-ANCHOR-2026-07-24 — the CLASSIC Kling image-to-video
// counterpart of KLING_MODEL: same Kling 2.5 Turbo Pro family, confirmed in use
// by Animate (ANIMATE_MODEL in lib/avatar/veed.ts). Silent by default (no
// generate_audio), so compose's TTS narration stays the only audio — exactly
// like the Kling t2v path. Used ONLY on the flag-gated anchored path: each scene
// is seeded with its OWN FLUX still so the clips share one world/palette.
// NOTE (cross-file): to poll these clips, this model string must ALSO be present
// in ALLOWED_MODELS in app/api/cinematic-clip-status/route.ts (that file is
// outside this change's edit scope — see the PR notes / report).
const KLING_I2V_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video'
// Push #489 — Veo 3.1 Fast: Google's cinematic text-to-video on fal. 9:16, 8s,
// audio off; identical { video: { url } } output, same fal.queue submit/poll.
const VEO_MODEL = 'fal-ai/veo3.1/fast'
// Push #491 — Sora 2 (OpenAI) text-to-video on fal. Same { video: { url } }
// output + fal.queue pattern. Has native audio, but compose mutes every clip
// track (volume 0%), so the TTS narration stays the only audio.
const SORA_MODEL = 'fal-ai/sora-2/text-to-video'
// KINEO-HOLLYWOOD-2026-07-09 — Kling 3 Pro (native voice + lip sync) drives
// the Hollywood dialogue scenes. Same { video: { url } } output + fal.queue.
const KLING3_MODEL = HOLLYWOOD_MODELS.dialogue
// Back-compat: other modules import FAL_MODEL.
const FAL_MODEL = SEEDANCE_MODEL

// KINEO-FAL-ALARM-2026-07-06 — never break silently on an exhausted fal balance.
// submitToFal flips this when fal reports "User is locked / exhausted balance";
// the POST handler then (a) e-mails the founder and (b) returns a soft "queued"
// response instead of a dead 502. Reset at the top of every POST.
let FAL_EXHAUSTED = false
function looksExhausted(e: { status?: number; message?: string; body?: unknown }): boolean {
  const blob = `${e?.message ?? ''} ${JSON.stringify(e?.body ?? '')}`.toLowerCase()
  return e?.status === 403 || /exhaust|locked|insufficient|balance|quota|payment/.test(blob)
}
// Fire-and-forget founder alert via Resend. Throttled to once per 30 min via a
// module timestamp so a burst of failures doesn't spam the inbox.
let LAST_FAL_ALERT = 0
async function alertFalExhausted(context: string): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key || key === 'your_resend_api_key_here') return
    const now = Date.now()
    if (now - LAST_FAL_ALERT < 30 * 60 * 1000) return
    LAST_FAL_ALERT = now
    const from = process.env.RESEND_FROM_EMAIL || 'Kineo <support@usekineo.com>'
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: ['josephsskaf@gmail.com'],
        subject: '🚨 Kineo: fal.ai balance EXHAUSTED — AI videos are failing',
        text: `The fal.ai balance is exhausted — AI (Seedance/Kling/Veo) renders are failing RIGHT NOW and users are seeing the "high demand" queue message instead of a video.\n\nContext: ${context}\nTime: ${new Date().toISOString()}\n\nRecharge fal.ai to restore AI generation: https://fal.ai/dashboard/billing`,
      }),
    })
    console.error('[cinematic] FAL BALANCE EXHAUSTED — founder alerted')
  } catch (e) {
    console.error('[cinematic] fal alert email failed:', e instanceof Error ? e.message : String(e))
  }
}

// KINEO-SEEDANCE-720-CREATOR-2026-07-06 — margin fix. Seedance v1.5 pro at 1080p
// runs ~$0.62-0.74/clip on fal; a Creator video is 6-9 clips, which breaks the
// Creator ($24.90/240cr → $0.59/clip break-even). Dropping Seedance to 720p
// (~$0.26/clip) is imperceptible on a 9:16 phone Short and keeps Creator safely
// profitable. Studio keeps 1080p as its premium differentiator (hd=true).
// Build the per-model fal input (params differ between Seedance and Kling).
// KINEO-HOLLYWOOD-2026-07-09 — `hollywood` flips the audio-on variants: clips
// carry NATIVE audio (voice/ambience) instead of being silent for TTS-over.
// `seconds` = planned scene length (support scenes only; dialogue/cinematic are
// fixed at 10s/8s by their engines). Defaults keep every existing call intact.
// KINEO-HOLLYWOOD-30-2026-07-10 — `imageUrl` (optional): the anchor image for
// the Kling O3 Pro image-to-video branch (Hollywood 3.0). Unused by every
// other model — all existing calls stay byte-identical.
function buildFalInput(
  model: string,
  prompt: string,
  hd: boolean = true,
  hollywood: boolean = false,
  seconds?: number,
  imageUrl?: string,
  // KINEO-SEED-2026-07-24 — one deterministic seed per generation, shared by
  // every classic scene so the clips read as one coherent look/world instead of
  // independent random draws. Confirmed param name is `seed` on all three
  // classic fal models (Seedance v1.5 pro t2v, Kling 2.5 Turbo Pro t2v, Veo 3.1
  // Fast). Only added when provided → every existing call stays byte-identical,
  // and Hollywood (which never passes it) is untouched.
  seed?: number,
): Record<string, unknown> {
  // KINEO-HOLLYWOOD-30-2026-07-10 — HOLLYWOOD 3.0 anchored scenes. Kling O3
  // Pro image-to-video: `image_url` (confirmed — NOT `start_image_url`) is the
  // canonical portrait (dialogue) or the environment still (support/
  // cinematic); duration is a STRING '3'..'15' (scene seconds are 5/8/10, all
  // in range — passed EXACTLY, no 5|10 snap: i2v bills per second, $0.168/s
  // audio-on); generate_audio true (dialogue speaks its quoted line natively,
  // b-roll gets ambience). Aspect follows the 9:16 anchor image, so no
  // aspect_ratio param. Only the confirmed params are sent (no negative_prompt
  // — the zero-readable-text rule rides in the prompt suffix from the router).
  if (model === KLING3_I2V_MODEL) {
    const sec = Math.max(3, Math.min(15, Math.round(typeof seconds === 'number' && seconds > 0 ? seconds : 10)))
    return {
      image_url: imageUrl,
      prompt,
      duration: String(sec),
      generate_audio: true,
    }
  }
  // KINEO-HOLLYWOOD-2026-07-09 — Kling 3 Pro dialogue scenes: 9:16, native
  // audio ON (the model generates the character's voice + lip sync from the
  // quoted line inside the prompt). No people-banning negative prompt here —
  // fictional people are the POINT of Hollywood Mode.
  // KINEO-HOLLYWOOD-21-2026-07-10 (bug a) — duration follows the planned scene
  // seconds (5 or 10, sized to the dialogue line by the router; default 10) so
  // a short line never leaves the person mute for half the clip.
  // KINEO-HOLLYWOOD-21-2026-07-10 (bug d) — anti-Chinese-text terms appended to
  // the EXISTING negative_prompt (Kling 3 is a Chinese model; on-screen text
  // renders in Chinese).
  // KINEO-HOLLYWOOD-22-2026-07-10 — this branch now ALSO serves hollywood
  // 'support' scenes (Seedance is out): same model, prompt is visual-only (no
  // quoted line), so generate_audio:true yields ambient sound, not speech.
  // Duration snap ≤6s→'5' covers both dialogue (exact 5|10) and support.
  if (model === KLING3_MODEL) {
    // KINEO-MOTORMAX-2026-08-16 — schema oficial: duration aceita QUALQUER
    // inteiro 3-15 (o snap 5|10 criava dead air ou fala cortada) e cfg_scale
    // (default 0.5) aumenta aderencia ao prompt — menos cena aleatoria/gemea.
    return {
      prompt,
      duration: String(Math.max(3, Math.min(15, Math.round(typeof seconds === 'number' && seconds > 0 ? seconds : 10)))),
      aspect_ratio: '9:16',
      generate_audio: true,
      cfg_scale: 0.6,
      negative_prompt: 'cartoon, anime, illustration, 3d render, blur, distort, low quality, watermark, text, logo, caption, chinese text, foreign text, on-screen text, readable signs, subtitles, captions, phone screen with text, rotated frame, sideways composition, vertical horizon, tilted horizon, soft focus, out of focus',
    }
  }
  if (model === SORA_MODEL) {
    return {
      prompt,
      aspect_ratio: '9:16',
      resolution: '720p',
      duration: 8,
    }
  }
  if (model === VEO_MODEL) {
    // KINEO-HOLLYWOOD-2026-07-09 — Hollywood cinematic scenes: native ambient
    // audio ON, and NO people ban in the negative prompt (fictional people are
    // allowed in Hollywood Mode). The classic faceless Veo path is unchanged.
    if (hollywood) {
      // KINEO-HOLLYWOOD-21-2026-07-10 (bug d) — anti-on-screen-text terms
      // appended to the existing negative_prompt.
      return {
        prompt,
        aspect_ratio: '9:16',
        duration: '8s',
        // KINEO-VEO-1080-2026-08-16 — schema oficial fal veo3.1/fast: enum
        // 720p|1080p|4k e o PRECO E O MESMO em 720p e 1080p ($0.10/s
        // silencioso; 4k que dobra). Upgrade de qualidade gratis, ligado
        // antes do TAAFT (decisao do fundador 16/08). Creditos inalterados.
        resolution: '1080p',
        generate_audio: true,
        negative_prompt: 'cartoon, anime, illustration, 3d render, blur, distort, low quality, watermark, text, logo, caption, chinese text, foreign text, on-screen text, readable signs, subtitles, captions, phone screen with text, rotated frame, sideways composition, vertical horizon, tilted horizon, soft focus, out of focus',
      }
    }
    return {
      prompt,
      aspect_ratio: '9:16',
      duration: '8s',
      // KINEO-VEO-720-2026-07-06 — era 720p por margem. KINEO-VEO-1080-2026-08-16:
      // fal cobra IGUAL em 720p e 1080p no veo3.1/fast (schema oficial conferido)
      // — Full HD ligado sem custo extra, antes do TAAFT.
      resolution: '1080p',
      generate_audio: false,
      // KINEO-MOTORMAX-2026-08-16 — safety_tolerance 5 (default 4): menos
      // bloqueio espurio de moderacao = menos cena dropada. Nossos prompts
      // sao b-roll documental — o filtro default e calibrado pra UGC livre.
      safety_tolerance: '5',
      negative_prompt: 'human face, person, people, crowd, cartoon, anime, illustration, 3d render, blur, distort, low quality, watermark, text, logo, caption',
      // KINEO-SEED-2026-07-24 — shared per-generation seed for cross-clip coherence.
      ...(typeof seed === 'number' ? { seed } : {}),
    }
  }
  // KINEO-CINEMATIC-ANCHOR-2026-07-24 — CLASSIC Kling image-to-video (2.5 Turbo
  // Pro i2v — the same endpoint Animate uses, lib/avatar/veed.ts). `image_url`
  // is THIS scene's own FLUX still; the clip animates it, so all scenes share
  // one palette/world without every scene opening on the same frame. Aspect
  // follows the 9:16 still (no aspect_ratio param, exactly like the O3 i2v
  // branch above). negative_prompt/cfg_scale mirror the Kling t2v branch so the
  // faceless brand carries over; the shared seed keeps retries stable. Only sent
  // for this model → every other (existing) call stays byte-identical.
  if (model === KLING_I2V_MODEL) {
    return {
      image_url: imageUrl,
      prompt,
      duration: '10',
      negative_prompt: 'people, person, human, face, crowd, logo, caption, blur, distort, low quality, watermark, text',
      cfg_scale: 0.6,
      ...(typeof seed === 'number' ? { seed } : {}),
    }
  }
  if (model === KLING_MODEL) {
    return {
      prompt,
      duration: '10',
      aspect_ratio: '9:16',
      negative_prompt: 'people, person, human, face, crowd, logo, caption, blur, distort, low quality, watermark, text',
      cfg_scale: 0.6,
      // KINEO-SEED-2026-07-24 — shared per-generation seed for cross-clip coherence.
      ...(typeof seed === 'number' ? { seed } : {}),
    }
  }
  // KINEO-HOLLYWOOD-2026-07-09 — Hollywood support scenes on Seedance: native
  // ambient audio ON + duration follows the planned scene length (Seedance
  // accepts 5s/10s — round down to 5 only for short closers). Classic path below
  // is untouched.
  // KINEO-HOLLYWOOD-22-2026-07-10 — UNREACHABLE for hollywood since support
  // moved to Kling 3 (KLING3_MODEL branch above). Kept as-is in case support
  // ever needs to fall back to Seedance for cost reasons.
  if (hollywood) {
    // KINEO-HOLLYWOOD-21-2026-07-10 (bug d) — Seedance v1.5 pro has NO
    // negative_prompt param (verified against the fal schema in #440; adding
    // one risks a 422). The zero-readable-text rule rides in the POSITIVE
    // prompt suffix the router appends to every scene.
    return {
      prompt,
      aspect_ratio: '9:16',
      resolution: '720p',
      // KINEO-MOTORMAX-2026-08-16 — duration continua 4-12 no schema; exata =
      // sem dead air E mais barata (preco por token ∝ duracao).
      duration: String(Math.max(4, Math.min(12, Math.round(typeof seconds === 'number' && seconds > 0 ? seconds : 10)))),
      generate_audio: true,
    }
  }
  // Seedance (default). KINEO-SEEDANCE-720-CREATOR-2026-07-06: resolution seguia
  // o plano — Studio 1080p, Creator 720p (margem).
  // KINEO-1080-GERAL-2026-08-17 (fundador: "qualidade e muito importante para a
  // nossa porta" — aprovado): 1080p PRA TODOS. Custo fal por video Seedance
  // sobe ~2x (preco por token ∝ pixels), a margem no Creator estreita mas segue
  // positiva; o pricing novo (matriz V4, pendente de aprovacao) reequilibra.
  // A porta mostra Full HD → o produto entrega Full HD, em todo plano.
  return {
    prompt,
    aspect_ratio: '9:16',
    resolution: '1080p',
    // KINEO-MOTORMAX-2026-08-16 — duracao exata 4-12 (schema): sem dead air e
    // ~20% mais barata quando a cena planejada e de 8s (preco por token).
    duration: String(Math.max(4, Math.min(12, Math.round(typeof seconds === 'number' && seconds > 0 ? seconds : 10)))),
    generate_audio: false,
    // KINEO-SEED-2026-07-24 — shared per-generation seed for cross-clip coherence.
    ...(typeof seed === 'number' ? { seed } : {}),
  }
}

// #440 — AI Gen "random person" fix. The fal prompt used to be the raw stock
// SEARCH query (e.g. "luxury penthouse interior", "businessman office"), which
// is keyword soup for a text-to-video model. Seedance fills the empty scene by
// inventing an unrelated human — the random "japanese man" that showed up in an
// Elon Musk video. Seedance v1.5 pro has NO negative_prompt param (verified
// against the fal schema), so the positive prompt is the only lever. We (1)
// strip identity-bearing person nouns that make the model spawn a stranger and
// (2) force faceless, environment-first b-roll — which is exactly this channel's
// faceless brand. Hands/silhouettes/crowds-from-behind still render fine via the
// environment framing; what we kill is the random foreground face.
const PERSON_NOUN_RE =
  /\b(?:(?:a|an|the)\s+)?(?:(?:random|generic|young|old|asian|white|black|european|american|middle[-\s]?aged)\s+)*(?:businessman|businesswoman|man|woman|men|women|person|persons|people|guy|guys|boy|boys|girl|girls|lady|ladies|gentleman|ceo|entrepreneur|trader|crowd|family|child|children|kid|kids|student|students)s?\b/gi

// KINEO-ERA-LOCK-2026-07-09 (system-level, not GPT-dependent) — real failure:
// a Battle of Waterloo (1815) video rendered TANKS on the field and a made-up
// "Napoleon" face (frame-checked by Joseph, sent to a live Upwork client).
// Prompt-side instructions in analyze-idea help but the model/GPT can ignore
// words — so this is enforced IN CODE on every prompt before it reaches fal:
//  (a) NAMED_FIGURE_RE: titled/famous historical names become a silhouetted
//      figure seen from behind (AI can never match a real likeness anyway);
//  (b) eraLockSuffix(): if the script mentions a pre-1940 year or era word,
//      every scene prompt gets a hard period-accuracy tail (Seedance has no
//      negative_prompt param, so the positive prompt is the only lever).
const NAMED_FIGURE_RE =
  /\b(?:(?:emperor|general|marshal|king|queen|tsar|czar|president|commander|colonel|admiral|captain|duke|lord|sir|kaiser|pharaoh)\s+[A-Z][\w'-]+|napoleon(?:\s+bonaparte)?|bonaparte|wellington|hitler|stalin|churchill|caesar|cleopatra|genghis\s+khan|alexander\s+the\s+great|abraham\s+lincoln|george\s+washington|joan\s+of\s+arc)\b/gi

const ERA_YEAR_RE = /\b1[0-8][0-9]{2}\b|\b19[0-3][0-9]\b/ // years 1000–1939
const ERA_WORD_RE =
  /\b(ancient|medieval|middle\s+ages|renaissance|victorian|napoleonic|roman\s+empire|byzantine|colonial\s+era|civil\s+war|revolutionary\s+war|b\.?c\.?e?\b|\d{1,2}(?:st|nd|rd|th)\s+century)\b/i

function eraLockSuffix(context: string): string {
  const ctx = (context || '').slice(0, 4000)
  const yearMatch = ctx.match(ERA_YEAR_RE)
  if (!yearMatch && !ERA_WORD_RE.test(ctx)) return ''
  const era = yearMatch ? `the year ${yearMatch[0]}` : 'the historical era being narrated'
  return (
    `, period piece set strictly in ${era}, only historically accurate clothing, weapons, ` +
    `vehicles and architecture from that exact time, absolutely no modern objects, no tanks, ` +
    `no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, ` +
    `no power lines, no asphalt, no plastic`
  )
}

function buildFacelessCinematicPrompt(raw: string): string {
  let s = (raw || '').replace(/\s+/g, ' ').trim()
  s = s
    // Named historical figures → silhouette from behind (never a face).
    .replace(NAMED_FIGURE_RE, 'a distant silhouetted figure seen from behind')
    .replace(PERSON_NOUN_RE, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.;:–-]+/, '')
    .trim()
  if (s.length < 3) s = 'cinematic establishing environment shot'
  return (
    `${s}, faceless cinematic b-roll, empty scene focused on the environment, ` +
    `objects and scenery, no people, no human faces, documentary establishing shot, ` +
    `photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, ` +
    `9:16 vertical, subject framed in the upper two-thirds with the lower third clear for captions, no text, no watermark, no logo`
  )
}

// #441 — AI Gen quality. The verbatim path (default flow: auto-structured
// script with [Pexels:] markers) had NO cinematic description — both the
// description and the query were the raw stock-search keywords, which produce
// flat, incoherent AI video (and invite the random-person bug). This turns each
// scene's NARRATION into one real cinematic SHOT description for Seedance, so
// the model gets a shot to direct instead of keyword soup. One gpt-4o-mini call
// for all scenes; on any failure the caller falls back to the query (no
// regression). Faceless by instruction AND re-enforced by buildFacelessCinematicPrompt.
async function generateCinematicDescriptions(
  scenes: { voiceover: string; stockSearchQuery?: string; description: string }[],
  topic: string,
): Promise<string[]> {
  const list = scenes
    .map((s, i) => {
      const vo = (s.voiceover || '').trim()
      const hint = (s.stockSearchQuery || s.description || '').trim()
      return `Scene ${i + 1}:\n  narration: ${vo || '(none)'}\n  visual hint: ${hint || '(none)'}`
    })
    .join('\n\n')

  const system = `You are a cinematographer for a FACELESS documentary-style YouTube Shorts channel. For each scene's narration line, write ONE vivid cinematic SHOT description (12-24 words) to feed a text-to-video AI.

RULES:
- Anchor the shot on the LITERAL subject of that scene's narration (the exact place, object, event, number, or concept being said).
- FACELESS only: show environment, landscapes, architecture, money, screens, objects, hands, or silhouettes/crowds seen from behind or far away. NEVER an identifiable person or face in the foreground. Never invent a random human to fill the scene.
- Include a camera move (aerial, slow push-in, tracking, pan, or macro), plus lighting and mood.
- VARY the camera move and framing across scenes — do not repeat the same shot type; rotate aerial / tracking / slow push-in / macro / wide / low-angle.
- Keep ONE consistent look across all scenes: same dark cinematic mood, color palette and lighting, as if from the same film.
- Frame the subject in the upper two-thirds; keep the lower third uncluttered for on-screen captions.
- Vertical 9:16, cinematic, photorealistic. No on-screen text, captions, or logos.
- Output ONLY valid JSON: { "descriptions": ["...", "..."] } with EXACTLY ${scenes.length} items, in scene order.`

  const userMsg = `Topic: ${topic.slice(0, 200)}\n\nScenes:\n${list}`

  const completion = await openai.chat.completions.create(
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.6,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    },
    // KINEO-DESC-RETRY-2026-07-24 — one retry so a single transient failure
    // (429/5xx/timeout) doesn't collapse the verbatim path to raw keyword-soup
    // queries. The caller's try/catch keeps the keyword fallback as last resort.
    { timeout: 15000, maxRetries: 1 },
  )

  const raw = completion.choices[0]?.message?.content?.trim() ?? ''
  if (!raw) return []
  const data = JSON.parse(raw) as { descriptions?: unknown }
  const arr = Array.isArray(data.descriptions) ? data.descriptions : []
  return arr.map((d) => (typeof d === 'string' ? d.trim() : ''))
}

// #369 — clip count = ceil(duration/9), capped 2..6. One ~9-10s clip per
// timeline slot so a 45s video gets 5 distinct clips and a 60s video gets 6
// (no looping/repetition in compose).
// Push #445 — cap raised 6→9. AI Gen clips are unique ~10s gens; a 60s video
// needs ~6-7 and a 90s needs ~9 distinct clips so compose (CLIP_LEN=10 for AI
// Gen) can cover the whole timeline without recycling/repeating. 45s→5, 60s→7,
// 90s→9 (was all capped at 6, which forced repetition on longer videos).
function clipCountForDuration(d: number): number {
  return Math.max(2, Math.min(9, Math.ceil(d / 9)))
}

// KINEO-SEED-2026-07-24 — deterministic per-generation seed. Derived from the
// stable claim/billing reference (cinematic-<claimId>, itself a pure function of
// user id + generationId) so a retried submit of the SAME generation always
// produces the SAME seed — the paid job is never re-diced. FNV-1a 32-bit hash
// (Math.imul, integer-safe) folded into a non-negative 31-bit int (mod 2^31);
// NOT Math.random (non-deterministic → breaks retry stability + reproducibility).
// A single shared seed across every classic scene is what makes the clips read
// as one coherent look/world instead of independent random draws.
function deterministicSeed(input: string): number {
  let h = 2166136261 // FNV-1a offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 2147483648 // 2^31 → [0, 2147483647]
}

// KINEO-HOLLYWOOD-2026-07-09 — `hollywood`/`seconds` forwarded to buildFalInput
// (audio-on variants); defaults keep every existing call byte-identical.
// KINEO-HOLLYWOOD-30-2026-07-10 — `imageUrl` forwarded to buildFalInput (Kling
// O3 i2v anchor); default keeps every existing call byte-identical.
async function submitToFal(prompt: string, model: string = SEEDANCE_MODEL, hd: boolean = true, hollywood: boolean = false, seconds?: number, imageUrl?: string, seed?: number): Promise<string | null> {
  try {
    return await submitFalQueueOnce(
      model,
      buildFalInput(model, prompt, hd, hollywood, seconds, imageUrl, seed),
    )
  } catch (err) {
    // #366 — surface the FULL fal error (status + body + message) so a model /
    // param / access issue is diagnosable straight from Vercel logs (the bare
    // object stringified to "[object]" before, hiding the real cause).
    const e = err as { status?: number; body?: unknown; message?: string; name?: string }
    const status = err instanceof FalQueueSubmitError ? err.status ?? undefined : e?.status
    const body = err instanceof FalQueueSubmitError ? err.providerBody : e?.body
    console.error('[cinematic] fal.ai submit error:', JSON.stringify({
      name: e?.name, status, message: e?.message, body,
    }))
    // KINEO-FAL-ALARM-2026-07-06 — flag an exhausted-balance failure so the POST
    // handler alerts the founder + soft-queues instead of hard-erroring.
    if (looksExhausted({ status, message: e?.message, body })) FAL_EXHAUSTED = true
    // A transport/408/5xx or a success response without an id cannot prove
    // that Fal did not accept the paid job. Never re-POST that scene.
    if (!(err instanceof FalQueueSubmitError) || err.ambiguous) throw err
    return null
  }
}

// ═══ KINEO-TRIAL-STALL-2026-08-14 ═══════════════════════════════════════════
// A ROTA DO MOTOR DE 20 CRÉDITOS NÃO TINHA UMA ÚNICA LINHA DE TELEMETRIA DE
// RECUSA. Medido hoje: `compose_refused` tem 39 linhas em 45 dias e TODAS as 39
// são `free_fast_limit`. Zero `insufficient_credits_ai` — não porque a recusa
// não aconteça, mas porque quem recusa o AI Generated é ESTA rota, e
// `logComposeRefusal` mora em /api/compose. A operação vinha deduzindo o
// encalhe do trial por aritmética sobre `credit_debits` (sprint das 13h)
// porque não existe evento nenhum para ele.
//
// NOME DE EVENTO REUSADO DE PROPÓSITO (`compose_refused`, não um nome novo):
// mesma decisão de KINEO-EXAMPLES-PROVA-SEM-PORTA — a recusa entra no placar
// que a operação JÁ lê em vez de viver num evento só dela. O `path` distingue
// a origem, e o `reason` continua sendo a chave de agrupamento.
//
// AWAIT, nunca `void`: a linha seguinte responde 402 e uma lambda que responde
// pode ser congelada antes da promessa resolver — instrumento que só grava
// quando dá sorte não é instrumento. O custo é irrelevante num caminho que já
// é o caminho do erro, e o try/catch garante que a telemetria nunca vire a
// causa de uma recusa virar 500.
// ═══ KINEO-TRIAL-STALL-FALSO-2026-08-15 ═══════════════════════════════════
// POR QUE ESTA FUNÇÃO EXISTE — um caso REAL, medido, com carimbo de hora.
//
// O paywall `trial_credits_stalled` (KINEO-TRIAL-STALL-2026-08-14) DISPAROU
// PELA PRIMEIRA VEZ NA HISTÓRIA DO BANCO em 15/08 — e a estreia dele foi um
// FALSO POSITIVO. 5 eventos, 1 pessoa, uma sessão só:
//
//   16:41:04  credit_debits: −20 (render `cinematic-b911…`)  saldo 39 → 19
//   16:42:37  compose_refused balance=19 needed=20 → "Your trial has 19
//             credits left and an AI video needs 20. Add a plan…" + modal
//   …×5 até 16:45:58 (a pessoa insistiu 5 vezes)
//   17:30:57  refunded_at gravado — o crédito VOLTOU, 49 min depois
//
// Ou seja: durante 49 minutos a conta tinha 39 créditos e um render morto
// segurando 20 deles, e a tela vendeu um plano usando o número temporário
// como se fosse o fim do trial. A pessoa JÁ TINHA clicado em checkout às
// 16:15 e abandonado; recebeu mais 5 pedidos de compra baseados numa conta
// que o próprio sistema sabia que ia se desfazer sozinha.
//
// O saldo NÃO está errado — 19 é mesmo o que dá para gastar naquele segundo,
// e por isso a recusa continua sendo 402. O que está errado é o DIAGNÓSTICO:
// isto não é "seu trial acabou", é "o seu outro vídeo está segurando".
//
// ⚠️ A ARMADILHA QUE A 1ª PASSADA CAIU, registrada para nunca mais:
// `refunded_at IS NULL` NÃO significa "em voo". Um render BEM-SUCEDIDO fica
// `refunded_at NULL` PARA SEMPRE (o débito de 1 crédito das 16:08 desta mesma
// conta está assim, e entregou vídeo). Usar só esse predicado prometeria a
// volta de um crédito que a pessoa GASTOU de verdade — mentira pior do que a
// que estamos consertando, porque essa nunca se resolve sozinha.
//
// ⚠️ A SEGUNDA ARMADILHA: `trial_credits_used` também não serve de sinal. Ele
// acompanha o DÉBITO, não a entrega (lib/reverseTrial:22 soma no débito e o
// estorno subtrai), então às 16:42 ele valia 21 e só voltou a 1 às 17:30 —
// `granted − used` daria os mesmos 19 e não veria nada.
//
// O TESTE QUE DECIDE é o da ENTREGA, por TEMPO e não por render_id: um débito
// de cinematic nasce com um id (`cinematic-…`) e o vídeo final é composto com
// OUTRO id (é por isso que sweepStuckRenderDebits exclui `cinematic-%` e
// delega para sweepAbandonedCinematicDebits). Logo "existe linha em `videos`
// com esse render_id" é inútil aqui. "A conta ganhou ALGUM vídeo depois deste
// débito" é o teste certo e é uma consulta indexada por (user_id, created_at).
//
// JANELA: CINEMATIC_ABANDON_CUTOFF_MS (45 min) + 60 min de folga, porque a
// varredura é HORÁRIA — 105 min é o pior caso real de um crédito preso. Um
// débito mais velho que isso não desculpa nada e cai no fluxo antigo.
//
// FAIL-CLOSED em tudo: qualquer erro de leitura devolve 0 e o comportamento
// volta a ser exatamente o de antes. Esta função NUNCA libera geração, NUNCA
// devolve crédito e NUNCA muda preço — ela só decide QUAL FRASE o usuário lê.
const HELD_CREDIT_LOOKBACK_MS = 45 * 60 * 1000 + 60 * 60 * 1000
async function creditsHeldByUnsettledRender(userId: string): Promise<number> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return 0
    const db = createAdminClient(url, key, { auth: { persistSession: false } })
    const since = new Date(Date.now() - HELD_CREDIT_LOOKBACK_MS).toISOString()

    const { data: debits, error } = await db
      .from('credit_debits')
      .select('amount, created_at')
      .eq('user_id', userId)
      .eq('kind', 'video')
      .is('refunded_at', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5)
    if (error || !debits || debits.length === 0) return 0

    // O débito mais ANTIGO da janela define o corte: se a conta não recebeu
    // NENHUM vídeo desde então, nenhum destes débitos entregou.
    const oldest = debits[debits.length - 1]
    const { data: delivered, error: vidErr } = await db
      .from('videos')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', String(oldest.created_at))
      .order('created_at', { ascending: false })
      .limit(1)
    if (vidErr) return 0 // fail-closed: sem prova de não-entrega, não afirma nada

    // ⚠️ 2ª passada: comparar os instantes como NÚMERO, nunca como string.
    // ISO lexicográfico só coincide com a ordem cronológica quando os dois
    // lados têm exatamente o mesmo formato (mesmo offset, mesmas casas de
    // fração) — um "Z" contra um "+00:00", ou 6 casas contra 3, inverte a
    // comparação em silêncio e o `tsc` fica verde.
    //
    // ⚠️ E O SENTIDO DA FALHA IMPORTA (2ª passada, contra a minha própria
    // linha anterior): um `created_at` ilegível NÃO pode ser tratado como
    // "não entregue", porque isso SOMA no `held` e a soma é o que gera a
    // promessa de crédito de volta. Débito que não dá para datar é PULADO —
    // no máximo a pessoa lê a frase antiga, nunca uma promessa inventada.
    const lastVideoMs =
      delivered && delivered.length > 0 ? Date.parse(String(delivered[0].created_at)) : NaN
    let held = 0
    for (const d of debits) {
      const debitMs = Date.parse(String(d.created_at))
      if (!Number.isFinite(debitMs)) continue
      // Entregou = existe vídeo com created_at >= o deste débito.
      if (Number.isFinite(lastVideoMs) && lastVideoMs >= debitMs) continue
      const amount = typeof d.amount === 'number' ? d.amount : Number(d.amount)
      if (Number.isFinite(amount) && amount > 0) held += amount
    }
    return held
  } catch (err) {
    console.warn(
      '[cinematic] held-credit lookup failed (ignorado):',
      err instanceof Error ? err.message : String(err),
    )
    return 0
  }
}

async function logCinematicRefusal(
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
      path: '/api/generate-video-cinematic',
      // `reason` DEPOIS do spread, sempre: `...metadata` por último é colisão
      // silenciosa (lição de 08/08 — um `reason` já foi sobrescrito neste
      // repositório e o evento gravou outra coisa por meses).
      metadata: { ...metadata, reason },
    })
  } catch (err) {
    console.warn(
      '[cinematic] refusal telemetry failed (ignorado):',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function POST(req: NextRequest) {
  let activeBirthClaim: {
    db: SupabaseClient
    secret: string
    userId: string
    generationId: string
    billingReference: string
    debitConfirmed: boolean
  } | null = null
  let providerSubmissionMayExist = false
  let releaseActiveBirthClaim: ((reason: string) => Promise<boolean>) | null = null
  try {
    FAL_EXHAUSTED = false // KINEO-FAL-ALARM — reset per request
    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'Cinematic mode is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }

    // KINEO-HOLLYWOOD-2026-07-09 — `language` accepted (already sent by the
    // client) so the Hollywood planner knows the input language.
    // KINEO-CHARACTER-LOCK-2026-07-10 — characterId: a saved character (My
    // Characters) whose portrait replaces the generated Hollywood PORTRAIT
    // anchor → the SAME person appears across every video the user makes.
    // KINEO-HOLLYWOOD-HOST-2026-07-13 — two new OPTIONAL fields (absent →
    // byte-identical behavior): `vertical` (the analyze-idea niche, forwarded
    // by the client) pins the SAME narrator persona here and in /api/compose;
    // `brollScenes[].userFootageUrl` (My Footage, same contract as
    // generate-video-fast) is the prepared hook for demo scenes using the
    // user's own clips.
    let body: { generationId?: string; prompt?: string; duration?: number; engine?: string; language?: string; vertical?: string; characterId?: string; brollScenes?: Array<{ sceneNumber?: number; brollPrompt?: string; shotType?: string; negativePrompt?: string; userFootageUrl?: string }>; globalStyle?: { mood?: string; lighting?: string; cameraStyle?: string } }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const prompt = (body.prompt ?? '').trim()
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
    }
    if (prompt.length > 12000) {
      return NextResponse.json({ error: 'Prompt is too long.' }, { status: 400 })
    }
    const generationId = typeof body.generationId === 'string' ? body.generationId.trim() : ''
    if (!validCinematicGenerationId(generationId)) {
      return NextResponse.json(
        { error: 'This AI generation is missing its safety id. Please start it again.' },
        { status: 400 },
      )
    }

    const duration = Number(body.duration) || 45
    // Runtime-validate optional director data before any OpenAI/Fal work. A TS
    // annotation is not a JSON boundary: null/malformed scene entries used to
    // crash only after paid Hollywood anchors had already been generated.
    const rawPlanScenes: unknown = body.brollScenes
    if (
      rawPlanScenes !== undefined &&
      (!Array.isArray(rawPlanScenes) || rawPlanScenes.length > 12 || rawPlanScenes.some((scene) =>
        !scene || typeof scene !== 'object' || Array.isArray(scene)
      ))
    ) {
      return NextResponse.json({ error: 'Invalid cinematic scene plan.' }, { status: 400 })
    }
    const planScenes = (Array.isArray(rawPlanScenes) ? rawPlanScenes : []).map((raw) => {
      const scene = raw as Record<string, unknown>
      const optionalString = (value: unknown, max: number) =>
        typeof value === 'string' && value.trim().length > 0
          ? value.trim().slice(0, max)
          : undefined
      return {
        sceneNumber: typeof scene.sceneNumber === 'number' && Number.isInteger(scene.sceneNumber)
          ? Math.max(1, Math.min(99, scene.sceneNumber))
          : undefined,
        brollPrompt: optionalString(scene.brollPrompt, 1200),
        shotType: optionalString(scene.shotType, 120),
        negativePrompt: optionalString(scene.negativePrompt, 500),
        userFootageUrl: optionalString(scene.userFootageUrl, 4096),
      }
    })
    const rawStyle: unknown = body.globalStyle
    if (rawStyle !== undefined && (!rawStyle || typeof rawStyle !== 'object' || Array.isArray(rawStyle))) {
      return NextResponse.json({ error: 'Invalid cinematic style.' }, { status: 400 })
    }
    const styleRecord = (rawStyle ?? {}) as Record<string, unknown>
    const styleString = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 200) : undefined
    const gStyle = rawStyle === undefined ? undefined : {
      mood: styleString(styleRecord.mood),
      lighting: styleString(styleRecord.lighting),
      cameraStyle: styleString(styleRecord.cameraStyle),
    }
    const styleSuffix = gStyle && (gStyle.mood || gStyle.lighting || gStyle.cameraStyle) ? `, ${[gStyle.mood, gStyle.lighting, gStyle.cameraStyle].filter(Boolean).join(', ')}, consistent color grade across all scenes` : ''
    // #442 — base clip count on the selected duration for now; in verbatim mode
    // we re-size it to the actual SCRIPT length below (the video follows the
    // script, not the button), so footage always covers the narration.
    let clipCount = clipCountForDuration(duration)
    // Push #402 — explicit engine choice from the UI. 'kling' = Cinematic AI
    // (50 cr); anything else = AI Generated (Seedance, 20 cr).
    const wantsKling = body.engine === 'kling'
    const wantsVeo = body.engine === 'veo'
    const wantsSora = body.engine === 'sora'
    // KINEO-HOLLYWOOD-2026-07-09 — Hollywood Mode 2.0 (per-scene engine routing).
    const wantsHollywood = body.engine === 'hollywood'

    // KINEO-HOLLYWOOD-2026-07-09 — anti-deepfake gate. Hollywood renders REAL
    // fictional people with native voice, so a prompt naming a real person is
    // blocked outright (cheap check, before any credit/plan work).
    if (wantsHollywood && mentionsRealPerson(prompt)) {
      return NextResponse.json(
        { error: "Hollywood Mode can't depict real people. Describe a fictional person instead." },
        { status: 400 },
      )
    }

    // Upfront paid-entitlement + balance check. Premium AI has no free trial;
    // the authoritative atomic debit happens below, immediately before any
    // paid provider work, and is keyed to this protected generation.
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      // KINEO-REVERSE-TRIAL-P1-2026-08-06 — trial_* lidos para o entitlement
      // do reverse trial (colunas criadas por migração aditiva em 06/08).
      // KINEO-TRIAL-PAYWALL-2026-08-06 — `trial_credits_granted` entra na
      // leitura porque trialUiState() precisa dele para o paywall contextual
      // dizer QUANTOS créditos a pessoa teve. O número mora na LINHA, não na
      // constante: um trial ativado antes de um teto novo recebeu outro valor.
      .select('video_credits, plan, has_paid, trial_status, trial_ends_at, trial_credits_used, trial_credits_granted')
      .eq('id', user.id)
      .single()

    if (profileErr && profileErr.code !== 'PGRST116') {
      console.error('[cinematic] credit fetch failed:', profileErr.message)
    }
    const balance = profile?.video_credits ?? 0

    // KINEO-REBASE-2026-07-10 — UNIVERSAL ENGINE GATES. The old plan ladder
    // (Seedance=Creator+, Kling/Veo/Hollywood=Studio) is retired: ANY paying
    // user with an active plan, or a previous buyer with remaining purchased
    // credits, can use any engine as long as the balance covers the full cost.
    const planVal = (profile?.plan ?? 'free') as string
    const PAID_PLANS = new Set([
      'starter', 'starter_trial', 'basic', 'basic_trial',
      'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial',
    ])
    const isPaidUser = profile?.has_paid === true || PAID_PLANS.has(planVal)
    // KINEO-REVERSE-TRIAL-P1-2026-08-06 — reverse trial ativo = direitos do
    // CREATOR (Seedance liberado abaixo), mas NUNCA os motores Studio: o gate
    // Kling/Veo/Hollywood continua exigindo conta PAGA de verdade — trialActive
    // não o satisfaz de propósito. Expiração passiva: isTrialActive() já nega
    // trial vencido no relógio OU no cap de 40 (ADENDO A1 de 06/08; este
    // comentário dizia 60 e ficou para trás quando o teto baixou — número em
    // comentário envelhece, por isso o valor vivo é TRIAL_CREDIT_CAP). Flag OFF
    // ⇒ trialActive é sempre false e nada aqui muda.
    const trialActive = isTrialActive(profile)
    // KINEO-TRIAL-PAYWALL-2026-08-06 (fase 2, item 3) — a fase do trial vai
    // junto da recusa para o cliente escolher a copy certa. O SERVIDOR não
    // escreve preço: `lib/pricing.priceLabel` é USD fixo e esta rota atende
    // BRL e INR, então um preço nascido aqui seria a moeda errada para uma
    // parte real da base. Quem imprime o número é o cliente, que já resolve a
    // moeda em /api/geo.
    const trialUi = trialUiState(profile)
    // `creditsGranted > 0` NAO e zelo: sem ele, um perfil com
    // trial_status='active' e trial_ends_at NULL/ilegivel cai em 'ending' (o
    // trialClockExpired trata data ilegivel como vencida, de proposito) e a
    // copy contextual diria "o motor de AI era do seu trial" a alguem que nunca
    // teve trial funcional. So fala de PERDA quem comprovadamente RECEBEU.
    const trialEnded =
      (trialUi.phase === 'downgraded' || trialUi.phase === 'ending') && trialUi.creditsGranted > 0

    // Premium engines (Kling/Veo/Hollywood) need any PAID account — the
    // reverse trial never includes the Studio engines.
    if ((wantsKling || wantsVeo || wantsHollywood) && !isPaidUser) {
      return NextResponse.json(
        {
          error: trialActive
            ? 'Kling, Veo and Hollywood are Studio engines — not included in your trial. Upgrade to unlock them.'
            : 'Premium engines (Kling, Veo, Hollywood) are available on every paid plan. Upgrade to use them.',
          // KINEO-TRIAL-PAYWALL-2026-08-06 — DEFEITO CORRIGIDO: este gate é o
          // dos motores Studio e mandava `upsell: 'creator'`, que no cliente
          // abre a headline "Unlock AI-generated videos 🤖" — a resposta errada
          // para quem JÁ tinha AI liberado e pediu Kling/Veo/Hollywood. O
          // cliente já tinha a headline certa ('studio') e ela nunca era
          // alcançada por esta rota. Copy e payload agora dizem a mesma coisa.
          upsell: 'studio',
          reason: trialActive ? 'trial_studio_engine' : 'plan_studio_engine',
          balance,
        },
        { status: 402 },
      )
    }
    // KINEO-SORA-REMOVED-2026-07-06 — Sora is pulled from the menu until its fal
    // endpoint cost is confirmed (margin guard). Reject any direct/stale call.
    if (wantsSora) {
      return NextResponse.json(
        { error: 'Sora is temporarily unavailable. Use Kling or AI Generated.', balance },
        { status: 400 },
      )
    }

    // Push #402 — per-engine cost. KINEO-PRICING-V3B-2026-07-10: Hollywood 150,
    // Kling 50, Veo 90, Sora 100 (blocked), Seedance 20.
    const cost = wantsHollywood ? HOLLYWOOD_CREDIT_COST : wantsKling ? KLING_CREDIT_COST : wantsVeo ? VEO_CREDIT_COST : wantsSora ? SORA_CREDIT_COST : SEEDANCE_CREDIT_COST

    // PUSH #20 — every premium AI engine is paid-only. The acquisition offer is
    // Fast (3 watermarked videos / 24h), never a hidden premium trial.
    // KINEO-REVERSE-TRIAL-P1-2026-08-06 — exceção EXPLÍCITA e flag-gated: o
    // reverse trial (Creator por 3/7 dias, cap 40 no backend) libera o Seedance.
    if (!isPaidUser && !trialActive) {
      return NextResponse.json(
        {
          // KINEO-TRIAL-PAYWALL-2026-08-06 (fase 2, item 3) — PAYWALL
          // CONTEXTUAL. Para quem NUNCA teve trial a frase segue idêntica. Para
          // quem acabou de sair de um, "AI Generated videos are on the paid
          // plans" é informação que ele já tem e não explica por que a tela que
          // funcionava ontem parou: a recusa precisa nomear a PERDA, que é o
          // único motivo pelo qual ele está aqui.
          error: trialEnded
            ? 'The AI engine was part of your trial. Reactivate it to keep making AI videos.'
            : 'AI Generated videos are on the paid plans. Upgrade to use the AI engine.',
          upsell: 'creator',
          reason: trialEnded ? 'trial_ended' : 'plan_ai_engine',
          // Créditos que a pessoa REALMENTE recebeu e gastou no trial — o
          // cliente usa para "you made N videos with your trial credits" em vez
          // de um argumento genérico de plano. Só sai quando houve trial.
          trialCreditsGranted: trialEnded ? trialUi.creditsGranted : undefined,
          trialCreditsUsed: trialEnded ? trialUi.creditsUsedForDisplay : undefined,
          balance,
        },
        { status: 402 },
      )
    }

    // ═══ KINEO-TRIAL-STALL-2026-08-14 (fase 2, item 3) ═══════════════════════
    // ESTE ERA O ÚNICO DOS QUATRO 402 DESTA ROTA SEM TRATAMENTO CONTEXTUAL E
    // SEM UMA LINHA DE TELEMETRIA — e é o que pega a coorte MAIS ENGAJADA.
    //
    // O QUE A MEDIÇÃO DE HOJE DIZ (produção, coorte fechada de 45 trials
    // resolvidos, não estimativa): 12 pessoas queimaram os 40 créditos até o
    // fim e ZERO comprou. Elas não desistiram do produto — elas chegaram ao
    // fundo dele. E o que a tela dizia para as 12, na hora exata em que
    // pediram mais um vídeo, era `This needs 20 credits. You have 0.`: um
    // extrato bancário, sem uma oferta, sem um preço, sem um link.
    //
    // Os três 402 ACIMA deste (motores Studio, plano sem IA, trial vencido)
    // receberam `reason`, `upsell` e copy que nomeia a perda em
    // KINEO-TRIAL-PAYWALL-2026-08-06. Este ficou de fora, e o cliente, sem
    // `reason`, cai no default `'credits'`, cuja headline é
    // "You're out of credits 🎉" — literalmente falsa para quem tem 18.
    //
    // ⚠️ POR QUE `trialActive && !isPaidUser` E NÃO SÓ `trialActive`: um
    // assinante NUNCA pode ler "add a plan". `isTrialActive()` deve ser false
    // para quem converteu, mas a copy de venda não é lugar para depender de
    // uma segunda função estar certa — a guarda é local e barata.
    //
    // ⚠️ `creditsGranted > 0` PELO MESMO MOTIVO DO GATE ACIMA: só fala de
    // PERDA quem comprovadamente RECEBEU. Perfil com trial ativo e concessão
    // ilegível cai na frase genérica, que continua verdadeira.
    //
    // NENHUM PREÇO NESTA STRING, de propósito: o preço vive nas linhas de
    // plano do modal, derivadas de lib/checkoutPricing por moeda e região.
    // Escrever dólar aqui seria a segunda fonte de preço que a ordem do
    // fundador proíbe.
    if (balance < cost) {
      const trialBuyer = trialActive && !isPaidUser && trialUi.creditsGranted > 0
      // DOIS estados, e a diferença NÃO é cosmética — eles pedem frases
      // opostas: quem tem 18 créditos não está "sem créditos", está com um
      // saldo que não compra nada do que veio comprar (o ENCALHE); quem tem 0
      // gastou o trial inteiro e é o sinal de intenção mais forte do funil.
      //
      // ⚠️ ONDE CADA UM REALMENTE ACONTECE (2ª passada — a 1ª versão deste
      // comentário vendia o `spent` como o caso principal desta rota, e é o
      // contrário): `isTrialActive()` já devolve false quando `trialCapReached`
      // (usado >= 40), então quem queimou o trial inteiro NÃO chega aqui com
      // `trialActive` true — ele cai no gate de plano logo acima, como
      // `trial_ended`, e na prática nem isso, porque o cliente barra o clique
      // antes (corrigido no MESMO commit, em openOutOfCreditsModal).
      // Nesta rota o caso VIVO é o `stalled`: saldo parcial, trial ainda de pé.
      // O `spent` fica como caminho de defesa para o resíduo real de saldo 0
      // com `usado < 40` (estorno de render falho devolve crédito e abate o
      // consumo — a coorte de 13/08 tem linhas assim).
      // ═══ KINEO-TRIAL-STALL-FALSO-2026-08-15 ═══════════════════════════════
      // ANTES de chamar qualquer coisa de "fim de trial", perguntar se o
      // buraco é explicado por um render que ainda não se resolveu. Só entra
      // quando o crédito preso REALMENTE fecha a conta (`balance + held >=
      // cost`): se mesmo com ele de volta não daria, a pessoa está sem saldo
      // de verdade e merece a frase antiga, não uma desculpa.
      //
      // Vale para TODO MUNDO, não só trial (`insufficient_credits` também
      // mentia — "This needs 20 credits. You have 19." é um extrato, não uma
      // explicação), mas a mentira cara era a do trial, que vinha com pedido
      // de dinheiro em cima.
      const heldByUnsettled = await creditsHeldByUnsettledRender(user.id)
      const heldExplainsGap = heldByUnsettled > 0 && balance + heldByUnsettled >= cost

      const stallReason = heldExplainsGap
        ? 'credits_held_by_render'
        : trialBuyer
          ? (balance > 0 ? 'trial_credits_stalled' : 'trial_credits_spent')
          : 'insufficient_credits'
      await logCinematicRefusal(stallReason, user.id, {
        needed: cost,
        balance,
        held_by_unsettled_render: heldByUnsettled,
        engine: wantsHollywood ? 'hollywood' : wantsKling ? 'kling' : wantsVeo ? 'veo' : 'seedance',
        trial_phase: trialUi.phase,
        trial_credits_granted: trialUi.creditsGranted,
        is_paid: isPaidUser,
      })
      return NextResponse.json(
        {
          error:
            stallReason === 'credits_held_by_render'
              // NENHUMA PROMESSA DE PRAZO EXATO e NENHUM PREÇO. "within the
              // hour" é o que a varredura horária garante; dizer "5 minutos"
              // seria inventar. E a última frase é a que importa: a pessoa
              // precisa saber que o trial NÃO acabou.
              ? `A video you already started is still holding ${heldByUnsettled} credit${heldByUnsettled === 1 ? '' : 's'}. If it doesn't finish, they come back automatically within the hour — your trial is still running.`
              : stallReason === 'trial_credits_stalled'
                ? `Your trial has ${balance} credit${balance === 1 ? '' : 's'} left and an AI video needs ${cost}. Add a plan to keep the AI engine.`
                : stallReason === 'trial_credits_spent'
                  ? `You've used all ${trialUi.creditsGranted} credits from your trial. Add a plan to keep making AI videos.`
                  : `This needs ${cost} credits. You have ${balance}.`,
          needed: cost,
          balance,
          held: heldExplainsGap ? heldByUnsettled : undefined,
          reason: stallReason,
          // `upsell` só viaja para quem realmente precisa comprar um PLANO. Um
          // assinante sem saldo precisa de créditos, não de outro plano, e
          // mandar `upsell` abriria a headline errada para ele.
          // `heldExplainsGap` DERRUBA o upsell mesmo para quem é trialBuyer:
          // este 402 não é um momento de venda, é um aviso de estado. Sem
          // `upsell` o cliente não abre a caixa de planos (ver GenerateClient,
          // mesmo marcador) — que é o ponto inteiro desta correção.
          upsell: trialBuyer && !heldExplainsGap ? 'creator' : undefined,
          trialCreditsGranted: trialBuyer && !heldExplainsGap ? trialUi.creditsGranted : undefined,
          trialCreditsUsed: trialBuyer && !heldExplainsGap ? trialUi.creditsUsedForDisplay : undefined,
        },
        { status: 402 }
      )
    }

    const claimQuality = wantsHollywood
      ? 'cinematic_hollywood'
      : wantsKling
        ? 'cinematic_kling'
        : wantsVeo
          ? 'cinematic_veo'
          : 'cinematic_ai'
    const claimEngine = wantsHollywood
      ? 'hollywood'
      : wantsKling
        ? 'kling'
        : wantsVeo
          ? 'veo'
          : 'seedance'
    const claimFingerprint = cinematicRequestFingerprint({
      prompt,
      duration,
      engine: claimEngine,
      language: body.language === 'pt' ? 'pt' : body.language === 'es' ? 'es' : 'en',
      vertical: typeof body.vertical === 'string' ? body.vertical.trim().toLowerCase() : '',
      characterId: typeof body.characterId === 'string' ? body.characterId.trim() : '',
      brollScenes: planScenes,
      globalStyle: gStyle ?? null,
    })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'AI generation safety is temporarily unavailable. Nothing was submitted.' },
        { status: 503 },
      )
    }
    const cinematicAdmin: SupabaseClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const cacheKey = `${user.id}:${generationId}`
    const now = Date.now()
    for (const [key, entry] of cinematicSubmissionCache) {
      if (entry.expiresAt <= now) cinematicSubmissionCache.delete(key)
    }

    // A fully failed provider attempt is refunded, but repeated deliberately
    // failing prompts must not turn paid Fal work (especially Hollywood
    // anchors) into an unlimited free endpoint. Two signed/refunded failures
    // inside 15 minutes trigger a short cooling-off window. Query failure is
    // fail-open so an analytics outage never blocks legitimate generation.
    const cooldownCutoff = new Date(now - 15 * 60 * 1000).toISOString()
    const { data: recentClaims, error: cooldownError } = await cinematicAdmin
      .from('events')
      .select('metadata,created_at')
      .eq('name', 'cinematic_submission_claim')
      .eq('user_id', user.id)
      .gte('created_at', cooldownCutoff)
      .order('created_at', { ascending: false })
      .limit(10)
    if (cooldownError) {
      console.warn('[cinematic] refunded-attempt cooldown lookup failed:', cooldownError.message)
    } else {
      const recentRefundedFailures = (recentClaims ?? []).filter((row) => {
        const metadata = row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? row.metadata as Record<string, unknown>
          : {}
        return metadata.status === 'released' &&
          typeof metadata.authority === 'string' && /^[a-f0-9]{64}$/i.test(metadata.authority) &&
          typeof metadata.resolution_reason === 'string' &&
          /^provider_.*_refunded$/.test(metadata.resolution_reason)
      }).length
      if (recentRefundedFailures >= 2) {
        return NextResponse.json(
          {
            error: 'Two AI attempts were just refunded. Please wait a few minutes before starting another one.',
            retry_after_ms: 15 * 60 * 1000,
          },
          { status: 429 },
        )
      }
    }

    const billingReference = `cinematic-${cinematicClaimId(user.id, generationId)}`
    // KINEO-TRIAL-DOUBLECOUNT-2026-08-07 — de onde veio o replay do débito.
    // O débito adiantado (`upfrontDebit`) e a "confirmação idempotente" dentro
    // de settleDebitAndRespond() são o MESMO `billingReference`. Quando os dois
    // acontecem na MESMA request (caminho feliz: debita → submete → publica →
    // settle), o RPC roda duas vezes: a segunda colide na PK de credit_debits,
    // devolve o saldo e não tira nada. Isso é correto para o dinheiro, mas era
    // contado duas vezes no teto do trial (20 + 20 = 40 em 0,5s — foi assim que
    // o 1º trial real morreu com metade dos créditos). A trava definitiva é o
    // ledger por render em lib/reverseTrial.ts; aqui só se elimina a chamada
    // redundante: se ESTA request já confirmou o débito, reusa o resultado.
    // As outras duas entradas de settleDebitAndRespond (claim já existente /
    // resposta em cache) continuam confirmando de verdade — lá o débito NÃO
    // rodou nesta request e a confirmação é a única prova que temos.
    let debitConfirmedThisRequest: { ok: true; balance: number; insufficient: false; error: '' } | null = null
    const ensureCinematicDebit = async (creditCost: number): Promise<{
      ok: boolean
      balance: number
      insufficient: boolean
      error: string
    }> => {
      const { data, error } = await debitVideoCredits(supabase, {
        userId: user.id,
        renderId: billingReference,
        cost: creditCost,
      })
      if (error || typeof data !== 'number') {
        const message = error?.message ?? 'no balance returned'
        return {
          ok: false,
          balance: typeof data === 'number' ? data : 0,
          insufficient: /balance|credit|insufficient/i.test(message),
          error: message,
        }
      }
      return { ok: true, balance: data, insufficient: false, error: '' }
    }

    const confirmCinematicRefund = async (): Promise<boolean> => {
      const refunded = await refundRenderCredits(billingReference)
      if (refunded > 0) return true
      const { data, error } = await cinematicAdmin
        .from('credit_debits')
        .select('refunded_at')
        .eq('render_id', billingReference)
        .maybeSingle()
      if (error) {
        console.error('[cinematic] refund confirmation failed:', error.message)
        return false
      }
      return typeof data?.refunded_at === 'string' && data.refunded_at.length > 0
    }

    const settleDebitAndRespond = async (
      claim: CinematicClaim,
      response: Record<string, unknown>,
    ): Promise<NextResponse> => {
      if (claim.status === 'released') {
        return NextResponse.json(
          { error: 'This AI generation was safely closed. Please start a new one.' },
          { status: 409 },
        )
      }
      if (claim.status === 'settled') return NextResponse.json(response)
      if (claim.status !== 'done') {
        return NextResponse.json(
          { error: 'This AI generation is still being submitted.', pending: true, retry_after_ms: 2500 },
          { status: 409 },
        )
      }

      // The job was atomically debited before provider submission. Re-running
      // the same deterministic ledger key here is an idempotent recovery check
      // before exposing request IDs or allowing authenticated polling.
      // KINEO-TRIAL-DOUBLECOUNT-2026-08-07 — pulada quando esta mesma request já
      // efetuou o débito adiantado (ver o bloco em `ensureCinematicDebit`).
      const debit = debitConfirmedThisRequest ?? await ensureCinematicDebit(claim.creditCost)
      if (!debit.ok) {
        console.error('[cinematic] deterministic debit confirmation failed:', debit.error)
        return NextResponse.json(
          {
            error: debit.insufficient
              ? `Your AI scenes were reserved, but ${claim.creditCost} credits could not be confirmed. Add credits and retry this same generation.`
              : 'Your AI scenes are safe while we confirm the credit charge. Reconnecting automatically.',
            ...(debit.insufficient
              ? { balance: debit.balance, resume_same_generation: true, generationId }
              : { pending: true, retry_after_ms: 3000 }),
          },
          { status: debit.insufficient ? 402 : 503 },
        )
      }
      const settled = await settleCinematicClaim({
        db: cinematicAdmin,
        secret: serviceRoleKey,
        userId: user.id,
        generationId,
        reason: 'provider_submitted_and_debited',
        renderId: billingReference,
      })
      if (!settled.ok) {
        console.error('[cinematic] debit settled but claim publication failed:', settled.error)
        return NextResponse.json(
          { error: 'Your AI scenes are safe while we finalize the submission.', pending: true, retry_after_ms: 2500 },
          { status: 503 },
        )
      }
      activeBirthClaim = null
      cinematicSubmissionCache.delete(cacheKey)
      return NextResponse.json({ ...response, credits_charged: claim.creditCost, balance: debit.balance })
    }

    const acquired = await acquireCinematicClaim({
      db: cinematicAdmin,
      secret: serviceRoleKey,
      userId: user.id,
      generationId,
      fingerprint: claimFingerprint,
      creditCost: cost,
      quality: claimQuality,
      engine: claimEngine,
    })
    if (acquired.kind === 'conflict') {
      return NextResponse.json({ error: acquired.error }, { status: 409 })
    }
    if (acquired.kind === 'error') {
      console.error('[cinematic] birth claim unavailable:', acquired.error)
      return NextResponse.json(
        { error: 'AI generation safety is temporarily unavailable. Nothing was submitted.' },
        { status: 503 },
      )
    }
    if (acquired.kind === 'released') {
      return NextResponse.json(
        { error: 'This AI generation was safely closed. Please start a new one.' },
        { status: 409 },
      )
    }
    if (acquired.kind === 'replay') {
      return settleDebitAndRespond(acquired.claim, acquired.response)
    }
    if (acquired.kind === 'pending') {
      const cached = cinematicSubmissionCache.get(cacheKey)
      if (
        cached && cached.expiresAt > Date.now() &&
        cached.fingerprint === claimFingerprint && cached.creditCost === cost &&
        cached.quality === claimQuality && cached.engine === claimEngine
      ) {
        const completed = await completeCinematicClaim({
          db: cinematicAdmin,
          secret: serviceRoleKey,
          userId: user.id,
          generationId,
          fingerprint: claimFingerprint,
          creditCost: cost,
          quality: claimQuality,
          engine: claimEngine,
          response: cached.response,
          falRequestIds: cached.requestIds,
          falModels: cached.models,
        })
        if (completed.ok) return settleDebitAndRespond(completed.claim, cached.response)
      }
      const pendingStartedAt = Date.parse(acquired.claim.startedAt)
      if (
        Number.isFinite(pendingStartedAt) &&
        Date.now() - pendingStartedAt > ACTIVE_COMPOSE_CREDIT_HOLD_TTL_MS
      ) {
        const { data: staleDebit, error: staleDebitError } = await cinematicAdmin
          .from('credit_debits')
          .select('user_id,amount,refunded_at')
          .eq('render_id', billingReference)
          .maybeSingle()
        if (staleDebitError) {
          console.error('[cinematic] stale pending debit lookup failed:', staleDebitError.message)
          return NextResponse.json(
            { error: 'Your previous AI submission is being reconciled. Please retry shortly.', pending: true, retry_after_ms: 5000 },
            { status: 503 },
          )
        }
        const staleAmount = typeof staleDebit?.amount === 'number'
          ? staleDebit.amount
          : Number(staleDebit?.amount)
        if (
          staleDebit &&
          (staleDebit.user_id !== user.id || !Number.isFinite(staleAmount) || staleAmount !== cost)
        ) {
          console.error('[cinematic] stale pending debit does not match signed claim')
          return NextResponse.json(
            { error: 'Your previous AI submission needs billing review. No new job was submitted.' },
            { status: 503 },
          )
        }
        const alreadyRefunded = typeof staleDebit?.refunded_at === 'string' && Boolean(staleDebit.refunded_at)
        if (staleDebit && !alreadyRefunded && !(await confirmCinematicRefund())) {
          return NextResponse.json(
            { error: 'Your previous AI submission refund is still being confirmed. Please retry shortly.', pending: true, retry_after_ms: 5000 },
            { status: 503 },
          )
        }
        const released = await releaseCinematicClaim({
          db: cinematicAdmin,
          secret: serviceRoleKey,
          userId: user.id,
          generationId,
          reason: staleDebit ? 'stale_pending_refunded' : 'stale_pending_no_debit',
          ...(staleDebit ? { reference: billingReference } : {}),
        })
        if (!released.ok) {
          console.error('[cinematic] stale pending claim release failed:', released.error)
          return NextResponse.json(
            { error: 'Your previous AI submission is being closed safely. Please retry shortly.', pending: true, retry_after_ms: 5000 },
            { status: 503 },
          )
        }
        return NextResponse.json(
          {
            error: staleDebit
              ? `Your previous AI submission expired and ${cost} credits were refunded automatically. Please start a new generation.`
              : 'Your previous AI submission expired before charging. Please start a new generation.',
            creditsRefunded: staleDebit ? cost : 0,
            start_new_generation: true,
          },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: 'This AI generation is already being submitted.', pending: true, retry_after_ms: 2500 },
        { status: 409 },
      )
    }

    activeBirthClaim = {
      db: cinematicAdmin,
      secret: serviceRoleKey,
      userId: user.id,
      generationId,
      billingReference,
      debitConfirmed: false,
    }
    const releaseBirthClaim = async (reason: string): Promise<boolean> => {
      if (!activeBirthClaim) return true
      const current = activeBirthClaim
      let releaseReason = reason
      let reference: string | undefined
      if (current.debitConfirmed) {
        const refundConfirmed = await confirmCinematicRefund()
        if (!refundConfirmed) {
          console.error('[cinematic] refusing to release claim before refund is confirmed:', reason)
          return false
        }
        releaseReason = `${reason}_refunded`
        reference = current.billingReference
      }
      const released = await releaseCinematicClaim({
        db: current.db,
        secret: current.secret,
        userId: current.userId,
        generationId: current.generationId,
        reason: releaseReason,
        reference,
      })
      if (!released.ok) {
        console.error('[cinematic] birth claim release failed:', released.error)
        return false
      }
      activeBirthClaim = null
      return true
    }
    releaseActiveBirthClaim = releaseBirthClaim

    // Every concurrent generation inserts first and then audits all signed
    // holds. The last request necessarily sees the earlier reservations.
    const holds = await inspectActiveComposeCreditHolds({
      db: cinematicAdmin,
      secret: serviceRoleKey,
      userId: user.id,
      currentClaimId: acquired.claim.id,
    })
    if (!holds.ok || !holds.currentSeen) {
      console.error('[cinematic] credit hold audit failed:', holds.ok ? 'current claim missing' : holds.error)
      await releaseBirthClaim('hold_audit_failed')
      return NextResponse.json(
        { error: 'Your credit reservation could not be verified. Nothing was submitted.' },
        { status: 503 },
      )
    }
    const { data: currentProfile, error: currentProfileError } = await cinematicAdmin
      .from('profiles')
      // KINEO-TRIAL-BLOCKERS-2026-08-07 — colunas de trial: a RELEITURA de
      // admissão (logo abaixo) tem o seu PRÓPRIO predicado de "conta paga", e
      // ele não conhecia o trial. O gate trial-aware de cima (:685) deixava a
      // conta passar e esta releitura a matava com 402 poucas linhas antes do
      // débito — dois veredictos opostos sobre a mesma conta, na mesma request.
      .select(`video_credits, plan, has_paid, ${TRIAL_ENTITLEMENT_COLUMNS}`)
      .eq('id', user.id)
      .single()
    if (currentProfileError || typeof currentProfile?.video_credits !== 'number') {
      await releaseBirthClaim('balance_lookup_failed')
      return NextResponse.json(
        { error: 'Your credit balance could not be verified. Nothing was submitted.' },
        { status: 503 },
      )
    }
    const currentPlan = String(currentProfile.plan ?? 'free').toLowerCase()
    // KINEO-TRIAL-BLOCKERS-2026-08-07 — mesmo termo do gate de entrada
    // (`trialActive`, :685), agora relido do estado FRESCO: se o trial expirou
    // entre a admissão e aqui (relógio venceu ou o teto de 40 foi atingido por
    // um débito concorrente), isTrialActive() volta false e este 402 é o
    // correto. Os motores Studio continuam FORA — quem chega aqui já passou
    // pelo gate Kling/Veo/Hollywood, que exige `isPaidUser` de verdade.
    // Flag OFF ⇒ termo false ⇒ predicado idêntico ao anterior.
    const currentPaid =
      currentProfile.has_paid === true ||
      PAID_PLANS.has(currentPlan) ||
      isTrialActive(currentProfile)
    const currentBalance = Math.max(0, currentProfile.video_credits)
    const heldByOtherJobs = Math.max(0, holds.totalHeld - cost)
    if (!currentPaid || holds.totalHeld > currentBalance) {
      await releaseBirthClaim('insufficient_available_credits')
      return NextResponse.json(
        {
          error: !currentPaid
            ? 'AI Generated videos require a paid plan.'
            : `This generation needs ${cost} credits. ${heldByOtherJobs > 0 ? 'Other active renders already reserve part of your balance. ' : ''}You have ${Math.max(0, currentBalance - heldByOtherJobs)} available.`,
          needed: cost,
          balance: Math.max(0, currentBalance - heldByOtherJobs),
        },
        { status: 402 },
      )
    }

    // KINEO-CAPACITY-2026-08-08 — DISJUNTOR GLOBAL, o último portão antes do
    // dinheiro sair. Fica DEPOIS da checagem de saldo e ANTES do débito de
    // propósito: quem bate no teto não é cobrado, não perde crédito e não
    // precisa de estorno — o caminho mais barato de todos. `releaseBirthClaim`
    // devolve o claim para a próxima tentativa não colidir consigo mesma.
    // Fail-open por dentro: só nega quando a contagem foi lida COM SUCESSO e
    // estourou. Ver a conta que justifica o número em lib/aiRenderCircuitBreaker.
    const aiCap = await checkAiRenderDailyCap(cinematicAdmin)
    if (!aiCap.allowed) {
      await releaseBirthClaim('global_daily_ai_cap')
      return NextResponse.json(
        { error: AI_RENDER_CAP_MESSAGE, code: 'global_daily_ai_cap' },
        { status: 503 },
      )
    }

    // Close the gap between an in-memory/events hold and every other debit
    // route. The database RPC atomically spends this generation's credits
    // before OpenAI/Fal work begins; concurrent spenders cannot double-use the
    // same balance. The deterministic key makes retries safe.
    const upfrontDebit = await ensureCinematicDebit(cost)
    if (!upfrontDebit.ok) {
      console.error('[cinematic] upfront debit failed:', upfrontDebit.error)
      await releaseBirthClaim('upfront_debit_rejected')
      return NextResponse.json(
        {
          error: upfrontDebit.insufficient
            ? `This generation needs ${cost} credits. Your available balance changed before it could start.`
            : 'Your credit charge could not be confirmed. Nothing was submitted.',
          needed: cost,
          balance: upfrontDebit.balance,
        },
        { status: upfrontDebit.insufficient ? 402 : 503 },
      )
    }
    if (activeBirthClaim) activeBirthClaim.debitConfirmed = true
    // KINEO-TRIAL-DOUBLECOUNT-2026-08-07 — o débito desta request está feito e
    // confirmado; settleDebitAndRespond() não precisa repetir o mesmo RPC.
    debitConfirmedThisRequest = { ok: true, balance: upfrontDebit.balance, insufficient: false, error: '' }

    const publishCinematicResponse = async (
      response: Record<string, unknown>,
      requestIds: CinematicRequestId[],
      models: string[],
    ): Promise<NextResponse> => {
      cinematicSubmissionCache.set(cacheKey, {
        fingerprint: claimFingerprint,
        creditCost: cost,
        quality: claimQuality,
        engine: claimEngine,
        response,
        requestIds,
        models,
        expiresAt: Date.now() + 10 * 60 * 1000,
      })
      const completed = await completeCinematicClaim({
        db: cinematicAdmin,
        secret: serviceRoleKey,
        userId: user.id,
        generationId,
        fingerprint: claimFingerprint,
        creditCost: cost,
        quality: claimQuality,
        engine: claimEngine,
        response,
        falRequestIds: requestIds,
        falModels: models,
      })
      if (!completed.ok) {
        console.error('[cinematic] accepted provider claim publication failed:', completed.error)
        return NextResponse.json(
          { error: 'Your AI scenes are safe while we finalize the submission.', pending: true, retry_after_ms: 2500 },
          { status: 503 },
        )
      }
      return settleDebitAndRespond(completed.claim, response)
    }

    // Parse script for verbatim mode
    const parsedScript = parseUserScript(prompt)
    const verbatim = parsedScript.hasMarkers && parsedScript.segments.length > 0

    // #442 — in verbatim mode the final video follows the SCRIPT length, not the
    // selected duration button (the script is narrated in full). The clip count
    // was still derived from the button, so a long script + a short button
    // (e.g. 45) under-provisioned clips and compose REPEATED one to fill the gap
    // (the ~2s repeated shot). Re-size the clip count to the actual narration:
    // each Seedance clip is 10s, so we need ceil(narration_seconds / 10) clips
    // for footage to cover the whole video. Estimate is biased to slightly MORE
    // clips (lower words/sec) since extra footage is just trimmed — never repeated.
    // Stays within the tested 2..6 range; never drops below the button's count.
    if (verbatim) {
      const SECONDS_PER_CLIP = (wantsVeo || wantsSora) ? 8 : 10 // Veo/Sora 8s, Seedance/Kling 10s
      const WORDS_PER_SECOND = 2.5 // ~ElevenLabs at speed 1.05 (conservative)
      const words = parsedScript.narration.split(/\s+/).filter(Boolean).length
      const estSeconds = words / WORDS_PER_SECOND
      const needed = Math.ceil(estSeconds / SECONDS_PER_CLIP)
      const sized = Math.max(clipCount, Math.min(9, needed))
      if (sized !== clipCount) {
        console.log(`[cinematic] #442 verbatim clip count ${clipCount} -> ${sized} (script ~${Math.round(estSeconds)}s, ${words} words)`)
        clipCount = sized
      }
    }

    // Build scenes
    // #441 — aiPrompt = the cinematic SHOT description fed to Seedance (prefer
    // it over the raw stock query). Set from generateScenes prose (non-verbatim)
    // or generated from the narration below (verbatim).
    let scenes: { description: string; voiceover: string; caption: string; stockSearchQuery?: string; aiPrompt?: string }[]

    if (verbatim) {
      // #369 — pick `clipCount` beats EVENLY across all segments, ALWAYS
      // including the first (hook) and last (payoff) so the opening and the
      // payoff each get their OWN distinct clip. The old slice(0, 5) dropped the
      // RHYTHM + PAYOFF beats, so the payoff narrated over an escalation clip.
      const segs = parsedScript.segments
      const picked =
        segs.length <= clipCount
          ? segs
          : Array.from({ length: clipCount }, (_, i) =>
              segs[Math.round((i * (segs.length - 1)) / (clipCount - 1))],
            )
      scenes = picked.map((seg) => ({
        description: seg.pexelsQuery,
        voiceover: seg.voiceover,
        caption: shortCaptionFromVoiceover(seg.voiceover || seg.pexelsQuery),
        stockSearchQuery: seg.pexelsQuery,
      }))
    } else {
      const generated = await generateScenes(prompt.slice(0, 1200), clipCount)
      scenes = generated.map((s) => ({
        description: s.description,
        voiceover: s.voiceover ?? '',
        caption: s.caption ?? shortCaptionFromVoiceover(s.description),
        stockSearchQuery: s.stockSearchQuery,
        // generateScenes already returns cinematic prose — feed THAT to the AI
        // engine instead of the keyword query.
        aiPrompt: s.description,
      }))
    }

    // L2B - prefer the smart BrollPlan per-scene cinematic prompt when provided
    if (planScenes.length > 0) {
      scenes = scenes.map((s, i) => { const bp = planScenes[i]?.brollPrompt; return bp && bp.trim().length > 20 ? { ...s, aiPrompt: bp.trim() } : s })
    }

    // #441 — verbatim path has no cinematic description (description === stock
    // query). Generate a real faceless shot description per scene from the
    // narration so Seedance gets a shot to direct, not keyword soup. Best-effort:
    // on failure each scene falls back to its stock query in submitAllScenes.
    // KINEO-HOLLYWOOD-2026-07-09 — skipped for hollywood: planHollywoodScenes
    // writes its own per-scene prompts (people allowed), so the faceless
    // description pass would be wasted work.
    if (verbatim && planScenes.length === 0 && !wantsHollywood) {
      try {
        const aiPrompts = await generateCinematicDescriptions(scenes, prompt)
        scenes = scenes.map((s, i) => ({
          ...s,
          aiPrompt: aiPrompts[i] && aiPrompts[i].length > 3 ? aiPrompts[i] : s.aiPrompt,
        }))
        const got = scenes.filter((s) => s.aiPrompt).length
        console.log(`[cinematic] #441 cinematic descriptions: ${got}/${scenes.length} scenes`)
      } catch (e) {
        console.warn('[cinematic] #441 description generation skipped:', e instanceof Error ? e.message : String(e))
      }
    }

    // #370 — Submit strategy is per-engine (see submitAllScenes below):
    // Seedance/Veo submit with BOUNDED CONCURRENCY (pool of 3) since they have
    // no shared-alias throttle; Kling stays SERIAL with a 450ms stagger because
    // its alias throttles per user (firing 5-6 kling submits at once tripped a
    // burst/rate limit that 4xx'd exactly one clip — the old "submitted 4/5"
    // repeated-clip bug). KINEO-RETRY-2026-07-24 — EVERY scene now gets ONE real
    // retry (submitScene): an EXPLICIT non-ambiguous reject is re-POSTed once
    // after an ~800ms backoff before the scene is dropped to null. Ambiguous
    // rejects are NEVER retried (the job may already exist) — the scene stays
    // null and its claim stays pending, preserving the no-double-charge contract.
    // Push #402 — engine is the user's explicit choice (Kling already gated to
    // Studio above). If Kling fails entirely, fall back to Seedance AND drop the
    // charge to the Seedance price so the user is never billed 50 cr for a
    // Seedance video. Single model per generation keeps the status poll simple.
    const usedModel = wantsKling ? KLING_MODEL : wantsVeo ? VEO_MODEL : wantsSora ? SORA_MODEL : SEEDANCE_MODEL

    // KINEO-SEEDANCE-720-ALL-2026-07-06 — Seedance runs 720p on EVERY plan
    // (~$0.26/clip). 1080p (~$0.62/clip) blew the Studio margin (10 videos =
    // $43.40 cost > $37.90) so it's retired for Seedance — 1080p now lives only
    // in Kling, the premium engine. hd stays false; Kling sets its own params.
    const hd = false

    // KINEO-SEED-2026-07-24 — ONE deterministic seed for this whole generation,
    // shared by every classic scene (Seedance/Kling/Veo) so the clips are drawn
    // from the same latent neighborhood and look connected instead of like
    // unrelated shots. Derived from billingReference (stable per user+generation)
    // so retrying the SAME generationId reuses the SAME seed — no re-dicing.
    const generationSeed = deterministicSeed(billingReference)

    // KINEO-ERA-LOCK-2026-07-09 — era detected ONCE from the full narration +
    // topic, then appended to EVERY scene prompt below (code-enforced; survives
    // any GPT slip in the per-scene visual prompts).
    const eraSuffix = eraLockSuffix(
      `${prompt} ${scenes.map((s) => `${s.voiceover ?? ''} ${s.aiPrompt ?? ''} ${s.description ?? ''}`).join(' ')}`,
    )
    if (eraSuffix) console.log('[cinematic] era-lock active for this render')

    // ── KINEO-HOLLYWOOD-2026-07-09 — HOLLYWOOD MODE 2.0 ─────────────────────
    // Dedicated path: GPT plans dialogue/cinematic/support scenes with ONE
    // fictional character + ONE environment + ONE styleSheet (KINEO-HOLLYWOOD-22),
    // each scene is submitted to ITS engine (Kling3 dialogue+support / Veo3.1
    // cinematic — Seedance out since 22) with NATIVE AUDIO ON, and the
    // response carries the per-scene metadata compose needs (engines,
    // narrations, seconds). buildFacelessCinematicPrompt / PERSON_NOUN_RE are
    // intentionally NOT applied — fictional people are the point here. The
    // era-lock suffix IS kept (period accuracy still matters).
    if (wantsHollywood) {
      const hollywoodVoiceover = verbatim && parsedScript.narration
        ? parsedScript.narration
        : scenes.map((s) => s.voiceover).filter(Boolean).join(' ')

      // KINEO-HOLLYWOOD-HOST-2026-07-13 — language/vertical hoisted (the host
      // voice resolution below needs both; the same `vertical` reaches
      // /api/compose from the client, so both routes pin the same persona).
      const hollywoodLanguage: 'en' | 'pt' | 'es' =
        body.language === 'pt' ? 'pt' : body.language === 'es' ? 'es' : 'en'
      const hollywoodVertical =
        typeof body.vertical === 'string' && body.vertical.trim() ? body.vertical.trim().toLowerCase() : undefined

      // ── KINEO-SALVAGE-2026-08-17 — RETOMADA DE RENDER ────────────────────
      // Madrugada de 17/08: um render morreu com 4/6 cenas PRONTAS e pagas no
      // fal (~$8) e o Retry recomeçava do zero — replanejava, re-pagava e
      // re-esperava as 4 cenas que JÁ EXISTIAM. Agora todo submit Hollywood
      // grava plano+ids em hollywood_resume (chave: user+fingerprint do
      // pedido); um novo pedido IGUAL dentro de 2h reaproveita as cenas
      // completas/na fila e re-submete só as falhadas — planner e âncoras
      // nem rodam. Fail-open total: qualquer erro aqui cai no caminho normal.
      const salvageDb = (() => {
        try {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL
          const key = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (!url || !key) return null
          return createAdminClient(url, key, { auth: { persistSession: false } })
        } catch { return null }
      })()
      const salvageFp = createHash('md5')
        .update(`${user.id}|hollywood|${Math.round(duration || 60)}|${prompt.trim().toLowerCase()}`)
        .digest('hex')
      if (salvageDb) {
        try {
          const { data: sv } = await salvageDb
            .from('hollywood_resume')
            .select('response, request_ids, models, created_at')
            .eq('user_id', user.id)
            .eq('fingerprint', salvageFp)
            .maybeSingle()
          if (sv && Date.now() - new Date(sv.created_at as string).getTime() < 2 * 60 * 60 * 1000) {
            // KINEO-SALVAGE-SCOPE-2026-08-17 — flagrado pelo fundador no 1o
            // uso real: ele RE-GEROU um pedido identico apos um render
            // COMPLETO e a retomada devolveu as cenas velhas (86% em 1min,
            // "ja tinha renderizado as cenas?"). Retomada existe SO pra
            // falha: se ja existe video COMPLETO deste user com este mesmo
            // prompt desde o snapshot, o pedido novo e um refazer — snapshot
            // e descartado e o caminho normal (plano fresco) assume.
            const { data: doneVid } = await salvageDb
              .from('videos')
              .select('id')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .gte('created_at', sv.created_at as string)
              .ilike('topic', `${prompt.trim().slice(0, 60).replace(/[%_]/g, '')}%`)
              .limit(1)
              .maybeSingle()
            if (doneVid) {
              console.log('[cinematic] SALVAGE descartado: render anterior deste pedido ja COMPLETOU — refazer = plano fresco')
              await salvageDb.from('hollywood_resume').delete().eq('user_id', user.id).eq('fingerprint', salvageFp)
              throw new Error('__salvage_skip__')
            }
            const storedResp = sv.response as Record<string, unknown>
            const storedIds = (sv.request_ids as (string | null)[]) ?? []
            const storedModels = (sv.models as string[]) ?? []
            const sPrompts = (storedResp.scene_prompts as string[]) ?? []
            const sAnchors = (storedResp.scene_anchor_urls as (string | null)[]) ?? []
            const sSeconds = (storedResp.scene_seconds as number[]) ?? []
            if (storedIds.length > 0 && storedIds.length === storedModels.length) {
              const falKey = process.env.FAL_KEY
              if (falKey) fal.config({ credentials: falKey })
              const freshIds: (string | null)[] = []
              let reused = 0
              let resubmitted = 0
              for (let i = 0; i < storedIds.length; i++) {
                let keep: string | null = null
                const rid = storedIds[i]
                if (rid && falKey) {
                  try {
                    const st = (await fal.queue.status(storedModels[i], { requestId: rid })) as { status?: string }
                    if (st.status === 'COMPLETED' || st.status === 'IN_PROGRESS' || st.status === 'IN_QUEUE') {
                      keep = rid
                      reused++
                    }
                  } catch { /* status irrecuperável → re-submete abaixo */ }
                }
                if (!keep && sPrompts[i]) {
                  try {
                    keep = await submitToFal(sPrompts[i], storedModels[i], false, true, sSeconds[i], sAnchors[i] ?? undefined)
                    if (keep) { resubmitted++; providerSubmissionMayExist = true }
                  } catch { keep = null }
                }
                freshIds.push(keep)
              }
              const okSec = sSeconds.reduce((a, s, i) => a + (freshIds[i] ? (s || 0) : 0), 0)
              const totSec = sSeconds.reduce((a, s) => a + (s || 0), 0) || 1
              if (freshIds.some(Boolean) && okSec >= totSec * 0.6) {
                if (reused > 0) providerSubmissionMayExist = true
                console.log(
                  `[cinematic] SALVAGE: ${reused} cenas reaproveitadas + ${resubmitted} re-submetidas (fp=${salvageFp.slice(0, 8)}) — planner/âncoras pulados`,
                )
                const patched: Record<string, unknown> = {
                  ...storedResp,
                  generationId,
                  fal_request_ids: freshIds,
                  fal_models: storedModels,
                  fal_model: storedModels[0] ?? HOLLYWOOD_MODELS.dialogue,
                }
                return publishCinematicResponse(patched, freshIds, storedModels)
              }
              console.warn('[cinematic] SALVAGE inviável (cenas insuficientes) — replanejando do zero')
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          // '__salvage_skip__' = descarte intencional (render anterior ja
          // completou) — segue pro plano fresco sem alarde.
          if (msg !== '__salvage_skip__') {
            console.warn('[cinematic] salvage lookup falhou (caminho normal):', msg)
          }
        }
      }

      // KINEO-TIKTOK-61-2026-08-17 — regra de negocio do fundador: "se a
      // gente vende 60 segundos, tem que entregar pelo menos 61" (Creator
      // Rewards do TikTok so paga acima de 1:00). O plano mira ALEM do
      // pedido (60 → 68) porque a entrega encolhe ~10% (fala real menor que
      // o planejado + gapfix). Aterrissagem esperada: 61-65s.
      const hollywoodTarget = (() => {
        const req = Math.max(45, Math.min(60, Math.round(duration || 60)))
        return req >= 55 ? req + 8 : req + 4
      })()

      let plan: HollywoodPlan
      try {
        plan = await planHollywoodScenes({
          idea: prompt,
          voiceoverScript: hollywoodVoiceover || undefined,
          scenes: scenes.map((s) => ({ voiceover: s.voiceover, description: s.aiPrompt || s.description })),
          durationSeconds: hollywoodTarget,
          language: hollywoodLanguage,
        })
      } catch (e) {
        console.error('[cinematic] hollywood planner failed:', e instanceof Error ? e.message : String(e))
        const released = await releaseBirthClaim('hollywood_planner_rejected')
        if (!released) {
          return NextResponse.json(
            { error: 'Scene planning failed and your automatic refund is still being confirmed. Please retry this same generation.' },
            { status: 503 },
          )
        }
        return NextResponse.json(
          { error: 'Hollywood scene planning failed. Please try again.' },
          { status: 502 },
        )
      }

      // KINEO-SCENEVARIETY-2026-08-17 — fundador (render Krakatoa): "a mesma
      // cena do mar se repetiu por varias vezes". Nao confiamos so na regra
      // nova do planner: aqui a SOMA e conferida em codigo — Jaccard de tokens
      // entre prompts nao-dialogo (sem as sheets, que repetem por design). Um
      // par >55% igual = replaneja UMA vez nomeando o par. Ainda igual apos o
      // replan → segue (logado), nunca mata o render.
      {
        const sim = (a: string, b: string): number => {
          const strip = (p: string) => p
            .replace(plan.characterSheet ?? '', ' ')
            .replace(plan.environmentSheet ?? '', ' ')
            .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
          const tok = (p: string) => new Set(strip(p).split(/\s+/).filter((w) => w.length > 3))
          const A = tok(a), B = tok(b)
          if (A.size === 0 || B.size === 0) return 0
          let inter = 0
          for (const w of A) if (B.has(w)) inter++
          return inter / (A.size + B.size - inter)
        }
        const dupPair = (pl: typeof plan): [number, number] | null => {
          const br = pl.scenes.map((sc, idx) => ({ sc, idx })).filter((x) => x.sc.type !== 'dialogue')
          for (let a = 0; a < br.length; a++)
            for (let b = a + 1; b < br.length; b++)
              if (sim(br[a].sc.prompt, br[b].sc.prompt) > 0.55) return [br[a].idx + 1, br[b].idx + 1]
          return null
        }
        const dup = dupPair(plan)
        if (dup) {
          console.warn(`[cinematic] hollywood scenes ${dup[0]} and ${dup[1]} are near-identical — replanning once for subject variety`)
          try {
            const replanned = await planHollywoodScenes({
              idea: prompt,
              voiceoverScript: hollywoodVoiceover || undefined,
              scenes: scenes.map((sc) => ({ voiceover: sc.voiceover, description: sc.aiPrompt || sc.description })),
              durationSeconds: hollywoodTarget,
              language: hollywoodLanguage,
              shortRetryFeedback: `scenes ${dup[0]} and ${dup[1]} show the SAME visual subject. Every non-dialogue scene must depict a DIFFERENT primary subject from the story (different event, place, era or moment) — and the environmentSheet must appear ONLY in scenes set in the narrator's own location.`,
            })
            if (!dupPair(replanned)) plan = replanned
            else console.warn('[cinematic] hollywood variety replan still repetitive — keeping best effort')
          } catch (e) {
            console.warn('[cinematic] hollywood variety replan failed (keeping first plan):', e instanceof Error ? e.message : String(e))
          }
        }
      }

      // KINEO-DURATIONFIX-2026-08-17 — dois renders do fundador sairam com
      // EXATOS 34s num pedido de 60s: o GPT-planejador ignora o alvo e ninguem
      // conferia a SOMA. Agora: (1) soma curta → replaneja UMA vez com o
      // feedback explicito; (2) ainda curta → estica as cenas NAO-dialogo ate
      // >=90% do alvo (os motores agora aceitam duracao exata 3-15/4-12 —
      // MOTORMAX — entao esticar funciona; dialogo nunca estica: a fala tem o
      // tamanho que tem).
      {
        const target = hollywoodTarget // KINEO-TIKTOK-61 — overshoot pro plano
        const planTotal = (pl: typeof plan) => pl.scenes.reduce((acc, sc) => acc + (sc.seconds || 0), 0)
        let total = planTotal(plan)
        if (total < Math.round(target * 0.85)) {
          console.warn(`[cinematic] hollywood plan too short: ${total}s of ${target}s target — replanning once`)
          try {
            const replanned = await planHollywoodScenes({
              idea: prompt,
              voiceoverScript: hollywoodVoiceover || undefined,
              scenes: scenes.map((sc) => ({ voiceover: sc.voiceover, description: sc.aiPrompt || sc.description })),
              durationSeconds: hollywoodTarget,
              language: hollywoodLanguage,
              shortRetryFeedback: `it totaled only ${total} seconds against a ${target}-second target. Return a plan whose scene seconds SUM to ${target - 5}-${target + 2}. Add scenes or lengthen the non-dialogue ones.`,
            })
            if (planTotal(replanned) > total) plan = replanned
            total = planTotal(plan)
          } catch (e) {
            console.warn('[cinematic] hollywood replan failed (keeping first plan):', e instanceof Error ? e.message : String(e))
          }
        }
        // Estica b-roll ate o alvo — MAS SO ATE ONDE A FALA ALCANCA.
        // KINEO-DURATIONFIX-B-2026-08-17 — era 90%; plano de 54 virava video
        // de 46 (cenas de fala usam o audio REAL, sempre menor).
        // KINEO-QUEUE-LATENCY-2026-08-17 — teto de apoio 15→12s (clipes de
        // 14-15s entupiram a fila do Kling na madrugada).
        // KINEO-NARRATION-FIT-2026-08-17 — feedback do fundador no render da
        // manha: "faltou narracao no meio, sem brilho". Raiz: o esticador
        // alongava o CLIPE mas nao a FALA — voiceover de 8s dentro de cena de
        // 12s = 2-4s de silencio morto POR CENA. Agora o teto de cada cena e
        // o MENOR entre 12s e o que a narracao dela sustenta (~2.3 pal/s +1s
        // de respiro). Duracao que faltar vem de MAIS CENAS (replan abaixo),
        // nunca de cena oca.
        const wordsOf = (sc: { voiceover?: string | null }) =>
          (sc.voiceover ?? '').trim().split(/\s+/).filter(Boolean).length
        const capFor = (sc: { type: string; voiceover?: string | null }) =>
          sc.type === 'cinematic'
            ? 8
            : Math.min(12, Math.max(5, Math.round(wordsOf(sc) / 2.3) + 1))
        let guard = 60
        while (total < target && guard-- > 0) {
          const stretchable = plan.scenes.filter((sc) => sc.type !== 'dialogue' && (sc.seconds || 0) < capFor(sc))
          if (stretchable.length === 0) break
          for (const sc of stretchable) {
            if (total >= target) break
            sc.seconds = (sc.seconds || 0) + 1
            total += 1
          }
        }
        // Esticador esgotou (toda fala no limite) e ainda falta >5s? UMA
        // replaneja extra pedindo MAIS CENAS com fala dimensionada — e o
        // conteudo da script que estava sendo DROPADO ("a historia ficou
        // curta") volta pro filme.
        if (total < target - 5) {
          console.warn(`[cinematic] hollywood plan ${total}s apos esticar ate o limite da fala — replan por MAIS CENAS`)
          try {
            const replanned = await planHollywoodScenes({
              idea: prompt,
              voiceoverScript: hollywoodVoiceover || undefined,
              scenes: scenes.map((sc) => ({ voiceover: sc.voiceover, description: sc.aiPrompt || sc.description })),
              durationSeconds: hollywoodTarget,
              language: hollywoodLanguage,
              shortRetryFeedback: `it covered only ${total} seconds of spoken content against a ${target}-second target. Return ${Math.min(8, plan.scenes.length + 1)}-8 scenes summing ${target - 5}-${target + 2} seconds, and size EVERY voiceover to its scene at ~2.3 words per second (a 10s scene needs 20-24 words, a 12s scene 26-30) — use MORE of the source script's facts; do not drop story beats.`,
            })
            const replannedTotal = replanned.scenes.reduce((acc, sc) => acc + (sc.seconds || 0), 0)
            if (replannedTotal > total) {
              plan = replanned
              total = replannedTotal
            }
          } catch (e) {
            console.warn('[cinematic] replan por mais cenas falhou (mantendo plano):', e instanceof Error ? e.message : String(e))
          }
        }
        console.log(`[cinematic] hollywood plan duration: ${total}s of ${target}s target (${plan.scenes.length} scenes)`)
      }

      // KINEO-HOLLYWOOD-30-2026-07-10 — HOLLYWOOD 3.0 "UM MUNDO": generate the
      // two image anchors from the plan's sheets (portrait + environment
      // still, ~$0.10, synchronous — flux/schnell is fast). FAIL-OPEN: null →
      // every scene falls back to the v2.4 t2v engines below; the render
      // never dies because of anchors.
      let anchors: HollywoodAnchors | null = null
      try {
        // Anchor generation is itself paid Fal work. From this point onward an
        // unexpected exception must keep the deterministic claim pending; it
        // must never release and let a new generationId repeat provider spend.
        providerSubmissionMayExist = true
        anchors = await generateHollywoodAnchors({
          characterSheet: plan.characterSheet,
          environmentSheet: plan.environmentSheet,
          styleSheet: plan.styleSheet,
        })
      } catch (e) {
        if (e instanceof FalQueueSubmitError && e.ambiguous) throw e
        console.error('[cinematic] hollywood anchors threw (falling back to t2v):', e instanceof Error ? e.message : String(e))
        anchors = null
      }
      if (!anchors) console.warn('[cinematic] hollywood 3.0 anchors unavailable — using v2.4 t2v path')

      // KINEO-CHARACTER-LOCK-2026-07-10 — a saved character OVERRIDES the
      // generated portrait anchor: dialogue scenes are seeded with the user's
      // character image, so the presenter is the SAME person in every video.
      // Server-side ownership lookup (id → url); the client never injects raw
      // URLs. Fail-open: an invalid id just falls back to the generated portrait.
      const characterIdRaw = (body.characterId ?? '').toString().trim()
      if (characterIdRaw) {
        try {
          const { getCharacterImageUrl } = await import('@/lib/characters')
          const charUrl = await getCharacterImageUrl(user.id, characterIdRaw)
          if (charUrl) {
            if (anchors) {
              anchors = { ...anchors, portraitUrl: charUrl }
            } else {
              // No generated anchors (flux hiccup) — still lock the character
              // for dialogue scenes; support scenes use the same image as a
              // world reference rather than dropping the lock entirely.
              anchors = { portraitUrl: charUrl, environmentUrl: charUrl }
            }
            console.log(`[cinematic] hollywood character-lock active char=${characterIdRaw.slice(0, 8)}`)
          } else {
            console.warn('[cinematic] character-lock id not found/owned — using generated portrait')
          }
        } catch (e) {
          console.warn('[cinematic] character-lock lookup failed (fail-open):', e instanceof Error ? e.message : String(e))
        }
      }

      // KINEO-HOLLYWOOD-HOST-2026-07-13 (item 2, prepared hook) — the user's
      // OWN clips for demo scenes. Same authorization contract as
      // generate-video-fast (KINEO-USER-FOOTAGE): only URLs inside THIS
      // user's folder of our public user-footage bucket are accepted, so
      // upload gating stays the real authorization. NOT spliced into the
      // render yet: hollywood clip URLs travel client-side exclusively via
      // the fal poll (cinematic-clip-status), so a pre-existing URL has no
      // lane to compose today. When compose grows a per-scene clip-override
      // param, demo scenes should consume `demoUserFootage` in order instead
      // of generating. Until then we log availability and generate demo
      // b-roll (fail-open, zero behavior change).
      const footagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/user-footage/${user.id}/`
      const demoUserFootage = planScenes
        .map((s) => (typeof s.userFootageUrl === 'string' && s.userFootageUrl.startsWith(footagePrefix) ? s.userFootageUrl : null))
        .filter((u): u is string => !!u)
      const demoSceneCount = plan.scenes.filter((s) => s.isDemo === true).length
      if (demoSceneCount > 0) {
        console.log(
          `[cinematic] hollywood demo beat: ${demoSceneCount} demo scene(s) planned${demoUserFootage.length > 0 ? ` — ${demoUserFootage.length} user clip(s) available (inline splicing pending compose hook; generating demo b-roll)` : ''}`,
        )
      }

      // KINEO-HOLLYWOOD-HOST-2026-07-13 (item 1) — narration metadata hoisted
      // ABOVE the submit loop: hVoiceoverScript is the exact voiceover_script
      // string compose receives back from the client, and BOTH routes resolve
      // the narrator persona from it (lib/hollywood/hostVoice) — that's what
      // guarantees the host lines and the b-roll narration share ONE voice.
      const hNarrations = plan.scenes.map((s) => (s.needsNarration && s.voiceover ? s.voiceover : null))
      const hVoiceoverScript =
        hNarrations.filter(Boolean).join(' ') ||
        plan.scenes.map((s) => s.dialogueLine ?? '').filter(Boolean).join(' ') ||
        prompt

      // One voice for the whole video. Only meaningful on the anchored path
      // (the presenter engine needs the portrait anchor); resolution is pure
      // and can only fail on truly broken input — fail-open to null → every
      // dialogue scene takes the v3.0 O3 native-audio path unchanged.
      let hostVoice: HollywoodVoice | null = null
      if (anchors) {
        try {
          hostVoice = resolveHollywoodVoice(hVoiceoverScript, hollywoodLanguage, hollywoodVertical)
          console.log(
            `[cinematic] hollywood host voice pinned: persona=${hostVoice.personaId} voice=${hostVoice.voice} speed=${hostVoice.defaultSpeed}`,
          )
        } catch (e) {
          console.warn('[cinematic] hollywood host voice resolution failed (falling back to O3 native audio):', e instanceof Error ? e.message : String(e))
          hostVoice = null
        }
      }
      const hostPerformancePrompt = buildHostPerformancePrompt(plan.characterSheet, plan.styleSheet)
      // Verbatim scripts may carry an explicit `speed:` directive — apply it
      // to the host lines exactly like compose applies it to the narration
      // (persona pace × user speed, clamped inside synthesizeHostSpeech).
      const hostUserSpeed = typeof parsedScript.speed === 'number' && parsedScript.speed > 0 ? parsedScript.speed : 1.0

      // Submit each scene to ITS engine — same stagger/retry as the classic
      // path, but the model is per scene (no single-model fallback here: a
      // partially-failed submit still composes from the scenes that made it).
      // KINEO-HOLLYWOOD-30-2026-07-10 — with anchors, EVERY scene goes to
      // Kling O3 Pro image-to-video: dialogue seeded with the PORTRAIT (same
      // face every scene), support/cinematic with the ENVIRONMENT still (same
      // world every cut). Concurrency note: the shared fal-ai/kling-video-v3
      // alias allows 1 in-flight request per user — the existing SEQUENTIAL
      // submit with stagger already respects that; do NOT parallelize.
      // KINEO-HOLLYWOOD-HOST-2026-07-13 — anchored DIALOGUE scenes try the
      // HOST path first: TTS the line with the pinned voice → upload mp3 →
      // Kling AI Avatar v2 (portrait + audio + performance prompt). The clip's
      // real length follows the AUDIO, so the scene's timeline seconds are
      // overwritten with the measured TTS duration (compose/builder honor the
      // exact value for 'host' scenes — no 5|10 snap, no leftover silence, no
      // cut speech). ANY failure (TTS, measure, upload, submit) logs the
      // reason and falls back to the O3 i2v native-audio submit for THAT
      // scene only. `hEngines` is the per-scene RENDER engine sent to compose
      // ('host' | 'dialogue' | 'cinematic' | 'support').
      const hRequestIds: (string | null)[] = []
      const hModels: string[] = []
      const hEngines: string[] = []
      for (const hs of plan.scenes) {
        // `sceneModel`/`sceneEngine` (NOT `usedModel` — that name belongs to
        // the classic single-model path below and must not be shadowed).
        let sceneModel: string = anchors ? KLING3_I2V_MODEL : HOLLYWOOD_MODELS[hs.type]
        let sceneEngine: string = hs.type
        let id: string | null = null

        // KINEO-HOLLYWOOD-VOICEFIX-2026-08-16 — DESLIGADO por padrao (flag).
        // O host path fazia TTS (persona por hash do script, gênero aleatorio)
        // por cima do ROSTO do personagem via Avatar: cai numa voz feminina e
        // o homem da ancora "fala" com voz de mulher (bug flagrado pelo
        // fundador no render Flannan Isles). Ate o gênero da voz ser resolvido
        // a partir do characterSheet (Projeto Piso), cenas de dialogo voltam ao
        // caminho O3 NATIVO: o personagem fala com a PROPRIA voz, labios e voz
        // sempre do mesmo dono. Narracao TTS segue apenas nas cenas sem gente
        // (estilo documentario: narrador + personagem sao pessoas diferentes).
        if (process.env.KINEO_HOLLYWOOD_HOST_TTS === 'on' && anchors && hostVoice && hs.type === 'dialogue' && hs.dialogueLine && hs.dialogueLine.trim()) {
          try {
            const speechBuf = await synthesizeHostSpeech({
              text: hs.dialogueLine,
              voice: hostVoice.voice,
              speed: hostVoice.defaultSpeed * hostUserSpeed,
            })
            const audioDur = estimateMp3DurationSeconds(speechBuf)
            if (!(audioDur > 0.5)) throw new Error(`host TTS unmeasurable/too short (${audioDur.toFixed(2)}s)`)
            const audioUrl = await uploadVoiceoverToSupabase(user.id, speechBuf)
            const reqId = await submitAvatarJob({
              imageUrl: anchors.portraitUrl,
              audioUrl,
              engine: 'presenter',
              performancePrompt: hostPerformancePrompt,
            })
            if (!reqId) throw new Error('presenter queue submit returned no request id')
            id = reqId
            sceneModel = HOST_PRESENTER_MODEL
            sceneEngine = 'host'
            // The montage must follow the REAL audio length, not the planned
            // 5|10s block — this is what kills both the trailing silence and
            // the cut-off last word (0.1s precision is enough for Creatomate).
            hs.seconds = Math.max(2, Math.round(audioDur * 10) / 10)
            console.log(
              `[cinematic] hollywood host scene ${hs.index}: TTS ${audioDur.toFixed(1)}s voice=${hostVoice.voice} → presenter submitted`,
            )
          } catch (e) {
            if (e instanceof AvatarSubmitError && e.ambiguous) {
              // The presenter POST may have been accepted. Falling back to O3
              // would create a second paid job for the same scene. If earlier
              // scenes have durable IDs, publish those instead of stranding
              // the whole paid generation in a pending claim forever.
              providerSubmissionMayExist = true
              if (hRequestIds.some((requestId) => requestId !== null)) {
                console.warn(
                  `[cinematic] hollywood presenter scene ${hs.index} submit became ambiguous; preserving earlier accepted scenes`,
                )
                hRequestIds.push(null)
                hModels.push(HOST_PRESENTER_MODEL)
                hEngines.push('host')
                break
              }
              throw e
            }
            console.warn(
              `[cinematic] hollywood host scene ${hs.index} failed — falling back to O3 native audio:`,
              e instanceof Error ? e.message : String(e),
            )
            id = null
            sceneModel = anchors ? KLING3_I2V_MODEL : HOLLYWOOD_MODELS[hs.type]
            sceneEngine = hs.type
          }
        }

        if (!id) {
          // v3.0 path — byte-identical to before v3.5 (and the per-scene
          // fallback when the host path above failed).
          // KINEO-SPECTACLE-2026-08-17 (fundador: "a mesma cena do mar se
          // repetiu varias vezes") — a RAIZ da repeticao: TODA cena nao-dialogo
          // era semeada com a MESMA imagem-ancora de ambiente (i2v), entao
          // todo b-roll nascia da mesma foto. A ancora de ambiente agora so
          // vale quando o PROPRIO planner colocou o environmentSheet no prompt
          // da cena (= a cena se passa no mundo do narrador); b-roll de outros
          // lugares/eventos vai de t2v e ganha visual proprio.
          const envSig = (plan.environmentSheet ?? '').trim().toLowerCase().slice(0, 24)
          const inNarratorWorld = envSig.length > 8 && hs.prompt.toLowerCase().includes(envSig)
          const anchorUrl = anchors
            ? hs.type === 'dialogue'
              ? anchors.portraitUrl
              : inNarratorWorld ? anchors.environmentUrl : undefined
            : undefined
          // KINEO-IMAGEFIRST-2026-08-17 — fundador pegou a SEGUNDA cena deitada
          // (Londres 1908 inteira de lado, mesmo com a ordem de horizonte no
          // prompt). Pedir por favor nao resolve rotacao: agora cena de apoio
          // sem ancora nasce de um STILL 9:16 proprio (flux, ~2s, centavos) e
          // anima por i2v — com o primeiro frame vertical, o clipe NAO TEM
          // como sair deitado. E o modo image-first do PROJETO-PISO. Fail-open:
          // still falhou → t2v como antes (com o prefixo upright abaixo).
          let sceneStillUrl: string | null = null
          if (hs.type === 'support' && !anchorUrl) {
            try {
              sceneStillUrl = await generateCinematicSceneStill({
                scenePrompt: hs.prompt,
                styleSuffix: plan.styleSheet ?? '',
                seed: generationSeed,
                pollWindowMs: 9_000,
              })
            } catch { sceneStillUrl = null }
          }
          const sceneAnchor = anchorUrl ?? sceneStillUrl ?? undefined
          sceneModel = sceneAnchor ? KLING3_I2V_MODEL : HOLLYWOOD_MODELS[hs.type]
          // KINEO-VOICEFIX-2026-08-17 (parte 2, em CODIGO): cena NAO-dialogo
          // nunca pode ter boca mexendo — a narracao TTS toca por cima e boca
          // + voz de outra pessoa = dublagem de terror (o bug que o fundador
          // viu DUAS vezes). Nao confiamos so no planner: o sufixo vai sempre.
          const mouthSuffix = hs.type !== 'dialogue' ? ' If any person is visible: mouth closed, not speaking, no lip movement, no talking.' : ''
          // KINEO-SPECTACLE-2026-08-17 (fundador: "nao estava muito nitida,
          // sem efeitos") — DNA de nitidez/escala em todo b-roll, em CODIGO
          // (nao dependemos do planner escrever bonito).
          // KINEO-UPRIGHT-2026-08-17 (fundador: "teve uma cena deitada") — um
          // clipe da manha veio com o horizonte NA VERTICAL: em prompt de
          // "wide establishing" o modelo as vezes pinta a paisagem de lado
          // dentro do quadro 9:16. Ordem explicita de composicao vertical +
          // horizonte nivelado em toda cena nao-dialogo.
          const spectacleSuffix = hs.type !== 'dialogue'
            ? ' Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.'
            : ''
          // KINEO-UPRIGHT-B-2026-08-17 — a ordem de composicao vertical sai do
          // FIM do prompt (onde o modelo menos pesa) e vira PREFIXO: tokens
          // iniciais mandam mais. Vale pro t2v; no i2v o still ja trava tudo.
          const uprightPrefix = hs.type !== 'dialogue' && !sceneAnchor
            ? 'Vertical 9:16 composition, camera upright, horizon perfectly LEVEL and horizontal across the frame. '
            : ''
          const scenePrompt = uprightPrefix + hs.prompt + eraSuffix + mouthSuffix + spectacleSuffix
          try {
            id = await submitToFal(scenePrompt, sceneModel, false, true, hs.seconds, sceneAnchor)
          } catch (e) {
            if (
              e instanceof FalQueueSubmitError && e.ambiguous &&
              hRequestIds.some((requestId) => requestId !== null)
            ) {
              providerSubmissionMayExist = true
              console.warn(
                `[cinematic] hollywood scene ${hs.index} submit became ambiguous; preserving earlier accepted scenes`,
              )
              hRequestIds.push(null)
              hModels.push(sceneModel)
              hEngines.push(sceneEngine)
              break
            }
            throw e
          }
        }
        if (id) providerSubmissionMayExist = true
        hRequestIds.push(id)
        hModels.push(sceneModel)
        hEngines.push(sceneEngine)
        await new Promise((r) => setTimeout(r, 450))
      }

      // Keep every response array parallel to plan.scenes. Unsubmitted scenes
      // remain null and follow the existing stock/fallback path in compose.
      while (hRequestIds.length < plan.scenes.length) {
        const unsubmitted = plan.scenes[hRequestIds.length]
        hRequestIds.push(null)
        hModels.push(anchors ? KLING3_I2V_MODEL : HOLLYWOOD_MODELS[unsubmitted.type])
        hEngines.push(unsubmitted.type)
      }

      const hValid = hRequestIds.filter((id): id is string => id !== null)
      // KINEO-FAILFAST-2026-08-17 — o render do fundador saiu com 10s de um
      // alvo de 60s e COBROU 150cr: o saldo do fal estourou NO MEIO da fila
      // (1/7 cenas entrou, seis 403 "Exhausted balance") e o pipeline compôs
      // "o que sobrou". O guard antigo só abortava com ZERO cenas — 1/7
      // passava. Piso novo por SEGUNDOS: se as cenas aceitas não cobrem 60%
      // do plano, o render já nasceu condenado — aborta AQUI, estorna
      // automaticamente e alerta o fundador se for saldo. O custo das cenas
      // parciais já na fila é nosso (centavos), nunca do cliente.
      const hPlannedSec = plan.scenes.reduce((acc, sc) => acc + (sc.seconds || 0), 0)
      const hSubmittedSec = plan.scenes.reduce(
        (acc, sc, i) => acc + (hRequestIds[i] ? (sc.seconds || 0) : 0),
        0,
      )
      if (hValid.length === 0 || hSubmittedSec < hPlannedSec * 0.6) {
        console.error(
          `[cinematic] hollywood FAILFAST: only ${hValid.length}/${plan.scenes.length} scenes (${hSubmittedSec}s of ${hPlannedSec}s planned) — aborting with refund${FAL_EXHAUSTED ? ' (FAL BALANCE EXHAUSTED)' : ''}`,
        )
        const released = await releaseBirthClaim(FAL_EXHAUSTED ? 'provider_balance_rejected' : 'provider_rejected')
        if (!released) {
          return NextResponse.json(
            { error: 'No AI scenes started and your automatic refund is still being confirmed. Please retry this same generation.' },
            { status: 503 },
          )
        }
        if (FAL_EXHAUSTED) {
          await alertFalExhausted(`user=${user.id.slice(0, 8)} engine=hollywood submitted=${hValid.length}/${plan.scenes.length}`)
          return NextResponse.json(
            {
              queued: true,
              error: "We're experiencing high demand right now. Nothing was charged — your credits were refunded automatically. Please try again in a few minutes.",
            },
            { status: 503 },
          )
        }
        return NextResponse.json(
          { error: 'Could not start enough scenes for a full video. Nothing was charged — please try again.' },
          { status: 502 },
        )
      }

      // KINEO-HOLLYWOOD-30-2026-07-10 — per-scene models (i2v when anchored)
      // + the anchors' ~$0.10 included in the logged TOTAL.
      logHollywoodCost(generationId, plan.scenes, {
        models: hModels,
        anchorsUsd: anchors ? ANCHORS_USD : 0,
      })
      console.log(
        `[cinematic] hollywood submitted ${hValid.length}/${plan.scenes.length} clips user=${user.id.slice(0, 8)} generationId=${generationId} anchored=${anchors ? 'yes' : 'no'} est=$${plan.estimatedCostUsd.toFixed(2)}`,
      )

      // KINEO-HOLLYWOOD-HOST-2026-07-13 — hNarrations/hVoiceoverScript moved
      // ABOVE the submit loop (the host voice is resolved from them).

      const response: Record<string, unknown> = {
        mode: 'cinematic_ai',
        freeTrial: false,
        generationId,
        prompt,
        duration,
        scenes: plan.scenes.map((s) => s.prompt),
        scene_captions: plan.scenes.map((s) => s.caption),
        voiceover_script: hVoiceoverScript,
        fal_request_ids: hRequestIds, // null for failed submissions
        fal_model: hModels[0] ?? HOLLYWOOD_MODELS.dialogue, // back-compat: scene-1 model
        fal_models: hModels, // parallel to fal_request_ids
        // KINEO-HOLLYWOOD-HOST-2026-07-13 — the RENDER engine per scene:
        // 'host' (presenter clip, speech baked in, timeline follows the real
        // audio seconds) | 'dialogue' | 'cinematic' | 'support'. Compose keys
        // volume/narration/caption/duration decisions off this.
        scene_engines: hEngines,
        // KINEO-HOLLYWOOD-RETRY-2026-08-16 — o client precisa do prompt e da
        // âncora de cada cena pra re-submeter UMA vez as que falharem no
        // fornecedor (conserto do vídeo curto de 34s).
        scene_prompts: plan.scenes.map((s) => s.prompt + eraSuffix),
        // KINEO-SPECTACLE-2026-08-17 — espelha a regra do submit loop: ambiente
        // só pra cena que o planner situou no mundo do narrador (environmentSheet
        // presente no prompt); b-roll de outros lugares re-tenta em t2v sem âncora.
        scene_anchor_urls: plan.scenes.map((s) => {
          if (!anchors) return null
          if (s.type === 'dialogue') return anchors.portraitUrl
          const sig = (plan.environmentSheet ?? '').trim().toLowerCase().slice(0, 24)
          return sig.length > 8 && s.prompt.toLowerCase().includes(sig) ? anchors.environmentUrl : null
        }),
        scene_narrations: hNarrations, // TTS text per scene (null = native audio only)
        // For host scenes these are the MEASURED TTS seconds (0.1s precision),
        // overwritten in the submit loop — not the planner's 5|10 estimate.
        scene_seconds: plan.scenes.map((s) => s.seconds),
        // KINEO-HOLLYWOOD-21-2026-07-10 (bug b) — the EXACT spoken line per
        // dialogue scene (null for the rest), parallel to fal_request_ids.
        // Compose uses it to caption dialogue scenes with the REAL speech.
        scene_dialogues: plan.scenes.map((s) => (s.type === 'dialogue' && s.dialogueLine ? s.dialogueLine : null)),
        cost_estimate_usd: plan.estimatedCostUsd,
        quality: 'cinematic_hollywood',
        verbatim,
        speed: parsedScript.speed,
      }
      // KINEO-SALVAGE-2026-08-17 — grava o snapshot completo pro retry
      // reaproveitar (best-effort: falha aqui nunca afeta o render).
      if (salvageDb) {
        try {
          await salvageDb.from('hollywood_resume').upsert({
            user_id: user.id,
            fingerprint: salvageFp,
            generation_id: generationId,
            response,
            request_ids: hRequestIds,
            models: hModels,
            created_at: new Date().toISOString(),
          })
        } catch (e) {
          console.warn('[cinematic] salvage persist falhou:', e instanceof Error ? e.message : String(e))
        }
      }
      return publishCinematicResponse(response, hRequestIds, hModels)
    }
    // ── end KINEO-HOLLYWOOD-2026-07-09 ──────────────────────────────────────

    // ── KINEO-CINEMATIC-ANCHOR-2026-07-24 — cross-scene consistency (CLASSIC) ─
    // Flag-gated (OFF by default → this whole block is skipped and the path
    // below is BYTE-IDENTICAL pure t2v). When ON, this applies ONLY to
    // engine==='kling': generate ONE FLUX still per scene (each depicting its
    // OWN scene, all sharing styleSuffix + generationSeed for palette coherence)
    // and then submit each scene as Kling image-to-video seeded with its OWN
    // still. Seedance (default, highest volume, cheapest) and Veo stay pure t2v
    // to protect margin — they are NEVER anchored. Veo has no confirmed i2v
    // model/param in this codebase, so it is intentionally left as t2v.
    //
    // LATENCY/BUDGET: maxDuration=60. Stills run with bounded concurrency (pool
    // of 3) under a hard time budget; scenes beyond MAX_ANCHORED_SCENES, or any
    // scene reached after the budget is spent, get NO still and fall back to t2v
    // per-scene in submitScene. Each still also has a short per-image poll window
    // so a slow FLUX job can never stall the request.
    //
    // FAIL-OPEN: generateCinematicSceneStill returns null on any failure → that
    // scene is submitted as t2v. A still is disposable and is never re-POSTed, so
    // it cannot create a duplicate billable CLIP.
    const anchorActive = wantsKling && CINEMATIC_ANCHOR_ENABLED
    const sceneStills: (string | null)[] = new Array(scenes.length).fill(null)
    if (anchorActive) {
      // FLUX stills are paid Fal work: once we start them, an unexpected throw
      // must keep the deterministic claim PENDING (never release + let a new
      // generationId repeat provider spend) — same discipline as Hollywood 3.0.
      providerSubmissionMayExist = true
      const STILL_POOL = 3
      const STILL_BUDGET_MS = 30_000 // leave the rest of the 60s budget for scene submits
      const STILL_POLL_WINDOW_MS = 12_000 // per-image cap (schnell @4 steps is fast)
      const MAX_ANCHORED_SCENES = 6
      const anchorCount = Math.min(scenes.length, MAX_ANCHORED_SCENES)
      const stillDeadline = Date.now() + STILL_BUDGET_MS
      let stillsMade = 0
      for (let start = 0; start < anchorCount && Date.now() < stillDeadline; start += STILL_POOL) {
        const batch: number[] = []
        for (let i = start; i < Math.min(start + STILL_POOL, anchorCount); i++) batch.push(i)
        const results = await Promise.all(
          batch.map(async (idx) => {
            const scene = scenes[idx]
            const visual = scene.aiPrompt || scene.stockSearchQuery || scene.description
            // Same faceless subject + era lock as the video prompt below; the
            // shared style suffix + seed are what tie the stills together.
            const scenePrompt = buildFacelessCinematicPrompt(visual) + eraSuffix
            const url = await generateCinematicSceneStill({
              scenePrompt,
              styleSuffix,
              seed: generationSeed,
              pollWindowMs: STILL_POLL_WINDOW_MS,
            })
            return { idx, url }
          }),
        )
        for (const { idx, url } of results) {
          sceneStills[idx] = url
          if (url) stillsMade++
        }
      }
      // Cost logging only — the USER credit price is unchanged (kling stays 50cr).
      // Account the extra provider cost the same conservative way Hollywood does
      // (ANCHORS_USD per generated still).
      const extraFluxUsd = stillsMade * ANCHORS_USD
      console.log(
        `[cinematic-anchor] gen=${generationId} engine=kling stills_ready=${stillsMade}/${scenes.length} ` +
          `anchored_scenes=${anchorCount} i2v_model=${KLING_I2V_MODEL} ` +
          `extra_flux_usd=${extraFluxUsd.toFixed(2)} (user credits unchanged: kling=${KLING_CREDIT_COST}cr)`,
      )
    }

    // Submit ONE scene with a REAL single retry on an EXPLICIT (non-ambiguous)
    // reject. submitToFal returns null ONLY for an explicit FalQueueSubmitError
    // (Fal definitively did NOT accept the job — safe to re-POST); it THROWS for
    // an ambiguous error (transport/408/5xx or a missing id — the job MAY exist,
    // so it must NEVER be re-POSTed) and for any unexpected error. So a null
    // result is the exact, safe signal to retry once after a short backoff.
    // Tagged result → never throws for the explicit/retry path; ambiguous/fatal
    // are surfaced so the caller can preserve the claim/ambiguous semantics.
    // KINEO-CINEMATIC-ANCHOR-2026-07-24 — the 'id' variant now also carries the
    // model that actually ran (i2v when anchored, t2v otherwise) so the signed
    // claim records the RIGHT per-scene model for polling.
    type SceneSubmitResult =
      | { kind: 'id'; id: string | null; model: string }
      | { kind: 'ambiguous'; error: FalQueueSubmitError }
      | { kind: 'fatal'; error: unknown }
    const submitScene = async (
      scene: { aiPrompt?: string; stockSearchQuery?: string; description: string },
      model: string,
      // KINEO-CINEMATIC-ANCHOR-2026-07-24 — this scene's FLUX still (kling only,
      // flag ON). Undefined → pure t2v (byte-identical to before).
      imageUrl?: string,
    ): Promise<SceneSubmitResult> => {
      // #440/#441 — feed the engine the cinematic SHOT description (aiPrompt),
      // falling back to the stock query only if description generation failed.
      // buildFacelessCinematicPrompt then strips any person nouns + forces
      // environment-first b-roll, on-brand for this faceless channel.
      const visualPrompt = scene.aiPrompt || scene.stockSearchQuery || scene.description
      const cinematic = buildFacelessCinematicPrompt(visualPrompt) + eraSuffix + styleSuffix
      try {
        // KINEO-CINEMATIC-ANCHOR-2026-07-24 — when this scene has a ready still,
        // submit it as image-to-video on the engine's i2v counterpart (SAME
        // shared seed for retry stability). An EXPLICIT (non-ambiguous) i2v
        // reject falls through to this scene's normal t2v below — the video is
        // always produced. An AMBIGUOUS i2v throw is surfaced (the clip may
        // exist) exactly like t2v and is NEVER re-POSTed as a second job.
        if (imageUrl) {
          const i2vModel = model === KLING_MODEL ? KLING_I2V_MODEL : model
          const i2vId = await submitToFal(cinematic, i2vModel, hd, false, undefined, imageUrl, generationSeed)
          if (i2vId !== null) return { kind: 'id', id: i2vId, model: i2vModel }
          console.warn('[cinematic-anchor] i2v submit rejected — falling back to t2v for this scene')
        }
        // KINEO-SEED-2026-07-24 — every scene shares generationSeed for coherence.
        let id = await submitToFal(cinematic, model, hd, false, undefined, undefined, generationSeed)
        if (id === null) {
          // Explicit non-ambiguous reject: Fal did not accept the job. One real
          // retry after a short backoff clears a transient burst/rate-limit 4xx
          // (the historic "submitted 4/5" drop) before we give up on the scene.
          await new Promise((r) => setTimeout(r, 800))
          id = await submitToFal(cinematic, model, hd, false, undefined, undefined, generationSeed)
        }
        return { kind: 'id', id, model }
      } catch (e) {
        // Ambiguous (incl. an ambiguous throw on the retry POST or the i2v POST)
        // is NOT re-tried and NOT re-POSTed — the job may already exist; surface it.
        if (e instanceof FalQueueSubmitError && e.ambiguous) return { kind: 'ambiguous', error: e }
        return { kind: 'fatal', error: e }
      }
    }

    // KINEO-CINEMATIC-ANCHOR-2026-07-24 — returns per-scene ids AND the model
    // each scene actually ran on (i2v for anchored scenes, t2v otherwise), both
    // index-aligned to scenes[]. When anchoring is OFF the models array is
    // uniformly `model`, so claim.falModels is identical to the pre-feature
    // `falRequestIds.map(() => usedModel)`.
    async function submitAllScenes(model: string): Promise<{ ids: (string | null)[]; models: string[] }> {
      // KINEO-PARALLEL-2026-07-24 — engines with NO shared-alias limit
      // (Seedance, Veo) submit with bounded concurrency (pool of 3) to cut
      // submit latency; Kling stays SERIAL with the 450ms stagger because the
      // kling-video alias throttles per user (same shared-alias family as the
      // Hollywood v3 path — kept serial when unsure to avoid burst 4xx drops).
      const canParallelize = model === SEEDANCE_MODEL || model === VEO_MODEL
      const PARALLEL_POOL = 3

      if (canParallelize) {
        // Index-aligned so fal_request_ids[i] always maps to scenes[i] even when
        // some scenes drop out (ambiguous/failed stay null at their own index).
        const ids: (string | null)[] = new Array(scenes.length).fill(null)
        const models: string[] = new Array(scenes.length).fill(model)
        let ambiguousErr: FalQueueSubmitError | null = null
        let stop = false
        for (let start = 0; start < scenes.length && !stop; start += PARALLEL_POOL) {
          const batch: number[] = []
          for (let i = start; i < Math.min(start + PARALLEL_POOL, scenes.length); i++) batch.push(i)
          const settled = await Promise.all(
            // Seedance/Veo are never anchored, so sceneStills[idx] is null here;
            // passed for uniformity (undefined imageUrl → identical t2v submit).
            batch.map(async (idx) => ({ idx, res: await submitScene(scenes[idx], model, sceneStills[idx] ?? undefined) })),
          )
          // An unexpected (non-ambiguous, non-explicit) failure propagates — the
          // outer handler keeps the claim safe. Explicit rejects already became
          // a null id inside submitScene (after the retry).
          const fatal = settled.find(({ res }) => res.kind === 'fatal')
          if (fatal && fatal.res.kind === 'fatal') throw fatal.res.error
          // Record every accepted id FIRST (at its own index), then decide on
          // ambiguity — so an ambiguous sibling never discards a paid job.
          for (const { idx, res } of settled) {
            if (res.kind === 'id') {
              if (res.id) providerSubmissionMayExist = true
              ids[idx] = res.id
              models[idx] = res.model
            } else if (res.kind === 'ambiguous') {
              ambiguousErr = res.error
            }
          }
          if (ambiguousErr) {
            if (ids.some((requestId) => requestId !== null)) {
              // A job MAY exist for the ambiguous scene(s); leave them null and
              // stop submitting more — keep the claim pending, never re-POST.
              providerSubmissionMayExist = true
              console.warn('[cinematic] scene submit became ambiguous; preserving earlier accepted scenes')
              stop = true
            } else {
              // Nothing accepted anywhere yet — propagate so the claim stays
              // pending (the ambiguous job may still exist; do not release/refund).
              throw ambiguousErr
            }
          }
        }
        return { ids, models }
      }

      // Serial path (Kling): 450ms stagger between submits + the same real retry.
      const ids: (string | null)[] = []
      const models: string[] = []
      for (let i = 0; i < scenes.length; i++) {
        // KINEO-CINEMATIC-ANCHOR-2026-07-24 — anchored Kling scene → its own
        // FLUX still (i2v); null still → per-scene t2v fallback inside submitScene.
        const res = await submitScene(scenes[i], model, sceneStills[i] ?? undefined)
        if (res.kind === 'fatal') throw res.error
        if (res.kind === 'ambiguous') {
          if (ids.some((requestId) => requestId !== null)) {
            providerSubmissionMayExist = true
            console.warn('[cinematic] scene submit became ambiguous; preserving earlier accepted scenes')
            ids.push(null)
            models.push(model)
            break
          }
          throw res.error
        }
        if (res.id) providerSubmissionMayExist = true
        ids.push(res.id)
        models.push(res.model)
        await new Promise((r) => setTimeout(r, 450))
      }
      while (ids.length < scenes.length) { ids.push(null); models.push(model) }
      return { ids, models }
    }

    const submittedScenes = await submitAllScenes(usedModel)
    const falRequestIds = submittedScenes.ids
    const usedModels = submittedScenes.models
    let validIds = falRequestIds.filter((id): id is string => id !== null)

    // Do not silently downgrade Kling to Seedance after the signed cost/engine
    // claim is born. A rejected premium submit is retriable and never charged.

    // KINEO-FAILFAST-2026-08-17 — mesmo piso do Hollywood no caminho classico:
    // menos da METADE das cenas aceitas (ex.: saldo do fal estourando no meio
    // da fila) = render condenado a sair curto. Aborta com estorno em vez de
    // compor um toco e cobrar o cliente.
    if (validIds.length === 0 || validIds.length < Math.ceil(scenes.length * 0.5)) {
      if (validIds.length > 0) {
        console.error(
          `[cinematic] classic FAILFAST: only ${validIds.length}/${scenes.length} scenes submitted — aborting with refund${FAL_EXHAUSTED ? ' (FAL BALANCE EXHAUSTED)' : ''}`,
        )
      }
      const released = await releaseBirthClaim(FAL_EXHAUSTED ? 'provider_balance_rejected' : 'provider_rejected')
      if (!released) {
        return NextResponse.json(
          { error: 'No AI scenes started and your automatic refund is still being confirmed. Please retry this same generation.' },
          { status: 503 },
        )
      }
      // KINEO-FAL-ALARM-2026-07-06 — if the failure was an exhausted fal balance,
      // don't show a dead error: alert the founder and return a soft "queued"
      // message so the user waits calmly instead of thinking the product broke.
      // The deterministic upfront debit has already been refunded above.
      if (FAL_EXHAUSTED) {
        await alertFalExhausted(`user=${user.id.slice(0, 8)} engine=${usedModel}`)
        return NextResponse.json(
          {
            queued: true,
            error: "We're experiencing high demand right now. Nothing started and your credits were refunded automatically.",
          },
          { status: 503 },
        )
      }
      return NextResponse.json(
        { error: 'Could not submit clips to AI generator. Please try again.' },
        { status: 502 }
      )
    }

    const voiceoverScript = verbatim && parsedScript.narration
      ? parsedScript.narration
      : scenes.map((s) => s.voiceover).filter(Boolean).join(' ')

    console.log(
      `[cinematic] submitted ${validIds.length}/${scenes.length} clips to fal.ai user=${user.id.slice(0, 8)} generationId=${generationId}`
    )

    const response: Record<string, unknown> = {
      mode: 'cinematic_ai',
      freeTrial: false,
      generationId,
      prompt,
      duration,
      scenes: scenes.map((s) => s.description),
      scene_captions: scenes.map((s) => s.caption),
      voiceover_script: voiceoverScript,
      fal_request_ids: falRequestIds, // null for failed submissions
      fal_model: usedModel, // #401 — which engine ran (client passes it to clip-status)
      // KINEO-CINEMATIC-ANCHOR-2026-07-24 — per-scene models ONLY when anchoring
      // ran (some scenes i2v, some t2v-fallback), so the client polls each clip
      // on its own endpoint. Omitted when OFF → response is byte-identical.
      ...(anchorActive ? { fal_models: usedModels } : {}),
      quality: claimQuality,
      verbatim,
      speed: parsedScript.speed,
    }
    // The signed claim records the ACTUAL per-scene model (usedModels). When
    // anchoring is OFF these are all `usedModel`, identical to the previous
    // `falRequestIds.map(() => usedModel)`.
    return publishCinematicResponse(response, falRequestIds, usedModels)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[cinematic] unexpected error:', msg)
    if (
      (error instanceof FalQueueSubmitError && error.ambiguous) ||
      (error instanceof AvatarSubmitError && error.ambiguous)
    ) {
      providerSubmissionMayExist = true
    }
    if (activeBirthClaim && !providerSubmissionMayExist && releaseActiveBirthClaim) {
      const released = await releaseActiveBirthClaim('explicit_pre_provider_failure')
      if (!released) {
        return NextResponse.json(
          { error: 'Generation stopped before submission and your automatic refund is still being confirmed. Please retry this same generation.' },
          { status: 503 },
        )
      }
    }
    if (activeBirthClaim && providerSubmissionMayExist) {
      return NextResponse.json(
        {
          error: 'Your AI scenes may already be processing. Reconnecting to the same protected submission.',
          pending: true,
          retry_after_ms: 3000,
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
