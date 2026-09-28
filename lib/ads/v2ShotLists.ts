// KINEO-ADS-V2-2026-09-28 — moldes de planos por setor do anúncio v2 e a atribuição determinística das fotos.
//
// Especificação: docs/ESPEC-ANUNCIO-V2-2026-09-28.md (seções 1, 2, 5 e 6). Ordem fixa dos planos:
//   GANCHO → DESEJO → USO E EMOÇÃO → LUGAR/PRODUTO → cartão final (desenhado por lib/ads/endCard.ts, 2,5 s).
// Linha do tempo de 15 s: 2,0 / 2,0 / 2,5 / 2,0 / 2,0 / 2,0 (12,5 s) + cartão 2,5 = 15 s.
// Cinema: 7 planos de 2,0 s (14 s) + cartão 2,5 = 16,5 s. Regra da casa: passar do alvo é bom, ficar abaixo é defeito.
// 20 s e 30 s: o molde de 15 s + planos extras de 2,5 s tirados das fotos do cliente (2 e 6 extras), inseridos antes
// do bloco LUGAR/PRODUTO — o custo cresce junto com o crédito (ceil(base × s/15), lib/ads/v2Tiers.ts).
//
// NARRAÇÃO LIGADA por padrão, até 30 palavras em 15 s; legenda palavra por palavra DESLIGADA. ⚠ A receita
// (docs/RECEITA-ANUNCIO-V2-2026-09-28.md) se contradiz: o bloco "já decidido" diz narração ligada e 15 s; os itens 1 e
// 10 dizem 20 s e narração desligada. Vale o bloco decidido e a especificação. Não seguir o item 10.
//
// HONESTIDADE (anti-invenção): o prompt de movimento fala SÓ do movimento e termina em "keep everything exactly as in
// the photo"; a cena criada usa as fotos do cliente como ÚNICA referência de lugar/produto/decoração e proíbe
// acrescentar prato, decoração, estrutura ou vista que não estejam nas fotos. Foto marcada `text` (tela, cardápio com
// preço, placa) vira plano `text`: foto parada com zoom do montador, nunca IA (o motor troca o preço).
//
// LIB PURA (nenhum import): tipos copiados de lib/ads/v2Tiers.ts; o guardião confere que as listas batem.

export type AdsV2Sector = 'restaurant' | 'clinic' | 'real_estate' | 'gym' | 'salon' | 'store' | 'app_service' | 'other'
export type AdsV2PlanTier = 'photo_motion' | 'commercial' | 'cinema'
export type AdsV2PhotoKind = 'people' | 'place' | 'product' | 'text'
export type AdsV2PlanShotKind = AdsV2PhotoKind | 'product_hero'
export type AdsV2PlanSource = 'client_photo' | 'generated_scene'
export type AdsV2Role = 'hook' | 'desire' | 'use' | 'emotion' | 'place' | 'product'
export type AdsV2Beat = 'hook' | 'desire' | 'use_emotion' | 'place_product'

export const ADS_V2_SECTORS: readonly AdsV2Sector[] = ['restaurant', 'clinic', 'real_estate', 'gym', 'salon', 'store', 'app_service', 'other']
export const ADS_V2_PHOTO_KINDS: readonly AdsV2PhotoKind[] = ['people', 'place', 'product', 'text']
export const ADS_V2_PLAN_TIERS: readonly AdsV2PlanTier[] = ['photo_motion', 'commercial', 'cinema']

/** Cartão final (logo real sobre fundo neutro na cor da marca). */
export const ADS_V2_CARD_SECONDS = 2.5
/** Dissolve entre planos (o montador sobrepõe o plano seguinte por este tempo). Espelho de lib/ads/adV2Montage.ts. */
export const ADS_V2_FADE_SECONDS = 0.25
/** Menor clipe gerado entre os motores do v2 (Kling O3, 3 s): o trecho usado tem de caber nele com o dissolve. */
export const ADS_V2_MIN_GEN_SECONDS = 3
/** Narração: até 30 palavras em 15 s (proporcional em 20/30 s). */
export const ADS_V2_NARRATION_WORDS_15 = 30
/** Frase de tela: no máximo 2 linhas no terço do meio. */
export const ADS_V2_OVERLAY_MAX_CHARS = 42
export const ADS_V2_MIN_PHOTOS = 3
export const ADS_V2_MAX_PHOTOS = 7
/** Final obrigatório de todo prompt de movimento. */
export const ADS_V2_KEEP_PHRASE = 'Keep everything exactly as in the photo.'

export function isAdsV2Sector(raw: unknown): raw is AdsV2Sector {
  return typeof raw === 'string' && (ADS_V2_SECTORS as readonly string[]).includes(raw)
}
export function adsV2NarrationMaxWords(seconds: number): number {
  return Math.floor((ADS_V2_NARRATION_WORDS_15 * seconds) / 15)
}

interface SectorSpec {
  /** Como o setor aparece no pedido de cena ("a restaurant commercial"). */
  label: string
  /** 3 pedidos de foto, claros, em inglês — "your ad will show YOUR place". */
  photoRequests: readonly [string, string, string]
  /** Preferência de tipo de foto por papel (a primeira foto do cliente de cada tipo é a melhor). */
  wants: Readonly<Record<AdsV2Role, readonly AdsV2PhotoKind[]>>
  /** 4 cenas de gente comum usando/curtindo, no lugar do cliente (Comercial usa 3; Cinema, 4). */
  sceneActions: readonly [string, string, string, string]
  /** Regra extra do setor na cena criada (política de anúncio / honestidade). */
  sceneRule: string
}

const W = (hook: AdsV2PhotoKind[], desire: AdsV2PhotoKind[], use: AdsV2PhotoKind[], place: AdsV2PhotoKind[], product: AdsV2PhotoKind[]) =>
  ({ hook, desire, use, emotion: use, place, product }) as Readonly<Record<AdsV2Role, readonly AdsV2PhotoKind[]>>

export const ADS_V2_SECTOR_SPECS: Readonly<Record<AdsV2Sector, SectorSpec>> = {
  restaurant: {
    label: 'restaurant',
    photoRequests: ['Your best-selling dish, close up', 'Your dining room with the lights on', 'Your entrance or storefront'],
    wants: W(['product', 'place', 'people', 'text'], ['product', 'people', 'place', 'text'], ['people', 'product', 'place', 'text'], ['place', 'people', 'product', 'text'], ['product', 'place', 'people', 'text']),
    sceneActions: [
      'Friends at a table in this restaurant sharing the food from the photos and laughing',
      'Close-up of hands passing a plate of the food from the photos across the table',
      'A couple tasting the food from the photos and smiling at each other',
      'A family at a table in this dining room enjoying the food from the photos together',
    ],
    sceneRule: 'Only the dishes that appear in the photos; no new dishes, no oven, grill or decor that is not in the photos.',
  },
  clinic: {
    label: 'clinic',
    photoRequests: ['Your reception or waiting room', 'A treatment room, clean and tidy', 'Your team or your front door (with their permission)'],
    wants: W(['place', 'people', 'product', 'text'], ['people', 'place', 'product', 'text'], ['people', 'place', 'product', 'text'], ['place', 'people', 'product', 'text'], ['place', 'product', 'people', 'text']),
    sceneActions: [
      "A relaxed patient smiling while talking with a staff member at this clinic's reception",
      "A patient sitting comfortably in this clinic's room, listening and nodding calmly",
      'A patient walking out of this clinic, smiling and relaxed',
      "A staff member greeting a patient warmly at this clinic's entrance",
    ],
    sceneRule: 'No needles, no drills, no blood, no instruments near the mouth or skin, no before-and-after, nothing about appearance flaws.',
  },
  real_estate: {
    label: 'real estate',
    photoRequests: ['The living room in daylight', 'The kitchen or the best room', 'The facade or the view'],
    wants: W(['place', 'product', 'people', 'text'], ['place', 'product', 'people', 'text'], ['place', 'people', 'product', 'text'], ['place', 'people', 'product', 'text'], ['place', 'product', 'people', 'text']),
    sceneActions: [
      'A couple walking into this living room and looking around, smiling',
      'A person opening the window of this room and enjoying the daylight',
      'Two friends sitting in this living space, talking and relaxed',
      'A family at the kitchen counter of this home, chatting',
    ],
    sceneRule: 'This is a real property: do not add or change furniture, finishes, rooms, windows or views.',
  },
  gym: {
    label: 'gym',
    photoRequests: ['Your main training floor', 'Your best equipment, close up', 'A class or a member training (with permission)'],
    wants: W(['people', 'place', 'product', 'text'], ['product', 'people', 'place', 'text'], ['people', 'place', 'product', 'text'], ['place', 'people', 'product', 'text'], ['product', 'place', 'people', 'text']),
    sceneActions: [
      'A person training on the equipment from the photos, focused and strong',
      'Two friends high-fiving after a workout in this gym',
      'A person drinking water and smiling after training here',
      'A small group class moving together in this space',
    ],
    sceneRule: 'Only the equipment that appears in the photos; no body before-and-after, nothing about appearance flaws.',
  },
  salon: {
    label: 'beauty salon',
    photoRequests: ['Your chairs and mirrors', 'A finished hairstyle or nail work, close up', 'Your entrance or reception'],
    wants: W(['product', 'people', 'place', 'text'], ['product', 'people', 'place', 'text'], ['people', 'place', 'product', 'text'], ['place', 'people', 'product', 'text'], ['product', 'place', 'people', 'text']),
    sceneActions: [
      'A client in the chair of this salon smiling at the mirror',
      "A stylist's hands finishing a client's hair in this salon",
      'A client touching her new look and smiling',
      'Two friends leaving this salon happy and confident',
    ],
    sceneRule: 'No before-and-after, nothing about appearance flaws, no portfolio work that is not in the photos.',
  },
  store: {
    label: 'product',
    photoRequests: ['Your best-selling product on a clean background', "The product in use or in someone's hand", 'Your shop or shelf'],
    wants: W(['product', 'people', 'place', 'text'], ['product', 'people', 'place', 'text'], ['people', 'product', 'place', 'text'], ['place', 'product', 'people', 'text'], ['product', 'place', 'people', 'text']),
    sceneActions: [
      'A person picking up the product from the photos in a real home with window light',
      'Close-up of hands using the product from the photos',
      'A person showing the product from the photos to a friend, both smiling',
      'A person enjoying the product from the photos in everyday life',
    ],
    sceneRule: 'The product must look exactly like in the photos: same shape, color, label and size; no other products.',
  },
  app_service: {
    label: 'app',
    photoRequests: ["Your app's main screen (a screenshot)", 'A person using your service (with permission)', 'Your team or your workspace'],
    wants: W(['text', 'people', 'product', 'place'], ['text', 'people', 'product', 'place'], ['people', 'place', 'product', 'text'], ['place', 'people', 'product', 'text'], ['text', 'product', 'people', 'place']),
    sceneActions: [
      'A person at a café looking at a phone and smiling; the screen faces away from the camera',
      'A person relaxed on a couch holding a phone, pleased; the screen is not visible',
      'Two friends looking at a phone together and laughing; the screen is not visible',
      'A person finishing a task quickly and closing a laptop with a smile; the screen is not visible',
    ],
    sceneRule: 'Never show a screen, an interface, numbers or prices; the app screen only appears in the real screenshots.',
  },
  other: {
    label: 'local business',
    photoRequests: ['Your main product or service, close up', 'Your place or where you work', 'A happy customer (with their permission)'],
    wants: W(['product', 'place', 'people', 'text'], ['product', 'people', 'place', 'text'], ['people', 'place', 'product', 'text'], ['place', 'people', 'product', 'text'], ['product', 'place', 'people', 'text']),
    sceneActions: [
      'A happy customer enjoying the product or service from the photos',
      'Close-up of hands using the product from the photos',
      'Two friends at this place, smiling and talking',
      'A customer leaving this place satisfied',
    ],
    sceneRule: 'Only what appears in the photos; no products, services or structures that are not in the photos.',
  },
}

// ── Movimentos (1 por plano; o mesmo arquivo reusado ganha outro movimento) ─────────────────────────────────────────
export const ADS_V2_MOVEMENTS: Readonly<Record<Exclude<AdsV2PlanShotKind, 'text'>, readonly string[]>> = {
  people: [
    'Gentle handheld drift; the people move naturally, blink and smile',
    'Slow dolly-in at eye level; the people make small natural gestures',
    'Slow lateral slide from left to right; only small natural movements',
  ],
  place: [
    'Slow dolly forward at eye level through the space; the light shifts gently',
    'Slow lateral slide from right to left across the space',
    'Slow pull-back that reveals the whole space',
  ],
  product: [
    'Slow push-in toward the product; soft light glides across its surface',
    'Slow 20-degree orbit around the product',
    'Slow tilt down onto the product with a soft focus pull',
  ],
  product_hero: [
    'Macro close-up, slow push-in; soft light glides across the surface and reveals the texture',
    'Macro close-up, slow 30-degree orbit; the texture catches the light',
  ],
}

export function motionPrompt(kind: Exclude<AdsV2PlanShotKind, 'text'>, variant: number): string {
  const list = ADS_V2_MOVEMENTS[kind]
  return `${list[((variant % list.length) + list.length) % list.length]}. ${ADS_V2_KEEP_PHRASE}`
}

export function sceneImagePrompt(sector: AdsV2Sector, sceneIdx: number): string {
  const s = ADS_V2_SECTOR_SPECS[sector]
  const action = s.sceneActions[sceneIdx % s.sceneActions.length]
  return (
    `Photorealistic vertical 9:16 frame from a ${s.label} commercial, shot on a cinema camera, natural light, subtle film grain. ` +
    `${action}. ` +
    'Use the attached photos of this business as the only reference for the place, the products and the decor: same room, same furniture, same products. ' +
    'Do not add dishes, products, decoration, furniture, structures or views that are not in the photos. ' +
    `${s.sceneRule} ` +
    'Ordinary non-famous people with natural skin texture and everyday clothes; every hand has five natural fingers. ' +
    'No text, no logos, no signs, no writing anywhere, no watermarks.'
  )
}

// ── Estrutura por nível (vale para todos os setores; o setor muda as preferências e as cenas) ────────────────────────
interface SlotDef {
  role: AdsV2Role
  beat: AdsV2Beat
  cut: number
  source: AdsV2PlanSource
  hero: boolean
  /** Índice da cena criada (0..3) quando source = generated_scene. */
  scene: number
}
const S = (role: AdsV2Role, beat: AdsV2Beat, cut: number, source: AdsV2PlanSource = 'client_photo', hero = false, scene = -1): SlotDef => ({ role, beat, cut, source, hero, scene })

export const ADS_V2_TIER_SLOTS: Readonly<Record<AdsV2PlanTier, readonly SlotDef[]>> = {
  photo_motion: [
    S('hook', 'hook', 2.0),
    S('desire', 'desire', 2.0),
    S('use', 'use_emotion', 2.5),
    S('emotion', 'use_emotion', 2.0),
    S('place', 'place_product', 2.0),
    S('product', 'place_product', 2.0),
  ],
  commercial: [
    S('hook', 'hook', 2.0),
    S('desire', 'desire', 2.0),
    S('use', 'use_emotion', 2.5, 'generated_scene', false, 0),
    S('emotion', 'use_emotion', 2.0, 'generated_scene', false, 1),
    S('emotion', 'use_emotion', 2.0, 'generated_scene', false, 2),
    S('place', 'place_product', 2.0),
  ],
  cinema: [
    S('hook', 'hook', 2.0, 'client_photo', true),
    S('desire', 'desire', 2.0, 'client_photo', true),
    S('use', 'use_emotion', 2.0, 'generated_scene', false, 0),
    S('use', 'use_emotion', 2.0, 'generated_scene', false, 1),
    S('emotion', 'use_emotion', 2.0, 'generated_scene', false, 2),
    S('emotion', 'use_emotion', 2.0, 'generated_scene', false, 3),
    S('place', 'place_product', 2.0),
  ],
}

/** Planos extras de 2,5 s para 20 s (2) e 30 s (6). */
export function adsV2ExtraShots(seconds: number): number {
  if (seconds === 15) return 0
  if (seconds === 20) return 2
  if (seconds === 30) return 6
  throw new Error(`ads_v2_unknown_seconds:${String(seconds)}`)
}
export const ADS_V2_EXTRA_CUT = 2.5

/** Início do trecho usado no clipe: pula o quadro parado do começo, cabendo no menor clipe (3 s) com o dissolve. */
export function adsV2CutStart(cut: number, kind: AdsV2PlanShotKind): number {
  if (kind === 'text') return 0
  const room = ADS_V2_MIN_GEN_SECONDS - cut - ADS_V2_FADE_SECONDS - 0.1
  return Math.round(Math.max(0, Math.min(0.4, room)) * 1000) / 1000
}

export interface AdsV2Photo {
  id: string
  url: string
  kind: AdsV2PhotoKind
}

export interface AdsV2PlannedShot {
  idx: number
  role: AdsV2Role
  beat: AdsV2Beat
  kind: AdsV2PlanShotKind
  source: AdsV2PlanSource
  /** Foto do cliente animada (client_photo) — null na cena criada até o Nano Banana devolver a imagem. */
  sourceFootageId: string | null
  imageUrl: string | null
  /** Cena criada: fotos do cliente usadas como referência (sem as de texto). */
  referenceFootageIds: string[]
  referenceUrls: string[]
  /** Pedido da imagem da cena criada (Nano Banana Pro edit); null nos planos de foto. */
  scenePrompt: string | null
  /** Prompt de 1 movimento terminando em ADS_V2_KEEP_PHRASE; null no plano `text` (zoom do montador, sem IA). */
  prompt: string | null
  movementVariant: number
  cutStart: number
  cutSeconds: number
}

export interface AdsV2OverlaySlot {
  role: 'brand' | 'what' | 'where'
  start: number
  end: number
  required: boolean
  maxChars: number
}

export interface AdsV2ShotPlan {
  sector: AdsV2Sector
  tier: AdsV2PlanTier
  seconds: number
  shots: AdsV2PlannedShot[]
  overlays: AdsV2OverlaySlot[]
  shotsSeconds: number
  cardSeconds: number
  totalSeconds: number
  narrationMaxWords: number
  photoRequests: readonly string[]
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000

/** 2-3 frases de tela, distribuídas em terços da parte com planos: marca/oferta nos primeiros 5 s, o que tem, onde fica. */
export function adsV2OverlaySlots(shotsSeconds: number): AdsV2OverlaySlot[] {
  const third = shotsSeconds / 3
  const roles: AdsV2OverlaySlot['role'][] = ['brand', 'what', 'where']
  return roles.map((role, i) => ({
    role,
    start: r3(i * third + (i === 0 ? 0.3 : 0.4)),
    end: r3((i + 1) * third - 0.2),
    required: i < 2,
    maxChars: ADS_V2_OVERLAY_MAX_CHARS,
  }))
}

/**
 * Lista de planos do pedido. Determinística: mesmas entradas → mesmo plano.
 * Atribuição das fotos (a ordem em que o cliente mandou é a ordem de qualidade: a 1ª de cada tipo é a melhor):
 *  1. Vaga de foto: a 1ª foto AINDA NÃO USADA do tipo preferido da vaga (na ordem de preferência do setor).
 *  2. Não sobrou foto nova: repete a foto MENOS usada, na mesma ordem de preferência, com OUTRO movimento.
 *  3. Vaga herói (Cinema): só produto — nova ou repetida; sem foto de produto, cai no passo 1.
 *  4. Foto `text` vira plano `text` (sem IA, sem prompt). Herói só com foto de produto; senão o tipo é o da foto.
 *  5. Cena criada: referência = todas as fotos do cliente que não são `text`, lugar primeiro, depois produto e gente.
 *     Sem nenhuma foto sem texto, a vaga vira foto do cliente (passos 1-2) — o Nano Banana exige referência.
 */
export function planShots(input: { sector: AdsV2Sector; tier: AdsV2PlanTier; photos: readonly AdsV2Photo[]; seconds?: number }): AdsV2ShotPlan {
  const { sector, tier } = input
  const seconds = input.seconds ?? 15
  if (!isAdsV2Sector(sector)) throw new Error(`ads_v2_unknown_sector:${String(sector)}`)
  if (!(ADS_V2_PLAN_TIERS as readonly string[]).includes(tier)) throw new Error(`ads_v2_unknown_tier:${String(tier)}`)
  const photos = Array.isArray(input.photos) ? input.photos : []
  if (photos.length < 1) throw new Error('ads_v2_no_photos')
  for (const p of photos) {
    if (!p || typeof p.id !== 'string' || !p.id || typeof p.url !== 'string' || !p.url) throw new Error('ads_v2_bad_photo')
    if (!(ADS_V2_PHOTO_KINDS as readonly string[]).includes(p.kind)) throw new Error(`ads_v2_bad_photo_kind:${String(p.kind)}`)
  }
  const spec = ADS_V2_SECTOR_SPECS[sector]

  // Molde do nível + extras (20/30 s) antes do bloco LUGAR/PRODUTO.
  const base = ADS_V2_TIER_SLOTS[tier]
  const extras = adsV2ExtraShots(seconds)
  const closeAt = base.findIndex((s) => s.beat === 'place_product')
  const extraSlots: SlotDef[] = Array.from({ length: extras }, (_, i) => S(i % 2 === 0 ? 'use' : 'emotion', 'use_emotion', ADS_V2_EXTRA_CUT))
  const slots: SlotDef[] = [...base.slice(0, closeAt), ...extraSlots, ...base.slice(closeAt)]

  const uses = new Map<string, number>()
  const pickPhoto = (wants: readonly AdsV2PhotoKind[], heroOnlyProduct: boolean): AdsV2Photo => {
    if (heroOnlyProduct) {
      const products = photos.filter((p) => p.kind === 'product')
      if (products.length > 0) {
        const fresh = products.find((p) => !uses.has(p.id))
        if (fresh) return fresh
        return leastUsed(products)
      }
    }
    for (const k of wants) {
      const fresh = photos.find((p) => p.kind === k && !uses.has(p.id))
      if (fresh) return fresh
    }
    const byPref = wants.flatMap((k) => photos.filter((p) => p.kind === k))
    return leastUsed(byPref.length > 0 ? byPref : photos)
  }
  const leastUsed = (list: readonly AdsV2Photo[]): AdsV2Photo => {
    let best = list[0]
    for (const p of list) if ((uses.get(p.id) ?? 0) < (uses.get(best.id) ?? 0)) best = p
    return best
  }

  const refOrder: AdsV2PhotoKind[] = ['place', 'product', 'people']
  const refs = refOrder.flatMap((k) => photos.filter((p) => p.kind === k))

  const shots: AdsV2PlannedShot[] = slots.map((slot, idx) => {
    if (slot.source === 'generated_scene' && refs.length > 0) {
      const variant = slot.scene
      return {
        idx,
        role: slot.role,
        beat: slot.beat,
        kind: 'people',
        source: 'generated_scene',
        sourceFootageId: null,
        imageUrl: null,
        referenceFootageIds: refs.map((p) => p.id),
        referenceUrls: refs.map((p) => p.url),
        scenePrompt: sceneImagePrompt(sector, slot.scene),
        prompt: motionPrompt('people', variant),
        movementVariant: variant,
        cutStart: adsV2CutStart(slot.cut, 'people'),
        cutSeconds: slot.cut,
      }
    }
    const heroSlot = slot.hero && tier === 'cinema'
    const photo = pickPhoto(spec.wants[slot.role], heroSlot)
    const variant = uses.get(photo.id) ?? 0
    uses.set(photo.id, variant + 1)
    const kind: AdsV2PlanShotKind = photo.kind === 'text' ? 'text' : heroSlot && photo.kind === 'product' ? 'product_hero' : photo.kind
    return {
      idx,
      role: slot.role,
      beat: slot.beat,
      kind,
      source: 'client_photo',
      sourceFootageId: photo.id,
      imageUrl: photo.url,
      referenceFootageIds: [],
      referenceUrls: [],
      scenePrompt: null,
      prompt: kind === 'text' ? null : motionPrompt(kind, variant),
      movementVariant: variant,
      cutStart: adsV2CutStart(slot.cut, kind),
      cutSeconds: slot.cut,
    }
  })

  const shotsSeconds = r3(shots.reduce((s, x) => s + x.cutSeconds, 0))
  return {
    sector,
    tier,
    seconds,
    shots,
    overlays: adsV2OverlaySlots(shotsSeconds),
    shotsSeconds,
    cardSeconds: ADS_V2_CARD_SECONDS,
    totalSeconds: r3(shotsSeconds + ADS_V2_CARD_SECONDS),
    narrationMaxWords: adsV2NarrationMaxWords(seconds),
    photoRequests: spec.photoRequests,
  }
}
