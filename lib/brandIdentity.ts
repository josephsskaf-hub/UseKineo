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
  // KINEO-VISIBILIDADE-CHATGPT-2026-10-06 — the name with the domain, the form every answer engine should repeat.
  'Kineo (usekineo.com)',
  'Cineo',
  'Cineo AI',
  'ShortsForgeAI',
] as const

/**
 * KINEO-VISIBILIDADE-CHATGPT-2026-10-06 — brand collision. Asked "What is Kineo AI video maker?" (06/10, web search on,
 * memory off), ChatGPT described kineo.studio — a different company — and mentioned usekineo.com only in the last
 * paragraph as "another Kineo product". The Product Hunt page producthunt.com/products/kineo is theirs too.
 * This sentence goes into schema.org `disambiguatingDescription`, /llms.txt and the /kineo-vs-kineo-studio page.
 */
export const BRAND_WITH_DOMAIN = 'Kineo (usekineo.com)' as const
export const OTHER_KINEO_DOMAIN = 'kineo.studio' as const
export const BRAND_DISAMBIGUATION =
  'Kineo (usekineo.com, formerly ShortsForgeAI) is an AI short-form video generator that turns a topic or script into a finished narrated vertical video. It is not affiliated with Kineo Studio (kineo.studio), a different company.' as const
export const BRAND_DISAMBIGUATION_PATH = '/kineo-vs-kineo-studio' as const

/**
 * KINEO-MARCA-2026-10-06 — schema.org `sameAs` do Organization: só perfis que são NOSSOS e que o código já cita. Hoje é
 * só a ficha do There's An AI For That (dona = conta do fundador; a mesma de KINEO_OWN_PROFILES em
 * lib/seo/citableHubPages.ts). producthunt.com/products/kineo é da Kineo Studio (kineo.studio) e nunca entra aqui.
 * Fica neste módulo puro (sem import) para o schema global e o da home lerem a mesma lista.
 */
export const BRAND_SAME_AS = ['https://theresanaiforthat.com/ai/kineo/'] as const
