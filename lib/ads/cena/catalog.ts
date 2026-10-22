// KINEO-ADS-CENA-2110 — tabela única editável: a visão escolhe a categoria, nunca inventa cenário nem ação.
// KINEO-ADS-CENA-AJUSTE-2110 — figurino explícito e estável nas duas imagens, tomadas e refações.
export const ADS_CENA_LIVE: 'off' | 'internal' = 'internal'
export const CENA_CATALOG = {
  wearable: { format: 'athlete_demo', setting: 'an outdoor running track at dawn', actor: 'one adult runner in sportswear', interaction: 'wears the watch on their own LEFT wrist, runs, slows down and looks at the watch', scale: 'a watch fitted around the LEFT wrist' },
  skincare: { format: 'hands_demo', setting: 'a bright clean bathroom counter', actor: 'one adult, only their own forearms and hands visible', interaction: 'opens the jar and applies a small amount to their own forearm', scale: 'a small jar fitting in one palm' },
  perfume: { format: 'lifestyle_demo', setting: 'a dressing table before an evening walk', actor: 'one adult getting ready to go out', interaction: 'picks up the bottle and sprays once onto their own wrist, away from the face', scale: 'a bottle held comfortably in one hand' },
  footwear: { format: 'athlete_demo', setting: 'a city sidewalk beside a gym', actor: 'one adult runner', interaction: 'puts on the shoes, ties them with their own hands and starts running', scale: 'shoes correctly fitted to the actor feet' },
  bag: { format: 'lifestyle_demo', setting: 'a street outside a modern office', actor: 'one adult commuting', interaction: 'places the bag on their own shoulder and walks into the office', scale: 'a bag fitted naturally to the actor shoulder' },
  bottle: { format: 'hands_demo', setting: 'a bright kitchen after a workout', actor: 'one adult athlete', interaction: 'opens the bottle, pours the drink into a glass and holds the glass below chest level', scale: 'a bottle of realistic handheld size' },
  supplement: { format: 'hands_demo', setting: 'a kitchen counter beside a gym bag', actor: 'one adult athlete, their own hands visible', interaction: 'opens the container and prepares a serving in a shaker without drinking on camera', scale: 'a container of realistic handheld size' },
  tea: { format: 'hands_demo', setting: 'a bright calm kitchen counter', actor: 'one adult preparing tea', interaction: 'opens the tea package with their own hands and prepares the tea in a cup, keeping everything below chest level without drinking on camera', scale: 'the real tea package beside an ordinary cup, no enlargement' },
  other: { format: 'hands_demo', setting: 'a bright tidy worktable', actor: 'one adult, only their own arms and hands visible', interaction: 'picks up and turns the product to show its real front and side', scale: 'the actual product proportions, no enlargement' },
} as const
export type CenaCategory = keyof typeof CENA_CATALOG
export const CENA_WARDROBE: Record<CenaCategory, string> = {
  wearable: 'a plain cobalt-blue short-sleeve athletic shirt, charcoal running shorts and white running shoes',
  skincare: 'a plain cream short-sleeve cotton shirt, no jewellery or accessories',
  perfume: 'a plain black short-sleeve shirt and dark trousers, no jewellery or accessories',
  footwear: 'a plain cobalt-blue short-sleeve athletic shirt and charcoal running shorts',
  bag: 'a plain ivory short-sleeve blouse and charcoal trousers, no jewellery or accessories',
  bottle: 'a plain cobalt-blue short-sleeve athletic shirt and charcoal trousers',
  supplement: 'a plain cobalt-blue short-sleeve athletic shirt and charcoal trousers',
  tea: 'a plain cream short-sleeve cotton shirt and charcoal trousers, no jewellery or accessories',
  other: 'a plain cream short-sleeve cotton shirt and charcoal trousers, no jewellery or accessories',
}
export const CENA_ACTORS: Record<CenaCategory, string> = { wearable: 'jade', skincare: 'clara', perfume: 'sofia', footwear: 'jade', bag: 'hannah', bottle: 'jade', supplement: 'jade', tea: 'sofia', other: 'sofia' }
export function cenaCategory(value: unknown): value is CenaCategory { return typeof value === 'string' && Object.hasOwn(CENA_CATALOG, value) }

// Recebe um booleano derivado SOMENTE da lista EXATA do auth do Studio Ads. Não usa padrões de métricas.
export function cenaEnabled(internal: boolean, flag: string = ADS_CENA_LIVE): boolean { return flag === 'internal' && internal === true }
