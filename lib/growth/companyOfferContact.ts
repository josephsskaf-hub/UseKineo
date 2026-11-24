export const COMPANY_OFFER_INTENT = 'company_service_request'
export const COMPANY_OFFER_PATH = '/company-video-service'
export const COMPANY_OFFER_CONTACT_ENDPOINT = '/api/lead-capture/company-offer'
export const COMPANY_OFFER_LEAD_SOURCE = 'b2b_company_service_2411'

const REQUESTED_AT_PREFIX = 'company_service_v1:'

export function companyOfferRequestKey(requestedAt: string): string {
  return REQUESTED_AT_PREFIX + requestedAt
}

export function companyOfferRequestedAt(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith(REQUESTED_AT_PREFIX)) return null
  const date = value.slice(REQUESTED_AT_PREFIX.length)
  const time = Date.parse(date)
  return Number.isFinite(time) && new Date(time).toISOString() === date ? date : null
}
