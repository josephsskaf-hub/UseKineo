// KINEO-GESTURE-2026-07-10 — gesture-clip poller (Feature 3).
// Two stages, one endpoint:
//   stage=animate  → polls the Kling i2v job; when done, AUTO-SUBMITS the
//                    VEED background-removal (matte) job and returns
//                    { stage:'matte', matte_request_id } for the next polls.
//   stage=matte    → polls the matte job; done → transparent WebM URL.
// Failure at ANY stage auto-refunds `gesture-<request_id>` (idempotent RPC —
// repeated polls can never double-refund; same pattern as animate-image).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAvatarJob, checkMatteJob, submitMatteJob } from '@/lib/avatar/veed'
import { refundRenderCredits } from '@/lib/credits/refund'

export const maxDuration = 60
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
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }

    const requestId = (req.nextUrl.searchParams.get('request_id') ?? '').trim()
    if (!requestId) {
      return NextResponse.json({ error: 'request_id is required.' }, { status: 400 })
    }
    const stage = (req.nextUrl.searchParams.get('stage') ?? 'animate').trim()
    const matteId = (req.nextUrl.searchParams.get('matte_id') ?? '').trim()

    async function failWithRefund(msg: string) {
      const creditsRefunded = await refundRenderCredits(`gesture-${requestId}`)
      return NextResponse.json({
        status: 'failed',
        video_url: null,
        creditsRefunded,
        error: creditsRefunded > 0
          ? `${msg} Your ${creditsRefunded} credits were automatically refunded — please try again.`
          : `${msg} Please try again.`,
      })
    }

    // A matte-stage failure means the raw PAID clip was ALREADY produced and
    // handed to the client (raw_video_url below) — only the transparency
    // post-process failed. The matte has no separate credit cost (the 15/25
    // credits bill the whole clip), so DO NOT refund a delivered clip. Recover
    // the raw clip so the user still gets what they paid for, minus transparency.
    async function deliverRawWithoutMatte(msg: string) {
      const raw = await checkAvatarJob(requestId, 'animate')
      return NextResponse.json({
        status: 'done',
        stage: 'matte',
        video_url: null,
        raw_video_url: raw.videoUrl ?? null,
        matte_failed: true,
        creditsRefunded: 0,
        error: `${msg} Your clip is ready to download without the transparent background — your credits were not refunded because the clip was delivered.`,
      })
    }

    if (stage === 'matte' && matteId) {
      const matte = await checkMatteJob(matteId)
      if (matte.status === 'failed') return deliverRawWithoutMatte('Transparency processing failed.')
      if (matte.status === 'done') {
        return NextResponse.json({ status: 'done', stage: 'matte', video_url: matte.videoUrl })
      }
      return NextResponse.json({ status: matte.status, stage: 'matte', matte_request_id: matteId })
    }

    // stage 'animate'
    const anim = await checkAvatarJob(requestId, 'animate')
    // The whole clip failed → nothing was delivered → full refund (preserved).
    if (anim.status === 'failed') return failWithRefund('Clip generation failed.')
    if (anim.status === 'done' && anim.videoUrl) {
      // Auto-advance: submit the matte job so the client just keeps polling.
      const newMatteId = await submitMatteJob(anim.videoUrl)
      if (!newMatteId) {
        // Raw paid clip is ready; only transparency could not START. Deliver the
        // raw clip WITHOUT refunding (no separate matte cost).
        console.warn(`[gesture-clip-status] matte submit failed — delivering raw clip request=${requestId}`)
        return NextResponse.json({
          status: 'done',
          stage: 'matte',
          video_url: null,
          raw_video_url: anim.videoUrl,
          matte_failed: true,
          creditsRefunded: 0,
          error: 'Transparency processing could not start, but your clip is ready to download without the transparent background.',
        })
      }
      console.log(`[gesture-clip-status] animate done → matte submitted request=${requestId} matte=${newMatteId}`)
      return NextResponse.json({
        status: 'processing',
        stage: 'matte',
        matte_request_id: newMatteId,
        // The raw (non-transparent) MP4, in case the user wants both.
        raw_video_url: anim.videoUrl,
      })
    }
    return NextResponse.json({ status: anim.status, stage: 'animate' })
  } catch (err) {
    console.error('[gesture-clip-status] unexpected error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Status check failed.' }, { status: 500 })
  }
}
