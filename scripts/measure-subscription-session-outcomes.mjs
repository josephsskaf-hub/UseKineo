#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  SUBSCRIPTION_SESSION_OUTCOME_EVENTS,
  SUBSCRIPTION_SESSION_OUTCOME_WINDOW_DAYS,
  buildSubscriptionSessionOutcomeReport,
} from './subscription-session-outcome-report.mjs'

function unwrap(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'} ${result.error.message}`)
  return result.data ?? []
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')

  const generatedAt = new Date()
  const windowStart = new Date(generatedAt.getTime() - SUBSCRIPTION_SESSION_OUTCOME_WINDOW_DAYS * 86_400_000)
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`),
  )
  const [events, profiles] = await Promise.all([
    paged('events', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .gte('created_at', windowStart.toISOString())
      .in('name', [...SUBSCRIPTION_SESSION_OUTCOME_EVENTS])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('profiles', (from, to) => db.from('profiles')
      .select('id,email')
      .order('id', { ascending: true })
      .range(from, to)),
  ])
  const report = buildSubscriptionSessionOutcomeReport({
    generatedAt: generatedAt.toISOString(),
    windowStart: windowStart.toISOString(),
    events,
    profiles,
  })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
