import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clipNaMolduraVisivel } from '@/lib/create/clipNaMoldura'
import { abaRecreateVisivel } from '@/lib/create/clipRecreateJuntos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const reply = (showClip: boolean, showRecreate: boolean) => NextResponse.json({ showClip, showRecreate }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
  })
  try {
    const { data: { user }, error } = await createClient().auth.getUser()
    if (error) return reply(false, false)
    return reply(clipNaMolduraVisivel(user?.email), abaRecreateVisivel(user?.email))
  } catch {
    return reply(false, false)
  }
}
