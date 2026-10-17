// AI Avatar — voice cloning (the avatar speaks in the user's OWN voice).
// MiniMax on fal: clone a voice from a ~10-60s sample → custom_voice_id, then
// synthesize the narration in that voice (multilingual, incl. Portuguese).
// Runs on the same FAL_KEY as the other avatar engines.
//   Clone:     fal-ai/minimax/voice-clone   ($1.50 per clone, one-time per voice)
//   Synthesize: fal-ai/minimax/speech-02-hd ($0.10 / 1000 chars)
import { fal } from '@fal-ai/client'

function configureFal(): boolean {
  const key = process.env.FAL_KEY
  if (!key) return false
  fal.config({ credentials: key })
  return true
}

const CLONE_MODEL = 'fal-ai/minimax/voice-clone'
const TTS_MODEL = 'fal-ai/minimax/speech-02-hd'

function langBoost(language?: string): string {
  if (language === 'pt') return 'Portuguese'
  if (language === 'es') return 'Spanish'
  return 'English'
}

// KINEO-APRESENTADOR-V2-1710 — a voz do APRESENTADOR do Studio Ads sai na speech-2.8-hd (a mesma do /audio, que tem rota própria e não é tocada).
// A 2.8 recebe o texto em `prompt` (a 02-hd em `text`) e o mesmo voice_setting/language_boost/output_format 'url'.
/** KINEO-APRESENTADOR-V2-1710 — a speech-2.8-hd (espelho de ADS_V2_PRESENTER_V2_TTS_MODEL, lib/ads/v2PresenterV2.ts; o guardião confere). */
export const TTS_28_MODEL = 'fal-ai/minimax/speech-2.8-hd'
/** KINEO-APRESENTADOR-V2-1710 — o corpo do pedido (puro). Sem `model` = EXATAMENTE o corpo de antes (a voz clonada). */
export function voiceInputFor(args: { voiceId: string; text: string; language?: string; model?: string; languageBoost?: string; speed?: number }): Record<string, unknown> {
  const is28 = args.model === TTS_28_MODEL
  const speed = typeof args.speed === 'number' && Number.isFinite(args.speed) && args.speed > 0 ? { speed: args.speed } : {}
  return {
    ...(is28 ? { prompt: args.text } : { text: args.text }),
    voice_setting: { voice_id: args.voiceId, ...speed },
    language_boost: typeof args.languageBoost === 'string' && args.languageBoost ? args.languageBoost : langBoost(args.language),
    output_format: 'url',
  }
}

/** Clone a voice from a sample audio URL (>=10s). Returns the custom_voice_id
 *  plus the raw error (surfaced to the client for debugging) when it fails. */
export async function cloneVoice(audioUrl: string): Promise<{ voiceId: string | null; error?: string }> {
  if (!configureFal()) return { voiceId: null, error: 'FAL_KEY not configured' }
  const input: Record<string, unknown> = {
    audio_url: audioUrl,
    noise_reduction: true,
    need_volume_normalization: true,
  }
  const model: string = CLONE_MODEL
  try {
    const result = (await fal.subscribe(model, { input })) as {
      data?: { custom_voice_id?: string }
      custom_voice_id?: string
    }
    const id = result?.data?.custom_voice_id ?? result?.custom_voice_id ?? null
    if (id && id.length > 0) return { voiceId: id }
    return { voiceId: null, error: 'MiniMax returned no custom_voice_id' }
  } catch (err) {
    const e = err as { status?: number; body?: unknown; message?: string }
    const msg = e?.message ?? String(err)
    const body = e?.body ? ` | body=${JSON.stringify(e.body)}` : ''
    const status = e?.status ? ` (status ${e.status})` : ''
    const full = `${msg}${status}${body}`.slice(0, 500)
    console.error('[avatar/voice] clone failed:', full)
    return { voiceId: null, error: full }
  }
}

/** Synthesize text in a previously cloned voice. Returns the mp3 Buffer, or
 *  throws (the caller falls back to the default TTS engine so the render never
 *  fails just because of voice cloning). */
export async function synthesizeWithVoice(args: {
  voiceId: string
  text: string
  language?: string
  /** KINEO-APRESENTADOR-V2-1710 — o modelo: ausente = a 02-hd de sempre (a voz CLONADA do /avatar fica nela); TTS_28_MODEL = o apresentador do Studio Ads. */
  model?: string
  /** KINEO-APRESENTADOR-V2-1710 — o language_boost exato (ex.: 'Portuguese'); ausente = o mapa de sempre pela língua. */
  languageBoost?: string
  /** KINEO-APRESENTADOR-V2-1710 — voice_setting.speed; ausente = sem speed (como sempre). */
  speed?: number
}): Promise<Buffer> {
  if (!configureFal()) throw new Error('Voice engine is not configured.')
  const input = voiceInputFor(args) // KINEO-APRESENTADOR-V2-1710 — o corpo sai de uma função pura (a 02-hd com o corpo de sempre)
  const model: string = args.model === TTS_28_MODEL ? TTS_28_MODEL : TTS_MODEL // KINEO-APRESENTADOR-V2-1710 — só os dois modelos conhecidos
  const result = (await fal.subscribe(model, { input })) as {
    data?: { audio?: { url?: string } }
    audio?: { url?: string }
  }
  const url = result?.data?.audio?.url ?? result?.audio?.url ?? null
  if (!url) throw new Error('Cloned-voice TTS returned no audio.')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch cloned audio failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}
