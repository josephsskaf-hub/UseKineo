import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CITATION_FILM_RELEASE } from '@/lib/growth/citationFilmRelease'
import { citationIdeaVisible } from '@/lib/growth/citationIdeaAccess'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const reply = (visible: boolean) => NextResponse.json({ visible }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
  })
  if (CITATION_FILM_RELEASE !== 'internal') return reply(CITATION_FILM_RELEASE === 'public')
  try {
    const expectedId = new URL(request.url).searchParams.get('user_id')
    if (!expectedId || expectedId.length > 128) return reply(false)
    const { data: { user }, error } = await createClient().auth.getUser()
    return reply(!error && user?.id === expectedId && citationIdeaVisible(user, 'internal'))
  } catch {
    return reply(false)
  }
}
