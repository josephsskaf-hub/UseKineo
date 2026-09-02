#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  POST_EXPIRY_NEW_SESSION_BOUNDARY,
  POST_EXPIRY_NEW_SESSION_EVENT_NAMES,
  POST_EXPIRY_NEW_SESSION_WINDOW_DAYS,
  buildPostExpiryNewSessionReport,
} from './post-expiry-new-session-report.mjs'

const DAY_MS = 86_400_000

function unwrap(result, label) {
  if (result?.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'} ${result.error.message}`)
  if (!Array.isArray(result?.data)) throw new Error(`${label}: expected an array result`)
  return result.data
}

export async function collectPostExpiryNewSession({ db, generatedAt = new Date() }) {
  if (!db) throw new Error('db is required')
  const generatedAtDate = generatedAt instanceof Date ? generatedAt : new Date(generatedAt)
  if (!Number.isFinite(generatedAtDate.getTime())) throw new Error('generatedAt must be valid')
  const generatedAtIso = generatedAtDate.toISOString()
  const windowStart = new Date(generatedAtDate.getTime() - POST_EXPIRY_NEW_SESSION_WINDOW_DAYS * DAY_MS)
  const effectiveStart = new Date(Math.max(windowStart.getTime(), Date.parse(POST_EXPIRY_NEW_SESSION_BOUNDARY)))
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`),
  )

  const [profiles, nullProfiles, videos, nullVideos, boundedEvents, financialEvents, nullEvents] = await Promise.all([
    paged('profiles', (from, to) => db.from('profiles')
      .select('id,email,created_at')
      .lte('created_at', generatedAtIso)
      .order('id', { ascending: true })
      .range(from, to)),
    paged('profiles without clock', (from, to) => db.from('profiles')
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
    paged('completed videos without clock', (from, to) => db.from('videos')
      .select('id,user_id,status,video_url,created_at')
      .eq('status', 'completed')
      .is('created_at', null)
      .order('id', { ascending: true })
      .range(from, to)),
    paged('bounded evidence events', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .gte('created_at', effectiveStart.toISOString())
      .lte('created_at', generatedAtIso)
      .in('name', [...POST_EXPIRY_NEW_SESSION_EVENT_NAMES])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('all-history financial evidence', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .lt('created_at', effectiveStart.toISOString())
      .in('name', ['checkout_started', 'payment_success', 'checkout_session_expired'])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('evidence events without clock', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .is('created_at', null)
      .in('name', [...POST_EXPIRY_NEW_SESSION_EVENT_NAMES])
      .order('id', { ascending: true })
      .range(from, to)),
  ])

  return buildPostExpiryNewSessionReport({
    generatedAt: generatedAtIso,
    windowStart: windowStart.toISOString(),
    events: [...financialEvents, ...boundedEvents, ...nullEvents],
    profiles: [...profiles, ...nullProfiles],
    videos: [...videos, ...nullVideos],
  })
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the process environment')
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const report = await collectPostExpiryNewSession({ db })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
