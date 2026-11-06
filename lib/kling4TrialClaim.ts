// Read only after verifying the cinematic birth claim. Browser fields never select this path.
export type Kling4TrialEngine = 'kling4' | 'seedance15_fallback' | 'seedance15_cap'

// KINEO-RESERVA-H3-0611 [TRAVA 8.2 — fundador 06/11: "quero sim o H3... pode trocar"]: quando o Kling 4 do filme grátis não entrega, a reserva é o H3 Max Turbo.
// O H3 só anda a partir de uma imagem: com as 3 cenas com imagem aprovada, vai H3; faltando alguma, o filme inteiro segue no Seedance de texto, sem misturar motor.
export const RESERVA_H3_MODEL = 'minimax/h3-max-turbo/image-to-video'
export const RESERVA_SEEDANCE_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
export type ReservaShot = { prompt?: unknown; duration?: unknown; image_url?: unknown }
const temImagem = (s: ReservaShot | null | undefined) => typeof s?.image_url === 'string' && /^https:\/\//.test(s.image_url)
export function modeloDaReservaDoTeste(shots: readonly ReservaShot[]): string {
  return shots.length > 0 && shots.every(temImagem) ? RESERVA_H3_MODEL : RESERVA_SEEDANCE_MODEL
}
/** O corpo enviado à fal, na forma que cada motor pede. A duração do H3 é número; a do Seedance vai como texto no envio. */
export function entradaDaReserva(shot: ReservaShot, model: string): Record<string, unknown> {
  if (model === RESERVA_H3_MODEL) return { prompt: String(shot.prompt), image_url: String(shot.image_url), duration: Number(shot.duration), resolution: '768P', prompt_expansion_mode: 'disabled' }
  return { prompt: String(shot.prompt), duration: Number(shot.duration), resolution: '720p', aspect_ratio: '9:16', generate_audio: false }
}

export function kling4TrialEngineFromClaim(response: Record<string, unknown> | null | undefined): Kling4TrialEngine | null {
  if (response?.duration !== 15 || response.quality !== 'cinematic_ai' || response.aspect !== '9:16') return null
  const marker = response.kling4_trial
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)) return null
  const trial = marker as Record<string, unknown>
  if (trial.version !== 'kling4_trial_2810') return null
  return trial.engine_used === 'kling4' || trial.engine_used === 'seedance15_fallback' || trial.engine_used === 'seedance15_cap'
    ? trial.engine_used : null
}

/**
 * KINEO-K4-NARRACAO-CABE-0111 [TRAVA 8.2 — vai do fundador 02/11 "vai 16"] — selo honesto: o filme grátis saiu no Seedance 1.5
 * PORQUE a narração medida passou de 15 s (o `reason` que a rota grava no marcador kling4_trial). Só esse motivo — sem medida,
 * prazo estourado ou teto do dia não dizem "sua narração era longa".
 */
export function kling4TrialFallbackPorFalaLonga(response: Record<string, unknown> | null | undefined): boolean {
  const engine = kling4TrialEngineFromClaim(response)
  if (engine !== 'seedance15_fallback') return false
  return (response!.kling4_trial as Record<string, unknown>).reason === 'narration_over_kling4_15s'
}

/** KINEO-K4-SEMPRE-0511 — selo honesto: o filme saiu no Kling 4 com o texto ENCURTADO para caber nos 15 s. A tela avisa. */
export function kling4TrialFalaEncurtada(response: Record<string, unknown> | null | undefined): boolean {
  if (kling4TrialEngineFromClaim(response) !== 'kling4') return false
  return !!(response!.kling4_trial as Record<string, unknown>).narration_refit
}

/** The birth route already awaited this result. Bind its signed URL without repolling the supplier. */
export function kling4TrialVideoUrlFromClaim(response: Record<string, unknown> | null | undefined): string | null {
  if (kling4TrialEngineFromClaim(response) !== 'kling4') return null
  const url = (response!.kling4_trial as Record<string, unknown>).video_url
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : null
}

/** Browser consumer of the authenticated status response; never accepts another generation or engine family. */
export function kling4TrialReplacement(value: unknown, generationId: string): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const r = value as Record<string, unknown>
  if (r.generationId !== generationId || kling4TrialEngineFromClaim(r) !== 'seedance15_fallback') return null
  const marker = r.kling4_trial as Record<string, unknown>
  if (marker.fallback_finalized !== true || typeof marker.original_request_id !== 'string' || !marker.original_request_id) return null
  if (!Array.isArray(r.fal_request_ids) || !r.fal_request_ids.length || r.fal_request_ids.length > 3 ||
      !r.fal_request_ids.every(id => id === null || typeof id === 'string' && id.length > 0 && id.length <= 512) ||
      !Array.isArray(r.fal_models) || r.fal_models.length !== r.fal_request_ids.length ||
      !r.fal_models.every(model => model === 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video' ||
        model === 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video' || model === RESERVA_H3_MODEL)) return null
  return r
}
