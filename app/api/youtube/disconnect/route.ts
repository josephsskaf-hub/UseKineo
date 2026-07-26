// app/api/youtube/disconnect/route.ts — Push #317
// Removes the stored YouTube tokens for the current user.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectYouTube } from '@/lib/youtube'
import { getChannel, listUserChannels, revokeChannels } from '@/lib/youtubeChannels'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    }

    // Corpo é OPCIONAL: um POST vazio (todo caller de hoje) desconecta tudo,
    // igual antes. Com { channelId } desconecta só aquele canal.
    let channelId: string | null = null
    try {
      const body = (await req.json()) as { channelId?: string } | null
      channelId = (body?.channelId ?? '').trim() || null
    } catch {
      channelId = null
    }

    if (channelId) {
      const channel = await getChannel(channelId)
      if (!channel || channel.user_id !== user.id) {
        return NextResponse.json({ error: 'Channel not found.' }, { status: 404 })
      }
      await revokeChannels({ userId: user.id, channelId })
      // O canal legado (profiles.youtube_tokens) só cai junto quando não sobrou
      // nenhum outro canal ativo — senão o usuário perderia o upload manual dos
      // canais que ele NÃO pediu para remover.
      const remaining = await listUserChannels(user.id)
      if (remaining.length === 0) await disconnectYouTube(user.id)
      return NextResponse.json({ ok: true, channelId, remaining: remaining.length })
    }

    await revokeChannels({ userId: user.id })
    await disconnectYouTube(user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[youtube/disconnect]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
