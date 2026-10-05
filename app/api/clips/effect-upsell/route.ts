// KINEO-CLIP-EFEITOS-2026-10-05 — POST /api/clips/effect-upsell { clip_id }
// O botão "Turn into a narrated film (60 s)" do clipe de efeito pronto passa AQUI antes de navegar: grava
// `clip_effect_film_upsell_clicked` (fato do servidor, por pessoa) e devolve o link do Studio (clipEffectFilmHref) com a
// ideia sugerida do efeito. Só o dono do clipe; só clipe de efeito pronto. Nada é cobrado nem disparado: o Studio abre
// com a ideia na caixa e a pessoa aperta Gerar. Se esta rota falhar, a tela navega mesmo assim (o link vem no clipe) —
// métrica nunca trava o caminho do cliente.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clipsAdmin, loadClip } from '@/lib/clips/clipServer'
import { clipsVisible } from '@/lib/clips/clipLaunch'
import { isInternalEmail } from '@/lib/internalAccounts'
import { writeServerEvent } from '@/lib/serverEvents'
import { clipEffectEventMetadata, clipEffectFilmHref, clipEffectForRow, clipEffectsVisible } from '@/lib/clips/clipEffects'

export const maxDuration = 15
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401, headers: NO_STORE })
  if (!clipsVisible(user.email) || !clipEffectsVisible(isInternalEmail(user.email))) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: NO_STORE })
  }
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: NO_STORE })
  }
  const id = typeof body.clip_id === 'string' ? body.clip_id.trim() : ''
  const admin = clipsAdmin()
  if (!admin) return NextResponse.json({ error: 'Temporarily unavailable.' }, { status: 503, headers: NO_STORE })
  const row = await loadClip(admin, user.id, id)
  if (row === 'error') return NextResponse.json({ error: 'Temporarily unavailable.' }, { status: 503, headers: NO_STORE })
  const effect = row ? clipEffectForRow(row) : null
  if (!row || !effect || row.status !== 'done') return NextResponse.json({ error: 'Clip not found.' }, { status: 404, headers: NO_STORE })

  await writeServerEvent({
    name: 'clip_effect_film_upsell_clicked',
    userId: user.id,
    path: '/api/clips/effect-upsell',
    metadata: { ...clipEffectEventMetadata(effect, row), version: 'clip_effects_20261005' },
  }).catch(() => false)

  return NextResponse.json({ href: clipEffectFilmHref(effect) }, { headers: NO_STORE })
}
