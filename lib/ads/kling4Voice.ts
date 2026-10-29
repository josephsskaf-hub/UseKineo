// Budgeted Kling4 ads use one accepted queue POST per voice attempt, not SDK submission retries.
import { fal } from '@fal-ai/client'
import { submitFalQueueOnce } from '@/lib/falQueue'
export const KLING4_AD_VOICE_MAX_CHARS = 1000
export const KLING4_AD_VOICE_MAX_ATTEMPTS = 2
// fal.ai/models/fal-ai/minimax/speech-2.8-hd, public price checked 2026-10-29: $0.10/1000 chars.
export const KLING4_AD_VOICE_MAX_MILLIUSD = 200

export function assertKling4AdVoiceText(text: string): void {
  if (!text.trim() || text.length > KLING4_AD_VOICE_MAX_CHARS) throw new Error('kling4_ad_voice_text_exceeds_budget')
}

export async function synthesizeKling4AdVoice(model: string, input: Record<string, unknown>): Promise<Buffer> {
  if (!['fal-ai/minimax/speech-2.8-hd', 'fal-ai/minimax/speech-02-hd'].includes(model)) throw new Error('kling4_ad_voice_model_not_budgeted')
  assertKling4AdVoiceText(String(input.prompt ?? input.text ?? ''))
  const key = process.env.FAL_KEY
  if (!key) throw new Error('kling4_ad_voice_unavailable')
  fal.config({ credentials: key })
  const id = await submitFalQueueOnce(model, input)
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    const status = await fal.queue.status(model, { requestId: id }) as unknown as { request_id?: string; status?: string; error?: unknown }
    if (status.request_id === id && status.status === 'FAILED') throw new Error('kling4_ad_voice_failed')
    if (status.request_id === id && status.status === 'COMPLETED') {
      if (status.error) throw new Error('kling4_ad_voice_failed')
      const result = await fal.queue.result(model, { requestId: id }) as unknown as { data?: { audio?: { url?: string } }; audio?: { url?: string } }
      const url = result.data?.audio?.url ?? result.audio?.url
      if (!url || !/^https:\/\//.test(url)) throw new Error('kling4_ad_voice_no_audio')
      const audio = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: 'no-store' })
      if (!audio.ok) throw new Error('kling4_ad_voice_download_failed')
      return Buffer.from(await audio.arrayBuffer())
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new Error('kling4_ad_voice_pending')
}
