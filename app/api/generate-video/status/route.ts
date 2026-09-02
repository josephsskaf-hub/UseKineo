import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRunwayTask, type RunwayTaskState } from '@/lib/runway'
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

export const maxDuration = 30

// Defensive: never let an image URL leak through as a "clip" — push #009
// shipped a regression that did exactly that, push #010 fixed the classifier,
// and this guard makes sure any future regression fails loudly.
function looksLikeVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$|&)/.test(lower)) return false
  return true
}

function progressFromTask(t: RunwayTaskState): number {
  if (t.status === 'SUCCEEDED') return 1
  if (t.status === 'FAILED' || t.status === 'CANCELLED') return 1
  if (typeof t.progress === 'number') return Math.max(0, Math.min(1, t.progress))
  if (t.status === 'RUNNING') return 0.4
  return 0.1
}

export async function GET(req: NextRequest) {
  try {
    if (!process.env.RUNWAY_API_KEY) {
      return NextResponse.json(
        { error: 'Video service is not configured.' },
        { status: 500 }
      )
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    }

    const tasksParam = req.nextUrl.searchParams.get('tasks') ?? ''
    const ids = tasksParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing tasks parameter.' }, { status: 400 })
    }
    if (ids.length > 8) {
      return NextResponse.json({ error: 'Too many tasks requested.' }, { status: 400 })
    }

    const results: RunwayTaskState[] = await Promise.all(
      ids.map(async (id) => {
        try {
          return await getRunwayTask(id)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          return {
            id,
            status: 'FAILED',
            progress: null,
            videoUrl: null,
            failure: msg,
          }
        }
      })
    )

    const total = results.length
    const allDone = results.every(
      (r) => r.status === 'SUCCEEDED' || r.status === 'FAILED' || r.status === 'CANCELLED'
    )

    if (!allDone) {
      const sum = results.reduce((acc, r) => acc + progressFromTask(r), 0)
      const progress = Math.min(99, Math.round((sum / total) * 100))
      return NextResponse.json({
        phase: 'generating',
        progress,
        succeeded: results.filter((r) => r.status === 'SUCCEEDED').length,
        total,
        tasks: results,
      })
    }

    // All Runway tasks have terminated. Decide between clips_ready and failed.
    const playable = results
      .filter((r) => r.status === 'SUCCEEDED' && r.videoUrl && looksLikeVideoUrl(r.videoUrl))
      .map((r) => r.videoUrl as string)

    if (playable.length === 0) {
      const firstFailure = results.find((r) => r.failure)?.failure
      return NextResponse.json({
        phase: 'failed',
        error: firstFailure || 'No playable clips were produced.',
        total,
        tasks: results,
      })
    }

    return NextResponse.json({
      phase: 'clips_ready',
      clip_urls: playable,
      total,
      tasks: results,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[generate-video/status] unexpected error:', msg)
    return NextResponse.json(
      { error: 'Status lookup failed. Please retry.' },
      { status: 500 }
    )
  }
}
