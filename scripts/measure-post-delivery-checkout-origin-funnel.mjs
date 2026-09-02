#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  buildPostDeliveryCheckoutOriginReport,
  POST_DELIVERY_ORIGIN_EVENT_NAMES,
  POST_DELIVERY_ORIGIN_REPORT_WINDOW_DAYS,
} from './post-delivery-checkout-origin-report.mjs'

function unwrap(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'} ${result.error.message}`)
  return result.data ?? []
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the process environment')
  }
  const generatedAt = new Date()
  const windowStart = new Date(
    generatedAt.getTime() - POST_DELIVERY_ORIGIN_REPORT_WINDOW_DAYS * 86_400_000,
  )
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`),
  )
  const [events, profiles, videos] = await Promise.all([
    paged('events', (from, to) => supabase.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .gte('created_at', windowStart.toISOString())
      .in('name', [...POST_DELIVERY_ORIGIN_EVENT_NAMES])
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('profiles', (from, to) => supabase.from('profiles')
      .select('id,email')
      .order('id', { ascending: true }).range(from, to)),
    // Full history is required to distinguish a true first delivery from a
    // returning creator whose first completed video predates this window.
    paged('videos', (from, to) => supabase.from('videos')
      .select('id,user_id,status,created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
  ])

  const report = buildPostDeliveryCheckoutOriginReport({
    generatedAt: generatedAt.toISOString(),
    windowStart: windowStart.toISOString(),
    events,
    profiles,
    videos,
  })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
