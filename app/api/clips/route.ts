// KINEO-CLIPES-2026-09-29 — /api/clips
//   GET  → catálogo que ESTA conta pode apertar (motores, durações reais, formatos, créditos) + "Meus clipes" + saldo.
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

export const maxDuration = 60
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Mesmo motivo de app/api/images/route.ts (KINEO-DATA-CACHE-2026-09-02): nenhuma leitura do banco pode ir para o Data Cache.
export const fetchCache = 'force-no-store'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.', engines: [], clips: [] }, { status: 401, headers: NO_STORE })
  const account = await loadClipAccount(supabase, user)
  const admin = clipsAdmin()
  if (!account || !admin) {
    return NextResponse.json({ error: 'Could not load your clips right now.', engines: [], clips: [] }, { status: 503, headers: NO_STORE })
  }
  const rows = await listClips(admin, user.id)
  // Falha de leitura não se disfarça de lista vazia (lição do incidente JWT-skew, 28/08).
  if (rows === null) {
    return NextResponse.json(
      { error: 'Could not load your clips right now.', engines: clipCatalogFor(engineAccessFor(account)), clips: [], balance: account.balance },
      { status: 503, headers: NO_STORE },
    )
  }
  return NextResponse.json(
    { engines: clipCatalogFor(engineAccessFor(account)), clips: rows.map(toPublicClip), balance: account.balance },
    { headers: NO_STORE },
  )
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401, headers: NO_STORE })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: NO_STORE })
  }
  const headerKey = req.headers.get('idempotency-key')?.trim() ?? ''
  const bodyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : ''
  const idempotencyKey = headerKey || bodyKey

  const account = await loadClipAccount(supabase, user)
  const admin = clipsAdmin()
  if (!account || !admin) {
    return NextResponse.json({ error: 'We could not start your clip right now. Nothing was charged — please try again.' }, { status: 503, headers: NO_STORE })
  }

  try {
    const result = await submitClip(submitDepsFor({ admin, userSupabase: supabase, account }), {
      userId: user.id,
      idempotencyKey,
      body: {
        engine: body.engine,
        seconds: body.seconds,
        aspect: body.aspect,
        prompt: body.prompt,
        imageUrl: body.image_url ?? body.imageUrl,
      },
    })
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
