#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import { WEB_SHARE_WINDOW_DAYS, buildWebShareTargetSubscriptionReport } from './web-share-target-subscription-report.mjs'

const DAY_MS = 86_400_000
const CUSTOM_NAMES = ['web_share_target_arrived', 'web_share_target_script_generated', 'web_share_target_signup_clicked']
const FINANCIAL_NAMES = ['checkout_started', 'payment_success']

function unwrap(result, label) {
  if (result?.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'}`)
  if (!Array.isArray(result?.data)) throw new Error(`${label}: expected array`)
  return result.data
}

export async function collectWebShareTargetSubscription({ db, generatedAt = new Date() }) {
  if (!db) throw new Error('db is required')
  const now = generatedAt instanceof Date ? generatedAt : new Date(generatedAt)
  if (!Number.isFinite(now.getTime())) throw new Error('generatedAt must be valid')
  const generatedAtIso = now.toISOString()
  const windowStart = new Date(now.getTime() - WEB_SHARE_WINDOW_DAYS * DAY_MS).toISOString()
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`))
  const eventFields = 'id,name,user_id,session_id,path,created_at,metadata'
  const profileFields = 'id,email,created_at,is_pro,plan,stripe_subscription_id,paypal_subscription_id,paddle_subscription_id'
  const dated = (query) => query.gte('created_at', windowStart).lte('created_at', generatedAtIso)
    .order('created_at', { ascending: true }).order('id', { ascending: true })
  const undated = (query) => query.is('created_at', null).order('id', { ascending: true })

  const [datedCustom, undatedCustom] = await Promise.all([
    paged('custom events', (from, to) => dated(db.from('events').select(eventFields).in('name', CUSTOM_NAMES)).range(from, to)),
    paged('undated custom events', (from, to) => undated(db.from('events').select(eventFields).in('name', CUSTOM_NAMES)).range(from, to)),
  ])
  const custom = [...datedCustom, ...undatedCustom]
  const sessionIds = [...new Set(custom.map((row) => row?.session_id).filter(Boolean))]
  const [datedSessionEvents, undatedSessionEvents] = sessionIds.length === 0 ? [[], []] : await Promise.all([
    paged('session events', (from, to) => dated(db.from('events').select(eventFields).in('session_id', sessionIds)).range(from, to)),
    paged('undated session events', (from, to) => undated(db.from('events').select(eventFields).in('session_id', sessionIds)).range(from, to)),
  ])
  const sessionEvents = [...datedSessionEvents, ...undatedSessionEvents]
  const userIds = [...new Set(sessionEvents.map((row) => row?.user_id).filter(Boolean))]

  const [profiles, datedVideos, undatedVideos, ownFinancial, undatedOwnFinancial] = userIds.length === 0
    ? [[], [], [], [], []]
    : await Promise.all([
      paged('profiles', (from, to) => db.from('profiles').select(profileFields).in('id', userIds)
        .order('id', { ascending: true }).range(from, to)),
      paged('completed videos', (from, to) => dated(db.from('videos').select('id,user_id,status,created_at')
        .in('user_id', userIds).eq('status', 'completed')).range(from, to)),
      paged('undated completed videos', (from, to) => undated(db.from('videos').select('id,user_id,status,created_at')
        .in('user_id', userIds).eq('status', 'completed')).range(from, to)),
      paged('financial events', (from, to) => dated(db.from('events').select(eventFields).in('name', FINANCIAL_NAMES)
        .in('user_id', userIds)).range(from, to)),
      paged('undated financial events', (from, to) => undated(db.from('events').select(eventFields).in('name', FINANCIAL_NAMES)
        .in('user_id', userIds)).range(from, to)),
    ])
  const seedStripeSessions = [...new Set([...ownFinancial, ...undatedOwnFinancial]
    .map((row) => row?.metadata?.stripe_session_id).filter(Boolean))]
  const allSessionFinancial = seedStripeSessions.length === 0 ? [] : await paged('all owners for Stripe Sessions', (from, to) =>
    db.from('events').select(eventFields).in('name', FINANCIAL_NAMES)
      .in('metadata->>stripe_session_id', seedStripeSessions).order('created_at', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }).range(from, to))
  const byId = new Map()
  for (const row of [...custom, ...sessionEvents, ...ownFinancial, ...undatedOwnFinancial, ...allSessionFinancial]) {
    byId.set(row?.id ?? JSON.stringify(row), row)
  }
  return buildWebShareTargetSubscriptionReport({
    generatedAt: generatedAtIso, windowStart, events: [...byId.values()], profiles,
    videos: [...datedVideos, ...undatedVideos],
  })
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  process.stdout.write(`${JSON.stringify(await collectWebShareTargetSubscription({ db }), null, 2)}\n`)
}

const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invoked === import.meta.url) main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
