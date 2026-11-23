import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { releaseVisible } from '@/lib/recreate/access'
import { ACCOUNT_MENU_RELEASE } from '@/lib/ui/unifiedAccountMenu'

export const dynamic = 'force-dynamic'

export async function GET() {
  const reply = (enabled: boolean) => NextResponse.json({ enabled }, { headers: { 'Cache-Control': 'no-store' } })
  if (ACCOUNT_MENU_RELEASE !== 'internal') return reply(releaseVisible(null, ACCOUNT_MENU_RELEASE))
  try {
    const { data: { user } } = await createClient().auth.getUser()
    return reply(releaseVisible(user?.email, ACCOUNT_MENU_RELEASE))
  } catch {
    return reply(false)
  }
}
