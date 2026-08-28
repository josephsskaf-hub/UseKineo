// NOTE: do NOT statically `import { openai } from '@/lib/openai'` here.
// The compose-status route only needs the Creatomate helpers and we don't
// want to trigger OpenAI client instantiation (which reads OPENAI_API_KEY at
// module load) when it isn't needed. The TTS / script-scaling functions
// dynamically import it below.

import { createHash } from 'node:crypto'
import { toFile } from 'openai'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { buildCaptionSegments, pickHighlightWord, OPENAI_TTS_TIMEOUT_MS, OPENAI_WHISPER_TIMEOUT_MS, type CaptionSegment } from '@/lib/openai'
import { stripScriptMarkers } from '@/lib/scriptParser'
// KINEO-RENDER-PROFILE-2026-08-10 — o bloco de output (width/height/fps) do
// payload do Creatomate. Módulo puro, sem cliente e sem chave de API: seguro
// para o caminho do compose-status (ver o NOTE do topo deste arquivo).
import { renderOutputSpec } from '@/lib/renderProfile'
// KINEO-CREDIT-STUCK-2026-08-08 — política única de 429 (fal + Creatomate).
import { CREATOMATE_SUBMIT_RATE_LIMIT, rateLimitWaitMs, sleep } from '@/lib/rateLimit'
import { selectPersonaForScript, describeVoiceSelection } from '@/lib/narration/niche-mapping'
import { splitIntoSections, hasViralSections } from '@/lib/narration/section-tts'
import {
  isElevenLabsEnabled,
  synthesizeWithElevenLabs,
  ELEVENLABS_DEFAULT_VOICE_ID,
} from '@/lib/narration/elevenlabs'

const CREATOMATE_BASE = 'https://api.creatomate.com/v1'
// KINEO-ONE-WATERMARK-2026-08-07 — ONE brand element on a free render, and it
// is this one. The founder's screenshot of a freshly generated free video
// showed the same message stacked FOUR times: this burnt watermark, a "Made
// with Kineo" lockup in the 2.5s tail, the SAME lockup again over the first 2s,
// and a "usekineo.com" CTA also in the tail — all in the same top corner where
// the watermark already says the domain. His verdict was "não precisa de 3
// falando a mesma coisa". Decision: keep only the burnt,
// full-duration watermark. It is the only element that survives a re-upload,
// and the only one carrying an attributable destination — `/free` maps to
// app/free/route.ts, which stamps a first-touch source cookie and forwards to
// `/` with utm_source=watermark.
// CTA_TEXT, CTA_TAIL_SECONDS and INTRO_LOCKUP_SECONDS were deleted together
// with the elements they fed: nothing in this file emits a CTA tail any more.
const WATERMARK_TEXT = 'usekineo.com/free'
// Push #293 / Kineo-Audio-2026 — Background music volume + fades. Lowered
// 18%→12% so the narrator always dominates (InVideo/OpusClip sit music ~10-14%
// under a VO). Creatomate can't sidechain-duck, so a fixed low level plus a
// brief fade-in and a short fade-out is the closest clean approx.
// (PUSH #93 amended the fade-out: it no longer spans the whole CTA tail.)
const MUSIC_VOLUME = '12%'
const MUSIC_FADE_IN_SECONDS = 0.8
// PUSH #93 — MUSIC TAIL. Was 2.5s, i.e. exactly the length of the old 2.5s CTA
// tail, so the music bed hit silence precisely over the outro: the one frame we
// wanted the viewer to act on played at the quietest moment of the whole video
// — the inverse of the short-form pattern, where the bed carries the outro and
// only ducks out on the very last beat. 1.2s keeps the bed clearly audible
// through the closing words and still resolves to silence inside the timeline
// (the fade window is [totalDuration-1.2, totalDuration] and is additionally
// clamped to totalDuration/2, so it always starts AND completes before the last
// frame).
// KINEO-ONE-WATERMARK-2026-08-07 — the CTA tail element itself is gone, so this
// fade is now a pure audio resolve with no overlay to cooperate with. The 1.2s
// value is kept: it is about how music should end, not about the deleted CTA.
const MUSIC_FADE_OUT_SECONDS = 1.2
// Push #064 — yellow used for the per-caption highlight word overlay.
const HIGHLIGHT_COLOR = '#FFD700'

// ─── PUSH #93 — SHORTS SAFE-ZONE LAYOUT (1080×1920) ──────────────────────────
// YouTube's Shorts player draws its own UI over the frame. Measured bands:
//   • bottom ~380px  → everything below y ≈ 80% (1536px) is covered by the
//     title / channel row / progress bar / "Subscribe" strip.
//   • right ~90px    → x > ~990px is covered by like / comment / share / remix.
// Everything we want a human to READ must live above y=78% and inside x∈[90,990].
//
// The layout this file now emits (percentages of the 1920px height):
//
//   y   0.0% ─┬─ (top band 0–20%; PUSH #95 deleted the letterbox bar that used
//             │   to be drawn here — it never rendered. Text below is unmoved.)
//        5.0% │  WATERMARK "usekineo.com/free" font 40 + plate
//             │                                       band ≈  55–137px
//             │                                       [free render only, t=0→end]
//             │
//             │  KINEO-ONE-WATERMARK-2026-08-07 — the REST OF THE TOP BAND IS
//             │  NOW EMPTY. y 13% held "Made with Kineo" (tail + first 2s) and
//             │  y 18% held the "usekineo.com" CTA tail. Both were deleted: on
//             │  a ~35s Short, three overlays saying the same thing read as
//             │  clutter, and the watermark above already states the domain,
//             │  for the entire video, in the attributable `/free` form.
//             │  If anything is ever re-added here, redo the collision
//             │  arithmetic in the track 9 block — the watermark band bottom
//             │  is 137px and the caption top is 1350px.
//       20.0% ─┴─ (end of top band)
//       20.5%     … footage / color-grade overlays only …
//   ~70.3%    ┬─ CAPTION top — PUSH #94, single word @ hook font 104 (1350px).
//             │  Body font 86 tops out at 71.3% (1369px). Was ~61.3% when a
//             │  3-word chunk could wrap to 3 lines @ font 76; one word per
//             │  chunk effectively never wraps, so the band SHRANK even though
//             │  the font grew.
//             │  CAPTIONS — bottom-anchored (y_anchor 100%), so extra wrapped
//             │  lines grow UPWARD into empty footage, never downward.
//   78.0%    ─┴─ CAPTION_BOTTOM_Y — text-box floor, 1497.6px
//   80.0% ────── YouTube chrome starts (1536px; nothing readable below this).
//               The pill's 2% background_y_padding (38.4px) puts its bottom
//               edge at exactly 1536px — on the line, never below it.
//
// Horizontally: captions are 78% wide → x ∈ [119, 961]; with the pill's
// background_x_padding the darkened box still stays left of the 990px
// action-button column, so a caption can never sit under the like button.
// PUSH #94 — padding 2.5%→3%: worst case (one word filling the 842.4px box)
// spans [93.5, 986.5], still inside the 90px/990px guardrails. 4% would NOT be
// (it computes to [85.1, 994.9]) — see the note at background_x_padding.
// The watermark is a centered short string well inside that.
const CAPTION_BOTTOM_Y = '78%'   // bottom edge of the caption box (hard floor)
const CAPTION_WIDTH = '78%'      // keeps the pill left of the right-hand chrome
// PUSH #94 — ONE-WORD CAPTIONS. Tier-1 Shorts tools (Submagic / OpusClip /
// Revid) are recognisable above all else by active-word emphasis: exactly one
// word on screen at a time, swapping on the beat. With a chunk size of 1 every
// caption IS the active word, so we get that effect using the SAME single
// plain-text element we already ship — no rich-text spans, no second floating
// element. That distinction matters: Push #277 reverted a two-element per-word
// attempt (it rendered as two stacked subtitle lines) and Creatomate's inline
// colour markup is feature-gated across versions, so a malformed tag would
// render as literal `[color]` text. See the buildCaptionElements docstring.
// Revert = set this back to 3; it is the only knob.
//
// KINEO-CAPTION-PHRASE-2026-07-31 — 1 → 4, DECISÃO DO FUNDADOR APÓS TESTE REAL.
//
// O Joseph gerou um vídeo de 1 crédito em produção, assistiu, e pediu: "gostaria
// de deixar com 4-5 palavras com a fonte menor". Métrica de pipeline não enxerga
// "cansa o olho" — teste de fundador enxerga. O active-word de 1 palavra (#94) é
// a assinatura Submagic, mas em vídeos de 45s vira metrônomo: 100+ trocas de
// legenda por vídeo competindo com o footage.
//
// Por que 4 e não os 5 pedidos: na caixa de 78% (842px) a fonte 62 rende ~4
// palavras médias por linha; com 5 a quebra em 2 linhas vira frequente. 4 é o
// teto que mantém 1 linha na maioria dos chunks — e o fundador pediu "4-5",
// então 4 honra o pedido no limite seguro.
//
// A MELHORIA ESCONDIDA: quando o #94 escolheu 1 palavra, o corte por FRASE não
// existia. Desde 29/07 o chunker quebra em sentenceEnd + pausa audível ≥0.28s
// com maxWords como TETO (buildCaptionsFromWhisperWords). Com teto 4, os chunks
// caem em fronteiras naturais da fala — média real 3-4 palavras, nunca cortando
// frase no meio. É um caption de frase de verdade, não fatia cega de 4.
//
// A ênfase amarela (FAST_EMPHASIS_RE) volta a valer POR LINHA curta — uma linha
// com "$40,000" inteira em amarelo, o padrão pré-#94 que funcionava bem.
const CAPTION_WORDS_PER_CHUNK = 4
// PUSH #94 — font sizes retuned for the one-word line. At 62 a lone word looked
// small and lost the "punch" the effect depends on; a single word also has ~3x
// the horizontal room a 3-word line had, so it can afford the size. Safe zone
// re-verified (pill is bottom-anchored, so a bigger font grows UPWARD only):
//   body 86 → line box 86*1.05 = 90.3px + 2*38.4px y-padding = 167.1px tall
//             → pill spans 1368.9px … 1536.0px  (71.3% … 80.0%)
//   hook 104 → line box 109.2px + 76.8px = 186.0px tall
//             → pill spans 1350.0px … 1536.0px  (70.3% … 80.0%)
// The pill FLOOR is unchanged at 1536px (y 78% + 2% y-padding) because neither
// y, y_anchor nor background_y_padding moved — it still lands exactly on, and
// never below, the 1536px line where YouTube's chrome starts. The worst-case
// TOP is now ~70% versus the old documented 61.3% (3 wrapped lines @ 76), i.e.
// the caption band got strictly SMALLER: one word almost never wraps.
// KINEO-CAPTION-PHRASE-2026-07-31 — 86/104 → 62/76: o EXATO par que o PUSH #93
// validou matematicamente para linhas multi-palavra nesta mesma caixa
// (worst case 3 linhas @76 → topo em 61.3%, piso intacto em 1536px; a caixa é
// bottom-anchored, então wrap cresce para CIMA, nunca sobre o chrome do
// YouTube). Nenhuma conta nova precisou ser feita — voltamos para dentro de um
// envelope já provado. 86/104 eram dimensionados para UMA palavra ocupar a
// largura; com 4 palavras estourariam a caixa em todo chunk.
const CAPTION_FONT_SIZE = 62
const CAPTION_HOOK_FONT_SIZE = 76
// PUSH #93 — chunks starting inside this window get the hook treatment.
const CAPTION_HOOK_WINDOW_SECONDS = 2

// ── Fast Mode v2 (02/07) — ALL constants below are GATED to quality==='fast'
// (free stock pipeline). AI Gen / avatar / legacy modes keep their exact
// pre-existing pacing, animation and caption behavior. Easy to tune here.
// (a) RITMO — cut cadence band: each clip slot lasts 2.5–4s (viral edit rhythm).
const FAST_MIN_CUT_SECONDS = 2.5
const FAST_MAX_CUT_SECONDS = 4
// (b) MOVIMENTO — Ken Burns pattern cycled per cut: center push-in, pull-back,
// then off-center push-ins (anchored left/right) that read as subtle lateral
// pans. Same proven Creatomate 'scale' animation type as #292, only varied.
const FAST_KEN_BURNS_PATTERN = [
  { from: '100%', to: '108%', xAnchor: '50%' }, // push-in, centered
  { from: '108%', to: '100%', xAnchor: '50%' }, // pull-back, centered
  { from: '100%', to: '110%', xAnchor: '38%' }, // push-in anchored left → pan-right feel
  { from: '100%', to: '110%', xAnchor: '62%' }, // push-in anchored right → pan-left feel
] as const
// (d) LEGENDAS — caption chunks carrying money/percent/big-number/power words
// render in HIGHLIGHT_COLOR (yellow pop); rest stay white. Whole-line color
// (not per-word layering) on purpose — see #277 regression note.
// PUSH #94 — with CAPTION_WORDS_PER_CHUNK = 1 the "whole line" IS the single
// word, so this now yellows EXACTLY the money/power word and nothing else —
// the per-word pop #277 had to abandon, reached without any layering.
const FAST_EMPHASIS_RE =
  /(\$[\d.,]+|\d+(\.\d+)?%|\b\d{3,}\b|\b(million|billion|trillion|secret|never|banned|hidden|illegal|forbidden|richest|poorest|deadliest|shocking|insane|free)\b)/i
// Push #049 — bucket name lives here so we never typo it across the
// upload + URL-build code paths. If we ever rename the bucket, change
// this single constant.
export const VOICEOVER_BUCKET = 'voiceovers' // (feature/ai-avatar touches this module)

export interface ComposeInputs {
  clipUrls: string[]
  voiceoverUrl: string
  /**
   * The narration text that the captions should be derived from. Push #031
   * fixed caption sync — captions are now segments of the actual spoken
   * script (one sentence per segment) rather than the visual scene
   * descriptions, so what the viewer reads matches what the narrator says.
   */
  voiceoverScript: string
  /**
   * Legacy: short caption strings (typically derived from scene visual
   * prompts). Used ONLY as a fallback when `voiceoverScript` is empty or
   * cannot be segmented.
   */
  sceneCaptions: string[]
  duration: number
  /**
   * Push #445 — render quality/engine ('fast' | 'cinematic_ai' | 'cinematic_kling' | ...).
   * Controls clip pacing: AI-generated clips are unique ~10s generations, so each
   * one is allowed to fill up to ~10s (so 6–9 clips cover a 60–90s video with NO
   * repetition). Fast stock keeps the tighter 6s slots for frequent cuts. Optional;
   * falls back to Fast pacing when absent.
   */
  quality?: string
  /**
   * Push #158 — real measured duration (seconds) of the generated TTS mp3.
   * The caption window is sized to this instead of the requested duration,
   * which assumed a fixed 2.5 words/sec pace the real audio never matched.
   * Optional: when absent the window falls back to the requested duration.
   */
  realAudioDuration?: number
  /**
   * Push #175 — optional pre-computed word-level timing from Whisper
   * transcription. Each entry aligns with the corresponding caption segment
   * produced by buildCaptionSegments(voiceoverScript, 7). When present, the
   * caption builder uses these exact timestamps instead of the proportional
   * word-count approximation, eliminating caption/narrator desync.
   * @deprecated in Push #258 — prefer whisperWords for drift-free captions
   */
  whisperTimings?: Array<{ time: number; duration: number }>
  /**
   * Push #258 — raw Whisper word-level timestamps. When present, captions are
   * built DIRECTLY from these words (grouped into ≤7-word chunks) rather than
   * mapping script-text segments to Whisper timing. This eliminates the word-
   * count drift bug where numbers spoken differently by TTS (e.g. "63%" as
   * "sixty three percent") caused captions to desync from the narrator's voice.
   */
  whisperWords?: WhisperWord[]
  /**
   * Push #293 — Optional background music URL (Pixabay phonk/motivational).
   * When present, added as track 8 at MUSIC_VOLUME volume, looping under the
   * voiceover for the full video duration. Volume is kept low so the narrator
   * stays clear and dominant.
   */
  musicUrl?: string | null
  /**
   * #384 — when true, burn a "Kineo" watermark into the final render.
   * Used ONLY for the free AI-Generate trial; paid renders pass false/undefined.
   * The decision is made server-side in /api/compose (never trusts the client).
   */
  watermark?: boolean
  /**
   * #482 — used to append a "Made with Kineo" end card plus a "usekineo.com"
   * CTA in the final 2.5s window (and, after PUSH #100, a second copy of the
   * lockup over the first 2s).
   *
   * KINEO-ONE-WATERMARK-2026-08-07 — THIS OPTION NO LONGER HAS ANY VISUAL
   * EFFECT. The founder saw a fresh free render carrying three overlays that
   * all said the same thing and ruled that a free video keeps exactly ONE brand
   * element: the burnt, full-length watermark gated by `watermark` above. Every
   * element this flag used to draw was deleted from BOTH builders.
   *
   * It is deliberately still ACCEPTED rather than removed, because callers pass
   * it today — app/api/compose/route.ts:1455 and :1920, and
   * app/api/compose/unlock/route.ts:512 (endCard:false on the paid re-render).
   * Keeping the property leaves those call sites type-checking unchanged. It is
   * intentionally NOT destructured in either builder: nothing reads it, so an
   * unused local can never mask a half-finished re-wiring.
   */
  endCard?: boolean
  /**
   * AI Avatar (feature/ai-avatar) — public URL of the VEED Fabric talking-head
   * MP4. When present the avatar becomes the MAIN video track (muted — the
   * voiceover track stays the single audio source; VEED lip-synced to that
   * exact mp3, so starting both at t=0 keeps lips and audio in sync) and the
   * stock clips become periodic full-frame CUTAWAYS instead of the base
   * timeline. Captions / CTA / music / watermark behave exactly as usual.
   */
  avatarUrl?: string | null
  /**
   * Face-app wave 1 (12/06) — Hook Avatar mode. When set (> 2), the avatar MP4
   * covers ONLY [0, avatarHookSeconds] (it was lip-synced to a byte-slice of
   * the narration head, so lips stay locked) and the stock clips tile the rest
   * of the timeline exactly like the standard mode. null/undefined = the
   * legacy full-length avatar with periodic cutaways.
   */
  avatarHookSeconds?: number | null
}

export interface CreatomateRenderState {
  status: 'planned' | 'waiting' | 'transcribing' | 'rendering' | 'succeeded' | 'failed' | 'cancelled' | 'unknown'
  progress: number
  url: string | null
  snapshotUrl: string | null
  error: string | null
  /** ⚠️ KINEO-DURACAO-REAL-2026-08-20 — a duração do ARQUIVO, vinda do
   *  Creatomate. Até hoje a tabela `videos` guardava a duração PEDIDA (e, no
   *  caminho do cron de resgate, um fallback cravado de 30), então o painel
   *  dizia 30s para um vídeo de 65s. Isso não é cosmético: foi com esse campo
   *  que eu concluí (errado) que o Seedance entregava 49s e não monetizava.
   *  Medindo os arquivos: 62,9s · 62,5s · 61,5s · 65,0s. O produto sempre
   *  esteve certo; o registro é que mentia — e métrica que mente produz
   *  decisão errada, que é o defeito mais caro que existe. */
  durationSeconds: number | null
}

// Push #234 — calibrated to the REAL TTS pace. OpenAI tts-1 (onyx) speaks at
// ~4.0 words/second, so a script must contain ~duration × 4.0 words for the
// narration to actually fill the requested duration. The old 2.5 wps figure
// produced scripts that finished ~40% early, which (because the final video
// length tracks the audio length) made every "45s" video come out ~27s.
// Keep this in lockstep with durationPlanFor() in lib/openai.ts so the
// analyze-idea script and the scale target agree (and scaleVoiceoverScript's
// ±15% short-circuit usually skips an extra rewrite).
// Push #295 — recalibrated to tts-1-hd actual pace (~3.1 wps).
// Push #292 upgraded the TTS model from tts-1 → tts-1-hd but this constant
// was never updated. tts-1-hd speaks noticeably slower (~3.1 wps vs ~4.0 wps),
// so scripts sized at 4.0 wps were ~29% too long → every "45s" video came out
// ~1:06. Dropping to 3.1 keeps generated audio in the requested window.
const TTS_WORDS_PER_SECOND = 3.1
export function targetWordCount(duration: number): number {
  const seconds = Math.max(5, Math.min(120, Math.round(duration)))
  return Math.round(seconds * TTS_WORDS_PER_SECOND)
}

/**
 * Rewrite a voiceover script so it lands close to the target word count.
 * Falls back to a hard word-slice if the model call fails — we never want
 * compose to die because of a script-scaling step.
 */
export async function scaleVoiceoverScript(rawScript: string, targetWords: number): Promise<string> {
  const cleanInput = (rawScript ?? '').trim()
  if (!cleanInput) return ''

  const words = cleanInput.split(/\s+/).filter(Boolean)
  // If already close to target (±15%), don't bother round-tripping to OpenAI.
  const lo = Math.floor(targetWords * 0.85)
  const hi = Math.ceil(targetWords * 1.15)
  if (words.length >= lo && words.length <= hi) return cleanInput

  // ── Protect the HOOK ──────────────────────────────────────────────────────
  // The crafted first sentence is the single biggest retention driver, so we do
  // NOT let the rescale rewrite it. Isolate the opening sentence and rescale
  // ONLY the body, then re-attach the verbatim hook. If we can't cleanly split
  // the first sentence, we still instruct the model to preserve the opening
  // line word-for-word (fallback below).
  const hookMatch = cleanInput.match(/^\s*([\s\S]+?[.!?]["'”’)\]]?)(\s+|$)/)
  const hook = hookMatch ? hookMatch[1].trim() : ''
  const body = hook ? cleanInput.slice(hookMatch![0].length).trim() : ''
  const hookWords = hook ? hook.split(/\s+/).filter(Boolean).length : 0

  // Only take the isolate-and-rescale-body path when there's a real hook AND a
  // real body to rescale (a single-sentence script has nothing to pad/trim).
  if (hook && body && hookWords < targetWords) {
    const bodyTargetWords = Math.max(8, targetWords - hookWords)
    try {
      const { openai } = await import('@/lib/openai')
      const completion = await openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a viral short-form scriptwriter. You rewrite the BODY of a script to a precise word count while keeping the core idea and ending on a strong payoff line. The opening hook is fixed and provided only for context — do NOT repeat it or reference it. Reply with the rewritten body text only — no quotes, no markdown, no scene labels, no stage directions.',
            },
            {
              role: 'user',
              content: `The video opens with this fixed HOOK (already spoken, do not rewrite or repeat it):\n"${hook}"\n\nRewrite ONLY the BODY that follows the hook so the body reads as about ${bodyTargetWords} words (±10%). It must flow naturally straight after the hook and end on a strong payoff line. Plain prose only.\n\nBODY:\n${body}`,
            },
          ],
          temperature: 0.7,
          max_tokens: Math.min(800, Math.max(120, bodyTargetWords * 4)),
        },
        { timeout: 20000 }
      )
      const scaledBody = completion.choices[0]?.message?.content?.trim() ?? ''
      if (scaledBody) return `${hook} ${scaledBody}`.trim()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[compose] scaleVoiceoverScript (body-only) failed, falling back:', msg)
    }

    // Body-only fallback — naive truncate/pad of the BODY, hook kept verbatim.
    const bodyWords = body.split(/\s+/).filter(Boolean)
    if (hookWords + bodyWords.length > targetWords) {
      return `${hook} ${bodyWords.slice(0, bodyTargetWords).join(' ')}`.trim()
    }
    return cleanInput
  }

  // ── Fallback path: can't isolate a hook → rewrite whole script but INSTRUCT
  // the model to keep the opening line word-for-word. ───────────────────────
  try {
    const { openai } = await import('@/lib/openai')
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a viral short-form scriptwriter. You rewrite scripts to a precise word count while keeping the core idea and a strong CTA. You NEVER change the opening line — the first sentence must appear verbatim, word-for-word, exactly as given. Reply with the script text only — no quotes, no markdown.',
          },
          {
            role: 'user',
            content: `Rewrite this voiceover script so it reads as ${targetWords} words (±5%). CRITICAL: keep the FIRST SENTENCE exactly as written, word-for-word — it is the hook and must not change. Only adjust everything after it. Keep the payoff in the middle and end with a strong payoff line. Plain prose only — no scene labels, no stage directions.\n\nSCRIPT:\n${cleanInput}`,
          },
        ],
        temperature: 0.7,
        max_tokens: Math.min(800, Math.max(120, targetWords * 4)),
      },
      { timeout: 20000 }
    )
    const scaled = completion.choices[0]?.message?.content?.trim() ?? ''
    if (scaled) return scaled
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[compose] scaleVoiceoverScript failed, falling back:', msg)
  }

  // Fallback — naive truncate / pad.
  if (words.length > targetWords) return words.slice(0, targetWords).join(' ')
  return cleanInput
}

// Kineo-Audio-2026 — cheap length prediction from word count, used to skip the
// corrective TTS re-synthesis when the script is already sized correctly (see
// TTS_WORDS_PER_SECOND). Mirrors targetWordCount's calibration in reverse.
export function predictTtsSecondsFromWords(words: number): number {
  const n = Number.isFinite(words) && words > 0 ? words : 0
  return n / TTS_WORDS_PER_SECOND
}

// Push #234 — `speed` lets the compose route nudge narration length to the
// requested duration after measuring the first pass. tts-1 accepts 0.25–4.0
// (1.0 = natural). duration scales as 1/speed, so speed<1 lengthens and
// speed>1 shortens. We clamp to a natural-sounding band before sending.
//
// Narration Engine (Phase 1) — `vertical` enables automatic persona selection.
// When provided, generateTTS picks the OpenAI TTS voice and base speed that
// best match the content niche (mystery→onyx slow, finance→onyx normal,
// curiosities→fable fast, geography→echo measured, etc.).
// When absent, falls back to the legacy onyx/1.0 behaviour.
export async function generateTTS(
  script: string,
  speed = 1.0,
  vertical?: string,
  userTier: 'free' | 'premium' | 'cinematic' = 'free',
  language: 'en' | 'pt' | 'es' = 'en',
): Promise<Buffer> {
  // Push #236 — last line of defense: strip any residual script markers /
  // directives so the narrator can never speak "[Pexels: ...]" or a "speed:"
  // line, no matter what upstream produced `script`. Idempotent on clean text.
  const cleaned = stripScriptMarkers(script)

  // ── Phase 2b: ElevenLabs premium provider (flag-gated, fail-open) ─────────
  // When ELEVENLABS_API_KEY is set AND KINEO_ELEVENLABS_ENABLED is on AND the
  // tier is premium/cinematic, narrate via ElevenLabs. ANY failure (missing key,
  // disabled flag, wrong tier, API error) drops straight through to the exact
  // OpenAI tts-1-hd path below — the OpenAI path is completely unchanged.
  // Whisper caption timing later runs on the returned mp3 identically either way.
  if (isElevenLabsEnabled(userTier)) {
    try {
      const persona = vertical
        ? selectPersonaForScript(cleaned, vertical, userTier, language)
        : undefined
      const voiceId =
        persona?.elevenVoiceId ||
        (process.env.ELEVENLABS_VOICE_ID ?? '').trim() ||
        ELEVENLABS_DEFAULT_VOICE_ID
      const elBuffer = await synthesizeWithElevenLabs({
        text: cleaned,
        voiceId,
        stability: persona?.elevenStability,
        similarityBoost: persona?.elevenSimilarity,
        style: persona?.elevenStyle,
        speed: Math.max(0.7, Math.min(1.2, (persona?.defaultSpeed ?? 1.0) * speed)),
      })
      if (elBuffer && elBuffer.length > 0) {
        console.log(
          `[compose] ElevenLabs TTS used (tier=${userTier}, voice=${voiceId.slice(0, 8)}, ${elBuffer.length} bytes)`,
        )
        return elBuffer
      }
    } catch (err) {
      console.warn(
        '[compose] ElevenLabs TTS failed — falling back to OpenAI tts-1-hd:',
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  // ── Phase 1: Narration Engine — persona-driven voice + speed ──────────────
  let resolvedVoice: 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer' = 'onyx'
  let baseSpeed = speed

  if (vertical) {
    const persona = selectPersonaForScript(cleaned, vertical, userTier, language)
    resolvedVoice = persona.voice
    baseSpeed = persona.defaultSpeed * speed
    console.log(
      `[compose] Narration Engine: ${describeVoiceSelection(cleaned, vertical, userTier, language)}`,
    )

    // ── Phase 2: Section-level speed modulation ────────────────────────────
    // When the script has HOOK/MICRO REWARD/ESCALATION/PAYOFF markers, TTS
    // each section at its own speed (hook fast, payoff slow) and concatenate
    // the raw MP3 frames. Falls back to single-pass if no markers detected.
    if (hasViralSections(script)) {
      const sections = splitIntoSections(script, persona)
      if (sections && sections.length >= 2) {
        console.log(
          `[compose] Phase 2 sectioned TTS: ${sections.length} sections`,
          sections.map((s) => `${s.type}×${s.speedMultiplier.toFixed(2)}`).join(', '),
        )
        const { openai } = await import('@/lib/openai')
        const buffers: Buffer[] = []
        for (const [si, section] of sections.entries()) {
          // section speed = persona.defaultSpeed × sectionMultiplier × corrective(speed)
          const sectionSpeed = persona.defaultSpeed * section.speedMultiplier * speed
          const safeSection = Math.max(0.7, Math.min(1.3, sectionSpeed))
          // PUSH #93 (FIX 6) — TTS SPLICE. Each section is synthesised
          // independently and the MP3s are then byte-concatenated below. Every
          // section's audio therefore starts and ends on the first/last spoken
          // sample, so the joins land with a zero-length breath (and the abrupt
          // waveform discontinuity that reads as a click). Real audio
          // processing isn't available here, but the pause CAN be created at
          // the TEXT level: a trailing ellipsis makes the model itself render a
          // short falling-cadence pause and emit the corresponding tail silence
          // INSIDE the section's own mp3, so the concat happens across quiet
          // samples instead of mid-syllable. This is the same mechanism
          // lib/narration/section-tts.ts already relies on (it prepends '... '
          // to mystery/conspiracy PAYOFFs for a dramatic pause), so it is a
          // proven-safe transform in this pipeline — OpenAI TTS renders an
          // ellipsis prosodically and never vocalises it. The LAST section is
          // left untouched: nothing is spliced after it, and we don't want to
          // pad the end of the narration (totalDuration is derived from the
          // measured audio length).
          const sectionText = section.text.trim()
          const isLastSection = si === sections.length - 1
          const pausedText =
            isLastSection || /\.{2,}$/.test(sectionText)
              ? sectionText
              : `${sectionText.replace(/\.+$/, '')}...`
          const input = pausedText.length > 3800 ? pausedText.slice(0, 3800) : pausedText
          // KINEO-OPENAI-HANG-2026-08-05 — TTS overrides the 20s client default.
          const speech = await openai.audio.speech.create(
            {
              model: 'tts-1-hd',
              voice: resolvedVoice,
              input,
              speed: safeSection,
            },
            { timeout: OPENAI_TTS_TIMEOUT_MS, maxRetries: 0 },
          )
          buffers.push(Buffer.from(await speech.arrayBuffer()))
        }
        // PUSH #93 (FIX 6) — the bare byte-concat is kept: re-encoding or
        // frame-level trimming is not possible in this file (no audio deps in
        // the serverless bundle). What the ellipsis above buys us is that each
        // join now falls in a stretch of near-silence rather than immediately
        // after the last voiced sample, which is what made the seam audible.
        return Buffer.concat(buffers)
      }
    }
  }

  // ── Single-pass TTS (no vertical, or no sections detected) ────────────────
  const input = cleaned.length > 3800 ? cleaned.slice(0, 3800) : cleaned
  const safeSpeed = Math.max(0.7, Math.min(1.3, Number.isFinite(baseSpeed) ? baseSpeed : 1.0))
  const { openai } = await import('@/lib/openai')
  // KINEO-OPENAI-HANG-2026-08-05 — TTS overrides the 20s client default.
  const speech = await openai.audio.speech.create(
    {
      model: 'tts-1-hd',
      voice: resolvedVoice,
      input,
      speed: safeSpeed,
    },
    { timeout: OPENAI_TTS_TIMEOUT_MS, maxRetries: 0 },
  )
  return Buffer.from(await speech.arrayBuffer())
}

// OpenAI tts-1 emits constant-bitrate MP3 at ~128 kbps — kept as fallback.
const TTS_MP3_BITRATE_BPS = 128_000

// MPEG Layer-3 bitrate lookup: [MPEG1/2 flag][bitrate index] → kbps
// Index 0 = "free", index 15 = "bad" — both invalid.
const MP3_BITRATE_MPEG1: ReadonlyArray<number> =
  [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
const MP3_BITRATE_MPEG2: ReadonlyArray<number> =
  [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
// MPEG1 sample-rate table (Hz); MPEG2 = half these, MPEG2.5 = quarter.
const MP3_SAMPLERATE_MPEG1: ReadonlyArray<number> = [44100, 48000, 32000, 0]

/**
 * Push #158 / Push #223 — Parse the real playback duration (seconds) of a
 * TTS MP3 buffer by scanning actual MPEG frame headers. This is accurate for
 * both CBR and VBR files and correctly ignores ID3 tag bytes.
 *
 * Falls back to the old byte-rate estimate when no valid frames are found.
 * Returns 0 for empty/unparseable buffers — callers treat 0 as "unknown" and
 * fall back to the requested-duration window.
 */
export function estimateMp3DurationSeconds(buffer: Buffer): number {
  if (!buffer || buffer.length === 0) return 0

  let offset = 0

  // Skip ID3v2 tag — "ID3" + 2-byte version + 1-byte flags + 4-byte syncsafe size.
  if (
    buffer.length > 10 &&
    buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33
  ) {
    const id3Size =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
       (buffer[9] & 0x7f)
    offset = 10 + id3Size
  }

  let totalSamples = 0
  let sampleRate = 0
  let frames = 0
  const MAX_SEARCH_BYTES = 1024 // bytes to scan before giving up on sync

  while (offset + 4 <= buffer.length) {
    // Locate frame-sync word: 0xFF followed by 0xE? (top 11 bits all 1).
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
      // Fast-forward up to MAX_SEARCH_BYTES if we lose sync.
      const searchEnd = Math.min(offset + MAX_SEARCH_BYTES, buffer.length - 4)
      let found = false
      for (let s = offset + 1; s < searchEnd; s++) {
        if (buffer[s] === 0xff && (buffer[s + 1] & 0xe0) === 0xe0) {
          offset = s
          found = true
          break
        }
      }
      if (!found) break
      continue
    }

    const h = buffer.readUInt32BE(offset)

    const versionBits  = (h >> 19) & 0x3  // 3=MPEG1, 2=MPEG2, 0=MPEG2.5, 1=reserved
    const layerBits    = (h >> 17) & 0x3  // 3=Layer1, 2=Layer2, 1=Layer3, 0=reserved
    const bitrateBits  = (h >> 12) & 0xf
    const srBits       = (h >> 10) & 0x3
    const paddingBit   = (h >>  9) & 0x1

    // Reject reserved/bad combos.
    if (
      versionBits === 1 || layerBits === 0 ||
      bitrateBits === 0 || bitrateBits === 0xf ||
      srBits === 3
    ) {
      offset++
      continue
    }

    // We only handle Layer 3 (most common for TTS output).
    if (layerBits !== 1) { offset++; continue }

    const isMpeg1 = versionBits === 3
    const bitrateKbps = (isMpeg1 ? MP3_BITRATE_MPEG1 : MP3_BITRATE_MPEG2)[bitrateBits]
    if (!bitrateKbps) { offset++; continue }

    const srMpeg1 = MP3_SAMPLERATE_MPEG1[srBits]
    if (!srMpeg1) { offset++; continue }
    const sr = isMpeg1 ? srMpeg1 : (versionBits === 2 ? srMpeg1 / 2 : srMpeg1 / 4)

    // Layer3 samples per frame: 1152 for MPEG1, 576 for MPEG2/2.5.
    const samplesInFrame = isMpeg1 ? 1152 : 576

    // Frame byte size = floor(coeff * bitrate_bps / sample_rate) + padding,
    // where coeff = samplesPerFrame / 8 (144 for MPEG1 Layer3 = 1152/8, 72 for
    // MPEG2/2.5 Layer3 = 576/8). Push #242: this was hardcoded to 144, so for a
    // 24 kHz MPEG2 stream (OpenAI tts-1's output) every frameSize came out 2x too
    // large; the scanner then skipped every other frame and reported HALF the
    // real duration — the "32s audio rendered as a 16s video" bug.
    const frameSizeCoeff = isMpeg1 ? 144 : 72
    const frameSize = Math.floor(frameSizeCoeff * bitrateKbps * 1000 / sr) + paddingBit
    if (frameSize < 4 || offset + frameSize > buffer.length) break

    if (!sampleRate) sampleRate = sr
    totalSamples += samplesInFrame
    frames++
    offset += frameSize
  }

  if (sampleRate && totalSamples > 0) {
    const dur = totalSamples / sampleRate
    if (Number.isFinite(dur) && dur > 0) return dur
  }

  // Fallback: CBR byte-rate estimate (original Push #158 logic).
  const seconds = buffer.length / (TTS_MP3_BITRATE_BPS / 8)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0
}

// ---------------------------------------------------------------------------
// Push #175 — Whisper-based caption sync helpers
// ---------------------------------------------------------------------------

export interface WhisperWord {
  word: string
  start: number
  end: number
  // KINEO-SPRINT-12H-2026-07-29 — true when this word is the LAST word of a
  // Whisper SEGMENT whose text ends in `.` `!` `?`. Whisper's word-level
  // tokens carry NO punctuation (verified against production output), which
  // silently broke two things at once:
  //   1. captions ran straight through a full stop — the narration "…think for
  //      it. It's called Fugu" burned on screen as `IT IT'S CALLED`.
  //   2. sentenceStartTimes() tested for `[.!?]$` on those same unpunctuated
  //      tokens, so it ALWAYS returned [] and the Kineo-Beat-2026 cut aligner
  //      below never fired once in production. Dead feature, no error.
  // The SEGMENT stream does carry punctuation, so we ask for both granularities
  // and stamp the boundary back onto the word timeline. Optional so every
  // existing caller and every persisted payload stays valid.
  sentenceEnd?: boolean
}

/**
 * KINEO-SPRINT-12H-2026-07-29
 * Stamp `sentenceEnd` onto the word timeline using the punctuation that only
 * the SEGMENT stream carries.
 *
 * A segment is a contiguous span of audio with a punctuated `text`. If that
 * text ends in `.` `!` or `?`, then the last word falling inside the segment's
 * time range closes a sentence. We match by time, not by string, because the
 * two streams tokenise differently ("63%" is one segment token and three word
 * tokens) — time is the only field that means the same thing in both.
 *
 * Fails open: if segments are missing or malformed, every word comes back
 * unmarked and callers behave exactly as they did before this function existed.
 */
export function markSentenceEnds(
  words: WhisperWord[],
  segments: Array<{ start?: number; end?: number; text?: string }>,
): WhisperWord[] {
  if (!Array.isArray(words) || words.length === 0) return words ?? []
  if (!Array.isArray(segments) || segments.length === 0) return words

  const out = words.map((w) => ({ ...w }))

  for (const seg of segments) {
    const text = (seg?.text ?? '').trim()
    const end = seg?.end
    if (!text || typeof end !== 'number' || !Number.isFinite(end)) continue
    // Trailing closing quote/paren is allowed after the terminator, same shape
    // the old regex in sentenceStartTimes tested for.
    if (!/[.!?]["'”’)\]]?$/.test(text)) continue

    // Last word that STARTS at or before this segment's end. A small epsilon
    // absorbs the sub-frame disagreement between the two streams.
    let idx = -1
    for (let i = 0; i < out.length; i++) {
      if (out[i].start <= end + 0.02) idx = i
      else break
    }
    if (idx >= 0) out[idx].sentenceEnd = true
  }

  // The final word always closes the narration; marking it costs nothing and
  // keeps the last caption chunk from swallowing a trailing fragment.
  out[out.length - 1].sentenceEnd = true
  return out
}

/**
 * Call OpenAI Whisper on the TTS audio buffer to obtain word-level timestamps.
 * Returns an empty array if the call fails so a Whisper outage never blocks
 * the render — proportional distribution is the fallback.
 */
export async function transcribeTTSWithTimestamps(buffer: Buffer): Promise<WhisperWord[]> {
  try {
    const { openai } = await import('@/lib/openai')
    // Push #258 — use openai's `toFile` helper instead of `new File(...)`.
    // `File` is a Web API not available in Node.js 18 (Vercel's default
    // runtime). `toFile` works in both Node.js 18 and 20 and sets the correct
    // filename + MIME type the Whisper API requires.
    // Cast to ArrayBuffer to satisfy TypeScript strict BlobPart typing —
    // buffer.buffer is ArrayBufferLike (ArrayBuffer | SharedArrayBuffer) but
    // Blob only accepts ArrayBuffer. In practice this is always ArrayBuffer here.
    const audioBlob = new Blob(
      [new Uint8Array(buffer.buffer as ArrayBuffer, buffer.byteOffset, buffer.byteLength)],
      { type: 'audio/mpeg' },
    )
    const file = await toFile(audioBlob, 'voiceover.mp3', { type: 'audio/mpeg' })
    // verbose_json + word granularity returns {word, start, end} per token.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transcription: any = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: file as unknown as Parameters<typeof openai.audio.transcriptions.create>[0]['file'],
      response_format: 'verbose_json',
      // KINEO-SPRINT-12H-2026-07-29 — 'segment' added alongside 'word'. Same
      // call, same cost, one extra array in the response. See WhisperWord
      // .sentenceEnd for why: the word stream has no punctuation, the segment
      // stream does. Without this the caption chunker cannot see a full stop
      // and the beat aligner is permanently dead.
      timestamp_granularities: ['word', 'segment'],
    } as Parameters<typeof openai.audio.transcriptions.create>[0],
    // KINEO-OPENAI-HANG-2026-08-05 — Whisper uploads the ENTIRE voiceover mp3
    // (30–90s of audio) and asks for verbose_json with word+segment timestamps.
    // The 20s client default is not enough for a 90s render, and this failure is
    // SILENT: the catch returns [] and captions fall back to proportional
    // distribution, so the symptom is permanently drifting captions on the paid
    // path rather than an error anyone sees.
    { timeout: OPENAI_WHISPER_TIMEOUT_MS, maxRetries: 0 })
    const words: WhisperWord[] = transcription?.words ?? []
    const segments: Array<{ start?: number; end?: number; text?: string }> =
      transcription?.segments ?? []
    const marked = markSentenceEnds(words, segments)
    console.log(
      `[compose] Whisper transcribed ${marked.length} words, ${segments.length} segments, ` +
        `${marked.filter((w) => w.sentenceEnd).length} sentence boundaries`,
    )
    return marked
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[compose] Whisper transcription failed, using proportional fallback:', msg)
    return []
  }
}

// Push #240 — captions were appearing AHEAD of the narration. The earlier
// Push #209 "lead" subtracted 0.4s from every Whisper timestamp, which
// over-corrected and pushed captions earlier than the spoken word. Whisper's
// word `start` already marks when the word is spoken relative to the audio,
// and Creatomate plays that audio from t=0, so the correct nudge is a small
// POSITIVE offset: it lands each caption with — or a hair after — the voice,
// never before it. Clamped to 0 so the first caption never goes negative.
// Push #263 — reduced from 0.3 → 0.15. Whisper timestamps are accurate to
// ~50ms; 0.3s was visibly lagging captions behind the voice. 0.15s keeps a
// tiny guard without perceptible delay.
const CAPTION_SYNC_OFFSET = 0.15 // seconds, added to each caption start

/**
 * Map Whisper word-level timestamps to caption segment boundaries.
 *
 * Strategy: sequential word-count assignment.  Each caption segment owns
 * the next N words from the Whisper transcript (N = word count of that
 * segment's text).  The segment starts when its first word starts and ends
 * when the next segment starts (or at the caption-window end for the last).
 *
 * Returns [{time, duration}] aligned 1:1 with `segments`, or [] on failure.
 */

// KINEO-LIPSYNC-CAPTIONS-2026-08-17 — Whisper sobre o CLIPE (mp4) de uma cena
// de fala com audio nativo: o fundador viu a legenda descolar da boca do ator
// no final do video — a distribuicao uniforme nao ouve o ritmo real da fala.
// Whisper aceita mp4 direto; clipes de 5-10s tem 2-6MB (limite da API: 25MB).
// Fail-open: qualquer falha retorna [] e a legenda cai no comportamento antigo.
// ⚠️ KINEO-LEGENDA-MUDA-2026-08-22 — CADA RECUSA AQUI PASSA A DIZER O PORQÊ.
// Auditoria de 22/08: o Kling 3 saiu com ZERO legenda em 6 de 6 frames, e o
// mecanismo de legenda das cenas de fala existe e está completo desde 17/08.
// Ou seja, ele RODOU E DESISTIU — e desistia em silêncio, com `return []`,
// então não havia como saber em qual dos quatro degraus tinha parado.
// O suspeito nº1 é o teto de 24 MB: esta função baixa o MP4 INTEIRO e o manda
// para o Whisper, quando o que interessa são ~160 KB de áudio. Um clipe do
// Kling 3 Pro em alta qualidade encosta nesse teto com facilidade. Mas eu NÃO
// consegui provar (as URLs dos clipes não são guardadas e o log já rotacionou),
// e o resto do arquivo tem cicatriz suficiente de conclusão apressada. Então
// em vez de adivinhar: cada saída passa a registrar o motivo e o tamanho, e o
// próximo render responde a pergunta sozinho.
export async function transcribeClipWithTimestamps(clipUrl: string): Promise<WhisperWord[]> {
  try {
    if (!/^https:\/\//.test(clipUrl)) {
      console.warn('[compose] clip whisper: URL nao-https, pulando')
      return []
    }
    const res = await fetch(clipUrl)
    if (!res.ok) {
      console.warn(`[compose] clip whisper: download falhou HTTP ${res.status}`)
      return []
    }
    const ab = await res.arrayBuffer()
    const mb = (ab.byteLength / 1024 / 1024).toFixed(1)
    if (ab.byteLength < 10_000) {
      console.warn(`[compose] clip whisper: clipe pequeno demais (${ab.byteLength}B) — provavelmente erro no download`)
      return []
    }
    if (ab.byteLength > 24 * 1024 * 1024) {
      // ESTE é o degrau que eu suspeito ser o culpado do Kling 3. Se aparecer
      // nos logs, a solução definitiva é mandar só o ÁUDIO ao Whisper em vez
      // do vídeo — o teto de 25 MB é da OpenAI e não sobe.
      console.warn(`[compose] clip whisper: clipe ACIMA do teto do Whisper (${mb}MB > 24MB) — legenda desta cena vai pelo fallback de texto`)
      return []
    }
    const { openai } = await import('@/lib/openai')
    const file = await toFile(new Blob([ab], { type: 'video/mp4' }), 'clip.mp4', { type: 'video/mp4' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transcription: any = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: file as unknown as Parameters<typeof openai.audio.transcriptions.create>[0]['file'],
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment'],
    } as Parameters<typeof openai.audio.transcriptions.create>[0], { timeout: OPENAI_WHISPER_TIMEOUT_MS, maxRetries: 0 })
    const words: WhisperWord[] = Array.isArray(transcription?.words) ? transcription.words : []
    return words.filter((w) => typeof w?.word === 'string' && Number.isFinite(w?.start) && Number.isFinite(w?.end))
  } catch (e) {
    console.warn('[compose] clip whisper failed (legenda uniforme):', e instanceof Error ? e.message : String(e))
    return []
  }
}

export function mapWhisperTimingsToSegments(
  words: WhisperWord[],
  segments: Array<{ text: string }>,
  totalAudioDuration: number,
  ctaTailSeconds: number,
): Array<{ time: number; duration: number }> {
  if (words.length === 0 || segments.length === 0) return []

  const result: Array<{ time: number; duration: number }> = []
  let wIdx = 0

  for (let i = 0; i < segments.length; i++) {
    const nWords = Math.max(1, (segments[i].text ?? '').trim().split(/\s+/).filter(Boolean).length)

    if (wIdx >= words.length) {
      // Push #244 — Whisper ran out of words before all segments were processed.
      // Previously this returned [] causing full proportional fallback (no sync).
      // Instead: fill remaining segments proportionally from the last mapped
      // timestamp to the caption-window end so Whisper data is not wasted.
      console.warn('[compose] mapWhisperTimings: ran out of words at segment', i, '— filling remainder proportionally')
      const captionWindowEnd = Math.max(0, totalAudioDuration - ctaTailSeconds)
      const lastEntry = result[result.length - 1]
      const fillStart = lastEntry ? lastEntry.time + lastEntry.duration : 0
      const remaining = segments.slice(i)
      const remainWords = remaining.reduce(
        (sum, s) => sum + Math.max(1, (s.text ?? '').trim().split(/\s+/).filter(Boolean).length),
        0,
      )
      const fillWindow = Math.max(0.1, captionWindowEnd - fillStart)
      let localElapsed = fillStart
      for (const rem of remaining) {
        const remWords = Math.max(1, (rem.text ?? '').trim().split(/\s+/).filter(Boolean).length)
        const slot = Math.max(0.1, (remWords / remainWords) * fillWindow)
        result.push({
          time: Math.round(localElapsed * 1000) / 1000,
          duration: Math.round(slot * 1000) / 1000,
        })
        localElapsed += slot
      }
      return result
    }

    const segStartWord = words[wIdx]
    const captionWindowEnd = Math.max(0, totalAudioDuration - ctaTailSeconds)
    const isLast = i === segments.length - 1
    const nextWordStart =
      !isLast && wIdx + nWords < words.length
        ? words[wIdx + nWords].start
        : captionWindowEnd
    const duration = Math.max(0.1, nextWordStart - segStartWord.start)

    // Push #240 — shift the caption slightly LATER so it never precedes the
    // spoken word (the prior negative lead made captions appear ahead of the
    // voice). Clamped to 0 so the first caption never goes negative.
    const rawTime = segStartWord.start
    const adjustedTime = Math.max(0, rawTime + CAPTION_SYNC_OFFSET)

    result.push({
      time: Math.round(adjustedTime * 1000) / 1000,
      duration: Math.round(duration * 1000) / 1000,
    })
    wIdx += nWords
  }

  return result
}

/**
 * Push #258 — Build caption segments DIRECTLY from Whisper word timestamps.
 *
 * Why this replaces the old script→Whisper mapping approach:
 *   The old flow grouped script words into 7-word chunks then looked up those
 *   chunks' timings from Whisper. Numbers caused drift: "63%" is 1 word in
 *   the script but TTS speaks it as "sixty three percent" (3 Whisper words).
 *   Each such mismatch shifted subsequent captions earlier until by the end
 *   the captions were several beats ahead of the narrator.
 *
 *   This function bypasses the script entirely. It takes Whisper's own words
 *   (the ACTUAL spoken transcript) and groups them into ≤maxWords chunks.
 *   Caption text comes from Whisper, timing comes from Whisper — perfect
 *   sync is guaranteed regardless of how numbers or abbreviations are spoken.
 */
/**
 * KINEO-SPRINT-12H-2026-07-29 — comparison key for the anti-stutter guard.
 *
 * Strips surrounding punctuation and case ONLY, so `the.` and `The` compare
 * equal. It deliberately does NOT stem: an earlier version stripped a trailing
 * `'s`, which made `it` and `It's` compare equal and silently DELETED the word
 * "It's" from the caption of the exact sentence this sprint set out to fix.
 * Caught by the chunker test before it shipped.
 *
 * The guard is a narrow safety net for a genuine repeat ("the the"), nothing
 * more. Sentence boundaries are handled upstream by sentenceEnd and the pause
 * split — this must never be load-bearing, because anything it removes is a
 * word the narrator actually said.
 */
function normalizeCaptionWord(w: string): string {
  return (w ?? '')
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '')
    .trim()
}

// KINEO-KARAOKE-2026-08-17 — cada chunk agora carrega também as PALAVRAS com
// seus timestamps individuais (o mesmo Whisper que já sincroniza o chunk).
// É o dado que o caminho karaoke em buildCaptionElements usa pra pintar de
// amarelo exatamente a palavra sendo narrada. Campo opcional: os caminhos
// proporcionais (sem Whisper) seguem sem ele e nada muda pra eles.
export interface CaptionChunkWord {
  word: string
  start: number
  end: number
}

export function buildCaptionsFromWhisperWords(
  words: WhisperWord[],
  totalAudioDuration: number,
  ctaTailSeconds: number,
  maxWords = 7,
): Array<{ text: string; time: number; duration: number; highlight: string | null; words: CaptionChunkWord[] }> {
  if (words.length === 0) return []

  // Only include words that start before the caption window ends (i.e. before the CTA).
  const captionWindowEnd = Math.max(0, totalAudioDuration - ctaTailSeconds)
  const windowWords = words.filter((w) => w.start < captionWindowEnd)
  if (windowWords.length === 0) return []

  const result: Array<{ text: string; time: number; duration: number; highlight: string | null; words: CaptionChunkWord[] }> = []

  // KINEO-SPRINT-12H-2026-07-29 — chunk on MEANING, not on a modulo.
  //
  // The old loop sliced every `maxWords` words blind. With maxWords=3 (which is
  // what the 212 users who generated a video actually got, and what the
  // Hollywood builder still used) a slice routinely straddled a full stop and
  // burned nonsense on screen: "…think for it. It's called…" rendered as the
  // caption `IT IT'S CALLED`. That artefact is visible today in the product's
  // own homepage proof reel.
  //
  // Two boundary signals, both fail-open:
  //   (a) sentenceEnd — punctuation recovered from the Whisper segment stream.
  //   (b) an audible pause between consecutive words. Whisper reports real
  //       silence, and TTS puts ~0.25–0.5s at a full stop versus ~0.05s inside
  //       a clause, so 0.28s separates them cleanly without needing (a).
  // If neither ever fires, maxWords still closes the chunk and behaviour is
  // identical to the previous implementation.
  const SENTENCE_GAP_SECONDS = 0.28
  const groups: WhisperWord[][] = []
  {
    let current: WhisperWord[] = []
    for (let i = 0; i < windowWords.length; i++) {
      const w = windowWords[i]
      current.push(w)
      const next = windowWords[i + 1]
      const gap = next ? next.start - w.end : Number.POSITIVE_INFINITY
      const boundary =
        current.length >= maxWords ||
        w.sentenceEnd === true ||
        (Number.isFinite(gap) && gap >= SENTENCE_GAP_SECONDS)
      if (boundary) {
        groups.push(current)
        current = []
      }
    }
    if (current.length) groups.push(current)
  }

  for (let i = 0; i < groups.length; i++) {
    const chunk = groups[i]
    // KINEO-KARAOKE-2026-08-17 — usedWords acompanha chunkWords 1:1 (inclusive
    // no corte anti-stutter abaixo) pra que o timestamp de cada palavra exibida
    // seja EXATAMENTE o da palavra falada — sem paralelo, o karaoke pintaria a
    // palavra errada sempre que o guard removesse uma repetição.
    let usedWords = chunk
    let chunkWords = chunk.map((w) => w.word)

    // Anti-stutter guard. Even with clean boundaries, TTS repeats ("it. It's")
    // and Whisper hesitation tokens can put the same word at the tail of one
    // chunk and the head of the next. On screen that reads as a broken render.
    const prevGroup = groups[i - 1]
    const prevLast = prevGroup?.[prevGroup.length - 1]?.word ?? ''
    if (
      chunkWords.length > 1 &&
      prevLast &&
      normalizeCaptionWord(prevLast) === normalizeCaptionWord(chunkWords[0])
    ) {
      chunkWords = chunkWords.slice(1)
      usedWords = usedWords.slice(1)
    }

    const text = chunkWords.join(' ').trim()
    if (!text) continue

    // Caption starts when its first word is spoken (+ sync offset).
    // PUSH #93 (FIX 4) — the FIRST chunk is exempt from CAPTION_SYNC_OFFSET.
    // The offset exists to stop a caption appearing a hair BEFORE the word it
    // transcribes; that risk doesn't exist at t=0 (there is no earlier caption
    // to be confused with), and on a 1–2s hook +0.15s is 7–15% of the entire
    // attention window burned on a blank frame. Every later chunk keeps it.
    const rawStart = chunk[0].start
    const adjustedStart = i === 0 ? Math.max(0, rawStart) : Math.max(0, rawStart + CAPTION_SYNC_OFFSET)

    // Caption ends when next chunk's first word starts, or at window end.
    // KINEO-SPRINT-12H-2026-07-29 — reads the next GROUP, not `windowWords[i +
    // maxWords]`. Groups are now variable length, so the old fixed stride was
    // pointing at an unrelated word the moment any chunk closed early on a
    // sentence boundary — which would have stretched or truncated the caption.
    const nextChunk = groups[i + 1]?.[0]
    const endTime = nextChunk ? nextChunk.start : captionWindowEnd
    // PUSH #93 (FIX 1) — captions may now run to the end of the narration, so
    // clamp the LAST chunk's tail to the window end. Without this the +0.15s
    // sync offset could push the final caption past the audio (and past the
    // timeline) once ctaTailSeconds is 0.
    const duration = Math.max(0.1, Math.min(endTime - rawStart, captionWindowEnd - adjustedStart))

    result.push({
      text,
      time: round3(adjustedStart),
      duration: round3(duration),
      highlight: pickHighlightWord(text),
      // KINEO-KARAOKE-2026-08-17 — timestamps por palavra (ver interface acima).
      words: usedWords.map((w) => ({
        word: (w.word ?? '').trim(),
        start: round3(w.start),
        end: round3(w.end),
      })),
    })
  }

  return result
}

function wordCount(s: string): number {
  const t = (s ?? '').trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

/**
 * Kineo-Beat-2026 — derive sentence-start timestamps (seconds) from the SAME
 * Whisper words the captions use. A sentence start is the `start` time of any
 * word whose PREVIOUS word ended a sentence (`.` `!` `?`, optionally followed by
 * a closing quote/paren). Used to beat-align clip cuts to the narration (esp.
 * the hook→body transition and the pre-payoff beat). Returns [] when there's no
 * usable Whisper data so callers fall open to the fixed cadence.
 */
export function sentenceStartTimes(words: WhisperWord[]): number[] {
  if (!Array.isArray(words) || words.length === 0) return []
  const starts: number[] = []
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1]
    const t = words[i]?.start
    if (typeof t !== 'number' || !Number.isFinite(t)) continue
    // KINEO-SPRINT-12H-2026-07-29 — primary signal is the `sentenceEnd` flag
    // stamped from the Whisper SEGMENT stream (see markSentenceEnds). The old
    // regex below is kept ONLY as a fallback for payloads persisted before this
    // change and for the proportional path, where word text may be punctuated.
    // Relying on the regex alone is what kept this function returning [] on
    // every production render since the feature shipped.
    if (prev?.sentenceEnd === true || /[.!?]["'”’)\]]?$/.test((prev?.word ?? '').trim())) {
      starts.push(t)
    }
  }
  return starts
}

// Push #049 — fix voiceover storage on staging.
//
// Root cause of the prior "Could not store the voiceover" failure:
//   1. The raw-fetch upload was missing the `apikey` header that the
//      Supabase Storage REST API requires alongside the Authorization
//      bearer. Supabase rejects auth-bearer-only Storage uploads.
//   2. Node's `Buffer` is not officially a fetch `BodyInit` (TypeScript
//      flags this), and in some Vercel runtimes the body was getting
//      serialised in an unexpected way, producing a 400 from Storage.
//   3. The error was swallowed — only res.status + first 200 chars were
//      surfaced, hiding the actual Supabase error.body the engineer
//      needed to fix the bucket / policy.
//
// Fix: route the upload through @supabase/supabase-js with the service-
// role key. The library sets the correct headers (apikey + Authorization),
// wraps the binary in a Blob, and returns a typed error object we log in
// full. We also auto-create the bucket on first upload if it doesn't
// exist (idempotent — repeat creates return a known error we ignore).
//
// Returns a public URL (the bucket is created as public, matching how
// Creatomate consumes the audio source — it must be reachable without
// auth headers).
let cachedAdminClient: SupabaseClient | null = null
function getAdminClient(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured.')
  }
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.')
  }
  cachedAdminClient = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cachedAdminClient
}

/**
 * Best-effort bucket bootstrap. If the bucket already exists we ignore
 * the "Bucket already exists" / 409 response. Any other error is
 * surfaced so the caller can see what's wrong.
 */
async function ensureVoiceoverBucket(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.storage.createBucket(VOICEOVER_BUCKET, {
    public: true,
    fileSizeLimit: 25 * 1024 * 1024, // 25 MB is more than enough for ~3min mp3
    allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
  })
  if (!error) {
    console.log(`[compose] created storage bucket "${VOICEOVER_BUCKET}"`)
    return
  }
  const msg = (error.message ?? '').toLowerCase()
  // Supabase returns 409 / "already exists" / "duplicate" — all benign.
  if (
    msg.includes('already exists') ||
    msg.includes('duplicate') ||
    msg.includes('resource already')
  ) {
    return
  }
  // Anything else is an actual problem — log the full error and rethrow.
  console.error('[compose] ensureVoiceoverBucket error:', JSON.stringify(error))
  throw new Error(`Could not ensure storage bucket: ${error.message}`)
}

export async function uploadVoiceoverToSupabase(userId: string, buffer: Buffer): Promise<string> {
  console.log(
    `[compose] uploadVoiceoverToSupabase: user=${userId.slice(0, 8)} size=${buffer.length} bytes mime=audio/mpeg bucket=${VOICEOVER_BUCKET}`,
  )

  // Service-role admin client. Throws if env vars are missing — caller
  // converts that into the user-facing "service not configured" error.
  const admin = getAdminClient()

  // 1) Make sure the bucket exists. First upload of the deployment pays
  //    the bucket-create cost; subsequent uploads see "already exists"
  //    and skip.
  try {
    await ensureVoiceoverBucket(admin)
  } catch (bucketErr) {
    // ensureVoiceoverBucket already logged the full error — re-throw the
    // message verbatim so compose/route.ts can put it into its response.
    throw bucketErr
  }

  // 2) Upload. We wrap the Buffer in a Uint8Array view so the storage
  //    SDK serialises it correctly (Buffer is a subclass but the typing
  //    is happier with Uint8Array, which removes the pre-existing
  //    `BodyInit` TypeScript warning).
  const fileName = `vo-${userId.slice(0, 8)}-${Date.now()}.mp3`
  const filePath = fileName
  console.log(`[compose] storage upload path: ${VOICEOVER_BUCKET}/${filePath}`)

  const audioBytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const { data: uploadData, error: uploadError } = await admin.storage
    .from(VOICEOVER_BUCKET)
    .upload(filePath, audioBytes, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    // Surface the full Supabase error object so the operator sees the
    // root cause in logs (status / details / hint / code). We keep
    // SECRETS out — only the response from Supabase, never the service
    // key itself.
    console.error('[compose] supabase storage upload failed:', JSON.stringify({
      name: uploadError.name,
      message: uploadError.message,
      ...('statusCode' in uploadError ? { statusCode: (uploadError as { statusCode?: unknown }).statusCode } : {}),
      ...('error' in uploadError ? { error: (uploadError as { error?: unknown }).error } : {}),
    }))
    throw new Error(`Voiceover upload failed: ${uploadError.message}`)
  }

  console.log('[compose] supabase storage upload ok:', JSON.stringify(uploadData))

  // 3) Build the public URL. The bucket is created public above; the
  //    SDK returns the canonical public URL for the object.
  const { data: pub } = admin.storage.from(VOICEOVER_BUCKET).getPublicUrl(filePath)
  if (!pub?.publicUrl) {
    throw new Error('Voiceover upload succeeded but no public URL was returned.')
  }
  console.log(`[compose] voiceover public URL: ${pub.publicUrl}`)
  return pub.publicUrl
}

// ---------------------------------------------------------------------------
// Kineo-AudioCache-2026 — content-hash cache for TTS mp3 + Whisper timestamps.
//
// Every render used to re-synthesize OpenAI tts-1-hd AND re-run Whisper, even
// for byte-identical narration (and the corrective pass could fire a SECOND
// full TTS). This cache keys the produced mp3 + its Whisper word-timing JSON by
// hash(finalScript + voice + speed + model) in the existing `voiceovers` bucket
// (mirroring lib/videoCache.ts's HEAD-check idempotent pattern). On a hit we
// skip TTS AND Whisper entirely. Everything here is FAIL-OPEN: any error is
// swallowed and the caller behaves exactly as it does today (fresh synthesis).
// ---------------------------------------------------------------------------

const VOICEOVER_CACHE_PREFIX = 'cache'

export interface CachedVoiceoverEntry {
  /** Public URL of the cached mp3 (usable directly as the voiceover source). */
  voiceoverUrl: string
  /** Whisper word timestamps stored alongside the mp3 (may be empty). */
  words: WhisperWord[]
  /** Measured mp3 duration in seconds. */
  audioDuration: number
}

/**
 * Stable cache key = sha256(finalScript + voice + speed + model). Speed is
 * rounded to 3dp so trivial float noise doesn't fragment the cache.
 */
// KINEO-PREAQUECER-VOZ-2026-08-28 — a salt da chave do cache de voz morava
// como const LOCAL dentro de app/api/compose/route.ts. Com o pré-aquecimento
// (rota /api/prewarm-voiceover) passando a computar a MESMA chave, a salt
// precisa de fonte única — duplicar a string criaria o dia em que um bump de
// versão no compose deixa o prewarm aquecendo chaves mortas em silêncio.
export const VOICEOVER_ENGINE_VERSION = 'v2-push93-section-ellipsis'

export function computeVoiceoverCacheKey(parts: {
  script: string
  voice: string
  speed: number
  model: string
}): string {
  const speed = Number.isFinite(parts.speed) ? Math.round(parts.speed * 1000) / 1000 : 1
  const raw = `${(parts.script ?? '').trim()} ${parts.voice} ${speed} ${parts.model}`
  return createHash('sha256').update(raw).digest('hex')
}

/**
 * Resolve the effective TTS voice + speed the way generateTTS would, so the
 * cache key reflects the actual audio identity. Pure/deterministic given the
 * same inputs; falls back to the legacy onyx/passed-speed identity on any error.
 */
export function resolveTtsVoiceIdentity(
  script: string,
  speed: number,
  vertical: string | undefined,
  userTier: 'free' | 'premium' | 'cinematic',
  language: 'en' | 'pt' | 'es',
  model: string,
): { voice: string; speed: number; model: string } {
  const cleaned = stripScriptMarkers(script)
  if (vertical) {
    try {
      const persona = selectPersonaForScript(cleaned, vertical, userTier, language)
      return { voice: persona.voice, speed: persona.defaultSpeed * speed, model }
    } catch {
      // fall through to legacy identity
    }
  }
  return { voice: 'onyx', speed, model }
}

/**
 * Look up a cached voiceover by key. Returns null on any miss/error (fail-open).
 * HEAD-checks the mp3 (idempotent, like videoCache.ts), then reads the sidecar
 * metadata (Whisper words + measured duration).
 */
export async function lookupCachedVoiceover(cacheKey: string): Promise<CachedVoiceoverEntry | null> {
  try {
    if (!cacheKey) return null
    const admin = getAdminClient()
    const mp3Path = `${VOICEOVER_CACHE_PREFIX}/${cacheKey}.mp3`
    const metaPath = `${VOICEOVER_CACHE_PREFIX}/${cacheKey}.meta.mp3`
    const { data: mp3Pub } = admin.storage.from(VOICEOVER_BUCKET).getPublicUrl(mp3Path)
    const { data: metaPub } = admin.storage.from(VOICEOVER_BUCKET).getPublicUrl(metaPath)
    if (!mp3Pub?.publicUrl || !metaPub?.publicUrl) return null

    const head = await fetch(mp3Pub.publicUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    if (!head.ok) return null

    const metaRes = await fetch(metaPub.publicUrl, { signal: AbortSignal.timeout(5000) })
    if (!metaRes.ok) return null
    const meta = (await metaRes.json()) as { words?: WhisperWord[]; audioDuration?: number }
    const audioDuration =
      typeof meta.audioDuration === 'number' && meta.audioDuration > 0 ? meta.audioDuration : 0
    if (audioDuration <= 0) return null
    const words = Array.isArray(meta.words) ? meta.words : []
    console.log(
      `[compose] voiceover cache HIT key=${cacheKey.slice(0, 12)} words=${words.length} dur=${audioDuration.toFixed(1)}s`,
    )
    return { voiceoverUrl: mp3Pub.publicUrl, words, audioDuration }
  } catch (err) {
    console.warn('[compose] voiceover cache lookup failed (treating as miss):', err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Store a synthesized voiceover (mp3 + Whisper word-timing metadata) under the
 * cache key. Returns the mp3 public URL on success, null on any failure. The
 * metadata sidecar is uploaded with an audio/mpeg content-type (parsed by body,
 * not header) so it passes the `voiceovers` bucket's audio-only MIME allowlist.
 * Fully best-effort — never throws.
 */
export async function storeCachedVoiceover(
  cacheKey: string,
  buffer: Buffer,
  words: WhisperWord[],
  audioDuration: number,
): Promise<string | null> {
  try {
    if (!cacheKey || !buffer || buffer.length === 0 || !(audioDuration > 0)) return null
    const admin = getAdminClient()
    await ensureVoiceoverBucket(admin)
    const mp3Path = `${VOICEOVER_CACHE_PREFIX}/${cacheKey}.mp3`
    const metaPath = `${VOICEOVER_CACHE_PREFIX}/${cacheKey}.meta.mp3`

    const audioBytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    const { error: mp3Err } = await admin.storage
      .from(VOICEOVER_BUCKET)
      .upload(mp3Path, audioBytes, { contentType: 'audio/mpeg', cacheControl: '86400', upsert: true })
    if (mp3Err) {
      console.warn('[compose] voiceover cache mp3 store failed:', mp3Err.message)
      return null
    }

    const metaBytes = new TextEncoder().encode(
      JSON.stringify({ words: words ?? [], audioDuration, createdAt: new Date().toISOString() }),
    )
    const { error: metaErr } = await admin.storage
      .from(VOICEOVER_BUCKET)
      .upload(metaPath, metaBytes, { contentType: 'audio/mpeg', cacheControl: '86400', upsert: true })
    if (metaErr) {
      // mp3 stored but metadata failed → future lookups will miss and re-synth.
      console.warn('[compose] voiceover cache metadata store failed:', metaErr.message)
      return null
    }

    const { data: pub } = admin.storage.from(VOICEOVER_BUCKET).getPublicUrl(mp3Path)
    console.log(`[compose] voiceover cache STORE key=${cacheKey.slice(0, 12)}`)
    return pub?.publicUrl ?? null
  } catch (err) {
    console.warn('[compose] voiceover cache store failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

interface CreatomateElement {
  type: 'video' | 'audio' | 'text' | 'shape'
  track: number
  time: number
  duration: number
  source?: string
  text?: string
  x?: string
  y?: string
  width?: string
  height?: string
  fit?: string
  loop?: boolean
  trim_start?: number
  volume?: string
  // Kineo-Audio-2026 — background-music fades (seconds). Creatomate applies
  // these to audio-carrying elements; safe to set only on the music track.
  audio_fade_in?: number
  audio_fade_out?: number
  fill_color?: string
  stroke_color?: string
  stroke_width?: number
  font_family?: string
  font_size?: number
  font_weight?: string
  // PUSH #93 — safe-zone layout. `y_anchor: '100%'` pins the element by its
  // BOTTOM edge, so a caption that wraps to 2–3 lines grows upward into empty
  // footage instead of downward into YouTube's bottom chrome. `line_height`
  // makes the per-line height deterministic so the worst-case box height can
  // actually be reasoned about (see the SHORTS SAFE-ZONE LAYOUT block).
  x_anchor?: string
  y_anchor?: string
  line_height?: string
  // PUSH #94 — Creatomate compositing mode for shape overlays ('multiply' /
  // 'screen'). Optional on purpose: only the colour-grade shapes set it.
  blend_mode?: string
  // PUSH #95 — SHAPE GEOMETRY. A `type: 'shape'` element has NO geometry other
  // than this SVG-style path (the API default is `"path": null`). x/y/width/
  // height only position and scale the box the path is drawn into — with no
  // `path` the element has nothing to fill, so it DRAWS NOTHING, and Creatomate
  // silently ignores it rather than erroring. Every shape must set this.
  path?: string
  // Push #256 — caption pill background + rounded corners
  background_color?: string
  background_x_padding?: string
  background_y_padding?: string
  border_radius?: number
  enter_transition?: { type: string; duration: number }
  // Push #292 — Ken Burns slow zoom animation
  animations?: unknown[]
}

// PUSH #95 — the ONE rectangle path every shape in this repo uses. Coordinates
// are Creatomate's unitless 0..100 boxed space (NOT percentages): the path is
// drawn into whatever box x/y/width/height define, so this single string is a
// full-bleed rectangle at ANY size. It is byte-for-byte the path Creatomate's
// own Node SDK injects for its `Rectangle` class (Shape + this path) and the
// path their editor emits for a plain fill-only bar. Never hand-write it.
export const RECT_PATH = 'M 0 0 L 100 0 L 100 100 L 0 100 L 0 0 Z'

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000
}

/**
 * Push #066 — build the Creatomate text element(s) for a single caption
 * slot. Renders ONE text element so captions never stack on screen.
 *
 * Visual rule (guided captions):
 *   - If the segment carries a highlight word, the whole caption is
 *     rendered in yellow (#FFD700). The viewer's eye locks onto
 *     high-impact moments without us doing fragile per-word positioning.
 *   - Otherwise the caption renders in white.
 *
 * Why not two layers / inline rich text:
 *   Push #064 used a separate floating yellow accent word above the
 *   white caption. In practice this read as two stacked subtitle lines
 *   and the positioning never landed cleanly on top of the matching
 *   word in the white caption. Per-word inline color via Creatomate
 *   rich-text markup is feature-gated across versions, so a malformed
 *   tag would render as literal `[color]` text — unacceptable.
 *   Whole-line color is the simplest path that's guaranteed to render
 *   correctly on every Creatomate template.
 *
 * Safety: the build is wrapped in try/catch and ALWAYS returns at least
 * the plain white caption element — a failed highlight decision can
 * never break the render.
 */
// Push #256 — Caption quality overhaul:
//   1. Larger font (58→76) + heavier stroke (3→4) for mobile readability.
//   2. Lower position (68%→74%) — closer to the bottom where viewers look on Shorts.
//   3. Dark pill background (background_color + padding) so captions read on
//      any footage, removing the need for a dense stroke alone.
//   4. Word-level highlight: instead of coloring the whole line yellow, we keep
//      the base caption in white and emit a SECOND element on track 7 showing
//      just the highlight keyword in large yellow — creating the "word pop"
//      effect seen in high-retention Shorts. (Push #277 reverted the second
//      element — see the docstring above — so captions in fact emit track 5
//      only, and the track-conflict question below is moot either way.)
//      KINEO-ONE-WATERMARK-2026-08-07 — track 6 (the CTA tail) and track 10
//      (the intro lockup) are no longer emitted at all, so the only other
//      overlay track left in a render is 9, the watermark, at y 5%.
export function buildCaptionElements({
  text,
  time,
  duration,
  highlight,
  emphasize = false,
  hook = false,
  karaokeWords,
}: {
  text: string
  time: number
  duration: number
  highlight?: string | null
  // Fast Mode v2 (d) — true → whole line renders in HIGHLIGHT_COLOR (yellow
  // pop for money/number/power-word chunks).
  // PUSH #93 — this is now passed on EVERY tier, not just Fast (see FIX 3).
  emphasize?: boolean
  // PUSH #93 — true for caption chunks inside the opening hook window: larger
  // font + a stronger enter transition so the first line reads as a hook.
  hook?: boolean
  // KINEO-KARAOKE-2026-08-17 — palavras do chunk com timestamps ABSOLUTOS da
  // timeline (o chamador soma o offset do bloco no Hollywood). Presente com
  // 2+ palavras → modo karaoke: a linha fica branca e a palavra sendo narrada
  // pinta de amarelo via estilo inline `[color]` do Creatomate (documentado
  // oficialmente em creatomate.com/llms/text.md — o receio antigo de tag
  // quebrada era de uma versão anterior da plataforma). Ausente → comporta-se
  // exatamente como antes (uma linha, ênfase por linha inteira).
  karaokeWords?: CaptionChunkWord[]
}): CreatomateElement[] {
  // Push #292 — OpusClip/InVideo quality upgrade:
  //   - UPPERCASE text: standard across all professional Shorts tools
  //   - Font 52→70: larger captions are more readable on mobile
  //   - y: 79%→72%: moved up so more footage is visible below captions
  //   - Pop transition (0.08s) instead of fade: snappier, more energetic
  //   - Slightly narrower pill (88%→84%) to look less like a subtitle bar
  // PUSH #93 — SAFE ZONE. Was `y: '72%'` with `width: '84%'`, `font_size: 70`
  // and the default (center) anchor, so the caption box was centered on 72% and
  // grew SYMMETRICALLY: a 3-word chunk containing a long word wraps to 2–3 lines
  // and each extra line pushed ~37px further DOWN, landing the last line at
  // ~80–84% — squarely under YouTube's title/channel/progress chrome. The pill
  // also reached x≈1024px, i.e. under the like/comment button column.
  // Fix: pin the box by its BOTTOM edge at CAPTION_BOTTOM_Y (78%) so wrapping
  // grows upward into empty footage, narrow it to 78% so it clears the right
  // ~90px chrome, and drop the font 70→62 with an explicit line_height so the
  // worst-case height is predictable (see the SHORTS SAFE-ZONE LAYOUT block).
  const baseCaption: CreatomateElement = {
    type: 'text',
    track: 5,
    time,
    duration,
    text: (text ?? '').toUpperCase(),
    x: '50%',
    y: CAPTION_BOTTOM_Y,
    y_anchor: '100%',
    width: CAPTION_WIDTH,
    font_family: 'Montserrat',
    // PUSH #93 (FIX 4) — the opening chunk is rendered larger so the hook lands
    // with weight. Still bottom-anchored, so the extra height grows upward and
    // the safe-zone floor is unchanged.
    font_size: hook ? CAPTION_HOOK_FONT_SIZE : CAPTION_FONT_SIZE,
    font_weight: '800',
    line_height: '105%',
    // Fast Mode v2 (d) — emphasized chunks go whole-line yellow (mobile-safe:
    // same size/stroke/pill, only the fill changes so contrast never drops).
    fill_color: emphasize ? HIGHLIGHT_COLOR : '#ffffff',
    stroke_color: 'rgba(0,0,0,0.98)',
    // PUSH #94 — 5→3. The spec stacked BOTH a heavy black stroke AND a
    // rgba(0,0,0,0.60) pill; tier-1 tools commit to one or the other, and
    // doubling up just thickens the glyphs into mush at the new 86/104 sizes.
    // We keep the PILL (more legible over busy stock footage than a stroke)
    // and keep a THIN stroke, which still buys separation where a light glyph
    // meets the pill edge. Colour deliberately unchanged.
    stroke_width: 3,
    background_color: 'rgba(0,0,0,0.60)',
    // PUSH #93 — 4%→2.5% so the darkened pill stays left of the 990px
    // action-button column even on a line that fills the full box width.
    // PUSH #94 — 2.5%→3%, and NOT the 4% first proposed. Arithmetic: this
    // padding is a percentage of the ELEMENT WIDTH (CAPTION_WIDTH 78% of
    // 1080px = 842.4px), not of the word, so switching to one word per chunk
    // does NOT shrink it — the pill already hugs the word. Worst case is a
    // single long word that fills the box:
    //   3%  → 842.4 + 2*25.3 = 893.0px → centred span [93.5, 986.5]  ✅
    //   4%  → 842.4 + 2*33.7 = 909.8px → centred span [85.1, 994.9]  ❌
    // 4% breaches BOTH guardrails documented in the safe-zone block (the 90px
    // left margin and the 990px like/comment/share column), so 3% is the
    // largest value that still keeps the #93 guarantee. Slightly more generous
    // than 2.5% (0.29em vs 0.24em at font 86), which is the "hug" we wanted.
    background_x_padding: '3%',
    background_y_padding: '2%',
    border_radius: 10,
    // PUSH #93 (FIX 4) — stronger, slightly longer pop on the hook chunk.
    enter_transition: hook ? { type: 'pop', duration: 0.25 } : { type: 'pop', duration: 0.08 },
  }

  // Push #277 — remove yellow keyword pop (track 7). The two-layer approach
  // (white caption on track 5 + yellow word on track 7) was rendering as two
  // visible subtitle lines which looked like duplicate/random captions to viewers.
  // Single white caption only — clean, no confusion, timing already perfect.

  // ── KINEO-KARAOKE-2026-08-17 — highlight amarelo palavra-a-palavra ────────
  // Pedido do fundador: "o texto mudar de branco pra amarelo na frase em que
  // está sendo narrado". Implementação: em vez de UM elemento por chunk,
  // emitimos um elemento por PALAVRA — todos com texto, posição e pill
  // idênticos, mudando só qual palavra carrega o span [color #FFD700]. Como a
  // troca é instantânea (enter_transition só no primeiro) e o layout é
  // byte-idêntico, o viewer percebe apenas a cor correndo pela frase — o
  // efeito karaoke do Submagic/OpusClip, de graça, em TODOS os motores.
  // Por que isso NUNCA repete o desastre do Push #064: lá eram DOIS elementos
  // SIMULTÂNEOS empilhados (linha branca + palavra amarela flutuante); aqui é
  // sempre UM elemento visível por vez, no mesmo track 5.
  try {
    if (Array.isArray(karaokeWords) && karaokeWords.length > 1 && duration > 0.3) {
      const chunkEnd = round3(time + duration)
      // Fronteiras de exibição: palavra i fica amarela de b[i] até b[i+1].
      // Clampadas ao intervalo do chunk e forçadas monotônicas (Whisper pode
      // reportar starts levemente fora de ordem em tokens colados).
      const bounds: number[] = []
      for (let i = 0; i < karaokeWords.length; i++) {
        const raw = i === 0 ? time : karaokeWords[i].start
        const clamped = Math.min(chunkEnd, Math.max(time, raw))
        bounds.push(round3(Math.max(clamped, bounds[i - 1] ?? time)))
      }
      // Palavras com janela <50ms não ganham elemento próprio (flicker); a
      // anterior simplesmente segue amarela até a próxima fronteira mantida —
      // zero buraco na tela.
      const kept: number[] = [0]
      for (let i = 1; i < karaokeWords.length; i++) {
        const prevStart = bounds[kept[kept.length - 1]]
        if (bounds[i] - prevStart >= 0.05) kept.push(i)
      }
      if (kept.length > 1) {
        const upper = karaokeWords.map((w) => (w.word ?? '').toUpperCase())
        const els: CreatomateElement[] = []
        for (let k = 0; k < kept.length; k++) {
          const i = kept[k]
          const segStart = k === 0 ? time : bounds[i]
          const segEnd = k === kept.length - 1 ? chunkEnd : bounds[kept[k + 1]]
          if (segEnd - segStart < 0.04) continue
          const richText = upper
            .map((w, j) => (j === i ? `[color ${HIGHLIGHT_COLOR}]${w}[/color]` : w))
            .join(' ')
            .trim()
          els.push({
            ...baseCaption,
            time: round3(segStart),
            duration: round3(segEnd - segStart),
            text: richText,
            // Linha branca sempre — o amarelo é da palavra corrente. A ênfase
            // de linha inteira (emphasize) só vale no fallback sem karaoke,
            // senão a linha amarela engoliria o highlight da palavra.
            fill_color: '#ffffff',
            // Pop só na ENTRADA do chunk; as trocas internas são cortes secos
            // pra ler como cor correndo, não como legenda piscando.
            ...(k === 0 ? {} : { enter_transition: undefined }),
          })
        }
        if (els.length > 0) return els
      }
    }
  } catch {
    // Karaoke é enfeite; a legenda é obrigação. Qualquer falha aqui cai no
    // elemento único de sempre.
  }

  return [baseCaption]
}

/**
 * Build a Creatomate source JSON: video clips tiled to fill `duration`,
 * voiceover audio across the full timeline, captions evenly distributed, and —
 * on free renders only — the burnt `usekineo.com/free` watermark across the
 * whole timeline. KINEO-ONE-WATERMARK-2026-08-07: that watermark is the ONLY
 * brand element this builder emits; the CTA tail and both "Made with Kineo"
 * lockups were removed.
 */
export function buildCreatomateSource({
  clipUrls,
  voiceoverUrl,
  voiceoverScript,
  sceneCaptions,
  duration,
  quality,
  realAudioDuration,
  whisperTimings,
  whisperWords,
  musicUrl,
  watermark = false,
  avatarUrl = null,
  avatarHookSeconds = null,
}: ComposeInputs): Record<string, unknown> {
  // Push #199 — use the REAL TTS audio duration as the master timeline length
  // instead of the user-requested duration. This eliminates both the "black
  // screen at the end" (TTS shorter than requested) and the "narration cut off"
  // (TTS longer than requested) problems. The user-selected duration still
  // influences the word-count target in scaleVoiceoverScript, so "45s" still
  // produces a ~45s video — but the exact length is now always driven by the
  // actual audio, never by an arbitrary integer. We cap at 90s and floor at 5s
  // as a sanity guard, and fall back to the requested duration if the TTS
  // measurement failed or returned an implausible value.
  const hasAvatar = typeof avatarUrl === 'string' && avatarUrl.trim().length > 0
  // Avatar duration fix (02/07, TAAFT reviewer bug) — in avatar mode a SHORT
  // measured audio (a one-sentence verbatim line ≈ 3s) is a legitimate value,
  // not a failed measurement, so the plausibility floor drops 4s → 0.5s and
  // the timeline floor drops 5s → 3s. Non-avatar modes keep the old guards.
  const minPlausibleAudio = hasAvatar ? 0.5 : 4
  const masterDuration =
    realAudioDuration && realAudioDuration > minPlausibleAudio && realAudioDuration < 120
      ? realAudioDuration
      : duration
  let totalDuration = clamp(Math.ceil(masterDuration * 10) / 10, hasAvatar ? 3 : 5, 90)
  const cleanClips = clipUrls.filter((u) => typeof u === 'string' && u.trim().length > 0)
  // Avatar tail fix (13/06) — in avatar mode the narration IS the master
  // clock: the lip-synced face and the mp3 are the same length, so the
  // timeline must NEVER outlive the audio. This also lets short verbatim
  // videos (e.g. a 5s greeting) end at ~5s instead of being floored to the
  // 45s-era minimums and padded with unrelated clips (Joseph, 13/06).
  // 02/07 — gate loosened 2s → 0.5s so ultra-short lines also cap the tail.
  if (hasAvatar && realAudioDuration && realAudioDuration > 0.5 && realAudioDuration < 120) {
    totalDuration = Math.min(totalDuration, clamp(Math.ceil((realAudioDuration + 0.4) * 10) / 10, 3, 90))
  }
  // KINEO-TIKTOK-61-2026-08-18 (fundador: "pedi 60, entregou 59 — não vai pro
  // Rewards; esses detalhes precisamos consertar AGORA"): duração pedida >= 60
  // é CONTRATO de monetização — o programa de Rewards do TikTok só paga vídeo
  // ACIMA de 1 minuto, então 59.9s vale zero. O corte final nunca sai abaixo
  // de 61.5s: o loop de clipes abaixo preenche o visual até totalDuration e a
  // trilha cobre o rabo (fade-out já existe); a narração pode terminar 1-2s
  // antes sem prejuízo. Não se aplica ao avatar (lá a narração É o relógio do
  // rosto — esticar deixaria a boca congelada).
  if (!hasAvatar && typeof duration === 'number' && duration >= 60 && totalDuration < 61.5) {
    console.log(`[compose] TIKTOK-61: total ${totalDuration}s abaixo do piso com pedido de ${duration}s — esticado para 61.5s`)
    totalDuration = 61.5
  }
  // Avatar mode can render with ZERO stock clips (talking head carries the
  // whole video); every other mode still requires clips.
  if (cleanClips.length === 0 && !hasAvatar) {
    throw new Error('No video clips provided to compose.')
  }

  const elements: CreatomateElement[] = []

  // ─── PUSH #95 — SHAPE OVERLAY STACK: READ BEFORE TOUCHING ANY ALPHA ─────────
  // A Creatomate `shape` has no geometry except its `path` (see RECT_PATH and
  // the CreatomateElement.path comment). NOT ONE shape in this file ever set
  // it, which means the ENTIRE overlay stack — background, readability scrim,
  // letterbox bars, niche colour grade, side vignette — has been INERT since
  // the day it was written. Every render shipped so far is raw footage plus
  // text. The alphas that accumulated here across #436 / V4 / #94 were tuned
  // against renders where nothing drew, so they were never design decisions —
  // they were untested guesses.
  //
  // Consequence for this push: the first render after this change is the FIRST
  // TIME any of this has existed. Nobody can eyeball it before it reaches
  // paying users, so every alpha below was deliberately dialled DOWN to a
  // conservative first-light value. The intended failure mode is "so subtle you
  // can barely see it", never "too dark / too tinted" — the videos look fine
  // today, so the bar is "better or identical", never "different and hope".
  // ONCE SOMEONE HAS ACTUALLY WATCHED A RENDERED VIDEO: dial these UP toward
  // the old numbers, one step at a time. Do not restore them blind.
  //
  // Also removed here rather than enabled: the top/bottom letterbox bars and
  // the side vignette bars — see the comments at their former call sites.
  // ────────────────────────────────────────────────────────────────────────────

  // Track 1 — solid background so the video never shows a transparent gap.
  // PUSH #95 — now actually draws (RECT_PATH). It sits BEHIND the track-2
  // footage, so enabling it changes nothing visible; it just finally does what
  // this comment always claimed and covers any sub-second gap.
  // KINEO-BLACK-BASE-2026-08-04 — fill hardened #08080f → #000000. The
  // composition never sets a background colour and Creatomate's default canvas
  // is WHITE, so any frame gap between b-roll clips that this base failed to
  // cover flashed white on screen. This full-canvas pure-black plate is the
  // FIRST element on the LOWEST track (track 1, under the track-2 footage),
  // spans the entire timeline (time 0 → totalDuration), and makes any b-roll
  // gap render as invisible black instead of a white flash.
  elements.push({
    type: 'shape',
    track: 1,
    time: 0,
    duration: totalDuration,
    x: '50%',
    y: '50%',
    width: '100%',
    height: '100%',
    path: RECT_PATH,
    fill_color: '#000000',
  })

  // Track 2 — tile / loop the clips to fill the full duration.
  // Clips are placed back-to-back with cumulative `time` (no gap, no overlap)
  // until we cover totalDuration.
  //
  // fit: 'cover' is the right default for a 9:16 output canvas. Most clips
  // are already vertical 9:16 (Runway 720x1280, Pexels portrait HD), where
  // 'cover' and 'contain' produce identical output. The case that matters
  // is the curated stock-library fallback, which contains landscape clips
  // (Cloudinary 1280x720 etc.) — 'contain' would render those as a small
  // strip on a black canvas (the black-screen bug); 'cover' fills the
  // frame with a centered crop. Track 1 still paints a dark background as
  // a safety net for any decode failure.
  //
  // Push #234 — two black-frame fixes:
  //   1. loop: true — stock clips are NOT all 10s (Pexels/cached clips vary
  //      in length). When a clip is shorter than its slot, Creatomate would
  //      otherwise hold a frozen/black frame for the remainder. Looping the
  //      source fills the whole slot with motion instead of a black tail.
  //   2. Removed the per-clip enter_transition fade (Push #202). Because
  //      consecutive same-track clips do NOT overlap here, that fade animated
  //      each clip in FROM the near-black track-1 background, producing a
  //      visible dark dip at every clip boundary — the "gaps pretos" the user
  //      reported. A clean hard cut has no such dip. We also trim the first
  //      0.25s of each clip so any source fade-in-from-black is skipped.
  // Push #438 — was 10s. Lowered to 6s so the timeline cuts more often and a
  // single clip is never held on screen for ~35s when few unique clips resolve.
  // More cuts = more dynamic pacing (closer to viral edit rhythm) and hides the
  // repetition when the fallback has to reuse a clip.
  // Push #445 — but for AI-GENERATED clips (Seedance/Kling) each clip is a UNIQUE
  // ~10s generation, NOT recycled stock. With CLIP_LEN=6 a 60s video only covered
  // 6×6=36s with its 6 clips, so compose re-cycled clips to fill the rest →
  // visible repetition (Joseph's 60s feedback). For AI Gen we let each clip fill
  // up to 10s (its real length), so 6–9 clips cover a 60–90s video with no repeat.
  // Fast stock keeps the tight 6s cut rhythm.
  // KINEO-HOLLYWOOD-2026-07-09 — cinematic_hollywood included for safety (its
  // renders normally go through buildHollywoodCreatomateSource, but if one ever
  // lands here it must get AI-clip pacing, never Fast's 6s recycling).
  const isAiGen =
    quality === 'cinematic_ai' || quality === 'cinematic_kling' || quality === 'cinematic_veo' || quality === 'cinematic_sora' || quality === 'cinematic_hollywood' || quality === 'basic_ai'
  // Fast Mode v2 (02/07) — single gate for every v2 upgrade in this builder.
  // ONLY quality==='fast' (the free stock pipeline) opts in; absent/legacy
  // quality values keep the exact pre-v2 behavior.
  const isFastStock = quality === 'fast'
  // Push #446 — Fast 60s repetition fix. Fast (stock) makes ~1 clip per script
  // beat (~6-7 clips). At CLIP_LEN=6 those 6-7 clips only cover 36-42s, so a ~55s
  // 60s video recycled/repeated clips to fill the rest (Joseph's feedback). Keep
  // the tight 6s cuts on short videos (≤50s, e.g. the 45s that scored well), but
  // for 60s/90s let each Fast clip run up to ~9s so 6-7 clips spread across the
  // full timeline without recycling (slotLen = min(9, total/clips) lands them
  // naturally; the old 6s cap was artificially low for the 6-7 clip case and
  // forced the repeat). AI Gen (unique 10s gens) stays at 10s (see #445).
  const AI_CLIP_LEN = quality === 'cinematic_veo' || quality === 'cinematic_sora' ? 8 : 10
  const CLIP_LEN = isAiGen ? AI_CLIP_LEN : totalDuration > 50 ? 9 : 6
  // Push #256 — reduced from 0.25→0.1. Pexels/Supabase-cached clips rarely have
  // a source fade-in; 0.1s (3 frames) is enough to skip any brief dark frame
  // at the clip head without eating into useful footage.
  const CLIP_TRIM_START = 0.1
  // Push #256 — micro-overlap to prevent the rendering gap at clip boundaries.
  // Each clip element is made 0.06s longer than its timeline slot, so it
  // slightly overlaps the next clip on the same track. Creatomate renders the
  // later element (higher array index) on top, giving a seamless hard cut with
  // no black flash between clips.
  const CLIP_GAP_OVERLAP = 0.06
  // Push #241 — size each slot so EVERY clip appears, in order, within the audio
  // window. The old fixed 10s slots overflowed the timeline and silently dropped
  // the later clips: a 7-clip / ~52s verbatim script laid clips across 0–70s, so
  // the video (which ends at the ~52s audio length) never reached its final
  // skyline clip and footage drifted a full beat off the narration. Dividing the
  // timeline by the clip count lands all clips on-screen and roughly on their
  // beats. The CLIP_LEN cap preserves the old behavior when there are too few
  // clips to fill the window (e.g. a 2-clip / 90s GPT-scene video): the loop
  // re-cycles them at 10s each for the remainder instead of stretching one clip.
  // ── AI Avatar mode (feature/ai-avatar) ────────────────────────────────
  // The talking head is the MAIN video, muted (the voiceover on track 4 is
  // the one audio source — VEED lip-synced to that exact mp3, so timeline
  // alignment keeps lips in sync). Stock clips appear as periodic full-frame
  // CUTAWAYS. Rhythm: the HOOK (first 6s) and the PAYOFF (last 6s) always
  // stay on the face; in between, a 4s cutaway every 12s.
  //
  // Checkpoint-1 feedback fix (telas pretas): v1 stacked the cutaways ON TOP
  // of a single full-length avatar element on the SAME track. Creatomate does
  // not reliably render fully-overlapping same-track elements (only the tiny
  // #256 micro-overlap is proven), and the conflict resolution produced black
  // gaps. v2 builds track 2 STRICTLY SEQUENTIALLY — avatar segment → cutaway →
  // avatar segment — with no overlap beyond the #256 micro-overlap. Each
  // avatar segment uses trim_start = its timeline position, so the (muted)
  // talking head resumes exactly where the narration is and lip sync is
  // preserved across every cut. This is the same battle-tested sequential
  // pattern as the standard clip tiling below.
  if (hasAvatar && avatarHookSeconds != null && avatarHookSeconds > 2 && cleanClips.length > 0) {
    // ── Hook Avatar (Face-app wave 1, 12/06) ──────────────────────────────
    // The avatar MP4 only contains the lip-synced HOOK (first ~8s of the
    // narration, byte-sliced from the same mp3 → zero drift). Face on screen
    // for [0, hook], then standard b-roll tiling carries the timeline to the
    // end. Same sequential no-overlap pattern as everywhere else.
    const hookEnd = round3(Math.min(avatarHookSeconds, totalDuration - 1))
    elements.push({
      type: 'video',
      track: 2,
      time: 0,
      duration: round3(hookEnd + CLIP_GAP_OVERLAP),
      source: avatarUrl as string,
      fit: 'cover',
      loop: false,
      x: '50%',
      y: '50%',
      width: '100%',
      height: '100%',
      volume: '0%',
    })
    const remainingWindow = totalDuration - hookEnd
    const hookSlotLen = Math.min(CLIP_LEN, remainingWindow / cleanClips.length)
    let hookCursor = hookEnd
    let hi = 0
    while (hookCursor < totalDuration) {
      const remaining = totalDuration - hookCursor
      const segLen = round3(Math.min(hookSlotLen, remaining))
      const zoomIn = hi % 2 === 0
      elements.push({
        type: 'video',
        track: 2,
        time: round3(hookCursor),
        duration: round3(segLen + CLIP_GAP_OVERLAP),
        source: cleanClips[hi % cleanClips.length],
        fit: 'cover',
        loop: true,
        trim_start: CLIP_TRIM_START,
        x: '50%',
        y: '50%',
        width: '100%',
        height: '100%',
        volume: '0%',
        animations: [
          {
            type: 'scale',
            fade: false,
            start_scale: zoomIn ? '100%' : '108%',
            end_scale: zoomIn ? '108%' : '100%',
            easing: 'linear',
          },
        ],
      })
      hookCursor = round3(hookCursor + segLen)
      hi += 1
    }
    console.log(
      `[compose] hook-avatar mode: face 0–${hookEnd}s, ${cleanClips.length} clip(s) tiling ${round3(remainingWindow)}s, total ${totalDuration}s`,
    )
  } else if (hasAvatar) {
    // 1) Compute the cutaway windows first.
    const CUTAWAY_LEN = 4
    const CUTAWAY_EVERY = 12 // window start → next window start (8s face + 4s b-roll)
    const FACE_HEAD = 6 // hook stays on the face
    const FACE_TAIL = 6 // payoff + CTA stay on the face
    const cutStarts: number[] = []
    // Tail fix (13/06) — short avatar videos (< 16s, e.g. verbatim one-liners)
    // get ZERO cutaways: the face carries the whole thing.
    if (cleanClips.length > 0 && totalDuration >= 16) {
      let t = FACE_HEAD
      while (t + CUTAWAY_LEN <= totalDuration - FACE_TAIL) {
        cutStarts.push(t)
        t += CUTAWAY_EVERY
      }
    }

    // 2) Walk the timeline emitting non-overlapping segments in order.
    const pushAvatarSegment = (from: number, to: number) => {
      const len = to - from
      if (len <= 0.05) return
      elements.push({
        type: 'video',
        track: 2,
        time: round3(from),
        // #256 micro-overlap so the boundary with the NEXT element is a clean
        // hard cut with no rendering gap (black flash).
        duration: round3(len + CLIP_GAP_OVERLAP),
        source: avatarUrl as string,
        fit: 'cover',
        loop: false,
        // Resume the talking head at its own timeline position — keeps the
        // lips locked to the narration after every cutaway.
        trim_start: round3(from),
        x: '50%',
        y: '50%',
        width: '100%',
        height: '100%',
        volume: '0%',
      })
    }

    let cursor = 0
    cutStarts.forEach((cutStart, ci) => {
      pushAvatarSegment(cursor, cutStart)
      const zoomIn = ci % 2 === 0
      elements.push({
        type: 'video',
        track: 2,
        time: round3(cutStart),
        duration: round3(CUTAWAY_LEN + CLIP_GAP_OVERLAP),
        source: cleanClips[ci % cleanClips.length],
        fit: 'cover',
        loop: true, // short stock clips fill the whole 4s window (no black tail)
        trim_start: CLIP_TRIM_START,
        x: '50%',
        y: '50%',
        width: '100%',
        height: '100%',
        volume: '0%',
        animations: [
          {
            type: 'scale',
            fade: false,
            start_scale: zoomIn ? '100%' : '108%',
            end_scale: zoomIn ? '108%' : '100%',
            easing: 'linear',
          },
        ],
      })
      cursor = cutStart + CUTAWAY_LEN
    })
    // Final face segment through the very end of the timeline (payoff + CTA).
    pushAvatarSegment(cursor, totalDuration)

    console.log(
      `[compose] avatar mode v2 (sequential): ${cutStarts.length} cutaway(s), ${cleanClips.length} clip(s), total ${totalDuration}s`,
    )
  } else {
  // Fast Mode v2 (a) — RITMO: fast stock cuts every 2.5–4s (generate-video-fast
  // now sources 2 ranked clips per scene, so total/count lands inside the band;
  // when few clips resolve, the clamp still forces frequent cuts by cycling).
  // Non-fast modes keep the exact pre-v2 slot math.
  const slotLen = isFastStock
    ? clamp(totalDuration / cleanClips.length, FAST_MIN_CUT_SECONDS, FAST_MAX_CUT_SECONDS)
    : Math.min(CLIP_LEN, totalDuration / cleanClips.length)
  // Kineo-Beat-2026 — beat-align cut points to narration sentence starts (from
  // the SAME Whisper words the captions use), so scene changes land on the
  // hook→body and pre-payoff beats instead of a blind fixed clock. Each cut's
  // end is snapped to the nearest sentence start within a sensible min/max band
  // around the target slot. FAIL-OPEN: no Whisper data (or no beat in range) →
  // the exact fixed cadence used before (segLen = min(slotLen, remaining)).
  const beatTimes =
    Array.isArray(whisperWords) && whisperWords.length > 0
      ? sentenceStartTimes(whisperWords).filter((t) => t > 0 && t < totalDuration)
      : []
  const minCut = isFastStock ? FAST_MIN_CUT_SECONDS : Math.max(1.5, slotLen - 1.8)
  const maxCut = isFastStock ? FAST_MAX_CUT_SECONDS : Math.min(CLIP_LEN, slotLen + 2.5)
  let cursor = 0
  let i = 0
  while (cursor < totalDuration) {
    const remaining = totalDuration - cursor
    let segLen = round3(Math.min(slotLen, remaining))
    // Snap this cut's END to the nearest sentence start inside [min,max]. Only
    // when there's still more than a full max-slot of timeline left, so the
    // final clip keeps the plain fixed behavior and never leaves a stub.
    if (beatTimes.length > 0 && remaining > maxCut) {
      const idealEnd = cursor + slotLen
      const lo = cursor + minCut
      const hi = cursor + maxCut
      let best: number | null = null
      let bestDist = Infinity
      for (const t of beatTimes) {
        if (t <= lo || t >= hi) continue
        const d = Math.abs(t - idealEnd)
        if (d < bestDist) {
          bestDist = d
          best = t
        }
      }
      if (best != null) {
        const snapped = round3(best - cursor)
        if (snapped >= minCut && snapped <= remaining) segLen = snapped
      }
    }
    if (!(segLen > 0.4)) segLen = round3(Math.min(slotLen, remaining))
    const url = cleanClips[i % cleanClips.length]
    // KINEO-SPRINT-12H-2026-07-29 — RE-ENTRY OFFSET on recycled footage.
    //
    // A 45s Short cut every 2.5–4s needs 12–18 slots, and the B-roll search
    // routinely returns 5–7 usable clips, so `i % cleanClips.length` shows the
    // viewer the SAME shot, from the SAME first frame, two or three times. That
    // is the single most legible "cheap AI video" tell there is, and it lands
    // on the free tier — the tier whose output decides whether the 82% of users
    // who make exactly one video ever make a second.
    //
    // Stock clips are typically 10–30s while a slot is 2.5–4s, so the later
    // seconds of the file are footage nobody has seen. Entering the same file
    // at a later timestamp on each reuse reads as a different shot, at zero
    // cost and with no new dependency. `trim_start` is already used on this
    // exact element (below), so this adds no new Creatomate surface.
    //
    // Conservative on purpose: the true duration of each clip is not known here
    // (the B-roll search does not return it), so the offset is capped at ~6s.
    // Creatomate clamps a trim_start past the end of a shorter file back to the
    // start, which is the pre-existing behaviour — worst case we are exactly
    // where we were, never broken.
    const reuseIndex = Math.floor(i / cleanClips.length)
    const clipTrimStart =
      reuseIndex > 0
        ? round3(CLIP_TRIM_START + Math.min(reuseIndex * (segLen + 0.6), 6))
        : CLIP_TRIM_START
    // Push #292 — Ken Burns slow zoom. Alternate zoom-in / zoom-out so
    // consecutive clips don't feel like the same motion. start_scale 100%→108%
    // for even clips (zoom in), 108%→100% for odd clips (zoom out). The
    // 8% scale range is subtle enough not to feel fake on stock footage
    // but clearly visible as "alive" motion to the viewer.
    const zoomIn = i % 2 === 0
    // Fast Mode v2 (b) — MOVIMENTO: cycle a 4-step Ken Burns pattern (center
    // push/pull + anchored push-ins that read as lateral pans) so consecutive
    // cuts never repeat the same motion. Fast only; others keep #292 behavior.
    // KINEO-SPRINT-12H-2026-07-29 — the pattern index is offset by the reuse
    // pass as well as the slot index. Without the offset, a clip list whose
    // length is a multiple of 4 (the pattern length) would pair every recycled
    // clip with the identical camera move, undoing half the work of the
    // re-entry offset above.
    const kb = isFastStock
      ? FAST_KEN_BURNS_PATTERN[(i + reuseIndex) % FAST_KEN_BURNS_PATTERN.length]
      : null
    // KINEO-CLIP-COVER-2026-08-04 — INVARIANT, audited after the founder's
    // Fast print ("clip as a smaller centered rectangle with dark margins"):
    // every b-roll element MUST cover 100% of the canvas — fit 'cover',
    // x/y 50%, width/height 100%, and every scale animation (Ken Burns
    // included) must stay >= 100% at all times, or the black track-1 base
    // shows as a margin. The rectangle in that print was NOT this element:
    // it was the partial-canvas 70%x55% 'screen' glow (fixed by
    // KINEO-WASH-FIX-2026-08-04), which the render predated because that
    // commit had not been deployed yet. Clip geometry here was verified
    // correct; do not shrink these values or add sub-100% zooms.
    const elem: CreatomateElement = {
      type: 'video',
      track: 2,
      time: round3(cursor),
      duration: round3(segLen + CLIP_GAP_OVERLAP), // micro-overlap → no gap
      source: url,
      fit: 'cover',
      loop: true,
      trim_start: clipTrimStart, // KINEO-SPRINT-12H-2026-07-29 — see reuseIndex above
      x: '50%',
      y: '50%',
      width: '100%',
      height: '100%',
      volume: '0%',
      animations: [
        kb
          ? {
              type: 'scale',
              fade: false,
              start_scale: kb.from,
              end_scale: kb.to,
              x_anchor: kb.xAnchor,
              y_anchor: '50%',
              // PUSH #94 — see the easing note on the sibling branch below.
              easing: 'ease-out',
            }
          : {
              type: 'scale',
              fade: false,
              start_scale: zoomIn ? '100%' : '108%',
              end_scale: zoomIn ? '108%' : '100%',
              // PUSH #94 — 'linear' → 'ease-out'. A constant-velocity zoom is
              // the giveaway that a machine made the move; real camera pushes
              // decelerate, so the shot "settles" instead of being yanked for
              // its whole duration. NOTE: 'linear' is the ONLY easing keyword
              // anywhere in this repo, so there is no in-repo precedent to copy
              // for the non-linear case — 'ease-out' is the CSS-style keyword
              // Creatomate documents. If the API rejects or ignores an unknown
              // keyword it falls back to its default easing, which is no worse
              // than the linear we had; nothing else about the animation
              // changes. Verify on the next render before copying this to the
              // avatar-mode Ken Burns blocks above, which stay 'linear'.
              easing: 'ease-out',
            },
      ],
    }
    elements.push(elem)
    cursor = round3(cursor + segLen)
    i += 1
  }
  } // end avatar/standard track-2 branch

  // Track 3 — soft dark overlay so caption text always reads on any clip.
  // PUSH #95 — first alpha that actually draws: 0.30 → 0.14. This scrim only
  // has to help captions read, and captions already carry their own stroke AND
  // pill background from PUSH #93/#256, so it does not need to be heavy. 0.30
  // over the whole frame would visibly mute every clip.
  elements.push({
    type: 'shape',
    track: 3,
    time: 0,
    duration: totalDuration,
    x: '50%',
    y: '50%',
    width: '100%',
    height: '100%',
    path: RECT_PATH,
    fill_color: 'rgba(0,0,0,0.14)',
  })

  // PUSH #95 — REMOVED: Push #292's top & bottom "letterbox" bars (two
  // rgba(0,0,0,0.65) rectangles, 100%×20%, at y 10% and y 90%). They never had
  // a `path`, so they never drew a pixel and deleting them is a strict no-op
  // today. DO NOT RE-ADD THEM: they are hard-edged (a rectangle path cannot
  // express the dark→transparent gradient #292's comment described), they would
  // black out 40% of a 9:16 frame, and the bottom one would sit directly over
  // the caption safe zone that PUSH #93 exists to protect. If the cinematic
  // band look is ever actually wanted, it needs a real gradient asset, not a
  // shape.

  // Push #436 — CINEMATIC COLOR GRADE + VIGNETTE. Stock clips from Pexels each
  // arrive with their own color temperature and look, so a multi-clip Fast video
  // feels like a patchwork. These low-opacity overlays unify every clip into one
  // graded, premium look (the single biggest "make stock look produced" trick),
  // closing the gap toward AI Generated — for free, applied to every Fast video.
  //
  // KINEO-FAST-V4 (10/07) — NICHE-AWARE GRADE. One fixed teal wash made every
  // niche look the same; real colorists grade money content warm/gold, mystery
  // deep blue, geography teal/orange. Detected from the narration itself —
  // zero new params, works for every caller. Unknown niche keeps #436's grade.
  const gradeText = (voiceoverScript ?? '').toLowerCase()
  // PUSH #94 — REAL GRADE VIA BLEND MODES. A flat-alpha overlay is not a grade:
  // compositing an opaque-ish colour over the frame at constant alpha LIFTS THE
  // BLACKS (a 0% pixel becomes the wash colour) and compresses the range, so
  // the footage ends up hazier and flatter — the opposite of "cinematic". Real
  // split-toning multiplies into the shadows and screens into the highlights.
  // So: wash → 'multiply' (darkens/tints shadows, leaves highlights alone) and
  // glow → 'screen' (lifts highlights only, never touches blacks).
  //
  // Alphas: the wash values are REDUCED ~⅓ (0.15→0.10, 0.17→0.11, 0.14/0.13→
  // 0.09). Multiply darkens far more aggressively than flat alpha at the same
  // number, so keeping the old values would crush the shadows on the honoured
  // path. Glow alphas are untouched — they are already tiny (0.05–0.07) and
  // 'screen' at that strength is a whisper, which is what we want.
  //
  // PUSH #94's note said blend_mode was unverified and the worst case was the
  // old flat-alpha look. PUSH #95 found the real story: `blend_mode` IS a
  // documented base-element property and was never the problem — the SHAPE
  // carrying it had no `path`, so neither the wash nor the glow ever composited
  // at all, in any mode. Both now draw for the first time.
  //
  // PUSH #95 ALPHAS — first-light values, deliberately conservative. Wash
  // 0.10/0.11/0.09/0.09 → 0.07/0.08/0.06/0.06; multiply at a genuinely applied
  // alpha bites much harder than the same number did on paper, and a grade that
  // is too strong is far more damaging than one nobody notices. Glow alphas are
  // unchanged (0.05–0.07): they were already a whisper and 'screen' can only
  // lift. HUES ARE UNCHANGED — only alpha moved. Dial the wash back up toward
  // 0.10 once someone has watched a real render.
  const grade = /\b(billionaire|millionaire|wealth|money|invest|luxur|rich|dollar|business)\b/.test(gradeText)
    ? { wash: 'rgba(35,26,8,0.07)',  glow: 'rgba(255,190,80,0.07)' }   // wealth: warm gold
    : /\b(mystery|mysterious|unexplained|vanish|disappear|haunted|secret|creepy)\b/.test(gradeText)
    ? { wash: 'rgba(8,14,40,0.08)',  glow: 'rgba(120,150,255,0.05)' }  // mystery: deep blue
    : /\b(volcano|desert|island|mountain|ocean|country|village|glacier|jungle|crater)\b/.test(gradeText)
    ? { wash: 'rgba(10,32,40,0.06)', glow: 'rgba(255,140,50,0.06)' }   // places: teal/orange doc
    : { wash: 'rgba(12,34,51,0.06)', glow: 'rgba(255,150,60,0.05)' }   // default (#436 palette)
  // (a) Niche wash over the whole frame → cohesion + moody cinematic tone.
  elements.push({
    type: 'shape',
    track: 3,
    time: 0,
    duration: totalDuration,
    x: '50%',
    y: '50%',
    width: '100%',
    height: '100%',
    path: RECT_PATH,
    fill_color: grade.wash,
    // PUSH #94 — tint the shadows instead of veiling the whole frame.
    blend_mode: 'multiply',
  })
  // (b) Complementary highlight lift in the center → reads as "color graded",
  //     not just tinted. Very subtle, center-weighted.
  elements.push({
    type: 'shape',
    track: 3,
    time: 0,
    duration: totalDuration,
    // KINEO-WASH-FIX-2026-08-04 — this glow used to be a 70%x55% shape
    // centered at y 48%. 'screen' at constant alpha lifts BLACKS too (black
    // pixel -> glow color at its alpha), so on dark scenes the partial-canvas
    // shape showed up as a fixed translucent bright rectangle with hard edges.
    // Full-canvas keeps the highlight-lift intent with no visible border.
    x: '50%',
    y: '50%',
    width: '100%',
    height: '100%',
    path: RECT_PATH,
    fill_color: grade.glow,
    // PUSH #94 — lift only the highlights; 'screen' can never darken, so this
    // is the safe half of the split-tone. Alpha unchanged (already a whisper).
    blend_mode: 'screen',
  })
  // (c) PUSH #95 — REMOVED: the left/right "vignette" bars (two
  // rgba(0,0,0,0.40) rectangles, 8%×100%, at x 4% and x 96%). They never had a
  // `path` so they never drew; deleting them is a no-op today. DO NOT RE-ADD
  // THEM AS SHAPES: a vignette needs a radial falloff and a rectangle path has
  // hard edges by definition, so enabling these would put two visible black
  // bands down the sides of the frame — not a vignette, just bars. They also
  // referenced the top/bottom letterbox, which this push deleted too. A real
  // vignette here would need a PNG/gradient overlay asset.

  // Track 4 — voiceover. Duration = actual audio length so Creatomate
  // doesn't pad or truncate the audio file. totalDuration already equals
  // realAudioDuration (see master-duration logic above), so this is a
  // no-op in normal operation; it acts as an explicit guard for edge cases.
  // 02/07 — guard follows minPlausibleAudio (0.5s in avatar mode) so a short
  // verbatim mp3 keeps its own length instead of inheriting totalDuration.
  const audioDuration = round3(
    masterDuration && masterDuration > minPlausibleAudio ? masterDuration : totalDuration
  )
  elements.push({
    type: 'audio',
    track: 4,
    time: 0,
    duration: audioDuration,
    source: voiceoverUrl,
    volume: '100%',
  })

  // Track 5 (+ Track 7 for keyword pops) — captions.
  //
  // Push #258 — DIRECT WHISPER PATH (primary, drift-free):
  //   When whisperWords are available, captions are built directly from Whisper's
  //   own transcript words grouped into ≤7-word chunks. Caption text + timing both
  //   come from Whisper, so there is zero possibility of desync caused by number
  //   expansion (e.g. script "63%" vs TTS "sixty three percent"). This replaces the
  //   old script-segment → Whisper-timing mapping that drifted on number-heavy scripts.
  //
  // PROPORTIONAL FALLBACK (when Whisper is unavailable):
  //   Falls back to script-text segments with word-count-proportional timing.
  //   This is less accurate but always produces something on screen.
  if (Array.isArray(whisperWords) && whisperWords.length > 0) {
    // Direct path — perfect sync guaranteed.
    // Push #292 — 3 words/chunk (was 4). Shorter, punchier lines match
    // OpusClip/InVideo style — each caption appears and disappears quickly,
    // creating more visual energy and easier mobile readability.
    // PUSH #93 (FIX 1) — was `CTA_TAIL_SECONDS`. Captions were hard-truncated
    // 2.5s before the end of the timeline while the voiceover element ran the
    // FULL audioDuration at 100%. Because totalDuration is DERIVED from the
    // measured audio, the narrator is essentially always still speaking in that
    // window — so the PAYOFF, the single most important line of the video, was
    // spoken with no caption on screen, on every render. Tail is now 0: captions
    // cover the narration to its end. They still cannot run past the audio —
    // captionWindowEnd is the audio length and the last chunk is clamped to it
    // inside buildCaptionsFromWhisperWords. Nothing competes for that band any
    // more — KINEO-ONE-WATERMARK-2026-08-07 deleted the tail CTA outright, so a
    // caption blackout at the end of the timeline would buy nothing.
    const directCaps = buildCaptionsFromWhisperWords(
      whisperWords,
      Math.min(masterDuration, totalDuration),
      0,
      // PUSH #94 — one word per chunk (was the literal 3). Every caption is now
      // the word being spoken, which IS the tier-1 active-word look.
      CAPTION_WORDS_PER_CHUNK,
    )
    // KINEO-HOOK-SENTENCE-2026-07-31 — the hook treatment now covers the WHOLE
    // first sentence, not a blind 2-second clock.
    //
    // What viewers saw before: CAPTION_HOOK_WINDOW_SECONDS = 2, but a spoken
    // hook line ("What if a tiny ant dreamed of being a superhero?") runs 3-4s.
    // The caption rendered LARGE for the first two seconds and then SHRANK
    // mid-sentence — a visible size pop in the middle of the one line whose
    // entire job is to hold attention. Every production render had this.
    //
    // Now the window ends where the first spoken sentence ends, read from the
    // same sentenceEnd flags the caption chunker already uses (recovered from
    // the Whisper SEGMENT stream on 29/07 — this is the second feature that
    // boundary data pays for). Clamped to [2s, 6s]: never shorter than the old
    // behaviour, never past the attention window even if punctuation is weird.
    // Fail-open: no sentenceEnd found → exactly the old 2s constant.
    const firstSentenceEndsAt = (() => {
      const w = whisperWords.find((x) => x.sentenceEnd === true)
      return w && Number.isFinite(w.end)
        ? Math.min(6, Math.max(CAPTION_HOOK_WINDOW_SECONDS, w.end))
        : CAPTION_HOOK_WINDOW_SECONDS
    })()
    for (const cap of directCaps) {
      elements.push(...buildCaptionElements({
        text: cap.text,
        time: cap.time,
        duration: cap.duration,
        highlight: cap.highlight,
        // PUSH #93 (FIX 3) — was `isFastStock && ...`, which gated the modern
        // highlighted-keyword look to quality==='fast' (the FREE stock tier)
        // and gave every PAYING tier (pro / cinematic / hollywood) flat white
        // captions — exactly backwards. Emphasis now applies on all tiers.
        emphasize: FAST_EMPHASIS_RE.test(cap.text),
        // PUSH #93 (FIX 4) — opening chunks get the hook treatment.
        // KINEO-HOOK-SENTENCE-2026-07-31 — window = first sentence, not 2s.
        hook: cap.time < firstSentenceEndsAt,
        // KINEO-KARAOKE-2026-08-17 — timestamps por palavra (já absolutos na
        // timeline: o Whisper transcreveu a narração inteira).
        karaokeWords: cap.words,
      }))
    }
  } else {
    // Proportional fallback — script segments with word-count proportional slots.
    // Push #292 — 3 words/chunk (was 4). Matches directCaps limit above.
    // PUSH #94 — both paths now read the same constant, so the Whisper and the
    // proportional-fallback renders can never disagree on caption granularity.
    const scriptSegments = buildCaptionSegments(voiceoverScript, CAPTION_WORDS_PER_CHUNK)
    const captionsClean: CaptionSegment[] = scriptSegments.length > 0
      ? scriptSegments
      : sceneCaptions
          .map((c) => (c ?? '').toString().trim())
          .filter((c) => c.length > 0)
          .map((text) => ({ text, highlight: pickHighlightWord(text) }))
    if (captionsClean.length > 0) {
      const measured = realAudioDuration && realAudioDuration > 0 ? realAudioDuration : totalDuration
      // PUSH #93 (FIX 1) — the `- CTA_TAIL_SECONDS` here was the same defect as
      // on the Whisper path: it deleted the last 2.5s of captions while the
      // narration kept playing. The window is now the full narration length
      // (still capped at totalDuration, so captions never outlive the audio).
      const captionWindow = Math.max(2, Math.min(measured, totalDuration))
      const totalWords = captionsClean.reduce((sum, c) => sum + wordCount(c.text), 0) || captionsClean.length
      let elapsed = 0
      captionsClean.forEach((segment, idx) => {
        const portion = (wordCount(segment.text) || 1) / totalWords
        const isLast = idx === captionsClean.length - 1
        const slot = isLast ? Math.max(0.1, captionWindow - elapsed) : portion * captionWindow
        const time = elapsed
        elapsed += slot
        elements.push(...buildCaptionElements({
          text: segment.text,
          time: round3(time),
          duration: round3(slot),
          highlight: segment.highlight,
          // PUSH #93 (FIX 3) — same tier-inversion fix as the Whisper path:
          // emphasis is no longer gated on quality==='fast'.
          emphasize: FAST_EMPHASIS_RE.test(segment.text),
          // PUSH #93 (FIX 4) — opening chunks get the hook treatment.
          hook: time < CAPTION_HOOK_WINDOW_SECONDS,
        }))
      })
    }
  }

  // Tracks 6, 7 and 10 — DELETED (KINEO-ONE-WATERMARK-2026-08-07).
  //
  // What used to be here, all gated on `endCard`:
  //   • track 6  — "usekineo.com"    y 18%, last 2.5s
  //   • track 7  — "Made with Kineo" y 13%, last 2.5s
  //   • track 10 — "Made with Kineo" y 13%, first 2s (PUSH #100)
  //
  // On a free render those three played on top of track 9, the burnt
  // "usekineo.com/free" watermark that already runs the whole video at y 5%.
  // The founder's screenshot of a free render showed all four at once: the same
  // message, in the same corner, four times. His call was "não precisa de 3
  // falando a mesma coisa" — one brand element.
  //
  // The watermark is the one that stays (see the track 9 block below): it is
  // full-duration, it survives a re-upload of the MP4 (the other three only
  // existed for 2–2.5s), and `usekineo.com/free` is the attributable URL —
  // app/free/route.ts stamps utm_source=watermark. The CTA went too, precisely
  // because it named the SAME domain in the SAME band as the watermark.
  //
  // Paid renders are unaffected: they already passed watermark:false and
  // endCard:false, so they emitted none of these and still emit nothing.
  // `endCard` is now inert everywhere — see the ComposeInputs doc above.

  // Track 8 — background music (Push #293).
  // Phonk / motivational track from Pixabay at low volume, looping under
  // the voiceover. Starts at t=0, runs the full video duration. The loop
  // flag re-cycles the track if the video is longer than the audio file.
  if (musicUrl) {
    // Kineo-Audio-2026 — brief fade-in + a short fade-out. Fades are clamped to
    // half the timeline so ultra-short videos never fade the whole track.
    // Single looping element (Creatomate can't sidechain-duck).
    // PUSH #93 (FIX 5) — MUSIC_FADE_OUT_SECONDS dropped 2.5→1.2. At 2.5 the
    // fade window was byte-for-byte the CTA window, so the bed was already
    // near-silent the moment the CTA appeared. At 1.2 the bed still carries the
    // first ~1.3s of the outro and only resolves on the last beat; the fade
    // window [totalDuration-1.2, totalDuration] starts and completes inside the
    // timeline (and the /2 clamp keeps that true on very short videos).
    const fadeOut = round3(Math.min(MUSIC_FADE_OUT_SECONDS, totalDuration / 2))
    const fadeIn = round3(Math.min(MUSIC_FADE_IN_SECONDS, totalDuration / 2))
    elements.push({
      type: 'audio',
      track: 8,
      time: 0,
      duration: totalDuration,
      source: musicUrl,
      volume: MUSIC_VOLUME,
      loop: true,
      audio_fade_in: fadeIn,
      audio_fade_out: fadeOut,
    })
    console.log(
      `[compose] background music added @ ${MUSIC_VOLUME} (fade in ${fadeIn}s / out ${fadeOut}s): ${musicUrl.slice(0, 80)}`,
    )
  }

  // Track 9 — #384 free-trial watermark, burned into the final MP4 so it can't
  // be stripped. Text = WATERMARK_TEXT ('usekineo.com/free'). Placed at the TOP,
  // full duration, plated. ONLY added when watermark:true — a server-side
  // free-tier decision (app/api/compose/route.ts:1915), never client input.
  //
  // KINEO-ONE-WATERMARK-2026-08-07 — THIS IS NOW THE ONLY BRAND ELEMENT IN THE
  // WHOLE RENDER. The tail CTA (track 6) and both "Made with Kineo" lockups
  // (tracks 7 and 10) were deleted above, so the old "watermark → end card →
  // CTA" stack is a stack of one. Do not re-add a second one without re-running
  // the arithmetic below.
  //
  // PUSH #93 (FIX 2) — y:5% is outside YouTube's covered bands (bottom ~380px /
  // right ~90px), so the position is kept as-is.
  // TO SWAP FOR A LOGO PNG LATER: replace this text element with an image one:
  //   { type:'image', track:9, time:0, duration:totalDuration, source:<logoUrl>,
  //     x:'50%', y:'6%', width:'30%', opacity:'60%' }
  //
  // ── PUSH #100 — LEGIBILITY PASS + COLLISION ARITHMETIC (1080×1920) ──────────
  // Problem: font 28 @ alpha 0.6 with a 1px 35%-black stroke and NO plate is
  // 1.46% of frame height and effectively disappears over bright footage. So:
  // 28→40, alpha 0.6→0.92, plus a plate at rgba(13,13,20,0.55) (the colour the
  // now-deleted end card used, which was the one reliably legible element here).
  //
  // Vertical band, using THIS FILE'S OWN measured ratios (y_anchor defaults to
  // 50%, i.e. `y` is the element's CENTRE). PLATED text measured at font 44 gave
  // a 205–295px band about a 249.6px centre ⇒ half-height 45px ⇒ 1.023 × font
  // (line box + the plate's y-padding ≈ 2.05 × font). The watermark is plated,
  // so it takes that ratio:
  //   centre    = 5% × 1920                     =  96.0px
  //   half-band = 1.023 × 40                    ≈  41.0px
  //   band      = 96 − 41 … 96 + 41             =  55 … 137px
  // Collision checks (the only two left — the top band holds nothing else):
  //   top of frame     0px   vs band top    55px → 55px clear, never clipped.
  //   caption top   1350px   vs band bottom 137px → 1213px clear.
  // Horizontal: width 80% = 864px centred ⇒ x ∈ [108, 972], left of the 990px
  // action-button column. 'usekineo.com/free' is 17 chars ≈ 0.58em avg advance
  // at font 40 ⇒ ≈395px, so it stays one line and the plate spans ≈[342,738].
  // Conclusion: y stays at 5%; no reposition needed. Duration stays full-video.
  if (watermark) {
    elements.push({
      type: 'text',
      track: 9,
      time: 0,
      duration: totalDuration,
      text: WATERMARK_TEXT,
      x: '50%',
      y: '5%',
      width: '80%',
      font_family: 'Montserrat',
      font_size: 40,
      font_weight: '700',
      fill_color: 'rgba(255,255,255,0.92)',
      stroke_color: 'rgba(0,0,0,0.35)',
      stroke_width: 1,
      background_color: 'rgba(13,13,20,0.55)',
    })
  }

  return {
    // KINEO-RENDER-PROFILE-2026-08-10 — o literal 1080/1920/30 virou alavanca
    // de custo por env. Defaults idênticos: enquanto KINEO_RENDER_* não
    // existir, este return é equivalente ao anterior.
    ...renderOutputSpec(),
    duration: totalDuration,
    elements,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KINEO-HOLLYWOOD-2026-07-09 — HOLLYWOOD MODE 2.0 source builder.
//
// Differences vs buildCreatomateSource (which stays 100% untouched):
//  - Clips are NOT muted. The engines generated NATIVE audio (Kling3 voice +
//    lip sync on dialogue scenes, ambient sound on the rest). Volume per scene
//    type: dialogue 100%, cinematic 55%, support 35%.
//  - Timeline = the planned per-scene durations (dialogue 10s / cinematic 8s /
//    support = planned seconds), tiled sequentially, last scene trimmed to
//    close the 45-60s target. NOT audio-length driven.
//  - TTS narration comes in per-BLOCK mp3s (one mp3 per contiguous run of
//    narrated scenes), each placed at its block's timeline offset. Dialogue
//    scenes never get narration over them.
//  - Captions: narrated blocks use the Whisper words of THAT block's mp3
//    shifted by the block offset (drift-free); dialogue scenes show the REAL
//    spoken line in ~3-word chunks spread across the scene
//    (KINEO-HOLLYWOOD-21-2026-07-10, bug b), falling back to the old static
//    scene caption when the line is unavailable.
//  - Background music is OFF (the native audio IS the realism).
//  - KINEO-HOLLYWOOD-22-2026-07-10: the niche-aware color grade IS applied
//    (slightly stronger than AI Gen) — it unifies the look across engines.
//  - Watermark follows the exact same rule as everywhere else. The CTA and the
//    "Made with Kineo" end card no longer exist in either builder
//    (KINEO-ONE-WATERMARK-2026-08-07).
// ─────────────────────────────────────────────────────────────────────────────

export interface HollywoodClipInput {
  url: string
  // KINEO-HOLLYWOOD-HOST-2026-07-13 — 'host' added: an anchored dialogue
  // scene rendered on Kling AI Avatar v2 (our TTS baked into the clip, one
  // voice for the whole video). Behaves like 'dialogue' for volume (100%),
  // narration (never TTS over it) and captions (chunks the real line), but
  // its `seconds` are the MEASURED audio duration and are honored EXACTLY
  // (no 5|10 snap) so the montage neither pools silence nor cuts speech.
  engine: 'dialogue' | 'cinematic' | 'support' | 'host'
  seconds: number
  caption: string
  // KINEO-HOLLYWOOD-21-2026-07-10 (bug b) — the EXACT spoken line of a
  // dialogue scene (undefined for cinematic/support). Captions chunk THIS
  // text so the on-screen words match what the person actually says.
  dialogueLine?: string
  // KINEO-LIPSYNC-CAPTIONS-2026-08-17 — palavras REAIS do audio nativo do
  // clipe (Whisper sobre o proprio mp4, offsets relativos ao inicio da
  // cena). Presente → as legendas da cena de fala sincronizam com a boca do
  // ator (karaoke incluso); ausente → distribuicao uniforme de antes.
  speechWords?: WhisperWord[]
}

export interface HollywoodNarrationBlock {
  /** Timeline offset (seconds) where this block's narration starts. */
  time: number
  /** KINEO-HOLLYWOOD-24-2026-07-10 — hard cut for this narration on the
   * timeline: end of ITS OWN scene + 0.5s tolerance. Narration is now one mp3
   * PER SCENE, and it must never bleed into (or displace silence onto) the
   * next scene. Optional for backward compatibility — absent means the old
   * behavior (cap only at the next dialogue scene / timeline end). */
  endCap?: number
  /** Public URL of the block's TTS mp3. */
  url: string
  /** Measured mp3 duration (seconds). */
  audioDuration: number
  /** The narration text (caption fallback when Whisper is unavailable). */
  text: string
  /** Whisper word timestamps for THIS block's mp3 (relative to the mp3). */
  words?: WhisperWord[]
}

const HOLLYWOOD_CLIP_VOLUME: Record<HollywoodClipInput['engine'], string> = {
  dialogue: '100%',
  cinematic: '55%',
  support: '35%',
  // KINEO-HOLLYWOOD-HOST-2026-07-13 — the host clip's audio IS the speech
  // (our TTS lip-synced by Kling Avatar v2): full volume, like dialogue.
  host: '100%',
}

export function buildHollywoodCreatomateSource({
  clips,
  narrationBlocks,
  watermark = false,
  musicUrl = null,
  muteClipAudio = false,
}: {
  clips: HollywoodClipInput[]
  narrationBlocks: HollywoodNarrationBlock[]
  watermark?: boolean
  endCard?: boolean
  // KINEO-HOLLYWOOD-SCORE-2026-08-17 — trilha por tema em volume de cinema.
  // O Hollywood rodava SEM musica; o fundador ouviu os respiros entre
  // narracoes como "apagoes" e o filme como "sem brilho". Uma cama musical
  // continua (mood-matched, 7%) costura os respiros e da cinema ao conjunto.
  musicUrl?: string | null
  // ⚠️ KINEO-H3-AUDIO-2026-08-20 — o MiniMax H3 IGNORA generate_audio:false e
  // devolve TODO clipe com trilha própria (medido por ffprobe no primeiro
  // render real: pico de −0.2 dB — fala alta e clara). Com o volume ambiente
  // de 35-55% desta tabela, a voz que o MODELO inventou tocava por baixo da
  // nossa narração — o fundador ouviu a legenda dizer uma frase e "o senhor
  // de casaco" repeti-la segundos depois. Era o próprio clipe falando.
  // true = todo clipe entra a 0%: no H3 a única voz é a nossa narração (C1),
  // e a ambiência vem da trilha musical, não do modelo.
  muteClipAudio?: boolean
}): Record<string, unknown> {
  const cleanClips = clips.filter((c) => typeof c.url === 'string' && c.url.trim().length > 0)
  if (cleanClips.length === 0) {
    throw new Error('No video clips provided to compose (hollywood).')
  }

  // Per-scene durations: cinematic fixed at 8s; dialogue follows the plan
  // (KINEO-HOLLYWOOD-21-2026-07-10, bug a: 5s or 10s, sized to the spoken
  // line — default 10); support seconds come from the plan. Trim the LAST
  // scene so the total closes at ≤ 60s; floor the timeline at 8s as a guard.
  // KINEO-HOLLYWOOD-HOST-2026-07-13 — 'host' scenes use their seconds EXACTLY
  // (the route measured the real TTS audio length; snapping to 5|10 here
  // would re-create the very silence/cut-speech defect the host path kills).
  // Clamp 2..20s: a hollywood line is ≤220 chars ≈ ≤13s of speech, so 20 is
  // pure safety. MUST mirror secondsOf in app/api/compose/route.ts or the
  // narration-block offsets drift from the real timeline.
  // KINEO-CONTRATO-C2-2026-08-18 — honra os segundos exatos do plano (MOTORMAX;
  // o molde 5|10/8-fixo/teto-10 encolhia 51s planejados para 44-46s compostos).
  // MUST mirror secondsOf in app/api/compose/route.ts.
  const secondsFor = (c: HollywoodClipInput): number =>
    c.engine === 'host'
      ? (Number.isFinite(c.seconds) && c.seconds > 0 ? Math.min(20, Math.max(2, c.seconds)) : 10)
      : c.engine === 'dialogue'
        ? (Number.isFinite(c.seconds) && c.seconds > 0 ? Math.min(15, Math.max(3, c.seconds)) : 10)
        // KINEO-H3-SLOT-2026-08-20 — teto 8→15: no H3 a ex-cena de diálogo vira 'cinematic' com 10s reais; min(8) cortava narração no meio da palavra. Hollywood/Veo planeja cinematic=8s, então nada muda pra eles. MUST mirror.
        : c.engine === 'cinematic'
          ? (Number.isFinite(c.seconds) && c.seconds > 0 ? Math.min(15, Math.max(4, c.seconds)) : 8)
          // KINEO-TAIL-GROW-2026-08-25 — 12→13, espelho do secondsOf do route. MUST mirror.
          : (Number.isFinite(c.seconds) && c.seconds > 0 ? Math.min(13, Math.max(2, c.seconds)) : 10)

  const durations = cleanClips.map(secondsFor)
  let total = durations.reduce((s, d) => s + d, 0)
  // KINEO-HOLLYWOOD-HOST-2026-07-13 — NEVER trim a trailing 'host' clip to fit
  // 60s: its duration IS its speech (the PAYOFF line, after the HOOK/PAYOFF-
  // on-camera rule, usually closes the video), and cutting it mid-word is the
  // worst possible ending. When host lines run the timeline slightly past 60s
  // we ACCEPT the overflow instead (totalDuration is already clamped to ≤90s
  // below, and 61-65s is fine for Shorts — TikTok Creator Rewards even wants
  // >60s). Middle scenes can't be trimmed here either: their narration mp3s
  // were placed at offsets computed from the UNtrimmed durations in
  // app/api/compose/route.ts, and moving earlier scenes would desync them.
  // KINEO-CONTRATO-C2-2026-08-18 — teto de apara 60→64: aparar para 60.0s
  // cravados matava o TikTok Creator Rewards (que exige >60s). 61-64s e a
  // zona perfeita; so aparamos o que passar DISSO.
  const TRIM_CEILING = 64
  // KINEO-CONTRATO-FIT-2026-08-18 — com o C1, TODA cena e dimensionada pela
  // fala (o esticador antigo deixava folga; agora nao ha folga nenhuma).
  // Aparar o ultimo clipe = comer palavras: do PAYOFF nativo (dialogue, regra
  // HOOK/PAYOFF-on-camera poe dialogo no fim) ou da narracao TTS (endCap).
  // Entao a apara so roda quando o ultimo clipe e um b-roll SEM fala — na
  // pratica, filme verbatim entrega 64-73s e isso e FEATURE: TikTok Rewards
  // paga >60s, e 60 pedidos = piso, nao teto (regra do fundador 18/08).
  // No mundo C1 TODA cena carrega fala: dialogue/host tem a voz DENTRO do
  // clipe, e support/cinematic tem narracao TTS dimensionada pela propria
  // fala (o encolhedor do route ja cortou a folga). Nao existe mais "rabo
  // gordo" para aparar — so palavra para perder. A apara fica DESLIGADA para
  // qualquer ultimo clipe com fala; como hoje todos tem, ela e efetivamente
  // um no-op mantido para um futuro clipe mudo (outro/instrumental).
  const HOLLYWOOD_TRIM_ENABLED = false
  while (HOLLYWOOD_TRIM_ENABLED && total > TRIM_CEILING && durations.length > 0 && cleanClips[durations.length - 1].engine !== 'host') {
    const overflow = total - TRIM_CEILING
    const lastIdx = durations.length - 1
    const trimmable = durations[lastIdx] - 2 // never below 2s
    if (trimmable <= 0) break
    const trim = Math.min(overflow, trimmable)
    durations[lastIdx] = round3(durations[lastIdx] - trim)
    total = round3(total - trim)
    if (trim < overflow) break // last scene can't absorb more — accept slight overflow
  }
  const totalDuration = clamp(round3(total), 8, 90)

  // Scene start offsets (cumulative).
  const sceneStarts: number[] = []
  {
    let cursor = 0
    for (const d of durations) {
      sceneStarts.push(round3(cursor))
      cursor = round3(cursor + d)
    }
  }

  const elements: CreatomateElement[] = []
  const CLIP_GAP_OVERLAP = 0.06 // same #256 micro-overlap as the standard builder

  // KINEO-HOLLYWOOD-30-2026-07-10 — subtle 250ms crossfade between hollywood
  // scene clips ("UM MUNDO": the anchored scenes share one face + one world;
  // the crossfade makes the cuts read as one continuous film instead of hard
  // engine cuts). Mechanics: each non-last clip EXTENDS 0.25s under the next
  // clip (real footage under the blend — the standard builder's #202 fade was
  // removed exactly because non-overlapping clips faded in from the black
  // track-1 background), and each clip after the first fades in over 0.25s
  // via enter_transition (same property the caption 'pop' already uses).
  // Gate: flip HOLLYWOOD_CROSSFADE to false to kill the effect instantly.
  const HOLLYWOOD_CROSSFADE = true
  const HOLLYWOOD_CROSSFADE_SECONDS = 0.25
  // ═══ KINEO-SHARP-2026-08-20 — ENTRADA DE AVATAR SEM MOSTRAR O "ACORDAR" ═══
  // Fundador no Joyita: cenas de avatar/diálogo ABREM sem nitidez. É o i2v
  // do Kling assentando a textura nos primeiros frames (temporal drift) — o
  // clipe cru de TODO concorrente é igual; quem parece limpo cobre a abertura
  // na edição. Regra: cena com gente falando (dialogue/host) entra com fade
  // de 0.7s (o clipe anterior estende por baixo), então os frames moles
  // passam ESCONDIDOS sob o fim da cena anterior. SÓ IMAGEM: enter_transition
  // não toca o áudio, a primeira palavra continua intacta. Se a cena de
  // avatar for a PRIMEIRA do filme (HOOK-on-camera), não há cena anterior —
  // fade de 0.5s do preto do track 1, que lê como abertura de cinema.
  const AVATAR_FADE_SECONDS = 0.7
  const fadeFor = (c: HollywoodClipInput): number =>
    c.engine === 'dialogue' || c.engine === 'host' ? AVATAR_FADE_SECONDS : HOLLYWOOD_CROSSFADE_SECONDS

  // Track 1 — solid background (never show a transparent gap).
  // PUSH #95 — needs RECT_PATH to draw at all; see the shape-stack block in
  // buildCreatomateSource. Behind the footage, so enabling it is invisible —
  // it just finally covers the sub-second gaps the comments above rely on.
  // KINEO-BLACK-BASE-2026-08-04 — fill hardened #08080f → #000000, same fix as
  // the standard builder: Creatomate's default canvas is WHITE (no background
  // colour is ever set on the composition), so an uncovered frame gap between
  // clips flashed white. First element, lowest track (1), full canvas, full
  // duration — any b-roll gap now reads as invisible black.
  elements.push({
    type: 'shape', track: 1, time: 0, duration: totalDuration,
    x: '50%', y: '50%', width: '100%', height: '100%',
    path: RECT_PATH, fill_color: '#000000',
  })

  // Track 2 — scenes tiled sequentially, NATIVE AUDIO ON (volume per engine).
  // trim_start intentionally 0: trimming a dialogue clip's head would eat the
  // first spoken word. loop:true fills the slot if an engine returned a clip
  // slightly shorter than planned (robustness, zero dead frames).
  // KINEO-HOLLYWOOD-HOST-2026-07-13 — EXCEPT 'host' clips: their audio is the
  // baked-in speech, so looping would REPLAY the first words. loop:false — if
  // the presenter clip runs a hair short of its slot, the dark track-1
  // background covers the sub-second gap (invisible next to repeated speech).
  cleanClips.forEach((clip, i) => {
    const isLast = i === cleanClips.length - 1
    // Non-last clips run long enough to sit under the next clip's fade-in;
    // the last clip keeps the classic micro-overlap (nothing follows it).
    const overlap = HOLLYWOOD_CROSSFADE && !isLast ? fadeFor(cleanClips[i + 1]) : CLIP_GAP_OVERLAP
    elements.push({
      type: 'video',
      track: 2,
      time: sceneStarts[i],
      duration: round3(Math.min(durations[i], totalDuration - sceneStarts[i]) + overlap),
      source: clip.url,
      // KINEO-CLIP-COVER-2026-08-04 — INVARIANT: fit 'cover' at 100%x100%,
      // centered. Any smaller value (or a sub-100% zoom) exposes the black
      // track-1 base as a margin around the footage. See the note on the
      // Fast clip element in buildCreatomateSource.
      fit: 'cover',
      loop: clip.engine !== 'host',
      x: '50%', y: '50%', width: '100%', height: '100%',
      // KINEO-H3-AUDIT2-2026-08-20 — cena 'host' NUNCA entra no mute do H3:
      // o áudio dela é o NOSSO TTS (apresentador), não voz inventada do
      // modelo. Hoje o host path está atrás de flag (desligado), mas se ligar
      // num render H3, mutar o host = cena de apresentador MUDA. Blindado.
      // #281 — KINEO-H3-DIALOGO-2026-08-23: 'dialogue' sai do mute do H3 junto
      // com 'host'. A fala nativa da cena de diálogo agora É dirigida (o
      // planner escreve a linha exata no prompt) — mutá-la seria o defeito que
      // o fundador reportou: boca mexendo sem voz. O mute continua valendo
      // para cinematic/support, onde a voz inventada do modelo briga com a
      // narração (o caso do "senhor de casaco" de 20/08).
      volume: muteClipAudio && clip.engine !== 'host' && clip.engine !== 'dialogue' ? '0%' : (HOLLYWOOD_CLIP_VOLUME[clip.engine] ?? '35%'),
      ...(HOLLYWOOD_CROSSFADE && i > 0
        ? { enter_transition: { type: 'fade', duration: fadeFor(clip) } }
        : HOLLYWOOD_CROSSFADE && (clip.engine === 'dialogue' || clip.engine === 'host')
          ? { enter_transition: { type: 'fade', duration: 0.5 } } // abertura do filme: fade do preto
          : {}),
    })
  })

  // Track 3 — readability overlays (same as the standard builder).
  // PUSH #95 — scrim 0.22 → 0.14, matching the standard builder now that it
  // actually composites. Captions carry their own stroke + pill (#93/#256), so
  // the scrim only needs to take the edge off a bright clip.
  elements.push({
    type: 'shape', track: 3, time: 0, duration: totalDuration,
    x: '50%', y: '50%', width: '100%', height: '100%',
    path: RECT_PATH, fill_color: 'rgba(0,0,0,0.14)',
  })
  // PUSH #95 — REMOVED: the top/bottom letterbox bars (rgba(0,0,0,0.55),
  // 100%×20% at y 10% / y 90%). Same reasoning as the standard builder: they
  // never drew (no `path`), so removing them is a no-op, and enabling them
  // would hard-black 40% of the frame including the caption safe zone. Do not
  // re-add as shapes.

  // KINEO-HOLLYWOOD-22-2026-07-10 — UNIFIED COLOR GRADE. The hollywood branch
  // used to SKIP the niche grade on purpose ("realism wants untinted footage").
  // Founder feedback on the 3 real renders overruled that: "é muito visível
  // que está trocando os motores — a qualidade salta entre cenas". Kling 3 and
  // Veo each have their own color science, so a hard cut between engines reads
  // as a quality jump. DECISION: apply the SAME niche-aware grade scheme as
  // AI Gen (#436 + KINEO-FAST-V4) over ALL clips, uniformly (time 0 → total),
  // with the wash ~+0.05 opacity vs AI Gen — strong enough to mask the
  // per-engine look difference, subtle enough to keep the realism. Works with
  // the router's styleSheet (prompt-side); this is the compose-side half.
  // Niche is detected from the video's own words (narration + dialogue lines),
  // since this builder receives no voiceoverScript param.
  const gradeText = [
    ...narrationBlocks.map((b) => b.text ?? ''),
    ...cleanClips.map((c) => `${c.dialogueLine ?? ''} ${c.caption ?? ''}`),
  ]
    .join(' ')
    .toLowerCase()
  // PUSH #95 — these were the most dangerous shapes in the repo: wash at
  // 0.18–0.22 with NO blend_mode, i.e. a flat ~20% dark veil over the entire
  // film, which is what "+0.05 vs AI Gen" bought when nothing was drawing. Now
  // that shapes actually render, that would ship a visibly murky video. Two
  // changes: (1) wash gets blend_mode 'multiply' and glow gets 'screen', so
  // this builder finally split-tones like the standard one instead of veiling;
  // (2) wash 0.20/0.22/0.19/0.18 → 0.07/0.08/0.06/0.06, the same first-light
  // range as the standard builder. Glow alphas and ALL hues are unchanged.
  // The "mask the per-engine look difference" goal above is NOT abandoned — it
  // is deferred until someone has watched a render and can raise the wash on
  // evidence. Raising it blind is how you ship a brown video.
  const grade = /\b(billionaire|millionaire|wealth|money|invest|luxur|rich|dollar|business)\b/.test(gradeText)
    ? { wash: 'rgba(35,26,8,0.07)',  glow: 'rgba(255,190,80,0.07)' }   // wealth: warm gold
    : /\b(mystery|mysterious|unexplained|vanish|disappear|haunted|secret|creepy)\b/.test(gradeText)
    ? { wash: 'rgba(8,14,40,0.08)',  glow: 'rgba(120,150,255,0.05)' }  // mystery: deep blue
    : /\b(volcano|desert|island|mountain|ocean|country|village|glacier|jungle|crater)\b/.test(gradeText)
    ? { wash: 'rgba(10,32,40,0.06)', glow: 'rgba(255,140,50,0.06)' }   // places: teal/orange doc
    : { wash: 'rgba(12,34,51,0.06)', glow: 'rgba(255,150,60,0.05)' }   // default (#436 palette)
  elements.push({
    type: 'shape', track: 3, time: 0, duration: totalDuration,
    x: '50%', y: '50%', width: '100%', height: '100%',
    path: RECT_PATH, fill_color: grade.wash, blend_mode: 'multiply',
  })
  elements.push({
    type: 'shape', track: 3, time: 0, duration: totalDuration,
    // KINEO-WASH-FIX-2026-08-04 — this glow used to be a 70%x55% shape
    // centered at y 48%. 'screen' at constant alpha lifts BLACKS too (black
    // pixel -> glow color at its alpha), so on dark scenes the partial-canvas
    // shape showed up as a fixed translucent bright rectangle with hard edges.
    // Full-canvas keeps the highlight-lift intent with no visible border.
    x: '50%', y: '50%', width: '100%', height: '100%',
    path: RECT_PATH, fill_color: grade.glow, blend_mode: 'screen',
  })

  // PUSH #93 (FIX 1) — same defect as the standard builder: the caption window
  // stopped 2.5s before the timeline end while the final scene's narration /
  // dialogue audio kept playing, so the closing line ran uncaptioned. Captions
  // now run to the very end of the timeline; there is nothing left to reserve a
  // tail for (KINEO-ONE-WATERMARK-2026-08-07 removed the CTA element).
  const captionWindowEnd = totalDuration

  // Track 4 — narration blocks. Each block's mp3 starts at its scene offset.
  // The audio is capped so it can never run over the NEXT dialogue scene
  // (native speech must stay clean) nor past the timeline end.
  // KINEO-HOLLYWOOD-24-2026-07-10 — blocks are now PER SCENE and additionally
  // capped at their own scene's end (+0.5s tolerance, block.endCap): a short
  // TTS can no longer pool 10s of leftover silence onto a later scene, and a
  // long TTS can no longer talk over the following scene's narration.
  // KINEO-HOLLYWOOD-HOST-2026-07-13 — 'host' scenes carry baked-in speech
  // exactly like dialogue: narration must never run over either of them.
  const dialogueStarts = cleanClips
    .map((c, i) => (c.engine === 'dialogue' || c.engine === 'host' ? sceneStarts[i] : null))
    .filter((v): v is number => v !== null)

  for (const block of narrationBlocks) {
    if (!block.url || !(block.audioDuration > 0)) continue
    const nextDialogue = dialogueStarts.find((t) => t > block.time + 0.05)
    const hardEnd = Math.min(
      nextDialogue ?? totalDuration,
      Number.isFinite(block.endCap) && (block.endCap as number) > block.time ? (block.endCap as number) : totalDuration,
      totalDuration,
    )
    const audioDur = round3(Math.max(0.1, Math.min(block.audioDuration, hardEnd - block.time)))
    if (audioDur <= 0.1) continue
    elements.push({
      type: 'audio', track: 4, time: round3(block.time), duration: audioDur,
      source: block.url, volume: '100%',
    })

    // Track 5 — captions for this narrated block.
    if (Array.isArray(block.words) && block.words.length > 0) {
      // Whisper path: timings are relative to the block mp3 → shift by offset.
      const caps = buildCaptionsFromWhisperWords(block.words, block.audioDuration, 0, /* KINEO-SPRINT-12H-2026-07-29: was a hardcoded 3. Hollywood is the most expensive tier and was the last place still slicing captions three-at-a-time, i.e. the only path still able to burn `IT IT'S CALLED` on screen. Track the same knob every other tier uses. */ CAPTION_WORDS_PER_CHUNK)
      for (const cap of caps) {
        const t = round3(block.time + cap.time)
        if (t >= captionWindowEnd) continue
        const d = round3(Math.max(0.1, Math.min(cap.duration, captionWindowEnd - t)))
        // PUSH #93 (FIX 3) — hollywood is the most expensive tier and was
        // passing NO emphasis at all, so it rendered flat white captions while
        // the free 'fast' tier got the highlighted-keyword look. Same
        // tier-inversion defect; same rule now applies here.
        elements.push(...buildCaptionElements({
          text: cap.text, time: t, duration: d, highlight: cap.highlight,
          emphasize: FAST_EMPHASIS_RE.test(cap.text),
          // KINEO-KARAOKE-2026-08-17 — os words do bloco Hollywood são
          // relativos ao mp3 do bloco; soma-se block.time pra virar timeline.
          karaokeWords: cap.words.map((w) => ({
            word: w.word,
            start: round3(w.start + block.time),
            end: round3(w.end + block.time),
          })),
        }))
      }
    } else if (block.text && block.text.trim()) {
      // Proportional fallback within the block window.
      const segments = buildCaptionSegments(block.text, /* KINEO-SPRINT-12H-2026-07-29: was a hardcoded 3. Hollywood is the most expensive tier and was the last place still slicing captions three-at-a-time, i.e. the only path still able to burn `IT IT'S CALLED` on screen. Track the same knob every other tier uses. */ CAPTION_WORDS_PER_CHUNK)
      const totalWords = segments.reduce((s, seg) => s + Math.max(1, wordCount(seg.text)), 0) || 1
      let elapsed = block.time
      const window = Math.max(1, Math.min(audioDur, captionWindowEnd - block.time))
      for (const seg of segments) {
        const slot = Math.max(0.1, (Math.max(1, wordCount(seg.text)) / totalWords) * window)
        if (elapsed >= captionWindowEnd) break
        elements.push(...buildCaptionElements({
          text: seg.text,
          time: round3(elapsed),
          duration: round3(Math.min(slot, captionWindowEnd - elapsed)),
          highlight: seg.highlight,
          // PUSH #93 (FIX 3) — emphasis applies on every tier, hollywood included.
          emphasize: FAST_EMPHASIS_RE.test(seg.text),
        }))
        elapsed = round3(elapsed + slot)
      }
    }
  }

  // Track 5 — captions on DIALOGUE scenes (the person's own voice carries the
  // audio). KINEO-HOLLYWOOD-21-2026-07-10 (bug b): the caption is the REAL
  // spoken line, in ~3-word chunks distributed uniformly across the scene
  // window [start + 0.3s, end - 0.4s] — same visual style as the whisper
  // captions (buildCaptionElements). Fallback when the line is unavailable:
  // the old static scene caption (previous behavior).
  // KINEO-HOLLYWOOD-HOST-2026-07-13 — 'host' scenes caption identically: the
  // clip speaks its dialogueLine (our TTS), so the same chunking applies and,
  // because host slots equal the real audio length, the uniform spread tracks
  // the speech even more closely than on native-audio dialogue scenes.
  cleanClips.forEach((clip, i) => {
    if (clip.engine !== 'dialogue' && clip.engine !== 'host') return
    const t = sceneStarts[i]
    if (t >= captionWindowEnd) return

    // KINEO-LIPSYNC-CAPTIONS-2026-08-17 — com as palavras REAIS do clipe
    // (Whisper no mp4), a legenda segue a boca do ator, chunk a chunk, com
    // karaoke — mesmo pipeline das narracoes. Fail-open pro caminho uniforme.
    if (Array.isArray(clip.speechWords) && clip.speechWords.length > 1) {
      const caps = buildCaptionsFromWhisperWords(clip.speechWords, secondsFor(clip), 0, CAPTION_WORDS_PER_CHUNK)
      let emitted = 0
      for (const cap of caps) {
        const st = round3(t + cap.time)
        if (st >= captionWindowEnd) continue
        const d = round3(Math.max(0.1, Math.min(cap.duration, captionWindowEnd - st)))
        elements.push(...buildCaptionElements({
          text: cap.text, time: st, duration: d, highlight: cap.highlight,
          emphasize: FAST_EMPHASIS_RE.test(cap.text),
          karaokeWords: cap.words.map((w) => ({ word: w.word, start: round3(w.start + t), end: round3(w.end + t) })),
        }))
        emitted++
      }
      if (emitted > 0) return
      // transcricao vazia/inutil → segue pro caminho uniforme abaixo
    }
    const line = (clip.dialogueLine ?? '').trim()
    if (line) {
      const winStart = round3(t + 0.3)
      const winEnd = round3(Math.min(t + durations[i] - 0.4, captionWindowEnd))
      const window = winEnd - winStart
      const segments = buildCaptionSegments(line, /* KINEO-SPRINT-12H-2026-07-29: was a hardcoded 3. Hollywood is the most expensive tier and was the last place still slicing captions three-at-a-time, i.e. the only path still able to burn `IT IT'S CALLED` on screen. Track the same knob every other tier uses. */ CAPTION_WORDS_PER_CHUNK)
      if (window > 0.5 && segments.length > 0) {
        const slot = window / segments.length
        segments.forEach((seg, k) => {
          const st = round3(winStart + k * slot)
          if (st >= captionWindowEnd) return
          const d = round3(Math.max(0.1, Math.min(slot, captionWindowEnd - st)))
          // PUSH #93 (FIX 3) — emphasis applies on every tier, hollywood included.
          elements.push(...buildCaptionElements({
            text: seg.text, time: st, duration: d, highlight: seg.highlight,
            emphasize: FAST_EMPHASIS_RE.test(seg.text),
          }))
        })
        return
      }
    }

    const text = (clip.caption ?? '').trim()
    if (!text) return
    const d = round3(Math.max(0.5, Math.min(durations[i] - 0.2, captionWindowEnd - t)))
    // PUSH #93 (FIX 3) — emphasis applies on every tier, hollywood included.
    elements.push(...buildCaptionElements({
      text, time: round3(t), duration: d, highlight: null,
      emphasize: FAST_EMPHASIS_RE.test(text),
    }))
  })

  // Tracks 6, 7 and 10 — DELETED, identical to the standard builder
  // (KINEO-ONE-WATERMARK-2026-08-07). The tail CTA "usekineo.com" and both
  // "Made with Kineo" lockups (tail + first 2s) are gone; the burnt watermark
  // on track 9 below is the single brand element. Hollywood renders are paid
  // Studio work anyway, so the only caller that ever set endCard here was the
  // FORCE_WATERMARK_EMAILS self-promo list (app/api/compose/route.ts:1455) —
  // those accounts now get the watermark alone, like every other free render.

  // Track 8 — background music intentionally OMITTED: the engines' native
  // audio (voice + ambience) IS the realism; music on top breaks it.

  // Track 9 — watermark (same rule as the standard builder).
  // Kept byte-identical to the standard builder: font 40, alpha 0.92, plate.
  // Band ≈55–137px; the top band is otherwise empty now, so the only collision
  // checks that matter are the frame top (55px clear) and the caption top.
  // Full arithmetic is in the standard builder's block above.
  // KINEO-HOLLYWOOD-SCORE-2026-08-17 — cama musical continua, track 8.
  // Volume 7% (abaixo dos 12% do classico: aqui existe fala nativa e
  // ambiencia dos motores por baixo), fades de 1.2s/2s nas pontas.
  if (musicUrl) {
    elements.push({
      type: 'audio', track: 8, time: 0, duration: totalDuration,
      source: musicUrl, volume: '7%', loop: true,
      audio_fade_in: 1.2, audio_fade_out: 2,
    })
  }

  if (watermark) {
    elements.push({
      type: 'text', track: 9, time: 0, duration: totalDuration,
      text: WATERMARK_TEXT, x: '50%', y: '5%', width: '80%',
      font_family: 'Montserrat', font_size: 40, font_weight: '700',
      fill_color: 'rgba(255,255,255,0.92)', stroke_color: 'rgba(0,0,0,0.35)', stroke_width: 1,
      background_color: 'rgba(13,13,20,0.55)',
    })
  }

  return {
    // KINEO-RENDER-PROFILE-2026-08-10 — o literal 1080/1920/30 virou alavanca
    // de custo por env. Defaults idênticos: enquanto KINEO_RENDER_* não
    // existir, este return é equivalente ao anterior.
    ...renderOutputSpec(),
    duration: totalDuration,
    elements,
  }
}
// ── end KINEO-HOLLYWOOD-2026-07-09 ───────────────────────────────────────────

export class CreatomateSubmitError extends Error {
  constructor(message: string, public readonly ambiguous: boolean, public readonly status?: number) {
    super(message)
    this.name = 'CreatomateSubmitError'
  }
}

export async function submitCreatomateRender(source: Record<string, unknown>): Promise<string> {
  const key = process.env.CREATOMATE_API_KEY
  if (!key) throw new Error('CREATOMATE_API_KEY is not configured.')

  // KINEO-CREDIT-STUCK-2026-08-08 — o Creatomate entra em TODO render (Fast ou
  // IA), então ele é o gargalo do pico. Um 429 aqui virava
  // `ambiguous = false` → app/api/compose/route.ts solta o claim e devolve
  // "Render service rejected the job", ou seja: o vídeo da pessoa morre porque
  // o provedor estava ocupado por um segundo. 429 = pedido NÃO aceito, logo
  // repetir o POST não pode criar um segundo render cobrado — a garantia de
  // "submit once" continua valendo. 5xx/408/timeout seguem ambíguos e NÃO são
  // repetidos aqui (o caller trata via claim durável).
  let res: Response
  let rateLimitAttempt = 0
  for (;;) {
    try {
      res = await fetch(`${CREATOMATE_BASE}/renders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        // KINEO-THUMBNAIL-2026-08-28 — snapshot_time É o conserto do dado
        // mais constrangedor da auditoria: `select count(thumbnail_url) from
        // videos` = 0 de 1.129. A coluna é LIDA em 4 telas (/library,
        // /my-videos, /studio, /generate) e no e-mail de "vídeo pronto", e
        // NUNCA foi gravada — porque o Creatomate só devolve `snapshot_url`
        // quando o render é criado pedindo um snapshot, e este POST nunca
        // pediu. O caminho de gravação sempre existiu e sempre esteve certo
        // (compose/status persiste data.snapshot_url); faltava a nascente.
        // 1.2s: depois do primeiro corte/fade-in, cedo o bastante para ser o
        // gancho do filme — a capa que a biblioteca e o e-mail vão mostrar.
        body: JSON.stringify({ source, snapshot_time: 1.2 }),
      })
    } catch (error) {
      throw new CreatomateSubmitError(
        `Creatomate submit connection failed: ${error instanceof Error ? error.message : String(error)}`,
        true,
      )
    }
    if (res.status !== 429 || rateLimitAttempt >= CREATOMATE_SUBMIT_RATE_LIMIT.retries) break
    rateLimitAttempt += 1
    const waitMs = rateLimitWaitMs(CREATOMATE_SUBMIT_RATE_LIMIT, rateLimitAttempt, res.headers.get('retry-after'))
    // Drenar o corpo antes de descartar a resposta: no undici (Node 18+) um
    // body não consumido segura o socket do pool.
    await res.text().catch(() => '')
    console.warn(
      `[creatomate] 429 no submit — tentativa ${rateLimitAttempt}/${CREATOMATE_SUBMIT_RATE_LIMIT.retries} em ${waitMs}ms ` +
      '(rate limit e transiente; o render NAO foi criado)',
    )
    await sleep(waitMs)
  }

  let text: string
  try {
    text = await res.text()
  } catch (error) {
    // Once a 2xx/408/5xx response has started, a broken body stream does not
    // prove whether the provider accepted the job. Mark it ambiguous so the
    // caller keeps its distributed claim instead of blindly re-submitting.
    const ambiguous = res.ok || res.status === 408 || res.status >= 500
    throw new CreatomateSubmitError(
      `Creatomate response body failed: ${error instanceof Error ? error.message : String(error)}`,
      ambiguous,
      res.status,
    )
  }
  if (!res.ok) {
    throw new CreatomateSubmitError(
      `Creatomate rejected the render (${res.status}): ${text.slice(0, 300)}`,
      res.status === 408 || res.status >= 500,
      res.status,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new CreatomateSubmitError('Creatomate returned a non-JSON response.', true, res.status)
  }

  const first = Array.isArray(parsed) ? parsed[0] : parsed
  const obj = first as { id?: string } | null
  if (!obj || typeof obj.id !== 'string' || !obj.id) {
    throw new CreatomateSubmitError('Creatomate returned no render id.', true, res.status)
  }
  return obj.id
}

export async function pollCreatomateRender(renderId: string): Promise<CreatomateRenderState> {
  const key = process.env.CREATOMATE_API_KEY
  if (!key) throw new Error('CREATOMATE_API_KEY is not configured.')

  const res = await fetch(`${CREATOMATE_BASE}/renders/${encodeURIComponent(renderId)}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Creatomate lookup failed (${res.status})`)
  }

  const data = (await res.json()) as {
    status?: string
    url?: string
    snapshot_url?: string
    error_message?: string
    progress?: number
    duration?: number
  }

  const raw = (data.status ?? '').toLowerCase()
  let status: CreatomateRenderState['status']
  switch (raw) {
    case 'succeeded':
      status = 'succeeded'
      break
    case 'failed':
      status = 'failed'
      break
    case 'cancelled':
      status = 'cancelled'
      break
    case 'planned':
      status = 'planned'
      break
    case 'waiting':
      status = 'waiting'
      break
    case 'transcribing':
      status = 'transcribing'
      break
    case 'rendering':
      status = 'rendering'
      break
    default:
      status = 'unknown'
  }

  let progress: number
  if (typeof data.progress === 'number' && data.progress >= 0 && data.progress <= 100) {
    progress = Math.round(data.progress)
  } else {
    switch (status) {
      case 'planned':
        progress = 5
        break
      case 'waiting':
        progress = 10
        break
      case 'transcribing':
        progress = 25
        break
      case 'rendering':
        progress = 60
        break
      case 'succeeded':
        progress = 100
        break
      case 'failed':
      case 'cancelled':
        progress = 0
        break
      default:
        progress = 15
    }
  }

  return {
    status,
    progress,
    url: typeof data.url === 'string' ? data.url : null,
    snapshotUrl: typeof data.snapshot_url === 'string' ? data.snapshot_url : null,
    error: typeof data.error_message === 'string' ? data.error_message : null,
    // A duração real do MP4, direto de quem montou o arquivo.
    durationSeconds:
      typeof data.duration === 'number' && data.duration > 0
        ? Math.round(data.duration * 10) / 10
        : null,
  }
}
