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
import { persistUpscale } from '@/lib/imageStore'
// KINEO-MODERACAO-2026-09-25 — a revisão de 25/09 achou esta porta fora da régua: qualquer arquivo do nosso storage (de
// outra conta, de outro bucket) ia ao ESRGAN e a cópia 2x era guardada, inclusive as imagens geradas antes da porta de
// 25/09. Agora: origem só da pasta images/<uid>/ da própria conta (ou URL do fal — o fallback de persistência devolve a
// do fal e não há linha para amarrar ao dono); origem conferida ANTES de cobrar; a cópia 2x, ANTES de guardar (barrada =
// estorno, nada guardado). Falha fechada.
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'

export const maxDuration = 60

// KINEO-AUDIT-ENV-2026-08-18: host do storage derivado do env, nao hardcoded.
const SUPA_HOST = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host.replace(/\./g, '\\.') } catch { return 'supabase\\.co' } })()
const FAL_HOST_RE = /^https:\/\/([a-z0-9.-]+\.)?(fal\.media|fal\.run)\//i
// Só o que lib/imageStore grava para ESTA conta (bucket renders, images/<uid>/<arquivo>) — 31/31 linhas de `images`
// casam com este formato (conferido no banco em 25/09).
function isOwnStoredImage(url: string, userId: string): boolean {
  const uid = userId.replace(/[^a-zA-Z0-9-]/g, '')
  return new RegExp(`^https://${SUPA_HOST}/storage/v1/object/public/renders/images/${uid}/[A-Za-z0-9_-][A-Za-z0-9._-]*$`).test(url)
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

  let body: { url?: string; id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const imageUrl = String(body.url ?? '').trim()
  const fromFal = FAL_HOST_RE.test(imageUrl)
  if (!fromFal && !isOwnStoredImage(imageUrl, user.id)) {
    return NextResponse.json({ error: 'Invalid image URL.' }, { status: 400 })
  }
  const imageId = typeof body.id === 'string' ? body.id : null

  const safety = await moderateContent({ surface: 'images_upscale', stage: 'input', userId: user.id, text: null, imageUrls: [imageUrl], meta: { model: 'esrgan', source: fromFal ? 'fal' : 'own', image_id: imageId } })
  if (!safety.ok) {
    return NextResponse.json({ error: moderationRefusalMessage(safety.reason), code: safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}` }, { status: moderationRefusalStatus(safety.reason) })
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
    // A cópia 2x passa pela mesma régua ANTES de ir para o nosso bucket: barrada, estorna e não guarda.
    const outputCheck = await moderateContent({ surface: 'images_upscale', stage: 'output', userId: user.id, text: null, imageUrls: [url], meta: { model: 'esrgan', source_url: imageUrl, image_id: imageId } })
    if (!outputCheck.ok) {
      await refundRenderCredits(renderId).catch(() => {})
      return NextResponse.json({ error: moderationRefusalMessage(outputCheck.reason), code: outputCheck.reason === 'blocked' ? 'moderation' : `moderation_${outputCheck.reason}` }, { status: moderationRefusalStatus(outputCheck.reason) })
    }
    // KINEO-IMAGES-STORE-2026-08-17 — persiste o upscale no nosso bucket e
    // grava upscaled_url na linha da galeria (quando o client manda o id).
    const finalUrl = await persistUpscale({ userId: user.id, imageId, sourceUrl: url })
    console.log(`[images] upscale user=${user.id.slice(0, 8)} ok`)
    return NextResponse.json({ url: finalUrl })
  } catch (e) {
    console.error('[images] upscale failed — refunding:', e instanceof Error ? e.message : String(e))
    await refundRenderCredits(renderId).catch(() => {})
    return NextResponse.json(
      { error: 'Upscale failed. Your credit was refunded — try again.' },
      { status: 502 },
    )
  }
}
