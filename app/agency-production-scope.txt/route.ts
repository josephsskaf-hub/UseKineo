import { BUSINESS_OFFER_FACT, PRODUCT } from '@/lib/kineoFacts'
import {
  buildAgencyProductionScope,
  renderAgencyProductionScopeTxt,
} from '@/lib/growth/agencyProductionScope'
import { AUTOPILOT_PUBLIC } from '@/lib/autopilotPublic' // KINEO-AUTOPILOT-FORA-2026-10-09
import { BULK_PACKS_PUBLIC } from '@/lib/bulkPacksPublic' // KINEO-PAGINAS-QUE-VENDEM-2026-10-12
import { businessPitch } from '@/lib/growth/businessPitch'

export const dynamic = 'force-static'

export function GET(): Response {
  // KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — este documento descreve os pacotes avulsos (vendidos em filmes Kineo 1), que
  // saíram da vitrine e respondem 410 no checkout. Com o interruptor desligado, 410 aqui também, com o caminho de hoje.
  if (!BULK_PACKS_PUBLIC) {
    const pitch = businessPitch(PRODUCT.url)
    return new Response(
      `# Kineo agency production scope

One-time agency packs are no longer sold.

- ${pitch.sentence} ${pitch.pageUrl}
- Monthly self-service plans: ${PRODUCT.url}/pricing
`,
      { status: 410, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  }
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
