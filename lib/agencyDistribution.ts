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
] as const

export type AgencyDistributionEntry = (typeof AGENCY_DISTRIBUTION_ENTRIES)[number]

const ENTRY_SET = new Set<string>(AGENCY_DISTRIBUTION_ENTRIES)

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
): AgencyDistributionEntry | null {
  if (!search) return null
  const raw = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    .get('entry')
    ?.trim()
    .toLowerCase()
  return raw && ENTRY_SET.has(raw) ? (raw as AgencyDistributionEntry) : null
}
