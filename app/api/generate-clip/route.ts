// KINEO-TRES-MODOS-2026-09-11 — MODO CLIPE: "só cria as imagens do que eu descrevi".
//
// Ordem do fundador (11/09): três modos no Studio — a IA escreve a história;
// você traz a história pronta (verbatim); ou você descreve UMA cena e a casa
// gera só o clipe, sem narrador, sem legenda. Caso que motivou: render
// 802f024e — a pessoa colou um plano de 10 s (Luffy vs. Akainu) e a narradora
// leu o JSON em voz alta por cima de lava.
//
// Contrato (POST): { prompt, seconds?, aspect?, generationId? } →
//   { request_id, model, render_id, seconds, credits }
// Custo: CLIP_CREDITS (5) debitado ANTES do POST ao fal pelo mesmo RPC de todo
// render (debit_video_credits); falha no envio → estorno imediato. O status e a
// entrega ficam em /api/clip-status (persiste o mp4 no nosso bucket, grava a
// linha em `videos`, estorna se o fornecedor falhar).
//
// Fora deste modo, um plano colado no Studio é BARRADO antes de gastar
// (generate-video-cinematic e generate-video-fast: reason shot_spec_detected).
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { debitVideoCredits } from '@/lib/credits/debit'
import { refundRenderCredits } from '@/lib/credits/refund'
import { submitFalQueueOnce, FalQueueSubmitError } from '@/lib/falQueue'
import { writeServerEvent } from '@/lib/serverEvents'
import { buildClipPrompt, CLIP_CREDITS, CLIP_MAX_SECONDS, CLIP_MIN_SECONDS, detectShotSpec } from '@/lib/cinematic/shotSpec'

export const runtime = 'nodejs'
export const maxDuration = 60
export const fetchCache = 'force-no-store'

const SEEDANCE_MODEL = process.env.KINEO_SEEDANCE_SLUG || 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'

type Aspect = '9:16' | '16:9' | '1:1'
function coerceAspect(v: unknown): Aspect {
  return v === '16:9' || v === '1:1' ? v : '9:16'
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  let body: { prompt?: unknown; seconds?: unknown; aspect?: unknown; generationId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (prompt.length < 8) return NextResponse.json({ error: 'Describe the shot you want (at least a few words).' }, { status: 400 })
  if (prompt.length > 6000) return NextResponse.json({ error: 'Prompt is too long.' }, { status: 400 })

  // O plano vira UM prompt em prosa; texto livre também serve (a pessoa pode
  // simplesmente descrever a cena). Segundos: do texto, do body, ou 10.
  const spec = detectShotSpec(prompt)
  const requestedSeconds = typeof body.seconds === 'number' && Number.isFinite(body.seconds) ? body.seconds : spec.seconds
  const seconds = Math.max(CLIP_MIN_SECONDS, Math.min(CLIP_MAX_SECONDS, Math.round(requestedSeconds)))
  const aspect = coerceAspect(body.aspect)
  const finalPrompt = buildClipPrompt({ ...spec, prompt: spec.isShotSpec ? spec.prompt : prompt, seconds }, aspect)

  const renderId = `clip-${randomUUID()}`

  // Saldo: o RPC de débito é a única régua (mesma de todo render). Sem
  // render_jobs, o custo é o que passamos aqui.
  const debit = await debitVideoCredits(supabase, { userId: user.id, renderId, cost: CLIP_CREDITS })
  if (debit.error || debit.data === null) {
    const insufficient = /insufficient|saldo|balance/i.test(debit.error?.message ?? '')
    await writeServerEvent({ name: 'clip_debit_failed', userId: user.id, path: '/api/generate-clip', metadata: { render_id: renderId, cost: CLIP_CREDITS, insufficient, message: (debit.error?.message ?? '').slice(0, 120) } })
    return NextResponse.json(
      { error: insufficient ? `A clip costs ${CLIP_CREDITS} credits. You do not have enough credits.` : 'Could not reserve credits for this clip. Nothing was submitted.', insufficient },
      { status: insufficient ? 402 : 503 },
    )
  }

  const input: Record<string, unknown> = {
    prompt: finalPrompt,
    aspect_ratio: aspect,
    resolution: process.env.KINEO_SEEDANCE_RESOLUTION || '720p',
    duration: String(seconds),
    generate_audio: false,
  }

  let requestId: string
  try {
    requestId = await submitFalQueueOnce(SEEDANCE_MODEL, input)
  } catch (e) {
    const ambiguous = e instanceof FalQueueSubmitError && e.ambiguous
    // Ambíguo = o fal pode ter aceitado sem responder. Não estornar às cegas:
    // o clip-status não vai achar request_id e o sweep de débitos presos cuida.
    if (!ambiguous) await refundRenderCredits(renderId)
    await writeServerEvent({ name: 'clip_submit_failed', userId: user.id, path: '/api/generate-clip', metadata: { render_id: renderId, ambiguous, refunded: !ambiguous } })
    return NextResponse.json({ error: ambiguous ? 'The video provider did not confirm the clip. Please wait a minute before trying again.' : 'The video provider refused the clip. Your credits are back.', refunded: !ambiguous }, { status: 503 })
  }

  // A linha de posse: o /api/clip-status só responde para quem submeteu.
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  await admin.from('events').insert({
    name: 'clip_submitted', user_id: user.id, path: '/api/generate-clip', session_id: renderId,
    metadata: { render_id: renderId, request_id: requestId, model: SEEDANCE_MODEL, seconds, aspect, credits: CLIP_CREDITS, shot_spec: spec.isShotSpec, shot_spec_reason: spec.reason, keys: spec.keys, prompt: finalPrompt.slice(0, 500), topic: prompt.slice(0, 500) },
  })

  return NextResponse.json({ request_id: requestId, model: SEEDANCE_MODEL, render_id: renderId, seconds, aspect, credits: CLIP_CREDITS, balance: debit.data })
}
