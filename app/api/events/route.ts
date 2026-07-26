// Lightweight, non-blocking product event sink.
//
// Body accepts both the legacy `name` field and `event_name`:
//   { name?: string, event_name?: string, metadata?: object, path?: string }
//
// Identity always comes from the Supabase session cookie. The browser cannot
// choose user_id. Writes use the server-only service role so production RLS
// cannot silently discard valid anonymous or authenticated funnel events.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const SERVER_ONLY_EVENTS = new Set([
  'compose_submission_claim',
  'avatar_submission_claim',
  'payment_success',
  'checkout_attempted',
  'checkout_auth_required',
  'checkout_started',
  'checkout_failed',
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — written ONLY by the speculativeNoop
  // branch of app/api/stripe/checkout/route.ts when it refuses a prefetch /
  // scanner hit. If the browser sink could mint it, a forged burst would make
  // a real Session-minting incident look like harmless prefetch noise.
  'checkout_prefetch_blocked',
  'auth_callback_completed',
  'auth_callback_failed',
  'email_signup_completed',
  'generate_arrived_server',
  'generate_activation_auth_missing',
  // KINEO-AUTOPILOT-299-2026-07-26 — escrito só pelo Server Component de
  // /autopilot. Se o sink do browser pudesse cunhar, um burst forjado infla o
  // TOPO do funil do SKU de $299 e a taxa de conversão passa a mentir pra baixo.
  'autopilot_page_arrived',
  // KINEO-YT-CONNECT-2026-07-26 — os três são escritos SÓ pelo par
  // /api/youtube/auth + /api/youtube/callback. Eles formam o funil inteiro da
  // conexão de canal (denominador, sucesso, falha). Se o sink do browser
  // pudesse cunhá-los, a única métrica que diz se o Autopilot é entregável
  // viraria ficção — e ela é justamente a que estava em ZERO.
  'youtube_connect_started',
  'youtube_connected',
  'youtube_connect_failed',
  // KINEO-REVIVE-2026-07-26 — escritos pelo Server Component /revive/[handle]
  // e pela rota de clique. São outbound frio: o volume de views é o
  // denominador do canal de aquisição inteiro, e um burst forjado esconderia
  // uma campanha morta atrás de números bonitos.
  'revive_page_viewed',
  'revive_cta_clicked',
])

export async function POST(req: NextRequest) {
  try {
    // PUSH #29 — local/preview QA must never contaminate the production
    // acquisition funnel when a developer is using production-like env vars.
    // Billing and other server-authoritative events use their own routes; this
    // guard only affects the generic browser event sink.
    const hostname = req.nextUrl.hostname.toLowerCase()
    if (
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' ||
      process.env.VERCEL_ENV === 'preview'
    ) {
      return NextResponse.json({ ok: true, ignored: true, stored: false, reason: 'non_production_qa' })
    }

    const body = await req.json().catch(() => ({}))
    const rawName = typeof body?.event_name === 'string'
      ? body.event_name
      : typeof body?.name === 'string'
        ? body.name
        : ''
    const name = rawName.trim().slice(0, 64)
    if (!name) {
      return NextResponse.json({ ok: true, ignored: true, stored: false })
    }
    // These names are authoritative locks/payment facts written only by their
    // server routes. Letting the generic browser sink mint them would corrupt
    // billing recovery and funnel truth.
    if (SERVER_ONLY_EVENTS.has(name)) {
      return NextResponse.json({ ok: true, ignored: true, stored: false })
    }

    const metadata =
      body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata
        : {}
    const path = typeof body?.path === 'string' ? body.path.slice(0, 256) : null
    const sessionId =
      typeof body?.session_id === 'string'
        ? body.session_id.slice(0, 64)
        : null

    let userId: string | null = null
    try {
      const cookieClient = createClient()
      const {
        data: { user },
      } = await cookieClient.auth.getUser()
      userId = user?.id ?? null
    } catch {
      // Expired or malformed cookies must not prevent anonymous funnel data.
    }

    const row: Record<string, unknown> = {
      name,
      user_id: userId,
    }
    if (Object.keys(metadata).length > 0) row.metadata = metadata
    if (path) row.path = path
    if (sessionId) row.session_id = sessionId

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.error('[events] Supabase service role is not configured')
      return NextResponse.json({ ok: true, stored: false })
    }

    const admin = createServiceClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let { error } = await admin.from('events').insert(row)
    // Preserve compatibility with old environments that only have the
    // original {name, user_id} columns.
    if (error && /column .* does not exist/i.test(error.message ?? '')) {
      const fallback = await admin
        .from('events')
        .insert({ name, user_id: userId })
      error = fallback.error
    }

    if (error) {
      console.error('[events] insert failed:', error.message)
      return NextResponse.json({ ok: true, stored: false })
    }

    return NextResponse.json({ ok: true, stored: true })
  } catch (error) {
    // Analytics must never interrupt the user-facing flow.
    console.error('[events] unexpected failure:', error)
    return NextResponse.json({ ok: true, stored: false })
  }
}
