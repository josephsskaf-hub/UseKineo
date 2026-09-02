export const AGENCY_DISTRIBUTION_ENTRIES = [
  'home',
  'state_report',
  'cost_page',
  'pricing',
  'comment_tool',
  'product_tool',
  'content_plan',
  'real_estate',
  'client_brief',
  'kineo1_engine',
  'text_to_video',
  'heygen_alternative',
] as const

export type AgencyDistributionEntry = (typeof AGENCY_DISTRIBUTION_ENTRIES)[number]

export const AGENCY_PACK_ONLY_ENTRIES = [
  'scope_brief',
] as const

export const AGENCY_PACK_ENTRIES = [
  ...AGENCY_DISTRIBUTION_ENTRIES,
  ...AGENCY_PACK_ONLY_ENTRIES,
] as const

export type AgencyPackEntry =
  | AgencyDistributionEntry
  | (typeof AGENCY_PACK_ONLY_ENTRIES)[number]

const ENTRY_SET = new Set<string>(AGENCY_PACK_ENTRIES)

/**
 * Internal acquisition links use a narrow `entry` parameter instead of UTM
 * tags. That preserves the visitor's original ChatGPT/Google attribution while
 * still telling the B2B funnel which first-party surface moved them forward.
 */
export function agencyPacksHref(entry: AgencyDistributionEntry): string {
  return `/ai-shorts-for-agencies?entry=${entry}#agency-pack-heading`
}

export function readAgencyDistributionEntry(
  search: string | null | undefined,
): AgencyPackEntry | null {
  if (!search) return null
  const raw = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    .get('entry')
    ?.trim()
    .toLowerCase()
  return raw && ENTRY_SET.has(raw) ? (raw as AgencyPackEntry) : null
}
