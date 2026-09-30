export const dynamic = 'force-dynamic'

/** Set only to the exact challenge issued by the OpenAI submission portal. */
export function GET() {
  const challenge = process.env.OPENAI_APPS_CHALLENGE?.trim()
  return new Response(challenge || 'Domain verification is not configured.', {
    status: challenge ? 200 : 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
