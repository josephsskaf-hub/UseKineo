// KINEO-ADS-CENA-95-PACING-2110 — composição por formato: Produto é o protagonista; UGC preserva a cena humana.
import { CENA_CATALOG, type CenaCategory } from './catalog'
import type { CenaVoiceMode } from './adapters'

export interface Cena95Composition {
  format: string
  setting: string
  scale: string
  actor: string
  interaction: string
  framing: string
  opening: string
  keyframe: string
  productDominant: boolean
  faceRequired: boolean
}

/** Uma única tabela editável de planos de Produto, sem alterar o catálogo/caminho legado ou a ação do UGC. */
export const CENA95_PRODUCT_COMPOSITIONS: Record<CenaCategory, { setting: string; interaction: string; framing: string; opening: string; talkingInteraction?: string }> = {
  wearable: {
    setting: 'a dawn running track softly defocused behind a close view of the LEFT wrist',
    interaction: 'keeps the watch fitted on their own LEFT wrist, taps its existing control with their own other hand, then turns that wrist slightly to look at the watch; the camera follows the watch, never a runner',
    framing: 'Close view of the whole watch, its LEFT wrist and the connected forearm; include a shirt sleeve and enough arm continuity to establish ownership, with the watch as the focal subject.',
    opening: 'the LEFT wrist enters the close frame already wearing the whole watch, then the same person looks at it or taps its existing control',
  },
  skincare: {
    setting: 'a bright clean bathroom counter seen close to the real jar and the same person own hands',
    interaction: 'opens the real jar with their own connected hands and applies a small amount to their own forearm, keeping the whole jar visible and away from any face',
    framing: 'Close view of the whole jar, its opening and the same person own hands and forearms; visible shirt sleeves establish ownership and clothing continuity.',
    opening: 'their own hands open the real jar in a close view, with the entire jar and its original label in frame',
  },
  perfume: {
    setting: 'a dressing table with evening light softly defocused behind the whole bottle and their own wrist',
    interaction: 'holds the whole perfume bottle in their own connected hand and sprays once onto their own other wrist, away from any face; keep the bottle and original label as the focal subject',
    framing: 'Close view of the entire perfume bottle, its nozzle and the same person connected wrists and forearms; include a visible sleeve, with no face needed.',
    opening: 'their own hand lifts the whole bottle into the close frame and prepares one spray onto their own other wrist',
  },
  footwear: {
    setting: 'a close view of the same person shoes on a city sidewalk beside a gym',
    interaction: 'ties the real shoes on their own feet using their own connected hands, then takes two steps while the camera remains close on the whole shoes and lower legs; no running-person or wider body shot',
    talkingInteraction: 'holds the whole real shoes below chest level with their own connected hands and demonstrates tying their existing laces; keep the shoes as the foreground focal subject without a full-body view',
    framing: 'Close view of the entire shoes, the same person feet and lower legs, with connected hands only while tying; include the visible charcoal clothing hem for continuity.',
    opening: 'their own hands pull the existing laces into a knot while the whole shoes remain in the close frame',
  },
  bag: {
    setting: 'a close view of the real bag against the same person shoulder and torso outside an office',
    interaction: 'places the real bag on their own shoulder with their own connected hand and opens its existing main compartment; camera follows the whole bag and strap, never a full walking person',
    framing: 'Close view of the whole bag, shoulder strap, shoulder and connected forearm against the same blouse; no legs or head-to-toe framing.',
    opening: 'their own hand settles the real strap on their own shoulder while the camera stays close on the entire bag',
  },
  bottle: {
    setting: 'a bright kitchen counter close to the whole bottle, glass and the same person hands',
    interaction: 'opens the whole real bottle with their own connected hands, pours the drink into a glass and holds the glass below chest level without drinking on camera',
    framing: 'Close view of the whole bottle and the same person hands and forearms, with sleeves visible and the bottle as the focal subject.',
    opening: 'their own hands open the real bottle in close view, keeping the whole bottle and original label visible',
  },
  supplement: {
    setting: 'a kitchen counter close to the whole supplement container beside the same person hands',
    interaction: 'opens the whole real container and prepares a serving in a shaker with their own connected hands, without drinking on camera; the original container remains the focal subject',
    framing: 'Close view of the whole real container, the preparation and the same person connected hands and forearms, with sleeves visible.',
    opening: 'their own hands open the real container while the entire original package remains in the close frame',
  },
  tea: {
    setting: 'a bright calm kitchen counter close to the real tea package and an ordinary cup',
    interaction: 'opens the tea package with their own hands and prepares the tea in a cup, keeping everything below chest level without drinking on camera; the whole original package stays in focus',
    framing: 'Close view of the whole tea package, the cup and the same person connected hands and forearms, with sleeves visible; the package is the focal subject.',
    opening: 'their own hands open the real tea package beside the cup in a close view with the entire package visible',
  },
  other: {
    setting: 'a bright tidy worktable close to the real product and the same person hands',
    interaction: 'picks up the whole real product with their own connected hands and tilts it slightly to show its existing front and side, without inventing a feature, accessory or use',
    framing: 'Close view of the whole real product and the same person connected hands and forearms, with sleeves visible and no face needed.',
    opening: 'their own hands bring the whole real product into a close view of its existing front',
  },
}

/** Pure. A persisted composition distinguishes new plans from saved orders that retain their original framing contract. */
export function cena95Composition(category: CenaCategory, formato: 'ugc' | 'product' = 'product', voiceMode: CenaVoiceMode = 'narrated'): Cena95Composition {
  const row = CENA_CATALOG[category]
  if (formato === 'ugc') return {
    format: row.format, setting: row.setting, scale: row.scale, actor: 'Exactly one adult, with a natural face visible', interaction: row.interaction,
    framing: 'Natural creator demonstration with the same person and the whole product. A full-body view is permitted when the category action calls for it.',
    opening: 'strong natural movement with the person AND the whole product', keyframe: 'the same person and whole product, upper torso and both connected arms, natural posture before movement',
    productDominant: false, faceRequired: true,
  }
  const product = CENA95_PRODUCT_COMPOSITIONS[category], talking = voiceMode === 'talking'
  const framing = talking
    ? 'PRODUCT-FIRST CLOSE COMPOSITION: tight crop around the partial lower face, chest and whole product, with the speaking mouth continuously visible as secondary context. The whole real product dominates attention in the foreground below the face, at its real scale and with clear separation from the face. No full-body, head-to-toe, wide athlete or wide lifestyle view. Keep the same shirt and connected arms visible; do not move the product near the mouth.'
    : `PRODUCT-FIRST CLOSE COMPOSITION: ${product.framing} The product dominates attention through framing and focus, never by enlarging its real size. No full-body, head-to-toe, wide athlete or wide lifestyle view. The face may be outside the crop; any visible face remains natural and its mouth closed.`
  return {
    format: talking ? 'product_talking_close' : 'product_close_demo', setting: product.setting,
    scale: category === 'footwear' && talking ? 'the entire real shoes at realistic size relative to the same person hands, never enlarged or miniaturized' : row.scale,
    actor: talking ? 'Exactly one approved adult, only the cropped chest, lower face and connected arms needed for the product demonstration' : 'Exactly one approved adult; show only their connected hands, forearms or the relevant body part needed for this real product',
    interaction: talking && product.talkingInteraction ? product.talkingInteraction : product.interaction,
    framing, opening: talking && product.talkingInteraction ? product.talkingInteraction : product.opening,
    keyframe: `${framing} The whole real product is the main subject before the category action; show the same actor visible sleeves or clothing and continuous ownership of every visible hand and relevant body part.`,
    productDominant: true, faceRequired: talking,
  }
}
