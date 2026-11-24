import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { canViewCompanyOffer } from '@/lib/growth/companyOfferAccess'
import { COMPANY_OFFER } from '@/lib/growth/companyOffer'
import CompanyOfferPage from './CompanyOfferPage'
import './company-offer.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Monthly product ad production | ' + COMPANY_OFFER.brand,
  robots: { index: false, follow: false },
}

export default async function CompanyVideoServicePage() {
  if (!await canViewCompanyOffer()) notFound()
  return <CompanyOfferPage />
}
