// KINEO-ADS-CENA-2110 — contratos fal conferidos em 21/10/2026; builders puros, sem SDK, env, transporte ou geração.
// [TRAVA 8.2 — vai do fundador 21/10 "A e B, vamo time"]
// KINEO-ADS-CENA-AJUSTE-2110 — modos explícitos de voz; ausência preserva contratos dos pedidos anteriores.

export type CenaRoute = 'kling3' | 'seedance2' | 'veo31'
export type CenaVoiceMode = 'narrated' | 'talking'

export const CENA_CONTRACTS_CHECKED_AT = '2026-10-21'
export const CENA_KEYFRAME_ENDPOINT = 'fal-ai/nano-banana-pro/edit'
export const CENA_KEYFRAME_USD = 0.15
export const CENA_KEYFRAME_SOURCE = 'https://fal.ai/models/fal-ai/nano-banana-pro/edit'

export type CenaRouteInfo = {
  endpoint: string
  docs: string
  pricing: string
  secondsPerRequest: number
  requestsFor15Seconds: number
  videoUsdPerSecond: number
  silentVideoUsdPerSecond: number
  nativeAudio: boolean
  nativeSpeechLanguages: readonly string[] | null
  notes: readonly string[]
}

/** Tarifa pública da rota exata, sem elements extras, vídeo de entrada, 4K ou voice control. Não é cotação/fatura. */
export const CENA_ROUTES: Readonly<Record<CenaRoute, CenaRouteInfo>> = {
  kling3: {
    endpoint: 'fal-ai/kling-video/v3/pro/image-to-video',
    docs: 'https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api',
    pricing: 'https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video',
    secondsPerRequest: 15,
    requestsFor15Seconds: 1,
    videoUsdPerSecond: 0.168,
    silentVideoUsdPerSecond: 0.112,
    nativeAudio: true,
    nativeSpeechLanguages: ['en', 'zh'],
    notes: [
      'A proporção é a da imagem inicial; usar keyframe vertical 9:16.',
      'Voz nativa documentada só em inglês/chinês; outros idiomas são traduzidos para inglês.',
      'A referência do produto está no keyframe aprovado. Não envia elements: tarifa deles diverge entre páginas fal.',
    ],
  },
  seedance2: {
    endpoint: 'bytedance/seedance-2.0/reference-to-video',
    docs: 'https://fal.ai/models/bytedance/seedance-2.0/reference-to-video/api',
    pricing: 'https://fal.ai/models/bytedance/seedance-2.0/reference-to-video',
    secondsPerRequest: 15,
    requestsFor15Seconds: 1,
    videoUsdPerSecond: 0.3024,
    silentVideoUsdPerSecond: 0.3024,
    nativeAudio: true,
    nativeSpeechLanguages: null,
    notes: [
      'Standard 720p sem vídeo de entrada. Não confundir com fast ou us.',
      'Áudio incluído; português e qualidade de fala permanecem sem validação em produção.',
    ],
  },
  veo31: {
    endpoint: 'fal-ai/veo3.1/reference-to-video',
    docs: 'https://fal.ai/models/fal-ai/veo3.1/reference-to-video/api',
    pricing: 'https://fal.ai/models/fal-ai/veo3.1/reference-to-video',
    secondsPerRequest: 8,
    requestsFor15Seconds: 2,
    videoUsdPerSecond: 0.4,
    silentVideoUsdPerSecond: 0.2,
    nativeAudio: true,
    nativeSpeechLanguages: null,
    notes: [
      'Duas gerações de 8s; conservar 8s + 7s. A cena continua sob os overlays de oferta/CTA nos últimos 2s.',
      'Não enviar duration 15s: o modelo gera até 8s por chamada.',
      'A documentação exibe depreciação deste endpoint em 17/11/2026; reconferir antes do teste pago.',
      'Idiomas e continuidade entre segmentos ainda não foram validados em produção.',
    ],
  },
}

export type CenaVideoRequest = {
  endpoint: string
  input: Record<string, unknown>
  seconds: number
  keepSeconds: number
  offsetSeconds: number
  nativeSpeechSupported: boolean | null
  warnings: string[]
}

export type CenaVideoRequestInput = {
  keyframeUrl: string
  endKeyframeUrl?: string
  productUrl: string
  prompt: string
  language?: string
  segmentPrompts?: readonly [string, string]
  voiceMode?: CenaVoiceMode
}

function requiredUrl(value: unknown, field: string): string {
  const text = typeof value === 'string' ? value.trim() : ''
  let url: URL
  try { url = new URL(text) } catch { throw new Error(`cena_invalid_${field}`) }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`cena_invalid_${field}`)
  return text
}

function requiredPrompt(value: unknown): string {
  const prompt = typeof value === 'string' ? value.trim() : ''
  if (!prompt) throw new Error('cena_prompt_required')
  return prompt
}

export function isCenaRoute(value: unknown): value is CenaRoute {
  return value === 'kling3' || value === 'seedance2' || value === 'veo31'
}

export function isCenaVoiceMode(value: unknown): value is CenaVoiceMode { return value === 'narrated' || value === 'talking' }
export function cenaResolveRoute(voiceMode: CenaVoiceMode, route?: unknown): CenaRoute {
  if (route === undefined) return voiceMode === 'talking' ? 'veo31' : 'kling3'
  if (!isCenaRoute(route)) throw new Error('cena_bad_route')
  return route
}
/** Recusa antes do planejamento pago e novamente antes do vídeo; nunca troca o modo solicitado. */
export function cenaAssertVoiceRoute(route: CenaRoute, voiceMode: CenaVoiceMode, language = 'en'): void {
  if (!isCenaVoiceMode(voiceMode)) throw new Error('cena_bad_voice_mode')
  if (route === 'kling3' && voiceMode === 'talking' && !CENA_ROUTES.kling3.nativeSpeechLanguages!.includes(language.toLowerCase().split(/[-_]/)[0])) throw new Error('cena_kling_native_speech_unsupported')
}

/** Só constrói requisições. O chamador injeta transporte e só chama depois do juiz aprovar o keyframe. */
export function cenaVideoRequests(route: CenaRoute, data: CenaVideoRequestInput): CenaVideoRequest[] {
  if (!isCenaRoute(route)) throw new Error('cena_route_invalid')
  const info = CENA_ROUTES[route]
  const keyframeUrl = requiredUrl(data.keyframeUrl, 'keyframe_url')
  const productUrl = requiredUrl(data.productUrl, 'product_url')
  const endKeyframeUrl = data.endKeyframeUrl ? requiredUrl(data.endKeyframeUrl, 'end_keyframe_url') : null
  const refs = endKeyframeUrl ? [keyframeUrl, endKeyframeUrl, productUrl] : [keyframeUrl, productUrl]
  const prompt = requiredPrompt(data.prompt)
  const language = String(data.language || 'en').trim().toLowerCase().split(/[-_]/)[0]
  const nativeSpeechSupported = info.nativeSpeechLanguages ? info.nativeSpeechLanguages.includes(language) : null
  const warnings = [...info.notes]
  if (data.voiceMode !== undefined) cenaAssertVoiceRoute(route, data.voiceMode, language)
  const generateAudio = data.voiceMode !== 'narrated'
  const silentRule = data.voiceMode === 'narrated' ? '\nSILENT SCENE: no speech, no dialogue, no narration, no lip-sync. Lips remain closed throughout all shots. Voiceover will be added separately in editing.' : ''

  if (route === 'kling3') {
    const speechRule = data.voiceMode === 'narrated' ? silentRule : nativeSpeechSupported ? '' : '\nAUDIO RULE: ambient sound and product interaction sound only. No spoken dialogue, no narration and no mouth speaking; a separate voiceover will be added in editing. Do not translate the supplied script into English.'
    return [{
      endpoint: info.endpoint,
      input: { start_image_url: keyframeUrl, ...(endKeyframeUrl ? { end_image_url: endKeyframeUrl } : {}), prompt: `${prompt}${speechRule}`, duration: '15', generate_audio: generateAudio },
      seconds: 15, keepSeconds: 15, offsetSeconds: 0, nativeSpeechSupported, warnings,
    }]
  }

  if (route === 'seedance2') return [{
    endpoint: info.endpoint,
    input: {
      prompt: `@Image1 is the approved opening and actor. ${endKeyframeUrl ? '@Image2 is the approved use scene with the same actor. @Image3' : '@Image2'} is the customer's exact product reference; preserve its identity.\n${prompt}${silentRule}`,
      image_urls: refs, duration: '15', aspect_ratio: '9:16', resolution: '720p', generate_audio: generateAudio,
    },
    seconds: 15, keepSeconds: 15, offsetSeconds: 0, nativeSpeechSupported, warnings,
  }]

  return [0, 8].map((offsetSeconds, index) => ({
    endpoint: info.endpoint,
    input: {
      prompt: `The first reference is the approved opening and actor; ${endKeyframeUrl ? 'the second is the approved use scene; the third' : 'the second'} is the customer's exact product. Preserve all identities.\n${data.segmentPrompts?.[index] ?? prompt}${silentRule}\nSEGMENT ${index + 1}/2: local 0s equals absolute ${offsetSeconds}s. ${index === 0 ? 'End with ongoing product interaction.' : 'Continue from absolute 8s. The last generated second will be trimmed.'}`,
      image_urls: refs, duration: '8s', aspect_ratio: '9:16', resolution: '720p', generate_audio: generateAudio,
    },
    seconds: 8, keepSeconds: index === 0 ? 8 : 7, offsetSeconds, nativeSpeechSupported, warnings: [...warnings],
  }))
}

export type CenaKeyframeRequest = { endpoint: string; input: Record<string, unknown> }

/** Um candidato por chamada: best-of-2 e o teto de refação são responsabilidade da orquestração. */
export function cenaKeyframeRequest(data: { productUrl: string; prompt: string; actorUrl?: string; attempt?: number }): CenaKeyframeRequest {
  const productUrl = requiredUrl(data.productUrl, 'product_url')
  const actorUrl = data.actorUrl ? requiredUrl(data.actorUrl, 'actor_url') : null
  const prompt = requiredPrompt(data.prompt)
  const candidate = Number.isInteger(data.attempt) && Number(data.attempt) > 0 ? Number(data.attempt) : 1
  return {
    endpoint: CENA_KEYFRAME_ENDPOINT,
    input: {
      prompt: `Reference image 1 is the exact customer product: preserve its whole shape, label, colors and real scale.${actorUrl ? ' Reference image 2 defines the actor identity.' : ''}\n${prompt}\nCandidate ${candidate}. Only the depicted actor's own hands, anatomically connected to that actor's arms. No extra person, no extra hand, no disconnected limb. Nothing touches the face. The entire product remains visible and faithful.`,
      image_urls: actorUrl ? [productUrl, actorUrl] : [productUrl], num_images: 1,
      aspect_ratio: '9:16', resolution: '2K', output_format: 'png', enable_web_search: false,
    },
  }
}

export type CenaCostEstimate = {
  route: CenaRoute
  voice_mode?: CenaVoiceMode
  generateAudio: boolean
  checkedAt: string
  estimated: true
  currency: 'USD'
  outputSeconds: 15
  generatedSeconds: number
  videoUsdPerSecond: number
  videoUsd: number
  keyframesBestOf2Usd: number
  knownSubtotalUsd: number
  totalUsd: null
  targetUsd: 3.7
  knownSubtotalWithinTarget: boolean
  unknowns: readonly string[]
  sources: readonly string[]
  notes: readonly string[]
}

function costFor(route: CenaRoute, voiceMode?: CenaVoiceMode): CenaCostEstimate {
  const info = CENA_ROUTES[route]
  const generatedSeconds = info.secondsPerRequest * info.requestsFor15Seconds
  const generateAudio = voiceMode !== 'narrated'
  const videoUsdPerSecond = generateAudio ? info.videoUsdPerSecond : info.silentVideoUsdPerSecond
  const videoUsd = Number((generatedSeconds * videoUsdPerSecond).toFixed(4))
  const keyframesBestOf2Usd = Number((4 * CENA_KEYFRAME_USD).toFixed(4))
  const knownSubtotalUsd = Number((videoUsd + keyframesBestOf2Usd).toFixed(4))
  return {
    route, ...(voiceMode ? { voice_mode: voiceMode } : {}), generateAudio, checkedAt: CENA_CONTRACTS_CHECKED_AT, estimated: true, currency: 'USD', outputSeconds: 15,
    generatedSeconds, videoUsdPerSecond, videoUsd, keyframesBestOf2Usd, knownSubtotalUsd,
    totalUsd: null, targetUsd: 3.7, knownSubtotalWithinTarget: knownSubtotalUsd <= 3.7,
    unknowns: ['Classificador e roteiro: tokens ainda não medidos.', 'Juiz visual: imagens/tokens ainda não medidos.', 'Creatomate: custo da montagem não confirmado.', ...(voiceMode === 'narrated' ? ['TTS obrigatório: custo ainda desconhecido e não incluído no subtotal.'] : voiceMode === undefined ? ['Voiceover legado, se necessário: custo não incluído.'] : []), 'Novas tentativas: custo não incluído.'],
    sources: [info.docs, info.pricing, CENA_KEYFRAME_SOURCE],
    notes: ['Estimativa aritmética da tarifa pública, sem chamada paga, tributos ou garantia de faturamento.', ...info.notes],
  }
}

export function cenaCosts(route: CenaRoute, voiceMode?: CenaVoiceMode): CenaCostEstimate
export function cenaCosts(route?: undefined, voiceMode?: CenaVoiceMode): Record<CenaRoute, CenaCostEstimate>
export function cenaCosts(route?: CenaRoute, voiceMode?: CenaVoiceMode): CenaCostEstimate | Record<CenaRoute, CenaCostEstimate> {
  if (voiceMode !== undefined && !isCenaVoiceMode(voiceMode)) throw new Error('cena_bad_voice_mode')
  if (route !== undefined) {
    if (!isCenaRoute(route)) throw new Error('cena_route_invalid')
    return costFor(route, voiceMode)
  }
  return { kling3: costFor('kling3', voiceMode), seedance2: costFor('seedance2', voiceMode), veo31: costFor('veo31', voiceMode) }
}
