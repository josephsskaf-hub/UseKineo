// KINEO-ADS-V2-2026-09-28 — input de cada chamada à fal do anúncio v2, montado CAMPO A CAMPO.
//
// Nunca espalhar objeto de fora (`...extra`): Kling O3 i2v, Seedance 2.0 i2v e H3 i2v aceitam `end_image_url`, e um
// campo herdado ou vazio muda o plano inteiro (especificação, seção 4, armadilha 1). Nenhum builder daqui escreve
// end_image_url, tail_image_url nem multi_prompt.
//
// Campos conferidos no OpenAPI público da fal em 28/09/2026
// (https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<slug>):
//   fal-ai/kling-video/o3/pro/image-to-video   duration enum string '3'..'15' (padrão '5') · generate_audio (padrão
//                                              false; mandado explícito) · prompt ≤ 2500 · SEM aspect_ratio e SEM
//                                              resolution (sai em 1080p e segue a foto, que chega recortada em 9:16).
//   bytedance/seedance-2.0/fast/image-to-video duration enum string 'auto','4'..'15' · resolution '480p'|'720p' ·
//                                              aspect_ratio inclui '9:16' (padrão 'auto') · generate_audio (padrão true).
//   minimax/h3/image-to-video                  duration INTEIRO 5..15 · resolution '480P'|'768P'|'2K'|'4K' (padrão
//                                              '2K', o dobro do preço) · prompt_expansion_mode (padrão 'balanced',
//                                              reescreve o pedido) · não tem campo de áudio (gera sempre).
//   fal-ai/nano-banana-pro/edit                prompt 3..50000 · image_urls (obrigatório) · aspect_ratio inclui '9:16' ·
//                                              num_images 1..4 · resolution '1K'|'2K'|'4K' · output_format.
//
// LIB PURA (nenhum import): tipos copiados de lib/ads/v2Tiers.ts; o guardião confere que os ids batem.

export type AdsV2EngineId = 'kling_o3' | 'seedance_20_fast' | 'h3'

export interface KlingO3I2vInput {
  prompt: string
  image_url: string
  duration: '3'
  generate_audio: false
}
export interface Seedance20FastI2vInput {
  prompt: string
  image_url: string
  duration: '4'
  resolution: '720p'
  aspect_ratio: '9:16'
  generate_audio: false
}
export interface H3I2vInput {
  prompt: string
  image_url: string
  duration: 5
  resolution: '768P'
  prompt_expansion_mode: 'disabled'
}
export type AdsV2ShotInput = KlingO3I2vInput | Seedance20FastI2vInput | H3I2vInput

/** Kling O3 aceita prompt de até 2500 caracteres; o teto vale para os três motores (o prompt é de 1 movimento). */
export const ADS_V2_PROMPT_MAX_CHARS = 2500

function requireHttpsUrl(raw: unknown, field: string): string {
  const v = typeof raw === 'string' ? raw.trim() : ''
  if (!/^https:\/\/[^\s]+$/i.test(v)) throw new Error(`ads_v2_bad_${field}`)
  return v
}
function requirePrompt(raw: unknown): string {
  const v = typeof raw === 'string' ? raw.trim() : ''
  if (v.length < 3) throw new Error('ads_v2_bad_prompt')
  if (v.length > ADS_V2_PROMPT_MAX_CHARS) throw new Error('ads_v2_prompt_too_long')
  return v
}

/** Input do image-to-video de um plano. Plano `text` nunca chega aqui (routeShot devolve null). */
export function buildShotInput(engine: AdsV2EngineId, shot: { imageUrl: string; prompt: string }): AdsV2ShotInput {
  const image_url = requireHttpsUrl(shot?.imageUrl, 'image_url')
  const prompt = requirePrompt(shot?.prompt)
  if (engine === 'kling_o3') {
    const input: KlingO3I2vInput = { prompt, image_url, duration: '3', generate_audio: false }
    return input
  }
  if (engine === 'seedance_20_fast') {
    const input: Seedance20FastI2vInput = {
      prompt,
      image_url,
      duration: '4',
      resolution: '720p',
      aspect_ratio: '9:16',
      generate_audio: false,
    }
    return input
  }
  if (engine === 'h3') {
    const input: H3I2vInput = { prompt, image_url, duration: 5, resolution: '768P', prompt_expansion_mode: 'disabled' }
    return input
  }
  throw new Error(`ads_v2_unknown_engine:${String(engine)}`)
}

export interface NanoBananaProEditInput {
  prompt: string
  image_urls: string[]
  aspect_ratio: '9:16'
  num_images: 1
  resolution: '2K'
  output_format: 'jpeg'
}

/**
 * Referências por cena criada: as fotos do cliente (até 7 no pedido). O schema da fal NÃO fixa máximo em image_urls;
 * 14 é o limite citado na receita (docs/RECEITA-ANUNCIO-V2-2026-09-28.md, item 9), e o v2 nunca manda mais que as
 * fotos do pedido.
 */
export const ADS_V2_SCENE_MAX_REFERENCES = 14

/**
 * Input da cena criada (Nano Banana Pro edit) com as fotos do cliente como referência.
 * Resolução '2K': em 9:16 o '1K' sai com ~768 px de largura, abaixo dos 1080×1920 do anúncio; '2K' custa o MESMO
 * (US$ 0,15; só o 4K cobra o dobro) — é a mais barata que serve. JPEG em vez do PNG padrão: arquivo menor para o
 * image-to-video seguinte (Kling aceita até 50 MB), sem custo.
 */
export function buildSceneImageInput(scene: { prompt: string; referenceUrls: readonly string[] }): NanoBananaProEditInput {
  const prompt = typeof scene?.prompt === 'string' ? scene.prompt.trim() : ''
  if (prompt.length < 3) throw new Error('ads_v2_bad_prompt')
  if (prompt.length > 50000) throw new Error('ads_v2_prompt_too_long')
  const refs = Array.isArray(scene?.referenceUrls) ? scene.referenceUrls : []
  if (refs.length < 1) throw new Error('ads_v2_scene_needs_reference')
  if (refs.length > ADS_V2_SCENE_MAX_REFERENCES) throw new Error('ads_v2_scene_too_many_references')
  const image_urls = refs.map((u) => requireHttpsUrl(u, 'reference_url'))
  return { prompt, image_urls, aspect_ratio: '9:16', num_images: 1, resolution: '2K', output_format: 'jpeg' }
}
