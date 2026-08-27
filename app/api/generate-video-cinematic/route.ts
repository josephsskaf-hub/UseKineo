// Push #315 — Cinematic Mode: fal.ai Wan 2.1 AI video generation.
// Submits each scene to fal.ai queue (async), returns request IDs immediately.
// Client polls /api/cinematic-clip-status until all clips are ready, then
// hands off to /api/compose exactly like Fast Mode. Cost: 3 credits.
import { NextRequest, NextResponse } from 'next/server'
import { creditCostFor, creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
// KINEO-SALVAGE-2026-08-17 — fingerprint da retomada + status-check das cenas
// guardadas (mesmo padrão do cinematic-clip-status).
import { createHash } from 'crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { writeServerEvent } from '@/lib/serverEvents'
// KINEO-353A — classificacao pura da falha de cena (sem rede, sem banco).
import {
  classifyProviderFailure,
  isBalanceExhausted,
  providerSpendPossible,
  safeLogFields,
  type SceneOutcome,
} from '@/lib/cinematic/sceneDisposition'
// KINEO-353A.1 — a orquestracao (retry, fallback de modelo, vetor por cena)
// vive num modulo importavel para o teste de contrato exercitar ESTA logica.
import {
  buildContextualSafeVisualPrompt,
  dispatchOneSceneWithSafeVisualRetry,
  hasRenderableClassicScene,
  invarianteFecha,
  montarPlano,
  resumirPlano,
  type AttemptRecord,
} from '@/lib/cinematic/dispatchScenes'
import { resolveVerbatimSegments } from '@/lib/cinematic/verbatimBeats'
import { aplicarEixoVisual } from '@/lib/hollywood/varietyAxis'
import { decidirFormato, permiteApresentador, TAG_FACELESS } from '@/lib/cinematic/visualMode'
import { fal } from '@fal-ai/client'
import { generateScenes, shortCaptionFromVoiceover } from '@/lib/runway'
// KINEO-CAPACITY-2026-08-08 — teto GLOBAL diário de renders de IA (disjuntor).
import { checkAiRenderDailyCap, AI_RENDER_CAP_MESSAGE } from '@/lib/aiRenderCircuitBreaker'
import { parseUserScript } from '@/lib/scriptParser'
// KINEO-NARRACAO-ENCHE-2026-08-22 — a aritmética que impede um roteiro curto
// demais de virar um filme com imagem muda. Ver o cabeçalho do módulo para a
// medição que originou a regra.
import { narrationFit, narrationTooShortMessage, MIN_COVERAGE } from '@/lib/narrationFit'
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
  // KINEO-H3-2026-08-19 — MiniMax H3 entra pela MESMA estrada cinematográfica
  // para herdar o Contrato Hollywood inteiro. Ver o bloco no router.
  H3_I2V_MODEL,
  H3_MODELS,
  H3_RESOLUTION,
  OMNI_I2V_MODEL, // KINEO-OMNI-2026-08-25

  cinematicSceneModel,
  type CinematicFamily,
  mentionsRealPerson,
  sanitizeRealPeople,
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
// KINEO-V6.1-2026-08-25 — o espelho morre: a rota LÊ a régua única (#296).
const SEEDANCE_CREDIT_COST = creditCostFor('cinematic_ai')
const KLING_CREDIT_COST = 50 // KINEO-PRICING-V3B-2026-07-10 — 45 → 50 cr (margin bump). Keep in sync with creditCostFor('cinematic_kling') in compose/status.
// Push #489/#491 — premium cinematic engines (Veo 3.1 Fast, Sora 2) via fal.
// KINEO-REBASE-2026-07-10 — 90/100 new credits = 180/200 old (same USD value).
const VEO_CREDIT_COST = creditCostFor('cinematic_veo') // KINEO-V6.1: lê a régua
const SORA_CREDIT_COST = 100 // Sora segue BLOQUEADO (KINEO-SORA-REMOVED) — valor só por consistência.
// KINEO-HOLLYWOOD-22-2026-07-10 — custo real: support saiu do Seedance
// ($0.052/s) e foi pro Kling 3 ($0.168/s) pela coerência visual. Típico 55s
// ≈ $8.90-10.20 (Hollywood 3.0 i2v).
// KINEO-REBASE-2026-07-10 — HOLLYWOOD = 150 créditos: preço FINAL aprovado 10/07
// (equivale a 300 old-credits ≈ $28 de crédito → margem saudável sobre ~$10 de fal).
const HOLLYWOOD_CREDIT_COST = 150

// KINEO-H3-2026-08-19 — MiniMax H3, 768p. Espelha creditCostFor('cinematic_h3')
// em lib/credits/engineCost.ts, que é onde o raciocínio dos 45 créditos está
// escrito por extenso. ⚠️ Mexeu num, mexe no outro — a divergência entre o
// preço que a rota cobra e o que o settle cobra é a classe de bug que o próprio
// engineCost.ts foi criado para matar.
const H3_CREDIT_COST = 45

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

// ═══ KINEO-353A-ESTADO-LOCAL-2026-08-26 ════════════════════════════════════
//
// ANTES: `let FAL_EXHAUSTED = false` vivia AQUI, no escopo do módulo, e era
// zerado no topo do POST. Em serverless o escopo de módulo é compartilhado
// entre invocações concorrentes na mesma instância: duas requisições ao mesmo
// tempo e o reset de uma apaga a flag da outra — ou a flag de uma vaza para a
// outra, trocando um 502 honesto por "estamos com alta demanda" e disparando
// o alarme de saldo pelo usuário errado. Risco provado em código, nunca
// observado em produção (e agora impossível por construção).
//
// AGORA: o estado nasce e morre dentro da requisição.
interface DispatchContext {
  balanceExhausted: boolean
  /** Disposicoes FINAIS, uma por cena planejada. Preenchido pelo dispatcher. */
  outcomes: SceneOutcome[]
  /** Historico de tentativas, index-alinhado com `outcomes`. */
  attempts: AttemptRecord[][]
  totalPosts: number
  planned: number
  /** Identidade e desfecho — preenchidos conforme a requisicao avanca. */
  userId: string | null
  generationId: string | null
  claimId: string | null
  billingReference: string | null
  engine: string | null
  quality: string | null
  claimAction: string
  refundConfirmed: boolean | null
  /** Ja registrou? Impede evento duplicado se algum caminho chamar duas vezes. */
  registrado: boolean
}
function novoContextoDeDespacho(): DispatchContext {
  return {
    balanceExhausted: false, outcomes: [], attempts: [], totalPosts: 0, planned: 0,
    userId: null, generationId: null, claimId: null, billingReference: null,
    engine: null, quality: null, claimAction: 'unknown', refundConfirmed: null,
    registrado: false,
  }
}
// AsyncLocalStorage e a ferramenta certa aqui: da localidade de requisicao
// REAL sob concorrencia, sem trocar a assinatura de submitToFal (chamada em
// dezenas de lugares neste arquivo). Uma variavel "contexto atual" de modulo
// NAO resolveria — a requisicao B sobrescreveria o ponteiro da A.
const despacho = new AsyncLocalStorage<DispatchContext>()
/** Contexto da requisicao em curso. Fora de uma request, devolve um descartavel. */
function ctxDespacho(): DispatchContext {
  return despacho.getStore() ?? novoContextoDeDespacho()
}

/**
 * ═══ KINEO-353A.1 — PONTO ÚNICO DE FINALIZAÇÃO ═══════════════════════════
 *
 * O #353A gravava telemetria em TRÊS pontos escolhidos a dedo (dois FAILFAST
 * e o sucesso clássico). Ficaram de fora: sucesso Hollywood, salvage,
 * ambiguidade e erro genérico do catch externo, e todo return posterior ao
 * nascimento da claim. Pior: no sucesso clássico ele gravava 200/pending
 * ANTES de `publishCinematicResponse`, que pode devolver 402, 409 ou 503 e
 * pode terminar `settled` — ou seja, o banco registrava um desfecho que não
 * foi o desfecho.
 *
 * Agora existe UM finalizador, e ele recebe a Response REALMENTE devolvida.
 * `app_http_status` é o status final de verdade; `claim_action` é o estado
 * financeiro realmente alcançado (o corpo da requisição escreve no contexto
 * conforme avança).
 *
 * FAILURE-ISOLATED: telemetria é awaitada, mas nunca transforma uma resposta
 * válida do cliente em erro. Se o banco de analytics cair, o vídeo segue.
 */
async function finalizarDespacho(ctx: DispatchContext, res: Response): Promise<void> {
  if (ctx.registrado) return
  ctx.registrado = true
  try {
    const plano = {
      outcomes: ctx.outcomes,
      requestIds: [],
      models: [],
      attempts: ctx.attempts,
      totalPosts: ctx.totalPosts,
    }
    const resumo = resumirPlano(plano as never)
    await writeServerEvent({
      name: 'cinematic_dispatch_result',
      userId: ctx.userId ?? undefined,
      metadata: {
        app_http_status: res.status,
        claim_action: ctx.claimAction,
        refund_confirmed: ctx.refundConfirmed,
        generation_id: ctx.generationId,
        claim_id: ctx.claimId,
        billing_reference: ctx.billingReference,
        engine: ctx.engine,
        quality: ctx.quality,
        deploy_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
        planned: ctx.planned || resumo.planned,
        attempted: resumo.attempted,
        accepted: resumo.accepted,
        rejected: resumo.rejected,
        ambiguous: resumo.ambiguous,
        not_attempted: (ctx.planned || resumo.planned) - resumo.accepted - resumo.rejected - resumo.ambiguous,
        total_posts: resumo.total_posts,
        // Histogramas: nunca um "representante" pescado com find(), que
        // juntava reason_class de uma cena com status de outra.
        reason_histogram: resumo.reason_histogram,
        provider_status_histogram: resumo.provider_status_histogram,
        invariant_ok: invarianteFecha({ ...resumo, planned: ctx.planned || resumo.planned }),
        provider_spend_possible: providerSpendPossible(ctx.outcomes),
        balance_exhausted: ctx.balanceExhausted,
        scenes: ctx.outcomes.map(safeLogFields),
      },
    })
  } catch (e) {
    console.error('[cinematic] telemetria falhou (resposta do cliente preservada):',
      e instanceof Error ? e.name : 'unknown')
  }
}
// `looksExhausted` tratava QUALQUER 403 como saldo estourado. Um 403 de
// "modelo sem acesso" virava alarme de saldo para o fundador e "alta demanda"
// para o cliente — três mentiras numa resposta só. A classificação agora mora
// em lib/cinematic/sceneDisposition e exige a CLASSE saldo, não o status.
function looksExhausted(e: { status?: number; message?: string }): boolean {
  return isBalanceExhausted(e?.status ?? null, e?.message)
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
  // KINEO-UNIVERSAL-2026-08-25 — true quando o PLANNER decidiu que o filme é
  // deliberadamente VFX/CGI (robôs, criaturas, sci-fi): os termos anti-CGI
  // saem do negative_prompt, que senão lutaria contra o visual pedido.
  // ÚLTIMO parâmetro de propósito: os call sites posicionais existentes
  // (seed em 7º) continuam byte-idênticos.
  stylized?: boolean,
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
  // ═══ KINEO-H3-2026-08-19 — MINIMAX H3 ═══════════════════════════════════
  // Schema oficial fal: prompt (até 7.000 caracteres), duration 5-15 (inteiro),
  // resolution 480P|768P|2K|4K, aspect_ratio. O caminho ancorado (i2v) recebe
  // image_url e herda a proporção da imagem, então não manda aspect_ratio.
  //
  // ⚠️ O ÁUDIO NATIVO ENTRA MUDO, E ISSO É DELIBERADO. O H3 gera diálogo,
  // trilha e foley próprios — e o Contrato Hollywood C1 diz que a narração é a
  // do usuário, palavra por palavra. Deixar o modelo falar por cima quebraria
  // o contrato mais importante que temos, e do jeito pior: o cliente ouviria
  // uma voz que ele não escreveu dizendo algo que ele não pediu.
  // A trilha dele como AMBIÊNCIA sob a nossa narração é ganho real e fica para
  // a segunda rodada — depois de medir, não junto com a estreia do motor.
  // ═══ KINEO-OMNI-2026-08-25 — GEMINI OMNI FLASH i2v ════════════════════════
  // A AUSÊNCIA deste ramo foi a causa do primeiro render reprovado (25/08,
  // 12:42Z): sem ramo, o modelo caía no builder default e o payload ia SEM
  // image_url → 422 "Field required" em 8 de 8 cenas, $0 gasto (FAILFAST
  // estornou os 150). Schema oficial (fal.ai/models/google/gemini-omni-flash/
  // image-to-video/api, lido 25/08): prompt* + image_url* obrigatórios;
  // aspect_ratio enum 16:9|9:16 com DEFAULT 16:9 — ao contrário do Kling, NÃO
  // herda a proporção da âncora, então o 9:16 vai EXPLÍCITO ou o filme sai
  // deitado; duration INTEIRO 3-10 (o teto 10 também governa o planner via
  // SCENE_CAP/DIALOGUE_CAP). Sem generate_audio no schema: o áudio nativo vem
  // sempre — o mute V1 vive no compose (muteClipAudio), não aqui.
  if (model === OMNI_I2V_MODEL) {
    return {
      image_url: imageUrl,
      prompt,
      aspect_ratio: '9:16',
      duration: Math.max(3, Math.min(10, Math.round(typeof seconds === 'number' && seconds > 0 ? seconds : 8))),
    }
  }
  if (model === H3_I2V_MODEL) {
    return {
      image_url: imageUrl,
      prompt,
      duration: Math.max(5, Math.min(15, Math.round(typeof seconds === 'number' && seconds > 0 ? seconds : 10))),
      resolution: H3_RESOLUTION,
      generate_audio: false,
    }
  }
  if (model === H3_MODELS.dialogue) {
    return {
      prompt,
      duration: Math.max(5, Math.min(15, Math.round(typeof seconds === 'number' && seconds > 0 ? seconds : 10))),
      resolution: H3_RESOLUTION,
      aspect_ratio: '9:16',
      generate_audio: false,
    }
  }
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
  // KINEO-UNIVERSAL-2026-08-25 — negativos anti-CGI viram condicionais.
  const antiCgi = stylized ? '' : 'cartoon, anime, illustration, 3d render, '
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
      negative_prompt: antiCgi + 'blur, distort, low quality, watermark, text, logo, caption, chinese text, foreign text, on-screen text, readable signs, subtitles, captions, phone screen with text, rotated frame, sideways composition, vertical horizon, tilted horizon, soft focus, out of focus',
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
        negative_prompt: antiCgi + 'blur, distort, low quality, watermark, text, logo, caption, chinese text, foreign text, on-screen text, readable signs, subtitles, captions, phone screen with text, rotated frame, sideways composition, vertical horizon, tilted horizon, soft focus, out of focus',
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
  // Seedance (default).
  // ⚠️ KINEO-SEEDANCE-720-MARGEM-2026-08-20 — 1080p → 720p, e esta é a reversão
  // consciente do KINEO-1080-GERAL-2026-08-17. Aquele commit já avisava que o
  // custo dobrava e que "o pricing novo reequilibra"; o reequilíbrio nunca veio
  // — e a V6 (19/08) ainda BAIXOU o preço. Resultado medido hoje na sessão de
  // margem: o motor MAIS USADO da casa rodava a +5% de margem, praticamente no
  // zero, e cada trial de sucesso nos custava mais dinheiro.
  //
  // A CONTA, pela fórmula pública do fal (tokens = w×h×fps×s/1024, $1,20/M sem
  // áudio — conferida no schema oficial hoje, não estimada):
  //   1080×1920: cena de 8s = $0,467 → vídeo de 6 cenas = $2,80 → margem  +5%
  //    720×1280: cena de 8s = $0,207 → vídeo de 6 cenas = $1,24 → margem +52%
  //
  // POR QUE ISSO NÃO É REBAIXAR O PRODUTO:
  //   1. O ARQUIVO ENTREGUE CONTINUA 1080×1920 — o Creatomate monta no perfil
  //      de saída (lib/renderProfile), que não muda. O que muda é a resolução
  //      da FONTE de cada cena.
  //   2. O destino é TikTok/Shorts, que recomprime tudo para perto de 720p. A
  //      gente estava pagando 2,25× por pixels que a plataforma joga fora.
  //   3. O caminho para nitidez de verdade agora é PRODUTO, não custo
  //      escondido: o ✨HD Enhance (Topaz Proteus, 10cr) reconstrói detalhe em
  //      vez de só ter mais pixels — entrega mais que 1080p nativo e é
  //      receita, não despesa.
  //
  // Reversível sem deploy se o fundador não gostar do resultado visual:
  // KINEO_SEEDANCE_RESOLUTION=1080p na Vercel.
  return {
    prompt,
    aspect_ratio: '9:16',
    resolution: process.env.KINEO_SEEDANCE_RESOLUTION || '720p',
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
// KINEO-GATE-FALSE-POSITIVE-2026-08-20 — mesma correção do router: a flag `i`
// anulava o [A-Z] da heurística título+Nome e "the captain radioed" virava
// pessoa real (bloqueou o render do fundador). Título+Nome agora é
// case-sensitive; só a lista de nomes explícitos mantém o `i`.
const NAMED_TITLE_RE =
  /\b(?:[Ee]mperor|[Gg]eneral|[Mm]arshal|[Kk]ing|[Qq]ueen|[Tt]sar|[Cc]zar|[Pp]resident|[Cc]ommander|[Cc]olonel|[Aa]dmiral|[Cc]aptain|[Dd]uke|[Ll]ord|[Ss]ir|[Kk]aiser|[Pp]haraoh)\s+[A-Z][\w'-]+/g
const NAMED_FIGURE_RE =
  /\b(?:napoleon(?:\s+bonaparte)?|bonaparte|wellington|hitler|stalin|churchill|caesar|cleopatra|genghis\s+khan|alexander\s+the\s+great|abraham\s+lincoln|george\s+washington|joan\s+of\s+arc)\b/gi

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
    .replace(NAMED_TITLE_RE, 'a distant silhouetted figure seen from behind')
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
async function submitToFal(prompt: string, model: string = SEEDANCE_MODEL, hd: boolean = true, hollywood: boolean = false, seconds?: number, imageUrl?: string, seed?: number, stylized?: boolean): Promise<string | null> {
  try {
    const id = await submitFalQueueOnce(
      model,
      buildFalInput(model, prompt, hd, hollywood, seconds, imageUrl, seed, stylized),
    )
    // KINEO-353A.1 — NAO empurra mais nada no vetor de cenas aqui.
    // O #353A fazia `outcomes.push(cenaAceita(outcomes.length, ...))`, e
    // `outcomes.length` e ORDEM DE CONCLUSAO, nao indice de cena: num pool de
    // 3, a cena 5 virava "cena 0". Alem disso submitToFal e usada por stills,
    // Hollywood e salvage — cada push criava uma CENA FANTASMA no vetor do
    // plano classico. Quem registra cena agora e o dispatcher, com o indice
    // real vindo do chamador.
    return id
  } catch (err) {
    // #366 — surface the FULL fal error (status + body + message) so a model /
    // param / access issue is diagnosable straight from Vercel logs (the bare
    // object stringified to "[object]" before, hiding the real cause).
    const e = err as { status?: number; body?: unknown; message?: string; name?: string }
    const status = err instanceof FalQueueSubmitError ? err.status ?? undefined : e?.status
    // KINEO-353A — REDACAO. O #366 imprimia `body` (o corpo cru da Fal) para
    // diagnosticar de dentro do log da Vercel. Isso some: corpo de fornecedor
    // pode conter prompt, URL de midia e eco de header. O que fica e a
    // CLASSIFICACAO, que e o que a gente realmente precisava ler — e que agora
    // tambem e persistida, em vez de morrer no console em 1 hora.
    const classe = classifyProviderFailure({
      status: status ?? null,
      ambiguous: err instanceof FalQueueSubmitError ? err.ambiguous : true,
      message: e?.message,
    })
    console.error('[cinematic] fal submit falhou:', JSON.stringify({
      model,
      provider_http_status: status ?? null,
      disposition: classe.disposition,
      reason_class: classe.reason_class,
      retry_safety: classe.retry_safety,
    }))
    // KINEO-FAL-ALARM-2026-07-06 — flag an exhausted-balance failure so the POST
    // handler alerts the founder + soft-queues instead of hard-erroring.
    // KINEO-353A — agora exige a CLASSE saldo; 403 de acesso nao entra mais aqui.
    if (looksExhausted({ status, message: e?.message })) ctxDespacho().balanceExhausted = true
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
  // KINEO-353A — TODO o corpo roda dentro de um contexto proprio. Duas
  // requisicoes simultaneas na mesma instancia nao se enxergam mais.
  return despacho.run(novoContextoDeDespacho(), async () => {
    const ctx = ctxDespacho()
    const res = await manipularPost(req)
    // A Response REAL — inclusive 402/409/503 vindos do publish/settlement.
    await finalizarDespacho(ctx, res)
    return res
  })
}

async function manipularPost(req: NextRequest) {
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
    // KINEO-VERBATIM-SEM-MARCADOR-2026-08-24: `script_mode` ('verbatim'|'ai')
    // e `dry_run` (validador de $0, só contas do fundador) entram no contrato.
    let body: { generationId?: string; prompt?: string; duration?: number; engine?: string; language?: string; vertical?: string; characterId?: string; script_mode?: string; dry_run?: boolean; brollScenes?: Array<{ sceneNumber?: number; brollPrompt?: string; shotType?: string; negativePrompt?: string; userFootageUrl?: string }>; globalStyle?: { mood?: string; lighting?: string; cameraStyle?: string } }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    // KINEO-FACELESS-2026-08-25 — tag [faceless] no script = filme SEM avatar:
    // desliga a conversão HOOK/PAYOFF-on-camera no planner. A tag é REMOVIDA
    // aqui, antes de tudo (verbatim, fingerprint, narração) — nunca é falada.
    const promptRaw = (body.prompt ?? '').trim()
    const tagFacelessPresente = TAG_FACELESS.test(promptRaw)
    const prompt = promptRaw.replace(/\[faceless\]/gi, '').trim()
    // ═══ DIRETOR DE FORMATO — 2026-08-27 ═════════════════════════════════
    // ANTES: `facelessRequested` so era true com a tag `[faceless]` escrita a
    // mao. Nenhum cliente conhece essa tag, entao o padrao de fabrica era
    // APRESENTADOR PARA TODO MUNDO — e o prompt de sistema do planner ainda
    // reforcava (`hostFits=true for documentary/mysteries/history/facts`),
    // com default true no parse. Resultado medido no render 37c8d832: um
    // roteiro de misterio/noticia sobre naufragios da Segunda Guerra ganhou
    // host falando na lente e rostos humanos em cenas de apoio, sem que o
    // roteiro pedisse nada disso.
    // AGORA: o formato e inferido do CONTEUDO. Documentario, misterio,
    // ciencia e noticia nascem faceless; apresentador so por pedido
    // explicito. A tag antiga continua valendo para quem ja a usa.
    const formatoVisual = decidirFormato(prompt, tagFacelessPresente)
    const facelessRequested = !permiteApresentador(formatoVisual.modo)
    console.log(`[formato] visual_mode=${formatoVisual.modo} — ${formatoVisual.motivo}`)
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
    // KINEO-H3-2026-08-19 — o H3 é uma FAMÍLIA do caminho Hollywood, não um
    // caminho novo: `hollywoodPath` é o que liga o planner, o Contrato de
    // duração, a narração verbatim e a variedade determinística. `family` só
    // decide QUAL modelo cada cena chama.
    const wantsH3 = body.engine === 'h3'
    // KINEO-OMNI-2026-08-25 — Gemini Omni Flash: #1 do ranking de agosto,
    // mesma estrada do Hollywood/H3 (familia nova, nunca caminho novo).
    const wantsOmni = body.engine === 'omni'
    const hollywoodPath = wantsHollywood || wantsH3 || wantsOmni
    const family: CinematicFamily = wantsH3 ? 'h3' : wantsOmni ? 'omni' : 'hollywood'
    // ═══ KINEO-OMNI-TETO10-2026-08-25 — LIÇÃO DO PRIMEIRO RENDER (422 em 8/8) ═══
    // Schema oficial fal do google/gemini-omni-flash/image-to-video: duration é
    // INTEIRO 3-10 (não 15 como Kling 3, não 12 como o teto da casa). Cena
    // planejada de 12s viraria clipe de 10s = 2s de apagão POR CENA — o
    // fantasma do #310 voltando pela porta do motor novo. O teto de cena vira
    // PROPRIEDADE DA FAMÍLIA e todo dimensionamento do C2 usa estas constantes
    // (nunca um 12/15 literal novo): omni=10, resto mantém 12 (apoio) e 15
    // (fala nativa). Fonte: fal.ai/models/google/gemini-omni-flash/
    // image-to-video/api, lido em 25/08 — "Supports 3-10 second durations".
    const SCENE_CAP = family === 'omni' ? 10 : 12
    const DIALOGUE_CAP = family === 'omni' ? 10 : 15

    // KINEO-HOLLYWOOD-2026-07-09 — anti-deepfake gate. Hollywood renders REAL
    // fictional people with native voice, so a prompt naming a real person is
    // blocked outright (cheap check, before any credit/plan work).
    if (hollywoodPath && mentionsRealPerson(prompt)) {
      // KINEO-FIX-IT-FOR-ME-2026-08-24 (pacote noturno 2, UI#1) — a trava
      // devolvia o problema pro cliente ("descreva uma pessoa fictícia") sem
      // dizer qual nome travou nem como consertar. O fundador bateu nela hoje
      // com o Cyclops (George Worley/Wilson) e precisou de MIM para reescrever
      // — cliente do trial não tem um eu e desiste. A lib JÁ TINHA o
      // sanitizador (sanitizeRealPeople); agora a resposta carrega a versão
      // corrigida e o client oferece "Fix it for me" de 1 clique.
      return NextResponse.json(
        {
          error: "Hollywood Mode can't depict real people. Describe a fictional person instead.",
          reason: 'real_person_blocked',
          sanitized_prompt: sanitizeRealPeople(prompt),
        },
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

    // ═══ KINEO-TETO-2026-08-20 — O TRIAL PASSA A MOSTRAR O TETO ═══════════
    // Inversão do modelo, decidida com o fundador depois do estudo dos cinco
    // concorrentes. O padrão vencedor da categoria (OpusClip) NÃO raciona o
    // produto: entrega o vídeo pronto e cobra pela POSSE dele — o clipe grátis
    // deixa de ser exportável em 3 dias. Quem paga, paga para não perder uma
    // coisa que já é sua; é aversão à perda, não expectativa de ganho.
    //
    // O QUE ESTÁVAMOS FAZENDO ERA O CONTRÁRIO, e contra nós mesmos: o trial só
    // abria o Kineo 1 e o Seedance, ou seja, a pessoa julgava a Kineo pelo
    // PISO do catálogo e concluía que somos medianos. Só que o nosso
    // diferencial mora no TETO — Kling 3 com voz nativa e lip sync é
    // exatamente o que nenhum desses concorrentes tem (eles cortam vídeo
    // alheio; nós fazemos filme do zero).
    //
    // Agora o trial abre TUDO. O que segura a conversão não é mais o bloqueio
    // do motor, é a MARCA D'ÁGUA + o download limpo (ver app/api/compose:
    // `watermark`). A pessoa faz o filme cinematográfico dela, assiste, se
    // encanta — e o botão de baixar pede o plano.
    //
    // O custo disso é real e foi aceito de olhos abertos: um Kling 3 custa
    // ~$11,85 de fornecedor e o trial de 80 créditos NÃO alcança os 150 dele
    // (por isso o gate de crédito abaixo continua sendo o freio de verdade).
    // Quem alcança é o H3 (45cr) e o Veo (90cr) — os dois já são teto o
    // suficiente para vender, e cabem no orçamento do trial.
    //
    // Marca d'água ligada para trial: KINEO-TETO no compose. Se um dia isso
    // for revertido, REVERTER OS DOIS JUNTOS — liberar motor caro sem marca
    // d'água é dar o produto inteiro de graça.
    const TRIAL_UNLOCKS_PREMIUM = true
    if ((wantsKling || wantsVeo || hollywoodPath) && !isPaidUser && !(TRIAL_UNLOCKS_PREMIUM && trialActive)) {
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
    // Kling 50, Veo 90, Sora 100 (blocked), Seedance 20 — valores de REFERÊNCIA
    // para 60s. A cobrança real escala com a duração (abaixo).
    const baseCost = wantsH3 ? H3_CREDIT_COST : wantsHollywood ? HOLLYWOOD_CREDIT_COST : wantsKling ? KLING_CREDIT_COST : wantsVeo ? VEO_CREDIT_COST : wantsSora ? SORA_CREDIT_COST : SEEDANCE_CREDIT_COST
    // ═══ KINEO-DURACAO-2026-08-20 — O SERVIDOR COBRA O QUE A TELA MOSTROU ═══
    // O /studio calcula o "Estimated cost" com creditCostForDuration; se esta
    // linha usasse outro número, a pessoa veria 30 e seria debitada 20 (ou o
    // contrário) — cobrança-surpresa, a mesma classe de erro que passamos o dia
    // caçando. Uma função, dois lados.
    // O custo do fornecedor é linear nos segundos gerados: 35s ≈ 60% de um 60s,
    // 90s ≈ 150%. Sem esta escala, o tier de 90s (que o dado do TikTok mostra
    // render 4× mais views) viraria o mais barato por segundo e derreteria a
    // margem justamente no formato que todo mundo passaria a escolher.
    const costQuality: Quality = wantsH3
      ? 'cinematic_h3'
      : wantsOmni
        ? 'cinematic_omni'
      : wantsHollywood
        ? 'cinematic_hollywood'
        : wantsKling
          ? 'cinematic_kling'
          : wantsVeo
            ? 'cinematic_veo'
            : 'cinematic_ai'
    const cost = creditCostForDuration(costQuality, true, duration)
    void baseCost // mantido para leitura: é o valor de referência a 60s

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
        engine: wantsH3 ? 'h3' : wantsHollywood ? 'hollywood' : wantsKling ? 'kling' : wantsVeo ? 'veo' : 'seedance',
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

    // KINEO-353A.1 — MOTOR REAL. O #353A gravava `engine: 'hollywood'` no
    // FAILFAST premium, o que apagava H3 e Omni: os tres viravam a mesma linha
    // no painel, e a pergunta "qual motor esta falhando?" ficava sem resposta.
    const claimQuality = wantsH3
      ? 'cinematic_h3'
      : wantsOmni
      ? 'cinematic_omni'
      : wantsHollywood
      ? 'cinematic_hollywood'
      : wantsKling
        ? 'cinematic_kling'
        : wantsVeo
          ? 'cinematic_veo'
          : 'cinematic_ai'
    const claimEngine = wantsH3
      ? 'h3'
      : wantsHollywood
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
    // KINEO-353A.1 — identidade no contexto assim que existe. O finalizador
    // unico le daqui, entao TODO caminho de saida (inclusive o catch externo)
    // sai identificado, e nao so os tres que eu tinha escolhido a dedo.
    {
      const c = ctxDespacho()
      c.userId = user.id
      c.generationId = generationId
      c.claimId = cinematicClaimId(user.id, generationId)
      c.billingReference = billingReference
    }
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
    // ═══ KINEO-VERBATIM-SEM-MARCADOR-2026-08-24 ═════════════════════════════
    // O Contrato C1 dizia "com script verbatim, o texto falado é o roteiro do
    // usuário" — mas a porta de entrada do contrato era `hasMarkers`: só
    // roteiro no formato da casa (HOOK/MICRO REWARD) contava como verbatim.
    // Quem clicava "Use my script as is" com PROSA LIMPA (o caso mais comum de
    // roteiro próprio) caía no caminho antigo: o GPT planejava as cenas E
    // escolhia o que falar — no render do fundador desta noite, usou 4 de 9
    // cenas e descartou justamente o clímax (Proteus/Nereus, a frase final, o
    // gancho do próximo episódio). 24s de filme mudo, 150cr, $7 de fal.
    // Agora o pedido explícito do usuário TAMBÉM liga o contrato: verbatim =
    // formato da casa OU botão apertado. `script_mode` chega do client (que
    // sempre soube — só não contava).
    const userSaysVerbatim = ((body.script_mode ?? '') as string).toLowerCase() === 'verbatim'
    const verbatim = (parsedScript.hasMarkers && parsedScript.segments.length > 0) || userSaysVerbatim

    // ═══ KINEO-NARRACAO-ENCHE-2026-08-22 — A TRAVA, E ELA VEM ANTES DO DÉBITO ══
    //
    // O caso que mandou construir isto: o fundador reprovou um Kling 3 de 70s
    // cujo roteiro tinha 402 caracteres (73 palavras ≈ 32s de fala). Medido
    // quadro a quadro: luminância NUNCA abaixo de 44 (não havia apagão de
    // imagem, nunca houve) e ~28s de déficit de narração. O nome "apagão"
    // atrasou o diagnóstico por duas rodadas.
    //
    // A poda de cenas mudas (KINEO-CENA-MUDA, mais abaixo) conserta o SINTOMA:
    // o filme sai íntegro, só que curto. Esta trava ataca a CAUSA — e ela tem
    // de vir aqui, ANTES de `generate-video-cinematic` debitar. Um filme
    // Hollywood custa 150 créditos; entregar 28 segundos mudos por esse preço,
    // e só descobrir 6 minutos depois, é o pior desfecho possível para os dois
    // lados. Recusar em 200ms com um número acionável é o melhor.
    //
    // ⚠️ SÓ VALE PARA O CAMINHO VERBATIM, e isso é deliberado: ali o texto é do
    // USUÁRIO e nós não podemos reescrevê-lo (Contrato C1), então a única saída
    // honesta é ele decidir — escrever mais, ou aceitar um vídeo mais curto. No
    // caminho automático quem escreve é o nosso gerador, e a correção certa lá
    // é ele produzir o tamanho certo, não recusar o pedido da pessoa.
    if (verbatim && parsedScript.narration) {
      const fit = narrationFit(parsedScript.narration, duration)
      if (!fit.ok) {
        // ═══ KINEO-GUARD-DEVOLVE-2026-08-25 — O GUARD COBRAVA E NÃO DEVOLVIA ═══
        // O comentário acima dizia "antes do débito", mas o claim+débito
        // migraram para ANTES deste ponto (linha ~1448) e a promessa
        // envelheceu virando prisão: pedrohscordeiro (trial de 25cr, 25/08
        // 14:03) escreveu roteiro de 25s, pediu 35s, levou o 422 educativo —
        // e ficou com 12cr PRESOS num claim pending eterno, que o painel
        // ainda mostrava como "RENDERING". Primeiro contato com o produto:
        // metade do trial confiscada por uma recusa didática. O release é o
        // mesmo caminho do dry-run/FAILFAST: estorna e libera na hora.
        await releaseBirthClaim('narration_too_short_no_charge')
        // KINEO-GUARD-VISIVEL-2026-08-25 (fundador: "isso precisa refletir pra
        // mim no adm") — o bloqueio educativo ganha um evento com NOME próprio,
        // porque o /admin/live só enxerga nomes: sem isto, o guard aparecia
        // como um FAILED genérico + RENDERING eterno, ilegível. Fire-and-forget.
        try {
          await cinematicAdmin.from('events').insert({
            user_id: user.id,
            name: 'narration_guard_blocked',
            path: '/api/generate-video-cinematic',
            metadata: { speech_seconds: Math.round(fit.speech), target_seconds: duration, missing_words: fit.missingWords, refunded: true },
          })
        } catch { /* telemetria nunca derruba a resposta */ }
        console.warn(
          `[narracao] RECUSADO (claim liberado, crédito devolvido): ${Math.round(fit.speech)}s de fala para ` +
          `alvo de ${duration}s (cobertura ${(fit.coverage * 100).toFixed(0)}%, ` +
          `mínimo ${(MIN_COVERAGE * 100).toFixed(0)}%).`,
        )
        return NextResponse.json(
          {
            error: narrationTooShortMessage(fit),
            narrationTooShort: true,
            // A UI usa estes para oferecer o botão "usar Xs" sem a pessoa ter
            // de fazer conta nenhuma.
            speechSeconds: Math.round(fit.speech),
            suggestedDuration: Math.max(15, Math.round(fit.speech / 5) * 5),
            missingWords: fit.missingWords,
          },
          { status: 422 },
        )
      }
    }

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
      // Texto livre não tem [Pexels: ...], portanto o parser não produz
      // segmentos. O botão "Use my script as is" ainda precisa gerar cenas:
      // dividimos somente a cópia visual em beats; `voiceover_script` continua
      // sendo a narração integral e verbatim do autor.
      const picked = resolveVerbatimSegments(parsedScript, clipCount)
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
    if (verbatim && planScenes.length === 0 && !hollywoodPath) {
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
    if (hollywoodPath) {
      // KINEO-VERBATIM-SEM-MARCADOR-2026-08-24 — no verbatim sem marcadores,
      // parsedScript.narration vem vazio (não há segmentos para extrair); o
      // roteiro é o PROMPT INTEIRO. Sem este fallback, o verbatim recém-ligado
      // cairia no join dos voiceovers do GPT — o exato texto que o contrato
      // proíbe de virar trilho.
      const hollywoodVoiceover = verbatim
        ? (parsedScript.narration && parsedScript.narration.trim().length > 0
            ? parsedScript.narration
            : prompt.trim())
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
      // ═══ KINEO-SALVAGE-DRYRUN-2026-08-25 — DRY-RUN NUNCA ENTRA NO SALVAGE ═══
      // O caso de 12:56Z: dois dry-runs do MESMO roteiro casaram o fingerprint
      // do render 422 de 12:41, o salvage devolveu as cenas MORTAS antes do
      // gate de dry-run rodar, e cada chamada settlou + debitou 150 (300 no
      // total, estornados à mão via grant-credits). Dry-run é bancada de
      // estudo: SEMPRE plano fresco, NUNCA toca submissão guardada, NUNCA
      // despacha — por isso ele pula o salvage inteiro.
      if (salvageDb && body.dry_run !== true) {
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
                    // KINEO-SALVAGE-CADAVER-2026-08-25 — 'COMPLETED' NÃO basta:
                    // clipe que morreu em 422 (o caso Omni de 12:41, image_url
                    // faltando) também reporta COMPLETED — completou EM ERRO.
                    // O salvage revendeu 7 cadáveres como cenas prontas. Agora
                    // COMPLETED só conta se o RESULT devolver um vídeo de
                    // verdade; result que lança (o 422 relança aqui) = cena
                    // morta = re-submete abaixo com o prompt guardado.
                    if (st.status === 'IN_PROGRESS' || st.status === 'IN_QUEUE') {
                      keep = rid
                      reused++
                    } else if (st.status === 'COMPLETED') {
                      const res = (await fal.queue.result(storedModels[i], { requestId: rid })) as { data?: { video?: { url?: string } } }
                      const vurl = res?.data?.video?.url
                      if (typeof vurl === 'string' && vurl.startsWith('http')) {
                        keep = rid
                        reused++
                      }
                    }
                  } catch { /* status/result irrecuperável → re-submete abaixo */ }
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
            // KINEO-353A.1 — sem mensagem livre: pode ser FalQueueSubmitError,
            // cuja `message` carrega ate 300 chars do corpo do fornecedor.
            console.warn('[cinematic] salvage lookup falhou (caminho normal):',
              e instanceof Error ? e.name : 'unknown')
          }
        }
      }

      // KINEO-TIKTOK-61-2026-08-17 — regra de negocio do fundador: "se a
      // gente vende 60 segundos, tem que entregar pelo menos 61" (Creator
      // Rewards do TikTok so paga acima de 1:00). O plano mira ALEM do
      // pedido (60 → 68) porque a entrega encolhe ~10% (fala real menor que
      // o planejado + gapfix). Aterrissagem esperada: 61-65s.
      // ═══ KINEO-ALVO-2026-08-20 — O ALVO PASSA A VALER ATÉ 90s ═══════════
      // O clamp era `min(60)`: pedir 90 entregava 60. Fechava o tier de maior
      // alcance antes de ele existir. Medido em 6M de vídeos do TikTok
      // (Socialinsider, jan-jun/2026): 60-90s rende 7.200 views medianas contra
      // 2.200 de 30-60s — e 90-120s rende 9.620, com engajamento SUBINDO.
      //
      // O OVERSHOOT NÃO É GORDURA, É O CONTRATO. A narração é o trilho mestre
      // (Contrato C1: o texto do usuário é lido verbatim), e fala real quase
      // nunca bate a estimativa de 2,3 palavras/segundo. Se o alvo fosse o
      // número exato, o vídeo fecharia ABAIXO dele — que foi exatamente o que
      // aconteceu com o Seedance: pedia 60, entregava 49 de média.
      // Então miramos ACIMA e deixamos a narração puxar para baixo:
      //   35s → 39  (margem de 4s; não há piso de monetização a defender aqui)
      //   60s → 68  (o Rewards do TikTok exige >60 e descarta view com <5s
      //              assistidos; 60,5s é o pior lugar possível de se estar —
      //              qualquer diferença de encoding derruba a elegibilidade.
      //              O piso operacional real é 63-65s, e 68 dá folga a isso)
      //   90s → 98  (mesma proporção de folga)
      const hollywoodTarget = (() => {
        const req = Math.max(30, Math.min(90, Math.round(duration || 60)))
        if (req >= 85) return req + 8   // tier 90s
        if (req >= 55) return req + 8   // tier 60s — piso do TikTok Rewards
        return req + 4                  // tier curto
      })()

      let plan: HollywoodPlan
      try {
        plan = await planHollywoodScenes({
          faceless: facelessRequested,
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
          faceless: facelessRequested,
              idea: prompt,
              voiceoverScript: hollywoodVoiceover || undefined,
              scenes: scenes.map((sc) => ({ voiceover: sc.voiceover, description: sc.aiPrompt || sc.description })),
              durationSeconds: hollywoodTarget,
              language: hollywoodLanguage,
              shortRetryFeedback: `scenes ${dup[0]} and ${dup[1]} show the SAME visual subject. Every non-dialogue scene must depict a DIFFERENT primary subject from the story (different event, place, era or moment) — and the environmentSheet must appear ONLY in scenes set in the narrator's own location.`,
            })
            if (!dupPair(replanned)) plan = replanned
            else {
              // KINEO-CONTRATO-C3-2026-08-18 — dentes: "keeping best effort"
              // entregou o par repetido do render ef2d09bf. Replan nao
              // divergiu → divergencia DETERMINISTICA em codigo: a 2a cena do
              // par ganha um eixo visual novo (angulo/hora/escala), perde o
              // environmentSheet (a cola que repetia o mesmo mar) e mantem so
              // a cabeca do prompt original + styleSheet.
              const AXES = [
                'extreme aerial view at night, tiny lights far below',
                'macro close-up of one telling detail, shallow focus, texture filling the frame',
                'vast wide establishing shot at dawn, tiny human silhouette for scale',
                'slow-motion detail shot, dust and particles drifting through a shaft of light',
              ]
              let axed = 0
              let d: [number, number] | null = null
              while ((d = dupPair(plan)) !== null && axed < 4) {
                const sc = plan.scenes[d[1] - 1]
                // KINEO-VARIEDADE-SEM-AMPUTAR-2026-08-27 — o `.slice(0, 14)`
                // que estava aqui cortava o prompt por CONTAGEM DE PALAVRAS.
                // No render 37c8d832 a palavra 14 era `Mouth`: a proibicao
                // "Mouth closed, not speaking, no lip movement." foi decapitada
                // e o motor entregou um rosto submerso fazendo bolhas numa cena
                // sobre um submarino alemao. E os 4 sufixos de protecao
                // (boca fechada, sem texto, nitidez, horizonte estavel) iam
                // junto para o lixo. Agora o eixo e PREFIXADO e nada e amputado.
                sc.prompt = aplicarEixoVisual(sc.prompt, plan.environmentSheet, AXES[axed % AXES.length])
                console.warn(`[contrato] C3 variety enforced in code: scene ${d[1]} re-axed`)
                axed++
              }
            }
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
          faceless: facelessRequested,
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
            : Math.min(SCENE_CAP, Math.max(5, Math.round(wordsOf(sc) / 2.3) + 1)) // KINEO-OMNI-TETO10
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
          faceless: facelessRequested,
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

      // ═══ KINEO-CONTRATO-2026-08-18 — Cláusulas 1+2 (docs/CONTRATO-HOLLYWOOD.md)
      // Render ef2d09bf provou: o planner condensou 160 palavras em 52 e
      // submeteu 51s de 68s. C1: com script verbatim, o TEXTO FALADO do filme
      // é o roteiro do usuário, redistribuído cena a cena EM CÓDIGO — o GPT
      // dirige a câmera, nunca mais escreve/condensa/inventa fala. O relógio
      // vira o roteiro (~2.3 palavras/s), então duração fecha por aritmética.
      if (verbatim && hollywoodVoiceover && hollywoodVoiceover.trim().length > 0) {
        const wordsIn = (t: string) => t.trim().split(/\s+/).filter(Boolean).length
        const totalWords = wordsIn(hollywoodVoiceover)
        const sentences =
          hollywoodVoiceover
            .replace(/\s+/g, ' ')
            .match(/[^.!?…]+[.!?…]+["”']?|[^.!?…]+$/g)
            ?.map((s) => s.trim())
            .filter(Boolean) ?? []
        if (totalWords >= 40 && sentences.length >= 3) {
          type PlanScene = (typeof plan.scenes)[number]
          // KINEO-CENA-MUDA-2026-08-22 — índices das cenas que ficaram SEM
          // texto porque o roteiro acabou antes. Elas são PODADAS logo abaixo,
          // depois do laço: remover no meio da iteração embaralharia os
          // índices e o `plan.scenes[i]` passaria a apontar para outra cena.
          const cenasSemFala = new Set<number>()
          const capWords = (sc: PlanScene) =>
            sc.type === 'dialogue' ? (DIALOGUE_CAP >= 15 ? 32 : 22) : sc.type === 'cinematic' ? 16 : (SCENE_CAP >= 12 ? 26 : 20) // KINEO-CONTRATO-FIT-2026-08-18 + KINEO-OMNI-TETO10: fala cabe SEMPRE no teto do clipe da FAMILIA (26w=11.3s<12s; omni: 22w=9.6s<10s, 20w=8.7s<10s)
          const planSecs = plan.scenes.reduce((a, sc) => a + (sc.seconds || 5), 0) || 1
          let si = 0
          for (let i = 0; i < plan.scenes.length; i++) {
            const sc = plan.scenes[i]
            const share = Math.max(6, Math.round(totalWords * ((sc.seconds || 5) / planSecs)))
            const chunk: string[] = []
            let w = 0
            while (si < sentences.length) {
              const nw = wordsIn(sentences[si])
              if (chunk.length > 0 && (w + nw > capWords(sc) || w >= share)) break
              chunk.push(sentences[si])
              w += nw
              si++
            }
            const text = chunk.join(' ').trim()
            // ═══ KINEO-CENA-MUDA-2026-08-22 ═══════════════════════════════
            // ESTA LINHA ERA `if (!text) continue` E É A ORIGEM DO "APAGÃO".
            //
            // Quando o roteiro acaba antes das cenas (`si` chegou ao fim das
            // frases), o `continue` PULAVA a cena — e a cena continuava no
            // plano, com a duração que o GPT pediu e com o voiceover que o
            // GPT tinha inventado, ou com nenhum. Nos dois casos o resultado
            // é o mesmo na tela: imagem rodando sem voz.
            //
            // Medido hoje no render que o fundador reprovou (Solopreneur v2,
            // Kling 3, 70s, 402 caracteres de roteiro = 73 palavras):
            //   silêncio real >1s: 0,2→2,8s · 9,9→12,3s · 60,1→63,6s ·
            //   67,2→70,0s ≈ 11s de buracos, e ~28s de déficit total de fala.
            //   Luminância nunca abaixo de 44 — NÃO havia apagão de imagem,
            //   nunca houve. O nome "apagão" atrasou o diagnóstico em duas
            //   rodadas, inclusive a minha de 20/08, que consertou o rabo mudo
            //   do FINAL (KINEO-TAIL) e não tocou no buraco do MEIO.
            //
            // E o defeito é PIOR do que só silêncio: uma cena pulada aqui
            // mantém o `voiceover` que o GPT escreveu, o que fura o Contrato
            // C1 (o GPT nunca escreve fala) sem que ninguém perceba — a
            // narração deixa de ser a do usuário exatamente nas cenas em que
            // o roteiro dele acabou.
            //
            // O CONSERTO: cena sem texto é MARCADA para poda, não pulada.
            // Filme mais curto e íntegro vale mais que filme no tamanho
            // pedido com um terço de imagem muda — e a poda acontece abaixo,
            // ANTES do C2 medir a duração, para que o C2 trabalhe sobre o
            // plano real em vez de contar segundos que não têm fala.
            if (!text) {
              cenasSemFala.add(i)
              continue
            }
            if (sc.type === 'dialogue') {
              const spoken = text.replace(/"/g, "'")
              sc.dialogueLine = spoken
              sc.prompt = /"[^"]{6,}"/.test(sc.prompt)
                ? sc.prompt.replace(/"[^"]{6,}"/, `"${spoken}"`)
                : `${sc.prompt} The person looks straight into the lens and says: "${spoken}"`
              sc.voiceover = undefined
              sc.needsNarration = false
              sc.seconds = Math.max(3, Math.min(DIALOGUE_CAP, Math.round(w / 2.3) + 1)) // KINEO-OMNI-TETO10
            } else {
              sc.voiceover = text
              sc.needsNarration = true
              const cap = sc.type === 'cinematic' ? 8 : SCENE_CAP // Veo entrega no max 8s; KINEO-OMNI-TETO10
              sc.seconds = Math.max(4, Math.min(cap, Math.round(w / 2.3) + 1))
            }
          }
          // ═══ KINEO-CENA-MUDA-2026-08-22 — A PODA ═══════════════════════
          // Cenas que não receberam uma única palavra do roteiro saem do
          // plano. Só rodam se AINDA houver frases sobrando (`si`), porque
          // nesse caso o buraco foi de distribuição, não de falta de texto, e
          // o bloco de sobra logo abaixo vai preenchê-las.
          //
          // POR QUE PODAR EM VEZ DE INVENTAR FALA: inventar quebra o Contrato
          // C1 (a narração é do usuário, sempre). Deixar mudo é o defeito que
          // o fundador acabou de reprovar. Entre um filme mais CURTO e um
          // filme do tamanho pedido com um terço de imagem sem voz, o curto
          // ganha — e é o único dos três caminhos que não mente para ninguém.
          //
          // ⚠️ ISTO PODE DERRUBAR O FILME ABAIXO DO PISO DE 60s do TikTok
          // Creator Rewards, e isso é ACEITO de propósito: um vídeo de 40s
          // inteiro vale mais que um de 65s com 25s mudos, e o C2 logo abaixo
          // ainda tenta recompor a duração com cenas que TENHAM fala. A defesa
          // de verdade contra o filme curto não é aqui — é impedir que um
          // roteiro curto demais entre no pipeline (ver lib/narrationFit.ts).
          if (cenasSemFala.size > 0 && si >= sentences.length) {
            const antes = plan.scenes.length
            const segundosPodados = [...cenasSemFala]
              .reduce((a, i) => a + (plan.scenes[i]?.seconds || 0), 0)
            plan.scenes = plan.scenes.filter((_, i) => !cenasSemFala.has(i))
            plan.scenes.forEach((sc, i) => { sc.index = i + 1 })
            console.warn(
              `[contrato] C1 PODA: ${antes - plan.scenes.length} cena(s) sem fala removida(s) ` +
              `(${segundosPodados}s que sairiam MUDOS). Roteiro de ${totalWords} palavras ` +
              `≈ ${Math.round(totalWords / 2.3)}s de voz para um alvo de ${hollywoodTarget}s.`,
            )
          }

          // Sobra de roteiro (história maior que o plano): vira cenas de apoio
          // novas — o conteúdo do fundador NUNCA é dropado.
          while (si < sentences.length && plan.scenes.length < 9) {
            const chunk: string[] = []
            let w = 0
            while (si < sentences.length && (chunk.length === 0 || w + wordsIn(sentences[si]) <= 26)) {
              chunk.push(sentences[si])
              w += wordsIn(sentences[si])
              si++
            }
            plan.scenes.push({
              index: plan.scenes.length + 1,
              type: 'support',
              beat: 'PAYOFF',
              seconds: Math.max(4, Math.min(SCENE_CAP, Math.round(w / 2.3) + 1)), // KINEO-OMNI-TETO10
              prompt: `slow cinematic insert continuing the story, ${plan.environmentSheet}, level horizon, stable slow dolly detail shot, ${plan.styleSheet}`,
              voiceover: chunk.join(' '),
              needsNarration: true,
              caption: '',
            } as PlanScene)
          }
          if (si < sentences.length) {
            const rest = sentences.slice(si).join(' ')
            const lastNarr = [...plan.scenes].reverse().find((sc) => sc.type !== 'dialogue')
            if (lastNarr) {
              lastNarr.voiceover = `${lastNarr.voiceover ?? ''} ${rest}`.trim()
              lastNarr.seconds = Math.max(4, Math.min(12, Math.round(wordsIn(lastNarr.voiceover) / 2.3) + 1))
            }
          }
          console.log(
            `[contrato] C1 verbatim: ${totalWords} palavras do roteiro → ${plan.scenes.length} cenas, ${plan.scenes.reduce((a, sc) => a + (sc.seconds || 0), 0)}s falados (zero texto inventado)`,
          )
        }
      }

      // C2 — DURAÇÃO É CONTRATO: nunca submeter plano < 95% do alvo. Se ainda
      // faltar depois de replans+esticador+C1, cenas de apoio atmosféricas
      // (ambiente da própria história, sem gente) completam a conta — b-roll
      // custa centavos e rabo com trilha é melhor que vídeo curto que vale
      // ZERO no TikTok Rewards.
      {
        type PlanScene = (typeof plan.scenes)[number]
        const tally = () => plan.scenes.reduce((a, sc) => a + (sc.seconds || 0), 0)
        let t = tally()
        const floor95 = Math.round(hollywoodTarget * 0.95)
        // ═══ KINEO-C2-SEM-MUDA-2026-08-24 — A ORDEM INVERTE, E O MUDO GANHA TETO ══
        //
        // O CASO (render do fundador, Cyclops, 24/08 21:25): o plano chegou
        // aqui com 42s falados para um alvo de 60s, e ESTE bloco completou os
        // 24s que faltavam com cenas atmosféricas SEM VOZ — "rabo com trilha é
        // melhor que vídeo curto", dizia a justificativa. O fundador assistiu
        // e deu o veredito que derruba a premissa: 24 segundos de filme mudo É
        // o "apagão" que ele vem reprovando há semanas. Um suspiro atmosférico
        // de 4-6s respira; 24s é o filme morrendo em câmera lenta.
        //
        // A ORDEM NOVA: (1º) ESTICAR cenas que TÊM fala — a imagem segue
        // rodando sob narração, custo zero de silêncio; (2º) só depois, no
        // máximo UM suspiro mudo de até 6s. Se ainda faltar, o filme sai mais
        // curto — e o log grita, porque déficit grande aqui significa que o C1
        // deixou texto para trás (a classe de bug que o verbatim-sem-marcador
        // acabou de consertar), não que faltou atmosfera.
        if (t < floor95) {
          for (const sc of plan.scenes) {
            if (t >= floor95) break
            if (sc.type !== 'dialogue' && (sc.seconds || 0) < 12) {
              const d = Math.min(12 - (sc.seconds || 0), floor95 - t)
              sc.seconds = (sc.seconds || 0) + d
              t += d
            }
          }
        }
        const MUTE_BREATHER_MAX_S = 6
        if (t < floor95) {
          const breather = Math.max(4, Math.min(MUTE_BREATHER_MAX_S, floor95 - t))
          plan.scenes.push({
            index: plan.scenes.length + 1,
            type: 'support',
            beat: 'PAYOFF',
            seconds: breather,
            prompt: `slow atmospheric closing shot of ${plan.environmentSheet}, no people, golden light fading, level horizon, stable slow dolly, ${plan.styleSheet}`,
            voiceover: undefined,
            needsNarration: false,
            caption: '',
          } as PlanScene)
          t = tally()
        }
        if (t < floor95) {
          // Chegou aqui = mesmo esticando tudo E com o suspiro, falta filme.
          // Isso NUNCA deveria acontecer com a trava de narração (95% do alvo
          // medido ANTES do débito) + verbatim íntegro. É alarme, não ajuste.
          console.error(
            `[contrato] C2 DÉFICIT MUDO: plano fecha em ${t}s de ${hollywoodTarget}s alvo mesmo após esticar+suspiro. ` +
            `O C1 provavelmente deixou texto para trás — investigar ANTES do próximo render pago.`,
          )
        }
        console.log(`[contrato] C2: plano final ${t}s de ${hollywoodTarget}s alvo (piso ${floor95}s, ${plan.scenes.length} cenas, mudo máx ${MUTE_BREATHER_MAX_S}s)`)
      }

      // ═══ KINEO-DRY-RUN-2026-08-24 — O VALIDADOR DE $0 ══════════════════════
      //
      // ORDEM DO FUNDADOR (24/08, depois do 4º render reprovado): "não posso
      // gastar mais 7 dólares a cada teste". O padrão dos bugs desta família
      // (cena muda, roteiro condensado, apagão no fim) é que TODOS são
      // visíveis NO PLANO — cenas, segundos, narração por cena — e o plano
      // fica pronto AQUI, antes de qualquer submissão ao fal. Só que até hoje
      // a única forma de olhar o plano era pagar o render inteiro.
      //
      // ═══ KINEO-TETO-REDE-FINAL-2026-08-25 — A REDE ABAIXO DE TODOS OS CAMINHOS ═══
      // O preflight do dry-run 4 (25/08) pegou uma cena de 12s no plano final
      // da família omni: os tetos por família cobrem os dimensionadores
      // conhecidos do C2, mas o replan-por-mais-cenas (e qualquer caminho
      // futuro) pode devolver segundos do GPT sem passar por eles. Caçar cada
      // caminho é a estratégia que perde; esta rede roda SEMPRE, por último,
      // em código: cena acima do teto da família (a) encolhe até o teto se a
      // fala couber (~2.3 pal/s), ou (b) é DIVIDIDA — as palavras excedentes
      // viram uma cena de apoio nova, dimensionada pela própria fala. C1
      // intacto (nenhuma palavra dropada), C2 intacto (a duração total até
      // sobe), e nenhum clipe jamais nasce maior do que o fornecedor entrega.
      {
        const wordsArr = (t?: string | null) => (t ?? '').trim().split(/\s+/).filter(Boolean)
        const capOf = (type: string) => type === 'dialogue' ? DIALOGUE_CAP : type === 'cinematic' ? 8 : SCENE_CAP
        for (let i = 0; i < plan.scenes.length && i < 40; i++) {
          const sc = plan.scenes[i]
          const cap = capOf(sc.type)
          if ((sc.seconds ?? 0) <= cap) continue
          const isDialogue = sc.type === 'dialogue'
          const speech = wordsArr(isDialogue ? sc.dialogueLine : sc.voiceover)
          const fits = Math.max(1, Math.floor((cap - 1) * 2.3))
          if (speech.length <= fits) {
            console.warn(`[teto-rede] cena ${i + 1} (${sc.type}) ${sc.seconds}s > teto ${cap}s da família ${family} — encolhida (fala cabe)`)
            sc.seconds = cap
            continue
          }
          // Fala não cabe no teto: divide — a cena fica com o que cabe, o
          // excedente vira apoio novo LOGO DEPOIS (ordem da narração intacta).
          const head = speech.slice(0, fits).join(' ')
          const tail = speech.slice(fits).join(' ')
          if (isDialogue) sc.dialogueLine = head
          else sc.voiceover = head
          sc.seconds = cap
          const tailSeconds = Math.max(4, Math.min(SCENE_CAP, Math.round(wordsArr(tail).length / 2.3) + 1))
          plan.scenes.splice(i + 1, 0, {
            ...sc,
            index: sc.index + 1,
            type: 'support',
            dialogueLine: undefined,
            voiceover: tail,
            needsNarration: true,
            seconds: tailSeconds,
            prompt: `slow cinematic insert continuing the story, ${plan.environmentSheet ?? ''}, level horizon, stable slow dolly detail shot, ${plan.styleSheet ?? ''}`,
            caption: '',
          })
          console.warn(`[teto-rede] cena ${i + 1} (${sc.type}) dividida: ${fits} palavras ficam, ${wordsArr(tail).length} viram apoio de ${tailSeconds}s`)
        }
      }

      // ═══ KINEO-OMNI-ALVO-CRAVADO-2026-08-25 (V6.1, fundador aprovou) ═══
      // O Omni cobra $0.13/s DESPACHADO: overshoot é margem indo embora
      // (80s despachados no 1º render = ~23% de margem; 68s = ~35%). Este
      // passe apara SÓ FOLGA — cena não-dialogue cujos segundos excedem o
      // que a própria fala sustenta (~2.3 pal/s +1 respiro). Verbatim não
      // tem folga (C1 dimensiona tudo pela palavra) → no-op; plano do GPT
      // com gordura → enxuga até alvo+4. Nenhuma palavra é tocada, nunca.
      if (family === 'omni') {
        const wordsOf2 = (t?: string | null) => (t ?? '').trim().split(/\s+/).filter(Boolean).length
        let total2 = plan.scenes.reduce((a, sc) => a + (sc.seconds || 0), 0)
        const ceiling = hollywoodTarget + 4
        let guard2 = 40
        while (total2 > ceiling && guard2-- > 0) {
          const slacky = plan.scenes.filter((sc) => sc.type !== 'dialogue' && (sc.seconds || 0) > Math.max(4, Math.round(wordsOf2(sc.voiceover) / 2.3) + 1))
          if (slacky.length === 0) break
          for (const sc of slacky) {
            if (total2 <= ceiling) break
            sc.seconds = (sc.seconds || 0) - 1
            total2 -= 1
          }
        }
        if (total2 < plan.scenes.reduce((a, sc) => a + (sc.seconds || 0), 0)) { /* unreachable, log below */ }
        console.log(`[cinematic] KINEO-OMNI-ALVO: plano final ${total2}s (teto ${ceiling}s) — folga aparada sem tocar palavra`)
      }

      // `dry_run: true` (restrito às contas do fundador) devolve o plano
      // completo NESTE ponto: por cena — tipo, segundos, palavras e o texto
      // exato que seria falado — mais os totais que os contratos C1/C2
      // prometem. Custo: os centavos do GPT do planner. Zero fal, zero
      // Creatomate, zero TTS, e o débito é estornado na hora pelo mesmo
      // caminho do FAILFAST. Testar um roteiro passa de $7 para ~$0,02.
      {
        const dryRunEmails = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
        if (body.dry_run === true && dryRunEmails.has((user.email ?? '').toLowerCase())) {
          const wordsOf = (t?: string) => (t ?? '').trim().split(/\s+/).filter(Boolean).length
          const planReport = plan.scenes.map((sc, i) => ({
            scene: i + 1,
            type: sc.type,
            seconds: sc.seconds ?? null,
            words: wordsOf(sc.type === 'dialogue' ? sc.dialogueLine : sc.voiceover),
            speech: sc.type === 'dialogue' ? (sc.dialogueLine ?? null) : (sc.voiceover ?? null),
          }))
          const spokenSeconds = planReport.reduce((a, r) => a + (r.words > 0 ? (r.seconds ?? 0) : 0), 0)
          const totalSeconds = planReport.reduce((a, r) => a + (r.seconds ?? 0), 0)
          const muteSeconds = totalSeconds - spokenSeconds
          // ═══ KINEO-DRYRUN-PREFLIGHT-2026-08-25 — O CONTRATO DO FORNECEDOR ═══
          // O 422 do primeiro render Omni (image_url faltando, 8/8 cenas)
          // passou LIMPO pelo dry-run porque ele parava no plano e nunca
          // olhava o payload. Agora o dry-run também simula o DESPACHO: modelo
          // por cena (com e sem âncora) + violações do schema (teto de
          // segundos da família, i2v sem imagem). Qualquer violação = FAIL.
          const sceneCapViolations = planReport.filter((r) => (r.seconds ?? 0) > (r.type === 'dialogue' ? DIALOGUE_CAP : SCENE_CAP))
          const dispatchPreview = plan.scenes.map((sc, i) => ({
            scene: i + 1,
            model_with_anchor: cinematicSceneModel(family, sc.type, true),
            model_without_anchor: cinematicSceneModel(family, sc.type, false),
          }))
          const preflightProblems: string[] = []
          for (const v of sceneCapViolations) preflightProblems.push(`cena ${v.scene} (${v.type}) tem ${v.seconds}s > teto ${v.type === 'dialogue' ? DIALOGUE_CAP : SCENE_CAP}s da família ${family}`)
          for (const d of dispatchPreview) {
            const input = buildFalInput(d.model_with_anchor, 'preflight', false, true, plan.scenes[d.scene - 1].seconds, 'https://preflight.local/anchor.png')
            if (d.model_with_anchor.includes('image-to-video') && !input.image_url) preflightProblems.push(`cena ${d.scene}: modelo i2v ${d.model_with_anchor} sem image_url no payload`)
          }
          await releaseBirthClaim('dry_run_no_charge')
          return NextResponse.json({
            dry_run: true,
            verbatim,
            family,
            // KINEO-UNIVERSAL-2026-08-25 — a DECISÃO DE DIREÇÃO no relatório:
            // é o que permite validar 5 gêneros opostos a $0 (o teste do
            // 'sistema perfeito pra qualquer assunto' que o fundador pediu).
            direction: { genre: plan.genre, hostFits: plan.hostFits, stylized: plan.stylized },
            target_seconds: hollywoodTarget,
            total_seconds: totalSeconds,
            spoken_seconds: spokenSeconds,
            mute_seconds: muteSeconds,
            preflight_problems: preflightProblems,
            dispatch_preview: dispatchPreview,
            verdict: muteSeconds <= 6 && totalSeconds >= Math.round(hollywoodTarget * 0.95) && preflightProblems.length === 0
              ? 'PASS — todos os segundos têm história (mudo ≤6s), a duração fecha e o payload respeita o schema do fornecedor'
              : preflightProblems.length > 0
                ? `FAIL — preflight: ${preflightProblems.join(' · ')}`
                : `FAIL — ${muteSeconds}s mudos ou duração ${totalSeconds}s abaixo do piso`,
            scenes: planReport,
            note: 'Nada foi enviado ao fal e os créditos foram estornados. Custo real: só o GPT do planner.',
          })
        }
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
      // KINEO-H3-FIX-2026-08-19 — no Kling 3, cena de diálogo fala SOZINHA
      // (áudio nativo) e por isso narração=null. O H3 entra MUDO por decisão
      // (Contrato C1: a voz é a do usuário) — então no H3 TODA cena leva TTS,
      // inclusive as de diálogo, usando a própria fala como narração. Sem isto
      // o filme sairia com buracos de silêncio exatamente nas cenas-chave.
      // #281 — KINEO-H3-DIALOGO-2026-08-23 (fundador: "quero que ela fale em
      // alguns momentos, e em outros a narracao assuma"). O flatten de 19/08
      // (dialogo virava cena narrada) MORREU: o proprio builder mediu que o H3
      // devolve fala nativa alta e clara (pico -0.2dB) — o motor fala, so
      // faltava dirigir. Agora o H3 usa o MESMO desenho do Kling 3: cena de
      // dialogo fala sozinha (audio nativo, narracao null), o resto e narrado.
      // C1 preservado: a dialogueLine vem do roteiro redistribuido em codigo.
      // KINEO-OMNI-2026-08-25 — V1 do Omni roda TUDO narrado (inclusive a
      // cena de dialogo, usando a propria fala como narracao): ate o render
      // de validacao provar que o audio nativo dele fala alto e claro, filme
      // 100% narrado > aposta em fala que nao veio (a mesma escada do H3:
      // mudo primeiro, dialogo nativo religado depois via #281).
      const hNarrations = wantsH3
        ? plan.scenes.map((s) => (s.type === 'dialogue' ? null : (s.voiceover ?? null)))
        : wantsOmni
          ? plan.scenes.map((s) => (s.type === 'dialogue' ? (s.dialogueLine ?? s.voiceover ?? null) : (s.voiceover ?? null)))
          : plan.scenes.map((s) => (s.needsNarration && s.voiceover ? s.voiceover : null))
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
      // KINEO-KLING3-AUDIT-2026-08-20 — scene_prompts devolvia o prompt CRU
      // (plan + eraSuffix), mas o submit real acrescenta uprightPrefix +
      // mouthSuffix + spectacleSuffix. O retry e o salvage re-submetiam com o
      // prompt cru: cena re-tentada perdia o "mouth closed" (a dublagem de
      // terror que o fundador viu DUAS vezes), o DNA de nitidez e o horizonte
      // em pé. Agora guardamos o prompt EXATO que foi pro fal, cena a cena.
      const hSubmittedPrompts: string[] = []
      for (const hs of plan.scenes) {
        // `sceneModel`/`sceneEngine` (NOT `usedModel` — that name belongs to
        // the classic single-model path below and must not be shadowed).
        let sceneModel: string = cinematicSceneModel(family, hs.type, Boolean(anchors))
        let sceneEngine: string = hs.type
        let id: string | null = null
        let submittedPrompt: string = hs.prompt + eraSuffix // sobrescrito com o prompt completo no caminho t2v/i2v

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
                hSubmittedPrompts.push(submittedPrompt)
                break
              }
              throw e
            }
            console.warn(
              `[cinematic] hollywood host scene ${hs.index} failed — falling back to O3 native audio:`,
              e instanceof Error ? e.message : String(e),
            )
            id = null
            sceneModel = cinematicSceneModel(family, hs.type, Boolean(anchors))
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
          // KINEO-CONTRATO-SHARP-2026-08-18 — a cena BORRADA do render
          // ef2d09bf era exatamente este caminho: cinematic sem ancora caia
          // no veo3.1/fast t2v (720p soft) dentro de um filme de 150cr
          // vendido como Kling 3. Cinematic agora recebe o MESMO tratamento
          // image-first do support: still 9:16 proprio (flux, centavos) →
          // Kling o3 i2v ($0.168/s vs $0.15/s do veo = +$0.14 por cena de 8s)
          // — nitidez de flagship, horizonte em pe garantido pelo primeiro
          // frame, e o filme inteiro com o look de UM motor so.
          if ((hs.type === 'support' || hs.type === 'cinematic') && !anchorUrl) {
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
          sceneModel = cinematicSceneModel(family, hs.type, Boolean(sceneAnchor))
          // KINEO-VOICEFIX-2026-08-17 (parte 2, em CODIGO): cena NAO-dialogo
          // nunca pode ter boca mexendo — a narracao TTS toca por cima e boca
          // + voz de outra pessoa = dublagem de terror (o bug que o fundador
          // viu DUAS vezes). Nao confiamos so no planner: o sufixo vai sempre.
          const mouthSuffix = hs.type !== 'dialogue' ? ' If any person is visible: mouth closed, not speaking, no lip movement, no talking.' : ''
          // #281 — KINEO-H3-BOCA-2026-08-23 (fundador, filme de Pompeia: "o
          // avatar fala, a voz nao aparece, so a narracao"). O render saiu COM
          // o mouthSuffix acima e o H3 ignorou: e um motor treinado em gente
          // falando, e aviso no FIM do prompt pesa pouco — a MESMA licao do
          // UPRIGHT-B (tokens iniciais mandam mais). Na familia h3, onde NAO
          // existe fala nativa (tudo e narrado), a proibicao vira PREFIXO.
          const mouthPrefix = family === 'h3' && hs.type !== 'dialogue'
            ? 'No one talks on camera. Every visible person is silent, mouth closed, no lip movement, not speaking. '
            : ''
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
          const scenePrompt = mouthPrefix + uprightPrefix + hs.prompt + eraSuffix + mouthSuffix + spectacleSuffix
          submittedPrompt = scenePrompt
          try {
            id = await submitToFal(scenePrompt, sceneModel, false, true, hs.seconds, sceneAnchor, undefined, plan.stylized)
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
              hSubmittedPrompts.push(submittedPrompt)
              break
            }
            throw e
          }
        }
        if (id) providerSubmissionMayExist = true
        hRequestIds.push(id)
        hModels.push(sceneModel)
        hEngines.push(sceneEngine)
        hSubmittedPrompts.push(submittedPrompt)
        await new Promise((r) => setTimeout(r, 450))
      }

      // Keep every response array parallel to plan.scenes. Unsubmitted scenes
      // remain null and follow the existing stock/fallback path in compose.
      while (hRequestIds.length < plan.scenes.length) {
        const unsubmitted = plan.scenes[hRequestIds.length]
        hRequestIds.push(null)
        hModels.push(cinematicSceneModel(family, unsubmitted.type, Boolean(anchors)))
        hEngines.push(unsubmitted.type)
        hSubmittedPrompts.push(unsubmitted.prompt + eraSuffix)
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
      // KINEO-CONTRATO-C2-2026-08-18 — piso de submissão sobe 60%→90%: com o
      // plano agora fechando >=95% do alvo, aceitar só 60% dele de volta seria
      // reabrir a porta do vídeo curto. Falhou >10% das cenas → aborta+estorna.
      {
        // KINEO-353A.1 — H3 e Omni nao sao "hollywood". O motor gravado e o
        // que a claim resolveu no servidor.
        const c = ctxDespacho()
        c.engine = hModels.find(Boolean) ?? String(claimQuality)
        c.quality = String(claimQuality)
        c.planned = plan.scenes.length
      }
      if (hValid.length === 0 || hSubmittedSec < hPlannedSec * 0.9) {
        console.error(
          `[cinematic] hollywood FAILFAST: only ${hValid.length}/${plan.scenes.length} scenes (${hSubmittedSec}s of ${hPlannedSec}s planned) — aborting with refund${ctxDespacho().balanceExhausted ? ' (FAL BALANCE EXHAUSTED)' : ''}`,
        )
        const released = await releaseBirthClaim(ctxDespacho().balanceExhausted ? 'provider_balance_rejected' : 'provider_rejected')
        // KINEO-353A.1 — o desfecho vai para o CONTEXTO; quem grava e o
        // finalizador unico, com a Response real na mao.
        {
          const c = ctxDespacho()
          c.claimAction = released ? 'released' : 'release_failed'
          c.refundConfirmed = released
          c.planned = plan.scenes.length
        }
        if (!released) {
          return NextResponse.json(
            { error: 'No AI scenes started and your automatic refund is still being confirmed. Please retry this same generation.' },
            { status: 503 },
          )
        }
        if (ctxDespacho().balanceExhausted) {
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
        // #281 — KINEO-H3-DIALOGO-2026-08-23: o rótulo 'dialogue' volta a
        // viajar de verdade no H3 (o map dialogue→cinematic de 19/08 morreu
        // junto com o flatten). Compose vê 'dialogue' → não narra por cima,
        // não muta o clipe, e transcreve a fala nativa para a legenda.
        scene_engines: hEngines,
        // KINEO-HOLLYWOOD-RETRY-2026-08-16 — o client precisa do prompt e da
        // âncora de cada cena pra re-submeter UMA vez as que falharem no
        // fornecedor (conserto do vídeo curto de 34s).
        scene_prompts: hSubmittedPrompts, // prompt EXATO submetido (upright+era+mouth+spectacle) — retry/salvage fiéis
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
        // #281 — KINEO-H3-DIALOGO-2026-08-23: com o diálogo nativo religado,
        // o H3 volta a mandar a fala exata da cena (compose a usa para a
        // legenda lipsync via Whisper, igual Kling 3).
        scene_dialogues: plan.scenes.map((s) => (s.type === 'dialogue' && s.dialogueLine ? s.dialogueLine : null)),
        cost_estimate_usd: plan.estimatedCostUsd,
        // ⚠️ KINEO-H3-FIX-2026-08-19 — ESTA LINHA ERA `quality: 'cinematic_hollywood'`
        // CRAVADO, e foi o bug que travou o primeiro render H3 da história (o do
        // fundador, 22:07). A cadeia: o claim nasce com claimQuality='cinematic_h3',
        // as 8 cenas SOBEM pra fal com sucesso ($11 de fornecedor), e na hora de
        // publicar a resposta o validador de assinatura compara response.quality
        // com claim.quality → 'cinematic_hollywood' ≠ 'cinematic_h3' → recusa
        // ("response does not match provider binding") → o cliente fica preso em
        // "Submitting..." pra sempre com as cenas prontas do outro lado.
        // O validador fez o TRABALHO DELE — a resposta estava mesmo mentindo
        // sobre o que era. O erro foi meu: o quinto lugar com valor cravado que
        // a família H3 expôs num único dia.
        quality: claimQuality,
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
      // KINEO-353A.1 — o INDICE REAL da cena vem do chamador. Antes o vetor
      // usava `outcomes.length`, que e ordem de conclusao das promises: num
      // pool de 3, a cena 5 podia ser gravada como cena 0.
      sceneIndex: number,
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
      // ═══ KINEO-353A.1 — O RETRY CEGO MORREU AQUI ══════════════════════
      // Antes: `if (id === null) { sleep(800); submitToFal(...) }` — re-POST
      // de QUALQUER rejeicao explicita, inclusive 401/403/404/422. E o
      // lib/falQueue ja repetia 429 por dentro: dois donos de retry se
      // multiplicando. Agora o dono e um so (falQueue, que respeita
      // retry-after), e a ordem dos modelos e i2v -> t2v como TENTATIVA DE
      // OUTRO MODELO, nunca retry escondido.
      const modelos = imageUrl
        ? [model === KLING_MODEL ? KLING_I2V_MODEL : model, model]
        : [model]
      const safeVisualPrompt = buildContextualSafeVisualPrompt(
        sanitizeRealPeople(scene.stockSearchQuery || scene.aiPrompt || scene.description),
      )
      const despachoCena = await dispatchOneSceneWithSafeVisualRetry({
        sceneIndex,
        models: modelos,
        visualPrompt: cinematic,
        safeVisualPrompt,
        submit: async (m, promptForAttempt, onPost) => submitFalQueueOnce(
          m,
          buildFalInput(m, promptForAttempt, hd, false, undefined, m === modelos[0] ? imageUrl : undefined, generationSeed, undefined),
          onPost,
        ),
      })
      {
        const c = ctxDespacho()
        c.outcomes[sceneIndex] = despachoCena.outcome
        c.attempts[sceneIndex] = despachoCena.attempts
        c.totalPosts += despachoCena.posts
        if (despachoCena.outcome.reason_class === 'balance_quota') c.balanceExhausted = true
      }
      if (despachoCena.requestId) {
        return { kind: 'id', id: despachoCena.requestId, model: despachoCena.model }
      }
      if (despachoCena.outcome.disposition === 'ambiguous') {
        return { kind: 'ambiguous', error: new FalQueueSubmitError('provider submit ambiguous', {
          ambiguous: true, status: despachoCena.outcome.provider_http_status,
        }) }
      }
      return { kind: 'id', id: null, model: despachoCena.model }
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
            batch.map(async (idx) => ({ idx, res: await submitScene(scenes[idx], model, idx, sceneStills[idx] ?? undefined) })),
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
        const res = await submitScene(scenes[i], model, i, sceneStills[i] ?? undefined)
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

    // KINEO-353A.1 — motor e plano REAIS no contexto, antes de despachar.
    {
      const c = ctxDespacho()
      c.engine = usedModel
      c.quality = String(claimQuality)
      c.planned = scenes.length
    }
    const submittedScenes = await submitAllScenes(usedModel)
    const falRequestIds = submittedScenes.ids
    const usedModels = submittedScenes.models
    let validIds = falRequestIds.filter((id): id is string => id !== null)

    // Do not silently downgrade Kling to Seedance after the signed cost/engine
    // claim is born. A rejected premium submit is retriable and never charged.

    // Um único clipe aceito já é renderizável: o compose o recicla até cobrir
    // toda a duração. Nunca descarte/refunde jobs pagos só por cobertura <50%.
    if (!hasRenderableClassicScene(falRequestIds)) {
      const released = await releaseBirthClaim(ctxDespacho().balanceExhausted ? 'provider_balance_rejected' : 'provider_rejected')
      // KINEO-353A — o desfecho vai para o banco ANTES de responder, e vai
      // awaitado. Se a lambda morrer logo depois, a linha ja existe.
      {
        const c = ctxDespacho()
        c.claimAction = released ? 'released' : 'release_failed'
        c.refundConfirmed = released
      }
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
      if (ctxDespacho().balanceExhausted) {
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
    // KINEO-353A.1 — nada de gravar 200/pending aqui: `publishCinematicResponse`
    // ainda pode devolver 402/409/503 e ainda pode terminar `settled`. O
    // desfecho real e lido pelo finalizador, depois da Response existir.
    { const c = ctxDespacho(); c.claimAction = 'published' }
    return publishCinematicResponse(response, falRequestIds, usedModels)
  } catch (error: unknown) {
    // KINEO-353A.1 — REDACAO NO CATCH EXTERNO. Aqui ainda saia `error.message`
    // livre, e a mensagem de FalQueueSubmitError carrega o `detail` do
    // fornecedor (ate 300 chars do corpo). Fica so o nome da classe e, quando
    // houver, o status — o suficiente para triagem, insuficiente para vazar.
    const errNome = error instanceof Error ? error.name : 'unknown'
    const errStatus = error instanceof FalQueueSubmitError ? error.status : null
    const errAmbiguo = error instanceof FalQueueSubmitError ? error.ambiguous : null
    console.error('[cinematic] unexpected error:', JSON.stringify({
      name: errNome, provider_http_status: errStatus, ambiguous: errAmbiguo,
    }))
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
