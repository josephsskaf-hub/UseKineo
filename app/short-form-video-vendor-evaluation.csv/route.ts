import { PRODUCT } from '@/lib/kineoFacts'
import {
  buildShortsVendorEvaluation,
  renderShortsVendorEvaluationCsv,
} from '@/lib/growth/shortsVendorEvaluation'

export const dynamic = 'force-static'

export function GET(): Response {
  const sheet = buildShortsVendorEvaluation(PRODUCT.url)
  return new Response(renderShortsVendorEvaluationCsv(sheet), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="short-form-video-vendor-evaluation.csv"',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'all',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
