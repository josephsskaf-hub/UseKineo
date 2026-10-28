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
import { persistImage, signReferencePhotos } from '@/lib/imageStore'
// KINEO-IMAGENS-FOTO-REFERENCIA-2026-09-29 — com foto de referência (só Nano Banana Pro), o pedido vai ao
// fal-ai/nano-banana-pro/edit com as fotos da PRÓPRIA conta (caminho validado, URL assinada de curta duração) e o mesmo
// custo de hoje. Sem referência, nada muda. A régua mora em lib/imageReference.ts (pura, com guardião).
import { NANO_BANANA_EDIT_SLUG, REFERENCE_SIGNED_URL_SECONDS, buildNanoBananaEditInput, decideReferenceRequest } from '@/lib/imageReference'
import { writeServerEvent } from '@/lib/serverEvents'
// KINEO-ROSTO-QUADRO-CHAVE-2810 — 28/10 04:32 UTC: duas fotos de referência voltaram 502 "Image generation failed" quando a fal
// respondeu 403 (conta trancada por saldo: a fal nem baixou a foto — o log de storage mostra um único GET, o da moderação; o
// último gasto antes foi o clipe Kling das 04:31). A rota só logava err.message ("Forbidden"), nunca o `detail` do corpo, e não
// acordava o alarme de saldo (acordou só às 06:40, no próximo pedido pago que sabia ler). Agora: o texto REAL da fal vai ao log e
// ao evento (limpo), saldo/acesso vira 503 "motor pausado, créditos devolvidos" e dispara alertFalExhausted, como /clips e o filme.
import { alertFalExhausted, falErrorText, looksExhausted } from '@/lib/falAlert' // KINEO-ROSTO-QUADRO-CHAVE-2810
// KINEO-MODERACAO-2026-09-25 — pedidos graves envolvendo menores foram gerados e guardados aqui (03/09 e 17/09, 2 contas
// suspensas em 25/09). Só schnell/dev ligavam o checker do fal, e um dos pedidos passou pelo dev mesmo assim. Agora TODO
// modelo passa por duas portas: o texto antes de cobrar e a imagem pronta antes de guardar. Falha fechada.
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'

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

  let body: { prompt?: string; model?: string; size?: string; reference_paths?: unknown; reference_consent?: unknown }
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

  // Referência: validada ANTES de moderar e de cobrar — só Nano Banana Pro, consentimento do servidor, até 3, só da pasta
  // da própria conta. As URLs que vão à moderação e à fal são assinadas aqui, pelo caminho; nenhuma vem do navegador.
  const refDecision = decideReferenceRequest(body, modelKey, user.id)
  if (!refDecision.ok) return NextResponse.json({ error: refDecision.error, code: refDecision.code }, { status: refDecision.status })
  const referencePaths = refDecision.paths
  let referenceUrls: string[] = []
  if (referencePaths.length > 0) {
    const signed = await signReferencePhotos(referencePaths, REFERENCE_SIGNED_URL_SECONDS)
    if (!signed) return NextResponse.json({ error: 'Reference photo not found — upload it again.', code: 'reference_missing' }, { status: 400 })
    referenceUrls = signed
  }
  const withReference = referenceUrls.length > 0
  const falSlug = withReference ? NANO_BANANA_EDIT_SLUG : model.slug
  const falInput = withReference ? buildNanoBananaEditInput(prompt, size, referenceUrls) : model.input(prompt, size)
  const referenceEvent = (outcome: string, extra: Record<string, unknown> = {}) => withReference // KINEO-ROSTO-QUADRO-CHAVE-2810 — + extra (provider_error/status)
    ? writeServerEvent({ name: 'images_reference_used', userId: user.id, path: '/images', metadata: { count: referenceUrls.length, model: modelKey, outcome, ...extra } }).catch(() => false)
    : Promise.resolve(false)

  const inputCheck = await moderateContent({ surface: 'images', stage: 'input', userId: user.id, text: prompt, imageUrls: referenceUrls, meta: { model: modelKey, reference_count: referenceUrls.length } })
  if (!inputCheck.ok) {
    return NextResponse.json({ error: moderationRefusalMessage(inputCheck.reason), code: inputCheck.reason === 'blocked' ? 'moderation' : `moderation_${inputCheck.reason}` }, { status: moderationRefusalStatus(inputCheck.reason) })
  }

  // Débito upfront, idempotente por renderId; falha do fornecedor estorna.
  const renderId = `image-${randomUUID()}`
  const debit = await debitVideoCredits(supabase, { userId: user.id, renderId, cost: model.cost })
  if (debit.error || debit.data === null) {
    return NextResponse.json({ error: 'Not enough credits.', code: 'credits' }, { status: 402 })
  }

  try {
    const result = (await fal.subscribe(falSlug, { input: falInput })) as {
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
    // A imagem pronta passa pela mesma régua ANTES de ir para o nosso bucket: barrada, não é guardada nem devolvida.
    const outputCheck = await moderateContent({ surface: 'images', stage: 'output', userId: user.id, text: prompt, imageUrls: [url], meta: { model: modelKey, reference_count: referenceUrls.length } })
    if (!outputCheck.ok) {
      await refundRenderCredits(renderId).catch(() => {})
      await referenceEvent('moderation_blocked')
      return NextResponse.json({ error: moderationRefusalMessage(outputCheck.reason), code: outputCheck.reason === 'blocked' ? 'moderation' : `moderation_${outputCheck.reason}` }, { status: moderationRefusalStatus(outputCheck.reason) })
    }
    // KINEO-IMAGES-STORE-2026-08-17 — URL do fal nao e permanente: copia pro
    // nosso bucket + linha na tabela `images` (galeria My Images). Fallback
    // best-effort: se a copia falhar, devolve a URL do fal mesmo.
    const stored = await persistImage({ userId: user.id, prompt, model: modelKey, sourceUrl: url })
    console.log(`[images] user=${user.id.slice(0, 8)} model=${modelKey} cost=${model.cost} refs=${referenceUrls.length} ok persisted=${!!stored.id}`)
    await referenceEvent('delivered')
    return NextResponse.json({ url: stored.url, id: stored.id, model: modelKey, balance: debit.data - 0 })
  } catch (e) {
    // KINEO-ROSTO-QUADRO-CHAVE-2810 — o que a fal DISSE (status + detail), limpo de URL/credencial, no log e no evento; saldo = alarme + 503.
    const falErr = (e && typeof e === 'object' ? e : {}) as { status?: number | null; message?: string; body?: unknown } // KINEO-ROSTO-QUADRO-CHAVE-2810
    const status = typeof falErr.status === 'number' ? falErr.status : null // KINEO-ROSTO-QUADRO-CHAVE-2810
    const detail = falErrorText(falErr).replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>()\]]+/gi, '[url]').replace(/[A-Za-z0-9_+/=:-]{32,}/g, '[redacted]').slice(0, 200) // KINEO-ROSTO-QUADRO-CHAVE-2810
    const exhausted = looksExhausted(falErr) // KINEO-ROSTO-QUADRO-CHAVE-2810
    console.error(`[images] provider failed — refunding: fal ${status ?? '?'} ${detail || (e instanceof Error ? e.message : String(e))}`) // KINEO-ROSTO-QUADRO-CHAVE-2810 — era só e.message ("Forbidden")
    await refundRenderCredits(renderId).catch(() => {})
    if (exhausted) await alertFalExhausted({ source: 'clips', engine: falSlug, context: `images generate http=${status ?? '?'}` }).catch(() => 'error' as const) // KINEO-ROSTO-QUADRO-CHAVE-2810 — mesma fonte 'clips' (um POST pago na fal); o alarme é deduplicado por janela de 6 h
    await referenceEvent('provider_failed', { provider_status: status, provider_error: detail || null, exhausted }) // KINEO-ROSTO-QUADRO-CHAVE-2810
    return NextResponse.json( // KINEO-ROSTO-QUADRO-CHAVE-2810
      exhausted // KINEO-ROSTO-QUADRO-CHAVE-2810
        ? { error: 'The image engine is paused for a few minutes (provider account). Your credits were refunded — please try again shortly.', code: 'provider_paused' } // KINEO-ROSTO-QUADRO-CHAVE-2810
        : { error: 'Image generation failed. Your credits were refunded — try again.', code: 'provider_failed' }, // KINEO-ROSTO-QUADRO-CHAVE-2810
      { status: exhausted ? 503 : 502, headers: exhausted ? { 'Retry-After': '300' } : undefined }, // KINEO-ROSTO-QUADRO-CHAVE-2810
    )
  }
}
