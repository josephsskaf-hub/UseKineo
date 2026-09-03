#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  AFFILIATE_BUSINESS_EVIDENCE_NAMES,
  AFFILIATE_BUSINESS_FINANCIAL_NAMES,
  AFFILIATE_BUSINESS_WINDOW_DAYS,
  buildAffiliateBusinessSubscriptionReport,
} from './affiliate-business-subscription-report.mjs'

const DAY_MS = 86_400_000
const SESSION_CHUNK_SIZE = 80

function unwrap(result, label) {
  if (result?.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'} ${result.error.message}`)
  if (!Array.isArray(result?.data)) throw new Error(`${label}: expected an array result`)
  return result.data
}

function chunks(values, size) {
  const output = []
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size))
  return output
}

function mergeById(...groups) {
  const merged = new Map()
  for (const row of groups.flat()) {
    const id = typeof row?.id === 'string' && row.id.trim() ? row.id.trim() : null
    if (!id) throw new Error('queried row is missing id')
    const prior = merged.get(id)
    if (prior && JSON.stringify(prior) !== JSON.stringify(row)) {
      throw new Error('conflicting duplicate row id')
    }
    merged.set(id, row)
  }
  return [...merged.values()]
}

export async function collectAffiliateBusinessSubscription({ db, generatedAt = new Date(), contract }) {
  if (!db) throw new Error('db is required')
  const generated = generatedAt instanceof Date ? generatedAt : new Date(generatedAt)
  if (!Number.isFinite(generated.getTime())) throw new Error('generatedAt must be valid')
  const generatedAtIso = generated.toISOString()
  const windowStart = new Date(generated.getTime() - AFFILIATE_BUSINESS_WINDOW_DAYS * DAY_MS)
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`))

  const [boundedEvidence, nullEvidence, profiles, referrals, affiliates, financial, nullFinancial] = await Promise.all([
    paged('bounded campaign evidence', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', generatedAtIso)
      .in('name', [...AFFILIATE_BUSINESS_EVIDENCE_NAMES])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('campaign evidence without clock', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .is('created_at', null)
      .in('name', [...AFFILIATE_BUSINESS_EVIDENCE_NAMES])
      .order('id', { ascending: true })
      .range(from, to)),
    paged('profiles', (from, to) => db.from('profiles')
      .select('id,email,created_at,signup_utm_source,signup_utm_medium,signup_utm_campaign')
      .order('id', { ascending: true })
      .range(from, to)),
    paged('canonical affiliate referrals', (from, to) => db.from('affiliate_referrals')
      .select('id,affiliate_id,referred_user_id,status,first_touch_at,converted_at')
      .order('first_touch_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('affiliate identities', (from, to) => db.from('affiliates')
      .select('id,user_id,email,status,created_at')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('all-history financial evidence', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .lte('created_at', generatedAtIso)
      .in('name', [...AFFILIATE_BUSINESS_FINANCIAL_NAMES])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('financial evidence without clock', (from, to) => db.from('events')
      .select('id,name,user_id,session_id,created_at,metadata')
      .is('created_at', null)
      .in('name', [...AFFILIATE_BUSINESS_FINANCIAL_NAMES])
      .order('id', { ascending: true })
      .range(from, to)),
  ])

  const primaryEvidence = mergeById(boundedEvidence, nullEvidence)
  const candidateSessionIds = [...new Set(primaryEvidence
    .map((row) => typeof row?.session_id === 'string' ? row.session_id.trim() : '')
    .filter(Boolean))]
  const completeSessionRows = []
  for (const group of chunks(candidateSessionIds, SESSION_CHUNK_SIZE)) {
    const dated = await paged(`dated browser-session inventory ${group.length}`, (from, to) =>
      db.from('events')
        .select('id,name,user_id,session_id,created_at,metadata')
        .in('session_id', group)
        .lte('created_at', generatedAtIso)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to))
    const undatable = await paged(`undatable browser-session inventory ${group.length}`, (from, to) =>
      db.from('events')
        .select('id,name,user_id,session_id,created_at,metadata')
        .in('session_id', group)
        .is('created_at', null)
        .order('id', { ascending: true })
        .range(from, to))
    completeSessionRows.push(...dated, ...undatable)
  }
  const sessionEvents = mergeById(completeSessionRows)
  const evidenceEvents = mergeById(primaryEvidence, sessionEvents.filter((row) =>
    AFFILIATE_BUSINESS_EVIDENCE_NAMES.includes(row?.name)))

  return buildAffiliateBusinessSubscriptionReport({
    generatedAt: generatedAtIso,
    windowStart: windowStart.toISOString(),
    evidenceEvents,
    sessionEvents,
    financialEvents: mergeById(financial, nullFinancial),
    profiles,
    referrals,
    affiliates,
    contract,
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
  process.stdout.write(`${JSON.stringify(await collectAffiliateBusinessSubscription({ db }), null, 2)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
