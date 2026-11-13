// KINEO-RECREATE-SEU-VIDEO-1311 — 2º passo da tela: confere o vídeo enviado ANTES de cobrar (2 a 15 s, 24 a 60 fps, até 100 MB, MP4/MOV)
// e devolve os segundos, o preço da tabela de hoje e o prompt pronto (editável). Nada é cobrado aqui.
import { NextRequest, NextResponse } from 'next/server'
import { clipsAdmin, loadClipAccount } from '@/lib/clips/clipServer'
import { isPayingPlan } from '@/app/api/admin/_shared/mrr'
import { RECREATE_HEADERS } from '@/lib/recreate/server'
import { lerVideoDoCliente, seuVideoSession } from '@/lib/recreate/seuVideoServer'
import { promptPadrao, SEU_VIDEO_VERSAO } from '@/lib/recreate/seuVideo'
import { writeServerEvent } from '@/lib/serverEvents'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 30
export const runtime = 'nodejs'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: RECREATE_HEADERS })

export async function POST(req: NextRequest) {
  const { supabase, user } = await seuVideoSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return json({ error: 'Invalid origin.' }, 403)
  let raw: Record<string, unknown>
  try { raw = await req.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  const admin = clipsAdmin()
  const account = admin ? await loadClipAccount(supabase, user) : null
  if (!admin || !account) return json({ error: 'Could not check your video. Please retry.' }, 503)
  const v = await lerVideoDoCliente(admin, user.id, raw.video_path)
  if (!v.ok) {
    await writeServerEvent({ name: 'recreate_seu_video_refused', userId: user.id, path: '/api/recreate/seu-video/check', metadata: { versao: SEU_VIDEO_VERSAO, code: v.code, stage: 'check' } }).catch(() => false)
    return json(v, 422)
  }
  const people = Math.min(3, Math.max(1, Math.round(Number(raw.people) || 1)))
  const positions = Array.isArray(raw.positions) ? raw.positions.map((x) => String(x ?? '')) : []
  return json({
    ok: true, seconds: Math.round(v.meta.segundos * 10) / 10, fps: Math.round(v.meta.fps), width: v.meta.largura, height: v.meta.altura, bytes: v.bytes,
    generated_seconds: v.gerados, aspect_ratio: v.proporcao, credits: v.creditos, balance: account.balance, shortfall: Math.max(0, (v.creditos ?? 0) - account.balance),
    needs_plan: v.gerados > 10 && !isPayingPlan(account.plan), prompt: promptPadrao(people, positions),
  })
}
