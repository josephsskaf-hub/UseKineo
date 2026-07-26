import { createClient as createServiceClient } from '@supabase/supabase-js'

type ServerEventInput = {
  name: string
  userId?: string | null
  metadata?: Record<string, unknown>
  path?: string | null
  sessionId?: string | null
  /**
   * PUSH #96 — opt-in session dedupe.
   *
   * A Server Component on a `force-dynamic` route re-renders on every RSC
   * navigation, so an event written at the top of that component counts
   * renders, not arrivals: `generate_arrived_server` had 138 rows across 51
   * sessions, i.e. the funnel's own denominator was inflated ~2.7x. When this
   * is set AND a sessionId is present, an identical (name, session_id) event
   * inside the window suppresses the write.
   *
   * Fails OPEN on purpose: if the lookup errors we still record the event.
   * Losing a duplicate is cheap; losing a real arrival corrupts the funnel.
   */
  dedupeMinutes?: number
}

/**
 * Persist an authoritative funnel event from a server route or Server
 * Component. Analytics must never interrupt auth or product navigation, so the
 * helper reports failure instead of throwing.
 */
export async function writeServerEvent(input: ServerEventInput): Promise<boolean> {
  try {
    const name = input.name.trim().slice(0, 64)
    if (!name) return false

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.error('[server-events] Supabase service role is not configured')
      return false
    }

    const admin = createServiceClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const sessionId = input.sessionId ? input.sessionId.slice(0, 64) : null
    const dedupeMinutes =
      typeof input.dedupeMinutes === 'number' &&
      Number.isFinite(input.dedupeMinutes) &&
      input.dedupeMinutes > 0
        ? Math.min(input.dedupeMinutes, 24 * 60)
        : 0

    if (dedupeMinutes > 0 && sessionId) {
      try {
        const since = new Date(Date.now() - dedupeMinutes * 60_000).toISOString()
        const { data: existing, error: lookupError } = await admin
          .from('events')
          .select('id')
          .eq('name', name)
          .eq('session_id', sessionId)
          .gte('created_at', since)
          .limit(1)
        // Only a positive, error-free hit suppresses the write.
        if (!lookupError && existing && existing.length > 0) return true
      } catch {
        // Fail open — see dedupeMinutes above.
      }
    }

    const row: Record<string, unknown> = {
      name,
      user_id: input.userId ?? null,
    }
    if (input.metadata && Object.keys(input.metadata).length > 0) {
      row.metadata = input.metadata
    }
    if (input.path) row.path = input.path.slice(0, 256)
    if (sessionId) row.session_id = sessionId

    let { error } = await admin.from('events').insert(row)
    // Keep deploys compatible with older projects that still expose only the
    // original {name, user_id} event columns.
    if (error && /column .* does not exist/i.test(error.message ?? '')) {
      const fallback = await admin
        .from('events')
        .insert({ name, user_id: input.userId ?? null })
      error = fallback.error
    }

    if (error) {
      console.error('[server-events] insert failed:', error.message)
      return false
    }
    return true
  } catch (error) {
    console.error('[server-events] unexpected failure:', error)
    return false
  }
}
