import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isInternalEmail } from '@/lib/internalAccounts'
import { readAll } from '@/lib/supabase/readAll'
import { COMPANY_OFFER_LEAD_SOURCE, companyOfferRequestKey, companyOfferRequestedAt } from './companyOfferContact'

export async function readCompanyOfferInbox(admin: SupabaseClient, since: string | null) {
  const { data } = await readAll(() => {
    let query = admin.from('leads')
      .select('email,magnet')
      .eq('source', COMPANY_OFFER_LEAD_SOURCE)
      .order('magnet', { ascending: false })
    if (since) query = query.gte('magnet', companyOfferRequestKey(since))
    return query
  }, { route: '/api/admin/funnel', table: 'leads' })

  return (data ?? []).flatMap((row) => {
    const requestedAt = companyOfferRequestedAt(row.magnet)
    if (!requestedAt || isInternalEmail(row.email)) return []
    return [{ email: row.email, monthlyVolume: 'Company video service · proposal request', createdAt: requestedAt }]
  })
}
