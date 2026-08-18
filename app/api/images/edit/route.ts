// KINEO-EDIT-2026-08-18 — "✏️ Edit" (roubado do Higgsfield Relight/Change
// Palette com critério, fundador aprovou): edição por instrução em qualquer
// imagem gerada — "make it sunset", "change the palette to teal", "remove the
// text". FLUX.1 Kontext [pro] (schema conferido HOJE: {prompt, image_url} →
// images[0].url, $0.04/img) → 3 créditos, margem ~74%. Débito idempotente +
// refund + persistência no bucket (lei do storage), igual aos irmãos.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fal } from '@fal-ai/client'
import { randomUUID } from 'crypto'
import { debitVideoCredits } from '@/lib/credits/debit'
import { refundRenderCredits } from '@/lib/credits/refund'
import { persistImage } from '@/lib/imageStore'

export const maxDuration = 60

const ALLOWED_HOST_RE = /^https:\/\/([a-z0-9.-]+\.)?(fal\.media|fal\.run|cqqukkvjjrguayiyjvhh\.supabase\.co)\//i
const EDIT_COST = 3

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
  if (!falKey) return NextResponse.json({ error: 'Provider not configured.' }, { status: 500 })
  fal.config({ credentials: falKey })

  let body: { url?: string; instruction?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const imageUrl = String(body.url ?? '').trim()
  if (!ALLOWED_HOST_RE.test(imageUrl)) {
    return NextResponse.json({ error: 'Invalid image URL.' }, { status: 400 })
  }
  const instruction = String(body.instruction ?? '').trim()
  if (instruction.length < 3 || instruction.length > 500) {
    return NextResponse.json({ error: 'Describe the edit (3–500 characters).' }, { status: 400 })
  }

  const renderId = `imgedit-${randomUUID()}`
  const debit = await debitVideoCredits(supabase, { userId: user.id, renderId, cost: EDIT_COST })
  if (debit.error || debit.data === null) {
    return NextResponse.json({ error: 'Not enough credits.', code: 'credits' }, { status: 402 })
  }

  try {
    const result = (await fal.subscribe('fal-ai/flux-pro/kontext', {
      input: { prompt: instruction, image_url: imageUrl, output_format: 'png' },
    })) as { data?: { images?: Array<{ url?: string }> }; images?: Array<{ url?: string }> }
    const url = result?.data?.images?.[0]?.url ?? result?.images?.[0]?.url ?? null
    if (!url) throw new Error('no image url in provider response')
    const stored = await persistImage({ userId: user.id, prompt: `[edit] ${instruction}`, model: 'kontext', sourceUrl: url })
    console.log(`[images] edit user=${user.id.slice(0, 8)} ok persisted=${!!stored.id}`)
    return NextResponse.json({ url: stored.url, id: stored.id })
  } catch (e) {
    console.error('[images] edit failed — refunding:', e instanceof Error ? e.message : String(e))
    await refundRenderCredits(renderId).catch(() => {})
    return NextResponse.json({ error: 'Edit failed. Your credits were refunded — try again.' }, { status: 502 })
  }
}
