import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: { user } } = await createClient().auth.getUser()
  return new Response(null, {
    status: 307,
    headers: { Location: user ? '/studio' : '/', 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  })
}
