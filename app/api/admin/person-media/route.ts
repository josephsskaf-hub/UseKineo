// KINEO-PERSON-MEDIA-2026-08-25 — o raio-X por pessoa (pedido do fundador:
// "quero abrir um espaço e ver TODOS os vídeos que aquele cliente já fez,
// independente do tempo... pra ter noção de onde estão indo os 25 créditos
// do trial").
//
// A cegueira que isto conserta: o painel mostrava CONTAGENS ("0 vídeos") e o
// fundador precisava abrir o banco na mão para ver O QUE a pessoa produziu.
// Agora um clique devolve a obra inteira: cada vídeo com link assistível,
// motor real (quality do banco — selo honesto), status e data; e as entregas
// que NUNCA viram linha em `videos` (o ponto cego medido no #295: imagens,
// áudios e animações — 1.801 entregas invisíveis para 14 pessoas).
//
// Gate de acesso: idêntico a todo /api/admin/* — sessão + allowlist.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email?.toLowerCase() ?? '')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const email = (url.searchParams.get('email') ?? '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })

    const { data: prof } = await admin
      .from('profiles')
      .select('id, video_credits, trial_credits_granted, trial_credits_used, plan, created_at')
      .eq('email', email)
      .maybeSingle()
    if (!prof) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const uid = prof.id as string

    // TODOS os vídeos, sem janela de tempo — é o pedido literal. 200 de teto
    // por sanidade de payload; ninguém no funil atual chega perto.
    const [vids, imgs, auds, animates, guardBlocks] = await Promise.all([
      admin
        .from('videos')
        .select('id, video_url, thumbnail_url, topic, quality_mode, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(200),
      admin.from('images').select('id, created_at').eq('user_id', uid).limit(500),
      admin.from('audios').select('id, created_at').eq('user_id', uid).limit(500),
      admin
        .from('events')
        .select('session_id, created_at')
        .eq('user_id', uid)
        .eq('name', 'animate_job_settled')
        .contains('metadata', { outcome: 'delivered' })
        .limit(500),
      admin
        .from('events')
        .select('created_at, metadata')
        .eq('user_id', uid)
        .eq('name', 'narration_guard_blocked')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const animateSessions = new Set(
      (animates.data ?? []).map((r) => (r as { session_id?: string | null }).session_id).filter(Boolean),
    )

    return NextResponse.json({
      email,
      credits: prof.video_credits ?? null,
      plan: prof.plan ?? null,
      trial: typeof prof.trial_credits_granted === 'number' && prof.trial_credits_granted > 0
        ? { granted: prof.trial_credits_granted, used: prof.trial_credits_used ?? 0 }
        : null,
      signup_at: prof.created_at ?? null,
      videos: (vids.data ?? []).map((v) => ({
        id: v.id,
        url: v.video_url ?? null,
        thumb: v.thumbnail_url ?? null,
        topic: typeof v.topic === 'string' ? v.topic.slice(0, 120) : null,
        quality: v.quality_mode ?? null,
        status: v.status ?? null,
        created_at: v.created_at,
      })),
      images_total: (imgs.data ?? []).length,
      audios_total: (auds.data ?? []).length,
      animations_delivered: animateSessions.size,
      guard_blocks: (guardBlocks.data ?? []).map((g) => ({
        at: g.created_at,
        detail: g.metadata ?? null,
      })),
    })
  } catch (e) {
    console.error('[admin/person-media] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
