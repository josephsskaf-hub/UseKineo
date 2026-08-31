export const B2B_LEAD_INTENT = 'agency_brief' as const
export const B2B_LEAD_SOURCE = 'b2b_agency_intake' as const
export const B2B_FIT_REVIEW_CAMPAIGN = 'b2b_volume_fit_review_v1' as const
export const B2B_FIT_REVIEW_UTM_SOURCE = 'kineo_facts' as const
export const B2B_FIT_REVIEW_UTM_MEDIUM = 'answer_engine' as const

export const B2B_VOLUME_OPTIONS = [
  { id: '10_19', label: '10–19 videos / month' },
  { id: '20_49', label: '20–49 videos / month' },
  { id: '50_99', label: '50–99 videos / month' },
  { id: '100_plus', label: '100+ videos / month' },
] as const

export type B2BVolumeId = (typeof B2B_VOLUME_OPTIONS)[number]['id']

const VOLUME_IDS = new Set<string>(B2B_VOLUME_OPTIONS.map((option) => option.id))
const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface B2BLeadInput {
  email: string
  volume: B2BVolumeId
}

export type B2BFitReviewAttribution = {
  entry_campaign: typeof B2B_FIT_REVIEW_CAMPAIGN
  entry_medium: typeof B2B_FIT_REVIEW_UTM_MEDIUM
  entry_source: typeof B2B_FIT_REVIEW_UTM_SOURCE
}

export function isB2BVolumeId(value: unknown): value is B2BVolumeId {
  return typeof value === 'string' && VOLUME_IDS.has(value)
}

export function normalizeLeadEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!email || email.length > 200 || !SIMPLE_EMAIL.test(email)) return null
  return email
}

export function parseB2BLeadInput(value: unknown): B2BLeadInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const email = normalizeLeadEmail(input.email)
  if (!email || !isB2BVolumeId(input.volume)) return null
  return { email, volume: input.volume }
}

export function b2bVolumeStorageKey(volume: B2BVolumeId): string {
  return `monthly_${volume}`
}

export function readB2BVolumeStorageKey(value: unknown): B2BVolumeId | null {
  if (typeof value !== 'string' || !value.startsWith('monthly_')) return null
  const candidate = value.slice('monthly_'.length)
  return isB2BVolumeId(candidate) ? candidate : null
}

/**
 * Recognize only the first-party machine-readable discovery link. Raw query
 * parameters never enter analytics, which keeps arbitrary URLs and PII out of
 * the B2B funnel while still separating answer-engine discovery.
 */
export function readB2BFitReviewAttribution(search: string): B2BFitReviewAttribution | null {
  const params = new URLSearchParams(search)
  if (
    params.get('utm_source') !== B2B_FIT_REVIEW_UTM_SOURCE ||
    params.get('utm_medium') !== B2B_FIT_REVIEW_UTM_MEDIUM ||
    params.get('utm_campaign') !== B2B_FIT_REVIEW_CAMPAIGN
  ) return null

  return {
    entry_campaign: B2B_FIT_REVIEW_CAMPAIGN,
    entry_medium: B2B_FIT_REVIEW_UTM_MEDIUM,
    entry_source: B2B_FIT_REVIEW_UTM_SOURCE,
  }
}
