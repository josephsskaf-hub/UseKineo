// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — contrato do render e da prévia de voz do Studio Ads (fundador 24/09 à noite:
// "eu quero que a pessoa consiga fazer sozinha ... colocar os vídeos dela, as fotos, as narrações ... automatizar").
// Módulo PURO (sem import de servidor, sem React): as telas (/ads/new) e as rotas (/api/ads/render, /api/ads/voice)
// importam daqui os mesmos tipos, vozes, limites e a mesma validação — um contrato, dois lados.
//
// POR QUE O RENDER NÃO PASSA PELO /api/generate-video-fast (mapeamento de 24/09, 5 agentes, file:line no
// docs/STUDIO-ADS-DIA-1-2026-09-25.md §13): com o passe a conta tem has_paid=true e a rota do Kineo 1 injeta clipes
// Seedance NA FRENTE das fotos da empresa; com marcadores [Pexels:] ela ignora userFootageUrl; sem marcadores ela
// divide por frases e não por batidas; e não tem campo de voz. O anúncio vai direto ao /api/compose (quality 'fast',
// o montador do Kineo 1) com a lista de mídia montada no servidor, tomada a tomada, e a narração já sintetizada na
// voz que a pessoa escolheu (user_voiceover_url). Nada na trava 8.2 é editado — só chamado.
import type { AdsModel } from '@/lib/ads/models'

/** Vozes da narração (OpenAI tts-1-hd — a mesma família de voz do Kineo 1). Falam o idioma do texto. */
export const ADS_VOICES = [
  { id: 'nova', label: 'Warm · female' },
  { id: 'shimmer', label: 'Bright · female' },
  { id: 'onyx', label: 'Deep · male' },
  { id: 'echo', label: 'Calm · male' },
] as const
export type AdsVoiceId = (typeof ADS_VOICES)[number]['id']
export const ADS_DEFAULT_VOICE: AdsVoiceId = 'nova'
export function isAdsVoice(v: unknown): v is AdsVoiceId {
  return typeof v === 'string' && ADS_VOICES.some((x) => x.id === v)
}

/** Prévia de voz: texto curto, grátis para a pessoa, com teto diário por conta (custo nosso ~US$0,003 por prévia). */
export const ADS_VOICE_PREVIEW_MAX_CHARS = 200
export const ADS_VOICE_PREVIEW_DAILY_CAP = 40
export const ADS_VOICE_PREVIEW_SERVED_EVENT = 'ads_voice_preview_served'

/** Mídia por batida: 1 a 4 itens da própria conta (fotos giram; vídeo entra no máximo uma vez por batida). */
export const ADS_MAX_MEDIA_PER_BEAT = 4
export const ADS_BEAT_MAX_CHARS = 700
/** O montador corta a linha do tempo em 90 s: narração acima disso perde o fim da chamada e o cartão. A voz mais lenta
 *  medida fala ~2,45 pal/s, então o teto de palavras é o que ela diz em 88 s, e o render recusa acima de 89 s medidos. */
export const ADS_MAX_NARRATION_SECONDS = 89
export const ADS_MAX_NARRATION_WORDS = Math.floor(88 * 2.45)

// ─── POST /api/ads/render ────────────────────────────────────────────────────────────────────
export interface AdsRenderRequest {
  order_id: string
  voice: AdsVoiceId
  /** O texto de cada batida, na ordem do modelo (o escolhido nas 3 versões, editado ou não). A última é a do cartão. */
  beats: string[]
  /** Para cada batida que NÃO é a do cartão: ids de user_footage (da mídia do pedido, sem o logo). */
  storyboard: { beatIndex: number; footageIds: string[] }[]
  /** O PNG do cartão final (logo + nome + oferta + contato), desenhado no navegador e subido pelo /api/footage. */
  card_footage_id: string
  /** KINEO-ADS-SEM-LEGENDA-2026-09-26 — false = anúncio sem legenda na tela (a narração continua). Ausente = com legenda. */
  captions?: boolean
}
export interface AdsRenderStarted {
  order_id: string
  status: 'rendering'
  generation_id: string
  render_id: string
  seconds: 35 | 60
  credits: number
  /** Duração real da narração sintetizada (o filme segue a voz, nunca corta a fala). */
  narration_seconds: number
  /** Título do vídeo (vai no ?topic= do /api/compose/status e vira o título na biblioteca). */
  topic: string
}
/** GET /api/ads/render?order_id=… — estado do pedido; quando o vídeo existe, o servidor marca 'delivered'. */
export interface AdsRenderState {
  order_id: string
  status: 'draft' | 'rendering' | 'delivered' | 'reviewed' | 'failed' | 'cancelled'
  render_id: string | null
  seconds: 35 | 60 | null
  video_id: string | null
  final_video_url: string | null
  failure: string | null
  topic: string | null
}

/** Códigos de erro do render e da prévia → frase para a tela (a rota devolve { error: code, message }). */
export const ADS_RENDER_ERROR_MESSAGES: Record<string, string> = {
  unauthenticated: 'Sign in to render your ad.',
  closed: 'Studio Ads opens soon.',
  no_access: 'Studio Ads needs the Studio Ads pass or a paid plan.',
  body_must_be_object: 'Something went wrong. Refresh the page and try again.',
  order_id_invalid: 'This ad could not be found. Refresh the page.',
  order_not_found: 'This ad could not be found. Refresh the page.',
  not_renderable: 'This ad is already rendering or delivered.',
  template_required: 'Choose a model first.',
  consent_required: 'Confirm you have the rights to the photos and videos first.',
  voice_invalid: 'Choose one of the voices.',
  beats_invalid: 'The script does not match the model. Pick a script version again.',
  script_too_short: 'The script is too short for this model. Add a little more detail.',
  script_too_long: 'The script is too long for this model. Trim it a little.',
  storyboard_invalid: 'Pick at least one photo or video for every part of the ad.',
  media_not_owned: 'One of the files is no longer in your account. Upload it again.',
  card_invalid: 'The end card is missing. Go back one step and let it render.',
  out_of_credits: 'You do not have enough credits for this ad.',
  moderation: 'This ad cannot be created on Kineo. Nothing was charged.',
  moderation_unavailable: 'Our safety check is temporarily unavailable. Nothing was charged — try again in a minute.',
  moderation_unprocessable: 'This ad could not be checked. Nothing was charged.',
  pending: 'Your ad is already being prepared. Wait a few seconds.',
  voice_failed: 'The narration could not be generated. Try again in a minute.',
  render_failed: 'The ad could not be rendered. Your credits were not used. Try again in a minute.',
  not_ready: 'Studio Ads is not ready yet.',
  daily_limit: 'You reached today’s limit of voice previews. Try again tomorrow.',
  text_invalid: 'Type a short sentence to preview the voice.',
  another_rendering: 'Another ad is still rendering. Wait for it to finish, then try again.',
  voice_unavailable: 'Voice previews are unavailable right now. Try again in a minute.',
}

type Ok<T> = { ok: true; value: T }
type Err = { ok: false; error: string }
const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
const err = (error: string): Err => ({ ok: false, error })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

/** Faixa de palavras aceita no render: a régua do modelo com folga (a voz real é mais lenta que 3,1 pal/s; o filme segue
 *  a voz, então passar do alvo é bom — "35/60 é norte, não camisa de força"; ficar muito abaixo é história interrompida). */
export function adsRenderWordRange(model: Pick<AdsModel, 'words'>): [number, number] {
  return [Math.floor(model.words[0] * 0.75), Math.min(Math.ceil(model.words[1] * 1.3), ADS_MAX_NARRATION_WORDS)]
}

/** Valida o corpo do render contra o modelo e a mídia do pedido. Pura: quem chama confere dono e banco depois. */
export function sanitizeRenderRequest(
  raw: unknown,
  model: Pick<AdsModel, 'beats' | 'words'>,
  orderMediaIds: readonly string[],
): Ok<AdsRenderRequest> | Err {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return err('body_must_be_object')
  const b = raw as Record<string, unknown>
  const orderId = typeof b.order_id === 'string' && UUID.test(b.order_id) ? b.order_id : null
  if (!orderId) return err('order_id_invalid')
  if (!isAdsVoice(b.voice)) return err('voice_invalid')
  const n = model.beats.length
  const cardIndex = model.beats.findIndex((x) => x.media === 'card')
  if (!Array.isArray(b.beats) || b.beats.length !== n || cardIndex !== n - 1) return err('beats_invalid')
  const beats: string[] = []
  for (const x of b.beats) {
    // '<' e '>' saem do texto (o GPT às vezes escreve '->'); nunca recusa o roteiro por isso.
    const t = typeof x === 'string' ? x.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim() : ''
    if (!t || t.length > ADS_BEAT_MAX_CHARS) return err('beats_invalid')
    beats.push(t)
  }
  const words = countWords(beats.join(' '))
  const [lo, hi] = adsRenderWordRange(model)
  if (words < lo) return err('script_too_short')
  if (words > hi) return err('script_too_long')
  if (!Array.isArray(b.storyboard)) return err('storyboard_invalid')
  const allowed = new Set(orderMediaIds)
  const byBeat = new Map<number, string[]>()
  for (const s of b.storyboard) {
    if (!s || typeof s !== 'object') return err('storyboard_invalid')
    const e = s as Record<string, unknown>
    const bi = typeof e.beatIndex === 'number' && Number.isInteger(e.beatIndex) ? e.beatIndex : -1
    if (bi < 0 || bi >= n - 1 || byBeat.has(bi)) return err('storyboard_invalid')
    if (!Array.isArray(e.footageIds) || e.footageIds.length < 1 || e.footageIds.length > ADS_MAX_MEDIA_PER_BEAT) return err('storyboard_invalid')
    const ids: string[] = []
    for (const id of e.footageIds) {
      if (typeof id !== 'string' || !UUID.test(id)) return err('storyboard_invalid')
      if (!allowed.has(id)) return err('media_not_owned')
      ids.push(id)
    }
    byBeat.set(bi, ids)
  }
  if (byBeat.size !== n - 1) return err('storyboard_invalid')
  const card = typeof b.card_footage_id === 'string' && UUID.test(b.card_footage_id) ? b.card_footage_id : null
  if (!card) return err('card_invalid')
  const storyboard = [...byBeat.entries()].sort((a, c) => a[0] - c[0]).map(([beatIndex, footageIds]) => ({ beatIndex, footageIds }))
  return ok({ order_id: orderId, voice: b.voice, beats, storyboard, card_footage_id: card, captions: b.captions === false ? false : true })
}

export function adsRenderErrorMessage(code: string | null | undefined): string {
  return (code && ADS_RENDER_ERROR_MESSAGES[code]) || 'Something went wrong. Try again in a minute.'
}
