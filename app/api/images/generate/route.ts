// KINEO-IMAGES-2026-08-17 — [STAGE] Kineo Images: texto→imagem multi-motor.
// Aprovacao do fundador: "implantar tudo que for facil pra hoje, modo stage".
// Mesma arquitetura multi-motor do video: FLUX Schnell (1cr, rascunho
// instantaneo), FLUX Dev (2cr, nitido — o MESMO modelo que ja gera as ancoras
// do Hollywood em producao) e Recraft V3 (4cr, premium com TEXTO PERFEITO —
// o rei de thumbnail; schema oficial conferido no llms.txt do fal hoje).
// Debito idempotente por renderId + refund automatico se o fornecedor falhar.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fal } from '@fal-ai/client'
import { randomUUID } from 'crypto'
import { debitVideoCredits } from '@/lib/credits/debit'
import { refundRenderCredits } from '@/lib/credits/refund'

export const maxDuration = 60

type ImgModelKey = 'schnell' | 'dev' | 'recraft' | 'nanobanana' | 'seedream' | 'grok'
type ImgSize = 'square_hd' | 'portrait_16_9' | 'landscape_16_9'

const MODELS: Record<ImgModelKey, { slug: string; cost: number; input: (prompt: string, size: ImgSize) => Record<string, unknown> }> = {
  schnell: {
    slug: 'fal-ai/flux/schnell',
    cost: 1,
    input: (prompt, size) => ({ prompt, image_size: size, num_inference_steps: 4, enable_safety_checker: true }),
  },
  dev: {
    slug: 'fal-ai/flux/dev',
    cost: 2,
    input: (prompt, size) => ({ prompt, image_size: size, num_inference_steps: 28, enable_safety_checker: true }),
  },
  recraft: {
    slug: 'fal-ai/recraft/v3/text-to-image',
    cost: 4,
    input: (prompt, size) => ({ prompt, image_size: size }),
  },
  // KINEO-IMAGES-TOP-2026-08-17 — os 3 chefoes pedidos pelo fundador, schemas
  // conferidos hoje no llms.txt (param de aspecto DIFERE por modelo):
  // Nano Banana Pro \$0.15/img → 5cr; Seedream 5.0 Pro \$0.0675 → 3cr; Grok
  // Imagine 2.0 → 3cr. nano/grok usam aspect_ratio; seedream usa image_size.
  nanobanana: {
    slug: 'fal-ai/nano-banana-pro',
    cost: 5,
    input: (prompt, size) => ({ prompt, aspect_ratio: size === 'square_hd' ? '1:1' : size === 'landscape_16_9' ? '16:9' : '9:16' }),
  },
  seedream: {
    slug: 'bytedance/seedream/v5/pro/text-to-image',
    cost: 3,
    input: (prompt, size) => ({ prompt, image_size: size }),
  },
  grok: {
    slug: 'xai/grok-imagine-image/v2.0/text-to-image',
    cost: 3,
    input: (prompt, size) => ({ prompt, aspect_ratio: size === 'square_hd' ? '1:1' : size === 'landscape_16_9' ? '16:9' : '9:16' }),
  },
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
  if (!falKey) return NextResponse.json({ error: 'Provider not configured.' }, { status: 500 })
  fal.config({ credentials: falKey })

  let body: { prompt?: string; model?: string; size?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const prompt = String(body.prompt ?? '').trim()
  if (prompt.length < 3 || prompt.length > 2000) {
    return NextResponse.json({ error: 'Describe your image (3–2000 characters).' }, { status: 400 })
  }
  const modelKey: ImgModelKey = ['schnell', 'recraft', 'nanobanana', 'seedream', 'grok'].includes(String(body.model)) ? (body.model as ImgModelKey) : 'dev'
  const size: ImgSize =
    body.size === 'square_hd' || body.size === 'landscape_16_9' ? body.size : 'portrait_16_9'
  const model = MODELS[modelKey]

  // Débito upfront, idempotente por renderId; falha do fornecedor estorna.
  const renderId = `image-${randomUUID()}`
  const debit = await debitVideoCredits(supabase, { userId: user.id, renderId, cost: model.cost })
  if (debit.error || debit.data === null) {
    return NextResponse.json({ error: 'Not enough credits.', code: 'credits' }, { status: 402 })
  }

  try {
    const result = (await fal.subscribe(model.slug, { input: model.input(prompt, size) })) as {
      data?: { images?: Array<{ url?: string }>; image?: { url?: string } }
      images?: Array<{ url?: string }>
      image?: { url?: string }
    }
    const url =
      result?.data?.images?.[0]?.url ??
      result?.images?.[0]?.url ??
      result?.data?.image?.url ??
      result?.image?.url ??
      null
    if (!url) throw new Error('no image url in provider response')
    console.log(`[images] user=${user.id.slice(0, 8)} model=${modelKey} cost=${model.cost} ok`)
    return NextResponse.json({ url, model: modelKey, balance: debit.data - 0 })
  } catch (e) {
    console.error('[images] provider failed — refunding:', e instanceof Error ? e.message : String(e))
    await refundRenderCredits(renderId).catch(() => {})
    return NextResponse.json(
      { error: 'Image generation failed. Your credits were refunded — try again.' },
      { status: 502 },
    )
  }
}
