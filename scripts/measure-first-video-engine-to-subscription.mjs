#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  FIRST_VIDEO_ENGINE_CONTRACT_BOUNDARY,
  FIRST_VIDEO_ENGINE_EVENT_NAME,
  FIRST_VIDEO_ENGINE_FINANCIAL_EVENT_NAMES,
  FIRST_VIDEO_ENGINE_WINDOW_DAYS,
  buildFirstVideoEngineToSubscriptionReport,
} from './first-video-engine-to-subscription-report.mjs'

const DAY_MS = 86_400_000

export function unwrapFirstVideoEngineResult(result, label) {
  if (result?.error) {
    throw new Error(label + ': ' + (result.error.code ?? 'unknown') + ' ' + result.error.message)
  }
  if (!Array.isArray(result?.data)) throw new Error(label + ': expected an array result')
  return result.data
}

export async function collectFirstVideoEngineToSubscription({ db, generatedAt = new Date() }) {
  if (!db) throw new Error('db is required')
  const generatedAtDate = generatedAt instanceof Date ? generatedAt : new Date(generatedAt)
  if (!Number.isFinite(generatedAtDate.getTime())) throw new Error('generatedAt must be valid')
  const generatedAtIso = generatedAtDate.toISOString()
  const windowStart = new Date(generatedAtDate.getTime() - FIRST_VIDEO_ENGINE_WINDOW_DAYS * DAY_MS)
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrapFirstVideoEngineResult(await request(from, to), label + '[' + from + ':' + to + ']'),
  )

  const [
    profiles,
    nullTimestampProfiles,
    videos,
    nullTimestampVideos,
    decisions,
    nullTimestampDecisions,
    financialEvents,
    nullTimestampFinancialEvents,
  ] = await Promise.all([
    paged('profiles', (from, to) => db.from('profiles')
      .select('id,email,created_at')
      .lte('created_at', generatedAtIso)
      .order('id', { ascending: true })
      .range(from, to)),
    paged('profiles with null timestamp', (from, to) => db.from('profiles')
      .select('id,email,created_at')
      .is('created_at', null)
      .order('id', { ascending: true })
      .range(from, to)),
    paged('completed videos', (from, to) => db.from('videos')
      .select('id,user_id,status,video_url,created_at')
      .eq('status', 'completed')
      .lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('completed videos with null timestamp', (from, to) => db.from('videos')
      .select('id,user_id,status,video_url,created_at')
      .eq('status', 'completed')
      .is('created_at', null)
      .order('id', { ascending: true })
      .range(from, to)),
    paged('engine decisions', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .eq('name', FIRST_VIDEO_ENGINE_EVENT_NAME)
      .gte('created_at', FIRST_VIDEO_ENGINE_CONTRACT_BOUNDARY)
      .lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('engine decisions with null timestamp', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .eq('name', FIRST_VIDEO_ENGINE_EVENT_NAME)
      .is('created_at', null)
      .order('id', { ascending: true })
      .range(from, to)),
    paged('financial events', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .in('name', [...FIRST_VIDEO_ENGINE_FINANCIAL_EVENT_NAMES])
      .lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('financial events with null timestamp', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .in('name', [...FIRST_VIDEO_ENGINE_FINANCIAL_EVENT_NAMES])
      .is('created_at', null)
      .order('id', { ascending: true })
      .range(from, to)),
  ])

  return buildFirstVideoEngineToSubscriptionReport({
    generatedAt: generatedAtIso,
    windowStart: windowStart.toISOString(),
    profiles: [...profiles, ...nullTimestampProfiles],
    videos: [...videos, ...nullTimestampVideos],
    events: [
      ...decisions,
      ...nullTimestampDecisions,
      ...financialEvents,
      ...nullTimestampFinancialEvents,
    ],
  })
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the process environment')
  }
  const db = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const report = await collectFirstVideoEngineToSubscription({ db })
  process.stdout.write(JSON.stringify(report, null, 2) + '\n')
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
