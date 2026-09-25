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
// KINEO-MODERACAO-2026-09-25 — a revisão de 25/09 achou esta porta fora da régua: instrução e imagem de origem iam ao
// Kontext sem conferência, e a origem podia ser QUALQUER arquivo do nosso storage (de outra conta, de outro bucket).
// Agora: origem só da pasta images/<uid>/ da própria conta (ou URL do fal — o fallback de persistência de generate/edit/
// upscale devolve a do fal e não há linha para amarrar ao dono); instrução + origem conferidas ANTES de cobrar; a imagem
// pronta, ANTES de guardar (barrada = estorno, nada guardado). Falha fechada.
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'

export const maxDuration = 60

// KINEO-AUDIT-ENV-2026-08-18: host do storage derivado do env, nao hardcoded.
const SUPA_HOST = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host.replace(/\./g, '\\.') } catch { return 'supabase\\.co' } })()
const FAL_HOST_RE = /^https:\/\/([a-z0-9.-]+\.)?(fal\.media|fal\.run)\//i
// Só o que lib/imageStore grava para ESTA conta (bucket renders, images/<uid>/<arquivo>) — 31/31 linhas de `images`
// e 2/2 upscaled_url casam com este formato (conferido no banco em 25/09).
function isOwnStoredImage(url: string, userId: string): boolean {
  const uid = userId.replace(/[^a-zA-Z0-9-]/g, '')
  return new RegExp(`^https://${SUPA_HOST}/storage/v1/object/public/renders/images/${uid}/[A-Za-z0-9_-][A-Za-z0-9._-]*$`).test(url)
}
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
  const fromFal = FAL_HOST_RE.test(imageUrl)
  if (!fromFal && !isOwnStoredImage(imageUrl, user.id)) {
    return NextResponse.json({ error: 'Invalid image URL.' }, { status: 400 })
  }
  const instruction = String(body.instruction ?? '').trim()
  if (instruction.length < 3 || instruction.length > 500) {
    return NextResponse.json({ error: 'Describe the edit (3–500 characters).' }, { status: 400 })
  }

  const safety = await moderateContent({ surface: 'images_edit', stage: 'input', userId: user.id, text: instruction, imageUrls: [imageUrl], meta: { model: 'kontext', source: fromFal ? 'fal' : 'own' } })
  if (!safety.ok) {
    return NextResponse.json({ error: moderationRefusalMessage(safety.reason), code: safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}` }, { status: moderationRefusalStatus(safety.reason) })
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
    // A imagem editada passa pela mesma régua ANTES de ir para o nosso bucket: barrada, estorna e não guarda.
    const outputCheck = await moderateContent({ surface: 'images_edit', stage: 'output', userId: user.id, text: instruction, imageUrls: [url], meta: { model: 'kontext', source_url: imageUrl } })
    if (!outputCheck.ok) {
      await refundRenderCredits(renderId).catch(() => {})
      return NextResponse.json({ error: moderationRefusalMessage(outputCheck.reason), code: outputCheck.reason === 'blocked' ? 'moderation' : `moderation_${outputCheck.reason}` }, { status: moderationRefusalStatus(outputCheck.reason) })
    }
    const stored = await persistImage({ userId: user.id, prompt: `[edit] ${instruction}`, model: 'kontext', sourceUrl: url })
    console.log(`[images] edit user=${user.id.slice(0, 8)} ok persisted=${!!stored.id}`)
    return NextResponse.json({ url: stored.url, id: stored.id })
  } catch (e) {
    console.error('[images] edit failed — refunding:', e instanceof Error ? e.message : String(e))
    await refundRenderCredits(renderId).catch(() => {})
    return NextResponse.json({ error: 'Edit failed. Your credits were refunded — try again.' }, { status: 502 })
  }
}
