#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  buildViralScoreShareSubscriptionReport,
  isExactViralScoreShareLanding,
  VIRAL_SCORE_SHARE_LANDING_PATH,
  VIRAL_SCORE_SHARE_WINDOW_DAYS,
} from './viral-score-share-subscription-report.mjs'

const DAY_MS = 86_400_000
const SESSION_CHUNK = 100

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

export async function collectViralScoreShareSubscription({ db, generatedAt = new Date() }) {
  if (!db) throw new Error('db is required')
  const at = generatedAt instanceof Date ? generatedAt : new Date(generatedAt)
  if (!Number.isFinite(at.getTime())) throw new Error('generatedAt must be valid')
  const generatedAtIso = at.toISOString()
  const windowStart = new Date(at.getTime() - VIRAL_SCORE_SHARE_WINDOW_DAYS * DAY_MS).toISOString()
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`))
  const eventFields = 'id,name,user_id,session_id,path,created_at,metadata'
  const profileFields = 'id,email,created_at,signup_utm_source,signup_utm_medium,signup_utm_campaign,has_paid,is_pro,plan,stripe_subscription_id,paypal_subscription_id,paddle_subscription_id'

  const [landings, nullLandings, shares, nullShares, profiles, nullProfiles,
    videos, nullVideos, financial, nullFinancial] = await Promise.all([
    paged('viral score landings', (from, to) => db.from('events').select(eventFields)
      .eq('name', 'landing_session_started').eq('path', VIRAL_SCORE_SHARE_LANDING_PATH)
      .gte('created_at', windowStart).lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('viral score landings without clock', (from, to) => db.from('events').select(eventFields)
      .eq('name', 'landing_session_started').eq('path', VIRAL_SCORE_SHARE_LANDING_PATH)
      .is('created_at', null).order('id', { ascending: true }).range(from, to)),
    paged('viral score share requests', (from, to) => db.from('events').select(eventFields)
      .eq('name', 'viral_score_scorecard_share_requested').eq('path', VIRAL_SCORE_SHARE_LANDING_PATH)
      .gte('created_at', windowStart).lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('viral score share requests without clock', (from, to) => db.from('events').select(eventFields)
      .eq('name', 'viral_score_scorecard_share_requested').eq('path', VIRAL_SCORE_SHARE_LANDING_PATH)
      .is('created_at', null).order('id', { ascending: true }).range(from, to)),
    paged('profiles', (from, to) => db.from('profiles').select(profileFields)
      .lte('created_at', generatedAtIso).order('id', { ascending: true }).range(from, to)),
    paged('profiles without clock', (from, to) => db.from('profiles').select(profileFields)
      .is('created_at', null).order('id', { ascending: true }).range(from, to)),
    paged('completed videos', (from, to) => db.from('videos').select('id,user_id,status,created_at')
      .eq('status', 'completed').gte('created_at', windowStart).lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('completed videos without clock', (from, to) => db.from('videos').select('id,user_id,status,created_at')
      .eq('status', 'completed').is('created_at', null)
      .order('id', { ascending: true }).range(from, to)),
    paged('financial evidence', (from, to) => db.from('events').select(eventFields)
      .in('name', ['checkout_started', 'payment_success'])
      .gte('created_at', windowStart).lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('financial evidence without clock', (from, to) => db.from('events').select(eventFields)
      .in('name', ['checkout_started', 'payment_success']).is('created_at', null)
      .order('id', { ascending: true }).range(from, to)),
  ])

  const landingEvents = [...landings, ...nullLandings]
  const sessionIds = [...new Set(landingEvents.filter(isExactViralScoreShareLanding)
    .map((row) => row?.session_id).filter(Boolean))]
  const sessionEvents = []
  for (const group of chunks(sessionIds, SESSION_CHUNK)) {
    const [bounded, nullClock] = await Promise.all([
      paged('viral score browser sessions', (from, to) => db.from('events').select(eventFields)
        .in('session_id', group).lte('created_at', generatedAtIso)
        .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
      paged('viral score browser sessions without clock', (from, to) => db.from('events').select(eventFields)
        .in('session_id', group).is('created_at', null)
        .order('id', { ascending: true }).range(from, to)),
    ])
    sessionEvents.push(...bounded, ...nullClock)
  }

  return buildViralScoreShareSubscriptionReport({
    generatedAt: generatedAtIso,
    windowStart,
    landingEvents,
    sessionEvents,
    shareEvents: [...shares, ...nullShares],
    financialEvents: [...financial, ...nullFinancial],
    profiles: [...profiles, ...nullProfiles],
    videos: [...videos, ...nullVideos],
  })
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  process.stdout.write(JSON.stringify(await collectViralScoreShareSubscription({ db }), null, 2) + '\n')
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invokedPath === import.meta.url) main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
