// KINEO-ADS-V2-2026-09-28 — sanitizadores dos corpos das rotas do anúncio v2 (app/api/ads/v2/*).
//
// Cada corpo é montado CAMPO A CAMPO a partir do JSON recebido (nada de espalhar o objeto do cliente). Chave
// desconhecida é ignorada; valor fora do enum ou do limite é recusado com um código curto que a rota devolve em 400.
// Limites: frase ≤ 400 caracteres, 3 a 7 fotos, ids uuid, tier/segundos/setor/tipo de foto nos enums.
//
// LIB PURA (nenhum import): enums copiados de lib/ads/v2Tiers.ts e lib/ads/v2ShotLists.ts; o guardião confere o espelho.

export type AdsV2ContractTier = 'photo_motion' | 'commercial' | 'cinema'
export type AdsV2ContractSeconds = 15 | 20 | 30
export type AdsV2ContractSector = 'restaurant' | 'clinic' | 'real_estate' | 'gym' | 'salon' | 'store' | 'app_service' | 'other'
export type AdsV2ContractPhotoKind = 'people' | 'place' | 'product' | 'text'

export const ADS_V2_CONTRACT_TIERS: readonly AdsV2ContractTier[] = ['photo_motion', 'commercial', 'cinema']
export const ADS_V2_CONTRACT_SECONDS: readonly AdsV2ContractSeconds[] = [15, 20, 30]
export const ADS_V2_CONTRACT_SECTORS: readonly AdsV2ContractSector[] = ['restaurant', 'clinic', 'real_estate', 'gym', 'salon', 'store', 'app_service', 'other']
export const ADS_V2_CONTRACT_PHOTO_KINDS: readonly AdsV2ContractPhotoKind[] = ['people', 'place', 'product', 'text']

export const ADS_V2_SENTENCE_MAX_CHARS = 400
export const ADS_V2_LINK_MAX_CHARS = 500
export const ADS_V2_CONTRACT_MIN_PHOTOS = 3
export const ADS_V2_CONTRACT_MAX_PHOTOS = 7
/** Maior índice de plano possível: Cinema de 30 s = 7 + 6 extras = 13 planos (0..12). Folga para o molde crescer. */
export const ADS_V2_MAX_SHOT_IDX = 15
/** Teto do preço de refação que a tela pode confirmar (hoje 5 ou 12 cr; provisório). */
export const ADS_V2_MAX_RETAKE_CREDITS = 50

export type AdsV2Sanitized<T> = { ok: true; value: T } | { ok: false, error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LANG_RE = /^[a-z]{2}$/

export function isUuid(raw: unknown): raw is string {
  return typeof raw === 'string' && UUID_RE.test(raw)
}
const obj = (raw: unknown): Record<string, unknown> | null =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null
const fail = <T>(error: string): AdsV2Sanitized<T> => ({ ok: false, error })

export interface AdsV2CreateOrderBody {
  tier: AdsV2ContractTier
  seconds: AdsV2ContractSeconds
  sector: AdsV2ContractSector | null
  sentence: string | null
  link: string | null
  language: string | null
  narration: boolean
}

/** POST criar pedido: nível, duração (padrão 15), 1 frase OU o link do negócio, idioma e narração (padrão ligada). */
export function sanitizeCreateOrderBody(raw: unknown): AdsV2Sanitized<AdsV2CreateOrderBody> {
  const b = obj(raw)
  if (!b) return fail('bad_body')
  const tier = b.tier
  if (typeof tier !== 'string' || !(ADS_V2_CONTRACT_TIERS as readonly string[]).includes(tier)) return fail('bad_tier')
  const seconds = b.seconds === undefined || b.seconds === null ? 15 : b.seconds
  if (typeof seconds !== 'number' || !(ADS_V2_CONTRACT_SECONDS as readonly number[]).includes(seconds)) return fail('bad_seconds')
  let sector: AdsV2ContractSector | null = null
  if (b.sector !== undefined && b.sector !== null) {
    if (typeof b.sector !== 'string' || !(ADS_V2_CONTRACT_SECTORS as readonly string[]).includes(b.sector)) return fail('bad_sector')
    sector = b.sector as AdsV2ContractSector
  }
  let sentence: string | null = null
  if (b.sentence !== undefined && b.sentence !== null) {
    if (typeof b.sentence !== 'string') return fail('bad_sentence')
    const s = b.sentence.replace(/\s+/g, ' ').trim()
    if (s.length > ADS_V2_SENTENCE_MAX_CHARS) return fail('sentence_too_long')
    sentence = s || null
  }
  let link: string | null = null
  if (b.link !== undefined && b.link !== null && b.link !== '') {
    if (typeof b.link !== 'string') return fail('bad_link')
    const l = b.link.trim()
    if (l.length > ADS_V2_LINK_MAX_CHARS || !/^https?:\/\/[^\s]+$/i.test(l)) return fail('bad_link')
    link = l
  }
  if (!sentence && !link) return fail('sentence_or_link_required')
  let language: string | null = null
  if (b.language !== undefined && b.language !== null && b.language !== '') {
    if (typeof b.language !== 'string' || !LANG_RE.test(b.language.trim().toLowerCase())) return fail('bad_language')
    language = b.language.trim().toLowerCase()
  }
  let narration = true
  if (b.narration !== undefined && b.narration !== null) {
    if (typeof b.narration !== 'boolean') return fail('bad_narration')
    narration = b.narration
  }
  return { ok: true, value: { tier: tier as AdsV2ContractTier, seconds: seconds as AdsV2ContractSeconds, sector, sentence, link, language, narration } }
}

export interface AdsV2PlanPhoto {
  footage_id: string
  kind: AdsV2ContractPhotoKind
}
export interface AdsV2PlanBody {
  order_id: string
  sector: AdsV2ContractSector
  logo_footage_id: string
  photos: AdsV2PlanPhoto[]
}

/** POST planejar: setor, logo e 3 a 7 fotos JÁ recortadas em 9:16 no navegador, cada uma com o tipo marcado. */
export function sanitizePlanBody(raw: unknown): AdsV2Sanitized<AdsV2PlanBody> {
  const b = obj(raw)
  if (!b) return fail('bad_body')
  if (!isUuid(b.order_id)) return fail('bad_order_id')
  if (typeof b.sector !== 'string' || !(ADS_V2_CONTRACT_SECTORS as readonly string[]).includes(b.sector)) return fail('bad_sector')
  if (!isUuid(b.logo_footage_id)) return fail('bad_logo_footage_id')
  if (!Array.isArray(b.photos)) return fail('bad_photos')
  if (b.photos.length < ADS_V2_CONTRACT_MIN_PHOTOS) return fail('too_few_photos')
  if (b.photos.length > ADS_V2_CONTRACT_MAX_PHOTOS) return fail('too_many_photos')
  const photos: AdsV2PlanPhoto[] = []
  const seen = new Set<string>()
  for (const item of b.photos) {
    const p = obj(item)
    if (!p || !isUuid(p.footage_id)) return fail('bad_photo_id')
    if (typeof p.kind !== 'string' || !(ADS_V2_CONTRACT_PHOTO_KINDS as readonly string[]).includes(p.kind)) return fail('bad_photo_kind')
    const id = (p.footage_id as string).toLowerCase()
    if (seen.has(id)) return fail('duplicate_photo')
    if (id === (b.logo_footage_id as string).toLowerCase()) return fail('logo_is_photo')
    seen.add(id)
    photos.push({ footage_id: id, kind: p.kind as AdsV2ContractPhotoKind })
  }
  return {
    ok: true,
    value: {
      order_id: (b.order_id as string).toLowerCase(),
      sector: b.sector as AdsV2ContractSector,
      logo_footage_id: (b.logo_footage_id as string).toLowerCase(),
      photos,
    },
  }
}

export interface AdsV2StartBody {
  order_id: string
  dry_run: boolean
}

/** POST iniciar. dry_run:true devolve plano + créditos + US$ estimado SEM cobrar e sem chamar a fal. */
export function sanitizeStartBody(raw: unknown): AdsV2Sanitized<AdsV2StartBody> {
  const b = obj(raw)
  if (!b) return fail('bad_body')
  if (!isUuid(b.order_id)) return fail('bad_order_id')
  let dry_run = false
  if (b.dry_run !== undefined && b.dry_run !== null) {
    if (typeof b.dry_run !== 'boolean') return fail('bad_dry_run')
    dry_run = b.dry_run
  }
  return { ok: true, value: { order_id: (b.order_id as string).toLowerCase(), dry_run } }
}

export interface AdsV2RetakeBody {
  order_id: string
  idx: number
  /** O preço que a tela MOSTROU antes do clique; o servidor recusa se o preço do plano for outro. */
  expected_credits: number
}

/** POST refazer um plano (cobrado à parte). */
export function sanitizeRetakeBody(raw: unknown): AdsV2Sanitized<AdsV2RetakeBody> {
  const b = obj(raw)
  if (!b) return fail('bad_body')
  if (!isUuid(b.order_id)) return fail('bad_order_id')
  if (typeof b.idx !== 'number' || !Number.isInteger(b.idx) || b.idx < 0 || b.idx > ADS_V2_MAX_SHOT_IDX) return fail('bad_idx')
  const c = b.expected_credits
  if (typeof c !== 'number' || !Number.isInteger(c) || c < 1 || c > ADS_V2_MAX_RETAKE_CREDITS) return fail('bad_expected_credits')
  return { ok: true, value: { order_id: (b.order_id as string).toLowerCase(), idx: b.idx, expected_credits: c } }
}
