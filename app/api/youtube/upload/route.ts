// app/api/youtube/upload/route.ts — Push #317
// Uploads a rendered video (stored at a public URL) to the user's YouTube channel.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  loadYouTubeTokens,
  getValidAccessToken,
  saveYouTubeTokens,
  uploadVideoToYouTube,
} from '@/lib/youtube'
import { getChannel, getValidChannelAccessToken } from '@/lib/youtubeChannels'
import { buildBrandedYouTubeDescription } from '@/lib/videoDescription'

export const maxDuration = 60

// PUSH #100 — mesma lista canônica usada em compose/status e video-summary.
const PAID_PLANS = new Set([
  'starter', 'starter_trial', 'basic', 'basic_trial',
  'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial',
])

interface UploadBody {
  videoUrl: string
  title?: string
  description?: string
  tags?: string[]
  privacyStatus?: 'public' | 'private' | 'unlisted'
  // KINEO-AUTOPILOT — opcional. Ausente = comportamento antigo (canal único em
  // profiles.youtube_tokens). Presente = publica no canal indicado.
  channelId?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    }

    let body: UploadBody
    try {
      body = (await req.json()) as UploadBody
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    if (!body.videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required.' }, { status: 400 })
    }

    // ── Resolução do token ────────────────────────────────────────────────
    // Sem channelId o caminho é EXATAMENTE o de antes. Com channelId, o dono do
    // canal é conferido contra a sessão: o id do canal vem do corpo da request,
    // então sem esta checagem qualquer usuário logado publicaria no canal alheio.
    const requestedChannelId = (body.channelId ?? '').trim()
    let accessToken: string

    if (requestedChannelId) {
      const channel = await getChannel(requestedChannelId)
      if (!channel || channel.user_id !== user.id || channel.revoked_at) {
        return NextResponse.json({ error: 'Channel not found.' }, { status: 404 })
      }
      const channelToken = await getValidChannelAccessToken(requestedChannelId)
      if (!channelToken) {
        return NextResponse.json(
          { error: 'This channel needs to be reconnected before publishing.' },
          { status: 403 },
        )
      }
      accessToken = channelToken
    } else {
      const tokens = await loadYouTubeTokens(user.id)
      if (!tokens) {
        return NextResponse.json({ error: 'YouTube not connected. Please connect your channel first.' }, { status: 403 })
      }
      // Auto-refresh tokens if needed
      const refreshed = await getValidAccessToken(tokens)
      if (refreshed.updatedTokens) {
        await saveYouTubeTokens(user.id, refreshed.updatedTokens)
      }
      accessToken = refreshed.accessToken
    }

    // PUSH #100 — acquisition loop, ENFORCED SERVER-SIDE. O client mostra a
    // mesma linha no bloco "copie a descrição", mas quem grava no YouTube é
    // aqui: um client que remova o crédito do payload não muda nada. Gate igual
    // ao de video-summary (só plano free leva a linha); best-effort, uma falha
    // de leitura de perfil nunca pode derrubar o upload.
    let isFreePlan = false
    try {
      const { data: planRow } = await supabase
        .from('profiles')
        .select('has_paid, plan')
        .eq('id', user.id)
        .maybeSingle()
      const planName = ((planRow as { plan?: string } | null)?.plan ?? 'free').toLowerCase()
      const isPaid =
        (planRow as { has_paid?: boolean } | null)?.has_paid === true ||
        PAID_PLANS.has(planName)
      isFreePlan = !isPaid
    } catch (e) {
      console.warn('[youtube/upload] plan lookup failed, uploading clean description:',
        e instanceof Error ? e.message : String(e))
    }
    const description = buildBrandedYouTubeDescription(body.description ?? '', { isFreePlan })

    console.log(`[youtube/upload] starting upload for user ${user.id.slice(0, 8)} url=${body.videoUrl.slice(0, 60)} branded=${isFreePlan}`)

    const result = await uploadVideoToYouTube(accessToken, {
      videoUrl: body.videoUrl,
      title: body.title ?? 'My Short',
      description,
      tags: body.tags ?? [],
      privacyStatus: body.privacyStatus ?? 'public',
      madeForKids: false,
    })

    console.log(`[youtube/upload] success: videoId=${result.videoId}`)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[youtube/upload] error:', msg)
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 502 })
  }
}
