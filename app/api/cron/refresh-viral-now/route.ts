// Compatibility health check for the former Viral Now persistence cron.
//
// Viral Now has used the deterministic catalogue in lib/viralTopics since
// PUSH #337. The public API and UI no longer read viral_now_topics, so writing
// a second topic pool to Supabase was both redundant and a source of failures.
import { NextRequest, NextResponse } from 'next/server'
import { getViralNowTopics } from '@/lib/viralTopics'

export const dynamic = 'force-dynamic'
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

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const topics = getViralNowTopics()

    return NextResponse.json({
      ok: true,
      source: 'deterministic_catalogue',
      count: topics.length,
      persistence: 'disabled',
    })
  } catch (err) {
    console.error('[refresh-viral-now] health check failed:', err)
    return NextResponse.json({ error: 'Viral Now health check failed' }, { status: 500 })
  }
}
