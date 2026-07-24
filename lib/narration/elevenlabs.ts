/**
 * Dynamic AI Narration Engine — Phase 2: ElevenLabs TTS provider.
 *
 * Flag-gated + fail-open: callers ALWAYS fall back to the existing OpenAI
 * tts-1-hd path when this provider is disabled, unconfigured, or errors. It is
 * used ONLY when ALL of the following are true:
 *   - process.env.ELEVENLABS_API_KEY is set
 *   - process.env.KINEO_ELEVENLABS_ENABLED is truthy ('1' | 'true' | 'yes' | 'on')
 *   - the render tier is 'premium' or 'cinematic'
 *
 * SECURITY: no API key is ever hardcoded — the key is read from the environment
 * at call time. Voice IDs are NOT secrets (they identify public/shared voices)
 * and may come from a persona, the ELEVENLABS_VOICE_ID env override, or the
 * documented default below.
 */

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

/** Fast, low-latency multilingual model — good default for short-form VO. */
export const ELEVENLABS_MODEL = 'eleven_turbo_v2_5'

/**
 * ElevenLabs "Rachel" — a public, non-secret default voice id from the shared
 * library. Used only when neither a persona voice id nor ELEVENLABS_VOICE_ID is
 * available. Overridable per-persona (elevenVoiceId) or via env.
 */
export const ELEVENLABS_DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

export type NarrationTier = 'free' | 'premium' | 'cinematic'

function flagEnabled(): boolean {
  const v = (process.env.KINEO_ELEVENLABS_ENABLED ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

/**
 * True when ElevenLabs should be used for this tier (env key + feature flag +
 * premium/cinematic tier). Any false condition means "use OpenAI".
 */
export function isElevenLabsEnabled(tier: NarrationTier): boolean {
  if (!process.env.ELEVENLABS_API_KEY) return false
  if (!flagEnabled()) return false
  return tier === 'premium' || tier === 'cinematic'
}

/**
 * The TTS model id that WILL be used for this tier. Exposed so the audio cache
 * key stays stable/correct across the two providers (OpenAI vs ElevenLabs).
 */
export function ttsModelForTier(tier: NarrationTier): string {
  return isElevenLabsEnabled(tier) ? ELEVENLABS_MODEL : 'tts-1-hd'
}

export interface ElevenLabsSynthesisArgs {
  text: string
  voiceId: string
  /** 0–1; lower = more expressive/variable, higher = more stable/monotone. */
  stability?: number
  /** 0–1; how closely the output tracks the original voice timbre. */
  similarityBoost?: number
  /** 0–1; style exaggeration (0 = neutral). */
  style?: number
  /** Optional 0.7–1.2 narration speed (mapped into voice_settings.speed). */
  speed?: number
  model?: string
  timeoutMs?: number
}

function clamp01(v: number | undefined, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.max(0, Math.min(1, v))
}

/**
 * Synthesize speech via the ElevenLabs text-to-speech API. Returns an MP3
 * Buffer (audio/mpeg) so downstream Whisper caption timing runs on it exactly
 * like the OpenAI output. THROWS on any error / missing key so the caller can
 * cleanly fall back to OpenAI.
 */
export async function synthesizeWithElevenLabs(args: ElevenLabsSynthesisArgs): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not configured.')

  const voiceId = (args.voiceId ?? '').trim() || ELEVENLABS_DEFAULT_VOICE_ID
  // ElevenLabs handles long inputs, but keep parity with the OpenAI cap.
  const text = (args.text ?? '').slice(0, 4800)
  if (!text.trim()) throw new Error('ElevenLabs: empty narration text.')

  const voiceSettings: Record<string, unknown> = {
    stability: clamp01(args.stability, 0.5),
    similarity_boost: clamp01(args.similarityBoost, 0.75),
    style: clamp01(args.style, 0.0),
    use_speaker_boost: true,
  }
  if (typeof args.speed === 'number' && Number.isFinite(args.speed)) {
    voiceSettings.speed = Math.max(0.7, Math.min(1.2, args.speed))
  }

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: args.model ?? ELEVENLABS_MODEL,
      voice_settings: voiceSettings,
    }),
    signal: AbortSignal.timeout(args.timeoutMs ?? 30_000),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length === 0) throw new Error('ElevenLabs returned an empty audio buffer.')
  return buf
}
