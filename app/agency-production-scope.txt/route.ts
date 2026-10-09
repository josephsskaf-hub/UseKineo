import { BUSINESS_OFFER_FACT, PRODUCT } from '@/lib/kineoFacts'
import {
  buildAgencyProductionScope,
  renderAgencyProductionScopeTxt,
} from '@/lib/growth/agencyProductionScope'
import { AUTOPILOT_PUBLIC } from '@/lib/autopilotPublic' // KINEO-AUTOPILOT-FORA-2026-10-09

export const dynamic = 'force-static'

export function GET(): Response {
  const built = buildAgencyProductionScope(PRODUCT.url, BUSINESS_OFFER_FACT)
  // KINEO-AUTOPILOT-FORA-2026-10-09 — com o Autopilot fora da vitrine, o caminho de compra 'autopilot' sai do documento (o contrato puro em
  // lib/growth/agencyProductionScope.ts fica igual; o filtro mora aqui, onde o documento é servido).
  const scope = AUTOPILOT_PUBLIC ? built : { ...built, purchasePaths: built.purchasePaths.filter((p) => p.id !== 'autopilot') }
  return new Response(renderAgencyProductionScopeTxt(scope), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'all',
    },
  })
}
