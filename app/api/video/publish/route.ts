import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { writeServerEvent } from '@/lib/serverEvents'
import { mintShareConfirmation, verifyShareConfirmation, verifyShareToken, type ShareAction } from '@/lib/videoShareLink'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
const SITE = 'https://www.usekineo.com'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HEADERS = {
  'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
}
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
function back(reason: string) {
  return NextResponse.redirect(`${SITE}/history?share=${encodeURIComponent(reason)}`, {status:303, headers:HEADERS})
}
function unavailable() {
  return new NextResponse('We could not confirm the change. Nothing is confirmed as published or unpublished. Return to your original link and try again.', {status:503, headers:HEADERS})
}

/** Inbox scanners/prefetch only see a confirmation. GET never reads or writes videos. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url), videoId = (url.searchParams.get('v') ?? '').trim()
  if (!UUID.test(videoId) || !verifyShareToken(videoId, url.searchParams.get('t'))) return back('invalid')
  const action: ShareAction = url.searchParams.get('undo') === '1' ? 'unpublish' : 'publish'
  const confirmation = mintShareConfirmation(videoId, action)
  if (!confirmation) return unavailable()
  const source = (url.searchParams.get('src') ?? 'unknown').slice(0,40)
  const undo = action === 'unpublish'
  const title = undo ? 'Remove your public video page?' : 'Publish this video page?'
  const detail = undo ? 'This removes the Kineo public page. It cannot recall copies already downloaded or shared elsewhere.' : 'Anyone with the public link can watch this video. Your other videos stay private. Only continue if you want to share this one.'
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Kineo</title><style>body{margin:0;background:#0b0d12;color:#f4f5f7;font:16px/1.6 system-ui,sans-serif}main{max-width:520px;margin:8vh auto;padding:28px}h1{font-size:30px;line-height:1.2;font-weight:500}p{color:#b8c2d2}button{font:inherit;background:#2997ff;color:#081019;border:0;border-radius:10px;padding:12px 18px;cursor:pointer}a{display:inline-block;color:#b8c2d2;margin:16px 0}button:focus-visible,a:focus-visible{outline:3px solid white;outline-offset:4px}</style><main><p>Kineo · Sharing</p><h1>${title}</h1><p>${detail}</p><form method="post" action="/api/video/publish"><input type="hidden" name="v" value="${videoId}"><input type="hidden" name="action" value="${action}"><input type="hidden" name="confirmation" value="${escapeHtml(confirmation)}"><input type="hidden" name="src" value="${escapeHtml(source)}"><button type="submit">${undo ? 'Remove public page' : 'Publish this video'}</button></form><a href="/library">Cancel — go to my library</a><p>No credits are used. This confirmation expires in 15 minutes.</p></main></html>`
  return new NextResponse(html, {headers:{...HEADERS,'Content-Type':'text/html; charset=utf-8'}})
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url).origin) return back('invalid')
  try {
    const form = await req.formData()
    const videoId = String(form.get('v') ?? ''), action = String(form.get('action') ?? '')
    const confirmation = String(form.get('confirmation') ?? '')
    if (!UUID.test(videoId) || (action !== 'publish' && action !== 'unpublish') || !verifyShareConfirmation(videoId, action, confirmation)) return back('invalid')
    const source = String(form.get('src') ?? 'unknown').slice(0,40)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return unavailable()
    const admin = createAdminClient(url, key, {auth:{persistSession:false}})
    const {data: row, error} = await admin.from('videos').select('id,user_id,status,video_url,final_video_url,published_at').eq('id',videoId).single()
    if (error || !row) return back('missing')
    const undo = action === 'unpublish'
    if (!undo && (row.status !== 'completed' || !(row.final_video_url || row.video_url || '').trim())) return back('not_ready')
    const changing = undo ? !!row.published_at : !row.published_at
    if (changing) {
      // Compare-and-set: concurrent clicks cannot both emit a new consent event.
      let query = admin.from('videos').update(undo ? {published_at:null,published_via:null} : {published_at:new Date().toISOString(),published_via:source}).eq('id',videoId)
      query = undo ? query.eq('published_at',row.published_at) : query.is('published_at',null)
      const {data: changed, error: updateError} = await query.select('id,published_at').maybeSingle()
      if (updateError || !changed || (undo ? changed.published_at !== null : !changed.published_at)) return unavailable()
      await writeServerEvent({name:undo ? 'video_unpublished_v1' : 'video_published_v1',userId:row.user_id,metadata:{video_id:videoId,source}})
    }
    return undo ? back('unpublished') : NextResponse.redirect(`${SITE}/v/${videoId}?utm_source=owner_share`,{status:303,headers:HEADERS})
  } catch { return unavailable() }
}
