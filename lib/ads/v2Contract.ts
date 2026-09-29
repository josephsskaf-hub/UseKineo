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
/**
 * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — vídeos do cliente que entram COMO VÍDEO (espelho de ADS_V2_MAX_USER_VIDEOS,
 * lib/ads/v2UserVideo.ts). Cada vídeo ocupa uma vaga de foto: fotos + vídeos ficam entre 3 e 7, com pelo menos 1 foto
 * (a cena criada do Comercial/Cinema usa as fotos como referência e o molde reparte as fotos pelas vagas que sobram).
 */
export const ADS_V2_CONTRACT_MAX_VIDEOS = 2
/** Teto do início sugerido pelo navegador (s) — o servidor ainda confere contra a duração MEDIDA. */
export const ADS_V2_VIDEO_START_MAX = 3600
/** Maior lado aceito para largura/altura informadas pelo navegador (só servem para o enquadramento). */
export const ADS_V2_VIDEO_DIM_MAX = 8192
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
// Função declarada (não seta genérica): o pré-visualizador de páginas (scripts/preview-ux-complete.mjs) transpila como TSX,
// e `<T>(…) =>` vira tag JSX — quebrava toda página que importa este arquivo (via lib/growth/studioAdsFacts.ts).
function fail<T>(error: string): AdsV2Sanitized<T> {
  return { ok: false, error }
}

// KINEO-ADS-MODO-SIMPLES-2026-09-29 — modo simples do /ads/v2 (pedido do fundador ao tentar anunciar o próprio imóvel:
// "coloco os arquivos, falo mais ou menos o que quero, escolho o nível, e vocês fazem"). Os campos do modo simples SÓ
// existem no valor devolvido quando o corpo diz mode:'simple'. Sem mode (ou mode:'full') o retorno é o de antes, chave
// por chave — o guardião base (C1/C5) e o modo completo não mudam.
export type AdsV2ContractMode = 'simple' | 'full'
export const ADS_V2_CONTRACT_MODES: readonly AdsV2ContractMode[] = ['simple', 'full']
export const ADS_V2_PRICE_MAX_CHARS = 60
export const ADS_V2_CONTACT_MAX_CHARS = 80
/** Fatos da pesquisa: ids f1..f6 (a pesquisa devolve no máximo 6). */
export const ADS_V2_MAX_FACTS = 6
const FACT_ID_RE = /^f[1-6]$/

/** Lê `mode`: ausente = 'full'; valor fora do enum = null (a rota devolve bad_mode). */
function readMode(b: Record<string, unknown>): AdsV2ContractMode | null {
  if (b.mode === undefined || b.mode === null) return 'full'
  return typeof b.mode === 'string' && (ADS_V2_CONTRACT_MODES as readonly string[]).includes(b.mode) ? (b.mode as AdsV2ContractMode) : null
}
/** Texto curto opcional: ausente/vazio = null; não-string ou longo demais = undefined (recusa). */
function shortText(v: unknown, max: number): string | null | undefined {
  if (v === undefined || v === null) return null
  if (typeof v !== 'string') return undefined
  const s = v.replace(/\s+/g, ' ').trim()
  if (s.length > max) return undefined
  return s || null
}

export interface AdsV2CreateOrderBody {
  tier: AdsV2ContractTier
  seconds: AdsV2ContractSeconds
  sector: AdsV2ContractSector | null
  sentence: string | null
  link: string | null
  language: string | null
  narration: boolean
  /** Só no modo simples (mode:'simple'); ausentes no modo completo. */
  mode?: 'simple'
  /** Frases na tela (padrão ligadas). false = o anúncio sai sem nenhuma frase. */
  overlays?: boolean
  /** Preço que a PESSOA escreveu (vai ao texto do anúncio e ao cartão). Nunca vai à pesquisa. */
  price?: string | null
  /** Contato que a PESSOA escreveu. Nunca vai à pesquisa. */
  contact?: string | null
  /** Rascunho anterior da mesma conta: se a frase for idêntica, a pesquisa gravada é copiada (sem pesquisar de novo). */
  research_from?: string | null
}

/** POST criar pedido: nível, duração (padrão 15), 1 frase OU o link do negócio, idioma e narração (padrão ligada). */
export function sanitizeCreateOrderBody(raw: unknown): AdsV2Sanitized<AdsV2CreateOrderBody> {
  const b = obj(raw)
  if (!b) return fail('bad_body')
  const mode = readMode(b)
  if (!mode) return fail('bad_mode')
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
  const value: AdsV2CreateOrderBody = { tier: tier as AdsV2ContractTier, seconds: seconds as AdsV2ContractSeconds, sector, sentence, link, language, narration }
  if (mode !== 'simple') return { ok: true, value }
  let overlays = true
  if (b.overlays !== undefined && b.overlays !== null) {
    if (typeof b.overlays !== 'boolean') return fail('bad_overlays')
    overlays = b.overlays
  }
  const price = shortText(b.price, ADS_V2_PRICE_MAX_CHARS)
  if (price === undefined) return fail('bad_price')
  const contact = shortText(b.contact, ADS_V2_CONTACT_MAX_CHARS)
  if (contact === undefined) return fail('bad_contact')
  let researchFrom: string | null = null
  if (b.research_from !== undefined && b.research_from !== null) {
    if (!isUuid(b.research_from)) return fail('bad_research_from')
    researchFrom = (b.research_from as string).toLowerCase()
  }
  return { ok: true, value: { ...value, mode: 'simple', overlays, price, contact, research_from: researchFrom } }
}

export interface AdsV2PlanPhoto {
  footage_id: string
  kind: AdsV2ContractPhotoKind
}
/** Vídeo do cliente que entra como vídeo (KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29). */
export interface AdsV2PlanVideo {
  footage_id: string
  /** Início do trecho mais vivo sugerido pelo navegador (s); null = o servidor usa o meio. */
  start: number | null
  /** Ponto focal (0..1) que a pessoa arrastou; 0,5 = centro. Só pesa em vídeo horizontal (recorte 9:16). */
  focus_x: number
  focus_y: number
  /** Largura/altura lidas no navegador (só para o enquadramento); null = desconhecidas (recorte ao centro). */
  width: number | null
  height: number | null
}
export interface AdsV2PlanBody {
  order_id: string
  sector: AdsV2ContractSector
  /** Obrigatório no modo completo; opcional (null) só com mode:'simple' — pessoa física não tem logo. */
  logo_footage_id: string | null
  photos: AdsV2PlanPhoto[]
  /** Só aparece quando veio pelo menos 1 vídeo (sem vídeo o corpo devolvido é o de antes, chave por chave). */
  videos?: AdsV2PlanVideo[]
  /** Só no modo simples. */
  mode?: 'simple'
  /** Ids dos fatos da pesquisa que a pessoa deixou marcados (f1..f6). O TEXTO do fato nunca vem do cliente. */
  facts?: string[]
}

/** Número finito dentro de [min, max]; ausente = `absent`; fora = undefined (recusa). */
function numIn(v: unknown, min: number, max: number, absent: number | null): number | null | undefined {
  if (v === undefined || v === null) return absent
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) return undefined
  return v
}

/**
 * Vídeos do corpo (KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29): ausente = []; até ADS_V2_CONTRACT_MAX_VIDEOS, uuid sem
 * repetir, início/foco/dimensões nos limites. Nunca confere dono nem duração (a rota faz, contra o banco e o arquivo).
 */
function readVideos(raw: unknown): AdsV2Sanitized<AdsV2PlanVideo[]> {
  if (raw === undefined || raw === null) return { ok: true, value: [] }
  if (!Array.isArray(raw)) return fail('bad_videos')
  if (raw.length > ADS_V2_CONTRACT_MAX_VIDEOS) return fail('too_many_videos')
  const out: AdsV2PlanVideo[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const v = obj(item)
    if (!v || !isUuid(v.footage_id)) return fail('bad_video_id')
    const id = (v.footage_id as string).toLowerCase()
    if (seen.has(id)) return fail('duplicate_photo')
    seen.add(id)
    const start = numIn(v.start, 0, ADS_V2_VIDEO_START_MAX, null)
    const fx = numIn(v.focus_x, 0, 1, 0.5)
    const fy = numIn(v.focus_y, 0, 1, 0.5)
    const w = numIn(v.width, 1, ADS_V2_VIDEO_DIM_MAX, null)
    const h = numIn(v.height, 1, ADS_V2_VIDEO_DIM_MAX, null)
    if (start === undefined || fx === undefined || fy === undefined || w === undefined || h === undefined) return fail('bad_video')
    out.push({ footage_id: id, start, focus_x: fx as number, focus_y: fy as number, width: w === null ? null : Math.round(w), height: h === null ? null : Math.round(h) })
  }
  return { ok: true, value: out }
}

/**
 * POST planejar: setor, logo e 3 a 7 fotos JÁ recortadas em 9:16 no navegador, cada uma com o tipo marcado.
 * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — mais até 2 vídeos que entram como vídeo: fotos + vídeos entre 3 e 7, com pelo
 * menos 1 foto. Sem vídeo, as regras e o valor devolvido são os de antes.
 */
export function sanitizePlanBody(raw: unknown): AdsV2Sanitized<AdsV2PlanBody> {
  const b = obj(raw)
  if (!b) return fail('bad_body')
  const mode = readMode(b)
  if (!mode) return fail('bad_mode')
  const simple = mode === 'simple'
  if (!isUuid(b.order_id)) return fail('bad_order_id')
  if (typeof b.sector !== 'string' || !(ADS_V2_CONTRACT_SECTORS as readonly string[]).includes(b.sector)) return fail('bad_sector')
  const logoAbsent = b.logo_footage_id === undefined || b.logo_footage_id === null
  if (!(simple && logoAbsent) && !isUuid(b.logo_footage_id)) return fail('bad_logo_footage_id')
  const logoId = logoAbsent ? null : (b.logo_footage_id as string).toLowerCase()
  let facts: string[] = []
  if (simple && b.facts !== undefined && b.facts !== null) {
    if (!Array.isArray(b.facts) || b.facts.length > ADS_V2_MAX_FACTS) return fail('bad_facts')
    const seenFacts = new Set<string>()
    for (const f of b.facts) {
      if (typeof f !== 'string' || !FACT_ID_RE.test(f) || seenFacts.has(f)) return fail('bad_facts')
      seenFacts.add(f)
    }
    facts = [...seenFacts]
  }
  if (!Array.isArray(b.photos)) return fail('bad_photos')
  const vids = readVideos(b.videos)
  if (!vids.ok) return vids
  const videos = vids.value
  const total = b.photos.length + videos.length
  if (b.photos.length < 1 || total < ADS_V2_CONTRACT_MIN_PHOTOS) return fail('too_few_photos')
  if (total > ADS_V2_CONTRACT_MAX_PHOTOS) return fail('too_many_photos')
  const photos: AdsV2PlanPhoto[] = []
  const seen = new Set<string>()
  for (const item of b.photos) {
    const p = obj(item)
    if (!p || !isUuid(p.footage_id)) return fail('bad_photo_id')
    if (typeof p.kind !== 'string' || !(ADS_V2_CONTRACT_PHOTO_KINDS as readonly string[]).includes(p.kind)) return fail('bad_photo_kind')
    const id = (p.footage_id as string).toLowerCase()
    if (seen.has(id)) return fail('duplicate_photo')
    if (id === logoId) return fail('logo_is_photo')
    seen.add(id)
    photos.push({ footage_id: id, kind: p.kind as AdsV2ContractPhotoKind })
  }
  for (const v of videos) {
    if (seen.has(v.footage_id)) return fail('duplicate_photo')
    if (v.footage_id === logoId) return fail('logo_is_photo')
  }
  const value: AdsV2PlanBody = {
    order_id: (b.order_id as string).toLowerCase(),
    sector: b.sector as AdsV2ContractSector,
    logo_footage_id: logoId,
    photos,
    ...(videos.length > 0 ? { videos } : {}),
  }
  return { ok: true, value: simple ? { ...value, mode: 'simple', facts } : value }
}

export interface AdsV2ResearchBody {
  order_id: string
}

/** POST pesquisar (modo simples): só o pedido. O que se pesquisa é a frase GRAVADA no pedido, nunca texto do corpo. */
export function sanitizeResearchBody(raw: unknown): AdsV2Sanitized<AdsV2ResearchBody> {
  const b = obj(raw)
  if (!b) return fail('bad_body')
  if (!isUuid(b.order_id)) return fail('bad_order_id')
  return { ok: true, value: { order_id: (b.order_id as string).toLowerCase() } }
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

export interface AdsV2AssetsBody {
  logo_footage_id: string | null
  /** Cartão final (PNG 1080×1920 desenhado no navegador por lib/ads/endCard.ts e enviado ao user_footage). */
  card_footage_id: string | null
  /** null = não mandou fotos ainda (o rascunho pode nascer só com a frase); mandou = 3 a 7, sem repetir. */
  photos: AdsV2PlanPhoto[] | null
}

/**
 * ETAPA 2 — os arquivos que o rascunho (POST /api/ads/v2/orders) e o plano (POST /api/ads/v2/plan) podem trazer:
 * logo, cartão final e fotos com o tipo marcado. Tudo opcional aqui; o /start exige plano e cartão. Mesmas regras
 * das fotos do plano: uuid, tipo no enum, sem repetir, logo e cartão nunca contam como foto.
 */
export function sanitizeAssetsBody(raw: unknown): AdsV2Sanitized<AdsV2AssetsBody> {
  const b = obj(raw)
  if (!b) return fail('bad_body')
  let logo: string | null = null
  if (b.logo_footage_id !== undefined && b.logo_footage_id !== null) {
    if (!isUuid(b.logo_footage_id)) return fail('bad_logo_footage_id')
    logo = (b.logo_footage_id as string).toLowerCase()
  }
  let card: string | null = null
  if (b.card_footage_id !== undefined && b.card_footage_id !== null) {
    if (!isUuid(b.card_footage_id)) return fail('bad_card_footage_id')
    card = (b.card_footage_id as string).toLowerCase()
  }
  if (logo && card && logo === card) return fail('card_is_logo')
  let photos: AdsV2PlanPhoto[] | null = null
  // KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — cada vídeo que entra como vídeo ocupa uma vaga de foto (mínimo de 1 foto).
  const videoCount = Array.isArray(b.videos) ? Math.min(b.videos.length, ADS_V2_CONTRACT_MAX_VIDEOS) : 0
  const minPhotos = Math.max(1, ADS_V2_CONTRACT_MIN_PHOTOS - videoCount)
  if (b.photos !== undefined && b.photos !== null) {
    if (!Array.isArray(b.photos)) return fail('bad_photos')
    if (b.photos.length < minPhotos) return fail('too_few_photos')
    if (b.photos.length > ADS_V2_CONTRACT_MAX_PHOTOS) return fail('too_many_photos')
    photos = []
    const seen = new Set<string>()
    for (const item of b.photos) {
      const p = obj(item)
      if (!p || !isUuid(p.footage_id)) return fail('bad_photo_id')
      if (typeof p.kind !== 'string' || !(ADS_V2_CONTRACT_PHOTO_KINDS as readonly string[]).includes(p.kind)) return fail('bad_photo_kind')
      const id = (p.footage_id as string).toLowerCase()
      if (seen.has(id)) return fail('duplicate_photo')
      if (id === logo) return fail('logo_is_photo')
      if (id === card) return fail('card_is_photo')
      seen.add(id)
      photos.push({ footage_id: id, kind: p.kind as AdsV2ContractPhotoKind })
    }
  }
  return { ok: true, value: { logo_footage_id: logo, card_footage_id: card, photos } }
}

export interface AdsV2PatchBody {
  order_id: string
  /** Liga/desliga a narração do rascunho/plano (o botão da prévia do plano). Ausente = não mexe. */
  narration: boolean | null
  /** Troca o cartão final do plano (a pessoa editou o cartão depois de planejar). Ausente = não mexe. */
  card_footage_id: string | null
}

/**
 * ETAPA 3 — PATCH do pedido pela tela (/ads/v2): só narração e cartão final, só em rascunho/planejado. Pelo menos um
 * dos dois. Nada aqui muda nível, fotos, frase ou plano (isso é um plano novo, com o modelo de novo).
 */
export function sanitizePatchBody(raw: unknown): AdsV2Sanitized<AdsV2PatchBody> {
  const b = obj(raw)
  if (!b) return fail('bad_body')
  if (!isUuid(b.order_id)) return fail('bad_order_id')
  let narration: boolean | null = null
  if (b.narration !== undefined && b.narration !== null) {
    if (typeof b.narration !== 'boolean') return fail('bad_narration')
    narration = b.narration
  }
  let card: string | null = null
  if (b.card_footage_id !== undefined && b.card_footage_id !== null) {
    if (!isUuid(b.card_footage_id)) return fail('bad_card_footage_id')
    card = (b.card_footage_id as string).toLowerCase()
  }
  if (narration === null && card === null) return fail('nothing_to_change')
  return { ok: true, value: { order_id: (b.order_id as string).toLowerCase(), narration, card_footage_id: card } }
}
