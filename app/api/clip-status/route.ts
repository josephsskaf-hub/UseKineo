// KINEO-TRES-MODOS-2026-09-11 — status e entrega do MODO CLIPE.
//
// GET /api/clip-status?render_id=clip-… → { status: 'pending'|'processing'|'done'|'failed', video_url }
// Posse: só responde a quem tem o evento clip_submitted daquele render_id.
// Ao concluir: o mp4 do fal é copiado para o NOSSO bucket (URL do fal expira —
// "fallback silencioso vaza no caso caro"), a linha em `videos` nasce UMA vez
// (quality_mode 'clip', credits_used = CLIP_CREDITS) e o evento clip_completed
// é gravado. Falha do fornecedor → estorno pelo RPC + clip_failed.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'
import { createClient } from '@/lib/supabase/server'
import { refundRenderCredits } from '@/lib/credits/refund'
import { persistRenderAssets } from '@/lib/renderAssets'
import { CLIP_CREDITS } from '@/lib/cinematic/shotSpec'

export const runtime = 'nodejs'
export const maxDuration = 60
export const fetchCache = 'force-no-store'

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const renderId = (req.nextUrl.searchParams.get('render_id') ?? '').trim()
  if (!/^clip-[0-9a-f-]{36}$/.test(renderId)) return NextResponse.json({ error: 'render_id is required.' }, { status: 400 })

  const db = admin()
  const { data: rows } = await db.from('events').select('id, metadata, created_at').eq('name', 'clip_submitted').eq('user_id', user.id).eq('session_id', renderId).limit(1)
  const submitted = rows?.[0]
  const meta = (submitted?.metadata ?? {}) as Record<string, unknown>
  const requestId = typeof meta.request_id === 'string' ? meta.request_id : ''
  const model = typeof meta.model === 'string' ? meta.model : ''
  if (!submitted || !requestId || !model) return NextResponse.json({ error: 'Clip not found.' }, { status: 404 })

  // Já entregue? (idempotente: a linha em videos é a verdade)
  const { data: existing } = await db.from('videos').select('id, video_url, final_video_url, status').eq('user_id', user.id).eq('render_id', renderId).limit(1)
  if (existing?.[0]?.status === 'completed') {
    return NextResponse.json({ status: 'done', video_url: existing[0].final_video_url ?? existing[0].video_url })
  }
  const { data: failedRows } = await db.from('events').select('id').eq('name', 'clip_failed').eq('user_id', user.id).eq('session_id', renderId).limit(1)
  if (failedRows?.[0]) return NextResponse.json({ status: 'failed', video_url: null, error: 'The video provider could not render this clip. Your credits are back.' })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ status: 'processing', video_url: null })
  fal.config({ credentials: falKey })

  let st: { status?: string; request_id?: unknown; error?: unknown }
  try {
    st = (await fal.queue.status(model, { requestId })) as typeof st
  } catch {
    return NextResponse.json({ status: 'processing', video_url: null })
  }
  if (st.status === 'IN_QUEUE') return NextResponse.json({ status: 'pending', video_url: null })
  if (st.status === 'IN_PROGRESS') return NextResponse.json({ status: 'processing', video_url: null })

  const idMatches = st.request_id === requestId
  const jobError = typeof st.error === 'string' && st.error.trim().length > 0
  if ((st.status === 'FAILED' && idMatches) || (st.status === 'COMPLETED' && idMatches && jobError)) {
    const refunded = await refundRenderCredits(renderId)
    await db.from('events').insert({ name: 'clip_failed', user_id: user.id, path: '/api/clip-status', session_id: renderId, metadata: { render_id: renderId, request_id: requestId, refunded, provider_status: st.status } })
    return NextResponse.json({ status: 'failed', video_url: null, error: 'The video provider could not render this clip. Your credits are back.' })
  }
  if (st.status !== 'COMPLETED' || !idMatches) return NextResponse.json({ status: 'processing', video_url: null })

  let providerUrl: string | null = null
  try {
    const result = await fal.queue.result(model, { requestId })
    const data = ((result as { data?: unknown }).data ?? result) as { video?: { url?: string }; output?: { video?: { url?: string } } }
    providerUrl = data?.video?.url ?? data?.output?.video?.url ?? null
  } catch {
    return NextResponse.json({ status: 'processing', video_url: null })
  }
  if (!providerUrl) return NextResponse.json({ status: 'processing', video_url: null })

  // Persistir no nosso bucket ANTES de declarar entregue.
  const persisted = await persistRenderAssets({ userId: user.id, renderId, videoUrl: providerUrl, snapshotUrl: null })
  const finalUrl = persisted.videoUrl
  const seconds = typeof meta.seconds === 'number' ? meta.seconds : 10
  const topic = typeof meta.topic === 'string' ? meta.topic : ''

  const { error: insertError } = await db.from('videos').insert({
    user_id: user.id,
    render_id: renderId,
    status: 'completed',
    quality_mode: 'clip',
    duration: seconds,
    credits_used: CLIP_CREDITS,
    topic,
    title: topic.slice(0, 80),
    video_url: finalUrl,
    final_video_url: finalUrl,
    platform: typeof meta.aspect === 'string' && meta.aspect === '16:9' ? 'YouTube' : 'YouTube Shorts',
  })
  if (insertError && !/duplicate|unique/i.test(insertError.message)) {
    console.error('[clip-status] videos insert failed:', insertError.message)
  }
  await db.from('events').insert({ name: 'clip_completed', user_id: user.id, path: '/api/clip-status', session_id: renderId, metadata: { render_id: renderId, request_id: requestId, seconds, persisted: finalUrl !== providerUrl, credits: CLIP_CREDITS } })
  return NextResponse.json({ status: 'done', video_url: finalUrl })
}
