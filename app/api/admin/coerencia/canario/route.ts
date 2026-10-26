import { NextResponse } from 'next/server'
import { TASK_FULFILLMENT_CANARY_ENABLED } from '@/lib/regua95/taskFulfillmentCanary'
import { parseStoredCanaryRequest, runStoredTaskFulfillmentCanary, TASK_CANARY_BODY_MAX_BYTES } from '@/lib/admin/taskFulfillmentCanary'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 120

/** Manual only. No cron or active UI calls this endpoint. Disabled before auth/key/DB I/O. */
export async function POST(req: Request) {
  if (!TASK_FULFILLMENT_CANARY_ENABLED) return NextResponse.json({ status: 'disabled', evaluated: 0, reason: 'paid_canary_approval_pending' }, { status: 409 })
  try {
    const origin = req.headers.get('origin')
    if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const { createClient } = await import('@/lib/supabase/server')
    const { isAdminEmail, serviceClient } = await import('../../_shared/db')
    const auth = createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const text = await req.text()
    if (Buffer.byteLength(text, 'utf8') > TASK_CANARY_BODY_MAX_BYTES) return NextResponse.json({ error: 'request_too_large' }, { status: 413 })
    let body: unknown
    try { body = JSON.parse(text) } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
    const parsed = parseStoredCanaryRequest(body)
    if (!parsed.ok) return NextResponse.json({ status: 'invalid', reason: parsed.reason, evaluated: 0 }, { status: 400 })
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ status: 'unavailable', evaluated: 0 }, { status: 503 })
    const result = await runStoredTaskFulfillmentCanary(parsed.value, { admin, adminId: user.id, getApiKey: () => process.env.OPENAI_API_KEY })
    const status = result.status === 'unknown' ? 422 : result.status === 'unavailable' ? 503 : result.status === 'invalid' ? 400 : 200
    return NextResponse.json(result, { status })
  } catch {
    // Do not log model payloads, request text, frame URLs, keys or user data.
    // A consumed claim is deliberately retained; a retry cannot buy another evaluation.
    return NextResponse.json({ status: 'unknown', evaluated: null, reason: 'manual_canary_failed_check_reservation' }, { status: 502 })
  }
}
