import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isInternalEmail } from '@/lib/internalAccounts'
import { readAll } from '@/lib/supabase/readAll'
import { COMPANY_OFFER_PATH } from './companyOfferContact'
import { COMPANY_OFFER_REQUEST_EVENT, companyOfferRequestId, readCompanyOfferLeadId } from './companyOfferRequests'

export async function readCompanyOfferInbox(admin: SupabaseClient, since: string | null) {
  const { data } = await readAll(() => {
    let query = admin.from('events')
      .select('id,metadata,created_at')
      .eq('name', COMPANY_OFFER_REQUEST_EVENT)
      .eq('path', COMPANY_OFFER_PATH)
      .order('created_at', { ascending: false })
    if (since) query = query.gte('created_at', since)
    return query
  }, { route: '/api/admin/funnel', table: 'events' })

  const requests = (data ?? []).flatMap((row) => {
    const leadId = readCompanyOfferLeadId(row.metadata?.lead_id)
    if (!leadId || !row.created_at || row.id !== companyOfferRequestId(leadId)) return []
    return [{ leadId, createdAt: row.created_at }]
  })

  const emails = new Map<string, string>()
  const leadIds = [...new Set(requests.map(({ leadId }) => leadId))]
  for (let offset = 0; offset < leadIds.length; offset += 100) {
    const { data: contacts, error } = await admin.from('leads').select('id,email').in('id', leadIds.slice(offset, offset + 100))
    if (error || !contacts) throw new Error('Company offer inbox contacts unavailable')
    for (const row of contacts) {
      const id = readCompanyOfferLeadId(row.id)
      if (id && typeof row.email === 'string' && !isInternalEmail(row.email)) emails.set(id, row.email)
    }
  }

  return requests.flatMap(({ leadId, createdAt }) => {
    const email = emails.get(leadId)
    return email ? [{ email, monthlyVolume: 'Company video service · proposal request', createdAt }] : []
  })
}
