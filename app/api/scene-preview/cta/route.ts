// KINEO-PREVIA-CENAS-2026-10-03 — o clique em "Transformar em filme" vira evento de SERVIDOR com user_id
// (scene_preview_cta_clicked), para cruzar depois com checkout/payment_success da mesma conta. Não cobra, não gera nada.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { PREVIA_CENAS_PUBLIC, PREVIA_EVENTS } from '@/lib/scenePreview'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!PREVIA_CENAS_PUBLIC) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const body = (await req.json().catch(() => null)) as { placement?: unknown; scenes?: unknown } | null
  const placement = typeof body?.placement === 'string' && /^[a-z_]{1,32}$/.test(body.placement) ? body.placement : 'preview'
  await writeServerEvent({
    name: PREVIA_EVENTS.ctaClicked,
    userId: user.id,
    path: '/api/scene-preview/cta',
    metadata: { placement, scenes: typeof body?.scenes === 'number' ? body.scenes : null },
  })
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
