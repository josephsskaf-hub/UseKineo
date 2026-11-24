import 'server-only'

import { contaDaCasaExata } from '@/lib/internalAccounts'
import { createClient } from '@/lib/supabase/server'
import { COMPANY_OFFER_RELEASE, type CompanyOfferRelease } from './companyOfferRelease'

export async function canViewCompanyOffer(release: CompanyOfferRelease = COMPANY_OFFER_RELEASE): Promise<boolean> {
  if (release === 'off') return false
  if (release === 'public') return true

  try {
    const { data, error } = await createClient().auth.getUser()
    return !error && !!data.user?.email_confirmed_at && contaDaCasaExata(data.user.email)
  } catch {
    return false
  }
}
