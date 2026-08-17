// KINEO-IMAGES-2026-08-17 — [STAGE] Upscale (ESRGAN via fal, schema conferido
// hoje no llms.txt): 1 credito, 2x de resolucao. So aceita URLs do fal ou do
// nosso storage (nunca upscale de imagem arbitraria da internet — custo e
// abuso). Debito idempotente + refund em falha, igual ao generate.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fal } from '@fal-ai/client'
import { randomUUID } from 'crypto'
import { debitVideoCredits } from '@/lib/credits/debit'
import { refundRenderCredits } from '@/lib/credits/refund'

export const maxDuration = 60

const ALLOWED_HOST_RE = /^https:\/\/([a-z0-9.-]+\.)?(fal\.media|fal\.run|cqqukkvjjrguayiyjvhh\.supabase\.co)\//i

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
  if (!falKey) return NextResponse.json({ error: 'Provider not configured.' }, { status: 500 })
  fal.config({ credentials: falKey })

  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const imageUrl = String(body.url ?? '').trim()
  if (!ALLOWED_HOST_RE.test(imageUrl)) {
    return NextResponse.json({ error: 'Invalid image URL.' }, { status: 400 })
  }

  const renderId = `upscale-${randomUUID()}`
  const debit = await debitVideoCredits(supabase, { userId: user.id, renderId, cost: 1 })
  if (debit.error || debit.data === null) {
    return NextResponse.json({ error: 'Not enough credits.', code: 'credits' }, { status: 402 })
  }

  try {
    const result = (await fal.subscribe('fal-ai/esrgan', { input: { image_url: imageUrl, scale: 2 } })) as {
      data?: { image?: { url?: string } }
      image?: { url?: string }
    }
    const url = result?.data?.image?.url ?? result?.image?.url ?? null
    if (!url) throw new Error('no image url in provider response')
    console.log(`[images] upscale user=${user.id.slice(0, 8)} ok`)
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[images] upscale failed — refunding:', e instanceof Error ? e.message : String(e))
    await refundRenderCredits(renderId).catch(() => {})
    return NextResponse.json(
      { error: 'Upscale failed. Your credit was refunded — try again.' },
      { status: 502 },
    )
  }
}
