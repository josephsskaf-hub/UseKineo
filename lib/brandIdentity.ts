export const BRAND_NAME = 'Kineo' as const
export const BRAND_URL = 'https://www.usekineo.com' as const

/**
 * Entity aliases, not marketing copy. `ShortsForgeAI` preserves the historical
 * rename; the Cineo spellings mirror the misspelling Google already associates
 * with Kineo. Keep this one list shared by every JSON-LD surface so the page
 * Google chooses for a brand query cannot describe a different entity.
 */
export const BRAND_ALIASES = [
  'Kineo AI',
  'UseKineo',
  'Cineo',
  'Cineo AI',
  'ShortsForgeAI',
] as const
