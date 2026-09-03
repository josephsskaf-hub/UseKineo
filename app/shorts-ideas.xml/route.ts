import { buildDailyShortIdeasRss } from '@/lib/growth/dailyShortIdeas'

// The Next full-route cache may return stale content while it revalidates in
// the background. Keep that cache out of the daily contract; the CDN still
// owns the one-hour TTL declared on the response.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(): Promise<Response> {
  return new Response(buildDailyShortIdeasRss(), {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
