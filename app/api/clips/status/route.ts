// KINEO-CLIPES-2026-09-29 — /api/clips/status?id=<clipId>
// Pergunta à fal, PERSISTE o MP4 no nosso bucket antes de marcar pronto e estorna falha/recusa/prazo vencido — tudo
// por lib/clips/clipFlow.ts settleClip (a mesma função do cron). Só o dono lê o próprio clipe.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { settleClip } from '@/lib/clips/clipFlow'
import { clipsAdmin, loadClip, settleDepsFor, toPublicClip } from '@/lib/clips/clipServer'

export const maxDuration = 60
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Rota SÓ-GET: sem isto o Next 14.2 guarda os GETs do supabase-js no Data Cache (KINEO-DATA-CACHE-2026-09-02).
export const fetchCache = 'force-no-store'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401, headers: NO_STORE })
  const admin = clipsAdmin()
  if (!admin) return NextResponse.json({ error: 'Status check is temporarily unavailable.' }, { status: 503, headers: NO_STORE })

  const id = (req.nextUrl.searchParams.get('id') ?? '').trim()
  const row = await loadClip(admin, user.id, id)
  if (row === 'error') return NextResponse.json({ error: 'Status check is temporarily unavailable.' }, { status: 503, headers: { ...NO_STORE, 'Retry-After': '5' } })
  if (!row) return NextResponse.json({ error: 'Clip not found.' }, { status: 404, headers: NO_STORE })

  try {
    await settleClip(settleDepsFor(admin, user.id), row)
  } catch (error) {
    console.error(`[api/clips/status] settle failed clip=${row.id}:`, error instanceof Error ? error.message : String(error))
  }
  // Relê: outro ator (outra aba, o cron) pode ter movido a linha; a resposta é o banco, não a memória desta chamada.
  const fresh = await loadClip(admin, user.id, id)
  const clip = fresh && fresh !== 'error' ? fresh : row
  return NextResponse.json(
    { clip: toPublicClip(clip), poll_after_ms: clip.status === 'done' || clip.status === 'failed' ? null : 6000 },
    { headers: NO_STORE },
  )
}
