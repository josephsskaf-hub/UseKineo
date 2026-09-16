// KINEO-FEEDBACK-DO-FILME-2026-09-16 — o 👍/👎 do e-mail de entrega (ver lib/filmFeedback.ts).
// GET ?v=<video_id>&r=up|down&t=<hmac>&s=<origem> → grava e agradece (página mínima com caixa opcional).
// POST (form) v, t, comment → grava o comentário. Link assinado: sem token válido, 400 e nada gravado.
// Nunca exige login (a pessoa clica do celular, na caixa de entrada). Nunca dá crédito.
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/app/api/admin/_shared/db'
import { FILM_FEEDBACK_EVENT, verifyFeedbackLink, type FilmFeedbackVerdict } from '@/lib/filmFeedback'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.usekineo.com').replace(/\/$/, '')

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function page(body: string, status = 200): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo — thank you</title>
<meta name="robots" content="noindex"></head>
<body style="margin:0;background:#0a0a0c;color:#e5e5ea;font-family:system-ui,-apple-system,sans-serif;">
<main style="max-width:480px;margin:0 auto;padding:48px 20px;">${body}
<p style="margin:28px 0 0;font-size:12px;color:#6b7280;"><a href="${APP_URL}/studio" style="color:#2997ff;">Make another film</a> · <a href="${APP_URL}" style="color:#6b7280;">usekineo.com</a></p>
</main></body></html>`
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

async function ownerOf(videoId: string): Promise<string | null> {
  const admin = serviceClient()
  if (!admin) return null
  const { data } = await admin.from('videos').select('user_id').eq('id', videoId).maybeSingle()
  return typeof data?.user_id === 'string' ? data.user_id : null
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url)
  const videoId = (u.searchParams.get('v') ?? '').trim()
  const r = u.searchParams.get('r')
  const token = u.searchParams.get('t')
  const source = (u.searchParams.get('s') ?? 'email').slice(0, 40)
  const verdict: FilmFeedbackVerdict | null = r === 'up' || r === 'down' ? r : null
  if (!videoId || !verdict || !verifyFeedbackLink(videoId, token)) {
    return page('<h1 style="font-size:20px;margin:0 0 10px;">This link is not valid</h1><p style="color:#8e8e93;">Open the email again and tap the button once more.</p>', 400)
  }
  const admin = serviceClient()
  const userId = await ownerOf(videoId)
  if (admin && userId) {
    await admin.from('events').insert({
      name: FILM_FEEDBACK_EVENT,
      user_id: userId,
      session_id: videoId,
      path: '/api/film-feedback',
      metadata: { video_id: videoId, verdict, source },
    })
  }
  const thanks = verdict === 'up'
    ? '<h1 style="font-size:22px;margin:0 0 10px;">Thank you! 🎬</h1><p style="color:#8e8e93;margin:0 0 18px;">Glad it matched. Anything that would make the next one even better?</p>'
    : '<h1 style="font-size:22px;margin:0 0 10px;">Thank you for telling us.</h1><p style="color:#8e8e93;margin:0 0 18px;">What was off — the story, the footage, the voice? One line helps us fix it for you.</p>'
  return page(`${thanks}
<form method="post" action="${APP_URL}/api/film-feedback">
<input type="hidden" name="v" value="${esc(videoId)}"><input type="hidden" name="t" value="${esc(token ?? '')}"><input type="hidden" name="r" value="${verdict}">
<textarea name="comment" maxlength="600" rows="4" placeholder="Optional — what should have been different?" style="width:100%;box-sizing:border-box;background:#131316;color:#e5e5ea;border:1px solid #2a2a2d;border-radius:10px;padding:10px;font:inherit;"></textarea>
<button type="submit" style="margin-top:10px;background:#2997ff;color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:700;font:inherit;cursor:pointer;">Send</button>
</form>`)
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  const videoId = String(form?.get('v') ?? '').trim()
  const token = String(form?.get('t') ?? '')
  const r = String(form?.get('r') ?? '')
  const comment = String(form?.get('comment') ?? '').trim().slice(0, 600)
  if (!videoId || !verifyFeedbackLink(videoId, token)) {
    return page('<h1 style="font-size:20px;margin:0 0 10px;">This link is not valid</h1>', 400)
  }
  if (comment) {
    const admin = serviceClient()
    const userId = await ownerOf(videoId)
    if (admin && userId) {
      await admin.from('events').insert({
        name: FILM_FEEDBACK_EVENT,
        user_id: userId,
        session_id: videoId,
        path: '/api/film-feedback',
        metadata: { video_id: videoId, comment, after: r === 'up' || r === 'down' ? r : null },
      })
    }
  }
  return page('<h1 style="font-size:22px;margin:0 0 10px;">Got it. Thank you.</h1><p style="color:#8e8e93;">A person reads every one of these.</p>')
}
