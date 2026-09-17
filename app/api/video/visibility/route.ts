// ═══ KINEO-LACO-VIRAL-2026-09-17 — a pessoa publica a própria página de filme com UM clique, logada ═══
//
// O NÚMERO (30 dias, lido em 17/09): 716 filmes entregues, 1 publicado. A página pública (/v/<id>) só nasce com
// `videos.published_at`, e desde 06/09 quem carimba isso é /api/video/publish — uma rota de LINK ASSINADO para e-mail
// (GET mostra a confirmação, POST com token muda). A tela de filme pronto não tinha como publicar: dizia "Public watch
// links are temporarily paused" e compartilhava o MP4 em privado. Sem página, o "faça o seu" da /v/ não tem plateia:
// 234 sessões e 7 cliques em 30 dias, todas em 1 página.
//
// ESTA ROTA é a decisão explícita de visibilidade para quem está LOGADO e é DONO do filme: JSON, sessão do Supabase,
// compare-and-set idêntico ao da rota assinada, o MESMO evento (`video_published_v1`/`video_unpublished_v1`) com a
// origem. Nada muda sem o clique da pessoa num botão que diz o que acontece. Fundador (17/09): "vai pro 5 laço viral".

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const VISIBILITY_SOURCES = ['done_screen', 'my_videos'] as const
type VisibilitySource = (typeof VISIBILITY_SOURCES)[number]
type VisibilityAction = 'publish' | 'unpublish'

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url).origin) return json({ error: 'bad_origin' }, 403)

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)

  const body = (await req.json().catch(() => ({}))) as { videoId?: unknown; action?: unknown; source?: unknown }
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : ''
  const action: VisibilityAction | null = body.action === 'publish' || body.action === 'unpublish' ? body.action : null
  const source: VisibilitySource = (VISIBILITY_SOURCES as readonly string[]).includes(String(body.source)) ? (body.source as VisibilitySource) : 'done_screen'
  if (!UUID.test(videoId) || !action) return json({ error: 'invalid' }, 400)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return json({ error: 'unavailable' }, 503)
  const admin = createAdminClient(url, key, { auth: { persistSession: false } })

  const { data: row, error } = await admin.from('videos').select('id,user_id,status,published_at').eq('id', videoId).single()
  if (error || !row) return json({ error: 'not_found' }, 404)
  if (row.user_id !== user.id) return json({ error: 'forbidden' }, 403)
  if (action === 'publish' && row.status !== 'completed') return json({ error: 'not_completed' }, 409)

  const undo = action === 'unpublish'
  const changing = undo ? !!row.published_at : !row.published_at
  if (changing) {
    // Compare-and-set: dois cliques concorrentes não emitem dois consentimentos (mesma regra da rota assinada).
    let query = admin.from('videos')
      .update(undo ? { published_at: null, published_via: null } : { published_at: new Date().toISOString(), published_via: source })
      .eq('id', videoId).eq('user_id', user.id)
    query = undo ? query.eq('published_at', row.published_at) : query.is('published_at', null)
    const { data: changed, error: updateError } = await query.select('id,published_at').maybeSingle()
    if (updateError || !changed || (undo ? changed.published_at !== null : !changed.published_at)) return json({ error: 'conflict' }, 409)
    // AWAIT: escrita no fim da rota é await, nunca void (a Vercel congela a função depois da resposta).
    await writeServerEvent({
      name: undo ? 'video_unpublished_v1' : 'video_published_v1',
      userId: user.id,
      path: '/api/video/visibility',
      metadata: { video_id: videoId, source, surface: 'owner_json', version: 'laco_viral_v1' },
    })
  }
  return json({ ok: true, published: !undo, changed: changing, path: `/v/${videoId}` })
}
