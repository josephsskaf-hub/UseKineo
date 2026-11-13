// KINEO-RECREATE-SEU-VIDEO-1311 — 1º passo da tela: reserva o lugar do vídeo do cliente no bucket público (URL assinada de envio).
// A tela envia o arquivo direto ao Supabase (uploadToSignedUrl ou PUT na upload_url); o servidor nunca recebe os bytes.
import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { clipsAdmin } from '@/lib/clips/clipServer'
import { RECREATE_HEADERS } from '@/lib/recreate/server'
import { SEU_VIDEO_BUCKET, seuVideoSession } from '@/lib/recreate/seuVideoServer'
import { SEU_VIDEO_LIMITES, SEU_VIDEO_PASTA, SEU_VIDEO_TIPOS } from '@/lib/recreate/seuVideo'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: RECREATE_HEADERS })

export async function POST(req: NextRequest) {
  const { user } = await seuVideoSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return json({ error: 'Invalid origin.' }, 403)
  let raw: Record<string, unknown>
  try { raw = await req.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  const tipo = String(raw.content_type ?? '').toLowerCase()
  const bytes = Number(raw.bytes)
  if (!(SEU_VIDEO_TIPOS as readonly string[]).includes(tipo)) return json({ ok: false, code: 'format', error: 'Send an MP4 or MOV video. Nothing was charged.' }, 400)
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > SEU_VIDEO_LIMITES.maxBytes) return json({ ok: false, code: 'size', error: 'Send a video up to 100 MB. Nothing was charged.' }, 400)
  const admin = clipsAdmin()
  if (!admin) return json({ error: 'Could not prepare the upload. Please retry.' }, 503)
  const path = `${SEU_VIDEO_PASTA}/${user.id}/${randomUUID()}.${tipo === 'video/quicktime' ? 'mov' : 'mp4'}`
  const { data, error } = await admin.storage.from(SEU_VIDEO_BUCKET).createSignedUploadUrl(path)
  if (error || !data) return json({ error: 'Could not prepare the upload. Please retry.' }, 502)
  return json({ ok: true, video_path: path, upload_url: data.signedUrl, token: data.token, bucket: SEU_VIDEO_BUCKET })
}
