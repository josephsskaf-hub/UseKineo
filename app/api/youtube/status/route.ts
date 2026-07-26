// app/api/youtube/status/route.ts — Push #317
// Returns whether the current user has a connected YouTube account.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadYouTubeTokens } from '@/lib/youtube'
import { listUserChannels, toPublicChannel } from '@/lib/youtubeChannels'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ connected: false, channels: [] }, { status: 401 })
    }

    const tokens = await loadYouTubeTokens(user.id)

    // KINEO-AUTOPILOT — `connected` continua significando exatamente o que
    // significava (canal legado presente), para nenhum client atual quebrar.
    // `channels` é aditivo e NUNCA carrega token: toPublicChannel filtra.
    const channels = (await listUserChannels(user.id)).map(toPublicChannel)

    return NextResponse.json({
      connected: !!tokens || channels.length > 0,
      channels,
    })
  } catch (err) {
    console.error('[youtube/status]', err)
    return NextResponse.json({ connected: false, channels: [] })
  }
}
