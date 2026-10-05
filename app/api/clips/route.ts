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
    return NextResponse.json({ engines: clipCatalogFor(guest), effects: guestEffects, clips: [], balance: null, signed_in: false }, { headers: NO_STORE })
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
  // Falha de leitura não se disfarça de lista vazia (lição do incidente JWT-skew, 28/08).
  if (rows === null) {
    return NextResponse.json(
      { error: 'Could not load your clips right now.', engines: clipCatalogFor(access), effects, clips: [], balance: account.balance },
      { status: 503, headers: NO_STORE },
    )
  }
  return NextResponse.json(
    { engines: clipCatalogFor(access), effects, clips: rows.map(toPublicClip), balance: account.balance },
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
        metadata: { ...clipEffectEventMetadata(effect, result.clip), ...homeVariantStamp(user.id, user.email), version: 'clip_effects_20261005' },
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
