#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  AFFILIATE_CLIENT_BRIEF_RELAY_EVENT,
  AFFILIATE_CLIENT_BRIEF_RELAY_OBSERVATION_DAYS,
  AFFILIATE_CLIENT_BRIEF_RELAY_WINDOW_DAYS,
  buildAffiliateClientBriefRelayReport,
} from './affiliate-client-brief-relay-report.mjs'

const DAY_MS = 86_400_000

function unwrap(result, label) {
  if (result?.error) throw new Error(label + ': ' + (result.error.code ?? 'unknown'))
  if (!Array.isArray(result?.data)) throw new Error(label + ': expected array')
  return result.data
}

export async function collectAffiliateClientBriefRelay({ db, generatedAt = new Date() }) {
  if (!db) throw new Error('db is required')
  const generated = generatedAt instanceof Date ? generatedAt : new Date(generatedAt)
  if (!Number.isFinite(generated.getTime())) throw new Error('generatedAt must be valid')
  const generatedAtIso = generated.toISOString()
  const windowStart = new Date(generated.getTime() - AFFILIATE_CLIENT_BRIEF_RELAY_WINDOW_DAYS * DAY_MS)
  const copySeedStart = new Date(
    windowStart.getTime() - AFFILIATE_CLIENT_BRIEF_RELAY_OBSERVATION_DAYS * DAY_MS,
  )
  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), label + '[' + from + ':' + to + ']'))

  const [datedCopies, undatedCopies, profiles, affiliates, datedClicks, undatedClicks] = await Promise.all([
    paged('dated relay copies', (from, to) => db.from('events')
      .select('id,name,user_id,created_at,metadata')
      .eq('name', AFFILIATE_CLIENT_BRIEF_RELAY_EVENT)
      .gte('created_at', copySeedStart.toISOString())
      .lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('undated relay copies', (from, to) => db.from('events')
      .select('id,name,user_id,created_at,metadata')
      .eq('name', AFFILIATE_CLIENT_BRIEF_RELAY_EVENT)
      .is('created_at', null)
      .order('id', { ascending: true })
      .range(from, to)),
    paged('profiles', (from, to) => db.from('profiles')
      .select('id,email')
      .order('id', { ascending: true })
      .range(from, to)),
    paged('affiliates', (from, to) => db.from('affiliates')
      .select('id,user_id,email,code,status')
      .order('id', { ascending: true })
      .range(from, to)),
    paged('dated client brief click proofs', (from, to) => db.from('affiliate_clicks')
      .select('id,affiliate_id,landing_path,created_at')
      .like('landing_path', '%?to=client_brief')
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', generatedAtIso)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)),
    paged('undated client brief click proofs', (from, to) => db.from('affiliate_clicks')
      .select('id,affiliate_id,landing_path,created_at')
      .like('landing_path', '%?to=client_brief')
      .is('created_at', null)
      .order('id', { ascending: true })
      .range(from, to)),
  ])

  return buildAffiliateClientBriefRelayReport({
    generatedAt: generatedAtIso,
    windowStart: windowStart.toISOString(),
    copyEvents: datedCopies.concat(undatedCopies),
    profiles,
    affiliates,
    clickProofs: datedClicks.concat(undatedClicks),
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
  process.stdout.write(JSON.stringify(await collectAffiliateClientBriefRelay({ db }), null, 2) + '\n')
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
