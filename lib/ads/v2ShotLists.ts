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
// Sem nenhuma foto de produto, a cena criada troca as ações que citam "the food/product from the photos" por ações
// sem produto (sceneActionsNoProduct): pedir o prato "das fotos" a quem não mandou prato faz o Nano Banana inventá-lo.
//
// LIB PURA (nenhum import): tipos copiados de lib/ads/v2Tiers.ts; o guardião confere que as listas batem.

export type AdsV2Sector = 'restaurant' | 'clinic' | 'real_estate' | 'gym' | 'salon' | 'store' | 'app_service' | 'other'
export type AdsV2PlanTier = 'photo_motion' | 'commercial' | 'cinema'
export type AdsV2PhotoKind = 'people' | 'place' | 'product' | 'text'
// KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — 'user_video': o vídeo do cliente, montado como vídeo (sem IA, sem prompt).
export type AdsV2PlanShotKind = AdsV2PhotoKind | 'product_hero' | 'user_video'
/** Tipos que passam por movimento de IA (o `text` e o `user_video` nunca passam). */
export type AdsV2MotionKind = Exclude<AdsV2PlanShotKind, 'text' | 'user_video'>
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
/**
 * KINEO-ADS-V2-CORTES-2026-09-28 — clipe do herói (Seedance 2.0 Fast, 4 s pedidos; 4,04 s medidos no canário).
 * Espelho de ADS_V2_ENGINES.seedance_20_fast.genSeconds (lib/ads/v2Tiers.ts; o guardião confere).
 */
export const ADS_V2_HERO_GEN_SECONDS = 4
/** Herói: o corte começa em ~1,5 s — o meio do clipe, onde o movimento já aconteceu (o começo é quadro quase parado). */
export const ADS_V2_CUT_START_HERO = 1.5
/** Clipes de 3 s (Kling O3): teto do início do corte, alcançado SÓ quando sobra folga (3,0 − corte − dissolve − margem). */
export const ADS_V2_CUT_START_MAX = 0.65
/** Folga mínima entre o fim do trecho usado (com o dissolve) e o fim do clipe medido. */
export const ADS_V2_CUT_MARGIN = 0.1
/**
 * KINEO-ESTILOS-PRODUTO-2026-10-09 — estilos de produto (espelho de ADS_V2_STYLE_KEYS, lib/ads/v2Styles.ts; o guardião
 * confere). O plano-herói com estilo sai pelo efeito da PixVerse: clipe de 5 s (espelho de
 * ADS_V2_ENGINES.pixverse_effect.genSeconds) e o corte começa em 2,0 s — nas prévias dos 5 efeitos (public/ads-styles) o
 * começo é a foto quase parada e a virada (embalagem estoura, fundo do mar, vista explodida, close) acontece entre 1,5 e
 * 3 s. 2,0 + 2,5 + 0,25 = 4,75 ≤ 5,0 − 0,1: cabe até no corte de 2,5 s. A reserva H3 (5 s) usa o mesmo trecho.
 */
// KINEO-ADS-UX-MARCA-2026-10-10 — 15 estilos (+10 do mesmo endpoint); espelho de ADS_V2_STYLE_KEYS.
// KINEO-ESTILOS-DIA1-2026-10-13 — 19 estilos (+4 do lote do dia 1, mesmo endpoint PixVerse v5).
// KINEO-TIRA-STARLIGHT-1410 — 18: starlight_gift tirado (fundador 14/10).
// KINEO-ADS-RETESTE-1510 — 17: dolly_zoom tirado (reteste 15/10: o efeito desenhou um rosto no líquido do perfume em 2 de 2 anúncios).
export type AdsV2PlanStyle = 'package_explosion' | 'giant_product' | 'product_closeup' | 'ocean_ad' | 'mechanical_assembly' | 'naked_eye_3d_ad' | 'beach_ad' | 'lighting_ad' | 'supermarket_ad' | 'poster_ad' | 'graffiti_ad' | 'dreamlike_cloud' | 'parachute_delivery' | 'shoal_surround' | 'dishes_served' | 'boom_drop' | 'macaron_machine'
export const ADS_V2_PLAN_STYLES: readonly AdsV2PlanStyle[] = ['package_explosion', 'giant_product', 'product_closeup', 'ocean_ad', 'mechanical_assembly', 'naked_eye_3d_ad', 'beach_ad', 'lighting_ad', 'supermarket_ad', 'poster_ad', 'graffiti_ad', 'dreamlike_cloud', 'parachute_delivery', 'shoal_surround', 'dishes_served', 'boom_drop', 'macaron_machine']
export const ADS_V2_EFFECT_GEN_SECONDS = 5
export const ADS_V2_CUT_START_EFFECT = 2.0
export function isAdsV2PlanStyle(raw: unknown): raw is AdsV2PlanStyle {
  return typeof raw === 'string' && (ADS_V2_PLAN_STYLES as readonly string[]).includes(raw)
}
/** Narração: até 30 palavras em 15 s (proporcional em 20/30 s). */
export const ADS_V2_NARRATION_WORDS_15 = 30
/** Frase de tela: no máximo 2 linhas no terço do meio. */
export const ADS_V2_OVERLAY_MAX_CHARS = 42
/**
 * KINEO-ADS-1FOTO-LINK-2026-10-10 — 1 foto basta (era 3). A /business e os anúncios pagos prometem "uma foto do produto
 * vira um anúncio pronto"; o mínimo de 3 barrava o vendedor com 1 foto (os concorrentes aceitam 1). Com menos fotos que
 * planos, planShots preenche os 15 s com honestidade: a MESMA foto ganha outro movimento a cada uso (variante = nº de usos,
 * nunca o mesmo movimento colado no anterior), Comercial/Premium somam as cenas criadas a partir dela, e o plano `text`
 * repetido colado no anterior vira UM plano mais longo (foto parada não tem outro movimento: seria o mesmo quadro 2x).
 * Espelhos: ADS_V2_CONTRACT_MIN_PHOTOS (lib/ads/v2Contract.ts) e ADS_V2_SIMPLE_MIN_IN_AD (lib/ads/v2Simple.ts).
 */
export const ADS_V2_MIN_PHOTOS = 1
export const ADS_V2_MAX_PHOTOS = 7
/** Final obrigatório de todo prompt de movimento. */
export const ADS_V2_KEEP_PHRASE = 'Keep everything exactly as in the photo.'
/**
 * KINEO-ADS-V2-CORTES-2026-09-28 — travas de estado do herói (Seedance 2.0): só proíbe o que é NOVO (mão que já está
 * na foto pode continuar), nada se move sozinho e texto/etiqueta/preço ficam como na foto. Vai entre o movimento e
 * ADS_V2_KEEP_PHRASE, só no product_hero.
 */
export const ADS_V2_HERO_STATE_LOCKS = 'Natural real-time speed; nothing on the plate or product moves by itself; no new hands or objects enter the frame; text, labels and prices stay exactly as in the photo.'

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
  /**
   * As mesmas 4 vagas quando o cliente NÃO mandou foto de produto (nenhuma foto 'product' entre as referências).
   * Sem isto, "the food from the photos" num restaurante que só mandou salão e fachada faz o Nano Banana INVENTAR o
   * prato — exatamente o que a especificação proíbe (seção 5, passo 2). Ausente = as ações do setor já não citam
   * produto das fotos.
   */
  sceneActionsNoProduct?: readonly [string, string, string, string]
  /** Proibição extra do setor quando não há foto de produto (acompanha sceneActionsNoProduct). */
  noProductRule?: string
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
    sceneActionsNoProduct: [
      'Friends at a table in this dining room, talking and laughing',
      'A couple being welcomed at the entrance of this restaurant, smiling',
      'A couple sitting at a table in this restaurant, talking and smiling at each other',
      'A family arriving at this restaurant, relaxed and happy',
    ],
    noProductRule: 'The photos show no dishes, so no food and no plates appear in this frame.',
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
    sceneActionsNoProduct: [
      'A person stretching on the training floor of this gym, focused and calm',
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
    sceneActionsNoProduct: [
      'A client relaxing in a chair of this salon, smiling',
      'A stylist welcoming a client at the reception of this salon',
      'A client chatting with a stylist in this salon, relaxed',
      'Two friends leaving this salon happy and confident',
    ],
    noProductRule: 'The photos show no finished work, so no hairstyle, nail or makeup result is shown up close in this frame.',
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
    sceneActionsNoProduct: [
      'A person walking into this shop and looking around, smiling',
      'Two friends browsing this shop together, curious and happy',
      'A customer being greeted warmly in this shop',
      'A customer leaving this shop satisfied',
    ],
    noProductRule: 'The photos show no product close-up, so no product is held or shown up close in this frame.',
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
    sceneActionsNoProduct: [
      'A happy customer at this place, smiling',
      'A customer being welcomed warmly at this place',
      'Two friends at this place, smiling and talking',
      'A customer leaving this place satisfied',
    ],
    noProductRule: 'The photos show no product close-up, so no product is held or shown up close in this frame.',
    sceneRule: 'Only what appears in the photos; no products, services or structures that are not in the photos.',
  },
}

// ── Movimentos (1 por plano; o mesmo arquivo reusado ganha outro movimento) ─────────────────────────────────────────
export const ADS_V2_MOVEMENTS: Readonly<Record<AdsV2MotionKind, readonly string[]>> = {
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

export function motionPrompt(kind: AdsV2MotionKind, variant: number): string {
  const list = ADS_V2_MOVEMENTS[kind]
  const move = list[((variant % list.length) + list.length) % list.length]
  if (kind === 'product_hero') return `${move}. ${ADS_V2_HERO_STATE_LOCKS} ${ADS_V2_KEEP_PHRASE}`
  return `${move}. ${ADS_V2_KEEP_PHRASE}`
}

/**
 * Pedido da cena criada. `hasProduct` = alguma referência é foto 'product'; sem ela, as ações do setor que citam
 * "the food/product/equipment from the photos" são trocadas por ações sem produto e o pedido proíbe mostrar produto.
 */
export function sceneImagePrompt(sector: AdsV2Sector, sceneIdx: number, hasProduct = true): string {
  const s = ADS_V2_SECTOR_SPECS[sector]
  const noProduct = !hasProduct && !!s.sceneActionsNoProduct
  const actions = noProduct && s.sceneActionsNoProduct ? s.sceneActionsNoProduct : s.sceneActions
  const action = actions[sceneIdx % actions.length]
  return (
    `Photorealistic vertical 9:16 frame from a ${s.label} commercial, shot on a cinema camera, natural light, subtle film grain. ` +
    `${action}. ` +
    'Use the attached photos of this business as the only reference for the place, the products and the decor: same room, same furniture, same products. ' +
    'Do not add dishes, products, decoration, furniture, structures or views that are not in the photos. ' +
    `${s.sceneRule} ` +
    (noProduct && s.noProductRule ? `${s.noProductRule} ` : '') +
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

/**
 * Início do trecho usado no clipe: pula o quadro parado do começo, cabendo no clipe com o dissolve e a margem.
 * - product_hero (Seedance 2.0, 4 s; só existe no Cinema): começa em 1,5 s → 1,5 + 2,0 + 0,25 = 3,75 ≤ 4,04 − 0,1.
 * - demais (Kling O3, 3 s): até 0,65 s, só quando sobra folga — corte de 2,0 s → 0,65; corte de 2,5 s → 0,15 (como antes).
 * cut_start + cut_seconds + dissolve nunca passa de (clipe − margem); o montador ainda recusa contra o clipe MEDIDO.
 */
export function adsV2CutStart(cut: number, kind: AdsV2PlanShotKind, effect = false): number {
  if (kind === 'text') return 0
  // KINEO-ESTILOS-PRODUTO-2026-10-09 — plano com estilo: clipe de 5 s do efeito, corte a partir de 2,0 s (se couber).
  if (effect === true) {
    const roomFx = ADS_V2_EFFECT_GEN_SECONDS - cut - ADS_V2_FADE_SECONDS - ADS_V2_CUT_MARGIN
    return Math.round(Math.max(0, Math.min(ADS_V2_CUT_START_EFFECT, roomFx)) * 1000) / 1000
  }
  const hero = kind === 'product_hero'
  const gen = hero ? ADS_V2_HERO_GEN_SECONDS : ADS_V2_MIN_GEN_SECONDS
  const cap = hero ? ADS_V2_CUT_START_HERO : ADS_V2_CUT_START_MAX
  const room = gen - cut - ADS_V2_FADE_SECONDS - ADS_V2_CUT_MARGIN
  return Math.round(Math.max(0, Math.min(cap, room)) * 1000) / 1000
}

export interface AdsV2Photo {
  id: string
  url: string
  kind: AdsV2PhotoKind
}

/**
 * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — vídeo do cliente que entra COMO VÍDEO. `seconds` = duração MEDIDA pelo
 * servidor (mvhd do arquivo no bucket), nunca a do navegador; `start` = sugestão do navegador (trecho mais vivo).
 */
export interface AdsV2Video {
  id: string
  url: string
  seconds: number
  start: number | null
  focusX?: number
  focusY?: number
  width?: number | null
  height?: number | null
}
/** Espelho de ADS_V2_MAX_USER_VIDEOS (lib/ads/v2UserVideo.ts) e ADS_V2_CONTRACT_MAX_VIDEOS (lib/ads/v2Contract.ts). */
export const ADS_V2_PLAN_MAX_VIDEOS = 2
/** Espelho de ADS_V2_USER_VIDEO_MIN_SECONDS (lib/ads/v2UserVideo.ts): abaixo disto o /plan devolve video_too_short. */
export const ADS_V2_PLAN_VIDEO_MIN_SECONDS = 3
/** Espelho de ADS_V2_USER_VIDEO_MAX_SECONDS (lib/ads/v2UserVideo.ts): acima disto o /plan devolve video_too_long (o banco
 * guarda measured_seconds/cut_start em numeric(6,3), teto 999,999 s; o plano B também para em 10 min). */
export const ADS_V2_PLAN_VIDEO_MAX_SECONDS = 600

/**
 * Início do trecho do vídeo do cliente (espelho EXATO de clampUserVideoStart, lib/ads/v2UserVideo.ts — o guardião
 * compara os dois): trecho + dissolve + folga cabem no vídeo MEDIDO; sem sugestão válida = o meio. null = não cabe.
 */
export function adsV2UserVideoStart(suggested: unknown, measured: number, cut: number): number | null {
  if (!(typeof measured === 'number' && Number.isFinite(measured) && measured > 0)) return null
  if (!(typeof cut === 'number' && Number.isFinite(cut) && cut > 0)) return null
  const maxStart = Math.round((measured - cut - ADS_V2_FADE_SECONDS - ADS_V2_CUT_MARGIN) * 1000) / 1000
  if (maxStart < 0) return null
  const fallback = Math.max(0, (measured - cut) / 2 - ADS_V2_FADE_SECONDS / 2)
  const s = typeof suggested === 'number' && Number.isFinite(suggested) && suggested >= 0 ? suggested : fallback
  return Math.round(Math.min(maxStart, Math.max(0, s)) * 1000) / 1000
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
  /**
   * KINEO-ESTILOS-PRODUTO-2026-10-09 — só no plano-herói do produto quando o pedido tem estilo: a chave do estilo. O
   * plano sai pelo efeito da PixVerse (routeShot com styled) e o `prompt` continua o de movimento (é o da reserva H3).
   */
  effect?: AdsV2PlanStyle
  /**
   * KINEO-ADS-MELHORIAS-1410 — o PACKSHOT: a foto REAL do produto, intocada (kind 'text' = foto parada com zoom lento do
   * montador, nenhuma IA). Só existe quando adsV2PackshotShots trocou um plano de IA por ela. Ausente = plano de sempre.
   */
  packshot?: true
  /** KINEO-ADS-REFACAO-ATOR-1410 — cena criada "pessoa de IA segurando o produto" (lib/ads/v2PresenterHolds.ts). Ausente = plano de sempre. */
  presenterHolds?: true // KINEO-ADS-REFACAO-ATOR-1410
  /** Só no plano 'user_video': o arquivo do cliente no bucket, a duração MEDIDA e o enquadramento (foco 0..1). */
  videoUrl?: string
  videoSeconds?: number
  focusX?: number
  focusY?: number
  videoWidth?: number | null
  videoHeight?: number | null
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
  /** KINEO-ESTILOS-PRODUTO-2026-10-09 — o estilo APLICADO (só existe quando um plano de produto recebeu o efeito). */
  style?: AdsV2PlanStyle
}

/**
 * KINEO-ESTILOS-PRODUTO-2026-10-09 — o plano que recebe o estilo: o 1º 'product_hero'; sem ele, o 1º 'product' de foto do
 * cliente. null = não há plano de produto (o estilo é ignorado). Espelho EXATO de adsV2StyleTargetIdx (lib/ads/v2Styles.ts).
 */
export function adsV2PlanStyleTarget(shots: readonly { idx: number; kind: string; source: string }[]): number | null {
  const hero = shots.find((s) => s.kind === 'product_hero' && s.source === 'client_photo')
  if (hero) return hero.idx
  const product = shots.find((s) => s.kind === 'product' && s.source === 'client_photo')
  return product ? product.idx : null
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000

/**
 * KINEO-ADS-1FOTO-LINK-2026-10-10 — junta planos `text` seguidos da MESMA foto em um só (soma dos cortes, início 0) e
 * renumera os índices. Sem repetição colada, devolve os mesmos objetos na mesma ordem. Pura, exportada para o guardião.
 */
export function mergeRepeatedTextShots(shots: readonly AdsV2PlannedShot[]): AdsV2PlannedShot[] {
  const out: AdsV2PlannedShot[] = []
  for (const s of shots) {
    const prev = out[out.length - 1]
    if (prev && s.kind === 'text' && prev.kind === 'text' && s.sourceFootageId !== null && prev.sourceFootageId === s.sourceFootageId) {
      out[out.length - 1] = { ...prev, cutSeconds: r3(prev.cutSeconds + s.cutSeconds) }
      continue
    }
    out.push(s.idx === out.length ? s : { ...s, idx: out.length })
  }
  return out
}

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
 *     Sem foto de produto entre as referências, as ações do setor não citam produto (sceneActionsNoProduct).
 *     Sem nenhuma foto sem texto, a vaga vira foto do cliente (passos 1-2) — o Nano Banana exige referência.
 */
export function planShots(input: { sector: AdsV2Sector; tier: AdsV2PlanTier; photos: readonly AdsV2Photo[]; seconds?: number; videos?: readonly AdsV2Video[]; style?: string | null }): AdsV2ShotPlan {
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
  const refsHaveProduct = refs.some((p) => p.kind === 'product')

  // KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — cada vídeo ocupa UMA vaga de FOTO do molde (nunca de cena criada): primeiro as
  // vagas de foto sem herói, na ordem da linha do tempo (Foto em movimento/Comercial: o gancho; Cinema: o lugar), depois
  // as de herói. O nº de planos do nível não muda. Vídeo repetido, sem URL/id ou sem duração medida = erro (a rota confere).
  const videos = Array.isArray(input.videos) ? input.videos : []
  if (videos.length > ADS_V2_PLAN_MAX_VIDEOS) throw new Error('ads_v2_too_many_videos')
  const seenVideo = new Set<string>()
  for (const v of videos) {
    if (!v || typeof v.id !== 'string' || !v.id || typeof v.url !== 'string' || !v.url) throw new Error('ads_v2_bad_video')
    if (!(typeof v.seconds === 'number' && Number.isFinite(v.seconds) && v.seconds > 0)) throw new Error(`ads_v2_video_unmeasured:${v.id}`)
    if (v.seconds > ADS_V2_PLAN_VIDEO_MAX_SECONDS) throw new Error(`ads_v2_video_too_long:${v.id}`)
    if (seenVideo.has(v.id) || photos.some((p) => p.id === v.id)) throw new Error(`ads_v2_duplicate_video:${v.id}`)
    seenVideo.add(v.id)
  }
  const photoSlots = slots.map((s, i) => ({ s, i })).filter((x) => x.s.source === 'client_photo')
  const videoSlotOrder = [...photoSlots.filter((x) => !x.s.hero), ...photoSlots.filter((x) => x.s.hero)].map((x) => x.i)
  const videoAt = new Map<number, AdsV2Video>()
  videos.forEach((v, k) => {
    const at = videoSlotOrder[k]
    if (at === undefined) throw new Error('ads_v2_no_slot_for_video')
    videoAt.set(at, v)
  })

  const built: AdsV2PlannedShot[] = slots.map((slot, idx) => {
    const video = videoAt.get(idx)
    if (video) {
      const start = adsV2UserVideoStart(video.start, video.seconds, slot.cut)
      if (start === null) throw new Error(`ads_v2_video_too_short:${video.id}`)
      const focus = (f: unknown) => (typeof f === 'number' && Number.isFinite(f) ? Math.min(1, Math.max(0, f)) : 0.5)
      const dim = (d: unknown) => (typeof d === 'number' && Number.isFinite(d) && d > 0 ? Math.round(d) : null)
      return {
        idx,
        role: slot.role,
        beat: slot.beat,
        kind: 'user_video',
        source: 'client_photo',
        sourceFootageId: video.id,
        imageUrl: null,
        referenceFootageIds: [],
        referenceUrls: [],
        scenePrompt: null,
        prompt: null,
        movementVariant: 0,
        cutStart: start,
        cutSeconds: slot.cut,
        videoUrl: video.url,
        videoSeconds: Math.round(video.seconds * 1000) / 1000,
        focusX: focus(video.focusX),
        focusY: focus(video.focusY),
        videoWidth: dim(video.width),
        videoHeight: dim(video.height),
      }
    }
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
        scenePrompt: sceneImagePrompt(sector, slot.scene, refsHaveProduct),
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
    const kind: AdsV2MotionKind | 'text' = photo.kind === 'text' ? 'text' : heroSlot && photo.kind === 'product' ? 'product_hero' : photo.kind
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

  // KINEO-ADS-1FOTO-LINK-2026-10-10 — com 1 foto (ou poucas), a mesma foto de TEXTO pode cair em 2 vagas seguidas: o
  // montador dá à foto parada sempre o mesmo zoom, então seriam 2 planos idênticos colados. Viram UM plano com a soma dos
  // cortes (a duração total não muda) e os índices são renumerados em sequência. Foto com movimento de IA nunca se junta:
  // cada uso tem outra variante de movimento (prompt diferente). Sem texto repetido colado, o plano é o de antes.
  const shots = mergeRepeatedTextShots(built)

  // KINEO-ESTILOS-PRODUTO-2026-10-09 — estilo: só o plano de produto escolhido (adsV2PlanStyleTarget) ganha `effect` e o
  // trecho do clipe de 5 s do efeito. Estilo ausente/'none'/desconhecido ou sem plano de produto = o plano de antes, chave
  // por chave (nem `effect` nem `style` aparecem). A atribuição de fotos e os prompts NUNCA mudam com o estilo.
  const style = isAdsV2PlanStyle(input.style) ? input.style : null
  const target = style ? adsV2PlanStyleTarget(shots) : null
  if (style && target !== null) {
    const at = shots.findIndex((s) => s.idx === target)
    const s = shots[at]
    shots[at] = { ...s, effect: style, cutStart: adsV2CutStart(s.cutSeconds, s.kind, true) }
  }

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
    ...(style && target !== null ? { style } : {}),
  }
}

// ── KINEO-ADS-MELHORIAS-1410 — PACKSHOT: um plano com a foto REAL do produto (fidelidade do produto) ─────────────────────
// QA de 14/10: a IA redesenhou o produto (um rostinho apareceu dentro do líquido do perfume). Kling O3, o still do Nano Banana
// e os efeitos da PixVerse REGERAM o produto; nenhum plano mostrava a foto da pessoa como ela é. Agora todo anúncio com foto
// marcada como PRODUTO troca UM plano de IA pela foto real do produto, parada, com o zoom lento do montador (o caminho do plano
// `text`, que nunca vai à fal) e um fundo suave por baixo (lib/ads/adV2Montage.ts) para foto que não encha o quadro.
// TROCA, não soma: o número de planos, os cortes e a duração ficam iguais, e os CRÉDITOS também (adsV2Credits depende só do
// nível e da duração). O custo de fal cai um plano de Kling O3 (US$ 0,336).
// ONDE: o ÚLTIMO plano (o fecho LUGAR/PRODUTO, logo antes do cartão final que já mostra a foto real desde 14/10) — o packshot
// clássico de comercial: o produto parado, nítido, e em seguida a marca. O gancho precisa de movimento para segurar o dedo,
// então o packshot nunca abre o anúncio. Se o último plano não pode ceder (vídeo do cliente, plano de estilo, herói, cena
// criada), o 2º (o primeiro depois do gancho). Nenhum dos dois pode = sem packshot (o anúncio de sempre).
// Nunca cede: o plano-herói do Premium (Seedance, a promessa do nível), as cenas criadas do Comercial/Premium (a promessa do
// nível), o plano do estilo escolhido (a escolha da pessoa), o vídeo do cliente e o plano `text`. Com o ATOR ligado o packshot
// também entra: é um dos inserts por cima da fala (lib/ads/adV2Montage.ts adsV2PresenterInserts), logo depois do estilo.
// A FOTO: a 1ª marcada como produto; sem nenhuma, e o pedido é de PRODUTO (adsV2IsProductOrder, lib/ads/v2Scene.ts — no modo
// simples a foto nasce 'place' fora do setor loja), a 1ª foto que não é de texto.
/** Os tipos de plano que podem ceder a vaga ao packshot: animação de IA de UMA foto do cliente (Kling O3), sem estilo. */
export const ADS_V2_PACKSHOT_YIELD_KINDS: readonly AdsV2PlanShotKind[] = ['people', 'place', 'product']

function packshotCanYield(s: AdsV2PlannedShot | undefined): boolean {
  return !!s && s.source === 'client_photo' && (ADS_V2_PACKSHOT_YIELD_KINDS as readonly string[]).includes(s.kind) && !s.effect && !s.packshot
}

/** A vaga do packshot (pura): o último plano; senão o 2º; senão null. */
export function adsV2PackshotTarget(shots: readonly AdsV2PlannedShot[]): number | null {
  if (!Array.isArray(shots) || shots.length < 2) return null
  const last = shots[shots.length - 1]
  if (packshotCanYield(last)) return last.idx
  if (packshotCanYield(shots[1])) return shots[1].idx
  return null
}

/**
 * Troca UM plano de IA pela foto real do produto (pura; devolve outro array, nunca muta). Sem foto de produto (nem pedido de
 * produto com foto que não é de texto) ou sem vaga = o MESMO array (o plano de antes, objeto por objeto).
 */
export function adsV2PackshotShots(shots: AdsV2PlannedShot[], opts: { photos: readonly AdsV2Photo[]; productOrder?: boolean }): AdsV2PlannedShot[] {
  const usable = (Array.isArray(opts?.photos) ? opts.photos : []).filter((p) => p && typeof p.id === 'string' && p.id && typeof p.url === 'string' && /^https:\/\//i.test(p.url))
  const product = usable.find((p) => p.kind === 'product') ?? (opts?.productOrder === true ? usable.find((p) => p.kind !== 'text') : undefined)
  if (!product) return shots
  const at = adsV2PackshotTarget(shots)
  if (at === null) return shots
  return shots.map((s) => s.idx !== at ? s : {
    ...s,
    kind: 'text',
    source: 'client_photo',
    sourceFootageId: product.id,
    imageUrl: product.url,
    referenceFootageIds: [],
    referenceUrls: [],
    scenePrompt: null,
    prompt: null,
    movementVariant: 0,
    cutStart: 0,
    packshot: true,
  })
}

/** O plano gravado tem packshot neste índice? (pura; para a montagem e a tela). */
export function adsV2IsPackshot(plan: { shots?: readonly { idx: number; packshot?: unknown }[] } | null | undefined, idx: number): boolean {
  return !!plan && Array.isArray(plan.shots) && plan.shots.some((s) => s && s.idx === idx && s.packshot === true)
}

// ── KINEO-ADS-MELHORIAS-1410 — FORMATOS do anúncio (9:16 · 4:5 · 1:1): o porquê e as frases estão em lib/ads/v2Formats.ts ──────
export type AdsV2Format = '9:16' | '4:5' | '1:1'
export const ADS_V2_FORMATS: readonly AdsV2Format[] = ['9:16', '4:5', '1:1']
export const ADS_V2_DEFAULT_FORMAT: AdsV2Format = '9:16'
/** Recorte no navegador (JPEG q0,9, como o 9:16 de sempre). Largura 1080 nos três. */
export const ADS_V2_FORMAT_CROP: Readonly<Record<AdsV2Format, { width: number; height: number }>> = {
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
  '1:1': { width: 1080, height: 1080 },
}

export function isAdsV2Format(raw: unknown): raw is AdsV2Format {
  return typeof raw === 'string' && (ADS_V2_FORMATS as readonly string[]).includes(raw)
}
/** Qualquer coisa que não é formato conhecido = 9:16 (o de sempre). */
export function normalizeAdsV2Format(raw: unknown): AdsV2Format {
  return isAdsV2Format(raw) ? raw : ADS_V2_DEFAULT_FORMAT
}
/** O formato gravado no plano do pedido (plano sem a chave = 9:16). */
export function adsV2PlanFormat(plan: unknown): AdsV2Format {
  return normalizeAdsV2Format(plan && typeof plan === 'object' ? (plan as { format?: unknown }).format : undefined)
}

export type AdsV2FormatBlock = 'style' | 'presenter' | 'premium_45'
/**
 * Por que este formato não sai com estas escolhas (null = sai). 9:16 nunca bloqueia. Ordem: estilo, ator, nível — a tela
 * mostra a 1ª razão.
 */
export function adsV2FormatBlock(input: { format: AdsV2Format; tier?: string | null; style?: string | null; presenter?: boolean }): AdsV2FormatBlock | null {
  if (input.format === '9:16') return null
  if (typeof input.style === 'string' && input.style && input.style !== 'none') return 'style'
  if (input.presenter === true) return 'presenter'
  if (input.format === '4:5' && input.tier === 'cinema') return 'premium_45'
  return null
}

/** aspect_ratio do Seedance 2.0 (herói do Premium): '9:16' de sempre, '1:1' no quadrado. 4:5 não existe lá (bloqueado antes). */
export function adsV2SeedanceAspect(format: AdsV2Format): '9:16' | '1:1' {
  if (format === '4:5') throw new Error('ads_v2_seedance_no_4_5')
  return format === '1:1' ? '1:1' : '9:16'
}

/** A abertura do pedido de cena criada (lib/ads/v2ShotLists.ts e lib/ads/v2Scene.ts) em cada formato — SEM números (a régua
 *  anti-invenção, lib/ads/v2Brief.ts checkV2Prompts, só tolera o "9:16"). */
export const ADS_V2_SCENE_FRAME_OPENING = 'Photorealistic vertical 9:16 frame'
const SCENE_FRAME: Readonly<Record<AdsV2Format, string>> = {
  '9:16': ADS_V2_SCENE_FRAME_OPENING,
  '4:5': 'Photorealistic portrait frame',
  '1:1': 'Photorealistic square frame',
}
/** Planos com o pedido de cena no formato (pura). 9:16 = o MESMO array. */
export function adsV2FormatShots<S extends { scenePrompt: string | null }>(shots: S[], format: AdsV2Format): S[] {
  if (format === '9:16') return shots
  return shots.map((s) => (typeof s.scenePrompt === 'string' && s.scenePrompt.includes(ADS_V2_SCENE_FRAME_OPENING) ? { ...s, scenePrompt: s.scenePrompt.split(ADS_V2_SCENE_FRAME_OPENING).join(SCENE_FRAME[format]) } : s))
}

/** A maior janela no formato que cabe na foto, deslizada pelo ponto focal — a MESMA conta de cropRect (lib/ads/v2Screen.ts). */
export function adsV2CropRectFor(imgW: number, imgH: number, fx: number, fy: number, format: AdsV2Format): { sx: number; sy: number; sw: number; sh: number } {
  if (!(imgW > 0) || !(imgH > 0)) throw new Error('ads_v2_bad_image_size')
  const c = ADS_V2_FORMAT_CROP[format]
  const ratio = c.width / c.height
  let sw = imgW
  let sh = imgW / ratio
  if (sh > imgH) {
    sh = imgH
    sw = imgH * ratio
  }
  const f = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5)
  return { sx: (imgW - sw) * f(fx), sy: (imgH - sh) * f(fy), sw, sh }
}

// ── KINEO-ADS-FIEL-1510 — PRODUTO FIEL EM TODO QUADRO + PRAZO CURTO POR PLANO (Studio Ads v2, fundador 15/10) ──────────────────
// KINEO-ADS-FIEL-1510 — QA 15/10: o efeito da PixVerse e a cena do Nano Banana REDESENHAM o produto (rostinho no líquido, frasco
// KINEO-ADS-FIEL-1510 — mais claro e de outra proporção, texto fantasma, tampa simplificada na mão). Os planos que partem da foto
// KINEO-ADS-FIEL-1510 — original saem exatos. Agência recusa anúncio com produto diferente do real. A TRAVA DO PRODUTO:
// KINEO-ADS-FIEL-1510 —   1. o produto é recortado UMA vez por foto (fal-ai/birefnet/v2, PNG com transparência, cache no bucket);
// KINEO-ADS-FIEL-1510 —   2. a cena criada nasce de um ESBOÇO: o recorte real já posto no quadro, sobre cinza (a 1ª referência do
// KINEO-ADS-FIEL-1510 —      Nano Banana), com a ordem de construir a cena em volta sem mexer no produto;
// KINEO-ADS-FIEL-1510 —   3. a imagem que volta ganha o recorte REAL colado de novo no MESMO lugar (pixel da foto do cliente);
// KINEO-ADS-FIEL-1510 —   4. o Kling O3 anima um quadro que já tem o produto verdadeiro (o mesmo caso dos planos de foto, que saem exatos).
// KINEO-ADS-FIEL-1510 — Qualquer passo que falhe = o plano anima a FOTO REAL do produto (nunca a cena com o produto redesenhado).
// KINEO-ADS-FIEL-1510 — Só funções puras aqui; o lado servidor mora em lib/ads/v2ProductLockServer.ts e lib/ads/v2Png.ts.
/** KINEO-ADS-FIEL-1510 — interruptor: 'internal' = só as contas da casa (canário); 'all' = todo pedido; 'off' = o caminho de antes. */
export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'internal' // KINEO-ADS-FIEL-1510
/** KINEO-ADS-FIEL-1510 — setores em que "the product from the photos" é um produto embalado (prato, cabelo e aparelho de academia ficam de fora). */
export const ADS_V2_PRODUCT_LOCK_SECTORS: readonly AdsV2Sector[] = ['store', 'other'] // KINEO-ADS-FIEL-1510
/** KINEO-ADS-FIEL-1510 — endpoint do recorte (catálogo público da fal; OpenAPI lido em 15/10: image_url, model, output_format 'png'). */
export const ADS_V2_CUTOUT_SLUG = 'fal-ai/birefnet/v2' // KINEO-ADS-FIEL-1510
/** KINEO-ADS-FIEL-1510 — preço público da fal em 15/10: US$ 0 por segundo de computação; teto conservador por recorte. */
export const ADS_V2_CUTOUT_USD_MAX = 0.01 // KINEO-ADS-FIEL-1510
export type AdsV2ProductLockMode = 'scene' | 'holds' | 'actor' // KINEO-ADS-FIEL-1510
export interface AdsV2ProductLock { footageId: string; url: string; mode: AdsV2ProductLockMode; sourceFootageId?: string; sourceUrl?: string } // KINEO-ADS-FIEL-1510 · KINEO-ADS-FIEL-3-1510 — source*: a foto ORIGINAL (sem o corte do formato) de onde sai o recorte
/** KINEO-ADS-FIEL-1510 — onde o produto fica no quadro (frações): cena = centro, acima das frases do terço de baixo; pessoa = no peito. */
export const ADS_V2_PRODUCT_LOCK_BOX: Readonly<Record<AdsV2ProductLockMode, { x0: number; x1: number; y0: number; y1: number }>> = { scene: { x0: 0.24, x1: 0.76, y0: 0.3, y1: 0.68 }, holds: { x0: 0.31, x1: 0.69, y0: 0.44, y1: 0.74 }, actor: { x0: 0.31, x1: 0.69, y0: 0.44, y1: 0.74 } } // KINEO-ADS-FIEL-1510
/** KINEO-ADS-FIEL-1510 — recorte que não é produto: área do contorno fora disto (quase nada, ou a foto inteira) = sem trava. */
export const ADS_V2_CUTOUT_AREA_MIN = 0.02 // KINEO-ADS-FIEL-1510
export const ADS_V2_CUTOUT_AREA_MAX = 0.92 // KINEO-ADS-FIEL-1510
/** KINEO-ADS-FIEL-1510 — fôlego mínimo do chamador para mandar uma cena com trava (recorte até 45 s + POST de 25 s). */
export const ADS_V2_LOCK_DISPATCH_MIN_MS = 45_000 // KINEO-ADS-FIEL-1510

/**
 * KINEO-ADS-FIEL-1510 — a TRAVA de um plano (pura): qual foto real do produto entra nele, ou null (plano sem produto: o caminho
 * de antes). Cena criada de pedido de produto (ou setor loja/outro) com foto 'product' entre as referências = 'scene'; o plano
 * "pessoa de IA segurando o produto" (ADS_V2_PRESENTER_HOLDS, desligado hoje) = 'holds'; a linha do ator (`actor`) = 'actor'.
 */
export function adsV2ProductLockFor(input: {
  shot: { source?: string | null; referenceFootageIds?: readonly string[] | null; referenceUrls?: readonly string[] | null; presenterHolds?: unknown } | null | undefined
  photos: readonly { footage_id?: string | null; kind?: string | null; url?: string | null; original_footage_id?: string | null; original_url?: string | null }[] | null | undefined // KINEO-ADS-FIEL-3-1510 — + a foto original
  productOrder: boolean
  sector: string | null | undefined
  actor?: { productFootageId?: string | null; productUrl?: string | null } | null
}): AdsV2ProductLock | null { // KINEO-ADS-FIEL-1510
  const https = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim())
  if (input.actor) return input.actor.productFootageId && https(input.actor.productUrl) ? { footageId: input.actor.productFootageId, url: input.actor.productUrl.trim(), mode: 'actor' } : null
  const shot = input.shot
  if (!shot || shot.source !== 'generated_scene') return null
  const ids = Array.isArray(shot.referenceFootageIds) ? shot.referenceFootageIds : []
  if (shot.presenterHolds === true) {
    const url = Array.isArray(shot.referenceUrls) ? shot.referenceUrls[1] : null
    return ids[0] && https(url) ? { footageId: ids[0], url: url.trim(), mode: 'holds' } : null
  }
  if (!input.productOrder && !(ADS_V2_PRODUCT_LOCK_SECTORS as readonly string[]).includes(String(input.sector ?? ''))) return null
  const photos = Array.isArray(input.photos) ? input.photos : []
  const product = ids.map((id) => photos.find((p) => p && p.footage_id === id)).find((p) => !!p && p.kind === 'product' && https(p.url))
  if (!product || !product.footage_id || !product.url) return null // KINEO-ADS-FIEL-3-1510
  const original = product.original_footage_id && https(product.original_url) ? { sourceFootageId: String(product.original_footage_id), sourceUrl: product.original_url.trim() } : {} // KINEO-ADS-FIEL-3-1510 — o recorte sai da foto INTEIRA (o 1:1/4:5 cortava a caixa)
  return { footageId: product.footage_id, url: product.url.trim(), mode: 'scene', ...original } // KINEO-ADS-FIEL-3-1510
}

/** KINEO-ADS-FIEL-1510 — o retângulo do produto (px inteiros) no quadro W×H: cabe na caixa do modo, centrado, com a BASE no fundo da caixa. */
export function adsV2ProductLockRect(frameW: number, frameH: number, cutW: number, cutH: number, mode: AdsV2ProductLockMode): { x: number; y: number; w: number; h: number } { // KINEO-ADS-FIEL-1510
  if (!(frameW > 0 && frameH > 0 && cutW > 0 && cutH > 0)) throw new Error('ads_v2_lock_bad_size')
  const b = ADS_V2_PRODUCT_LOCK_BOX[mode] ?? ADS_V2_PRODUCT_LOCK_BOX.scene
  const bw = (b.x1 - b.x0) * frameW
  const bh = (b.y1 - b.y0) * frameH
  const k = Math.min(bw / cutW, bh / cutH)
  const w = Math.max(1, Math.round(cutW * k))
  const h = Math.max(1, Math.round(cutH * k))
  return { x: Math.round(((b.x0 + b.x1) / 2) * frameW - w / 2), y: Math.round(b.y1 * frameH - h), w, h }
}

const LOCK_LAYOUT_LINE = 'The FIRST attached image is the layout of this frame: the real product is already placed on a plain grey background. Keep the product exactly where it is, at the same size and in the same position, completely unchanged: same shape, colors, label, text and proportions. Replace the grey background completely and build the scene around the product. Nothing covers the front of the product; hands may touch it only from the sides, from below or from behind.' // KINEO-ADS-FIEL-1510
/**
 * KINEO-ADS-FIEL-1510 — o pedido do Nano Banana com o ESBOÇO como 1ª referência: a linha do esboço na frente do pedido de sempre.
 * No 'holds' as referências andam uma casa (o retrato vira a 2ª, o produto a 3ª): FIRST/SECOND reference viram SECOND/THIRD.
 */
export function adsV2ProductLockScenePrompt(scenePrompt: string, mode: AdsV2ProductLockMode): string { // KINEO-ADS-FIEL-1510
  const base = String(scenePrompt ?? '').trim()
  const shifted = mode === 'holds' ? base.split('SECOND reference photo').join('THIRD reference photo').split('FIRST reference photo').join('SECOND reference photo') : base
  const held = mode === 'scene' ? '' : ' The hand holds the product from below or from the side, exactly where it is in the layout.'
  return `${LOCK_LAYOUT_LINE}${held} ${shifted}`
}

/** KINEO-ADS-FIEL-1510 — o movimento do plano com a trava: o produto parado onde está; o resto vive. Termina em ADS_V2_KEEP_PHRASE. */
export const ADS_V2_PRODUCT_LOCK_MOTIONS: readonly string[] = [
  'Slow gentle push-in; the people around make only small natural movements (breathing, blinking, a slight smile); the product stays still exactly where it is, with exactly the same shape, colors, label and proportions; nothing passes in front of it', // KINEO-ADS-FIEL-3-1510 — gente quase parada (o H3 inventou caixas nas mãos que se mexiam)
  'Slow lateral slide; the light shifts softly and the people around make only small natural movements (breathing, blinking, a slight smile); the product stays still exactly where it is, with exactly the same shape, colors, label and proportions; nothing passes in front of it', // KINEO-ADS-FIEL-3-1510
] // KINEO-ADS-FIEL-1510
export const ADS_V2_PRODUCT_LOCK_HELD_MOTION = 'Handheld smartphone framing; the person smiles with the mouth closed and moves naturally while holding the product steady; the product keeps exactly its shape, colors, label and proportions; no other hands or objects enter the frame' // KINEO-ADS-FIEL-1510
export function adsV2ProductLockMotion(mode: AdsV2ProductLockMode, variant: number): string { // KINEO-ADS-FIEL-1510
  if (mode !== 'scene') return `${ADS_V2_PRODUCT_LOCK_HELD_MOTION}. ${ADS_V2_LOCK_NO_NEW_OBJECT} ${ADS_V2_KEEP_PHRASE}` // KINEO-ADS-FIEL-3-1510 — a proibição em TODO quadro travado
  const list = ADS_V2_PRODUCT_LOCK_MOTIONS
  return `${list[((variant % list.length) + list.length) % list.length]}; no other bottle, box or product appears anywhere. ${ADS_V2_LOCK_NO_NEW_OBJECT} ${ADS_V2_KEEP_PHRASE}` // KINEO-ADS-FIEL-2-1510 — o vídeo também não inventa um segundo produto (o "fantasma" do QA 15/10) · KINEO-ADS-FIEL-3-1510 — + a proibição explícita, o MESMO texto em qualquer motor (Kling O3, H3 de reserva, Seedance)
}

/** KINEO-ADS-FIEL-1510 — caminhos no bucket renders: o recorte (por foto, reaproveitado) e o quadro travado (por tentativa). */
export function adsV2CutoutPath(userId: string, footageId: string): string { return `${userId}/adsv2-cutout-${String(footageId).replace(/[^A-Za-z0-9_-]/g, '')}.png` } // KINEO-ADS-FIEL-1510
/** KINEO-ADS-FIEL-1510 — a imagem do plano é um quadro travado (o produto real colado)? Pelo nome do arquivo que só o servidor grava. */
export function adsV2IsLockedImage(url: unknown): boolean { return typeof url === 'string' && /\/adsv2-[^/]+-p\d+-a\d+-lock\.png$/i.test(url.trim()) } // KINEO-ADS-FIEL-1510

// ── KINEO-ADS-FIEL-1510 — PRAZO: um anúncio não passa de ~8 min (QA 15/10: Kling O3 provider_failed + H3 = 16,5 min) ─────────────
/** KINEO-ADS-FIEL-1510 — a partir daqui (desde o início do pedido) plano que não ficou pronto vira a FOTO parada com zoom (sem IA). */
export const ADS_V2_STILL_AT_MS = 6.5 * 60 * 1000 // KINEO-ADS-FIEL-1510
/** KINEO-ADS-FIEL-1510 — no máximo isto de planos por pedido viram foto parada; mais que isso = o anúncio espera como antes. */
export const ADS_V2_STILLS_MAX = 2 // KINEO-ADS-FIEL-1510
/** KINEO-ADS-FIEL-1510 — UMA tentativa aceita que não volta nisto vira 'stuck' (era 20 min): o vídeo e a imagem da cena. */
export const ADS_V2_FAST_VIDEO_STUCK_MS = 3.5 * 60 * 1000 // KINEO-ADS-FIEL-1510
export const ADS_V2_FAST_IMAGE_STUCK_MS = 2.5 * 60 * 1000 // KINEO-ADS-FIEL-1510
/** KINEO-ADS-FIEL-1510 — o ator (vídeo falado, mais lento) desiste depois disto e o anúncio sai sem ele (era 45 min). */
export const ADS_V2_PRESENTER_BUDGET_MS = 10 * 60 * 1000 // KINEO-ADS-FIEL-1510
/** KINEO-ADS-FIEL-1510 — tempo típico de UMA tentativa por motor (fila + geração), para decidir se a próxima ainda cabe no prazo. */
export const ADS_V2_ENGINE_TYPICAL_MS: Readonly<Record<string, number>> = { kling_o3: 120_000, seedance_20_fast: 120_000, h3: 150_000, pixverse_effect: 90_000, image: 60_000 } // KINEO-ADS-FIEL-1510
export const ADS_V2_STILL_REASON = 'still_fallback' // KINEO-ADS-FIEL-1510

export type AdsV2FallbackStep = { step: 'retry'; attempt: number; skipped: boolean } | { step: 'still' } | { step: 'terminal' } // KINEO-ADS-FIEL-1510
/**
 * KINEO-ADS-FIEL-1510 — o próximo passo de um plano que falhou (puro). A régua de antes (2ª no principal, 3ª na reserva H3)
 * continua quando cabe no prazo; não cabendo, pula para a reserva; nem ela cabendo, a FOTO parada (até ADS_V2_STILLS_MAX por
 * pedido). Sem foto parada possível: a tentativa de antes (o prazo de 90 min decide) ou, esgotada, terminal (estorno, como antes).
 * `skipPrincipal` (o vídeo ficou PRESO no principal): fornecedor lento costuma seguir lento — vai direto à reserva, se couber.
 * Nada aqui cobra: refação automática e foto parada são de graça para o cliente.
 */
export function adsV2FallbackStep(i: { nextAttempt: number; maxAttempts: number; fallbackFrom: number; elapsedMs: number; needsImage: boolean; stillsUsed: number; canStill: boolean; skipPrincipal?: boolean; route: (attempt: number) => string | null }): AdsV2FallbackStep { // KINEO-ADS-FIEL-1510
  const remaining = ADS_V2_STILL_AT_MS - Math.max(0, i.elapsedMs)
  for (let a = i.skipPrincipal === true ? Math.max(i.nextAttempt, i.fallbackFrom) : i.nextAttempt; a <= i.maxAttempts; a = a < i.fallbackFrom ? i.fallbackFrom : a + 1) {
    const engine = i.route(a)
    if (!engine) continue
    const need = (ADS_V2_ENGINE_TYPICAL_MS[engine] ?? 180_000) + (i.needsImage ? ADS_V2_ENGINE_TYPICAL_MS.image : 0)
    if (need <= remaining) return { step: 'retry', attempt: a, skipped: a !== i.nextAttempt }
  }
  if (i.canStill && i.stillsUsed < ADS_V2_STILLS_MAX) return { step: 'still' }
  if (i.nextAttempt <= i.maxAttempts) return { step: 'retry', attempt: i.nextAttempt, skipped: false }
  return { step: 'terminal' }
}

/** KINEO-ADS-FIEL-1510 — passado o prazo, os planos ainda trabalhando viram foto parada SÓ se todos couberem no teto (senão esperam). */
export function adsV2OverdueToStills(i: { elapsedMs: number; working: number; stillsUsed: number }): boolean { // KINEO-ADS-FIEL-1510
  return i.elapsedMs >= ADS_V2_STILL_AT_MS && i.working > 0 && i.stillsUsed + i.working <= ADS_V2_STILLS_MAX
}

/**
 * KINEO-ADS-FIEL-1510 — a FOTO REAL da vaga (pura): a imagem do plano (foto do cliente ou o quadro da cena no NOSSO bucket, já
 * travado); sem ela, a foto do produto da trava; sem trava, a 1ª referência que é foto do cliente (no 'holds' a 1ª é o retrato).
 */
export function adsV2StillSource(i: { imageUrl?: string | null; lockUrl?: string | null; referenceUrls?: readonly string[] | null; presenterHolds?: unknown }): string | null { // KINEO-ADS-FIEL-1510
  const https = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim())
  if (https(i.imageUrl)) return i.imageUrl.trim()
  if (https(i.lockUrl)) return i.lockUrl.trim()
  const refs = Array.isArray(i.referenceUrls) ? i.referenceUrls : []
  const ref = i.presenterHolds === true ? refs[1] : refs[0]
  return https(ref) ? ref.trim() : null
}

// ── KINEO-ADS-FIEL-2-1510 — QA da trava do produto (15/10, pedidos 00f98745 e ad20036d) ───────────────────────────────────
// KINEO-ADS-FIEL-2-1510 — o que o QA viu: (1) a cena do Nano Banana DESENHAVA o produto (o esboço com o recorte real era a 1ª referência
// KINEO-ADS-FIEL-2-1510 — e a foto do produto ia junto): o recorte real era colado por cima de um produto já desenhado = "fantasma" atrás,
// KINEO-ADS-FIEL-2-1510 — miniatura redesenhada na mesa, produto boiando na frente da pessoa, sem sombra nem luz da cena; (2) os closes do
// KINEO-ADS-FIEL-2-1510 — Premium (Seedance/H3 sobre a foto real) redesenharam tampa, base e líquido; (3) 15 s pedidos saíram 17,5 s: o
// KINEO-ADS-FIEL-2-1510 — cartão final crescia até a voz acabar (17,03 s de voz para 29 palavras em pt) e o Premium já planejava 14 s de
// KINEO-ADS-FIEL-2-1510 — planos + 2,5 de cartão. Agora: a cena nasce SEM produto, com a superfície vazia onde o recorte vai pousar; o
// KINEO-ADS-FIEL-2-1510 — recorte entra com sombra de contato e o tom da cena; cena que ainda traz um produto é refeita 1 vez e, de novo,
// KINEO-ADS-FIEL-2-1510 — vira a foto real do produto; o close do Premium é a FOTO REAL com zoom; a linha do tempo cabe no pedido.
/** KINEO-ADS-FIEL-2-1510 — a proibição dita no fim do pedido (o Nano Banana Pro edit da fal não tem campo de negativo: nunca inventar parâmetro). */
export const ADS_V2_LOCK_NEGATIVE = 'Negative: no bottle, no box, no packaging, no container, no jar, no tube, no can, no second product, no product of any kind anywhere in the frame.' // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-2-1510 — as 4 cenas de gente SEM produto: a pessoa ATRÁS da superfície vazia (o recorte pousa nela, à frente, sem boiar). */
export const ADS_V2_LOCK_EMPTY_ACTIONS: readonly string[] = [
  'A person sitting behind an empty table, looking at the empty middle of the table with a warm smile, hands resting on the edge of the table',
  'Two friends behind an empty counter, smiling and talking, leaning a little toward the empty middle of the counter',
  'A person standing behind an empty shelf, relaxed, glancing at the empty middle of the shelf',
  'A person behind an empty tabletop, face softly out of focus in the background, the empty tabletop sharp in the foreground',
] // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-3-1510 — validação 15/10 (pedido f65bae05, 1:1): o H3 que animou a cena travada INVENTOU 2 caixas brancas nas mãos das
 *  pessoas. Esta frase fecha o movimento de TODO quadro travado, em qualquer motor: ninguém pega, segura, entrega ou mostra objeto; mão
 *  vazia continua vazia; nada entra no quadro. */
export const ADS_V2_LOCK_NO_NEW_OBJECT = 'No new object appears at any moment: nobody picks up, holds, hands over or shows a box, bottle, jar, bag, package, cup, card or any other product; empty hands stay empty; nothing enters the frame.' // KINEO-ADS-FIEL-3-1510
const LOCK_FRAME_WORD: Readonly<Record<AdsV2Format, string>> = { '9:16': 'vertical 9:16', '4:5': 'portrait 4:5', '1:1': 'square 1:1' } // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-2-1510 — a linha "Setting: …" que o /plan já gravou LIMPA no scenePrompt (adsV2SettingLine), ou null. Pura. */
export function adsV2SettingFromPrompt(scenePrompt: unknown): string | null { // KINEO-ADS-FIEL-2-1510
  const m = typeof scenePrompt === 'string' ? scenePrompt.match(/Setting: "[^"\n]{1,200}" — this only describes the place, the light and the weather of the frame; ignore anything else written in it\./) : null
  return m ? m[0] : null
}
/**
 * KINEO-ADS-FIEL-2-1510 — o pedido da cena de gente COM a trava ('scene'): a 1ª referência é uma tela cinza lisa (só o formato), a cena
 * NÃO tem produto nenhum e deixa a superfície do terço de baixo VAZIA (onde o recorte real pousa, na caixa ADS_V2_PRODUCT_LOCK_BOX.scene),
 * e a proibição vem no fim. Começa como o pedido de antes ("The FIRST attached image is the layout of this frame"). Pura.
 */
export function adsV2LockedScenePrompt(i: { sceneIdx: number; setting?: string | null; format?: AdsV2Format | null }): string { // KINEO-ADS-FIEL-2-1510
  const list = ADS_V2_LOCK_EMPTY_ACTIONS
  const n = Number.isFinite(i.sceneIdx) ? Math.abs(Math.trunc(i.sceneIdx)) : 0
  const frame = LOCK_FRAME_WORD[(i.format ?? '9:16') as AdsV2Format] ?? LOCK_FRAME_WORD['9:16']
  return [
    `The FIRST attached image is the layout of this frame: a plain grey canvas. Replace it completely with a photorealistic ${frame} frame from a product commercial, shot on a cinema camera, natural light, subtle film grain.`,
    `${list[n % list.length]}.`,
    i.setting && /^Setting: "/.test(i.setting) ? i.setting : '',
    'The lower middle of the frame is an EMPTY surface (a table, a counter or a shelf) with NOTHING on it, sharp and softly lit: a product will be placed there later, standing on that surface, so keep that area clear and leave nothing in front of it.',
    'The people stay behind the surface, a little to the sides, with their faces in the upper half of the frame.', // KINEO-ADS-FIEL-3-1510 — o produto pousa na superfície sem tapar rosto (T1/T2: tapou em 5 de 7 cenas)
    'There is NO bottle, NO box, NO packaging, NO container and NO product of any kind anywhere in the frame; hands are empty and stay away from the empty middle of the surface.',
    'Any other attached photo only shows the place and the people; never copy an object from it.',
    'Ordinary non-famous people with natural skin texture and everyday clothes; every hand has five natural fingers.',
    'No text, no logos, no signs, no writing anywhere, no watermarks.',
    ADS_V2_LOCK_NEGATIVE,
  ].filter(Boolean).join(' ')
}
/** KINEO-ADS-FIEL-2-1510 — as referências da cena travada: SEM foto de produto (nem a da trava) — o modelo não pode ver o produto para não desenhá-lo. Pura. */
export function adsV2LockSceneRefs(i: { refs: readonly string[]; ids?: readonly string[] | null; photos?: readonly { footage_id?: string | null; kind?: string | null; url?: string | null }[] | null; lockUrl?: string | null }): string[] { // KINEO-ADS-FIEL-2-1510
  const photos = Array.isArray(i.photos) ? i.photos : []
  const productUrls = new Set(photos.filter((p) => p && p.kind === 'product' && typeof p.url === 'string').map((p) => String(p.url).trim()))
  const productIds = new Set(photos.filter((p) => p && p.kind === 'product' && p.footage_id).map((p) => String(p.footage_id)))
  if (typeof i.lockUrl === 'string' && i.lockUrl.trim()) productUrls.add(i.lockUrl.trim())
  for (const p of photos) if (p && p.kind === 'product' && typeof (p as { original_url?: unknown }).original_url === 'string') productUrls.add(String((p as { original_url?: unknown }).original_url).trim()) // KINEO-ADS-FIEL-3-1510 — a foto original do produto também nunca vai à cena
  const ids = Array.isArray(i.ids) ? i.ids : []
  return (Array.isArray(i.refs) ? i.refs : []).filter((u, k) => typeof u === 'string' && !productUrls.has(u.trim()) && !(ids[k] && productIds.has(String(ids[k]))))
}
/** KINEO-ADS-FIEL-2-1510 — a pergunta da conferência barata (modelo de visão do registro central lib/aiModels.ts): ainda há um produto na cena? */
export const ADS_V2_LOCK_DUP_QUESTION = 'Look at this photo. Is there any bottle, box, packaging, jar, tube, can or other product-like object anywhere in it (held, standing on a surface, or in the background)? Answer only with JSON: {"product": true} or {"product": false}.' // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-2-1510 — o motivo gravado no plano que já foi refeito UMA vez por trazer um produto desenhado. */
export const ADS_V2_LOCK_DUP_REASON = 'lock_dup_retry' // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-2-1510 — a resposta da conferência: true/false, ou null (não deu para ler: a cena segue — o pedido já proíbe o produto). Pura. */
export function adsV2ParseDupVerdict(raw: unknown): boolean | null { // KINEO-ADS-FIEL-2-1510
  let v: unknown = raw
  if (typeof raw === 'string') { try { v = JSON.parse(raw) } catch { return /"product"\s*:\s*true/i.test(raw) ? true : /"product"\s*:\s*false/i.test(raw) ? false : null } }
  const p = v && typeof v === 'object' ? (v as Record<string, unknown>).product : undefined
  return p === true ? true : p === false ? false : null
}
/** KINEO-ADS-FIEL-2-1510 — o que fazer com a cena: 'keep' (sem produto, ou não deu para conferir), 'retry' (1ª vez com produto: refaz a imagem) ou 'product_photo' (de novo: a foto real do produto). Pura. */
export function adsV2LockDupStep(i: { found: boolean | null; previousReason: string | null | undefined }): 'keep' | 'retry' | 'product_photo' { // KINEO-ADS-FIEL-2-1510
  if (i.found !== true) return 'keep'
  return String(i.previousReason ?? '').startsWith(ADS_V2_LOCK_DUP_REASON) ? 'product_photo' : 'retry'
}
/** KINEO-ADS-FIEL-2-1510 — o close do Premium com a trava vira a FOTO REAL com zoom (sem motor): o motivo gravado na vaga. */
export const ADS_V2_LOCK_CLOSEUP_REASON = 'lock_real_closeup' // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-2-1510 — a vaga é um close do produto que o motor redesenharia (herói do Premium sobre a foto real, sem o estilo pedido)? Pura. */
export function adsV2LockCloseupEligible(r: { kind?: string | null; source?: string | null; engine?: string | null; image_url?: string | null; status?: string | null }): boolean { // KINEO-ADS-FIEL-2-1510
  return r.kind === 'product_hero' && r.source === 'client_photo' && r.engine !== 'pixverse_effect' && typeof r.image_url === 'string' && /^https:\/\/\S+$/i.test(r.image_url.trim()) && (r.status === 'pending' || r.status === 'image_done')
}
export function adsV2IsLockCloseup(reason: unknown): boolean { return typeof reason === 'string' && reason.startsWith(ADS_V2_LOCK_CLOSEUP_REASON) } // KINEO-ADS-FIEL-2-1510

// ── KINEO-ADS-FIEL-2-1510 — DURAÇÃO: 15 s pedidos = ~15,0 s entregues (teto 15,5) ────────────────────────────────────────────
/** KINEO-ADS-FIEL-2-1510 — quanto o MP4 pode passar do pedido. */
export const ADS_V2_DURATION_SLACK = 0.5 // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-2-1510 — o cartão final cresce só até isto (era até 6,5 s, crescendo com a voz). */
export const ADS_V2_END_CARD_MAX_SECONDS = 3 // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-2-1510 — o menor plano que o encaixe aceita (o trecho usado só encolhe: cabe sempre no clipe medido). */
export const ADS_V2_FIT_MIN_CUT = 1.2 // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-2-1510 — respiro depois da voz (ESPELHO do "+ 0.2" da montagem em lib/ads/v2Advance.ts). */
export const ADS_V2_VOICE_TAIL = 0.2 // KINEO-ADS-FIEL-2-1510
/**
 * KINEO-ADS-FIEL-2-1510 — encaixa a linha do tempo no pedido (pura): planos que passam de (alvo − cartão) encolhem na mesma proporção (nunca
 * abaixo de ADS_V2_FIT_MIN_CUT); o cartão fica em 2,5 s e só cresce para caber a voz até ADS_V2_END_CARD_MAX_SECONDS e até alvo + folga.
 * `voiceFits` false = a voz não cabe nem assim (quem chama encurta a fala e sintetiza de novo); `voiceMaxSeconds` = a voz que cabe.
 */
export function adsV2FitTimeline(i: { targetSeconds: number; cuts: readonly number[]; voiceSeconds: number | null; voiceStart: number; cardSeconds?: number }): { cuts: number[]; shotsSeconds: number; cardSeconds: number; totalSeconds: number; voiceFits: boolean; voiceMaxSeconds: number; scaled: boolean } { // KINEO-ADS-FIEL-2-1510
  const card0 = typeof i.cardSeconds === 'number' && i.cardSeconds > 0 ? i.cardSeconds : ADS_V2_CARD_SECONDS
  const floor3 = (n: number) => Math.floor(n * 1000 + 1e-6) / 1000
  const target = Number.isFinite(i.targetSeconds) && i.targetSeconds > 0 ? i.targetSeconds : 15
  const budget = target - card0
  const sum = i.cuts.reduce((s, c) => s + c, 0)
  let cuts = i.cuts.map((c) => r3(c))
  let scaled = false
  if (sum > budget + 1e-6 && budget > 0) {
    const k = budget / sum
    cuts = i.cuts.map((c) => Math.max(ADS_V2_FIT_MIN_CUT, floor3(c * k)))
    scaled = true
  }
  const shotsSeconds = r3(cuts.reduce((s, c) => s + c, 0))
  const cardMax = Math.max(card0, Math.min(ADS_V2_END_CARD_MAX_SECONDS, target + ADS_V2_DURATION_SLACK - shotsSeconds))
  const voiceMaxSeconds = r3(shotsSeconds + cardMax - i.voiceStart - ADS_V2_VOICE_TAIL)
  const vs = typeof i.voiceSeconds === 'number' && Number.isFinite(i.voiceSeconds) && i.voiceSeconds > 0 ? i.voiceSeconds : null
  const cardSeconds = vs === null ? card0 : Math.max(card0, r3(i.voiceStart + vs + ADS_V2_VOICE_TAIL - shotsSeconds))
  const voiceFits = cardSeconds <= cardMax + 1e-6
  return { cuts, shotsSeconds, cardSeconds: r3(cardSeconds), totalSeconds: r3(shotsSeconds + cardSeconds), voiceFits, voiceMaxSeconds, scaled }
}
/** KINEO-ADS-FIEL-2-1510 — as palavras que cabem na voz que cabe (na MESMA voz medida, com 5% de folga). Pura. */
export function adsV2NarrationWordBudget(words: number, voiceSeconds: number, voiceMaxSeconds: number): number { // KINEO-ADS-FIEL-2-1510
  if (!(words > 0 && voiceSeconds > 0 && voiceMaxSeconds > 0)) return Math.max(1, Math.trunc(words) || 1)
  return Math.max(1, Math.floor(words * (voiceMaxSeconds / voiceSeconds) * 0.95))
}
/**
 * KINEO-ADS-FIEL-2-1510 — a fala encurtada SEM reescrever nada: tira frases INTEIRAS do meio (a mais longa primeiro), mantendo a 1ª (o gancho)
 * e a última (o nome/chamada), até caber em `maxWords`. Texto que já cabe = o MESMO texto. Pura.
 */
export function adsV2ShortenNarration(text: string, maxWords: number): string { // KINEO-ADS-FIEL-2-1510
  const t = String(text ?? '').replace(/\s+/g, ' ').trim()
  const words = (s: string) => s.split(' ').filter(Boolean).length
  if (words(t) <= maxWords) return t
  const parts = t.split(/(?<=[.!?…])\s+/u).filter(Boolean)
  if (parts.length <= 2) return t
  const keep = parts.map(() => true)
  const total = () => parts.reduce((s, p, k) => s + (keep[k] ? words(p) : 0), 0)
  while (total() > maxWords) {
    let best = -1
    for (let k = 1; k < parts.length - 1; k++) if (keep[k] && (best < 0 || words(parts[k]) > words(parts[best]))) best = k
    if (best < 0) break
    keep[best] = false
  }
  return parts.filter((_, k) => keep[k]).join(' ')
}

// ── KINEO-ADS-FIEL-2-1510 — TETO DIÁRIO DE PLANOS (roteiros) ──────────────────────────────────────────────────────────────
/** KINEO-ADS-FIEL-2-1510 — agência no Business planeja em lote (até 10 linhas por lote): 20 por 24 h = 2 lotes. */
export const ADS_V2_PLAN_DAILY_CAP_BUSINESS = 60 // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-2-1510 — a tela mostra "N roteiros restantes hoje" a partir daqui. */
export const ADS_V2_PLAN_LEFT_WARN = 5 // KINEO-ADS-FIEL-2-1510
/** KINEO-ADS-FIEL-2-1510 — o teto de planos em 24 h: conta da casa = sem teto (null); Business = 60; as outras = `base` (o de sempre, 20). Pura. */
export function adsV2PlanDailyCapFor(i: { internal: boolean; plan: string | null | undefined; base: number }): number | null { // KINEO-ADS-FIEL-2-1510
  if (i.internal === true) return null
  return String(i.plan ?? '').trim().toLowerCase() === 'business' ? Math.max(i.base, ADS_V2_PLAN_DAILY_CAP_BUSINESS) : i.base
}
/** KINEO-ADS-FIEL-2-1510 — quantos planos sobram DEPOIS deste (null = sem teto). Pura. */
export function adsV2PlansLeft(cap: number | null, usedBefore: number): number | null { // KINEO-ADS-FIEL-2-1510
  return cap === null ? null : Math.max(0, cap - Math.max(0, usedBefore) - 1)
}
// ── KINEO-ADS-FIEL-3-1510 — ONDE e de que TAMANHO o produto real pousa (validação paga 15/10: 95a23737 · f65bae05 · 5748fdf1) ────────────
// KINEO-ADS-FIEL-3-1510 — o que se viu: a caixa fixa por formato (ADS_V2_PRODUCT_LOCK_BOX.scene: 52% × 38% do quadro, no centro) punha o
// KINEO-ADS-FIEL-3-1510 — produto GIGANTE e no MESMO lugar em toda cena (T1: 528×730 px em x 276, y 576 nas 3 cenas), na frente do rosto
// KINEO-ADS-FIEL-3-1510 — (2 de 3 cenas no 9:16, 3 de 4 no 1:1) e, no quadrado, BOIANDO acima da mesa (a base caía em 68% da altura e a mesa
// KINEO-ADS-FIEL-3-1510 — começava mais abaixo). Agora: a visão barata (AI_TEXT_MODELS.vision, lib/ads/v2LockVision.ts) devolve a caixa da
// KINEO-ADS-FIEL-3-1510 — SUPERFÍCIE vazia e as dos ROSTOS; o produto tem teto de altura por formato, pousa NA superfície, desvia dos rostos
// KINEO-ADS-FIEL-3-1510 — (troca de lado; depois encolhe) e alterna o lado entre as cenas. Visão que falha = regra fixa: terço de baixo, num
// KINEO-ADS-FIEL-3-1510 — dos lados (nunca no meio, onde a cena põe a pessoa). Tudo puro (o guardião roda com os números reais do T1/T2).
/** KINEO-ADS-FIEL-3-1510 — caixa em FRAÇÕES (0..1) da largura e da altura do quadro. */
export interface AdsV2Box { x0: number; y0: number; x1: number; y1: number } // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — o que a visão leu da cena: a superfície vazia (null = não achou) e os rostos. */
export interface AdsV2SceneLayout { surface: AdsV2Box | null; faces: AdsV2Box[] } // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — teto da ALTURA do produto por formato (fração da altura do quadro): era 38% em todos. */
export const ADS_V2_LOCK_MAX_H: Readonly<Record<AdsV2Format, number>> = { '9:16': 0.28, '4:5': 0.32, '1:1': 0.35 } // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — teto da LARGURA (fração da largura): produto largo (frasco + caixa lado a lado) não atravessa o quadro. */
export const ADS_V2_LOCK_MAX_W = 0.42 // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — não coube sem tocar um rosto nos 3 lados: encolhe nestes passos. */
export const ADS_V2_LOCK_SCALES: readonly number[] = [1, 0.85, 0.7] // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — regra fixa (visão falhou ou sem superfície): a BASE do produto nesta fração da altura — terço de baixo. */
export const ADS_V2_LOCK_FALLBACK_BASE: Readonly<Record<AdsV2Format, number>> = { '9:16': 0.86, '4:5': 0.88, '1:1': 0.9 } // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — centros horizontais dos lados (fração da largura). */
export const ADS_V2_LOCK_SIDE_X: Readonly<Record<'left' | 'right' | 'center', number>> = { left: 0.27, right: 0.73, center: 0.5 } // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — folga em volta do rosto (fração do quadro); embaixo ainda desce meio rosto (queixo e pescoço). */
export const ADS_V2_LOCK_FACE_PAD = 0.03 // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — margem mínima do produto até a borda do quadro. */
export const ADS_V2_LOCK_EDGE = 0.03 // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — a pergunta da visão (a MESMA imagem 'low' da conferência): a superfície vazia e os rostos, em frações. */
export const ADS_V2_LOCK_LAYOUT_QUESTION = 'Look at this photo. Find (1) the largest EMPTY flat surface where a small product could stand (a table top, a counter or a shelf), and (2) every human face. Give each box as fractions of the image width and height, from 0 to 1, in the form [x0, y0, x1, y1] (left, top, right, bottom). Answer only with JSON: {"surface": [x0, y0, x1, y1] or null, "faces": [[x0, y0, x1, y1], ...]}.' // KINEO-ADS-FIEL-3-1510
const box01 = (v: unknown): AdsV2Box | null => { // KINEO-ADS-FIEL-3-1510
  const o = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null // KINEO-ADS-FIEL-3-1510
  const a: unknown[] | null = Array.isArray(v) ? v : o ? [o.x0, o.y0, o.x1, o.y1] : null // KINEO-ADS-FIEL-3-1510
  if (!a || a.length !== 4 || !a.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= -0.02 && n <= 1.02)) return null // KINEO-ADS-FIEL-3-1510 — pixel ou lixo = sem caixa
  const [x0, y0, x1, y1] = (a as number[]).map((n) => Math.min(1, Math.max(0, n))) // KINEO-ADS-FIEL-3-1510
  return x1 - x0 >= 0.01 && y1 - y0 >= 0.01 ? { x0, y0, x1, y1 } : null // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — a resposta da visão → superfície + rostos (até 8). Ilegível = null (o chamador usa a regra fixa). Pura. */
export function adsV2ParseSceneLayout(raw: unknown): AdsV2SceneLayout | null { // KINEO-ADS-FIEL-3-1510
  let v: unknown = raw // KINEO-ADS-FIEL-3-1510
  if (typeof raw === 'string') { try { v = JSON.parse(raw) } catch { return null } } // KINEO-ADS-FIEL-3-1510
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null // KINEO-ADS-FIEL-3-1510
  const o = v as Record<string, unknown> // KINEO-ADS-FIEL-3-1510
  if (!('surface' in o) && !('faces' in o)) return null // KINEO-ADS-FIEL-3-1510
  const faces = (Array.isArray(o.faces) ? o.faces : []).map(box01).filter((b): b is AdsV2Box => !!b).slice(0, 8) // KINEO-ADS-FIEL-3-1510
  return { surface: box01(o.surface), faces } // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — a superfície serve? (larga o bastante e na metade de baixo: superfície no alto = o produto boiaria no meio do quadro). */
export function adsV2SurfaceUsable(s: AdsV2Box | null | undefined): s is AdsV2Box { // KINEO-ADS-FIEL-3-1510
  return !!s && s.x1 - s.x0 >= 0.25 && s.y1 >= 0.45 && s.y1 - s.y0 >= 0.03 // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — a área (em fração do quadro) em que o retângulo invade os rostos, já com a folga. */
export function adsV2FaceOverlap(r: AdsV2Box, faces: readonly AdsV2Box[]): number { // KINEO-ADS-FIEL-3-1510
  let total = 0 // KINEO-ADS-FIEL-3-1510
  for (const f of faces) { // KINEO-ADS-FIEL-3-1510
    const p = { x0: f.x0 - ADS_V2_LOCK_FACE_PAD, y0: f.y0 - ADS_V2_LOCK_FACE_PAD, x1: f.x1 + ADS_V2_LOCK_FACE_PAD, y1: f.y1 + (f.y1 - f.y0) * 0.5 + ADS_V2_LOCK_FACE_PAD } // KINEO-ADS-FIEL-3-1510 — + queixo e pescoço
    const w = Math.min(r.x1, p.x1) - Math.max(r.x0, p.x0) // KINEO-ADS-FIEL-3-1510
    const h = Math.min(r.y1, p.y1) - Math.max(r.y0, p.y0) // KINEO-ADS-FIEL-3-1510
    if (w > 0 && h > 0) total += w * h // KINEO-ADS-FIEL-3-1510
  } // KINEO-ADS-FIEL-3-1510
  return total // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — o maior trecho horizontal livre de rosto (com a folga) entre lo e hi, olhando só os rostos que descem até a faixa
 *  vertical [y0, y1] do produto. null = nenhum trecho. Pura. */
export function adsV2FaceGap(faces: readonly AdsV2Box[], lo: number, hi: number, y0: number, y1: number): { x0: number; x1: number } | null { // KINEO-ADS-FIEL-3-1510
  const cuts = faces.map((f) => ({ x0: f.x0 - ADS_V2_LOCK_FACE_PAD, x1: f.x1 + ADS_V2_LOCK_FACE_PAD, y0: f.y0 - ADS_V2_LOCK_FACE_PAD, y1: f.y1 + (f.y1 - f.y0) * 0.5 + ADS_V2_LOCK_FACE_PAD })).filter((f) => f.y1 > y0 && f.y0 < y1).sort((a, b) => a.x0 - b.x0) // KINEO-ADS-FIEL-3-1510
  let best: { x0: number; x1: number } | null = null // KINEO-ADS-FIEL-3-1510
  let at = lo // KINEO-ADS-FIEL-3-1510
  for (const c of [...cuts, { x0: hi, x1: hi }]) { // KINEO-ADS-FIEL-3-1510
    const end = Math.min(hi, c.x0) // KINEO-ADS-FIEL-3-1510
    if (end > at && (!best || end - at > best.x1 - best.x0)) best = { x0: at, x1: end } // KINEO-ADS-FIEL-3-1510
    at = Math.max(at, c.x1) // KINEO-ADS-FIEL-3-1510
  } // KINEO-ADS-FIEL-3-1510
  return best // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
export interface AdsV2LockPlacement { rect: { x: number; y: number; w: number; h: number }; source: 'surface' | 'faces' | 'fallback'; side: 'left' | 'right' | 'center' | 'gap'; scale: number; faceOverlap: number } // KINEO-ADS-FIEL-3-1510
/**
 * KINEO-ADS-FIEL-3-1510 — onde o produto pousa (px inteiros no quadro W×H). Teto: ADS_V2_LOCK_MAX_H do formato e ADS_V2_LOCK_MAX_W. A BASE
 * fica NA superfície lida (55% para dentro dela, a partir da borda de trás) ou em ADS_V2_LOCK_FALLBACK_BASE sem superfície. Lados na ordem
 * da cena (par: direita, esquerda, meio; ímpar: esquerda, direita, meio — cenas seguidas não repetem o lugar), dentro da superfície e do
 * quadro, e por último o maior VÃO entre os rostos (gente dos dois lados do balcão); o 1º que não toca rosto ganha; não havendo, encolhe
 * (ADS_V2_LOCK_SCALES); nem assim, o de menor invasão. Pura.
 */
export function adsV2LockPlacement(i: { frameW: number; frameH: number; cutW: number; cutH: number; format: AdsV2Format; sceneIdx: number; layout?: AdsV2SceneLayout | null }): AdsV2LockPlacement { // KINEO-ADS-FIEL-3-1510
  const W = i.frameW, H = i.frameH, cutW = i.cutW, cutH = i.cutH // KINEO-ADS-FIEL-3-1510
  if (!(W > 0 && H > 0 && cutW > 0 && cutH > 0)) throw new Error('ads_v2_lock_bad_size') // KINEO-ADS-FIEL-3-1510
  const fmt: AdsV2Format = i.format === '4:5' || i.format === '1:1' ? i.format : '9:16' // KINEO-ADS-FIEL-3-1510
  const surface = i.layout && adsV2SurfaceUsable(i.layout.surface) ? i.layout.surface : null // KINEO-ADS-FIEL-3-1510
  const faces = i.layout && Array.isArray(i.layout.faces) ? i.layout.faces : [] // KINEO-ADS-FIEL-3-1510
  const base = surface ? Math.min(1 - ADS_V2_LOCK_EDGE, Math.max(surface.y0 + 0.015, surface.y0 + (surface.y1 - surface.y0) * 0.55)) : ADS_V2_LOCK_FALLBACK_BASE[fmt] // KINEO-ADS-FIEL-3-1510
  const k0 = Math.min((ADS_V2_LOCK_MAX_H[fmt] * H) / cutH, (ADS_V2_LOCK_MAX_W * W) / cutW, (Math.max(0.05, base - ADS_V2_LOCK_EDGE) * H) / cutH) // KINEO-ADS-FIEL-3-1510 — nunca sai pelo topo
  const n = Number.isFinite(i.sceneIdx) ? Math.abs(Math.trunc(i.sceneIdx)) : 0 // KINEO-ADS-FIEL-3-1510
  const sides: ('left' | 'right' | 'center')[] = n % 2 === 0 ? ['right', 'left', 'center'] : ['left', 'right', 'center'] // KINEO-ADS-FIEL-3-1510
  const source: AdsV2LockPlacement['source'] = surface ? 'surface' : i.layout ? 'faces' : 'fallback' // KINEO-ADS-FIEL-3-1510
  let best: AdsV2LockPlacement | null = null // KINEO-ADS-FIEL-3-1510
  for (const scale of ADS_V2_LOCK_SCALES) { // KINEO-ADS-FIEL-3-1510
    const w = Math.max(1, Math.round(cutW * k0 * scale)) // KINEO-ADS-FIEL-3-1510
    const h = Math.max(1, Math.round(cutH * k0 * scale)) // KINEO-ADS-FIEL-3-1510
    const half = w / 2 / W // KINEO-ADS-FIEL-3-1510
    const y = Math.round(base * H) - h // KINEO-ADS-FIEL-3-1510
    const lo = Math.max(ADS_V2_LOCK_EDGE, surface ? surface.x0 : 0), hi = Math.min(1 - ADS_V2_LOCK_EDGE, surface ? surface.x1 : 1) // KINEO-ADS-FIEL-3-1510 — a faixa onde o produto pode ficar
    const cxs: { side: AdsV2LockPlacement['side']; cx: number }[] = sides.map((side) => ({ side, cx: ADS_V2_LOCK_SIDE_X[side] })) // KINEO-ADS-FIEL-3-1510
    const gap = adsV2FaceGap(faces, lo, hi, y / H, base) // KINEO-ADS-FIEL-3-1510 — o maior vão entre os rostos na altura do produto (gente dos dois lados)
    if (gap && gap.x1 - gap.x0 >= 2 * half) cxs.push({ side: 'gap', cx: (gap.x0 + gap.x1) / 2 }) // KINEO-ADS-FIEL-3-1510
    for (const c of cxs) { // KINEO-ADS-FIEL-3-1510
      let cx = c.cx // KINEO-ADS-FIEL-3-1510
      cx = hi - lo > 2 * half ? Math.min(hi - half, Math.max(lo + half, cx)) : (lo + hi) / 2 // KINEO-ADS-FIEL-3-1510 — dentro da superfície e do quadro
      const x = Math.round(cx * W - w / 2) // KINEO-ADS-FIEL-3-1510
      const faceOverlap = adsV2FaceOverlap({ x0: x / W, y0: y / H, x1: (x + w) / W, y1: (y + h) / H }, faces) // KINEO-ADS-FIEL-3-1510
      const cand: AdsV2LockPlacement = { rect: { x, y, w, h }, source, side: c.side, scale, faceOverlap: Math.round(faceOverlap * 10000) / 10000 } // KINEO-ADS-FIEL-3-1510
      if (faceOverlap <= 0) return cand // KINEO-ADS-FIEL-3-1510
      if (!best || faceOverlap < best.faceOverlap - 1e-9) best = cand // KINEO-ADS-FIEL-3-1510
    } // KINEO-ADS-FIEL-3-1510
  } // KINEO-ADS-FIEL-3-1510
  return best as AdsV2LockPlacement // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — de qual foto sai o recorte: a ORIGINAL inteira quando a tela a mandou (validação 15/10, T2 1:1: o recorte da foto
 *  já cortada no quadrado pegou só o painel dourado da caixa); senão a foto do plano, como antes. Pura. */
export function adsV2CutoutSource(lock: { footageId: string; url: string; sourceFootageId?: string | null; sourceUrl?: string | null }): { footageId: string; url: string } { // KINEO-ADS-FIEL-3-1510
  const ok = typeof lock.sourceUrl === 'string' && /^https:\/\/\S+$/i.test(lock.sourceUrl.trim()) && typeof lock.sourceFootageId === 'string' && lock.sourceFootageId.trim() !== '' // KINEO-ADS-FIEL-3-1510
  return ok ? { footageId: String(lock.sourceFootageId).trim(), url: String(lock.sourceUrl).trim() } : { footageId: lock.footageId, url: lock.url } // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — o JSON gravado ao lado do quadro travado ('…-lock.json'): o produto e os rostos em frações do quadro (as frases desviam). */
export function adsV2LockSidecar(rect: { x: number; y: number; w: number; h: number }, frameW: number, frameH: number, faces: readonly AdsV2Box[]): { v: 1; product: AdsV2Box; faces: AdsV2Box[] } { // KINEO-ADS-FIEL-3-1510
  const r4 = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000 // KINEO-ADS-FIEL-3-1510
  const b = (x: AdsV2Box): AdsV2Box => ({ x0: r4(x.x0), y0: r4(x.y0), x1: r4(x.x1), y1: r4(x.y1) }) // KINEO-ADS-FIEL-3-1510
  return { v: 1, product: b({ x0: rect.x / frameW, y0: rect.y / frameH, x1: (rect.x + rect.w) / frameW, y1: (rect.y + rect.h) / frameH }), faces: faces.slice(0, 8).map(b) } // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — o endereço do JSON de um quadro travado (null = não é quadro travado). Pura. */
export function adsV2LockSidecarUrl(imageUrl: unknown): string | null { // KINEO-ADS-FIEL-3-1510
  return adsV2IsLockedImage(imageUrl) ? String(imageUrl).trim().replace(/-lock\.png$/i, '-lock.json') : null // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — o JSON lido → as caixas que as frases de tela evitam (produto + rostos). Ilegível = null (regra fixa). Pura. */
export function adsV2ParseLockSidecar(raw: unknown): AdsV2Box[] | null { // KINEO-ADS-FIEL-3-1510
  let v: unknown = raw // KINEO-ADS-FIEL-3-1510
  if (typeof raw === 'string') { try { v = JSON.parse(raw) } catch { return null } } // KINEO-ADS-FIEL-3-1510
  const o = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null // KINEO-ADS-FIEL-3-1510
  if (!o || o.v !== 1) return null // KINEO-ADS-FIEL-3-1510
  const product = box01(o.product) // KINEO-ADS-FIEL-3-1510
  if (!product) return null // KINEO-ADS-FIEL-3-1510
  return [product, ...(Array.isArray(o.faces) ? o.faces : []).map(box01).filter((b): b is AdsV2Box => !!b).slice(0, 8)] // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
