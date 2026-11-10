import { NextRequest, NextResponse } from 'next/server'
import { clipsAdmin } from '@/lib/clips/clipServer'
import { recreateFormat } from '@/lib/recreate/formats'
import { visibleRecreateFormats } from '@/lib/recreate/access'
import { recreateSession, RECREATE_HEADERS } from '@/lib/recreate/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: RECREATE_HEADERS })
export async function GET() {
  const { user } = await recreateSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  const admin = clipsAdmin()
  if (!admin) return json({ error: 'Likes unavailable.' }, 503)
  const items = await Promise.all(visibleRecreateFormats(user.email).map(async f => { // KINEO-RECREATE-TRAVA-1011
    const [total, own] = await Promise.all([
      admin.from('recreate_likes').select('user_id', { count: 'exact', head: true }).eq('format_id', f.id),
      admin.from('recreate_likes').select('user_id').eq('format_id', f.id).eq('user_id', user.id).maybeSingle(),
    ])
    if (total.error || own.error || total.count === null) return null
    return { id: f.id, count: total.count, liked: !!own.data }
  }))
  return items.some(i => i === null) ? json({ error: 'Likes unavailable. Please retry.' }, 503) : json({ items })
}
export async function POST(req: NextRequest) {
  const { user } = await recreateSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return json({ error: 'Invalid origin.' }, 403)
  let raw: Record<string, unknown>
  try { raw = await req.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  const format = recreateFormat(raw.format)
  if (!format || !visibleRecreateFormats(user.email).includes(format)) return json({ error: 'Unknown format.' }, 400)
  const admin = clipsAdmin()
  if (!admin) return json({ error: 'Could not save. Please retry.' }, 503)
  if (raw.action === 'report') {
    if (!['rights', 'unsafe', 'other'].includes(String(raw.reason))) return json({ error: 'Choose a report reason.' }, 400)
    const { error } = await admin.from('recreate_reports').upsert({ format_id: raw.format, user_id: user.id, reason: raw.reason }, { onConflict: 'format_id,user_id' })
    return error ? json({ error: 'Report was not saved. Please retry.' }, 503) : json({ saved: true })
  }
  if (raw.action !== 'like' || typeof raw.liked !== 'boolean') return json({ error: 'Invalid action.' }, 400)
  const result = raw.liked
    ? await admin.from('recreate_likes').upsert({ format_id: raw.format, user_id: user.id }, { onConflict: 'format_id,user_id', ignoreDuplicates: true })
    : await admin.from('recreate_likes').delete().eq('format_id', raw.format).eq('user_id', user.id)
  return result.error ? json({ error: 'Like was not saved. Please retry.' }, 503) : json({ saved: true })
}
