#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  B2C_SUBSCRIPTION_TRUTH_EVENT_NAMES,
  B2C_SUBSCRIPTION_TRUTH_LOOKBACK_DAYS,
  B2C_SUBSCRIPTION_TRUTH_WINDOW_DAYS,
  buildB2cSubscriptionTruthReport,
} from './b2c-subscription-truth-report.mjs'

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
  const windowStart = new Date(generatedAt.getTime() - B2C_SUBSCRIPTION_TRUTH_WINDOW_DAYS * 86_400_000)
  const sourceStart = new Date(windowStart.getTime() - B2C_SUBSCRIPTION_TRUTH_LOOKBACK_DAYS * 86_400_000)
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`),
  )
  const [events, profiles, videos] = await Promise.all([
    paged('events', (from, to) => supabase.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .gte('created_at', sourceStart.toISOString())
      .in('name', [...B2C_SUBSCRIPTION_TRUTH_EVENT_NAMES])
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('profiles', (from, to) => supabase.from('profiles')
      .select('id,email')
      .order('id', { ascending: true }).range(from, to)),
    paged('videos', (from, to) => supabase.from('videos')
      .select('id,user_id,status,created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
  ])
  const report = buildB2cSubscriptionTruthReport({
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
