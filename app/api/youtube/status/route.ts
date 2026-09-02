// app/api/youtube/status/route.ts — Push #317
// Returns whether the current user has a connected YouTube account.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadYouTubeTokens } from '@/lib/youtube'
import { listUserChannels, toPublicChannel } from '@/lib/youtubeChannels'
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
    // KINEO-YTCONNECT-2026-07-26 — antes isto devolvia 200 {connected:false},
    // que é BYTE A BYTE a resposta de um usuário genuinamente desconectado.
    // As duas situações levam o usuário a ações OPOSTAS ("conecte seu canal" vs
    // "tente de novo daqui a pouco"), e a de erro ainda escondia uma falha de
    // Supabase atrás de uma tela de onboarding perfeitamente normal. Agora o
    // desfecho é distinguível: HTTP 503 + `error`. `connected:false` continua no
    // corpo só para nenhum client antigo quebrar ao ler o campo.
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[youtube/status] check failed:', msg)
    return NextResponse.json(
      { connected: false, channels: [], error: 'check_failed' },
      { status: 503 },
    )
  }
}
