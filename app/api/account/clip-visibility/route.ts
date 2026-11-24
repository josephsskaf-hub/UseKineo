import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CLIPS_PUBLIC } from '@/lib/clips/clipLaunch'
import { clipsVisible } from '@/lib/clips/clipLaunchAccess'

export const dynamic = 'force-dynamic'

export async function GET() {
  const reply = (visible: boolean) => NextResponse.json({ visible }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
  })
  if (CLIPS_PUBLIC) return reply(true)
  try {
    const { data: { user }, error } = await createClient().auth.getUser()
    return reply(!error && clipsVisible(user?.email))
  } catch {
    return reply(false)
  }
}
