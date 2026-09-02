// app/api/youtube/analytics/route.ts — Push #317
// Returns channel stats + recent video analytics for the connected YouTube account.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  loadYouTubeTokens,
  getValidAccessToken,
  saveYouTubeTokens,
  fetchChannelStats,
  fetchRecentVideoAnalytics,
} from '@/lib/youtube'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    }

    const tokens = await loadYouTubeTokens(user.id)
    if (!tokens) {
      return NextResponse.json({ error: 'YouTube not connected.' }, { status: 403 })
    }

    const { accessToken, updatedTokens } = await getValidAccessToken(tokens)
    if (updatedTokens) {
      await saveYouTubeTokens(user.id, updatedTokens)
    }

    const [channelStats, recentVideos] = await Promise.all([
      fetchChannelStats(accessToken),
      fetchRecentVideoAnalytics(accessToken, 10),
    ])

    return NextResponse.json({ channelStats, recentVideos })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[youtube/analytics] error:', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
