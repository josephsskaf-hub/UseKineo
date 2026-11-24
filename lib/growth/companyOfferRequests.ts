import 'server-only'

import { createHash } from 'node:crypto'

export const COMPANY_OFFER_REQUEST_EVENT = 'company_offer_proposal_requested'

export function readCompanyOfferLeadId(value: unknown): string | null {
  return typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase()
    : null
}

export function companyOfferRequestId(leadId: string): string {
  // The identity comes from the contact, so rotating the service credential never changes it.
  const digest = createHash('sha256').update(COMPANY_OFFER_REQUEST_EVENT + ':' + leadId).digest('hex')
  return [digest.slice(0, 8), digest.slice(8, 12), '4' + digest.slice(13, 16), 'a' + digest.slice(17, 20), digest.slice(20, 32)].join('-')
}
