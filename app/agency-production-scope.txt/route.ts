import { BUSINESS_OFFER_FACT, PRODUCT } from '@/lib/kineoFacts'
import {
  buildAgencyProductionScope,
  renderAgencyProductionScopeTxt,
} from '@/lib/growth/agencyProductionScope'

export const dynamic = 'force-static'

export function GET(): Response {
  const scope = buildAgencyProductionScope(PRODUCT.url, BUSINESS_OFFER_FACT)
  return new Response(renderAgencyProductionScopeTxt(scope), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'all',
    },
  })
}
