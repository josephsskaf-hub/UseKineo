#!/usr/bin/env node
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  buildResultVideoDecisionReport,
  RESULT_VIDEO_DECISION_INSTRUMENTED_AT,
  RESULT_VIDEO_DECISION_EVENT_NAMES,
} from './result-video-decision-report.mjs'

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
  const [events, profiles, videos] = await Promise.all([
    paged('events', (from, to) => supabase.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .gte('created_at', RESULT_VIDEO_DECISION_INSTRUMENTED_AT)
      .in('name', [...RESULT_VIDEO_DECISION_EVENT_NAMES])
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('profiles', (from, to) => supabase.from('profiles')
      .select('id,email')
      .order('id', { ascending: true }).range(from, to)),
    // All completed rows are required to prove that the in-window delivery is
    // the person's first one. A moving cutoff would misclassify returning users.
    paged('videos', (from, to) => supabase.from('videos')
      .select('id,user_id,status,created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
  ])

  const report = buildResultVideoDecisionReport({
    generatedAt: new Date().toISOString(),
    instrumentedAt: RESULT_VIDEO_DECISION_INSTRUMENTED_AT,
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
