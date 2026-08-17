// KINEO-HOLLYWOOD-RETRY-2026-08-16 — re-submete UMA cena Hollywood que falhou
// no fornecedor (fal). Parte do conserto "34s em vez de 60s" flagrado pelo
// fundador: cenas dropadas em silêncio agora ganham UMA segunda chance antes
// de o vídeo compor curto. Sem cobrança extra: a falha é do fornecedor, o
// retry é cortesia da casa (o render já foi pago).
// Chamado pelo GenerateClient quando o polling termina com cenas 'failed'.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fal } from '@fal-ai/client'

import { HOLLYWOOD_MODELS, KLING3_I2V_MODEL } from '@/lib/hollywood/router'

// Fonte única de modelos: o router do Hollywood.
const KLING3_I2V = KLING3_I2V_MODEL
const KLING3_T2V = HOLLYWOOD_MODELS.dialogue
const ALLOWED = new Set<string>([KLING3_I2V, HOLLYWOOD_MODELS.dialogue, HOLLYWOOD_MODELS.cinematic, HOLLYWOOD_MODELS.support])

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
  if (!falKey) return NextResponse.json({ error: 'Provider not configured' }, { status: 500 })
  fal.config({ credentials: falKey })

  let body: { prompt?: string; anchorUrl?: string | null; seconds?: number; model?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const prompt = String(body.prompt ?? '').trim()
  if (prompt.length < 20 || prompt.length > 4000) {
    return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
  }
  const anchorUrl = typeof body.anchorUrl === 'string' && body.anchorUrl.startsWith('https://') ? body.anchorUrl : null
  const seconds = Math.max(3, Math.min(15, Math.round(Number(body.seconds) || 10)))
  const model = anchorUrl ? KLING3_I2V : (ALLOWED.has(String(body.model)) ? String(body.model) : KLING3_T2V)

  // Input idêntico ao buildFalInput dos branches Kling 3 do route principal.
  const input: Record<string, unknown> = anchorUrl
    ? { image_url: anchorUrl, prompt, duration: String(seconds), generate_audio: true }
    : {
        prompt,
        duration: seconds <= 6 ? '5' : '10',
        aspect_ratio: '9:16',
        generate_audio: true,
        negative_prompt:
          'cartoon, anime, illustration, 3d render, blur, distort, low quality, watermark, text, logo, caption, chinese text, foreign text, on-screen text, readable signs, subtitles, captions, phone screen with text',
      }

  try {
    const { request_id } = await fal.queue.submit(model, { input })
    if (!request_id) throw new Error('no request id')
    console.log(`[retry-hollywood-scene] user=${user.id.slice(0, 8)} model=${model} resubmitted → ${request_id}`)
    return NextResponse.json({ requestId: request_id, model })
  } catch (e) {
    console.error('[retry-hollywood-scene] submit failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Retry submit failed' }, { status: 502 })
  }
}
