// KINEO-CLIPES-2026-09-29 — /api/clips
//   GET  → catálogo que ESTA conta pode apertar (motores, durações reais, formatos, créditos) + "Meus clipes" + saldo
//          (+ KINEO-CLIP-EFEITOS-2026-10-05: `effects`, a galeria de efeitos de 1 clique, vazia fora do interruptor).
//   POST → pede um clipe. A ordem (forma → motor visível → replay → teto → foto → MODERAÇÃO → saldo → linha → DÉBITO →
//          fila da fal → estorno em qualquer falha) é de lib/clips/clipFlow.ts submitClip, executada pelo guardião.
// NÃO usa o prefixo generate-video-* (trava 8.2): o clipe não passa por roteiro, narração, compose nem Creatomate.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitClip } from '@/lib/clips/clipFlow'
import {
  clipCatalogFor,
  clipsAdmin,
  engineAccessFor,
  listClips,
  loadClipAccount,
  lockedClipEnginesFor,
  publicClipsForViewer,
  submitDepsFor,
  toPublicClip,
} from '@/lib/clips/clipServer'
import { CLIP_GUEST_AS_NEW_ACCOUNT, clipsVisible } from '@/lib/clips/clipLaunch'
// KINEO-CLIP-EFEITOS-2026-10-05 — efeitos de 1 clique: o corpo traz só `effect` (chave) + a foto; o servidor resolve o
// resto pelo catálogo (lib/clips/clipEffects.ts) e o pedido segue o MESMO submitClip (moderação, débito, estorno).
import { isInternalEmail } from '@/lib/internalAccounts'
import { writeServerEvent } from '@/lib/serverEvents'
import { clipEffectEventMetadata, clipEffectsVisible, publicClipEffects, resolveClipEffectRequest, wantsClipEffect, type ClipEffect } from '@/lib/clips/clipEffects'
import { homeVariantStamp } from '@/lib/growth/homeClipsFirstServer'
import type { ClipRequestInput } from '@/lib/clips/clipCatalog'
import { CLIP_MEASUREMENT_ENABLED, clipOriginMetadata } from '@/lib/clips/clipMeasurement'
import { isLikelyBot } from '@/lib/requestIdentity'
import { FREE_CLIP_NOTICE_EVENTS, FREE_CLIP_NOTICE_VERSION } from '@/lib/clips/freeClipNotice' // KINEO-AVISO-CLIPE-GRATIS-2026-10-06
// KINEO-ROSTO-NO-CLIPE-2810 — "Put your face in it": o corpo traz só `remix` (id do clipe da casa) + a foto + `consent`; o servidor monta o
// KINEO-ROSTO-NO-CLIPE-2810 — prompt pelo catálogo (lib/clips/faceRemix.ts) e o pedido segue o MESMO submitClip (moderação, débito, estorno).
import { FACE_REMIX_EVENTS, faceRemixEventMetadata, faceRemixVisible, publicFaceRemixes, resolveFaceRemixRequest, wantsFaceRemix, type FaceRemixItem } from '@/lib/clips/faceRemix' // KINEO-ROSTO-NO-CLIPE-2810

export const maxDuration = 60
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Mesmo motivo de app/api/images/route.ts (KINEO-DATA-CACHE-2026-09-02): nenhuma leitura do banco pode ir para o Data Cache.
export const fetchCache = 'force-no-store'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Visitante (o dashboard é público): com o clipe lançado, vê o catálogo de conta nova e só entra no clique de gerar.
    if (!clipsVisible(null)) return NextResponse.json({ error: 'Not found.', engines: [], clips: [] }, { status: 404, headers: NO_STORE })
    const guest = engineAccessFor({ email: null, plan: null, createdAt: CLIP_GUEST_AS_NEW_ACCOUNT ? new Date().toISOString() : null })
    const guestEffects = clipEffectsVisible(false) ? publicClipEffects((engine) => guest(engine).ok) : []
    const guestRemixes = faceRemixVisible(false) ? publicFaceRemixes((engine) => guest(engine).ok) : [] // KINEO-ROSTO-NO-CLIPE-2810
    // KINEO-S25-CLIPES-2026-10-06 — `locked_engines`: o que a conta VÊ mas só usa pagando (card "NEW · paid plans" → planos).
    return NextResponse.json({ engines: clipCatalogFor(guest), locked_engines: lockedClipEnginesFor(guest), effects: guestEffects, face_remixes: guestRemixes, clips: [], balance: null, signed_in: false }, { headers: NO_STORE }) // KINEO-ROSTO-NO-CLIPE-2810
  }
  // Interruptor de lançamento (lib/clips/clipLaunch.ts): antes do "vai" do fundador, só a casa.
  if (!clipsVisible(user.email)) return NextResponse.json({ error: 'Not found.', engines: [], clips: [] }, { status: 404, headers: NO_STORE })
  const account = await loadClipAccount(supabase, user)
  const admin = clipsAdmin()
  if (!account || !admin) {
    return NextResponse.json({ error: 'Could not load your clips right now.', engines: [], clips: [] }, { status: 503, headers: NO_STORE })
  }
  const rows = await listClips(admin, user.id)
  const access = engineAccessFor(account)
  // Galeria de efeitos: só com o interruptor ligado ou para a casa, e só com motores que esta conta pode apertar.
  const effects = clipEffectsVisible(isInternalEmail(user.email)) ? publicClipEffects((engine) => access(engine).ok) : []
  const face_remixes = faceRemixVisible(isInternalEmail(user.email)) ? publicFaceRemixes((engine) => access(engine).ok) : [] // KINEO-ROSTO-NO-CLIPE-2810
  // Falha de leitura não se disfarça de lista vazia (lição do incidente JWT-skew, 28/08).
  if (rows === null) {
    return NextResponse.json(
      { error: 'Could not load your clips right now.', engines: clipCatalogFor(access), locked_engines: lockedClipEnginesFor(access), effects, face_remixes, clips: [], balance: account.balance }, // KINEO-ROSTO-NO-CLIPE-2810
      { status: 503, headers: NO_STORE },
    )
  }
  return NextResponse.json(
    { engines: clipCatalogFor(access), locked_engines: lockedClipEnginesFor(access), effects, face_remixes, clips: await publicClipsForViewer(admin, user.id, rows), balance: account.balance }, // KINEO-ROSTO-NO-CLIPE-2810
    { headers: NO_STORE },
  )
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401, headers: NO_STORE })
  if (!clipsVisible(user.email)) return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: NO_STORE })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: NO_STORE })
  }
  const headerKey = req.headers.get('idempotency-key')?.trim() ?? ''
  const bodyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : ''
  const idempotencyKey = headerKey || bodyKey

  // KINEO-CLIP-EFEITOS-2026-10-05 — pedido de EFEITO: interruptor → chave → foto, ANTES de ler conta ou saldo. Fora do
  // interruptor, conta de fora recebe 404 e nada é lido nem cobrado. Com efeito, o pedido é o do catálogo: o prompt,
  // o motor, a duração e o formato que vierem do navegador são ignorados (só a foto passa, e a posse dela é conferida
  // no submitClip como no clipe livre).
  let effect: ClipEffect | null = null
  let clipBody: ClipRequestInput = {
    engine: body.engine,
    seconds: body.seconds,
    aspect: body.aspect,
    prompt: body.prompt,
    imageUrl: body.image_url ?? body.imageUrl,
  }
  if (wantsClipEffect(body.effect)) {
    const resolved = resolveClipEffectRequest(body.effect, {
      visible: clipEffectsVisible(isInternalEmail(user.email)),
      imageUrl: body.image_url ?? body.imageUrl,
    })
    if (!resolved.ok) return NextResponse.json({ error: resolved.error, code: resolved.code }, { status: resolved.status, headers: NO_STORE })
    effect = resolved.effect
    clipBody = resolved.body
  }
  // KINEO-ROSTO-NO-CLIPE-2810 — pedido de REMIX ("Put your face in it"): interruptor → id do catálogo → foto → consentimento, ANTES de ler
  // KINEO-ROSTO-NO-CLIPE-2810 — conta ou saldo. O prompt é montado no servidor a partir do catálogo; prompt/motor/duração/formato do corpo
  // KINEO-ROSTO-NO-CLIPE-2810 — são ignorados. Efeito e remix no mesmo pedido = recusado (um pedido, uma origem).
  let remix: FaceRemixItem | null = null // KINEO-ROSTO-NO-CLIPE-2810
  if (wantsFaceRemix(body.remix)) { // KINEO-ROSTO-NO-CLIPE-2810
    if (effect) return NextResponse.json({ error: 'Choose one: an effect or a clip remix.', code: 'remix' }, { status: 400, headers: NO_STORE }) // KINEO-ROSTO-NO-CLIPE-2810
    const resolved = resolveFaceRemixRequest(body.remix, { visible: faceRemixVisible(isInternalEmail(user.email)), imageUrl: body.image_url ?? body.imageUrl, consent: body.consent, faceImageUrl: body.face_image_url }) // KINEO-ROSTO-NO-CLIPE-2810 · KINEO-ROSTO-QUADRO-CHAVE-2810 — + o recorte do rosto (2ª referência do quadro-chave; posse conferida no submitClip)
    if (!resolved.ok) return NextResponse.json({ error: resolved.error, code: resolved.code }, { status: resolved.status, headers: NO_STORE }) // KINEO-ROSTO-NO-CLIPE-2810
    remix = resolved.item // KINEO-ROSTO-NO-CLIPE-2810
    clipBody = resolved.body // KINEO-ROSTO-NO-CLIPE-2810
  } // KINEO-ROSTO-NO-CLIPE-2810

  const account = await loadClipAccount(supabase, user)
  const admin = clipsAdmin()
  if (!account || !admin) {
    return NextResponse.json({ error: 'We could not start your clip right now. Nothing was charged — please try again.' }, { status: 503, headers: NO_STORE })
  }

  try {
    const result = await submitClip(submitDepsFor({ admin, userSupabase: supabase, account }), {
      userId: user.id,
      idempotencyKey,
      body: clipBody,
    })
    // Efeito ACEITO (pedido novo, já na fila da fal): um evento por pedido — o replay da mesma chave não conta de novo.
    if (effect && result.ok && !result.replay) {
      await writeServerEvent({
        name: 'clip_effect_chosen',
        userId: user.id,
        path: '/api/clips',
        metadata: {
          ...clipEffectEventMetadata(effect, result.clip), ...homeVariantStamp(user.id, user.email), version: 'clip_effects_20261005',
          ...clipOriginMetadata(body.clip_origin),
          ...(CLIP_MEASUREMENT_ENABLED ? { is_bot: isLikelyBot(req.headers.get('user-agent')) } : {}),
        },
      }).catch(() => false)
    }
    // KINEO-AVISO-CLIPE-GRATIS-2026-10-06 — o clipe saiu da ideia pronta do aviso "Você tem 1 clipe grátis" (lib/clips/
    // freeClipNotice.ts). O navegador só diz de onde veio; o servidor grava o fato com o id do clipe ACEITO e novo (replay não
    // conta) — funil aviso → clique → pedido → clip_delivered, ligado pelo clip_id. Nada muda no pedido nem no débito.
    // KINEO-ROSTO-NO-CLIPE-2810 — remix ACEITO (pedido novo, já na fila da fal): um evento por pedido; o replay da mesma chave não conta de novo.
    if (remix && result.ok && !result.replay) { // KINEO-ROSTO-NO-CLIPE-2810
      await writeServerEvent({ // KINEO-ROSTO-NO-CLIPE-2810
        name: FACE_REMIX_EVENTS.submitted, // KINEO-ROSTO-NO-CLIPE-2810
        userId: user.id, // KINEO-ROSTO-NO-CLIPE-2810
        path: '/api/clips', // KINEO-ROSTO-NO-CLIPE-2810
        metadata: { ...faceRemixEventMetadata(remix, result.clip), ...(CLIP_MEASUREMENT_ENABLED ? { is_bot: isLikelyBot(req.headers.get('user-agent')) } : {}) }, // KINEO-ROSTO-NO-CLIPE-2810
      }).catch(() => false) // KINEO-ROSTO-NO-CLIPE-2810
    } // KINEO-ROSTO-NO-CLIPE-2810
    if (!effect && !remix && body.free_clip_notice === true && result.ok && !result.replay) { // KINEO-ROSTO-NO-CLIPE-2810
      await writeServerEvent({
        name: FREE_CLIP_NOTICE_EVENTS.requested,
        userId: user.id,
        path: '/api/clips',
        metadata: { clip_id: result.clip.id, engine: result.clip.engine, seconds: result.clip.seconds, credits: result.clip.credits, version: FREE_CLIP_NOTICE_VERSION },
      }).catch(() => false)
    }
    if (result.ok) {
      return NextResponse.json(
        { clip: toPublicClip(result.clip), replay: result.replay, balance: result.balance },
        { status: result.status, headers: NO_STORE },
      )
    }
    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
        ...(typeof result.balance === 'number' ? { balance: result.balance } : {}),
        ...(result.clip ? { clip: toPublicClip(result.clip) } : {}),
      },
      { status: result.status, headers: NO_STORE },
    )
  } catch (error) {
    // Quem lança são as leituras ANTES da linha nascer (findByKey/countActive) — nada foi cobrado. Se algo inesperado
    // lançar DEPOIS do débito, a linha fica `pending` sem request_id e a rede (sweepClipJobs) estorna em 10 min.
    console.error('[api/clips] POST failed:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'We could not start your clip right now. Nothing was charged — please try again.' },
      { status: 503, headers: { ...NO_STORE, 'Retry-After': '5' } },
    )
  }
}
