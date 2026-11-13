// KINEO-RECREATE-SEU-VIDEO-1311 [dono 13/11 ~19:55: "recreate pra hoje funcionando em qualquer video que eu quiser"] — 3º passo: gera.
// Seedance 2.5 por vídeo de referência, 480p, sem som gerado. Débito, envio, estorno e idempotência: submitClip (o mesmo do Recreate de
// catálogo). O servidor relê o vídeo (nunca confia na conferência da tela), confere as fotos (só da própria conta) e o prompt (cita @Video1
// e cada foto). Recusa do motor (inclusive o rosto real que ele bloqueia) = estorno automático e code 'engine_refused'.
import { NextRequest, NextResponse } from 'next/server'
import { clipsAdmin, loadClipAccount } from '@/lib/clips/clipServer'
import { submitClip } from '@/lib/clips/clipFlow'
import { ownedClipImageUrl } from '@/lib/clips/clipCatalog'
import { isPayingPlan } from '@/app/api/admin/_shared/mrr'
import { RECREATE_HEADERS } from '@/lib/recreate/server'
import { lerVideoDoCliente, seuVideoSession, seuVideoSubmitDeps } from '@/lib/recreate/seuVideoServer'
import { entradaSeedance25, recusaDoMotor, SEEDANCE25_MODEL, SEU_VIDEO_LIMITES, SEU_VIDEO_VERSAO, validarPrompt } from '@/lib/recreate/seuVideo'
import type { RecreatePlan } from '@/lib/recreate/generation'
import { writeServerEvent } from '@/lib/serverEvents'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60
export const runtime = 'nodejs'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: RECREATE_HEADERS })

export async function POST(req: NextRequest) {
  const { supabase, user } = await seuVideoSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return json({ error: 'Invalid origin.' }, 403)
  let raw: Record<string, unknown>
  try { raw = await req.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  const refuse = async (code: string, error: string, status = 400) => {
    await writeServerEvent({ name: 'recreate_seu_video_refused', userId: user.id, path: '/api/recreate/seu-video', metadata: { versao: SEU_VIDEO_VERSAO, code, stage: 'submit' } }).catch(() => false)
    return json({ error, code }, status)
  }
  if (raw.consent !== true) return refuse('consent', 'Confirm you have permission to use this video and these photos. Nothing was charged.')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!Array.isArray(raw.photos) || raw.photos.length < 1 || raw.photos.length > SEU_VIDEO_LIMITES.maxFotos) return refuse('photos', 'Add 1 to 3 photos. Nothing was charged.')
  const photos: string[] = []
  for (const value of raw.photos) {
    const url = typeof value === 'string' ? ownedClipImageUrl(value, user.id, supabaseUrl) : null
    if (!url) return refuse('photos', 'Upload photos to your own account before continuing. Nothing was charged.', 403)
    photos.push(url)
  }
  const pr = validarPrompt(raw.prompt, photos.length)
  if (!pr.ok) return refuse('prompt', pr.error)
  const admin = clipsAdmin()
  const account = admin ? await loadClipAccount(supabase, user) : null
  if (!admin || !account) return json({ error: 'Could not start your video. Nothing was charged.' }, 503)
  const v = await lerVideoDoCliente(admin, user.id, raw.video_path)
  if (!v.ok) return refuse(v.code, v.error, 422)
  if (v.creditos === null) return refuse('duration', 'Choose a video between 2 and 15 seconds. Nothing was charged.', 422)
  if (v.gerados > 10 && !isPayingPlan(account.plan)) return refuse('plan', 'Videos longer than 10 seconds are part of the paid plans. Nothing was charged.', 402)
  const input = entradaSeedance25({ prompt: pr.prompt, fotos: photos, videoUrl: v.url, gerados: v.gerados, proporcao: v.proporcao })
  const plan: RecreatePlan = { body: { engine: 'h3', seconds: v.gerados, aspect: null, prompt: pr.prompt, imageUrl: photos[0] }, model: SEEDANCE25_MODEL, credits: v.creditos, falUsd: v.falUsd, photos, input }
  const key = req.headers.get('idempotency-key')?.trim() ?? ''
  try {
    const result = await submitClip(seuVideoSubmitDeps(admin, supabase, account), { userId: user.id, idempotencyKey: key, body: plan.body, recreatePlan: plan })
    if (!result.ok) {
      if (result.code === 'credits' || result.code === 'debit_failed') {
        const balance = result.balance ?? (await loadClipAccount(supabase, user))?.balance
        if (balance !== undefined && plan.credits > balance) return json({ error: `You need ${plan.credits - balance} more credits.`, code: 'credits', shortfall: plan.credits - balance, plans: '/pricing' }, result.status)
      }
      const motor = recusaDoMotor(result.code, result.clip?.credits_refunded ?? 0)
      if (motor) return json({ error: motor, code: 'engine_refused' }, result.status)
      return json({ error: result.code === 'idempotency_conflict' ? 'This request is already reserved. Check your videos before trying again.' : 'Could not start this video. Check your photos, plan and balance, then retry.', code: result.code }, result.status)
    }
    if (!result.replay) await writeServerEvent({ name: 'recreate_seu_video_started', userId: user.id, path: '/api/recreate/seu-video', metadata: { versao: SEU_VIDEO_VERSAO, clip_id: result.clip.id, model: SEEDANCE25_MODEL, video_seconds: Math.round(v.meta.segundos * 100) / 100, fps: Math.round(v.meta.fps), generated_seconds: v.gerados, aspect_ratio: v.proporcao, photos: photos.length, credits: plan.credits, fal_usd: plan.falUsd, prompt_edited: raw.prompt_edited === true } }).catch(() => false)
    return json({ clip: { id: result.clip.id, status: result.clip.status }, replay: result.replay }, result.status)
  } catch {
    return json({ error: 'Could not confirm this request. Keep this page open and retry with the same request key.' }, 503)
  }
}
