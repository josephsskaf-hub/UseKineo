#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  DAILY_SHORT_IDEAS_WINDOW_DAYS,
  buildDailyShortIdeasSubscriptionReport,
  isExactDailyShortIdeasLanding,
} from './daily-shorts-ideas-subscription-report.mjs'

const DAY_MS = 86_400_000
const SESSION_CHUNK_SIZE = 100

function unwrap(result, label) {
  if (result?.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'} ${result.error.message}`)
  if (!Array.isArray(result?.data)) throw new Error(`${label}: expected an array result`)
  return result.data
}

function chunks(values, size) {
  const result = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

export async function collectDailyShortIdeasSubscription({ db, generatedAt = new Date() }) {
  if (!db) throw new Error('db is required')
  const generatedAtDate = generatedAt instanceof Date ? generatedAt : new Date(generatedAt)
  if (!Number.isFinite(generatedAtDate.getTime())) throw new Error('generatedAt must be valid')
  const generatedAtIso = generatedAtDate.toISOString()
  const windowStart = new Date(generatedAtDate.getTime() - DAILY_SHORT_IDEAS_WINDOW_DAYS * DAY_MS)
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`),
  )

  const [boundedLandings, nullLandings, profiles, financialEvents, nullFinancialEvents] = await Promise.all([
    paged('bounded landing events', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,path,created_at,metadata')
      .eq('name', 'landing_session_started')
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('landing events without clock', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,path,created_at,metadata')
      .eq('name', 'landing_session_started')
      .is('created_at', null)
      .order('id', { ascending: true })
      .range(from, to)),
    paged('profiles', (from, to) => db.from('profiles')
      .select('id,email,created_at,signup_utm_source,signup_utm_medium,signup_utm_campaign,has_paid,is_pro,plan,stripe_subscription_id,paypal_subscription_id,paddle_subscription_id')
      .lte('created_at', generatedAtIso)
      .order('id', { ascending: true })
      .range(from, to)),
    paged('all-history financial evidence', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,path,created_at,metadata')
      .lte('created_at', generatedAtIso)
      .in('name', ['checkout_started', 'payment_success', 'checkout_session_expired'])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('financial evidence without clock', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,path,created_at,metadata')
      .is('created_at', null)
      .in('name', ['checkout_started', 'payment_success', 'checkout_session_expired'])
      .order('id', { ascending: true })
      .range(from, to)),
  ])

  const landingEvents = [...boundedLandings, ...nullLandings]
  const sessionIds = [...new Set(landingEvents
    .filter(isExactDailyShortIdeasLanding)
    .map((row) => row?.session_id)
    .filter(Boolean))]
  const sessionEvents = []
  for (const group of chunks(sessionIds, SESSION_CHUNK_SIZE)) {
    const [boundedRows, nullClockRows] = await Promise.all([
      paged(`bounded browser-session inventory ${group.length}`, (from, to) => db.from('events')
        .select('id,name,user_id,session_id,path,created_at,metadata')
        .in('session_id', group)
        .lte('created_at', generatedAtIso)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)),
      paged(`browser-session inventory without clock ${group.length}`, (from, to) => db.from('events')
        .select('id,name,user_id,session_id,path,created_at,metadata')
        .in('session_id', group)
        .is('created_at', null)
        .order('id', { ascending: true })
        .range(from, to)),
    ])
    sessionEvents.push(...boundedRows, ...nullClockRows)
  }

  return buildDailyShortIdeasSubscriptionReport({
    generatedAt: generatedAtIso,
    windowStart: windowStart.toISOString(),
    landingEvents,
    sessionEvents,
    financialEvents: [...financialEvents, ...nullFinancialEvents],
    profiles,
  })
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the process environment')
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const report = await collectDailyShortIdeasSubscription({ db })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
