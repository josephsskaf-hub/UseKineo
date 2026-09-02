#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  B2B_SUBSCRIPTION_CONTEXT_DAYS,
  B2B_SUBSCRIPTION_EVENT_NAMES,
  B2B_SUBSCRIPTION_WINDOW_DAYS,
  buildB2bSubscriptionTruthReport,
} from './b2b-subscription-truth-report.mjs'
import { loadB2bSubscriptionTruthInputs } from './b2b-subscription-truth-loader.mjs'

function unwrap(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'} ${result.error.message}`)
  return result.data ?? []
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')

  const generatedAt = new Date()
  const windowStart = new Date(generatedAt.getTime() - B2B_SUBSCRIPTION_WINDOW_DAYS * 86_400_000)
  const queryStart = new Date(windowStart.getTime() - B2B_SUBSCRIPTION_CONTEXT_DAYS * 86_400_000)
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`),
  )
  const loaded = await loadB2bSubscriptionTruthInputs({
    fetchPrimaryEvents: () => paged('events', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .gte('created_at', queryStart.toISOString())
      .in('name', [...B2B_SUBSCRIPTION_EVENT_NAMES])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    fetchProfiles: () => paged('profiles', (from, to) => db.from('profiles')
      .select('id,email')
      .order('id', { ascending: true })
      .range(from, to)),
    fetchSessionEvents: (sessionIds) => paged('events-session-identity', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .gte('created_at', queryStart.toISOString())
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
  })
  const report = buildB2bSubscriptionTruthReport({
    generatedAt: generatedAt.toISOString(),
    windowStart: windowStart.toISOString(),
    events: loaded.events,
    profiles: loaded.profiles,
  })
  report.quality.routerSessionIdentityAudit = loaded.identityAudit
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
