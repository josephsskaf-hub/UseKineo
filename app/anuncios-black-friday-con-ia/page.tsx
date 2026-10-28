import { BlackFridayPage, bfMetadata } from '@/components/ads/BlackFridayCampaignPage'

export const dynamic = 'force-static'
export const metadata = bfMetadata('es')

export default function Page() {
  return <BlackFridayPage lang="es" />
}
