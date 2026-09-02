#!/usr/bin/env node
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  buildLocalBusinessBriefFunnelReport,
  LOCAL_BUSINESS_BRIEF_DOWNSTREAM_EVENT_NAMES,
  LOCAL_BUSINESS_BRIEF_EVENT_NAMES,
  LOCAL_BUSINESS_BRIEF_INSTRUMENTED_AT,
} from './local-business-brief-funnel-report.mjs'

function loadEnv(path) {
  const values = {}
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    values[match[1]] = value
  }
  return values
}

function unwrap(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'} ${result.error.message}`)
  return result.data ?? []
}

async function main() {
  const env = { ...loadEnv('.env.local'), ...process.env }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service-role configuration is missing')
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`),
  )
  const eventNames = [
    ...LOCAL_BUSINESS_BRIEF_EVENT_NAMES,
    ...LOCAL_BUSINESS_BRIEF_DOWNSTREAM_EVENT_NAMES,
  ]
  const [events, profiles] = await Promise.all([
    paged('events', (from, to) => supabase.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .gte('created_at', LOCAL_BUSINESS_BRIEF_INSTRUMENTED_AT)
      .in('name', eventNames)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('profiles', (from, to) => supabase.from('profiles')
      .select('id,email,created_at,signup_utm_campaign')
      .order('id', { ascending: true })
      .range(from, to)),
  ])

  const report = buildLocalBusinessBriefFunnelReport({
    generatedAt: new Date().toISOString(),
    instrumentedAt: LOCAL_BUSINESS_BRIEF_INSTRUMENTED_AT,
    events,
    profiles,
  })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
