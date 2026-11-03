// KINEO-HOLLYWOOD-HOST-2026-07-13 — HOLLYWOOD HOST MODE v3.5: one voice.
//
// The #1 defect left in Hollywood 3.0 (founder score 9): dialogue scenes run
// on Kling O3 i2v with generate_audio:true and the spoken line quoted inside
// the prompt — Kling invents a NEW random voice PER SCENE, so the same
// anchored presenter (same face, same world) speaks with a different voice in
// every scene he appears in. v3.5 fixes it by synthesizing every host line
// with OUR TTS (the same engine that narrates the b-roll) and lip-syncing it
// onto the canonical portrait via Kling AI Avatar v2 (the proven AI Presenter
// engine) — one voice for the whole film, host and narrator alike.
//
// WHY THIS FILE EXISTS (instead of reusing generateTTS directly): the voice
// must be identical across TWO routes that never talk to each other at
// runtime — /api/generate-video-cinematic synthesizes the HOST lines at
// submit time, and /api/compose synthesizes the b-roll NARRATION minutes
// later. generateTTS() re-selects a persona PER CALL by keyword-scanning the
// text it is given, so two different texts can land on two different voices.
// The fix: resolve the persona ONCE from the FULL video script (the exact
// same voiceover_script string both routes see — the cinematic route creates
// it and compose receives it verbatim from the client), then force that one
// voice on every synthesis. Deterministic input → deterministic persona →
// guaranteed voice match across both routes.
//
// FAIL-SAFE: both helpers are pure/self-contained. Callers wrap them in
// try/catch and fall back to the current behavior (Kling native audio on the
// route side, per-scene generateTTS persona on the compose side) — v3.5 can
// never kill a render that works today.
import { selectPersonaForScript } from '@/lib/narration/niche-mapping'
import type { NarrationLanguage } from '@/lib/textLanguage' // KINEO-IDIOMAS-15-2026-09-17
import { usesMiniMaxNarration } from '@/lib/textLanguage' // KINEO-VOZ-NATIVA-HOLLYWOOD-0211 — a língua de voz nativa (MiniMax) também na estrada hollywood
import type { OpenAIVoice } from '@/lib/narration/personas'
import { falarNumerosParaTts } from '@/lib/falaNumeros' // KINEO-NUMEROS-FALADOS-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"]: número por extenso só no que vai à TTS
import { stripScriptMarkers } from '@/lib/scriptParser'
import { PRESENTER_PERFORMANCE_PROMPT } from '@/lib/avatar/veed'
import { isCharacterVoiceName, resolveCharacterVoice } from '@/lib/hollywood/characterVoice'

export type HollywoodVoice = {
  personaId: string
  voice: OpenAIVoice
  /** The persona's natural pace (0.7–1.3) — multiplied by any user speed. */
  defaultSpeed: number
}

/**
 * Resolve THE narrator voice for a whole Hollywood video from its full
 * script text. Pure and deterministic: the same (script, language, vertical)
 * always yields the same persona, which is what lets the cinematic route and
 * the compose route agree on the voice without ever exchanging it.
 * stripScriptMarkers is applied here (idempotent) so it does not matter
 * whether the caller passes the raw or the already-stripped script — compose
 * strips at its boundary, the cinematic route does not.
 */
export function resolveHollywoodVoice(
  script: string,
  language: NarrationLanguage = 'en',
  vertical?: string,
  characterSheet?: string | null,
): HollywoodVoice {
  const cleaned = stripScriptMarkers(String(script ?? ''))
  // Hollywood is the premium engine — always resolve at the cinematic tier,
  // exactly like compose's narrationTier for quality === 'cinematic_hollywood'.
  const persona = selectPersonaForScript(cleaned, vertical, 'cinematic', language)
  // KINEO-VOZ-NA-BOCA-2026-09-11 — quando o planner descreveu o personagem, a
  // ficha manda: homem fala com voz de homem, mulher com voz de mulher. Foi o
  // defeito que desligou o lipsync em 16/08 (voz feminina num homem). Ficha
  // sem gênero → persona de sempre. O compose recebe a MESMA escolha pelo
  // claim (host_voice), então nunca re-resolve por conta própria.
  const fromSheet = characterSheet ? resolveCharacterVoice(characterSheet) : null
  if (fromSheet) return { personaId: fromSheet.personaId, voice: fromSheet.voice, defaultSpeed: fromSheet.speed }
  return { personaId: persona.id, voice: persona.voice, defaultSpeed: persona.defaultSpeed }
}

/** Voz pinada que viajou no claim assinado da rota cinematográfica; null se ausente ou inválida. */
export function hollywoodVoiceFromClaim(value: unknown): HollywoodVoice | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (!isCharacterVoiceName(v.voice)) return null
  const speed = typeof v.speed === 'number' && Number.isFinite(v.speed) && v.speed > 0 ? v.speed : 1.0
  const personaId = typeof v.persona_id === 'string' && v.persona_id.trim() ? v.persona_id.trim().slice(0, 64) : 'claim'
  return { personaId, voice: v.voice, defaultSpeed: Math.max(0.7, Math.min(1.3, speed)) }
}

/**
 * Single-pass TTS with a FORCED voice — the pinned-voice counterpart of
 * generateTTS()'s single-pass branch (same model, same input cap, same speed
 * clamp). No persona re-selection, no section modulation: host lines and
 * per-scene narration blocks are short single-thought texts, and re-selecting
 * anything here is exactly the bug this file exists to kill.
 * Throws on failure — callers catch and fall back.
 */
export async function synthesizeHostSpeech(args: {
  text: string
  voice: OpenAIVoice
  speed?: number
  /** KINEO-VOZ-NATIVA-HOLLYWOOD-0211 — a língua da narração; as línguas de voz nativa (usesMiniMaxNarration) não passam pela tts-1-hd. */
  language?: string | null
}): Promise<Buffer> {
  const cleaned = stripScriptMarkers(String(args.text ?? ''))
  if (!cleaned.trim()) throw new Error('empty host speech text')
  // KINEO-NUMEROS-FALADOS-0311 — a mesma forma falada do generateTTS (en/pt/es); sem língua declarada, o texto vai como sempre foi.
  const falado = args.language != null ? falarNumerosParaTts(cleaned, args.language).texto : cleaned // KINEO-NUMEROS-FALADOS-0311
  const input = falado.length > 3800 ? falado.slice(0, 3800) : falado // KINEO-NUMEROS-FALADOS-0311
  const safeSpeed = Math.max(
    0.7,
    Math.min(1.3, Number.isFinite(args.speed) && (args.speed as number) > 0 ? (args.speed as number) : 1.0),
  )
  // ═══ KINEO-VOZ-NATIVA-HOLLYWOOD-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] ═══
  // A voz americana da tts-1-hd lia português/espanhol com sotaque ("sangue azul" ouvido como "cinco olhos") enquanto a legenda
  // saía certa. Os clássicos já narram essas línguas na voz nativa MiniMax (lib/compose.ts, KINEO-VOZ-NATIVA-2610); aqui o MESMO
  // desvio vale para Kling 3, Kling 4 (pago/promo), H3, H3 Max e Seedance 2.5. A velocidade é a MESMA final (safeSpeed, 0,7–1,3 —
  // a voz pinada do Kling 4 pago chega já final) e o gênero da voz pinada é mantido (homem na ficha = voz de homem na língua).
  if (args.language != null && usesMiniMaxNarration(args.language)) { // KINEO-VOZ-NATIVA-HOLLYWOOD-0211
    const { synthesizeTtsFallback } = await import('@/lib/ttsFallback') // KINEO-VOZ-NATIVA-HOLLYWOOD-0211
    const gender = args.voice === 'onyx' || args.voice === 'echo' || args.voice === 'fable' ? 'male' : 'female' // KINEO-VOZ-NATIVA-HOLLYWOOD-0211 — vozes masculinas da tts-1-hd (characterVoice: onyx/echo para homem)
    return synthesizeTtsFallback(falado, { language: args.language, speed: safeSpeed, gender }) // KINEO-VOZ-NATIVA-HOLLYWOOD-0211 · KINEO-NUMEROS-FALADOS-0311
  } // KINEO-VOZ-NATIVA-HOLLYWOOD-0211
  // KINEO-OPENAI-HANG-2026-08-05 — TTS overrides the 20s client default.
  // Critical here: this runs inside per-block loops (app/api/compose/route.ts
  // and generate-video-cinematic, the latter on a 60s budget). Inheriting 20s
  // would burn ~40s per block and fall back to generateTTS, which re-picks a
  // persona per call — silently resurrecting the "different voice every scene"
  // bug this file exists to prevent (KINEO-HOLLYWOOD-HOST-2026-07-13).
  const { openai, OPENAI_TTS_TIMEOUT_MS } = await import('@/lib/openai')
  const speech = await openai.audio.speech.create(
    {
      model: 'tts-1-hd',
      voice: args.voice,
      input,
      speed: safeSpeed,
    },
    { timeout: OPENAI_TTS_TIMEOUT_MS, maxRetries: 0 },
  )
  const buf = Buffer.from(await speech.arrayBuffer())
  if (!buf || buf.length === 0) throw new Error('TTS returned an empty buffer')
  return buf
}

/**
 * The performance prompt for a Hollywood host scene on Kling AI Avatar v2:
 * the AI Presenter gesture direction (already validated in production —
 * KINEO-PRESENTER-MOTION) plus the plan's characterSheet/styleSheet so the
 * avatar clip keeps the same person and the same photography as every other
 * anchored scene. Sheets arrive already sanitized (sanitizeRealPeople ran in
 * the planner), so the anti-deepfake guarantee carries through unchanged.
 */
export function buildHostPerformancePrompt(characterSheet: string, styleSheet: string): string {
  const character = String(characterSheet ?? '').trim()
  const style = String(styleSheet ?? '').trim()
  return (
    PRESENTER_PERFORMANCE_PROMPT +
    (character ? ` The person (match exactly): ${character}.` : '') +
    (style ? ` Cinematography (match exactly): ${style}.` : '')
  ).slice(0, 1500)
}
