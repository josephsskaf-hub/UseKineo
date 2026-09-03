#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  buildVendorEvaluationSubscriptionReport,
  isExactVendorEvaluationLanding,
  VENDOR_EVALUATION_WINDOW_DAYS,
} from './vendor-evaluation-subscription-report.mjs'

const DAY_MS = 86_400_000
const SESSION_CHUNK = 100
function unwrap(result, label) {
  if (result?.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'} ${result.error.message}`)
  if (!Array.isArray(result?.data)) throw new Error(`${label}: expected array`)
  return result.data
}
function chunks(values, size) {
  const result = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

export async function collectVendorEvaluationSubscription({ db, generatedAt = new Date() }) {
  if (!db) throw new Error('db is required')
  const now = generatedAt instanceof Date ? generatedAt : new Date(generatedAt)
  if (!Number.isFinite(now.getTime())) throw new Error('generatedAt must be valid')
  const generatedAtIso = now.toISOString()
  const windowStart = new Date(now.getTime() - VENDOR_EVALUATION_WINDOW_DAYS * DAY_MS).toISOString()
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`))
  const eventFields = 'id,name,user_id,session_id,path,created_at,metadata'
  const profileFields = 'id,email,created_at,signup_utm_source,signup_utm_medium,signup_utm_campaign,has_paid,is_pro,plan,stripe_subscription_id,paypal_subscription_id,paddle_subscription_id'

  const [landings, nullLandings, profiles, nullProfiles, videos, financial, nullFinancial] = await Promise.all([
    paged('landings', (from, to) => db.from('events').select(eventFields)
      .eq('name', 'landing_session_started').eq('path', '/client-video-brief-generator')
      .gte('created_at', windowStart).lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('null-clock landings', (from, to) => db.from('events').select(eventFields)
      .eq('name', 'landing_session_started').eq('path', '/client-video-brief-generator')
      .is('created_at', null).order('id', { ascending: true }).range(from, to)),
    paged('profiles', (from, to) => db.from('profiles').select(profileFields)
      .lte('created_at', generatedAtIso).order('id', { ascending: true }).range(from, to)),
    paged('null-clock profiles', (from, to) => db.from('profiles').select(profileFields)
      .is('created_at', null).order('id', { ascending: true }).range(from, to)),
    paged('completed videos', (from, to) => db.from('videos').select('id,user_id,status,created_at')
      .eq('status', 'completed').gte('created_at', windowStart).lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('financial', (from, to) => db.from('events').select(eventFields)
      .in('name', ['checkout_started', 'payment_success']).gte('created_at', windowStart).lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('null-clock financial', (from, to) => db.from('events').select(eventFields)
      .in('name', ['checkout_started', 'payment_success']).is('created_at', null)
      .order('id', { ascending: true }).range(from, to)),
  ])
  const landingEvents = [...landings, ...nullLandings]
  const sessionIds = [...new Set(landingEvents.filter(isExactVendorEvaluationLanding)
    .map((row) => row?.session_id).filter(Boolean))]
  const sessionEvents = []
  for (const group of chunks(sessionIds, SESSION_CHUNK)) {
    const [bounded, nullClock] = await Promise.all([
      paged('session events', (from, to) => db.from('events').select(eventFields)
        .in('session_id', group).lte('created_at', generatedAtIso)
        .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
      paged('null-clock session events', (from, to) => db.from('events').select(eventFields)
        .in('session_id', group).is('created_at', null)
        .order('id', { ascending: true }).range(from, to)),
    ])
    sessionEvents.push(...bounded, ...nullClock)
  }
  return buildVendorEvaluationSubscriptionReport({
    generatedAt: generatedAtIso,
    windowStart,
    landingEvents,
    sessionEvents,
    financialEvents: [...financial, ...nullFinancial],
    profiles: [...profiles, ...nullProfiles],
    videos,
  })
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  process.stdout.write(JSON.stringify(await collectVendorEvaluationSubscription({ db }), null, 2) + '\n')
}
const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invoked === import.meta.url) main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
