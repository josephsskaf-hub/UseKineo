import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { normalizeLeadEmail } from '@/lib/growth/b2bLead'
import { canViewCompanyOffer } from '@/lib/growth/companyOfferAccess'
import { COMPANY_OFFER_INTENT, COMPANY_OFFER_LEAD_SOURCE, companyOfferRequestKey } from '@/lib/growth/companyOfferContact'
import { clientIp } from '@/lib/requestIdentity'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BYTES = 1024
const WINDOW_MS = 15 * 60_000
const MAX_ATTEMPTS = 6
const HITS = new Map<string, { count: number; expires: number }>()

function reply(status: number, body: { saved: boolean; error?: string }) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  })
}

function isLimited(ip: string): boolean {
  const now = Date.now()
  const hit = HITS.get(ip)
  if (hit && hit.expires > now) return ++hit.count > MAX_ATTEMPTS
  if (HITS.size >= 5000) {
    for (const [key, value] of HITS) {
      if (value.expires <= now) HITS.delete(key)
    }
    if (HITS.size >= 5000) return true
  }
  HITS.set(ip, { count: 1, expires: now + WINDOW_MS })
  return false
}

async function readContactBody(request: Request): Promise<{ payload: unknown; tooLarge: boolean }> {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) return { payload: null, tooLarge: true }
  const reader = request.body?.getReader()
  if (!reader) return { payload: null, tooLarge: false }

  const decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0
  let raw = ''
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) return { payload: JSON.parse(raw + decoder.decode()), tooLarge: false }
      size += chunk.value.byteLength
      if (size > MAX_BYTES) {
        await reader.cancel()
        return { payload: null, tooLarge: true }
      }
      raw += decoder.decode(chunk.value, { stream: true })
    }
  } catch {
    return { payload: null, tooLarge: false }
  } finally {
    reader.releaseLock()
  }
}

export async function POST(request: Request) {
  if (!await canViewCompanyOffer()) return reply(404, { saved: false })
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply(403, { saved: false })
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return reply(415, { saved: false })
  }
  if (isLimited(clientIp(request.headers) ?? 'unknown')) {
    return reply(429, { saved: false, error: 'rate_limited' })
  }

  const { payload, tooLarge } = await readContactBody(request)
  if (tooLarge) return reply(413, { saved: false })
  if (!payload || typeof payload !== 'object') return reply(400, { saved: false })
  const form = payload as Record<string, unknown>
  if (form.intent !== COMPANY_OFFER_INTENT) return reply(400, { saved: false })
  // Bots get a quiet acknowledgement without creating a contact.
  if (typeof form.website === 'string' && form.website.trim()) return reply(200, { saved: true })
  const email = normalizeLeadEmail(form.email)
  if (!email) return reply(400, { saved: false })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return reply(503, { saved: false })

  try {
    const db = createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    const source = COMPANY_OFFER_LEAD_SOURCE
    const magnet = companyOfferRequestKey(new Date().toISOString())
    const { error } = await db.from('leads').insert({ email, source, magnet })
    if (!error) return reply(200, { saved: true })
    if (error.code !== '23505') return reply(503, { saved: false })

    // One active inbox request per contact. Preserve the first capture date and
    // avoid resetting the proposal timestamp on repeated submissions.
    const { data: updated, error: updateError } = await db
      .from('leads')
      .update({ source, magnet })
      .eq('email', email)
      .or('source.is.null,source.neq.' + source)
      .select('source')
      .maybeSingle()
    if (updateError) return reply(503, { saved: false })
    if (updated) return reply(200, { saved: true })

    const { data: existing, error: lookupError } = await db.from('leads')
      .select('source').eq('email', email).eq('source', source).maybeSingle()
    return !lookupError && existing ? reply(200, { saved: true }) : reply(503, { saved: false })
  } catch {
    return reply(503, { saved: false })
  }
}
