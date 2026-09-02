#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  FIRST_FILE_RETRIEVAL_BOUNDARY,
  FIRST_FILE_RETRIEVAL_DOWNLOAD_EVENT_NAMES,
  FIRST_FILE_RETRIEVAL_FINANCIAL_EVENT_NAMES,
  FIRST_FILE_RETRIEVAL_WINDOW_DAYS,
  buildFirstFileLaterDayRetrievalReport,
} from './first-file-later-day-retrieval-report.mjs'

const DAY_MS = 86_400_000

export function unwrapFirstFileRetrievalResult(result, label) {
  if (result?.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'} ${result.error.message}`)
  if (!Array.isArray(result?.data)) throw new Error(`${label}: expected an array result`)
  return result.data
}

export function mergeRowsById(...groups) {
  const byId = new Map()
  for (const row of groups.flat()) {
    const id = typeof row?.id === 'string' && row.id ? row.id : null
    if (!id) throw new Error('every queried event row must have an id')
    if (!byId.has(id)) byId.set(id, row)
  }
  return [...byId.values()]
}

export async function collectFirstFileLaterDayRetrieval({ db, generatedAt = new Date() }) {
  if (!db) throw new Error('db is required')
  const generatedAtDate = generatedAt instanceof Date ? generatedAt : new Date(generatedAt)
  if (!Number.isFinite(generatedAtDate.getTime())) throw new Error('generatedAt must be valid')
  const generatedAtIso = generatedAtDate.toISOString()
  const windowStart = new Date(generatedAtDate.getTime() - FIRST_FILE_RETRIEVAL_WINDOW_DAYS * DAY_MS)
  const effectiveStart = new Date(Math.max(windowStart.getTime(), Date.parse(FIRST_FILE_RETRIEVAL_BOUNDARY)))
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrapFirstFileRetrievalResult(await request(from, to), `${label}[${from}:${to}]`),
  )

  const [profiles, nullTimestampProfiles, videos, nullTimestampVideos, downloads, financialHistory, nullTimestampEvents] = await Promise.all([
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
    paged('videos', (from, to) => db.from('videos')
      .select('id,user_id,status,video_url,created_at')
      .eq('status', 'completed')
      .lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('videos with null timestamp', (from, to) => db.from('videos')
      .select('id,user_id,status,video_url,created_at')
      .eq('status', 'completed')
      .is('created_at', null)
      .order('id', { ascending: true })
      .range(from, to)),
    paged('download events', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .gte('created_at', effectiveStart.toISOString())
      .lte('created_at', generatedAtIso)
      .in('name', [...FIRST_FILE_RETRIEVAL_DOWNLOAD_EVENT_NAMES])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('financial history', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .lte('created_at', generatedAtIso)
      .in('name', [...FIRST_FILE_RETRIEVAL_FINANCIAL_EVENT_NAMES])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('relevant events with null timestamp', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .is('created_at', null)
      .in('name', [...FIRST_FILE_RETRIEVAL_DOWNLOAD_EVENT_NAMES, ...FIRST_FILE_RETRIEVAL_FINANCIAL_EVENT_NAMES])
      .order('id', { ascending: true })
      .range(from, to)),
  ])

  return buildFirstFileLaterDayRetrievalReport({
    generatedAt: generatedAtIso,
    windowStart: windowStart.toISOString(),
    events: mergeRowsById(downloads, financialHistory, nullTimestampEvents),
    profiles: [...profiles, ...nullTimestampProfiles],
    videos: [...videos, ...nullTimestampVideos],
  })
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the process environment')
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const report = await collectFirstFileLaterDayRetrieval({ db })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
