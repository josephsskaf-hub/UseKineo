import { NextRequest, NextResponse } from 'next/server'
import { recreateSession, RECREATE_HEADERS } from '@/lib/recreate/server'
import { clipsAdmin, loadClip, settleDepsFor } from '@/lib/clips/clipServer'
import { settleClip } from '@/lib/clips/clipFlow'
import { isRecreateNotSwappedReason } from '@/lib/recreate/swapCheck'
import { ehModeloDoSeuVideo, recusaDoMotor } from '@/lib/recreate/seuVideo' // KINEO-RECREATE-SEU-VIDEO-1311 · KINEO-RECREATE-KLING4-1311

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60
export async function GET(req: NextRequest) {
  const { user } = await recreateSession()
  if (!user) return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: RECREATE_HEADERS })
  const admin = clipsAdmin()
  if (!admin) return NextResponse.json({ error: 'Status unavailable.' }, { status: 503, headers: RECREATE_HEADERS })
  const id = req.nextUrl.searchParams.get('id') ?? ''
  const row = await loadClip(admin, user.id, id)
  if (!row || row === 'error') return NextResponse.json({ error: 'Status unavailable.' }, { status: row === 'error' ? 503 : 404, headers: RECREATE_HEADERS })
  try { await settleClip(settleDepsFor(admin, user.id), row) } catch { /* Status can be retried without another generation. */ }
  const fresh = await loadClip(admin, user.id, id)
  if (!fresh || fresh === 'error') return NextResponse.json({ error: 'Status unavailable.' }, { status: 503, headers: RECREATE_HEADERS })
  const { status, video_url, credits_refunded } = fresh
  // KINEO-RECREATE-TRAVA-1011 — the only reason the screen needs: the result came back without the customer in it.
  const reason = status === 'failed' && isRecreateNotSwappedReason(fresh.failure_reason) ? { reason: 'not_swapped' } : {}
  // KINEO-RECREATE-SEU-VIDEO-1311 — o Seedance 2.5 recusou (rosto real, cena sensível): a frase clara; o estorno já foi feito no settleClip.
  const motor = status === 'failed' && ehModeloDoSeuVideo(fresh.model) ? recusaDoMotor(fresh.failure_reason) : null
  const seuVideo = motor ? { reason: 'engine_refused', message: motor } : {} // KINEO-RECREATE-SEU-VIDEO-1311
  return NextResponse.json({ clip: { id, status, video_url: status === 'failed' ? null : video_url, credits_refunded, ...reason, ...seuVideo } }, { headers: RECREATE_HEADERS })
}
